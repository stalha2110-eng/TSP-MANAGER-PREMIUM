import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  X, Search, LayoutGrid, PackagePlus, Eye, Plus, Minus, Check, 
  Sparkles, Filter, SlidersHorizontal, ArrowUpDown, CheckCircle2, 
  AlertTriangle, XCircle, ShoppingCart, Tag, Layers, ArrowLeft,
  ReceiptText, Download, Printer, ChevronRight, FileText, ChevronDown,
  ArrowUpRight, ExternalLink, ArrowDownRight, CreditCard, Scale, IndianRupee, Mic, MicOff
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Item, Category, LanguageType } from '../types';
import { cn, formatNumber } from '../lib/utils';
import { cleanAndValidateText } from '../services/languageEngine';
import { QuickWeightPresets, ItemHoldWeightModal } from './QuickWeightPresets';
import { parseSearchInput, calculateWeightFromAmount } from '../utils/weightHelpers';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface CatalogCartItem {
  id: string;
  item: Partial<Item> & { isManual?: boolean };
  name: string;
  quantity: number;
  price: number;
  cost?: number;
  unit: string;
}

export interface AllItemsCatalogModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: Item[];
  categories: Category[];
  cart: CatalogCartItem[];
  onAddToCart: (item: Item, e?: React.MouseEvent, customQty?: number, replaceQty?: boolean) => void;
  onUpdateCartQuantity?: (itemId: string, newQty: number) => void;
  billingMode: 'auto' | 'retail' | 'wholesale';
  currentLang: LanguageType;
  settings: any;
  onPeek?: (preview: { type: 'item' | 'customer' | 'bill' | 'notification' | 'analytics'; payload: any } | null) => void;
  onOpenManualModal?: () => void;
  onViewDraft?: () => void;
  onGoToTicketReceiptList?: () => void;
  customerName?: string;
  customerPhone?: string;
  paymentMethod?: string;
  discountPercent?: number;
  taxPercent?: number;
  onCheckout?: () => void;
}

