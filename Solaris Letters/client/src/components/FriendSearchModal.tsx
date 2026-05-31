import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '../store/useAppStore';
import { api } from '../lib/api';
import { PlanetPickerModal } from './PlanetPickerModal';

interface SearchUser {
  id: string;
  cosmic_id: string;
  display_name: string;
}

function getAvatarHue(str: string) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return Math.abs(hash) % 360;
}

export default function FriendSearchModal({
  isOpen,
  onClose,
  onCompose,
}: {
  isOpen: boolean;
  onClose: () => void;
  onCompose?: () => void;
}) {
  const { user, assignments, fetchFriends, setComposerRecipient } = useAppStore();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchUser[]>([]);
  const [isSearching, setSearching] = useState(false);
  const [addedStatus, setAddedStatus] = useState<Record<string, string>>({});
  const [toast, setToast] = useState('');
  const [pickerFriendId, setPickerFriendId] = useState<string | null>(null);
  const [tab, setTab] = useState<'search' | 'groups'>('search');
  const [groupName, setGroupName] = useState('');
  const [groupMembers, setGroupMembers] = useState<string[]>([]);
  const [groups, setGroups] = useState<any[]>([]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  useEffect(() => {
    if (tab === 'groups') {
      api.get<{groups: any[]}>('/api/groups').then(res => setGroups(res.groups || []));
    }
  }, [tab]);

  const doSearch = useCallback(async (q: string) => {
    if (q.trim().length < 2) { setResults([]); return; }
    setSearching(true);
    try {
      const res = await api.get<{ users: SearchUser[] }>(`/api/users/search?q=${encodeURIComponent(q)}`);
      setResults((res.users || []).filter(u => u.id !== user?.id));
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  }, [user?.id]);

  useEffect(() => {
    const t = setTimeout(() => doSearch(query), 300);
    return () => clearTimeout(t);
  }, [query, doSearch]);

  const sendRequest = async (targetUsername: string) => {
    try {
      await api.post('/api/friends/request', { targetUsername });
      setAddedStatus(prev => ({ ...prev, [targetUsername]: 'requested' }));
      showToast(`Friend request sent!`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setAddedStatus(prev => ({ ...prev, [targetUsername]: msg.includes('409') ? 'exists' : 'error' }));
      showToast(msg);
    }
  };

  const handleCreateGroup = async () => {
    if (!groupName) return;
    try {
      await api.post('/api/groups', { name: groupName, memberUsernames: groupMembers });
      showToast('Group launched!');
      setGroupName('');
      setGroupMembers([]);
      const res = await api.get<{groups: any[]}>('/api/groups');
      setGroups(res.groups || []);
    } catch (err: any) {
      showToast(err.message);
    }
  };

  const isFriend = (userId: string) =>
    assignments.some((a: { friend?: { id?: string; cosmic_id?: string } }) => a.friend?.id === userId || a.friend?.cosmic_id === userId);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={onClose}
          style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(6px)' }}
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96 }}
          className="cosmic-card"
          style={{
            position: 'relative', width: '100%', maxWidth: 560,
            display: 'flex', flexDirection: 'column', maxHeight: '85vh',
            backdropFilter: 'blur(24px)', overflow: 'hidden',
          }}
        >
          {/* Top rule */}
          <div style={{ height: 1, background: 'linear-gradient(90deg, transparent, rgba(200,160,80,0.5), transparent)', flexShrink: 0 }} />

          {/* Header */}
          <div style={{ padding: '28px 28px 20px', borderBottom: '1px solid rgba(180,140,80,0.15)', flexShrink: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
              <div>
                <h2 style={{ fontFamily: 'Orbitron, sans-serif', color: 'var(--accent-gold)', fontSize: 16, letterSpacing: 4, fontWeight: 700, margin: 0 }}>SUBSPACE SCANNER</h2>
                <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                  <button onClick={() => setTab('search')} style={{ color: tab === 'search' ? 'var(--accent-gold)' : 'var(--text-dim)', background:'none', border:'none', fontSize: 10, cursor:'pointer', fontFamily: 'Orbitron, sans-serif', letterSpacing: 2 }}>SEARCH & PLANETS</button>
                  <button onClick={() => setTab('groups')} style={{ color: tab === 'groups' ? 'var(--accent-gold)' : 'var(--text-dim)', background:'none', border:'none', fontSize: 10, cursor:'pointer', fontFamily: 'Orbitron, sans-serif', letterSpacing: 2 }}>GROUPS</button>
                </div>
              </div>
              <button
                title="Close"
                onClick={onClose}
                style={{ background: 'none', border: '1px solid rgba(180,140,80,0.25)', color: 'var(--text-dim)', cursor: 'pointer', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 2 }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>

            {tab === 'search' && (
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--accent-gold)', opacity: 0.6, display: 'flex' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                </span>
                <input
                  type="text"
                  autoFocus
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Search by @cosmic_id or display name..."
                  style={{
                    width: '100%', boxSizing: 'border-box',
                    background: 'var(--input-bg)',
                    border: '1px solid var(--input-border)',
                    borderRadius: 2,
                    color: 'var(--text-primary)',
                    fontFamily: "'Exo 2', sans-serif",
                    fontSize: 13,
                    padding: '10px 14px 10px 38px',
                    outline: 'none',
                    transition: 'border-color 0.2s',
                  }}
                  onFocus={e => { e.currentTarget.style.borderColor = 'var(--accent-gold)'; }}
                  onBlur={e => { e.currentTarget.style.borderColor = 'var(--input-border)'; }}
                />
              </div>
            )}
          </div>

          {/* Body */}
          <div className="parchment-scroll" style={{ flex: 1, overflowY: 'auto' }}>
            {tab === 'search' ? (
              <>
                {/* My Planets */}
                {assignments.length > 0 && (
              <div style={{ padding: '16px 24px 8px' }}>
                <p style={{ fontFamily: 'Orbitron, sans-serif', color: 'var(--accent-gold)', fontSize: 9, letterSpacing: 4, textTransform: 'uppercase', marginBottom: 12, opacity: 0.8 }}>
                  MY PLANETS
                </p>
                {assignments.map((a: { planetName: string; friend?: { id?: string; displayName?: string; display_name?: string; cosmic_id?: string; username?: string } }) => {
                  const f = a.friend;
                  if (!f) return null;
                  const name = f.displayName || f.display_name || f.cosmic_id || 'Unknown';
                  const uname = f.username || f.cosmic_id || '';
                  const hue = getAvatarHue(uname || name);
                  return (
                    <div
                      key={a.planetName}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 12,
                        padding: '10px 0',
                        borderBottom: '1px solid rgba(180,140,80,0.1)',
                        transition: 'background 0.15s', cursor: 'default',
                      }}
                      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = 'rgba(200,160,80,0.04)'; (e.currentTarget as HTMLDivElement).style.paddingLeft = '6px'; (e.currentTarget as HTMLDivElement).style.borderLeft = '2px solid var(--accent-gold)'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = 'transparent'; (e.currentTarget as HTMLDivElement).style.paddingLeft = '0'; (e.currentTarget as HTMLDivElement).style.borderLeft = 'none'; }}
                    >
                      <div style={{
                        width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontFamily: 'Orbitron, sans-serif', fontWeight: 700, fontSize: 12, color: '#F0E8D8',
                        background: `conic-gradient(from 0deg, hsl(${hue},35%,22%), hsl(${hue+60},30%,28%))`,
                        border: '1px solid rgba(180,140,80,0.25)',
                      }}>
                        {name[0]?.toUpperCase()}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ color: 'var(--text-primary)', fontSize: 13, fontFamily: "'Exo 2', sans-serif", fontWeight: 600 }}>{name}</span>
                          <span style={{ color: 'var(--accent-gold)', fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', fontFamily: 'Orbitron, sans-serif', opacity: 0.7 }}>{a.planetName}</span>
                        </div>
                        <p style={{ color: 'var(--text-dim)', fontSize: 10, margin: '2px 0 0', fontFamily: "'Exo 2', sans-serif" }}>@{uname}</p>
                      </div>
                      {onCompose && (
                        <button
                          onClick={() => {
                            setComposerRecipient({ id: f.id || '', displayName: name, username: uname, planetName: a.planetName });
                            onClose(); onCompose();
                          }}
                          style={{
                            padding: '6px 14px', background: 'transparent',
                            border: '1px solid var(--accent-gold)',
                            color: 'var(--accent-gold)', fontFamily: 'Orbitron, sans-serif',
                            fontSize: 9, letterSpacing: 2, textTransform: 'uppercase',
                            cursor: 'pointer', borderRadius: 2, flexShrink: 0,
                            display: 'flex', alignItems: 'center', gap: 5,
                            transition: 'background 0.15s',
                          }}
                          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(200,160,80,0.1)'; }}
                          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
                        >
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                          SEND
                        </button>
                      )}
                      <button
                        onClick={() => setPickerFriendId(f.id || null)}
                        style={{
                          padding: '6px 14px', background: 'transparent',
                          border: '1px solid var(--text-dim)',
                          color: 'var(--text-dim)', fontFamily: 'Orbitron, sans-serif',
                          fontSize: 9, letterSpacing: 2, textTransform: 'uppercase',
                          cursor: 'pointer', borderRadius: 2, flexShrink: 0,
                          transition: 'background 0.15s',
                        }}
                        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.05)'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
                      >
                        REASSIGN
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Search Results */}
            {query.trim().length >= 2 && (
              <div style={{ padding: '16px 24px' }}>
                <p style={{ fontFamily: 'Orbitron, sans-serif', color: 'var(--accent-gold)', fontSize: 9, letterSpacing: 4, textTransform: 'uppercase', marginBottom: 12, opacity: 0.8 }}>
                  SEARCH RESULTS
                </p>
                {isSearching ? (
                  <p style={{ textAlign: 'center', color: 'var(--text-dim)', fontSize: 10, letterSpacing: 3, textTransform: 'uppercase', padding: '32px 0', fontFamily: 'Orbitron, sans-serif', animation: 'pulse 1.5s infinite' }}>
                    Scanning subspace...
                  </p>
                ) : results.length === 0 ? (
                  <p style={{ textAlign: 'center', color: 'var(--text-dim)', fontSize: 10, letterSpacing: 3, textTransform: 'uppercase', padding: '32px 0', fontFamily: "'Exo 2', sans-serif" }}>
                    No travelers found in this sector
                  </p>
                ) : (
                  results.map(r => {
                    const status = addedStatus[r.cosmic_id];
                    const alreadyFriend = isFriend(r.id);
                    const hue = getAvatarHue(r.cosmic_id);
                    return (
                      <motion.div
                        key={r.id}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 12,
                          padding: '10px 0',
                          borderBottom: '1px solid rgba(180,140,80,0.1)',
                          transition: 'background 0.15s, border-left 0.15s',
                        }}
                        onMouseEnter={e => {
                          (e.currentTarget as HTMLDivElement).style.background = 'rgba(200,160,80,0.04)';
                          (e.currentTarget as HTMLDivElement).style.borderLeft = '2px solid var(--accent-gold)';
                          (e.currentTarget as HTMLDivElement).style.paddingLeft = '6px';
                        }}
                        onMouseLeave={e => {
                          (e.currentTarget as HTMLDivElement).style.background = 'transparent';
                          (e.currentTarget as HTMLDivElement).style.borderLeft = 'none';
                          (e.currentTarget as HTMLDivElement).style.paddingLeft = '0';
                        }}
                      >
                        <div style={{
                          width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontFamily: 'Orbitron, sans-serif', fontWeight: 700, fontSize: 13, color: '#F0E8D8',
                          background: `conic-gradient(from 0deg, hsl(${hue},35%,22%), hsl(${hue+60},30%,28%))`,
                          border: '1px solid rgba(180,140,80,0.25)',
                        }}>
                          {r.display_name?.[0]?.toUpperCase()}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ color: 'var(--text-primary)', fontSize: 13, fontFamily: "'Exo 2', sans-serif", fontWeight: 600, margin: 0 }}>{r.display_name}</p>
                          <p style={{ color: 'var(--text-dim)', fontSize: 10, margin: '2px 0 0', fontFamily: 'monospace' }}>@{r.cosmic_id}</p>
                        </div>
                        {alreadyFriend ? (
                          <button disabled style={{ padding: '6px 14px', background: 'rgba(80,120,80,0.15)', border: '1px solid rgba(80,160,80,0.35)', color: '#80B880', fontFamily: 'Orbitron, sans-serif', fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', cursor: 'default', borderRadius: 2 }}>
                            LINKED
                          </button>
                        ) : status === 'requested' || status === 'added' ? (
                          <button disabled style={{ padding: '6px 14px', background: 'rgba(120,120,120,0.15)', border: '1px solid rgba(160,160,160,0.35)', color: '#A0A0A0', fontFamily: 'Orbitron, sans-serif', fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', cursor: 'default', borderRadius: 2 }}>
                            REQUEST SENT
                          </button>
                        ) : status === 'error' ? (
                          <button disabled style={{ padding: '6px 14px', background: 'rgba(120,40,40,0.2)', border: '1px solid rgba(160,80,80,0.4)', color: '#C08080', fontFamily: 'Orbitron, sans-serif', fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', cursor: 'default', borderRadius: 2 }}>
                            ERROR
                          </button>
                        ) : (
                          <button
                            onClick={() => sendRequest(r.cosmic_id)}
                            style={{
                              padding: '6px 14px', background: 'transparent',
                              border: '1px solid var(--accent-gold)',
                              color: 'var(--accent-gold)', fontFamily: 'Orbitron, sans-serif',
                              fontSize: 9, letterSpacing: 2, textTransform: 'uppercase',
                              cursor: 'pointer', borderRadius: 2,
                              display: 'flex', alignItems: 'center', gap: 5,
                              transition: 'background 0.15s',
                            }}
                            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(200,160,80,0.1)'; }}
                            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
                          >
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                            SEND REQUEST
                          </button>
                        )}
                      </motion.div>
                    );
                  })
                )}
              </div>
            )}

            {/* Empty state */}
            {assignments.length === 0 && query.trim().length < 2 && (
              <div style={{ padding: '48px 24px', textAlign: 'center' }}>
                <p style={{ color: 'var(--text-dim)', fontSize: 10, letterSpacing: 3, textTransform: 'uppercase', fontFamily: "'Exo 2', sans-serif" }}>
                  Search to discover travelers in the cosmos
                </p>
              </div>
            )}
              </>
            ) : (
              <div style={{ padding: '16px 24px' }}>
                <p style={{ fontFamily: 'Orbitron, sans-serif', color: 'var(--accent-gold)', fontSize: 9, letterSpacing: 4, textTransform: 'uppercase', marginBottom: 12, opacity: 0.8 }}>
                  CREATE NEW GROUP
                </p>
                <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                  <input
                    type="text"
                    value={groupName}
                    onChange={e => setGroupName(e.target.value)}
                    placeholder="Group Name..."
                    style={{ flex: 1, background: 'var(--input-bg)', border: '1px solid var(--input-border)', color: 'white', padding: '8px 12px', outline: 'none' }}
                  />
                  <button onClick={handleCreateGroup} style={{ background: 'var(--accent-gold)', color: 'black', padding: '8px 16px', fontWeight: 'bold' }}>LAUNCH GROUP</button>
                </div>
                <p style={{ color: 'var(--text-dim)', fontSize: 12 }}>Members: {groupMembers.join(', ')}</p>
                
                <p style={{ fontFamily: 'Orbitron, sans-serif', color: 'var(--accent-gold)', fontSize: 9, letterSpacing: 4, textTransform: 'uppercase', marginTop: 24, marginBottom: 12, opacity: 0.8 }}>
                  YOUR GROUPS
                </p>
                {groups.map(g => (
                  <div key={g.id} style={{ padding: '12px 0', borderBottom: '1px solid rgba(180,140,80,0.1)', display: 'flex', justifyContent: 'space-between' }}>
                    <div>
                      <h4 style={{ color: 'white', margin: 0 }}>{g.name}</h4>
                      <p style={{ color: 'gray', fontSize: 12, margin: 0 }}>{g.members?.length || 0} members</p>
                    </div>
                    <button style={{ border: '1px solid var(--accent-gold)', color: 'var(--accent-gold)', background: 'transparent', padding: '4px 12px', fontSize: 10 }}>OPEN CHAT</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Toast */}
          <AnimatePresence>
            {toast && (
              <motion.div
                initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                style={{
                  position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)',
                  padding: '8px 20px', borderRadius: 2, whiteSpace: 'nowrap',
                  background: 'rgba(18,14,10,0.97)', border: '1px solid var(--accent-gold)',
                  color: 'var(--accent-gold)', fontFamily: 'Orbitron, sans-serif',
                  fontSize: 9, letterSpacing: 3, textTransform: 'uppercase',
                }}
              >
                {toast}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
      {pickerFriendId && (
        <PlanetPickerModal
          title="Reassign Planet"
          onClose={() => setPickerFriendId(null)}
          onSelect={async (planetName) => {
            try {
              await api.patch('/api/friends/assign-planet', { friendId: pickerFriendId, planetName });
              showToast(`Reassigned to ${planetName}`);
              setPickerFriendId(null);
              fetchFriends();
            } catch (e: any) { showToast(e.message); }
          }}
        />
      )}
    </AnimatePresence>
  );
}
