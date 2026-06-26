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
  onOpenGroups,
}: {
  isOpen: boolean;
  onClose: () => void;
  onCompose?: () => void;
  onOpenGroups?: () => void;
}) {
  const { user, assignments, fetchFriends, setComposerRecipient, fetchGroups } = useAppStore();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchUser[]>([]);
  const [isSearching, setSearching] = useState(false);
  const [addedStatus, setAddedStatus] = useState<Record<string, string>>({});
  const [toast, setToast] = useState('');
  const [pickerFriendId, setPickerFriendId] = useState<string | null>(null);
  const [tab, setTab] = useState<'search' | 'groups'>('search');
  const [groupName, setGroupName] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<SearchUser[]>([]);
  const [memberSearchQuery, setMemberSearchQuery] = useState('');
  const [memberSearchResults, setMemberSearchResults] = useState<SearchUser[]>([]);
  const [isMemberSearching, setIsMemberSearching] = useState(false);

  useEffect(() => {
    if (!memberSearchQuery.trim()) {
      return;
    }
    const t = setTimeout(async () => {
      setIsMemberSearching(true);
      try {
        const res = await api.get<{ users: SearchUser[] }>(`/api/users/search?q=${encodeURIComponent(memberSearchQuery)}`);
        const filtered = (res.users || []).filter(u => u.id !== user?.id && !selectedMembers.some(sm => sm.id === u.id));
        setMemberSearchResults(filtered);
      } catch (err) {
        console.error(err);
      } finally {
        setIsMemberSearching(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [memberSearchQuery, selectedMembers, user?.id]);

  const [history, setHistory] = useState<string[]>(() => {
    const stored = localStorage.getItem('solaris_search_history');
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return [];
      }
    }
    return [];
  });

  const saveToHistory = (q: string) => {
    const cleanQ = q.trim();
    if (cleanQ.length >= 2) {
      setHistory(prev => {
        const next = [cleanQ, ...prev.filter(item => item !== cleanQ)].slice(0, 5);
        localStorage.setItem('solaris_search_history', JSON.stringify(next));
        return next;
      });
    }
  };

  const clearHistory = () => {
    localStorage.removeItem('solaris_search_history');
    setHistory([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      saveToHistory(query);
    }
  };

  const handleBlur = () => {
    saveToHistory(query);
  };

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  useEffect(() => {
    if (tab === 'groups') {
      fetchGroups();
    }
  }, [tab, fetchGroups]);

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
    if (!groupName.trim()) return;
    try {
      await api.post('/api/groups', { name: groupName, memberIds: selectedMembers.map(m => m.id) });
      showToast('Group launched!');
      setGroupName('');
      setSelectedMembers([]);
      await fetchGroups();
    } catch (err: any) {
      showToast(err.message || 'Failed to launch group');
    }
  };

  const isFriend = (userId: string) =>
    assignments.some((a: { friend?: { id?: string; cosmic_id?: string } }) => a.friend?.id === userId || a.friend?.cosmic_id === userId);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="modal-overlay-container">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="scanner-overlay"
          />

          {/* Modal */}
          <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96 }}
          className="cosmic-card subspace-scanner-modal scanner-modal-container"
        >
          {/* Top rule */}
          <div className="scanner-top-rule" />

            {/* Header */}
            <div className="scanner-header">
              <div className="scanner-header-row">
                <div>
                  <h2 className="scanner-title">SUBSPACE SCANNER</h2>
                  <div className="scanner-tabs-row">
                    <button
                      onClick={() => setTab('search')}
                      className={`scanner-tab-btn ${tab === 'search' ? 'scanner-tab-btn--active' : 'scanner-tab-btn--inactive'}`}
                    >
                      SEARCH & PLANETS
                    </button>
                    <button
                      onClick={() => setTab('groups')}
                      className={`scanner-tab-btn ${tab === 'groups' ? 'scanner-tab-btn--active' : 'scanner-tab-btn--inactive'}`}
                    >
                      GROUPS
                    </button>
                  </div>
                </div>
                <button
                  title="Close"
                  onClick={onClose}
                  className="scanner-close-btn"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
                </button>
              </div>

              {tab === 'search' && (
                <div className="scanner-search-wrapper">
                  <span className="scanner-search-icon">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                  </span>
                  <input
                    type="text"
                    autoFocus
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Search by @cosmic_id or display name..."
                    className="scanner-search-input"
                    onBlur={handleBlur}
                  />
                </div>
              )}
            </div>

            {/* Body */}
            <div className="parchment-scroll scanner-body-scroll">
            {tab === 'search' ? (
              <>
                {/* Search History */}
                {history.length > 0 && (
                  <div className="scanner-section-container">
                    <p className="scanner-section-title">
                      SEARCH HISTORY
                    </p>
                    <div className="scanner-history-list">
                      {history.map((item, idx) => (
                        <div
                          key={idx}
                          onClick={() => setQuery(item)}
                          className="scanner-history-item"
                        >
                          {item}
                        </div>
                      ))}
                    </div>
                    <div className="scanner-history-clear-row">
                      <button
                        onClick={clearHistory}
                        className="scanner-history-clear-btn"
                      >
                        Clear history
                      </button>
                    </div>
                  </div>
                )}

                {/* My Planets */}
                {assignments.length > 0 && (
              <div className="scanner-section-container">
                <p className="scanner-section-title">
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
                      className="scanner-friend-item"
                    >
                      <div className="scanner-friend-left">
                        <div
                          className="scanner-avatar-wrapper"
                          style={{
                            background: `conic-gradient(from 0deg, hsl(${hue},35%,22%), hsl(${hue+60},30%,28%))`
                          }}
                        >
                          {name[0]?.toUpperCase()}
                        </div>
                        <div className="scanner-friend-details">
                          <div className="scanner-friend-info-flex">
                            <span className="scanner-friend-name">{name}</span>
                            <span className="scanner-friend-planet">{a.planetName}</span>
                          </div>
                          <p className="scanner-friend-cosmic-id">@{uname}</p>
                        </div>
                      </div>
                      <div className="scanner-friend-actions">
                        {onCompose && (
                          <button
                            onClick={() => {
                              setComposerRecipient({ id: f.id || '', displayName: name, username: uname, planetName: a.planetName });
                              onClose(); onCompose();
                            }}
                            className="scanner-btn-send"
                          >
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                            SEND
                          </button>
                        )}
                        <button
                          onClick={() => setPickerFriendId(f.id || null)}
                          className="scanner-btn-reassign"
                        >
                          REASSIGN
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Search Results */}
            {query.trim().length >= 2 && (
              <div className="scanner-section-container--results">
                <p className="scanner-section-title">
                  SEARCH RESULTS
                </p>
                {isSearching ? (
                  <p className="scanner-status-text--pulse">
                    Scanning subspace...
                  </p>
                ) : results.length === 0 ? (
                  <p className="scanner-status-text--exo">
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
                        className="scanner-friend-item"
                      >
                        <div className="scanner-friend-left">
                          <div
                            className="scanner-avatar-wrapper--large"
                            style={{
                              background: `conic-gradient(from 0deg, hsl(${hue},35%,22%), hsl(${hue+60},30%,28%))`
                            }}
                          >
                            {r.display_name?.[0]?.toUpperCase()}
                          </div>
                          <div className="scanner-friend-details">
                            <p className="scanner-friend-name">{r.display_name}</p>
                            <p className="scanner-friend-cosmic-id--mono">@{r.cosmic_id}</p>
                          </div>
                        </div>
                        <div className="scanner-friend-actions">
                          {alreadyFriend ? (
                            <button disabled className="scanner-btn-linked">
                              LINKED
                            </button>
                          ) : status === 'requested' || status === 'added' ? (
                            <button disabled className="scanner-btn-requested">
                              REQUEST SENT
                            </button>
                          ) : status === 'error' ? (
                            <button disabled className="scanner-btn-error">
                              ERROR
                            </button>
                          ) : (
                            <button
                              onClick={() => sendRequest(r.cosmic_id)}
                              className="scanner-btn-request"
                            >
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                              REQUEST
                            </button>
                          )}
                        </div>
                      </motion.div>
                    );
                  })
                )}
              </div>
            )}

            {/* Empty state */}
            {assignments.length === 0 && query.trim().length < 2 && (
              <div className="scanner-empty-wrapper">
                <p className="scanner-empty-text">
                  Search to discover travelers in the cosmos
                </p>
              </div>
            )}
              </>
            ) : (
              <div className="scanner-groups-container">
                <p className="scanner-section-title">
                  CREATE NEW GROUP
                </p>
                <div className="groups-form-row">
                  <input
                    type="text"
                    value={groupName}
                    onChange={e => setGroupName(e.target.value)}
                    placeholder="Group Name..."
                    className="groups-input"
                  />
                  <button onClick={handleCreateGroup} className="groups-submit-btn">LAUNCH</button>
                </div>

                <div className="scanner-search-wrapper" style={{ marginBottom: 12 }}>
                  <p className="scanner-members-label">
                    Select Members:
                  </p>
                  <input
                    type="text"
                    value={memberSearchQuery}
                    onChange={e => {
                      const val = e.target.value;
                      setMemberSearchQuery(val);
                      if (!val.trim()) {
                        setMemberSearchResults([]);
                      }
                    }}
                    placeholder="Type username / cosmic ID to add..."
                    className="groups-search-input"
                  />

                  {memberSearchResults.length > 0 && (
                    <div className="scanner-groups-dropdown parchment-scroll">
                      {memberSearchResults.map(u => (
                        <div
                          key={u.id}
                          onClick={() => {
                            if (!selectedMembers.some(m => m.id === u.id)) {
                              setSelectedMembers(prev => [...prev, u]);
                            }
                            setMemberSearchQuery('');
                            setMemberSearchResults([]);
                          }}
                          className="scanner-groups-result-item"
                        >
                          <span>{u.display_name} <span className="scanner-groups-result-meta">@{u.cosmic_id}</span></span>
                          <span className="scanner-groups-add-text">+ ADD</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {isMemberSearching && (
                    <p className="scanner-friend-cosmic-id">Searching traveler network...</p>
                  )}
                </div>

                {selectedMembers.length > 0 && (
                  <div style={{ marginBottom: 16 }}>
                    <p className="scanner-members-label">
                      Group Members:
                    </p>
                    <div className="scanner-member-pills-flex">
                      {selectedMembers.map(m => (
                        <span
                          key={m.id}
                          className="scanner-member-pill"
                        >
                          <span>{m.display_name} <span className="scanner-groups-result-meta">@{m.cosmic_id}</span></span>
                          <button
                            onClick={() => setSelectedMembers(prev => prev.filter(sm => sm.id !== m.id))}
                            className="scanner-member-remove-btn"
                          >
                            ✕
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                
                <button 
                  onClick={onOpenGroups} 
                  className="scanner-groups-nav-btn"
                >
                  YOUR GROUPS
                </button>
              </div>
            )}
          </div>

          {/* Toast */}
          <AnimatePresence>
            {toast && (
              <motion.div
                initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="scanner-toast"
              >
                {toast}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
      )}
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
            } catch (err: unknown) {
              const msg = err instanceof Error ? err.message : String(err);
              showToast(msg);
            }
          }}
        />
      )}
    </AnimatePresence>
  );
}
