/* eslint-disable react/forbid-dom-props, react/forbid-component-props */
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '../store/useAppStore';
import { useState, useEffect } from 'react';
import { api } from '../lib/api';

interface PlanetDetailsProps {
  onCompose: () => void;
}

export default function PlanetDetails({ onCompose }: PlanetDetailsProps) {
  const { 
    selectedPlanet, setSelectedPlanet, assignments,
    setInboxOpen, removeFriend, setComposerRecipient, setInboxFriendFilter
  } = useAppStore();

  const [ejectConfirm, setEjectConfirm] = useState(false);
  const [ejectToast, setEjectToast] = useState('');
  const [isEjecting, setIsEjecting] = useState(false);

  const [statsData, setStatsData] = useState({ sent: 0, received: 0, unread: 0 });
  const [loadingFriends, setLoadingFriends] = useState(false);

  const assignment = assignments.find(a => a.planetName === selectedPlanet);
  const friend = assignment?.friend;
  const isSun = selectedPlanet === 'Sun';

  // Ensure assignments are loaded whenever a planet is selected
  const fetchFriends = useAppStore(s => s.fetchFriends);
  useEffect(() => {
    if (selectedPlanet && selectedPlanet !== 'Sun') {
      void (async () => {
        setLoadingFriends(true);
        try { await fetchFriends(); } finally { setLoadingFriends(false); }
      })();
    }
  }, [selectedPlanet, fetchFriends]);

  useEffect(() => {
    void (async () => {
      if (friend) {
        try {
          const res = await api.get<{ sent: number; received: number; unread: number }>(`/api/letters/stats?friendId=${friend.id}`);
          setStatsData({ sent: res.sent, received: res.received, unread: res.unread });
        } catch { /* silent */ }
      } else {
        setStatsData({ sent: 0, received: 0, unread: 0 });
      }
    })();
  }, [friend]);

  if (!selectedPlanet) return null;

  // Aesthetic data for the NASA feel
  interface PlanetStat { dist: string; temp: string; gravity: string; desc: string; }
  const planetStats: Record<string, PlanetStat> = {
    Mercury: { dist: '91.7M km', temp: '430°C', gravity: '3.7 m/s²', desc: 'The smallest planet in our solar system and closest to the Sun.' },
    Venus: { dist: '41.4M km', temp: '462°C', gravity: '8.87 m/s²', desc: 'Often called Earth’s twin, but with a thick, toxic atmosphere.' },
    Earth: { dist: '0 km', temp: '15°C', gravity: '9.81 m/s²', desc: 'Our home world, the only known planet with life.' },
    Mars: { dist: '78.3M km', temp: '-63°C', gravity: '3.71 m/s²', desc: 'The Red Planet, home to Olympus Mons, the tallest volcano.' },
    Jupiter: { dist: '628.7M km', temp: '-108°C', gravity: '24.79 m/s²', desc: 'The king of planets, a gas giant with a Great Red Spot.' },
    Saturn: { dist: '1.2B km', temp: '-138°C', gravity: '10.44 m/s²', desc: 'Famous for its spectacular and complex ring system.' },
    Uranus: { dist: '2.6B km', temp: '-195°C', gravity: '8.69 m/s²', desc: 'An ice giant that rotates on its side.' },
    Neptune: { dist: '4.3B km', temp: '-201°C', gravity: '11.15 m/s²', desc: 'The most distant major planet, dark and cold.' },
  };

  const planetFacts: Record<string, string> = {
    Mercury: "A year on Mercury is just 88 Earth days, but a single day-night cycle takes 176 Earth days—making its days twice as long as its years!",
    Venus: "Venus spins backwards compared to most other planets, meaning the Sun rises in the west and sets in the east!",
    Earth: "Earth is the only place in the universe with liquid water on its surface, and its magnetic shield wards off lethal solar winds.",
    Mars: "Mars is home to Olympus Mons, the largest volcano in the Solar System, which is three three times the height of Mount Everest!",
    Jupiter: "Jupiter acts as a cosmic shield for Earth; its massive gravity pulls in or deflects most incoming comets and asteroids.",
    Saturn: "Saturn is so light and has such low density that if you could find a bathtub big enough, the entire planet would float!",
    Uranus: "Uranus rotates on its side like a rolling bowling ball, likely due to a colossal collision with an Earth-sized object long ago.",
    Neptune: "Neptune is home to supersonic winds that blow backward against its rotation, reaching speeds up to 2,100 km/h!",
    Pluto: "Pluto possesses a giant, heart-shaped glacier named Tombaugh Regio, composed of nitrogen, carbon monoxide, and methane ice.",
    Haumea: "Haumea spins so incredibly fast that it has been stretched into the unique shape of an elongated football!",
    Makemake: "Makemake lacks a significant atmosphere, but it is covered in frozen methane and ethane, giving it an ultra-cold red tint.",
    Eris: "Eris is so far away that it takes 558 Earth years to complete a single orbit around the Sun, and is covered in pristine white nitrogen ice."
  };

  const stats = planetStats[selectedPlanet] || { dist: 'Unknown', temp: 'N/A', gravity: 'N/A', desc: 'A distant celestial body in the outer rim.' };

  if (isSun) {
    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -50 }}
          className="planet-details-panel"
        >
          <div className="planet-details-card planet-details-card--sun group">
            <button onClick={() => setSelectedPlanet(null)} className="planet-details-close-btn">✕</button>
            <div>
              <h2 className="planet-details-title" style={{ color: '#4A9EFF' }}>THE SUN</h2>
              <p className="planet-details-sector" style={{ color: 'rgba(74, 158, 255, 0.6)', marginBottom: 16 }}>Central Star · Primary Interface</p>
              
              <div>
                <div className="planet-details-sun-block">
                  <h3 className="planet-details-sun-title">Future Self</h3>
                  <p className="planet-details-sun-desc">Schedule a letter to be delivered to your own inbox at a future date.</p>
                  <button onClick={() => {
                    setComposerRecipient({
                      id: 'sun',
                      displayName: 'Future Self',
                      username: 'future-self',
                      planetName: 'Sun'
                    });
                    onCompose();
                  }} className="planet-details-sun-btn">Write to Future Self</button>
                </div>
                <div className="planet-details-sun-block planet-details-sun-block--blue">
                  <h3 className="planet-details-sun-title">Global Inbox</h3>
                  <p className="planet-details-sun-desc">View all transmissions received from the cosmos.</p>
                  <button 
                    onClick={() => setInboxOpen(true)}
                    className="planet-details-sun-btn planet-details-sun-btn--outline"
                  >
                    Open Inbox
                  </button>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    );
  }

  return (
    <>
      <AnimatePresence>
        {selectedPlanet && (
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            className="planet-details-panel"
          >
          <div className="planet-details-card group">
            {/* Close button */}
            <button 
              onClick={() => setSelectedPlanet(null)}
              className="planet-details-close-btn"
            >
              ✕
            </button>

            {/* Content */}
            <div>
              <div className="planet-details-header">
                <h2 className="planet-details-title">
                  {selectedPlanet}
                </h2>
                <span className="planet-details-sector">Sector {selectedPlanet[0]}1</span>
              </div>
              
              {friend ? (
                <>
                  {/* Friend Panel */}
                  <div className="planet-details-profile">
                    {(() => {
                      const hue = friend.username.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % 360;
                      return (
                        <div
                          className="planet-friend-avatar"
                          style={{
                            ['--avatar-hue' as any]: hue
                          }}
                        >
                          {(friend.displayName || friend.username || '').charAt(0).toUpperCase()}
                        </div>
                      );
                    })()}
                    <div>
                      <p className="planet-details-profile-name">
                        {friend.displayName || friend.username}
                      </p>
                      <p className="planet-details-profile-username">
                        @{friend.username}
                      </p>
                    </div>
                  </div>
                  
                  {/* Friend Bio */}
                  <div className="planet-details-bio-box">
                    <p className="planet-details-bio-label">Cosmic Bio</p>
                    <p className={`planet-details-bio-content ${!friend.bio ? 'planet-details-bio-content--empty' : ''}`}>
                      {friend.bio || "No subspace bio broadcasted yet."}
                    </p>
                  </div>
                  
                  {/* Stats Grid */}
                  <div className="planet-details-stats-grid">
                    <div className="planet-details-stat-card">
                      <p className="planet-details-stat-label">Letters Sent</p>
                      <p className="planet-details-stat-value">{statsData.sent}</p>
                    </div>
                    <div className="planet-details-stat-card">
                      <p className="planet-details-stat-label">Letters Received</p>
                      <p className="planet-details-stat-value">{statsData.received}</p>
                    </div>
                    <div className="planet-details-stat-card">
                      <p className="planet-details-stat-label">Unread</p>
                      <p className={`planet-details-stat-value ${statsData.unread > 0 ? 'planet-details-stat-value--highlight' : ''}`}>{statsData.unread}</p>
                    </div>
                    <div className="planet-details-stat-card">
                      <p className="planet-details-stat-label">Status</p>
                      <p className={`planet-details-stat-value ${friend.isDeactivated ? 'planet-details-stat-value--inactive' : 'planet-details-stat-value--active'}`}>
                        {friend.isDeactivated ? 'INACTIVE' : 'ACTIVE'}
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="planet-details-actions-list">
                    <button
                      onClick={() => {
                        setComposerRecipient({
                          id: friend.id,
                          displayName: friend.displayName || friend.username || '',
                          username: friend.username,
                          planetName: selectedPlanet
                        });
                        onCompose();
                      }}
                      className="planet-details-btn-action planet-details-btn-action--primary"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                      <span>SEND TRANSMISSION</span>
                    </button>
                    
                    {(statsData.unread > 0 || statsData.received > 0 || statsData.sent > 0) && (
                      <button
                        onClick={() => {
                          setInboxFriendFilter(friend?.id || null);
                          setInboxOpen(true);
                        }}
                        className="planet-details-btn-action planet-details-btn-action--secondary"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                        <span>VIEW LETTERS</span>
                      </button>
                    )}

                    {/* Eject to Black Hole */}
                    {friend && (
                      <>
                        <button
                          onClick={() => setEjectConfirm(true)}
                          className="planet-details-btn-action planet-details-btn-action--danger"
                        >
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10"/></svg>
                          Eject to Black Hole
                        </button>

                        {/* Confirmation dialog */}
                        {ejectConfirm && (
                          <div className="planet-details-eject-dialog">
                            <p className="planet-details-eject-title">Confirm Ejection</p>
                            <p className="planet-details-eject-desc">
                              Are you sure you want to eject @{friend.username || friend.cosmic_id} into the black hole? Their planet will be destroyed and removed from your solar system.
                            </p>
                            <div className="planet-details-eject-btns">
                              <button
                                onClick={() => setEjectConfirm(false)}
                                className="planet-details-eject-btn"
                              >Cancel</button>
                              <button
                                disabled={isEjecting}
                                onClick={async () => {
                                  setIsEjecting(true);
                                  try {
                                    await api.post('/api/blackhole', { targetId: friend.id, reason: 'removed' });
                                    removeFriend(friend.id);
                                    setSelectedPlanet(null);
                                    setEjectConfirm(false);
                                    setEjectToast(`@${friend.username} has been ejected into the void`);
                                    setTimeout(() => setEjectToast(''), 4000);
                                  } catch {
                                    setEjectToast('Ejection failed. Connection still active.');
                                    setTimeout(() => setEjectToast(''), 3000);
                                  } finally {
                                    setIsEjecting(false);
                                  }
                                }}
                                className="planet-details-eject-btn planet-details-eject-btn--confirm"
                              >{isEjecting ? 'Ejecting...' : 'Confirm'}</button>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </>
              ) : loadingFriends ? (
                <div className="planet-details-empty-box">
                  <p className="planet-details-empty-text animate-pulse" style={{ color: '#4A9EFF', fontWeight: 'bold' }}>SCANNING SECTOR...</p>
                </div>
              ) : (
                <>
                  <div className="planet-details-empty-box">
                    <p className="planet-details-empty-text">No resonance detected in this sector.</p>
                  </div>

                  <div className="planet-details-divider" />

                  <p className="planet-details-desc-text">
                    {stats.desc}
                  </p>

                  <div className="planet-details-no-target-badge">
                    NO TRANSMISSION TARGET
                  </div>
                </>
              )}
            </div>
            
            {/* Tech details footer */}
            <div className="planet-details-footer">
              <p className="planet-details-footer-title">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="animate-pulse">
                  <path d="M2 12h20M12 2v20" />
                  <circle cx="12" cy="12" r="10" />
                </svg>
                COSMIC CODEX
              </p>
              <p className="planet-details-footer-text">
                {planetFacts[selectedPlanet] || "A mysterious and unexplored sector in the outer rim of the Solaris system, carrying primordial secrets."}
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>

    {/* Eject toast */}
    {ejectToast && (
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 bg-[#0a0a0f]/90 backdrop-blur-xl border border-red-500/40 text-red-400 px-6 py-3 rounded-full text-xs font-bold uppercase tracking-widest font-orbitron shadow-lg whitespace-nowrap pointer-events-none">
        {ejectToast}
      </div>
    )}
    </>
  );
}
