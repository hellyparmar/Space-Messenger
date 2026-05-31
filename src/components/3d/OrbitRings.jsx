import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

/* ──────────────────────────────────────────────────────────────
   ASTEROID BELT: 800 instanced tumbling rocks
──────────────────────────────────────────────────────────────── */
export function AsteroidBelt() {
  const meshRef = useRef()
  const dataRef = useRef(null)

  const { geometry, material } = useMemo(() => {
    const geo = new THREE.IcosahedronGeometry(0.14, 0)
    const mat = new THREE.MeshStandardMaterial({
      color:     new THREE.Color(0.42, 0.38, 0.32),
      roughness: 0.92,
      metalness: 0.06,
    })
    return { geometry: geo, material: mat }
  }, [])

  // Pre-compute per-asteroid data once
  useMemo(() => {
    const N = 800
    const angles  = new Float32Array(N)
    const speeds  = new Float32Array(N)
    const radii   = new Float32Array(N)
    const yOffsets = new Float32Array(N)
    const scales  = new Float32Array(N)
    const rotX    = new Float32Array(N)
    const rotY    = new Float32Array(N)

    for (let i = 0; i < N; i++) {
      angles[i]   = Math.random() * Math.PI * 2
      speeds[i]   = (0.0008 + Math.random() * 0.0012) * (Math.random() < 0.5 ? 1 : -1)
      radii[i]    = 36 + Math.random() * 8
      yOffsets[i] = (Math.random() - 0.5) * 1.8
      scales[i]   = 0.4 + Math.random() * 0.9
      rotX[i]     = Math.random() * Math.PI * 2
      rotY[i]     = Math.random() * Math.PI * 2
    }
    dataRef.current = { N, angles, speeds, radii, yOffsets, scales, rotX, rotY }
  }, [])

  useFrame(() => {
    if (!meshRef.current || !dataRef.current) return
    const { N, angles, speeds, radii, yOffsets, scales, rotX, rotY } = dataRef.current
    const dum = new THREE.Object3D()

    for (let i = 0; i < N; i++) {
      angles[i] += speeds[i]
      dum.position.set(
        Math.cos(angles[i]) * radii[i],
        yOffsets[i],
        Math.sin(angles[i]) * radii[i]
      )
      rotX[i] += 0.008
      rotY[i] += 0.005
      dum.rotation.set(rotX[i], rotY[i], 0)
      dum.scale.setScalar(scales[i])
      dum.updateMatrix()
      meshRef.current.setMatrixAt(i, dum.matrix)
    }
    meshRef.current.instanceMatrix.needsUpdate = true
  })

  const count = dataRef.current?.N ?? 800

  return (
    <instancedMesh
      ref={meshRef}
      args={[geometry, material, count]}
      castShadow
    />
  )
}

/* ──────────────────────────────────────────────────────────────
   COMETS: 3 Elliptical Kepler orbits with nucleus + ion tail + dust tail
──────────────────────────────────────────────────────────────── */
const COMET_DEFS = [
  { a: 88,  e: 0.78, speed: 0.0009, tilt: 0.30, phase: 0.0  },
  { a: 115, e: 0.82, speed: 0.0006, tilt: -0.50, phase: 2.1  },
  { a: 72,  e: 0.71, speed: 0.0011, tilt: 0.60, phase: 4.2  },
]

