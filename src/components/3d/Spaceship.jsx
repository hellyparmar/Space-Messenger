import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Vector3, Quaternion, Matrix4 } from 'three'

export function Spaceship({ start, end, onComplete, color = '#ffffff' }) {
    const meshRef = useRef()
    const progress = useRef(0)
    const speed = 0.02 // Adjust speed as needed

    const startVec = new Vector3(...start)
    const endVec = new Vector3(...end)

    useFrame(() => {
        if (progress.current >= 1) {
            if (onComplete) onComplete()
            return
        }

        progress.current += speed
        if (progress.current > 1) progress.current = 1

        // Interpolate position
        if (meshRef.current) {
            meshRef.current.position.lerpVectors(startVec, endVec, progress.current)

            // Look at target
            meshRef.current.lookAt(endVec)
        }
    })

    if (progress.current >= 1) return null

    return (
        <mesh ref={meshRef} position={start}>
            <coneGeometry args={[0.2, 0.8, 8]} />
            <meshStandardMaterial color={color} emissive={color} emissiveIntensity={2} />
            {/* Engine trace could be added here */}
        </mesh>
    )
}
