import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Trophy, Sparkles, Award, Medal, Download, CheckCircle2, 
  ArrowRight, X, Star, Crown, PartyPopper, Flame
} from 'lucide-react';
import { Milestone, downloadCertificateOfMilestone } from '../lib/achievementUtils';

interface MilestoneCelebrationModalProps {
  milestone: Milestone | null;
  storeName: string;
  theme?: string;
  onClose: () => void;
  onViewAllMilestones?: () => void;
}

// Particle colors for celebration confetti simulation
const CONFETTI_COLORS = [
  '#f59e0b', '#ec4899', '#8b5cf6', '#10b981', '#3b82f6', '#fbbf24', '#06b6d4', '#f43f5e', '#ffffff'
];

interface Particle {
  id: number;
  x: number;
  y: number;
  color: string;
  size: number;
  rotation: number;
  delay: number;
  shape: 'rect' | 'circle' | 'star' | 'ribbon';
}

// Map each theme to bespoke, high-contrast dynamic gradients and accent tones
const getThemeCelebrationStyles = (theme: string) => {
  switch (theme) {
    case 'cyberpunk':
      return {
        cardGlow: 'shadow-[0_0_50px_rgba(236,72,153,0.35)]',
        borderStyle: 'border-2 border-pink-500/60',
        bgGradient: 'bg-gradient-to-b from-[#180024] via-[#090014] to-[#030008]',
        topBar: 'bg-gradient-to-r from-pink-500 via-cyan-400 to-pink-500',
        trophyGlow: 'from-pink-500 via-purple-600 to-cyan-500',
        badgeBg: 'bg-pink-500/20 border-pink-500/50 text-pink-400',
        titleText: 'text-white',
        subText: 'text-white/60',
        itemTitle: 'text-white',
        highlightText: 'text-cyan-400',
        descText: 'text-pink-100/90',
        infoBoxBg: 'bg-cyan-950/30 border-cyan-500/30',
        timestampText: 'text-white/60',
        primaryBtn: 'bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-400 hover:to-rose-400 text-white font-black border-pink-300/40 shadow-pink-500/30',
        secondaryBtn: 'bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
        dismissBtn: 'bg-white/5 hover:bg-white/15 text-white/80 hover:text-white border-white/10',
        closeBtn: 'bg-white/10 hover:bg-white/20 text-white/80 hover:text-white border-white/15'
      };
    case 'emerald_matrix':
      return {
        cardGlow: 'shadow-[0_0_50px_rgba(16,185,129,0.3)]',
        borderStyle: 'border-2 border-emerald-500/60',
        bgGradient: 'bg-gradient-to-b from-[#022c22] via-[#021b15] to-[#000000]',
        topBar: 'bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-500',
        trophyGlow: 'from-emerald-400 via-teal-500 to-emerald-600',
        badgeBg: 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400',
        titleText: 'text-white',
        subText: 'text-emerald-300/70',
        itemTitle: 'text-white',
        highlightText: 'text-emerald-300',
        descText: 'text-emerald-100/90',
        infoBoxBg: 'bg-emerald-950/40 border-emerald-500/30',
        timestampText: 'text-emerald-300/60',
        primaryBtn: 'bg-emerald-500 hover:bg-emerald-400 text-emerald-950 font-black border-emerald-300 shadow-emerald-500/30',
        secondaryBtn: 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
        dismissBtn: 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-200 hover:text-white border-emerald-500/20',
        closeBtn: 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-200 hover:text-white border-emerald-500/20'
      };
    case 'luxury_gold':
      return {
        cardGlow: 'shadow-[0_0_50px_rgba(245,158,11,0.35)]',
        borderStyle: 'border-2 border-amber-500/60',
        bgGradient: 'bg-gradient-to-b from-[#291e0a] via-[#171105] to-[#0c0a09]',
        topBar: 'bg-gradient-to-r from-amber-400 via-yellow-200 to-amber-500',
        trophyGlow: 'from-amber-400 via-yellow-500 to-amber-600',
        badgeBg: 'bg-amber-500/20 border-amber-500/50 text-amber-400',
        titleText: 'text-amber-100',
        subText: 'text-amber-200/60',
        itemTitle: 'text-amber-100',
        highlightText: 'text-amber-300',
        descText: 'text-amber-100/90',
        infoBoxBg: 'bg-amber-950/40 border-amber-500/30',
        timestampText: 'text-amber-200/60',
        primaryBtn: 'bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 text-stone-950 font-black border-amber-200 shadow-amber-500/30',
        secondaryBtn: 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border-amber-500/30',
        dismissBtn: 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-200 hover:text-amber-100 border-amber-500/20',
        closeBtn: 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-200 hover:text-amber-100 border-amber-500/20'
      };
    case 'glass_modern':
      return {
        cardGlow: 'shadow-[0_0_50px_rgba(139,92,246,0.35)]',
        borderStyle: 'border-2 border-purple-400/50',
        bgGradient: 'bg-gradient-to-b from-[#2e1065] via-[#1e1b4b] to-[#0f172a]',
        topBar: 'bg-gradient-to-r from-purple-400 via-pink-400 to-purple-500',
        trophyGlow: 'from-purple-400 via-pink-500 to-purple-600',
        badgeBg: 'bg-purple-500/25 border-purple-400/50 text-purple-300',
        titleText: 'text-white',
        subText: 'text-purple-200/60',
        itemTitle: 'text-white',
        highlightText: 'text-purple-300',
        descText: 'text-purple-100/90',
        infoBoxBg: 'bg-purple-950/40 border-purple-500/30',
        timestampText: 'text-purple-200/60',
        primaryBtn: 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400 text-white font-black border-purple-300/50 shadow-purple-500/30',
        secondaryBtn: 'bg-purple-500/10 hover:bg-purple-500/20 text-purple-200 border-purple-400/30',
        dismissBtn: 'bg-white/5 hover:bg-white/15 text-purple-200 hover:text-white border-white/10',
        closeBtn: 'bg-white/10 hover:bg-white/20 text-purple-200 hover:text-white border-white/15'
      };
    case 'retro-blue':
      return {
        cardGlow: 'shadow-[0_0_50px_rgba(99,102,241,0.35)]',
        borderStyle: 'border-2 border-indigo-500/60',
        bgGradient: 'bg-gradient-to-b from-[#1e1b4b] via-[#0f0c29] to-[#03001a]',
        topBar: 'bg-gradient-to-r from-indigo-400 via-purple-300 to-pink-400',
        trophyGlow: 'from-indigo-400 via-purple-500 to-indigo-600',
        badgeBg: 'bg-indigo-500/25 border-indigo-400/50 text-indigo-300',
        titleText: 'text-white',
        subText: 'text-indigo-200/60',
        itemTitle: 'text-white',
        highlightText: 'text-indigo-300',
        descText: 'text-indigo-100/90',
        infoBoxBg: 'bg-indigo-950/40 border-indigo-500/30',
        timestampText: 'text-indigo-200/60',
        primaryBtn: 'bg-indigo-500 hover:bg-indigo-400 text-white font-black border-indigo-300/40 shadow-indigo-500/30',
        secondaryBtn: 'bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
        dismissBtn: 'bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-200 hover:text-white border-indigo-500/20',
        closeBtn: 'bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-200 hover:text-white border-indigo-500/20'
      };
    case 'emerald-gold':
      return {
        cardGlow: 'shadow-[0_0_50px_rgba(16,185,129,0.35)]',
        borderStyle: 'border-2 border-emerald-500/60',
        bgGradient: 'bg-gradient-to-b from-[#063a2b] via-[#02241b] to-[#01140f]',
        topBar: 'bg-gradient-to-r from-emerald-400 via-yellow-300 to-emerald-500',
        trophyGlow: 'from-emerald-400 via-amber-400 to-emerald-600',
        badgeBg: 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300',
        titleText: 'text-emerald-50',
        subText: 'text-emerald-200/60',
        itemTitle: 'text-emerald-50',
        highlightText: 'text-amber-300',
        descText: 'text-emerald-100/90',
        infoBoxBg: 'bg-emerald-950/40 border-emerald-500/30',
        timestampText: 'text-emerald-200/60',
        primaryBtn: 'bg-gradient-to-r from-emerald-500 to-amber-500 hover:from-emerald-400 hover:to-amber-400 text-stone-950 font-black border-emerald-200 shadow-emerald-500/30',
        secondaryBtn: 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
        dismissBtn: 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-200 hover:text-white border-emerald-500/20',
        closeBtn: 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-200 hover:text-white border-emerald-500/20'
      };
    case 'neo_brutalist':
      return {
        cardGlow: 'shadow-[10px_10px_0px_#000000]',
        borderStyle: 'border-4 border-black',
        bgGradient: 'bg-white',
        topBar: 'bg-black',
        trophyGlow: 'from-amber-400 to-yellow-400 text-black border-2 border-black',
        badgeBg: 'bg-amber-100 border-2 border-black text-black font-black',
        titleText: 'text-black font-black',
        subText: 'text-zinc-700 font-bold',
        itemTitle: 'text-black font-black',
        highlightText: 'text-black font-black',
        descText: 'text-zinc-800 font-bold',
        infoBoxBg: 'bg-zinc-100 border-2 border-black',
        timestampText: 'text-zinc-700 font-bold',
        primaryBtn: 'bg-amber-400 hover:bg-amber-300 text-black font-black border-2 border-black shadow-[4px_4px_0px_#000]',
        secondaryBtn: 'bg-white hover:bg-zinc-100 text-black font-black border-2 border-black shadow-[3px_3px_0px_#000]',
        dismissBtn: 'bg-zinc-100 hover:bg-zinc-200 text-black font-black border-2 border-black shadow-[3px_3px_0px_#000]',
        closeBtn: 'bg-zinc-200 hover:bg-zinc-300 text-black font-black border-2 border-black'
      };
    case 'minimalist-ivory':
      return {
        cardGlow: 'shadow-2xl shadow-stone-900/15',
        borderStyle: 'border-2 border-stone-300',
        bgGradient: 'bg-gradient-to-b from-[#faf8f2] via-[#f5f2ea] to-[#eeeae0]',
        topBar: 'bg-gradient-to-r from-[#2d5a4e] via-[#8c7853] to-[#2d5a4e]',
        trophyGlow: 'from-[#2d5a4e] via-[#3e7a6b] to-[#2d5a4e]',
        badgeBg: 'bg-[#2d5a4e]/10 border-[#2d5a4e]/30 text-[#2d5a4e]',
        titleText: 'text-[#1c2e24]',
        subText: 'text-[#1c2e24]/60',
        itemTitle: 'text-[#1c2e24]',
        highlightText: 'text-[#2d5a4e]',
        descText: 'text-[#1c2e24]/85',
        infoBoxBg: 'bg-white/90 border-stone-300 shadow-sm',
        timestampText: 'text-[#1c2e24]/60',
        primaryBtn: 'bg-[#2d5a4e] hover:bg-[#23473d] text-[#fcfbf7] font-black border-transparent shadow-md shadow-[#2d5a4e]/20',
        secondaryBtn: 'bg-[#2d5a4e]/10 hover:bg-[#2d5a4e]/20 text-[#2d5a4e] font-extrabold border-stone-300',
        dismissBtn: 'bg-stone-200 hover:bg-stone-300 text-[#1c2e24] font-extrabold border-stone-300 shadow-xs',
        closeBtn: 'bg-stone-200 hover:bg-stone-300 text-[#1c2e24] font-extrabold border-stone-300'
      };
    case 'midnight_blue':
    default:
      return {
        cardGlow: 'shadow-[0_0_50px_rgba(59,130,246,0.35)]',
        borderStyle: 'border-2 border-blue-500/50',
        bgGradient: 'bg-gradient-to-b from-[#0d1b3e] via-[#071128] to-[#020617]',
        topBar: 'bg-gradient-to-r from-blue-400 via-amber-300 to-blue-500',
        trophyGlow: 'from-blue-500 via-amber-400 to-yellow-500',
        badgeBg: 'bg-blue-500/20 border-blue-400/40 text-blue-300',
        titleText: 'text-white',
        subText: 'text-slate-200/60',
        itemTitle: 'text-white',
        highlightText: 'text-amber-300',
        descText: 'text-slate-100/90',
        infoBoxBg: 'bg-blue-950/40 border-blue-500/30',
        timestampText: 'text-slate-200/60',
        primaryBtn: 'bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 text-stone-950 font-black border-amber-200 shadow-amber-500/30',
        secondaryBtn: 'bg-blue-500/10 hover:bg-blue-500/20 text-blue-200 border-blue-500/30',
        dismissBtn: 'bg-white/5 hover:bg-white/15 text-slate-200 hover:text-white border-white/10',
        closeBtn: 'bg-white/10 hover:bg-white/20 text-slate-200 hover:text-white border-white/15'
      };
  }
};

