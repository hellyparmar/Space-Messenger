import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../lib/api';
import { useAppStore } from '../store/useAppStore';

interface BlackholeEntry {
  id: string;
  target_id: string;
  target_display_name: string;
  target_cosmic_id: string;
  reason: 'removed' | 'blocked';
  created_at: string;
}

interface BlackholePanelProps {
  isOpen: boolean;
  onClose: () => void;
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return `${d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} · ${d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`;
}

export default function BlackholePanel({ isOpen, onClose }: BlackholePanelProps) {
  const [entries, setEntries] = useState<BlackholeEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [restoring, setRestoring] = useState<string | null>(null);
  const fetchFriends = useAppStore(s => s.fetchFriends);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get<BlackholeEntry[]>('/api/blackhole');
      setEntries(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) load();
  }, [isOpen, load]);

  const handleRestore = async (targetId: string) => {
    setRestoring(targetId);
    try {
      await api.delete(`/api/blackhole/${targetId}`);
      setEntries(prev => prev.filter(e => e.target_id !== targetId));
      await fetchFriends();
    } catch (e) {
      console.error(e);
    } finally {
      setRestoring(null);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{
            position: 'fixed', inset: 0, zIndex: 999,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)',
          }}
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            onClick={e => e.stopPropagation()}
            style={{
              width: 420, maxHeight: '80vh',
              background: 'linear-gradient(160deg, #0d0a05 0%, #100808 50%, #080610 100%)',
              border: '1px solid rgba(180,80,20,0.30)',
              borderRadius: 4,
              display: 'flex', flexDirection: 'column',
              overflow: 'hidden',
              boxShadow: '0 0 60px rgba(80,10,0,0.6), 0 0 120px rgba(40,5,0,0.4)',
            }}
          >
            {/* Header */}
            <div style={{
              padding: '24px 24px 16px',
              borderBottom: '1px solid rgba(180,80,20,0.15)',
              background: 'linear-gradient(180deg, rgba(80,10,0,0.25) 0%, transparent 100%)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h2 style={{
                    fontFamily: 'Orbitron, sans-serif', color: '#FF6030',
                    fontSize: 14, letterSpacing: 4, fontWeight: 700, margin: 0,
                  }}>⬛ EVENT HORIZON</h2>
                  <p style={{
                    color: 'rgba(180,100,60,0.7)', fontSize: 10,
                    letterSpacing: 2, margin: '4px 0 0',
                    fontFamily: "'Exo 2', sans-serif", textTransform: 'uppercase',
                  }}>
                    {entries.length} {entries.length === 1 ? 'entity' : 'entities'} lost to the void
                  </p>
                </div>
                <button
                  onClick={onClose}
                  title="Close Event Horizon panel"
                  aria-label="Close Event Horizon panel"
                  style={{
                    background: 'none', border: '1px solid rgba(180,80,20,0.3)',
                    color: 'rgba(180,100,60,0.6)', cursor: 'pointer',
                    width: 32, height: 32, display: 'flex',
                    alignItems: 'center', justifyContent: 'center', borderRadius: 2,
                  }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <path d="M18 6L6 18M6 6l12 12"/>
                  </svg>
                </button>
              </div>
            </div>

            {/* Entry list */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
              {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: '50%',
                    border: '2px solid rgba(180,80,20,0.2)',
                    borderTopColor: '#FF6030', animation: 'spin 0.8s linear infinite',
                  }} />
                </div>
              ) : entries.length === 0 ? (
                <div style={{
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center',
                  padding: 48, gap: 12,
                }}>
                  <div style={{ fontSize: 36, opacity: 0.3 }}>⬛</div>
                  <p style={{
                    color: 'rgba(180,100,60,0.5)', fontSize: 12,
                    fontStyle: 'italic', fontFamily: "'Exo 2', sans-serif",
                    textAlign: 'center',
                  }}>The event horizon is empty.<br/>No connections have been lost to the void.</p>
                </div>
              ) : (
                entries.map((entry, idx) => (
                  <motion.div
                    key={entry.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    style={{
                      padding: '14px 20px',
                      borderBottom: '1px solid rgba(180,80,20,0.08)',
                      display: 'flex', gap: 12, alignItems: 'center',
                    }}
                  >
                    {/* Avatar */}
                    <div style={{
                      width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
                      background: 'radial-gradient(circle, rgba(80,20,5,0.9), rgba(20,5,0,0.9))',
                      border: '1px solid rgba(180,80,20,0.25)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontFamily: 'Orbitron, sans-serif', fontSize: 13, fontWeight: 700,
                      color: 'rgba(180,80,40,0.7)',
                      filter: 'grayscale(0.4)',
                    }}>
                      {entry.target_display_name[0]?.toUpperCase() || '?'}
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                        <span style={{
                          fontFamily: 'Orbitron, sans-serif',
                          color: 'rgba(200,120,60,0.75)', fontSize: 11, fontWeight: 600,
                          textDecoration: 'line-through', textDecorationColor: 'rgba(180,60,20,0.4)',
                        }}>
                          {entry.target_display_name}
                        </span>
                        <span style={{
                          fontFamily: "'Exo 2', sans-serif",
                          fontSize: 9, letterSpacing: 2, textTransform: 'uppercase',
                          padding: '2px 6px', borderRadius: 2,
                          background: entry.reason === 'blocked'
                            ? 'rgba(180,20,20,0.2)' : 'rgba(80,60,20,0.2)',
                          color: entry.reason === 'blocked'
                            ? 'rgba(220,80,80,0.8)' : 'rgba(180,140,60,0.7)',
                          border: `1px solid ${entry.reason === 'blocked' ? 'rgba(180,20,20,0.3)' : 'rgba(120,100,40,0.3)'}`,
                          flexShrink: 0, marginLeft: 8,
                        }}>
                          {entry.reason}
                        </span>
                      </div>
                      <p style={{
                        color: 'rgba(140,80,40,0.5)', fontSize: 10,
                        fontFamily: 'monospace', margin: '3px 0 0',
                      }}>
                        @{entry.target_cosmic_id} · {formatDate(entry.created_at)}
                      </p>
                    </div>

                    {/* Restore button */}
                    <button
                      onClick={() => handleRestore(entry.target_id)}
                      disabled={restoring === entry.target_id}
                      title="Remove from void"
                      style={{
                        background: 'none', border: '1px solid rgba(180,80,20,0.25)',
                        color: 'rgba(180,100,60,0.6)', cursor: 'pointer',
                        padding: '4px 8px', borderRadius: 2, fontSize: 9,
                        fontFamily: 'Orbitron, sans-serif', letterSpacing: 1,
                        flexShrink: 0, transition: 'all 0.15s',
                        opacity: restoring === entry.target_id ? 0.4 : 1,
                      }}
                    >
                      {restoring === entry.target_id ? '...' : 'RESTORE'}
                    </button>
                  </motion.div>
                ))
              )}
            </div>

            {/* Footer note */}
            <div style={{
              padding: '10px 20px',
              borderTop: '1px solid rgba(180,80,20,0.1)',
              background: 'rgba(10,5,0,0.5)',
            }}>
              <p style={{
                color: 'rgba(140,80,40,0.4)', fontSize: 9,
                fontFamily: "'Exo 2', sans-serif", letterSpacing: 2,
                textTransform: 'uppercase', margin: 0, textAlign: 'center',
              }}>
                Deleted &amp; blocked connections are stored here
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
