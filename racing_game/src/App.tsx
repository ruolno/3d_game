import { Suspense, useRef, useState, useEffect } from 'react'
import './App.css'
// @ts-ignore
import { Model } from "./components/Model.jsx"
// @ts-ignore
import { RemotePlayer } from "./components/RemotePlayer.jsx"
// @ts-ignore
import { CityScene } from "./components/CityScene.jsx"
import { GameUI } from "./components/GameUI"
import { Canvas, useFrame, useThree } from "@react-three/fiber"
import { Physics } from "@react-three/rapier"
import * as THREE from 'three'
import { useMultiplayer } from './hooks/useMultiplayer'

type ModelRef = React.RefObject<THREE.Group | null>

function ThirdPersonCamera({ modelRef }: { modelRef: ModelRef }) {
  const { camera, scene } = useThree()
  const cameraPosition = useRef(new THREE.Vector3())
  const cameraTarget = useRef(new THREE.Vector3())
  const smoothedCameraPosition = useRef(new THREE.Vector3())
  const smoothedCameraTarget = useRef(new THREE.Vector3())
  const raycaster = useRef(new THREE.Raycaster())
  const frameCount = useRef(0)
  
  useFrame((_state, delta) => {
    frameCount.current++
    if (!modelRef.current) return
    
    // Get model's world position
    const modelPosition = new THREE.Vector3()
    modelRef.current.getWorldPosition(modelPosition)
    
    // Get model's rotation
    const modelQuaternion = new THREE.Quaternion()
    modelRef.current.getWorldQuaternion(modelQuaternion)
    
    // Calculate camera offset behind the model
    // The offset is in local space relative to model's rotation
    const cameraOffset = new THREE.Vector3(0, 0.8, -1.5) // x, y, z (behind and above)
    cameraOffset.applyQuaternion(modelQuaternion)
    
    // Target position for camera (behind the model)
    const desiredCameraPosition = new THREE.Vector3()
    desiredCameraPosition.copy(modelPosition).add(cameraOffset)
    
    // Camera collision detection using raycast (only every 3 frames for performance)
    if (frameCount.current % 3 === 0) {
      // Cast a ray from the model to the desired camera position
      const rayDirection = new THREE.Vector3()
      rayDirection.subVectors(desiredCameraPosition, modelPosition).normalize()
      const rayDistance = modelPosition.distanceTo(desiredCameraPosition)
      
      raycaster.current.set(modelPosition, rayDirection)
      raycaster.current.far = rayDistance
      
      // Get all intersections with scene objects
      const intersects = raycaster.current.intersectObjects(scene.children, true)
      
      // Filter out the model itself and find the closest obstacle
      const filteredIntersects = intersects.filter(hit => {
        // Skip if object doesn't have matrixWorld (not fully initialized)
        if (!hit.object || !hit.object.matrixWorld) return false
        
        let obj = hit.object
        // Traverse up to check if this object is part of the model
        while (obj.parent) {
          if (obj === modelRef.current) return false
          obj = obj.parent
        }
        return true
      })
      
      // If there's an obstacle between the model and desired camera position
      if (filteredIntersects.length > 0) {
        const closestHit = filteredIntersects[0]
        // Position camera slightly before the collision point
        const collisionPoint = closestHit.point
        const safeDistance = 0.1 // Small offset to prevent clipping into surfaces
        const adjustedDirection = rayDirection.clone().multiplyScalar(-safeDistance)
        cameraPosition.current.copy(collisionPoint).add(adjustedDirection)
        
        // Adjust camera height proportionally based on distance to model
        const actualDistance = modelPosition.distanceTo(cameraPosition.current)
        const desiredDistance = rayDistance
        const distanceRatio = actualDistance / desiredDistance
        
        // Interpolate height between model and desired position
        const minHeight = modelPosition.y + 0.3 // Minimum height above model
        const desiredHeight = desiredCameraPosition.y
        cameraPosition.current.y = THREE.MathUtils.lerp(minHeight, desiredHeight, distanceRatio)
      } else {
        // No obstacles, use desired position
        cameraPosition.current.copy(desiredCameraPosition)
      }
    }
    
    // Look-at target (slightly above model center)
    cameraTarget.current.copy(modelPosition)
    cameraTarget.current.y += 0.3
    
    // Smooth camera movement using lerp
    const smoothFactor = 5 * delta // Adjust this value for faster/slower camera
    smoothedCameraPosition.current.lerp(cameraPosition.current, smoothFactor)
    smoothedCameraTarget.current.lerp(cameraTarget.current, smoothFactor)
    
    // Update camera position and rotation
    camera.position.copy(smoothedCameraPosition.current)
    camera.lookAt(smoothedCameraTarget.current)
  })
  
  return null
}

