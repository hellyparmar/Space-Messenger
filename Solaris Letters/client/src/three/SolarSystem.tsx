/* eslint-disable */
import React, { useRef, useEffect, createContext, useContext, Suspense, useState, useMemo, useCallback } from 'react';
import { Canvas, useLoader, useFrame, useThree } from '@react-three/fiber';
import { CameraControls, Stars, Html } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';
import { TextureLoader } from 'three';
import { useAppStore } from '../store/useAppStore';

import { getCircleTexture } from '../utils/particleTexture';

// ─── CAMERA CONTEXT ─────────────────────────────────────────────────────────
const CameraContext = createContext<React.RefObject<CameraControls | null>>({ current: null });
export const useCamera = () => useContext(CameraContext);

// ─── BACKGROUND LAYERS ──────────────────────────────────────────────────────
function SpaceBackground() {
  const skyTexture = useLoader(TextureLoader, '/textures/2k_stars_milky_way.jpg');
  useEffect(() => { if (skyTexture) skyTexture.colorSpace = THREE.SRGBColorSpace; }, [skyTexture]);

  const skyboxRef = useRef<THREE.Group>(null!);
  const starsRef = useRef<any>(null!);

  useFrame(({ camera, clock }) => {
    if (skyboxRef.current) {
      skyboxRef.current.position.copy(camera.position);
    }
    if (starsRef.current) {
      const time = clock.elapsedTime;
      const sizes = starsRef.current.geometry.attributes.size;
      for (let i = 0; i < sizes.count; i++) {
        sizes.array[i] = 0.5 + Math.sin(time * 2 + i * 0.5) * 0.3;
      }
      sizes.needsUpdate = true;
    }
  });

  return (
    <group ref={skyboxRef}>
      <Stars ref={starsRef} radius={500000} depth={100} count={15000} factor={6} saturation={0.3} fade={false} speed={0.3} />
      <mesh scale={[-1, 1, 1]}>
        <sphereGeometry args={[800000, 64, 64]} />
        <meshBasicMaterial map={skyTexture} side={THREE.BackSide} depthWrite={false} />
      </mesh>
    </group>
  );
}

// ─── DYNAMIC COSMIC COMETS BACKGROUND ─────────────────────────────────────────
function Comets() {
  const count = 4; // Active comet slots (lowered for a cleaner look)
  const lineRefs = useRef<(THREE.LineSegments | null)[]>([]);

  // Pre-generate comet parameters for speed and visual variety
  const cometsData = useMemo(() => {
    const data = [];
    for (let i = 0; i < count; i++) {
      const isGold = Math.random() > 0.6;
      const baseColor = isGold 
        ? new THREE.Color('#ffb300') // Solaris Golden Comet
        : new THREE.Color('#4A9EFF'); // Deep Space Ice Blue Comet

      const length = 40 + Math.random() * 60; // Sleeker, shorter initial length

      data.push({
        position: new THREE.Vector3(),
        direction: new THREE.Vector3(),
        speed: 50 + Math.random() * 60, // Slower graceful speed
        length: length,
        initialLength: length,
        state: 'idle' as 'idle' | 'flying' | 'fading',
        timer: Math.random() * 8, // staggered initial start times
        width: 0.8 + Math.random() * 1.0, // Thinner, more elegant trail
        color: baseColor,
        fadeDuration: 1.0,
      });
    }
    return data;
  }, [count]);

  useFrame((_state, delta) => {
    cometsData.forEach((comet, idx) => {
      const line = lineRefs.current[idx];
      if (!line) return;

      if (comet.state === 'idle') {
        comet.timer -= delta;
        if (comet.timer <= 0) {
          // Re-spawn the comet in the outer system
          comet.state = 'flying';
          
          // Random point on a distant hemisphere facing the solar system
          const angle = Math.random() * Math.PI * 2;
          const radius = 3500 + Math.random() * 1500;
          comet.position.set(
            Math.cos(angle) * radius,
            (Math.random() - 0.5) * 1600 + 500, // floating above/below plane
            Math.sin(angle) * radius
          );

          // Path direction: heading across the screen toward the opposite hemisphere
          comet.direction.set(
            -Math.cos(angle) + (Math.random() - 0.5) * 0.4,
            (Math.random() - 0.5) * 0.2,
            -Math.sin(angle) + (Math.random() - 0.5) * 0.4
          ).normalize();

          comet.speed = 50 + Math.random() * 60; // Slower graceful speed
          const length = 50 + Math.random() * 80;
          comet.length = length;
          comet.initialLength = length;
          comet.fadeDuration = 0.8 + Math.random() * 0.8;
        }
        line.visible = false;
      } else {
        // Move the comet
        comet.position.addScaledVector(comet.direction, comet.speed * delta);

        // Check if we should trigger fadeout
        if (comet.state === 'flying' && comet.position.length() > 4000) {
          comet.state = 'fading';
        }

        // Fade logic: shrink the tail towards the head, and fade the opacity
        if (comet.state === 'fading') {
          comet.length -= (comet.initialLength / comet.fadeDuration) * delta;
          if (comet.length <= 0) {
            comet.length = 0;
            comet.state = 'idle';
            comet.timer = 5 + Math.random() * 10; // delay before next flight
          }
        }

        // Hard boundary safety check
        if (comet.position.length() > 6000) {
          comet.state = 'idle';
          comet.timer = 5 + Math.random() * 10;
        }

        if (comet.state !== 'idle') {
          line.visible = true;

          // Set opacity proportional to current length
          const opacityRatio = comet.initialLength > 0 ? (comet.length / comet.initialLength) : 0;
          if (line.material) {
            (line.material as THREE.LineBasicMaterial).opacity = opacityRatio * 0.85;
          }

          // Update the line coordinates for the fading trail
          const positions = line.geometry.attributes.position.array as Float32Array;
          
          // Head (Point A)
          positions[0] = comet.position.x;
          positions[1] = comet.position.y;
          positions[2] = comet.position.z;

          // Tail (Point B: behind the head along negative direction)
          const tailPos = comet.position.clone().addScaledVector(comet.direction, -comet.length);
          positions[3] = tailPos.x;
          positions[4] = tailPos.y;
          positions[5] = tailPos.z;

          line.geometry.attributes.position.needsUpdate = true;
        } else {
          line.visible = false;
        }
      }
    });
  });

  return (
    <group>
      {cometsData.map((comet, idx) => {
        // Create custom geometry for the trail line segment
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(6); // 2 vertices, 3 dimensions
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

        // Color gradient: Head (bright white-core) to Tail (neon base color)
        const colors = new Float32Array([
          1.0, 1.0, 1.0, // White head
          comet.color.r * 0.15, comet.color.g * 0.15, comet.color.b * 0.15 // Fading tail
        ]);
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

        return (
          <lineSegments
            key={idx}
            ref={(el) => { lineRefs.current[idx] = el; }}
            geometry={geometry}
          >
            <lineBasicMaterial
              vertexColors
              transparent
              opacity={0.85}
              blending={THREE.AdditiveBlending}
              linewidth={comet.width}
              depthWrite={false}
            />
          </lineSegments>
        );
      })}
    </group>
  );
}

// ─── 3D VOLUMETRIC NEBULA (particle cloud) ───────────────────────────────────
// Each nebula is ~25,000 tiny sprites scattered in a 3D ellipsoid shaped by
// fractal noise. Sprites always face the camera → truly volumetric from any angle.
function VolumetricNebula({ position, innerColor, outerColor, scale }: any) {
  const [px, py, pz] = position as number[];

  const puffTex = useMemo(() => {
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const ctx = c.getContext('2d')!;
    const g = ctx.createRadialGradient(32,32,0, 32,32,32);
    g.addColorStop(0,   'rgba(255,255,255,1)');
    g.addColorStop(0.35,'rgba(255,255,255,0.55)');
    g.addColorStop(0.7, 'rgba(255,255,255,0.12)');
    g.addColorStop(1,   'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.fillRect(0,0,64,64);
    return new THREE.CanvasTexture(c);
  }, []);

  // Seeded pseudo-random so it doesn't regenerate on re-render
  const { positions, colors, sizes } = useMemo(() => {
    const N = 25000;
    const pos  = new Float32Array(N * 3);
    const col  = new Float32Array(N * 3);
    const sz   = new Float32Array(N);
    const inner = new THREE.Color(innerColor);
    const outer = new THREE.Color(outerColor);
    // H-alpha pink and teal for emission regions
    const halpha = new THREE.Color(1.0, 0.18, 0.55);
    const teal   = new THREE.Color(0.08, 0.88, 0.82);

    let seed = 42;
    const rng = () => { seed = (seed * 16807 + 0) % 2147483647; return (seed - 1) / 2147483646; };

    for (let i = 0; i < N; i++) {
      // 3D ellipsoidal distribution — thick in XZ, thinner in Y
      const r     = Math.pow(rng(), 1.6) * scale * 0.5;
      const theta = rng() * Math.PI * 2;
      const phi   = Math.acos(2 * rng() - 1);
      const ex    = 1.0 + rng() * 0.6;  // x elongation
      const ey    = 0.28 + rng() * 0.2; // y compression (flat but 3D)
      const ez    = 1.0 + rng() * 0.6;

      // cluster particles using noise approximation (large-scale clumping)
      const nx = Math.sin(r * 0.008 + 1.3) * Math.cos(theta * 2.1);
      const clump = 0.4 + 0.6 * Math.abs(nx);

      pos[i*3]   = Math.sin(phi) * Math.cos(theta) * r * ex;
      pos[i*3+1] = Math.cos(phi) * r * ey;
      pos[i*3+2] = Math.sin(phi) * Math.sin(theta) * r * ez;

      // Size: core particles small+bright, outer large+diffuse
      const t = r / (scale * 0.5);
      sz[i] = (scale * 0.065 * (0.5 + rng() * 1.0) * (1.8 - t * 0.9)) * clump;

      // Color: inner→outer gradient + H-alpha/teal emission pockets
      const c = new THREE.Color().lerpColors(inner, outer, t);
      const isEmission = rng() < 0.08 && t < 0.55;
      const isTeal     = rng() < 0.06 && t > 0.35;
      if (isEmission) c.lerp(halpha, 0.7);
      else if (isTeal) c.lerp(teal, 0.6);
      col[i*3] = c.r; col[i*3+1] = c.g; col[i*3+2] = c.b;
    }
    return { positions: pos, colors: col, sizes: sz };
  }, [innerColor, outerColor, scale]);

  const matRef  = useRef<THREE.PointsMaterial>(null!);
  const groupRef = useRef<THREE.Group>(null!);

  useFrame(({ camera }) => {
    const dist = camera.position.length();
    // Decorative nebulae only appear when zoomed out to galaxy scale
    const op = THREE.MathUtils.smoothstep(dist, 800, 1800);
    if (matRef.current) matRef.current.opacity = op * 0.95;
  });

  return (
    <group ref={groupRef} position={[px, py, pz]}>
      <points>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} count={25000} array={positions} itemSize={3} />
          <bufferAttribute attach="attributes-color"    args={[colors, 3]} count={25000} array={colors}    itemSize={3} />
          <bufferAttribute attach="attributes-size"     args={[sizes, 1]} count={25000} array={sizes}     itemSize={1} />
        </bufferGeometry>
        <pointsMaterial
          ref={matRef}
          map={puffTex}
          vertexColors
          size={1}
          sizeAttenuation
          transparent
          opacity={0}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          alphaTest={0.002}
          onBeforeCompile={(shader) => {
            // Enable per-vertex point size from attributes-size
            shader.vertexShader = shader.vertexShader.replace(
              'gl_PointSize = size;',
              'gl_PointSize = size * ( 300.0 / - mvPosition.z );'
            );
          }}
        />
      </points>
    </group>
  );
}



// ─── CINEMATIC INTERSTELLAR BLACK HOLE ────────────────────────────────────────
// References: Interstellar (2014), NASA GSFC ray-traced simulations
// Architecture:
//   1. Wide soft corona glow (sprite)
//   2. Accretion disc — custom GLSL shader on plane, correct ring in polar coords
//      animated Doppler shift, turbulent streamlines, thermal gradient
//   3. Event horizon sphere (depthWrite=true) — correctly occludes disc behind it
//   4. Gravitational lensing arc (half-torus, depthTest=false) — always in front,
//      represents back of disc bent over the top by gravity
//   5. Photon ring sprite — tight bright halo

const BH_VERT = `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }
`;

// Main accretion disc — full thermal gradient, Doppler, streamlines
const BH_DISC_FRAG = `
uniform float uTime;
uniform float uOpacity;
uniform vec3 uColor;
uniform bool uUseCustomColor;
varying vec2 vUv;

float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){
  vec2 i=floor(p);vec2 f=fract(p);vec2 u=f*f*(3.0-2.0*f);
  return mix(mix(hash(i),hash(i+vec2(1,0)),u.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),u.x),u.y);
}
float fbm(vec2 p){float v=0.0,a=0.55;for(int i=0;i<6;i++){v+=a*noise(p);p=p*2.1+vec2(3.7,1.5);a*=0.48;}return v;}

void main() {
  vec2 uv  = vUv - 0.5;
  float r  = length(uv);
  float ang = atan(uv.y, uv.x);

  // Ring band — narrow bright inner photon zone, wide thermal outer disc
  float inner = 0.108;
  float outer = 0.465;
  float band  = smoothstep(inner-0.004, inner+0.018, r) *
                smoothstep(outer+0.006, outer-0.08, r);
  if(band < 0.001) discard;

  float t = clamp((r - inner) / (outer - inner), 0.0, 1.0);

  // Keplerian streamlines — gas orbits faster at small r (purely in shader, no geometry spin)
  float angVel = 0.25 / max(r * 6.0, 0.08);
  float stream = ang + uTime * angVel;
  float turb1  = fbm(vec2(r * 9.0, stream * 2.2));
  float turb2  = fbm(vec2(r * 4.5 + 3.1, stream * 0.9 + 1.7));
  float turb   = turb1 * 0.6 + turb2 * 0.4;

  // ── Concentric bright banding (like real disc striations) ──────────────────
  float stripe = 0.5 + 0.5 * sin((r - inner) / (outer - inner) * 28.0);
  turb = mix(turb, turb * stripe, 0.25);

  // ── Thermal gradient or Custom color gradient ──────────────────────────────
  vec3 col;
  if (uUseCustomColor) {
    vec3 brightCore = vec3(1.0, 1.0, 1.0);
    vec3 midColor = uColor;
    vec3 outerColor = uColor * 0.15;
    if (t < 0.15) {
      col = mix(brightCore, midColor, t / 0.15);
    } else {
      col = mix(midColor, outerColor, (t - 0.15) / 0.85);
    }
  } else {
    if      (t < 0.05) col = mix(vec3(1.00,1.00,0.98), vec3(1.00,0.92,0.65), t/0.05);
    else if (t < 0.20) col = mix(vec3(1.00,0.92,0.65), vec3(1.00,0.70,0.10), (t-0.05)/0.15);
    else if (t < 0.45) col = mix(vec3(1.00,0.70,0.10), vec3(0.98,0.30,0.02), (t-0.20)/0.25);
    else if (t < 0.72) col = mix(vec3(0.98,0.30,0.02), vec3(0.60,0.08,0.01), (t-0.45)/0.27);
    else               col = mix(vec3(0.60,0.08,0.01), vec3(0.12,0.01,0.00), (t-0.72)/0.28);
  }

  // ── Photon ring — ultra-sharp bright halo at innermost edge ────────────────
  float pRing1 = exp(-abs(r - inner - 0.008) * 130.0);  // primary photon ring
  float pRing2 = exp(-abs(r - inner - 0.022) * 80.0);   // secondary lensed image
  vec3 pCol1 = uUseCustomColor ? mix(vec3(1.0, 0.98, 0.95), uColor, 0.4) : vec3(1.00,0.97,0.85);
  vec3 pCol2 = uUseCustomColor ? mix(vec3(1.0, 0.92, 0.80), uColor, 0.4) : vec3(1.00,0.85,0.55);
  col += pCol1 * pRing1 * 6.0;
  col += pCol2 * pRing2 * 2.5;

  // ── Relativistic Doppler — approaching side brighter, bluer, hotter ────────
  // Static asymmetry (no geometry spin): left side approaches, right recedes
  float dop = 0.35 + 0.90 * (sin(ang) * 0.5 + 0.5);
  col *= pow(dop, 1.8);           // beaming: I ∝ dop^4 approx; use 1.8 for cinematic feel
  if (uUseCustomColor) {
    col += uColor * max(0.0, sin(ang)) * 0.18;
  } else {
    col.b += max(0.0, sin(ang)) * 0.22;
  }

  // ── Gas turbulence brightness ───────────────────────────────────────────────
  col *= 0.50 + turb * 0.80;

  // ── Bright accretion knots ──────────────────────────────────────────────────
  float knots = smoothstep(0.80, 1.0, turb1) * 2.8 * (1.0 - t * 0.8);
  col += col * knots;

  // Smooth outer edge fade
  float edgeFade = smoothstep(outer + 0.004, outer - 0.08, r);
  float alpha    = band * edgeFade * uOpacity;
  gl_FragColor   = vec4(col, alpha);
}
`;



