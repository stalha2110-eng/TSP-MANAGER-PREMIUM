import React, { useState, useEffect, useRef } from 'react';
import { 
  Calculator, X, Undo, Redo, Pin, Search, Copy, Check, 
  Download, History, Tag, Landmark, RefreshCw, Layers, 
  Sparkles, CheckSquare, Plus, Minus, Trash2, Maximize2, 
  Minimize2, Move, HelpCircle, Star, ChevronLeft, ChevronRight,
  TrendingUp, Percent, DollarSign, RefreshCw as LoopIcon, PlayCircle, Clock
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn, countNumericEntries, formatItemCountLabel } from '../lib/utils';

// Types of entries in Calculation History / Favorites
interface CalcLog {
  id: string;
  formula: string;
  outcome: string;
  timestamp: string;
  isPinned: boolean;
  notes?: string;
}

// Coordinate storage type for floating position
interface FloatingPosition {
  x: number;
  y: number;
}

export default function SmartCalculator() {
  // Global visibility state (launcher is available app-wide)
  const [isOpen, setIsOpen] = useState(() => {
    const saved = localStorage.getItem('tsm_calc_is_open');
    return saved ? JSON.parse(saved) : false;
  });

  const [isMinimized, setIsMinimized] = useState(() => {
    const saved = localStorage.getItem('tsm_calc_is_minimized');
    return saved ? JSON.parse(saved) : false;
  });

  // Persists expansion and position configurations
  useEffect(() => {
    localStorage.setItem('tsm_calc_is_open', JSON.stringify(isOpen));
  }, [isOpen]);

  useEffect(() => {
    localStorage.setItem('tsm_calc_is_minimized', JSON.stringify(isMinimized));
  }, [isMinimized]);

  // Current mode layer
  // standard: Layer 1 Universal
  // business: Layer 2 Business shortcuts (Qty x Rate, Margins, Markups)
  // cashier: Layer 3 Cash handover return change assistant
  // history: Session calculations log & Pinned favourites
  const [activeLayer, setActiveLayer] = useState<'standard' | 'business' | 'cashier' | 'history'>('standard');

  // Rhythmic/Counter rapid counter mode (optimizes spacing, touch buttons, disables heavy transitions)
  const [isRapidMode, setIsRapidMode] = useState(() => {
    return localStorage.getItem('tsm_calc_rapid_mode') === 'true';
  });

  useEffect(() => {
    localStorage.setItem('tsm_calc_rapid_mode', String(isRapidMode));
  }, [isRapidMode]);

  // Coordinates dragging state for launcher & panel
  const [panelPos, setPanelPos] = useState<FloatingPosition>(() => {
    try {
      const saved = localStorage.getItem('tsm_calc_panel_pos');
      return saved ? JSON.parse(saved) : { x: window.innerWidth - 380, y: 120 };
    } catch {
      return { x: window.innerWidth - 380, y: 120 };
    }
  });

  const [badgePos, setBadgePos] = useState<FloatingPosition>(() => {
    try {
      const saved = localStorage.getItem('tsm_calc_badge_pos');
      return saved ? JSON.parse(saved) : { x: window.innerWidth - 75, y: window.innerHeight - 180 };
    } catch {
      return { x: window.innerWidth - 75, y: window.innerHeight - 180 };
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('tsm_calc_panel_pos', JSON.stringify(panelPos));
    } catch {}
  }, [panelPos]);

  useEffect(() => {
    try {
      localStorage.setItem('tsm_calc_badge_pos', JSON.stringify(badgePos));
    } catch {}
  }, [badgePos]);

  // Self-heal, reposition, and clamp coordinates to visible ports
  useEffect(() => {
    const healPositions = () => {
      const width = typeof window !== 'undefined' ? (window.innerWidth || 1024) : 1024;
      const height = typeof window !== 'undefined' ? (window.innerHeight || 768) : 768;

      setPanelPos(prev => {
        let x = prev.x;
        let y = prev.y;
        if (x < 10 || x > width - 150 || isNaN(x)) {
          x = width > 400 ? width - 380 : 10;
        }
        if (y < 10 || y > height - 100 || isNaN(y)) {
          y = 120;
        }
        return { x, y };
      });

      setBadgePos(prev => {
        let x = prev.x;
        let y = prev.y;
        if (x < 5 || x > width - 20 || isNaN(x)) {
          x = width - 75;
        }
        if (y < 5 || y > height - 20 || isNaN(y)) {
          y = height - 180;
        }
        return { x, y };
      });
    };

    healPositions();
    window.addEventListener('resize', healPositions);
    return () => window.removeEventListener('resize', healPositions);
  }, []);

  // Draggable reference containers 
  const panelRef = useRef<HTMLDivElement>(null);
  const badgeRef = useRef<HTMLDivElement>(null);
  const isDraggingPanel = useRef(false);
  const isDraggingBadge = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });

  // Handle panel position dragging
  const handlePanelDragStart = (e: React.MouseEvent<HTMLDivElement>) => {
    // Only drag on headers, avoid input fields or button clicks
    const target = e.target as HTMLElement;
    if (target.closest('.drag-handle')) {
      isDraggingPanel.current = true;
      dragStart.current = { x: e.clientX - panelPos.x, y: e.clientY - panelPos.y };
      document.body.style.userSelect = 'none';
    }
  };

  // Handle badge position dragging
  const handleBadgeDragStart = (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    isDraggingBadge.current = true;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    dragStart.current = { x: clientX - badgePos.x, y: clientY - badgePos.y };
    document.body.style.userSelect = 'none';
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDraggingPanel.current) {
        let nextX = e.clientX - dragStart.current.x;
        let nextY = e.clientY - dragStart.current.y;
        // Keep inside bounds
        nextX = Math.max(10, Math.min(window.innerWidth - 350, nextX));
        nextY = Math.max(10, Math.min(window.innerHeight - 500, nextY));
        setPanelPos({ x: nextX, y: nextY });
      }
      if (isDraggingBadge.current) {
        let nextX = e.clientX - dragStart.current.x;
        let nextY = e.clientY - dragStart.current.y;
        nextX = Math.max(5, Math.min(window.innerWidth - 65, nextX));
        nextY = Math.max(5, Math.min(window.innerHeight - 65, nextY));
        setBadgePos({ x: nextX, y: nextY });
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (isDraggingBadge.current) {
        let nextX = e.touches[0].clientX - dragStart.current.x;
        let nextY = e.touches[0].clientY - dragStart.current.y;
        nextX = Math.max(5, Math.min(window.innerWidth - 65, nextX));
        nextY = Math.max(5, Math.min(window.innerHeight - 65, nextY));
        setBadgePos({ x: nextX, y: nextY });
      }
    };

    const handleMouseUp = () => {
      isDraggingPanel.current = false;
      isDraggingBadge.current = false;
      document.body.style.userSelect = '';
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('touchmove', handleTouchMove);
    window.addEventListener('touchend', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleMouseUp);
    };
  }, [panelPos, badgePos]);

  // Global listeners for active bills
  const [synchronizedBillTotal, setSynchronizedBillTotal] = useState<number>(0);

  useEffect(() => {
    // Listens for custom events updating active bill pricing
    const handleBillUpdate = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (typeof detail === 'number') {
        setSynchronizedBillTotal(parseFloat(detail.toFixed(2)));
      }
    };

    window.addEventListener('tsm-update-active-bill-total', handleBillUpdate);
    // Listen for manual trigger anywhere to bring calculator into focus
    const handleForceOpen = () => {
      setIsOpen(true);
      setIsMinimized(false);
    };
    window.addEventListener('tsm-open-calculator', handleForceOpen);

    return () => {
      window.removeEventListener('tsm-update-active-bill-total', handleBillUpdate);
      window.removeEventListener('tsm-open-calculator', handleForceOpen);
    };
  }, []);

  // ==========================================
  // LAYER 1: STANDARD MATH ENGINE STATES & OPERATIONS
  // ==========================================
  const [calcInput, setCalcInput] = useState('');
  const [calcMemory, setCalcMemory] = useState('0');
  const calcItemCount = countNumericEntries(calcInput);
  const [undoStack, setUndoStack] = useState<string[]>(['']);
  const [redoStack, setRedoStack] = useState<string[]>([]);
  const [recentLogPreview, setRecentLogPreview] = useState<string>('');

  // Local storage history state
  const [calcHistory, setCalcHistory] = useState<CalcLog[]>(() => {
    try {
      const saved = localStorage.getItem('tsm_business_calculator_history');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('tsm_business_calculator_history', JSON.stringify(calcHistory));
    } catch {}
  }, [calcHistory]);

  // Micro tactile clicking sound/vibration handler helper
  const handleButtonPressFeedback = () => {
    try {
      if (typeof window !== 'undefined' && window.navigator && window.navigator.vibrate) {
        window.navigator.vibrate(8); // Short subtle haptic tap on android devices
      }
    } catch {}
  };

  const pushToCalcInputState = (newValue: string) => {
    handleButtonPressFeedback();
    setUndoStack(prev => [...prev, calcInput]);
    setRedoStack([]); // Clear redo
    setCalcInput(newValue);
  };

  const handleStandardOp = (char: string) => {
    if (char === 'Error' || calcInput === 'Error') {
      pushToCalcInputState(char === 'C' ? '' : char);
      return;
    }
    
    if (char === 'C') {
      pushToCalcInputState('');
    } else if (char === '⌫') {
      pushToCalcInputState(calcInput.slice(0, -1));
    } else {
      pushToCalcInputState(calcInput + char);
    }
  };

  const handleMathEvaluation = () => {
    handleButtonPressFeedback();
    if (!calcInput) return;
    try {
      // Replace intuitive symbols with standard js operational tokens
      let formulaToEvaluate = calcInput
        .replace(/×/g, '*')
        .replace(/÷/g, '/')
        .replace(/%/g, '/100');

      // Security check: strip any hazardous non-math characters
      const cleanFormula = formulaToEvaluate.replace(/[^0-9+\-*/%.()]/g, '');
      if (!cleanFormula) return;

      const evalOutcome = Function(`"use strict"; return (${cleanFormula})`)();
      
      if (typeof evalOutcome === 'number' && !isNaN(evalOutcome)) {
        // Precision bounds for display accuracy
        const resultString = String(parseFloat(evalOutcome.toFixed(4)));

        // Record entry to ledger history
        const newLog: CalcLog = {
          id: 'log_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
          formula: calcInput,
          outcome: resultString,
          timestamp: new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true }),
          isPinned: false
        };

        setCalcHistory(prev => [newLog, ...prev].slice(0, 100)); // Maintain upper bound of 100 entries
        setRecentLogPreview(`${calcInput} = ${resultString}`);
        setUndoStack(prev => [...prev, calcInput]);
        setCalcInput(resultString);
        setRedoStack([]);
      } else {
        setCalcInput('Error');
      }
    } catch {
      setCalcInput('Error');
    }
  };

  const handleUndo = () => {
    handleButtonPressFeedback();
    if (undoStack.length > 0) {
      const previousValue = undoStack[undoStack.length - 1];
      setRedoStack(prev => [calcInput, ...prev]);
      setCalcInput(previousValue);
      setUndoStack(prev => prev.slice(0, -1));
    }
  };

  const handleRedo = () => {
    handleButtonPressFeedback();
    if (redoStack.length > 0) {
      const nextValue = redoStack[0];
      setUndoStack(prev => [...prev, calcInput]);
      setCalcInput(nextValue);
      setRedoStack(prev => prev.slice(1));
    }
  };

  // --- Beautiful Inline Toast Notifications System (No blocking alerts) ---
  const [calcToast, setCalcToast] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);

  const triggerToast = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setCalcToast({ message, type });
  };

  useEffect(() => {
    if (calcToast) {
      const timer = setTimeout(() => {
        setCalcToast(null);
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [calcToast]);

  // Memory keys handlers
  const handleMemoryOp = (op: 'M+' | 'M-' | 'MR' | 'MC') => {
    handleButtonPressFeedback();
    try {
      const currentVal = parseFloat(calcInput) || 0;
      const memVal = parseFloat(calcMemory) || 0;
      if (op === 'M+') {
        setCalcMemory(String(memVal + currentVal));
        triggerToast(`Calculated Memory Added: ₹${currentVal}`);
      } else if (op === 'M-') {
        setCalcMemory(String(memVal - currentVal));
        triggerToast(`Calculated Memory Subtracted: -₹${currentVal}`);
      } else if (op === 'MR') {
        setCalcInput(calcMemory);
      } else if (op === 'MC') {
        setCalcMemory('0');
      }
    } catch {}
  };


  // ==========================================
  // LAYER 2: BUSINESS SHORTCUTS & FORMULAS
  // ==========================================
  const [busMode, setBusMode] = useState<'qtyRate' | 'discount' | 'margin' | 'gst'>('qtyRate');

  // Input states for formulas
  // Quantity × Rate
  const [bQty, setBQty] = useState('');
  const [bRate, setBRate] = useState('');
  const [bItemDiscount, setBItemDiscount] = useState('');
  const [bItemTax, setBItemTax] = useState('');
  
  // Margins
  const [bCost, setBCost] = useState('');
  const [bSale, setBSale] = useState('');
  const [bDesiredMargin, setBDesiredMargin] = useState('');

  // GST
  const [bGstGross, setBGstGross] = useState(''); // Forward/Backward active inputs
  const [bGstActiveRate, setBGstActiveRate] = useState<number>(18);
  const [gstComputeDirection, setGstComputeDirection] = useState<'forward' | 'reverse'>('forward');

  // Multi-calculator live output evaluators
  const businessOutputs = (() => {
    // 1. Qty x Rate
    const qty = parseFloat(bQty) || 0;
    const rate = parseFloat(bRate) || 0;
    const itemDisc = parseFloat(bItemDiscount) || 0;
    const itemTax = parseFloat(bItemTax) || 0;
    const qtyRateSub = qty * rate;
    const discAmount = (qtyRateSub * itemDisc) / 100;
    const postDisc = qtyRateSub - discAmount;
    const taxAmount = (postDisc * itemTax) / 100;
    const qtyRateTotal = postDisc + taxAmount;

    // 2. Discount Calculator
    const origPrice = parseFloat(bCost) || 0; // shared input state
    const discPercentage = parseFloat(bSale) || 0; // shared input state
    const savedSum = (origPrice * discPercentage) / 100;
    const discountedFinalVal = origPrice - savedSum;

    // 3. Margins & Markup KPI
    const costPriceNum = parseFloat(bCost) || 0;
    const salePriceNum = parseFloat(bSale) || 0;
    const absoluteProfit = salePriceNum - costPriceNum;
    const grossMarginPercent = salePriceNum ? (absoluteProfit / salePriceNum) * 100 : 0;
    const markupPercent = costPriceNum ? (absoluteProfit / costPriceNum) * 100 : 0;
    
    const desiredMarginRate = parseFloat(bDesiredMargin) || 0;
    const marginTargetPriceReq = (costPriceNum && desiredMarginRate < 100) 
      ? costPriceNum / (1 - desiredMarginRate / 100) 
      : 0;

    // 4. GST tax calculations
    const inputGstSourceSum = parseFloat(bGstGross) || 0;
    let gstBase = 0;
    let gstTaxValue = 0;
    let finalGstInclusiveValue = 0;

    if (gstComputeDirection === 'forward') {
      gstBase = inputGstSourceSum;
      gstTaxValue = (inputGstSourceSum * bGstActiveRate) / 100;
      finalGstInclusiveValue = inputGstSourceSum + gstTaxValue;
    } else {
      finalGstInclusiveValue = inputGstSourceSum;
      gstBase = inputGstSourceSum / (1 + bGstActiveRate / 100);
      gstTaxValue = inputGstSourceSum - gstBase;
    }
    const cgstComponent = gstTaxValue / 2;
    const sgstComponent = gstTaxValue / 2;

    return {
      qtyRateSub,
      qtyRateTotal,
      taxAmount,
      discAmount,
      savedSum,
      discountedFinalVal,
      absoluteProfit,
      grossMarginPercent,
      markupPercent,
      marginTargetPriceReq,
      gstBase,
      gstTaxValue,
      finalGstInclusiveValue,
      cgstComponent,
      sgstComponent
    };
  })();


  // ==========================================
  // LAYER 3: BILLING ASSISTANT (CHANGE RETURN HELPER)
  // ==========================================
  const [cashierBillTotal, setCashierBillTotal] = useState('');
  const [cashierReceivedCash, setCashierReceivedCash] = useState('');

  // Handle synchronized totals auto filling cashier values
  useEffect(() => {
    if (synchronizedBillTotal > 0) {
      setCashierBillTotal(String(synchronizedBillTotal));
    }
  }, [synchronizedBillTotal]);

  const changeReturnCalculations = (() => {
    // Accept either auto-synchronized prices or manual overlays
    const billSum = parseFloat(cashierBillTotal) || 0;
    const customerCash = parseFloat(cashierReceivedCash) || 0;
    const changeToReturn = customerCash - billSum;
    const isDeficit = changeToReturn < 0;

    return {
      billSum,
      customerCash,
      changeToReturn: Math.abs(changeToReturn),
      isDeficit
    };
  })();

  const applyCurrencyShortcuts = (denomination: 'exact' | number) => {
    handleButtonPressFeedback();
    const billSum = parseFloat(cashierBillTotal) || 0;
    if (denomination === 'exact') {
      setCashierReceivedCash(String(billSum));
    } else {
      const currentCash = parseFloat(cashierReceivedCash) || 0;
      setCashierReceivedCash(String(currentCash + denomination));
    }
  };


  // ==========================================
  // ==========================================
  // SMART INSERTION / DIRECT INJECT ENGINE
  // ==========================================
  const [smartTargetVisible, setSmartTargetVisible] = useState(false);
  const [currentValToExport, setCurrentValToExport] = useState('');

  const triggerSmartInsertionFlow = (value: string) => {
    setCurrentValToExport(value);
    setSmartTargetVisible(true);
  };

  const dispatchInsertionEvent = (eventName: string, value: number) => {
    handleButtonPressFeedback();
    window.dispatchEvent(new CustomEvent(eventName, { detail: value }));
    triggerToast(`Successfully sent ₹${value} to active input!`);
    setSmartTargetVisible(false);
  };

  const handleActiveElementAutofill = () => {
    handleButtonPressFeedback();
    const targetValue = currentValToExport;
    const activeEl = document.activeElement as HTMLInputElement | HTMLTextAreaElement;
    if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA')) {
      try {
         const start = activeEl.selectionStart || 0;
         const end = activeEl.selectionEnd || 0;
         const text = activeEl.value;
         const before = text.substring(0, start);
         const after = text.substring(end, text.length);
         const nextText = before + targetValue + after;
         
         // Native properties descriptor lookup bypasses React internal controls 
         // to correctly dispatch input changes and notify hook states!
         const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
           window.HTMLInputElement.prototype, 
           "value"
         )?.set;
         
         if (nativeInputValueSetter) {
           nativeInputValueSetter.call(activeEl, nextText);
           activeEl.dispatchEvent(new Event('input', { bubbles: true }));
           activeEl.dispatchEvent(new Event('change', { bubbles: true }));
         } else {
           activeEl.value = nextText;
           activeEl.dispatchEvent(new Event('input', { bubbles: true }));
         }
         
         activeEl.focus();
         triggerToast(`Autofilled input field with value: ₹${targetValue}`);
         setSmartTargetVisible(false);
         return;
      } catch (e) {
         console.error('Failed DOM bypass', e);
      }
    }
    
    // Copy fallback in case no physical focus was matching
    navigator.clipboard.writeText(targetValue);
    triggerToast(`No active input focused. Copied ₹${targetValue} to clipboard!`);
    setSmartTargetVisible(false);
  };


  // ==========================================
  // LOGS & ADVANCED PIN HISTORY CONTROLS
  // ==========================================
  const [historySearchQuery, setHistorySearchQuery] = useState('');
  const [favoriteOnlyFilter, setFavoriteOnlyFilter] = useState(false);

  const togglePinHistoryLog = (id: string) => {
    handleButtonPressFeedback();
    setCalcHistory(prev => prev.map(log => {
      if (log.id === id) {
        return { ...log, isPinned: !log.isPinned };
      }
      return log;
    }));
  };

  const deleteHistoryLogItem = (id: string) => {
    handleButtonPressFeedback();
    setCalcHistory(prev => prev.filter(log => log.id !== id));
  };

  const exportCurrentLedgerToTxt = () => {
    handleButtonPressFeedback();
    if (calcHistory.length === 0) {
      triggerToast("Calculator history ledger is empty!", "error");
      return;
    }
    const formattedContent = calcHistory.map((item, index) => {
      return `${index + 1}. [${item.timestamp}] Expression: ${item.formula} => Output: ₹${item.outcome} ${item.isPinned ? '(PINNED FAVORITE)' : ''}`;
    }).join('\n\n--- TS PRICE MANAGER CALCULATOR EXPORTED LEDGER ---\n\n');
    
    const blob = new Blob([formattedContent], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `TS_Price_Calculator_Logs_${new Date().toISOString().split('T')[0]}.txt`;
    link.click();
    URL.revokeObjectURL(link.href);
    triggerToast("Ledger spreadsheet downloaded successfully!");
  };

  const filteredHistoryLogs = calcHistory.filter(log => {
    const matchesSearch = log.formula.toLowerCase().includes(historySearchQuery.toLowerCase()) || 
                          log.outcome.toLowerCase().includes(historySearchQuery.toLowerCase());
    const matchesFav = favoriteOnlyFilter ? log.isPinned : true;
    return matchesSearch && matchesFav;
  });

  return (
    <>
      {/* 2. MODERN FLOATING CALCULATOR SCREEN PANEL OVERLAY */}
      <AnimatePresence>
        {isOpen && !isMinimized && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.96, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 15 }}
            transition={{ type: "spring", stiffness: 450, damping: 26 }}
            ref={panelRef}
            onMouseDown={handlePanelDragStart}
            style={{ 
              left: `${panelPos.x}px`, 
              top: `${panelPos.y}px`,
              touchAction: 'none'
            }}
            className={cn(
              "fixed z-[190] rounded-[2rem] bg-white border-[3px] border-zinc-200 shadow-[0_25px_60px_rgba(0,0,0,0.12)] p-4 flex flex-col justify-between cursor-default select-none text-left font-sans text-zinc-800 text-xs",
              isRapidMode ? "w-[340px]" : "w-[360px]",
              "border-t-amber-500/70 border-r-amber-500/30 border-b-zinc-200 border-l-zinc-200"
            )}
          >
            {/* PANEL DRAGGABLE HEADER */}
            <div className="drag-handle cursor-move flex items-center justify-between border-b border-zinc-150 pb-2 mb-3 select-none">
              <div className="flex items-center gap-2">
                <span className="p-1 rounded-xl bg-amber-500/10 text-amber-600 animate-pulse">
                  <Calculator size={14} className="stroke-[2.5]" />
                </span>
                <div className="leading-none">
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-amber-600">Pro POS Business Engine</span>
                  <span className="text-[7.5px] block text-zinc-500 uppercase mt-0.5 tracking-wider font-semibold">Offline Store Assistant</span>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {/* Elegant Inline Toast Pill */}
                <AnimatePresence>
                  {calcToast && (
                    <motion.div
                      initial={{ opacity: 0, y: -10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -10, scale: 0.95 }}
                      className={cn(
                        "absolute top-[60px] left-4 right-4 z-[220] rounded-xl px-3 py-2 text-center text-[10px] font-black shadow-lg flex items-center justify-center gap-1.5 transition-all outline outline-1",
                        calcToast.type === 'error' 
                          ? "bg-rose-50 text-rose-600 outline-rose-200" 
                          : calcToast.type === 'info'
                            ? "bg-indigo-50 text-indigo-600 outline-indigo-200"
                            : "bg-emerald-50 text-emerald-600 outline-emerald-200"
                      )}
                    >
                      <span className="text-xs">{calcToast.type === 'error' ? '⚠️' : calcToast.type === 'info' ? 'ℹ️' : '✨'}</span>
                      <span>{calcToast.message}</span>
                    </motion.div>
                  )}
                </AnimatePresence>
                {/* Rapid Counter UI Toggler */}
                <button
                  onClick={() => {
                    handleButtonPressFeedback();
                    setIsRapidMode(prev => !prev);
                  }}
                  className={cn(
                    "px-1.5 py-0.5 rounded text-[8px] font-bold uppercase transition select-none tracking-wider",
                    isRapidMode 
                      ? "bg-emerald-600 text-white shadow shadow-emerald-600/15" 
                      : "bg-zinc-100 text-zinc-500 hover:bg-zinc-200 hover:text-zinc-800"
                  )}
                  title="Optimize layout for faster checkout counter handovers"
                >
                  ⚡ Counter Mode {isRapidMode ? 'On' : 'Off'}
                </button>
                <button 
                  onClick={() => {
                    handleButtonPressFeedback();
                    setIsMinimized(true);
                  }}
                  className="h-6 w-6 rounded-full bg-zinc-100 flex items-center justify-center hover:bg-zinc-200 text-zinc-500 cursor-pointer"
                  title="Minimize back to floating circular shortcut"
                >
                  <Minimize2 size={11} />
                </button>
                <button 
                  onClick={() => {
                    handleButtonPressFeedback();
                    setIsOpen(false);
                  }}
                  className="h-6 w-6 rounded-full bg-zinc-100 flex items-center justify-center hover:bg-rose-50 hover:text-rose-600 text-zinc-500 cursor-pointer transition"
                  title="Close completely"
                >
                  <X size={11} />
                </button>
              </div>
            </div>

            {/* THREE FLEXIBLE SYSTEM TIERS TABS SELECTION */}
            <div className="grid grid-cols-4 gap-1 mb-3">
              {[
                { id: 'standard', label: 'Math', icon: '🔢' },
                { id: 'business', label: 'Business', icon: '📈' },
                { id: 'cashier', label: 'Cashier', icon: '💰' },
                { id: 'history', label: 'Ledger', icon: '📜' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => {
                    handleButtonPressFeedback();
                    setActiveLayer(tab.id as any);
                  }}
                  className={cn(
                    "py-1.5 rounded-xl text-[8.5px] font-extrabold uppercase tracking-wider text-center transition cursor-pointer flex flex-col items-center justify-center gap-0.5",
                    activeLayer === tab.id 
                      ? "bg-amber-500 text-white shadow shadow-amber-500/20 font-black scale-105" 
                      : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 hover:text-zinc-800"
                  )}
                >
                  <span className="text-xs">{tab.icon}</span>
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>

            {/* TIER AREA DEFINITIONS */}

            {/* LAYER 1: UNIVERSAL FAMILIAR UTILITY CALCULATOR */}
            {activeLayer === 'standard' && (
              <div className="space-y-2">
                {/* PROFESSIONAL HIGH-CONTRAST DIGITAL DISPLAY PANEL */}
                <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-3 text-right font-mono mb-2 shadow-inner">
                  {/* Top status bar with Live Item Counter */}
                  <div className="flex justify-between items-center text-[9px] font-sans tracking-wide mb-1 leading-none">
                    <span className="flex items-center gap-1 text-zinc-400">
                      <Clock size={9} /> {recentLogPreview ? 'Preview' : 'Ready'}
                    </span>
                    {/* Live Item Counter Badge */}
                    <span 
                      id="smart-calc-item-counter-badge"
                      className={cn(
                        "px-2 py-0.5 rounded-md text-[9.5px] font-black tracking-wide flex items-center gap-1 border transition-all select-none",
                        calcItemCount > 0 
                          ? "bg-amber-100 text-amber-800 border-amber-300 shadow-2xs" 
                          : "bg-zinc-100 text-zinc-400 border-zinc-200"
                      )}
                      title="Live Item Counter: Number of numeric entries included in current calculation"
                    >
                      <Layers size={10} className={calcItemCount > 0 ? "text-amber-600" : "text-zinc-400"} />
                      <span>{formatItemCountLabel(calcItemCount)}</span>
                    </span>
                  </div>
                  {/* Current Active Expression */}
                  <div className="text-[11px] text-zinc-600 font-bold tracking-normal truncate leading-none mb-1.5 min-h-[16px]">
                    {calcInput ? calcInput : '0'}
                  </div>
                  {/* Current Output Target Result */}
                  <div className="flex justify-between items-end">
                    {parseFloat(calcMemory) !== 0 ? (
                      <span className="text-[8px] bg-indigo-50 text-indigo-600 border border-indigo-200/50 px-1 py-0.5 rounded uppercase font-bold tracking-wider leading-none">
                        M+ [₹{parseFloat(calcMemory)}]
                      </span>
                    ) : (
                      <span className="text-[8.5px] text-zinc-400 font-sans italic">
                        {recentLogPreview ? recentLogPreview : ''}
                      </span>
                    )}
                    <span className="text-xl font-bold font-mono tracking-tight text-emerald-600 leading-none truncate">
                      ₹{calcInput ? calcInput : '0'}
                    </span>
                  </div>
                </div>

                {/* QUICK CASH & CONSTANT SLAB INJECTOR ACCELERATORS */}
                <div className="grid grid-cols-4 gap-1 font-mono">
                  <button 
                    onClick={() => {
                      const base = parseFloat(calcInput) || 0;
                      pushToCalcInputState(String(base + 100));
                    }}
                    className="py-1 rounded-lg bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 text-emerald-600 font-extrabold text-[8px] tracking-wider cursor-pointer select-none"
                  >
                    +₹100
                  </button>
                  <button 
                    onClick={() => {
                      const base = parseFloat(calcInput) || 0;
                      pushToCalcInputState(String(base + 500));
                    }}
                    className="py-1 rounded-lg bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 text-emerald-600 font-extrabold text-[8px] tracking-wider cursor-pointer select-none"
                  >
                    +₹500
                  </button>
                  <button 
                    onClick={() => {
                      try {
                        const clean = calcInput.replace(/[^0-9+\-*/%.()]/g, '');
                        const val = parseFloat(Function(`"use strict"; return (${clean})`)() || '0');
                        pushToCalcInputState(String((val * 1.18).toFixed(2)));
                      } catch { pushToCalcInputState('Error'); }
                    }}
                    className="py-1 rounded-lg bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 text-amber-600 font-extrabold text-[8px] tracking-wider cursor-pointer select-none"
                  >
                    +18% GST
                  </button>
                  <button 
                    onClick={() => {
                      try {
                        const clean = calcInput.replace(/[^0-9+\-*/%.()]/g, '');
                        const val = parseFloat(Function(`"use strict"; return (${clean})`)() || '0');
                        pushToCalcInputState(String((val * 1.12).toFixed(2)));
                      } catch { pushToCalcInputState('Error'); }
                    }}
                    className="py-1 rounded-lg bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 text-amber-600 font-extrabold text-[8px] tracking-wider cursor-pointer select-none"
                  >
                    +12% GST
                  </button>
                </div>

                {/* THE MAIN DIGITS & MULTIPLIERS LAYOUT GRID */}
                <div className={cn("grid grid-cols-4 gap-1.5 font-mono text-center font-bold", isRapidMode ? "text-sm" : "text-xs")}>
                  {/* Clean up buttons row */}
                  <button 
                    onClick={() => handleStandardOp('C')} 
                    className="h-9 rounded-xl bg-rose-50 border border-rose-200/60 hover:bg-rose-100 text-rose-600 font-black text-[9px] cursor-pointer"
                  >
                    AC / CLEAR
                  </button>
                  <button 
                    onClick={() => handleStandardOp('⌫')} 
                    className="h-9 rounded-xl bg-zinc-50 border border-zinc-200 hover:bg-zinc-100 text-zinc-600 font-black text-xs cursor-pointer flex items-center justify-center"
                    title="Backspace"
                  >
                    ⌫
                  </button>
                  <button 
                    onClick={() => handleStandardOp('%')} 
                    className="h-9 rounded-xl bg-zinc-50 border border-zinc-200 hover:bg-zinc-100 text-zinc-650 font-bold cursor-pointer"
                  >
                    %
                  </button>
                  <button 
                    onClick={() => handleStandardOp('/')} 
                    className="h-9 rounded-xl bg-amber-50 border border-amber-200/60 hover:bg-amber-500 hover:text-white text-amber-600 font-extrabold cursor-pointer flex items-center justify-center text-sm"
                  >
                    ÷
                  </button>

                  {/* Keyboard numerals row 7-9 */}
                  {['7', '8', '9'].map(char => (
                    <button
                      key={char}
                      onClick={() => handleStandardOp(char)}
                      className="h-9 rounded-xl bg-white border border-zinc-200 text-zinc-800 hover:bg-zinc-50 text-sm font-semibold cursor-pointer active:scale-95"
                    >
                      {char}
                    </button>
                  ))}
                  <button 
                    onClick={() => handleStandardOp('*')} 
                    className="h-9 rounded-xl bg-amber-50 border border-amber-200/60 hover:bg-amber-500 hover:text-white text-amber-600 font-extrabold cursor-pointer text-sm"
                  >
                    ×
                  </button>

                  {/* Num pad row 4-6 */}
                  {['4', '5', '6'].map(char => (
                    <button
                      key={char}
                      onClick={() => handleStandardOp(char)}
                      className="h-9 rounded-xl bg-white border border-zinc-200 text-zinc-800 hover:bg-zinc-50 text-sm font-semibold cursor-pointer active:scale-95"
                    >
                      {char}
                    </button>
                  ))}
                  <button 
                    onClick={() => handleStandardOp('-')} 
                    className="h-9 rounded-xl bg-amber-50 border border-amber-200/60 hover:bg-amber-500 hover:text-white text-amber-600 font-extrabold cursor-pointer text-sm"
                  >
                    -
                  </button>

                  {/* Num pad row 1-3 */}
                  {['1', '2', '3'].map(char => (
                    <button
                      key={char}
                      onClick={() => handleStandardOp(char)}
                      className="h-9 rounded-xl bg-white border border-zinc-200 text-zinc-800 hover:bg-zinc-50 text-sm font-semibold cursor-pointer active:scale-95"
                    >
                      {char}
                    </button>
                  ))}
                  <button 
                    onClick={() => handleStandardOp('+')} 
                    className="h-9 rounded-xl bg-amber-50 border border-amber-200/60 hover:bg-amber-500 hover:text-white text-amber-600 font-extrabold cursor-pointer text-sm"
                  >
                    +
                  </button>

                  {/* Final layout row */}
                  <button 
                    onClick={() => handleStandardOp('0')}
                    className="h-9 rounded-xl bg-white border border-zinc-200 text-zinc-800 hover:bg-zinc-50 text-sm font-semibold cursor-pointer"
                  >
                    0
                  </button>
                  <button 
                    onClick={() => handleStandardOp('.')}
                    className="h-9 rounded-xl bg-white border border-zinc-200 text-zinc-800 hover:bg-zinc-50 text-sm font-semibold cursor-pointer"
                  >
                    .
                  </button>
                  {/* Evaluation Equation Trigger */}
                  <button 
                    onClick={handleMathEvaluation}
                    className="col-span-2 h-9 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-black shadow-md shadow-amber-500/10 active:scale-95 cursor-pointer leading-none text-base text-center border border-transparent"
                  >
                    =
                  </button>
                </div>

                {/* Tactile Memory Registers & Layout Operators Row */}
                <div className="grid grid-cols-7 gap-1 text-[8.5px] font-black uppercase text-center leading-normal items-center">
                  <button onClick={() => handleMemoryOp('M+')} className="py-1.5 rounded-lg bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 text-zinc-650 cursor-pointer transition-all">M+</button>
                  <button onClick={() => handleMemoryOp('M-')} className="py-1.5 rounded-lg bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 text-zinc-650 cursor-pointer transition-all">M-</button>
                  <button onClick={() => handleMemoryOp('MR')} className="py-1.5 rounded-lg bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 text-zinc-650 cursor-pointer transition-all">MR</button>

                  {/* Undo & Redo buttons IN FRONT OF MC with NO TEXT (icon only) */}
                  <button 
                    onClick={handleUndo} 
                    disabled={undoStack.length === 0}
                    className="py-1.5 rounded-lg border cursor-pointer disabled:opacity-30 disabled:pointer-events-none text-amber-600 border-amber-200/60 bg-amber-50 hover:bg-amber-100 flex items-center justify-center transition-all active:scale-95"
                    title="Undo (Ctrl+Z)"
                  >
                    <Undo size={12} />
                  </button>
                  <button 
                    onClick={handleRedo} 
                    disabled={redoStack.length === 0}
                    className="py-1.5 rounded-lg border cursor-pointer disabled:opacity-30 disabled:pointer-events-none text-amber-600 border-amber-200/60 bg-amber-50 hover:bg-amber-100 flex items-center justify-center transition-all active:scale-95"
                    title="Redo (Ctrl+Y)"
                  >
                    <Redo size={12} />
                  </button>

                  <button onClick={() => handleMemoryOp('MC')} className="py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 border border-rose-150 text-rose-600 cursor-pointer transition-all">MC</button>

                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(calcInput || '0');
                      triggerToast(`Copied "₹${calcInput || '0'}" to clipboard!`);
                    }}
                    className="py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-extrabold flex items-center justify-center gap-1 cursor-pointer transition-all shadow-xs active:scale-95"
                    title="Copy result"
                  >
                    <Copy size={11} />
                  </button>
                </div>

                {/* Action trigger exports */}
                <div className="grid grid-cols-2 gap-1.5 pt-1.5 border-t border-zinc-150 mt-2">
                  <button
                    onClick={() => triggerSmartInsertionFlow(calcInput || '0')}
                    className="py-2 rounded-xl bg-amber-500 hover:bg-amber-600 font-extrabold text-[9px] text-white tracking-wider uppercase flex items-center justify-center gap-1.5 cursor-pointer shadow-md leading-none border border-transparent"
                  >
                    <span>🎯</span> Apply To Active Field
                  </button>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(calcInput || '0');
                      triggerToast(`Copied "₹${calcInput || '0'}" to clipboard!`);
                    }}
                    className="py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-bold text-[9px] uppercase tracking-wider flex items-center justify-center gap-1 cursor-pointer leading-none border border-zinc-200"
                  >
                    <Copy size={9} /> Copy To Clipboard
                  </button>
                </div>
              </div>
            )}


            {/* LAYER 2: INTUITIVE BUSINESS FORMULAS SHORTCUTS */}
            {activeLayer === 'business' && (
              <div className="space-y-3 bg-zinc-50/50 p-2 rounded-2xl border border-zinc-200">
                {/* Horizontal switcher of Business computations */}
                <div className="grid grid-cols-4 gap-1 border-b border-zinc-150 pb-2">
                  {[
                    { id: 'qtyRate', name: 'Qty×Rate', icon: '📦' },
                    { id: 'discount', name: 'Discount', icon: '🏷️' },
                    { id: 'margin', name: 'Margin', icon: '📈' },
                    { id: 'gst', name: 'Tax / GST', icon: '💰' }
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => {
                        handleButtonPressFeedback();
                        setBusMode(tab.id as any);
                      }}
                      className={cn(
                        "py-1 rounded-lg text-[7.5px] font-black uppercase tracking-wider text-center transition cursor-pointer select-none leading-none",
                        busMode === tab.id 
                          ? "bg-amber-50 text-amber-600 border border-amber-300 font-extrabold" 
                          : "bg-transparent text-zinc-500 hover:text-zinc-800 border border-transparent"
                      )}
                    >
                      <span className="block text-[11px] mb-0.5">{tab.icon}</span>
                      {tab.name}
                    </button>
                  ))}
                </div>

                {/* Sub Business Sub-Form 1: Qty x Rate */}
                {busMode === 'qtyRate' && (
                  <div className="space-y-2.5">
                    <div className="grid grid-cols-2 gap-2 text-[9px]">
                      <div>
                        <label className="text-[8px] font-black uppercase text-zinc-500 tracking-wider">Item Quantity</label>
                        <input
                          type="number"
                          value={bQty}
                          onChange={e => setBQty(e.target.value)}
                          placeholder="e.g. 15"
                          className="w-full mt-1 p-1.5 bg-white border border-zinc-250 text-zinc-800 rounded-xl font-mono text-xs focus:ring-1 focus:ring-amber-500 outline-none shadow-sm"
                        />
                      </div>
                      <div>
                        <label className="text-[8px] font-black uppercase text-zinc-500 tracking-wider">Price / Rate (₹)</label>
                        <input
                          type="number"
                          value={bRate}
                          onChange={e => setBRate(e.target.value)}
                          placeholder="e.g. 120"
                          className="w-full mt-1 p-1.5 bg-white border border-zinc-250 text-zinc-800 rounded-xl font-mono text-xs focus:ring-1 focus:ring-amber-500 outline-none shadow-sm"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[9px]">
                      <div>
                        <label className="text-[8px] font-black uppercase text-zinc-500 tracking-wider">Deduct Discount (%)</label>
                        <input
                          type="number"
                          value={bItemDiscount}
                          onChange={e => setBItemDiscount(e.target.value)}
                          placeholder="e.g. 10%"
                          className="w-full mt-1 p-1.5 bg-white border border-zinc-250 text-zinc-800 rounded-xl font-mono text-xs focus:ring-1 focus:ring-amber-500 outline-none shadow-sm"
                        />
                      </div>
                      <div>
                        <label className="text-[8px] font-black uppercase text-zinc-500 tracking-wider">Add Tax Rates (%)</label>
                        <input
                          type="number"
                          value={bItemTax}
                          onChange={e => setBItemTax(e.target.value)}
                          placeholder="e.g. 18%"
                          className="w-full mt-1 p-1.5 bg-white border border-zinc-250 text-zinc-800 rounded-xl font-mono text-xs focus:ring-1 focus:ring-amber-500 outline-none shadow-sm"
                        />
                      </div>
                    </div>

                    {/* Results panel */}
                    <div className="bg-zinc-50 rounded-xl p-2.5 border border-zinc-150 text-[10px] font-mono leading-tight space-y-1">
                      <div className="flex justify-between items-center text-zinc-500">
                        <span>Pure Subtotal:</span>
                        <span className="text-zinc-700 font-semibold">₹{businessOutputs.qtyRateSub.toFixed(2)}</span>
                      </div>
                      {businessOutputs.discAmount > 0 && (
                        <div className="flex justify-between items-center text-rose-600">
                          <span>Discount Deducted:</span>
                          <span className="font-semibold">-₹{businessOutputs.discAmount.toFixed(2)}</span>
                        </div>
                      )}
                      {businessOutputs.taxAmount > 0 && (
                        <div className="flex justify-between items-center text-emerald-600">
                          <span>Applied Tax Addition:</span>
                          <span className="font-semibold">+₹{businessOutputs.taxAmount.toFixed(2)}</span>
                        </div>
                      )}
                      <div className="flex justify-between items-center text-amber-600 font-extrabold border-t border-zinc-200 pt-1.5 text-xs">
                        <span>Net Valuation Price:</span>
                        <span>₹{businessOutputs.qtyRateTotal.toFixed(2)}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        onClick={() => {
                          pushToCalcInputState(String(businessOutputs.qtyRateTotal.toFixed(2)));
                          setActiveLayer('standard');
                        }}
                        className="py-1.5 bg-zinc-100 hover:bg-zinc-200 border border-zinc-205 text-zinc-700 font-black text-[8.5px] uppercase tracking-wider rounded-xl cursor-pointer leading-none text-center"
                      >
                        📥 Send to Math Display
                      </button>
                      <button
                        onClick={() => triggerSmartInsertionFlow(businessOutputs.qtyRateTotal.toFixed(2))}
                        className="py-1.5 bg-amber-500 hover:bg-amber-600 text-white font-black text-[8.5px] uppercase tracking-wider rounded-xl cursor-pointer leading-none text-center"
                      >
                        🎯 Direct Autofill
                      </button>
                    </div>
                  </div>
                )}

                {/* Sub Business Sub-Form 2: Discount Calculator */}
                {busMode === 'discount' && (
                  <div className="space-y-2.5">
                    <div className="grid grid-cols-2 gap-2 text-[9px]">
                      <div>
                        <label className="text-[8px] font-black uppercase text-zinc-500 tracking-wider">Original Catalog Price (₹)</label>
                        <input
                          type="number"
                          value={bCost}
                          onChange={e => setBCost(e.target.value)}
                          placeholder="e.g. 1500"
                          className="w-full mt-1 p-1.5 bg-white border border-zinc-250 text-zinc-800 rounded-xl font-mono text-xs focus:ring-1 focus:ring-amber-500 outline-none shadow-sm"
                        />
                      </div>
                      <div>
                        <label className="text-[8px] font-black uppercase text-zinc-500 tracking-wider">Off Percentage (%)</label>
                        <input
                          type="number"
                          value={bSale}
                          onChange={e => setBSale(e.target.value)}
                          placeholder="e.g. 25"
                          className="w-full mt-1 p-1.5 bg-white border border-zinc-250 text-zinc-800 rounded-xl font-mono text-xs focus:ring-1 focus:ring-amber-500 outline-none shadow-sm"
                        />
                      </div>
                    </div>

                    {/* Output report sheet */}
                    <div className="bg-zinc-50 rounded-xl p-2.5 border border-zinc-150 text-[10px] font-mono leading-tight space-y-1">
                      <div className="flex justify-between items-center text-zinc-500 font-bold pt-1.5">
                        <span>Original Price:</span>
                        <span className="text-zinc-700">₹{(parseFloat(bCost) || 0).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-center text-rose-600">
                        <span>Total Cash Saved Amount:</span>
                        <span className="font-semibold">₹{businessOutputs.savedSum.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-center text-emerald-600 font-extrabold border-t border-zinc-200 pt-1.5 text-xs">
                        <span>Final Reduced Customer Price:</span>
                        <span>₹{businessOutputs.discountedFinalVal.toFixed(2)}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        onClick={() => {
                          pushToCalcInputState(String(businessOutputs.discountedFinalVal.toFixed(2)));
                          setActiveLayer('standard');
                        }}
                        className="py-1.5 bg-zinc-100 hover:bg-zinc-200 border border-zinc-250 text-zinc-700 font-black text-[8.5px] uppercase tracking-wider rounded-xl cursor-pointer leading-none text-center"
                      >
                        📥 Send to Math
                      </button>
                      <button
                        onClick={() => triggerSmartInsertionFlow(businessOutputs.discountedFinalVal.toFixed(2))}
                        className="py-1.5 bg-amber-500 hover:bg-amber-600 text-white font-black text-[8.5px] uppercase tracking-wider rounded-xl cursor-pointer leading-none text-center"
                      >
                        🎯 Apply Now
                      </button>
                    </div>
                  </div>
                )}

                {/* Sub Business Sub-Form 3: Profit Margins & Desired Pricing Target Finder */}
                {busMode === 'margin' && (
                  <div className="space-y-2.5">
                    <div className="grid grid-cols-2 gap-2 text-[9px]">
                      <div>
                        <label className="text-[8px] font-black uppercase text-zinc-500 tracking-wider">Product Cost Price (₹)</label>
                        <input
                          type="number"
                          value={bCost}
                          onChange={e => setBCost(e.target.value)}
                          placeholder="e.g. 100"
                          className="w-full mt-1 p-1.5 bg-white border border-zinc-250 text-zinc-800 rounded-xl font-mono text-xs focus:ring-1 focus:ring-amber-500 outline-none shadow-sm"
                        />
                      </div>
                      <div>
                        <label className="text-[8px] font-black uppercase text-zinc-500 tracking-wider">Sale Customer Price (₹)</label>
                        <input
                          type="number"
                          value={bSale}
                          onChange={e => setBSale(e.target.value)}
                          placeholder="e.g. 130"
                          className="w-full mt-1 p-1.5 bg-white border border-zinc-250 text-zinc-800 rounded-xl font-mono text-xs focus:ring-1 focus:ring-amber-500 outline-none shadow-sm"
                        />
                      </div>
                    </div>

                    {/* Output KPI computations */}
                    <div className="bg-zinc-50 rounded-xl p-2.5 border border-zinc-150 text-[10px] font-mono space-y-1.5 leading-none">
                      <div className="flex justify-between items-center text-zinc-500">
                        <span>Net Profit Valuation:</span>
                        <span className={cn("font-bold text-xs", businessOutputs.absoluteProfit >= 0 ? "text-emerald-600" : "text-rose-600")}>
                          ₹{businessOutputs.absoluteProfit.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-zinc-500">
                        <span>Gross Profit Margin Percentage:</span>
                        <span className="text-zinc-800 font-extrabold">{businessOutputs.grossMarginPercent.toFixed(1)}%</span>
                      </div>
                      <div className="flex justify-between items-center text-zinc-500">
                        <span>Percentage Markup Rate:</span>
                        <span className="text-sky-600 font-bold">{businessOutputs.markupPercent.toFixed(1)}%</span>
                      </div>
                    </div>

                    {/* Desired Target price reverse finder config */}
                    <div className="border-t border-zinc-150 pt-2 bg-zinc-50/40 p-2 rounded-xl border border-zinc-200">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[7.5px] font-black uppercase tracking-wider text-amber-600">Target Sale Finder Helper</span>
                        {businessOutputs.marginTargetPriceReq > 0 && (
                          <span className="text-[7.5px] text-zinc-400 uppercase font-semibold">Margin Formula</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          value={bDesiredMargin}
                          onChange={e => setBDesiredMargin(e.target.value)}
                          placeholder="Target GP margin % (e.g. 30)"
                          className="flex-1 p-1 bg-white border border-zinc-250 text-zinc-800 rounded-lg font-mono text-[10px] focus:ring-1 focus:ring-amber-500 outline-none shadow-sm"
                        />
                        {businessOutputs.marginTargetPriceReq > 0 && (
                          <button
                            onClick={() => triggerSmartInsertionFlow(businessOutputs.marginTargetPriceReq.toFixed(2))}
                            className="bg-emerald-600 hover:bg-emerald-750 px-2 py-1 rounded text-white font-black text-[8px] uppercase tracking-wider select-none leading-none shadow-sm"
                          >
                            Set: ₹{businessOutputs.marginTargetPriceReq.toFixed(1)}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Sub Business Sub-Form 4: GST / Taxes Forward & Reverse (GST Extractor) */}
                {busMode === 'gst' && (
                  <div className="space-y-2.5">
                    {/* Switch computation direction */}
                    <div className="grid grid-cols-2 gap-1 bg-zinc-100 p-0.5 rounded-xl border border-zinc-200">
                      <button
                        onClick={() => setGstComputeDirection('forward')}
                        className={cn(
                          "py-1 rounded-lg text-[7.5px] font-black uppercase tracking-wider cursor-pointer",
                          gstComputeDirection === 'forward' ? "bg-amber-500 text-white shadow-sm" : "text-zinc-500"
                        )}
                      >
                        ➕ Add Tax (+GST)
                      </button>
                      <button
                        onClick={() => setGstComputeDirection('reverse')}
                        className={cn(
                          "py-1 rounded-lg text-[7.5px] font-black uppercase tracking-wider cursor-pointer",
                          gstComputeDirection === 'reverse' ? "bg-amber-500 text-white shadow-sm" : "text-zinc-500"
                        )}
                      >
                        🔍 Extract Base (Reverse GST)
                      </button>
                    </div>

                    <div>
                      <label className="text-[8px] font-black uppercase text-zinc-500 tracking-wider">
                        {gstComputeDirection === 'forward' ? 'Base Amount (Exclude Tax)' : 'Gross Sum Paid (Include Tax)'}
                      </label>
                      <input
                        type="number"
                        value={bGstGross}
                        onChange={e => setBGstGross(e.target.value)}
                        placeholder="e.g. 1180"
                        className="w-full mt-1 p-1.5 bg-white border border-zinc-250 text-zinc-800 rounded-xl font-mono text-xs focus:ring-1 focus:ring-amber-500 outline-none shadow-sm"
                      />
                    </div>

                    {/* Slabs */}
                    <div>
                      <span className="text-[8px] font-black uppercase text-zinc-500 tracking-wider block mb-1">Set Tax Slab Rate</span>
                      <div className="grid grid-cols-4 gap-1">
                        {[5, 12, 18, 28].map(slab => (
                          <button
                            key={slab}
                            onClick={() => setBGstActiveRate(slab)}
                            className={cn(
                              "py-1 rounded-lg text-[10px] font-mono tracking-widest font-extrabold text-center cursor-pointer",
                              bGstActiveRate === slab 
                                ? "bg-amber-500 text-white font-black" 
                                : "bg-zinc-100 text-zinc-650 hover:bg-zinc-250"
                            )}
                          >
                            {slab}%
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Tax Bifurcation Report */}
                    <div className="bg-zinc-50 rounded-xl p-2 border border-zinc-150 text-[10px] font-mono leading-tight space-y-1">
                      <div className="flex justify-between items-center text-zinc-550">
                        <span>Original Base Value:</span>
                        <span className="text-zinc-800 font-bold">₹{businessOutputs.gstBase.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-center text-rose-600">
                        <span>GST Tax Amount ({bGstActiveRate}%):</span>
                        <span className="font-semibold font-mono">₹{businessOutputs.gstTaxValue.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-center text-zinc-500 pl-2 border-l border-zinc-200 text-[9px]">
                        <span>CGST (Central Tax Half):</span>
                        <span>₹{businessOutputs.cgstComponent.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-center text-zinc-500 pl-2 border-l border-zinc-200 text-[9px]">
                        <span>SGST/UTGST (State Half):</span>
                        <span>₹{businessOutputs.sgstComponent.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-center text-emerald-600 border-t border-zinc-200 pt-1 text-xs font-black">
                        <span>Total Paid sum:</span>
                        <span>₹{businessOutputs.finalGstInclusiveValue.toFixed(2)}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-1.5 pt-0.5">
                      <button
                        onClick={() => {
                          pushToCalcInputState(String(businessOutputs.gstBase.toFixed(2)));
                          setActiveLayer('standard');
                        }}
                        className="py-1.5 bg-zinc-100 hover:bg-zinc-200 border border-zinc-200 text-zinc-700 text-[8px] font-black uppercase rounded-lg text-center cursor-pointer"
                      >
                        📥 Send Base to Math
                      </button>
                      <button
                        onClick={() => {
                          pushToCalcInputState(String(businessOutputs.gstTaxValue.toFixed(2)));
                          setActiveLayer('standard');
                        }}
                        className="py-1.5 bg-zinc-100 hover:bg-zinc-200 border border-zinc-200 text-amber-600 text-[8px] font-black uppercase rounded-lg text-center cursor-pointer"
                      >
                        📥 Send Tax to Math
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}


            {/* LAYER 3: BILLING COURIER HANDOVER CHANGE RETURN VAL HELPER */}
            {activeLayer === 'cashier' && (
              <div className="space-y-3 bg-zinc-50/50 p-2 rounded-2xl border border-zinc-200">
                <div className="flex justify-between items-center border-b border-zinc-150 pb-1.5 select-none">
                  <span className="text-[8.5px] font-black uppercase text-zinc-500 tracking-wider">Cash Register Change Return Ledger</span>
                  {synchronizedBillTotal > 0 && (
                    <span className="text-[7px] bg-emerald-100 text-emerald-600 border border-emerald-250 px-1 rounded-full uppercase tracking-widest font-black leading-none py-0.5 animate-pulse">
                      Active Bill Sync
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[8px] font-black uppercase text-zinc-500 tracking-wider flex justify-between">
                      <span>Total Bill (₹)</span>
                      {synchronizedBillTotal > 0 && (
                        <button 
                          onClick={() => setCashierBillTotal(String(synchronizedBillTotal))}
                          className="text-[7.5px] text-amber-600 uppercase leading-none font-extrabold focus:outline-none cursor-pointer"
                        >
                          Reset to Sync
                        </button>
                      )}
                    </label>
                    <input
                      type="number"
                      value={cashierBillTotal}
                      onChange={e => setCashierBillTotal(e.target.value)}
                      placeholder="e.g. 520"
                      className="w-full mt-1 p-1.5 bg-white border border-zinc-250 text-zinc-800 rounded-xl font-mono text-xs focus:ring-1 focus:ring-amber-500 outline-none shadow-sm"
                    />
                  </div>
                  <div>
                    <label className="text-[8px] font-black uppercase text-zinc-500 tracking-wider">Customer Handed Cash (₹)</label>
                    <input
                      type="number"
                      value={cashierReceivedCash}
                      onChange={e => setCashierReceivedCash(e.target.value)}
                      placeholder="e.g. 1000"
                      className="w-full mt-1 p-1.5 bg-white border border-zinc-250 text-zinc-800 rounded-xl font-mono text-xs focus:ring-1 focus:ring-amber-500 outline-none shadow-sm animate-pulse"
                    />
                  </div>
                </div>

                {/* UNIVERSAL FASTRACK CHANGER SHORTCUTS BUTTONS FOR INDIAN SHOPKEEPER SHIFTS */}
                <div>
                  <span className="text-[8px] font-black uppercase text-zinc-500 tracking-wider block mb-1">Fast Counter Denomination addition Shortcuts</span>
                  <div className="grid grid-cols-4 gap-1.5 text-[8.5px] font-black font-semibold font-mono">
                    <button onClick={() => applyCurrencyShortcuts(100)} className="py-1 bg-zinc-100 hover:bg-zinc-200 text-emerald-600 rounded-lg cursor-pointer border border-zinc-150 shadow-sm">+ ₹100</button>
                    <button onClick={() => applyCurrencyShortcuts(200)} className="py-1 bg-zinc-100 hover:bg-zinc-200 text-emerald-600 rounded-lg cursor-pointer border border-zinc-150 shadow-sm">+ ₹200</button>
                    <button onClick={() => applyCurrencyShortcuts(500)} className="py-1 bg-zinc-100 hover:bg-zinc-200 text-emerald-600 rounded-lg cursor-pointer border border-zinc-150 shadow-sm">+ ₹500</button>
                    <button onClick={() => applyCurrencyShortcuts('exact')} className="py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200/50 rounded-lg cursor-pointer shadow-sm">Exact ₹</button>
                  </div>
                </div>

                {/* OVERSZED VISIBILITY CASH OUTPUT DRAWER */}
                <div className={cn(
                  "rounded-2xl p-3 border-2 flex flex-col items-center justify-center text-center shadow-inner",
                  changeReturnCalculations.isDeficit 
                    ? "bg-rose-50 text-rose-600 border-rose-200" 
                    : "bg-emerald-50 text-emerald-600 border-emerald-250"
                )}>
                  <span className="text-[8px] uppercase tracking-widest font-black leading-none mb-1">
                    {changeReturnCalculations.isDeficit ? "Outstanding balance required" : "Deduct Balance Change to Return"}
                  </span>
                  <span className="text-2xl font-black font-mono tracking-tight animate-pulse select-all">
                    ₹{changeReturnCalculations.changeToReturn.toFixed(2)}
                  </span>
                  {changeReturnCalculations.isDeficit && (
                    <span className="text-[7.5px] font-semibold uppercase tracking-wider block mt-0.5 text-rose-500">
                      Customer is paying less by ₹{changeReturnCalculations.changeToReturn.toFixed(0)}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-1.5 pt-0.5 mt-1">
                  <button
                    onClick={() => triggerSmartInsertionFlow(String(changeReturnCalculations.customerCash))}
                    className="py-1.5 bg-zinc-100 hover:bg-zinc-200 border border-zinc-250 text-zinc-700 text-[8.5px] uppercase font-black tracking-wider rounded-xl cursor-pointer text-center leading-none"
                  >
                    📥 Inject Cash sum
                  </button>
                  <button
                    onClick={() => {
                      dispatchInsertionEvent('tsm-apply-cash-received', changeReturnCalculations.customerCash);
                    }}
                    className="py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-[8.5px] uppercase font-black tracking-wider rounded-xl cursor-pointer text-center leading-none"
                  >
                    💰 Checkout Set Received Cash
                  </button>
                </div>
              </div>
            )}


            {/* LAYER 4: SESSION CALCULATIONS LEDGER & FAVORITE LISTS */}
            {activeLayer === 'history' && (
              <div className="space-y-2 bg-zinc-50/50 p-2 rounded-2xl border border-zinc-200 flex flex-col h-[280px] overflow-hidden">
                <div className="flex justify-between items-center border-b border-zinc-150 pb-1.5 select-none">
                  <div className="flex items-center gap-1 text-[8.5px] text-zinc-500 font-extrabold uppercase">
                    <History size={10} /> Active Session Ledger
                  </div>
                  <div className="flex gap-2 leading-none">
                    <button 
                      onClick={exportCurrentLedgerToTxt}
                      className="text-[7px] text-zinc-500 hover:text-zinc-800 bg-transparent outline-none cursor-pointer flex items-center gap-0.5 font-bold uppercase select-none border-0"
                      title="Save and download spreadsheet text ledger report"
                    >
                      <Download size={8} /> Export Sheet
                    </button>
                    <button 
                      onClick={() => {
                        handleButtonPressFeedback();
                        if (confirm("Are you sure you want to purge the current calculator ledger log?")) {
                          setCalcHistory([]);
                        }
                      }}
                      className="text-[7px] text-rose-600 hover:text-rose-500 font-bold uppercase cursor-pointer select-none border-0 bg-transparent"
                    >
                      Purge History
                    </button>
                  </div>
                </div>

                {/* Filter and Search parameters input panel */}
                <div className="flex items-center gap-1.5 bg-white rounded-lg px-2 py-1 border border-zinc-200 shadow-sm">
                  <Search size={10} className="text-zinc-400" />
                  <input
                    type="text"
                    value={historySearchQuery}
                    onChange={e => setHistorySearchQuery(e.target.value)}
                    placeholder="Search logs/outputs..."
                    className="flex-1 bg-transparent border-0 text-[10px] text-zinc-800 focus:outline-none placeholder-zinc-400 font-sans"
                  />
                  <button
                    onClick={() => {
                      handleButtonPressFeedback();
                      setFavoriteOnlyFilter(!favoriteOnlyFilter);
                    }}
                    className={cn(
                      "p-0.5 rounded text-[8px] font-bold tracking-wider uppercase leading-none cursor-pointer",
                      favoriteOnlyFilter ? "bg-amber-50 text-amber-600 border border-amber-205" : "text-zinc-400 hover:text-zinc-600"
                    )}
                    title="Filters ledger entries to marked highlights"
                  >
                    <Star size={9} fill={favoriteOnlyFilter ? "currentColor" : "none"} />
                  </button>
                </div>

                {/* Ledger calculations display core list */}
                <div className="flex-1 overflow-y-auto space-y-1.5 pr-0.5 custom-scrollbar font-mono text-[9px]">
                  {filteredHistoryLogs.length === 0 ? (
                    <div className="py-12 text-center text-zinc-400 italic text-[9.5px]">
                      {favoriteOnlyFilter ? "No pinned calculation highlights recorded." : "No matching spreadsheet inputs in active sheet."}
                    </div>
                  ) : (
                    filteredHistoryLogs.map((item, hIdx) => (
                      <div 
                        key={`smart-calc-hist-${item.id || 'item'}-${hIdx}`} 
                        className="p-2 rounded-xl bg-white hover:bg-zinc-50 border border-zinc-150 hover:border-zinc-250 flex items-center justify-between group transition-all shadow-sm"
                      >
                        <div 
                          onClick={() => {
                            pushToCalcInputState(item.outcome);
                            setActiveLayer('standard');
                          }}
                          className="flex-1 cursor-pointer truncate mr-2 flex flex-col text-left leading-tight"
                          title="Restore outcome to calculator screen"
                        >
                          <div className="flex items-center justify-between gap-1 mb-0.5">
                            <span className="text-[7.5px] text-zinc-400 tracking-wide flex items-center gap-1">
                              <Clock size={7} /> {item.timestamp}
                            </span>
                            <span className="text-[7.5px] font-extrabold bg-amber-50 text-amber-700 border border-amber-200 px-1 py-0.5 rounded flex items-center gap-0.5">
                              <Layers size={7} className="text-amber-500" />
                              {formatItemCountLabel(countNumericEntries(item.formula))}
                            </span>
                          </div>
                          <span className="text-zinc-600 text-[8.5px] truncate max-w-[200px]">{item.formula}</span>
                          <span className="text-emerald-655 font-extrabold text-sm tracking-tight mt-0.5">₹{item.outcome}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {/* Star favorite tag */}
                          <button
                            onClick={() => togglePinHistoryLog(item.id)}
                            className={cn(
                              "text-zinc-400 hover:text-amber-500 select-none cursor-pointer transition",
                              item.isPinned ? "text-amber-505 scale-110" : ""
                            )}
                            title={item.isPinned ? "Unpin calculation favorite" : "Pin calculation favorite"}
                          >
                            <Star size={10} fill={item.isPinned ? "currentColor" : "none"} />
                          </button>
                          {/* Copy directly */}
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(item.outcome);
                              triggerToast(`Copied output ₹${item.outcome}!`);
                            }}
                            className="text-zinc-400 hover:text-amber-500 transition cursor-pointer"
                            title="Copy result to clipboard"
                          >
                            <Copy size={10} />
                          </button>
                          {/* Purge log index */}
                          <button
                            onClick={() => deleteHistoryLogItem(item.id)}
                            className="text-zinc-400 hover:text-rose-500 cursor-pointer transition"
                            title="Delete this spreadsheet calculation"
                          >
                            <Trash2 size={10} />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}


            {/* SMART SYSTEM DESTINATION SELECTION MODAL DRAWER INSIDE CALCULATOR OVERLAY */}
            <AnimatePresence>
              {smartTargetVisible && (
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 30 }}
                  className="absolute inset-[10px] z-[210] rounded-[1.8rem] bg-white border-2 border-amber-500 p-4 flex flex-col justify-between font-sans shadow-lg"
                >
                  <div className="space-y-2">
                    <div className="flex justify-between items-center border-b border-zinc-150 pb-1.5 select-none">
                      <span className="text-[10px] font-black uppercase text-amber-600 flex items-center gap-1">
                        <span>🎯</span> Smart Target Autofiller
                      </span>
                      <button 
                        onClick={() => setSmartTargetVisible(false)}
                        className="h-5 w-5 bg-zinc-100 rounded-full flex items-center justify-center hover:bg-zinc-200 text-zinc-500 transition cursor-pointer"
                      >
                        <X size={9} />
                      </button>
                    </div>

                    <div className="bg-emerald-50 p-2 rounded-xl text-center border border-emerald-250 font-mono text-emerald-700 mb-1 leading-tight">
                      <p className="text-[7.5px] uppercase tracking-wider mb-0.5">Injecting value:</p>
                      <p className="text-base text-emerald-600 font-black">₹{currentValToExport}</p>
                    </div>

                    <span className="text-[8px] font-black uppercase text-zinc-500 tracking-wider block">Frequently Used Targets</span>
                    
                    <div className="grid grid-cols-2 gap-1.5 font-sans">
                      <button
                        onClick={() => dispatchInsertionEvent('tsm-apply-discount', parseFloat(currentValToExport) || 0)}
                        className="py-1.5 bg-zinc-50 hover:bg-amber-500 hover:text-white rounded-lg text-[8.5px] font-bold text-zinc-700 text-center transition cursor-pointer select-none leading-none border border-zinc-200 shadow-sm"
                      >
                        🏷️ Set Bill Discount %
                      </button>
                      <button
                        onClick={() => dispatchInsertionEvent('tsm-apply-tax', parseFloat(currentValToExport) || 0)}
                        className="py-1.5 bg-zinc-50 hover:bg-amber-500 hover:text-white rounded-lg text-[8.5px] font-bold text-zinc-700 text-center transition cursor-pointer select-none leading-none border border-zinc-200 shadow-sm"
                      >
                        💰 Set Bill Tax %
                      </button>
                      <button
                        onClick={() => dispatchInsertionEvent('tsm-apply-cash-received', parseFloat(currentValToExport) || 0)}
                        className="py-1.5 bg-zinc-50 hover:bg-amber-500 hover:text-white rounded-lg text-[8.5px] font-bold text-zinc-700 text-center transition cursor-pointer select-none leading-none border border-zinc-200 shadow-sm animate-pulse"
                      >
                        💶 Set Customer Cash
                      </button>
                      <button
                        onClick={() => dispatchInsertionEvent('tsm-apply-item-price', parseFloat(currentValToExport) || 0)}
                        className="py-1.5 bg-zinc-50 hover:bg-amber-500 hover:text-white rounded-lg text-[8.5px] font-bold text-zinc-700 text-center transition cursor-pointer select-none leading-none border border-zinc-200 shadow-sm"
                      >
                        📦 Unit Retail Price
                      </button>
                    </div>

                    <div className="border-t border-zinc-150 pt-1">
                      <span className="text-[8px] font-semibold text-zinc-500 uppercase tracking-wide block mb-1">Universal Smart Target</span>
                      <button
                        onClick={handleActiveElementAutofill}
                        className="w-full py-2 bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-[9.5px] uppercase tracking-widest rounded-xl text-center cursor-pointer shadow-md flex items-center justify-center gap-1.5 mt-1 leading-none border border-transparent"
                        title="Types directly into whatever input field was currently active/focused on the browser page!"
                      >
                        <span>🪄</span> Magic Autofill Focused Input
                      </button>
                    </div>
                  </div>

                  <p className="text-[7.5px] text-zinc-400 text-center italic mt-2 leading-tight select-none">
                    Tapping "Magic Autofill" directly writes calculation results into anyway selected field. No pasting needed!
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Micro Credit Header Line */}
            <div className="flex justify-between items-center text-[7px] text-zinc-400 uppercase font-bold tracking-wider select-none border-t border-zinc-150 pt-2 mt-2 leading-none">
              <span>Active POS Shift Toolkit</span>
              <span className="font-mono text-zinc-400">POS LEDGER</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
