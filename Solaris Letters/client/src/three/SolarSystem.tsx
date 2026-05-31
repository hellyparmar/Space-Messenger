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

  // ── Thermal gradient (white-hot → gold → orange → deep crimson) ────────────
  vec3 col;
  if      (t < 0.05) col = mix(vec3(1.00,1.00,0.98), vec3(1.00,0.92,0.65), t/0.05);
  else if (t < 0.20) col = mix(vec3(1.00,0.92,0.65), vec3(1.00,0.70,0.10), (t-0.05)/0.15);
  else if (t < 0.45) col = mix(vec3(1.00,0.70,0.10), vec3(0.98,0.30,0.02), (t-0.20)/0.25);
  else if (t < 0.72) col = mix(vec3(0.98,0.30,0.02), vec3(0.60,0.08,0.01), (t-0.45)/0.27);
  else               col = mix(vec3(0.60,0.08,0.01), vec3(0.12,0.01,0.00), (t-0.72)/0.28);

  // ── Photon ring — ultra-sharp bright halo at innermost edge ────────────────
  float pRing1 = exp(-abs(r - inner - 0.008) * 130.0);  // primary photon ring
  float pRing2 = exp(-abs(r - inner - 0.022) * 80.0);   // secondary lensed image
  col += vec3(1.00,0.97,0.85) * pRing1 * 6.0;
  col += vec3(1.00,0.85,0.55) * pRing2 * 2.5;

  // ── Relativistic Doppler — approaching side brighter, bluer, hotter ────────
  // Static asymmetry (no geometry spin): left side approaches, right recedes
  float dop = 0.35 + 0.90 * (sin(ang) * 0.5 + 0.5);
  col *= pow(dop, 1.8);           // beaming: I ∝ dop^4 approx; use 1.8 for cinematic feel
  col.b += max(0.0, sin(ang)) * 0.22;

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
  const discUniforms = useMemo(() => ({ uTime: { value: 0 }, uOpacity: { value: 0 } }), []);

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

      {/* ── 3. Event horizon sphere — pure black, writes depth, occludes disc ── */}
      {/* Clickable — opens blackhole panel showing deleted/blocked users */}
      <mesh
        position={P}
        renderOrder={2}
        onClick={e => { e.stopPropagation(); setBlackholeOpen(true); }}
        onPointerOver={() => { document.body.style.cursor = 'pointer'; }}
        onPointerOut={() => { document.body.style.cursor = 'default'; }}
      >
        <sphereGeometry args={[R * 1.01, 96, 96]} />
        <meshBasicMaterial color="#000000" depthWrite={true} />
      </mesh>


      {/* ── 5. Photon ring sprite (tight bright halo around sphere) ── */}
      <sprite position={P} scale={[R * 7, R * 7, 1]}>
        <spriteMaterial ref={photonRef} map={photonTex} transparent
          blending={THREE.AdditiveBlending} depthWrite={false} opacity={0} />
      </sprite>
    </group>
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