function InterstellarBlackHole() {
  const P: [number,number,number] = [4000, -600, 2500];
  const R = 500; // Schwarzschild radius — massive cinematic scale
  const setBlackholeOpen = useAppStore(s => s.setBlackholeOpen);

  // ── Textures (sprites) ──────────────────────────────────────────────────────
  // Wide ambient corona (soft warm haze)
  const coronaTex = useMemo(() => {
    const c = document.createElement('canvas'); c.width = c.height = 512;
    const ctx = c.getContext('2d')!;
    const g = ctx.createRadialGradient(256,256,0, 256,256,256);
    g.addColorStop(0.00, 'rgba(255,210,100,0.60)');
    g.addColorStop(0.18, 'rgba(255,140,30,0.28)');
    g.addColorStop(0.42, 'rgba(200,60,8,0.10)');
    g.addColorStop(0.70, 'rgba(100,15,2,0.04)');
    g.addColorStop(1.00, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.fillRect(0,0,512,512);
    return new THREE.CanvasTexture(c);
  }, []);

  // Photon ring halo (tight bright ring sprite)
  const photonTex = useMemo(() => {
    const c = document.createElement('canvas'); c.width = c.height = 512;
    const ctx = c.getContext('2d')!;
    // Annular ring — transparent centre + outer, bright at ring radius
    const ringR = 0.38; // fraction of canvas half
    const N = 512;
    const imgData = ctx.createImageData(N, N);
    for (let y = 0; y < N; y++) {
      for (let x = 0; x < N; x++) {
        const dx = (x - N/2) / (N/2);
        const dy = (y - N/2) / (N/2);
        const r  = Math.sqrt(dx*dx + dy*dy);
        // Bright at ringR, falloff on both sides
        const br = Math.exp(-Math.pow((r - ringR) / 0.032, 2));
        const i  = (y * N + x) * 4;
        imgData.data[i  ] = 255;
        imgData.data[i+1] = Math.floor(220 + 35 * Math.max(0, 1 - r/ringR));
        imgData.data[i+2] = Math.floor(130 + 80 * Math.max(0, 1 - r/ringR));
        imgData.data[i+3] = Math.floor(br * 240);
      }
    }
    ctx.putImageData(imgData, 0, 0);
    return new THREE.CanvasTexture(c);
  }, []);

  // ── Shader uniforms ─────────────────────────────────────────────────────────
  const discUniforms = useMemo(() => ({
    uTime: { value: 0 },
    uOpacity: { value: 0 },
    uColor: { value: new THREE.Color() },
    uUseCustomColor: { value: false }
  }), []);

  // ── Refs ────────────────────────────────────────────────────────────────────
  const discGroupRef = useRef<THREE.Group>(null!);
  const discMatRef   = useRef<THREE.ShaderMaterial>(null!);
  const coronaRef    = useRef<THREE.SpriteMaterial>(null!);
  const photonRef    = useRef<THREE.SpriteMaterial>(null!);

  useFrame(({ camera, clock }) => {
    // Functional blackhole near solar system — visible between dist 200 and 3000
    const op = THREE.MathUtils.smoothstep(camera.position.length(), 200, 3000);
    const t  = clock.elapsedTime;
    // NO geometry spin — disc is static, motion lives entirely inside the shader
    if (discMatRef.current)  { discMatRef.current.uniforms.uTime.value = t;  discMatRef.current.uniforms.uOpacity.value = op; }
    // lensMatRef removed — lens shader unused
    if (coronaRef.current)   coronaRef.current.opacity  = op * 0.90;
    if (photonRef.current)   photonRef.current.opacity  = op * 0.98;
  });

  // Disc plane size: the shader ring occupies inner=0.108..outer=0.465 of half-width
  // So half-width = R * 5.5 / outer ≈ R * 11.8 to reach 5.5 Schwarzschild radii
  const planeSize = R * 12.5;

  return (
    <group>
      {/* ── 1. Wide corona glow (always faces camera) ── */}
      <sprite position={P} scale={[R * 40, R * 40, 1]}>
        <spriteMaterial ref={coronaRef} map={coronaTex} transparent
          blending={THREE.AdditiveBlending} depthWrite={false} opacity={0} />
      </sprite>

      {/* ── 2. Accretion disc — static GLSL shader plane, motion is inside shader ── */}
      <group ref={discGroupRef} position={P} rotation={[Math.PI * 0.10, 0.22, 0.04]}>
        <mesh renderOrder={1}>
          <planeGeometry args={[planeSize, planeSize]} />
          <shaderMaterial
            ref={discMatRef as any}
            vertexShader={BH_VERT}
            fragmentShader={BH_DISC_FRAG}
            uniforms={discUniforms}
            transparent
            depthWrite={false}
            depthTest={true}
            blending={THREE.AdditiveBlending}
            side={THREE.DoubleSide}
          />
        </mesh>
      </group>

      {/* ── 3a. Event horizon solid core ── */}
      <mesh
        position={P}
        renderOrder={2}
      >
        <sphereGeometry args={[R * 0.88, 64, 64]} />
        <meshBasicMaterial color="#000000" depthWrite={true} />
      </mesh>

      {/* ── 3b. Event horizon soft blend layer (Fresnel falloff) ── */}
      <mesh
        position={P}
        renderOrder={3}
        onClick={e => { e.stopPropagation(); setBlackholeOpen(true); }}
        onPointerOver={() => { document.body.style.cursor = 'pointer'; }}
        onPointerOut={() => { document.body.style.cursor = 'default'; }}
      >
        <sphereGeometry args={[R * 1.15, 96, 96]} />
        <shaderMaterial
          vertexShader={`
            varying vec3 vNormal;
            varying vec3 vViewPosition;
            void main() {
              vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
              vNormal = normalize(normalMatrix * normal);
              vViewPosition = -mvPosition.xyz;
              gl_Position = projectionMatrix * mvPosition;
            }
          `}
          fragmentShader={`
            varying vec3 vNormal;
            varying vec3 vViewPosition;
            void main() {
              vec3 normal = normalize(vNormal);
              vec3 viewDir = normalize(vViewPosition);
              float dotProduct = max(dot(normal, viewDir), 0.0);
              // Pow 2.5 creates a wide, smooth shadow transition fading to transparent at the edges
              float opacity = pow(dotProduct, 2.5);
              gl_FragColor = vec4(vec3(0.0), opacity);
            }
          `}
          transparent={true}
          depthWrite={false}
        />
      </mesh>


      {/* ── 5. Photon ring sprite (tight bright halo around sphere) ── */}
      <sprite position={P} scale={[R * 7, R * 7, 1]}>
        <spriteMaterial ref={photonRef} map={photonTex} transparent
          blending={THREE.AdditiveBlending} depthWrite={false} opacity={0} />
      </sprite>
    </group>
  );
}

// Helper to convert hex to RGB
function hexToRgb(hex: string) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 255, g: 255, b: 255 };
}

// Decorative background black holes spread throughout the Milky Way volume
const DECORATIVE_BLACK_HOLES = [
  {
    id: 'dbh-1',
    position: [-7800, -200, 4200] as [number, number, number],
    color: '#88AAFF',
    radius: 25,
    rotationSpeed: 0.04,
    tilt: [Math.PI * 0.12, 0.35, 0.08] as [number, number, number]
  },
  {
    id: 'dbh-2',
    position: [-10500, 300, 7800] as [number, number, number],
    color: '#FF9933',
    radius: 15,
    rotationSpeed: 0.06,
    tilt: [Math.PI * -0.08, 0.15, -0.12] as [number, number, number]
  },
  {
    id: 'dbh-4',
    position: [-8500, -1200, 2800] as [number, number, number],
    color: '#FF5522',
    radius: 40,
    rotationSpeed: 0.05,
    tilt: [Math.PI * 0.15, 0.45, -0.06] as [number, number, number]
  },
  {
    id: 'dbh-5',
    position: [-14000, 200, 6500] as [number, number, number],
    color: '#9944FF',
    radius: 12,
    rotationSpeed: 0.07,
    tilt: [Math.PI * -0.12, -0.3, 0.15] as [number, number, number]
  },
  {
    id: 'dbh-6',
    position: [-6000, 1800, 8500] as [number, number, number],
    color: '#44DDFF',
    radius: 10,
    rotationSpeed: 0.08,
    tilt: [Math.PI * 0.10, 0.25, 0.02] as [number, number, number]
  }
];

function DecorativeBlackHole({ position, color, radius, rotationSpeed, tilt }: {
  position: [number, number, number];
  color: string;
  radius: number;
  rotationSpeed: number;
  tilt: [number, number, number];
}) {
  const R = radius;
  
  // Dynamic custom textures based on hex color to perfectly match the accretion disc
  const coronaTex = useMemo(() => {
    const { r, g, b } = hexToRgb(color);
    const c = document.createElement('canvas'); c.width = c.height = 512;
    const ctx = c.getContext('2d')!;
    const gRad = ctx.createRadialGradient(256,256,0, 256,256,256);
    gRad.addColorStop(0.00, `rgba(${r},${g},${b},0.60)`);
    gRad.addColorStop(0.18, `rgba(${Math.floor(r*0.75)},${Math.floor(g*0.75)},${Math.floor(b*0.75)},0.28)`);
    gRad.addColorStop(0.42, `rgba(${Math.floor(r*0.5)},${Math.floor(g*0.5)},${Math.floor(b*0.5)},0.10)`);
    gRad.addColorStop(0.70, `rgba(${Math.floor(r*0.25)},${Math.floor(g*0.25)},${Math.floor(b*0.25)},0.04)`);
    gRad.addColorStop(1.00, 'rgba(0,0,0,0)');
    ctx.fillStyle = gRad; ctx.fillRect(0,0,512,512);
    return new THREE.CanvasTexture(c);
  }, [color]);

  const photonTex = useMemo(() => {
    const { r, g, b } = hexToRgb(color);
    const c = document.createElement('canvas'); c.width = c.height = 512;
    const ctx = c.getContext('2d')!;
    const ringR = 0.38;
    const N = 512;
    const imgData = ctx.createImageData(N, N);
    for (let y = 0; y < N; y++) {
      for (let x = 0; x < N; x++) {
        const dx = (x - N/2) / (N/2);
        const dy = (y - N/2) / (N/2);
        const rad  = Math.sqrt(dx*dx + dy*dy);
        const br = Math.exp(-Math.pow((rad - ringR) / 0.032, 2));
        const i  = (y * N + x) * 4;
        imgData.data[i  ] = Math.floor(r * 0.9 + 25 * Math.max(0, 1 - rad/ringR));
        imgData.data[i+1] = Math.floor(g * 0.9 + 25 * Math.max(0, 1 - rad/ringR));
        imgData.data[i+2] = Math.floor(b * 0.9 + 25 * Math.max(0, 1 - rad/ringR));
        imgData.data[i+3] = Math.floor(br * 240);
      }
    }
    ctx.putImageData(imgData, 0, 0);
    return new THREE.CanvasTexture(c);
  }, [color]);

  const discUniforms = useMemo(() => ({
    uTime: { value: 0 },
    uOpacity: { value: 0 },
    uColor: { value: new THREE.Color(color) },
    uUseCustomColor: { value: true }
  }), [color]);

  const discGroupRef = useRef<THREE.Group>(null!);
  const discMeshRef  = useRef<THREE.Mesh>(null!);
  const discMatRef   = useRef<THREE.ShaderMaterial>(null!);
  const coronaRef    = useRef<THREE.SpriteMaterial>(null!);
  const photonRef    = useRef<THREE.SpriteMaterial>(null!);
  const sphereRef    = useRef<THREE.Mesh>(null!);
  const sphereMatRef = useRef<THREE.MeshBasicMaterial>(null!);

  useFrame(({ camera, clock }, delta) => {
    // Fade in between camera distance 900 and 1800 units
    const dist = camera.position.length();
    const op = THREE.MathUtils.smoothstep(dist, 900, 1800);
    const t  = clock.elapsedTime;
    
    if (discMatRef.current) {
      discMatRef.current.uniforms.uTime.value = t;
      discMatRef.current.uniforms.uOpacity.value = op;
    }
    if (coronaRef.current) coronaRef.current.opacity = op * 0.90;
    if (photonRef.current) photonRef.current.opacity = op * 0.98;
    
    if (sphereRef.current) {
      sphereRef.current.visible = op > 0.001;
    }
    if (sphereMatRef.current) {
      sphereMatRef.current.opacity = op;
    }
    if (discMeshRef.current) {
      discMeshRef.current.rotation.z += rotationSpeed * delta;
    }
  });

  const planeSize = R * 12.5;

  return (
    <group>
      {/* ── 1. Wide corona glow (always faces camera) ── */}
      <sprite position={position} scale={[R * 40, R * 40, 1]}>
        <spriteMaterial ref={coronaRef} map={coronaTex} transparent
          blending={THREE.AdditiveBlending} depthWrite={false} opacity={0} />
      </sprite>

      {/* ── 2. Accretion disc — custom GLSL shader plane, rotates slowly ── */}
      <group ref={discGroupRef} position={position} rotation={tilt}>
        <mesh ref={discMeshRef} renderOrder={1}>
          <planeGeometry args={[planeSize, planeSize]} />
          <shaderMaterial
            ref={discMatRef as any}
            vertexShader={BH_VERT}
            fragmentShader={BH_DISC_FRAG}
            uniforms={discUniforms}
            transparent
            depthWrite={false}
            depthTest={true}
            blending={THREE.AdditiveBlending}
            side={THREE.DoubleSide}
          />
        </mesh>
      </group>

      {/* ── 3. Event horizon sphere — pure black, writes depth, occludes disc ── */}
      <mesh
        ref={sphereRef}
        position={position}
        renderOrder={2}
      >
        <sphereGeometry args={[R * 1.01, 64, 64]} />
        <meshBasicMaterial ref={sphereMatRef} color="#000000" transparent depthWrite={true} opacity={0} />
      </mesh>

      {/* ── 4. Photon ring sprite (tight bright halo around sphere) ── */}
      <sprite position={position} scale={[R * 7, R * 7, 1]}>
        <spriteMaterial ref={photonRef} map={photonTex} transparent
          blending={THREE.AdditiveBlending} depthWrite={false} opacity={0} />
      </sprite>
    </group>
  );
}

