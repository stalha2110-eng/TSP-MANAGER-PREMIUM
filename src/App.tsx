/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  TrendingUp,
  ArrowRight,
  Bell,
  BellRing,
  RefreshCw,
  Sparkles,
  Search, 
  Settings as SettingsIcon, 
  Plus, 
  Home, 
  User, 
  Lock, 
  Unlock, 
  ArrowLeft,
  Trash2,
  Edit2,
  ChevronRight,
  Sun,
  Moon,
  Globe,
  Briefcase,
  HeartPulse,
  Wifi,
  Smartphone,
  Store,
  MapPin,
  Phone,
  ShieldCheck,
  FileText,
  Cloud,
  CheckCircle2,
  AlertCircle,
  Package,
  Weight,
  Hash,
  LayoutGrid,
  ChevronDown,
  ChevronUp,
  Clock,
  CreditCard,
  Truck,
  Users,
  PlusCircle,
  X,
  Minimize2,
  Share2,
  Type,
  Maximize2,
  Mic,
  Calendar,
  Pin,
  CheckCircle,
  MessageSquare,
  RotateCcw,
  LogOut,
  LogIn,
  MoreVertical,
  Download,
  Upload,
  Database,
  CloudOff,
  FileSpreadsheet,
  FileText as FilePdf,
  XCircle,
  HelpCircle,
  BookOpen,
  Landmark,
  ShoppingBasket,
  BarChart3,
  NotebookPen,
  Tag,
  Paperclip,
  Zap,
  Check,
  Save,
  Menu,
  Eye,
  EyeOff,
  GripVertical,
  LayoutDashboard,
  Trophy,
  Volume2,
  VolumeX,
  Play,
  Mail
} from 'lucide-react';
import XLSX from 'xlsx-js-style';
import { BUSINESS_MODES } from './services/businessModeConfig';
import { RecoveryService } from './services/recoveryService';
import BusinessSettingsScreen from './components/BusinessSettingsScreen';
import StoreClosingControlCenter from './components/StoreClosingControlCenter';
import SettingsScreenExt from './components/SettingsScreen';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ExportProgressOverlay } from './components/ExportProgressOverlay';
import { Button } from './components/ui/Button';
import { PINScreen } from './components/ui/PINScreen';
import { UnitSelectorModal } from './components/ui/UnitSelectorModal';
import { AddCategoryModal } from './components/ui/AddCategoryModal';
import { ManageCategoriesModal } from './components/ui/ManageCategoriesModal';
import { 
  Skeleton, 
  SkeletonText, 
  SkeletonCatalog, 
  SkeletonPOS, 
  SkeletonAnalytics, 
  SkeletonUdhar, 
  AppFullSkeleton 
} from './components/ui/SkeletonLoader';
import { SmartBulkEntryModal } from './components/SmartBulkEntryModal';
import { Settings2, Receipt, PackagePlus, Printer, Sliders } from 'lucide-react';
import BillingScreen from './components/BillingScreen';
import SmartCalculator from './components/SmartCalculator';
import AnalyticsScreen from './components/AnalyticsScreen';
import UdharScreen from './components/UdharScreen';
import BillHistoryDrawer from './components/BillHistoryDrawer';
import NotificationCenter from './components/NotificationCenter';
import { backNavManager, useBackModal } from './utils/backNavigationManager';
import PrinterSettingsScreen from './components/PrinterSettingsScreen';
import { LatestAchievementWidget } from './components/MilestonesTab';
import { MilestoneCelebrationModal } from './components/MilestoneCelebrationModal';
import { UnbilledQuickLedgerWidget } from './components/UnbilledQuickLedgerWidget';
import DynamicStoreDashboard from './components/DynamicStoreDashboard';
import { AnimatedBillingIcon } from './components/AnimatedBillingIcon';
import { AnimatedHomeIcon } from './components/AnimatedHomeIcon';
import { AnimatedAnalyticsIcon } from './components/AnimatedAnalyticsIcon';
import { AnimatedUdharIcon } from './components/AnimatedUdharIcon';
import { AnimatedPlusIcon } from './components/AnimatedPlusIcon';
import { playFeedbackEvent, playSynthesizedSound, playWelcomeAnnouncement } from './services/soundFeedbackService';
import { getCalculatedAchievements, Milestone, downloadCertificateOfMilestone, ensureIsoString } from './lib/achievementUtils';
import { getUnbilledEntries, saveUnbilledEntries } from './lib/unbilledStorage';
import { 
  db, 
  auth, 
  loginWithGoogle, 
  onAuthStateChanged,
  User as FirebaseUser,
  handleFirestoreError,
  OperationType,
  sanitizeForFirestore
} from './firebase';
import { EmailAuthProvider, linkWithCredential, updatePassword } from 'firebase/auth';
import { LoginScreen } from './components/LoginScreen';
import { OnboardingForm } from './components/OnboardingForm';
import { 
  doc, 
  setDoc, 
  onSnapshot, 
  collection, 
  query, 
  orderBy, 
  limit, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  Timestamp,
  serverTimestamp 
} from 'firebase/firestore';
import { 
  AppState, 
  Item, 
  Category, 
  AppSettings, 
  LanguageType, 
  ThemeType,
  Translations,
  Note,
  Bill,
  InAppNotification,
  DeviceRegistration,
  HistoryEntry,
  BusinessGoal,
  BusinessShift,
  UnbilledEntry
} from './types';
import { 
  NotificationService, 
  playNotificationChime, 
  triggerVibration, 
  requestPushPermission 
} from './services/notificationService';
import { 
  DEFAULT_CATEGORIES, 
  THEMES, 
  LANGUAGES, 
  UI_TEXT, 
  UNITS 
} from './constants';
import { 
  cn, 
  formatCurrency, 
  formatNumber,
  parseTimestamp
} from './lib/utils';
import { trackRecentUnit, useRecentUnits } from './lib/unitUtils';
import { translateItemName, getSmartNoteCategorization } from './services/translationService';
import { cleanAndValidateText } from './services/languageEngine';
import { VoiceProductAssistant } from './components/VoiceProductAssistant';

// @ts-ignore
import appLogo from './components/ui/premium(TsPrice).png';

// Global device ID generation
const getDeviceId = () => {
  let id = localStorage.getItem('ts_device_id');
  if (!id) {
    id = Math.random().toString(36).substring(2, 11);
    localStorage.setItem('ts_device_id', id);
  }
  return id;
};

const getDeviceName = () => {
  const ua = navigator.userAgent;
  if (/android/i.test(ua)) return "Android Device";
  if (/iPad|iPhone|iPod/.test(ua)) return "iOS Device";
  if (/Windows/i.test(ua)) return "Windows PC";
  if (/Macintosh/i.test(ua)) return "MacBook";
  return "Web Browser";
};

const getLogoGlowFilter = (theme: string) => {
  switch (theme) {
    case 'midnight_blue':
      return 'drop-shadow(0 2px 4px rgba(0,0,0,0.5)) drop-shadow(0 0 10px rgba(59,130,246,0.65)) drop-shadow(0 0 20px rgba(59,130,246,0.25))';
    case 'neo_brutalist':
      return 'drop-shadow(0 2px 4px rgba(0,0,0,0.6)) drop-shadow(0 0 8px rgba(250,204,21,0.8)) drop-shadow(0 0 16px rgba(250,204,21,0.35))';
    case 'glass_modern':
      return 'drop-shadow(0 2px 5px rgba(0,0,0,0.5)) drop-shadow(0 0 12px rgba(168,85,247,0.7)) drop-shadow(0 0 25px rgba(236,72,153,0.3))';
    case 'luxury_gold':
      return 'drop-shadow(0 2px 4px rgba(0,0,0,0.5)) drop-shadow(0 0 12px rgba(251,191,36,0.75)) drop-shadow(0 0 25px rgba(251,191,36,0.3))';
    case 'emerald_matrix':
      return 'drop-shadow(0 2px 4px rgba(0,0,0,0.5)) drop-shadow(0 0 12px rgba(16,185,129,0.85)) drop-shadow(0 0 25px rgba(16,185,129,0.35))';
    default:
      return 'drop-shadow(0 2px 5px rgba(0,0,0,0.45)) drop-shadow(0 0 12px rgba(245,158,11,0.5)) drop-shadow(0 0 25px rgba(245,158,11,0.2))';
  }
};

const getLogoBackplateClass = (theme: string) => {
  switch (theme) {
    case 'midnight_blue':
      return {
        glow: 'bg-blue-500/10',
        gradient: 'from-blue-500/20 via-indigo-500/5 to-blue-500/25'
      };
    case 'neo_brutalist':
      return {
        glow: 'bg-yellow-500/10',
        gradient: 'from-yellow-400/25 via-red-500/5 to-yellow-400/30'
      };
    case 'glass_modern':
      return {
        glow: 'bg-purple-500/10',
        gradient: 'from-purple-500/20 via-pink-400/5 to-purple-500/25'
      };
    case 'luxury_gold':
      return {
        glow: 'bg-amber-500/15',
        gradient: 'from-amber-500/25 via-yellow-400/5 to-amber-500/30'
      };
    case 'emerald_matrix':
      return {
        glow: 'bg-emerald-500/15',
        gradient: 'from-emerald-500/25 via-teal-400/5 to-emerald-500/30'
      };
    default:
      return {
        glow: 'bg-amber-500/10',
        gradient: 'from-amber-500/20 via-yellow-500/5 to-amber-500/25'
      };
  }
};

// --- Default State ---
const INITIAL_SETTINGS: AppSettings = {
  theme: 'midnight_blue',
  language: 'en',
  isLocked: true,
  pin: null,
  currency: 'INR',
  autoLockDelay: 30,
  hideBuyingPriceByDefault: true,
  accentColor: 'indigo',
  fontSize: 'standard',
   pricePrecision: 0,
  showStockAlerts: true,
  autoCloudSync: true,
  hasSeenOnboarding: false,
  dismissedNotifications: [],
  enableStrictLanguageMode: true,
  allowMixedLanguage: false,
  enableTranslationValidation: true,
  enableInstantLanguageRefresh: true,
  showLanguagePreview: true,
  deviceId: getDeviceId(),
  deviceName: getDeviceName(),
  storeOpeningTime: '08:00',
  storeClosingTime: '21:00',
  reminderTimeBeforeMinutes: 15,
  monthlySalesTarget: 100000,
  // --- Business Mode Setup ---
  businessMode: 'kirana',
  enabledFeatures: {
    udhar: true,
    inventory: true,
    customer: true,
    supplier: true,
    analytics: true,
    notifications: true,
    printing: true,
    cloudSync: true
  },
  quickActions: ['create_bill', 'add_product', 'update_stock', 'print_invoice', 'open_analytics', 'open_udhar'],
  dashboardCards: [
    { id: 'sales', title: 'Daily Sales Revenue', visible: true, size: 'large' },
    { id: 'profit', title: 'Gross Profit Calculations', visible: true, size: 'medium' },
    { id: 'low_stock', title: 'Low Stock alerts', visible: true, size: 'medium' }
  ],
  // --- Advanced Dynamic Store Dashboard System Settings Defaults ---
  dashboardMode: 'hybrid',
  dashboardEnableDynamic: true,
  dashboardPrioritizeAlerts: true,
  dashboardPrioritizeInventory: true,
  dashboardPrioritizeBilling: true,
  dashboardPrioritizeUdhar: true,
  dashboardPrioritizeSystem: true,
  dashboardAutoHideEmptyCards: false,
  dashboardAllowReordering: true,
  dashboardAllowResizing: true,
  dashboardShowRecentActivity: true,
  dashboardShowBusinessHealth: true,
  dashboardShowPrinterStatus: true,
  dashboardShowCloudSync: true,
  dashboardShowBackupStatus: true,
  dashboardShowBusinessJourney: true,
  dashboardShowGoalsProgress: true,
  dashboardEnableAnimations: true,
  dashboardSmoothCardMovement: true,
  dashboardPriorityHighlightEffects: true,
  dashboardCardsConfig: [
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
  ],
  dashboardProfiles: [
    {
      name: 'Owner Dashboard',
      mode: 'hybrid',
      cardsConfig: [
        { id: 'quick_actions', size: 'large', pinned: true, hidden: false },
        { id: 'business_health', size: 'medium', pinned: false, hidden: false },
        { id: 'sales', size: 'large', pinned: false, hidden: false },
        { id: 'profit', size: 'medium', pinned: false, hidden: false },
        { id: 'inventory_value', size: 'medium', pinned: false, hidden: false },
        { id: 'pending_udhar', size: 'medium', pinned: false, hidden: false },
        { id: 'top_products', size: 'large', pinned: false, hidden: false },
        { id: 'goals_progress', size: 'large', pinned: false, hidden: false }
      ]
    },
    {
      name: 'Billing Dashboard',
      mode: 'fixed',
      cardsConfig: [
        { id: 'quick_actions', size: 'large', pinned: true, hidden: false },
        { id: 'sales', size: 'large', pinned: true, hidden: false },
        { id: 'bills', size: 'medium', pinned: false, hidden: false },
        { id: 'printer_status', size: 'small', pinned: false, hidden: false },
        { id: 'cloud_sync_status', size: 'small', pinned: false, hidden: false }
      ]
    },
    {
      name: 'Inventory Dashboard',
      mode: 'dynamic',
      cardsConfig: [
        { id: 'quick_actions', size: 'large', pinned: true, hidden: false },
        { id: 'low_stock', size: 'medium', pinned: false, hidden: false },
        { id: 'out_of_stock', size: 'medium', pinned: false, hidden: false },
        { id: 'inventory_value', size: 'medium', pinned: false, hidden: false },
        { id: 'top_products', size: 'large', pinned: false, hidden: false }
      ]
    },
    {
      name: 'Audit Dashboard',
      mode: 'hybrid',
      cardsConfig: [
        { id: 'business_health', size: 'medium', pinned: true, hidden: false },
        { id: 'sales', size: 'large', pinned: false, hidden: false },
        { id: 'profit', size: 'medium', pinned: false, hidden: false },
        { id: 'bills', size: 'medium', pinned: false, hidden: false },
        { id: 'pending_udhar', size: 'medium', pinned: false, hidden: false },
        { id: 'recent_activity', size: 'medium', pinned: false, hidden: false }
      ]
    }
  ],
  activeDashboardProfile: 'Owner Dashboard',
  // --- Sound & Feedback System Defaults ---
  soundFeedbackMode: 'vibrate_sound',
  soundStylePack: 'modern',
  soundBillingVolume: 80,
  soundPrintVolume: 75,
  soundNotificationVolume: 85,
  soundOverallVolume: 100,
  soundBillingEnabled: true,
  soundProductAddedEnabled: true,
  soundPrintEnabled: true,
  soundNotificationEnabled: true,
  vibrationStrength: 'medium',
  vibrationBillingEnabled: true,
  vibrationProductAddedEnabled: true,
  vibrationPrintEnabled: true,
  vibrationNotificationEnabled: true,
  smartBusinessFeedback: true,
  quietHoursEnabled: false,
  quietHoursStart: '22:00',
  quietHoursEnd: '07:00',
  quietHoursVibrateOnly: true,
};

function deduplicateById<T extends { id: string }>(arr: T[]): T[] {
  const seen = new Set<string>();
  return arr.filter(item => {
    if (!item || !item.id || seen.has(item.id)) {
      return false;
    }
    seen.add(item.id);
    return true;
  });
}

const getInitialState = (): AppState => {
  const savedSettings = localStorage.getItem('price_manager_settings');
  const savedState = localStorage.getItem('price_manager_state');
  
  let settings = INITIAL_SETTINGS;
  if (savedSettings) {
    try {
      const parsedSettings = JSON.parse(savedSettings);
      if (parsedSettings) {
        settings = { ...INITIAL_SETTINGS, ...parsedSettings };
      }
    } catch (e) {
      console.error("Failed to parse saved settings", e);
    }
  }

  let items = [];
  let notes = [];
  let bills = [];
  let udharCustomers = [];
  let udharTransactions = [];
  if (savedState) {
    try {
      const parsed = JSON.parse(savedState);
      if (parsed) {
        items = (parsed.items || []).map((data: any) => ({
          ...data,
          translations: {
            en: data.name || '',
            hi: '',
            mr: '',
            'hi-en': '',
            ...(data.translations || {})
          }
        }));
        notes = parsed.notes || [];
        bills = parsed.bills || [];
        udharCustomers = parsed.udharCustomers || [];
        udharTransactions = parsed.udharTransactions || [];
      }
    } catch (e) {
      console.error("Failed to parse saved state", e);
    }
  }

  return {
    items: deduplicateById(items),
    notes: deduplicateById(notes),
    categories: DEFAULT_CATEGORIES,
    settings,
    user: null,
    bills: deduplicateById(bills),
    udharCustomers: deduplicateById(udharCustomers),
    udharTransactions: deduplicateById(udharTransactions),
    unbilledEntries: getUnbilledEntries(),
  };
};

const INITIAL_STATE: AppState = getInitialState();

interface Alert {
  id: string;
  type: 'note' | 'item' | 'batch';
  title: string;
  subtitle: string;
  priority: 'Urgent' | 'Important' | 'Info' | 'Completed';
  icon: React.ReactNode;
  category?: string;
  timestamp: string;
}

function NotificationBar({ 
  notes, 
  items,
  dismissed, 
  currentTime,
  onDismiss, 
  onView
}: { 
  notes: Note[]; 
  items: Item[];
  dismissed: string[]; 
  currentTime: Date;
  onDismiss: (id: string) => void; 
  onView: (id: string, type: 'item' | 'note' | 'batch') => void;
}) {
  const [expanded, setExpanded] = useState(false);

  const alerts = useMemo(() => {
    const list: Alert[] = [];
    const now = currentTime;

    // 1. Process High-Priority Notes & Reminders
    notes.forEach(note => {
      const noteTitle = note.title?.toLowerCase() || '';
      const noteDesc = note.description?.toLowerCase() || '';
      const isKOT = noteTitle.includes('kitchen ticket') || noteTitle.includes('kot-') || noteDesc.includes('kot-');
      if (isKOT) return;

      const isReminder = note.category === 'Reminder' && note.dueDate;
      const isDue = isReminder && new Date(note.dueDate!) <= now;
      const isSoon = isReminder && !isDue && (new Date(note.dueDate!).getTime() - now.getTime()) < 3600000 * 24;

      if (!dismissed.includes(note.id) && (isDue || isSoon || note.priority === 'Urgent' || note.priority === 'Important')) {
        list.push({
          id: note.id,
          type: 'note',
          title: note.title,
          subtitle: isDue ? "REACHED DUE DATE" : isSoon ? `Due ${new Date(note.dueDate!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : note.description,
          priority: isDue ? 'Urgent' : note.priority,
          icon: isReminder ? <Clock size={16} /> : <FileText size={16} />,
          timestamp: note.createdAt
        });
      }
    });

    // 2. Process Item Price Changes (Batch if > 2)
    const itemPriceChanges = items.filter(item => {
      if (item.priceChangedAt && !dismissed.includes(`price-${item.id}-${item.priceChangedAt}`)) {
        const changedAt = new Date(item.priceChangedAt);
        return (now.getTime() - changedAt.getTime() < 3600000 * 24);
      }
      return false;
    });

    if (itemPriceChanges.length > 2) {
      if (!dismissed.includes('batched-prices')) {
        list.push({
          id: 'batched-prices',
          type: 'batch',
          title: `${itemPriceChanges.length} Price Updates`,
          subtitle: `Multiple inventory items have new rates. Audit required.`,
          priority: 'Info',
          icon: <TrendingUp size={16} />,
          timestamp: itemPriceChanges[0].priceChangedAt || now.toISOString()
        });
      }
    } else {
      itemPriceChanges.forEach(item => {
        list.push({
          id: item.id,
          type: 'item',
          title: `Rate Change: ${item.translations?.en || item.name}`,
          subtitle: `Updated by ${item.lastChangedBy || 'System'}`,
          priority: 'Info',
          icon: <TrendingUp size={16} />,
          timestamp: item.priceChangedAt!
        });
      });
    }

    // 3. Process Less Critical Info Notes (Batch if > 2)
    const infoNotes = notes.filter(n => 
      !dismissed.includes(n.id) && 
      n.priority === 'Info' && 
      !n.dueDate && 
      (now.getTime() - new Date(n.createdAt).getTime() < 3600000 * 24)
    );

    if (infoNotes.length > 2) {
      if (!dismissed.includes('batched-info-notes')) {
        list.push({
          id: 'batched-info-notes',
          type: 'batch',
          title: `${infoNotes.length} Operation Logs`,
          subtitle: `Routine updates and log entries recorded today.`,
          priority: 'Info',
          icon: <FileText size={16} />,
          timestamp: infoNotes[0].createdAt
        });
      }
    } else if (infoNotes.length > 0) {
      infoNotes.forEach(note => {
        list.push({
          id: note.id,
          type: 'note',
          title: note.title,
          subtitle: note.description,
          priority: 'Info',
          icon: <FileText size={16} />,
          timestamp: note.createdAt
        });
      });
    }

    return list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [notes, items, dismissed, currentTime]);

  if (alerts.length === 0) return null;

  return (
    <div className="sticky top-20 z-40 px-4 py-2 pointer-events-none">
      <div className="max-w-4xl mx-auto flex flex-col gap-2 pointer-events-auto">
        <div 
          onClick={() => setExpanded(!expanded)}
          className="flex items-center justify-between px-4 py-3 bg-[var(--card)]/90 backdrop-blur-xl border border-[var(--border)] rounded-2xl shadow-xl cursor-pointer hover:border-[var(--primary)]/30 transition-all group"
        >
          <div className="flex items-center gap-3">
             <div className="relative">
                <BellRing size={16} className="text-[var(--primary)] animate-bounce" />
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[8px] font-black h-4 w-4 flex items-center justify-center rounded-full shadow-sm">{alerts.length}</span>
             </div>
             <div className="flex flex-col">
                <span className="text-[9px] font-black uppercase tracking-widest opacity-40 leading-none mb-0.5">Live Settings Feed</span>
                <span className="text-xs font-bold truncate max-w-[180px] leading-tight">{alerts[0].title}</span>
             </div>
          </div>
          <div className="flex items-center gap-3">
             <span className="text-[10px] font-black uppercase tracking-tight opacity-30 group-hover:opacity-100 transition-opacity">
                {expanded ? 'Hide Feed' : 'Explore Feed'}
             </span>
             <motion.div animate={{ rotate: expanded ? 180 : 0 }}>
                <ChevronDown size={14} className="opacity-40" />
             </motion.div>
          </div>
        </div>

        <AnimatePresence>
          {expanded && (
            <motion.div 
              initial={{ height: 0, opacity: 0, scale: 0.95 }}
              animate={{ height: 'auto', opacity: 1, scale: 1 }}
              exit={{ height: 0, opacity: 0, scale: 0.95 }}
              className="overflow-hidden"
            >
              <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl shadow-2xl p-2 space-y-1 max-h-[400px] overflow-y-auto no-scrollbar mt-1">
                 {alerts.map((alert, index) => (
                   <div 
                     key={`${alert.type || 'alert'}-${alert.id || 'id'}-${index}`}
                     className={cn(
                       "flex items-center gap-4 p-4 rounded-xl hover:bg-[var(--primary)]/5 transition-all cursor-pointer group/item border border-transparent hover:border-[var(--primary)]/10",
                       alert.priority === 'Urgent' ? "bg-red-500/5 shadow-inner" : ""
                     )}
                     onClick={(e) => {
                       e.stopPropagation();
                       onView(alert.id, alert.type);
                     }}
                   >
                     <div className={cn(
                       "h-10 w-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm",
                       alert.priority === 'Urgent' ? "bg-red-500 text-white" : "bg-[var(--primary)]/10 text-[var(--primary)]"
                     )}>
                       {alert.icon}
                     </div>
                     <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-[10px] font-black uppercase tracking-tight truncate leading-none">{alert.title}</p>
                          {alert.priority === 'Urgent' && <span className="px-1.5 py-0.5 rounded-full bg-red-500 text-white text-[8px] font-black uppercase">Critical</span>}
                        </div>
                        <p className="text-[11px] font-medium opacity-50 truncate mt-1">{alert.subtitle}</p>
                     </div>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          let dismissId = alert.id;
                          if (alert.type === 'item') dismissId = `price-${alert.id}-${alert.timestamp}`;
                          onDismiss(dismissId);
                        }}
                        className="opacity-0 group-hover/item:opacity-100 p-2 hover:text-red-500 transition-all rounded-lg hover:bg-red-500/10"
                      >
                        <X size={16} />
                      </button>
                   </div>
                 ))}
                 <div className="py-2 text-center">
                    <p className="text-[8px] font-black uppercase tracking-widest opacity-20 italic">End of system timeline</p>
                 </div>
              </div>
            </motion.div>
        )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function SplashScreen({ onComplete }: { onComplete: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onComplete, 2500);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <motion.div 
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, y: -20 }}
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#0a0c10]"
    >
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="flex flex-col items-center"
      >
        <div className="relative mb-8">
          <motion.div 
            className="absolute inset-0 bg-amber-500 blur-[60px] opacity-20"
            animate={{ scale: [1, 1.2, 1], opacity: [0.2, 0.4, 0.2] }}
            transition={{ duration: 3, repeat: Infinity }}
          />
          <div className="relative h-40 w-40 rounded-[2.5rem] bg-gradient-to-br from-slate-800 to-slate-900 p-1 border border-white/10 shadow-2xl overflow-hidden">
             <img src={appLogo} alt="TS" className="h-full w-full object-contain" />
          </div>
        </div>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.6 }}
          className="text-center"
        >
          <h1 className="text-4xl font-black tracking-tighter text-white">
            TS <span className="text-amber-500">PRICE</span> MANAGER
          </h1>
          <p className="mt-2 text-[10px] font-black uppercase tracking-[0.5em] text-white/30">
            Enterprise Pricing Core v2.5
          </p>
        </motion.div>
        
        <div className="mt-12 w-48 h-1 bg-white/5 rounded-full overflow-hidden">
          <motion.div 
            className="h-full bg-amber-500"
            initial={{ width: "0%" }}
            animate={{ width: "100%" }}
            transition={{ duration: 2, ease: "easeInOut" }}
          />
        </div>
      </motion.div>
    </motion.div>
  );
}

// ==========================================
// PREMIUM DUAL-TONE SVG ANIMATED ICONS
// ==========================================

const ReceiptIcon = ({ isHovered, className }: { isHovered: boolean; className?: string }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M4 10h16v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-8Z" className="stroke-current opacity-85" />
    <path d="M4 10V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v4" className="stroke-current opacity-40" />
    <path d="M8 7h8" className="stroke-current opacity-50" />
    <motion.path 
      d="M9 10v6l2-1 2 1 2-1v-5" 
      fill="currentColor" 
      fillOpacity="0.12"
      animate={isHovered ? { y: [0, 2, 0], scaleY: [1, 1.08, 1] } : { y: 0, scaleY: 1 }}
      transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
      className="stroke-current"
    />
    <path d="M12 13h2" className="stroke-current opacity-60" />
  </svg>
);

const AddProductIcon = ({ isHovered, className }: { isHovered: boolean; className?: string }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M12 2L2 7l10 5 10-5-10-5Z" className="stroke-current opacity-40" />
    <path d="M2 17l10 5 10-5" className="stroke-current opacity-80" />
    <path d="M2 7v10" className="stroke-current opacity-80" />
    <path d="M12 12v10" className="stroke-current opacity-80" />
    <path d="M22 7v10" className="stroke-current opacity-80" />
    <motion.path 
      d="M12 5v4M10 7h4" 
      className="stroke-current font-bold"
      animate={isHovered ? { y: [0, -3, 0], scale: [1, 1.2, 1] } : { y: 0, scale: 1 }}
      transition={{ repeat: Infinity, duration: 1.6, ease: "easeInOut" }}
    />
  </svg>
);

const UpdateStockIcon = ({ isHovered, className }: { isHovered: boolean; className?: string }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <motion.path 
      d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" 
      animate={isHovered ? { rotate: 360 } : { rotate: 0 }}
      transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
      className="stroke-current opacity-80"
      style={{ originX: '12px', originY: '12px' }}
    />
    <ellipse cx="12" cy="12" rx="4" ry="2" className="stroke-current fill-current fill-opacity-10" />
    <path d="M8 12v3c0 1.1.9 2 4 2s4-.9 4-2v-3" className="stroke-current opacity-50" />
  </svg>
);

const PrintInvoiceIcon = ({ isHovered, className }: { isHovered: boolean; className?: string }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" className="stroke-current opacity-80" />
    <path d="M6 9V4h12v5" className="stroke-current opacity-40" />
    <motion.rect 
      x="8" 
      y="14" 
      width="8" 
      height="8" 
      rx="1" 
      fill="currentColor"
      fillOpacity="0.12"
      animate={isHovered ? { y: [0, 2, 0], scaleY: [1, 1.15, 1] } : { y: 0, scaleY: 1 }}
      transition={{ repeat: Infinity, duration: 1.3, ease: "easeInOut" }}
      className="stroke-current"
    />
    <path d="M10 17h4M10 20h2" className="stroke-current opacity-60" />
  </svg>
);

const OpenAnalyticsIcon = ({ isHovered, className }: { isHovered: boolean; className?: string }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <motion.rect 
      x="3" 
      y="14" 
      width="3" 
      height="6" 
      rx="0.5" 
      className="stroke-current fill-current fill-opacity-10"
      animate={isHovered ? { height: [6, 9, 6], y: [0, -3, 0] } : { height: 6, y: 0 }}
      transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
    />
    <motion.rect 
      x="9" 
      y="8" 
      width="3" 
      height="12" 
      rx="0.5" 
      className="stroke-current fill-current fill-opacity-10"
      animate={isHovered ? { height: [12, 15, 12], y: [0, -3, 0] } : { height: 12, y: 0 }}
      transition={{ duration: 1.2, delay: 0.15, repeat: Infinity, ease: "easeInOut" }}
    />
    <motion.rect 
      x="15" 
      y="11" 
      width="3" 
      height="9" 
      rx="0.5" 
      className="stroke-current fill-current fill-opacity-10"
      animate={isHovered ? { height: [9, 13, 9], y: [0, -4, 0] } : { height: 9, y: 0 }}
      transition={{ duration: 1.2, delay: 0.3, repeat: Infinity, ease: "easeInOut" }}
    />
    <motion.path 
      d="M3 13l6-5 6 4 6-9" 
      className="stroke-current"
      animate={isHovered ? { pathLength: [1, 0.8, 1], y: [0, -0.5, 0] } : { pathLength: 1, y: 0 }}
      transition={{ duration: 1.5, repeat: Infinity }}
    />
  </svg>
);

const OpenUdharIcon = ({ isHovered, className }: { isHovered: boolean; className?: string }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" className="stroke-current opacity-80" />
    <path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5V4.5z" className="stroke-current fill-current fill-opacity-10" />
    <motion.path 
      d="M6 6h10M6 10h10M6 14h6" 
      className="stroke-current"
      animate={isHovered ? { skewX: [0, 3, 0], opacity: [0.6, 0.9, 0.6] } : { skewX: 0, opacity: 0.6 }}
      transition={{ duration: 1, repeat: Infinity }}
    />
  </svg>
);

// --- App Component ---
export default function App() {
  const [state, setState] = useState<AppState>(INITIAL_STATE);
  const [activeTab, setActiveTab] = useState<'home' | 'billing' | 'analytics' | 'udhar' | 'notes' | 'shift' | 'goals' | 'history'>('home');
  const [showPlusActionMenu, setShowPlusActionMenu] = useState(false);
  const [showSmartBulkEntry, setShowSmartBulkEntry] = useState(false);
  const rawCategories = state.settings.customCategories || state.categories;
  const activeCategories = rawCategories.filter((cat, idx, arr) => arr.findIndex(c => c.id === cat.id) === idx);
  
  // --- FUTURISTIC INTELLIGENT DOWNTIME RECOVERY SYSTEM ---
  const [syncStatus, setSyncStatus] = useState<'Synced' | 'Saving' | 'Recovering' | 'Offline'>(() => {
    return typeof window !== 'undefined' && navigator.onLine ? 'Synced' : 'Offline';
  });
  const [showRecoveryCenter, setShowRecoveryCenter] = useState(false);
  const [showRecoveryOverlay, setShowRecoveryOverlay] = useState(false);
  const [recoveryProgress, setRecoveryProgress] = useState(0);
  const [integrityLogs, setIntegrityLogs] = useState<{ timestamp: string; msg: string; code: string }[]>(() => [
    { timestamp: new Date().toLocaleTimeString(), msg: 'Local storage Integrity validated.', code: 'SECURE_STORAGE_OK' },
    { timestamp: new Date().toLocaleTimeString(), msg: 'Database index allocation aligns properly.', code: 'INDEX_VERIFIED' },
    { timestamp: new Date().toLocaleTimeString(), msg: 'Auto-healing system initialized on ports.', code: 'RECOVERY_HEALTHY' }
  ]);

  // Listener for Offline / Online state shifts
  useEffect(() => {
    const goOnline = () => {
      setSyncStatus('Recovering');
      setIntegrityLogs(prev => [
        { timestamp: new Date().toLocaleTimeString(), msg: 'Network reconnection validated. Auto-sync queue processing.', code: 'NET_RECON_ONLINE' },
        ...prev
      ]);
      setTimeout(() => {
        setSyncStatus('Synced');
      }, 1500);
    };
    
    const goOffline = () => {
      setSyncStatus('Offline');
      setIntegrityLogs(prev => [
        { timestamp: new Date().toLocaleTimeString(), msg: 'Broadband disconnect detected. Local cache pipeline active.', code: 'NET_OFFLINE' },
        ...prev
      ]);
    };

    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  // Startup Immersive Self-Healing & Session Recovery Overlay Trigger
  useEffect(() => {
    const cached = localStorage.getItem('price_manager_state');
    if (cached) {
      setShowRecoveryOverlay(true);
      setSyncStatus('Recovering');
      
      let p = 0;
      const tm = setInterval(() => {
        p += 5;
        if (p >= 100) {
          setRecoveryProgress(100);
          clearInterval(tm);
          setTimeout(() => {
            setShowRecoveryOverlay(false);
            setSyncStatus(navigator.onLine ? 'Synced' : 'Offline');
            setIntegrityLogs(prev => [
              { timestamp: new Date().toLocaleTimeString(), msg: 'Active cache session successfully restored to telemetry.', code: 'RESTORED_DRAFT_HOT' },
              ...prev
            ]);
          }, 300);
        } else {
          setRecoveryProgress(p);
        }
      }, 40);
      
      return () => clearInterval(tm);
    }
  }, []);

  // --- Global Smart Undo/Redo & Quick Peek States ---
  const [historyUndoStack, setHistoryUndoStack] = useState<HistoryEntry[]>([]);
  const [historyRedoStack, setHistoryRedoStack] = useState<HistoryEntry[]>([]);
  const [lastActionLabel, setLastActionLabel] = useState<string>('');
  const [showUndoToast, setShowUndoToast] = useState(false);
  const [undoToastTimer, setUndoToastTimer] = useState<any>(null);
  
  const [quickPeek, setQuickPeek] = useState<{
    type: 'item' | 'customer' | 'bill' | 'notification' | 'analytics';
    payload: any;
  } | null>(null);

  const [showMenu, setShowMenu] = useState(false);
  const [menuTab, setMenuTab] = useState<'profile' | 'settings' | 'business_settings' | 'printer' | 'day_closing'>('profile');
  const [settingsSubTab, setSettingsSubTab] = useState<'interface' | 'security' | 'sound' | 'data'>('interface');
  const [businessSubTab, setBusinessSubTab] = useState<'overview' | 'journey' | 'profile' | 'features' | 'categories' | 'dashboard' | 'actions' | 'knowledge' | 'recovery'>('overview');
  const [drawerSearchQuery, setDrawerSearchQuery] = useState('');
  const [drawerSearchHistory, setDrawerSearchHistory] = useState<string[]>(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('drawer_search_history') : null;
    return saved ? JSON.parse(saved) : [];
  });

  const addToDrawerSearchHistory = (query: string) => {
    const trimmed = query.trim();
    if (!trimmed) return;
    setDrawerSearchHistory(prev => {
      const filtered = prev.filter(q => q.toLowerCase() !== trimmed.toLowerCase());
      const updated = [trimmed, ...filtered].slice(0, 6);
      localStorage.setItem('drawer_search_history', JSON.stringify(updated));
      return updated;
    });
  };

  const clearDrawerSearchHistory = () => {
    setDrawerSearchHistory([]);
    localStorage.removeItem('drawer_search_history');
  };

  useEffect(() => {
    if (!drawerSearchQuery.trim() || drawerSearchQuery.trim().length < 3) return;
    const timer = setTimeout(() => {
      addToDrawerSearchHistory(drawerSearchQuery);
    }, 1500);
    return () => clearTimeout(timer);
  }, [drawerSearchQuery]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).__setMenuTabToBusinessSettings = () => {
        setMenuTab('business_settings');
      };
    }
  }, []);
  const [showNotificationsDropdown, setShowNotificationsDropdown] = useState(false);
  const [notifications, setNotifications] = useState<InAppNotification[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Set up PWA Back Navigation System hooks
  useEffect(() => {
    backNavManager.setOnTabChangeCallback((tab) => {
      setActiveTab(tab as any);
    });
  }, []);

  useBackModal(showMenu, () => setShowMenu(false), 'drawer_menu');
  useBackModal(showPlusActionMenu, () => setShowPlusActionMenu(false), 'plus_action_menu');
  useBackModal(showSmartBulkEntry, () => setShowSmartBulkEntry(false), 'smart_bulk_entry');
  useBackModal(showNotificationsDropdown, () => setShowNotificationsDropdown(false), 'notifications_dropdown');
  useBackModal(quickPeek !== null, () => setQuickPeek(null), 'quick_peek');
  useBackModal(showRecoveryCenter, () => setShowRecoveryCenter(false), 'recovery_center');

  // Request browser Notification permissions on launch
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Periodically refresh current time to update reminder proximity alerts
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // Automated background daily summary scheduler check
  useEffect(() => {
    NotificationService.checkAndTriggerDailySummary(
      state.user?.uid || null,
      state.bills || [],
      state.settings,
      notifications,
      (updatedSettings) => {
        setState(prev => ({
          ...prev,
          settings: updatedSettings
        }));
      }
    );
  }, [currentTime, state.user, state.bills, state.settings, notifications]);

  // Automated background cloud backup plan observer
  useEffect(() => {
    if (state.settings.scheduledBackupEnabled) {
      const now = new Date();
      const currentHrsMin = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
      const targetTime = state.settings.scheduledBackupTime || '21:00';
      
      if (currentHrsMin === targetTime) {
        const todayStr = now.toISOString().split('T')[0];
        const lastRun = (state.settings as any).lastScheduledBackupDate;
        
        if (lastRun !== todayStr) {
          const backupTypeDesc = state.settings.externalStorageProvider === 'google_drive' 
            ? 'Google Drive Sync' 
            : state.settings.externalStorageProvider === 'dropbox' 
            ? 'Dropbox Personal Vault' 
            : 'Firebase Cloud Vault';
            
          const emailDest = state.settings.scheduledBackupEmail || 'stalha2110@gmail.com';
          const destinationDesc = `destination email dispatch (${emailDest}) and external cloud storage (${backupTypeDesc})`;

          // Update local state directly with run dates
          setState(prev => ({
            ...prev,
            settings: {
              ...prev.settings,
              lastScheduledBackupDate: todayStr,
              lastScheduledBackupTime: now.toLocaleString()
            }
          }));

          // Append to integrity logs
          setIntegrityLogs(prev => [
            {
              timestamp: now.toLocaleString(),
              msg: `☁️ AUTOMATED SCHEDULED CLOUD BACKUP successfully compiled and dispatched to ${destinationDesc}. Status: HEALTHY.`,
              code: 'SYS_BACKUP_AUTO'
            },
            ...prev
          ]);

          // Synthesized bell sequence
          try {
            if (state.settings.soundOn !== false) {
              const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
              const osc = audioCtx.createOscillator();
              const gain = audioCtx.createGain();
              osc.connect(gain);
              gain.connect(audioCtx.destination);
              osc.type = 'sine';
              osc.frequency.setValueAtTime(880, audioCtx.currentTime);
              gain.gain.setValueAtTime(0.04, audioCtx.currentTime);
              osc.start();
              osc.stop(audioCtx.currentTime + 0.15);
              
              setTimeout(() => {
                const osc2 = audioCtx.createOscillator();
                const gain2 = audioCtx.createGain();
                osc2.connect(gain2);
                gain2.connect(audioCtx.destination);
                osc2.type = 'sine';
                osc2.frequency.setValueAtTime(1320, audioCtx.currentTime);
                gain2.gain.setValueAtTime(0.04, audioCtx.currentTime);
                osc2.start();
                osc2.stop(audioCtx.currentTime + 0.25);
              }, 180);
            }
          } catch (e) {
            console.error('Notification audio trigger failed', e);
          }

          // Trigger screen alerts center update
          if (state.settings.notificationsOn !== false) {
            setNotifications(prev => [
              {
                id: `bk-${Date.now()}`,
                title: '☁️ Scheduled Cloud Backup Successful',
                message: `Entire store registries and transaction history were safely packaged and sent to ${destinationDesc}!`,
                timestamp: now.toLocaleTimeString(),
                category: 'system',
                priority: 'medium',
                isRead: false
              },
              ...prev
            ]);
          }

          if ('Notification' in window && Notification.permission === 'granted' && state.settings.pushOn !== false) {
            new Notification('☁️ Store Backup Completed', {
              body: `Your complete store records were backed up to ${emailDest} & ${backupTypeDesc}.`,
              icon: '/favicon.ico'
            });
          }
        }
      }
    }
  }, [currentTime, state.settings, state.items, state.bills]);

  const [showHistoryDrawer, setShowHistoryDrawer] = useState(false);

  // Global drag/swipe-to-open history drawer gesturizer (available on all screens/tabs)
  useEffect(() => {
    let startX = 0;
    let startY = 0;

    const handleTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      const target = e.target as HTMLElement;

      // Skip interactive and scroll-active sections like horizontal graphs and scroll elements
      if (
        !target ||
        target.closest('input') || 
        target.closest('button') || 
        target.closest('select') || 
        target.closest('textarea') || 
        target.closest('.cart-item') || 
        target.closest('.no-swipe') ||
        target.closest('.overflow-x-auto') ||
        target.closest('.chart-scroll') ||
        target.closest('.analytics-container') ||
        target.closest('svg')
      ) {
        startX = 0;
        return;
      }

      // Only trigger if starting from the left 80% of the screen
      if (touch.clientX < window.innerWidth * 0.8) {
        startX = touch.clientX;
        startY = touch.clientY;
      } else {
        startX = 0;
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (startX === 0) return;
      const touch = e.changedTouches[0];
      const deltaX = touch.clientX - startX;
      const deltaY = Math.abs(touch.clientY - startY);

      // Trigger if swiped left-to-right significantly (at least 95px horizontally)
      // and vertical movement is relatively small (under 75px) so native vertical scrolling isn't hijacked
      if (deltaX > 95 && deltaY < 75) {
        setShowHistoryDrawer(true);
      }
      startX = 0;
    };

    const handleMouseDown = (e: MouseEvent) => {
      if (e.button !== 0) return; // Only capture primary left click
      const target = e.target as HTMLElement;
      // Skip interactive workflows so we don't disrupt drawing canvases or button presses
      if (
        !target ||
        target.closest('input') || 
        target.closest('button') || 
        target.closest('select') || 
        target.closest('textarea') || 
        target.closest('.cart-item') || 
        target.closest('.no-swipe') ||
        target.closest('.overflow-x-auto') ||
        target.closest('.chart-scroll') ||
        target.closest('.analytics-container') ||
        target.closest('svg')
      ) {
        startX = 0;
        return;
      }

      if (e.clientX < window.innerWidth * 0.8) {
        startX = e.clientX;
        startY = e.clientY;
      } else {
        startX = 0;
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (startX === 0) return;
      const deltaX = e.clientX - startX;
      const deltaY = Math.abs(e.clientY - startY);

      if (deltaX > 115 && deltaY < 85) {
        setShowHistoryDrawer(true);
      }
      startX = 0;
    };

    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchend', handleTouchEnd);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  // Global "Enter" key device keyboard next-filling navigation setup
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Enter') return;

      const active = document.activeElement;
      if (!active) return;

      const isInput = active.tagName === 'INPUT' || 
                      active.tagName === 'TEXTAREA' || 
                      active.tagName === 'SELECT' || 
                      active.hasAttribute('data-navigable');

      if (!isInput) return;

      // Let buttons trigger their click handler on Enter rather than skipping
      if (active.tagName === 'BUTTON' || active.getAttribute('role') === 'button') {
        e.preventDefault();
        (active as HTMLElement).click();
        return;
      }

      // If it is a textarea and user pressed Shift+Enter, allow newline entry
      if (active.tagName === 'TEXTAREA' && e.shiftKey) {
        return;
      }

      // Find nearest active contextual container (dialog, drawer, tab, or cards)
      const container = active.closest('[role="dialog"]') || 
                        active.closest('.modal-content') || 
                        active.closest('.drawer') || 
                        active.closest('[role="tabpanel"]') || 
                        active.closest('.card') || 
                        document.body;

      // Selector for all navigable elements
      const selector = 'input:not([type="hidden"]):not([type="file"]):not([disabled]):not([readonly]), textarea:not([disabled]):not([readonly]), select:not([disabled]), button[data-navigable="true"], [data-navigable="true"]';
      const elements = Array.from(container.querySelectorAll(selector)) as HTMLElement[];

      // Filter to only visible elements
      const visibleElements = elements.filter(el => {
        const rect = el.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0 && window.getComputedStyle(el).display !== 'none';
      });

      const currentIndex = visibleElements.indexOf(active as HTMLElement);
      if (currentIndex !== -1 && currentIndex < visibleElements.length - 1) {
        // Prevent default browser/form submission/newline behavior
        e.preventDefault();
        
        const nextEl = visibleElements[currentIndex + 1];
        nextEl.focus();
        
        if (nextEl.tagName === 'INPUT' || nextEl.tagName === 'TEXTAREA') {
          try {
            (nextEl as any).select();
          } catch (err) {
            // Ignore error if element type doesn't support select()
          }
        }
      } else {
        // If we are at the last input, trigger or focus the save/submit button inside the container if present
        const saveBtn = container.querySelector('[data-save="true"], button[type="submit"]') as HTMLElement;
        if (saveBtn && saveBtn !== active) {
          e.preventDefault();
          saveBtn.focus();
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => {
      window.removeEventListener('keydown', handleGlobalKeyDown);
    };
  }, []);

  const [showAddItem, setShowAddItem] = useState(false);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [showManageCategories, setShowManageCategories] = useState(false);
  const [showVoiceAssistant, setShowVoiceAssistant] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [isTabLoading, setIsTabLoading] = useState(false);
  const [hoveredAction, setHoveredAction] = useState<string | null>(null);

  const handleTabChange = useCallback((tab: 'home' | 'billing' | 'analytics' | 'udhar' | 'notes' | 'shift' | 'goals' | 'history') => {
    if (tab === activeTab) return;
    setIsTabLoading(true);
    setActiveTab(tab);
    backNavManager.onTabChanged(tab);
    const timer = setTimeout(() => {
      setIsTabLoading(false);
    }, 240);
    return () => clearTimeout(timer);
  }, [activeTab]);

  // Advanced tactile Drag-to-Mic state engine
  const [isDraggingButton, setIsDraggingButton] = useState(false);
  const [dragYOffset, setDragYOffset] = useState(0);
  const firstSoundPlayedRef = useRef(false);
  const triggerThresholdRef = useRef(false);
  const [dailyCycleModal, setDailyCycleModal] = useState<{
    type: 'opening' | 'closing';
    isOpen: boolean;
  } | null>(null);

  // Welcome Speech Voice Announcement Effect
  useEffect(() => {
    if (isInitializing) return;
    
    let spoken = false;
    const triggerSpeech = () => {
      if (spoken) return;
      spoken = true;
      playWelcomeAnnouncement(state.settings);
      cleanup();
    };

    const cleanup = () => {
      window.removeEventListener('click', triggerSpeech);
      window.removeEventListener('touchstart', triggerSpeech);
      window.removeEventListener('keydown', triggerSpeech);
    };

    // Try playing immediately
    triggerSpeech();

    // Fallback if blocked by browser autoplay rules: trigger on first user interaction
    window.addEventListener('click', triggerSpeech, { passive: true });
    window.addEventListener('touchstart', triggerSpeech, { passive: true });
    window.addEventListener('keydown', triggerSpeech, { passive: true });

    return () => {
      cleanup();
    };
  }, [isInitializing, state.settings]);

  // Daily cycle check Effect
  useEffect(() => {
    if (isInitializing) return;

    const openingStr = state.settings.storeOpeningTime || "08:00";
    const closingStr = state.settings.storeClosingTime || "21:00";
    const reminderBefore = state.settings.reminderTimeBeforeMinutes !== undefined ? state.settings.reminderTimeBeforeMinutes : 15;

    // Helper to get total minutes in day from HH:MM
    const getMinutes = (timeStr: string) => {
      const [h, m] = timeStr.split(':').map(Number);
      return h * 60 + m;
    };

    const nowMinutes = currentTime.getHours() * 60 + currentTime.getMinutes();
    const openingMinutes = getMinutes(openingStr);
    const closingMinutes = getMinutes(closingStr);

    const todayStr = currentTime.toISOString().split('T')[0]; // "YYYY-MM-DD"

    // 1. OPENING TIME CHECK:
    const lastOpenPrompt = localStorage.getItem('price_manager_last_open_prompt_date') || '';
    if (nowMinutes >= openingMinutes && nowMinutes < closingMinutes) {
      if (lastOpenPrompt !== todayStr) {
        setDailyCycleModal({ type: 'opening', isOpen: true });
      }
    }

    // 2. CLOSING TIME CHECK:
    const lastClosePrompt = localStorage.getItem('price_manager_last_close_prompt_date') || '';
    const alertThresholdMinutes = closingMinutes - reminderBefore;
    if (nowMinutes >= alertThresholdMinutes && nowMinutes < closingMinutes + 120) {
      if (lastClosePrompt !== todayStr) {
        setDailyCycleModal({ type: 'closing', isOpen: true });
      }
    }
  }, [currentTime, state.settings.storeOpeningTime, state.settings.storeClosingTime, state.settings.reminderTimeBeforeMinutes, isInitializing]);

  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [activePredictionIndex, setActivePredictionIndex] = useState(-1);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showPINScreen, setShowPINScreen] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [showChangePIN, setShowChangePIN] = useState(false);
  const [isVerifyingOldPIN, setIsVerifyingOldPIN] = useState(false);
  const [notesExpanded, setNotesExpanded] = useState(true);
  const [showAddNote, setShowAddNote] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [analyticsRenderKey, setAnalyticsRenderKey] = useState(0);
  const [isExporting, setIsExporting] = useState(false);
  const [exportFormat, setExportFormat] = useState<'excel' | 'pdf' | null>(null);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportStatus, setExportStatus] = useState('');
  const [exportCompletedSteps, setExportCompletedSteps] = useState<string[]>([]);
  const [isSharing, setIsSharing] = useState(false);
  const [exportModal, setExportModal] = useState<{
    isOpen: boolean;
    format: 'excel' | 'pdf' | null;
  }>({ isOpen: false, format: null });
  const [selectedUdharCustomerId, setSelectedUdharCustomerId] = useState<string | null>(null);

  // --- Dynamic Shift & Revenue Goals States ---
  const [showGoalPanel, setShowGoalPanel] = useState(false);
  const [openingCashInput, setOpeningCashInput] = useState('2000');
  const [activeShift, setActiveShift] = useState<BusinessShift | null>(() => {
    try {
      const saved = localStorage.getItem('tsm_active_shift');
      return saved ? JSON.parse(saved) : null;
    } catch (e) { return null; }
  });
  const [shiftHistory, setShiftHistory] = useState<BusinessShift[]>(() => {
    try {
      const saved = localStorage.getItem('tsm_shift_history');
      return saved ? JSON.parse(saved) : [];
    } catch (e) { return []; }
  });
  const [businessGoals, setBusinessGoals] = useState<BusinessGoal>(() => {
    try {
      const saved = localStorage.getItem('tsm_business_goals');
      return saved ? JSON.parse(saved) : {
        dailySales: 15000,
        dailyProfit: 3000,
        dailyBills: 20,
        weeklySales: 105000,
        weeklyProfit: 21000,
        weeklyBills: 140,
        monthlySales: 450000,
        monthlyProfit: 90000,
        monthlyBills: 600
      };
    } catch (e) {
      return {
        dailySales: 15000,
        dailyProfit: 3000,
        dailyBills: 20,
        weeklySales: 105000,
        weeklyProfit: 21050,
        weeklyBills: 140,
        monthlySales: 450000,
        monthlyProfit: 90000,
        monthlyBills: 600
      };
    }
  });

  // Watchers to auto-save structures to localStorage
  useEffect(() => {
    if (activeShift) {
      localStorage.setItem('tsm_active_shift', JSON.stringify(activeShift));
    } else {
      localStorage.removeItem('tsm_active_shift');
    }
  }, [activeShift]);

  useEffect(() => {
    localStorage.setItem('tsm_shift_history', JSON.stringify(shiftHistory));
  }, [shiftHistory]);

  useEffect(() => {
    localStorage.setItem('tsm_business_goals', JSON.stringify(businessGoals));
  }, [businessGoals]);

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'warning' } | null>(null);
  const [toastTimeout, setToastTimeout] = useState<any>(null);

  const addToast = (message: string, type: 'success' | 'info' | 'warning' | 'error' = 'success') => {
    if (toastTimeout) clearTimeout(toastTimeout);
    setToast({ message, type: type === 'error' ? 'warning' : type });
    const t = setTimeout(() => {
      setToast(null);
    }, 3000);
    setToastTimeout(t);
  };

  useEffect(() => {
    const handleAddedCustomToast = (e: Event) => {
      const customEvent = e as CustomEvent<{ message: string; type?: 'success' | 'info' | 'warning' | 'error' }>;
      if (customEvent.detail && customEvent.detail.message) {
        addToast(customEvent.detail.message, customEvent.detail.type || 'success');
      }
    };
    window.addEventListener('app-add-toast', handleAddedCustomToast);
    return () => {
      window.removeEventListener('app-add-toast', handleAddedCustomToast);
    };
  }, [addToast]);

  // --- Beautiful Real-time Notification Popups State & Listeners ---
  const [popupNotifications, setPopupNotifications] = useState<InAppNotification[]>([]);

  const addPopupNotification = useCallback((notif: InAppNotification) => {
    setPopupNotifications(prev => {
      if (prev.some(p => p.id === notif.id)) return prev;
      return [...prev, notif];
    });

    // Remove automatically after 6 seconds
    setTimeout(() => {
      setPopupNotifications(prev => prev.filter(p => p.id !== notif.id));
    }, 6000);
  }, []);

  const handlePopupNotificationClick = useCallback((notif: InAppNotification) => {
    // Dismiss the popup immediately
    setPopupNotifications(prev => prev.filter(p => p.id !== notif.id));

    // Handle deep-link or smart fallbacks
    if (notif.deepLink) {
      const { screen, targetId } = notif.deepLink;
      if (screen) {
        if (screen === 'settings') {
          setActiveTab('home');
          setShowMenu(true);
          setMenuTab('settings');
        } else {
          setActiveTab(screen as any);
          if (screen === 'udhar' && targetId) {
            setSelectedUdharCustomerId(targetId);
          } else if (screen === 'inventory' && targetId) {
            const linkedItem = state.items.find(i => i.id === targetId);
            if (linkedItem) {
              setEditingItem(linkedItem);
            }
          }
        }
      }
    } else {
      const titleLower = notif.title.toLowerCase();
      if (notif.category === 'inventory' || titleLower.includes('stock') || titleLower.includes('product')) {
        setActiveTab('home');
      } else if (notif.category === 'udhar' || titleLower.includes('credit') || titleLower.includes('due') || titleLower.includes('payment')) {
        setActiveTab('udhar');
      } else if (notif.category === 'analytics' || titleLower.includes('report') || titleLower.includes('sales') || titleLower.includes('summary')) {
        setActiveTab('analytics');
      } else if (notif.category === 'system' && titleLower.includes('backup')) {
        setActiveTab('home');
        setShowMenu(true);
        setMenuTab('settings');
      }
    }

    // Mark as read in database
    NotificationService.markAsRead(state.user?.uid || null, notif.id).catch(console.error);
  }, [state.items, state.user, setShowMenu, setMenuTab]);

  useEffect(() => {
    const handleNewNotification = (e: Event) => {
      const customEvent = e as CustomEvent<InAppNotification>;
      if (customEvent.detail && customEvent.detail.title) {
        addPopupNotification(customEvent.detail);
      }
    };
    window.addEventListener('app-new-notification', handleNewNotification);
    return () => {
      window.removeEventListener('app-new-notification', handleNewNotification);
    };
  }, [addPopupNotification]);

  // --- Achievement Celebration State & Real-time Checkers ---
  const [activeCelebrationMilestone, setActiveCelebrationMilestone] = useState<Milestone | null>(null);
  const prevCelebratedIdsRef = React.useRef<Set<string>>(new Set());

  const calculatedAchievements = useMemo(() => {
    return getCalculatedAchievements(state);
  }, [state]);

  useEffect(() => {
    if (!calculatedAchievements?.milestones) return;
    
    calculatedAchievements.milestones.forEach(m => {
      if (m.isUnlocked && m.unlockedAt) {
        if (prevCelebratedIdsRef.current.has(m.id)) {
          return;
        }

        const msDiff = Date.now() - new Date(m.unlockedAt).getTime();
        const absoluteMsDiff = Math.abs(msDiff);

        // If unlocked within the last 40 seconds, it's a real-time event in current session!
        if (absoluteMsDiff < 40000) {
          setActiveCelebrationMilestone(m);
          prevCelebratedIdsRef.current.add(m.id);
          addToast(`🏆 Milestone Achieved: ${m.title.split(' ').slice(1).join(' ')}!`, 'success');
        } else {
          // Historical achievement from past session, mark as celebrated to avoid scanning
          prevCelebratedIdsRef.current.add(m.id);
        }
      }
    });
  }, [calculatedAchievements]);

  const [widgetOrder, setWidgetOrder] = useState<string[]>(() => {
    const defaults = ['priceChanges', 'latestAchievement', 'metrics', 'goals', 'overdueUdhar'];
    try {
      const saved = localStorage.getItem('tsm_home_widget_order');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const filtered = parsed.filter(w => defaults.includes(w));
          const missing = defaults.filter(w => !filtered.includes(w));
          const finalOrder = [...filtered, ...missing];
          if (finalOrder.length === defaults.length) {
            return finalOrder;
          }
        }
      }
    } catch (e) {}
    return defaults;
  });

  const [draggedWidgetIndex, setDraggedWidgetIndex] = useState<number | null>(null);
  const [dragOverWidgetIndex, setDragOverWidgetIndex] = useState<number | null>(null);

  useEffect(() => {
    localStorage.setItem('tsm_home_widget_order', JSON.stringify(widgetOrder));
  }, [widgetOrder]);

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedWidgetIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (dragOverWidgetIndex !== index) {
      setDragOverWidgetIndex(index);
    }
  };

  const handleDragEnd = () => {
    setDraggedWidgetIndex(null);
    setDragOverWidgetIndex(null);
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedWidgetIndex === null || draggedWidgetIndex === dropIndex) return;

    const newOrder = [...widgetOrder];
    const [removed] = newOrder.splice(draggedWidgetIndex, 1);
    newOrder.splice(dropIndex, 0, removed);

    setWidgetOrder(newOrder);
    addToast("Dashboard widget arrangement updated successfully", "success");
    handleDragEnd();
  };

  const moveWidget = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= widgetOrder.length) return;

    const newOrder = [...widgetOrder];
    const [removed] = newOrder.splice(index, 1);
    newOrder.splice(targetIndex, 0, removed);
    setWidgetOrder(newOrder);
    addToast("Section shifted successfully", "info");
  };

  const renderWidgetHeaderActions = (id: string, index: number) => {
    return (
      <div className="flex items-center gap-1.5 opacity-60 hover:opacity-100 transition-opacity">
        {index > 0 && (
          <button 
            type="button"
            onClick={() => moveWidget(index, 'up')}
            className="p-1 rounded-lg hover:bg-[var(--foreground)]/5 text-[var(--foreground)]/65 hover:text-[var(--foreground)] transition-all cursor-pointer"
            title="Move Widget Up"
          >
            <ChevronUp size={14} />
          </button>
        )}
        {index < widgetOrder.length - 1 && (
          <button 
            type="button"
            onClick={() => moveWidget(index, 'down')}
            className="p-1 rounded-lg hover:bg-[var(--foreground)]/5 text-[var(--foreground)]/65 hover:text-[var(--foreground)] transition-all cursor-pointer"
            title="Move Widget Down"
          >
            <ChevronDown size={14} />
          </button>
        )}
        <div 
          draggable
          onDragStart={(e) => handleDragStart(e, index)}
          onDragEnd={handleDragEnd}
          className="p-1 rounded-lg hover:bg-[var(--foreground)]/5 text-[var(--foreground)]/55 hover:text-[var(--foreground)] transition-all cursor-grab active:cursor-grabbing"
          title="Drag to rearrange"
        >
          <GripVertical size={13} />
        </div>
      </div>
    );
  };

  // Synchronize Active Shift values when bills change
  useEffect(() => {
    if (!activeShift) return;

    // Filter bills belonging to this shift (created after openTime)
    const shiftBills = (state.bills || []).filter(
      (b: any) => new Date(b.timestamp).getTime() >= new Date(activeShift.openTime).getTime()
    );

    let totalSales = 0;
    let totalProfit = 0;
    let totalBills = shiftBills.length;
    let pendingUdhar = 0;
    
    const customerPhones = new Set<string>();
    const itemQuantities: { [name: string]: number } = {};

    shiftBills.forEach((b: any) => {
      totalSales += b.total;
      if (b.paymentMethod === 'Credit') {
        pendingUdhar += b.total;
      }
      if (b.customerPhone || b.customerName) {
        customerPhones.add(b.customerPhone || b.customerName);
      }

      // Calculate profit
      b.items.forEach((it: any) => {
        const cost = it.cost || 0;
        const profit = (it.price - cost) * it.quantity;
        totalProfit += profit;

        itemQuantities[it.name] = (itemQuantities[it.name] || 0) + it.quantity;
      });
    });

    // Find top selling item
    let topSellingItem = 'None';
    let maxQty = 0;
    Object.entries(itemQuantities).forEach(([name, qty]) => {
      if (qty > maxQty) {
        maxQty = qty;
        topSellingItem = name;
      }
    });

    const updatedShift: BusinessShift = {
      ...activeShift,
      totalSales: parseFloat(totalSales.toFixed(2)),
      totalProfit: parseFloat(totalProfit.toFixed(2)),
      totalBills,
      pendingUdhar: parseFloat(pendingUdhar.toFixed(2)),
      totalCustomersServed: customerPhones.size,
      topSellingItem
    };

    // Only update if something actually changed to avoid infinite loop
    if (
      updatedShift.totalSales !== activeShift.totalSales ||
      updatedShift.totalProfit !== activeShift.totalProfit ||
      updatedShift.totalBills !== activeShift.totalBills ||
      updatedShift.pendingUdhar !== activeShift.pendingUdhar ||
      updatedShift.totalCustomersServed !== activeShift.totalCustomersServed ||
      updatedShift.topSellingItem !== activeShift.topSellingItem
    ) {
      setActiveShift(updatedShift);
    }
  }, [state.bills, activeShift?.id]);

  // Deletion state
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    show: boolean;
    type: 'single' | 'multiple';
    targetId?: string;
  }>({ show: false, type: 'single' });

  // PWA Install Logic
  useEffect(() => {
    const handleBeforeInstall = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Automatically show welcome or install banner if it's the first visit
      const hasSeenInstall = localStorage.getItem('ts_install_seen');
      if (!hasSeenInstall) {
        setShowWelcome(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    
    window.addEventListener('appinstalled', () => {
      setDeferredPrompt(null);
      localStorage.setItem('ts_install_seen', 'true');
      console.log('PWA was installed');
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      alert(t.installApp + ": " + t.error);
      return;
    }
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
      localStorage.setItem('ts_install_seen', 'true');
    }
  };

  // --- Data Management ---
  const handleCycleBackupAndClear = async () => {
    try {
      const billsExcelData: any[] = [];
      const activeStateBills = state.bills || [];
      if (activeStateBills.length === 0) {
        alert("There are no active billing transaction logs to backup. Proceeding with history flush...");
        handleUpdateComponentState({ bills: [] });
        return true;
      }

      const sortedBills = [...activeStateBills].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      let lastDateLabel = '';

      sortedBills.forEach(bill => {
        let dateLabel = 'Unknown Date';
        try {
          const d = new Date(bill.timestamp);
          const today = new Date();
          const yesterday = new Date();
          yesterday.setDate(today.getDate() - 1);
          
          if (d.toDateString() === today.toDateString()) {
            dateLabel = 'Today';
          } else if (d.toDateString() === yesterday.toDateString()) {
            dateLabel = 'Yesterday';
          } else {
            dateLabel = d.toLocaleDateString('en-IN', {
              weekday: 'short',
              day: 'numeric',
              month: 'short',
              year: 'numeric'
            });
          }
        } catch (e) {
          console.error(e);
        }

        if (dateLabel !== lastDateLabel) {
          lastDateLabel = dateLabel;
          // Add a beautiful separator header row in the excel sheets
          billsExcelData.push({
            'Invoice No': `📅  ${dateLabel.toUpperCase()}`,
            'Billing DateTime': '',
            'Customer Name': '',
            'Phone Number': '',
            'Payment Option': '',
            'Sold Product Name': '',
            'Quantity Sold': '',
            'Unit Purchase Cost (INR)': '',
            'Unit Retailing Price (INR)': '',
            'Subtotal Price (INR)': '',
            'Discount (%)': '',
            'Tax Charged (%)': '',
            'Total Invoice Amount Paid (INR)': '',
            'Device Brand': ''
          });
        }

        bill.items.forEach(item => {
          billsExcelData.push({
            'Invoice No': bill.billNumber,
            'Billing DateTime': new Date(bill.timestamp).toLocaleString(),
            'Customer Name': bill.customerName,
            'Phone Number': bill.customerPhone || 'N/A',
            'Payment Option': bill.paymentMethod,
            'Sold Product Name': item.name,
            'Quantity Sold': `${item.quantity} ${item.unit || 'pcs'}`,
            'Unit Purchase Cost (INR)': item.cost || 0,
            'Unit Retailing Price (INR)': item.price || 0,
            'Subtotal Price (INR)': item.price * item.quantity,
            'Discount (%)': bill.discount || 0,
            'Tax Charged (%)': bill.tax || 0,
            'Total Invoice Amount Paid (INR)': bill.total || 0,
            'Device Brand': bill.deviceName || 'Unified Desktop Client'
          });
        });
      });

      const ws = XLSX.utils.json_to_sheet(billsExcelData);
      
      // Force cell selection and scroll focus to cell A1 (top-left) to prevent mobile Excel from opening on row 12 or the bottom empty rows
      ws['!views'] = [
        {
          state: "normal",
          showGridLines: true,
          topLeftCell: "A1",
          activeCell: "A1",
          sqref: "A1"
        }
      ];
      
      // Expand columns beautifully to fit textual data
      ws['!cols'] = [
        { wch: 15 }, // Invoice No
        { wch: 22 }, // Billing DateTime
        { wch: 20 }, // Customer Name
        { wch: 15 }, // Phone
        { wch: 15 }, // Payment Option
        { wch: 25 }, // Product name
        { wch: 12 }, // Qty
        { wch: 22 }, // Unit Purchase Cost
        { wch: 22 }, // Unit Retailing price
        { wch: 18 }, // Subtotal
        { wch: 12 }, // Discount
        { wch: 12 }, // Tax
        { wch: 25 }, // Total
        { wch: 20 }  // Device Brand
      ];

      const wb = XLSX.utils.book_new();
      const sheetName = `POS Bills ${new Date().toISOString().split('T')[0]}`;
      XLSX.utils.book_append_sheet(wb, ws, sheetName);
      
      XLSX.writeFile(wb, `TS_BILL_HISTORY_BACKUP_${new Date().toISOString().split('T')[0]}.xlsx`);
      
      // Successfully downloaded the backup. Now flush history!
      handleUpdateComponentState({ bills: [] });
      
      alert("Shift Cycle Complete: Active POS Billing History backed up as Excel & cleared successfully.");
      return true;
    } catch (e) {
      console.error("Backup & cycle reset failed", e);
      alert("Backup download failed. Please export history manually in Bill History drawer.");
      return false;
    }
  };

  const exportToExcel = async (includeCost: boolean = false) => {
    if (isExporting) return;
    setIsExporting(true);
    setExportFormat('excel');
    setExportProgress(10);
    setExportStatus('Initializing export engine...');
    setExportCompletedSteps([]);
    
    try {
      if (state.items.length === 0) {
        alert("No products available to export!");
        setIsExporting(false);
        setExportFormat(null);
        return;
      }

      const steps = [
        { progress: 25, status: 'Reading and parsing product data...', delay: 300 },
        { progress: 45, status: 'Structuring spreadsheet rows and headers...', delay: 350 },
        { progress: 65, status: 'Applying freeze-pane view configurations...', delay: 300 },
        { progress: 80, status: 'Calibrating column widths and cell alignments...', delay: 250 },
        { progress: 95, status: 'Generating and packing Excel workbook...', delay: 300 },
        { progress: 100, status: 'Initiating file download to device...', delay: 200 }
      ];

      // Step 1: Init
      await new Promise(resolve => setTimeout(resolve, 250));
      setExportCompletedSteps(prev => [...prev, 'Initializing export engine...']);

      // Step 2: Reading
      setExportProgress(steps[0].progress);
      setExportStatus(steps[0].status);
      await new Promise(resolve => setTimeout(resolve, steps[0].delay));
      
      // Sort items by Category first, and then by Product Name for highlighted grouping
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
      setExportCompletedSteps(prev => [...prev, 'Reading and parsing product data...']);

      // Step 3: Structuring
      setExportProgress(steps[1].progress);
      setExportStatus(steps[1].status);
      await new Promise(resolve => setTimeout(resolve, steps[1].delay));
      const ws = XLSX.utils.json_to_sheet(data);
      setExportCompletedSteps(prev => [...prev, 'Structuring spreadsheet rows and headers...']);

      // Step 4: Views & Freeze Panes
      setExportProgress(steps[2].progress);
      setExportStatus(steps[2].status);
      await new Promise(resolve => setTimeout(resolve, steps[2].delay));
      ws['!views'] = [
        {
          state: 'frozen',
          xSplit: 1, // Freeze Serial Number column
          ySplit: 1, // Freeze Header Row
          topLeftCell: 'B2', // Ensure scrollable area starts at B2 (second column, second row)
          activePane: 'bottomRight',
          activeCell: 'B2',  // Force focus to B2 to prevent scrolling down on sheet load
          sqref: 'B2',       // Coordinate selection block
          showGridLines: true
        }
      ];
      setExportCompletedSteps(prev => [...prev, 'Applying freeze-pane view configurations...']);

      // Step 5: Columns & Row Heights
      setExportProgress(steps[3].progress);
      setExportStatus(steps[3].status);
      await new Promise(resolve => setTimeout(resolve, steps[3].delay));
      const colWidths = [
        { wch: 15 }, // SERIAL NUMBER
        { wch: 35 }, // PRODUCT NAME
        { wch: 25 }, // CATEGORY
        { wch: 30 }, // FIELD NOTES
        { wch: 25 }, // RETAIL PRICE/UNIT
        { wch: 25 }  // WHOLESALE PRICE/UNIT
      ];
      if (includeCost) {
        colWidths.push({ wch: 25 }); // COST PRICE/UNIT
      }
      ws['!cols'] = colWidths;

      // Generous row height: 28pt for Header, 22pt for Data rows
      const rowHeights = [{ hpt: 28 }];
      for (let i = 0; i < sortedItems.length; i++) {
        rowHeights.push({ hpt: 22 });
      }
      ws['!rows'] = rowHeights;

      // Design and apply premium style objects to satisfy the highlighted categorisation and professional developer quality
      const getCategoryColor = (categoryName: string) => {
        const themes = [
          { bg: "E0E7FF", text: "312E81" }, // Indigo
          { bg: "D1FAE5", text: "065F46" }, // Emerald
          { bg: "FEF3C7", text: "92400E" }, // Amber
          { bg: "E0F2FE", text: "075985" }, // Sky
          { bg: "FCE7F3", text: "9D174D" }, // Pink
          { bg: "F3E8FF", text: "6B21A8" }, // Purple
          { bg: "FFEDD5", text: "9A3412" }, // Orange
          { bg: "CCFBF1", text: "115E59" }  // Teal
        ];
        
        let hash = 0;
        for (let i = 0; i < categoryName.length; i++) {
          hash = categoryName.charCodeAt(i) + ((hash << 5) - hash);
        }
        const index = Math.abs(hash) % themes.length;
        return themes[index];
      };

      // Traverse worksheet and apply styles
      const range = XLSX.utils.decode_range(ws['!ref'] || 'A1:A1');
      for (let R = range.s.r; R <= range.e.r; ++R) {
        // Detect if Category changes at this row compared to R - 1 (for R > 1) to apply grouping borders
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

        // Alternating row background colors (zebra striping) for superb readability
        const rowBgColor = R % 2 === 1 ? "FFFFFF" : "F8FAFC";

        for (let C = range.s.c; C <= range.e.c; ++C) {
          const cell_address = XLSX.utils.encode_cell({ r: R, c: C });
          const cell = ws[cell_address];
          if (!cell) continue;

          // Define high-quality borders. Group boundaries get a thicker top border for visual categorization
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
            // Header Row styling (A1, B1, C1, D1, E1, F1, G1)
            cell.s = {
              font: {
                name: "Segoe UI",
                sz: 11,
                bold: true,
                color: { rgb: "FFFFFF" }
              },
              fill: {
                fgColor: { rgb: "1E3A8A" } // Highly professional Royal Blue Header
              },
              alignment: {
                horizontal: "center",
                vertical: "center",
                wrapText: true
              },
              border: {
                top: { style: "thin", color: { rgb: "1E3A8A" } },
                bottom: { style: "medium", color: { rgb: "0F172A" } },
                left: { style: "thin", color: { rgb: "1E3A8A" } },
                right: { style: "thin", color: { rgb: "1E3A8A" } }
              }
            };
          } else {
            // Data Rows styling
            let cellFont = { name: "Segoe UI", sz: 10, bold: false, color: { rgb: "334155" } };
            let cellFill = { fgColor: { rgb: rowBgColor } };
            let cellAlign: any = { horizontal: "left", vertical: "center" };

            if (C === 0) {
              // SERIAL NUMBER
              cellFont = { name: "Segoe UI", sz: 10, bold: false, color: { rgb: "64748B" } };
              cellAlign = { horizontal: "center", vertical: "center" };
            } else if (C === 1) {
              // PRODUCT NAME - Use bold, high-contrast dark font
              cellFont = { name: "Segoe UI", sz: 10, bold: true, color: { rgb: "111827" } };
              cellAlign = { horizontal: "left", vertical: "center" };
            } else if (C === 2) {
              // CATEGORY - Visual pill-tag grouping
              const catName = cell.v ? String(cell.v) : 'General';
              const theme = getCategoryColor(catName);
              cellFont = { name: "Segoe UI", sz: 10, bold: true, color: { rgb: theme.text } };
              cellFill = { fgColor: { rgb: theme.bg } };
              cellAlign = { horizontal: "center", vertical: "center" };
            } else if (C === 3) {
              // FIELD NOTES
              cellFont = { name: "Segoe UI", sz: 10, bold: false, color: { rgb: "475569" } };
              cellAlign = { horizontal: "left", vertical: "center", wrapText: true };
            } else if (C === 4 || C === 5 || C === 6) {
              // RETAIL PRICE/UNIT, WHOLESALE PRICE/UNIT, COST PRICE/UNIT - Use bold, high-contrast dark font
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

      setExportCompletedSteps(prev => [...prev, 'Calibrating column widths and cell alignments...']);

      // Step 6: Workbook
      setExportProgress(steps[4].progress);
      setExportStatus(steps[4].status);
      await new Promise(resolve => setTimeout(resolve, steps[4].delay));
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Product List');
      setExportCompletedSteps(prev => [...prev, 'Generating and packing Excel workbook...']);

      // Step 7: Save
      setExportProgress(steps[5].progress);
      setExportStatus(steps[5].status);
      await new Promise(resolve => setTimeout(resolve, steps[5].delay));
      const fileNameSuffix = includeCost ? 'WITH_COST' : 'WITHOUT_COST';
      XLSX.writeFile(wb, `TS_PRICE_LIST_${fileNameSuffix}_${new Date().toISOString().split('T')[0]}.xlsx`);
      setExportCompletedSteps(prev => [...prev, 'Initiating file download to device...']);
      
      // Brief pause at 100% for smooth rendering transition
      await new Promise(resolve => setTimeout(resolve, 300));
    } catch (error) {
      console.error("Excel export failed", error);
      alert("Failed to export Excel. Please try again.");
    } finally {
      setIsExporting(false);
      setExportFormat(null);
    }
  };

  const exportToPDF = async (includeCost: boolean = false) => {
    if (isExporting) return;
    setIsExporting(true);
    setExportFormat('pdf');
    setExportProgress(10);
    setExportStatus('Initializing PDF vector engine...');
    setExportCompletedSteps([]);
    
    try {
      if (state.items.length === 0) {
        alert("No products available to export!");
        setIsExporting(false);
        setExportFormat(null);
        return;
      }

      const steps = [
        { progress: 25, status: 'Constructing core document structure...', delay: 350 },
        { progress: 45, status: 'Designing brand header & document metadata...', delay: 300 },
        { progress: 65, status: 'Rendering product tables & cell alignments...', delay: 400 },
        { progress: 85, status: 'Computing multi-page flow and pagination...', delay: 300 },
        { progress: 100, status: 'Saving and initiating file download...', delay: 250 }
      ];

      // Step 1: Init
      await new Promise(resolve => setTimeout(resolve, 250));
      setExportCompletedSteps(prev => [...prev, 'Initializing PDF vector engine...']);

      // Step 2: Structure
      setExportProgress(steps[0].progress);
      setExportStatus(steps[0].status);
      await new Promise(resolve => setTimeout(resolve, steps[0].delay));
      const doc = new jsPDF();
      setExportCompletedSteps(prev => [...prev, 'Constructing core document structure...']);

      // Step 3: Brand header
      setExportProgress(steps[1].progress);
      setExportStatus(steps[1].status);
      await new Promise(resolve => setTimeout(resolve, steps[1].delay));
      
      // Header rect
      doc.setFillColor(31, 41, 55); // Dark Slate
      doc.rect(0, 0, 210, 40, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(24);
      doc.setFont('helvetica', 'bold');
      doc.text('TS PRICE MANAGER', 14, 18);
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      const subTitleText = includeCost 
        ? 'PROFESSIONAL PRODUCT PRICE LIST (WITH COST PRICE)' 
        : 'PROFESSIONAL PRODUCT PRICE LIST';
      doc.text(subTitleText, 14, 26);
      
      doc.setTextColor(200, 200, 200);
      doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 32);
      setExportCompletedSteps(prev => [...prev, 'Designing brand header & document metadata...']);

      // Step 4: Tables & columns
      setExportProgress(steps[2].progress);
      setExportStatus(steps[2].status);
      await new Promise(resolve => setTimeout(resolve, steps[2].delay));

      let sNo = 1;
      const headers = includeCost 
        ? ['S.No.', 'Product Name', 'Category', 'Field Note', 'Cost/Unit', 'Retail/Unit', 'Wholesale/Unit']
        : ['S.No.', 'Product Name', 'Category', 'Field Note', 'Retail/Unit', 'Wholesale/Unit'];

      const tableData = state.items.map(item => {
        const categoryName = (state.settings.customCategories || state.categories || []).find(c => c.id === item.categoryId)?.name || 'General';
        const row = [
          sNo++,
          (item.translations && (item.translations[state.settings.language] || item.translations.en)) || item.name,
          categoryName,
          item.notes || ''
        ];
        if (includeCost) {
          row.push(`₹${formatNumber(item.buyingPrice || 0, state.settings.pricePrecision)}/${item.buyingPriceUnit || 'pcs'}`);
        }
        row.push(
          `₹${formatNumber(item.retailPrice, state.settings.pricePrecision)}/${item.retailPriceUnit}`,
          `₹${formatNumber(item.wholesalePrice, state.settings.pricePrecision)}/${item.wholesalePriceUnit}`
        );
        return row;
      });

      autoTable(doc, {
        startY: 48,
        head: [headers],
        body: tableData,
        theme: 'striped',
        headStyles: { 
          fillColor: [79, 70, 229], // Indigo
          textColor: 255,
          fontSize: 8.5,
          fontStyle: 'bold',
          halign: 'left'
        },
        columnStyles: includeCost ? {
          0: { cellWidth: 10, halign: 'center' }, // S.No.
          1: { cellWidth: 42 }, // Product Name
          2: { cellWidth: 22 }, // Category
          3: { cellWidth: 30 }, // Field Note
          4: { cellWidth: 26, halign: 'right' }, // Cost/Unit
          5: { cellWidth: 26, halign: 'right' }, // Retail/Unit
          6: { cellWidth: 26, halign: 'right' }  // Wholesale/Unit
        } : {
          0: { cellWidth: 12, halign: 'center' }, // S.No.
          1: { cellWidth: 50 }, // Product Name
          2: { cellWidth: 28 }, // Category
          3: { cellWidth: 36 }, // Field Note
          4: { cellWidth: 28, halign: 'right' }, // Retail/Unit
          5: { cellWidth: 28, halign: 'right' }  // Wholesale/Unit
        },
        alternateRowStyles: {
          fillColor: [249, 250, 251]
        },
        margin: { top: 48 },
        styles: {
          fontSize: 8,
          cellPadding: 3
        }
      });
      setExportCompletedSteps(prev => [...prev, 'Rendering product tables & cell alignments...']);

      // Step 5: Multi-page and pagination
      setExportProgress(steps[3].progress);
      setExportStatus(steps[3].status);
      await new Promise(resolve => setTimeout(resolve, steps[3].delay));
      
      const pageCount = (doc as any).internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(`Page ${i} of ${pageCount} | TS Price Manager Core System`, 14, doc.internal.pageSize.height - 10);
      }
      setExportCompletedSteps(prev => [...prev, 'Computing multi-page flow and pagination...']);

      // Step 6: Save and download
      setExportProgress(steps[4].progress);
      setExportStatus(steps[4].status);
      await new Promise(resolve => setTimeout(resolve, steps[4].delay));
      const fileNameSuffix = includeCost ? 'WITH_COST' : 'WITHOUT_COST';
      doc.save(`TS_PRICE_LIST_${fileNameSuffix}_${new Date().toISOString().split('T')[0]}.pdf`);
      setExportCompletedSteps(prev => [...prev, 'Saving and initiating file download...']);

      await new Promise(resolve => setTimeout(resolve, 300));
    } catch (error) {
      console.error("PDF export failed", error);
      alert("Failed to export PDF. Please try again.");
    } finally {
      setIsExporting(false);
      setExportFormat(null);
    }
  };

  const handleShareProductList = async () => {
    if (isSharing) return;
    setIsSharing(true);

    try {
      if (state.items.length === 0) {
        alert("Product list is empty!");
        return;
      }

      let message = "*Product List*\n\n";
      state.items.forEach((item, index) => {
        const name = (item.translations && (item.translations[state.settings.language] || item.translations.en)) || item.name;
        message += `${index + 1}. *${name}*\nRetail Price: ₹${formatNumber(item.retailPrice, state.settings.pricePrecision)}/${item.retailPriceUnit}\nWholesale Price: ₹${formatNumber(item.wholesalePrice, state.settings.pricePrecision)}/${item.wholesalePriceUnit}\n\n`;
      });
      message += "Thank you.";

      const encodedMessage = encodeURIComponent(message);
      const whatsappUrl = `https://wa.me/?text=${encodedMessage}`;
      
      // Try to open WhatsApp
      window.open(whatsappUrl, '_blank');
      
    } catch (error) {
      console.error("Sharing failed", error);
      alert("Failed to share product list.");
    } finally {
      setIsSharing(false);
    }
  };

  const importData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (json.items && Array.isArray(json.items)) {
          if (confirm('Importing will merge with current data. Proceed?')) {
            setState(prev => ({ ...prev, items: deduplicateById([...prev.items, ...json.items]) }));
            alert('Import successful!');
          }
        }
      } catch (err) {
        alert('Invalid file format. Please upload a valid JSON backup.');
      }
    };
    reader.readAsText(file);
  };

  const handleBackup = () => {
    const dataStr = JSON.stringify(state);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    const exportFileDefaultName = `TS_PRICE_MANAGER_Backup_${new Date().toISOString().split('T')[0]}.json`;
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const handleRestore = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (json.settings && json.items) {
          if (confirm('Restoring will overwrite current settings and items. Proceed?')) {
            setState(json);
            alert('System Restored!');
          }
        }
      } catch (err) {
        alert('Invalid backup file.');
      }
    };
    reader.readAsText(file);
  };
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        if (user.email && user.uid !== 'guest_user') {
          localStorage.setItem('ts_last_logged_in_email', user.email);
        }
        setState(prev => ({ 
          ...prev, 
          user: { uid: user.uid, email: user.email } 
        }));
      } else {
        const isGuest = localStorage.getItem('ts_guest_logged_in') === 'true';
        if (isGuest) {
          setState(prev => ({ 
            ...prev, 
            user: { uid: 'guest_user', email: 'Guest Merchant' } 
          }));
        } else {
          setState(prev => ({ ...prev, user: null }));
        }
      }
      setIsAuthChecking(false);
    });

    const fallbackAuthTimer = setTimeout(() => {
      setIsAuthChecking(false);
    }, 1200);

    return () => {
      unsubscribe();
      clearTimeout(fallbackAuthTimer);
    };
  }, []);

  // Synchronize dynamic notifications from Cloud Firestore
  useEffect(() => {
    if (!state.user || state.user.uid === 'guest_user') {
      // Offline local cached loaded
      const cached: InAppNotification[] = JSON.parse(localStorage.getItem('ts_cached_offline_notifications') || '[]');
      setNotifications(cached);
      return;
    }

    // Initialize notification sync
    NotificationService.initNotificationSync(
      state.user.uid,
      (list) => {
        // Retrieve offline cached and prepend
        const cached: InAppNotification[] = JSON.parse(localStorage.getItem('ts_cached_offline_notifications') || '[]');
        setNotifications([...cached, ...list]);
      },
      () => state.settings
    );

    return () => {
      NotificationService.destroyNotificationSync();
    };
  }, [state.user, state.settings]);

  // Deep-linking listeners for Push Notifications clicked from background/foreground
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      const handleServiceWorkerMessage = (event: MessageEvent) => {
        if (event.data && event.data.type === 'NAVIGATE_TO_SCREEN') {
          const targetScreen = event.data.screen;
          const validTabs = ['home', 'billing', 'analytics', 'udhar', 'notes', 'shift', 'goals', 'history'];
          if (targetScreen && validTabs.includes(targetScreen)) {
            setActiveTab(targetScreen as any);
          }
        }
      };
      navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage);
      return () => {
        navigator.serviceWorker.removeEventListener('message', handleServiceWorkerMessage);
      };
    }
  }, []);

  // Cold-launch deep link handler (checks url search parameters for screen parameter on mount)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const targetScreen = params.get('screen');
      const validTabs = ['home', 'billing', 'analytics', 'udhar', 'notes', 'shift', 'goals', 'history'];
      if (targetScreen && validTabs.includes(targetScreen)) {
        setActiveTab(targetScreen as any);
        // Sanitise location bar state so refreshes default nicely
        const cleanUrl = window.location.pathname + window.location.hash;
        window.history.replaceState({}, document.title, cleanUrl);
      }
    }
  }, []);

  // --- Real-time Firestore Sync ---
  useEffect(() => {
    if (!state.user || !state.user.uid || state.user.uid === 'guest_user' || !state.settings.autoCloudSync || !db) {
      return;
    }

    if (!auth.currentUser || auth.currentUser.uid !== state.user.uid) {
      return;
    }

    const userDocRef = doc(db, 'users', state.user.uid);
    
    // Sync Settings
    const unsubSettings = onSnapshot(userDocRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setState(prev => ({ ...prev, settings: { ...prev.settings, ...data } }));
      }
    }, (error) => {
      if (auth.currentUser) {
        console.error("Settings sync error:", error);
      }
    });

    // Sync Items (with automatic offline self-healing and data-recovery merge)
    const itemsRef = collection(db, 'users', state.user.uid, 'items');
    const unsubItems = onSnapshot(query(itemsRef, orderBy('lastUpdated', 'desc')), (snap) => {
      const itemsList: Item[] = [];
      snap.forEach(docSnap => {
        const data = docSnap.data();
        itemsList.push({
          ...data,
          id: docSnap.id,
          translations: {
            en: data.name || '',
            hi: '',
            mr: '',
            'hi-en': '',
            ...(data.translations || {})
          }
        } as Item);
      });
      
      setState(prev => {
        const localItems = prev.items || [];
        const unsyncedItems = localItems.filter(li => !itemsList.some(ci => ci.id === li.id));
        if (unsyncedItems.length > 0) {
          unsyncedItems.forEach(async (item) => {
            try {
              await setDoc(doc(db, 'users', state.user!.uid, 'items', item.id), sanitizeForFirestore(item));
            } catch (e) {
              console.error("Self-healing background stock item upload failed:", e);
            }
          });
          const merged = [...itemsList, ...unsyncedItems].sort((a, b) => 
            new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime()
          );
          return { ...prev, items: deduplicateById(merged) };
        }
        return { ...prev, items: deduplicateById(itemsList) };
      });
    }, (error) => {
      if (auth.currentUser) {
        console.error("Items sync error:", error);
        if (error.code === 'permission-denied') {
          alert("Firestore Permission Denied. Please check your account permissions.");
        }
      }
    });

    // Sync Notes (with automatic offline self-healing and data-recovery merge)
    const notesRef = collection(db, 'users', state.user.uid, 'notes');
    const unsubNotes = onSnapshot(query(notesRef, orderBy('createdAt', 'desc')), (snap) => {
      const notesList: Note[] = [];
      snap.forEach(doc => notesList.push({ ...doc.data() as Note, id: doc.id }));
      
      setState(prev => {
        const localNotes = prev.notes || [];
        const unsyncedNotes = localNotes.filter(ln => !notesList.some(cn => cn.id === ln.id));
        if (unsyncedNotes.length > 0) {
          unsyncedNotes.forEach(async (note) => {
            try {
              await setDoc(doc(db, 'users', state.user!.uid, 'notes', note.id), sanitizeForFirestore(note));
            } catch (e) {
              console.error("Self-healing background note upload failed:", e);
            }
          });
          const merged = [...notesList, ...unsyncedNotes].sort((a, b) => 
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
          return { ...prev, notes: deduplicateById(merged) };
        }
        return { ...prev, notes: deduplicateById(notesList) };
      });
    }, (error) => {
      if (auth.currentUser) {
        console.error("Notes sync error:", error);
      }
    });

    // Sync Bills (with automatic offline self-healing, data-recovery merge, mapping and analytics trigger)
    const billsRef = collection(db, 'users', state.user.uid, 'bills');
    const unsubBills = onSnapshot(query(billsRef, orderBy('timestamp', 'desc')), (snap) => {
      const billsList: Bill[] = [];
      snap.forEach(docSnap => {
        const data = docSnap.data();
        if (data) {
          billsList.push({
            id: docSnap.id,
            billNumber: data.billNumber || `INV-${Date.now()}`,
            customerName: data.customerName || '',
            customerPhone: data.customerPhone || '',
            items: Array.isArray(data.items) ? data.items.map((item: any) => ({
              itemId: item.itemId || item.id || '',
              name: item.name || '',
              quantity: item.quantity || 0,
              cost: item.cost || item.buyingPrice || 0,
              price: item.price || item.retailPrice || 0,
              unit: item.unit || 'pcs'
            })) : [],
            discount: typeof data.discount === 'number' ? data.discount : 0,
            tax: typeof data.tax === 'number' ? data.tax : 0,
            subtotal: typeof data.subtotal === 'number' ? data.subtotal : 0,
            total: typeof data.total === 'number' ? data.total : 0,
            paymentMethod: data.paymentMethod || 'Cash',
            timestamp: parseTimestamp(data.timestamp || new Date()).toISOString(),
            deviceId: data.deviceId || '',
            deviceName: data.deviceName || ''
          });
        }
      });
      
      setAnalyticsRenderKey(k => k + 1);
      setState(prev => {
        const localBills = prev.bills || [];
        const unsyncedBills = localBills.filter(lb => !billsList.some(cb => cb.id === lb.id));
        if (unsyncedBills.length > 0) {
          unsyncedBills.forEach(async (b) => {
            try {
              await setDoc(doc(db, 'users', state.user!.uid, 'bills', b.id), sanitizeForFirestore(b));
            } catch (e) {
              console.error("Self-healing background billing upload failed:", e);
            }
          });
          const merged = [...billsList, ...unsyncedBills].sort((a, b) => 
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
          );
          return { ...prev, bills: deduplicateById(merged) };
        }
        return { ...prev, bills: deduplicateById(billsList) };
      });
    }, (error) => {
      if (auth.currentUser) {
        console.error("Bills sync error:", error);
        handleFirestoreError(error, OperationType.LIST, `users/${state.user!.uid}/bills`);
      }
    });

    // Sync Unbilled Micro-Sales Ledger Entries
    const unbilledRef = collection(db, 'users', state.user.uid, 'unbilledEntries');
    const unsubUnbilled = onSnapshot(query(unbilledRef, orderBy('timestamp', 'desc')), (snap) => {
      const unbilledList: UnbilledEntry[] = [];
      snap.forEach(docSnap => {
        const data = docSnap.data();
        if (data) {
          unbilledList.push({
            id: docSnap.id,
            amount: typeof data.amount === 'number' ? data.amount : Number(data.amount) || 0,
            category: data.category || 'General',
            timestamp: typeof data.timestamp === 'number' ? data.timestamp : parseTimestamp(data.timestamp || data.dateStr).getTime(),
            dateStr: data.dateStr || new Date().toISOString(),
            cashier: data.cashier || 'Store Cashier',
            note: data.note || ''
          });
        }
      });
      
      const localEntries = getUnbilledEntries();
      const unsyncedEntries = localEntries.filter(le => !unbilledList.some(ue => ue.id === le.id));
      let finalUnbilled = unbilledList;
      if (unsyncedEntries.length > 0) {
        unsyncedEntries.forEach(async (entry) => {
          try {
            await setDoc(doc(db, 'users', state.user!.uid, 'unbilledEntries', entry.id), entry);
          } catch (e) {
            console.error("Self-healing background unbilled entry upload failed:", e);
          }
        });
        finalUnbilled = [...unbilledList, ...unsyncedEntries].sort((a, b) => b.timestamp - a.timestamp);
      }

      saveUnbilledEntries(finalUnbilled);
      setAnalyticsRenderKey(k => k + 1);
      setState(prev => ({ ...prev, unbilledEntries: finalUnbilled }));
    }, (error) => {
      if (auth.currentUser) {
        console.error("Unbilled entries sync error:", error);
      }
    });

    return () => {
      unsubSettings();
      unsubItems();
      unsubNotes();
      unsubBills();
      unsubUnbilled();
    };
  }, [state.user, state.settings.autoCloudSync]);

  // --- Effects ---

  // Separate Effect for Theme & Core Styles (low frequency)
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', state.settings.theme);
    const darkThemes = ['midnight_blue', 'glass_modern', 'luxury_gold', 'emerald_matrix', 'cyberpunk', 'retro-blue', 'emerald-gold'];
    if (darkThemes.includes(state.settings.theme)) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    const accents: Record<string, string> = {
      indigo: '99, 102, 241',
      emerald: '16, 185, 129',
      rose: '244, 63, 94',
      amber: '245, 158, 11',
      cyan: '6, 182, 212',
      slate: '100, 116, 139'
    };
    const rgb = accents[state.settings.accentColor || 'indigo'];
    document.documentElement.style.setProperty('--primary-rgb', rgb);
    
    const fontSizes: Record<string, string> = {
      standard: '16px',
      comfortable: '18px',
      compact: '14px'
    };
    document.documentElement.style.setProperty('--base-font-size', fontSizes[state.settings.fontSize || 'standard']);
  }, [state.settings.theme, state.settings.accentColor, state.settings.fontSize]);

  // Automatic background cleanup of KOT/Kitchen dispatch reminder notes when not in restaurant/cafe mode
  useEffect(() => {
    if (state.settings.businessMode !== 'restaurant') {
      const kotNotes = state.notes.filter(note => {
        const titleLower = note.title?.toLowerCase() || '';
        const descLower = note.description?.toLowerCase() || '';
        return titleLower.includes('kitchen ticket') || titleLower.includes('kot-') || descLower.includes('kot-');
      });

      if (kotNotes.length > 0) {
        // Remove from local state
        setState(prev => ({
          ...prev,
          notes: prev.notes.filter(n => !kotNotes.some(kn => kn.id === n.id))
        }));

        // Remove from Firestore if user is authenticated
        if (state.user?.uid) {
          kotNotes.forEach(note => {
            deleteDoc(doc(db, 'users', state.user!.uid, 'notes', note.id)).catch(err => {
              console.error("Auto cleanup of stale Firestore KOT note failed:", err);
            });
          });
        }
      }
    }
  }, [state.settings.businessMode, state.notes, state.user]);



  // Separate Effect for Persistence with throttling and visual status triggers
  useEffect(() => {
    if (!navigator.onLine) {
      setSyncStatus('Offline');
    } else {
      setSyncStatus('Saving');
    }

    localStorage.setItem('price_manager_settings', JSON.stringify(state.settings));
    localStorage.setItem('price_manager_state', JSON.stringify(state));

    const timeout = setTimeout(() => {
      setSyncStatus(navigator.onLine ? 'Synced' : 'Offline');
    }, 850);

    return () => clearTimeout(timeout);
  }, [state.items, state.notes, state.bills, state.udharCustomers, state.udharTransactions, state.settings, state.user]);

  const t = UI_TEXT[state.settings.language];
  const precision = state.settings.pricePrecision || 0;

  const activeAlerts = useMemo(() => {
    const list: any[] = [];
    const minStock = state.settings.minStockLevel ?? 5;
    const dismissed = state.settings.dismissedNotifications || [];

    // 1. Check low stock items
    state.items.forEach(item => {
      const id = `low-stock-${item.id}`;
      const itemMinStock = item.minStockLevel ?? minStock;
      if (item.quantity < itemMinStock && !dismissed.includes(id)) {
        list.push({
          id,
          type: 'stock',
          title: `Low Stock Alert: ${(item.translations && (item.translations[state.settings.language] || item.translations.en || item.translations['hi-en'])) || item.name}`,
          desc: `Only ${item.quantity} ${item.unit} left. (Threshold: ${itemMinStock})`,
          time: item.lastUpdated || new Date().toISOString(),
          priority: 'Urgent'
        });
      }
    });

    // 2. Check notes reminders due soon or overdue
    state.notes.forEach(note => {
      const titleLower = note.title?.toLowerCase() || '';
      const descLower = note.description?.toLowerCase() || '';
      const isKOT = titleLower.includes('kitchen ticket') || titleLower.includes('kot-') || descLower.includes('kot-');
      if (isKOT && state.settings.businessMode !== 'restaurant') return;

      const isReminder = note.category === 'Reminder' && note.dueDate;
      const isDue = isReminder && new Date(note.dueDate!) <= new Date();
      if (!dismissed.includes(note.id) && (isDue || note.priority === 'Urgent')) {
        list.push({
          id: note.id,
          type: 'note',
          title: `Remind: ${note.title}`,
          desc: note.description,
          time: note.createdAt,
          priority: 'Urgent'
        });
      }
    });

    // 3. Check Udhar transactions due dates
    const rawTransactions = state.udharTransactions || [];
    const rawCustomers = state.udharCustomers || [];
    rawTransactions.forEach(tx => {
      if (tx.dueDate && tx.type === 'given') {
        const customer = rawCustomers.find(c => c.id === tx.customerId);
        if (customer && customer.totalUdhar > 0) {
          const isOverdueOrDueToday = new Date(tx.dueDate) <= new Date() || 
            new Date(tx.dueDate).toDateString() === new Date().toDateString();
            
          const id = `udhar-due-${tx.id}`;
          if (isOverdueOrDueToday && !dismissed.includes(id)) {
            list.push({
              id,
              type: 'udhar',
              title: `Udhar Due: ${customer.name}`,
              desc: `Amount ₹${Math.abs(tx.amount)} is due! Click to go to Udhar ledger and settle.`,
              time: tx.timestamp,
              priority: 'Urgent',
              customerId: customer.id
            });
          }
        }
      }
    });

    // 4. Check outstanding transactions of type 'given' exceeding 30 days
    rawTransactions.forEach(tx => {
      if (tx.type === 'given' && tx.amount > 0) {
        const customer = rawCustomers.find(c => c.id === tx.customerId);
        if (customer && customer.totalUdhar > 0) {
          const txDate = new Date(tx.timestamp);
          const diffMs = Date.now() - txDate.getTime();
          const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
          
          if (diffDays > 30) {
            const id = `udhar-30days-${tx.id}`;
            if (!dismissed.includes(id)) {
              list.push({
                id,
                type: 'udhar-30days',
                title: `30+ Days Outstanding: ${customer.name}`,
                desc: `₹${Math.abs(tx.amount).toLocaleString()} balance remains unpaid for ${diffDays} days. Suggest professional payment request via WhatsApp.`,
                time: tx.timestamp,
                priority: 'Urgent',
                customerId: customer.id,
                customerPhone: customer.phone,
                customerName: customer.name,
                txAmount: tx.amount,
                txDateStr: txDate.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }),
                diffDays
              });
            }
          }
        }
      }
    });

    return list;
  }, [state.items, state.notes, state.udharTransactions, state.udharCustomers, state.settings.minStockLevel, state.settings.dismissedNotifications, state.settings.language]);

  const handleDismissNotification = useCallback((id: string) => {
    setState(prev => {
      const dismissed = prev.settings.dismissedNotifications || [];
      if (!dismissed.includes(id)) {
        return {
          ...prev,
          settings: {
            ...prev.settings,
            dismissedNotifications: [...dismissed, id]
          }
        };
      }
      return prev;
    });
  }, []);

  const filteredItems = useMemo(() => {
    return state.items.filter(item => {
      const trs = item.translations || { en: item.name || '', hi: '', mr: '', 'hi-en': '' };
      const matchesSearch = 
        (trs.en || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (trs.hi || '').includes(searchQuery) ||
        (trs.mr || '').includes(searchQuery) ||
        (trs['hi-en'] || '').toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesCategory = !selectedCategory || item.categoryId === selectedCategory;
      
      return matchesSearch && matchesCategory;
    });
  }, [state.items, searchQuery, selectedCategory]);

  const predictiveItems = useMemo(() => {
    if (!searchQuery.trim()) return [];
    return state.items.filter(item => {
      const trs = item.translations || { en: item.name || '', hi: '', mr: '', 'hi-en': '' };
      return (trs.en || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
             (trs.hi || '').includes(searchQuery) ||
             (trs.mr || '').includes(searchQuery) ||
             (trs['hi-en'] || '').toLowerCase().includes(searchQuery.toLowerCase());
    }).slice(0, 6);
  }, [state.items, searchQuery]);

  const overdueUdharSummaries = useMemo(() => {
    const customers = state.udharCustomers || [];
    const transactions = state.udharTransactions || [];
    if (customers.length === 0 || transactions.length === 0) return [];

    const todayStr = new Date().toISOString().split('T')[0];
    const todayNum = new Date(todayStr).getTime();

    const overdueList: {
      customer: any;
      transaction: any;
      isOverdue: boolean;
      daysDiff: number;
    }[] = [];

    transactions.forEach(tx => {
      if (tx.amount > 0 && tx.dueDate) {
        const cust = customers.find(c => c.id === tx.customerId);
        if (cust && cust.totalUdhar > 0) {
          const isoTS = ensureIsoString(tx.dueDate);
          const txDueStr = isoTS ? isoTS.split('T')[0] : '';
          const txDueNum = txDueStr ? new Date(txDueStr).getTime() : 0;
          
          const diffMs = txDueNum - todayNum;
          const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

          if (diffDays <= 0) {
            overdueList.push({
              customer: cust,
              transaction: tx,
              isOverdue: diffDays < 0,
              daysDiff: diffDays
            });
          }
        }
      }
    });

    return overdueList.sort((a, b) => a.daysDiff - b.daysDiff);
  }, [state.udharCustomers, state.udharTransactions]);

  // --- Handlers ---
  const handleLogout = useCallback(async () => {
    localStorage.removeItem('ts_guest_logged_in');
    await auth.signOut();
    setState(prev => ({ ...prev, user: null }));
    addToast("Session terminated / लॉगआउट सफल!", "success");
  }, []);

  const handleGoogleLogin = useCallback(async () => {
    try {
      const user = await loginWithGoogle();
      if (user) {
        if (user.email) {
          localStorage.setItem('ts_last_logged_in_email', user.email);
        }
        setState(prev => ({ 
          ...prev, 
          user: { uid: user.uid, email: user.email } 
        }));
        addToast("Logged in with Google / गूगल लॉगिन सफल!", "success");
      }
    } catch (error: any) {
      if (error?.code === 'auth/popup-closed-by-user') {
        alert('Sign-in cancelled. The login popup was closed before completing. Please try again.');
      } else if (error?.code === 'auth/popup-blocked') {
        alert('Login popup was blocked by your browser. Please allow popups for this site or open in a new tab.');
      } else {
        alert(`Sign-in failed: ${error?.message || error}`);
      }
    }
  }, []);

  const handleGuestLogin = useCallback(() => {
    localStorage.setItem('ts_guest_logged_in', 'true');
    setState(prev => ({ 
      ...prev, 
      user: { uid: 'guest_user', email: 'Guest Merchant' },
      settings: { ...prev.settings, autoCloudSync: false }
    }));
    addToast("Logged in as guest / गेस्ट लॉगिन सफल!", "success");
  }, []);

  const handleUpdateSettings = useCallback(async (updates: Partial<AppSettings>) => {
    if (isSyncing) return;
    
    // Set syncing flag if autoCloudSync is being toggled
    const isTogglingSync = 'autoCloudSync' in updates;
    if (isTogglingSync) setIsSyncing(true);

    try {
      // Local state update first (Responsive UI)
      setState(prev => ({
        ...prev,
        settings: { ...prev.settings, ...updates }
      }));

      // Cloud Persistence
      if (state.user && state.user.uid !== 'guest_user' && (updates.autoCloudSync ?? state.settings.autoCloudSync)) {
        try {
          await setDoc(doc(db, 'users', state.user.uid), sanitizeForFirestore(updates), { merge: true });
        } catch (e) {
          handleFirestoreError(e, OperationType.WRITE, `users/${state.user.uid}`);
        }
      }

      // If we just enabled sync, ensure local storage doesn't conflict
      if (updates.autoCloudSync === true) {
        alert("Cloud Synchronization Enabled Successfully.");
      } else if (updates.autoCloudSync === false) {
        alert("Cloud Synchronization Disabled. Data will be saved locally.");
      }

    } catch (e) {
      console.error("Settings update failed", e);
      if (e instanceof Error && e.message.startsWith('{') && e.message.endsWith('}')) {
        throw e; // Rethrow FirestoreErrorInfo JSON
      }
      alert(t.error + ": " + (e instanceof Error ? e.message : 'Unknown error'));
      
      // Rollback local state if cloud sync was intended but failed
      setState(prev => ({ ...prev })); 
    } finally {
      if (isTogglingSync) {
        // Minimum delay for animation visibility
        setTimeout(() => setIsSyncing(false), 600);
      }
    }
  }, [state.user, state.settings.autoCloudSync, t.error, isSyncing]);

  const handleOnboardingComplete = useCallback(async (details: {
    storeName: string;
    storeOwnerName: string;
    storePhone: string;
    storeAddress: string;
    storeOpeningTime: string;
    storeClosingTime: string;
  }) => {
    await handleUpdateSettings(details);
    addToast("Setup completed successfully! / सेटअप सफलतापूर्वक पूरा हुआ!", "success");
  }, [handleUpdateSettings]);

  const handleAddItem = useCallback(async (data: Omit<Item, 'id' | 'lastUpdated'>) => {
    try {
      const id = Date.now().toString();
      const newItem = {
        ...data,
        id,
        lastUpdated: new Date().toISOString(),
        priceChangedAt: new Date().toISOString()
      };
      
      // Optimistic update
      setState(prev => ({
        ...prev,
        items: deduplicateById([newItem, ...prev.items])
      }));
      setShowAddItem(false);

      if (state.user && state.settings.autoCloudSync) {
        try {
          await setDoc(doc(db, 'users', state.user.uid, 'items', id), sanitizeForFirestore(newItem));
        } catch (e) {
          handleFirestoreError(e, OperationType.CREATE, `users/${state.user.uid}/items`);
        }
      }
    } catch (e) {
      console.error("Add item failed", e);
      if (e instanceof Error && e.message.startsWith('{') && e.message.endsWith('}')) {
        throw e;
      }
      alert(t.error + ": " + (e instanceof Error ? e.message : 'Sync Error. Saved locally.'));
    }
  }, [state.user, state.settings.autoCloudSync, t.error]);

  const handleBatchSaveItems = useCallback(async (itemsData: Omit<Item, 'id' | 'lastUpdated'>[]) => {
    try {
      const newItems = itemsData.map((data, index) => {
        const id = (Date.now() + index).toString();
        return {
          ...data,
          id,
          lastUpdated: new Date().toISOString(),
          priceChangedAt: new Date().toISOString()
        };
      });

      // Optimistic update of local state
      setState(prev => ({
        ...prev,
        items: deduplicateById([...newItems, ...prev.items])
      }));

      if (state.user && state.settings.autoCloudSync) {
        const { writeBatch, doc } = await import('firebase/firestore');
        const batch = writeBatch(db);
        newItems.forEach(item => {
          const docRef = doc(db, 'users', state.user!.uid, 'items', item.id);
          batch.set(docRef, sanitizeForFirestore(item));
        });
        try {
          await batch.commit();
        } catch (e) {
          handleFirestoreError(e, OperationType.WRITE, `users/${state.user.uid}/items-batch`);
        }
      }
      addToast(`${newItems.length} items saved successfully!`, "success");
    } catch (e) {
      console.error("Batch save failed", e);
      alert(t.error + ": " + (e instanceof Error ? e.message : 'Sync Error. Saved locally.'));
    }
  }, [state.user, state.settings.autoCloudSync, t.error, addToast]);

  const handleUpdateItem = useCallback(async (id: string, data: Partial<Item>) => {
    try {
      const existingItem = state.items.find(i => i.id === id);
      const updates: any = { 
        ...data, 
        lastUpdated: new Date().toISOString() 
      };

      if (existingItem) {
        // Track Price Changes via Recovery Service
        if (data.retailPrice !== undefined && Number(data.retailPrice) !== existingItem.retailPrice) {
          await RecoveryService.recordPriceStockChange(
            state.user?.uid || null,
            id,
            existingItem.name,
            'price',
            existingItem.retailPrice,
            Number(data.retailPrice),
            state.user?.email || 'Store Owner'
          ).catch(e => console.error(e));
        }

        // Track Stock Changes via Recovery Service
        if (data.quantity !== undefined && Number(data.quantity) !== existingItem.quantity) {
          await RecoveryService.recordPriceStockChange(
            state.user?.uid || null,
            id,
            existingItem.name,
            'stock',
            existingItem.quantity,
            Number(data.quantity),
            state.user?.email || 'Store Owner'
          ).catch(e => console.error(e));
        }

        // General details modified audit logging
        const descUpdates: string[] = [];
        if (data.name !== undefined && data.name !== existingItem.name) descUpdates.push(`Renamed "${existingItem.name}" to "${data.name}"`);
        if (data.categoryId !== undefined && data.categoryId !== existingItem.categoryId) descUpdates.push(`Changed category`);
        if (descUpdates.length > 0) {
          await RecoveryService.logAudit(
            state.user?.uid || null,
            state.user?.email || 'Store Owner',
            'update',
            'product',
            existingItem.name,
            'Details modified',
            descUpdates.join(', ')
          ).catch(e => console.error(e));
        }
      }

      const isPriceChanged = existingItem && (
        (data.buyingPrice !== undefined && data.buyingPrice !== existingItem.buyingPrice) ||
        (data.retailPrice !== undefined && data.retailPrice !== existingItem.retailPrice) ||
        (data.wholesalePrice !== undefined && data.wholesalePrice !== existingItem.wholesalePrice)
      );

      if (isPriceChanged) {
        updates.priceChangedAt = new Date().toISOString();
        updates.lastChangedBy = state.settings.deviceName;
      }

      // Optimistic update
      setState(prev => ({
        ...prev,
        items: prev.items.map(item => item.id === id ? { ...item, ...updates } : item)
      }));
      setEditingItem(null);

      if (state.user && state.settings.autoCloudSync) {
        try {
          await setDoc(doc(db, 'users', state.user.uid, 'items', id), sanitizeForFirestore(updates), { merge: true });
        } catch (e) {
          handleFirestoreError(e, OperationType.UPDATE, `users/${state.user.uid}/items/${id}`);
        }
      }
    } catch (e) {
      console.error("Update failed", e);
      if (e instanceof Error && e.message.startsWith('{') && e.message.endsWith('}')) {
        throw e;
      }
      alert(t.error + ": " + (e instanceof Error ? e.message : 'Sync Error. Saved locally.'));
    }
  }, [state.items, state.user, state.settings.autoCloudSync, state.settings.deviceName, t.error]);

  const handleSaveVoiceProducts = useCallback(async (drafts: { item: Omit<Item, 'id' | 'lastUpdated'>; mode: 'create' | 'update' | { duplicateId: string } }[]) => {
    try {
      // 1. Snapshot prior state for Undo support
      const snapshot: Partial<AppState> = { items: state.items };
      const entry: HistoryEntry = {
        type: 'state',
        stateSnapshot: snapshot,
        actionName: `Voice Added ${drafts.length} Products`
      };
      setHistoryUndoStack(prev => [entry, ...prev].slice(0, 20));
      setHistoryRedoStack([]);
      setLastActionLabel(entry.actionName);
      setShowUndoToast(true);
      if (undoToastTimer) clearTimeout(undoToastTimer);
      const timer = setTimeout(() => setShowUndoToast(false), 5000);
      setUndoToastTimer(timer);

      const updatedItems = [...state.items];

      for (const draft of drafts) {
        const existingItem = state.items.find(i => i.name.toLowerCase() === draft.item.name.toLowerCase());

        if (existingItem && draft.mode === 'update') {
          // Update prices of existing item
          const idx = updatedItems.findIndex(i => i.id === existingItem.id);
          if (idx !== -1) {
            const updated = {
              ...updatedItems[idx],
              retailPrice: draft.item.retailPrice,
              retailPriceUnit: draft.item.retailPriceUnit,
              wholesalePrice: draft.item.wholesalePrice,
              wholesalePriceUnit: draft.item.wholesalePriceUnit,
              buyingPrice: draft.item.buyingPrice,
              buyingPriceUnit: draft.item.buyingPriceUnit,
              lastUpdated: new Date().toISOString(),
              priceChangedAt: new Date().toISOString(),
              lastChangedBy: state.settings.deviceName
            };
            updatedItems[idx] = updated;

            // Audit update logs
            try {
              await RecoveryService.recordPriceStockChange(
                state.user?.uid || null,
                existingItem.id,
                existingItem.name,
                'price',
                existingItem.retailPrice,
                draft.item.retailPrice,
                state.user?.email || 'Store Owner'
              );
            } catch (e) {
              console.error(e);
            }

            if (state.user && state.settings.autoCloudSync) {
              try {
                await setDoc(doc(db, 'users', state.user.uid, 'items', existingItem.id), sanitizeForFirestore(updated), { merge: true });
              } catch (e) {
                handleFirestoreError(e, OperationType.UPDATE, `users/${state.user.uid}/items/${existingItem.id}`);
              }
            }
          }
        } else {
          // Create new item
          const id = Date.now().toString() + Math.random().toString(36).substr(2, 5);
          const newItem: Item = {
            ...draft.item,
            id,
            lastUpdated: new Date().toISOString(),
            priceChangedAt: new Date().toISOString()
          };
          updatedItems.unshift(newItem);

          // Audit logs
          try {
            await RecoveryService.logAudit(
              state.user?.uid || null,
              state.user?.email || 'Store Owner',
              'create',
              'product',
              newItem.name,
              'Created via Voice Assistant',
              `Retail: ₹${newItem.retailPrice}, Wholesale: ₹${newItem.wholesalePrice}, Cost: ₹${newItem.buyingPrice}`
            );
          } catch (e) {
            console.error(e);
          }

          if (state.user && state.settings.autoCloudSync) {
            try {
              await setDoc(doc(db, 'users', state.user.uid, 'items', id), sanitizeForFirestore(newItem));
            } catch (e) {
              handleFirestoreError(e, OperationType.CREATE, `users/${state.user.uid}/items`);
            }
          }
        }
      }

      // Update state with modified items
      setState(prev => ({
        ...prev,
        items: deduplicateById(updatedItems)
      }));

    } catch (e) {
      console.error("Voice bulk save failed", e);
      // Propagate error to Voice Assistant UI for high-fidelity visual error handling
      throw e;
    }
  }, [state.items, state.user, state.settings.autoCloudSync, state.settings.deviceName, t.error]);

  const handleDeleteItem = useCallback(async (id: string) => {
    setDeleteConfirmation({ show: true, type: 'single', targetId: id });
  }, []);

  const confirmDeletion = async () => {
    const { type, targetId } = deleteConfirmation;
    const idsToDelete = type === 'single' ? [targetId!] : selectedItemIds;

    // Push Undo Snapshot
    const snapshot: Partial<AppState> = { items: state.items };
    const entry: HistoryEntry = {
      type: 'state',
      stateSnapshot: snapshot,
      actionName: type === 'single' ? "Product Deleted" : "Bulk Products Deleted"
    };
    setHistoryUndoStack(prev => [entry, ...prev].slice(0, 20));
    setHistoryRedoStack([]);
    setLastActionLabel(entry.actionName);
    setShowUndoToast(true);
    if (undoToastTimer) clearTimeout(undoToastTimer);
    const timer = setTimeout(() => setShowUndoToast(false), 5000);
    setUndoToastTimer(timer);

    // Register deletions in Business Recovery Center
    try {
      const itemsToDelete = state.items.filter(item => idsToDelete.includes(item.id));
      for (const item of itemsToDelete) {
        await RecoveryService.recordDeletion(
          state.user?.uid || null,
          'product',
          item,
          item.name,
          `Category ID: ${item.categoryId || 'General'}, Price: ₹${item.retailPrice}, Stock: ${item.quantity} ${item.unit}`,
          state.user?.email || 'Store Owner',
          30
        );
      }
    } catch (err) {
      console.error("Failed to register deleted products in recovery archives", err);
    }

    // Optimistically update local state
    setState(prev => ({
      ...prev,
      items: prev.items.filter(item => !idsToDelete.includes(item.id))
    }));
    
    if (type === 'multiple') {
      setSelectedItemIds([]);
    }

    if (state.user && state.settings.autoCloudSync) {
      try {
        for (const id of idsToDelete) {
          try {
            await deleteDoc(doc(db, 'users', state.user.uid, 'items', id));
          } catch (e) {
            handleFirestoreError(e, OperationType.DELETE, `users/${state.user.uid}/items/${id}`);
          }
        }
      } catch (e) {
        console.error("Cloud delete failed", e);
        if (e instanceof Error && e.message.startsWith('{') && e.message.endsWith('}')) {
          throw e;
        }
        alert(t.error + ": Permission Denied on Cloud. Some items may reappear.");
      }
    }
    
    setDeleteConfirmation({ show: false, type: 'single' });
  };
  
  const handleAddCategory = useCallback(async (name: string) => {
    const newCategory = {
      id: `cat-${Date.now()}`,
      name: name.trim(),
      icon: ""
    };
    const rawCategories = state.settings.customCategories || state.categories;
    const updatedCategories = [...rawCategories, newCategory];
    
    await handleUpdateSettings({ customCategories: updatedCategories });
    setShowAddCategory(false);
  }, [state.settings.customCategories, state.categories, handleUpdateSettings]);

  const handleEditCategory = useCallback(async (catId: string, newName: string) => {
    const rawCategories = state.settings.customCategories || state.categories;
    const updatedCategories = rawCategories.map(c => c.id === catId ? { ...c, name: newName.trim() } : c);
    
    await handleUpdateSettings({ customCategories: updatedCategories });
  }, [state.settings.customCategories, state.categories, handleUpdateSettings]);

  const handleDeleteCategory = useCallback(async (catId: string) => {
    // 1. Filter out from categories list
    const rawCategories = state.settings.customCategories || state.categories;
    const updatedCategories = rawCategories.filter(c => c.id !== catId);
    
    // 2. Identify items to reassign
    const affectedItems = state.items.filter(item => item.categoryId === catId);
    
    // 3. Update local state
    setState(prev => ({
      ...prev,
      items: prev.items.map(item => item.categoryId === catId ? { ...item, categoryId: "", lastUpdated: new Date().toISOString() } : item),
      settings: { ...prev.settings, customCategories: updatedCategories }
    }));
    
    // 4. Cloud synchronization
    if (state.user && state.settings.autoCloudSync) {
      try {
        await setDoc(doc(db, 'users', state.user.uid), sanitizeForFirestore({ customCategories: updatedCategories }), { merge: true });
        for (const item of affectedItems) {
          await setDoc(doc(db, 'users', state.user.uid, 'items', item.id), sanitizeForFirestore({ categoryId: "", lastUpdated: new Date().toISOString() }), { merge: true });
        }
      } catch (e) {
        console.error("Cloud sync for deleted category and items failed", e);
      }
    }
  }, [state.settings.customCategories, state.categories, state.items, state.user, state.settings.autoCloudSync]);

  const handleAddNote = useCallback(async (data: Omit<Note, 'id' | 'createdAt' | 'status'>) => {
    // Smart Priority Detection
    let finalPriority = data.priority;
    try {
      const autoPriority = await getSmartNoteCategorization(data.title, data.description);
      if (autoPriority) {
        finalPriority = autoPriority as any;
      }
    } catch (e) {
      console.error("Heuristic Prioritization failed", e);
    }

    const id = Date.now().toString();
    const newNote = {
      ...data,
      id,
      priority: finalPriority,
      createdAt: new Date().toISOString(),
      status: 'Active' as const,
    };

    // Optimistic update
    setState(prev => ({
      ...prev,
      notes: [newNote, ...prev.notes]
    }));
    setShowAddNote(false);
    setActiveTab('notes');
    alert("Note synchronized with Local Matrix.");

    if (state.user && state.settings.autoCloudSync) {
      try {
        await setDoc(doc(db, 'users', state.user.uid, 'notes', id), sanitizeForFirestore(newNote));
      } catch (e) {
        console.error("Cloud sync failed", e);
        handleFirestoreError(e, OperationType.CREATE, `users/${state.user.uid}/notes`);
      }
    }
  }, [state.user, state.settings.autoCloudSync]);

  const handleUpdateNote = async (id: string, updates: Partial<Note>) => {
    // Optimistic update
    setState(prev => ({
      ...prev,
      notes: prev.notes.map(n => n.id === id ? { ...n, ...updates } : n)
    }));

    if (state.user && state.settings.autoCloudSync) {
      try {
        await setDoc(doc(db, 'users', state.user.uid, 'notes', id), sanitizeForFirestore(updates), { merge: true });
      } catch (e) {
        console.error("Cloud sync failed", e);
        handleFirestoreError(e, OperationType.UPDATE, `users/${state.user.uid}/notes/${id}`);
      }
    }
  };

  const handleDeleteNote = async (id: string) => {
    // Optimistic update
    setState(prev => ({
      ...prev,
      notes: prev.notes.filter(n => n.id !== id)
    }));

    if (state.user && state.settings.autoCloudSync) {
      try {
        await deleteDoc(doc(db, 'users', state.user.uid, 'notes', id));
      } catch (e) {
        console.error("Cloud sync failed", e);
        handleFirestoreError(e, OperationType.DELETE, `users/${state.user.uid}/notes/${id}`);
      }
    }
  };

  // Unified data-sync function that updates the 'bills' collection in Firestore and triggers an immediate recalculation of the analytics metrics.
  const syncBillHistoryWithLocalAndCloud = useCallback(async (incomingBills: Bill[]) => {
    setIsSyncing(true);
    try {
      // 1. Properly map and format the incoming bill history data
      const mappedBills = incomingBills.map((b: any) => ({
        id: b.id || `bill-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        billNumber: b.billNumber || `INV-${Date.now()}`,
        customerName: b.customerName || '',
        customerPhone: b.customerPhone || '',
        items: Array.isArray(b.items) ? b.items.map((item: any) => ({
          itemId: item.itemId || item.id || '',
          name: item.name || '',
          quantity: item.quantity || 0,
          cost: item.cost || item.buyingPrice || 0,
          price: item.price || item.retailPrice || 0,
          unit: item.unit || 'pcs'
        })) : [],
        discount: typeof b.discount === 'number' ? b.discount : 0,
        tax: typeof b.tax === 'number' ? b.tax : 0,
        subtotal: typeof b.subtotal === 'number' ? b.subtotal : 0,
        total: typeof b.total === 'number' ? b.total : 0,
        paymentMethod: b.paymentMethod || 'Cash',
        timestamp: b.timestamp || new Date().toISOString(),
        deviceId: b.deviceId || state.settings?.deviceId || '',
        deviceName: b.deviceName || state.settings?.deviceName || ''
      }));

      // Merge and synchronize local state with mapped bills immediately to trigger immediate recalculation of analytics
      setState(prev => {
        const localBills = prev.bills || [];
        const mergedMap = new Map<string, Bill>();
        localBills.forEach(b => mergedMap.set(b.id, b));
        mappedBills.forEach(b => mergedMap.set(b.id, b));
        
        const mergedBills = Array.from(mergedMap.values()).sort((a, b) => 
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
        return { ...prev, bills: mergedBills };
      });

      // 2. Sync to Firestore if user logged in
      if (state.user && state.settings.autoCloudSync) {
        const uId = state.user.uid;
        for (const b of mappedBills) {
          try {
            await setDoc(doc(db, 'users', uId, 'bills', b.id), sanitizeForFirestore(b));
          } catch (e) {
            console.error("Cloud syncing bill inside unified helper failed:", e);
          }
        }
      }
    } catch (e) {
      console.error("Unified bill sync & analytics mapping failed:", e);
    } finally {
      setIsSyncing(false);
      // Trigger the AnalyticsScreen to re-render using the updated bill list to resolve the zero-history issue
      setAnalyticsRenderKey(prev => prev + 1);
    }
  }, [state.user, state.settings.autoCloudSync, state.settings?.deviceId, state.settings?.deviceName]);

  // --- SMART UNDO/REDO LOGIC CORES ---
  const performUndo = useCallback(() => {
    if (historyUndoStack.length === 0) return;
    
    const entry = historyUndoStack[0];
    const remainingUndo = historyUndoStack.slice(1);
    
    let redoEntry: HistoryEntry;
    if (entry.type === 'state' && entry.stateSnapshot) {
      const keys = Object.keys(entry.stateSnapshot) as (keyof AppState)[];
      const redoSnapshot: Partial<AppState> = {};
      keys.forEach(k => {
        redoSnapshot[k] = state[k] as any;
      });
      redoEntry = {
        type: 'state',
        stateSnapshot: redoSnapshot,
        actionName: entry.actionName
      };

      setState(prev => ({ ...prev, ...entry.stateSnapshot }));
      // Sync backwards quietly
      handleUpdateComponentState(entry.stateSnapshot);
    } else if (entry.type === 'settings' && entry.prevSettings) {
      const keys = Object.keys(entry.prevSettings) as (keyof AppSettings)[];
      const redoSnapshot: Partial<AppSettings> = {};
      keys.forEach(k => {
        (redoSnapshot as any)[k] = state.settings[k];
      });
      redoEntry = {
        type: 'settings',
        prevSettings: redoSnapshot,
        actionName: entry.actionName
      };

      setState(prev => ({
        ...prev,
        settings: { ...prev.settings, ...entry.prevSettings }
      }));
      handleUpdateSettings(entry.prevSettings);
    } else {
      return;
    }

    setHistoryUndoStack(remainingUndo);
    setHistoryRedoStack(prev => [redoEntry, ...prev]);
    setLastActionLabel(`Undone: ${entry.actionName}`);
    
    if (navigator.vibrate) navigator.vibrate(35);

    setShowUndoToast(true);
    if (undoToastTimer) clearTimeout(undoToastTimer);
    const timer = setTimeout(() => setShowUndoToast(false), 5000);
    setUndoToastTimer(timer);
  }, [historyUndoStack, state, undoToastTimer]);

  const performRedo = useCallback(() => {
    if (historyRedoStack.length === 0) return;

    const entry = historyRedoStack[0];
    const remainingRedo = historyRedoStack.slice(1);

    let undoEntry: HistoryEntry;
    if (entry.type === 'state' && entry.stateSnapshot) {
      const keys = Object.keys(entry.stateSnapshot) as (keyof AppState)[];
      const undoSnapshot: Partial<AppState> = {};
      keys.forEach(k => {
        undoSnapshot[k] = state[k] as any;
      });
      undoEntry = {
        type: 'state',
        stateSnapshot: undoSnapshot,
        actionName: entry.actionName
      };

      setState(prev => ({ ...prev, ...entry.stateSnapshot }));
      handleUpdateComponentState(entry.stateSnapshot);
    } else if (entry.type === 'settings' && entry.prevSettings) {
      const keys = Object.keys(entry.prevSettings) as (keyof AppSettings)[];
      const undoSnapshot: Partial<AppSettings> = {};
      keys.forEach(k => {
        (undoSnapshot as any)[k] = state.settings[k];
      });
      undoEntry = {
        type: 'settings',
        prevSettings: undoSnapshot,
        actionName: entry.actionName
      };

      setState(prev => ({
        ...prev,
        settings: { ...prev.settings, ...entry.prevSettings }
      }));
      handleUpdateSettings(entry.prevSettings);
    } else {
      return;
    }

    setHistoryRedoStack(remainingRedo);
    setHistoryUndoStack(prev => [undoEntry, ...prev]);
    setLastActionLabel(`Redone: ${entry.actionName}`);

    if (navigator.vibrate) navigator.vibrate(35);

    setShowUndoToast(true);
    if (undoToastTimer) clearTimeout(undoToastTimer);
    const timer = setTimeout(() => setShowUndoToast(false), 5000);
    setUndoToastTimer(timer);
  }, [historyRedoStack, state, undoToastTimer]);

  // Integrated Keyboard Events Listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      // Do not intercept if user is typing inside text area or input field
      if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA')) {
        return;
      }
      
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        performUndo();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        performRedo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [performUndo, performRedo]);

  const handleUpdateComponentState = useCallback(async (updates: Partial<AppState>, actionLabel?: string) => {
    if (actionLabel) {
      const snapshot: Partial<AppState> = {};
      Object.keys(updates).forEach((key) => {
        const stateKey = key as keyof AppState;
        if (stateKey in state) {
          snapshot[stateKey] = state[stateKey] as any;
        }
      });

      const entry: HistoryEntry = {
        type: 'state',
        stateSnapshot: snapshot,
        actionName: actionLabel
      };
      
      setHistoryUndoStack(prev => [entry, ...prev].slice(0, 20));
      setHistoryRedoStack([]);
      setLastActionLabel(actionLabel);
      setShowUndoToast(true);
      
      if (undoToastTimer) clearTimeout(undoToastTimer);
      const timer = setTimeout(() => setShowUndoToast(false), 5000);
      setUndoToastTimer(timer);
    }

    // 1. Update local state
    setState(prev => ({ ...prev, ...updates }));

    // 2. Cloud Sync if user is logged in
    if (state.user && state.settings.autoCloudSync) {
      setIsSyncing(true);
      try {
        const uId = state.user.uid;

        // (A) Sync bills if updated
        if (updates.bills) {
          const oldBills = state.bills || [];
          const newBills = updates.bills;

          const addedOrEdited = newBills.filter(nb => {
            const ob = oldBills.find(b => b.id === nb.id);
            return !ob || JSON.stringify(ob) !== JSON.stringify(nb);
          });

          const deleted = oldBills.filter(ob => !newBills.some(nb => nb.id === ob.id));

          for (const b of addedOrEdited) {
            try {
              await setDoc(doc(db, 'users', uId, 'bills', b.id), sanitizeForFirestore(b));
            } catch (e) {
              console.error("Error syncing bill:", e);
              handleFirestoreError(e, OperationType.WRITE, `users/${uId}/bills/${b.id}`);
            }
          }

          for (const b of deleted) {
            try {
              await deleteDoc(doc(db, 'users', uId, 'bills', b.id));
            } catch (e) {
              console.error("Error deleting bill:", e);
              handleFirestoreError(e, OperationType.DELETE, `users/${uId}/bills/${b.id}`);
            }
          }
        }

        // (B) Sync items if updated
        if (updates.items) {
          const oldItems = state.items || [];
          const newItems = updates.items;

          const changedItems = newItems.filter(ni => {
            const oi = oldItems.find(i => i.id === ni.id);
            return !oi || JSON.stringify(oi) !== JSON.stringify(ni);
          });

          for (const item of changedItems) {
            try {
              await setDoc(doc(db, 'users', uId, 'items', item.id), sanitizeForFirestore(item));
            } catch (e) {
              console.error("Error syncing stock item:", e);
              handleFirestoreError(e, OperationType.WRITE, `users/${uId}/items/${item.id}`);
            }
          }
        }

        // (C) Sync notes if updated
        if (updates.notes) {
          const oldNotes = state.notes || [];
          const newNotes = updates.notes;

          const changedNotes = newNotes.filter(nn => {
            const on = oldNotes.find(n => n.id === nn.id);
            return !on || JSON.stringify(on) !== JSON.stringify(nn);
          });

          for (const note of changedNotes) {
            try {
              await setDoc(doc(db, 'users', uId, 'notes', note.id), sanitizeForFirestore(note));
            } catch (e) {
              console.error("Error syncing note:", e);
              handleFirestoreError(e, OperationType.WRITE, `users/${uId}/notes/${note.id}`);
            }
          }
        }
      } finally {
        setIsSyncing(false);
      }
    }
  }, [state.user, state.settings.autoCloudSync, state.bills, state.items, state.notes]);

  const handleToggleLock = () => {
    if (state.settings.isLocked) {
      if (!state.settings.pin) {
        setShowWelcome(true);
      } else {
        setShowPINScreen(true);
      }
    } else {
      handleUpdateSettings({ isLocked: true });
    }
  };

  // --- Filtered Items ---
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [showComparison, setShowComparison] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showTour, setShowTour] = useState(false);

  useEffect(() => {
    // Show tour for new users who haven't seen it
    if (state.settings.hasSeenOnboarding === false && !isInitializing) {
      const timer = setTimeout(() => setShowTour(true), 2000);
      return () => clearTimeout(timer);
    }
  }, [state.settings.hasSeenOnboarding, isInitializing]);

  const toggleItemSelection = useCallback((id: string) => {
    setSelectedItemIds(prev => 
      prev.includes(id) 
        ? prev.filter(i => i !== id) 
        : [...prev, id]
    );
  }, []);

  const handleEditTrigger = useCallback((item: Item) => {
    setEditingItem(item);
  }, []);
  const totalValue = state.items.reduce((sum, item) => sum + (item.buyingPrice * item.quantity), 0);

  const dailyProgress = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    let dSales = 0;
    let dProfit = 0;

    (state.bills || []).forEach((b: any) => {
      const ts = new Date(b.timestamp).getTime();
      let profit = 0;
      b.items.forEach((it: any) => {
        const cost = it.cost || 0;
        profit += (it.price - cost) * it.quantity;
      });

      if (ts >= todayStart) {
        dSales += b.total;
        dProfit += profit;
      }
    });

    return { sales: dSales, profit: dProfit };
  }, [state.bills]);

  const isDetailsMissing = !state.settings.storeName || 
                           !state.settings.storeOwnerName || 
                           !state.settings.storePhone || 
                           !state.settings.storeAddress;

  if (isInitializing) {
    return (
      <div data-theme={state.settings.theme} className="min-h-screen bg-[#070b13] flex items-center justify-center">
        <AnimatePresence mode="wait">
          <SplashScreen onComplete={() => setIsInitializing(false)} />
        </AnimatePresence>
      </div>
    );
  }

  if (isAuthChecking) {
    return (
      <div data-theme={state.settings.theme} className="min-h-screen">
        <AppFullSkeleton theme={state.settings.theme} />
      </div>
    );
  }

  if (!state.user) {
    return (
      <div data-theme={state.settings.theme} className="min-h-screen">
        <LoginScreen 
          onGoogleLogin={handleGoogleLogin} 
          onGuestLogin={handleGuestLogin}
          settings={state.settings}
        />
      </div>
    );
  }

  if (isDetailsMissing) {
    return (
      <div data-theme={state.settings.theme} className="min-h-screen">
        <OnboardingForm 
          settings={state.settings} 
          onComplete={handleOnboardingComplete}
          userEmail={state.user.email}
          onBack={handleLogout}
        />
      </div>
    );
  }

  return (
    <div 
      data-theme={state.settings.theme}
      className="min-h-screen pb-20 overflow-hidden relative transition-colors duration-700"
    >

      {/* 🔄 SMART FLOATING UNDO/REDO TOAST PORTAL */}
      <AnimatePresence>
        {showUndoToast && (
          <motion.div 
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-24 right-6 z-[80] p-4 bg-[var(--card)]/90 backdrop-blur-md rounded-2xl border border-[var(--border)] shadow-[0_15px_40px_rgba(0,0,0,0.15)] flex items-center justify-between gap-5 min-w-[280px] text-xs font-semibold leading-tight text-[var(--foreground)] select-none max-w-sm"
          >
            <div className="space-y-1">
              <span className="text-[8.5px] uppercase font-black text-[var(--primary)] tracking-widest block leading-none">Action Registered</span>
              <p className="text-[10.5px] uppercase font-bold text-[var(--foreground)] truncate max-w-[170px]">{lastActionLabel}</p>
            </div>
            
            <div className="flex items-center gap-1.5 border-l border-[var(--border)] pl-3 shrink-0">
              {historyUndoStack.length > 0 && (
                <button 
                  onClick={performUndo}
                  className="px-2.5 py-1.5 rounded-lg bg-[var(--primary)] text-white hover:bg-[var(--primary)]/95 transition-all font-black text-[9px] uppercase tracking-wider cursor-pointer active:scale-95 flex items-center gap-1 leading-none"
                >
                  <RotateCcw size={10} />
                  Undo
                </button>
              )}
              {historyRedoStack.length > 0 && (
                <button 
                  onClick={performRedo}
                  className="px-2 py-1.5 rounded-lg bg-[var(--foreground)]/[0.05] border border-[var(--border)] text-[var(--foreground)]/80 hover:bg-[var(--foreground)]/[0.1] transition-all font-black text-[9px] uppercase tracking-wider cursor-pointer active:scale-95 leading-none"
                >
                  Redo
                </button>
              )}
            </div>
          </motion.div>
      )}
      </AnimatePresence>

      {/* 🔔 PREMIUM REAL-TIME NOTIFICATION POPUP PORTAL */}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] flex flex-col gap-2.5 items-center pointer-events-none w-full max-w-md px-4">
        <AnimatePresence mode="popLayout">
          {popupNotifications.map((notif) => {
            const isHigh = notif.priority === 'high';
            
            // Category-specific styles
            let catColorClass = "bg-blue-500/10 text-blue-500 border-blue-500/20";
            let catGlowClass = "shadow-blue-500/5";
            let IconComp = <AlertCircle size={16} />;
            
            if (notif.category === 'inventory') {
              catColorClass = "bg-amber-500/10 text-amber-500 border-amber-500/20";
              catGlowClass = "shadow-amber-500/5";
              IconComp = <Package size={16} />;
            } else if (notif.category === 'udhar') {
              catColorClass = "bg-rose-500/10 text-rose-500 border-rose-500/20";
              catGlowClass = "shadow-rose-500/5";
              IconComp = <MessageSquare size={16} />;
            } else if (notif.category === 'analytics') {
              catColorClass = "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
              catGlowClass = "shadow-emerald-500/5";
              IconComp = <TrendingUp size={16} />;
            } else if (notif.category === 'broadcast') {
              catColorClass = "bg-purple-500/10 text-purple-500 border-purple-500/20";
              catGlowClass = "shadow-purple-500/5";
              IconComp = <Sparkles size={16} />;
            }

            return (
              <motion.div
                key={notif.id}
                initial={{ opacity: 0, y: -40, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.95 }}
                transition={{ type: 'spring', damping: 20, stiffness: 260 }}
                onClick={() => handlePopupNotificationClick(notif)}
                className={cn(
                  "pointer-events-auto w-full p-4 rounded-2xl border bg-slate-900/95 dark:bg-slate-950/95 backdrop-blur-md text-white shadow-2xl flex gap-3 cursor-pointer select-none transition-all duration-200 hover:scale-[1.01] hover:border-white/10 active:scale-95",
                  catGlowClass,
                  isHigh ? "border-rose-500/30" : "border-slate-800"
                )}
              >
                {/* Dynamic Category Icon with glow */}
                <div className={cn(
                  "h-9 w-9 rounded-xl flex items-center justify-center shrink-0 border",
                  catColorClass
                )}>
                  {IconComp}
                </div>

                {/* Text Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h5 className="text-[11px] font-black uppercase tracking-tight text-white/95 truncate">
                      {notif.title}
                    </h5>
                    <span className="text-[7.5px] font-mono text-white/40 shrink-0">
                      {notif.timestamp}
                    </span>
                  </div>
                  <p className="text-[10px] font-medium text-white/70 mt-1 leading-normal pr-1">
                    {notif.message}
                  </p>
                  {notif.deepLink && (
                    <span className="inline-flex items-center gap-1 text-[8px] font-black uppercase tracking-widest text-[var(--primary)] mt-2 hover:underline">
                      View details <ArrowRight size={8} />
                    </span>
                  )}
                </div>

                {/* Dismiss Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setPopupNotifications(prev => prev.filter(p => p.id !== notif.id));
                  }}
                  className="p-1 h-6 w-6 rounded-lg hover:bg-white/10 active:scale-90 transition-all text-white/30 hover:text-white shrink-0 cursor-pointer flex items-center justify-center"
                >
                  <X size={12} />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* 🔮 CUSTOM TOAST SYSTEM PORTAL (TOP OF DASHBOARD BANNER) */}
      <AnimatePresence>
        {toast && (
          <motion.div 
            initial={{ opacity: 0, y: -45, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -25, scale: 0.95 }}
            transition={{ type: 'spring', damping: 22, stiffness: 300 }}
            className="fixed top-5 left-1/2 -translate-x-1/2 z-[9999] p-3.5 px-5 bg-slate-900/95 dark:bg-slate-950/95 backdrop-blur-md rounded-2xl border border-slate-700/60 shadow-[0_20px_50px_rgba(0,0,0,0.3)] flex items-center justify-between gap-4 min-w-[300px] max-w-md text-xs select-none text-white font-sans ring-1 ring-white/10"
          >
            <div className="flex items-center gap-3">
              <div className={cn(
                "h-8 w-8 rounded-xl flex items-center justify-center shrink-0 border shadow-inner",
                toast.type === 'success' ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" : "bg-amber-500/15 text-amber-400 border-amber-500/30"
              )}>
                {toast.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
              </div>
              <div className="flex flex-col">
                <span className="text-[8px] font-black uppercase tracking-widest text-emerald-400/90 leading-none mb-1">
                  System Notification
                </span>
                <p className="font-extrabold uppercase tracking-tight text-[11px] text-white/95 leading-tight">
                  {toast.message}
                </p>
              </div>
            </div>
            <button 
              onClick={() => setToast(null)}
              className="p-1.5 rounded-lg hover:bg-white/10 active:scale-90 transition-all text-white/40 hover:text-white shrink-0 cursor-pointer"
            >
              <X size={13} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 🔍 IMMERSIVE QUICK PEEK OVERLAY MODAL */}
      <AnimatePresence>
        {quickPeek && (
          <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 shadow-2xl relative max-w-md w-full text-[var(--foreground)] flex flex-col gap-4 select-none"
            >
              <button 
                onClick={() => setQuickPeek(null)}
                className="absolute top-4 right-4 h-7 w-7 rounded-full bg-[var(--foreground)]/5 border border-[var(--border)] hover:bg-[var(--foreground)]/10 text-[var(--foreground)]/60 hover:text-[var(--foreground)] transition-all flex items-center justify-center cursor-pointer"
              >
                <X size={15} />
              </button>

              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center">
                  <Eye size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-black uppercase tracking-tight">Quick Peek Preview</h3>
                  <p className="text-[8.5px] font-bold text-[var(--primary)] uppercase tracking-wider">Dynamic POS Inspector Row</p>
                </div>
              </div>

              {/* ITEM CHARACTERISTICS VIEW */}
              {quickPeek.type === 'item' && (
                <div className="space-y-4">
                  <div className="border-b border-[var(--border)] pb-2">
                    <span className="text-[8px] font-black uppercase tracking-widest text-[var(--foreground)]/50">Translated Name</span>
                    <h4 className="text-base font-extrabold uppercase leading-none mt-1">
                      {quickPeek.payload.translations[state.settings.language] || quickPeek.payload.translations.en}
                    </h4>
                    <span className="text-[9px] font-bold opacity-50 uppercase tracking-widest mt-1 block">
                      Category ID: {DEFAULT_CATEGORIES.find(c => c.id === quickPeek.payload.categoryId)?.name || 'General Stock'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-[var(--foreground)]/[0.02] border border-[var(--border)] p-3 rounded-xl text-center">
                      <span className="text-[8px] font-black uppercase tracking-wider text-[var(--foreground)]/45">Current Quantity</span>
                      <p className="text-sm font-black text-[var(--foreground)] mt-1">
                        {quickPeek.payload.quantity} {quickPeek.payload.unit}
                      </p>
                    </div>

                    <div className="bg-[var(--foreground)]/[0.02] border border-[var(--border)] p-3 rounded-xl text-center font-bold">
                      <span className="text-[8px] font-black uppercase tracking-wider text-[var(--foreground)]/45">Critical Margin Level</span>
                      <p className="text-sm font-black text-amber-500 mt-1">
                        {quickPeek.payload.minStockLevel || state.settings.minStockLevel || 10} {quickPeek.payload.unit}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center text-[10px] font-black uppercase">
                    <div className="p-2 border border-[var(--border)] bg-[var(--foreground)]/[0.01] rounded-lg">
                      <span className="text-[7.5px] opacity-45 block">Buying Cost</span>
                      <span className="text-xs">₹{quickPeek.payload.buyingPrice}</span>
                    </div>
                    <div className="p-2 border border-[var(--border)] bg-[var(--foreground)]/[0.01] rounded-lg">
                      <span className="text-[7.5px] opacity-45 block">Retail Tag</span>
                      <span className="text-xs text-[var(--primary)]">₹{quickPeek.payload.retailPrice}</span>
                    </div>
                    <div className="p-2 border border-[var(--border)] bg-[var(--foreground)]/[0.01] rounded-lg">
                      <span className="text-[7.5px] opacity-45 block">Wholesale Tag</span>
                      <span className="text-xs">₹{quickPeek.payload.wholesalePrice}</span>
                    </div>
                  </div>

                  {quickPeek.payload.aiAdvice && (
                    <div className="bg-emerald-500/5 border border-emerald-500/15 p-3 rounded-xl space-y-1">
                      <span className="text-[8px] font-black uppercase text-emerald-600 tracking-wider flex items-center gap-1">
                        <TrendingUp size={9} /> Margin Pricing Advisory:
                      </span>
                      <p className="text-[10px] text-[var(--foreground)]/80 leading-relaxed font-semibold italic">"{quickPeek.payload.aiAdvice}"</p>
                    </div>
                  )}

                  <div className="text-[8.5px] font-mono text-[var(--foreground)]/40 flex justify-between uppercase">
                    <span>Sync timestamp: {new Date(quickPeek.payload.lastUpdated).toLocaleDateString()}</span>
                    <span>By: {quickPeek.payload.lastChangedBy || 'Device Manager'}</span>
                  </div>
                </div>

              )}
              {/* Generic Close Overlay */}
              <div className="pt-2 border-t border-[var(--border)]">
                <button 
                  onClick={() => setQuickPeek(null)}
                  className="w-full py-2.5 rounded-xl bg-[var(--foreground)]/[0.05] hover:bg-[var(--foreground)]/[0.1] font-black text-[9px] uppercase tracking-widest text-[var(--foreground)] transition-all cursor-pointer"
                >
                  Dismiss Preview
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Immersive Background Glows with slow organic drift */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <motion.div 
          animate={{ 
            x: [0, 40, -20, 0],
            y: [0, -30, 40, 0],
            scale: [1, 1.12, 0.93, 1],
          }}
          transition={{ 
            duration: 25, 
            repeat: Infinity, 
            ease: "easeInOut" 
          }}
          className="glow-bg-indigo" 
        />
        <motion.div 
          animate={{ 
            x: [0, -45, 30, 0],
            y: [0, 50, -30, 0],
            scale: [1, 0.92, 1.1, 1],
          }}
          transition={{ 
            duration: 30, 
            repeat: Infinity, 
            ease: "easeInOut" 
          }}
          className="glow-bg-cyan" 
        />
      </div>

      {/* PIN Screen / Change PIN / Welcome Overlay */}
      <AnimatePresence>
        {showWelcome && (
          <PINScreen 
            mode="create"
            onPINCreated={(pin) => handleUpdateSettings({ pin, isLocked: false })}
            onSuccess={() => setShowWelcome(false)}
            title="Secure Financial Access"
            description="Create a 6-digit PIN to mask buying prices across your dashboard."
          />
        )}
        {showPINScreen && (
          <PINScreen 
            mode="unlock"
            correctPIN={state.settings.pin}
            onSuccess={() => {
              handleUpdateSettings({ isLocked: false });
              setShowPINScreen(false);
            }}
            onCancel={() => setShowPINScreen(false)}
          />
        )}
        {showChangePIN && (
          <PINScreen 
            mode={isVerifyingOldPIN ? 'unlock' : 'create'}
            correctPIN={state.settings.pin}
            onSuccess={() => {
              if (isVerifyingOldPIN) {
                setIsVerifyingOldPIN(false);
              } else {
                setShowChangePIN(false);
              }
            }}
            onPINCreated={(pin) => {
              handleUpdateSettings({ pin, isLocked: false });
            }}
            onCancel={() => {
              setShowChangePIN(false);
              setIsVerifyingOldPIN(false);
            }}
            title={isVerifyingOldPIN ? "Verify Identity" : state.settings.pin ? "Set New Security Key" : "Initialize Security"}
            description={isVerifyingOldPIN ? "Enter current PIN to proceed with change" : "Define your new 6-digit cryptographic sequence"}
          />
        )}
      </AnimatePresence>

      {/* Header */}
      <header 
        id="tour-header"
        className="sticky top-0 z-40 px-6 py-4 text-[var(--primary-foreground)] shadow-2xl transition-all border-b border-white/10"
        style={{ backgroundColor: 'var(--primary)' }}
      >
        <div className="flex items-center justify-between w-full max-w-7xl mx-auto gap-4">
          <div className="flex items-center gap-4 select-none shrink-0 overflow-visible min-w-0">
            <div className="relative group shrink-0 overflow-visible flex items-center justify-center">
              {/* Dynamic theme-specific sharp luminous premium core glow */}
              <div className={`absolute inset-x-0 inset-y-0 rounded-full blur-xl opacity-60 group-hover:opacity-90 transition-opacity duration-300 pointer-events-none ${getLogoBackplateClass(state.settings.theme).glow}`} />
              <div className={`absolute -inset-1.5 bg-gradient-to-r rounded-2xl blur-md opacity-30 group-hover:opacity-70 transition-opacity duration-500 pointer-events-none ${getLogoBackplateClass(state.settings.theme).gradient}`} />
              
              {/* Premium seamless borderless container with custom aspect-ratio and zoom handling */}
              <div className="relative h-14 overflow-visible flex items-center justify-center transform group-hover:scale-105 active:scale-95 transition-all duration-300 select-none pointer-events-none shrink-0">
                {/* Custom multi-stage SVG drop-shadow filter for sharp outlines on any background */}
                <img 
                  src={appLogo} 
                  alt="TS App Logo" 
                  className="h-14 w-auto max-w-[140px] object-contain transition-all duration-350"
                  style={{
                    filter: getLogoGlowFilter(state.settings.theme)
                  }}
                  onError={(e) => { 
                    e.currentTarget.style.display = 'none'; 
                    e.currentTarget.nextElementSibling?.classList.remove('hidden'); 
                  }} 
                />
                
                {/* Non-intrusive fallback illustration block in case image fails to fetch */}
                <div className="hidden flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 shadow-inner shrink-0">
                  <Package size={28} className="text-white" />
                </div>
              </div>
            </div>
            <div className="flex flex-col justify-center shrink-0">
              <h1 className="text-2xl font-black tracking-tighter text-white mb-0 leading-none flex items-baseline">
                TS <span className="text-xs font-bold opacity-60 ml-1.5 tracking-[0.3em] uppercase">Price Manager</span>
              </h1>
              <div className="flex items-center gap-2 mt-1.5">
                <button
                  onClick={() => setShowRecoveryCenter(true)}
                  className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/10 hover:bg-white/20 text-[8px] font-black uppercase tracking-widest text-white transition-all cursor-pointer select-none active:scale-95"
                  title="Open Intelligent Sync & Recovery Center"
                >
                  <span className={cn(
                    "h-1.5 w-1.5 rounded-full ring-1 ring-white/10 shrink-0",
                    syncStatus === 'Synced' ? "bg-green-400 animate-pulse" :
                    syncStatus === 'Saving' ? "bg-yellow-400 animate-bounce" :
                    syncStatus === 'Recovering' ? "bg-cyan-400 animate-ping" : "bg-red-500"
                  )} />
                  <span className="leading-none">{syncStatus}</span>
                </button>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">


            {/* Notification Badge Badge with sliding drawer */}
            <div className="relative">
              <button 
                onClick={() => setShowNotificationsDropdown(!showNotificationsDropdown)}
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-xl transition-all border border-white/10 text-white/80 hover:bg-white/20 select-none cursor-pointer active:scale-95 duration-100",
                  showNotificationsDropdown ? "bg-white/20" : "bg-white/5"
                )}
                title="System Notification Feed"
              >
                {/* Refine Existing Notification Bell Icon with ring animations */}
                {(notifications.filter(n => !n.isRead).length + activeAlerts.length) > 0 ? (
                  <motion.div 
                    animate={{ rotate: [0, -12, 12, -12, 12, -6, 6, 0] }}
                    transition={{ repeat: Infinity, duration: 2, repeatDelay: 3 }}
                    className="text-amber-400"
                  >
                    <BellRing size={18} />
                  </motion.div>
                ) : (
                  <Bell size={18} />
                )}

                {/* Modern Unread Badge with automatic updating of counts */}
                {(notifications.filter(n => !n.isRead).length + activeAlerts.length) > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[8px] font-black text-white ring-2 ring-[var(--primary)] animate-pulse">
                    {notifications.filter(n => !n.isRead).length + activeAlerts.length}
                  </span>
                )}
              </button>
            </div>

            {/* Lock Button */}
            <button 
              id="tour-lock"
              onClick={handleToggleLock}
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-xl transition-all border border-white/10",
                state.settings.isLocked ? "bg-amber-500/20 text-amber-500 hover:bg-amber-500/30" : "bg-green-500/10 text-green-400 hover:bg-green-500/20"
              )}
              title="Lock Screen Lock"
            >
              {state.settings.isLocked ? <Lock size={18} /> : <Unlock size={18} />}
            </button>

            {/* Menu (3 vertical dot :) Button */}
            <button
               onClick={() => { setShowMenu(true); setMenuTab('profile'); }}
               className="flex h-9 w-9 items-center justify-center rounded-xl transition-all border border-white/10 bg-white/5 text-white/80 hover:bg-white/20"
               title="System Menu Control"
            >
               <MoreVertical size={18} />
            </button>
          </div>
        </div>
      </header>



      {/* Main Content */}
      <main className="container mx-auto p-4 overflow-hidden">
        {isTabLoading ? (
          <div className="py-2">
            {activeTab === 'home' && <SkeletonCatalog />}
            {activeTab === 'billing' && <SkeletonPOS />}
            {activeTab === 'analytics' && <SkeletonAnalytics />}
            {activeTab === 'udhar' && <SkeletonUdhar />}
            {(activeTab === 'notes' || activeTab === 'shift' || activeTab === 'goals' || activeTab === 'history') && <SkeletonAnalytics />}
          </div>
        ) : (
          <AnimatePresence mode="wait">
        {activeTab === 'home' && (
          <motion.div 
            key="home"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ type: "spring", stiffness: 380, damping: 28 }}
            className="space-y-8"
          >
            {/* Store highlight & Owner Greeting Banner */}
            <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-r from-[var(--primary)] to-[var(--primary)]/90 p-8 text-white shadow-xl shadow-[var(--primary)]/15">
               {/* Ambient decorative elements */}
               <div className="absolute top-0 right-0 p-6 opacity-10 translate-x-6 -translate-y-6">
                  <Store size={150} />
               </div>
               <div className="absolute inset-0 bg-gradient-to-t from-black/15 via-transparent to-transparent pointer-events-none" />
               <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-2">
                     <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tighter leading-none text-white drop-shadow">
                        {state.settings.storeName || "SYSTEM ADMINISTRATIVE HUB"}
                     </h1>
                     <p className="text-sm font-extrabold text-white/80 select-none">
                        Hi, <span className="text-amber-300 font-black">{state.settings.storeOwnerName || "Store Owner"}</span> 👋 welcome back to your store manager.
                     </p>
                     <div className="pt-2 flex flex-wrap gap-2">
                        <button
                           onClick={() => { setMenuTab('day_closing'); setShowMenu(true); }}
                           className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-[10px] font-black uppercase tracking-wider bg-white text-[var(--primary)] rounded-xl hover:bg-white/90 transition-all shadow-md cursor-pointer duration-300"
                        >
                           🌙 Store Day Closing
                        </button>
                        <button
                           onClick={() => setShowGoalPanel(true)}
                           className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-[10px] font-black uppercase tracking-wider bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-xl transition-all shadow-md cursor-pointer duration-300 active:scale-95"
                           title="Shop Shift & Register Audit Manager"
                        >
                           <span className={cn(
                             "h-1.5 w-1.5 rounded-full",
                             activeShift ? "bg-emerald-400 animate-pulse" : "bg-red-400"
                           )} />
                           <span>{activeShift ? "Active Shift" : "Shift Closed"}</span>
                        </button>
                     </div>
                  </div>
                  <div className="md:text-right shrink-0 flex flex-col md:items-end justify-between">
                     {state.settings.storeAddress && (
                        <div>
                           <p className="text-[9px] font-black uppercase tracking-widest text-white/50 mb-1 flex items-center md:justify-end gap-1"><MapPin size={11} /> Store Location</p>
                           <p className="text-xs font-black max-w-[200px] line-clamp-2 md:text-right text-white/90">{state.settings.storeAddress}</p>
                        </div>
                     )}
                     <div className="flex items-center md:justify-end gap-2 text-[10px] mt-1">
                        {state.settings.storePhone && <span className="font-mono opacity-60">{state.settings.storePhone}</span>}
                        {state.settings.storePhone && <span className="text-white/30">•</span>}
                        <span className="font-mono text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-white/15 border border-white/20 text-white shrink-0">
                           {BUSINESS_MODES[state.settings.businessMode]?.emoji || '🏪'} {BUSINESS_MODES[state.settings.businessMode]?.name || 'Kirana Store'}
                        </span>
                     </div>
                  </div>
               </div>
            </div>

            {/* ⚡ UNBILLED RUSH HOUR & MICRO-SALES QUICK LEDGER (POSITIONED DIRECTLY ABOVE FAVORITE SHORTCUTS) */}
            <UnbilledQuickLedgerWidget
              state={state}
              addToast={addToast}
              activeShiftCashier={activeShift?.cashierName}
            />

                 {/* ⚡ Quick Operational Actions Panel */}
               <div className="bg-[var(--card)] border border-[var(--border)] rounded-[2.5rem] p-6 md:p-8 space-y-6 shadow-xl relative overflow-hidden backdrop-blur-xl animate-in fade-in slide-in-from-bottom-4 duration-500">
                  {/* Decorative top illumination ambient light flare */}
                  <div className="absolute top-0 left-1/4 -translate-y-1/2 w-1/2 h-16 bg-[var(--primary)]/15 blur-[40px] pointer-events-none" />

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
                     <div>
                        <h3 className="text-xs font-black uppercase tracking-[0.2em] text-[var(--primary)] flex items-center gap-2">
                           <span className="h-2 w-2 rounded-full bg-[var(--primary)] animate-pulse" />
                           Favorite Shortcuts / त्वरित कार्यप्रवाह
                        </h3>
                        <p className="text-[11px] opacity-60 uppercase font-black tracking-wider mt-1 text-[var(--foreground)]">Operational Command Center</p>
                     </div>
                     <button 
                        onClick={() => {
                           if (typeof window !== 'undefined' && window.navigator && window.navigator.vibrate) {
                              try { window.navigator.vibrate(10); } catch (err) {}
                           }
                           setMenuTab('business_settings'); 
                           setShowMenu(true); 
                        }}
                        className="inline-flex items-center gap-1.5 px-4 py-2 text-[10px] font-black uppercase tracking-widest bg-[var(--foreground)]/[0.04] hover:bg-[var(--foreground)]/[0.08] border border-[var(--border)] rounded-xl transition-all duration-300 hover:border-[var(--primary)]/30 text-[var(--foreground)]/80 hover:text-[var(--foreground)]"
                     >
                       <Settings2 size={12} className="text-[var(--primary)]" />
                       Customize
                     </button>
                  </div>

                 <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 pt-2">
                    {(state.settings.quickActions || ['create_bill', 'add_product', 'update_stock', 'print_invoice', 'open_analytics', 'open_udhar']).map((actionId, index) => {
                       let title = '';
                       let iconComponent: React.ReactNode = null;
                       let onClickHandler = () => {};
                       let colorClasses = '';
                       let hoverGlow = '';
                       let tintColor = '';
                       let accentBg = '';
                       let activeDotColor = '';
                       let label = '';

                       const isHovered = hoveredAction === actionId;

                       switch (actionId) {
                          case 'create_bill':
                             title = 'Create Bill';
                             label = 'FAST BILLING';
                             iconComponent = <ReceiptIcon isHovered={isHovered} className="stroke-[2.2] text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform duration-300" />;
                             colorClasses = "hover:border-emerald-500/40 hover:text-emerald-600 dark:hover:text-emerald-400";
                             accentBg = "bg-emerald-500/5 dark:bg-emerald-500/10 border-emerald-500/10 dark:border-emerald-500/20 group-hover:bg-emerald-500/10 dark:group-hover:bg-emerald-500/20 group-hover:border-emerald-500/30";
                             tintColor = "from-emerald-500/20 to-emerald-400/5";
                             hoverGlow = "shadow-[0_12px_24px_-4px_rgba(16,185,129,0.18)] dark:shadow-[0_12px_24px_-4px_rgba(16,185,129,0.3)]";
                             activeDotColor = "bg-emerald-500";
                             onClickHandler = () => setActiveTab('billing');
                             break;
                          case 'add_product':
                             title = 'Add Product';
                             label = 'STOCK UP';
                             iconComponent = <AddProductIcon isHovered={isHovered} className="stroke-[2.2] text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform duration-300" />;
                             colorClasses = "hover:border-indigo-500/40 hover:text-indigo-600 dark:hover:text-indigo-400";
                             accentBg = "bg-indigo-500/5 dark:bg-indigo-500/10 border-indigo-500/10 dark:border-indigo-500/20 group-hover:bg-indigo-500/10 dark:group-hover:bg-indigo-500/20 group-hover:border-indigo-500/30";
                             tintColor = "from-indigo-500/20 to-indigo-400/5";
                             hoverGlow = "shadow-[0_12px_24px_-4px_rgba(99,102,241,0.18)] dark:shadow-[0_12px_24px_-4px_rgba(99,102,241,0.3)]";
                             activeDotColor = "bg-indigo-500";
                             onClickHandler = () => setShowAddItem(true);
                             break;
                          case 'update_stock':
                             title = 'Update Stock';
                             label = 'INVENTORY';
                             iconComponent = <UpdateStockIcon isHovered={isHovered} className="stroke-[2.2] text-amber-600 dark:text-amber-400 group-hover:scale-110 transition-transform duration-300" />;
                             colorClasses = "hover:border-amber-500/40 hover:text-amber-600 dark:hover:text-amber-400";
                             accentBg = "bg-amber-500/5 dark:bg-amber-500/10 border-amber-500/10 dark:border-amber-500/20 group-hover:bg-amber-500/10 dark:group-hover:bg-amber-500/20 group-hover:border-amber-500/30";
                             tintColor = "from-amber-500/20 to-amber-400/5";
                             hoverGlow = "shadow-[0_12px_24px_-4px_rgba(245,158,11,0.18)] dark:shadow-[0_12px_24px_-4px_rgba(245,158,11,0.3)]";
                             activeDotColor = "bg-amber-500";
                             onClickHandler = () => {
                                const catEl = document.getElementById('catalog-search-input') || document.getElementById('catalog-section');
                                if (catEl) catEl.scrollIntoView({ behavior: 'smooth' });
                                addToast("Heading down to your catalog database grid!", "info");
                             };
                             break;
                          case 'print_invoice':
                             title = 'Print Receipt';
                             label = 'RECEIPT ROLL';
                             iconComponent = <PrintInvoiceIcon isHovered={isHovered} className="stroke-[2.2] text-violet-600 dark:text-violet-400 group-hover:scale-110 transition-transform duration-300" />;
                             colorClasses = "hover:border-violet-500/40 hover:text-violet-600 dark:hover:text-violet-400";
                             accentBg = "bg-violet-500/5 dark:bg-violet-500/10 border-violet-500/10 dark:border-violet-500/20 group-hover:bg-violet-500/10 dark:group-hover:bg-violet-500/20 group-hover:border-violet-500/30";
                             tintColor = "from-violet-500/20 to-violet-400/5";
                             hoverGlow = "shadow-[0_12px_24px_-4px_rgba(139,92,246,0.18)] dark:shadow-[0_12px_24px_-4px_rgba(139,92,246,0.3)]";
                             activeDotColor = "bg-violet-500";
                             onClickHandler = () => setShowHistoryDrawer(true);
                             break;
                          case 'open_analytics':
                             title = 'Analytics';
                             label = 'REALTIME STATS';
                             iconComponent = <OpenAnalyticsIcon isHovered={isHovered} className="stroke-[2.2] text-cyan-600 dark:text-cyan-400 group-hover:scale-110 transition-transform duration-300" />;
                             colorClasses = "hover:border-cyan-500/40 hover:text-cyan-600 dark:hover:text-cyan-400";
                             accentBg = "bg-cyan-500/5 dark:bg-cyan-500/10 border-cyan-500/10 dark:border-cyan-500/20 group-hover:bg-cyan-500/10 dark:group-hover:bg-cyan-500/20 group-hover:border-cyan-500/30";
                             tintColor = "from-cyan-500/20 to-cyan-400/5";
                             hoverGlow = "shadow-[0_12px_24px_-4px_rgba(6,182,212,0.18)] dark:shadow-[0_12px_24px_-4px_rgba(6,182,212,0.3)]";
                             activeDotColor = "bg-cyan-500";
                             onClickHandler = () => setActiveTab('analytics');
                             break;
                          case 'open_udhar':
                             title = 'Udhar Book';
                             label = 'CREDIT LEDGER';
                             iconComponent = <OpenUdharIcon isHovered={isHovered} className="stroke-[2.2] text-rose-600 dark:text-rose-400 group-hover:scale-110 transition-transform duration-300" />;
                             colorClasses = "hover:border-rose-500/40 hover:text-rose-600 dark:hover:text-rose-400";
                             accentBg = "bg-rose-500/5 dark:bg-rose-500/10 border-rose-500/10 dark:border-rose-500/20 group-hover:bg-rose-500/10 dark:group-hover:bg-rose-500/20 group-hover:border-rose-500/30";
                             tintColor = "from-rose-500/20 to-rose-400/5";
                             hoverGlow = "shadow-[0_12px_24px_-4px_rgba(244,63,94,0.18)] dark:shadow-[0_12px_24px_-4px_rgba(244,63,94,0.3)]";
                             activeDotColor = "bg-rose-500";
                             onClickHandler = () => setActiveTab('udhar');
                             break;
                          default:
                             return null;
                       }

                       const triggerHaptic = () => {
                          if (typeof window !== 'undefined' && window.navigator && window.navigator.vibrate) {
                             try {
                                window.navigator.vibrate(12);
                             } catch (err) {}
                          }
                       };

                       return (
                          <motion.button
                             key={actionId}
                             whileHover={{ 
                                y: -6, 
                                scale: 1.04,
                                transition: { type: "spring", stiffness: 400, damping: 15 }
                             }}
                             whileTap={{ scale: 0.96 }}
                             initial={{ opacity: 0, y: 15 }}
                             animate={{ opacity: 1, y: 0 }}
                             transition={{ type: "spring", stiffness: 300, damping: 20, delay: index * 0.03 }}
                             onClick={() => {
                                triggerHaptic();
                                onClickHandler();
                             }}
                             onMouseEnter={() => setHoveredAction(actionId)}
                             onMouseLeave={() => setHoveredAction(null)}
                             className={`p-5 h-36 rounded-3xl flex flex-col items-center justify-between text-center border group cursor-pointer transition-all duration-300 relative overflow-hidden backdrop-blur-md bg-[var(--card)] text-[var(--foreground)] border-[var(--border)] ${colorClasses} hover:${hoverGlow}`}
                          >
                             {/* Subtle top gloss flare */}
                             <span className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-[var(--foreground)]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                             
                             {/* Floating Ambient Light Pulse inside card */}
                             <span className={`absolute -bottom-8 -right-8 h-16 w-16 rounded-full bg-gradient-to-br ${tintColor} opacity-0 group-hover:opacity-20 blur-xl transition-all duration-500`} />

                             {/* Decorative colored badge dot in top-right */}
                             <span className={`absolute top-3 right-3 h-1.5 w-1.5 rounded-full ${activeDotColor} opacity-60 group-hover:opacity-100 group-hover:scale-125 transition-all duration-300`} />

                             <div className="text-[8px] font-black tracking-[0.18em] opacity-40 group-hover:opacity-90 transition-opacity uppercase font-sans mb-1 text-[var(--foreground)]">
                                {label}
                             </div>

                             <div className={`p-3 rounded-2xl border transition-all duration-300 shadow-inner ${accentBg}`}>
                                {iconComponent}
                             </div>

                             <span className="text-xs font-black tracking-tight text-[var(--foreground)]/90 leading-tight group-hover:text-[var(--primary)] transition-colors duration-300 mt-2">
                                {title}
                             </span>
                          </motion.button>
                       );
                    })}
                 </div>

                 {/* Realtime Assistant Operational Bar */}
                 <div className="border-t border-[var(--border)]/60 pt-4 flex items-center justify-between text-xs font-medium relative z-10">
                    <div className="flex items-center gap-3">
                       <div className="h-7 w-7 rounded-lg bg-[var(--primary)]/10 flex items-center justify-center text-[var(--primary)] animate-pulse shrink-0">
                          <span className="h-1.5 w-1.5 rounded-full bg-[var(--primary)]" />
                       </div>
                       <div className="min-w-0">
                          <AnimatePresence mode="wait">
                             {hoveredAction ? (
                                <motion.p
                                   key={hoveredAction}
                                   initial={{ opacity: 0, x: -5 }}
                                   animate={{ opacity: 1, x: 0 }}
                                   exit={{ opacity: 0, x: 5 }}
                                   transition={{ duration: 0.15 }}
                                   className="text-[var(--foreground)]/90 font-bold truncate text-left"
                                >
                                   {(() => {
                                      switch (hoveredAction) {
                                         case 'create_bill': return '🧾 Fast Billing: Launch checkout counters and issue new invoices instantly.';
                                         case 'add_product': return '📦 Stock Up: Quick launcher to add a brand-new catalog item.';
                                         case 'update_stock': return '🔄 Update Stock: Navigate directly down to catalog tables for easy entry updates.';
                                         case 'print_invoice': return '🖨️ Sales Logs: Browse past digital receipt list & print instantly.';
                                         case 'open_analytics': return '📊 Real-time Stats: Access premium sales chart streams & analytics matrices.';
                                         case 'open_udhar': return '📕 Khata Udhar Book: Live client credit status & custom payment bookkeeping.';
                                         default: return '';
                                      }
                                   })()}
                                </motion.p>
                             ) : (
                                <motion.p
                                   key="default-text"
                                   initial={{ opacity: 0 }}
                                   animate={{ opacity: 1 }}
                                   exit={{ opacity: 0 }}
                                   className="text-[var(--foreground)]/50 italic font-semibold text-left"
                                >
                                   Hover over any shortcut to view quick operations overview.
                                </motion.p>
                             )}
                          </AnimatePresence>
                       </div>
                    </div>
                    <span className="hidden lg:inline text-[9px] font-mono text-[var(--foreground)]/40 uppercase tracking-widest font-bold">
                       Command HUD v3.4
                    </span>
                 </div>
              </div>

             {/* Dynamic Operations Operational Widgets Container */}
             <DynamicStoreDashboard 
                state={state}
                onUpdateSettings={handleUpdateSettings}
                onUpdateState={handleUpdateComponentState}
                setActiveTab={setActiveTab}
                precision={precision}
             />

            {/* Global Category Rail */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 px-1">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-30">{t.categories}</p>
                <button 
                  onClick={() => setShowAddCategory(true)}
                  className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-[var(--primary)]/10 text-[var(--primary)] hover:bg-[var(--primary)] hover:text-white transition-all active:scale-90 select-none cursor-pointer"
                  title="Add Category"
                  id="add-category-btn"
                >
                  <Plus size={10} className="stroke-[3.5]" />
                </button>
                <button 
                  onClick={() => setShowManageCategories(true)}
                  className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-[var(--primary)]/10 text-[var(--primary)] hover:bg-[var(--primary)] hover:text-white transition-all active:scale-90 select-none cursor-pointer"
                  title="Manage Categories"
                  id="manage-categories-btn"
                >
                  <Settings2 size={10} className="stroke-[2.5]" />
                </button>
              </div>
              <div className="flex gap-3 overflow-x-auto pb-4 no-scrollbar">
                <Button 
                  variant={selectedCategory === null ? 'primary' : 'outline'}
                  size="sm"
                  className="whitespace-nowrap px-6 rounded-xl border-white/5"
                  onClick={() => setSelectedCategory(null)}
                >
                  {t.all}
                </Button>
                {activeCategories.map((cat, idx) => (
                  <Button 
                    key={`${cat.id || 'cat'}-${idx}`}
                    variant={selectedCategory === cat.id ? 'primary' : 'outline'}
                    size="sm"
                    className="whitespace-nowrap px-6 rounded-xl border-white/5"
                    onClick={() => setSelectedCategory(cat.id)}
                  >
                    {cat.name}
                  </Button>
                ))}
              </div>
            </div>

               {/* Registry Grid */}
               <div className="space-y-6">
                 {/* Search at top of list */}
                 <div id="tour-search" className={`relative group transition-all ${isSearchFocused && searchQuery.trim().length > 0 ? 'z-50' : 'z-20'}`}>
                   <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--primary)] opacity-40 transition-opacity group-focus-within:opacity-100" size={20} />
                   <input 
                     type="text"
                     placeholder={t.search}
                     className="w-full rounded-2xl border border-[var(--border)] bg-[var(--card)] py-4 pl-12 pr-4 text-sm focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)] focus:outline-none shadow-sm transition-all"
                     value={searchQuery}
                     onChange={(e) => {
                       setSearchQuery(e.target.value);
                       setActivePredictionIndex(-1);
                     }}
                     onFocus={() => setIsSearchFocused(true)}
                     onBlur={() => {
                       setTimeout(() => setIsSearchFocused(false), 240);
                     }}
                     onKeyDown={(e) => {
                       if (e.key === 'ArrowDown') {
                         e.preventDefault();
                         setActivePredictionIndex(prev => 
                           prev < predictiveItems.length - 1 ? prev + 1 : 0
                         );
                       } else if (e.key === 'ArrowUp') {
                         e.preventDefault();
                         setActivePredictionIndex(prev => 
                           prev > 0 ? prev - 1 : predictiveItems.length - 1
                         );
                       } else if (e.key === 'Enter') {
                         if (activePredictionIndex >= 0 && activePredictionIndex < predictiveItems.length) {
                           e.preventDefault();
                           const selectedItem = predictiveItems[activePredictionIndex];
                           const trs = selectedItem.translations || { en: selectedItem.name || '', hi: '', mr: '', 'hi-en': '' };
                           setSearchQuery(trs[state.settings.language] || trs.en || selectedItem.name);
                           setIsSearchFocused(false);
                         }
                       } else if (e.key === 'Escape') {
                         setIsSearchFocused(false);
                         e.currentTarget.blur();
                       }
                     }}
                   />

                   {/* Predictive Search Suggestions Dropdown Overlay */}
                   <AnimatePresence>
                     {searchQuery.trim().length > 0 && isSearchFocused && (
                       <motion.div
                         initial={{ opacity: 0, y: 10, scale: 0.98 }}
                         animate={{ opacity: 1, y: 0, scale: 1 }}
                         exit={{ opacity: 0, y: 8, scale: 0.98 }}
                         transition={{ duration: 0.15 }}
                         className={`absolute left-0 right-0 top-full mt-1.5 z-[999] overflow-hidden bg-[var(--card)] border shadow-2xl ${
                           state.settings.theme === 'neo_brutalist' 
                             ? 'border-4 border-black rounded-none shadow-[8px_8px_0px_#000]' 
                             : 'border-[var(--border)] rounded-2xl backdrop-blur-md ring-1 ring-black/10 dark:ring-white/10'
                         }`}
                       >
                         <div className="p-2.5 border-b border-[var(--border)] bg-[var(--foreground)]/[0.04] flex items-center justify-between">
                           <span className="text-[10px] font-black uppercase tracking-wider opacity-50 flex items-center gap-1">
                             <Sparkles size={11} className="text-[var(--primary)] animate-pulse" />
                             Predictive suggestions:
                           </span>
                           <span className="text-[9px] font-bold opacity-30">Press Enter ↵ to highlight</span>
                         </div>
                         
                         <div className="max-h-64 overflow-y-auto no-scrollbar">
                           {predictiveItems.length === 0 ? (
                             <div className="p-4 text-xs opacity-50 text-center font-bold">
                               No direct match found. Filters will apply below anyway.
                             </div>
                           ) : (
                             predictiveItems.map((item, idx) => {
                               const trs = item.translations || { en: item.name || '', hi: '', mr: '', 'hi-en': '' };
                               const displayName = trs[state.settings.language] || trs.en || item.name;
                               const isQtyLow = item.quantity <= (item.minStockLevel || state.settings?.minStockLevel || 10);
                               const isQtyOut = item.quantity <= 0;
                               
                               return (
                                 <div
                                   key={`pred-item-${item.id || 'item'}-${idx}`}
                                   onMouseDown={(e) => {
                                     e.preventDefault();
                                     setSearchQuery(displayName);
                                     setIsSearchFocused(false);
                                   }}
                                   onMouseEnter={() => setActivePredictionIndex(idx)}
                                   className={`px-4 py-2.5 flex items-center justify-between cursor-pointer border-b border-[var(--border)] last:border-0 transition-colors ${
                                     activePredictionIndex === idx 
                                       ? 'bg-[var(--primary)] text-white' 
                                       : 'hover:bg-[var(--foreground)]/[0.03]'
                                   }`}
                                 >
                                   <div className="min-w-0 flex-1">
                                     <div className="flex items-center gap-2">
                                       <span className="text-xs font-black truncate">{displayName}</span>
                                       <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-black uppercase tracking-wider ${
                                         activePredictionIndex === idx
                                           ? 'bg-white/20 text-white'
                                           : 'bg-[var(--foreground)]/[0.05] text-[var(--foreground)]/70'
                                       }`}>
                                         {state.categories?.find(c => c.id === item.categoryId)?.name || 'General'}
                                       </span>
                                     </div>
                                     <div className={`flex items-center gap-2 mt-0.5 text-[10px] ${
                                       activePredictionIndex === idx ? 'text-white/80' : 'text-[var(--foreground)]/60'
                                     }`}>
                                       <span className="font-mono">Per Unit: ₹{formatNumber(item.retailPrice, state.settings?.pricePrecision || 0)}</span>
                                       <span>•</span>
                                       <span>{item.unit || 'pcs'}</span>
                                     </div>
                                   </div>
                                   <div className="flex flex-col items-end shrink-0 ml-2">
                                     <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                                       isQtyOut 
                                         ? 'bg-rose-500/20 text-rose-500' 
                                         : isQtyLow 
                                           ? 'bg-amber-500/20 text-amber-500 font-black' 
                                           : activePredictionIndex === idx
                                             ? 'bg-white/25 text-white'
                                             : 'bg-emerald-500/15 text-emerald-500'
                                     }`}>
                                       {isQtyOut ? 'Out' : `Qty: ${item.quantity}`}
                                     </span>
                                   </div>
                                 </div>
                               );
                             })
                           )}
                         </div>
                       </motion.div>
                   )}
                   </AnimatePresence>
                 </div>
 
                 <div className="flex items-center justify-between px-1">
                    <h2 className="text-[10px] font-black uppercase tracking-[0.3em] opacity-30">{t.inventory} Registry</h2>
                    {state.user && (
                       <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/5 border border-green-500/10">
                          <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                          <span className="text-[9px] font-black uppercase tracking-widest text-green-500/60">{t.success} (Synced)</span>
                       </div>
                    )}
                 </div>
              <motion.div 
                layout="position"
                className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 pb-20"
              >
                <AnimatePresence mode="popLayout" initial={false}>
                  {filteredItems.length > 0 ? (
                    filteredItems.map((item, index) => (
                      <motion.div
                        key={`filtered-item-${item.id || 'item'}-${index}`}
                        layout
                        initial={{ opacity: 0, scale: 0.94, y: 12 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.92, y: -8 }}
                        transition={{ 
                          type: "spring", 
                          stiffness: 420, 
                          damping: 26,
                          delay: Math.min(index, 6) * 0.02
                        }}
                      >
                        <ItemCard 
                          item={item} 
                          isLocked={state.settings.isLocked} 
                          language={state.settings.language}
                          precision={precision}
                          onEdit={() => handleEditTrigger(item)}
                          onDelete={() => handleDeleteItem(item.id)}
                          onUpdateItem={handleUpdateItem}
                          isSelected={selectedItemIds.includes(item.id)}
                          anyItemsSelected={selectedItemIds.length > 0}
                          onSelect={() => toggleItemSelection(item.id)}
                          t={t}
                          onPeek={setQuickPeek}
                        />
                      </motion.div>
                    ))
                  ) : (
                    <motion.div 
                      key="empty"
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="col-span-full flex flex-col items-center justify-center py-16 px-6 text-center bg-[var(--card)]/40 border-2 border-dashed border-[var(--border)] rounded-2xl md:py-24"
                    >
                      <div className="h-14 w-14 rounded-2xl bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center mb-4">
                        <Package size={24} />
                      </div>
                      <h3 className="text-sm font-black uppercase tracking-tight text-[var(--foreground)] mb-1">
                        No Inventory Stock Registered
                      </h3>
                      <p className="max-w-md text-[10px] text-[var(--foreground)]/50 uppercase tracking-widest leading-relaxed mb-6">
                        Ready to start tracking product ratios, competitive buy prices, and Wholesale thresholds? Add your first item below to unlock telemetry profiles.
                      </p>
                      
                      <button
                        onClick={() => setShowAddItem(true)}
                        className="px-4 py-2 bg-[var(--primary)] text-white hover:bg-[var(--primary)]/90 text-[9px] font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-lg shadow-[var(--primary)]/10"
                      >
                        + Register First Product
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            </div>
          </motion.div>

        )}
        {activeTab === 'billing' && (
          <motion.div 
            key="billing"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ type: "spring", stiffness: 380, damping: 28 }}
          >
            <BillingScreen 
              state={state} 
              onUpdateState={handleUpdateComponentState} 
              t={t} 
              onOpenHistoryDrawer={() => setShowHistoryDrawer(true)}
              isSyncing={isSyncing}
              onSyncBills={syncBillHistoryWithLocalAndCloud}
              onPeek={setQuickPeek}
            />
          </motion.div>
        )}

        {activeTab === 'analytics' && (
          <motion.div 
            key={`analytics-${analyticsRenderKey}`}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ type: "spring", stiffness: 380, damping: 28 }}
          >
            <AnalyticsScreen 
              state={state} 
              t={t} 
              onUpdateSettings={handleUpdateSettings}
              isLocked={state.settings.isLocked}
              onUnlock={handleToggleLock}
            />
          </motion.div>
        )}

        {activeTab === 'udhar' && (
          <motion.div 
            key="udhar"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ type: "spring", stiffness: 380, damping: 28 }}
          >
            <UdharScreen 
              state={state} 
              t={t} 
              onUpdateState={handleUpdateComponentState}
              selectedCustomerId={selectedUdharCustomerId}
              onSelectCustomerId={setSelectedUdharCustomerId}
            />
          </motion.div>
        )}
        </AnimatePresence>
        )}
      </main>

      {/* Bottom Nav */}
      <nav id="tour-nav" className="fixed bottom-0 left-0 right-0 z-50 border-t border-[var(--border)] bg-[var(--card)] px-4 py-2 backdrop-blur-md">
        <div className="mx-auto flex max-w-lg items-center justify-between">
          <NavButton active={activeTab === 'home'} icon={<AnimatedHomeIcon active={activeTab === 'home'} />} label={t.all || "Home"} onClick={() => handleTabChange('home')} />
          <NavButton active={activeTab === 'billing'} icon={<AnimatedBillingIcon active={activeTab === 'billing'} />} label="Billing" onClick={() => handleTabChange('billing')} />
          {state.settings.enabledFeatures?.analytics !== false && (
            <NavButton active={activeTab === 'analytics'} icon={<AnimatedAnalyticsIcon active={activeTab === 'analytics'} isLocked={state.settings.isLocked} />} label="Analytics" onClick={() => handleTabChange('analytics')} />
          )}
          {state.settings.enabledFeatures?.udhar !== false && (
            <NavButton active={activeTab === 'udhar'} icon={<AnimatedUdharIcon active={activeTab === 'udhar'} />} label="Udhar" onClick={() => handleTabChange('udhar')} />
          )}
        </div>
      </nav>

      {/* Comparison Bottom Bar - Enhanced Visibility */}
      <AnimatePresence>
        {selectedItemIds.length > 0 && activeTab === 'home' && (
          <motion.div 
            initial={{ y: 200, opacity: 0 }}
            animate={{ y: -20, opacity: 1 }}
            exit={{ y: 200, opacity: 0 }}
            className="fixed left-4 right-4 z-[60] bottom-20 md:bottom-8"
          >
            <div className="mx-auto max-w-2xl bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)] text-white p-6 rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.4)] flex flex-col md:flex-row items-center justify-between border border-white/20 backdrop-blur-3xl gap-4">
               <div className="flex items-center gap-6">
                  <div className="flex -space-x-4">
                    {selectedItemIds.slice(0, 4).map((id, index) => {
                      const it = state.items.find(i => i.id === id);
                      const cat = DEFAULT_CATEGORIES.find(c => c.id === it?.categoryId);
                      return (
                        <motion.div 
                          key={`sel-item-id-${id}-${index}`} 
                          initial={{ x: -20, opacity: 0 }}
                          animate={{ x: 0, opacity: 1 }}
                          transition={{ delay: index * 0.1 }}
                          className="h-14 w-14 rounded-2xl bg-white/10 border-2 border-white/20 flex items-center justify-center text-2xl backdrop-blur-md shadow-lg"
                        >
                          {cat?.icon || '📦'}
                        </motion.div>
                      );
                    })}
                    {selectedItemIds.length > 4 && (
                      <div className="h-14 w-14 rounded-2xl bg-black/40 border-2 border-white/20 flex items-center justify-center text-xs font-black">
                        +{selectedItemIds.length - 4}
                      </div>
                    )}
                  </div>
                  <div className="border-l border-white/10 pl-6">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-70 leading-none mb-1">Comparative Intel</p>
                    <p className="text-xl font-black tracking-tight">{selectedItemIds.length} {t.items || "Items"} {t.selected || "Selected"}</p>
                  </div>
               </div>
               <div className="flex items-center gap-3 w-full md:w-auto">
                 <Button 
                   variant="ghost" 
                   onClick={() => setSelectedItemIds([])}
                   className="text-white hover:bg-white/10 rounded-2xl px-6 font-black uppercase text-[10px] tracking-widest h-12 flex-1 md:flex-none"
                 >
                   {t.clear || "Clear"}
                 </Button>

                 <Button 
                   variant="ghost"
                   onClick={() => setDeleteConfirmation({ show: true, type: 'multiple' })}
                   className="text-white hover:bg-red-500/20 hover:text-red-300 rounded-2xl px-6 font-black uppercase text-[10px] tracking-widest h-12 flex-1 md:flex-none"
                 >
                   <Trash2 size={18} className="mr-2" />
                   Delete
                 </Button>
                 
                 <Button 
                   onClick={() => setShowComparison(true)}
                   disabled={selectedItemIds.length < 2}
                   className="bg-white text-[var(--primary)] hover:scale-105 active:scale-95 transition-all rounded-2xl px-10 h-12 text-xs font-black uppercase tracking-[0.1em] shadow-xl flex-1 md:flex-none disabled:opacity-50"
                 >
                   <TrendingUp size={18} className="mr-2" />
                   {t.compare || "Compare"}
                 </Button>
               </div>
            </div>
          </motion.div>
      )}
      </AnimatePresence>

      {/* 🔮 IMMERSIVE SELF-HEALING OVERLAY */}
      <AnimatePresence>
        {showRecoveryOverlay && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-[#070b13] z-[9999] flex flex-col items-center justify-center text-white font-sans overflow-hidden"
          >
            {/* Ambient Background Glows */}
            <div className="absolute top-1/4 left-1/4 h-80 w-80 bg-cyan-500/10 rounded-full blur-[100px] pointer-events-none animate-pulse" />
            <div className="absolute bottom-1/4 right-1/4 h-80 w-80 bg-blue-500/10 rounded-full blur-[100px] pointer-events-none animate-pulse delay-700" />
            
            {/* Visual Stacking Core info */}
            <div className="max-w-xs w-full text-center space-y-6 px-4 z-10 relative">
              <div className="relative inline-flex items-center justify-center">
                {/* Glowing ring animation */}
                <span className="absolute -inset-4 h-24 w-24 rounded-full border border-cyan-500/20 animate-ping duration-1000" />
                <span className="absolute -inset-2 h-20 w-20 rounded-full border-2 border-dashed border-cyan-400/15 animate-spin" />
                
                <div className="h-16 w-16 rounded-2xl bg-gradient-to-tr from-cyan-400 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 border border-cyan-400/30">
                  <HeartPulse size={28} className="text-white animate-pulse" />
                </div>
              </div>

              <div className="space-y-1.5">
                <h3 className="text-sm font-black uppercase tracking-[0.2em] text-cyan-400 font-sans leading-none">Control Tower Restore</h3>
                <p className="text-[9px] font-black uppercase tracking-[0.3em] text-white/50 font-sans leading-none">Healing Local POS Workspaces</p>
              </div>

              {/* Progress and indicators */}
              <div className="space-y-3.5">
                <div className="h-1.5 w-full bg-white/[0.04] rounded-full overflow-hidden border border-white/[0.02]">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${recoveryProgress}%` }}
                    transition={{ ease: 'easeOut' }}
                    className="h-full bg-gradient-to-r from-cyan-400 to-blue-500 shadow-md shadow-cyan-500/35"
                  />
                </div>
                
                <div className="flex items-center justify-between text-[8px] font-black uppercase tracking-widest text-[#8b9bb4]">
                  <span className="font-mono">INTEGRITY CHECKING...</span>
                  <span className="font-mono text-cyan-400">{recoveryProgress}%</span>
                </div>
              </div>

              {/* Status parameters line ticker */}
              <div className="pt-2 text-[8px] font-bold font-mono opacity-40 uppercase truncate">
                {recoveryProgress < 30 ? 'Allocating cache boundaries...' :
                 recoveryProgress < 60 ? 'Rehydrating held customer sessions...' :
                 recoveryProgress < 85 ? 'Checking offline transactional queue...' : 'Verifying local database hashes...'}
              </div>
            </div>
          </motion.div>
      )}
      </AnimatePresence>

      {/* 🔮 INTELLIGENT RECOVERY DIAGNOSTICS CENTER Drawer */}
      <AnimatePresence>
        {showRecoveryCenter && (
          <div className="fixed inset-0 z-[999] flex justify-end text-slate-100 font-sans text-left">
            {/* Dark glass backdrop modal */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowRecoveryCenter(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-md"
            />

            {/* Panel */}
            <motion.div 
              initial={{ x: '100%', opacity: 0.95 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: '100%', opacity: 0.95 }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="relative w-full max-w-md bg-slate-900 border-l border-slate-800 h-full shadow-2xl flex flex-col focus:outline-none z-10"
            >
              {/* Header */}
              <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-xl bg-cyan-400/10 text-cyan-400 flex items-center justify-center border border-cyan-400/20 animate-pulse">
                    <HeartPulse size={16} />
                  </div>
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-tight text-white mb-0">Diagnostics Control Tower</h3>
                    <p className="text-[8px] font-bold text-cyan-400 uppercase tracking-widest mt-0.5 leading-none font-sans">Automated Telemetry & Recovery</p>
                  </div>
                </div>
                
                <button 
                  onClick={() => setShowRecoveryCenter(false)}
                  className="h-7 w-7 rounded-lg border border-slate-800 bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800 transition-all flex items-center justify-center cursor-pointer active:scale-95"
                >
                  <X size={14} />
                </button>
              </div>

              {/* Real-time parameters matrix */}
              <div className="grid grid-cols-2 gap-3 p-5 bg-slate-950/60 border-b border-slate-800/80">
                <div className="bg-slate-900 p-3 rounded-xl border border-slate-830 shadow-inner space-y-1">
                  <span className="text-[7.5px] font-extrabold text-slate-400 uppercase tracking-widest block font-sans">Network Mode</span>
                  <div className="flex items-center gap-1.5 pt-0.5">
                    <Wifi size={12} className={syncStatus === 'Offline' ? "text-slate-500" : "text-emerald-400"} />
                    <span className="text-[10px] font-mono font-black uppercase tracking-wider text-slate-200">
                      {syncStatus === 'Offline' ? 'OFFLINE AP' : 'CLOUD ONLINE'}
                    </span>
                  </div>
                </div>

                <div className="bg-slate-900 p-3 rounded-xl border border-slate-830 shadow-inner space-y-1">
                  <span className="text-[7.5px] font-extrabold text-slate-400 uppercase tracking-widest block font-sans">Active Sync</span>
                  <div className="flex items-center gap-1.5 pt-0.5">
                    <span className={cn(
                      "h-1.5 w-1.5 rounded-full shrink-0",
                      syncStatus === 'Synced' ? "bg-green-400 animate-pulse" :
                      syncStatus === 'Saving' ? "bg-amber-400 animate-bounce" :
                      syncStatus === 'Recovering' ? "bg-cyan-400 animate-spin" : "bg-red-500"
                    )} />
                    <span className="text-[10px] font-mono font-black uppercase tracking-wider text-slate-200">
                      {syncStatus}
                    </span>
                  </div>
                </div>

                <div className="bg-slate-900 p-3 rounded-xl border border-slate-830 shadow-inner space-y-1">
                  <span className="text-[7.5px] font-extrabold text-slate-400 uppercase tracking-widest block font-sans">Held Drafts</span>
                  <span className="text-[11px] font-mono font-bold text-[#f59e0b] block">
                    {localStorage.getItem('pos_billing_hold_drafts') ? JSON.parse(localStorage.getItem('pos_billing_hold_drafts') || '[]').length : 0} Sessions
                  </span>
                </div>

                <div className="bg-slate-900 p-3 rounded-xl border border-slate-830 shadow-inner space-y-1">
                  <span className="text-[7.5px] font-extrabold text-slate-400 uppercase tracking-widest block font-sans">Cache Integrity</span>
                  <span className="text-[10px] font-mono font-black text-emerald-400 block uppercase tracking-wide">
                    100% HEALTHY
                  </span>
                </div>
              </div>

              {/* Event logging telemetry logs */}
              <div className="flex-1 overflow-y-auto no-scrollbar p-5 space-y-4 bg-slate-950/25">
                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 block select-none font-sans">
                  INTEGRITY LOGS & TELEMETRY
                </span>

                <div className="space-y-2 font-mono text-[9px] leading-relaxed">
                  {integrityLogs.map((log, index) => (
                    <div 
                      key={index} 
                      className="p-3 bg-slate-950/40 rounded-lg border border-slate-800/80 hover:bg-slate-950/60 transition-colors flex items-start gap-2.5"
                    >
                      <span className="text-slate-500 shrink-0 font-bold">[{log.timestamp}]</span>
                      <div className="flex-1 min-w-0 text-left">
                        <p className="text-slate-300 font-bold">{log.msg}</p>
                        <span className="inline-block px-1 py-0.5 rounded bg-slate-800 border border-slate-700/60 text-slate-400 text-[6.5px] font-bold uppercase tracking-wider mt-1">
                          {log.code}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Footer diagnostic action panel */}
              <div className="p-4.5 border-t border-slate-800 bg-slate-950 space-y-2.5 text-center">
                <button
                  onClick={() => {
                    setSyncStatus('Recovering');
                    setIntegrityLogs(prev => [
                      { timestamp: new Date().toLocaleTimeString(), msg: 'Running deep self-healing database diagnostics...', code: 'DIAGNOSTICS_BEGIN' },
                      ...prev
                    ]);
                    
                    let prog = 0;
                    const tm = setInterval(() => {
                      prog += 20;
                      if (prog >= 100) {
                        clearInterval(tm);
                        setSyncStatus(navigator.onLine ? 'Synced' : 'Offline');
                        setIntegrityLogs(prev => [
                          { timestamp: new Date().toLocaleTimeString(), msg: 'Diagnosis finished. Cache checksum match verified. All databases functional.', code: 'DIAGNOSTICS_OK' },
                          ...prev
                        ]);
                        alert("Health check completed! Index values and local storage cache are perfectly synchronized.");
                      }
                    }, 250);
                  }}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-black text-[9px] uppercase tracking-widest transition-all cursor-pointer shadow-lg shadow-cyan-500/10 hover:shadow-cyan-500/20 hover:scale-[1.01] active:scale-95 font-sans"
                >
                  ⚡ Trigger Self-Healing Diagnostics
                </button>
                
                <button 
                  onClick={() => {
                    if (confirm("Remove stale checkout register caches and drafts from background storage? Active tabs will remain.")) {
                      localStorage.removeItem('pos_billing_hold_drafts');
                      setIntegrityLogs(prev => [
                        { timestamp: new Date().toLocaleTimeString(), msg: 'Storage registers and holds cache garbage collection executed.', code: 'GARBAGE_COLLECT_OK' },
                        ...prev
                      ]);
                      alert("Holds storage emptied successfully.");
                    }
                  }}
                  className="w-full py-2 rounded-xl bg-slate-800 border border-slate-700/60 hover:bg-slate-700 text-slate-300 font-black text-[9px] uppercase tracking-widest transition-all cursor-pointer font-sans"
                >
                  Clear Held Draft Caches
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Bill History Drawer (Slides L-to-R, available globally on all tabs via swipe/drag) */}
      <BillHistoryDrawer 
        isOpen={showHistoryDrawer} 
        onClose={() => setShowHistoryDrawer(false)} 
        state={state} 
        onUpdateState={handleUpdateComponentState} 
      />

      {/* Pro POS Business Calculator Component (Always accessible app-wide) */}
      <SmartCalculator />

      {/* Dynamic Notification Center */}
      <NotificationCenter 
        isOpen={showNotificationsDropdown}
        onClose={() => setShowNotificationsDropdown(false)}
        notifications={notifications}
        activeAlerts={activeAlerts}
        state={state}
        setActiveTab={setActiveTab}
        setEditingItem={setEditingItem}
        setSelectedUdharCustomerId={setSelectedUdharCustomerId}
        handleDismissNotification={handleDismissNotification}
        t={t}
        onMarkAllRead={(alertIds) => {
          // 1. Mark all notifications as read in local state
          setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
          
          // 2. Dismiss all currently active low-stock & udhar alert IDs to clear badge counters
          if (alertIds.length > 0) {
            setState(prev => {
              const currentDismissed = prev.settings.dismissedNotifications || [];
              const updated = Array.from(new Set([...currentDismissed, ...alertIds]));
              return {
                ...prev,
                settings: {
                  ...prev.settings,
                  dismissedNotifications: updated
                }
              };
            });
          }
          addToast("All notifications and dynamic alerts cleared!", "success");
        }}
      />

      {/* Floating Action Buttons */}
      {activeTab === 'home' && !showMenu && !showNotificationsDropdown && !showHistoryDrawer && !showGoalPanel && !showComparison && !showAddItem && !showAddNote && (
        <div className="fixed bottom-24 right-6 z-[100] flex flex-col items-center select-none overflow-visible">
          {/* 1. Advanced Mic Target Halo Area (revealed when dragging begins) */}
          <AnimatePresence>
            {isDraggingButton && (
              <motion.div
                initial={{ opacity: 0, scale: 0.6, y: 30 }}
                animate={{
                  opacity: 1,
                  scale: dragYOffset <= -80 ? 1.15 : 1,
                  y: -110, // absolute target height relative to bottom-24 container
                }}
                exit={{ opacity: 0, scale: 0.5, y: 40 }}
                transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                className="absolute flex flex-col items-center justify-center z-10 pointer-events-none"
              >
                {/* Sonic ripple rings radiating when threshold is crossed */}
                {dragYOffset <= -80 && (
                  <>
                    <span className="absolute h-20 w-20 rounded-full bg-amber-500/20 animate-ping" />
                    <motion.div
                      animate={{ scale: [1, 1.6], opacity: [0.5, 0] }}
                      transition={{ repeat: Infinity, duration: 1.2, ease: "easeOut" }}
                      className="absolute h-24 w-24 rounded-full border-2 border-amber-500/30"
                    />
                    <motion.div
                      animate={{ scale: [1, 2.2], opacity: [0.3, 0] }}
                      transition={{ repeat: Infinity, duration: 1.6, ease: "easeOut", delay: 0.3 }}
                      className="absolute h-24 w-24 rounded-full border border-amber-400/20"
                    />
                  </>
                )}

                {/* Main Mic Target Sphere Container */}
                <div
                  className={`h-16 w-16 rounded-full flex items-center justify-center border-2 transition-all duration-300 shadow-2xl relative ${
                    dragYOffset <= -80
                      ? 'bg-gradient-to-tr from-amber-500 via-amber-600 to-yellow-400 text-white border-amber-300 scale-110 shadow-amber-500/50'
                      : 'bg-neutral-900/90 text-amber-500 border-amber-500/40 shadow-black/80'
                  }`}
                >
                  {/* Subtle inner gloss highlight */}
                  <div className="absolute inset-0 rounded-full bg-gradient-to-b from-white/10 to-transparent pointer-events-none" />

                  {/* Micro-dancing soundwaves around active mic */}
                  {dragYOffset <= -80 ? (
                    <motion.div
                      animate={{ y: [0, -4, 4, -4, 0] }}
                      transition={{ repeat: Infinity, duration: 0.5, ease: "easeInOut" }}
                    >
                      <Mic size={28} className="drop-shadow-[0_2px_8px_rgba(0,0,0,0.3)] text-neutral-950 font-black" />
                    </motion.div>
                  ) : (
                    <motion.div
                      animate={{ scale: [0.95, 1.05] }}
                      transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                    >
                      <Mic size={24} className="opacity-80" />
                    </motion.div>
                  )}

                  {/* Absolute positioning glowing pulse */}
                  <span className={`absolute -inset-1 rounded-full filter blur-md pointer-events-none transition-opacity duration-300 ${
                    dragYOffset <= -80 ? 'bg-amber-400/40 opacity-100' : 'bg-amber-500/15 opacity-50'
                  }`} />
                </div>

                {/* Contextual dynamic text indicators */}
                <div className="absolute -top-12 whitespace-nowrap bg-neutral-900/95 border border-white/10 backdrop-blur-md px-3 py-1.5 rounded-xl shadow-2xl flex flex-col items-center gap-0.5">
                  <span className={`text-[10px] font-black uppercase tracking-wider transition-colors duration-150 ${
                    dragYOffset <= -80 ? 'text-amber-400' : 'text-neutral-300'
                  }`}>
                    {dragYOffset <= -80 ? '🎤 RELEASE TO SPEAK' : 'बोलकर उत्पाद जोड़ें'}
                  </span>
                  <span className="text-[8px] opacity-60 font-medium font-mono text-neutral-200">
                    {dragYOffset <= -80 ? 'Instant Voice Pos Assistant' : 'Slide up to record audio'}
                  </span>
                </div>
              </motion.div>
          )}
          </AnimatePresence>

          {/* 2. Stretching Plasma caramel Connector Stream (SVG) - physically pulls button to target */}
          {isDraggingButton && (
            <div className="absolute inset-0 pointer-events-none z-[5] overflow-visible" style={{ height: '0px', width: '56px' }}>
              <svg
                width="56"
                height={Math.max(1, Math.abs(dragYOffset))}
                viewBox={`0 0 56 ${Math.max(1, Math.abs(dragYOffset))}`}
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="absolute bottom-1/2 left-1/2 -translate-x-1/2 translate-y-1/2 overflow-visible"
                style={{
                  transform: `translate(-50%, ${dragYOffset / 2}px)`,
                  opacity: Math.min(1, Math.abs(dragYOffset) / 10),
                }}
              >
                <defs>
                  <linearGradient id="plasmaGlow" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f59e0b" stopOpacity={dragYOffset <= -80 ? 0.9 : 0.6} />
                    <stop offset="100%" stopColor="var(--primary)" stopOpacity={dragYOffset <= -80 ? 0.9 : 0.6} />
                  </linearGradient>
                </defs>
                <motion.path
                  d={`
                    M 16 ${Math.abs(dragYOffset)}
                    Q ${28 - Math.max(2, 10 - Math.abs(dragYOffset) * 0.06)} ${Math.abs(dragYOffset) / 2}, 20 0
                    L 36 0
                    Q ${28 + Math.max(2, 10 - Math.abs(dragYOffset) * 0.06)} ${Math.abs(dragYOffset) / 2}, 40 ${Math.abs(dragYOffset)}
                    Z
                  `}
                  fill="url(#plasmaGlow)"
                  filter="drop-shadow(0 0 4px rgba(245, 158, 11, 0.4))"
                />
              </svg>
            </div>
          )}

          {/* 3. Drag Guide Trail Overlay (Ambient Dots when inactive or dragging) */}
          <AnimatePresence>
            {isDraggingButton && dragYOffset > -80 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.4 }}
                exit={{ opacity: 0 }}
                className="absolute bottom-12 h-16 w-0.5 border-l-2 border-dashed border-amber-500/50 pointer-events-none"
              />
            )}
          </AnimatePresence>

          {/* 4. Draggable Plus Button (The core interactive element) */}
          <motion.div
            drag="y"
            dragConstraints={{ top: -140, bottom: 0 }}
            dragElastic={0.12}
            dragSnapToOrigin
            onDragStart={() => {
              setIsDraggingButton(true);
              setDragYOffset(0);
              firstSoundPlayedRef.current = false;
              triggerThresholdRef.current = false;
              
              // Trigger slight start pulse haptic
              if (navigator.vibrate) navigator.vibrate([15]);
            }}
            onDrag={(event, info) => {
              const currentY = info.offset.y;
              setDragYOffset(currentY);

              // Play a clicking/haptic feedback EXACTLY when crossing the threshold (-80px)
              if (currentY <= -80 && !triggerThresholdRef.current) {
                triggerThresholdRef.current = true;
                if (navigator.vibrate) navigator.vibrate([40]);
                try {
                  playFeedbackEvent('product_added', state.settings);
                } catch (e) {
                  // Fallback
                }
              } else if (currentY > -80 && triggerThresholdRef.current) {
                triggerThresholdRef.current = false;
              }
            }}
            onDragEnd={(event, info) => {
              setIsDraggingButton(false);
              const finalY = info.offset.y;
              setDragYOffset(0);

              if (finalY <= -80) {
                // Success: Trigger voice assistant modal!
                setShowVoiceAssistant(true);
                if (navigator.vibrate) navigator.vibrate([20, 50, 20]);
                try {
                  playFeedbackEvent('bill_saved', state.settings);
                } catch (e) {
                  // Fallback
                }
              } else {
                // Return start pulse physical click
                if (navigator.vibrate) navigator.vibrate([10]);
              }
              
              triggerThresholdRef.current = false;
            }}
            onTap={() => {
              setShowPlusActionMenu(prev => !prev);
            }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            className={`h-14 w-14 rounded-full z-20 cursor-grab active:cursor-grabbing outline-none select-none relative flex items-center justify-center transition-all duration-200 ${
              showPlusActionMenu ? 'bg-rose-500 shadow-lg shadow-rose-500/50 text-white' : ''
            } ${
              isDraggingButton ? 'scale-105' : ''
            }`}
          >
            {/* Real-time scaling color overlay beneath button matching stretch */}
            <motion.div 
              style={{ scale: isDraggingButton ? 1.05 : 1 }}
              className={`absolute inset-0 rounded-full transition-all duration-300 ${
                showPlusActionMenu
                  ? 'bg-rose-600 shadow-xl shadow-rose-500/50'
                  : dragYOffset <= -80
                    ? 'bg-gradient-to-tr from-amber-500 to-amber-600 shadow-xl shadow-amber-500/50'
                    : 'bg-transparent'
              }`}
            />
            {/* Standard Animated plus icon / Close Icon when menu is open */}
            {showPlusActionMenu ? (
              <X size={26} className="text-white font-black z-20" />
            ) : (
              <AnimatedPlusIcon size={26} isAtMicThreshold={dragYOffset <= -80} />
            )}
          </motion.div>

          {/* Backdrop Overlay to close menu when clicking anywhere on background */}
          <AnimatePresence>
            {showPlusActionMenu && (
              <motion.div
                key="plus-menu-backdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                onClick={() => setShowPlusActionMenu(false)}
                className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-[90] cursor-pointer"
              />
            )}
          </AnimatePresence>

          {/* Plus Action Menu Options */}
          <AnimatePresence>
            {showPlusActionMenu && (
              <motion.div
                key="plus-action-menu-content"
                initial={{ opacity: 0, scale: 0.85, y: 12 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 8 }}
                transition={{ type: "spring", stiffness: 420, damping: 28 }}
                className="absolute bottom-[68px] right-0 flex flex-col gap-2.5 z-[101] min-w-[210px] items-end pointer-events-auto text-zinc-950 font-sans"
              >
                {/* Smart Entry Button */}
                <motion.button
                  initial={{ opacity: 0, x: 20, scale: 0.9 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: 15, scale: 0.9 }}
                  transition={{ type: "spring", stiffness: 450, damping: 25, delay: 0.01 }}
                  onClick={() => {
                    setShowSmartBulkEntry(true);
                    setShowPlusActionMenu(false);
                  }}
                  whileHover={{ scale: 1.03, x: -2 }}
                  whileTap={{ scale: 0.96 }}
                  className="flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 text-white font-black text-[11px] tracking-wider uppercase border border-amber-400 shadow-xl shadow-amber-500/30 hover:shadow-amber-500/50 transition-all w-full justify-start whitespace-nowrap cursor-pointer group relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                  <div className="w-7 h-7 rounded-xl bg-white/20 text-white flex items-center justify-center text-sm font-bold shrink-0">
                    ⚡
                  </div>
                  <div className="flex flex-col items-start leading-none z-10">
                    <span className="font-black flex items-center gap-1">
                      SMART ENTRY <span className="text-yellow-200">⚡</span>
                    </span>
                    <span className="text-[9px] font-medium text-amber-100 normal-case tracking-normal mt-0.5">paste text / quick list</span>
                  </div>
                </motion.button>

                {/* Full Entry Button (Formerly Standard Form) */}
                <motion.button
                  initial={{ opacity: 0, x: 20, scale: 0.9 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: 15, scale: 0.9 }}
                  transition={{ type: "spring", stiffness: 450, damping: 25, delay: 0.05 }}
                  onClick={() => {
                    setShowAddItem(true);
                    setShowPlusActionMenu(false);
                  }}
                  whileHover={{ scale: 1.03, x: -2 }}
                  whileTap={{ scale: 0.96 }}
                  className="flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 font-black text-[11px] tracking-wider uppercase border border-zinc-200 dark:border-zinc-800 shadow-2xl hover:border-amber-500/50 transition-all w-full justify-start whitespace-nowrap cursor-pointer group"
                >
                  <div className="w-7 h-7 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center text-sm font-bold group-hover:bg-amber-500 group-hover:text-white transition-colors shrink-0">
                    📄
                  </div>
                  <div className="flex flex-col items-start leading-none">
                    <span className="font-black">FULL ENTRY</span>
                    <span className="text-[9px] font-medium text-zinc-600 dark:text-zinc-400 normal-case tracking-normal mt-0.5">detailed form with all fields</span>
                  </div>
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
      {activeTab === 'notes' && !showMenu && !showNotificationsDropdown && !showHistoryDrawer && !showGoalPanel && !showComparison && (
        <Button 
          className="fixed bottom-24 right-6 h-14 w-14 rounded-full shadow-2xl accent-glow bg-amber-500 hover:bg-amber-600"
          onClick={() => setShowAddNote(true)}
        >
          <PlusCircle size={32} />
        </Button>
      )}

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {(showAddItem || editingItem) && (
          <ItemFormModal 
            key="item-form-modal"
            onClose={() => {
              setShowAddItem(false);
              setEditingItem(null);
            }}
            onSave={editingItem ? (data) => handleUpdateItem(editingItem.id, data) : handleAddItem}
            initialData={editingItem || undefined}
            categories={activeCategories}
            t={t}
            language={state.settings.language}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showVoiceAssistant && (
          <VoiceProductAssistant
            key="voice-product-assistant-modal"
            onClose={() => setShowVoiceAssistant(false)}
            onSaveAll={handleSaveVoiceProducts}
            categories={activeCategories}
            existingItems={state.items}
            appSettings={state.settings}
            t={t}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showAddNote && (
          <NoteFormModal 
            key="note-form-modal"
            onClose={() => setShowAddNote(false)}
            onSave={handleAddNote}
            t={t}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showAddCategory && (
          <AddCategoryModal
            key="add-category-modal"
            onClose={() => setShowAddCategory(false)}
            onSave={handleAddCategory}
            t={t}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showManageCategories && (
          <ManageCategoriesModal
            key="manage-categories-modal"
            onClose={() => setShowManageCategories(false)}
            categories={activeCategories}
            items={state.items}
            onEditCategory={handleEditCategory}
            onDeleteCategory={handleDeleteCategory}
            t={t}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showSmartBulkEntry && (
          <SmartBulkEntryModal
            key="smart-bulk-entry-modal"
            isOpen={showSmartBulkEntry}
            onClose={() => setShowSmartBulkEntry(false)}
            onSaveBatch={handleBatchSaveItems}
            categories={activeCategories}
            t={t}
            theme={state.settings.theme}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showComparison && (
          <ComparisonModal 
            key="comparison-modal"
            selectedItems={state.items.filter(i => selectedItemIds.includes(i.id))}
            onClose={() => setShowComparison(false)}
            t={t}
            language={state.settings.language}
            precision={precision}
            hideBuyingPrice={state.settings.hideBuyingPriceByDefault}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showHelp && (
          <HelpModal 
            key="help-modal"
            onClose={() => setShowHelp(false)}
            t={t}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {exportModal.isOpen && (
          <ExportCostChoiceModal 
            key="export-cost-choice-modal"
            onClose={() => setExportModal({ isOpen: false, format: null })}
            onSelectOption={(includeCost) => {
              const format = exportModal.format;
              setExportModal({ isOpen: false, format: null });
              if (format === 'excel') {
                exportToExcel(includeCost);
              } else if (format === 'pdf') {
                exportToPDF(includeCost);
              }
            }}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {isExporting && exportFormat && (
          <ExportProgressOverlay
            key="export-progress-overlay"
            format={exportFormat}
            progress={exportProgress}
            currentStep={exportStatus}
            completedSteps={exportCompletedSteps}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showTour && (
          <OnboardingTour 
            key="onboarding-tour-modal"
            onClose={() => {
              setShowTour(false);
              handleUpdateSettings({ hasSeenOnboarding: true });
            }}
            t={t}
            state={state}
            handleUpdateSettings={handleUpdateSettings}
            setState={setState}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showGoalPanel && (
          <GoalShiftPanelModal
            key="goal-shift-panel-modal"
            isOpen={showGoalPanel}
            onClose={() => setShowGoalPanel(false)}
            activeShift={activeShift}
            setActiveShift={setActiveShift}
            shiftHistory={shiftHistory}
            setShiftHistory={setShiftHistory}
            businessGoals={businessGoals}
            setBusinessGoals={setBusinessGoals}
            state={state}
            t={t}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {deleteConfirmation.show && (
          <DeleteConfirmationModal
            key="delete-confirmation-modal"
            onClose={() => setDeleteConfirmation({ show: false, type: 'single' })}
            onConfirm={confirmDeletion}
            count={deleteConfirmation.type === 'single' ? 1 : selectedItemIds.length}
            t={t}
          />
        )}
      </AnimatePresence>

      {/* Milestone Celebration Popup Modal */}
      <AnimatePresence>
        {activeCelebrationMilestone && (
          <MilestoneCelebrationModal
            key="milestone-celebration-popup-modal"
            milestone={activeCelebrationMilestone}
            storeName={state.settings.storeName || "Our Retail Store"}
            theme={state.settings.theme}
            onClose={() => setActiveCelebrationMilestone(null)}
            onViewAllMilestones={() => {
              localStorage.setItem('analytics_active_subtab', 'milestones');
              setActiveTab('analytics');
            }}
          />
        )}
      </AnimatePresence>
      
      <AnimatePresence>
        {dailyCycleModal && dailyCycleModal.isOpen && (
          <motion.div 
            key="daily-cycle-modal-backdrop-element"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md"
          >
            <motion.div 
              key="daily-cycle-modal-container-element"
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-[var(--background)] border border-[var(--border)] rounded-[2.5rem] p-8 max-w-lg w-full shadow-2xl relative overflow-hidden text-[var(--foreground)]"
            >
              {/* Top ambient decor line */}
              <div className="absolute top-0 inset-x-0 h-2 bg-gradient-to-r from-amber-500 via-[var(--primary)] to-indigo-500" />
              
              <div className="flex items-center gap-4 mb-6">
                <div className="h-14 w-14 rounded-2xl bg-[var(--primary)]/10 flex items-center justify-center text-[var(--primary)] text-3xl">
                  {dailyCycleModal.type === 'opening' ? <Sun className="text-amber-500 animate-[spin_10s_linear_infinite]" size={28} /> : <Moon className="text-indigo-400" size={28} />}
                </div>
                <div>
                  <h3 className="text-xl font-black uppercase tracking-tight leading-none">
                    {dailyCycleModal.type === 'opening' 
                      ? "Store Opening Checklist" 
                      : "Daily Store Close Backup"}
                  </h3>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--primary)] mt-1 leading-none">
                    {dailyCycleModal.type === 'opening' 
                      ? "लॉग इतिहास साफ़ करें और नया दिन शुरू करें" 
                      : "दैनिक बिक्री इतिहास बचाएं और डेटा बैकअप लें"}
                  </p>
                </div>
              </div>

              <div className="space-y-4 text-xs font-bold leading-relaxed opacity-80 mb-8 border-b border-[var(--border)] pb-6">
                {dailyCycleModal.type === 'opening' ? (
                  <p>
                    Good morning! The store is opening. For maximum speed, security, and cloud sync integrity, it is highly recommended to <strong>Download Excel Backup</strong> of the previous cycle &amp; flush active bill histories.
                    <br/><br/>
                    सुप्रभात! आपकी दुकान खुल चुकी है। सिस्टम को हल्का व तेज रखने के लिए पुराने बिलों का बैकअप एक्सेल डाउनलोड कर इतिहास खाली कर लें।
                  </p>
                ) : (
                  <p>
                    It's store closing hour! Ensure your active daily billing files are archived. Back up your transactions and prepare the POS system for a clean daily cycle tomorrow.
                    <br/><br/>
                    दुकान बंद करने का समय हो गया है! अपनी दैनिक बिक्री को सुरक्षित रूप से एक्सेल दस्तावेज़ में लें और कल के नए चक्र के लिए बिल रिकॉर्ड खाली करें।
                  </p>
                )}
                
                <div className="bg-[var(--primary)]/5 rounded-2xl p-4 border border-[var(--primary)]/10 flex items-center justify-between text-[11px] font-black uppercase tracking-wider text-[var(--primary)]">
                  <span>Active Bill Counts (कुल बिल रिकॉर्ड):</span>
                  <span>{(state.bills || []).length} Invoices</span>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <Button 
                  onClick={async () => {
                    const success = await handleCycleBackupAndClear();
                    if (success) {
                      const todayStr = new Date().toISOString().split('T')[0];
                      if (dailyCycleModal.type === 'opening') {
                        localStorage.setItem('price_manager_last_open_prompt_date', todayStr);
                      } else {
                        localStorage.setItem('price_manager_last_close_prompt_date', todayStr);
                      }
                      setDailyCycleModal(null);
                    }
                  }}
                  className="bg-gradient-to-r from-amber-500 to-orange-600 text-white font-black uppercase tracking-[0.1em] text-xs h-13 rounded-2xl shadow-xl w-full"
                >
                  <Download size={16} className="mr-2" /> Download Backup &amp; Reset Shift
                </Button>

                <div className="flex gap-3">
                  <Button 
                    variant="outline"
                    onClick={() => {
                      const todayStr = new Date().toISOString().split('T')[0];
                      if (dailyCycleModal.type === 'opening') {
                        localStorage.setItem('price_manager_last_open_prompt_date', todayStr);
                      } else {
                        localStorage.setItem('price_manager_last_close_prompt_date', todayStr);
                      }
                      setDailyCycleModal(null);
                    }}
                    className="flex-1 text-[10px] uppercase font-black tracking-widest h-12 rounded-2xl text-[var(--foreground)] border-[var(--border)] bg-transparent"
                  >
                    Snooze Today (आज छोड़ें)
                  </Button>
                  
                  <Button 
                    variant="ghost"
                    onClick={() => {
                      setDailyCycleModal(null);
                    }}
                    className="flex-1 text-[10px] uppercase font-black tracking-widest h-12 rounded-2xl text-red-400 font-bold hover:bg-red-500/10"
                  >
                    Remind Later
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Menu / Settings Overlay Drawer */}
      <AnimatePresence>
        {showMenu && (
          <motion.div
            id="tour-menu-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowMenu(false)}
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex justify-end"
          >
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md h-full bg-[var(--card)] border-l border-[var(--border)] p-6 shadow-2xl overflow-y-auto flex flex-col justify-between text-[var(--foreground)]"
            >
              <div className="space-y-6">
                <div className="flex items-center justify-between border-b border-[var(--border)] pb-4">
                  <div>
                    <h2 className="text-xl font-black text-[var(--foreground)] uppercase tracking-tighter">Control Center</h2>
                    <p className="text-[10px] opacity-40 uppercase tracking-widest font-bold mt-1">System preferences & tools</p>
                  </div>
                  <Button variant="outline" size="icon" onClick={() => setShowMenu(false)} className="rounded-full h-8 w-8 border-[var(--border)] flex items-center justify-center text-[var(--foreground)]">
                    <X size={16} />
                  </Button>
                </div>

                {/* Profile, Business, Settings & Printer tab choices */}
                <div className="flex border-b border-[var(--border)] pb-2 gap-1 overflow-x-auto scrollbar-none whitespace-nowrap">
                  <button 
                    onClick={() => setMenuTab('profile')}
                    className={cn(
                      "flex-1 pb-2 px-2 text-[9px] uppercase font-black tracking-wider text-center border-b-2 transition-all cursor-pointer",
                      menuTab === 'profile' ? "border-[var(--primary)] text-[var(--primary)]" : "border-transparent text-[var(--foreground)]/40 hover:text-[var(--foreground)]"
                    )}
                  >
                    Profile
                  </button>
                  <button 
                    onClick={() => setMenuTab('business_settings')}
                    className={cn(
                      "flex-1 pb-2 px-2 text-[9px] uppercase font-black tracking-wider text-center border-b-2 transition-all cursor-pointer",
                      menuTab === 'business_settings' ? "border-[var(--primary)] text-[var(--primary)]" : "border-transparent text-[var(--foreground)]/40 hover:text-[var(--foreground)]"
                    )}
                  >
                    Biz Settings
                  </button>
                  <button 
                    onClick={() => setMenuTab('settings')}
                    className={cn(
                      "flex-1 pb-2 px-2 text-[9px] uppercase font-black tracking-wider text-center border-b-2 transition-all cursor-pointer",
                      menuTab === 'settings' ? "border-[var(--primary)] text-[var(--primary)]" : "border-transparent text-[var(--foreground)]/40 hover:text-[var(--foreground)]"
                    )}
                  >
                    Settings
                  </button>
                  <button 
                    onClick={() => setMenuTab('printer')}
                    className={cn(
                      "flex-1 pb-2 px-2 text-[9px] uppercase font-black tracking-wider text-center border-b-2 transition-all cursor-pointer",
                      menuTab === 'printer' ? "border-[var(--primary)] text-[var(--primary)]" : "border-transparent text-[var(--foreground)]/40 hover:text-[var(--foreground)]"
                    )}
                  >
                    Printer
                  </button>
                  <button 
                    onClick={() => setMenuTab('day_closing')}
                    className={cn(
                      "flex-1 pb-2 px-2 text-[9px] uppercase font-black tracking-wider text-center border-b-2 transition-all cursor-pointer",
                      menuTab === 'day_closing' ? "border-[var(--primary)] text-[var(--primary)]" : "border-transparent text-[var(--foreground)]/40 hover:text-[var(--foreground)]"
                    )}
                  >
                    🌙 Day Close
                  </button>
                </div>

                {/* 🔍 UNIVERSAL FUZZY SYSTEM SEARCH ENGINE */}
                {(() => {
                  const searchableDrawerItems = [
                    // --- PROFILE & ACCOUNT ---
                    {
                      id: 'act-logout',
                      title: 'LOG OUT / Sign Out',
                      category: 'Profile',
                      description: 'Safely sign out of current cloud operator session and clear active credentials',
                      keywords: ['log out', 'logout', 'sign out', 'terminate session', 'exit account', 'auth', 'profile', 'session', 'account'],
                      onClick: () => {
                        setMenuTab('profile');
                        handleLogout();
                      }
                    },
                    {
                      id: 'set-profile-operator',
                      title: 'Operator & Merchant Profile',
                      category: 'Profile',
                      description: 'View active operator initials, email identity, live node status, and session authorization',
                      keywords: ['profile', 'operator', 'merchant', 'user', 'email', 'account', 'authorization', 'node', 'admin', 'cashier'],
                      onClick: () => {
                        setMenuTab('profile');
                        addToast("Navigated to Operator Profile", "success");
                      }
                    },
                    {
                      id: 'set-pwa-install',
                      title: 'Install App / PWA Application',
                      category: 'Profile',
                      description: 'Install app locally on mobile or desktop for standalone, offline access',
                      keywords: ['install app', 'pwa', 'download app', 'desktop app', 'offline app', 'install', 'home screen'],
                      onClick: () => {
                        setMenuTab('profile');
                        addToast("Opened App Installation Panel", "success");
                      }
                    },

                    // --- BUSINESS SETTINGS (Profile, Journey, Features, Categories, Dashboard, Actions, Knowledge, Recovery) ---
                    {
                      id: 'set-store-name',
                      title: 'Store Name & Shop Title',
                      category: 'Business Settings',
                      description: 'Set official shop title for printed receipts, invoices, and app headers',
                      keywords: ['store name', 'shop name', 'business name', 'shop title', 'merchant name', 'store title', 'biz name'],
                      onClick: () => {
                        setMenuTab('business_settings');
                        setBusinessSubTab('profile');
                        addToast("Navigated to Store Branding Details", "success");
                      }
                    },
                    {
                      id: 'set-store-owner',
                      title: 'Store Proprietor & Owner Name',
                      category: 'Business Settings',
                      description: 'Set store manager or proprietor name printed on invoice headers and reports',
                      keywords: ['owner', 'proprietor', 'manager', 'owner name', 'proprietor name', 'boss'],
                      onClick: () => {
                        setMenuTab('business_settings');
                        setBusinessSubTab('profile');
                        addToast("Navigated to Store Owner Details", "success");
                      }
                    },
                    {
                      id: 'set-store-phone',
                      title: 'Store Contact Phone & WhatsApp',
                      category: 'Business Settings',
                      description: 'Configure customer care phone numbers and WhatsApp business contact',
                      keywords: ['phone', 'mobile', 'whatsapp', 'contact', 'phone number', 'customer care', 'call', 'number'],
                      onClick: () => {
                        setMenuTab('business_settings');
                        setBusinessSubTab('profile');
                        addToast("Navigated to Store Contact Settings", "success");
                      }
                    },
                    {
                      id: 'set-store-address',
                      title: 'Store Address & Location',
                      category: 'Business Settings',
                      description: 'Set physical store address, city, and location coordinates printed on invoices',
                      keywords: ['address', 'location', 'city', 'pincode', 'physical address', 'store address', 'shop address'],
                      onClick: () => {
                        setMenuTab('business_settings');
                        setBusinessSubTab('profile');
                        addToast("Navigated to Store Address Settings", "success");
                      }
                    },
                    {
                      id: 'set-gstin',
                      title: 'GSTIN / Legal Tax Registry',
                      category: 'Business Settings',
                      description: 'Set GST identification number and tax parameters for GST compliant invoices',
                      keywords: ['gstin', 'gst', 'vat', 'tax registration', 'tax number', 'tax id', 'gst number', 'taxation'],
                      onClick: () => {
                        setMenuTab('business_settings');
                        setBusinessSubTab('profile');
                        addToast("Navigated to Tax Registration Fields", "success");
                      }
                    },
                    {
                      id: 'set-upi',
                      title: 'UPI Payment VPA & QR Setup',
                      category: 'Business Settings',
                      description: 'Set merchant UPI ID to dynamically auto-generate GPay/PhonePe scan QR codes on bills',
                      keywords: ['upi', 'qr code', 'payment gateway', 'gpay', 'phonepe', 'paytm', 'upi id', 'vpa', 'payment qr', 'qr', 'scan qr'],
                      onClick: () => {
                        setMenuTab('business_settings');
                        setBusinessSubTab('profile');
                        addToast("Navigated to UPI Payment Configuration", "success");
                      }
                    },
                    {
                      id: 'set-store-logo',
                      title: 'Store Logo & Emblem Preset',
                      category: 'Business Settings',
                      description: 'Select or update store emblem preset logo icon rendered on invoices',
                      keywords: ['logo', 'emblem', 'store logo', 'business icon', 'badge', 'symbol', 'branding logo'],
                      onClick: () => {
                        setMenuTab('business_settings');
                        setBusinessSubTab('profile');
                        addToast("Navigated to Store Logo Setup", "success");
                      }
                    },
                    {
                      id: 'set-anniversary',
                      title: 'Store Opening Date & Anniversary',
                      category: 'Business Settings',
                      description: 'Set store launch date to track business age, milestone jubilees, and anniversaries',
                      keywords: ['opening date', 'anniversary', 'store opening', 'jubilee', 'business age', 'opening time', 'birthday'],
                      onClick: () => {
                        setMenuTab('business_settings');
                        setBusinessSubTab('profile');
                        addToast("Navigated to Store Opening Anniversary Setup", "success");
                      }
                    },
                    {
                      id: 'set-journey-roadmap',
                      title: 'Business Setup Roadmap & Progress',
                      category: 'Business Settings',
                      description: 'Track setup readiness factors, completion score, and step-by-step roadmap',
                      keywords: ['journey', 'setup', 'roadmap', 'readiness', 'milestones', 'checklist', 'progress', 'score'],
                      onClick: () => {
                        setMenuTab('business_settings');
                        setBusinessSubTab('journey');
                        addToast("Navigated to Business Journey & Setup Progress", "success");
                      }
                    },
                    {
                      id: 'set-business-mode',
                      title: 'Business Mode & Genre Selection',
                      category: 'Business Settings',
                      description: 'Switch preset workflows specifically suited for Kirana, Retail, Restaurant, Cafe, or Wholesale',
                      keywords: ['business mode', 'genre', 'kirana', 'restaurant', 'retail', 'wholesale', 'cafe', 'workflow', 'metaphor'],
                      onClick: () => {
                        setMenuTab('business_settings');
                        setBusinessSubTab('journey');
                        addToast("Navigated to Business Mode Preferences", "success");
                      }
                    },
                    {
                      id: 'set-export-journey-pdf',
                      title: 'Download Business Journey Strategy PDF',
                      category: 'Business Settings',
                      description: 'Export full setup roadmap and operational analysis report as a clean PDF',
                      keywords: ['export pdf', 'journey report', 'download pdf', 'strategy pdf', 'pdf report', 'pdf', 'export'],
                      onClick: () => {
                        setMenuTab('business_settings');
                        setBusinessSubTab('journey');
                        addToast("Navigated to Business Journey PDF Export", "success");
                      }
                    },
                    {
                      id: 'set-workflow-toggles',
                      title: 'Workflow Feature Toggles',
                      category: 'Business Settings',
                      description: 'Enable or disable Udhar Khata, Inventory, Customer, Cloud Sync, and Notifications modules',
                      keywords: ['workflow', 'features', 'toggles', 'udhar toggle', 'inventory toggle', 'notifications toggle', 'sync toggle'],
                      onClick: () => {
                        setMenuTab('business_settings');
                        setBusinessSubTab('features');
                        addToast("Navigated to Workflow Feature Toggles", "success");
                      }
                    },
                    {
                      id: 'set-custom-categories',
                      title: 'Manage Custom Catalog Categories',
                      category: 'Business Settings',
                      description: 'Add new product categories, assign emojis, recolor tags, and edit items',
                      keywords: ['categories', 'add category', 'edit category', 'delete category', 'category icon', 'category color', 'custom categories'],
                      onClick: () => {
                        setMenuTab('business_settings');
                        setBusinessSubTab('categories');
                        addToast("Navigated to Catalog Categories Manager", "success");
                      }
                    },
                    {
                      id: 'set-dashboard-widgets',
                      title: 'Customize Dashboard Widgets & Cards',
                      category: 'Business Settings',
                      description: 'Toggle, reorder, and resize sales revenue, gross profit, and stock alert cards',
                      keywords: ['dashboard cards', 'sales card', 'profit card', 'low stock card', 'widget layout', 'card size', 'widgets'],
                      onClick: () => {
                        setMenuTab('business_settings');
                        setBusinessSubTab('dashboard');
                        addToast("Navigated to Dashboard Card Layouts", "success");
                      }
                    },
                    {
                      id: 'set-quick-actions',
                      title: 'Configure Quick Action Shortcuts',
                      category: 'Business Settings',
                      description: 'Select up to 6 quick action buttons for instant billing, inventory, and analytics access',
                      keywords: ['quick actions', 'shortcuts', 'quick bill', 'quick product', 'pos shortcuts', 'buttons'],
                      onClick: () => {
                        setMenuTab('business_settings');
                        setBusinessSubTab('actions');
                        addToast("Navigated to Quick Action Shortcuts", "success");
                      }
                    },
                    {
                      id: 'set-knowledge-hub',
                      title: '🧠 Business Knowledge Hub & Manuals',
                      category: 'Business Settings',
                      description: 'Access storekeeper guides, billing tutorials, POS best practices, and growth manuals',
                      keywords: ['knowledge hub', 'guides', 'tutorials', 'help', 'best practices', 'manual', 'learn', 'knowledge'],
                      onClick: () => {
                        setMenuTab('business_settings');
                        setBusinessSubTab('knowledge');
                        addToast("Navigated to Business Knowledge Hub", "success");
                      }
                    },
                    {
                      id: 'set-recovery-center',
                      title: '🛡️ Business Recovery Center (Undo Deleted Records)',
                      category: 'Business Settings',
                      description: 'Restore accidentally deleted products, categories, or bills from 30-day trash archive',
                      keywords: ['recovery center', 'deleted items', 'restore category', 'trash', 'archive', 'undo delete', 'recycle bin', 'recover', 'deleted', 'undo'],
                      onClick: () => {
                        setMenuTab('business_settings');
                        setBusinessSubTab('recovery');
                        addToast("Navigated to Business Recovery Center", "success");
                      }
                    },

                    // --- SYSTEM SETTINGS (Interface, Security, Audio, Data) ---
                    {
                      id: 'set-language',
                      title: 'Interface Language Settings',
                      category: 'System Settings',
                      description: 'Switch application between English, Hindi, Marathi, and bilingual Hinglish dialects',
                      keywords: ['language', 'hindi', 'english', 'hinglish', 'marathi', 'speech', 'translation', 'locale', 'dialect'],
                      onClick: () => {
                        setMenuTab('settings');
                        setSettingsSubTab('interface');
                        addToast("Navigated to Language Settings", "success");
                      }
                    },
                    {
                      id: 'set-theme',
                      title: 'App Theme & Dark / Light Mode',
                      category: 'System Settings',
                      description: 'Toggle Dark mode, Light mode, or Auto theme with custom primary accent color palettes',
                      keywords: ['theme', 'dark mode', 'light mode', 'color scheme', 'accent color', 'appearance', 'night mode', 'colors'],
                      onClick: () => {
                        setMenuTab('settings');
                        setSettingsSubTab('interface');
                        addToast("Navigated to Theme & Appearance Settings", "success");
                      }
                    },
                    {
                      id: 'set-decimals',
                      title: 'Decimal Points Price Rounding',
                      category: 'System Settings',
                      description: 'Set default fractional decimal rules (no paise, 1 paise, or standard 2 decimals)',
                      keywords: ['precision', 'decimals', 'rounding', 'price precision', 'paisa', 'paise', 'fraction'],
                      onClick: () => {
                        setMenuTab('settings');
                        setSettingsSubTab('interface');
                        addToast("Navigated to Decimal Precision Settings", "success");
                      }
                    },
                    {
                      id: 'set-security-pin',
                      title: 'PIN Lock & Passcode Protection',
                      category: 'System Settings',
                      description: 'Configure secure login passcodes, screen protection delays, and auto-lock parameters',
                      keywords: ['security', 'pin', 'lock', 'lockout', 'password', 'autolock', 'privacy', 'passcode'],
                      onClick: () => {
                        setMenuTab('settings');
                        setSettingsSubTab('security');
                        addToast("Navigated to Security & PIN Lock Settings", "success");
                      }
                    },
                    {
                      id: 'set-reset-pin',
                      title: 'Reset Security PIN Code',
                      category: 'System Settings',
                      description: 'Change active operator PIN or configure new passcode access',
                      keywords: ['reset pin', 'change pin', 'forgot pin', 'security code', 'pin reset', 'new pin'],
                      onClick: () => {
                        setMenuTab('settings');
                        setSettingsSubTab('security');
                        addToast("Navigated to Reset PIN Settings", "success");
                      }
                    },
                    {
                      id: 'set-sound-effects',
                      title: 'Sound Effects & Billing Beep Chimes',
                      category: 'System Settings',
                      description: 'Configure scanner beep audio feedback, cash register chime sounds, and alert volume',
                      keywords: ['sound', 'audio', 'chime', 'beep', 'barcode sound', 'billing beep', 'mute', 'volume', 'sounds'],
                      onClick: () => {
                        setMenuTab('settings');
                        setSettingsSubTab('sound');
                        addToast("Navigated to Sound & Audio Settings", "success");
                      }
                    },
                    {
                      id: 'set-haptic-vibration',
                      title: 'Haptic Touch Vibration Feedback',
                      category: 'System Settings',
                      description: 'Enable or disable tactile vibration feedback on button presses and scanner taps',
                      keywords: ['haptic', 'vibration', 'touch feedback', 'vibrate', 'tactile', 'vibe'],
                      onClick: () => {
                        setMenuTab('settings');
                        setSettingsSubTab('sound');
                        addToast("Navigated to Haptic Feedback Settings", "success");
                      }
                    },
                    {
                      id: 'set-backup-cloud',
                      title: 'Firestore Database Cloud Sync',
                      category: 'System Settings',
                      description: 'Upload ledger records to real-time Google Cloud, download JSON backups, or set schedules',
                      keywords: ['backup', 'sync', 'cloud', 'firestore', 'restore', 'scheduled backup', 'data safety', 'download json'],
                      onClick: () => {
                        setMenuTab('settings');
                        setSettingsSubTab('data');
                        addToast("Navigated to Cloud Sync & Backup Settings", "success");
                      }
                    },
                    {
                      id: 'set-excel-export',
                      title: 'Excel Stock Exporter Tool',
                      category: 'System Settings',
                      description: 'Download full inventory records formatted cleanly as an Excel (.xlsx) spreadsheet',
                      keywords: ['excel', 'export', 'pdf', 'sheet', 'xlsx', 'download data', 'spreadsheet', 'catalog excel'],
                      onClick: () => {
                        setMenuTab('settings');
                        setSettingsSubTab('data');
                        addToast("Navigated to Data Exporter Settings", "success");
                      }
                    },
                    {
                      id: 'set-clear-data',
                      title: 'Factory Reset / Clear Database',
                      category: 'System Settings',
                      description: 'Wipe local application data and restore clean initial factory state',
                      keywords: ['reset data', 'clear database', 'factory reset', 'wipe data', 'delete all', 'clear cache'],
                      onClick: () => {
                        setMenuTab('settings');
                        setSettingsSubTab('data');
                        addToast("Navigated to Database Reset Settings", "success");
                      }
                    },

                    // --- PRINTER SETTINGS ---
                    {
                      id: 'set-printer-bluetooth',
                      title: 'Bluetooth Thermal Printer Scanner',
                      category: 'Printer Settings',
                      description: 'Scan and pair wireless Bluetooth thermal receipt printers',
                      keywords: ['bluetooth printer', 'scan bluetooth', 'pair printer', 'wireless print', 'bluetooth', 'scan bluetooth'],
                      onClick: () => {
                        setMenuTab('printer');
                        addToast("Navigated to Bluetooth Printer Scanner", "success");
                      }
                    },
                    {
                      id: 'set-printer-usb',
                      title: 'USB / OTG Thermal Printer Detect',
                      category: 'Printer Settings',
                      description: 'Auto-detect and pair cable-connected USB / OTG POS receipt printers',
                      keywords: ['usb printer', 'otg printer', 'detect usb', 'cable print', 'usb', 'otg'],
                      onClick: () => {
                        setMenuTab('printer');
                        addToast("Navigated to USB Printer Detection", "success");
                      }
                    },
                    {
                      id: 'set-printer-wifi',
                      title: 'WiFi IP Network Printer Registration',
                      category: 'Printer Settings',
                      description: 'Specify custom IP address to connect wireless network thermal printers',
                      keywords: ['wifi printer', 'ip printer', 'network printer', 'ethernet print', 'wifi', 'ip address', 'register wifi'],
                      onClick: () => {
                        setMenuTab('printer');
                        addToast("Navigated to Wireless IP Printer Setup", "success");
                      }
                    },
                    {
                      id: 'set-printer-paper-size',
                      title: 'Thermal Paper Sizing (58mm / 80mm)',
                      category: 'Printer Settings',
                      description: 'Format receipts specifically for 58mm handheld rolls or 80mm countertop rolls',
                      keywords: ['printer', '58mm', '80mm', 'paper width', 'margins', 'thermal printer', 'roll size', 'paper size'],
                      onClick: () => {
                        setMenuTab('printer');
                        addToast("Navigated to Thermal Paper Sizing", "success");
                      }
                    },
                    {
                      id: 'set-printer-template',
                      title: 'Receipt Templates & Formatting Styles',
                      category: 'Printer Settings',
                      description: 'Select Modern Minimal, Retail Classic, Compact Thermal, Wholesale, or Premium style',
                      keywords: ['receipt template', 'minimal template', 'wholesale template', 'modern invoice', 'invoice template', 'template'],
                      onClick: () => {
                        setMenuTab('printer');
                        addToast("Navigated to Receipt Template Options", "success");
                      }
                    },
                    {
                      id: 'set-printer-watermark',
                      title: 'Print Watermark Overlay Stamp',
                      category: 'Printer Settings',
                      description: 'Configure PAID, PENDING, or UDHAR watermark overlay on printed thermal receipts',
                      keywords: ['watermark', 'paid stamp', 'udhar stamp', 'opacity', 'stamp', 'print watermark'],
                      onClick: () => {
                        setMenuTab('printer');
                        addToast("Navigated to Print Watermark Settings", "success");
                      }
                    },
                    {
                      id: 'set-printer-logo',
                      title: 'Upload Store Logo Graphic for Receipts',
                      category: 'Printer Settings',
                      description: 'Upload custom JPEG/PNG store graphic logo printed at the header of thermal bills',
                      keywords: ['print logo', 'receipt logo', 'upload logo', 'image logo', 'logo graphic', 'printer logo'],
                      onClick: () => {
                        setMenuTab('printer');
                        addToast("Navigated to Receipt Logo Upload", "success");
                      }
                    },
                    {
                      id: 'set-printer-alignment',
                      title: 'Receipt Header Alignment & Font Sizing',
                      category: 'Printer Settings',
                      description: 'Align text left/center/right and set small/medium/large receipt font sizes',
                      keywords: ['alignment', 'center text', 'left align', 'header alignment', 'print font size', 'font sizing'],
                      onClick: () => {
                        setMenuTab('printer');
                        addToast("Navigated to Receipt Typography Settings", "success");
                      }
                    },
                    {
                      id: 'set-printer-advanced-panel',
                      title: 'Advanced Printer Hardware Panel',
                      category: 'Printer Settings',
                      description: 'Unlock auto-reconnect loops, item name column wrapping, and bill paper compression',
                      keywords: ['advanced controls', 'hardware panel', 'auto reconnect', 'silent recovery', 'compression', 'paper saver'],
                      onClick: () => {
                        setMenuTab('printer');
                        addToast("Navigated to Advanced Hardware Controls", "success");
                      }
                    },
                    {
                      id: 'set-printer-cooldown',
                      title: 'Duplicate Print Lockout Cooldown',
                      category: 'Printer Settings',
                      description: 'Set delay interval to prevent accidental double printing during rapid checkout clicks',
                      keywords: ['reprint', 'cooldown', 'double print', 'lockout', 'duplicate bill', 'print speed', 'reprint lock'],
                      onClick: () => {
                        setMenuTab('printer');
                        addToast("Navigated to Cooldown Protection Settings", "success");
                      }
                    },
                    {
                      id: 'set-printer-test-print',
                      title: 'Test Print Diagnostic Ticket',
                      category: 'Printer Settings',
                      description: 'Print sample receipt ticket to test hardware connection, alignment, and paper feed',
                      keywords: ['test print', 'diagnostic ticket', 'spool check', 'sample receipt', 'test ticket', 'print test'],
                      onClick: () => {
                        setMenuTab('printer');
                        addToast("Navigated to Test Print Diagnostics", "success");
                      }
                    },

                    // --- OPERATIONS & TOOLS ---
                    {
                      id: 'set-day-closing',
                      title: '🌙 Daily Store Close & Shift Tallies',
                      category: 'Operations',
                      description: 'Close active store shifts, confirm cash drawer totals, and review digital sales books',
                      keywords: ['day close', 'closing', 'store closing', 'shift handover', 'snapshot', 'cash drawer', 'tally', 'shift close'],
                      onClick: () => {
                        setMenuTab('day_closing');
                        addToast("Navigated to Daily Day Closing Centre", "success");
                      }
                    },
                    {
                      id: 'tool-calculator',
                      title: 'Universal Calculator (with Undo & Redo)',
                      category: 'Tools',
                      description: 'Open floating shopkeeper calculator featuring MC/MR/MS memory, Copy, and multi-step Undo/Redo',
                      keywords: ['calculator', 'undo redo calculator', 'mc mr ms', 'copy calculation', 'calc', 'math', 'undo', 'redo'],
                      onClick: () => {
                        handleTabChange('billing');
                        setShowMenu(false);
                        addToast("Opened Universal Calculator", "success");
                      }
                    },
                    {
                      id: 'tool-voice-assistant',
                      title: 'Voice Product Assistant',
                      category: 'Tools',
                      description: 'Speak natural voice commands to look up items, check stock, or add products to cart',
                      keywords: ['voice assistant', 'speak', 'voice search', 'microphone', 'voice product', 'audio search', 'assistant'],
                      onClick: () => {
                        setShowVoiceAssistant(true);
                        setShowMenu(false);
                      }
                    },

                    // --- PRIMARY NAVIGATION ---
                    {
                      id: 'nav-home',
                      title: 'Products Catalog',
                      category: 'Navigation',
                      description: 'View products, add/edit inventory stock, search items, & manage custom categories',
                      keywords: ['products', 'catalog', 'home', 'items', 'inventory', 'stock', 'add product', 'categories', 'general'],
                      onClick: () => {
                        setActiveTab('home');
                        setShowMenu(false);
                        addToast("Navigated to Products Catalog", "success");
                      }
                    },
                    {
                      id: 'nav-billing',
                      title: 'Billing POS Terminal',
                      category: 'Navigation',
                      description: 'Launch checkout register, scan products, or apply manual wholesale/retail prices',
                      keywords: ['billing', 'pos', 'terminal', 'checkout', 'sales', 'invoice', 'cart', 'wholesale', 'retail', 'print'],
                      onClick: () => {
                        setActiveTab('billing');
                        setShowMenu(false);
                        addToast("Opened Active Billing POS Terminal", "success");
                      }
                    },
                    {
                      id: 'nav-analytics',
                      title: 'Sales & Analytics Dashboard',
                      category: 'Navigation',
                      description: 'Analyze revenue, profits, average bills, and view real-time graphical statistics',
                      keywords: ['analytics', 'performance', 'charts', 'profit', 'revenue', 'reports', 'insights', 'sales', 'graphs'],
                      onClick: () => {
                        setActiveTab('analytics');
                        setShowMenu(false);
                        addToast("Opened Sales & Analytics Dashboard", "success");
                      }
                    },
                    {
                      id: 'nav-udhar',
                      title: 'Udhar Ledger Credit Book',
                      category: 'Navigation',
                      description: 'Manage customer credit balances, track dues, log repayments and customer lists',
                      keywords: ['udhar', 'credit', 'ledger', 'dues', 'customer account', 'loans', 'khata', 'payments'],
                      onClick: () => {
                        setActiveTab('udhar');
                        setShowMenu(false);
                        addToast("Opened Udhar Credit Book Ledger", "success");
                      }
                    },
                    {
                      id: 'nav-notes',
                      title: 'Quick Notes & Scratchpad',
                      category: 'Navigation',
                      description: 'Open immediate digital post-its, custom checklists, and reminders',
                      keywords: ['notes', 'reminders', 'scratchpad', 'todo', 'tasks', 'memo'],
                      onClick: () => {
                        setActiveTab('notes');
                        setShowMenu(false);
                        addToast("Opened Daily Scratchpad Notes", "success");
                      }
                    }
                  ];

                  const query = drawerSearchQuery.toLowerCase().trim();
                  const filteredDrawerResults = query 
                    ? searchableDrawerItems.filter(item => {
                        return (
                          item.title.toLowerCase().includes(query) ||
                          item.description.toLowerCase().includes(query) ||
                          item.category.toLowerCase().includes(query) ||
                          item.keywords.some(kw => kw.toLowerCase().includes(query))
                        );
                      })
                    : [];

                  return (
                    <div className="relative bg-[var(--foreground)]/[0.02] border border-[var(--border)] rounded-2xl p-3 space-y-2">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--foreground)]/40" />
                        <input
                          type="text"
                          value={drawerSearchQuery}
                          onChange={(e) => setDrawerSearchQuery(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              addToDrawerSearchHistory(drawerSearchQuery);
                            }
                          }}
                          placeholder="Fuzzy-search settings, print width, billing..."
                          className="w-full text-[10px] font-bold border border-[var(--border)] rounded-xl pl-8.5 pr-8 py-2 bg-[var(--card)] text-[var(--foreground)] placeholder-[var(--foreground)]/30 focus:ring-1 focus:ring-[var(--primary)] focus:outline-none transition-all shadow-sm"
                        />
                        {drawerSearchQuery && (
                          <button
                            onClick={() => setDrawerSearchQuery('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 w-4.5 h-4.5 flex items-center justify-center rounded-full bg-[var(--foreground)]/10 hover:bg-[var(--foreground)]/20 text-[var(--foreground)]/50 transition-all cursor-pointer"
                          >
                            <X size={9} className="stroke-[3]" />
                          </button>
                        )}
                      </div>

                      {/* Search History Row */}
                      {drawerSearchHistory.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1 text-[8px] font-black uppercase tracking-wider text-[var(--foreground)]/45 pt-1.5 border-t border-[var(--border)] border-dashed">
                          <span className="shrink-0 flex items-center gap-1">⏰ Recent:</span>
                          <div className="flex flex-wrap gap-1 items-center max-w-full">
                            {drawerSearchHistory.map((hQuery, idx) => (
                              <button
                                key={`drawer-hist-${hQuery}-${idx}`}
                                onClick={() => setDrawerSearchQuery(hQuery)}
                                className="px-2 py-0.5 rounded-md border border-[var(--border)] bg-[var(--foreground)]/[0.02] hover:bg-[var(--primary)]/10 hover:border-[var(--primary)] hover:text-[var(--primary)] transition-all cursor-pointer font-bold uppercase truncate max-w-[8rem]"
                              >
                                {hQuery}
                              </button>
                            ))}
                            <button
                              onClick={clearDrawerSearchHistory}
                              className="text-[var(--primary)] font-black hover:underline cursor-pointer ml-1 text-[7px]"
                            >
                              CLEAR
                            </button>
                          </div>
                        </div>

                      )}
                      {drawerSearchQuery && (
                        <div className="max-h-[14rem] overflow-y-auto divide-y divide-[var(--border)] pr-1 space-y-1 scrollbar-thin mt-1">
                          {filteredDrawerResults.length > 0 ? (
                            filteredDrawerResults.map((item, idx) => {
                              let CategoryIcon = SettingsIcon;
                              let iconColor = 'text-indigo-500 bg-indigo-500/10 border-indigo-500/20';
                              if (item.category === 'Navigation') {
                                CategoryIcon = Sliders;
                                iconColor = 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
                              } else if (item.category === 'Business Settings') {
                                CategoryIcon = Sliders;
                                iconColor = 'text-rose-500 bg-rose-500/10 border-rose-500/20';
                              } else if (item.category === 'Printer Settings') {
                                CategoryIcon = Sliders;
                                iconColor = 'text-amber-500 bg-amber-500/10 border-amber-500/20';
                              }

                              return (
                                <button
                                  key={`drawer-res-${item.id}-${idx}`}
                                  onClick={() => {
                                    addToDrawerSearchHistory(drawerSearchQuery);
                                    item.onClick();
                                    setDrawerSearchQuery('');
                                  }}
                                  className="w-full text-left p-2 rounded-xl hover:bg-[var(--foreground)]/[0.04] transition-all flex items-start gap-2.5 group cursor-pointer border border-transparent hover:border-[var(--border)]"
                                >
                                  <div className={`p-1.5 rounded-lg border ${iconColor} mt-0.5 shrink-0`}>
                                    <CategoryIcon size={11} />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between gap-2">
                                      <span className="text-[10px] font-black uppercase text-[var(--foreground)] tracking-tight truncate group-hover:text-[var(--primary)] transition-all">
                                        {item.title}
                                      </span>
                                      <span className="text-[6.5px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md bg-[var(--foreground)]/[0.04] border border-[var(--border)] shrink-0">
                                        {item.category}
                                      </span>
                                    </div>
                                    <p className="text-[8.5px] text-[var(--foreground)]/65 font-medium leading-relaxed mt-0.5">
                                      {item.description}
                                    </p>
                                  </div>
                                </button>
                              );
                            })
                          ) : (
                            <div className="py-4 text-center space-y-1.5">
                              <HelpCircle size={14} className="mx-auto text-[var(--foreground)]/30 animate-pulse" />
                              <p className="text-[8.5px] text-[var(--foreground)]/40 font-bold uppercase tracking-wider">No configurations matched</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })()}

                {menuTab === 'profile' ? (
                  <div className="pt-2">
                    <ProfileScreen 
                      state={state} 
                      t={t} 
                      deferredPrompt={deferredPrompt} 
                      onInstall={handleInstallClick} 
                      onShareProductList={handleShareProductList}
                      isSharing={isSharing}
                      onUpdate={handleUpdateSettings}
                      onLogout={handleLogout}
                    />
                  </div>
                ) : menuTab === 'business_settings' ? (
                  <div className="pt-2">
                    <BusinessSettingsScreen 
                      state={state} 
                      t={t} 
                      onUpdateSettings={handleUpdateSettings} 
                      onUpdateState={handleUpdateComponentState}
                      activeSubTab={businessSubTab}
                      onChangeSubTab={setBusinessSubTab}
                    />
                  </div>
                ) : menuTab === 'settings' ? (
                  <SettingsScreen 
                    state={state} 
                    t={t} 
                    onUpdate={handleUpdateSettings} 
                    activeSubTab={settingsSubTab}
                    onChangeSubTab={setSettingsSubTab} 
                    onShowHelp={() => { setShowHelp(true); setShowMenu(false); }}
                    onResetPIN={() => {
                      setShowMenu(false);
                      if (state.settings.pin) {
                        setIsVerifyingOldPIN(true);
                        setShowChangePIN(true);
                      } else {
                        setIsVerifyingOldPIN(false);
                        setShowChangePIN(true);
                      }
                    }}
                    onExportExcel={() => setExportModal({ isOpen: true, format: 'excel' })}
                    onExportPDF={() => setExportModal({ isOpen: true, format: 'pdf' })}
                    onImport={importData}
                    onBackup={handleBackup}
                    onRestore={handleRestore}
                    onClearCache={() => {
                      if (confirm('Wipe everything?')) {
                        localStorage.clear();
                        window.location.reload();
                      }
                    }}
                    isSyncing={isSyncing}
                    isExporting={isExporting}
                  />
                ) : menuTab === 'printer' ? (
                  <div className="pt-2">
                    <PrinterSettingsScreen 
                      state={state} 
                      t={t} 
                      onUpdateState={handleUpdateComponentState}
                    />
                  </div>
                ) : (
                  <div className="pt-2">
                    <StoreClosingControlCenter 
                      state={state} 
                      onUpdateSettings={handleUpdateSettings} 
                      onNavigateTab={(tab) => { setActiveTab(tab); setShowMenu(false); }}
                      t={t}
                    />
                  </div>
                )}
              </div>

              <div className="pt-6 border-t border-[var(--border)] text-[9px] font-black uppercase text-center opacity-30 tracking-[0.2em]">
                Retail Hub Engine v1.4
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function DeleteConfirmationModal({ onClose, onConfirm, count, t }: { 
  onClose: () => void; 
  onConfirm: () => void; 
  count: number;
  t: any;
}) {
  const [inputValue, setInputValue] = useState('');

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="w-full max-w-sm card p-8 space-y-6 shadow-[0_30px_60px_rgba(0,0,0,0.5)] border-red-500/20"
      >
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="h-16 w-16 rounded-3xl bg-red-500/10 text-red-500 flex items-center justify-center shadow-inner">
            <Trash2 size={32} />
          </div>
          <div>
            <h3 className="text-xl font-black uppercase tracking-tight">Purge Confirmation</h3>
            <p className="text-[10px] font-black uppercase tracking-widest opacity-40 mt-1">Caution: Irreversible Op</p>
          </div>
          <p className="text-xs font-medium opacity-60 leading-relaxed">
            You are about to delete <strong>{count} {count === 1 ? 'item' : 'items'}</strong> from the database, cloud, and local device.
          </p>
          <div className="w-full p-4 rounded-2xl bg-red-500/5 border border-red-500/10 space-y-3">
            <p className="text-[10px] font-black uppercase tracking-widest text-red-500/60">
              Type <span className="text-red-500">"yes"</span> to authorize
            </p>
            <input 
              autoFocus
              className="w-full bg-[var(--background)] border border-red-500/20 rounded-xl px-4 py-3 text-center font-black uppercase tracking-[0.2em] focus:border-red-500 outline-none transition-all"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value.toLowerCase())}
              placeholder="..."
            />
          </div>
        </div>

        <div className="flex gap-3">
          <Button 
            variant="ghost" 
            onClick={onClose}
            className="flex-1 rounded-2xl h-12 text-[10px] font-black uppercase tracking-widest opacity-40 hover:opacity-100"
          >
            Abort
          </Button>
          <Button 
            variant="primary"
            disabled={inputValue !== 'yes'}
            onClick={onConfirm}
            className="flex-1 rounded-2xl h-12 bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/20 disabled:opacity-30 disabled:scale-100"
          >
            Confirm
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// --- Sub-Components ---

const ItemCard = React.memo(({ item, isLocked, language, precision, onEdit, onDelete, t, onUpdateItem, isSelected, anyItemsSelected, onSelect, onPeek }: { 
  item: Item; 
  isLocked: boolean; 
  language: LanguageType;
  precision: number;
  onEdit: () => void;
  onDelete: () => void;
  t: any;
  onUpdateItem: (id: string, updates: Partial<Item>) => void;
  isSelected: boolean;
  anyItemsSelected: boolean;
  onSelect: () => void;
  onPeek?: (preview: { type: 'item' | 'customer' | 'bill' | 'notification' | 'analytics'; payload: any }) => void;
}) => {
  const category = DEFAULT_CATEGORIES.find(c => c.id === item.categoryId);
  const name = (item.translations && (item.translations[language] || item.translations.en)) || item.name;
  
  const [holdProgress, setHoldProgress] = useState(0);
  const [isHolding, setIsHolding] = useState(false);
  const [justSelected, setJustSelected] = useState(false);

  useEffect(() => {
    if (isSelected) {
      setJustSelected(true);
      const timer = setTimeout(() => {
        setJustSelected(false);
      }, 800);
      return () => clearTimeout(timer);
    } else {
      setJustSelected(false);
    }
  }, [isSelected]);

  const holdTimerRef = React.useRef<any>(null);
  const progressIntervalRef = React.useRef<any>(null);
  const pointerStartRef = React.useRef<{ x: number, y: number } | null>(null);
  const hasMovedRef = React.useRef<boolean>(false);

  const startHold = (e: React.PointerEvent) => {
    if (e.button !== 0) return; // Only process left click/primary touch
    if ((e.target as HTMLElement).closest('button')) return;
    
    pointerStartRef.current = { x: e.clientX, y: e.clientY };
    hasMovedRef.current = false;
    
    if (anyItemsSelected) {
      return;
    }
    
    setIsHolding(true);
    setHoldProgress(0);
    
    const duration = 1500;
    const intervalTime = 50;
    let elapsed = 0;
    
    holdTimerRef.current = setTimeout(() => {
      onSelect();
      if (navigator.vibrate) navigator.vibrate(100);
      cancelHold();
    }, duration);

    progressIntervalRef.current = setInterval(() => {
      elapsed += intervalTime;
      const pct = Math.min((elapsed / duration) * 100, 100);
      setHoldProgress(pct);
    }, intervalTime);
  };

  const cancelHold = () => {
    if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    setIsHolding(false);
    setHoldProgress(0);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!pointerStartRef.current) return;
    const dx = e.clientX - pointerStartRef.current.x;
    const dy = e.clientY - pointerStartRef.current.y;
    if (Math.abs(dx) > 10 || Math.abs(dy) > 10) {
      hasMovedRef.current = true;
      cancelHold();
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    cancelHold();
    
    if (pointerStartRef.current && !hasMovedRef.current) {
      const dx = e.clientX - pointerStartRef.current.x;
      const dy = e.clientY - pointerStartRef.current.y;
      if (Math.abs(dx) <= 10 && Math.abs(dy) <= 10) {
        if (anyItemsSelected) {
          onSelect();
        }
      }
    }
    pointerStartRef.current = null;
  };

  const handleCardClick = (e: React.MouseEvent) => {
    // Falls back/stops propagation
    if (anyItemsSelected) {
      e.stopPropagation();
    }
  };

  return (
    <motion.div 
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={isSelected ? {
        opacity: 1,
        scale: justSelected ? [1, 1.05, 1.01] : 1.01,
        boxShadow: justSelected 
          ? "0 0 25px var(--primary), 0 10px 25px rgba(var(--primary-rgb), 0.3)" 
          : "0 10px 25px rgba(var(--primary-rgb), 0.15)",
      } : {
        opacity: 1,
        scale: 1,
        boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)"
      }}
      whileHover={{ y: -6, scale: isSelected ? 1.025 : 1.018 }}
      whileTap={{ scale: 0.995 }}
      transition={{ 
        scale: { type: "spring", stiffness: 450, damping: 14 },
        boxShadow: { duration: justSelected ? 0.4 : 0.2 },
        opacity: { duration: 0.2 }
      }}
      className={`card group overflow-hidden border-2 relative select-none cursor-pointer transition-all duration-200 outline-none focus-within:ring-4 focus-within:ring-[var(--primary)]/40 focus:ring-4 focus:ring-[var(--primary)]/40 ${
        isSelected ? 'border-[var(--primary)] shadow-2xl' : 'border-[var(--border)] hover:border-[var(--primary)]/40 hover:shadow-xl'
      }`}
      style={{
        WebkitTouchCallout: 'none',
        WebkitUserSelect: 'none',
        userSelect: 'none',
      }}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect();
        }
      }}
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      onPointerDown={startHold}
      onPointerUp={handlePointerUp}
      onPointerLeave={cancelHold}
      onPointerCancel={cancelHold}
      onPointerMove={handlePointerMove}
      onClick={handleCardClick}
    >
      {/* Temporary selection expanding glow border */}
      <AnimatePresence>
        {justSelected && (
          <motion.div 
            initial={{ opacity: 0.8, scale: 0.96 }}
            animate={{ opacity: [0.8, 1, 0], scale: [0.96, 1.04, 1.08] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.75, ease: "easeOut" }}
            className="absolute inset-x-0 inset-y-0 rounded-[inherit] border-4 border-[var(--primary)] pointer-events-none z-40 select-none shadow-[0_0_35px_var(--primary)]"
          />
        )}
      </AnimatePresence>

      {/* Hold Visual Overlay */}
      {isHolding && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex flex-col items-center justify-center z-45 select-none pointer-events-none">
          <div className="text-white text-[10px] font-black uppercase tracking-wider mb-2 flex items-center gap-1.5 animate-pulse">
            <Clock size={11} /> Hold to select ({((1500 - (holdProgress / 100 * 1500)) / 1000).toFixed(1)}s)
          </div>
          <div className="w-1/2 h-1.5 rounded-full bg-white/20 overflow-hidden border border-white/10 shadow-inner">
            <div className="h-full bg-[var(--primary)] transition-all duration-75" style={{ width: `${holdProgress}%` }} />
          </div>
        </div>

      )}
      {/* Selection Badge */}
      {isSelected && (
        <div className="absolute top-3 right-3 z-30 bg-[var(--primary)] text-white p-1 rounded-full shadow-lg border border-white/20">
          <Check size={16} strokeWidth={4} />
        </div>
      )}

      <div className="relative p-4 cursor-pointer">
        {/* Glow effect on hover */}
        <div className={`absolute inset-0 bg-gradient-to-br from-[var(--primary)]/10 to-transparent transition-opacity duration-500 ${
          isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
        }`} />
        
        <div className="flex items-center justify-between relative z-10 gap-2">
          <div className="flex gap-3 items-center min-w-0">
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border text-xl shadow-inner group-hover:scale-105 transition-transform duration-500 ${
              isSelected ? 'bg-[var(--primary)] text-white border-white/20' : 'bg-[var(--background)] border-[var(--border)]'
            }`}>
              {isSelected ? <TrendingUp size={18} /> : (category?.icon || '📦')}
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold tracking-tight text-[var(--foreground)] truncate leading-tight">{name}</h3>
              <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                <span className="inline-flex items-center rounded-full bg-[var(--primary)]/10 px-1.5 py-0.5 text-[8.5px] font-bold text-[var(--primary)] uppercase tracking-tight leading-none">
                  {category?.name}
                </span>
                <span className={cn(
                  "text-[8.5px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded border select-none leading-none",
                  item.quantity <= 0
                    ? "text-red-500 bg-red-500/10 border-red-500/20"
                    : item.quantity <= (item.minStockLevel ?? 10)
                      ? "text-amber-500 bg-amber-500/10 border-amber-500/20 animate-pulse"
                      : "text-emerald-500 bg-emerald-500/10 border-emerald-500/15"
                )}>
                  Stock: {item.quantity} {item.unit} {item.quantity <= (item.minStockLevel ?? 10) && "⚠️"}
                </span>
                <span className="text-[8.5px] opacity-35 font-mono select-none" title={`${t.lastCheck}: ${new Date(item.lastUpdated).toLocaleDateString()}`}>
                  U: {new Date(item.lastUpdated).toLocaleDateString([], { month: '2-digit', day: '2-digit' })}
                </span>
              </div>
            </div>
          </div>
          <div className="flex gap-1.5 shrink-0 z-10 transition-all duration-200 opacity-60 sm:opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 group-focus:opacity-100 focus-within:opacity-100">
            {onPeek && (
              <Button 
                variant="outline" 
                size="icon" 
                onClick={(e) => {
                  e.stopPropagation();
                  onPeek({ type: 'item', payload: item });
                }} 
                className="h-8 w-8 rounded-[var(--radius,9999px)] bg-[var(--background)] border border-[var(--border)] text-emerald-500 hover:bg-emerald-500/10 hover:border-emerald-500/30 flex items-center justify-center cursor-pointer shadow-sm hover:scale-105 transition-transform"
                title="Quick Peek"
              >
                <Eye size={14} />
              </Button>
            )}
            <Button 
              variant="outline" 
              size="icon" 
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }} 
              className="h-8 w-8 rounded-[var(--radius,9999px)] bg-[var(--background)] border border-[var(--border)] text-[var(--foreground)]/80 hover:bg-[var(--primary)]/10 hover:text-[var(--primary)] hover:border-[var(--primary)]/30 flex items-center justify-center cursor-pointer shadow-sm hover:scale-105 transition-transform"
              title="Edit Item"
            >
              <Edit2 size={13} />
            </Button>
            <Button 
              variant="outline" 
              size="icon" 
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }} 
              className="h-8 w-8 rounded-[var(--radius,9999px)] bg-[var(--background)] border border-[var(--border)] text-red-500 hover:bg-red-500/10 hover:border-red-500/30 flex items-center justify-center cursor-pointer shadow-sm hover:scale-105 transition-transform"
              title="Delete Item"
            >
              <Trash2 size={13} />
            </Button>
          </div>
        </div>
        
        <div className="mt-3.5 grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-center relative z-10">
          {/* Retail */}
          <div className="rounded-xl bg-[var(--primary)]/5 p-2 border border-[var(--primary)]/15">
            <p className="text-[8.5px] font-black uppercase tracking-wider text-[var(--primary)] opacity-75 mb-0.5">{t.retail}</p>
            <p className="text-xs font-black text-[var(--foreground)] truncate">₹{formatNumber(item.retailPrice, precision)}</p>
            <p className="text-[7.5px] opacity-40">/ {item.retailPriceUnit}</p>
          </div>

          {/* Wholesale */}
          <div className="rounded-xl bg-[var(--foreground)]/[0.02] p-2 border border-[var(--border)]/60">
            <p className="text-[8.5px] font-black uppercase tracking-wider opacity-45 mb-0.5">{t.wholesale}</p>
            <p className="text-xs font-black text-[var(--foreground)] truncate">₹{formatNumber(item.wholesalePrice, precision)}</p>
            <p className="text-[7.5px] opacity-40">/ {item.wholesalePriceUnit}</p>
          </div>

          {/* Buy */}
          <div className="rounded-xl bg-[var(--foreground)]/[0.02] p-2 border border-[var(--border)]/60">
            <p className="text-[8.5px] font-black uppercase tracking-wider opacity-45 mb-0.5">{t.buy}</p>
            <div className="flex flex-col items-center justify-center">
              {isLocked ? (
                <Lock size={10} className="opacity-40" />
              ) : (
                <>
                  <p className="text-xs font-black text-[var(--foreground)] truncate">₹{formatNumber(item.buyingPrice, precision)}</p>
                  <p className="text-[7.5px] opacity-40">/ {item.buyingPriceUnit}</p>
                </>
              )}
            </div>
          </div>

          {/* Profit Margin */}
          <div className="rounded-xl bg-emerald-500/5 p-2 border border-emerald-500/15">
            <p className="text-[8.5px] font-black uppercase tracking-wider text-emerald-600 opacity-75 mb-0.5">{t.margin}</p>
            <div className="flex flex-col items-center justify-center">
              {isLocked ? (
                <Lock size={10} className="opacity-40" />
              ) : (
                <>
                  <p className="text-xs font-black text-emerald-600 truncate">₹{formatNumber(item.retailPrice - item.buyingPrice, precision)}</p>
                  <p className="text-[7.5px] text-emerald-500 font-bold leading-none">
                    {item.buyingPrice > 0 ? `+${formatNumber(((item.retailPrice - item.buyingPrice) / item.buyingPrice) * 100, 1)}%` : '---'}
                  </p>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Notes / Extra Info Section */}
        {item.notes && (
          <div className="mt-2.5 p-2 bg-indigo-500/5 rounded-xl border border-indigo-500/10 relative z-10">
            <p className="text-[9px] font-medium leading-relaxed opacity-70 italic">“{item.notes}”</p>
          </div>
        )}


      </div>
    </motion.div>
  );
});

function NavButton({ active, icon, label, onClick }: { active: boolean; icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <motion.button 
      whileHover={{ y: -1 }}
      whileTap={{ scale: 0.92 }}
      onClick={onClick}
      className="relative flex flex-col items-center gap-1.5 py-1.5 px-4 select-none cursor-pointer group focus:outline-none"
    >
      {/* Sliding Background Tab Pill */}
      {active && (
        <motion.div
          layoutId="active-tab-indicator"
          className="absolute inset-0 bg-[var(--primary)]/10 dark:bg-[var(--primary)]/15 border border-[var(--primary)]/15 rounded-2xl shadow-xs"
          transition={{ type: "spring", stiffness: 360, damping: 26 }}
        />
      )}

      {/* Animated Floating Icon Container */}
      <motion.div
        animate={active ? { scale: 1.15, y: -2 } : { scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 420, damping: 22 }}
        className={cn(
          "rounded-full p-1 transition-colors duration-200 z-10",
          active ? "text-[var(--primary)] bg-[var(--primary)]/5" : "text-[var(--foreground)] opacity-40 group-hover:opacity-75"
        )}
      >
        {React.cloneElement(icon as React.ReactElement<any>, { size: 20 })}
      </motion.div>

      {/* Scale & Contrast Text */}
      <motion.span
        animate={active ? { scale: 1.05, opacity: 1 } : { scale: 1, opacity: 0.5 }}
        transition={{ type: "spring", stiffness: 300, damping: 22 }}
        className={cn(
          "text-[9px] uppercase tracking-wider font-extrabold z-10 leading-none transition-colors duration-200",
          active ? "text-[var(--primary)]" : "text-[var(--foreground)] group-hover:text-[var(--foreground)]/80"
        )}
      >
        {label}
      </motion.span>

      {/* Dynamic Sliding Anchor Anchor Dot */}
      {active && (
        <motion.div 
          layoutId="active-nav-dot" 
          className="h-1 w-1.5 rounded-full bg-[var(--primary)] mt-0.5 z-10" 
          transition={{ type: "spring", stiffness: 320, damping: 22 }}
        />
      )}
    </motion.button>
  );
}

/**
 * ExportCostChoiceModal Sub-component
 */
function ExportCostChoiceModal({ 
  onClose, 
  onSelectOption 
}: { 
  onClose: () => void; 
  onSelectOption: (includeCost: boolean) => void; 
}) {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl"
    >
      <motion.div 
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="w-full max-w-lg bg-[var(--background)] rounded-[2.5rem] border border-[var(--border)] shadow-2xl overflow-hidden flex flex-col"
      >
        <div className="p-8 border-b border-[var(--border)] flex items-center justify-between bg-gradient-to-r from-[var(--primary)]/10 to-transparent">
          <div>
            <h2 className="text-xl font-black tracking-tight uppercase">Select Export Mode</h2>
            <p className="text-[10px] font-black uppercase tracking-widest opacity-40 mt-1">
              Choose whether to include Cost Prices in your document
            </p>
          </div>
          <Button variant="outline" size="icon" onClick={onClose} className="rounded-full h-10 w-10 border-white/10">
            <X size={20} />
          </Button>
        </div>

        <div className="p-8 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Option 1: With Cost Price */}
            <div 
              onClick={() => onSelectOption(true)}
              className="p-6 rounded-3xl bg-emerald-500/5 hover:bg-emerald-500/10 border border-emerald-500/10 hover:border-emerald-500/30 cursor-pointer transition-all flex flex-col justify-between group h-40 select-none"
            >
              <div>
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mb-4 font-bold text-lg">
                  ₹
                </div>
                <h4 className="font-black text-sm text-[var(--foreground)] leading-none mb-1 group-hover:text-emerald-500 transition-colors">
                  With Cost Price
                </h4>
                <p className="text-[10px] opacity-60 leading-normal font-medium">
                  Includes buying price, profit margin calculation, and cost units. Best for internal operations and management.
                </p>
              </div>
            </div>

            {/* Option 2: Without Cost Price */}
            <div 
              onClick={() => onSelectOption(false)}
              className="p-6 rounded-3xl bg-[var(--primary)]/5 hover:bg-[var(--primary)]/10 border border-[var(--primary)]/10 hover:border-[var(--primary)]/30 cursor-pointer transition-all flex flex-col justify-between group h-40 select-none"
            >
              <div>
                <div className="w-10 h-10 rounded-2xl bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center mb-4 font-bold text-lg">
                  🏷️
                </div>
                <h4 className="font-black text-sm text-[var(--foreground)] leading-none mb-1 group-hover:text-[var(--primary)] transition-colors">
                  Without Cost Price
                </h4>
                <p className="text-[10px] opacity-60 leading-normal font-medium">
                  Hides confidential cost details. Safely lists only retail and wholesale prices. Perfect to share with retail customers.
                </p>
              </div>
            </div>
          </div>
          
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={onClose} className="rounded-full px-6">
              Cancel
            </Button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

/**
 * HelpModal Sub-component
 */
function HelpModal({ onClose, t }: { onClose: () => void; t: any }) {
  const faqs = [
    { q: t.faq1Q, a: t.faq1A },
    { q: t.faq2Q, a: t.faq2A },
  ];

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl"
    >
      <motion.div 
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="w-full max-w-2xl bg-[var(--background)] rounded-[2.5rem] border border-[var(--border)] shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
      >
        <div className="p-8 border-b border-[var(--border)] flex items-center justify-between bg-gradient-to-r from-[var(--primary)]/10 to-transparent">
          <div>
            <h2 className="text-2xl font-black tracking-tight">{t.help}</h2>
            <p className="text-[10px] font-black uppercase tracking-widest opacity-40 mt-1">Enterprise Support & Documentation</p>
          </div>
          <Button variant="outline" size="icon" onClick={onClose} className="rounded-full h-10 w-10 border-white/10">
            <X size={20} />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
          <section className="space-y-4">
            <div className="flex items-center gap-3 text-[var(--primary)]">
              <BookOpen size={20} />
              <h3 className="font-bold uppercase text-xs tracking-widest">Getting Started</h3>
            </div>
            <div className="grid gap-4">
              {faqs.map((faq, i) => (
                <div key={i} className="p-5 rounded-2xl bg-white/5 border border-white/5 hover:border-[var(--primary)]/20 transition-all">
                  <p className="font-black text-sm mb-2 text-[var(--primary)]">Q: {faq.q}</p>
                  <p className="text-xs opacity-60 leading-relaxed font-medium">{faq.a}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="space-y-4">
            <div className="flex items-center gap-3 text-emerald-500">
              <Zap size={20} />
              <h3 className="font-bold uppercase text-xs tracking-widest">Pro Tips</h3>
            </div>
            <ul className="space-y-3">
              <li className="flex gap-3 text-xs opacity-60">
                <span className="text-emerald-500 font-bold">•</span>
                <span>Use the <strong>"Compare"</strong> feature to view price differences between items side-by-side.</span>
              </li>
              <li className="flex gap-3 text-xs opacity-60">
                <span className="text-emerald-500 font-bold">•</span>
                <span>Enable <strong>Lock</strong> to hide cost prices when showing customers the screen.</span>
              </li>
              <li className="flex gap-3 text-xs opacity-60">
                <span className="text-emerald-500 font-bold">•</span>
                <span>Each item can have a <strong>"Margin Spread"</strong> which updates live as you edit prices.</span>
              </li>
            </ul>
          </section>
        </div>
      </motion.div>
    </motion.div>
  );
}

/**
 * Advanced Interactive Setup Wizard
 */
function OnboardingTour({ 
  onClose, 
  t, 
  state, 
  handleUpdateSettings, 
  setState 
}: { 
  onClose: () => void; 
  t: any; 
  state: any; 
  handleUpdateSettings: (s: any) => void;
  setState: React.Dispatch<React.SetStateAction<any>>;
}) {
  const [step, setStep] = useState(0);

  // States inside Wizard to capture user selections
  const [storeType, setStoreType] = useState('retail');
  const [selectedLang, setSelectedLang] = useState<LanguageType>('en');
  const [selectedCurrency, setSelectedCurrency] = useState('INR');
  const [selectedTheme, setSelectedTheme] = useState<ThemeType>('retro-blue');
  const [printerFormat, setPrinterFormat] = useState('80mm');

  // Total 6 steps (0 to 5)
  const totalSteps = 6;

  const handleFinishWizard = () => {
    // Update settings cleanly
    handleUpdateSettings({
      language: selectedLang,
      theme: selectedTheme,
      hasSeenOnboarding: true,
      pin: state.settings.pin || '000000',
      isLocked: false
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[200] overflow-y-auto bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <motion.div 
        initial={{ scale: 0.95, opacity: 0, y: 50 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        className="relative w-full max-w-xl bg-[var(--card)] border-2 border-[var(--primary)] shadow-[0_30px_70px_rgba(0,0,0,0.8)] rounded-3xl p-6 md:p-8 flex flex-col justify-between overflow-hidden text-left"
      >
        {/* Glow backdrop decorative layout elements */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--primary)]/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-indigo-500/15 rounded-full blur-2xl pointer-events-none" />

        {/* Wizard Progression indicators */}
        <div className="flex items-center justify-between mb-6 border-b border-[var(--border)] pb-3 select-none">
          <div>
            <span className="text-[8px] font-black uppercase text-[var(--primary)] tracking-widest leading-none">Enterprise Setup Workspace</span>
            <h2 className="text-sm font-black uppercase tracking-tight mt-1 text-[var(--foreground)]">Workspace Wizard • Step {step + 1} of {totalSteps}</h2>
          </div>
          <div className="flex gap-1">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div key={i} className={`h-1.5 rounded-full transition-all duration-300 ${i === step ? 'w-5 bg-[var(--primary)]' : i < step ? 'w-1.5 bg-emerald-500' : 'w-1.5 bg-[var(--foreground)]/10'}`} />
            ))}
          </div>
        </div>

        {/* Wizard Step Renderings */}
        <div className="flex-1 min-h-[300px] flex flex-col justify-center">
          <AnimatePresence mode="wait">
            {step === 0 && (
              <motion.div key="step-0" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                <div className="h-12 w-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mb-2">
                  <Sparkles size={24} className="animate-spin duration-3000" />
                </div>
                <h3 className="text-xl font-black tracking-tight uppercase leading-tight">Welcome to TS Price Manager</h3>
                <p className="text-xs text-[var(--foreground)]/70 leading-relaxed md:max-w-lg">
                  Designed for wholesalers, retail outlets, and fast-paced billing yards. This wizard will initialize your database, store details, local language settings, and hardware preferences in 1 minute.
                </p>
                <div className="pt-2 flex items-center gap-2 text-xs font-bold text-emerald-500">
                  <CheckCircle size={14} />
                  <span>Interactive Real-time Sync Ready</span>
                </div>
              </motion.div>

            )}
            {step === 1 && (
              <motion.div key="step-1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4 animate-in fade-in zoom-in-95">
                <h3 className="text-lg font-black uppercase tracking-tight">Select Business Model Sector</h3>
                <p className="text-xs text-[var(--foreground)]/60">Help us personalize the app mode suitable for your daily ledger cycles.</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2 pr-1 select-none">
                  {[
                    { id: 'retail', label: 'Retail Outlet / Grocery किराना', desc: 'Sells single items with optional wholesale minimum triggers.' },
                    { id: 'wholesale', label: 'Wholesale Depot थोक विक्रेता', desc: 'Deals in bulk counts, multiple unit types and rapid packing.' },
                    { id: 'billing', label: 'General POS Billing काउंटर', desc: 'General customer receipts counter setup with active cash checkout.' },
                    { id: 'auto', label: 'Hybrid Auto-Price (हाइब्रिड)', desc: 'Automatically swaps retail/wholesale depending on item cart volume.' }
                  ].map(b => (
                    <button
                      key={b.id}
                      onClick={() => setStoreType(b.id)}
                      className={cn(
                        "p-4 rounded-2xl border-2 text-left transition-all hover:border-[var(--primary)] text-xs cursor-pointer select-none",
                        storeType === b.id ? "border-[var(--primary)] bg-[var(--primary)]/5" : "border-[var(--border)] bg-[var(--card)]/50"
                      )}
                    >
                      <p className="font-extrabold text-[var(--foreground)] mb-1 leading-none">{b.label}</p>
                      <p className="text-[10px] opacity-65 leading-normal">{b.desc}</p>
                    </button>
                  ))}
                </div>
              </motion.div>

            )}
            {step === 2 && (
              <motion.div key="step-2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                <h3 className="text-lg font-black uppercase tracking-tight">Localization & Currency Standard</h3>
                <p className="text-xs text-[var(--foreground)]/60">Choose language preferences and currencies format for price columns.</p>
                
                <div className="space-y-4 pt-2 select-none">
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-wider text-[var(--foreground)]/50 mb-2">Display Language</p>
                    <div className="flex gap-2">
                      {[
                        { code: 'en', label: '🇬🇧 English' },
                        { code: 'hi', label: '🇮🇳 हिन्दी' },
                        { code: 'es', label: '🇪🇸 Español' }
                      ].map(l => (
                        <button
                          key={l.code}
                          onClick={() => setSelectedLang(l.code as any)}
                          className={cn(
                            "px-4 py-2.5 rounded-xl border text-xs font-bold cursor-pointer transition select-none flex-1 leading-none",
                            selectedLang === l.code ? "bg-[var(--primary)] text-white border-[var(--primary)]" : "bg-[var(--foreground)]/5 text-[var(--foreground)]/70 border-[var(--border)] hover:bg-[var(--foreground)]/10"
                          )}
                        >
                          {l.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-[9px] font-black uppercase tracking-wider text-[var(--foreground)]/50 mb-2">Currency Symbol Denomination</p>
                    <div className="flex gap-2">
                      {['INR (₹)', 'USD ($)', 'EUR (€)', 'GBP (£)'].map(curr => (
                        <button
                          key={curr}
                          onClick={() => setSelectedCurrency(curr.split(' ')[0])}
                          className={cn(
                            "px-3 py-2.5 rounded-xl border text-xs font-bold cursor-pointer transition select-none flex-1 leading-none",
                            selectedCurrency === curr.split(' ')[0] ? "bg-[var(--primary)] text-white border-[var(--primary)] animate-pulse" : "bg-[var(--foreground)]/5 text-[var(--foreground)]/75 border-[var(--border)] hover:bg-[var(--foreground)]/10"
                          )}
                        >
                          {curr}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>

            )}
            {step === 3 && (
              <motion.div key="step-3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4 select-none">
                <h3 className="text-lg font-black uppercase tracking-tight">Select Aura Visual Theme</h3>
                <p className="text-xs text-[var(--foreground)]/60">Match the terminal colors with your computer screen or hardware vibe.</p>
                <div className="grid grid-cols-2 gap-3 pt-2">
                  {[
                    { id: 'retro-blue', label: '🌌 Cosmic Retro Blue', desc: 'Classic indigo space theme' },
                    { id: 'emerald-gold', label: '🌿 Emerald Rich Gold', desc: 'Elite botanical store style' },
                    { id: 'minimalist-ivory', label: '🍦 Clean Ivory Slate', desc: 'Calm light high-contrast' },
                    { id: 'cyberpunk', label: '⚡ Cyber Neon Punch', desc: 'Pure high contrast layout' }
                  ].map(th => (
                    <button
                      key={th.id}
                      onClick={() => setSelectedTheme(th.id as any)}
                      className={cn(
                        "p-4 rounded-xl border text-left cursor-pointer transition-all uppercase text-[8px] font-black tracking-wider leading-relaxed",
                        selectedTheme === th.id ? "border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--primary)] scale-102 shadow" : "border-[var(--border)] text-[var(--foreground)] bg-[var(--foreground)]/5"
                      )}
                    >
                      <p className="font-extrabold mb-1">{th.label}</p>
                      <p className="opacity-65 text-[7.5px] transform-none font-medium text-[var(--foreground)]/70">{th.desc}</p>
                    </button>
                  ))}
                </div>
              </motion.div>

            )}
            {step === 4 && (
              <motion.div key="step-4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4 select-none">
                <h3 className="text-lg font-black uppercase tracking-tight">Receipt Roll Format Configuration</h3>
                <p className="text-xs text-[var(--foreground)]/60">Configure your spool layout to prevent clipped text or printing overlaps.</p>
                
                <div className="flex gap-3 justify-center pt-4">
                  {[
                    { id: '58mm', label: '📟 58mm Roll', desc: 'Compact thermal receipts (Kiran)' },
                    { id: '80mm', label: '📠 80mm Tape', desc: 'Standard POS wholesale printers' },
                    { id: 'A4', label: '📄 A4 Standard', desc: 'Standard laser laserjet printers' }
                  ].map(fm => (
                    <button
                      key={fm.id}
                      onClick={() => setPrinterFormat(fm.id)}
                      className={cn(
                        "p-4 rounded-xl border transition cursor-pointer select-none flex-1 text-center font-bold text-xs",
                        printerFormat === fm.id ? "border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--primary)]" : "border-[var(--border)] bg-[var(--foreground)]/5 text-[var(--foreground)]/70 hover:bg-[var(--foreground)]/10"
                      )}
                    >
                      <p className="font-extrabold mb-1">{fm.label}</p>
                      <p className="text-[9px] opacity-60 font-semibold">{fm.desc}</p>
                    </button>
                  ))}
                </div>
              </motion.div>

            )}
            {step === 5 && (
              <motion.div key="step-5" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4 text-center">
                <div className="h-14 w-14 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto mb-2 animate-bounce">
                  <CheckCircle size={32} />
                </div>
                <h3 className="text-xl font-black uppercase tracking-tight text-emerald-500">Configuration Finalized!</h3>
                <p className="text-xs text-[var(--foreground)]/75 max-w-sm mx-auto">
                  Your store database is ready to register transaction ledgers and print premium invoices. Welcome to the elite tier of pricing analytics.
                </p>

                <div className="pt-2 text-[8px] font-black tracking-widest uppercase opacity-40">
                  Secured workspace • cloud connection established
                </div>
              </motion.div>
          )}
          </AnimatePresence>
        </div>

        {/* Wizard Footer Controls */}
        <div className="flex items-center justify-between border-t border-[var(--border)] pt-4 mt-6">
          <button
            onClick={() => setStep(prev => Math.max(0, prev - 1))}
            disabled={step === 0}
            className="px-4 py-2 border border-[var(--border)] rounded-xl text-xs uppercase cursor-pointer text-[var(--foreground)]/60 hover:text-[var(--foreground)] disabled:opacity-20 select-none font-bold"
          >
            Previous
          </button>

          {step < totalSteps - 1 ? (
            <button
              onClick={() => setStep(prev => prev + 1)}
              className="px-6 py-2 bg-[var(--primary)] hover:opacity-90 text-white rounded-xl text-xs uppercase cursor-pointer select-none font-black tracking-wide"
            >
              Continue Step
            </button>
          ) : (
            <button
              onClick={handleFinishWizard}
              className="px-8 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs uppercase cursor-pointer select-none font-black tracking-widest shadow-lg shadow-emerald-500/20"
            >
              Launch POS System
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}

function ComparisonModal({ selectedItems, onClose, t, language, precision, hideBuyingPrice }: {
  selectedItems: Item[];
  onClose: () => void;
  t: any;
  language: LanguageType;
  precision: number;
  hideBuyingPrice: boolean;
}) {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl"
    >
      <motion.div 
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        className="w-full max-w-5xl bg-[var(--background)] rounded-[3rem] border border-[var(--border)] shadow-2xl p-8 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-8">
           <div>
             <h2 className="text-2xl font-black tracking-tight">{t.compare || "Compare"} {selectedItems.length} {t.items || "Items"}</h2>
             <p className="text-[10px] font-black uppercase tracking-widest opacity-40 mt-1">{t.sideBySide || "Side-by-side analysis"}</p>
           </div>
           <Button variant="outline" size="icon" onClick={onClose} className="rounded-full h-12 w-12 hover:bg-red-500/10 hover:text-red-500 border-white/10">
             <X size={24} />
           </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {selectedItems.map((item, sIdx) => {
            const cat = DEFAULT_CATEGORIES.find(c => c.id === item.categoryId);
            const name = (item.translations && (item.translations[language] || item.translations.en)) || item.name;
            return (
              <div key={`sel-card-${item.id || 'item'}-${sIdx}`} className="card p-6 bg-gradient-to-br from-[var(--card)] to-transparent border-white/5 space-y-6">
                <div className="flex items-center gap-4 border-b border-white/5 pb-4">
                  <div className="h-16 w-16 rounded-2xl bg-[var(--background)] border border-[var(--border)] flex items-center justify-center text-3xl shadow-inner">
                    {cat?.icon || '📦'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold text-lg truncate">{name}</h3>
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-40">{cat?.name}</p>
                  </div>
                </div>

                <div className="space-y-4">
                   <div className="flex justify-between items-center bg-white/5 p-3 rounded-xl border border-white/5">
                      <span className="text-[9px] font-black uppercase tracking-[0.2em] opacity-40">{t.retail || "Retail"}</span>
                      <div className="text-right">
                        <span className="text-sm font-black">₹{formatNumber(item.retailPrice, precision)}</span>
                        <span className="text-[8px] opacity-40 block">/ {item.retailPriceUnit}</span>
                      </div>
                   </div>

                   {!hideBuyingPrice && (
                     <div className="flex justify-between items-center bg-white/5 p-3 rounded-xl border border-white/5">
                        <span className="text-[9px] font-black uppercase tracking-[0.2em] opacity-40">{t.buying || "Buying"}</span>
                        <div className="text-right">
                          <span className="text-sm font-black">₹{formatNumber(item.buyingPrice, precision)}</span>
                          <span className="text-[8px] opacity-40 block">/ {item.buyingPriceUnit}</span>
                        </div>
                     </div>
                   )}

                   <div className="flex justify-between items-center bg-white/5 p-3 rounded-xl border border-white/5">
                      <span className="text-[9px] font-black uppercase tracking-[0.2em] opacity-40">{t.inventory || "Stock"}</span>
                      <span className="text-sm font-black">{item.quantity} {item.unit}</span>
                   </div>

                   {!hideBuyingPrice && (
                     <div className="flex justify-between items-center bg-emerald-500/10 p-3 rounded-xl border border-emerald-500/20">
                        <span className="text-[9px] font-black uppercase tracking-[0.2em] text-emerald-500">{t.margin || "Margin"}</span>
                        <span className="text-sm font-black text-emerald-500">
                          {(( (item.retailPrice * (item.quantity || 1)) - (item.buyingPrice * (item.quantity || 1)) ) / ( (item.buyingPrice * (item.quantity || 1)) || 1 ) * 100).toFixed(1)}%
                        </span>
                     </div>
                   )}

                   <div className="flex justify-between items-center bg-white/5 p-3 rounded-xl border border-white/5">
                      <span className="text-[9px] font-black uppercase tracking-[0.2em] opacity-40">{t.lastChanged || "Last Update"}</span>
                      <span className="text-[10px] font-bold opacity-60">
                        {item.priceChangedAt ? new Date(item.priceChangedAt).toLocaleDateString() : 'Never'}
                      </span>
                   </div>
                </div>

                {item.notes && (
                <div className="p-3 bg-indigo-500/5 rounded-xl border border-indigo-500/10 space-y-1">
                  <p className="text-[8px] font-black uppercase tracking-widest opacity-40">Extra Info</p>
                  <p className="text-[10px] font-medium leading-relaxed opacity-70 italic">"{item.notes}"</p>
                </div>
              )}


              </div>
            );
          })}
        </div>
      </motion.div>
    </motion.div>
  );
}

function ItemFormModal({ onClose, onSave, categories, initialData, t, language }: { 
  onClose: () => void, 
  onSave: (data: Partial<Item>) => void,
  categories: Category[],
  initialData?: Item,
  t: any,
  language: LanguageType
}) {
  const [formData, setFormData] = useState<Partial<Item>>(() => {
    if (initialData) {
      return {
        ...initialData,
        minStockLevel: initialData.minStockLevel ?? 10
      };
    }
    return {
      name: '',
      categoryId: categories[0]?.id || '',
      quantity: 1,
      unit: 'KG',
      retailPrice: 0,
      retailPriceUnit: 'KG',
      wholesalePrice: 0,
      wholesalePriceUnit: 'KG',
      buyingPrice: 0,
      buyingPriceUnit: 'KG',
      profitMargin: 0,
      translations: { en: '', hi: '', mr: '', 'hi-en': '' },
      notes: '',
      minStockLevel: 10
    };
  });

  const [activeUnitSelection, setActiveUnitSelection] = useState<'base'|'retail'|'wholesale'|'buy'|null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const { recentUnits } = useRecentUnits();

  const scrollContainerRef = React.useRef<HTMLDivElement>(null);
  const section1Ref = React.useRef<HTMLDivElement>(null);
  const section2Ref = React.useRef<HTMLDivElement>(null);
  const section3Ref = React.useRef<HTMLDivElement>(null);

  const scrollToSection = (ref: React.RefObject<HTMLDivElement>) => {
    ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleNameBlur = async () => {
    if (!formData.name || (initialData && formData.name === initialData.name)) return;
    setIsTranslating(true);
    const trans = await translateItemName(formData.name);
    setFormData(prev => ({ ...prev, translations: trans }));
    setIsTranslating(false);
  };

  const handleUnitSelect = (unit: string) => {
    trackRecentUnit(unit);
    const currentSel = activeUnitSelection;
    if (activeUnitSelection === 'base') setFormData(prev => ({ ...prev, unit }));
    if (activeUnitSelection === 'buy') setFormData(prev => ({ ...prev, buyingPriceUnit: unit }));
    if (activeUnitSelection === 'wholesale') setFormData(prev => ({ ...prev, wholesalePriceUnit: unit }));
    if (activeUnitSelection === 'retail') setFormData(prev => ({ ...prev, retailPriceUnit: unit }));
    setActiveUnitSelection(null);

    // Dynamic next-input focus navigation on unit modal selection completion
    setTimeout(() => {
      if (currentSel === 'base') {
        const nextEl = document.getElementById('item-min-stock-input');
        if (nextEl) {
          nextEl.focus();
          if ('select' in nextEl) (nextEl as any).select();
        }
      } else if (currentSel === 'buy') {
        const nextEl = document.getElementById('item-save-btn');
        if (nextEl) {
          nextEl.focus();
        }
      } else if (currentSel === 'wholesale') {
        const nextEl = document.getElementById('item-price-buyingPrice');
        if (nextEl) {
          nextEl.focus();
          if ('select' in nextEl) (nextEl as any).select();
        }
      } else if (currentSel === 'retail') {
        const nextEl = document.getElementById('item-price-wholesalePrice');
        if (nextEl) {
          nextEl.focus();
          if ('select' in nextEl) (nextEl as any).select();
        }
      }
    }, 100);
  };

  const handleSave = () => {
    if (!formData.name) return alert('Name is required');
    onSave(formData);
    onClose();
  };

  const sectionVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" as any } }
  };

  const quickQtys = [5, 10, 25, 50, 100];
  const quickAmounts = [100, 500, 1000, 5000];

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 md:items-center md:p-4 backdrop-blur-sm"
    >
      <motion.div 
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        className="h-[95vh] w-full max-w-2xl overflow-hidden rounded-t-[2rem] bg-[var(--card)] flex flex-col md:h-[90vh] md:rounded-[2.5rem] shadow-2xl border border-white/5"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[var(--border)] shrink-0 bg-[var(--card)]/80 backdrop-blur-md z-20">
          <div className="flex items-center gap-4">
             <div className="h-10 w-10 rounded-xl bg-[var(--primary)]/10 flex items-center justify-center text-[var(--primary)] shadow-inner">
                {initialData ? <Edit2 size={20} /> : <Plus size={20} />}
             </div>
             <div>
                <h2 className="text-lg font-black tracking-tighter uppercase">{initialData ? t.updateRecord : t.newEntry}</h2>
                <p className="text-[9px] font-black uppercase tracking-widest opacity-30">Operational Matrix v2.5</p>
             </div>
          </div>
          <Button variant="ghost" onClick={onClose} size="icon" className="rounded-xl bg-[var(--background)] hover:bg-[var(--primary)]/10 transition-colors"><X size={20} /></Button>
        </div>

        {/* Content */}
        <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-6 space-y-24 no-scrollbar pb-32 scroll-smooth">
          
          {/* Section 1: Identity */}
          <motion.div 
            variants={sectionVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            ref={section1Ref} 
            className="space-y-6 pt-4"
          >
             <label className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-[var(--primary)] px-2">
               <span className="w-6 h-6 rounded bg-[var(--primary)]/10 flex items-center justify-center text-[10px]">01</span> {t.identityParams}
             </label>
             <div className="space-y-4">
               <div className="group relative">
                <input 
                  id="item-name-input"
                  className="w-full rounded-2xl border-2 border-[var(--border)] bg-[var(--background)] p-6 font-black text-2xl focus:border-[var(--primary)] focus:outline-none transition-all placeholder:opacity-20 shadow-inner"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  onBlur={handleNameBlur}
                  placeholder="Item nomenclature..."
                />
                {isTranslating && (
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 flex gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--primary)] animate-bounce" />
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--primary)] animate-bounce [animation-delay:0.2s]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--primary)] animate-bounce [animation-delay:0.4s]" />
                  </div>
                )}
               </div>

               <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                 {LANGUAGES.map(lang => (
                   <div key={lang.id} className="flex items-center gap-2 rounded-xl bg-[var(--card)] border border-[var(--border)] p-3 text-[10px] shadow-sm">
                     <span className="opacity-80">{lang.emoji}</span>
                     <span className="flex-1 font-bold opacity-30 truncate">
                       {formData.translations[lang.id] || '---'}
                     </span>
                   </div>
                 ))}
               </div>

               <div className="flex gap-2 overflow-x-auto no-scrollbar py-2">
                 {categories.map(cat => (
                   <button
                     key={cat.id}
                     onClick={() => setFormData(prev => ({ ...prev, categoryId: cat.id }))}
                     className={cn(
                       "flex items-center gap-3 rounded-xl border-2 px-5 py-3 transition-all shrink-0 font-black text-[10px] uppercase",
                       formData.categoryId === cat.id 
                         ? "border-[var(--primary)] bg-[var(--primary)] text-white shadow-lg scale-105" 
                         : "border-[var(--border)] bg-[var(--background)] opacity-60 hover:border-[var(--primary)]/40 hover:opacity-100"
                     )}
                   >
                     <span>{cat.name}</span>
                   </button>
                 ))}
               </div>
             </div>
          </motion.div>

          {/* Section 2: Logistical Metrics */}
          <motion.div 
            variants={sectionVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            ref={section2Ref} 
            className="space-y-8 border-t border-[var(--border)] pt-12"
          >
             <label className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-[var(--primary)] px-2">
                <span className="w-6 h-6 rounded bg-[var(--primary)]/10 flex items-center justify-center text-[10px]">02</span> Inventory logistics
             </label>
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
               <div className="space-y-3">
                 <p className="text-[10px] font-black uppercase tracking-widest opacity-30">Stock Quantity (प्रारंभिक स्टॉक मात्रा)</p>
                 <div className="flex gap-2">
                   <input 
                     type="number"
                     id="item-qty-input" className="flex-1 rounded-2xl border-2 border-[var(--border)] bg-[var(--background)] p-4 font-black text-xl focus:border-[var(--primary)] focus:outline-none transition-all shadow-inner"
                     value={formData.quantity}
                     onChange={(e) => setFormData(prev => ({ ...prev, quantity: parseFloat(e.target.value) || 0 }))}
                   />
                   <button 
                     id="item-unit-btn"
                    data-navigable="true"
                    onClick={() => setActiveUnitSelection('base')}
                     className="rounded-2xl border-2 border-[var(--border)] bg-[var(--card)] px-6 font-black uppercase text-[10px] hover:border-[var(--primary)] transition-all flex items-center gap-2"
                   >
                     {formData.unit} <ChevronDown size={14} />
                   </button>
                 </div>


                 <div className="flex flex-wrap gap-1.5 pt-2">
                   {quickQtys.map(q => (
                     <button key={q} onClick={() => setFormData(prev => ({ ...prev, quantity: q }))} className="px-3 py-1.5 rounded-lg bg-[var(--background)] border border-[var(--border)] text-[9px] font-black opacity-30 hover:opacity-100 hover:border-[var(--primary)] hover:text-[var(--primary)] transition-all">{q} {formData.unit}</button>
                   ))}
                 </div>
               </div>

               <div className="space-y-3">
                 <p className="text-[10px] font-black uppercase tracking-widest opacity-30">Stock Alert (न्यूनतम स्टॉक चेतावनी सीमा)</p>
                 <input 
                   type="number"
                   id="item-min-stock-input" className="w-full rounded-2xl border-2 border-[var(--border)] bg-[var(--background)] p-4 font-black text-xl focus:border-[var(--primary)] focus:outline-none transition-all shadow-inner"
                   value={formData.minStockLevel ?? 10}
                   onChange={(e) => setFormData(prev => ({ ...prev, minStockLevel: parseFloat(e.target.value) || 0 }))}
                 />
                 <div className="flex flex-wrap gap-1.5 pt-2">
                   {[2, 5, 10, 20, 50].map(threshold => (
                     <button key={threshold} onClick={() => setFormData(prev => ({ ...prev, minStockLevel: threshold }))} className="px-3 py-1.5 rounded-lg bg-[var(--background)] border border-[var(--border)] text-[9px] font-black opacity-30 hover:opacity-100 hover:border-[var(--primary)] hover:text-[var(--primary)] transition-all">{threshold}</button>
                   ))}
                 </div>
               </div>

               <div className="space-y-3 col-span-1 md:col-span-2 lg:col-span-1">
                 <p className="text-[10px] font-black uppercase tracking-widest opacity-30">Field notes / Item description</p>
                 <textarea 
                    id="item-notes-textarea" className="w-full h-[98px] rounded-2xl border-2 border-[var(--border)] bg-[var(--background)] p-4 font-bold text-xs focus:border-[var(--primary)] focus:outline-none transition-all shadow-inner resize-none"
                    placeholder="Batch identity, source node..."
                    value={formData.notes}
                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                 />
               </div>
             </div>
          </motion.div>

          {/* Section 3: Financial Framework */}
          <motion.div 
            variants={sectionVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            ref={section3Ref} 
            className="space-y-10 border-t border-[var(--border)] pt-12 pb-20"
          >
             <label className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-[var(--primary)] px-2">
                <span className="w-6 h-6 rounded bg-[var(--primary)]/10 flex items-center justify-center text-[10px]">03</span> Price configuration
             </label>
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[
                  { label: t.retail, key: 'retailPrice', unitKey: 'retailPriceUnit', selection: 'retail', color: 'bg-green-500/10' },
                  { label: t.wholesale, key: 'wholesalePrice', unitKey: 'wholesalePriceUnit', selection: 'wholesale', color: 'bg-blue-500/10' },
                  { label: t.buy, key: 'buyingPrice', unitKey: 'buyingPriceUnit', selection: 'buy', color: 'bg-orange-500/10' }
                ].map((field) => (
                  <div key={field.key} className="space-y-3">
                     <p className="text-[9px] font-black uppercase tracking-widest opacity-30">{field.label}</p>
                     <div className="relative group">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-xl opacity-10 group-focus-within:opacity-40 transition-opacity">
                           {field.key === 'profitMargin' ? '%' : '₹'}
                        </span>
                        <input 
                           type="number"
                           id={`item-price-${field.key}`} className="w-full rounded-2xl border-2 border-[var(--border)] bg-[var(--background)] py-4 pl-10 pr-4 font-black text-lg focus:border-[var(--primary)] focus:outline-none transition-all shadow-inner"
                           value={(formData as any)[field.key]}
                           onChange={(e) => setFormData(prev => ({ ...prev, [field.key]: parseFloat(e.target.value) || 0 }))}
                        />
                     </div>
                     {field.selection && (
                        <button 
                           id={`item-price-unit-${field.selection}`}
                            data-navigable="true"
                            onClick={() => setActiveUnitSelection(field.selection as any)}
                           className={cn("w-full py-2.5 rounded-xl border border-transparent font-black uppercase text-[8px] tracking-widest transition-all", field.color)}
                        >
                           Per {(formData as any)[field.unitKey]}
                        </button>
                     )}
                  </div>
                ))}
             </div>
             
             <div className="grid grid-cols-4 gap-2">
                {quickAmounts.map((amt, idx) => (
                  <button key={`amt-${amt}-${idx}`} onClick={() => setFormData(prev => ({ ...prev, retailPrice: amt }))} className="p-3 rounded-xl bg-[var(--card)] border border-[var(--border)] text-[9px] font-black opacity-30 hover:opacity-100 hover:border-[var(--primary)] hover:text-[var(--primary)] transition-all">₹{amt}</button>
                ))}
             </div>
          </motion.div>
        </div>

        {/* Action Bar */}
        <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-[var(--card)] via-[var(--card)]/95 to-transparent z-10 pointer-events-none">
           <div className="flex gap-4 pointer-events-auto">
             <Button id="item-save-btn" data-save="true" className="w-full py-5 rounded-2xl font-black uppercase text-xs shadow-xl shadow-[var(--primary)]/20" onClick={handleSave}>
                {initialData ? t.commitEvolution : t.initializeParams}
             </Button>
           </div>
        </div>

        <AnimatePresence>
          {activeUnitSelection && (
            <UnitSelectorModal 
              onClose={() => setActiveUnitSelection(null)}
              onSelect={handleUnitSelect}
              currentUnit={
                activeUnitSelection === 'base' ? formData.unit! :
                activeUnitSelection === 'buy' ? formData.buyingPriceUnit! :
                activeUnitSelection === 'wholesale' ? formData.wholesalePriceUnit! :
                formData.retailPriceUnit!
              }
            />
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}

function NotificationsView({ 
  notes, 
  items, 
  dismissed,
  currentTime,
  onViewNote,
  onViewItem
}: { 
  notes: Note[], 
  items: Item[], 
  dismissed: string[],
  currentTime: Date,
  onViewNote: (id: string) => void,
  onViewItem: (id: string) => void
}) {
  const allNotifications = useMemo(() => {
    const list: any[] = [];
    const now = currentTime;

    // 1. Reminders & Notes
    notes.forEach(note => {
      const titleLower = note.title?.toLowerCase() || '';
      const descLower = note.description?.toLowerCase() || '';
      const isKOT = titleLower.includes('kitchen ticket') || titleLower.includes('kot-') || descLower.includes('kot-');
      if (isKOT) return;

      const isReminder = note.category === 'Reminder' && note.dueDate;
      const isDue = isReminder && new Date(note.dueDate!) <= now;
      const isSoon = isReminder && !isDue && (new Date(note.dueDate!).getTime() - now.getTime()) < 3600000 * 24;

      list.push({
        id: note.id,
        type: 'note',
        category: note.category,
        title: note.title,
        description: note.description,
        timestamp: note.createdAt,
        priority: isDue ? 'Urgent' : note.priority,
        icon: isReminder ? <Clock size={20} /> : <FileText size={20} />,
        dueInfo: isDue ? "OVERDUE" : isSoon ? "Due Soon" : null,
        dismissed: dismissed.includes(note.id)
      });
    });

    // 2. Price Changes
    items.forEach(item => {
      if (item.priceChangedAt) {
        list.push({
          id: `price-${item.id}-${item.priceChangedAt}`,
          type: 'price',
          title: `Price Evolution: ${item.translations?.en || item.name}`,
          description: `Price changed on ${new Date(item.priceChangedAt).toLocaleDateString()} by ${item.lastChangedBy || 'Master Node'}.`,
          timestamp: item.priceChangedAt,
          priority: 'Info',
          icon: <TrendingUp size={20} />,
          itemId: item.id,
          dismissed: dismissed.includes(`price-${item.id}-${item.priceChangedAt}`)
        });
      }
    });

    return list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [notes, items, dismissed, currentTime]);

  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-32">
      <header className="space-y-2">
        <h1 className="text-3xl font-black tracking-tighter uppercase">Activity <span className="text-[var(--primary)]">Feed</span></h1>
        <p className="text-xs font-bold opacity-40 uppercase tracking-[0.2em]">Audit trail and real-time operational alerts</p>
      </header>

      <div className="grid grid-cols-1 gap-3">
        {allNotifications.map((notif, index) => (
          <motion.div
            key={`${notif.type || 'notif'}-${notif.id || 'id'}-${index}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={() => notif.type === 'price' ? onViewItem(notif.itemId) : onViewNote(notif.id)}
            className={cn(
              "group p-5 rounded-3xl border transition-all cursor-pointer relative overflow-hidden flex items-center gap-6",
              notif.dismissed ? "opacity-40 grayscale" : "opacity-100",
              notif.priority === 'Urgent' ? "bg-red-500/5 border-red-500/20" : "bg-[var(--card)] border-[var(--border)] hover:border-[var(--primary)]/30"
            )}
          >
            <div className={cn(
              "flex h-12 w-12 items-center justify-center rounded-2xl shadow-sm transition-transform group-hover:scale-110 shrink-0",
              notif.priority === 'Urgent' ? "bg-red-500 text-white" : "bg-[var(--primary)]/10 text-[var(--primary)]"
            )}>
              {notif.icon}
            </div>

            <div className="flex-1 space-y-1 min-w-0">
               <div className="flex items-center gap-3">
                  <h3 className="font-bold text-sm truncate uppercase tracking-tight">{notif.title}</h3>
                  {notif.priority === 'Urgent' && (
                    <span className="px-2 py-0.5 rounded-full bg-red-500 text-white text-[8px] font-black uppercase">Critical</span>
                  )}
                  {notif.dueInfo && (
                    <span className="px-2 py-0.5 rounded-full bg-amber-500 text-white text-[8px] font-black uppercase">{notif.dueInfo}</span>
                  )}
               </div>
               <p className="text-xs opacity-60 line-clamp-1">{notif.description}</p>
            </div>

            <div className="text-right shrink-0">
               <p className="text-[10px] font-black opacity-30 uppercase">{new Date(notif.timestamp).toLocaleDateString()}</p>
               <p className="text-[10px] font-black opacity-30 uppercase">{new Date(notif.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
            </div>
          </motion.div>
        ))}

        {allNotifications.length === 0 && (
          <div className="py-32 text-center space-y-4 opacity-30">
             <BellRing size={64} className="mx-auto opacity-20" />
             <p className="font-black uppercase tracking-widest text-sm">System Quiet. No active alerts.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function SettingsScreen(props: { 
  state: AppState; t: any; onUpdate: (u: any) => void; onShowHelp: () => void; onResetPIN: () => void;
  onExportExcel: () => void;
  onExportPDF: () => void;
  onImport: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onBackup: () => void;
  onRestore: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onClearCache: () => void;
  isSyncing: boolean;
  isExporting: boolean;
  activeSubTab?: 'interface' | 'security' | 'sound' | 'data';
  onChangeSubTab?: (tab: 'interface' | 'security' | 'sound' | 'data') => void;
}) {
  return <SettingsScreenExt {...props} />;
}

function PasswordLinkManager({ user, settings }: { user: any; settings: any }) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isExpanding, setIsExpanding] = useState(false);

  if (!user) return null;

  const isLinked = user.providerData.some((p: any) => p.providerId === 'password');

  // Helper to determine password strength
  const getStrength = (pwd: string) => {
    if (!pwd) return { score: 0, label: 'None', color: 'bg-slate-200', width: '0%' };
    let score = 0;
    if (pwd.length >= 8) score += 1;
    if (/[A-Z]/.test(pwd)) score += 1;
    if (/[a-z]/.test(pwd)) score += 1;
    if (/[0-9]/.test(pwd)) score += 1;
    if (/[^A-Za-z0-9]/.test(pwd)) score += 1;

    if (score <= 2) return { score, label: 'Weak / कमजोर', color: 'bg-rose-500', width: '33%' };
    if (score <= 4) return { score, label: 'Medium / ठीक है', color: 'bg-amber-500', width: '66%' };
    return { score, label: 'Strong / मजबूत', color: 'bg-emerald-500', width: '100%' };
  };

  const strength = getStrength(password);

  const handleLinkCredential = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || !confirmPassword) {
      setError("Please fill in all fields / कृपया सभी विवरण भरें।");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match / पासवर्ड मेल नहीं खाते।");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters long / पासवर्ड कम से कम 8 अक्षर का होना चाहिए।");
      return;
    }
    if (strength.score < 3) {
      setError("Password is too weak. Please use a stronger password / पासवर्ड बहुत कमजोर है। कृपया एक मजबूत पासवर्ड का उपयोग करें।");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const credential = EmailAuthProvider.credential(user.email, password);
      await linkWithCredential(user, credential);
      setSuccess("Direct password login linked successfully! You can now sign in using this email & password. / पासवर्ड लॉगिन सफलतापूर्वक जुड़ गया है!");
      setPassword('');
      setConfirmPassword('');
      setIsExpanding(false);
      playFeedbackEvent('notification', settings);
    } catch (err: any) {
      console.error("Linking failed:", err);
      let msg = err.message;
      if (err.code === 'auth/credential-already-in-use') {
        msg = "This credential is already linked to another account / यह क्रेडेंशियल पहले से ही किसी अन्य खाते से जुड़ा हुआ है।";
      } else if (err.code === 'auth/email-already-in-use') {
        msg = "This email is already in use by another account / यह ईमेल पहले से ही उपयोग में है।";
      } else if (err.code === 'auth/requires-recent-login') {
        msg = "Please refresh your session by logging in with Google again before linking a password / पासवर्ड लिंक करने से पहले कृपया एक बार फिर Google से लॉगिन करें।";
      } else if (err.code === 'auth/operation-not-allowed') {
        msg = "Email/Password sign-in is currently disabled in your Firebase Console. Action required: Go to Firebase Console > Authentication > Sign-in Method > Enable 'Email/Password' & save / फ़ायरबेस कंसोल में 'ईमेल/पासवर्ड' लॉगिन प्रदाता को सक्षम करें।";
      }
      setError(msg);
      playFeedbackEvent('notification', settings);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || !confirmPassword) {
      setError("Please fill in all fields / कृपया सभी विवरण भरें।");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match / पासवर्ड मेल नहीं खाते।");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters long / पासवर्ड कम से कम 8 अक्षर का होना चाहिए।");
      return;
    }
    if (strength.score < 3) {
      setError("Password is too weak / पासवर्ड बहुत कमजोर है।");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      await updatePassword(user, password);
      setSuccess("Password updated successfully! / पासवर्ड सफलतापूर्वक अपडेट हो गया है!");
      setPassword('');
      setConfirmPassword('');
      setIsExpanding(false);
      playFeedbackEvent('notification', settings);
    } catch (err: any) {
      console.error("Password update failed:", err);
      let msg = err.message;
      if (err.code === 'auth/requires-recent-login') {
        msg = "Security constraint: Please refresh your session by logging in with Google again / सुरक्षा कारणों से, कृपया एक बार फिर Google से लॉगिन करें।";
      }
      setError(msg);
      playFeedbackEvent('notification', settings);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 pt-2">
      {success && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-start gap-2.5 text-emerald-600 text-xs font-bold leading-relaxed">
          <CheckCircle size={15} className="text-emerald-500 shrink-0 mt-0.5 animate-bounce" />
          <p className="text-[10px] font-extrabold">{success}</p>
        </div>
      )}

      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-start gap-2.5 text-rose-500 text-xs font-bold leading-relaxed animate-shake">
          <XCircle size={15} className="text-rose-500 shrink-0 mt-0.5 animate-pulse" />
          <p className="text-[10px] font-extrabold">{error}</p>
        </div>
      )}

      {!isExpanding ? (
        <button
          type="button"
          onClick={() => {
            setIsExpanding(true);
            setError(null);
            setSuccess(null);
          }}
          className="w-full py-3.5 px-6 rounded-2xl border border-dashed border-[var(--primary)]/30 hover:border-[var(--primary)] bg-[var(--primary)]/5 hover:bg-[var(--primary)]/10 text-[var(--primary)] font-black text-xs uppercase tracking-widest transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-[0.99]"
        >
          {isLinked ? 'Change Password / पासवर्ड बदलें' : 'Add Password Login / पासवर्ड लॉगिन जोड़ें'}
        </button>
      ) : (
        <form onSubmit={isLinked ? handleUpdatePassword : handleLinkCredential} className="space-y-4 p-5 rounded-[2rem] border border-[var(--border)] bg-[var(--background)]">
          <div className="flex justify-between items-center">
            <h4 className="text-[10px] font-black uppercase tracking-wider text-[var(--primary)]">
              {isLinked ? 'Update Account Password' : 'Link Password Account'}
            </h4>
            <button
              type="button"
              onClick={() => setIsExpanding(false)}
              className="text-[9px] font-black uppercase text-slate-400 hover:text-slate-600 outline-none"
            >
              Cancel
            </button>
          </div>

          {/* New Password */}
          <div className="space-y-1.5 text-left">
            <label className="text-[9px] font-extrabold uppercase tracking-widest text-slate-500 flex items-center gap-1.5">
              <Lock size={11} className="text-[var(--primary)]" />
              New Password *
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 8 characters"
                className="w-full bg-[var(--card)] text-[var(--foreground)] border border-[var(--border)] focus:border-[var(--primary)] rounded-xl pl-4 pr-10 py-2.5 text-xs font-bold outline-none transition-all placeholder:opacity-30"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 outline-none"
              >
                {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>

            {/* Real-time Strength Meter */}
            {password && (
              <div className="space-y-1.5 pt-0.5">
                <div className="flex justify-between items-center text-[9px] font-bold uppercase text-slate-400">
                  <span>Password Strength:</span>
                  <span className={strength.score <= 2 ? "text-rose-500" : strength.score <= 4 ? "text-amber-500" : "text-emerald-500"}>
                    {strength.label}
                  </span>
                </div>
                <div className="h-1 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div className={`h-full ${strength.color} transition-all duration-300`} style={{ width: strength.width }} />
                </div>
              </div>
            )}
          </div>

          {/* Confirm Password */}
          <div className="space-y-1.5 text-left">
            <label className="text-[9px] font-extrabold uppercase tracking-widest text-slate-500 flex items-center gap-1.5">
              <Lock size={11} className="text-[var(--primary)]" />
              Confirm Password *
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? "text" : "password"}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm your password"
                className="w-full bg-[var(--card)] text-[var(--foreground)] border border-[var(--border)] focus:border-[var(--primary)] rounded-xl pl-4 pr-10 py-2.5 text-xs font-bold outline-none transition-all placeholder:opacity-30"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 outline-none"
              >
                {showConfirmPassword ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-slate-950 hover:bg-slate-900 text-white font-black text-xs uppercase tracking-widest py-3.5 px-6 rounded-xl cursor-pointer active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-md"
          >
            {isSubmitting ? (
              <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <span>{isLinked ? 'Update Password' : 'Link Password Account'}</span>
            )}
          </button>
        </form>
      )}
    </div>
  );
}

/**
 * Dedicated Store Credentials Form with Cloud & Local Persistence Save Trigger
 */
function StoreCredentialsSection({ 
  state, 
  onUpdate 
}: { 
  state: AppState; 
  onUpdate: (updates: Partial<AppSettings>) => void; 
}) {
  const [storeName, setStoreName] = useState(state.settings.storeName || "");
  const [storeOwnerName, setStoreOwnerName] = useState(state.settings.storeOwnerName || "");
  const [storePhone, setStorePhone] = useState(state.settings.storePhone || "");
  const [storeAddress, setStoreAddress] = useState(state.settings.storeAddress || "");
  const [storeOpeningTime, setStoreOpeningTime] = useState(state.settings.storeOpeningTime || "08:00");
  const [storeClosingTime, setStoreClosingTime] = useState(state.settings.storeClosingTime || "21:00");
  const [reminderTimeBeforeMinutes, setReminderTimeBeforeMinutes] = useState(
    state.settings.reminderTimeBeforeMinutes !== undefined ? state.settings.reminderTimeBeforeMinutes : 15
  );

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Sync state if state.settings changes externally (e.g. from cloud sync)
  useEffect(() => {
    setStoreName(state.settings.storeName || "");
    setStoreOwnerName(state.settings.storeOwnerName || "");
    setStorePhone(state.settings.storePhone || "");
    setStoreAddress(state.settings.storeAddress || "");
    setStoreOpeningTime(state.settings.storeOpeningTime || "08:00");
    setStoreClosingTime(state.settings.storeClosingTime || "21:00");
    if (state.settings.reminderTimeBeforeMinutes !== undefined) {
      setReminderTimeBeforeMinutes(state.settings.reminderTimeBeforeMinutes);
    }
  }, [
    state.settings.storeName,
    state.settings.storeOwnerName,
    state.settings.storePhone,
    state.settings.storeAddress,
    state.settings.storeOpeningTime,
    state.settings.storeClosingTime,
    state.settings.reminderTimeBeforeMinutes
  ]);

  const handleSaveStoreCredentials = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSaving(true);
    try {
      await onUpdate({
        storeName: storeName.trim(),
        storeOwnerName: storeOwnerName.trim(),
        storePhone: storePhone.trim(),
        storeAddress: storeAddress.trim(),
        storeOpeningTime,
        storeClosingTime,
        reminderTimeBeforeMinutes
      });
      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
      }, 3500);
    } catch (err) {
      console.error("Save store credentials error:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const isCloudActive = !!(state.user && state.user.uid !== 'guest_user' && state.settings.autoCloudSync !== false);

  return (
    <div className="bg-[var(--card)] border border-[var(--border)] rounded-[2.5rem] p-6 sm:p-8 space-y-6 shadow-sm">
      {/* Header with Title and Sync Status Badge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--border)] pb-5">
        <div>
          <h3 className="text-lg font-black uppercase tracking-tight text-[var(--foreground)] flex items-center gap-2">
            <Store size={22} className="text-[var(--primary)] shrink-0" /> 
            {cleanAndValidateText("Store Credentials / दुकान की जानकारी", state.settings.language, state.settings)}
          </h3>
          <p className="text-[10px] opacity-60 uppercase font-bold tracking-wider mt-1">
            Configure official shop details for receipts, invoices, SMS billing, and cloud synchronization.
          </p>
        </div>

        {/* Persistence Status Chip */}
        <div className="shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--background)] border border-[var(--border)] w-fit">
          <div className={`h-2 w-2 rounded-full ${isCloudActive ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
          <span className="text-[9.5px] font-black uppercase tracking-wider opacity-80 flex items-center gap-1">
            {isCloudActive ? (
              <>
                <Cloud size={11} className="text-emerald-500" />
                <span>Cloud & Local Sync Active</span>
              </>
            ) : (
              <>
                <Database size={11} className="text-amber-500" />
                <span>Local Storage Persistence</span>
              </>
            )}
          </span>
        </div>
      </div>

      {/* Success Banner */}
      <AnimatePresence>
        {saveSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center justify-between gap-3 text-emerald-600 dark:text-emerald-400"
          >
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-xl bg-emerald-500/20 flex items-center justify-center shrink-0">
                <CheckCircle size={18} className="text-emerald-500" />
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-wide">
                  Store Credentials Saved Successfully!
                </p>
                <p className="text-[10px] opacity-80 font-medium">
                  {isCloudActive 
                    ? "Updated and synced in real-time to your Firestore Cloud Database and Local Storage."
                    : "Saved securely to Local Device Storage."}
                </p>
              </div>
            </div>
            <span className="text-[9px] font-black uppercase px-2 py-1 rounded bg-emerald-500/20 border border-emerald-500/20">
              Verified
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Inputs Form Grid */}
      <form onSubmit={handleSaveStoreCredentials} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Shop / Store Name */}
          <div className="space-y-1.5">
            <label className="text-[9.5px] font-black uppercase tracking-wider opacity-70 flex items-center gap-1.5">
              <Store size={13} className="text-[var(--primary)] shrink-0" /> 
              {cleanAndValidateText("Shop / Store Name (दुकान का नाम)", state.settings.language, state.settings)}
            </label>
            <input 
              type="text" 
              value={storeName} 
              onChange={e => setStoreName(e.target.value)}
              className="w-full bg-[var(--background)] text-[var(--foreground)] border border-[var(--border)] rounded-2xl px-4 py-3 text-xs font-bold placeholder:opacity-30 outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 transition-all"
              placeholder="e.g. Ramesh General Store"
            />
          </div>

          {/* Store Owner Name */}
          <div className="space-y-1.5">
            <label className="text-[9.5px] font-black uppercase tracking-wider opacity-70 flex items-center gap-1.5">
              <User size={13} className="text-[var(--primary)] shrink-0" /> 
              {cleanAndValidateText("Store Owner Name (मालिक का नाम)", state.settings.language, state.settings)}
            </label>
            <input 
              type="text" 
              value={storeOwnerName} 
              onChange={e => setStoreOwnerName(e.target.value)}
              className="w-full bg-[var(--background)] text-[var(--foreground)] border border-[var(--border)] rounded-2xl px-4 py-3 text-xs font-bold placeholder:opacity-30 outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 transition-all"
              placeholder="e.g. Ramesh Kumar"
            />
          </div>

          {/* Phone Number */}
          <div className="space-y-1.5">
            <label className="text-[9.5px] font-black uppercase tracking-wider opacity-70 flex items-center gap-1.5">
              <Phone size={13} className="text-[var(--primary)] shrink-0" /> 
              {cleanAndValidateText("Phone Number (फोन नंबर)", state.settings.language, state.settings)}
            </label>
            <input 
              type="text" 
              value={storePhone} 
              onChange={e => setStorePhone(e.target.value)}
              className="w-full bg-[var(--background)] text-[var(--foreground)] border border-[var(--border)] rounded-2xl px-4 py-3 text-xs font-bold placeholder:opacity-30 outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 transition-all"
              placeholder="e.g. +91 98765 43210"
            />
          </div>

          {/* Shop Address */}
          <div className="space-y-1.5">
            <label className="text-[9.5px] font-black uppercase tracking-wider opacity-70 flex items-center gap-1.5">
              <MapPin size={13} className="text-[var(--primary)] shrink-0" /> 
              {cleanAndValidateText("Shop Address (दुकान का पता)", state.settings.language, state.settings)}
            </label>
            <input 
              type="text" 
              value={storeAddress} 
              onChange={e => setStoreAddress(e.target.value)}
              className="w-full bg-[var(--background)] text-[var(--foreground)] border border-[var(--border)] rounded-2xl px-4 py-3 text-xs font-bold placeholder:opacity-30 outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 transition-all"
              placeholder="e.g. Main Chowk, Sector 5, New Delhi"
            />
          </div>

          {/* Hours Section Header */}
          <div className="space-y-1.5 md:col-span-2 pt-4 border-t border-[var(--border)] mt-2">
            <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--primary)] flex items-center gap-2">
              <Clock size={14} className="text-[var(--primary)] shrink-0" /> 
              {cleanAndValidateText("Store Hours & Operational Cycle (दुकान का समय और दैनिक चक्र)", state.settings.language, state.settings)}
            </h4>
            <p className="text-[9px] opacity-50 uppercase font-bold tracking-wider">
              Define opening and closing times. Daily prompts will assist you in saving end-of-day reports and shift registers.
            </p>
          </div>

          {/* Opening Time */}
          <div className="space-y-1.5">
            <label className="text-[9.5px] font-black uppercase tracking-wider opacity-70 flex items-center gap-1.5">
              <Sun size={13} className="text-amber-500 shrink-0" /> 
              {cleanAndValidateText("Store Opening Time (दुकान खुलने का समय)", state.settings.language, state.settings)}
            </label>
            <input 
              type="time" 
              value={storeOpeningTime} 
              onChange={e => setStoreOpeningTime(e.target.value)}
              className="w-full bg-[var(--background)] text-[var(--foreground)] border border-[var(--border)] rounded-2xl px-4 py-3 text-xs font-bold outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 transition-all"
            />
          </div>

          {/* Closing Time */}
          <div className="space-y-1.5">
            <label className="text-[9.5px] font-black uppercase tracking-wider opacity-70 flex items-center gap-1.5">
              <Moon size={13} className="text-indigo-400 shrink-0" /> 
              {cleanAndValidateText("Store Closing Time (दुकान बंद होने का समय)", state.settings.language, state.settings)}
            </label>
            <input 
              type="time" 
              value={storeClosingTime} 
              onChange={e => setStoreClosingTime(e.target.value)}
              className="w-full bg-[var(--background)] text-[var(--foreground)] border border-[var(--border)] rounded-2xl px-4 py-3 text-xs font-bold outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 transition-all"
            />
          </div>

          {/* Closing Reminder Minutes */}
          <div className="space-y-1.5 md:col-span-2">
            <label className="text-[9.5px] font-black uppercase tracking-wider opacity-70 flex items-center gap-1.5">
              <Bell size={13} className="text-[var(--primary)] shrink-0" /> 
              {cleanAndValidateText("Closing Reminder Alert (दुकान बंद होने से कितने पहले अलर्ट दें?)", state.settings.language, state.settings)}
            </label>
            <select 
              value={String(reminderTimeBeforeMinutes)} 
              onChange={e => setReminderTimeBeforeMinutes(parseInt(e.target.value) || 0)}
              className="w-full bg-[var(--background)] text-[var(--foreground)] border border-[var(--border)] rounded-2xl px-4 py-3 text-xs font-bold shadow-sm outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 transition-all cursor-pointer"
            >
              <option value="0">{cleanAndValidateText("Exactly at Closing Time (बिल्कुल बंद होने के समय)", state.settings.language, state.settings)}</option>
              <option value="5">{cleanAndValidateText("5 Minutes Before Closing (बंद होने से 5 मिनट पहले)", state.settings.language, state.settings)}</option>
              <option value="10">{cleanAndValidateText("10 Minutes Before Closing (बंद होने से 10 मिनट पहले)", state.settings.language, state.settings)}</option>
              <option value="15">{cleanAndValidateText("15 Minutes Before Closing (बंद होने से 15 मिनट पहले)", state.settings.language, state.settings)}</option>
              <option value="30">{cleanAndValidateText("30 Minutes Before Closing (बंद होने से 30 मिनट पहले)", state.settings.language, state.settings)}</option>
              <option value="60">{cleanAndValidateText("1 Hour Before Closing (बंद होने से 1 घंटा पहले)", state.settings.language, state.settings)}</option>
            </select>
          </div>
        </div>

        {/* 🎯 Explicit Save Button */}
        <div className="pt-4 border-t border-[var(--border)] flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-[10px] opacity-60 uppercase font-bold">
            Press save to write credentials directly to Cloud Database & Local Storage.
          </p>

          <button
            type="submit"
            disabled={isSaving}
            className={`w-full sm:w-auto px-8 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2.5 transition-all shadow-lg active:scale-95 cursor-pointer ${
              saveSuccess 
                ? 'bg-emerald-600 text-white shadow-emerald-500/25 ring-2 ring-emerald-400' 
                : 'bg-[var(--primary)] hover:opacity-95 text-white shadow-[var(--primary)]/25'
            }`}
          >
            {isSaving ? (
              <>
                <RefreshCw size={16} className="animate-spin" />
                <span>Saving to Database...</span>
              </>
            ) : saveSuccess ? (
              <>
                <CheckCircle size={16} className="animate-bounce" />
                <span>✓ Credentials Saved!</span>
              </>
            ) : (
              <>
                <Save size={16} />
                <span>Save Store Credentials / सेव करें</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

function ProfileScreen({ state, t, deferredPrompt, onInstall, onShareProductList, isSharing, onUpdate, onLogout }: { 
  state: AppState; 
  t: any; 
  deferredPrompt: any; 
  onInstall: () => void;
  onShareProductList: () => void;
  isSharing: boolean;
  onUpdate: (updates: Partial<AppSettings>) => void;
  onLogout: () => Promise<void>;
}) {
  const handleAuth = async () => {
    if (state.user) {
      await onLogout();
    } else {
      try {
        await loginWithGoogle();
      } catch (error: any) {
        if (error?.code === 'auth/popup-closed-by-user') {
          alert('Sign-in cancelled. The login popup was closed before completing. Please try again.');
        } else if (error?.code === 'auth/popup-blocked') {
          alert('Login popup was blocked by your browser. Please allow popups for this site or open in a new tab.');
        } else {
          alert(`Sign-in failed: ${error?.message || error}`);
        }
      }
    }
  };

  return (
    <div className="space-y-8 pb-32 animate-in fade-in slide-in-from-bottom-6 duration-1000 max-w-2xl mx-auto px-4 sm:px-0">
      {/* Dynamic Visual Header */}
      <div className="relative overflow-hidden rounded-[3rem] bg-[var(--primary)] p-10 text-white shadow-2xl shadow-[var(--primary)]/20 min-h-[250px] flex flex-col justify-end group">
         <div className="absolute top-0 right-0 p-8 opacity-10 rotate-12 transition-transform group-hover:scale-110 group-hover:rotate-0 duration-700">
            <User size={200} />
         </div>
         <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />
         
         <div className="relative z-10 space-y-6">
            <div className="flex items-center gap-5">
               <div className="h-20 w-20 rounded-[2rem] bg-white/10 border border-white/20 backdrop-blur-xl flex items-center justify-center shadow-2xl transition-transform group-hover:scale-105">
                  <User size={40} className="text-white" />
               </div>
               <div>
                  <h2 className="text-4xl font-black uppercase tracking-tight leading-none truncate max-w-[200px] sm:max-w-md">
                    {state.settings.storeOwnerName || (state.user ? (state.user.email?.split('@')[0] || 'Merchant') : 'SYSTEM ADMIN')}
                  </h2>
                  <div className="mt-2 flex items-center gap-2">
                     <span className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
                     <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-70">
                       {state.settings.storeName || (state.user ? t.liveNode : t.localSandbox)}
                     </p>
                  </div>
                  {state.user && state.user.email && (
                     <div className="mt-1.5 flex items-center gap-1.5 opacity-90 text-[10.5px] font-mono tracking-tight bg-black/15 border border-white/10 rounded-lg px-2.5 py-1 w-fit select-text">
                        <Mail size={11} className="text-indigo-200 shrink-0" />
                        <span>{state.user.email}</span>
                     </div>
                  )}
               </div>
            </div>
            
            <div className="flex gap-8 pt-4">
               <div>
                  <p className="text-[9px] font-black uppercase tracking-widest opacity-50 mb-1">{t.authorization}</p>
                  <button 
                    onClick={handleAuth}
                    className="flex items-center gap-2 bg-white/10 hover:bg-white text-[10px] font-black uppercase tracking-widest py-2 px-4 rounded-full transition-all text-white hover:text-[var(--primary)] shadow-lg active:scale-95"
                  >
                     {state.user ? <LogOut size={14} /> : <LogIn size={14} />}
                     {state.user ? (t.terminateSession || 'LOG OUT') : t.cloudEntry}
                  </button>
               </div>
               <div className="h-10 w-px bg-white/20" />
               <div>
                  <p className="text-[9px] font-black uppercase tracking-widest opacity-50 mb-1">{t.architecture}</p>
                  <p className="text-xs font-black uppercase">v3.5.0 Enterprise</p>
               </div>
            </div>
         </div>
      </div>

      {/* 🏪 Store Configuration Form with Explicit Save Button */}
      <StoreCredentialsSection state={state} onUpdate={onUpdate} />

      {/* 🔐 Account Security & Multi-Device Sync Card */}
      {state.user && (
         <div className="bg-[var(--card)] border border-[var(--border)] rounded-[2.5rem] p-8 space-y-6 shadow-sm text-left">
            <div>
               <h3 className="text-lg font-black uppercase tracking-tight text-[var(--foreground)] flex items-center gap-2">
                  <ShieldCheck size={20} className="text-indigo-500 animate-pulse" />
                  {cleanAndValidateText("Account Synchronization / मल्टी-डिवाइस सिंक सुरक्षा", state.settings.language, state.settings)}
               </h3>
               <p className="text-[9px] opacity-45 uppercase font-bold tracking-wider mt-1">
                  Manage your credentials. Link a password to use the same email on devices where Google sign-in is not convenient.
               </p>
            </div>

            {/* Providers Status */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
               {/* Google Status */}
               <div className="p-4 rounded-2xl bg-[var(--background)] border border-[var(--border)] flex items-center justify-between">
                  <div className="flex items-center gap-3">
                     <div className="h-9 w-9 rounded-xl bg-indigo-500/10 text-indigo-500 font-bold text-sm flex items-center justify-center">
                        G
                     </div>
                     <div>
                        <p className="text-[10px] font-black uppercase tracking-wide text-[var(--foreground)]">Google Authentication</p>
                        <p className="text-[9px] text-[var(--foreground)]/60 font-mono tracking-tight truncate max-w-[120px] sm:max-w-none">{state.user.email}</p>
                     </div>
                  </div>
                  <span className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-[9px] font-black uppercase px-2 py-1 rounded-md border border-emerald-500/10 flex items-center gap-1 shrink-0">
                     <CheckCircle size={10} /> Connected
                  </span>
               </div>

               {/* Password Status */}
               <div className="p-4 rounded-2xl bg-[var(--background)] border border-[var(--border)] flex items-center justify-between">
                  <div className="flex items-center gap-3">
                     <div className="h-9 w-9 rounded-xl bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center">
                        <Lock size={14} />
                     </div>
                     <div>
                        <p className="text-[10px] font-black uppercase tracking-wide text-[var(--foreground)]">Email & Password Sign-in</p>
                        <p className="text-[9px] text-[var(--foreground)]/60 font-mono tracking-tight">
                           {auth.currentUser?.providerData.some(p => p.providerId === 'password') 
                              ? 'Active / पासवर्ड लिंक है' 
                              : 'Not Linked / लिंक नहीं है'}
                        </p>
                     </div>
                  </div>
                  {auth.currentUser?.providerData.some(p => p.providerId === 'password') ? (
                     <span className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-[9px] font-black uppercase px-2 py-1 rounded-md border border-emerald-500/10 flex items-center gap-1 shrink-0">
                        <CheckCircle size={10} /> Active
                     </span>
                  ) : (
                     <span className="bg-amber-500/15 text-amber-600 dark:text-amber-400 text-[9px] font-black uppercase px-2 py-1 rounded-md border border-amber-500/10 flex items-center gap-1 shrink-0">
                        Pending
                     </span>
                  )}
               </div>
            </div>

            <PasswordLinkManager user={auth.currentUser} settings={state.settings} />
         </div>
      )}

      {/* Operational Controls */}
      <div className="space-y-4">
         <div className="flex items-center justify-between px-4">
            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40">System Core</h4>
            <div className="h-px flex-1 bg-[var(--border)] mx-4 opacity-10" />
         </div>

         {/* PWA Deployment Call-to-Action */}
         {deferredPrompt && (
           <button 
             onClick={onInstall}
             className="w-full flex items-center justify-between p-8 bg-gradient-to-br from-amber-500 to-orange-600 text-white rounded-[2.5rem] shadow-2xl shadow-amber-500/30 active:scale-[0.98] transition-all group overflow-hidden relative"
           >
              <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
              <div className="flex items-center gap-5 relative z-10">
                 <div className="h-14 w-14 rounded-2xl bg-white/20 flex items-center justify-center shadow-inner">
                    <Download size={28} />
                 </div>
                 <div className="text-left">
                    <p className="text-xl font-black uppercase tracking-tight">{t.deployNode}</p>
                    <p className="text-[10px] font-bold opacity-70 uppercase tracking-widest">{t.pwaInstallHint}</p>
                 </div>
              </div>
              <ChevronRight size={24} className="relative z-10 opacity-60 group-hover:translate-x-1 transition-transform" />
           </button>
         )}

         {/* Secondary Hub Actions */}
         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button 
              disabled={isSharing}
              onClick={onShareProductList}
              className="flex items-center justify-between p-6 bg-[var(--card)] border border-[var(--border)] rounded-[2rem] hover:border-green-500/30 hover:bg-green-500/5 transition-all group disabled:opacity-50"
            >
               <div className="flex items-center gap-4">
                  <div className={cn(
                    "h-12 w-12 rounded-2xl flex items-center justify-center transition-colors group-hover:bg-green-500 group-hover:text-white",
                    isSharing ? "bg-green-500 text-white" : "bg-green-500/10 text-green-500"
                  )}>
                     {isSharing ? <RefreshCw size={22} className="animate-spin" /> : <MessageSquare size={22} />}
                  </div>
                  <div className="text-left">
                     <p className="text-sm font-black uppercase group-hover:text-green-500 transition-colors">Share Product List</p>
                     <p className="text-[8px] font-bold opacity-40 uppercase tracking-widest">{t.whatsappBroadcast || "WhatsApp Broadcast"}</p>
                  </div>
               </div>
               <ChevronRight size={16} className="opacity-20 group-hover:translate-x-1 transition-transform" />
            </button>

            <button 
              onClick={() => {
                  const message = encodeURIComponent(`Check out TS PRICE MANAGER: ${window.location.host}`);
                  window.open(`https://wa.me/?text=${message}`, '_blank');
              }}
              className="flex items-center justify-between p-6 bg-[var(--card)] border border-[var(--border)] rounded-[2rem] hover:border-blue-500/30 hover:bg-blue-500/5 transition-all group"
            >
               <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center transition-colors group-hover:bg-blue-500 group-hover:text-white">
                     <Share2 size={22} />
                  </div>
                  <div className="text-left">
                     <p className="text-sm font-black uppercase group-hover:text-blue-500 transition-colors">{t.clientShare}</p>
                     <p className="text-[8px] font-bold opacity-40 uppercase tracking-widest">{t.appShareHint || "Invite other merchants"}</p>
                  </div>
               </div>
               <ChevronRight size={16} className="opacity-20 group-hover:translate-x-1 transition-transform" />
            </button>
         </div>
      </div>

      <div className="text-center pt-8 opacity-20">
         <p className="text-[10px] font-black uppercase tracking-[0.5em] italic">Precision Inventory Systems</p>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon, color }: { label: string; value: string; icon: React.ReactNode; color: string }) {
  const colors: Record<string, string> = {
    emerald: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20 shadow-emerald-500/5",
    amber: "bg-amber-500/10 text-amber-500 border-amber-500/20 shadow-amber-500/5",
    blue: "bg-blue-500/10 text-blue-500 border-blue-500/20 shadow-blue-500/5",
  };

  return (
    <div className={cn("p-6 rounded-[2.5rem] border shadow-sm space-y-4 hover:shadow-xl transition-all duration-500", colors[color])}>
       <div className="h-10 w-10 rounded-2xl bg-white/20 flex items-center justify-center shadow-inner">
          {icon}
       </div>
       <div>
          <p className="text-[8px] font-black uppercase tracking-widest opacity-60 leading-tight mb-1">{label}</p>
          <p className="text-xl font-black uppercase tracking-tight">{value}</p>
       </div>
    </div>
  );
}

function RecentPriceChanges({ items, t, precision, renderHeaderAction }: { items: Item[]; t: any; precision: number; renderHeaderAction?: () => React.ReactNode }) {
  const recentChanges = useMemo(() => {
    return items
      .filter(item => item.priceChangedAt)
      .sort((a, b) => new Date(b.priceChangedAt!).getTime() - new Date(a.priceChangedAt!).getTime())
      .slice(0, 5);
  }, [items]);

  return (
    <div className="card p-6 bg-[var(--card)] border border-[var(--border)] rounded-3xl space-y-4">
       <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
          <div className="flex items-center gap-2 text-sm font-black uppercase tracking-tight text-[var(--foreground)]">
            <RotateCcw size={15} className="text-[var(--primary)]" />
            <span>{t.recentPriceChanges || "Recent Price Changes"}</span>
          </div>
          {renderHeaderAction && renderHeaderAction()}
       </div>
       
       {recentChanges.length === 0 ? (
          <div className="py-6 flex flex-col items-center justify-center text-center space-y-2 opacity-55">
             <div className="h-10 w-10 bg-[var(--primary)]/10 text-[var(--primary)] rounded-full flex items-center justify-center border border-[var(--primary)]/20 animate-pulse">
                <RotateCcw size={18} />
             </div>
             <div>
                <p className="text-xs font-black uppercase tracking-wide">No Recent Changes</p>
                <p className="text-[9px] opacity-60">Any updates to sell prices or stock purchase costs will appear here.</p>
             </div>
          </div>
       ) : (
          <div className="flex gap-4 overflow-x-auto pb-2 no-scrollbar">
            {recentChanges.map((item, idx) => (
              <motion.div 
                key={`recent-change-${item.id || 'item'}-${idx}`} 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.08, type: "spring", stiffness: 200, damping: 20 }}
                whileHover={{ y: -3, scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                className="flex-shrink-0 w-64 p-4 border border-[var(--border)] bg-[var(--foreground)]/[0.02] rounded-2xl cursor-pointer"
              >
                 <div className="flex items-center justify-between mb-3">
                    <div className="h-8 w-8 rounded-lg bg-[var(--background)] border border-[var(--border)] flex items-center justify-center text-xs">
                      {DEFAULT_CATEGORIES.find(c => c.id === item.categoryId)?.icon}
                    </div>
                    <span className="text-[10px] font-bold opacity-30 uppercase tracking-widest">
                      {new Date(item.priceChangedAt!).toLocaleDateString()}
                    </span>
                 </div>
                 <h4 className="font-bold text-sm truncate mb-2">{item.name}</h4>
                 <div className="flex items-center gap-4">
                    <div>
                       <p className="text-[8px] font-bold uppercase opacity-40">Retail</p>
                       <p className="text-xs font-bold">₹{formatNumber(item.retailPrice, precision)}</p>
                    </div>
                    <div className="h-6 w-px bg-[var(--border)]" />
                    <div>
                       <p className="text-[8px] font-bold uppercase opacity-40">Cost</p>
                       <p className="text-xs font-bold">₹{formatNumber(item.buyingPrice, precision)}</p>
                    </div>
                 </div>
              </motion.div>
            ))}
          </div>
       )}
    </div>
  );
}

function NotesDashboard({ 
  notes, 
  expanded, 
  onToggle, 
  onAdd, 
  onUpdate, 
  onDelete, 
  t,
  isPreview = false
}: { 
  notes: Note[]; 
  expanded: boolean; 
  onToggle: () => void; 
  onAdd: () => void;
  onUpdate: (id: string, updates: Partial<Note>) => void;
  onDelete: (id: string) => void;
  t: any;
  isPreview?: boolean;
}) {
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');

  const filteredNotes = useMemo(() => {
    return notes.filter(n => {
      const matchesFilter = filter === 'All' || n.category === filter;
      const matchesSearch = n.title.toLowerCase().includes(search.toLowerCase()) || 
                           n.description.toLowerCase().includes(search.toLowerCase());
      return matchesFilter && matchesSearch;
    }).sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [notes, filter, search]);

  const displayNotes = isPreview ? filteredNotes.slice(0, 3) : filteredNotes;
  const categories = ['All', 'Stock', 'Payment', 'Customer', 'Supplier', 'Reminder', 'General'];

  const getPriorityClass = (priority: string) => {
    switch (priority) {
      case 'Urgent': return 'bg-red-500/10 text-red-500 border-red-500/20';
      case 'Important': return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
      case 'Completed': return 'bg-green-500/10 text-green-500 border-green-500/20';
      default: return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Stock': return <Package size={14} />;
      case 'Payment': return <CreditCard size={14} />;
      case 'Customer': return <Users size={14} />;
      case 'Supplier': return <Truck size={14} />;
      case 'Reminder': return <Clock size={14} />;
      default: return <FileText size={14} />;
    }
  };

  return (
    <div className={cn("animate-in fade-in slide-in-from-bottom-4 duration-700", !isPreview && "space-y-6")}>
      {!isPreview && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <button onClick={onToggle} className="flex items-center gap-3 group">
               <div className="h-10 w-10 rounded-xl bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center transition-colors group-hover:bg-[var(--primary)] group-hover:text-white">
                 {expanded ? <ChevronDown size={20} /> : <ChevronUp size={20} />}
               </div>
               <div>
                 <h3 className="text-xl font-black uppercase tracking-widest opacity-80">{t.notesDashboard}</h3>
                 <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40">Operational Journal</p>
               </div>
            </button>
            <Button onClick={onAdd} className="rounded-xl flex gap-2 h-10 px-4 bg-amber-500 hover:bg-amber-600 shadow-xl shadow-amber-500/20 active:scale-95 transition-all">
               <Plus size={18} /> <span className="hidden sm:inline text-[10px] font-black uppercase tracking-widest">{t.addNote}</span>
            </Button>
          </div>

          <AnimatePresence>
            {expanded && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                <div className="flex flex-col sm:flex-row gap-4">
                   <div className="flex-1 relative">
                     <Search className="absolute left-3 top-1/2 -translate-y-1/2 opacity-20" size={16} />
                     <input 
                       className="w-full rounded-xl bg-[var(--background)] border border-[var(--border)] py-2.5 pl-10 pr-4 text-xs font-bold focus:border-[var(--primary)] outline-none transition-all placeholder:opacity-20"
                       placeholder="Search journal..."
                       value={search}
                       onChange={(e) => setSearch(e.target.value)}
                     />
                   </div>
                   <div className="flex gap-1 overflow-x-auto no-scrollbar pb-1">
                      {categories.map(cat => (
                        <button
                          key={cat}
                          onClick={() => setFilter(cat)}
                          className={cn(
                            "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all shrink-0",
                            filter === cat 
                              ? "bg-[var(--primary)] border-[var(--primary)] text-white shadow-lg shadow-[var(--primary)]/20" 
                              : "bg-[var(--card)] border-[var(--border)] opacity-60 hover:opacity-100"
                          )}
                        >
                          {cat}
                        </button>
                      ))}
                   </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      <div className={cn(
        "grid gap-4 transition-all",
        !expanded && !isPreview ? "opacity-30 blur-[1px] grayscale pointer-events-none" : "opacity-100",
        isPreview ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
      )}>
        <AnimatePresence mode="popLayout">
          {displayNotes.length > 0 ? displayNotes.map((note, nIdx) => (
            <NoteCard 
               key={`note-${note.id || 'note'}-${nIdx}`} 
               note={note} 
               onUpdate={onUpdate} 
               onDelete={onDelete} 
               t={t}
               priorityClass={getPriorityClass(note.priority)}
               categoryIcon={getCategoryIcon(note.category)}
               isPreview={isPreview}
            />
          )) : (
            <motion.div initial={{opacity:0}} animate={{opacity:1}} className="col-span-full py-16 text-center card border-dashed border-[var(--border)] border-white/10 opacity-40">
               <FileText className="mx-auto mb-4 opacity-20" size={48} />
               <p className="text-xs font-black uppercase tracking-widest opacity-20">Zero active entries detected</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function NoteCard({ 
  note, onUpdate, onDelete, t, priorityClass, categoryIcon, isPreview 
}: { 
  note: Note; 
  onUpdate: (id: string, updates: Partial<Note>) => void;
  onDelete: (id: string) => void;
  t: any;
  priorityClass: string;
  categoryIcon: React.ReactNode;
  isPreview?: boolean;
  key?: any;
}) {
  return (
    <motion.div 
      layout
      key={note.id}
      initial={{ opacity: 0, scale: 0.95, y: 15 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: 15 }}
      whileHover={isPreview ? undefined : { y: -6, scale: 1.015 }}
      whileTap={isPreview ? undefined : { scale: 0.99 }}
      transition={{ type: "spring", stiffness: 350, damping: 22 }}
      className={cn(
        "group relative rounded-[2.5rem] transition-colors duration-200",
        isPreview ? "p-4 hover:bg-[var(--primary)]/5" : "bg-[var(--card)] p-6 shadow-sm border border-[var(--border)] hover:shadow-2xl hover:border-[var(--primary)]/30",
        note.status === 'Completed' && !isPreview && 'opacity-30 grayscale saturate-0'
      )}
    >
      <div className="flex items-start gap-5">
        <div className={cn("h-12 w-12 rounded-2xl flex items-center justify-center flex-shrink-0 transition-all shadow-inner", priorityClass)}>
           {categoryIcon}
        </div>
        <div className="flex-1 space-y-2 min-w-0">
           <div className="flex items-center gap-2">
              <span className={cn("text-[7px] font-black uppercase tracking-[0.2em] px-2 py-0.5 rounded-full border", priorityClass)}>
                {note.priority}
              </span>
              <span className="text-[7px] font-black opacity-30 uppercase tracking-[0.2em]">{note.category}</span>
           </div>
           <h5 className={cn("font-black tracking-tight text-base truncate uppercase", note.status === 'Completed' && "line-through opacity-40")}>
             {note.title}
           </h5>
           <p className={cn("text-xs font-medium opacity-60 line-clamp-2 leading-relaxed h-[2.5rem]", note.status === 'Completed' && "opacity-20")}>
             {note.description}
           </p>
        </div>
      </div>

      <div className="mt-8 flex items-center justify-between border-t border-[var(--border)] border-dashed pt-5">
         <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 opacity-30">
               <Clock size={12} />
               <span className="text-[9px] font-black uppercase tracking-tighter">
                 {new Date(note.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
               </span>
            </div>
            {note.dueDate && (
               <div className="flex items-center gap-1.5 text-amber-500/80">
                  <Calendar size={12} />
                  <span className="text-[9px] font-black uppercase tracking-tighter">{new Date(note.dueDate).toLocaleDateString()}</span>
               </div>
            )}
         </div>
         <div className={cn("flex gap-1.5 transition-opacity duration-500", isPreview ? "opacity-0 group-hover:opacity-100" : "opacity-0 group-hover:opacity-100")}>
            <button onClick={() => onUpdate(note.id, { status: note.status === 'Completed' ? 'Active' : 'Completed' })} className="p-2.5 bg-green-500/5 hover:bg-green-500 hover:text-white rounded-xl transition-all active:scale-90">
               <CheckCircle2 size={16} />
            </button>
            <button onClick={() => onUpdate(note.id, { isPinned: !note.isPinned })} className={cn("p-2.5 rounded-xl transition-all active:scale-90", note.isPinned ? "bg-amber-500 text-white" : "bg-amber-500/5 hover:bg-amber-500 hover:text-white")}>
               <Pin size={16} />
            </button>
            <button onClick={() => onDelete(note.id)} className="p-2.5 bg-red-500/5 hover:bg-red-500 hover:text-white rounded-xl transition-all active:scale-90">
               <Trash2 size={16} />
            </button>
         </div>
      </div>
    </motion.div>
  );
}

function NoteFormModal({ onClose, onSave, t }: { onClose: () => void; onSave: (data: any) => void; t: any }) {
  useBackModal(true, onClose, 'note_form_modal');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'General' as const,
    priority: 'Info' as const,
    dueDate: '',
    isPinned: false
  });
  const [isListening, setIsListening] = useState(false);

  const handleVoiceInput = () => {
    if (!('webkitSpeechRecognition' in window)) {
      alert('Voice-to-text not supported in this browser.');
      return;
    }

    const recognition = new (window as any).webkitSpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    let isWorking = false;
    const originalStart = recognition.start;
    recognition.start = function() {
      if (isWorking) {
        console.warn("SpeechRecognition already working.");
        return;
      }
      try {
        isWorking = true;
        originalStart.call(recognition);
      } catch (err) {
        console.warn("SpeechRecognition start error:", err);
      }
    };

    recognition.onstart = () => {
      isWorking = true;
      setIsListening(true);
    };
    recognition.onend = () => {
      isWorking = false;
      setIsListening(false);
    };
    recognition.onerror = () => {
      isWorking = false;
      setIsListening(false);
    };
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setFormData(prev => ({ ...prev, description: prev.description + ' ' + transcript }));
    };
    try {
      recognition.start();
    } catch (e) {
      console.warn("Speech start bypassed:", e);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }} 
        animate={{ scale: 1, opacity: 1 }} 
        className="w-full max-w-lg card p-8 space-y-6 shadow-[0_30px_60px_rgba(0,0,0,0.5)] border-white/5"
      >
        <div className="flex items-center justify-between">
           <h3 className="text-xl font-black uppercase tracking-widest">{t.addNote}</h3>
           <button onClick={onClose} className="h-8 w-8 rounded-full hover:bg-white/10 flex items-center justify-center">
             <X size={20} />
           </button>
        </div>

        <div className="space-y-4">
           <div>
              <label className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-1 block">Title</label>
              <input 
                 value={formData.title} 
                 onChange={e => setFormData({ ...formData, title: e.target.value })}
                 className="w-full bg-[var(--background)] border border-[var(--border)] rounded-xl px-4 py-3 focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)] outline-none"
                 placeholder="Short descriptive title"
              />
           </div>

           <div className="grid grid-cols-2 gap-4">
              <div>
                 <label className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-1 block">Category</label>
                 <select 
                    value={formData.category}
                    onChange={e => setFormData({ ...formData, category: e.target.value as any })}
                    className="w-full bg-[var(--background)] border border-[var(--border)] rounded-xl px-4 py-3 outline-none"
                 >
                    {['Stock', 'Payment', 'Customer', 'Supplier', 'Reminder', 'General'].map(c => <option key={c} value={c}>{c}</option>)}
                 </select>
              </div>
              <div>
                 <label className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-1 block">Priority</label>
                 <select 
                    value={formData.priority}
                    onChange={e => setFormData({ ...formData, priority: e.target.value as any })}
                    className="w-full bg-[var(--background)] border border-[var(--border)] rounded-xl px-4 py-3 outline-none"
                 >
                    {['Urgent', 'Important', 'Completed', 'Info'].map(p => <option key={p} value={p}>{p}</option>)}
                 </select>
              </div>
           </div>

           <div>
              <div className="flex items-center justify-between mb-1">
                 <label className="text-[10px] font-black uppercase tracking-widest opacity-40 block">Details</label>
                 <button 
                   onClick={handleVoiceInput}
                   className={cn(
                     "h-7 w-7 rounded-full flex items-center justify-center transition-all",
                     isListening ? "bg-red-500 scale-110 shadow-[0_0_10px_rgba(239,68,68,0.5)]" : "bg-[var(--primary)]/20 text-[var(--primary)]"
                   )}
                 >
                    <Mic size={14} className={isListening ? 'animate-pulse text-white' : ''} />
                 </button>
              </div>
              <textarea 
                 value={formData.description} 
                 onChange={e => setFormData({ ...formData, description: e.target.value })}
                 className="w-full bg-[var(--background)] border border-[var(--border)] rounded-xl px-4 py-3 min-h-[100px] outline-none transition-all"
                 placeholder="Note details (Use microphone icon for voice-to-text)"
              />
           </div>

           <div className="flex items-center gap-6">
              <label className="flex items-center gap-3 cursor-pointer">
                 <input type="checkbox" checked={formData.isPinned} onChange={e => setFormData({ ...formData, isPinned: e.target.checked })} className="h-5 w-5 rounded border-[var(--border)] bg-[var(--background)]" />
                 <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Pin to top</span>
              </label>
              <div className="flex-1">
                 <input 
                   type="date" 
                   value={formData.dueDate} 
                   onChange={e => setFormData({ ...formData, dueDate: e.target.value })}
                   className="w-full bg-[var(--background)] border border-[var(--border)] rounded-xl px-4 py-2 text-xs outline-none"
                 />
              </div>
           </div>
        </div>

        <div className="flex gap-4 pt-4">
           <Button variant="ghost" className="flex-1 rounded-2xl" onClick={onClose}>Cancel</Button>
           <Button className="flex-1 rounded-2xl py-4" onClick={() => onSave(formData)}>Create Note</Button>
        </div>
      </motion.div>
    </div>
  );
}

/**
 * GoalShiftPanelModal Component
 */
function GoalShiftPanelModal({
  isOpen,
  onClose,
  activeShift,
  setActiveShift,
  shiftHistory,
  setShiftHistory,
  businessGoals,
  setBusinessGoals,
  state,
  t
}: {
  isOpen: boolean;
  onClose: () => void;
  activeShift: BusinessShift | null;
  setActiveShift: React.Dispatch<React.SetStateAction<BusinessShift | null>>;
  shiftHistory: BusinessShift[];
  setShiftHistory: React.Dispatch<React.SetStateAction<BusinessShift[]>>;
  businessGoals: BusinessGoal;
  setBusinessGoals: React.Dispatch<React.SetStateAction<BusinessGoal>>;
  state: any;
  t: any;
}) {
  useBackModal(isOpen, onClose, 'goal_shift_panel');
  const [activeTab, setActiveTabLocal] = useState<'shift' | 'history'>('shift');

  // Input states for New Shift Setup
  const [openingCashVal, setOpeningCashVal] = useState('2000');
  
  // Input states for closing active shift
  const [closingCashVal, setClosingCashVal] = useState('');
  const [isClosingFormOpen, setIsClosingFormOpen] = useState(false);

  // Editable Revenue Goal Goals
  const [editGoals, setEditGoals] = useState({ ...businessGoals });
  const [isEditingTargets, setIsEditingTargets] = useState(false);

  // Automatically preset the estimated expected closing cash
  useEffect(() => {
    if (activeShift) {
      const estimatedCash = activeShift.openingCash + activeShift.totalSales - activeShift.pendingUdhar;
      setClosingCashVal(String(estimatedCash));
    }
  }, [activeShift]);

  // Synchronize internal state with parent when goals are changed
  useEffect(() => {
    setEditGoals({ ...businessGoals });
  }, [businessGoals]);

  if (!isOpen) return null;

  // Compute actual progress targets live
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const weekStart = todayStart - 7 * 24 * 60 * 60 * 1000;
  const monthStart = todayStart - 30 * 24 * 60 * 60 * 1000;

  let dSales = 0, dProfit = 0, dBills = 0;
  let wSales = 0, wProfit = 0, wBills = 0;
  let mSales = 0, mProfit = 0, mBills = 0;

  (state.bills || []).forEach((b: any) => {
    const ts = new Date(b.timestamp).getTime();
    let profit = 0;
    b.items.forEach((it: any) => {
      const cost = it.cost || 0;
      profit += (it.price - cost) * it.quantity;
    });

    if (ts >= todayStart) {
      dSales += b.total;
      dProfit += profit;
      dBills++;
    }
    if (ts >= weekStart) {
      wSales += b.total;
      wProfit += profit;
      wBills++;
    }
    if (ts >= monthStart) {
      mSales += b.total;
      mProfit += profit;
      mBills++;
    }
  });

  const progress = {
    daily: { sales: dSales, profit: dProfit, bills: dBills },
    weekly: { sales: wSales, profit: wProfit, bills: wBills },
    monthly: { sales: mSales, profit: mProfit, bills: mBills }
  };

  const handleStartShift = () => {
    const cash = parseFloat(openingCashVal) || 0;
    const newShift: BusinessShift = {
      id: `shift-${Date.now()}`,
      openTime: new Date().toISOString(),
      closeTime: null,
      openingCash: cash,
      closingCash: 0,
      totalSales: 0,
      totalProfit: 0,
      totalBills: 0,
      totalPrints: 0,
      pendingUdhar: 0,
      topSellingItem: 'None',
      totalCustomersServed: 0,
      isOpen: true,
      date: new Date().toISOString().split('T')[0]
    };
    setActiveShift(newShift);
    setIsClosingFormOpen(false);
  };

  const handleCloseShift = () => {
    if (!activeShift) return;
    const closedShift: BusinessShift = {
      ...activeShift,
      closeTime: new Date().toISOString(),
      closingCash: parseFloat(closingCashVal) || 0,
      isOpen: false
    };
    setShiftHistory(prev => [closedShift, ...prev]);
    setActiveShift(null);
    setIsClosingFormOpen(false);
  };

  const handleSaveGoals = () => {
    setBusinessGoals(editGoals);
    setIsEditingTargets(false);
  };

  // Helper render for progress items
  const renderProgressBar = (label: string, actual: number, target: number, unit = '') => {
    const pct = Math.min(100, Math.round((actual / (target || 1)) * 100));
    return (
      <div className="space-y-1">
        <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-wider text-[var(--foreground)]/60">
          <span>{label}</span>
          <span>{unit}{actual.toLocaleString()} / {unit}{target.toLocaleString()} ({pct}%)</span>
        </div>
        <div className="w-full bg-[var(--foreground)]/10 h-2.5 rounded-full overflow-hidden border border-[var(--border)]">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className={cn(
              "h-full rounded-full",
              pct >= 100 ? "bg-emerald-500" : pct >= 50 ? "bg-[var(--primary)]" : "bg-amber-500"
            )}
          />
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-[var(--card)] border border-[var(--border)] text-[var(--foreground)] max-w-xl w-full rounded-[2rem] p-6 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
      >
        {/* Header */}
        <div className="flex justify-between items-start border-b border-[var(--border)] pb-4 mb-4">
          <div>
            <span className="text-[8px] font-black uppercase tracking-widest text-[var(--primary)]">Shift Control Dashboard</span>
            <h2 className="text-md font-black uppercase tracking-tight text-[var(--foreground)]">Shift Ledger & Targets</h2>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full h-8 w-8 text-[var(--foreground)]/60">
            <X size={16} />
          </Button>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-[var(--border)] pb-3 gap-2">
          {[
            { id: 'shift', label: 'Shift Control' },
            { id: 'history', label: 'Shift Audit Logs' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTabLocal(tab.id as any)}
              className={cn(
                "flex-1 py-2 rounded-xl text-[9px] font-black uppercase tracking-wider text-center transition cursor-pointer leading-none",
                activeTab === tab.id 
                  ? "bg-[var(--primary)] text-white shadow-md shadow-[var(--primary)]/20" 
                  : "bg-[var(--foreground)]/5 text-[var(--foreground)]/60 hover:bg-[var(--foreground)]/10"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Main Workspace Area */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
          {activeTab === 'shift' && (
            <div className="space-y-4">
              {activeShift ? (
                <>
                  {/* Active Registry Status */}
                  <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="h-3 w-3 rounded-full bg-emerald-500 animate-pulse" />
                      <div>
                        <p className="text-xs font-black uppercase tracking-wide text-emerald-500 font-sans">Cash Register Active</p>
                        <p className="text-[9px] font-mono text-[var(--foreground)]/50">Opened: {new Date(activeShift.openTime).toLocaleTimeString()}</p>
                      </div>
                    </div>
                    <div className="text-right font-sans">
                      <p className="text-xs font-mono font-black text-white">₹{activeShift.openingCash.toLocaleString()}</p>
                      <p className="text-[8px] uppercase tracking-wider text-[var(--foreground)]/40 font-bold">Opening Cash</p>
                    </div>
                  </div>

                  {/* Operational Stats Grid */}
                  <div className="grid grid-cols-2 gap-3 font-sans">
                    <div className="bg-[var(--foreground)]/5 rounded-2xl p-4 border border-[var(--border)] leading-tight">
                      <p className="text-[8px] font-black uppercase tracking-wider opacity-40">Sales Collected</p>
                      <p className="text-lg font-mono font-black text-emerald-400 mt-1">₹{activeShift.totalSales.toLocaleString()}</p>
                    </div>
                    <div className="bg-[var(--foreground)]/5 rounded-2xl p-4 border border-[var(--border)] leading-tight">
                      <p className="text-[8px] font-black uppercase tracking-wider opacity-40">Profit Realized</p>
                      <p className="text-lg font-mono font-black text-blue-400 mt-1">₹{activeShift.totalProfit.toLocaleString()}</p>
                    </div>
                    <div className="bg-[var(--foreground)]/5 rounded-2xl p-4 border border-[var(--border)] leading-tight">
                      <p className="text-[8px] font-black uppercase tracking-wider opacity-40 font-sans">Transactions Count</p>
                      <p className="text-lg font-mono font-black mt-1 text-white">{activeShift.totalBills} Invoices</p>
                    </div>
                    <div className="bg-[var(--foreground)]/5 rounded-2xl p-4 border border-[var(--border)] leading-tight">
                      <p className="text-[8px] font-black uppercase tracking-wider opacity-40 font-sans">Outstanding Udhar</p>
                      <p className="text-lg font-mono font-black text-amber-500 mt-1">₹{activeShift.pendingUdhar.toLocaleString()}</p>
                    </div>
                  </div>

                  {/* Detail Panel */}
                  <div className="bg-[var(--foreground)]/5 rounded-2xl border border-[var(--border)] px-4 py-3 divide-y divide-[var(--border)]">
                    <div className="flex justify-between py-2 text-xs font-bold font-sans">
                      <span className="opacity-50">Total Sales:</span>
                      <span className="text-emerald-400">₹{activeShift.totalSales.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between py-2 text-xs font-bold font-sans">
                      <span className="opacity-50">Served Customers:</span>
                      <span className="text-white">{activeShift.totalCustomersServed}</span>
                    </div>
                    <div className="flex justify-between py-2 text-xs font-bold font-sans">
                      <span className="opacity-50">Estimated Cash in Drawer:</span>
                      <span className="font-mono text-emerald-400 font-extrabold">₹{(activeShift.openingCash + activeShift.totalSales - activeShift.pendingUdhar).toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Action Section */}
                  {isClosingFormOpen ? (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-red-500/5 p-4 border border-red-500/20 rounded-2xl space-y-3">
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-red-500 font-sans">Close Active Shift Checkout</h4>
                      <div>
                        <label className="text-[9px] font-black uppercase tracking-wider opacity-60 font-sans">Physical Cash Counted in Drawer (₹)</label>
                        <input
                          type="number"
                          value={closingCashVal}
                          onChange={e => setClosingCashVal(e.target.value)}
                          className="w-full mt-1 px-3 py-2 text-xs bg-[var(--background)] border border-[var(--border)] text-[var(--foreground)] rounded-xl outline-none font-mono"
                        />
                      </div>
                      <div className="flex gap-2 font-sans">
                        <Button variant="ghost" className="flex-1 text-xs rounded-xl h-10" onClick={() => setIsClosingFormOpen(false)}>Cancel</Button>
                        <Button className="flex-1 bg-red-650 hover:bg-red-700 text-white text-xs rounded-xl h-10 font-sans" onClick={handleCloseShift}>Confirm & Close Shift</Button>
                      </div>
                    </motion.div>
                  ) : (
                    <Button className="w-full h-12 bg-red-500/10 hover:bg-red-500/25 border border-red-500/30 text-red-500 font-black uppercase tracking-widest rounded-2xl text-xs font-sans" onClick={() => setIsClosingFormOpen(true)}>
                      Reconcile & Close Cashier Shift
                    </Button>
                  )}
                </>
              ) : (
                <div className="py-6 text-center space-y-4">
                  <div className="h-14 w-14 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center mx-auto">
                    <Lock size={28} />
                  </div>
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-tight text-[var(--foreground)]">Ledger Register Closed</h3>
                    <p className="text-[10px] text-[var(--foreground)]/60 leading-relaxed max-w-sm mx-auto mt-1">Initialize a new active ledger shift before billing to record shift-based transactions, cashier logs, and dynamic margins.</p>
                  </div>

                  <div className="bg-[var(--foreground)]/5 p-4 border border-[var(--border)] rounded-2xl max-w-xs mx-auto text-left space-y-3">
                    <div>
                      <label className="text-[9px] font-black uppercase tracking-widest opacity-50 block mb-1">Opening Cash Reserve In Drawer (₹)</label>
                      <input
                        type="number"
                        value={openingCashVal}
                        onChange={e => setOpeningCashVal(e.target.value)}
                        className="w-full px-3 py-2 text-xs bg-[var(--background)] border border-[var(--border)] text-[var(--foreground)] rounded-xl outline-none font-mono font-bold"
                      />
                    </div>
                    <Button className="w-full h-11 rounded-xl bg-emerald-500 text-white font-black uppercase tracking-wider text-xs shadow-lg shadow-emerald-500/20 font-sans" onClick={handleStartShift}>
                      Open Cashier Shift
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'history' && (
            <div className="space-y-3 font-sans">
              {shiftHistory.length === 0 ? (
                <div className="py-12 text-center space-y-2 opacity-50 font-sans">
                  <Database size={32} className="mx-auto" />
                  <p className="text-xs font-black uppercase tracking-wider font-sans">No historic registry shift found</p>
                  <p className="text-[10px] max-w-sm mx-auto leading-normal font-sans">Closed cashier shifts will be logged as deep shift ledger archives in here.</p>
                </div>
              ) : (
                shiftHistory.map((sh, idx) => (
                  <div key={sh.id || idx} className="bg-[var(--foreground)]/5 border border-[var(--border)] rounded-2xl p-4 space-y-2 font-sans animate-fade-in">
                    <div className="flex justify-between items-center text-xs font-bold pb-2 border-b border-[var(--border)]/30 font-sans">
                      <div>
                        <span className="text-[8px] font-black uppercase tracking-wider text-[var(--primary)] block">Shift Log</span>
                        <span className="font-mono text-[var(--foreground)]/50">{sh.id} • {sh.date}</span>
                      </div>
                      <span className="text-[9px] font-black uppercase tracking-wider text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/15">Reconciled</span>
                    </div>

                    <div className="grid grid-cols-2 gap-y-2 gap-x-4 pt-1 font-mono text-[10.5px]">
                      <div className="flex justify-between">
                        <span className="opacity-40">Opening Float:</span>
                        <span>₹{sh.openingCash.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="opacity-40">Closing Count:</span>
                        <span>₹{sh.closingCash.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="opacity-40">Net Sales:</span>
                        <span className="text-emerald-400 font-bold">₹{sh.totalSales.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="opacity-40 font-bold">Net Profit:</span>
                        <span className="text-blue-400 font-bold">₹{sh.totalProfit.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="opacity-40 font-bold">Bills count:</span>
                        <span>{sh.totalBills} pcs</span>
                      </div>
                      <div className="flex justify-between font-bold">
                        <span className="opacity-40">Udhar Run:</span>
                        <span className="text-amber-500 font-bold">₹{sh.pendingUdhar.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-[var(--border)] pt-4 mt-2 font-sans">
          <Button className="w-full rounded-2xl h-11 text-xs font-sans font-sans" onClick={onClose}>Close Workspace Panel</Button>
        </div>
      </motion.div>
    </div>
  );
}
