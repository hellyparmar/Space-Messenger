import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useTexture } from '@react-three/drei'

function makeSpriteTexture(size = 64) {
  const cv = document.createElement('canvas')
  cv.width = cv.height = size
  const ctx = cv.getContext('2d')
  const g = ctx.createRadialGradient(size/2, size/2, 0, size/2, size/2, size/2)
  g.addColorStop(0,   'rgba(255,255,255,1)')
  g.addColorStop(0.2, 'rgba(255,255,255,0.85)')
  g.addColorStop(0.5, 'rgba(200,220,255,0.25)')
  g.addColorStop(1,   'rgba(0,0,0,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, size, size)
  return new THREE.CanvasTexture(cv)
}

export function Starfield() {
  const matRef = useRef()
  const starSpriteTex = useMemo(() => makeSpriteTexture(), [])
  const texture = useTexture('/textures/2k_stars.jpg')

  const { geometry, material } = useMemo(() => {
    const N = 6000
    const positions = new Float32Array(N * 3)
    const sizes = new Float32Array(N)
    const colors = new Float32Array(N * 3)
    const offsets = new Float32Array(N)

    const palette = [
      new THREE.Color(0xFFDDAA),
      new THREE.Color(0xFFCC88),
      new THREE.Color(0xFFAA66),
      new THREE.Color(0xFFFFFF),
      new THREE.Color(0xFFE87C),
      new THREE.Color(0xB0C8FF),
      new THREE.Color(0xFF8855),
    ]
    const weights = [0.25, 0.20, 0.18, 0.15, 0.10, 0.07, 0.05]
    const RADIUS = 1500

    for (let i = 0; i < N; i++) {
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      const r = 50 + RADIUS * Math.cbrt(Math.random())
      positions[i * 3]     = r * Math.sin(phi) * Math.cos(theta)
      positions[i * 3 + 1] = r * Math.cos(phi)
      positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta)
      sizes[i] = 0.3 + Math.random() * 1.8
      offsets[i] = Math.random() * Math.PI * 2
      let rnd = Math.random(), cum = 0, col = palette[0]
      for (let w = 0; w < weights.length; w++) {
        cum += weights[w]
        if (rnd < cum) { col = palette[w]; break }
      }
      colors[i * 3] = col.r
      colors[i * 3 + 1] = col.g
      colors[i * 3 + 2] = col.b
    }

    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geo.setAttribute('aSize',    new THREE.BufferAttribute(sizes, 1))
    geo.setAttribute('aColor',   new THREE.BufferAttribute(colors, 3))
    geo.setAttribute('aOffset',  new THREE.BufferAttribute(offsets, 1))

    const mat = new THREE.ShaderMaterial({
      uniforms: {
        time:         { value: 0 },
        pointTexture: { value: starSpriteTex },
      },
      vertexShader: `
        attribute float aSize;
        attribute vec3  aColor;
        attribute float aOffset;
        uniform   float time;
        varying   vec3  vColor;
        varying   float vOpacity;
        void main() {
          vColor = aColor;
          float t1 = sin(time * 1.1 + aOffset);
          float t2 = sin(time * 1.9 + aOffset * 2.3);
          float twinkle = 0.5 + 0.5 * (t1 * 0.7 + t2 * 0.3);
          vOpacity = 0.25 + 0.75 * twinkle;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = aSize * (250.0 / -mv.z);
          gl_Position  = projectionMatrix * mv;
        }
      `,
      fragmentShader: `
        uniform sampler2D pointTexture;
        varying vec3  vColor;
        varying float vOpacity;
        void main() {
          vec4 tex = texture2D(pointTexture, gl_PointCoord);
          float alpha = tex.r * vOpacity;
          if (alpha < 0.01) discard;
          gl_FragColor = vec4(vColor, alpha);
        }
      `,
      transparent: true,
      depthWrite:  false,
      blending:    THREE.AdditiveBlending,
    })
    return { geometry: geo, material: mat }
  }, [starSpriteTex])

  useFrame(({ clock }) => {
    if (matRef.current) matRef.current.uniforms.time.value = clock.getElapsedTime()
  })

  return (
    <group>
      <mesh rotation={[0, 0, 0]}>
        <sphereGeometry args={[2000, 32, 32]} />
        <meshBasicMaterial
          map={texture}
          side={THREE.BackSide}
          transparent
          opacity={0.45}
        />
      </mesh>
      <points
        ref={r => { if (r) matRef.current = r.material }}
        geometry={geometry}
        material={material}
      />
    </group>
  )
}

export function SpiralArms() {
  return null
}

