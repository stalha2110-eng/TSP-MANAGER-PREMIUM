export type ThemeType = 
  | 'midnight_blue' 
  | 'neo_brutalist' 
  | 'glass_modern' 
  | 'luxury_gold' 
  | 'emerald_matrix'
  | 'retro-blue'
  | 'emerald-gold'
  | 'minimalist-ivory'
  | 'cyberpunk';

export type LanguageType = 'en' | 'hi' | 'mr' | 'hi-en';

export interface Translations {
  en: string;
  hi: string;
  mr: string;
  'hi-en': string;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  color?: string;
}

export interface Note {
  id: string;
  title: string;
  description: string;
  category: 'Stock' | 'Payment' | 'Customer' | 'Supplier' | 'Reminder' | 'General';
  priority: 'Urgent' | 'Important' | 'Completed' | 'Info';
  createdAt: string;
  dueDate: string | null;
  status: 'Active' | 'Completed';
  isPinned: boolean;
}

export interface Item {
  id: string;
  name: string;
  translations: Translations;
  categoryId: string;
  quantity: number;
  unit: string;
  buyingPrice: number;
  buyingPriceUnit: string;
  wholesalePrice: number;
  wholesalePriceUnit: string;
  retailPrice: number;
  retailPriceUnit: string;
  lastUpdated: string;
  priceChangedAt?: string;
  lastChangedBy?: string;
  notes?: string;
  aiAdvice?: string;
  minStockLevel?: number;
}

export interface WeightPreset {
  label: string;
  qty: number;
  shortLabel?: string;
}

export interface CustomApiKeyItem {
  id: string;
  name: string;
  key: string;
  createdAt: string;
  status?: 'active' | 'untested' | 'verified' | 'failed';
}

export interface AppSettings {
  theme: ThemeType;
  language: LanguageType;
  isLocked: boolean;
  pin: string | null;
  currency: string;
  autoLockDelay: number; // in seconds
  hideBuyingPriceByDefault: boolean;
  accentColor: 'indigo' | 'emerald' | 'rose' | 'amber' | 'cyan' | 'slate';
  fontSize: 'standard' | 'comfortable' | 'compact';
  pricePrecision: number;
  showStockAlerts: boolean;
  autoCloudSync: boolean;
  hasSeenOnboarding: boolean;
  dismissedNotifications: string[];
  deviceId: string;
  deviceName: string;
  minStockLevel?: number;
  storeName?: string;
  storeOwnerName?: string;
  storeAddress?: string;
  storePhone?: string;
  storeOpeningTime?: string;
  storeClosingTime?: string;
  reminderTimeBeforeMinutes?: number;
  notificationsOn?: boolean;
  pushOn?: boolean;
  soundOn?: boolean;
  vibrationOn?: boolean;
  lowStockNotify?: boolean;
  udharNotify?: boolean;
  dailySummaryNotify?: boolean;
  salesAlertNotify?: boolean;
  aiNotify?: boolean;
  dailySummaryTime?: string;
  customApiKeys?: CustomApiKeyItem[];
  activeApiKeyId?: string | null;
  customApiKey?: string;
  // --- Business Mode System ---
  businessMode?: 'kirana' | 'wholesale' | 'restaurant' | 'hotel' | 'mobile_shop' | 'hardware' | 'general';
  
  // Custom Workflow Features
  enabledFeatures?: {
    udhar?: boolean;
    inventory?: boolean;
    customer?: boolean;
    supplier?: boolean;
    analytics?: boolean;
    notifications?: boolean;
    printing?: boolean;
    cloudSync?: boolean;
  };

  // Custom Quick Actions (Up to 6)
  quickActions?: string[];

  // Custom Weight & Quantity Chips Presets (Customizable in Quick Actions tab in Biz Settings)
  customWeightPresets?: WeightPreset[];

  // Custom Dashboard Card Layout
  dashboardCards?: {
    id: string;
    title: string;
    visible: boolean;
    size: 'small' | 'medium' | 'large';
  }[];

