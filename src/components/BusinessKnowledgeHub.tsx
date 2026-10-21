import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BookOpen, 
  Plus, 
  Trash2, 
  Edit3, 
  Search, 
  Star, 
  Bookmark, 
  Award, 
  Users, 
  ShoppingBag, 
  ShieldCheck, 
  Calendar, 
  FileText, 
  Activity, 
  Printer, 
  Download, 
  Grid, 
  ExternalLink,
  MapPin,
  Phone,
  Paperclip,
  CheckSquare,
  AlertTriangle,
  Layers,
  ChevronDown,
  RotateCcw,
  CheckCircle,
  HelpCircle
} from 'lucide-react';
import { AppState, AppSettings } from '../types';
import { cn, formatCurrency } from '../lib/utils';
import { jsPDF } from 'jspdf';

export interface KnowledgeCategory {
  id: string;
  name: string;
  icon: string;
  color: string;
  isCustom?: boolean;
}

export interface SupplierEntry {
  id: string;
  name: string;
  contactPerson: string;
  phone: string;
  address: string;
  productsSupplied: string;
  specialRates: string;
  paymentTerms: string;
  notes: string;
  pastIssues: string;
  isPreferred: boolean;
}

export interface ProductKnowledgeEntry {
  id: string;
  productName: string;
  category: string;
  storageInstructions: string;
  purchaseSources: string;
  supplierDetails: string;
  profitMarginNotes: string;
  qualityGuidelines: string;
  seasonalDemandNotes: string;
  priceHistory: { month: string; price: number }[];
}

export interface PlaybookEntry {
  id: string;
  title: string;
  description: string;
  steps: string[];
}

export interface StorePolicy {
  id: string;
  title: string;
  content: string;
  audience: 'employee' | 'customer' | 'all';
}

export interface AnnouncementEntry {
  id: string;
  title: string;
  content: string;
  priority: 'high' | 'medium' | 'low';
  expiryDate: string;
  category: string;
  createdAt: string;
}

export interface KnowledgeAttachment {
  id: string;
  name: string;
  type: 'pdf' | 'image' | 'catalog' | 'document';
  url: string;
  size: string;
  uploadedAt: string;
}

export interface HubActivityLog {
  id: string;
  type: string; // 'create' | 'edit' | 'delete' | 'checklist'
  detail: string;
  timestamp: string;
}

export interface KnowledgeNoteRevision {
  version: number;
  updatedAt: string;
  title: string;
  description: string;
  modifiedBy: string;
}

export interface AdvancedKnowledgeNote {
  id: string;
  title: string;
  description: string;
  categoryId: string;
  isPinned: boolean;
  isFavorite: boolean;
  createdAt: string;
  updatedAt: string;
  attachments: KnowledgeAttachment[];
  revisions: KnowledgeNoteRevision[];
}

interface BusinessKnowledgeHubProps {
  state: AppState;
  onUpdateSettings: (updates: Partial<AppSettings>) => void;
  t?: any;
}

// Initial DEFAULT Suggested SOP Playbooks
const DEFAULT_BUSINESS_PLAYBOOKS = [
  {
    id: 'pb_billing',
    title: 'How To Create A Digital Bill',
    description: 'SOP checklist for checkout attendants for invoice printing and payment validation.',
    steps: [
      'Unlock the secure terminal using store passcode.',
      'Scan or manually search product names from the central catalogue deck.',
      'Check if buying price markers require dynamic changes based on stock units.',
      'Confirm customer primary name and phone credentials for Udhar credit audits.',
      'Select Payment Mode (UPI QR code / Local Liquid Cash / Credit Udhar ledger).',
      'Press Print Bill button to pipe formatted outputs to the thermal printer.'
    ]
  },
  {
    id: 'pb_returns',
    title: 'How To Handle Customer Returns',
    description: 'Operational guidelines to process product changes while preserving integrity.',
    steps: [
      'Ask the customer for the original digital printed receipt voucher.',
      'Examine the returned inventory units for quality checks or box damages.',
      'Modify quantities in active database to restore stock items.',
      'If UPI, initiate reverse bank transfers. If Credit, deduct customer Udhar dues ledger.'
    ]
  },
  {
    id: 'pb_purchase',
    title: 'How To Register New Stock entries',
    description: 'Manual catalogue entry guidelines for warehouse managers and owners.',
    steps: [
      'Open Category Desk under Settings to align icons and color profiles.',
      'Record exact buying price, margin constraints, wholesale targets, and retail margins.',
      'Define min stock levels to trigger auto warnings of deficit alarms.'
    ]
  }
];

// Initial Categories
const INITIAL_HUB_CATEGORIES: KnowledgeCategory[] = [
  { id: 'cat_info', name: 'Business Information', icon: '🏛️', color: '#3b82f6' },
  { id: 'cat_supplier', name: 'Supplier Information', icon: '🚚', color: '#10b981' },
  { id: 'cat_prod', name: 'Product Knowledge', icon: '📦', color: '#f59e0b' },
  { id: 'cat_policies', name: 'Store Policies', icon: '🛡️', color: '#ec4899' },
  { id: 'cat_employee', name: 'Employee Instructions', icon: '👔', color: '#8b5cf6' },
  { id: 'cat_price', name: 'Price Lists', icon: '📊', color: '#06b6d4' },
  { id: 'cat_proc', name: 'Business Procedures', icon: '⚙️', color: '#6366f1' },
  { id: 'cat_customer', name: 'Customer Notes', icon: '👥', color: '#14b8a6' },
  { id: 'cat_ann', name: 'Announcements', icon: '📢', color: '#ef4444' }
];