// Decorative deep background galaxies spread across all sky quadrants
const DEEP_BACKGROUND_GALAXIES = [
  {
    id: 'dbg-1',
    position: [22000, 3000, -16000] as [number, number, number],
    scale: [3500, 1400, 1] as [number, number, number],
    color: '#AABBFF',
    rotationSpeed: 0.01,
    opacityMax: 0.75,
    canvasAngle: 0.3
  },
  {
    id: 'dbg-2',
    position: [-28000, 4000, -8000] as [number, number, number],
    scale: [2000, 2000, 1] as [number, number, number],
    color: '#FFDDAA',
    rotationSpeed: 0.006,
    opacityMax: 0.70,
    canvasAngle: 1.2
  },
  {
    id: 'dbg-3',
    position: [18000, -1000, 12000] as [number, number, number],
    scale: [2800, 400, 1] as [number, number, number],
    color: '#CCDDFF',
    rotationSpeed: 0.012,
    opacityMax: 0.70,
    canvasAngle: -0.5
  },
  {
    id: 'dbg-4',
    position: [-20000, -3000, 14000] as [number, number, number],
    scale: [2200, 900, 1] as [number, number, number],
    color: '#FFD080',
    rotationSpeed: 0.008,
    opacityMax: 0.65,
    canvasAngle: 0.8
  },
  {
    id: 'dbg-5',
    position: [8000, 12000, -18000] as [number, number, number],
    scale: [1200, 800, 1] as [number, number, number],
    color: '#FFEECC',
    rotationSpeed: 0.014,
    opacityMax: 0.60,
    canvasAngle: -1.0
  },
  {
    id: 'dbg-6',
    position: [24000, -5000, 8000] as [number, number, number],
    scale: [1800, 700, 1] as [number, number, number],
    color: '#BBCCFF',
    rotationSpeed: 0.011,
    opacityMax: 0.65,
    canvasAngle: 0.5
  },
  {
    id: 'dbg-7',
    position: [-5000, 2000, -28000] as [number, number, number],
    scale: [1000, 400, 1] as [number, number, number],
    color: '#DDEEFF',
    rotationSpeed: 0.005,
    opacityMax: 0.40,
    canvasAngle: 2.1
  },
  {
    id: 'dbg-8a',
    position: [-25000, 1000, 10000] as [number, number, number],
    scale: [1600, 600, 1] as [number, number, number],
    color: '#FFD0AA',
    rotationSpeed: 0.007,
    opacityMax: 0.65,
    canvasAngle: -0.2
  },
  {
    id: 'dbg-8b',
    position: [-24400, 1300, 9700] as [number, number, number],
    scale: [1200, 480, 1] as [number, number, number],
    color: '#FFAA88',
    rotationSpeed: -0.009,
    opacityMax: 0.55,
    canvasAngle: 0.4
  },
  {
    id: 'dbg-9',
    position: [3000, -20000, 6000] as [number, number, number],
    scale: [1400, 560, 1] as [number, number, number],
    color: '#AACCFF',
    rotationSpeed: 0.015,
    opacityMax: 0.60,
    canvasAngle: -0.7
  },
  {
    id: 'dbg-10',
    position: [-16000, 2500, 12000] as [number, number, number],
    scale: [800, 320, 1] as [number, number, number],
    color: '#FFEECC',
    rotationSpeed: 0.013,
    opacityMax: 0.55,
    canvasAngle: 0.1
  }
];

function DeepBackgroundGalaxy({ position, scale, color, rotationSpeed, opacityMax, canvasAngle }: {
  position: [number, number, number];
  scale: [number, number, number];
  color: string;
  rotationSpeed: number;
  opacityMax: number;
  canvasAngle: number;
}) {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 300;
    canvas.height = 120;
    const ctx = canvas.getContext('2d')!;
    const { r, g, b } = hexToRgb(color);

    ctx.save();
    // Translate to center of 300x120 canvas
    ctx.translate(150, 60);
    // Rotate canvas to simulate different viewing angles
    ctx.rotate(canvasAngle);
    // Scale vertically to make it a perfect oval
    ctx.scale(1.0, 0.4);

    // Draw radial gradient centered at (0, 0)
    const grd = ctx.createRadialGradient(0, 0, 0, 0, 0, 150);
    grd.addColorStop(0.0, `rgba(${r},${g},${b},1.0)`);
    grd.addColorStop(0.25, `rgba(${r},${g},${b},0.65)`);
    grd.addColorStop(0.60, `rgba(${r},${g},${b},0.20)`);
    grd.addColorStop(1.0, 'rgba(0,0,0,0)');

    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.arc(0, 0, 150, 0, Math.PI * 2);
    ctx.fill();

    // Draw subtle star clusters along the oval shape to create realistic galaxy details
    for (let i = 0; i < 180; i++) {
      const radius = Math.pow(Math.random(), 1.6) * 140;
      const theta = Math.random() * Math.PI * 2;
      const sx = Math.cos(theta) * radius;
      const sy = Math.sin(theta) * radius * 0.4;
      ctx.fillStyle = Math.random() > 0.45 ? '#ffffff' : `rgb(${r},${g},${b})`;
      ctx.globalAlpha = Math.random() * 0.8;
      ctx.beginPath();
      ctx.arc(sx, sy, Math.random() * 1.3 + 0.3, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
    return new THREE.CanvasTexture(canvas);
  }, [color, canvasAngle]);

  const matRef = useRef<THREE.SpriteMaterial>(null!);

  useFrame(({ camera }, delta) => {
    const dist = camera.position.length();
    // Fade in between camera distance 3500 and 6000 from origin
    const op = THREE.MathUtils.smoothstep(dist, 3500, 6000);
    
    if (matRef.current) {
      matRef.current.opacity = op * opacityMax;
      // Very slowly rotate sprite around its own center
      matRef.current.rotation += rotationSpeed * delta;
    }
  });

  return (
    <sprite position={position} scale={scale}>
      <spriteMaterial
        ref={matRef}
        map={texture}
        transparent
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        opacity={0}
      />
    </sprite>
  );
}


// ─── STAR CLUSTERS ────────────────────────────────────────────────────────────
function StarCluster({ position }: { position: [number, number, number] }) {
  const count = 500 + Math.floor(Math.random() * 300);
  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for(let i=0; i<count; i++) {
       const r = Math.pow(Math.random(), 3) * (30 + Math.random() * 30);
       const theta = Math.random() * Math.PI * 2;
       const phi = Math.acos(2 * Math.random() - 1);
       pos[i*3] = r * Math.sin(phi) * Math.cos(theta);
       pos[i*3+1] = r * Math.cos(phi);
       pos[i*3+2] = r * Math.sin(phi) * Math.sin(theta);
    }
    return pos;
  }, [count]);

  const matRef = useRef<THREE.PointsMaterial>(null!);

  useFrame(({ camera }) => {
    const dist = camera.position.length();
    if (matRef.current) {
      // Appear at distance 500, fade in over 200 units (500-700)
      matRef.current.opacity = THREE.MathUtils.smoothstep(dist, 500, 700);
    }
  });

  return (
    <points position={position}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} count={count} array={positions} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial ref={matRef} color="#FFF5DD" size={3} sizeAttenuation transparent blending={THREE.AdditiveBlending} depthWrite={false} map={getCircleTexture()} alphaTest={0.01} />
    </points>
  );
}



function DistantGalaxySprite({ position, innerColor, outerColor, scale, scaleY = 0.5, minDist = 1500 }: any) {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    const grd = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
    grd.addColorStop(0, innerColor);
    grd.addColorStop(0.3, outerColor);
    grd.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.arc(128, 128, 128, 0, Math.PI * 2);
    ctx.fill();
    for (let i = 0; i < 400; i++) {
      const r = Math.pow(Math.random(), 2) * 120;
      const t = Math.random() * Math.PI * 2;
      const x = 128 + Math.cos(t) * r;
      const y = 128 + Math.sin(t) * r * (0.3 + Math.random() * 0.4);
      ctx.fillStyle = Math.random() > 0.5 ? '#ffffff' : innerColor;
      ctx.globalAlpha = Math.random();
      ctx.beginPath();
      ctx.arc(x, y, Math.random() * 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
    return new THREE.CanvasTexture(canvas);
  }, [innerColor, outerColor]);

  const matRef = useRef<THREE.SpriteMaterial>(null!);
  useFrame(({ camera }) => {
    if (matRef.current) {
      const dist = camera.position.length();
      matRef.current.opacity = THREE.MathUtils.smoothstep(dist, minDist, minDist + 2500);
    }
  });

  return (
    <sprite position={position} scale={[scale, scale * scaleY, 1]}>
      <spriteMaterial ref={matRef} map={texture} transparent blending={THREE.AdditiveBlending} depthWrite={false} />
    </sprite>
  );
}

// ─── DEEP SPACE LAYERS ────────────────────────────────────────────────────────
// ── DECORATIVE NEBULAE: spread throughout the Milky Way galaxy ───────────────
// Galactic center ≈ [-9000, 0, 5000]. Solar system at [0,0,0] is ~8000 units out.
// Positions deliberately cover core, inner arms, mid-galaxy, outer arm, and far regions.
const NEBULAE = [
  // ── Near galactic core ──────────────────────────────────────────────────
  // H-alpha red star-forming region — dense core cluster
  { position: [-9200,  350,  5400], innerColor: '#FF4466', outerColor: '#AA1133', scale: 1800 },
  // Oxygen III blue emission — companion to core cluster
  { position: [-8600, -280,  4500], innerColor: '#4488FF', outerColor: '#2244BB', scale: 1600 },
  // Sulfur II orange — dusty core corridor
  { position: [-9800,  200,  5900], innerColor: '#FF8800', outerColor: '#CC4400', scale: 2000 },

  // ── Inner spiral arms ────────────────────────────────────────────────────
  // Mixed purple/violet — dense star-forming pillar
  { position: [-5200,  180,  2100], innerColor: '#8844FF', outerColor: '#4422AA', scale: 1400 },
  // Teal OIII emission — hot young star cluster
  { position: [-7100, -320,  8200], innerColor: '#22DDBB', outerColor: '#118866', scale: 1500 },
  // H-alpha red — luminous nebula in Sagittarius arm
  { position: [-6300,  420,  3700], innerColor: '#FF3355', outerColor: '#881122', scale: 1700 },

  // ── Mid-galaxy ─────────────────────────────────────────────────────────
  // Blue-violet — diffuse Orion-style cloud
  { position: [-4100,  380, -1200], innerColor: '#4488FF', outerColor: '#882299', scale: 1300 },
  // Orange sulfur — Eagle Nebula pillars analog
  { position: [-11200,  220,  3100], innerColor: '#FF7700', outerColor: '#993300', scale: 1900 },
  // Crimson-magenta — Lagoon-style H-alpha region
  { position: [-7800, -200,  6600], innerColor: '#CC2255', outerColor: '#771144', scale: 1600 },

  // ── Our outer arm (near solar system) ──────────────────────────────────
  // Soft blue — diffuse cloud visible from Earth analog
  { position: [-1100,  140,  1600], innerColor: '#3366FF', outerColor: '#662299', scale: 900  },
  // Warm amber — local dust cloud
  { position: [2100, -180,  3100], innerColor: '#DD5500', outerColor: '#882200', scale: 800  },

  // ── Outer galaxy ────────────────────────────────────────────────────────
  // Teal — outer arm HII region
  { position: [-13200,  100,  6300], innerColor: '#22CCAA', outerColor: '#115544', scale: 1400 },
  // Violet — far outer sparse nebula
  { position: [-6100,  480, 10300], innerColor: '#9944FF', outerColor: '#441188', scale: 1200 },
];


