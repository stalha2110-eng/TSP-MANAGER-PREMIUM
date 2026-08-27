import React, { useState, useEffect, useMemo } from 'react';
import { 
  Zap, Download, Printer, Filter, Search, Tag, Calendar, 
  Trash2, ShieldCheck, PieChart, DollarSign, Clock, ArrowUpRight, Lock, Unlock
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { AppState, Bill, UnbilledEntry } from '../types';
import { cn } from '../lib/utils';
import { 
  getUnbilledEntries, 
  deleteUnbilledEntry, 
  isUnbilledSessionUnlocked, 
  setUnbilledSessionUnlocked,
  UNBILLED_UPDATED_EVENT 
} from '../lib/unbilledStorage';
import { PINScreen } from './ui/PINScreen';

interface UnbilledAuditAnalyticsSectionProps {
  state: AppState;
  timePeriod: 'today' | 'week' | 'month' | 'year' | 'all';
  currentBills: Bill[];
  themeContainerStyle: any;
  themeChartColors: any;
  t: any;
}

export function UnbilledAuditAnalyticsSection({
  state,
  timePeriod,
  currentBills,
  themeContainerStyle,
  themeChartColors,
  t
}: UnbilledAuditAnalyticsSectionProps) {
  const [entries, setEntries] = useState<UnbilledEntry[]>(getUnbilledEntries);
  const [searchFilter, setSearchFilter] = useState<string>('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');
  const [showPINModal, setShowPINModal] = useState<boolean>(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  // Sync real-time entries
  const refreshEntries = () => {
    setEntries(getUnbilledEntries());
  };

  useEffect(() => {
    refreshEntries();
    const handleUpdate = () => refreshEntries();
    window.addEventListener(UNBILLED_UPDATED_EVENT, handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener(UNBILLED_UPDATED_EVENT, handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  // Filter entries based on timePeriod
  const periodFilteredEntries = useMemo(() => {
    const now = new Date();
    const formatMidnight = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
    
    let currentStart = formatMidnight(now);
    if (timePeriod === 'today') {
      currentStart = formatMidnight(now);
    } else if (timePeriod === 'week') {
      const dayOfWeek = now.getDay();
      const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      currentStart = formatMidnight(new Date(now.getFullYear(), now.getMonth(), now.getDate() + diffToMonday));
    } else if (timePeriod === 'month') {
      currentStart = new Date(now.getFullYear(), now.getMonth(), 1);
    } else if (timePeriod === 'year') {
      currentStart = new Date(now.getFullYear(), 0, 1);
    }

    const startTime = currentStart.getTime();
    return entries.filter(e => (e.timestamp || new Date(e.dateStr).getTime()) >= startTime);
  }, [entries, timePeriod]);

  // Total formal revenue from receipt bills
  const formalRevenue = useMemo(() => {
    return currentBills.reduce((sum, b) => sum + (Number(b.total) || 0), 0);
  }, [currentBills]);

  // Total unbilled revenue
  const unbilledRevenue = useMemo(() => {
    return periodFilteredEntries.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  }, [periodFilteredEntries]);

  // Gross revenue
  const totalGrossRevenue = formalRevenue + unbilledRevenue;
  const unbilledSharePercent = totalGrossRevenue > 0 ? (unbilledRevenue / totalGrossRevenue) * 100 : 0;

  // Category breakdown stats
  const categoryBreakdown = useMemo(() => {
    const map: Record<string, { count: number; total: number }> = {};
    periodFilteredEntries.forEach(e => {
      const cat = e.category || 'General';
      if (!map[cat]) map[cat] = { count: 0, total: 0 };
      map[cat].count += 1;
      map[cat].total += Number(e.amount) || 0;
    });

    return Object.entries(map).map(([category, data]) => ({
      category,
      count: data.count,
      total: data.total,
      percentage: unbilledRevenue > 0 ? (data.total / unbilledRevenue) * 100 : 0
    })).sort((a, b) => b.total - a.total);
  }, [periodFilteredEntries, unbilledRevenue]);

  // Unique categories for filtering
  const availableCategories = useMemo(() => {
    return Array.from(new Set(periodFilteredEntries.map(e => e.category || 'General')));
  }, [periodFilteredEntries]);

  // Search & category filtered table list
  const displayAuditEntries = useMemo(() => {
    return periodFilteredEntries.filter(e => {
      const matchCat = selectedCategoryFilter === 'all' || (e.category || 'General') === selectedCategoryFilter;
      const q = searchFilter.trim().toLowerCase();
      const matchQuery = !q || 
        (e.category && e.category.toLowerCase().includes(q)) ||
        (e.cashier && e.cashier.toLowerCase().includes(q)) ||
        (e.amount && e.amount.toString().includes(q)) ||
        (e.note && e.note.toLowerCase().includes(q));
      return matchCat && matchQuery;
    });
  }, [periodFilteredEntries, selectedCategoryFilter, searchFilter]);

  // CSV Export Handler
  const downloadUnbilledCSV = () => {
    if (periodFilteredEntries.length === 0) {
      alert('No unbilled micro-sales data available to export for this timeframe.');
      return;
    }

    const headers = ['Entry ID', 'Timestamp', 'Category Tag', 'Cashier Session', 'Amount (INR)', 'Note'];
    const rows = periodFilteredEntries.map(e => [
      e.id,
      new Date(e.timestamp || e.dateStr).toLocaleString(),
      `"${e.category || 'General'}"`,
      `"${e.cashier || 'Store Cashier'}"`,
      e.amount,
      `"${e.note || ''}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Unbilled_MicroSales_Audit_${state.settings.storeName || 'Store'}_${timePeriod}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Printable / PDF Reconciliation Report Handler
  const printUnbilledAuditReport = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow popup windows to print the reconciliation audit report.');
      return;
    }

    const storeName = state.settings.storeName || 'TS PRICE MANAGER STORE';
    const reportDate = new Date().toLocaleString();

    const categoryRows = categoryBreakdown.map(c => `
      <tr>
        <td style="padding: 6px 10px; border-bottom: 1px solid #e2e8f0; font-weight: bold;">${c.category}</td>
        <td style="padding: 6px 10px; border-bottom: 1px solid #e2e8f0; text-align: center;">${c.count}</td>
        <td style="padding: 6px 10px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: bold; font-family: monospace;">₹${c.total.toLocaleString()}</td>
        <td style="padding: 6px 10px; border-bottom: 1px solid #e2e8f0; text-align: right;">${c.percentage.toFixed(1)}%</td>
      </tr>
    `).join('');

    const entryRows = periodFilteredEntries.slice(0, 100).map((e, idx) => `
      <tr>
        <td style="padding: 6px 10px; border-bottom: 1px solid #e2e8f0; font-size: 11px;">${idx + 1}</td>
        <td style="padding: 6px 10px; border-bottom: 1px solid #e2e8f0; font-size: 11px;">${new Date(e.timestamp || e.dateStr).toLocaleString()}</td>
        <td style="padding: 6px 10px; border-bottom: 1px solid #e2e8f0; font-size: 11px; font-weight: bold;">${e.category || 'General'}</td>
        <td style="padding: 6px 10px; border-bottom: 1px solid #e2e8f0; font-size: 11px;">${e.cashier || 'Store Cashier'}</td>
        <td style="padding: 6px 10px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: bold; font-family: monospace;">₹${e.amount}</td>
      </tr>
    `).join('');

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Unbilled Micro-Sales Audit - ${storeName}</title>
          <style>
            body { font-family: system-ui, -apple-system, sans-serif; color: #1e293b; padding: 24px; margin: 0; }
            .header { text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 16px; }
            .title { font-size: 20px; font-weight: 900; text-transform: uppercase; letter-spacing: 1px; }
            .subtitle { font-size: 12px; font-weight: bold; color: #64748b; margin-top: 4px; }
            .summary-box { display: flex; justify-content: space-between; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 12px; margin-bottom: 20px; }
            .metric { text-align: center; }
            .metric-label { font-size: 10px; font-weight: 800; text-transform: uppercase; color: #64748b; }
            .metric-val { font-size: 16px; font-weight: 900; font-family: monospace; color: #0f172a; margin-top: 2px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; text-align: left; }
            th { background: #f1f5f9; padding: 8px 10px; font-size: 11px; font-weight: 900; text-transform: uppercase; border-bottom: 2px solid #cbd5e1; }
            .footer { margin-top: 30px; border-top: 1px solid #e2e8f0; padding-top: 10px; text-align: justify; font-size: 10px; color: #94a3b8; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="title">${storeName}</div>
            <div class="subtitle">Unbilled Rush Hour & Micro-Sales Daily Audit Statement (${timePeriod.toUpperCase()})</div>
            <div style="font-size: 10px; color: #94a3b8; margin-top: 2px;">Generated at: ${reportDate}</div>
          </div>

          <div class="summary-box">
            <div class="metric">
              <div class="metric-label">Formal Receipt Sales</div>
              <div class="metric-val">₹${formalRevenue.toLocaleString()}</div>
            </div>
            <div class="metric">
              <div class="metric-label">Unbilled Micro-Sales</div>
              <div class="metric-val" style="color: #d97706;">₹${unbilledRevenue.toLocaleString()} (${periodFilteredEntries.length} entries)</div>
            </div>
            <div class="metric">
              <div class="metric-label">Total Gross Volume</div>
              <div class="metric-val" style="color: #059669;">₹${totalGrossRevenue.toLocaleString()}</div>
            </div>
            <div class="metric">
              <div class="metric-label">Unbilled Share %</div>
              <div class="metric-val">${unbilledSharePercent.toFixed(1)}%</div>
            </div>
          </div>

          <h4 style="font-size: 12px; text-transform: uppercase; margin-bottom: 8px;">Category-wise Micro-Sales Distribution</h4>
          <table>
            <thead>
              <tr>
                <th>Category Tag</th>
                <th style="text-align: center;">Total Transactions</th>
                <th style="text-align: right;">Revenue Amount</th>
                <th style="text-align: right;">Share %</th>
              </tr>
            </thead>
            <tbody>
              ${categoryRows || '<tr><td colspan="4" style="text-align:center; padding:12px;">No unbilled entries in selected period</td></tr>'}
            </tbody>
          </table>

          <h4 style="font-size: 12px; text-transform: uppercase; margin-bottom: 8px;">Itemized Unbilled Audit Log (${periodFilteredEntries.length} entries)</h4>
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Timestamp</th>
                <th>Category</th>
                <th>Cashier Session</th>
                <th style="text-align: right;">Amount (INR)</th>
              </tr>
            </thead>
            <tbody>
              ${entryRows || '<tr><td colspan="5" style="text-align:center; padding:12px;">No unbilled entries found</td></tr>'}
            </tbody>
          </table>

          <div class="footer">
            Note: This document provides an official audit trail for unbilled rush hour and micro-sales cash drawer reconciliation. Verified and synced by TS Price Manager Telemetry System.
          </div>

          <script>
            window.onload = function() { window.print(); };
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  const handlePINSuccess = () => {
    setUnbilledSessionUnlocked(true);
    setShowPINModal(false);
    if (pendingDeleteId) {
      deleteUnbilledEntry(pendingDeleteId);
      setPendingDeleteId(null);
      refreshEntries();
    }
  };

  const handleDeleteRequest = (id: string) => {
    if (isUnbilledSessionUnlocked()) {
      deleteUnbilledEntry(id);
      refreshEntries();
    } else {
      setPendingDeleteId(id);
      setShowPINModal(true);
    }
  };

  return (
    <div className="space-y-6 my-8 pt-4 border-t border-[var(--border)]">
      
      {/* SECTION HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 flex items-center gap-1">
              <Zap size={11} /> Micro-Sales Audit
            </span>
            <span className="text-[10px] font-bold text-[var(--foreground)]/50 font-mono uppercase">
              {timePeriod.toUpperCase()} INTERVAL
            </span>
          </div>
          <h3 className="text-xl font-black uppercase tracking-tight text-[var(--foreground)] mt-1 flex items-center gap-2">
            Unbilled Rush Hour & Micro-Sales Audit
          </h3>
          <p className="text-[11px] font-semibold opacity-60 text-[var(--foreground)]">
            Real-time reconciliation audit trail for counter micro-sales, loose items & unbilled rush hour transactions
          </p>
        </div>

        {/* ONE-CLICK EXPORT ACTIONS */}
        <div className="flex items-center gap-2">
          <button
            onClick={downloadUnbilledCSV}
            className="px-3.5 py-2 rounded-xl bg-[var(--foreground)]/[0.05] hover:bg-[var(--foreground)]/[0.1] text-[var(--foreground)] text-xs font-bold border border-[var(--border)] flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
            title="Download CSV Spreadsheet Audit Log"
          >
            <Download size={14} className="text-amber-500" />
            <span>CSV Export</span>
          </button>

          <button
            onClick={printUnbilledAuditReport}
            className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer shadow-md active:scale-95"
            title="Print or Export PDF Cash Drawer Reconciliation Audit"
          >
            <Printer size={14} />
            <span>Reconciliation Report (PDF/Print)</span>
          </button>
        </div>
      </div>

      {/* REVENUE COMPARISON KPI CARDS (4-GRID) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* KPI 1: Formal Receipt Sales */}
        <div className={cn("p-4 rounded-3xl border relative overflow-hidden space-y-1.5", themeContainerStyle.cardBg, themeChartColors.cardBorder)}>
          <span className="text-[9.5px] font-black uppercase tracking-widest text-[var(--foreground)]/50 block">
            Formal Receipt Sales
          </span>
          <div className="text-2xl font-black font-mono text-[var(--foreground)]">
            ₹{formalRevenue.toLocaleString()}
          </div>
          <p className="text-[9px] font-bold text-[var(--foreground)]/40 font-mono">
            {currentBills.length} formal bills issued
          </p>
        </div>

        {/* KPI 2: Unbilled Micro-Sales */}
        <div className="p-4 rounded-3xl border border-amber-500/30 bg-amber-500/5 relative overflow-hidden space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[9.5px] font-black uppercase tracking-widest text-amber-700 dark:text-amber-400 block">
              Unbilled Micro-Sales
            </span>
            <Zap size={14} className="text-amber-500 animate-pulse" />
          </div>
          <div className="text-2xl font-black font-mono text-amber-600 dark:text-amber-300">
            ₹{unbilledRevenue.toLocaleString()}
          </div>
          <p className="text-[9px] font-bold text-amber-700/60 dark:text-amber-400/60 font-mono">
            {periodFilteredEntries.length} unbilled entries logged
          </p>
        </div>

        {/* KPI 3: Total Gross Volume */}
        <div className={cn("p-4 rounded-3xl border relative overflow-hidden space-y-1.5", themeContainerStyle.cardBg, themeChartColors.cardBorder)}>
          <span className="text-[9.5px] font-black uppercase tracking-widest text-[var(--foreground)]/50 block">
            Total Gross Counter Volume
          </span>
          <div className="text-2xl font-black font-mono text-emerald-500">
            ₹{totalGrossRevenue.toLocaleString()}
          </div>
          <p className="text-[9px] font-bold text-emerald-600/70 dark:text-emerald-400/70">
            Receipts + Quick Ledger Combined
          </p>
        </div>

        {/* KPI 4: Unbilled Volume Share % */}
        <div className={cn("p-4 rounded-3xl border relative overflow-hidden space-y-1.5", themeContainerStyle.cardBg, themeChartColors.cardBorder)}>
          <span className="text-[9.5px] font-black uppercase tracking-widest text-[var(--foreground)]/50 block">
            Unbilled Share in Gross Revenue
          </span>
          <div className="text-2xl font-black font-mono text-amber-500">
            {unbilledSharePercent.toFixed(1)}%
          </div>
          <p className="text-[9px] font-bold text-[var(--foreground)]/40">
            Share of rush hour & micro-sales
          </p>
        </div>

      </div>

      {/* CATEGORY-WISE MICRO-SALES DISTRIBUTION CHART & BREAKDOWN */}
      <div className={cn("p-6 rounded-3xl border space-y-4", themeContainerStyle.cardBg, themeChartColors.cardBorder)}>
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-black uppercase tracking-wider text-[var(--foreground)] flex items-center gap-2">
              <PieChart size={16} className="text-amber-500" />
              Category-Wise Micro-Sales Distribution
            </h4>
            <p className="text-[10px] font-bold text-[var(--foreground)]/50 uppercase tracking-wider">
              Sales breakdown across user custom category tags
            </p>
          </div>
          <span className="text-[10px] font-black font-mono text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20">
            {categoryBreakdown.length} Active Categories
          </span>
        </div>

        {categoryBreakdown.length === 0 ? (
          <div className="py-10 text-center text-xs font-bold text-[var(--foreground)]/40 uppercase tracking-widest">
            No unbilled sales logged under selected timeframe
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            {categoryBreakdown.map(item => (
              <div key={item.category} className="p-3.5 rounded-2xl bg-[var(--foreground)]/[0.02] border border-[var(--border)] space-y-2">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-[var(--foreground)] flex items-center gap-1.5">
                    <Tag size={12} className="text-amber-500" />
                    {item.category}
                  </span>
                  <span className="font-mono text-amber-600 dark:text-amber-400 font-extrabold">
                    ₹{item.total.toLocaleString()} ({item.count} sales)
                  </span>
                </div>

                <div className="h-2 w-full bg-[var(--foreground)]/[0.05] rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full transition-all duration-500"
                    style={{ width: `${Math.max(4, item.percentage)}%` }}
                  />
                </div>

                <div className="flex justify-between text-[9px] font-black text-[var(--foreground)]/50 font-mono">
                  <span>Share in Unbilled Total</span>
                  <span>{item.percentage.toFixed(1)}%</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* DETAILED AUDIT LOG TABLE */}
      <div className={cn("p-6 rounded-3xl border space-y-4", themeContainerStyle.cardBg, themeChartColors.cardBorder)}>
        
        {/* Table Controls Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h4 className="text-sm font-black uppercase tracking-wider text-[var(--foreground)] flex items-center gap-2">
              <Clock size={16} className="text-[var(--primary)]" />
              Itemized Unbilled Audit Log
              <span className="ml-2 text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-[var(--primary)]/10 text-[var(--primary)] border border-[var(--primary)]/20">
                {displayAuditEntries.length} Records
              </span>
            </h4>
            <p className="text-[10px] font-bold text-[var(--foreground)]/50 uppercase tracking-wider">
              Detailed transaction ledger • Showing 15 records at a time (Scroll inside table to view all)
            </p>
          </div>

          {/* Search & Category Filter */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Search Box */}
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--foreground)]/40" />
              <input
                type="text"
                placeholder="Search amount, cashier, tag..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="pl-8 pr-3 py-1.5 rounded-xl bg-[var(--background)] border border-[var(--border)] text-xs font-bold text-[var(--foreground)] w-48 focus:outline-none focus:border-[var(--primary)]"
              />
            </div>

            {/* Category Dropdown Filter */}
            <div className="relative">
              <select
                value={selectedCategoryFilter}
                onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-[var(--background)] border border-[var(--border)] text-xs font-bold text-[var(--foreground)] focus:outline-none focus:border-[var(--primary)] cursor-pointer"
              >
                <option value="all">All Category Tags</option>
                {availableCategories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Audit Log Table Container with 15-record scrollable max-height */}
        <div className="overflow-x-auto overflow-y-auto max-h-[520px] rounded-2xl border border-[var(--border)]/70 bg-[var(--background)]/30 custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 z-10 bg-[var(--card)] border-b border-[var(--border)] shadow-xs">
              <tr className="text-[10px] font-black uppercase tracking-wider text-[var(--foreground)]/60">
                <th className="py-2.5 px-3">Timestamp</th>
                <th className="py-2.5 px-3">Category Tag</th>
                <th className="py-2.5 px-3">Cashier Session</th>
                <th className="py-2.5 px-3 text-right">Amount (INR)</th>
                <th className="py-2.5 px-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]/60 text-xs">
              {displayAuditEntries.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-xs font-bold text-[var(--foreground)]/40 uppercase tracking-widest">
                    No unbilled audit records found for this filter
                  </td>
                </tr>
              ) : (
                displayAuditEntries.map(entry => (
                  <tr key={entry.id} className="hover:bg-[var(--foreground)]/[0.03] transition-colors">
                    <td className="py-2.5 px-3 font-mono text-[11px] text-[var(--foreground)]/70">
                      {new Date(entry.timestamp || entry.dateStr).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="px-2.5 py-0.5 rounded-md bg-amber-500/15 text-amber-700 dark:text-amber-300 font-extrabold text-[10px] border border-amber-500/30">
                        {entry.category || 'General'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-medium text-[var(--foreground)]/80">
                      {entry.cashier || 'Store Cashier'}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-black text-amber-600 dark:text-amber-400">
                      ₹{entry.amount}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <button
                        onClick={() => handleDeleteRequest(entry.id)}
                        className="p-1 rounded-lg text-zinc-400 hover:text-red-500 hover:bg-red-500/10 transition-all cursor-pointer"
                        title="Delete record from audit"
                      >
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Scroll helper footer */}
        {displayAuditEntries.length > 0 && (
          <div className="flex items-center justify-between text-[11px] font-bold text-[var(--foreground)]/50 pt-1 px-1">
            <span>Showing {displayAuditEntries.length} total entries</span>
            <span>{displayAuditEntries.length > 15 ? "↕️ Scroll table to view remaining records" : "All records visible"}</span>
          </div>
        )}

      </div>

      {/* PIN SECURITY VERIFICATION MODAL */}
      {showPINModal && (
        <PINScreen
          mode="unlock"
          correctPIN={state.settings.pin || '000000'}
          title="Verify PIN to Audit Record"
          description="Enter your 6-digit App Security PIN to remove this unbilled record."
          onSuccess={handlePINSuccess}
          onCancel={() => {
            setShowPINModal(false);
            setPendingDeleteId(null);
          }}
        />
      )}

    </div>
  );
}