export function MilestoneCelebrationModal({
  milestone,
  storeName,
  theme = 'midnight_blue',
  onClose,
  onViewAllMilestones
}: MilestoneCelebrationModalProps) {
  const [particles, setParticles] = useState<Particle[]>([]);

  const celebrationStyle = getThemeCelebrationStyles(theme);

  useEffect(() => {
    if (!milestone) return;

    // Generate confetti burst particles with refined spatial distribution
    const newParticles: Particle[] = Array.from({ length: 50 }, (_, i) => ({
      id: i,
      x: (Math.random() - 0.5) * 480,
      y: (Math.random() - 0.5) * 480 - 80,
      color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
      size: Math.random() * 8 + 4,
      rotation: Math.random() * 720,
      delay: Math.random() * 0.25,
      shape: (['rect', 'circle', 'star', 'ribbon'] as const)[Math.floor(Math.random() * 4)]
    }));
    setParticles(newParticles);
  }, [milestone]);

  if (!milestone) return null;

  const handleDownload = () => {
    downloadCertificateOfMilestone(storeName || "Our Retail Store", milestone);
  };

  return (
    <AnimatePresence>
      <div 
        id="milestone-celebration-overlay"
        className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6 select-none overflow-y-auto"
      >
        {/* Backdrop with rich dynamic blur */}
        <motion.div
          id="milestone-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/85 backdrop-blur-md"
        />

        {/* Floating Ambient Glow Orbs */}
        <div className="fixed inset-0 pointer-events-none flex items-center justify-center overflow-hidden">
          <motion.div 
            animate={{ 
              scale: [1, 1.3, 1],
              opacity: [0.35, 0.65, 0.35],
              rotate: [0, 90, 180]
            }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            className="w-96 h-96 rounded-full bg-gradient-to-r from-amber-500/25 via-pink-500/20 to-purple-500/25 blur-3xl"
          />
        </div>

        {/* Confetti Explosion Particles */}
        <div className="fixed inset-0 pointer-events-none flex items-center justify-center overflow-hidden z-10">
          {particles.map((p) => (
            <motion.div
              key={p.id}
              initial={{ 
                x: 0, 
                y: 0, 
                scale: 0, 
                opacity: 1, 
                rotate: 0 
              }}
              animate={{ 
                x: p.x, 
                y: [p.y, p.y + 160], 
                scale: [0, 1.25, 0.75], 
                opacity: [1, 1, 0], 
                rotate: p.rotation 
              }}
              transition={{ 
                duration: 2.4, 
                ease: "easeOut",
                delay: p.delay 
              }}
              style={{
                backgroundColor: p.shape === 'star' ? 'transparent' : p.color,
                width: p.shape === 'ribbon' ? p.size * 2 : p.size,
                height: p.shape === 'ribbon' ? p.size * 0.5 : p.size,
                borderRadius: p.shape === 'circle' ? '9999px' : p.shape === 'rect' ? '2px' : '0px'
              }}
              className="absolute"
            >
              {p.shape === 'star' && (
                <Star size={p.size * 1.6} style={{ fill: p.color, color: p.color }} />
              )}
            </motion.div>
          ))}
        </div>

        {/* Main Grand Celebration Card with Spring-based Entrance Animation */}
        <motion.div
          id="milestone-celebration-card"
          initial={{ scale: 0.75, opacity: 0, y: 45 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.8, opacity: 0, y: 30 }}
          transition={{ type: "spring", stiffness: 350, damping: 25 }}
          className={`relative w-full max-w-md ${celebrationStyle.bgGradient} ${celebrationStyle.borderStyle} ${celebrationStyle.cardGlow} rounded-[2.5rem] p-6 sm:p-8 flex flex-col items-center text-center overflow-hidden z-20 my-auto`}
        >
          {/* Top Sparkling Light Bar */}
          <div className={`absolute top-0 inset-x-0 h-1.5 ${celebrationStyle.topBar} animate-pulse`} />
          
          {/* Subtle Ambient Corner Accents */}
          <div className="absolute -top-16 -right-16 w-36 h-36 bg-amber-500/15 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute -bottom-16 -left-16 w-36 h-36 bg-emerald-500/15 rounded-full blur-2xl pointer-events-none" />

          {/* Close Icon Button */}
          <button
            id="close-milestone-celebration-btn"
            onClick={onClose}
            aria-label="Close celebration modal"
            className={`absolute top-4 right-4 h-9 w-9 rounded-full ${celebrationStyle.closeBtn} flex items-center justify-center transition-all cursor-pointer border z-30`}
          >
            <X size={16} />
          </button>

          {/* 1. Grand Glowing Floating Trophy Icon */}
          <div className="relative mt-2 mb-4">
            {/* Spinning Sunburst Glow Ring */}
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 24, repeat: Infinity, ease: "linear" }}
              className="absolute -inset-4 rounded-full border border-dashed border-amber-400/40 opacity-70 pointer-events-none"
            />
            <motion.div
              animate={{ scale: [1, 1.15, 1], opacity: [0.4, 0.8, 0.4] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
              className="absolute -inset-3 bg-amber-500/20 rounded-full blur-xl pointer-events-none"
            />
            
            {/* Floating 3D-Style Trophy Container */}
            <motion.div
              animate={{ 
                y: [0, -8, 0],
                rotate: [0, -3, 3, 0]
              }}
              transition={{ 
                duration: 3.5, 
                repeat: Infinity, 
                ease: "easeInOut" 
              }}
              className={`relative h-22 w-22 sm:h-24 sm:w-24 rounded-3xl bg-gradient-to-br ${celebrationStyle.trophyGlow} text-stone-950 flex items-center justify-center shadow-xl shadow-amber-500/40 border-2 border-white/70`}
            >
              <Trophy size={46} className="drop-shadow-md stroke-[2.2]" />
              
              {/* Corner Star Flare */}
              <motion.div
                animate={{ scale: [0.8, 1.3, 0.8], rotate: [0, 90, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="absolute -top-2 -right-2 bg-yellow-200 text-amber-900 rounded-full p-1 shadow-md border border-white"
              >
                <Sparkles size={14} />
              </motion.div>
            </motion.div>
          </div>

          {/* 2. Celebration Header Badge & Title */}
          <div className="space-y-1.5 w-full">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1 }}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full ${celebrationStyle.badgeBg} text-[10px] font-black uppercase tracking-[0.25em] shadow-sm`}
            >
              <PartyPopper size={12} />
              <span>Milestone Met!</span>
              <Sparkles size={12} />
            </motion.div>

            <h2 className={`text-xl sm:text-2xl font-black ${celebrationStyle.titleText} uppercase tracking-tight pt-1`}>
              Achievement Unlocked
            </h2>
            <p className={`text-[9.5px] font-extrabold uppercase tracking-widest ${celebrationStyle.subText}`}>
              Verified Business Growth Checkpoint
            </p>
          </div>

          {/* 3. Detailed Milestone Achievement Box */}
          <div className={`w-full my-4 p-4 sm:p-5 rounded-2xl ${celebrationStyle.infoBoxBg} relative space-y-2 text-left`}>
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-0.5">
                <span className={`text-[8.5px] font-black uppercase tracking-wider ${celebrationStyle.highlightText} flex items-center gap-1 font-mono`}>
                  <Flame size={11} /> High Performance Benchmark
                </span>
                <h3 className={`text-base sm:text-lg font-black ${celebrationStyle.itemTitle} leading-snug`}>
                  {milestone.title}
                </h3>
              </div>
              <span className="shrink-0 px-2.5 py-0.5 rounded-md bg-emerald-500/20 border border-emerald-400/40 text-emerald-600 dark:text-emerald-400 text-[9px] font-black uppercase tracking-wide flex items-center gap-1">
                <CheckCircle2 size={11} /> Achieved
              </span>
            </div>

            <p className={`text-xs ${celebrationStyle.descText} font-semibold leading-relaxed`}>
              {milestone.description}
            </p>

            {milestone.unlockedAt && (
              <div className="pt-2 border-t border-black/10 dark:border-white/10 flex items-center justify-between text-[8.5px] font-mono font-bold uppercase tracking-wider">
                <span className={celebrationStyle.timestampText}>Recorded At:</span>
                <span className={celebrationStyle.timestampText}>
                  {new Date(milestone.unlockedAt).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              </div>
            )}
          </div>

          {/* 4. High Contrast Action Buttons */}
          <div className="w-full space-y-2.5 pt-1">
            {/* Download Certificate Button */}
            <button
              id="download-milestone-pdf-btn"
              type="button"
              onClick={handleDownload}
              className={`w-full h-12 flex items-center justify-center gap-2 px-6 rounded-2xl ${celebrationStyle.primaryBtn} text-xs uppercase tracking-wider shadow-lg hover:scale-[1.01] active:scale-[0.98] transition-all cursor-pointer border`}
            >
              <Download size={16} className="stroke-[2.5]" />
              <span>Download PDF Certificate</span>
            </button>

            {/* View Milestones & Dismiss Grid */}
            <div className="grid grid-cols-2 gap-2">
              {onViewAllMilestones && (
                <button
                  id="view-all-milestones-btn"
                  type="button"
                  onClick={() => {
                    onClose();
                    onViewAllMilestones();
                  }}
                  className={`h-10 flex items-center justify-center gap-1.5 px-3 rounded-xl ${celebrationStyle.secondaryBtn} text-[10px] font-extrabold uppercase tracking-wider border transition-all cursor-pointer`}
                >
                  <span>View Journey</span>
                  <ArrowRight size={12} />
                </button>
              )}

              <button
                id="dismiss-milestone-celebration-btn"
                type="button"
                onClick={onClose}
                className={`h-10 flex items-center justify-center px-3 rounded-xl ${celebrationStyle.dismissBtn} text-[10px] font-extrabold uppercase tracking-wider transition-all cursor-pointer border ${
                  !onViewAllMilestones ? 'col-span-2' : ''
                }`}
              >
                <span>Continue</span>
              </button>
            </div>
          </div>

        </motion.div>
      </div>
    </AnimatePresence>
  );
}
export default MilestoneCelebrationModal;
