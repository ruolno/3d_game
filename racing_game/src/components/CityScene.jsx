import React, { useEffect } from 'react'
import { useGLTF } from '@react-three/drei'
import { RigidBody } from '@react-three/rapier'

export function CityScene(props) {
  const { scene } = useGLTF('/models/city/city.glb')
  
  // Enable shadows on all meshes in the scene
  useEffect(() => {
    scene.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true
        child.receiveShadow = true
      }
    })
  }, [scene])
  
  return (
    <RigidBody type="fixed" colliders="trimesh">
      <primitive scale={3}
        object={scene} 
        {...props}
      />
    </RigidBody>
  )
}

useGLTF.preload('/models/city/city.glb')
