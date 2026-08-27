import React, { useState, useMemo, useEffect } from 'react';
import { 
  Users, Plus, Trash2, ArrowUpRight, ArrowDownRight, Phone, 
  MessageSquare, Search, Landmark, Receipt, Calendar, Info, 
  CheckCircle2, AlertCircle, RefreshCw, ChevronRight, X, Sparkles, UserMinus, Edit
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { AppState, UdharCustomer, UdharTransaction, Bill } from '../types';
import { Button } from './ui/Button';
import { cn } from '../lib/utils';
import { RecoveryService } from '../services/recoveryService';

interface UdharScreenProps {
  state: AppState;
  t: any;
  onUpdateState: (updates: Partial<AppState>) => void;
  selectedCustomerId?: string | null;
  onSelectCustomerId?: (id: string | null) => void;
}

export default function UdharScreen({ 
  state, 
  t, 
  onUpdateState,
  selectedCustomerId: propSelectedCustomerId,
  onSelectCustomerId: propOnSelectCustomerId
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

  // Bill editing states
  const [isEditingBill, setIsEditingBill] = useState(false);
  const [editingBillData, setEditingBillData] = useState<Bill | null>(null);
  
  // New item form inside bill editor
  const [newItemName, setNewItemName] = useState('');
  const [newItemQty, setNewItemQty] = useState('');
  const [newItemPrice, setNewItemPrice] = useState('');
  const [newItemUnit, setNewItemUnit] = useState('');

  // Recalculate bill subtotals/totals helper
  const recalculateBill = (items: any[], discount: number, tax: number) => {
    const subtotal = items.reduce((acc, it) => acc + (parseFloat(it.quantity || 0) * parseFloat(it.price || 0)), 0);
    const discountAmt = (subtotal * discount) / 100;
    const subtotalAfterDiscount = subtotal - discountAmt;
    const taxAmt = (subtotalAfterDiscount * tax) / 100;
    const total = parseFloat((subtotalAfterDiscount + taxAmt).toFixed(2));
    return {
      subtotal: parseFloat(subtotal.toFixed(2)),
      total: total
    };
  };

  const updateItemQty = (index: number, newQty: number) => {
    if (!editingBillData) return;
    const updatedItems = editingBillData.items.map((it, idx) => {
      if (idx === index) {
        return { ...it, quantity: Math.max(0, newQty) };
      }
      return it;
    });
    const calculations = recalculateBill(updatedItems, editingBillData.discount, editingBillData.tax);
    setEditingBillData({
      ...editingBillData,
      items: updatedItems,
      ...calculations
    });
  };

  const updateItemPrice = (index: number, newPrice: number) => {
    if (!editingBillData) return;
    const updatedItems = editingBillData.items.map((it, idx) => {
      if (idx === index) {
        return { ...it, price: Math.max(0, newPrice) };
      }
      return it;
    });
    const calculations = recalculateBill(updatedItems, editingBillData.discount, editingBillData.tax);
    setEditingBillData({
      ...editingBillData,
      items: updatedItems,
      ...calculations
    });
  };

  const updateItemName = (index: number, newName: string) => {
    if (!editingBillData) return;
    const updatedItems = editingBillData.items.map((it, idx) => {
      if (idx === index) {
        return { ...it, name: newName };
      }
      return it;
    });
    setEditingBillData({
      ...editingBillData,
      items: updatedItems
    });
  };

  const deleteItemFromBill = (index: number) => {
    if (!editingBillData) return;
    const updatedItems = editingBillData.items.filter((_, idx) => idx !== index);
    const calculations = recalculateBill(updatedItems, editingBillData.discount, editingBillData.tax);
    setEditingBillData({
      ...editingBillData,
      items: updatedItems,
      ...calculations
    });
  };

  const handleAddNewItemToBill = () => {
    if (!editingBillData) return;
    const qty = parseFloat(newItemQty);
    const prc = parseFloat(newItemPrice);
    if (!newItemName.trim() || isNaN(qty) || isNaN(prc)) {
      alert("Please fill item name, valid quantity and price to add.");
      return;
    }
    if (qty <= 0 || prc < 0) {
      alert("Quantity must be positive and price must be 0 or more.");
      return;
    }
    const newItem = {
      itemId: 'it_' + Math.random().toString(36).substring(2, 11),
      name: newItemName.trim(),
      quantity: qty,
      price: prc,
      cost: parseFloat((prc * 0.7).toFixed(2)),
      unit: newItemUnit.trim() || 'pcs'
    };
    const updatedItems = [...editingBillData.items, newItem];
    const calculations = recalculateBill(updatedItems, editingBillData.discount, editingBillData.tax);
    setEditingBillData({
      ...editingBillData,
      items: updatedItems,
      ...calculations
    });
    // Reset fields
    setNewItemName('');
    setNewItemQty('');
    setNewItemPrice('');
    setNewItemUnit('');
  };

  const handleUpdateDiscountTax = (disc: number, txPercent: number) => {
    if (!editingBillData) return;
    const calculations = recalculateBill(editingBillData.items, disc, txPercent);
    setEditingBillData({
      ...editingBillData,
      discount: disc,
      tax: txPercent,
      ...calculations
    });
  };

  const handleSaveEditedBill = () => {
    if (!editingBillData || !viewingBill) return;
    if (editingBillData.items.length === 0) {
      alert("A bill must contain at least one item.");
      return;
    }

    const originalTotal = viewingBill.total;
    const newTotal = editingBillData.total;
    const difference = parseFloat((newTotal - originalTotal).toFixed(2));

    // 1. Update bills collection
    const updatedBills = (state.bills || []).map(b => b.id === viewingBill.id ? editingBillData : b);

    // 2. Update associated transaction
    let updatedTransactions = [...rawTransactions];
    const tx = rawTransactions.find(t => t.note && t.note.toLowerCase().includes(`reference #${viewingBill.billNumber.toLowerCase()}`));
    if (tx) {
      updatedTransactions = rawTransactions.map(t => t.id === tx.id ? {
        ...t,
        amount: newTotal,
        lastUpdated: new Date().toISOString()
      } : t);
    }

    // 3. Update customer outstanding balance
    const customer = rawCustomers.find(c => 
      (tx && c.id === tx.customerId) || 
      c.name.toLowerCase() === viewingBill.customerName.toLowerCase() || 
      (viewingBill.customerPhone && c.phone === viewingBill.customerPhone)
    );

    let updatedCustomers = [...rawCustomers];
    if (customer) {
      updatedCustomers = rawCustomers.map(c => c.id === customer.id ? {
        ...c,
        totalUdhar: parseFloat((c.totalUdhar + difference).toFixed(2)),
        lastUpdated: new Date().toISOString()
      } : c);
    }

    onUpdateState({
      bills: updatedBills,
      udharTransactions: updatedTransactions,
      udharCustomers: updatedCustomers
    });

    setViewingBill(editingBillData);
    setIsEditingBill(false);
    setEditingBillData(null);
  };

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

    rawCustomers.forEach(cust => {
      if (cust.totalUdhar > 0) {
        totalOutstanding += cust.totalUdhar;
        debtorCount++;
      }
    });

    return {
      totalOutstanding,
      debtorCount
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
    const lang = state.settings.language || 'en';
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
    <div className="space-y-6 pb-32 max-w-7xl mx-auto text-[var(--foreground)]">
      
      {/* Header Row */}
      <div className="flex items-center justify-between border-b border-[var(--border)] pb-3 flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-black text-[var(--foreground)] tracking-tighter uppercase mb-1 flex items-center gap-2">
            <Landmark className="text-rose-500" size={24} /> Udhar <span className="text-rose-500">Book Ledger</span>
          </h2>
          <p className="text-[10px] font-bold opacity-50 uppercase tracking-[0.2em]">Manage regular customer credit and payments (उधार खाता डायरी)</p>
        </div>

        <button 
          onClick={() => setShowAddCustomerModal(true)}
          className="px-5 py-2.5 rounded-xl text-[10px] bg-rose-500 text-white hover:bg-rose-600 font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer shadow-lg active:scale-95"
        >
          <Plus size={14} /> Open New Khata (नया खाता)
        </button>
      </div>

      {/* KPIs Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* Metric Card 1: Total Outstanding */}
        <div className="card p-6 bg-[var(--card)] border border-[var(--border)] relative overflow-hidden group rounded-2xl shadow-sm">
          <div className="absolute top-0 right-0 h-16 w-16 bg-rose-500/5 rounded-full blur-xl group-hover:scale-150 transition-transform" />
          <p className="text-[9px] font-black text-rose-500 uppercase tracking-widest leading-none flex items-center gap-1.5">
            <Landmark size={11} /> Total Outstanding Credit (कुल उधार)
          </p>
          <div className="flex items-baseline gap-1 mt-2.5">
            <span className="text-2xl font-black text-rose-500 font-mono">₹{kpis.totalOutstanding.toLocaleString(undefined, {maximumFractionDigits: 1})}</span>
            <span className="text-[8px] text-rose-500 font-bold flex items-center gap-0.5 leading-none bg-rose-500/10 px-1.5 py-0.5 rounded ml-2">
              Receivable
            </span>
          </div>
          <div className="text-[8px] font-medium opacity-40 uppercase tracking-wider mt-3 font-mono">
            Outstanding debt across all registers
          </div>
        </div>

        {/* Metric Card 2: Active Debt Customers */}
        <div className="card p-6 bg-[var(--card)] border border-[var(--border)] relative overflow-hidden group rounded-2xl shadow-sm">
          <div className="absolute top-0 right-0 h-16 w-16 bg-amber-500/5 rounded-full blur-xl group-hover:scale-150 transition-transform" />
          <p className="text-[9px] font-black text-amber-500 uppercase tracking-widest leading-none flex items-center gap-1.5">
            <Users size={11} /> Active Debt Accounts (बाकी खाता ग्राहक)
          </p>
          <div className="flex items-baseline gap-1 mt-2.5">
            <span className="text-2xl font-black text-[var(--foreground)] font-mono">{kpis.debtorCount} Users</span>
            <span className="text-[8px] text-amber-500 font-bold flex items-center gap-0.5 leading-none bg-amber-500/10 px-1.5 py-0.5 rounded ml-2">
              Due settle
            </span>
          </div>
          <div className="text-[8px] font-medium opacity-40 uppercase tracking-wider mt-3 font-mono">
            Customers with pending payment defaults
          </div>
        </div>

        {/* Metric Card 3: Secure digital ledger */}
        <div className="card p-5 bg-[var(--card)] border border-[var(--border)] rounded-2xl relative overflow-hidden shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-[10px] font-black opacity-50 uppercase tracking-widest flex items-center gap-1.5">
              <Sparkles className="text-green-500 animate-pulse" size={12} /> Double-Entry Security
            </p>
            <p className="text-[11px] opacity-40 leading-snug max-w-[200px]">
              Offline cryptographic ledger guarantees balances won't overwrite.
            </p>
          </div>
          <div className="h-12 w-12 bg-green-500/10 rounded-full border border-green-500/20 flex items-center justify-center text-green-500">
            <CheckCircle2 size={24} />
          </div>
        </div>

      </div>

      {/* 30+ Days Outstanding Customers Automatic Recommendations */}
      {overdue30DaysCustomers.length > 0 && (
         <div className="card p-5 bg-rose-500/5 border border-rose-500/20 rounded-2xl space-y-3">
             <div className="flex items-center justify-between flex-wrap gap-2">
                 <div className="flex items-center gap-2">
                     <AlertCircle className="text-rose-500 animate-pulse" size={16} />
                     <p className="text-xs font-black uppercase tracking-wider text-rose-500">Exceeded 30 Days Unpaid Dues (30+ दिन पुराना बकाया उधार)</p>
                 </div>
                 <span className="text-[9px] font-black uppercase bg-rose-500/25 text-rose-400 px-2 py-0.5 rounded border border-rose-500/30">
                     Action Suggested ({overdue30DaysCustomers.length})
                 </span>
             </div>
             <p className="text-[10px] opacity-70">
                 The following customer accounts have credit entries with no payment recorded for over 30 days. Recommend sending professional WhatsApp reminders below:
             </p>
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
                 {overdue30DaysCustomers.map(({ customer, tx, days }) => (
                     <div key={customer.id + '-' + tx.id} className="p-3 bg-[var(--card)] rounded-xl border border-[var(--border)] flex flex-col justify-between gap-3 text-xs">
                         <div className="space-y-1">
                             <div className="flex justify-between items-start gap-2">
                                 <div>
                                     <p className="font-extrabold uppercase text-[11px] text-[var(--foreground)] tracking-tight">{customer.name}</p>
                                     <p className="text-[9px] opacity-45 font-mono">{customer.phone ? `+91 ${customer.phone}` : 'No phone phone'}</p>
                                 </div>
                                 <span className="text-[8px] font-black uppercase text-rose-400 bg-rose-500/10 border border-rose-500/20 px-1.5 py-0.5 rounded">
                                     {days} Days Old
                                 </span>
                             </div>
                             <div className="pt-1 flex items-baseline justify-between select-none">
                                 <span className="text-[8px] opacity-50 uppercase tracking-widest font-black">Due Amount:</span>
                                 <span className="text-xs font-black text-rose-500 font-mono">₹{Math.abs(tx.amount).toLocaleString()}</span>
                             </div>
                             {tx.note && (
                                 <p className="text-[9px] opacity-60 leading-tight truncate">📝 Note: {tx.note}</p>
                             )}
                             <p className="text-[8px] opacity-35 font-mono">Date: {new Date(tx.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                         </div>
                         <div className="flex gap-2">
                             <button
                                 onClick={() => setSelectedCustomerId(customer.id)}
                                 className="flex-1 py-1 px-2 rounded-lg border border-[var(--border)] hover:border-rose-505/30 text-[9px] font-bold uppercase tracking-wider text-center transition-all bg-transparent hover:bg-rose-500/5 cursor-pointer text-[var(--foreground)]"
                             >
                                 Open Ledger
                             </button>
                             {customer.phone ? (
                                 <button
                                     onClick={() => {
                                         const message = generateWhatsAppReminderText(customer.name, customer.phone, customer.totalUdhar, tx.timestamp, days, tx.note);
                                         const url = `https://wa.me/91${customer.phone}?text=${encodeURIComponent(message)}`;
                                         window.open(url, '_blank');
                                     }}
                                     className="px-2.5 py-1 rounded-lg bg-green-600 hover:bg-green-700 text-white text-[9px] font-extrabold uppercase tracking-widest text-center transition-all flex items-center justify-center gap-1 cursor-pointer shadow"
                                     title="Send Professional WhatsApp Reminder"
                                 >
                                     <MessageSquare size={10} className="shrink-0" />
                                     <span>Request</span>
                                 </button>
                             ) : (
                                 <span className="px-2.5 py-1 rounded-lg bg-white/5 text-zinc-500 text-[8px] font-bold uppercase tracking-wider text-center select-none">
                                     No Phone
                                 </span>
                             )}
                         </div>
                     </div>
                 ))}
             </div>
         </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Customer Directory List */}
        <div className="lg:col-span-5 card p-5 bg-[var(--card)] border border-[var(--border)] rounded-3xl space-y-4 shadow-sm">
          {/* Professional Language Selector Pill Box */}
          <div className="bg-[var(--foreground)]/[0.02] border border-[var(--border)]/60 rounded-2xl p-2.5 flex items-center justify-between gap-2 select-none">
            <span className="text-[9px] font-black uppercase tracking-wider text-[var(--foreground)]/50 pl-1 flex items-center gap-1 shrink-0">
              🌐 Language / भाषा:
            </span>
            <div className="flex gap-1 overflow-x-auto no-scrollbar">
              {[
                { id: 'en', label: 'EN', emoji: '🇬🇧', title: 'English' },
                { id: 'hi-en', label: 'HING', emoji: '🇮🇳', title: 'Hinglish' },
                { id: 'hi', label: 'हिन्दी', emoji: '🇮🇳', title: 'हिन्दी' },
                { id: 'mr', label: 'मराठी', emoji: '🇮🇳', title: 'मराठी' }
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
                    className={`px-2.5 py-1 rounded-xl text-[9px] font-black uppercase tracking-wider flex items-center gap-1 cursor-pointer transition-all ${
                      isActive 
                        ? 'bg-rose-500 text-white shadow-sm' 
                        : 'bg-[var(--card)] border border-[var(--border)] text-[var(--foreground)]/60 hover:text-[var(--foreground)] hover:border-rose-500/20'
                    }`}
                  >
                    <span>{lang.emoji}</span>
                    <span>{lang.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-between border-b border-[var(--border)] pb-2">
            <div>
              <h4 className="font-bold text-[var(--foreground)] text-sm">Customer Accounts Directory</h4>
              <p className="text-[9px] opacity-40 font-bold uppercase tracking-wider">Select customer to view digital ledger</p>
            </div>
          </div>

          {/* Search bar inside ledger directory */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 opacity-30" size={16} />
            <input 
              type="text" 
              placeholder="Search customer name or phone..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs font-bold rounded-xl border border-[var(--border)] bg-[var(--foreground)]/[0.03] py-3 pl-11 pr-4 focus:outline-none focus:border-rose-500/40 focus:ring-1 focus:ring-rose-500/30 shadow-inner"
            />
          </div>

          <div className="space-y-2 overflow-y-auto max-h-[50vh] no-scrollbar pr-1">
            {filteredCustomers.length === 0 ? (
              <div className="py-20 text-center border border-dashed border-[var(--border)] rounded-2xl opacity-40 space-y-2">
                <Users size={32} className="mx-auto opacity-30 text-rose-500" />
                <p className="text-xs font-black uppercase tracking-wider">No Khata Records Found</p>
                <p className="text-[10px] max-w-[200px] mx-auto opacity-60">Click Open New Khata to add your first customer credit book!</p>
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
                    className={`flex items-center justify-between p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden group ${
                      isSelected 
                        ? 'border-rose-500/30 bg-rose-500/5 shadow-md' 
                        : 'border-[var(--border)] hover:border-rose-500/20 hover:bg-[var(--foreground)]/[0.01]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`h-10 w-10 rounded-xl flex items-center justify-center text-xs font-black uppercase ${
                        outstanding > 0 ? "bg-rose-500/10 text-rose-500" : "bg-green-500/10 text-green-500"
                      }`}>
                        {cust.name.substring(0, 2)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-black truncate max-w-[130px] uppercase tracking-tight text-[var(--foreground)]">{cust.name}</p>
                        {cust.phone ? (
                          <p className="text-[9px] font-mono opacity-50 mt-0.5">{cust.phone}</p>
                        ) : (
                          <p className="text-[9px] italic opacity-30 mt-0.5">No contact link</p>
                        )}
                      </div>
                    </div>

                    <div className="text-right">
                      <p className={`text-xs font-mono font-black ${
                        outstanding > 0 ? 'text-rose-500' : 'text-green-500 font-extrabold'
                      }`}>
                        {isSettled ? "Settled ✓" : `₹${outstanding.toLocaleString()}`}
                      </p>
                      <p className="text-[8px] opacity-30 uppercase mt-1 leading-none">
                        {outstanding > 0 ? 'Due (बाकी है)' : 'Equal (बराबर)'}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Selected Customer Transactions Ledger */}
        <div className="lg:col-span-7 card p-5 bg-[var(--card)] border border-[var(--border)] rounded-3xl space-y-6 shadow-sm min-h-[400px]">
          {selectedCustomer ? (
            <div className="space-y-6">
              
              {/* Ledger Summary and controls */}
              <div className="flex items-center justify-between border-b border-[var(--border)] pb-4 flex-wrap gap-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 text-xs font-black bg-rose-500/10 text-rose-500 flex items-center justify-center rounded-xl uppercase">
                    {selectedCustomer.name.substring(0, 2)}
                  </div>
                  <div className="flex flex-col">
                    <div className="flex items-center gap-1.5">
                      <h3 className="text-sm font-black uppercase tracking-tight text-[var(--foreground)]">{selectedCustomer.name}</h3>
                      <button
                        onClick={() => {
                          setEditingCustomer(selectedCustomer);
                          setEditCustName(selectedCustomer.name);
                          setEditCustPhone(selectedCustomer.phone || '');
                        }}
                        className="p-1 hover:bg-[var(--foreground)]/5 text-[var(--foreground)]/45 hover:text-rose-500 rounded transition-colors cursor-pointer flex items-center justify-center"
                        title="Edit Customer Profile"
                      >
                        <Edit size={12} />
                      </button>
                    </div>
                    <p className="text-[9px] opacity-40 font-bold uppercase tracking-widest mt-0.5">Account Khata Diary Ledger</p>
                  </div>
                </div>

                {/* Quick actions for Contact */}
                <div className="flex gap-1.5">
                  {selectedCustomer.phone && (
                    <>
                      <a 
                        href={`tel:${selectedCustomer.phone}`}
                        className="h-9 w-9 bg-[var(--foreground)]/5 hover:bg-rose-500/10 border border-[var(--border)] hover:border-rose-500/30 rounded-xl flex items-center justify-center text-[var(--foreground)] hover:text-rose-500 transition-all shadow-sm"
                        title="Voice Call"
                      >
                        <Phone size={14} />
                      </a>
                      <button 
                        onClick={() => handleWhatsAppReminder(selectedCustomer)}
                        className="h-9 font-bold px-3 text-[10px] uppercase tracking-wider bg-emerald-500/10 hover:bg-emerald-500/20 text-green-500 border border-green-500/20 hover:border-green-500/40 rounded-xl flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
                        title="WhatsApp Remind"
                      >
                        <MessageSquare size={13} /> Settle Pay link
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => handleDeleteCustomer(selectedCustomer.id)}
                    className="h-9 w-9 bg-red-500/5 hover:bg-red-500/20 border border-red-500/20 rounded-xl flex items-center justify-center text-red-500 transition-all shadow-sm cursor-pointer ml-2"
                    title="Delete Customer Account"
                  >
                    <UserMinus size={14} />
                  </button>
                </div>
              </div>

              {/* Outstanding large banner */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-rose-500/5 rounded-2xl border border-rose-500/10 p-4 space-y-1">
                  <span className="text-[8px] font-black text-rose-500 uppercase tracking-widest block leading-none">Customer owes you</span>
                  <span className="text-xl font-mono font-black text-rose-500">
                    ₹{Math.max(0, selectedCustomer.totalUdhar).toLocaleString()}
                  </span>
                  <span className="text-[8px] opacity-40 block">Credits recorded to date</span>
                </div>

                {/* Floating Payment actions */}
                <div className="flex gap-2 items-center">
                  <button
                    onClick={() => setShowTransactionModal('given')}
                    className="flex-1 py-4 px-3 rounded-2xl bg-rose-500 text-white font-black text-[10px] uppercase tracking-wider hover:bg-rose-600 transition-all shadow-md hover:shadow-lg active:scale-95 text-center cursor-pointer"
                  >
                    Give Udhar <br/> (उधार दिया -)
                  </button>
                  <button
                    onClick={() => setShowTransactionModal('received')}
                    className="flex-1 py-4 px-3 rounded-2xl bg-green-500 text-white font-black text-[10px] uppercase tracking-wider hover:bg-green-600 transition-all shadow-md hover:shadow-lg active:scale-95 text-center cursor-pointer"
                  >
                    Received Repay <br/> (भुगतान मिला +)
                  </button>
                </div>
              </div>

              {/* Transactions Diary List view */}
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1 border-b border-[var(--border)]/40">
                  <h4 className="text-[10px] font-black uppercase opacity-40 tracking-wider">Chronological Entry Log</h4>
                  
                  {/* Ledger search bar */}
                  {selectedLedger.length > 0 && (
                    <div className="relative w-full sm:w-64">
                      <Search size={11} className="absolute left-3 top-1/2 -translate-y-1/2 text-rose-500" />
                      <input 
                        type="text"
                        value={ledgerSearchQuery}
                        onChange={(e) => setLedgerSearchQuery(e.target.value)}
                        placeholder="Search entries (amount, note, date)..."
                        className="w-full text-[10px] font-bold rounded-xl border border-[var(--border)] bg-[var(--foreground)]/[0.03] pl-8 pr-8 py-1.5 focus:outline-none focus:border-rose-500 text-[var(--foreground)] placeholder:text-[var(--foreground)]/40"
                      />
                      {ledgerSearchQuery && (
                        <button 
                          type="button"
                          onClick={() => setLedgerSearchQuery('')}
                          className="absolute right-2 text-zinc-400 hover:text-rose-500 top-1/2 -translate-y-1/2 p-1 cursor-pointer"
                        >
                          <X size={10} />
                        </button>
                      )}
                    </div>
                  )}
                </div>

                <div className="divide-y divide-[var(--border)] overflow-hidden">
                  {selectedLedger.length === 0 ? (
                    <div className="py-16 text-center opacity-30 text-[10px] uppercase tracking-wider font-extrabold font-mono border border-dashed border-[var(--border)] rounded-2xl">
                      Empty ledger book history
                    </div>
                  ) : filteredLedger.length === 0 ? (
                    <div className="py-16 text-center opacity-30 text-[10px] uppercase tracking-wider font-extrabold font-mono border border-dashed border-[var(--border)] rounded-2xl">
                      No matching records found for "{ledgerSearchQuery}"
                    </div>
                  ) : (
                    filteredLedger.map((tx, tIdx) => {
                      const isGiven = tx.type === 'given';
                      return (
                        <div key={`udhar-tx-${tx.id || 'tx'}-${tIdx}`} className="flex items-center justify-between py-3.5 first:pt-0 last:pb-0 font-medium">
                          <div className="flex items-center gap-3">
                            <div className={`h-8 w-8 rounded-lg flex items-center justify-center font-mono text-center shrink-0 ${
                              isGiven ? 'bg-rose-500/10 text-rose-500' : 'bg-green-500/10 text-green-500'
                            }`}>
                              {isGiven ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                            </div>
                            <div>
                              <p className="text-xs font-bold uppercase tracking-tight text-[var(--foreground)]">
                                {isGiven ? 'CREDIT GIVEN' : 'REPAYMENT RECEIVED'}
                              </p>
                              <p className="text-[9px] opacity-45 font-mono mt-0.5 leading-snug">
                                {new Date(tx.timestamp).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                {tx.note && <span className="text-[var(--primary)] font-bold block mt-1 uppercase text-[8px] tracking-wide">☞ {tx.note}</span>}
                                {tx.dueDate && (
                                  <span className="text-amber-500 font-black block mt-1.5 uppercase text-[7.5px] tracking-widest bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded w-max select-none">
                                    ⏳ DUE BY: {new Date(tx.dueDate).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                                  </span>
                                )}
                                {getBillForTransaction(tx.note) && (
                                  <button
                                    onClick={() => setViewingBill(getBillForTransaction(tx.note))}
                                    type="button"
                                    className="mt-1.5 px-2 py-0.5 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 text-[8.5px] font-black uppercase tracking-wider flex items-center gap-1 cursor-pointer w-max select-none"
                                  >
                                    <Receipt size={10} /> View Invoice
                                  </button>
                                )}
                              </p>
                            </div>
                          </div>

                          <div className="text-right flex items-center gap-2">
                            <div className="font-mono text-xs">
                              <p className={`font-black ${isGiven ? 'text-rose-500' : 'text-green-500'}`}>
                                {isGiven ? '-' : '+'} ₹{Math.abs(tx.amount).toLocaleString()}
                              </p>
                            </div>
                            <Button
                              variant="ghost" 
                              size="icon"
                              onClick={() => {
                                setEditingTransaction(tx);
                                setEditTxAmount(String(Math.abs(tx.amount)));
                                setEditTxNote(tx.note || '');
                                setEditTxDueDate(tx.dueDate || '');
                              }}
                              className="h-8 w-8 rounded-full hover:bg-rose-500/10 hover:text-rose-500 opacity-20 hover:opacity-100 transition-opacity"
                              title="Edit Entry"
                            >
                              <Edit size={13} />
                            </Button>
                            <Button
                              variant="ghost" 
                              size="icon"
                              onClick={() => handleDeleteTransaction(tx.id)}
                              className="h-8 w-8 rounded-full hover:bg-red-500/10 hover:text-red-500 opacity-20 hover:opacity-100 transition-opacity"
                              title="Delete Entry"
                            >
                              <Trash2 size={13} />
                            </Button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

            </div>
          ) : (
            <div className="py-24 text-center space-y-4 opacity-30 select-none">
              <Landmark size={64} className="mx-auto opacity-20 text-rose-500 animate-pulse" />
              <div>
                <p className="font-black uppercase tracking-wider text-xs">Zero Client Highlighted</p>
                <p className="text-[9px] max-w-[200px] mx-auto mt-1 uppercase tracking-widest leading-relaxed">
                  Select a kirana customer account card from the left panel to display outstanding credits audit logs.
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
        {viewingBill && !isEditingBill && (
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
                      setIsEditingBill(true);
                      setEditingBillData(JSON.parse(JSON.stringify(viewingBill)));
                    }}
                    className="px-2 py-0.5 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 text-[9px] font-black uppercase tracking-wider flex items-center gap-1 cursor-pointer transition-all border border-rose-500/15"
                    title="Edit entire bill items, quantity, prices, discount and tax"
                  >
                    <Edit size={10} /> Edit Bill
                  </button>
                </div>
                <button 
                  onClick={() => {
                    setViewingBill(null);
                    setIsEditingBill(false);
                    setEditingBillData(null);
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
                    setIsEditingBill(false);
                    setEditingBillData(null);
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

        {/* FULL SIZE PAGE: DETAILED BILL INVOICE EDITOR */}
        {isEditingBill && editingBillData && (
          <div className="fixed inset-0 z-[200] bg-[var(--background)] text-[var(--foreground)] flex flex-col overflow-y-auto">
            <div className="w-full max-w-5xl mx-auto p-4 sm:p-8 space-y-6">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-[var(--border)] pb-4">
                <div>
                  <h3 className="text-xl font-black uppercase tracking-tight text-rose-500 flex items-center gap-2">
                    <Receipt size={22} /> Bill Invoice Editor
                  </h3>
                  <p className="text-[10px] text-[var(--foreground)]/60 font-mono mt-1">
                    Invoice: #{editingBillData.billNumber} &bull; {new Date(editingBillData.timestamp).toLocaleString()}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setIsEditingBill(false);
                    setEditingBillData(null);
                  }}
                  className="h-10 w-10 flex items-center justify-center rounded-full bg-[var(--foreground)]/5 hover:bg-[var(--foreground)]/10 text-[var(--foreground)]/60 hover:text-[var(--foreground)] cursor-pointer border border-[var(--border)] transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Customer Hero Card */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-[var(--card)] border border-[var(--border)] rounded-2xl">
                <div>
                  <span className="text-[9px] font-black uppercase tracking-wider opacity-50 block">Customer Name</span>
                  <span className="text-sm font-bold uppercase">{editingBillData.customerName}</span>
                </div>
                {editingBillData.customerPhone && (
                  <div>
                    <span className="text-[9px] font-black uppercase tracking-wider opacity-50 block">Contact Phone</span>
                    <span className="text-sm font-mono font-bold">{editingBillData.customerPhone}</span>
                  </div>
                )}
              </div>

              {/* Grid content */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Left Side: Products Listing and Add Form */}
                <div className="lg:col-span-7 space-y-4">
                  <div className="p-5 bg-[var(--card)] border border-[var(--border)] rounded-3xl space-y-4">
                    <h4 className="text-xs font-black uppercase tracking-wider text-rose-500">
                      Product Items List ({editingBillData.items.length})
                    </h4>

                    <div className="space-y-3 max-h-[50vh] overflow-y-auto no-scrollbar pr-1">
                      {editingBillData.items.map((it, idx) => (
                        <div key={it.itemId || idx} className="p-4 bg-[var(--background)] border border-[var(--border)] rounded-2xl space-y-3 relative group transition-all hover:border-[var(--border)]/80">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black uppercase text-rose-500">Item #{idx + 1}</span>
                            <button
                              type="button"
                              onClick={() => deleteItemFromBill(idx)}
                              className="p-1.5 text-red-500 hover:bg-red-500/10 rounded-lg cursor-pointer transition-colors"
                              title="Remove Item"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                          
                          <div className="grid grid-cols-12 gap-3">
                            {/* Name */}
                            <div className="col-span-12">
                              <label className="text-[9px] font-bold opacity-50 uppercase block mb-1">Product / Item Name</label>
                              <input
                                type="text"
                                value={it.name}
                                onChange={(e) => updateItemName(idx, e.target.value)}
                                className="w-full text-xs font-black uppercase border border-[var(--border)] rounded-xl bg-[var(--foreground)]/[0.02] px-3 py-2 focus:border-rose-500 focus:outline-none text-[var(--foreground)]"
                              />
                            </div>

                            {/* Qty */}
                            <div className="col-span-4">
                              <label className="text-[9px] font-bold opacity-50 uppercase block mb-1">Qty</label>
                              <input
                                type="number"
                                step="any"
                                value={it.quantity}
                                onChange={(e) => updateItemQty(idx, parseFloat(e.target.value) || 0)}
                                className="w-full text-xs font-mono font-bold border border-[var(--border)] rounded-xl bg-[var(--foreground)]/[0.02] px-3 py-2 focus:border-rose-500 focus:outline-none text-[var(--foreground)]"
                              />
                            </div>

                            {/* Unit */}
                            <div className="col-span-3">
                              <label className="text-[9px] font-bold opacity-50 uppercase block mb-1">Unit</label>
                              <input
                                type="text"
                                placeholder="pcs"
                                value={it.unit || ''}
                                onChange={(e) => {
                                  const updated = editingBillData.items.map((item, i) => i === idx ? { ...item, unit: e.target.value } : item);
                                  setEditingBillData({ ...editingBillData, items: updated });
                                }}
                                className="w-full text-xs font-bold uppercase border border-[var(--border)] rounded-xl bg-[var(--foreground)]/[0.02] px-3 py-2 focus:border-rose-500 focus:outline-none text-[var(--foreground)]"
                              />
                            </div>

                            {/* Price */}
                            <div className="col-span-5">
                              <label className="text-[9px] font-bold opacity-50 uppercase block mb-1">Price (₹)</label>
                              <input
                                type="number"
                                step="any"
                                value={it.price}
                                onChange={(e) => updateItemPrice(idx, parseFloat(e.target.value) || 0)}
                                className="w-full text-xs font-mono font-bold border border-[var(--border)] rounded-xl bg-[var(--foreground)]/[0.02] px-3 py-2 focus:border-rose-500 focus:outline-none text-[var(--foreground)]"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Add Item form */}
                  <div className="p-5 bg-[var(--card)] border border-dashed border-rose-500/30 rounded-3xl bg-rose-500/[0.01] space-y-3">
                    <h4 className="text-xs font-black uppercase tracking-wider text-rose-500 flex items-center gap-1">
                      <span>➕ Add New Product Item to Bill</span>
                    </h4>
                    <div className="grid grid-cols-12 gap-3">
                      <div className="col-span-12">
                        <input
                          type="text"
                          placeholder="New Item Name"
                          value={newItemName}
                          onChange={(e) => setNewItemName(e.target.value)}
                          className="w-full text-xs font-bold uppercase border border-[var(--border)] rounded-xl bg-[var(--foreground)]/[0.02] px-3 py-2.5 focus:border-rose-500 focus:outline-none text-[var(--foreground)]"
                        />
                      </div>
                      <div className="col-span-4">
                        <input
                          type="number"
                          step="any"
                          placeholder="Qty"
                          value={newItemQty}
                          onChange={(e) => setNewItemQty(e.target.value)}
                          className="w-full text-xs font-mono font-bold border border-[var(--border)] rounded-xl bg-[var(--foreground)]/[0.02] px-3 py-2.5 focus:border-rose-500 focus:outline-none text-[var(--foreground)]"
                        />
                      </div>
                      <div className="col-span-3">
                        <input
                          type="text"
                          placeholder="Unit"
                          value={newItemUnit}
                          onChange={(e) => setNewItemUnit(e.target.value)}
                          className="w-full text-xs font-bold uppercase border border-[var(--border)] rounded-xl bg-[var(--foreground)]/[0.02] px-3 py-2.5 focus:border-rose-500 focus:outline-none text-[var(--foreground)]"
                        />
                      </div>
                      <div className="col-span-5 flex gap-2">
                        <input
                          type="number"
                          step="any"
                          placeholder="Price"
                          value={newItemPrice}
                          onChange={(e) => setNewItemPrice(e.target.value)}
                          className="w-full text-xs font-mono font-bold border border-[var(--border)] rounded-xl bg-[var(--foreground)]/[0.02] px-3 py-2.5 focus:border-rose-500 focus:outline-none text-[var(--foreground)]"
                        />
                        <button
                          type="button"
                          onClick={handleAddNewItemToBill}
                          className="px-4 bg-rose-500 hover:bg-rose-600 text-white rounded-xl flex items-center justify-center cursor-pointer active:scale-95 transition-transform shrink-0 shadow"
                          title="Add Item to List"
                        >
                          <Plus size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Side: Calculations & CTA */}
                <div className="lg:col-span-5 space-y-4">
                  <div className="p-5 bg-[var(--card)] border border-[var(--border)] rounded-3xl space-y-4">
                    <h4 className="text-xs font-black uppercase tracking-wider text-rose-500">
                      Taxes, Promo & Net Due
                    </h4>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[9px] font-bold opacity-50 uppercase block mb-1">Discount (%)</label>
                        <input
                          type="number"
                          step="any"
                          min="0"
                          max="100"
                          value={editingBillData.discount}
                          onChange={(e) => handleUpdateDiscountTax(parseFloat(e.target.value) || 0, editingBillData.tax)}
                          className="w-full text-xs font-mono font-bold border border-[var(--border)] rounded-xl bg-[var(--foreground)]/[0.02] px-3 py-2 focus:border-rose-500 focus:outline-none text-[var(--foreground)]"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] font-bold opacity-50 uppercase block mb-1">Tax (%)</label>
                        <input
                          type="number"
                          step="any"
                          min="0"
                          max="100"
                          value={editingBillData.tax}
                          onChange={(e) => handleUpdateDiscountTax(editingBillData.discount, parseFloat(e.target.value) || 0)}
                          className="w-full text-xs font-mono font-bold border border-[var(--border)] rounded-xl bg-[var(--foreground)]/[0.02] px-3 py-2 focus:border-rose-500 focus:outline-none text-[var(--foreground)]"
                        />
                      </div>
                    </div>

                    <div className="p-4 border border-[var(--border)] rounded-2xl bg-[var(--foreground)]/[0.02] space-y-2.5 text-xs">
                      <div className="flex justify-between text-[11px] opacity-80">
                        <span>Basket Subtotal:</span>
                        <span className="font-mono">₹{editingBillData.subtotal.toFixed(2)}</span>
                      </div>
                      {editingBillData.discount > 0 && (
                        <div className="flex justify-between text-[11px] text-emerald-500">
                          <span>Promo Deduction ({editingBillData.discount}%):</span>
                          <span className="font-mono">-₹{((editingBillData.subtotal * editingBillData.discount) / 100).toFixed(2)}</span>
                        </div>
                      )}
                      {editingBillData.tax > 0 && (
                        <div className="flex justify-between text-[11px] text-rose-500">
                          <span>SGST/CGST Tax ({editingBillData.tax}%):</span>
                          <span className="font-mono">+₹{(((editingBillData.subtotal - (editingBillData.subtotal * editingBillData.discount / 100)) * editingBillData.tax) / 100).toFixed(2)}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-sm font-black pt-2 border-t border-[var(--border)]">
                        <span className="uppercase tracking-wider text-rose-500">New Net Due:</span>
                        <span className="text-rose-500 font-mono text-base">₹{editingBillData.total.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions buttons */}
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => {
                        setIsEditingBill(false);
                        setEditingBillData(null);
                      }}
                      type="button"
                      className="py-3.5 bg-zinc-500/15 hover:bg-zinc-500/25 text-zinc-400 text-xs font-black uppercase tracking-wider rounded-2xl transition-all cursor-pointer text-center"
                    >
                      Cancel / Cancel Edit
                    </button>
                    <button
                      onClick={handleSaveEditedBill}
                      type="button"
                      className="py-3.5 bg-rose-500 hover:bg-rose-600 text-white text-xs font-black uppercase tracking-wider rounded-2xl shadow-lg active:scale-95 transition-all cursor-pointer text-center"
                    >
                      Save / Save Changes
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
