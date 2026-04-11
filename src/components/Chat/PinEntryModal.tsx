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
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            className="relative w-full max-w-sm bg-[#151520] border border-white/10 rounded-3xl p-8 shadow-2xl"
          >
            <button
              onClick={onClose}
              className="absolute top-6 right-6 p-2 rounded-full hover:bg-white/5 text-white/40 hover:text-white transition-all"
            >
              <X size={18} />
            </button>

            <div className="flex flex-col items-center text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 mb-2">
                <Lock size={32} />
              </div>
              
              <h2 className="text-2xl font-bold text-white">Join Team Chat</h2>
              <p className="text-gray-400 text-sm">Enter the 6-digit PIN shared by your team member to access this conversation.</p>

              <form onSubmit={handleSubmit} className="w-full space-y-6 mt-4">
                <div className="space-y-2">
                  <input
                    type="text"
                    maxLength={6}
                    placeholder="0 0 0 0 0 0"
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/[^0-9]/g, ''))}
                    className="w-full bg-[#0d0d14] border-2 border-white/5 rounded-2xl px-6 py-4 text-center text-2xl font-bold tracking-[0.5em] text-white focus:outline-none focus:border-indigo-500/50 transition-all placeholder:text-white/10"
                    autoFocus
                  />
                  {error && (
                    <motion.p
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-rose-400 text-sm font-medium"
                    >
                      {error}
                    </motion.p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={pin.length !== 6 || isJoining}
                  className="w-full bg-indigo-500 hover:bg-indigo-400 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 rounded-2xl transition-all flex items-center justify-center gap-2"
                >
                  {isJoining ? (
                    <>
                      <Loader2 size={20} className="animate-spin" />
                      Joining...
                    </>
                  ) : (
                    'Join Conversation'
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
