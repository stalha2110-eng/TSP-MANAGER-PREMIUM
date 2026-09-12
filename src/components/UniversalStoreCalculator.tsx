import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { 
  Calculator, Copy, Check, History, Undo, Redo, Pin,
  Trash2, DollarSign, Clock, ArrowRightLeft, Sparkles,
  Download, Layers, Plus, Minus, Tag, Landmark, Percent,
  AlertTriangle, Search, Edit3, Cloud, Smartphone, Bookmark,
  X, Save, Filter, CheckSquare, Square, Receipt,
  Maximize2, Minimize2, ZoomIn, ZoomOut, Sliders, Volume2, VolumeX,
  ChevronDown, ChevronUp, FileSpreadsheet, Divide, CornerDownLeft,
  Activity, BarChart2, Coins, ArrowDownRight, RefreshCw, Zap, CheckCircle2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn, countNumericEntries, formatItemCountLabel } from '../lib/utils';
import { db, handleFirestoreError, OperationType, sanitizeForFirestore } from '../firebase';
import { 
  collection, addDoc, updateDoc, deleteDoc, doc, 
  onSnapshot, query, orderBy 
} from 'firebase/firestore';
import {
  evaluateExpression,
  formatWithPrecision,
  calculateGstBreakdown,
  calculateDenominationBreakdown,
  extractFormulaStatistics,
  normalizeFloat,
  type DenominationItem,
  type FormulaStatistics
} from '../utils/calculatorEngine';

export interface CalcLog {
  id: string;
  name?: string;
  formula: string;
  outcome: string;
  timestamp: string;
  createdAt: number;
  isPinned: boolean;
  storage: 'cloud' | 'device';
  firestoreId?: string;
  notes?: string;
}

export interface CalcStateSnapshot {
  input: string;
  cursor: number;
}

