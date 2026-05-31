import { useState, useEffect, useRef } from 'react'

const MESSAGES = [
  'Establishing quantum link to the Sun...',
  'Routing messages through the asteroid belt...',
  'Waking up sleeping planets...',
  'Encrypting cosmic bandwidth...',
  'Loading your solar contacts...',
  'Igniting stellar relays...',
]

export function LoadingScreen({ onComplete }) {
  const [msgIdx, setMsgIdx]     = useState(0)
  const [fadeOut, setFadeOut]   = useState(false)

  useEffect(() => {
    const msgTimer = setInterval(() => {
      setMsgIdx(i => (i + 1) % MESSAGES.length)
    }, 600)

    const doneTimer = setTimeout(() => {
      setFadeOut(true)
      setTimeout(onComplete, 1200)
    }, 3200)

    return () => { clearInterval(msgTimer); clearTimeout(doneTimer) }
  }, [onComplete])

  return (
    <div id="loading-screen" className={fadeOut ? 'fade-out' : ''}>
      {/* Animated SVG logo */}
      <svg className="loading-logo" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="60" cy="60" r="58" stroke="rgba(255,140,0,0.2)" strokeWidth="0.8"/>
        <circle cx="60" cy="60" r="44" stroke="rgba(255,200,50,0.2)" strokeWidth="0.8"/>
        <circle cx="60" cy="60" r="28" stroke="rgba(255,220,100,0.2)" strokeWidth="0.8"/>
        {/* Orbit paths */}
        <ellipse cx="60" cy="60" rx="44" ry="18" stroke="rgba(100,180,255,0.35)" strokeWidth="0.8"/>
        <ellipse cx="60" cy="60" rx="28" ry="11" stroke="rgba(255,160,80,0.35)" strokeWidth="0.8"/>
        {/* Sun */}
        <circle cx="60" cy="60" r="10" fill="url(#sunGrad)"/>
        {/* Planets */}
        <circle cx="104" cy="60" r="3.5" fill="#5ab4d6" />
        <circle cx="60" cy="42" r="2.5" fill="#d08830" />
        {/* Glow */}
        <circle cx="60" cy="60" r="14" fill="url(#glowGrad)" />
        <defs>
          <radialGradient id="sunGrad" cx="0.4" cy="0.3">
            <stop offset="0%" stopColor="#FFF5C0"/>
            <stop offset="60%" stopColor="#FFB830"/>
            <stop offset="100%" stopColor="#FF6A00"/>
          </radialGradient>
          <radialGradient id="glowGrad">
            <stop offset="0%" stopColor="rgba(255,180,50,0.25)"/>
            <stop offset="100%" stopColor="rgba(255,100,0,0)"/>
          </radialGradient>
        </defs>
      </svg>

      <div className="loading-title">Solar Messenger</div>
      <div className="loading-sub">Chat Across the Cosmos</div>
      <div className="loading-msg">{MESSAGES[msgIdx]}</div>

      <div className="loading-bar-wrap">
        <div className="loading-bar" />
      </div>
    </div>
  )
}
