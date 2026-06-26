import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../lib/api';
import { useAppStore } from '../store/useAppStore';
import { PlanetPickerModal } from './PlanetPickerModal';

interface RequestUser {
  id: string;
  display_name: string;
  cosmic_id: string;
}

interface FriendRequest {
  id: string;
  sender?: RequestUser;
  target?: RequestUser;
  createdAt: string;
  status: string;
}

const AVAILABLE_PLANETS = [
  'Mercury', 'Venus', 'Earth', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune'
];

function getAvatarHue(str: string) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return Math.abs(hash) % 360;
}

export default function FriendRequestsModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const { fetchFriends, assignments } = useAppStore();
  const [tab, setTab] = useState<'incoming' | 'outgoing'>('incoming');
  const [incoming, setIncoming] = useState<FriendRequest[]>([]);
  const [outgoing, setOutgoing] = useState<FriendRequest[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [acceptingRequestId, setAcceptingRequestId] = useState<string | null>(null);
  const [selectedPlanets, setSelectedPlanets] = useState<Record<string, string>>({});

  const handleFinalize = async (id: string, planetName: string) => {
    try {
      await api.post(`/api/friends/request/${id}/finalize`, { planetName });
      setOutgoing(prev => prev.filter(r => r.id !== id));
      fetchFriends();
    } catch (err) {
      console.error(err);
    }
  };

  const fetchRequests = useCallback(async () => {
    setIsLoading(true);
    try {
      const [incRes, outRes] = await Promise.all([
        api.get<{ requests: FriendRequest[] }>('/api/friends/requests/incoming'),
        api.get<{ requests: FriendRequest[] }>('/api/friends/requests/outgoing'),
      ]);
      setIncoming(incRes.requests || []);
      setOutgoing(outRes.requests || []);
    } catch (err) {
      console.error('Failed to scan subspace requests:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      Promise.resolve().then(() => fetchRequests());
    }
  }, [isOpen, fetchRequests]);

  const handleDecline = async (id: string) => {
    try {
      await api.delete(`/api/friends/request/${id}/decline`);
      setIncoming(prev => prev.filter(r => r.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const handleCancel = async (id: string) => {
    try {
      await api.delete(`/api/friends/request/${id}/cancel`);
      setOutgoing(prev => prev.filter(r => r.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const handleAccept = async (planetName: string) => {
    if (!acceptingRequestId) return;
    try {
      await api.post(`/api/friends/request/${acceptingRequestId}/accept`, { planetName });
      setIncoming(prev => prev.filter(r => r.id !== acceptingRequestId));
      setAcceptingRequestId(null);
      fetchFriends();
    } catch (err) {
      console.error(err);
    }
  };

  // Build current occupied planets map to pass to PlanetPickerModal
  const assignedPlanetsMap: Record<string, string> = {};
  for (const a of assignments) {
    if (a.planetName && a.friend) {
      const f = a.friend as { displayName?: string; display_name?: string; username?: string; cosmic_id?: string };
      assignedPlanetsMap[a.planetName] = f.displayName || f.display_name || f.username || f.cosmic_id || 'Friend';
    }
  }

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div style={{ position: 'fixed', inset: 0, zIndex: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(6px)' }}
        />

        {/* Modal content */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96 }}
          className="cosmic-card"
          style={{
            position: 'relative',
            width: '100%',
            maxWidth: 'min(90vw, 560px)',
            display: 'flex',
            flexDirection: 'column',
            maxHeight: '80vh',
            backdropFilter: 'blur(24px)',
            overflow: 'hidden',
          }}
        >
          {/* Top golden border hook decoration */}
          <div style={{ height: 1, background: 'linear-gradient(90deg, transparent, rgba(200,160,80,0.5), transparent)', flexShrink: 0 }} />

          {/* Header */}
          <div style={{ padding: '28px 28px 20px', borderBottom: '1px solid rgba(180,140,80,0.15)', flexShrink: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
              <div>
                <h2 style={{ fontFamily: 'Orbitron, sans-serif', color: 'var(--accent-gold)', fontSize: 16, letterSpacing: 4, fontWeight: 700, margin: 0 }}>
                  TRANSMISSION CHANNELS
                </h2>
                <p style={{ color: 'var(--text-dim)', fontSize: 10, letterSpacing: 2, margin: '6px 0 0', textTransform: 'uppercase', fontFamily: "'Exo 2', sans-serif" }}>
                  Manage incoming and outgoing voyager connections
                </p>
              </div>
              <button
                title="Close"
                onClick={onClose}
                style={{
                  background: 'none',
                  border: '1px solid rgba(180,140,80,0.25)',
                  color: 'var(--text-dim)',
                  cursor: 'pointer',
                  width: 32,
                  height: 32,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 2,
                  transition: 'all 0.2s',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--accent-gold)';
                  (e.currentTarget as HTMLButtonElement).style.color = 'var(--accent-gold)';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(180,140,80,0.25)';
                  (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-dim)';
                }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
              <button
                onClick={() => setTab('incoming')}
                style={{
                  color: tab === 'incoming' ? 'var(--accent-gold)' : 'var(--text-dim)',
                  background: 'none',
                  border: 'none',
                  borderBottom: `2px solid ${tab === 'incoming' ? 'var(--accent-gold)' : 'transparent'}`,
                  paddingBottom: 6,
                  fontSize: 11,
                  cursor: 'pointer',
                  fontFamily: 'Orbitron, sans-serif',
                  letterSpacing: 2,
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                INCOMING
                {incoming.length > 0 && (
                  <span style={{ background: 'var(--accent-gold)', color: '#0A0806', fontSize: 9, fontWeight: 700, borderRadius: '10px', padding: '1px 6px' }}>
                    {incoming.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => setTab('outgoing')}
                style={{
                  color: tab === 'outgoing' ? 'var(--accent-gold)' : 'var(--text-dim)',
                  background: 'none',
                  border: 'none',
                  borderBottom: `2px solid ${tab === 'outgoing' ? 'var(--accent-gold)' : 'transparent'}`,
                  paddingBottom: 6,
                  fontSize: 11,
                  cursor: 'pointer',
                  fontFamily: 'Orbitron, sans-serif',
                  letterSpacing: 2,
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                OUTGOING
                {outgoing.length > 0 && (
                  <span style={{ background: 'rgba(180,140,80,0.15)', color: 'var(--accent-gold)', border: '1px solid rgba(180,140,80,0.3)', fontSize: 9, fontWeight: 700, borderRadius: '10px', padding: '1px 6px' }}>
                    {outgoing.length}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* List Content */}
          <div className="parchment-scroll" style={{ flex: 1, overflowY: 'auto', padding: '16px 28px' }}>
            {isLoading ? (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 160 }}>
                <p style={{ color: 'var(--text-dim)', fontSize: 11, fontFamily: 'Orbitron, sans-serif', letterSpacing: 3, textTransform: 'uppercase', animation: 'pulse 1.5s infinite' }}>
                  Scanning sector frequencies...
                </p>
              </div>
            ) : tab === 'incoming' ? (
              incoming.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '48px 16px' }}>
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="rgba(200,160,80,0.25)" strokeWidth="1.5" style={{ marginBottom: 12 }}>
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                  <p style={{ color: 'var(--text-dim)', fontSize: 11, fontFamily: "'Exo 2', sans-serif" }}>
                    No pending inbound connection requests.
                  </p>
                </div>
              ) : (
                incoming.map(req => {
                  if (!req.sender) return null;
                  const sender = req.sender;
                  const hue = getAvatarHue(sender.cosmic_id);
                  return (
                    <motion.div
                      key={req.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 14,
                        padding: '12px 14px',
                        background: 'rgba(200,160,80,0.02)',
                        border: '1px solid rgba(180,140,80,0.08)',
                        borderRadius: 3,
                        marginBottom: 10,
                      }}
                    >
                      <div
                        style={{
                          width: 38,
                          height: 38,
                          borderRadius: '50%',
                          flexShrink: 0,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontFamily: 'Orbitron, sans-serif',
                          fontWeight: 700,
                          fontSize: 14,
                          color: '#F0E8D8',
                          background: `conic-gradient(from 0deg, hsl(${hue},35%,22%), hsl(${hue+60},30%,28%))`,
                          border: '1px solid rgba(180,140,80,0.25)',
                        }}
                      >
                        {sender.display_name[0]?.toUpperCase()}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ color: 'var(--text-primary)', fontSize: 13, fontFamily: "'Exo 2', sans-serif", fontWeight: 600, margin: 0 }}>
                          {sender.display_name}
                        </p>
                        <p style={{ color: 'var(--text-dim)', fontSize: 10, margin: '2px 0 0', fontFamily: 'monospace' }}>
                          @{sender.cosmic_id}
                        </p>
                      </div>
                      <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                        <button
                          onClick={() => setAcceptingRequestId(req.id)}
                          style={{
                            padding: '6px 14px',
                            background: 'var(--accent-gold)',
                            border: 'none',
                            color: 'black',
                            fontFamily: 'Orbitron, sans-serif',
                            fontSize: 9,
                            fontWeight: 700,
                            letterSpacing: 2,
                            cursor: 'pointer',
                            borderRadius: 2,
                            boxShadow: '0 0 10px rgba(200,160,80,0.15)',
                            transition: 'all 0.2s',
                          }}
                          onMouseEnter={e => {
                            (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 0 18px rgba(200,160,80,0.3)';
                          }}
                          onMouseLeave={e => {
                            (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 0 10px rgba(200,160,80,0.15)';
                          }}
                        >
                          ACCEPT
                        </button>
                        <button
                          onClick={() => handleDecline(req.id)}
                          style={{
                            padding: '6px 14px',
                            background: 'transparent',
                            border: '1px solid rgba(180,140,80,0.25)',
                            color: 'var(--text-dim)',
                            fontFamily: 'Orbitron, sans-serif',
                            fontSize: 9,
                            letterSpacing: 2,
                            cursor: 'pointer',
                            borderRadius: 2,
                            transition: 'all 0.2s',
                          }}
                          onMouseEnter={e => {
                            (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(239, 68, 68, 0.4)';
                            (e.currentTarget as HTMLButtonElement).style.color = 'rgb(239, 68, 68)';
                            (e.currentTarget as HTMLButtonElement).style.background = 'rgba(239, 68, 68, 0.05)';
                          }}
                          onMouseLeave={e => {
                            (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(180,140,80,0.25)';
                            (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-dim)';
                            (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                          }}
                        >
                          DECLINE
                        </button>
                      </div>
                    </motion.div>
                  );
                })
              )
            ) : (
              outgoing.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '48px 16px' }}>
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="rgba(200,160,80,0.25)" strokeWidth="1.5" style={{ marginBottom: 12 }}>
                    <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="8.5" cy="7" r="4" />
                    <line x1="20" y1="8" x2="20" y2="14" />
                    <line x1="23" y1="11" x2="17" y2="11" />
                  </svg>
                  <p style={{ color: 'var(--text-dim)', fontSize: 11, fontFamily: "'Exo 2', sans-serif" }}>
                    No outgoing traveler connections scanned.
                  </p>
                </div>
              ) : (
                outgoing.map(req => {
                  if (!req.target) return null;
                  const target = req.target;
                  const hue = getAvatarHue(target.cosmic_id);
                  const isAccepted = req.status === 'accepted';
                  return (
                    <motion.div
                      key={req.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 14,
                        padding: '12px 14px',
                        background: 'rgba(200,160,80,0.01)',
                        border: '1px solid rgba(180,140,80,0.05)',
                        borderRadius: 3,
                        marginBottom: 10,
                      }}
                    >
                      <div
                        style={{
                          width: 38,
                          height: 38,
                          borderRadius: '50%',
                          flexShrink: 0,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontFamily: 'Orbitron, sans-serif',
                          fontWeight: 700,
                          fontSize: 14,
                          color: '#F0E8D8',
                          background: `conic-gradient(from 0deg, hsl(${hue},35%,22%), hsl(${hue+60},30%,28%))`,
                          border: '1px solid rgba(180,140,80,0.15)',
                        }}
                      >
                        {target.display_name[0]?.toUpperCase()}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ color: 'var(--text-primary)', fontSize: 13, fontFamily: "'Exo 2', sans-serif", fontWeight: 600, margin: 0 }}>
                          {isAccepted ? `${target.display_name} accepted your request — assign them a planet` : target.display_name}
                        </p>
                        <p style={{ color: 'var(--text-dim)', fontSize: 10, margin: '2px 0 0', fontFamily: 'monospace' }}>
                          @{target.cosmic_id}
                        </p>
                        {isAccepted && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10 }}>
                            <select
                              value={selectedPlanets[req.id] || ''}
                              onChange={e => setSelectedPlanets(prev => ({ ...prev, [req.id]: e.target.value }))}
                              title="Select destination planet"
                              style={{
                                background: '#1c1712',
                                border: '1px solid rgba(180,140,80,0.3)',
                                color: 'var(--text-primary)',
                                fontSize: 11,
                                padding: '4px 8px',
                                borderRadius: 2,
                                fontFamily: 'Orbitron, sans-serif',
                                outline: 'none',
                                cursor: 'pointer'
                              }}
                            >
                              <option value="">-- Choose Planet --</option>
                              {AVAILABLE_PLANETS.map(p => {
                                const occupant = assignedPlanetsMap[p];
                                return (
                                  <option key={p} value={p} disabled={!!occupant}>
                                    {p} {occupant ? `(occupied by ${occupant})` : ''}
                                  </option>
                                );
                              })}
                            </select>
                            <button
                              disabled={!selectedPlanets[req.id]}
                              onClick={() => handleFinalize(req.id, selectedPlanets[req.id]!)}
                              style={{
                                padding: '5px 12px',
                                background: selectedPlanets[req.id] ? 'var(--accent-gold)' : 'rgba(200,160,80,0.1)',
                                border: 'none',
                                color: selectedPlanets[req.id] ? 'black' : 'rgba(255,255,255,0.3)',
                                fontFamily: 'Orbitron, sans-serif',
                                fontSize: 9,
                                fontWeight: 700,
                                letterSpacing: 1,
                                cursor: selectedPlanets[req.id] ? 'pointer' : 'default',
                                borderRadius: 2,
                                transition: 'all 0.2s',
                              }}
                            >
                              CONFIRM
                            </button>
                          </div>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: 8, flexShrink: 0, alignSelf: isAccepted ? 'center' : 'auto' }}>
                        <button
                          onClick={() => handleCancel(req.id)}
                          style={{
                            padding: '6px 14px',
                            background: 'transparent',
                            border: '1px solid rgba(220,180,100,0.2)',
                            color: 'rgba(220,180,100,0.7)',
                            fontFamily: 'Orbitron, sans-serif',
                            fontSize: 9,
                            letterSpacing: 2,
                            cursor: 'pointer',
                            borderRadius: 2,
                            transition: 'all 0.2s',
                          }}
                          onMouseEnter={e => {
                            (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(239, 68, 68, 0.4)';
                            (e.currentTarget as HTMLButtonElement).style.color = 'rgb(239, 68, 68)';
                            (e.currentTarget as HTMLButtonElement).style.background = 'rgba(239, 68, 68, 0.05)';
                          }}
                          onMouseLeave={e => {
                            (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(220,180,100,0.2)';
                            (e.currentTarget as HTMLButtonElement).style.color = 'rgba(220,180,100,0.7)';
                            (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                          }}
                        >
                          RETRACT
                        </button>
                      </div>
                    </motion.div>
                  );
                })
              )
            )}
          </div>
        </motion.div>
      </div>

      {acceptingRequestId && (
        <PlanetPickerModal
          title="Assign Planet to Friend"
          assignedPlanets={assignedPlanetsMap}
          onClose={() => setAcceptingRequestId(null)}
          onSelect={handleAccept}
        />
      )}
    </AnimatePresence>
  );
}
