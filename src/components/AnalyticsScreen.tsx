import React, { useState, useMemo, useEffect } from 'react';
import { 
  TrendingUp, ArrowUpRight, ArrowDownRight, DollarSign, Receipt, 
  Percent, ShoppingCart, Info, Activity, Warehouse, Printer,
  Calendar, Layers, CheckCircle2, AlertTriangle, SlidersHorizontal, Package2, ShieldAlert
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { AppState, Bill, Item, TransactionItem, UnbilledEntry } from '../types';

import MilestonesTab from './MilestonesTab';
import { Trophy, Award, Sparkles, Unlock, Lock } from 'lucide-react';
import { getCalculatedAchievements } from '../lib/achievementUtils';
import PremiumInteractiveChart from './PremiumInteractiveChart';
import { ThemeVisualEffects } from './ThemeVisualEffects';
import { MonthlySalesTargetPanel } from './MonthlySalesTargetPanel';
import { UnbilledAuditAnalyticsSection } from './UnbilledAuditAnalyticsSection';
import { calculateBillProfit, parseTimestamp } from '../lib/utils';
import { getUnbilledEntries, UNBILLED_UPDATED_EVENT } from '../lib/unbilledStorage';

interface AnalyticsScreenProps {
  state: AppState;
  t: any;
  onUpdateSettings?: (updates: Partial<AppState['settings']>) => void;
  isLocked?: boolean;
  onUnlock?: () => void;
}

interface ChartBucket {
  label: string;
  subLabel?: string;
  fullLabel: string;
  sales: number;
  profit: number;
  bills: number;
}

// Custom animated counter using requestAnimationFrame with quadratic ease-out
function AnimatedNumber({ value, formatter }: { value: number; formatter?: (v: number) => string }) {
  const numVal = Number(value);
  const safeVal = Number.isFinite(numVal) ? numVal : 0;
  const [displayValue, setDisplayValue] = useState(safeVal);
  const prevValueRef = React.useRef(safeVal);

  useEffect(() => {
    const startValue = prevValueRef.current;
    const endValue = safeVal;
    if (startValue === endValue) return;

    const startTime = performance.now();
    const duration = 280; // Snappy micro duration for extremely responsive UI
    let rAF: number;

    const update = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Easing: easeOutQuad
      const ease = progress * (2 - progress);
      const current = startValue + (endValue - startValue) * ease;
      setDisplayValue(current);

      if (progress < 1) {
        rAF = requestAnimationFrame(update);
      } else {
        setDisplayValue(endValue);
        prevValueRef.current = endValue;
      }
    };

    rAF = requestAnimationFrame(update);
    return () => {
      cancelAnimationFrame(rAF);
      prevValueRef.current = endValue;
    };
  }, [safeVal]);

  const finalVal = (typeof displayValue === 'number' && !isNaN(displayValue)) ? displayValue : 0;
  return <span>{formatter ? formatter(finalVal) : Math.round(finalVal).toLocaleString()}</span>;
}

// Utility to calculate local date bounds for current and previous intervals
const getDateBounds = (period: 'today' | 'week' | 'month' | 'year' | 'all') => {
  const now = new Date();
  let currentStart = new Date();
  let prevStart = new Date();
  let prevEnd = new Date();

  // Reset to midnight for clean bounds calculations
  const formatMidnight = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

  if (period === 'all') {
    currentStart = new Date(0);
    prevStart = new Date(0);
    prevEnd = new Date(0);
  } else if (period === 'today') {
    currentStart = formatMidnight(now);
    prevStart = new Date(currentStart.getTime() - 24 * 60 * 60 * 1000);
    prevEnd = currentStart;
  } else if (period === 'week') {
    const dayOfWeek = now.getDay();
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    currentStart = formatMidnight(new Date(now.getFullYear(), now.getMonth(), now.getDate() + diffToMonday));
    prevStart = new Date(currentStart.getTime() - 7 * 24 * 60 * 60 * 1000);
    prevEnd = currentStart;
  } else if (period === 'month') {
    currentStart = new Date(now.getFullYear(), now.getMonth(), 1);
    prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    prevEnd = currentStart;
  } else if (period === 'year') {
    currentStart = new Date(now.getFullYear(), 0, 1);
    prevStart = new Date(now.getFullYear() - 1, 0, 1);
    prevEnd = currentStart;
  }

  return { currentStart, prevStart, prevEnd };
};

// Calculate cost of goods and margin of a single bill
const getBillProfit = (bill: Bill, itemsCatalog?: Item[]) => {
  return calculateBillProfit(bill, itemsCatalog);
};

// Map themes to highly elegant chart configurations with premium glowing color-spaces
const getThemeChartColors = (theme: string) => {
  switch (theme) {
    case 'neo_brutalist':
      return {
        gridColor: 'rgba(0, 0, 0, 0.05)',
        gridDash: '4,4',
        sales: { stroke: '#0f172a', fill: 'rgba(15, 23, 42, 0.03)', strokeWidth: 2.5 },
        profit: { stroke: '#10b981', fill: 'rgba(16, 185, 129, 0.02)', strokeWidth: 2 },
        axisText: '#4b5563',
        cardBorder: 'border border-zinc-200 dark:border-zinc-800'
      };
    case 'emerald_matrix':
      return {
        gridColor: 'rgba(16, 185, 129, 0.12)',
        gridDash: '3,3',
        sales: { stroke: '#10b981', fill: 'rgba(16, 185, 129, 0.08)', strokeWidth: 2.5 },
        profit: { stroke: '#06b6d4', fill: 'rgba(6, 182, 212, 0.05)', strokeWidth: 2 },
        axisText: '#10b981',
        cardBorder: 'border border-[#10b981]/30'
      };
    case 'luxury_gold':
      return {
        gridColor: 'rgba(245, 158, 11, 0.12)',
        gridDash: '4,4',
        sales: { stroke: '#fbbf24', fill: 'rgba(251, 191, 36, 0.08)', strokeWidth: 2.5 },
        profit: { stroke: '#ffffff', fill: 'rgba(255, 255, 255, 0.04)', strokeWidth: 2 },
        axisText: '#fef3c7',
        cardBorder: 'border border-amber-500/20'
      };
    case 'glass_modern':
      return {
        gridColor: 'rgba(255, 255, 255, 0.05)',
        gridDash: '3,3',
        sales: { stroke: '#a855f7', fill: 'rgba(168, 85, 247, 0.08)', strokeWidth: 2.5 },
        profit: { stroke: '#f43f5e', fill: 'rgba(244, 63, 94, 0.04)', strokeWidth: 2 },
        axisText: '#cbd5e1',
        cardBorder: 'border border-white/10'
      };
    case 'cyberpunk':
      return {
        gridColor: 'rgba(6, 182, 212, 0.16)',
        gridDash: '2,2',
        sales: { stroke: '#ec4899', fill: 'rgba(236, 72, 153, 0.08)', strokeWidth: 3 },
        profit: { stroke: '#06b6d4', fill: 'rgba(6, 182, 212, 0.04)', strokeWidth: 2.5 },
        axisText: '#22d3ee',
        cardBorder: 'border border-[#06b6d4]/40 shadow-[0_0_15px_rgba(236,72,153,0.15)]'
      };
    case 'retro-blue':
      return {
        gridColor: 'rgba(139, 92, 246, 0.12)',
        gridDash: '4,4',
        sales: { stroke: '#4f46e5', fill: 'rgba(79, 70, 229, 0.08)', strokeWidth: 2.5 },
        profit: { stroke: '#d946ef', fill: 'rgba(217, 70, 239, 0.04)', strokeWidth: 2 },
        axisText: '#e0e7ff',
        cardBorder: 'border border-indigo-500/25'
      };
    case 'emerald-gold':
      return {
        gridColor: 'rgba(16, 185, 129, 0.12)',
        gridDash: '3,3',
        sales: { stroke: '#10b981', fill: 'rgba(16, 185, 129, 0.08)', strokeWidth: 2.5 },
        profit: { stroke: '#fbbf24', fill: 'rgba(251, 191, 36, 0.04)', strokeWidth: 2 },
        axisText: '#d1fae5',
        cardBorder: 'border border-emerald-500/30'
      };
    case 'minimalist-ivory':
      return {
        gridColor: 'rgba(45, 90, 78, 0.08)',
        gridDash: '4,4',
        sales: { stroke: '#2d5a4e', fill: 'rgba(45, 90, 78, 0.04)', strokeWidth: 2.5 },
        profit: { stroke: '#8c7853', fill: 'rgba(140, 120, 83, 0.02)', strokeWidth: 2 },
        axisText: '#2d5a4e',
        cardBorder: 'border border-stone-250 shadow-sm'
      };
    case 'midnight_blue':
    default:
      return {
        gridColor: 'rgba(255, 255, 255, 0.04)',
        gridDash: '4,4',
        sales: { stroke: '#3b82f6', fill: 'rgba(59, 130, 246, 0.08)', strokeWidth: 2.5 },
        profit: { stroke: '#10b981', fill: 'rgba(16, 185, 129, 0.04)', strokeWidth: 2 },
        axisText: '#cbd5e1',
        cardBorder: 'border border-[var(--border)]'
      };
  }
};

