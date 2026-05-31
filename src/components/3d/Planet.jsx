import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

/* ──────────────────────────────────────────────────────────────
   ORBITAL PATH RING: Dashed elliptical orbit line
──────────────────────────────────────────────────────────────── */
export function OrbitRing({ radius, tilt = 0, ellipticity = 0 }) {
  const points = useMemo(() => {
    const pts = []
    for (let i = 0; i <= 256; i++) {
      const a = (i / 256) * Math.PI * 2
      pts.push(new THREE.Vector3(
        Math.cos(a) * radius,
        0,
        Math.sin(a) * radius * (1 - ellipticity * 0.15)
      ))
    }
    return pts
  }, [radius, ellipticity])

  return (
    <group rotation={[0, 0, THREE.MathUtils.degToRad(tilt)]}>
      <line>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={points.length}
            array={new Float32Array(points.flatMap(p => [p.x, p.y, p.z]))}
            itemSize={3}
          />
        </bufferGeometry>
        <lineBasicMaterial
          color={0x4488CC}
          transparent
          opacity={0.12}
          depthWrite={false}
        />
      </line>
    </group>
  )
}

/* ──────────────────────────────────────────────────────────────
   PROCEDURAL PLANET TEXTURES via Canvas
──────────────────────────────────────────────────────────────── */

function makeEarthlikeTexture(seed = 0) {
  const S = 512
  const cv = document.createElement('canvas'); cv.width = cv.height = S
  const ctx = cv.getContext('2d')
  
  // Base ocean
  ctx.fillStyle = '#0a2a5c'
  ctx.fillRect(0, 0, S, S)

  // Land masses with noise-like blobs
  const rng = seed
  for (let i = 0; i < 12; i++) {
    const x = ((Math.sin(i * 91.3 + rng) * 0.5 + 0.5)) * S
    const y = ((Math.cos(i * 71.7 + rng) * 0.5 + 0.5)) * S
    const r = 30 + ((Math.sin(i * 37.1) * 0.5 + 0.5)) * 100
    const g = ctx.createRadialGradient(x, y, 0, x, y, r)
    g.addColorStop(0, 'rgba(80,140,60,0.9)')
    g.addColorStop(0.4, 'rgba(60,110,40,0.7)')
    g.addColorStop(0.8, 'rgba(120,90,50,0.4)')
    g.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, S, S)
  }

  // Polar ice caps
  const capG1 = ctx.createLinearGradient(0, 0, 0, S * 0.18)
  capG1.addColorStop(0, 'rgba(220,235,255,0.95)')
  capG1.addColorStop(1, 'rgba(200,220,255,0)')
  ctx.fillStyle = capG1
  ctx.fillRect(0, 0, S, S * 0.18)

  const capG2 = ctx.createLinearGradient(0, S * 0.82, 0, S)
  capG2.addColorStop(0, 'rgba(200,220,255,0)')
  capG2.addColorStop(1, 'rgba(220,235,255,0.95)')
  ctx.fillStyle = capG2
  ctx.fillRect(0, S * 0.82, S, S * 0.18)

  return new THREE.CanvasTexture(cv)
}

function makeGasGiantTexture(seed = 0) {
  const S = 512
  const cv = document.createElement('canvas'); cv.width = cv.height = S
  const ctx = cv.getContext('2d')

  // Base color
  ctx.fillStyle = '#A0622A'
  ctx.fillRect(0, 0, S, S)

  // Horizontal bands
  const bands = [
    { y: 0.05, h: 0.08, r: 180, g: 120, b: 60, a: 0.8 },
    { y: 0.15, h: 0.06, r: 220, g: 160, b: 80, a: 0.6 },
    { y: 0.25, h: 0.12, r: 140, g: 80,  b: 30, a: 0.75 },
    { y: 0.40, h: 0.08, r: 200, g: 140, b: 70, a: 0.55 },
    { y: 0.52, h: 0.14, r: 160, g: 100, b: 40, a: 0.7 },
    { y: 0.70, h: 0.10, r: 210, g: 150, b: 65, a: 0.5 },
    { y: 0.83, h: 0.08, r: 130, g: 70,  b: 25, a: 0.8 },
    { y: 0.93, h: 0.07, r: 190, g: 130, b: 55, a: 0.55 },
  ]
  bands.forEach(b => {
    const bg = ctx.createLinearGradient(0, b.y * S, S, (b.y + b.h) * S)
    bg.addColorStop(0, `rgba(${b.r},${b.g},${b.b},${b.a})`)
    bg.addColorStop(0.5, `rgba(${Math.min(255,b.r+20)},${b.g},${b.b},${b.a * 0.6})`)
    bg.addColorStop(1, `rgba(${b.r},${b.g},${b.b},${b.a})`)
    ctx.fillStyle = bg
    ctx.fillRect(0, b.y * S, S, b.h * S)
  })

  // Great Red Spot
  const gs = 0.6 + (seed % 10) * 0.04
  const gx = S * gs, gy = S * 0.55
  const spotG = ctx.createRadialGradient(gx, gy, 0, gx, gy, 40)
  spotG.addColorStop(0, 'rgba(200,60,30,0.9)')
  spotG.addColorStop(0.5, 'rgba(180,50,20,0.6)')
  spotG.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = spotG
  ctx.beginPath(); ctx.ellipse(gx, gy, 40, 28, 0, 0, Math.PI * 2); ctx.fill()

  return new THREE.CanvasTexture(cv)
}

