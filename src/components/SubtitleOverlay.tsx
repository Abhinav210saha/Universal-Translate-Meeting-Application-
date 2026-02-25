import React from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface SubtitleOverlayProps {
  identity: string;
  text: string;
}

export const SubtitleOverlay: React.FC<SubtitleOverlayProps> = ({ text }) => {
  return (
    <AnimatePresence>
      {text && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="fixed bottom-32 left-1/2 -translate-x-1/2 max-w-[80%] text-center"
        >
          <div className="bg-black/80 backdrop-blur-xl border border-white/10 px-6 py-3 rounded-2xl shadow-2xl">
            <p className="text-white text-lg font-medium leading-tight">
              {text}
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
