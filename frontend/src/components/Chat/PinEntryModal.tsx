import React, { useState } from 'react';
import { X, Lock, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface PinEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onJoin: (pin: string) => void;
  isJoining: boolean;
  error?: string;
}

export const PinEntryModal: React.FC<PinEntryModalProps> = ({
  isOpen,
  onClose,
  onJoin,
  isJoining,
  error
}) => {
  const [pin, setPin] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin.length === 6) {
      onJoin(pin);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
          />
          
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            className="relative w-full max-w-sm bg-white border border-slate-200 rounded-[32px] p-6 sm:p-10 shadow-2xl overflow-hidden"
          >
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-900 transition-all"
            >
              <X size={20} />
            </button>

            <div className="flex flex-col items-center text-center space-y-6">
              <div className="w-16 h-16 rounded-3xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shadow-sm">
                <Lock size={32} />
              </div>

              <div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">Access Team Strategy</h2>
                <p className="text-slate-500 text-sm font-medium mt-2 leading-relaxed px-2">Enter the team PIN to link your workspace. Your chats remain private.</p>
              </div>

              <form onSubmit={handleSubmit} className="w-full space-y-6">
                <div className="space-y-3">
                  <input
                    type="text"
                    maxLength={6}
                    placeholder="0 0 0 0 0 0"
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/[^0-9]/g, ''))}
                    className="w-full bg-slate-50 border-2 border-slate-200 rounded-[20px] px-4 py-5 text-center text-2xl sm:text-3xl font-black tracking-[0.4em] text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all placeholder:text-slate-200 shadow-inner"
                    autoFocus
                  />
                  {error && (
                    <motion.p
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-red-600 text-xs font-black uppercase tracking-wider"
                    >
                      {error}
                    </motion.p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={pin.length !== 6 || isJoining}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-black py-5 text-sm uppercase tracking-[0.2em] rounded-[20px] transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 active:scale-95 disabled:shadow-none"
                >
                  {isJoining ? (
                    <>
                      <Loader2 size={20} className="animate-spin" />
                      Syncing...
                    </>
                  ) : (
                    'Link Workspace'
                  )}
                </button>
              </form>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
