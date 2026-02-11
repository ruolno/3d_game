import { useEffect, useRef, useMemo, memo } from 'react'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { SkeletonUtils } from 'three-stdlib'

// Interpolation speed (higher = snappier, lower = smoother)
const INTERPOLATION_SPEED = 18
// How far ahead to extrapolate based on velocity (in seconds)
const EXTRAPOLATION_FACTOR = 0.05

const RemotePlayerComponent = ({ 
  playerId, 
  playerPositionsRef, // Shared ref from useMultiplayer - read directly in useFrame
  initialPosition = { x: 0, y: 2, z: 0 },
  initialRotation = { x: 0, y: 0, z: 0 },
  role, 
  name, 
  isCaught,
  socket,
  scale = 0.15
}) => {
  const group = useRef()
  const { scene, animations } = useGLTF('/models/person/model.glb')
  
  // Use SkeletonUtils for proper cloning of animated models
  const clonedScene = useMemo(() => SkeletonUtils.clone(scene), [scene])
  
  // Interpolation state - all managed in refs for zero re-renders
  const targetPosition = useRef(new THREE.Vector3(initialPosition.x, initialPosition.y, initialPosition.z))
  const currentPosition = useRef(new THREE.Vector3(initialPosition.x, initialPosition.y, initialPosition.z))
  const targetRotation = useRef(initialRotation.y || 0)
  const currentRotation = useRef(initialRotation.y || 0)
  const previousFramePosition = useRef(new THREE.Vector3(initialPosition.x, initialPosition.y, initialPosition.z))
  const lastProcessedTimestamp = useRef(0)
  // Velocity estimation for extrapolation
  const estimatedVelocity = useRef(new THREE.Vector3(0, 0, 0))
  const tempVec = useRef(new THREE.Vector3())

  // Animation mixer
  const mixer = useRef()
  const actions = useRef({})
  const currentAction = useRef('idle')

  // Initialize animations
  useEffect(() => {
    if (animations && animations.length > 0) {
      mixer.current = new THREE.AnimationMixer(clonedScene)
      
      animations.forEach((clip) => {
        const action = mixer.current.clipAction(clip)
        actions.current[clip.name.toLowerCase()] = action
      })
      
      // Start with idle animation
      if (actions.current.idle) {
        actions.current.idle.play()
      }
    }
    
    return () => {
      if (mixer.current) {
        mixer.current.stopAllAction()
      }
    }
  }, [animations, clonedScene])

  // Color based on role
  useEffect(() => {
    clonedScene.traverse((child) => {
      if (child.isMesh) {
        if (role === 'seeker') {
          child.material = child.material.clone()
          child.material.color.set('#ff4444')
        } else if (isCaught) {
          child.material = child.material.clone()
          child.material.color.set('#888888')
        } else {
          child.material = child.material.clone()
          child.material.color.set('#4444ff')
        }
        child.castShadow = true
        child.receiveShadow = true
      }
    })
  }, [clonedScene, role, isCaught])

  // Main update loop - reads position from shared ref every frame (60fps)
  // No React re-renders, no prop dependencies for position
  useFrame((_state, delta) => {
    if (!group.current) return

    // Clamp delta to prevent huge jumps on tab switch or lag spikes
    const clampedDelta = Math.min(delta, 0.1)

    // --- Read latest position data from shared ref ---
    const positionData = playerPositionsRef.current.get(playerId)
    
    if (positionData && positionData.timestamp > lastProcessedTimestamp.current) {
      lastProcessedTimestamp.current = positionData.timestamp
      
      const newPos = positionData.position
      // Validate position
      if (newPos && typeof newPos.x === 'number' && typeof newPos.y === 'number' && typeof newPos.z === 'number') {
        // Calculate velocity from server snapshots for extrapolation
        if (positionData.prevPosition && positionData.prevTimestamp) {
          const dt = (positionData.timestamp - positionData.prevTimestamp) / 1000
          if (dt > 0 && dt < 1) { // Only if reasonable time gap
            estimatedVelocity.current.set(
              (newPos.x - positionData.prevPosition.x) / dt,
              (newPos.y - positionData.prevPosition.y) / dt,
              (newPos.z - positionData.prevPosition.z) / dt
            )
          }
        }
        
        // Set target with slight extrapolation to compensate for network latency
        targetPosition.current.set(
          newPos.x + estimatedVelocity.current.x * EXTRAPOLATION_FACTOR,
          Math.max(newPos.y + estimatedVelocity.current.y * EXTRAPOLATION_FACTOR, -5),
          newPos.z + estimatedVelocity.current.z * EXTRAPOLATION_FACTOR
        )
      }
      
      // Update rotation target
      if (positionData.rotation && typeof positionData.rotation.y === 'number') {
        targetRotation.current = positionData.rotation.y
      }
    }

    // --- Frame-rate independent exponential interpolation ---
    // smoothFactor approaches 1 as delta increases, giving consistent feel at any framerate
    const smoothFactor = 1 - Math.exp(-INTERPOLATION_SPEED * clampedDelta)

    // Store previous position for velocity calculation
    previousFramePosition.current.copy(currentPosition.current)

    // Interpolate position (frame-rate independent)
    currentPosition.current.lerp(targetPosition.current, smoothFactor)
    group.current.position.copy(currentPosition.current)

    // Interpolate rotation with shortest-path handling
    let rotDiff = targetRotation.current - currentRotation.current
    // Handle wraparound for shortest rotation path
    if (rotDiff > Math.PI) rotDiff -= Math.PI * 2
    if (rotDiff < -Math.PI) rotDiff += Math.PI * 2
    currentRotation.current += rotDiff * smoothFactor
    group.current.rotation.y = currentRotation.current

    // --- Animation based on interpolated velocity ---
    const distanceMoved = currentPosition.current.distanceTo(previousFramePosition.current)
    const frameVelocity = clampedDelta > 0 ? distanceMoved / clampedDelta : 0

    let desiredAction = 'idle'
    if (frameVelocity > 3.0) {
      desiredAction = 'run'
    } else if (frameVelocity > 0.3) {
      desiredAction = 'run'
    }

    // Switch animation if needed
    if (currentAction.current !== desiredAction && actions.current[desiredAction]) {
      const prevAction = actions.current[currentAction.current]
      const nextAction = actions.current[desiredAction]
      
      if (prevAction && nextAction) {
        prevAction.fadeOut(0.2)
        nextAction.reset().fadeIn(0.2).play()
        currentAction.current = desiredAction
      }
    }

    // Update animation mixer
    if (mixer.current) {
      mixer.current.update(clampedDelta)
    }
  })

  return (
    <group ref={group} position={[initialPosition.x, initialPosition.y, initialPosition.z]}>
      {/* Model with proper scale */}
      <group scale={scale}>
        <primitive object={clonedScene} />
      </group>
      
      {/* Role indicator above player */}
      <mesh position={[0, 2.2, 0]}>
        <sphereGeometry args={[0.15, 16, 16]} />
        <meshBasicMaterial 
          color={role === 'seeker' ? '#ff0000' : isCaught ? '#666666' : '#00ff00'} 
          transparent 
          opacity={0.9}
        />
      </mesh>
      
      {/* Ring indicator for better visibility */}
      <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.4, 0.5, 32]} />
        <meshBasicMaterial 
          color={role === 'seeker' ? '#ff0000' : isCaught ? '#666666' : '#0088ff'} 
          transparent 
          opacity={0.5}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  )
}

// Memoize: only re-render when role, caught status, or identity changes
// Position updates happen entirely through refs in useFrame - zero re-renders
export const RemotePlayer = memo(RemotePlayerComponent, (prevProps, nextProps) => {
  return (
    prevProps.playerId === nextProps.playerId &&
    prevProps.role === nextProps.role &&
    prevProps.isCaught === nextProps.isCaught &&
    prevProps.scale === nextProps.scale
  );
});

// Preload the model
useGLTF.preload('/models/person/model.glb')
