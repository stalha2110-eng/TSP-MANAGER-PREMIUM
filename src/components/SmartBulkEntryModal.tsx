import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Trash2, 
  ChevronDown, 
  Sparkles, 
  ArrowLeft, 
  ArrowRight, 
  Save, 
  Plus, 
  Copy, 
  AlertCircle, 
  Check, 
  HelpCircle,
  FileText
} from 'lucide-react';
import { Category, Item } from '../types';
import { UNITS } from '../constants';
import { cn } from '../lib/utils';
import { useCustomUnits, useRecentUnits, trackRecentUnit } from '../lib/unitUtils';

interface SmartBulkEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveBatch: (items: any[]) => Promise<void>;
  categories: Category[];
  t: any;
  theme?: string;
}

interface BulkRowState {
  categoryId: string;
  quantity: string;
  name: string;
  retailPrice: string;
  retailPriceUnit: string;
  wholesalePrice: string;
  wholesalePriceUnit: string;
  buyingPrice: string;
  buyingPriceUnit: string;
  touched: {
    name?: boolean;
    quantity?: boolean;
    retailPrice?: boolean;
    wholesalePrice?: boolean;
    buyingPrice?: boolean;
  };
}

// Map keywords in nomenclature names to units
const KEYWORD_TO_UNIT: { [key: string]: string } = {
  'kg': 'KG',
  'kilo': 'KG',
  'kilogram': 'KG',
  'gram': 'Gram',
  'gm': 'Gram',
  '250gm': '250gm',
  '250g': '250gm',
  'chatak': 'Chatak',
  'chattak': 'Chatak',
  'ctk': 'Chatak',
  'छटांक': 'Chatak',
  'छटाक': 'Chatak',
  'packet': 'Packet',
  'pkt': 'Packet',
  'box': 'Box',
  'bag': 'Bag',
  'pouch': 'Pouch',
  'sack': 'Sack',
  'jar': 'Jar',
  'bottle': 'Bottle',
  'tin': 'Tin',
  'can': 'Can',
  'carton': 'Carton',
  'crate': 'Crate',
  'piece': 'Piece',
  'pc': 'Piece',
  'pcs': 'Piece',
  'dozen': 'Dozen',
  'bundle': 'Bundle',
  'set': 'Set',
  'pair': 'Pair',
  'unit': 'Unit'
};

