import React, { useState, useMemo } from 'react';
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
  Settings,
  Bell,
  Volume2,
  VolumeX,
  Smartphone,
  Send
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
  
  // Custom Admin Notification Broadcast sandbox helpers
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [adminTitle, setAdminTitle] = useState('');
  const [adminMsg, setAdminMsg] = useState('');
  const [adminPriority, setAdminPriority] = useState<'high' | 'medium' | 'low'>('medium');

  useBackModal(isOpen, onClose, 'notification_center');
  useBackModal(showConfirmMarkAll, () => setShowConfirmMarkAll(false), 'notif_confirm_mark_all');
  useBackModal(showConfirmDeleteAll, () => setShowConfirmDeleteAll(false), 'notif_confirm_delete_all');
  useBackModal(showAdminPanel, () => setShowAdminPanel(false), 'notif_admin_panel');

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
      // Prevent duplicating if already matched by alert ID
      if (!list.some(l => l.id === notif.id)) {
        list.push({
          ...notif,
          isDynamicAlert: false
        });
      }
    });

    // Sort by chronological order - latest first
    return list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [notifications, activeAlerts]);

  // Filter unified list
  const filteredList = useMemo(() => {
    return unifiedList.filter(item => {
      // Exclude locally deleted items
      if (localDeletedIds.includes(item.id)) return false;

      // Category filter
      if (selectedCategory !== 'all' && item.category !== selectedCategory) return false;
      
      // Unread only filter
      if (unreadOnly && item.isRead) return false;

      // Search query filter
      if (searchQuery.trim() !== '') {
        const query = searchQuery.toLowerCase();
        const matchesTitle = item.title?.toLowerCase().includes(query);
        const matchesMsg = item.message?.toLowerCase().includes(query);
        return matchesTitle || matchesMsg;
      }

      return true;
    });
  }, [unifiedList, selectedCategory, unreadOnly, searchQuery]);

  // Handle click on notifications card (Deep-linking)
  const handleCardClick = (item: any) => {
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
      } else if (item.alertType === 'note') {
        // Find associated items or show help
        setActiveTab('home');
        onClose();
      }
    } else {
      // Mark as read in Firestore
      NotificationService.markAsRead(state.user?.uid || null, item.id);
      
      // Deep linking via link configuration
      if (item.deepLink?.screen) {
        setActiveTab(item.deepLink.screen);
        onClose();
      }
    }
  };

  const handleMarkAllRead = () => {
    setShowConfirmMarkAll(true);
  };

  const executeConfirmMarkAll = () => {
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
    setLocalDeletedIds(prev => [...prev, id]);
    if (isDynamicAlert) {
      handleDismissNotification(id);
    } else {
      NotificationService.deleteNotification(state.user?.uid || null, id);
    }
  };

  const handleDeleteAllNotifications = () => {
    setShowConfirmDeleteAll(true);
  };

  const executeConfirmDeleteAll = () => {
    const allIds = unifiedList.map(n => n.id);
    setLocalDeletedIds(prev => Array.from(new Set([...prev, ...allIds])));

    // Dismiss active dynamic alerts
    activeAlerts.forEach(a => {
      handleDismissNotification(a.id);
    });

    // Delete cloud & offline notifications
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
      alert('Broadcast dispatched successfully to and synced on all live user devices!');
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <>
      <AnimatePresence>
      {isOpen && (
        <>
          {/* Blur Backdrop */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm"
          />

          {/* Side Drawer Container */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 220 }}
            className="fixed top-0 right-0 bottom-0 z-[110] w-full max-w-md bg-[var(--card)] border-l border-[var(--border)] shadow-2xl flex flex-col text-[var(--foreground)] h-full overflow-hidden"
          >
            {/* Drawer Header */}
            <div className="p-6 border-b border-[var(--border)] bg-gradient-to-r from-[var(--primary)]/5 to-transparent flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center">
                  <Bell className="animate-spin-slow" size={20} />
                </div>
                <div>
                  <h3 className="text-base font-black uppercase tracking-tight leading-tight">Sync Alerts Center</h3>
                  <p className="text-[9px] font-black uppercase tracking-widest text-[var(--primary)] opacity-60">TS Price Manager Feed</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {filteredList.length > 0 && (
                  <button 
                    onClick={handleDeleteAllNotifications}
                    title="Delete All Notifications"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-extrabold text-xs transition-all active:scale-95 shadow-sm shadow-rose-500/25 cursor-pointer"
                  >
                    <Trash2 size={13} />
                    <span>Delete All</span>
                  </button>
                )}
                {state.user && (
                  <button 
                    onClick={() => setShowAdminPanel(!showAdminPanel)}
                    title="Toggle Admin Broadcast Tool"
                    className="h-9 w-9 flex items-center justify-center rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 transition-colors border border-blue-500/15"
                  >
                    <Send size={15} />
                  </button>
                )}
                <button 
                  onClick={onClose}
                  className="h-9 w-9 flex items-center justify-center rounded-xl bg-[var(--foreground)]/5 hover:bg-[var(--foreground)]/10 text-[var(--foreground)]/60 hover:text-[var(--foreground)] transition-colors border border-[var(--border)]"
                >
                  <X size={18} />
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
                  className="bg-blue-500/5 border-b border-blue-500/20 px-6 py-5 space-y-4 overflow-hidden shrink-0"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-black text-blue-500 hover:text-blue-600 dark:text-blue-400 uppercase tracking-widest flex items-center gap-1.5">
                      <Sparkles size={12} />
                      Global Announcement Broadcast
                    </p>
                    <span className="text-[8px] font-mono bg-blue-500/20 text-blue-600 dark:text-blue-300 px-1.5 py-0.5 rounded uppercase tracking-wider">Multi-Device Target</span>
                  </div>

                  <form onSubmit={handleSendBroadcast} className="space-y-3">
                    <input 
                      type="text"
                      placeholder="Title | शीर्षक"
                      value={adminTitle}
                      onChange={e => setAdminTitle(e.target.value)}
                      className="w-full bg-[var(--background)] border border-[var(--border)] rounded-xl py-2 px-3 text-xs text-[var(--foreground)] placeholder-[var(--foreground)]/40"
                      required
                    />
                    <textarea 
                      placeholder="Message payload | संदेश विवरण"
                      value={adminMsg}
                      onChange={e => setAdminMsg(e.target.value)}
                      rows={2}
                      className="w-full bg-[var(--background)] border border-[var(--border)] rounded-xl py-2 px-3 text-xs text-[var(--foreground)] placeholder-[var(--foreground)]/40"
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
                                "text-[8px] px-2 py-1 rounded font-black uppercase tracking-wider select-none",
                                adminPriority === p
                                  ? p === 'high' 
                                    ? "bg-rose-500 text-white shadow"
                                    : p === 'medium'
                                      ? "bg-amber-500 text-white shadow"
                                      : "bg-slate-500 text-white shadow"
                                  : "bg-[var(--foreground)]/5 text-[var(--foreground)]/50 hover:bg-[var(--foreground)]/10"
                              )}
                            >
                              {p}
                            </button>
                          ))}
                        </div>
                      </div>

                      <button
                        type="submit"
                        className="py-1.5 px-4 rounded-xl bg-blue-500 text-white text-[9px] font-black uppercase tracking-widest hover:bg-blue-600 active:scale-95 transition-all cursor-pointer shadow-lg"
                      >
                        Send Multi-Device Broadcast
                      </button>
                    </div>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Filter Deck */}
            <div className="p-6 border-b border-[var(--border)] space-y-4 shrink-0 bg-[var(--card)]">
              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--foreground)]/40" size={14} />
                <input 
                  type="text" 
                  placeholder="Search alert messages..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full bg-[var(--background)] border border-[var(--border)] rounded-2xl py-3 pl-10 pr-4 text-xs font-bold leading-none text-[var(--foreground)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)] placeholder-[var(--foreground)]/35"
                />
                {searchQuery && (
                  <button 
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[10px] font-bold uppercase tracking-widest opacity-45 hover:opacity-100 text-[var(--foreground)]"
                  >
                    Clear
                  </button>
                )}
              </div>

              {/* Category Pills & Selectors */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-[var(--foreground)]/50">
                    <Filter size={10} />
                    <span className="text-[9px] font-black uppercase tracking-widest">Filter Channels</span>
                  </div>

                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input 
                      type="checkbox"
                      checked={unreadOnly}
                      onChange={e => setUnreadOnly(e.target.checked)}
                      className="rounded border-[var(--border)] bg-[var(--background)] text-[var(--primary)] focus:ring-0 cursor-pointer h-3.5 w-3.5"
                    />
                    <span className="text-[9px] font-black uppercase tracking-widest text-[var(--foreground)]/60 hover:text-[var(--foreground)] transition-colors">Unread Only</span>
                  </label>
                </div>

                <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
                  {(['all', 'inventory', 'udhar', 'analytics', 'system'] as const).map(cat => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={cn(
                        "text-[9px] font-black uppercase tracking-wider rounded-xl py-2 px-3.5 border transition-all cursor-pointer shrink-0",
                        selectedCategory === cat
                          ? "bg-[var(--primary)] border-[var(--primary)] text-[var(--primary-foreground)] shadow-lg shadow-[var(--primary)]/15"
                          : "bg-[var(--foreground)]/[0.02] border-[var(--border)] text-[var(--foreground)]/60 hover:text-[var(--foreground)] hover:bg-[var(--foreground)]/5 hover:border-[var(--foreground)]/20"
                      )}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Notifications Feed */}
            <div className="flex-1 overflow-y-auto p-6 space-y-3 bg-[var(--background)]">
              <div className="flex items-center justify-between mb-4">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--foreground)]/50">Inbox Feed ({filteredList.length})</p>
                {filteredList.some(n => !n.isRead) && (
                  <button 
                    onClick={handleMarkAllRead}
                    className="text-[9px] font-black uppercase tracking-widest text-[var(--primary)] hover:underline inline-flex items-center gap-1 leading-none cursor-pointer"
                  >
                    <CheckCheck size={12} />
                    <span>Mark all read</span>
                  </button>
                )}
              </div>

              {filteredList.length === 0 ? (
                <div className="py-24 text-center space-y-4">
                  <div className="h-16 w-16 bg-[var(--foreground)]/[0.02] border border-[var(--border)] rounded-[2rem] flex items-center justify-center mx-auto">
                    <Bell className="text-[var(--foreground)]/30" size={24} />
                  </div>
                  <div className="space-y-1">
                    <p className="text-[11px] font-black uppercase tracking-wider text-[var(--foreground)]/70">No matching notifications</p>
                    <p className="text-[9px] text-[var(--foreground)]/45 uppercase tracking-widest leading-relaxed">Everything is smooth. Check settings to verify toggle channels.</p>
                  </div>
                </div>
              ) : (
                <AnimatePresence mode="popLayout">
                  {filteredList.map((notif, idx) => {
                    const isLow = notif.priority === 'low';
                    const isHigh = notif.priority === 'high';
                    const isSwiped = swipedNotificationId === notif.id;
                    
                    return (
                      <motion.div
                        layout
                        key={`${notif.category || 'cat'}-${notif.isDynamicAlert ? 'dyn' : 'cloud'}-${notif.id || 'id'}`}
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -120, transition: { duration: 0.25 } }}
                        className="group relative overflow-hidden rounded-2xl"
                      >
                        {/* Swipe-to-delete Trash Icon in background */}
                        <div className="absolute inset-0 bg-rose-500/15 rounded-2xl border border-rose-500/20 flex items-center justify-end overflow-hidden">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteNotification(notif.id, notif.isDynamicAlert);
                            }}
                            className="h-full w-20 bg-gradient-to-r from-rose-500 to-rose-600 text-white flex flex-col items-center justify-center gap-1 cursor-pointer hover:brightness-110 active:scale-95 transition-all rounded-r-2xl border-l border-rose-600/30 shadow-lg"
                            title="Delete notification permanently"
                          >
                            <Trash2 size={16} className="animate-pulse" />
                            <span className="text-[8px] font-black uppercase tracking-wider">Delete</span>
                          </button>
                        </div>

                        {/* Interactive Card */}
                        <motion.div
                          drag="x"
                          dragConstraints={{ left: -80, right: 0 }}
                          dragElastic={{ left: 0.15, right: 0.1 }}
                          animate={{ x: isSwiped ? -80 : 0 }}
                          transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                          onDragStart={() => {
                            if (swipedNotificationId !== notif.id) {
                              setSwipedNotificationId(null);
                            }
                          }}
                          onDragEnd={(event, info) => {
                            if (info.offset.x < -30) {
                              setSwipedNotificationId(notif.id);
                            } else if (info.offset.x > 30) {
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
                            "relative z-10 p-4 rounded-2xl border bg-[var(--card)] hover:border-[var(--primary)]/30 transition-all select-none flex items-start gap-3 cursor-pointer",
                            !notif.isRead 
                              ? isHigh 
                                ? "border-rose-500/30 hover:shadow-rose-500/5 hover:-translate-y-0.5 shadow-md"
                                : "border-[var(--primary)]/20 hover:shadow-[var(--primary)]/5 hover:-translate-y-0.5 shadow-md"
                              : "border-[var(--border)] opacity-60 hover:opacity-100"
                          )}
                        >
                        {/* Dynamic category / priority colored icon */}
                        <div className={cn(
                          "h-8 w-8 rounded-xl shrink-0 flex items-center justify-center mt-0.5",
                          notif.category === 'inventory'
                            ? "bg-amber-500/10 text-amber-500"
                            : notif.category === 'udhar'
                              ? "bg-rose-500/10 text-rose-500 animate-pulse"
                              : notif.category === 'analytics'
                                ? "bg-emerald-500/10 text-emerald-500"
                                : "bg-[var(--primary)]/10 text-[var(--primary)]"
                        )}>
                          {notif.category === 'inventory' ? (
                            <Package size={14} className={!notif.isRead ? "animate-bounce" : ""} />
                          ) : notif.category === 'udhar' ? (
                            <MessageSquare size={14} className={!notif.isRead ? "animate-pulse" : ""} />
                          ) : notif.category === 'analytics' ? (
                            <TrendingUp size={14} />
                          ) : (
                            <AlertCircle size={14} />
                          )}
                        </div>

                        {/* Text and context details */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1.5">
                            <h4 className={cn(
                              "text-xs uppercase tracking-tight leading-snug truncate",
                              !notif.isRead ? "font-black text-[var(--foreground)]" : "font-semibold text-[var(--foreground)]/70"
                            )}>
                              {notif.title}
                            </h4>
                            
                            {/* Urgent and Unread Badges */}
                            {!notif.isRead && (
                              <span className="shrink-0 h-1.5 w-1.5 rounded-full bg-[var(--primary)] animate-ping" />
                            )}
                          </div>

                          <p className="text-[10px] font-medium leading-relaxed mt-1 uppercase text-[var(--foreground)]/80">
                            {notif.message}
                          </p>

                          {/* Action Items or Whatsapp triggers for Udhar */}
                          {notif.alertType === 'udhar-30days' && notif.customerPhone && (
                            <div className="mt-3 text-right">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const message = `Dear *${notif.customerName}*, this is a professional request regarding your outstanding billing account balances of *₹${(state.udharCustomers?.find(c => c.id === notif.customerId)?.totalUdhar || notif.txAmount).toLocaleString()}* for credit transactions starting on *${notif.txDateStr}* (${notif.diffDays} days ago). We request you to kindly clear this dues or schedule a repayment soon. Thank you! 🙏`;
                                  const url = `https://wa.me/91${notif.customerPhone}?text=${encodeURIComponent(message)}`;
                                  window.open(url, '_blank');
                                }}
                                className="px-2.5 py-1 rounded bg-green-500 hover:bg-green-600 text-white text-[8px] font-black uppercase tracking-wider cursor-pointer inline-flex items-center gap-1.5 whitespace-nowrap shadow-md active:scale-95 transition-all"
                              >
                                <MessageSquare size={10} />
                                <span>Send WhatsApp Reminder</span>
                              </button>
                            </div>
                          )}

                          {/* Footer Info line */}
                          <div className="flex items-center justify-between mt-3 pt-2 border-t border-[var(--foreground)]/[0.06]">
                            <span className="text-[8px] font-mono opacity-40 uppercase tracking-wider font-bold text-[var(--foreground)]">
                              {new Date(notif.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} &bull; {new Date(notif.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                            </span>

                            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              {!notif.isRead && !notif.isDynamicAlert && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    NotificationService.markAsRead(state.user?.uid || null, notif.id);
                                  }}
                                  className="h-5 w-5 rounded bg-[var(--foreground)]/5 border border-[var(--foreground)]/10 hover:bg-[var(--foreground)]/10 hover:border-[var(--foreground)]/20 flex items-center justify-center text-[var(--foreground)]/60 hover:text-[var(--foreground)]"
                                  title="Mark as Read"
                                >
                                  <Check size={10} />
                                </button>
                              )}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteNotification(notif.id, notif.isDynamicAlert);
                                }}
                                className="h-5 w-5 rounded bg-rose-500/10 border border-rose-500/10 hover:bg-rose-500/20 hover:border-rose-500/20 flex items-center justify-center text-rose-500/60 hover:text-rose-500"
                                title="Delete Alert"
                              >
                                <Trash2 size={10} />
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
            
            {/* Drawer Footer */}
            <div className="p-4 px-6 border-t border-[var(--border)] bg-gradient-to-r from-transparent to-[var(--primary)]/5 flex items-center justify-between gap-3 shrink-0">
              <div className="flex flex-col text-[10px] font-semibold opacity-50 uppercase tracking-widest">
                <span>Vibration & Sound Enabled</span>
                <span className="font-mono text-[9px]">FCM SYNCHRONIZER</span>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>

    {/* Confirmation Modal overlay to confirm Delete All */}
    <AnimatePresence>
      {showConfirmDeleteAll && (
        <div className="fixed inset-0 z-[1400] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowConfirmDeleteAll(false)}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            className="relative w-full max-w-sm bg-[var(--card)] border border-[var(--border)] rounded-[2rem] p-6 shadow-2xl z-10 flex flex-col space-y-4"
          >
            <div className="flex justify-between items-center pb-2 border-b border-[var(--border)]">
              <h4 className="text-xs font-black uppercase tracking-tight text-rose-500 flex items-center gap-1.5">
                <Trash2 size={15} />
                <span>Delete All Notifications? / सभी सूचनाएं हटाएं?</span>
              </h4>
              <button
                onClick={() => setShowConfirmDeleteAll(false)}
                className="h-6 w-6 rounded-md bg-[var(--foreground)]/5 hover:bg-[var(--foreground)]/10 text-[var(--foreground)]/60 hover:text-[var(--foreground)] flex items-center justify-center cursor-pointer transition-colors"
              >
                <X size={12} />
              </button>
            </div>

            <div className="space-y-2 text-xs leading-relaxed text-[var(--foreground)]/80">
              <p className="font-bold">
                Are you sure you want to delete all notifications?
              </p>
              <p className="text-[10px] opacity-70 leading-relaxed uppercase text-rose-500/90 font-semibold">
                ⚠️ This will permanently purge all alerts, stock triggers, and notification feeds from your account!
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmDeleteAll(false)}
                className="py-2 px-3 bg-[var(--foreground)]/5 border border-[var(--border)] rounded-xl text-[9px] font-black uppercase tracking-wider hover:bg-[var(--foreground)]/10 text-[var(--foreground)] active:scale-95 transition-all cursor-pointer text-center"
              >
                Cancel / रद्द करें
              </button>
              <button
                type="button"
                onClick={executeConfirmDeleteAll}
                className="py-2 px-3 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-[9px] font-black uppercase tracking-wider shadow-lg shadow-rose-500/20 active:scale-95 transition-all cursor-pointer text-center"
              >
                Yes, Delete All
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>

    {/* Confirmation Modal overlay to confirm Mark as Read */}
    <AnimatePresence>
      {showConfirmMarkAll && (
        <div className="fixed inset-0 z-[1400] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowConfirmMarkAll(false)}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            id="confirm-mark-backdrop"
          />
          {/* Modal Box */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            className="relative w-full max-w-sm bg-[var(--card)] border border-[var(--border)] rounded-[2rem] p-6 shadow-2xl z-10 flex flex-col space-y-4"
            id="confirm-mark-box"
          >
            <div className="flex justify-between items-center pb-2 border-b border-[var(--border)]">
              <h4 className="text-xs font-black uppercase tracking-tight text-[var(--foreground)] flex items-center gap-1.5">
                <span>Mark All As Read? / सभी को पूर्ण घोषित करें?</span>
              </h4>
              <button
                onClick={() => setShowConfirmMarkAll(false)}
                className="h-6 w-6 rounded-md bg-[var(--foreground)]/5 hover:bg-[var(--foreground)]/10 text-[var(--foreground)]/60 hover:text-[var(--foreground)] flex items-center justify-center cursor-pointer transition-colors"
                id="btn-close-confirm"
              >
                <X size={12} />
              </button>
            </div>

            <div className="space-y-2 text-xs leading-relaxed text-[var(--foreground)]/80">
              <p className="font-bold">
                Are you sure you want to mark all notifications as read?
              </p>
              <p className="text-[10px] opacity-70 leading-relaxed uppercase">
                ⚠️ This will clear all unread database notifications and dismiss low-stock, notes, or overdue balance triggers in your active dashboard!
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                type="button"
                id="btn-cancel-confirm"
                onClick={() => setShowConfirmMarkAll(false)}
                className="py-2 px-3 bg-[var(--foreground)]/5 border border-[var(--border)] rounded-xl text-[9px] font-black uppercase tracking-wider hover:bg-[var(--foreground)]/10 text-[var(--foreground)] hover:border-[var(--foreground)]/20 active:scale-95 transition-all cursor-pointer text-center"
              >
                Cancel / रद्द करें
              </button>
              <button
                type="button"
                id="btn-execute-confirm"
                onClick={executeConfirmMarkAll}
                className="py-2 px-3 bg-[var(--primary)] hover:bg-[var(--primary)]/95 text-white rounded-xl text-[9px] font-black uppercase tracking-wider shadow-lg shadow-[var(--primary)]/15 active:scale-95 transition-all cursor-pointer text-center"
              >
                Yes, Mark All Read
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
    </>
  );
}
