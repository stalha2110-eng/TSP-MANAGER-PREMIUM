import React, { useState, useMemo, useRef, useCallback } from 'react';
import { TrendingUp } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { AppState, Bill, UnbilledEntry } from '../types';
import { calculateBillProfit, parseTimestamp } from '../lib/utils';
import { ThemeVisualEffects } from './ThemeVisualEffects';

export interface ChartBucket {
  label: string;
  subLabel?: string;
  fullLabel: string;
  sales: number;
  profit: number;
  bills: number;
  timestamp: string;
}

interface PremiumInteractiveChartProps {
  state: AppState;
  timePeriod: 'today' | 'week' | 'month' | 'year' | 'all';
  currentBills: Bill[];
  currentUnbilled?: UnbilledEntry[];
  themeChartColors?: any;
  themeContainerStyle?: any;
}

// Calculate cost of goods and profit of a single bill
const getBillProfit = (bill: Bill, itemsCatalog?: any[]) => {
  return calculateBillProfit(bill, itemsCatalog);
};

// Generate smooth Bezier curve path from coordinates
function getBezierCurvePath(points: { x: number; y: number }[]): string {
  if (points.length === 0) return '';
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
  
  let path = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const curr = points[i];
    const next = points[i + 1];
    const cp1x = curr.x + (next.x - curr.x) / 3;
    const cp1y = curr.y;
    const cp2x = curr.x + (2 * (next.x - curr.x)) / 3;
    const cp2y = next.y;
    path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${next.x} ${next.y}`;
  }
  return path;
}

// Default theme container fallback if not passed directly
const getDefaultThemeContainerStyle = (theme: string) => {
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

export default function PremiumInteractiveChart({
  state,
  timePeriod = 'month',
  currentBills = [],
  currentUnbilled = [],
  themeChartColors,
  themeContainerStyle: passedContainerStyle
}: PremiumInteractiveChartProps) {
  const currentTheme = state.settings.theme;
  const containerStyle = passedContainerStyle || getDefaultThemeContainerStyle(currentTheme);

  // Active scrubbed point on chart
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Extract color values
  const salesStroke = themeChartColors?.sales?.stroke || '#3b82f6';
  const profitStroke = themeChartColors?.profit?.stroke || '#10b981';
  const gridStroke = themeChartColors?.gridColor || 'rgba(255, 255, 255, 0.05)';
  const gridDash = themeChartColors?.gridDash || '4,4';
  const axisColor = themeChartColors?.axisText || '#94a3b8';

  // 1. Generate Buckets based on selected timePeriod
  const { buckets, totalSales, totalProfit, totalBills } = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const midnight = new Date(year, month, now.getDate());

    let list: ChartBucket[] = [];

    if (timePeriod === 'today') {
      // 24 hourly buckets
      list = Array.from({ length: 24 }, (_, h) => {
        const isPM = h >= 12;
        const formattedHour = h === 0 ? 12 : h > 12 ? h - 12 : h;
        return {
          label: `${formattedHour}${isPM ? 'p' : 'a'}`,
          fullLabel: `Today · ${formattedHour}:00 ${isPM ? 'PM' : 'AM'}`,
          sales: 0,
          profit: 0,
          bills: 0,
          timestamp: new Date(year, month, now.getDate(), h, 0, 0).toISOString()
        };
      });

      currentBills.forEach(bill => {
        const d = parseTimestamp(bill.timestamp);
        if (d >= midnight && d <= now) {
          const h = d.getHours();
          if (h >= 0 && h < 24) {
            list[h].sales += Number(bill.total) || 0;
            list[h].profit += getBillProfit(bill, state.items);
            list[h].bills += 1;
          }
        }
      });

      currentUnbilled.forEach(entry => {
        const d = parseTimestamp(entry.timestamp || entry.dateStr);
        if (d >= midnight && d <= now) {
          const h = d.getHours();
          if (h >= 0 && h < 24) {
            const amt = Number(entry.amount) || 0;
            list[h].sales += amt;
            list[h].profit += amt;
            list[h].bills += 1;
          }
        }
      });

    } else if (timePeriod === 'week') {
      // 7 days (Monday through Sunday)
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const dayOfWeek = now.getDay();
      const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      const monday = new Date(year, month, now.getDate() + diffToMonday);

      list = Array.from({ length: 7 }, (_, i) => {
        const dayDate = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i);
        const name = dayNames[dayDate.getDay()];
        return {
          label: name,
          fullLabel: `${dayDate.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })}`,
          sales: 0,
          profit: 0,
          bills: 0,
          timestamp: dayDate.toISOString()
        };
      });

      currentBills.forEach(bill => {
        const d = parseTimestamp(bill.timestamp);
        const dayIndex = Math.floor((d.getTime() - monday.getTime()) / (24 * 3600 * 1000));
        if (dayIndex >= 0 && dayIndex < 7) {
          list[dayIndex].sales += Number(bill.total) || 0;
          list[dayIndex].profit += getBillProfit(bill, state.items);
          list[dayIndex].bills += 1;
        }
      });

      currentUnbilled.forEach(entry => {
        const d = parseTimestamp(entry.timestamp || entry.dateStr);
        const dayIndex = Math.floor((d.getTime() - monday.getTime()) / (24 * 3600 * 1000));
        if (dayIndex >= 0 && dayIndex < 7) {
          const amt = Number(entry.amount) || 0;
          list[dayIndex].sales += amt;
          list[dayIndex].profit += amt;
          list[dayIndex].bills += 1;
        }
      });

    } else if (timePeriod === 'month') {
      // Days of the current month
      const lastDay = new Date(year, month + 1, 0).getDate();
      list = Array.from({ length: lastDay }, (_, i) => {
        const dayNum = i + 1;
        return {
          label: `${dayNum}`,
          fullLabel: `${new Date(year, month, dayNum).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}`,
          sales: 0,
          profit: 0,
          bills: 0,
          timestamp: new Date(year, month, dayNum).toISOString()
        };
      });

      currentBills.forEach(bill => {
        const d = parseTimestamp(bill.timestamp);
        if (d.getFullYear() === year && d.getMonth() === month) {
          const dayIdx = d.getDate() - 1;
          if (dayIdx >= 0 && dayIdx < lastDay) {
            list[dayIdx].sales += Number(bill.total) || 0;
            list[dayIdx].profit += getBillProfit(bill, state.items);
            list[dayIdx].bills += 1;
          }
        }
      });

      currentUnbilled.forEach(entry => {
        const d = parseTimestamp(entry.timestamp || entry.dateStr);
        if (d.getFullYear() === year && d.getMonth() === month) {
          const dayIdx = d.getDate() - 1;
          if (dayIdx >= 0 && dayIdx < lastDay) {
            const amt = Number(entry.amount) || 0;
            list[dayIdx].sales += amt;
            list[dayIdx].profit += amt;
            list[dayIdx].bills += 1;
          }
        }
      });

    } else if (timePeriod === 'year') {
      // 12 months
      const monthShort = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      list = monthShort.map((mName, mIdx) => ({
        label: mName,
        fullLabel: `${new Date(year, mIdx, 1).toLocaleDateString([], { month: 'long', year: 'numeric' })}`,
        sales: 0,
        profit: 0,
        bills: 0,
        timestamp: new Date(year, mIdx, 1).toISOString()
      }));

      currentBills.forEach(bill => {
        const d = parseTimestamp(bill.timestamp);
        if (d.getFullYear() === year) {
          const mIdx = d.getMonth();
          if (mIdx >= 0 && mIdx < 12) {
            list[mIdx].sales += Number(bill.total) || 0;
            list[mIdx].profit += getBillProfit(bill, state.items);
            list[mIdx].bills += 1;
          }
        }
      });

      currentUnbilled.forEach(entry => {
        const d = parseTimestamp(entry.timestamp || entry.dateStr);
        if (d.getFullYear() === year) {
          const mIdx = d.getMonth();
          if (mIdx >= 0 && mIdx < 12) {
            const amt = Number(entry.amount) || 0;
            list[mIdx].sales += amt;
            list[mIdx].profit += amt;
            list[mIdx].bills += 1;
          }
        }
      });

    } else {
      // All time: group by last 12 active months
      const monthMap = new Map<string, ChartBucket>();
      
      const allEvents = [
        ...currentBills.map(b => ({ ts: b.timestamp, sales: Number(b.total) || 0, profit: getBillProfit(b, state.items) })),
        ...currentUnbilled.map(u => ({ ts: u.timestamp || u.dateStr, sales: Number(u.amount) || 0, profit: Number(u.amount) || 0 }))
      ];

      allEvents.sort((a, b) => new Date(a.ts).getTime() - new Date(b.ts).getTime());

      if (allEvents.length === 0) {
        list = [
          { label: 'Start', fullLabel: 'Historical Ledger', sales: 0, profit: 0, bills: 0, timestamp: new Date().toISOString() },
          { label: 'Now', fullLabel: 'Current Ledger', sales: 0, profit: 0, bills: 0, timestamp: new Date().toISOString() }
        ];
      } else {
        allEvents.forEach(item => {
          const d = parseTimestamp(item.ts);
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
          const existing = monthMap.get(key);
          if (existing) {
            existing.sales += item.sales;
            existing.profit += item.profit;
            existing.bills += 1;
          } else {
            monthMap.set(key, {
              label: d.toLocaleDateString([], { month: 'short', year: '2-digit' }),
              fullLabel: d.toLocaleDateString([], { month: 'long', year: 'numeric' }),
              sales: item.sales,
              profit: item.profit,
              bills: 1,
              timestamp: d.toISOString()
            });
          }
        });
        list = Array.from(monthMap.values()).slice(-12);
      }
    }

    let totS = 0;
    let totP = 0;
    let totB = 0;
    list.forEach(b => {
      totS += b.sales;
      totP += b.profit;
      totB += b.bills;
    });

    return {
      buckets: list,
      totalSales: totS,
      totalProfit: totP,
      totalBills: totB
    };
  }, [timePeriod, currentBills, currentUnbilled, state.items]);

  // Virtual Canvas Coordinates
  const svgWidth = 1000;
  const svgHeight = 290;
  const paddingLeft = 52;
  const paddingRight = 24;
  const paddingTop = 26;
  const paddingBottom = 40;

  const drawableWidth = svgWidth - paddingLeft - paddingRight;
  const drawableHeight = svgHeight - paddingTop - paddingBottom;

  // Max peak for scaling
  const maxVal = useMemo(() => {
    let peak = 1;
    buckets.forEach(b => {
      if (b.sales > peak) peak = b.sales;
      if (b.profit > peak) peak = b.profit;
    });
    return peak * 1.15;
  }, [buckets]);

  // Coordinate mapping
  const coordPoints = useMemo(() => {
    const total = buckets.length;
    if (total === 0) return [];
    return buckets.map((pt, i) => {
      const x = total === 1 
        ? paddingLeft + drawableWidth / 2 
        : paddingLeft + (i / (total - 1)) * drawableWidth;
      const ySales = paddingTop + drawableHeight - (pt.sales / maxVal) * drawableHeight;
      const yProfit = paddingTop + drawableHeight - (pt.profit / maxVal) * drawableHeight;
      return { x, ySales, yProfit, original: pt, index: i };
    });
  }, [buckets, maxVal, drawableWidth, drawableHeight]);

  // Bezier Paths
  const salesLinePath = useMemo(() => {
    const pts = coordPoints.map(p => ({ x: p.x, y: p.ySales }));
    return getBezierCurvePath(pts);
  }, [coordPoints]);

  const salesFillPath = useMemo(() => {
    if (coordPoints.length === 0) return '';
    const bottomY = paddingTop + drawableHeight;
    const firstX = coordPoints[0].x;
    const lastX = coordPoints[coordPoints.length - 1].x;
    return `${salesLinePath} L ${lastX} ${bottomY} L ${firstX} ${bottomY} Z`;
  }, [coordPoints, salesLinePath, paddingTop, drawableHeight]);

  const profitLinePath = useMemo(() => {
    const pts = coordPoints.map(p => ({ x: p.x, y: p.yProfit }));
    return getBezierCurvePath(pts);
  }, [coordPoints]);

  const profitFillPath = useMemo(() => {
    if (coordPoints.length === 0) return '';
    const bottomY = paddingTop + drawableHeight;
    const firstX = coordPoints[0].x;
    const lastX = coordPoints[coordPoints.length - 1].x;
    return `${profitLinePath} L ${lastX} ${bottomY} L ${firstX} ${bottomY} Z`;
  }, [coordPoints, profitLinePath, paddingTop, drawableHeight]);

  // Touch and pointer interaction
  const handlePointer = useCallback((clientX: number) => {
    if (!containerRef.current || coordPoints.length === 0) return;
    const rect = containerRef.current.getBoundingClientRect();
    if (rect.width <= 0) return;

    const scaleX = svgWidth / rect.width;
    const virtualX = (clientX - rect.left) * scaleX;

    let closestIdx = 0;
    let minDiff = Infinity;
    coordPoints.forEach((pt, i) => {
      const diff = Math.abs(pt.x - virtualX);
      if (diff < minDiff) {
        minDiff = diff;
        closestIdx = i;
      }
    });

    setActiveIndex(closestIdx);
  }, [coordPoints]);

  // Visible X-axis tick indices to prevent label overlapping
  const visibleTickIndices = useMemo(() => {
    const total = buckets.length;
    const indices = new Set<number>();
    if (total <= 8) {
      for (let i = 0; i < total; i++) indices.add(i);
    } else if (total <= 14) {
      for (let i = 0; i < total; i += 2) indices.add(i);
      indices.add(total - 1);
    } else if (total <= 25) {
      for (let i = 0; i < total; i += 4) indices.add(i);
      indices.add(total - 1);
    } else {
      for (let i = 0; i < total; i += 5) indices.add(i);
      indices.add(total - 1);
    }
    return indices;
  }, [buckets.length]);

  const activePoint = activeIndex !== null && coordPoints[activeIndex] ? coordPoints[activeIndex] : null;

  return (
    <div className={`p-5 sm:p-6 rounded-[2.5rem] ${containerStyle.cardBg} border ${themeChartColors?.cardBorder || 'border-[var(--border)]'} relative overflow-hidden shadow-2xl`}>
      <ThemeVisualEffects theme={currentTheme} disableMovement={true} />
      <div className={`absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl ${containerStyle.glowGradient || 'from-blue-500/10 to-transparent'} rounded-full blur-3xl pointer-events-none`} />

      {/* Header Bar */}
      <div className={`flex flex-col sm:flex-row sm:items-center justify-between pb-4 mb-4 gap-3.5 border-b ${containerStyle.headerBorder} relative z-10`}>
        <div className="flex items-center gap-2.5">
          <div className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${containerStyle.accentText} bg-[var(--foreground)]/5 border border-[var(--border)]`}>
            <TrendingUp size={18} />
          </div>
          <div>
            <h3 className={`text-sm sm:text-base font-extrabold uppercase tracking-tight ${containerStyle.accentText}`}>
              {containerStyle.panelTitle || "Financial Overview"}
            </h3>
            <p className="text-[10px] font-bold opacity-50 uppercase tracking-widest mt-0.5">
              {timePeriod === 'today' ? "Today's Hourly Revenue & Margin Stream" :
               timePeriod === 'week' ? "Weekly Revenue & Margin Distribution" :
               timePeriod === 'month' ? "Monthly Performance Ledger" :
               timePeriod === 'year' ? "Annual Revenue & Margin Evolution" : "All-Time Financial Progression"}
            </p>
          </div>
        </div>

        {/* Legend Pill */}
        <div className={`flex items-center gap-3 px-3.5 py-1.5 rounded-2xl ${containerStyle.legendBg} shrink-0 self-start sm:self-auto`}>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: salesStroke }} />
            <span className="text-[9.5px] font-black uppercase opacity-60">Sales</span>
            <span className="text-[11px] font-black font-mono">₹{Math.round(totalSales).toLocaleString()}</span>
          </div>
          <div className="w-px h-3 bg-[var(--border)] opacity-50" />
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: profitStroke }} />
            <span className="text-[9.5px] font-black uppercase opacity-60">Profit</span>
            <span className="text-[11px] font-black font-mono" style={{ color: profitStroke }}>₹{Math.round(totalProfit).toLocaleString()}</span>
          </div>
          {totalSales > 0 && (
            <>
              <div className="w-px h-3 bg-[var(--border)] opacity-50" />
              <span className="text-[9.5px] font-black font-mono text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                {((totalProfit / totalSales) * 100).toFixed(0)}%
              </span>
            </>
          )}
        </div>
      </div>

      {/* Interactive Chart Canvas */}
      <div 
        ref={containerRef}
        onPointerDown={(e) => handlePointer(e.clientX)}
        onPointerMove={(e) => handlePointer(e.clientX)}
        onPointerLeave={() => setActiveIndex(null)}
        onTouchMove={(e) => {
          if (e.touches[0]) handlePointer(e.touches[0].clientX);
        }}
        onTouchEnd={() => setActiveIndex(null)}
        style={{ touchAction: 'pan-y' }}
        className={`p-2 sm:p-4 rounded-3xl ${containerStyle.chartBg} relative z-10 cursor-crosshair select-none`}
      >
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-[240px] sm:h-[280px] overflow-visible pointer-events-none"
          preserveAspectRatio="none"
        >
          <defs>
            {/* Sales Area Fill Gradient */}
            <linearGradient id="prevSalesGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={salesStroke} stopOpacity="0.28" />
              <stop offset="60%" stopColor={salesStroke} stopOpacity="0.08" />
              <stop offset="100%" stopColor={salesStroke} stopOpacity="0.0" />
            </linearGradient>

            {/* Profit Area Fill Gradient */}
            <linearGradient id="prevProfitGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={profitStroke} stopOpacity="0.30" />
              <stop offset="60%" stopColor={profitStroke} stopOpacity="0.08" />
              <stop offset="100%" stopColor={profitStroke} stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Gridlines with Y-axis value tags */}
          {[0.25, 0.5, 0.75, 1.0].map((ratio, idx) => {
            const yPos = paddingTop + drawableHeight - ratio * drawableHeight;
            const gridVal = (maxVal * ratio) / 1.15;
            return (
              <g key={idx}>
                <line
                  x1={paddingLeft}
                  y1={yPos}
                  x2={paddingLeft + drawableWidth}
                  y2={yPos}
                  stroke={gridStroke}
                  strokeWidth={1}
                  strokeDasharray={gridDash}
                />
                <text
                  x={paddingLeft - 8}
                  y={yPos + 3.5}
                  textAnchor="end"
                  fontSize={9.5}
                  fontWeight="bold"
                  fill={axisColor}
                  className="font-mono opacity-60"
                >
                  ₹{gridVal >= 1000 ? `${(gridVal / 1000).toFixed(0)}k` : Math.round(gridVal)}
                </text>
              </g>
            );
          })}

          {/* Bottom baseline */}
          <line
            x1={paddingLeft}
            y1={paddingTop + drawableHeight}
            x2={paddingLeft + drawableWidth}
            y2={paddingTop + drawableHeight}
            stroke={gridStroke}
            strokeWidth={1}
          />

          {/* Sales Gradient Fill Area */}
          {salesFillPath && (
            <motion.path
              key={`prev-sales-fill-${timePeriod}`}
              d={salesFillPath}
              fill="url(#prevSalesGradient)"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6 }}
            />
          )}

          {/* Profit Gradient Fill Area */}
          {profitFillPath && (
            <motion.path
              key={`prev-profit-fill-${timePeriod}`}
              d={profitFillPath}
              fill="url(#prevProfitGradient)"
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.8 }}
              transition={{ duration: 0.6 }}
            />
          )}

          {/* Sales Smooth Curve */}
          {salesLinePath && (
            <motion.path
              key={`prev-sales-line-${timePeriod}`}
              d={salesLinePath}
              fill="none"
              stroke={salesStroke}
              strokeWidth={3}
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 0.85, ease: "easeOut" }}
            />
          )}

          {/* Profit Smooth Curve */}
          {profitLinePath && (
            <motion.path
              key={`prev-profit-line-${timePeriod}`}
              d={profitLinePath}
              fill="none"
              stroke={profitStroke}
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray={timePeriod === 'today' ? undefined : "4 3"}
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 0.85, delay: 0.08, ease: "easeOut" }}
            />
          )}

          {/* Interactive vertical guide line & indicator circles */}
          {activePoint && (
            <g>
              <line
                x1={activePoint.x}
                y1={paddingTop}
                x2={activePoint.x}
                y2={paddingTop + drawableHeight}
                stroke={axisColor}
                strokeWidth={1.2}
                strokeDasharray="3 3"
                opacity={0.4}
              />
              <circle
                cx={activePoint.x}
                cy={activePoint.ySales}
                r={5}
                fill={salesStroke}
                stroke="#ffffff"
                strokeWidth={2}
              />
              <circle
                cx={activePoint.x}
                cy={activePoint.yProfit}
                r={4.5}
                fill={profitStroke}
                stroke="#ffffff"
                strokeWidth={2}
              />
            </g>
          )}

          {/* X-axis tick labels */}
          {coordPoints.map((pt, i) => {
            if (!visibleTickIndices.has(i)) return null;
            return (
              <text
                key={i}
                x={pt.x}
                y={paddingTop + drawableHeight + 20}
                textAnchor="middle"
                fontSize={9.5}
                fontWeight="bold"
                fill={axisColor}
                className="font-mono opacity-65"
              >
                {pt.original.label}
              </text>
            );
          })}
        </svg>

        {/* Floating Interactive Tooltip (HUD) */}
        <AnimatePresence>
          {activePoint && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -4 }}
              transition={{ duration: 0.12 }}
              style={{
                left: `${Math.max(12, Math.min(88, (activePoint.x / svgWidth) * 100))}%`,
                top: '12px'
              }}
              className={`absolute -translate-x-1/2 ${containerStyle.hudBg} px-3.5 py-2.5 rounded-2xl shadow-2xl border pointer-events-none z-20 whitespace-nowrap space-y-1`}
            >
              <p className="text-[10px] font-black uppercase tracking-wider text-[var(--foreground)] border-b border-[var(--border)] pb-1">
                {activePoint.original.fullLabel}
              </p>
              <div className="flex items-center gap-3 text-[11px] font-mono pt-0.5">
                <span className="flex items-center gap-1 font-bold">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: salesStroke }} />
                  Sales: ₹{Math.round(activePoint.original.sales).toLocaleString()}
                </span>
                <span className="flex items-center gap-1 font-bold" style={{ color: profitStroke }}>
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: profitStroke }} />
                  Profit: ₹{Math.round(activePoint.original.profit).toLocaleString()}
                </span>
              </div>
              <p className="text-[9px] font-bold opacity-60 uppercase font-mono">
                {activePoint.original.bills} {activePoint.original.bills === 1 ? 'transaction' : 'transactions'}
                {activePoint.original.sales > 0 && ` · Margin ${((activePoint.original.profit / activePoint.original.sales) * 100).toFixed(0)}%`}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