  // Custom Biz Settings Hub Card Order (for drag & drop prioritization)
  bizHubCardsOrder?: string[];

  // Store Configuration
  businessName?: string;
  businessLogo?: string;
  businessCategory?: string;
  businessDescription?: string;

  // Custom Categories Mapping
  customCategories?: Category[];

  // --- Premium Sound & Feedback System Settings ---
  soundFeedbackMode?: 'silent' | 'vibrate_only' | 'vibrate_sound';
  soundStylePack?: 'classic_pos' | 'modern' | 'professional';
  
  soundBillingVolume?: number;
  soundPrintVolume?: number;
  soundNotificationVolume?: number;
  soundOverallVolume?: number;
  
  soundBillingEnabled?: boolean;
  soundProductAddedEnabled?: boolean;
  soundPrintEnabled?: boolean;
  soundNotificationEnabled?: boolean;
  
  vibrationStrength?: 'light' | 'medium' | 'strong';
  vibrationBillingEnabled?: boolean;
  vibrationProductAddedEnabled?: boolean;
  vibrationPrintEnabled?: boolean;
  vibrationNotificationEnabled?: boolean;
  
  smartBusinessFeedback?: boolean;
  
  quietHoursEnabled?: boolean;
  quietHoursStart?: string;
  quietHoursEnd?: string;
  quietHoursVibrateOnly?: boolean;

  // --- Journey & Business setup attributes ---
  gstNumber?: string;
  whatsAppNumber?: string;
  upiId?: string;
  storeLogo?: string;
  backupSettingsConfigured?: boolean;
  journeyTimeline?: any[];
  
  // --- Scheduled Cloud Backups Configuration ---
  scheduledBackupEnabled?: boolean;
  scheduledBackupTime?: string;
  scheduledBackupEmail?: string;
  scheduledBackupDestination?: 'email' | 'external_storage' | 'both';
  scheduledBackupRecurrence?: 'daily' | 'weekly';
  lastScheduledBackupTime?: string;
  lastScheduledBackupDate?: string;
  externalStorageProvider?: 'firestore_vault' | 'google_drive' | 'dropbox';

  // --- Advanced Dynamic Store Dashboard System Settings ---
  dashboardMode?: 'fixed' | 'dynamic' | 'hybrid';
  dashboardEnableDynamic?: boolean;
  dashboardPrioritizeAlerts?: boolean;
  dashboardPrioritizeInventory?: boolean;
  dashboardPrioritizeBilling?: boolean;
  dashboardPrioritizeUdhar?: boolean;
  dashboardPrioritizeSystem?: boolean;
  dashboardAutoHideEmptyCards?: boolean;
  dashboardAllowReordering?: boolean;
  dashboardAllowResizing?: boolean;
  dashboardShowRecentActivity?: boolean;
  dashboardShowBusinessHealth?: boolean;
  dashboardShowPrinterStatus?: boolean;
  dashboardShowCloudSync?: boolean;
  dashboardShowBackupStatus?: boolean;
  dashboardShowBusinessJourney?: boolean;
  dashboardShowGoalsProgress?: boolean;
  dashboardEnableAnimations?: boolean;
  dashboardSmoothCardMovement?: boolean;
  dashboardPriorityHighlightEffects?: boolean;
  dashboardCardsConfig?: {
    id: string;
    size: 'small' | 'medium' | 'large';
    pinned: boolean;
    hidden: boolean;
    customTitle?: string;
  }[];
  dashboardProfiles?: {
    name: string;
    mode: 'fixed' | 'dynamic' | 'hybrid';
    cardsConfig: {
      id: string;
      size: 'small' | 'medium' | 'large';
      pinned: boolean;
      hidden: boolean;
      customTitle?: string;
    }[];
  }[];
  activeDashboardProfile?: string;
  monthlySalesTarget?: number;
  // --- Advanced Language System Settings ---
  enableStrictLanguageMode?: boolean;
  allowMixedLanguage?: boolean;
  enableTranslationValidation?: boolean;
  enableInstantLanguageRefresh?: boolean;
  showLanguagePreview?: boolean;
  autoTranslateVoiceProducts?: boolean;
  // --- Custom Units Management ---
  customUnits?: string[];
}