export function SmartBulkEntryModal({
  isOpen,
  onClose,
  onSaveBatch,
  categories,
  t,
  theme = 'midnight_blue'
}: SmartBulkEntryModalProps) {
  // Initial state with 1 default row
  const createEmptyRow = (catId?: string): BulkRowState => ({
    categoryId: catId || categories[0]?.id || '1',
    quantity: '1',
    name: '',
    retailPrice: '',
    retailPriceUnit: 'KG',
    wholesalePrice: '',
    wholesalePriceUnit: 'KG',
    buyingPrice: '',
    buyingPriceUnit: 'KG',
    touched: {}
  });

  const [rows, setRows] = useState<BulkRowState[]>([]);
  const [activeCategoryDropdown, setActiveCategoryDropdown] = useState<number | null>(null);
  const [activeUnitDropdown, setActiveUnitDropdown] = useState<{ rowIndex: number; field: 'retail' | 'wholesale' | 'cost' } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showValidationErrors, setShowValidationErrors] = useState(false);
  const [autoSuggestMargin, setAutoSuggestMargin] = useState(true);

  // Custom & Recent Units management
  const { customUnits, addCustomUnit, removeCustomUnit, allUnitsFlat } = useCustomUnits();
  const { recentUnits } = useRecentUnits();
  const [quickNewUnit, setQuickNewUnit] = useState('');

  // Helper renderer for unit selector dropdown in Smart Entry
  const renderSmartUnitDropdown = (currentValue: string, onSelectUnit: (u: string) => void) => {
    const handleSelectWithTrack = (u: string) => {
      trackRecentUnit(u);
      onSelectUnit(u);
      setActiveUnitDropdown(null);
    };

    const sortedStandardUnits = [...UNITS.flatMap(g => g.values)].sort((a, b) => {
      const idxA = recentUnits.findIndex(r => r.toLowerCase() === a.toLowerCase());
      const idxB = recentUnits.findIndex(r => r.toLowerCase() === b.toLowerCase());
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return 0;
    });

    return (
      <div className="absolute right-0 mt-1 w-48 max-h-64 overflow-y-auto rounded-xl bg-[var(--card)] border border-[var(--border)] shadow-2xl z-40 no-scrollbar p-2 space-y-2">
        {/* Quick Add Custom Unit Bar inside Smart Entry */}
        <div className="space-y-1 pb-1.5 border-b border-[var(--border)]">
          <div className="text-[7.5px] font-black uppercase text-amber-500 tracking-wider">Add Custom Unit</div>
          <div className="flex gap-1">
            <input
              type="text"
              placeholder="+ e.g. Bora, Rim..."
              className="w-full bg-[var(--background)] border border-[var(--border)] rounded-md px-1.5 py-0.5 text-[9px] font-bold text-[var(--foreground)] outline-none focus:border-amber-500"
              value={quickNewUnit}
              onChange={(e) => setQuickNewUnit(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  if (quickNewUnit.trim()) {
                    addCustomUnit(quickNewUnit.trim());
                    handleSelectWithTrack(quickNewUnit.trim());
                    setQuickNewUnit('');
                  }
                }
              }}
            />
            <button
              type="button"
              onClick={() => {
                if (quickNewUnit.trim()) {
                  addCustomUnit(quickNewUnit.trim());
                  handleSelectWithTrack(quickNewUnit.trim());
                  setQuickNewUnit('');
                }
              }}
              className="px-2 py-0.5 bg-amber-500 hover:bg-amber-600 text-white rounded text-[9px] font-black shrink-0"
            >
              Add
            </button>
          </div>
        </div>

        {/* Standard Units List */}
        <div className="space-y-0.5">
          <div className="text-[7.5px] font-black uppercase text-zinc-400 tracking-wider px-1">Standard Units</div>
          <div className="max-h-28 overflow-y-auto no-scrollbar space-y-0.5">
            {sortedStandardUnits.map(unit => (
              <button
                key={unit}
                type="button"
                onClick={() => handleSelectWithTrack(unit)}
                className={cn(
                  "w-full text-left px-2 py-1 rounded text-[8.5px] font-black tracking-wider transition-colors flex items-center justify-between",
                  currentValue.toLowerCase() === unit.toLowerCase() ? "text-[var(--primary)] bg-[var(--primary)]/10" : "text-zinc-400 hover:text-white hover:bg-[var(--foreground)]/5"
                )}
              >
                <span>{unit.toUpperCase()}</span>
                {unit === 'Chatak' && <span className="text-[7px] text-amber-400 font-bold ml-1">50g</span>}
              </button>
            ))}
          </div>
        </div>

        {/* Custom Units List */}
        {customUnits.length > 0 && (
          <div className="space-y-0.5 pt-1.5 border-t border-[var(--border)]">
            <div className="text-[7.5px] font-black uppercase text-amber-500 tracking-wider px-1">Custom Units</div>
            <div className="max-h-24 overflow-y-auto no-scrollbar space-y-0.5">
              {customUnits.map(unit => (
                <div
                  key={unit}
                  className={cn(
                    "w-full px-2 py-0.5 rounded text-[8.5px] font-black tracking-wider flex items-center justify-between transition-colors",
                    currentValue.toLowerCase() === unit.toLowerCase() ? "text-amber-400 bg-amber-500/10" : "text-zinc-300 hover:bg-[var(--foreground)]/5"
                  )}
                >
                  <button
                    type="button"
                    onClick={() => handleSelectWithTrack(unit)}
                    className="flex-1 text-left truncate pr-1"
                  >
                    {unit.toUpperCase()}
                  </button>
                  <button
                    type="button"
                    title="Remove custom unit"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeCustomUnit(unit);
                    }}
                    className="p-0.5 hover:bg-red-500/20 rounded text-red-400 hover:text-red-500 shrink-0"
                  >
                    <Trash2 size={10} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  
  // Quick bulk parse state
  const [showQuickParser, setShowQuickParser] = useState(false);
  const [quickParseText, setQuickParseText] = useState('');
  const [parseError, setParseError] = useState<string | null>(null);

  // Initialize with 1 row when modal opens
  useEffect(() => {
    if (isOpen) {
      setRows([createEmptyRow()]);
      setActiveCategoryDropdown(null);
      setActiveUnitDropdown(null);
      setShowValidationErrors(false);
      setShowQuickParser(false);
      setQuickParseText('');
      setParseError(null);
    }
  }, [isOpen]);

  const handleAddRow = () => {
    // Inherit the category and units of the last row if exists, for faster data entry
    const lastRow = rows[rows.length - 1];
    const catId = lastRow ? lastRow.categoryId : undefined;
    const retailUnit = lastRow ? lastRow.retailPriceUnit : 'KG';
    const wholesaleUnit = lastRow ? lastRow.wholesalePriceUnit : 'KG';
    const buyingUnit = lastRow ? lastRow.buyingPriceUnit : 'KG';
    
    setRows(prev => [...prev, {
      ...createEmptyRow(catId),
      retailPriceUnit: retailUnit,
      wholesalePriceUnit: wholesaleUnit,
      buyingPriceUnit: buyingUnit
    }]);

    // Autofocus the newly created row's nomenclature input after it renders
    setTimeout(() => {
      const nextIndex = rows.length;
      const el = document.getElementById(`name-${nextIndex}`);
      if (el) {
        el.focus();
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 50);
  };

  const handleDeleteRow = (index: number) => {
    if (rows.length === 1) {
      // Just clear the single row instead of deleting it
      setRows([createEmptyRow()]);
      return;
    }
    setRows(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpdateRow = (index: number, fields: Partial<BulkRowState>) => {
    setRows(prev => prev.map((row, i) => {
      if (i !== index) return row;
      
      const updatedRow = { ...row, ...fields };

      // SMART AUTO-DEDUCTION:
      // 1. Detect unit of measurement automatically from product name keywords
      if (fields.name !== undefined) {
        const detectedUnit = detectUnitFromName(fields.name);
        if (detectedUnit) {
          updatedRow.retailPriceUnit = detectedUnit;
          updatedRow.wholesalePriceUnit = detectedUnit;
          updatedRow.buyingPriceUnit = detectedUnit;
        }
      }

      // 2. Auto-suggest wholesale and cost prices based on retail price
      if (autoSuggestMargin && fields.retailPrice !== undefined) {
        const retailVal = parseFloat(fields.retailPrice);
        if (!isNaN(retailVal) && retailVal > 0) {
          // Suggest 10% lower for wholesale, 25% lower for buying cost
          if (!row.wholesalePrice || row.touched.wholesalePrice !== true) {
            updatedRow.wholesalePrice = Math.round(retailVal * 0.9).toString();
          }
          if (!row.buyingPrice || row.touched.buyingPrice !== true) {
            updatedRow.buyingPrice = Math.round(retailVal * 0.75).toString();
          }
        } else if (fields.retailPrice === '') {
          if (row.touched.wholesalePrice !== true) updatedRow.wholesalePrice = '';
          if (row.touched.buyingPrice !== true) updatedRow.buyingPrice = '';
        }
      }

      // 3. Keep units in sync if user changes retail unit, unless they manually overrode
      if (fields.retailPriceUnit !== undefined) {
        if (row.wholesalePriceUnit === row.retailPriceUnit) {
          updatedRow.wholesalePriceUnit = fields.retailPriceUnit;
        }
        if (row.buyingPriceUnit === row.retailPriceUnit) {
          updatedRow.buyingPriceUnit = fields.retailPriceUnit;
        }
      }

      return updatedRow;
    }));
  };

  const handleMarkTouched = (index: number, fieldName: keyof BulkRowState['touched']) => {
    setRows(prev => prev.map((row, i) => {
      if (i === index) {
        return {
          ...row,
          touched: {
            ...row.touched,
            [fieldName]: true
          }
        };
      }
      return row;
    }));
  };

  // Auto-detect unit from product name keywords
  const detectUnitFromName = (name: string): string | null => {
    const words = name.toLowerCase().split(/[\s,=\/]+/);
    for (const word of words) {
      const cleanWord = word.replace(/[^a-z0-9]/g, '');
      if (KEYWORD_TO_UNIT[cleanWord]) {
        return KEYWORD_TO_UNIT[cleanWord];
      }
    }
    return null;
  };

  // Validate a row
  const getRowErrors = (row: BulkRowState) => {
    const errors: { name?: string; quantity?: string; retailPrice?: string; wholesalePrice?: string; buyingPrice?: string } = {};
    
    // Name is required
    if (!row.name || row.name.trim() === '') {
      errors.name = 'Product name is required';
    }
    
    // Quantity must be a positive number
    const qty = parseFloat(row.quantity);
    if (!row.quantity || isNaN(qty) || qty <= 0) {
      errors.quantity = 'Quantity must be greater than 0';
    }
    
    // Price checks
    const retail = parseFloat(row.retailPrice);
    if (!row.retailPrice || isNaN(retail) || retail < 0) {
      errors.retailPrice = 'Required';
    }
    
    const wholesale = parseFloat(row.wholesalePrice);
    if (!row.wholesalePrice || isNaN(wholesale) || wholesale < 0) {
      errors.wholesalePrice = 'Required';
    }
    
    const cost = parseFloat(row.buyingPrice);
    if (!row.buyingPrice || isNaN(cost) || cost < 0) {
      errors.buyingPrice = 'Required';
    }
    
    const isValid = Object.keys(errors).length === 0;
    return { errors, isValid };
  };

  // Keyboard Navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, rowIndex: number, field: 'qty' | 'name' | 'retail' | 'wholesale' | 'cost') => {
    handleMarkTouched(rowIndex, field === 'qty' ? 'quantity' : field === 'retail' ? 'retailPrice' : field === 'wholesale' ? 'wholesalePrice' : field === 'cost' ? 'buyingPrice' : 'name');
    
    if (e.key === 'Enter') {
      e.preventDefault();
      
      let nextId = '';
      if (field === 'qty') {
        nextId = `name-${rowIndex}`;
      } else if (field === 'name') {
        nextId = `retail-${rowIndex}`;
      } else if (field === 'retail') {
        nextId = `wholesale-${rowIndex}`;
      } else if (field === 'wholesale') {
        nextId = `cost-${rowIndex}`;
      } else if (field === 'cost') {
        if (rowIndex < rows.length - 1) {
          nextId = `qty-${rowIndex + 1}`;
        } else {
          // At the last field of the last row -> Automatically spawn a new row and focus it!
          handleAddRow();
          return;
        }
      }

      if (nextId) {
        const nextEl = document.getElementById(nextId);
        if (nextEl) {
          nextEl.focus();
          if ('select' in nextEl) {
            (nextEl as any).select();
          }
          nextEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      }
    }
  };

  const getFocusableFields = () => {
    const list: { id: string; rowIndex: number }[] = [];
    rows.forEach((_, i) => {
      list.push({ id: `qty-${i}`, rowIndex: i });
      list.push({ id: `name-${i}`, rowIndex: i });
      list.push({ id: `retail-${i}`, rowIndex: i });
      list.push({ id: `wholesale-${i}`, rowIndex: i });
      list.push({ id: `cost-${i}`, rowIndex: i });
    });
    return list;
  };

  const handleNavigate = (direction: 'backward' | 'forward') => {
    const fields = getFocusableFields();
    const activeEl = document.activeElement;
    if (!activeEl) {
      const firstEl = document.getElementById(fields[0]?.id);
      firstEl?.focus();
      return;
    }

    const currentIndex = fields.findIndex(f => f.id === activeEl.id);
    if (currentIndex === -1) {
      const firstEl = document.getElementById(fields[0]?.id);
      firstEl?.focus();
      return;
    }

    let targetIndex = currentIndex;
    if (direction === 'forward') {
      if (currentIndex < fields.length - 1) {
        targetIndex = currentIndex + 1;
      } else {
        handleAddRow();
        return;
      }
    } else {
      if (currentIndex > 0) {
        targetIndex = currentIndex - 1;
      }
    }

    const targetEl = document.getElementById(fields[targetIndex].id);
    if (targetEl) {
      targetEl.focus();
      if ('select' in targetEl) {
        (targetEl as any).select();
      }
      targetEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  };

  // Quick parser engine
  const handleQuickParse = () => {
    setParseError(null);
    if (!quickParseText.trim()) {
      setParseError('Please enter some text to parse.');
      return;
    }

    const lines = quickParseText.split('\n');
    const newRowsToAppend: BulkRowState[] = [];
    let failedLinesCount = 0;

    lines.forEach(line => {
      if (!line.trim()) return;

      try {
        // Expected format: Name = Retail / Unit, Wholesale / Unit, Cost / Unit
        // Alternative format: Name = Retail, Wholesale, Cost
        // e.g. "Kaju = 500/KG, 450/KG, 400/KG" or "Almonds = 800, 750, 700"
        
        let name = '';
        let rest = '';

        if (line.includes('=')) {
          const parts = line.split('=');
          name = parts[0].trim();
          rest = parts[1].trim();
        } else {
          // Fallback: try to separate first word/phrase from numerical pricing specs
          const match = line.match(/^([^0-9]+)\s+(.*)$/);
          if (match) {
            name = match[1].trim();
            rest = match[2].trim();
          } else {
            name = line.trim();
          }
        }

        // Parse pricing parts separated by commas
        const priceParts = rest.split(',');
        
        // Helper to parse price & unit
        const parsePriceAndUnit = (text: string, defaultUnit: string) => {
          if (!text) return { price: '', unit: defaultUnit };
          const cleanText = text.trim();
          const match = cleanText.match(/^([\d\.]+)(?:\s*\/\s*(.*))?$/);
          
          if (match) {
            return {
              price: match[1],
              unit: (match[2] ? match[2].trim().toUpperCase() : defaultUnit)
            };
          }
          return { price: cleanText.replace(/[^0-9\.]/g, ''), unit: defaultUnit };
        };

        const retailSpec = parsePriceAndUnit(priceParts[0], 'KG');
        const wholesaleSpec = parsePriceAndUnit(priceParts[1], retailSpec.unit);
        const costSpec = parsePriceAndUnit(priceParts[2], retailSpec.unit);

        // Try to guess category based on name
        const lowerName = name.toLowerCase();
        let catId = categories[0]?.id || '1';
        
        // Quick category heuristic matching
        for (const cat of categories) {
          const catNameLower = cat.name.toLowerCase();
          if (lowerName.includes(catNameLower) || catNameLower.includes(lowerName)) {
            catId = cat.id;
            break;
          }
        }

        if (name) {
          newRowsToAppend.push({
            categoryId: catId,
            quantity: '1',
            name: name.charAt(0).toUpperCase() + name.slice(1), // Auto Capitalize first letter
            retailPrice: retailSpec.price,
            retailPriceUnit: retailSpec.unit,
            wholesalePrice: wholesaleSpec.price,
            wholesalePriceUnit: wholesaleSpec.unit,
            buyingPrice: costSpec.price,
            buyingPriceUnit: costSpec.unit,
            touched: {
              name: true,
              retailPrice: retailSpec.price !== '',
              wholesalePrice: wholesaleSpec.price !== '',
              buyingPrice: costSpec.price !== ''
            }
          });
        } else {
          failedLinesCount++;
        }
      } catch (err) {
        console.error('Failed to parse line:', line, err);
        failedLinesCount++;
      }
    });

    if (newRowsToAppend.length > 0) {
      // If we only have 1 initial empty row, replace it. Otherwise append.
      if (rows.length === 1 && rows[0].name === '' && rows[0].retailPrice === '') {
        setRows(newRowsToAppend);
      } else {
        setRows(prev => [...prev, ...newRowsToAppend]);
      }
      setQuickParseText('');
      setShowQuickParser(false);
      setParseError(null);
    } else {
      setParseError('Could not parse any valid products. Please check the formatting.');
    }
  };

  const handleCopyPrevRow = (index: number) => {
    if (index === 0) return;
    const prevRow = rows[index - 1];
    setRows(prev => prev.map((row, i) => {
      if (i === index) {
        return {
          ...row,
          categoryId: prevRow.categoryId,
          retailPrice: prevRow.retailPrice,
          retailPriceUnit: prevRow.retailPriceUnit,
          wholesalePrice: prevRow.wholesalePrice,
          wholesalePriceUnit: prevRow.wholesalePriceUnit,
          buyingPrice: prevRow.buyingPrice,
          buyingPriceUnit: prevRow.buyingPriceUnit,
          touched: {
            ...row.touched,
            retailPrice: true,
            wholesalePrice: true,
            buyingPrice: true
          }
        };
      }
      return row;
    }));
  };

  const handleSaveAll = async () => {
    // Enable error highlighting on everything
    setShowValidationErrors(true);

    // Validate each row
    const rowValidationResults = rows.map(row => getRowErrors(row));
    const firstInvalidIndex = rowValidationResults.findIndex(res => !res.isValid);

    if (firstInvalidIndex !== -1) {
      const invalidRow = rows[firstInvalidIndex];
      const errorMsg = `Row ${firstInvalidIndex + 1} has missing or invalid fields: ${
        !invalidRow.name ? 'Product Nomenclature' : 'Pricing Specs'
      }. Please check highlight lines.`;
      alert(errorMsg);
      
      // Scroll the first invalid row into view
      setTimeout(() => {
        const el = document.getElementById(`name-${firstInvalidIndex}`);
        if (el) {
          el.focus();
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
      return;
    }

    setIsSaving(true);
    try {
      const itemsToSave = rows.map(row => {
        const qtyVal = parseFloat(row.quantity) || 1;
        const retailVal = parseFloat(row.retailPrice) || 0;
        const wholesaleVal = parseFloat(row.wholesalePrice) || 0;
        const costVal = parseFloat(row.buyingPrice) || 0;

        return {
          name: row.name.trim(),
          categoryId: row.categoryId,
          quantity: qtyVal,
          unit: row.retailPriceUnit,
          retailPrice: retailVal,
          retailPriceUnit: row.retailPriceUnit,
          wholesalePrice: wholesaleVal,
          wholesalePriceUnit: row.wholesalePriceUnit,
          buyingPrice: costVal,
          buyingPriceUnit: row.buyingPriceUnit,
          translations: {
            en: row.name.trim(),
            hi: '',
            mr: '',
            'hi-en': ''
          },
          minStockLevel: 10
        };
      });

      await onSaveBatch(itemsToSave);
      onClose();
    } catch (e) {
      console.error('Failed to batch save', e);
    } finally {
      setIsSaving(false);
    }
  };

  const allUnitsList = UNITS.flatMap(g => g.values);

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 backdrop-blur-md p-0 md:items-center md:p-4 font-sans"
      data-theme={theme}
    >
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 220 }}
        className="h-[95vh] w-full max-w-4xl overflow-hidden rounded-t-[2rem] bg-[var(--background)] text-[var(--foreground)] flex flex-col md:h-[90vh] md:rounded-[2rem] border border-[var(--border)] shadow-2xl relative"
      >
        {/* Dynamic theme luminous accent bar */}
        <div className="h-1.5 w-full bg-gradient-to-r from-amber-500 via-[var(--primary)] to-amber-500 opacity-80 shrink-0" />

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[var(--border)] shrink-0 bg-[var(--card)] backdrop-blur-md">
          <div className="flex items-center gap-3.5">
            <div className="h-10 w-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500 border border-amber-500/20 shadow-inner">
              <Sparkles size={20} className="animate-pulse text-[var(--primary)]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black tracking-tighter uppercase text-[var(--foreground)] flex items-center gap-2">
                  SMART BULK ENTRY
                </h2>
                <span className="text-[8px] bg-[var(--primary)]/10 text-[var(--primary)] font-black px-2 py-0.5 rounded-full border border-[var(--primary)]/20 tracking-wider">
                  FAST ENGINE
                </span>
              </div>
              <p className="text-[9px] font-black uppercase tracking-widest text-zinc-500 opacity-80">
                NOMENCLATURE = RETAIL PRICE / UNIT , WHOLESALE PRICE / UNIT , COST PRICE / UNIT
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Quick Parse Toggle Button */}
            <button
              onClick={() => setShowQuickParser(!showQuickParser)}
              className={cn(
                "hidden sm:flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black tracking-wide border transition-all cursor-pointer",
                showQuickParser 
                  ? "bg-amber-500/15 border-amber-500/30 text-amber-500" 
                  : "bg-[var(--card)] border-[var(--border)] text-zinc-400 hover:text-[var(--foreground)] hover:border-zinc-500"
              )}
            >
              <FileText size={14} />
              ⚡ QUICK PASTE
            </button>

            <button
              onClick={onClose}
              className="rounded-xl p-2.5 bg-[var(--card)] border border-[var(--border)] text-zinc-400 hover:text-[var(--foreground)] hover:bg-zinc-800/10 transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Quick Paste Parser Section (Drawer/Panel inside modal) */}
        <AnimatePresence>
          {showQuickParser && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="border-b border-[var(--border)] bg-amber-500/[0.02] overflow-hidden shrink-0"
            >
              <div className="p-5 space-y-3 max-w-3xl mx-auto">
                <div className="flex justify-between items-center">
                  <h3 className="text-xs font-black uppercase tracking-wider text-amber-500 flex items-center gap-1.5">
                    <Sparkles size={14} className="animate-spin" />
                    PASTE MULTIPLE LINES TO AUTO-GENERATE ASSETS
                  </h3>
                  <button
                    onClick={() => setQuickParseText("Kaju Katli = 850/KG, 800/KG, 650/KG\nBasmati Premium = 110/KG, 98/KG, 85/KG\nMustard Oil 1L = 175/Bottle, 160/Bottle, 140/Bottle")}
                    className="text-[10px] font-black tracking-widest text-zinc-500 hover:text-amber-500 underline uppercase"
                  >
                    Load Sample
                  </button>
                </div>
                
                <p className="text-[10px] text-zinc-400 font-medium">
                  Type or paste one product per line in formatting: <strong className="text-zinc-300 font-mono">Product Name = Retail/Unit, Wholesale/Unit, Cost/Unit</strong>
                </p>

                <textarea
                  value={quickParseText}
                  onChange={(e) => setQuickParseText(e.target.value)}
                  placeholder="Paste your lines here..."
                  className="w-full h-24 bg-[var(--background)] border border-[var(--border)] rounded-xl p-3 text-xs font-mono font-bold focus:outline-none focus:border-amber-500 placeholder:text-zinc-600 shadow-inner"
                />

                {parseError && (
                  <p className="text-[10px] font-bold text-red-500 flex items-center gap-1">
                    <AlertCircle size={12} />
                    {parseError}
                  </p>
                )}

                <div className="flex justify-end gap-2.5">
                  <button
                    onClick={() => setShowQuickParser(false)}
                    className="px-4 py-2 text-[10px] font-black tracking-widest uppercase text-zinc-400 hover:text-white"
                  >
                    CANCEL
                  </button>
                  <button
                    onClick={handleQuickParse}
                    className="px-5 py-2.5 rounded-xl bg-amber-500 text-neutral-950 text-[10px] font-black tracking-widest uppercase hover:bg-amber-400 shadow-md transition-all active:scale-95"
                  >
                    PARSE & ADD ASSETS
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 no-scrollbar pb-32 bg-[var(--background)]">
          
          {/* Controls Bar */}
          <div className="flex flex-col sm:flex-row gap-3.5 items-center justify-between bg-[var(--card)] border border-[var(--border)] rounded-2xl p-3.5 shadow-sm">
            <div className="flex items-center gap-2.5 text-xs">
              <span className="text-amber-500 text-base">⚡</span>
              <div>
                <span className="font-bold text-[var(--foreground)]">Pro Navigation:</span> Press <kbd className="bg-neutral-800 text-zinc-300 border border-zinc-700 px-1 py-0.5 rounded text-[10px] font-mono font-bold">Enter</kbd> to move forward. Name keyword detector auto-fills your units.
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4 self-end sm:self-center">
              {/* Quick Parser Button (Mobile fallback) */}
              <button
                onClick={() => setShowQuickParser(!showQuickParser)}
                className="sm:hidden flex items-center gap-1 px-3 py-1.5 rounded-xl text-[10px] font-black border bg-[var(--card)] border-[var(--border)] text-zinc-400"
              >
                <FileText size={12} />
                PASTE
              </button>

              {/* Price Suggestion Toggle */}
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={autoSuggestMargin}
                  onChange={(e) => setAutoSuggestMargin(e.target.checked)}
                  className="rounded border-[var(--border)] text-[var(--primary)] focus:ring-[var(--primary)] h-4 w-4 bg-[var(--background)]"
                />
                <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400 hover:text-[var(--foreground)] transition-colors">
                  Auto-suggest wholesale/cost
                </span>
              </label>
            </div>
          </div>

          {/* Rows List */}
          <div className="space-y-4">
            <AnimatePresence initial={false}>
              {rows.map((row, index) => {
                const selectedCategory = categories.find(c => c.id === row.categoryId) || categories[0];
                const { errors, isValid } = getRowErrors(row);
                const hasError = showValidationErrors && !isValid;
                
                return (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    className={cn(
                      "bg-[var(--card)] border rounded-xl p-2.5 px-3.5 relative space-y-2 shadow-sm hover:border-[var(--primary)] transition-all duration-200",
                      hasError 
                        ? "border-red-500 bg-red-500/[0.02] shadow-[0_0_12px_rgba(239,68,68,0.1)]" 
                        : "border-[var(--border)]"
                    )}
                  >
                    {/* Row Header Actions */}
                    <div className="flex items-center justify-between border-b border-[var(--border)]/40 pb-1.5 mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          "h-5 w-5 rounded-full text-[10px] font-black flex items-center justify-center border transition-colors",
                          hasError 
                            ? "bg-red-500/10 text-red-500 border-red-500/30" 
                            : "bg-[var(--background)] text-zinc-400 border-[var(--border)]"
                        )}>
                          {index + 1}
                        </span>

                        {/* Category Dropdown Selector */}
                        <div className="relative">
                          <button
                            onClick={() => {
                              setActiveCategoryDropdown(activeCategoryDropdown === index ? null : index);
                              setActiveUnitDropdown(null);
                            }}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[var(--background)] border border-[var(--border)] hover:border-zinc-500 text-zinc-300 hover:text-white transition-colors text-[10px] font-bold"
                          >
                            <span className="text-xs">{selectedCategory?.icon || '🏷️'}</span>
                            <span className="uppercase text-[9px] tracking-wider">{selectedCategory?.name || 'SELECT'}</span>
                            <ChevronDown size={12} className="opacity-50" />
                          </button>

                          {/* Category Dropdown List Overlay */}
                          {activeCategoryDropdown === index && (
                            <div className="absolute left-0 mt-1.5 w-52 rounded-xl bg-[var(--card)] border border-[var(--border)] shadow-2xl z-30 overflow-hidden no-scrollbar py-1 animate-in fade-in slide-in-from-top-2 duration-150">
                              {categories.map(cat => (
                                <button
                                  key={cat.id}
                                  onClick={() => {
                                    handleUpdateRow(index, { categoryId: cat.id });
                                    setActiveCategoryDropdown(null);
                                  }}
                                  className={cn(
                                    "w-full text-left px-3.5 py-1.5 text-[10px] flex items-center gap-2 hover:bg-zinc-800/20 transition-colors font-bold",
                                    row.categoryId === cat.id ? "text-[var(--primary)] bg-[var(--primary)]/5" : "text-zinc-400 hover:text-zinc-100"
                                  )}
                                >
                                  <span className="text-xs">{cat.icon}</span>
                                  <span className="uppercase text-[9px] tracking-wider">{cat.name}</span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Quick Spec Copy Button (from previous row) */}
                        {index > 0 && (
                          <button
                            onClick={() => handleCopyPrevRow(index)}
                            title="Copy Category & Units from row above"
                            className="p-1 rounded-md bg-[var(--background)] border border-[var(--border)] text-zinc-500 hover:text-[var(--foreground)] hover:border-zinc-500 transition-all cursor-pointer"
                          >
                            <Copy size={11} />
                          </button>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Validation warning indicator */}
                        {hasError && (
                          <span className="text-[9px] text-red-500 font-bold flex items-center gap-0.5 animate-pulse">
                            <AlertCircle size={10} />
                            Missing Fields
                          </span>
                        )}

                        {/* Quantity Input */}
                        <div className={cn(
                          "flex items-center gap-1.5 bg-[var(--background)] border px-2 py-0.5 rounded-lg transition-all",
                          showValidationErrors && errors.quantity 
                            ? "border-red-500 ring-1 ring-red-500/30" 
                            : "border-[var(--border)]"
                        )}>
                          <span className="text-[8px] font-black text-zinc-500 uppercase tracking-wider">QTY</span>
                          <input
                            id={`qty-${index}`}
                            type="number"
                            min="1"
                            step="any"
                            className="w-10 bg-transparent text-right font-black font-mono text-[10px] text-amber-500 focus:outline-none focus:text-[var(--foreground)]"
                            value={row.quantity}
                            onChange={(e) => handleUpdateRow(index, { quantity: e.target.value })}
                            onBlur={() => handleMarkTouched(index, 'quantity')}
                            onKeyDown={(e) => handleKeyDown(e, index, 'qty')}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Format layout */}
                    <div className="flex flex-col gap-2 md:flex-row md:items-center">
                      
                      {/* 1. Item Nomenclature (Name) */}
                      <div className="flex-1 min-w-[180px]">
                        <div className="relative">
                          <input
                            id={`name-${index}`}
                            type="text"
                            placeholder="Product nomenclature..."
                            className={cn(
                              "w-full bg-[var(--background)] border rounded-xl px-3 py-1.5 font-bold text-xs focus:outline-none focus:ring-1 focus:ring-[var(--primary)] focus:border-[var(--primary)] transition-all placeholder:text-zinc-650 shadow-inner",
                              showValidationErrors && errors.name 
                                ? "border-red-500 bg-red-500/[0.01]" 
                                : "border-[var(--border)]"
                            )}
                            value={row.name}
                            onChange={(e) => handleUpdateRow(index, { name: e.target.value })}
                            onBlur={() => handleMarkTouched(index, 'name')}
                            onKeyDown={(e) => handleKeyDown(e, index, 'name')}
                          />
                          {showValidationErrors && errors.name && (
                            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[8px] font-black text-red-500 uppercase">
                              Required
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Equals Separator */}
                      <div className="hidden md:flex items-center justify-center text-zinc-500 font-mono font-black text-sm select-none px-0.5">
                        =
                      </div>

                      {/* Mobile Separator Label */}
                      <div className="md:hidden flex items-center justify-center border-t border-[var(--border)]/40 my-0.5 pt-0.5 text-[8px] text-zinc-500 font-black tracking-wider select-none">
                        PRICING DETAILS
                      </div>

                      {/* Pricing Specs Block */}
                      <div className="flex flex-wrap items-center gap-1.5 bg-[var(--background)] border border-[var(--border)] rounded-xl p-1 px-1.5 md:flex-1 md:justify-between">
                        
                        {/* 2. Retail Price per unit */}
                        <div className={cn(
                          "flex items-center gap-1 flex-1 min-w-[95px] px-1 py-0.5 rounded-lg border transition-all",
                          showValidationErrors && errors.retailPrice ? "border-red-500/50 bg-red-500/[0.01]" : "border-transparent"
                        )}>
                          <input
                            id={`retail-${index}`}
                            type="number"
                            min="0"
                            step="any"
                            placeholder="Retail ₹"
                            className={cn(
                              "w-full bg-transparent font-bold font-mono text-xs text-[var(--foreground)] focus:outline-none",
                              showValidationErrors && errors.retailPrice ? "text-red-500" : ""
                            )}
                            value={row.retailPrice}
                            onChange={(e) => handleUpdateRow(index, { retailPrice: e.target.value })}
                            onBlur={() => handleMarkTouched(index, 'retailPrice')}
                            onKeyDown={(e) => handleKeyDown(e, index, 'retail')}
                          />
                          <div className="text-zinc-650 font-mono select-none text-[9px]">/</div>
                          
                          {/* Unit Selector Button */}
                          <div className="relative">
                            <button
                              onClick={() => {
                                setActiveUnitDropdown(
                                  activeUnitDropdown?.rowIndex === index && activeUnitDropdown?.field === 'retail'
                                    ? null
                                    : { rowIndex: index, field: 'retail' }
                                );
                                setActiveCategoryDropdown(null);
                              }}
                              className="px-1.5 py-0.5 rounded bg-[var(--card)] border border-[var(--border)] hover:border-zinc-500 text-[8px] font-black text-zinc-400 hover:text-white transition-colors uppercase tracking-widest min-w-[36px]"
                            >
                              {row.retailPriceUnit}
                            </button>
                             {/* Retail Unit Selector Dropdown Overlay */}
                            {activeUnitDropdown?.rowIndex === index && activeUnitDropdown?.field === 'retail' && (
                              renderSmartUnitDropdown(row.retailPriceUnit, (unit) => handleUpdateRow(index, { retailPriceUnit: unit }))
                            )}
                          </div>
                        </div>

                        {/* Comma Separator */}
                        <div className="text-zinc-650 font-mono select-none mx-0.5 text-xs">,</div>

                        {/* 3. Wholesale Price per unit */}
                        <div className={cn(
                          "flex items-center gap-1 flex-1 min-w-[95px] px-1 py-0.5 rounded-lg border transition-all",
                          showValidationErrors && errors.wholesalePrice ? "border-red-500/50 bg-red-500/[0.01]" : "border-transparent"
                        )}>
                          <input
                            id={`wholesale-${index}`}
                            type="number"
                            min="0"
                            step="any"
                            placeholder="Wholesale ₹"
                            className={cn(
                              "w-full bg-transparent font-bold font-mono text-xs text-[var(--foreground)] focus:outline-none",
                              showValidationErrors && errors.wholesalePrice ? "text-red-500" : ""
                            )}
                            value={row.wholesalePrice}
                            onChange={(e) => handleUpdateRow(index, { wholesalePrice: e.target.value })}
                            onBlur={() => handleMarkTouched(index, 'wholesalePrice')}
                            onKeyDown={(e) => handleKeyDown(e, index, 'wholesale')}
                          />
                          <div className="text-zinc-650 font-mono select-none text-[9px]">/</div>

                          {/* Unit Selector Button */}
                          <div className="relative">
                            <button
                              onClick={() => {
                                setActiveUnitDropdown(
                                  activeUnitDropdown?.rowIndex === index && activeUnitDropdown?.field === 'wholesale'
                                    ? null
                                    : { rowIndex: index, field: 'wholesale' }
                                );
                                setActiveCategoryDropdown(null);
                              }}
                              className="px-1.5 py-0.5 rounded bg-[var(--card)] border border-[var(--border)] hover:border-zinc-500 text-[8px] font-black text-zinc-400 hover:text-white transition-colors uppercase tracking-widest min-w-[36px]"
                            >
                              {row.wholesalePriceUnit}
                            </button>

                            {/* Wholesale Unit Selector Dropdown Overlay */}
                            {activeUnitDropdown?.rowIndex === index && activeUnitDropdown?.field === 'wholesale' && (
                              renderSmartUnitDropdown(row.wholesalePriceUnit, (unit) => handleUpdateRow(index, { wholesalePriceUnit: unit }))
                            )}
                          </div>
                        </div>

                        {/* Comma Separator */}
                        <div className="text-zinc-650 font-mono select-none mx-0.5 text-xs">,</div>

                        {/* 4. Cost Price per unit */}
                        <div className={cn(
                          "flex items-center gap-1 flex-1 min-w-[95px] px-1 py-0.5 rounded-lg border transition-all",
                          showValidationErrors && errors.buyingPrice ? "border-red-500/50 bg-red-500/[0.01]" : "border-transparent"
                        )}>
                          <input
                            id={`cost-${index}`}
                            type="number"
                            min="0"
                            step="any"
                            placeholder="Cost ₹"
                            className={cn(
                              "w-full bg-transparent font-bold font-mono text-xs text-[var(--foreground)] focus:outline-none",
                              showValidationErrors && errors.buyingPrice ? "text-red-500" : ""
                            )}
                            value={row.buyingPrice}
                            onChange={(e) => handleUpdateRow(index, { buyingPrice: e.target.value })}
                            onBlur={() => handleMarkTouched(index, 'buyingPrice')}
                            onKeyDown={(e) => handleKeyDown(e, index, 'cost')}
                          />
                          <div className="text-zinc-650 font-mono select-none text-[9px]">/</div>

                          {/* Unit Selector Button */}
                          <div className="relative">
                            <button
                              onClick={() => {
                                setActiveUnitDropdown(
                                  activeUnitDropdown?.rowIndex === index && activeUnitDropdown?.field === 'cost'
                                    ? null
                                    : { rowIndex: index, field: 'cost' }
                                );
                                setActiveCategoryDropdown(null);
                              }}
                              className="px-1.5 py-0.5 rounded bg-[var(--card)] border border-[var(--border)] hover:border-zinc-500 text-[8px] font-black text-zinc-400 hover:text-white transition-colors uppercase tracking-widest min-w-[36px]"
                            >
                              {row.buyingPriceUnit}
                            </button>

                            {/* Cost Unit Selector Dropdown Overlay */}
                            {activeUnitDropdown?.rowIndex === index && activeUnitDropdown?.field === 'cost' && (
                              renderSmartUnitDropdown(row.buyingPriceUnit, (unit) => handleUpdateRow(index, { buyingPriceUnit: unit }))
                            )}
                          </div>
                        </div>

                        {/* Delete Row Button next to the Cost pricing wrapper */}
                        <button
                          onClick={() => handleDeleteRow(index)}
                          className="p-1.5 rounded-md bg-rose-500/10 hover:bg-rose-500 hover:text-white text-rose-400 border border-rose-500/20 hover:border-rose-500 transition-all cursor-pointer flex items-center justify-center shrink-0 self-center"
                          title="Delete Row"
                        >
                          <Trash2 size={11} />
                        </button>

                      </div>

                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>

          {/* Add Multiple Item Row Button */}
          <div className="pt-2 flex justify-center">
            <button
              onClick={handleAddRow}
              className="px-6 py-4 rounded-2xl border-2 border-dashed border-[var(--border)] hover:border-[var(--primary)] bg-[var(--card)] text-xs font-black tracking-widest uppercase text-zinc-400 hover:text-[var(--primary)] transition-all cursor-pointer flex items-center gap-2 hover:scale-[1.01] active:scale-95"
            >
              <Plus size={16} />
              ADD MULTIPLE ITEM ROW
            </button>
          </div>

        </div>

        {/* Bottom Actions Area */}
        <div className="p-5 border-t border-[var(--border)] shrink-0 bg-[var(--card)]/95 backdrop-blur-md flex flex-col md:flex-row gap-4 items-center justify-between">
          
          {/* Navigation Controls */}
          <div className="flex items-center gap-2 w-full md:w-auto">
            <button
              onClick={() => handleNavigate('backward')}
              className="flex-1 md:flex-none px-4 py-3.5 rounded-xl border border-[var(--border)] bg-[var(--background)] text-[10px] font-black tracking-widest uppercase text-zinc-400 hover:text-[var(--foreground)] transition-colors cursor-pointer flex items-center justify-center gap-1.5"
            >
              <ArrowLeft size={14} />
              BACKWARD
            </button>
            <button
              onClick={() => handleNavigate('forward')}
              className="flex-1 md:flex-none px-4 py-3.5 rounded-xl border border-[var(--border)] bg-[var(--background)] text-[10px] font-black tracking-widest uppercase text-zinc-400 hover:text-[var(--foreground)] transition-colors cursor-pointer flex items-center justify-center gap-1.5"
            >
              FORWARD
              <ArrowRight size={14} />
            </button>
          </div>

          {/* Save Action */}
          <button
            onClick={handleSaveAll}
            disabled={isSaving}
            className="w-full md:w-auto px-10 py-4.5 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-600 shadow-lg shadow-amber-500/20 text-xs font-black tracking-widest uppercase text-neutral-950 hover:from-amber-400 hover:to-amber-500 transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isSaving ? (
              <span className="h-4 w-4 rounded-full border-2 border-neutral-950 border-t-transparent animate-spin" />
            ) : (
              <Save size={16} />
            )}
            BATCH SAVE ASSETS
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
