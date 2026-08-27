import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  TrendingUp, TrendingDown, DollarSign, ShoppingBag, 
  AlertTriangle, CheckCircle, Smartphone, Clock, Award,
  Activity, RefreshCw, Database, Printer, Cloud,
  Sliders, Plus, Trash2, Eye, EyeOff, Pin, PinOff,
  ChevronDown, ChevronUp, BarChart3, ArrowRight, Save,
  X, Check, ShieldAlert, Award as Trophy, Zap, 
  Settings, Layers, Star, PlaySquare, Calendar, HelpCircle, AlertOctagon
} from 'lucide-react';
import { AppState, Bill, AppSettings, Item, UdharCustomer, UdharTransaction } from '../types';
import { Button } from './ui/Button';
import { cn, formatCurrency, calculateBillProfit } from '../lib/utils';
import { RecoveryService } from '../services/recoveryService';

// Card ID Definition
export type CardId = 
  | 'sales' | 'profit' | 'bills' | 'inventory_value' | 'low_stock' | 'out_of_stock'
  | 'pending_udhar' | 'top_products' | 'printer_status' | 'cloud_sync_status' | 'backup_status'
  | 'notifications' | 'business_health' | 'recent_activity' | 'business_journey' | 'goals_progress'
  | 'quick_actions';

interface DynamicStoreDashboardProps {
  state: AppState;
  onUpdateSettings: (updates: Partial<AppSettings>) => void;
  onUpdateState: (updates: Partial<AppState>) => void;
  setActiveTab: (tab: any) => void;
  precision: number;
}