// Named landmark galaxies — appear at dist > 4000
const NAMED_GALAXIES = [
  { position: [12000, 1500, -8000]  as [number,number,number], innerColor: '#AABBFF', outerColor: '#4466FF', scale: 2000, scaleY: 0.4, label: 'Andromeda Galaxy',        minDist: 4000 },
  { position: [-9000, -500, 6000]   as [number,number,number], innerColor: '#8899FF', outerColor: '#224499', scale: 800,  scaleY: 0.4, label: 'Triangulum Galaxy',        minDist: 4000 },
  { position: [6000, -2500, 8000]   as [number,number,number], innerColor: '#FFEECC', outerColor: '#AA8844', scale: 600,  scaleY: 0.6, label: 'Large Magellanic Cloud',   minDist: 4000 },

  // ── Extra background galaxies scattered around the Milky Way ──────────────
  // Rose / pink spiral
  { position: [-6000, 1200, -9000]  as [number,number,number], innerColor: '#FFB0CC', outerColor: '#CC4488', scale: 900,  scaleY: 0.38, label: '', minDist: 3500 },
  // Teal-cyan lenticular
  { position: [8000, -800, -5000]   as [number,number,number], innerColor: '#88FFEE', outerColor: '#1188AA', scale: 700,  scaleY: 0.30, label: '', minDist: 3500 },
  // Amber-gold barred spiral
  { position: [-4000, 2200, 9000]   as [number,number,number], innerColor: '#FFDD88', outerColor: '#CC8811', scale: 1100, scaleY: 0.45, label: '', minDist: 3500 },
  // Deep violet elliptical
  { position: [10000, 3000, 3000]   as [number,number,number], innerColor: '#CC99FF', outerColor: '#6622BB', scale: 850,  scaleY: 0.55, label: '', minDist: 4000 },
  // Salmon-orange irregular
  { position: [-11000, -1500, -4000] as [number,number,number], innerColor: '#FF9966', outerColor: '#AA3311', scale: 650, scaleY: 0.42, label: '', minDist: 4000 },
  // Lime-green star-forming
  { position: [5000, -3500, -8000]  as [number,number,number], innerColor: '#AAFFBB', outerColor: '#228833', scale: 780,  scaleY: 0.35, label: '', minDist: 3500 },
  // Magenta-violet ring galaxy
  { position: [-7500, 4000, 2000]   as [number,number,number], innerColor: '#FF66FF', outerColor: '#882299', scale: 920,  scaleY: 0.28, label: '', minDist: 4000 },
  // Ice-blue lenticular
  { position: [3000, 5000, -10000]  as [number,number,number], innerColor: '#CCEEFF', outerColor: '#3388CC', scale: 750,  scaleY: 0.50, label: '', minDist: 4000 },
  // Warm white elliptical
  { position: [-5000, -4000, -7000] as [number,number,number], innerColor: '#FFF8E8', outerColor: '#AA9966', scale: 500,  scaleY: 0.60, label: '', minDist: 3500 },
  // Copper-red spiral
  { position: [9000, 2000, -2000]   as [number,number,number], innerColor: '#FF8844', outerColor: '#882200', scale: 1050, scaleY: 0.40, label: '', minDist: 4000 },
  // Periwinkle compact
  { position: [-3000, 6000, 5000]   as [number,number,number], innerColor: '#9999FF', outerColor: '#4444BB', scale: 440,  scaleY: 0.45, label: '', minDist: 3500 },
  // Gold-white face-on spiral
  { position: [7000, -5000, -6000]  as [number,number,number], innerColor: '#FFFFCC', outerColor: '#CCAA44', scale: 1200, scaleY: 0.55, label: '', minDist: 4000 },
  // Crimson dwarf
  { position: [-8000, -3000, -3000] as [number,number,number], innerColor: '#FF4466', outerColor: '#881133', scale: 380,  scaleY: 0.38, label: '', minDist: 3500 },
  // Seafoam barred
  { position: [2000, 7000, 8000]    as [number,number,number], innerColor: '#66FFCC', outerColor: '#118866', scale: 860,  scaleY: 0.32, label: '', minDist: 4000 },
  // Lavender large spiral
  { position: [-13000, 500, 1000]   as [number,number,number], innerColor: '#DDBBFF', outerColor: '#8855CC', scale: 1400, scaleY: 0.38, label: '', minDist: 5000 },
  // Orange-ochre edge-on
  { position: [4000, -6000, 7000]   as [number,number,number], innerColor: '#FFBB55', outerColor: '#994400', scale: 680,  scaleY: 0.20, label: '', minDist: 3500 },
  // Cobalt-blue compact elliptical
  { position: [-6000, 5500, -5000]  as [number,number,number], innerColor: '#4488FF', outerColor: '#111166', scale: 520,  scaleY: 0.50, label: '', minDist: 4000 },
  // Peach-rose lenticular
  { position: [11000, -3000, -9000] as [number,number,number], innerColor: '#FFBBAA', outerColor: '#BB5544', scale: 900,  scaleY: 0.42, label: '', minDist: 5000 },
  // Mint-teal face-on
  { position: [-2000, -7000, 6000]  as [number,number,number], innerColor: '#AAFFDD', outerColor: '#228855', scale: 740,  scaleY: 0.58, label: '', minDist: 3500 },
  // Bright white core + blue halo
  { position: [6000, 6000, -4000]   as [number,number,number], innerColor: '#FFFFFF', outerColor: '#3366CC', scale: 820,  scaleY: 0.44, label: '', minDist: 4000 },
  // Rusty-red irregular
  { position: [-9000, 1000, -8000]  as [number,number,number], innerColor: '#FF6633', outerColor: '#661100', scale: 570,  scaleY: 0.35, label: '', minDist: 4500 },
  // Yellow-green starburst
  { position: [1000, -8000, -5000]  as [number,number,number], innerColor: '#DDFF44', outerColor: '#669900', scale: 640,  scaleY: 0.40, label: '', minDist: 3500 },
  // Violet-pink interacting pair
  { position: [-4500, 3500, -11000] as [number,number,number], innerColor: '#FF88FF', outerColor: '#661177', scale: 1050, scaleY: 0.50, label: '', minDist: 5000 },
  // Steel-blue edge-on
  { position: [14000, -1000, 5000]  as [number,number,number], innerColor: '#88AACC', outerColor: '#224466', scale: 1100, scaleY: 0.18, label: '', minDist: 5500 },
  // Warm gold bulgey elliptical
  { position: [-1000, 9000, -3000]  as [number,number,number], innerColor: '#FFD080', outerColor: '#885500', scale: 760,  scaleY: 0.60, label: '', minDist: 4000 },
  // Cyan-white compact
  { position: [5500, 4000, 10000]   as [number,number,number], innerColor: '#CCFFFF', outerColor: '#0088AA', scale: 480,  scaleY: 0.48, label: '', minDist: 4500 },
  // Deep red ring
  { position: [-10000, -5000, 2000] as [number,number,number], innerColor: '#FF3333', outerColor: '#440000', scale: 700,  scaleY: 0.30, label: '', minDist: 5000 },
];

const DISTANT_GALAXIES = Array.from({ length: 70 }).map((_) => {
  const distance = 8000 + Math.random() * 16000;
  const theta = Math.random() * Math.PI * 2;
  const phi = Math.acos(2 * Math.random() - 1);
  return {
    position: [
      distance * Math.sin(phi) * Math.cos(theta),
      distance * Math.cos(phi),
      distance * Math.sin(phi) * Math.sin(theta)
    ] as [number, number, number],
    innerColor: ['#AABBFF', '#4488FF', '#FFF5DD', '#FFCCAA', '#FFDDFF'][Math.floor(Math.random() * 5)],
    outerColor: ['#4466FF', '#1144AA', '#AA8844', '#AA5522', '#AA44AA'][Math.floor(Math.random() * 5)],
    scale: 300 + Math.pow(Math.random(), 3) * 1800,
    label: `Galaxy G-${Math.floor(Math.random() * 10000)}`
  };
});

const CLUSTERS = [
  { position: [1800, 600, 1200] as [number,number,number] },
  { position: [-2000, 800, -1500] as [number,number,number] },
  { position: [2500, -500, -1000] as [number,number,number] },
  { position: [-1500, -900, 2000] as [number,number,number] },
];

// ── Milky Way Companions ─────────────────────────────────────────────────────
// Close-range galaxy sprites visible at normal solar-system zoom (minDist 300–650).
// Yellow/gold warm cores + blue/violet/teal outer halos.
const MILKY_WAY_COMPANIONS = [
  { position: [-3200, 400, 1800]    as [number,number,number], innerColor: '#FFE080', outerColor: '#1144BB', scale: 1800, scaleY: 0.35, minDist: 2000 },
  { position: [2800, -600, -3500]   as [number,number,number], innerColor: '#FFCC44', outerColor: '#2255CC', scale: 1400, scaleY: 0.40, minDist: 2200 },
  { position: [-4500, 800, -2000]   as [number,number,number], innerColor: '#FFD860', outerColor: '#3311AA', scale: 2000, scaleY: 0.30, minDist: 2500 },
  { position: [3800, 1200, 2400]    as [number,number,number], innerColor: '#F8E890', outerColor: '#1177AA', scale: 1600, scaleY: 0.38, minDist: 2200 },
  { position: [-2400, -500, 4200]   as [number,number,number], innerColor: '#FFAA30', outerColor: '#551199', scale: 1300, scaleY: 0.42, minDist: 2000 },
  { position: [5000, 600, -1500]    as [number,number,number], innerColor: '#FFF0A0', outerColor: '#006688', scale: 2200, scaleY: 0.28, minDist: 2600 },
  { position: [-1800, 1400, -4000]  as [number,number,number], innerColor: '#FFFEF0', outerColor: '#4422AA', scale: 1200, scaleY: 0.50, minDist: 2000 },
  { position: [4200, -900, 3000]    as [number,number,number], innerColor: '#FFD060', outerColor: '#0055BB', scale: 1700, scaleY: 0.36, minDist: 2400 },
  { position: [-5500, -200, 500]    as [number,number,number], innerColor: '#FFE840', outerColor: '#1133CC', scale: 2400, scaleY: 0.25, minDist: 2800 },
  { position: [1500, -1600, 3800]   as [number,number,number], innerColor: '#FFCC66', outerColor: '#224488', scale: 1100, scaleY: 0.18, minDist: 2000 },
  { position: [-3800, 900, -3200]   as [number,number,number], innerColor: '#FFF0C0', outerColor: '#3355BB', scale: 1900, scaleY: 0.44, minDist: 2500 },
  { position: [2200, 2000, 3500]    as [number,number,number], innerColor: '#FFBB44', outerColor: '#008899', scale: 1500, scaleY: 0.32, minDist: 2100 },
  { position: [-2700, -1200, -2800] as [number,number,number], innerColor: '#FFA820', outerColor: '#442299', scale: 1350, scaleY: 0.45, minDist: 2000 },
  { position: [4800, 300, 1200]     as [number,number,number], innerColor: '#FFFEF5', outerColor: '#2244BB', scale: 2000, scaleY: 0.55, minDist: 2600 },
  { position: [-1200, 2400, 3200]   as [number,number,number], innerColor: '#FFEE80', outerColor: '#4477CC', scale: 1250, scaleY: 0.38, minDist: 2000 },
  { position: [3300, -1800, -2200]  as [number,number,number], innerColor: '#FFC020', outerColor: '#111177', scale: 1600, scaleY: 0.30, minDist: 2300 },
  { position: [-4000, -800, 2600]   as [number,number,number], innerColor: '#FFF8CC', outerColor: '#0066AA', scale: 1800, scaleY: 0.22, minDist: 2400 },
  { position: [600, 2800, -3600]    as [number,number,number], innerColor: '#FFEE99', outerColor: '#6633BB', scale: 2500, scaleY: 0.60, minDist: 2500 },
  { position: [-3400, 1600, 1400]   as [number,number,number], innerColor: '#FFDD55', outerColor: '#1188CC', scale: 1050, scaleY: 0.40, minDist: 2100 },
  { position: [2600, -2400, 1600]   as [number,number,number], innerColor: '#FFBB33', outerColor: '#336699', scale: 1400, scaleY: 0.20, minDist: 2200 },
];

// ── Hero Galaxies ─────────────────────────────────────────────────────────────
// Yellow-centre + blue-halo galaxy discs positioned around the Milky Way (5000–14000 units).
// minDist:1800 — only appear when camera is zoomed out to Milky Way scale.
const HERO_GALAXIES = [
  { position: [-9000, 1200, -6000]   as [number,number,number], innerColor: '#FFE060', outerColor: '#1133BB', scale: 2200, scaleY: 0.38, minDist: 1800 },
  { position: [10000, 1500, -4500]   as [number,number,number], innerColor: '#FFCC44', outerColor: '#0044AA', scale: 1600, scaleY: 0.22, minDist: 2000 },
  { position: [-4000, -800, 11000]   as [number,number,number], innerColor: '#FFF090', outerColor: '#2255CC', scale: 2600, scaleY: 0.30, minDist: 1900 },
  { position: [16000, 2000, -3000]   as [number,number,number], innerColor: '#FFD840', outerColor: '#1144CC', scale: 1800, scaleY: 0.42, minDist: 2200 },
  { position: [14000, 500, 7000]     as [number,number,number], innerColor: '#FFF0B0', outerColor: '#2244AA', scale: 1400, scaleY: 0.16, minDist: 2100 },
  { position: [-6000, 1800, -10000]  as [number,number,number], innerColor: '#FFBB30', outerColor: '#3311AA', scale: 2000, scaleY: 0.35, minDist: 1900 },
  { position: [-12000, -1000, 8000]  as [number,number,number], innerColor: '#FFEE80', outerColor: '#006699', scale: 1700, scaleY: 0.28, minDist: 2000 },
  { position: [-14000, 1500, 4000]   as [number,number,number], innerColor: '#FFCC55', outerColor: '#1133AA', scale: 2400, scaleY: 0.45, minDist: 2200 },
  { position: [8000, -2000, 10000]   as [number,number,number], innerColor: '#FFFFF0', outerColor: '#004488', scale: 1500, scaleY: 0.20, minDist: 1800 },
  { position: [7000, 3000, -9000]    as [number,number,number], innerColor: '#FFC020', outerColor: '#111177', scale: 1900, scaleY: 0.33, minDist: 2000 },
  { position: [-17000, 800, -2000]   as [number,number,number], innerColor: '#FFBB44', outerColor: '#1166BB', scale: 2800, scaleY: 0.48, minDist: 2200 },
  { position: [2000, -2200, -12000]  as [number,number,number], innerColor: '#FFEE70', outerColor: '#4422BB', scale: 1600, scaleY: 0.26, minDist: 1900 },
  { position: [12000, 2500, 5000]    as [number,number,number], innerColor: '#FFF5CC', outerColor: '#0055AA', scale: 1300, scaleY: 0.18, minDist: 2000 },
  { position: [-8000, -1800, -9000]  as [number,number,number], innerColor: '#FFD050', outerColor: '#002266', scale: 2000, scaleY: 0.15, minDist: 1800 },
  { position: [3000, 1000, -14000]   as [number,number,number], innerColor: '#FFE040', outerColor: '#1144BB', scale: 3000, scaleY: 0.50, minDist: 2100 },
];

// ─── GLOBULAR CLUSTER ────────────────────────────────────────────────────────
// Compact spherical ball of warm yellow-white stars — orbits outside the galaxy disc
function GlobularCluster({ position, radius = 80 }: { position: [number,number,number]; radius?: number }) {
  const ptRef = useRef<THREE.Points>(null!);

  const { pos, col } = useMemo(() => {
    const N = 3000;
    const pos = new Float32Array(N * 3);
    const col = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      // Power-law density: denser toward center
      const r = Math.pow(Math.random(), 2.2) * radius;
      const th = Math.random() * Math.PI * 2;
      const ph = Math.acos(2 * Math.random() - 1);
      pos[i*3]   = Math.sin(ph)*Math.cos(th)*r;
      pos[i*3+1] = Math.cos(ph)*r;
      pos[i*3+2] = Math.sin(ph)*Math.sin(th)*r;
      // Colors: warm yellow-white core → cooler blue-white edge
      const t = r / radius;
      col[i*3]   = 1.0;
      col[i*3+1] = 0.88 - t * 0.20;
      col[i*3+2] = 0.50 + t * 0.38;
    }
    return { pos, col };
  }, [radius]);

  const circleTex = useMemo(() => {
    const c = document.createElement('canvas'); c.width = c.height = 32;
    const ctx = c.getContext('2d')!;
    const g = ctx.createRadialGradient(16,16,0,16,16,16);
    g.addColorStop(0,   'rgba(255,255,255,1)');
    g.addColorStop(0.4, 'rgba(255,255,255,0.6)');
    g.addColorStop(1,   'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.fillRect(0,0,32,32);
    return new THREE.CanvasTexture(c);
  }, []);

  useFrame(({ camera }) => {
    if (!ptRef.current) return;
    const mat = ptRef.current.material as THREE.PointsMaterial;
    mat.opacity = THREE.MathUtils.smoothstep(camera.position.length(), 1500, 3000);
  });

  return (
    <points ref={ptRef} position={position}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[pos, 3]} count={3000} array={pos} itemSize={3} />
        <bufferAttribute attach="attributes-color"    args={[col, 3]} count={3000} array={col} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial
        size={2.8} vertexColors transparent opacity={0}
        blending={THREE.AdditiveBlending} sizeAttenuation depthWrite={false}
        map={circleTex} alphaTest={0.01}
      />
    </points>
  );
}