export default function UniversalStoreCalculator() {
  // Main Calculator display state
  const [calcInput, setCalcInput] = useState('');
  const displayInputRef = useRef<HTMLInputElement>(null);
  const [cursorPos, setCursorPos] = useState<number>(0);
  const [calcMemory, setCalcMemory] = useState('0');

  // Live item counter calculating number of numeric entries in current expression
  const calcItemCount = useMemo(() => {
    return countNumericEntries(calcInput);
  }, [calcInput]);
  const [undoStack, setUndoStack] = useState<CalcStateSnapshot[]>([{ input: '', cursor: 0 }]);
  const [redoStack, setRedoStack] = useState<CalcStateSnapshot[]>([]);
  const [recentLogPreview, setRecentLogPreview] = useState<string>('');
  const [showAcConfirm, setShowAcConfirm] = useState(false);

  // Custom calculation name state for active input
  const [activeCalcName, setActiveCalcName] = useState('');
  const [showNameModal, setShowNameModal] = useState(false);
  const [calcNotesInput, setCalcNotesInput] = useState('');

  // Cash Change Helper State
  const [cashBillTotal, setCashBillTotal] = useState('');
  const [cashReceived, setCashReceived] = useState('');

  // Calculator Mode
  const [activeTab, setActiveTab] = useState<'calculator' | 'change' | 'history'>('calculator');

  // Search query state for tally ledger
  const [searchQuery, setSearchQuery] = useState('');

  // Local Device Storage state
  const [deviceHistory, setDeviceHistory] = useState<CalcLog[]>(() => {
    try {
      const saved = localStorage.getItem('tsm_universal_calculator_history');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Cloud Storage state (from Firebase Firestore)
  const [cloudHistory, setCloudHistory] = useState<CalcLog[]>([]);

  // Modals state: Edit item & Clear History
  const [editingLog, setEditingLog] = useState<CalcLog | null>(null);
  const [editName, setEditName] = useState('');
  const [editFormula, setEditFormula] = useState('');
  const [editOutcome, setEditOutcome] = useState('');

  const [showClearHistoryModal, setShowClearHistoryModal] = useState(false);
  const [clearPresetOption, setClearPresetOption] = useState<'all' | 'except_saved'>('all');
  const [selectedIdsForClear, setSelectedIdsForClear] = useState<Set<string>>(new Set());

  // Toast notification
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);

  const triggerToast = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 2500);
  };

  // Flexible Length & Display Size State
  type LengthPreset = 'compact' | 'standard' | 'large' | 'xlarge' | 'screen_fit' | 'custom';
  const [lengthPreset, setLengthPreset] = useState<LengthPreset>(() => {
    try {
      return (localStorage.getItem('tsm_calc_length_preset') as LengthPreset) || 'large';
    } catch {
      return 'large';
    }
  });

  const [customBtnHeight, setCustomBtnHeight] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('tsm_calc_custom_btn_height');
      return saved ? parseInt(saved, 10) : 74;
    } catch {
      return 74;
    }
  });

  const [containerWidthMode, setContainerWidthMode] = useState<'standard' | 'wide' | 'full'>(() => {
    try {
      return (localStorage.getItem('tsm_calc_container_width') as any) || 'wide';
    } catch {
      return 'wide';
    }
  });

  // Dynamic Viewport / Screen-Fit Height calculation
  const [screenFitHeight, setScreenFitHeight] = useState<number>(76);
  useEffect(() => {
    const updateScreenFit = () => {
      const vh = window.innerHeight;
      // Header, banner, display, margins occupy ~360-400px
      const availableForKeypad = Math.max(260, vh - 380);
      const computedBtnH = Math.min(110, Math.max(50, Math.floor((availableForKeypad - 40) / 5)));
      setScreenFitHeight(computedBtnH);
    };
    updateScreenFit();
    window.addEventListener('resize', updateScreenFit);
    return () => window.removeEventListener('resize', updateScreenFit);
  }, []);

  const effectiveBtnHeight = useMemo(() => {
    switch (lengthPreset) {
      case 'compact': return 48;
      case 'standard': return 60;
      case 'large': return 74;
      case 'xlarge': return 92;
      case 'screen_fit': return screenFitHeight;
      case 'custom': return customBtnHeight;
      default: return 74;
    }
  }, [lengthPreset, screenFitHeight, customBtnHeight]);

  // Persist size settings
  useEffect(() => {
    try {
      localStorage.setItem('tsm_calc_length_preset', lengthPreset);
      localStorage.setItem('tsm_calc_custom_btn_height', String(customBtnHeight));
      localStorage.setItem('tsm_calc_container_width', containerWidthMode);
    } catch {}
  }, [lengthPreset, customBtnHeight, containerWidthMode]);

  // Sizing controls bar toggle
  const [showSizingControls, setShowSizingControls] = useState(false);

  // Stepping keypad button height
  const handleStepHeight = (delta: number) => {
    setLengthPreset('custom');
    setCustomBtnHeight(prev => Math.min(120, Math.max(40, prev + delta)));
  };

  // Quick GST & Math Helpers
  const handleAddGst = (gstRate: number) => {
    if (!calcInput.trim()) return;
    const res = evaluateExpression(calcInput);
    if (res.success && res.result !== null) {
      const added = res.result * (1 + gstRate / 100);
      const rounded = Number(added.toFixed(2));
      pushToUndoStack(calcInput, calcInput.length);
      setCalcInput(String(rounded));
      triggerToast(`+${gstRate}% GST Applied: ₹${rounded}`);
    }
  };

  const handleApplyDiscount = (pct: number) => {
    if (!calcInput.trim()) return;
    const res = evaluateExpression(calcInput);
    if (res.success && res.result !== null) {
      const discounted = res.result * (1 - pct / 100);
      const rounded = Number(discounted.toFixed(2));
      pushToUndoStack(calcInput, calcInput.length);
      setCalcInput(String(rounded));
      triggerToast(`-${pct}% Discount Applied: ₹${rounded}`);
    }
  };

  const handleQuickRounding = (type: 'round' | 'floor' | 'ceil') => {
    if (!calcInput.trim()) return;
    const res = evaluateExpression(calcInput);
    if (res.success && res.result !== null) {
      let rounded = res.result;
      if (type === 'round') rounded = Math.round(res.result);
      else if (type === 'floor') rounded = Math.floor(res.result);
      else if (type === 'ceil') rounded = Math.ceil(res.result);
      pushToUndoStack(calcInput, calcInput.length);
      setCalcInput(String(rounded));
      triggerToast(`Rounded (${type}): ₹${rounded}`);
    }
  };

  const handleNegate = () => {
    if (!calcInput.trim()) return;
    const res = evaluateExpression(calcInput);
    if (res.success && res.result !== null) {
      const negated = -res.result;
      pushToUndoStack(calcInput, calcInput.length);
      setCalcInput(String(negated));
    }
  };

  // Precision and Mode
  type PrecisionMode = 'auto' | '0' | '2' | '3' | '4';
  const [precisionMode, setPrecisionMode] = useState<PrecisionMode>(() => {
    try {
      return (localStorage.getItem('tsm_calc_precision_mode') as PrecisionMode) || 'auto';
    } catch {
      return 'auto';
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('tsm_calc_precision_mode', precisionMode);
    } catch {}
  }, [precisionMode]);

  // Sound and Haptic toggles
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    try {
      return localStorage.getItem('tsm_calc_sound') !== 'false';
    } catch {
      return true;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('tsm_calc_sound', String(soundEnabled));
    } catch {}
  }, [soundEnabled]);

  // Advanced Tools Bar toggle
  const [showAdvancedTools, setShowAdvancedTools] = useState(false);

  // Live Audit Tape toggle
  const [showAuditTape, setShowAuditTape] = useState(false);

  // Reverse GST Modal state
  const [showReverseGstModal, setShowReverseGstModal] = useState(false);
  const [reverseGstRate, setReverseGstRate] = useState<number>(18);
  const [reverseGstAmountInput, setReverseGstAmountInput] = useState<string>('');

  // Live Real-Time Evaluation
  const livePreview = useMemo(() => {
    if (!calcInput.trim() || calcInput === 'Error') return null;
    const res = evaluateExpression(calcInput);
    if (res.success && res.result !== null) {
      return {
        formatted: formatWithPrecision(res.result, precisionMode),
        raw: res.result
      };
    }
    return null;
  }, [calcInput, precisionMode]);

  // Formula statistics for Audit Tape
  const formulaStats = useMemo(() => {
    return extractFormulaStatistics(calcInput);
  }, [calcInput]);

  // Sync Device history to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('tsm_universal_calculator_history', JSON.stringify(deviceHistory));
    } catch {}
  }, [deviceHistory]);

  // Real-time Firestore Listener & 7-Day Auto-Migration Logic
  useEffect(() => {
    if (!db) return;
    let unsubscribe: (() => void) | undefined;
    try {
      const q = query(collection(db, 'calcLedger'));
      unsubscribe = onSnapshot(q, (snapshot) => {
        const cloudItems: CalcLog[] = [];
        const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
        const now = Date.now();

        snapshot.docs.forEach((docSnap) => {
          const data = docSnap.data();
          const createdAt = data.createdAt || now;
          const age = now - createdAt;

          // Check if calculation in cloud has passed 7 days
          if (age > SEVEN_DAYS_MS) {
            // Delete permanently from Firebase Cloud
            deleteDoc(doc(db, 'calcLedger', docSnap.id)).catch(err => {
              console.warn("Auto-delete expired cloud calc failed:", err);
            });

            // Migrate to Local Device Storage
            setDeviceHistory(prev => {
              const exists = prev.some(item => item.id === docSnap.id || (item.formula === data.formula && item.outcome === data.outcome && item.createdAt === createdAt));
              if (exists) return prev;
              const migratedLog: CalcLog = {
                id: 'migrated_' + docSnap.id,
                name: data.name || '',
                formula: data.formula || '',
                outcome: data.outcome || '',
                timestamp: data.timestamp || new Date(createdAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true }),
                createdAt: createdAt,
                isPinned: data.isPinned || false,
                storage: 'device',
                notes: data.notes || ''
              };
              return [migratedLog, ...prev];
            });
          } else {
            // Still within 7 days in Cloud
            cloudItems.push({
              id: docSnap.id,
              firestoreId: docSnap.id,
              name: data.name || '',
              formula: data.formula || '',
              outcome: data.outcome || '',
              timestamp: data.timestamp || new Date(createdAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true }),
              createdAt: createdAt,
              isPinned: data.isPinned || false,
              storage: 'cloud',
              notes: data.notes || ''
            });
          }
        });

        setCloudHistory(cloudItems);
      }, (error) => {
        console.warn("Firestore calcLedger listener warning:", error);
      });
    } catch (err) {
      console.warn("Unable to attach Firestore calcLedger listener:", err);
    }

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  // Combined and sorted calculation ledger history
  const calcHistory = useMemo(() => {
    const map = new Map<string, CalcLog>();

    // Add cloud items
    cloudHistory.forEach(item => {
      map.set(item.id, item);
    });

    // Add device items
    deviceHistory.forEach(item => {
      if (!map.has(item.id)) {
        map.set(item.id, item);
      }
    });

    const list = Array.from(map.values());

    // Sort: Pinned calculations first, then newest first
    return list.sort((a, b) => {
      if (a.isPinned !== b.isPinned) {
        return a.isPinned ? -1 : 1;
      }
      return (b.createdAt || 0) - (a.createdAt || 0);
    });
  }, [cloudHistory, deviceHistory]);

  // Search filtered ledger list
  const filteredHistory = useMemo(() => {
    if (!searchQuery.trim()) return calcHistory;
    const q = searchQuery.toLowerCase().trim();
    return calcHistory.filter(item => 
      (item.name && item.name.toLowerCase().includes(q)) ||
      (item.formula && item.formula.toLowerCase().includes(q)) ||
      (item.outcome && item.outcome.toLowerCase().includes(q)) ||
      (item.notes && item.notes.toLowerCase().includes(q))
    );
  }, [calcHistory, searchQuery]);

  // Ultra-Fast Zero Latency Audio & Haptic Feedback
  const playClickSound = useCallback(() => {
    if (!soundEnabled) return;
    try {
      if (typeof window === 'undefined') return;
      const windowWithAudio = window as unknown as { 
        __calcAudioCtx?: AudioContext; 
        webkitAudioContext?: typeof AudioContext 
      };
      if (!windowWithAudio.__calcAudioCtx) {
        const AudioContextClass = window.AudioContext || windowWithAudio.webkitAudioContext;
        if (AudioContextClass) {
          windowWithAudio.__calcAudioCtx = new AudioContextClass();
        }
      }
      const ctx = windowWithAudio.__calcAudioCtx;
      if (ctx) {
        if (ctx.state === 'suspended') {
          ctx.resume();
        }
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(900, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(350, ctx.currentTime + 0.012);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.012);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.012);
      }
      if (window.navigator?.vibrate) {
        window.navigator.vibrate(5);
      }
    } catch {}
  }, [soundEnabled]);

  const calcInputRef = useRef(calcInput);
  const cursorPosRef = useRef(cursorPos);
  useEffect(() => {
    calcInputRef.current = calcInput;
    cursorPosRef.current = cursorPos;
    if (cursorPos > calcInput.length) {
      setCursorPos(calcInput.length);
    }
  }, [calcInput, cursorPos]);

  // Handle manual selection/cursor placement on calculator display
  const handleSelectionChange = () => {
    if (displayInputRef.current) {
      const start = displayInputRef.current.selectionStart;
      if (start !== null) {
        setCursorPos(start);
      }
    }
  };

  // Move cursor manually left or right
  const moveCursor = (direction: 'left' | 'right' | 'home' | 'end') => {
    const len = calcInput.length;
    let newPos = cursorPos;
    if (direction === 'left') newPos = Math.max(0, cursorPos - 1);
    else if (direction === 'right') newPos = Math.min(len, cursorPos + 1);
    else if (direction === 'home') newPos = 0;
    else if (direction === 'end') newPos = len;

    setCursorPos(newPos);
    if (displayInputRef.current) {
      displayInputRef.current.focus({ preventScroll: true });
      displayInputRef.current.setSelectionRange(newPos, newPos);
    }
  };

  // Helper to push state to Undo Stack cleanly with capacity limit
  const pushToUndoStack = useCallback((inputVal: string, cursorVal: number) => {
    setUndoStack(prev => {
      const last = prev[prev.length - 1];
      if (last && last.input === inputVal && last.cursor === cursorVal) {
        return prev;
      }
      const next = [...prev, { input: inputVal, cursor: cursorVal }];
      return next.length > 50 ? next.slice(next.length - 50) : next;
    });
    setRedoStack([]);
  }, []);

  const handleStandardOp = useCallback((char: string) => {
    requestAnimationFrame(() => {
      playClickSound();
    });

    if (char === 'C') {
      setShowAcConfirm(true);
      return;
    }
    
    setCalcInput(prev => {
      if (char === 'Error' || prev === 'Error') {
        setCursorPos(char === 'C' || char === 'Error' ? 0 : char.length);
        return char === 'C' ? '' : char;
      }

      const inputEl = displayInputRef.current;
      let selStart = inputEl ? inputEl.selectionStart ?? cursorPos : cursorPos;
      let selEnd = inputEl ? inputEl.selectionEnd ?? cursorPos : cursorPos;

      if (selStart === null || selStart < 0) selStart = prev.length;
      if (selEnd === null || selEnd < 0) selEnd = prev.length;

      if (char === '⌫') {
        if (selStart !== selEnd) {
          const next = prev.slice(0, selStart) + prev.slice(selEnd);
          pushToUndoStack(prev, selStart);
          const newPos = selStart;
          setCursorPos(newPos);
          setTimeout(() => {
            if (displayInputRef.current) {
              displayInputRef.current.setSelectionRange(newPos, newPos);
              displayInputRef.current.focus({ preventScroll: true });
            }
          }, 0);
          return next;
        } else if (selStart > 0) {
          const next = prev.slice(0, selStart - 1) + prev.slice(selStart);
          pushToUndoStack(prev, selStart);
          const newPos = selStart - 1;
          setCursorPos(newPos);
          setTimeout(() => {
            if (displayInputRef.current) {
              displayInputRef.current.setSelectionRange(newPos, newPos);
              displayInputRef.current.focus({ preventScroll: true });
            }
          }, 0);
          return next;
        }
        return prev;
      }

      // Insert character(s) at current cursor position
      const next = prev.slice(0, selStart) + char + prev.slice(selEnd);
      pushToUndoStack(prev, selStart);
      const newPos = selStart + char.length;
      setCursorPos(newPos);

      setTimeout(() => {
        if (displayInputRef.current) {
          displayInputRef.current.setSelectionRange(newPos, newPos);
          displayInputRef.current.focus({ preventScroll: true });
        }
      }, 0);

      return next;
    });
  }, [playClickSound, cursorPos, pushToUndoStack]);

  // Undo Handler
  const handleUndo = useCallback(() => {
    playClickSound();
    setUndoStack(prevUndo => {
      if (prevUndo.length <= 1) return prevUndo;
      const currentVal = calcInputRef.current;
      const currentCursor = cursorPosRef.current;
      const targetState = prevUndo[prevUndo.length - 2];
      const newUndo = prevUndo.slice(0, prevUndo.length - 1);

      setRedoStack(prevRedo => [...prevRedo, { input: currentVal, cursor: currentCursor }]);
      setCalcInput(targetState.input);
      setCursorPos(targetState.cursor);
      setTimeout(() => {
        if (displayInputRef.current) {
          displayInputRef.current.setSelectionRange(targetState.cursor, targetState.cursor);
          displayInputRef.current.focus({ preventScroll: true });
        }
      }, 0);
      return newUndo;
    });
  }, [playClickSound]);

  // Redo Handler
  const handleRedo = useCallback(() => {
    if (redoStack.length === 0) return;
    playClickSound();
    setRedoStack(prevRedo => {
      if (prevRedo.length === 0) return prevRedo;
      const targetState = prevRedo[prevRedo.length - 1];
      const newRedo = prevRedo.slice(0, prevRedo.length - 1);
      const currentVal = calcInputRef.current;
      const currentCursor = cursorPosRef.current;

      setUndoStack(prevUndo => [...prevUndo, { input: currentVal, cursor: currentCursor }]);
      setCalcInput(targetState.input);
      setCursorPos(targetState.cursor);
      setTimeout(() => {
        if (displayInputRef.current) {
          displayInputRef.current.setSelectionRange(targetState.cursor, targetState.cursor);
          displayInputRef.current.focus({ preventScroll: true });
        }
      }, 0);
      return newRedo;
    });
  }, [playClickSound, redoStack.length]);

  // Core Evaluation and Save Handler
  const saveCalculationRecord = async (formula: string, outcome: string, customName?: string, notes?: string) => {
    const finalName = (customName !== undefined ? customName : activeCalcName).trim();
    const timestampStr = new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true });
    const createdAtMs = Date.now();

    if (finalName) {
      // User HAS provided a name -> Save in Firebase Cloud for 7 days
      try {
        const payload = sanitizeForFirestore({
          name: finalName,
          formula: formula,
          outcome: outcome,
          timestamp: timestampStr,
          createdAt: createdAtMs,
          isPinned: false,
          storage: 'cloud',
          notes: notes || ''
        });

        await addDoc(collection(db, 'calcLedger'), payload);
        triggerToast(`Saved "${finalName}" to Firebase Cloud ☁️`);
      } catch (err) {
        console.error("Failed saving to Firebase Cloud, falling back to local:", err);
        // Fallback to local device storage
        const localLog: CalcLog = {
          id: 'dev_' + createdAtMs + '_' + Math.random().toString(36).substring(2, 6),
          name: finalName,
          formula: formula,
          outcome: outcome,
          timestamp: timestampStr,
          createdAt: createdAtMs,
          isPinned: false,
          storage: 'device',
          notes: notes || ''
        };
        setDeviceHistory(prev => [localLog, ...prev]);
        triggerToast(`Saved "${finalName}" to Local Device 📱`);
      }
    } else {
      // User HAS NOT provided a name -> Save in Local Device Storage only
      const localLog: CalcLog = {
        id: 'dev_' + createdAtMs + '_' + Math.random().toString(36).substring(2, 6),
        name: '',
        formula: formula,
        outcome: outcome,
        timestamp: timestampStr,
        createdAt: createdAtMs,
        isPinned: false,
        storage: 'device',
        notes: notes || ''
      };
      setDeviceHistory(prev => [localLog, ...prev]);
    }
  };

  const handleEvaluateMath = useCallback(() => {
    requestAnimationFrame(() => {
      playClickSound();
    });
    const currentVal = calcInputRef.current;
    if (!currentVal) return;
    try {
      const evalOutcome = evaluateExpression(currentVal);
      
      if (evalOutcome.success && evalOutcome.result !== null) {
        const formattedResult = formatWithPrecision(evalOutcome.result, precisionMode);
        const cleanResultStr = String(evalOutcome.result);

        setRecentLogPreview(`${currentVal} = ${formattedResult}`);
        pushToUndoStack(currentVal, cursorPosRef.current);
        setCalcInput(cleanResultStr);
        setCursorPos(cleanResultStr.length);

        // Save calculation log
        saveCalculationRecord(currentVal, formattedResult, activeCalcName, calcNotesInput);
      } else {
        setCalcInput(evalOutcome.resultStr || 'Error');
      }
    } catch {
      setCalcInput('Error');
    }
  }, [playClickSound, activeCalcName, calcNotesInput, pushToUndoStack, precisionMode]);

  // Advanced Quick GST Addition Helper
  const handleAppendGst = useCallback((rate: number) => {
    playClickSound();
    const currentVal = calcInputRef.current;
    if (!currentVal) return;
    const trimmed = currentVal.replace(/[+\-*\/%.\s]+$/, '');
    const next = `${trimmed} + ${rate}%`;
    pushToUndoStack(currentVal, cursorPosRef.current);
    setCalcInput(next);
    setCursorPos(next.length);
    triggerToast(`Added +${rate}% GST`);
  }, [playClickSound, pushToUndoStack]);

  // Advanced Quick Discount Helper
  const handleAppendDiscount = useCallback((discount: number) => {
    playClickSound();
    const currentVal = calcInputRef.current;
    if (!currentVal) return;
    const trimmed = currentVal.replace(/[+\-*\/%.\s]+$/, '');
    const next = `${trimmed} - ${discount}%`;
    pushToUndoStack(currentVal, cursorPosRef.current);
    setCalcInput(next);
    setCursorPos(next.length);
    triggerToast(`Applied -${discount}% Discount`);
  }, [playClickSound, pushToUndoStack]);

  // Advanced Whole Rupee Rounding Helper
  const handleRoundToRupee = useCallback((mode: 'round' | 'ceil' | 'floor') => {
    playClickSound();
    const currentVal = calcInputRef.current;
    if (!currentVal) return;
    const evalRes = evaluateExpression(currentVal);
    if (evalRes.success && evalRes.result !== null) {
      let rounded: number;
      if (mode === 'ceil') rounded = Math.ceil(evalRes.result);
      else if (mode === 'floor') rounded = Math.floor(evalRes.result);
      else rounded = Math.round(evalRes.result);

      const resStr = String(rounded);
      pushToUndoStack(currentVal, cursorPosRef.current);
      setCalcInput(resStr);
      setCursorPos(resStr.length);
      triggerToast(`Rounded to ₹${rounded}`);
    }
  }, [playClickSound, pushToUndoStack]);

  // Advanced Sign Negation Helper (+/-)
  const handleToggleSign = useCallback(() => {
    playClickSound();
    const currentVal = calcInputRef.current;
    if (!currentVal) return;
    const evalRes = evaluateExpression(currentVal);
    if (evalRes.success && evalRes.result !== null) {
      const negated = normalizeFloat(-evalRes.result, 6);
      const resStr = String(negated);
      pushToUndoStack(currentVal, cursorPosRef.current);
      setCalcInput(resStr);
      setCursorPos(resStr.length);
    }
  }, [playClickSound, pushToUndoStack]);

  // Advanced Square Root Helper (√)
  const handleSquareRoot = useCallback(() => {
    playClickSound();
    const currentVal = calcInputRef.current;
    if (!currentVal) return;
    const evalRes = evaluateExpression(currentVal);
    if (evalRes.success && evalRes.result !== null) {
      if (evalRes.result < 0) {
        triggerToast("Cannot calculate square root of negative value", "error");
        return;
      }
      const sqrtVal = normalizeFloat(Math.sqrt(evalRes.result), 6);
      const resStr = String(sqrtVal);
      pushToUndoStack(currentVal, cursorPosRef.current);
      setCalcInput(resStr);
      setCursorPos(resStr.length);
      triggerToast(`√(${evalRes.result}) = ${resStr}`);
    }
  }, [playClickSound, pushToUndoStack]);

  // Advanced Square Helper (x²)
  const handleSquare = useCallback(() => {
    playClickSound();
    const currentVal = calcInputRef.current;
    if (!currentVal) return;
    const evalRes = evaluateExpression(currentVal);
    if (evalRes.success && evalRes.result !== null) {
      const sqVal = normalizeFloat(evalRes.result * evalRes.result, 6);
      const resStr = String(sqVal);
      pushToUndoStack(currentVal, cursorPosRef.current);
      setCalcInput(resStr);
      setCursorPos(resStr.length);
      triggerToast(`(${evalRes.result})² = ${resStr}`);
    }
  }, [playClickSound, pushToUndoStack]);

  // Advanced Reciprocal Helper (1/x)
  const handleReciprocal = useCallback(() => {
    playClickSound();
    const currentVal = calcInputRef.current;
    if (!currentVal) return;
    const evalRes = evaluateExpression(currentVal);
    if (evalRes.success && evalRes.result !== null) {
      if (evalRes.result === 0) {
        triggerToast("Cannot divide by zero", "error");
        return;
      }
      const recVal = normalizeFloat(1 / evalRes.result, 6);
      const resStr = String(recVal);
      pushToUndoStack(currentVal, cursorPosRef.current);
      setCalcInput(resStr);
      setCursorPos(resStr.length);
      triggerToast(`1 / (${evalRes.result}) = ${resStr}`);
    }
  }, [playClickSound, pushToUndoStack]);

  // Quick Zoom Scale Helpers
  const handleZoomIn = () => {
    playClickSound();
    setLengthPreset('custom');
    setCustomBtnHeight(prev => Math.min(115, prev + 6));
  };

  const handleZoomOut = () => {
    playClickSound();
    setLengthPreset('custom');
    setCustomBtnHeight(prev => Math.max(44, prev - 6));
  };

  // Keyboard shortcut listener for zero latency typing
  useEffect(() => {
    if (activeTab !== 'calculator') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) return;

      if (e.key >= '0' && e.key <= '9') {
        handleStandardOp(e.key);
      } else if (e.key === '.') {
        handleStandardOp('.');
      } else if (e.key === '+') {
        handleStandardOp('+');
      } else if (e.key === '-') {
        handleStandardOp('-');
      } else if (e.key === '*') {
        handleStandardOp('*');
      } else if (e.key === '/') {
        e.preventDefault();
        handleStandardOp('/');
      } else if (e.key === '%') {
        handleStandardOp('%');
      } else if (e.key === 'Backspace') {
        handleStandardOp('⌫');
      } else if (e.key === 'Enter' || e.key === '=') {
        e.preventDefault();
        handleEvaluateMath();
      } else if (e.key === 'Escape' || e.key === 'c' || e.key === 'C') {
        setShowAcConfirm(true);
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTab, handleStandardOp, handleEvaluateMath, handleUndo, handleRedo]);

  const handleMemoryOp = (op: 'M+' | 'M-' | 'MR' | 'MC') => {
    try {
      const currentVal = parseFloat(calcInputRef.current) || 0;
      const memVal = parseFloat(calcMemory) || 0;
      if (op === 'M+') {
        setCalcMemory(String(memVal + currentVal));
        triggerToast(`Memory Added: ₹${currentVal}`);
      } else if (op === 'M-') {
        setCalcMemory(String(memVal - currentVal));
        triggerToast(`Memory Subtracted: -₹${currentVal}`);
      } else if (op === 'MR') {
        pushToUndoStack(calcInputRef.current, cursorPosRef.current);
        setCalcInput(calcMemory);
        setCursorPos(calcMemory.length);
      } else if (op === 'MC') {
        setCalcMemory('0');
        triggerToast("Memory Cleared");
      }
    } catch {}
  };

  // Toggle Pin Status on a calculation
  const handleTogglePin = async (log: CalcLog) => {
    const nextPinned = !log.isPinned;
    if (log.storage === 'cloud' && log.firestoreId) {
      try {
        await updateDoc(doc(db, 'calcLedger', log.firestoreId), { isPinned: nextPinned });
        triggerToast(nextPinned ? "Pinned in Cloud 📌" : "Unpinned from Cloud");
      } catch (err) {
        console.error("Failed toggling pin in Firestore:", err);
      }
    } else {
      setDeviceHistory(prev => prev.map(item => item.id === log.id ? { ...item, isPinned: nextPinned } : item));
      triggerToast(nextPinned ? "Pinned to top 📌" : "Unpinned");
    }
  };

  // Delete a single calculation
  const handleDeleteSingleLog = async (log: CalcLog) => {
    if (log.storage === 'cloud' && log.firestoreId) {
      try {
        await deleteDoc(doc(db, 'calcLedger', log.firestoreId));
        triggerToast("Deleted from Cloud ☁️");
      } catch (err) {
        console.error("Failed deleting log from cloud:", err);
      }
    } else {
      setDeviceHistory(prev => prev.filter(item => item.id !== log.id));
      triggerToast("Deleted from Local Device 📱");
    }
  };

  // Save Edit Changes
  const handleSaveEditLog = async () => {
    if (!editingLog) return;
    const updatedName = editName.trim();
    const updatedFormula = editFormula.trim();
    const updatedOutcome = editOutcome.trim();

    if (editingLog.storage === 'cloud' && editingLog.firestoreId) {
      try {
        await updateDoc(doc(db, 'calcLedger', editingLog.firestoreId), {
          name: updatedName,
          formula: updatedFormula,
          outcome: updatedOutcome
        });
        triggerToast("Updated in Cloud Ledger ☁️");
      } catch (err) {
        console.error("Failed updating cloud log:", err);
      }
    } else {
      // Stored on device
      if (updatedName) {
        // User named this calculation! Promote to Firebase Cloud for 7 days
        try {
          const payload = sanitizeForFirestore({
            name: updatedName,
            formula: updatedFormula,
            outcome: updatedOutcome,
            timestamp: editingLog.timestamp,
            createdAt: editingLog.createdAt || Date.now(),
            isPinned: editingLog.isPinned || false,
            storage: 'cloud',
            notes: editingLog.notes || ''
          });

          await addDoc(collection(db, 'calcLedger'), payload);
          // Remove old local item
          setDeviceHistory(prev => prev.filter(item => item.id !== editingLog.id));
          triggerToast(`Saved "${updatedName}" to Firebase Cloud ☁️`);
        } catch (err) {
          console.error("Cloud save failed, updating locally:", err);
          setDeviceHistory(prev => prev.map(item => item.id === editingLog.id ? {
            ...item,
            name: updatedName,
            formula: updatedFormula,
            outcome: updatedOutcome
          } : item));
          triggerToast("Updated in Local Device 📱");
        }
      } else {
        setDeviceHistory(prev => prev.map(item => item.id === editingLog.id ? {
          ...item,
          name: updatedName,
          formula: updatedFormula,
          outcome: updatedOutcome
        } : item));
        triggerToast("Updated in Local Device 📱");
      }
    }
    setEditingLog(null);
  };

  // Open & Edit calculation in Universal Calculator Display
  const handleEditInCalculator = (log: CalcLog) => {
    const valToLoad = log.formula || log.outcome;
    pushToUndoStack(calcInputRef.current, cursorPosRef.current);
    setCalcInput(valToLoad);
    setCursorPos(valToLoad.length);
    if (log.name) {
      setActiveCalcName(log.name);
    } else {
      setActiveCalcName('');
    }
    setActiveTab('calculator');
    triggerToast(`Loaded "${log.name || log.formula}" into Calculator Display ✏️`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Open Clear History Modal with preset selections
  const handleOpenClearHistoryModal = () => {
    setClearPresetOption('all');
    const allIds = new Set(calcHistory.map(item => item.id));
    setSelectedIdsForClear(allIds);
    setShowClearHistoryModal(true);
  };

  // Change Clear History Preset
  const handlePresetOptionChange = (preset: 'all' | 'except_saved') => {
    setClearPresetOption(preset);
    if (preset === 'all') {
      const allIds = new Set(calcHistory.map(item => item.id));
      setSelectedIdsForClear(allIds);
    } else {
      // "Except Saved": keeps items that have a custom name OR are pinned!
      const idsToClear = new Set(
        calcHistory
          .filter(item => !item.name && !item.isPinned)
          .map(item => item.id)
      );
      setSelectedIdsForClear(idsToClear);
    }
  };

  // Toggle individual item in Clear History checklist
  const handleToggleClearItem = (id: string) => {
    setSelectedIdsForClear(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Execute Clear History for selected items
  const handleConfirmClearSelected = async () => {
    if (selectedIdsForClear.size === 0) {
      setShowClearHistoryModal(false);
      return;
    }

    const idsToDelete = Array.from(selectedIdsForClear);
    let cloudCount = 0;
    let deviceCount = 0;

    for (const id of idsToDelete) {
      const target = calcHistory.find(item => item.id === id);
      if (target) {
        if (target.storage === 'cloud' && target.firestoreId) {
          cloudCount++;
          deleteDoc(doc(db, 'calcLedger', target.firestoreId)).catch(err => {
            console.warn("Error deleting cloud log:", err);
          });
        } else {
          deviceCount++;
        }
      }
    }

    setDeviceHistory(prev => prev.filter(item => !selectedIdsForClear.has(item.id)));
    setShowClearHistoryModal(false);
    triggerToast(`Cleared ${selectedIdsForClear.size} calculations from history`);
  };

  // Cash change calculations
  const changeCalculation = (() => {
    const bill = parseFloat(cashBillTotal) || 0;
    const cash = parseFloat(cashReceived) || 0;
    const change = cash - bill;
    return {
      bill,
      cash,
      change: Math.abs(change),
      isShort: change < 0
    };
  })();

  // Instant Keypad Button Helper for Zero Latency
  const FastKey = ({ 
    label, 
    onPress, 
    className,
    style
  }: { 
    label: React.ReactNode; 
    onPress: () => void; 
    className?: string;
    style?: React.CSSProperties;
  }) => {
    return (
      <button
        type="button"
        style={style}
        onClick={(e) => {
          e.preventDefault();
          onPress();
        }}
        className={cn(
          "select-none cursor-pointer active:scale-95 transition-transform duration-75 touch-manipulation",
          className
        )}
      >
        {label}
      </button>
    );
  };

  return (
    <div className={cn(
      "mx-auto space-y-5 pb-20 transition-all duration-200",
      containerWidthMode === 'full' ? "w-full max-w-none px-2 sm:px-4" :
      containerWidthMode === 'wide' ? "max-w-6xl px-2 sm:px-4" :
      "max-w-4xl px-2 sm:px-4"
    )}>
      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={cn(
              "fixed top-20 right-6 z-[999] px-4 py-2.5 rounded-xl font-black text-xs text-white shadow-xl flex items-center gap-2",
              toast.type === 'error' ? "bg-rose-600" : "bg-emerald-600"
            )}
          >
            <span>{toast.type === 'error' ? '⚠️' : '✨'}</span>
            <span>{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Name Calculation Modal */}
      <AnimatePresence>
        {showNameModal && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[var(--card)] border border-[var(--border)] p-6 rounded-3xl shadow-2xl max-w-md w-full space-y-4 text-left"
            >
              <div className="flex justify-between items-center pb-2 border-b border-[var(--border)]">
                <h3 className="text-sm font-black uppercase text-[var(--foreground)] flex items-center gap-2">
                  <Tag className="text-amber-500" size={18} /> Name Calculation
                </h3>
                <button
                  onClick={() => setShowNameModal(false)}
                  className="p-1 rounded-lg hover:bg-[var(--foreground)]/10 text-[var(--foreground)]/60 cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-xs font-black uppercase text-[var(--foreground)]/70 block mb-1">
                    Calculation Name / Title *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Supplier Invoice #88, Grocery Order, Tax Tally"
                    value={activeCalcName}
                    onChange={e => setActiveCalcName(e.target.value)}
                    className="w-full text-sm font-bold p-3 rounded-2xl border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] focus:border-amber-500"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="text-xs font-black uppercase text-[var(--foreground)]/70 block mb-1">
                    Notes (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Paid via UPI, 5% discount included"
                    value={calcNotesInput}
                    onChange={e => setCalcNotesInput(e.target.value)}
                    className="w-full text-xs font-medium p-3 rounded-2xl border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] focus:border-amber-500"
                  />
                </div>

                <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl text-[11px] text-indigo-400 font-medium space-y-1">
                  <p className="font-bold flex items-center gap-1.5">
                    <Cloud size={14} /> Firebase Cloud Storage (7-Day Ledger)
                  </p>
                  <p className="opacity-90 leading-tight">
                    Named calculations are automatically saved in <strong>Firebase Cloud</strong> for 7 days. After 7 days, they are permanently removed from Cloud and preserved in <strong>Local Device Storage</strong>.
                  </p>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setShowNameModal(false)}
                  className="flex-1 py-3 rounded-xl bg-[var(--foreground)]/5 hover:bg-[var(--foreground)]/10 text-[var(--foreground)] font-mono text-xs font-black cursor-pointer border border-[var(--border)]"
                >
                  CANCEL
                </button>
                <button
                  onClick={() => {
                    setShowNameModal(false);
                    triggerToast(activeCalcName.trim() ? `Set calculation name: "${activeCalcName.trim()}"` : "Calculation unnamed");
                  }}
                  className="flex-1 py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-mono text-xs font-black shadow-md cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Save size={14} /> SAVE NAME
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Calculation Modal */}
      <AnimatePresence>
        {editingLog && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[var(--card)] border border-[var(--border)] p-6 rounded-3xl shadow-2xl max-w-md w-full space-y-4 text-left"
            >
              <div className="flex justify-between items-center pb-2 border-b border-[var(--border)]">
                <h3 className="text-sm font-black uppercase text-[var(--foreground)] flex items-center gap-2">
                  <Edit3 className="text-amber-500" size={18} /> Edit Calculation
                </h3>
                <button
                  onClick={() => setEditingLog(null)}
                  className="p-1 rounded-lg hover:bg-[var(--foreground)]/10 text-[var(--foreground)]/60 cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-xs font-black uppercase text-[var(--foreground)]/70 block mb-1">
                    Calculation Name
                  </label>
                  <input
                    type="text"
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    placeholder="Add or update calculation name..."
                    className="w-full text-xs font-bold p-3 rounded-2xl border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-black uppercase text-[var(--foreground)]/70 block mb-1">
                    Formula Expression
                  </label>
                  <input
                    type="text"
                    value={editFormula}
                    onChange={e => setEditFormula(e.target.value)}
                    className="w-full text-xs font-mono font-bold p-3 rounded-2xl border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-black uppercase text-[var(--foreground)]/70 block mb-1">
                    Total Outcome Amount (₹)
                  </label>
                  <input
                    type="text"
                    value={editOutcome}
                    onChange={e => setEditOutcome(e.target.value)}
                    className="w-full text-sm font-mono font-black p-3 rounded-2xl border border-[var(--border)] bg-[var(--card)] text-emerald-500 focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setEditingLog(null)}
                  className="flex-1 py-3 rounded-xl bg-[var(--foreground)]/5 hover:bg-[var(--foreground)]/10 text-[var(--foreground)] font-mono text-xs font-black cursor-pointer border border-[var(--border)]"
                >
                  CANCEL
                </button>
                <button
                  onClick={handleSaveEditLog}
                  className="flex-1 py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-mono text-xs font-black shadow-md cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Save size={14} /> SAVE CHANGES
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Clear History Multi-Select Modal */}
      <AnimatePresence>
        {showClearHistoryModal && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[var(--card)] border border-[var(--border)] p-6 rounded-3xl shadow-2xl max-w-lg w-full space-y-4 text-left max-h-[90vh] flex flex-col"
            >
              <div className="flex justify-between items-center pb-2 border-b border-[var(--border)]">
                <div className="flex items-center gap-2 text-rose-500 font-black uppercase text-sm">
                  <Trash2 size={20} /> Clear Calculation History
                </div>
                <button
                  onClick={() => setShowClearHistoryModal(false)}
                  className="p-1 rounded-lg hover:bg-[var(--foreground)]/10 text-[var(--foreground)]/60 cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Preset Selection Toggle */}
              <div className="space-y-2">
                <span className="text-xs font-black uppercase text-[var(--foreground)]/70 block">
                  Deletion Preset Option:
                </span>
                <div className="grid grid-cols-2 gap-2 p-1.5 bg-[var(--foreground)]/5 rounded-2xl border border-[var(--border)]">
                  <button
                    type="button"
                    onClick={() => handlePresetOptionChange('all')}
                    className={cn(
                      "py-2.5 px-3 rounded-xl text-xs font-black uppercase transition-all cursor-pointer flex items-center justify-center gap-1.5",
                      clearPresetOption === 'all'
                        ? "bg-rose-500 text-white shadow-md"
                        : "text-[var(--foreground)]/70 hover:text-[var(--foreground)]"
                    )}
                  >
                    <CheckSquare size={14} /> All (Default)
                  </button>

                  <button
                    type="button"
                    onClick={() => handlePresetOptionChange('except_saved')}
                    className={cn(
                      "py-2.5 px-3 rounded-xl text-xs font-black uppercase transition-all cursor-pointer flex items-center justify-center gap-1.5",
                      clearPresetOption === 'except_saved'
                        ? "bg-amber-500 text-white shadow-md"
                        : "text-[var(--foreground)]/70 hover:text-[var(--foreground)]"
                    )}
                  >
                    <Bookmark size={14} /> Except Saved / Pinned
                  </button>
                </div>
              </div>

              {/* Selection Summary and Toggle All */}
              <div className="flex items-center justify-between text-xs font-bold pt-1">
                <span className="text-[var(--foreground)]/70">
                  {selectedIdsForClear.size} of {calcHistory.length} calculations selected
                </span>
                <button
                  type="button"
                  onClick={() => {
                    if (selectedIdsForClear.size === calcHistory.length) {
                      setSelectedIdsForClear(new Set());
                    } else {
                      setSelectedIdsForClear(new Set(calcHistory.map(item => item.id)));
                    }
                  }}
                  className="text-amber-500 hover:underline cursor-pointer"
                >
                  {selectedIdsForClear.size === calcHistory.length ? 'Deselect All' : 'Select All'}
                </button>
              </div>

              {/* Checklist list */}
              <div className="flex-1 overflow-y-auto space-y-2 max-h-[280px] p-1 border border-[var(--border)] rounded-2xl bg-[var(--foreground)]/[0.01]">
                {calcHistory.length === 0 ? (
                  <div className="py-8 text-center text-xs opacity-50 font-bold uppercase">
                    No calculations available
                  </div>
                ) : (
                  calcHistory.map((item, cIdx) => {
                    const isChecked = selectedIdsForClear.has(item.id);
                    return (
                      <div
                        key={`univ-calc-item-${item.id || 'item'}-${cIdx}`}
                        onClick={() => handleToggleClearItem(item.id)}
                        className={cn(
                          "p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all",
                          isChecked
                            ? "bg-rose-500/10 border-rose-500/30 text-[var(--foreground)]"
                            : "bg-[var(--card)] border-[var(--border)] opacity-60 hover:opacity-100"
                        )}
                      >
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5 text-rose-500">
                            {isChecked ? <CheckSquare size={18} /> : <Square size={18} />}
                          </div>
                          <div className="space-y-0.5 text-left">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-black">
                                {item.name ? item.name : 'Unnamed Calculation'}
                              </span>
                              {item.isPinned && (
                                <span className="text-[9px] bg-amber-500/20 text-amber-500 px-1.5 py-0.5 rounded font-bold">
                                  📌 Pinned
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] font-mono text-[var(--foreground)]/70">
                              {item.formula} = <strong className="text-emerald-500">₹{item.outcome}</strong>
                            </div>
                          </div>
                        </div>

                        <div>
                          {item.storage === 'cloud' ? (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center gap-1">
                              <Cloud size={10} /> Cloud
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                              <Smartphone size={10} /> Device
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Action buttons */}
              <div className="grid grid-cols-2 gap-2.5 pt-2">
                <button
                  onClick={() => setShowClearHistoryModal(false)}
                  className="py-3 rounded-xl bg-[var(--foreground)]/5 hover:bg-[var(--foreground)]/10 text-[var(--foreground)] border border-[var(--border)] font-mono text-xs font-black cursor-pointer"
                >
                  CANCEL
                </button>
                <button
                  onClick={handleConfirmClearSelected}
                  disabled={selectedIdsForClear.size === 0}
                  className="py-3 rounded-xl bg-rose-500 hover:bg-rose-600 disabled:opacity-40 text-white font-mono text-xs font-black shadow-md cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Trash2 size={14} /> DELETE ({selectedIdsForClear.size} SELECTED)
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* AC CLEAR Confirmation Popup Modal */}
      <AnimatePresence>
        {showAcConfirm && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[var(--card)] border border-[var(--border)] p-6 rounded-3xl shadow-2xl max-w-sm w-full space-y-4 text-center"
            >
              <div className="h-12 w-12 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto text-xl font-bold">
                <AlertTriangle size={24} />
              </div>
              <div>
                <h3 className="text-base font-black uppercase text-[var(--foreground)]">Clear Display?</h3>
                <p className="text-xs text-[var(--foreground)]/60 font-medium mt-1">
                  Are you sure you want to clear the active calculation display?
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2.5 pt-2 font-mono text-xs font-black">
                <button
                  onClick={() => setShowAcConfirm(false)}
                  className="py-3 rounded-xl bg-[var(--foreground)]/5 hover:bg-[var(--foreground)]/10 text-[var(--foreground)] border border-[var(--border)] cursor-pointer"
                >
                  CANCEL
                </button>
                <button
                  onClick={() => {
                    setShowAcConfirm(false);
                    if (calcInputRef.current) {
                      pushToUndoStack(calcInputRef.current, cursorPosRef.current);
                    }
                    setCalcInput('');
                    setCursorPos(0);
                    setRecentLogPreview('');
                    setActiveCalcName('');
                    setCalcNotesInput('');
                    triggerToast('Display Cleared (Tap Undo to restore)');
                  }}
                  className="py-3 rounded-xl bg-rose-500 hover:bg-rose-600 text-white shadow-md shadow-rose-500/20 cursor-pointer"
                >
                  CONFIRM CLEAR
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Reverse GST Calculator Modal */}
      <AnimatePresence>
        {showReverseGstModal && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[var(--card)] border border-[var(--border)] p-6 rounded-3xl shadow-2xl max-w-md w-full space-y-4 text-left"
            >
              <div className="flex justify-between items-center pb-2 border-b border-[var(--border)]">
                <h3 className="text-sm font-black uppercase text-[var(--foreground)] flex items-center gap-2">
                  <Landmark className="text-amber-500" size={18} /> Reverse GST Tax Calculator
                </h3>
                <button
                  onClick={() => setShowReverseGstModal(false)}
                  className="p-1 rounded-lg hover:bg-[var(--foreground)]/10 text-[var(--foreground)]/60 cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="font-black uppercase text-[var(--foreground)]/70 block mb-1">
                    MRP / Total Inclusive Price (₹)
                  </label>
                  <input
                    type="number"
                    value={reverseGstAmountInput}
                    onChange={e => setReverseGstAmountInput(e.target.value)}
                    placeholder="e.g. 1180"
                    className="w-full text-base font-bold font-mono p-3 rounded-2xl border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] focus:border-amber-500"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="font-black uppercase text-[var(--foreground)]/70 block mb-1.5">
                    Select GST Rate (%)
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {[5, 12, 18, 28].map(rate => (
                      <button
                        key={rate}
                        type="button"
                        onClick={() => setReverseGstRate(rate)}
                        className={cn(
                          "py-2 rounded-xl font-mono text-xs font-black transition-all cursor-pointer border",
                          reverseGstRate === rate
                            ? "bg-amber-500 text-white border-amber-600 shadow-md"
                            : "bg-[var(--foreground)]/5 hover:bg-[var(--foreground)]/10 text-[var(--foreground)] border-[var(--border)]"
                        )}
                      >
                        {rate}%
                      </button>
                    ))}
                  </div>
                </div>

                {/* Live Breakdown Card */}
                {(() => {
                  const inputVal = parseFloat(reverseGstAmountInput) || 0;
                  const gstCalc = calculateGstBreakdown(inputVal, reverseGstRate, 'extract');
                  const halfGst = normalizeFloat(gstCalc.gstAmount / 2, 2);
                  return (
                    <div className="p-4 rounded-2xl bg-[var(--foreground)]/[0.03] border border-[var(--border)] space-y-2 font-mono">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-[var(--foreground)]/70 font-bold">Base Pre-Tax Price:</span>
                        <span className="text-emerald-500 font-black text-sm">₹{gstCalc.baseAmount.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-[var(--foreground)]/70 font-bold">Total GST ({reverseGstRate}%):</span>
                        <span className="text-amber-500 font-black text-sm">₹{gstCalc.gstAmount.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-center text-[11px] text-[var(--foreground)]/60 pl-2">
                        <span>CGST ({(reverseGstRate / 2).toFixed(1)}%):</span>
                        <span>₹{halfGst.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-center text-[11px] text-[var(--foreground)]/60 pl-2">
                        <span>SGST ({(reverseGstRate / 2).toFixed(1)}%):</span>
                        <span>₹{halfGst.toFixed(2)}</span>
                      </div>
                      <div className="pt-2 border-t border-[var(--border)] flex justify-between items-center font-black text-xs text-[var(--foreground)]">
                        <span>Gross MRP:</span>
                        <span>₹{gstCalc.totalAmount.toFixed(2)}</span>
                      </div>
                    </div>
                  );
                })()}
              </div>

              <div className="grid grid-cols-2 gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    const inputVal = parseFloat(reverseGstAmountInput) || 0;
                    const gstCalc = calculateGstBreakdown(inputVal, reverseGstRate, 'extract');
                    const halfGst = normalizeFloat(gstCalc.gstAmount / 2, 2);
                    const breakdownText = `GST Breakdown (${reverseGstRate}%):
Base Pre-Tax: ₹${gstCalc.baseAmount.toFixed(2)}
Total GST: ₹${gstCalc.gstAmount.toFixed(2)} (CGST ₹${halfGst.toFixed(2)} + SGST ₹${halfGst.toFixed(2)})
Total MRP: ₹${gstCalc.totalAmount.toFixed(2)}`;
                    navigator.clipboard.writeText(breakdownText);
                    triggerToast("GST Breakdown copied to clipboard!");
                  }}
                  className="py-3 rounded-xl bg-[var(--foreground)]/5 hover:bg-[var(--foreground)]/10 text-[var(--foreground)] border border-[var(--border)] font-mono text-xs font-black cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Copy size={14} /> COPY TEXT
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const inputVal = parseFloat(reverseGstAmountInput) || 0;
                    const gstCalc = calculateGstBreakdown(inputVal, reverseGstRate, 'extract');
                    const baseStr = String(gstCalc.baseAmount);
                    pushToUndoStack(calcInputRef.current, cursorPosRef.current);
                    setCalcInput(baseStr);
                    setCursorPos(baseStr.length);
                    setShowReverseGstModal(false);
                    triggerToast(`Applied Base Price ₹${baseStr} to Calculator`);
                  }}
                  className="py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-mono text-xs font-black shadow-md cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Check size={14} /> USE BASE PRICE
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Main Header Banner */}
      <div className="bg-gradient-to-r from-amber-500 to-amber-600 text-white p-6 md:p-8 rounded-3xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest bg-white/20 border border-white/20 text-white">
              General Store & POS Tool
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tight leading-none text-white">
            Universal Store Calculator
          </h1>
          <p className="text-xs text-white/90 font-medium mt-1">
            Ultra-fast zero-latency store tallying, cloud-synced ledger, search & cash return assistant.
          </p>
        </div>

        {/* Sub-mode Switchers */}
        <div className="flex items-center gap-2 bg-black/20 p-1.5 rounded-2xl border border-white/20">
          <button
            onClick={() => setActiveTab('calculator')}
            className={cn(
              "px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer",
              activeTab === 'calculator' ? "bg-white text-amber-600 shadow-md" : "text-white/80 hover:text-white"
            )}
          >
            Calculator
          </button>
          <button
            onClick={() => setActiveTab('change')}
            className={cn(
              "px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer",
              activeTab === 'change' ? "bg-white text-amber-600 shadow-md" : "text-white/80 hover:text-white"
            )}
          >
            Cash Return
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={cn(
              "px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5",
              activeTab === 'history' ? "bg-white text-amber-600 shadow-md" : "text-white/80 hover:text-white"
            )}
          >
            <History size={14} /> History Ledger
          </button>
        </div>
      </div>

      {activeTab === 'calculator' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Calculator Screen & Keypad */}
          <div className="lg:col-span-2 bg-[var(--card)] border border-[var(--border)] p-4 sm:p-6 rounded-3xl shadow-lg space-y-4">
            
            {/* Top Toolbar: Sizing & Display Flexibility Bar */}
            <div className="flex items-center justify-between gap-2 p-2 rounded-2xl bg-[var(--foreground)]/[0.03] border border-[var(--border)] flex-wrap">
              {/* Presets & Zoom */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] font-black uppercase text-[var(--foreground)]/60 px-1.5 flex items-center gap-1">
                  <Maximize2 size={12} className="text-amber-500" /> Size:
                </span>
                
                {/* Preset Chips */}
                {(['compact', 'standard', 'large', 'xlarge'] as const).map((preset) => {
                  const labels = { compact: 'Compact', standard: 'Normal', large: 'Large', xlarge: 'Giant POS' };
                  return (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setLengthPreset(preset)}
                      className={cn(
                        "px-2.5 py-1 rounded-xl text-xs font-black transition-all cursor-pointer border",
                        lengthPreset === preset
                          ? "bg-amber-500 text-white border-amber-600 shadow-xs"
                          : "bg-[var(--card)] hover:bg-[var(--foreground)]/5 text-[var(--foreground)] border-[var(--border)]"
                      )}
                      title={`Set button height to ${preset === 'compact' ? '48px' : preset === 'standard' ? '60px' : preset === 'large' ? '74px' : '92px'}`}
                    >
                      {labels[preset]}
                    </button>
                  );
                })}

                {/* Auto Fit Screen */}
                <button
                  type="button"
                  onClick={() => setLengthPreset('screen_fit')}
                  className={cn(
                    "px-2.5 py-1 rounded-xl text-xs font-black transition-all cursor-pointer border flex items-center gap-1",
                    lengthPreset === 'screen_fit'
                      ? "bg-amber-500 text-white border-amber-600 shadow-xs"
                      : "bg-[var(--card)] hover:bg-[var(--foreground)]/5 text-[var(--foreground)] border-[var(--border)]"
                  )}
                  title="Auto-scale buttons to fit your device screen height"
                >
                  <Smartphone size={12} /> Fit Screen
                </button>

                {/* Step Zoom Buttons */}
                <div className="flex items-center ml-1 bg-[var(--card)] rounded-xl border border-[var(--border)] overflow-hidden shadow-xs">
                  <button
                    type="button"
                    onClick={() => handleStepHeight(-6)}
                    className="px-2 py-1 hover:bg-[var(--foreground)]/10 text-xs font-black text-[var(--foreground)] cursor-pointer border-r border-[var(--border)]"
                    title="Decrease button and display size (-6px)"
                  >
                    <ZoomOut size={12} />
                  </button>
                  <span className="px-1.5 text-[10px] font-mono font-bold text-[var(--foreground)]/70">
                    {effectiveBtnHeight}px
                  </span>
                  <button
                    type="button"
                    onClick={() => handleStepHeight(6)}
                    className="px-2 py-1 hover:bg-[var(--foreground)]/10 text-xs font-black text-[var(--foreground)] cursor-pointer border-l border-[var(--border)]"
                    title="Increase button and display size (+6px)"
                  >
                    <ZoomIn size={12} />
                  </button>
                </div>
              </div>

              {/* Action Toggles: Settings, Tools, Audit Tape, Sound */}
              <div className="flex items-center gap-1.5">
                {/* Sound Toggle */}
                <button
                  type="button"
                  onClick={() => {
                    const next = !soundEnabled;
                    setSoundEnabled(next);
                    triggerToast(next ? "Keypad Sound Enabled 🔊" : "Keypad Muted 🔇");
                  }}
                  className={cn(
                    "p-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer",
                    soundEnabled
                      ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30"
                      : "bg-[var(--card)] text-[var(--foreground)]/40 border-[var(--border)]"
                  )}
                  title={soundEnabled ? "Sound Enabled (Click to mute)" : "Muted (Click to enable audio)"}
                >
                  {soundEnabled ? <Volume2 size={15} /> : <VolumeX size={15} />}
                </button>

                {/* Advanced Quick Tools Bar Toggle */}
                <button
                  type="button"
                  onClick={() => setShowAdvancedTools(prev => !prev)}
                  className={cn(
                    "px-2.5 py-1 rounded-xl text-xs font-black uppercase flex items-center gap-1 border transition-all cursor-pointer",
                    showAdvancedTools
                      ? "bg-amber-500 text-white border-amber-600 shadow-xs"
                      : "bg-[var(--card)] hover:bg-[var(--foreground)]/5 text-[var(--foreground)] border-[var(--border)]"
                  )}
                  title="Toggle GST Tax, Discounts & Rounding tools"
                >
                  <Sparkles size={12} />
                  <span className="hidden sm:inline">Quick Tools</span>
                  <span className="sm:hidden">Tools</span>
                </button>

                {/* Audit Tape Toggle */}
                <button
                  type="button"
                  onClick={() => setShowAuditTape(prev => !prev)}
                  className={cn(
                    "px-2.5 py-1 rounded-xl text-xs font-black uppercase flex items-center gap-1 border transition-all cursor-pointer",
                    showAuditTape
                      ? "bg-emerald-600 text-white border-emerald-700 shadow-xs"
                      : "bg-[var(--card)] hover:bg-[var(--foreground)]/5 text-[var(--foreground)] border-[var(--border)]"
                  )}
                  title="Toggle itemized formula breakdown tape"
                >
                  <Receipt size={12} />
                  <span className="hidden sm:inline">Tape</span>
                </button>

                {/* Settings & Precision Drawer Toggle */}
                <button
                  type="button"
                  onClick={() => setShowSizingControls(prev => !prev)}
                  className={cn(
                    "p-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer",
                    showSizingControls
                      ? "bg-amber-500 text-white border-amber-600 shadow-xs"
                      : "bg-[var(--card)] text-[var(--foreground)]/70 hover:text-[var(--foreground)] border-[var(--border)]"
                  )}
                  title="Calculator display sizing & precision settings"
                >
                  <Sliders size={15} />
                </button>
              </div>
            </div>

            {/* Sizing & Precision Drawer (When Expanded) */}
            <AnimatePresence>
              {showSizingControls && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden p-4 rounded-2xl bg-[var(--foreground)]/[0.02] border border-[var(--border)] space-y-4 text-left text-xs"
                >
                  <div className="flex justify-between items-center pb-2 border-b border-[var(--border)]">
                    <span className="font-black uppercase text-[var(--foreground)] flex items-center gap-2">
                      <Sliders size={14} className="text-amber-500" /> Display & Keypad Customizer
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowSizingControls(false)}
                      className="text-[var(--foreground)]/50 hover:text-[var(--foreground)] cursor-pointer"
                    >
                      <X size={14} />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {/* Continuous Button Height Slider */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center">
                        <label className="font-black uppercase text-[var(--foreground)]/70">
                          Button Height: <span className="text-amber-500 font-mono">{effectiveBtnHeight}px</span>
                        </label>
                      </div>
                      <input
                        type="range"
                        min="44"
                        max="110"
                        step="2"
                        value={effectiveBtnHeight}
                        onChange={(e) => {
                          setCustomBtnHeight(Number(e.target.value));
                          setLengthPreset('custom');
                        }}
                        className="w-full accent-amber-500 cursor-pointer"
                      />
                      <div className="flex justify-between text-[10px] text-[var(--foreground)]/40 font-mono">
                        <span>44px (Compact)</span>
                        <span>75px</span>
                        <span>110px (Giant)</span>
                      </div>
                    </div>

                    {/* Width Preset */}
                    <div className="space-y-1.5">
                      <label className="font-black uppercase text-[var(--foreground)]/70 block">
                        Layout Width
                      </label>
                      <div className="grid grid-cols-3 gap-1">
                        {(['standard', 'wide', 'full'] as const).map(w => (
                          <button
                            key={w}
                            type="button"
                            onClick={() => setContainerWidthMode(w)}
                            className={cn(
                              "py-1.5 rounded-xl font-black uppercase text-[10px] border transition-all cursor-pointer",
                              containerWidthMode === w
                                ? "bg-amber-500 text-white border-amber-600 shadow-xs"
                                : "bg-[var(--card)] hover:bg-[var(--foreground)]/5 text-[var(--foreground)] border-[var(--border)]"
                            )}
                          >
                            {w === 'standard' ? 'Normal' : w === 'wide' ? 'Wide' : 'Full'}
                          </button>
                        ))}
                      </div>
                      <p className="text-[10px] text-[var(--foreground)]/50">
                        Adjusts horizontal space for desk or mobile display.
                      </p>
                    </div>

                    {/* Precision Mode */}
                    <div className="space-y-1.5">
                      <label className="font-black uppercase text-[var(--foreground)]/70 block">
                        Decimal Precision
                      </label>
                      <div className="grid grid-cols-4 gap-1">
                        {(['auto', '0', '2', '4'] as const).map(p => (
                          <button
                            key={p}
                            type="button"
                            onClick={() => setPrecisionMode(p)}
                            className={cn(
                              "py-1.5 rounded-xl font-mono font-black text-[10px] border transition-all cursor-pointer",
                              precisionMode === p
                                ? "bg-amber-500 text-white border-amber-600 shadow-xs"
                                : "bg-[var(--card)] hover:bg-[var(--foreground)]/5 text-[var(--foreground)] border-[var(--border)]"
                            )}
                          >
                            {p === 'auto' ? 'Auto' : p === '0' ? '₹0' : p === '2' ? '.00' : '.0000'}
                          </button>
                        ))}
                      </div>
                      <p className="text-[10px] text-[var(--foreground)]/50">
                        Controls rounding precision on = evaluate.
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Advanced Store Tools Bar (When Expanded) */}
            <AnimatePresence>
              {showAdvancedTools && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden p-3 rounded-2xl bg-amber-500/5 border border-amber-500/20 space-y-2.5 text-left"
                >
                  {/* GST Tax Row */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] font-black uppercase text-amber-600 dark:text-amber-400 min-w-[70px] flex items-center gap-1">
                      <Landmark size={12} /> Add GST:
                    </span>
                    {[5, 12, 18, 28].map(gst => (
                      <button
                        key={gst}
                        type="button"
                        onClick={() => handleAddGst(gst)}
                        className="px-2.5 py-1 rounded-xl bg-[var(--card)] hover:bg-amber-500 hover:text-white text-amber-700 dark:text-amber-300 border border-amber-500/30 text-xs font-black font-mono transition-all cursor-pointer shadow-xs active:scale-95"
                      >
                        +{gst}% GST
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => {
                        setReverseGstAmountInput(calcInput || '1000');
                        setShowReverseGstModal(true);
                      }}
                      className="px-2.5 py-1 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-black uppercase transition-all cursor-pointer shadow-xs flex items-center gap-1 ml-auto"
                    >
                      <Search size={11} /> Reverse GST (MRP)
                    </button>
                  </div>

                  {/* Discounts Row */}
                  <div className="flex items-center gap-1.5 flex-wrap pt-1.5 border-t border-amber-500/15">
                    <span className="text-[10px] font-black uppercase text-amber-600 dark:text-amber-400 min-w-[70px] flex items-center gap-1">
                      <Percent size={12} /> Discount:
                    </span>
                    {[5, 10, 15, 20, 25, 50].map(disc => (
                      <button
                        key={disc}
                        type="button"
                        onClick={() => handleApplyDiscount(disc)}
                        className="px-2.5 py-1 rounded-xl bg-[var(--card)] hover:bg-emerald-600 hover:text-white text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-xs font-black font-mono transition-all cursor-pointer shadow-xs active:scale-95"
                      >
                        -{disc}%
                      </button>
                    ))}
                  </div>

                  {/* Quick Rounding & Extra Math Row */}
                  <div className="flex items-center gap-1.5 flex-wrap pt-1.5 border-t border-amber-500/15">
                    <span className="text-[10px] font-black uppercase text-amber-600 dark:text-amber-400 min-w-[70px] flex items-center gap-1">
                      <Coins size={12} /> Rounding:
                    </span>
                    <button
                      type="button"
                      onClick={() => handleQuickRounding('round')}
                      className="px-2.5 py-1 rounded-xl bg-[var(--card)] hover:bg-[var(--foreground)]/10 text-[var(--foreground)] border border-[var(--border)] text-xs font-black font-mono transition-all cursor-pointer"
                    >
                      Round ₹
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickRounding('ceil')}
                      className="px-2.5 py-1 rounded-xl bg-[var(--card)] hover:bg-[var(--foreground)]/10 text-[var(--foreground)] border border-[var(--border)] text-xs font-black font-mono transition-all cursor-pointer"
                    >
                      Ceil ↑
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickRounding('floor')}
                      className="px-2.5 py-1 rounded-xl bg-[var(--card)] hover:bg-[var(--foreground)]/10 text-[var(--foreground)] border border-[var(--border)] text-xs font-black font-mono transition-all cursor-pointer"
                    >
                      Floor ↓
                    </button>

                    <div className="flex items-center gap-1 ml-auto">
                      <button
                        type="button"
                        onClick={handleNegate}
                        className="px-2 py-1 rounded-xl bg-[var(--card)] hover:bg-[var(--foreground)]/10 text-[var(--foreground)] border border-[var(--border)] text-xs font-black font-mono transition-all cursor-pointer"
                        title="Toggle positive/negative (+/-)"
                      >
                        ±
                      </button>
                      <button
                        type="button"
                        onClick={handleSquareRoot}
                        className="px-2 py-1 rounded-xl bg-[var(--card)] hover:bg-[var(--foreground)]/10 text-[var(--foreground)] border border-[var(--border)] text-xs font-black font-mono transition-all cursor-pointer"
                        title="Square Root (√x)"
                      >
                        √
                      </button>
                      <button
                        type="button"
                        onClick={handleSquare}
                        className="px-2 py-1 rounded-xl bg-[var(--card)] hover:bg-[var(--foreground)]/10 text-[var(--foreground)] border border-[var(--border)] text-xs font-black font-mono transition-all cursor-pointer"
                        title="Square (x²)"
                      >
                        x²
                      </button>
                      <button
                        type="button"
                        onClick={handleReciprocal}
                        className="px-2 py-1 rounded-xl bg-[var(--card)] hover:bg-[var(--foreground)]/10 text-[var(--foreground)] border border-[var(--border)] text-xs font-black font-mono transition-all cursor-pointer"
                        title="Reciprocal (1/x)"
                      >
                        1/x
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Live Audit Tape Drawer (When Expanded) */}
            <AnimatePresence>
              {showAuditTape && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden p-4 rounded-2xl bg-zinc-900 border border-zinc-700 text-left space-y-3"
                >
                  <div className="flex justify-between items-center text-xs font-mono text-zinc-300 pb-2 border-b border-zinc-800">
                    <span className="font-bold flex items-center gap-1.5 text-amber-400">
                      <Receipt size={14} /> Itemized Audit Tally Tape
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const stats = extractFormulaStatistics(calcInput);
                          let text = `--- AUDIT TAPE ---\n`;
                          let running = 0;
                          stats.items.forEach((amt, idx) => {
                            running += amt;
                            text += `#${idx + 1}: ₹${amt.toFixed(2)} (Subtotal: ₹${running.toFixed(2)})\n`;
                          });
                          text += `Total: ₹${stats.total.toFixed(2)} (${stats.count} items)\n`;
                          navigator.clipboard.writeText(text);
                          triggerToast("Audit Tape copied to clipboard!");
                        }}
                        className="text-[10px] px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 cursor-pointer flex items-center gap-1"
                      >
                        <Copy size={10} /> Copy Tape
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowAuditTape(false)}
                        className="text-zinc-500 hover:text-white cursor-pointer"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>

                  {(() => {
                    const stats = extractFormulaStatistics(calcInput);
                    if (stats.count === 0) {
                      return (
                        <div className="text-center py-4 text-xs font-mono text-zinc-500">
                          Enter numbers and operators (e.g. 150 + 280 + 95) to see live itemized tally breakdown.
                        </div>
                      );
                    }
                    let runningSub = 0;
                    return (
                      <div className="space-y-3 font-mono text-xs">
                        <div className="max-h-36 overflow-y-auto space-y-1 pr-1">
                          {stats.items.map((amt, idx) => {
                            runningSub += amt;
                            return (
                              <div key={idx} className="flex justify-between items-center text-zinc-300 py-0.5 border-b border-zinc-800/60">
                                <span className="text-zinc-500 text-[11px]">#{idx + 1}</span>
                                <span className="text-amber-300 font-bold">₹{amt.toFixed(2)}</span>
                                <span className="text-zinc-400 text-[11px]">Running: ₹{runningSub.toFixed(2)}</span>
                              </div>
                            );
                          })}
                        </div>

                        {/* Summary Statistics Card */}
                        <div className="grid grid-cols-4 gap-2 pt-2 border-t border-zinc-800 text-[11px]">
                          <div className="bg-zinc-800/60 p-2 rounded-xl text-center">
                            <span className="text-zinc-400 block text-[9px] uppercase font-sans">Total</span>
                            <span className="text-emerald-400 font-bold">₹{stats.total.toFixed(2)}</span>
                          </div>
                          <div className="bg-zinc-800/60 p-2 rounded-xl text-center">
                            <span className="text-zinc-400 block text-[9px] uppercase font-sans">Items</span>
                            <span className="text-amber-400 font-bold">{stats.count}</span>
                          </div>
                          <div className="bg-zinc-800/60 p-2 rounded-xl text-center">
                            <span className="text-zinc-400 block text-[9px] uppercase font-sans">Average</span>
                            <span className="text-zinc-200 font-bold">₹{stats.average.toFixed(2)}</span>
                          </div>
                          <div className="bg-zinc-800/60 p-2 rounded-xl text-center">
                            <span className="text-zinc-400 block text-[9px] uppercase font-sans">Min / Max</span>
                            <span className="text-zinc-300 font-bold text-[10px]">₹{stats.min} / ₹{stats.max}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Digital LED Display (Length/Height Responsive) */}
            <div 
              className="bg-zinc-950 text-emerald-400 rounded-2xl border border-zinc-800 space-y-2 shadow-inner transition-all duration-150"
              style={{ padding: `${Math.max(16, Math.floor(effectiveBtnHeight * 0.28))}px` }}
            >
              <div className="flex justify-between items-center text-xs font-sans">
                {/* Left side: Name button */}
                {activeCalcName ? (
                  <div className="flex items-center gap-1.5 bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2.5 py-1 rounded-lg text-xs font-bold">
                    <Tag size={12} />
                    <span className="truncate max-w-[150px]">{activeCalcName}</span>
                    <button
                      type="button"
                      onClick={() => setShowNameModal(true)}
                      className="ml-1 text-amber-400 hover:text-white cursor-pointer"
                      title="Edit Name"
                    >
                      <Edit3 size={11} />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowNameModal(true)}
                    className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all h-[26px]"
                  >
                    <Tag size={12} />
                    <span>+ Name</span>
                  </button>
                )}

                {/* Right side: Live prospective calculation preview, item counter & memory indicator */}
                <div className="flex items-center gap-2">
                  {/* Live Prospective Evaluation Preview */}
                  {livePreview && (
                    <span 
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-xs font-mono font-bold select-none"
                      title="Real-time prospective calculation result"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      = ₹{livePreview.formatted}
                    </span>
                  )}

                  {/* LIVE ITEM COUNTER BADGE */}
                  <div 
                    id="universal-calc-item-counter-badge"
                    className={cn(
                      "flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-black tracking-wide transition-all border shadow-xs select-none",
                      calcItemCount > 0 
                        ? "bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-amber-500/10" 
                        : "bg-zinc-800/80 text-zinc-400 border-zinc-700/50 opacity-70"
                    )}
                    title="Live Item Counter: Number of numeric entries included in current calculation"
                  >
                    <Layers size={13} className={calcItemCount > 0 ? "text-amber-400" : "text-zinc-500"} />
                    <span>{formatItemCountLabel(calcItemCount)}</span>
                  </div>

                  {parseFloat(calcMemory) !== 0 && (
                    <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-1 rounded-lg text-[10px] font-bold">
                      M+ ₹{calcMemory}
                    </span>
                  )}
                </div>
              </div>

              {/* Formula & Status Preview */}
              <div className="text-right text-xs text-zinc-400 font-bold truncate min-h-[18px]">
                {recentLogPreview || (calcInput ? 'Tap display to position cursor with finger' : 'Ready')}
              </div>

              {/* Main Editable Display with Dynamic Typography */}
              <div className={cn(
                "flex items-center justify-end font-black font-mono tracking-tight text-emerald-400 pt-1 transition-all",
                effectiveBtnHeight >= 85 ? "text-5xl md:text-6xl" :
                effectiveBtnHeight >= 68 ? "text-4xl md:text-5xl" :
                "text-3xl md:text-4xl"
              )}>
                <span className={cn(
                  "mr-1 select-none text-emerald-500/60 font-mono transition-all",
                  effectiveBtnHeight >= 85 ? "text-3xl md:text-4xl" :
                  effectiveBtnHeight >= 68 ? "text-2xl md:text-3xl" :
                  "text-xl md:text-2xl"
                )}>₹</span>
                <input
                  ref={displayInputRef}
                  type="text"
                  inputMode="none"
                  value={calcInput}
                  onChange={(e) => {
                    const nextVal = e.target.value;
                    pushToUndoStack(calcInputRef.current, cursorPosRef.current);
                    setCalcInput(nextVal);
                  }}
                  onClick={handleSelectionChange}
                  onKeyUp={handleSelectionChange}
                  onSelect={handleSelectionChange}
                  className="w-full bg-transparent text-emerald-400 font-black font-mono focus:outline-none caret-amber-400 text-right selection:bg-amber-500/30 tracking-tight"
                  placeholder="0"
                />
              </div>
            </div>

            {/* Main Keypad Grid - Flexible Height & Zero Latency */}
            <div className="grid grid-cols-4 gap-2 sm:gap-3 font-mono">
              <FastKey
                label="AC CLEAR"
                onPress={() => handleStandardOp('C')}
                style={{ height: `${effectiveBtnHeight}px` }}
                className={cn(
                  "w-full rounded-2xl bg-rose-500/10 hover:bg-rose-500 hover:text-white text-rose-600 border border-rose-500/20 font-black uppercase flex items-center justify-center transition-all",
                  effectiveBtnHeight >= 80 ? "text-sm sm:text-base" : "text-xs"
                )}
              />
              <FastKey
                label="⌫"
                onPress={() => handleStandardOp('⌫')}
                style={{ height: `${effectiveBtnHeight}px` }}
                className={cn(
                  "w-full rounded-2xl bg-[var(--foreground)]/5 hover:bg-[var(--foreground)]/10 text-[var(--foreground)] border border-[var(--border)] flex items-center justify-center transition-all font-black",
                  effectiveBtnHeight >= 80 ? "text-2xl" : "text-xl"
                )}
              />
              <FastKey
                label="%"
                onPress={() => handleStandardOp('%')}
                style={{ height: `${effectiveBtnHeight}px` }}
                className={cn(
                  "w-full rounded-2xl bg-[var(--foreground)]/5 hover:bg-[var(--foreground)]/10 text-[var(--foreground)] border border-[var(--border)] flex items-center justify-center transition-all font-black",
                  effectiveBtnHeight >= 80 ? "text-2xl" : "text-xl"
                )}
              />
              <FastKey
                label="÷"
                onPress={() => handleStandardOp('/')}
                style={{ height: `${effectiveBtnHeight}px` }}
                className={cn(
                  "w-full rounded-2xl bg-amber-500/10 hover:bg-amber-500 hover:text-white text-amber-600 border border-amber-500/20 flex items-center justify-center transition-all font-black",
                  effectiveBtnHeight >= 80 ? "text-3xl" : "text-2xl"
                )}
              />

              {['7', '8', '9'].map(n => (
                <FastKey
                  key={n}
                  label={n}
                  onPress={() => handleStandardOp(n)}
                  style={{ height: `${effectiveBtnHeight}px` }}
                  className={cn(
                    "w-full rounded-2xl bg-[var(--card)] hover:bg-[var(--foreground)]/5 text-[var(--foreground)] border border-[var(--border)] shadow-xs flex items-center justify-center transition-all font-black",
                    effectiveBtnHeight >= 85 ? "text-3xl" : effectiveBtnHeight >= 68 ? "text-2xl" : "text-xl"
                  )}
                />
              ))}
              <FastKey
                label="×"
                onPress={() => handleStandardOp('*')}
                style={{ height: `${effectiveBtnHeight}px` }}
                className={cn(
                  "w-full rounded-2xl bg-amber-500/10 hover:bg-amber-500 hover:text-white text-amber-600 border border-amber-500/20 flex items-center justify-center transition-all font-black",
                  effectiveBtnHeight >= 80 ? "text-3xl" : "text-2xl"
                )}
              />

              {['4', '5', '6'].map(n => (
                <FastKey
                  key={n}
                  label={n}
                  onPress={() => handleStandardOp(n)}
                  style={{ height: `${effectiveBtnHeight}px` }}
                  className={cn(
                    "w-full rounded-2xl bg-[var(--card)] hover:bg-[var(--foreground)]/5 text-[var(--foreground)] border border-[var(--border)] shadow-xs flex items-center justify-center transition-all font-black",
                    effectiveBtnHeight >= 85 ? "text-3xl" : effectiveBtnHeight >= 68 ? "text-2xl" : "text-xl"
                  )}
                />
              ))}
              <FastKey
                label="-"
                onPress={() => handleStandardOp('-')}
                style={{ height: `${effectiveBtnHeight}px` }}
                className={cn(
                  "w-full rounded-2xl bg-amber-500/10 hover:bg-amber-500 hover:text-white text-amber-600 border border-amber-500/20 flex items-center justify-center transition-all font-black",
                  effectiveBtnHeight >= 80 ? "text-3xl" : "text-2xl"
                )}
              />

              {['1', '2', '3'].map(n => (
                <FastKey
                  key={n}
                  label={n}
                  onPress={() => handleStandardOp(n)}
                  style={{ height: `${effectiveBtnHeight}px` }}
                  className={cn(
                    "w-full rounded-2xl bg-[var(--card)] hover:bg-[var(--foreground)]/5 text-[var(--foreground)] border border-[var(--border)] shadow-xs flex items-center justify-center transition-all font-black",
                    effectiveBtnHeight >= 85 ? "text-3xl" : effectiveBtnHeight >= 68 ? "text-2xl" : "text-xl"
                  )}
                />
              ))}
              <FastKey
                label="+"
                onPress={() => handleStandardOp('+')}
                style={{ height: `${effectiveBtnHeight}px` }}
                className={cn(
                  "w-full rounded-2xl bg-amber-500/10 hover:bg-amber-500 hover:text-white text-amber-600 border border-amber-500/20 flex items-center justify-center transition-all font-black",
                  effectiveBtnHeight >= 80 ? "text-3xl" : "text-2xl"
                )}
              />

              <FastKey
                label="0"
                onPress={() => handleStandardOp('0')}
                style={{ height: `${effectiveBtnHeight}px` }}
                className={cn(
                  "w-full rounded-2xl bg-[var(--card)] hover:bg-[var(--foreground)]/5 text-[var(--foreground)] border border-[var(--border)] shadow-xs flex items-center justify-center transition-all font-black",
                  effectiveBtnHeight >= 85 ? "text-3xl" : effectiveBtnHeight >= 68 ? "text-2xl" : "text-xl"
                )}
              />
              <FastKey
                label="00"
                onPress={() => handleStandardOp('00')}
                style={{ height: `${effectiveBtnHeight}px` }}
                className={cn(
                  "w-full rounded-2xl bg-[var(--card)] hover:bg-[var(--foreground)]/5 text-[var(--foreground)] border border-[var(--border)] shadow-xs flex items-center justify-center transition-all font-black",
                  effectiveBtnHeight >= 85 ? "text-2xl" : effectiveBtnHeight >= 68 ? "text-xl" : "text-lg"
                )}
              />
              <FastKey
                label="."
                onPress={() => handleStandardOp('.')}
                style={{ height: `${effectiveBtnHeight}px` }}
                className={cn(
                  "w-full rounded-2xl bg-[var(--card)] hover:bg-[var(--foreground)]/5 text-[var(--foreground)] border border-[var(--border)] shadow-xs flex items-center justify-center transition-all font-black",
                  effectiveBtnHeight >= 80 ? "text-3xl" : "text-2xl"
                )}
              />
              <FastKey
                label="="
                onPress={handleEvaluateMath}
                style={{ height: `${effectiveBtnHeight}px` }}
                className={cn(
                  "w-full rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-black shadow-lg shadow-amber-500/20 flex items-center justify-center transition-all",
                  effectiveBtnHeight >= 80 ? "text-3xl" : "text-2xl"
                )}
              />
            </div>

            {/* Memory & Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-[var(--border)] flex-wrap gap-2">
              <div className="flex items-center gap-1.5 text-xs font-black">
                <button onClick={() => handleMemoryOp('M+')} className="px-2.5 py-1.5 rounded-xl bg-[var(--foreground)]/5 hover:bg-[var(--foreground)]/10 cursor-pointer transition-all">M+</button>
                <button onClick={() => handleMemoryOp('M-')} className="px-2.5 py-1.5 rounded-xl bg-[var(--foreground)]/5 hover:bg-[var(--foreground)]/10 cursor-pointer transition-all">M-</button>
                <button onClick={() => handleMemoryOp('MR')} className="px-2.5 py-1.5 rounded-xl bg-[var(--foreground)]/5 hover:bg-[var(--foreground)]/10 cursor-pointer transition-all">MR</button>

                {/* Undo & Redo buttons IN FRONT OF MC with NO TEXT (icon only) */}
                <button
                  onClick={handleUndo}
                  disabled={undoStack.length <= 1}
                  className={cn(
                    "p-2 rounded-xl text-xs font-black flex items-center justify-center transition-all cursor-pointer border",
                    undoStack.length > 1
                      ? "bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 border-amber-500/30 active:scale-95 shadow-xs"
                      : "bg-[var(--foreground)]/5 text-[var(--foreground)]/30 border-transparent cursor-not-allowed opacity-50"
                  )}
                  title="Undo (Ctrl+Z)"
                >
                  <Undo size={15} />
                </button>

                <button
                  onClick={handleRedo}
                  disabled={redoStack.length === 0}
                  className={cn(
                    "p-2 rounded-xl text-xs font-black flex items-center justify-center transition-all cursor-pointer border",
                    redoStack.length > 0
                      ? "bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 border-amber-500/30 active:scale-95 shadow-xs"
                      : "bg-[var(--foreground)]/5 text-[var(--foreground)]/30 border-transparent cursor-not-allowed opacity-50"
                  )}
                  title="Redo (Ctrl+Y)"
                >
                  <Redo size={15} />
                </button>

                <button onClick={() => handleMemoryOp('MC')} className="px-2.5 py-1.5 rounded-xl bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 cursor-pointer transition-all">MC</button>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(calcInput || '0');
                    triggerToast(`Copied "₹${calcInput || '0'}" to clipboard`);
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-amber-500 text-white font-black text-xs uppercase flex items-center gap-1.5 shadow-md cursor-pointer hover:bg-amber-600 transition-all active:scale-95"
                  title="Copy result"
                >
                  <Copy size={14} /> Copy
                </button>
              </div>
            </div>
          </div>

          {/* Sidebar Quick Ledger Preview */}
          <div 
            className="bg-[var(--card)] border border-[var(--border)] rounded-3xl shadow-lg space-y-4 flex flex-col"
            style={{ marginBottom: '-5px', marginTop: '-3px', marginRight: '-4px', marginLeft: '-5px', paddingBottom: '12px', paddingTop: '21px', paddingRight: '16px', paddingLeft: '13px' }}
          >
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
              <span className="text-xs font-black uppercase text-[var(--foreground)] flex items-center gap-2 mr-[12px] pl-[5px]">
                <History size={20} className="text-amber-500 w-[20px] h-[20px]" /> Recent Tally Ledger
              </span>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-[var(--foreground)]/50 w-[40.7px]">{calcHistory.length} logs</span>
                {calcHistory.length > 0 && (
                  <button
                    onClick={handleOpenClearHistoryModal}
                    className="px-2 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500 hover:text-white text-rose-500 text-[10px] font-bold uppercase transition-all cursor-pointer border border-rose-500/20 flex items-center gap-1 h-[24px] w-[79.5px] justify-center"
                    title="Clear History"
                  >
                    <Trash2 size={11} /> Clear
                  </button>
                )}
              </div>
            </div>

            {/* Search Input Button */}
            <div className="relative">
              <Search className="absolute left-3 top-2.5 text-[var(--foreground)]/40" size={14} />
              <input
                type="text"
                placeholder="🔎 Search by name or amount..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{ backgroundColor: '#ffffff', borderRadius: '21.5px', fontStyle: 'normal', fontWeight: 'bold', color: '#3d3a3a', paddingLeft: '28.5px', paddingRight: '9.5px', paddingTop: '6px', paddingBottom: '7px', marginLeft: '-2px', marginRight: '2px', marginTop: '0px', marginBottom: '7px' }}
                className="w-full text-xs border border-[var(--border)] focus:border-amber-500 focus:outline-none"
              />
            </div>

            <div className="flex-1 space-y-2 overflow-y-auto h-[246px] max-h-[380px]">
              {filteredHistory.length === 0 ? (
                <div className="text-center py-12 opacity-50 text-xs font-bold uppercase">
                  No calculations found
                </div>
              ) : (
                filteredHistory.slice(0, 15).map(log => (
                  <div
                    key={log.id}
                    style={{ height: '111px', paddingLeft: '10.5px', paddingRight: '6.5px', paddingTop: '11.5px', paddingBottom: '6.5px', marginLeft: '1px', marginRight: '1px', marginTop: '1px', marginBottom: '1px' }}
                    className={cn(
                      "rounded-2xl border transition-all space-y-1.5 text-left relative group",
                      log.isPinned 
                        ? "bg-amber-500/5 border-amber-500/30" 
                        : "bg-[var(--foreground)]/[0.02] border-[var(--border)] hover:border-amber-500"
                    )}
                  >
                    <div className="flex justify-between items-center text-[10px] font-mono">
                      <div className="flex items-center gap-1">
                        {log.name ? (
                          <button
                            onClick={() => {
                              setEditingLog(log);
                              setEditName(log.name || '');
                              setEditFormula(log.formula);
                              setEditOutcome(log.outcome);
                            }}
                            className="font-bold text-[var(--foreground)] hover:text-amber-500 truncate max-w-[120px] cursor-pointer"
                            title="Click to rename"
                          >
                            🏷️ {log.name}
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              setEditingLog(log);
                              setEditName('');
                              setEditFormula(log.formula);
                              setEditOutcome(log.outcome);
                            }}
                            className="text-[9px] font-bold bg-amber-500/10 hover:bg-amber-500 hover:text-white text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded-md border border-amber-500/30 transition-all cursor-pointer flex items-center gap-1"
                            title="Click to give this calculation a name"
                          >
                            <Tag size={10} /> + Name
                          </button>
                        )}
                        {log.isPinned && (
                          <span className="text-amber-500" title="Pinned">📌</span>
                        )}
                      </div>

                      {/* Item Count & Storage Info Badge */}
                      <div className="flex items-center gap-1.5">
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-amber-500/15 text-amber-600 dark:text-amber-300 border border-amber-500/30 flex items-center gap-1">
                          <Layers size={9} className="text-amber-500" />
                          {formatItemCountLabel(countNumericEntries(log.formula))}
                        </span>
                        {log.storage === 'cloud' ? (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-indigo-500/15 text-indigo-400 border border-indigo-500/30 flex items-center gap-0.5">
                            <Cloud size={9} /> Cloud
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-0.5">
                            <Smartphone size={9} /> Device
                          </span>
                        )}
                      </div>
                    </div>

                    <div
                      onClick={() => handleEditInCalculator(log)}
                      className="cursor-pointer space-y-0.5 group-hover:opacity-90 overflow-hidden"
                      title="Click to load into Universal Calculator Display"
                    >
                      <div 
                        className="text-[11px] font-mono opacity-60 truncate"
                        style={{ marginRight: '1px', marginLeft: '2px', marginTop: '-1px', marginBottom: '2.75px', height: '17.9px' }}
                      >
                        {log.formula}
                      </div>
                      <div 
                        className="text-sm font-black font-mono text-emerald-500"
                        style={{ paddingLeft: '-5px', paddingRight: '-19px', marginLeft: '2px', marginRight: '30px', marginTop: '-7px', marginBottom: '9px', paddingBottom: '-5px', paddingTop: '0px', height: '18.9px' }}
                      >
                        = ₹{log.outcome}
                      </div>
                    </div>

                    {/* Quick action buttons */}
                    <div 
                      className="flex justify-between items-center border-t border-[var(--border)]/50 text-[10px]"
                      style={{ marginTop: '8px', paddingLeft: '0px', paddingTop: '0px' }}
                    >
                      <span className="opacity-40 pl-[1px] pr-0 ml-[7px] mr-[-39px] mt-[0px] mb-[-3px] pt-0 inline-block">{log.timestamp}</span>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleTogglePin(log)}
                          className={cn(
                            "p-1 rounded hover:bg-[var(--foreground)]/10 cursor-pointer",
                            log.isPinned ? "text-amber-500 font-bold" : "text-[var(--foreground)]/40"
                          )}
                          title={log.isPinned ? "Unpin" : "Pin to top"}
                        >
                          <Pin size={11} className="w-[16px] h-[18px]" />
                        </button>

                        <button
                          onClick={() => handleEditInCalculator(log)}
                          className="px-1.5 py-0.5 rounded bg-amber-500/10 hover:bg-amber-500 hover:text-white text-amber-600 dark:text-amber-400 cursor-pointer font-bold text-[9px] flex items-center gap-1"
                          title="Open calculation in Universal Calculator Display"
                        >
                          <Edit3 size={10} /> Edit
                        </button>

                        <button
                          onClick={() => handleDeleteSingleLog(log)}
                          className="p-1 rounded hover:bg-rose-500/10 text-rose-500 cursor-pointer"
                          title="Delete"
                        >
                          <Trash2 size={11} className="w-[18px] h-[20px]" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'change' && (
        <div className="bg-[var(--card)] border border-[var(--border)] p-8 rounded-3xl shadow-xl max-w-2xl mx-auto space-y-6 text-left">
          <div className="space-y-1">
            <h3 className="text-lg font-black uppercase text-[var(--foreground)] flex items-center gap-2">
              <ArrowRightLeft className="text-amber-500" size={20} /> Cash Change Return Assistant
            </h3>
            <p className="text-xs text-[var(--foreground)]/60 font-medium">
              Calculate exact cash change to hand back to customer during cash transactions.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-black uppercase text-[var(--foreground)]/60 block mb-1">
                Total Bill Amount (₹)
              </label>
              <input
                type="number"
                placeholder="e.g. 340"
                value={cashBillTotal}
                onChange={e => setCashBillTotal(e.target.value)}
                className="w-full text-base font-bold font-mono p-3.5 rounded-2xl border border-[var(--border)] bg-[var(--card)] focus:border-amber-500"
              />
            </div>

            <div>
              <label className="text-xs font-black uppercase text-[var(--foreground)]/60 block mb-1">
                Cash Received from Customer (₹)
              </label>
              <input
                type="number"
                placeholder="e.g. 500"
                value={cashReceived}
                onChange={e => setCashReceived(e.target.value)}
                className="w-full text-base font-bold font-mono p-3.5 rounded-2xl border border-[var(--border)] bg-[var(--card)] focus:border-amber-500"
              />
            </div>
          </div>

          {/* Denomination quick fillers */}
          <div>
            <span className="text-[10px] font-black uppercase text-[var(--foreground)]/60 block mb-2">
              Quick Fill Received Cash
            </span>
            <div className="flex gap-2">
              {[100, 200, 500, 2000].map(denom => (
                <button
                  key={denom}
                  onClick={() => setCashReceived(String(denom))}
                  className="px-4 py-2 rounded-xl bg-[var(--foreground)]/5 hover:bg-[var(--foreground)]/10 text-xs font-black font-mono cursor-pointer"
                >
                  ₹{denom}
                </button>
              ))}
              <button
                onClick={() => setCashReceived(cashBillTotal)}
                className="px-4 py-2 rounded-xl bg-amber-500 text-white text-xs font-black uppercase cursor-pointer"
              >
                Exact Cash
              </button>
            </div>
          </div>

          {/* Outcome Card */}
          <div className={cn(
            "p-6 rounded-2xl border text-center space-y-1 shadow-inner",
            changeCalculation.isShort 
              ? "bg-rose-500/10 border-rose-500/30 text-rose-600" 
              : "bg-emerald-500/10 border-emerald-500/30 text-emerald-600"
          )}>
            <span className="text-xs font-black uppercase tracking-wider block opacity-80">
              {changeCalculation.isShort ? "⚠️ Customer Shortage (Balance Due)" : "✨ Cash Change to Return to Customer"}
            </span>
            <div className="text-4xl font-black font-mono">
              ₹{changeCalculation.change.toFixed(2)}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        <div className="bg-[var(--card)] border border-[var(--border)] p-6 rounded-3xl shadow-xl space-y-5 text-left">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--border)]">
            <div>
              <h3 className="text-base font-black uppercase text-[var(--foreground)] flex items-center gap-2">
                <History className="text-amber-500" size={20} /> Calculation History Ledger
              </h3>
              <p className="text-xs text-[var(--foreground)]/60 font-medium mt-0.5">
                Named calculations stored in <strong>Firebase Cloud ☁️</strong> (7 days retention, auto-migrates to device). Unnamed calculations stored in <strong>Local Device 📱</strong>.
              </p>
            </div>

            {calcHistory.length > 0 && (
              <button
                onClick={handleOpenClearHistoryModal}
                className="px-4 py-2 rounded-xl bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white text-xs font-bold uppercase transition-all cursor-pointer flex items-center gap-1.5 self-start sm:self-auto border border-rose-500/20"
              >
                <Trash2 size={14} /> Clear History
              </button>
            )}
          </div>

          {/* Search bar & filter controls */}
          <div className="relative">
            <Search className="absolute left-3.5 top-3 text-[var(--foreground)]/40" size={16} />
            <input
              type="text"
              placeholder="🔎 Search saved calculations by name, formula, or result..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl text-xs font-medium border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] focus:border-amber-500"
            />
          </div>

          {/* Ledger records list */}
          <div className="space-y-3">
            {filteredHistory.length === 0 ? (
              <div className="text-center py-16 opacity-50 space-y-2">
                <History size={40} className="mx-auto text-amber-500 opacity-40" />
                <p className="text-xs font-black uppercase">
                  {searchQuery ? 'No matching calculations found' : 'No calculation logs recorded yet'}
                </p>
              </div>
            ) : (
              filteredHistory.map((log, idx) => (
                <div
                  key={log.id}
                  className={cn(
                    "p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3",
                    log.isPinned
                      ? "bg-amber-500/5 border-amber-500/40 shadow-sm"
                      : "bg-[var(--foreground)]/[0.02] border-[var(--border)] hover:border-amber-500/50"
                  )}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono opacity-40">#{idx + 1}</span>

                      {log.name ? (
                        <button
                          onClick={() => {
                            setEditingLog(log);
                            setEditName(log.name || '');
                            setEditFormula(log.formula);
                            setEditOutcome(log.outcome);
                          }}
                          className="text-xs font-black text-[var(--foreground)] bg-amber-500/10 hover:bg-amber-500 hover:text-white text-amber-600 dark:text-amber-400 px-2.5 py-0.5 rounded-lg border border-amber-500/20 flex items-center gap-1 cursor-pointer transition-all"
                          title="Click to rename"
                        >
                          <Tag size={12} /> {log.name}
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            setEditingLog(log);
                            setEditName('');
                            setEditFormula(log.formula);
                            setEditOutcome(log.outcome);
                          }}
                          className="text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 hover:bg-amber-500 hover:text-white px-2.5 py-0.5 rounded-lg border border-amber-500/30 flex items-center gap-1 cursor-pointer transition-all"
                          title="Click to give a name and save to cloud"
                        >
                          <Tag size={12} /> + Name Calculation
                        </button>
                      )}

                      {/* Storage Info Badge */}
                      {log.storage === 'cloud' ? (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center gap-1">
                          <Cloud size={10} /> Cloud
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                          <Smartphone size={10} /> Device
                        </span>
                      )}

                      {log.isPinned && (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-amber-500/20 text-amber-500 border border-amber-500/30 flex items-center gap-1">
                          📌 Pinned
                        </span>
                      )}
                    </div>

                    <div className="text-xs font-bold font-mono opacity-80 pt-1">
                      {log.formula}
                    </div>

                    <div className="text-xl font-black font-mono text-emerald-500">
                      = ₹{log.outcome}
                    </div>

                    {log.notes && (
                      <p className="text-[11px] text-[var(--foreground)]/60 italic">
                        Note: {log.notes}
                      </p>
                    )}

                    <div className="text-[10px] font-mono opacity-40">
                      Recorded at: {log.timestamp}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <button
                      onClick={() => handleTogglePin(log)}
                      className={cn(
                        "p-2 rounded-xl text-xs font-bold uppercase transition-all cursor-pointer flex items-center gap-1 border",
                        log.isPinned
                          ? "bg-amber-500 text-white border-amber-500 shadow-md"
                          : "bg-[var(--foreground)]/5 hover:bg-[var(--foreground)]/10 text-[var(--foreground)]/70 border-[var(--border)]"
                      )}
                      title={log.isPinned ? "Unpin calculation" : "Pin to top of ledger"}
                    >
                      <Pin size={13} /> {log.isPinned ? 'Pinned' : 'Pin'}
                    </button>

                    <button
                      onClick={() => handleEditInCalculator(log)}
                      className="p-2 rounded-xl bg-amber-500/10 hover:bg-amber-500 text-amber-600 hover:text-white dark:text-amber-400 text-xs font-bold uppercase cursor-pointer border border-amber-500/20 flex items-center gap-1 transition-all"
                      title="Open and edit calculation in Universal Calculator Display"
                    >
                      <Edit3 size={13} /> Edit in Calc
                    </button>

                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(log.outcome);
                        triggerToast(`Copied ₹${log.outcome}`);
                      }}
                      className="p-2 rounded-xl bg-[var(--foreground)]/5 hover:bg-[var(--foreground)]/10 text-[var(--foreground)] text-xs font-bold uppercase cursor-pointer border border-[var(--border)] flex items-center gap-1"
                    >
                      <Copy size={13} /> Copy
                    </button>

                    <button
                      onClick={() => handleDeleteSingleLog(log)}
                      className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white text-xs font-bold uppercase transition-all cursor-pointer border border-rose-500/20"
                      title="Delete calculation"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