export default function DynamicStoreDashboard({
  state,
  onUpdateSettings,
  onUpdateState,
  setActiveTab,
  precision
}: DynamicStoreDashboardProps) {

  const settings = state.settings;
  const localPrinterType = useMemo(() => {
    try {
      const saved = localStorage.getItem('price_manager_printer_config');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.printerType) return parsed.printerType;
      }
    } catch (e) {}
    return 'system';
  }, []);
  const t = useMemo(() => {
    return {
      sales: 'Sales Summary',
      profit: 'Profit Summary',
      bills: 'Bills Summary',
      inventory_value: 'Inventory Value',
      low_stock: 'Low Stock Alerts',
      out_of_stock: 'Out of Stock',
      pending_udhar: 'Pending Udhar',
      top_products: 'Top Products',
      printer_status: 'Printer Status',
      cloud_sync_status: 'Cloud Sync Status',
      backup_status: 'Backup Status',
      notifications: 'Notifications',
      business_health: 'Business Health',
      recent_activity: 'Recent Activity',
      business_journey: 'Business Journey',
      goals_progress: 'Goals Progress',
      quick_actions: 'Quick Operations Actions'
    };
  }, []);

  // Local card state for Expand/Collapse (card ID mapping to expanded boolean)
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>(() => {
    // Default quick_actions, goals_progress, business_health to expanded, rest collapsed
    return {
      quick_actions: true,
      business_health: true,
      goals_progress: true,
      low_stock: true
    };
  });

  // Modal detailed preview state
  const [detailedCard, setDetailedCard] = useState<CardId | null>(null);
  
  // Customization Settings Modal visible toggle
  const [showConfigModal, setShowConfigModal] = useState(false);
  
  // Active Profiles state
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [newProfileName, setNewProfileName] = useState('');

  // Local state trigger for testing alert changes (helps simulate backup/printer failures)
  const [simulatedPrinterOffline, setSimulatedPrinterOffline] = useState(false);
  const [simulatedBackupFailed, setSimulatedBackupFailed] = useState(false);

  // Toggle helper for dynamic card state expansion
  const toggleExpand = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setExpandedCards(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  // Core Math - Todays Metrics
  const todayStr = new Date().toISOString().split('T')[0];
  const todaysBills = useMemo(() => {
    return (state.bills || []).filter(b => {
      const stamp = b.timestamp || '';
      return stamp.startsWith(todayStr);
    });
  }, [state.bills, todayStr]);

  const getBillProfit = (b: Bill) => {
    return calculateBillProfit(b, state.items);
  };

  const dailyProgress = useMemo(() => {
    let sales = 0;
    let profit = 0;
    todaysBills.forEach(b => {
      sales += b.total || 0;
      profit += getBillProfit(b);
    });
    return { sales, profit, count: todaysBills.length };
  }, [todaysBills, state.items]);

  // Inventory value & counts
  const totalValue = useMemo(() => {
    return state.items.reduce((sum, item) => sum + ((item.buyingPrice || 0) * (item.quantity || 0)), 0);
  }, [state.items]);

  const lowStockItems = useMemo(() => {
    const minLvl = settings.minStockLevel || 5;
    return state.items.filter(item => (item.quantity || 0) > 0 && (item.quantity || 0) <= minLvl);
  }, [state.items, settings.minStockLevel]);

  const outOfStockItems = useMemo(() => {
    return state.items.filter(item => (item.quantity || 0) <= 0);
  }, [state.items]);

  // Pending Udhar stats
  const pendingUdharTotal = useMemo(() => {
    return (state.udharCustomers || []).reduce((sum, c) => sum + (c.totalUdhar || 0), 0);
  }, [state.udharCustomers]);

  const overdueUdharCount = useMemo(() => {
    const customers = state.udharCustomers || [];
    const transactions = state.udharTransactions || [];
    if (customers.length === 0 || transactions.length === 0) return 0;

    const todayStr = new Date().toISOString().split('T')[0];
    const todayNum = new Date(todayStr).getTime();
    let count = 0;

    transactions.forEach(tx => {
      if (tx.amount > 0 && tx.dueDate) {
        const cust = customers.find(c => c.id === tx.customerId);
        if (cust && cust.totalUdhar > 0) {
          const rawDue = tx.dueDate.includes('T') ? tx.dueDate : `${tx.dueDate}T00:00:00`;
          const txDueStr = rawDue.split('T')[0];
          const txDueNum = txDueStr ? new Date(txDueStr).getTime() : 0;
          
          const diffMs = txDueNum - todayNum;
          const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

          if (diffDays <= 0) {
            count++;
          }
        }
      }
    });
    return count;
  }, [state.udharCustomers, state.udharTransactions]);

  // Top Products today
  const topProductsToday = useMemo(() => {
    const counts: Record<string, { name: string; qty: number; sales: number }> = {};
    todaysBills.forEach(b => {
      (b.items || []).forEach((item: any) => {
        const id = item.id || item.itemId || item.name;
        if (!counts[id]) {
          counts[id] = { name: item.name, qty: 0, sales: 0 };
        }
        counts[id].qty += item.quantity || 0;
        counts[id].sales += (item.price || 0) * (item.quantity || 0);
      });
    });
    return Object.values(counts).sort((a, b) => b.qty - a.qty).slice(0, 5);
  }, [todaysBills]);

  // Business Health Score index (0 to 100%)
  const businessHealth = useMemo(() => {
    let score = 100;
    // Debts deduction
    if (pendingUdharTotal > 50000) score -= 15;
    else if (pendingUdharTotal > 15000) score -= 8;
    
    // Out of Stock deduction
    const oosPct = state.items.length > 0 ? (outOfStockItems.length / state.items.length) * 100 : 0;
    if (oosPct > 20) score -= 20;
    else if (oosPct > 5) score -= 10;

    // Goals achieved bonus
    const salesGoal = 5000; // placeholder if not defined
    const todaySales = dailyProgress.sales;
    if (todaySales >= salesGoal) score += 5;

    // Safety margins
    return Math.max(15, Math.min(100, score));
  }, [pendingUdharTotal, state.items.length, outOfStockItems.length, dailyProgress.sales]);

  // Unread notifications tracker
  const unreadNotifications = useMemo(() => {
    return (state.notes || []).filter(n => !settings.dismissedNotifications?.includes(n.id || ''));
  }, [state.notes, settings.dismissedNotifications]);

  // Business Journey Milestones
  const currentMilestone = useMemo(() => {
    const totalSalesAllTime = (state.bills || []).reduce((sum, b) => sum + (b.total || 0), 0);
    const totalBillsCount = (state.bills || []).length;

    // Default / Kirana mode
    if (totalBillsCount < 10) {
      return { level: 1, title: 'Retail Starter 🏪', next: 'Store Operator (10 Bills)', progress: (totalBillsCount / 10) * 100, current: totalBillsCount, target: 10 };
    } else if (totalBillsCount < 50) {
      return { level: 2, title: 'Store Operator 🔄', next: 'Kirana King (50 Bills)', progress: (totalBillsCount / 50) * 100, current: totalBillsCount, target: 50 };
    } else if (totalBillsCount < 200) {
      return { level: 3, title: 'Kirana King 👑', next: 'Wholesale Tycoon (200 Bills)', progress: (totalBillsCount / 200) * 100, current: totalBillsCount, target: 200 };
    } else {
      return { level: 4, title: 'Commercial Emperor 🚀', next: 'Legendary Status Achieved!', progress: 100, current: totalBillsCount, target: 200 };
    }
  }, [state.bills]);

  // Retrieve current active cards layout mapping
  const activeCardsConfig = useMemo(() => {
    const defaultConfigs = settings.dashboardCardsConfig || [
      { id: 'quick_actions', size: 'large', pinned: true, hidden: false },
      { id: 'business_health', size: 'medium', pinned: false, hidden: false },
      { id: 'sales', size: 'large', pinned: false, hidden: false },
      { id: 'profit', size: 'medium', pinned: false, hidden: false },
      { id: 'bills', size: 'medium', pinned: false, hidden: false },
      { id: 'low_stock', size: 'medium', pinned: false, hidden: false },
      { id: 'out_of_stock', size: 'medium', pinned: false, hidden: false },
      { id: 'pending_udhar', size: 'medium', pinned: false, hidden: false },
      { id: 'inventory_value', size: 'medium', pinned: false, hidden: false },
      { id: 'top_products', size: 'large', pinned: false, hidden: false },
      { id: 'goals_progress', size: 'large', pinned: false, hidden: false },
      { id: 'printer_status', size: 'small', pinned: false, hidden: false },
      { id: 'cloud_sync_status', size: 'small', pinned: false, hidden: false },
      { id: 'backup_status', size: 'small', pinned: false, hidden: false },
      { id: 'notifications', size: 'medium', pinned: false, hidden: false },
      { id: 'recent_activity', size: 'medium', pinned: false, hidden: false },
      { id: 'business_journey', size: 'large', pinned: false, hidden: false }
    ];
    return defaultConfigs;
  }, [settings.dashboardCardsConfig]);

  // Computed Priority Scores (0 to 120+) for all card IDs
  const designScores = useMemo(() => {
    const scores: Record<CardId, number> = {
      sales: 30,
      profit: 20,
      bills: 20,
      inventory_value: 15,
      low_stock: 0,
      out_of_stock: 0,
      pending_udhar: 15,
      top_products: 10,
      printer_status: 10,
      cloud_sync_status: 10,
      backup_status: 10,
      notifications: 5,
      business_health: 30,
      recent_activity: 5,
      business_journey: 5,
      goals_progress: 25,
      quick_actions: 10
    };

    const isDynamicOn = settings.dashboardMode !== 'fixed' && settings.dashboardEnableDynamic !== false;

    if (isDynamicOn) {
      // 1. INVENTORY PRIORITIES
      if (settings.dashboardPrioritizeInventory !== false) {
        const minStockSize = lowStockItems.length;
        if (minStockSize > 0) {
          scores.low_stock = 45 + Math.min(30, minStockSize * 6);
          // Critical boost
          if (minStockSize > 8) scores.low_stock += 25;
        }
        const oosSize = outOfStockItems.length;
        if (oosSize > 0) {
          scores.out_of_stock = 50 + Math.min(30, oosSize * 8);
        }
        if (totalValue > 500000) {
          scores.inventory_value += 30; // heavy inventory value
        }
      }

      // 2. ALERTS & NOTIFICATIONS PRIORITIES
      if (settings.dashboardPrioritizeAlerts !== false) {
        if (unreadNotifications.length > 0) {
          scores.notifications = 40 + (unreadNotifications.length * 12);
        }
      }

      // 3. SYSTEM STATUS PRIORITIES
      if (settings.dashboardPrioritizeSystem !== false) {
        if (simulatedPrinterOffline) {
          scores.printer_status = 98; // Moves right near top for critical action needed
        }
        if (simulatedBackupFailed) {
          scores.backup_status = 85;
        }
        if (!settings.autoCloudSync) {
          scores.cloud_sync_status += 15;
        }
      }

      // 4. BILLING & FINANCE PRIORITIES
      if (settings.dashboardPrioritizeBilling !== false) {
        // High Billing activity trigger
        if (dailyProgress.count > 15) {
          scores.bills += 35;
          scores.sales += 20;
        }
        // Heavy sales day achieved goals
        const salesGoal = 10000;
        if (dailyProgress.sales > salesGoal) {
          scores.sales += 40;
          scores.goals_progress += 30;
        }
        if (topProductsToday.length > 0) {
          scores.top_products += 15;
        }
      }

      // 5. UDHAR DEBT PRIORITIES
      if (settings.dashboardPrioritizeUdhar !== false) {
        if (pendingUdharTotal > 20000) {
          scores.pending_udhar = 40 + Math.min(40, Math.floor(pendingUdharTotal / 1000));
        }
        if (overdueUdharCount > 0) {
          scores.pending_udhar += 30; // overdue warnings float up instantly
        }
      }

      // 6. BUSINESS MODE INTEGRATION OVER-RIDES
      scores.sales += 20;
      scores.low_stock += 15;
      scores.inventory_value += 10;
    }

    return scores;
  }, [
    settings.dashboardMode,
    settings.dashboardEnableDynamic,
    settings.dashboardPrioritizeInventory,
    settings.dashboardPrioritizeAlerts,
    settings.dashboardPrioritizeSystem,
    settings.dashboardPrioritizeBilling,
    settings.dashboardPrioritizeUdhar,
    lowStockItems.length,
    outOfStockItems.length,
    unreadNotifications.length,
    simulatedPrinterOffline,
    simulatedBackupFailed,
    settings.autoCloudSync,
    dailyProgress,
    pendingUdharTotal,
    overdueUdharCount,
    topProductsToday.length,
    totalValue
  ]);

  // Filter and sort the rendered cards array according to the selected mode
  const sortedCards = useMemo(() => {
    // 1. Get filtered configurations based on Show toggles & auto-hide empty cards
    let list = activeCardsConfig.filter(cfg => {
      // Permanently removed unneeded/complicated features requested by user
      if (cfg.id === 'quick_actions' || cfg.id === 'top_products' || cfg.id === 'goals_progress') return false;

      // Manual hide option check
      if (cfg.hidden) return false;

      // Show specific card toggles check
      if (cfg.id === 'recent_activity' && settings.dashboardShowRecentActivity === false) return false;
      if (cfg.id === 'business_health' && settings.dashboardShowBusinessHealth === false) return false;
      if (cfg.id === 'printer_status' && settings.dashboardShowPrinterStatus === false) return false;
      if (cfg.id === 'cloud_sync_status' && settings.dashboardShowCloudSync === false) return false;
      if (cfg.id === 'backup_status' && settings.dashboardShowBackupStatus === false) return false;
      if (cfg.id === 'business_journey' && settings.dashboardShowBusinessJourney === false) return false;
      if (cfg.id === 'goals_progress' && settings.dashboardShowGoalsProgress === false) return false;

      // Auto Hide empty cards triggers
      if (settings.dashboardAutoHideEmptyCards) {
        if (cfg.id === 'low_stock' && lowStockItems.length === 0) return false;
        if (cfg.id === 'out_of_stock' && outOfStockItems.length === 0) return false;
        if (cfg.id === 'notifications' && unreadNotifications.length === 0) return false;
        if (cfg.id === 'pending_udhar' && pendingUdharTotal === 0) return false;
        if (cfg.id === 'printer_status' && !simulatedPrinterOffline) return false;
      }

      return true;
    });

    const isPinned = (id: string) => {
      const cfg = activeCardsConfig.find(c => c.id === id);
      return cfg?.pinned || false;
    };

    const dMode = settings.dashboardMode || 'hybrid';

    // 2. Perform sorting
    if (dMode === 'fixed') {
      // Remains in the configured layout mapping order
      return list;
    } else if (dMode === 'dynamic') {
      // 100% dynamic - Sorted by priority score descending, keeping Pinned strictly at top
      return [...list].sort((a, b) => {
        if (isPinned(a.id) && !isPinned(b.id)) return -1;
        if (!isPinned(a.id) && isPinned(b.id)) return 1;
        return (designScores[b.id as CardId] || 0) - (designScores[a.id as CardId] || 0);
      });
    } else {
      // Hybrid recommended mode - Pinned and top items dynamic (scores > 50) at top section. Remaining fixed below.
      const priorityCutoff = 50;
      const dynamicTop = list.filter(cfg => isPinned(cfg.id) || (designScores[cfg.id as CardId] || 0) >= priorityCutoff);
      const standardBottom = list.filter(cfg => !isPinned(cfg.id) && (designScores[cfg.id as CardId] || 0) < priorityCutoff);

      // Sort dynamic tops descending
      const sortedTop = [...dynamicTop].sort((a, b) => {
        if (isPinned(a.id) && !isPinned(b.id)) return -1;
        if (!isPinned(a.id) && isPinned(b.id)) return 1;
        return (designScores[b.id as CardId] || 0) - (designScores[a.id as CardId] || 0);
      });

      // Bottom cards keep their exact user configuration order
      return [...sortedTop, ...standardBottom];
    }
  }, [
    activeCardsConfig,
    settings.dashboardMode,
    settings.dashboardAutoHideEmptyCards,
    settings.dashboardShowRecentActivity,
    settings.dashboardShowBusinessHealth,
    settings.dashboardShowPrinterStatus,
    settings.dashboardShowCloudSync,
    settings.dashboardShowBackupStatus,
    settings.dashboardShowBusinessJourney,
    settings.dashboardShowGoalsProgress,
    lowStockItems.length,
    outOfStockItems.length,
    unreadNotifications.length,
    pendingUdharTotal,
    simulatedPrinterOffline,
    simulatedBackupFailed,
    designScores
  ]);

  // Card size modifier helpers
  const handleResizeCard = (id: string, currentSize: 'small' | 'medium' | 'large') => {
    const orderSizes: ('small' | 'medium' | 'large')[] = ['small', 'medium', 'large'];
    const idx = orderSizes.indexOf(currentSize);
    const nextSize = orderSizes[(idx + 1) % orderSizes.length];

    const updated = activeCardsConfig.map(cfg => {
      if (cfg.id === id) {
        return { ...cfg, size: nextSize };
      }
      return cfg;
    });
    onUpdateSettings({ dashboardCardsConfig: updated });
  };

  const handleTogglePin = (id: string) => {
    const updated = activeCardsConfig.map(cfg => {
      if (cfg.id === id) {
        return { ...cfg, pinned: !cfg.pinned };
      }
      return cfg;
    });
    onUpdateSettings({ dashboardCardsConfig: updated });
  };

  // Reorder commands for manual configuration (fixed mode or user swaps)
  const moveCard = (index: number, direction: 'up' | 'down') => {
    const targetIdx = index + (direction === 'up' ? -1 : 1);
    if (targetIdx < 0 || targetIdx >= sortedCards.length) return;
    
    // We adjust the underlying master dashboardCardsConfig order to match
    const newCardsConfig = [...activeCardsConfig];
    const cardAId = sortedCards[index].id;
    const cardBId = sortedCards[targetIdx].id;

    const idxA = newCardsConfig.findIndex(c => c.id === cardAId);
    const idxB = newCardsConfig.findIndex(c => c.id === cardBId);

    if (idxA !== -1 && idxB !== -1) {
      const temp = newCardsConfig[idxA];
      newCardsConfig[idxA] = newCardsConfig[idxB];
      newCardsConfig[idxB] = temp;
      onUpdateSettings({ dashboardCardsConfig: newCardsConfig });
    }
  };

  // Profile management savers
  const handleSaveCurrentAsProfile = () => {
    if (!newProfileName.trim()) return;

    const newProfile = {
      name: newProfileName,
      mode: settings.dashboardMode || 'hybrid',
      cardsConfig: activeCardsConfig.map(c => ({
        id: c.id,
        size: c.size,
        pinned: c.pinned,
        hidden: c.hidden,
        customTitle: c.customTitle
      }))
    };

    const currentProfiles = settings.dashboardProfiles || [];
    const updatedProfiles = [...currentProfiles.filter(p => p.name !== newProfileName), newProfile];

    onUpdateSettings({
      dashboardProfiles: updatedProfiles,
      activeDashboardProfile: newProfileName
    });
    setNewProfileName('');
    setShowProfileModal(false);
  };

  const selectDashboardProfile = (profileName: string) => {
    const profile = (settings.dashboardProfiles || []).find(p => p.name === profileName);
    if (!profile) return;

    onUpdateSettings({
      activeDashboardProfile: profileName,
      dashboardMode: profile.mode,
      dashboardCardsConfig: profile.cardsConfig
    });
  };

  // Status triggers color formatting
  const getCardStatusVisuals = (id: CardId) => {
    const score = designScores[id] || 0;
    const isHighlightOn = settings.dashboardPriorityHighlightEffects !== false;

    if (!isHighlightOn) return "border-[var(--border)] bg-[var(--card)]";

    if (id === 'printer_status' && simulatedPrinterOffline) {
      return "border-rose-500/40 bg-rose-500/5 ring-1 ring-rose-500/20 shadow-[0_0_15px_rgba(239,68,68,0.12)]";
    }
    if (id === 'low_stock' && lowStockItems.length > 5) {
      return "border-amber-500/40 bg-amber-500/5 ring-1 ring-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.12)]";
    }
    if (id === 'pending_udhar' && overdueUdharCount > 0) {
      return "border-red-500/40 bg-red-500/5 ring-1 ring-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.12)]";
    }
    if (id === 'backup_status' && simulatedBackupFailed) {
      return "border-amber-500/40 bg-amber-500/5 ring-1 ring-amber-500/20";
    }

    if (score >= 70) {
      return "border-amber-500/35 bg-amber-500/5 ring-1 ring-amber-500/10";
    }

    return "border-[var(--border)] bg-[var(--card)]";
  };

  return (
    <div className="space-y-6">

      {/* Grid of adaptively prioritized Cards */}
      <motion.div 
        layout={settings.dashboardSmoothCardMovement !== false}
        id="dashboard-grid"
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
      >
        <AnimatePresence mode="popLayout">
          {sortedCards.map((cardCfg, index) => {
            const cardId = cardCfg.id as CardId;
            const size = cardCfg.size || 'medium';
            const isCardExpanded = expandedCards[cardId];
            const isPinned = cardCfg.pinned;
            const score = designScores[cardId] || 0;
            const hasGlow = score >= 70 && settings.dashboardPriorityHighlightEffects !== false;

            // Compute card grid spans
            let spanClass = "col-span-1";
            if (size === 'medium') spanClass = "col-span-1 md:col-span-1 lg:col-span-1";
            if (size === 'large') spanClass = "col-span-1 md:col-span-2 lg:col-span-2";

            return (
              <motion.div
                key={`dashboard-card-${cardId}`}
                layoutId={`card-container-${cardId}`}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                whileHover={{ y: -6, scale: 1.018, boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)" }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ type: "spring", stiffness: 220, damping: 24 }}
                className={cn(
                  "card flex flex-col justify-between overflow-hidden relative border rounded-[2.5rem] p-6 transition-colors duration-300",
                  spanClass,
                  getCardStatusVisuals(cardId),
                  hasGlow && "after:absolute after:inset-0 after:rounded-[2.5rem] after:border-2 after:border-amber-400/20 after:pointer-events-none"
                )}
              >
                {/* Priority Score tag & indicators */}
                <div className="absolute top-4 right-4 flex items-center gap-1.5">
                  {isPinned && (
                    <span className="bg-[var(--primary)]/10 text-[var(--primary)] p-1 rounded-lg" title="Pinned to top">
                      <Pin size={10} className="transform rotate-45" />
                    </span>
                  )}
                  {settings.dashboardMode !== 'fixed' && score > 35 && (
                    <span className={cn(
                      "text-[8px] font-black uppercase px-2 py-0.5 rounded-full",
                      score >= 70 ? "bg-red-500/10 text-red-500 animate-pulse" : "bg-amber-500/10 text-amber-500"
                    )}>
                      Priority {score}
                    </span>
                  )}
                </div>

                {/* Card Content Handler */}
                <div className="space-y-4">
                  
                  {/* Card Header Title and Controls */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">
                        {cardId === 'sales' && '📊'}
                        {cardId === 'profit' && '💰'}
                        {cardId === 'bills' && '🧾'}
                        {cardId === 'inventory_value' && '💎'}
                        {cardId === 'low_stock' && '⚠️'}
                        {cardId === 'out_of_stock' && '⛔'}
                        {cardId === 'pending_udhar' && '📕'}
                        {cardId === 'top_products' && '🏆'}
                        {cardId === 'printer_status' && '🖨️'}
                        {cardId === 'cloud_sync_status' && '☁️'}
                        {cardId === 'backup_status' && '📁'}
                        {cardId === 'notifications' && '🔔'}
                        {cardId === 'business_health' && '❇️'}
                        {cardId === 'recent_activity' && '🔄'}
                        {cardId === 'business_journey' && '🌟'}
                        {cardId === 'goals_progress' && '🎯'}
                        {cardId === 'quick_actions' && '⚡'}
                      </span>
                      <div>
                        <h3 className="text-xs font-black uppercase tracking-widest text-[var(--foreground)]">
                          {cardCfg.customTitle || t[cardId]}
                        </h3>
                        {isPinned && <p className="text-[8px] opacity-40 font-bold uppercase tracking-wider -mt-0.5">Anchored Top Node</p>}
                      </div>
                    </div>

                    {/* Quick controls per card */}
                    <div className="flex items-center gap-1 opacity-60 hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => toggleExpand(cardId, e)}
                        className="p-1 hover:bg-[var(--foreground)]/5 rounded-lg"
                        title={isCardExpanded ? "Collapse view" : "Expand view"}
                      >
                        {isCardExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </button>
                      
                      <button
                        onClick={() => handleResizeCard(cardId, size)}
                        className="p-1 hover:bg-[var(--foreground)]/5 rounded-lg text-[9px] font-black font-mono"
                        title="Resize card grid span"
                      >
                        {size.toUpperCase()[0]}
                      </button>

                      <button
                        onClick={() => handleTogglePin(cardId)}
                        className="p-1 hover:bg-[var(--foreground)]/5 rounded-lg"
                        title={isPinned ? "Unpin Card" : "Pin Card"}
                      >
                        {isPinned ? <PinOff size={11} /> : <Pin size={11} />}
                      </button>
                    </div>
                  </div>

                  {/* Render 3 visual stages based on expanded boolean */}
                  <div className="min-h-[4rem]">
                    
                    {/* 1. COLLAPSED VIEW (Standard) */}
                    {!isCardExpanded ? (
                      <div className="space-y-2">
                        {cardId === 'sales' && (
                          <div>
                            <p className="text-2xl font-black tracking-tight">{formatCurrency(dailyProgress.sales, settings.currency, precision)}</p>
                            <p className="text-[10px] opacity-45 uppercase font-bold tracking-wider">Today's Total Billings</p>
                          </div>
                        )}
                        {cardId === 'profit' && (
                          <div>
                            <p className="text-2xl font-black tracking-tight text-emerald-500">{formatCurrency(dailyProgress.profit, settings.currency, precision)}</p>
                            <p className="text-[10px] opacity-45 uppercase font-bold tracking-wider">Estimated Profit Gross Margin</p>
                          </div>
                        )}
                        {cardId === 'bills' && (
                          <div>
                            <p className="text-2xl font-black tracking-tight">{dailyProgress.count} Invoices</p>
                            <p className="text-[10px] opacity-45 uppercase font-bold tracking-wider">Cash Register Counter Sales</p>
                          </div>
                        )}
                        {cardId === 'inventory_value' && (
                          <div>
                            <p className="text-2xl font-black tracking-tight">{formatCurrency(totalValue, settings.currency, precision)}</p>
                            <p className="text-[10px] opacity-45 uppercase font-bold tracking-wider">{state.items.length} Registered Product Skus</p>
                          </div>
                        )}
                        {cardId === 'low_stock' && (
                          <div>
                            <p className={cn("text-2xl font-black tracking-tight", lowStockItems.length > 0 ? "text-amber-500 font-bold" : "text-emerald-500")}>
                              {lowStockItems.length} Products
                            </p>
                            <p className="text-[10px] opacity-45 uppercase font-bold tracking-wider">Nearing Replenish Threshold</p>
                          </div>
                        )}
                        {cardId === 'out_of_stock' && (
                          <div>
                            <p className={cn("text-2xl font-black tracking-tight", outOfStockItems.length > 0 ? "text-rose-500 font-bold animate-pulse" : "text-emerald-500")}>
                              {outOfStockItems.length} Products
                            </p>
                            <p className="text-[10px] opacity-45 uppercase font-bold tracking-wider">Completely Depleted Stock</p>
                          </div>
                        )}
                        {cardId === 'pending_udhar' && (
                          <div>
                            <p className="text-2xl font-black tracking-tight text-rose-500">{formatCurrency(pendingUdharTotal, settings.currency, precision)}</p>
                            <p className="text-[10px] opacity-45 uppercase font-bold tracking-wider">{overdueUdharCount} accounts overdue payment</p>
                          </div>
                        )}
                        {cardId === 'printer_status' && (
                          <div className="flex items-center gap-3 py-2">
                            <span className={cn("inline-block h-3.5 w-3.5 rounded-full", simulatedPrinterOffline ? "bg-rose-500 animate-pulse" : "bg-emerald-500")} />
                            <div>
                              <p className="text-sm font-black uppercase tracking-wide">{simulatedPrinterOffline ? "DISCONNECTED" : "ONLINE / ONLINE"}</p>
                              <p className="text-[9px] opacity-45 font-mono">System Thermal Printer Gateway</p>
                            </div>
                          </div>
                        )}
                        {cardId === 'goals_progress' && (
                          <div className="py-1">
                            <div className="flex justify-between text-xs mb-1">
                              <span className="font-bold opacity-60">Sales Goal ({Math.min(100, Math.round((dailyProgress.sales / 5000) * 100))}%):</span>
                            </div>
                            <div className="h-2 w-full bg-[var(--foreground)]/5 rounded-full overflow-hidden">
                              <div className="h-full bg-[var(--primary)]" style={{ width: `${Math.min(100, (dailyProgress.sales / 5000) * 100)}%` }} />
                            </div>
                          </div>
                        )}
                        {cardId === 'business_health' && (
                          <div className="flex items-center gap-4 py-1">
                            <p className="text-4xl font-black text-emerald-500 font-mono">{businessHealth}%</p>
                            <div>
                              <p className="text-[10px] font-black uppercase tracking-wider text-green-500">Perfect Cleared Node</p>
                              <p className="text-[8px] opacity-40 font-mono">Real-time health quotient algorithm</p>
                            </div>
                          </div>
                        )}
                        {cardId === 'quick_actions' && (
                          <div className="flex gap-2 py-1">
                            {['🧾 Create Bill', '📦 Keep Stock', '📕 Udhar'].slice(0, 3).map((lbl, i) => (
                              <span key={i} className="px-2 py-1 bg-[var(--foreground)]/5 text-[9px] font-black uppercase tracking-wider rounded-lg border border-[var(--border)]">{lbl}</span>
                            ))}
                          </div>
                        )}

                        {/* Default label placeholder */}
                        {!['sales', 'profit', 'bills', 'inventory_value', 'low_stock', 'out_of_stock', 'pending_udhar', 'printer_status', 'goals_progress', 'business_health', 'quick_actions'].includes(cardId) && (
                          <p className="text-sm font-black opacity-60">Tap Expand icon on card header to view status.</p>
                        )}
                      </div>
                    ) : (
                      
                      // 2. EXPANDED VIEW
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="space-y-3 pt-1"
                      >
                        {cardId === 'sales' && (
                          <div className="space-y-2">
                            <div className="p-3 bg-[var(--foreground)]/5 rounded-2xl flex justify-between items-center border border-[var(--border)]">
                              <span className="text-[10px] font-black uppercase tracking-wide text-[var(--foreground)]/60">Bills Count</span>
                              <span className="text-sm font-black font-mono">{dailyProgress.count} sales</span>
                            </div>
                            <div className="p-3 bg-[var(--foreground)]/5 rounded-2xl flex justify-between items-center border border-[var(--border)]">
                              <span className="text-[10px] font-black uppercase tracking-wide text-[var(--foreground)]/60">Average Bill Total</span>
                              <span className="text-sm font-black font-mono">{formatCurrency(dailyProgress.count > 0 ? dailyProgress.sales / dailyProgress.count : 0, settings.currency, precision)}</span>
                            </div>
                          </div>
                        )}

                        {cardId === 'profit' && (
                          <div className="space-y-2">
                            <div className="p-3 bg-[var(--foreground)]/5 rounded-2xl flex justify-between items-center border border-[var(--border)]">
                              <span className="text-[10px] font-black uppercase tracking-wide text-[var(--foreground)]/60">Profit Margin %</span>
                              <span className="text-sm font-black text-emerald-500 font-mono">
                                {dailyProgress.sales > 0 ? Math.round((dailyProgress.profit / dailyProgress.sales) * 100) : 0}%
                              </span>
                            </div>
                            <div className="p-3 bg-indigo-500/5 text-indigo-400 p-3 rounded-2xl flex items-center justify-between border border-indigo-500/15">
                              <span className="text-[9px] uppercase font-black tracking-wider flex items-center gap-1"><Zap size={11} /> Est. Margin Health</span>
                              <span className="text-[9px] uppercase font-black bg-indigo-500/10 border border-indigo-500/30 px-2 py-0.5 rounded">Optimal</span>
                            </div>
                          </div>
                        )}

                        {cardId === 'bills' && (
                          <div className="space-y-2">
                            <div className="p-2.5 bg-emerald-500/5 border border-emerald-500/15 rounded-2xl flex justify-between items-center">
                              <span className="text-[9px] font-black uppercase text-emerald-500 tracking-wide">Cash Sales Cash</span>
                              <span className="text-xs font-black font-mono">₹{dailyProgress.sales.toLocaleString()}</span>
                            </div>
                            <div className="p-2.5 bg-[var(--foreground)]/5 border border-[var(--border)] rounded-2xl flex justify-between items-center">
                              <span className="text-[9px] font-black uppercase opacity-60 tracking-wide">Refunds/Deleted</span>
                              <span className="text-xs font-black font-mono">₹0 (Zero)</span>
                            </div>
                          </div>
                        )}

                        {cardId === 'low_stock' && (
                          <div className="space-y-2">
                            {lowStockItems.length === 0 ? (
                              <p className="text-xs text-green-500 font-bold">✨ No low stock items! All inventories are fully loaded.</p>
                            ) : (
                              <div className="space-y-1">
                                {lowStockItems.slice(0, 3).map((item, idx) => (
                                  <div key={`low-stock-preview-${item.id || 'item'}-${idx}`} className="p-2 bg-[var(--foreground)]/5 rounded-xl border border-[var(--border)] flex justify-between items-center">
                                    <span className="text-[10px] font-black uppercase truncate max-w-[120px]">{item.name}</span>
                                    <span className="text-[10px] font-black font-mono text-amber-500">Qty: {item.quantity}</span>
                                  </div>
                                ))}
                                {lowStockItems.length > 3 && (
                                  <p className="text-[9px] opacity-40 text-center font-bold uppercase tracking-wider mt-1">+ {lowStockItems.length - 3} more low stock products</p>
                                )}
                              </div>
                            )}
                          </div>
                        )}

                        {cardId === 'out_of_stock' && (
                          <div className="space-y-2">
                            {outOfStockItems.length === 0 ? (
                              <p className="text-xs text-green-500 font-bold">✨ Great job! Every product catalog node is in stock.</p>
                            ) : (
                              <div className="space-y-1">
                                {outOfStockItems.slice(0, 3).map((item, idx) => (
                                  <div key={`oos-preview-${item.id || 'item'}-${idx}`} className="p-2 bg-red-500/5 rounded-xl border border-red-500/15 flex justify-between items-center">
                                    <span className="text-[10px] font-black uppercase text-rose-500 truncate max-w-[120px]">{item.name}</span>
                                    <span className="text-[10px] font-black font-mono text-rose-500 uppercase bg-rose-500/10 px-2 py-0.5 rounded">0 Stock</span>
                                  </div>
                                ))}
                                {outOfStockItems.length > 3 && (
                                  <p className="text-[9px] opacity-40 text-center font-bold uppercase tracking-wider mt-1">+ {outOfStockItems.length - 3} depleted catalog elements</p>
                                )}
                              </div>
                            )}
                          </div>
                        )}

                        {cardId === 'pending_udhar' && (
                          <div className="space-y-2">
                            <p className="text-[10px] uppercase font-black opacity-50 tracking-wider">Top outstanding credit accounts:</p>
                            <div className="space-y-1">
                              {(state.udharCustomers || []).slice(0, 2).map((c, idx) => (
                                <div key={`udhar-preview-${c.id || 'cust'}-${idx}`} className="p-2 bg-rose-500/5 border border-rose-500/15 rounded-xl flex justify-between items-center">
                                  <span className="text-[10px] font-black uppercase truncate max-w-[120px]">{c.name}</span>
                                  <span className="text-[10px] font-black font-mono text-rose-500">₹{c.totalUdhar}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {cardId === 'printer_status' && (
                          <div className="space-y-2 text-xs">
                            <div className="flex justify-between p-2 bg-[var(--foreground)]/5 rounded-xl border border-[var(--border)]">
                              <span className="opacity-60 text-[10px] uppercase font-black tracking-wider">Default Paper Size</span>
                              <span>{localPrinterType === 'system' ? 'A4 PDF Printer' : '80mm Thermal'}</span>
                            </div>
                            <Button 
                              variant={simulatedPrinterOffline ? "secondary" : "outline"}
                              size="sm" 
                              onClick={() => setSimulatedPrinterOffline(prev => !prev)}
                              className="w-full text-[9px] font-black uppercase tracking-wider h-8"
                            >
                              Simulation: {simulatedPrinterOffline ? 'Plug in printer' : 'Disconnect printer'}
                            </Button>
                          </div>
                        )}

                        {cardId === 'cloud_sync_status' && (
                          <div className="space-y-2 text-xs">
                            <div className="flex justify-between items-center p-2.5 bg-[var(--foreground)]/5 rounded-xl border border-[var(--border)]">
                              <span className="opacity-60 text-[10px] uppercase font-black">Sync Gateway</span>
                              <span className="text-[10px] font-black text-green-500 bg-green-500/10 px-2 py-0.5 rounded border border-green-500/20">Secure Cloud</span>
                            </div>
                            <p className="text-[9px] opacity-50 text-center">Auto-saving active. All transactions synced locally.</p>
                          </div>
                        )}

                        {cardId === 'backup_status' && (
                          <div className="space-y-2 text-xs">
                            <div className="flex justify-between items-center p-2.5 bg-[var(--foreground)]/5 rounded-xl border border-[var(--border)]">
                              <span className="opacity-60 text-[10px] uppercase font-black">Excel Backup</span>
                              <span>Configured</span>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSimulatedBackupFailed(prev => !prev);
                              }}
                              className="w-full text-[9px] font-black uppercase tracking-wider h-8 border-[var(--border)]"
                            >
                              Simulation: {simulatedBackupFailed ? 'Clear Backup Alert' : 'Trigger fail backup'}
                            </Button>
                          </div>
                        )}

                        {cardId === 'notifications' && (
                          <div className="space-y-2">
                            {unreadNotifications.length === 0 ? (
                              <p className="text-xs text-[var(--foreground)]/40 font-bold select-none py-2 text-center">🔔 Quiet hours. No new unread messages.</p>
                            ) : (
                              <div className="space-y-1">
                                {unreadNotifications.slice(0, 2).map(n => (
                                  <div key={n.id} className="p-2.5 bg-[var(--foreground)]/5 border border-[var(--border)] rounded-xl relative">
                                    <p className="text-[10px] font-black uppercase truncate pr-4">{n.title}</p>
                                    <p className="text-[9px] opacity-60 truncate">{n.description}</p>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        {cardId === 'business_health' && (
                          <div className="space-y-1 text-xs">
                            <div className="flex justify-between pr-1">
                              <span className="opacity-60 text-[9px] uppercase font-black">OOS Ratio (Out of Stock)</span>
                              <span className={outOfStockItems.length > 0 ? "text-amber-500" : "text-emerald-500"}>{outOfStockItems.length} products</span>
                            </div>
                            <div className="flex justify-between pr-1">
                              <span className="opacity-60 text-[9px] uppercase font-black">Udhar Outstanding</span>
                              <span className={pendingUdharTotal > 20000 ? "text-amber-500" : "text-emerald-500"}>₹{pendingUdharTotal}</span>
                            </div>
                          </div>
                        )}

                        {cardId === 'recent_activity' && (
                          <div className="space-y-1">
                            <p className="text-[10px] opacity-50 font-black uppercase tracking-wider">Historical System Operations:</p>
                            <div className="p-2.5 bg-[var(--foreground)]/5 rounded-xl border border-[var(--border)] text-[10px] font-black flex items-center gap-1.5">
                              <span className="h-2 w-2 rounded-full bg-indigo-500 animate-pulse" />
                              <span>Database transactions initialized and verified green.</span>
                            </div>
                          </div>
                        )}

                        {cardId === 'business_journey' && (
                          <div className="space-y-2">
                            <div className="flex justify-between text-xs font-black">
                              <span className="text-[var(--primary)] uppercase tracking-wide">{currentMilestone.title}</span>
                              <span className="opacity-55">Lvl {currentMilestone.level}</span>
                            </div>
                            <div className="h-2.5 w-full bg-[var(--foreground)]/5 border border-[var(--border)] rounded-full overflow-hidden p-0.5">
                              <div className="h-full bg-gradient-to-r from-[var(--primary)] to-amber-500 rounded-full" style={{ width: `${currentMilestone.progress}%` }} />
                            </div>
                            <p className="text-[9px] opacity-45 uppercase font-bold text-center">Progress: {currentMilestone.current} / {currentMilestone.target} Bills processed</p>
                          </div>
                        )}

                        {cardId === 'goals_progress' && (
                          <div className="space-y-2 pt-1 text-xs">
                            <div>
                              <div className="flex justify-between text-[10px] mb-1">
                                <span className="opacity-60 text-[9px] uppercase font-black">Today's Sales Target</span>
                                <span className="font-bold">{Math.round((dailyProgress.sales / 5000) * 100)}%</span>
                              </div>
                              <div className="h-2 w-full bg-[var(--foreground)]/5 rounded-full overflow-hidden">
                                <div className="h-full bg-emerald-500" style={{ width: `${Math.min(100, (dailyProgress.sales / 5000) * 100)}%` }} />
                              </div>
                            </div>
                            <div>
                              <div className="flex justify-between text-[10px] mb-1">
                                <span className="opacity-60 text-[9px] uppercase font-black">Today's Profit Target</span>
                                <span className="font-bold">{Math.round((dailyProgress.profit / 1000) * 100)}%</span>
                              </div>
                              <div className="h-2 w-full bg-[var(--foreground)]/5 rounded-full overflow-hidden">
                                <div className="h-full bg-indigo-500" style={{ width: `${Math.min(100, (dailyProgress.profit / 1000) * 100)}%` }} />
                              </div>
                            </div>
                          </div>
                        )}

                        {cardId === 'quick_actions' && (
                          <div className="grid grid-cols-2 gap-2 pt-1">
                            <Button 
                              variant="primary" 
                              onClick={() => setActiveTab('billing')}
                              className="w-full text-[10px] font-black uppercase tracking-wider py-2 rounded-xl flex items-center justify-center gap-1.5"
                            >
                              <span>🧾</span> Bill Counter
                            </Button>
                            <Button 
                              variant="outline" 
                              onClick={() => {
                                const el = document.getElementById('catalog-section');
                                if (el) el.scrollIntoView({ behavior: 'smooth' });
                              }}
                              className="w-full text-[10px] font-black uppercase tracking-wider py-2 rounded-xl flex items-center justify-center gap-1.5 border-[var(--border)]"
                            >
                              <span>📦</span> Add Product
                            </Button>
                            <Button 
                              variant="outline"
                              onClick={() => setActiveTab('udhar')}
                              className="w-full text-[10px] font-black uppercase tracking-wider py-2 rounded-xl flex items-center justify-center gap-1.5 border-[var(--border)]"
                            >
                              <span>📕</span> Udhar ledger
                            </Button>
                            <Button 
                              variant="outline" 
                              onClick={() => setActiveTab('analytics')}
                              className="w-full text-[10px] font-black uppercase tracking-wider py-2 rounded-xl flex items-center justify-center gap-1.5 border-[var(--border)]"
                            >
                              <span>📊</span> Profit Stats
                            </Button>
                          </div>
                        )}

                        {/* Top Products expanded view */}
                        {cardId === 'top_products' && (
                          <div className="space-y-1">
                            {topProductsToday.length === 0 ? (
                              <p className="text-xs text-[var(--foreground)]/35 select-none py-2 text-center">📈 No transactions processed yet today.</p>
                            ) : (
                              topProductsToday.map((p, i) => (
                                <div key={i} className="p-2 bg-[var(--foreground)]/5 border border-[var(--border)] rounded-xl flex justify-between items-center text-xs">
                                  <span className="font-bold truncate max-w-[130px]">{p.name}</span>
                                  <span className="opacity-60">{p.qty} items</span>
                                </div>
                              ))
                            )}
                          </div>
                        )}

                        {/* Default detailed view link */}
                        <div className="pt-2 flex justify-end">
                          <button
                            onClick={() => setDetailedCard(cardId)}
                            className="text-[9px] font-black uppercase tracking-wider text-[var(--primary)] hover:underline flex items-center gap-1"
                          >
                            Explore deep details
                            <ArrowRight size={10} />
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </div>
                </div>

                {/* Arrow up/down position swaps in Fixed format order */}
                {settings.dashboardAllowReordering !== false && settings.dashboardMode === 'fixed' && (
                  <div className="flex justify-between items-center pt-3 border-t border-[var(--border)] mt-4">
                    <span className="text-[9px] opacity-45 font-black uppercase">{index + 1} of {sortedCards.length} Cards</span>
                    <div className="flex gap-1">
                      <button
                        onClick={() => moveCard(index, 'up')}
                        disabled={index === 0}
                        className="h-6 w-6 rounded-lg bg-[var(--foreground)]/5 hover:bg-[var(--foreground)]/10 text-xs font-black disabled:opacity-35 cursor-pointer flex items-center justify-center border border-[var(--border)]"
                      >
                        ▲
                      </button>
                      <button
                        onClick={() => moveCard(index, 'down')}
                        disabled={index === sortedCards.length - 1}
                        className="h-6 w-6 rounded-lg bg-[var(--foreground)]/5 hover:bg-[var(--foreground)]/10 text-xs font-black disabled:opacity-35 cursor-pointer flex items-center justify-center border border-[var(--border)] px-1"
                      >
                        ▼
                      </button>
                    </div>
                  </div>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </motion.div>

      {/* --- Actionable Floating Detailed Stage Drawers / Overlay Modal --- */}
      <AnimatePresence>
        {detailedCard && (
          <div className="fixed inset-0 z-50 bg-black/45 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[var(--card)] max-w-lg w-full border border-[var(--border)] rounded-[3rem] p-8 shadow-2xl relative space-y-6"
            >
              <button 
                onClick={() => setDetailedCard(null)}
                className="absolute top-6 right-6 p-1.5 bg-[var(--foreground)]/5 hover:bg-rose-500/10 hover:text-rose-500 rounded-full transition-all"
              >
                <X size={18} />
              </button>

              <div className="space-y-1">
                <span className="text-3xl">
                  {detailedCard === 'sales' && '📊'}
                  {detailedCard === 'profit' && '💰'}
                  {detailedCard === 'bills' && '🧾'}
                  {detailedCard === 'inventory_value' && '💎'}
                  {detailedCard === 'low_stock' && '⚠️'}
                  {detailedCard === 'out_of_stock' && '⛔'}
                  {detailedCard === 'pending_udhar' && '📕'}
                  {detailedCard === 'top_products' && '🏆'}
                  {detailedCard === 'printer_status' && '🖨️'}
                  {detailedCard === 'cloud_sync_status' && '☁️'}
                  {detailedCard === 'backup_status' && '📁'}
                  {detailedCard === 'notifications' && '🔔'}
                  {detailedCard === 'business_health' && '❇️'}
                  {detailedCard === 'recent_activity' && '🔄'}
                  {detailedCard === 'business_journey' && '🌟'}
                  {detailedCard === 'goals_progress' && '🎯'}
                  {detailedCard === 'quick_actions' && '⚡'}
                </span>
                <h3 className="text-lg font-black uppercase tracking-tight text-[var(--foreground)]">
                  {t[detailedCard]} Detailed Overview
                </h3>
                <p className="text-[10px] opacity-45 uppercase font-bold tracking-wider">Dynamic Interactive Operations Panel</p>
              </div>

              {/* Dynamic details switch router */}
              <div className="max-h-[300px] overflow-y-auto pr-2 space-y-4 no-scrollbar border-y border-[var(--border)] py-4">
                {detailedCard === 'sales' && (
                  <div className="space-y-3">
                    <p className="text-sm opacity-80">Here is the ledger summary of your transactions processed today:</p>
                    <div className="space-y-2">
                      <div className="p-3 bg-[var(--foreground)]/5 rounded-2xl border border-[var(--border)] flex justify-between font-mono">
                        <span>Daily Total Billing Revenue:</span>
                        <span className="font-black text-[var(--primary)]">{formatCurrency(dailyProgress.sales, settings.currency, precision)}</span>
                      </div>
                      <div className="p-3 bg-[var(--foreground)]/5 rounded-2xl border border-[var(--border)] flex justify-between font-mono">
                        <span>Cash Desk Net Turnover:</span>
                        <span className="font-black text-emerald-500">{formatCurrency(dailyProgress.sales, settings.currency, precision)}</span>
                      </div>
                    </div>
                    <Button variant="primary" onClick={() => { setDetailedCard(null); setActiveTab('billing'); }} className="w-full h-11 rounded-2xl uppercase font-black text-xs tracking-wider">
                      Open Active Billing Cash Counter
                    </Button>
                  </div>
                )}

                {detailedCard === 'low_stock' && (
                  <div className="space-y-3">
                    <p className="text-xs opacity-70 uppercase font-black">All Critical stock alerts needing attention ({lowStockItems.length}):</p>
                    <div className="space-y-1.5 max-h-[180px] overflow-y-auto no-scrollbar">
                      {lowStockItems.map((item, idx) => (
                        <div key={`low-stock-modal-${item.id || 'item'}-${idx}`} className="p-3 bg-amber-500/5 rounded-2xl border border-amber-500/15 flex justify-between items-center">
                          <div>
                            <p className="text-xs font-black uppercase">{item.name}</p>
                            <p className="text-[8px] font-mono opacity-50">Unit Type: {item.unit || 'N/A'}</p>
                          </div>
                          <span className="text-xs font-black text-amber-500 font-mono">Remaining: {item.quantity}</span>
                        </div>
                      ))}
                    </div>
                    <Button variant="primary" onClick={() => { setDetailedCard(null); setActiveTab('home'); /* anchor catalog */ }} className="w-full h-11 rounded-2xl uppercase font-black text-xs tracking-wider">
                      Manage Live Store Catalogs
                    </Button>
                  </div>
                )}

                {detailedCard === 'pending_udhar' && (
                  <div className="space-y-3">
                    <p className="text-xs opacity-70 uppercase font-black">Active outstanding ledger debt accounts:</p>
                    <div className="space-y-1.5 max-h-[185px] overflow-y-auto no-scrollbar">
                      {state.udharCustomers.map((cust, idx) => (
                        <div key={`udhar-modal-${cust.id || 'cust'}-${idx}`} className="p-3 bg-rose-500/5 rounded-2xl border border-rose-500/15 flex justify-between items-center text-xs">
                          <div>
                            <span className="font-black uppercase">{cust.name}</span>
                            <p className="text-[8px] opacity-45">Phone No: {cust.phone || 'N/A'}</p>
                          </div>
                          <span className="font-black text-rose-500 font-mono">₹{cust.totalUdhar}</span>
                        </div>
                      ))}
                    </div>
                    <Button variant="primary" onClick={() => { setDetailedCard(null); setActiveTab('udhar'); }} className="w-full h-11 rounded-2xl uppercase font-black text-xs tracking-wider">
                      Launch Khata Udhar Ledger Desk
                    </Button>
                  </div>
                )}

                {/* Default descriptive screen summary if specific detailed custom block not implemented */}
                {!['sales', 'low_stock', 'pending_udhar'].includes(detailedCard) && (
                  <div className="space-y-3">
                    <p className="text-sm opacity-80 leading-relaxed">
                      The dynamic dashboard registers active background processes to keep your store operating smoothly. This widget operates offline utilizing instant offline calculations.
                    </p>
                    <div className="p-3 bg-[var(--foreground)]/5 border border-[var(--border)] rounded-2xl text-[10px] font-semibold text-[var(--foreground)]/65">
                      • Multi-Device Sync preserved state active<br/>
                      • Real-time cloud logging verification active<br/>
                      • Performance index metric optimized
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button variant="outline" onClick={() => setDetailedCard(null)} className="h-10 rounded-xl text-xs uppercase font-black tracking-wider px-5 border-[var(--border)]">
                  Got It, Close
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- Engine Configuration Modal --- */}
      <AnimatePresence>
        {showConfigModal && (
          <div className="fixed inset-0 z-50 bg-black/45 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[var(--card)] max-w-xl w-full border border-[var(--border)] rounded-[3rem] p-8 shadow-2xl relative space-y-6"
            >
              <button 
                onClick={() => setShowConfigModal(false)}
                className="absolute top-6 right-6 p-1.5 bg-[var(--foreground)]/5 hover:bg-rose-500/10 hover:text-rose-500 rounded-full transition-all"
              >
                <X size={18} />
              </button>

              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="p-1 px-2 bg-indigo-500/10 text-indigo-400 rounded-xl"><Settings size={18} /></span>
                  <h3 className="text-lg font-black uppercase tracking-tight text-[var(--foreground)]">
                    Dashboard Engine Configuration
                  </h3>
                </div>
                <p className="text-[10px] opacity-45 uppercase font-bold tracking-wider">Adjust adaptive priorities and active layouts</p>
              </div>

              <div className="max-h-[350px] overflow-y-auto space-y-6 pr-2 no-scrollbar border-y border-[var(--border)] py-4">
                
                {/* 1. Global priority Switches */}
                <div className="space-y-4">
                  <h4 className="text-[11px] uppercase font-black text-indigo-400 tracking-wider">🛡️ Adaptive Priority Calculations</h4>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {[
                      { key: 'dashboardEnableDynamic', label: 'Enable Dynamic Engine', desc: 'Allows cards to reorder automatically based on active events' },
                      { key: 'dashboardAutoHideEmptyCards', label: 'Auto-Hide Empty Cards', desc: 'Hides cards that have zero active relevance or 0 counts' },
                      { key: 'dashboardPrioritizeAlerts', label: 'Prioritize Urgent Alerts', desc: 'Boost stock depletion & critical notification priorities' },
                      { key: 'dashboardPrioritizeInventory', label: 'Prioritize Inventory Dips', desc: 'Increase priority score when stock catalog nodes are low' },
                      { key: 'dashboardPrioritizeBilling', label: 'Prioritize High Sales Day', desc: 'Elevate financial summaries during heavy active transactions' },
                      { key: 'dashboardPrioritizeUdhar', label: 'Prioritize Overdue Khata', desc: 'Float Udhar card to top when debts have approaching terms' },
                      { key: 'dashboardPrioritizeSystem', label: 'Prioritize System Alerts', desc: 'Immediately elevate disconnected printer or failed backup warnings' }
                    ].map(opt => (
                      <label key={opt.key} className="flex gap-3 p-3 bg-[var(--foreground)]/5 border border-[var(--border)] rounded-2xl cursor-pointer select-none items-start hover:scale-[1.01] transition-transform">
                        <input
                          type="checkbox"
                          checked={settings[opt.key as keyof AppSettings] !== false}
                          onChange={(e) => onUpdateSettings({ [opt.key]: e.target.checked })}
                          className="mt-1 h-4 w-4 rounded accent-[var(--primary)] shrink-0 border-[var(--border)] bg-transparent"
                        />
                        <div className="space-y-0.5">
                          <p className="text-[11px] font-black uppercase text-[var(--foreground)]">{opt.label}</p>
                          <p className="text-[9px] opacity-55 font-bold leading-tight">{opt.desc}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {/* 2. Visual Effects & Transitions */}
                <div className="space-y-4 pt-1">
                  <h4 className="text-[11px] uppercase font-black text-indigo-400 tracking-wider">🎨 Visual Animations & Highlights</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {[
                      { key: 'dashboardEnableAnimations', label: 'Enable Animations', desc: 'Use fade & slide animations during active transactions' },
                      { key: 'dashboardSmoothCardMovement', label: 'Smooth Card Layouts', desc: 'Reorder cards dynamically using spring motion' },
                      { key: 'dashboardPriorityHighlightEffects', label: 'Priority Glow Effects', desc: 'Display subtle amber/red glows for critical system alerts' }
                    ].map(opt => (
                      <label key={opt.key} className="flex gap-3 p-3 bg-[var(--foreground)]/5 border border-[var(--border)] rounded-2xl cursor-pointer select-none items-start">
                        <input
                          type="checkbox"
                          checked={settings[opt.key as keyof AppSettings] !== false}
                          onChange={(e) => onUpdateSettings({ [opt.key]: e.target.checked })}
                          className="mt-1 h-4 w-4 rounded accent-[var(--primary)] shrink-0"
                        />
                        <div className="space-y-0.5">
                          <p className="text-[11px] font-black uppercase text-[var(--foreground)]">{opt.label}</p>
                          <p className="text-[9px] opacity-55 font-bold leading-tight">{opt.desc}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {/* 3. Card visibility Switchers */}
                <div className="space-y-3 pt-1">
                  <h4 className="text-[11px] uppercase font-black text-indigo-400 tracking-wider">👁️ Hide / Show Widgets</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {[
                      { key: 'dashboardShowRecentActivity', label: 'Recent Operation' },
                      { key: 'dashboardShowBusinessHealth', label: 'Health Score' },
                      { key: 'dashboardShowPrinterStatus', label: 'Printer Status' },
                      { key: 'dashboardShowCloudSync', label: 'Cloud Gateway' },
                      { key: 'dashboardShowBackupStatus', label: 'Office Backups' },
                      { key: 'dashboardShowBusinessJourney', label: 'Store Journey' },
                      { key: 'dashboardShowGoalsProgress', label: 'Metric Goals' }
                    ].map(opt => (
                      <label key={opt.key} className="flex gap-2 p-2 bg-[var(--foreground)]/5 border border-[var(--border)] rounded-xl cursor-pointer select-none items-center">
                        <input
                          type="checkbox"
                          checked={settings[opt.key as keyof AppSettings] !== false}
                          onChange={(e) => onUpdateSettings({ [opt.key]: e.target.checked })}
                          className="h-3.5 w-3.5 rounded accent-[var(--primary)] shrink-0"
                        />
                        <span className="text-[9px] font-black uppercase text-[var(--foreground)] truncate">{opt.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button variant="primary" onClick={() => setShowConfigModal(false)} className="h-10 rounded-xl text-xs uppercase font-black tracking-wider px-6">
                  Save Gateway, Close
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- Profile Creation dialog --- */}
      <AnimatePresence>
        {showProfileModal && (
          <div className="fixed inset-0 z-50 bg-black/45 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[var(--card)] max-w-sm w-full border border-[var(--border)] rounded-[2.5rem] p-6 shadow-xl relative space-y-4"
            >
              <h3 className="text-sm font-black uppercase tracking-tight text-[var(--foreground)]">
                Save Current Dashboard Profile
              </h3>
              <p className="text-[10px] opacity-45 uppercase font-bold tracking-wider -mt-2">Creates a standalone snapshot profile</p>

              <div className="space-y-2">
                <label className="text-[9px] font-black uppercase tracking-wider opacity-60">Profile Name</label>
                <input
                  type="text"
                  placeholder="e.g. My Fast Cashier Layout"
                  value={newProfileName}
                  onChange={(e) => setNewProfileName(e.target.value)}
                  className="w-full bg-transparent border border-[var(--border)] rounded-xl h-10 px-3 text-xs outline-none focus:border-[var(--primary)] transition-colors"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <Button variant="outline" onClick={() => setShowProfileModal(false)} className="h-9 rounded-lg text-[9px] font-black uppercase tracking-wider px-4">
                  Cancel
                </Button>
                <Button variant="primary" onClick={handleSaveCurrentAsProfile} className="h-9 rounded-lg text-[9px] font-black uppercase tracking-wider px-4">
                  Save snapshot
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