export const AllItemsCatalogModal: React.FC<AllItemsCatalogModalProps> = ({
  isOpen,
  onClose,
  items,
  categories,
  cart,
  onAddToCart,
  onUpdateCartQuantity,
  billingMode,
  currentLang,
  settings,
  onPeek,
  onOpenManualModal,
  onViewDraft,
  onGoToTicketReceiptList,
  customerName = '',
  customerPhone = '',
  paymentMethod = 'Cash',
  discountPercent = 0,
  taxPercent = 0,
  onCheckout
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'recent' | 'name_asc' | 'price_asc' | 'price_desc' | 'stock_desc'>('recent');
  const [activePredictionIndex, setActivePredictionIndex] = useState(-1);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isListening, setIsListening] = useState(false);

  // Parse multiplier / weight / amount shorthands (Power Cashier Mode & ₹50 ka Kaju conversion)
  const parsedSearch = useMemo(() => parseSearchInput(searchQuery), [searchQuery]);

  // Voice Search / Mic dictation handler
  const handleVoiceSearch = () => {
    try {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRecognition) {
        return;
      }
      
      const rec = new SpeechRecognition();
      rec.lang = currentLang === 'hi' ? 'hi-IN' : (currentLang === 'mr' ? 'mr-IN' : 'en-IN');
      rec.continuous = false;
      rec.interimResults = false;

      setIsListening(true);
      
      rec.onstart = () => {
        setIsListening(true);
      };
      rec.onresult = (event: any) => {
        const textStr = event.results[0][0].transcript;
        setSearchQuery(textStr);
        setIsListening(false);
      };
      rec.onerror = () => {
        setIsListening(false);
      };
      rec.onend = () => {
        setIsListening(false);
      };

      rec.start();
    } catch {
      setIsListening(false);
    }
  };
  
  // Hold quick weight modal state
  const [holdModalItem, setHoldModalItem] = useState<Item | null>(null);
  const holdTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isLongPressRef = useRef(false);

  const handlePointerDown = (item: Item) => {
    isLongPressRef.current = false;
    if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
    holdTimerRef.current = setTimeout(() => {
      isLongPressRef.current = true;
      setHoldModalItem(item);
    }, 380);
  };

  const handlePointerUpOrCancel = () => {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
  };

  const handleItemCardClick = (item: Item, e: React.MouseEvent) => {
    if (isLongPressRef.current) {
      e.preventDefault();
      e.stopPropagation();
      isLongPressRef.current = false;
      return;
    }

    const itemPrice = billingMode === 'wholesale' ? (item.wholesalePrice || item.retailPrice) : item.retailPrice;
    let targetQty = 1;
    if (parsedSearch.mode === 'target_budget' && parsedSearch.targetPrice) {
      targetQty = calculateWeightFromAmount(parsedSearch.targetPrice, itemPrice || 1, 3);
    } else if (parsedSearch.quantity) {
      targetQty = parsedSearch.quantity;
    }

    onAddToCart(item, e, targetQty, parsedSearch.mode !== 'plain');
    if (parsedSearch.mode !== 'plain') {
      setSearchQuery('');
      setIsSearchFocused(false);
    }
  };

  // Live Draft Invoice Preview Popup states inside catalog
  const [isDraftPreviewOpen, setIsDraftPreviewOpen] = useState(false);
  const [showDesktopLiveInvoice, setShowDesktopLiveInvoice] = useState(true);
  const [livePreviewTheme, setLivePreviewTheme] = useState<'thermal' | 'laser'>('thermal');

  // Handler to direct user directly to Ticket Receipt List on billing dashboard
  const handleDirectToTicketReceiptList = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (onGoToTicketReceiptList) {
      onGoToTicketReceiptList();
    } else {
      onClose();
      setTimeout(() => {
        const el = document.getElementById('ticket-receipt-list');
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          el.classList.add('ring-4', 'ring-[var(--primary)]', 'ring-offset-2', 'transition-all');
          setTimeout(() => {
            el.classList.remove('ring-4', 'ring-[var(--primary)]', 'ring-offset-2');
          }, 2500);
        }
      }, 100);
    }
  };

  // Calculate cart map for instant lookup of quantities in active bill
  const cartMap = useMemo(() => {
    const map = new Map<string, number>();
    cart.forEach(ci => {
      map.set(ci.id, (map.get(ci.id) || 0) + ci.quantity);
    });
    return map;
  }, [cart]);

  // Total cart value summary
  const cartTotal = useMemo(() => {
    return cart.reduce((acc, ci) => acc + (ci.price * ci.quantity), 0);
  }, [cart]);

  const precision = settings?.pricePrecision || 0;
  const subtotal = cartTotal;
  const discountAmount = (subtotal * discountPercent) / 100;
  const taxAmount = ((subtotal - discountAmount) * taxPercent) / 100;
  const totalVal = subtotal - discountAmount + taxAmount;

  // Download PDF generator
  const downloadLivePDF = () => {
    try {
      const doc = new jsPDF();
      doc.setFont("helvetica", "bold");
      doc.text(settings?.storeName || "TS PRICE MANAGER", 20, 20);
      doc.setFontSize(10);
      doc.text(`Customer: ${customerName || 'Walk-in Customer'}`, 20, 30);
      doc.text(`Phone: ${customerPhone || 'N/A'}`, 20, 35);
      doc.text(`Payment: ${paymentMethod}`, 20, 40);
      doc.text(`Date: ${new Date().toLocaleDateString()}`, 20, 45);
      
      const rows = cart.map((ci, idx) => [
        idx + 1,
        ci.name,
        ci.quantity,
        `INR ${ci.price}`,
        `INR ${ci.price * ci.quantity}`
      ]);
      
      autoTable(doc, {
        startY: 50,
        head: [['#', 'Item', 'Qty', 'Unit Price', 'Total']],
        body: rows
      });
      
      const lastY = (doc as any).lastAutoTable?.finalY || 100;
      doc.text(`Subtotal: INR ${subtotal}`, 140, lastY + 10);
      if (discountPercent > 0) doc.text(`Discount: ${discountPercent}%`, 140, lastY + 15);
      if (taxPercent > 0) doc.text(`Tax: ${taxPercent}%`, 140, lastY + 20);
      doc.text(`Grand Total: INR ${totalVal}`, 140, lastY + 25);
      
      doc.save(`Invoice_Draft_${Date.now()}.pdf`);
    } catch (e) {
      console.error('PDF generation error', e);
    }
  };

  // Typo-tolerant and multi-language search filtering with shorthand cleanQuery awareness
  const effectiveSearchTerm = parsedSearch.mode !== 'plain' ? parsedSearch.cleanQuery : searchQuery;

  const filteredAndSortedItems = useMemo(() => {
    let result = items.filter(item => {
      // Category filter
      if (selectedCategory && item.categoryId !== selectedCategory) {
        return false;
      }

      // Search Query filter
      if (effectiveSearchTerm.trim()) {
        const query = effectiveSearchTerm.toLowerCase().trim();
        const trs = item.translations || { en: item.name || '', hi: '', mr: '', 'hi-en': '' };
        const nameMatch = 
          (trs.en || '').toLowerCase().includes(query) ||
          (trs.hi || '').toLowerCase().includes(query) ||
          (trs.mr || '').toLowerCase().includes(query) ||
          (trs['hi-en'] || '').toLowerCase().includes(query) ||
          (item.name || '').toLowerCase().includes(query) ||
          (item.id || '').toLowerCase().includes(query) ||
          (item.unit || '').toLowerCase().includes(query);

        const categoryName = categories.find(c => c.id === item.categoryId)?.name || '';
        const catMatch = categoryName.toLowerCase().includes(query);

        return nameMatch || catMatch;
      }

      return true;
    });

    // Sorting
    result = [...result].sort((a, b) => {
      const priceA = billingMode === 'wholesale' ? (a.wholesalePrice || a.retailPrice) : a.retailPrice;
      const priceB = billingMode === 'wholesale' ? (b.wholesalePrice || b.retailPrice) : b.retailPrice;
      const nameA = (a.translations?.[currentLang] || a.name || '').toLowerCase();
      const nameB = (b.translations?.[currentLang] || b.name || '').toLowerCase();

      switch (sortBy) {
        case 'name_asc':
          return nameA.localeCompare(nameB);
        case 'price_asc':
          return priceA - priceB;
        case 'price_desc':
          return priceB - priceA;
        case 'stock_desc':
          return b.quantity - a.quantity;
        case 'recent':
        default: {
          const timeA = new Date(a.lastUpdated || a.priceChangedAt || 0).getTime();
          const timeB = new Date(b.lastUpdated || b.priceChangedAt || 0).getTime();
          return timeB - timeA;
        }
      }
    });

    return result;
  }, [items, selectedCategory, effectiveSearchTerm, sortBy, billingMode, currentLang, categories]);

  if (!isOpen) return null;

  return (
    <>
      <div key="all-items-catalog-root-container" className="fixed inset-0 z-[140] flex items-center justify-center p-2 sm:p-3 md:p-5 overflow-hidden">
        {/* Backdrop */}
        <motion.div
          key="all-items-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm"
        />

        {/* Modal Window */}
        <motion.div
          key="all-items-window"
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ type: "spring", stiffness: 380, damping: 28 }}
          className="relative z-10 w-full max-w-[96vw] xl:max-w-7xl h-[88vh] sm:h-[90vh] max-h-[860px] rounded-3xl bg-[var(--background)] border border-[var(--border)] shadow-2xl flex flex-col overflow-hidden text-[var(--foreground)]"
        >
          {/* BIG CORNER CLOSE BUTTON (Very upper right corner) */}
          <button
            onClick={onClose}
            className="absolute top-2 right-2.5 z-30 h-9 w-9 sm:h-10 sm:w-10 rounded-2xl bg-rose-500/10 hover:bg-rose-500 hover:text-white text-rose-500 border border-rose-500/30 flex items-center justify-center transition-all shadow-md hover:scale-105 active:scale-95 cursor-pointer"
            title="Close Catalog (Esc)"
            aria-label="Close"
          >
            <X size={22} strokeWidth={2.5} />
          </button>

          {/* HEADER BAR */}
          <div className="shrink-0 pl-3 sm:pl-4 pr-14 py-2 sm:py-2.5 bg-[var(--card)] border-b border-[var(--border)] flex flex-wrap items-center justify-between gap-2 select-none">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-2xl bg-gradient-to-tr from-[var(--primary)] to-indigo-500 text-white flex items-center justify-center shadow-md shrink-0">
                <LayoutGrid size={18} />
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xs sm:text-sm font-black uppercase tracking-tight text-[var(--foreground)]">
                  {cleanAndValidateText("Store Items Catalog", currentLang, settings)}
                </h2>
                <span className="px-2 py-0.2 rounded-full text-[9px] font-black bg-[var(--primary)]/10 text-[var(--primary)] border border-[var(--primary)]/20">
                  {items.length} {cleanAndValidateText("Items", currentLang, settings)}
                </span>
              </div>
            </div>

            {/* Price Mode, Add Custom Item Button (Icon Only), Live Preview Toggle & Sort Selector */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              <div className="hidden sm:flex items-center gap-1 px-2 py-1 rounded-xl bg-[var(--foreground)]/5 border border-[var(--border)] text-[8.5px] font-black uppercase">
                <span className="opacity-60">Price:</span>
                <span className={cn(
                  "px-1.5 py-0.2 rounded-md",
                  billingMode === 'wholesale' ? "bg-amber-500/20 text-amber-500 border border-amber-500/30" : "bg-emerald-500/20 text-emerald-500 border border-emerald-500/30"
                )}>
                  {billingMode === 'wholesale' ? "Wholesale" : "Retail"}
                </span>
              </div>

              {/* Live Invoice Preview Toggle Button on Desktop */}
              <button
                type="button"
                onClick={() => setShowDesktopLiveInvoice(!showDesktopLiveInvoice)}
                className={cn(
                  "hidden lg:flex items-center gap-1 px-2.5 py-1 rounded-xl border text-[8.5px] font-black uppercase transition-all cursor-pointer shadow-xs",
                  showDesktopLiveInvoice 
                    ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30" 
                    : "bg-[var(--foreground)]/5 text-[var(--foreground)]/60 border-[var(--border)] hover:text-[var(--foreground)]"
                )}
                title="Toggle Live Invoice Preview Terminal (लाइव बिल रसीद देखें)"
              >
                <ReceiptText size={12} className={showDesktopLiveInvoice ? "text-emerald-500 animate-pulse" : ""} />
                <span>Live Preview</span>
                {cart.length > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-emerald-500 text-white text-[7px] font-black font-mono">
                    {cart.length}
                  </span>
                )}
              </button>

              {onOpenManualModal && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenManualModal();
                  }}
                  className="h-8 w-8 sm:h-9 sm:w-9 rounded-xl bg-[#99113b] hover:bg-[#800e31] text-white active:scale-95 transition-all flex items-center justify-center shadow-md cursor-pointer shrink-0"
                  title="Add Item Not in List (खुला / अतिरिक्त सामान जोड़ें)"
                  aria-label="Add Item Not in List"
                >
                  <PackagePlus size={18} />
                </button>
              )}

              {/* TICKET RECEIPT LIST LARGE TROLLEY ICON BUTTON (Flagship Direct Navigation Action in Right Corner) */}
              <button
                type="button"
                onClick={handleDirectToTicketReceiptList}
                className="relative h-8.5 w-9 sm:h-9.5 sm:w-10 rounded-xl bg-gradient-to-tr from-[var(--primary)] via-indigo-600 to-violet-600 hover:from-[var(--primary)]/90 hover:to-indigo-500 text-white flex items-center justify-center shadow-md shadow-indigo-500/20 active:scale-95 transition-all cursor-pointer shrink-0 border border-white/20 select-none"
                title="Go to Ticket Receipt List on Billing Dashboard (बिल रसीद सूची पर जाएं)"
                aria-label="Go to Ticket Receipt List"
              >
                <ShoppingCart size={20} className="text-amber-200 drop-shadow-sm transition-transform group-hover:scale-110" />
                {cart.length > 0 ? (
                  <span className="absolute -top-1.5 -right-1.5 px-1.5 min-w-[18px] h-4 rounded-full bg-rose-600 text-white text-[8.5px] font-black font-mono flex items-center justify-center border-2 border-[var(--card)] shadow-md animate-pulse">
                    {cart.length}
                  </span>
                ) : null}
              </button>
            </div>
          </div>

          {/* SEARCH & CATEGORIES STRIP */}
          <div className="shrink-0 px-3 py-2 bg-[var(--card)]/60 border-b border-[var(--border)] space-y-1.5 relative z-30">
            {/* Full-width Search Bar with Power Shorthand & Predictive Bill-Ready Autocomplete */}
            <div className="relative w-full">
              <div className="relative flex items-center w-full pl-3 pr-2 py-1 rounded-xl bg-[var(--background)] border border-[var(--border)] focus-within:border-[var(--primary)] focus-within:ring-2 focus-within:ring-[var(--primary)]/20 transition-all">
                <Search className="text-[var(--primary)] opacity-70 shrink-0 mr-1.5" size={15} />

                {/* Shorthand Mode Badge Indicator inside search bar */}
                {parsedSearch.mode === 'multiplier' && parsedSearch.quantity && (
                  <span className="px-1.5 py-0.5 rounded bg-[var(--primary)] text-white text-[8px] font-black font-mono shrink-0 mr-1.5 shadow-xs flex items-center gap-0.5 select-none animate-fadeIn">
                    <span>⚡ Qty: {parsedSearch.quantity}</span>
                  </span>
                )}
                {parsedSearch.mode === 'weight_fraction' && parsedSearch.quantity && (
                  <span className="px-1.5 py-0.5 rounded bg-emerald-600 text-white text-[8px] font-black font-mono shrink-0 mr-1.5 shadow-xs flex items-center gap-0.5 select-none animate-fadeIn">
                    <Scale size={9} />
                    <span>{parsedSearch.quantity >= 1 ? `${parsedSearch.quantity} kg` : `${parsedSearch.quantity * 1000}g`}</span>
                  </span>
                )}
                {parsedSearch.mode === 'target_budget' && parsedSearch.targetPrice && (
                  <span className="px-1.5 py-0.5 rounded bg-amber-600 text-white text-[8px] font-black font-mono shrink-0 mr-1.5 shadow-xs flex items-center gap-0.5 select-none animate-fadeIn">
                    <IndianRupee size={9} />
                    <span>Target: ₹{parsedSearch.targetPrice}</span>
                  </span>
                )}

                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setActivePredictionIndex(-1);
                  }}
                  onFocus={() => setIsSearchFocused(true)}
                  onBlur={() => {
                    setTimeout(() => setIsSearchFocused(false), 250);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'ArrowDown') {
                      e.preventDefault();
                      setActivePredictionIndex(prev => 
                        prev < filteredAndSortedItems.length - 1 ? prev + 1 : 0
                      );
                    } else if (e.key === 'ArrowUp') {
                      e.preventDefault();
                      setActivePredictionIndex(prev => 
                        prev > 0 ? prev - 1 : filteredAndSortedItems.length - 1
                      );
                    } else if (e.key === 'Enter') {
                      if (filteredAndSortedItems.length > 0) {
                        e.preventDefault();
                        const selectedItem = (activePredictionIndex >= 0 && activePredictionIndex < filteredAndSortedItems.length)
                          ? filteredAndSortedItems[activePredictionIndex]
                          : filteredAndSortedItems[0];
                        const itemPrice = billingMode === 'wholesale' ? (selectedItem.wholesalePrice || selectedItem.retailPrice) : selectedItem.retailPrice;
                        
                        let targetQty = 1;
                        if (parsedSearch.mode === 'target_budget' && parsedSearch.targetPrice) {
                          targetQty = calculateWeightFromAmount(parsedSearch.targetPrice, itemPrice || 1, 3);
                        } else if (parsedSearch.quantity) {
                          targetQty = parsedSearch.quantity;
                        }

                        onAddToCart(selectedItem, undefined, targetQty, parsedSearch.mode !== 'plain');
                        setSearchQuery('');
                        setIsSearchFocused(false);
                      }
                    } else if (e.key === 'Escape') {
                      setIsSearchFocused(false);
                      e.currentTarget.blur();
                    }
                  }}
                  placeholder={
                    parsedSearch.mode !== 'plain'
                      ? "Item name (e.g. kaju, almond)..."
                      : cleanAndValidateText("Search products by name, barcode, or category (e.g. '1.5 kaju' or '₹100 almond')...", currentLang, settings)
                  }
                  className="w-full bg-transparent border-none text-xs text-[var(--foreground)] font-bold placeholder:text-[var(--foreground)]/40 outline-none"
                  autoFocus
                />

                {/* Clear search button */}
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setActivePredictionIndex(-1);
                    }}
                    className="text-[var(--foreground)]/40 hover:text-[var(--foreground)] p-0.5 rounded cursor-pointer mr-1"
                    title="Clear search"
                  >
                    <X size={13} />
                  </button>
                )}

                {/* Voice dictation mic button */}
                <button
                  type="button"
                  onClick={handleVoiceSearch}
                  className={cn(
                    "p-1 rounded-lg text-xs flex items-center justify-center shrink-0 transition-all cursor-pointer",
                    isListening 
                      ? "bg-red-500 text-white animate-pulse" 
                      : "bg-[var(--foreground)]/5 hover:bg-[var(--foreground)]/10 text-[var(--foreground)]/50 hover:text-[var(--foreground)]"
                  )}
                  title="Voice Search dictation"
                >
                  {isListening ? <MicOff size={12} /> : <Mic size={12} />}
                </button>
              </div>

              {/* Real-time Predictive Search & Shorthand Dropdown inside Modal */}
              <AnimatePresence>
                {searchQuery.trim().length > 0 && isSearchFocused && (
                  <motion.div
                    initial={{ opacity: 0, y: 6, scale: 0.99 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 4, scale: 0.99 }}
                    transition={{ duration: 0.15 }}
                    onMouseDown={(e) => {
                      // Prevent closing dropdown when clicking inner elements
                      e.preventDefault();
                    }}
                    className="absolute left-0 right-0 top-full mt-1.5 z-50 overflow-hidden bg-[var(--card)] text-[var(--foreground)] border border-[var(--border)] rounded-2xl shadow-2xl ring-1 ring-black/10 dark:ring-white/10"
                  >
                    <div className="p-2 border-b border-[var(--border)] bg-[var(--foreground)]/[0.03] flex items-center justify-between">
                      <span className="text-[9.5px] font-black uppercase tracking-wider text-[var(--foreground)]/70 flex items-center gap-1.5 font-mono">
                        <Sparkles size={11} className="text-[var(--primary)] animate-pulse" />
                        Matches ({filteredAndSortedItems.length}):
                        {parsedSearch.mode !== 'plain' && (
                          <span className="text-[7.5px] px-1.5 py-0.2 rounded bg-[var(--primary)]/15 text-[var(--primary)] font-bold">
                            {parsedSearch.mode === 'target_budget' ? `Budget ₹${parsedSearch.targetPrice}` : `Qty ${parsedSearch.quantity}`}
                          </span>
                        )}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[8.5px] font-extrabold text-[var(--foreground)]/50 hidden sm:inline">
                          Press Enter to add • ↑↓ navigate • Esc to dismiss
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setSearchQuery('');
                            setIsSearchFocused(false);
                          }}
                          className="text-[8px] font-black text-rose-500 uppercase hover:underline cursor-pointer"
                        >
                          Close ×
                        </button>
                      </div>
                    </div>

                    <div className="max-h-72 overflow-y-auto custom-scrollbar divide-y divide-[var(--border)]/60">
                      {filteredAndSortedItems.length === 0 ? (
                        <div className="p-5 text-xs text-[var(--foreground)]/60 text-center font-bold">
                          No products match "{searchQuery}".
                        </div>
                      ) : (
                        filteredAndSortedItems.slice(0, 10).map((item, idx) => {
                          const trs = item.translations || { en: item.name || '', hi: '', mr: '', 'hi-en': '' };
                          const displayName = trs[currentLang] || trs.en || item.name;
                          const isQtyLow = item.quantity <= (item.minStockLevel || settings?.minStockLevel || 10);
                          const isQtyOut = item.quantity <= 0;
                          const itemPrice = billingMode === 'wholesale' ? (item.wholesalePrice || item.retailPrice) : item.retailPrice;
                          const isSelected = activePredictionIndex === idx;
                          const cartQty = cartMap.get(item.id) || 0;

                          // Compute effective quantity and price badge helper
                          let effectiveAddQty = 1;
                          let helperPill = '';

                          if (parsedSearch.mode === 'target_budget' && parsedSearch.targetPrice) {
                            effectiveAddQty = calculateWeightFromAmount(parsedSearch.targetPrice, itemPrice || 1, 3);
                            helperPill = `₹${parsedSearch.targetPrice} = ${effectiveAddQty} ${item.unit || 'kg'}`;
                          } else if (parsedSearch.quantity) {
                            effectiveAddQty = parsedSearch.quantity;
                            helperPill = `${effectiveAddQty} ${item.unit || 'kg'} = ₹${formatNumber(effectiveAddQty * itemPrice, precision)}`;
                          }

                          return (
                            <div
                              key={`catalog-search-match-${item.id}-${idx}`}
                              onMouseEnter={() => setActivePredictionIndex(idx)}
                              className={cn(
                                "px-3 py-2 flex items-center justify-between gap-2 transition-all cursor-pointer select-none",
                                isSelected 
                                  ? "bg-[var(--primary)]/15 border-l-4 border-[var(--primary)] pl-2" 
                                  : "hover:bg-[var(--foreground)]/[0.04]"
                              )}
                              onClick={(e) => {
                                onAddToCart(item, e, effectiveAddQty, parsedSearch.mode !== 'plain');
                                if (parsedSearch.mode !== 'plain') {
                                  setSearchQuery('');
                                  setIsSearchFocused(false);
                                }
                              }}
                            >
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="text-xs font-black text-[var(--foreground)] truncate max-w-[200px]">
                                    {displayName}
                                  </span>
                                  <span className="text-[9px] px-1.5 py-0.2 rounded font-black uppercase bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-mono">
                                    ₹{formatNumber(itemPrice, precision)} /{item.unit || 'pcs'}
                                  </span>
                                  {helperPill && (
                                    <span className="text-[9px] px-1.5 py-0.2 rounded font-black uppercase bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 font-mono animate-pulse">
                                      ⚡ {helperPill}
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-1.5 mt-0.5 text-[9px] text-[var(--foreground)]/60 font-semibold">
                                  <span>{categories.find(c => c.id === item.categoryId)?.name || 'General'}</span>
                                  <span>•</span>
                                  <span className={isQtyOut ? 'text-rose-500 font-bold' : isQtyLow ? 'text-amber-500 font-bold' : 'text-emerald-500 font-bold'}>
                                    {isQtyOut ? 'Out of Stock' : `Stock: ${item.quantity}`}
                                  </span>
                                  {cartQty > 0 && (
                                    <span className="text-[var(--primary)] font-black">
                                      • In Bill: {cartQty}
                                    </span>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center gap-1 shrink-0">
                                {/* Quick Weight Presets Popover */}
                                <QuickWeightPresets
                                  currentQty={cartQty > 0 ? cartQty : 1}
                                  unitPrice={itemPrice}
                                  unit={item.unit || 'Pcs'}
                                  precision={precision}
                                  onSelectQty={(qty) => {
                                    onAddToCart(item, undefined, qty, true);
                                    if (parsedSearch.mode !== 'plain') {
                                      setSearchQuery('');
                                      setIsSearchFocused(false);
                                    }
                                  }}
                                  compact={true}
                                  align="right"
                                />

                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onAddToCart(item, e, effectiveAddQty, parsedSearch.mode !== 'plain');
                                    if (parsedSearch.mode !== 'plain') {
                                      setSearchQuery('');
                                      setIsSearchFocused(false);
                                    }
                                  }}
                                  className="px-2 py-1 rounded-lg bg-[var(--primary)] hover:bg-[var(--primary)]/90 text-white text-[9px] font-black uppercase shadow-xs flex items-center gap-0.5 cursor-pointer active:scale-95 transition-transform"
                                >
                                  <Plus size={10} strokeWidth={3} />
                                  <span>{parsedSearch.mode !== 'plain' ? `Add ${effectiveAddQty}` : 'Add'}</span>
                                </button>
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

            {/* Category Filter Chips */}
            <div className="flex gap-1 overflow-x-auto pb-0.5 select-none no-scrollbar">
              <button
                type="button"
                onClick={() => setSelectedCategory(null)}
                className={cn(
                  "px-2.5 py-0.5 text-[8px] font-black uppercase tracking-wider rounded-lg border transition-all cursor-pointer whitespace-nowrap",
                  selectedCategory === null 
                    ? "bg-[var(--primary)] text-white border-[var(--primary)] shadow-sm" 
                    : "bg-[var(--background)] text-[var(--foreground)]/60 border-[var(--border)] hover:text-[var(--foreground)] hover:border-[var(--primary)]/30"
                )}
              >
                All ({items.length})
              </button>
              {categories.map((cat, idx) => {
                const catCount = items.filter(i => i.categoryId === cat.id).length;
                return (
                  <button
                    type="button"
                    key={`${cat.id || 'cat'}-${idx}`}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={cn(
                      "px-2.5 py-0.5 text-[8px] font-black uppercase tracking-wider rounded-lg border transition-all cursor-pointer whitespace-nowrap flex items-center gap-1",
                      selectedCategory === cat.id 
                        ? "bg-[var(--primary)] text-white border-[var(--primary)] shadow-sm" 
                        : "bg-[var(--background)] text-[var(--foreground)]/60 border-[var(--border)] hover:text-[var(--foreground)] hover:border-[var(--primary)]/30"
                    )}
                  >
                    <span>{cat.icon}</span>
                    <span>{cat.name}</span>
                    <span className="opacity-60 text-[7px]">({catCount})</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* MAIN CATALOG BODY: FLEX ROW WITH ITEMS GRID (LEFT) AND LIVE INVOICE TERMINAL (RIGHT) */}
          <div className="flex-1 flex flex-col lg:flex-row overflow-hidden min-h-0 relative">
            {/* Left Column: Items Catalog Multi-Window Grid */}
            <div className="flex-1 overflow-y-auto p-2 sm:p-3 custom-scrollbar">
              {filteredAndSortedItems.length === 0 ? (
                <div className="h-full min-h-[260px] flex flex-col items-center justify-center text-center p-6 border border-dashed border-[var(--border)] rounded-2xl">
                  <div className="h-11 w-11 rounded-full bg-[var(--foreground)]/5 flex items-center justify-center text-[var(--foreground)]/40 mb-2.5">
                    <Search size={20} />
                  </div>
                  <h3 className="text-xs sm:text-sm font-black uppercase text-[var(--foreground)] mb-1">
                    No matching products found
                  </h3>
                  <p className="text-[11px] text-[var(--foreground)]/50 max-w-sm mb-3">
                    {searchQuery ? `No items matched "${searchQuery}". Try different keywords or reset filters.` : "No items match your active filters."}
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery('');
                        setSelectedCategory(null);
                      }}
                      className="px-3.5 py-1.5 rounded-xl bg-[var(--foreground)]/5 hover:bg-[var(--foreground)]/10 text-[11px] font-bold uppercase transition-colors cursor-pointer"
                    >
                      Clear Filters
                    </button>
                    {onOpenManualModal && (
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onOpenManualModal();
                        }}
                        className="px-3.5 py-1.5 rounded-xl bg-[var(--primary)] text-white text-[11px] font-black uppercase transition-all shadow-md cursor-pointer"
                      >
                        + Add Custom Item
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className={cn(
                  "grid gap-1.5 sm:gap-2",
                  showDesktopLiveInvoice 
                    ? "grid-cols-2 min-[440px]:grid-cols-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6"
                    : "grid-cols-2 min-[440px]:grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-8"
                )}>
                  {filteredAndSortedItems.map((item, idx) => {
                    const qtyLimitValue = item.quantity;
                    const minStock = item.minStockLevel ?? settings?.minStockLevel ?? 10;
                    const isLow = qtyLimitValue <= minStock && qtyLimitValue > 0;
                    const isOut = qtyLimitValue <= 0;
                    const activePrice = billingMode === 'wholesale' ? (item.wholesalePrice || item.retailPrice) : item.retailPrice;
                    const activePriceUnit = billingMode === 'wholesale' ? (item.wholesalePriceUnit || item.unit || 'pcs') : (item.retailPriceUnit || item.unit || 'pcs');
                    
                    const trs = item.translations || { en: item.name || '', hi: '', mr: '', 'hi-en': '' };
                    const primaryName = trs[currentLang] || trs.en || item.name;
                    const catName = categories.find(c => c.id === item.categoryId)?.name || 'General';

                    const countInCart = cartMap.get(item.id) || 0;

                    return (
                      <motion.div
                        key={`catalog-item-${item.id || 'item'}-${idx}`}
                        onPointerDown={() => handlePointerDown(item)}
                        onPointerUp={handlePointerUpOrCancel}
                        onPointerLeave={handlePointerUpOrCancel}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          setHoldModalItem(item);
                        }}
                        onClick={(e) => handleItemCardClick(item, e)}
                        whileHover={{ 
                          y: -2, 
                          scale: 1.02, 
                          borderColor: "var(--primary)",
                          boxShadow: "0 8px 18px -6px rgba(0, 0, 0, 0.15), 0 0 10px 2px var(--primary)"
                        }}
                        whileTap={{ scale: 0.96 }}
                        transition={{ type: "spring", stiffness: 450, damping: 22 }}
                        className={cn(
                          "p-2 rounded-xl bg-[var(--card)] border cursor-pointer active:scale-95 transition-all text-left flex flex-col justify-between h-[5.2rem] group relative overflow-hidden select-none",
                          countInCart > 0
                            ? "border-[var(--primary)] ring-2 ring-[var(--primary)]/25 bg-[var(--primary)]/[0.03]"
                            : isOut 
                              ? "border-rose-500/20 bg-rose-500/[0.02]" 
                              : isLow 
                                ? "border-amber-500/20 bg-amber-500/[0.01]" 
                                : "border-[var(--border)]"
                        )}
                        title="Tap to add | Press & Hold for weight presets"
                      >
                        {/* Top Header inside Window Card */}
                        <div>
                          <div className="flex items-start justify-between gap-1">
                            <h4 className="font-extrabold text-[10px] sm:text-[10.5px] text-[var(--foreground)] truncate uppercase group-hover:text-[var(--primary)] flex-1 leading-tight">
                              {primaryName}
                            </h4>
                            {countInCart > 0 && (
                              <span className="px-1 py-0.2 rounded-full bg-[var(--primary)] text-white text-[7px] font-black shrink-0 shadow-xs leading-tight">
                                x{countInCart}
                              </span>
                            )}
                          </div>
                          
                          <div className="flex items-center justify-between text-[7px] font-bold text-[var(--foreground)]/50 uppercase tracking-wide mt-0.5">
                            <span className="truncate max-w-[65px] sm:max-w-[80px]">
                              {catName}
                            </span>
                            <span className="lowercase shrink-0">
                              ({item.unit || 'pcs'})
                            </span>
                          </div>
                        </div>

                        {/* Bottom Pricing & Action Section inside Window Card */}
                        <div className="flex items-end justify-between w-full mt-0.5 z-20">
                          <div className="flex flex-col">
                            <span className="text-[10.5px] sm:text-[11px] font-mono font-black text-[var(--foreground)] leading-none">
                              ₹{formatNumber(activePrice, settings?.pricePrecision || 0)}
                            </span>
                            <span className="text-[6.5px] font-black opacity-50 lowercase mt-0.5">
                              per {activePriceUnit}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-0.5">
                            {isOut ? (
                              <span className="px-1 py-0.2 rounded text-[6px] font-black uppercase bg-rose-500/15 text-rose-600">
                                Out
                              </span>
                            ) : isLow ? (
                              <span className="px-1 py-0.2 rounded text-[6px] font-black uppercase bg-amber-500/15 text-amber-600">
                                Low
                              </span>
                            ) : null}

                            {onPeek && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onPeek({ type: 'item', payload: item });
                                }}
                                className="h-4.5 w-4.5 rounded bg-[var(--foreground)]/5 border border-[var(--border)] hover:bg-[var(--primary)] hover:text-white transition-all flex items-center justify-center text-[var(--foreground)]/55 cursor-pointer"
                                title="Quick View Details"
                              >
                                <Eye size={9} />
                              </button>
                            )}

                            {countInCart > 0 ? (
                              <div 
                                className="flex items-center gap-0.5 bg-[var(--primary)] text-white px-1 py-0.5 rounded-md shadow-xs"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {onUpdateCartQuantity && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onUpdateCartQuantity(item.id, countInCart - 1);
                                    }}
                                    className="h-3.5 w-3.5 rounded hover:bg-black/20 flex items-center justify-center transition-colors cursor-pointer"
                                  >
                                    <Minus size={7} />
                                  </button>
                                )}
                                <span className="text-[8px] font-black font-mono px-0.5">
                                  {countInCart}
                                </span>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onAddToCart(item, e);
                                  }}
                                  className="h-3.5 w-3.5 rounded hover:bg-black/20 flex items-center justify-center transition-colors cursor-pointer"
                                >
                                  <Plus size={7} />
                                </button>
                              </div>
                            ) : (
                              <div className="h-4.5 px-1.5 rounded-md bg-[var(--primary)]/10 text-[var(--primary)] border border-[var(--primary)]/20 flex items-center justify-center text-[7.5px] font-black uppercase group-hover:bg-[var(--primary)] group-hover:text-white transition-colors">
                                + Add
                              </div>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Right Column: Live Invoice Preview Terminal (Visible on Desktop alongside catalog) */}
            {showDesktopLiveInvoice && (
              <div className="hidden lg:flex w-80 xl:w-[350px] shrink-0 border-l border-[var(--border)] bg-[var(--card)]/60 p-2.5 sm:p-3 pt-1.5 flex-col justify-between overflow-hidden font-sans">
                {/* Header with Theme Switcher - Clean Low-Profile Top Bar */}
                <div className="flex items-center justify-between border-b border-[var(--border)] pb-1.5 mb-1 select-none shrink-0">
                  <div className="flex items-center gap-1 text-emerald-500 font-extrabold uppercase text-[8px] tracking-wider">
                    <ReceiptText size={12} className="animate-pulse" />
                    <span>Live Invoice Terminal</span>
                  </div>
                  <div className="flex bg-[var(--foreground)]/5 p-0.5 rounded-lg border border-[var(--border)] text-[6.5px] font-black uppercase gap-1">
                    <button
                      type="button"
                      onClick={() => setLivePreviewTheme('thermal')}
                      className={cn(
                        "px-2 py-0.5 rounded transition-all cursor-pointer leading-none",
                        livePreviewTheme === 'thermal' ? "bg-[var(--primary)] text-white" : "text-[var(--foreground)]/50"
                      )}
                    >
                      Thermal Roll
                    </button>
                    <button
                      type="button"
                      onClick={() => setLivePreviewTheme('laser')}
                      className={cn(
                        "px-2 py-0.5 rounded transition-all cursor-pointer leading-none",
                        livePreviewTheme === 'laser' ? "bg-[var(--primary)] text-white" : "text-[var(--foreground)]/50"
                      )}
                    >
                      A4 Laser
                    </button>
                  </div>
                </div>

                {/* Live Invoice Paper Scroll Area - Reduced Top Edge & Clean Breathing Room */}
                <div className="flex-1 overflow-y-auto no-scrollbar py-1 space-y-2 text-left">
                  <div className={cn(
                    "transition-all duration-300 p-2.5 sm:p-3 border border-[var(--border)] rounded-xl relative overflow-hidden text-left",
                    livePreviewTheme === 'thermal' 
                      ? "bg-zinc-50 text-zinc-950 dark:bg-zinc-100 dark:text-zinc-900 font-mono text-[8.5px] border-dashed border-zinc-300 shadow-inner"
                      : "bg-white text-zinc-800 font-sans text-xs shadow-md border-zinc-200"
                  )}>
                    {/* Store Header */}
                    <div className="text-center space-y-0.5 pb-2 border-b border-dashed border-zinc-300 select-none">
                      <h3 className={cn(
                        "font-black tracking-tight uppercase leading-none text-zinc-900 mb-0.5",
                        livePreviewTheme === 'laser' ? "text-xs text-[var(--primary)]" : "text-[10px]"
                      )}>
                        {settings?.storeName || 'TS PRICE MANAGER'}
                      </h3>
                      <p className="opacity-70 text-[6.5px] uppercase tracking-wider font-extrabold text-zinc-600 leading-tight">
                        {settings?.storeAddress || '101, Business Hub, Terminal C'}
                      </p>
                      {settings?.storePhone && (
                        <p className="opacity-70 text-[6.5px] font-mono text-zinc-600 leading-tight">
                          Phone: {settings.storePhone}
                        </p>
                      )}
                    </div>

                    {/* Metadata */}
                    <div className="py-1 border-b border-dashed border-zinc-200 grid grid-cols-2 gap-1 text-[6.5px] font-bold text-zinc-600">
                      <div>
                        <p>BILL#: <span className="text-zinc-950 font-black">#DRAFT-{Date.now().toString().slice(-4)}</span></p>
                        <p>PAYMENT: <span className="text-zinc-950 font-black uppercase text-amber-600">{paymentMethod}</span></p>
                      </div>
                      <div className="text-right">
                        <p>DATE: {new Date().toLocaleDateString()}</p>
                        <p>TIME: {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                      </div>
                    </div>

                    {/* Customer Info */}
                    {(customerName || customerPhone) && (
                      <div className="py-1 px-1.5 bg-zinc-50 border border-zinc-200 rounded-lg text-[7.5px] text-zinc-700 my-1">
                        <p className="font-extrabold text-[6.5px] uppercase opacity-50 tracking-wider text-zinc-600">Customer Details</p>
                        <p className="font-black text-zinc-950">{customerName || 'Walk-in Customer'}</p>
                        {customerPhone && <p className="font-semibold text-zinc-600 font-mono">{customerPhone}</p>}
                      </div>
                    )}

                    {/* Line Items Table */}
                    <div className="pt-1">
                      <div className="grid grid-cols-12 font-black uppercase border-b pb-0.5 mb-0.5 text-[6.5px] tracking-wide text-zinc-500">
                        <span className="col-span-6">Item Name</span>
                        <span className="col-span-2 text-center">Qty</span>
                        <span className="col-span-4 text-right">Total</span>
                      </div>
                      <div className="space-y-0.5 max-h-[18vh] overflow-y-auto no-scrollbar">
                        {cart.length === 0 ? (
                          <div className="py-4 text-center text-zinc-400 font-mono text-[8px]">
                            No items added yet. Click any item on the left to add!
                          </div>
                        ) : (
                          cart.map((ci, ciIdx) => (
                            <div key={`catalog-desk-receipt-${ci.id || 'ci'}-${ciIdx}`} className="grid grid-cols-12 text-[7.5px] font-sans text-zinc-800 border-b border-dashed border-zinc-100 pb-0.5">
                              <span className="col-span-6 font-bold truncate text-zinc-900">{ci.name}</span>
                              <span className="col-span-2 text-center font-mono opacity-80 text-zinc-700">{ci.quantity} {ci.unit || 'Pcs'}</span>
                              <span className="col-span-4 text-right font-black font-mono text-zinc-950">₹{formatNumber(ci.price * ci.quantity, precision)}</span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    {/* Summary calculations */}
                    <div className="pt-1.5 border-t border-dashed border-zinc-300 space-y-0.5 mt-0.5">
                      <div className="flex justify-between items-center text-[7.5px] text-zinc-600 font-bold">
                        <span>Total ({cart.length} {cart.length === 1 ? 'item' : 'items'}):</span>
                        <span className="font-mono text-zinc-900">Subtotal: ₹{formatNumber(subtotal, precision)}</span>
                      </div>
                      {discountPercent > 0 && (
                        <div className="flex justify-between items-center text-[7.5px] font-bold text-emerald-600">
                          <span>Discount ({discountPercent}%):</span>
                          <span className="font-mono text-emerald-600">-₹{discountAmount.toFixed(2)}</span>
                        </div>
                      )}
                      {taxPercent > 0 && (
                        <div className="flex justify-between items-center text-[7.5px] font-semibold text-zinc-600">
                          <span>GST/Tax ({taxPercent}%):</span>
                          <span className="font-mono text-zinc-900">+₹{taxAmount.toFixed(2)}</span>
                        </div>
                      )}
                      <div className="flex justify-between items-center bg-zinc-950 text-white px-2 py-1.5 rounded-lg mt-1 border border-zinc-800 shadow-xs">
                        <span className="text-[7px] font-black tracking-wider text-amber-500 uppercase">PAYABLE GRAND TOTAL</span>
                        <span className="text-xs font-black font-mono text-white">₹{formatNumber(totalVal, precision)}</span>
                      </div>
                    </div>

                    {/* Barcode Mock */}
                    <div className="pt-1.5 flex flex-col items-center select-none opacity-40">
                      <div className="flex items-center gap-[1px] h-3">
                        {[1,2,1,3,1,1,2,3,1,2,1,1,2,1,2,1,1,3,1,1].map((w, i) => (
                          <div key={`desk-barcode-bar-${i}`} className="bg-zinc-800 h-full" style={{ width: `${w}px` }} />
                        ))}
                      </div>
                      <p className="text-[5.5px] font-mono tracking-[0.25em] text-zinc-550 mt-0.5 uppercase">* TS-PM-DRAFT *</p>
                    </div>
                  </div>
                </div>

                {/* Actions Footer inside sidebar */}
                <div className="pt-1.5 border-t border-[var(--border)] flex gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={downloadLivePDF}
                    className="flex-1 py-1 text-[7.5px] font-black uppercase tracking-wider bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:hover:bg-zinc-200 dark:text-black rounded-lg border border-[var(--border)] flex items-center justify-center gap-1 cursor-pointer select-none transition-all"
                  >
                    <Download size={9} />
                    <span>Download PDF</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (onCheckout) {
                        onClose();
                        onCheckout();
                      } else {
                        onClose();
                      }
                    }}
                    className="flex-1 py-1 text-[7.5px] font-black uppercase tracking-wider bg-[var(--primary)] hover:opacity-90 text-white rounded-lg flex items-center justify-center gap-1 cursor-pointer select-none transition-all shadow-xs"
                  >
                    <Printer size={9} />
                    <span>Spool Checkout</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* DOCKED FOOTER BAR: ACTIVE BILL & VIEW DRAFT */}
          <div className="shrink-0 px-3.5 py-2.5 sm:px-5 sm:py-3 bg-zinc-950 text-white border-t border-zinc-800 shadow-xl flex items-center justify-between gap-3 select-none z-20">
            {/* Active Bill Info */}
            <div className="text-left pl-1 sm:pl-2">
              <span className="text-[8px] sm:text-[9px] font-black uppercase text-amber-500 tracking-wider leading-none block">
                Active Bill
              </span>
              <p className="text-xs sm:text-sm font-black font-mono leading-none mt-1 text-white">
                ₹{formatNumber(totalVal, precision)} ({cart.length} {cart.length === 1 ? 'item' : 'items'})
              </p>
            </div>

            {/* Action Buttons: View Draft & Done */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsDraftPreviewOpen(true)}
                className="px-4 py-2 bg-[var(--primary)] text-white text-[9px] sm:text-[10px] font-black uppercase rounded-full tracking-widest shadow-md transition-all hover:brightness-110 active:scale-95 flex items-center gap-1.5 shrink-0 cursor-pointer select-none border border-white/20"
                title="View Draft Invoice (लाइव कच्चा बिल देखें)"
              >
                <Eye size={12} />
                <span>View Draft</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-2 rounded-full bg-white/10 hover:bg-white/20 text-white active:scale-95 transition-all text-[9px] sm:text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 cursor-pointer border border-white/10"
              >
                <Check size={12} strokeWidth={2.5} />
                <span className="hidden xs:inline">Done</span>
              </button>
            </div>
          </div>

          {/* LIVE INVOICE PREVIEW POPUP DRAWER (Exact same as Billing Dashboard) */}
          <AnimatePresence>
            {isDraftPreviewOpen && (
              <div key="draft-preview-modal-root" className="fixed inset-0 z-[160] flex items-end sm:items-center justify-center p-0 sm:p-4">
                {/* Backdrop */}
                <motion.div
                  key="draft-preview-backdrop"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.7 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setIsDraftPreviewOpen(false)}
                  className="fixed inset-0 bg-black/85 backdrop-blur-xs"
                />

                {/* Slide-Up / Centered Invoice Modal Container */}
                <motion.div
                  key="draft-preview-container"
                  initial={{ y: "100%", opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: "100%", opacity: 0 }}
                  transition={{ type: "spring", damping: 25, stiffness: 220 }}
                  className="relative z-10 w-full max-w-lg bg-[var(--card)] rounded-t-[2.5rem] sm:rounded-3xl border-t-2 sm:border-2 border-[var(--primary)] p-4 max-h-[88vh] overflow-y-auto shadow-2xl flex flex-col justify-between text-left"
                >
                  <div 
                    className="w-12 h-1 bg-[var(--foreground)]/15 rounded-full mx-auto mb-3 cursor-pointer animate-pulse sm:hidden" 
                    onClick={() => setIsDraftPreviewOpen(false)} 
                  />

                  {/* Header with Title & Thermal/Laser Mode */}
                  <div className="space-y-4 font-sans p-1">
                    <div className="flex items-center justify-between pb-2 border-b border-[var(--border)] select-none">
                      <div className="flex items-center gap-1.5">
                        <ReceiptText size={14} className="text-emerald-500 animate-pulse" />
                        <span className="text-emerald-500 font-extrabold uppercase text-[9px] sm:text-[10px] tracking-wider">
                          Live Invoice Preview
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex bg-[var(--foreground)]/5 p-0.5 rounded-lg border border-[var(--border)] text-[7.5px] font-black uppercase gap-1">
                          <button
                            type="button"
                            onClick={() => setLivePreviewTheme('thermal')}
                            className={cn(
                              "px-2 py-0.5 rounded tracking-wide leading-none transition-all cursor-pointer",
                              livePreviewTheme === 'thermal' ? "bg-[var(--primary)] text-white" : "text-[var(--foreground)]/50"
                            )}
                          >
                            Thermal Roll
                          </button>
                          <button
                            type="button"
                            onClick={() => setLivePreviewTheme('laser')}
                            className={cn(
                              "px-2 py-0.5 rounded tracking-wide leading-none transition-all cursor-pointer",
                              livePreviewTheme === 'laser' ? "bg-[var(--primary)] text-white" : "text-[var(--foreground)]/50"
                            )}
                          >
                            A4 Laser
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => setIsDraftPreviewOpen(false)}
                          className="h-7 w-7 rounded-xl bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                          title="Close Preview"
                        >
                          <X size={14} strokeWidth={2.5} />
                        </button>
                      </div>
                    </div>

                    {/* Invoice Paper Canvas */}
                    <div className={cn(
                      "transition-all duration-300 p-4 border border-[var(--border)] rounded-2xl relative overflow-hidden text-left",
                      livePreviewTheme === 'thermal' 
                        ? "bg-zinc-50 text-zinc-950 font-mono text-[9.5px] border-dashed border-zinc-300 shadow-inner"
                        : "bg-white text-zinc-800 font-sans text-xs border-zinc-200 shadow-md"
                    )}>
                      {/* Store Header Info */}
                      <div className="text-center space-y-1 pb-3 border-b border-dashed border-zinc-300 select-none">
                        <h3 className="font-black uppercase leading-none text-zinc-900 text-xs mb-1">
                          {settings?.storeName || 'TS PRICE MANAGER'}
                        </h3>
                        <p className="opacity-70 text-[7px] uppercase tracking-wider font-extrabold text-zinc-500">
                          {settings?.storeAddress || '101, Business Hub, Terminal C'}
                        </p>
                        {settings?.storePhone && (
                          <p className="opacity-70 text-[7px] font-mono text-zinc-500">
                            Phone: {settings.storePhone}
                          </p>
                        )}
                      </div>

                      {/* Bill Meta */}
                      <div className="py-2 border-b border-dashed border-zinc-200 grid grid-cols-2 gap-1 text-[7px] font-bold text-zinc-600">
                        <div>
                          <p>BILL#: <span className="text-zinc-950 font-black">#DRAFT-{Date.now().toString().slice(-4)}</span></p>
                          <p>PAYMENT: <span className="text-zinc-950 font-black uppercase text-amber-600">{paymentMethod}</span></p>
                        </div>
                        <div className="text-right">
                          <p>DATE: {new Date().toLocaleDateString()}</p>
                          <p>TIME: {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                        </div>
                      </div>

                      {/* Customer Info */}
                      {(customerName || customerPhone) && (
                        <div className="py-1.5 bg-zinc-100 border border-zinc-200 p-2 rounded-lg text-[8px] text-zinc-700 my-2">
                          <p className="font-extrabold text-[7px] uppercase opacity-50 tracking-wider mb-0.5 text-zinc-600">Customer Details</p>
                          <p className="font-black text-zinc-950">{customerName || 'Walk-in Customer'}</p>
                          {customerPhone && <p className="font-semibold text-zinc-600 font-mono">{customerPhone}</p>}
                        </div>
                      )}

                      {/* Line Items Table */}
                      <div className="pt-2">
                        <div className="grid grid-cols-12 font-black uppercase border-b pb-1 mb-1 text-[7px] tracking-wide text-zinc-500">
                          <span className="col-span-6">Item Name</span>
                          <span className="col-span-2 text-center">Qty</span>
                          <span className="col-span-4 text-right">Total</span>
                        </div>
                        <div className="space-y-1.5 max-h-[22vh] overflow-y-auto no-scrollbar">
                          {cart.length === 0 ? (
                            <div className="py-6 text-center text-zinc-400 font-mono text-[9px]">
                              No items in draft bill yet.
                            </div>
                          ) : (
                            cart.map((ci, ciIdx) => (
                              <div key={`catalog-receipt-item-${ci.id || 'ci'}-${ciIdx}`} className="grid grid-cols-12 text-[8.5px] font-sans text-zinc-800 border-b border-dashed border-zinc-100 pb-1">
                                <span className="col-span-6 font-bold truncate">{ci.name}</span>
                                <span className="col-span-2 text-center font-mono">{ci.quantity} {ci.unit || 'Pcs'}</span>
                                <span className="col-span-4 text-right font-black font-mono">₹{formatNumber(ci.price * ci.quantity, precision)}</span>
                              </div>
                            ))
                          )}
                        </div>
                      </div>

                      {/* Total Calculations */}
                      <div className="pt-2 border-t border-dashed border-zinc-300 space-y-1 mt-1">
                        <div className="flex justify-between items-center text-[8px] text-zinc-650 font-bold">
                          <span>Total ({cart.length} {cart.length === 1 ? 'item' : 'items'}):</span>
                          <span className="font-mono">Subtotal: ₹{formatNumber(subtotal, precision)}</span>
                        </div>
                        {discountPercent > 0 && (
                          <div className="flex justify-between items-center text-[8px] font-bold text-emerald-600">
                            <span>Discount ({discountPercent}%):</span>
                            <span className="font-mono">-₹{discountAmount.toFixed(2)}</span>
                          </div>
                        )}
                        {taxPercent > 0 && (
                          <div className="flex justify-between items-center text-[8px] font-semibold text-zinc-600">
                            <span>GST/Tax ({taxPercent}%):</span>
                            <span className="font-mono">+₹{taxAmount.toFixed(2)}</span>
                          </div>
                        )}
                        <div className="flex justify-between items-center bg-zinc-950 text-white p-2.5 rounded-xl mt-1.5 border border-zinc-800 shadow-md">
                          <span className="text-[8px] font-black tracking-wider text-amber-500 uppercase">PAYABLE GRAND TOTAL</span>
                          <span className="text-sm sm:text-base font-black font-mono text-white">₹{formatNumber(totalVal, precision)}</span>
                        </div>
                      </div>

                      {/* Barcode Mock */}
                      <div className="pt-3 flex flex-col items-center select-none opacity-40">
                        <div className="flex items-center gap-[1px] h-3.5">
                          {[1,2,1,3,1,1,2,3,1,2,1,1,2,1,2,1,1,3,1,1].map((w, i) => (
                            <div key={`draft-barcode-bar-${i}`} className="bg-zinc-800 h-full" style={{ width: `${w}px` }} />
                          ))}
                        </div>
                        <p className="text-[6.5px] font-mono tracking-[0.25em] text-zinc-550 mt-1 uppercase">* TS-PM-DRAFT-INVOICE *</p>
                      </div>
                    </div>

                    {/* Action Buttons in Modal Drawer */}
                    <div className="flex gap-2 pt-1">
                      <button 
                        type="button"
                        onClick={downloadLivePDF} 
                        className="flex-1 py-2 text-[8.5px] sm:text-[9px] font-black uppercase tracking-wider bg-slate-900 hover:bg-slate-800 border border-slate-700 text-white rounded-xl cursor-pointer flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all"
                      >
                        <Download size={12} />
                        <span>Download PDF</span>
                      </button>

                      <button 
                        type="button"
                        onClick={() => {
                          setIsDraftPreviewOpen(false);
                          if (onCheckout) {
                            onClose();
                            onCheckout();
                          } else {
                            onClose();
                          }
                        }} 
                        className="flex-1 py-2 text-[8.5px] sm:text-[9px] font-black uppercase tracking-wider bg-[var(--primary)] hover:bg-[var(--primary)]/90 text-white rounded-xl cursor-pointer flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all border border-white/20"
                      >
                        <Printer size={12} />
                        <span>Return & Checkout</span>
                      </button>
                    </div>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      {/* Press & Hold Quick Weight Modal */}
      {holdModalItem && (
        <ItemHoldWeightModal
          key={`hold-item-modal-${holdModalItem.id}`}
          item={holdModalItem}
          isOpen={Boolean(holdModalItem)}
          onClose={() => setHoldModalItem(null)}
          onSelectQty={(item, qty) => {
            onAddToCart(item, undefined, qty, true);
          }}
          unitPrice={holdModalItem ? (billingMode === 'wholesale' ? (holdModalItem.wholesalePrice || holdModalItem.retailPrice) : holdModalItem.retailPrice) : 0}
          currentQty={holdModalItem ? (cartMap.get(holdModalItem.id) || 1) : 1}
          customPresets={settings?.customWeightPresets}
          precision={settings?.pricePrecision || 0}
        />
      )}
    </>
  );
};

export default AllItemsCatalogModal;
