import { AppSettings, AppState } from '../types';
import { DEFAULT_CATEGORIES } from '../constants';
import { getDeviceId, getDeviceName } from '../utils/device';
import { getUnbilledEntries } from '../lib/unbilledStorage';

import { isItemDeleted } from '../utils/deletionTracker';

export const INITIAL_SETTINGS: AppSettings = {
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
  dashboardCardsVersion: 2,
  dashboardCards: [
    { id: 'inventory_value', title: 'Store Asset Valuation', visible: true, size: 'medium' },
    { id: 'sales', title: 'Daily Sales Revenue', visible: false, size: 'large' },
    { id: 'profit', title: 'Gross Profit Calculations', visible: false, size: 'medium' },
    { id: 'bills', title: 'Invoices & Bills Summary', visible: false, size: 'medium' },
    { id: 'low_stock', title: 'Low Stock Alerts', visible: false, size: 'medium' },
    { id: 'out_of_stock', title: 'Out of Stock Critical Alerts', visible: false, size: 'medium' },
    { id: 'pending_udhar', title: 'Udhar Outstanding', visible: false, size: 'medium' },
    { id: 'notifications', title: 'Store Notifications', visible: false, size: 'medium' },
    { id: 'business_health', title: 'Business Health Score', visible: false, size: 'medium' },
    { id: 'printer_status', title: 'Printer Status', visible: false, size: 'small' },
    { id: 'cloud_sync_status', title: 'Cloud Sync Status', visible: false, size: 'small' },
    { id: 'backup_status', title: 'Backup Status', visible: false, size: 'small' },
    { id: 'recent_activity', title: 'Recent Activity', visible: false, size: 'medium' },
    { id: 'business_journey', title: 'Store Journey', visible: false, size: 'large' }
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
    { id: 'inventory_value', size: 'medium', pinned: false, hidden: false },
    { id: 'sales', size: 'large', pinned: false, hidden: true },
    { id: 'profit', size: 'medium', pinned: false, hidden: true },
    { id: 'bills', size: 'medium', pinned: false, hidden: true },
    { id: 'low_stock', size: 'medium', pinned: false, hidden: true },
    { id: 'out_of_stock', size: 'medium', pinned: false, hidden: true },
    { id: 'pending_udhar', size: 'medium', pinned: false, hidden: true },
    { id: 'notifications', size: 'medium', pinned: false, hidden: true },
    { id: 'business_health', size: 'medium', pinned: false, hidden: true },
    { id: 'printer_status', size: 'small', pinned: false, hidden: true },
    { id: 'cloud_sync_status', size: 'small', pinned: false, hidden: true },
    { id: 'backup_status', size: 'small', pinned: false, hidden: true },
    { id: 'recent_activity', size: 'medium', pinned: false, hidden: true },
    { id: 'business_journey', size: 'large', pinned: false, hidden: true }
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

export function deduplicateById<T extends { id: string }>(arr: T[]): T[] {
  const seen = new Set<string>();
  return arr.filter(item => {
    if (!item || !item.id || seen.has(item.id)) {
      return false;
    }
    seen.add(item.id);
    return true;
  });
}

export const getInitialState = (): AppState => {
  const savedSettings = localStorage.getItem('price_manager_settings');
  const savedState = localStorage.getItem('price_manager_state');
  
  let settings = INITIAL_SETTINGS;
  if (savedSettings) {
    try {
      const parsedSettings = JSON.parse(savedSettings);
      if (parsedSettings) {
        settings = { ...INITIAL_SETTINGS, ...parsedSettings };
        if (!parsedSettings.dashboardCardsVersion || parsedSettings.dashboardCardsVersion < 2) {
          settings.dashboardCards = INITIAL_SETTINGS.dashboardCards;
          settings.dashboardCardsConfig = INITIAL_SETTINGS.dashboardCardsConfig;
          settings.dashboardCardsVersion = 2;
        }
      }
    } catch (e) {
      console.error("Failed to parse saved settings", e);
    }
  }

  // Restore & ensure unified printer settings persistence
  try {
    const savedPrinterConfig = localStorage.getItem('price_manager_printer_config');
    if (savedPrinterConfig) {
      const parsedPrinter = JSON.parse(savedPrinterConfig);
      if (parsedPrinter && typeof parsedPrinter === 'object') {
        settings.printerSettings = { ...(settings.printerSettings || {}), ...parsedPrinter };
      }
    } else if (settings.printerSettings) {
      localStorage.setItem('price_manager_printer_config', JSON.stringify(settings.printerSettings));
    }
  } catch (e) {
    console.warn("Failed to synchronize initial printer settings", e);
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
    items: deduplicateById(items.filter((item: any) => item && !isItemDeleted(item.id))),
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

export const INITIAL_STATE: AppState = getInitialState();

export interface Alert {
  id: string;
  type: 'note' | 'item' | 'batch';
  title: string;
  subtitle: string;
  priority: 'Urgent' | 'Important' | 'Info' | 'Completed';
  icon: React.ReactNode;
  category?: string;
  timestamp: string;
}
