import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { 
  TrendingUp, TrendingDown, Receipt, 
  ArrowUpRight, ArrowDownRight, RotateCcw,
  Sparkles, Percent, BarChart3, LineChart, Activity, Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { AppState, Bill, UnbilledEntry } from '../types';
import { calculateBillProfit, parseTimestamp } from '../lib/utils';

export type TimeRangeType = 'today' | 'week' | 'month' | 'year' | 'custom';
export type MetricMode = 'sales' | 'profit' | 'dual';
export type ChartStyle = 'spline' | 'bars';

interface PremiumInteractiveChartProps {
  state: AppState;
  timePeriod?: 'today' | 'week' | 'month' | 'year' | 'all';
  onTimePeriodChange?: (period: 'today' | 'week' | 'month' | 'year' | 'all') => void;
  currentBills: Bill[];
  currentUnbilled?: UnbilledEntry[];
  themeChartColors?: any;
}

export interface DataPoint {
  label: string;
  subLabel?: string;
  fullLabel: string;
  sales: number;
  profit: number;
  bills: number;
  units: number;
  timestamp: string;
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

export default function PremiumInteractiveChart({
  state,
  timePeriod: parentTimePeriod,
  onTimePeriodChange,
  currentBills = [],
  currentUnbilled = [],
  themeChartColors
}: PremiumInteractiveChartProps) {
  // 1. Time Range State: today, week, month, year, custom
  const [timeRange, setTimeRange] = useState<TimeRangeType>(() => {
    if (parentTimePeriod === 'today') return 'today';
    if (parentTimePeriod === 'week') return 'week';
    if (parentTimePeriod === 'month') return 'month';
    if (parentTimePeriod === 'year') return 'year';
    return 'today';
  });

  // App-native View Options: Metric Mode (Sales, Profit, Dual) and Chart Style (Spline Curve vs App Bar Pillars)
  const [metricMode, setMetricMode] = useState<MetricMode>('dual');
  const [chartStyle, setChartStyle] = useState<ChartStyle>('spline');

  // Custom date range state (defaults to past 14 days)
  const [customStart, setCustomStart] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 14);
    return d.toISOString().split('T')[0];
  });
  const [customEnd, setCustomEnd] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [showCustomPicker, setShowCustomPicker] = useState(false);

  // Sync with parent time period if parent changes
  useEffect(() => {
    if (parentTimePeriod === 'today') setTimeRange('today');
    else if (parentTimePeriod === 'week') setTimeRange('week');
    else if (parentTimePeriod === 'month') setTimeRange('month');
    else if (parentTimePeriod === 'year') setTimeRange('year');
  }, [parentTimePeriod]);

  // Notify parent on change if provided
  const handleTimeRangeChange = (newRange: TimeRangeType) => {
    if (typeof window !== 'undefined' && window.navigator && window.navigator.vibrate) {
      try { window.navigator.vibrate(12); } catch {}
    }
    setTimeRange(newRange);
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

  // 2. Touch / Scrub state
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [isInteracting, setIsInteracting] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const lastHapticIndexRef = useRef<number | null>(null);

  // Raw bills & unbilled records from app state
  const allBills = useMemo(() => state.bills || [], [state.bills]);
  const allUnbilled = useMemo(() => {
    const fromState = state.unbilledEntries || [];
    const map = new Map<string, UnbilledEntry>();
    [...currentUnbilled, ...fromState].forEach(e => {
      if (e && e.id) map.set(e.id, e);
    });
    return Array.from(map.values());
  }, [state.unbilledEntries, currentUnbilled]);

  // Clear activeIndex when switching timeRange
  useEffect(() => {
    setActiveIndex(null);
  }, [timeRange, customStart, customEnd]);

  // 3. Generate both Sales & Profit data points & comparison metrics
  const { dataPoints, totals, prevTotals, hasAnyData } = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    let points: DataPoint[] = [];
    let prevSalesTotal = 0;
    let prevProfitTotal = 0;
    let prevBillsTotal = 0;
    let prevUnitsTotal = 0;

    let currSalesTotal = 0;
    let currProfitTotal = 0;
    let currBillsTotal = 0;
    let currUnitsTotal = 0;

    if (timeRange === 'today') {
      // 24 hourly buckets for Today (00:00 to 23:00)
      points = Array.from({ length: 24 }, (_, h) => {
        const isPM = h >= 12;
        const formattedHour = h === 0 ? 12 : h > 12 ? h - 12 : h;
        const label = `${formattedHour}${isPM ? 'P' : 'A'}`;
        const fullLabel = `Today · ${formattedHour}:00 ${isPM ? 'PM' : 'AM'}`;
        return {
          label,
          fullLabel,
          sales: 0,
          profit: 0,
          bills: 0,
          units: 0,
          timestamp: new Date(year, month, now.getDate(), h, 0, 0).toISOString()
        };
      });

      // Populate current today's bills
      allBills.forEach(bill => {
        const d = parseTimestamp(bill.timestamp);
        if (d >= midnight && d <= now) {
          const h = d.getHours();
          if (h >= 0 && h < 24) {
            const billSales = Number(bill.total) || 0;
            const billProfit = getBillProfit(bill, state.items);
            let billUnits = 0;
            if (Array.isArray(bill.items)) {
              bill.items.forEach(item => {
                const q = Number(item.quantity);
                billUnits += (!isNaN(q) && q > 0) ? q : 1;
              });
            } else {
              billUnits = 1;
            }

            points[h].sales += billSales;
            points[h].profit += billProfit;
            points[h].bills += 1;
            points[h].units += billUnits;
          }
        }
      });

      // Populate current today's unbilled entries
      allUnbilled.forEach(entry => {
        const d = parseTimestamp(entry.timestamp || entry.dateStr);
        if (d >= midnight && d <= now) {
          const h = d.getHours();
          if (h >= 0 && h < 24) {
            const amt = Number(entry.amount) || 0;
            points[h].sales += amt;
            points[h].profit += amt;
            points[h].bills += 1;
            points[h].units += 1;
          }
        }
      });

      // Previous period: Yesterday
      const yesterdayMidnight = new Date(midnight.getTime() - 24 * 3600 * 1000);
      const yesterdayCutoff = new Date(now.getTime() - 24 * 3600 * 1000);

      allBills.forEach(bill => {
        const d = parseTimestamp(bill.timestamp);
        if (d >= yesterdayMidnight && d <= yesterdayCutoff) {
          prevSalesTotal += Number(bill.total) || 0;
          prevProfitTotal += getBillProfit(bill, state.items);
          prevBillsTotal += 1;
          if (Array.isArray(bill.items)) {
            bill.items.forEach(item => {
              const q = Number(item.quantity);
              prevUnitsTotal += (!isNaN(q) && q > 0) ? q : 1;
            });
          } else {
            prevUnitsTotal += 1;
          }
        }
      });

      allUnbilled.forEach(entry => {
        const d = parseTimestamp(entry.timestamp || entry.dateStr);
        if (d >= yesterdayMidnight && d <= yesterdayCutoff) {
          const amt = Number(entry.amount) || 0;
          prevSalesTotal += amt;
          prevProfitTotal += amt;
          prevBillsTotal += 1;
          prevUnitsTotal += 1;
        }
      });

    } else if (timeRange === 'week') {
      // 7 days of this week (Mon-Sun or past 7 days)
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const past7Days: Date[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(year, month, now.getDate() - i);
        past7Days.push(d);
      }

      points = past7Days.map(d => {
        const dayIdx = d.getDay();
        const dateNum = d.getDate();
        const label = dayNames[dayIdx];
        const fullLabel = `${d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}`;
        return {
          label,
          fullLabel,
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
            const billSales = Number(bill.total) || 0;
            const billProfit = getBillProfit(bill, state.items);
            let billUnits = 0;
            if (Array.isArray(bill.items)) {
              bill.items.forEach(item => {
                const q = Number(item.quantity);
                billUnits += (!isNaN(q) && q > 0) ? q : 1;
              });
            } else {
              billUnits = 1;
            }

            points[diffDays].sales += billSales;
            points[diffDays].profit += billProfit;
            points[diffDays].bills += 1;
            points[diffDays].units += billUnits;
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
            points[diffDays].units += 1;
          }
        }
      });

      // Previous 7 days
      const prevWeekStart = new Date(weekStart.getTime() - 7 * 24 * 3600 * 1000);
      const prevWeekEnd = new Date(weekStart.getTime());

      allBills.forEach(bill => {
        const d = parseTimestamp(bill.timestamp);
        if (d >= prevWeekStart && d < prevWeekEnd) {
          prevSalesTotal += Number(bill.total) || 0;
          prevProfitTotal += getBillProfit(bill, state.items);
          prevBillsTotal += 1;
          if (Array.isArray(bill.items)) {
            bill.items.forEach(item => {
              const q = Number(item.quantity);
              prevUnitsTotal += (!isNaN(q) && q > 0) ? q : 1;
            });
          } else {
            prevUnitsTotal += 1;
          }
        }
      });

      allUnbilled.forEach(entry => {
        const d = parseTimestamp(entry.timestamp || entry.dateStr);
        if (d >= prevWeekStart && d < prevWeekEnd) {
          const amt = Number(entry.amount) || 0;
          prevSalesTotal += amt;
          prevProfitTotal += amt;
          prevBillsTotal += 1;
          prevUnitsTotal += 1;
        }
      });

    } else if (timeRange === 'month') {
      // Days of this month
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      points = Array.from({ length: daysInMonth }, (_, i) => {
        const dayNum = i + 1;
        const bucketDate = new Date(year, month, dayNum);
        return {
          label: `${dayNum}`,
          fullLabel: `${bucketDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`,
          sales: 0,
          profit: 0,
          bills: 0,
          units: 0,
          timestamp: bucketDate.toISOString()
        };
      });

      allBills.forEach(bill => {
        const d = parseTimestamp(bill.timestamp);
        if (d.getFullYear() === year && d.getMonth() === month) {
          const dayIdx = d.getDate() - 1;
          if (dayIdx >= 0 && dayIdx < daysInMonth) {
            const billSales = Number(bill.total) || 0;
            const billProfit = getBillProfit(bill, state.items);
            let billUnits = 0;
            if (Array.isArray(bill.items)) {
              bill.items.forEach(item => {
                const q = Number(item.quantity);
                billUnits += (!isNaN(q) && q > 0) ? q : 1;
              });
            } else {
              billUnits = 1;
            }

            points[dayIdx].sales += billSales;
            points[dayIdx].profit += billProfit;
            points[dayIdx].bills += 1;
            points[dayIdx].units += billUnits;
          }
        }
      });

      allUnbilled.forEach(entry => {
        const d = parseTimestamp(entry.timestamp || entry.dateStr);
        if (d.getFullYear() === year && d.getMonth() === month) {
          const dayIdx = d.getDate() - 1;
          if (dayIdx >= 0 && dayIdx < daysInMonth) {
            const amt = Number(entry.amount) || 0;
            points[dayIdx].sales += amt;
            points[dayIdx].profit += amt;
            points[dayIdx].bills += 1;
            points[dayIdx].units += 1;
          }
        }
      });

      // Previous Calendar Month
      const prevMonth = month === 0 ? 11 : month - 1;
      const prevYear = month === 0 ? year - 1 : year;

      allBills.forEach(bill => {
        const d = parseTimestamp(bill.timestamp);
        if (d.getFullYear() === prevYear && d.getMonth() === prevMonth) {
          prevSalesTotal += Number(bill.total) || 0;
          prevProfitTotal += getBillProfit(bill, state.items);
          prevBillsTotal += 1;
          if (Array.isArray(bill.items)) {
            bill.items.forEach(item => {
              const q = Number(item.quantity);
              prevUnitsTotal += (!isNaN(q) && q > 0) ? q : 1;
            });
          } else {
            prevUnitsTotal += 1;
          }
        }
      });

      allUnbilled.forEach(entry => {
        const d = parseTimestamp(entry.timestamp || entry.dateStr);
        if (d.getFullYear() === prevYear && d.getMonth() === prevMonth) {
          const amt = Number(entry.amount) || 0;
          prevSalesTotal += amt;
          prevProfitTotal += amt;
          prevBillsTotal += 1;
          prevUnitsTotal += 1;
        }
      });

    } else if (timeRange === 'year') {
      // 12 Months of this Year
      const monthShort = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      points = monthShort.map((mName, idx) => {
        const bucketDate = new Date(year, idx, 1);
        return {
          label: mName,
          fullLabel: `${mName} ${year}`,
          sales: 0,
          profit: 0,
          bills: 0,
          units: 0,
          timestamp: bucketDate.toISOString()
        };
      });

      allBills.forEach(bill => {
        const d = parseTimestamp(bill.timestamp);
        if (d.getFullYear() === year) {
          const m = d.getMonth();
          if (m >= 0 && m < 12) {
            const billSales = Number(bill.total) || 0;
            const billProfit = getBillProfit(bill, state.items);
            let billUnits = 0;
            if (Array.isArray(bill.items)) {
              bill.items.forEach(item => {
                const q = Number(item.quantity);
                billUnits += (!isNaN(q) && q > 0) ? q : 1;
              });
            } else {
              billUnits = 1;
            }

            points[m].sales += billSales;
            points[m].profit += billProfit;
            points[m].bills += 1;
            points[m].units += billUnits;
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
            points[m].units += 1;
          }
        }
      });

      // Previous Calendar Year
      const prevYear = year - 1;
      allBills.forEach(bill => {
        const d = parseTimestamp(bill.timestamp);
        if (d.getFullYear() === prevYear) {
          prevSalesTotal += Number(bill.total) || 0;
          prevProfitTotal += getBillProfit(bill, state.items);
          prevBillsTotal += 1;
          if (Array.isArray(bill.items)) {
            bill.items.forEach(item => {
              const q = Number(item.quantity);
              prevUnitsTotal += (!isNaN(q) && q > 0) ? q : 1;
            });
          } else {
            prevUnitsTotal += 1;
          }
        }
      });

      allUnbilled.forEach(entry => {
        const d = parseTimestamp(entry.timestamp || entry.dateStr);
        if (d.getFullYear() === prevYear) {
          const amt = Number(entry.amount) || 0;
          prevSalesTotal += amt;
          prevProfitTotal += amt;
          prevBillsTotal += 1;
          prevUnitsTotal += 1;
        }
      });

    } else if (timeRange === 'custom') {
      // Custom Range
      const start = new Date(customStart + 'T00:00:00');
      const end = new Date(customEnd + 'T23:59:59');
      const diffMs = Math.max(0, end.getTime() - start.getTime());
      const diffDays = Math.min(60, Math.max(1, Math.ceil(diffMs / (24 * 3600 * 1000))));

      points = Array.from({ length: diffDays }, (_, i) => {
        const bucketDate = new Date(start.getTime() + i * 24 * 3600 * 1000);
        const dayNum = bucketDate.getDate();
        const monthShortStr = bucketDate.toLocaleDateString(undefined, { month: 'short' });
        return {
          label: `${dayNum} ${monthShortStr}`,
          subLabel: monthShortStr,
          fullLabel: `${monthShortStr} ${dayNum}, ${bucketDate.getFullYear()}`,
          sales: 0,
          profit: 0,
          bills: 0,
          units: 0,
          timestamp: bucketDate.toISOString()
        };
      });

      allBills.forEach(bill => {
        const d = parseTimestamp(bill.timestamp);
        if (d >= start && d <= end) {
          const dayIdx = Math.floor((d.getTime() - start.getTime()) / (24 * 3600 * 1000));
          if (dayIdx >= 0 && dayIdx < diffDays) {
            const billSales = Number(bill.total) || 0;
            const billProfit = getBillProfit(bill, state.items);
            let billUnits = 0;
            if (Array.isArray(bill.items)) {
              bill.items.forEach(item => {
                const q = Number(item.quantity);
                billUnits += (!isNaN(q) && q > 0) ? q : 1;
              });
            } else {
              billUnits = 1;
            }

            points[dayIdx].sales += billSales;
            points[dayIdx].profit += billProfit;
            points[dayIdx].bills += 1;
            points[dayIdx].units += billUnits;
          }
        }
      });

      allUnbilled.forEach(entry => {
        const d = parseTimestamp(entry.timestamp || entry.dateStr);
        if (d >= start && d <= end) {
          const dayIdx = Math.floor((d.getTime() - start.getTime()) / (24 * 3600 * 1000));
          if (dayIdx >= 0 && dayIdx < diffDays) {
            const amt = Number(entry.amount) || 0;
            points[dayIdx].sales += amt;
            points[dayIdx].profit += amt;
            points[dayIdx].bills += 1;
            points[dayIdx].units += 1;
          }
        }
      });

      // Prior period
      const prevStart = new Date(start.getTime() - diffMs);
      const prevEnd = start;

      allBills.forEach(bill => {
        const d = parseTimestamp(bill.timestamp);
        if (d >= prevStart && d < prevEnd) {
          prevSalesTotal += Number(bill.total) || 0;
          prevProfitTotal += getBillProfit(bill, state.items);
          prevBillsTotal += 1;
          if (Array.isArray(bill.items)) {
            bill.items.forEach(item => {
              const q = Number(item.quantity);
              prevUnitsTotal += (!isNaN(q) && q > 0) ? q : 1;
            });
          } else {
            prevUnitsTotal += 1;
          }
        }
      });
    }

    // Compute totals
    points.forEach(p => {
      currSalesTotal += p.sales;
      currProfitTotal += p.profit;
      currBillsTotal += p.bills;
      currUnitsTotal += p.units;
    });

    const hasData = currSalesTotal > 0 || currBillsTotal > 0 || currProfitTotal > 0;

    return {
      dataPoints: points,
      totals: {
        sales: currSalesTotal,
        profit: currProfitTotal,
        bills: currBillsTotal,
        units: currUnitsTotal
      },
      prevTotals: {
        sales: prevSalesTotal,
        profit: prevProfitTotal,
        bills: prevBillsTotal,
        units: prevUnitsTotal
      },
      hasAnyData: hasData
    };
  }, [allBills, allUnbilled, timeRange, customStart, customEnd, state.items]);

  // 4. Growth calculations vs prior period
  const salesGrowth = useMemo(() => {
    if (prevTotals.sales === 0) {
      return totals.sales > 0 ? 100 : 0;
    }
    return ((totals.sales - prevTotals.sales) / prevTotals.sales) * 100;
  }, [totals.sales, prevTotals.sales]);

  const profitMargin = useMemo(() => {
    if (totals.sales <= 0) return 0;
    return (totals.profit / totals.sales) * 100;
  }, [totals.sales, totals.profit]);

  const comparisonLabel = useMemo(() => {
    switch (timeRange) {
      case 'today': return 'vs yesterday';
      case 'week': return 'vs last week';
      case 'month': return 'vs last month';
      case 'year': return 'vs last year';
      case 'custom': return 'vs prior';
      default: return 'vs prev';
    }
  }, [timeRange]);

  // 5. Visual Colors for Sales and Profit
  const salesColor = themeChartColors?.sales?.stroke || '#3b82f6';
  const profitColor = themeChartColors?.profit?.stroke || '#10b981';

  // 6. Graph Coordinate Calculations for Virtual SVG Space (Mobile Optimized)
  const svgWidth = 1000;
  const svgHeight = 310;
  const paddingLeft = 46;
  const paddingRight = 24;
  const paddingTop = 28;
  const paddingBottom = 42;

  const drawableWidth = svgWidth - paddingLeft - paddingRight;
  const drawableHeight = svgHeight - paddingTop - paddingBottom;

  // Max value spanning Sales and Profit
  const maxVal = useMemo(() => {
    let peak = 1;
    dataPoints.forEach(p => {
      if (p.sales > peak) peak = p.sales;
      if (p.profit > peak) peak = p.profit;
    });
    return peak * 1.18; // 18% breathing ceiling
  }, [dataPoints]);

  // Compute dual coordinate points
  const coordPoints = useMemo(() => {
    const total = dataPoints.length;
    if (total === 0) return [];
    return dataPoints.map((pt, i) => {
      const x = total === 1 
        ? paddingLeft + drawableWidth / 2 
        : paddingLeft + (i / (total - 1)) * drawableWidth;
      const ySales = paddingTop + drawableHeight - (pt.sales / maxVal) * drawableHeight;
      const yProfit = paddingTop + drawableHeight - (pt.profit / maxVal) * drawableHeight;
      return { x, ySales, yProfit, original: pt, index: i };
    });
  }, [dataPoints, maxVal, drawableWidth, drawableHeight]);

  // Peak Point Detection for on-canvas badge
  const peakPoint = useMemo(() => {
    if (coordPoints.length === 0) return null;
    let max = coordPoints[0];
    coordPoints.forEach(p => {
      if (p.original.sales > max.original.sales) max = p;
    });
    return max.original.sales > 0 ? max : null;
  }, [coordPoints]);

  // Latest / Current Active Point (right edge beacon)
  const latestPoint = useMemo(() => {
    if (coordPoints.length === 0) return null;
    return coordPoints[coordPoints.length - 1];
  }, [coordPoints]);

  // Smooth Bezier Curve Path for Sales
  const salesLinePath = useMemo(() => {
    const pts = coordPoints.map(p => ({ x: p.x, y: p.ySales }));
    return getBezierCurvePath(pts);
  }, [coordPoints]);

  // Area Fill Path for Sales
  const salesFillPath = useMemo(() => {
    if (coordPoints.length === 0) return '';
    const bottomY = paddingTop + drawableHeight;
    const firstX = coordPoints[0].x;
    const lastX = coordPoints[coordPoints.length - 1].x;
    return `${salesLinePath} L ${lastX} ${bottomY} L ${firstX} ${bottomY} Z`;
  }, [coordPoints, salesLinePath, paddingTop, drawableHeight]);

  // Smooth Bezier Curve Path for Profit
  const profitLinePath = useMemo(() => {
    const pts = coordPoints.map(p => ({ x: p.x, y: p.yProfit }));
    return getBezierCurvePath(pts);
  }, [coordPoints]);

  // Area Fill Path for Profit
  const profitFillPath = useMemo(() => {
    if (coordPoints.length === 0) return '';
    const bottomY = paddingTop + drawableHeight;
    const firstX = coordPoints[0].x;
    const lastX = coordPoints[coordPoints.length - 1].x;
    return `${profitLinePath} L ${lastX} ${bottomY} L ${firstX} ${bottomY} Z`;
  }, [coordPoints, profitLinePath, paddingTop, drawableHeight]);

  // 7. Pointer / Touch-to-Scrub Engine with Real-Time Haptic Ticks
  const handlePointerCoords = useCallback((clientX: number) => {
    if (!containerRef.current || coordPoints.length === 0) return;
    const rect = containerRef.current.getBoundingClientRect();
    if (rect.width <= 0) return;

    const scaleX = svgWidth / rect.width;
    const virtualX = (clientX - rect.left) * scaleX;

    let closestIdx = 0;
    let minDiff = Infinity;

    coordPoints.forEach((pt, idx) => {
      const diff = Math.abs(pt.x - virtualX);
      if (diff < minDiff) {
        minDiff = diff;
        closestIdx = idx;
      }
    });

    // Provide crisp native haptic vibration tick on crossing intervals
    if (lastHapticIndexRef.current !== closestIdx) {
      lastHapticIndexRef.current = closestIdx;
      if (typeof window !== 'undefined' && window.navigator && window.navigator.vibrate) {
        try { window.navigator.vibrate(8); } catch {}
      }
    }

    setActiveIndex(closestIdx);
  }, [coordPoints, svgWidth]);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    setIsInteracting(true);
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}
    handlePointerCoords(e.clientX);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isInteracting || e.pointerType === 'mouse') {
      handlePointerCoords(e.clientX);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}
    setIsInteracting(false);
  };

  const handlePointerCancel = () => {
    setIsInteracting(false);
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length > 0) {
      setIsInteracting(true);
      handlePointerCoords(e.touches[0].clientX);
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length > 0) {
      handlePointerCoords(e.touches[0].clientX);
    }
  };

  const handleTouchEnd = () => {
    setIsInteracting(false);
  };

  // Active Point currently scrubbed/inspected
  const activePoint = activeIndex !== null && coordPoints[activeIndex] ? coordPoints[activeIndex] : null;

  const activeMargin = useMemo(() => {
    if (!activePoint || activePoint.original.sales <= 0) return 0;
    return (activePoint.original.profit / activePoint.original.sales) * 100;
  }, [activePoint]);

  // Smart X-axis label strides to prevent mobile clutter
  const visibleLabelIndices = useMemo(() => {
    const total = dataPoints.length;
    const indices = new Set<number>();
    if (total <= 7) {
      for (let i = 0; i < total; i++) indices.add(i);
    } else if (total <= 12) {
      for (let i = 0; i < total; i++) indices.add(i);
    } else if (total <= 25) {
      for (let i = 0; i < total; i += 4) indices.add(i);
      indices.add(total - 1);
    } else {
      for (let i = 0; i < total; i += 5) indices.add(i);
      indices.add(total - 1);
    }
    return indices;
  }, [dataPoints.length]);

  // Unique key to trigger fresh start-to-end animation whenever parameters change
  const animationKey = `${timeRange}-${chartStyle}-${metricMode}-${customStart}-${customEnd}`;

  // Active displayed metrics: Scrubbed vs Total
  const displayedSales = activePoint ? activePoint.original.sales : totals.sales;
  const displayedProfit = activePoint ? activePoint.original.profit : totals.profit;
  const displayedMargin = activePoint ? activeMargin : profitMargin;

  return (
    <div className="bg-[var(--card)]/90 backdrop-blur-xl border border-[var(--border)] rounded-[2.2rem] p-4 sm:p-6 shadow-2xl relative overflow-hidden text-[var(--foreground)] space-y-4 select-none">
      
      {/* Ambient Atmospheric Radial Glow Tinted by Primary Color */}
      <div 
        className="absolute -top-24 -right-24 w-72 h-72 rounded-full blur-3xl pointer-events-none opacity-20"
        style={{ background: `radial-gradient(circle, ${salesColor} 0%, transparent 70%)` }}
      />
      <div 
        className="absolute -bottom-24 -left-24 w-72 h-72 rounded-full blur-3xl pointer-events-none opacity-15"
        style={{ background: `radial-gradient(circle, ${profitColor} 0%, transparent 70%)` }}
      />

      {/* 1. APP HEADER: STATUS TELEMETRY + VIEW CONTROLS */}
      <div className="flex items-center justify-between gap-2 flex-wrap pb-1 relative z-10">
        {/* Left: App Telemetry Status */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 shadow-xs">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-[9.5px] font-black uppercase tracking-wider text-emerald-500 font-mono">
              Live App Stream
            </span>
          </div>

          <span className="text-[11px] font-bold text-[var(--foreground)]/50 hidden sm:inline truncate max-w-[200px]">
            {state.settings.storeName || "Store Telemetry"}
          </span>
        </div>

        {/* Right: App Native Controls (Metric Mode & Chart Type) */}
        <div className="flex items-center gap-1.5 ml-auto">
          {/* Metric Selector: Sales / Profit / Dual */}
          <div className="flex items-center bg-[var(--foreground)]/[0.05] p-0.5 rounded-xl border border-[var(--border)]">
            <button
              type="button"
              onClick={() => {
                setMetricMode('sales');
                if (typeof window !== 'undefined' && window.navigator?.vibrate) window.navigator.vibrate(8);
              }}
              className={`px-2 py-1 rounded-lg text-[9.5px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                metricMode === 'sales'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-[var(--foreground)]/60 hover:text-[var(--foreground)]'
              }`}
            >
              Sales
            </button>
            <button
              type="button"
              onClick={() => {
                setMetricMode('profit');
                if (typeof window !== 'undefined' && window.navigator?.vibrate) window.navigator.vibrate(8);
              }}
              className={`px-2 py-1 rounded-lg text-[9.5px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                metricMode === 'profit'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-[var(--foreground)]/60 hover:text-[var(--foreground)]'
              }`}
            >
              Profit
            </button>
            <button
              type="button"
              onClick={() => {
                setMetricMode('dual');
                if (typeof window !== 'undefined' && window.navigator?.vibrate) window.navigator.vibrate(8);
              }}
              className={`px-2 py-1 rounded-lg text-[9.5px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                metricMode === 'dual'
                  ? 'bg-[var(--foreground)] text-[var(--background)] shadow-xs'
                  : 'text-[var(--foreground)]/60 hover:text-[var(--foreground)]'
              }`}
            >
              Both
            </button>
          </div>

          {/* Chart View Toggle: Curve (LineChart) vs Pillars (BarChart3) */}
          <div className="flex items-center bg-[var(--foreground)]/[0.05] p-0.5 rounded-xl border border-[var(--border)]">
            <button
              type="button"
              onClick={() => {
                setChartStyle('spline');
                if (typeof window !== 'undefined' && window.navigator?.vibrate) window.navigator.vibrate(8);
              }}
              title="Smooth Bezier Curve View"
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                chartStyle === 'spline'
                  ? 'bg-[var(--foreground)] text-[var(--background)] shadow-xs'
                  : 'text-[var(--foreground)]/50 hover:text-[var(--foreground)]'
              }`}
            >
              <LineChart size={13} />
            </button>
            <button
              type="button"
              onClick={() => {
                setChartStyle('bars');
                if (typeof window !== 'undefined' && window.navigator?.vibrate) window.navigator.vibrate(8);
              }}
              title="Mobile Volume Pillars View"
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                chartStyle === 'bars'
                  ? 'bg-[var(--foreground)] text-[var(--background)] shadow-xs'
                  : 'text-[var(--foreground)]/50 hover:text-[var(--foreground)]'
              }`}
            >
              <BarChart3 size={13} />
            </button>
          </div>
        </div>
      </div>

      {/* 2. APP HERO HEADLINE: DYNAMIC ROLLING METRIC & SCRUB FEEDBACK */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 pt-1 border-b border-[var(--border)] pb-4 relative z-10">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-[var(--foreground)]/50 font-mono">
              {activePoint ? (
                <span className="text-blue-500 font-bold">
                  {activePoint.original.fullLabel}
                </span>
              ) : (
                timeRange === 'today' ? "Today's Gross Performance" :
                timeRange === 'week' ? "This Week's Gross Performance" :
                timeRange === 'month' ? "This Month's Gross Performance" :
                timeRange === 'year' ? "This Year's Gross Performance" : "Custom Period Performance"
              )}
            </span>

            {activePoint && (
              <button
                type="button"
                onClick={() => setActiveIndex(null)}
                className="inline-flex items-center gap-1 text-[9px] font-black uppercase px-2 py-0.5 rounded-md bg-[var(--foreground)]/[0.08] hover:bg-[var(--foreground)]/15 text-[var(--foreground)]/70 transition-all cursor-pointer"
              >
                <RotateCcw size={9} /> Reset
              </button>
            )}
          </div>

          {/* Large App-Native Number */}
          <div className="flex items-baseline gap-3 flex-wrap">
            <motion.div
              key={`metric-val-${displayedSales}-${displayedProfit}`}
              initial={{ opacity: 0.8, y: -2 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.15 }}
              className="text-3xl sm:text-4xl font-black font-mono tracking-tight text-[var(--foreground)] flex items-baseline gap-1"
            >
              <span className="text-xl sm:text-2xl text-[var(--foreground)]/50">₹</span>
              <span>
                {metricMode === 'profit' 
                  ? Math.round(displayedProfit).toLocaleString() 
                  : Math.round(displayedSales).toLocaleString()}
              </span>
            </motion.div>

            {/* Micro Badge for Margin & Growth */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-mono">
                <Percent size={9} />
                {displayedMargin.toFixed(1)}% Margin
              </span>

              {!activePoint && (
                <span className={`inline-flex items-center gap-0.5 text-[9.5px] font-black px-2 py-0.5 rounded-full border ${
                  salesGrowth >= 0 
                    ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' 
                    : 'bg-rose-500/10 text-rose-500 border-rose-500/20'
                }`}>
                  {salesGrowth >= 0 ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
                  {salesGrowth >= 0 ? '+' : ''}{salesGrowth.toFixed(1)}% {comparisonLabel}
                </span>
              )}

              {activePoint && (
                <span className="text-[10px] font-mono font-bold text-[var(--foreground)]/60">
                  {activePoint.original.bills} Invoices · Profit ₹{Math.round(activePoint.original.profit).toLocaleString()}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* 3. APP-NATIVE SEGMENTED TIME SELECTOR WITH SLIDING GLIDER */}
        <div className="flex items-center bg-[var(--foreground)]/[0.05] p-1 rounded-2xl border border-[var(--border)] max-w-full overflow-x-auto self-start sm:self-auto scrollbar-none">
          {([
            { id: 'today', label: 'Today' },
            { id: 'week', label: 'Week' },
            { id: 'month', label: 'Month' },
            { id: 'year', label: 'Year' },
            { id: 'custom', label: 'Custom' }
          ] as const).map(tab => {
            const isSelected = timeRange === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleTimeRangeChange(tab.id)}
                className={`relative px-3 sm:px-3.5 py-1.5 rounded-xl text-[10.5px] font-black uppercase tracking-wider transition-colors cursor-pointer select-none whitespace-nowrap ${
                  isSelected 
                    ? 'text-[var(--background)]' 
                    : 'text-[var(--foreground)]/60 hover:text-[var(--foreground)]'
                }`}
              >
                {/* Framer Motion Spring Glider */}
                {isSelected && (
                  <motion.div
                    layoutId="activeRangePill"
                    className="absolute inset-0 bg-[var(--foreground)] rounded-xl shadow-md z-0"
                    transition={{ type: "spring", stiffness: 450, damping: 32 }}
                  />
                )}
                <span className="relative z-10">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Custom Date Range Picker Expander */}
      {timeRange === 'custom' && showCustomPicker && (
        <motion.div 
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="p-3 bg-[var(--foreground)]/[0.02] border border-[var(--border)] rounded-2xl flex flex-wrap items-center gap-3 relative z-10"
        >
          <div className="flex items-center gap-2 text-xs font-bold">
            <span className="text-[10px] font-black text-[var(--foreground)]/60 uppercase">From:</span>
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="bg-[var(--background)] border border-[var(--border)] rounded-xl px-2.5 py-1 text-xs font-mono font-bold focus:outline-none focus:border-[var(--primary)]"
            />
          </div>
          <div className="flex items-center gap-2 text-xs font-bold">
            <span className="text-[10px] font-black text-[var(--foreground)]/60 uppercase">To:</span>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="bg-[var(--background)] border border-[var(--border)] rounded-xl px-2.5 py-1 text-xs font-mono font-bold focus:outline-none focus:border-[var(--primary)]"
            />
          </div>
          <button
            type="button"
            onClick={() => setShowCustomPicker(false)}
            className="px-3 py-1 bg-[var(--primary)] text-white text-[10px] font-black uppercase tracking-wider rounded-xl cursor-pointer shadow-sm hover:opacity-90 ml-auto"
          >
            Apply Range
          </button>
        </motion.div>
      )}

      {/* 4. THE LIVING APP GRAPH CANVAS (START-TO-END ANIMATION + TOUCH-TO-SCRUB) */}
      <div className="relative pt-1">
        {!hasAnyData ? (
          <div className="h-64 rounded-3xl border border-dashed border-[var(--border)] bg-[var(--foreground)]/[0.01] flex flex-col items-center justify-center p-6 text-center space-y-3">
            <div className="h-12 w-12 rounded-2xl bg-[var(--foreground)]/[0.04] border border-[var(--border)] text-[var(--foreground)]/40 flex items-center justify-center">
              <Receipt size={22} />
            </div>
            <div className="space-y-1 max-w-sm">
              <h4 className="text-xs font-black uppercase tracking-tight text-[var(--foreground)]">
                No Transactions Recorded For This Period
              </h4>
              <p className="text-[10px] text-[var(--foreground)]/50 leading-relaxed font-semibold uppercase tracking-wider">
                Select Week, Month, or Year to visualize performance graphs and profit curves.
              </p>
            </div>
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => handleTimeRangeChange('week')}
                className="px-3.5 py-1.5 rounded-xl bg-[var(--foreground)]/[0.06] hover:bg-[var(--foreground)]/12 text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer"
              >
                This Week
              </button>
              <button
                type="button"
                onClick={() => handleTimeRangeChange('month')}
                className="px-3.5 py-1.5 rounded-xl bg-[var(--primary)] text-white text-[10px] font-black uppercase tracking-wider transition-all shadow-sm cursor-pointer"
              >
                This Month
              </button>
            </div>
          </div>
        ) : (
          <div
            ref={containerRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerCancel}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            style={{ touchAction: 'pan-y' }}
            className="relative w-full h-[270px] sm:h-[310px] cursor-crosshair select-none touch-pan-y"
          >
            {/* SVG Graph Canvas with Start-To-End Motion Engine */}
            <svg
              viewBox={`0 0 ${svgWidth} ${svgHeight}`}
              className="w-full h-full overflow-visible pointer-events-none"
              preserveAspectRatio="none"
            >
              <defs>
                {/* Luminous Neon Gradient for Sales */}
                <linearGradient id="appSalesGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={salesColor} stopOpacity="0.38" />
                  <stop offset="45%" stopColor={salesColor} stopOpacity="0.14" />
                  <stop offset="95%" stopColor={salesColor} stopOpacity="0.01" />
                  <stop offset="100%" stopColor={salesColor} stopOpacity="0" />
                </linearGradient>

                {/* Luminous Neon Gradient for Profit */}
                <linearGradient id="appProfitGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={profitColor} stopOpacity="0.40" />
                  <stop offset="45%" stopColor={profitColor} stopOpacity="0.15" />
                  <stop offset="95%" stopColor={profitColor} stopOpacity="0.01" />
                  <stop offset="100%" stopColor={profitColor} stopOpacity="0" />
                </linearGradient>

                {/* Soft Glowing Filter for Lines and Points */}
                <filter id="neonAppGlow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>

              {/* Minimalist Horizontal Guide Gridlines with App Tick Labels */}
              {[0.25, 0.5, 0.75, 1.0].map((ratio, idx) => {
                const yPos = paddingTop + drawableHeight - ratio * drawableHeight;
                const gridVal = (maxVal * ratio) / 1.18;
                return (
                  <g key={idx} className="opacity-20">
                    <line
                      x1={paddingLeft}
                      y1={yPos}
                      x2={paddingLeft + drawableWidth}
                      y2={yPos}
                      stroke="currentColor"
                      strokeWidth={1}
                      strokeDasharray="3 4"
                    />
                    <text
                      x={paddingLeft - 8}
                      y={yPos + 3.5}
                      textAnchor="end"
                      fontSize={9.5}
                      fontWeight="bold"
                      fill="currentColor"
                      className="font-mono opacity-65"
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
                strokeWidth={1.2}
                className="opacity-20"
              />

              {/* MODE 1: SPLINE CURVE MODE WITH START-TO-END DRAWING */}
              {chartStyle === 'spline' && (
                <>
                  {/* Sales Area Fill Bloom */}
                  {(metricMode === 'sales' || metricMode === 'dual') && salesFillPath && (
                    <motion.path
                      key={`sales-fill-${animationKey}`}
                      d={salesFillPath}
                      fill="url(#appSalesGradient)"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 1.1, delay: 0.15, ease: "easeOut" }}
                    />
                  )}

                  {/* Profit Area Fill Bloom */}
                  {(metricMode === 'profit' || metricMode === 'dual') && profitFillPath && (
                    <motion.path
                      key={`profit-fill-${animationKey}`}
                      d={profitFillPath}
                      fill="url(#appProfitGradient)"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: metricMode === 'dual' ? 0.7 : 1 }}
                      transition={{ duration: 1.1, delay: 0.25, ease: "easeOut" }}
                    />
                  )}

                  {/* Sales Bezier Spline Curve: START-TO-END DRAWING ANIMATION */}
                  {(metricMode === 'sales' || metricMode === 'dual') && salesLinePath && (
                    <motion.path
                      key={`sales-line-${animationKey}`}
                      d={salesLinePath}
                      fill="none"
                      stroke={salesColor}
                      strokeWidth={3.5}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      initial={{ pathLength: 0, opacity: 0 }}
                      animate={{ pathLength: 1, opacity: 1 }}
                      transition={{ duration: 1.15, ease: [0.16, 1, 0.3, 1] }}
                      filter="url(#neonAppGlow)"
                    />
                  )}

                  {/* Profit Bezier Spline Curve: START-TO-END DRAWING ANIMATION */}
                  {(metricMode === 'profit' || metricMode === 'dual') && profitLinePath && (
                    <motion.path
                      key={`profit-line-${animationKey}`}
                      d={profitLinePath}
                      fill="none"
                      stroke={profitColor}
                      strokeWidth={metricMode === 'dual' ? 2.5 : 3.5}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeDasharray={metricMode === 'dual' ? "5 4" : undefined}
                      initial={{ pathLength: 0, opacity: 0 }}
                      animate={{ pathLength: 1, opacity: 1 }}
                      transition={{ duration: 1.15, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
                      filter="url(#neonAppGlow)"
                    />
                  )}

                  {/* Living App Beacon: Glowing radar pulse at latest data point */}
                  {latestPoint && (
                    <motion.g
                      key={`beacon-${animationKey}`}
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: 1.0, duration: 0.4 }}
                    >
                      <motion.circle
                        cx={latestPoint.x}
                        cy={metricMode === 'profit' ? latestPoint.yProfit : latestPoint.ySales}
                        r={12}
                        fill={metricMode === 'profit' ? profitColor : salesColor}
                        animate={{ scale: [1, 2.3, 1], opacity: [0.65, 0, 0.65] }}
                        transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
                      />
                      <circle
                        cx={latestPoint.x}
                        cy={metricMode === 'profit' ? latestPoint.yProfit : latestPoint.ySales}
                        r={5}
                        fill="#ffffff"
                        stroke={metricMode === 'profit' ? profitColor : salesColor}
                        strokeWidth={3}
                      />
                    </motion.g>
                  )}

                  {/* Peak Callout Badge directly on the canvas */}
                  {peakPoint && peakPoint.original.sales > 0 && (
                    <motion.g
                      key={`peak-${animationKey}`}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 1.1, duration: 0.4 }}
                      className="pointer-events-none"
                    >
                      <line
                        x1={peakPoint.x}
                        y1={peakPoint.ySales}
                        x2={peakPoint.x}
                        y2={Math.max(paddingTop + 14, peakPoint.ySales - 22)}
                        stroke={salesColor}
                        strokeWidth={1}
                        strokeDasharray="2 2"
                        opacity={0.6}
                      />
                      <g transform={`translate(${Math.max(48, Math.min(svgWidth - 48, peakPoint.x))}, ${Math.max(paddingTop + 8, peakPoint.ySales - 24)})`}>
                        <rect
                          x={-34}
                          y={-11}
                          width={68}
                          height={18}
                          rx={9}
                          fill="var(--card)"
                          stroke={salesColor}
                          strokeWidth={1.2}
                          opacity={0.96}
                        />
                        <text
                          x={0}
                          y={0}
                          textAnchor="middle"
                          dominantBaseline="central"
                          fontSize={8.5}
                          fontWeight="900"
                          fill={salesColor}
                          className="font-mono"
                        >
                          PEAK ₹{peakPoint.original.sales >= 1000 ? `${(peakPoint.original.sales / 1000).toFixed(1)}k` : Math.round(peakPoint.original.sales)}
                        </text>
                      </g>
                    </motion.g>
                  )}
                </>
              )}

              {/* MODE 2: MOBILE VOLUME PILLARS WITH VERTICAL SPRING GROWTH */}
              {chartStyle === 'bars' && (
                <g>
                  {coordPoints.map((pt, i) => {
                    const barW = Math.max(8, Math.min(28, (drawableWidth / coordPoints.length) * 0.65));
                    const barH = (pt.original.sales / maxVal) * drawableHeight;
                    const barY = paddingTop + drawableHeight - barH;
                    const profitH = (pt.original.profit / maxVal) * drawableHeight;
                    const profitY = paddingTop + drawableHeight - profitH;
                    const isScrubbed = activeIndex === i;

                    return (
                      <g key={`bar-group-${animationKey}-${i}`}>
                        {/* Sales Pillar */}
                        {(metricMode === 'sales' || metricMode === 'dual') && (
                          <motion.rect
                            initial={{ scaleY: 0 }}
                            animate={{ scaleY: 1 }}
                            transition={{
                              type: "spring",
                              stiffness: 320,
                              damping: 24,
                              delay: Math.min(0.5, i * (0.6 / coordPoints.length))
                            }}
                            style={{ transformOrigin: `50% ${paddingTop + drawableHeight}px` }}
                            x={pt.x - barW / 2}
                            y={barY}
                            width={barW}
                            height={Math.max(3, barH)}
                            rx={Math.min(barW / 2, 5)}
                            fill={isScrubbed ? '#ffffff' : salesColor}
                            opacity={isScrubbed ? 1 : 0.85}
                          />
                        )}

                        {/* Profit Pillar Overlay (in Profit or Dual Mode) */}
                        {metricMode === 'profit' && (
                          <motion.rect
                            initial={{ scaleY: 0 }}
                            animate={{ scaleY: 1 }}
                            transition={{
                              type: "spring",
                              stiffness: 320,
                              damping: 24,
                              delay: Math.min(0.5, i * (0.6 / coordPoints.length))
                            }}
                            style={{ transformOrigin: `50% ${paddingTop + drawableHeight}px` }}
                            x={pt.x - barW / 2}
                            y={profitY}
                            width={barW}
                            height={Math.max(3, profitH)}
                            rx={Math.min(barW / 2, 5)}
                            fill={isScrubbed ? '#ffffff' : profitColor}
                            opacity={isScrubbed ? 1 : 0.9}
                          />
                        )}
                      </g>
                    );
                  })}
                </g>
              )}

              {/* Bottom X-Axis Tick Labels with Smart Mobile Spacing */}
              {coordPoints.map((pt, i) => {
                if (!visibleLabelIndices.has(i)) return null;
                const isScrubbed = activeIndex === i;
                return (
                  <g key={`x-tick-${i}`}>
                    <text
                      x={pt.x}
                      y={paddingTop + drawableHeight + 17}
                      textAnchor="middle"
                      fontSize={9.5}
                      fontWeight={isScrubbed ? "900" : "800"}
                      fill={isScrubbed ? salesColor : "currentColor"}
                      className={`font-mono uppercase tracking-tight transition-colors ${
                        isScrubbed ? "opacity-100" : "opacity-45"
                      }`}
                    >
                      {pt.original.label}
                    </text>
                  </g>
                );
              })}

              {/* Active Scrub Laser Beam & Snapping Marker Rings */}
              {activePoint && (
                <g>
                  {/* Vertical Laser Beam Guide Line */}
                  <line
                    x1={activePoint.x}
                    y1={paddingTop}
                    x2={activePoint.x}
                    y2={paddingTop + drawableHeight}
                    stroke="currentColor"
                    strokeWidth={1.5}
                    strokeDasharray="4 4"
                    opacity={0.6}
                  />

                  {/* SALES Highlight Snapping Ring */}
                  {(metricMode === 'sales' || metricMode === 'dual') && (
                    <>
                      <circle
                        cx={activePoint.x}
                        cy={activePoint.ySales}
                        r={14}
                        fill={salesColor}
                        opacity={0.25}
                      />
                      <circle
                        cx={activePoint.x}
                        cy={activePoint.ySales}
                        r={6.5}
                        fill={salesColor}
                        stroke="#ffffff"
                        strokeWidth={2.5}
                        filter="url(#neonAppGlow)"
                      />
                      <circle
                        cx={activePoint.x}
                        cy={activePoint.ySales}
                        r={2.5}
                        fill="#ffffff"
                      />
                    </>
                  )}

                  {/* PROFIT Highlight Snapping Ring */}
                  {(metricMode === 'profit' || metricMode === 'dual') && (
                    <>
                      <circle
                        cx={activePoint.x}
                        cy={activePoint.yProfit}
                        r={13}
                        fill={profitColor}
                        opacity={0.25}
                      />
                      <circle
                        cx={activePoint.x}
                        cy={activePoint.yProfit}
                        r={6}
                        fill={profitColor}
                        stroke="#ffffff"
                        strokeWidth={2}
                        filter="url(#neonAppGlow)"
                      />
                      <circle
                        cx={activePoint.x}
                        cy={activePoint.yProfit}
                        r={2.5}
                        fill="#ffffff"
                      />
                    </>
                  )}
                </g>
              )}
            </svg>

            {/* Mobile-Friendly Floating HUD Glass Capsule Pinned to Active Point */}
            <AnimatePresence>
              {activePoint && (
                <motion.div
                  initial={{ opacity: 0, y: 6, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 6, scale: 0.96 }}
                  transition={{ duration: 0.12 }}
                  className="absolute pointer-events-none z-30"
                  style={{
                    left: `${Math.max(18, Math.min(82, (activePoint.x / svgWidth) * 100))}%`,
                    top: '8px',
                    transform: 'translateX(-50%)'
                  }}
                >
                  <div className="bg-[var(--card)]/95 border border-[var(--border)] text-[var(--foreground)] px-3.5 py-2 rounded-2xl shadow-2xl backdrop-blur-2xl flex items-center gap-3 whitespace-nowrap">
                    {/* Sales Tag */}
                    <div className="flex items-center gap-1.5">
                      <div className="h-2 w-2 rounded-full bg-blue-500 shadow-xs" />
                      <span className="text-[10px] font-black font-mono text-blue-400">
                        ₹{Math.round(activePoint.original.sales).toLocaleString()}
                      </span>
                    </div>

                    <div className="h-3.5 w-px bg-[var(--border)]" />

                    {/* Profit Tag */}
                    <div className="flex items-center gap-1.5">
                      <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-xs" />
                      <span className="text-[10px] font-black font-mono text-emerald-400">
                        ₹{Math.round(activePoint.original.profit).toLocaleString()}
                      </span>
                    </div>

                    {/* Time Label */}
                    <span className="text-[9px] font-black text-[var(--foreground)]/60 border-l border-[var(--border)] pl-2 uppercase font-mono">
                      {activePoint.original.label}
                    </span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* 5. APP-NATIVE BOTTOM SUMMARY METRICS DOCK */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-[var(--border)]">
        <div className="p-2.5 rounded-2xl bg-[var(--foreground)]/[0.03] border border-[var(--border)] space-y-0.5 transition-all hover:bg-[var(--foreground)]/[0.05]">
          <span className="text-[8.5px] font-black uppercase tracking-wider text-[var(--foreground)]/50 block font-mono">
            Avg Velocity
          </span>
          <span className="text-xs font-black font-mono text-blue-400">
            ₹{dataPoints.length > 0
              ? Math.round(totals.sales / dataPoints.length).toLocaleString()
              : '0'}/int
          </span>
        </div>

        <div className="p-2.5 rounded-2xl bg-[var(--foreground)]/[0.03] border border-[var(--border)] space-y-0.5 transition-all hover:bg-[var(--foreground)]/[0.05]">
          <span className="text-[8.5px] font-black uppercase tracking-wider text-[var(--foreground)]/50 block font-mono">
            Net Margin
          </span>
          <span className="text-xs font-black font-mono text-emerald-400 flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            {profitMargin.toFixed(1)}% Return
          </span>
        </div>

        <div className="p-2.5 rounded-2xl bg-[var(--foreground)]/[0.03] border border-[var(--border)] space-y-0.5 transition-all hover:bg-[var(--foreground)]/[0.05]">
          <span className="text-[8.5px] font-black uppercase tracking-wider text-[var(--foreground)]/50 block font-mono">
            Total Invoices
          </span>
          <span className="text-xs font-black font-mono text-[var(--foreground)]">
            {totals.bills} Bills
          </span>
        </div>

        <div className="p-2.5 rounded-2xl bg-[var(--foreground)]/[0.03] border border-[var(--border)] space-y-0.5 transition-all hover:bg-[var(--foreground)]/[0.05]">
          <span className="text-[8.5px] font-black uppercase tracking-wider text-[var(--foreground)]/50 block font-mono">
            Units Dispatched
          </span>
          <span className="text-xs font-black font-mono text-amber-400">
            {totals.units} Items Sold
          </span>
        </div>
      </div>

    </div>
  );
}
