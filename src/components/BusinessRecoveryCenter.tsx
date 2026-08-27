import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, Trash2, RotateCcw, ShieldCheck, History, Settings, CheckCircle2, 
  AlertTriangle, RefreshCw, Layers, Users, TrendingUp, Info, Clock, Calendar,
  Shield, Edit3, ArrowUpRight, Check, X, Sliders, ChevronDown
} from 'lucide-react';
import { RecoveryService, RecoveryRecord, AuditLog, PriceStockRecord } from '../services/recoveryService';
import { AppState, Item, Category, UdharCustomer, UdharTransaction, Bill } from '../types';

interface BusinessRecoveryCenterProps {
  state: AppState;
  t: any;
  onUpdateState: (updates: Partial<AppState>, actionLabel?: string) => void;
  onUpdateSettings: (updates: any) => void;
}

export default function BusinessRecoveryCenter({ 
  state, 
  t, 
  onUpdateState, 
  onUpdateSettings 
}: BusinessRecoveryCenterProps) {
  // --- STATE ---
  const [activeTab, setActiveTab] = useState<'dashboard' | 'products' | 'categories' | 'customers' | 'bills' | 'price_stock' | 'settings_points' | 'audit_log'>('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [retentionDays, setRetentionDays] = useState<number>(state.settings.scheduledBackupEnabled ? 30 : 15);
  const [loading, setLoading] = useState(false);
  const [alertMsg, setAlertMsg] = useState<{ type: 'success' | 'err'; text: string } | null>(null);

  // Recovery databases loaded from service
  const [recoveryRecords, setRecoveryRecords] = useState<RecoveryRecord[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [priceStockHistory, setPriceStockHistory] = useState<PriceStockRecord[]>([]);

  // Selection for bulk restore
  const [selectedRecordIds, setSelectedRecordIds] = useState<string[]>([]);

  // --- RECONCILE DATA ---
  useEffect(() => {
    loadData();
    // Run automated cleanup of expired data on load
    RecoveryService.cleanExpiredRecords(state.user?.uid || null).then(() => {
      // Re-load if cleanup removed any records
      loadData();
    });
  }, [state.user, activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await RecoveryService.syncAndFetchRecoveryData(state.user?.uid || null);
      setRecoveryRecords(data.recoveryRecords);
      setAuditLogs(data.auditLogs);
      setPriceStockHistory(data.priceStockHistory);
    } catch (e) {
      console.error("Failed to load recovery records", e);
    } finally {
      setLoading(false);
    }
  };

  const handleShowAlert = (text: string, type: 'success' | 'err' = 'success') => {
    setAlertMsg({ type, text });
    setTimeout(() => setAlertMsg(null), 4000);
  };

  // --- CALCULATE SUMMARY COUNTS ---
  const summary = useMemo(() => {
    const products = recoveryRecords.filter(r => r.type === 'product');
    const categories = recoveryRecords.filter(r => r.type === 'category');
    const customers = recoveryRecords.filter(r => r.type === 'customer');
    const suppliers = recoveryRecords.filter(r => r.type === 'supplier');
    const bills = recoveryRecords.filter(r => r.type === 'bill');
    const settings = recoveryRecords.filter(r => r.type === 'settings_point');

    return {
      productsCount: products.length,
      categoriesCount: categories.length,
      customersCount: customers.length,
      suppliersCount: suppliers.length,
      billsCount: bills.length,
      settingsCount: settings.length,
      recentChanges: auditLogs.length,
    };
  }, [recoveryRecords, auditLogs]);

  // --- FILTERED LISTS FOR DISPLAY ---
  const filteredRecords = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return recoveryRecords.filter(rec => {
      const matchSearch = q === '' || 
        rec.title.toLowerCase().includes(q) || 
        rec.subtitle.toLowerCase().includes(q) ||
        rec.type.toLowerCase().includes(q);

      if (activeTab === 'products') return rec.type === 'product' && matchSearch;
      if (activeTab === 'categories') return rec.type === 'category' && matchSearch;
      if (activeTab === 'customers') return (rec.type === 'customer' || rec.type === 'supplier') && matchSearch;
      if (activeTab === 'bills') return rec.type === 'bill' && matchSearch;
      if (activeTab === 'settings_points') return rec.type === 'settings_point' && matchSearch;
      return false;
    });
  }, [recoveryRecords, activeTab, searchQuery]);

  const filteredPriceStock = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return priceStockHistory.filter(hist => {
      return q === '' || hist.productName.toLowerCase().includes(q) || hist.type.toLowerCase().includes(q);
    });
  }, [priceStockHistory, searchQuery]);

  const filteredAuditLogs = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return auditLogs.filter(log => {
      return q === '' || 
        log.entityName.toLowerCase().includes(q) || 
        log.actionType.toLowerCase().includes(q) ||
        log.entityType.toLowerCase().includes(q) ||
        log.userEmail.toLowerCase().includes(q);
    });
  }, [auditLogs, searchQuery]);

  // --- RESTORE OPERATIONS ---

  const handleRestoreProduct = async (record: RecoveryRecord) => {
    try {
      const restoredItem = record.originalData as Item;
      
      // Prevent duplicates in active items
      const exists = state.items.some(i => i.id === restoredItem.id);
      if (exists) {
        handleShowAlert(`"${restoredItem.name}" already exists in the active catalog.`, 'err');
        return;
      }

      const updatedItems = [restoredItem, ...state.items];
      
      // Update global application state
      onUpdateState({ items: updatedItems }, `Restored Product: ${restoredItem.name}`);

      // Delete from recovery database
      await RecoveryService.deletePermanently(state.user?.uid || null, record.id);
      
      // Refresh local view
      setRecoveryRecords(prev => prev.filter(r => r.id !== record.id));
      handleShowAlert(`Successfully restored "${restoredItem.name}" with its stock metrics.`);
    } catch (e) {
      handleShowAlert("Failed to complete restore routine.", "err");
    }
  };

  const handleRestoreCategory = async (record: RecoveryRecord) => {
    try {
      const restoredCat = record.originalData as Category;
      const categoriesList = state.settings.customCategories || [];

      if (categoriesList.some(c => c.id === restoredCat.id)) {
        handleShowAlert(`Category "${restoredCat.name}" is already active.`, 'err');
        return;
      }

      const updated = [restoredCat, ...categoriesList];
      onUpdateSettings({ customCategories: updated });

      // Audit Log
      await RecoveryService.logAudit(
        state.user?.uid || null,
        state.user?.email || 'Store Owner',
        'restore',
        'category',
        restoredCat.name,
        'N/A',
        'Category Restored'
      );

      // Clean recovery record
      await RecoveryService.deletePermanently(state.user?.uid || null, record.id);
      setRecoveryRecords(prev => prev.filter(r => r.id !== record.id));
      handleShowAlert(`Category "${restoredCat.name}" successfully re-established.`);
    } catch (e) {
      handleShowAlert("Failed to restore category.", "err");
    }
  };

  const handleRestoreCustomer = async (record: RecoveryRecord) => {
    try {
      const data = record.originalData;
      const customer = data.customer as UdharCustomer;
      const ledger = data.ledger as UdharTransaction[];

      const activeCustomers = state.udharCustomers || [];
      const activeTransactions = state.udharTransactions || [];

      if (activeCustomers.some(c => c.id === customer.id)) {
        handleShowAlert(`Customer "${customer.name}" already exists.`, 'err');
        return;
      }

      onUpdateState({
        udharCustomers: [customer, ...activeCustomers],
        udharTransactions: [...ledger, ...activeTransactions]
      }, `Restored Customer: ${customer.name}`);

      await RecoveryService.deletePermanently(state.user?.uid || null, record.id);
      setRecoveryRecords(prev => prev.filter(r => r.id !== record.id));
      handleShowAlert(`Restored Customer account "${customer.name}" along with ${ledger.length} credit logs.`);
    } catch (e) {
      handleShowAlert("Failed to restore customer account.", "err");
    }
  };

  const handleRestoreSupplier = async (record: RecoveryRecord) => {
    try {
      const supplier = record.originalData;
      const currentSuppliers = (state.settings as any).hubSuppliers || [];

      if (currentSuppliers.some((s: any) => s.id === supplier.id)) {
        handleShowAlert(`Supplier "${supplier.name}" already exists.`, 'err');
        return;
      }

      onUpdateSettings({ hubSuppliers: [supplier, ...currentSuppliers] });

      await RecoveryService.deletePermanently(state.user?.uid || null, record.id);
      setRecoveryRecords(prev => prev.filter(r => r.id !== record.id));
      handleShowAlert(`Restored Supplier details for "${supplier.name}".`);
    } catch (e) {
      handleShowAlert("Failed to restore supplier details.", "err");
    }
  };

  const handleRestoreBill = async (record: RecoveryRecord) => {
    try {
      const bill = record.originalData as Bill;
      const activeGenBills = state.bills || [];

      if (activeGenBills.some(b => b.id === bill.id)) {
        handleShowAlert(`Bill #${bill.billNumber} already exists.`, 'err');
        return;
      }

      onUpdateState({
        bills: [bill, ...activeGenBills]
      }, `Restored Bill: #${bill.billNumber}`);

      await RecoveryService.deletePermanently(state.user?.uid || null, record.id);
      setRecoveryRecords(prev => prev.filter(r => r.id !== record.id));
      handleShowAlert(`Bill #${bill.billNumber} successfully recovered! All transactional indicators rebuilt.`);
    } catch (e) {
      handleShowAlert("Failed to restore bill record.", "err");
    }
  };

  const handleRestoreSettingsPoint = async (record: RecoveryRecord) => {
    try {
      const backupSettings = record.originalData;
      onUpdateSettings(backupSettings);

      await RecoveryService.logAudit(
        state.user?.uid || null,
        state.user?.email || 'Store Owner',
        'restore',
        'settings',
        record.title,
        'N/A',
        'Restored Configuration Settings'
      );

      handleShowAlert(`Business preferences restored to snapshot point: "${record.title}".`);
    } catch (e) {
      handleShowAlert("Failed to restore configuration settings.", "err");
    }
  };

  const handleRestorePrice = async (record: PriceStockRecord) => {
    try {
      const targetItem = state.items.find(i => i.id === record.productId);
      if (!targetItem) {
        handleShowAlert("The active product is no longer in your catalogue.", "err");
        return;
      }

      const updatedItems = state.items.map(i => {
        if (i.id === record.productId) {
          return { ...i, retailPrice: record.previousVal, lastUpdated: new Date().toISOString() };
        }
        return i;
      });

      onUpdateState({ items: updatedItems }, `Reverted price of ${record.productName} to ₹${record.previousVal}`);
      
      // Log edit
      await RecoveryService.recordPriceStockChange(
        state.user?.uid || null,
        record.productId,
        record.productName,
        'price',
        record.newVal,
        record.previousVal,
        state.user?.email || 'Store Owner'
      );

      handleShowAlert(`Reverted price of "${record.productName}" back to original value of ₹${record.previousVal}.`);
    } catch (e) {
      handleShowAlert("Failed to revert price value.", 'err');
    }
  };

  const handleRestoreStock = async (record: PriceStockRecord) => {
    try {
      const targetItem = state.items.find(i => i.id === record.productId);
      if (!targetItem) {
        handleShowAlert("The product is no longer active in catalogue.", "err");
        return;
      }

      const updatedItems = state.items.map(i => {
        if (i.id === record.productId) {
          return { ...i, quantity: record.previousVal, lastUpdated: new Date().toISOString() };
        }
        return i;
      });

      onUpdateState({ items: updatedItems }, `Reverted stock size of ${record.productName} to ${record.previousVal}`);

      // Log adjustments
      await RecoveryService.recordPriceStockChange(
        state.user?.uid || null,
        record.productId,
        record.productName,
        'stock',
        record.newVal,
        record.previousVal,
        state.user?.email || 'Store Owner'
      );

      handleShowAlert(`Adjusted stock size of "${record.productName}" to original ${record.previousVal} Units.`);
    } catch (e) {
      handleShowAlert("Failed to reconcile stock count.", 'err');
    }
  };

  // --- BULK RESTORE ENGINE ---

  const handleToggleSelectAll = () => {
    if (selectedRecordIds.length === filteredRecords.length) {
      setSelectedRecordIds([]);
    } else {
      setSelectedRecordIds(filteredRecords.map(r => r.id));
    }
  };

  const handleToggleSelectRecord = (id: string) => {
    setSelectedRecordIds(prev => 
      prev.includes(id) ? prev.filter(rId => rId !== id) : [...prev, id]
    );
  };

  const handleBulkRestore = async () => {
    if (selectedRecordIds.length === 0) return;
    setLoading(true);
    let successCount = 0;

    const itemsToProcess = filteredRecords.filter(r => selectedRecordIds.includes(r.id));
    
    for (const record of itemsToProcess) {
      try {
        if (record.type === 'product') {
          const restoredItem = record.originalData as Item;
          if (!state.items.some(i => i.id === restoredItem.id)) {
            state.items.unshift(restoredItem);
            await RecoveryService.deletePermanently(state.user?.uid || null, record.id);
            successCount++;
          }
        } else if (record.type === 'category') {
          const restoredCat = record.originalData as Category;
          const current = state.settings.customCategories || [];
          if (!current.some(c => c.id === restoredCat.id)) {
            current.unshift(restoredCat);
            onUpdateSettings({ customCategories: current });
            await RecoveryService.deletePermanently(state.user?.uid || null, record.id);
            successCount++;
          }
        } else if (record.type === 'customer') {
          const customer = record.originalData.customer as UdharCustomer;
          const ledger = record.originalData.ledger as UdharTransaction[];
          const currentCustomers = state.udharCustomers || [];
          const currentTxs = state.udharTransactions || [];
          
          if (!currentCustomers.some(c => c.id === customer.id)) {
            onUpdateState({
              udharCustomers: [customer, ...currentCustomers],
              udharTransactions: [...ledger, ...currentTxs]
            });
            await RecoveryService.deletePermanently(state.user?.uid || null, record.id);
            successCount++;
          }
        } else if (record.type === 'bill') {
          const bill = record.originalData as Bill;
          const currentBills = state.bills || [];
          if (!currentBills.some(b => b.id === bill.id)) {
            state.bills?.unshift(bill);
            await RecoveryService.deletePermanently(state.user?.uid || null, record.id);
            successCount++;
          }
        }
      } catch (err) {
        console.error("Bulk restore error for record " + record.id, err);
      }
    }

    // Force flush state update
    onUpdateState({
      items: [...state.items],
      bills: state.bills ? [...state.bills] : []
    }, `Bulk restored ${successCount} business elements`);

    setSelectedRecordIds([]);
    await loadData();
    setLoading(false);
    handleShowAlert(`Successfully executed bulk recovery: ${successCount} items returned to active dataset.`);
  };

  const handleBulkPermanentDelete = async () => {
    if (selectedRecordIds.length === 0) return;
    if (!confirm(`Warning: You are permanently wiping out ${selectedRecordIds.length} recovered logs. This action cannot be undone.`)) {
      return;
    }
    
    setLoading(true);
    for (const id of selectedRecordIds) {
      await RecoveryService.deletePermanently(state.user?.uid || null, id);
    }
    setSelectedRecordIds([]);
    await loadData();
    setLoading(false);
    handleShowAlert(`Removed ${selectedRecordIds.length} entities permanently from safety archives.`);
  };

  // Manual Trigger to save Configuration checkpoint
  const handleTriggerManualCheckpoint = async () => {
    const titleObj = prompt("Name this backup checkpoint:", `Configuration_${new Date().toLocaleDateString()}`);
    if (!titleObj) return;

    setLoading(true);
    await RecoveryService.createSettingsBackup(
      state.user?.uid || null,
      state.settings,
      titleObj,
      state.user?.email || 'Store Owner',
      retentionDays
    );
    await loadData();
    setLoading(false);
    handleShowAlert(`Manual Settings Checkpoint "${titleObj}" stored successfully!`);
  };

  const handleSingleDeletePermanently = async (record: RecoveryRecord) => {
    if (!confirm(`Delete ${record.title} permanently from Recovery archives?`)) return;
    await RecoveryService.deletePermanently(state.user?.uid || null, record.id);
    setRecoveryRecords(prev => prev.filter(r => r.id !== record.id));
    handleShowAlert(`Permanently erased "${record.title}".`);
  };

  // Retention days updater
  const handleUpdateRetentionPolicy = (days: number) => {
    setRetentionDays(days);
    onUpdateSettings({ scheduledBackupEnabled: days === 30 }); // map to high density config metric if active
    handleShowAlert(`Retention policy configured: keeping security dumps for ${days} days.`);
  };

  // Check for expired/warnings count on active tab
  const getTabBadge = (type: string) => {
    if (type === 'all') return recoveryRecords.length;
    return recoveryRecords.filter(r => r.type === type).length;
  };

  return (
    <div className="space-y-6 text-slate-100 max-w-4xl mx-auto">
      {/* 🔮 Recovery Alert Panel */}
      <AnimatePresence>
        {alertMsg && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-8 left-1/2 -translate-x-1/2 z-[150] px-6 py-3.5 rounded-2xl flex items-center gap-3 shadow-2xl border ${
              alertMsg.type === 'success' 
                ? 'bg-emerald-950/90 border-emerald-500/30 text-emerald-400' 
                : 'bg-rose-950/90 border-rose-500/30 text-rose-400'
            }`}
          >
            {alertMsg.type === 'success' ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
            <span className="text-xs font-black uppercase tracking-wider">{alertMsg.text}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 🏵️ HEADER BOX */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 relative overflow-hidden backdrop-blur-md">
        <div className="absolute top-0 right-0 p-8 opacity-5">
          <Shield size={120} />
        </div>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="p-1 px-2.5 bg-emerald-500/10 text-emerald-400 text-[9px] font-black uppercase tracking-widest rounded-full border border-emerald-500/20">
                Continuous Protection
              </span>
              {loading && <RefreshCw size={12} className="animate-spin text-slate-400" />}
            </div>
            <h1 className="text-2xl font-black uppercase tracking-tight text-white flex items-center gap-2.5">
              <ShieldCheck className="text-emerald-500" size={26} /> Business Recovery Center
            </h1>
            <p className="text-xs text-slate-400 max-w-lg leading-relaxed">
              Automated safety net for store owners. Mistakes, accidental deletes, unauthorized stock edits, category overrides, and wrong price values can be reviewed, reversed, and recovered.
            </p>
          </div>
          
          <div className="flex flex-wrap gap-2 pt-2 md:pt-0">
            <button 
              onClick={handleTriggerManualCheckpoint}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-[10px] uppercase font-black tracking-widest transition-all cursor-pointer flex items-center gap-2 shadow-lg"
            >
              <History size={13} /> Save Restore Point
            </button>
            <button 
              onClick={loadData}
              title="Manual sync"
              className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-all"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            </button>
          </div>
        </div>
      </div>

      {/* 📊 SUMMARY TILES (BENTO GRID STYLE) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
        <div 
          onClick={() => setActiveTab('products')}
          className={`p-4 rounded-2xl bg-slate-900/30 border border-slate-800 hover:border-emerald-500/40 transition-all cursor-pointer text-left space-y-2 ${activeTab === 'products' ? 'ring-2 ring-emerald-500/50 bg-slate-900/60' : ''}`}
        >
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-[10px] uppercase font-black tracking-wider">Products</span>
            <Layers size={14} className="text-emerald-400" />
          </div>
          <p className="text-xl font-black text-white">{summary.productsCount}</p>
          <span className="text-[9px] text-slate-500 block">Available For Restore</span>
        </div>

        <div 
          onClick={() => setActiveTab('categories')}
          className={`p-4 rounded-2xl bg-slate-900/30 border border-slate-800 hover:border-amber-400/40 transition-all cursor-pointer text-left space-y-2 ${activeTab === 'categories' ? 'ring-2 ring-amber-400/50 bg-slate-900/60' : ''}`}
        >
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-[10px] uppercase font-black tracking-wider">Categories</span>
            <Sliders size={14} className="text-amber-400" />
          </div>
          <p className="text-xl font-black text-white">{summary.categoriesCount}</p>
          <span className="text-[9px] text-slate-500 block">Available For Restore</span>
        </div>

        <div 
          onClick={() => setActiveTab('customers')}
          className={`p-4 rounded-2xl bg-slate-900/30 border border-slate-800 hover:border-blue-400/40 transition-all cursor-pointer text-left space-y-2 ${activeTab === 'customers' ? 'ring-2 ring-blue-400/50 bg-slate-900/60' : ''}`}
        >
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-[10px] uppercase font-black tracking-wider">Accounts</span>
            <Users size={14} className="text-blue-400" />
          </div>
          <p className="text-xl font-black text-white">{summary.customersCount + summary.suppliersCount}</p>
          <span className="text-[9px] text-slate-500 block">Customers & Suppliers</span>
        </div>

        <div 
          onClick={() => setActiveTab('bills')}
          className={`p-4 rounded-2xl bg-slate-900/30 border border-slate-800 hover:border-rose-400/40 transition-all cursor-pointer text-left space-y-2 ${activeTab === 'bills' ? 'ring-2 ring-rose-400/50 bg-slate-900/60' : ''}`}
        >
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-[10px] uppercase font-black tracking-wider">Deleted Bills</span>
            <TrendingUp size={14} className="text-rose-400" />
          </div>
          <p className="text-xl font-black text-white">{summary.billsCount}</p>
          <span className="text-[9px] text-slate-500 block">Recoverable Invoices</span>
        </div>

        <div 
          onClick={() => setActiveTab('settings_points')}
          className={`p-4 rounded-2xl bg-slate-900/30 border border-slate-800 hover:border-indigo-400/40 transition-all cursor-pointer text-left col-span-2 sm:col-span-1 space-y-2 ${activeTab === 'settings_points' ? 'ring-2 ring-indigo-400/50 bg-slate-900/60' : ''}`}
        >
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-[10px] uppercase font-black tracking-wider">Snapshots</span>
            <Settings size={14} className="text-indigo-400" />
          </div>
          <p className="text-xl font-black text-white">{summary.settingsCount}</p>
          <span className="text-[9px] text-slate-500 block">Configuration Points</span>
        </div>
      </div>

      {/* SEARCH AND CONTROL ROW */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        {/* Sub-navigation items */}
        <div className="flex bg-slate-900 border border-slate-800 p-1 rounded-2xl gap-0.5 overflow-x-auto w-full sm:w-auto scrollbar-none">
          <button 
            onClick={() => { setActiveTab('dashboard'); setSelectedRecordIds([]); }}
            className={`px-3.5 py-2 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer whitespace-nowrap ${activeTab === 'dashboard' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}
          >
            Dashboard
          </button>
          <button 
            onClick={() => { setActiveTab('products'); setSelectedRecordIds([]); }}
            className={`px-3.5 py-2 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer whitespace-nowrap ${activeTab === 'products' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}
          >
            Products
          </button>
          <button 
            onClick={() => { setActiveTab('categories'); setSelectedRecordIds([]); }}
            className={`px-3.5 py-2 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer whitespace-nowrap ${activeTab === 'categories' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}
          >
            Categories
          </button>
          <button 
            onClick={() => { setActiveTab('customers'); setSelectedRecordIds([]); }}
            className={`px-3.5 py-2 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer whitespace-nowrap ${activeTab === 'customers' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}
          >
            Accounts
          </button>
          <button 
            onClick={() => { setActiveTab('bills'); setSelectedRecordIds([]); }}
            className={`px-3.5 py-2 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer whitespace-nowrap ${activeTab === 'bills' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}
          >
            Bills
          </button>
          <button 
            onClick={() => { setActiveTab('price_stock'); setSelectedRecordIds([]); }}
            className={`px-3.5 py-2 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer whitespace-nowrap ${activeTab === 'price_stock' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}
          >
            Edit History
          </button>
          <button 
            onClick={() => { setActiveTab('audit_log'); setSelectedRecordIds([]); }}
            className={`px-3.5 py-2 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer whitespace-nowrap ${activeTab === 'audit_log' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}
          >
            Audit Log
          </button>
        </div>

        {/* Search */}
        {activeTab !== 'dashboard' && (
          <div className="relative w-full sm:w-64">
            <input 
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search records..."
              className="w-full bg-slate-900 border border-slate-800 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-white focus:border-indigo-500 outline-none transition-all placeholder-slate-500"
            />
            <Search className="absolute left-3.5 top-3.5 text-slate-500" size={14} />
          </div>
        )}
      </div>

      {/* --- DASHBOARD VIEW --- */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* EXPIRY SETTINGS CARD */}
            <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-6 md:col-span-1 space-y-4">
              <div className="flex items-center gap-2 text-indigo-400">
                <Clock size={16} />
                <h3 className="text-xs font-black uppercase tracking-wider text-white">Data Retention Policy</h3>
              </div>
              <p className="text-[11px] text-slate-400 leading-normal">
                Determine how long deleted entities, change histories, and audit logs are kept in archives before being automatically permanently erased.
              </p>
              
              <div className="space-y-1.5 pt-2">
                {[7, 15, 30, 60, 90].map((days) => (
                  <button
                    key={days}
                    onClick={() => handleUpdateRetentionPolicy(days)}
                    className={`w-full text-left px-4 py-2.5 rounded-xl border text-xs flex items-center justify-between transition-all cursor-pointer ${
                      retentionDays === days 
                        ? 'bg-indigo-600/25 border-indigo-500 text-indigo-200 font-bold' 
                        : 'bg-slate-950/20 border-slate-800 hover:bg-slate-800 text-slate-400'
                    }`}
                  >
                    <span>{days} Days</span>
                    {retentionDays === days && <Check size={12} />}
                  </button>
                ))}
              </div>
            </div>

            {/* TIMELINE PREVIEW CARD */}
            <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-6 md:col-span-2 space-y-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-indigo-400 pb-2">
                  <div className="flex items-center gap-2">
                    <History size={16} className="text-indigo-400" />
                    <h3 className="text-xs font-black uppercase tracking-wider text-white">Recent Activity Timeline</h3>
                  </div>
                  <button 
                    onClick={() => setActiveTab('audit_log')}
                    className="text-[10px] font-black uppercase tracking-widest text-indigo-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer"
                  >
                    Full Log <ArrowUpRight size={10} />
                  </button>
                </div>
                <p className="text-[11px] text-slate-400 leading-normal pb-4">
                  The central action board tracks all modifications, deletions, price changes, and customer updates.
                </p>

                <div className="space-y-4 border-l-2 border-slate-800 pl-4 py-1">
                  {auditLogs.slice(0, 4).map((log) => {
                    const isDelete = log.actionType === 'delete';
                    const isRestore = log.actionType === 'restore';
                    const isUpdateObj = log.actionType === 'update';

                    return (
                      <div key={log.id} className="relative group text-left">
                        <div className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-slate-800 border-2 border-indigo-500" />
                        <span className="text-[9px] font-mono opacity-50 block">{new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        <div className="text-[11.5px] font-semibold text-slate-200">
                          <span className={`text-[10px] font-black uppercase px-1.5 py-0.5 rounded-md mr-1.5 ${
                            isDelete ? 'bg-red-500/10 text-red-400' :
                            isRestore ? 'bg-emerald-500/10 text-emerald-400' :
                            'bg-amber-500/10 text-amber-400'
                          }`}>
                            {log.actionType}
                          </span>
                          <span className="font-bold text-white uppercase">{log.entityType}:</span> {log.entityName}
                        </div>
                        {isUpdateObj && log.previousValue && log.newValue && (
                          <div className="text-[9.5px] text-slate-400 mt-1 font-mono">
                            {log.previousValue} → <span className="text-emerald-400">{log.newValue}</span>
                          </div>
                        )}
                        <span className="text-[8.5px] opacity-40 block mt-0.5">By: {log.userEmail}</span>
                      </div>
                    );
                  })}
                  {auditLogs.length === 0 && (
                    <p className="text-xs text-slate-500 italic py-4">No recent activity logged in audit ledger yet.</p>
                  )}
                </div>
              </div>
              <div className="text-right pt-4 border-t border-slate-800/60">
                <span className="text-[9.5px] text-slate-500 font-mono">Synced on: {new Date().toLocaleDateString()}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- DATA LIST VIEWS --- */}
      {activeTab !== 'dashboard' && activeTab !== 'audit_log' && activeTab !== 'price_stock' && (
        <div className="space-y-4">
          {/* BULK SELECTION ACTIONS OVERLAY */}
          {selectedRecordIds.length > 0 && (
            <motion.div 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-slate-900 border-2 border-indigo-500 p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl text-left"
            >
              <div className="flex items-center gap-3">
                <input 
                  type="checkbox"
                  checked={selectedRecordIds.length === filteredRecords.length}
                  onChange={handleToggleSelectAll}
                  className="rounded border-slate-700 h-4 w-4 bg-slate-950"
                />
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-white">Bulk Operation Activated</h4>
                  <p className="text-[10px] text-slate-400">{selectedRecordIds.length} records selected from list</p>
                </div>
              </div>
              
              <div className="flex gap-2">
                <button 
                  onClick={handleBulkRestore}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-[10px] uppercase tracking-widest rounded-xl transition-all cursor-pointer flex items-center gap-1"
                >
                  <RotateCcw size={12} /> Bulk Restore
                </button>
                <button 
                  onClick={handleBulkPermanentDelete}
                  className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-black text-[10px] uppercase tracking-widest rounded-xl transition-all cursor-pointer flex items-center gap-1"
                >
                  <Trash2 size={12} /> Purge Selected
                </button>
              </div>
            </motion.div>
          )}

          {/* TABLE */}
          <div className="bg-slate-900/40 border border-slate-800 rounded-3xl overflow-hidden">
            <div className="p-4 bg-slate-900/60 border-b border-slate-800 flex items-center justify-between text-left">
              <div className="flex items-center gap-3">
                <input 
                  type="checkbox" 
                  checked={filteredRecords.length > 0 && selectedRecordIds.length === filteredRecords.length}
                  onChange={handleToggleSelectAll}
                  className="rounded border-slate-700 h-4 w-4 bg-slate-950"
                />
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Select All {filteredRecords.length} Records</span>
              </div>
              <span className="text-[10px] font-mono text-slate-500">Auto-Expiring Entries</span>
            </div>

            <div className="divide-y divide-slate-800 text-left">
              {filteredRecords.map((rec, rIdx) => {
                const isProd = rec.type === 'product';
                const isCat = rec.type === 'category';
                const isCust = rec.type === 'customer';
                const isSupplier = rec.type === 'supplier';
                const isBill = rec.type === 'bill';
                const isSet = rec.type === 'settings_point';

                const daysRemaining = Math.max(0, Math.ceil((new Date(rec.expiryAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));

                return (
                  <div key={`rec-item-${rec.id || 'rec'}-${rIdx}`} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 group hover:bg-slate-850/20 transition-all">
                    <div className="flex items-start gap-3">
                      <div className="pt-1">
                        <input 
                          type="checkbox"
                          checked={selectedRecordIds.includes(rec.id)}
                          onChange={() => handleToggleSelectRecord(rec.id)}
                          className="rounded border-slate-700 h-4 w-4 bg-slate-950"
                        />
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-black text-white">{rec.title}</span>
                          <span className={`text-[8.5px] font-black uppercase px-1.5 py-0.5 rounded-md ${
                            isProd ? 'bg-emerald-500/10 text-emerald-400' :
                            isCat ? 'bg-amber-500/10 text-amber-400' :
                            isCust ? 'bg-blue-500/10 text-blue-400' :
                            isSupplier ? 'bg-purple-500/10 text-purple-400' :
                            isSet ? 'bg-indigo-500/10 text-indigo-400' :
                            'bg-rose-500/10 text-rose-400'
                          }`}>
                            {rec.type}
                          </span>
                        </div>
                        <p className="text-[10.5px] text-slate-400 font-mono italic">{rec.subtitle}</p>
                        <div className="flex items-center gap-3 text-[9px] text-slate-500">
                          <span className="flex items-center gap-1"><Calendar size={10} /> Deleted: {new Date(rec.deletedAt || 0).toLocaleDateString()}</span>
                          <span className="flex items-center gap-1"><Clock size={10} /> Expires in {daysRemaining} days</span>
                          <span>By: {rec.deletedBy}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-1.5 self-end sm:self-center">
                      <button 
                        onClick={() => {
                          if (isProd) handleRestoreProduct(rec);
                          else if (isCat) handleRestoreCategory(rec);
                          else if (isCust) handleRestoreCustomer(rec);
                          else if (isSupplier) handleRestoreSupplier(rec);
                          else if (isBill) handleRestoreBill(rec);
                          else if (isSet) handleRestoreSettingsPoint(rec);
                        }}
                        className="px-3 py-2 bg-indigo-600/20 hover:bg-indigo-600 border border-indigo-500/30 hover:border-indigo-500 text-indigo-300 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer flex items-center gap-1"
                      >
                        <RotateCcw size={11} /> Restore
                      </button>
                      <button 
                        onClick={() => handleSingleDeletePermanently(rec)}
                        title="Delete permanently"
                        className="p-2 bg-slate-800 hover:bg-rose-600 text-slate-400 hover:text-white rounded-xl transition-all cursor-pointer"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                );
              })}
              {filteredRecords.length === 0 && (
                <div className="p-12 text-center text-slate-500 space-y-2">
                  <Shield size={32} className="mx-auto opacity-20" />
                  <p className="text-xs italic">No recoverable records found matching the query.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* --- PRICE & STOCK HISTORY TUNING --- */}
      {activeTab === 'price_stock' && (
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 text-left space-y-4">
            <div className="flex items-center gap-2 text-indigo-400">
              <History size={16} />
              <h3 className="text-xs font-black uppercase tracking-wider text-white">Dynamic Pricing & Stock Corrections</h3>
            </div>
            <p className="text-[11px] text-slate-400 leading-normal">
              Every single modification to retail pricing or product stock sizes registers a shadow historic record here. If an incorrect value is saved, rollback instantly using the revert triggers.
            </p>
          </div>

          <div className="bg-slate-900/40 border border-slate-800 rounded-3xl overflow-hidden divide-y divide-slate-800 text-left">
            {filteredPriceStock.map((record, psIdx) => {
              const isPrice = record.type === 'price';
              return (
                <div key={`rec-ps-${record.id || 'ps'}-${psIdx}`} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-white">{record.productName}</span>
                      <span className={`text-[8.5px] font-black uppercase px-1.5 py-0.5 rounded-md ${isPrice ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
                        {record.type === 'price' ? 'Price Update' : 'Stock Adjustment'}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono">
                      Previous Value: <span className="text-slate-200 line-through mr-1">{isPrice ? `₹${record.previousVal}` : `${record.previousVal} Units`}</span> → New: <span className="text-emerald-400 font-black">{isPrice ? `₹${record.newVal}` : `${record.newVal} Units`}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[9px] text-slate-500">
                      <span><Clock size={10} className="inline mr-1" />{new Date(record.timestamp).toLocaleString()}</span>
                      <span>• By: {record.userEmail}</span>
                    </div>
                  </div>

                  <button 
                    onClick={() => isPrice ? handleRestorePrice(record) : handleRestoreStock(record)}
                    className="px-3.5 py-2 bg-indigo-600/30 hover:bg-indigo-600 border border-indigo-500/30 hover:border-indigo-500 text-indigo-200 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer inline-flex items-center gap-1.5 self-end sm:self-center"
                  >
                    <RotateCcw size={11} /> Revert Change
                  </button>
                </div>
              );
            })}
            {filteredPriceStock.length === 0 && (
              <div className="p-12 text-center text-slate-500 space-y-2">
                <Shield size={32} className="mx-auto opacity-20" />
                <p className="text-xs italic">No value edit history recorded yet.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- AUDIT TIMELINE LOGS (FULL TIMELINE) --- */}
      {activeTab === 'audit_log' && (
        <div className="space-y-4">
          <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-6 text-left">
            <h3 className="text-xs font-black uppercase tracking-wider text-white">Continuous Security Audit Chronicle</h3>
            <p className="text-[11px] text-slate-400 mt-1">
              Maintains an immutable historical stream of all actions. Useful for multi-user synchronization audits, billing compliance, and tracking staff corrections.
            </p>
          </div>

          <div className="bg-slate-900/40 border border-slate-800 rounded-3xl divide-y divide-slate-800 text-left">
            {filteredAuditLogs.map((log, lIdx) => {
              const isDelete = log.actionType === 'delete';
              const isRestore = log.actionType === 'restore';
              const isCreate = log.actionType === 'create';

              return (
                <div key={`rec-audit-${log.id || 'audit'}-${lIdx}`} className="p-4 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="space-y-1 w-full">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-[8.5px] font-black uppercase px-1.5 py-0.5 rounded-md ${
                        isDelete ? 'bg-red-500/10 text-red-400' :
                        isRestore ? 'bg-emerald-500/10 text-emerald-400' :
                        isCreate ? 'bg-indigo-500/10 text-indigo-400' :
                        'bg-amber-500/10 text-amber-400'
                      }`}>
                        {log.actionType}
                      </span>
                      <span className="text-xs font-black text-white">{log.entityName}</span>
                      <span className="text-[9px] text-slate-500 font-mono">({log.entityType})</span>
                    </div>
                    {log.previousValue && log.newValue && (
                      <div className="text-[11px] text-slate-400 bg-slate-950/40 p-2.5 rounded-xl border border-slate-800 font-mono mt-2 break-all max-h-40 overflow-y-auto">
                        <span className="text-slate-500 uppercase text-[9px] block mb-1">Delta state dump</span>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[10px]">
                          <div><div className="text-slate-500 uppercase text-[8px]">Previous State</div>{log.previousValue}</div>
                          <div><div className="text-slate-500 uppercase text-[8px]">Current State</div>{log.newValue}</div>
                        </div>
                      </div>
                    )}
                    <div className="flex items-center justify-between text-[9px] text-slate-500 pt-1">
                      <span><Clock size={10} className="inline mr-1" />{new Date(log.timestamp).toLocaleString()}</span>
                      <span>Operator: {log.userEmail}</span>
                    </div>
                  </div>
                </div>
              );
            })}
            {filteredAuditLogs.length === 0 && (
              <div className="p-12 text-center text-slate-500 space-y-2">
                <Shield size={32} className="mx-auto opacity-20" />
                <p className="text-xs italic">History has no records yet.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