// ─── EXTREME ZOOM-OUT GALAXY SMUDGES ─────────────────────────────────────────
// These are the "deep sky objects" — oval glowing smudges covering all sky quadrants.
// Appear only at dist > 4000, fully visible above 7000.
// Positioned at 30k–120k units so they truly look like background objects.
function UltraDistantGalaxy({ position, innerColor, outerColor, scaleX, scaleY, rotation = 0 }:
  { position:[number,number,number]; innerColor:string; outerColor:string; scaleX:number; scaleY:number; rotation?:number }) {

  const tex = useMemo(() => {
    const c = document.createElement('canvas'); c.width = 512; c.height = 256;
    const ctx = c.getContext('2d')!;
    // Oval radial gradient — wider than tall for edge-on galaxy look
    const grd = ctx.createRadialGradient(256,128,4, 256,128,220);
    grd.addColorStop(0.00, innerColor);
    grd.addColorStop(0.25, outerColor);
    grd.addColorStop(0.60, outerColor);
    grd.addColorStop(1.00, 'rgba(0,0,0,0)');
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.ellipse(256, 128, 240, 110, 0, 0, Math.PI * 2);
    ctx.fill();
    // Star speckle dots
    for (let i = 0; i < 200; i++) {
      const rx = (Math.random() - 0.5) * 440;
      const ry = (Math.random() - 0.5) * 180;
      if ((rx*rx)/(220*220) + (ry*ry)/(90*90) > 1) continue;
      ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.8})`;
      ctx.beginPath();
      ctx.arc(256 + rx, 128 + ry, Math.random() * 1.2, 0, Math.PI*2);
      ctx.fill();
    }
    return new THREE.CanvasTexture(c);
  }, [innerColor, outerColor]);

  const matRef = useRef<THREE.SpriteMaterial>(null!);
  useFrame(({ camera }) => {
    if (matRef.current) {
      matRef.current.opacity = THREE.MathUtils.smoothstep(camera.position.length(), 4000, 7000) * 0.85;
      matRef.current.rotation = rotation;
    }
  });

  return (
    <sprite position={position} scale={[scaleX, scaleY, 1]}>
      <spriteMaterial ref={matRef} map={tex} transparent
        blending={THREE.AdditiveBlending} depthWrite={false} opacity={0} />
    </sprite>
  );
}

// ─── INTERGALACTIC NEBULA ─────────────────────────────────────────────────────
// Vast, faint colored clouds at extreme distances — subtle background texture only.
// Appear only at dist > 6000.
function IntergalacticNebula({ position, color, size }:
  { position:[number,number,number]; color:string; size:number }) {

  const tex = useMemo(() => {
    const c = document.createElement('canvas'); c.width = c.height = 256;
    const ctx = c.getContext('2d')!;
    const g = ctx.createRadialGradient(128,128,0, 128,128,128);
    g.addColorStop(0,   color);
    g.addColorStop(0.5, color.replace('0.', '0.0'));
    g.addColorStop(1,   'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.fillRect(0,0,256,256);
    return new THREE.CanvasTexture(c);
  }, [color]);

  const matRef = useRef<THREE.SpriteMaterial>(null!);
  useFrame(({ camera }) => {
    if (matRef.current) {
      matRef.current.opacity = THREE.MathUtils.smoothstep(camera.position.length(), 6000, 10000) * 0.12;
    }
  });

  return (
    <sprite position={position} scale={[size, size * 0.55, 1]}>
      <spriteMaterial ref={matRef} map={tex} transparent
        blending={THREE.AdditiveBlending} depthWrite={false} opacity={0} />
    </sprite>
  );
}

// ── Ultra-distant galaxies — all-sky coverage at extreme zoom (dist > 4000) ──
// Placed in all quadrants so no part of the sky looks empty.
// Positions are at 30k–120k units. scaleY << scaleX for realistic oval smudge shape.
const ULTRA_DISTANT_GALAXIES = [
  // Upper-left quadrant (negative X, positive Y)
  { position: [-85000,  42000, -30000] as [number,number,number], innerColor: '#AABBFF', outerColor: '#3355AA', scaleX: 9000,  scaleY: 2800,  rotation: 0.3  },
  { position: [-55000,  28000, -68000] as [number,number,number], innerColor: '#FFF8DD', outerColor: '#AA8844', scaleX: 6000,  scaleY: 1800,  rotation: -0.5 },
  // Upper-right quadrant (positive X, positive Y)
  { position: [72000,   38000, -45000] as [number,number,number], innerColor: '#CCDEFF', outerColor: '#4466BB', scaleX: 11000, scaleY: 3200,  rotation: 0.8  },
  { position: [48000,   55000, -22000] as [number,number,number], innerColor: '#FFE4CC', outerColor: '#BB6633', scaleX: 7500,  scaleY: 2200,  rotation: -0.2 },
  // Lower-left quadrant (negative X, negative Y)
  { position: [-62000, -45000, -35000] as [number,number,number], innerColor: '#BBCCFF', outerColor: '#2244AA', scaleX: 8500,  scaleY: 2500,  rotation: 1.1  },
  { position: [-40000, -60000, -55000] as [number,number,number], innerColor: '#FFEEDD', outerColor: '#997755', scaleX: 5500,  scaleY: 1600,  rotation: 0.6  },
  // Lower-right quadrant (positive X, negative Y)
  { position: [90000,  -38000, -20000] as [number,number,number], innerColor: '#DDEEFF', outerColor: '#3366CC', scaleX: 10000, scaleY: 3000,  rotation: -0.9 },
  { position: [35000,  -52000, -75000] as [number,number,number], innerColor: '#FFDDB0', outerColor: '#AA5522', scaleX: 6800,  scaleY: 2000,  rotation: 0.4  },
  // Directly above
  { position: [-10000,  95000, -15000] as [number,number,number], innerColor: '#CCDDFF', outerColor: '#4455BB', scaleX: 8000,  scaleY: 4500,  rotation: 0.0  },
  // Directly below
  { position: [5000,  -88000, -25000]  as [number,number,number], innerColor: '#FFEEBB', outerColor: '#996633', scaleX: 7200,  scaleY: 4000,  rotation: 0.15 },
];

// ── Intergalactic nebulae — faint background color washes at extreme distance ─
// Max opacity 0.12 so they're subliminal texture, not foreground.
const INTERGALACTIC_NEBULAE = [
  { position: [-120000,  30000, -80000] as [number,number,number], color: 'rgba(80,40,180,0.5)',  size: 55000 },
  { position: [95000,   -20000, -110000] as [number,number,number], color: 'rgba(30,60,180,0.5)', size: 65000 },
  { position: [-70000,   80000, -60000]  as [number,number,number], color: 'rgba(160,20,60,0.4)', size: 50000 },
  { position: [130000,   40000, -50000]  as [number,number,number], color: 'rgba(40,20,120,0.5)', size: 70000 },
  { position: [-90000,  -70000, -90000]  as [number,number,number], color: 'rgba(20,80,160,0.4)', size: 60000 },
  { position: [60000,    90000, -130000] as [number,number,number], color: 'rgba(100,30,140,0.5)', size: 75000 },
  { position: [-40000, -100000, -70000]  as [number,number,number], color: 'rgba(160,60,20,0.4)', size: 45000 },
];

// ── Globular clusters — spherical halo orbiting the galaxy ────────────────────
// Distributed in a rough sphere at 8000–18000 units from galactic center [-9000,0,5000]
const GLOBULAR_CLUSTERS: Array<{ position:[number,number,number]; radius:number }> = [
  { position: [-9000,  12000,  5000],  radius: 90  },
  { position: [-9000, -11000,  5000],  radius: 75  },
  { position: [2000,    5000, -4000],  radius: 65  },
  { position: [-20000,  4000,  5000],  radius: 110 },
  { position: [-9000,   3000, 18000],  radius: 85  },
  { position: [-9000,  -3000, -9000],  radius: 70  },
  { position: [4000,    7000, 14000],  radius: 60  },
  { position: [-22000, -6000,  2000],  radius: 95  },
];



function DeepSpaceLayers() {
  const SC   = 15;
  const OX_S = -2750 * SC;

  const galaxyRef = useRef<THREE.Group>(null!);

  const { coreData, armData, haloData } = useMemo(() => {
    // Object 1 — Core: 8,000 points. Distribute using random spherical coordinates with radius 0 to 1.5 units,
    // Y values multiplied by 0.35 to flatten. Colors warm white #fff8ee near center fading to amber #ffaa33 at edges.
    const coreCount = 8000;
    const corePos = new Float32Array(coreCount * 3);
    const coreCol = new Float32Array(coreCount * 3);
    const cCore = new THREE.Color('#fff8ee');
    const cAmber = new THREE.Color('#ffaa33');

    for (let i = 0; i < coreCount; i++) {
      const u = Math.random();
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      
      const r = Math.pow(u, 1.5) * 1.5;

      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = r * Math.cos(phi) * 0.35;
      const z = r * Math.sin(phi) * Math.sin(theta);

      corePos[i * 3]     = x;
      corePos[i * 3 + 1] = y;
      corePos[i * 3 + 2] = z;

      const factor = r / 1.5;
      const col = cCore.clone().lerp(cAmber, factor);
      coreCol[i * 3]     = col.r;
      coreCol[i * 3 + 1] = col.g;
      coreCol[i * 3 + 2] = col.b;
    }

    // Object 2 — Spiral arms: 35,000 points across 4 arms. For each point pick random distance r between 2 and 16.
    // Angle equals r * 0.45 + (armIndex * Math.PI * 0.5).
    // X equals r * cos(angle) + random scatter * 0.6.
    // Z equals r * sin(angle) + random scatter * 0.6.
    // Y equals (Math.random() - 0.5) * 0.3.
    // Colors: inner #aabbff, mid #ffffff, outer #7799ff.
    const armCount = 35000;
    const armPos = new Float32Array(armCount * 3);
    const armCol = new Float32Array(armCount * 3);
    const cInner = new THREE.Color('#aabbff');
    const cMid = new THREE.Color('#ffffff');
    const cOuter = new THREE.Color('#7799ff');

    for (let i = 0; i < armCount; i++) {
      const armIndex = i % 4;
      const r = 2.0 + Math.random() * 14.0;
      const angle = r * 0.45 + (armIndex * Math.PI * 0.5);

      const scatterX = (Math.random() - 0.5) * 2;
      const scatterZ = (Math.random() - 0.5) * 2;

      const x = r * Math.cos(angle) + scatterX * 0.6;
      const z = r * Math.sin(angle) + scatterZ * 0.6;
      const y = (Math.random() - 0.5) * 0.3;

      armPos[i * 3]     = x;
      armPos[i * 3 + 1] = y;
      armPos[i * 3 + 2] = z;

      const t = (r - 2.0) / 14.0;
      const col = new THREE.Color();
      if (t < 0.5) {
        col.lerpColors(cInner, cMid, t * 2.0);
      } else {
        col.lerpColors(cMid, cOuter, (t - 0.5) * 2.0);
      }
      armCol[i * 3]     = col.r;
      armCol[i * 3 + 1] = col.g;
      armCol[i * 3 + 2] = col.b;
    }

    // Object 3 — Outer halo scatter: 8,000 points in a flat ellipsoid 18 units wide, 1 unit tall, random distribution.
    // Color dim #ffcc88 at opacity achieved by setting the material's opacity to 0.4 and transparent: true.
    const haloCount = 8000;
    const haloPos = new Float32Array(haloCount * 3);
    const haloCol = new Float32Array(haloCount * 3);
    const cHalo = new THREE.Color('#ffcc88');

    for (let i = 0; i < haloCount; i++) {
      const u = Math.random();
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      
      const r = Math.pow(u, 1/3);
      
      const x = r * Math.sin(phi) * Math.cos(theta) * 9.0;
      const y = r * Math.cos(phi) * 0.5;
      const z = r * Math.sin(phi) * Math.sin(theta) * 9.0;

      haloPos[i * 3]     = x;
      haloPos[i * 3 + 1] = y;
      haloPos[i * 3 + 2] = z;

      haloCol[i * 3]     = cHalo.r;
      haloCol[i * 3 + 1] = cHalo.g;
      haloCol[i * 3 + 2] = cHalo.b;
    }

    return {
      coreData: { pos: corePos, col: coreCol, count: coreCount },
      armData: { pos: armPos, col: armCol, count: armCount },
      haloData: { pos: haloPos, col: haloCol, count: haloCount }
    };
  }, []);

  useFrame(() => {
    if (galaxyRef.current) {
      galaxyRef.current.rotation.y += 0.00006;
    }
  });

  return (
    <group>
      {/* ── Galaxy Group (offset center from solar system) ── */}
      <group ref={galaxyRef} position={[OX_S, 0, 0]} scale={[3000, 3000, 3000]}>
        <group rotation={[Math.PI * 0.07, 0.04, 0]}>
          {/* Object 1 — Core */}
          <points>
            <bufferGeometry>
              <bufferAttribute attach="attributes-position" args={[coreData.pos, 3]} count={coreData.count} array={coreData.pos} itemSize={3} />
              <bufferAttribute attach="attributes-color"    args={[coreData.col, 3]} count={coreData.count} array={coreData.col} itemSize={3} />
            </bufferGeometry>
            <pointsMaterial
              size={2.5}
              sizeAttenuation
              vertexColors
              blending={THREE.AdditiveBlending}
              depthWrite={false}
              map={getCircleTexture()}
              alphaTest={0.001}
              transparent
            />
          </points>

          {/* Object 2 — Spiral arms */}
          <points>
            <bufferGeometry>
              <bufferAttribute attach="attributes-position" args={[armData.pos, 3]} count={armData.count} array={armData.pos} itemSize={3} />
              <bufferAttribute attach="attributes-color"    args={[armData.col, 3]} count={armData.count} array={armData.col} itemSize={3} />
            </bufferGeometry>
            <pointsMaterial
              size={1.8}
              sizeAttenuation
              vertexColors
              blending={THREE.AdditiveBlending}
              depthWrite={false}
              map={getCircleTexture()}
              alphaTest={0.001}
              transparent
            />
          </points>

          {/* Object 3 — Outer halo scatter */}
          <points>
            <bufferGeometry>
              <bufferAttribute attach="attributes-position" args={[haloData.pos, 3]} count={haloData.count} array={haloData.pos} itemSize={3} />
              <bufferAttribute attach="attributes-color"    args={[haloData.col, 3]} count={haloData.count} array={haloData.col} itemSize={3} />
            </bufferGeometry>
            <pointsMaterial
              size={1.2}
              sizeAttenuation
              vertexColors
              blending={THREE.AdditiveBlending}
              depthWrite={false}
              map={getCircleTexture()}
              alphaTest={0.001}
              transparent
              opacity={0.4}
            />
          </points>
        </group>
      </group>

      {NEBULAE.map((n, i) => <VolumetricNebula key={i} {...n} />)}
      {CLUSTERS.map((c, i) => <StarCluster key={i} position={c.position} />)}
      <InterstellarBlackHole />
      {DECORATIVE_BLACK_HOLES.map((dbh) => (
        <DecorativeBlackHole key={dbh.id} {...dbh} />
      ))}
      {DEEP_BACKGROUND_GALAXIES.map((dbg) => (
        <DeepBackgroundGalaxy key={dbg.id} {...dbg} />
      ))}
      {DISTANT_GALAXIES.map((g, i) => <DistantGalaxySprite key={i} {...g} />)}
      {NAMED_GALAXIES.map((g, i) => <DistantGalaxySprite key={`named-${i}`} {...g} />)}
      {MILKY_WAY_COMPANIONS.map((g, i) => <DistantGalaxySprite key={`mwc-${i}`} {...g} />)}
      {HERO_GALAXIES.map((g, i) => <DistantGalaxySprite key={`hero-${i}`} {...g} />)}

      {/* ── EXTREME ZOOM-OUT: all-sky galaxy smudges (dist > 4000) ── */}
      {ULTRA_DISTANT_GALAXIES.map((g, i) => <UltraDistantGalaxy key={`udg-${i}`} {...g} />)}

      {/* ── Intergalactic nebulae — faint color washes (dist > 6000) ── */}
      {INTERGALACTIC_NEBULAE.map((n, i) => <IntergalacticNebula key={`ign-${i}`} {...n} />)}

      {/* ── Globular clusters orbiting galaxy halo (dist > 1500) ── */}
      {GLOBULAR_CLUSTERS.map((gc, i) => <GlobularCluster key={`gc-${i}`} {...gc} />)}
    </group>
  );
}

// ─── ORBIT COMPONENT ────────────────────────────────────────────────────────
function OrbitPath({ radius }: { radius: number }) {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[radius - 0.2, radius + 0.2, 128]} />
      <meshBasicMaterial color="#ffffff" transparent opacity={0.05} side={THREE.DoubleSide} />
    </mesh>
  );
}

// ─── PLANETARY RING COMPONENT ───────────────────────────────────────────────
function PlanetaryRing({ innerRadius, outerRadius, texture, scale }: { innerRadius: number, outerRadius: number, texture: THREE.Texture, scale: number }) {
  const geoRef = useRef<THREE.RingGeometry>(null);
  
  useEffect(() => {
    if (geoRef.current) {
      const pos = geoRef.current.attributes.position;
      const uvs = geoRef.current.attributes.uv;
      for (let i = 0; i < uvs.count; i++) {
        const x = pos.getX(i);
        const y = pos.getY(i);
        const length = Math.sqrt(x * x + y * y);
        // Map from inner to outer radius -> 0 to 1
        const v = (length - innerRadius) / (outerRadius - innerRadius);
        const angle = Math.atan2(y, x);
        const u = (angle + Math.PI) / (2 * Math.PI);
        uvs.setXY(i, u, v);
      }
      uvs.needsUpdate = true;
    }
  }, [innerRadius, outerRadius]);

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} scale={[scale, scale, scale]}>
      <ringGeometry ref={geoRef} args={[innerRadius, outerRadius, 128]} />
      <meshStandardMaterial 
        map={texture} 
        transparent 
        opacity={0.9} 
        side={THREE.DoubleSide} 
        depthWrite={false}
        roughness={0.6}
        metalness={0.2}
        alphaTest={0.01}
      />
    </mesh>
  );
}

// ─── PLANET COMPONENT ───────────────────────────────────────────────────────
function Planet({ name, orbit, radius, textureUrl, speed, rotationSpeed = 0.005, hasRings = false, ringTextureUrl = '', atmosphere = false, atmosphereTextureUrl = '', unreadCount = 0, initialAngle = 0, emissive: _emissive = "#000000", emissiveIntensity: _emissiveIntensity = 0.05, friendData = null }: any) {
  const groupRef = useRef<THREE.Group>(null!);
  const meshRef = useRef<THREE.Mesh>(null!);
  const atmosRef = useRef<THREE.Mesh>(null!);
  const [hovered, setHovered] = useState(false);
  
  // Track ejection state
  const prevFriendRef = useRef(friendData);
  const [isEjecting, setIsEjecting] = useState(false);
  const [ejectProgress, setEjectProgress] = useState(0);
  const [showDebris, setShowDebris] = useState(false);
  
  const cameraControls = useCamera();
  const setSelectedPlanet = useAppStore(s => s.setSelectedPlanet);
  
  const texture = useLoader(TextureLoader, textureUrl || 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7');
  const ringTexture = useLoader(TextureLoader, hasRings && ringTextureUrl ? ringTextureUrl : 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7');
  const atmosTexture = useLoader(TextureLoader, atmosphere && atmosphereTextureUrl ? atmosphereTextureUrl : 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7');

  const isDeactivated = friendData?.isDeactivated === true;

  useEffect(() => {
    // Detect friend removal (ejection)
    if (prevFriendRef.current && !friendData) {
      setIsEjecting(true);
      setShowDebris(true); // Spawn explosion particles
      setTimeout(() => setShowDebris(false), 2000);
    }
    prevFriendRef.current = friendData;
  }, [friendData]);

  useFrame(({ clock }, delta) => {
    // Handle ejection animation
    if (isEjecting) {
      if (ejectProgress < 1) {
        setEjectProgress(Math.min(1, ejectProgress + delta / 2)); // 2 second animation
      } else {
        setIsEjecting(false);
        setEjectProgress(0); // Reset for future assignments
      }
      return; // Skip normal orbit/rotation while ejecting
    }

    const currentSpeed = isDeactivated ? speed * 0.1 : speed;
    const currentRotSpeed = isDeactivated ? rotationSpeed * 0.1 : rotationSpeed;
    
    const t = clock.getElapsedTime() * currentSpeed * 0.375 + initialAngle;
    groupRef.current.position.x = Math.cos(t) * orbit;
    groupRef.current.position.z = Math.sin(t) * orbit;
    
    if (meshRef.current) {
      meshRef.current.rotation.y += currentRotSpeed;
      // Shrink if ejecting (handled above, but if we resume normal we ensure scale is 1)
      meshRef.current.scale.setScalar(1);
    }
    if (atmosRef.current) {
      atmosRef.current.rotation.y += currentRotSpeed * 1.2;
      atmosRef.current.scale.setScalar(1);
    }
  });

  const handleFocus = (e: any) => {
    e.stopPropagation();
    if (isEjecting) return;
    setSelectedPlanet(name);
    if (cameraControls.current) {
      const target = new THREE.Vector3();
      groupRef.current.getWorldPosition(target);
      cameraControls.current.setLookAt(
        target.x, target.y + radius * 3, target.z + radius * 5,
        target.x, target.y, target.z,
        true
      );
    }
  };


  return (
    <group>
      <OrbitPath radius={orbit} />
      <group 
        ref={groupRef}
        name={name}
        onClick={handleFocus}
        onPointerOver={() => { setHovered(true); document.body.style.cursor = 'pointer'; }}
        onPointerOut={() => { setHovered(false); document.body.style.cursor = 'default'; }}
      >
        {/* Explosion Burst Debris */}
        {showDebris && (
          <group>
            {Array.from({ length: 20 }).map((_, i) => (
              <DebrisParticle key={i} />
            ))}
            <pointLight color="#ff8800" intensity={2 * (1 - ejectProgress)} distance={100} />
          </group>
        )}

        {/* Tilted System (Planet + Atmos + Rings) */}
        <group rotation={[0, 0, name === 'Saturn' ? 0.466 : name === 'Uranus' ? 1.71 : 0]}>
          {/* Planet Core */}
          <mesh ref={meshRef} scale={[1 - ejectProgress, 1 - ejectProgress, 1 - ejectProgress]}>
            <sphereGeometry args={[radius, 64, 64]} />
            <meshStandardMaterial
              map={texture as THREE.Texture}
              roughness={isDeactivated ? 0.95 : 0.7}
              metalness={0.0}
              color={isDeactivated ? new THREE.Color(0.3, 0.3, 0.3) : new THREE.Color(1, 1, 1)}
              emissive={new THREE.Color(0x111111)}
              emissiveIntensity={0.12}
            />
          </mesh>

          {/* Atmosphere Layer */}
          {atmosphere && (
            <mesh ref={atmosRef} scale={[1 - ejectProgress, 1 - ejectProgress, 1 - ejectProgress]}>
              <sphereGeometry args={[radius * 1.015, 64, 64]} />
              <meshStandardMaterial 
                map={atmosTexture as THREE.Texture} 
                transparent 
                opacity={0.6} 
                depthWrite={false} 
                blending={THREE.AdditiveBlending}
                color={isDeactivated ? new THREE.Color('#8B0000') : new THREE.Color(1, 1, 1)}
              />
            </mesh>
          )}

          {/* Rings (Saturn/Uranus) */}
          {hasRings && (
            <PlanetaryRing 
              innerRadius={radius * 1.3} 
              outerRadius={radius * 2.4} 
              texture={ringTexture as THREE.Texture} 
              scale={1 - ejectProgress} 
            />
          )}
        </group>

        {/* UFO Indicator for Unread Letters */}
        {unreadCount > 0 && <UFOIndicator radius={radius} />}

        {/* Hover Label */}
        {hovered && !isEjecting && (
          <Html position={[0, radius + 2, 0]} center>
            <div className={`backdrop-blur-md border px-3 py-1 rounded-full text-white text-[10px] font-orbitron tracking-widest uppercase whitespace-nowrap shadow-lg ${isDeactivated ? 'bg-red-950/80 border-red-500/50 text-red-400' : 'bg-black/80 border-amber-500/30'}`}>
              {isDeactivated ? '⚠️ Account deactivated' : name}
            </div>
          </Html>
        )}
      </group>
    </group>
  );
}

// ─── DEBRIS PARTICLE (For Ejection) ───────────────────────────────────────
function DebrisParticle() {
  const meshRef = useRef<THREE.Mesh>(null!);
  const [speed] = useState(() => new THREE.Vector3(
    (Math.random() - 0.5) * 40,
    (Math.random() - 0.5) * 40,
    (Math.random() - 0.5) * 40
  ));
  
  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.position.addScaledVector(speed, delta);
      meshRef.current.rotation.x += delta * 5;
      meshRef.current.rotation.y += delta * 5;
    }
  });

  return (
    <mesh ref={meshRef}>
      <boxGeometry args={[0.2, 0.2, 0.2]} />
      <meshBasicMaterial color="#ff8800" />
    </mesh>
  );
}

// ─── UFO INDICATOR ────────────────────────────────────────────────────────
function UFOIndicator({ radius }: { radius: number }) {
  const meshRef = useRef<THREE.Group>(null!);
  useFrame(({ clock }) => {
    meshRef.current.position.y = radius + 1.5 + Math.sin(clock.getElapsedTime() * 3) * 0.3;
    meshRef.current.rotation.y += 0.05;
  });
  return (
    <group ref={meshRef}>
      <mesh position={[0, 0, 0]}>
        <cylinderGeometry args={[0.8, 1.2, 0.4, 32]} />
        <meshStandardMaterial color="#88ccff" metalness={0.8} roughness={0.2} />
      </mesh>
      <mesh position={[0, 0.3, 0]}>
        <sphereGeometry args={[0.6, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#aaddff" transparent opacity={0.6} emissive="#00ffff" emissiveIntensity={0.8} />
      </mesh>
      <mesh position={[0, -0.2, 0]}>
        <cylinderGeometry args={[0.4, 0.8, 0.2, 32]} />
        <meshBasicMaterial color="#00ffcc" />
      </mesh>
      <pointLight intensity={3} distance={10} color="#00ffcc" position={[0, -1, 0]} />
    </group>
  );
}

// ─── SUN COMPONENT ──────────────────────────────────────────────────────────
function Sun({ unreadCount: _unreadCount = 0 }: { unreadCount?: number }) {
  const texture = useLoader(TextureLoader, '/textures/2k_sun.jpg');
  const cameraControls = useCamera();
  const setSelectedPlanet = useAppStore(s => s.setSelectedPlanet);
  
  const handleFocus = () => {
    setSelectedPlanet('Sun');
    if (cameraControls.current) {
      cameraControls.current.setLookAt(0, 30, 60, 0, 0, 0, true);
    }
  };


  return (
    <mesh 
      position={[0, 0, 0]} 
      onClick={handleFocus}
      onPointerOver={() => { document.body.style.cursor = 'pointer'; }}
      onPointerOut={() => { document.body.style.cursor = 'default'; }}
    >
      <sphereGeometry args={[48, 64, 64]} />
      <meshBasicMaterial map={texture} />
      {/* Primary solar light — bright warm white, reaches all planets */}
      <pointLight
        position={[0, 0, 0]}
        intensity={12}
        distance={2000}
        decay={0.5}
        color="#FFF8E7"
      />
      {/* Secondary fill light to prevent pitch-black dark sides */}
      <pointLight position={[0, 0, 0]} intensity={1.2} color="#1a2a4a" distance={2000} decay={0.8} />
      {/* Secondary soft corona fill — ensures inner planets are very bright */}
      <pointLight
        position={[0, 0, 0]}
        intensity={12}
        distance={600}
        decay={0.6}
        color="#FFEECC"
      />
    </mesh>
  );
}

// ─── GROUP NEBULA ───────────────────────────────────────────────────────────
function GroupNebula({ group, index }: { group: any, index: number }) {
  const theme = useMemo(() => {
    if (group.theme_color) {
      return { inner: group.theme_color, outer: group.theme_color };
    }
    // Generate beautiful curated cosmic color pairs based on group name hash
    const colors = [
      { inner: '#ff00aa', outer: '#00ffff' },
      { inner: '#ffd700', outer: '#ff3300' },
      { inner: '#00ffcc', outer: '#8a5aff' },
      { inner: '#00ff66', outer: '#0055ff' },
      { inner: '#ff3300', outer: '#9900ff' },
    ];
    let hash = 0;
    const str = group.name || '';
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const idx = Math.abs(hash) % colors.length;
    return colors[idx];
  }, [group.name, group.theme_color]);

  const position = useMemo(() => {
    let hash = 0;
    const str = group.id || String(index);
    for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
    const angle = (Math.abs(hash) % 360) * (Math.PI / 180);
    const dist = 750 + (Math.abs(hash) % 450); // Keep them slightly further out for a grand scale
    const y = (Math.abs(hash >> 8) % 200) - 100;
    return new THREE.Vector3(Math.cos(angle) * dist, y, Math.sin(angle) * dist);
  }, [group.id, index]);

  const [hovered, setHovered] = useState(false);
  const cameraControls = useCamera();
  const setGroupChatOpen = useAppStore(s => s.setGroupChatOpen);
  const setSelectedGroupId = useAppStore(s => s.setSelectedGroupId);
  const selectedGroupId = useAppStore(s => s.selectedGroupId);

  const crystalRef = useRef<THREE.Mesh>(null);
  const crystalOuterRef = useRef<THREE.Mesh>(null);
  const ringsGroupRef = useRef<THREE.Group>(null);
  const satRef1 = useRef<THREE.Group>(null);
  const satRef2 = useRef<THREE.Group>(null);
  const satRef3 = useRef<THREE.Group>(null);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    
    // Core spin
    if (crystalRef.current) {
      crystalRef.current.rotation.y = t * 0.25;
      crystalRef.current.rotation.x = t * 0.1;
    }
    if (crystalOuterRef.current) {
      crystalOuterRef.current.rotation.y = -t * 0.15;
      crystalOuterRef.current.rotation.z = t * 0.05;
    }
    
    // Gyroscope rings rotation
    if (ringsGroupRef.current) {
      if (ringsGroupRef.current.children[0]) {
        ringsGroupRef.current.children[0].rotation.z = t * 0.3;
      }
      if (ringsGroupRef.current.children[1]) {
        ringsGroupRef.current.children[1].rotation.x = t * 0.2;
      }
      if (ringsGroupRef.current.children[2]) {
        ringsGroupRef.current.children[2].rotation.y = -t * 0.15;
      }
    }

    // Orbiting traveler satellites (active members)
    if (satRef1.current) {
      const angle = t * 0.7;
      satRef1.current.position.set(
        Math.cos(angle) * 28,
        Math.sin(angle) * 8,
        Math.sin(angle) * 28
      );
    }
    if (satRef2.current) {
      const angle = t * 0.5 + 2.2;
      satRef2.current.position.set(
        Math.cos(angle) * 34,
        Math.cos(angle) * 12,
        Math.sin(angle) * 34
      );
    }
    if (satRef3.current) {
      const angle = -t * 0.6 + 4.4;
      satRef3.current.position.set(
        Math.sin(angle) * 31,
        Math.sin(angle) * -14,
        Math.cos(angle) * 31
      );
    }
  });

  const handleFocus = (e: any) => {
    e.stopPropagation();
    setSelectedGroupId(group.id);
    setGroupChatOpen(true);
    if (cameraControls.current) {
      cameraControls.current.setLookAt(
        position.x, position.y + 60, position.z + 120,
        position.x, position.y, position.z,
        true
      );
    }
  };

  return (
    <group position={position}>
      {/* Dynamic central point light */}
      <pointLight color={theme.inner} intensity={2.0} distance={100} decay={2} />

      {/* Layered Crystalline Core */}
      <group>
        {/* Core glow source */}
        <mesh>
          <sphereGeometry args={[5, 16, 16]} />
          <meshBasicMaterial
            color={theme.inner}
            transparent
            opacity={0.8}
            blending={THREE.AdditiveBlending}
          />
        </mesh>

        {/* Low-Poly facetted solid core */}
        <mesh ref={crystalRef}>
          <icosahedronGeometry args={[8.5, 1]} />
          <meshStandardMaterial
            color="#090d16"
            emissive={theme.inner}
            emissiveIntensity={0.65}
            roughness={0.05}
            metalness={0.98}
            flatShading={true}
          />
        </mesh>

        {/* Crystalline Holographic Outer Wireframe Shell */}
        <mesh ref={crystalOuterRef}>
          <icosahedronGeometry args={[11, 1]} />
          <meshBasicMaterial
            color={theme.inner}
            transparent
            opacity={0.3}
            wireframe={true}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
      </group>

      {/* Gyroscope rings */}
      <group ref={ringsGroupRef}>
        {/* Ring 1 - Inner (Horizontal) */}
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[20, 0.12, 8, 90]} />
          <meshBasicMaterial
            color={theme.inner}
            transparent
            opacity={0.65}
            blending={THREE.AdditiveBlending}
          />
        </mesh>

        {/* Ring 2 - Middle (Vertical X) */}
        <mesh rotation={[Math.PI / 4, Math.PI / 4, 0]}>
          <torusGeometry args={[26, 0.08, 8, 90]} />
          <meshBasicMaterial
            color={theme.outer}
            transparent
            opacity={0.5}
            blending={THREE.AdditiveBlending}
          />
        </mesh>

        {/* Ring 3 - Outer (Diagonal Z) */}
        <mesh rotation={[-Math.PI / 4, 0, Math.PI / 4]}>
          <torusGeometry args={[32, 0.05, 8, 90]} />
          <meshBasicMaterial
            color={theme.inner}
            transparent
            opacity={0.4}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      </group>

      {/* Active Traveler satellites */}
      <group ref={satRef1}>
        <mesh>
          <sphereGeometry args={[1.5, 16, 16]} />
          <meshBasicMaterial color={theme.inner} />
        </mesh>
        <pointLight color={theme.inner} intensity={1.5} distance={15} decay={2} />
      </group>

      <group ref={satRef2}>
        <mesh>
          <sphereGeometry args={[1.2, 16, 16]} />
          <meshBasicMaterial color={theme.outer} />
        </mesh>
        <pointLight color={theme.outer} intensity={1.0} distance={12} decay={2} />
      </group>

      <group ref={satRef3}>
        <mesh>
          <sphereGeometry args={[0.9, 16, 16]} />
          <meshBasicMaterial color={theme.inner} />
        </mesh>
        <pointLight color={theme.inner} intensity={0.8} distance={10} decay={2} />
      </group>

      {/* Interactive Raycast Target Sphere with Holographic Targeting Grid on hover */}
      <mesh 
        onClick={handleFocus}
        onPointerOver={() => { setHovered(true); document.body.style.cursor = 'pointer'; }}
        onPointerOut={() => { setHovered(false); document.body.style.cursor = 'default'; }}
      >
        <sphereGeometry args={[44, 24, 24]} />
        <meshBasicMaterial 
          color={theme.outer} 
          transparent 
          opacity={0.0001} 
          wireframe={true}
          blending={THREE.AdditiveBlending} 
          depthWrite={false} 
        />
      </mesh>

      {/* Hover/Visual Label */}
      {hovered && selectedGroupId !== group.id && (
        <Html position={[0, 60, 0]} center className="pointer-events-none select-none">
          <div 
            className="backdrop-blur-md border px-4 py-1.5 rounded-full text-white text-[10px] font-orbitron tracking-widest uppercase whitespace-nowrap shadow-lg flex items-center gap-2"
            style={{ 
              backgroundColor: 'rgba(0, 0, 0, 0.85)',
              borderColor: theme.inner || '#7c3aed',
              boxShadow: `0 0 15px ${(theme.inner || '#7c3aed')}40`
            }}
          >
            <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: theme.inner || '#7c3aed' }} />
            <span>{group.name}</span>
          </div>
        </Html>
      )}
    </group>
  );
}

// ─── TRANSMISSION SPACECRAFT ──────────────────────────────────────────────
function TransmissionSpacecraft({ transmission, onComplete }: { transmission: any, onComplete: (id: string) => void }) {
  const meshRef = useRef<THREE.Group>(null!);
  const [progress, setProgress] = useState(0);
  const [arrived, setArrived] = useState(false);
  const trailRef = useRef<THREE.Vector3[]>([]);
  const flashRef = useRef<THREE.Mesh>(null!);
  const [showToast, setShowToast] = useState(false);
  
  const orbitStats: Record<string, number> = {
    Mercury: 80, Venus: 110, Earth: 150, Mars: 190, Jupiter: 280, Saturn: 360, Uranus: 440, Neptune: 520, Pluto: 660
  };
  const orbitSpeed: Record<string, number> = {
    Mercury: 0.4, Venus: 0.25, Earth: 0.2, Mars: 0.16, Jupiter: 0.08, Saturn: 0.05, Uranus: 0.03, Neptune: 0.02, Pluto: 0.015
  };

  const orbit = orbitStats[transmission.targetPlanet] || 50;
  const speed = orbitSpeed[transmission.targetPlanet] || 0.1;

  useFrame((state, delta) => {
    if (arrived) {
      if (flashRef.current) {
        (flashRef.current.material as THREE.MeshBasicMaterial).opacity *= 0.8;
      }
      return;
    }

    const nextProgress = progress + delta / 3; // 3 seconds duration
    if (nextProgress >= 1) {
      setArrived(true);
      setShowToast(true);
      setTimeout(() => {
        setShowToast(false);
        onComplete(transmission.id);
      }, 2000);
      return;
    }
    setProgress(nextProgress);

    const time = state.clock.getElapsedTime();
    const planetTime = time * speed;
    
    const startPos = new THREE.Vector3(0, 0, 0);
    let curve;
    
    if (transmission.data?.isFutureSelf) {
      // Loop out from the Sun and back into the Sun
      curve = new THREE.CubicBezierCurve3(
        startPos,
        new THREE.Vector3(50, 60, 0),
        new THREE.Vector3(-50, 60, 0),
        startPos
      );
    } else {
      const targetPos = new THREE.Vector3();
      const planetObj = state.scene.getObjectByName(transmission.targetPlanet);
      if (planetObj) {
        planetObj.getWorldPosition(targetPos);
      } else {
        const targetX = Math.cos(planetTime) * orbit;
        const targetZ = Math.sin(planetTime) * orbit;
        targetPos.set(targetX, 0, targetZ);
      }
      const midPos = new THREE.Vector3(targetPos.x * 0.5, 20, targetPos.z * 0.5);
      curve = new THREE.QuadraticBezierCurve3(startPos, midPos, targetPos);
    }
    
    const pos = curve.getPoint(nextProgress);
    
    // Update trail
    trailRef.current.unshift(pos.clone());
    if (trailRef.current.length > 15) trailRef.current.pop();
    
    if (meshRef.current) {
      meshRef.current.position.copy(pos);
      const aheadPos = curve.getPoint(Math.min(1, nextProgress + 0.01));
      meshRef.current.lookAt(aheadPos);
    }
  });

  return (
    <group>
      {/* UFO Mesh */}
      {!arrived && (
        <group ref={meshRef}>
          {/* Main flattened body */}
          <mesh scale={[1, 0.25, 1]}>
            <sphereGeometry args={[1.2, 32, 32]} />
            <meshStandardMaterial color="#c0c0c0" metalness={0.9} roughness={0.1} emissive="#00ffff" emissiveIntensity={0.2} />
          </mesh>
          {/* Dome */}
          <mesh position={[0, 0.4, 0]}>
            <sphereGeometry args={[0.6, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <meshStandardMaterial color="#e0e0e0" metalness={0.9} roughness={0.1} emissive="#00ffff" emissiveIntensity={0.5} transparent opacity={0.8} />
          </mesh>
          <pointLight color="#00ffff" intensity={3} distance={15} />
        </group>
      )}

      {/* Particle Trail */}
      {!arrived && trailRef.current.map((pos, idx) => (
        <mesh key={idx} position={pos}>
          <sphereGeometry args={[0.15 * (1 - idx / 15), 8, 8]} />
          <meshBasicMaterial color="#00ffff" transparent opacity={1 - idx / 15} />
        </mesh>
      ))}

      {/* Arrival Flash */}
      {arrived && (
        <mesh ref={flashRef} position={trailRef.current[0] || [0, 0, 0]}>
          <sphereGeometry args={[6, 32, 32]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={1} blending={THREE.AdditiveBlending} depthWrite={false} />
        </mesh>
      )}

      {/* Toast Notification */}
      {showToast && (
        <Html center position={trailRef.current[0] || [0, 0, 0]}>
          <div className="bg-green-500/90 text-black px-6 py-3 rounded-full text-xs font-bold uppercase tracking-wider shadow-lg shadow-green-500/20 whitespace-nowrap animate-bounce pointer-events-none">
            ✉️ Letter launched!
          </div>
        </Html>
      )}
    </group>
  );
}

// ─── ASTEROID BELT ──────────────────────────────────────────────────────────
function AsteroidBelt() {
  const asteroidCount = 6000;
  const meshRef = useRef<THREE.InstancedMesh>(null!);
  const matRef = useRef<THREE.MeshStandardMaterial>(null!);
  
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const asteroidData = useMemo(() => {
    const data = [];
    for (let i = 0; i < asteroidCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 210 + Math.random() * 50; // between Mars (190) and Jupiter (280) orbits
      const heightVariation = (Math.random() - 0.5) * 4; // slight vertical spread
      
      const x = Math.cos(angle) * radius;
      const y = heightVariation;
      const z = Math.sin(angle) * radius;
      
      const rotX = Math.random() * Math.PI * 2;
      const rotY = Math.random() * Math.PI * 2;
      const rotZ = Math.random() * Math.PI * 2;
      
      const size = 0.1 + Math.pow(Math.random(), 3) * 0.8;
      const scaleX = size * (0.5 + Math.random() * 1.0);
      const scaleY = size * (0.5 + Math.random() * 0.8);
      const scaleZ = size * (0.5 + Math.random() * 1.0);
      
      // rotational speeds for tumbling
      const dRotX = (Math.random() - 0.5) * 0.02;
      const dRotY = (Math.random() - 0.5) * 0.02;
      const dRotZ = (Math.random() - 0.5) * 0.02;

      data.push({ x, y, z, rotX, rotY, rotZ, scaleX, scaleY, scaleZ, dRotX, dRotY, dRotZ, angle, radius });
    }
    return data;
  }, []);

  useEffect(() => {
    if (!meshRef.current) return;
    const colorVariants = ['#887766', '#776655', '#998877', '#665544', '#AAAAAA'];
    for (let i = 0; i < asteroidCount; i++) {
      meshRef.current.setColorAt(i, new THREE.Color(colorVariants[Math.floor(Math.random() * colorVariants.length)]));
    }
    meshRef.current.instanceColor!.needsUpdate = true;
  }, []);

  useFrame(({ camera }) => {
    if (!meshRef.current) return;
    
    if (matRef.current) {
      const dist = camera.position.length();
      matRef.current.opacity = 1.0 - THREE.MathUtils.smoothstep(dist, 1000, 2000);
    }
    
    for (let i = 0; i < asteroidCount; i++) {
      const d = asteroidData[i];
      // Tumble and slowly orbit
      d.rotX += d.dRotX; d.rotY += d.dRotY; d.rotZ += d.dRotZ;
      d.angle -= 0.0005 * (50 / d.radius); // Keplerian-ish orbit speed
      
      d.x = Math.cos(d.angle) * d.radius;
      d.z = Math.sin(d.angle) * d.radius;

      dummy.position.set(d.x, d.y, d.z);
      dummy.rotation.set(d.rotX, d.rotY, d.rotZ);
      dummy.scale.set(d.scaleX, d.scaleY, d.scaleZ);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, asteroidCount]}>
      <sphereGeometry args={[1, 4, 4]} />
      <meshStandardMaterial ref={matRef} roughness={1.0} metalness={0.0} color="#ffffff" transparent />
    </instancedMesh>
  );
}

// ─── KUIPER BELT ────────────────────────────────────────────────────────────
function KuiperBelt() {
  const objectCount = 4000;
  const meshRef = useRef<THREE.InstancedMesh>(null!);
  const matRef = useRef<THREE.MeshStandardMaterial>(null!);
  
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const dataList = useMemo(() => {
    const data = [];
    for (let i = 0; i < objectCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 550 + Math.random() * 80; // Outside Neptune (520) and before/around Pluto (660)
      const heightVariation = (Math.random() - 0.5) * 16;
      
      const rotX = Math.random() * Math.PI * 2;
      const rotY = Math.random() * Math.PI * 2;
      const rotZ = Math.random() * Math.PI * 2;
      
      const size = 0.1 + Math.random() * 0.5;
      const scaleX = size * (0.8 + Math.random() * 0.4);
      const scaleY = size * (0.8 + Math.random() * 0.4);
      const scaleZ = size * (0.8 + Math.random() * 0.4);
      
      const dRotX = (Math.random() - 0.5) * 0.01;
      const dRotY = (Math.random() - 0.5) * 0.01;
      const dRotZ = (Math.random() - 0.5) * 0.01;

      data.push({ y: heightVariation, rotX, rotY, rotZ, scaleX, scaleY, scaleZ, dRotX, dRotY, dRotZ, angle, radius });
    }
    return data;
  }, []);

  useEffect(() => {
    if (!meshRef.current) return;
    const colors = ['#AABBCC', '#8899AA', '#CCDDEE'];
    for (let i = 0; i < objectCount; i++) {
      meshRef.current.setColorAt(i, new THREE.Color(colors[Math.floor(Math.random() * colors.length)]));
    }
    meshRef.current.instanceColor!.needsUpdate = true;
  }, []);

  useFrame(({ camera }) => {
    if (!meshRef.current) return;
    
    if (matRef.current) {
      const dist = camera.position.length();
      const fadeIn = THREE.MathUtils.smoothstep(dist, 200, 400);
      const fadeOut = 1.0 - THREE.MathUtils.smoothstep(dist, 1500, 2500);
      matRef.current.opacity = fadeIn * fadeOut;
    }
    
    for (let i = 0; i < objectCount; i++) {
      const d = dataList[i];
      d.rotX += d.dRotX; d.rotY += d.dRotY; d.rotZ += d.dRotZ;
      d.angle -= 0.0001 * (155 / d.radius);
      
      const x = Math.cos(d.angle) * d.radius;
      const z = Math.sin(d.angle) * d.radius;

      dummy.position.set(x, d.y, z);
      dummy.rotation.set(d.rotX, d.rotY, d.rotZ);
      dummy.scale.set(d.scaleX, d.scaleY, d.scaleZ);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, objectCount]}>
      <sphereGeometry args={[1, 4, 4]} />
      <meshStandardMaterial ref={matRef} roughness={0.9} metalness={0.1} color="#ffffff" transparent />
    </instancedMesh>
  );
}

// ─── OORT CLOUD (spherical shell) ────────────────────────────────────────────
function OortCloud() {
  const count = 3000;
  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const r     = 750 + Math.random() * 1250;
      const theta = Math.random() * Math.PI * 2;
      const phi   = Math.acos(2 * Math.random() - 1);
      pos[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.cos(phi);
      pos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    }
    return pos;
  }, []);

  const matRef = useRef<THREE.PointsMaterial>(null!);

  useFrame(({ camera }) => {
    if (matRef.current) {
      matRef.current.opacity = THREE.MathUtils.smoothstep(camera.position.length(), 1500, 3000) * 0.18;
    }
  });

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} count={count} array={positions} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial ref={matRef} color="#b0c8d8" size={2.8} sizeAttenuation transparent blending={THREE.AdditiveBlending} depthWrite={false} map={getCircleTexture()} alphaTest={0.01} />
    </points>
  );
}


// ─── DWARF PLANET ─────────────────────────────────────────────────────────────
function DwarfPlanet({ name, orbit, radius, color = '#8a7a6a', speed, textureUrl, hasRings = false, initialAngle = 0, friendData, unreadCount = 0 }: any) {
  const groupRef = useRef<THREE.Group>(null!);
  const meshRef  = useRef<THREE.Mesh>(null!);
  const [hovered, setHovered] = useState(false);
  const texture = useLoader(TextureLoader, textureUrl || 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7');

  const isAssigned = !!friendData;

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime() * speed * 0.375 + initialAngle;
    groupRef.current.position.x = Math.cos(t) * orbit;
    groupRef.current.position.z = Math.sin(t) * orbit;
    groupRef.current.position.y = Math.sin(t * 1.7) * orbit * 0.07;
    meshRef.current.rotation.y += 0.003;
  });

  return (
    <group>
      <group ref={groupRef}
        name={name}
        onPointerOver={() => { setHovered(true); document.body.style.cursor = 'pointer'; }}
        onPointerOut={() => { setHovered(false); document.body.style.cursor = 'default'; }}
      >
        <mesh ref={meshRef}>
          <sphereGeometry args={[radius, 32, 32]} />
          {textureUrl
            ? <meshStandardMaterial map={texture as THREE.Texture} roughness={0.7} metalness={0.0} emissive="#111111" emissiveIntensity={0.12} />
            : <meshStandardMaterial color={color} roughness={0.7} metalness={0.0} emissive="#111111" emissiveIntensity={0.12} />}
        </mesh>
        {hasRings && (
          <mesh rotation={[0.4, 0, 0]}>
            <ringGeometry args={[radius * 1.6, radius * 2.8, 64]} />
            <meshBasicMaterial color="#c8b89a" transparent opacity={0.4} side={THREE.DoubleSide} />
          </mesh>
        )}

        {/* Show name label on hover ONLY when a friend is assigned */}
        {hovered && isAssigned && (
          <Html position={[0, radius + 1.5, 0]} center>
            <div className="bg-black/80 backdrop-blur-md border border-amber-500/30 px-3 py-1 rounded-full text-white text-[10px] font-orbitron tracking-widest uppercase whitespace-nowrap shadow-lg flex items-center gap-1.5">
              {unreadCount > 0 && (
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse inline-block" />
              )}
              {name}
            </div>
          </Html>
        )}
      </group>
    </group>
  );
}

// ─── MAIN SOLAR SYSTEM ──────────────────────────────────────────────────────

// ─── DOUBLE CLICK ZOOM ──────────────────────────────────────────────────────
function DoubleClickZoom() {
  const { camera, gl, raycaster } = useThree();
  const cameraControlsRef = useCamera();
  
  const lastDoubleClickPos = useRef<THREE.Vector3 | null>(null);
  const isZoomedIn = useRef(false);
  const previousCameraState = useRef<{ position: THREE.Vector3, target: THREE.Vector3 } | null>(null);


  const handleDoubleClick = useCallback((event: MouseEvent) => {
    const canvas = event.target as HTMLCanvasElement;
    const rect = canvas.getBoundingClientRect();
    
    const mouse = new THREE.Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1
    );
    
    raycaster.setFromCamera(mouse, camera);
    
    if (!isZoomedIn.current) {
      previousCameraState.current = {
        position: camera.position.clone(),
        target: cameraControlsRef.current?.getTarget(new THREE.Vector3()) || new THREE.Vector3(),
      };
      
      const targetPoint = raycaster.ray.at(
        Math.min(camera.position.length() * 0.5, 500),
        new THREE.Vector3()
      );
      
      const newPosition = camera.position.clone().lerp(targetPoint, 0.55);
      
      cameraControlsRef.current?.setLookAt(
        newPosition.x, newPosition.y, newPosition.z,
        targetPoint.x, targetPoint.y, targetPoint.z,
        true
      );
      
      isZoomedIn.current = true;
      lastDoubleClickPos.current = targetPoint;
      
    } else {
      const prev = previousCameraState.current;
      if (prev) {
        cameraControlsRef.current?.setLookAt(
          prev.position.x, prev.position.y, prev.position.z,
          prev.target.x, prev.target.y, prev.target.z,
          true
        );
      }
      isZoomedIn.current = false;
      lastDoubleClickPos.current = null;
    }
    
  }, [camera, cameraControlsRef, raycaster]);

  useEffect(() => {
    const canvas = gl.domElement;
    canvas.addEventListener('dblclick', handleDoubleClick);
    return () => canvas.removeEventListener('dblclick', handleDoubleClick);
  }, [gl.domElement, handleDoubleClick]);

  return null;
}

// ─── CAMERA DISTANCE TRACKER ────────────────────────────────────────────────
function CameraDistanceTracker({ onChange }: { onChange: (visible: boolean) => void }) {
  useFrame(({ camera }) => {
    const dist = camera.position.length();
    onChange(dist > 550 || dist < 420);
  });
  return null;
}

// ─── SCENE CLEANUP DISPOSAL ──────────────────────────────────────────────────
function SceneCleanup() {
  const { scene, gl } = useThree();
  useEffect(() => {
    return () => {
      scene.traverse((object: any) => {
        if (object.geometry) {
          object.geometry.dispose();
        }
        if (object.material) {
          if (Array.isArray(object.material)) {
            object.material.forEach((mat: any) => {
              if (mat.map) mat.map.dispose();
              mat.dispose();
            });
          } else {
            if (object.material.map) object.material.map.dispose();
            object.material.dispose();
          }
        }
      });
      gl.dispose();
    };
  }, [scene, gl]);
  return null;
}

export default function SolarSystem({ hideReturnButton }: { hideReturnButton?: boolean }) {
  const cameraControlsRef = useRef<CameraControls>(null);
  const [isZoomedOut, setIsZoomedOut] = useState(false);

  useEffect(() => {
    if (cameraControlsRef.current) {
      cameraControlsRef.current.setLookAt(-320, 110, -360, 0, 0, 0, false);
    }
  }, []);

  const { assignments, unreadCount, activeTransmissions, removeTransmission, groups, letters, isGroupChatOpen } = useAppStore();

  const getPlanetUnreadCount = (planetName: string) => {
    const friendId = assignments.find(a => a.planetName === planetName)?.friend?.id;
    if (!friendId) return 0;
    return letters.filter(l => !l.isRead && l.senderId === friendId).length;
  };

  const getFriendData = (planetName: string) => {
    return assignments.find(a => a.planetName === planetName)?.friend || null;
  };

  return (
    <CameraContext.Provider value={cameraControlsRef}>
      <div className="w-full h-full bg-[#000005]">
        <Canvas
          gl={{
            logarithmicDepthBuffer: true,
            antialias: true,
            toneMapping: THREE.ACESFilmicToneMapping,
            toneMappingExposure: 1.2,
            outputColorSpace: THREE.SRGBColorSpace,
          }}
          camera={{ fov: 60, near: 0.001, far: 9999999, position: [-320, 110, -360] }}
          className="solar-canvas"
        >
          <CameraControls
            ref={cameraControlsRef}
            minDistance={8}
            maxDistance={120000}
            minPolarAngle={0.1}
            maxPolarAngle={Math.PI * 0.65}
            dampingFactor={0.05}
            dollyToCursor={false}
            makeDefault
          />
          <SceneCleanup />

          <DoubleClickZoom />

          <Suspense fallback={null}>
            <SpaceBackground />
            <Comets />
            <DeepSpaceLayers />
            <CameraDistanceTracker onChange={setIsZoomedOut} />
            
            <Sun unreadCount={unreadCount} />
            
            {/* INNER PLANETS */}
            <Planet name="Mercury" orbit={80} radius={4.8} textureUrl="/textures/2k_mercury.jpg" speed={0.4} unreadCount={getPlanetUnreadCount('Mercury')} friendData={getFriendData('Mercury')} initialAngle={0.8} emissive="#1a1a1a" emissiveIntensity={0.05} />
            <Planet name="Venus" orbit={110} radius={11.2} textureUrl="/textures/2k_venus_surface.jpg" atmosphere={true} atmosphereTextureUrl="/textures/2k_venus_atmosphere.jpg" speed={0.25} unreadCount={getPlanetUnreadCount('Venus')} friendData={getFriendData('Venus')} initialAngle={2.1} emissive="#332211" emissiveIntensity={0.05} />
            <Planet name="Earth" orbit={150} radius={12.0} textureUrl="/textures/2k_earth_daymap.jpg" atmosphere={true} atmosphereTextureUrl="/textures/2k_earth_clouds.jpg" speed={0.2} unreadCount={getPlanetUnreadCount('Earth')} friendData={getFriendData('Earth')} initialAngle={3.7} emissive="#001133" emissiveIntensity={0.05} />
            <Planet name="Mars" orbit={190} radius={6.5} textureUrl="/textures/2k_mars.jpg" speed={0.16} unreadCount={getPlanetUnreadCount('Mars')} friendData={getFriendData('Mars')} initialAngle={1.3} emissive="#220500" emissiveIntensity={0.05} />

            {/* OUTER PLANETS */}
            <Planet name="Jupiter" orbit={280} radius={31.5} textureUrl="/textures/2k_jupiter.jpg" speed={0.08} unreadCount={getPlanetUnreadCount('Jupiter')} friendData={getFriendData('Jupiter')} initialAngle={4.9} emissive="#1a0f00" emissiveIntensity={0.05} />
            <Planet name="Saturn" orbit={360} radius={26.2} textureUrl="/textures/2k_saturn.jpg" hasRings={true} ringTextureUrl="/textures/2k_saturn_ring_alpha.png" speed={0.05} unreadCount={getPlanetUnreadCount('Saturn')} friendData={getFriendData('Saturn')} initialAngle={0.4} emissive="#1a1500" emissiveIntensity={0.05} />
            <Planet name="Uranus" orbit={440} radius={18.0} textureUrl="/textures/2k_uranus.jpg" speed={0.03} unreadCount={getPlanetUnreadCount('Uranus')} friendData={getFriendData('Uranus')} initialAngle={5.8} emissive="#001a1a" emissiveIntensity={0.05} />
            <Planet name="Neptune" orbit={520} radius={17.0} textureUrl="/textures/2k_neptune.jpg" speed={0.02} unreadCount={getPlanetUnreadCount('Neptune')} friendData={getFriendData('Neptune')} initialAngle={2.9} emissive="#000f1a" emissiveIntensity={0.05} />
            <Planet name="Pluto" orbit={660} radius={8.5} textureUrl="/textures/2k_eris_fictional.jpg" speed={0.015} unreadCount={getPlanetUnreadCount('Pluto')} friendData={getFriendData('Pluto')} initialAngle={4.2} emissive="#3a2a2a" emissiveIntensity={0.3} />

            {/* ── ASTEROID BELT (Mars 190 — Jupiter 280) ── */}
            <AsteroidBelt />

            {/* ── DWARF PLANETS ── */}
            <DwarfPlanet name="Haumea"   orbit={710} radius={6.0} color="#d4c8b8"  speed={0.007} hasRings={true} initialAngle={5.2} friendData={getFriendData('Haumea')}   unreadCount={getPlanetUnreadCount('Haumea')} />
            <DwarfPlanet name="Makemake" orbit={750} radius={6.5} color="#c4826a" speed={0.006} initialAngle={2.7} friendData={getFriendData('Makemake')} unreadCount={getPlanetUnreadCount('Makemake')} />
            <DwarfPlanet name="Eris"     orbit={800} radius={7.0} color="#d8d0c8" speed={0.005} initialAngle={0.5} friendData={getFriendData('Eris')}     unreadCount={getPlanetUnreadCount('Eris')} />

            {/* ── KUIPER BELT (beyond Neptune 520) ── */}
            <KuiperBelt />

            {/* ── OORT CLOUD ── */}
            <OortCloud />



            {/* Active Letter Transmissions */}
            {activeTransmissions.map((t) => (
              <TransmissionSpacecraft key={t.id} transmission={t} onComplete={removeTransmission} />
            ))}

            {/* Group Chat Nebulas */}
            {groups.map((g, i) => (
              <GroupNebula key={g.id} group={g} index={i} />
            ))}
          </Suspense>

          
          {/* Ambient fill: dark side is dim blue-black, not invisible */}
          {/* Ambient fill — dark-side illumination so no planet face is pitch black */}
          <ambientLight intensity={0.18} color="#1a2d44" />
          {/* Hemisphere sky/ground light for soft warm-cold contrast */}
          <hemisphereLight args={['#1a2040', '#0a0a0a', 0.25]} />

          <EffectComposer>
            <Bloom intensity={1.8} luminanceThreshold={0.2} luminanceSmoothing={0.9} mipmapBlur={true} />
            <Vignette eskil={false} offset={0.1} darkness={0.6} />
          </EffectComposer>
        </Canvas>

        {/* Viewport-steady Return Button Overlay */}
        {isZoomedOut && !hideReturnButton && !isGroupChatOpen && (
          <div className="return-btn-container absolute bottom-6 left-6 z-[100] pointer-events-auto">
            <button
              onClick={() => cameraControlsRef.current?.setLookAt(-320, 110, -360, 0, 0, 0, true)}
              className="return-btn px-6 py-3 bg-[#050510]/60 backdrop-blur-xl border border-[#D4AF37]/50 text-[#D4AF37] text-xs font-bold uppercase tracking-widest rounded-full hover:bg-[#D4AF37] hover:text-black transition-all shadow-[0_0_15px_rgba(212,175,55,0.3)] font-orbitron whitespace-nowrap"
            >
              ⌂ Return to Solar System
            </button>
          </div>
        )}
      </div>
    </CameraContext.Provider>
  );
}
