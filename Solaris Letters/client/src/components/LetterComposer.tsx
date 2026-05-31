/* eslint-disable */
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '../store/useAppStore';
import { api } from '../lib/api';
import { STICKERS, PAPER_STYLES } from '../lib/letterStyles';

export default function LetterComposer({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { addTransmission, setComposerOpen, composerRecipient } = useAppStore();
  const [content, setContent] = useState('');
  const [deliverAt, setDeliverAt] = useState('');
  const [placedStickers, setPlacedStickers] = useState<{ id: string, iconId: string, x: number, y: number, rot: number, dragReset?: number }[]>([]);
  const [paperSkin, setPaperSkin] = useState('parchment');
  const [sciFiMode, setSciFiMode] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState('');

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedRecipient, setSelectedRecipient] = useState<any | null>(null);
  const [isScheduled, setIsScheduled] = useState(false);

  const finalRecipient = composerRecipient || selectedRecipient;

  // Sync / reset states on mount / modal open state changes
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
      setSearchResults([]);
      setSelectedRecipient(null);
      setIsScheduled(false);
      setDeliverAt('');
    }
  }, [isOpen]);

  useEffect(() => {
    if (finalRecipient?.id === 'sun') {
      setIsScheduled(true);
    } else {
      setIsScheduled(false);
      setDeliverAt('');
    }
  }, [finalRecipient]);

  const handleSearchChange = async (val: string) => {
    setSearchQuery(val);
    if (val.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    try {
      const res = await api.get<{ users: any[] }>(`/api/users/search?q=${encodeURIComponent(val)}`);
      setSearchResults(res.users || []);
    } catch {
      setSearchResults([]);
    }
  };

  const handleTextareaClick = (e: React.MouseEvent<HTMLTextAreaElement>) => {
    const textarea = e.currentTarget;
    const rect = textarea.getBoundingClientRect();
    const clickY = e.clientY - rect.top;
    const padding = 32; // 2rem = 32px (p-8)
    const lineHeight = 32;
    
    let lineClicked = Math.floor((clickY - padding) / lineHeight);
    if (lineClicked < 0) lineClicked = 0;
    
    const lines = content.split('\n');

    // Pad newlines if clicked below
    if (lineClicked >= lines.length) {
      const newlinesToAdd = lineClicked - lines.length + 1;
      for (let i = 0; i < newlinesToAdd; i++) {
        lines.push('');
      }
      const newContent = lines.join('\n');
      setContent(newContent);
      
      // Calculate new cursor position at the start of the target line
      let cursorIndex = 0;
      for (let i = 0; i < lineClicked; i++) {
        cursorIndex += lines[i].length + 1; // +1 for '\n'
      }

      setTimeout(() => {
        textarea.setSelectionRange(cursorIndex, cursorIndex);
        textarea.focus();
      }, 0);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalRecipient = composerRecipient || selectedRecipient;
    if (!content.trim() || !finalRecipient) return;
    setIsSending(true);
    setError('');

    if (isScheduled && !deliverAt) {
      setError(finalRecipient.id === 'sun'
        ? 'Please select a delivery date and time for your future self.'
        : 'Please select a delivery date and time for your scheduled transmission.'
      );
      setIsSending(false);
      return;
    }

    try {
      await api.post<unknown>('/api/letters', {
        recipient_id: finalRecipient.id === 'sun' ? undefined : finalRecipient.id,
        body: content.trim(),
        is_future_self: finalRecipient.id === 'sun',
        deliver_at: isScheduled && deliverAt ? new Date(deliverAt).toISOString() : undefined,
        stickers: placedStickers,
        paper_skin: paperSkin
      });
      
      // Success — trigger spacecraft animation
      setComposerOpen(false);
      addTransmission(finalRecipient.planetName || 'Sun', { receiverUserId: finalRecipient.id, content, isFutureSelf: finalRecipient.id === 'sun' });
      setContent('');
      setDeliverAt('');
      setPlacedStickers([]);
      setPaperSkin('parchment');
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      if (errorMsg.toLowerCase().includes('token')) {
        setError('Your session has expired. Please refresh the page to log in again.');
      } else {
        setError(errorMsg || 'Failed to send letter');
      }
    } finally {
      setIsSending(false);
    }
  };

  const handleInsertSticker = (iconId: string) => {
    setPlacedStickers(prev => [
      ...prev,
      {
        id: Math.random().toString(),
        iconId,
        x: 10 + (prev.length * 5) % 80, // Sequential placement to avoid messy overlap
        y: 15,
        rot: (Math.random() - 0.5) * 45
      }
    ]);
  };

  const sciFiColors = (() => {
    switch (paperSkin) {
      case 'parchment': return { hex: '#ffd700', bg: 'rgba(25, 20, 5, 0.9)', rgb: '255,215,0' };
      case 'blueprint': return { hex: '#4A9EFF', bg: 'rgba(5, 15, 30, 0.9)', rgb: '74,158,255' };
      case 'grid': return { hex: '#00ffcc', bg: 'rgba(4, 8, 16, 0.9)', rgb: '0,255,204' };
      case 'starry': return { hex: '#b8a6ff', bg: 'rgba(12, 8, 24, 0.9)', rgb: '184,166,255' };
      case 'obsidian': return { hex: '#8a5aff', bg: 'rgba(10, 5, 20, 0.9)', rgb: '138,90,255' };
      default: return { hex: '#00ffcc', bg: 'rgba(4, 8, 16, 0.9)', rgb: '0,255,204' };
    }
  })();

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Special+Elite&display=swap');
          .sticker-scrollbar::-webkit-scrollbar { height: 4px; }
          .sticker-scrollbar::-webkit-scrollbar-track { background: rgba(255, 255, 255, 0.02); }
          .sticker-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.1); border-radius: 4px; }
        `}</style>
        
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 z-[100]"
          style={{ background: 'rgba(0,0,10,0.95)', backdropFilter: 'blur(20px)' }}
          onClick={() => {
            onClose();
            setContent('');
            setError('');
            setPlacedStickers([]);
          }}
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative z-[101] w-full"
          style={{ 
            maxWidth: '620px',
            background: 'linear-gradient(145deg, rgba(12, 8, 24, 0.98), rgba(6, 4, 12, 0.95))',
            border: '1px solid rgba(138, 90, 255, 0.2)',
            borderRadius: '16px',
            padding: '40px',
            boxShadow: '0 0 50px rgba(80, 40, 200, 0.15), inset 0 1px 0 rgba(255,255,255,0.05)',
            backdropFilter: 'blur(24px)'
          }}
        >
          {/* Header */}
          <div className="mb-4 flex justify-between items-start">
            <div>
              <p className="text-[#b8a6ff]/60 text-xs font-mono mb-2 uppercase tracking-widest">
                TRANSMITTING FROM SECTOR {finalRecipient?.planetName?.[0] || 'X'}1
              </p>
              <h2 className="text-3xl font-orbitron font-bold text-[#b8a6ff]">
                {finalRecipient ? `TO: ${finalRecipient.displayName.toUpperCase()}` : 'COSMIC TRANSMISSION'}
              </h2>
              {finalRecipient && (
                <p className="text-[#b8a6ff]/60 text-sm font-mono mt-1">
                  @{finalRecipient.username} / {finalRecipient.planetName}
                </p>
              )}
            </div>
            
            <div className="flex flex-col items-end gap-3">
              <button 
                onClick={() => {
                  onClose();
                  setContent('');
                  setError('');
                  setPlacedStickers([]);
                }}
                className="text-[#b8a6ff]/60 hover:text-white transition-colors"
              >
                ✕
              </button>

              <button 
                type="button"
                onClick={() => setSciFiMode(!sciFiMode)}
                className={`px-3 py-1.5 rounded border text-xs font-bold uppercase tracking-wider font-orbitron transition-all whitespace-nowrap ${sciFiMode ? 'bg-[#00ffcc]/20 border-[#00ffcc] text-[#00ffcc] shadow-[0_0_15px_rgba(0,255,204,0.4)]' : 'bg-transparent border-white/20 text-white/50 hover:text-white/80'}`}
              >
                {sciFiMode ? '⚡ SCI-FI: ON' : '⚡ SCI-FI: OFF'}
              </button>
            </div>
          </div>

          <form onSubmit={handleSend}>
            {/* If composerRecipient is null (i.e. fresh compose), show recipient search field */}
            {!composerRecipient && (
              <div className="mb-6 relative z-[200]">
                {!selectedRecipient ? (
                  <>
                    <label className="block text-xs font-mono text-[#b8a6ff]/70 mb-2 uppercase tracking-widest">
                      SEARCH RECIPIENT BY USER ID OR DISPLAY NAME
                    </label>
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => handleSearchChange(e.target.value)}
                      placeholder="Type username, display name, or @userid..."
                      autoComplete="off"
                      name="recipient-search"
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white placeholder:text-slate-500 focus:outline-none focus:border-[#8a5aff] transition-all font-mono"
                    />
                    {searchResults.length > 0 && (
                      <div className="absolute left-0 right-0 mt-1 bg-[#0c0618] border border-[#8a5aff]/40 rounded-xl overflow-hidden z-[200] shadow-[0_8px_32px_rgba(0,0,0,0.8)] max-h-48 overflow-y-auto">
                        {searchResults.map((u) => (
                          <div
                            key={u.id}
                            onClick={() => {
                              setSelectedRecipient({
                                id: u.id,
                                displayName: u.display_name,
                                username: u.cosmic_id,
                                planetName: u.planet_type || 'Unknown Sector'
                              });
                              setSearchResults([]);
                            }}
                            className="px-4 py-3 hover:bg-[#8a5aff]/20 cursor-pointer flex justify-between items-center border-b border-white/5 transition-colors"
                          >
                            <div>
                              <span className="text-white font-orbitron font-semibold text-sm">{u.display_name}</span>
                              <span className="text-[#b8a6ff]/60 text-xs font-mono ml-2">@{u.cosmic_id}</span>
                            </div>
                            {u.planet_type && (
                              <span className="text-[#00ffcc] text-[9px] font-mono tracking-widest uppercase bg-[#00ffcc]/10 px-2 py-0.5 rounded border border-[#00ffcc]/20">
                                {u.planet_type}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex items-center justify-between bg-[#8a5aff]/10 border border-[#8a5aff]/20 rounded-xl px-4 py-3">
                    <div>
                      <p className="text-[10px] font-mono text-[#b8a6ff]/60 uppercase tracking-widest">SELECTED RECIPIENT</p>
                      <h4 className="text-white font-orbitron font-bold text-sm mt-0.5">
                        {selectedRecipient.displayName} <span className="text-xs font-mono text-[#b8a6ff]/60">@{selectedRecipient.username}</span>
                      </h4>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedRecipient(null);
                        setSearchQuery('');
                      }}
                      className="text-[#dc2626] hover:text-red-400 font-bold px-3 py-1.5 transition-colors text-xs font-orbitron uppercase tracking-wider border border-[#dc2626]/20 hover:bg-[#dc2626]/10 rounded-lg"
                    >
                      Change
                    </button>
                  </div>
                )}
              </div>
            )}
            {/* Paper Selection */}
            <div className="flex flex-wrap gap-2 mb-4">
              {Object.keys(PAPER_STYLES).map(skin => (
                <button
                  key={skin}
                  type="button"
                  onClick={() => setPaperSkin(skin)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider font-orbitron transition-all ${paperSkin === skin ? 'bg-[#8a5aff] text-white shadow-[0_0_10px_rgba(138,90,255,0.4)]' : 'bg-white/5 text-white/50 hover:bg-white/10'}`}
                >
                  {skin}
                </button>
              ))}
            </div>

            {/* The Paper */}
            <div 
              id="paper-container"
              className={`relative rounded-xl overflow-hidden mb-6 group`}
              style={{
                ...PAPER_STYLES[paperSkin],
                ...(sciFiMode ? {
                  border: `1px solid rgba(${sciFiColors.rgb}, 0.5)`,
                  boxShadow: `inset 0 0 50px rgba(${sciFiColors.rgb}, 0.2), 0 0 30px rgba(${sciFiColors.rgb}, 0.2)`,
                } : {
                  boxShadow: 'inset 0 0 20px rgba(0,0,0,0.1)',
                })
              }}
            >
              {sciFiMode && paperSkin === 'parchment' && (
                <>
                  <div className="absolute inset-0 pointer-events-none z-30 opacity-40 mix-blend-overlay" style={{ background: 'repeating-linear-gradient(rgba(255,215,0,0.1), rgba(255,215,0,0.1) 2px, transparent 2px, transparent 4px)' }} />
                  <div className="absolute inset-0 pointer-events-none z-20 shadow-[inset_0_0_80px_rgba(255,215,0,0.3)]" />
                  <div className="absolute top-2 left-2 w-4 h-4 border-t-4 border-l-4 pointer-events-none z-20" style={{ borderColor: sciFiColors.hex }} />
                  <div className="absolute bottom-2 right-2 w-4 h-4 border-b-4 border-r-4 pointer-events-none z-20" style={{ borderColor: sciFiColors.hex }} />
                  <div className="absolute top-4 right-6 text-[12px] font-mono animate-pulse pointer-events-none z-20" style={{ color: sciFiColors.hex }}>REC_</div>
                </>
              )}

              {sciFiMode && paperSkin === 'blueprint' && (
                <>
                  <div className="absolute inset-0 pointer-events-none z-30 opacity-30" style={{ background: 'radial-gradient(circle at 50% 50%, transparent 40%, rgba(74,158,255,0.3) 100%)' }} />
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] border border-[#4A9EFF]/20 rounded-full pointer-events-none z-20" />
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[280px] h-[280px] border border-[#4A9EFF]/10 rounded-full border-dashed animate-[spin_60s_linear_infinite] pointer-events-none z-20" />
                  <div className="absolute top-0 bottom-0 left-12 border-l border-[#4A9EFF]/30 border-dashed pointer-events-none z-20" />
                  <div className="absolute top-12 left-0 right-0 border-t border-[#4A9EFF]/30 border-dashed pointer-events-none z-20" />
                  <div className="absolute bottom-3 right-4 text-[10px] font-mono tracking-widest pointer-events-none z-20" style={{ color: sciFiColors.hex }}>PROJ: STELLAR_09 // REV. A</div>
                </>
              )}

              {sciFiMode && paperSkin === 'grid' && (
                <>
                  <div className="absolute inset-0 pointer-events-none z-30 opacity-40" style={{ background: 'repeating-linear-gradient(90deg, transparent, transparent 19px, rgba(0,255,204,0.15) 20px)' }} />
                  <div className="absolute left-0 top-0 w-2 h-full bg-gradient-to-b from-transparent via-[#00ffcc]/50 to-transparent pointer-events-none z-20" />
                  <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 pointer-events-none z-20" style={{ borderColor: sciFiColors.hex }} />
                  <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 pointer-events-none z-20" style={{ borderColor: sciFiColors.hex }} />
                  <div className="absolute top-2 left-6 text-[10px] font-mono tracking-tighter pointer-events-none z-20" style={{ color: sciFiColors.hex }}>0x00FFCC // ROOT_ACCESS_GRANTED</div>
                </>
              )}

              {sciFiMode && paperSkin === 'starry' && (
                <>
                  <div className="absolute inset-0 pointer-events-none z-30 shadow-[inset_0_0_100px_rgba(184,166,255,0.4)]" />
                  <div className="absolute top-1/2 left-0 right-0 border-t border-[#b8a6ff]/20 pointer-events-none z-20" />
                  <div className="absolute top-0 bottom-0 left-1/2 border-l border-[#b8a6ff]/20 pointer-events-none z-20" />
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 border border-[#b8a6ff]/50 rounded-full pointer-events-none z-20 flex items-center justify-center">
                    <div className="w-1 h-1 bg-[#b8a6ff] rounded-full" />
                  </div>
                  <div className="absolute top-4 left-4 flex flex-col gap-1 pointer-events-none z-20">
                    <div className="w-16 h-1 bg-[#b8a6ff]/40" />
                    <div className="w-8 h-1 bg-[#b8a6ff]/40" />
                  </div>
                  <div className="absolute bottom-4 right-4 text-[10px] font-mono pointer-events-none z-20" style={{ color: sciFiColors.hex }}>[X: 42.11, Y: 11.90, Z: 88.02]</div>
                </>
              )}

              {sciFiMode && paperSkin === 'obsidian' && (
                <>
                  <div className="absolute inset-0 pointer-events-none z-30 opacity-40 mix-blend-overlay" style={{ background: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(0,0,0,0.8) 10px, rgba(0,0,0,0.8) 20px)' }} />
                  <div className="absolute top-0 left-0 right-0 h-6 bg-[#8a5aff]/20 border-b border-[#8a5aff]/50 flex items-center justify-center pointer-events-none z-20">
                    <span className="text-[10px] font-bold tracking-[0.3em]" style={{ color: sciFiColors.hex }}>CLASSIFIED // LEVEL 5</span>
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 h-6 bg-[#8a5aff]/20 border-t border-[#8a5aff]/50 flex items-center justify-center pointer-events-none z-20">
                    <span className="text-[10px] font-bold tracking-[0.3em]" style={{ color: sciFiColors.hex }}>SECURE CHANNEL</span>
                  </div>
                  <div className="absolute top-1/2 left-4 -translate-y-1/2 w-1 h-32 bg-[#8a5aff]/50 pointer-events-none z-20" />
                  <div className="absolute top-1/2 right-4 -translate-y-1/2 w-1 h-32 bg-[#8a5aff]/50 pointer-events-none z-20" />
                </>
              )}
              {placedStickers.map((sticker) => (
                <motion.div
                  key={sticker.id + (sticker.dragReset || '')}
                  drag
                  dragMomentum={false}
                  onDragEnd={(_, info) => {
                    const parent = document.getElementById('paper-container');
                    if (parent) {
                      const rect = parent.getBoundingClientRect();
                      const newX = sticker.x + (info.offset.x / rect.width) * 100;
                      const newY = sticker.y + (info.offset.y / rect.height) * 100;
                      setPlacedStickers(p => p.map(s => s.id === sticker.id ? { ...s, x: newX, y: newY, dragReset: Math.random() } : s));
                    }
                  }}
                  onDoubleClick={() => setPlacedStickers(p => p.filter(s => s.id !== sticker.id))}
                  title="Double-click to remove, drag to move"
                  className="absolute cursor-move hover:scale-125 transition-transform z-20"
                  style={{
                    left: `${sticker.x}%`,
                    top: `${sticker.y}%`,
                    transform: `translate(-50%, -50%) rotate(${sticker.rot}deg)`,
                    width: '32px',
                    height: '32px',
                    opacity: 0.8,
                    color: PAPER_STYLES[paperSkin].color,
                    textShadow: sciFiMode ? `0 0 8px rgba(${sciFiColors.rgb},0.8)` : 'none'
                  }}
                >
                  {STICKERS[sticker.iconId]}
                </motion.div>
              ))}
              
              <textarea
                value={content}
                onChange={e => setContent(e.target.value)}
                onClick={handleTextareaClick}
                placeholder="Write your transmission..."
                className="w-full h-64 p-8 bg-transparent focus:outline-none resize-none relative z-10"
                style={{
                  fontFamily: sciFiMode ? '"Orbitron", sans-serif' : '"Special Elite", cursive',
                  fontSize: sciFiMode ? '14px' : '18px',
                  lineHeight: '32px',
                  letterSpacing: sciFiMode ? '2px' : 'normal',
                  textTransform: sciFiMode ? 'uppercase' : 'none',
                  color: PAPER_STYLES[paperSkin].color,
                  textShadow: sciFiMode ? `0 0 8px rgba(${sciFiColors.rgb},0.8)` : 'none'
                }}
              />
            </div>

            {/* Future Delivery / Scheduling option */}
            {finalRecipient && (
              <div className="mb-6 flex flex-col gap-3 bg-[#4A9EFF]/5 p-4 rounded-xl border border-[#4A9EFF]/15">
                {finalRecipient.id !== 'sun' ? (
                  <label className="flex items-center gap-3.5 cursor-pointer select-none text-xs font-mono text-[#a0b9ff]/80 uppercase tracking-widest">
                    <input
                      type="checkbox"
                      checked={isScheduled}
                      onChange={(e) => {
                        setIsScheduled(e.target.checked);
                        if (!e.target.checked) setDeliverAt('');
                      }}
                      style={{ filter: 'hue-rotate(240deg)' }}
                      className="w-4 h-4 rounded border-white/20 bg-[#050510] text-[#8a5aff] focus:ring-0 cursor-pointer accent-[#8a5aff]"
                    />
                    <span>⏰ Schedule transmission for future delivery</span>
                  </label>
                ) : (
                  <div className="text-[10px] font-mono text-[#a0b9ff]/60 uppercase tracking-widest flex items-center gap-2">
                    <span>⏰ MANDATORY FUTURE DELIVERY (LETTER TO PAST/FUTURE SELF)</span>
                  </div>
                )}

                {isScheduled && (
                  <div className="flex flex-col gap-2 mt-2">
                    <label className="text-[#a0b9ff]/70 text-[10px] font-mono uppercase tracking-widest flex items-center gap-2">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                      Select delivery date and time
                    </label>
                    <input 
                      type="datetime-local" 
                      value={deliverAt} 
                      onChange={(e) => setDeliverAt(e.target.value)}
                      min={new Date().toISOString().slice(0, 16)}
                      title="Delivery Date and Time"
                      placeholder="Select delivery date and time"
                      className="bg-[#050510]/80 border border-[#4A9EFF]/30 text-white rounded-lg p-2.5 font-mono text-sm focus:outline-none focus:border-[#4A9EFF] transition-colors cursor-pointer"
                    />
                  </div>
                )}
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="mb-4 p-3 rounded bg-red-900/30 border border-red-500/50 text-red-400 text-sm font-mono text-center">
                {error}
              </div>
            )}

            {/* Bottom Controls */}
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
              
              {/* SVG Doodle Toolbar */}
              <div className="flex items-center gap-1.5 overflow-x-auto sticker-scrollbar pb-1 max-w-[280px]">
                {Object.entries(STICKERS).map(([id, icon]) => (
                  <button
                    key={id}
                    type="button"
                    title={`Stamp ${id} doodle`}
                    onClick={() => handleInsertSticker(id)}
                    className="w-8 h-8 rounded shrink-0 flex items-center justify-center bg-white/5 border border-white/10 text-[#4A9EFF] hover:bg-[#4A9EFF]/20 hover:border-[#4A9EFF]/50 transition-all"
                  >
                    <div className="w-4 h-4">{icon}</div>
                  </button>
                ))}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 w-full sm:w-auto mt-2 sm:mt-0">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    setContent('');
                    setError('');
                    setPlacedStickers([]);
                  }}
                  className="px-6 py-3 rounded text-[#a0b9ff]/60 text-xs font-bold uppercase tracking-widest font-orbitron hover:text-white transition-colors"
                >
                  ABORT
                </button>
                
                <button
                  type="submit"
                  disabled={isSending || !content.trim() || !finalRecipient}
                  className="px-8 py-3 rounded text-white text-xs font-bold uppercase tracking-widest font-orbitron transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(138,90,255,0.3)] hover:shadow-[0_0_30px_rgba(138,90,255,0.5)] flex items-center gap-2"
                  style={{
                    background: 'linear-gradient(135deg, #3a1c7a, #200d46)',
                    border: '1px solid rgba(138,90,255,0.5)'
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                  {isSending ? 'LAUNCHING...' : 'SEND'}
                </button>
              </div>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