// Map themes to immersive futuristic container background and visual styles for the graph section
const getThemeContainerStyle = (theme: string) => {
  switch (theme) {
    case 'neo_brutalist':
      return {
        cardBg: 'bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-850 shadow-sm text-zinc-900 dark:text-zinc-50 rounded-[2.5rem]',
        headerBorder: 'border-b border-zinc-100 dark:border-zinc-800',
        chartBg: 'bg-zinc-50/50 dark:bg-zinc-950/20 border border-zinc-200/80 dark:border-zinc-800/60 rounded-3xl',
        legendBg: 'bg-white/80 dark:bg-zinc-900/80 border border-zinc-200/80 dark:border-zinc-850/80 backdrop-blur-md',
        glowGradient: 'from-zinc-500/5 to-transparent',
        accentText: 'text-zinc-900 dark:text-zinc-100',
        hudBg: 'bg-white/95 dark:bg-zinc-950/95 border border-zinc-300 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-xl',
        panelTitle: 'Financial Overview'
      };
    case 'emerald_matrix':
      return {
        cardBg: 'bg-emerald-950/30 border border-emerald-500/15 shadow-xl backdrop-blur-xl text-emerald-100 rounded-[2.5rem]',
        headerBorder: 'border-b border-emerald-500/10',
        chartBg: 'bg-emerald-950/10 border border-emerald-500/10 rounded-3xl',
        legendBg: 'bg-emerald-950/40 border border-emerald-500/10 shadow-sm backdrop-blur-md',
        glowGradient: 'from-[#10b981]/10 to-transparent',
        accentText: 'text-emerald-400',
        hudBg: 'bg-slate-950/95 border border-emerald-500/30 text-white shadow-2xl',
        panelTitle: 'Growth Ledger'
      };
    case 'luxury_gold':
      return {
        cardBg: 'bg-stone-900 border border-amber-500/15 shadow-2xl rounded-[2.5rem] text-amber-100',
        headerBorder: 'border-b border-amber-500/10',
        chartBg: 'bg-stone-950 border border-amber-500/10 rounded-3xl',
        legendBg: 'bg-stone-900/80 border border-amber-500/15 shadow-sm backdrop-blur-md',
        glowGradient: 'from-amber-500/10 to-transparent',
        accentText: 'text-amber-400',
        hudBg: 'bg-stone-950 border border-amber-500/25 text-white shadow-2xl',
        panelTitle: 'Executive Statement'
      };
    case 'glass_modern':
      return {
        cardBg: 'bg-white/5 dark:bg-white/5 border border-white/10 shadow-xl backdrop-blur-3xl text-slate-100 rounded-[2.5rem]',
        headerBorder: 'border-b border-white/10',
        chartBg: 'bg-white/[0.02] border border-white/5 shadow-inner rounded-3xl',
        legendBg: 'bg-white/5 border border-white/10 shadow-inner backdrop-blur-md rounded-2xl',
        glowGradient: 'from-purple-500/10 to-transparent',
        accentText: 'text-purple-300',
        hudBg: 'bg-slate-950/98 border border-purple-500/30 text-white shadow-2xl',
        panelTitle: 'Performance Ledger'
      };
    case 'cyberpunk':
      return {
        cardBg: 'bg-zinc-950/40 border border-cyan-500/20 shadow-[0_0_20px_rgba(236,72,153,0.1)] text-cyan-100 rounded-[2.5rem] backdrop-blur-2xl relative overflow-hidden',
        headerBorder: 'border-b border-pink-500/15',
        chartBg: 'bg-slate-950/40 border border-cyan-500/15 shadow-[inset_0_2px_12px_rgba(6,182,212,0.06)] rounded-3xl',
        legendBg: 'bg-black/80 border border-pink-500/35 shadow-[0_0_15px_rgba(236,72,153,0.2)] backdrop-blur-lg rounded-2xl',
        glowGradient: 'from-pink-500/10 via-transparent to-cyan-500/10',
        accentText: 'text-cyan-400 drop-shadow-[0_0_8px_rgba(6,182,212,0.8)] font-black uppercase tracking-widest',
        hudBg: 'bg-slate-950/98 border border-pink-500/40 text-pink-100 shadow-[0_0_35px_rgba(236,72,153,0.25)]',
        panelTitle: 'Cybernetic Revenue Core'
      };
    case 'retro-blue':
      return {
        cardBg: 'bg-[#03001e]/80 border border-indigo-500/15 shadow-2xl rounded-[2.5rem] backdrop-blur-3xl text-indigo-50',
        headerBorder: 'border-b border-indigo-500/10',
        chartBg: 'bg-indigo-950/20 border border-indigo-500/10 rounded-3xl',
        legendBg: 'bg-slate-950/90 border border-purple-500/20 shadow-lg backdrop-blur-md rounded-2xl',
        glowGradient: 'from-indigo-600/15 via-transparent to-purple-600/15',
        accentText: 'text-purple-400 drop-shadow-[0_0_6px_rgba(168,85,247,0.5)]',
        hudBg: 'bg-indigo-950/95 border border-indigo-500/30 text-indigo-100 shadow-xl',
        panelTitle: 'Decade Cosmos Ledger'
      };
    case 'emerald-gold':
      return {
        cardBg: 'bg-[#021f18]/80 border border-emerald-500/15 shadow-2xl rounded-[2.5rem] backdrop-blur-3xl text-emerald-100',
        headerBorder: 'border-b border-emerald-500/10',
        chartBg: 'bg-emerald-950/20 border border-emerald-500/10 rounded-3xl',
        legendBg: 'bg-emerald-950/90 border border-amber-500/20 shadow-lg backdrop-blur-md rounded-2xl',
        glowGradient: 'from-emerald-600/10 via-transparent to-amber-600/10',
        accentText: 'text-amber-400 drop-shadow-[0_0_6px_rgba(245,158,11,0.5)]',
        hudBg: 'bg-emerald-950/95 border border-emerald-500/30 text-emerald-100 shadow-xl',
        panelTitle: 'Botanical Trust Valuation'
      };
    case 'minimalist-ivory':
      return {
        cardBg: 'bg-[#fdfcf7] border border-stone-300 shadow-md rounded-[2.5rem] text-stone-900',
        headerBorder: 'border-b border-stone-200',
        chartBg: 'bg-stone-100/50 border border-stone-200 rounded-3xl',
        legendBg: 'bg-white border border-stone-250 shadow-sm rounded-2xl',
        glowGradient: 'from-stone-200/5 to-transparent',
        accentText: 'text-stone-800 font-extrabold',
        hudBg: 'bg-[#f8f6f0] border border-stone-300 text-stone-900 shadow-md',
        panelTitle: 'Classic Ledger Report'
      };
    case 'midnight_blue':
    default:
      return {
        cardBg: 'bg-[#0a0f1d] border border-blue-500/10 shadow-3xl text-slate-100 rounded-[2.5rem]',
        headerBorder: 'border-b border-blue-500/5',
        chartBg: 'bg-[#050811] border border-blue-500/10 shadow-inner rounded-3xl',
        legendBg: 'bg-[#0d1527]/80 border border-blue-500/10 shadow-sm backdrop-blur-md rounded-2xl',
        glowGradient: 'from-blue-600/10 to-transparent',
        accentText: 'text-blue-400',
        hudBg: 'bg-slate-950/98 border border-blue-500/20 text-slate-100 shadow-2xl',
        panelTitle: 'Executive Summary'
      };
  }
};



