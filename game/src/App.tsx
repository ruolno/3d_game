import { Suspense, useRef } from 'react'
import './App.css'
// @ts-ignore
import { Model } from "./components/Model.jsx"
// @ts-ignore
import { CityScene } from "./components/CityScene.jsx"
import { Canvas, useFrame } from "@react-three/fiber"
import { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import { OrbitControls } from "@react-three/drei"
import { Physics } from "@react-three/rapier"
import * as THREE from 'three'

type ModelRef = React.RefObject<THREE.Group | null>

function CameraController({ modelRef }: { modelRef: ModelRef }) {
  const controlsRef = useRef<OrbitControlsImpl>(null)
  
  useFrame(() => {
    if (modelRef.current && controlsRef.current) {
      // Update camera target to follow model
      const target = new THREE.Vector3()
      modelRef.current.getWorldPosition(target)
      target.y += 0.5
      controlsRef.current.target.copy(target)
      controlsRef.current.update()
    }
  })
  
  return (
    <OrbitControls 
      ref={controlsRef}
      minPolarAngle={Math.PI / 6}
      maxPolarAngle={Math.PI / 2.5}
      minDistance={1.5}
      maxDistance={5}
      enablePan={false}
    />
  )
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
      shadow-mapSize-width={4096}
      shadow-mapSize-height={4096}
      shadow-radius={4}
    />
  )
}

function Scene() {
  const modelRef = useRef<THREE.Group>(null)
  
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
        <Physics gravity={[0, -9.81, 0]}>
          <CityScene position={[0, 0, 0]} />
          <Model ref={modelRef} castShadow receiveShadow />
        </Physics>
      </Suspense>
      
      {/* Camera controls that follow the model */}
      <CameraController modelRef={modelRef} />
    </>
  )
}

function App() {
  return (
    <>
      <Canvas
        camera={{ position: [0, 0, 5], fov: 45 }}
        shadows="soft"
        style={{
          width: "100vw",
          height: "100vh",
        }}
      >
        <Scene />
      </Canvas>
    </>
  )
}

export default App
