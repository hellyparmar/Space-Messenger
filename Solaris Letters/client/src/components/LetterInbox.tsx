import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import DOMPurify from 'dompurify';
import { useAppStore } from '../store/useAppStore';
import { api } from '../lib/api';
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
  const { 
    letters, markRead, assignments, setComposerRecipient, user, inboxFriendFilter, setInboxFriendFilter,
    groups, fetchGroups, setSelectedGroupId, setGroupChatOpen
  } = useAppStore();
  const [tab, setTab] = useState<'received' | 'sent' | 'groups'>('received');
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      void fetchGroups();
    }
  }, [isOpen, fetchGroups]);
  // Future-self: senderId === receiverId === user.id → appears in BOTH tabs (when delivered)
  const isFutureSelf = (l: { senderId?: string; receiverId?: string }) => l.senderId === user?.id && l.receiverId === user?.id;

  // Received: letters sent TO me (including future-self deliveries, but NOT pending ones)
  const receivedLetters = letters
    .filter(l => (l.senderId !== user?.id || isFutureSelf(l)) && !l.isPending)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  // Sent: letters sent BY me (including future-self letters and future-scheduled letters, showing compose time)
  const sentLetters     = letters
    .filter(l => l.senderId === user?.id)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  // If a friend filter is active, narrow down to only the conversation with that friend
  const applyFriendFilter = (list: typeof letters) => {
    if (!inboxFriendFilter) return list;
    return list.filter(l =>
      l.senderId === inboxFriendFilter || l.receiverId === inboxFriendFilter
    );
  };

  const activeLetters   = applyFriendFilter(tab === 'received' ? receivedLetters : sentLetters);

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

  const displayedReceived = applyFriendFilter(receivedLetters);
  const displayedSent = applyFriendFilter(sentLetters);
  const unreadCount = displayedReceived.filter(l => !l.isRead).length;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="inbox-backdrop"
          />

          {/* Panel */}
          <motion.div
            initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 220 }}
            className="cosmic-card cosmic-inbox-panel inbox-panel-body"
          >
            {/* Top accent */}
            <div className="inbox-top-accent" />

            {/* Header */}
            <div className="inbox-header">
              <div className="inbox-header-row">
                <div>
                  <h2 className="inbox-title">COSMIC INBOX</h2>
                  <p className="inbox-subtitle">
                    {inboxFriendFilter
                      ? (() => {
                          const a = assignments.find(a => { const f = a.friend as { id?: string; userId?: string } | undefined; return f?.id === inboxFriendFilter || f?.userId === inboxFriendFilter; });
                          const name = a ? ((a.friend as { displayName?: string; username?: string })?.displayName || (a.friend as { username?: string })?.username || 'Friend') : 'Friend';
                          return `Conversation with ${name}`;
                        })()
                      : unreadCount > 0 ? `${unreadCount} unread transmissions` : 'All transmissions read'
                    }
                  </p>
                  {inboxFriendFilter && (
                    <button
                      onClick={() => setInboxFriendFilter(null)}
                      className="inbox-back-btn"
                    >
                      ← View all letters
                    </button>
                  )}
                </div>
                <button
                  title="Close"
                  onClick={onClose}
                  className="inbox-close-btn"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
                </button>
              </div>
              {/* ── Received / Sent / Clusters tabs ── */}
              <div className="inbox-tabs">
                {(['received', 'sent', 'groups'] as const).map(t => (
                  <button
                    key={t}
                    onClick={() => { setTab(t); setExpanded(null); }}
                    className={`inbox-tab-btn ${tab === t ? 'inbox-tab-btn--active' : ''}`}
                  >
                    {t === 'received' && (
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                    )}
                    {t === 'sent' && (
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                    )}
                    {t === 'groups' && (
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                    )}
                    {t === 'received' && `Inbox (${displayedReceived.length})`}
                    {t === 'sent' && `Sent (${displayedSent.length})`}
                    {t === 'groups' && `Clusters (${groups.length})`}
                    {t === 'received' && unreadCount > 0 && (
                      <span className="inbox-badge">{unreadCount}</span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Letter list */}
            <div className="parchment-scroll inbox-letter-list">
              {tab === 'groups' ? (
                groups.length === 0 ? (
                  <div className="inbox-empty-state">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="rgba(200,160,80,0.3)" strokeWidth="1.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                    <p className="inbox-empty-text">No active clusters.</p>
                    <p className="inbox-empty-hint">Create or join a cluster from the Solar System to start chatting.</p>
                  </div>
                ) : (
                  groups.map((g, idx) => {
                    const hue = getAvatarHue(g.name);
                    const memberCount = g.members?.length ?? g.memberCount ?? 0;
                    return (
                      <motion.div
                        key={g.id}
                        initial={{ opacity: 0, x: -12 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.04 }}
                        className="inbox-letter-row inbox-letter-row--read-or-sent"
                        onClick={() => {
                          setSelectedGroupId(g.id);
                          setGroupChatOpen(true);
                          onClose();
                        }}
                      >
                        {/* Avatar / Icon */}
                        <div 
                          className="inbox-letter-avatar" 
                          style={{ 
                            ['--avatar-hue' as any]: hue,
                            border: g.theme_color ? `1px solid ${g.theme_color}` : undefined
                          }}
                        >
                          🛰️
                        </div>

                        <div className="inbox-letter-row-body">
                          <div className="inbox-letter-row-header">
                            <span className="inbox-letter-row-label">
                              {g.name}
                            </span>
                            <span className="inbox-letter-timestamp">
                              {memberCount} Traveler{memberCount !== 1 ? 's' : ''}
                            </span>
                          </div>
                          <div className="inbox-letter-row-username-row">
                            <span className="inbox-letter-username">Sector Cluster</span>
                            {g.theme_color && (
                              <span 
                                className="inbox-letter-planet"
                                style={{ 
                                  borderColor: g.theme_color,
                                  color: g.theme_color
                                }}
                              >
                                Channel Active
                              </span>
                            )}
                          </div>
                          <p className="inbox-preview-text">
                            Secure subspace connection. Click to open transmission line chat panel.
                          </p>
                        </div>
                      </motion.div>
                    );
                  })
                )
              ) : activeLetters.length === 0 ? (
                <div className="inbox-empty-state">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="rgba(200,160,80,0.3)" strokeWidth="1.5"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                  <p className="inbox-empty-text">{tab === 'received' ? 'No transmissions received yet.' : 'No letters sent yet.'}</p>
                  <p className="inbox-empty-hint">{tab === 'received' ? 'Your inbox is as quiet as deep space.' : 'Compose a letter to begin.'}</p>
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
                      className={`inbox-letter-row ${tab === 'received' && !letter.isRead ? 'inbox-letter-row--unread' : ''} ${tab === 'sent' || letter.isRead ? 'inbox-letter-row--read-or-sent' : ''}`}
                      onClick={() => handleExpand(letter.id, letter.isRead)}
                    >
                      {/* Avatar */}
                      <div className="inbox-letter-avatar" style={{ ['--avatar-hue' as any]: hue }}>
                        {sender.displayName[0]?.toUpperCase()}
                      </div>

                      <div className="inbox-letter-row-body">
                        <div className="inbox-letter-row-header">
                          <span className={`inbox-letter-row-label ${tab === 'sent' ? 'inbox-letter-row-label--sent' : ''}`}>
                            {rowLabel}
                            {letter.isPending && (
                              <span className="inbox-scheduled-badge">
                                Scheduled
                              </span>
                            )}
                          </span>
                          <span className="inbox-letter-timestamp">
                            {letter.isPending
                              ? (letter.scheduledAt ? `Due: ${formatDate(letter.scheduledAt)}` : 'Scheduled')
                              : (tab === 'received' && isFutureSelf(letter))
                                ? formatDate(letter.scheduledAt ?? letter.createdAt)   // show delivery time
                                : formatDate(letter.createdAt)                          // show compose time
                            }
                          </span>
                        </div>
                        <div className="inbox-letter-row-username-row">
                          <span className="inbox-letter-username">@{sender.username}</span>
                          {sender.planet && (
                            <span className="inbox-letter-planet">
                              {sender.planet}
                            </span>
                          )}
                        </div>
                        <p className="inbox-preview-text">
                          {DOMPurify.sanitize(letter.content)}
                        </p>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </div>

            {/* Footer / Compose Action */}
            <div className="inbox-footer">
              <button
                onClick={() => {
                  setComposerRecipient(null);
                  onClose();
                  if (onCompose) onCompose();
                }}
                className="inbox-compose-btn"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg>
                Compose Transmission
              </button>
            </div>
          </motion.div>

          {/* Expanded Letter Modal */}
          <AnimatePresence>
            {expanded && expandedLetter && (() => {
              const isSent = expandedLetter.senderId === user?.id;
              const targetUserId = isSent ? (expandedLetter.receiverId || expandedLetter.senderId) : expandedLetter.senderId;
              const person = getSender(targetUserId);
              const isSelf = expandedLetter.senderId === user?.id && expandedLetter.receiverId === user?.id;
              const displayName = isSent 
                ? (isSelf ? 'To: Future Self' : `To: ${person.displayName}`)
                : person.displayName;
              const username = person.username;
              const hue = getAvatarHue(username);
              return (
                <motion.div
                  key="modal"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="inbox-modal-overlay"
                  onClick={() => setExpanded(null)}
                >
                  <motion.div
                    initial={{ scale: 0.96, y: 8 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.96, y: 8 }}
                    className="cosmic-card inbox-modal-card"
                    onClick={e => e.stopPropagation()}
                  >
                    {/* Top rule */}
                    <div className="inbox-modal-top-rule" />

                    <button
                      title="Close"
                      onClick={() => setExpanded(null)}
                      className="inbox-modal-close-btn"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
                    </button>

                    {/* Sender / Recipient */}
                    <div className="inbox-modal-sender-row">
                      <div className="inbox-letter-avatar inbox-letter-avatar--large" style={{ ['--avatar-hue' as any]: hue }}>
                        {person.displayName[0]?.toUpperCase()}
                      </div>
                      <div>
                        <p className="inbox-sender-name">{displayName}</p>
                        <p className="inbox-sender-username">@{username}</p>
                      </div>
                      <div className="inbox-modal-meta">
                        <p className="inbox-meta-date">
                          Sent: {formatDate(expandedLetter.createdAt)}
                        </p>
                        {expandedLetter.senderId === user?.id && expandedLetter.scheduledAt && (
                          <p className="inbox-meta-delivered">
                            Delivered: {formatDate(expandedLetter.scheduledAt)}
                          </p>
                        )}
                        {person.planet && person.planet !== 'Sun' && (
                          <p className="inbox-meta-planet">
                            {person.planet}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Diamond divider */}
                    <div className="parchment-divider">
                      <span className="parchment-diamond">◆</span>
                    </div>

                    {/* Letter body — minHeight ensures the paper always looks like a full sheet */}
                    <div className="inbox-letter-paper" style={expandedLetter.paperSkin ? PAPER_STYLES[expandedLetter.paperSkin] : {}}>
                      {expandedLetter.stickers && expandedLetter.stickers.map((sticker: { id: string; x: number; y: number; rot: number; iconId: string }) => (
                        <div
                          key={sticker.id}
                          className="inbox-letter-sticker"
                          style={{
                            left: `${sticker.x}%`,
                            top: `${sticker.y}%`,
                            transform: `translate(-50%, -50%) rotate(${sticker.rot}deg)`,
                          }}
                        >
                          {STICKERS[sticker.iconId]}
                        </div>
                      ))}
                      <p className="inbox-letter-content">
                        {DOMPurify.sanitize(expandedLetter.content)}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="inbox-actions-row">
                      {onCompose && (
                        <button
                          onClick={() => {
                            const replyToId = expandedLetter.senderId === user?.id
                              ? expandedLetter.receiverId
                              : expandedLetter.senderId;
                            const replyToInfo = getSender(replyToId);
                            setComposerRecipient({
                              id: replyToId,
                              displayName: replyToInfo.displayName,
                              username: replyToInfo.username,
                              planetName: replyToInfo.planet || 'Unknown'
                            });
                            setExpanded(null); onClose(); onCompose();
                          }}
                          className="inbox-action-btn"
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                          REPLY
                        </button>
                      )}
                      {!expandedLetter.isRead && (
                        <button
                          onClick={() => handleRead(expandedLetter.id, false)}
                          className="inbox-action-btn inbox-action-btn--dim"
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
