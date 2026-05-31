import { useTexture } from '@react-three/drei'
import { DoubleSide } from 'three'

export function SaturnRings({ innerRadius = 2.3, outerRadius = 4.5, rotation = [1.8, 0, 0] }) {
    // Fallback if texture fails, just use a colored ring
    // If we had a texture, we'd load it here. 
    // For now, let's create a procedural-looking ring using multiple rings or a shader? 
    // Simple approach: Single ring with transparency.

    return (
        <group rotation={rotation}>
            <mesh rotation={[-Math.PI / 2, 0, 0]}>
                <ringGeometry args={[innerRadius, outerRadius, 64]} />
                <meshStandardMaterial
                    color="#C6A476"
                    opacity={0.8}
                    transparent
                    side={DoubleSide}
                    emissive="#C6A476"
                    emissiveIntensity={0.1}
                />
            </mesh>
            {/* Inner faint ring */}
            <mesh rotation={[-Math.PI / 2, 0, 0]}>
                <ringGeometry args={[innerRadius * 0.8, innerRadius * 0.95, 64]} />
                <meshStandardMaterial
                    color="#8B7355"
                    opacity={0.4}
                    transparent
                    side={DoubleSide}
                />
            </mesh>
        </group>
    )
}
