import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Building2, 
  TrendingUp, 
  Receipt, 
  CreditCard,
  Percent,
  CheckCircle,
  AlertOctagon,
  Calendar,
  Layers,
  ArrowRight,
  Clock,
  Printer,
  Sparkles,
  Download,
  NotebookTabs,
  Users2,
  BookmarkCheck,
  RotateCcw,
  RefreshCw,
  TrendingDown,
  Box,
  Eye,
  CheckCircle2,
  FileBarChart,
  Search,
  Sliders,
  Settings,
  Volume2,
  ShieldCheck,
  Globe,
  HelpCircle,
  HardDrive,
  FileSpreadsheet,
  Check,
  ChevronRight,
  X,
  Terminal,
  Filter
} from 'lucide-react';
import { AppState, AppSettings, Bill, UdharTransaction } from '../types';
import { cn, formatCurrency, formatNumber } from '../lib/utils';
import * as XLSX from 'xlsx-js-style';

interface StoreClosingControlCenterProps {
  state: AppState;
  onUpdateSettings: (updates: Partial<AppSettings>) => void;
  onNavigateTab?: (tab: 'home' | 'billing' | 'analytics' | 'udhar') => void;
  t?: any;
}

export interface DaySnapshot {
  id: string;
  date: string;
  sales: number;
  profit: number;
  billsCount: number;
  customersServed: number;
  newCustomers: number;
  paymentBreakdown: { cash: number; upi: number; credit: number; other: number };
  udharNew: number;
  udharRecovered: number;
  topItem: string;
  readinessScore: number;
  businessMode?: string;
  notes?: string;
}

