import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

/* ──────────────────────────────────────────────────────────────
   SUN — Central star with:
   • PBR-style GLSL shader: boiling plasma granulation + limb darkening
   • 3 layered glow halos (inner corona, middle corona, magnetosphere)
   • Solar flare system (procedural arc emissions every 8-15s)
   • unreadLetterCount → corona intensity, pulse speed, halo brightness
──────────────────────────────────────────────────────────────── */

// Helper: create radial gradient texture for halos
function makeHaloTex(c0, c1, size = 128) {
  const cv = document.createElement('canvas')
  cv.width = cv.height = size
  const ctx = cv.getContext('2d')
  const h = size / 2
  const g = ctx.createRadialGradient(h, h, 0, h, h, h)
  g.addColorStop(0, c0)
  g.addColorStop(0.45, c1)
  g.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, size, size)
  return new THREE.CanvasTexture(cv)
}

// SunCore: the plasma-textured sphere
function SunCore({ shaderRef, unreadIntensity }) {
  const meshRef = useRef()

  const mat = useMemo(() => new THREE.ShaderMaterial({
    uniforms: {
      time:            { value: 0 },
      unreadIntensity: { value: 0 },
    },
    vertexShader: /* glsl */`
      varying vec2 vUv;
      varying vec3 vNormal;
      varying vec3 vViewDir;

      void main() {
        vUv     = uv;
        vNormal = normalize(normalMatrix * normal);
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vViewDir = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */`
      uniform float time;
      uniform float unreadIntensity;
      varying vec2 vUv;
      varying vec3 vNormal;
      varying vec3 vViewDir;

      // Hash noise
      float h(vec2 p) { return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
      float n2(vec2 p) {
        vec2 i = floor(p), f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        return mix(mix(h(i), h(i+vec2(1,0)), f.x),
                   mix(h(i+vec2(0,1)), h(i+vec2(1,1)), f.x), f.y);
      }
      float fbm(vec2 p) {
        float v = 0.0, a = 0.5;
        for (int i = 0; i < 7; i++) { v += a * n2(p); p *= 2.1; a *= 0.5; }
        return v;
      }

      void main() {
        vec2 uv = vUv;

        // Drive speed by unread messages
        float spd = 1.0 + unreadIntensity * 2.5;

        // Boiling plasma (two offset FBM layers)
        float f1 = fbm(uv * 4.5 + vec2(time * 0.07 * spd, time * 0.055 * spd));
        float f2 = fbm(uv * 9.0 - vec2(time * 0.045 * spd, time * 0.065 * spd)) * 0.45;
        float f  = f1 + f2;

        // Plasma color: deep orange → bright yellow-white
        vec3 col0 = vec3(0.95, 0.22, 0.0);  // orange-red
        vec3 col1 = vec3(1.0,  0.70, 0.05); // amber-gold
        vec3 col2 = vec3(1.0,  0.95, 0.6);  // hot white-yellow
        vec3 plasma = mix(col0, col1, smoothstep(0.35, 0.65, f));
        plasma = mix(plasma, col2, smoothstep(0.65, 0.9, f));

        // Solar granulation: convection cells
        vec2 gc = fract(uv * 90.0 + time * 0.025 * spd) - 0.5;
        float grain = smoothstep(0.42, 0.0, length(gc));
        plasma = mix(plasma, plasma * 1.7, grain * 0.28);

        // Limb darkening (physically-based)
        float limb = clamp(dot(vNormal, vViewDir), 0.0, 1.0);
        plasma *= mix(0.18, 1.0, pow(limb, 0.45));

        // Chromosphere rim: hot blue-white edge
        float rim = pow(clamp(1.0 - limb, 0.0, 1.0), 2.8);
        vec3 chromosphere = vec3(1.0, 0.95, 0.85) * rim * 2.5;

        // Unread: shift toward brighter, more orange-white
        plasma = mix(plasma, vec3(1.0, 0.5, 0.05), unreadIntensity * 0.35);

        vec3 final = plasma + chromosphere;
        // Intensify when many unread
        final *= 1.0 + unreadIntensity * 0.8;

        gl_FragColor = vec4(final, 1.0);
      }
    `,
  }), [])

  // Expose mat ref
  shaderRef.current = mat

  useFrame(({ clock }) => {
    mat.uniforms.time.value = clock.getElapsedTime()
    // Lerp toward target unread intensity
    const target = unreadIntensity.current
    mat.uniforms.unreadIntensity.value += (target - mat.uniforms.unreadIntensity.value) * 0.02
  })

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[8, 64, 64]} />
      <primitive object={mat} attach="material" />
    </mesh>
  )
}

// Corona halos: inner, middle, outer
function CoronaHalos({ unreadIntensity }) {
  const innerRef  = useRef()
  const middleRef = useRef()
  const outerRef  = useRef()

  const innerTex  = useMemo(() => makeHaloTex('rgba(255,252,180,0.95)', 'rgba(255,210,80,0.4)',  256), [])
  const middleTex = useMemo(() => makeHaloTex('rgba(255,140,20,0.8)',  'rgba(255,80,10,0.2)',   256), [])
  const outerTex  = useMemo(() => makeHaloTex('rgba(255,50,10,0.7)',   'rgba(180,20,0,0.1)',    256), [])

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()
    const unread = unreadIntensity.current

    // Middle corona pulse: scale 1.0x–1.05x, 3s loop
    if (middleRef.current) {
      const s = 1.0 + 0.03 * Math.sin(t * (2.1 + unread * 1.5))
      middleRef.current.scale.setScalar(s)
    }

    // Drive opacity by unread count
    if (innerRef.current?.material) {
      innerRef.current.material.opacity = 0.55 + unread * 0.4
    }
    if (middleRef.current?.material) {
      middleRef.current.material.opacity = 0.22 + unread * 0.35
    }
    if (outerRef.current?.material) {
      outerRef.current.material.opacity = 0.07 + unread * 0.20
      // Shift halo color to white-gold at max unread
      if (unread > 0.7) {
        outerRef.current.material.color.setRGB(
          1.0,
          0.9 + unread * 0.1,
          0.5 + unread * 0.5
        )
      }
    }
  })

  return (
    <>
      {/* Inner corona: tight white-hot */}
      <mesh ref={innerRef}>
        <sphereGeometry args={[9.2, 32, 32]} />
        <meshBasicMaterial
          map={innerTex}
          transparent depthWrite={false}
          blending={THREE.AdditiveBlending}
          opacity={0.55}
          side={THREE.BackSide}
        />
      </mesh>

      {/* Middle corona: amber-gold, pulsing */}
      <mesh ref={middleRef}>
        <sphereGeometry args={[12, 32, 32]} />
        <meshBasicMaterial
          map={middleTex}
          transparent depthWrite={false}
          blending={THREE.AdditiveBlending}
          opacity={0.22}
          side={THREE.BackSide}
        />
      </mesh>

      {/* Outer magnetosphere: deep orange-red, large soft */}
      <mesh ref={outerRef}>
        <sphereGeometry args={[18, 32, 32]} />
        <meshBasicMaterial
          map={outerTex}
          transparent depthWrite={false}
          blending={THREE.AdditiveBlending}
          opacity={0.07}
          side={THREE.BackSide}
        />
      </mesh>
    </>
  )
}

// Solar Flare: procedural arc spike
function SolarFlare({ position, direction, onDone }) {
  const ref = useRef()
  const matRef = useRef()
  const lifeRef = useRef(0)
  const durRef = useRef(1.2 + Math.random() * 0.8)

  const mat = useMemo(() => new THREE.MeshBasicMaterial({
    color: new THREE.Color(1.0, 0.55, 0.05),
    transparent: true,
    opacity: 1,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  }), [])

  matRef.current = mat

  useFrame((_, delta) => {
    lifeRef.current += delta
    const p = lifeRef.current / durRef.current
    if (p >= 1) { onDone?.(); return }

    // Arc animation: spikes grow then fade
    const grow = Math.sin(p * Math.PI)
    if (ref.current) {
      ref.current.scale.set(grow * 0.6, 1 + grow * 1.4, grow * 0.6)
    }
    mat.opacity = grow * 0.9
  })

  return (
    <mesh
      ref={ref}
      position={position}
      onBeforeRender={self => self.lookAt(direction.clone().multiplyScalar(22))}
      material={mat}
    >
      <coneGeometry args={[0.35, 16, 6]} />
    </mesh>
  )
}

// Main Sun component
export function Sun({ unreadLetterCount = 0 }) {
  const shaderRef = useRef({})
  const unreadIntensity = useRef(0)
  const flareTimerRef = useRef(8 + Math.random() * 5)
  const flaresRef = useRef([])

  // Lerp toward target
  useFrame((_, delta) => {
    const target = Math.min(unreadLetterCount / 12, 1)
    unreadIntensity.current += (target - unreadIntensity.current) * delta * 0.4

    // Flare spawning
    flareTimerRef.current -= delta
    const interval = unreadIntensity.current > 0.7 ? 3 : (8 + Math.random() * 7)
    if (flareTimerRef.current <= 0) {
      flareTimerRef.current = interval
      const theta = Math.random() * Math.PI * 2
      const phi   = Math.acos(2 * Math.random() - 1)
      const dir = new THREE.Vector3(
        Math.sin(phi) * Math.cos(theta),
        Math.sin(phi) * Math.sin(theta),
        Math.cos(phi)
      )
      const id = Date.now() + Math.random()
      flaresRef.current = [...flaresRef.current, {
        id,
        pos: dir.clone().multiplyScalar(8.5),
        dir,
      }]
    }
  })

  const removeFlare = (id) => {
    flaresRef.current = flaresRef.current.filter(f => f.id !== id)
  }

  return (
    <group>
      {/* Point light from sun — no shadow artifacts */}
      <pointLight
        position={[0, 0, 0]}
        intensity={5.0}
        color={0xFFF5E0}
        distance={900}
        decay={1.2}
      />
      {/* Soft warm ambient fill */}
      <ambientLight intensity={0.18} color={0x1a1530} />

      {/* Solar core */}
      <SunCore shaderRef={shaderRef} unreadIntensity={unreadIntensity} />

      {/* Halos */}
      <CoronaHalos unreadIntensity={unreadIntensity} />
    </group>
  )
}
