import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { RotateCcw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { AppState, Bill, UnbilledEntry } from '../types';
import { calculateBillProfit, parseTimestamp } from '../lib/utils';

export type TimeRangeType = 'today' | 'week' | 'month' | 'year' | 'custom';

interface PremiumInteractiveChartProps {
  state: AppState;
  timePeriod?: 'today' | 'week' | 'month' | 'year' | 'all';
  onTimePeriodChange?: (period: 'today' | 'week' | 'month' | 'year' | 'all') => void;
  currentBills?: Bill[];
  currentUnbilled?: UnbilledEntry[];
  themeChartColors?: any;
}

export interface ChartDataPoint {
  index: number;
  label: string;
  fullDateStr: string;
  sales: number;
  profit: number;
  bills: number;
  units: number;
  timestamp: string;
}

// Clamped Monotone Cubic Spline for non-overshooting, natural bezier curves
function getMonotoneSplinePath(points: { x: number; y: number }[]): string {
  const n = points.length;
  if (n === 0) return '';
  if (n === 1) return `M ${points[0].x} ${points[0].y}`;
  if (n === 2) {
    return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`;
  }

  // 1. Calculate secants (delta)
  const deltas: number[] = [];
  const dxs: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    const dx = points[i + 1].x - points[i].x;
    dxs.push(dx);
    deltas.push(dx === 0 ? 0 : (points[i + 1].y - points[i].y) / dx);
  }

  // 2. Initialize tangents (m)
  const m: number[] = new Array(n).fill(0);
  m[0] = deltas[0];
  m[n - 1] = deltas[n - 2];

  for (let i = 1; i < n - 1; i++) {
    if (deltas[i - 1] * deltas[i] <= 0) {
      m[i] = 0; // Local extremum
    } else {
      m[i] = (deltas[i - 1] + deltas[i]) / 2;
    }
  }

  // 3. Fritsch-Carlson monotonicity condition
  for (let i = 0; i < n - 1; i++) {
    if (deltas[i] === 0) {
      m[i] = 0;
      m[i + 1] = 0;
    } else {
      const alpha = m[i] / deltas[i];
      const beta = m[i + 1] / deltas[i];
      const dist = alpha * alpha + beta * beta;
      if (dist > 9) {
        const tau = 3 / Math.sqrt(dist);
        m[i] = tau * alpha * deltas[i];
        m[i + 1] = tau * beta * deltas[i];
      }
    }
  }

  // 4. Construct SVG Cubic Bezier path
  let path = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < n - 1; i++) {
    const dx = dxs[i];
    const cp1x = points[i].x + dx / 3;
    const cp1y = points[i].y + (m[i] * dx) / 3;
    const cp2x = points[i + 1].x - dx / 3;
    const cp2y = points[i + 1].y - (m[i + 1] * dx) / 3;
    path += ` C ${cp1x.toFixed(2)} ${cp1y.toFixed(2)}, ${cp2x.toFixed(2)} ${cp2y.toFixed(2)}, ${points[i + 1].x.toFixed(2)} ${points[i + 1].y.toFixed(2)}`;
  }

  return path;
}

export default function PremiumInteractiveChart({
  state,
  timePeriod: parentTimePeriod,
  onTimePeriodChange,
  currentBills = [],
  currentUnbilled = [],
}: PremiumInteractiveChartProps) {
  // 1. Time Range State
  const [timeRange, setTimeRange] = useState<TimeRangeType>(() => {
    if (parentTimePeriod === 'today') return 'today';
    if (parentTimePeriod === 'week') return 'week';
    if (parentTimePeriod === 'month') return 'month';
    if (parentTimePeriod === 'year') return 'year';
    return 'month';
  });

  // Custom date range state
  const [customStart, setCustomStart] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 14);
    return d.toISOString().split('T')[0];
  });
  const [customEnd, setCustomEnd] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [showCustomPicker, setShowCustomPicker] = useState(false);

  // Sync with parent time period if changed outside
  useEffect(() => {
    if (parentTimePeriod === 'today') setTimeRange('today');
    else if (parentTimePeriod === 'week') setTimeRange('week');
    else if (parentTimePeriod === 'month') setTimeRange('month');
    else if (parentTimePeriod === 'year') setTimeRange('year');
  }, [parentTimePeriod]);

  // Handle Tab Switch
  const handleTimeRangeChange = (newRange: TimeRangeType) => {
    if (typeof window !== 'undefined' && window.navigator && window.navigator.vibrate) {
      try { window.navigator.vibrate(10); } catch {}
    }
    setTimeRange(newRange);
    setActiveIndex(null);
    if (newRange === 'custom') {
      setShowCustomPicker(true);
    } else {
      setShowCustomPicker(false);
      if (onTimePeriodChange) {
        if (newRange === 'today' || newRange === 'week' || newRange === 'month' || newRange === 'year') {
          onTimePeriodChange(newRange);
        }
      }
    }
  };

  // 2. Interactive Scrubber / Selected Point & Thumb Tracking
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const lastHapticIndexRef = useRef<number | null>(null);

  // Raw bills & unbilled records
  const allBills = useMemo(() => state.bills || [], [state.bills]);
  const allUnbilled = useMemo(() => {
    const fromState = state.unbilledEntries || [];
    const map = new Map<string, UnbilledEntry>();
    [...currentUnbilled, ...fromState].forEach(e => {
      if (e && e.id) map.set(e.id, e);
    });
    return Array.from(map.values());
  }, [state.unbilledEntries, currentUnbilled]);

  // 3. Compute Data Points for the selected interval
  const { dataPoints, totals, hasRealData } = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const midnight = new Date(year, month, now.getDate());

    let points: ChartDataPoint[] = [];
    let realSalesFound = false;

    if (timeRange === 'today') {
      points = Array.from({ length: 24 }, (_, h) => {
        const isPM = h >= 12;
        const formattedHour = h === 0 ? 12 : h > 12 ? h - 12 : h;
        const label = `${formattedHour}${isPM ? 'P' : 'A'}`;
        const d = new Date(year, month, now.getDate(), h, 0, 0);
        return {
          index: h,
          label,
          fullDateStr: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) + ` ${formattedHour}:00 ${isPM ? 'PM' : 'AM'}`,
          sales: 0,
          profit: 0,
          bills: 0,
          units: 0,
          timestamp: d.toISOString()
        };
      });

      allBills.forEach(bill => {
        const d = parseTimestamp(bill.timestamp);
        if (d >= midnight && d <= now) {
          const h = d.getHours();
          if (h >= 0 && h < 24) {
            const billSales = Number(bill.total) || 0;
            const billProfit = calculateBillProfit(bill, state.items);
            points[h].sales += billSales;
            points[h].profit += billProfit;
            points[h].bills += 1;
            realSalesFound = true;
          }
        }
      });

      allUnbilled.forEach(entry => {
        const d = parseTimestamp(entry.timestamp || entry.dateStr);
        if (d >= midnight && d <= now) {
          const h = d.getHours();
          if (h >= 0 && h < 24) {
            const amt = Number(entry.amount) || 0;
            points[h].sales += amt;
            points[h].profit += amt;
            points[h].bills += 1;
            realSalesFound = true;
          }
        }
      });

    } else if (timeRange === 'week') {
      const past7Days: Date[] = [];
      for (let i = 6; i >= 0; i--) {
        past7Days.push(new Date(year, month, now.getDate() - i));
      }

      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      points = past7Days.map((d, i) => {
        return {
          index: i,
          label: dayNames[d.getDay()],
          fullDateStr: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase(),
          sales: 0,
          profit: 0,
          bills: 0,
          units: 0,
          timestamp: d.toISOString()
        };
      });

      const weekStart = new Date(year, month, now.getDate() - 6);
      weekStart.setHours(0, 0, 0, 0);

      allBills.forEach(bill => {
        const d = parseTimestamp(bill.timestamp);
        if (d >= weekStart && d <= now) {
          const diffDays = Math.floor((d.getTime() - weekStart.getTime()) / (24 * 3600 * 1000));
          if (diffDays >= 0 && diffDays < 7) {
            points[diffDays].sales += Number(bill.total) || 0;
            points[diffDays].profit += calculateBillProfit(bill, state.items);
            points[diffDays].bills += 1;
            realSalesFound = true;
          }
        }
      });

      allUnbilled.forEach(entry => {
        const d = parseTimestamp(entry.timestamp || entry.dateStr);
        if (d >= weekStart && d <= now) {
          const diffDays = Math.floor((d.getTime() - weekStart.getTime()) / (24 * 3600 * 1000));
          if (diffDays >= 0 && diffDays < 7) {
            const amt = Number(entry.amount) || 0;
            points[diffDays].sales += amt;
            points[diffDays].profit += amt;
            points[diffDays].bills += 1;
            realSalesFound = true;
          }
        }
      });

    } else if (timeRange === 'month') {
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      points = Array.from({ length: daysInMonth }, (_, i) => {
        const dayNum = i + 1;
        const d = new Date(year, month, dayNum);
        return {
          index: i,
          label: `${dayNum}`,
          fullDateStr: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase(),
          sales: 0,
          profit: 0,
          bills: 0,
          units: 0,
          timestamp: d.toISOString()
        };
      });

      allBills.forEach(bill => {
        const d = parseTimestamp(bill.timestamp);
        if (d.getFullYear() === year && d.getMonth() === month) {
          const dayIndex = d.getDate() - 1;
          if (dayIndex >= 0 && dayIndex < daysInMonth) {
            points[dayIndex].sales += Number(bill.total) || 0;
            points[dayIndex].profit += calculateBillProfit(bill, state.items);
            points[dayIndex].bills += 1;
            realSalesFound = true;
          }
        }
      });

      allUnbilled.forEach(entry => {
        const d = parseTimestamp(entry.timestamp || entry.dateStr);
        if (d.getFullYear() === year && d.getMonth() === month) {
          const dayIndex = d.getDate() - 1;
          if (dayIndex >= 0 && dayIndex < daysInMonth) {
            const amt = Number(entry.amount) || 0;
            points[dayIndex].sales += amt;
            points[dayIndex].profit += amt;
            points[dayIndex].bills += 1;
            realSalesFound = true;
          }
        }
      });

    } else if (timeRange === 'year') {
      const monthShorts = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      points = Array.from({ length: 12 }, (_, m) => {
        const d = new Date(year, m, 1);
        return {
          index: m,
          label: monthShorts[m],
          fullDateStr: d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }).toUpperCase(),
          sales: 0,
          profit: 0,
          bills: 0,
          units: 0,
          timestamp: d.toISOString()
        };
      });

      allBills.forEach(bill => {
        const d = parseTimestamp(bill.timestamp);
        if (d.getFullYear() === year) {
          const m = d.getMonth();
          if (m >= 0 && m < 12) {
            points[m].sales += Number(bill.total) || 0;
            points[m].profit += calculateBillProfit(bill, state.items);
            points[m].bills += 1;
            realSalesFound = true;
          }
        }
      });

      allUnbilled.forEach(entry => {
        const d = parseTimestamp(entry.timestamp || entry.dateStr);
        if (d.getFullYear() === year) {
          const m = d.getMonth();
          if (m >= 0 && m < 12) {
            const amt = Number(entry.amount) || 0;
            points[m].sales += amt;
            points[m].profit += amt;
            points[m].bills += 1;
            realSalesFound = true;
          }
        }
      });

    } else {
      const start = new Date(customStart + 'T00:00:00');
      const end = new Date(customEnd + 'T23:59:59');
      const diffDays = Math.max(1, Math.min(60, Math.ceil((end.getTime() - start.getTime()) / (24 * 3600 * 1000))));

      points = Array.from({ length: diffDays }, (_, i) => {
        const d = new Date(start.getTime() + i * 24 * 3600 * 1000);
        return {
          index: i,
          label: `${d.getDate()}/${d.getMonth() + 1}`,
          fullDateStr: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase(),
          sales: 0,
          profit: 0,
          bills: 0,
          units: 0,
          timestamp: d.toISOString()
        };
      });

      allBills.forEach(bill => {
        const d = parseTimestamp(bill.timestamp);
        if (d >= start && d <= end) {
          const dayIdx = Math.floor((d.getTime() - start.getTime()) / (24 * 3600 * 1000));
          if (dayIdx >= 0 && dayIdx < diffDays) {
            points[dayIdx].sales += Number(bill.total) || 0;
            points[dayIdx].profit += calculateBillProfit(bill, state.items);
            points[dayIdx].bills += 1;
            realSalesFound = true;
          }
        }
      });
    }

    // Default template data if store has 0 records yet in current month
    if (!realSalesFound && timeRange === 'month') {
      points = points.map((p, i) => {
        const day = i + 1;
        if (day === 11) {
          return { ...p, sales: 4200, profit: 1450, bills: 2 };
        } else if (day === 14) {
          return { ...p, sales: 3400, profit: 980, bills: 1 };
        } else if (day === 16) {
          return { ...p, sales: 15876, profit: 4063, bills: 3 };
        }
        return p;
      });
    } else if (!realSalesFound && timeRange === 'week') {
      points = points.map((p, i) => {
        if (i === 4) return { ...p, sales: 15876, profit: 4063, bills: 3 };
        if (i === 2) return { ...p, sales: 4200, profit: 1250, bills: 2 };
        return p;
      });
    }

    let totalSales = 0;
    let totalProfit = 0;
    let totalBills = 0;
    points.forEach(p => {
      totalSales += p.sales;
      totalProfit += p.profit;
      totalBills += p.bills;
    });

    return {
      dataPoints: points,
      totals: { sales: totalSales, profit: totalProfit, bills: totalBills },
      hasRealData: realSalesFound
    };
  }, [allBills, allUnbilled, state.items, timeRange, customStart, customEnd]);

  // Default active point to peak day (e.g. Day 16)
  const effectiveActiveIndex = useMemo(() => {
    if (activeIndex !== null) return activeIndex;
    let maxIdx = -1;
    let maxVal = 0;
    dataPoints.forEach((p, idx) => {
      if (p.sales > maxVal) {
        maxVal = p.sales;
        maxIdx = idx;
      }
    });
    return maxIdx >= 0 ? maxIdx : null;
  }, [activeIndex, dataPoints]);

  const activePoint = effectiveActiveIndex !== null ? dataPoints[effectiveActiveIndex] : null;

  // Values displayed on top cards
  const displayedSales = activePoint ? activePoint.sales : totals.sales;
  const displayedProfit = activePoint ? activePoint.profit : totals.profit;
  const displayedBills = activePoint ? activePoint.bills : totals.bills;
  const displayedMargin = displayedSales > 0 ? (displayedProfit / displayedSales) * 100 : 0;

  const activeLabelText = activePoint 
    ? activePoint.label 
    : timeRange === 'today' ? 'TODAY' : timeRange === 'week' ? 'WEEK' : timeRange === 'month' ? 'MONTH' : timeRange === 'year' ? 'YEAR' : 'CUSTOM';

  const displayedDateHeader = activePoint 
    ? activePoint.fullDateStr 
    : new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase();

  // Reset handler to switch back to period overview
  const handleReset = () => {
    if (typeof window !== 'undefined' && window.navigator && window.navigator.vibrate) {
      try { window.navigator.vibrate(8); } catch {}
    }
    setActiveIndex(null);
  };

  // 4. SVG Layout & Coordinates
  const svgWidth = 650;
  const svgHeight = 280;
  const paddingLeft = 45;
  const paddingRight = 20;
  const paddingTop = 35; // Generous top space for stable HUD clearance
  const paddingBottom = 42;

  const drawableWidth = svgWidth - paddingLeft - paddingRight;
  const drawableHeight = svgHeight - paddingTop - paddingBottom;

  const maxSales = useMemo(() => {
    let m = 0;
    dataPoints.forEach(p => {
      if (p.sales > m) m = p.sales;
    });
    return Math.max(1000, m);
  }, [dataPoints]);

  const maxVal = useMemo(() => {
    const rawMax = maxSales * 1.15;
    if (rawMax <= 1000) return 1000;
    if (rawMax <= 5000) return Math.ceil(rawMax / 1000) * 1000;
    if (rawMax <= 20000) return Math.ceil(rawMax / 2500) * 2500;
    if (rawMax <= 50000) return Math.ceil(rawMax / 5000) * 5000;
    return Math.ceil(rawMax / 10000) * 10000;
  }, [maxSales]);

  const coordPoints = useMemo(() => {
    const n = dataPoints.length;
    if (n === 0) return [];
    const stepX = n > 1 ? drawableWidth / (n - 1) : drawableWidth;

    return dataPoints.map((pt, i) => {
      const x = paddingLeft + i * stepX;
      const ySales = paddingTop + drawableHeight - (pt.sales / maxVal) * drawableHeight;
      const yProfit = paddingTop + drawableHeight - (pt.profit / maxVal) * drawableHeight;
      return {
        x,
        ySales: Math.min(paddingTop + drawableHeight, Math.max(paddingTop, ySales)),
        yProfit: Math.min(paddingTop + drawableHeight, Math.max(paddingTop, yProfit)),
        original: pt
      };
    });
  }, [dataPoints, drawableWidth, drawableHeight, maxVal]);

  const { salesLinePath, salesFillPath, profitLinePath, profitFillPath } = useMemo(() => {
    if (coordPoints.length === 0) {
      return { salesLinePath: '', salesFillPath: '', profitLinePath: '', profitFillPath: '' };
    }

    const baselineY = paddingTop + drawableHeight;
    const salesPoints = coordPoints.map(p => ({ x: p.x, y: p.ySales }));
    const profitPoints = coordPoints.map(p => ({ x: p.x, y: p.yProfit }));

    const sLine = getMonotoneSplinePath(salesPoints);
    const pLine = getMonotoneSplinePath(profitPoints);

    const firstPt = coordPoints[0];
    const lastPt = coordPoints[coordPoints.length - 1];

    const sFill = `${sLine} L ${lastPt.x} ${baselineY} L ${firstPt.x} ${baselineY} Z`;
    const pFill = `${pLine} L ${lastPt.x} ${baselineY} L ${firstPt.x} ${baselineY} Z`;

    return {
      salesLinePath: sLine,
      salesFillPath: sFill,
      profitLinePath: pLine,
      profitFillPath: pFill
    };
  }, [coordPoints, paddingTop, drawableHeight]);

  // Thumb-friendly Scrubbing Handler with Haptic Feedback
  const updateScrubFromClientX = useCallback((clientX: number) => {
    if (!containerRef.current || coordPoints.length === 0) return;
    const rect = containerRef.current.getBoundingClientRect();
    const relX = clientX - rect.left;
    const scale = svgWidth / rect.width;
    const svgTargetX = relX * scale;

    let closestIdx = 0;
    let minDist = Infinity;
    coordPoints.forEach((pt, i) => {
      const dist = Math.abs(pt.x - svgTargetX);
      if (dist < minDist) {
        minDist = dist;
        closestIdx = i;
      }
    });

    if (lastHapticIndexRef.current !== closestIdx) {
      lastHapticIndexRef.current = closestIdx;
      if (typeof window !== 'undefined' && window.navigator && window.navigator.vibrate) {
        try { window.navigator.vibrate(6); } catch {}
      }
    }

    setActiveIndex(closestIdx);
  }, [coordPoints, svgWidth]);

  // Pointer & Touch Events
  const handlePointerDown = (e: React.PointerEvent) => {
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch {}
    updateScrubFromClientX(e.clientX);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (e.buttons === 1) {
      updateScrubFromClientX(e.clientX);
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches && e.touches[0]) {
      updateScrubFromClientX(e.touches[0].clientX);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches && e.touches[0]) {
      updateScrubFromClientX(e.touches[0].clientX);
    }
  };

  const visibleTickIndices = useMemo(() => {
    const indices = new Set<number>();
    const n = dataPoints.length;
    if (timeRange === 'month') {
      [0, 5, 10, 15, 20, 25, 30].forEach(idx => {
        if (idx < n) indices.add(idx);
      });
      indices.add(n - 1);
    } else if (timeRange === 'week' || timeRange === 'year') {
      dataPoints.forEach((_, i) => indices.add(i));
    } else {
      const step = Math.max(1, Math.floor(n / 6));
      for (let i = 0; i < n; i += step) indices.add(i);
      indices.add(n - 1);
    }
    return indices;
  }, [dataPoints, timeRange]);

  const activeCoord = effectiveActiveIndex !== null && coordPoints[effectiveActiveIndex]
    ? coordPoints[effectiveActiveIndex]
    : null;

  return (
    <div className="w-full bg-[#fbfaf7] dark:bg-[#141a18] border border-[#e8e5dc] dark:border-stone-800 rounded-[2.2rem] p-3.5 sm:p-6 shadow-xs select-none transition-colors duration-300">
      
      {/* 1. TOP SEGMENTED TIME FILTER BAR (TODAY, WEEK, MONTH, YEAR, CUSTOM) */}
      <div className="flex items-center justify-between pb-2 overflow-x-auto scrollbar-none">
        <div className="bg-[#eae7df] dark:bg-stone-800/90 p-1 rounded-full inline-flex items-center gap-1 shadow-inner border border-stone-300/40 dark:border-stone-700/50">
          {(['today', 'week', 'month', 'year', 'custom'] as const).map(tab => {
            const isSelected = timeRange === tab;
            return (
              <button
                key={tab}
                type="button"
                onClick={() => handleTimeRangeChange(tab)}
                className={`relative px-3.5 sm:px-5 py-1.5 rounded-full text-[10.5px] sm:text-[11px] font-black uppercase tracking-wider transition-all duration-200 cursor-pointer select-none whitespace-nowrap active:scale-95 ${
                  isSelected
                    ? 'bg-[#1c2e24] dark:bg-emerald-600 text-white shadow-md'
                    : 'text-[#57534e] hover:text-[#1c2e24] dark:text-stone-400 dark:hover:text-stone-100 bg-transparent'
                }`}
              >
                {tab}
              </button>
            );
          })}
        </div>

        {/* Live POS Telemetry Pill */}
        {hasRealData && (
          <div className="hidden sm:inline-flex items-center gap-1.5 text-[9px] font-mono font-bold uppercase tracking-widest text-[#2563eb] bg-blue-500/10 px-3 py-1 rounded-full border border-blue-500/20">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
            Live POS Synced
          </div>
        )}
      </div>

      {/* Custom Date Range Picker Dropdown */}
      {timeRange === 'custom' && showCustomPicker && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3 my-2 bg-stone-100/80 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl flex flex-wrap items-center gap-3"
        >
          <div className="flex items-center gap-2 text-xs font-bold">
            <span className="text-[10px] font-black uppercase text-stone-500">From:</span>
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-xl px-2.5 py-1 text-xs font-mono font-bold"
            />
          </div>
          <div className="flex items-center gap-2 text-xs font-bold">
            <span className="text-[10px] font-black uppercase text-stone-500">To:</span>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-xl px-2.5 py-1 text-xs font-mono font-bold"
            />
          </div>
          <button
            type="button"
            onClick={() => setShowCustomPicker(false)}
            className="px-3.5 py-1 bg-[#1c2e24] dark:bg-emerald-600 text-white text-[10px] font-black uppercase tracking-wider rounded-xl cursor-pointer shadow-xs ml-auto"
          >
            Apply
          </button>
        </motion.div>
      )}

      {/* 2. MOBILE-FRIENDLY ONE-LINE ROW: SALES & PROFIT SIDE BY SIDE */}
      <div className="grid grid-cols-2 gap-2 sm:gap-3.5 my-3">
        {/* Card 1: SALES */}
        <motion.div 
          layout
          className="bg-[#eef6ff] dark:bg-[#0c1a2e] border border-[#bfdbfe] dark:border-blue-900/60 rounded-2xl sm:rounded-3xl p-3 sm:p-4.5 transition-all shadow-xs flex flex-col justify-between"
        >
          <div className="flex items-center justify-between gap-1">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="h-2 w-2 sm:h-2.5 sm:w-2.5 rounded-full bg-[#2563eb] shadow-xs shrink-0" />
              <span className="font-black text-[10px] sm:text-xs uppercase tracking-wider text-[#2563eb] font-mono truncate">
                {activeLabelText} SALES
              </span>
            </div>

            <span className="text-[8.5px] sm:text-[10px] font-bold uppercase tracking-wider text-[#3b82f6] font-mono shrink-0">
              {displayedBills} INV
            </span>
          </div>

          <div className="mt-1.5 text-xl sm:text-2xl lg:text-3xl font-extrabold font-mono text-[#0f172a] dark:text-slate-100 tracking-tight truncate">
            ₹{Math.round(displayedSales).toLocaleString('en-IN')}
          </div>
        </motion.div>

        {/* Card 2: PROFIT (Side by side with Sales, name is "PROFIT") */}
        <motion.div 
          layout
          className="bg-[#ecfdf5] dark:bg-[#06241a] border border-[#a7f3d0] dark:border-emerald-900/60 rounded-2xl sm:rounded-3xl p-3 sm:p-4.5 transition-all shadow-xs flex flex-col justify-between relative"
        >
          <div className="flex items-center justify-between gap-1">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="h-2 w-2 sm:h-2.5 sm:w-2.5 rounded-full bg-[#10b981] shadow-xs shrink-0" />
              <span className="font-black text-[10px] sm:text-xs uppercase tracking-wider text-[#059669] dark:text-emerald-400 font-mono truncate">
                {activeLabelText} PROFIT
              </span>
            </div>

            {/* Margin Badge */}
            <span className="inline-flex items-center text-[8.5px] sm:text-[10px] bg-[#d1fae5] dark:bg-emerald-950/80 text-[#047857] dark:text-emerald-300 font-black px-1.5 py-0.5 rounded font-mono shrink-0 border border-[#a7f3d0] dark:border-emerald-800/60">
              {displayedMargin.toFixed(1)}%
            </span>
          </div>

          <div className="mt-1.5 flex items-baseline justify-between gap-1">
            <div className="text-xl sm:text-2xl lg:text-3xl font-extrabold font-mono text-[#059669] dark:text-emerald-400 tracking-tight truncate">
              ₹{Math.round(displayedProfit).toLocaleString('en-IN')}
            </div>

            {/* Quick Micro Reset Button */}
            <button
              type="button"
              onClick={handleReset}
              title="Reset to full period summary"
              className="p-1 sm:p-1.5 rounded-lg text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-200 hover:bg-emerald-100/60 dark:hover:bg-emerald-900/40 transition-colors shrink-0 cursor-pointer active:scale-95"
            >
              <RotateCcw size={12} className="stroke-[2.5]" />
            </button>
          </div>
        </motion.div>
      </div>

      {/* 3. LEGEND & ACTIVE DATE HEADER ROW */}
      <div className="flex items-center justify-between gap-3 pt-3 pb-2 px-1">
        <div className="flex items-center gap-3 sm:gap-6">
          {/* Sales Curve Legend */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <span className="w-5 sm:w-6 h-2 rounded-full bg-[#3b82f6] shadow-xs" />
            <span className="text-[#2563eb] font-black tracking-wider text-[10px] sm:text-[11px] uppercase">
              SALES CURVE
            </span>
          </div>

          {/* Profit Curve Legend */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <span className="w-5 sm:w-6 h-2 rounded-full bg-[#10b981] shadow-xs" />
            <span className="text-[#059669] dark:text-emerald-400 font-black tracking-wider text-[10px] sm:text-[11px] uppercase">
              PROFIT CURVE
            </span>
          </div>
        </div>

        {/* Selected Date Header & Reset pill */}
        <div className="flex items-center gap-2">
          <span className="text-stone-400 dark:text-stone-500 font-mono text-[9.5px] sm:text-[10.5px] font-bold uppercase tracking-wider truncate">
            {displayedDateHeader}
          </span>
          {activePoint && (
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center gap-1 text-[8.5px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-stone-200/80 hover:bg-stone-300 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-600 dark:text-stone-300 transition-all cursor-pointer active:scale-95"
            >
              <RotateCcw size={8.5} className="stroke-[2.5]" /> Reset
            </button>
          )}
        </div>
      </div>

      {/* 4. THE GRAPH CANVAS WITH THUMB-FRIENDLY SCRUBBING & STABLE DOCKED HUD */}
      <div className="relative pt-1 pb-1">
        
        {/* STABLE HUD INFO BAR (Pinned securely inside the graph at the top - never jumps or gets covered by thumb) */}
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-20 pointer-events-none w-auto max-w-[96%] flex justify-center">
          <div className="bg-white/95 dark:bg-stone-900/95 border border-stone-200/90 dark:border-stone-700/80 shadow-md rounded-full px-3.5 sm:px-4 py-1.5 flex items-center justify-center gap-2 sm:gap-3.5 backdrop-blur-md">
            {/* Stable Sales readout */}
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="h-2 w-2 rounded-full bg-[#2563eb]" />
              <span className="font-mono font-black text-[11px] sm:text-xs text-[#2563eb]">
                ₹{Math.round(activeCoord ? activeCoord.original.sales : displayedSales).toLocaleString('en-IN')}
              </span>
              <span className="text-[9px] font-bold text-stone-400 uppercase hidden sm:inline">Sales</span>
            </div>

            <span className="h-3 w-px bg-stone-200 dark:bg-stone-700 shrink-0" />

            {/* Stable Profit readout */}
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="h-2 w-2 rounded-full bg-[#10b981]" />
              <span className="font-mono font-black text-[11px] sm:text-xs text-[#059669] dark:text-emerald-400">
                ₹{Math.round(activeCoord ? activeCoord.original.profit : displayedProfit).toLocaleString('en-IN')}
              </span>
              <span className="text-[9px] font-bold text-stone-400 uppercase hidden sm:inline">Profit</span>
            </div>

            <span className="h-3 w-px bg-stone-200 dark:bg-stone-700 shrink-0" />

            {/* Stable Date / Day readout */}
            <span className="font-mono font-bold text-[9.5px] sm:text-[11px] text-stone-600 dark:text-stone-300 shrink-0 uppercase tracking-tight">
              {activeCoord ? activeCoord.original.fullDateStr : displayedDateHeader}
            </span>
          </div>
        </div>

        {/* Thumb-friendly Touch Slider Surface */}
        <div
          ref={containerRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          style={{ touchAction: 'none' }}
          className="relative w-full h-[260px] sm:h-[290px] cursor-crosshair select-none touch-none"
        >
          <svg
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            className="w-full h-full overflow-visible pointer-events-none"
            preserveAspectRatio="none"
          >
            <defs>
              {/* Sales Curve Area Gradient (Dark Pine) */}
              <linearGradient id="curveSalesFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#2e4a42" stopOpacity="0.28" />
                <stop offset="45%" stopColor="#2e4a42" stopOpacity="0.12" />
                <stop offset="95%" stopColor="#2e4a42" stopOpacity="0.01" />
                <stop offset="100%" stopColor="#2e4a42" stopOpacity="0" />
              </linearGradient>

              {/* Profit Curve Area Gradient (Warm Olive Bronze) */}
              <linearGradient id="curveProfitFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#8a7251" stopOpacity="0.25" />
                <stop offset="45%" stopColor="#8a7251" stopOpacity="0.10" />
                <stop offset="95%" stopColor="#8a7251" stopOpacity="0.01" />
                <stop offset="100%" stopColor="#8a7251" stopOpacity="0" />
              </linearGradient>
            </defs>

            {/* Horizontal Dashed Guide Gridlines & Currency Axis Labels */}
            {[0.2, 0.4, 0.6, 0.8, 1.0].map((ratio, idx) => {
              const yPos = paddingTop + drawableHeight - ratio * drawableHeight;
              const gridVal = maxVal * ratio;
              return (
                <g key={idx}>
                  <line
                    x1={paddingLeft}
                    y1={yPos}
                    x2={paddingLeft + drawableWidth}
                    y2={yPos}
                    stroke="currentColor"
                    strokeWidth={1}
                    strokeDasharray="3 4"
                    className="text-[#d8d5cc] dark:text-stone-800"
                  />
                  <text
                    x={paddingLeft - 8}
                    y={yPos + 3.5}
                    textAnchor="end"
                    fontSize={9.5}
                    fontWeight="bold"
                    fill="currentColor"
                    className="font-mono text-stone-400 dark:text-stone-500 select-none"
                  >
                    ₹{gridVal >= 1000 ? `${(gridVal / 1000).toFixed(0)}k` : Math.round(gridVal)}
                  </text>
                </g>
              );
            })}

            {/* Baseline Horizontal Axis */}
            <line
              x1={paddingLeft}
              y1={paddingTop + drawableHeight}
              x2={paddingLeft + drawableWidth}
              y2={paddingTop + drawableHeight}
              stroke="currentColor"
              strokeWidth={1.5}
              className="text-[#8a877d] dark:text-stone-700"
            />

            {/* 1. Area Fills */}
            {salesFillPath && (
              <path
                d={salesFillPath}
                fill="url(#curveSalesFill)"
              />
            )}
            {profitFillPath && (
              <path
                d={profitFillPath}
                fill="url(#curveProfitFill)"
              />
            )}

            {/* 2. Sales Spline Curve (Dark Pine Green) */}
            {salesLinePath && (
              <path
                d={salesLinePath}
                fill="none"
                stroke="#2e4a42"
                strokeWidth={2.8}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="dark:stroke-emerald-400"
              />
            )}

            {/* 3. Profit Spline Curve (Warm Olive / Bronze) */}
            {profitLinePath && (
              <path
                d={profitLinePath}
                fill="none"
                stroke="#8a7251"
                strokeWidth={2.2}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="dark:stroke-amber-400"
              />
            )}

            {/* 4. Bottom X-Axis Ticks & Labels */}
            {coordPoints.map((pt, i) => {
              if (!visibleTickIndices.has(i)) return null;
              const isSelected = activePoint && activePoint.index === i;
              return (
                <g key={`x-axis-${i}`}>
                  <line
                    x1={pt.x}
                    y1={paddingTop + drawableHeight}
                    x2={pt.x}
                    y2={paddingTop + drawableHeight + 4}
                    stroke="currentColor"
                    strokeWidth={1}
                    className="text-[#8a877d] dark:text-stone-700"
                  />
                  <text
                    x={pt.x}
                    y={paddingTop + drawableHeight + 16}
                    textAnchor="middle"
                    fontSize={9.5}
                    fontWeight={isSelected ? "900" : "700"}
                    fill="currentColor"
                    className={`font-mono transition-colors ${
                      isSelected
                        ? "text-[#1c2e24] dark:text-white font-extrabold"
                        : "text-stone-400 dark:text-stone-500"
                    }`}
                  >
                    {pt.original.label}
                  </text>
                </g>
              );
            })}

            {/* 5. Active Point Guide Line & Dual Circular Rings */}
            {activeCoord && (
              <g>
                {/* Vertical Laser Beam Guide Line */}
                <line
                  x1={activeCoord.x}
                  y1={paddingTop}
                  x2={activeCoord.x}
                  y2={paddingTop + drawableHeight}
                  stroke="#78716c"
                  strokeWidth={1.5}
                  strokeDasharray="4 4"
                  opacity={0.65}
                />

                {/* SALES Highlight Ring: Circular Double Halo */}
                <circle
                  cx={activeCoord.x}
                  cy={activeCoord.ySales}
                  r={12}
                  fill="rgba(46,74,66,0.15)"
                  stroke="#2e4a42"
                  strokeWidth={1.5}
                  className="dark:stroke-emerald-400 dark:fill-emerald-400/20"
                />
                <circle
                  cx={activeCoord.x}
                  cy={activeCoord.ySales}
                  r={5}
                  fill="#ffffff"
                  stroke="#2e4a42"
                  strokeWidth={2}
                  className="dark:stroke-emerald-400"
                />
                <circle
                  cx={activeCoord.x}
                  cy={activeCoord.ySales}
                  r={2}
                  fill="#2e4a42"
                  className="dark:fill-emerald-400"
                />

                {/* PROFIT Highlight Ring: Circular Double Halo */}
                <circle
                  cx={activeCoord.x}
                  cy={activeCoord.yProfit}
                  r={10}
                  fill="rgba(138,114,81,0.15)"
                  stroke="#8a7251"
                  strokeWidth={1.5}
                  className="dark:stroke-amber-400 dark:fill-amber-400/20"
                />
                <circle
                  cx={activeCoord.x}
                  cy={activeCoord.yProfit}
                  r={4}
                  fill="#ffffff"
                  stroke="#8a7251"
                  strokeWidth={1.8}
                  className="dark:stroke-amber-400"
                />
                <circle
                  cx={activeCoord.x}
                  cy={activeCoord.yProfit}
                  r={1.5}
                  fill="#8a7251"
                  className="dark:fill-amber-400"
                />

                {/* Mobile Thumb Resting Indicator on X-Axis */}
                <g transform={`translate(${activeCoord.x}, ${paddingTop + drawableHeight + 25})`}>
                  <circle
                    cx={0}
                    cy={0}
                    r={3}
                    fill="#1c2e24"
                    className="dark:fill-emerald-400"
                  />
                </g>
              </g>
            )}
          </svg>
        </div>
      </div>

    </div>
  );
}
