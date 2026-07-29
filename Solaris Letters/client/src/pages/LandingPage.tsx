import { Canvas, useFrame } from '@react-three/fiber';
import { useRef, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import * as THREE from 'three';

// ─── 3D LANDING BACKGROUND COMPONENTS ───────────────────────────────────────

// Pure pseudo-random generator to satisfy react-hooks/purity linter rule
function makeRandom(seed = 1) {
  let s = seed;
  return () => {
    const x = Math.sin(s++) * 10000;
    return x - Math.floor(x);
  };
}

function TwinklingStars() {
  const count = 300;
  const positions = useMemo(() => {
    const nextRand = makeRandom(42);
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count * 3; i += 3) {
      // Spawn in a sphere around the camera
      const theta = nextRand() * Math.PI * 2;
      const phi = Math.acos((nextRand() * 2) - 1);
      const dist = 600 + nextRand() * 400;
      arr[i] = dist * Math.sin(phi) * Math.cos(theta);
      arr[i + 1] = dist * Math.sin(phi) * Math.sin(theta);
      arr[i + 2] = dist * Math.cos(phi);
    }
    return arr;
  }, []);

  const starRef = useRef<THREE.Points>(null!);
  useFrame(({ clock }) => {
    if (starRef.current) {
      starRef.current.rotation.y = clock.getElapsedTime() * 0.005;
      starRef.current.rotation.x = clock.getElapsedTime() * 0.002;
    }
  });

  return (
    <points ref={starRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        color="#ffffff"
        size={1.5}
        sizeAttenuation={true}
        transparent
        opacity={0.8}
      />
    </points>
  );
}

function LandingComets() {
  const count = 5;
  const lineRefs = useRef<(THREE.LineSegments | null)[]>([]);
  const cometsRef = useRef<any[]>([]);

  useEffect(() => {
    const data = [];
    for (let i = 0; i < count; i++) {
      data.push({
        position: new THREE.Vector3(),
        direction: new THREE.Vector3(),
        speed: 50 + Math.random() * 60, // Gracefully slower gliding speed
        length: 20 + Math.random() * 25, // Sleeker, shorter length
        active: false,
        timer: Math.random() * 4,
        color: Math.random() > 0.5 ? new THREE.Color('#00ffff') : new THREE.Color('#ffaa00'),
      });
    }
    cometsRef.current = data;
  }, []);

  useFrame((_state, delta) => {
    cometsRef.current.forEach((comet, idx) => {
      const line = lineRefs.current[idx];
      if (!line) return;

      if (!comet.active) {
        comet.timer -= delta;
        if (comet.timer <= 0) {
          comet.active = true;
          // Spawn in outer bounds
          const angle = Math.random() * Math.PI * 2;
          comet.position.set(
            Math.cos(angle) * 500,
            (Math.random() - 0.5) * 300 + 100,
            -300 + (Math.random() - 0.5) * 200
          );
          comet.direction.set(
            -Math.cos(angle) + (Math.random() - 0.5) * 0.3,
            (Math.random() - 0.5) * 0.2,
            -0.8
          ).normalize();
          comet.timer = 6 + Math.random() * 8;
        }
        line.visible = false;
      } else {
        comet.position.addScaledVector(comet.direction, comet.speed * delta);
        if (comet.position.length() > 900) {
          comet.active = false;
          comet.timer = 3 + Math.random() * 5;
        } else {
          line.visible = true;

          const pos = line.geometry.attributes.position.array as Float32Array;
          pos[0] = comet.position.x;
          pos[1] = comet.position.y;
          pos[2] = comet.position.z;

          const tail = comet.position.clone().addScaledVector(comet.direction, -comet.length);
          pos[3] = tail.x;
          pos[4] = tail.y;
          pos[5] = tail.z;

          line.geometry.attributes.position.needsUpdate = true;
        }
      }
    });
  });

  return (
    <group>
      {Array.from({ length: count }).map((_, idx) => {
        const geom = new THREE.BufferGeometry();
        const posAttr = new Float32Array(6);
        geom.setAttribute('position', new THREE.BufferAttribute(posAttr, 3));
        const color = idx % 2 === 0 ? new THREE.Color('#00ffff') : new THREE.Color('#ffaa00');
        const colors = new Float32Array([
          1.0, 1.0, 1.0,
          color.r * 0.2, color.g * 0.2, color.b * 0.2
        ]);
        geom.setAttribute('color', new THREE.BufferAttribute(colors, 3));

        return (
          <lineSegments
            key={idx}
            ref={(el) => { lineRefs.current[idx] = el; }}
            geometry={geom}
          >
            <lineBasicMaterial
              vertexColors
              transparent
              opacity={0.7}
              blending={THREE.AdditiveBlending}
            />
          </lineSegments>
        );
      })}
    </group>
  );
}

function CentralSun() {
  const sunRef = useRef<THREE.Mesh>(null!);
  const haloRef = useRef<THREE.Mesh>(null!);

  useFrame(({ clock }) => {
    const elapsed = clock.getElapsedTime();
    if (sunRef.current) {
      sunRef.current.rotation.y = elapsed * 0.05;
    }
    if (haloRef.current) {
      haloRef.current.scale.setScalar(1.25 + Math.sin(elapsed * 2) * 0.02);
    }
  });

  return (
    <group position={[0, 0, -100]}>
      {/* Glow Halo */}
      <mesh ref={haloRef}>
        <sphereGeometry args={[45, 32, 32]} />
        <meshBasicMaterial
          color="#ff7b00"
          transparent
          opacity={0.12}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      
      {/* Sun Body */}
      <mesh ref={sunRef}>
        <sphereGeometry args={[35, 32, 32]} />
        <meshBasicMaterial
          color="#ffa200"
          transparent
          opacity={0.85}
        />
      </mesh>
    </group>
  );
}

function OrbitLines() {
  const orbits = [120, 190, 260, 340];
  const ringRef = useRef<THREE.Group>(null!);

  useFrame(({ clock }) => {
    if (ringRef.current) {
      ringRef.current.rotation.z = clock.getElapsedTime() * 0.01;
    }
  });

  return (
    <group ref={ringRef} rotation={[Math.PI / 2.3, Math.PI / 8, 0]} position={[0, 0, -100]}>
      {orbits.map((rad, i) => {
        const points = [];
        for (let a = 0; a <= 64; a++) {
          const theta = (a / 64) * Math.PI * 2;
          points.push(new THREE.Vector3(Math.cos(theta) * rad, Math.sin(theta) * rad, 0));
        }
        const geom = new THREE.BufferGeometry().setFromPoints(points);

        return (
          <line key={i}>
            <primitive object={geom} attach="geometry" />
            <lineBasicMaterial
              color="#4A9EFF"
              transparent
              opacity={0.06 - i * 0.01}
              blending={THREE.AdditiveBlending}
            />
          </line>
        );
      })}
    </group>
  );
}

// ─── MAIN LANDING PAGE COMPONENT ──────────────────────────────────────────

export default function LandingPage() {
  const navigate = useNavigate();
  const token = localStorage.getItem('cosmimail_token');

  const handleLaunch = () => {
    if (token) {
      navigate('/home');
    } else {
      navigate('/login');
    }
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#030208] text-[#F0E8D8] font-sans">
      
      {/* 3D Canvas Background */}
      <div className="canvas-container pointer-events-none">
        <Canvas camera={{ fov: 60, position: [0, 0, 150] }}>
          <ambientLight intensity={0.6} />
          <TwinklingStars />
          <LandingComets />
          <CentralSun />
          <OrbitLines />
        </Canvas>
      </div>

      {/* Radial overlay gradient for cinematic atmosphere */}
      <div className="absolute inset-0 z-1 bg-[radial-gradient(circle_at_center,transparent_20%,#030208_85%)] pointer-events-none" />

      {/* Content Layer */}
      <div className="relative z-10 w-full h-full flex flex-col justify-between items-center px-4 py-4 md:py-6 overflow-hidden select-none">
        
        {/* Top Header Section */}
        <div className="flex flex-col items-center mt-2 md:mt-4 text-center">
          <motion.h1
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1 }}
            className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black text-white font-orbitron tracking-[0.15em] leading-tight select-text flex items-center justify-center flex-wrap"
          >
            SPACE
            <span className="text-white ml-3 md:ml-4">
              MESSENGER
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="text-xs sm:text-sm text-[#4A9EFF]/80 max-w-xl mx-auto font-medium tracking-wide mt-2 md:mt-3 select-text leading-relaxed px-4"
          >
            Chat across the cosmos. Every planet is a contact, every message travels on starlight.
          </motion.p>
        </div>

        {/* 2x2 Features Grid */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full max-w-3xl mx-auto my-3 md:my-5 px-4"
        >
          {/* Card 1 */}
          <div className="bg-black/35 backdrop-blur-md border border-white/5 hover:border-cyan-500/30 rounded-2xl p-4 flex items-start gap-3 transition-all duration-300 group hover:shadow-[0_0_15px_rgba(6,182,212,0.05)]">
            <div className="text-cyan-400 text-xl mt-0.5 transition-transform group-hover:scale-110 duration-300">🪐</div>
            <div>
              <h3 className="text-[10px] uppercase tracking-widest font-orbitron font-bold text-cyan-400 mb-1">PLANET CONTACTS</h3>
              <p className="text-[11px] text-[#F0E8D8]/60 leading-relaxed font-sans font-medium">Every planet in the Solaris system hosts a unique friend. Explore the orbits and click to open a chat terminal.</p>
            </div>
          </div>

          {/* Card 2 */}
          <div className="bg-black/35 backdrop-blur-md border border-white/5 hover:border-cyan-500/30 rounded-2xl p-4 flex items-start gap-3 transition-all duration-300 group hover:shadow-[0_0_15px_rgba(6,182,212,0.05)]">
            <div className="text-cyan-400 text-xl mt-0.5 transition-transform group-hover:scale-110 duration-300">🚀</div>
            <div>
              <h3 className="text-[10px] uppercase tracking-widest font-orbitron font-bold text-cyan-400 mb-1">SPACECRAFT TRANSMISSIONS</h3>
              <p className="text-[11px] text-[#F0E8D8]/60 leading-relaxed font-sans font-medium">Watch real-time spacecraft launch and fly dynamically through 3D space to deliver your letters to friends' planets.</p>
            </div>
          </div>

          {/* Card 3 */}
          <div className="bg-black/35 backdrop-blur-md border border-white/5 hover:border-cyan-500/30 rounded-2xl p-4 flex items-start gap-3 transition-all duration-300 group hover:shadow-[0_0_15px_rgba(6,182,212,0.05)]">
            <div className="text-cyan-400 text-xl mt-0.5 transition-transform group-hover:scale-110 duration-300">⏳</div>
            <div>
              <h3 className="text-[10px] uppercase tracking-widest font-orbitron font-bold text-cyan-400 mb-1">FUTURE-SELF CAPSULES</h3>
              <p className="text-[11px] text-[#F0E8D8]/60 leading-relaxed font-sans font-medium">Schedule message capsules to your future self. They travel across space-time and unlock at your selected delivery date.</p>
            </div>
          </div>

          {/* Card 4 */}
          <div className="bg-black/35 backdrop-blur-md border border-white/5 hover:border-cyan-500/30 rounded-2xl p-4 flex items-start gap-3 transition-all duration-300 group hover:shadow-[0_0_15px_rgba(6,182,212,0.05)]">
            <div className="text-cyan-400 text-xl mt-0.5 transition-transform group-hover:scale-110 duration-300">🌌</div>
            <div>
              <h3 className="text-[10px] uppercase tracking-widest font-orbitron font-bold text-cyan-400 mb-1">GROUP NEBULA CHATS</h3>
              <p className="text-[11px] text-[#F0E8D8]/60 leading-relaxed font-sans font-medium">Communicate with multiple friends simultaneously inside glowing 3D nebulae gas clouds scattered throughout outer space.</p>
            </div>
          </div>
        </motion.div>

        {/* Bottom Call To Action / Button Section */}
        <div className="flex flex-col items-center mb-2 md:mb-4 text-center w-full">
          <motion.button
            onClick={handleLaunch}
            whileHover={{ scale: 1.03, boxShadow: '0 0 25px rgba(6, 182, 212, 0.4)' }}
            whileTap={{ scale: 0.98 }}
            className="px-8 py-3.5 rounded-full bg-gradient-to-r from-cyan-950/60 to-blue-950/60 border border-cyan-500/40 text-cyan-100 hover:text-black hover:from-cyan-400 hover:to-cyan-300 text-xs font-bold uppercase tracking-[0.25em] font-orbitron transition-all shadow-[0_0_20px_rgba(6,182,212,0.1)] duration-300 cursor-pointer flex items-center gap-2.5"
          >
            <span>LAUNCH MESSENGER</span>
            <span>→</span>
          </motion.button>
          
          <p className="text-[9px] text-[#4A9EFF]/40 font-bold uppercase tracking-widest mt-3">
            Drag to explore - Click a planet to chat
          </p>

          <div className="w-12 h-[1px] bg-white/10 my-3 md:my-4" />

          <p className="text-[9px] text-white/20 font-medium tracking-widest uppercase flex items-center justify-center gap-1.5 select-text">
            <span>© 2026 Space Messenger</span>
            <span>·</span>
            <span>Made with ♥︎ by Helly</span>
          </p>
        </div>

      </div>
    </div>
  );
}