function FollowLight({ modelRef }: { modelRef: ModelRef }) {
  const lightRef = useRef<THREE.DirectionalLight>(null)
  
  useFrame(() => {
    if (modelRef.current && lightRef.current) {
      const modelPosition = new THREE.Vector3()
      modelRef.current.getWorldPosition(modelPosition)
      lightRef.current.position.set(
        modelPosition.x + 3,
        8,
        modelPosition.z + 5
      )
      lightRef.current.target.position.copy(modelPosition)
      lightRef.current.target.updateMatrixWorld()
    }
  })
  
  return (
    <directionalLight
      ref={lightRef}
      intensity={3}
      castShadow
      shadow-bias={-0.0001}
      shadow-camera-left={-10}
      shadow-camera-right={10}
      shadow-camera-top={10}
      shadow-camera-bottom={-10}
      shadow-camera-near={0.1}
      shadow-camera-far={50}
      shadow-mapSize-width={2048}
      shadow-mapSize-height={2048}
      shadow-radius={3}
    />
  )
}

function Scene({ 
  debugMode, 
  socket, 
  playerId, 
  remotePlayers, 
  playerPositionsRef,
  isSeeker,
  onReportFound,
  gameState 
}: { 
  debugMode: boolean;
  socket: any;
  playerId: string | null;
  remotePlayers: any[];
  playerPositionsRef: any;
  isSeeker: boolean;
  onReportFound: (hiderId: string) => void;
  gameState: any;
}) {
  const modelRef = useRef<THREE.Group>(null)
  const { camera } = useThree()
  
  return (
    <>
      {/* Sky color background */}
      <color attach="background" args={['#87CEEB']} />
      
      {/* Fog for atmosphere */}
      <fog attach="fog" args={['#87CEEB', 50, 150]} />
      
      {/* Ambient light */}
      <ambientLight intensity={0.4} />
      
      {/* Directional light with shadows that follows model */}
      <FollowLight modelRef={modelRef} />
      
      {/* City scene and character model with physics */}
      <Suspense fallback={null}>
        <Physics gravity={[0, -9.81, 0]} debug={debugMode}>
          <CityScene position={[0, 0, 0]} />
          
          {/* Local player */}
          <Model 
            ref={modelRef} 
            camera={camera} 
            castShadow 
            receiveShadow 
            scale={0.15} 
            position={[-42, 2, 0]}
            socket={socket}
            playerId={playerId}
            remotePlayers={remotePlayers}
            playerPositionsRef={playerPositionsRef}
            isSeeker={isSeeker}
            onReportFound={onReportFound}
            gameState={gameState}
          />
          
          {/* Remote players */}
          {remotePlayers.map(player => (
            <RemotePlayer
              key={player.id}
              playerId={player.id}
              playerPositionsRef={playerPositionsRef}
              initialPosition={player.position}
              initialRotation={player.rotation}
              role={player.role}
              name={player.name}
              isCaught={player.isCaught}
              socket={socket}
              scale={0.15}
            />
          ))}
        </Physics>
      </Suspense>
      
      {/* Third-person camera that follows behind the model */}
      <ThirdPersonCamera modelRef={modelRef} />
    </>
  )
}

function App() {
  const [debugMode, setDebugMode] = useState(false)
  
  // Multiplayer hook
  const {
    socket,
    connected,
    playerId,
    players,
    remotePlayers,
    playerPositionsRef,
    currentPlayer,
    gameState,
    scoreboard,
    isSeeker,
    toggleReady,
    reportFound,
    getTimeRemaining
  } = useMultiplayer()
  
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'd' || e.key === 'D') {
        setDebugMode(prev => !prev)
      }
    }
    
    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [])
  
  return (
    <>
      <Canvas
        camera={{ position: [-42, 3.5, 3], fov: 45 }}
        shadows="basic"
        gl={{ antialias: true, alpha: false }}
        dpr={[1, 2]}
        style={{
          width: "100vw",
          height: "100vh",
        }}
      >
        <Scene 
          debugMode={debugMode}
          socket={socket}
          playerId={playerId}
          remotePlayers={remotePlayers}
          playerPositionsRef={playerPositionsRef}
          isSeeker={isSeeker}
          onReportFound={reportFound}
          gameState={gameState}
        />
      </Canvas>
      
      {/* Game UI */}
      <GameUI
        connected={connected}
        currentPlayer={currentPlayer || null}
        players={players}
        gameState={gameState}
        scoreboard={scoreboard}
        isSeeker={isSeeker}
        onToggleReady={toggleReady}
        getTimeRemaining={getTimeRemaining}
      />
      
      {/* Debug mode indicator overlay */}
      {debugMode && (
        <div style={{
          position: 'fixed',
          top: '20px',
          left: '20px',
          background: 'rgba(0, 0, 0, 0.7)',
          color: '#00ff00',
          padding: '10px 20px',
          borderRadius: '5px',
          fontFamily: 'monospace',
          fontSize: '14px',
          zIndex: 1000,
          border: '2px solid #00ff00'
        }}>
          🔍 DEBUG MODE ON (Press 'D' to toggle)
        </div>
      )}
      
      {/* Controls info */}
      <div style={{
        position: 'fixed',
        bottom: '20px',
        left: '20px',
        background: 'rgba(0, 0, 0, 0.7)',
        color: 'white',
        padding: '15px',
        borderRadius: '5px',
        fontFamily: 'monospace',
        fontSize: '12px',
        zIndex: 900,
      }}>
        <div><strong>Controls:</strong></div>
        <div>Arrow Keys: Move</div>
        <div>Shift: Run</div>
        <div>Space: Jump</div>
        <div>D: Toggle Debug Mode</div>
      </div>
    </>
  )
}

export default App
