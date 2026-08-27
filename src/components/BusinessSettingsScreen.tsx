import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Briefcase, 
  Check, 
  Grid, 
  Settings2, 
  Sliders, 
  HelpCircle, 
  Users, 
  NotebookPen, 
  Trash2, 
  Edit2, 
  Plus, 
  LayoutGrid, 
  Sparkles, 
  Play, 
  Coins, 
  TrendingUp, 
  Store, 
  BarChart3, 
  AlertCircle, 
  RefreshCw,
  ShoppingBasket,
  ChevronRight,
  Info,
  Trophy,
  ReceiptText,
  Package,
  CalendarDays,
  Download,
  Award,
  ChevronDown,
  ChevronUp,
  Star,
  Crown,
  Calendar,
  Medal,
  ArrowUpRight,
  Clock,
  Heart,
  PlusCircle,
  Save,
  FileText,
  Activity,
  Printer,
  Key,
  GripVertical,
  RotateCcw,
  ArrowLeft,
  ArrowRight,
  CheckCheck
} from 'lucide-react';
import { AppState, Category, AppSettings } from '../types';
import { CustomWeightChipsSettings } from './CustomWeightChipsSettings';
import BusinessKnowledgeHub from './BusinessKnowledgeHub';
import BusinessRecoveryCenter from './BusinessRecoveryCenter';
import { RecoveryService } from '../services/recoveryService';
import { BUSINESS_MODES, BUSINESS_MODES as modesMap, BusinessModeType, BusinessModeDef } from '../services/businessModeConfig';
import { cn, formatCurrency } from '../lib/utils';
import { getCalculatedAchievements, downloadCertificateOfMilestone, ensureIsoString } from '../lib/achievementUtils';
import { jsPDF } from 'jspdf';

const formatDateSafely = (dateVal: any, fallback = 'Verified'): string => {
  if (!dateVal) return fallback;
  try {
    const d = new Date(dateVal);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString();
    }
  } catch (err) {
    console.error("formatDateSafely error", err);
  }
  return fallback;
};

