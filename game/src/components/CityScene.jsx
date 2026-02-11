import React, { useEffect } from 'react'
import { useGLTF } from '@react-three/drei'
import { RigidBody } from '@react-three/rapier'

export function CityScene(props) {
  const { scene } = useGLTF('/scene_model/source/scene.gltf')
  
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
      <primitive 
        object={scene} 
        {...props}
      />
    </RigidBody>
  )
}

useGLTF.preload('/scene_model/source/scene.gltf')
