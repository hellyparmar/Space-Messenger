import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '../store/useAppStore';

export default function GroupChat() {
  const { isGroupChatOpen, setGroupChatOpen, selectedGroupId, groups } = useAppStore();
  const group = groups.find(g => g.id === selectedGroupId);

  if (!isGroupChatOpen || !group) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.9, x: 20 }}
        animate={{ opacity: 1, scale: 1, x: 0 }}
        exit={{ opacity: 0, scale: 0.9, x: 20 }}
        className="fixed top-24 right-8 w-96 bg-black/80 border border-white/10 backdrop-blur-2xl rounded-3xl overflow-hidden shadow-2xl z-50 flex flex-col h-[600px]"
      >
        {/* Header */}
        <div className="p-6 border-b border-white/5 bg-white/5 flex items-center justify-between">
          <div>
            <h3 className="text-white font-bold text-lg leading-tight">{group.name}</h3>
            <p className="text-white/40 text-[10px] uppercase tracking-widest font-bold mt-1">
              {group.memberIds.length} stellar nodes active
            </p>
          </div>
          <button 
            onClick={() => setGroupChatOpen(false)}
            className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-white/40 hover:bg-white/10 hover:text-white transition-all"
          >
            ✕
          </button>
        </div>

        {/* Messages Placeholder */}
        <div className="flex-1 p-6 overflow-y-auto space-y-4">
          <div className="text-center py-10">
            <span className="text-4xl mb-4 block">📡</span>
            <p className="text-white/30 text-xs font-medium max-w-[200px] mx-auto italic">
              Synchronizing subspace frequencies... Group signal established.
            </p>
          </div>
          
          <div className="space-y-4">
            <div className="flex flex-col items-start gap-1">
              <span className="text-[9px] text-amber-500/80 font-bold uppercase tracking-widest ml-1">System</span>
              <div className="bg-white/5 border border-white/10 rounded-2xl rounded-tl-none p-4 max-w-[80%]">
                <p className="text-white/80 text-sm leading-relaxed">
                  Welcome to the {group.name} cluster. Secure transmission line is active.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Input Placeholder */}
        <div className="p-6 border-t border-white/5 bg-black/40">
          <div className="relative">
            <input 
              type="text" 
              placeholder="Broadcast a message..."
              className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 px-4 text-white placeholder:text-white/20 focus:outline-none focus:border-amber-500/50 transition-all text-sm"
              disabled
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-white/20 text-xs font-black">
              SEND
            </div>
          </div>
          <p className="text-[8px] text-white/20 text-center mt-3 uppercase tracking-tighter font-bold">
            Encryption: 2048-bit RSA · Signal: Nominal
          </p>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