const getStatusBadge = (statusText: string) => {
  if (!statusText) return null;
  let bgColor = "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20";
  if (statusText.includes("Critical") || statusText.includes("Disabled") || statusText.includes("🔴")) {
    bgColor = "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/10";
  } else if (statusText.includes("Attention") || statusText.includes("Need") || statusText.includes("🟡")) {
    bgColor = "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/10";
  }
  
  const cleanText = statusText.replace(/[🟢🟡🔴❗⚠️]/g, '').trim();
  const emoji = statusText.match(/[🟢🟡🔴❗⚠️]/)?.[0] || '🟢';

  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider ${bgColor}`}>
      <span>{emoji}</span>
      <span>{cleanText}</span>
    </span>
  );
};

interface BusinessSettingsScreenProps {
  state: AppState;
  t: any;
  onUpdateSettings: (updates: Partial<AppSettings>) => void;
  onUpdateState: (updates: Partial<AppState>, actionLabel?: string) => void;
  activeSubTab?: 'overview' | 'journey' | 'profile' | 'features' | 'categories' | 'dashboard' | 'actions' | 'knowledge' | 'recovery';
  onChangeSubTab?: (tab: 'overview' | 'journey' | 'profile' | 'features' | 'categories' | 'dashboard' | 'actions' | 'knowledge' | 'recovery') => void;
}

export default function BusinessSettingsScreen({ 
  state, t, onUpdateSettings, onUpdateState,
  activeSubTab: externalActiveSubTab,
  onChangeSubTab
}: BusinessSettingsScreenProps) {
  const currentModeId = state.settings.businessMode || 'kirana';
  const currentMode = BUSINESS_MODES[currentModeId];

  // Local state for switching modal
  const [selectedModeForPreview, setSelectedModeForPreview] = useState<BusinessModeDef | null>(null);
  const [showSwitchModal, setShowSwitchModal] = useState(false);

  // Local state for Category Editor
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [newCatName, setNewCatName] = useState('');
  const [newCatIcon, setNewCatIcon] = useState('📦');
  const [newCatColor, setNewCatColor] = useState('#6b7280');
  const [showCatForm, setShowCatForm] = useState(false);

  // Active sub-section under Business Settings Drawer
  const [localActiveSubTab, setLocalActiveSubTab] = useState<'overview' | 'journey' | 'profile' | 'features' | 'categories' | 'dashboard' | 'actions' | 'knowledge' | 'recovery'>('overview');
  const activeSubTab = externalActiveSubTab || localActiveSubTab;
  const setActiveSubTab = onChangeSubTab || setLocalActiveSubTab;

  // Local search filter for Biz Settings Hub
  const [hubSearchQuery, setHubSearchQuery] = useState('');
  // Advanced tools toggle for collapsible power section
  const [isAdvancedToolsOpen, setIsAdvancedToolsOpen] = useState(false);

  // Drag-and-drop & Card Prioritization State
  const [isReorderingMode, setIsReorderingMode] = useState(false);
  const [draggedCardId, setDraggedCardId] = useState<string | null>(null);
  const [dragOverCardId, setDragOverCardId] = useState<string | null>(null);
  const touchTimerRef = React.useRef<any>(null);

  // Active journey view section under Journey Subtab
  const [activeJourneySection, setActiveJourneySection] = useState<'guidance' | 'profile_status' | 'roadmap' | 'ledger_anniversary'>('guidance');

  // Business Journey state fields
  const [expandedRoadmapStep, setExpandedRoadmapStep] = useState<string | null>('step_profile');
  const [showAddLogModal, setShowAddLogModal] = useState(false);
  const [customLogTitle, setCustomLogTitle] = useState('');
  const [customLogCategory, setCustomLogCategory] = useState('General');
  const [customLogDate, setCustomLogDate] = useState('2026-06-07');
  const [customLogDesc, setCustomLogDesc] = useState('');

  // Inline Quick Profile edit fields
  const [profileStoreName, setProfileStoreName] = useState(state.settings.storeName || '');
  const [profileOwnerName, setProfileOwnerName] = useState(state.settings.storeOwnerName || '');
  const [profilePhone, setProfilePhone] = useState(state.settings.storePhone || '');
  const [profileAddress, setProfileAddress] = useState(state.settings.storeAddress || '');
  const [profileGst, setProfileGst] = useState(state.settings.gstNumber || '');
  const [profileWhatsApp, setProfileWhatsApp] = useState(state.settings.whatsAppNumber || '');
  const [profileUpi, setProfileUpi] = useState(state.settings.upiId || '');
  const [profileLogoPreset, setProfileLogoPreset] = useState(state.settings.businessLogo || '🏪');
  const [configuringFactor, setConfiguringFactor] = useState<string | null>(null);

  // Anniversary date selector state
  const [storeOpeningDate, setStoreOpeningDate] = useState(state.settings.storeOpeningTime || '2026-05-26');

  // --- Calculations for Analytics Section ---
  const stats = useMemo(() => {
    const totalProducts = state.items.length;
    
    // Total bills
    const totalBills = state.bills ? state.bills.length : 0;
    
    // Total customers
    const totalCustomers = state.udharCustomers ? state.udharCustomers.length : 0;
    
    // Total sales
    const totalSales = state.bills ? state.bills.reduce((sum, b) => sum + (b.total || 0), 0) : 0;

    // Creation date (fallback to current date minus some arbitrary days or a stored key)
    const storeCreatedDate = state.settings.storeOpeningTime ? 'June 4, 2026' : 'June 7, 2026';
    const ageInDays = 3; // simulated/dynamic age

    return {
      totalProducts,
      totalCustomers,
      totalBills,
      totalSales,
      storeCreatedDate,
      ageInDays
    };
  }, [state.items, state.bills, state.udharCustomers, state.settings]);

  // Current list of categories
  const categoriesList = useMemo(() => {
    return state.settings.customCategories || state.categories || [];
  }, [state.settings.customCategories, state.categories]);

  // Handle addition of a new category
  const handleAddCategory = () => {
    if (!newCatName.trim()) return;
    
    const newCat: Category = {
      id: 'cat_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
      name: newCatName.trim(),
      icon: newCatIcon,
      color: newCatColor
    };

    const updated = [...categoriesList, newCat];
    onUpdateSettings({ customCategories: updated });
    
    // reset form
    setNewCatName('');
    setNewCatIcon('📦');
    setShowCatForm(false);
  };

  // Handle category update
  const handleSaveEditCategory = () => {
    if (!editingCategory || !newCatName.trim()) return;

    const updated = categoriesList.map(cat => 
      cat.id === editingCategory.id 
        ? { ...cat, name: newCatName.trim(), icon: newCatIcon, color: newCatColor } 
        : cat
    );

    onUpdateSettings({ customCategories: updated });
    setEditingCategory(null);
    setNewCatName('');
    setNewCatIcon('📦');
  };

  // Handle category deletion
  const handleDeleteCategory = async (id: string) => {
    const category = categoriesList.find(cat => cat.id === id);
    if (!category) return;

    // BUSINESS HEALTH WARNINGS: Find if products are linked
    const linkedCount = state.items.filter(item => item.categoryId === id).length;
    let warningMsg = `Delete the "${category.name}" category? Archive records will be saved inside the Recovery Center to reverse this if needed.`;
    if (linkedCount > 0) {
      warningMsg = `⚠️ WARNING: There are ${linkedCount} active products linked to "${category.name}". Deleting this category will detach them and de-classify them to 'General Stock'.\n\nAre you sure you want to proceed?`;
    }

    if (confirm(warningMsg)) {
      const updated = categoriesList.filter(cat => cat.id !== id);
      onUpdateSettings({ customCategories: updated });

      // Record to Business Recovery Center
      await RecoveryService.recordDeletion(
        state.user?.uid || null,
        'category',
        category,
        category.name,
        `Icon: ${category.icon || '📦'}, Linked Products: ${linkedCount}`,
        state.user?.email || 'Store Owner',
        30
      ).catch(e => console.error(e));
    }
  };

  // Handle Quick Action Selection toggling (up to 6)
  const handleToggleQuickAction = (actionId: string) => {
    const currentActions = state.settings.quickActions || ['create_bill', 'add_product', 'update_stock', 'print_invoice', 'open_analytics', 'open_udhar'];
    let updated: string[];

    if (currentActions.includes(actionId)) {
      updated = currentActions.filter(a => a !== actionId);
    } else {
      if (currentActions.length >= 6) {
        alert("Maximum 6 Quick Actions permitted!");
        return;
      }
      updated = [...currentActions, actionId];
    }
    onUpdateSettings({ quickActions: updated });
  };

  // Handle Feature Toggle updating
  const handleToggleFeature = (featureKey: string) => {
    const defaults = state.settings.enabledFeatures || {
      udhar: true,
      inventory: true,
      customer: true,
      supplier: true,
      analytics: true,
      notifications: true,
      printing: true,
      cloudSync: true
    };

    const updated = {
      ...defaults,
      [featureKey]: !((defaults as any)[featureKey])
    };

    onUpdateSettings({ enabledFeatures: updated });
  };

  // Handle Dashboard card toggling / resizing
  const handleToggleDashboardCard = (cardId: string) => {
    const defaultCards = state.settings.dashboardCards || [
      { id: 'sales', title: 'Daily Sales Revenue', visible: true, size: 'large' },
      { id: 'profit', title: 'Gross Profit Margins', visible: true, size: 'medium' },
      { id: 'low_stock', title: 'Low Stock Alerts', visible: true, size: 'medium' }
    ];

    const updated = defaultCards.map(c => 
      c.id === cardId ? { ...c, visible: !c.visible } : c
    );

    // If card doesn't exist in the list yet, insert it
    if (!updated.some(c => c.id === cardId)) {
      updated.push({ id: cardId, title: cardId.toUpperCase().replace('_', ' '), visible: true, size: 'medium' });
    }

    onUpdateSettings({ dashboardCards: updated });
  };

  // Handle resize of Dashboard cards
  const handleResizeDashboardCard = (cardId: string, size: 'small' | 'medium' | 'large') => {
    const defaultCards = state.settings.dashboardCards || [];
    const updated = defaultCards.map(c => 
      c.id === cardId ? { ...c, size } : c
    );
    onUpdateSettings({ dashboardCards: updated });
  };

  // --- Default Order & Reorder Handlers for the 8 Biz Hub Cards ---
  const DEFAULT_BIZ_HUB_ORDER = useMemo(() => [
    'journey', 'profile', 'features', 'categories', 'dashboard', 'actions', 'knowledge', 'recovery'
  ], []);

  const currentCardsOrder = useMemo(() => {
    const saved = state.settings.bizHubCardsOrder;
    if (!saved || !Array.isArray(saved) || saved.length === 0) {
      return DEFAULT_BIZ_HUB_ORDER;
    }
    const validSaved = saved.filter(id => DEFAULT_BIZ_HUB_ORDER.includes(id));
    const missing = DEFAULT_BIZ_HUB_ORDER.filter(id => !validSaved.includes(id));
    return [...validSaved, ...missing];
  }, [state.settings.bizHubCardsOrder, DEFAULT_BIZ_HUB_ORDER]);

  const handleMoveBizCard = (id: string, direction: 'prev' | 'next') => {
    const list = [...currentCardsOrder];
    const idx = list.indexOf(id);
    if (idx === -1) return;
    const targetIdx = direction === 'prev' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= list.length) return;
    const temp = list[idx];
    list[idx] = list[targetIdx];
    list[targetIdx] = temp;
    onUpdateSettings({ bizHubCardsOrder: list });
  };

  const handleBizCardDragStart = (e: React.DragEvent, id: string) => {
    setDraggedCardId(id);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', id);
  };

  const handleBizCardDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    if (dragOverCardId !== id) {
      setDragOverCardId(id);
    }
  };

  const handleBizCardDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    const sourceId = draggedCardId || e.dataTransfer.getData('text/plain');
    if (!sourceId || sourceId === targetId) {
      setDraggedCardId(null);
      setDragOverCardId(null);
      return;
    }
    const list = [...currentCardsOrder];
    const fromIdx = list.indexOf(sourceId);
    const toIdx = list.indexOf(targetId);
    if (fromIdx !== -1 && toIdx !== -1) {
      list.splice(fromIdx, 1);
      list.splice(toIdx, 0, sourceId);
      onUpdateSettings({ bizHubCardsOrder: list });
    }
    setDraggedCardId(null);
    setDragOverCardId(null);
  };

  const handleTouchStartCard = () => {
    touchTimerRef.current = setTimeout(() => {
      setIsReorderingMode(true);
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(50);
      }
    }, 450);
  };

  const handleTouchEndCard = () => {
    if (touchTimerRef.current) {
      clearTimeout(touchTimerRef.current);
      touchTimerRef.current = null;
    }
  };

  const handleResetCardsOrder = () => {
    onUpdateSettings({ bizHubCardsOrder: DEFAULT_BIZ_HUB_ORDER });
  };

  // Choose to switch a business mode
  const initiateModeSwitch = (mode: BusinessModeDef) => {
    setSelectedModeForPreview(mode);
    setShowSwitchModal(true);
  };

  // Apply Mode
  const applySelectedMode = (applyRecommended: boolean) => {
    if (!selectedModeForPreview) return;

    if (applyRecommended) {
      // 1. Suggested Category mapping
      // 2. Default Feature toggles
      // 3. Recommended Widgets
      // 4. Default Quick Actions
      onUpdateSettings({
        businessMode: selectedModeForPreview.id,
        customCategories: selectedModeForPreview.suggestedCategories,
        enabledFeatures: selectedModeForPreview.suggestedFeatures,
        dashboardCards: selectedModeForPreview.suggestedDashboardCards,
        quickActions: selectedModeForPreview.suggestedQuickActions,
        businessCategory: selectedModeForPreview.name,
        businessDescription: selectedModeForPreview.description
      });
      alert(`Successfully configured ${selectedModeForPreview.name} workflow + settings!`);
    } else {
      // Keep existing settings, only change the mode ID
      onUpdateSettings({
        businessMode: selectedModeForPreview.id,
        businessCategory: selectedModeForPreview.name
      });
      alert(`Applied ${selectedModeForPreview.name} Mode while retaining your custom layout and categories.`);
    }

    setShowSwitchModal(false);
    setSelectedModeForPreview(null);
  };

  const allAvailableQuickActions = [
    { id: 'create_bill', label: 'Create Bill', icon: '🧾' },
    { id: 'add_product', label: 'Add Product', icon: '📦' },
    { id: 'update_stock', label: 'Update Stock', icon: '🔄' },
    { id: 'print_invoice', label: 'Print Invoice', icon: '🖨️' },
    { id: 'open_analytics', label: 'Open Analytics', icon: '📊' },
    { id: 'open_udhar', label: 'Open Udhar Book', icon: '📕' }
  ];

  const allPossibleDashboardCards = [
    { id: 'sales', label: 'Daily Sales Revenue' },
    { id: 'profit', label: 'Gross Profit Calculations' },
    { id: 'low_stock', label: 'Low Stock warnings' },
    { id: 'large_transactions', label: 'Large/Bulk Transactions' },
    { id: 'bulk_inventory', label: 'Bulk Inventory valuation' },
    { id: 'customer_balances', label: 'Udhar Outstanding accounts' },
    { id: 'inventory_value', label: 'Store Asset valuation' }
  ];

  // --- JOURNEY CENTER CALCULATION LOGIC ---
  const readinessFactors = useMemo(() => {
    const s = state.settings;
    const items = state.items || [];
    const bills = state.bills || [];

    const fProfile = !!(s.storeName && s.storeOwnerName && s.storePhone && s.storeAddress);
    const fLogo = !!(s.businessLogo || s.storeLogo);
    const fCategories = categoriesList.length > 0;
    const fProducts = items.length > 0;
    const fStock = items.some(i => i.quantity > 0);
    const fFirstBill = bills.length > 0;
    const fPrinter = !!(s.enabledFeatures?.printing);
    const fCloudSync = !!(s.autoCloudSync || s.enabledFeatures?.cloudSync);
    const fBackup = !!(s.backupSettingsConfigured);
    const fNotifications = !!(s.notificationsOn || s.enabledFeatures?.notifications);
    const fBusinessInfo = !!(s.gstNumber || s.whatsAppNumber || s.upiId);
    const fInvoiceBranding = !!(s.fontSize || s.accentColor);

    return [
      { id: 'profile', label: 'Business Profile Completed', completed: fProfile, desc: 'Add store name, owner name, phone and physical address' },
      { id: 'logo', label: 'Store Logo Added', completed: fLogo, desc: 'Add an elegant default preset logo icon for invoice printouts' },
      { id: 'categories', label: 'Categories Created', completed: fCategories, desc: 'Add custom categories to sort catalogue selections' },
      { id: 'products', label: 'Products Added', completed: fProducts, desc: 'Add specific merchandise with custom prices to catalogue database' },
      { id: 'stock', label: 'Stock Added', completed: fStock, desc: 'Allocate positive quantity (>0) for product stocks' },
      { id: 'first_bill', label: 'First Bill Generated', completed: fFirstBill, desc: 'Complete first POS cash ledger invoice checkout ticket' },
      { id: 'printer', label: 'Printer Configured', completed: fPrinter, desc: 'Toggle custom thermal ticket printing capabilities' },
      { id: 'backup', label: 'Backup Enabled', completed: fBackup, desc: 'Toggle secure recovery configurations' },
      { id: 'cloud_sync', label: 'Cloud Sync Setup', completed: fCloudSync, desc: 'Auto-sync local changes real-time' },
      { id: 'notifications', label: 'Notification Setup', completed: fNotifications, desc: 'Allow alerts for system reminders and low stock alerts' },
      { id: 'business_info', label: 'Business Information Added', completed: fBusinessInfo, desc: 'Enter business identity details (GST, WhatsApp or UPI ID)' },
      { id: 'invoice_branding', label: 'Invoice Branding Configured', completed: fInvoiceBranding, desc: 'Customize layout themes, sizes or receipt tags' },
    ];
  }, [state.settings, state.items, state.bills, categoriesList]);

  const completedCount = useMemo(() => readinessFactors.filter(f => f.completed).length, [readinessFactors]);
  const readinessPercentage = useMemo(() => Math.round((completedCount / readinessFactors.length) * 100), [completedCount, readinessFactors]);

  const readinessTitle = useMemo(() => {
    if (readinessPercentage < 30) return "Beginner Setup";
    if (readinessPercentage < 70) return "Moderate Setup";
    if (readinessPercentage < 90) return "Advanced Setup";
    return "Excellent Setup";
  }, [readinessPercentage]);

  // Card Definition Mapping for Hub Buttons
  const BIZ_CARDS_MAP = useMemo(() => ({
    journey: {
      id: 'journey',
      title: 'Journey & Setup',
      emoji: '🌱',
      badge: `${readinessPercentage}% Ready`,
      subtab: 'journey' as const,
      hoverBorder: 'hover:border-purple-500/60',
      hoverBg: 'hover:bg-purple-500/[0.03]',
      iconBg: 'bg-purple-500/10',
      iconText: 'text-purple-500',
      badgeStyle: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
      searchTerms: 'journey setup checklist milestones readiness growth'
    },
    profile: {
      id: 'profile',
      title: 'Business Stats',
      emoji: '🏪',
      badge: currentMode.name,
      subtab: 'profile' as const,
      hoverBorder: 'hover:border-emerald-500/60',
      hoverBg: 'hover:bg-emerald-500/[0.03]',
      iconBg: 'bg-emerald-500/10',
      iconText: 'text-emerald-500',
      badgeStyle: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
      searchTerms: 'business stats profile store name phone upi qr address mode'
    },
    features: {
      id: 'features',
      title: 'Workflow Toggle',
      emoji: '⚙️',
      badge: 'Rules & Sync',
      subtab: 'features' as const,
      hoverBorder: 'hover:border-slate-500/60',
      hoverBg: 'hover:bg-slate-500/[0.03]',
      iconBg: 'bg-slate-500/10',
      iconText: 'text-slate-500',
      badgeStyle: 'bg-slate-500/10 text-slate-600 dark:text-slate-400',
      searchTerms: 'workflow toggle features switches rules thermal print udhar'
    },
    categories: {
      id: 'categories',
      title: 'Categories',
      emoji: '📦',
      badge: `${categoriesList.length} Active`,
      subtab: 'categories' as const,
      hoverBorder: 'hover:border-blue-500/60',
      hoverBg: 'hover:bg-blue-500/[0.03]',
      iconBg: 'bg-blue-500/10',
      iconText: 'text-blue-500',
      badgeStyle: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
      searchTerms: 'categories products items stock weights units packaging'
    },
    dashboard: {
      id: 'dashboard',
      title: 'Dashboard Cards',
      emoji: '📊',
      badge: 'Home Layout',
      subtab: 'dashboard' as const,
      hoverBorder: 'hover:border-cyan-500/60',
      hoverBg: 'hover:bg-cyan-500/[0.03]',
      iconBg: 'bg-cyan-500/10',
      iconText: 'text-cyan-500',
      badgeStyle: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400',
      searchTerms: 'dashboard cards home screen widgets charts summary'
    },
    actions: {
      id: 'actions',
      title: 'Quick Actions',
      emoji: '⚡',
      badge: `${state.settings.quickActions?.length || 6} Shortcuts`,
      subtab: 'actions' as const,
      hoverBorder: 'hover:border-amber-500/60',
      hoverBg: 'hover:bg-amber-500/[0.03]',
      iconBg: 'bg-amber-500/10',
      iconText: 'text-amber-500',
      badgeStyle: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
      searchTerms: 'quick actions shortcuts cashier buttons fast actions'
    },
    knowledge: {
      id: 'knowledge',
      title: 'Knowledge Hub',
      emoji: '🧠',
      badge: 'Video Guides',
      subtab: 'knowledge' as const,
      hoverBorder: 'hover:border-indigo-500/60',
      hoverBg: 'hover:bg-indigo-500/[0.03]',
      iconBg: 'bg-indigo-500/10',
      iconText: 'text-indigo-500',
      badgeStyle: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400',
      searchTerms: 'knowledge hub help guides faq tutorials video'
    },
    recovery: {
      id: 'recovery',
      title: 'Recovery Center',
      emoji: '🛡️',
      badge: 'Restore Data',
      subtab: 'recovery' as const,
      hoverBorder: 'hover:border-rose-500/60',
      hoverBg: 'hover:bg-rose-500/[0.03]',
      iconBg: 'bg-rose-500/10',
      iconText: 'text-rose-500',
      badgeStyle: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
      searchTerms: 'recovery center restore deleted trash undo backup'
    }
  }), [readinessPercentage, currentMode.name, categoriesList.length, state.settings.quickActions]);

  const roadmapSteps = useMemo(() => {
    return [
      {
        id: 'step_profile',
        label: 'STEP 1',
        title: 'Business Profile',
        factors: ['profile', 'logo', 'business_info'],
        emoji: '🏢',
        desc: 'Identity setup for invoice alignment'
      },
      {
        id: 'step_inventory',
        label: 'STEP 2',
        title: 'Inventory Setup',
        factors: ['categories', 'products', 'stock'],
        emoji: '📦',
        desc: 'Building catalogue items'
      },
      {
        id: 'step_billing',
        label: 'STEP 3',
        title: 'Billing Setup',
        factors: ['first_bill', 'invoice_branding'],
        emoji: '💰',
        desc: 'Transactions configuration block'
      },
      {
        id: 'step_printer',
        label: 'STEP 4',
        title: 'Printer Setup',
        factors: ['printer'],
        emoji: '🖨️',
        desc: 'Physical receipt dispatcher setup'
      },
      {
        id: 'step_backup',
        label: 'STEP 5',
        title: 'Backup Setup',
        factors: ['backup'],
        emoji: '💾',
        desc: 'Secure local snapshot'
      },
      {
        id: 'step_sync',
        label: 'STEP 6',
        title: 'Cloud Sync Setup',
        factors: ['cloud_sync', 'notifications'],
        emoji: '🔄',
        desc: 'Continuous real-time database link'
      },
    ];
  }, []);

  // First Time Business Checklist computation logic
  const onboardingChecklist = useMemo(() => {
    const s = state.settings;
    const items = state.items || [];
    const bills = state.bills || [];

    const tasks = [
      {
        id: 'chk_store_name',
        label: 'Add Store Name',
        completed: !!(s.storeName && s.storeName !== "TS Price Manager"),
        actionLabel: 'Set Name',
        desc: 'Customize the business name for invoice headers.',
        onAction: () => setConfiguringFactor('profile')
      },
      {
        id: 'chk_store_logo',
        label: 'Upload Store Logo',
        completed: !!(s.businessLogo || s.storeLogo),
        actionLabel: 'Select Emblem',
        desc: 'Choose an outstanding default logo badge preset.',
        onAction: () => setConfiguringFactor('logo')
      },
      {
        id: 'chk_create_category',
        label: 'Create First Category',
        completed: categoriesList.length > 0,
        actionLabel: 'Add Category',
        desc: 'Create category tags for faster list filters.',
        onAction: () => setActiveSubTab('categories')
      },
      {
        id: 'chk_add_product',
        label: 'Add First Product',
        completed: items.length > 0,
        actionLabel: 'Add Product',
        desc: 'Populate catalog list with actual selling merchandise.',
        onAction: () => setConfiguringFactor('products')
      },
      {
        id: 'chk_create_bill',
        label: 'Create First Bill',
        completed: bills.length > 0,
        actionLabel: 'Go POS Desk',
        desc: 'Generate first transaction receipt in checkout counter.',
        onAction: () => alert("Use the primary POS screen to complete a sale checkout.")
      },
      {
        id: 'chk_print',
        label: 'Configure Printer',
        completed: !!(s.enabledFeatures?.printing),
        actionLabel: 'Enable Printer',
        desc: 'Enable printing features for thermal invoice prints.',
        onAction: () => {
          const current = s.enabledFeatures || {};
          onUpdateSettings({ enabledFeatures: { ...current, printing: true } });
        }
      },
      {
        id: 'chk_notifications',
        label: 'Configure Notifications',
        completed: !!(s.notificationsOn || s.enabledFeatures?.notifications),
        actionLabel: 'On Alerts',
        desc: 'Enable alerts and chime beeps for stock thresholds.',
        onAction: () => {
          const current = s.enabledFeatures || {};
          onUpdateSettings({ notificationsOn: true, enabledFeatures: { ...current, notifications: true } });
        }
      },
      {
        id: 'chk_sync',
        label: 'Enable Cloud Sync',
        completed: !!(s.autoCloudSync || s.enabledFeatures?.cloudSync),
        actionLabel: 'Enable Sync',
        desc: 'Connect auto cloud synchronizer for secure remote sync.',
        onAction: () => {
          const current = s.enabledFeatures || {};
          onUpdateSettings({ autoCloudSync: true, enabledFeatures: { ...current, cloudSync: true } });
        }
      },
      {
        id: 'chk_backup',
        label: 'Configure Backup',
        completed: !!(s.backupSettingsConfigured),
        actionLabel: 'Set Safeguard',
        desc: 'Configure local storage recovery snapshot points.',
        onAction: () => {
          onUpdateSettings({ backupSettingsConfigured: true });
        }
      },
      {
        id: 'chk_invoice',
        label: 'Customize Invoice Branding',
        completed: !!(s.fontSize || s.accentColor),
        actionLabel: 'Set Accent',
        desc: 'Align receipt layout fonts and colors to corporate accent.',
        onAction: () => {
          onUpdateSettings({ fontSize: "standard", accentColor: "indigo" });
        }
      },
    ];

    const complTasks = tasks.filter(t => t.completed).length;
    const totalTasks = tasks.length;
    const percentage = Math.round((complTasks / totalTasks) * 100);

    return {
      tasks,
      completed: complTasks,
      total: totalTasks,
      percentage
    };
  }, [state.settings, state.items, state.bills, categoriesList, onUpdateSettings]);

  // Profile Completeness math
  const profileCompleteness = useMemo(() => {
    const s = state.settings;
    const factors = [
      { id: 'name', label: 'Store Name', completed: !!(s.storeName && s.storeName !== "TS Price Manager"), weight: 15, field: "profileStoreName" },
      { id: 'logo', label: 'Store Logo Preset', completed: !!(s.businessLogo || s.storeLogo), weight: 15, field: "profileLogoPreset" },
      { id: 'owner', label: 'Owner Name', completed: !!s.storeOwnerName, weight: 10, field: "profileOwnerName" },
      { id: 'gst', label: 'GST Number', completed: !!s.gstNumber, weight: 15, field: "profileGst" },
      { id: 'whatsapp', label: 'WhatsApp Contact', completed: !!s.whatsAppNumber, weight: 15, field: "profileWhatsApp" },
      { id: 'upi', label: 'UPI QR ID', completed: !!s.upiId, weight: 15, field: "profileUpi" },
      { id: 'address', label: 'Physical Address', completed: !!s.storeAddress, weight: 15, field: "profileAddress" }
    ];

    const completedWeight = factors.reduce((sum, f) => sum + (f.completed ? f.weight : 0), 0);
    const missing = factors.filter(f => !f.completed);

    return {
      percentage: completedWeight,
      missing,
      factors
    };
  }, [state.settings]);

  const anniversaryData = useMemo(() => {
    const rawStart = new Date(storeOpeningDate || '2026-05-26');
    const start = isNaN(rawStart.getTime()) ? new Date('2026-05-26') : rawStart;
    const end = new Date("2026-06-07T17:38:31Z");
    const diffMs = end.getTime() - start.getTime();
    const diffDays = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
    
    let years = end.getFullYear() - start.getFullYear();
    let months = end.getMonth() - start.getMonth();
    let days = end.getDate() - start.getDate();
    if (days < 0) {
      months--;
      days += new Date(end.getFullYear(), end.getMonth(), 0).getDate();
    }
    if (months < 0) {
      years--;
      months += 12;
    }

    const ageFormatted = diffDays === 0 ? "Created Today" :
      `${years > 0 ? `${years} Year${years > 1 ? 's' : ''} ` : ''}${months > 0 ? `${months} Month${months > 1 ? 's' : ''} ` : ''}${days > 0 ? `${days} Day${days > 1 ? 's' : ''}` : ''}`.trim() || "0 Days";

    const milestoneTriggers = [
      { id: 'ann_30', label: '30 Days Anniversary', target: 30, achieved: diffDays >= 30, desc: 'Established physical operation for 30 consecutive calendar days.' },
      { id: 'ann_100', label: '100 Days Anniversary', target: 100, achieved: diffDays >= 100, desc: 'Successfully navigated local merchant trade for 100 days.' },
      { id: 'ann_1yr', label: '1 Year Anniversary', target: 365, achieved: diffDays >= 365, desc: 'Inaugurated full commercial milestone cycle of 1 calendar year!' },
      { id: 'ann_2yr', label: '2 Years Anniversary', target: 730, achieved: diffDays >= 730, desc: 'Sustained retail operations excellence for 2 years.' },
      { id: 'ann_5yr', label: '5 Years Jubilee', target: 1825, achieved: diffDays >= 1825, desc: 'Registered veteran multi-year community legacy node of 5 years!' }
    ];

    return {
      diffDays,
      ageFormatted,
      milestoneTriggers
    };
  }, [storeOpeningDate]);

  // Handle additions for Custom Log Modals
  const handleAddCustomJourneyEvent = () => {
    if (!customLogTitle.trim()) return;
    const newEvent = {
      id: 'evt_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
      title: customLogTitle.trim(),
      category: customLogCategory,
      date: customLogDate || '2026-06-07',
      description: customLogDesc.trim()
    };
    const existing = state.settings.journeyTimeline || [];
    const updated = [...existing, newEvent];
    onUpdateSettings({ journeyTimeline: updated });

    setCustomLogTitle('');
    setCustomLogCategory('General');
    setCustomLogDesc('');
    setShowAddLogModal(false);
    alert("Manually logged event successfully added to your Business Journey!");
  };

  const handleDeleteCustomJourneyEvent = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("Remove this custom milestone logs permanently?")) {
      const existing = state.settings.journeyTimeline || [];
      const updated = existing.filter((evt: any) => evt.id !== id);
      onUpdateSettings({ journeyTimeline: updated });
    }
  };

  const handleSaveInlineProfileDetails = () => {
    onUpdateSettings({
      storeName: profileStoreName.trim() || "TS Price Manager",
      storeOwnerName: profileOwnerName.trim(),
      storePhone: profilePhone.trim(),
      storeAddress: profileAddress.trim(),
      gstNumber: profileGst.trim(),
      whatsAppNumber: profileWhatsApp.trim(),
      upiId: profileUpi.trim(),
      businessLogo: profileLogoPreset,
      hasSeenOnboarding: true
    });
    alert("Business profile details updated successfully!");
  };

  // Modern health diagnostic calculator
  const healthCheckResults = useMemo(() => {
    const s = state.settings;
    const items = state.items || [];
    
    // Printer
    const printerHealthy = s.enabledFeatures?.printing && (s.storeName || s.upiId);
    const printerDiag = !s.enabledFeatures?.printing ? "🔴 Critical (Feature Disabled)" : 
      printerHealthy ? "🟢 Healthy" : "🟡 Attention Needed (Empty UPI/Address info)";

    // Cloud Sync
    const syncHealthy = s.enabledFeatures?.cloudSync || s.autoCloudSync;
    const syncDiag = syncHealthy ? "🟢 Healthy (Active Real-time Link)" : "🔴 Critical (Inactive / Offline Sandbox)";

    // Backup
    const backupHealthy = !!s.backupSettingsConfigured;
    const backupDiag = backupHealthy ? "🟢 Healthy" : "🟡 Attention Needed (Configure snap storage)";

    // Notifications
    const notifyHealthy = s.enabledFeatures?.notifications;
    const notifyDiag = notifyHealthy ? "🟢 Healthy" : "🔴 Critical (Alert system disabled)";

    // Inventory levels
    const lowStockItems = items.filter(i => i.quantity <= (i.minStockLevel || 10));
    const invHealthy = items.length === 0 ? "🟢 Healthy" : lowStockItems.length === 0 ? "🟢 Healthy" : "🟡 Attention Needed (Restock products)";

    // Account Status
    const accountDiag = state.user
      ? `🟢 Healthy (Registered Account - ${state.user.email || 'Cloud Mode'})`
      : "🟡 Attention Needed (Guest Profile / Local Sandbox)";

    return {
      printer: printerDiag,
      sync: syncDiag,
      backup: backupDiag,
      notifications: notifyDiag,
      inventory: invHealthy,
      account: accountDiag,
      lowStockCount: lowStockItems.length
    };
  }, [state.settings, state.items, state.user]);

  // Setup advice recommendations
  const dynamicRecommendations = useMemo(() => {
    const recs = [];
    const s = state.settings;
    if (!s.storeName || !s.storeOwnerName) {
      recs.push({ title: "🏢 Complete Store Profile", body: "Fill store owner and contact info to represent beautiful formal checkout invoices." });
    }
    if (!s.businessLogo) {
      recs.push({ title: "🎨 Add Custom Identity Brand", body: "Set a dedicated logo metaphor to identify print receipts." });
    }
    if (categoriesList.length === 0) {
      recs.push({ title: "🗂 Create Product category mappings", body: "Set at least 1 custom category for smoother product categorization filter paths." });
    }
    if (state.items.length === 0) {
      recs.push({ title: "📦 Onboard Catalog Merchandise", body: "Onboard your items catalog with proper retail/wholesale pricing levels." });
    }
    if (!s.enabledFeatures?.printing) {
      recs.push({ title: "🖨 Configure Thermal Receipt printer", body: "Toggle printing feature on and set standard receipt sizes." });
    }
    if (!s.backupSettingsConfigured) {
      recs.push({ title: "💾 Secure local snap backups", body: "Enable device sync backups to prevent loss during sandbox reload." });
    }
    return recs.slice(0, 3); // top 3 priorities
  }, [state.settings, state.items, categoriesList]);

  // Current Month June 2026 sales summary calculator
  const june2026Summary = useMemo(() => {
    const bList = state.bills || [];
    const juneBills = bList.filter(b => {
      const ts = ensureIsoString(b.timestamp);
      return ts && ts.startsWith('2026-06');
    });

    const revenue = juneBills.reduce((sum, b) => sum + (b.total || 0), 0);
    const profit = juneBills.reduce((sum, b) => {
      let costVal = 0;
      b.items?.forEach(it => { costVal += (it.cost || 0) * it.quantity; });
      return sum + Math.max(0, b.total - costVal);
    }, 0);

    const productsAddedCount = state.items.filter(i => {
      const ts = ensureIsoString(i.lastUpdated);
      return ts && ts.startsWith('2026-06');
    }).length;

    const customersAddedCount = (state.udharCustomers || []).filter(c => {
      const ts = ensureIsoString(c.lastUpdated);
      return ts && ts.startsWith('2026-06');
    }).length;

    const milestones = getCalculatedAchievements(state).milestones.filter(m => {
      const ts = ensureIsoString(m.unlockedAt);
      return m.isUnlocked && ts && ts.startsWith('2026-06');
    }).length;

    return {
      billsCount: juneBills.length,
      revenue,
      profit,
      productsAddedCount,
      customersAddedCount,
      milestones
    };
  }, [state.bills, state.items, state.udharCustomers]);

  const exportBusinessJourneyPDF = () => {
    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const primaryColor = [79, 70, 229]; // Indigo
      const textColor = [31, 41, 55]; // Charcoal

      // Header Block
      doc.setFillColor(243, 244, 246);
      doc.rect(0, 0, 210, 40, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(22);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text((state.settings.storeName || "TS PRICE MANAGER").toUpperCase(), 15, 18);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(107, 114, 128);
      doc.text("COMPLETE ENTERPRISE OPERATION & SETUP ROADMAP STRATEGY ANALYSIS", 15, 24);
      doc.text(`Generated Date: June 7, 2026 | Active METAPHOR Workflow: ${currentMode.name}`, 15, 29);

      doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.rect(0, 39, 210, 1.2, 'F');

      // SECTION 1
      let currentY = 52;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(textColor[0], textColor[1], textColor[2]);
      doc.text("1. EXECUTIVE DISPATCH SUMMARY", 15, currentY);
      
      doc.setDrawColor(229, 231, 235);
      doc.setLineWidth(0.4);
      doc.line(15, currentY + 2, 195, currentY + 2);

      currentY += 10;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(textColor[0], textColor[1], textColor[2]);
      doc.text(`Store Name: ${state.settings.storeName || "Not Configured"}`, 15, currentY);
      doc.text(`Proprietor/Owner: ${state.settings.storeOwnerName || "Not Configured"}`, 110, currentY);

      currentY += 6;
      doc.text(`Phone/Contact: ${state.settings.storePhone || "Not Configured"}`, 15, currentY);
      doc.text(`Store Address: ${state.settings.storeAddress || "Not Configured"}`, 110, currentY);

      currentY += 6;
      doc.text(`Business Metaphor Mode: ${currentMode.name} Setup`, 15, currentY);
      doc.text(`Active Readiness Score: ${readinessPercentage}% Setup Readiness`, 110, currentY);

      // SECTION 2
      currentY += 12;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.text("2. SETUP READINESS FACTORS REPORT", 15, currentY);
      doc.line(15, currentY + 2, 195, currentY + 2);

      currentY += 10;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(75, 85, 99);
      doc.text(`Your client-side Business Readiness score is calculated at ${readinessPercentage}%. Here is the operational factor breakdown:`, 15, currentY);

      currentY += 5;
      readinessFactors.forEach((factor) => {
        if (currentY > 270) {
          doc.addPage();
          currentY = 20;
        }
        currentY += 6;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9.5);
        doc.setTextColor(factor.completed ? 16 : 239, factor.completed ? 185 : 68, factor.completed ? 129 : 68);
        const statusIcon = factor.completed ? "[v] Completed" : "[x] Pending";
        doc.text(`${statusIcon} - ${factor.label}`, 15, currentY);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(107, 114, 128);
        doc.text(`: ${factor.desc}`, 90, currentY);
      });

      // SECTION 3
      currentY += 15;
      if (currentY > 250) {
        doc.addPage();
        currentY = 20;
      }
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(textColor[0], textColor[1], textColor[2]);
      doc.text("3. STORE GROWTH OPERATIONAL TIMELINE", 15, currentY);
      doc.line(15, currentY + 2, 195, currentY + 2);

      currentY += 8;
      const achievements = getCalculatedAchievements(state);
      
      const dynamicTimeline = achievements.timeline.filter(t => t.isUnlocked);
      dynamicTimeline.forEach(node => {
        if (currentY > 270) {
          doc.addPage();
          currentY = 20;
        }
        currentY += 6;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9.5);
        doc.setTextColor(textColor[0], textColor[1], textColor[2]);
        doc.text(`* ${node.title}`, 15, currentY);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(107, 114, 128);
        const dt = formatDateSafely(node.unlockedAt, '');
        doc.text(`"${node.description}" - Achieved: ${dt || 'Verified'}`, 65, currentY);
      });

      const customTimeline = state.settings.journeyTimeline || [];
      if (customTimeline.length > 0) {
        currentY += 8;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.text("Manually Logged Milestones:", 15, currentY);

        customTimeline.forEach((evt: any) => {
          if (currentY > 270) {
            doc.addPage();
            currentY = 20;
          }
          currentY += 6;
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(9.5);
          doc.setTextColor(textColor[0], textColor[1], textColor[2]);
          doc.text(`[${evt.category || 'General'}] ${evt.title}`, 15, currentY);
          
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(9);
          doc.setTextColor(107, 114, 128);
          doc.text(`Date: ${evt.date} - ${evt.description || ''}`, 80, currentY);
        });
      }

      // SECTION 4
      currentY += 15;
      if (currentY > 250) {
        doc.addPage();
        currentY = 20;
      }
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(textColor[0], textColor[1], textColor[2]);
      doc.text("4. UNLOCKED OPERATIONAL BENCHMARKS", 15, currentY);
      doc.line(15, currentY + 2, 195, currentY + 2);

      currentY += 8;
      const unlockedMilestones = achievements.milestones.filter(m => m.isUnlocked);
      if (unlockedMilestones.length === 0) {
        currentY += 6;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9.5);
        doc.setTextColor(110, 110, 110);
        doc.text("No milestone targets unlocked yet. Run transactions to begin log record.", 15, currentY);
      } else {
        unlockedMilestones.forEach(m => {
          if (currentY > 270) {
            doc.addPage();
            currentY = 20;
          }
          currentY += 6;
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(9.5);
          doc.setTextColor(16, 185, 129); // Emerald
          doc.text(`[v] ${m.title}`, 15, currentY);
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(9);
          doc.setTextColor(107, 114, 128);
          doc.text(`: ${m.description} (Target: ${m.target})`, 80, currentY);
        });
      }

      const fileSafeStoreName = (state.settings.storeName || "TS_Shop").replace(/\s+/g, '_');
      doc.save(`Business_Journey_Report_${fileSafeStoreName}.pdf`);
      alert("Successfully downloaded business journey report PDF!");
    } catch (e) {
      console.error("PDF Generate Error", e);
      alert("Failed to export Business Journey PDF.");
    }
  };

  return (
    <div className="space-y-6 pb-24 max-w-2xl mx-auto text-[var(--foreground)]">
      {/* 🧭 Top Navigation: Sub-Screen Header or Overview Bar */}
      {activeSubTab !== 'overview' ? (
        <div className="space-y-3">
          {/* Back to Hub Header */}
          <div className="flex items-center justify-between gap-3 bg-[var(--card)] p-3 rounded-2xl border border-[var(--border)] shadow-xs">
            <button
              onClick={() => setActiveSubTab('overview')}
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[var(--foreground)]/5 hover:bg-[var(--foreground)]/10 text-xs font-black uppercase tracking-wider text-[var(--foreground)] transition-all cursor-pointer"
            >
              <span>←</span>
              <span>Back to Biz Hub</span>
            </button>

            <div className="text-right">
              <span className="text-[10px] font-black uppercase tracking-wider text-[var(--primary)] block">
                {activeSubTab === 'categories' && '📦 Products & Categories'}
                {activeSubTab === 'profile' && '🏪 Store Details & Stats'}
                {activeSubTab === 'actions' && '⚡ Cashier Shortcuts'}
                {activeSubTab === 'dashboard' && '📊 Home Screen Cards'}
                {activeSubTab === 'journey' && '🌱 Setup Checklist & Growth'}
                {activeSubTab === 'knowledge' && '📖 Help & How-To Guides'}
                {activeSubTab === 'recovery' && '🛡️ Restore Deleted Data'}
                {activeSubTab === 'features' && '⚙️ Advanced Feature Switches'}
              </span>
              <span className="text-xs font-bold text-[var(--foreground)]/60">
                {state.settings.storeName || 'My Store'}
              </span>
            </div>
          </div>

          {/* Quick Sub-Tab Selector Pills */}
          <div className="flex bg-[var(--background)] p-1 rounded-2xl gap-1 overflow-x-auto scrollbar-none border border-[var(--border)]">
            <button
              onClick={() => setActiveSubTab('categories')}
              className={cn(
                "py-1.5 px-3 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer whitespace-nowrap",
                activeSubTab === 'categories' ? "bg-[var(--primary)] text-white shadow-xs" : "opacity-60 hover:opacity-100"
              )}
            >
              📦 Categories
            </button>
            <button
              onClick={() => setActiveSubTab('profile')}
              className={cn(
                "py-1.5 px-3 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer whitespace-nowrap",
                activeSubTab === 'profile' ? "bg-[var(--primary)] text-white shadow-xs" : "opacity-60 hover:opacity-100"
              )}
            >
              🏪 Profile
            </button>
            <button
              onClick={() => setActiveSubTab('actions')}
              className={cn(
                "py-1.5 px-3 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer whitespace-nowrap",
                activeSubTab === 'actions' ? "bg-[var(--primary)] text-white shadow-xs" : "opacity-60 hover:opacity-100"
              )}
            >
              ⚡ Shortcuts
            </button>
            <button
              onClick={() => setActiveSubTab('dashboard')}
              className={cn(
                "py-1.5 px-3 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer whitespace-nowrap",
                activeSubTab === 'dashboard' ? "bg-[var(--primary)] text-white shadow-xs" : "opacity-60 hover:opacity-100"
              )}
            >
              📊 Home Cards
            </button>
            <button
              onClick={() => setActiveSubTab('journey')}
              className={cn(
                "py-1.5 px-3 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer whitespace-nowrap",
                activeSubTab === 'journey' ? "bg-[var(--primary)] text-white shadow-xs" : "opacity-60 hover:opacity-100"
              )}
            >
              🌱 Setup
            </button>
            <button
              onClick={() => setActiveSubTab('knowledge')}
              className={cn(
                "py-1.5 px-3 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer whitespace-nowrap",
                activeSubTab === 'knowledge' ? "bg-[var(--primary)] text-white shadow-xs" : "opacity-60 hover:opacity-100"
              )}
            >
              📖 Help
            </button>
            <button
              onClick={() => setActiveSubTab('recovery')}
              className={cn(
                "py-1.5 px-3 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer whitespace-nowrap",
                activeSubTab === 'recovery' ? "bg-[var(--primary)] text-white shadow-xs" : "opacity-60 hover:opacity-100"
              )}
            >
              🛡️ Recovery
            </button>
            <button
              onClick={() => setActiveSubTab('features')}
              className={cn(
                "py-1.5 px-3 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer whitespace-nowrap",
                activeSubTab === 'features' ? "bg-[var(--primary)] text-white shadow-xs" : "opacity-60 hover:opacity-100"
              )}
            >
              ⚙️ Toggles
            </button>
          </div>
        </div>
      ) : null}

      {/* ==================== OVERVIEW HUB (Shopkeeper-Friendly Hybrid View) ==================== */}
      {activeSubTab === 'overview' && (
        <div className="space-y-6">
          {/* 🏪 Store Overview & Health Banner */}
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-[2rem] p-5 sm:p-6 space-y-4 shadow-sm relative overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-13 h-13 rounded-2xl bg-[var(--primary)]/10 border border-[var(--primary)]/20 flex items-center justify-center text-2xl shadow-xs shrink-0">
                  {profileLogoPreset || '🏪'}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-lg sm:text-xl font-black text-[var(--foreground)] tracking-tight">
                      {state.settings.storeName || "My Store"}
                    </h2>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-[var(--primary)]/10 text-[var(--primary)] border border-[var(--primary)]/20">
                      {currentMode.emoji} {currentMode.name}
                    </span>
                  </div>
                  <p className="text-xs text-[var(--foreground)]/60 font-semibold mt-0.5">
                    {state.settings.storeOwnerName ? `Owner: ${state.settings.storeOwnerName}` : "Store Proprietor"} • {state.settings.storePhone || "No Phone Configured"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto">
                <button
                  onClick={() => setActiveSubTab('profile')}
                  className="px-3.5 py-2 rounded-xl bg-[var(--primary)] text-white text-xs font-black uppercase tracking-wider hover:opacity-90 transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  Edit Profile
                </button>
                <button
                  onClick={() => setActiveSubTab('journey')}
                  className="px-3 py-2 rounded-xl bg-[var(--foreground)]/5 hover:bg-[var(--foreground)]/10 text-[var(--foreground)] text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Trophy className="w-3.5 h-3.5 text-amber-500" />
                  {readinessPercentage}% Setup
                </button>
              </div>
            </div>

            {/* Quick Readiness Progress Bar */}
            <div className="pt-2 border-t border-[var(--border)]/60 space-y-1.5">
              <div className="flex justify-between items-center text-[11px] font-bold text-[var(--foreground)]/70">
                <span className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                  {completedCount} of {readinessFactors.length} Store Setup Items Completed
                </span>
                <span className="text-[var(--primary)] font-black">{readinessTitle}</span>
              </div>
              <div className="w-full bg-[var(--foreground)]/[0.08] h-2 rounded-full overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-amber-500 to-emerald-500 h-full rounded-full transition-all duration-500" 
                  style={{ width: `${readinessPercentage}%` }}
                />
              </div>
            </div>
          </div>

          {/* 🔍 Search & Reorder Action Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            <div className="relative flex-1">
              <input
                type="text"
                value={hubSearchQuery}
                onChange={(e) => setHubSearchQuery(e.target.value)}
                placeholder="Search store settings (e.g. categories, shortcuts, UPI QR, backup, printer)..."
                className="w-full bg-[var(--card)] border border-[var(--border)] rounded-2xl px-4 py-3 pl-11 text-xs font-semibold text-[var(--foreground)] placeholder:text-[var(--foreground)]/40 focus:outline-none focus:border-[var(--primary)] shadow-xs transition-all"
              />
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--foreground)]/40 text-sm">🔍</span>
              {hubSearchQuery && (
                <button
                  onClick={() => setHubSearchQuery('')}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-[var(--foreground)]/40 hover:text-[var(--foreground)] cursor-pointer"
                >
                  ✕
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => setIsReorderingMode(!isReorderingMode)}
                className={cn(
                  "px-3.5 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 shadow-xs",
                  isReorderingMode 
                    ? "bg-amber-500 text-white shadow-md animate-pulse" 
                    : "bg-[var(--card)] border border-[var(--border)] text-[var(--foreground)]/70 hover:text-[var(--foreground)] hover:border-[var(--primary)]/40"
                )}
                title="Hold or toggle to prioritize buttons"
              >
                {isReorderingMode ? <CheckCheck className="w-3.5 h-3.5" /> : <GripVertical className="w-3.5 h-3.5 text-amber-500" />}
                <span>{isReorderingMode ? "Done Moving" : "Reorder"}</span>
              </button>

              {JSON.stringify(currentCardsOrder) !== JSON.stringify(DEFAULT_BIZ_HUB_ORDER) && (
                <button
                  onClick={handleResetCardsOrder}
                  className="px-3 py-2.5 rounded-2xl bg-[var(--card)] border border-[var(--border)] text-[var(--foreground)]/60 hover:text-[var(--foreground)] text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1"
                  title="Reset to default layout order"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Reset</span>
                </button>
              )}
            </div>
          </div>

          {/* Reordering Active Banner */}
          {isReorderingMode && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-3 flex items-center justify-between gap-3 text-amber-600 dark:text-amber-400 text-xs font-bold">
              <div className="flex items-center gap-2">
                <span className="text-base">🖐️</span>
                <span>Drag cards or tap the arrows (◀ ▶) on each card to prioritize your shop buttons.</span>
              </div>
              <button
                onClick={() => setIsReorderingMode(false)}
                className="px-2.5 py-1 rounded-xl bg-amber-500 text-white text-[10px] font-black uppercase tracking-wider hover:opacity-90 shrink-0 cursor-pointer"
              >
                Done
              </button>
            </div>
          )}

          {/* 🎯 8 Large Action Buttons (3 per line, draggable & reorderable) */}
          <div className="grid grid-cols-3 gap-3 sm:gap-4">
            {currentCardsOrder.map((cardId, index) => {
              const card = (BIZ_CARDS_MAP as any)[cardId];
              if (!card) return null;

              // Filter check
              if (hubSearchQuery && !card.searchTerms.includes(hubSearchQuery.toLowerCase()) && !card.title.toLowerCase().includes(hubSearchQuery.toLowerCase())) {
                return null;
              }

              const isBeingDragged = draggedCardId === cardId;
              const isDragTarget = dragOverCardId === cardId;

              return (
                <div
                  key={card.id}
                  draggable={true}
                  onDragStart={(e) => handleBizCardDragStart(e, card.id)}
                  onDragOver={(e) => handleBizCardDragOver(e, card.id)}
                  onDrop={(e) => handleBizCardDrop(e, card.id)}
                  onDragEnd={() => {
                    setDraggedCardId(null);
                    setDragOverCardId(null);
                  }}
                  onTouchStart={handleTouchStartCard}
                  onTouchEnd={handleTouchEndCard}
                  onClick={() => {
                    if (!isReorderingMode) {
                      setActiveSubTab(card.subtab);
                    }
                  }}
                  className={cn(
                    "group relative flex flex-col items-center justify-between p-3 sm:p-4.5 rounded-2xl sm:rounded-[1.75rem] bg-[var(--card)] border-2 transition-all select-none min-h-[135px] sm:min-h-[165px] text-center",
                    isBeingDragged ? "opacity-40 scale-95 border-dashed border-amber-500 shadow-lg" : "",
                    isDragTarget ? "border-amber-500 bg-amber-500/10 scale-102" : "border-[var(--border)]",
                    isReorderingMode ? "border-amber-500/40 ring-2 ring-amber-500/20 cursor-grab active:cursor-grabbing" : `${card.hoverBorder} ${card.hoverBg} active:scale-95 cursor-pointer shadow-xs hover:shadow-md`
                  )}
                >
                  {/* Reorder Handle Indicator */}
                  {isReorderingMode && (
                    <div className="w-full flex items-center justify-end pointer-events-none mb-0.5">
                      <span className="text-xs text-amber-500 font-bold">
                        ⠿
                      </span>
                    </div>
                  )}

                  {/* Icon & Title */}
                  <div className="flex flex-col items-center my-auto">
                    <div className={cn(
                      "w-11 h-11 sm:w-13 sm:h-13 rounded-2xl flex items-center justify-center text-2xl sm:text-3xl mb-1.5 group-hover:scale-110 transition-transform shadow-xs",
                      card.iconBg,
                      card.iconText
                    )}>
                      {card.emoji}
                    </div>
                    <h3 className="text-xs sm:text-sm font-black text-[var(--foreground)] tracking-tight leading-snug">
                      {card.title}
                    </h3>
                  </div>

                  {/* Bottom: Badge in normal mode, or Left/Right shift arrows in Reorder mode */}
                  <div className="w-full pt-1">
                    {isReorderingMode ? (
                      <div 
                        className="flex items-center justify-center gap-1.5 mt-1" 
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          disabled={index === 0}
                          onClick={() => handleMoveBizCard(card.id, 'prev')}
                          className="w-7 h-7 rounded-lg bg-[var(--foreground)]/10 hover:bg-amber-500 hover:text-white disabled:opacity-20 flex items-center justify-center text-xs font-black transition-colors cursor-pointer"
                          title="Move earlier"
                        >
                          ◀
                        </button>
                        <button
                          disabled={index === currentCardsOrder.length - 1}
                          onClick={() => handleMoveBizCard(card.id, 'next')}
                          className="w-7 h-7 rounded-lg bg-[var(--foreground)]/10 hover:bg-amber-500 hover:text-white disabled:opacity-20 flex items-center justify-center text-xs font-black transition-colors cursor-pointer"
                          title="Move later"
                        >
                          ▶
                        </button>
                      </div>
                    ) : (
                      <span className={cn(
                        "inline-block px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-wider truncate max-w-full",
                        card.badgeStyle
                      )}>
                        {card.badge}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* 🛠️ Collapsible Advanced Workflow & Health Tools */}
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-[2rem] overflow-hidden shadow-xs">
            <button
              onClick={() => setIsAdvancedToolsOpen(!isAdvancedToolsOpen)}
              className="w-full p-5 flex items-center justify-between text-left hover:bg-[var(--foreground)]/[0.02] transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[var(--foreground)]/5 flex items-center justify-center text-base">
                  ⚙️
                </div>
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-[var(--foreground)]">
                    Advanced Store Diagnostics & Workflow Tools
                  </h4>
                  <p className="text-[11px] text-[var(--foreground)]/50 font-semibold mt-0.5">
                    Cloud sync, printer health, feature switches & store audit export
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-lg bg-[var(--foreground)]/5 text-[var(--foreground)]/60">
                  {isAdvancedToolsOpen ? "Hide" : "Expand"}
                </span>
                {isAdvancedToolsOpen ? <ChevronUp className="w-4 h-4 text-[var(--foreground)]/60" /> : <ChevronDown className="w-4 h-4 text-[var(--foreground)]/60" />}
              </div>
            </button>

            <AnimatePresence>
              {isAdvancedToolsOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25, ease: "easeInOut" }}
                  className="overflow-hidden border-t border-[var(--border)] bg-[var(--background)]/40 p-5 space-y-5"
                >
                  {/* System Health Diagnostic Status Grid */}
                  <div className="space-y-2">
                    <span className="text-[10px] font-black uppercase tracking-wider text-[var(--primary)] block">
                      Live System Health Status
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div className="bg-[var(--card)] p-3 rounded-xl border border-[var(--border)] flex items-center justify-between">
                        <span className="text-xs font-bold text-[var(--foreground)]/70">Receipt Printing</span>
                        {getStatusBadge(healthCheckResults.printer)}
                      </div>
                      <div className="bg-[var(--card)] p-3 rounded-xl border border-[var(--border)] flex items-center justify-between">
                        <span className="text-xs font-bold text-[var(--foreground)]/70">Real-Time Cloud Sync</span>
                        {getStatusBadge(healthCheckResults.sync)}
                      </div>
                      <div className="bg-[var(--card)] p-3 rounded-xl border border-[var(--border)] flex items-center justify-between">
                        <span className="text-xs font-bold text-[var(--foreground)]/70">Data Backup Vault</span>
                        {getStatusBadge(healthCheckResults.backup)}
                      </div>
                      <div className="bg-[var(--card)] p-3 rounded-xl border border-[var(--border)] flex items-center justify-between">
                        <span className="text-xs font-bold text-[var(--foreground)]/70">Stock Restock Alert</span>
                        {getStatusBadge(healthCheckResults.inventory)}
                      </div>
                    </div>
                  </div>

                  {/* Actions inside Advanced Section */}
                  <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[var(--border)]/60">
                    <button
                      onClick={() => setActiveSubTab('features')}
                      className="px-3.5 py-2 rounded-xl bg-[var(--primary)] text-white text-xs font-black uppercase tracking-wider hover:opacity-90 transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <Sliders className="w-3.5 h-3.5" />
                      Configure Workflow Toggles
                    </button>
                    <button
                      onClick={exportBusinessJourneyPDF}
                      className="px-3.5 py-2 rounded-xl bg-[var(--foreground)]/5 hover:bg-[var(--foreground)]/10 text-[var(--foreground)] text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Export Store Setup PDF
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* ==================== SUBTAB: BUSINESS JOURNEY & SETUP CENTER ==================== */}
      {activeSubTab === 'journey' && (
        <div className="space-y-6">
          {/* 🏆 Section 1: Dashboard Overview Card */}
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-[2rem] p-6 space-y-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <span className="text-[9px] font-black uppercase text-[var(--primary)] tracking-[0.2em] block">Setup Progress</span>
                <h3 className="text-2xl font-black uppercase tracking-tight text-[var(--foreground)] mt-1 flex items-center gap-2">
                  <Trophy className="w-6 h-6 text-amber-500" />
                  {readinessTitle}
                </h3>
              </div>
              <button
                onClick={exportBusinessJourneyPDF}
                className="flex items-center gap-2 text-xs font-black uppercase tracking-wider py-2.5 px-4 rounded-xl bg-[var(--primary)] text-white hover:opacity-90 shadow-md transition-all self-start sm:self-auto cursor-pointer"
              >
                <Download className="w-4 h-4" />
                Export Journal PDF
              </button>
            </div>

            {/* Circular/Linear progress representation */}
            <div className="space-y-2">
              <div className="flex justify-between items-end">
                <span className="text-xs font-bold text-[var(--foreground)]/60">
                  {completedCount} of {readinessFactors.length} Criteria Met ({readinessPercentage}%)
                </span>
                <span className="text-2xl font-black text-[var(--foreground)]">{readinessPercentage}%</span>
              </div>
              <div className="w-full bg-[var(--foreground)]/[0.08] h-4 rounded-full overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-amber-500 to-emerald-500 h-full rounded-full transition-all duration-500" 
                  style={{ width: `${readinessPercentage}%` }}
                />
              </div>
            </div>
          </div>

          {/* 🧭 Professional Navigation Section Buttons */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-[var(--card)] border border-[var(--border)] p-2.5 rounded-[2rem] shadow-sm mb-6">
            {[
              { id: 'guidance', label: 'Setup Guidance', emoji: '📋' },
              { id: 'profile_status', label: 'Business Profile Status', emoji: '🏢' },
              { id: 'roadmap', label: 'Strategic Roadmap', emoji: '🗺️' },
              { id: 'ledger_anniversary', label: 'Ledger & Achievements', emoji: '🏆' },
            ].map((sect) => (
              <button
                key={sect.id}
                onClick={() => {
                  setActiveJourneySection(sect.id as any);
                  setConfiguringFactor(null);
                }}
                className={cn(
                  "flex flex-col items-center justify-center p-4 rounded-2xl border text-center transition-all duration-150 cursor-pointer",
                  activeJourneySection === sect.id
                    ? "bg-[var(--primary)] text-white border-[var(--primary)] shadow-lg shadow-[var(--primary)]/15 scale-[1.01]"
                    : "bg-transparent border-transparent text-[var(--foreground)] hover:bg-[var(--foreground)]/5"
                )}
              >
                <span className="text-xl mb-1">{sect.emoji}</span>
                <span className="text-[10px] font-black uppercase tracking-wider">{sect.label}</span>
              </button>
            ))}
          </div>

          {activeJourneySection === 'guidance' && (
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-[2rem] p-6 space-y-4 shadow-sm">
            <div>
              <span className="text-[9px] font-black uppercase text-[var(--primary)] tracking-[0.2em] block">Setup Guidance</span>
              <h3 className="text-lg font-black uppercase tracking-tight text-[var(--foreground)]">First Time Business Checklist</h3>
            </div>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center bg-[var(--foreground)]/[0.02] p-3.5 rounded-2xl border border-[var(--border)]">
                <div>
                  <span className="text-xs font-black uppercase text-[var(--foreground)]">Business Setup Progress</span>
                  <div className="text-[10px] text-[var(--foreground)]/60 font-semibold mt-0.5">
                    {onboardingChecklist.completed} of {onboardingChecklist.total} Tasks Completed ({onboardingChecklist.percentage}%)
                  </div>
                </div>
                <span className="text-base font-black px-2.5 py-1 bg-emerald-500/10 text-emerald-500 rounded-xl border border-emerald-500/15">
                  {onboardingChecklist.percentage}%
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-1">
                {onboardingChecklist.tasks.map((task) => (
                  <div 
                    key={task.id} 
                    className={cn(
                      "p-3 rounded-2xl border transition-all flex flex-col justify-between gap-3.5",
                      task.completed 
                        ? "border-emerald-500/20 bg-emerald-500/[0.02] opacity-85" 
                        : "border-[var(--border)] bg-transparent hover:border-[var(--primary)]/30"
                    )}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          "w-4 h-4 rounded-full flex items-center justify-center border text-[9px] font-bold shrink-0",
                          task.completed ? "bg-emerald-500 border-emerald-500 text-white font-black" : "border-[var(--foreground)]/30 text-transparent"
                        )}>
                          ✓
                        </span>
                        <span className={cn(
                          "text-xs font-black uppercase tracking-wide",
                          task.completed ? "text-emerald-500" : "text-[var(--foreground)]"
                        )}>
                          {task.label}
                        </span>
                      </div>
                      <p className="text-[10.5px] text-[var(--foreground)]/60 font-semibold leading-relaxed pl-6">{task.desc}</p>
                    </div>

                    {!task.completed && (
                      <div className="pl-6 pt-1">
                        <button
                          onClick={task.onAction}
                          className="py-1 px-3.5 text-[9px] font-black uppercase tracking-wider bg-[var(--primary)]/10 hover:bg-[var(--primary)] text-[var(--primary)] hover:text-white rounded-lg transition-all cursor-pointer"
                        >
                          {task.actionLabel}
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
          )}

          {activeJourneySection === 'profile_status' && (
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-[2rem] p-6 space-y-4 shadow-sm">
            <div className="flex justify-between items-start gap-4">
              <div>
                <span className="text-[9px] font-black uppercase text-[var(--primary)] tracking-[0.2em] block">Business Profile Status</span>
                <h3 className="text-lg font-black uppercase tracking-tight text-[var(--foreground)]">Profile Completeness Score</h3>
              </div>
              <span className="text-xl font-black text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 px-3.5 py-1 rounded-2xl">
                {profileCompleteness.percentage}%
              </span>
            </div>

            <div className="w-full bg-[var(--foreground)]/[0.08] h-3 rounded-full overflow-hidden">
              <div 
                className="bg-emerald-500 h-full rounded-full transition-all duration-500" 
                style={{ width: `${profileCompleteness.percentage}%` }}
              />
            </div>

            {profileCompleteness.missing.length > 0 ? (
              <div className="p-4 bg-amber-500/5 border border-amber-500/15 rounded-2xl space-y-3.5">
                <span className="text-[10px] font-black uppercase text-amber-600 block">Missing Profile Attributes Target:</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] font-semibold text-[var(--foreground)]/80 pl-1">
                  {profileCompleteness.missing.map((item) => (
                    <div key={item.id} className="flex items-center gap-1.5 uppercase tracking-wide">
                      <span className="text-rose-500 text-xs">•</span>
                      <span>{item.label}</span>
                    </div>
                  ))}
                </div>

                <div className="border-t border-amber-500/10 pt-3.5 space-y-3">
                  <span className="text-[9px] font-black uppercase text-[var(--foreground)]/60 block">Quick Config Inline Form:</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    <div>
                      <label className="text-[8.5px] font-black uppercase text-[var(--foreground)]/60 block mb-1">Business Name</label>
                      <input 
                        type="text" 
                        value={profileStoreName} 
                        onChange={e => setProfileStoreName(e.target.value)}
                        placeholder="Store Name"
                        className="w-full bg-[var(--card)] border border-[var(--border)] rounded-md py-1 px-2 text-[11px] font-bold text-foreground"
                      />
                    </div>
                    <div>
                      <label className="text-[8.5px] font-black uppercase text-[var(--foreground)]/60 block mb-1">Owner Name</label>
                      <input 
                        type="text" 
                        value={profileOwnerName} 
                        onChange={e => setProfileOwnerName(e.target.value)}
                        placeholder="Proprietor Name"
                        className="w-full bg-[var(--card)] border border-[var(--border)] rounded-md py-1 px-2 text-[11px] font-bold text-foreground"
                      />
                    </div>
                    <div>
                      <label className="text-[8.5px] font-black uppercase text-[var(--foreground)]/60 block mb-1">GST/VAT ID</label>
                      <input 
                        type="text" 
                        value={profileGst} 
                        onChange={e => setProfileGst(e.target.value)}
                        placeholder="GST Identification No."
                        className="w-full bg-[var(--card)] border border-[var(--border)] rounded-md py-1 px-2 text-[11px] font-bold text-foreground"
                      />
                    </div>
                    <div>
                      <label className="text-[8.5px] font-black uppercase text-[var(--foreground)]/60 block mb-1">WhatsApp</label>
                      <input 
                        type="text" 
                        value={profileWhatsApp} 
                        onChange={e => setProfileWhatsApp(e.target.value)}
                        placeholder="WhatsApp Number"
                        className="w-full bg-[var(--card)] border border-[var(--border)] rounded-md py-1 px-2 text-[11px] font-bold text-foreground"
                      />
                    </div>
                    <div>
                      <label className="text-[8.5px] font-black uppercase text-[var(--foreground)]/60 block mb-1">UPI ID</label>
                      <input 
                        type="text" 
                        value={profileUpi} 
                        onChange={e => setProfileUpi(e.target.value)}
                        placeholder="paying-address@upi"
                        className="w-full bg-[var(--card)] border border-[var(--border)] rounded-md py-1 px-2 text-[11px] font-bold text-foreground"
                      />
                    </div>
                    <div>
                      <label className="text-[8.5px] font-black uppercase text-[var(--foreground)]/60 block mb-1">Street Address</label>
                      <input 
                        type="text" 
                        value={profileAddress} 
                        onChange={e => setProfileAddress(e.target.value)}
                        placeholder="Store address street lanes"
                        className="w-full bg-[var(--card)] border border-[var(--border)] rounded-md py-1 px-2 text-[11px] font-bold text-foreground"
                      />
                    </div>
                  </div>

                  <button 
                    onClick={handleSaveInlineProfileDetails}
                    className="py-1 px-3 text-[9px] font-black uppercase tracking-wider bg-[var(--primary)] text-white hover:opacity-95 transition-all rounded-md cursor-pointer text-center"
                  >
                    ✓ Save Attributes Inline
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-emerald-500/5 border border-emerald-500/15 rounded-2xl flex items-center gap-2 text-xs font-bold text-emerald-600">
                <span>✓ Beautiful! Your corporate business identity profile attributes are 100% configured for printing.</span>
              </div>
            )}
          </div>
          )}

          {/* 📊 Section 2: Setup Recommendations */}
          {activeJourneySection === 'guidance' && dynamicRecommendations.length > 0 && (
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-[2rem] p-6 space-y-4 shadow-sm">
              <span className="text-[9px] font-black uppercase text-amber-500 tracking-[0.2em] block">Setup Recommendation Center</span>
              <div className="space-y-3">
                {dynamicRecommendations.map((rec, idx) => (
                  <div key={idx} className="p-4 bg-amber-500/5 hover:bg-amber-500/10 border border-amber-500/20 rounded-xl transition-all flex items-start gap-3">
                    <span className="text-lg mt-0.5">💡</span>
                    <div className="space-y-1">
                      <h4 className="text-xs font-bold text-amber-800 dark:text-amber-300">{rec.title}</h4>
                      <p className="text-[11px] text-[var(--foreground)]/60 font-semibold leading-relaxed">{rec.body}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 🗺️ Section 3: Setup Roadmap & Accordion Steps */}
          {activeJourneySection === 'roadmap' && (
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-[2rem] p-6 space-y-4 shadow-sm">
            <div className="flex justify-between items-center">
              <div>
                <span className="text-[9px] font-black uppercase text-[var(--primary)] tracking-[0.2em] block">Strategic Roadmap</span>
                <h3 className="text-lg font-black uppercase tracking-tight text-[var(--foreground)]">Progress Timeline</h3>
              </div>
              <span className="text-[11px] bg-[var(--foreground)]/[0.05] font-bold py-1 px-2.5 rounded-lg text-[var(--foreground)]/70">
                Level-based
              </span>
            </div>

            <p className="text-xs text-[var(--foreground)]/60 leading-relaxed font-semibold">
              Unlock the continuous capabilities step-by-step. Expand a stage to inspect details and complete quick pending actions below:
            </p>

            <div className="space-y-3 pt-2">
              {roadmapSteps.map((step) => {
                // Determine step status
                const relevantFactors = readinessFactors.filter(f => step.factors.includes(f.id));
                const compCount = relevantFactors.filter(f => f.completed).length;
                const totalComp = relevantFactors.length;
                
                const stepStatus = compCount === totalComp ? 'completed' : compCount > 0 ? 'inline' : 'pending';
                const isExpanded = expandedRoadmapStep === step.id;

                return (
                  <motion.div 
                    layout="position"
                    key={step.id} 
                    className={cn(
                      "border rounded-2xl overflow-hidden transition-all duration-300",
                      isExpanded ? "border-[var(--primary)] bg-[var(--primary)]/5" : "border-[var(--border)] bg-transparent"
                    )}
                  >
                    {/* Header bar of step */}
                    <div 
                      onClick={() => setExpandedRoadmapStep(isExpanded ? null : step.id)}
                      className="p-4 flex items-center justify-between cursor-pointer hover:bg-foreground/5 transition-all select-none"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-xl">{step.emoji}</span>
                        <div>
                          <span className="text-[9px] font-black text-primary uppercase tracking-widest">{step.label}</span>
                          <h4 className="text-sm font-black text-foreground uppercase tracking-tight">{step.title}</h4>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        {stepStatus === 'completed' ? (
                          <span className="text-[10px] uppercase font-black bg-emerald-500/15 text-emerald-500 px-2.5 py-1 rounded-full border border-emerald-500/20">
                            Completed
                          </span>
                        ) : stepStatus === 'inline' ? (
                          <span className="text-[10px] uppercase font-black bg-amber-500/15 text-amber-500 px-2.5 py-1 rounded-full border border-amber-500/20">
                            In Progress ({compCount}/{totalComp})
                          </span>
                        ) : (
                          <span className="text-[10px] uppercase font-black bg-zinc-500/10 text-zinc-400 px-2.5 py-1 rounded-full border border-zinc-500/10">
                            Pending
                          </span>
                        )}
                        {isExpanded ? <ChevronUp className="w-4 h-4 opacity-50 text-foreground" /> : <ChevronDown className="w-4 h-4 opacity-50 text-foreground" />}
                      </div>
                    </div>

                    {/* Expandable tasks list with quick fixes! */}
                    <AnimatePresence initial={false}>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.25, ease: "easeInOut" }}
                          className="overflow-hidden border-t border-border bg-[var(--card)]"
                        >
                          <div className="p-4 space-y-4">
                            <p className="text-xs text-foreground/60 font-semibold leading-relaxed">
                              {step.desc}
                            </p>

                            <div className="space-y-3">
                              {relevantFactors.map((factor) => {
                                const isConfiguringThis = configuringFactor === factor.id;
                                return (
                                  <div 
                                    key={factor.id} 
                                    className={cn(
                                      "p-4 border rounded-2xl transition-all duration-250",
                                      factor.completed 
                                        ? "bg-foreground/[0.02] border-border/40" 
                                        : isConfiguringThis 
                                          ? "bg-[var(--primary)]/5 border-[var(--primary)] shadow-sm" 
                                          : "bg-background border-border hover:border-[var(--primary)]/20"
                                    )}
                                  >
                                    <div className="flex items-start justify-between gap-4">
                                      <div className="flex items-start gap-3">
                                        <div className="mt-0.5">
                                          {factor.completed ? (
                                            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-xs text-white shadow-sm">✓</span>
                                          ) : (
                                            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-500/10 border border-amber-500/30 text-[10px] text-amber-500 font-bold">!</span>
                                          )}
                                        </div>
                                        <div className="space-y-0.5">
                                          <h5 className="text-xs font-black text-foreground uppercase tracking-tight">{factor.label}</h5>
                                          <p className="text-[10.5px] text-foreground/50 leading-relaxed font-semibold">{factor.desc}</p>
                                        </div>
                                      </div>

                                      <div className="flex items-center gap-2 shrink-0">
                                        <span className={cn(
                                          "text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md",
                                          factor.completed ? "bg-emerald-500/15 text-emerald-500" : "bg-amber-500/15 text-amber-500"
                                        )}>
                                          {factor.completed ? "Ready" : "Missing"}
                                        </span>

                                        {!factor.completed && (
                                          <button
                                            onClick={() => setConfiguringFactor(isConfiguringThis ? null : factor.id)}
                                            className="flex items-center gap-1 py-1 px-3 bg-[var(--primary)] text-white text-[10px] font-black uppercase tracking-wider rounded-lg hover:opacity-90 hover:scale-[1.02] transition-all cursor-pointer shadow-sm"
                                          >
                                            <Sliders className="w-3 h-3" />
                                            {isConfiguringThis ? "Hide" : "Configure Now"}
                                          </button>
                                        )}
                                      </div>
                                    </div>

                                    {/* --- QUICK ACTIONS TRIGGER COMPONENT AREA for individual step missing factors --- */}
                                    <AnimatePresence initial={false}>
                                      {!factor.completed && isConfiguringThis && (
                                        <motion.div
                                          initial={{ height: 0, opacity: 0 }}
                                          animate={{ height: "auto", opacity: 1 }}
                                          exit={{ height: 0, opacity: 0 }}
                                          transition={{ duration: 0.2 }}
                                          className="overflow-hidden mt-3 pt-3 border-t border-border/50 space-y-3"
                                        >
                                          {/* Factor: Profile setup fields */}
                                          {factor.id === "profile" && (
                                            <div className="space-y-3">
                                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                <div>
                                                  <label className="text-[9px] font-black uppercase text-foreground/60 block mb-1">Store Name</label>
                                                  <input 
                                                    type="text" 
                                                    value={profileStoreName} 
                                                    onChange={e => setProfileStoreName(e.target.value)}
                                                    placeholder="A-1 Store"
                                                    className="w-full bg-[var(--card)] border border-[var(--border)] rounded-lg py-1 px-2.5 text-xs font-semibold focus:outline-none focus:border-[var(--primary)] text-foreground"
                                                  />
                                                </div>
                                                <div>
                                                  <label className="text-[9px] font-black uppercase text-foreground/60 block mb-1">Owner / Proprietor Name</label>
                                                  <input 
                                                    type="text" 
                                                    value={profileOwnerName} 
                                                    onChange={e => setProfileOwnerName(e.target.value)}
                                                    placeholder="John Doe"
                                                    className="w-full bg-[var(--card)] border border-[var(--border)] rounded-lg py-1 px-2.5 text-xs font-semibold focus:outline-none focus:border-[var(--primary)] text-foreground"
                                                  />
                                                </div>
                                                <div>
                                                  <label className="font-semibold text-[9px] font-black uppercase text-foreground/60 block mb-1">Phone Number</label>
                                                  <input 
                                                    type="text" 
                                                    value={profilePhone} 
                                                    onChange={e => setProfilePhone(e.target.value)}
                                                    placeholder="9876543210"
                                                    className="w-full bg-[var(--card)] border border-[var(--border)] rounded-lg py-1 px-2.5 text-xs font-semibold focus:outline-none focus:border-[var(--primary)] text-foreground"
                                                  />
                                                </div>
                                                <div>
                                                  <label className="text-[9px] font-black uppercase text-foreground/60 block mb-1">Store Street Address</label>
                                                  <input 
                                                    type="text" 
                                                    value={profileAddress} 
                                                    onChange={e => setProfileAddress(e.target.value)}
                                                    placeholder="Market Lane, Sector 4"
                                                    className="w-full bg-[var(--card)] border border-[var(--border)] rounded-lg py-1 px-2.5 text-xs font-semibold focus:outline-none focus:border-[var(--primary)] text-foreground"
                                                  />
                                                </div>
                                              </div>
                                              <button 
                                                onClick={handleSaveInlineProfileDetails}
                                                className="py-1 px-3 text-[10px] font-black uppercase tracking-wider bg-[var(--primary)] text-white rounded-lg hover:opacity-90 transition-all cursor-pointer"
                                              >
                                                Save Profile Setup
                                              </button>
                                            </div>
                                          )}

                                          {/* Factor: Logo selection presets */}
                                          {factor.id === "logo" && (
                                            <div className="space-y-2">
                                              <label className="text-[9px] font-black uppercase text-foreground/60 block">Choose Store Emblem Preset Badge</label>
                                              <div className="flex flex-wrap gap-2">
                                                {["🏪", "🛒", "💊", "☕", "👕", "🌾", "🛠️"].map(emoji => (
                                                  <button
                                                    key={emoji}
                                                    onClick={() => {
                                                      setProfileLogoPreset(emoji);
                                                      onUpdateSettings({ businessLogo: emoji });
                                                    }}
                                                    className={cn(
                                                      "h-8 w-10 flex items-center justify-center rounded-lg border text-base cursor-pointer",
                                                      profileLogoPreset === emoji ? "border-[var(--primary)] bg-[var(--primary)]/10 text-foreground" : "border-[var(--border)] hover:bg-foreground/5 text-foreground"
                                                    )}
                                                  >
                                                    {emoji}
                                                  </button>
                                                ))}
                                              </div>
                                            </div>
                                          )}

                                          {/* Factor: Additional business ids (GST / WhatsApp / UPI) */}
                                          {factor.id === "business_info" && (
                                            <div className="space-y-3">
                                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                                <div>
                                                  <label className="text-[9px] font-black uppercase text-foreground/60 block mb-0.5">UPI ID (QR Payment)</label>
                                                  <input 
                                                    type="text" 
                                                    value={profileUpi} 
                                                    onChange={e => setProfileUpi(e.target.value)}
                                                    placeholder="store@upi"
                                                    className="w-full bg-[var(--card)] border border-[var(--border)] rounded-lg py-1 px-2 text-xs font-semibold focus:outline-none focus:border-[var(--primary)] text-foreground"
                                                  />
                                                </div>
                                                <div>
                                                  <label className="text-[9px] font-black uppercase text-foreground/60 block mb-0.5">GST Identification No.</label>
                                                  <input 
                                                    type="text" 
                                                    value={profileGst} 
                                                    onChange={e => setProfileGst(e.target.value)}
                                                    placeholder="29AAAAA1111A1Z1"
                                                    className="w-full bg-[var(--card)] border border-[var(--border)] rounded-lg py-1 px-2 text-xs font-semibold focus:outline-none focus:border-[var(--primary)] text-foreground"
                                                  />
                                                </div>
                                                <div>
                                                  <label className="text-[9px] font-black uppercase text-foreground/60 block mb-0.5">WhatsApp Number</label>
                                                  <input 
                                                    type="text" 
                                                    value={profileWhatsApp} 
                                                    onChange={e => setProfileWhatsApp(e.target.value)}
                                                    placeholder="+919876543210"
                                                    className="w-full bg-[var(--card)] border border-[var(--border)] rounded-lg py-1 px-2 text-xs font-semibold focus:outline-none focus:border-[var(--primary)] text-foreground"
                                                  />
                                                </div>
                                              </div>
                                              <button 
                                                onClick={handleSaveInlineProfileDetails}
                                                className="py-1 px-3 text-[10px] font-black uppercase tracking-wider bg-[var(--primary)] text-white rounded-lg hover:opacity-90 transition-all cursor-pointer"
                                              >
                                                Save Information Setup
                                              </button>
                                            </div>
                                          )}

                                          {/* Factor: Categories bootstrapping */}
                                          {factor.id === "categories" && (
                                            <button 
                                              onClick={() => {
                                                const bootstrap = [
                                                  { id: "cat_groceries", name: "Groceries", icon: "🛒", color: "#10b981" },
                                                  { id: "cat_beverages", name: "Beverages", icon: "🥤", color: "#3b82f6" },
                                                  { id: "cat_snacks", name: "Snacks & Sweets", icon: "🍬", color: "#f59e0b" },
                                                  { id: "cat_appliances", name: "Home Appliances", icon: "🔌", color: "#ec4899" }
                                                ];
                                                onUpdateSettings({ customCategories: bootstrap });
                                              }}
                                              className="py-1.5 px-3 text-[10px] font-black uppercase tracking-wider bg-[var(--primary)] text-white rounded-lg hover:opacity-90 transition-all cursor-pointer"
                                            >
                                              ✓ Auto-Generate Initial Categories
                                            </button>
                                          )}

                                          {/* Factors: Shortcut links to other screens */}
                                          {["products", "stock"].includes(factor.id) && (
                                            <p className="text-[10px] text-foreground/60 font-bold italic leading-none">
                                              Shortcut: Navigate back to the "Products Catalogue" tab screen layouts to record stock entries.
                                            </p>
                                          )}

                                          {factor.id === "first_bill" && (
                                            <p className="text-[10px] text-foreground/60 font-bold italic leading-none">
                                              Shortcut: Head over to POS Billing screen at top to dispatch your first client transaction receipt!
                                            </p>
                                          )}

                                          {/* Factor: Printing support toggle custom setting info */}
                                          {factor.id === "printer" && (
                                            <button 
                                              onClick={() => {
                                                const current = state.settings.enabledFeatures || {};
                                                onUpdateSettings({
                                                  enabledFeatures: { ...current, printing: true }
                                                });
                                              }}
                                              className="py-1.5 px-3 text-[10px] font-black uppercase tracking-wider bg-[var(--primary)] text-white rounded-lg hover:opacity-90 transition-all cursor-pointer"
                                            >
                                              Enable Ticket Output Printing
                                            </button>
                                          )}

                                          {/* Factor: Device Backup sync flag */}
                                          {factor.id === "backup" && (
                                            <button 
                                              onClick={() => {
                                                onUpdateSettings({ backupSettingsConfigured: true });
                                              }}
                                              className="py-1.5 px-3 text-[10px] font-black uppercase tracking-wider bg-[var(--primary)] text-white rounded-lg hover:opacity-90 transition-all cursor-pointer"
                                            >
                                              Enable Local Storage Backups
                                            </button>
                                          )}

                                          {/* Factor: Cloud Sync integration metadata state toggler */}
                                          {factor.id === "cloud_sync" && (
                                            <button 
                                              onClick={() => {
                                                const current = state.settings.enabledFeatures || {};
                                                onUpdateSettings({
                                                  autoCloudSync: true,
                                                  enabledFeatures: { ...current, cloudSync: true }
                                                });
                                              }}
                                              className="py-1.5 px-3 text-[10px] font-black uppercase tracking-wider bg-[var(--primary)] text-white rounded-lg hover:opacity-90 transition-all cursor-pointer"
                                            >
                                              Enable Cloud Persistence Multi-Device Sync
                                            </button>
                                          )}

                                          {/* Factor: Low-Stock system notification alert rules */}
                                          {factor.id === "notifications" && (
                                            <button 
                                              onClick={() => {
                                                const current = state.settings.enabledFeatures || {};
                                                onUpdateSettings({
                                                  notificationsOn: true,
                                                  enabledFeatures: { ...current, notifications: true }
                                                });
                                              }}
                                              className="py-1.5 px-3 text-[10px] font-black uppercase tracking-wider bg-[var(--primary)] text-white rounded-lg hover:opacity-90 transition-all cursor-pointer"
                                            >
                                              Initiate Stock Notification Warning Messages
                                            </button>
                                          )}

                                          {/* Factor: Invoice theme and size alignment config toggler */}
                                          {factor.id === "invoice_branding" && (
                                            <div className="flex gap-2.5">
                                              <button 
                                                onClick={() => {
                                                  onUpdateSettings({ fontSize: "standard", accentColor: "indigo" });
                                                }}
                                                className="py-1 px-2.5 text-[9px] font-black uppercase tracking-wider bg-[var(--primary)] text-white rounded-lg hover:opacity-90 transition-all cursor-pointer"
                                              >
                                                Branding Preset Blue Core
                                              </button>
                                              <button 
                                                onClick={() => {
                                                  onUpdateSettings({ fontSize: "comfortable", accentColor: "emerald" });
                                                }}
                                                className="py-1 px-2.5 text-[9px] font-black uppercase tracking-wider bg-emerald-600 text-white rounded-lg hover:opacity-95 transition-all cursor-pointer"
                                              >
                                                Branding Preset Green Accent
                                              </button>
                                            </div>
                                          )}
                                        </motion.div>
                                      )}
                                    </AnimatePresence>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </div>
          </div>
          )}

          {activeJourneySection === 'profile_status' && (
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-[2rem] p-6 space-y-4 shadow-sm">
            <div>
              <span className="text-[9px] font-black uppercase text-rose-500 tracking-[0.2em] block">Diagnostic Analyzer</span>
              <h3 className="text-lg font-black uppercase tracking-tight text-[var(--foreground)]">Real-Time Business Health Diagnostic Check</h3>
            </div>
            
            <p className="text-xs text-[var(--foreground)]/60 font-semibold leading-relaxed">
              Automated audit trace checking local sandbox connections, configurations, thermal drivers, accounts, and stock alerts:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
              <div className="p-3 bg-[var(--foreground)]/[0.02] dark:bg-[var(--foreground)]/[0.04] border border-[var(--border)] rounded-2xl flex items-center justify-between">
                <span className="text-xs font-bold text-[var(--foreground)] flex items-center gap-2">
                  <Printer className="w-4 h-4 text-[var(--foreground)] opacity-60" /> Print Dispatcher
                </span>
                {getStatusBadge(healthCheckResults.printer)}
              </div>
              <div className="p-3 bg-[var(--foreground)]/[0.02] dark:bg-[var(--foreground)]/[0.04] border border-[var(--border)] rounded-2xl flex items-center justify-between">
                <span className="text-xs font-bold text-[var(--foreground)] flex items-center gap-2 animate-pulse">
                  <RefreshCw className="w-4 h-4 text-[var(--foreground)] opacity-60 animate-spin" style={{ animationDuration: '6s' }} /> Multi-device Syncer
                </span>
                {getStatusBadge(healthCheckResults.sync)}
              </div>
              <div className="p-3 bg-[var(--foreground)]/[0.02] dark:bg-[var(--foreground)]/[0.04] border border-[var(--border)] rounded-2xl flex items-center justify-between">
                <span className="text-xs font-bold text-[var(--foreground)] flex items-center gap-2">
                  <Save className="w-4 h-4 text-[var(--foreground)] opacity-60" /> Local Backups
                </span>
                {getStatusBadge(healthCheckResults.backup)}
              </div>
              <div className="p-3 bg-[var(--foreground)]/[0.02] dark:bg-[var(--foreground)]/[0.04] border border-[var(--border)] rounded-2xl flex items-center justify-between">
                <span className="text-xs font-bold text-[var(--foreground)] flex items-center gap-2">
                  <Activity className="w-4 h-4 text-[var(--foreground)] opacity-60" /> Alert Push Engine
                </span>
                {getStatusBadge(healthCheckResults.notifications)}
              </div>
              <div className="p-3 bg-[var(--foreground)]/[0.02] dark:bg-[var(--foreground)]/[0.04] border border-[var(--border)] rounded-2xl flex items-center justify-between md:col-span-2">
                <span className="text-xs font-bold text-[var(--foreground)] flex items-center gap-2">
                  <Users className="w-4 h-4 text-[var(--foreground)] opacity-60" /> Account Identity Status
                </span>
                {getStatusBadge(healthCheckResults.account)}
              </div>
              <div className="p-3 bg-[var(--foreground)]/[0.02] dark:bg-[var(--foreground)]/[0.04] border border-[var(--border)] rounded-2xl flex items-center justify-between md:col-span-2">
                <span className="text-xs font-bold text-[var(--foreground)] flex items-center gap-2">
                  <Package className="w-4 h-4 text-[var(--foreground)] opacity-60" /> Catalogue Stocks Level Audit
                </span>
                <span className="text-xs font-extrabold flex items-center gap-1.5 flex-wrap">
                  {getStatusBadge(healthCheckResults.inventory)}
                  {healthCheckResults.lowStockCount > 0 && (
                    <span className="bg-amber-500/10 text-amber-500 text-[9px] py-1 px-2.5 rounded-lg font-black border border-amber-500/15">
                      {healthCheckResults.lowStockCount} LOW STOCK PRODUCTS
                    </span>
                  )}
                </span>
              </div>
            </div>
          </div>
          )}

          {/* 📆 Section 5: Month-by-month Ledger Sales summary analysis June 2026 */}
          {activeJourneySection === 'ledger_anniversary' && (
            <>
              <div className="bg-[var(--card)] border border-[var(--border)] rounded-[2rem] p-6 space-y-4 shadow-sm">
            <div className="flex justify-between items-center">
              <div>
                <span className="text-[9px] font-black uppercase text-[var(--primary)] tracking-[0.2em] block">Operational Period</span>
                <h3 className="text-lg font-black uppercase tracking-tight text-[var(--foreground)]">Current Month Record (June 2026)</h3>
              </div>
              <span className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-[10px] font-black py-1 px-3 rounded-full">
                ACTIVE PERIOD
              </span>
            </div>

            <p className="text-xs text-[var(--foreground)]/60 font-semibold leading-relaxed">
              Continuous sandbox log records generated for the month of June 2026:
            </p>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 pt-1">
              <div className="p-4 bg-[var(--foreground)]/3 border border-[var(--border)] rounded-2xl text-center space-y-1">
                <span className="text-[9px] font-black uppercase text-[var(--foreground)]/40 block">Bills Issued</span>
                <span className="text-xl font-black text-[var(--foreground)]">{june2026Summary.billsCount}</span>
              </div>
              <div className="p-4 bg-[var(--foreground)]/3 border border-[var(--border)] rounded-2xl text-center space-y-1">
                <span className="text-[9px] font-black uppercase text-[var(--foreground)]/40 block">Total Revenue</span>
                <span className="text-xl font-black text-[var(--foreground)]">{formatCurrency(june2026Summary.revenue)}</span>
              </div>
              <div className="p-4 bg-[var(--foreground)]/3 border border-[var(--border)] rounded-2xl text-center space-y-1">
                <span className="text-[9px] font-black uppercase text-[var(--foreground)]/40 block">Estimated Profit</span>
                <span className="text-xl font-black text-emerald-500">{formatCurrency(june2026Summary.profit)}</span>
              </div>
              <div className="p-4 bg-[var(--foreground)]/3 border border-[var(--border)] rounded-2xl text-center space-y-1">
                <span className="text-[9px] font-black uppercase text-[var(--foreground)]/40 block">Catalog Added</span>
                <span className="text-xl font-black text-[var(--foreground)]">{june2026Summary.productsAddedCount} qty</span>
              </div>
              <div className="p-4 bg-[var(--foreground)]/3 border border-[var(--border)] rounded-2xl text-center space-y-1">
                <span className="text-[9px] font-black uppercase text-[var(--foreground)]/40 block">Customers Registered</span>
                <span className="text-xl font-black text-[var(--foreground)]">{june2026Summary.customersAddedCount} node</span>
              </div>
              <div className="p-4 bg-[var(--foreground)]/3 border border-[var(--border)] rounded-2xl text-center space-y-1">
                <span className="text-[9px] font-black uppercase text-[var(--foreground)]/40 block">Achievements Unlocked</span>
                <span className="text-xl font-black text-amber-500">{june2026Summary.milestones} unlocked</span>
              </div>
            </div>

            {/* Structured bullet metrics as requested */}
            <div className="p-4 bg-[var(--foreground)]/[0.02] border border-[var(--border)] rounded-2xl space-y-2 mt-4">
              <span className="text-[9px] font-black uppercase text-[var(--foreground)]/50 block">Operational Metrics List Summary</span>
              <ul className="text-xs font-bold text-[var(--foreground)]/75 space-y-1.5 pl-1.5">
                <li className="flex items-center gap-1.5">
                  <span className="text-emerald-500">•</span>
                  <span>{june2026Summary.billsCount} New Bills Generated</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <span className="text-emerald-500">•</span>
                  <span>{june2026Summary.customersAddedCount} New Customers Onboarded</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <span className="text-emerald-500">•</span>
                  <span>{june2026Summary.productsAddedCount} Products Registered in Catalogue</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <span className="text-emerald-500">•</span>
                  <span>Total Gross Revenue Crossed: {formatCurrency(june2026Summary.revenue || 0)}</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <span className="text-emerald-500">•</span>
                  <span>Net Estimated Venture Profit: {formatCurrency(june2026Summary.profit || 0)}</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <span className="text-emerald-500">•</span>
                  <span>{june2026Summary.milestones} Growth Core Milestones Unlocked</span>
                </li>
              </ul>
            </div>
          </div>

          {/* 📅 Section 6: Business Anniversary & Longevity Calendar */}
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-[2rem] p-6 space-y-4 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <span className="text-[9px] font-black uppercase text-[var(--primary)] tracking-[0.2em] block">Longevity Cycle</span>
                <h3 className="text-lg font-black uppercase tracking-tight text-[var(--foreground)]">Enterprise Birth & Anniversary Tracking</h3>
              </div>
              <div className="flex items-center gap-2 self-start sm:self-auto bg-[var(--foreground)]/[0.03] p-2 rounded-xl border border-[var(--border)]">
                <CalendarDays className="w-3.5 h-3.5 opacity-50" />
                <input 
                  type="date"
                  value={storeOpeningDate} 
                  onChange={(e) => {
                    setStoreOpeningDate(e.target.value);
                    onUpdateSettings({ storeOpeningTime: e.target.value });
                  }}
                  className="bg-transparent border-none p-0 text-xs font-extrabold focus:outline-none focus:ring-0 text-[var(--foreground)] cursor-pointer"
                />
              </div>
            </div>

            <div className="p-4 bg-[var(--foreground)]/5 border border-[var(--border)] rounded-2xl space-y-1">
              <span className="text-[9px] font-black uppercase tracking-wider text-[var(--foreground)]/40">Active Operational Store Age</span>
              <div className="text-lg font-black text-[var(--primary)] flex items-center gap-1.5 uppercase">
                <Clock className="w-5 h-5 text-amber-500" />
                {anniversaryData.ageFormatted}
              </div>
              <p className="text-[10px] text-[var(--foreground)]/60 font-semibold leading-relaxed">
                Total operating calendar lifecycle: ({anniversaryData.diffDays} sequential business days since startup opening ceremony register).
              </p>
            </div>

            {/* Anniversary goals listing */}
            <div className="space-y-2 pt-2">
              <span className="text-[9px] font-black uppercase tracking-wider text-[var(--foreground)]/40 block">Operating Age Target Benchmarks</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {anniversaryData.milestoneTriggers.map(trigger => (
                  <div 
                    key={trigger.id} 
                    className={cn(
                      "p-3 rounded-xl border text-xs flex items-start gap-2.5 transition-all",
                      trigger.achieved ? "border-emerald-500/20 bg-emerald-500/5" : "border-[var(--border)] bg-transparent opacity-60"
                    )}
                  >
                    <span className="text-base mt-0.5">{trigger.achieved ? '💖' : '🔒'}</span>
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className="font-extrabold uppercase text-[var(--foreground)]">{trigger.label}</span>
                        {trigger.achieved && (
                          <span className="bg-emerald-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full">UNLOCK</span>
                        )}
                      </div>
                      <p className="text-[10.5px] text-[var(--foreground)]/50 leading-relaxed font-semibold">{trigger.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 🏆 Section 7: Unlocked Growth Milestones Achievements Card */}
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-[2rem] p-6 space-y-4 shadow-sm">
            <div>
              <span className="text-[9px] font-black uppercase text-amber-500 tracking-[0.2em] block">Unlocked Achievements Ledger</span>
              <h3 className="text-lg font-black uppercase tracking-tight text-[var(--foreground)]">Grow Achievements / Rewards Box</h3>
            </div>

            <p className="text-xs text-[var(--foreground)]/60 font-semibold leading-relaxed">
              Congratulations! These achievements were automatically generated based on transactions, revenue crossing milestones and customer registrations. You can download and display actual printable PDF certificates of achievement.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              {getCalculatedAchievements(state).milestones
                .filter(m => m.isUnlocked)
                .map((m) => (
                  <div key={m.id} className="p-4 bg-gradient-to-br from-amber-500/5 to-emerald-500/5 border border-amber-500/20 hover:border-emerald-500/40 rounded-2xl relative overflow-hidden transition-all flex flex-col justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[9px] font-black uppercase text-[var(--primary)] tracking-widest">{m.category} goal met</span>
                        <Award className="w-5 h-5 text-amber-500" />
                      </div>
                      <h4 className="text-sm font-black text-[var(--foreground)] uppercase tracking-tight">{m.title}</h4>
                      <p className="text-[10.5px] text-[var(--foreground)]/60 leading-relaxed font-semibold">{m.description}</p>
                    </div>

                    <div className="flex items-center justify-between border-t border-[var(--border)] pt-3 mt-1">
                      <span className="text-[10px] block text-[var(--foreground)]/40 font-mono">
                        {formatDateSafely(m.unlockedAt, 'Verified Target')}
                      </span>
                      <button
                        onClick={() => downloadCertificateOfMilestone(state.settings.storeName || "TS Price Manager", m)}
                        className="py-1 px-3 text-[9px] font-black uppercase tracking-wider bg-[var(--primary)] text-white hover:opacity-90 transition-all rounded-lg cursor-pointer flex items-center gap-1"
                      >
                        <Download className="w-3 h-3" /> Certificate PDF
                      </button>
                    </div>
                  </div>
                ))}
              {getCalculatedAchievements(state).milestones.filter(m => m.isUnlocked).length === 0 && (
                <div className="p-6 text-center border-2 border-dashed border-[var(--border)] rounded-2xl col-span-2 text-xs font-semibold text-[var(--foreground)]/50">
                  ⚠️ No growth milestones unlocked yet. Dispatch your initial POS sale tickets to begin tracking register goals!
                </div>
              )}
            </div>
          </div>
          </>
          )}
        </div>
      )}

      {/* ==================== SUBTAB: BUSINESS STATS ==================== */}
      {activeSubTab === 'profile' && (
        <div className="space-y-6">
          {/* 📊 BUSINESS PROFILE ANALYTICS - DEEP PERSISTENCE STATS */}
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-[2rem] p-6 space-y-4 shadow-sm">
            <div>
              <span className="text-[9px] font-black uppercase text-[var(--primary)] tracking-[0.2em]">INTEGRATION TIMELINE</span>
              <h3 className="text-sm font-black uppercase tracking-tight flex items-center gap-2 mt-1">
                Business Profile Analytics
              </h3>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-2">
              <div className="p-3 bg-[var(--background)] border border-[var(--border)] rounded-xl">
                <span className="text-[8px] font-black uppercase opacity-45 block">Total Products</span>
                <span className="text-xl font-black">{stats.totalProducts}</span>
              </div>
              <div className="p-3 bg-[var(--background)] border border-[var(--border)] rounded-xl">
                <span className="text-[8px] font-black uppercase opacity-45 block">Outstanding Udhar Ledger</span>
                <span className="text-xl font-black">{stats.totalCustomers} Accounts</span>
              </div>
              <div className="p-3 bg-[var(--background)] border border-[var(--border)] rounded-xl">
                <span className="text-[8px] font-black uppercase opacity-45 block">Settled Bills</span>
                <span className="text-xl font-black">{stats.totalBills} Bills</span>
              </div>
              <div className="p-3 bg-[var(--background)] border border-[var(--border)] rounded-xl col-span-2 sm:col-span-1">
                <span className="text-[8px] font-black uppercase opacity-45 block">Aggregate Sales Volume</span>
                <span className="text-sm font-black text-[var(--primary)]">₹{stats.totalSales.toLocaleString()}</span>
              </div>
              <div className="p-3 bg-[var(--background)] border border-[var(--border)] rounded-xl">
                <span className="text-[8px] font-black uppercase opacity-45 block">Store Creation</span>
                <span className="text-[10px] font-extrabold">{stats.storeCreatedDate}</span>
              </div>
              <div className="p-3 bg-[var(--background)] border border-[var(--border)] rounded-xl">
                <span className="text-[8px] font-black uppercase opacity-45 block">Business Age</span>
                <span className="text-[11px] font-extrabold text-amber-500">{stats.ageInDays} Days Active</span>
              </div>
            </div>
          </div>

          {/* 🔑 AI ASSISTANT BYOK (BRING YOUR OWN KEY) CONFIGURATION */}
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-[2rem] p-6 space-y-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[9px] font-black uppercase text-amber-500 tracking-[0.2em] block">BYOK Engine</span>
                <h3 className="text-sm font-black uppercase tracking-tight flex items-center gap-2 mt-0.5">
                  <Key size={16} className="text-amber-500" />
                  Gemini AI API Key Configuration
                </h3>
              </div>
              <span className="text-[9px] font-black px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20 uppercase tracking-wider">
                {state.settings.customApiKey ? 'Custom Key Active' : 'Default Global Pool'}
              </span>
            </div>

            <p className="text-xs text-[var(--foreground)]/60 font-semibold leading-relaxed">
              Provide your personal Gemini API Key to bypass public quota constraints. When specified, voice recognition and smart product catalog features will prioritize your dedicated quota.
            </p>

            <div className="flex flex-col sm:flex-row gap-2 pt-1">
              <input
                type="password"
                value={state.settings.customApiKey || ''}
                onChange={(e) => {
                  const val = e.target.value.trim();
                  onUpdateSettings({ customApiKey: val || undefined });
                }}
                placeholder="AIzaSy... (Paste Gemini API key to override global pool)"
                className="flex-1 bg-[var(--background)] border border-[var(--border)] rounded-xl px-3 py-2.5 text-xs font-mono font-bold focus:outline-none focus:border-amber-500"
              />
              {state.settings.customApiKey && (
                <button
                  type="button"
                  onClick={() => onUpdateSettings({ customApiKey: undefined })}
                  className="px-4 py-2 text-xs font-black uppercase tracking-wider rounded-xl bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 transition-all cursor-pointer"
                >
                  Clear Key
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ==================== SUBTAB: WORKFLOW TOGGLES ==================== */}
      {activeSubTab === 'features' && (
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-[2rem] p-6 space-y-6 shadow-sm">
          <div>
            <h3 className="text-base font-black uppercase tracking-tight flex items-center gap-2">
              <Sliders size={18} className="text-[var(--primary)]" /> Custom UI Feature Toggles
            </h3>
            <p className="text-[9px] opacity-45 uppercase font-bold tracking-wider mt-1">
              Selectively enable/disable core services. Changes apply instantly without wiping catalog items or sales histories.
            </p>
          </div>

          <div className="space-y-4">
            {[
              { key: 'udhar', label: 'Udhar (Credit) Ledger Book', desc: 'Manage outstanding local customer balances and billing tabs.' },
              { key: 'inventory', label: 'Inventory Catalog & Alerting', desc: 'Track shelf stock volumes and issue immediate warnings.' },
              { key: 'customer', label: 'Customer Profiler', desc: 'Map client contact cards on invoice receipts securely.' },
              { key: 'supplier', label: 'Supplier Direct Links', desc: 'Track wholesale procurement vendors and pending logs.' },
              { key: 'analytics', label: 'Advanced Financial Metrics', desc: 'Generate charts, margin tables, and export monthly summaries.' },
              { key: 'notifications', label: 'Sound Chimes & vibration alerts', desc: 'Interactive audio feedback on billing and stock alerts.' },
              { key: 'printing', label: 'Print & PDF Receipt layout templates', desc: 'Customize invoices for PWA external printers.' },
              { key: 'cloudSync', label: 'Cloud Multi-Device Synchronous Engine', desc: 'Automatic database broadcast and local background self-healing.' }
            ].map(f => {
              const featuresMap = state.settings.enabledFeatures || {
                udhar: true,
                inventory: true,
                customer: true,
                supplier: true,
                analytics: true,
                notifications: true,
                printing: true,
                cloudSync: true
              };
              const isEnabled = (featuresMap as any)[f.key] !== false;
              
              return (
                <div key={f.key} className="flex items-center justify-between p-4 bg-[var(--background)] border border-[var(--border)] rounded-2xl">
                  <div>
                    <h5 className="font-extrabold text-xs uppercase flex items-center gap-2 text-[var(--foreground)]">
                      {f.label}
                    </h5>
                    <p className="text-[10px] opacity-45 font-semibold mt-0.5">
                      {f.desc}
                    </p>
                  </div>
                  
                  <div className="relative shrink-0">
                    <input
                      type="checkbox"
                      id={`feature-toggle-${f.key}`}
                      checked={isEnabled}
                      onChange={() => handleToggleFeature(f.key)}
                      className="sr-only peer"
                    />
                    <label
                      htmlFor={`feature-toggle-${f.key}`}
                      className="w-11 h-6 bg-[var(--border)] rounded-full block border border-[var(--border)] cursor-pointer peer-checked:bg-[var(--primary)] peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:border-white after:border"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ==================== SUBTAB: CATEGORY CUSTOMIZER ==================== */}
      {activeSubTab === 'categories' && (
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-[2rem] p-6 space-y-6 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-base font-black uppercase tracking-tight flex items-center gap-2">
                <LayoutGrid size={18} className="text-[var(--primary)]" /> Custom Category Desk
              </h3>
              <p className="text-[9px] opacity-45 uppercase font-bold tracking-wider mt-1">
                Customize suggested product categories. Add icons, colors, or reorder entries safely.
              </p>
            </div>
            {!showCatForm && !editingCategory && (
              <button 
                onClick={() => setShowCatForm(true)}
                className="flex items-center gap-1.5 bg-[var(--primary)]/10 text-[var(--primary)] text-[10px] font-black uppercase tracking-wider py-1.5 px-3.5 rounded-full hover:bg-[var(--primary)] hover:text-white transition-all cursor-pointer"
              >
                <Plus size={12} /> Add Category
              </button>
            )}
          </div>

          {/* ADD / EDIT CATEGORY DRAFT FORM */}
          {(showCatForm || editingCategory) && (
            <div className="p-4 bg-[var(--background)] border border-[var(--border)] rounded-2xl space-y-4">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-[var(--primary)]">
                {editingCategory ? 'Edit Category' : 'Create Category'}
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <span className="text-[8px] font-black uppercase tracking-wider opacity-50 block">Name (नाम)</span>
                  <input
                    type="text"
                    value={newCatName}
                    onChange={e => setNewCatName(e.target.value)}
                    placeholder="Dry Fruits or Starters"
                    className="w-full bg-[var(--card)] text-[var(--foreground)] border border-[var(--border)] rounded-xl px-3 py-2 text-xs font-bold"
                  />
                </div>
                <div className="space-y-1">
                  <span className="text-[8px] font-black uppercase tracking-wider opacity-50 block">Emoji (प्रतीक)</span>
                  <input
                    type="text"
                    value={newCatIcon}
                    onChange={e => setNewCatIcon(e.target.value)}
                    placeholder="🥦"
                    className="w-full bg-[var(--card)] text-[var(--foreground)] border border-[var(--border)] rounded-xl px-3 py-2 text-xs font-bold text-center"
                  />
                </div>
                <div className="space-y-1">
                  <span className="text-[8px] font-black uppercase tracking-wider opacity-50 block">Accent Color (रंग)</span>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={newCatColor}
                      onChange={e => setNewCatColor(e.target.value)}
                      className="w-10 h-8 bg-transparent rounded cursor-pointer border-0"
                    />
                    <span className="text-xs font-mono font-bold leading-8">{newCatColor.toUpperCase()}</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => {
                    setShowCatForm(false);
                    setEditingCategory(null);
                    setNewCatName('');
                    setNewCatIcon('📦');
                  }}
                  className="px-3 py-1.5 text-[9px] uppercase font-black tracking-widest rounded-lg border border-[var(--border)] text-[var(--foreground)]/50 hover:bg-[var(--foreground)]/5 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={editingCategory ? handleSaveEditCategory : handleAddCategory}
                  className="px-3.5 py-1.5 text-[9px] uppercase font-black tracking-widest rounded-lg bg-[var(--primary)] text-white hover:bg-[var(--primary)]/90 transition-all cursor-pointer"
                >
                  Save Category
                </button>
              </div>
            </div>
          )}

          {/* ACTIVE CATEGORIES FLAT LIST */}
          <div className="grid grid-cols-2 gap-2.5">
            {categoriesList.map((cat, index) => (
              <div 
                key={`${cat.id || 'cat'}-${index}`}
                className="flex items-center justify-between p-3 bg-[var(--background)] border border-[var(--border)] rounded-xl group/cat"
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-lg">{cat.icon || '📦'}</span>
                  <div>
                    <h5 className="text-[11px] font-extrabold uppercase leading-none">{cat.name}</h5>
                    <span className="text-[8px] opacity-40 uppercase tracking-widest font-mono">ID: {cat.id}</span>
                  </div>
                </div>

                <div className="flex items-center gap-1 opacity-0 group-hover/cat:opacity-100 transition-opacity">
                  <button
                    onClick={() => {
                      setEditingCategory(cat);
                      setNewCatName(cat.name);
                      setNewCatIcon(cat.icon || '📦');
                      setNewCatColor(cat.color || '#6b7280');
                      setShowCatForm(false);
                    }}
                    className="p-1 hover:text-[var(--primary)] transition-colors cursor-pointer"
                  >
                    <Edit2 size={12} />
                  </button>
                  <button
                    onClick={() => handleDeleteCategory(cat.id)}
                    className="p-1 hover:text-red-500 transition-colors cursor-pointer"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ==================== SUBTAB: DASHBOARD CARD MANAGEMENT ==================== */}
      {activeSubTab === 'dashboard' && (
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-[2rem] p-6 space-y-6 shadow-sm">
          <div>
            <h3 className="text-base font-black uppercase tracking-tight flex items-center gap-2">
              <Briefcase size={18} className="text-[var(--primary)]" /> Custom Dashboard Card Deck
            </h3>
            <p className="text-[9px] opacity-45 uppercase font-bold tracking-wider mt-1">
              Select cards to keep visible on the main landing statistics grid, and choose grid sizing vectors.
            </p>
          </div>

          <div className="space-y-3">
            {allPossibleDashboardCards.map(statCard => {
              const currentCards = state.settings.dashboardCards || [
                { id: 'sales', title: 'Daily Sales Revenue', visible: true, size: 'large' },
                { id: 'profit', title: 'Gross Profit Calculations', visible: true, size: 'medium' },
                { id: 'low_stock', title: 'Low Stock alerts', visible: true, size: 'medium' }
              ];
              const cardConfig = currentCards.find(c => c.id === statCard.id);
              const isVisible = cardConfig ? cardConfig.visible : false;
              const cardSize = cardConfig ? cardConfig.size : 'medium';

              return (
                <div key={statCard.id} className="p-4 bg-[var(--background)] border border-[var(--border)] rounded-2xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <input 
                      type="checkbox"
                      id={`check-card-${statCard.id}`}
                      checked={isVisible}
                      onChange={() => handleToggleDashboardCard(statCard.id)}
                      className="h-4 w-4 rounded accent-[var(--primary)] border-[var(--border)] text-[var(--primary)] cursor-pointer"
                    />
                    <label htmlFor={`check-card-${statCard.id}`} className="text-xs uppercase font-extrabold select-none cursor-pointer">
                      {statCard.label}
                    </label>
                  </div>

                  {isVisible && (
                    <div className="flex items-center gap-1 bg-[var(--card)] p-1 rounded-lg border border-[var(--border)] self-end sm:self-auto">
                      {(['small', 'medium', 'large'] as const).map(sz => (
                        <button
                          key={sz}
                          onClick={() => handleResizeDashboardCard(statCard.id, sz)}
                          className={cn(
                            "text-[8px] font-black uppercase tracking-wider py-1 px-2.5 rounded-md transition-all cursor-pointer",
                            cardSize === sz ? "bg-[var(--primary)] text-white" : "opacity-30 hover:opacity-100"
                          )}
                        >
                          {sz}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ==================== SUBTAB: QUIK ACTIONS CONFIGURATION ==================== */}
      {activeSubTab === 'actions' && (
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-[2rem] p-6 space-y-6 shadow-sm">
          <div>
            <h3 className="text-base font-black uppercase tracking-tight flex items-center gap-2">
              <Settings2 size={18} className="text-[var(--primary)]" /> Custom Quick Action Tray
            </h3>
            <p className="text-[9px] opacity-45 uppercase font-bold tracking-wider mt-1">
              Select up to 6 custom actions to display as hotlinks in your main navigation panel.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {allAvailableQuickActions.map(act => {
              const currentActions = state.settings.quickActions || ['create_bill', 'add_product', 'update_stock', 'print_invoice', 'open_analytics', 'open_udhar'];
              const isSelected = currentActions.includes(act.id);

              return (
                <button
                  key={act.id}
                  onClick={() => handleToggleQuickAction(act.id)}
                  className={cn(
                    "p-4 rounded-2xl border text-left transition-all relative flex flex-col justify-between h-24 cursor-pointer",
                    isSelected 
                      ? "bg-[var(--primary)]/5 border-[var(--primary)] text-[var(--foreground)]" 
                      : "bg-[var(--background)] border-[var(--border)] hover:border-[var(--primary)]/20"
                  )}
                >
                  <div className="text-2xl">{act.icon}</div>
                  
                  <div className="flex items-center justify-between w-full">
                    <span className="text-[10px] font-black uppercase tracking-wide leading-none">{act.label}</span>
                    <span className={cn(
                      "h-4 w-4 rounded-full border flex items-center justify-center text-[8px]",
                      isSelected ? "bg-[var(--primary)] text-white border-transparent" : "border-[var(--border)]"
                    )}>
                      {isSelected ? <Check size={10} strokeWidth={4} /> : null}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* CUSTOM WEIGHT & QUANTITY CHIPS MANAGEMENT */}
          <div className="pt-2">
            <CustomWeightChipsSettings 
              settings={state.settings} 
              onUpdateSettings={onUpdateSettings} 
            />
          </div>
        </div>
      )}

      {/* ==================== SUBTAB: BUSINESS KNOWLEDGE HUB ==================== */}
      {activeSubTab === 'knowledge' && (
        <BusinessKnowledgeHub 
          state={state} 
          onUpdateSettings={onUpdateSettings} 
          t={t}
        />
      )}

      {/* ==================== SUBTAB: BUSINESS RECOVERY CENTER ==================== */}
      {activeSubTab === 'recovery' && (
        <BusinessRecoveryCenter 
          state={state} 
          onUpdateSettings={onUpdateSettings} 
          onUpdateState={onUpdateState}
          t={t}
        />
      )}

      {/* ==================== MODAL: DYNAMIC MODE COMPARISON & CONFIRMATION ==================== */}
      {showSwitchModal && selectedModeForPreview && (
        <div className="fixed inset-0 bg-black/65 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-[var(--card)] border border-[var(--border)] w-full max-w-lg rounded-[2.5rem] p-6 space-y-6 shadow-2xl relative animate-in zoom-in duration-300">
            {/* Header */}
            <div className="flex items-start gap-4">
              <div className="h-14 w-14 rounded-2xl bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center text-2xl shadow-inner">
                {selectedModeForPreview.emoji}
              </div>
              <div className="flex-1">
                <span className="text-[9px] font-black uppercase text-[var(--primary)] tracking-[0.2em] block">SWITCH WORKFLOW METAPHOR</span>
                <h4 className="text-xl font-black uppercase tracking-tight mt-0.5">
                  Apply {selectedModeForPreview.name} Mode?
                </h4>
                <p className="text-[10px] opacity-50 font-bold mt-1">
                  Configure this client-side adaptation block across all registered devices.
                </p>
              </div>
            </div>

            {/* Focus */}
            <div className="bg-[var(--background)] p-4 rounded-2xl border border-[var(--border)] space-y-1.5">
              <span className="text-[8px] font-black uppercase opacity-45 tracking-widest flex items-center gap-1.5">
                <Info size={11} className="text-[var(--primary)]" /> Core Focus Area
              </span>
              <p className="text-xs font-black">
                {state.settings.language === 'en' ? selectedModeForPreview.focus : (selectedModeForPreview.hindiFocus || selectedModeForPreview.focus)}
              </p>
              <p className="text-[11px] font-semibold text-[var(--foreground)]/70 mt-1">
                {state.settings.language === 'en' ? selectedModeForPreview.description : (selectedModeForPreview.hindiDescription || selectedModeForPreview.description)}
              </p>
            </div>

            {/* Recommended Features Column */}
            <div className="space-y-2">
              <span className="text-[9px] font-black uppercase opacity-40 tracking-wider block">Recommended Mode Adaptations</span>
              <ul className="grid grid-cols-1 gap-1.5">
                {(state.settings.language === 'hi' || state.settings.language === 'hi-en' ? (selectedModeForPreview.recommendedHindiFeatures || selectedModeForPreview.recommendedFeatures) : selectedModeForPreview.recommendedFeatures).map((f, i) => (
                  <li key={i} className="flex items-center gap-2 text-xs font-semibold text-[var(--foreground)]/80">
                    <span className="h-1.5 w-1.5 rounded-full bg-[var(--primary)] shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>

            {/* Workflow Preview */}
            <div className="p-3 bg-[var(--primary)]/5 rounded-xl border border-[var(--primary)]/10 space-y-1">
              <span className="text-[8px] font-black uppercase text-[var(--primary)] tracking-widest block">OPERATOR WORKFLOW PREVIEW</span>
              <p className="text-[10px] font-bold italic leading-normal">
                "{state.settings.language === 'hi' || state.settings.language === 'hi-en' ? (selectedModeForPreview.workflowHindiPreview?.[0] || selectedModeForPreview.workflowPreview[0]) : selectedModeForPreview.workflowPreview[0]}"
              </p>
            </div>

            {/* Critical Keep Settings Choice Buttons */}
            <div className="pt-4 border-t border-[var(--border)] flex flex-col gap-2">
              <button
                onClick={() => applySelectedMode(true)}
                className="w-full bg-[var(--primary)] text-white font-black uppercase tracking-widest text-[10px] py-3.5 px-4 rounded-xl shadow-lg shadow-[var(--primary)]/15 hover:bg-[var(--primary)]/90 cursor-pointer text-center"
              >
                Apply Mode + Recommended Settings
              </button>
              <button
                onClick={() => applySelectedMode(false)}
                className="w-full bg-[var(--background)] border border-[var(--border)] text-[var(--foreground)]/80 font-black uppercase tracking-widest text-[10px] py-3.5 px-4 rounded-xl hover:bg-[var(--foreground)]/5 cursor-pointer text-center"
              >
                Apply Mode ONLY (Retain My Custom Settings)
              </button>
              <button
                onClick={() => {
                  setShowSwitchModal(false);
                  setSelectedModeForPreview(null);
                }}
                className="w-full text-center text-[9px] opacity-40 hover:opacity-100 font-extrabold uppercase py-1 cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