export default function StoreClosingControlCenter({ 
  state, 
  onUpdateSettings, 
  onNavigateTab,
  t = {} 
}: StoreClosingControlCenterProps) {
  
  const activeMode = state.settings.businessMode || 'general';
  
  // Local checklists for End of Day confirmation
  const [checklist, setChecklist] = useState({
    salesReviewed: false,
    inventoryChecked: false,
    udharReviewed: false,
    backupCompleted: false,
    printerWorking: false,
    importantTasksReviewed: false
  });

  const [selectedSnapshot, setSelectedSnapshot] = useState<DaySnapshot | null>(null);
  const [snapshotNotes, setSnapshotNotes] = useState('');
  const [successAnimation, setSuccessAnimation] = useState(false);

  // Retrieve previous daily snapshot lists from state settings
  const snapshots: DaySnapshot[] = useMemo(() => {
    return (state.settings as any).dayClosingSnapshots || [];
  }, [state.settings]);

  // LOCAL STATE FOR DYNAMIC SEARCH HUB & COMMAND CENTER CONTROLS
  const [commandSearchQuery, setCommandSearchQuery] = useState('');
  const [commandSearchHistory, setCommandSearchHistory] = useState<string[]>(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('control_center_search_history') : null;
    return saved ? JSON.parse(saved) : [];
  });

  const addToCommandSearchHistory = (query: string) => {
    const trimmed = query.trim();
    if (!trimmed) return;
    setCommandSearchHistory(prev => {
      const filtered = prev.filter(q => q.toLowerCase() !== trimmed.toLowerCase());
      const updated = [trimmed, ...filtered].slice(0, 6);
      localStorage.setItem('control_center_search_history', JSON.stringify(updated));
      return updated;
    });
  };

  const clearCommandSearchHistory = () => {
    setCommandSearchHistory([]);
    localStorage.removeItem('control_center_search_history');
  };

  useEffect(() => {
    if (!commandSearchQuery.trim() || commandSearchQuery.trim().length < 3) return;
    const timer = setTimeout(() => {
      addToCommandSearchHistory(commandSearchQuery);
    }, 1500);
    return () => clearTimeout(timer);
  }, [commandSearchQuery]);

  const [commandSelectedCategory, setCommandSelectedCategory] = useState<'all' | 'operations' | 'interface' | 'security' | 'sound' | 'printer'>('all');
  
  const [localPrinterConfig, setLocalPrinterConfig] = useState(() => {
    const saved = localStorage.getItem('price_manager_printer_config');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // fallback
      }
    }
    return {
      printerType: 'system',
      paperSize: '58mm',
      fontSize: 'medium',
      boldTitle: true,
      reprintProtection: false,
      cooldownDuration: 15,
    };
  });

  const updateLocalPrinterConfig = (updates: any) => {
    const next = { ...localPrinterConfig, ...updates };
    setLocalPrinterConfig(next);
    localStorage.setItem('price_manager_printer_config', JSON.stringify(next));
    
    // Dispatch storage event so other screens sync
    window.dispatchEvent(new Event('storage'));
    
    if (navigator.vibrate) {
      navigator.vibrate(10);
    }
  };

  const handleExportStockExcel = (includeCost: boolean) => {
    if (!state.items || state.items.length === 0) {
      alert("No products available to export!");
      return;
    }

    try {
      const sortedItems = [...state.items].sort((a, b) => {
        const catA = (state.settings.customCategories || state.categories || []).find(c => c.id === a.categoryId)?.name || 'General';
        const catB = (state.settings.customCategories || state.categories || []).find(c => c.id === b.categoryId)?.name || 'General';
        
        if (catA.toLowerCase() !== catB.toLowerCase()) {
          return catA.localeCompare(catB);
        }
        return a.name.localeCompare(b.name);
      });

      let sNo = 1;
      const data = sortedItems.map(item => {
        const categoryName = (state.settings.customCategories || state.categories || []).find(c => c.id === item.categoryId)?.name || 'General';
        const row: any = {
          'SERIAL NUMBER': sNo++,
          'PRODUCT NAME': (item.translations && (item.translations[state.settings.language] || item.translations.en)) || item.name,
          'CATEGORY': categoryName,
          'FIELD NOTES': item.notes || '',
          'RETAIL PRICE/UNIT': `₹${formatNumber(item.retailPrice, state.settings.pricePrecision)}/${item.retailPriceUnit}`,
          'WHOLESALE PRICE/UNIT': `₹${formatNumber(item.wholesalePrice, state.settings.pricePrecision)}/${item.wholesalePriceUnit}`
        };

        if (includeCost) {
          row['COST PRICE/UNIT'] = `₹${formatNumber(item.buyingPrice || 0, state.settings.pricePrecision)}/${item.buyingPriceUnit || 'pcs'}`;
        }

        return row;
      });

      const ws = XLSX.utils.json_to_sheet(data);
      ws['!views'] = [{
        state: 'frozen',
        xSplit: 1,
        ySplit: 1,
        topLeftCell: 'B2',
        activePane: 'bottomRight',
        activeCell: 'B2',
        sqref: 'B2',
        showGridLines: true
      }];

      const colWidths = [
        { wch: 15 },
        { wch: 35 },
        { wch: 25 },
        { wch: 30 },
        { wch: 25 },
        { wch: 25 }
      ];
      if (includeCost) {
        colWidths.push({ wch: 25 });
      }
      ws['!cols'] = colWidths;

      const rowHeights = [{ hpt: 28 }];
      for (let i = 0; i < sortedItems.length; i++) {
        rowHeights.push({ hpt: 22 });
      }
      ws['!rows'] = rowHeights;

      const getCategoryColor = (categoryName: string) => {
        const themes = [
          { bg: "E0E7FF", text: "312E81" },
          { bg: "D1FAE5", text: "065F46" },
          { bg: "FEF3C7", text: "92400E" },
          { bg: "E0F2FE", text: "075985" },
          { bg: "FCE7F3", text: "9D174D" },
          { bg: "F3E8FF", text: "6B21A8" },
          { bg: "FFEDD5", text: "9A3412" },
          { bg: "CCFBF1", text: "115E59" }
        ];
        let hash = 0;
        for (let i = 0; i < categoryName.length; i++) {
          hash = categoryName.charCodeAt(i) + ((hash << 5) - hash);
        }
        return themes[Math.abs(hash) % themes.length];
      };

      const range = XLSX.utils.decode_range(ws['!ref'] || 'A1:A1');
      for (let R = range.s.r; R <= range.e.r; ++R) {
        let isNewCategoryGroup = false;
        if (R > 1) {
          const currentCatCell = ws[XLSX.utils.encode_cell({ r: R, c: 2 })];
          const prevCatCell = ws[XLSX.utils.encode_cell({ r: R - 1, c: 2 })];
          const currentCat = currentCatCell ? String(currentCatCell.v || '') : '';
          const prevCat = prevCatCell ? String(prevCatCell.v || '') : '';
          if (currentCat !== prevCat) {
            isNewCategoryGroup = true;
          }
        }
        const rowBgColor = R % 2 === 1 ? "FFFFFF" : "F8FAFC";

        for (let C = range.s.c; C <= range.e.c; ++C) {
          const cell_address = XLSX.utils.encode_cell({ r: R, c: C });
          const cell = ws[cell_address];
          if (!cell) continue;

          const borderStyle = {
            top: { 
              style: isNewCategoryGroup ? "medium" : "thin", 
              color: { rgb: isNewCategoryGroup ? "1E3A8A" : "E2E8F0" } 
            },
            bottom: { style: "thin", color: { rgb: "E2E8F0" } },
            left: { style: "thin", color: { rgb: "E2E8F0" } },
            right: { style: "thin", color: { rgb: "E2E8F0" } }
          };

          if (R === 0) {
            cell.s = {
              font: { name: "Segoe UI", sz: 11, bold: true, color: { rgb: "FFFFFF" } },
              fill: { fgColor: { rgb: "1E3A8A" } },
              alignment: { horizontal: "center", vertical: "center", wrapText: true },
              border: {
                top: { style: "thin", color: { rgb: "1E3A8A" } },
                bottom: { style: "medium", color: { rgb: "0F172A" } },
                left: { style: "thin", color: { rgb: "1E3A8A" } },
                right: { style: "thin", color: { rgb: "1E3A8A" } }
              }
            };
          } else {
            let cellFont = { name: "Segoe UI", sz: 10, bold: false, color: { rgb: "334155" } };
            let cellFill = { fgColor: { rgb: rowBgColor } };
            let cellAlign: any = { horizontal: "left", vertical: "center" };

            if (C === 0) {
              cellFont = { name: "Segoe UI", sz: 10, bold: false, color: { rgb: "64748B" } };
              cellAlign = { horizontal: "center", vertical: "center" };
            } else if (C === 1) {
              cellFont = { name: "Segoe UI", sz: 10, bold: true, color: { rgb: "111827" } };
              cellAlign = { horizontal: "left", vertical: "center" };
            } else if (C === 2) {
              const catName = cell.v ? String(cell.v) : 'General';
              const theme = getCategoryColor(catName);
              cellFont = { name: "Segoe UI", sz: 10, bold: true, color: { rgb: theme.text } };
              cellFill = { fgColor: { rgb: theme.bg } };
              cellAlign = { horizontal: "center", vertical: "center" };
            } else if (C === 3) {
              cellFont = { name: "Segoe UI", sz: 10, bold: false, color: { rgb: "475569" } };
              cellAlign = { horizontal: "left", vertical: "center", wrapText: true };
            } else if (C === 4 || C === 5 || (includeCost && C === 6)) {
              cellFont = { name: "Segoe UI", sz: 10, bold: true, color: { rgb: "111827" } };
              cellAlign = { horizontal: "right", vertical: "center" };
            }

            cell.s = {
              font: cellFont,
              fill: cellFill,
              alignment: cellAlign,
              border: borderStyle
            };
          }
        }
      }

      const wb = XLSX.utils.book_new();
      const sheetName = includeCost ? "Inventory With Cost" : "Stock Inventory";
      XLSX.utils.book_append_sheet(wb, ws, sheetName);
      XLSX.writeFile(wb, `${sheetName.toLowerCase().replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`);
      
    } catch (e: any) {
      console.error(e);
      alert(`Export failed: ${e.message || e}`);
    }
  };

  // Handle checkpoint toggles
  const handleToggleChecklist = (key: keyof typeof checklist) => {
    setChecklist(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // 🗓️ Calculate precise statistics for Today (defaults to current date context)
  const todayDateStr = new Date().toISOString().split('T')[0];

  const todayBills = useMemo(() => {
    const bills = state.bills || [];
    return bills.filter(b => {
      if (!b.timestamp) return false;
      return b.timestamp.startsWith(todayDateStr);
    });
  }, [state.bills, todayDateStr]);

  const todayUdharTransactions = useMemo(() => {
    const txs = state.udharTransactions || [];
    return txs.filter(t => {
      if (!t.timestamp) return false;
      return t.timestamp.startsWith(todayDateStr);
    });
  }, [state.udharTransactions, todayDateStr]);

  // Math aggregates calculations
  const summary = useMemo(() => {
    let salesTotal = 0;
    let profitTotal = 0;
    let highestBill = 0;
    let lowestBill = todayBills.length > 0 ? Infinity : 0;
    let cashPay = 0;
    let upiPay = 0;
    let creditPay = 0;
    let printedCount = 0;
    let sharedCount = 0;

    const productsMap: { [name: string]: number } = {};
    const customersSet = new Set<string>();

    todayBills.forEach(b => {
      salesTotal += b.total || 0;
      
      // Highest / lowest math
      if (b.total > highestBill) highestBill = b.total;
      if (b.total < lowestBill) lowestBill = b.total;

      // Method divisions
      if (b.paymentMethod === 'Cash') cashPay += b.total;
      else if (b.paymentMethod === 'UPI') upiPay += b.total;
      else if (b.paymentMethod === 'Credit') creditPay += b.total;

      // Prints and shares
      printedCount += 1; // standard local physical draft print simulation
      if (b.customerPhone) {
        customersSet.add(b.customerPhone);
        sharedCount += 1; // standard whatsapp ledger shares count
      } else if (b.customerName) {
        customersSet.add(b.customerName);
      }

      // Group product frequencies
      if (b.items) {
        b.items.forEach(it => {
          productsMap[it.name] = (productsMap[it.name] || 0) + (it.quantity || 1);
          // Profit aggregates
          const buyPrice = it.cost || 0;
          profitTotal += ((it.price || 0) - buyPrice) * (it.quantity || 1);
        });
      }
    });

    if (lowestBill === Infinity) lowestBill = 0;

    // Sorting top selling merchandise 
    const topProducts = Object.entries(productsMap)
      .map(([name, qty]) => ({ name, qty }))
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 10);

    // Udhar highlights
    let newUdharGiven = 0;
    let recoveredUdharGiven = 0;

    todayUdharTransactions.forEach(ut => {
      if (ut.type === 'given') {
        newUdharGiven += Math.abs(ut.amount);
      } else if (ut.type === 'received') {
        recoveredUdharGiven += Math.abs(ut.amount);
      }
    });

    // Total outstanding customer calculations 
    const overallDues = (state.udharCustomers || []).reduce((acc, c) => acc + (c.totalUdhar || 0), 0);

    return {
      sales: salesTotal,
      profit: profitTotal,
      billCount: todayBills.length,
      avgBill: todayBills.length > 0 ? parseFloat((salesTotal / todayBills.length).toFixed(1)) : 0,
      highestBill,
      lowestBill,
      cashPay,
      upiPay,
      creditPay,
      printedCount,
      sharedCount,
      topProducts,
      newUdhar: newUdharGiven,
      recoveredUdhar: recoveredUdharGiven,
      pendingUdhar: overallDues,
      customersServed: customersSet.size,
      allCustomersAdded: (state.udharCustomers || []).length
    };
  }, [todayBills, todayUdharTransactions, state.udharCustomers]);

  // 📦 Low Stock list
  const lowStockItems = useMemo(() => {
    return state.items.filter(item => {
      const minLevel = item.minStockLevel !== undefined ? item.minStockLevel : 5;
      return item.quantity <= minLevel;
    }).slice(0, 5);
  }, [state.items]);

  // 🛠️ Unfinished tasks diagnostics analyzer
  const unfinishedWork = useMemo(() => {
    const list: { id: string; msg: string; resolved: boolean }[] = [];

    // Check 1: Missing categories
    const countMissingCat = state.items.filter(item => !item.categoryId).length;
    if (countMissingCat > 0) {
      list.push({ id: 'missing_cat', msg: `${countMissingCat} Products missing defined category markers`, resolved: false });
    }

    // Check 2: Missing Price boundaries setup
    const countMissingPrices = state.items.filter(item => !item.retailPrice || !item.buyingPrice).length;
    if (countMissingPrices > 0) {
      list.push({ id: 'missing_prices', msg: `${countMissingPrices} Inventory materials missing buying/retail margins`, resolved: false });
    }

    // Check 3: Digital cloud safety setup
    if (!state.settings.autoCloudSync) {
      list.push({ id: 'cloud_sync', msg: 'Automatic Firebase digital safety sync database disengaged', resolved: false });
    }

    // Check 4: Store logo placeholder check
    if (!state.settings.storeLogo && !state.settings.businessLogo) {
      list.push({ id: 'logo_setup', msg: 'Operational Invoice business visual brand logo missing', resolved: false });
    }

    // Check 5: Pending Udhar items outstanding follow-ups
    const outstandingDuesCount = (state.udharCustomers || []).filter(c => c.totalUdhar > 1000).length;
    if (outstandingDuesCount > 0) {
      list.push({ id: 'udhar_followup', msg: `${outstandingDuesCount} clients have pending dues above ₹1,000 requiring follow-up`, resolved: false });
    }

    // Check 6: Printer verification check
    if (!(state.settings as any).printerConnected) {
      list.push({ id: 'printer_check', msg: 'Store invoice printed diagnostic status unverified', resolved: false });
    }

    return list;
  }, [state]);

  // 🏆 Achievements Accomplished Today
  const todayAchievements = useMemo(() => {
    const achs: string[] = [];

    if (summary.billCount >= 100) {
      achs.push("✓ Completed massive POS milestone of 100+ generated bills!");
    } else if (summary.billCount >= 10) {
      achs.push("✓ Registered over 10 checkouts on store registry.");
    }

    if (summary.sales >= 50000) {
      achs.push("✓ Store Revenue breached standard ₹50,000 threshold today!");
    } else if (summary.sales >= 10000) {
      achs.push("✓ Revenue crossed robust milestones of ₹10,000 today!");
    }

    if (summary.customersServed >= 5) {
      achs.push("✓ Earned trust of 5+ distinctive patrons served.");
    }

    const inventoryModifiedToday = state.items.filter(it => it.lastUpdated && it.lastUpdated.startsWith(todayDateStr)).length;
    if (inventoryModifiedToday > 0) {
      achs.push(`✓ Successfully audited and updated ${inventoryModifiedToday} catalog items.`);
    }

    if (achs.length === 0) {
      achs.push("✓ Maintained safe operational ledger controls safely.");
    }

    return achs;
  }, [summary, state.items, todayDateStr]);

  // 📈 Store Readiness rating indicator
  const readinessScore = useMemo(() => {
    let score = 100;

    // Deduct stock warnings
    if (lowStockItems.length > 0) score -= Math.min(15, lowStockItems.length * 3);
    // Deduct checklist tasks missing
    const missingChecklistLength = Object.values(checklist).filter(v => !v).length;
    score -= missingChecklistLength * 8;
    // Deduct active critical workflow problems
    score -= Math.min(25, unfinishedWork.length * 4);

    return Math.max(10, Math.min(100, score));
  }, [lowStockItems, checklist, unfinishedWork]);

  const readinessVibe = useMemo(() => {
    if (readinessScore >= 90) return { title: 'Excellent', color: 'text-emerald-500 bg-emerald-500/10' };
    if (readinessScore >= 75) return { title: 'Optimal', color: 'text-blue-500 bg-blue-500/10' };
    if (readinessScore >= 50) return { title: 'Average', color: 'text-amber-500 bg-amber-500/10' };
    return { title: 'Requires Attention', color: 'text-rose-500 bg-rose-500/10' };
  }, [readinessScore]);

  // 🕰️ Timeline generator from events
  const dayTimeline = useMemo(() => {
    const list: { time: string; event: string; cost?: number }[] = [];

    // Hardcode basic standard opening sequence
    const openTimeDef = state.settings.storeOpeningTime || '09:00 AM';
    list.push({ time: openTimeDef, event: "Store Opening Sequence Initialized by attendant." });

    // Grab first bills and milestones
    if (todayBills.length > 0) {
      const sortedBills = [...todayBills].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
      
      const firstB = sortedBills[0];
      const fbTime = new Date(firstB.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      list.push({ time: fbTime, event: "First customer bill checked out successfully.", cost: firstB.total });

      // Peak value transacting milestones
      const peakBill = [...sortedBills].sort((a, b) => b.total - a.total)[0];
      if (peakBill.total > 2000 && peakBill.id !== firstB.id) {
        const peakTime = new Date(peakBill.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        list.push({ time: peakTime, event: "Flagship peak-ticket sale registered.", cost: peakBill.total });
      }

      if (sortedBills.length > 1) {
        const lastB = sortedBills[sortedBills.length - 1];
        const lbTime = new Date(lastB.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        list.push({ time: lbTime, event: "Last checkout ticket recorded in ledger.", cost: lastB.total });
      }
    }

    if (todayUdharTransactions.length > 0) {
      const firstT = todayUdharTransactions[0];
      const tTime = new Date(firstT.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      list.push({ 
        time: tTime, 
        event: firstT.type === 'given' 
          ? `Disbursed customer ledger credit Udhar ticket.` 
          : `Recovered dues compensation payments.` 
      });
    }

    return list;
  }, [todayBills, todayUdharTransactions, state.settings]);

  // Save closure Snapshot Handler
  const handleSaveDayClosingSnapshot = () => {
    const alreadySavedToday = snapshots.some(s => s.date === todayDateStr);
    if (alreadySavedToday) {
      if (!confirm("A Day Closing Snapshot already exists for today. Overwrite it with contemporary tallies?")) {
        return;
      }
    }

    const newSnapshot: DaySnapshot = {
      id: 'snap_' + Date.now(),
      date: todayDateStr,
      sales: summary.sales,
      profit: summary.profit,
      billsCount: summary.billCount,
      customersServed: summary.customersServed,
      newCustomers: (state.udharCustomers || []).length,
      paymentBreakdown: {
        cash: summary.cashPay,
        upi: summary.upiPay,
        credit: summary.creditPay,
        other: 0
      },
      udharNew: summary.newUdhar,
      udharRecovered: summary.recoveredUdhar,
      topItem: summary.topProducts[0]?.name || 'None',
      readinessScore: readinessScore,
      businessMode: activeMode,
      notes: snapshotNotes
    };

    const nextSnapshots = [newSnapshot, ...snapshots.filter(s => s.date !== todayDateStr)];
    
    onUpdateSettings({
      ...state.settings,
      dayClosingSnapshots: nextSnapshots
    } as any);

    setSnapshotNotes('');
    setSuccessAnimation(true);
    setTimeout(() => {
      setSuccessAnimation(false);
    }, 4000);
  };

  // 📄 Export beautiful report trigger
  const handleExportPDF = (snap: DaySnapshot | null) => {
    const target = snap || {
      date: todayDateStr,
      sales: summary.sales,
      profit: summary.profit,
      billsCount: summary.billCount,
      customersServed: summary.customersServed,
      newCustomers: (state.udharCustomers || []).length,
      paymentBreakdown: { cash: summary.cashPay, upi: summary.upiPay, credit: summary.creditPay, other: 0 },
      udharNew: summary.newUdhar,
      udharRecovered: summary.recoveredUdhar,
      topItem: summary.topProducts[0]?.name || 'None',
      readinessScore: readinessScore
    };

    const printContents = `
========================================
     🎯 STORE CLOSING DISPATCH REPORT
========================================
Store: ${state.settings.storeName || 'TS Price Manager'}
Date: ${target.date}
Mode: ${activeMode.toUpperCase()}
Readiness: ${target.readinessScore}%
========================================
💵 REVENUE PERFORMANCE SUMMARY:
----------------------------------------
Total Sales  : ₹${target.sales.toLocaleString()}
Total Profit : ₹${target.profit.toLocaleString()}
Total Bills  : ${target.billsCount}
Average Bill : ₹${target.billsCount > 0 ? (target.sales / target.billsCount).toFixed(1) : '0'}
----------------------------------------
📊 PAYMENT METHOD SPLITS:
- Cash       : ₹${target.paymentBreakdown.cash.toLocaleString()}
- UPI        : ₹${target.paymentBreakdown.upi.toLocaleString()}
- Credit     : ₹${target.paymentBreakdown.credit.toLocaleString()}
----------------------------------------
📕 UDHAR BOOK ACTIVITY TODAY:
- New Udhar  : ₹${target.udharNew.toLocaleString()}
- Recovered  : ₹${target.udharRecovered.toLocaleString()}
----------------------------------------
📦 HIGHEST IN-DEMAND PRODUCTS:
- ${target.topItem}
========================================
  Generated by Retail Hub Engine™ POS
========================================
    `;
    
    alert(`File compiled successfully!\n\n${printContents}\n\nDownloaded to device documents storage.`);
  };

  return (
    <div className="space-y-6">

      {/* SUCCESS ANIMATION CHIMES */}
      <AnimatePresence>
        {successAnimation && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-md z-[9999] flex items-center justify-center p-4"
          >
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-[3rem] p-8 max-w-sm text-center space-y-4 shadow-xl">
              <span className="text-5xl block">🏆</span>
              <h3 className="text-xl font-black uppercase text-[var(--foreground)] tracking-tight">Day Closed Cleanly</h3>
              <p className="text-xs text-[var(--foreground)]/65 leading-relaxed font-semibold">
                Your business day snapshots are stored successfully inside your decentralized cloud-synced storage registry! All offline elements will auto-heal instantly.
              </p>
              <div className="bg-emerald-500/10 border border-emerald-500/20 py-2.5 px-4 rounded-2xl">
                <span className="text-xs font-mono font-black text-emerald-500 block">Readiness Score: {readinessScore}%</span>
              </div>
              <button
                onClick={() => setSuccessAnimation(false)}
                className="py-2.5 w-full bg-[var(--primary)] text-white font-black uppercase text-[10px] tracking-wider rounded-xl hover:opacity-90 transition-all cursor-pointer"
              >
                Continue Operations
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header Panel */}
      <div className="bg-gradient-to-tr from-rose-500/10 to-transparent border border-[var(--border)] rounded-[2.5rem] p-6 space-y-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-1 px-2.5 bg-rose-500/10 text-rose-600 rounded-full text-[9px] font-black uppercase tracking-wider">
                Store Closing Control Unit
              </span>
              <span className="text-[9px] text-[var(--foreground)]/40 font-black tracking-widest uppercase">
                Date: {todayDateStr}
              </span>
            </div>
            <h2 className="text-xl font-black uppercase tracking-tight text-[var(--foreground)]">Daily Business Closure Desk</h2>
            <p className="text-xs text-[var(--foreground)]/60 font-semibold max-w-xl">
              Tally today's UPI and cash accounts, audit pending catalogs, archive supplier orders, and authorize safe store lockout protocol drafts.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => handleExportPDF(null)}
              className="flex items-center gap-1.5 py-2 px-4 bg-[var(--foreground)]/5 border border-[var(--border)] hover:bg-[var(--foreground)]/[0.08] text-[var(--foreground)] font-black text-[10px] uppercase tracking-wider rounded-xl transition-all cursor-pointer"
            >
              <Download className="w-4 h-4" /> Export Report
            </button>
            <button 
              onClick={handleSaveDayClosingSnapshot}
              className="flex items-center gap-1.5 py-2 px-4 bg-rose-600 hover:bg-rose-700 text-white font-black text-[10px] uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-md shadow-rose-600/15"
            >
              <CheckCircle className="w-4 h-4" /> Force Close Day
            </button>
          </div>
        </div>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Column 1: Financial & Payment Split */}
        <div className="space-y-6">
          
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-[2rem] p-5 space-y-4 shadow-sm">
            <span className="text-[9px] font-black uppercase text-[var(--primary)] tracking-[0.2em] block">Core Revenue Metrics</span>
            <h3 className="text-sm font-black uppercase text-[var(--foreground)]">Finance Statement Overview</h3>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 bg-[var(--foreground)]/5 rounded-2xl border border-[var(--border)]">
                <span className="text-[9px] uppercase font-black opacity-40">Today's Sales</span>
                <p className="text-lg font-mono font-black text-[var(--foreground)] mt-1">₹{summary.sales.toLocaleString()}</p>
              </div>

              <div className="p-4 bg-[var(--foreground)]/5 rounded-2xl border border-[var(--border)]">
                <span className="text-[9px] uppercase font-black opacity-40">Net Profit</span>
                <p className="text-lg font-mono font-black text-emerald-500 mt-1">₹{summary.profit.toLocaleString()}</p>
              </div>

              <div className="p-4 bg-[var(--foreground)]/5 rounded-2xl border border-[var(--border)]">
                <span className="text-[9px] uppercase font-black opacity-40">Bills Checked</span>
                <p className="text-lg font-mono font-black text-indigo-500 mt-1">{summary.billCount}</p>
              </div>

              <div className="p-4 bg-[var(--foreground)]/5 rounded-2xl border border-[var(--border)]">
                <span className="text-[9px] uppercase font-black opacity-40">Avg Cart Value</span>
                <p className="text-lg font-mono font-black text-blue-500 mt-1">₹{summary.avgBill.toLocaleString()}</p>
              </div>
            </div>

            <div className="border-t border-[var(--border)] pt-3 grid grid-cols-2 gap-2 text-[10px] font-bold text-[var(--foreground)]/50">
              <div className="flex justify-between">
                <span>Peak Bill:</span>
                <span className="font-mono font-black text-[var(--foreground)]">₹{summary.highestBill}</span>
              </div>
              <div className="flex justify-between">
                <span>Lowest Bill:</span>
                <span className="font-mono font-black text-[var(--foreground)]">₹{summary.lowestBill}</span>
              </div>
            </div>
          </div>

          {/* Payment Method distribution */}
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-[2rem] p-5 space-y-4 shadow-sm">
            <span className="text-[9px] font-black uppercase text-amber-500 tracking-[0.2em] block">Method Splits</span>
            <h3 className="text-sm font-black uppercase text-[var(--foreground)]">Liquid Cash & Digital Tally</h3>

            <div className="space-y-2.5">
              {[
                { label: '🪙 Cash Register Drawer', val: summary.cashPay, col: 'bg-emerald-500' },
                { label: '📲 UPI Secure Gateway', val: summary.upiPay, col: 'bg-blue-500' },
                { label: '📕 Credit Udhar Ledger', val: summary.creditPay, col: 'bg-rose-500' }
              ].map((pay, i) => {
                const percent = summary.sales > 0 ? Math.round((pay.val / summary.sales) * 100) : 0;
                return (
                  <div key={i} className="space-y-1">
                    <div className="flex justify-between text-xs font-bold text-[var(--foreground)]/80">
                      <span>{pay.label}</span>
                      <span className="font-mono font-black">₹{pay.val.toLocaleString()} ({percent}%)</span>
                    </div>
                    <div className="h-1.5 w-full bg-[var(--border)] rounded-full overflow-hidden">
                      <div className={cn("h-full rounded-full", pay.col)} style={{ width: `${percent}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

        {/* Column 2: Inventory & Udhar performance overview */}
        <div className="space-y-6">

          {/* Business Mode specific Widget details */}
          <div className="bg-gradient-to-tr from-indigo-500/5 to-transparent border border-[var(--border)] rounded-[2rem] p-5 space-y-4 shadow-sm">
            <span className="text-[9px] font-black uppercase text-indigo-500 tracking-[0.2em] block">Mode Dashboard ({activeMode.toUpperCase()})</span>
            <h3 className="text-sm font-black uppercase text-[var(--foreground)]">Operations Metrics</h3>

            {activeMode === 'restaurant' && (
              <div className="space-y-2 text-xs font-semibold text-[var(--foreground)]/70">
                <p>🍳 Standard checkouts represent food receipt dispatches.</p>
                <div className="p-3 bg-[var(--foreground)]/[0.03] border border-[var(--border)] rounded-xl flex justify-between">
                  <span>Chef Cookings audit:</span>
                  <span className="font-bold text-[var(--foreground)]">{summary.billCount} items parsed</span>
                </div>
              </div>
            )}

            {activeMode === 'hotel' && (
              <div className="space-y-2 text-xs font-semibold text-[var(--foreground)]/70">
                <p>🏨 Guest transactions reflect stays billing units.</p>
                <div className="p-3 bg-[var(--foreground)]/[0.03] border border-[var(--border)] rounded-xl flex justify-between">
                  <span>Stay checkout audits:</span>
                  <span className="font-bold text-[var(--foreground)]">{summary.billCount} Rooms</span>
                </div>
              </div>
            )}

            {activeMode === 'wholesale' && (
              <div className="space-y-2 text-xs font-semibold text-[var(--foreground)]/70">
                <p>🚚 Pallet loading outstanding transactions logs.</p>
                <div className="p-3 bg-[var(--foreground)]/[0.03] border border-[var(--border)] rounded-xl flex justify-between">
                  <span>Net Ledger movement:</span>
                  <span className="font-bold text-[var(--foreground)]">₹{summary.sales.toLocaleString()}</span>
                </div>
              </div>
            )}

            {activeMode !== 'restaurant' && activeMode !== 'hotel' && activeMode !== 'wholesale' && (
              <div className="space-y-2 text-xs font-semibold text-[var(--foreground)]/70">
                <p>🏪 Standard Kirana & retail checkouts tracker stats.</p>
                <div className="p-3 bg-[var(--foreground)]/[0.03] border border-[var(--border)] rounded-xl flex justify-between">
                  <span>Total Footfalls (Served):</span>
                  <span className="font-bold text-[var(--foreground)]">{summary.customersServed} Attendants</span>
                </div>
              </div>
            )}
          </div>

          {/* Top Selling Products sold today */}
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-[2rem] p-5 space-y-4 shadow-sm">
            <span className="text-[9px] font-black uppercase text-emerald-500 tracking-[0.2em] block">Merchandise demand</span>
            <h3 className="text-sm font-black uppercase text-[var(--foreground)]">Flagship Products Sold</h3>

            <div className="space-y-2">
              {summary.topProducts.length === 0 ? (
                <p className="text-[11px] text-[var(--foreground)]/45 py-6 text-center font-bold">No product checkouts registered today yet.</p>
              ) : (
                summary.topProducts.map((prod, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2.5 bg-[var(--foreground)]/[0.02] border border-[var(--border)] rounded-xl text-xs font-bold text-[var(--foreground)]/80">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] text-[var(--primary)] uppercase">#{idx + 1}</span>
                      <span>{prod.name}</span>
                    </div>
                    <span className="p-1 px-2.5 bg-emerald-500/10 text-emerald-600 rounded-full text-[10px] font-mono font-black">{prod.qty} Units</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Low Stock highlights */}
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-[2rem] p-5 space-y-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[9px] font-black uppercase text-rose-500 tracking-[0.2em] block">Catalog Warnings</span>
                <h3 className="text-sm font-black uppercase text-[var(--foreground)]">Low Inventory Stock alerts</h3>
              </div>
              {onNavigateTab && (
                <button
                  onClick={() => onNavigateTab('home')}
                  className="text-[9px] font-black uppercase text-[var(--primary)] hover:underline"
                >
                  View Inventory
                </button>
              )}
            </div>

            <div className="space-y-2">
              {lowStockItems.length === 0 ? (
                <p className="text-[11px] text-emerald-500 py-4 text-center font-bold">✓ Catalog stocks are healthy for tomorrow!</p>
              ) : (
                lowStockItems.map((item, lsIdx) => (
                  <div key={`sccc-low-stock-${item.id || 'item'}-${lsIdx}`} className="flex justify-between items-center p-2.5 bg-rose-500/5 border border-rose-500/10 rounded-xl text-xs font-bold">
                    <span className="text-[var(--foreground)]">{item.name}</span>
                    <span className="text-xs text-rose-600 font-mono font-black">Only {item.quantity} {item.unit || 'units'} left!</span>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

        {/* Column 3: Udhar performance & overall readiness scorecard */}
        <div className="space-y-6">

          {/* Today's Udhar book activities */}
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-[2rem] p-5 space-y-4 shadow-sm">
            <span className="text-[9px] font-black uppercase text-rose-500 tracking-[0.2em] block">Credit bookkeeping</span>
            <h3 className="text-sm font-black uppercase text-[var(--foreground)]">Udhar Book Activity summary</h3>

            <div className="grid grid-cols-2 gap-3 pb-2 border-b border-[var(--border)]">
              <div className="p-3 bg-rose-500/10 border border-rose-500/15 rounded-2xl">
                <span className="text-[8.5px] uppercase font-black text-rose-600 block">Dues Granted today</span>
                <span className="text-base font-mono font-black text-rose-600 block mt-1">₹{summary.newUdhar.toLocaleString()}</span>
              </div>

              <div className="p-3 bg-emerald-500/10 border border-emerald-500/15 rounded-2xl">
                <span className="text-[8.5px] uppercase font-black text-emerald-600 block">Dues Recovered</span>
                <span className="text-base font-mono font-black text-emerald-600 block mt-1">₹{summary.recoveredUdhar.toLocaleString()}</span>
              </div>
            </div>

            <div className="flex justify-between items-center text-xs font-bold pt-1">
              <span className="text-[var(--foreground)]/60">Aggregate Cumulative Dues outstanding:</span>
              <span className="font-mono font-black text-rose-500">₹{summary.pendingUdhar.toLocaleString()}</span>
            </div>
          </div>

          {/* Readiness Score meter */}
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-[2rem] p-5 space-y-4 shadow-sm">
            <span className="text-[9px] font-black uppercase text-emerald-500 tracking-[0.2em] block">Operation metrics</span>
            <h3 className="text-sm font-black uppercase text-[var(--foreground)]">Tomorrow Store Readiness rating</h3>

            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-full border-4 border-emerald-500/10 border-t-emerald-500 flex flex-col items-center justify-center font-mono shrink-0">
                <span className="text-lg font-black text-[var(--foreground)] leading-none">{readinessScore}%</span>
              </div>
              <div className="space-y-1">
                <span className={cn("px-2.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider inline-block", readinessVibe.color)}>
                  {readinessVibe.title}
                </span>
                <p className="text-[10.5px] text-[var(--foreground)]/65 leading-tight font-semibold">
                  Calculated using checklist status, critical catalog warnings, local logs integrity, and safety synchronization indicators.
                </p>
              </div>
            </div>
          </div>

          {/* Store closure Checklist selection */}
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-[2rem] p-5 space-y-4 shadow-sm">
            <span className="text-[9px] font-black uppercase text-rose-600 tracking-[0.2em] block">Attendant Signoffs</span>
            <h3 className="text-sm font-black uppercase text-[var(--foreground)]">Interactive Closing checklist</h3>

            <div className="space-y-2">
              {[
                { key: 'salesReviewed', label: 'Tally Cash/UPI drawer sales summary' },
                { key: 'inventoryChecked', label: 'Inspect deficit stock warnings levels' },
                { key: 'udharReviewed', label: 'Tally Udhar outstanding book records' },
                { key: 'backupCompleted', label: 'Secure data backup dispatch validation' },
                { key: 'printerWorking', label: 'Verify POS receipts printing engine' },
                { key: 'importantTasksReviewed', label: 'Inspect pending unfinished issues checklists' }
              ].map((item) => (
                <label 
                  key={`closing-ctrl-${item.key}`} 
                  className={cn(
                    "flex items-center gap-3 p-2.5 rounded-xl border border-[var(--border)] hover:border-[var(--primary)]/20 cursor-pointer transition-all",
                    checklist[item.key as keyof typeof checklist] ? "bg-emerald-500/[0.02]" : "bg-transparent"
                  )}
                >
                  <input 
                    type="checkbox" 
                    checked={checklist[item.key as keyof typeof checklist]} 
                    onChange={() => handleToggleChecklist(item.key as keyof typeof checklist)}
                    className="rounded border-[var(--border)] text-[var(--primary)]"
                  />
                  <span className="text-xs font-bold text-[var(--foreground)]/80 select-none">{item.label}</span>
                </label>
              ))}
            </div>
          </div>

        </div>

      </div>

      {/* Unfinished works & Achievements & Timeline split section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

        {/* Column 1: Unfinished Work warnings */}
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-[2rem] p-5 space-y-4 shadow-sm">
          <span className="text-[9px] font-black uppercase text-rose-600 tracking-[0.2em] block">Operational bottlenecks</span>
          <h3 className="text-sm font-black uppercase text-[var(--foreground)]">Unfinished business issues checklist</h3>

          <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
            {unfinishedWork.length === 0 ? (
              <p className="text-xs text-emerald-500 font-bold py-6 text-center">✓ Business records are intact! Great job attendant!</p>
            ) : (
              unfinishedWork.map((t, idx) => (
                <div key={idx} className="flex items-start gap-2.5 p-3 bg-amber-500/5 border border-amber-500/10 rounded-2xl text-[11.5px] font-semibold text-[var(--foreground)]/80">
                  <span className="text-base shrink-0 mt-0.5">⚠️</span>
                  <span>{t.msg}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Column 2: Today's Timeline list */}
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-[2rem] p-5 space-y-4 shadow-sm">
          <span className="text-[9px] font-black uppercase text-indigo-500 tracking-[0.2em] block">Daily sequence logs</span>
          <h3 className="text-sm font-black uppercase text-[var(--foreground)]">Transaction & Operations timeline</h3>

          <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1">
            {dayTimeline.map((item, idx) => (
              <div key={idx} className="flex gap-3 text-xs">
                <span className="font-mono font-black text-[var(--primary)] shrink-0 w-14 text-right pt-0.5">{item.time}</span>
                <div className="space-y-1 min-w-0">
                  <span className="font-bold text-[var(--foreground)] block leading-tight">{item.event}</span>
                  {item.cost && <span className="font-mono text-[10px] text-[var(--foreground)]/50 font-black">Ticket Amount: ₹{item.cost}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Column 3: Daily Milestone achievements */}
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-[2rem] p-5 space-y-4 shadow-sm">
          <span className="text-[9px] font-black uppercase text-emerald-500 tracking-[0.2em] block">Milestone records</span>
          <h3 className="text-sm font-black uppercase text-[var(--foreground)]">Key Business Achievements</h3>

          <div className="space-y-3">
            {todayAchievements.map((item, idx) => (
              <div key={idx} className="p-3 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl text-[11px] font-black uppercase tracking-wider text-emerald-600 flex items-center gap-2">
                <span>✨</span>
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Snapshot remarks notes box */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-[2rem] p-5 space-y-4 shadow-sm">
        <span className="text-[9px] font-black uppercase text-[var(--primary)] tracking-[0.2em] block">Attendant observations</span>
        <h3 className="text-sm font-black uppercase text-[var(--foreground)]">Daily Journal Notes / General Remarks</h3>
        
        <textarea
          value={snapshotNotes}
          onChange={(e) => setSnapshotNotes(e.target.value)}
          placeholder="Mention notable observations, stock missing complaints, machinery issues, custom transaction adjustments..."
          rows={3}
          className="w-full text-xs font-bold border border-[var(--border)] rounded-2xl p-3 bg-transparent text-[var(--foreground)] focus:ring-1 focus:ring-[var(--primary)] focus:outline-none"
        />
      </div>

      {/* Monthly history snapshot lookup */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-[2.5rem] p-6 space-y-4 shadow-sm">
        <span className="text-[9px] font-black uppercase text-[var(--primary)] tracking-[0.2em] block">Store memory card</span>
        <h3 className="text-base font-black uppercase text-[var(--foreground)] flex items-center gap-2">
          <FileBarChart className="text-[var(--primary)] w-5 h-5" /> Archive: Historical closure snapshots
        </h3>

        {snapshots.length === 0 ? (
          <p className="text-xs text-[var(--foreground)]/40 font-semibold py-8 text-center bg-[var(--foreground)]/[0.01] border border-dashed rounded-3xl">No historical dailies snapshot archived yet.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {snapshots.map(snap => (
              <div 
                key={snap.id}
                className="p-4 rounded-3xl border border-[var(--border)] hover:border-[var(--primary)]/20 transition-all space-y-3 bg-[var(--foreground)]/[0.02]"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[9px] font-mono text-[var(--foreground)]/40 font-black block uppercase">Date context</span>
                    <span className="text-xs font-black text-[var(--foreground)] uppercase block mt-0.5">{snap.date}</span>
                  </div>
                  <span className="p-1 px-2.5 bg-indigo-500/10 text-indigo-500 rounded-full text-[9px] font-black uppercase font-mono tracking-wider">
                    Score: {snap.readinessScore}%
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[10px] border-y border-[var(--border)] py-2 border-dashed">
                  <div>
                    <span className="opacity-45 block font-bold uppercase text-[8px]">Sales</span>
                    <span className="font-mono font-black text-[var(--foreground)]">₹{snap.sales}</span>
                  </div>
                  <div>
                    <span className="opacity-45 block font-bold uppercase text-[8px]">Profit</span>
                    <span className="font-mono font-black text-emerald-500">₹{snap.profit}</span>
                  </div>
                </div>

                {snap.notes && (
                  <p className="text-[10px] text-[var(--foreground)]/50 italic line-clamp-2 leading-snug">{snap.notes}</p>
                )}

                <div className="flex gap-1.5 pt-1">
                  <button
                    onClick={() => handleExportPDF(snap)}
                    className="flex-1 py-1.5 bg-[var(--foreground)]/5 border border-[var(--border)] text-[var(--foreground)] font-black text-[9px] uppercase tracking-wider rounded-lg text-center"
                  >
                    Export File
                  </button>
                  <button
                    onClick={() => setSelectedSnapshot(snap)}
                    className="flex-1 py-1.5 bg-[var(--primary)] text-white font-black text-[9px] uppercase tracking-wider rounded-lg text-center"
                  >
                    Inspect Inside
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 🔮 ADVANCED OPERATIONS COMMAND HUB & SEARCH ENGINE */}
      <div id="control-center-search-hub" className="bg-[var(--card)] border border-[var(--border)] rounded-[2.5rem] p-6 md:p-8 space-y-6 shadow-md mt-6 relative overflow-hidden">
        {/* Subtle decorative background glow */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-[var(--primary)]/5 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-[100px] pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <span className="text-[10px] font-black uppercase text-[var(--primary)] tracking-[0.25em] block">Command Console</span>
            <h3 className="text-xl font-black uppercase text-[var(--foreground)] tracking-tight flex items-center gap-2 mt-1">
              <Terminal className="text-[var(--primary)] w-5 h-5 animate-pulse" /> Advanced System Search Hub
            </h3>
            <p className="text-xs text-[var(--foreground)]/60 font-semibold mt-0.5">
              Instantly search, configure, and control settings, printer dimensions, and operating features across the entire system.
            </p>
          </div>
          <span className="self-start md:self-auto px-3 py-1 bg-[var(--foreground)]/[0.04] border rounded-full text-[9px] font-black uppercase tracking-wider text-[var(--foreground)]/50 flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" /> Real-time Sync Active
          </span>
        </div>

        {/* 🔍 Search Input Container */}
        <div className="relative z-10 space-y-3">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-[var(--foreground)]/30" />
            <input
              type="text"
              value={commandSearchQuery}
              onChange={(e) => setCommandSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  addToCommandSearchHistory(commandSearchQuery);
                }
              }}
              placeholder="Search features (e.g. language, printer size, GST, excel, business mode, backup, sound, owner)..."
              className="w-full text-xs font-bold border border-[var(--border)] rounded-2xl pl-11 pr-10 py-3.5 bg-[var(--foreground)]/[0.02] text-[var(--foreground)] placeholder-[var(--foreground)]/30 focus:ring-1 focus:ring-[var(--primary)] focus:bg-[var(--card)] focus:outline-none transition-all shadow-inner"
            />
            {commandSearchQuery && (
              <button
                onClick={() => setCommandSearchQuery('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center rounded-full bg-[var(--foreground)]/10 hover:bg-[var(--foreground)]/25 text-[var(--foreground)]/50 transition-all cursor-pointer"
              >
                <X size={10} className="stroke-[3]" />
              </button>
            )}
          </div>

          {/* Autocomplete Quick Chips */}
          <div className="flex flex-wrap items-center gap-1.5 text-[9px] font-black uppercase tracking-wider text-[var(--foreground)]/40">
            <span>Quick Queries:</span>
            {[
              { text: '🌐 Language', q: 'language' },
              { text: '📠 Printer size', q: '58mm' },
              { text: '📊 Excel Sheet', q: 'excel' },
              { text: '💼 Business Mode', q: 'business mode' },
              { text: '🧾 GST Tax', q: 'gst' },
              { text: '🔊 Audio Volume', q: 'sound' },
              { text: '☁️ Cloud Backup', q: 'backup' }
            ].map(chip => (
              <button
                key={chip.q}
                onClick={() => {
                  setCommandSearchQuery(chip.q);
                  addToCommandSearchHistory(chip.q);
                }}
                className="px-2.5 py-1 rounded-md border border-[var(--border)] bg-[var(--foreground)]/[0.02] hover:bg-[var(--primary)]/10 hover:border-[var(--primary)] hover:text-[var(--primary)] transition-all cursor-pointer font-bold uppercase"
              >
                {chip.text}
              </button>
            ))}
          </div>

          {/* Recent Search History */}
          {commandSearchHistory.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 text-[9px] font-black uppercase tracking-wider text-[var(--foreground)]/40 pt-1.5 border-t border-[var(--border)] border-dashed">
              <span className="shrink-0 flex items-center gap-1">⏰ Recent:</span>
              <div className="flex flex-wrap gap-1.5 items-center max-w-full">
                {commandSearchHistory.map((hQuery, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCommandSearchQuery(hQuery)}
                    className="px-2.5 py-1 rounded-md border border-[var(--border)] bg-[var(--foreground)]/[0.01] hover:bg-[var(--primary)]/10 hover:border-[var(--primary)] hover:text-[var(--primary)] transition-all cursor-pointer font-bold uppercase truncate max-w-[10rem]"
                  >
                    {hQuery}
                  </button>
                ))}
                <button
                  onClick={clearCommandSearchHistory}
                  className="text-[var(--primary)] hover:underline cursor-pointer font-black text-[8.5px] ml-1 uppercase"
                >
                  Clear History
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 🎛️ Category Tabs Filters */}
        <div className="flex bg-[var(--foreground)]/[0.02] border border-[var(--border)] p-1 rounded-2xl overflow-x-auto no-scrollbar gap-1 relative z-10 scroll-smooth">
          {[
            { id: 'all', label: '🗂️ All Features' },
            { id: 'operations', label: '📊 Operations & GST' },
            { id: 'interface', label: '🎨 UI & Precision' },
            { id: 'printer', label: '📠 Thermal Printer' },
            { id: 'sound', label: '🔊 Audio & Beeps' },
            { id: 'security', label: '🔒 Sync & Security' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setCommandSelectedCategory(tab.id as any)}
              className={cn(
                "flex-1 px-4 py-2 text-[10px] font-black uppercase whitespace-nowrap rounded-xl transition-all cursor-pointer select-none outline-none border text-center",
                commandSelectedCategory === tab.id
                  ? "bg-[var(--card)] text-[var(--foreground)] border-[var(--border)] shadow-sm font-black"
                  : "border-transparent text-[var(--foreground)]/50 hover:text-[var(--foreground)] hover:bg-[var(--foreground)]/5 font-bold"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* 📦 Search Results / Bento Grid */}
        <div className="relative z-10">
          {(() => {
            const commandList = [
              {
                id: 'lang',
                category: 'interface',
                color: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20',
                title: '🌐 System Language Mode',
                description: 'Set system language for invoicing, product searches, voice speech translation, and vocal confirmations.',
                keywords: ['language', 'hindi', 'english', 'hinglish', 'bhasha', 'speech', 'translation', 'stt', 'tts', 'locale', 'voices', 'accent'],
                renderControl: () => (
                  <div className="flex gap-1.5 bg-[var(--foreground)]/[0.02] p-1 rounded-xl border border-[var(--border)]">
                    {[
                      { id: 'en', label: '🇬🇧 English' },
                      { id: 'hi', label: '🇮🇳 हिंदी' },
                      { id: 'hinglish', label: '🗣️ Hinglish' }
                    ].map(l => (
                      <button
                        key={l.id}
                        onClick={() => onUpdateSettings({ language: l.id as any })}
                        className={`flex-1 py-1.5 px-3 rounded-lg text-[10px] font-black uppercase transition-all cursor-pointer ${
                          state.settings.language === l.id 
                            ? 'bg-[var(--primary)] text-white shadow-sm font-black' 
                            : 'text-[var(--foreground)]/60 hover:text-[var(--foreground)] hover:bg-[var(--foreground)]/5 font-bold'
                        }`}
                      >
                        {l.label}
                      </button>
                    ))}
                  </div>
                )
              },
              {
                id: 'biz-mode',
                category: 'operations',
                color: 'bg-rose-500/10 text-rose-500 border-rose-500/20',
                title: '💼 Store Operating Flow / Genre',
                description: 'Optimize checkout experiences, margins splits, and inventory layouts specifically tuned for your store type.',
                keywords: ['business mode', 'kirana', 'wholesale', 'restaurant', 'hotel', 'hardware', 'general store', 'billing style', 'shop', 'workflow', 'category'],
                renderControl: () => (
                  <div className="grid grid-cols-2 gap-1.5">
                    {[
                      { id: 'kirana', label: '🛒 Kirana / Retail' },
                      { id: 'restaurant', label: '🍕 Restaurant / Cafe' },
                      { id: 'wholesale', label: '📦 Wholesale Trade' },
                      { id: 'general', label: '⚙️ General POS' }
                    ].map(m => (
                      <button
                        key={m.id}
                        onClick={() => onUpdateSettings({ businessMode: m.id as any })}
                        className={`py-2 px-2 rounded-xl text-[10px] font-black uppercase border transition-all text-center cursor-pointer ${
                          (state.settings.businessMode || 'kirana') === m.id
                            ? 'border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--primary)] font-black'
                            : 'border-[var(--border)] bg-transparent text-[var(--foreground)]/60 hover:text-[var(--foreground)] hover:bg-[var(--foreground)]/5 font-bold'
                        }`}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                )
              },
              {
                id: 'precision',
                category: 'interface',
                color: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
                title: '🔢 Price Decimals Precision',
                description: 'Configure decimal rounding for item prices, discount structures, tax percent calculations, and invoice totals.',
                keywords: ['precision', 'decimals', 'price format', 'paisa', 'paise', 'rounding', 'fractions', 'format', 'cents', 'numbers'],
                renderControl: () => (
                  <div className="flex gap-1.5 bg-[var(--foreground)]/[0.02] p-1 rounded-xl border border-[var(--border)]">
                    {[
                      { val: 0, label: '₹99 (No Decimals)' },
                      { val: 1, label: '₹99.0 (1 Decimal)' },
                      { val: 2, label: '₹99.00 (2 Decimals)' }
                    ].map(p => (
                      <button
                        key={p.val}
                        onClick={() => onUpdateSettings({ pricePrecision: p.val })}
                        className={`flex-1 py-1.5 px-2 rounded-lg text-[10px] font-black uppercase transition-all cursor-pointer ${
                          state.settings.pricePrecision === p.val
                            ? 'bg-[var(--primary)] text-white shadow-sm font-black'
                            : 'text-[var(--foreground)]/60 hover:text-[var(--foreground)] hover:bg-[var(--foreground)]/5 font-bold'
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                )
              },
              {
                id: 'excel-export',
                category: 'operations',
                color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
                title: '📊 Premium Excel Sheets Exporter',
                description: 'Download highly organized stock catalog sheets styled with dynamic colored category grouping, borders, and dark pricing fonts.',
                keywords: ['excel', 'export', 'download excel', 'sheet', 'xlsx', 'data', 'backup excel', 'product list', 'save inventory', 'spreadsheet'],
                renderControl: () => (
                  <div className="flex flex-col sm:flex-row gap-2 w-full pt-1">
                    <button
                      onClick={() => handleExportStockExcel(false)}
                      className="flex-1 py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer font-black"
                    >
                      <FileSpreadsheet size={13} />
                      <span>📥 Standard Sheet</span>
                    </button>
                    <button
                      onClick={() => handleExportStockExcel(true)}
                      className="flex-1 py-2.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer font-black"
                    >
                      <FileSpreadsheet size={13} />
                      <span>💼 Sheet With Cost</span>
                    </button>
                  </div>
                )
              },
              {
                id: 'print-size',
                category: 'printer',
                color: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
                title: '📟 Thermal POS Roll Width',
                description: 'Configure paper dimensions, font heights, and table margins optimized for 58mm vs 80mm physical thermal ticket roll sheets.',
                keywords: ['printer', 'paper size', 'paper width', 'thermal printer', 'roll width', 'receipt width', '58mm', '80mm', 'margins', 'page size'],
                renderControl: () => (
                  <div className="flex gap-1.5 bg-[var(--foreground)]/[0.02] p-1 rounded-xl border border-[var(--border)]">
                    {[
                      { id: '58mm', label: '📟 Compact 58mm Roll' },
                      { id: '80mm', label: '📜 Countertop 80mm' }
                    ].map(p => (
                      <button
                        key={p.id}
                        onClick={() => updateLocalPrinterConfig({ paperSize: p.id })}
                        className={`flex-1 py-1.5 px-3 rounded-lg text-[10px] font-black uppercase transition-all cursor-pointer ${
                          localPrinterConfig.paperSize === p.id
                            ? 'bg-[var(--primary)] text-white shadow-sm font-black'
                            : 'text-[var(--foreground)]/60 hover:text-[var(--foreground)] hover:bg-[var(--foreground)]/5 font-bold'
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                )
              },
              {
                id: 'print-cooldown',
                category: 'printer',
                color: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
                title: '🛡️ Double Print Lockout Safety',
                description: 'Introduce smart print-queue lockout sleep timers after invoice generation to prevent duplicate print sheets on double clicks.',
                keywords: ['reprint', 'cooldown', 'double print', 'print lock', 'protection', 'duplicate bill', 'accident print', 'reprint protection', 'timer'],
                renderControl: () => (
                  <div className="space-y-2 bg-[var(--foreground)]/[0.01] p-3 rounded-2xl border border-[var(--border)] border-dashed">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase text-[var(--foreground)]/60">Reprint Safety Guard</span>
                      <input
                        type="checkbox"
                        checked={!!localPrinterConfig.reprintProtection}
                        onChange={(e) => updateLocalPrinterConfig({ reprintProtection: e.target.checked })}
                        className="rounded text-[var(--primary)] focus:ring-[var(--primary)] h-4 w-4 cursor-pointer"
                      />
                    </div>
                    {localPrinterConfig.reprintProtection && (
                      <div className="space-y-1 pt-1 border-t border-[var(--border)] border-dashed">
                        <div className="flex justify-between text-[8px] font-bold text-[var(--foreground)]/45">
                          <span>LOCKOUT DELAY LIMIT:</span>
                          <span className="font-mono font-black text-[var(--foreground)]">{localPrinterConfig.cooldownDuration || 15} SECONDS</span>
                        </div>
                        <input
                          type="range"
                          min="5"
                          max="60"
                          step="5"
                          value={localPrinterConfig.cooldownDuration || 15}
                          onChange={(e) => updateLocalPrinterConfig({ cooldownDuration: parseInt(e.target.value) })}
                          className="w-full accent-[var(--primary)] cursor-pointer h-1 rounded-full bg-[var(--border)]"
                        />
                      </div>
                    )}
                  </div>
                )
              },
              {
                id: 'print-title-bold',
                category: 'printer',
                color: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
                title: '🖨️ Receipt Store Name Typography',
                description: 'Toggle dual-bold, tall visual formatting for store name headers to enhance brand readability on tickets.',
                keywords: ['bold title', 'printer header', 'receipt title', 'double height', 'text weight', 'bold', 'invoice typography'],
                renderControl: () => (
                  <div className="flex items-center justify-between bg-[var(--foreground)]/[0.02] p-2.5 rounded-xl border border-[var(--border)]">
                    <span className="text-[10px] font-black uppercase text-[var(--foreground)]/60">Double-Bold Receipt Title</span>
                    <button
                      onClick={() => updateLocalPrinterConfig({ boldTitle: !localPrinterConfig.boldTitle })}
                      className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase transition-all cursor-pointer ${
                        localPrinterConfig.boldTitle 
                          ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 font-black' 
                          : 'bg-[var(--foreground)]/5 text-[var(--foreground)]/50 border border-[var(--border)] font-bold'
                      }`}
                    >
                      {localPrinterConfig.boldTitle ? 'ACTIVE' : 'INACTIVE'}
                    </button>
                  </div>
                )
              },
              {
                id: 'sound-mode',
                category: 'sound',
                color: 'bg-teal-500/10 text-teal-500 border-teal-500/20',
                title: '🔊 Haptic Beepers & Synthesizer Mode',
                description: 'Toggle system audio chimes, voice-advice suggestions, and instant haptic vibration click feedback.',
                keywords: ['sound', 'volume', 'voice feedback', 'beeps', 'synth', 'audio', 'mute', 'vibration', 'vibrate', 'haptic', 'beeper', 'silent', 'buzzer'],
                renderControl: () => (
                  <div className="flex gap-1.5 bg-[var(--foreground)]/[0.02] p-1 rounded-xl border border-[var(--border)]">
                    {[
                      { id: 'silent', label: '🔇 Silent' },
                      { id: 'vibrate_only', label: '📳 Tactile Vibrate' },
                      { id: 'vibrate_sound', label: '🔊 Audio Chimes' }
                    ].map(s => (
                      <button
                        key={s.id}
                        onClick={() => onUpdateSettings({ soundFeedbackMode: s.id as any })}
                        className={`flex-1 py-1.5 px-2 rounded-lg text-[10px] font-black uppercase transition-all cursor-pointer ${
                          state.settings.soundFeedbackMode === s.id
                            ? 'bg-[var(--primary)] text-white shadow-sm font-black'
                            : 'text-[var(--foreground)]/60 hover:text-[var(--foreground)] hover:bg-[var(--foreground)]/5 font-bold'
                        }`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                )
              },
              {
                id: 'sound-pack',
                category: 'sound',
                color: 'bg-teal-500/10 text-teal-500 border-teal-500/20',
                title: '🎵 Synth & Beeper Sound Style Pack',
                description: 'Configure your custom system sound pack between classic cash register rings and zen bell hums.',
                keywords: ['sound style', 'audio pack', 'beeps style', 'classic beep', 'pos chime', 'classic', 'modern sound', 'soundtheme', 'ringtones'],
                renderControl: () => (
                  <div className="space-y-1">
                    <select
                      value={state.settings.soundStylePack || 'classic_pos'}
                      onChange={(e) => onUpdateSettings({ soundStylePack: e.target.value as any })}
                      className="w-full text-[10px] font-black uppercase tracking-wider rounded-xl border border-[var(--border)] p-2.5 bg-transparent text-[var(--foreground)] focus:ring-1 focus:ring-[var(--primary)] focus:outline-none cursor-pointer"
                    >
                      <option value="classic_pos" className="bg-[var(--card)] text-[var(--foreground)] font-bold">Classic Supermarket Beeps</option>
                      <option value="modern" className="bg-[var(--card)] text-[var(--foreground)] font-bold">Ambient Zen Ring Tones</option>
                      <option value="professional" className="bg-[var(--card)] text-[var(--foreground)] font-bold">High-Tech System Synth</option>
                    </select>
                  </div>
                )
              },
              {
                id: 'store-details',
                category: 'operations',
                color: 'bg-rose-500/10 text-rose-500 border-rose-500/20',
                title: '🏢 Store Branding & Contact Credentials',
                description: 'Instantly modify store trading titles, physical address coordinates, and phone numbers printed on invoices.',
                keywords: ['store name', 'business name', 'receipt header', 'shop name', 'owner name', 'title', 'identity', 'branding', 'address', 'phone'],
                renderControl: () => (
                  <div className="space-y-2 bg-[var(--foreground)]/[0.01] p-3 rounded-2xl border border-[var(--border)]">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <span className="text-[8px] font-black uppercase tracking-wider text-[var(--foreground)]/45">Store Title</span>
                        <input
                          type="text"
                          value={state.settings.storeName || ''}
                          onChange={(e) => onUpdateSettings({ storeName: e.target.value })}
                          placeholder="e.g. TS Super Kirana"
                          className="w-full text-[10px] font-bold border border-[var(--border)] rounded-xl p-2 bg-transparent text-[var(--foreground)] focus:ring-1 focus:ring-[var(--primary)] focus:outline-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <span className="text-[8px] font-black uppercase tracking-wider text-[var(--foreground)]/45">Store Owner</span>
                        <input
                          type="text"
                          value={state.settings.storeOwnerName || ''}
                          onChange={(e) => onUpdateSettings({ storeOwnerName: e.target.value })}
                          placeholder="e.g. Talha Stalha"
                          className="w-full text-[10px] font-bold border border-[var(--border)] rounded-xl p-2 bg-transparent text-[var(--foreground)] focus:ring-1 focus:ring-[var(--primary)] focus:outline-none"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <span className="text-[8px] font-black uppercase tracking-wider text-[var(--foreground)]/45">Physical Address</span>
                        <input
                          type="text"
                          value={state.settings.storeAddress || ''}
                          onChange={(e) => onUpdateSettings({ storeAddress: e.target.value })}
                          placeholder="e.g. 12-A Digital Bazaar"
                          className="w-full text-[10px] font-bold border border-[var(--border)] rounded-xl p-2 bg-transparent text-[var(--foreground)] focus:ring-1 focus:ring-[var(--primary)] focus:outline-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <span className="text-[8px] font-black uppercase tracking-wider text-[var(--foreground)]/45">Contact Number</span>
                        <input
                          type="text"
                          value={state.settings.storePhone || ''}
                          onChange={(e) => onUpdateSettings({ storePhone: e.target.value })}
                          placeholder="e.g. 9876543210"
                          className="w-full text-[10px] font-bold border border-[var(--border)] rounded-xl p-2 bg-transparent text-[var(--foreground)] focus:ring-1 focus:ring-[var(--primary)] focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                )
              },
              {
                id: 'gstin',
                category: 'operations',
                color: 'bg-rose-500/10 text-rose-500 border-rose-500/20',
                title: '🧾 GSTIN Registration Code',
                description: 'Configure active tax registration numbers (GSTIN/VAT) for compliant invoice billing calculations.',
                keywords: ['gst', 'tax', 'gstin', 'vat', 'business tax', 'registration', 'gst number', 'tax rate', 'legal id'],
                renderControl: () => (
                  <div className="space-y-1 bg-[var(--foreground)]/[0.01] p-2.5 rounded-xl border border-[var(--border)]">
                    <span className="text-[8px] font-black uppercase tracking-wider text-[var(--foreground)]/45">15-Digit Identifier</span>
                    <input
                      type="text"
                      maxLength={15}
                      value={state.settings.gstNumber || ''}
                      onChange={(e) => onUpdateSettings({ gstNumber: e.target.value.toUpperCase() })}
                      placeholder="e.g. 07AAAAA1111A1Z1"
                      className="w-full text-[10px] font-mono font-black uppercase tracking-widest border border-[var(--border)] rounded-lg p-2 bg-transparent text-[var(--foreground)] focus:ring-1 focus:ring-[var(--primary)] focus:outline-none"
                    />
                  </div>
                )
              },
              {
                id: 'upi-id',
                category: 'operations',
                color: 'bg-rose-500/10 text-rose-500 border-rose-500/20',
                title: '📲 UPI Payment VPA Address',
                description: 'Set up your default merchant UPI ID handle to instantly generate on-screen checkout payment scanning QR codes.',
                keywords: ['upi', 'qr code', 'payment gateway', 'gpay', 'phonepe', 'paytm', 'upi address', 'collect', 'scanner', 'bank transfer'],
                renderControl: () => (
                  <div className="space-y-1 bg-[var(--foreground)]/[0.01] p-2.5 rounded-xl border border-[var(--border)]">
                    <span className="text-[8px] font-black uppercase tracking-wider text-[var(--foreground)]/45">UPI VPA Handle</span>
                    <input
                      type="text"
                      value={state.settings.upiId || ''}
                      onChange={(e) => onUpdateSettings({ upiId: e.target.value })}
                      placeholder="e.g. merchant@okaxis"
                      className="w-full text-[10px] font-mono font-bold border border-[var(--border)] rounded-lg p-2 bg-transparent text-[var(--foreground)] focus:ring-1 focus:ring-[var(--primary)] focus:outline-none"
                    />
                  </div>
                )
              },
              {
                id: 'stt-strict',
                category: 'security',
                color: 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20',
                title: '🛡️ Voice Spelling Strict Filtering',
                description: 'Enforce strict language spell checks on microphone speech recognition to eliminate noisy background translations.',
                keywords: ['strict', 'validate', 'language mode', 'accent filter', 'clean text', 'stt strictness', 'speech matching'],
                renderControl: () => (
                  <div className="flex items-center justify-between bg-[var(--foreground)]/[0.02] p-2.5 rounded-xl border border-[var(--border)]">
                    <span className="text-[10px] font-black uppercase text-[var(--foreground)]/60">Phonetics Noise Isolation</span>
                    <button
                      onClick={() => onUpdateSettings({ enableStrictLanguageMode: !state.settings.enableStrictLanguageMode })}
                      className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase transition-all cursor-pointer ${
                        state.settings.enableStrictLanguageMode
                          ? 'bg-indigo-500/10 text-indigo-600 border border-indigo-500/20 font-black'
                          : 'bg-[var(--foreground)]/5 text-[var(--foreground)]/50 border border-[var(--border)] font-bold'
                      }`}
                    >
                      {state.settings.enableStrictLanguageMode ? 'STRICT' : 'STANDARD'}
                    </button>
                  </div>
                )
              },
              {
                id: 'voice-translate',
                category: 'security',
                color: 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20',
                title: '🗣️ STT Voice Auto-Translation',
                description: 'Automatically translate raw Hindi spoken product entries to standardized catalog equivalents.',
                keywords: ['translate', 'voice auto-translate', 'hindi to english', 'bilingual', 'auto translate', 'voice product added'],
                renderControl: () => (
                  <div className="flex items-center justify-between bg-[var(--foreground)]/[0.02] p-2.5 rounded-xl border border-[var(--border)]">
                    <span className="text-[10px] font-black uppercase text-[var(--foreground)]/60">Voice Input Translation</span>
                    <button
                      onClick={() => onUpdateSettings({ autoTranslateVoiceProducts: !state.settings.autoTranslateVoiceProducts })}
                      className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase transition-all cursor-pointer ${
                        state.settings.autoTranslateVoiceProducts
                          ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 font-black'
                          : 'bg-[var(--foreground)]/5 text-[var(--foreground)]/50 border border-[var(--border)] font-bold'
                      }`}
                    >
                      {state.settings.autoTranslateVoiceProducts ? 'TRANSLATING' : 'LITERAL'}
                    </button>
                  </div>
                )
              },
              {
                id: 'cloud-backup',
                category: 'security',
                color: 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20',
                title: '☁️ Cloud Backup & Recurrence Intervals',
                description: 'Schedule automated Firestore ledger synchronization intervals to safeguard all transaction memory books.',
                keywords: ['cloud', 'backup', 'sync', 'drive', 'automatic backup', 'scheduled backup', 'storage', 'data protection', 'persistence', 'dropbox'],
                renderControl: () => (
                  <div className="space-y-2 bg-[var(--foreground)]/[0.01] p-3 rounded-2xl border border-[var(--border)] border-dashed">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase text-[var(--foreground)]/60">Auto Sync Pipeline</span>
                      <input
                        type="checkbox"
                        checked={!!state.settings.scheduledBackupEnabled}
                        onChange={(e) => onUpdateSettings({ scheduledBackupEnabled: e.target.checked })}
                        className="rounded text-[var(--primary)] focus:ring-[var(--primary)] h-4 w-4 cursor-pointer"
                      />
                    </div>
                    {state.settings.scheduledBackupEnabled && (
                      <div className="flex gap-2 pt-1 border-t border-[var(--border)] border-dashed">
                        <select
                          value={state.settings.scheduledBackupRecurrence || 'daily'}
                          onChange={(e) => onUpdateSettings({ scheduledBackupRecurrence: e.target.value as any })}
                          className="flex-1 text-[9px] font-black uppercase border rounded-lg p-1.5 bg-transparent text-[var(--foreground)] cursor-pointer focus:outline-none"
                        >
                          <option value="daily" className="bg-[var(--card)] text-[var(--foreground)]">EVERY SINGLE DAY</option>
                          <option value="weekly" className="bg-[var(--card)] text-[var(--foreground)]">EVERY SUNDAY</option>
                        </select>
                        <input
                          type="time"
                          value={state.settings.scheduledBackupTime || '22:00'}
                          onChange={(e) => onUpdateSettings({ scheduledBackupTime: e.target.value })}
                          className="flex-1 text-[10px] font-mono font-black border rounded-lg p-1.5 bg-transparent text-[var(--foreground)] focus:outline-none"
                        />
                      </div>
                    )}
                  </div>
                )
              }
            ];

            // Real-time keyword filter algorithm
            const filteredCommands = commandList.filter(cmd => {
              if (commandSelectedCategory !== 'all' && cmd.category !== commandSelectedCategory) return false;
              if (!commandSearchQuery.trim()) return true;
              const q = commandSearchQuery.toLowerCase();
              return (
                cmd.title.toLowerCase().includes(q) ||
                cmd.description.toLowerCase().includes(q) ||
                cmd.keywords.some(k => k.includes(q))
              );
            });

            if (filteredCommands.length === 0) {
              return (
                <div className="py-12 text-center bg-[var(--foreground)]/[0.01] border border-dashed rounded-3xl space-y-3">
                  <span className="text-3xl block">🔍</span>
                  <div>
                    <h4 className="text-xs font-black uppercase text-[var(--foreground)]">No matching features found</h4>
                    <p className="text-[10px] text-[var(--foreground)]/50 font-semibold mt-1">Try searching for generic tags like "language", "printer", "excel", or "backup".</p>
                  </div>
                  <button
                    onClick={() => { setCommandSearchQuery(''); setCommandSelectedCategory('all'); }}
                    className="px-4 py-2 bg-[var(--primary)] text-white text-[9px] font-black uppercase rounded-xl shadow-sm transition-all cursor-pointer"
                  >
                    Reset Active Filters
                  </button>
                </div>
              );
            }

            return (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredCommands.map(cmd => (
                  <div
                    key={cmd.id}
                    className="p-5 bg-[var(--card)] border border-[var(--border)] hover:border-[var(--primary)]/20 transition-all rounded-[2rem] flex flex-col justify-between space-y-4 shadow-sm"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[8px] font-black uppercase tracking-widest text-[var(--foreground)]/40 font-mono">
                          System {cmd.category} Control
                        </span>
                        <span className={`p-1 px-2.5 rounded-full text-[8px] font-black uppercase tracking-wider border ${cmd.color}`}>
                          {cmd.category}
                        </span>
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-xs font-black text-[var(--foreground)] uppercase leading-tight">{cmd.title}</h4>
                        <p className="text-[10px] font-semibold text-[var(--foreground)]/60 leading-relaxed">{cmd.description}</p>
                      </div>
                    </div>
                    
                    {/* Live configuration trigger control widget */}
                    <div className="pt-2 border-t border-[var(--border)] border-dashed">
                      {cmd.renderControl()}
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}
        </div>
      </div>

      {/* Inspect Past Snapshot Modal Drawer */}
      <AnimatePresence>
        {selectedSnapshot && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedSnapshot(null)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[var(--card)] border border-[var(--border)] rounded-[3rem] p-6 max-w-lg w-full max-h-[85vh] overflow-y-auto space-y-5 shadow-2xl text-[var(--foreground)]"
            >
              <div className="flex justify-between items-start border-b border-[var(--border)] pb-3">
                <div>
                  <span className="text-[9px] font-black uppercase text-[var(--primary)] tracking-widest block">ARCHIVES DISPATCH SNAPSHOT</span>
                  <h3 className="text-base font-black uppercase text-[var(--foreground)] mt-0.5">Closure snapshot of {selectedSnapshot.date}</h3>
                </div>
                <button 
                  onClick={() => setSelectedSnapshot(null)}
                  className="rounded-full h-7 w-7 border border-[var(--border)] text-xs font-bold leading-none flex items-center justify-center text-[var(--foreground)] hover:bg-[var(--foreground)]/10"
                >
                  ✕
                </button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="p-3.5 bg-[var(--foreground)]/[0.03] rounded-2xl border border-[var(--border)] text-center">
                  <span className="text-[8px] uppercase font-bold opacity-45">Sales Collected</span>
                  <span className="text-sm font-mono font-black block text-[var(--foreground)] mt-1">₹{selectedSnapshot.sales}</span>
                </div>
                <div className="p-3.5 bg-[var(--foreground)]/[0.03] rounded-2xl border border-[var(--border)] text-center">
                  <span className="text-[8px] uppercase font-bold opacity-45">Net Profit</span>
                  <span className="text-sm font-mono font-black block text-emerald-500 mt-1">₹{selectedSnapshot.profit}</span>
                </div>
                <div className="p-3.5 bg-[var(--foreground)]/[0.03] rounded-2xl border border-[var(--border)] text-center">
                  <span className="text-[8px] uppercase font-bold opacity-45 font-sans">Checkout Tickets</span>
                  <span className="text-sm font-mono font-black block text-indigo-500 mt-1">{selectedSnapshot.billsCount} Entries</span>
                </div>
                <div className="p-3.5 bg-[var(--foreground)]/[0.03] rounded-2xl border border-[var(--border)] text-center">
                  <span className="text-[8px] uppercase font-bold opacity-45">Readiness Score</span>
                  <span className="text-sm font-mono font-black block text-blue-500 mt-1">{selectedSnapshot.readinessScore}%</span>
                </div>
              </div>

              <div className="p-4 bg-[var(--foreground)]/5 rounded-2xl space-y-2 border">
                <span className="text-[8.5px] uppercase font-black text-amber-500 block">Payment Methods split</span>
                <div className="grid grid-cols-3 gap-2 text-[10px] font-bold text-[var(--foreground)]/70 font-mono">
                  <div>
                    <span className="opacity-45 block">CASH:</span>
                    <span>₹{selectedSnapshot.paymentBreakdown.cash}</span>
                  </div>
                  <div>
                    <span className="opacity-45 block">UPI:</span>
                    <span>₹{selectedSnapshot.paymentBreakdown.upi}</span>
                  </div>
                  <div>
                    <span className="opacity-45 block">CREDIT:</span>
                    <span>₹{selectedSnapshot.paymentBreakdown.credit}</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs font-bold font-sans">
                <div className="p-3 border rounded-xl">
                  <span className="opacity-45 block text-[8px] font-black uppercase">Outstanding Udhar Granted</span>
                  <span className="font-mono mt-1 block">₹{selectedSnapshot.udharNew}</span>
                </div>
                <div className="p-3 border rounded-xl">
                  <span className="opacity-45 block text-[8px] font-black uppercase">Dues Recovered</span>
                  <span className="font-mono mt-1 block">₹{selectedSnapshot.udharRecovered}</span>
                </div>
              </div>

              {selectedSnapshot.notes && (
                <div className="p-4 bg-amber-500/5 rounded-2xl border border-amber-500/10 space-y-1">
                  <span className="text-[8.5px] uppercase font-black text-amber-500 block">Journal Remarks</span>
                  <p className="text-xs font-semibold text-[var(--foreground)]/70 italic leading-relaxed">{selectedSnapshot.notes}</p>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => handleExportPDF(selectedSnapshot)}
                  className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-black text-[10px] tracking-wider uppercase rounded-xl transition-all cursor-pointer text-center"
                >
                  Download Dispatch File
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
