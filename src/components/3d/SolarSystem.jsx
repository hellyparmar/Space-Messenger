import { useRef, useState, useCallback } from 'react'
import { useThree, useFrame } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import { Sun } from './Sun'
import { Planet, DwarfPlanet, OrbitRing } from './Planet'
import { AsteroidBelt, Comets, ShootingStars } from './OrbitRings'
import { Starfield, MilkyWayBand, Nebulae, SpaceDust, SpiralArms, GalacticCore } from './GalaxyBackground'
import { useSystemStore } from '../../store/systemStore'

/* ────────────────────────────────────────────────────────
   PLANET DATA — 6 close-friend planets + 7 dwarf planets
─────────────────────────────────────────────────────────── */
const PLANET_DATA = [
  {
    id: 'mercury', name: 'Mercury', type: 'rocky',
    orbitRadius: 20, orbitSpeed: 0.0022, size: 1.4,
    seed: 1, moons: 0, ellipticity: 0.06, orbitOffset: 0.0,
    desc: 'Scorched inner world',  distance: '0.39 AU', period: '88 days',
  },
  {
    id: 'venus', name: 'Venus', type: 'earthlike',
    orbitRadius: 28, orbitSpeed: 0.0017, size: 2.0,
    seed: 2, moons: 0, ellipticity: 0.01, orbitOffset: 1.2,
    desc: 'Shrouded in acid clouds', distance: '0.72 AU', period: '225 days',
  },
  {
    id: 'earth', name: 'Earth', type: 'earthlike',
    orbitRadius: 38, orbitSpeed: 0.0013, size: 2.1,
    seed: 3, moons: 1, ellipticity: 0.02, orbitOffset: 2.4,
    desc: 'Pale blue dot, home',    distance: '1.00 AU', period: '365 days',
  },
  {
    id: 'mars', name: 'Mars', type: 'rocky',
    orbitRadius: 50, orbitSpeed: 0.0010, size: 1.6,
    seed: 4, moons: 2, ellipticity: 0.09, orbitOffset: 4.0,
    desc: 'The Red Planet',         distance: '1.52 AU', period: '687 days',
  },
  {
    id: 'jupiter', name: 'Jupiter', type: 'gasgiant',
    orbitRadius: 70, orbitSpeed: 0.00055, size: 4.8,
    seed: 5, moons: 2, ellipticity: 0.05, orbitOffset: 0.8,
    desc: 'King of planets',        distance: '5.20 AU', period: '11.9 yrs',
  },
  {
    id: 'saturn', name: 'Saturn', type: 'gasgiant',
    orbitRadius: 92, orbitSpeed: 0.00038, size: 4.0,
    seed: 6, moons: 2, ellipticity: 0.06, orbitOffset: 3.5,
    desc: 'Lord of the rings',      distance: '9.58 AU', period: '29.5 yrs',
  },
  {
    id: 'uranus', name: 'Uranus', type: 'iceworld',
    orbitRadius: 112, orbitSpeed: 0.00025, size: 3.0,
    seed: 7, moons: 1, ellipticity: 0.05, orbitOffset: 1.9,
    desc: 'Tilted ice giant',       distance: '19.2 AU', period: '84 yrs',
  },
  {
    id: 'neptune', name: 'Neptune', type: 'iceworld',
    orbitRadius: 130, orbitSpeed: 0.00016, size: 2.9,
    seed: 8, moons: 1, ellipticity: 0.01, orbitOffset: 5.1,
    desc: 'Supersonic wind world',  distance: '30.1 AU', period: '165 yrs',
  },
]

const DWARF_DATA = [
  { id: 'pluto',    name: 'Pluto',    type: 'rocky',    orbitRadius: 150, orbitSpeed: 0.00012, size: 0.9,  seed: 11, moons: 1, ellipticity: 0.25, orbitOffset: 0.5 },
  { id: 'eris',     name: 'Eris',     type: 'iceworld', orbitRadius: 168, orbitSpeed: 0.00009, size: 0.85, seed: 12, moons: 0, ellipticity: 0.44, orbitOffset: 2.2 },
  { id: 'makemake', name: 'Makemake', type: 'rocky',    orbitRadius: 182, orbitSpeed: 0.00007, size: 0.75, seed: 13, moons: 0, ellipticity: 0.16, orbitOffset: 4.1 },
  { id: 'haumea',   name: 'Haumea',   type: 'iceworld', orbitRadius: 195, orbitSpeed: 0.00006, size: 0.65, seed: 14, moons: 0, ellipticity: 0.19, orbitOffset: 1.4 },
  { id: 'ceres',    name: 'Ceres',    type: 'rocky',    orbitRadius: 44,  orbitSpeed: 0.00090, size: 0.7,  seed: 15, moons: 0, ellipticity: 0.08, orbitOffset: 3.3 },
  { id: 'sedna',    name: 'Sedna',    type: 'iceworld', orbitRadius: 210, orbitSpeed: 0.00004, size: 0.6,  seed: 16, moons: 0, ellipticity: 0.85, orbitOffset: 0.9 },
  { id: 'gonggong', name: 'Gonggong', type: 'rocky',    orbitRadius: 220, orbitSpeed: 0.00003, size: 0.55, seed: 17, moons: 0, ellipticity: 0.50, orbitOffset: 5.8 },
]

