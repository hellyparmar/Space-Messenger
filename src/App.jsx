import { useState, Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { EffectComposer, Bloom, ChromaticAberration, Vignette } from '@react-three/postprocessing'
import { BlendFunction } from 'postprocessing'
import * as THREE from 'three'
import { SolarSystem } from './components/3d/SolarSystem'
import { LoadingScreen } from './components/ui/LoadingScreen'
import { LandingOverlay } from './components/ui/LandingOverlay'
import { CustomCursor } from './components/ui/CustomCursor'
import {
  PlanetTooltip,
  PlanetPanel,
  StatsBar,
  TopNav,
  SunBadge,
  ControlsHint,
} from './components/ui/HUD'

function PostFX() {
  return (
    <EffectComposer multisampling={4}>
      <Bloom
        intensity={1.2}
        luminanceThreshold={0.55}
        luminanceSmoothing={0.7}
        mipmapBlur
        radius={0.65}
      />
      <ChromaticAberration
        blendFunction={BlendFunction.NORMAL}
        offset={[0.0003, 0.0003]}
      />
      <Vignette
        offset={0.28}
        darkness={0.6}
        blendFunction={BlendFunction.NORMAL}
      />
    </EffectComposer>
  )
}

function App() {
  const [loaded, setLoaded] = useState(false)
  const [landingDone, setLandingDone] = useState(false)

  return (
    <div style={{ width: '100%', height: '100%', background: '#00010d' }}>
      <Canvas
        gl={{
          antialias: true,
          alpha: false,
          powerPreference: 'high-performance',
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.1,
        }}
        dpr={[1, Math.min(window.devicePixelRatio, 2)]}
        camera={{ position: [0, 45, 110], fov: 55, near: 0.1, far: 3000 }}
        style={{ position: 'absolute', inset: 0 }}
      >
        <Suspense fallback={null}>
          <SolarSystem />
          <PostFX />
        </Suspense>
      </Canvas>

      {!loaded && <LoadingScreen onComplete={() => setLoaded(true)} />}

      {loaded && !landingDone && (
        <LandingOverlay onEnter={() => setLandingDone(true)} />
      )}

      {loaded && landingDone && (
        <>
          <CustomCursor />
          <TopNav />
          <StatsBar />
          <SunBadge />
          <PlanetTooltip />
          <PlanetPanel />
          <ControlsHint />
        </>
      )}
    </div>
  )
}

export default App
