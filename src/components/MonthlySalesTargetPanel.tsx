import React, { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Target, Pencil, Check, X, Flame, Zap, Crown, Award, 
  TrendingUp, Calendar, CheckCircle2, Lock, Sparkles, Smile, Trophy, Play, CheckCircle
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { AppState } from '../types';
import { ThemeVisualEffects } from './ThemeVisualEffects';

interface ConfettiEffectProps {
  triggerCount: number;
}

export function ConfettiEffect({ triggerCount }: ConfettiEffectProps) {
  useEffect(() => {
    if (triggerCount === 0) return;

    // Left firework
    confetti({
      particleCount: 80,
      angle: 60,
      spread: 55,
      origin: { x: 0, y: 0.8 }
    });

    // Right firework
    confetti({
      particleCount: 80,
      angle: 120,
      spread: 55,
      origin: { x: 1, y: 0.8 }
    });

    // Central burst
    setTimeout(() => {
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 }
      });
    }, 150);

  }, [triggerCount]);

  return null;
}

interface MonthlySalesTargetPanelProps {
  state: AppState;
  onUpdateSettings?: (updates: Partial<AppState['settings']>) => void;
  t?: any;
}

export function MonthlySalesTargetPanel({ state, onUpdateSettings, t = {} }: MonthlySalesTargetPanelProps) {
  const currentTheme = state.settings.theme;
  const currencyCode = state.settings.currency || 'INR';

  // Target and analytics calculations
  const target = state.settings.monthlySalesTarget || 100000;
  
  // Get raw bills for current calendar month
  const currentMonthSales = useMemo(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    
    return (state.bills || [])
      .filter(bill => {
        const d = new Date(bill.timestamp);
        return d >= startOfMonth && d <= endOfMonth;
      })
      .reduce((sum, bill) => sum + (bill.total || 0), 0);
  }, [state.bills]);

  // Calendar info
  const now = new Date();
  const monthName = now.toLocaleString('default', { month: 'long' });
  const yearName = now.getFullYear();
  const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const daysInMonth = lastDayOfMonth.getDate();
  const currentDay = now.getDate();
  const daysLeft = Math.max(1, daysInMonth - currentDay + 1);

  // Stats
  const progressPercent = target > 0 ? (currentMonthSales / target) * 100 : 0;
  const isGoalMet = currentMonthSales >= target;
  const salesRemaining = Math.max(0, target - currentMonthSales);
  const dailyRequired = daysLeft > 0 ? salesRemaining / daysLeft : 0;
  const projectedSales = currentDay > 0 ? (currentMonthSales / currentDay) * daysInMonth : 0;

  // Editing state
  const [isEditing, setIsEditing] = useState(false);
  const [targetInput, setTargetInput] = useState('');
  const [validationError, setValidationError] = useState('');

  // Count up value for percentage display
  const [animatedProgress, setAnimatedProgress] = useState(0);

  // Progressive count up effect when target or progressPercent stabilizes/updates
  useEffect(() => {
    const end = progressPercent;
    if (end === 0) {
      setAnimatedProgress(0);
      return;
    }
    const duration = 1200; // ms
    const startTime = performance.now();

    const animateCount = (timestamp: number) => {
      const elapsed = timestamp - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // easeOutQuad easing
      const easeProgress = progress * (2 - progress);
      setAnimatedProgress(easeProgress * end);

      if (progress < 1) {
        requestAnimationFrame(animateCount);
      } else {
        setAnimatedProgress(end);
      }
    };

    const animId = requestAnimationFrame(animateCount);
    return () => cancelAnimationFrame(animId);
  }, [progressPercent]);

  // Automated Confetti & Achievement victory modal state
  const [activeCelebrationModal, setActiveCelebrationModal] = useState<'none' | '50' | '100'>('none');
  const [confettiTriggerCount, setConfettiTriggerCount] = useState(0);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: currencyCode,
      maximumFractionDigits: 0,
    }).format(val);
  };

  // Monitor target crossing of 50% and 100% automatically
  useEffect(() => {
    if (target <= 0) return;

    const yearMonthStr = `${now.getFullYear()}_${now.getMonth() + 1}`;
    const targetStr = `${target}`;

    const key50 = `sales_celebrated_50_${yearMonthStr}_${targetStr}`;
    const key100 = `sales_celebrated_100_${yearMonthStr}_${targetStr}`;

    const celebrated50 = localStorage.getItem(key50) === 'true';
    const celebrated100 = localStorage.getItem(key100) === 'true';

    if (progressPercent >= 100) {
      if (!celebrated100) {
        localStorage.setItem(key100, 'true');
        localStorage.setItem(key50, 'true'); // Satisfy 50% if jumped direct
        
        setActiveCelebrationModal('100');
        setConfettiTriggerCount(prev => prev + 1);

        // Dispatch a custom achievement event to trigger the main App toast infrastructure
        window.dispatchEvent(new CustomEvent('app-add-toast', {
          detail: {
            message: `🏆 ACHIEVEMENT UNLOCKED: 100% Monthly Sales Target met (${formatCurrency(currentMonthSales)} / ${formatCurrency(target)})!`,
            type: 'success'
          }
        }));
      }
    } else if (progressPercent >= 50) {
      if (!celebrated50) {
        localStorage.setItem(key50, 'true');
        
        setActiveCelebrationModal('50');
        setConfettiTriggerCount(prev => prev + 1);

        // Dispatch a custom achievement event to trigger the main App toast infrastructure
        window.dispatchEvent(new CustomEvent('app-add-toast', {
          detail: {
            message: `⚡ ACHIEVEMENT UNLOCKED: 50% Monthly Sales Milestone met (${formatCurrency(currentMonthSales)} / ${formatCurrency(target)})!`,
            type: 'success'
          }
        }));
      }
    }
  }, [progressPercent, target]);

  const handleManualTrigger = (level: '50' | '100') => {
    setActiveCelebrationModal(level);
    setConfettiTriggerCount(prev => prev + 1);

    const message = level === '100'
      ? `🏆 ACHIEVEMENT UNLOCKED: 100% Monthly Sales Target met (${formatCurrency(currentMonthSales)} / ${formatCurrency(target)})!`
      : `⚡ ACHIEVEMENT UNLOCKED: 50% Monthly Sales Milestone met (${formatCurrency(currentMonthSales)} / ${formatCurrency(target)})!`;

    window.dispatchEvent(new CustomEvent('app-add-toast', {
      detail: {
        message,
        type: 'success'
      }
    }));
  };

  const handleStartEdit = () => {
    setTargetInput(target.toString());
    setValidationError('');
    setIsEditing(true);
  };

  const handleSaveEdit = () => {
    const val = parseFloat(targetInput);
    if (isNaN(val) || val <= 0) {
      setValidationError('Please enter a valid positive target amount');
      return;
    }
    if (onUpdateSettings) {
      onUpdateSettings({ monthlySalesTarget: val });
    }
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
  };

  // Preset chips for quick setup
  const quickPresets = [50000, 100000, 250000, 500000, 1000000];

  // Motivational levels
  const milestoneTier = useMemo(() => {
    if (progressPercent >= 100) return 'smashed';
    if (progressPercent >= 75) return 'high';
    if (progressPercent >= 50) return 'mid';
    if (progressPercent >= 25) return 'low';
    return 'starting';
  }, [progressPercent]);

  const motivationData = useMemo(() => {
    switch (milestoneTier) {
      case 'smashed':
        return {
          title: 'Legendary Status Unlocked!',
          subtitle: 'Target absolutely met! The store is in high orbit. Outstanding operational mastery! Let\'s elevate this month into sales history!',
          emoji: '👑',
          color: 'text-amber-500',
          badgeColor: 'bg-amber-500/20 text-amber-500 border border-amber-500/30',
          trackColor: 'from-amber-500 via-yellow-400 to-orange-500',
          glow: 'shadow-[0_0_20px_rgba(245,158,11,0.5)]',
        };
      case 'high':
        return {
          title: 'Almost There! Final Sprint!',
          subtitle: 'You are on the absolute brink of goal conquest. Strike hard! Keep the checkouts running; absolute victory is within touch.',
          emoji: '🔥',
          color: 'text-rose-500',
          badgeColor: 'bg-rose-500/20 text-rose-500 border border-rose-500/30',
          trackColor: 'from-rose-500 to-amber-500',
          glow: 'shadow-[0_0_15px_rgba(239,68,68,0.4)]',
        };
      case 'mid':
        return {
          title: 'Halfway Hero Mark Cleared!',
          subtitle: 'Over 50% conquered! You are proving yourself an outstanding business driver. Sustain the velocity and watch profits multiply.',
          emoji: '⚡',
          color: 'text-indigo-500',
          badgeColor: 'bg-indigo-500/20 text-indigo-500 border border-indigo-500/30',
          trackColor: 'from-indigo-500 to-sky-400',
          glow: 'shadow-[0_0_12px_rgba(99,102,241,0.3)]',
        };
      case 'low':
        return {
          title: 'Quarter Milestone Unlocked!',
          subtitle: 'Gaining real speed! Catalog interest is strong and the checkout metrics show healthy commercial traction. Keep fueling the engine!',
          emoji: '📈',
          color: 'text-emerald-500',
          badgeColor: 'bg-emerald-500/20 text-emerald-500 border border-emerald-500/30',
          trackColor: 'from-emerald-500 to-teal-400',
          glow: 'shadow-[0_0_10px_rgba(16,185,129,0.25)]',
        };
      default:
        return {
          title: 'Goal Established. Igniting Rockets!',
          subtitle: 'Your monthly compass is officially set. Formulate checkout receipts to populate intermediate statistics and conquer this milestone!',
          emoji: '🚀',
          color: 'text-cyan-500',
          badgeColor: 'bg-cyan-500/20 text-cyan-500 border border-cyan-500/30',
          trackColor: 'from-cyan-500 to-blue-500',
          glow: 'shadow-[0_0_8px_rgba(6,182,212,0.2)]',
        };
    }
  }, [milestoneTier]);

  // Theme styling overrides for cohesive system presentation
  const themeStyles = useMemo(() => {
    switch (currentTheme) {
      case 'cyberpunk':
        return {
          cardBg: 'bg-zinc-950/90 border-2 border-pink-500/30 shadow-[0_0_20px_rgba(236,72,153,0.15)] text-sans',
          accentBorder: 'border-cyan-500/30',
          accentColor: 'text-pink-500 font-mono',
          badgeColor: 'bg-pink-500/10 text-pink-400 border border-pink-500/30',
          inputBg: 'bg-black/80 border-2 border-pink-500 text-pink-400 font-mono',
          buttonPrimary: 'bg-pink-600 hover:bg-pink-500 text-white shadow-[0_0_10px_rgba(236,72,153,0.5)] font-bold font-mono',
          presetChip: 'border border-pink-500/30 bg-pink-500/5 text-pink-400 hover:bg-pink-500 hover:text-white',
          titleColor: 'text-pink-500',
          textSub: 'text-zinc-400 font-mono text-[10px]',
          progressBarTrack: 'bg-pink-950/40 border border-pink-500/20',
          milestoneInactive: 'bg-zinc-900 border border-zinc-700 text-zinc-500 font-mono',
          milestoneActive: 'bg-pink-500 border-2 border-pink-300 text-black shadow-[0_0_12px_#ec4899] font-black font-mono',
        };
      case 'luxury_gold':
        return {
          cardBg: 'bg-stone-900 border border-amber-500/20 shadow-2xl text-amber-100',
          accentBorder: 'border-amber-500/15',
          accentColor: 'text-amber-400',
          badgeColor: 'bg-amber-500/15 text-amber-300 border border-amber-500/25',
          inputBg: 'bg-stone-950 border border-amber-500/30 text-amber-300',
          buttonPrimary: 'bg-amber-500 hover:bg-amber-400 text-black font-bold uppercase tracking-wider',
          presetChip: 'border border-amber-500/20 bg-amber-500/5 text-amber-400 hover:bg-amber-500/20',
          titleColor: 'text-amber-400 font-serif',
          textSub: 'text-stone-400',
          progressBarTrack: 'bg-stone-950 border border-amber-500/10',
          milestoneInactive: 'bg-stone-850 border border-stone-700 text-stone-500',
          milestoneActive: 'bg-amber-500 border border-amber-300 text-stone-950 font-black shadow-[0_0_10px_rgba(245,158,11,0.5)]',
        };
      case 'emerald_matrix':
        return {
          cardBg: 'bg-emerald-950/20 border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.1)] text-emerald-100 font-mono',
          accentBorder: 'border-emerald-500/10',
          accentColor: 'text-emerald-400',
          badgeColor: 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20',
          inputBg: 'bg-slate-950 border border-emerald-500/40 text-emerald-300',
          buttonPrimary: 'bg-emerald-600 hover:bg-emerald-500 text-black font-bold',
          presetChip: 'border border-emerald-500/20 bg-emerald-500/5 text-emerald-400 hover:bg-emerald-500/20',
          titleColor: 'text-emerald-400',
          textSub: 'text-emerald-500/70',
          progressBarTrack: 'bg-slate-950 border border-emerald-500/10',
          milestoneInactive: 'bg-slate-900 border border-emerald-500/10 text-emerald-600/50',
          milestoneActive: 'bg-emerald-500 border border-emerald-300 text-slate-950 font-bold shadow-[0_0_10px_rgba(16,185,129,0.6)]',
        };
      case 'glass_modern':
        return {
          cardBg: 'bg-white/5 border border-white/10 shadow-xl backdrop-blur-3xl text-slate-100',
          accentBorder: 'border-white/10',
          accentColor: 'text-purple-400',
          badgeColor: 'bg-purple-500/20 text-purple-200 border border-purple-500/30',
          inputBg: 'bg-slate-900/40 border border-white/20 text-white backdrop-blur-lg',
          buttonPrimary: 'bg-purple-600 hover:bg-purple-500 text-white font-bold',
          presetChip: 'border border-white/10 bg-white/5 text-slate-200 hover:bg-white/15',
          titleColor: 'text-purple-300',
          textSub: 'text-slate-400',
          progressBarTrack: 'bg-black/20 border border-white/5',
          milestoneInactive: 'bg-slate-900 border border-white/5 text-slate-500',
          milestoneActive: 'bg-purple-500 border border-purple-300 text-white shadow-[0_0_10px_rgba(168,85,247,0.4)]',
        };
      case 'emerald-gold':
        return {
          cardBg: 'bg-emerald-950/40 border-2 border-emerald-500/30 text-emerald-50 shadow-xl',
          accentBorder: 'border-emerald-500/25',
          accentColor: 'text-amber-400',
          badgeColor: 'bg-amber-500/15 text-amber-300 border border-amber-500/30',
          inputBg: 'bg-emerald-950 border border-emerald-500/30 text-amber-300',
          buttonPrimary: 'bg-amber-500 hover:bg-amber-400 text-emerald-950 font-bold',
          presetChip: 'border border-emerald-500/20 bg-emerald-500/5 text-emerald-300 hover:bg-emerald-500/20',
          titleColor: 'text-amber-400',
          textSub: 'text-emerald-400/80',
          progressBarTrack: 'bg-emerald-950 border border-emerald-500/20',
          milestoneInactive: 'bg-emerald-900/50 border border-emerald-800 text-emerald-600',
          milestoneActive: 'bg-amber-500 border border-amber-300 text-emerald-950 font-black shadow-[0_0_10px_rgba(245,158,11,0.5)]',
        };
      case 'minimalist-ivory':
        return {
          cardBg: 'bg-[#faf8f2] border-2 border-stone-300 shadow-sm text-[#1c2e24]',
          accentBorder: 'border-stone-300',
          accentColor: 'text-[#2d5a4e] font-black',
          badgeColor: 'bg-stone-200 text-[#1c2e24] border border-stone-300 font-bold',
          inputBg: 'bg-white border-2 border-stone-300 text-[#1c2e24]',
          buttonPrimary: 'bg-[#2d5a4e] hover:bg-[#23473d] text-[#fcfbf7] font-bold shadow-sm',
          presetChip: 'border border-stone-300 bg-stone-100 text-[#1c2e24] font-bold hover:bg-stone-200',
          titleColor: 'text-[#2d5a4e]',
          textSub: 'text-stone-600 font-medium',
          progressBarTrack: 'bg-stone-200/80 border border-stone-300',
          milestoneInactive: 'bg-stone-100 border border-stone-300 text-stone-400',
          milestoneActive: 'bg-[#2d5a4e] border-2 border-[#2d5a4e] text-white font-black shadow-sm',
        };
      case 'neo_brutalist':
        return {
          cardBg: 'bg-white dark:bg-zinc-900 border-4 border-black dark:border-white shadow-[8px_8px_0px_#000000] dark:shadow-[8px_8px_0px_#ffffff] text-zinc-950 dark:text-zinc-50 font-mono',
          accentBorder: 'border-2 border-black dark:border-white',
          accentColor: 'text-zinc-950 dark:text-white font-black',
          badgeColor: 'bg-yellow-400 border-2 border-black text-black font-black',
          inputBg: 'bg-zinc-50 dark:bg-zinc-950 border-3 border-black dark:border-white text-zinc-950 dark:text-white',
          buttonPrimary: 'bg-yellow-400 text-black border-3 border-black text-xs font-black uppercase hover:bg-yellow-300 shadow-[2px_2px_0px_rgba(0,0,0,1)]',
          presetChip: 'border-2 border-black bg-white text-xs font-black text-black hover:bg-zinc-100',
          titleColor: 'text-black dark:text-white font-black uppercase',
          textSub: 'text-zinc-600 dark:text-zinc-400',
          progressBarTrack: 'bg-zinc-100 dark:bg-zinc-800 border-2 border-black dark:border-white',
          milestoneInactive: 'bg-zinc-50 dark:bg-zinc-900 border border-zinc-400 text-zinc-500',
          milestoneActive: 'bg-yellow-400 border-2 border-black text-black font-black',
        };
      case 'retro-blue':
        return {
          cardBg: 'bg-indigo-950/30 border border-indigo-500/25 shadow-2xl text-indigo-100',
          accentBorder: 'border-indigo-500/15',
          accentColor: 'text-indigo-400',
          badgeColor: 'bg-indigo-500/20 text-indigo-200 border border-indigo-500/30',
          inputBg: 'bg-slate-950 border border-indigo-500/35 text-indigo-300',
          buttonPrimary: 'bg-indigo-600 hover:bg-indigo-500 text-white font-bold',
          presetChip: 'border border-indigo-500/20 bg-indigo-500/5 text-indigo-300 hover:bg-indigo-500/20',
          titleColor: 'text-indigo-400',
          textSub: 'text-indigo-400/70',
          progressBarTrack: 'bg-slate-950 border border-indigo-500/15',
          milestoneInactive: 'bg-slate-900 border border-indigo-500/10 text-indigo-500/50',
          milestoneActive: 'bg-indigo-500 border border-indigo-350 text-slate-950 font-black shadow-[0_0_10px_rgba(99,102,241,0.6)]',
        };
      default: // midnight_blue
        return {
          cardBg: 'bg-sky-950/30 border border-sky-500/20 shadow-xl backdrop-blur-xl text-sky-100',
          accentBorder: 'border-sky-500/10',
          accentColor: 'text-sky-400',
          badgeColor: 'bg-sky-500/15 text-sky-300 border border-sky-500/25',
          inputBg: 'bg-slate-950 border border-sky-500/30 text-sky-300',
          buttonPrimary: 'bg-sky-600 hover:bg-sky-500 text-white font-semibold',
          presetChip: 'border border-sky-500/20 bg-sky-500/5 text-sky-400 hover:bg-sky-500/20',
          titleColor: 'text-sky-400',
          textSub: 'text-sky-400/70',
          progressBarTrack: 'bg-slate-950 border border-sky-500/10',
          milestoneInactive: 'bg-slate-900 border border-sky-500/10 text-sky-500/50',
          milestoneActive: 'bg-sky-500 border border-sky-300 text-slate-950 font-bold shadow-[0_0_8px_rgba(56,189,248,0.5)]',
        };
    }
  }, [currentTheme]);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={`relative p-6 rounded-3xl overflow-hidden transition-all duration-300 border mt-2 ${themeStyles.cardBg}`}
    >
      <ThemeVisualEffects theme={currentTheme} disableMovement={true} />
      
      {/* Background radial soft light glow */}
      <div className="absolute top-0 right-0 h-48 w-48 bg-[var(--primary)]/5 rounded-full blur-3xl pointer-events-none z-0" />

      {/* Main Grid: Info + Editor on left/mid, Milestone Badges on right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 relative z-10">
        
        {/* Left 7 Columns: Title, Target Editor, Progress with Glow, and Motivation Text */}
        <div className="lg:col-span-8 flex flex-col justify-between space-y-5">
          
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="text-left space-y-1">
              <span className={`text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 ${themeStyles.titleColor}`}>
                <Target size={13} className="animate-spin-slow" /> {t.monthlySalesTargetTitle || "Monthly Store Compass"}
              </span>
              <h3 className="text-lg font-black tracking-tight uppercase flex items-center gap-1">
                {monthName} {yearName} {t.salesTarget || "Sales Target"}
              </h3>
              <p className={`text-[10px] font-semibold tracking-wide ${themeStyles.textSub}`}>
                {t.monthlySalesTargetDesc || "Direct live calibration based on checkout ledger billing transactions"}
              </p>
            </div>

            {/* In-place Editable Target Area */}
            <AnimatePresence mode="wait">
              {!isEditing ? (
                <motion.div 
                  key="view"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="flex flex-col items-end text-right self-start sm:self-auto"
                >
                  <div className="flex items-center gap-2 group">
                    <span className="text-xs uppercase font-black opacity-40">{t.targetGoal || "Target Goal:"}</span>
                    <span className={`text-xl font-black font-mono select-all ${themeStyles.accentColor}`}>
                      {formatCurrency(target)}
                    </span>
                    <button 
                      onClick={handleStartEdit}
                      title={t.calibrateSalesTarget || "Calibrate Sales Target"}
                      className="p-1 rounded-lg bg-[var(--foreground)]/[0.04] border border-[var(--border)]/[0.4] hover:bg-[var(--primary)]/10 hover:border-[var(--primary)]/45 transition-colors cursor-pointer group-hover:scale-105 active:scale-95"
                    >
                      <Pencil size={11} className={`${themeStyles.titleColor}`} />
                    </button>
                  </div>
                  <span className={`text-[8.5px] font-black font-mono px-1.5 py-0.5 rounded-full mt-1.5 ${themeStyles.badgeColor}`}>
                    ₹ {target.toLocaleString()} {t.limit || "Limit"}
                  </span>
                </motion.div>
              ) : (
                <motion.div 
                  key="edit"
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  className="flex flex-col gap-2 w-full sm:w-auto self-start sm:self-auto text-left"
                >
                  <div className="flex items-center gap-1.5">
                    <input 
                      type="number"
                      value={targetInput}
                      onChange={(e) => setTargetInput(e.target.value)}
                      placeholder="e.g. 150000"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveEdit();
                        if (e.key === 'Escape') handleCancelEdit();
                      }}
                      className={`px-3 py-1 text-sm font-bold font-mono rounded-xl focus:outline-none focus:ring-1.5 focus:ring-[var(--primary)] w-36 ${themeStyles.inputBg}`}
                    />
                    <button 
                      onClick={handleSaveEdit}
                      className="p-1.5 rounded-lg bg-emerald-500 text-white hover:bg-emerald-400 border border-emerald-500/20 shadow-xs cursor-pointer active:scale-90"
                    >
                      <Check size={13} />
                    </button>
                    <button 
                      onClick={handleCancelEdit}
                      className="p-1.5 rounded-lg bg-rose-500 text-white hover:bg-rose-400 border border-rose-500/20 shadow-xs cursor-pointer active:scale-90"
                    >
                      <X size={13} />
                    </button>
                  </div>
                  
                  {validationError && (
                    <span className="text-[10px] text-rose-500 font-extrabold">{validationError}</span>
                  )}

                  {/* Preset chips for rapid target selections */}
                  <div className="flex items-center gap-1 flex-wrap mt-0.5 max-w-[280px]">
                    {quickPresets.map((preset) => (
                      <button
                        key={preset}
                        onClick={() => setTargetInput(preset.toString())}
                        className={`px-1.5 py-0.5 text-[8.5px] font-bold font-mono rounded-lg transition-all border cursor-pointer active:scale-95 ${themeStyles.presetChip}`}
                      >
                        {formatCurrency(preset)}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Premium Progress Bar Section with Indicator Milestones */}
          <div className="space-y-4">
            
            {/* Gauge Header values */}
            <div className="flex items-center justify-between text-left">
              <div className="space-y-0.5">
                <span className="text-[10px] uppercase font-black opacity-45 font-mono block">{t.monthProgress || "Month Progress"}</span>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-black font-mono leading-none tracking-tight">
                    {formatCurrency(currentMonthSales)}
                  </span>
                  <span className="text-xs font-semibold opacity-40">{t.completed || "completed"}</span>
                </div>
              </div>

              {/* Mega Glowing Percentage Indicator */}
              <div className="flex flex-col items-end text-right">
                <motion.div 
                  initial={{ scale: 0.9 }}
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'easeOut' }}
                  className={`text-2xl font-black font-mono leading-none flex items-center gap-1 ${motivationData.color}`}
                >
                  <span>{animatedProgress.toFixed(1)}%</span>
                </motion.div>
                <span className={`text-[8.5px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full mt-1.5 ${motivationData.badgeColor}`}>
                  {motivationData.emoji} {milestoneTier.toUpperCase()} {t.speed || "SPEED"}
                </span>
              </div>
            </div>

            {/* Horizontal Glowing Track */}
            <div className="relative pt-4 pb-2">
              <div className={`h-4.5 rounded-full relative p-0.5 overflow-hidden flex items-center ${themeStyles.progressBarTrack}`}>
                {/* Flowing animated background gradient progress bar */}
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(100, progressPercent)}%` }}
                  transition={{ type: 'spring', stiffness: 50, damping: 15 }}
                  className={`h-full rounded-full bg-gradient-to-r relative ${motivationData.trackColor} ${motivationData.glow}`}
                >
                  {/* Subtle stripes animation effect */}
                  <div 
                    className="absolute inset-0 bg-[linear-gradient(45deg,rgba(255,255,255,0.15)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.15)_50%,rgba(255,255,255,0.15)_75%,transparent_75%,transparent)] bg-[size:16px_16px]" 
                    style={{ animation: 'shimmer-bar 1.5s linear infinite' }}
                  />
                </motion.div>

                {/* Sparkling crown icon hovering at the very end of completed state if goal met */}
                {isGoalMet && (
                  <motion.div 
                    animate={{ y: [-1, 1, -1] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    className="absolute right-2 text-white drop-shadow-[0_0_4px_rgba(255,255,255,0.8)] z-10"
                  >
                    <Sparkles size={11} className="text-amber-300 animate-pulse" />
                  </motion.div>
                )}
              </div>

              {/* Embedded Interactive Tick Anchors */}
              <div className="absolute top-1/2 left-0 right-0 -translate-y-1/2 flex justify-between px-0.5 pointer-events-none z-20">
                {[
                  { pct: 0, label: '0%' },
                  { pct: 25, label: '25%' },
                  { pct: 50, label: '50%' },
                  { pct: 75, label: '75%' },
                  { pct: 100, label: '100%' }
                ].map((marker) => {
                  const isUnlocked = progressPercent >= marker.pct;
                  return (
                    <div key={marker.pct} className="flex flex-col items-center relative gap-4">
                      {/* Round node badge */}
                      <motion.div 
                        initial={false}
                        animate={isUnlocked ? { scale: [1, 1.2, 1] } : {}}
                        className={`w-3.5 h-3.5 rounded-full flex items-center justify-center transition-all ${
                          isUnlocked ? themeStyles.milestoneActive : themeStyles.milestoneInactive
                        }`}
                      >
                        {isUnlocked && marker.pct > 0 ? (
                          <div className="w-1.5 h-1.5 rounded-full bg-white dark:bg-black" />
                        ) : null}
                      </motion.div>
                      
                      {/* Percent labels */}
                      <span className="text-[7.5px] font-black font-mono opacity-50 absolute top-4 leading-none">
                        {marker.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Motivational Encouragement Box */}
          <motion.div 
            key={milestoneTier}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
            className={`p-3.5 rounded-2xl flex items-start gap-3 border text-left bg-[var(--foreground)]/[0.02] ${themeStyles.accentBorder}`}
          >
            <div className={`h-8 w-8 shrink-0 rounded-xl flex items-center justify-center text-base ${motivationData.badgeColor}`}>
              <span>{motivationData.emoji}</span>
            </div>
            <div className="space-y-0.5">
              <h4 className={`text-[11px] font-black uppercase tracking-tight ${motivationData.color}`}>
                {motivationData.title}
              </h4>
              <p className={`text-[10px] font-bold leading-normal uppercase tracking-wider opacity-60 ${themeStyles.textSub}`}>
                {motivationData.subtitle}
              </p>
            </div>
          </motion.div>

        </div>

        {/* Right 4 Columns: Rich Analytics Projection & Live Badges */}
        <div className={`lg:col-span-4 p-4.5 rounded-2xl flex flex-col justify-between space-y-4 border bg-[var(--foreground)]/[0.015] text-left ${themeStyles.accentBorder}`}>
          
          {/* Header */}
          <div className="text-left space-y-0.5">
            <span className={`text-[8.5px] font-black uppercase tracking-widest block opacity-40 font-mono`}>{t.realTimeTelemetry || "REAL-TIME TELEMETRY"}</span>
            <h4 className="text-[11px] font-black uppercase tracking-tight flex items-center gap-1.5">
              <TrendingUp size={12} className={themeStyles.titleColor} /> {t.liveIntelligenceAnalytics || "Live Intelligence Analytics"}
            </h4>
          </div>

          {/* Mini-Stats Grid */}
          <div className="grid grid-cols-1 gap-2.5">
            
            {/* Metric 1: Remaining sales */}
            <div className="bg-[var(--foreground)]/[0.02] p-2.5 rounded-xl border border-[var(--border)]/[0.25] flex justify-between items-center h-12">
              <div className="text-left leading-none space-y-1">
                <span className="text-[8px] font-black uppercase tracking-wider opacity-45 block font-mono">{t.remainingGap || "REMAINING GAP"}</span>
                <span className={`text-[9.5px] font-black uppercase block ${isGoalMet ? 'text-emerald-500' : ''}`}>
                  {isGoalMet ? (t.targetConquered || "Target Conquered") : (t.deficitLeft || "Deficit Left")}
                </span>
              </div>
              <div className="text-right leading-none">
                <span className={`text-xs font-black font-mono block ${isGoalMet ? 'text-emerald-500' : themeStyles.accentColor}`}>
                  {isGoalMet ? '₹0' : formatCurrency(salesRemaining)}
                </span>
                {!isGoalMet && (
                  <span className="text-[7.5px] font-semibold opacity-40 uppercase tracking-wild font-mono mt-0.5 block">
                    {t.toHoldLimit || "to hold limit"}
                  </span>
                )}
              </div>
            </div>

            {/* Metric 2: Average daily volume required */}
            <div className="bg-[var(--foreground)]/[0.02] p-2.5 rounded-xl border border-[var(--border)]/[0.25] flex justify-between items-center h-12">
              <div className="text-left leading-none space-y-1">
                <span className="text-[8px] font-black uppercase tracking-wider opacity-45 block font-mono">{t.dailyVelocityReq || "DAILY VELOCITY REQ."}</span>
                <span className="text-[9.5px] font-black uppercase block text-[var(--foreground)]/70">
                  {daysLeft} {t.salesDaysLeft || "Sales days left"}
                </span>
              </div>
              <div className="text-right leading-none">
                <span className="text-xs font-black font-mono block text-[var(--foreground)]">
                  {isGoalMet ? formatCurrency(0) : formatCurrency(dailyRequired)}
                </span>
                <span className="text-[7.5px] font-semibold opacity-40 uppercase tracking-wild font-mono mt-0.5 block">
                  {t.perDayPace || "per day pace"}
                </span>
              </div>
            </div>

            {/* Metric 3: Projected Sales */}
            <div className="bg-[var(--foreground)]/[0.02] p-2.5 rounded-xl border border-[var(--border)]/[0.25] flex justify-between items-center h-12">
              <div className="text-left leading-none space-y-1">
                <span className="text-[8px] font-black uppercase tracking-wider opacity-45 block font-mono">{t.projectedStatement || "PROJECTED STATEMENT"}</span>
                <span className="text-[9.5px] font-black uppercase block text-[var(--foreground)]/70">
                  {t.closingTrajectory || "Closing Trajectory"}
                </span>
              </div>
              <div className="text-right leading-none">
                <span className={`text-xs font-black font-mono block ${projectedSales >= target ? 'text-emerald-500' : 'text-amber-500'}`}>
                  {formatCurrency(projectedSales)}
                </span>
                <span className="text-[7.5px] font-semibold opacity-40 uppercase tracking-wild font-mono mt-0.5 block">
                  {t.estimatedTotal || "estimated total"}
                </span>
              </div>
            </div>

          </div>

          {/* Gamified Achievements Progress */}
          <div className="space-y-2 pt-1 border-t border-[var(--border)]/15">
            <span className="text-[8px] font-black uppercase tracking-widest block opacity-45 font-mono">{t.intermediateBadges || "INTERMEDIATE BADGES"}</span>
            
            <div className="grid grid-cols-4 gap-1.5">
              {[
                { threshold: 25, name: 'Bronze Spark', emoji: '🥉', desc: 'Reach 25% target', unlocked: progressPercent >= 25 },
                { threshold: 50, name: 'Silver Velocity', emoji: '🥈', desc: 'Reach 50% target', unlocked: progressPercent >= 50 },
                { threshold: 75, name: 'Gilded Rocket', emoji: '🚀', desc: 'Reach 75% target', unlocked: progressPercent >= 75 },
                { threshold: 100, name: 'Crown Sovereign', emoji: '👑', unlocked: progressPercent >= 100 }
              ].map((badge, idx) => {
                return (
                  <motion.div
                    key={badge.threshold}
                    whileHover={badge.unlocked ? { y: -4, scale: 1.08, rotate: [0, -2, 2, 0] } : {}}
                    onClick={() => {
                      if (!badge.unlocked) return;
                      if (badge.threshold === 100) {
                        handleManualTrigger('100');
                      } else if (badge.threshold === 50) {
                        handleManualTrigger('50');
                      } else {
                        setConfettiTriggerCount(prev => prev + 1);
                      }
                    }}
                    title={badge.unlocked ? `Click to replay ${badge.name} celebration! 🎯` : `${badge.desc || 'Locked'}`}
                    className={`p-1 rounded-xl border flex flex-col items-center justify-center text-center transition-all aspect-square min-h-[60px] relative select-none ${
                      badge.unlocked 
                        ? 'bg-gradient-to-b from-white/5 to-[var(--primary)]/[0.05] border-[var(--primary)]/30 hover:border-[var(--primary)]/75 shadow-sm cursor-pointer shadow-[0_2px_8px_rgba(var(--primary-rgb),0.1)]' 
                        : 'bg-zinc-900/10 border-transparent opacity-40 cursor-not-allowed'
                    }`}
                  >
                    <span className="text-sm block">{badge.emoji}</span>
                    <span className="text-[7px] font-extrabold uppercase mt-1 tracking-tight leading-none truncate max-w-[55px]">
                      {badge.name || 'Crown'}
                    </span>
                    
                    {/* Tiny padlock if locked */}
                    {!badge.unlocked && (
                      <div className="absolute top-1 right-1 text-[8px] text-[var(--foreground)]/30">
                        <Lock size={7} />
                      </div>
                    )}
                    {badge.unlocked && (
                      <div className="absolute top-1 right-1 text-[8px] text-emerald-500 animate-pulse">
                        <Smile size={7} />
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </div>

        </div>

      </div>

      {/* Automatic/Manual Confetti Sparks Generator */}
      <ConfettiEffect triggerCount={confettiTriggerCount} />

      {/* Animated Epic Milestone Victory Modal */}
      <AnimatePresence>
        {activeCelebrationModal !== 'none' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/75 backdrop-blur-md z-[9999] flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, y: 30, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.9, y: 30, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className={`w-full max-w-md rounded-3xl p-6 border-2 relative overflow-hidden text-center shadow-2xl ${
                currentTheme === 'cyberpunk'
                  ? 'bg-zinc-950 border-pink-500 shadow-[0_0_50px_rgba(236,72,153,0.3)] text-pink-400 font-mono'
                  : currentTheme === 'luxury_gold'
                  ? 'bg-stone-900 border-amber-500 text-amber-100 font-sans shadow-[0_0_40px_rgba(245,158,11,0.25)]'
                  : currentTheme === 'emerald_matrix'
                  ? 'bg-slate-950 border-emerald-500 font-mono text-emerald-300 shadow-[0_0_30px_rgba(16,185,129,0.25)]'
                  : currentTheme === 'glass_modern'
                  ? 'bg-slate-900/95 border-purple-500/40 text-purple-100 backdrop-blur-2xl shadow-[0_0_40px_rgba(168,85,247,0.2)]'
                  : currentTheme === 'emerald-gold'
                  ? 'bg-emerald-950 border-amber-400 text-emerald-50'
                  : currentTheme === 'minimalist-ivory'
                  ? 'bg-gradient-to-b from-[#faf8f2] via-[#f5f2ea] to-[#eeeae0] border-2 border-stone-300 text-[#1c2e24]'
                  : currentTheme === 'neo_brutalist'
                  ? 'bg-yellow-400 border-4 border-black shadow-[10px_10px_0px_#000000] text-black font-mono'
                  : currentTheme === 'retro-blue'
                  ? 'bg-indigo-950 border-indigo-400 text-indigo-50 shadow-[0_0_30px_rgba(99,102,241,0.2)]'
                  : 'bg-slate-900 border-sky-500 text-sky-50 shadow-[0_0_30px_rgba(56,189,248,0.2)]'
              }`}
            >
              {/* Overlay radial soft backdrop light */}
              <div className="absolute inset-0 bg-radial-gradient from-transparent to-black/25 pointer-events-none" />

              {/* Glowing Top Trophy Decoration */}
              <div className="flex justify-center mb-4">
                <motion.div 
                  animate={{ rotate: [0, -8, 8, -8, 8, 0], scale: [1, 1.08, 1] }}
                  transition={{ duration: 1.8, repeat: Infinity, repeatDelay: 1.5 }}
                  className={`p-4 rounded-full border-2 ${
                    currentTheme === 'minimalist-ivory'
                      ? 'bg-[#2d5a4e]/10 border-[#2d5a4e]/30 text-[#2d5a4e]'
                      : currentTheme === 'neo_brutalist'
                      ? 'bg-white border-2 border-black text-black'
                      : activeCelebrationModal === '100' 
                      ? 'bg-amber-500/20 border-amber-400 text-amber-300' 
                      : 'bg-indigo-500/20 border-indigo-400 text-indigo-300'
                  }`}
                >
                  {activeCelebrationModal === '100' ? (
                    <Trophy size={36} className="animate-pulse" />
                  ) : (
                    <Award size={36} className="animate-pulse" />
                  )}
                </motion.div>
              </div>

              {/* Performance category ribbon */}
              <span className={`text-[9px] font-black uppercase tracking-[0.25em] px-3 py-1 rounded-full ${
                currentTheme === 'minimalist-ivory'
                  ? (activeCelebrationModal === '100' ? 'bg-amber-100 text-amber-900 border border-amber-300 font-extrabold' : 'bg-stone-200 text-[#1c2e24] border border-stone-300 font-extrabold')
                  : currentTheme === 'neo_brutalist'
                  ? 'bg-white border-2 border-black text-black font-black'
                  : activeCelebrationModal === '100'
                  ? 'bg-amber-500/25 text-amber-300 border border-amber-500/35'
                  : 'bg-indigo-500/25 text-indigo-300 border border-indigo-500/35'
              }`}>
                {activeCelebrationModal === '100' ? '🏆 TARGET SMASHED!' : '⚡ 50% MILESTONE MET!'}
              </span>

              {/* Title heading */}
              <h3 className={`text-xl sm:text-2xl font-black uppercase tracking-tight mt-5 mb-2 ${
                currentTheme === 'neo_brutalist' 
                  ? 'text-black' 
                  : currentTheme === 'minimalist-ivory' 
                  ? 'text-[#1c2e24]' 
                  : 'text-white'
              }`}>
                {activeCelebrationModal === '100' 
                  ? 'Legendary Store Conquest!' 
                  : 'Halfway Mark Cleared!'}
              </h3>

              {/* Text description */}
              <p className={`text-xs mt-2 leading-relaxed max-w-xs mx-auto ${
                currentTheme === 'neo_brutalist' 
                  ? 'text-zinc-800 font-bold' 
                  : currentTheme === 'minimalist-ivory' 
                  ? 'text-[#1c2e24]/85 font-medium' 
                  : 'text-zinc-300 opacity-90'
              }`}>
                {activeCelebrationModal === '100'
                  ? `Incredible! Your live cashier sales volume for ${monthName} successfully conquered and bypassed your set target limit of ${formatCurrency(target)}. Live metrics are now in high orbit!`
                  : `Terrific velocity! You have official processed over 50% of your ${formatCurrency(target)} store sales target for ${monthName}. Maintain standard operations to conquer total milestone glory.`}
              </p>

              {/* Dynamic metrics reading box */}
              <div className={`my-4.5 p-3.5 rounded-2xl border text-xs flex flex-col gap-2 ${
                currentTheme === 'neo_brutalist' 
                  ? 'border-2 border-black text-black bg-white/60 font-bold' 
                  : currentTheme === 'minimalist-ivory'
                  ? 'border-2 border-stone-300 text-[#1c2e24] bg-white/90 shadow-sm'
                  : 'border-white/10 text-white bg-black/30'
              }`}>
                <div className="flex justify-between items-center text-left">
                  <span className={`text-[9.5px] uppercase font-black ${
                    currentTheme === 'minimalist-ivory' ? 'text-[#1c2e24]/60' : currentTheme === 'neo_brutalist' ? 'text-zinc-700' : 'text-white/60'
                  }`}>Calendar Rank</span>
                  <span className="font-extrabold font-mono">{monthName} {yearName}</span>
                </div>
                <div className="flex justify-between items-center text-left">
                  <span className={`text-[9.5px] uppercase font-black ${
                    currentTheme === 'minimalist-ivory' ? 'text-[#1c2e24]/60' : currentTheme === 'neo_brutalist' ? 'text-zinc-700' : 'text-white/60'
                  }`}>Ledger Cash Completed</span>
                  <span className="font-black font-mono text-emerald-600 dark:text-emerald-400">{formatCurrency(currentMonthSales)}</span>
                </div>
                <div className="flex justify-between items-center text-left">
                  <span className={`text-[9.5px] uppercase font-black ${
                    currentTheme === 'minimalist-ivory' ? 'text-[#1c2e24]/60' : currentTheme === 'neo_brutalist' ? 'text-zinc-700' : 'text-white/60'
                  }`}>Target Accomplished</span>
                  <span className={`font-black font-mono ${
                    activeCelebrationModal === '100' 
                      ? (currentTheme === 'minimalist-ivory' ? 'text-amber-700 font-extrabold' : 'text-amber-400')
                      : (currentTheme === 'minimalist-ivory' ? 'text-[#2d5a4e] font-extrabold' : 'text-indigo-400')
                  }`}>{progressPercent.toFixed(1)}%</span>
                </div>
                {activeCelebrationModal === '50' && (
                  <div className={`flex justify-between items-center text-left border-t pt-1.5 mt-0.5 ${
                    currentTheme === 'minimalist-ivory' ? 'border-stone-200' : currentTheme === 'neo_brutalist' ? 'border-black/20' : 'border-white/10'
                  }`}>
                    <span className={`text-[9.5px] uppercase font-black ${
                      currentTheme === 'minimalist-ivory' ? 'text-[#1c2e24]/60' : currentTheme === 'neo_brutalist' ? 'text-zinc-700' : 'text-white/60'
                    }`}>Remaining Target Gap</span>
                    <span className="font-extrabold font-mono text-rose-600 dark:text-rose-400">{formatCurrency(salesRemaining)}</span>
                  </div>
                )}
              </div>

              {/* Trigger Buttons */}
              <div className="flex flex-col sm:flex-row gap-2.5 mt-5">
                <button
                  id="replay-sales-target-confetti-btn"
                  type="button"
                  onClick={() => setConfettiTriggerCount(prev => prev + 1)}
                  className={`flex-1 py-2.5 rounded-xl text-[10px] font-mono font-black uppercase flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 transition-all shadow-md ${
                    currentTheme === 'neo_brutalist'
                      ? 'bg-amber-400 hover:bg-amber-300 text-black border-2 border-black shadow-[3px_3px_0px_#000]'
                      : currentTheme === 'minimalist-ivory'
                      ? 'bg-[#2d5a4e] hover:bg-[#23473d] text-[#fcfbf7] font-black border-transparent shadow-md shadow-[#2d5a4e]/20'
                      : activeCelebrationModal === '100'
                      ? 'bg-amber-600 hover:bg-amber-500 text-white'
                      : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                  }`}
                >
                  <Play size={12} className="shrink-0" /> Replay Confetti 🎉
                </button>
                <button
                  id="continue-sales-target-celebration-btn"
                  type="button"
                  onClick={() => setActiveCelebrationModal('none')}
                  className={`flex-1 py-2.5 rounded-xl text-[10px] font-mono font-black uppercase border cursor-pointer active:scale-95 transition-all ${
                    currentTheme === 'neo_brutalist' 
                      ? 'border-2 border-black text-black bg-zinc-100 hover:bg-zinc-200 shadow-[3px_3px_0px_#000]'
                      : currentTheme === 'minimalist-ivory'
                      ? 'border-2 border-stone-300 text-[#1c2e24] bg-stone-200 hover:bg-stone-300 font-extrabold shadow-xs'
                      : 'border-white/20 text-white hover:bg-white/10'
                  }`}
                >
                  <CheckCircle size={12} className="inline mr-1" /> Continue
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Styled inline style overrides for smooth progress track wave shimmering animation */}
      <style>{`
        @keyframes shimmer-bar {
          0% { background-position: 0 0; }
          100% { background-position: 32px 0; }
        }
        .animate-spin-slow {
          animation: spin 8s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </motion.div>
  );
}