function Comet({ def }) {
  const groupRef   = useRef()
  const ionRef     = useRef()
  const dustRef    = useRef()
  const angleRef   = useRef(def.phase)
  const TN         = 250

  const { ionGeo, dustGeo } = useMemo(() => {
    const ionPos  = new Float32Array(TN * 3)
    const dustPos = new Float32Array(TN * 3)
    const iGeo  = new THREE.BufferGeometry()
    const dGeo  = new THREE.BufferGeometry()
    iGeo.setAttribute('position',  new THREE.BufferAttribute(ionPos,  3))
    dGeo.setAttribute('position',  new THREE.BufferAttribute(dustPos, 3))
    return { ionGeo: iGeo, dustGeo: dGeo }
  }, [])

  useFrame(() => {
    // Kepler: angular speed ∝ (1 + e·cosθ)²
    angleRef.current += def.speed * (1 + def.e * Math.cos(angleRef.current)) ** 2

    const p  = def.a * (1 - def.e * def.e)
    const r  = p / (1 + def.e * Math.cos(angleRef.current))
    const cx = Math.cos(angleRef.current) * r
    const cz = Math.sin(angleRef.current) * r
    const cy = Math.sin(def.tilt) * r * 0.12

    if (groupRef.current) groupRef.current.position.set(cx, cy, cz)

    // Tail direction: always away from sun
    const td = new THREE.Vector3(-cx, -cy, -cz).normalize()
    const right = new THREE.Vector3(td.z, 0, -td.x).normalize()
    const prox = Math.max(0, 1 - r / (def.a * 2.0))
    const tailLen = Math.max(3, 20 * prox)

    // Ion tail (bluish-white, straight)
    const ionPos  = ionGeo.attributes.position.array
    // Dust tail (golden, curved)
    const dustPos = dustGeo.attributes.position.array

    for (let i = 0; i < TN; i++) {
      const f = i / TN
      const scatter = (Math.random() - 0.5) * 0.35
      ionPos[i*3]   = td.x * f * tailLen + scatter * 0.3
      ionPos[i*3+1] = td.y * f * tailLen + scatter * 0.1
      ionPos[i*3+2] = td.z * f * tailLen + scatter * 0.3

      const curve = f * f * 0.8
      const ds    = (Math.random() - 0.5) * f * 2.0
      dustPos[i*3]   = td.x * f * tailLen + right.x * (ds + curve) + (Math.random()-0.5)*0.5
      dustPos[i*3+1] = td.y * f * tailLen + ds * 0.3
      dustPos[i*3+2] = td.z * f * tailLen + right.z * (ds + curve) + (Math.random()-0.5)*0.5
    }
    ionGeo.attributes.position.needsUpdate  = true
    dustGeo.attributes.position.needsUpdate = true

    if (ionRef.current)  ionRef.current.material.opacity  = Math.max(0.06, 0.65 * prox + 0.1)
    if (dustRef.current) dustRef.current.material.opacity = Math.max(0.04, 0.45 * prox + 0.05)
  })

  return (
    <group>
      {/* Nucleus */}
      <group ref={groupRef}>
        <mesh>
          <icosahedronGeometry args={[0.45, 0]} />
          <meshStandardMaterial color={0x111108} roughness={1} metalness={0} />
        </mesh>
      </group>

      {/* Ion tail (blue-white, straight) */}
      <points ref={ionRef} geometry={ionGeo}>
        <pointsMaterial
          color={0xaaddff}
          transparent opacity={0.6}
          size={0.22}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          sizeAttenuation
        />
      </points>

      {/* Dust tail (warm gold, curved) */}
      <points ref={dustRef} geometry={dustGeo}>
        <pointsMaterial
          color={0xffe8a0}
          transparent opacity={0.4}
          size={0.28}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          sizeAttenuation
        />
      </points>
    </group>
  )
}

export function Comets() {
  return (
    <>
      {COMET_DEFS.map((def, i) => <Comet key={i} def={def} />)}
    </>
  )
}

/* ──────────────────────────────────────────────────────────────
   SHOOTING STARS: periodic meteor streaks
──────────────────────────────────────────────────────────────── */
function ShootingStar({ onDone }) {
  const ref     = useRef()
  const life    = useRef(0)
  const dur     = useRef(0.7 + Math.random() * 0.5)
  const pos     = useRef(new THREE.Vector3())
  const vel     = useRef(new THREE.Vector3())

  useMemo(() => {
    const theta = Math.random() * Math.PI * 2
    const phi   = Math.acos(2 * Math.random() - 1)
    const r     = 350
    pos.current.set(
      r * Math.sin(phi) * Math.cos(theta),
      r * Math.sin(phi) * Math.sin(theta),
      r * Math.cos(phi)
    )
    const spd = 600 + Math.random() * 350
    const d = new THREE.Vector3(Math.random()-0.5, Math.random()-0.5, Math.random()-0.5).normalize()
    vel.current.copy(d).multiplyScalar(spd)
  }, [])

  const N    = 40
  const buf  = useMemo(() => new Float32Array(N * 3), [])
  const geo  = useMemo(() => {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(buf, 3))
    return g
  }, [buf])

  useFrame((_, dt) => {
    life.current += dt
    const p = life.current / dur.current
    if (p >= 1) { onDone?.(); return }

    const cx = pos.current.x + vel.current.x * life.current
    const cy = pos.current.y + vel.current.y * life.current
    const cz = pos.current.z + vel.current.z * life.current

    for (let i = 0; i < N; i++) {
      const f = i / N, b = f * 0.4
      buf[i*3]   = cx - vel.current.x * b * dur.current
      buf[i*3+1] = cy - vel.current.y * b * dur.current
      buf[i*3+2] = cz - vel.current.z * b * dur.current
    }
    geo.attributes.position.needsUpdate = true

    if (ref.current?.material) {
      ref.current.material.opacity = Math.sin(p * Math.PI) * 0.85
      ref.current.material.color.setHSL(0.1 * (1 - p), 0.8, 1)
    }
  })

  return (
    <points ref={ref} geometry={geo}>
      <pointsMaterial
        color={0xffffff}
        transparent opacity={0}
        size={0.6}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        sizeAttenuation={false}
      />
    </points>
  )
}

export function ShootingStars() {
  const stars  = useRef([])
  const timer  = useRef(2 + Math.random() * 4)
  const idRef  = useRef(0)
  const [, forceUpdate] = [0, () => {}]

  useFrame((_, dt) => {
    timer.current -= dt
    if (timer.current <= 0) {
      timer.current = 3 + Math.random() * 5
      if (stars.current.length < 6) {
        stars.current = [...stars.current, { id: idRef.current++ }]
      }
    }
  })

  return (
    <>
      {stars.current.map(s => (
        <ShootingStar
          key={s.id}
          onDone={() => { stars.current = stars.current.filter(x => x.id !== s.id) }}
        />
      ))}
    </>
  )
}