/* ────────────────────────────────────────────────────────
   CAMERA FLY-TO animation
─────────────────────────────────────────────────────────── */
function useCameraFlyTo() {
  const { camera } = useThree()
  const flyRef = useRef({ active: false })

  const flyTo = useCallback((targetPos, lookAt, onDone) => {
    const start = camera.position.clone()
    const startLookAt = new THREE.Vector3(0, 0, 0)
    flyRef.current = { active: true, start, targetPos, lookAt, startLookAt, t: 0, onDone }
  }, [camera])

  useFrame((_, delta) => {
    const f = flyRef.current
    if (!f.active) return
    f.t = Math.min(f.t + delta * 0.8, 1)
    const ease = f.t < 0.5 ? 2*f.t*f.t : -1+(4-2*f.t)*f.t // smoothstep
    camera.position.lerpVectors(f.start, f.targetPos, ease)
    camera.lookAt(f.lookAt)
    if (f.t >= 1) {
      f.active = false
      f.onDone?.()
    }
  })

  return { flyTo, isFlying: () => flyRef.current.active }
}

/* ────────────────────────────────────────────────────────
   MAIN SOLAR SYSTEM SCENE
─────────────────────────────────────────────────────────── */
export function SolarSystem() {
  const [hoveredPlanet, setHoveredPlanet] = useState(null)
  const [selectedPlanet, setSelectedPlanet] = useState(null)
  const controlsRef = useRef()
  const { flyTo, isFlying } = useCameraFlyTo()
  const setHovered = useSystemStore(s => s.setHoveredPlanet)
  const setSelected = useSystemStore(s => s.setSelectedPlanet)
  const unreadCount = useSystemStore(s => s.unreadCount)

  // Auto-rotation: slow when idle, stops on interaction
  const idleRef = useRef(true)

  const handleHover = useCallback((data) => {
    setHoveredPlanet(data)
    setHovered(data)
    document.body.style.cursor = 'pointer'
  }, [setHovered])

  const handleHoverOut = useCallback(() => {
    setHoveredPlanet(null)
    setHovered(null)
    document.body.style.cursor = 'none'
  }, [setHovered])

  const handleClick = useCallback((data) => {
    if (isFlying()) return
    setSelectedPlanet(data)
    setSelected(data)

    // Fly toward planet
    const angle = Math.random() * Math.PI * 2
    const dist = data.size * 5 + 12
    flyTo(
      new THREE.Vector3(
        data.orbitRadius * Math.cos(angle) + dist * 0.5,
        dist * 0.4,
        data.orbitRadius * Math.sin(angle) + dist * 0.5
      ),
      new THREE.Vector3(0, 0, 0),
      () => {}
    )
  }, [flyTo, isFlying, setSelected])

  useFrame((_, delta) => {
    if (controlsRef.current && idleRef.current) {
      // Very slow Y-axis auto-rotation when idle
      controlsRef.current.autoRotate = true
      controlsRef.current.autoRotateSpeed = 0.04
    }
  })

  return (
    <>
      {/* ── Background ── */}
      <Starfield />
      <SpiralArms />
      <MilkyWayBand />
      <Nebulae />
      <GalacticCore />
      <SpaceDust />

      {/* ── Lighting ── */}
      {/* Hemisphere: sky blue fill, warm ground, medium intensity */}
      <hemisphereLight args={[0x1a3080, 0x0a0820, 0.65]} />
      {/* Directional warm fill from above-left */}
      <directionalLight
        position={[100, 60, 80]}
        intensity={0.35}
        color={0xfff5e0}
      />
      {/* Cool back fill - opposite direction */}
      <directionalLight
        position={[-80, -30, -100]}
        intensity={0.12}
        color={0x8899cc}
      />

      {/* ── Sun ── */}
      <Sun unreadLetterCount={unreadCount} />

      {/* ── Orbit rings for all planets ── */}
      {PLANET_DATA.map(p => (
        <OrbitRing key={p.id + '_ring'} radius={p.orbitRadius} ellipticity={p.ellipticity} />
      ))}
      {DWARF_DATA.map(p => (
        <OrbitRing key={p.id + '_ring'} radius={p.orbitRadius} ellipticity={p.ellipticity} />
      ))}

      {/* ── Planets ── */}
      {PLANET_DATA.map(p => (
        <Planet
          key={p.id}
          data={p}
          onHover={handleHover}
          onHoverOut={handleHoverOut}
          onClick={handleClick}
          isSelected={selectedPlanet?.id === p.id}
          hasSaturnRings={p.id === 'saturn'}
        />
      ))}

      {/* ── Dwarf Planets ── */}
      {DWARF_DATA.map(p => (
        <DwarfPlanet
          key={p.id}
          data={p}
          onHover={handleHover}
          onHoverOut={handleHoverOut}
          onClick={handleClick}
        />
      ))}

      {/* ── Asteroid Belt ── */}
      <AsteroidBelt />

      {/* ── Comets ── */}
      <Comets />

      {/* ── Shooting Stars ── */}
      <ShootingStars />

      {/* ── OrbitControls ── */}
      <OrbitControls
        ref={controlsRef}
        enableDamping
        dampingFactor={0.055}
        minDistance={18}
        maxDistance={500}
        autoRotate
        autoRotateSpeed={0.04}
        onStart={() => { idleRef.current = false }}
        onEnd={() => { setTimeout(() => { idleRef.current = true }, 5000) }}
        makeDefault
      />
    </>
  )
}