export function MilkyWayBand() {
  const groupRef = useRef()
  const starSpriteTex = useMemo(() => makeSpriteTexture(), [])
  const galaxyTex = useTexture('/textures/2k_stars_milky_way.jpg', (t) => {
    t.wrapS = t.wrapT = THREE.RepeatWrapping
  })

  const starGeo = useMemo(() => {
    const N = 25000
    const pos = new Float32Array(N * 3)
    const cols = new Float32Array(N * 3)
    const sizes = new Float32Array(N)

    const warm = [
      new THREE.Color(1.0, 0.82, 0.50),
      new THREE.Color(1.0, 0.75, 0.45),
      new THREE.Color(1.0, 0.88, 0.62),
      new THREE.Color(0.95, 0.70, 0.40),
    ]
    const solar = new THREE.Color(1.0, 0.92, 0.72)
    const white = new THREE.Color(1.0, 1.0, 1.0)
    const blue = new THREE.Color(0.72, 0.80, 1.0)

    const GALAXY_RADIUS = 650
    const DISK_HALF = 12
    const BULGE_RADIUS = 70
    const BAR_LENGTH = 180

    for (let i = 0; i < N; i++) {
      const region = Math.random()
      let x, y, z, r, theta, col

      if (region < 0.12) {
        const r = BULGE_RADIUS * Math.cbrt(Math.random())
        const theta = Math.random() * Math.PI * 2
        const phi = Math.acos(2 * Math.random() - 1)
        x = r * Math.sin(phi) * Math.cos(theta)
        y = r * Math.cos(phi) * 0.5
        z = r * Math.sin(phi) * Math.sin(theta)
        col = warm[Math.floor(Math.random() * warm.length)]
      } else if (region < 0.20) {
        const t = BAR_LENGTH * (Math.random() * 2 - 1)
        const spread = 25 * Math.sqrt(Math.max(0, 1 - (t * t) / (BAR_LENGTH * BAR_LENGTH)))
        const angle = 0.4
        const c = Math.cos(angle), s = Math.sin(angle)
        const lx = t, ly = (Math.random() - 0.5) * spread * 0.5, lz = (Math.random() - 0.5) * spread
        x = lx * c - lz * s
        y = ly
        z = lx * s + lz * c
        col = warm[Math.floor(Math.random() * warm.length)]
      } else if (region < 0.80) {
        const arm = Math.floor(Math.random() * 2)
        const armAngle = arm * Math.PI
        r = 20 + GALAXY_RADIUS * Math.pow(Math.random(), 0.55)
        const spiral = armAngle + 0.5 * Math.log(r + 1)
        const scatter = (Math.random() - 0.5) * 0.28 * (0.15 + 0.85 * r / GALAXY_RADIUS)
        theta = spiral + scatter
        const flare = 0.2 + 0.8 * Math.pow(r / GALAXY_RADIUS, 1.3)
        y = (Math.random() - 0.5) * DISK_HALF * flare
        const warp = 4 * Math.sin(r / GALAXY_RADIUS * Math.PI * 2)
        y += warp
        x = r * Math.cos(theta)
        z = r * Math.sin(theta)
        const colR = Math.random()
        if (colR < 0.65) col = warm[Math.floor(Math.random() * warm.length)]
        else if (colR < 0.80) col = solar
        else if (colR < 0.92) col = white
        else col = blue
      } else if (region < 0.90) {
        r = 50 + GALAXY_RADIUS * Math.sqrt(Math.random())
        theta = Math.random() * Math.PI * 2
        y = (Math.random() - 0.5) * DISK_HALF * 3
        x = r * Math.cos(theta)
        z = r * Math.sin(theta)
        col = warm[Math.floor(Math.random() * warm.length)]
      } else {
        r = 100 + GALAXY_RADIUS * 1.5 * Math.cbrt(Math.random())
        theta = Math.random() * Math.PI * 2
        const phi = Math.acos(2 * Math.random() - 1)
        x = r * Math.sin(phi) * Math.cos(theta)
        y = r * Math.cos(phi) * 0.3
        z = r * Math.sin(phi) * Math.sin(theta)
        col = warm[Math.floor(Math.random() * warm.length)]
      }

      pos[i * 3]     = x
      pos[i * 3 + 1] = y
      pos[i * 3 + 2] = z
      const coreDist = Math.sqrt(x * x + z * z) / GALAXY_RADIUS
      const sizeMul = coreDist < 0.15 ? 1.4 : 1.0
      sizes[i] = (0.15 + Math.random() * 1.2) * sizeMul
      cols[i * 3]     = col.r
      cols[i * 3 + 1] = col.g
      cols[i * 3 + 2] = col.b
    }

    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    geo.setAttribute('aColor', new THREE.BufferAttribute(cols, 3))
    geo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1))
    return geo
  }, [])

  const diskMat = useMemo(() => new THREE.ShaderMaterial({
    uniforms: {
      time:         { value: 0 },
      galaxyTexture: { value: galaxyTex },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform sampler2D galaxyTexture;
      uniform float time;
      varying vec2 vUv;

      float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
      }

      float noise(vec2 p) {
        vec2 i = floor(p), f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        return mix(
          mix(hash(i), hash(i + vec2(1,0)), f.x),
          mix(hash(i + vec2(0,1)), hash(i + vec2(1,1)), f.x),
          f.y
        );
      }

      float fbm(vec2 p) {
        float v = 0.0, a = 0.5;
        for (int i = 0; i < 5; i++) {
          v += a * noise(p);
          p *= 2.3;
          a *= 0.45;
        }
        return v;
      }

      void main() {
        vec2 centered = vUv - 0.5;
        float radius = length(centered) * 2.0;
        float angle = atan(centered.y, centered.x);
        if (angle < 0.0) angle += 6.2832;

        float spiralAngle = angle + 5.5 * radius;

        float core = exp(-radius * 8.0);
        float coreHalo = exp(-radius * 3.0) * 0.35;

        float arm1 = pow(max(0.0, 1.0 - abs(sin(spiralAngle)) * 0.65), 8.0);
        float arm2 = pow(max(0.0, 1.0 - abs(sin(spiralAngle + 3.1416)) * 0.65), 8.0);
        float arms = clamp(arm1 + arm2, 0.0, 1.0);

        vec2 dustUV = vUv * 30.0 + vec2(spiralAngle * 0.5, 0.0);
        float dustRaw = fbm(dustUV);
        float dustLane = smoothstep(0.4, 0.65, dustRaw) * (1.0 - smoothstep(0.0, 0.85, radius));

        float starNoise = fbm(vUv * 40.0 + time * 0.001);
        float fineNoise = fbm(vUv * 80.0 - time * 0.002) * 0.25;

        float density = core + arms * 0.28 + starNoise * 0.12 + fineNoise;
        density *= (1.0 - dustLane * 0.8);
        density += coreHalo;

        float diskEdge = 1.0 - smoothstep(0.0, 1.0, radius);
        density *= pow(diskEdge, 0.4);

        vec4 texel = texture2D(galaxyTexture, vUv * 1.5 - 0.25);
        density += (texel.r * 0.06 + texel.g * 0.03);

        vec3 coreCol  = vec3(1.0, 0.82, 0.48);
        vec3 innerCol = vec3(0.90, 0.80, 0.62);
        vec3 midCol   = vec3(0.72, 0.68, 0.80);
        vec3 edgeCol  = vec3(0.48, 0.52, 1.0);
        vec3 dustCol  = vec3(0.15, 0.08, 0.05);

        float t = smoothstep(0.0, 1.0, radius);
        vec3 starCol = mix(coreCol, mix(innerCol, mix(midCol, edgeCol, t), t), t);
        vec3 col = mix(dustCol, starCol, density);

        col += vec3(0.6, 0.25, 0.08) * dustLane * 0.04;
        col += vec3(1.0, 0.7, 0.3) * core * 0.35;

        float alpha = density * 0.10 + core * 0.40;
        alpha = clamp(alpha, 0.0, 0.55);

        gl_FragColor = vec4(col, alpha);
      }
    `,
    transparent: true,
    depthWrite:  false,
    blending:    THREE.NormalBlending,
    side:        THREE.DoubleSide,
  }), [galaxyTex])

  const starMat = useMemo(() => new THREE.ShaderMaterial({
    uniforms: {
      pointTexture: { value: starSpriteTex },
    },
    vertexShader: `
      attribute float aSize;
      attribute vec3  aColor;
      varying vec3  vColor;
      void main() {
        vColor = aColor;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = aSize * (280.0 / -mv.z);
        gl_Position  = projectionMatrix * mv;
      }
    `,
    fragmentShader: `
      uniform sampler2D pointTexture;
      varying vec3  vColor;
      void main() {
        vec4 tex = texture2D(pointTexture, gl_PointCoord);
        float alpha = tex.r;
        if (alpha < 0.01) discard;
        gl_FragColor = vec4(vColor, alpha * 0.7);
      }
    `,
    transparent: true,
    depthWrite:  false,
    blending:    THREE.AdditiveBlending,
  }), [starSpriteTex])

  useFrame(({ clock }) => {
    if (groupRef.current) {
      groupRef.current.rotation.z += 0.00004
    }
    if (diskMat) {
      diskMat.uniforms.time.value = clock.getElapsedTime()
    }
  })

  return (
    <group
      ref={groupRef}
      rotation={[Math.PI / 6, 0.35, 0]}
    >
      <mesh geometry={new THREE.CircleGeometry(700, 64)} material={diskMat} />
      <points geometry={starGeo} material={starMat} />
    </group>
  )
}

export function Nebulae() {
  return null
}

export function GalacticCore() {
  const coreTex = useMemo(() => {
    const S = 256
    const cv = document.createElement('canvas')
    cv.width = cv.height = S
    const ctx = cv.getContext('2d')

    const g = ctx.createRadialGradient(S/2, S/2, 0, S/2, S/2, S/2)
    g.addColorStop(0,   'rgba(255,242,215,1)')
    g.addColorStop(0.03, 'rgba(255,228,195,0.95)')
    g.addColorStop(0.08, 'rgba(250,205,165,0.60)')
    g.addColorStop(0.18, 'rgba(210,185,155,0.22)')
    g.addColorStop(0.35, 'rgba(145,150,175,0.07)')
    g.addColorStop(1,    'rgba(0,0,0,0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, S, S)

    const id = ctx.getImageData(0, 0, S, S)
    const da = id.data
    for (let y = 0; y < S; y++) {
      for (let x = 0; x < S; x++) {
        const pi = (y * S + x) * 4
        const dx = x - S/2, dy = y - S/2
        const dist = Math.sqrt(dx*dx + dy*dy) / (S/2)
        const nv = Math.sin(x * 0.25 + y * 0.18) * Math.cos(y * 0.22 - x * 0.12) * 0.2 + 0.8
        const falloff = Math.exp(-dist * dist * 4.0)
        da[pi + 3] = Math.round(da[pi + 3] * nv * falloff)
      }
    }
    ctx.putImageData(id, 0, 0)
    return new THREE.CanvasTexture(cv)
  }, [])

  return (
    <group rotation={[Math.PI / 6, 0.35, 0]}>
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[45, 24, 24]} />
        <meshBasicMaterial
          color={0xffd5a0}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          opacity={0.65}
        />
      </mesh>
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[80, 24, 24]} />
        <meshBasicMaterial
          map={coreTex}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          opacity={0.35}
        />
      </mesh>
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[160, 24, 24]} />
        <meshBasicMaterial
          map={coreTex}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          opacity={0.12}
        />
      </mesh>
    </group>
  )
}

export function SpaceDust() {
  const matRef = useRef()
  const { geo, mat } = useMemo(() => {
    const N = 2000
    const pos = new Float32Array(N * 3)
    const sz  = new Float32Array(N)
    for (let i = 0; i < N; i++) {
      const r = 20 + Math.random() * 300
      const theta = Math.random() * Math.PI * 2
      const flare = 0.2 + 0.8 * (r / 300)
      pos[i * 3]     = Math.cos(theta) * r
      pos[i * 3 + 1] = (Math.random() - 0.5) * 40 * flare
      pos[i * 3 + 2] = Math.sin(theta) * r
      sz[i] = 0.02 + Math.random() * 0.12
    }
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    geo.setAttribute('aSize',    new THREE.BufferAttribute(sz, 1))
    const mat = new THREE.ShaderMaterial({
      uniforms: { time: { value: 0 } },
      vertexShader: `
        attribute float aSize;
        uniform float time;
        varying float vAlpha;
        void main() {
          vec3 p = position;
          p.x += sin(time * 0.08 + position.z * 0.02) * 1.0;
          p.y += cos(time * 0.06 + position.x * 0.015) * 0.5;
          p.z += sin(time * 0.07 + position.y * 0.015) * 0.8;
          vAlpha = 0.08 + 0.12 * sin(time * 0.30 + position.x * 0.06);
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_PointSize = aSize * (160.0 / -mv.z);
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: `
        varying float vAlpha;
        void main() {
          vec2 uv = gl_PointCoord - 0.5;
          float d = length(uv);
          if (d > 0.5) discard;
          float a = smoothstep(0.5, 0.0, d) * vAlpha;
          gl_FragColor = vec4(0.85, 0.75, 0.6, a);
        }
      `,
      transparent: true,
      depthWrite:  false,
      blending:    THREE.AdditiveBlending,
    })
    return { geo, mat }
  }, [])

  useFrame(({ clock }) => {
    mat.uniforms.time.value = clock.getElapsedTime()
  })

  return <points geometry={geo} material={mat} />
}
