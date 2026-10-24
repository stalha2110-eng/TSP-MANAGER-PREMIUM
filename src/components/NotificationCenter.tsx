import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Search, 
  Trash2, 
  Check, 
  CheckCheck, 
  AlertCircle, 
  Package, 
  MessageSquare, 
  Sparkles, 
  Filter,
  TrendingUp,
  Bell,
  BellRing,
  Send,
  ArrowLeft,
  ArrowRight,
  Clock,
  ChevronDown,
  ShieldCheck,
  Share2
} from 'lucide-react';
import { InAppNotification, AppState, Item } from '../types';
import { NotificationService } from '../services/notificationService';
import { cn } from '../lib/utils';
import { useBackModal } from '../utils/backNavigationManager';

interface NotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: InAppNotification[];
  activeAlerts: any[];
  state: AppState;
  setActiveTab: (tab: 'home' | 'billing' | 'analytics' | 'udhar') => void;
  setEditingItem: (item: Item | null) => void;
  setSelectedUdharCustomerId: (id: string | null) => void;
  handleDismissNotification: (id: string) => void;
  t: any;
  onMarkAllRead?: (alertIds: string[]) => void;
}

// Format friendly relative time (e.g., 'Just now', '5m ago', '2h ago', 'Yesterday')
function formatRelativeTime(dateStr: string): string {
  try {
    const now = Date.now();
    const date = new Date(dateStr).getTime();
    if (isNaN(date)) return '';
    const diffSec = Math.floor((now - date) / 1000);

    if (diffSec < 45) return 'Just now';
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
    if (diffSec < 172800) return 'Yesterday';
    return new Date(dateStr).toLocaleDateString([], { month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
}

export default function NotificationCenter({
  isOpen,
  onClose,
  notifications,
  activeAlerts,
  state,
  setActiveTab,
  setEditingItem,
  setSelectedUdharCustomerId,
  handleDismissNotification,
  t,
  onMarkAllRead
}: NotificationCenterProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'inventory' | 'udhar' | 'analytics' | 'system'>('all');
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [showConfirmMarkAll, setShowConfirmMarkAll] = useState(false);
  const [showConfirmDeleteAll, setShowConfirmDeleteAll] = useState(false);
  const [localDeletedIds, setLocalDeletedIds] = useState<string[]>([]);
  const [swipedNotificationId, setSwipedNotificationId] = useState<string | null>(null);
  
  // Custom Admin Notification Broadcast sandbox
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [adminTitle, setAdminTitle] = useState('');
  const [adminMsg, setAdminMsg] = useState('');
  const [adminPriority, setAdminPriority] = useState<'high' | 'medium' | 'low'>('medium');

  useBackModal(isOpen, onClose, 'notification_center');
  useBackModal(showConfirmMarkAll, () => setShowConfirmMarkAll(false), 'notif_confirm_mark_all');
  useBackModal(showConfirmDeleteAll, () => setShowConfirmDeleteAll(false), 'notif_confirm_delete_all');
  useBackModal(showAdminPanel, () => setShowAdminPanel(false), 'notif_admin_panel');

  // Trigger tactile mobile haptic feedback
  const triggerHaptic = useCallback((duration: number = 8) => {
    if (typeof window !== 'undefined' && window.navigator && window.navigator.vibrate) {
      try { window.navigator.vibrate(duration); } catch {}
    }
  }, []);

  // Unified notifications list
  const unifiedList = useMemo(() => {
    const list: any[] = [];

    // Prepend dynamic alerts
    activeAlerts.forEach(alert => {
      list.push({
        id: alert.id,
        title: alert.title,
        message: alert.desc,
        timestamp: alert.time || new Date().toISOString(),
        category: alert.type === 'stock' ? 'inventory' : alert.type.startsWith('udhar') ? 'udhar' : 'system',
        priority: 'high',
        isRead: false,
        isDynamicAlert: true,
        alertType: alert.type,
        customerId: alert.customerId,
        customerPhone: alert.customerPhone,
        customerName: alert.customerName,
        txAmount: alert.txAmount,
        txDateStr: alert.txDateStr,
        diffDays: alert.diffDays,
        originalAlert: alert
      });
    });

    // Append cloud real-time notifications
    notifications.forEach(notif => {
      if (!list.some(l => l.id === notif.id)) {
        list.push({
          ...notif,
          isDynamicAlert: false
        });
      }
    });

    // Chronological order - latest first
    return list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [notifications, activeAlerts]);

  // Category counts
  const categoryCounts = useMemo(() => {
    const counts = { all: 0, inventory: 0, udhar: 0, analytics: 0, system: 0 };
    unifiedList.forEach(item => {
      if (localDeletedIds.includes(item.id)) return;
      counts.all++;
      if (item.category === 'inventory') counts.inventory++;
      else if (item.category === 'udhar') counts.udhar++;
      else if (item.category === 'analytics') counts.analytics++;
      else counts.system++;
    });
    return counts;
  }, [unifiedList, localDeletedIds]);

  // Unread count
  const unreadCount = useMemo(() => {
    return unifiedList.filter(item => !localDeletedIds.includes(item.id) && !item.isRead).length;
  }, [unifiedList, localDeletedIds]);

  // Filter unified list
  const filteredList = useMemo(() => {
    return unifiedList.filter(item => {
      if (localDeletedIds.includes(item.id)) return false;
      if (selectedCategory !== 'all' && item.category !== selectedCategory) return false;
      if (unreadOnly && item.isRead) return false;

      if (searchQuery.trim() !== '') {
        const query = searchQuery.toLowerCase();
        const matchesTitle = item.title?.toLowerCase().includes(query);
        const matchesMsg = item.message?.toLowerCase().includes(query);
        return matchesTitle || matchesMsg;
      }

      return true;
    });
  }, [unifiedList, selectedCategory, unreadOnly, searchQuery, localDeletedIds]);

  // Handle click on notification card (Deep-linking)
  const handleCardClick = (item: any) => {
    triggerHaptic(12);
    if (item.isDynamicAlert) {
      if (item.alertType === 'udhar' || item.alertType === 'udhar-30days') {
        setActiveTab('udhar');
        if (item.customerId) {
          setSelectedUdharCustomerId(item.customerId);
        }
        onClose();
      } else if (item.alertType === 'stock') {
        const itemId = item.id.replace('low-stock-', '');
        const linkedItem = state.items.find(i => i.id === itemId);
        if (linkedItem) {
          setActiveTab('home');
          setEditingItem(linkedItem);
          onClose();
        }
      } else {
        setActiveTab('home');
        onClose();
      }
    } else {
      NotificationService.markAsRead(state.user?.uid || null, item.id);
      if (item.deepLink?.screen) {
        setActiveTab(item.deepLink.screen);
        onClose();
      }
    }
  };

  const executeConfirmMarkAll = () => {
    triggerHaptic(15);
    NotificationService.markAllAsRead(
      state.user?.uid || null, 
      notifications.filter(n => !n.isRead)
    );
    if (onMarkAllRead) {
      const alertIds = activeAlerts.map(a => a.id);
      onMarkAllRead(alertIds);
    }
    setShowConfirmMarkAll(false);
  };

  const handleDeleteNotification = (id: string, isDynamicAlert: boolean) => {
    triggerHaptic(10);
    setLocalDeletedIds(prev => [...prev, id]);
    if (isDynamicAlert) {
      handleDismissNotification(id);
    } else {
      NotificationService.deleteNotification(state.user?.uid || null, id);
    }
  };

  const executeConfirmDeleteAll = () => {
    triggerHaptic(20);
    const allIds = unifiedList.map(n => n.id);
    setLocalDeletedIds(prev => Array.from(new Set([...prev, ...allIds])));

    activeAlerts.forEach(a => {
      handleDismissNotification(a.id);
    });

    notifications.forEach(n => {
      NotificationService.deleteNotification(state.user?.uid || null, n.id);
    });

    if (onMarkAllRead) {
      const alertIds = activeAlerts.map(a => a.id);
      onMarkAllRead(alertIds);
    }

    setShowConfirmDeleteAll(false);
  };

  const handleSendBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminTitle.trim() || !adminMsg.trim()) return;
    try {
      await NotificationService.broadcastToAllDevices(
        state.user?.uid || null,
        adminTitle,
        adminMsg,
        adminPriority,
        'broadcast'
      );
      setAdminTitle('');
      setAdminMsg('');
      setShowAdminPanel(false);
      onClose();
      triggerHaptic(15);
    } catch (e) {
      console.error(e);
    }
  };

  const handleQuickTestAlert = () => {
    NotificationService.triggerNotification(state.user?.uid || null, {
      title: 'Low Stock: Parle-G Gold (₹10)',
      message: 'Only 2 packets left • Tap to inspect or restock',
      category: 'inventory',
      priority: 'high',
      timestamp: 'Just now',
      deepLink: { screen: 'inventory' }
    });
    onClose();
    triggerHaptic(15);
  };

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-[120] flex justify-end overflow-hidden">
            
            {/* Luminous Blur Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={onClose}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm hidden sm:block"
            />

            {/* Dedicated Full Page / Right-Slide Screen (Zero upper gap, seamless full height) */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 340 }}
              className="relative z-10 w-full sm:max-w-xl bg-[var(--background)] text-[var(--foreground)] sm:border-l border-[var(--border)] shadow-2xl flex flex-col h-full min-h-[100dvh] max-h-[100dvh] overflow-hidden"
              style={{
                paddingTop: 'max(env(safe-area-inset-top), 0px)',
                paddingBottom: 'max(env(safe-area-inset-bottom), 0px)',
              }}
            >
              {/* 1. APP HEADER: Back Navigation, Title, Unread Beacon, Actions */}
              <div className="px-3.5 py-3 sm:px-5 sm:py-3.5 border-b border-[var(--border)] bg-[var(--card)]/95 backdrop-blur-xl flex items-center justify-between gap-2 shrink-0">
                <div className="flex items-center gap-2 min-w-0">
                  {/* Left Back Arrow Navigation Button */}
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic(6);
                      onClose();
                    }}
                    title="Back to store"
                    className="h-9 w-9 rounded-xl bg-[var(--foreground)]/[0.05] hover:bg-[var(--foreground)]/10 text-[var(--foreground)]/80 hover:text-[var(--foreground)] flex items-center justify-center active:scale-95 transition-all cursor-pointer shrink-0"
                  >
                    <ArrowLeft size={19} />
                  </button>

                  <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center shrink-0 shadow-xs">
                    {unreadCount > 0 ? (
                      <motion.div
                        animate={{ rotate: [0, -10, 10, -10, 10, 0] }}
                        transition={{ repeat: Infinity, duration: 2.2, repeatDelay: 2 }}
                      >
                        <BellRing size={18} className="text-amber-500 animate-pulse" />
                      </motion.div>
                    ) : (
                      <Bell size={18} />
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm sm:text-base font-black uppercase tracking-tight truncate">
                        NOTIFICATIONS
                      </h3>
                      {unreadCount > 0 && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/15 border border-red-500/30 text-red-500 text-[9px] font-black font-mono">
                          <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
                          {unreadCount} NEW
                        </span>
                      )}
                    </div>
                    <p className="text-[9px] font-mono uppercase tracking-wider text-[var(--foreground)]/50">
                      Live Business Feed
                    </p>
                  </div>
                </div>

                {/* Top Action Buttons (Thumb targets >= 44px) */}
                <div className="flex items-center gap-1.5 shrink-0">
                  {unreadCount > 0 && (
                    <button
                      type="button"
                      onClick={() => setShowConfirmMarkAll(true)}
                      title="Mark All Read"
                      className="h-9 px-2.5 sm:px-3 rounded-xl bg-[var(--foreground)]/[0.05] hover:bg-[var(--foreground)]/10 text-[var(--foreground)] font-bold text-[10.5px] uppercase tracking-wider flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer"
                    >
                      <CheckCheck size={14} className="text-emerald-500" />
                      <span className="hidden sm:inline">Read All</span>
                    </button>
                  )}

                  {filteredList.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setShowConfirmDeleteAll(true)}
                      title="Clear All Notifications"
                      className="h-9 w-9 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 flex items-center justify-center active:scale-95 transition-all cursor-pointer"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}

                  {state.user && (
                    <button
                      type="button"
                      onClick={() => setShowAdminPanel(!showAdminPanel)}
                      title="Broadcast Message"
                      className="h-9 w-9 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-500 flex items-center justify-center active:scale-95 transition-all cursor-pointer"
                    >
                      <Send size={14} />
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic(6);
                      onClose();
                    }}
                    title="Close notifications"
                    className="h-9 w-9 rounded-xl bg-[var(--foreground)]/[0.05] hover:bg-[var(--foreground)]/10 text-[var(--foreground)]/70 hover:text-[var(--foreground)] flex items-center justify-center active:scale-95 transition-all cursor-pointer"
                  >
                    <X size={17} />
                  </button>
                </div>
              </div>

              {/* Admin Broadcast Tool Overlay */}
              <AnimatePresence>
                {showAdminPanel && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="bg-blue-500/5 border-b border-blue-500/20 px-5 py-4 space-y-3 overflow-hidden shrink-0"
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest flex items-center gap-1.5">
                        <Sparkles size={12} />
                        Global Announcement Broadcast
                      </p>
                      <span className="text-[8px] font-mono bg-blue-500/20 text-blue-600 dark:text-blue-300 px-1.5 py-0.5 rounded uppercase">All Synced Phones</span>
                    </div>

                    <form onSubmit={handleSendBroadcast} className="space-y-2.5">
                      <input 
                        type="text"
                        placeholder="Title | शीर्षक"
                        value={adminTitle}
                        onChange={e => setAdminTitle(e.target.value)}
                        className="w-full bg-[var(--background)] border border-[var(--border)] rounded-xl py-2 px-3 text-xs text-[var(--foreground)] placeholder-[var(--foreground)]/40 focus:outline-none focus:border-blue-500"
                        required
                      />
                      <textarea 
                        placeholder="Message details..."
                        value={adminMsg}
                        onChange={e => setAdminMsg(e.target.value)}
                        rows={2}
                        className="w-full bg-[var(--background)] border border-[var(--border)] rounded-xl py-2 px-3 text-xs text-[var(--foreground)] placeholder-[var(--foreground)]/40 focus:outline-none focus:border-blue-500"
                        required
                      />

                      <div className="flex items-center justify-between gap-3 flex-wrap">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[9px] opacity-40 uppercase font-bold">Priority:</span>
                          <div className="flex gap-1">
                            {(['high', 'medium', 'low'] as const).map(p => (
                              <button
                                key={p}
                                type="button"
                                onClick={() => setAdminPriority(p)}
                                className={cn(
                                  "text-[8.5px] px-2.5 py-1 rounded-lg font-black uppercase tracking-wider select-none transition-all",
                                  adminPriority === p
                                    ? p === 'high' 
                                      ? "bg-rose-500 text-white shadow-xs"
                                      : p === 'medium'
                                        ? "bg-amber-500 text-white shadow-xs"
                                        : "bg-slate-500 text-white shadow-xs"
                                    : "bg-[var(--foreground)]/5 text-[var(--foreground)]/50 hover:bg-[var(--foreground)]/10"
                                )}
                              >
                                {p}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={handleQuickTestAlert}
                            className="py-1.5 px-3 rounded-xl bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 text-[9.5px] font-black uppercase tracking-wider hover:bg-amber-500/25 active:scale-95 transition-all cursor-pointer flex items-center gap-1"
                          >
                            <Bell size={11} /> Test Popup Alert
                          </button>
                          <button
                            type="submit"
                            className="py-1.5 px-4 rounded-xl bg-blue-600 text-white text-[9.5px] font-black uppercase tracking-wider hover:bg-blue-700 active:scale-95 transition-all cursor-pointer shadow-md"
                          >
                            Dispatch
                          </button>
                        </div>
                      </div>
                    </form>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* 2. SEARCH & INTERACTIVE CHANNEL SEGMENTED GLIDER */}
              <div className="p-4 sm:p-5 border-b border-[var(--border)] space-y-3 shrink-0 bg-[var(--card)]">
                {/* Search Input Bar */}
                <div className="relative">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--foreground)]/40" size={15} />
                  <input 
                    type="text" 
                    placeholder="Search notifications or customers..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full bg-[var(--background)] border border-[var(--border)] rounded-2xl py-2.5 pl-10 pr-9 text-xs font-semibold text-[var(--foreground)] focus:outline-none focus:border-[var(--primary)] placeholder-[var(--foreground)]/40 transition-colors"
                  />
                  {searchQuery && (
                    <button 
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 rounded-full bg-[var(--foreground)]/10 text-[var(--foreground)]/60 hover:text-[var(--foreground)] flex items-center justify-center cursor-pointer"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>

                {/* Animated Channel Tabs with Framer Motion Glider */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-1 w-full">
                    {([
                      { id: 'all', label: 'All', count: categoryCounts.all },
                      { id: 'inventory', label: 'Stock', count: categoryCounts.inventory },
                      { id: 'udhar', label: 'Credit', count: categoryCounts.udhar },
                      { id: 'analytics', label: 'Sales', count: categoryCounts.analytics },
                      { id: 'system', label: 'System', count: categoryCounts.system }
                    ] as const).map(cat => {
                      const isSelected = selectedCategory === cat.id;
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => {
                            triggerHaptic(6);
                            setSelectedCategory(cat.id);
                          }}
                          className={`relative px-3 sm:px-3.5 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all duration-200 cursor-pointer select-none whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                            isSelected 
                              ? 'text-white' 
                              : 'text-[var(--foreground)]/60 hover:text-[var(--foreground)] bg-[var(--foreground)]/[0.04]'
                          }`}
                        >
                          {/* Sliding spring pill glider */}
                          {isSelected && (
                            <motion.div
                              layoutId="activeNotifFilterPill"
                              className="absolute inset-0 bg-[var(--primary)] rounded-xl shadow-sm z-0"
                              transition={{ type: "spring", stiffness: 450, damping: 32 }}
                            />
                          )}
                          <span className="relative z-10">{cat.label}</span>
                          <span className={`relative z-10 text-[9px] font-mono px-1.5 py-0.2 rounded-full ${
                            isSelected 
                              ? 'bg-white/25 text-white' 
                              : 'bg-[var(--foreground)]/10 text-[var(--foreground)]/70'
                          }`}>
                            {cat.count}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Unread Only Toggle */}
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic(6);
                      setUnreadOnly(!unreadOnly);
                    }}
                    className={`shrink-0 px-2.5 py-1.5 rounded-xl border text-[9.5px] font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1 select-none ${
                      unreadOnly
                        ? 'bg-amber-500/15 border-amber-500/30 text-amber-500'
                        : 'bg-[var(--foreground)]/[0.03] border-[var(--border)] text-[var(--foreground)]/50 hover:text-[var(--foreground)]'
                    }`}
                  >
                    <span className={`h-1.5 w-1.5 rounded-full ${unreadOnly ? 'bg-amber-500 animate-pulse' : 'bg-stone-400'}`} />
                    <span>Unread</span>
                  </button>
                </div>
              </div>

              {/* 3. NOTIFICATIONS FEED (Scrollable, animated, swipe-to-delete) */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-2.5 bg-[var(--background)]">
                {filteredList.length === 0 ? (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="py-20 text-center space-y-4 flex flex-col items-center justify-center"
                  >
                    <div className="relative">
                      <div className="h-16 w-16 bg-[var(--foreground)]/[0.03] border border-[var(--border)] rounded-3xl flex items-center justify-center">
                        <Bell className="text-[var(--foreground)]/30 animate-pulse" size={26} />
                      </div>
                      <div className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-emerald-500/20 text-emerald-500 border border-emerald-500/30 flex items-center justify-center">
                        <Check size={12} className="stroke-[3]" />
                      </div>
                    </div>
                    <div className="space-y-1 max-w-xs">
                      <h4 className="text-xs font-black uppercase tracking-wider text-[var(--foreground)]">
                        All Caught Up!
                      </h4>
                      <p className="text-[10px] text-[var(--foreground)]/50 leading-relaxed font-semibold uppercase">
                        No pending alerts or notifications under {selectedCategory.toUpperCase()} filter.
                      </p>
                    </div>
                  </motion.div>
                ) : (
                  <AnimatePresence mode="popLayout">
                    {filteredList.map((notif, idx) => {
                      const isHigh = notif.priority === 'high';
                      const isSwiped = swipedNotificationId === notif.id;
                      const relTime = formatRelativeTime(notif.timestamp);

                      // Category Aura & Color mapping
                      const catStyle = {
                        inventory: {
                          bg: 'bg-amber-500/10 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/20',
                          icon: <Package size={15} />
                        },
                        udhar: {
                          bg: 'bg-rose-500/10 dark:bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/20',
                          icon: <MessageSquare size={15} />
                        },
                        analytics: {
                          bg: 'bg-emerald-500/10 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
                          icon: <TrendingUp size={15} />
                        },
                        system: {
                          bg: 'bg-blue-500/10 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/20',
                          icon: <AlertCircle size={15} />
                        }
                      }[notif.category as 'inventory' | 'udhar' | 'analytics' | 'system'] || {
                        bg: 'bg-[var(--primary)]/10 text-[var(--primary)] border-[var(--primary)]/20',
                        icon: <Bell size={15} />
                      };

                      return (
                        <motion.div
                          layout
                          key={`${notif.category || 'cat'}-${notif.isDynamicAlert ? 'dyn' : 'cloud'}-${notif.id || idx}`}
                          initial={{ opacity: 0, y: 12 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, x: -100, transition: { duration: 0.2 } }}
                          transition={{ type: "spring", stiffness: 400, damping: 30 }}
                          className="group relative overflow-hidden rounded-2xl"
                        >
                          {/* Swipe-to-delete Action Reveal (Behind the card) */}
                          <div className="absolute inset-0 bg-rose-500/15 rounded-2xl border border-rose-500/20 flex items-center justify-end overflow-hidden">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteNotification(notif.id, notif.isDynamicAlert);
                              }}
                              className="h-full w-20 bg-rose-500 hover:bg-rose-600 text-white flex flex-col items-center justify-center gap-1 cursor-pointer active:scale-95 transition-all shadow-md"
                              title="Delete notification"
                            >
                              <Trash2 size={16} />
                              <span className="text-[8.5px] font-black uppercase tracking-wider">Delete</span>
                            </button>
                          </div>

                          {/* Interactive Card Surface */}
                          <motion.div
                            drag="x"
                            dragConstraints={{ left: -80, right: 0 }}
                            dragElastic={0.12}
                            animate={{ x: isSwiped ? -80 : 0 }}
                            transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                            onDragEnd={(event, info) => {
                              if (info.offset.x < -35) {
                                setSwipedNotificationId(notif.id);
                                triggerHaptic(8);
                              } else if (info.offset.x > 25) {
                                setSwipedNotificationId(null);
                              }
                            }}
                            onClick={(e) => {
                              if (isSwiped) {
                                e.stopPropagation();
                                setSwipedNotificationId(null);
                              } else {
                                handleCardClick(notif);
                              }
                            }}
                            className={cn(
                              "relative z-10 p-3.5 sm:p-4 rounded-2xl border bg-[var(--card)] hover:border-[var(--primary)]/40 transition-all select-none flex items-start gap-3 cursor-pointer active:scale-[0.98]",
                              !notif.isRead 
                                ? "border-[var(--primary)]/25 shadow-sm" 
                                : "border-[var(--border)] opacity-65 hover:opacity-100"
                            )}
                          >
                            {/* Category Icon Badge */}
                            <div className={cn(
                              "h-9 w-9 rounded-xl shrink-0 flex items-center justify-center border mt-0.5 shadow-xs",
                              catStyle.bg
                            )}>
                              {catStyle.icon}
                            </div>

                            {/* Main Body */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2">
                                <h4 className={cn(
                                  "text-xs uppercase tracking-tight truncate",
                                  !notif.isRead ? "font-black text-[var(--foreground)]" : "font-bold text-[var(--foreground)]/70"
                                )}>
                                  {notif.title}
                                </h4>

                                {/* Live Unread Indicator Ping */}
                                {!notif.isRead && (
                                  <span className="shrink-0 h-2 w-2 rounded-full bg-[var(--primary)] shadow-xs animate-pulse" />
                                )}
                              </div>

                              <p className="text-[10.5px] font-medium leading-relaxed mt-1 text-[var(--foreground)]/80">
                                {notif.message}
                              </p>

                              {/* WhatsApp Direct Action for Udhar Accounts */}
                              {notif.alertType === 'udhar-30days' && notif.customerPhone && (
                                <div className="mt-2.5">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      triggerHaptic(10);
                                      const message = `Dear *${notif.customerName}*, reminder regarding pending account balance of *₹${(state.udharCustomers?.find(c => c.id === notif.customerId)?.totalUdhar || notif.txAmount).toLocaleString()}*. Thank you! 🙏`;
                                      const url = `https://wa.me/91${notif.customerPhone}?text=${encodeURIComponent(message)}`;
                                      window.open(url, '_blank');
                                    }}
                                    className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[9px] font-black uppercase tracking-wider inline-flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
                                  >
                                    <MessageSquare size={11} />
                                    <span>Send WhatsApp Reminder</span>
                                  </button>
                                </div>
                              )}

                              {/* Footer Meta Row */}
                              <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-[var(--border)]/60">
                                <span className="text-[8.5px] font-mono text-[var(--foreground)]/50 uppercase font-bold flex items-center gap-1">
                                  <Clock size={10} />
                                  <span>{relTime}</span>
                                </span>

                                <div className="flex items-center gap-2">
                                  {!notif.isRead && !notif.isDynamicAlert && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        triggerHaptic(6);
                                        NotificationService.markAsRead(state.user?.uid || null, notif.id);
                                      }}
                                      className="h-6 w-6 rounded-lg bg-[var(--foreground)]/[0.04] hover:bg-[var(--foreground)]/10 text-[var(--foreground)]/60 hover:text-[var(--foreground)] flex items-center justify-center transition-colors"
                                      title="Mark read"
                                    >
                                      <Check size={11} />
                                    </button>
                                  )}

                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteNotification(notif.id, notif.isDynamicAlert);
                                    }}
                                    className="h-6 w-6 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 flex items-center justify-center transition-colors"
                                    title="Delete notification"
                                  >
                                    <Trash2 size={11} />
                                  </button>
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                )}
              </div>

              {/* 4. FOOTER: Status Bar */}
              <div className="p-3.5 px-5 border-t border-[var(--border)] bg-[var(--card)]/90 backdrop-blur-md flex items-center justify-between gap-3 shrink-0">
                <div className="flex items-center gap-1.5 text-[9.5px] font-mono text-[var(--foreground)]/60 uppercase">
                  <ShieldCheck size={12} className="text-emerald-500" />
                  <span>Realtime Sync Online</span>
                </div>

                <span className="text-[9px] font-mono text-[var(--foreground)]/40 uppercase">
                  {filteredList.length} Items Total
                </span>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Confirmation Bottom Action Sheet: Delete All */}
      <AnimatePresence>
        {showConfirmDeleteAll && (
          <div className="fixed inset-0 z-[140] flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowConfirmDeleteAll(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: '100%', opacity: 0.5 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 28, stiffness: 350 }}
              className="relative w-full sm:max-w-sm bg-[var(--card)] border border-[var(--border)] rounded-t-[2rem] sm:rounded-3xl p-5 sm:p-6 shadow-2xl z-10 space-y-4"
            >
              <div className="flex justify-between items-center pb-2 border-b border-[var(--border)]">
                <h4 className="text-xs font-black uppercase tracking-tight text-rose-500 flex items-center gap-1.5">
                  <Trash2 size={15} />
                  <span>Clear All Notifications?</span>
                </h4>
                <button
                  type="button"
                  onClick={() => setShowConfirmDeleteAll(false)}
                  className="h-7 w-7 rounded-lg bg-[var(--foreground)]/[0.05] text-[var(--foreground)]/60 flex items-center justify-center cursor-pointer"
                >
                  <X size={14} />
                </button>
              </div>

              <p className="text-xs text-[var(--foreground)]/80 leading-relaxed font-medium">
                Are you sure you want to delete all notifications and dismiss active stock alerts from your feed?
              </p>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowConfirmDeleteAll(false)}
                  className="h-11 rounded-xl bg-[var(--foreground)]/[0.05] hover:bg-[var(--foreground)]/10 text-[var(--foreground)] text-[10.5px] font-black uppercase tracking-wider active:scale-95 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={executeConfirmDeleteAll}
                  className="h-11 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-[10.5px] font-black uppercase tracking-wider shadow-md shadow-rose-500/25 active:scale-95 transition-all cursor-pointer"
                >
                  Yes, Delete All
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Confirmation Bottom Action Sheet: Mark All Read */}
      <AnimatePresence>
        {showConfirmMarkAll && (
          <div className="fixed inset-0 z-[140] flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowConfirmMarkAll(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: '100%', opacity: 0.5 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 28, stiffness: 350 }}
              className="relative w-full sm:max-w-sm bg-[var(--card)] border border-[var(--border)] rounded-t-[2rem] sm:rounded-3xl p-5 sm:p-6 shadow-2xl z-10 space-y-4"
            >
              <div className="flex justify-between items-center pb-2 border-b border-[var(--border)]">
                <h4 className="text-xs font-black uppercase tracking-tight text-[var(--foreground)] flex items-center gap-1.5">
                  <CheckCheck size={16} className="text-emerald-500" />
                  <span>Mark All As Read?</span>
                </h4>
                <button
                  type="button"
                  onClick={() => setShowConfirmMarkAll(false)}
                  className="h-7 w-7 rounded-lg bg-[var(--foreground)]/[0.05] text-[var(--foreground)]/60 flex items-center justify-center cursor-pointer"
                >
                  <X size={14} />
                </button>
              </div>

              <p className="text-xs text-[var(--foreground)]/80 leading-relaxed font-medium">
                Mark all unread alerts and inventory triggers as read across your active store dashboard?
              </p>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowConfirmMarkAll(false)}
                  className="h-11 rounded-xl bg-[var(--foreground)]/[0.05] hover:bg-[var(--foreground)]/10 text-[var(--foreground)] text-[10.5px] font-black uppercase tracking-wider active:scale-95 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={executeConfirmMarkAll}
                  className="h-11 rounded-xl bg-[var(--primary)] hover:bg-[var(--primary)]/90 text-white text-[10.5px] font-black uppercase tracking-wider shadow-md shadow-[var(--primary)]/20 active:scale-95 transition-all cursor-pointer"
                >
                  Yes, Mark Read
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
