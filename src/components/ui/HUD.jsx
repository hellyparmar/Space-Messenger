import { useEffect, useRef } from 'react'
import { useSystemStore } from '../../store/systemStore'

const TYPE_LABELS = {
  earthlike: 'Terrestrial World',
  gasgiant:  'Gas Giant',
  rocky:     'Rocky Planet',
  iceworld:  'Ice Giant',
}

const TYPE_COLORS = {
  earthlike: '#3a8bdf',
  gasgiant:  '#d08830',
  rocky:     '#a06040',
  iceworld:  '#60b4d8',
}

/* ── Planet Tooltip (follows mouse) ── */
export function PlanetTooltip() {
  const hoveredPlanet = useSystemStore(s => s.hoveredPlanet)
  const ref = useRef(null)

  useEffect(() => {
    const onMove = (e) => {
      if (!ref.current) return
      const w = ref.current.offsetWidth
      const h = ref.current.offsetHeight
      let x = e.clientX + 18
      let y = e.clientY - h / 2
      if (x + w > window.innerWidth - 10)  x = e.clientX - w - 18
      if (y < 10)                           y = 10
      if (y + h > window.innerHeight - 10) y = window.innerHeight - h - 10
      ref.current.style.left = x + 'px'
      ref.current.style.top  = y + 'px'
    }
    window.addEventListener('mousemove', onMove)
    return () => window.removeEventListener('mousemove', onMove)
  }, [])

  const p = hoveredPlanet
  const color = p ? (TYPE_COLORS[p.type] ?? '#888') : '#888'

  return (
    <div
      ref={ref}
      className={`planet-tooltip ${p ? 'visible' : ''}`}
      style={{ position: 'fixed', zIndex: 8000 }}
    >
      {p && (
        <>
          <div className="tt-name" style={{ color }}>
            {p.name}
          </div>
          <div className="tt-type">{TYPE_LABELS[p.type] ?? p.type}</div>
          <div className="tt-status">
            <span className="tt-dot" style={{ background: color, boxShadow: `0 0 6px ${color}` }} />
            <span style={{ color: 'rgba(180,200,255,0.7)', fontSize: 11 }}>
              {p.desc ?? 'Orbiting body'}
            </span>
          </div>
        </>
      )}
    </div>
  )
}

/* ── Planet Detail Panel (bottom-left) ── */
export function PlanetPanel() {
  const selectedPlanet = useSystemStore(s => s.selectedPlanet)
  const clearSelection  = useSystemStore(s => s.clearSelection)

  const p = selectedPlanet
  const color = p ? (TYPE_COLORS[p.type] ?? '#888') : '#888'

  return (
    <div className={`planet-panel ${p ? 'open' : ''}`}>
      {p && (
        <>
          <div className="pp-header">
            <div
              className="pp-color-dot"
              style={{ background: color, color }}
            />
            <div className="pp-name">{p.name}</div>
            <button className="pp-close" onClick={clearSelection}>×</button>
          </div>

          <div className="pp-stats">
            <div className="pp-stat">
              <div className="pp-stat-label">Type</div>
              <div className="pp-stat-val" style={{ color, fontSize: 11 }}>
                {TYPE_LABELS[p.type] ?? p.type}
              </div>
            </div>
            <div className="pp-stat">
              <div className="pp-stat-label">Distance</div>
              <div className="pp-stat-val">{p.distance ?? '—'}</div>
            </div>
            <div className="pp-stat">
              <div className="pp-stat-label">Orbit Period</div>
              <div className="pp-stat-val">{p.period ?? '—'}</div>
            </div>
            <div className="pp-stat">
              <div className="pp-stat-label">Moons</div>
              <div className="pp-stat-val">{p.moons ?? 0}</div>
            </div>
          </div>

          <p style={{
            fontSize: 12,
            color: 'rgba(180,200,255,0.6)',
            marginBottom: 16,
            lineHeight: 1.6,
          }}>
            {p.desc ?? ''}
          </p>

          <button className="pp-btn">
            ▸ EXPLORE PLANET
          </button>
        </>
      )}
    </div>
  )
}

/* ── Stats Bar (top-left) ── */
export function StatsBar() {
  return (
    <div className="stats-bar">
      <div className="stat-chip">
        <span className="stat-chip-val">8</span>
        <span className="stat-chip-label">Planets</span>
      </div>
      <div style={{ width: 1, height: 18, background: 'rgba(100,180,255,0.12)' }} />
      <div className="stat-chip">
        <span className="stat-chip-val">7</span>
        <span className="stat-chip-label">Dwarfs</span>
      </div>
      <div style={{ width: 1, height: 18, background: 'rgba(100,180,255,0.12)' }} />
      <div className="stat-chip">
        <span className="stat-chip-val">3</span>
        <span className="stat-chip-label">Comets</span>
      </div>
    </div>
  )
}

/* ── Top Navigation Bar ── */
export function TopNav() {
  return (
    <nav className="top-nav">
      <div className="nav-logo">☀ SOLAR MESSENGER</div>
      <div className="nav-divider" />
      <button className="nav-btn">OVERVIEW</button>
      <button className="nav-btn">PLANETS</button>
      <button className="nav-btn">DEEP SPACE</button>
      <button className="nav-btn">SETTINGS</button>
    </nav>
  )
}

/* ── Sun Unread Badge ── */
export function SunBadge() {
  const unreadCount = useSystemStore(s => s.unreadCount)
  const setUnread   = useSystemStore(s => s.setUnreadCount)

  return (
    <div
      className="sun-badge"
      title="Solar activity driven by unread messages"
      onClick={() => setUnread((unreadCount + 1) % 15)}
    >
      <span className="sun-badge-icon">☀</span>
      <div>
        <div className="sun-badge-count">{unreadCount}</div>
        <div className="sun-badge-label">Solar Events</div>
      </div>
    </div>
  )
}

/* ── Controls Hint ── */
export function ControlsHint() {
  return (
    <div className="controls-hint">
      <div className="controls-hint-item">
        <span className="key-badge">drag</span>
        Rotate view
      </div>
      <div className="controls-hint-item">
        <span className="key-badge">scroll</span>
        Zoom in/out
      </div>
      <div className="controls-hint-item">
        <span className="key-badge">click</span>
        Select planet
      </div>
    </div>
  )
}
