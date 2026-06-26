import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '../store/useAppStore';
import { api } from '../lib/api';

interface SearchUser {
  id: string;
  display_name: string;
  cosmic_id: string;
}

export default function GroupsModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const { user, groups, fetchGroups, setSelectedGroupId, setGroupChatOpen } = useAppStore();
  const [groupName, setGroupName] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<SearchUser[]>([]);
  const [memberSearchQuery, setMemberSearchQuery] = useState('');
  const [memberSearchResults, setMemberSearchResults] = useState<SearchUser[]>([]);
  const [isMemberSearching, setIsMemberSearching] = useState(false);
  const [toast, setToast] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchGroups();
    }
  }, [isOpen, fetchGroups]);

  // Debounced search for group member autocomplete
  useEffect(() => {
    if (memberSearchQuery.trim().length < 2) {
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

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      setError('Group name is required');
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      // If user typed a member but forgot to click "+ ADD", auto-add the top matching search result
      const currentMembers = [...selectedMembers];
      if (memberSearchQuery.trim() && memberSearchResults.length > 0) {
        const topUser = memberSearchResults[0];
        if (topUser && !currentMembers.some(m => m.id === topUser.id)) {
          currentMembers.push(topUser);
        }
      }

      await api.post('/api/groups', { name: groupName, memberIds: currentMembers.map(m => m.id) });
      showToast('Group launched!');
      setGroupName('');
      setSelectedMembers([]);
      setMemberSearchQuery('');
      setMemberSearchResults([]);
      await fetchGroups();
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to launch group';
      setError(errorMsg);
      setIsLoading(false);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="groups-overlay">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="groups-backdrop"
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96 }}
          className="cosmic-card subspace-scanner-modal groups-modal"
        >
          {/* Top rule */}
          <div className="groups-top-rule" />

          {/* Header */}
          <div className="groups-header">
            <div className="groups-header-row">
              <div>
                <h2 className="groups-title">STELLAR GROUPS</h2>
                <p className="groups-subtitle">
                  Manage and synchronize multi-node communications
                </p>
              </div>
              <button
                title="Close"
                onClick={onClose}
                className="groups-close-btn"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="groups-content parchment-scroll">
             {/* Create New Group section */}
            <div className="groups-section-container">
              <p className="groups-section-title">
                LAUNCH NEW SECTOR GROUP
              </p>
              <div className="groups-form-row">
                <input
                  type="text"
                  value={groupName}
                  onChange={e => setGroupName(e.target.value)}
                  placeholder="Group Name..."
                  className="groups-input"
                />
                <button
                  onClick={handleCreateGroup}
                  disabled={isLoading}
                  className="groups-submit-btn"
                >
                  {isLoading ? 'Launching...' : 'Launch'}
                </button>
              </div>

              {error && (
                <p className="groups-error">
                  {error}
                </p>
              )}

              {/* Autocomplete Member Search */}
              <div className="groups-search-container">
                <p className="groups-search-label">
                  Select Members:
                </p>
                <input
                  type="text"
                  value={memberSearchQuery}
                  onChange={e => {
                    const val = e.target.value;
                    setMemberSearchQuery(val);
                    if (val.trim().length < 2) {
                      setMemberSearchResults([]);
                      setIsMemberSearching(false);
                    }
                  }}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      if (memberSearchResults.length > 0) {
                        const topUser = memberSearchResults[0];
                        if (topUser && !selectedMembers.some(m => m.id === topUser.id)) {
                          setSelectedMembers(prev => [...prev, topUser]);
                        }
                        setMemberSearchQuery('');
                        setMemberSearchResults([]);
                      }
                    }
                  }}
                  placeholder="Type username / cosmic ID to add..."
                  className="groups-search-input"
                />

                {memberSearchResults.length > 0 && (
                  <div className="groups-search-dropdown parchment-scroll">
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
                        className="groups-search-result"
                      >
                        <span>{u.display_name} <span className="groups-search-secondary-text">@{u.cosmic_id}</span></span>
                        <span className="groups-search-action-text">+ ADD</span>
                      </div>
                    ))}
                  </div>
                )}
                {isMemberSearching && (
                  <p className="groups-search-status">Searching traveler network...</p>
                )}
              </div>

              {/* Selected Group Members Pills */}
              {selectedMembers.length > 0 && (
                <div className="groups-members-pills-container">
                  <p className="groups-search-label">
                    Group Members:
                  </p>
                  <div className="groups-pills-flex">
                    {selectedMembers.map(m => (
                      <span
                        key={m.id}
                        className="groups-member-pill"
                      >
                        <span>{m.display_name} <span className="groups-search-secondary-text">@{m.cosmic_id}</span></span>
                        <button
                          onClick={() => setSelectedMembers(prev => prev.filter(sm => sm.id !== m.id))}
                          className="groups-pill-remove-btn"
                        >
                          ✕
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Your Groups section */}
            <div>
              <p className="groups-section-title">
                ACTIVE GROUPS
              </p>
              {groups.length === 0 ? (
                <p className="groups-empty-text">No cosmic groups joined yet.</p>
              ) : (
                <div className="groups-list">
                  {groups.map(g => (
                    <div key={g.id} className="groups-item">
                      <div>
                        <h4 className="groups-item-title">{g.name}</h4>
                        <p className="groups-item-subtitle">
                          {(g.members || []).length} members
                        </p>
                      </div>
                      <div className="groups-item-actions">
                        {(g.created_by === user?.id || g.created_by === user?.userId || g.role === 'owner') && (
                          <button
                            onClick={async () => {
                              if (window.confirm(`Are you sure you want to delete "${g.name}"?`)) {
                                try {
                                  await api.delete(`/api/groups/${g.id}`);
                                  showToast('Group deleted!');
                                  await fetchGroups();
                                } catch (err: unknown) {
                                  const errorMsg = err instanceof Error ? err.message : 'Failed to delete group';
                                  showToast(errorMsg);
                                }
                              }
                            }}
                            className="groups-delete-btn"
                          >
                            DELETE
                          </button>
                        )}
                          <button
                            onClick={() => {
                              setSelectedGroupId(g.id);
                              setGroupChatOpen(true);
                              onClose();
                            }}
                            className="groups-open-btn"
                          >
                            OPEN CHAT
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Toast */}
            <AnimatePresence>
              {toast && (
                <motion.div
                  initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="groups-toast"
                >
                  {toast}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </AnimatePresence>
    );
}
