import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { 
  TrendingUp, TrendingDown, DollarSign, Receipt, 
  Package, Check, Calendar, ArrowUpRight, ArrowDownRight, 
  RotateCcw, Sparkles, Percent
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { AppState, Bill, UnbilledEntry } from '../types';
import { calculateBillProfit, parseTimestamp } from '../lib/utils';

export type TimeRangeType = 'today' | 'week' | 'month' | 'year' | 'custom';

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
        const label = `${formattedHour}${isPM ? 'PM' : 'AM'}`;
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
        if (d >= midnight && d < new Date(midnight.getTime() + 24 * 3600 * 1000)) {
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

      // Populate current today's unbilled
      allUnbilled.forEach(entry => {
        const d = parseTimestamp(entry.timestamp || entry.dateStr);
        if (d >= midnight && d < new Date(midnight.getTime() + 24 * 3600 * 1000)) {
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

      // Previous period for Today = Yesterday
      const yesterdayStart = new Date(midnight.getTime() - 24 * 3600 * 1000);
      const yesterdayEnd = midnight;

      allBills.forEach(bill => {
        const d = parseTimestamp(bill.timestamp);
        if (d >= yesterdayStart && d < yesterdayEnd) {
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
        if (d >= yesterdayStart && d < yesterdayEnd) {
          const amt = Number(entry.amount) || 0;
          prevSalesTotal += amt;
          prevProfitTotal += amt;
          prevBillsTotal += 1;
          prevUnitsTotal += 1;
        }
      });

    } else if (timeRange === 'week') {
      // 7 Daily buckets for the past 7 days (today - 6d ... today)
      const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      const startDate = new Date(midnight.getTime() - 6 * 24 * 3600 * 1000);

      points = Array.from({ length: 7 }, (_, i) => {
        const bucketDate = new Date(startDate.getTime() + i * 24 * 3600 * 1000);
        const dayStr = dayNames[bucketDate.getDay()];
        const dateNum = bucketDate.getDate();
        const monthShort = bucketDate.toLocaleDateString(undefined, { month: 'short' });
        return {
          label: `${dayStr} ${dateNum}`,
          subLabel: monthShort,
          fullLabel: `${dayStr}, ${monthShort} ${dateNum}`,
          sales: 0,
          profit: 0,
          bills: 0,
          units: 0,
          timestamp: bucketDate.toISOString()
        };
      });

      const periodEnd = new Date(midnight.getTime() + 24 * 3600 * 1000);

      allBills.forEach(bill => {
        const d = parseTimestamp(bill.timestamp);
        if (d >= startDate && d < periodEnd) {
          const diffDays = Math.floor((d.getTime() - startDate.getTime()) / (24 * 3600 * 1000));
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
        if (d >= startDate && d < periodEnd) {
          const diffDays = Math.floor((d.getTime() - startDate.getTime()) / (24 * 3600 * 1000));
          if (diffDays >= 0 && diffDays < 7) {
            const amt = Number(entry.amount) || 0;
            points[diffDays].sales += amt;
            points[diffDays].profit += amt;
            points[diffDays].bills += 1;
            points[diffDays].units += 1;
          }
        }
      });

      // Previous 7 days: startDate - 7 days to startDate
      const prevStart = new Date(startDate.getTime() - 7 * 24 * 3600 * 1000);
      const prevEnd = startDate;

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

      allUnbilled.forEach(entry => {
        const d = parseTimestamp(entry.timestamp || entry.dateStr);
        if (d >= prevStart && d < prevEnd) {
          const amt = Number(entry.amount) || 0;
          prevSalesTotal += amt;
          prevProfitTotal += amt;
          prevBillsTotal += 1;
          prevUnitsTotal += 1;
        }
      });

    } else if (timeRange === 'month') {
      // Days in current calendar month
      const totalDays = new Date(year, month + 1, 0).getDate();
      const monthName = now.toLocaleDateString(undefined, { month: 'short' });

      points = Array.from({ length: totalDays }, (_, i) => {
        const dayNum = i + 1;
        return {
          label: `${dayNum}`,
          subLabel: monthName,
          fullLabel: `${monthName} ${dayNum}, ${year}`,
          sales: 0,
          profit: 0,
          bills: 0,
          units: 0,
          timestamp: new Date(year, month, dayNum).toISOString()
        };
      });

      allBills.forEach(bill => {
        const d = parseTimestamp(bill.timestamp);
        if (d.getFullYear() === year && d.getMonth() === month) {
          const dayNum = d.getDate();
          if (dayNum >= 1 && dayNum <= totalDays) {
            const idx = dayNum - 1;
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

            points[idx].sales += billSales;
            points[idx].profit += billProfit;
            points[idx].bills += 1;
            points[idx].units += billUnits;
          }
        }
      });

      allUnbilled.forEach(entry => {
        const d = parseTimestamp(entry.timestamp || entry.dateStr);
        if (d.getFullYear() === year && d.getMonth() === month) {
          const dayNum = d.getDate();
          if (dayNum >= 1 && dayNum <= totalDays) {
            const idx = dayNum - 1;
            const amt = Number(entry.amount) || 0;
            points[idx].sales += amt;
            points[idx].profit += amt;
            points[idx].bills += 1;
            points[idx].units += 1;
          }
        }
      });

      // Previous calendar month
      const prevMonthYear = month === 0 ? year - 1 : year;
      const prevMonthIdx = month === 0 ? 11 : month - 1;

      allBills.forEach(bill => {
        const d = parseTimestamp(bill.timestamp);
        if (d.getFullYear() === prevMonthYear && d.getMonth() === prevMonthIdx) {
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
        if (d.getFullYear() === prevMonthYear && d.getMonth() === prevMonthIdx) {
          const amt = Number(entry.amount) || 0;
          prevSalesTotal += amt;
          prevProfitTotal += amt;
          prevBillsTotal += 1;
          prevUnitsTotal += 1;
        }
      });

    } else if (timeRange === 'year') {
      // 12 Monthly buckets for the current calendar year
      const monthNamesShort = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const monthNamesFull = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

      points = Array.from({ length: 12 }, (_, m) => {
        return {
          label: monthNamesShort[m],
          subLabel: String(year),
          fullLabel: `${monthNamesFull[m]} ${year}`,
          sales: 0,
          profit: 0,
          bills: 0,
          units: 0,
          timestamp: new Date(year, m, 1).toISOString()
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

      // Previous Calendar Year (year - 1)
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
        const monthShort = bucketDate.toLocaleDateString(undefined, { month: 'short' });
        return {
          label: `${dayNum} ${monthShort}`,
          subLabel: monthShort,
          fullLabel: `${monthShort} ${dayNum}, ${bucketDate.getFullYear()}`,
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

      // Prior period of same length
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

    // Compute current totals
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

  const profitGrowth = useMemo(() => {
    if (prevTotals.profit === 0) {
      return totals.profit > 0 ? 100 : 0;
    }
    return ((totals.profit - prevTotals.profit) / prevTotals.profit) * 100;
  }, [totals.profit, prevTotals.profit]);

  const profitMargin = useMemo(() => {
    if (totals.sales <= 0) return 0;
    return (totals.profit / totals.sales) * 100;
  }, [totals.sales, totals.profit]);

  const comparisonLabel = useMemo(() => {
    switch (timeRange) {
      case 'today': return 'vs yesterday';
      case 'week': return 'vs previous week';
      case 'month': return 'vs last month';
      case 'year': return 'vs last year';
      case 'custom': return 'vs prior period';
      default: return 'vs previous';
    }
  }, [timeRange]);

  // 5. Visual Colors for Sales and Profit
  const salesColor = themeChartColors?.sales?.stroke || '#3b82f6';
  const profitColor = themeChartColors?.profit?.stroke || '#10b981';

  // 6. Graph Coordinate Calculations for Virtual SVG Space
  const svgWidth = 1000;
  const svgHeight = 280;
  const paddingLeft = 55;
  const paddingRight = 25;
  const paddingTop = 24;
  const paddingBottom = 40;

  const drawableWidth = svgWidth - paddingLeft - paddingRight;
  const drawableHeight = svgHeight - paddingTop - paddingBottom;

  // Max value spanning BOTH Sales and Profit
  const maxVal = useMemo(() => {
    let peak = 1;
    dataPoints.forEach(p => {
      if (p.sales > peak) peak = p.sales;
      if (p.profit > peak) peak = p.profit;
    });
    return peak * 1.18; // 18% breathing ceiling
  }, [dataPoints]);

  // Compute dual coordinate points for both sales and profit
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

  // 7. Pointer / Touch-to-Scrub Engine (Seamless Touch & Mouse support on mobile)
  const handlePointerCoords = useCallback((clientX: number) => {
    if (!containerRef.current || coordPoints.length === 0) return;
    const rect = containerRef.current.getBoundingClientRect();
    if (rect.width <= 0) return;

    // Calculate scale factor from screen pixels to virtual SVG coordinates
    const scaleX = svgWidth / rect.width;
    const virtualX = (clientX - rect.left) * scaleX;

    // Find nearest point index
    let closestIdx = 0;
    let minDiff = Infinity;

    coordPoints.forEach((pt, idx) => {
      const diff = Math.abs(pt.x - virtualX);
      if (diff < minDiff) {
        minDiff = diff;
        closestIdx = idx;
      }
    });

    setActiveIndex(closestIdx);
  }, [coordPoints, svgWidth]);

  // Event Handlers for Pointer
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    setIsInteracting(true);
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch (err) {}
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
    } catch (err) {}
    setIsInteracting(false);
  };

  const handlePointerCancel = () => {
    setIsInteracting(false);
  };

  // Touch Handlers for 100% Android/iOS Webview Compatibility
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

  // Active Point currently scrubbed/tapped
  const activePoint = activeIndex !== null && coordPoints[activeIndex] ? coordPoints[activeIndex] : null;

  // Active Point dynamic profit margin
  const activeMargin = useMemo(() => {
    if (!activePoint || activePoint.original.sales <= 0) return 0;
    return (activePoint.original.profit / activePoint.original.sales) * 100;
  }, [activePoint]);

  // Smart X-axis label strides to avoid overlapping on mobile
  const visibleLabelIndices = useMemo(() => {
    const total = dataPoints.length;
    const indices = new Set<number>();
    if (total <= 7) {
      // Week (7 days) - show all
      for (let i = 0; i < total; i++) indices.add(i);
    } else if (total <= 12) {
      // Year (12 months) - show all
      for (let i = 0; i < total; i++) indices.add(i);
    } else if (total <= 25) {
      // Today 24h: show 0, 4, 8, 12, 16, 20, 23
      for (let i = 0; i < total; i += 4) indices.add(i);
      indices.add(total - 1);
    } else {
      // Month: show every 5th or 6th
      for (let i = 0; i < total; i += 5) indices.add(i);
      indices.add(total - 1);
    }
    return indices;
  }, [dataPoints.length]);

  return (
    <div className="bg-[var(--card)] border border-[var(--border)] rounded-[2.5rem] p-4 sm:p-6 shadow-xl relative overflow-hidden text-[var(--foreground)] space-y-5 select-none">
      
      {/* 1. TOP HEADER & DUAL SALES + PROFIT KPI DISPLAY */}
      <div className="space-y-4">
        {/* Top Control Bar: Time Range Selector */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--border)] pb-4">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full animate-pulse bg-blue-500" />
            <span className="h-2 w-2 rounded-full animate-pulse bg-emerald-500" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--foreground)]/60">
              Sales & Profit Stream
            </span>
          </div>

          {/* Time Range Tabs: today, week, month, year, custom */}
          <div className="flex items-center bg-[var(--foreground)]/[0.04] p-1 rounded-2xl border border-[var(--border)] self-start sm:self-auto overflow-x-auto max-w-full">
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
                  className={`relative px-3.5 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all duration-200 cursor-pointer min-w-[52px] text-center ${
                    isSelected 
                      ? 'bg-[var(--foreground)] text-[var(--background)] shadow-sm' 
                      : 'text-[var(--foreground)]/60 hover:text-[var(--foreground)]'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Custom Date Range Picker expander if 'custom' is active */}
        {timeRange === 'custom' && showCustomPicker && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="p-3.5 bg-[var(--foreground)]/[0.02] border border-[var(--border)] rounded-2xl flex flex-wrap items-center gap-3"
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

        {/* Dual KPI Header Section: Side-by-side Sales & Profit with Scrub Sync */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          {/* Sales Card */}
          <div className="p-3.5 rounded-2xl bg-blue-500/[0.06] border border-blue-500/20 relative overflow-hidden flex flex-col justify-between">
            <div className="flex items-center justify-between gap-2 mb-1">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-blue-500 shadow-sm" />
                <span className="text-[11px] font-black uppercase tracking-wider text-blue-400">
                  {activePoint ? `${activePoint.original.label} Sales` : 'Total Sales'}
                </span>
              </div>
              {!activePoint ? (
                <span className={`inline-flex items-center gap-0.5 text-[9px] font-black px-1.5 py-0.5 rounded-md border ${
                  salesGrowth >= 0 
                    ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' 
                    : 'bg-rose-500/10 text-rose-500 border-rose-500/20'
                }`}>
                  {salesGrowth >= 0 ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
                  {salesGrowth >= 0 ? '+' : ''}{salesGrowth.toFixed(1)}% {comparisonLabel}
                </span>
              ) : (
                <span className="text-[9px] font-mono font-bold text-blue-400/80 uppercase">
                  {activePoint.original.bills} Invoices
                </span>
              )}
            </div>

            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-[var(--foreground)]">
                ₹{Math.round(activePoint ? activePoint.original.sales : totals.sales).toLocaleString()}
              </span>
            </div>
          </div>

          {/* Profit Card */}
          <div className="p-3.5 rounded-2xl bg-emerald-500/[0.06] border border-emerald-500/20 relative overflow-hidden flex flex-col justify-between">
            <div className="flex items-center justify-between gap-2 mb-1">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 shadow-sm" />
                <span className="text-[11px] font-black uppercase tracking-wider text-emerald-400">
                  {activePoint ? `${activePoint.original.label} Net Profit` : 'Net Profit'}
                </span>
              </div>
              <span className="inline-flex items-center gap-1 text-[9px] font-black px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-mono">
                <Percent size={10} />
                {(activePoint ? activeMargin : profitMargin).toFixed(1)}% Margin
              </span>
            </div>

            <div className="flex items-baseline justify-between gap-2">
              <span className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-emerald-400">
                ₹{Math.round(activePoint ? activePoint.original.profit : totals.profit).toLocaleString()}
              </span>
              
              {activePoint && (
                <button
                  type="button"
                  onClick={() => setActiveIndex(null)}
                  title="Reset to total view"
                  className="px-2 py-1 rounded-xl bg-[var(--foreground)]/[0.08] hover:bg-[var(--foreground)]/15 text-[var(--foreground)]/70 transition-all cursor-pointer flex items-center gap-1 text-[9px] font-black uppercase tracking-wider"
                >
                  <RotateCcw size={10} />
                  Reset
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Legend Indicator bar */}
        <div className="flex items-center justify-between px-1 text-[10px] font-extrabold uppercase tracking-wider text-[var(--foreground)]/60 flex-wrap gap-2">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <div className="h-2.5 w-6 rounded-full bg-blue-500/80" />
              <span className="text-blue-400">Sales Curve</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-2.5 w-6 rounded-full bg-emerald-500/80" />
              <span className="text-emerald-400">Profit Curve</span>
            </div>
          </div>
          <span className="text-[9px] text-[var(--foreground)]/40 font-mono">
            {activePoint ? activePoint.original.fullLabel : 'Touch and scrub to inspect interval values'}
          </span>
        </div>
      </div>

      {/* 2. GRAPH CANVAS WITH BOTH CURVES (SALES & PROFIT) */}
      <div className="relative pt-1">
        {/* Empty state if no data */}
        {!hasAnyData ? (
          <div className="h-64 rounded-3xl border border-dashed border-[var(--border)] bg-[var(--foreground)]/[0.01] flex flex-col items-center justify-center p-6 text-center space-y-3">
            <div className="h-12 w-12 rounded-2xl bg-[var(--foreground)]/[0.04] border border-[var(--border)] text-[var(--foreground)]/40 flex items-center justify-center">
              <Receipt size={22} />
            </div>
            <div className="space-y-1 max-w-sm">
              <h4 className="text-xs font-black uppercase tracking-tight text-[var(--foreground)]">
                No Sales or Profit records for this period
              </h4>
              <p className="text-[10px] text-[var(--foreground)]/50 leading-relaxed font-semibold uppercase tracking-wider">
                Select Week, Month, Year or Custom to explore invoice records and sales trends.
              </p>
            </div>
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => handleTimeRangeChange('week')}
                className="px-3 py-1.5 rounded-xl bg-[var(--foreground)]/[0.05] hover:bg-[var(--foreground)]/10 text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer"
              >
                This Week
              </button>
              <button
                type="button"
                onClick={() => handleTimeRangeChange('month')}
                className="px-3 py-1.5 rounded-xl bg-[var(--foreground)]/[0.05] hover:bg-[var(--foreground)]/10 text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer"
              >
                This Month
              </button>
              <button
                type="button"
                onClick={() => handleTimeRangeChange('year')}
                className="px-3 py-1.5 rounded-xl bg-[var(--primary)] text-white text-[10px] font-black uppercase tracking-wider transition-all shadow-sm cursor-pointer"
              >
                This Year
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
            className="relative w-full h-[260px] sm:h-[290px] cursor-crosshair select-none touch-pan-y"
          >
            {/* SVG Graph Viewport */}
            <svg
              viewBox={`0 0 ${svgWidth} ${svgHeight}`}
              className="w-full h-full overflow-visible pointer-events-none"
              preserveAspectRatio="none"
            >
              <defs>
                {/* Area Gradient Fill for Sales */}
                <linearGradient id="dualSalesGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={salesColor} stopOpacity="0.28" />
                  <stop offset="60%" stopColor={salesColor} stopOpacity="0.05" />
                  <stop offset="100%" stopColor={salesColor} stopOpacity="0" />
                </linearGradient>

                {/* Area Gradient Fill for Profit */}
                <linearGradient id="dualProfitGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={profitColor} stopOpacity="0.32" />
                  <stop offset="60%" stopColor={profitColor} stopOpacity="0.06" />
                  <stop offset="100%" stopColor={profitColor} stopOpacity="0" />
                </linearGradient>

                {/* Subtle vertical scrub beam filter */}
                <filter id="scrubGlowDual" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>

              {/* Horizontal Reference Gridlines */}
              {[0.25, 0.5, 0.75, 1.0].map((ratio, idx) => {
                const yPos = paddingTop + drawableHeight - ratio * drawableHeight;
                const gridVal = (maxVal * ratio) / 1.18;
                return (
                  <g key={idx} className="opacity-25">
                    <line
                      x1={paddingLeft}
                      y1={yPos}
                      x2={paddingLeft + drawableWidth}
                      y2={yPos}
                      stroke="currentColor"
                      strokeWidth={1}
                      strokeDasharray="4 4"
                    />
                    <text
                      x={paddingLeft - 8}
                      y={yPos + 3}
                      textAnchor="end"
                      fontSize={10}
                      fontWeight="bold"
                      fill="currentColor"
                      className="font-mono opacity-60"
                    >
                      ₹{gridVal >= 1000 ? `${(gridVal / 1000).toFixed(0)}k` : Math.round(gridVal)}
                    </text>
                  </g>
                );
              })}

              {/* Base Bottom Axis Line */}
              <line
                x1={paddingLeft}
                y1={paddingTop + drawableHeight}
                x2={paddingLeft + drawableWidth}
                y2={paddingTop + drawableHeight}
                stroke="currentColor"
                strokeWidth={1.5}
                className="opacity-20"
              />

              {/* Smooth Area Gradient Fill for Sales */}
              {salesFillPath && (
                <path
                  d={salesFillPath}
                  fill="url(#dualSalesGradient)"
                  className="transition-all duration-300"
                />
              )}

              {/* Smooth Area Gradient Fill for Profit */}
              {profitFillPath && (
                <path
                  d={profitFillPath}
                  fill="url(#dualProfitGradient)"
                  className="transition-all duration-300"
                />
              )}

              {/* Smooth Spline Curve Line: SALES (Blue) */}
              {salesLinePath && (
                <path
                  d={salesLinePath}
                  fill="none"
                  stroke={salesColor}
                  strokeWidth={3.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="transition-all duration-300"
                />
              )}

              {/* Smooth Spline Curve Line: PROFIT (Emerald) */}
              {profitLinePath && (
                <path
                  d={profitLinePath}
                  fill="none"
                  stroke={profitColor}
                  strokeWidth={3}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="transition-all duration-300"
                />
              )}

              {/* X-Axis Tick Labels */}
              {coordPoints.map((pt, i) => {
                if (!visibleLabelIndices.has(i)) return null;
                return (
                  <g key={i}>
                    <line
                      x1={pt.x}
                      y1={paddingTop + drawableHeight}
                      x2={pt.x}
                      y2={paddingTop + drawableHeight + 4}
                      stroke="currentColor"
                      strokeWidth={1}
                      className="opacity-30"
                    />
                    <text
                      x={pt.x}
                      y={paddingTop + drawableHeight + 18}
                      textAnchor="middle"
                      fontSize={10}
                      fontWeight="800"
                      fill="currentColor"
                      className="font-mono opacity-50 uppercase tracking-tighter"
                    >
                      {pt.original.label}
                    </text>
                  </g>
                );
              })}

              {/* Active Highlight Vertical Guide Line & Both Points */}
              {activePoint && (
                <g>
                  {/* Vertical Guide Line */}
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

                  {/* SALES Highlight Point */}
                  <circle
                    cx={activePoint.x}
                    cy={activePoint.ySales}
                    r={12}
                    fill={salesColor}
                    opacity={0.2}
                  />
                  <circle
                    cx={activePoint.x}
                    cy={activePoint.ySales}
                    r={6}
                    fill={salesColor}
                    stroke="#ffffff"
                    strokeWidth={2}
                    filter="url(#scrubGlowDual)"
                  />
                  <circle
                    cx={activePoint.x}
                    cy={activePoint.ySales}
                    r={2.5}
                    fill="#ffffff"
                  />

                  {/* PROFIT Highlight Point */}
                  <circle
                    cx={activePoint.x}
                    cy={activePoint.yProfit}
                    r={12}
                    fill={profitColor}
                    opacity={0.2}
                  />
                  <circle
                    cx={activePoint.x}
                    cy={activePoint.yProfit}
                    r={6}
                    fill={profitColor}
                    stroke="#ffffff"
                    strokeWidth={2}
                    filter="url(#scrubGlowDual)"
                  />
                  <circle
                    cx={activePoint.x}
                    cy={activePoint.yProfit}
                    r={2.5}
                    fill="#ffffff"
                  />
                </g>
              )}
            </svg>

            {/* Floating Dual Dynamic Tooltip Capsule pinned above active scrub point */}
            <AnimatePresence>
              {activePoint && (
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 5 }}
                  transition={{ duration: 0.12 }}
                  className="absolute pointer-events-none z-20"
                  style={{
                    left: `${Math.max(16, Math.min(84, (activePoint.x / svgWidth) * 100))}%`,
                    top: '8px',
                    transform: 'translateX(-50%)'
                  }}
                >
                  <div className="bg-[var(--card)] border border-[var(--border)] text-[var(--foreground)] px-3.5 py-2 rounded-2xl shadow-2xl backdrop-blur-xl flex items-center gap-3 whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <div className="h-2 w-2 rounded-full bg-blue-500" />
                      <span className="text-[10px] font-black font-mono text-blue-400">
                        ₹{Math.round(activePoint.original.sales).toLocaleString()}
                      </span>
                    </div>

                    <div className="h-3 w-px bg-[var(--border)]" />

                    <div className="flex items-center gap-1.5">
                      <div className="h-2 w-2 rounded-full bg-emerald-500" />
                      <span className="text-[10px] font-black font-mono text-emerald-400">
                        ₹{Math.round(activePoint.original.profit).toLocaleString()}
                      </span>
                    </div>

                    <span className="text-[9px] font-extrabold text-[var(--foreground)]/50 border-l border-[var(--border)] pl-2 uppercase font-mono">
                      {activePoint.original.label}
                    </span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* 3. BOTTOM QUICK SUMMARY METRICS PILLS (Sales, Profit, Invoices, Units Sold) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-[var(--border)]">
        <div className="p-2.5 rounded-2xl bg-[var(--foreground)]/[0.02] border border-[var(--border)] space-y-0.5">
          <span className="text-[8.5px] font-black uppercase tracking-wider text-[var(--foreground)]/40 block font-mono">
            Avg Daily Sales
          </span>
          <span className="text-xs font-black font-mono text-blue-400">
            ₹{dataPoints.length > 0
              ? Math.round(totals.sales / dataPoints.length).toLocaleString()
              : '0'}
          </span>
        </div>

        <div className="p-2.5 rounded-2xl bg-[var(--foreground)]/[0.02] border border-[var(--border)] space-y-0.5">
          <span className="text-[8.5px] font-black uppercase tracking-wider text-[var(--foreground)]/40 block font-mono">
            Avg Daily Profit
          </span>
          <span className="text-xs font-black font-mono text-emerald-400 truncate block">
            ₹{dataPoints.length > 0
              ? Math.round(totals.profit / dataPoints.length).toLocaleString()
              : '0'}
          </span>
        </div>

        <div className="p-2.5 rounded-2xl bg-[var(--foreground)]/[0.02] border border-[var(--border)] space-y-0.5">
          <span className="text-[8.5px] font-black uppercase tracking-wider text-[var(--foreground)]/40 block font-mono">
            Total Invoices
          </span>
          <span className="text-xs font-black font-mono text-[var(--foreground)]">
            {totals.bills} Bills
          </span>
        </div>

        <div className="p-2.5 rounded-2xl bg-[var(--foreground)]/[0.02] border border-[var(--border)] space-y-0.5">
          <span className="text-[8.5px] font-black uppercase tracking-wider text-[var(--foreground)]/40 block font-mono">
            Overall Margin
          </span>
          <span className="text-xs font-black font-mono text-emerald-500 flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            {profitMargin.toFixed(1)}% Net Margin
          </span>
        </div>
      </div>

    </div>
  );
}
