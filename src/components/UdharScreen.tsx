import React, { useState, useMemo, useEffect } from 'react';
import { 
  Users, Plus, Trash2, ArrowUpRight, ArrowDownRight, Phone, 
  MessageSquare, Search, Landmark, Receipt, Calendar, Info, 
  CheckCircle2, AlertCircle, RefreshCw, ChevronRight, X, Sparkles, UserMinus, Edit, ArrowLeft
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { AppState, UdharCustomer, UdharTransaction, Bill } from '../types';
import { Button } from './ui/Button';
import { cn } from '../lib/utils';
import { RecoveryService } from '../services/recoveryService';
import { useBackModal } from '../utils/backNavigationManager';

interface UdharScreenProps {
  state: AppState;
  t: any;
  onUpdateState: (updates: Partial<AppState>) => void;
  selectedCustomerId?: string | null;
  onSelectCustomerId?: (id: string | null) => void;
  onEditBillInCounter?: (bill: Bill) => void;
}

export default function UdharScreen({ 
  state, 
  t, 
  onUpdateState,
  selectedCustomerId: propSelectedCustomerId,
  onSelectCustomerId: propOnSelectCustomerId,
  onEditBillInCounter
}: UdharScreenProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  
  // Form States for New Customer
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');

  // Selected Customer for Detailed Ledger View
  const [localSelectedCustomerId, setLocalSelectedCustomerId] = useState<string | null>(null);
  const selectedCustomerId = propSelectedCustomerId !== undefined ? propSelectedCustomerId : localSelectedCustomerId;
  const setSelectedCustomerId = propOnSelectCustomerId !== undefined ? propOnSelectCustomerId : setLocalSelectedCustomerId;
  const [showTransactionModal, setShowTransactionModal] = useState<'given' | 'received' | null>(null);
  
  // Form States for New Transaction
  const [transactionAmount, setTransactionAmount] = useState('');
  const [transactionNote, setTransactionNote] = useState('');
  const [transactionDueDate, setTransactionDueDate] = useState('');
  const [ledgerSearchQuery, setLedgerSearchQuery] = useState('');

  // Reset ledger search query when customer changes
  useEffect(() => {
    setLedgerSearchQuery('');
  }, [selectedCustomerId]);

  // Edit Customer States
  const [editingCustomer, setEditingCustomer] = useState<UdharCustomer | null>(null);
  const [editCustName, setEditCustName] = useState('');
  const [editCustPhone, setEditCustPhone] = useState('');

  // Edit Transaction States
  const [editingTransaction, setEditingTransaction] = useState<UdharTransaction | null>(null);
  const [editTxAmount, setEditTxAmount] = useState('');
  const [editTxNote, setEditTxNote] = useState('');
  const [editTxDueDate, setEditTxDueDate] = useState('');

  // Bill viewing state
  const [viewingBill, setViewingBill] = useState<Bill | null>(null);

  // Android/PWA Back Navigation Registrations for Udhar Screen
  useBackModal(Boolean(selectedCustomerId), () => setSelectedCustomerId(null), 'udhar_customer_detail_view');
  useBackModal(showAddCustomerModal, () => setShowAddCustomerModal(false), 'udhar_add_customer_modal');
  useBackModal(showTransactionModal !== null, () => setShowTransactionModal(null), 'udhar_transaction_modal');
  useBackModal(editingCustomer !== null, () => setEditingCustomer(null), 'udhar_edit_customer_modal');
  useBackModal(editingTransaction !== null, () => setEditingTransaction(null), 'udhar_edit_transaction_modal');
  useBackModal(viewingBill !== null, () => setViewingBill(null), 'udhar_viewing_bill_modal');

  // Handle saving customer edits
  const handleSaveEditCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCustomer) return;

    if (!editCustName.trim()) {
      alert("Name is required.");
      return;
    }

    const updatedCustomers = rawCustomers.map(cust => {
      if (cust.id === editingCustomer.id) {
        return {
          ...cust,
          name: editCustName.trim(),
          phone: editCustPhone.trim() || undefined,
          lastUpdated: new Date().toISOString()
        };
      }
      return cust;
    });

    onUpdateState({
      udharCustomers: updatedCustomers
    });

    setEditingCustomer(null);
  };

  // Handle saving transaction edits
  const handleSaveEditTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTransaction) return;

    const newAmount = parseFloat(editTxAmount);
    if (isNaN(newAmount) || newAmount <= 0) {
      alert("Please enter a valid positive amount.");
      return;
    }

    const signedAmount = editingTransaction.type === 'given' ? newAmount : -newAmount;
    const amountDifference = signedAmount - editingTransaction.amount;

    const updatedTransactions = rawTransactions.map(t => {
      if (t.id === editingTransaction.id) {
        return {
          ...t,
          amount: signedAmount,
          note: editTxNote,
          dueDate: editTxDueDate || undefined
        };
      }
      return t;
    });

    const updatedCustomers = rawCustomers.map(cust => {
      if (cust.id === editingTransaction.customerId) {
        return {
          ...cust,
          totalUdhar: parseFloat((cust.totalUdhar + amountDifference).toFixed(2)),
          lastUpdated: new Date().toISOString()
        };
      }
      return cust;
    });

    onUpdateState({
      udharCustomers: updatedCustomers,
      udharTransactions: updatedTransactions
    });

    setEditingTransaction(null);
  };

  // Helper to find associated bill from transaction note reference
  const getBillForTransaction = (note?: string) => {
    if (!note) return null;
    const match = note.match(/reference #(\d+)/i);
    if (match) {
      const billNum = match[1];
      return state.bills?.find(b => b.billNumber === billNum) || null;
    }
    return null;
  };

  const rawCustomers = useMemo(() => state.udharCustomers || [], [state.udharCustomers]);
  const rawTransactions = useMemo(() => state.udharTransactions || [], [state.udharTransactions]);

  // Handle adding a customer
  const handleAddCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomerName.trim()) return;

    const newCustomer: UdharCustomer = {
      id: 'udhar-cust-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
      name: newCustomerName.trim(),
      phone: newCustomerPhone.trim() || undefined,
      totalUdhar: 0,
      lastUpdated: new Date().toISOString()
    };

    const updatedCustomers = [...rawCustomers, newCustomer];
    onUpdateState({
      udharCustomers: updatedCustomers
    });

    // Reset Form
    setNewCustomerName('');
    setNewCustomerPhone('');
    setShowAddCustomerModal(false);
  };

  // Handle adding an Udhar transaction
  const handleAddTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerId || !transactionAmount || isNaN(parseFloat(transactionAmount))) return;

    const amountValue = Math.abs(parseFloat(transactionAmount));
    const isGiven = showTransactionModal === 'given';
    
    // Amount is positive for Udhar given (customer owes us), negative for repayments received (reduces what customer owes)
    const signedAmount = isGiven ? amountValue : -amountValue;

    const newTx: UdharTransaction = {
      id: 'udhar-tx-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
      customerId: selectedCustomerId,
      amount: signedAmount,
      type: isGiven ? 'given' : 'received',
      note: transactionNote.trim() || undefined,
      timestamp: new Date().toISOString(),
      dueDate: isGiven && transactionDueDate ? transactionDueDate : undefined
    };

    const updatedTransactions = [...rawTransactions, newTx];
    
    // Update customer's total cached balance
    const updatedCustomers = rawCustomers.map(cust => {
      if (cust.id === selectedCustomerId) {
        return {
          ...cust,
          totalUdhar: cust.totalUdhar + signedAmount,
          lastUpdated: new Date().toISOString()
        };
      }
      return cust;
    });

    onUpdateState({
      udharCustomers: updatedCustomers,
      udharTransactions: updatedTransactions
    });

    // Fire real custom device notification about credit change
    if ('Notification' in window && Notification.permission === 'granted') {
      const customer = rawCustomers.find(c => c.id === selectedCustomerId);
      if (customer) {
        const text = isGiven 
          ? `Added ₹${amountValue} Credit to ${customer.name}'s account.`
          : `Recorded ₹${amountValue} Repayment from ${customer.name}. Saved successfully!`;
        try {
          new Notification("Udhar Book Update", { body: text });
        } catch (err) {}
      }
    }

    // Reset
    setTransactionAmount('');
    setTransactionNote('');
    setTransactionDueDate('');
    setShowTransactionModal(null);
  };

  // Handle deleting a transaction
  const handleDeleteTransaction = (txId: string) => {
    const tx = rawTransactions.find(t => t.id === txId);
    if (!tx) return;

    if (!confirm(`Are you sure you want to delete this ledger entry of ₹${Math.abs(tx.amount).toLocaleString()}? This action will adjust the customer's outstanding balance accordingly.`)) {
      return;
    }

    const updatedTransactions = rawTransactions.filter(t => t.id !== txId);
    
    // Revoke customer cached balance
    const updatedCustomers = rawCustomers.map(cust => {
      if (cust.id === tx.customerId) {
        return {
          ...cust,
          totalUdhar: cust.totalUdhar - tx.amount,
          lastUpdated: new Date().toISOString()
        };
      }
      return cust;
    });

    onUpdateState({
      udharCustomers: updatedCustomers,
      udharTransactions: updatedTransactions
    });
  };

  // Delete customer entirely
  const handleDeleteCustomer = async (customerId: string) => {
    const customer = rawCustomers.find(c => c.id === customerId);
    if (!customer) return;

    // BUSINESS HEALTH WARNING: Active outstanding Udhar debt
    if (customer.totalUdhar > 0) {
      if (!confirm(`⚠️ WARNING: OUTSTANDING CREDIT (UDHAR) BALANCE EXISTS!\n\n"${customer.name}" owes you ₹${customer.totalUdhar}.\nDeleting this customer account will flush their detailed ledger history and discard the ₹${customer.totalUdhar} outstanding debt.\n\nAre you sure you want to proceed?`)) {
        return;
      }
    } else {
      if (!confirm(`Are you sure you want to delete customer account "${customer.name}"? This will save their profile to the Recovery archives to reverse later.`)) {
        return;
      }
    }

    const updatedCustomers = rawCustomers.filter(c => c.id !== customerId);
    const updatedTransactions = rawTransactions.filter(t => t.customerId !== customerId);
    const customerLedger = rawTransactions.filter(t => t.customerId === customerId);

    // Record deletion to Business Recovery Center
    await RecoveryService.recordDeletion(
      state.user?.uid || null,
      'customer',
      { customer, ledger: customerLedger },
      customer.name,
      `Phone: ${customer.phone || 'N/A'}, Outstanding: ₹${customer.totalUdhar}`,
      state.user?.email || 'Store Owner',
      30
    ).catch(e => console.error(e));

    onUpdateState({
      udharCustomers: updatedCustomers,
      udharTransactions: updatedTransactions
    });

    if (selectedCustomerId === customerId) {
      setSelectedCustomerId(null);
    }
  };

  // Aggregated KPIs
  const kpis = useMemo(() => {
    let totalOutstanding = 0;
    let debtorCount = 0;
    let settledCount = 0;

    rawCustomers.forEach(cust => {
      if (cust.totalUdhar > 0) {
        totalOutstanding += cust.totalUdhar;
        debtorCount++;
      } else {
        settledCount++;
      }
    });

    return {
      totalOutstanding,
      debtorCount,
      settledCount
    };
  }, [rawCustomers]);

  // Filtering Customer Directory
  const filteredCustomers = useMemo(() => {
    return rawCustomers.filter(cust => {
      const matchesSearch = 
        cust.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (cust.phone && cust.phone.includes(searchQuery));
      return matchesSearch;
    }).sort((a, b) => b.totalUdhar - a.totalUdhar); // Top outstanding customers first
  }, [rawCustomers, searchQuery]);

  // Selected customer object and ledger
  const selectedCustomer = useMemo(() => {
    return rawCustomers.find(c => c.id === selectedCustomerId) || null;
  }, [rawCustomers, selectedCustomerId]);

  const selectedLedger = useMemo(() => {
    if (!selectedCustomerId) return [];
    return rawTransactions
      .filter(tx => tx.customerId === selectedCustomerId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [rawTransactions, selectedCustomerId]);

  const filteredLedger = useMemo(() => {
    if (!ledgerSearchQuery.trim()) return selectedLedger;
    const q = ledgerSearchQuery.toLowerCase().trim();
    return selectedLedger.filter(tx => {
      const matchesNote = tx.note ? tx.note.toLowerCase().includes(q) : false;
      const matchesAmount = Math.abs(tx.amount).toString().includes(q);
      const matchesType = (tx.type === 'given' ? 'credit give udhar दिया' : 'payment repay received मिला').toLowerCase().includes(q);
      const matchesDate = new Date(tx.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }).toLowerCase().includes(q);
      const matchesDueDate = tx.dueDate ? new Date(tx.dueDate).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }).toLowerCase().includes(q) : false;
      return matchesNote || matchesAmount || matchesType || matchesDate || matchesDueDate;
    });
  }, [selectedLedger, ledgerSearchQuery]);

  // Outstanding payments exceeding 30 days memo
  const overdue30DaysCustomers = useMemo(() => {
    const today = new Date();
    const map = new Map<string, { tx: UdharTransaction; days: number }>();
    
    rawTransactions.forEach(tx => {
      if (tx.type === 'given' && tx.amount > 0) {
        const txDate = new Date(tx.timestamp);
        const diffMs = today.getTime() - txDate.getTime();
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        if (diffDays > 30) {
          const existing = map.get(tx.customerId);
          if (!existing || existing.days < diffDays) {
            map.set(tx.customerId, { tx, days: diffDays });
          }
        }
      }
    });

    const list: { customer: UdharCustomer; tx: UdharTransaction; days: number }[] = [];
    map.forEach((value, customerId) => {
      const customer = rawCustomers.find(c => c.id === customerId);
      if (customer && customer.totalUdhar > 0) {
        list.push({ customer, tx: value.tx, days: value.days });
      }
    });

    return list.sort((a, b) => b.days - a.days);
  }, [rawCustomers, rawTransactions]);

  // Helper to generate the professional automated message with item name, quantity, price & total
  const generateWhatsAppReminderText = (
    customerName: string, 
    customerPhone: string | undefined, 
    totalUdhar: number, 
    timestamp?: string, 
    days?: number,
    note?: string
  ) => {
    const lang = state.settings.language || 'hi-en';
    let message = '';

    if (timestamp && days) {
      if (lang === 'hi') {
        message = `प्रिय *${customerName}*, यह आपके बकाया खाता शेष *₹${totalUdhar.toLocaleString()}* के संबंध में एक व्यावसायिक अनुरोध है जो *${new Date(timestamp).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}* (${days} दिन पहले) से बकाया है। आपसे अनुरोध है कि कृपया इस राशि का भुगतान करें या जल्द ही भुगतान की योजना बनाएं। धन्यवाद! 🙏`;
      } else if (lang === 'mr') {
        message = `प्रिय *${customerName}*, आपल्या थकीत खाते शिल्लक *₹${totalUdhar.toLocaleString()}* बद्दल ही एक व्यावसायिक विनंती आहे जी *${new Date(timestamp).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}* (${days} दिवसांपूर्वी) पासून थकीत आहे। आम्ही आपणास विनंती करतो की कृपया ही थकबाकी लवकरच भरावी। धन्यवाद! 🙏`;
      } else if (lang === 'hi-en') {
        message = `Dear *${customerName}*, yeh aapke outstanding account balance *₹${totalUdhar.toLocaleString()}* ke baare mein professional reminder hai, jo *${new Date(timestamp).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}* (${days} din pehle) se outstanding hai. Kripya is udhar ko jaldi clear karein ya repayment schedule karein. Thank you! 🙏`;
      } else { // 'en'
        message = `Dear *${customerName}*, this is a professional request regarding your outstanding billing account balance of *₹${totalUdhar.toLocaleString()}* for credit transactions starting on *${new Date(timestamp).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}* (${days} days ago). We request you to kindly clear these dues or schedule a repayment soon. Thank you! 🙏`;
      }
    } else {
      if (lang === 'hi') {
        message = `नमस्ते *${customerName}*, यह एक विनम्र अनुस्मारक है कि हमारे स्टोर पर आपकी बकाया उधार राशि *₹${totalUdhar.toLocaleString()}* है। कृपया अपने खाते का निपटान करें या जल्द ही भुगतान करें। धन्यवाद! 🙏`;
      } else if (lang === 'mr') {
        message = `नमस्कार *${customerName}*, आपल्या स्टोअरवरील आपली थकीत उधार रक्कम *₹${totalUdhar.toLocaleString()}* आहे, याची कृपया नोंद घ्यावी। कृपया आपल्या खात्याचा लवकरच निपटारा करावा। धन्यवाद! 🙏`;
      } else if (lang === 'hi-en') {
        message = `Hello *${customerName}*, ek friendly reminder ki aapka humare store par outstanding credit balance (Udhar) *₹${totalUdhar.toLocaleString()}* hai. Kripya apna account jaldi settle karein ya payment karein. Thank you! 🙏`;
      } else { // 'en'
        message = `Hello *${customerName}*, this is a friendly reminder that your outstanding credit balance (Udhar) at our store is *₹${totalUdhar.toLocaleString()}*. Please settle your account or make a payment soon. Thank you! 🙏`;
      }
    }

    // Find bills for this customer (exact phone match or case insensitive name match)
    const customerBills = state.bills?.filter(b => 
      b.paymentMethod === 'Credit' && 
      ((customerPhone && b.customerPhone === customerPhone) || b.customerName.toLowerCase() === customerName.toLowerCase())
    ) || [];

    let billsToShow = customerBills;
    if (note) {
      const match = note.match(/reference #(\d+)/i);
      if (match) {
        const billNum = match[1];
        const specificBill = state.bills?.find(b => b.billNumber === billNum);
        if (specificBill) {
          billsToShow = [specificBill];
        }
      }
    }

    let itemsBreakdown = '';
    if (billsToShow.length > 0) {
      if (lang === 'hi') {
        itemsBreakdown = '\n\n*📋 खरीदे गए सामान का विवरण (Itemized Bill):*';
      } else if (lang === 'mr') {
        itemsBreakdown = '\n\n*📋 खरेदी केलेल्या साहित्याची यादी (Itemized Bill):*';
      } else if (lang === 'hi-en') {
        itemsBreakdown = '\n\n*📋 Itemized Bill Breakdown (Kharide gaye saaman ki list):*';
      } else { // 'en'
        itemsBreakdown = '\n\n*📋 Itemized Bill Breakdown:*';
      }

      billsToShow.forEach(b => {
        if (lang === 'hi') {
          itemsBreakdown += `\n\n*बिल #${b.billNumber} (${new Date(b.timestamp).toLocaleDateString()})*`;
        } else if (lang === 'mr') {
          itemsBreakdown += `\n\n*बिल #${b.billNumber} (${new Date(b.timestamp).toLocaleDateString()})*`;
        } else {
          itemsBreakdown += `\n\n*Bill #${b.billNumber} (${new Date(b.timestamp).toLocaleDateString()})*`;
        }

        b.items.forEach(item => {
          itemsBreakdown += `\n- ${item.name}: ${item.quantity} ${item.unit || ''} x ₹${item.price} = *₹${(item.quantity * item.price).toLocaleString()}*`;
        });

        if (b.discount > 0) {
          if (lang === 'hi') {
            itemsBreakdown += `\n  छूट (Discount): ${b.discount}%`;
          } else if (lang === 'mr') {
            itemsBreakdown += `\n  सवलत (Discount): ${b.discount}%`;
          } else {
            itemsBreakdown += `\n  Discount: ${b.discount}%`;
          }
        }

        if (b.tax > 0) {
          if (lang === 'hi') {
            itemsBreakdown += `\n  कर (Tax): ${b.tax}%`;
          } else if (lang === 'mr') {
            itemsBreakdown += `\n  कर (Tax): ${b.tax}%`;
          } else {
            itemsBreakdown += `\n  Tax: ${b.tax}%`;
          }
        }

        if (lang === 'hi') {
          itemsBreakdown += `\n  कुल बिल (Bill Total): *₹${b.total.toLocaleString()}*`;
        } else if (lang === 'mr') {
          itemsBreakdown += `\n  एकूण बिल (Bill Total): *₹${b.total.toLocaleString()}*`;
        } else {
          itemsBreakdown += `\n  Bill Total: *₹${b.total.toLocaleString()}*`;
        }
      });
    }

    return message + itemsBreakdown;
  };

  // Helper to trigger direct WhatsApp Reminders
  const handleWhatsAppReminder = (cust: UdharCustomer) => {
    if (!cust.phone) return;
    
    // Format text
    const message = generateWhatsAppReminderText(cust.name, cust.phone, cust.totalUdhar);
    const encodedText = encodeURIComponent(message);
    const url = `https://wa.me/91${cust.phone}?text=${encodedText}`;
    window.open(url, '_blank');
  };

  return (
    <div className="space-y-4 sm:space-y-5 pb-32 max-w-7xl mx-auto text-[var(--foreground)]">
      
      {/* Top Header & Metrics: On mobile screens, only shown when on the Directory list */}
      <div className={cn(
        "space-y-3 sm:space-y-4",
        selectedCustomer ? "hidden lg:block" : "block"
      )}>
        {/* Header Row */}
        <div className="flex items-center justify-between border-b border-[var(--border)] pb-2.5 sm:pb-3 gap-2">
          <div className="min-w-0">
            <h2 className="text-xl sm:text-2xl font-black text-[var(--foreground)] tracking-tight uppercase flex items-center gap-2 truncate">
              <Landmark className="text-rose-500 shrink-0" size={22} />
              <span>Udhar <span className="text-rose-500">Book Ledger</span></span>
            </h2>
            <p className="text-[9px] sm:text-[10px] font-bold opacity-50 uppercase tracking-widest truncate">
              Manage customers Udhar payments (उधार खाता डायरी)
            </p>
          </div>

          <button 
            type="button"
            onClick={() => setShowAddCustomerModal(true)}
            className="px-3.5 sm:px-4 py-2 rounded-xl text-[10px] sm:text-[11px] bg-rose-500 hover:bg-rose-600 text-white font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95 shrink-0"
          >
            <Plus size={14} />
            <span>Open Khata</span>
          </button>
        </div>

        {/* High-Density Quick Pulse Strip: Replaces 3 bulky cards with a single compact ~50px row */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          {/* Metric 1: Total Outstanding */}
          <div className="p-2.5 sm:p-3 rounded-xl bg-rose-500/[0.06] border border-rose-500/20 flex flex-col justify-between shadow-2xs">
            <span className="text-[8px] sm:text-[9px] font-black uppercase tracking-wider text-rose-500 truncate flex items-center gap-1">
              <Landmark size={10} className="shrink-0" />
              <span>Total Due</span>
            </span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-xs sm:text-base font-black text-rose-500 font-mono truncate">
                ₹{kpis.totalOutstanding.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </span>
            </div>
          </div>

          {/* Metric 2: Active Accounts */}
          <div className="p-2.5 sm:p-3 rounded-xl bg-amber-500/[0.06] border border-amber-500/20 flex flex-col justify-between shadow-2xs">
            <span className="text-[8px] sm:text-[9px] font-black uppercase tracking-wider text-amber-500 truncate flex items-center gap-1">
              <Users size={10} className="shrink-0" />
              <span>Due Accounts</span>
            </span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-xs sm:text-base font-black text-[var(--foreground)] font-mono truncate">
                {kpis.debtorCount} Users
              </span>
            </div>
          </div>

          {/* Metric 3: Settled Accounts */}
          <div className="p-2.5 sm:p-3 rounded-xl bg-emerald-500/[0.06] border border-emerald-500/20 flex flex-col justify-between shadow-2xs">
            <span className="text-[8px] sm:text-[9px] font-black uppercase tracking-wider text-emerald-500 truncate flex items-center gap-1">
              <CheckCircle2 size={10} className="shrink-0" />
              <span>Settled</span>
            </span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-xs sm:text-base font-black text-emerald-500 font-mono truncate">
                {kpis.settledCount} Clear
              </span>
            </div>
          </div>
        </div>

        {/* 30+ Days Overdue Alert Pill / Bar */}
        {overdue30DaysCustomers.length > 0 && (
          <div className="p-2.5 sm:p-3 bg-rose-500/[0.05] border border-rose-500/20 rounded-xl space-y-2 select-none">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-xs font-black text-rose-500 uppercase tracking-tight truncate">
                <AlertCircle size={13} className="shrink-0 animate-pulse" />
                <span>30+ Days Overdue Dues ({overdue30DaysCustomers.length})</span>
              </div>
              <span className="text-[8px] font-black uppercase bg-rose-500/20 text-rose-400 px-1.5 py-0.5 rounded border border-rose-500/30 shrink-0">
                Action Suggested
              </span>
            </div>

            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-0.5">
              {overdue30DaysCustomers.map(({ customer, tx, days }) => (
                <div 
                  key={customer.id + '-' + tx.id}
                  className="p-2 rounded-lg bg-[var(--card)] border border-[var(--border)] shrink-0 flex items-center gap-2.5 text-xs shadow-2xs"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-[10.5px] uppercase truncate max-w-[95px] text-[var(--foreground)]">{customer.name}</span>
                      <span className="text-[7.5px] font-black uppercase text-rose-400 bg-rose-500/10 px-1 rounded">{days}d</span>
                    </div>
                    <p className="text-[9.5px] font-mono font-black text-rose-500 mt-0.5">₹{Math.abs(tx.amount).toLocaleString()}</p>
                  </div>
                  {customer.phone && (
                    <button
                      type="button"
                      onClick={() => {
                        const message = generateWhatsAppReminderText(customer.name, customer.phone, customer.totalUdhar, tx.timestamp, days, tx.note);
                        const url = `https://wa.me/91${customer.phone}?text=${encodeURIComponent(message)}`;
                        window.open(url, '_blank');
                      }}
                      className="h-6 px-2 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-[8px] font-black uppercase tracking-wider flex items-center gap-1 shadow-2xs cursor-pointer"
                      title="Send WhatsApp reminder"
                    >
                      <MessageSquare size={10} />
                      <span>Remind</span>
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Main Content Area: Master-Detail Architecture */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6 items-start">
        
        {/* Customer Directory List: Visible on Desktop ALWAYS, on Mobile ONLY when NO customer is selected */}
        <div className={cn(
          "lg:col-span-5 card p-3.5 sm:p-4 bg-[var(--card)] border border-[var(--border)] rounded-2xl sm:rounded-3xl space-y-3 shadow-xs",
          selectedCustomer ? "hidden lg:block" : "block"
        )}>
          {/* Header & Language selector */}
          <div className="flex items-center justify-between pb-2 border-b border-[var(--border)] gap-2">
            <div>
              <h4 className="font-black text-[var(--foreground)] text-xs uppercase tracking-tight flex items-center gap-1.5">
                <Users size={14} className="text-rose-500" />
                <span>Customer Directory</span>
              </h4>
              <p className="text-[8.5px] opacity-40 font-bold uppercase tracking-wider">
                {filteredCustomers.length} {filteredCustomers.length === 1 ? 'Account' : 'Accounts'}
              </p>
            </div>

            {/* Language Selector Pills */}
            <div className="flex gap-1 overflow-x-auto no-scrollbar">
              {[
                { id: 'en', label: 'EN', title: 'English' },
                { id: 'hi-en', label: 'HING', title: 'Hinglish' },
                { id: 'hi', label: 'हिन्दी', title: 'हिन्दी' },
                { id: 'mr', label: 'मराठी', title: 'मराठी' }
              ].map(lang => {
                const isActive = state.settings.language === lang.id;
                return (
                  <button
                    key={lang.id}
                    onClick={() => {
                      onUpdateState({
                        settings: {
                          ...state.settings,
                          language: lang.id as any
                        }
                      });
                    }}
                    title={lang.title}
                    type="button"
                    className={cn(
                      "px-2 py-0.5 rounded-lg text-[8.5px] font-black uppercase tracking-wider transition-all cursor-pointer",
                      isActive 
                        ? "bg-rose-500 text-white shadow-2xs" 
                        : "bg-[var(--foreground)]/5 border border-[var(--border)] text-[var(--foreground)]/60 hover:text-[var(--foreground)]"
                    )}
                  >
                    {lang.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Search bar inside customer directory */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 opacity-35" size={13} />
            <input 
              type="text" 
              placeholder="Search name or phone..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs font-bold rounded-xl border border-[var(--border)] bg-[var(--foreground)]/[0.03] py-2 pl-8 pr-7 focus:outline-none focus:border-rose-500/40 focus:ring-1 focus:ring-rose-500/30 text-[var(--foreground)] placeholder:text-[var(--foreground)]/40"
            />
            {searchQuery && (
              <button 
                type="button" 
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--foreground)]/40 hover:text-rose-500 p-1 cursor-pointer"
              >
                <X size={11} />
              </button>
            )}
          </div>

          {/* Customer Accounts List */}
          <div className="space-y-1.5 overflow-y-auto max-h-[60vh] lg:max-h-[52vh] no-scrollbar pr-0.5">
            {filteredCustomers.length === 0 ? (
              <div className="py-14 text-center border border-dashed border-[var(--border)] rounded-2xl opacity-40 space-y-1.5 select-none">
                <Users size={28} className="mx-auto opacity-30 text-rose-500" />
                <p className="text-xs font-black uppercase tracking-wider">No Khata Records Found</p>
                <p className="text-[9.5px] max-w-[200px] mx-auto opacity-70">
                  Click "Open Khata" above to create your first credit customer account!
                </p>
              </div>
            ) : (
              filteredCustomers.map((cust, cIdx) => {
                const isSelected = cust.id === selectedCustomerId;
                const outstanding = cust.totalUdhar;
                const isSettled = outstanding === 0;
                
                return (
                  <div 
                    key={`udhar-cust-${cust.id || 'cust'}-${cIdx}`}
                    onClick={() => setSelectedCustomerId(cust.id)}
                    className={cn(
                      "flex items-center justify-between p-2.5 sm:p-3 rounded-xl border transition-all duration-150 cursor-pointer select-none active:scale-[0.99] group shadow-2xs",
                      isSelected 
                        ? "border-rose-500/50 bg-rose-500/10 shadow-xs ring-1 ring-rose-500/20" 
                        : "border-[var(--border)] bg-[var(--card)] hover:border-rose-500/30 hover:bg-[var(--foreground)]/[0.02]"
                    )}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={cn(
                        "h-8 w-8 rounded-lg flex items-center justify-center text-xs font-black uppercase shrink-0 border",
                        outstanding > 0 
                          ? "bg-rose-500/15 text-rose-500 border-rose-500/25" 
                          : "bg-emerald-500/15 text-emerald-500 border-emerald-500/25"
                      )}>
                        {cust.name.substring(0, 2)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-black truncate max-w-[140px] uppercase tracking-tight text-[var(--foreground)] group-hover:text-rose-500 transition-colors">
                          {cust.name}
                        </p>
                        {cust.phone ? (
                          <p className="text-[9px] font-mono opacity-50 truncate">{cust.phone}</p>
                        ) : (
                          <p className="text-[8.5px] italic opacity-35 truncate">No phone linked</p>
                        )}
                      </div>
                    </div>

                    <div className="text-right shrink-0 ml-2">
                      <p className={cn(
                        "text-xs font-mono font-black",
                        outstanding > 0 ? "text-rose-500" : "text-emerald-500"
                      )}>
                        {isSettled ? "Settled ✓" : `₹${outstanding.toLocaleString()}`}
                      </p>
                      <p className="text-[8px] opacity-40 uppercase tracking-wider font-semibold">
                        {outstanding > 0 ? "Due Balance" : "All Clear"}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Selected Customer Transactions Ledger: Visible on Desktop ALWAYS, on Mobile ONLY when a customer is selected */}
        <div className={cn(
          "lg:col-span-7 card p-3 sm:p-5 bg-[var(--card)] border border-[var(--border)] rounded-2xl sm:rounded-3xl space-y-3.5 shadow-xs min-h-[420px]",
          selectedCustomer ? "block" : "hidden lg:block"
        )}>
          {selectedCustomer ? (
            <div className="space-y-3.5">
              
              {/* Ledger Header with Back Button (Mobile) & Actions Toolbar */}
              <div className="flex items-center justify-between border-b border-[var(--border)] pb-3 gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  {/* Mobile Back Button: Returns to Customer Directory */}
                  <button
                    type="button"
                    onClick={() => setSelectedCustomerId(null)}
                    className="h-8 w-8 rounded-lg bg-[var(--foreground)]/5 hover:bg-[var(--foreground)]/10 border border-[var(--border)] flex items-center justify-center text-[var(--foreground)]/80 hover:text-[var(--foreground)] lg:hidden shrink-0 cursor-pointer active:scale-95 transition-all"
                    title="Back to Customers Directory"
                  >
                    <ArrowLeft size={15} />
                  </button>

                  <div className="h-8 w-8 text-xs font-black bg-rose-500/10 text-rose-500 flex items-center justify-center rounded-lg uppercase shrink-0 border border-rose-500/20">
                    {selectedCustomer.name.substring(0, 2)}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h3 className="text-xs sm:text-sm font-black uppercase tracking-tight text-[var(--foreground)] truncate">
                        {selectedCustomer.name}
                      </h3>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingCustomer(selectedCustomer);
                          setEditCustName(selectedCustomer.name);
                          setEditCustPhone(selectedCustomer.phone || '');
                        }}
                        className="p-1 hover:bg-[var(--foreground)]/10 text-[var(--foreground)]/45 hover:text-rose-500 rounded transition-colors cursor-pointer"
                        title="Edit Customer Profile"
                      >
                        <Edit size={12} />
                      </button>
                    </div>
                    {selectedCustomer.phone ? (
                      <p className="text-[9px] font-mono opacity-60 truncate">📞 {selectedCustomer.phone}</p>
                    ) : (
                      <p className="text-[8.5px] opacity-40 uppercase tracking-widest font-bold">Khata Ledger</p>
                    )}
                  </div>
                </div>

                {/* Quick actions for Contact (Call, WhatsApp, Delete) */}
                <div className="flex items-center gap-1 shrink-0">
                  {selectedCustomer.phone && (
                    <>
                      <a 
                        href={`tel:${selectedCustomer.phone}`}
                        className="h-8 w-8 bg-[var(--foreground)]/5 hover:bg-rose-500/10 border border-[var(--border)] hover:border-rose-500/30 rounded-lg flex items-center justify-center text-[var(--foreground)]/75 hover:text-rose-500 transition-all cursor-pointer shadow-2xs"
                        title="Voice Call"
                      >
                        <Phone size={13} />
                      </a>
                      <button 
                        type="button"
                        onClick={() => handleWhatsAppReminder(selectedCustomer)}
                        className="h-8 px-2 sm:px-2.5 text-[9px] font-black uppercase tracking-wider bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 rounded-lg flex items-center gap-1 transition-all cursor-pointer shadow-2xs"
                        title="Send WhatsApp Payment Link / Reminder"
                      >
                        <MessageSquare size={12} />
                        <span className="hidden sm:inline">WhatsApp</span>
                      </button>
                    </>
                  )}
                  <button
                    type="button"
                    onClick={() => handleDeleteCustomer(selectedCustomer.id)}
                    className="h-8 w-8 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/25 rounded-lg flex items-center justify-center text-rose-500 transition-all cursor-pointer shadow-2xs"
                    title="Delete Customer Account"
                  >
                    <UserMinus size={13} />
                  </button>
                </div>
              </div>

              {/* Outstanding Balance & Action Card */}
              <div className="p-3 sm:p-3.5 rounded-xl sm:rounded-2xl bg-gradient-to-br from-[var(--foreground)]/[0.04] to-[var(--foreground)]/[0.01] border border-[var(--border)] space-y-2.5 shadow-2xs">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[8.5px] font-black text-rose-500 uppercase tracking-widest block leading-none">
                      Customer Owes You (कुल बाकी)
                    </span>
                    <span className="text-xl sm:text-2xl font-mono font-black text-rose-500 mt-1 block">
                      ₹{Math.max(0, selectedCustomer.totalUdhar).toLocaleString()}
                    </span>
                  </div>
                  <span className={cn(
                    "text-[8.5px] font-black uppercase px-2 py-0.5 rounded-md border",
                    selectedCustomer.totalUdhar > 0 
                      ? "bg-rose-500/15 text-rose-500 border-rose-500/30" 
                      : "bg-emerald-500/15 text-emerald-500 border-emerald-500/30"
                  )}>
                    {selectedCustomer.totalUdhar > 0 ? "Pending Credit" : "All Clear"}
                  </span>
                </div>

                {/* Give / Receive Transaction Action Buttons */}
                <div className="grid grid-cols-2 gap-2 pt-0.5">
                  <button
                    type="button"
                    onClick={() => {
                      const now = new Date();
                      const year = now.getFullYear();
                      const month = String(now.getMonth() + 1).padStart(2, '0');
                      const day = String(now.getDate()).padStart(2, '0');
                      setTransactionDueDate(`${year}-${month}-${day}`);
                      setShowTransactionModal('given');
                    }}
                    className="h-9 px-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-black text-[10.5px] uppercase tracking-wider transition-all shadow-xs active:scale-[0.98] flex items-center justify-center gap-1 cursor-pointer text-center truncate"
                  >
                    <ArrowUpRight size={13} strokeWidth={3} className="shrink-0" />
                    <span className="truncate">Give Udhar (-)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowTransactionModal('received')}
                    className="h-9 px-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[10.5px] uppercase tracking-wider transition-all shadow-xs active:scale-[0.98] flex items-center justify-center gap-1 cursor-pointer text-center truncate"
                  >
                    <ArrowDownRight size={13} strokeWidth={3} className="shrink-0" />
                    <span className="truncate">Received Pay (+)</span>
                  </button>
                </div>
              </div>

              {/* Transactions Diary List view */}
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between gap-2 pb-1 border-b border-[var(--border)]/40">
                  <h4 className="text-[9px] font-black uppercase opacity-50 tracking-wider">
                    Ledger Log ({filteredLedger.length})
                  </h4>
                  
                  {/* Ledger search bar */}
                  {selectedLedger.length > 0 && (
                    <div className="relative w-44 sm:w-56">
                      <Search size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-rose-500 opacity-60" />
                      <input 
                        type="text"
                        value={ledgerSearchQuery}
                        onChange={(e) => setLedgerSearchQuery(e.target.value)}
                        placeholder="Search entries..."
                        className="w-full text-[10px] font-bold rounded-lg border border-[var(--border)] bg-[var(--foreground)]/[0.03] pl-7 pr-6 py-1 focus:outline-none focus:border-rose-500 text-[var(--foreground)] placeholder:text-[var(--foreground)]/40"
                      />
                      {ledgerSearchQuery && (
                        <button 
                          type="button"
                          onClick={() => setLedgerSearchQuery('')}
                          className="absolute right-1.5 text-zinc-400 hover:text-rose-500 top-1/2 -translate-y-1/2 p-0.5 cursor-pointer"
                        >
                          <X size={10} />
                        </button>
                      )}
                    </div>
                  )}
                </div>

                <div className="divide-y divide-[var(--border)] overflow-hidden max-h-[46vh] overflow-y-auto no-scrollbar pr-0.5">
                  {selectedLedger.length === 0 ? (
                    <div className="py-12 text-center opacity-35 text-[9.5px] uppercase tracking-wider font-extrabold font-mono border border-dashed border-[var(--border)] rounded-xl space-y-1 select-none">
                      <p>Empty ledger book history</p>
                      <p className="text-[8px] opacity-70">Use Give Udhar or Received Pay to add entries</p>
                    </div>
                  ) : filteredLedger.length === 0 ? (
                    <div className="py-12 text-center opacity-35 text-[9.5px] uppercase tracking-wider font-extrabold font-mono border border-dashed border-[var(--border)] rounded-xl select-none">
                      No matching records for "{ledgerSearchQuery}"
                    </div>
                  ) : (
                    filteredLedger.map((tx, tIdx) => {
                      const isGiven = tx.type === 'given';
                      const billObj = getBillForTransaction(tx.note);

                      return (
                        <div key={`udhar-tx-${tx.id || 'tx'}-${tIdx}`} className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0 font-medium gap-2">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className={cn(
                              "h-7 w-7 rounded-lg flex items-center justify-center shrink-0 border",
                              isGiven 
                                ? "bg-rose-500/15 text-rose-500 border-rose-500/25" 
                                : "bg-emerald-500/15 text-emerald-500 border-emerald-500/25"
                            )}>
                              {isGiven ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
                            </div>
                            <div className="min-w-0">
                              <p className="text-[11px] font-black uppercase tracking-tight text-[var(--foreground)] truncate">
                                {isGiven ? 'CREDIT GIVEN' : 'PAYMENT RECEIVED'}
                              </p>
                              <p className="text-[8.5px] opacity-45 font-mono leading-tight">
                                {new Date(tx.timestamp).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                              </p>
                              {tx.note && (
                                <p className="text-[8px] font-bold text-[var(--primary)] truncate mt-0.5">
                                  ☞ {tx.note}
                                </p>
                              )}
                              <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                                {tx.dueDate && (
                                  <span className="text-amber-500 font-bold uppercase text-[7px] tracking-wider bg-amber-500/10 border border-amber-500/20 px-1 py-0.2 rounded select-none">
                                    ⏳ Due: {new Date(tx.dueDate).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                                  </span>
                                )}
                                {billObj && (
                                  <button
                                    onClick={() => setViewingBill(billObj)}
                                    type="button"
                                    className="px-1.5 py-0.2 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 text-[7.5px] font-black uppercase tracking-wider flex items-center gap-0.5 cursor-pointer select-none"
                                  >
                                    <Receipt size={9} /> Bill #{billObj.billNumber}
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="text-right flex items-center gap-1.5 shrink-0">
                            <span className={cn(
                              "font-mono text-xs font-black",
                              isGiven ? "text-rose-500" : "text-emerald-500"
                            )}>
                              {isGiven ? '-' : '+'}₹{Math.abs(tx.amount).toLocaleString()}
                            </span>
                            <div className="flex items-center gap-0.5">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingTransaction(tx);
                                  setEditTxAmount(String(Math.abs(tx.amount)));
                                  setEditTxNote(tx.note || '');
                                  setEditTxDueDate(tx.dueDate || '');
                                }}
                                className="h-6 w-6 rounded-md hover:bg-[var(--foreground)]/10 text-[var(--foreground)]/40 hover:text-rose-500 flex items-center justify-center transition-colors cursor-pointer"
                                title="Edit Entry"
                              >
                                <Edit size={11} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteTransaction(tx.id)}
                                className="h-6 w-6 rounded-md hover:bg-rose-500/10 text-[var(--foreground)]/40 hover:text-rose-500 flex items-center justify-center transition-colors cursor-pointer"
                                title="Delete Entry"
                              >
                                <Trash2 size={11} />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

            </div>
          ) : (
            <div className="py-24 text-center space-y-3 opacity-30 select-none">
              <Landmark size={48} className="mx-auto opacity-25 text-rose-500" />
              <div>
                <p className="font-black uppercase tracking-wider text-xs">No Customer Selected</p>
                <p className="text-[9px] max-w-[200px] mx-auto mt-1 uppercase tracking-widest leading-relaxed">
                  Select an account from the left directory to display their digital khata ledger.
                </p>
              </div>
            </div>
          )}
        </div>

      </div>

      {/* MODAL 1: OPEN NEW ACCOUNT */}
      <AnimatePresence>
        {showAddCustomerModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-sm bg-[var(--card)] border border-[var(--border)] rounded-3xl p-6 shadow-2xl space-y-4 text-[var(--foreground)]"
            >
              <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
                <h4 className="font-bold text-xs uppercase tracking-widest text-rose-500">Open Credit Register (खाता खोलें)</h4>
                <button onClick={() => setShowAddCustomerModal(false)} className="text-[var(--foreground)]/50 hover:text-white">
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleAddCustomer} className="space-y-4">
                <div className="space-y-1.5 text-left">
                  <label className="text-[9px] font-black uppercase opacity-45">Customer Full Name (ग्राहक का नाम)</label>
                  <input 
                    type="text" 
                    placeholder="E.g. Rajesh Kumar" 
                    value={newCustomerName}
                    onChange={(e) => setNewCustomerName(e.target.value)}
                    required
                    className="w-full text-xs font-bold rounded-xl border border-[var(--border)] bg-[var(--foreground)]/[0.03] py-3 px-4 focus:outline-none focus:border-rose-500"
                  />
                </div>

                <div className="space-y-1.5 text-left">
                  <label className="text-[9px] font-black uppercase opacity-45">WhatsApp/Mobile (वैकल्पिक फ़ोन)</label>
                  <input 
                    type="text" 
                    placeholder="10 digit Mobile No" 
                    value={newCustomerPhone}
                    onChange={(e) => setNewCustomerPhone(e.target.value)}
                    className="w-full text-xs font-bold rounded-xl border border-[var(--border)] bg-[var(--foreground)]/[0.03] py-3 px-4 focus:outline-none focus:border-rose-500 font-mono"
                  />
                </div>

                <div className="pt-2 flex gap-3">
                  <Button 
                    type="button" 
                    onClick={() => setShowAddCustomerModal(false)}
                    variant="ghost" 
                    className="flex-1 py-3 text-[10px] uppercase font-black tracking-wider rounded-xl col-span-1"
                  >
                    Discard
                  </Button>
                  <button 
                    type="submit" 
                    className="flex-1 py-3 bg-rose-500 hover:bg-rose-600 border border-transparent text-white font-black text-[10px] uppercase tracking-wider rounded-xl cursor-pointer"
                  >
                    Open Account Book
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 2: ADD TRANSACTION ENTRY (Given Credit or Settle cash) */}
      <AnimatePresence>
        {showTransactionModal && selectedCustomer && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-sm bg-[var(--card)] border border-[var(--border)] rounded-3xl p-6 shadow-2xl space-y-4 text-[var(--foreground)]"
            >
              <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
                <h4 className={`font-bold text-xs uppercase tracking-widest ${
                  showTransactionModal === 'given' ? 'text-rose-500' : 'text-green-500'
                }`}>
                  {showTransactionModal === 'given' ? 'Record Credit (उधार दिया)' : 'Record Repayment (उधार पाया)'}
                </h4>
                <button onClick={() => setShowTransactionModal(null)} className="text-[var(--foreground)]/50 hover:text-white">
                  <X size={16} />
                </button>
              </div>

              <div className="bg-[var(--foreground)]/[0.02] p-3 rounded-xl flex items-center gap-3">
                <div className="h-8 w-8 text-xs font-black bg-rose-500/10 text-rose-500 flex items-center justify-center rounded-lg uppercase shrink-0">
                  {selectedCustomer.name.substring(0, 2)}
                </div>
                <div>
                  <p className="text-[10px] text-zinc-400 font-bold uppercase leading-none">Modifying Account Of</p>
                  <p className="text-xs font-bold uppercase truncate max-w-[200px] mt-1 text-white">{selectedCustomer.name}</p>
                </div>
              </div>

              <form onSubmit={handleAddTransaction} className="space-y-4">
                <div className="space-y-1.5 text-left">
                  <label className="text-[9px] font-black uppercase opacity-45">Amount Value (रुपये की राशि)</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-bold">₹</span>
                    <input 
                      type="number" 
                      placeholder="0.00" 
                      value={transactionAmount}
                      onChange={(e) => setTransactionAmount(e.target.value)}
                      required
                      autoFocus
                      className="w-full text-xs font-black rounded-xl border border-[var(--border)] bg-[var(--foreground)]/[0.03] py-3 pl-8 pr-4 focus:outline-none focus:border-rose-500 font-mono text-white"
                    />
                  </div>
                </div>

                <div className="space-y-1.5 text-left">
                  <label className="text-[9px] font-black uppercase opacity-45">Remarks Notes (विवरण - जैसे सामान का नाम)</label>
                  <input 
                    type="text" 
                    placeholder="E.g. Kirana checklist or cash" 
                    value={transactionNote}
                    onChange={(e) => setTransactionNote(e.target.value)}
                    className="w-full text-xs font-bold rounded-xl border border-[var(--border)] bg-[var(--foreground)]/[0.03] py-3 px-4 focus:outline-none focus:border-rose-500"
                  />
                </div>

                {showTransactionModal === 'given' && (
                  <div className="space-y-1.5 text-left">
                    <label className="text-[9px] font-black uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
                      <Calendar size={11} className="animate-pulse" />
                      <span>Due Date for Credit Repayment (वैकल्पिक भुगतान तिथि)</span>
                    </label>
                    <input 
                      type="date" 
                      value={transactionDueDate}
                      onChange={(e) => setTransactionDueDate(e.target.value)}
                      className="w-full text-xs font-bold rounded-xl border border-[var(--border)] bg-[var(--foreground)]/[0.03] py-3 px-4 focus:outline-none focus:border-rose-500 text-white font-mono"
                    />
                    <div className="flex gap-1.5 mt-1.5 flex-wrap">
                      <button
                        type="button"
                        onClick={() => {
                          const now = new Date();
                          const year = now.getFullYear();
                          const month = String(now.getMonth() + 1).padStart(2, '0');
                          const day = String(now.getDate()).padStart(2, '0');
                          setTransactionDueDate(`${year}-${month}-${day}`);
                        }}
                        className={cn(
                          "px-2 py-1 rounded text-[8px] font-black uppercase tracking-wider transition-all border",
                          (() => {
                            const now = new Date();
                            const year = now.getFullYear();
                            const month = String(now.getMonth() + 1).padStart(2, '0');
                            const day = String(now.getDate()).padStart(2, '0');
                            return transactionDueDate === `${year}-${month}-${day}`;
                          })()
                            ? "bg-rose-500/20 text-rose-400 border-rose-500/40" 
                            : "bg-white/5 text-zinc-400 border-white/5 hover:border-zinc-700"
                        )}
                      >
                        Today
                      </button>
                      {[7, 15, 30].map(days => {
                        const d = new Date();
                        d.setDate(d.getDate() + days);
                        const isoStr = d.toISOString().split('T')[0];
                        const isSelected = transactionDueDate === isoStr;
                        return (
                          <button
                            type="button"
                            key={days}
                            onClick={() => setTransactionDueDate(isoStr)}
                            className={cn(
                              "px-2 py-1 rounded text-[8px] font-black uppercase tracking-wider transition-all border",
                              isSelected 
                                ? "bg-rose-500/20 text-rose-400 border-rose-500/40" 
                                : "bg-white/5 text-zinc-400 border-white/5 hover:border-zinc-700"
                            )}
                          >
                            +{days} Days
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="pt-2 flex gap-3">
                  <Button 
                    type="button" 
                    onClick={() => setShowTransactionModal(null)}
                    variant="ghost" 
                    className="flex-1 py-3 text-[10px] uppercase font-black tracking-wider rounded-xl col-span-1"
                  >
                    Dismiss
                  </Button>
                  <button 
                    type="submit" 
                    className={`flex-1 py-3 border border-transparent font-black text-[10px] uppercase tracking-wider rounded-xl cursor-pointer text-white shadow-md ${
                      showTransactionModal === 'given' 
                        ? 'bg-rose-500 hover:bg-rose-600' 
                        : 'bg-green-500 hover:bg-green-600'
                    }`}
                  >
                    Save Entry Record
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {/* MODAL 3: EDIT CUSTOMER */}
        {editingCustomer && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-sm bg-[var(--card)] border border-[var(--border)] rounded-3xl p-6 shadow-2xl space-y-4 text-[var(--foreground)]"
            >
              <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
                <h4 className="font-bold text-xs uppercase tracking-widest text-rose-500">Edit Customer Profile</h4>
                <button onClick={() => setEditingCustomer(null)} className="text-[var(--foreground)]/50 hover:text-white cursor-pointer">
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleSaveEditCustomer} className="space-y-4 text-left">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase opacity-45">Customer Full Name</label>
                  <input 
                    type="text" 
                    value={editCustName} 
                    onChange={e => setEditCustName(e.target.value)} 
                    className="w-full text-xs font-bold rounded-xl border border-[var(--border)] bg-[var(--foreground)]/[0.03] py-2.5 px-3 focus:outline-none focus:border-rose-500 text-[var(--foreground)]"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase opacity-45">Customer Phone Number (Optional)</label>
                  <input 
                    type="text" 
                    placeholder="Ten digit WhatsApp number"
                    value={editCustPhone} 
                    onChange={e => setEditCustPhone(e.target.value)} 
                    className="w-full text-xs font-bold rounded-xl border border-[var(--border)] bg-[var(--foreground)]/[0.03] py-2.5 px-3 focus:outline-none focus:border-rose-500 text-[var(--foreground)] font-mono"
                  />
                </div>

                <div className="pt-2 flex gap-3">
                  <Button 
                    type="button" 
                    onClick={() => setEditingCustomer(null)}
                    variant="ghost" 
                    className="flex-1 py-2.5 text-[10px] uppercase font-black tracking-wider rounded-xl"
                  >
                    Cancel
                  </Button>
                  <button 
                    type="submit" 
                    className="flex-1 py-2.5 bg-rose-500 hover:bg-rose-600 text-white font-black text-[10px] uppercase tracking-wider rounded-xl cursor-pointer"
                  >
                    Save Profile
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {/* MODAL 4: EDIT TRANSACTION ENTRY */}
        {editingTransaction && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-sm bg-[var(--card)] border border-[var(--border)] rounded-3xl p-6 shadow-2xl space-y-4 text-[var(--foreground)]"
            >
              <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
                <h4 className="font-bold text-xs uppercase tracking-widest text-rose-500">
                  Edit {editingTransaction.type === 'given' ? 'Credit Given' : 'Repayment Received'}
                </h4>
                <button onClick={() => setEditingTransaction(null)} className="text-[var(--foreground)]/50 hover:text-white cursor-pointer">
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleSaveEditTransaction} className="space-y-4 text-left">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase opacity-45">Transaction Amount (₹)</label>
                  <input 
                    type="number" 
                    step="any"
                    value={editTxAmount} 
                    onChange={e => setEditTxAmount(e.target.value)} 
                    className="w-full text-xs font-bold rounded-xl border border-[var(--border)] bg-[var(--foreground)]/[0.03] py-2.5 px-3 focus:outline-none focus:border-rose-500 text-[var(--foreground)] font-mono"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase opacity-45">Narration / Note</label>
                  <input 
                    type="text" 
                    value={editTxNote} 
                    onChange={e => setEditTxNote(e.target.value)} 
                    className="w-full text-xs font-bold rounded-xl border border-[var(--border)] bg-[var(--foreground)]/[0.03] py-2.5 px-3 focus:outline-none focus:border-rose-500 text-[var(--foreground)]"
                  />
                </div>

                {editingTransaction.type === 'given' && (
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black uppercase opacity-45">Payment Due Date (Optional)</label>
                    <input 
                      type="date" 
                      value={editTxDueDate} 
                      onChange={e => setEditTxDueDate(e.target.value)} 
                      className="w-full text-xs font-bold rounded-xl border border-[var(--border)] bg-[var(--foreground)]/[0.03] py-2.5 px-3 focus:outline-none focus:border-rose-500 text-[var(--foreground)] font-mono"
                    />
                  </div>
                )}

                <div className="pt-2 flex gap-3">
                  <Button 
                    type="button" 
                    onClick={() => setEditingTransaction(null)}
                    variant="ghost" 
                    className="flex-1 py-2.5 text-[10px] uppercase font-black tracking-wider rounded-xl"
                  >
                    Cancel
                  </Button>
                  <button 
                    type="submit" 
                    className="flex-1 py-2.5 bg-rose-500 hover:bg-rose-600 text-white font-black text-[10px] uppercase tracking-wider rounded-xl cursor-pointer"
                  >
                    Update Entry
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {/* MODAL 5: DETAILED BILL INVOICE PREVIEW */}
        {viewingBill && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md bg-[var(--card)] border border-[var(--border)] rounded-3xl p-6 shadow-2xl space-y-4 text-[var(--foreground)]"
            >
              <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h4 className="font-bold text-xs uppercase tracking-widest text-rose-500 flex items-center gap-1.5">
                    <Receipt size={14} /> Invoice Details
                  </h4>
                  <button
                    onClick={() => {
                      if (onEditBillInCounter && viewingBill) {
                        onEditBillInCounter(viewingBill);
                        setViewingBill(null);
                      }
                    }}
                    className="px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 text-[9.5px] font-black uppercase tracking-wider flex items-center gap-1.5 cursor-pointer transition-all border border-rose-500/20 active:scale-95 shadow-2xs"
                    title="Open and edit this bill directly in the Billing Counter"
                  >
                    <Edit size={11} /> Edit in Billing Counter
                  </button>
                </div>
                <button 
                  onClick={() => {
                    setViewingBill(null);
                  }} 
                  className="text-[var(--foreground)]/50 hover:text-white cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-4 max-h-[60vh] overflow-y-auto no-scrollbar pr-1 text-left">
                {/* Meta details */}
                <div className="p-3 bg-[var(--foreground)]/[0.02] border border-[var(--border)] rounded-2xl space-y-1 text-xs">
                  <div className="flex justify-between font-mono text-[10px] opacity-60">
                    <span>Invoice: #{viewingBill.billNumber}</span>
                    <span>{new Date(viewingBill.timestamp).toLocaleString()}</span>
                  </div>
                  <div className="font-extrabold text-[var(--foreground)] uppercase mt-1">
                    {viewingBill.customerName}
                  </div>
                  {viewingBill.customerPhone && (
                    <div className="font-mono text-[10px] opacity-60">
                      Mobile: {viewingBill.customerPhone}
                    </div>
                  )}
                  <div className="text-[10px] text-rose-500 font-bold uppercase tracking-wider mt-1">
                    Payment Status: {viewingBill.paymentMethod} (Udhar)
                  </div>
                </div>

                {/* VIEW MODE ONLY */}
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <span className="text-[8.5px] font-black uppercase tracking-wider text-[var(--foreground)] opacity-80">Products Listing</span>
                    <div className="border border-[var(--border)] rounded-xl overflow-hidden divide-y divide-[var(--border)] bg-[var(--foreground)]/[0.01]">
                      {viewingBill.items.map((it, idx) => (
                        <div key={idx} className="p-2.5 bg-[var(--card)] flex items-center justify-between gap-1.5">
                          <div className="min-w-0 flex-1 text-left">
                            <div className="text-[10px] font-black uppercase truncate text-[var(--foreground)]">{it.name}</div>
                            <div className="text-[8.5px] font-mono text-[var(--foreground)] opacity-75">{it.quantity} {it.unit} × ₹{it.price.toFixed(1)}</div>
                          </div>
                          <div className="text-[10.5px] font-black font-mono text-[var(--foreground)]">
                            ₹{(it.price * it.quantity).toFixed(0)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="p-3 border border-[var(--border)] rounded-xl bg-[var(--foreground)]/[0.02] space-y-1.5 text-xs">
                    <div className="flex justify-between text-[10px] opacity-80">
                      <span>Basket Subtotal:</span>
                      <span className="font-mono">₹{viewingBill.subtotal.toFixed(2)}</span>
                    </div>

                    {viewingBill.discount > 0 && (
                      <div className="flex justify-between text-[10px] text-emerald-500">
                        <span>Promo Deduction ({viewingBill.discount}%):</span>
                        <span className="font-mono">-₹{((viewingBill.subtotal * viewingBill.discount) / 100).toFixed(2)}</span>
                      </div>
                    )}

                    {viewingBill.tax > 0 && (
                      <div className="flex justify-between text-[10px] text-rose-500">
                        <span>SGST/CGST Tax ({viewingBill.tax}%):</span>
                        <span className="font-mono">+₹{(((viewingBill.subtotal - (viewingBill.subtotal * viewingBill.discount / 100)) * viewingBill.tax) / 100).toFixed(2)}</span>
                      </div>
                    )}

                    <div className="flex justify-between text-xs font-black pt-1.5 mt-1 border-t border-[var(--border)]">
                      <span className="uppercase tracking-wider">Net Amount:</span>
                      <span className="text-[var(--primary)] font-mono">₹{viewingBill.total.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-[var(--border)]">
                <button
                  onClick={() => {
                    setViewingBill(null);
                  }}
                  type="button"
                  className="w-full py-2.5 bg-[var(--primary)] text-white text-[10px] font-black uppercase tracking-wider rounded-xl hover:opacity-90 active:scale-95 transition-all cursor-pointer"
                >
                  Close Bill
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
