import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Trash2, 
  ChevronDown, 
  ChevronRight,
  Sparkles, 
  Save, 
  Plus, 
  Copy, 
  AlertCircle, 
  Check, 
  HelpCircle,
  FileText,
  Search,
  Settings2,
  Loader2,
  Layers
} from 'lucide-react';
import { Category, Item } from '../types';
import { UNITS } from '../constants';
import { cn } from '../lib/utils';
import { useCustomUnits, useRecentUnits, trackRecentUnit } from '../lib/unitUtils';
import { UnitSelectorModal } from './ui/UnitSelectorModal';
import {
  getCategoryUsageMap,
  trackCategoryUsage,
  sortCategoriesByUsage,
  CategoryUsageEntry,
} from '../utils/categoryUsageUtils';

interface SmartBulkEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveBatch: (items: any[]) => Promise<void>;
  categories: Category[];
  t: any;
  theme?: string;
  onCreateCategory?: (name: string) => Promise<any> | any;
  onDeleteCategory?: (id: string) => Promise<any> | any;
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
  theme = 'minimalist-ivory',
  onCreateCategory,
  onDeleteCategory,
}: SmartBulkEntryModalProps) {
  // Initial state with 1 default row
  const createEmptyRow = (catId?: string): BulkRowState => ({
    categoryId: catId !== undefined ? catId : (categories[0]?.id || ''),
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
  // Category popup modal states matching Full Entry interface
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [activeCategoryRowIndex, setActiveCategoryRowIndex] = useState<number | null>(null);
  const [categorySearch, setCategorySearch] = useState('');
  const [isEditCategoryMode, setIsEditCategoryMode] = useState(false);
  const [isSubmittingCategory, setIsSubmittingCategory] = useState(false);
  const categorySearchInputRef = useRef<HTMLInputElement>(null);

  const [categoryUsageMap, setCategoryUsageMap] = useState<
    Record<string, CategoryUsageEntry>
  >(() => getCategoryUsageMap());

  const sortedCategories = useMemo(() => {
    return sortCategoriesByUsage(categories, categoryUsageMap);
  }, [categories, categoryUsageMap]);

  const filteredCategories = useMemo(() => {
    const q = categorySearch.toLowerCase().trim();
    if (!q) return sortedCategories;
    return sortedCategories.filter((c) => c.name.toLowerCase().includes(q));
  }, [sortedCategories, categorySearch]);

  const handleSelectCategory = (catId: string) => {
    if (activeCategoryRowIndex !== null && activeCategoryRowIndex >= 0) {
      if (catId) {
        trackCategoryUsage(catId);
        setCategoryUsageMap(getCategoryUsageMap());
      }
      handleUpdateRow(activeCategoryRowIndex, { categoryId: catId });
    }
    setShowCategoryModal(false);
    setActiveCategoryRowIndex(null);
  };

  const handleAddCategoryFromSearch = async () => {
    const trimmed = categorySearch.trim();
    if (!trimmed) {
      categorySearchInputRef.current?.focus();
      return;
    }
    if (isSubmittingCategory) return;

    // Check if category already exists (case-insensitive)
    const existing = categories.find(
      (c) => c.name.toLowerCase().trim() === trimmed.toLowerCase(),
    );

    if (existing) {
      handleSelectCategory(existing.id);
      return;
    }

    try {
      setIsSubmittingCategory(true);
      if (onCreateCategory) {
        const created = await onCreateCategory(trimmed);
        if (created && typeof created === "object" && "id" in created) {
          handleSelectCategory((created as any).id);
        }
      }
      setCategorySearch("");
    } catch (err) {
      console.error("Failed to create category from search", err);
    } finally {
      setIsSubmittingCategory(false);
    }
  };

  const handleInlineDeleteCategory = async (catId: string) => {
    setRows((prev) =>
      prev.map((r) => (r.categoryId === catId ? { ...r, categoryId: "" } : r)),
    );
    if (onDeleteCategory) {
      try {
        await onDeleteCategory(catId);
      } catch (err) {
        console.error("Failed to delete category", err);
      }
    }
  };

  const [activeUnitModal, setActiveUnitModal] = useState<{
    rowIndex: number;
    field: 'retail' | 'wholesale' | 'cost';
    currentUnit: string;
    productName?: string;
  } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showValidationErrors, setShowValidationErrors] = useState(false);

  // Custom & Recent Units management
  const { customUnits, addCustomUnit, removeCustomUnit, allUnitsFlat } = useCustomUnits();
  const { recentUnits } = useRecentUnits();

  
  // Quick bulk parse state
  const [showQuickParser, setShowQuickParser] = useState(false);
  const [quickParseText, setQuickParseText] = useState('');
  const [parseError, setParseError] = useState<string | null>(null);

  // Initialize with 1 row when modal opens
  useEffect(() => {
    if (isOpen) {
      setRows([createEmptyRow()]);
      setShowCategoryModal(false);
      setActiveCategoryRowIndex(null);
      setCategorySearch('');
      setIsEditCategoryMode(false);
      setActiveUnitModal(null);
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

      // 2. Keep units in sync if user changes retail unit, unless they manually overrode
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

  // Open unit selector modal helper
  const openUnitModal = (rowIndex: number, field: 'retail' | 'wholesale' | 'cost') => {
    const row = rows[rowIndex];
    if (row) {
      setActiveUnitModal({
        rowIndex,
        field,
        currentUnit: field === 'retail' ? row.retailPriceUnit : field === 'wholesale' ? row.wholesalePriceUnit : row.buyingPriceUnit,
        productName: row.name
      });
      setShowCategoryModal(false);
      setActiveCategoryRowIndex(null);
    }
  };

  // Keyboard Navigation
  type NavField = 'qty' | 'name' | 'retail' | 'retail-unit' | 'wholesale' | 'wholesale-unit' | 'cost' | 'cost-unit';

  const handleKeyDown = (e: React.KeyboardEvent<HTMLElement>, rowIndex: number, field: NavField) => {
    if (field === 'qty') handleMarkTouched(rowIndex, 'quantity');
    else if (field === 'name') handleMarkTouched(rowIndex, 'name');
    else if (field === 'retail') handleMarkTouched(rowIndex, 'retailPrice');
    else if (field === 'wholesale') handleMarkTouched(rowIndex, 'wholesalePrice');
    else if (field === 'cost') handleMarkTouched(rowIndex, 'buyingPrice');
    
    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();

      // When Enter is pressed on any unit button, immediately open its unit selector popup!
      if (field === 'retail-unit') {
        openUnitModal(rowIndex, 'retail');
        return;
      } else if (field === 'wholesale-unit') {
        openUnitModal(rowIndex, 'wholesale');
        return;
      } else if (field === 'cost-unit') {
        openUnitModal(rowIndex, 'cost');
        return;
      }
      
      let nextId = '';
      if (field === 'qty') {
        nextId = `name-${rowIndex}`;
      } else if (field === 'name') {
        nextId = `retail-${rowIndex}`;
      } else if (field === 'retail') {
        nextId = `retail-unit-${rowIndex}`;
      } else if (field === 'wholesale') {
        nextId = `wholesale-unit-${rowIndex}`;
      } else if (field === 'cost') {
        nextId = `cost-unit-${rowIndex}`;
      }

      if (nextId) {
        const nextEl = document.getElementById(nextId);
        if (nextEl) {
          nextEl.focus();
          if ('select' in nextEl && typeof (nextEl as any).select === 'function') {
            (nextEl as any).select();
          }
          nextEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      }
    } else if ((e.key === ' ' || e.key === 'ArrowDown') && field.endsWith('-unit')) {
      e.preventDefault();
      const unitField = field === 'retail-unit' ? 'retail' : field === 'wholesale-unit' ? 'wholesale' : 'cost';
      openUnitModal(rowIndex, unitField);
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
        !invalidRow.name ? 'Item Name (सामान का नाम)' : 'Prices (दाम)'
      }. Please check highlighted fields.`;
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
      className="fixed inset-0 z-[200] flex items-end justify-center bg-black/75 backdrop-blur-md p-0 md:items-center md:p-4 font-sans"
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
        <div className="flex items-center justify-between p-5 border-b border-[var(--border)] shrink-0 bg-[var(--card-solid,#0f172a)] modal-opaque">
          <div className="flex items-center gap-3.5">
            <div 
              style={{
                width: '31.9688px',
                height: '33px',
                marginTop: '-25px',
                paddingBottom: '0px',
                marginBottom: '-18px',
                marginLeft: '-11px'
              }}
              className="rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500 border border-amber-500/20 shadow-inner"
            >
              <Sparkles size={20} className="animate-pulse text-[var(--primary)]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 
                  style={{
                    fontSize: '12.75px',
                    marginTop: '0px',
                    paddingTop: '-5px',
                    lineHeight: '23.5px'
                  }}
                  className="font-black tracking-tighter uppercase text-[var(--foreground)] flex items-center gap-2"
                >
                  SMART ENTRY
                </h2>
              </div>
              <p 
                style={{ fontSize: '7px' }}
                className="font-black uppercase tracking-widest text-zinc-500 opacity-80"
              >
               Add Multiple Items
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Quick Parse Toggle Button */}
            <button
              onClick={() => setShowQuickParser(!showQuickParser)}
              style={{
                width: '102.98400000000001px',
                color: '#080808',
                backgroundColor: '#71eebb'
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black tracking-wide border transition-all cursor-pointer"
            >
              <FileText 
                size={14} 
                style={{
                  fontSize: '11.5px',
                  height: '16px',
                  width: '22.5625px'
                }}
              />
              ⚡ QUICK PASTE
            </button>

            <button
              onClick={onClose}
              style={{
                backgroundColor: '#ff1515',
                color: '#ffffff'
              }}
              className="rounded-xl p-2.5 border border-red-600 transition-colors cursor-pointer"
            >
              <X 
                size={18} 
                style={{
                  fontSize: '36px',
                  color: '#ffffff'
                }}
              />
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
          {/* Rows List */}
          <div className="space-y-4">
            <AnimatePresence initial={false}>
              {rows.map((row, index) => {
                const selectedCategory = categories.find(c => c.id === row.categoryId);
                const isCategoryNone = !selectedCategory;
                const isShortCategoryName = selectedCategory ? selectedCategory.name.length <= 6 : true;
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
                      "bg-[var(--card)] border rounded-xl p-2 sm:p-2.5 px-3 sm:px-3.5 relative space-y-1.5 shadow-sm hover:border-[var(--primary)] transition-all duration-200",
                      hasError 
                        ? "border-red-500 bg-red-500/[0.02] shadow-[0_0_12px_rgba(239,68,68,0.1)]" 
                        : "border-[var(--border)]"
                    )}
                  >
                    {/* Compact Top Bar: [1] [Category: NAME >] [Stock: 1] in single tight horizontal scroll/flex bar | Delete at far right */}
                    <div className="flex items-center justify-between border-b border-[var(--border)]/40 pb-1 mb-1 gap-1.5">
                      {/* Left/Center: Single tight horizontal scroll/flex bar */}
                      <div className="flex items-center gap-1.5 min-w-0 flex-1 overflow-x-auto no-scrollbar py-0.5">
                        {/* Row badge [1] */}
                        <span className={cn(
                          "h-5 w-5 rounded-full text-[10px] font-black flex items-center justify-center border transition-colors shrink-0",
                          hasError 
                            ? "bg-red-500/10 text-red-500 border-red-500/30" 
                            : "bg-[var(--background)] text-zinc-400 border-[var(--border)]"
                        )}>
                          {index + 1}
                        </span>

                        {/* [Category: NAME >] */}
                        <button
                          type="button"
                          onClick={() => {
                            setCategorySearch("");
                            setCategoryUsageMap(getCategoryUsageMap());
                            setIsEditCategoryMode(false);
                            setActiveCategoryRowIndex(index);
                            setShowCategoryModal(true);
                          }}
                          className="inline-flex items-center gap-1 sm:gap-1.5 px-2 py-0.5 rounded-lg border border-[var(--border)] bg-[var(--background)] hover:border-[var(--primary)]/50 hover:bg-[var(--card)] transition-all cursor-pointer shadow-2xs active:scale-95 group shrink-0 whitespace-nowrap"
                          title="Click to select or manage category"
                        >
                          {!isCategoryNone && !isShortCategoryName && (
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="12"
                              height="12"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              className="sm:hidden text-zinc-400 dark:text-zinc-500 group-hover:text-[var(--primary)] transition-colors shrink-0"
                            >
                              <path d="M12 2l10 5-10 5-10-5 10-5z" />
                              <path d="M2 12l10 5 10-5" />
                              <path d="M2 17l10 5 10-5" />
                            </svg>
                          )}

                          <span
                            className={cn(
                              "text-[9.5px] sm:text-[10px] font-black uppercase tracking-wider text-zinc-500 dark:text-zinc-400 shrink-0",
                              !isCategoryNone && !isShortCategoryName ? "hidden sm:inline" : "inline"
                            )}
                          >
                            category:
                          </span>

                          <span
                            className={cn(
                              "font-black text-[11px] sm:text-xs uppercase tracking-wide",
                              selectedCategory
                                ? "text-[var(--primary)]"
                                : "text-zinc-500 font-bold",
                            )}
                          >
                            {selectedCategory ? selectedCategory.name.toUpperCase() : "SELECT"}
                          </span>

                          <ChevronRight
                            size={11}
                            className="text-zinc-400 group-hover:text-[var(--primary)] group-hover:translate-x-0.5 transition-all shrink-0 ml-0.5"
                          />
                        </button>

                        {/* [Stock: 1] */}
                        <div className={cn(
                          "flex items-center gap-1 bg-[var(--background)] border px-1.5 sm:px-2 py-0.5 rounded-lg transition-all shrink-0 shadow-2xs whitespace-nowrap",
                          showValidationErrors && errors.quantity 
                            ? "border-red-500 ring-1 ring-red-500/30" 
                            : "border-[var(--border)] hover:border-[var(--primary)]/40 focus-within:border-[var(--primary)] focus-within:ring-1 focus-within:ring-[var(--primary)]/20"
                        )}>
                          <div className="flex items-center gap-1 shrink-0 select-none">
                            <Layers size={11} className="text-teal-600 dark:text-teal-400 shrink-0" />
                            <span className="text-[9px] sm:text-[9.5px] font-black uppercase tracking-wider text-teal-800 dark:text-teal-300">
                              Stock:
                            </span>
                          </div>
                          <input
                            id={`qty-${index}`}
                            type="number"
                            min="0"
                            step="any"
                            placeholder="0"
                            className="w-9 sm:w-11 bg-transparent text-right font-black font-mono text-[10.5px] sm:text-[11px] text-[var(--foreground)] focus:outline-none placeholder:opacity-30"
                            value={row.quantity}
                            onChange={(e) => handleUpdateRow(index, { quantity: e.target.value })}
                            onBlur={() => handleMarkTouched(index, 'quantity')}
                            onKeyDown={(e) => handleKeyDown(e, index, 'qty')}
                          />
                        </div>
                      </div>

                      {/* Far Right: Delete trash icon (and Copy button if index > 0) */}
                      <div className="flex items-center gap-1 shrink-0 ml-auto pl-1 justify-end">
                        {hasError && (
                          <span className="text-[9px] text-red-500 font-bold items-center gap-0.5 animate-pulse shrink-0 hidden lg:inline-flex">
                            <AlertCircle size={10} />
                          </span>
                        )}

                        {index > 0 && (
                          <button
                            type="button"
                            onClick={() => handleCopyPrevRow(index)}
                            title="Copy Category & Units from row above"
                            className="p-1 rounded-md text-zinc-400 hover:text-[var(--foreground)] hover:bg-[var(--foreground)]/5 transition-colors cursor-pointer shrink-0"
                          >
                            <Copy size={12} />
                          </button>
                        )}

                        {/* Delete trash icon at the far right */}
                        <button
                          type="button"
                          onClick={() => handleDeleteRow(index)}
                          className="p-1 rounded-md text-zinc-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer shrink-0"
                          title="Delete Row"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>

                    {/* Format layout */}
                    <div className="flex flex-col gap-2 md:flex-row md:items-center">
                      
                      {/* 1. Item Name */}
                      <div className="flex-1 min-w-[180px]">
                        <div className="relative">
                          <input
                            id={`name-${index}`}
                            type="text"
                            placeholder="Item name (सामान का नाम)..."
                            style={{ height: '32.5px' }}
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
                        PRICES & UNITS / दाम व इकाई
                      </div>

                      {/* Pricing Specs Block - Centered and snug */}
                      <div className="flex flex-wrap items-center justify-center gap-2.5 w-full md:w-auto bg-[var(--background)] border border-[var(--border)] rounded-2xl p-2 md:p-1.5 mx-auto">
                        
                        {/* 2. Retail Price per unit Boundary Box */}
                        <div className={cn(
                          "flex items-center justify-center gap-1.5 w-auto min-w-[160px] px-2.5 py-1.5 md:py-1 rounded-xl border-2 transition-all bg-[var(--card)] shadow-xs shrink-0",
                          showValidationErrors && errors.retailPrice 
                            ? "border-red-500 ring-2 ring-red-500/30 bg-red-500/[0.04]" 
                            : "border-emerald-500/60 dark:border-emerald-500/40 hover:border-emerald-500 focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/25"
                        )}>
                          <span className="text-[8px] font-black uppercase text-emerald-600 dark:text-emerald-400 bg-emerald-500/15 px-1.5 py-0.5 rounded shrink-0 select-none">
                            Retail
                          </span>
                          <span className="text-zinc-500 dark:text-zinc-400 font-mono text-xs select-none font-black shrink-0">₹</span>
                          <input
                            id={`retail-${index}`}
                            type="text"
                            inputMode="decimal"
                            pattern="[0-9]*\.?[0-9]*"
                            placeholder="0.00"
                            className={cn(
                              "w-16 min-w-[56px] shrink-0 bg-transparent font-black font-mono text-center text-sm md:text-xs text-[var(--foreground)] focus:outline-none placeholder:text-zinc-400 dark:placeholder:text-zinc-600",
                              showValidationErrors && errors.retailPrice ? "text-red-500" : ""
                            )}
                            value={row.retailPrice}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val === '' || /^\d*\.?\d*$/.test(val)) {
                                handleUpdateRow(index, { retailPrice: val });
                              }
                            }}
                            onBlur={() => handleMarkTouched(index, 'retailPrice')}
                            onKeyDown={(e) => handleKeyDown(e, index, 'retail')}
                          />
                          <span className="text-zinc-400 font-mono select-none text-[9px] font-bold shrink-0">/</span>
                          
                          {/* Unit Selector Button */}
                          <div className="relative shrink-0">
                            <button
                              type="button"
                              id={`retail-unit-${index}`}
                              onClick={() => openUnitModal(index, 'retail')}
                              onKeyDown={(e) => handleKeyDown(e, index, 'retail-unit')}
                              className="px-2 py-0.5 rounded-lg bg-[var(--background)] border border-[var(--border)] hover:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 text-[10px] font-black text-zinc-400 hover:text-[var(--foreground)] focus:text-emerald-500 transition-all uppercase tracking-wider min-w-[36px] flex items-center justify-center gap-0.5 cursor-pointer active:scale-95 shadow-2xs"
                              title="Click or press Enter to open unit selector"
                            >
                              <span>{row.retailPriceUnit}</span>
                              <ChevronDown size={10} className="opacity-40 shrink-0" />
                            </button>
                          </div>
                        </div>

                        {/* 3. Wholesale Price per unit Boundary Box */}
                        <div className={cn(
                          "flex items-center justify-center gap-1.5 w-auto min-w-[175px] px-2.5 py-1.5 md:py-1 rounded-xl border-2 transition-all bg-[var(--card)] shadow-xs shrink-0",
                          showValidationErrors && errors.wholesalePrice 
                            ? "border-red-500 ring-2 ring-red-500/30 bg-red-500/[0.04]" 
                            : "border-blue-500/60 dark:border-blue-500/40 hover:border-blue-500 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/25"
                        )}>
                          <span 
                            className="text-[8px] font-black uppercase text-blue-600 dark:text-blue-400 bg-blue-500/15 px-1.5 py-0.5 rounded shrink-0 select-none"
                          >
                            Wholesale
                          </span>
                          <span className="text-zinc-500 dark:text-zinc-400 font-mono text-xs select-none font-black shrink-0">₹</span>
                          <input
                            id={`wholesale-${index}`}
                            type="text"
                            inputMode="decimal"
                            pattern="[0-9]*\.?[0-9]*"
                            placeholder="0.00"
                            className={cn(
                              "w-16 min-w-[56px] shrink-0 bg-transparent font-black font-mono text-center text-sm md:text-xs text-[var(--foreground)] focus:outline-none placeholder:text-zinc-400 dark:placeholder:text-zinc-600",
                              showValidationErrors && errors.wholesalePrice ? "text-red-500" : ""
                            )}
                            value={row.wholesalePrice}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val === '' || /^\d*\.?\d*$/.test(val)) {
                                handleUpdateRow(index, { wholesalePrice: val });
                              }
                            }}
                            onBlur={() => handleMarkTouched(index, 'wholesalePrice')}
                            onKeyDown={(e) => handleKeyDown(e, index, 'wholesale')}
                          />
                          <span className="text-zinc-400 font-mono select-none text-[9px] font-bold shrink-0">/</span>

                          {/* Unit Selector Button */}
                          <div className="relative shrink-0">
                            <button
                              type="button"
                              id={`wholesale-unit-${index}`}
                              onClick={() => openUnitModal(index, 'wholesale')}
                              onKeyDown={(e) => handleKeyDown(e, index, 'wholesale-unit')}
                              className="px-2 py-0.5 rounded-lg bg-[var(--background)] border border-[var(--border)] hover:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 text-[10px] font-black text-zinc-400 hover:text-[var(--foreground)] focus:text-blue-500 transition-all uppercase tracking-wider min-w-[36px] flex items-center justify-center gap-0.5 cursor-pointer active:scale-95 shadow-2xs"
                              title="Click or press Enter to open unit selector"
                            >
                              <span>{row.wholesalePriceUnit}</span>
                              <ChevronDown size={10} className="opacity-40 shrink-0" />
                            </button>
                          </div>
                        </div>

                        {/* 4. Cost Price per unit Boundary Box */}
                        <div className={cn(
                          "flex items-center justify-center gap-1.5 w-auto min-w-[160px] px-2.5 py-1.5 md:py-1 rounded-xl border-2 transition-all bg-[var(--card)] shadow-xs shrink-0",
                          showValidationErrors && errors.buyingPrice 
                            ? "border-red-500 ring-2 ring-red-500/30 bg-red-500/[0.04]" 
                            : "border-amber-500/60 dark:border-amber-500/40 hover:border-amber-500 focus-within:border-amber-500 focus-within:ring-2 focus-within:ring-amber-500/25"
                        )}>
                          <span className="text-[8px] font-black uppercase text-amber-600 dark:text-amber-400 bg-amber-500/15 px-1.5 py-0.5 rounded shrink-0 select-none">
                            Cost
                          </span>
                          <span className="text-zinc-500 dark:text-zinc-400 font-mono text-xs select-none font-black shrink-0">₹</span>
                          <input
                            id={`cost-${index}`}
                            type="text"
                            inputMode="decimal"
                            pattern="[0-9]*\.?[0-9]*"
                            placeholder="0.00"
                            className={cn(
                              "w-16 min-w-[56px] shrink-0 bg-transparent font-black font-mono text-center text-sm md:text-xs text-[var(--foreground)] focus:outline-none placeholder:text-zinc-400 dark:placeholder:text-zinc-600",
                              showValidationErrors && errors.buyingPrice ? "text-red-500" : ""
                            )}
                            value={row.buyingPrice}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val === '' || /^\d*\.?\d*$/.test(val)) {
                                handleUpdateRow(index, { buyingPrice: val });
                              }
                            }}
                            onBlur={() => handleMarkTouched(index, 'buyingPrice')}
                            onKeyDown={(e) => handleKeyDown(e, index, 'cost')}
                          />
                          <span className="text-zinc-400 font-mono select-none text-[9px] font-bold shrink-0">/</span>

                          {/* Unit Selector Button */}
                          <div className="relative shrink-0">
                            <button
                              type="button"
                              id={`cost-unit-${index}`}
                              onClick={() => openUnitModal(index, 'cost')}
                              onKeyDown={(e) => handleKeyDown(e, index, 'cost-unit')}
                              className="px-2 py-0.5 rounded-lg bg-[var(--background)] border border-[var(--border)] hover:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 text-[10px] font-black text-zinc-400 hover:text-[var(--foreground)] focus:text-amber-500 transition-all uppercase tracking-wider min-w-[36px] flex items-center justify-center gap-0.5 cursor-pointer active:scale-95 shadow-2xs"
                              title="Click or press Enter to open unit selector"
                            >
                              <span>{row.buyingPriceUnit}</span>
                              <ChevronDown size={10} className="opacity-40 shrink-0" />
                            </button>
                          </div>
                        </div>

                        {/* Desktop Delete Row Button */}
                        <button
                          type="button"
                          onClick={() => handleDeleteRow(index)}
                          className="hidden md:flex p-1.5 rounded-md bg-rose-500/10 hover:bg-rose-500 hover:text-white text-rose-400 border border-rose-500/20 hover:border-rose-500 transition-all cursor-pointer items-center justify-center shrink-0 self-center"
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

          {/* Subtle bottom spacing */}
          <div className="h-4" />
        </div>

        {/* Sticky Floating Bottom Bar - Pinned at the bottom */}
        <div className="p-3 sm:p-4 px-4 sm:px-6 border-t border-[var(--border)] shrink-0 bg-[var(--card)]/95 backdrop-blur-md shadow-2xl z-20 flex items-center justify-between gap-2.5 sm:gap-4">
          {/* + ADD MULTIPLE ITEM ROW button */}
          <button
            type="button"
            onClick={handleAddRow}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 sm:px-6 py-3.5 rounded-xl border-2 border-dashed border-[var(--border)] hover:border-[var(--primary)] bg-[var(--background)] hover:bg-[var(--card)] text-xs font-black tracking-wider uppercase text-[var(--foreground)] hover:text-[var(--primary)] transition-all cursor-pointer shadow-2xs hover:scale-[1.01] active:scale-95"
            title="Add a new row to entry list"
          >
            <Plus size={16} className="text-[var(--primary)] shrink-0" />
            <span className="truncate">
              <span className="sm:hidden">ADD</span>
              <span className="hidden sm:inline">+ ADD MULTIPLE ITEM ROW</span>
            </span>
          </button>

          {/* BATCH SAVE ASSETS action button */}
          <button
            type="button"
            onClick={handleSaveAll}
            disabled={isSaving}
            className="flex-1 sm:flex-initial sm:min-w-[240px] px-6 sm:px-8 py-3.5 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-600 shadow-lg shadow-amber-500/20 text-xs font-black tracking-widest uppercase text-neutral-950 hover:from-amber-400 hover:to-amber-500 transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isSaving ? (
              <span className="h-4 w-4 rounded-full border-2 border-neutral-950 border-t-transparent animate-spin shrink-0" />
            ) : (
              <Save size={16} className="shrink-0" />
            )}
            <span className="truncate"> SAVE </span>
          </button>
        </div>

        {/* Professional Full-Featured Unit Selector & Creator Modal */}
        <AnimatePresence>
          {activeUnitModal && (
            <UnitSelectorModal
              currentUnit={activeUnitModal.currentUnit}
              title={activeUnitModal.field === 'retail' ? 'Retail Unit' : activeUnitModal.field === 'wholesale' ? 'Wholesale Unit' : 'Cost Unit'}
              subtitle={activeUnitModal.productName || undefined}
              showApplyToAllOption={true}
              onSelect={(unit, applyToAll) => {
                const idx = activeUnitModal.rowIndex;
                const fld = activeUnitModal.field;
                if (applyToAll) {
                  handleUpdateRow(idx, {
                    retailPriceUnit: unit,
                    wholesalePriceUnit: unit,
                    buyingPriceUnit: unit
                  });
                } else {
                  if (fld === 'retail') {
                    handleUpdateRow(idx, { retailPriceUnit: unit });
                  } else if (fld === 'wholesale') {
                    handleUpdateRow(idx, { wholesalePriceUnit: unit });
                  } else {
                    handleUpdateRow(idx, { buyingPriceUnit: unit });
                  }
                }
                setActiveUnitModal(null);

                // Auto-advance focus to the next field in order
                const nextFieldId = fld === 'retail' 
                  ? `wholesale-${idx}` 
                  : fld === 'wholesale' 
                    ? `cost-${idx}` 
                    : (idx < rows.length - 1 ? `name-${idx + 1}` : undefined);

                if (nextFieldId) {
                  setTimeout(() => {
                    const el = document.getElementById(nextFieldId);
                    if (el) {
                      el.focus();
                      if ('select' in el && typeof (el as any).select === 'function') {
                        (el as any).select();
                      }
                      el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                    }
                  }, 60);
                } else if (fld === 'cost' && idx === rows.length - 1) {
                  handleAddRow();
                }
              }}
              onClose={() => setActiveUnitModal(null)}
            />
          )}
        </AnimatePresence>

        {/* Small Category Selection Popup Modal (Identical to Full Entry) */}
        <AnimatePresence>
          {showCategoryModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[250] flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
              onClick={() => {
                setShowCategoryModal(false);
                setActiveCategoryRowIndex(null);
              }}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                transition={{ type: "spring", duration: 0.25, bounce: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-[340px] rounded-2xl bg-[var(--card-solid,#0f172a)] modal-opaque border border-[var(--border)] shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
              >
                {/* Header */}
                <div className="flex items-center justify-between gap-2 p-3.5 pb-2.5 border-b border-[var(--border)] shrink-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="text-[var(--primary)] shrink-0"
                    >
                      <path d="M12 2l10 5-10 5-10-5 10-5z" />
                      <path d="M2 12l10 5 10-5" />
                      <path d="M2 17l10 5 10-5" />
                    </svg>
                    <h3 className="text-xs sm:text-sm font-black text-[var(--foreground)] uppercase tracking-wider shrink-0">
                      Categories
                    </h3>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {/* "Manage" button on the right side */}
                    <button
                      type="button"
                      onClick={() => setIsEditCategoryMode(!isEditCategoryMode)}
                      className={cn(
                        "h-6.5 px-2.5 rounded-lg border text-[10.5px] font-bold flex items-center gap-1 transition-all cursor-pointer shrink-0",
                        isEditCategoryMode
                          ? "border-rose-500 bg-rose-500/10 text-rose-600 dark:text-rose-400"
                          : "border-[var(--border)] bg-[var(--card)] hover:bg-black/5 dark:hover:bg-white/5 text-[var(--foreground)]",
                      )}
                      title="Manage categories (delete)"
                    >
                      {isEditCategoryMode ? (
                        <>
                          <Check size={11} strokeWidth={2.5} />
                          <span>Done</span>
                        </>
                      ) : (
                        <>
                          <Settings2 size={11} />
                          <span>Manage</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setShowCategoryModal(false);
                        setActiveCategoryRowIndex(null);
                      }}
                      className="w-6.5 h-6.5 rounded-lg bg-[var(--background)] hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 flex items-center justify-center transition-colors cursor-pointer shrink-0"
                      title="Close"
                    >
                      <X size={13} />
                    </button>
                  </div>
                </div>

                {/* Search Bar with +Add Button inside on the right */}
                <div className="p-3 border-b border-[var(--border)] shrink-0 bg-[var(--background)]/40">
                  <div className="relative flex items-center">
                    <Search
                      size={14}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none"
                    />
                    <input
                      ref={categorySearchInputRef}
                      type="text"
                      placeholder="Search or add category..."
                      value={categorySearch}
                      onChange={(e) => setCategorySearch(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddCategoryFromSearch();
                        }
                      }}
                      className="w-full h-9 pl-9 pr-24 rounded-xl border border-[var(--border)] bg-[var(--card)] font-medium text-xs text-[var(--foreground)] placeholder:text-zinc-400 focus:border-[var(--primary)] focus:outline-none transition-all shadow-inner"
                      autoFocus
                    />

                    {/* Right side controls: Clear (if typed) + "+ Add" button */}
                    <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
                      {categorySearch && (
                        <button
                          type="button"
                          onClick={() => setCategorySearch("")}
                          className="p-1 rounded-md text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer"
                          title="Clear search"
                        >
                          <X size={12} />
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={handleAddCategoryFromSearch}
                        disabled={isSubmittingCategory}
                        className={cn(
                          "h-6.5 px-2.5 rounded-lg font-bold text-xs flex items-center gap-1 transition-all cursor-pointer shadow-xs active:scale-95 shrink-0",
                          categorySearch.trim()
                            ? "bg-[var(--primary)] hover:opacity-90 text-white"
                            : "bg-[var(--primary)]/10 hover:bg-[var(--primary)] text-[var(--primary)] hover:text-white",
                        )}
                        title={
                          categorySearch.trim()
                            ? `Add "${categorySearch.trim()}"`
                            : "Type category name and click Add"
                        }
                      >
                        {isSubmittingCategory ? (
                          <Loader2 size={11} className="animate-spin" />
                        ) : (
                          <Plus size={12} strokeWidth={2.5} />
                        )}
                        <span>Add</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Category Pill / Chip Cloud */}
                <div className="p-3 overflow-y-auto max-h-[300px] flex flex-wrap gap-1.5 no-scrollbar content-start">
                  {/* None / Clear Option */}
                  <button
                    type="button"
                    onClick={() => handleSelectCategory("")}
                    className={cn(
                      "h-8 px-3 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs active:scale-95 uppercase tracking-wide",
                      activeCategoryRowIndex !== null && !rows[activeCategoryRowIndex]?.categoryId
                        ? "bg-[var(--primary)] text-white font-black shadow-xs"
                        : "bg-[var(--background)] hover:bg-[var(--card)] text-zinc-500 border border-[var(--border)]",
                    )}
                  >
                    <span>NONE</span>
                    {activeCategoryRowIndex !== null && !rows[activeCategoryRowIndex]?.categoryId && (
                      <Check size={12} strokeWidth={2.5} className="shrink-0" />
                    )}
                  </button>

                  {filteredCategories.map((cat) => {
                    const isSelected = activeCategoryRowIndex !== null && rows[activeCategoryRowIndex]?.categoryId === cat.id;
                    return (
                      <div
                        key={cat.id}
                        className={cn(
                          "relative inline-flex items-center rounded-full transition-all group",
                          isSelected
                            ? "bg-[var(--primary)] text-white shadow-xs"
                            : "bg-[var(--background)] hover:bg-[var(--card)] text-[var(--foreground)] border border-[var(--border)]",
                        )}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            if (!isEditCategoryMode) {
                              handleSelectCategory(cat.id);
                            }
                          }}
                          className={cn(
                            "h-8 flex items-center gap-1.5 text-xs font-semibold cursor-pointer active:scale-95 transition-transform",
                            isEditCategoryMode ? "pl-3 pr-1.5" : "px-3",
                            isSelected && "font-black",
                          )}
                        >
                          <span className="truncate max-w-[140px] uppercase font-bold tracking-wide">
                            {cat.name.toUpperCase()}
                          </span>
                          {isSelected && !isEditCategoryMode && (
                            <Check size={12} strokeWidth={2.5} className="text-white shrink-0" />
                          )}
                        </button>

                        {isEditCategoryMode && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleInlineDeleteCategory(cat.id);
                            }}
                            className="w-5 h-5 mr-1.5 rounded-full bg-rose-500/20 hover:bg-rose-500 text-rose-500 hover:text-white flex items-center justify-center transition-colors cursor-pointer shrink-0"
                            title={`Delete ${cat.name}`}
                          >
                            <Trash2 size={10} strokeWidth={2.5} />
                          </button>
                        )}
                      </div>
                    );
                  })}

                  {filteredCategories.length === 0 && (
                    <div className="w-full py-6 text-center text-xs text-zinc-400 space-y-2.5">
                      <p>No category matching "{categorySearch.trim().toUpperCase()}"</p>
                      {categorySearch.trim() && (
                        <button
                          type="button"
                          onClick={handleAddCategoryFromSearch}
                          disabled={isSubmittingCategory}
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[var(--primary)] text-white text-xs font-bold hover:opacity-90 transition-all cursor-pointer shadow-xs active:scale-95 uppercase tracking-wide"
                        >
                          {isSubmittingCategory ? (
                            <Loader2 size={12} className="animate-spin" />
                          ) : (
                            <Plus size={12} strokeWidth={2.5} />
                          )}
                          <span>Create "{categorySearch.trim().toUpperCase()}"</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}