function localDeduplicate<T extends { id: string }>(arr: T[]): T[] {
  const seen = new Set<string>();
  return arr.filter(item => {
    if (!item || !item.id || seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

export default function BusinessKnowledgeHub({ state, onUpdateSettings, t = {} }: BusinessKnowledgeHubProps) {
  // Sync state attributes from backend configurations
  const rawHubCategories = (state.settings as any).hubCategories || INITIAL_HUB_CATEGORIES;
  const rawSuppliers = (state.settings as any).hubSuppliers || [];
  const rawProducts = (state.settings as any).hubProducts || [];
  const rawNotes = (state.settings as any).hubNotes || [];
  const rawAnnouncements = (state.settings as any).hubAnnouncements || [];
  const rawPolicies = (state.settings as any).hubPolicies || [];
  const rawPlaybooks = (state.settings as any).hubPlaybooks || DEFAULT_BUSINESS_PLAYBOOKS;
  const rawActivities = (state.settings as any).hubActivities || [];
  const rawOpeningChecklist = (state.settings as any).openingChecklist || {
    storeOpen: false,
    checkStockAlerts: false,
    verifyPrinter: false,
    checkUdhar: false,
    reviewSales: false
  };
  const rawClosingChecklist = (state.settings as any).closingChecklist || {
    verifySales: false,
    checkProfit: false,
    verifyStockChanges: false,
    backupData: false,
    closeBills: false,
    verifyPrinter: false
  };

  const [categories, setCategories] = useState<KnowledgeCategory[]>(rawHubCategories);
  const [suppliers, setSuppliers] = useState<SupplierEntry[]>(rawSuppliers);
  const [products, setProducts] = useState<ProductKnowledgeEntry[]>(rawProducts);
  const [hubNotes, setHubNotes] = useState<AdvancedKnowledgeNote[]>(rawNotes);
  const [announcements, setAnnouncements] = useState<AnnouncementEntry[]>(rawAnnouncements);
  const [policies, setPolicies] = useState<StorePolicy[]>(() => localDeduplicate(rawPolicies));
  const [playbooks, setPlaybooks] = useState<PlaybookEntry[]>(() => localDeduplicate(rawPlaybooks));
  const [hubActivities, setHubActivities] = useState<HubActivityLog[]>(rawActivities);
  const [openChecklist, setOpenChecklist] = useState(rawOpeningChecklist);
  const [closeChecklist, setCloseChecklist] = useState(rawClosingChecklist);

  // Persistence handler
  const persistHubChanges = (updates: any) => {
    onUpdateSettings({
      ...state.settings,
      ...updates
    } as any);
  };

  // UI state control
  const [activeTab, setActiveTab] = useState<'overview' | 'notes' | 'suppliers' | 'products' | 'procedures' | 'policies' | 'announcements' | 'checklists' | 'categories'>('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('all');

  // Supplier Form
  const [showSupplierForm, setShowSupplierForm] = useState(false);
  const [editingSupplierId, setEditingSupplierId] = useState<string | null>(null);
  const [supName, setSupName] = useState('');
  const [supPerson, setSupPerson] = useState('');
  const [supPhone, setSupPhone] = useState('');
  const [supAddress, setSupAddress] = useState('');
  const [supProd, setSupProd] = useState('');
  const [supRates, setSupRates] = useState('');
  const [supTerms, setSupTerms] = useState('');
  const [supNotes, setSupNotes] = useState('');
  const [supIssues, setSupIssues] = useState('');
  const [supPref, setSupPref] = useState(false);

  // Product library form
  const [showProductForm, setShowProductForm] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [prodName, setProdName] = useState('');
  const [prodCat, setProdCat] = useState('Dry Fruits');
  const [prodStorage, setProdStorage] = useState('');
  const [prodSource, setProdSource] = useState('');
  const [prodSupDetails, setProdSupDetails] = useState('');
  const [prodMargin, setProdMargin] = useState('');
  const [prodQuality, setProdQuality] = useState('');
  const [prodSeasonal, setProdSeasonal] = useState('');
  const [priceHistoryText, setPriceHistoryText] = useState('January: 800\nFebruary: 850\nMarch: 900');

  // Notes Form
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteDesc, setNoteDesc] = useState('');
  const [noteCat, setNoteCat] = useState('');
  const [attachmentName, setAttachmentName] = useState('');
  const [attachmentType, setAttachmentType] = useState<'pdf' | 'image' | 'catalog' | 'document'>('pdf');
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [noteAttachments, setNoteAttachments] = useState<KnowledgeAttachment[]>([]);

  // Category setup form
  const [showCatForm, setShowCatForm] = useState(false);
  const [catNameForm, setCatNameForm] = useState('');
  const [catIconForm, setCatIconForm] = useState('📁');
  const [catColorForm, setCatColorForm] = useState('#6366f1');

  // Announcement Form
  const [showAnnForm, setShowAnnForm] = useState(false);
  const [annTitle, setAnnTitle] = useState('');
  const [annContent, setAnnContent] = useState('');
  const [annPriority, setAnnPriority] = useState<'high' | 'medium' | 'low'>('medium');
  const [annExpiry, setAnnExpiry] = useState('');
  const [annCategory, setAnnCategory] = useState('General');

  // Playbook Form
  const [showPlaybookForm, setShowPlaybookForm] = useState(false);
  const [pbTitle, setPbTitle] = useState('');
  const [pbDesc, setPbDesc] = useState('');
  const [pbStepsText, setPbStepsText] = useState('');

  // Policy Form
  const [showPolicyForm, setShowPolicyForm] = useState(false);
  const [polTitle, setPolTitle] = useState('');
  const [polContent, setPolContent] = useState('');
  const [polAudience, setPolAudience] = useState<'employee' | 'customer' | 'all'>('all');

  const activeMode = state.settings.businessMode || 'general';

  // Trigger default templates suggest based on current active Business Mode Operational metaphors
  const handleApplyBusinessSeedSOP = () => {
    let extraPolicies: StorePolicy[] = [];
    let extraSOPs: PlaybookEntry[] = [];

    if (activeMode === 'restaurant') {
      extraSOPs = [
        { id: 'sop_kitchen', title: 'Standard Kitchen Food Safety (Restaurant SOP)', description: 'Critical procedures for menu preparation and gas oven switch offs.', steps: ['Decontaminate slicing surfaces and chef knives with chemical solutions.', 'Audit gas mainlines every evening alongside printer checks.', 'Record remaining raw ingredients inside manual stock count ledger logs.'] },
        { id: 'sop_guest', title: 'Table Reservation Billing Routine', description: 'Quick procedures for diners checkout experience.', steps: ['Ask for table invoice sequence number from desk host.', 'Verify complimentary discounts or loyalty tags before generating final billing receipts.'] }
      ];
      extraPolicies = [
        { id: 'pol_rest', title: 'Food Defect Refund Policy', content: 'In the occurrence of substandard cuisine preparation, customers are eligible for active credit note refunds.', audience: 'all' }
      ];
    } else if (activeMode === 'hotel') {
      extraSOPs = [
        { id: 'sop_hotel_check', title: 'Guest Express Check-In operating manual', description: 'Steps for check-in desk employees.', steps: ['Scan ID verification card of incoming guests and log name.', 'Create digital ledger for local room service order tracking.', 'Set up printer status diagnostic link for print checkout invoice.'] },
        { id: 'sop_hotel_laundry', title: 'Store Laundry SOP Guidelines', description: 'Management checkpoints for bedroom sheets.', steps: ['Collect linen from vacating guest chambers.', 'Record cleaning tasks logs securely.'] }
      ];
      extraPolicies = [
        { id: 'pol_hotel', title: 'Hotel Stay Cancellation Clause', content: 'Reservations canceled within 24 hours of scheduled arrivals are subject to a nominal maintenance fee.', audience: 'employee' }
      ];
    } else if (activeMode === 'wholesale') {
      extraSOPs = [
        { id: 'sop_wholesale_bulk', title: 'Bulk Pallet Despatch & Transport Logistics', description: 'Guidelines for massive bulk deliveries.', steps: ['Re-verify purchase invoice details with stock inventory levels.', 'Check contractor credit bounds before dispatching vehicle fleets.', 'Record transport carrier phone numbers.'] }
      ];
      extraPolicies = [
        { id: 'pol_wholesale', title: 'Credit Udhar Terms Safeguard', content: 'Wholesale client ledger outstanding due balances shall not exceed the defined safe buffer value across 30 days cycles.', audience: 'all' }
      ];
    } else {
      extraSOPs = [
        { id: 'sop_general_audit', title: 'Daily Cash counter audit playbook', description: 'SOP to balance Cash boxes before store closure.', steps: ['Count aggregate cash notes inside the drawer box drawer.', 'Tally net collections against UPI bills registered inside the billing screen history.'] }
      ];
      extraPolicies = [
        { id: 'pol_general', title: 'Secure Inventory Returns Safeguard', content: 'Return operations are allowed inside 7 business days from target date of purchase vouchers.', audience: 'customer' }
      ];
    }

    const updatedPolicies = localDeduplicate([...policies, ...extraPolicies]);
    const updatedPlaybooks = localDeduplicate([...playbooks, ...extraSOPs]);
    setPolicies(updatedPolicies);
    setPlaybooks(updatedPlaybooks);

    const log: HubActivityLog = {
      id: 'act_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
      type: 'create',
      detail: `Activated professional template packs optimized for active ${activeMode.toUpperCase()} operation mode.`,
      timestamp: new Date().toISOString()
    };
    const updatedActivities = [log, ...hubActivities];
    setHubActivities(updatedActivities);

    persistHubChanges({
      hubPolicies: updatedPolicies,
      hubPlaybooks: updatedPlaybooks,
      hubActivities: updatedActivities
    });

    alert(`Successfully applied recommended ${activeMode.toUpperCase()} Operating Playbooks & Policies!`);
  };

  // Helper log activity
  const addHubActivity = (type: string, detail: string) => {
    const newLog: HubActivityLog = {
      id: 'act_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
      type,
      detail,
      timestamp: new Date().toISOString()
    };
    const nextLogs = [newLog, ...hubActivities];
    setHubActivities(nextLogs);
    return nextLogs;
  };

  // ==================== CHECKLIST HANDLERS ====================
  const handleToggleOpeningTask = (key: keyof typeof openChecklist) => {
    const next = { ...openChecklist, [key]: !openChecklist[key] };
    setOpenChecklist(next);
    const label = String(key).replace(/([A-Z])/g, ' $1').toLowerCase();
    const updatedLogs = addHubActivity('checklist', `Opening checklist item "${label}" checked state toggled.`);
    persistHubChanges({
      openingChecklist: next,
      hubActivities: updatedLogs
    });
  };

  const handleToggleClosingTask = (key: keyof typeof closeChecklist) => {
    const next = { ...closeChecklist, [key]: !closeChecklist[key] };
    setCloseChecklist(next);
    const label = String(key).replace(/([A-Z])/g, ' $1').toLowerCase();
    const updatedLogs = addHubActivity('checklist', `Closing checklist item "${label}" checked state toggled.`);
    persistHubChanges({
      closingChecklist: next,
      hubActivities: updatedLogs
    });
  };

  // ==================== NOTES CRUD ====================
  const handleSaveNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteTitle.trim()) {
      alert("Note title cannot be blank.");
      return;
    }

    let nextNotes = [...hubNotes];
    const targetCat = noteCat || (categories[0]?.id || 'cat_info');

    if (editingNoteId) {
      // Edit note. Save version control!
      nextNotes = hubNotes.map(n => {
        if (n.id === editingNoteId) {
          const prevRevision: KnowledgeNoteRevision = {
            version: (n.revisions?.length || 0) + 1,
            updatedAt: n.updatedAt || n.createdAt,
            title: n.title,
            description: n.description,
            modifiedBy: state.user?.email || 'Store Admin'
          };
          const nextRevisions = n.revisions ? [prevRevision, ...n.revisions] : [prevRevision];
          return {
            ...n,
            title: noteTitle.trim(),
            description: noteDesc.trim(),
            categoryId: targetCat,
            attachments: [...n.attachments, ...noteAttachments],
            updatedAt: new Date().toISOString(),
            revisions: nextRevisions
          };
        }
        return n;
      });
      addHubActivity('edit', `Updated Operating manual note details and revision for "${noteTitle}"`);
    } else {
      // New note
      const newNote: AdvancedKnowledgeNote = {
        id: 'hn_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
        title: noteTitle.trim(),
        description: noteDesc.trim(),
        categoryId: targetCat,
        isPinned: false,
        isFavorite: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        attachments: noteAttachments,
        revisions: []
      };
      nextNotes = [newNote, ...nextNotes];
      addHubActivity('create', `Created new Operating note item draft: "${noteTitle}"`);
    }

    setHubNotes(nextNotes);
    persistHubChanges({
      hubNotes: nextNotes,
      hubActivities: hubActivities
    });

    // Reset Form
    setNoteTitle('');
    setNoteDesc('');
    setNoteAttachments([]);
    setShowNoteForm(false);
    setEditingNoteId(null);
  };

  const handleEditNote = (note: AdvancedKnowledgeNote) => {
    setEditingNoteId(note.id);
    setNoteTitle(note.title);
    setNoteDesc(note.description);
    setNoteCat(note.categoryId);
    setNoteAttachments([]);
    setShowNoteForm(true);
  };

  const handleDeleteNote = (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete note "${name}"?`)) return;
    const next = hubNotes.filter(n => n.id !== id);
    setHubNotes(next);
    addHubActivity('delete', `Deleted note "${name}" from Knowledge Base memory.`);
    persistHubChanges({
      hubNotes: next,
      hubActivities: hubActivities
    });
  };

  const handleTogglePinNote = (id: string) => {
    const next = hubNotes.map(n => n.id === id ? { ...n, isPinned: !n.isPinned } : n);
    setHubNotes(next);
    persistHubChanges({ hubNotes: next });
  };

  const handleToggleFavoriteNote = (id: string) => {
    const next = hubNotes.map(n => n.id === id ? { ...n, isFavorite: !n.isFavorite } : n);
    setHubNotes(next);
    persistHubChanges({ hubNotes: next });
  };

  const handleRestoreRevision = (noteId: string, revision: KnowledgeNoteRevision) => {
    const next = hubNotes.map(n => {
      if (n.id === noteId) {
        return {
          ...n,
          title: revision.title,
          description: revision.description,
          updatedAt: new Date().toISOString(),
          revisions: n.revisions.filter(r => r.version !== revision.version)
        };
      }
      return n;
    });
    setHubNotes(next);
    addHubActivity('edit', `Restored note to previous version "${revision.title}"`);
    persistHubChanges({
      hubNotes: next,
      hubActivities: hubActivities
    });
    alert("Note version restored successfully!");
  };

  const handleAddAttachmentToNoteForm = () => {
    if (!attachmentName.trim()) return;
    const newAttach: KnowledgeAttachment = {
      id: 'at_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
      name: attachmentName.trim(),
      type: attachmentType,
      url: attachmentUrl.trim() || 'https://example.com/mock-receipt.pdf',
      size: '2.4 MB',
      uploadedAt: new Date().toISOString()
    };
    setNoteAttachments([...noteAttachments, newAttach]);
    setAttachmentName('');
    setAttachmentUrl('');
  };

  // ==================== SUPPLIERS CRUD ====================
  const handleSaveSupplier = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supName.trim()) {
      alert("Supplier primary business name is mandatory.");
      return;
    }

    let nextS = [...suppliers];
    if (editingSupplierId) {
      nextS = suppliers.map(s => {
        if (s.id === editingSupplierId) {
          return {
            ...s,
            name: supName.trim(),
            contactPerson: supPerson.trim(),
            phone: supPhone.trim(),
            address: supAddress.trim(),
            productsSupplied: supProd.trim(),
            specialRates: supRates.trim(),
            paymentTerms: supTerms.trim(),
            notes: supNotes.trim(),
            pastIssues: supIssues.trim(),
            isPreferred: supPref
          };
        }
        return s;
      });
      addHubActivity('edit', `Updated supplier records for "${supName}"`);
    } else {
      const newS: SupplierEntry = {
        id: 'sup_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
        name: supName.trim(),
        contactPerson: supPerson.trim(),
        phone: supPhone.trim(),
        address: supAddress.trim(),
        productsSupplied: supProd.trim(),
        specialRates: supRates.trim(),
        paymentTerms: supTerms.trim(),
        notes: supNotes.trim(),
        pastIssues: supIssues.trim(),
        isPreferred: supPref
      };
      nextS = [newS, ...nextS];
      addHubActivity('create', `Created secure directory entry for Supplier: ${supName}`);
    }

    setSuppliers(nextS);
    persistHubChanges({
      hubSuppliers: nextS,
      hubActivities: hubActivities
    });

    // Reset Supplier Form
    setSupName('');
    setSupPerson('');
    setSupPhone('');
    setSupAddress('');
    setSupProd('');
    setSupRates('');
    setSupTerms('');
    setSupNotes('');
    setSupIssues('');
    setSupPref(false);
    setShowSupplierForm(false);
    setEditingSupplierId(null);
  };

  const handleEditSupplier = (s: SupplierEntry) => {
    setEditingSupplierId(s.id);
    setSupName(s.name);
    setSupPerson(s.contactPerson);
    setSupPhone(s.phone);
    setSupAddress(s.address);
    setSupProd(s.productsSupplied);
    setSupRates(s.specialRates);
    setSupTerms(s.paymentTerms);
    setSupNotes(s.notes);
    setSupIssues(s.pastIssues);
    setSupPref(s.isPreferred);
    setShowSupplierForm(true);
  };

  const handleDeleteSupplier = (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete supplier "${name}"?`)) return;
    const next = suppliers.filter(s => s.id !== id);
    setSuppliers(next);
    addHubActivity('delete', `Deleted supplier directory contact "${name}"`);
    persistHubChanges({
      hubSuppliers: next,
      hubActivities: hubActivities
    });
  };

  // ==================== PRODUCTS LIBRARY & PRICE HISTORY CRUD ====================
  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prodName.trim()) {
      alert("Product name is mandatory.");
      return;
    }

    // Parse price history lines
    const parsedHistory = priceHistoryText.split('\n').map(line => {
      const parts = line.split(':');
      if (parts.length === 2) {
        return { month: parts[0].trim(), price: Number(parts[1].trim()) || 0 };
      }
      return null;
    }).filter(p => p !== null) as { month: string; price: number }[];

    let nextP = [...products];
    if (editingProductId) {
      nextP = products.map(p => {
        if (p.id === editingProductId) {
          return {
            ...p,
            productName: prodName.trim(),
            category: prodCat,
            storageInstructions: prodStorage,
            purchaseSources: prodSource,
            supplierDetails: prodSupDetails,
            profitMarginNotes: prodMargin,
            qualityGuidelines: prodQuality,
            seasonalDemandNotes: prodSeasonal,
            priceHistory: parsedHistory
          };
        }
        return p;
      });
      addHubActivity('edit', `Updated library & manual price statistics for "${prodName}"`);
    } else {
      const newP: ProductKnowledgeEntry = {
        id: 'pk_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
        productName: prodName.trim(),
        category: prodCat,
        storageInstructions: prodStorage,
        purchaseSources: prodSource,
        supplierDetails: prodSupDetails,
        profitMarginNotes: prodMargin,
        qualityGuidelines: prodQuality,
        seasonalDemandNotes: prodSeasonal,
        priceHistory: parsedHistory
      };
      nextP = [newP, ...nextP];
      addHubActivity('create', `Added merchandise knowledge checklist details for "${prodName}"`);
    }

    setProducts(nextP);
    persistHubChanges({
      hubProducts: nextP,
      hubActivities: hubActivities
    });

    // Reset Product Form
    setProdName('');
    setProdStorage('');
    setProdSource('');
    setProdSupDetails('');
    setProdMargin('');
    setProdQuality('');
    setProdSeasonal('');
    setPriceHistoryText('January: 800\nFebruary: 850\nMarch: 900');
    setShowProductForm(false);
    setEditingProductId(null);
  };

  const handleEditProduct = (p: ProductKnowledgeEntry) => {
    setEditingProductId(p.id);
    setProdName(p.productName);
    setProdCat(p.category);
    setProdStorage(p.storageInstructions);
    setProdSource(p.purchaseSources);
    setProdSupDetails(p.supplierDetails);
    setProdMargin(p.profitMarginNotes);
    setProdQuality(p.qualityGuidelines);
    setProdSeasonal(p.seasonalDemandNotes);
    const text = p.priceHistory.map(ph => `${ph.month}: ${ph.price}`).join('\n');
    setPriceHistoryText(text);
    setShowProductForm(true);
  };

  const handleDeleteProduct = (id: string, name: string) => {
    if (!confirm(`Are you sure to remove manual price archives & library of "${name}"?`)) return;
    const next = products.filter(p => p.id !== id);
    setProducts(next);
    addHubActivity('delete', `Purged product specifications item detail "${name}"`);
    persistHubChanges({
      hubProducts: next,
      hubActivities: hubActivities
    });
  };

  // ==================== KNOWLEDGE CATEGORIES CRUD ====================
  const handleCreateCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!catNameForm.trim()) return;

    const newCat: KnowledgeCategory = {
      id: 'cat_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
      name: catNameForm.trim(),
      icon: catIconForm,
      color: catColorForm,
      isCustom: true
    };

    const nextC = [...categories, newCat];
    setCategories(nextC);
    addHubActivity('create', `Created custom hub category taxonomy "${catNameForm}"`);
    persistHubChanges({
      hubCategories: nextC,
      hubActivities: hubActivities
    });

    setCatNameForm('');
    setShowCatForm(false);
  };

  const handleDeleteCategory = (id: string, name: string) => {
    if (!confirm(`Do you wish to delete category "${name}"? All related custom assignments will reset.`)) return;
    const next = categories.filter(c => c.id !== id);
    setCategories(next);
    addHubActivity('delete', `Deleted custom categories layout index target "${name}"`);
    persistHubChanges({
      hubCategories: next,
      hubActivities: hubActivities
    });
  };

  // ==================== PLAYBOOKS SOP CRUD ====================
  const handleSavePlaybook = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pbTitle.trim()) return;

    const steps = pbStepsText.split('\n').map(s => s.trim()).filter(s => s.length > 0);
    const newPb: PlaybookEntry = {
      id: 'pb_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
      title: pbTitle.trim(),
      description: pbDesc.trim(),
      steps
    };

    const nextPlaybooks = [...playbooks, newPb];
    setPlaybooks(nextPlaybooks);
    addHubActivity('create', `Authored manual training Operating SOP for staff: "${pbTitle}"`);
    persistHubChanges({
      hubPlaybooks: nextPlaybooks,
      hubActivities: hubActivities
    });

    setPbTitle('');
    setPbDesc('');
    setPbStepsText('');
    setShowPlaybookForm(false);
  };

  const handleDeletePlaybook = (id: string, name: string) => {
    if (!confirm(`Remove Operating Checklist Playbook "${name}"?`)) return;
    const next = playbooks.filter(p => p.id !== id);
    setPlaybooks(next);
    addHubActivity('delete', `Purged employee playbook SOP checklist "${name}"`);
    persistHubChanges({
      hubPlaybooks: next,
      hubActivities: hubActivities
    });
  };

  // ==================== STORE POLICY CRUD ====================
  const handleSavePolicy = (e: React.FormEvent) => {
    e.preventDefault();
    if (!polTitle.trim()) return;

    const newPol: StorePolicy = {
      id: 'pol_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
      title: polTitle.trim(),
      content: polContent.trim(),
      audience: polAudience
    };

    const nextPolicies = [...policies, newPol];
    setPolicies(nextPolicies);
    addHubActivity('create', `Formulated legal store return discount guidelines: "${polTitle}"`);
    persistHubChanges({
      hubPolicies: nextPolicies,
      hubActivities: hubActivities
    });

    setPolTitle('');
    setPolContent('');
    setShowPolicyForm(false);
  };

  const handleDeletePolicy = (id: string, name: string) => {
    if (!confirm(`Do you wish to delete policy: "${name}"?`)) return;
    const next = policies.filter(p => p.id !== id);
    setPolicies(next);
    const nextLogs = addHubActivity('delete', `Deleted policy guidelines draft "${name}"`);
    persistHubChanges({
      hubPolicies: next,
      hubActivities: nextLogs
    });
  };

  // ==================== ANNOUNCEMENTS BOARD CRUD ====================
  const handleSaveAnnouncement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!annTitle.trim()) return;

    const newAnn: AnnouncementEntry = {
      id: 'ann_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
      title: annTitle.trim(),
      content: annContent.trim(),
      priority: annPriority,
      expiryDate: annExpiry || new Date(Date.now() + 86400000 * 7).toISOString(),
      category: annCategory,
      createdAt: new Date().toISOString()
    };

    const nextAnn = [newAnn, ...announcements];
    setAnnouncements(nextAnn);
    addHubActivity('create', `Published urgent internal memo announcement: "${annTitle}"`);
    persistHubChanges({
      hubAnnouncements: nextAnn,
      hubActivities: hubActivities
    });

    setAnnTitle('');
    setAnnContent('');
    setShowAnnForm(false);
  };

  const handleDeleteAnnouncement = (id: string, name: string) => {
    if (!confirm(`Take down active announcement "${name}"?`)) return;
    const next = announcements.filter(a => a.id !== id);
    setAnnouncements(next);
    addHubActivity('delete', `Recalled staff memo announcement board item "${name}"`);
    persistHubChanges({
      hubAnnouncements: next,
      hubActivities: hubActivities
    });
  };

  // ==================== EXPORTS (REAL HIGH-FIDELITY PDF GENERATION) ====================
  const handleExportIndividualPDF = (title: string, info: string) => {
    try {
      const doc = new jsPDF();
      
      // Styling Header Accent
      doc.setFillColor(31, 41, 55); // Dark Slate Grey
      doc.rect(0, 0, 210, 40, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.text("KNOWLEDGE CENTER - OPERATING DOCUMENT", 15, 18);
      
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text(`Generated: ${new Date().toLocaleDateString()} | TS Price Manager Hub`, 15, 30);
      
      doc.setTextColor(31, 41, 55);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.text(title.toUpperCase(), 15, 55);
      
      doc.setDrawColor(229, 231, 235);
      doc.line(15, 60, 195, 60);
      
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(55, 65, 81);
      
      const lines = doc.splitTextToSize(info, 180);
      let yPosition = 70;
      
      for (let i = 0; i < lines.length; i++) {
        if (yPosition > 275) {
          doc.addPage();
          yPosition = 20;
        }
        doc.text(lines[i], 15, yPosition);
        yPosition += 6;
      }
      
      // Footer page marking
      doc.setFontSize(8);
      doc.setTextColor(156, 163, 175);
      doc.text("Confidential Information © TS Price Manager operating procedures.", 15, 285);
      
      doc.save(`${title.toLowerCase().replace(/[^a-z0-9]+/g, '_')}_document.pdf`);
    } catch (error) {
      console.error("Single PDF export failed:", error);
    }
  };

  const handleExportSummaryHubPDF = () => {
    try {
      const doc = new jsPDF();
      let y = 20;

      const checkPageBreak = (neededHeight: number) => {
        if (y + neededHeight > 275) {
          doc.addPage();
          y = 20;
        }
      };

      // General cover top banner styling
      doc.setFillColor(79, 70, 229); // Royal Indigo primary colour
      doc.rect(0, 0, 210, 45, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(20);
      doc.text("BUSINESS OPERATING MANUAL", 15, 20);
      
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text("Complete Knowledge Directory, Suppliers List and Staff Guidelines Catalog", 15, 28);
      doc.text(`Generated on: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()} | TS Price Manager`, 15, 36);

      y = 60;

      // Overview index metrics
      doc.setFillColor(243, 244, 246);
      doc.rect(15, y, 180, 25, 'F');
      doc.setDrawColor(229, 231, 235);
      doc.rect(15, y, 180, 25, 'S');

      doc.setTextColor(31, 41, 55);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text("KNOWLEDGE BASE INDEX METRICS:", 20, y + 8);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text(`- Document Drafts: ${hubNotes.length} articles   - Supplier Profiles: ${suppliers.length} active vendors`, 20, y + 15);
      doc.text(`- Product Specs: ${products.length} entries     - Staff Checklists / Playbooks: ${playbooks.length}`, 20, y + 21);

      y += 35;

      // SECTION 1: Standard Operating Playbooks
      checkPageBreak(30);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.setTextColor(79, 70, 229);
      doc.text("1. STAFF STANDARD OPERATING PROCEDURES (SOP)", 15, y);
      y += 4;
      doc.setDrawColor(79, 70, 229);
      doc.line(15, y, 195, y);
      y += 8;

      if (playbooks.length === 0) {
        doc.setFont("helvetica", "italic");
        doc.setFontSize(10);
        doc.setTextColor(107, 114, 128);
        doc.text("No playbooks defined yet in the store settings.", 15, y);
        y += 10;
      } else {
        playbooks.forEach((pb, idx) => {
          checkPageBreak(30);
          doc.setFont("helvetica", "bold");
          doc.setFontSize(11);
          doc.setTextColor(17, 24, 39);
          doc.text(`${idx + 1}. ${pb.title.toUpperCase()}`, 15, y);
          y += 5;
          
          doc.setFont("helvetica", "normal");
          doc.setFontSize(9.5);
          doc.setTextColor(75, 85, 99);
          const descLines = doc.splitTextToSize(pb.description, 175);
          descLines.forEach((ln: string) => {
            checkPageBreak(6);
            doc.text(ln, 15, y);
            y += 5;
          });

          y += 2;
          pb.steps.forEach((st, sidx) => {
            checkPageBreak(12);
            doc.setFillColor(156, 163, 175);
            doc.ellipse(18, y - 1, 1, 1, 'F');
            doc.setFont("helvetica", "normal");
            doc.setFontSize(9);
            const stepLines = doc.splitTextToSize(st, 170);
            stepLines.forEach((sln: string) => {
              doc.text(sln, 22, y);
              y += 5;
            });
            y += 1;
          });
          y += 4;
        });
      }

      y += 5;

      // SECTION 2: Active Store Policies
      checkPageBreak(30);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.setTextColor(79, 70, 229);
      doc.text("2. STORE RETURN & OPERATING POLICIES", 15, y);
      y += 4;
      doc.setDrawColor(79, 70, 229);
      doc.line(15, y, 195, y);
      y += 8;

      if (policies.length === 0) {
        doc.setFont("helvetica", "italic");
        doc.setFontSize(10);
        doc.setTextColor(107, 114, 128);
        doc.text("No store policies documented yet.", 15, y);
        y += 10;
      } else {
        policies.forEach((pol, idx) => {
          checkPageBreak(25);
          doc.setFont("helvetica", "bold");
          doc.setFontSize(11);
          doc.setTextColor(17, 24, 39);
          doc.text(`${idx + 1}. ${pol.title} [Audience: ${pol.audience.toUpperCase()}]`, 15, y);
          y += 5;

          doc.setFont("helvetica", "normal");
          doc.setFontSize(9);
          doc.setTextColor(75, 85, 99);
          const polLines = doc.splitTextToSize(pol.content, 175);
          polLines.forEach((ln: string) => {
            checkPageBreak(6);
            doc.text(ln, 15, y);
            y += 5;
          });
          y += 4;
        });
      }

      y += 5;

      // SECTION 3: Authorized Suppliers Directory
      checkPageBreak(35);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.setTextColor(79, 70, 229);
      doc.text("3. REGISTERED SUPPLIER & VENDOR DIRECTORY", 15, y);
      y += 4;
      doc.setDrawColor(79, 70, 229);
      doc.line(15, y, 195, y);
      y += 8;

      if (suppliers.length === 0) {
        doc.setFont("helvetica", "italic");
        doc.setFontSize(10);
        doc.setTextColor(107, 114, 128);
        doc.text("No suppliers recorded in the operating database.", 15, y);
        y += 10;
      } else {
        suppliers.forEach((s, idx) => {
          checkPageBreak(30);
          doc.setFont("helvetica", "bold");
          doc.setFontSize(10);
          doc.setTextColor(17, 24, 39);
          doc.text(`${idx + 1}. ${s.name} (Contact: ${s.contactPerson})`, 15, y);
          y += 5;

          doc.setFont("helvetica", "normal");
          doc.setFontSize(8.5);
          doc.setTextColor(75, 85, 99);
          doc.text(`Call: ${s.phone} | Address: ${s.address || 'N/A'}`, 17, y);
          y += 4.5;
          doc.text(`Products: ${s.productsSupplied} | Rates: ${s.specialRates}`, 17, y);
          y += 4.5;
          doc.text(`Terms: ${s.paymentTerms} | Notes: ${s.notes || 'None'}`, 17, y);
          y += 8;
        });
      }

      // SECTION 4: Product Knowledge Cards
      checkPageBreak(35);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.setTextColor(79, 70, 229);
      doc.text("4. SPECIFICATIONS CATALOGUE", 15, y);
      y += 4;
      doc.setDrawColor(79, 70, 229);
      doc.line(15, y, 195, y);
      y += 8;

      if (products.length === 0) {
        doc.setFont("helvetica", "italic");
        doc.setFontSize(10);
        doc.setTextColor(107, 114, 128);
        doc.text("No specifications catalogued yet.", 15, y);
        y += 10;
      } else {
        products.forEach((p, idx) => {
          checkPageBreak(25);
          doc.setFont("helvetica", "bold");
          doc.setFontSize(10);
          doc.setTextColor(17, 24, 39);
          doc.text(`${idx + 1}. ${p.productName} [Category: ${p.category}]`, 15, y);
          y += 5;

          doc.setFont("helvetica", "normal");
          doc.setFontSize(8.5);
          doc.setTextColor(75, 85, 99);
          doc.text(`Primary Source Information: ${p.purchaseSources || p.supplierDetails || 'N/A'}`, 17, y);
          y += 4.5;
          doc.text(`Storage Info: ${p.storageInstructions || 'Standard'} | Target Margin: ${p.profitMarginNotes || 'N/A'}`, 17, y);
          y += 4.5;
          
          const historyStr = p.priceHistory.map(ph => `${ph.month}: ₹${ph.price}`).join(', ');
          doc.text(`Value History: ${historyStr}`, 17, y);
          y += 8;
        });
      }

      // Append standard footer on all pages
      const pageCount = (doc as any).internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(156, 163, 175);
        doc.text(`Page ${i} of ${pageCount} | TS Price Manager Operating Ledger`, 15, 290);
      }

      doc.save(`operating_ledger_${Date.now()}.pdf`);
    } catch (e) {
      console.error("Master PDF Export Failure:", e);
    }
  };

  // ==================== ADVANCED SEARCH REDUCER ====================
  const filteredNotes = useMemo(() => {
    return hubNotes.filter(note => {
      const matchCat = selectedCategoryFilter === 'all' || note.categoryId === selectedCategoryFilter;
      const query = searchQuery.toLowerCase();
      const matchSearch = note.title.toLowerCase().includes(query) || 
                          note.description.toLowerCase().includes(query) ||
                          note.attachments.some(a => a.name.toLowerCase().includes(query));
      return matchCat && matchSearch;
    });
  }, [hubNotes, selectedCategoryFilter, searchQuery]);

  const matchesSuppliers = useMemo(() => {
    if (!searchQuery) return suppliers;
    const q = searchQuery.toLowerCase();
    return suppliers.filter(s => s.name.toLowerCase().includes(q) || s.contactPerson.toLowerCase().includes(q) || s.productsSupplied.toLowerCase().includes(q));
  }, [suppliers, searchQuery]);

  const matchesProducts = useMemo(() => {
    if (!searchQuery) return products;
    const q = searchQuery.toLowerCase();
    return products.filter(p => p.productName.toLowerCase().includes(q) || p.category.toLowerCase().includes(q));
  }, [products, searchQuery]);

  // Quick stats calculations
  const totalEntries = hubNotes.length + suppliers.length + products.length + playbooks.length + policies.length;
  const favoriteNotesCount = hubNotes.filter(n => n.isFavorite || n.isPinned).length;
  const checkStatusPercentage = Math.round(
    ((Object.values(openChecklist).filter(Boolean).length + Object.values(closeChecklist).filter(Boolean).length) / 11) * 100
  ) || 0;

  return (
    <div className="space-y-6 pb-20">
      
      {/* 🏛️ Dashboard Header Info */}
      <div className="bg-gradient-to-tr from-[var(--primary)]/10 to-emerald-500/5 border border-[var(--border)] rounded-[2.5rem] p-6 space-y-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="p-1 px-2.5 bg-emerald-500/10 text-emerald-600 rounded-full text-[10px] font-black uppercase tracking-wider">
                Store Brain Center
              </span>
              <span className="text-[10px] text-[var(--foreground)]/50 font-black tracking-widest uppercase">
                Active Operating Manual
              </span>
            </div>
            <h2 className="text-xl font-black uppercase tracking-tight text-[var(--foreground)]">Business Operating Manual & Knowledge Hub</h2>
            <p className="text-xs text-[var(--foreground)]/60 font-semibold max-w-xl">
              Construct a resilient personal corporate repository holding employee training playbooks, supplier address catalogs, return policies, and product details.
            </p>
          </div>

          <button 
            onClick={handleExportSummaryHubPDF}
            className="flex items-center gap-2 py-2.5 px-5 bg-[var(--primary)] hover:opacity-90 text-white font-extrabold text-[10px] uppercase tracking-wider rounded-2xl shadow-sm transition-all cursor-pointer self-start sm:self-center shrink-0"
          >
            <Download className="w-4 h-4" /> Export Complete Manual
          </button>
        </div>

        {/* Global Summary KPI Blocks */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 pt-2">
          <div className="p-3.5 bg-[var(--card)] rounded-2xl border border-[var(--border)] flex flex-col justify-between">
            <span className="text-[9px] font-black uppercase text-[var(--foreground)]/40 block">Total Cataloged Entries</span>
            <span className="text-2xl font-black text-[var(--primary)] mt-1">{totalEntries}</span>
          </div>

          <div className="p-3.5 bg-[var(--card)] rounded-2xl border border-[var(--border)] flex flex-col justify-between">
            <span className="text-[9px] font-black uppercase text-[var(--foreground)]/40 block">Bookmarked Refs</span>
            <span className="text-2xl font-black text-amber-500 mt-1">{favoriteNotesCount}</span>
          </div>

          <div className="p-3.5 bg-[var(--card)] rounded-2xl border border-[var(--border)] flex flex-col justify-between">
            <span className="text-[9px] font-black uppercase text-[var(--foreground)]/40 block">Suppliers Directory</span>
            <span className="text-2xl font-black text-emerald-500 mt-1">{suppliers.length}</span>
          </div>

          <div className="p-3.5 bg-[var(--card)] rounded-2xl border border-[var(--border)] flex flex-col justify-between">
            <span className="text-[9px] font-black uppercase text-[var(--foreground)]/40 block">Operating Playbooks</span>
            <span className="text-2xl font-black text-violet-500 mt-1">{playbooks.length}</span>
          </div>

          <div className="p-3.5 bg-[var(--card)] rounded-2xl border border-[var(--border)] flex flex-col justify-between col-span-2 md:col-span-1">
            <span className="text-[9px] font-black uppercase text-[var(--foreground)]/40 block">Operational Checklist</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-2xl font-black text-rose-500">{checkStatusPercentage}%</span>
              <span className="text-[8px] font-black block uppercase opacity-60">Finished</span>
            </div>
          </div>
        </div>
      </div>

      {/* 🚀 SUBTAB SELECTION BUTTON DECK */}
      <div className="flex gap-1.5 overflow-x-auto pb-2 scrollbar-none border-b border-[var(--border)]">
        {[
          { id: 'overview', label: 'Dashboard Hub', icon: '🏛️' },
          { id: 'notes', label: 'Document Notes', icon: '✍️' },
          { id: 'procedures', label: 'Playbooks SOP', icon: '⚙️' },
          { id: 'suppliers', label: 'Supplier Directory', icon: '🚚' },
          { id: 'products', label: 'Price References', icon: '📈' },
          { id: 'checklists', label: 'Store Checklist', icon: '✔️' },
          { id: 'policies', label: 'Policy Rules', icon: '🛡️' },
          { id: 'announcements', label: 'Internal Memos', icon: '📢' },
          { id: 'categories', label: 'Categories Layout', icon: '🎨' }
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id as any)}
            className={cn(
              "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer",
              activeTab === t.id 
                ? "bg-[var(--primary)] text-white shadow-md font-black" 
                : "bg-[var(--card)] border border-[var(--border)] text-[var(--foreground)] hover:bg-[var(--foreground)]/[0.03]"
            )}
          >
            <span>{t.icon}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* ==================== SCREEN: OVERVIEW DASHBOARD ==================== */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          
          {/* Business Mode Setup Integration Suggester */}
          <div className="p-5 bg-[var(--card)] border border-[var(--border)] rounded-[2.5rem] space-y-3.5 shadow-sm">
            <div className="flex items-center gap-2">
              <span className="text-base">🧠</span>
              <div>
                <span className="text-[9px] font-black uppercase text-[var(--primary)] tracking-[0.2em] block">Operational Suggestions</span>
                <h3 className="text-xs font-black uppercase text-[var(--foreground)]">Recommended Playbook Pack for {activeMode.toUpperCase()} Modes</h3>
              </div>
            </div>
            <p className="text-[11px] text-[var(--foreground)]/60 font-semibold leading-relaxed">
              Based on your active configuration, load standard industry-leading return frameworks, employee safety briefs, cash drawer guidelines, and logistics checkers.
            </p>
            <button
              onClick={handleApplyBusinessSeedSOP}
              className="py-1.5 px-4 bg-emerald-500 hover:bg-emerald-600 text-white text-[9.5px] font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer self-start block"
            >
              ✓ Seed Standard SOP playbooks
            </button>
          </div>

          {/* Quick Access panel container - bookmarks & pinned notes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-[2rem] p-5 space-y-4 shadow-sm">
              <span className="text-[9px] font-black uppercase text-[var(--primary)] tracking-[0.2em] block">Pinned Operations</span>
              <h3 className="text-sm font-black uppercase text-[var(--foreground)] flex items-center gap-1.5">
                <Star className="w-4 h-4 text-amber-500 fill-amber-500" /> Bookmarks & Pinned Guidelines
              </h3>

              <div className="space-y-2.5">
                {hubNotes.filter(n => n.isPinned || n.isFavorite).length === 0 ? (
                  <p className="text-[11px] text-[var(--foreground)]/40 font-semibold py-4 text-center">No catalog elements bookmarks pinned yet.</p>
                ) : (
                  hubNotes.filter(n => n.isPinned || n.isFavorite).map(note => {
                    const catObj = categories.find(c => c.id === note.categoryId);
                    return (
                      <div 
                        key={note.id} 
                        onClick={() => { setActiveTab('notes'); setSearchQuery(note.title); }}
                        className="p-3 bg-[var(--foreground)]/[0.02] border border-[var(--border)] rounded-xl hover:border-[var(--primary)]/35 transition-all cursor-pointer flex items-center justify-between"
                      >
                        <div className="min-w-0">
                          <span className="text-[9px] font-black uppercase text-[var(--foreground)]/40 block">
                            {catObj?.icon} {catObj?.name}
                          </span>
                          <span className="text-xs font-black uppercase text-[var(--foreground)] block truncate mt-0.5">{note.title}</span>
                          <span className="text-[10px] text-[var(--foreground)]/60 font-medium line-clamp-1">{note.description}</span>
                        </div>
                        <Bookmark className="w-3.5 h-3.5 text-amber-500 fill-amber-500 shrink-0" />
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Quick check checklists */}
            <div className="p-5 bg-[var(--card)] border border-[var(--border)] rounded-[2rem] space-y-4 shadow-sm">
              <span className="text-[9px] font-black uppercase text-rose-500 tracking-[0.2em] block">Quick checklist status</span>
              <h3 className="text-sm font-black uppercase text-[var(--foreground)] flex items-center gap-1.5">
                <CheckSquare className="w-4 h-4 text-rose-500" /> Store Operational Checklists
              </h3>

              <div className="grid grid-cols-2 gap-4 pt-1">
                <div className="space-y-2">
                  <span className="text-[10px] font-black uppercase text-emerald-500 block">🌤️ Opening List</span>
                  <div className="space-y-1.5 text-[11px] font-bold text-[var(--foreground)]/70">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input type="checkbox" checked={openChecklist.storeOpen} onChange={() => handleToggleOpeningTask('storeOpen')} className="rounded border-zinc-300 text-emerald-500" />
                      <span>Open Store</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input type="checkbox" checked={openChecklist.checkStockAlerts} onChange={() => handleToggleOpeningTask('checkStockAlerts')} className="rounded border-zinc-300 text-emerald-500" />
                      <span>Stock Alerts</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input type="checkbox" checked={openChecklist.verifyPrinter} onChange={() => handleToggleOpeningTask('verifyPrinter')} className="rounded border-zinc-300 text-emerald-500" />
                      <span>Printer State</span>
                    </label>
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="text-[10px] font-black uppercase text-rose-500 block">🌙 Closing List</span>
                  <div className="space-y-1.5 text-[11px] font-bold text-[var(--foreground)]/70">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input type="checkbox" checked={closeChecklist.verifySales} onChange={() => handleToggleClosingTask('verifySales')} className="rounded border-zinc-300 text-rose-500" />
                      <span>Tally Revenue</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input type="checkbox" checked={closeChecklist.backupData} onChange={() => handleToggleClosingTask('backupData')} className="rounded border-zinc-300 text-rose-500" />
                      <span>Secure Backup</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input type="checkbox" checked={closeChecklist.closeBills} onChange={() => handleToggleClosingTask('closeBills')} className="rounded border-zinc-300 text-rose-500" />
                      <span>Close Pending</span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="border-t border-[var(--border)] pt-2 flex justify-between items-center text-[10px] text-[var(--foreground)]/50 font-bold uppercase">
                <span>Completed Tasks</span>
                <span>{Object.values(openChecklist).filter(Boolean).length + Object.values(closeChecklist).filter(Boolean).length} / 11 Checked</span>
              </div>
            </div>

          </div>

          {/* Activity trace audit log */}
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-[2rem] p-5 space-y-4 shadow-sm">
            <span className="text-[9px] font-black uppercase text-[var(--primary)] tracking-[0.2em] block">Audit Log History</span>
            <h3 className="text-sm font-black uppercase text-[var(--foreground)] flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-indigo-500" /> Corporate Library Modification Activity logs
            </h3>

            <div className="divide-y divide-[var(--border)] max-h-[220px] overflow-y-auto pr-2">
              {hubActivities.length === 0 ? (
                <p className="text-[11px] text-[var(--foreground)]/40 font-semibold p-4 text-center">No modifications logged yet inside operating directories.</p>
              ) : (
                hubActivities.map(act => (
                  <div key={act.id} className="py-2.5 flex justify-between items-center text-[11.5px] font-bold text-[var(--foreground)]/80">
                    <div className="min-w-0">
                      <span className="text-[8.5px] text-[var(--primary)] uppercase font-black mr-2 block sm:inline">[{act.type.toUpperCase()}]</span>
                      <span className="text-[var(--foreground)]/75 leading-relaxed">{act.detail}</span>
                    </div>
                    <span className="text-[9px] text-[var(--foreground)]/40 font-semibold shrink-0 ml-4">
                      {new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      )}

      {/* ==================== SCREEN: DOCUMENT NOTES SYSTEM ==================== */}
      {activeTab === 'notes' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-[9px] font-black uppercase text-[var(--primary)] tracking-[0.2em] block">Resource Folders</span>
              <h3 className="text-sm font-black uppercase text-[var(--foreground)]">Central Corporate Reference documents list</h3>
            </div>

            <button
              onClick={() => { setShowNoteForm(!showNoteForm); setEditingNoteId(null); setNoteTitle(''); setNoteDesc(''); }}
              className="py-1.5 px-4 bg-[var(--primary)] text-white hover:opacity-95 rounded-xl font-extrabold text-[10px] uppercase tracking-wider flex items-center gap-1 cursor-pointer self-start sm:self-auto shrink-0 transition-all"
            >
              <Plus className="w-4 h-4" /> Create Resource Note
            </button>
          </div>

          {/* Form Create Note inline */}
          {showNoteForm && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-5 bg-[var(--foreground)]/[0.02] border border-[var(--primary)]/30 rounded-[2rem] space-y-4"
            >
              <h4 className="text-xs font-black uppercase text-[var(--primary)] flex items-center gap-1.5">
                <Edit3 className="w-4 h-4" /> Knowledge Manual Document Draft Form
              </h4>

              <form onSubmit={handleSaveNote} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[9px] font-black uppercase text-[var(--foreground)]/60 block mb-1">Document Heading Title</label>
                    <input 
                      type="text" 
                      value={noteTitle}
                      onChange={e => setNoteTitle(e.target.value)}
                      placeholder="e.g. Almond Storage & Transit Procedures"
                      className="w-full bg-[var(--card)] border border-[var(--border)] rounded-xl py-2 px-3 text-xs font-semibold text-foreground focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[9px] font-black uppercase text-[var(--foreground)]/60 block mb-1">Hub Category Taxonomy</label>
                    <select
                      value={noteCat}
                      onChange={e => setNoteCat(e.target.value)}
                      className="w-full bg-[var(--card)] border border-[var(--border)] rounded-xl py-2 px-3 text-xs font-black uppercase text-foreground focus:outline-none"
                    >
                      {categories.map(c => (
                        <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-[9px] font-black uppercase text-[var(--foreground)]/60 block mb-1">Information / Rules Body (Markdown format supported)</label>
                  <textarea 
                    value={noteDesc}
                    onChange={e => setNoteDesc(e.target.value)}
                    rows={5}
                    placeholder="Provide details about quality standards, storage warmth guidelines, employee instructions..."
                    className="w-full bg-[var(--card)] border border-[var(--border)] rounded-xl py-2 px-3 text-xs font-semibold text-foreground focus:outline-none"
                  />
                </div>

                {/* Secure File Reference Uploader Mock */}
                <div className="p-4 bg-[var(--foreground)]/[0.03] border border-[var(--border)] rounded-2xl space-y-2.5">
                  <span className="text-[9px] font-black uppercase text-[var(--foreground)]/50 block">Reference Attachment File Mocker</span>
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                    <input 
                      type="text" 
                      value={attachmentName}
                      onChange={e => setAttachmentName(e.target.value)}
                      placeholder="e.g. GstInvoice_June.pdf"
                      className="w-full bg-[var(--card)] border border-[var(--border)] rounded-lg py-1.5 px-2 text-[10px] font-bold text-foreground"
                    />
                    <select
                      value={attachmentType}
                      onChange={e => setAttachmentType(e.target.value as any)}
                      className="w-full bg-[var(--card)] border border-[var(--border)] rounded-lg py-1.5 px-2 text-[10px] font-black uppercase text-foreground"
                    >
                      <option value="pdf">PDF File</option>
                      <option value="image">Image Attachment</option>
                      <option value="catalog">Catalogue Manual</option>
                      <option value="document">Corporate Doc</option>
                    </select>
                    <input 
                      type="text" 
                      value={attachmentUrl}
                      onChange={e => setAttachmentUrl(e.target.value)}
                      placeholder="Document URI Link"
                      className="w-full bg-[var(--card)] border border-[var(--border)] rounded-lg py-1.5 px-2 text-[10px] font-bold text-foreground"
                    />
                    <button
                      type="button"
                      onClick={handleAddAttachmentToNoteForm}
                      className="py-1 px-3 bg-[var(--primary)]/10 hover:bg-[var(--primary)] text-[var(--primary)] hover:text-white rounded-lg text-[9px] font-black uppercase tracking-wider transition-all"
                    >
                      + Mock File
                    </button>
                  </div>

                  {noteAttachments.length > 0 && (
                    <div className="space-y-1 pl-1 pt-1">
                      <span className="text-[8px] font-black uppercase text-zinc-400 block">Draft Attachments queue</span>
                      {noteAttachments.map((f, index) => (
                        <div key={index} className="text-[10px] text-[var(--foreground)]/65 font-bold flex items-center gap-1 text-emerald-500 font-mono">
                          <span>✓ {f.name} ({f.type})</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button 
                    type="button" 
                    onClick={() => setShowNoteForm(false)}
                    className="py-2 px-4 bg-transparent border border-zinc-300 text-[10.5px] uppercase font-black text-rose-500 rounded-xl"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="py-2 px-5 bg-[var(--primary)] text-white text-[10.5px] uppercase font-black tracking-wider rounded-xl hover:opacity-95"
                  >
                    Save Operational Document
                  </button>
                </div>
              </form>
            </motion.div>
          )}

          {/* Search & Selection filter */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-[var(--foreground)] opacity-40" />
              <input 
                type="text" 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search Corporate Library..."
                className="w-full bg-[var(--card)] border border-[var(--border)] pl-9 pr-3 py-2 text-xs font-semibold rounded-xl text-foreground focus:outline-none"
              />
            </div>
            <select
              value={selectedCategoryFilter}
              onChange={e => setSelectedCategoryFilter(e.target.value)}
              className="bg-[var(--card)] border border-[var(--border)] px-4 py-2 text-xs font-black uppercase text-[var(--foreground)] rounded-xl focus:outline-none"
            >
              <option value="all">📚 All Folders</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
              ))}
            </select>
          </div>

          {/* Note Lists Card loop */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredNotes.length === 0 ? (
              <div className="py-12 text-center col-span-2 border-2 border-dashed border-[var(--border)] rounded-[2.5rem] space-y-1.5">
                <span className="text-3xl block">📖</span>
                <span className="text-xs font-black uppercase tracking-wider text-[var(--foreground)]/40">No entries matched the search query</span>
                <p className="text-[10px] text-[var(--foreground)]/50 font-semibold max-w-xs mx-auto">Create customized records or load business templates to explore checklists.</p>
              </div>
            ) : (
              filteredNotes.map(note => {
                const catObj = categories.find(c => c.id === note.categoryId);
                return (
                  <div 
                    key={note.id} 
                    className="p-5 bg-[var(--card)] border border-[var(--border)] rounded-[2.2rem] hover:border-[var(--primary)]/20 transition-all flex flex-col justify-between"
                  >
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[8.5px] font-black uppercase border border-[var(--border)] bg-[var(--foreground)]/[0.02] px-2.5 py-0.5 rounded-full flex items-center gap-1">
                          <span>{catObj?.icon}</span>
                          <span>{catObj?.name}</span>
                        </span>

                        <div className="flex gap-2">
                          <button onClick={() => handleTogglePinNote(note.id)} className="p-1 hover:bg-[var(--foreground)]/5 rounded" title="Pin draft">
                            <Bookmark className={cn("w-3.5 h-3.5 transition-colors", note.isPinned ? "text-[var(--primary)] fill-[var(--primary)]" : "text-zinc-300")} />
                          </button>
                          <button onClick={() => handleToggleFavoriteNote(note.id)} className="p-1 hover:bg-[var(--foreground)]/5 rounded" title="Favorite">
                            <Star className={cn("w-3.5 h-3.5 transition-colors", note.isFavorite ? "text-amber-500 fill-amber-500" : "text-zinc-300")} />
                          </button>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <h4 className="text-sm font-black uppercase text-[var(--foreground)] tracking-wide">{note.title}</h4>
                        <p className="text-xs text-[var(--foreground)]/65 font-medium leading-relaxed whitespace-pre-wrap">{note.description}</p>
                      </div>

                      {/* Mock Render Attachments inside note */}
                      {note.attachments && note.attachments.length > 0 && (
                        <div className="pt-2 border-t border-[var(--border)] space-y-1.5">
                          <span className="text-[9px] font-black uppercase text-[var(--foreground)]/40 block">Attachments ({note.attachments.length})</span>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                            {note.attachments.map(att => (
                              <button 
                                key={att.id}
                                onClick={() => handleExportIndividualPDF(att.name, note.description)}
                                className="flex items-center gap-1.5 p-1.5 bg-[var(--foreground)]/[0.03] hover:bg-[var(--foreground)]/[0.06] border border-[var(--border)] rounded-lg text-left text-[10.5px] font-black font-mono text-zinc-600 dark:text-zinc-300 hover:text-[var(--primary)]"
                              >
                                <Paperclip className="w-3 h-3 text-[var(--primary)] shrink-0" />
                                <span className="truncate">{att.name}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Revision history check info */}
                      {note.revisions && note.revisions.length > 0 && (
                        <div className="pt-2.5 border-t border-[var(--border)] space-y-1.5">
                          <span className="text-[8px] font-black uppercase text-amber-600 block">Version Changelog History ({note.revisions.length} saves)</span>
                          <div className="space-y-1.5">
                            {note.revisions.map((rev, rIdx) => (
                              <div key={rIdx} className="flex justify-between items-center text-[10px] font-mono text-zinc-500 border-b border-[var(--border)]/30 pb-1.5">
                                <span className="truncate flex items-center gap-1 flex-wrap">
                                  <strong>v{rev.version}</strong>
                                  <span>{rev.title}</span>
                                </span>
                                <button
                                  onClick={() => handleRestoreRevision(note.id, rev)}
                                  className="text-[9px] font-black font-sans uppercase text-[var(--primary)] hover:underline flex items-center gap-0.5 shrink-0 ml-1 cursor-pointer"
                                  title="Restore previous version body"
                                >
                                  <RotateCcw className="w-2.5 h-2.5" /> Restore
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex justify-between items-center border-t border-[var(--border)] pt-3 mt-4 text-[10px] text-zinc-400 font-bold">
                      <button 
                        onClick={() => handleExportIndividualPDF(note.title, note.description)}
                        className="text-[9px] font-sans font-black uppercase text-[var(--primary)] hover:underline flex items-center gap-1"
                      >
                        <Download className="w-3 h-3" /> Get Receipt PDF
                      </button>

                      <div className="flex gap-2">
                        <button onClick={() => handleEditNote(note)} className="p-1 text-zinc-500 hover:text-[var(--primary)] text-[10px] font-bold uppercase cursor-pointer">
                          Edit
                        </button>
                        <button onClick={() => handleDeleteNote(note.id, note.title)} className="p-1 text-rose-500 text-[10px] font-bold uppercase cursor-pointer">
                          Purge
                        </button>
                      </div>
                    </div>

                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ==================== SCREEN: PLAYBOOKS SOP TRAINING ==================== */}
      {activeTab === 'procedures' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-[9px] font-black uppercase text-[var(--primary)] tracking-[0.2em] block">SOP manuals</span>
              <h3 className="text-sm font-black uppercase text-[var(--foreground)]">Staff Onboarding & Operation manual checklists</h3>
            </div>

            <button
              onClick={() => setShowPlaybookForm(!showPlaybookForm)}
              className="py-1.5 px-4 bg-[var(--primary)] text-white hover:opacity-95 rounded-xl font-extrabold text-[10px] uppercase tracking-wider flex items-center gap-1 cursor-pointer shrink-0 transition-all"
            >
              <Plus className="w-4 h-4" /> Add SOP Playbook
            </button>
          </div>

          {showPlaybookForm && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-5 bg-[var(--foreground)]/[0.02] border border-[var(--primary)]/30 rounded-[2rem] space-y-4"
            >
              <h4 className="text-xs font-black uppercase text-[var(--primary)]">Create Standard Operating Procedures Playbook (SOP)</h4>
              <form onSubmit={handleSavePlaybook} className="space-y-3">
                <div>
                  <label className="text-[9px] font-black uppercase text-[var(--foreground)]/60 block mb-1">Playbook SOP Title</label>
                  <input 
                    type="text" 
                    value={pbTitle} 
                    onChange={e => setPbTitle(e.target.value)} 
                    placeholder="e.g. Closing cash register tally routine" 
                    className="w-full bg-[var(--card)] border border-[var(--border)] rounded-xl py-2 px-3 text-xs font-semibold text-foreground" 
                  />
                </div>
                <div>
                  <label className="text-[9px] font-black uppercase text-[var(--foreground)]/60 block mb-1">SOP brief target description</label>
                  <input 
                    type="text" 
                    value={pbDesc} 
                    onChange={e => setPbDesc(e.target.value)} 
                    placeholder="Brief of who performs this step and when..." 
                    className="w-full bg-[var(--card)] border border-[var(--border)] rounded-xl py-2 px-3 text-xs font-semibold text-foreground" 
                  />
                </div>
                <div>
                  <label className="text-[9px] font-black uppercase text-[var(--foreground)]/60 block mb-1">Steps List (Provide each checking index on a new line)</label>
                  <textarea 
                    value={pbStepsText} 
                    onChange={e => setPbStepsText(e.target.value)} 
                    rows={4} 
                    placeholder="Step 1: Check printer paper spool level\nStep 2: Turn off primary server ports\nStep 3: Export transaction reports safely" 
                    className="w-full bg-[var(--card)] border border-[var(--border)] rounded-xl py-2 px-3 text-xs font-semibold text-foreground" 
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  <button type="submit" className="py-1.5 px-4 bg-[var(--primary)] text-white text-[10px] font-black uppercase tracking-wider rounded-lg">Save Playbook</button>
                </div>
              </form>
            </motion.div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {playbooks.map(pb => (
              <div key={pb.id} className="p-5 bg-[var(--card)] border border-[var(--border)] rounded-[2.2rem] space-y-4 shadow-sm relative hover:border-[var(--primary)]/20 transition-all">
                <div className="space-y-1 pr-6">
                  <span className="text-[8px] font-black uppercase tracking-wider text-[var(--primary)] px-2 py-0.5 bg-[var(--primary)]/10 rounded-full border border-[var(--primary)]/15">
                    Standard Operating Procedure
                  </span>
                  <h4 className="text-sm font-black uppercase text-[var(--foreground)] tracking-wide mt-1.5">{pb.title}</h4>
                  <p className="text-[10.5px] text-[var(--foreground)]/60 font-semibold leading-relaxed">{pb.description}</p>
                </div>

                <div className="space-y-2 pt-1 border-t border-[var(--border)]">
                  <span className="text-[8.5px] font-black uppercase text-zinc-400 block">Required SOP steps:</span>
                  <ol className="text-[11px] font-semibold text-[var(--foreground)]/80 space-y-2 list-decimal pl-4">
                    {pb.steps.map((st, sidx) => (
                      <li key={sidx} className="leading-relaxed pl-1">{st}</li>
                    ))}
                  </ol>
                </div>

                <div className="border-t border-[var(--border)] pt-3 flex justify-between items-center text-[10px]">
                  <button 
                    onClick={() => handleExportIndividualPDF(pb.title, pb.steps.join('\n'))}
                    className="text-[9px] font-black uppercase text-[var(--primary)] hover:underline flex items-center gap-1"
                  >
                    <Download className="w-3 h-3" /> Get SOP PDF
                  </button>
                  <button 
                    onClick={() => handleDeletePlaybook(pb.id, pb.title)} 
                    className="text-[9px] font-black uppercase text-rose-500 hover:underline cursor-pointer"
                  >
                    Delete Playbook
                  </button>
                </div>
              </div>
            ))}
          </div>

        </div>
      )}

      {/* ==================== SCREEN: SUPPLIER DIRECTORY ==================== */}
      {activeTab === 'suppliers' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-[9px] font-black uppercase text-[var(--primary)] tracking-[0.2em] block">Supply Chain</span>
              <h3 className="text-sm font-black uppercase text-[var(--foreground)]">Merchant & Wholesaler Contact Directory</h3>
            </div>

            <button
              onClick={() => { setShowSupplierForm(!showSupplierForm); setEditingSupplierId(null); }}
              className="py-1.5 px-4 bg-[var(--primary)] text-white hover:opacity-95 rounded-xl font-extrabold text-[10px] uppercase tracking-wider flex items-center gap-1 cursor-pointer shrink-0 transition-all"
            >
              <Plus className="w-4 h-4" /> Add Supplier Account
            </button>
          </div>

          {/* Supplier create Form */}
          {showSupplierForm && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-5 bg-[var(--foreground)]/[0.02] border border-[var(--primary)]/30 rounded-[2rem] space-y-4"
            >
              <h4 className="text-xs font-black uppercase text-[var(--primary)]">Supplier Account Directory Profile Card</h4>
              <form onSubmit={handleSaveSupplier} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-[9px] font-black uppercase text-[var(--foreground)]/60 block mb-1">Company / Firm Name</label>
                  <input type="text" value={supName} onChange={e => setSupName(e.target.value)} placeholder="e.g. Vardhaman Traders Ltd." className="w-full bg-[var(--card)] border border-[var(--border)] rounded-xl py-2 px-3 text-xs font-semibold text-foreground" />
                </div>
                <div>
                  <label className="text-[9px] font-black uppercase text-[var(--foreground)]/60 block mb-1">Contact Person Name</label>
                  <input type="text" value={supPerson} onChange={e => setSupPerson(e.target.value)} placeholder="e.g. Rajesh Kumar" className="w-full bg-[var(--card)] border border-[var(--border)] rounded-xl py-2 px-3 text-xs font-semibold text-foreground" />
                </div>
                <div>
                  <label className="text-[9px] font-black uppercase text-[var(--foreground)]/60 block mb-1">Mobile / WhatsApp No.</label>
                  <input type="text" value={supPhone} onChange={e => setSupPhone(e.target.value)} placeholder="+91 99118 82233" className="w-full bg-[var(--card)] border border-[var(--border)] rounded-xl py-2 px-3 text-xs font-semibold text-foreground" />
                </div>
                <div className="sm:col-span-3">
                  <label className="text-[9px] font-black uppercase text-[var(--foreground)]/60 block mb-1">Office Street Address</label>
                  <input type="text" value={supAddress} onChange={e => setSupAddress(e.target.value)} placeholder="Plot 42, Gunj Market Sector 3, Hub" className="w-full bg-[var(--card)] border border-[var(--border)] rounded-xl py-2 px-3 text-xs font-semibold text-foreground" />
                </div>
                <div>
                  <label className="text-[9px] font-black uppercase text-[var(--foreground)]/60 block mb-1">Supplied Products list</label>
                  <input type="text" value={supProd} onChange={e => setSupProd(e.target.value)} placeholder="Cashews, Badam premium, resins" className="w-full bg-[var(--card)] border border-[var(--border)] rounded-xl py-2 px-3 text-xs font-semibold text-foreground" />
                </div>
                <div>
                  <label className="text-[9px] font-black uppercase text-[var(--foreground)]/60 block mb-1">Special Wholesale Rates / Margins</label>
                  <input type="text" value={supRates} onChange={e => setSupRates(e.target.value)} placeholder="Badam: ₹780/kg, Pista: ₹950/kg" className="w-full bg-[var(--card)] border border-[var(--border)] rounded-xl py-2 px-3 text-xs font-semibold text-foreground" />
                </div>
                <div>
                  <label className="text-[9px] font-black uppercase text-[var(--foreground)]/60 block mb-1">Standard Payment Terms</label>
                  <input type="text" value={supTerms} onChange={e => setSupTerms(e.target.value)} placeholder="Net 30, Credit Limit 50k" className="w-full bg-[var(--card)] border border-[var(--border)] rounded-xl py-2 px-3 text-xs font-semibold text-foreground" />
                </div>
                <div className="sm:col-span-3">
                  <label className="text-[9px] font-black uppercase text-[var(--foreground)]/60 block mb-1">Disputes, Past Logistics issues or Credit notes</label>
                  <input type="text" value={supIssues} onChange={e => setSupIssues(e.target.value)} placeholder="Delays on monsoon festivals, verify weight counters before print." className="w-full bg-[var(--card)] border border-[var(--border)] rounded-xl py-2 px-3 text-xs font-semibold text-foreground" />
                </div>
                <div className="sm:col-span-3 flex items-center gap-2">
                  <input type="checkbox" id="supPrefChk" checked={supPref} onChange={e => setSupPref(e.target.checked)} className="rounded text-[var(--primary)]" />
                  <label htmlFor="supPrefChk" className="text-[10.5px] font-black uppercase text-[var(--foreground)]/70 select-none cursor-pointer">Mark as Preferred Supplier Partner</label>
                </div>
                <div className="sm:col-span-3 flex justify-end gap-2 pt-2">
                  <button type="submit" className="py-2 px-5 bg-[var(--primary)] text-white text-[10.5px] uppercase font-black rounded-xl">Save Supplier Profile</button>
                </div>
              </form>
            </motion.div>
          )}

          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-[var(--foreground)] opacity-40" />
              <input 
                type="text" 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search direct suppliers..."
                className="w-full bg-[var(--card)] border border-[var(--border)] pl-9 pr-3 py-2 text-xs font-semibold rounded-xl text-foreground focus:outline-none"
              />
            </div>
          </div>

          <div className="space-y-4">
            {matchesSuppliers.length === 0 ? (
              <p className="py-12 bg-[var(--card)] border border-[var(--border)] rounded-[2rem] text-center text-[11px] font-bold text-zinc-400">No Supplier records cataloged yet.</p>
            ) : (
              matchesSuppliers.map(s => (
                <div key={s.id} className={cn("p-5 bg-[var(--card)] border rounded-[2.2rem] shadow-sm space-y-4", s.isPreferred ? "border-emerald-500/20 bg-emerald-500/[0.01]" : "border-[var(--border)]")}>
                  <div className="flex justify-between items-start gap-4">
                    <div className="space-y-1 sm:space-y-0 text-left">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xl">🏢</span>
                        <h4 className="text-sm font-black uppercase text-[var(--foreground)] tracking-wide">{s.name}</h4>
                        {s.isPreferred && <span className="text-[8.5px] font-black uppercase bg-emerald-500 text-white px-2 py-0.5 rounded-full">Preferred Partner</span>}
                      </div>
                      <div className="flex items-center gap-4 text-[10.5px] text-[var(--foreground)]/50 font-bold flex-wrap pt-1 pl-1">
                        <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5 text-[var(--primary)]" /> Contact: {s.contactPerson}</span>
                        <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5 text-emerald-500" /> WhatsApp: {s.phone}</span>
                        <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-rose-500" /> {s.address}</span>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button onClick={() => handleEditSupplier(s)} className="p-1.5 text-zinc-500 hover:text-[var(--primary)] text-[10.5px] uppercase font-black">Edit</button>
                      <button onClick={() => handleDeleteSupplier(s.id, s.name)} className="p-1.5 text-rose-500 text-[10.5px] uppercase font-black">Delete</button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 border-t border-[var(--border)] pt-3 text-[11px] font-semibold text-[var(--foreground)]/70 pl-1">
                    <div>
                      <span className="text-[8.5px] font-black uppercase text-zinc-400 block pb-0.5">Supplies Materials</span>
                      <span>{s.productsSupplied || 'All dry fruits'}</span>
                    </div>
                    <div>
                      <span className="text-[8.5px] font-black uppercase text-zinc-400 block pb-0.5">Rates / Guidelines</span>
                      <span>{s.specialRates || 'Bulk margin 12% off standard catalog'}</span>
                    </div>
                    <div>
                      <span className="text-[8.5px] font-black uppercase text-zinc-400 block pb-0.5">Payment Terms Cap</span>
                      <span>{s.paymentTerms || 'Net 30, limit ₹50k max'}</span>
                    </div>
                  </div>

                  {s.pastIssues && (
                    <div className="p-3 bg-rose-500/[0.02] border border-rose-500/10 rounded-xl flex items-start gap-1.5 text-[10.5px] font-bold text-[var(--foreground)]/70">
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
                      <span><strong>Historical Note:</strong> {s.pastIssues}</span>
                    </div>
                  )}

                  <div className="flex justify-end border-t border-[var(--border)]/70 pt-2.5">
                    <button 
                      onClick={() => handleExportIndividualPDF(s.name, `Supplier Details: ${s.name}\nContact: ${s.contactPerson}\nPhone: ${s.phone}\nRates: ${s.specialRates}\nTerms: ${s.paymentTerms}`)}
                      className="text-[9px] font-black uppercase text-[var(--primary)] hover:underline flex items-center gap-1"
                    >
                      <Download className="w-3 h-3" /> Get Supplier Directory PDF
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ==================== SCREEN: PRODUCT LIBRARY & MANUAL PRICE HISTORY ==================== */}
      {activeTab === 'products' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-[9px] font-black uppercase text-[var(--primary)] tracking-[0.2em] block">Merchandise Archive</span>
              <h3 className="text-sm font-black uppercase text-[var(--foreground)]">Product Specifications & Price Ledger</h3>
            </div>

            <button
              onClick={() => { setShowProductForm(!showProductForm); setEditingProductId(null); }}
              className="py-1.5 px-4 bg-[var(--primary)] text-white hover:opacity-95 rounded-xl font-extrabold text-[10px] uppercase tracking-wider flex items-center gap-1 cursor-pointer shrink-0 transition-all"
            >
              <Plus className="w-4 h-4" /> Add Product Specs
            </button>
          </div>

          {/* Form write specs library */}
          {showProductForm && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-5 bg-[var(--foreground)]/[0.02] border border-[var(--primary)]/30 rounded-[2rem] space-y-4"
            >
              <h4 className="text-xs font-black uppercase text-[var(--primary)]">Product Technical Knowledge & Pricing History Form</h4>
              <form onSubmit={handleSaveProduct} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[9px] font-black uppercase text-[var(--foreground)]/60 block mb-1">Merchandise Name</label>
                  <input type="text" value={prodName} onChange={e => setProdName(e.target.value)} placeholder="e.g. Almonds Premium California" className="w-full bg-[var(--card)] border border-[var(--border)] rounded-xl py-2 px-3 text-xs font-semibold text-foreground" />
                </div>
                <div>
                  <label className="text-[9px] font-black uppercase text-[var(--foreground)]/60 block mb-1">Catalog Group</label>
                  <input type="text" value={prodCat} onChange={e => setProdCat(e.target.value)} placeholder="Dry Fruits / Spices / Kirana" className="w-full bg-[var(--card)] border border-[var(--border)] rounded-xl py-2 px-3 text-xs font-semibold text-foreground" />
                </div>
                <div>
                  <label className="text-[9px] font-black uppercase text-[var(--foreground)]/60 block mb-1">Storage guidelines & Warming controls</label>
                  <input type="text" value={prodStorage} onChange={e => setProdStorage(e.target.value)} placeholder="Keep dry, optimal temp below 15°C" className="w-full bg-[var(--card)] border border-[var(--border)] rounded-xl py-2 px-3 text-xs font-semibold text-foreground" />
                </div>
                <div>
                  <label className="text-[9px] font-black uppercase text-[var(--foreground)]/60 block mb-1">Purchase Sources / Vendor Names</label>
                  <input type="text" value={prodSource} onChange={e => setProdSource(e.target.value)} placeholder="Agra Depot, Vardhaman Traders, Direct Farms" className="w-full bg-[var(--card)] border border(--border) rounded-xl py-2 px-3 text-xs font-semibold text-foreground" />
                </div>
                <div>
                  <label className="text-[9px] font-black uppercase text-[var(--foreground)]/60 block mb-1">Detailed Quality Guidelines</label>
                  <input type="text" value={prodQuality} onChange={e => setProdQuality(e.target.value)} placeholder="Size 22-24 per ounce, moisture below 6%" className="w-full bg-[var(--card)] border border-[var(--border)] rounded-xl py-2 px-3 text-xs font-semibold text-foreground" />
                </div>
                <div>
                  <label className="text-[9px] font-black uppercase text-[var(--foreground)]/60 block mb-1">Seasonal Demand patterns</label>
                  <input type="text" value={prodSeasonal} onChange={e => setProdSeasonal(e.target.value)} placeholder="High volumes in Diwali & wedding months" className="w-full bg-[var(--card)] border border-[var(--border)] rounded-xl py-2 px-3 text-xs font-semibold text-foreground" />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-[9px] font-black uppercase text-[var(--foreground)]/60 block mb-1">Historical Manual Price Reference lists (Format: Month: Price - one per line)</label>
                  <textarea 
                    value={priceHistoryText} 
                    onChange={e => setPriceHistoryText(e.target.value)} 
                    rows={3} 
                    placeholder="January: 800\nFebruary: 820" 
                    className="w-full bg-[var(--card)] border border-[var(--border)] rounded-xl py-2 px-3 text-xs font-semibold text-foreground" 
                  />
                </div>
                <div className="sm:col-span-2 flex justify-end">
                  <button type="submit" className="py-2 px-5 bg-[var(--primary)] text-white text-[10.5px] uppercase font-black rounded-xl">Save Product Knowledge Card</button>
                </div>
              </form>
            </motion.div>
          )}

          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-[var(--foreground)] opacity-40" />
              <input 
                type="text" 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search specs sheets & reference logs..."
                className="w-full bg-[var(--card)] border border-[var(--border)] pl-9 pr-3 py-2 text-xs font-semibold rounded-xl text-foreground focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {matchesProducts.length === 0 ? (
              <p className="py-12 bg-[var(--card)] border border-[var(--border)] text-zinc-400 font-bold text-center col-span-2 rounded-[2rem] text-xs">No specifications recorded yet.</p>
            ) : (
              matchesProducts.map(p => (
                <div key={p.id} className="p-5 bg-[var(--card)] border border-[var(--border)] rounded-[2.2rem] shadow-sm space-y-4 hover:border-[var(--primary)]/20 transition-all text-left">
                  <div className="flex justify-between items-start gap-4">
                    <div className="space-y-0.5">
                      <span className="text-[8.5px] font-black uppercase text-[var(--primary)] bg-[var(--primary)]/10 px-2 py-0.5 rounded-full border border-[var(--primary)]/15">
                        {p.category}
                      </span>
                      <h4 className="text-sm font-black uppercase tracking-wide text-[var(--foreground)] mt-2">{p.productName}</h4>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleEditProduct(p)} className="text-[10px] uppercase font-black text-zinc-400 hover:text-[var(--primary)]">Edit</button>
                      <button onClick={() => handleDeleteProduct(p.id, p.productName)} className="text-[10px] uppercase font-black text-rose-500">Purge</button>
                    </div>
                  </div>

                  <div className="text-[11px] font-semibold text-[var(--foreground)]/70 space-y-2 pt-1 border-t border-[var(--border)]">
                    <p>🚿 <strong>Storage Guide:</strong> {p.storageInstructions || 'Dry, cool storage, keep away from ground levels'}</p>
                    <p>🚜 <strong>Transit Sources:</strong> {p.purchaseSources || 'Vardhaman Bulk Agro, Agra central deck'}</p>
                    <p>🏆 <strong>Quality Marks:</strong> {p.qualityGuidelines || 'Moisture check limit 5%, size 22 average'}</p>
                    {p.seasonalDemandNotes && <p>🍂 <strong>Seasonal Demand:</strong> {p.seasonalDemandNotes}</p>}
                  </div>

                  {/* Manual price references list display */}
                  {p.priceHistory && p.priceHistory.length > 0 && (
                    <div className="pt-3 border-t border-[var(--border)] space-y-1.5">
                      <span className="text-[9px] font-black uppercase text-amber-500 block">Manual Price History reference:</span>
                      <div className="grid grid-cols-3 gap-2 bg-[var(--foreground)]/[0.01] p-2 border border-[var(--border)] rounded-xl text-center">
                        {p.priceHistory.map((ph, phIdx) => (
                          <div key={phIdx} className="text-[10.5px] font-bold">
                            <span className="text-[8px] text-zinc-400 block uppercase font-black">{ph.month}</span>
                            <span className="text-[var(--foreground)]/75">₹{ph.price} <span className="text-[7.5px] font-black font-sans uppercase">/kg</span></span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex justify-between items-center border-t border-[var(--border)] pt-2.5">
                    <button 
                      onClick={() => handleExportIndividualPDF(p.productName, `Specifications: ${p.productName}\nCategory: ${p.category}\nStorage: ${p.storageInstructions}\nPrice History:\n${p.priceHistory.map(ph=>`${ph.month}: ₹${ph.price}`).join('\n')}`)}
                      className="text-[9px] font-black uppercase text-[var(--primary)] hover:underline flex items-center gap-1"
                    >
                      <Download className="w-3 h-3" /> Get specs sheet PDF
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ==================== SCREEN: STORE OPENING/CLOSING OPERATIONAL CHECKLISTS ==================== */}
      {activeTab === 'checklists' && (
        <div className="space-y-6">
          <div className="p-1 px-2.5 bg-rose-500/10 text-rose-500 rounded-full text-[9px] font-black uppercase tracking-wider self-start inline-block">
            Standard Daily Registers
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Opening Register Card */}
            <div className="p-6 bg-[var(--card)] border border-[var(--border)] rounded-[2.5rem] space-y-4 shadow-sm text-left">
              <div className="pb-3 border-b border-[var(--border)]">
                <span className="text-[9px] font-black uppercase text-emerald-500 tracking-[0.22em] block">Daily Shop Start Checklist</span>
                <h4 className="text-sm font-black uppercase text-[var(--foreground)]">🌤️ Store Opening Checkpoints checklist</h4>
              </div>

              <div className="space-y-3 pt-2">
                {[
                  { key: 'storeOpen', label: 'Unlock the main store shutters & clean active cash desk counters.' },
                  { key: 'checkStockAlerts', label: 'Monitor active Low Stock warnings inside automation rule logs.' },
                  { key: 'verifyPrinter', label: 'Send dry test script print layouts to thermal receipt device.' },
                  { key: 'checkUdhar', label: 'Verify high overdue customer balance warning cards.' },
                  { key: 'reviewSales', label: 'Examine yesterday sales & targets registers to design shift cash caps.' }
                ].map((item) => (
                  <label 
                    key={`open-chk-${item.key}`} 
                    className="p-3.5 bg-[var(--foreground)]/[0.01] border border-[var(--border)] hover:border-emerald-500/20 rounded-2xl flex items-start gap-3 transition-all cursor-pointer select-none"
                  >
                    <input 
                      type="checkbox" 
                      className="rounded border-zinc-300 text-emerald-500 w-4 h-4 mt-0.5 shrink-0" 
                      checked={openChecklist[item.key as keyof typeof openChecklist]} 
                      onChange={() => handleToggleOpeningTask(item.key as any)}
                    />
                    <div className="space-y-0.5 min-w-0">
                      <span className="text-xs font-black uppercase tracking-wide text-[var(--foreground)] flex items-center gap-1.5">
                        {item.key.replace(/([A-Z])/g, ' $1')}
                        {openChecklist[item.key as keyof typeof openChecklist] && <span className="text-[8.5px] font-black text-emerald-500 uppercase">Passed</span>}
                      </span>
                      <p className="text-[10.5px] text-[var(--foreground)]/60 font-semibold leading-relaxed">{item.label}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Closing Register Card */}
            <div className="p-6 bg-[var(--card)] border border-[var(--border)] rounded-[2.5rem] space-y-4 shadow-sm text-left">
              <div className="pb-3 border-b border-[var(--border)]">
                <span className="text-[9px] font-black uppercase text-rose-500 tracking-[0.22em] block">Shift End Safeguards</span>
                <h4 className="text-sm font-black uppercase text-[var(--foreground)]">🌙 Store Closing Checkpoints checklist</h4>
              </div>

              <div className="space-y-3 pt-2">
                {[
                  { key: 'verifySales', label: 'Sum ultimate physical collection drawers cash notes.' },
                  { key: 'checkProfit', label: 'Deduct core cost value prices to evaluate net estimated shift earnings.' },
                  { key: 'verifyStockChanges', label: 'Cross check manual receipt registers with computer database counts.' },
                  { key: 'backupData', label: 'Initiate 1-Click offline Local browser backup snapshot backup file.' },
                  { key: 'closeBills', label: 'Check pending holds or drafts on checkout boards.' },
                  { key: 'verifyPrinterStatus', label: 'De-energize key power outlets and printer chargers.' }
                ].map((item) => (
                  <label 
                    key={`close-chk-${item.key}`} 
                    className="p-3.5 bg-[var(--foreground)]/[0.01] border border-[var(--border)] hover:border-rose-500/20 rounded-2xl flex items-start gap-3 transition-all cursor-pointer select-none"
                  >
                    <input 
                      type="checkbox" 
                      className="rounded border-zinc-300 text-rose-500 w-4 h-4 mt-0.5 shrink-0" 
                      checked={closeChecklist[item.key as keyof typeof closeChecklist]} 
                      onChange={() => handleToggleClosingTask(item.key as any)}
                    />
                    <div className="space-y-0.5 min-w-0">
                      <span className="text-xs font-black uppercase tracking-wide text-[var(--foreground)] flex items-center gap-1.5">
                        {item.key.replace(/([A-Z])/g, ' $1')}
                        {closeChecklist[item.key as keyof typeof closeChecklist] && <span className="text-[8.5px] font-black text-rose-500 uppercase">Passed</span>}
                      </span>
                      <p className="text-[10.5px] text-[var(--foreground)]/60 font-semibold leading-relaxed">{item.label}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ==================== SCREEN: POLICIES RULES ==================== */}
      {activeTab === 'policies' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-[9px] font-black uppercase text-[var(--primary)] tracking-[0.2em] block">Store Guidelines</span>
              <h3 className="text-sm font-black uppercase text-[var(--foreground)]">Corporate Policy Center</h3>
            </div>

            <button
              onClick={() => setShowPolicyForm(!showPolicyForm)}
              className="py-1.5 px-4 bg-[var(--primary)] text-white hover:opacity-95 rounded-xl font-extrabold text-[10px] uppercase tracking-wider flex items-center gap-1 cursor-pointer shrink-0 transition-all"
            >
              <Plus className="w-4 h-4" /> Create Policy Rule
            </button>
          </div>

          {showPolicyForm && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-5 bg-[var(--foreground)]/[0.02] border border-[var(--primary)]/30 rounded-[2rem] space-y-4"
            >
              <h4 className="text-xs font-black uppercase text-[var(--primary)]">Store Policies & Return Guidelines Form</h4>
              <form onSubmit={handleSavePolicy} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[9px] font-black uppercase text-[var(--foreground)]/60 block mb-1">Policy Title Rule</label>
                  <input type="text" value={polTitle} onChange={e => setPolTitle(e.target.value)} placeholder="e.g. 7-Day dry product refund rules" className="w-full bg-[var(--card)] border border-[var(--border)] rounded-xl py-2 px-3 text-xs font-semibold text-foreground" />
                </div>
                <div>
                  <label className="text-[9px] font-black uppercase text-[var(--foreground)]/60 block mb-1">Policy Target Audience</label>
                  <select value={polAudience} onChange={e => setPolAudience(e.target.value as any)} className="w-full bg-[var(--card)] border border-[var(--border)] rounded-xl py-2 px-3 text-xs font-black uppercase text-foreground">
                    <option value="all">Everyone (Customer & Staff)</option>
                    <option value="customer">Customers Only</option>
                    <option value="employee">Internal Employees Only</option>
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="text-[9px] font-black uppercase text-[var(--foreground)]/60 block mb-1">Detailed policy statements</label>
                  <textarea value={polContent} onChange={e => setPolContent(e.target.value)} rows={4} placeholder="Refund checks, replacement bags, credit udhar limits buffer guidelines detail..." className="w-full bg-[var(--card)] border border-[var(--border)] rounded-xl py-2 px-3 text-xs font-semibold text-foreground" />
                </div>
                <div className="sm:col-span-2 flex justify-end">
                  <button type="submit" className="py-2 px-5 bg-[var(--primary)] text-white text-[10.5px] uppercase font-black rounded-xl">Save Brand Policy</button>
                </div>
              </form>
            </motion.div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {policies.length === 0 ? (
              <p className="py-12 bg-[var(--card)] border border-[var(--border)] text-center text-zinc-400 font-bold col-span-2 text-xs rounded-[2rem]">No policy models cataloged yet.</p>
            ) : (
              policies.map(pol => (
                <div key={pol.id} className="p-5 bg-[var(--card)] border border-[var(--border)] rounded-[2.2rem] space-y-4 shadow-sm text-left hover:border-[var(--primary)]/20 transition-all">
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <span className={cn(
                        "text-[8.5px] font-black uppercase px-2.5 py-0.5 rounded-full border",
                        pol.audience === 'customer' ? "bg-cyan-500/10 text-cyan-500 border-cyan-500/15" :
                        pol.audience === 'employee' ? "bg-indigo-500/10 text-indigo-500 border-indigo-500/15" :
                        "bg-zinc-500/10 text-zinc-500 border-zinc-500/15"
                      )}>
                        Audience: {pol.audience}
                      </span>
                      <h4 className="text-sm font-black uppercase tracking-wide text-[var(--foreground)] mt-2">{pol.title}</h4>
                    </div>
                    <button onClick={() => handleDeletePolicy(pol.id, pol.title)} className="text-[10px] font-black uppercase text-rose-500 hover:rose-600">Delete</button>
                  </div>

                  <p className="text-xs text-[var(--foreground)]/65 font-medium leading-relaxed bg-[var(--foreground)]/[0.01] p-3 rounded-2xl border border-[var(--border)] whitespace-pre-wrap">{pol.content}</p>

                  <div className="flex justify-between items-center border-t border-[var(--border)] pt-2.5 text-[10px]">
                    <button 
                      onClick={() => handleExportIndividualPDF(pol.title, pol.content)}
                      className="text-[9px] font-black uppercase text-[var(--primary)] hover:underline flex items-center gap-1"
                    >
                      <Download className="w-3 h-3" /> Get Policy PDF
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ==================== SCREEN: ANNOUNCEMENTS BOARD ==================== */}
      {activeTab === 'announcements' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-[9px] font-black uppercase text-[var(--primary)] tracking-[0.2em] block">Notice Desk</span>
              <h3 className="text-sm font-black uppercase text-[var(--foreground)]">Store Announcement Memo Board</h3>
            </div>

            <button
              onClick={() => setShowAnnForm(!showAnnForm)}
              className="py-1.5 px-4 bg-[var(--primary)] text-white hover:opacity-95 rounded-xl font-extrabold text-[10px] uppercase tracking-wider flex items-center gap-1 cursor-pointer shrink-0 transition-all"
            >
              <Plus className="w-4 h-4" /> Publish Announcement
            </button>
          </div>

          {showAnnForm && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-5 bg-[var(--foreground)]/[0.02] border border-[var(--primary)]/30 rounded-[2rem] space-y-4"
            >
              <h4 className="text-xs font-black uppercase text-[var(--primary)]">Publish Store Staff Announcement Memo Form</h4>
              <form onSubmit={handleSaveAnnouncement} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[9px] font-black uppercase text-[var(--foreground)]/60 block mb-1">Notice Heading Title</label>
                  <input type="text" value={annTitle} onChange={e => setAnnTitle(e.target.value)} placeholder="e.g. Grain Cargo delays under heavy monsoon schedules" className="w-full bg-[var(--card)] border border-[var(--border)] rounded-xl py-2 px-3 text-xs font-semibold text-foreground" />
                </div>
                <div>
                  <label className="text-[9px] font-black uppercase text-[var(--foreground)]/60 block mb-1">Notice Category / Tag</label>
                  <input type="text" value={annCategory} onChange={e => setAnnCategory(e.target.value)} placeholder="e.g. Cargo, Staff Meeting, Off-days" className="w-full bg-[var(--card)] border border-[var(--border)] rounded-xl py-2 px-3 text-xs font-semibold text-foreground" />
                </div>
                <div>
                  <label className="text-[9px] font-black uppercase text-[var(--foreground)]/60 block mb-1">Priority Alert Level</label>
                  <select value={annPriority} onChange={e => setAnnPriority(e.target.value as any)} className="w-full bg-[var(--card)] border border-[var(--border)] rounded-xl py-2 px-3 text-xs font-black uppercase text-foreground">
                    <option value="high">🔴 High Alarm Urgent</option>
                    <option value="medium">🟡 Medium warning</option>
                    <option value="low">🟢 Normal memo</option>
                  </select>
                </div>
                <div>
                  <label className="text-[9px] font-black uppercase text-[var(--foreground)]/60 block mb-1">Memo Expiry Date</label>
                  <input type="date" value={annExpiry} onChange={e => setAnnExpiry(e.target.value)} className="w-full bg-[var(--card)] border border-[var(--border)] rounded-xl py-2 px-3 text-xs font-semibold text-foreground" />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-[9px] font-black uppercase text-[var(--foreground)]/60 block mb-1">Announcement Body detail details</label>
                  <textarea value={annContent} onChange={e => setAnnContent(e.target.value)} rows={3} placeholder="Provide instructions about pricing drops, supplier visits, or local holiday schedules..." className="w-full bg-[var(--card)] border border-[var(--border)] rounded-xl py-2 px-3 text-xs font-semibold text-foreground" />
                </div>
                <div className="sm:col-span-2 flex justify-end">
                  <button type="submit" className="py-2 px-5 bg-[var(--primary)] text-white text-[10.5px] uppercase font-black rounded-xl">Publish Announcement Memo</button>
                </div>
              </form>
            </motion.div>
          )}

          <div className="space-y-4">
            {announcements.length === 0 ? (
              <p className="py-12 bg-[var(--card)] border border-[var(--border)] rounded-[2rem] text-center text-zinc-400 font-bold text-xs">No announcements broadcasted yet.</p>
            ) : (
              announcements.map(ann => (
                <div key={ann.id} className={cn("p-5 bg-[var(--card)] border rounded-[2.2rem] shadow-sm space-y-3 text-left", ann.priority === 'high' ? "border-rose-500/20 bg-rose-500/[0.01]" : "border-[var(--border)]")}>
                  <div className="flex justify-between items-start gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={cn(
                          "text-[8px] font-black uppercase px-2.5 py-0.5 rounded-full border",
                          ann.priority === 'high' ? "bg-rose-500/15 text-rose-500 border-rose-500/20" :
                          ann.priority === 'medium' ? "bg-amber-500/15 text-amber-500 border-amber-500/20" :
                          "bg-emerald-500/15 text-emerald-500 border-emerald-500/20"
                        )}>
                          {ann.priority} Notice
                        </span>
                        <span className="text-[9px] text-[var(--foreground)]/50 font-bold bg-[var(--foreground)]/[0.04] border border-[var(--border)] px-2 py-0.5 rounded-full lowercase">
                          tag: #{ann.category}
                        </span>
                      </div>
                      <h4 className="text-sm font-black uppercase text-[var(--foreground)] tracking-wide mt-1.5">{ann.title}</h4>
                      <p className="text-xs text-[var(--foreground)]/65 font-medium leading-relaxed">{ann.content}</p>
                    </div>

                    <button onClick={() => handleDeleteAnnouncement(ann.id, ann.title)} className="text-[10px] uppercase font-black text-rose-500">Purge</button>
                  </div>

                  <div className="border-t border-[var(--border)] pt-2 flex justify-between items-center text-[9.5px] text-zinc-400 font-bold">
                    <span>Broadcast: {new Date(ann.createdAt).toLocaleDateString()}</span>
                    <span>Active Expires: {new Date(ann.expiryDate).toLocaleDateString()}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ==================== SCREEN: CATEGORIES CUSTOMIZER LAYOUT ==================== */}
      {activeTab === 'categories' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-[9px] font-black uppercase text-[var(--primary)] tracking-[0.2em] block">Taxonomy Desk</span>
              <h3 className="text-sm font-black uppercase text-[var(--foreground)]">Knowledge Hub Custom categories customizer</h3>
            </div>

            <button
              onClick={() => setShowCatForm(!showCatForm)}
              className="py-1.5 px-4 bg-[var(--primary)] text-white hover:opacity-95 rounded-xl font-extrabold text-[10px] uppercase tracking-wider flex items-center gap-1 cursor-pointer shrink-0 transition-all"
            >
              <Plus className="w-4 h-4" /> Create Category Folder
            </button>
          </div>

          {showCatForm && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-5 bg-[var(--foreground)]/[0.02] border border-[var(--primary)]/30 rounded-[2rem] space-y-4"
            >
              <h4 className="text-xs font-black uppercase text-[var(--primary)]">Dynamic Taxonomy Category Map creation</h4>
              <form onSubmit={handleCreateCategory} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-[9px] font-black uppercase text-[var(--foreground)]/60 block mb-1">Category Folder name</label>
                  <input type="text" value={catNameForm} onChange={e => setCatNameForm(e.target.value)} placeholder="e.g. Legal documents" className="w-full bg-[var(--card)] border border-[var(--border)] rounded-xl py-2 px-3 text-xs font-semibold text-foreground" />
                </div>
                <div>
                  <label className="text-[9px] font-black uppercase text-[var(--foreground)]/60 block mb-1">Pick Icon / Mascot</label>
                  <input type="text" value={catIconForm} onChange={e => setCatIconForm(e.target.value)} placeholder="📁" className="w-full bg-[var(--card)] border border-[var(--border)] rounded-xl py-2 px-3 text-xs font-semibold text-foreground" />
                </div>
                <div>
                  <label className="text-[9px] font-black uppercase text-[var(--foreground)]/60 block mb-1">Color Palette (Hex code)</label>
                  <input type="color" value={catColorForm} onChange={e => setCatColorForm(e.target.value)} className="w-full h-10 bg-[var(--card)] border border-[var(--border)] rounded-xl px-1.5" />
                </div>
                <div className="sm:col-span-3 flex justify-end">
                  <button type="submit" className="py-2 px-5 bg-[var(--primary)] text-white text-[10.5px] uppercase font-black rounded-xl">Save Category Class</button>
                </div>
              </form>
            </motion.div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5">
            {categories.map(c => (
              <div 
                key={c.id} 
                className="p-4 bg-[var(--card)] border border-[var(--border)] rounded-[2rem] flex flex-col justify-between items-start gap-4 relative transition-all"
                style={{ borderLeft: `5px solid ${c.color || '#3b82f6'}` }}
              >
                <div className="space-y-1 text-left">
                  <span className="text-2xl block">{c.icon || '📁'}</span>
                  <span className="text-xs font-black uppercase tracking-wide text-[var(--foreground)] block mt-2">{c.name}</span>
                </div>

                {c.isCustom && (
                  <button 
                    onClick={() => handleDeleteCategory(c.id, c.name)}
                    className="absolute top-2 right-2 p-1 hover:bg-rose-500/10 text-rose-500 rounded-lg transition-all cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
