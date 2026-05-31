import { useState, useEffect, useRef } from 'react'

const FEATURES = [
  { icon: '🪐', title: 'Planet Contacts', desc: 'Each planet is a contact. Chat with Mercury, Venus, Earth, and beyond.' },
  { icon: '☄️', title: 'Message Rides Comets', desc: 'Your words travel across the solar system on cosmic messengers.' },
  { icon: '☀️', title: 'Solar-Powered Alerts', desc: 'More unread messages make the Sun burn brighter. Watch it flare.' },
  { icon: '🌌', title: 'Explore the System', desc: 'Fly through 3D space. Click any planet to start a conversation.' },
]

const STAR_TRAILS = Array.from({ length: 50 }, () => ({
  x: Math.random() * 100,
  y: Math.random() * 100,
  d: 0.5 + Math.random() * 2,
  s: 0.5 + Math.random() * 1.5,
  a: 0.3 + Math.random() * 0.7,
}))

function FloatingStars() {
  return (
    <div className="landing-stars">
      {STAR_TRAILS.map((s, i) => (
        <div
          key={i}
          className="landing-star"
          style={{
            left: `${s.x}%`,
            top: `${s.y}%`,
            width: `${s.d}px`,
            height: `${s.d}px`,
            animationDelay: `${s.s}s`,
            opacity: s.a,
          }}
        />
      ))}
    </div>
  )
}

function Typewriter({ text, speed = 60, onDone }) {
  const [displayed, setDisplayed] = useState('')
  const idxRef = useRef(0)

  useEffect(() => {
    const interval = setInterval(() => {
      idxRef.current++
      if (idxRef.current > text.length) {
        clearInterval(interval)
        onDone?.()
        return
      }
      setDisplayed(text.slice(0, idxRef.current))
    }, speed)
    return () => clearInterval(interval)
  }, [text, speed, onDone])

  return <span>{displayed}<span className="typewriter-cursor">|</span></span>
}

function ShootingStar() {
  const [style, setStyle] = useState(() => ({
    top: `${Math.random() * 60}%`,
    left: `${Math.random() * 100}%`,
    animationDelay: `${Math.random() * 8}s`,
  }))

  useEffect(() => {
    const interval = setInterval(() => {
      setStyle({
        top: `${Math.random() * 60}%`,
        left: `${Math.random() * 100}%`,
        animationDelay: '0s',
      })
    }, 8000 + Math.random() * 4000)
    return () => clearInterval(interval)
  }, [])

  return <div className="shooting-star" style={style} />
}

export function LandingOverlay({ onEnter }) {
  const [showFeatures, setShowFeatures] = useState(false)
  const [subVisible, setSubVisible] = useState(false)
  const [ctaVisible, setCtaVisible] = useState(false)
  const [fadingOut, setFadingOut] = useState(false)

  useEffect(() => {
    const t1 = setTimeout(() => setSubVisible(true), 1500)
    const t2 = setTimeout(() => setShowFeatures(true), 2800)
    const t3 = setTimeout(() => setCtaVisible(true), 3200)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
  }, [])

  const handleEnter = () => {
    setFadingOut(true)
    setTimeout(onEnter, 1100)
  }

  return (
    <div className={`landing-overlay ${fadingOut ? 'fade-out' : ''}`}>
      <FloatingStars />
      <ShootingStar />
      <ShootingStar />
      <ShootingStar />

      <div className="landing-content">
        <div className="landing-badge">✦ BETA</div>

        <h1 className="landing-title">
          SOLAR<br />
          <Typewriter text="MESSENGER" speed={90} />
        </h1>

        <p className={`landing-subtitle ${subVisible ? 'visible' : ''}`}>
          Chat across the cosmos. Every planet is a contact,
          <br />
          every message travels on starlight.
        </p>

        <div className={`landing-features ${showFeatures ? 'visible' : ''}`}>
          {FEATURES.map((f, i) => (
            <div
              key={f.title}
              className="landing-feature-card"
              style={{ transitionDelay: `${i * 0.1}s` }}
            >
              <span className="lf-icon">{f.icon}</span>
              <div>
                <div className="lf-title">{f.title}</div>
                <div className="lf-desc">{f.desc}</div>
              </div>
            </div>
          ))}
        </div>

        <div className={`landing-cta ${ctaVisible ? 'visible' : ''}`}>
          <button className="landing-btn-primary" onClick={handleEnter}>
            <span className="lbp-glow" />
            LAUNCH MESSENGER
            <span className="lbp-arrow">→</span>
          </button>
          <p className="landing-hint">
            Drag to explore · Click a planet to chat
          </p>
        </div>
      </div>

      <div className="landing-footer">
        <span>© 2026 Solar Messenger</span>
        <span className="landing-footer-dot">·</span>
        <span>Made with ☀ from the Sun</span>
      </div>
    </div>
  )
}