export default function AnalyticsScreen({ state, t, onUpdateSettings, isLocked, onUnlock }: AnalyticsScreenProps) {
  const [activeSubTab, setActiveSubTab] = useState<'reports' | 'milestones'>('reports');

  const unlockedCount = useMemo(() => {
    try {
      const { milestones } = getCalculatedAchievements(state);
      return milestones.filter(m => m.isUnlocked).length;
    } catch (e) {
      return 0;
    }
  }, [state]);
  const [timePeriod, setTimePeriodState] = useState<'today' | 'week' | 'month' | 'year' | 'all'>(() => {
    try {
      const cached = localStorage.getItem('analytics_time_period');
      if (cached === 'today' || cached === 'week' || cached === 'month' || cached === 'year' || cached === 'all') {
        return cached as any;
      }
    } catch (e) {
      // Storage access disabled
    }
    return 'month';
  });

  const setTimePeriod = (period: 'today' | 'week' | 'month' | 'year' | 'all') => {
    try {
      localStorage.setItem('analytics_time_period', period);
    } catch (e) {
      // Storage access disabled
    }
    setTimePeriodState(period);
  };



  // Extract raw bills safely
  const rawBills = useMemo(() => state.bills || [], [state.bills]);

  // Real-time local unbilled micro-sales entries state
  const [localUnbilled, setLocalUnbilled] = useState<UnbilledEntry[]>(getUnbilledEntries);

  useEffect(() => {
    const handleUpdate = () => setLocalUnbilled(getUnbilledEntries());
    window.addEventListener(UNBILLED_UPDATED_EVENT, handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener(UNBILLED_UPDATED_EVENT, handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  // Combined raw unbilled micro-sales ledger entries (deduplicated between Firestore state and localStorage)
  const rawUnbilled = useMemo(() => {
    const fromState = state.unbilledEntries || [];
    const map = new Map<string, UnbilledEntry>();
    [...localUnbilled, ...fromState].forEach(e => {
      if (e && e.id) map.set(e.id, e);
    });
    return Array.from(map.values());
  }, [state.unbilledEntries, localUnbilled]);

  // Split bills and unbilled micro ledger entries between current interval and previous matching interval
  const { currentBills, previousBills, currentUnbilled, previousUnbilled } = useMemo(() => {
    const { currentStart, prevStart, prevEnd } = getDateBounds(timePeriod);
    
    const currB = rawBills.filter(bill => {
      const d = parseTimestamp(bill.timestamp);
      return d >= currentStart;
    });

    const prevB = timePeriod === 'all' ? [] : rawBills.filter(bill => {
      const d = parseTimestamp(bill.timestamp);
      return d >= prevStart && d < prevEnd;
    });

    const currU = rawUnbilled.filter(entry => {
      const d = parseTimestamp(entry.timestamp || entry.dateStr);
      return d >= currentStart;
    });

    const prevU = timePeriod === 'all' ? [] : rawUnbilled.filter(entry => {
      const d = parseTimestamp(entry.timestamp || entry.dateStr);
      return d >= prevStart && d < prevEnd;
    });

    return { 
      currentBills: currB, 
      previousBills: prevB,
      currentUnbilled: currU,
      previousUnbilled: prevU
    };
  }, [rawBills, rawUnbilled, timePeriod]);

  // Compute key summary parameters for a bills list AND unbilled micro-ledger entries
  const computeMetrics = (billsList: Bill[], unbilledList: UnbilledEntry[] = []) => {
    let totalSales = 0;
    let totalProfit = 0;
    let totalBills = billsList.length;
    let totalPrints = 0;

    billsList.forEach(bill => {
      totalSales += Number(bill.total) || 0;
      totalProfit += getBillProfit(bill, state.items);
      
      // Look up print timestamps in local storage to verify print counts
      const hasPrinted = localStorage.getItem(`price_manager_last_print_time_${bill.id}`);
      if (hasPrinted) {
        totalPrints++;
      }
    });

    // Add unbilled micro-sales ledger revenue into Total Sales & Total Profit
    unbilledList.forEach(entry => {
      const amt = Number(entry.amount) || 0;
      totalSales += amt;
      totalProfit += amt; // Unbilled counter quick-sales represent direct revenue
      totalBills += 1;
    });

    return { 
      totalSales: Number(totalSales.toFixed(2)), 
      totalProfit: Number(totalProfit.toFixed(2)), 
      totalBills, 
      totalPrints 
    };
  };

  const currentMetrics = useMemo(() => computeMetrics(currentBills, currentUnbilled), [currentBills, currentUnbilled, state.items]);
  const previousMetrics = useMemo(() => computeMetrics(previousBills, previousUnbilled), [previousBills, previousUnbilled, state.items]);

  // Compute general warehouse catalog valuation
  const warehouseMetrics = useMemo(() => {
    let uniqueItemsCount = state.items.length;
    let totalItemsStock = 0;
    let capitalTiedUp = 0;
    let potentialRetailValue = 0;
    let potentialWholesaleValue = 0;
    let lowStockCount = 0;

    state.items.forEach(item => {
      totalItemsStock += (item.quantity || 0);
      capitalTiedUp += (item.buyingPrice || 0) * (item.quantity || 0);
      potentialRetailValue += (item.retailPrice || 0) * (item.quantity || 0);
      potentialWholesaleValue += (item.wholesalePrice || 0) * (item.quantity || 0);
      
      const alertLevel = item.minStockLevel || 10;
      if ((item.quantity || 0) <= alertLevel) {
        lowStockCount++;
      }
    });

    const marginPercentage = potentialRetailValue > 0
      ? ((potentialRetailValue - capitalTiedUp) / potentialRetailValue) * 100
      : 0;

    return {
      uniqueItemsCount,
      totalItemsStock,
      capitalTiedUp,
      potentialRetailValue,
      potentialWholesaleValue,
      lowStockCount,
      marginPercentage
    };
  }, [state.items]);

  // Compute period growth ratios
  const salesGrowth = useMemo(() => {
    const curr = currentMetrics.totalSales;
    const prev = previousMetrics.totalSales;
    return prev === 0 ? (curr > 0 ? 100 : 0) : ((curr - prev) / prev) * 100;
  }, [currentMetrics, previousMetrics]);

  const profitGrowth = useMemo(() => {
    const curr = currentMetrics.totalProfit;
    const prev = previousMetrics.totalProfit;
    return prev === 0 ? (curr > 0 ? 100 : 0) : ((curr - prev) / prev) * 100;
  }, [currentMetrics, previousMetrics]);

  const billsGrowth = useMemo(() => {
    const curr = currentMetrics.totalBills;
    const prev = previousMetrics.totalBills;
    return prev === 0 ? (curr > 0 ? 100 : 0) : ((curr - prev) / prev) * 100;
  }, [currentMetrics, previousMetrics]);

  const printsGrowth = useMemo(() => {
    const curr = currentMetrics.totalPrints;
    const prev = previousMetrics.totalPrints;
    return prev === 0 ? (curr > 0 ? 100 : 0) : ((curr - prev) / prev) * 100;
  }, [currentMetrics, previousMetrics]);

  const currentTheme = state.settings.theme;
  const themeChartColors = useMemo(() => getThemeChartColors(currentTheme), [currentTheme]);
  const themeContainerStyle = useMemo(() => getThemeContainerStyle(currentTheme), [currentTheme]);

  // Compute top 10 selling products leaderboard
  const top10SellingItems = useMemo(() => {
    const productsMap: { [key: string]: { id: string; name: string; qty: number; revenue: number; profit: number; unit: string } } = {};

    const itemsCatalogMap = new Map<string, Item>();
    state.items.forEach(i => {
      if (i.id) itemsCatalogMap.set(i.id, i);
      if (i.name) itemsCatalogMap.set(i.name.toLowerCase().trim(), i);
    });

    currentBills.forEach(bill => {
      bill.items.forEach(sold => {
        if (!productsMap[sold.itemId]) {
          productsMap[sold.itemId] = {
            id: sold.itemId,
            name: sold.name,
            qty: 0,
            revenue: 0,
            profit: 0,
            unit: sold.unit || 'Pcs'
          };
        }
        const qty = Number(sold.quantity) || 0;
        const price = Number(sold.price) || 0;
        let cost = Number(sold.cost) || 0;
        if (cost <= 0) {
          const catItem = itemsCatalogMap.get(sold.itemId) || itemsCatalogMap.get((sold.name || '').toLowerCase().trim());
          if (catItem && typeof catItem.buyingPrice === 'number' && catItem.buyingPrice > 0) {
            cost = catItem.buyingPrice;
          } else {
            cost = price * 0.75;
          }
        }
        productsMap[sold.itemId].qty += qty;
        productsMap[sold.itemId].revenue += price * qty;
        productsMap[sold.itemId].profit += Math.max(0, (price - cost) * qty);
      });
    });

    return Object.values(productsMap)
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 10);
  }, [currentBills, state.items]);

  // Extract relative benchmark threshold for progress bars
  const peakLeaderQty = useMemo(() => {
    if (top10SellingItems.length === 0) return 1;
    return top10SellingItems[0].qty || 1;
  }, [top10SellingItems]);

  return (
    <div className="relative space-y-6 pb-28 max-w-7xl mx-auto text-[var(--foreground)] font-sans antialiased">
      <AnimatePresence>
        {isLocked && (
          <motion.div
            key="analytics-lock-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0 z-50 rounded-[2.5rem] bg-[var(--background)]/90 backdrop-blur-xl border border-[var(--border)]/20 flex flex-col items-center justify-center p-6 text-center select-none"
          >
            <motion.div
              initial={{ scale: 0.85, y: 30 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.85, y: 30 }}
              transition={{ type: "spring", stiffness: 350, damping: 25 }}
              className="max-w-md w-full p-8 bg-[var(--card)] border border-[var(--border)] rounded-[2.5rem] shadow-2xl space-y-6 flex flex-col items-center relative overflow-hidden"
            >
              {/* Decorative accent background blur */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-48 bg-[var(--primary)]/10 rounded-full filter blur-3xl -z-10" />

              <div className="relative">
                <div className="absolute inset-0 bg-amber-500/20 rounded-full blur-2xl animate-pulse" />
                <div className="relative h-20 w-20 rounded-[2rem] bg-amber-500/10 border border-amber-500/30 text-amber-500 flex items-center justify-center shadow-lg">
                  <motion.div
                    animate={{ 
                      y: [0, -3, 0],
                      rotate: [0, -2, 2, -2, 0]
                    }}
                    transition={{ 
                      repeat: Infinity, 
                      duration: 4, 
                      ease: "easeInOut" 
                    }}
                  >
                    <Lock size={36} className="text-amber-500 animate-pulse" />
                  </motion.div>
                </div>
              </div>

              <div className="space-y-2 px-2">
                <h3 className="text-lg sm:text-xl font-black uppercase tracking-tight text-[var(--foreground)]">
                  Analytics Vault Secured
                </h3>
                <p className="text-[10px] font-black uppercase tracking-widest text-[var(--primary)]">
                  Store Financials & Margins Masked
                </p>
                <p className="text-[11px] sm:text-xs text-[var(--foreground)]/60 leading-relaxed pt-2">
                  Daily revenue data, cost price distributions, and customer credit sheets are encrypted for customer-facing privacy. Toggle the lock above or click below to restore live telemetry.
                </p>
              </div>

              <button
                type="button"
                onClick={onUnlock}
                className="w-full bg-[var(--primary)] hover:bg-[var(--primary)]/90 text-white font-black text-xs uppercase tracking-widest py-4 px-6 rounded-2xl cursor-pointer shadow-lg active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              >
                <Unlock size={14} />
                <span>Verify Security PIN / अनलॉक करें</span>
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 1. TOP DYNAMIC HEADER & SEGMENTED controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-[var(--border)] pb-4 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-[var(--primary)] animate-pulse" />
            <span className="text-[10px] font-black tracking-[0.25em] uppercase opacity-40">TS PRICE MANAGER</span>
          </div>
          <h2 className="text-2xl font-black text-[var(--foreground)] tracking-tight uppercase flex items-center gap-2 mt-0.5">
            <Activity className="text-[var(--primary)]" size={24} /> {t.storeAnalytics || "Store Analytics"}
          </h2>
          <p className="text-[10px] font-bold opacity-50 uppercase tracking-widest mt-1">
            {t.analyticsSubText || "Professional Business Analytics & Inventory Performance reporting"}
          </p>
        </div>

        {/* Professional Segmented buttons optimized for quick mobile touch selection */}
        <div className="flex items-center bg-[var(--foreground)]/[0.03] p-1 rounded-2xl border border-[var(--border)] self-start md:self-auto w-full md:w-auto overflow-x-auto">
          {([
            { id: 'today', name: t.today || 'Today' },
            { id: 'week', name: t.week || 'Week' },
            { id: 'month', name: t.month || 'Month' },
            { id: 'year', name: t.year || 'Year' },
            { id: 'all', name: t.allTime || 'All Time' }
          ] as const).map(tab => {
            const isSelected = timePeriod === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setTimePeriod(tab.id)}
                className={`relative flex-1 md:flex-initial px-4 py-2.5 rounded-xl text-[11px] font-extrabold uppercase tracking-widest transition-all duration-200 cursor-pointer text-center min-w-[70px] ${
                  isSelected 
                    ? 'bg-[var(--primary)] text-white shadow-md' 
                    : 'text-[var(--foreground)]/50 hover:text-[var(--foreground)] bg-transparent'
                }`}
              >
                {tab.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Sub-Tabs Switcher for Core Reports / Business Milestones with beautifully animated right-aligned small theme options list */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-[var(--border)] pb-2 gap-4 mb-3 overflow-visible">
        <div className="flex gap-6 overflow-x-auto whitespace-nowrap scrollbar-none">
          <button
            onClick={() => setActiveSubTab('reports')}
            className={`pb-3 font-extrabold text-[11px] uppercase tracking-wider relative transition-colors cursor-pointer outline-none ${
              activeSubTab === 'reports' ? 'text-[var(--primary)]' : 'text-[var(--foreground)]/50 hover:text-[var(--foreground)]'
            }`}
          >
            <span className="flex items-center gap-2">
              <Activity size={13} /> {t.coreFinancials || "Core Financial Analytics"}
            </span>
            {activeSubTab === 'reports' && (
              <motion.div layoutId="activeSubTabUnderline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--primary)]" />
            )}
          </button>
          <button
            onClick={() => setActiveSubTab('milestones')}
            className={`pb-3 font-extrabold text-[11px] uppercase tracking-wider relative transition-all duration-300 cursor-pointer outline-none flex items-center gap-2 ${
              activeSubTab === 'milestones' ? 'text-[var(--primary)] font-black' : 'text-[var(--foreground)]/50 hover:text-[var(--foreground)] hover:translate-y-[-1px]'
            }`}
          >
            <span className="flex items-center gap-1.5">
              <motion.div
                animate={activeSubTab === 'milestones' ? {
                  scale: [1, 1.25, 1],
                  rotate: [0, -10, 10, -10, 10, 0],
                } : {}}
                transition={{
                  duration: 1.6,
                  repeat: activeSubTab === 'milestones' ? Infinity : 0,
                  repeatDelay: 5,
                  ease: "easeInOut"
                }}
                whileHover={{ rotate: 15, scale: 1.2 }}
                className="inline-flex items-center justify-center"
              >
                <Trophy size={13} className="text-amber-500 drop-shadow-[0_0_6px_rgba(245,158,11,0.5)]" />
              </motion.div>
              <span>{t.businessMilestones || "Business Milestones & Journey"}</span>
            </span>
            <span className={`px-1.5 py-0.5 text-[8.5px] font-black font-mono rounded-full flex items-center justify-center transition-all duration-300 ${
              activeSubTab === 'milestones' 
                ? 'bg-amber-500/20 text-amber-500 border border-amber-500/30 shadow-[0_0_8px_rgba(245,158,11,0.25)] scale-105' 
                : 'bg-[var(--foreground)]/[0.05] text-[var(--foreground)]/50 border border-transparent'
            }`}>
              {unlockedCount}
            </span>
            {activeSubTab === 'milestones' && (
              <motion.div layoutId="activeSubTabUnderline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--primary)]" />
            )}
          </button>
        </div>

        {/* Small, beautifully animated & interactive theme options selector */}
        {onUpdateSettings && (
          <div className="flex items-center gap-1 self-end md:self-auto pb-1 md:pb-0 select-none z-10 bg-[var(--background)]/40 px-2 py-0.5 rounded-full border border-[var(--border)]/[0.25] backdrop-blur-md shadow-xs h-8">
            <span className="text-[8px] font-black uppercase tracking-wider text-[var(--foreground)]/60 mr-1 pl-1">Themes:</span>
            {[
              { id: 'midnight_blue', emoji: '🌑', label: 'Midnight Pro', glow: 'bg-blue-500/10 shadow-[0_0_8px_rgba(59,130,246,0.3)]' },
              { id: 'cyberpunk', emoji: '⚡', label: 'Cyberpunk Neon', glow: 'bg-pink-500/10 shadow-[0_0_8px_rgba(236,72,153,0.3)]' },
              { id: 'glass_modern', emoji: '✨', label: 'Glass Morphic', glow: 'bg-purple-500/10 shadow-[0_0_8px_rgba(168,85,247,0.3)]' },
              { id: 'luxury_gold', emoji: '👑', label: 'Luxury Gold', glow: 'bg-amber-500/10 shadow-[0_0_8px_rgba(245,158,11,0.3)]' },
              { id: 'emerald_matrix', emoji: '📟', label: 'Technical Green', glow: 'bg-emerald-500/10 shadow-[0_0_8px_rgba(16,185,129,0.3)]' },
              { id: 'retro-blue', emoji: '🌌', label: 'Cosmic Retro', glow: 'bg-indigo-500/10 shadow-[0_0_8px_rgba(99,102,241,0.3)]' },
              { id: 'emerald-gold', emoji: '🌿', label: 'Emerald Forest', glow: 'bg-emerald-600/10 shadow-[0_0_8px_rgba(16,185,129,0.3)]' },
              { id: 'minimalist-ivory', emoji: '🍦', label: 'Classic Ivory', glow: 'bg-stone-400/10 shadow-[0_0_8px_rgba(120,113,108,0.2)]' },
              { id: 'neo_brutalist', emoji: '🎛️', label: 'Neo-Brutalist', glow: 'bg-zinc-800/10 shadow-[0_0_8px_rgba(0,0,0,0.3)]' }
            ].map((themeOpt) => {
              const isActive = state.settings.theme === themeOpt.id;
              return (
                <motion.button
                  key={themeOpt.id}
                  onClick={() => onUpdateSettings({ theme: themeOpt.id as any })}
                  title={themeOpt.label}
                  whileHover={{ scale: 1.3, rotate: 10 }}
                  whileTap={{ scale: 0.85 }}
                  className={`relative w-5.5 h-5.5 rounded-full flex items-center justify-center text-[10px] cursor-pointer transition-all ${
                    isActive 
                      ? `${themeOpt.glow} ring-1.5 ring-[var(--primary)] text-scale-110 font-bold z-20`
                      : 'hover:bg-[var(--foreground)]/5 text-[var(--foreground)]/60 hover:text-[var(--foreground)]'
                  }`}
                >
                  <span>{themeOpt.emoji}</span>
                  {isActive && (
                    <motion.div
                      layoutId="activeThemeBubbleGlow"
                      className="absolute -inset-1 rounded-full border border-[var(--primary)] opacity-50"
                      transition={{ type: "spring", stiffness: 300, damping: 25 }}
                    />
                  )}
                </motion.button>
              );
            })}
          </div>
        )}
      </div>

      {activeSubTab === 'milestones' ? (
        <MilestonesTab state={state} t={t} />
      ) : (
        <>
          {currentBills.length === 0 && currentUnbilled.length === 0 && (
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-6 rounded-2xl bg-amber-500/[0.03] border border-amber-500/15 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        >
          <div className="flex items-start sm:items-center gap-3.5 text-left">
            <div className="h-10 w-10 shrink-0 bg-amber-500/10 text-amber-500 rounded-xl flex items-center justify-center border border-amber-500/20">
              <AlertTriangle size={18} />
            </div>
            <div className="space-y-0.5">
              <h4 className="text-[11px] font-black uppercase tracking-tight text-[var(--foreground)]">
                {t.noBillsDetected || "No billing or micro-sales transactions detected"} ({timePeriod.toUpperCase()})
              </h4>
              <p className="text-[9.5px] uppercase tracking-wider text-[var(--foreground)]/50 leading-relaxed font-semibold">
                {rawBills.length > 0 || rawUnbilled.length > 0 
                  ? `You have ${rawBills.length + rawUnbilled.length} total records in history outside this period.`
                  : (t.noBillsDetectedSub || "Your analytics telemetry pipeline is ready. Perform customer checkouts or save draft POS window actions to visualize live business parameters here.")
                }
              </p>
            </div>
          </div>
          {(rawBills.length > 0 || rawUnbilled.length > 0) && timePeriod !== 'all' && (
            <button
              onClick={() => setTimePeriod('all')}
              className="px-4 py-2 bg-[var(--primary)] text-white text-[10px] font-black uppercase tracking-wider rounded-xl hover:opacity-90 transition-all shadow-sm shrink-0 cursor-pointer"
            >
              View All Time ({rawBills.length + rawUnbilled.length} Sales Records)
            </button>
          )}
        </motion.div>
      )}

      {/* 1. MINIMALIST BENTO KPI SUMMARIES GRID - Compact layout with animated metrics & growth arrows */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
        
        {/* KPI 1: Sales */}
        <div className={`p-4 rounded-3xl relative overflow-hidden flex flex-col justify-between transition-all duration-300 hover:scale-[1.015] hover:shadow-lg border ${themeContainerStyle.cardBg} ${themeChartColors.cardBorder}`}>
          <ThemeVisualEffects theme={currentTheme} disableMovement={true} />
          <div className="absolute top-0 right-0 h-12 w-12 bg-[var(--primary)]/5 rounded-full blur-lg" />
          <div className="flex items-center justify-between">
            <span className="text-[9.5px] font-black tracking-widest uppercase opacity-45 flex items-center gap-1">
              <DollarSign size={11} className="text-[var(--primary)]" /> {t.totalSales || "Total Sales"}
            </span>
            <GrowthIndicator pct={salesGrowth} />
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-lg font-extrabold text-[var(--foreground)] font-mono">₹</span>
            <span className="text-xl font-black text-[var(--foreground)] font-mono tracking-tight">
              <AnimatedNumber value={currentMetrics.totalSales} formatter={(v) => v.toLocaleString(undefined, { maximumFractionDigits: 0 })} />
            </span>
          </div>
          <p className="text-[8.5px] opacity-40 font-bold uppercase tracking-wider mt-1.5 font-mono">
            {currentMetrics.totalBills} {t.billsRegistered || "bills registered"}
          </p>
        </div>

        {/* KPI 2: Profit */}
        <div className={`p-4 rounded-3xl relative overflow-hidden flex flex-col justify-between transition-all duration-300 hover:scale-[1.015] hover:shadow-lg border ${themeContainerStyle.cardBg} ${themeChartColors.cardBorder}`}>
          <ThemeVisualEffects theme={currentTheme} disableMovement={true} />
          <div className="absolute top-0 right-0 h-12 w-12 bg-emerald-500/5 rounded-full blur-lg" />
          <div className="flex items-center justify-between">
            <span className="text-[9.5px] font-black tracking-widest uppercase opacity-45 flex items-center gap-1">
              <TrendingUp size={11} className="text-emerald-500" /> {t.totalProfit || "Total Profit"}
            </span>
            <GrowthIndicator pct={profitGrowth} />
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-lg font-extrabold text-[#10b981] font-mono">₹</span>
            <span className="text-xl font-black text-[#10b981] font-mono tracking-tight">
              <AnimatedNumber value={currentMetrics.totalProfit} formatter={(v) => v.toLocaleString(undefined, { maximumFractionDigits: 0 })} />
            </span>
          </div>
          <p className="text-[8.5px] opacity-40 font-bold uppercase tracking-wider mt-1.5 font-mono text-[var(--foreground)]">
            {t.profitMargin || "Margin"}: {currentMetrics.totalSales > 0 ? ((currentMetrics.totalProfit / currentMetrics.totalSales) * 100).toFixed(0) : '0'}%
          </p>
        </div>

        {/* KPI 3: Total Bills */}
        <div className={`p-4 rounded-3xl relative overflow-hidden flex flex-col justify-between transition-all duration-300 hover:scale-[1.015] hover:shadow-lg border ${themeContainerStyle.cardBg} ${themeChartColors.cardBorder}`}>
          <ThemeVisualEffects theme={currentTheme} disableMovement={true} />
          <div className="absolute top-0 right-0 h-12 w-12 bg-blue-500/5 rounded-full blur-lg" />
          <div className="flex items-center justify-between">
            <span className="text-[9.5px] font-black tracking-widest uppercase opacity-45 flex items-center gap-1">
              <Receipt size={11} className="text-blue-500" /> {t.billsSummary || "Total Bills"}
            </span>
            <GrowthIndicator pct={billsGrowth} />
          </div>
          <div className="mt-2">
            <span className="text-xl font-black text-[var(--foreground)] font-mono tracking-tight">
              <AnimatedNumber value={currentMetrics.totalBills} />
            </span>
          </div>
          <p className="text-[8.5px] opacity-40 font-bold uppercase tracking-wider mt-1.5 font-mono">
            {t.standardInvoices || "Standard invoices"}
          </p>
        </div>

        {/* KPI 4: Total Prints */}
        <div className={`p-4 rounded-3xl relative overflow-hidden flex flex-col justify-between transition-all duration-300 hover:scale-[1.015] hover:shadow-lg border ${themeContainerStyle.cardBg} ${themeChartColors.cardBorder}`}>
          <ThemeVisualEffects theme={currentTheme} disableMovement={true} />
          <div className="absolute top-0 right-0 h-12 w-12 bg-amber-500/5 rounded-full blur-lg" />
          <div className="flex items-center justify-between">
            <span className="text-[9.5px] font-black tracking-widest uppercase opacity-45 flex items-center gap-1">
              <Printer size={11} className="text-amber-500" /> {t.totalPrints || "Total Prints"}
            </span>
            <GrowthIndicator pct={printsGrowth} />
          </div>
          <div className="mt-2">
            <span className="text-xl font-black text-[var(--foreground)] font-mono tracking-tight">
              <AnimatedNumber value={currentMetrics.totalPrints} />
            </span>
          </div>
          <p className="text-[8.5px] opacity-40 font-bold uppercase tracking-wider mt-1.5 font-mono">
            {t.thermalReprints || "Thermal reprints"}
          </p>
        </div>

        {/* KPI 5: Total Assets */}
        <div className={`p-4 rounded-3xl relative overflow-hidden flex flex-col justify-between transition-all duration-300 hover:scale-[1.015] hover:shadow-lg border ${themeContainerStyle.cardBg} ${themeChartColors.cardBorder}`}>
          <ThemeVisualEffects theme={currentTheme} disableMovement={true} />
          <div className="absolute top-0 right-0 h-12 w-12 bg-violet-500/5 rounded-full blur-lg" />
          <div className="flex items-center justify-between">
            <span className="text-[9.5px] font-black tracking-widest uppercase opacity-45 flex items-center gap-1 flex-1 truncate">
              <Layers size={11} className="text-violet-500" /> {t.totalAssets || "Total Assets"}
            </span>
            {warehouseMetrics.lowStockCount > 0 && (
              <span className="inline-flex items-center gap-0.5 text-[8.5px] font-black bg-amber-500/10 text-amber-500 rounded px-1.5 leading-none py-0.5">
                ! {warehouseMetrics.lowStockCount}
              </span>
            )}
          </div>
          <div className="mt-2">
            <span className="text-xl font-black text-[var(--foreground)] font-mono tracking-tight">
              <AnimatedNumber value={warehouseMetrics.uniqueItemsCount} />
            </span>
          </div>
          <p className="text-[8.5px] opacity-40 font-bold uppercase tracking-wider mt-1.5 truncate">
            {warehouseMetrics.totalItemsStock.toLocaleString()} {t.stockUnits || "stock units"}
          </p>
        </div>

        {/* KPI 6: Asset Value */}
        <div className={`p-4 rounded-3xl relative overflow-hidden flex flex-col justify-between transition-all duration-300 hover:scale-[1.015] hover:shadow-lg border ${themeContainerStyle.cardBg} ${themeChartColors.cardBorder}`}>
          <ThemeVisualEffects theme={currentTheme} disableMovement={true} />
          <div className="absolute top-0 right-0 h-12 w-12 bg-teal-500/5 rounded-full blur-lg" />
          <div className="flex items-center justify-between">
            <span className="text-[9.5px] font-black tracking-widest uppercase opacity-45 flex items-center gap-1 flex-1 truncate">
              <Warehouse size={11} className="text-teal-500" /> {t.assetValue || "Asset Value"}
            </span>
            <span className="inline-flex items-center text-[8.5px] font-black bg-teal-500/10 text-teal-500 rounded px-1 leading-none py-0.5">
              Est
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-0.5">
            <span className="text-sm font-extrabold text-[var(--foreground)] font-mono">₹</span>
            <span className="text-xl font-black text-[var(--foreground)] font-mono tracking-tight truncate">
              <AnimatedNumber value={warehouseMetrics.potentialRetailValue} formatter={(v) => v.toLocaleString(undefined, { maximumFractionDigits: 0 })} />
            </span>
          </div>
          <p className="text-[8.5px] opacity-40 font-bold uppercase tracking-wider mt-1.5 truncate font-mono">
            {t.capCost || "Cap"}: ₹{warehouseMetrics.capitalTiedUp.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </p>
        </div>
      </div>

      {/* Dynamic Command HUD Bar - Defines a specialized high-fidelity real-time telemetry vibe */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-3xl border border-[var(--border)] bg-zinc-150/50 dark:bg-zinc-950/20 backdrop-blur-2xl mb-8">
        <div className="flex items-center gap-3 pl-2">
          <div className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
          <div className="text-left leading-none space-y-1">
            <span className="text-[8.5px] font-black tracking-widest uppercase opacity-45 block font-mono">{t.systemStatus || "System Status"}</span>
            <span className="text-[10px] font-extrabold text-[var(--foreground)] uppercase block">{t.telemetryActive || "Telemetry Stream: Active"}</span>
          </div>
        </div>
        <div className="flex items-center gap-3 border-t md:border-t-0 md:border-x border-[var(--border)] pt-2.5 md:pt-0 md:px-4">
          <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
          <div className="text-left leading-none space-y-1">
            <span className="text-[8.5px] font-black tracking-widest uppercase opacity-45 block font-mono">{t.ledgerNode || "Ledger Node"}</span>
            <span className="text-[10px] font-extrabold text-[var(--foreground)] uppercase block">{t.offlineSyncEnabled || "Offline Sync Channel Enabled"}</span>
          </div>
        </div>
        <div className="flex items-center gap-3 border-t md:border-t-0 pt-2.5 md:pt-0 pl-2">
          <div className="h-2 w-2 rounded-full bg-violet-500" />
          <div className="text-left leading-none space-y-1">
            <span className="text-[8.5px] font-black tracking-widest uppercase opacity-45 block font-mono">{t.statisticalEngine || "Statistical Engine"}</span>
            <span className="text-[10px] font-extrabold text-[var(--foreground)] uppercase block">{t.highPrecisionAudit || "High Precision Audit Ready"}</span>
          </div>
        </div>
      </div>

      {/* Hero Visualizer: Interactive Advanced Analytics Graph System */}
      <div className="mb-8">
        <PremiumInteractiveChart 
          state={state} 
          timePeriod={timePeriod} 
          currentBills={currentBills} 
          currentUnbilled={currentUnbilled}
          themeChartColors={themeChartColors} 
        />
      </div>

      {/* Interactive Monthly Sales Goal Hub */}
      <MonthlySalesTargetPanel state={state} t={t} onUpdateSettings={onUpdateSettings} />

      {/* DEDICATED REAL-TIME UNBILLED RUSH HOUR & MICRO-SALES AUDIT SECTION */}
      <UnbilledAuditAnalyticsSection
        state={state}
        timePeriod={timePeriod}
        currentBills={currentBills}
        themeContainerStyle={themeContainerStyle}
        themeChartColors={themeChartColors}
        t={t}
      />

      {/* 4. LEADERBOARD LIST (TOP 10 SELLING ITEMS) & WAREHOUSE INTELLIGENCE REPORT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Top 10 Selling Items Leaderboard */}
        <div className={`lg:col-span-7 p-6 ${themeContainerStyle.cardBg} space-y-4 relative overflow-hidden`}>
          <ThemeVisualEffects theme={currentTheme} disableMovement={true} />
          <div>
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-extrabold text-[var(--foreground)] text-sm uppercase flex items-center gap-1.5">
                  <TrendingUp size={16} className="text-[var(--primary)] animate-bounce" /> {t.topSellingItems || "Top 10 Selling Items"}
                </h4>
                <p className="text-[9.5px] opacity-40 font-bold uppercase tracking-wider mt-0.5">
                  {t.topSellingSub || "Highest velocity checkout items recorded across the interval"}
                </p>
              </div>
              <span className="text-[8px] font-black bg-[var(--primary)]/10 text-[var(--primary)] px-2 py-0.5 rounded-full uppercase leading-none">
                Velocity Match
              </span>
            </div>

            <div className="divide-y divide-[var(--border)] overflow-hidden mt-4">
              {top10SellingItems.length === 0 ? (
                <div className="py-20 text-center opacity-30 text-[10px] uppercase tracking-widest font-extrabold flex flex-col items-center justify-center gap-2">
                  <Package2 size={24} />
                  <span>{t.noProductSalesLogged || "No product sales logged under selected timeframe"}</span>
                </div>
              ) : (
                top10SellingItems.map((p, idx) => {
                  const velocityRatio = (p.qty / peakLeaderQty) * 100;
                  return (
                    <div key={p.id} className="flex gap-4 items-center py-3.5 first:pt-0 last:pb-0 font-medium">
                      {/* Rank Indicator */}
                      <span className="font-mono font-black text-[11px] h-6 w-6 rounded-lg bg-[var(--foreground)]/[0.04] border border-[var(--border)] text-[var(--foreground)]/70 flex items-center justify-center shrink-0">
                        {idx + 1 < 10 ? `0${idx + 1}` : idx + 1}
                      </span>
                      
                      {/* Product Name & quantity gauge bar */}
                      <div className="flex-1 min-w-0 space-y-1.5">
                        <div className="flex items-center justify-between text-xs font-bold leading-none">
                          <p className="text-[var(--foreground)] truncate max-w-[170px] sm:max-w-xs uppercase tracking-tight">
                            {p.name}
                          </p>
                          <span className="font-mono opacity-80 shrink-0 text-right">
                            {p.qty} {p.unit}
                          </span>
                        </div>
                        {/* High fidelity progressive tracking bar */}
                        <div className="h-1.5 w-full bg-[var(--foreground)]/[0.04] rounded-full overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${velocityRatio}%` }}
                            className="h-full bg-[var(--primary)] rounded-full"
                            style={{
                              backgroundColor: idx === 0 ? 'var(--primary)' : idx === 1 ? '#10b981' : 'var(--primary)'
                            }}
                            transition={{ duration: 0.8, delay: idx * 0.05 }}
                          />
                        </div>
                      </div>

                      {/* Revenue values */}
                      <div className="text-right font-mono text-xs shrink-0 pl-2">
                        <p className="font-extrabold text-[var(--foreground)]">₹{Math.round(p.revenue).toLocaleString()}</p>
                        <p className="text-[9px] font-black text-green-500 mt-0.5">
                          +₹{Math.round(p.profit).toLocaleString()} {t.margin || "margin"}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="bg-[var(--foreground)]/[0.02] p-3 rounded-2xl border border-[var(--border)] text-[9px] opacity-60 leading-snug flex items-start gap-2.5 mt-4">
            <Info size={13} className="text-amber-500 shrink-0 mt-0.5" />
            <span>
              {t.itemVelocitiesUpdate || "Item velocities update in real time according to local printer billing logs. Product valuations leverage static margins declared on active catalogs."}
            </span>
          </div>
        </div>

        {/* Warehouse Metrics, Valuation & Catalog framework */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Warehouse Valuations */}
          <div className={`p-6 ${themeContainerStyle.cardBg} space-y-4 relative overflow-hidden`}>
            <ThemeVisualEffects theme={currentTheme} disableMovement={true} />
            <div>
              <h4 className="font-extrabold text-[var(--foreground)] text-sm uppercase flex items-center gap-1.5">
                <Warehouse size={16} className="text-teal-500" /> {t.warehouseReport || "Catalog Valuations"}
              </h4>
              <p className="text-[9.5px] opacity-40 font-bold uppercase tracking-wider mt-0.5">
                {t.warehouseReportSub || "Physical value thresholds of overall active inventory stocks"}
              </p>
            </div>

            <div className="space-y-4">
              <div className="p-3.5 bg-[var(--foreground)]/[0.02] border border-[var(--border)] rounded-2xl flex items-center justify-between">
                <div className="space-y-0.5">
                  <span className="text-[9px] font-black opacity-45 uppercase tracking-widest block leading-none">{t.capitalInvestment || "Catalog Investment Cost"}</span>
                  <span className="text-lg font-black text-rose-500 font-mono">₹{Math.round(warehouseMetrics.capitalTiedUp).toLocaleString()}</span>
                  <span className="text-[8px] opacity-40 block">{t.lockedCapitalInside || "Locked capital inside warehouses"}</span>
                </div>
                <div className="text-right">
                  <span className="px-2 py-1 rounded text-[8.5px] font-black uppercase tracking-wider bg-rose-500/10 text-rose-600 border border-rose-500/20">
                    {t.storageCost || "Storage cost"}
                  </span>
                </div>
              </div>

              <div className="p-3.5 bg-[var(--foreground)]/[0.02] border border-[var(--border)] rounded-2xl flex items-center justify-between">
                <div className="space-y-0.5">
                  <span className="text-[9px] font-black opacity-45 uppercase tracking-widest block leading-none">{t.estimatedMargin || "Potential Revenue value"}</span>
                  <span className="text-lg font-black text-emerald-500 font-mono">₹{Math.round(warehouseMetrics.potentialRetailValue).toLocaleString()}</span>
                  <span className="text-[8px] opacity-40 block">{t.estimatedRetailLiquidity || "Estimated retail liquidity complete"}</span>
                </div>
                <div className="text-right">
                  <span className="px-2 py-1 rounded text-[8.5px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 font-mono">
                    +{warehouseMetrics.marginPercentage.toFixed(0)}% {t.profitMargin || "Margin"}
                  </span>
                </div>
              </div>
            </div>

            {warehouseMetrics.lowStockCount > 0 ? (
              <div className="p-3.5 rounded-2xl bg-amber-500/5 border border-amber-500/15 flex items-start gap-2.5">
                <ShieldAlert className="text-amber-500 shrink-0 mt-0.5" size={15} />
                <div className="space-y-0.5 text-[10px] leading-tight text-left">
                  <p className="font-extrabold text-amber-600 uppercase tracking-wider">{t.replenishmentActionRequired || "Replenishment Action Required"}</p>
                  <p className="opacity-70 font-semibold">{warehouseMetrics.lowStockCount} {t.lowStockItems || "items"} {t.replenishmentActionDesc || "have reached or dropped below specified threshold levels. Visit inventory catalogs to order supplies."}</p>
                </div>
              </div>
            ) : (
              <div className="p-3.5 rounded-2xl bg-emerald-500/5 border border-emerald-500/15 flex items-start gap-2.5">
                <CheckCircle2 className="text-emerald-500 shrink-0 mt-0.5" size={15} />
                <div className="space-y-0.5 text-[10px] leading-tight text-left">
                  <p className="font-extrabold text-emerald-600 uppercase tracking-wider">{t.inventoryHealthOptimal || "Inventory Health Optimal"}</p>
                  <p className="opacity-70 font-semibold">{t.inventoryHealthOptimalDesc || "No critical stock warnings recorded. Catalog quantities exceed minimum threshold levels beautifully."}</p>
                </div>
              </div>
            )}
          </div>

        </div>

      </div>
      </>
      )}

    </div>
  );
}

// Minimalist indicator helper
function GrowthIndicator({ pct }: { pct: number }) {
  if (pct === 0) return null;
  const isPositive = pct > 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-[9.5px] font-black rounded-lg px-2 py-0.5 leading-none shrink-0 border ${
      isPositive 
        ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' 
        : 'bg-red-500/10 text-red-500 border-red-500/20'
    }`}>
      {isPositive ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
      {isPositive ? '+' : ''}{pct.toFixed(0)}%
    </span>
  );
}
