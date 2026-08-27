import React, { useState, useMemo } from 'react';
import { 
  ReceiptText, Search, Download, Trash, Edit2, Check,
  FileText, Calendar, Clock, DollarSign, Filter, Archive,
  Save, Plus, Trash2, Printer, Eye, X, ChevronRight, TrendingUp,
  Sparkles, CheckCircle2, ArrowRightLeft, CreditCard
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { AppState, Bill, TransactionItem, Item } from '../types';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { cn, calculateBillProfit } from '../lib/utils';
import { RecoveryService } from '../services/recoveryService';
import { playFeedbackEvent } from '../services/soundFeedbackService';

interface FullBillHistoryViewProps {
  state: AppState;
  onUpdateState: (updates: Partial<AppState>) => void;
  t?: any;
}

interface CartItem {
  id: string;
  item: Partial<Item> & { isManual?: boolean };
  name: string;
  quantity: number;
  price: number;
  cost: number;
  unit: string;
}

export default function FullBillHistoryView({ state, onUpdateState }: FullBillHistoryViewProps) {
  const [activeBillDetail, setActiveBillDetail] = useState<Bill | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  // Custom confirmation modal
  const [customConfirm, setCustomConfirm] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
    isDestructive?: boolean;
    confirmText?: string;
    cancelText?: string;
  } | null>(null);

  // Toasts
  const [toasts, setToasts] = useState<{
    id: string;
    message: string;
    type: 'success' | 'info' | 'warning' | 'error';
  }[]>([]);

  const addToast = (message: string, type: 'success' | 'info' | 'warning' | 'error' = 'success') => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4500);
  };

  const showCustomConfirm = (
    title: string, 
    message: string, 
    onConfirm: () => void, 
    isDestructive: boolean = false, 
    confirmText: string = "Confirm", 
    cancelText: string = "Cancel"
  ) => {
    setCustomConfirm({
      title,
      message,
      onConfirm,
      isDestructive,
      confirmText,
      cancelText
    });
  };

  // Search and Advanced filtering states
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'none' | 'invoice' | 'time' | 'payment'>('none');
  const [startInvoice, setStartInvoice] = useState('');
  const [endInvoice, setEndInvoice] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [paymentFilter, setPaymentFilter] = useState<'Cash' | 'UPI' | 'Credit' | 'All'>('All');

  // Edit Bill Form state
  const [editCustomerName, setEditCustomerName] = useState('');
  const [editCustomerPhone, setEditCustomerPhone] = useState('');
  const [editDiscountPercent, setEditDiscountPercent] = useState(0);
  const [editTaxPercent, setEditTaxPercent] = useState(0);
  const [editPaymentMethod, setEditPaymentMethod] = useState<'Cash' | 'UPI' | 'Credit'>('Cash');
  const [editCart, setEditCart] = useState<CartItem[]>([]);

  // Manual addition to edit cart
  const [editManualName, setEditManualName] = useState('');
  const [editManualPrice, setEditManualPrice] = useState('');
  const [editManualCost, setEditManualCost] = useState('');
  const [editManualQuantity, setEditManualQuantity] = useState('1');
  const [editManualUnit, setEditManualUnit] = useState('Pcs');

  // Master Invoices List
  const invoicesList = state.bills || [];

  // Today KPIs
  const todayBills = useMemo(() => {
    const todayStr = new Date().toDateString();
    return invoicesList.filter(b => {
      try {
        return new Date(b.timestamp).toDateString() === todayStr;
      } catch {
        return false;
      }
    });
  }, [invoicesList]);

  const todayBillsCount = todayBills.length;

  const todayTotalSale = useMemo(() => {
    return todayBills.reduce((sum, b) => sum + b.total, 0);
  }, [todayBills]);

  const todayNetProfit = useMemo(() => {
    return todayBills.reduce((sum, b) => {
      return sum + calculateBillProfit(b, state.items);
    }, 0);
  }, [todayBills, state.items]);

  const totalInvoiced = useMemo(() => {
    return invoicesList.reduce((sum, b) => sum + b.total, 0);
  }, [invoicesList]);

  const totalMarginAllTime = useMemo(() => {
    return invoicesList.reduce((sum, b) => {
      return sum + calculateBillProfit(b, state.items);
    }, 0);
  }, [invoicesList, state.items]);

  const averageBillValue = useMemo(() => {
    if (invoicesList.length === 0) return 0;
    return totalInvoiced / invoicesList.length;
  }, [invoicesList, totalInvoiced]);

  // Combined searches & filters
  const filteredBills = useMemo(() => {
    return invoicesList.filter(bill => {
      // 1. Text Search Query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesName = (bill.customerName || '').toLowerCase().includes(query);
        const matchesPhone = (bill.customerPhone || '').includes(query);
        const matchesNumber = bill.billNumber.includes(query);
        const matchesItem = bill.items.some(it => it.name.toLowerCase().includes(query));
        const matchesMethod = bill.paymentMethod.toLowerCase().includes(query);
        if (!matchesName && !matchesPhone && !matchesNumber && !matchesItem && !matchesMethod) {
          return false;
        }
      }

      // 2. Filter tabs
      if (filterType === 'invoice') {
        const startNum = parseInt(startInvoice) || 0;
        const endNum = parseInt(endInvoice) || 99999999;
        const currentNum = parseInt(bill.billNumber) || 0;
        if (currentNum < startNum || currentNum > endNum) return false;
      }

      if (filterType === 'time') {
        if (startTime || endTime) {
          const billTime = new Date(bill.timestamp);
          const billHours = billTime.getHours();
          const billMins = billTime.getMinutes();
          const billMinutesOfDay = billHours * 60 + billMins;

          if (startTime) {
            const [sh, sm] = startTime.split(':').map(Number);
            const startMinutes = sh * 60 + sm;
            if (billMinutesOfDay < startMinutes) return false;
          }
          if (endTime) {
            const [eh, em] = endTime.split(':').map(Number);
            const endMinutes = eh * 60 + em;
            if (billMinutesOfDay > endMinutes) return false;
          }
        }
      }

      if (filterType === 'payment') {
        if (paymentFilter !== 'All' && bill.paymentMethod !== paymentFilter) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [invoicesList, searchQuery, filterType, startInvoice, endInvoice, startTime, endTime, paymentFilter]);

  // Group filtered bills by calendar date
  const groupedBills = useMemo(() => {
    const list: { dateLabel: string; bills: Bill[]; totalAmount: number; totalProfit: number }[] = [];
    
    filteredBills.forEach(bill => {
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
      
      const billProfit = calculateBillProfit(bill, state.items);
      
      let group = list.find(g => g.dateLabel === dateLabel);
      if (!group) {
        group = {
          dateLabel,
          bills: [],
          totalAmount: 0,
          totalProfit: 0
        };
        list.push(group);
      }
      group.bills.push(bill);
      group.totalAmount += bill.total;
      group.totalProfit += billProfit;
    });
    
    return list;
  }, [filteredBills]);

  // PDF Generation for Individual Invoices
  const downloadBillPdf = (bill: Bill) => {
    try {
      const doc = new jsPDF() as any;
      const storeName = state.settings?.storeName || 'Store Receipt';
      const storeAddress = state.settings?.storeAddress || '';
      const storePhone = state.settings?.storePhone || '';

      doc.setFontSize(22);
      doc.setTextColor(79, 70, 229);
      doc.setFont("helvetica", "bold");
      doc.text(storeName.toUpperCase(), 14, 22);
      
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(80);
      if (storeAddress) doc.text(storeAddress, 14, 28);
      if (storePhone) doc.text(`Phone: ${storePhone}`, 14, 33);

      doc.setFontSize(11);
      doc.setTextColor(33, 37, 41);
      doc.text(`Receipt Reference: #${bill.billNumber}`, 14, 44);
      doc.text(`Timestamp: ${new Date(bill.timestamp).toLocaleString()}`, 14, 50);
      doc.text(`Method of Payment: ${bill.paymentMethod}`, 14, 56);
      
      if (bill.customerName) {
        doc.setFont("helvetica", "bold");
        doc.text("GUEST / CLIENT:", 14, 68);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(80);
        doc.text(`Name: ${bill.customerName}`, 14, 74);
        if (bill.customerPhone) {
          doc.text(`Mobile: ${bill.customerPhone}`, 14, 80);
        }
      }
      
      const rowsData = bill.items.map((it, idx) => [
        idx + 1,
        it.name,
        `${it.quantity} ${it.unit}`,
        `₹${it.price.toFixed(2)}`,
        `₹${(it.price * it.quantity).toFixed(2)}`
      ]);
      
      autoTable(doc, {
        startY: bill.customerName ? 88 : 64,
        head: [['#', 'Item Name', 'Quantity', 'Rate', 'Line Total']],
        body: rowsData,
        theme: 'grid',
        headStyles: { fillColor: [79, 70, 229] },
        styles: { fontSize: 9 },
        margin: { left: 14, right: 14 }
      });
      
      const currentFinalY = (doc as any).lastAutoTable.finalY + 12;
      doc.setFont("helvetica", "bold");
      doc.setTextColor(33, 37, 41);
      doc.text(`Subtotal : ₹${bill.subtotal.toFixed(2)}`, 130, currentFinalY);
      
      let nextLineY = currentFinalY;
      if (bill.discount > 0) {
        nextLineY += 6;
        doc.text(`Discount (${bill.discount}%) : -₹${((bill.subtotal * bill.discount) / 100).toFixed(2)}`, 130, nextLineY);
      }
      if (bill.tax > 0) {
        nextLineY += 6;
        doc.text(`Tax (${bill.tax}%) : +₹${(((bill.subtotal - (bill.subtotal * bill.discount / 100)) * bill.tax) / 100).toFixed(2)}`, 130, nextLineY);
      }
      
      nextLineY += 10;
      doc.setFontSize(14);
      doc.setTextColor(79, 70, 229);
      doc.text(`GRAND TOTAL: ₹${bill.total.toFixed(2)}`, 130, nextLineY);
      
      doc.save(`Invoice_${bill.billNumber}.pdf`);
      addToast(`Downloaded PDF for Invoice #${bill.billNumber}`, 'success');
    } catch (err) {
      console.error(err);
      addToast('Failed to generate PDF', 'error');
    }
  };

  // PDF Export for All Filtered Invoices
  const downloadWholeHistoryPdf = () => {
    if (filteredBills.length === 0) return;
    try {
      const doc = new jsPDF() as any;
      const storeName = state.settings?.storeName || 'Store Billing Ledger';

      doc.setFillColor(31, 41, 55);
      doc.rect(0, 0, 210, 48, 'F');

      doc.setFont("helvetica", "bold");
      doc.setFontSize(22);
      doc.setTextColor(255, 255, 255);
      doc.text(storeName.toUpperCase(), 14, 20);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(209, 213, 219);
      doc.text(`OFFICIAL BILLING REPORTS & HISTORY EXPORT`, 14, 27);
      doc.text(`RECORD COUNT: ${filteredBills.length} invoices`, 14, 34);
      doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 41);

      // KPI box
      doc.setFillColor(243, 244, 246);
      doc.roundedRect(14, 54, 182, 28, 3, 3, 'F');

      const totalSales = filteredBills.reduce((s, b) => s + b.total, 0);
      const totalProfit = filteredBills.reduce((s, b) => {
        return s + calculateBillProfit(b, state.items);
      }, 0);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(75, 85, 99);
      doc.text("TOTAL INVOICES", 20, 63);
      doc.text("TOTAL SALES", 80, 63);
      doc.text("ESTIMATED MARGIN", 140, 63);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.setTextColor(17, 24, 39);
      doc.text(`${filteredBills.length}`, 20, 74);
      doc.text(`INR ${totalSales.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 80, 74);
      doc.text(`INR ${totalProfit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 140, 74);

      const rawRows = filteredBills.map((b, idx) => [
        idx + 1,
        b.billNumber,
        b.customerName || 'Walk-In Customer',
        `${b.items.reduce((s, i) => s + i.quantity, 0)} Items`,
        b.paymentMethod,
        `INR ${b.total.toFixed(2)}`,
        new Date(b.timestamp).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
      ]);

      autoTable(doc, {
        startY: 90,
        head: [['#', 'Invoice Ref', 'Customer Details', 'Quantity Summary', 'Pay Mode', 'Grand Total', 'Timestamp']],
        body: rawRows,
        theme: 'striped',
        headStyles: { fillColor: [31, 41, 55], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9 },
        styles: { fontSize: 8.5, cellPadding: 3 },
        margin: { left: 14, right: 14 }
      });

      doc.save(`bill_history_report_${Date.now()}.pdf`);
      addToast(`Master Sales Report PDF exported successfully (${filteredBills.length} invoices).`, 'success');
    } catch (err) {
      console.error(err);
      addToast('Failed to export PDF report.', 'error');
    }
  };

  // Edit / Saved invoice operation
  const startEditingSavedInvoice = (bill: Bill) => {
    setEditCustomerName(bill.customerName);
    setEditCustomerPhone(bill.customerPhone || '');
    setEditDiscountPercent(bill.discount);
    setEditTaxPercent(bill.tax);
    setEditPaymentMethod(bill.paymentMethod);
    
    const mappedCart: CartItem[] = bill.items.map(it => {
      const isManual = it.itemId.startsWith('custom-');
      const dbObj = !isManual ? state.items.find(si => si.id === it.itemId) : undefined;
      return {
        id: it.itemId,
        item: dbObj ? dbObj : { id: it.itemId, isManual: true },
        name: it.name,
        quantity: it.quantity,
        price: it.price,
        cost: it.cost,
        unit: it.unit
      };
    });
    setEditCart(mappedCart);
    setIsEditing(true);
  };

  const updateEditCartQuantity = (cartId: string, val: number) => {
    if (val <= 0) {
      setEditCart(editCart.filter(item => item.id !== cartId));
      return;
    }
    setEditCart(editCart.map(item => {
      if (item.id === cartId) {
        return { ...item, quantity: parseFloat(val.toFixed(3)) };
      }
      return item;
    }));
  };

  const addManualItemToEditCart = () => {
    if (!editManualName.trim()) {
      addToast("Please specify product name.", "warning");
      return;
    }
    const costV = parseFloat(editManualCost) || 0;
    const rateV = parseFloat(editManualPrice) || 0;
    const qtyV = parseFloat(editManualQuantity) || 1;
    const tempId = `custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const appendCart: CartItem = {
      id: tempId,
      item: { id: tempId, isManual: true },
      name: editManualName.trim(),
      quantity: qtyV,
      price: rateV,
      cost: costV,
      unit: editManualUnit || 'Pcs'
    };
    
    setEditCart([...editCart, appendCart]);
    setEditManualName('');
    setEditManualPrice('');
    setEditManualCost('');
    setEditManualQuantity('1');
    setEditManualUnit('Pcs');
  };

  const saveEditedBillInvoice = () => {
    if (!activeBillDetail) return;
    if (editCart.length === 0) {
      addToast("Invoice list cannot be completely empty.", "warning");
      return;
    }
    
    // Re-credit old billing stocks
    let intermediateInventory = [...state.items];
    activeBillDetail.items.forEach(oldItem => {
      if (!oldItem.itemId.startsWith('custom-')) {
        intermediateInventory = intermediateInventory.map(dbItem => {
          if (dbItem.id === oldItem.itemId) {
            return {
              ...dbItem,
              quantity: parseFloat((dbItem.quantity + oldItem.quantity).toFixed(3))
            };
          }
          return dbItem;
        });
      }
    });

    // Validate edit stock deductions
    let finalInventory = [...intermediateInventory];
    for (const newCartItem of editCart) {
      if (!newCartItem.id.startsWith('custom-')) {
        finalInventory = finalInventory.map(dbItem => {
          if (dbItem.id === newCartItem.id) {
            return {
              ...dbItem,
              quantity: parseFloat((dbItem.quantity - newCartItem.quantity).toFixed(3))
            };
          }
          return dbItem;
        });
      }
    }

    const updatedBillItems: TransactionItem[] = editCart.map(ci => ({
      itemId: ci.id,
      name: ci.name,
      quantity: ci.quantity,
      price: ci.price,
      cost: ci.cost || 0,
      unit: ci.unit
    }));

    const editSubtotal = editCart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const editDiscountAmount = (editSubtotal * editDiscountPercent) / 100;
    const editTaxAmount = ((editSubtotal - editDiscountAmount) * editTaxPercent) / 100;
    const editTotal = editSubtotal - editDiscountAmount + editTaxAmount;

    // Handle Udhar adjustments
    let updatedCustomers = [...(state.udharCustomers || [])];
    let updatedTransactions = [...(state.udharTransactions || [])];

    if (activeBillDetail.paymentMethod === 'Credit') {
      const associatedTx = updatedTransactions.find(tx => tx.note?.includes(activeBillDetail.billNumber));
      if (associatedTx) {
        updatedTransactions = updatedTransactions.filter(tx => tx.id !== associatedTx.id);
        updatedCustomers = updatedCustomers.map(cust => {
          if (cust.id === associatedTx.customerId) {
            return {
              ...cust,
              totalUdhar: Math.max(0, parseFloat((cust.totalUdhar - associatedTx.amount).toFixed(2))),
              lastUpdated: new Date().toISOString()
            };
          }
          return cust;
        });
      }
    }

    if (editPaymentMethod === 'Credit') {
      let customer = updatedCustomers.find(c => c.name.toLowerCase() === editCustomerName.trim().toLowerCase());
      if (!customer) {
        customer = {
          id: `cust-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          name: editCustomerName.trim() || 'Credit Walk-In',
          phone: editCustomerPhone.trim() || undefined,
          totalUdhar: 0,
          lastUpdated: new Date().toISOString()
        };
        updatedCustomers.push(customer);
      } else if (editCustomerPhone.trim()) {
        customer.phone = editCustomerPhone.trim();
      }

      const newTxId = `tx-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      updatedTransactions.push({
        id: newTxId,
        customerId: customer.id,
        amount: parseFloat(editTotal.toFixed(2)),
        type: 'given',
        note: `Invoice edit #${activeBillDetail.billNumber}`,
        timestamp: new Date().toISOString()
      });

      customer.totalUdhar = parseFloat((customer.totalUdhar + editTotal).toFixed(2));
      customer.lastUpdated = new Date().toISOString();
    }

    const updatedInvoiceObj: Bill = {
      ...activeBillDetail,
      customerName: editCustomerName.trim() || 'Walk-In Customer',
      customerPhone: editCustomerPhone.trim() || undefined,
      items: updatedBillItems,
      discount: editDiscountPercent,
      tax: editTaxPercent,
      subtotal: parseFloat(editSubtotal.toFixed(2)),
      total: parseFloat(editTotal.toFixed(2)),
      paymentMethod: editPaymentMethod,
      timestamp: new Date().toISOString()
    };

    onUpdateState({
      items: finalInventory,
      bills: (state.bills || []).map(b => b.id === activeBillDetail.id ? updatedInvoiceObj : b),
      udharCustomers: updatedCustomers,
      udharTransactions: updatedTransactions
    });

    setActiveBillDetail(updatedInvoiceObj);
    setIsEditing(false);
    addToast(`Success: Invoice #${activeBillDetail.billNumber} modified successfully.`, "success");
  };

  const deleteBillInvoice = (bill: Bill) => {
    showCustomConfirm(
      "Confirm Invoice Removal",
      `Are you sure you want to permanently remove invoice record #${bill.billNumber}? Inventory counts will be restored automatically.`,
      () => {
        const restoredItems = state.items.map(item => {
          const matchInBill = bill.items.find(bi => bi.itemId === item.id);
          if (matchInBill) {
            return {
              ...item,
              quantity: parseFloat((item.quantity + matchInBill.quantity).toFixed(3))
            };
          }
          return item;
        });

        const nextBills = (state.bills || []).filter(b => b.id !== bill.id);
        
        let updatedCustomers = [...(state.udharCustomers || [])];
        let updatedTransactions = [...(state.udharTransactions || [])];
        
        if (bill.paymentMethod === 'Credit') {
          const associatedTx = updatedTransactions.find(tx => tx.note?.includes(bill.billNumber));
          if (associatedTx) {
            updatedTransactions = updatedTransactions.filter(tx => tx.id !== associatedTx.id);
            updatedCustomers = updatedCustomers.map(cust => {
              if (cust.id === associatedTx.customerId) {
                return {
                  ...cust,
                  totalUdhar: Math.max(0, parseFloat((cust.totalUdhar - associatedTx.amount).toFixed(2))),
                  lastUpdated: new Date().toISOString()
                };
              }
              return cust;
            });
          }
        }

        onUpdateState({
          items: restoredItems,
          bills: nextBills,
          udharCustomers: updatedCustomers,
          udharTransactions: updatedTransactions
        });

        setActiveBillDetail(null);
        setIsEditing(false);
        addToast("Invoice removed and stock restored.", "success");
      },
      true,
      "Remove Invoice",
      "Cancel"
    );
  };

  return (
    <div className="space-y-6 pb-20 max-w-7xl mx-auto">
      {/* Toast Notifications */}
      <div className="fixed top-20 right-6 z-[999] space-y-2 pointer-events-none">
        {toasts.map((t, tIdx) => (
          <div key={`fbh-toast-${t.id || 'toast'}-${tIdx}`} className={cn(
            "px-4 py-2.5 rounded-xl text-xs font-bold text-white shadow-xl flex items-center gap-2 animate-in fade-in slide-in-from-top-2 pointer-events-auto",
            t.type === 'error' ? "bg-rose-600" :
            t.type === 'warning' ? "bg-amber-600" :
            t.type === 'info' ? "bg-indigo-600" : "bg-emerald-600"
          )}>
            <span>{t.type === 'error' ? '❌' : t.type === 'warning' ? '⚠️' : '✅'}</span>
            <span>{t.message}</span>
          </div>
        ))}
      </div>

      {/* Confirmation Dialog */}
      <AnimatePresence>
        {customConfirm && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[var(--card)] border border-[var(--border)] p-6 rounded-2xl max-w-md w-full shadow-2xl space-y-4 text-left"
            >
              <h3 className="text-base font-black uppercase text-[var(--foreground)]">{customConfirm.title}</h3>
              <p className="text-xs text-[var(--foreground)]/70 whitespace-pre-line leading-relaxed">{customConfirm.message}</p>
              <div className="flex gap-3 justify-end pt-2">
                <button
                  onClick={() => setCustomConfirm(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-[var(--foreground)]/5 hover:bg-[var(--foreground)]/10"
                >
                  {customConfirm.cancelText || "Cancel"}
                </button>
                <button
                  onClick={() => {
                    customConfirm.onConfirm();
                    setCustomConfirm(null);
                  }}
                  className={cn(
                    "px-4 py-2 rounded-xl text-xs font-bold text-white shadow-md",
                    customConfirm.isDestructive ? "bg-rose-500 hover:bg-rose-600" : "bg-[var(--primary)] hover:bg-[var(--primary)]/90"
                  )}
                >
                  {customConfirm.confirmText || "Confirm"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[var(--primary)] to-[var(--primary)]/80 text-white p-6 md:p-8 rounded-3xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest bg-white/20 border border-white/20 text-white">
              Official Sales Ledger
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tight leading-none text-white">
            Reports & Bill History
          </h1>
          <p className="text-xs text-white/80 font-medium mt-1">
            Comprehensive sales records, invoice audits, margin telemetry & report exports.
          </p>
        </div>

        <button
          onClick={downloadWholeHistoryPdf}
          disabled={filteredBills.length === 0}
          className="px-5 py-3 rounded-2xl bg-white text-[var(--primary)] font-black text-xs uppercase tracking-wider hover:bg-white/90 transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
        >
          <Download size={16} />
          <span>Export Master PDF ({filteredBills.length})</span>
        </button>
      </div>

      {/* High-Level KPI Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[var(--card)] border border-[var(--border)] p-5 rounded-2xl shadow-sm space-y-1">
          <span className="text-[10px] font-black uppercase tracking-wider text-[var(--foreground)]/60">Today Bills</span>
          <div className="text-2xl font-black font-mono text-[var(--primary)]">{todayBillsCount}</div>
          <p className="text-[10px] text-[var(--foreground)]/50 font-bold">Total {invoicesList.length} all-time</p>
        </div>

        <div className="bg-[var(--card)] border border-[var(--border)] p-5 rounded-2xl shadow-sm space-y-1">
          <span className="text-[10px] font-black uppercase tracking-wider text-[var(--foreground)]/60">Today's Sales</span>
          <div className="text-2xl font-black font-mono text-emerald-500">₹{todayTotalSale.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div>
          <p className="text-[10px] text-[var(--foreground)]/50 font-bold">₹{totalInvoiced.toLocaleString('en-IN', { maximumFractionDigits: 0 })} all-time</p>
        </div>

        <div className="bg-[var(--card)] border border-[var(--border)] p-5 rounded-2xl shadow-sm space-y-1">
          <span className="text-[10px] font-black uppercase tracking-wider text-[var(--foreground)]/60">Today's Net Margin</span>
          <div className="text-2xl font-black font-mono text-indigo-500">₹{todayNetProfit.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div>
          <p className="text-[10px] text-[var(--foreground)]/50 font-bold">₹{totalMarginAllTime.toLocaleString('en-IN', { maximumFractionDigits: 0 })} all-time</p>
        </div>

        <div className="bg-[var(--card)] border border-[var(--border)] p-5 rounded-2xl shadow-sm space-y-1">
          <span className="text-[10px] font-black uppercase tracking-wider text-[var(--foreground)]/60">Avg Bill Value</span>
          <div className="text-2xl font-black font-mono text-amber-500">₹{averageBillValue.toFixed(0)}</div>
          <p className="text-[10px] text-[var(--foreground)]/50 font-bold">Per invoice average</p>
        </div>
      </div>

      {/* Advanced Filter Engine */}
      <div className="bg-[var(--card)] border border-[var(--border)] p-5 rounded-2xl shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--foreground)] opacity-40" />
            <input
              type="text"
              placeholder="Search by customer name, phone, bill number, product or payment method..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full text-xs pl-10 pr-8 py-3 rounded-xl border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] focus:outline-none focus:border-[var(--primary)]"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-rose-500 hover:underline"
              >
                Clear
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
            <span className="text-[10px] font-black uppercase tracking-wider text-[var(--foreground)]/60 whitespace-nowrap flex items-center gap-1">
              <Filter size={12} /> Filter:
            </span>
            {(['none', 'invoice', 'time', 'payment'] as const).map(mode => (
              <button
                key={mode}
                onClick={() => setFilterType(mode)}
                className={cn(
                  "px-3 py-1.5 text-xs font-bold uppercase tracking-wider rounded-xl border transition-all whitespace-nowrap cursor-pointer",
                  filterType === mode
                    ? "bg-[var(--primary)] text-white border-[var(--primary)] shadow-sm"
                    : "bg-[var(--foreground)]/[0.03] text-[var(--foreground)]/70 border-[var(--border)] hover:text-[var(--foreground)]"
                )}
              >
                {mode === 'none' ? 'All Logs' : mode === 'invoice' ? 'By Bill #' : mode === 'time' ? 'By Hour' : 'By Payment Mode'}
              </button>
            ))}
          </div>
        </div>

        {/* Dynamic Filter Parameters */}
        {filterType === 'invoice' && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2 border-t border-[var(--border)]">
            <div>
              <span className="text-[10px] font-bold text-[var(--foreground)]/60 uppercase">From Bill #</span>
              <input
                type="text"
                placeholder="e.g. 1"
                value={startInvoice}
                onChange={e => setStartInvoice(e.target.value)}
                className="w-full text-xs p-2 rounded-xl border border-[var(--border)] bg-[var(--card)] font-mono"
              />
            </div>
            <div>
              <span className="text-[10px] font-bold text-[var(--foreground)]/60 uppercase">To Bill #</span>
              <input
                type="text"
                placeholder="e.g. 100"
                value={endInvoice}
                onChange={e => setEndInvoice(e.target.value)}
                className="w-full text-xs p-2 rounded-xl border border-[var(--border)] bg-[var(--card)] font-mono"
              />
            </div>
          </div>
        )}

        {filterType === 'time' && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2 border-t border-[var(--border)]">
            <div>
              <span className="text-[10px] font-bold text-[var(--foreground)]/60 uppercase">Start Time</span>
              <input
                type="time"
                value={startTime}
                onChange={e => setStartTime(e.target.value)}
                className="w-full text-xs p-2 rounded-xl border border-[var(--border)] bg-[var(--card)] font-mono cursor-pointer"
              />
            </div>
            <div>
              <span className="text-[10px] font-bold text-[var(--foreground)]/60 uppercase">End Time</span>
              <input
                type="time"
                value={endTime}
                onChange={e => setEndTime(e.target.value)}
                className="w-full text-xs p-2 rounded-xl border border-[var(--border)] bg-[var(--card)] font-mono cursor-pointer"
              />
            </div>
          </div>
        )}

        {filterType === 'payment' && (
          <div className="flex gap-2 pt-2 border-t border-[var(--border)]">
            {(['All', 'Cash', 'UPI', 'Credit'] as const).map(pm => (
              <button
                key={pm}
                onClick={() => setPaymentFilter(pm)}
                className={cn(
                  "px-4 py-1.5 text-xs font-bold uppercase rounded-xl border transition-all cursor-pointer",
                  paymentFilter === pm
                    ? "bg-[var(--primary)] text-white border-[var(--primary)]"
                    : "bg-[var(--card)] text-[var(--foreground)]/60 border-[var(--border)] hover:text-[var(--foreground)]"
                )}
              >
                {pm}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Main Grouped Invoices List */}
      <div className="space-y-6">
        {groupedBills.length === 0 ? (
          <div className="bg-[var(--card)] border border-[var(--border)] p-12 rounded-3xl text-center space-y-3 opacity-60">
            <Archive size={48} className="mx-auto text-[var(--primary)] opacity-40 animate-pulse" />
            <h3 className="text-sm font-black uppercase text-[var(--foreground)]">No Bill Invoices Found</h3>
            <p className="text-xs text-[var(--foreground)]/60">No transaction receipts match your current filter parameters or search query.</p>
          </div>
        ) : (
          groupedBills.map(group => (
            <div key={group.dateLabel} className="space-y-3">
              {/* Group Date Header */}
              <div className="flex items-center justify-between bg-[var(--card)] border border-[var(--border)] px-4 py-3 rounded-2xl shadow-xs">
                <div className="flex items-center gap-2">
                  <Calendar size={16} className="text-[var(--primary)]" />
                  <span className="text-xs font-black uppercase tracking-wider text-[var(--foreground)]">
                    {group.dateLabel}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[var(--foreground)]/5 text-[var(--foreground)]/60 border border-[var(--border)]">
                    {group.bills.length} {group.bills.length === 1 ? 'bill' : 'bills'}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xs font-black font-mono text-emerald-500">
                    Total: ₹{group.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                  <span className="text-xs font-black font-mono text-indigo-500 hidden sm:inline">
                    Margin: +₹{group.totalProfit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* Invoice Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {group.bills.map(bill => {
                  const itemsCount = bill.items.reduce((sum, it) => sum + it.quantity, 0);
                  const billProfit = calculateBillProfit(bill, state.items);

                  return (
                    <div
                      key={bill.id}
                      onClick={() => {
                        setActiveBillDetail(bill);
                        setIsEditing(false);
                      }}
                      className={cn(
                        "bg-[var(--card)] border border-[var(--border)] p-4 rounded-2xl cursor-pointer hover:border-[var(--primary)] hover:shadow-lg transition-all relative space-y-3 group text-left",
                        activeBillDetail?.id === bill.id ? "ring-2 ring-[var(--primary)] border-[var(--primary)]" : ""
                      )}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="font-mono text-xs font-black text-amber-500 group-hover:text-[var(--primary)] transition-colors">
                            #{bill.billNumber}
                          </span>
                          <h4 className="text-xs font-black uppercase text-[var(--foreground)] truncate max-w-[180px] mt-0.5">
                            {bill.customerName || 'Walk-In Customer'}
                          </h4>
                          {bill.customerPhone && (
                            <p className="text-[10px] text-[var(--foreground)]/50 font-bold">📞 {bill.customerPhone}</p>
                          )}
                        </div>

                        <span className={cn(
                          "px-2 py-0.5 rounded text-[8px] font-black uppercase text-white shadow-xs",
                          bill.paymentMethod === 'Cash' ? "bg-emerald-500" :
                          bill.paymentMethod === 'UPI' ? "bg-violet-500" : "bg-rose-500"
                        )}>
                          {bill.paymentMethod}
                        </span>
                      </div>

                      {/* Items Summary Preview */}
                      <div className="text-[10px] text-[var(--foreground)]/60 font-medium line-clamp-1 bg-[var(--foreground)]/[0.02] p-2 rounded-xl border border-[var(--border)]">
                        {bill.items.map(i => `${i.name} (${i.quantity} ${i.unit})`).join(', ')}
                      </div>

                      {/* Footer Info */}
                      <div className="flex items-center justify-between pt-2 border-t border-[var(--border)] text-xs font-black">
                        <div>
                          <span className="text-[9px] uppercase font-bold text-[var(--foreground)]/50 block">Grand Total</span>
                          <span className="font-mono text-sm text-[var(--primary)]">₹{bill.total.toFixed(2)}</span>
                        </div>

                        <div className="text-right">
                          <span className="text-[9px] uppercase font-bold text-emerald-500 block">+₹{billProfit.toFixed(1)} Profit</span>
                          <span className="text-[9px] font-mono text-[var(--foreground)]/40 font-bold">
                            {new Date(bill.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Detail / Inspection / Edit Modal */}
      <AnimatePresence>
        {activeBillDetail && (
          <div className="fixed inset-0 z-[900] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[var(--card)] border border-[var(--border)] rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-left"
            >
              {/* Modal Header */}
              <div className="p-5 border-b border-[var(--border)] flex items-center justify-between bg-[var(--foreground)]/[0.02]">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-2xl bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center font-mono font-black text-sm">
                    #{activeBillDetail.billNumber}
                  </div>
                  <div>
                    <h3 className="font-black text-sm uppercase text-[var(--foreground)]">
                      {isEditing ? "Edit Invoice Record" : `Invoice #${activeBillDetail.billNumber}`}
                    </h3>
                    <p className="text-[10px] text-[var(--foreground)]/60 font-semibold">
                      {new Date(activeBillDetail.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {!isEditing && (
                    <>
                      <button
                        onClick={() => downloadBillPdf(activeBillDetail)}
                        className="p-2 rounded-xl bg-[var(--foreground)]/5 hover:bg-[var(--foreground)]/10 text-xs font-bold uppercase flex items-center gap-1 cursor-pointer"
                        title="Download PDF Receipt"
                      >
                        <Download size={14} /> PDF
                      </button>

                      <button
                        onClick={() => startEditingSavedInvoice(activeBillDetail)}
                        className="p-2 rounded-xl bg-amber-500/10 text-amber-500 hover:bg-amber-500 hover:text-white text-xs font-bold uppercase flex items-center gap-1 cursor-pointer transition-all"
                        title="Edit Invoice details"
                      >
                        <Edit2 size={14} /> Edit
                      </button>

                      <button
                        onClick={() => deleteBillInvoice(activeBillDetail)}
                        className="p-2 rounded-xl bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white text-xs font-bold uppercase flex items-center gap-1 cursor-pointer transition-all"
                        title="Delete Invoice"
                      >
                        <Trash size={14} /> Delete
                      </button>
                    </>
                  )}

                  <button
                    onClick={() => {
                      setActiveBillDetail(null);
                      setIsEditing(false);
                    }}
                    className="p-2 rounded-xl bg-[var(--foreground)]/10 hover:bg-[var(--foreground)]/20 text-xs font-bold uppercase cursor-pointer"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              {/* Modal Body */}
              <div className="p-6 overflow-y-auto space-y-5 flex-1">
                {!isEditing ? (
                  <>
                    {/* Customer Info Card */}
                    <div className="grid grid-cols-2 gap-4 bg-[var(--foreground)]/[0.02] p-4 rounded-2xl border border-[var(--border)]">
                      <div>
                        <span className="text-[9px] font-black uppercase text-[var(--foreground)]/50 block">Customer Details</span>
                        <p className="text-xs font-black uppercase text-[var(--foreground)]">{activeBillDetail.customerName || 'Walk-In Customer'}</p>
                        {activeBillDetail.customerPhone && <p className="text-xs font-mono opacity-70">📞 {activeBillDetail.customerPhone}</p>}
                      </div>

                      <div className="text-right">
                        <span className="text-[9px] font-black uppercase text-[var(--foreground)]/50 block">Payment Mode</span>
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-[var(--primary)] text-white inline-block mt-0.5">
                          {activeBillDetail.paymentMethod}
                        </span>
                      </div>
                    </div>

                    {/* Purchased Items Table */}
                    <div className="border border-[var(--border)] rounded-2xl overflow-hidden">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-[var(--foreground)]/[0.04] uppercase text-[9px] font-black tracking-wider text-[var(--foreground)]/60">
                          <tr>
                            <th className="p-3">#</th>
                            <th className="p-3">Item</th>
                            <th className="p-3 text-center">Qty</th>
                            <th className="p-3 text-right">Price</th>
                            <th className="p-3 text-right">Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--border)] font-medium">
                          {activeBillDetail.items.map((it, idx) => (
                            <tr key={idx}>
                              <td className="p-3 text-[10px] opacity-40 font-mono">{idx + 1}</td>
                              <td className="p-3 font-bold">{it.name}</td>
                              <td className="p-3 text-center font-mono">{it.quantity} {it.unit}</td>
                              <td className="p-3 text-right font-mono">₹{it.price.toFixed(2)}</td>
                              <td className="p-3 text-right font-mono font-bold">₹{(it.price * it.quantity).toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Breakdown Totals */}
                    <div className="bg-[var(--foreground)]/[0.02] p-4 rounded-2xl border border-[var(--border)] space-y-2 text-xs font-bold text-right">
                      <div className="flex justify-between opacity-70">
                        <span>Subtotal</span>
                        <span className="font-mono">₹{activeBillDetail.subtotal.toFixed(2)}</span>
                      </div>

                      {activeBillDetail.discount > 0 && (
                        <div className="flex justify-between text-rose-500">
                          <span>Discount ({activeBillDetail.discount}%)</span>
                          <span className="font-mono">-₹{((activeBillDetail.subtotal * activeBillDetail.discount) / 100).toFixed(2)}</span>
                        </div>
                      )}

                      {activeBillDetail.tax > 0 && (
                        <div className="flex justify-between text-amber-500">
                          <span>Tax GST ({activeBillDetail.tax}%)</span>
                          <span className="font-mono">+₹{(((activeBillDetail.subtotal - (activeBillDetail.subtotal * activeBillDetail.discount / 100)) * activeBillDetail.tax) / 100).toFixed(2)}</span>
                        </div>
                      )}

                      <div className="flex justify-between text-base font-black text-[var(--primary)] pt-2 border-t border-[var(--border)]">
                        <span>GRAND TOTAL</span>
                        <span className="font-mono">₹{activeBillDetail.total.toFixed(2)}</span>
                      </div>

                      {activeBillDetail.discount > 0 && (
                        <div className="bg-emerald-500/10 border border-emerald-500/25 rounded-xl p-2.5 text-center text-emerald-700 dark:text-emerald-300 font-sans font-black text-[10px] flex items-center justify-between mt-1">
                          <span className="flex items-center gap-1">
                            <span>🎉</span> Total Customer Savings / बचत:
                          </span>
                          <span className="font-mono text-sm font-black text-emerald-600 dark:text-emerald-400">
                            ₹{((activeBillDetail.subtotal * activeBillDetail.discount) / 100).toFixed(2)}
                          </span>
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  /* Edit Form */
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] font-black uppercase text-[var(--foreground)]/60">Customer Name</label>
                        <input
                          type="text"
                          value={editCustomerName}
                          onChange={e => setEditCustomerName(e.target.value)}
                          className="w-full p-2.5 text-xs rounded-xl border border-[var(--border)] bg-[var(--card)]"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-black uppercase text-[var(--foreground)]/60">Customer Phone</label>
                        <input
                          type="text"
                          value={editCustomerPhone}
                          onChange={e => setEditCustomerPhone(e.target.value)}
                          className="w-full p-2.5 text-xs rounded-xl border border-[var(--border)] bg-[var(--card)] font-mono"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="text-[10px] font-black uppercase text-[var(--foreground)]/60">Discount %</label>
                        <input
                          type="number"
                          value={editDiscountPercent}
                          onChange={e => setEditDiscountPercent(parseFloat(e.target.value) || 0)}
                          className="w-full p-2.5 text-xs rounded-xl border border-[var(--border)] bg-[var(--card)] font-mono"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-black uppercase text-[var(--foreground)]/60">Tax %</label>
                        <input
                          type="number"
                          value={editTaxPercent}
                          onChange={e => setEditTaxPercent(parseFloat(e.target.value) || 0)}
                          className="w-full p-2.5 text-xs rounded-xl border border-[var(--border)] bg-[var(--card)] font-mono"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-black uppercase text-[var(--foreground)]/60">Payment Mode</label>
                        <select
                          value={editPaymentMethod}
                          onChange={e => setEditPaymentMethod(e.target.value as any)}
                          className="w-full p-2.5 text-xs rounded-xl border border-[var(--border)] bg-[var(--card)]"
                        >
                          <option value="Cash">Cash</option>
                          <option value="UPI">UPI</option>
                          <option value="Credit">Credit</option>
                        </select>
                      </div>
                    </div>

                    {/* Edit Items Cart */}
                    <div className="space-y-2">
                      <span className="text-[10px] font-black uppercase text-[var(--foreground)]/60">Edit Cart Items</span>
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {editCart.map((ci, ciIdx) => (
                          <div key={`fbh-edit-cart-${ci.id || 'ci'}-${ciIdx}`} className="flex items-center justify-between p-2.5 bg-[var(--foreground)]/[0.02] border border-[var(--border)] rounded-xl text-xs">
                            <span className="font-bold flex-1 truncate">{ci.name}</span>
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                value={ci.quantity}
                                onChange={e => updateEditCartQuantity(ci.id, parseFloat(e.target.value) || 0)}
                                className="w-16 p-1 text-center border border-[var(--border)] rounded-lg font-mono font-bold"
                              />
                              <span className="font-mono text-xs opacity-60">₹{(ci.price * ci.quantity).toFixed(2)}</span>
                              <button
                                onClick={() => setEditCart(editCart.filter(i => i.id !== ci.id))}
                                className="p-1 text-rose-500 hover:bg-rose-500/10 rounded-lg"
                              >
                                <Trash size={14} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-3 border-t border-[var(--border)]">
                      <button
                        onClick={() => setIsEditing(false)}
                        className="px-4 py-2 rounded-xl text-xs font-bold bg-[var(--foreground)]/5"
                      >
                        Cancel Edit
                      </button>
                      <button
                        onClick={saveEditedBillInvoice}
                        className="px-5 py-2 rounded-xl text-xs font-black uppercase bg-[var(--primary)] text-white shadow-md"
                      >
                        Save Invoice Changes
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
