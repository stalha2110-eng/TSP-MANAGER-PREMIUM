import React, { useState, useMemo, useEffect } from 'react';
import { 
  X, ReceiptText, Search, Download, Trash, Edit2, Check,
  FileText, Calendar, Clock, DollarSign, ArrowUpRight, ArrowDownLeft,
  Coins, Filter, Archive, CheckCircle, Save, Plus, Trash2, Milestone,
  Printer
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { AppState, Bill, TransactionItem, Item } from '../types';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { cn, parseTimestamp, getNormalizedDateKey, getParsedTimestampMs, calculateBillProfit } from '../lib/utils';
import { RecoveryService } from '../services/recoveryService';
import { printerService, DEFAULT_PRINT_SETTINGS } from '../services/printerService';
import { playFeedbackEvent } from '../services/soundFeedbackService';
import { useBackModal } from '../utils/backNavigationManager';

interface BillHistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  state: AppState;
  onUpdateState: (updates: Partial<AppState>) => void;
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

export default function BillHistoryDrawer({ isOpen, onClose, state, onUpdateState }: BillHistoryDrawerProps) {
  const [activeBillDetail, setActiveBillDetail] = useState<Bill | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const originalStyle = window.getComputedStyle(document.body).overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalStyle;
      };
    }
  }, [isOpen]);

  // Custom dialogs & notification states inside BillHistoryDrawer to support iframes/sandboxes perfectly
  const [customConfirm, setCustomConfirm] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
    isDestructive?: boolean;
    confirmText?: string;
    cancelText?: string;
  } | null>(null);

  const [toasts, setToasts] = useState<{
    id: string;
    message: string;
    type: 'success' | 'info' | 'warning' | 'error';
  }[]>([]);

  useBackModal(isOpen, onClose, 'bill_history_drawer');
  useBackModal(customConfirm !== null, () => setCustomConfirm(null), 'bill_history_confirm');
  useBackModal(activeBillDetail !== null, () => setActiveBillDetail(null), 'bill_history_detail');

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

  // Helper date format for backups
  const formatDateForBackup = (isoStr: string) => {
    try {
      return new Date(isoStr).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      }).replace(/ /g, '-');
    } catch {
      return 'backup';
    }
  };

  // KPI Calculations
  const invoicesList = state.bills || [];
  
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

  const estProfit = useMemo(() => {
    return invoicesList.reduce((sum, b) => {
      return sum + calculateBillProfit(b, state.items);
    }, 0);
  }, [invoicesList, state.items]);

  const oldestThan24HoursBills = useMemo(() => {
    const limits = 24 * 60 * 60 * 1000;
    const nowTime = Date.now();
    return invoicesList.filter(b => {
      const tMs = getParsedTimestampMs(b.timestamp);
      if (tMs === 0) return false;
      const diff = nowTime - tMs;
      return diff > limits;
    });
  }, [invoicesList]);

  const oldestDayInfo = useMemo(() => {
    if (invoicesList.length === 0) {
      return { bills: [], dateStr: '', formattedDate: '' };
    }
    
    // Group bills by normalized local YYYY-MM-DD date key
    const dateGroups: { [key: string]: Bill[] } = {};
    invoicesList.forEach(b => {
      const dateStr = getNormalizedDateKey(b.timestamp);
      if (!dateGroups[dateStr]) {
        dateGroups[dateStr] = [];
      }
      dateGroups[dateStr].push(b);
    });

    const uniqueDates = Object.keys(dateGroups)
      .filter(d => d !== 'unknown')
      .sort(); // sorted ascending, index 0 is oldest date (e.g. "2026-08-01")

    if (uniqueDates.length === 0) {
      if (dateGroups['unknown']?.length > 0) {
        return { bills: dateGroups['unknown'], dateStr: 'unknown', formattedDate: 'Legacy Invoices' };
      }
      return { bills: [], dateStr: '', formattedDate: '' };
    }

    const oldestDateStr = uniqueDates[0];
    const billsOfOldestDate = dateGroups[oldestDateStr] || [];

    let formattedDate = oldestDateStr;
    try {
      const [y, m, d] = oldestDateStr.split('-').map(Number);
      const dateObj = new Date(y, m - 1, d, 12, 0, 0);
      if (!isNaN(dateObj.getTime())) {
        formattedDate = dateObj.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
      }
    } catch (e) {
      // fallback
    }

    return {
      bills: billsOfOldestDate,
      dateStr: oldestDateStr,
      formattedDate
    };
  }, [invoicesList]);

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
          const billTime = parseTimestamp(bill.timestamp);
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
    }).sort((a, b) => getParsedTimestampMs(b.timestamp) - getParsedTimestampMs(a.timestamp));
  }, [invoicesList, searchQuery, filterType, startInvoice, endInvoice, startTime, endTime, paymentFilter]);

  // Group filtered bills by calendar date for structured categorization
  const groupedBills = useMemo(() => {
    const list: { dateLabel: string; dateKey: string; bills: Bill[]; totalAmount: number; totalProfit: number }[] = [];
    
    filteredBills.forEach(bill => {
      const dateKey = getNormalizedDateKey(bill.timestamp);
      let dateLabel = 'Unknown Date';
      try {
        const d = parseTimestamp(bill.timestamp);
        if (d && !isNaN(d.getTime()) && d.getTime() > 0) {
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
        }
      } catch (e) {
        console.error(e);
      }
      
      const billProfit = calculateBillProfit(bill, state.items);
      
      let group = list.find(g => g.dateKey === dateKey);
      if (!group) {
        group = {
          dateLabel,
          dateKey,
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
    } catch (err) {
      console.error(err);
    }
  };

  // PDF Backup of ALL bills (bulk list download)
  const generateCleanBackupPdf = (billsToClean: Bill[], customFilename?: string) => {
    if (billsToClean.length === 0) return false;
    
    try {
      const doc = new jsPDF() as any;
      const storeName = state.settings?.storeName || 'A-1 Retail Store';
      const timestamps = billsToClean.map(b => new Date(b.timestamp).getTime());
      const minTimestamp = Math.min(...timestamps);
      const sessionDate = formatDateForBackup(new Date(minTimestamp).toISOString());
      
      const totalCustomers = billsToClean.length;
      const totalSales = billsToClean.reduce((sum, b) => sum + b.total, 0);
      const totalProfit = billsToClean.reduce((sum, b) => {
        return sum + calculateBillProfit(b, state.items);
      }, 0);

      // --- PDF Header Style ---
      doc.setFillColor(31, 41, 55); // Deep slate background for top banner
      doc.rect(0, 0, 210, 48, 'F');

      doc.setFont("helvetica", "bold");
      doc.setFontSize(22);
      doc.setTextColor(255, 255, 255);
      doc.text(storeName.toUpperCase(), 14, 20);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(209, 213, 219);
      doc.text(`OFFICIAL BILLING HISTORY EXPORT`, 14, 27);
      doc.text(`RECORD COUNT: ${totalCustomers} invoices`, 14, 34);
      doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 41);

      // --- KPI metrics dashboard ---
      doc.setFillColor(243, 244, 246); // Light gray background for KPI panel
      doc.roundedRect(14, 54, 182, 28, 3, 3, 'F');

      // KPIs Text
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(75, 85, 99);
      doc.text("TOTAL CUSTOMERS", 20, 63);
      doc.text("TOTAL EXPORT SALES", 80, 63);
      doc.text("ESTIMATED NET MARGIN", 140, 63);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.setTextColor(17, 24, 39);
      doc.text(`${totalCustomers}`, 20, 74);
      doc.text(`INR ${totalSales.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 80, 74);
      doc.text(`INR ${totalProfit.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 140, 74);

      // Detail table below
      const sortedBillsToClean = [...billsToClean].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      
      const rawRows: any[] = [];
      let lastDateLabel = '';
      let indexCounter = 1;

      sortedBillsToClean.forEach((b) => {
        let dateLabel = 'Unknown Date';
        try {
          const d = new Date(b.timestamp);
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
          rawRows.push([
            {
              content: `📅  ${dateLabel.toUpperCase()}`,
              colSpan: 7,
              styles: {
                fillColor: [243, 244, 246],
                textColor: [17, 24, 39],
                fontStyle: 'bold',
                fontSize: 9
              }
            }
          ]);
        }

        const totalItems = b.items.reduce((sum, item) => sum + item.quantity, 0);
        rawRows.push([
          indexCounter++,
          b.billNumber,
          b.customerName || 'Walk-In Customer',
          `${totalItems} Products`,
          b.paymentMethod,
          `INR ${b.total.toFixed(2)}`,
          new Date(b.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        ]);
      });

      autoTable(doc, {
        startY: 90,
        head: [['#', 'Invoice Ref', 'Customer Details', 'Quantity Summary', 'Pay Mode', 'Grand Total', 'Timestamp']],
        body: rawRows,
        theme: 'striped',
        headStyles: { 
          fillColor: [31, 41, 55], 
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 9
        },
        styles: { 
          fontSize: 8.5,
          cellPadding: 3
        },
        columnStyles: {
          0: { cellWidth: 10 },
          1: { cellWidth: 25 },
          2: { cellWidth: 45 },
          3: { cellWidth: 30 },
          4: { cellWidth: 22 },
          5: { cellWidth: 28 },
          6: { cellWidth: 25 }
        },
        margin: { left: 14, right: 14 },
        didDrawPage: (data) => {
          const pageCount = doc.internal.getNumberOfPages();
          doc.setFont("helvetica", "normal");
          doc.setFontSize(8);
          doc.setTextColor(156, 163, 175);
          doc.text(`Page ${data.pageNumber} of ${pageCount}`, 14, 285);
          doc.text(`A-1 Ledger POS - Verified System Log`, 130, 285);
        }
      });

      doc.save(customFilename || `ledger-sales-report.pdf`);
      return true;
    } catch (err) {
      console.error("Failed to generate PDF:", err);
      addToast("Error exporting PDF. Check browser developer console.", "error");
      return false;
    }
  };

  const handleDownloadWholeHistory = () => {
    const success = generateCleanBackupPdf(filteredBills);
    if (success) {
      addToast(`Master Export Success: Certified PDF backup for current lists downloaded (${filteredBills.length} invoices).`, "success");
    }
  };

  const handleDownloadAndPurgeDate = (group: { dateLabel: string; bills: Bill[]; totalAmount: number }) => {
    // 1. Generate clean filename
    const cleanDateLabel = group.dateLabel.replace(/[^a-zA-Z0-9]/g, '_');
    const filename = `bills_export_${cleanDateLabel}.pdf`;
    
    // 2. Generate and download PDF
    const success = generateCleanBackupPdf(group.bills, filename);
    if (!success) {
      addToast("Failed to generate PDF backup. Aborting deletion.", "error");
      return;
    }
    
    // 3. Confirm deletion
    showCustomConfirm(
      "Backup Saved! Confirm Deletion?",
      `The PDF backup '${filename}' for ${group.dateLabel} (${group.bills.length} bills) has been successfully downloaded. 

Do you want to permanently delete these ${group.bills.length} bills from history now?`,
      () => {
        const groupSet = new Set(group.bills);
        const groupIds = new Set(group.bills.map(gb => gb.id).filter(Boolean));

        onUpdateState({
          bills: invoicesList.filter(b => !groupSet.has(b) && !(b.id && groupIds.has(b.id)))
        });
        addToast(`Successfully deleted all ${group.bills.length} bills for ${group.dateLabel} permanently.`, "success");
      },
      true, // isDestructive
      "Delete Permanently",
      "Keep History"
    );
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

    // Handle Udhar adjustments if payment mode changes or value updates
    let updatedCustomers = [...(state.udharCustomers || [])];
    let updatedTransactions = [...(state.udharTransactions || [])];

    // First, reverse old udhar connection
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

    // Next, establish new udhar connection if updated mode is Credit
    if (editPaymentMethod === 'Credit') {
      // Find or create customer
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

      // Record udhar transaction
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
    addToast(`Success: Invoice Record #${activeBillDetail.billNumber} modified and synced across database & analytics.`, "success");
  };

  const deleteBillInvoice = (bill: Bill) => {
    showCustomConfirm(
      "Confirm Invoice Removal",
      `Are you sure you want to permanently remove invoice record #${bill.billNumber}? Stored inventory stocks will be reverted, and credit accounts rectified automatically.`,
      () => {
        // Credit stocks back
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
        
        // Reverse udhar credit if payment method was Credit
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

        // Record to Business Recovery Center
        RecoveryService.recordDeletion(
          state.user?.uid || null,
          'bill',
          bill,
          `Bill #${bill.billNumber}`,
          `Customer: ${bill.customerName || 'General Cash'}, Grand Total: ₹${bill.total}`,
          state.user?.email || 'Store Owner',
          30
        ).catch(e => console.error(e));

        setActiveBillDetail(null);
        setIsEditing(false);
        addToast("Invoice removed. Inventory counts restored and ledger balances rectified. Archival snapshot stored.", "success");
      },
      true, // isDestructive
      "Remove Invoice",
      "Cancel"
    );
  };

  const handleFlushHistory = () => {
    if (oldestDayInfo.bills.length === 0) {
      addToast("No bills found to flush.", "warning");
      return;
    }
    const targetBills = oldestDayInfo.bills;
    const count = targetBills.length;
    const dateText = oldestDayInfo.formattedDate;

    showCustomConfirm(
      "Flush Oldest Day of Bills",
      `Are you sure you want to permanently delete all ${count} bill(s) from ${dateText} (the oldest day in history)? This action is irreversible.`,
      () => {
        const targetSet = new Set(targetBills);
        const targetIds = new Set(targetBills.map(b => b.id).filter(Boolean));

        onUpdateState({
          bills: invoicesList.filter(b => !targetSet.has(b) && !(b.id && targetIds.has(b.id)))
        });
        addToast(`Successfully deleted all ${count} bill(s) from ${dateText}.`, "success");
      },
      true, // isDestructive
      "Flush Oldest Day",
      "Cancel"
    );
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden flex justify-start overscroll-contain">
          {/* Backdrop blur overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs cursor-pointer select-none"
          />

          {/* Sliding Side Drawer panel */}
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 26, stiffness: 220 }}
            className="relative w-full max-w-sm sm:max-w-md bg-[var(--card)] shadow-2xl border-r border-[var(--border)] flex flex-col h-full z-50 text-left overflow-hidden overscroll-contain"
          >
            {/* Drawer Header */}
            <div className="flex items-center justify-between p-4 border-b border-[var(--border)] shrink-0 bg-slate-50/50 dark:bg-slate-950/20">
              <div className="flex items-center gap-2">
                <ReceiptText className="text-[var(--primary)] animate-pulse" size={18} />
                <div>
                  <h3 className="font-extrabold text-sm uppercase tracking-wider text-[var(--foreground)]">Billing History</h3>
                  <p className="text-[9px] text-[var(--foreground)]/60 font-semibold leading-none mt-0.5">Explore day's ledger accounts</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-1 px-3 rounded-xl bg-[var(--foreground)]/5 hover:bg-[var(--foreground)]/10 text-[9px] font-extrabold uppercase tracking-wider cursor-pointer transition-all border border-[var(--border)]"
              >
                Close
              </button>
            </div>

            {/* Quick stats grid for invoices */}
            <div className="grid grid-cols-3 gap-2 p-3 bg-gradient-to-r from-[var(--primary)]/5 via-slate-50/10 to-transparent border-b border-[var(--border)] shrink-0">
              <div className="p-2 border border-[var(--border)] bg-[var(--card)] rounded-xl text-center space-y-0.5 shadow-xs">
                <div className="text-[8px] font-black uppercase text-[var(--foreground)] opacity-70">Total Bills</div>
                <div className="text-xs font-black font-mono text-violet-500">{todayBillsCount}</div>
              </div>
              <div className="p-2 border border-[var(--border)] bg-[var(--card)] rounded-xl text-center space-y-0.5 shadow-xs">
                <div className="text-[8px] font-black uppercase text-[var(--foreground)] opacity-70">Total Sale</div>
                <div className="text-xs font-black font-mono text-[var(--primary)]">₹{todayTotalSale.toFixed(0)}</div>
              </div>
              <div className="p-2 border border-[var(--border)] bg-[var(--card)] rounded-xl text-center space-y-0.5 shadow-xs">
                <div className="text-[8px] font-black uppercase text-[var(--foreground)] opacity-70">Total Profit</div>
                <div className="text-xs font-black font-mono text-emerald-500">₹{todayNetProfit.toFixed(0)}</div>
              </div>
            </div>

            {/* Main Interactive List */}
            <div className="flex-1 min-h-0 flex flex-col overscroll-contain">
              
              {/* Dynamic Search & Filters Area */}
              <div className="p-3 border-b border-[var(--border)] space-y-2.5 bg-slate-50/30 dark:bg-slate-900/10 shrink-0">
                <div className="relative">
                  <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 opacity-40 text-[var(--foreground)]" />
                  <input
                    type="text"
                    placeholder="Search client, bill #, products, method..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full text-[10.5px] pl-8 pr-3 py-1.5 rounded-xl border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] placeholder:opacity-50 focus:outline-none focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)] text-left"
                  />
                  {searchQuery && (
                    <button onClick={() => setSearchQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[9px] font-bold text-rose-500 hover:underline">Clear</button>
                  )}
                </div>

                {/* Filter mode header */}
                <div className="flex items-center justify-between">
                  <span className="text-[8.5px] font-black uppercase tracking-wider text-[var(--foreground)] opacity-80 flex items-center gap-1">
                    <Filter size={10} /> Advanced Filter Engine
                  </span>
                  
                  {filterType !== 'none' && (
                    <button
                      onClick={() => {
                        setStartInvoice('');
                        setEndInvoice('');
                        setStartTime('');
                        setEndTime('');
                        setPaymentFilter('All');
                        setFilterType('none');
                      }}
                      className="text-[8px] font-black uppercase text-rose-500 hover:underline"
                    >
                      Reset filter
                    </button>
                  )}
                </div>

                {/* Filter Selector tabs */}
                <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-thin">
                  {(['none', 'invoice', 'time', 'payment'] as const).map(mode => (
                    <button
                      key={mode}
                      onClick={() => setFilterType(mode)}
                      className={cn(
                        "px-2.5 py-1 text-[8.5px] font-black uppercase tracking-wider rounded-lg border whitespace-nowrap cursor-pointer transition-all shrink-0",
                        filterType === mode
                          ? "bg-[var(--primary)] text-white border-[var(--primary)]"
                          : "bg-[var(--card)] text-[var(--foreground)]/60 border-[var(--border)] hover:text-[var(--foreground)]"
                      )}
                    >
                      {mode === 'none' ? 'All Logs' : mode === 'invoice' ? 'By Bill #' : mode === 'time' ? 'By Hours' : 'By Method'}
                    </button>
                  ))}
                </div>

                {/* Filter parameters */}
                {filterType === 'invoice' && (
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div>
                      <span className="text-[7px] font-black text-[var(--foreground)] opacity-70 uppercase">From Bill #</span>
                      <input
                        type="text"
                        placeholder="e.g. 1001"
                        value={startInvoice}
                        onChange={e => setStartInvoice(e.target.value)}
                        className="w-full text-[10px] p-1.5 rounded-lg border border-[var(--border)] bg-[var(--card)] focus:outline-none focus:border-[var(--primary)] font-mono text-left"
                      />
                    </div>
                    <div>
                      <span className="text-[7px] font-black text-[var(--foreground)] opacity-70 uppercase">To Bill #</span>
                      <input
                        type="text"
                        placeholder="e.g. 1045"
                        value={endInvoice}
                        onChange={e => setEndInvoice(e.target.value)}
                        className="w-full text-[10px] p-1.5 rounded-lg border border-[var(--border)] bg-[var(--card)] focus:outline-none focus:border-[var(--primary)] font-mono text-left"
                      />
                    </div>
                  </div>
                )}

                {filterType === 'time' && (
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div>
                      <span className="text-[7px] font-black text-[var(--foreground)] opacity-70 uppercase">Start hour (HH:MM)</span>
                      <input
                        type="time"
                        value={startTime}
                        onChange={e => setStartTime(e.target.value)}
                        className="w-full text-[10px] p-1 rounded-lg border border-[var(--border)] bg-[var(--card)] text-center font-mono cursor-pointer"
                      />
                    </div>
                    <div>
                      <span className="text-[7px] font-black text-[var(--foreground)] opacity-70 uppercase">End hour (HH:MM)</span>
                      <input
                        type="time"
                        value={endTime}
                        onChange={e => setEndTime(e.target.value)}
                        className="w-full text-[10px] p-1 rounded-lg border border-[var(--border)] bg-[var(--card)] text-center font-mono cursor-pointer"
                      />
                    </div>
                  </div>
                )}

                {filterType === 'payment' && (
                  <div className="flex gap-1.5 pt-1 overflow-x-auto pb-0.5">
                    {(['All', 'Cash', 'UPI', 'Credit'] as const).map(pm => (
                      <button
                        key={pm}
                        onClick={() => setPaymentFilter(pm)}
                        className={cn(
                          "px-2 py-0.5 text-[8.5px] font-black uppercase rounded border transition-all cursor-pointer",
                          paymentFilter === pm
                            ? "bg-slate-800 text-white border-slate-800 dark:bg-slate-200 dark:text-slate-900"
                            : "bg-[var(--card)] text-[var(--foreground)]/50 border-[var(--border)] hover:text-[var(--foreground)]"
                        )}
                      >
                        {pm}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Master backup notifications */}
              {oldestThan24HoursBills.length > 0 && oldestDayInfo.bills.length > 0 && (
                <div className="m-3 p-3 bg-amber-500/[0.04] rounded-xl border border-amber-500/20 space-y-2 select-none">
                  <p className="text-[9.5px] font-extrabold text-[var(--foreground)]/95 leading-normal">
                    ⚠️ Performance Sync: You have legacy invoice records older than 24 hours. Clear all bills from the oldest day ({oldestDayInfo.formattedDate} — {oldestDayInfo.bills.length} bills) to free system resources.
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={handleFlushHistory}
                      className="flex-1 py-1 px-2.5 bg-rose-500 hover:bg-rose-600 text-white rounded-lg text-[8.5px] font-black uppercase tracking-wider flex items-center justify-center gap-1 cursor-pointer transition-all"
                    >
                      <Trash size={10} /> Fast Flush ({oldestDayInfo.bills.length} Bills)
                    </button>
                  </div>
                </div>
              )}

              {/* PDF EXPORT FOR ENTIRE FILTERED BILLS */}
              {filteredBills.length > 0 && (
                <div className="px-3 pb-2 shrink-0">
                  <button
                    onClick={handleDownloadWholeHistory}
                    className="w-full py-2 bg-slate-800 dark:bg-slate-100 hover:opacity-90 text-white dark:text-slate-900 text-[10px] font-black uppercase tracking-widest rounded-xl shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all border border-slate-700/20"
                  >
                    <Download size={12} /> Save PDF Report ({filteredBills.length} Invoice)
                  </button>
                </div>
              )}

              {/* Central scroll list */}
              <div className="flex-1 overflow-y-auto p-3 space-y-4 no-scrollbar overscroll-contain">
                {groupedBills.length === 0 ? (
                  <div className="py-20 text-center opacity-40 select-none space-y-1.5">
                    <Archive className="mx-auto text-[var(--primary)] opacity-30 animate-bounce" size={32} />
                    <p className="text-[10px] font-black uppercase tracking-wider">No matching logs found</p>
                  </div>
                ) : (
                  groupedBills.map(group => (
                    <div key={group.dateLabel} className="space-y-2">
                      {/* Section Category Sticky Header */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between sticky top-0 bg-[var(--card)]/95 backdrop-blur-md py-2 px-2 z-10 border border-[var(--border)] rounded-xl shadow-xs gap-2">
                        <div className="flex items-center gap-1.5">
                          <Calendar size={13} className="text-[var(--primary)]" />
                          <span className="text-[10px] font-black uppercase tracking-wider text-[var(--foreground)]">
                            {group.dateLabel}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-[var(--foreground)]/5 text-[var(--foreground)]/60 border border-[var(--border)]">
                            {group.bills.length} {group.bills.length === 1 ? 'bill' : 'bills'}
                          </span>
                          <span className="text-[9.5px] font-black font-mono px-2.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/10">
                            ₹{group.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDownloadAndPurgeDate(group);
                            }}
                            className="inline-flex items-center gap-1 py-1 px-2.5 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/25 hover:bg-rose-500 hover:text-white text-[8px] font-black uppercase tracking-wider cursor-pointer transition-all shadow-xs"
                            title="Download PDF backup and permanently delete this date's bills"
                          >
                            <Download size={9} />
                            <Trash2 size={9} />
                            <span>Export & Purge</span>
                          </button>
                        </div>
                      </div>

                      {/* Sub-category list with a clean vertical dotted timeline visual guide */}
                      <div className="pl-3 border-l-2 border-dashed border-[var(--border)]/70 space-y-2.5 ml-3">
                        {group.bills.map(bill => {
                          const totalItemsCount = bill.items.reduce((acc, i) => acc + i.quantity, 0);
                          const billProfit = calculateBillProfit(bill, state.items);
                          
                          return (
                            <div
                              key={bill.id}
                              onClick={() => {
                                setActiveBillDetail(bill);
                                setIsEditing(false);
                              }}
                              className={cn(
                                "p-3 rounded-xl bg-[var(--card)] border cursor-pointer hover:border-[var(--primary)] transition-all relative overflow-hidden group select-none flex flex-col justify-between shadow-xs",
                                activeBillDetail?.id === bill.id
                                  ? "border-[var(--primary)] ring-1 ring-[var(--primary)] bg-[var(--primary)]/[0.015]"
                                  : "border-[var(--border)] hover:shadow-md"
                              )}
                            >
                              <div className="flex justify-between items-start leading-none mb-1">
                                <span className="font-mono text-[10px] font-black text-amber-500 group-hover:text-[var(--primary)] transition-colors">
                                  #{bill.billNumber}
                                </span>
                                <span className="text-[8.5px] opacity-40 font-bold font-mono">
                                  {new Date(bill.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>

                              <div className="text-[11px] font-black text-[var(--foreground)] truncate uppercase mb-1">
                                {bill.customerName || 'Walk-In Customer'}
                              </div>

                              {bill.customerPhone && (
                                <div className="text-[8.5px] opacity-50 font-semibold mb-1.5">
                                  📞 {bill.customerPhone}
                                </div>
                              )}

                              <div className="flex justify-between items-end border-t border-[var(--border)]/30 pt-1.5 mt-1 leading-none">
                                <div className="text-[10px] font-black text-[var(--primary)] font-mono">
                                  ₹{bill.total.toFixed(2)}
                                </div>
                                
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[7.5px] font-black text-emerald-500 font-mono">
                                    Margin: +₹{billProfit.toFixed(1)}
                                  </span>
                                  
                                  <span className={cn(
                                    "text-[7px] font-black px-1.5 py-0.5 rounded uppercase leading-none text-white",
                                    bill.paymentMethod === 'Cash' ? "bg-emerald-500" :
                                    bill.paymentMethod === 'UPI' ? "bg-violet-500" : "bg-rose-500"
                                  )}>
                                    {bill.paymentMethod}
                                  </span>
                                </div>
                              </div>

                              {/* Expand/chevron signifier */}
                              <div className="absolute right-2 top-2 w-1.5 h-1.5 rounded-full bg-[var(--primary)] opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Quick Invoice Details / Edit Nested Page Overlay Modal inside the side panel drawer */}
            <AnimatePresence>
              {activeBillDetail && (
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 30 }}
                  className="absolute inset-0 bg-[var(--background)] border-t border-[var(--primary)]/20 shadow-2xl z-50 flex flex-col overflow-hidden overscroll-contain"
                >
                  {/* Overlay Header */}
                  <div className="flex items-center justify-between p-4 border-b border-[var(--border)] shrink-0 bg-[var(--foreground)]/[0.03]">
                    <div className="flex items-center gap-2">
                      <ReceiptText className="text-amber-500 animate-bounce" size={16} />
                      <span className="font-extrabold text-xs uppercase tracking-wider">
                        {isEditing ? `Modifying Invoice` : `Invoice Details`} #{activeBillDetail.billNumber}
                      </span>
                    </div>
                    
                    <button
                      onClick={() => {
                        setActiveBillDetail(null);
                        setIsEditing(false);
                      }}
                      className="p-1 px-3 text-[9px] font-black uppercase text-rose-500 border border-rose-500/10 hover:bg-rose-500/5 rounded-xl cursor-pointer"
                    >
                      Back
                    </button>
                  </div>

                  {/* Body Scroller */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar overscroll-contain">
                    
                    {isEditing ? (
                      /* EDITING MODE FORM */
                      <div className="space-y-4">
                        <div className="p-3 bg-[var(--foreground)]/5 border border-[var(--border)] rounded-xl space-y-3">
                          <h4 className="text-[9px] font-black uppercase tracking-widest text-[var(--foreground)] opacity-70">Modifier form</h4>
                          
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-[7.5px] font-black uppercase opacity-60">Customer Name</label>
                              <input
                                type="text"
                                value={editCustomerName}
                                onChange={e => setEditCustomerName(e.target.value)}
                                className="w-full text-xs p-1.5 rounded border border-[var(--border)] bg-[var(--card)] focus:outline-none focus:border-[var(--primary)]"
                              />
                            </div>
                            <div>
                              <label className="text-[7.5px] font-black uppercase opacity-60">Customer Mobile</label>
                              <input
                                type="text"
                                value={editCustomerPhone}
                                onChange={e => setEditCustomerPhone(e.target.value)}
                                className="w-full text-xs p-1.5 rounded border border-[var(--border)] bg-[var(--card)] focus:outline-none focus:border-[var(--primary)]"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-3 gap-1.5">
                            <div>
                              <label className="text-[7.5px] font-black uppercase opacity-60">Discount (%)</label>
                              <input
                                type="number"
                                value={editDiscountPercent}
                                onChange={e => setEditDiscountPercent(Math.max(0, parseFloat(e.target.value) || 0))}
                                className="w-full text-xs p-1 rounded border border-[var(--border)] bg-[var(--card)] font-mono"
                              />
                            </div>
                            <div>
                              <label className="text-[7.5px] font-black uppercase opacity-60">GST Tax (%)</label>
                              <input
                                type="number"
                                value={editTaxPercent}
                                onChange={e => setEditTaxPercent(Math.max(0, parseFloat(e.target.value) || 0))}
                                className="w-full text-xs p-1 rounded border border-[var(--border)] bg-[var(--card)] font-mono"
                              />
                            </div>
                            <div>
                              <label className="text-[7.5px] font-black uppercase opacity-60">Payment Mode</label>
                              <select
                                value={editPaymentMethod}
                                onChange={e => setEditPaymentMethod(e.target.value as any)}
                                className="w-full text-xs p-1 rounded border border-[var(--border)] bg-[var(--card)] font-extrabold"
                              >
                                <option value="Cash">Cash</option>
                                <option value="UPI">UPI</option>
                                <option value="Credit">Credit / Udhar</option>
                              </select>
                            </div>
                          </div>
                        </div>

                        {/* Edit item row deletion / quantity modifications */}
                        <div className="space-y-2">
                          <span className="text-[8.5px] font-black uppercase tracking-wider text-[var(--foreground)] opacity-70">Products in Cart</span>
                          
                          <div className="space-y-1.5">
                            {editCart.map(ci => (
                              <div key={ci.id} className="p-2 border border-[var(--border)] bg-[var(--card)] rounded-xl flex items-center justify-between gap-2 shadow-inner">
                                <div className="min-w-0 flex-1">
                                  <div className="text-[10.5px] font-extrabold truncate uppercase">{ci.name}</div>
                                  <div className="text-[8.5px] font-mono opacity-50">₹{ci.price} per {ci.unit}</div>
                                </div>
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => updateEditCartQuantity(ci.id, ci.quantity - 1)}
                                    className="p-1 rounded bg-[var(--foreground)]/5 hover:bg-[var(--foreground)]/10 text-xs font-black"
                                  >
                                    -
                                  </button>
                                  <span className="text-[11px] font-black px-1.5 font-mono">{ci.quantity}</span>
                                  <button
                                    onClick={() => updateEditCartQuantity(ci.id, ci.quantity + 1)}
                                    className="p-1 rounded bg-[var(--foreground)]/5 hover:bg-[var(--foreground)]/10 text-xs font-black"
                                  >
                                    +
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Add custom item form in edit */}
                        <div className="p-3 bg-amber-500/[0.02] border border-amber-500/10 rounded-xl space-y-3">
                          <span className="text-[8.5px] font-black uppercase tracking-wider text-amber-500 flex items-center gap-1 leading-none">
                            <Plus size={10} /> Add extra manual product
                          </span>
                          <div className="space-y-2">
                            <input
                              type="text"
                              placeholder="Extra Product Name"
                              value={editManualName}
                              onChange={e => setEditManualName(e.target.value)}
                              className="w-full text-xs p-1.5 rounded border border-[var(--border)] bg-[var(--card)] focus:outline-none"
                            />
                            <div className="grid grid-cols-4 gap-1">
                              <input
                                type="number"
                                placeholder="Price"
                                value={editManualPrice}
                                onChange={e => setEditManualPrice(e.target.value)}
                                className="w-full text-[10px] p-1 border border-[var(--border)] bg-[var(--card)] text-center font-mono"
                              />
                              <input
                                type="number"
                                placeholder="Cost"
                                value={editManualCost}
                                onChange={e => setEditManualCost(e.target.value)}
                                className="w-full text-[10px] p-1 border border-[var(--border)] bg-[var(--card)] text-center font-mono"
                              />
                              <input
                                type="number"
                                placeholder="Qty"
                                value={editManualQuantity}
                                onChange={e => setEditManualQuantity(e.target.value)}
                                className="w-full text-[10px] p-1 border border-[var(--border)] bg-[var(--card)] text-center font-mono"
                              />
                              <input
                                type="text"
                                placeholder="Unit"
                                value={editManualUnit}
                                onChange={e => setEditManualUnit(e.target.value)}
                                className="w-full text-[10px] p-1 border border-[var(--border)] bg-[var(--card)] text-center"
                              />
                            </div>
                            <button
                              onClick={addManualItemToEditCart}
                              type="button"
                              className="w-full py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded text-[8.5px] font-black uppercase tracking-widest cursor-pointer leading-none transition-all"
                            >
                              Add directly to billing edit
                            </button>
                          </div>
                        </div>

                      </div>
                    ) : (
                      /* STATIC VIEW MODE DETAILS */
                      <div className="space-y-4 text-xs font-extrabold">
                        
                        {/* Top invoice timestamp badge */}
                        <div className="p-3.5 bg-[var(--foreground)]/[0.04] rounded-2xl border border-[var(--border)] space-y-1.5 text-center select-text">
                          <div className="text-[8.5px] font-black uppercase text-[var(--foreground)] opacity-60 leading-none">Registration Stamp</div>
                          <div className="font-mono text-sm font-black text-[var(--foreground)]">{new Date(activeBillDetail.timestamp).toLocaleString()}</div>
                          <div className="text-[7.5px] text-[var(--foreground)] opacity-50 leading-none font-mono">Reference ID: {activeBillDetail.id}</div>
                        </div>

                        {/* Customer information profile card */}
                        <div className="p-3 border border-[var(--border)] bg-[var(--card)] rounded-xl space-y-2 select-text">
                          <div className="text-[8.5px] font-black uppercase tracking-wider text-[var(--foreground)] opacity-80">Buyer Information</div>
                          <p className="text-[11px] font-black leading-none uppercase">{activeBillDetail.customerName || 'Standard Walk-In'}</p>
                          {activeBillDetail.customerPhone && (
                            <p className="text-[10px] text-[var(--foreground)] opacity-80 font-mono">Mobile Number: {activeBillDetail.customerPhone}</p>
                          )}
                          <p className="text-[9px] text-[var(--foreground)] opacity-75 font-mono">Billing Account: {activeBillDetail.paymentMethod}</p>
                        </div>

                        {/* Items listed overview */}
                        <div className="space-y-1.5">
                          <span className="text-[8.5px] font-black uppercase tracking-wider text-[var(--foreground)] opacity-80">Products Listing</span>
                          
                          <div className="border border-[var(--border)] rounded-xl overflow-hidden divide-y divide-[var(--border)]">
                            {activeBillDetail.items.map((it, idx) => (
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

                        {/* Transaction math recap details */}
                        <div className="p-3 border border-[var(--border)] rounded-xl bg-[var(--foreground)]/[0.02] space-y-1.5 select-text">
                          <div className="flex justify-between text-[10px] text-[var(--foreground)] opacity-85">
                            <span>Basket Subtotal :</span>
                            <span className="font-mono">₹{activeBillDetail.subtotal.toFixed(2)}</span>
                          </div>

                          {activeBillDetail.discount > 0 && (
                            <div className="flex justify-between text-[10px] text-emerald-500">
                              <span>Promo Deduction ({activeBillDetail.discount}%) :</span>
                              <span className="font-mono">-₹{((activeBillDetail.subtotal * activeBillDetail.discount) / 100).toFixed(2)}</span>
                            </div>
                          )}

                          {activeBillDetail.tax > 0 && (
                            <div className="flex justify-between text-[10px] text-rose-500">
                              <span>SGST/CGST Tax ({activeBillDetail.tax}%) :</span>
                              <span className="font-mono">+₹{(((activeBillDetail.subtotal - (activeBillDetail.subtotal * activeBillDetail.discount / 100)) * activeBillDetail.tax) / 100).toFixed(2)}</span>
                            </div>
                          )}

                          <div className="flex justify-between text-xs font-black pt-1.5 mt-1 border-t border-[var(--border)]">
                            <span className="uppercase tracking-wider">Net Amount :</span>
                            <span className="text-[var(--primary)] font-mono">₹{activeBillDetail.total.toFixed(2)}</span>
                          </div>

                          {activeBillDetail.discount > 0 && (
                            <div className="bg-emerald-500/10 border border-emerald-500/25 rounded-lg p-2 text-center text-emerald-700 dark:text-emerald-300 font-sans font-black text-[9px] flex items-center justify-between mt-1">
                              <span className="flex items-center gap-1">
                                <span>🎉</span> Customer Saved / बचत:
                              </span>
                              <span className="font-mono text-xs font-black text-emerald-600 dark:text-emerald-400">
                                ₹{((activeBillDetail.subtotal * activeBillDetail.discount) / 100).toFixed(2)}
                              </span>
                            </div>
                          )}
                        </div>

                      </div>
                    )}

                  </div>

                  {/* Actions footer bar inside modal overlay */}
                  <div className="p-4 border-t border-[var(--border)] shrink-0 bg-[var(--foreground)]/[0.03] leading-none">
                    {isEditing ? (
                      /* Saving buttons */
                      <div className="flex gap-2">
                        <button
                          onClick={() => setIsEditing(false)}
                          className="flex-1 py-2 rounded-xl border border-[var(--border)] text-[9.5px] font-black uppercase tracking-wider hover:bg-[var(--foreground)]/5 transition-all text-center cursor-pointer select-none"
                        >
                          Discard Changes
                        </button>
                        
                        <button
                          onClick={saveEditedBillInvoice}
                          className="flex-1 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-[9.5px] font-black uppercase tracking-wider shadow-sm flex items-center justify-center gap-1 cursor-pointer transition-all select-none"
                        >
                          <Save size={11} /> Commit Sync
                        </button>
                      </div>
                    ) : (
                      /* Standard Actions buttons */
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <button
                          onClick={() => deleteBillInvoice(activeBillDetail)}
                          className="px-3.5 py-2 rounded-xl border border-rose-500/20 bg-rose-500/5 text-rose-500 hover:bg-rose-500 hover:text-white transition-all text-[9px] font-black uppercase tracking-wider flex items-center gap-1.5 cursor-pointer select-none"
                        >
                          <Trash size={11} /> Remove Bill
                        </button>

                        <div className="flex gap-1.5 flex-wrap">
                          <button
                            onClick={async () => {
                              try {
                                const savedConfig = localStorage.getItem('price_manager_printer_config');
                                let config = DEFAULT_PRINT_SETTINGS;
                                if (savedConfig) {
                                  config = { ...DEFAULT_PRINT_SETTINGS, ...JSON.parse(savedConfig) };
                                }
                                const copies = config.duplicateCopies || 1;
                                for (let c = 0; c < copies; c++) {
                                  await printerService.printViaSystem(activeBillDetail, config);
                                }
                                playFeedbackEvent('print_success', state.settings);
                              } catch (err: any) {
                                addToast(`Print Error: ${err.message}`, "error");
                              }
                            }}
                            className="px-3 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-[9px] font-black uppercase rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer select-none"
                          >
                            <Printer size={11} /> Print Bill
                          </button>

                          <button
                            onClick={() => downloadBillPdf(activeBillDetail)}
                            className="px-3 py-2 bg-[var(--primary)] text-white text-[9px] font-black uppercase rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer hover:opacity-90 select-none"
                          >
                            <Download size={11} /> Export PDF
                          </button>

                          <button
                            onClick={() => startEditingSavedInvoice(activeBillDetail)}
                            className="px-3 py-2 bg-orange-500 hover:bg-orange-600 text-white text-[9px] font-black uppercase rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer select-none"
                          >
                            <Edit2 size={11} /> Edit / Modify
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                </motion.div>
              )}
            </AnimatePresence>

          </motion.div>

          {/* 🔮 CUSTOM CONFIRM DIALOG */}
          <AnimatePresence>
            {customConfirm && (
              <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setCustomConfirm(null)}
                  className="absolute inset-0 bg-black/60 backdrop-blur-md"
                />
                
                <motion.div
                  initial={{ scale: 0.9, y: 15, opacity: 0 }}
                  animate={{ scale: 1, y: 0, opacity: 1 }}
                  exit={{ scale: 0.9, y: 15, opacity: 0 }}
                  transition={{ type: "spring", stiffness: 400, damping: 28 }}
                  className={cn(
                    "relative w-full max-w-sm bg-[var(--card)] border rounded-[2rem] p-6 shadow-2xl overflow-hidden text-[var(--foreground)] z-[2010] transition-all duration-300",
                    customConfirm.isDestructive ? "border-red-500/30 font-bold" : "border-[var(--border)]"
                  )}
                >
                  <div className={cn(
                    "absolute top-0 left-1/4 h-24 w-40 rounded-full blur-2xl pointer-events-none",
                    customConfirm.isDestructive ? "bg-red-500/10" : "bg-[var(--primary)]/10"
                  )} />

                  <div className="space-y-4 relative z-10">
                    <div className="flex items-center gap-2.5">
                      <div className={cn(
                        "h-8 w-8 rounded-xl flex items-center justify-center font-bold",
                        customConfirm.isDestructive ? "bg-red-500/15 text-red-500" : "bg-amber-500/15 text-amber-500"
                      )}>
                        <Trash2 size={15} />
                      </div>
                      <div>
                        <h3 className="text-sm font-black uppercase tracking-tight text-[var(--foreground)]">{customConfirm.title}</h3>
                        <p className={cn(
                          "text-[8px] font-bold uppercase tracking-widest mt-0.5",
                          customConfirm.isDestructive ? "text-red-500" : "text-amber-500"
                        )}>
                          {customConfirm.isDestructive ? "Destructive Operation" : "Verification Panel"}
                        </p>
                      </div>
                    </div>

                    <p className="text-[11px] font-semibold text-[var(--foreground)]/70 uppercase tracking-wide leading-normal">
                      {customConfirm.message}
                    </p>

                    <div className="flex items-center justify-end gap-2.5 pt-2">
                      <button
                        onClick={() => setCustomConfirm(null)}
                        className="px-4 py-2 rounded-xl text-[9px] font-bold uppercase tracking-wider text-[var(--foreground)]/60 hover:bg-[var(--foreground)]/5 transition-all cursor-pointer"
                      >
                        {customConfirm.cancelText || "Cancel"}
                      </button>

                      <button
                        onClick={() => {
                          customConfirm.onConfirm();
                          setCustomConfirm(null);
                        }}
                        className={cn(
                          "px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all cursor-pointer active:scale-95 shadow-md",
                          customConfirm.isDestructive 
                            ? "bg-red-500 text-white hover:bg-red-500/90 shadow-red-500/20" 
                            : "bg-[var(--primary)] text-white hover:bg-[var(--primary)]/90 shadow-[var(--primary)]/20"
                        )}
                      >
                        {customConfirm.confirmText || "Confirm"}
                      </button>
                    </div>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          {/* 🔮 CUSTOM TOASTS STACK */}
          <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-2 max-w-sm pointer-events-none">
            <AnimatePresence>
              {toasts.map((toast, tIdx) => (
                <motion.div
                  layout
                  initial={{ opacity: 0, y: 15, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.15 } }}
                  key={`bhd-toast-${toast.id || 'toast'}-${tIdx}`}
                  className={cn(
                    "p-3.5 rounded-xl border flex items-center gap-3 shadow-lg pointer-events-auto",
                    toast.type === 'success' ? "bg-emerald-500 hover:bg-emerald-600 border-emerald-500/20 text-white text-[11px] font-black uppercase tracking-wide" :
                    toast.type === 'error' ? "bg-red-500 hover:bg-red-600 border-red-500/20 text-white text-[11px] font-black uppercase tracking-wide" :
                    toast.type === 'warning' ? "bg-amber-500 hover:bg-amber-600 border-amber-500/20 text-white text-[11px] font-black uppercase tracking-wide" :
                    "bg-[var(--card)] border-[var(--border)] text-[var(--foreground)] text-[11px] font-bold uppercase tracking-wide"
                  )}
                >
                  <div className="shrink-0 flex items-center justify-center h-5 w-5 rounded-full bg-white/10 text-white">
                    {toast.type === 'success' ? <Check size={12} className="stroke-[3px]" /> :
                     toast.type === 'error' ? <X size={12} className="stroke-[3px]" /> :
                     toast.type === 'warning' ? <Trash2 size={12} /> :
                     <CheckCircle size={11} />}
                  </div>
                  <span className="flex-1 leading-normal text-white">{toast.message}</span>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setToasts(prev => prev.filter(t => t.id !== toast.id));
                    }}
                    className="text-[9px] font-bold text-white/40 hover:text-white cursor-pointer"
                  >
                    DISMISS
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
}
