import React from 'react';
import { motion } from 'motion/react';
import { AppHelpTutorial } from './AppHelpTutorial';

export interface HelpModalProps {
  onClose: () => void;
  t: any;
  onNavigateTab?: (tab: string) => void;
  onOpenVoice?: () => void;
}

export function HelpModal({ onClose, t, onNavigateTab, onOpenVoice }: HelpModalProps) {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] w-screen h-screen bg-[#050811] text-white flex flex-col overflow-y-auto"
    >
      <AppHelpTutorial 
        initialFullscreen={true}
        onClose={onClose}
        onNavigateTab={(tab) => {
          if (onNavigateTab) onNavigateTab(tab);
          onClose();
        }}
        onOpenVoice={() => {
          if (onOpenVoice) onOpenVoice();
          onClose();
        }}
        t={t}
      />
    </motion.div>
  );
}
export default HelpModal;
