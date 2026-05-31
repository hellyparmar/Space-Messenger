import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '../store/useAppStore';
import { api } from '../lib/api';
import { PlanetPickerModal } from './PlanetPickerModal';
import { STICKERS, PAPER_STYLES } from '../lib/letterStyles';

interface LetterInboxProps {
  isOpen: boolean;
  onClose: () => void;
  onCompose?: (friendId?: string) => void;
}

function getAvatarHue(str: string) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return Math.abs(hash) % 360;
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) +
    ' · ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
}

export default function LetterInbox({ isOpen, onClose, onCompose }: LetterInboxProps) {
  const { letters, markRead, assignments, setComposerRecipient, fetchFriends, user } = useAppStore();
  const [tab, setTab] = useState<'received' | 'sent'>('received');
  const [expanded, setExpanded] = useState<string | null>(null);
  // Future-self: senderId === receiverId === user.id → appears in BOTH tabs (when delivered)
  const isFutureSelf = (l: any) => l.senderId === user?.id && l.receiverId === user?.id;

  // Received: letters sent TO me (including future-self deliveries, but NOT pending ones)
  const receivedLetters = letters.filter(l => (l.senderId !== user?.id || isFutureSelf(l)) && !l.isPending);
  // Sent: letters sent BY me (including future-self letters and future-scheduled letters, showing compose time)
  const sentLetters     = letters.filter(l => l.senderId === user?.id);
  const activeLetters   = tab === 'received' ? receivedLetters : sentLetters;

  const expandedLetter = letters.find(l => l.id === expanded);

  const getSender = (senderId: string) => {
    if (senderId === user?.id) {
      return { displayName: 'Past Self', username: 'past-self', planet: 'Sun' };
    }
    for (const a of assignments) {
      const f = a.friend as { id?: string; userId?: string; displayName?: string; display_name?: string; username?: string; cosmic_id?: string } | undefined;
      if (f?.id === senderId || f?.userId === senderId) {
        return {
          displayName: f.displayName || f.display_name || 'Unknown',
          username: f.username || f.cosmic_id || 'unknown',
          planet: a.planetName,
        };
      }
    }
    return { displayName: 'Unknown System', username: 'unknown', planet: null };
  };

  const handleRead = async (id: string, isRead: boolean) => {
    if (isRead) return;
    try { await api.patch('/api/letters/' + id + '/read', {}); markRead(id); } catch { /* silent */ }
  };

  const handleExpand = (id: string, isRead: boolean) => {
    setExpanded(id);
    handleRead(id, isRead);
  };

  const assignedPlanetsMap: Record<string, string> = {};
  for (const a of assignments) {
    if (a.planetName && a.friend) {
      const f = a.friend as { displayName?: string; display_name?: string; username?: string; cosmic_id?: string };
      assignedPlanetsMap[a.planetName] = f.displayName || f.display_name || f.username || f.cosmic_id || 'Friend';
    }
  }

  const unreadCount = receivedLetters.filter(l => !l.isRead).length;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)' }}
          />

          {/* Panel */}
          <motion.div
            initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 220 }}
            className="cosmic-card"
            style={{
              position: 'fixed', top: 0, left: 0, height: '100%', width: 420,
              zIndex: 101, display: 'flex', flexDirection: 'column',
              backdropFilter: 'blur(24px)',
            }}
          >
            {/* Top accent */}
            <div style={{ height: 1, background: 'linear-gradient(90deg, rgba(200,160,80,0.5), transparent)', flexShrink: 0 }} />

            {/* Header */}
            <div style={{ padding: '28px 24px 16px', borderBottom: '1px solid rgba(180,140,80,0.15)', flexShrink: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div>
                  <h2 style={{ fontFamily: 'Orbitron, sans-serif', color: 'var(--accent-gold)', fontSize: 16, letterSpacing: 4, fontWeight: 700, margin: 0 }}>COSMIC INBOX</h2>
                  <p style={{ color: 'var(--text-dim)', fontSize: 10, letterSpacing: 3, margin: '4px 0 0', textTransform: 'uppercase' }}>
                    {unreadCount > 0 ? `${unreadCount} unread transmissions` : 'All transmissions read'}
                  </p>
                </div>
                <button
                  title="Close"
                  onClick={onClose}
                  style={{ background: 'none', border: '1px solid rgba(180,140,80,0.25)', color: 'var(--text-dim)', cursor: 'pointer', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 2 }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
                </button>
              </div>
              {/* ── Received / Sent tabs ── */}
              <div style={{ display: 'flex', gap: 0, borderRadius: 2, overflow: 'hidden', border: '1px solid rgba(180,140,80,0.2)' }}>
                {(['received', 'sent'] as const).map(t => (
                  <button
                    key={t}
                    onClick={() => { setTab(t); setExpanded(null); }}
                    style={{
                      flex: 1, padding: '8px 0',
                      background: tab === t ? 'rgba(200,160,80,0.15)' : 'transparent',
                      border: 'none',
                      borderRight: t === 'received' ? '1px solid rgba(180,140,80,0.2)' : 'none',
                      color: tab === t ? 'var(--accent-gold)' : 'var(--text-dim)',
                      fontFamily: 'Orbitron, sans-serif', fontSize: 9, letterSpacing: 3,
                      textTransform: 'uppercase', cursor: 'pointer', transition: 'all 0.2s',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    }}
                  >
                    {t === 'received' ? (
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                    ) : (
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                    )}
                    {t === 'received' ? `Received (${receivedLetters.length})` : `Sent (${sentLetters.length})`}
                    {t === 'received' && unreadCount > 0 && (
                      <span style={{ background: 'var(--accent-gold)', color: '#0A0806', borderRadius: '50%', width: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 700 }}>{unreadCount}</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
            {/* Letter list */}
            <div className="parchment-scroll" style={{ flex: 1, overflowY: 'auto', padding: '12px 0' }}>
              {activeLetters.length === 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60%', gap: 12, padding: 24 }}>
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="rgba(200,160,80,0.3)" strokeWidth="1.5"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                  <p style={{ color: 'var(--text-dim)', fontSize: 12, fontStyle: 'italic', fontFamily: "'Exo 2', sans-serif", textAlign: 'center' }}>{tab === 'received' ? 'No transmissions received yet.' : 'No letters sent yet.'}</p>
                  <p style={{ color: 'var(--text-dim)', fontSize: 10, opacity: 0.6, fontFamily: "'Exo 2', sans-serif" }}>{tab === 'received' ? 'Your inbox is as quiet as deep space.' : 'Compose a letter to begin.'}</p>
                </div>
              ) : (
                activeLetters.map((letter, idx) => {
                  // For sent tab: show recipient info instead of sender
                  const sender = getSender(tab === 'sent' ? (letter.receiverId || letter.senderId) : letter.senderId);
                  const hue = getAvatarHue(sender.username);
                  const rowLabel = tab === 'sent'
                    ? (isFutureSelf(letter) ? 'To: Future Self' : `To: ${sender.displayName}`)
                    : sender.displayName;
                  return (
                    <motion.div
                      key={letter.id}
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.04 }}
                      onClick={() => handleExpand(letter.id, letter.isRead)}
                      style={{
                        cursor: 'pointer', padding: '14px 24px', display: 'flex', gap: 12, alignItems: 'flex-start',
                        // Sent letters never show the unread highlight — only received letters do
                        borderLeft: `2px solid ${(tab === 'received' && !letter.isRead) ? 'var(--accent-gold)' : 'transparent'}`,
                        background: (tab === 'received' && !letter.isRead) ? 'rgba(200,160,80,0.03)' : 'transparent',
                        borderBottom: '1px solid rgba(180,140,80,0.08)',
                        transition: 'background 0.15s',
                        opacity: (tab === 'sent' || letter.isRead) ? 0.65 : 1,
                      }}
                      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = 'rgba(200,160,80,0.06)'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = (tab === 'received' && !letter.isRead) ? 'rgba(200,160,80,0.03)' : 'transparent'; }}
                    >
                      {/* Avatar */}
                      <div style={{
                        width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontFamily: 'Orbitron, sans-serif', fontWeight: 700, fontSize: 13, color: '#F0E8D8',
                        background: `conic-gradient(from 0deg, hsl(${hue},35%,22%), hsl(${hue+60},30%,28%))`,
                        border: '1px solid rgba(180,140,80,0.25)',
                      }}>
                        {sender.displayName[0]?.toUpperCase()}
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 2 }}>
                          <span style={{ fontFamily: 'Orbitron, sans-serif', color: tab === 'sent' ? 'rgba(200,160,80,0.75)' : 'var(--text-primary)', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                            {rowLabel}
                            {letter.isPending && (
                              <span style={{
                                padding: '1px 5px',
                                background: 'rgba(234, 88, 12, 0.12)',
                                border: '1px solid rgba(234, 88, 12, 0.35)',
                                color: '#f97316',
                                borderRadius: '2px',
                                fontSize: '8px',
                                letterSpacing: '1px',
                                fontFamily: 'Orbitron, sans-serif',
                                textTransform: 'uppercase',
                                fontWeight: 700,
                                transform: 'translateY(-1px)'
                              }}>
                                Scheduled
                              </span>
                            )}
                          </span>
                          <span style={{ color: 'var(--text-dim)', fontSize: 10, letterSpacing: 1, flexShrink: 0, marginLeft: 8, fontFamily: 'monospace' }}>
                            {letter.isPending
                              ? `Due: ${formatDate(letter.scheduledAt)}`
                              : (tab === 'received' && isFutureSelf(letter))
                                ? formatDate(letter.scheduledAt || letter.createdAt)   // show delivery time
                                : formatDate(letter.createdAt)                          // show compose time
                            }
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                          <span style={{ color: 'var(--text-dim)', fontSize: 10, fontFamily: "'Exo 2', sans-serif" }}>@{sender.username}</span>
                          {sender.planet && (
                            <span style={{ color: 'var(--accent-gold)', fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', fontFamily: 'Orbitron, sans-serif', opacity: 0.7 }}>
                              {sender.planet}
                            </span>
                          )}
                        </div>
                        <p style={{ color: 'var(--text-dim)', fontSize: 12, fontFamily: "'Exo 2', sans-serif", lineHeight: 1.5, margin: 0, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as 'vertical' }}>
                          {letter.content}
                        </p>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </div>

            {/* Footer / Compose Action */}
            <div style={{ padding: '16px 24px', borderTop: '1px solid rgba(180,140,80,0.15)', background: 'rgba(0,0,0,0.2)', display: 'flex', gap: 10, flexShrink: 0 }}>
              <button
                onClick={() => {
                  setComposerRecipient(null); // Clear previous locked recipient!
                  onClose();
                  if (onCompose) onCompose();
                }}
                style={{
                  width: '100%', padding: '12px 0',
                  background: 'linear-gradient(135deg, rgba(200,160,80,0.2), rgba(150,110,50,0.15))',
                  border: '1px solid var(--accent-gold)',
                  color: 'var(--accent-gold)', fontFamily: 'Orbitron, sans-serif',
                  fontSize: 10, letterSpacing: 3, textTransform: 'uppercase', cursor: 'pointer', borderRadius: 2,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  boxShadow: '0 0 15px rgba(200,160,80,0.1)',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLButtonElement).style.background = 'rgba(200,160,80,0.3)';
                  (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 0 25px rgba(200,160,80,0.25)';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLButtonElement).style.background = 'linear-gradient(135deg, rgba(200,160,80,0.2), rgba(150,110,50,0.15))';
                  (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 0 15px rgba(200,160,80,0.1)';
                }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg>
                Compose Transmission
              </button>
            </div>
          </motion.div>

          {/* Expanded Letter Modal */}
          <AnimatePresence>
            {expanded && expandedLetter && (() => {
              const sender = getSender(expandedLetter.senderId);
              const hue = getAvatarHue(sender.username);
              return (
                <motion.div
                  key="modal"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  style={{ position: 'fixed', inset: 0, zIndex: 102, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
                  onClick={() => setExpanded(null)}
                >
                  <motion.div
                    initial={{ scale: 0.96, y: 8 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.96, y: 8 }}
                    className="cosmic-card"
                    style={{ width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto', padding: 36, position: 'relative', backdropFilter: 'blur(24px)' }}
                    onClick={e => e.stopPropagation()}
                  >
                    {/* Top rule */}
                    <div style={{ height: 1, background: 'linear-gradient(90deg, transparent, rgba(200,160,80,0.5), transparent)', position: 'absolute', top: 0, left: 0, right: 0 }} />

                    <button
                      title="Close"
                      onClick={() => setExpanded(null)}
                      style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
                    </button>

                    {/* Sender */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24 }}>
                      <div style={{
                        width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontFamily: 'Orbitron, sans-serif', fontWeight: 700, fontSize: 16, color: '#F0E8D8',
                        background: `conic-gradient(from 0deg, hsl(${hue},35%,22%), hsl(${hue+60},30%,28%))`,
                        border: '1px solid rgba(180,140,80,0.3)',
                      }}>
                        {sender.displayName[0]?.toUpperCase()}
                      </div>
                      <div>
                        <p style={{ fontFamily: 'Orbitron, sans-serif', color: 'var(--text-primary)', fontSize: 13, fontWeight: 600, margin: 0 }}>{sender.displayName}</p>
                        <p style={{ color: 'var(--text-dim)', fontSize: 11, margin: '3px 0 0', fontFamily: "'Exo 2', sans-serif" }}>@{sender.username}</p>
                      </div>
                      <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                        <p style={{ color: 'var(--text-dim)', fontSize: 10, fontFamily: 'monospace', margin: 0 }}>
                          Sent: {formatDate(expandedLetter.createdAt)}
                        </p>
                        {expandedLetter.senderId === user?.id && expandedLetter.scheduledAt && (
                          <p style={{ color: 'var(--accent-gold)', fontSize: 10, fontFamily: 'monospace', margin: '4px 0 0' }}>
                            Delivered: {formatDate(expandedLetter.scheduledAt)}
                          </p>
                        )}
                        {sender.planet && sender.planet !== 'Sun' && (
                          <p style={{ color: 'var(--accent-gold)', fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', fontFamily: 'Orbitron, sans-serif', margin: '3px 0 0', opacity: 0.8 }}>
                            {sender.planet}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Diamond divider */}
                    <div className="parchment-divider">
                      <span style={{ color: 'var(--text-dim)', fontSize: 9, letterSpacing: 3 }}>◆</span>
                    </div>

                    {/* Letter body — minHeight ensures the paper always looks like a full sheet */}
                    <div style={{ position: 'relative', overflow: 'hidden', background: 'var(--input-bg)', border: '1px solid var(--input-border)', borderRadius: 2, padding: '20px 24px', marginBottom: 24, minHeight: 320, ...(expandedLetter.paperSkin ? PAPER_STYLES[expandedLetter.paperSkin] : {}) }}>
                      {expandedLetter.stickers && expandedLetter.stickers.map((sticker: any) => (
                        <div
                          key={sticker.id}
                          style={{
                            position: 'absolute',
                            left: `${sticker.x}%`,
                            top: `${sticker.y}%`,
                            transform: `translate(-50%, -50%) rotate(${sticker.rot}deg)`,
                            width: '32px',
                            height: '32px',
                            opacity: 0.8,
                            color: expandedLetter.paperSkin ? PAPER_STYLES[expandedLetter.paperSkin].color : 'var(--text-primary)',
                            pointerEvents: 'none'
                          }}
                        >
                          {STICKERS[sticker.iconId]}
                        </div>
                      ))}
                      <p style={{ position: 'relative', zIndex: 10, color: expandedLetter.paperSkin ? PAPER_STYLES[expandedLetter.paperSkin].color : 'var(--text-primary)', lineHeight: '32px', fontSize: '18px', whiteSpace: 'pre-wrap', margin: 0, fontFamily: '"Special Elite", cursive' }}>
                        {expandedLetter.content}
                      </p>
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: 10 }}>
                      {onCompose && (
                        <button
                          onClick={() => {
                            setComposerRecipient({ id: expandedLetter.senderId, displayName: sender.displayName, username: sender.username, planetName: sender.planet || 'Unknown' });
                            setExpanded(null); onClose(); onCompose();
                          }}
                          style={{
                            flex: 1, padding: '10px 0',
                            background: 'transparent', border: '1px solid var(--accent-gold)',
                            color: 'var(--accent-gold)', fontFamily: 'Orbitron, sans-serif',
                            fontSize: 9, letterSpacing: 3, textTransform: 'uppercase', cursor: 'pointer', borderRadius: 2,
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                            transition: 'background 0.2s',
                          }}
                          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(200,160,80,0.1)'; }}
                          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                          REPLY
                        </button>
                      )}
                      {!expandedLetter.isRead && (
                        <button
                          onClick={() => handleRead(expandedLetter.id, false)}
                          style={{
                            flex: 1, padding: '10px 0',
                            background: 'transparent', border: '1px solid rgba(180,140,80,0.2)',
                            color: 'var(--text-dim)', fontFamily: 'Orbitron, sans-serif',
                            fontSize: 9, letterSpacing: 3, textTransform: 'uppercase', cursor: 'pointer', borderRadius: 2,
                            transition: 'background 0.2s',
                          }}
                          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(180,140,80,0.05)'; }}
                          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
                        >
                          MARK READ
                        </button>
                      )}
                    </div>
                  </motion.div>
                </motion.div>
              );
            })()}
          </AnimatePresence>
        </>
      )}
    </AnimatePresence>
  );
}
