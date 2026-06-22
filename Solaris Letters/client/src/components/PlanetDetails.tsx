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
      setLoadingFriends(true);
      fetchFriends().finally(() => setLoadingFriends(false));
    }
  }, [selectedPlanet, fetchFriends]);

  useEffect(() => {
    if (friend) {
      api.get<{ sent: number; received: number; unread: number }>(`/api/letters/stats?friendId=${friend.id}`)
        .then((res: { sent: number; received: number; unread: number }) =>
          setStatsData({ sent: res.sent, received: res.received, unread: res.unread })
        )
        .catch(() => {});
    } else {
      setStatsData({ sent: 0, received: 0, unread: 0 });
    }
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
          className="fixed left-8 top-1/2 -translate-y-1/2 w-80 z-40"
        >
          <div className="bg-[#050510]/60 border border-[#4A9EFF]/30 rounded-3xl p-6 backdrop-blur-2xl shadow-2xl relative overflow-hidden group">
            <button onClick={() => setSelectedPlanet(null)} className="absolute top-4 right-4 text-[#4A9EFF]/40 hover:text-[#4A9EFF]/100">✕</button>
            <div className="relative">
              <h2 className="text-3xl font-bold text-[#4A9EFF] tracking-tighter font-outfit">THE SUN</h2>
              <p className="text-[#4A9EFF]/60 text-[10px] font-bold uppercase tracking-widest mb-4">Central Star · Primary Interface</p>
              
              <div className="space-y-4">
                <div className="bg-amber-500/5 border border-amber-500/10 rounded-xl p-4">
                  <h3 className="text-white font-bold text-sm mb-1">Future Self</h3>
                  <p className="text-white/40 text-[10px]">Schedule a letter to be delivered to your own inbox at a future date.</p>
                  <button onClick={() => {
                    setComposerRecipient({
                      id: 'sun',
                      displayName: 'Future Self',
                      username: 'future-self',
                      planetName: 'Sun'
                    });
                    onCompose();
                  }} className="mt-3 w-full py-2 bg-[#4A9EFF] text-black text-[10px] font-bold uppercase rounded-lg hover:brightness-110 transition-all">Write to Future Self</button>
                </div>
                <div className="bg-[#4A9EFF]/5 border border-[#4A9EFF]/10 rounded-xl p-4">
                  <h3 className="text-white font-bold text-sm mb-1">Global Inbox</h3>
                  <p className="text-white/40 text-[10px]">View all transmissions received from the cosmos.</p>
                  <button 
                    onClick={() => setInboxOpen(true)}
                    className="mt-3 w-full py-2 border border-[#4A9EFF]/30 text-[#4A9EFF] text-[10px] font-bold uppercase rounded-lg"
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
            className="fixed left-8 top-1/2 -translate-y-1/2 w-80 z-40"
          >
          <div className="bg-[#050510]/60 border border-white/10 rounded-3xl p-6 backdrop-blur-2xl shadow-2xl relative overflow-hidden group">
            {/* Aesthetic background scanline effect */}
            <div className="absolute inset-0 bg-gradient-to-b from-white/[0.02] to-transparent pointer-events-none" />
            
            {/* Close button */}
            <button 
              onClick={() => setSelectedPlanet(null)}
              className="absolute top-4 right-4 text-white/20 hover:text-white/60 transition-colors"
            >
              ✕
            </button>

            {/* Content */}
            <div className="relative">
              <div className="flex items-baseline gap-2 mb-1">
                <h2 className="text-3xl font-bold text-white tracking-tighter font-outfit">
                  {selectedPlanet}
                </h2>
                <span className="text-[10px] text-[#4A9EFF] font-mono font-bold tracking-widest uppercase">Sector {selectedPlanet[0]}1</span>
              </div>
              
              {friend ? (
                <>
                  {/* Friend Panel */}
                  <div className="mb-6 flex items-center gap-4">
                    {(() => {
                      const hue = friend.username.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % 360;
                      return (
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-[#F0E8D8] text-lg font-orbitron shadow-lg border border-white/20"
                          style={{
                            background: `conic-gradient(from 180deg at 50% 50%, hsl(${hue},40%,20%), hsl(${hue + 60},35%,25%), hsl(${hue},40%,20%))`
                          }}
                        >
                          {(friend.displayName || friend.username || '').charAt(0).toUpperCase()}
                        </div>
                      );
                    })()}
                    <div>
                      <p className="text-white font-bold text-xl leading-none font-outfit">
                        {friend.displayName || friend.username}
                      </p>
                      <p className="text-white/40 text-[10px] uppercase font-mono tracking-widest mt-1">
                        @{friend.username}
                      </p>
                    </div>
                  </div>
                  
                  {/* Stats Grid */}
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="bg-white/5 border border-white/5 rounded-xl p-3 flex flex-col">
                      <p className="text-[9px] text-white/20 uppercase font-bold tracking-widest mb-1">Letters Sent</p>
                      <p className="text-white/90 text-sm font-mono tabular-nums mt-auto">{statsData.sent}</p>
                    </div>
                    <div className="bg-white/5 border border-white/5 rounded-xl p-3 flex flex-col">
                      <p className="text-[9px] text-white/20 uppercase font-bold tracking-widest mb-1">Letters Received</p>
                      <p className="text-white/90 text-sm font-mono tabular-nums mt-auto">{statsData.received}</p>
                    </div>
                    <div className="bg-white/5 border border-white/5 rounded-xl p-3">
                      <p className="text-[9px] text-white/20 uppercase font-bold tracking-widest mb-1">Unread</p>
                      <p className={`text-sm font-mono ${statsData.unread > 0 ? 'text-[#4A9EFF] font-bold' : 'text-white/90'}`}>{statsData.unread}</p>
                    </div>
                    <div className="bg-white/5 border border-white/5 rounded-xl p-3">
                      <p className="text-[9px] text-white/20 uppercase font-bold tracking-widest mb-1">Status</p>
                      <p className={`text-sm font-mono font-bold ${friend.isDeactivated ? 'text-red-500' : 'text-green-500'}`}>
                        {friend.isDeactivated ? 'INACTIVE' : 'ACTIVE'}
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-3 mt-4 mb-8">
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
                      className="w-full py-4 rounded-xl bg-[#0a1a3a] border border-[#4A9EFF]/50 text-[#4A9EFF] text-[12px] font-bold uppercase tracking-widest font-orbitron hover:bg-[#4A9EFF] hover:text-black transition-all flex items-center justify-center gap-2"
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
                        className="w-full py-3 rounded-xl bg-white/5 border border-white/20 text-white/80 text-[10px] font-bold uppercase tracking-widest hover:bg-white/10 transition-all flex items-center justify-center gap-2"
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
                          className="w-full py-2 rounded-xl border border-red-900/40 text-red-500/60 text-[9px] font-bold uppercase tracking-widest hover:bg-red-900/10 hover:text-red-400 transition-all flex items-center justify-center gap-1.5 mt-1"
                        >
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10"/></svg>
                          Eject to Black Hole
                        </button>

                        {/* Confirmation dialog */}
                        {ejectConfirm && (
                          <div className="mt-2 p-4 rounded-xl border border-red-500/30 bg-red-950/20">
                            <p className="text-red-400 text-[10px] font-bold uppercase tracking-wider mb-1">Confirm Ejection</p>
                            <p className="text-white/50 text-[10px] leading-relaxed mb-3">
                              Are you sure you want to eject @{friend.username || friend.cosmic_id} into the black hole? Their planet will be destroyed and removed from your solar system.
                            </p>
                            <div className="flex gap-2">
                              <button
                                onClick={() => setEjectConfirm(false)}
                                className="flex-1 py-2 rounded-lg border border-white/10 text-white/40 text-[9px] font-bold uppercase hover:bg-white/5 transition-all"
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
                                className="flex-1 py-2 rounded-lg border border-red-500/50 text-red-400 text-[9px] font-bold uppercase hover:bg-red-500/10 transition-all disabled:opacity-50"
                              >{isEjecting ? 'Ejecting...' : 'Confirm'}</button>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </>
              ) : loadingFriends ? (
                <div className="mb-6 p-3 bg-white/5 border border-white/10 rounded-xl opacity-60">
                  <p className="text-[#4A9EFF]/60 text-[10px] font-mono tracking-widest animate-pulse">SCANNING SECTOR...</p>
                </div>
              ) : (
                <>
                  <div className="mb-6 p-3 bg-white/5 border border-white/10 rounded-xl opacity-40">
                    <p className="text-white/40 text-[10px] italic">No resonance detected in this sector.</p>
                  </div>

                  <div className="w-12 h-1 bg-gradient-to-r from-[#4A9EFF] to-transparent rounded-full mb-6" />

                  <p className="text-white/50 text-xs leading-relaxed mb-6 font-medium">
                    {stats.desc}
                  </p>

                  <div className="text-center py-4 text-red-500/80 text-[10px] font-bold tracking-widest uppercase border border-red-500/20 bg-red-500/5 rounded-xl mb-6">
                    NO TRANSMISSION TARGET
                  </div>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-2 gap-4 mb-8">
                    <div className="bg-white/5 border border-white/5 rounded-xl p-3">
                      <p className="text-[9px] text-white/20 uppercase font-bold tracking-widest mb-1">Distance</p>
                      <p className="text-white/90 text-sm font-mono">{stats.dist}</p>
                    </div>
                    <div className="bg-white/5 border border-white/5 rounded-xl p-3">
                      <p className="text-[9px] text-white/20 uppercase font-bold tracking-widest mb-1">Temp Avg</p>
                      <p className="text-white/90 text-sm font-mono">{stats.temp}</p>
                    </div>
                    <div className="bg-white/5 border border-white/5 rounded-xl p-3">
                      <p className="text-[9px] text-white/20 uppercase font-bold tracking-widest mb-1">Gravity</p>
                      <p className="text-white/90 text-sm font-mono">{stats.gravity}</p>
                    </div>
                    <div className="bg-white/5 border border-white/5 rounded-xl p-3">
                      <p className="text-[9px] text-white/20 uppercase font-bold tracking-widest mb-1">Signal</p>
                      <p className="text-red-400 text-sm font-mono">NULL</p>
                    </div>
                  </div>
                </>
              )}
            </div>
            
            {/* Tech details footer */}
            <div className="mt-6 pt-4 border-t border-white/10 flex flex-col gap-2">
              <p className="text-[10px] text-amber-400 font-orbitron font-bold tracking-widest uppercase flex items-center gap-1.5">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="animate-pulse">
                  <path d="M2 12h20M12 2v20" />
                  <circle cx="12" cy="12" r="10" />
                </svg>
                COSMIC CODEX
              </p>
              <p className="text-[11px] text-[#F0E8D8]/85 leading-relaxed font-sans italic pl-2 border-l-2 border-amber-500/40">
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
