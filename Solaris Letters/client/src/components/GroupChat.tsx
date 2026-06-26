import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '../store/useAppStore';
import { api } from '../lib/api';
import DOMPurify from 'dompurify';

interface GroupMessage {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
  sender: {
    display_name: string;
    cosmic_id: string;
  };
}

export default function GroupChat() {
  const { isGroupChatOpen, setGroupChatOpen, selectedGroupId, setSelectedGroupId, groups, fetchGroups, user } = useAppStore();
  const group = groups.find(g => g.id === selectedGroupId);

  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchMessages = useCallback(async () => {
    if (!selectedGroupId) return;
    try {
      const res = await api.get<{ messages: GroupMessage[] }>(`/api/groups/${selectedGroupId}/messages`);
      setMessages(res.messages || []);
    } catch (err) {
      console.error('Failed to fetch group messages', err);
    }
  }, [selectedGroupId]);

  useEffect(() => {
    if (!isGroupChatOpen || !selectedGroupId) return;

    Promise.resolve().then(() => fetchMessages());

    // Poll every 3 seconds for new messages
    const interval = setInterval(fetchMessages, 3000);
    return () => clearInterval(interval);
  }, [isGroupChatOpen, selectedGroupId, fetchMessages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !selectedGroupId || isSending) return;

    setIsSending(true);
    try {
      await api.post(`/api/groups/${selectedGroupId}/message`, { content: inputText.trim() });
      setInputText('');
      await fetchMessages();
    } catch (err) {
      console.error('Failed to send message', err);
    } finally {
      setIsSending(false);
    }
  };

  // Add member states for group creator
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const isCreator = group ? (group.created_by === user?.id || group.created_by === user?.userId || group.role === 'owner') : false;

  useEffect(() => {
    if (!group || searchQuery.trim().length < 2) {
      return;
    }
    const delayDebounce = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await api.get<{ users: any[] }>(`/api/users/search?q=${encodeURIComponent(searchQuery)}`);
        const existingMembers = group.members || [];
        const filtered = (res.users || []).filter(
          u => u.id !== user?.id && !existingMembers.some((em: any) => em.cosmic_id === u.cosmic_id)
        );
        setSearchResults(filtered);
      } catch (err) {
        console.error('Failed to search users', err);
      } finally {
        setIsSearching(false);
      }
    }, 300);
    return () => clearTimeout(delayDebounce);
  }, [searchQuery, group?.members, user?.id]);

  const handleAddMember = async (targetUserId: string) => {
    if (!selectedGroupId) return;
    try {
      await api.post(`/api/groups/${selectedGroupId}/members`, { memberIds: [targetUserId] });
      setSearchQuery('');
      setSearchResults([]);
      setIsAddOpen(false);
      await fetchGroups(); // refresh group members in global store
    } catch (err: any) {
      console.error('Failed to add member', err);
      alert(err.message || 'Failed to add member');
    }
  };

  if (!isGroupChatOpen || !group) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.9, x: 20 }}
        animate={{ opacity: 1, scale: 1, x: 0 }}
        exit={{ opacity: 0, scale: 0.9, x: 20 }}
        className="group-chat-panel fixed top-24 right-8 w-96 bg-black/80 border border-white/10 backdrop-blur-2xl rounded-3xl overflow-hidden shadow-2xl z-50 flex flex-col h-[calc(100vh-128px)] max-h-[600px]"
      >
        <div className="p-6 border-b border-white/5 bg-white/5 flex flex-col gap-3">
          <div className="flex items-start justify-between gap-4">
            <h3 className="text-white font-bold text-lg leading-tight break-words pr-2">{group.name}</h3>
            <button 
              onClick={() => setGroupChatOpen(false)}
              className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-white/40 hover:bg-white/10 hover:text-white transition-all cursor-pointer shrink-0"
            >
              ✕
            </button>
          </div>
          <div className="flex items-center gap-3">
            <span className="px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[8px] font-bold uppercase tracking-wider">
              {(group.members || []).length} MEMBERS
            </span>
            {isCreator && (
              <button
                onClick={() => setIsAddOpen(!isAddOpen)}
                className={`px-2 py-1 rounded border text-[8px] font-bold uppercase tracking-normal transition-all cursor-pointer ${
                  isAddOpen
                    ? 'bg-amber-500/20 border-amber-500/50 text-white'
                    : 'bg-amber-950/40 border-amber-500/30 text-amber-400 hover:bg-amber-950/70 hover:border-amber-500/50'
                }`}
              >
                {isAddOpen ? 'Cancel' : '+ Add Member'}
              </button>
            )}
            <button
              onClick={async () => {
                if (window.confirm(`Are you sure you want to leave "${group.name}"?`)) {
                  try {
                    await api.post(`/api/groups/${group.id}/leave`, {});
                    setGroupChatOpen(false);
                    setSelectedGroupId(null);
                    await fetchGroups();
                  } catch (err) {
                    const errMsg = err instanceof Error ? err.message : 'Failed to leave group';
                    alert(errMsg);
                  }
                }
              }}
              className="px-2 py-1 rounded bg-red-950/40 border border-red-500/30 text-red-400 text-[8px] font-bold uppercase tracking-normal hover:bg-red-950/70 hover:border-red-500/50 transition-all cursor-pointer"
            >
              Leave Cluster
            </button>
          </div>
        </div>

        {/* Add Member Dropdown Panel */}
        {isAddOpen && (
          <div className="px-6 py-4 border-b border-white/5 bg-white/5 flex flex-col gap-2 relative z-30">
            <input
              type="text"
              value={searchQuery}
              onChange={e => {
                const val = e.target.value;
                setSearchQuery(val);
                if (val.trim().length < 2) {
                  setSearchResults([]);
                  setIsSearching(false);
                }
              }}
              placeholder="Search cosmic ID or display name..."
              className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white placeholder:text-white/20 focus:outline-none focus:border-amber-500/50 transition-all"
              autoFocus
            />
            {isSearching && <div className="text-[10px] text-amber-400/60 italic">Scanning cosmic waves...</div>}
            {searchResults.length > 0 && (
              <div className="max-h-36 overflow-y-auto border border-white/10 rounded-lg bg-black/95 p-1 flex flex-col gap-0.5 absolute z-50 top-[72px] left-6 right-6 shadow-2xl">
                {searchResults.map(u => (
                  <button
                    key={u.id}
                    onClick={() => handleAddMember(u.id)}
                    className="w-full text-left px-3 py-1.5 text-[11px] text-white/80 hover:bg-white/10 hover:text-white rounded transition-all flex items-center justify-between cursor-pointer"
                  >
                    <span className="truncate mr-2">{u.display_name} ({u.cosmic_id})</span>
                    <span className="text-[8px] text-amber-400/80 font-bold uppercase tracking-wider shrink-0">+ ADD</span>
                  </button>
                ))}
              </div>
            )}
            {searchQuery.trim().length >= 2 && searchResults.length === 0 && !isSearching && (
              <div className="text-[10px] text-white/40 italic text-center">No travelers found</div>
            )}
          </div>
        )}

        {/* Messages Container */}
        <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-black/20 parchment-scroll">
          <div className="text-center py-4">
            <p className="text-white/20 text-[10px] font-medium max-w-[220px] mx-auto italic leading-tight">
              Synchronizing subspace frequencies... Connection established.
            </p>
          </div>
          
          <div className="flex flex-col items-start gap-0.5">
            <span className="text-[8px] text-amber-500/80 font-bold uppercase tracking-widest ml-1">System</span>
            <div className="bg-white/5 border border-white/10 rounded-xl rounded-tl-none p-2.5 max-w-[85%]">
              <p className="text-white/70 text-[11px] leading-relaxed">
                Welcome to the {group.name} cluster. Secure transmission line is active.
              </p>
            </div>
          </div>

          {/* Real messages list */}
          {messages.map((msg) => {
            const isSelf = msg.sender_id === user?.id;
            return (
              <div 
                key={msg.id} 
                className={`flex flex-col ${isSelf ? 'items-end' : 'items-start'} gap-0.5`}
              >
                <span className="text-[8px] text-white/40 font-bold uppercase tracking-widest px-1">
                  {isSelf ? 'You' : msg.sender?.display_name || msg.sender?.cosmic_id}
                </span>
                <div 
                  className={`p-2.5 max-w-[85%] rounded-xl ${
                    isSelf 
                      ? 'bg-amber-500/10 border border-amber-500/30 rounded-tr-none' 
                      : 'bg-white/5 border border-white/10 rounded-tl-none'
                  }`}
                >
                  <p className="text-white/90 text-[11px] leading-relaxed break-words whitespace-pre-wrap">
                    {DOMPurify.sanitize(msg.content)}
                  </p>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Form */}
        <form onSubmit={handleSendMessage} className="p-4 border-t border-white/5 bg-black/40">
          <div className="relative flex items-center">
            <input 
              type="text" 
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              placeholder="Broadcast a message..."
              className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-4 pr-16 text-white placeholder:text-white/20 focus:outline-none focus:border-amber-500/50 transition-all text-xs"
              maxLength={2000}
              disabled={isSending}
            />
            <button 
              type="submit"
              disabled={isSending || !inputText.trim()}
              className="absolute right-2 px-3 py-1 rounded bg-amber-500/20 border border-amber-500/30 text-amber-400 hover:bg-amber-500/40 hover:text-white transition-all text-[9px] font-black tracking-widest cursor-pointer disabled:opacity-40 disabled:pointer-events-none"
            >
              SEND
            </button>
          </div>
          <p className="text-[7px] text-white/20 text-center mt-2 uppercase tracking-widest font-bold">
            Encryption: 2048-bit RSA · Signal: Nominal
          </p>
        </form>
      </motion.div>
    </AnimatePresence>
  );
}