function makeRockyTexture(seed = 0) {
  const S = 512
  const cv = document.createElement('canvas'); cv.width = cv.height = S
  const ctx = cv.getContext('2d')

  // Base rocky color
  const r = 80 + (seed * 13) % 40
  const g = 60 + (seed * 7)  % 30
  const b = 40 + (seed * 11) % 20
  ctx.fillStyle = `rgb(${r},${g},${b})`
  ctx.fillRect(0, 0, S, S)

  // Craters
  for (let i = 0; i < 25; i++) {
    const cx = Math.random() * S
    const cy = Math.random() * S
    const cr = 8 + Math.random() * 35
    const cg = ctx.createRadialGradient(cx, cy, 0, cx, cy, cr)
    cg.addColorStop(0, 'rgba(20,15,10,0.6)')
    cg.addColorStop(0.7, 'rgba(40,30,20,0.3)')
    cg.addColorStop(0.85, 'rgba(100,80,60,0.4)')
    cg.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = cg
    ctx.beginPath(); ctx.arc(cx, cy, cr, 0, Math.PI * 2); ctx.fill()
  }

  // Surface cracks
  for (let i = 0; i < 15; i++) {
    ctx.beginPath()
    ctx.strokeStyle = `rgba(${r-30},${g-25},${b-20},0.4)`
    ctx.lineWidth = 0.5 + Math.random()
    const sx = Math.random() * S, sy = Math.random() * S
    ctx.moveTo(sx, sy)
    for (let j = 0; j < 4; j++) {
      ctx.lineTo(sx + (Math.random()-0.5)*60, sy + (Math.random()-0.5)*60)
    }
    ctx.stroke()
  }

  return new THREE.CanvasTexture(cv)
}

function makeIceWorldTexture(seed = 0) {
  const S = 512
  const cv = document.createElement('canvas'); cv.width = cv.height = S
  const ctx = cv.getContext('2d')

  // Blue-white base
  ctx.fillStyle = '#99BBDD'
  ctx.fillRect(0, 0, S, S)

  // Ice cracks and ridges
  for (let i = 0; i < 30; i++) {
    ctx.beginPath()
    ctx.strokeStyle = `rgba(${140+Math.floor(Math.random()*80)},${180+Math.floor(Math.random()*60)},${210+Math.floor(Math.random()*45)},0.6)`
    ctx.lineWidth = 0.5 + Math.random() * 2
    const sx = Math.random() * S, sy = Math.random() * S
    ctx.moveTo(sx, sy)
    for (let j = 0; j < 6; j++) {
      ctx.lineTo(sx + (Math.random()-0.5)*90, sy + (Math.random()-0.5)*90)
    }
    ctx.stroke()
  }

  // Subsurface color variation
  for (let i = 0; i < 8; i++) {
    const bx = Math.random() * S, by = Math.random() * S
    const bg = ctx.createRadialGradient(bx, by, 0, bx, by, 60 + Math.random() * 100)
    bg.addColorStop(0, 'rgba(50,120,200,0.4)')
    bg.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, S, S)
  }

  // Thick ice caps
  const cg1 = ctx.createLinearGradient(0, 0, 0, S * 0.25)
  cg1.addColorStop(0, 'rgba(240,248,255,0.98)')
  cg1.addColorStop(1, 'rgba(200,230,255,0)')
  ctx.fillStyle = cg1; ctx.fillRect(0, 0, S, S * 0.25)

  const cg2 = ctx.createLinearGradient(0, S * 0.75, 0, S)
  cg2.addColorStop(0, 'rgba(200,230,255,0)')
  cg2.addColorStop(1, 'rgba(240,248,255,0.98)')
  ctx.fillStyle = cg2; ctx.fillRect(0, S * 0.75, S, S * 0.25)

  return new THREE.CanvasTexture(cv)
}