// ─── MILKY WAY DUST LANES (particle-only, no line geometry) ─────────────────
function GalaxyDustLanes({ offsetX = 0 }: { offsetX?: number }) {
  const dustRef = useRef<THREE.Points>(null!);

  const { pos, col } = useMemo(() => {
    const COUNT = 22000;
    const pos = new Float32Array(COUNT * 3);
    const col = new Float32Array(COUNT * 3);
    let idx = 0;
    const ARM_PAIRS = 2;
    for (let i = 0; i < COUNT * 4 && idx < COUNT; i++) {
      const arm    = i % ARM_PAIRS;
      const t      = 0.1 + Math.pow(Math.random(), 1.2) * 0.82;
      // Offset between spiral arms — dust lanes sit between them
      const baseAng = arm * Math.PI + Math.PI / ARM_PAIRS;
      const wind    = t * Math.PI * 3.0;
      const theta   = baseAng + wind;
      const r       = 200 + t * 5200;
      const scatter = 90 + t * 380;
      const rOff    = (Math.random() - 0.5) * scatter;
      // Realistic 3D thickness: thin disc
      const yMax    = t < 0.15 ? r * 0.18 : t < 0.4 ? 60 - t * 110 : 15 + Math.random() * 10;
      const yOff    = (Math.random() - 0.5) * Math.max(5, yMax);

      pos[idx*3]   = Math.cos(theta) * (r + rOff) + offsetX;
      pos[idx*3+1] = yOff;
      pos[idx*3+2] = Math.sin(theta) * (r + rOff);

      // Dark brownish-amber dust color (absorbs light — rendered dim)
      const tone = 0.3 + Math.random() * 0.15;
      col[idx*3]   = tone * 0.9;
      col[idx*3+1] = tone * 0.55;
      col[idx*3+2] = tone * 0.18;
      idx++;
    }
    return { pos: pos.slice(0, idx * 3), col: col.slice(0, idx * 3) };
  }, [offsetX]);

  const dustTex = useMemo(() => {
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const ctx = c.getContext('2d')!;
    const g = ctx.createRadialGradient(32,32,0,32,32,32);
    g.addColorStop(0,   'rgba(255,200,80,0.9)');
    g.addColorStop(0.3, 'rgba(255,160,40,0.4)');
    g.addColorStop(1,   'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.fillRect(0,0,64,64);
    return new THREE.CanvasTexture(c);
  }, []);

  useFrame(({ camera }) => {
    const op = THREE.MathUtils.smoothstep(camera.position.length(), 2000, 5500);
    if (dustRef.current) (dustRef.current.material as THREE.PointsMaterial).opacity = op * 0.18;
  });

  const count = pos.length / 3;

  return (
    <points ref={dustRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[pos, 3]} count={count} array={pos} itemSize={3} />
        <bufferAttribute attach="attributes-color"    args={[col, 3]} count={count} array={col} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial size={1.5} vertexColors transparent opacity={0}
        blending={THREE.AdditiveBlending} sizeAttenuation depthWrite={false}
        map={dustTex} alphaTest={0.001} />
    </points>
  );
}

// ─── MILKY WAY VOLUMETRIC HAZE DISK (dense 3D gas/dust clouds) ──────────────
interface VolumetricHazeDiskProps {
  offsetX?: number;
  offsetY?: number;
  scaleY?: number;
  rotation?: number;
  opacityMultiplier?: number;
  count?: number;
  size?: number;
  colorShift?: number;
}

function VolumetricHazeDisk({
  offsetX = 0,
  offsetY = 0,
  scaleY = 1.0,
  rotation = 0,
  opacityMultiplier = 1.0,
  count = 200000,
  size = 46,
  colorShift = 0.0
}: VolumetricHazeDiskProps) {
  const hazeRef = useRef<THREE.Points>(null!);

  const { pos, col } = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      // Expanded annular distribution spanning from core to outer arms
      const r = 400 + Math.pow(Math.random(), 0.85) * 8200;
      // Rotation creates natural swirling offsets between stacked disks
      const theta = Math.random() * Math.PI * 2 + rotation;

      // Volumetric thickness: thicker near bulge/core, tapering out
      const ySpread = Math.max(15, 185 - (r / 8600) * 155) * scaleY;
      const yOff = (Math.random() - 0.5) * ySpread * 2 + offsetY;

      pos[i * 3]     = Math.cos(theta) * r + offsetX;
      pos[i * 3 + 1] = yOff;
      pos[i * 3 + 2] = Math.sin(theta) * r;

      // Stunning, realistic rich indigo, deep blue, violet, and ionized teal gradient
      const normR = (r - 400) / 8200; // 0..1
      let baseR = 0.15;
      let baseG = 0.08;
      let baseB = 0.85;

      const isTeal = Math.random() < 0.12 && normR > 0.28 && normR < 0.72;

      if (isTeal) {
        // Ionized oxygen OIII pockets (vibrant cyan-teal)
        baseR = 0.05;
        baseG = 0.85;
        baseB = 0.80;
      } else if (normR < 0.35) {
        // Inner disk: glowing deep purple/indigo/magenta
        baseR = 0.38 + (0.35 - normR) * 0.25;
        baseG = 0.08;
        baseB = 0.98;
      } else if (normR < 0.75) {
        // Mid disk: brilliant blue/violet haze
        baseR = 0.14;
        baseG = 0.20 + (0.75 - normR) * 0.14;
        baseB = 0.98;
      } else {
        // Outer disk: dark, faint space blue gas
        baseR = 0.05;
        baseG = 0.10;
        baseB = 0.75;
      }

      // Apply colorShift to create distinct warm/cool temperature layers
      if (colorShift !== 0) {
        baseR = Math.max(0, Math.min(1, baseR + colorShift * 0.15));
        baseB = Math.max(0, Math.min(1, baseB - colorShift * 0.15));
      }

      // Add a bit of natural variance so the cloud colors look organic
      col[i * 3]     = Math.max(0, Math.min(1, baseR + (Math.random() - 0.5) * 0.05));
      col[i * 3 + 1] = Math.max(0, Math.min(1, baseG + (Math.random() - 0.5) * 0.05));
      col[i * 3 + 2] = Math.max(0, Math.min(1, baseB + (Math.random() - 0.5) * 0.05));
    }
    return { pos, col };
  }, [offsetX, offsetY, scaleY, rotation, count, colorShift]);

  const hazeTex = useMemo(() => {
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const ctx = c.getContext('2d')!;
    const g = ctx.createRadialGradient(64,64,0, 64,64,64);
    g.addColorStop(0,   'rgba(255,255,255,1.0)');
    g.addColorStop(0.15, 'rgba(255,255,255,0.85)');
    g.addColorStop(0.4,  'rgba(255,255,255,0.45)');
    g.addColorStop(0.7,  'rgba(255,255,255,0.12)');
    g.addColorStop(1,   'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.fillRect(0,0,128,128);
    return new THREE.CanvasTexture(c);
  }, []);

  useFrame(({ camera }) => {
    const op = THREE.MathUtils.smoothstep(camera.position.length(), 2000, 5500);
    // Layered, extremely rich and dense volumetric haze glow
    if (hazeRef.current) (hazeRef.current.material as THREE.PointsMaterial).opacity = op * 0.165 * opacityMultiplier;
  });

  return (
    <points ref={hazeRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[pos, 3]} count={count} array={pos} itemSize={3} />
        <bufferAttribute attach="attributes-color"    args={[col, 3]} count={count} array={col} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial 
        size={size} 
        vertexColors 
        transparent 
        opacity={0}
        blending={THREE.AdditiveBlending} 
        sizeAttenuation 
        depthWrite={false}
        map={hazeTex} 
        alphaTest={0.001} 
      />
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
  // Refs
  const arm1Ref   = useRef<THREE.Points>(null!);
  const arm2Ref   = useRef<THREE.Points>(null!);
  const coreRef   = useRef<THREE.Points>(null!);
  const haloRef   = useRef<THREE.Points>(null!);
  const groupRef  = useRef<THREE.Group>(null!);
  const bulgeRef  = useRef<THREE.Sprite>(null!);
  const outerRef  = useRef<THREE.Sprite>(null!);

  // ── Soft star particle texture ──────────────────────────────────────────
  const starTex = useMemo(() => {
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const ctx = c.getContext('2d')!;
    const g = ctx.createRadialGradient(32,32,0,32,32,32);
    g.addColorStop(0,   'rgba(255,255,255,1)');
    g.addColorStop(0.1, 'rgba(255,255,255,0.9)');
    g.addColorStop(0.35,'rgba(255,255,255,0.35)');
    g.addColorStop(0.7, 'rgba(255,255,255,0.07)');
    g.addColorStop(1,   'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.fillRect(0,0,64,64);
    return new THREE.CanvasTexture(c);
  }, []);

  // ── Central bulge glow (CHANGE 5) ──────────────────────────────────────
  const bulgeTex = useMemo(() => {
    const c = document.createElement('canvas'); c.width = c.height = 512;
    const ctx = c.getContext('2d')!;
    const g = ctx.createRadialGradient(256,256,0,256,256,256);
    g.addColorStop(0,    'rgba(255,255,255,1)');
    g.addColorStop(0.05, 'rgba(255,252,230,1)');
    g.addColorStop(0.15, 'rgba(255,235,150,0.9)');
    g.addColorStop(0.32, 'rgba(255,200,80,0.55)');
    g.addColorStop(0.55, 'rgba(200,130,30,0.18)');
    g.addColorStop(0.8,  'rgba(80,40,0,0.05)');
    g.addColorStop(1,    'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.fillRect(0,0,512,512);
    return new THREE.CanvasTexture(c);
  }, []);

  // ── Outer disc haze ────────────────────────────────────────────────────
  const outerTex = useMemo(() => {
    const c = document.createElement('canvas'); c.width = c.height = 512;
    const ctx = c.getContext('2d')!;
    const g = ctx.createRadialGradient(256,256,30,256,256,256);
    g.addColorStop(0,    'rgba(60,30,120,0)');
    g.addColorStop(0.3,  'rgba(40,20,100,0.35)');
    g.addColorStop(0.6,  'rgba(20,10,70,0.45)');
    g.addColorStop(0.85, 'rgba(8,4,40,0.15)');
    g.addColorStop(1,    'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.fillRect(0,0,512,512);
    return new THREE.CanvasTexture(c);
  }, []);

  // ── Galaxy particle data ────────────────────────────────────────────────
  const gData = useMemo(() => {
    const OX = -2750;
    const ARM_MAX  = 220000;
    const CORE_MAX = 55000;
    const HALO_MAX = 14000;

    // Pre-allocate at max, we'll compact by skipping inter-arm voids
    const a1pBuf = new Float32Array(ARM_MAX * 3); const a1cBuf = new Float32Array(ARM_MAX * 3);
    const a2pBuf = new Float32Array(ARM_MAX * 3); const a2cBuf = new Float32Array(ARM_MAX * 3);
    const cpBuf  = new Float32Array(CORE_MAX * 3); const ccBuf  = new Float32Array(CORE_MAX * 3);
    const hpBuf  = new Float32Array(HALO_MAX * 3);

    // ── REALISTIC STAR COLORS (CHANGE 2) ──────────────────────────────
    // Returns [r,g,b] 0-1 based on stellar type and arm position
    const starColor = (t: number, isCore: boolean): [number,number,number] => {
      if (isCore) {
        // Core dominated by warm yellow-white and orange (older stars)
        const roll = Math.random();
        if (roll < 0.45) return [1.0, 0.96, 0.85];       // warm white #FFF5E0
        if (roll < 0.75) return [1.0, 0.82, 0.50];       // yellow-orange #FFD080
        return [1.0, 0.53, 0.27];                          // orange-red #FF8844
      }
      // Arms: bluer stars as we go outward
      const outerBias = Math.pow(t, 0.8);
      const roll = Math.random();
      if (roll < 0.35 * outerBias + 0.05) {
        // Blue-white young hot stars (#A8CCFF)
        return [0.66, 0.80, 1.0];
      } else if (roll < 0.75) {
        // Warm white main sequence (#FFF5E0)
        return [1.0, 0.96, 0.88];
      } else if (roll < 0.90) {
        // Yellow-orange older stars (#FFD080)
        return [1.0, 0.82, 0.50];
      } else {
        // Orange-red giants (#FF8844)
        return [1.0, 0.53, 0.27];
      }
    };

    // ── Arm distance from nearest arm centerline ───────────────────────
    // Used for CHANGE 4: dust lane probability
    const distToNearestArm = (theta: number, r: number): number => {
      let minDist = Infinity;
      for (let a = 0; a < 2; a++) {
        const baseAng = a * Math.PI;
        const t = Math.max(0, Math.min(1, (r - 180) / 5600));
        const armTheta = baseAng + t * Math.PI * 3.4;
        // Angular distance (wrapped)
        let dTheta = Math.abs(theta - armTheta) % (Math.PI * 2);
        if (dTheta > Math.PI) dTheta = Math.PI * 2 - dTheta;
        minDist = Math.min(minDist, dTheta * r); // arc length ≈ r * dTheta
      }
      return minDist;
    };

    // ── Fill one spiral arm ────────────────────────────────────────────
    const fillArm = (
      pos: Float32Array, col: Float32Array, baseAngle: number
    ): number => {
      let idx = 0;
      let attempts = 0;
      const maxAttempts = ARM_MAX * 3;
      while (idx < ARM_MAX && attempts < maxAttempts) {
        attempts++;
        const t     = Math.pow(Math.random(), 1.1);
        const wind  = t * Math.PI * 3.4;
        const theta = baseAngle + wind;
        const r     = 180 + t * 5600;

        // CHANGE 4: Skip particles in inter-arm voids with 65% probability
        const armDist = distToNearestArm(theta, r);
        const armWidthThreshold = 320 + t * 900; // gets wider outward
        if (armDist > armWidthThreshold && Math.random() < 0.65) continue;

        // Arm width: narrow near core, flaring outward (CHANGE 3 partial)
        const width  = 40 + t * 480;
        const rOff   = (Math.random() - 0.5) * width * (0.3 + Math.random() * 0.7);

        // CHANGE 3: Realistic 3D thickness (lens shape)
        let ySpread: number;
        const normR = r / 5780; // 0..1
        if (normR < 0.15) {
          ySpread = r * 0.35;                     // bulge region: ±35% of r
        } else if (normR < 0.4) {
          ySpread = 200 - (normR - 0.15) / 0.25 * 160; // taper 200→40
        } else {
          ySpread = 15 + Math.random() * 10;     // thin disc: ±15-25
        }
        const yOff = (Math.random() - 0.5) * ySpread * 2;

        pos[idx*3]   = Math.cos(theta) * (r + rOff) + OX;
        pos[idx*3+1] = yOff;
        pos[idx*3+2] = Math.sin(theta) * (r + rOff);

        const [cr, cg, cb] = starColor(t, false);
        col[idx*3] = cr; col[idx*3+1] = cg; col[idx*3+2] = cb;
        idx++;
      }
      return idx;
    };

    const a1Count = fillArm(a1pBuf, a1cBuf, 0);
    const a2Count = fillArm(a2pBuf, a2cBuf, Math.PI);

    // ── Dense core: power-law distribution with golden bulge ──────────
    let coreCount = 0;
    for (let i = 0; i < CORE_MAX; i++) {
      const r  = Math.pow(Math.random(), 2.0) * 1100;
      const th = Math.random() * Math.PI * 2;
      // CHANGE 3: Bulge thickness ±35% of r
      const ySpread = r < 0.15 * 1100 ? r * 0.35 : Math.max(8, r * 0.12);
      cpBuf[i*3]   = Math.cos(th) * r + OX;
      cpBuf[i*3+1] = (Math.random() - 0.5) * ySpread * 2;
      cpBuf[i*3+2] = Math.sin(th) * r;
      const [cr, cg, cb] = starColor(r/1100, true);
      ccBuf[i*3] = cr; ccBuf[i*3+1] = cg; ccBuf[i*3+2] = cb;
      coreCount++;
    }

    // ── Old halo stars (spheroidal, warm-white to red) ─────────────────
    for (let i = 0; i < HALO_MAX; i++) {
      const r   = 700 + Math.pow(Math.random(), 1.8) * 10000;
      const th  = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      hpBuf[i*3]   = Math.sin(phi)*Math.cos(th)*r + OX;
      hpBuf[i*3+1] = Math.cos(phi)*r * 0.12;
      hpBuf[i*3+2] = Math.sin(phi)*Math.sin(th)*r;
    }

    return {
      a1p: a1pBuf.slice(0, a1Count*3), a1c: a1cBuf.slice(0, a1Count*3), a1Count,
      a2p: a2pBuf.slice(0, a2Count*3), a2c: a2cBuf.slice(0, a2Count*3), a2Count,
      cp: cpBuf.slice(0, coreCount*3), cc: ccBuf.slice(0, coreCount*3), coreCount,
      hp: hpBuf, haloCount: HALO_MAX,
    };
  }, []);

  useFrame(({ camera }) => {
    const dist = camera.position.length();
    const op   = THREE.MathUtils.smoothstep(dist, 2000, 5500);

    const setOp = (ref: React.RefObject<THREE.Points>, v: number) => {
      if (ref.current) (ref.current.material as THREE.PointsMaterial).opacity = v;
    };
    setOp(arm1Ref, op * 0.85);
    setOp(arm2Ref, op * 0.85);
    setOp(coreRef, op * 0.95);
    setOp(haloRef, op * 0.08);

    if (bulgeRef.current)  bulgeRef.current.material.opacity  = op * 0.45; // CHANGE 5
    if (outerRef.current)  outerRef.current.material.opacity  = op * 0.38;
    if (groupRef.current)  groupRef.current.rotation.y += 0.000018;
  });

  const SC   = 15;
  const OX_S = -2750 * SC;

  return (
    <group>
      {/* CHANGE 5: Central bulge glow sprite */}
      <sprite ref={bulgeRef} position={[OX_S, 0, 0]} scale={[9000, 6500, 1]}>
        <spriteMaterial map={bulgeTex} transparent blending={THREE.AdditiveBlending} depthWrite={false} opacity={0} />
      </sprite>
      {/* Outer disc haze */}
      <sprite ref={outerRef} position={[OX_S, 0, 0]} scale={[55000, 32000, 1]}>
        <spriteMaterial map={outerTex} transparent blending={THREE.AdditiveBlending} depthWrite={false} opacity={0} />
      </sprite>

      {/* Galaxy particles — realistic star colors, 3D thickness, dust lane gaps */}
      <group ref={groupRef} scale={[SC, SC, SC]}>
        <group rotation={[Math.PI * 0.07, 0.04, 0]}>

          {/* Arm 1 — CHANGE 6: size=1.8, sizeAttenuation */}
          <points ref={arm1Ref}>
            <bufferGeometry>
              <bufferAttribute attach="attributes-position" args={[gData.a1p, 3]} count={gData.a1Count} array={gData.a1p} itemSize={3} />
              <bufferAttribute attach="attributes-color"    args={[gData.a1c, 3]} count={gData.a1Count} array={gData.a1c} itemSize={3} />
            </bufferGeometry>
            <pointsMaterial size={1.8} vertexColors transparent opacity={0}
              blending={THREE.AdditiveBlending} sizeAttenuation depthWrite={false}
              map={starTex} alphaTest={0.001} />
          </points>

          {/* Arm 2 */}
          <points ref={arm2Ref}>
            <bufferGeometry>
              <bufferAttribute attach="attributes-position" args={[gData.a2p, 3]} count={gData.a2Count} array={gData.a2p} itemSize={3} />
              <bufferAttribute attach="attributes-color"    args={[gData.a2c, 3]} count={gData.a2Count} array={gData.a2c} itemSize={3} />
            </bufferGeometry>
            <pointsMaterial size={1.8} vertexColors transparent opacity={0}
              blending={THREE.AdditiveBlending} sizeAttenuation depthWrite={false}
              map={starTex} alphaTest={0.001} />
          </points>

          {/* Golden core */}
          <points ref={coreRef}>
            <bufferGeometry>
              <bufferAttribute attach="attributes-position" args={[gData.cp, 3]} count={gData.coreCount} array={gData.cp} itemSize={3} />
              <bufferAttribute attach="attributes-color"    args={[gData.cc, 3]} count={gData.coreCount} array={gData.cc} itemSize={3} />
            </bufferGeometry>
            <pointsMaterial size={2.4} vertexColors transparent opacity={0}
              blending={THREE.AdditiveBlending} sizeAttenuation depthWrite={false}
              map={starTex} alphaTest={0.001} />
          </points>

          {/* Stellar halo */}
          <points ref={haloRef}>
            <bufferGeometry>
              <bufferAttribute attach="attributes-position" args={[gData.hp, 3]} count={gData.haloCount} array={gData.hp} itemSize={3} />
            </bufferGeometry>
            <pointsMaterial size={1.2} color="#FFE4C4" transparent opacity={0}
              blending={THREE.AdditiveBlending} sizeAttenuation depthWrite={false}
              map={starTex} alphaTest={0.001} />
          </points>

          {/* Dust lanes between arms */}
          <GalaxyDustLanes offsetX={-2750} />

          {/* Layered, Multi-planar Volumetric Haze Disks */}
          {/* 1. Core central plane (high density) */}
          <VolumetricHazeDisk 
            offsetX={-2750} 
            offsetY={0} 
            scaleY={1.0} 
            rotation={0} 
            count={160000} 
            size={46} 
            opacityMultiplier={1.0} 
            colorShift={0.0} 
          />
          {/* 2. Upper tilted gas plane (warm purple shift, slightly rotated) */}
          <VolumetricHazeDisk 
            offsetX={-2750} 
            offsetY={55} 
            scaleY={0.7} 
            rotation={0.4} 
            count={100000} 
            size={52} 
            opacityMultiplier={0.8} 
            colorShift={0.06} 
          />
          {/* 3. Lower tilted gas plane (cool teal shift, slightly counter-rotated) */}
          <VolumetricHazeDisk 
            offsetX={-2750} 
            offsetY={-55} 
            scaleY={0.7} 
            rotation={-0.4} 
            count={100000} 
            size={52} 
            opacityMultiplier={0.8} 
            colorShift={-0.06} 
          />
        </group>
      </group>

      {NEBULAE.map((n, i) => <VolumetricNebula key={i} {...n} />)}
      {CLUSTERS.map((c, i) => <StarCluster key={i} position={c.position} />)}
      <InterstellarBlackHole />
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
    // Generate beautiful curated cosmic color pairs based on group name hash
    const colors = [
      { inner: '#ff00aa', outer: '#00ffff', label: 'NEON SECTOR' },
      { inner: '#ffd700', outer: '#ff3300', label: 'SOLARIS OUTPOST' },
      { inner: '#00ffcc', outer: '#8a5aff', label: 'QUANTUM CORRIDOR' },
      { inner: '#00ff66', outer: '#0055ff', label: 'EMERALD VOID' },
      { inner: '#ff3300', outer: '#9900ff', label: 'SUPERNOVA CRADLE' },
    ];
    let hash = 0;
    const str = group.name || '';
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const idx = Math.abs(hash) % colors.length;
    return colors[idx];
  }, [group.name]);

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

  const ringRef = useRef<THREE.Mesh>(null);
  const coreRef = useRef<THREE.Points>(null);

  // Animate the pulsing outer ring and rotating core
  useFrame(({ clock }) => {
    if (ringRef.current) {
      const scale = 1.15 + 0.15 * Math.sin(clock.elapsedTime * 2);
      ringRef.current.scale.set(scale, scale, scale);
      ringRef.current.rotation.z = clock.elapsedTime * 0.2;
    }
    if (coreRef.current) {
      coreRef.current.rotation.y = clock.elapsedTime * 0.05;
      coreRef.current.rotation.x = clock.elapsedTime * 0.02;
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

  const puffTex = useMemo(() => {
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const ctx = c.getContext('2d')!;
    const g = ctx.createRadialGradient(32,32,0, 32,32,32);
    g.addColorStop(0,   'rgba(255,255,255,1)');
    g.addColorStop(0.35,'rgba(255,255,255,0.7)');
    g.addColorStop(0.7, 'rgba(255,255,255,0.2)');
    g.addColorStop(1,   'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.fillRect(0,0,64,64);
    return new THREE.CanvasTexture(c);
  }, []);

  const { positions, colors } = useMemo(() => {
    const N = 6000; // Optimal performance, beautiful density
    const pos = new Float32Array(N * 3);
    const col = new Float32Array(N * 3);

    const inner = new THREE.Color(theme.inner);
    const outer = new THREE.Color(theme.outer);

    let seed = index * 99;
    const rng = () => { seed = (seed * 16807 + 0) % 2147483647; return (seed - 1) / 2147483646; };

    const nebulaScale = 85; // Massive volumetric presence!

    for (let i = 0; i < N; i++) {
      const r = Math.pow(rng(), 1.4) * nebulaScale * 0.5;
      const theta = rng() * Math.PI * 2;
      const phi = Math.acos(2 * rng() - 1);
      
      // Ellipsoid stretch
      const ex = 1.2 + rng() * 0.4;
      const ey = 0.5 + rng() * 0.3; // Volumetrically thick but slightly flattened
      const ez = 1.2 + rng() * 0.4;

      pos[i * 3]     = Math.sin(phi) * Math.cos(theta) * r * ex;
      pos[i * 3 + 1] = Math.cos(phi) * r * ey;
      pos[i * 3 + 2] = Math.sin(phi) * Math.sin(theta) * r * ez;

      const t = r / (nebulaScale * 0.5);

      const c = new THREE.Color().lerpColors(inner, outer, t);
      // Pockets of neon highlight
      if (rng() < 0.1) {
        c.addScalar(0.2);
      }
      col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
    }
    return { positions: pos, colors: col };
  }, [theme, index]);

  return (
    <group position={position}>
      {/* Volumetric Nebula Particles */}
      <points ref={coreRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} />
          <bufferAttribute attach="attributes-color" args={[colors, 3]} />
        </bufferGeometry>
        <pointsMaterial
          size={5}
          vertexColors
          transparent
          opacity={0.65}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          map={puffTex}
        />
      </points>

      {/* Orbiting Ring Field */}
      <mesh ref={ringRef} lookAt={() => new THREE.Vector3(0, 0, 0)} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[48, 52, 64]} />
        <meshBasicMaterial 
          color={theme.inner} 
          transparent 
          opacity={0.45} 
          blending={THREE.AdditiveBlending} 
          depthWrite={false} 
          side={THREE.DoubleSide} 
        />
      </mesh>

      {/* Interactive Raycast Target Sphere */}
      <mesh 
        onClick={handleFocus}
        onPointerOver={() => { setHovered(true); document.body.style.cursor = 'pointer'; }}
        onPointerOut={() => { setHovered(false); document.body.style.cursor = 'default'; }}
      >
        <sphereGeometry args={[45, 16, 16]} />
        <meshBasicMaterial 
          color={theme.outer} 
          transparent 
          opacity={hovered ? 0.25 : 0.08} 
          blending={THREE.AdditiveBlending} 
          depthWrite={false} 
        />
      </mesh>

      {/* Hover/Visual Label */}
      <Html distanceFactor={450} position={[0, 60, 0]} center className="pointer-events-none select-none">
        <div 
          className="flex flex-col items-center gap-1.5 transition-all duration-300"
          style={{
            transform: hovered ? 'scale(1.15)' : 'scale(1.0)',
            opacity: 0.95
          }}
        >
          <span 
            className="px-3.5 py-1.5 rounded-md font-orbitron font-extrabold text-xs uppercase tracking-widest border transition-all shadow-[0_0_15px_rgba(138,90,255,0.25)] whitespace-nowrap"
            style={{
              background: 'linear-gradient(135deg, rgba(8, 4, 16, 0.96), rgba(4, 2, 8, 0.92))',
              borderColor: hovered ? theme.inner : 'rgba(255,255,255,0.15)',
              color: hovered ? '#ffffff' : '#ffd700',
              textShadow: `0 0 8px ${theme.inner}`
            }}
          >
            🛰️ {group.name.toUpperCase()} SECTOR
          </span>
          <span 
            className="text-[9px] font-mono tracking-widest text-[#a0b9ff]/60 uppercase whitespace-nowrap bg-black/60 px-2 py-0.5 rounded border border-white/5"
          >
            {group.memberIds.length} TRAVELERS ONLINE
          </span>
        </div>
      </Html>
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
      const targetX = Math.cos(planetTime) * orbit;
      const targetZ = Math.sin(planetTime) * orbit;
      const targetPos = new THREE.Vector3(targetX, 0, targetZ);
      const midPos = new THREE.Vector3(targetX * 0.5, 20, targetZ * 0.5);
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

// ─── RETURN BUTTON OVERLAY ──────────────────────────────────────────────────
function ReturnButtonOverlay({ hide }: { hide?: boolean }) {
  const cameraControls = useCamera();
  const [visible, setVisible] = useState(false);
  
  useFrame(({ camera }) => {
    const dist = camera.position.length();
    // Default camera distance is ~495 units; trigger return button only when zoomed out past 550 units
    if (dist > 550 && !visible) setVisible(true);
    else if (dist <= 550 && visible) setVisible(false);
  });

  if (!visible || hide) return null;

  return (
    <Html fullscreen className="pointer-events-none z-[100]">
      <div className="absolute bottom-6 left-6 pointer-events-auto">
        <button
          onClick={() => cameraControls.current?.setLookAt(-320, 110, -360, 0, 0, 0, true)}
          className="px-6 py-3 bg-[#050510]/60 backdrop-blur-xl border border-[#D4AF37]/50 text-[#D4AF37] text-xs font-bold uppercase tracking-widest rounded-full hover:bg-[#D4AF37] hover:text-black transition-all shadow-[0_0_15px_rgba(212,175,55,0.3)] font-orbitron whitespace-nowrap"
        >
          ⌂ Return to Solar System
        </button>
      </div>
    </Html>
  );
}

export default function SolarSystem({ hideReturnButton }: { hideReturnButton?: boolean }) {
  const cameraControlsRef = useRef<CameraControls>(null);

  useEffect(() => {
    if (cameraControlsRef.current) {
      cameraControlsRef.current.setLookAt(-320, 110, -360, 0, 0, 0, false);
    }
  }, []);

  const { assignments, unreadCount, activeTransmissions, removeTransmission, groups, letters } = useAppStore();

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
          style={{ width: '100vw', height: '100vh', background: '#000005' }}
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

          <DoubleClickZoom />

          <Suspense fallback={null}>
            <SpaceBackground />
            <DeepSpaceLayers />
            <ReturnButtonOverlay hide={hideReturnButton} />
            
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
      </div>
    </CameraContext.Provider>
  );
}