export interface InAppNotification {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  category: 'inventory' | 'udhar' | 'analytics' | 'system' | 'broadcast';
  priority: 'high' | 'medium' | 'low';
  isRead: boolean;
  deepLink?: {
    screen: 'inventory' | 'udhar' | 'analytics' | 'billing' | 'settings';
    targetId?: string;
  };
}

export interface DeviceRegistration {
  id: string;
  fcmToken: string;
  deviceName: string;
  updatedAt: string;
}

export interface UdharCustomer {
  id: string;
  name: string;
  phone?: string;
  totalUdhar: number; // positive = customer owes us money
  lastUpdated: string;
}

export interface UdharTransaction {
  id: string;
  customerId: string;
  amount: number; // positive = udhar given, negative = repayment received
  type: 'given' | 'received'; // given: उधार दिया, received: वापस मिला
  note?: string;
  timestamp: string;
  dueDate?: string; // Optional due date for the payment
}

export interface UnbilledEntry {
  id: string;
  amount: number;
  category: string;
  timestamp: number;
  dateStr: string;
  cashier?: string;
  note?: string;
}

export interface AppState {
  items: Item[];
  notes: Note[];
  categories: Category[];
  settings: AppSettings;
  user: {
    uid: string;
    email: string | null;
  } | null;
  bills?: Bill[];
  udharCustomers?: UdharCustomer[];
  udharTransactions?: UdharTransaction[];
  unbilledEntries?: UnbilledEntry[];
}

export interface TransactionItem {
  itemId: string;
  name: string;
  quantity: number;
  price: number;
  cost: number;
  unit: string;
}

export interface Bill {
  id: string;
  billNumber: string;
  customerName: string;
  customerPhone?: string;
  items: TransactionItem[];
  discount: number; // percentage
  discountType?: 'percentage' | 'amount';
  tax: number; // percentage
  subtotal: number;
  total: number;
  paymentMethod: 'Cash' | 'UPI' | 'Credit';
  timestamp: string;
  dueDate?: string;
  deviceId?: string;
  deviceName?: string;
}

export interface HistoryEntry {
  type: 'state' | 'settings';
  stateSnapshot?: Partial<AppState>;
  prevSettings?: Partial<AppSettings>;
  actionName: string;
}

export interface DraftBill {
  id: string;
  name: string;
  cart: any[];
  customerName: string;
  customerPhone: string;
  discountPercent: number;
  discountType?: 'percentage' | 'amount';
  taxPercent: number;
  paymentMethod: 'Cash' | 'UPI' | 'Credit';
  billingMode: 'retail' | 'wholesale' | 'auto';
  udharDueDate: string;
  notes?: string;
  isPinned?: boolean;
  lastActiveAt?: number;
  restTimerStartedAt?: number;
  restServiceStatus?: 'ordered' | 'cooking' | 'served' | 'billing';
}

export interface BusinessGoal {
  dailySales: number;
  dailyProfit: number;
  dailyBills: number;
  weeklySales: number;
  weeklyProfit: number;
  weeklyBills: number;
  monthlySales: number;
  monthlyProfit: number;
  monthlyBills: number;
}

export interface BusinessShift {
  id: string;
  openTime: string;
  closeTime: string | null;
  openingCash: number;
  closingCash: number;
  totalSales: number;
  totalProfit: number;
  cashierName?: string;
  totalBills: number;
  totalPrints: number;
  pendingUdhar: number;
  topSellingItem: string;
  totalCustomersServed: number;
  isOpen: boolean;
  date: string;
}