/* ──────────────────────────────────────────────────────────────
   ATMOSPHERE SHADER
──────────────────────────────────────────────────────────────── */
const ATM_COLORS = {
  earthlike: 'vec3(0.28, 0.60, 1.0)',
  gasgiant:  'vec3(0.90, 0.65, 0.30)',
  rocky:     'vec3(0.60, 0.38, 0.22)',
  iceworld:  'vec3(0.60, 0.85, 1.0)',
}

function AtmosphereShell({ size, type }) {
  const mat = useMemo(() => new THREE.ShaderMaterial({
    uniforms: {},
    vertexShader: /* glsl */`
      varying vec3 vNormal;
      varying vec3 vViewDir;
      void main() {
        vNormal  = normalize(normalMatrix * normal);
        vec4 mv  = modelViewMatrix * vec4(position, 1.0);
        vViewDir = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */`
      varying vec3 vNormal;
      varying vec3 vViewDir;
      void main() {
        float rim = pow(max(1.0 - dot(vNormal, vViewDir), 0.0), 2.0);
        vec3 atm = ${ATM_COLORS[type] || 'vec3(0.5, 0.5, 1.0)'};
        gl_FragColor = vec4(atm, rim * 0.65);
      }
    `,
    transparent: true,
    depthWrite:  false,
    blending:    THREE.AdditiveBlending,
    side:        THREE.BackSide,
  }), [type])

  return (
    <mesh>
      <sphereGeometry args={[size * 1.055, 32, 32]} />
      <primitive object={mat} attach="material" />
    </mesh>
  )
}

/* ──────────────────────────────────────────────────────────────
   MOON: small satellite
──────────────────────────────────────────────────────────────── */
function Moon({ distance, size, speed, offset, planetPos }) {
  const ref = useRef()
  useFrame(({ clock }) => {
    if (!ref.current) return
    const t = clock.getElapsedTime()
    const angle = t * speed + offset
    ref.current.position.set(
      Math.cos(angle) * distance,
      Math.sin(angle) * 0.3 * distance * 0.3,
      Math.sin(angle) * distance
    )
    ref.current.rotation.y += 0.01
  })

  const tex = useMemo(() => makeRockyTexture(distance * 10), [distance])

  return (
    <mesh ref={ref} castShadow receiveShadow>
      <sphereGeometry args={[size, 16, 16]} />
      <meshStandardMaterial
        map={tex}
        roughness={0.92}
        metalness={0.02}
      />
    </mesh>
  )
}

/* ──────────────────────────────────────────────────────────────
   PLANET COMPONENT
──────────────────────────────────────────────────────────────── */
const PLANET_COLORS = {
  earthlike: '#3a8bdf',
  gasgiant:  '#d08830',
  rocky:     '#a06040',
  iceworld:  '#60b4d8',
}

export function Planet({
  data,
  onHover,
  onHoverOut,
  onClick,
  isSelected,
  hasSaturnRings = false,
}) {
  const meshRef     = useRef()
  const groupRef    = useRef()
  const angleRef    = useRef(data.orbitOffset ?? Math.random() * Math.PI * 2)

  const texture = useMemo(() => {
    switch (data.type) {
      case 'earthlike': return makeEarthlikeTexture(data.seed ?? 0)
      case 'gasgiant':  return makeGasGiantTexture(data.seed ?? 0)
      case 'iceworld':  return makeIceWorldTexture(data.seed ?? 0)
      default:          return makeRockyTexture(data.seed ?? 0)
    }
  }, [data.type, data.seed])

  // Axial tilt (5–30 degrees)
  const axialTilt = useMemo(() =>
    THREE.MathUtils.degToRad(5 + (data.seed ?? 0) * 7.3 % 25)
  , [data.seed])

  const moons = useMemo(() => {
    const count = data.moons ?? Math.floor(((data.seed ?? 0) * 11) % 3)
    return Array.from({ length: count }, (_, i) => ({
      distance: data.size * (2.2 + i * 1.4),
      size:     data.size * (0.18 + i * 0.06),
      speed:    0.4 + i * 0.2,
      offset:   i * 2.1,
    }))
  }, [data])

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()
    const dt = 1 / 60

    // Orbit
    angleRef.current += data.orbitSpeed
    const angle = angleRef.current
    const r = data.orbitRadius
    const elliptic = data.ellipticity ?? 0
    if (groupRef.current) {
      groupRef.current.position.set(
        Math.cos(angle) * r,
        0,
        Math.sin(angle) * r * (1 - elliptic * 0.12)
      )
    }

    // Self-rotation
    if (meshRef.current) {
      meshRef.current.rotation.y += data.rotSpeed ?? 0.004
    }
  })

  return (
    <group ref={groupRef} rotation={[0, 0, axialTilt]}>
      {/* Planet mesh */}
      <mesh
        ref={meshRef}
        castShadow
        receiveShadow
        onPointerEnter={e => { e.stopPropagation(); onHover?.(data) }}
        onPointerLeave={e => { e.stopPropagation(); onHoverOut?.() }}
        onClick={e => { e.stopPropagation(); onClick?.(data) }}
      >
        <sphereGeometry args={[data.size, 48, 48]} />
        <meshStandardMaterial
          map={texture}
          emissiveMap={texture}
          emissive={new THREE.Color(1, 1, 1)}
          emissiveIntensity={0.18}
          roughness={data.type === 'iceworld' ? 0.35 : 0.72}
          metalness={data.type === 'iceworld' ? 0.15 : 0.04}
        />
      </mesh>

      {/* Atmosphere */}
      {!data.isDwarf && (
        <AtmosphereShell size={data.size} type={data.type} />
      )}

      {/* Saturn Rings */}
      {hasSaturnRings && (
        <group rotation={[Math.PI / 9, 0, 0]}>
          {[0, 1, 2, 3].map(i => (
            <mesh key={i}>
              <ringGeometry args={[
                data.size * (1.55 + i * 0.32),
                data.size * (1.82 + i * 0.32),
                80
              ]} />
              <meshStandardMaterial
                color={new THREE.Color().setHSL(0.08, 0.25, 0.48 - i * 0.06)}
                transparent
                opacity={0.62 - i * 0.1}
                side={THREE.DoubleSide}
                depthWrite={false}
                roughness={0.9}
              />
            </mesh>
          ))}
        </group>
      )}

      {/* Moons */}
      {moons.map((m, i) => (
        <Moon key={i} {...m} />
      ))}

      {/* Selection glow */}
      {isSelected && (
        <mesh>
          <sphereGeometry args={[data.size * 1.25, 32, 32]} />
          <meshBasicMaterial
            color={PLANET_COLORS[data.type] ?? '#ffffff'}
            transparent
            opacity={0.08}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      )}
    </group>
  )
}

/* ──────────────────────────────────────────────────────────────
   DWARF PLANET — Icosahedron with high-frequency noise displacement
──────────────────────────────────────────────────────────────── */
export function DwarfPlanet({ data, onHover, onHoverOut, onClick }) {
  const meshRef  = useRef()
  const groupRef = useRef()
  const angleRef = useRef(data.orbitOffset ?? Math.random() * Math.PI * 2)

  // Displaced icosahedron geometry
  const geo = useMemo(() => {
    const g = new THREE.IcosahedronGeometry(data.size, 4)
    const pa = g.attributes.position
    for (let i = 0; i < pa.count; i++) {
      const v = new THREE.Vector3().fromBufferAttribute(pa, i)
      const noise = 1 + 0.22 * Math.sin(v.x * 6.1 + data.seed) *
                             Math.cos(v.y * 5.7 - data.seed * 0.7) *
                             Math.sin(v.z * 7.3 + data.seed * 1.2)
      v.normalize().multiplyScalar(data.size * noise)
      pa.setXYZ(i, v.x, v.y, v.z)
    }
    g.computeVertexNormals()
    return g
  }, [data.size, data.seed])

  const texture = useMemo(() =>
    data.type === 'iceworld' ? makeIceWorldTexture(data.seed ?? 0)
                              : makeRockyTexture(data.seed ?? 0)
  , [data.type, data.seed])

  useFrame(() => {
    angleRef.current += data.orbitSpeed
    const angle = angleRef.current
    const r = data.orbitRadius
    const e = data.ellipticity ?? 0.12
    if (groupRef.current) {
      groupRef.current.position.set(
        Math.cos(angle) * r,
        Math.sin(angle) * r * e * 0.15,
        Math.sin(angle) * r * (1 - e * 0.18)
      )
    }
    if (meshRef.current) {
      meshRef.current.rotation.x += 0.003
      meshRef.current.rotation.y += 0.002
    }
  })

  return (
    <group ref={groupRef}>
      <mesh
        ref={meshRef}
        geometry={geo}
        castShadow
        onPointerEnter={e => { e.stopPropagation(); onHover?.(data) }}
        onPointerLeave={e => { e.stopPropagation(); onHoverOut?.() }}
        onClick={e => { e.stopPropagation(); onClick?.(data) }}
      >
        <meshStandardMaterial
          map={texture}
          roughness={0.88}
          metalness={0.03}
        />
      </mesh>
    </group>
  )
}
