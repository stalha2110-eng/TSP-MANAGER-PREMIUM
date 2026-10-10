import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Search, Plus, Minus, Trash2, Smartphone, Monitor, Zap, 
  ArrowRight, CheckCircle2, RotateCcw, X, CreditCard, 
  Sparkles, Check, IndianRupee, Layers, ChevronRight, 
  ShoppingCart, SlidersHorizontal, Scale, QrCode, SplitSquareVertical,
  Maximize2, Minimize2, Clock, ThumbsUp, Flame, Keyboard, CornerDownLeft
} from 'lucide-react';
import { cn, formatNumber } from '../lib/utils';
import { Item, AppState } from '../types';

export type DemoLayoutType = 'split' | 'touch' | 'grid';
export type DemoViewMode = 'improved' | 'current' | 'side-by-side';
export type DemoDeviceViewport = 'mobile' | 'desktop';

interface DemoCartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  unit: string;
  category: string;
}

export interface DemoItem {
  id: string;
  name: string;
  retailPrice: number;
  wholesalePrice?: number;
  unit: string;
  quantity: number;
  category: string;
  translations?: {
    en: string;
    hi?: string;
    mr?: string;
    'hi-en'?: string;
  };
}

const SAMPLE_DEMO_ITEMS: DemoItem[] = [
  {
    id: 'demo-item-1',
    name: 'Premium Basmati Rice',
    retailPrice: 120,
    wholesalePrice: 105,
    unit: 'kg',
    quantity: 85,
    category: 'Grains & Rice',
    translations: { en: 'Premium Basmati Rice', hi: 'बासमती चावल', mr: 'बासमती तांदूळ', 'hi-en': 'Basmati Chawal' }
  },
  {
    id: 'demo-item-2',
    name: 'Organic Wheat Flour (Atta)',
    retailPrice: 48,
    wholesalePrice: 42,
    unit: 'kg',
    quantity: 120,
    category: 'Flour & Staples',
    translations: { en: 'Organic Wheat Flour', hi: 'गेहूं का आटा', mr: 'गव्हाचे पीठ', 'hi-en': 'Gehun Atta' }
  },
  {
    id: 'demo-item-3',
    name: 'Fresh Cow Milk (Pouch)',
    retailPrice: 32,
    wholesalePrice: 29,
    unit: 'packet',
    quantity: 60,
    category: 'Dairy',
    translations: { en: 'Cow Milk', hi: 'गाय का दूध', mr: 'गाईचे दूध', 'hi-en': 'Gai Ka Doodh' }
  },
  {
    id: 'demo-item-4',
    name: 'Pure Desi Ghee 500g',
    retailPrice: 340,
    wholesalePrice: 310,
    unit: 'jar',
    quantity: 25,
    category: 'Dairy',
    translations: { en: 'Desi Ghee', hi: 'देसी घी', mr: 'तूप', 'hi-en': 'Desi Ghee' }
  },
  {
    id: 'demo-item-5',
    name: 'Toor Dal Premium',
    retailPrice: 165,
    wholesalePrice: 148,
    unit: 'kg',
    quantity: 50,
    category: 'Pulses & Dals',
    translations: { en: 'Toor Dal', hi: 'अरहर दाल', mr: 'तूर डाळ', 'hi-en': 'Toor Dal' }
  },
  {
    id: 'demo-item-6',
    name: 'Refined Sunflower Oil 1L',
    retailPrice: 142,
    wholesalePrice: 130,
    unit: 'bottle',
    quantity: 40,
    category: 'Edible Oils',
    translations: { en: 'Sunflower Oil', hi: 'सूरजमुखी तेल', mr: 'सूर्यफूल तेल', 'hi-en': 'Sunflower Oil' }
  },
  {
    id: 'demo-item-7',
    name: 'Tata Iodized Salt 1kg',
    retailPrice: 28,
    wholesalePrice: 24,
    unit: 'packet',
    quantity: 110,
    category: 'Spices & Seasoning',
    translations: { en: 'Tata Salt', hi: 'टाटा नमक', mr: 'टाटा मीठ', 'hi-en': 'Tata Namak' }
  },
  {
    id: 'demo-item-8',
    name: 'Sugar Pure Crystal 1kg',
    retailPrice: 46,
    wholesalePrice: 41,
    unit: 'kg',
    quantity: 90,
    category: 'Flour & Staples',
    translations: { en: 'Sugar Crystal', hi: 'चीनी', mr: 'साखर', 'hi-en': 'Cheeni' }
  }
];

interface BillingDemoWorkbenchProps {
  isOpen: boolean;
  onClose: () => void;
  availableItems?: Item[];
  storeName?: string;
  onSelectPreferredLayout?: (layout: DemoLayoutType) => void;
}

export const BillingDemoWorkbench: React.FC<BillingDemoWorkbenchProps> = ({
  isOpen,
  onClose,
  availableItems,
  storeName = 'Modern Retail Store',
  onSelectPreferredLayout
}) => {
  // Configurable workbench states
  const [layout, setLayout] = useState<DemoLayoutType>('touch');
  const [viewMode, setViewMode] = useState<DemoViewMode>('improved');
  const [viewport, setViewport] = useState<DemoDeviceViewport>('mobile');

  // Search & category states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  
  // Cart state
  const [cart, setCart] = useState<DemoCartItem[]>([
    { id: 'demo-item-1', name: 'Premium Basmati Rice', price: 120, quantity: 2, unit: 'kg', category: 'Grains & Rice' },
    { id: 'demo-item-3', name: 'Fresh Cow Milk (Pouch)', price: 32, quantity: 2, unit: 'packet', category: 'Dairy' }
  ]);
  const [isSlideOverCartOpen, setIsSlideOverCartOpen] = useState(false);
  const [showCheckoutSuccess, setShowCheckoutSuccess] = useState(false);
  const [selectedPaymentType, setSelectedPaymentType] = useState<'cash' | 'upi' | 'udhar'>('cash');
  const [cashTendered, setCashTendered] = useState<number | null>(null);

  // Interaction telemetry tracking for the comparison HUD
  const [tapCount, setTapCount] = useState<number>(4);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(9);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(true);
  const [hasChosenLayout, setHasChosenLayout] = useState<DemoLayoutType | null>(null);

  // High-density table entry state
  const [gridRowInput, setGridRowInput] = useState({ query: '', qty: '1', rate: '' });
  const gridInputRef = useRef<HTMLInputElement>(null);

  // Combine store products or fall back to rich demo dataset
  const productCatalog: DemoItem[] = useMemo(() => {
    if (availableItems && availableItems.length >= 4) {
      return availableItems.map(item => ({
        id: item.id,
        name: item.name,
        retailPrice: item.retailPrice,
        wholesalePrice: item.wholesalePrice,
        unit: item.unit || 'pcs',
        quantity: item.quantity,
        category: (item as any).category || (item.categoryId ? `Category` : 'General'),
        translations: item.translations
      }));
    }
    return SAMPLE_DEMO_ITEMS;
  }, [availableItems]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    productCatalog.forEach(p => {
      if (p.category) set.add(p.category);
    });
    return ['All', ...Array.from(set)];
  }, [productCatalog]);

  const filteredCatalog = useMemo(() => {
    return productCatalog.filter(item => {
      const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q || 
        item.name.toLowerCase().includes(q) || 
        (item.translations?.hi && item.translations.hi.toLowerCase().includes(q)) ||
        (item.translations?.mr && item.translations.mr.toLowerCase().includes(q));
      return matchesCategory && matchesSearch;
    });
  }, [productCatalog, selectedCategory, searchQuery]);

  // Financial calculations
  const subtotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  }, [cart]);

  const totalItemCount = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.quantity, 0);
  }, [cart]);

  // Elapsed time incrementer
  useEffect(() => {
    let interval: any = null;
    if (isTimerRunning && isOpen) {
      interval = setInterval(() => {
        setElapsedSeconds(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, isOpen]);

  // Cart operations with tap count telemetry
  const incrementTap = () => setTapCount(prev => prev + 1);

  const handleAddToCart = (item: DemoItem, addedQty = 1) => {
    incrementTap();
    setCart(prev => {
      const existing = prev.find(ci => ci.id === item.id);
      if (existing) {
        return prev.map(ci => 
          ci.id === item.id 
            ? { ...ci, quantity: Number((ci.quantity + addedQty).toFixed(2)) }
            : ci
        );
      }
      return [
        ...prev,
        {
          id: item.id,
          name: item.name,
          price: item.retailPrice,
          quantity: addedQty,
          unit: item.unit || 'pcs',
          category: item.category || 'General'
        }
      ];
    });
  };

  const handleUpdateQty = (itemId: string, newQty: number) => {
    incrementTap();
    if (newQty <= 0) {
      setCart(prev => prev.filter(ci => ci.id !== itemId));
    } else {
      setCart(prev => prev.map(ci => 
        ci.id === itemId 
          ? { ...ci, quantity: Number(newQty.toFixed(2)) }
          : ci
      ));
    }
  };

  const handleQuickWeightAdd = (item: DemoItem, weightMultiplier: number) => {
    incrementTap();
    handleAddToCart(item, weightMultiplier);
  };

  const handleCompleteBill = () => {
    incrementTap();
    setIsTimerRunning(false);
    setShowCheckoutSuccess(true);
  };

  const handleResetDemo = () => {
    setCart([
      { id: 'demo-item-1', name: 'Premium Basmati Rice', price: 120, quantity: 2, unit: 'kg', category: 'Grains & Rice' },
      { id: 'demo-item-3', name: 'Fresh Cow Milk (Pouch)', price: 32, quantity: 2, unit: 'packet', category: 'Dairy' }
    ]);
    setTapCount(3);
    setElapsedSeconds(8);
    setIsTimerRunning(true);
    setShowCheckoutSuccess(false);
    setCashTendered(null);
  };

  const handleAdoptLayout = (selected: DemoLayoutType) => {
    setHasChosenLayout(selected);
    localStorage.setItem('preferred_billing_layout', selected);
    if (onSelectPreferredLayout) {
      onSelectPreferredLayout(selected);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1000] bg-slate-950/85 backdrop-blur-md flex flex-col font-sans text-slate-100 overflow-hidden">
      {/* 1. TOP DEMO CONTROLLER TOOLBAR */}
      <header className="shrink-0 bg-slate-900 border-b border-slate-800 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 shadow-lg z-30">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-slate-950 flex items-center justify-center font-black shadow-md shadow-emerald-500/20">
            <Zap size={18} className="fill-slate-950" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-black tracking-tight text-white flex items-center gap-1.5">
                Fast Billing Section UX Redesign
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Interactive Demo
                </span>
              </h2>
            </div>
            <p className="text-[10px] text-slate-400">
              Test & compare 3 mobile-first high-speed billing paradigms against standard workflow
            </p>
          </div>
        </div>

        {/* Viewport & Mode Switcher Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Viewport: Mobile vs Desktop */}
          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-[11px] font-bold">
            <button
              onClick={() => setViewport('mobile')}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-all cursor-pointer",
                viewport === 'mobile' 
                  ? "bg-emerald-600 text-white shadow-sm" 
                  : "text-slate-400 hover:text-white"
              )}
              title="Mobile phone 390px viewport"
            >
              <Smartphone size={13} />
              <span>📱 Mobile (Handheld)</span>
            </button>
            <button
              onClick={() => setViewport('desktop')}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-all cursor-pointer",
                viewport === 'desktop' 
                  ? "bg-emerald-600 text-white shadow-sm" 
                  : "text-slate-400 hover:text-white"
              )}
              title="Desktop Counter 1024px+ viewport"
            >
              <Monitor size={13} />
              <span>💻 Counter (Wide)</span>
            </button>
          </div>

          {/* Mode Switcher: Improved vs Current vs Side-by-side */}
          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-[11px] font-bold">
            <button
              onClick={() => setViewMode('improved')}
              className={cn(
                "px-2.5 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1",
                viewMode === 'improved' 
                  ? "bg-indigo-600 text-white shadow-sm" 
                  : "text-slate-400 hover:text-white"
              )}
            >
              <Flame size={12} className="text-amber-300" />
              <span>⚡ Fast Flow</span>
            </button>
            <button
              onClick={() => setViewMode('current')}
              className={cn(
                "px-2.5 py-1 rounded-lg transition-all cursor-pointer",
                viewMode === 'current' 
                  ? "bg-slate-700 text-white shadow-sm" 
                  : "text-slate-400 hover:text-white"
              )}
            >
              <span>🔄 Current Flow</span>
            </button>
            <button
              onClick={() => setViewMode('side-by-side')}
              className={cn(
                "px-2.5 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1",
                viewMode === 'side-by-side' 
                  ? "bg-amber-600 text-white shadow-sm" 
                  : "text-slate-400 hover:text-white"
              )}
            >
              <SplitSquareVertical size={12} />
              <span>⚖️ Side-by-Side</span>
            </button>
          </div>

          {/* Reset Demo button */}
          <button
            onClick={handleResetDemo}
            className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-[11px] font-bold cursor-pointer transition-all"
            title="Reset simulated cart & timer"
          >
            <RotateCcw size={12} />
            <span>Reset Demo</span>
          </button>

          {/* Close Workbench */}
          <button
            onClick={onClose}
            className="h-8 w-8 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-all cursor-pointer ml-1"
            title="Close Demo"
          >
            <X size={16} />
          </button>
        </div>
      </header>

      {/* 2. LAYOUT SELECTION RIBBON (THE 3 REQUESTED ERGONOMIC MODES) */}
      <div className="shrink-0 bg-slate-950 border-b border-slate-800 px-4 py-2 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 shrink-0">
            Layout Paradigm:
          </span>
          
          <button
            onClick={() => setLayout('touch')}
            className={cn(
              "px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-all cursor-pointer shrink-0 border",
              layout === 'touch'
                ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-sm"
                : "bg-slate-900 text-slate-400 border-slate-800 hover:text-white"
            )}
          >
            <span className="text-sm">👆</span>
            <span>1. Touch Counter + Express Slide Cart</span>
            <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/30 text-emerald-300 uppercase font-black">
              Mobile Best
            </span>
          </button>

          <button
            onClick={() => setLayout('split')}
            className={cn(
              "px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-all cursor-pointer shrink-0 border",
              layout === 'split'
                ? "bg-indigo-500/20 text-indigo-300 border-indigo-500/50 shadow-sm"
                : "bg-slate-900 text-slate-400 border-slate-800 hover:text-white"
            )}
          >
            <span className="text-sm">⚡</span>
            <span>2. Split-Screen (Search + Live Ledger)</span>
          </button>

          <button
            onClick={() => setLayout('grid')}
            className={cn(
              "px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-all cursor-pointer shrink-0 border",
              layout === 'grid'
                ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/50 shadow-sm"
                : "bg-slate-900 text-slate-400 border-slate-800 hover:text-white"
            )}
          >
            <span className="text-sm">⌨️</span>
            <span>3. High-Density Fast Entry Table Grid</span>
            <span className="text-[9px] px-1.5 py-0.2 rounded bg-cyan-500/30 text-cyan-300 uppercase font-black">
              Barcode / Hotkey
            </span>
          </button>
        </div>

        {/* Adopt layout selector */}
        <div className="flex items-center gap-2">
          {hasChosenLayout === layout ? (
            <div className="flex items-center gap-1 text-[11px] font-black text-emerald-400 bg-emerald-950/60 border border-emerald-700/50 px-2.5 py-1 rounded-xl">
              <Check size={13} className="stroke-[3]" />
              <span>Layout Preferred!</span>
            </div>
          ) : (
            <button
              onClick={() => handleAdoptLayout(layout)}
              className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-800 hover:bg-emerald-600 border border-slate-700 hover:border-emerald-500 text-slate-200 hover:text-white text-[11px] font-black uppercase tracking-wider transition-all cursor-pointer"
            >
              <ThumbsUp size={12} />
              <span>Pick This Layout</span>
            </button>
          )}
        </div>
      </div>

      {/* 3. SPEED & FRICTION TELEMETRY HUD */}
      <div className="shrink-0 bg-slate-900/95 border-b border-slate-800 px-4 py-2 flex items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-6 overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Interaction Taps:</span>
            <span className="font-mono font-black text-emerald-400 text-sm px-2 py-0.5 rounded-lg bg-emerald-950/60 border border-emerald-800/40">
              {tapCount} taps
            </span>
            <span className="text-[9px] text-slate-500 line-through">vs 8 taps (old)</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Elapsed Checkout Time:</span>
            <span className="font-mono font-black text-amber-400 text-sm px-2 py-0.5 rounded-lg bg-amber-950/60 border border-amber-800/40">
              {elapsedSeconds}s
            </span>
            <span className="text-[9px] text-slate-500 line-through">vs 35s (old)</span>
          </div>

          <div className="hidden md:flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1">
              <Sparkles size={11} /> Speed Gain:
            </span>
            <span className="text-[11px] font-bold text-slate-300">
              3.8x faster queue checkout with zero modal barriers
            </span>
          </div>
        </div>

        <div className="text-[10px] font-mono text-slate-400 shrink-0">
          Cart Items: <strong className="text-white">{cart.length} SKUs</strong> ({totalItemCount} total units)
        </div>
      </div>

      {/* 4. MAIN WORKBENCH WORKSPACE (SIDE-BY-SIDE OR SINGLE PREVIEW) */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-slate-950/50 flex justify-center items-start">
        {viewMode === 'side-by-side' ? (
          /* SIDE BY SIDE COMPARISON VIEW */
          <div className="w-full max-w-7xl grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            {/* LEFT: Current Workflow */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded-lg bg-slate-800 text-slate-400 flex items-center justify-center font-bold text-xs">
                    🔄
                  </div>
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-300">Current Flow</h3>
                    <p className="text-[9px] text-slate-500">Multi-step modals, hidden cart, manual typing</p>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-400 border border-rose-500/30 text-[9px] font-black uppercase">
                  Higher Friction (~7-8 Taps)
                </span>
              </div>

              {/* Current Flow Mock Simulation */}
              <div className="space-y-3 text-xs bg-slate-950 p-4 rounded-2xl border border-slate-800/80">
                <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between text-slate-400">
                  <span>1. Tap Product Card</span>
                  <span className="text-[10px] text-slate-500 font-mono">1 Tap</span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between text-slate-400">
                  <span>2. Open Rate Selection Modal Dialog</span>
                  <span className="text-[10px] text-rose-400 font-mono">+1 Tap (Friction)</span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between text-slate-400">
                  <span>3. Tap Quantity Box & Type Keypad Input</span>
                  <span className="text-[10px] text-rose-400 font-mono">+3 Keystrokes</span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between text-slate-400">
                  <span>4. Scroll down to find checkout button</span>
                  <span className="text-[10px] text-slate-500 font-mono">Scroll delay</span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between text-slate-400">
                  <span>5. Open Payment Modal & Select Tender</span>
                  <span className="text-[10px] text-rose-400 font-mono">+2 Taps</span>
                </div>

                <div className="pt-3 border-t border-slate-800 text-[11px] text-slate-400 space-y-1">
                  <p className="font-bold text-slate-300">Pain Points Solved by New UX:</p>
                  <ul className="list-disc pl-4 space-y-1 text-slate-400 text-[10px]">
                    <li>Cart is hidden off-screen on mobile devices</li>
                    <li>Preset quantities (+250g, +500g, +1kg) are nested</li>
                    <li>Payment requires navigating away from register</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* RIGHT: Improved Workflow Interactive Preview */}
            <div className="bg-slate-900 border-2 border-emerald-500/40 rounded-3xl p-5 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded-lg bg-emerald-500 text-slate-950 flex items-center justify-center font-bold text-xs">
                    ⚡
                  </div>
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-wider text-emerald-400">
                      Improved Fast Flow ({layout.toUpperCase()} Layout)
                    </h3>
                    <p className="text-[9px] text-slate-400">Instant add, inline quantity steppers, one-tap checkout</p>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[9px] font-black uppercase">
                  Zero Friction (2-3 Taps)
                </span>
              </div>

              {/* Render the interactive container */}
              <div className="flex justify-center">
                <InteractiveBillingEngine 
                  layout={layout}
                  viewport="mobile"
                  catalog={filteredCatalog}
                  categories={categories}
                  selectedCategory={selectedCategory}
                  onSelectCategory={setSelectedCategory}
                  searchQuery={searchQuery}
                  onSearchQueryChange={setSearchQuery}
                  cart={cart}
                  subtotal={subtotal}
                  onAddToCart={handleAddToCart}
                  onQuickWeightAdd={handleQuickWeightAdd}
                  onUpdateQty={handleUpdateQty}
                  onCompleteBill={handleCompleteBill}
                  isSlideOverCartOpen={isSlideOverCartOpen}
                  setIsSlideOverCartOpen={setIsSlideOverCartOpen}
                  selectedPaymentType={selectedPaymentType}
                  setSelectedPaymentType={setSelectedPaymentType}
                  cashTendered={cashTendered}
                  setCashTendered={setCashTendered}
                  gridRowInput={gridRowInput}
                  setGridRowInput={setGridRowInput}
                  gridInputRef={gridInputRef}
                  storeName={storeName}
                />
              </div>
            </div>
          </div>
        ) : viewMode === 'current' ? (
          /* CURRENT WORKFLOW EXPLANATION VIEW */
          <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-slate-800 text-slate-300 flex items-center justify-center text-lg">
                🔄
              </div>
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider text-white">Current Billing Interface Workflow</h3>
                <p className="text-xs text-slate-400">Reviewing existing steps to verify speed bottlenecks</p>
              </div>
            </div>

            <div className="space-y-3 font-mono text-xs">
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                <span className="text-slate-400 font-bold">Current Bottleneck 1:</span>
                <p className="text-slate-300 font-sans">
                  On mobile handhelds, product cards take up full vertical space, pushing the cart and "Save Bill" button deep below the fold.
                </p>
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                <span className="text-slate-400 font-bold">Current Bottleneck 2:</span>
                <p className="text-slate-300 font-sans">
                  Quick weight increments (+250g, +500g, +1kg) are packed inside small dropdown menus instead of one-touch thumb buttons.
                </p>
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                <span className="text-slate-400 font-bold">Current Bottleneck 3:</span>
                <p className="text-slate-300 font-sans">
                  Tendering payment requires selecting between Cash / Credit, opening another confirmation modal, and typing amounts.
                </p>
              </div>
            </div>

            <button
              onClick={() => setViewMode('improved')}
              className="w-full py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-600/20"
            >
              <span>Switch to Improved Fast Billing Demo</span>
              <ArrowRight size={14} />
            </button>
          </div>
        ) : (
          /* IMPROVED WORKFLOW INTERACTIVE EXPERIENCE */
          <div className="w-full flex flex-col items-center">
            <InteractiveBillingEngine 
              layout={layout}
              viewport={viewport}
              catalog={filteredCatalog}
              categories={categories}
              selectedCategory={selectedCategory}
              onSelectCategory={setSelectedCategory}
              searchQuery={searchQuery}
              onSearchQueryChange={setSearchQuery}
              cart={cart}
              subtotal={subtotal}
              onAddToCart={handleAddToCart}
              onQuickWeightAdd={handleQuickWeightAdd}
              onUpdateQty={handleUpdateQty}
              onCompleteBill={handleCompleteBill}
              isSlideOverCartOpen={isSlideOverCartOpen}
              setIsSlideOverCartOpen={setIsSlideOverCartOpen}
              selectedPaymentType={selectedPaymentType}
              setSelectedPaymentType={setSelectedPaymentType}
              cashTendered={cashTendered}
              setCashTendered={setCashTendered}
              gridRowInput={gridRowInput}
              setGridRowInput={setGridRowInput}
              gridInputRef={gridInputRef}
              storeName={storeName}
            />
          </div>
        )}
      </div>

      {/* 5. CHECKOUT SUCCESS ANIMATION MODAL */}
      {showCheckoutSuccess && (
        <div className="fixed inset-0 z-[1100] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-slate-900 border border-emerald-500/40 rounded-3xl p-6 text-center space-y-4 shadow-2xl animate-scaleUp">
            <div className="h-16 w-16 mx-auto rounded-full bg-emerald-500/20 border-2 border-emerald-400 text-emerald-400 flex items-center justify-center shadow-lg shadow-emerald-500/30">
              <CheckCircle2 size={36} className="stroke-[2.5]" />
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-black text-white">Bill Generated in {elapsedSeconds}s!</h3>
              <p className="text-xs text-slate-400">
                Total ₹{formatNumber(subtotal, 2)} tendered via {selectedPaymentType.toUpperCase()}
              </p>
            </div>

            <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 text-[11px] font-mono text-slate-300 space-y-1">
              <div className="flex justify-between">
                <span>Items Billed:</span>
                <strong>{cart.length} SKUs</strong>
              </div>
              <div className="flex justify-between">
                <span>Taps Required:</span>
                <strong className="text-emerald-400">{tapCount} taps (Record speed)</strong>
              </div>
              <div className="flex justify-between">
                <span>Speed Improvement:</span>
                <strong className="text-amber-400">~72% faster</strong>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={handleResetDemo}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all cursor-pointer"
              >
                New Bill Demo
              </button>
              <button
                onClick={() => {
                  setShowCheckoutSuccess(false);
                  handleAdoptLayout(layout);
                }}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black uppercase tracking-wider transition-all cursor-pointer shadow-lg shadow-emerald-600/30"
              >
                Pick This Layout
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/* =========================================================================
   INTERACTIVE BILLING ENGINE: Renders the 3 layouts (Split, Touch, Grid)
   ========================================================================= */

interface InteractiveBillingEngineProps {
  layout: DemoLayoutType;
  viewport: DemoDeviceViewport;
  catalog: DemoItem[];
  categories: string[];
  selectedCategory: string;
  onSelectCategory: (cat: string) => void;
  searchQuery: string;
  onSearchQueryChange: (q: string) => void;
  cart: DemoCartItem[];
  subtotal: number;
  onAddToCart: (item: DemoItem, qty?: number) => void;
  onQuickWeightAdd: (item: DemoItem, mult: number) => void;
  onUpdateQty: (id: string, qty: number) => void;
  onCompleteBill: () => void;
  isSlideOverCartOpen: boolean;
  setIsSlideOverCartOpen: (open: boolean) => void;
  selectedPaymentType: 'cash' | 'upi' | 'udhar';
  setSelectedPaymentType: (type: 'cash' | 'upi' | 'udhar') => void;
  cashTendered: number | null;
  setCashTendered: (val: number | null) => void;
  gridRowInput: { query: string; qty: string; rate: string };
  setGridRowInput: React.Dispatch<React.SetStateAction<{ query: string; qty: string; rate: string }>>;
  gridInputRef: React.RefObject<HTMLInputElement | null>;
  storeName: string;
}

const InteractiveBillingEngine: React.FC<InteractiveBillingEngineProps> = ({
  layout,
  viewport,
  catalog,
  categories,
  selectedCategory,
  onSelectCategory,
  searchQuery,
  onSearchQueryChange,
  cart,
  subtotal,
  onAddToCart,
  onQuickWeightAdd,
  onUpdateQty,
  onCompleteBill,
  isSlideOverCartOpen,
  setIsSlideOverCartOpen,
  selectedPaymentType,
  setSelectedPaymentType,
  cashTendered,
  setCashTendered,
  gridRowInput,
  setGridRowInput,
  gridInputRef,
  storeName
}) => {
  // Mobile frame wrapper simulation
  const isMobileView = viewport === 'mobile';

  return (
    <div 
      className={cn(
        "transition-all duration-300 relative flex flex-col bg-slate-900 border border-slate-800 text-slate-100 shadow-2xl",
        isMobileView 
          ? "w-[390px] h-[780px] rounded-[44px] p-3 border-[6px] border-slate-700/80 ring-1 ring-slate-600/50 overflow-hidden" 
          : "w-full max-w-6xl h-[780px] rounded-3xl p-5 overflow-hidden"
      )}
    >
      {/* Mobile Top Speaker & Dynamic Island simulation if in mobile view */}
      {isMobileView && (
        <div className="shrink-0 flex items-center justify-between px-6 pt-1 pb-2">
          <span className="text-[10px] font-mono font-bold text-slate-400">9:41</span>
          <div className="w-20 h-4 bg-slate-800 rounded-full" />
          <div className="flex items-center gap-1 text-[10px] text-slate-400">
            <span>5G</span>
            <span>100%</span>
          </div>
        </div>
      )}

      {/* RENDER LAYOUT SPECIFIC BODIES */}
      {layout === 'touch' && (
        <TouchCounterLayout 
          catalog={catalog}
          categories={categories}
          selectedCategory={selectedCategory}
          onSelectCategory={onSelectCategory}
          searchQuery={searchQuery}
          onSearchQueryChange={onSearchQueryChange}
          cart={cart}
          subtotal={subtotal}
          onAddToCart={onAddToCart}
          onQuickWeightAdd={onQuickWeightAdd}
          onUpdateQty={onUpdateQty}
          onCompleteBill={onCompleteBill}
          isSlideOverCartOpen={isSlideOverCartOpen}
          setIsSlideOverCartOpen={setIsSlideOverCartOpen}
          selectedPaymentType={selectedPaymentType}
          setSelectedPaymentType={setSelectedPaymentType}
          cashTendered={cashTendered}
          setCashTendered={setCashTendered}
          isMobileView={isMobileView}
        />
      )}

      {layout === 'split' && (
        <SplitScreenLayout 
          catalog={catalog}
          categories={categories}
          selectedCategory={selectedCategory}
          onSelectCategory={onSelectCategory}
          searchQuery={searchQuery}
          onSearchQueryChange={onSearchQueryChange}
          cart={cart}
          subtotal={subtotal}
          onAddToCart={onAddToCart}
          onQuickWeightAdd={onQuickWeightAdd}
          onUpdateQty={onUpdateQty}
          onCompleteBill={onCompleteBill}
          selectedPaymentType={selectedPaymentType}
          setSelectedPaymentType={setSelectedPaymentType}
          isMobileView={isMobileView}
        />
      )}

      {layout === 'grid' && (
        <TableGridCounterLayout 
          catalog={catalog}
          cart={cart}
          subtotal={subtotal}
          onAddToCart={onAddToCart}
          onUpdateQty={onUpdateQty}
          onCompleteBill={onCompleteBill}
          gridRowInput={gridRowInput}
          setGridRowInput={setGridRowInput}
          gridInputRef={gridInputRef}
          isMobileView={isMobileView}
        />
      )}
    </div>
  );
};

/* -------------------------------------------------------------------------
   LAYOUT 1: TOUCH COUNTER WITH SLIDE-OVER EXPRESS CART (MOBILE HERO)
   ------------------------------------------------------------------------- */
interface TouchCounterLayoutProps {
  catalog: DemoItem[];
  categories: string[];
  selectedCategory: string;
  onSelectCategory: (c: string) => void;
  searchQuery: string;
  onSearchQueryChange: (q: string) => void;
  cart: DemoCartItem[];
  subtotal: number;
  onAddToCart: (item: DemoItem, qty?: number) => void;
  onQuickWeightAdd: (item: DemoItem, mult: number) => void;
  onUpdateQty: (id: string, qty: number) => void;
  onCompleteBill: () => void;
  isSlideOverCartOpen: boolean;
  setIsSlideOverCartOpen: (open: boolean) => void;
  selectedPaymentType: 'cash' | 'upi' | 'udhar';
  setSelectedPaymentType: (t: 'cash' | 'upi' | 'udhar') => void;
  cashTendered: number | null;
  setCashTendered: (c: number | null) => void;
  isMobileView: boolean;
}

const TouchCounterLayout: React.FC<TouchCounterLayoutProps> = ({
  catalog,
  categories,
  selectedCategory,
  onSelectCategory,
  searchQuery,
  onSearchQueryChange,
  cart,
  subtotal,
  onAddToCart,
  onQuickWeightAdd,
  onUpdateQty,
  onCompleteBill,
  isSlideOverCartOpen,
  setIsSlideOverCartOpen,
  selectedPaymentType,
  setSelectedPaymentType,
  cashTendered,
  setCashTendered,
  isMobileView
}) => {
  return (
    <div className="flex-1 flex flex-col min-h-0 relative">
      {/* 1. Instant Search & Category Horizontal Ribbon */}
      <div className="shrink-0 space-y-2 pb-2">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchQueryChange(e.target.value)}
            placeholder="Fast search items (basmati, milk, atta)..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-8 py-2 text-xs font-bold text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
          />
          {searchQuery && (
            <button 
              onClick={() => onSearchQueryChange('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
            >
              <X size={12} />
            </button>
          )}
        </div>

        {/* Tactile Category Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => onSelectCategory(cat)}
              className={cn(
                "px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all shrink-0 cursor-pointer",
                selectedCategory === cat
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "bg-slate-950 text-slate-400 border border-slate-800 hover:text-white"
              )}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* 2. Tactile Big-Touch Product Cards (48px+ targets for thumbs) */}
      <div className="flex-1 overflow-y-auto pr-1 space-y-2 pb-24">
        {catalog.map(item => {
          const cartItem = cart.find(ci => ci.id === item.id);
          const isWeight = item.unit === 'kg' || item.unit === 'g';

          return (
            <div 
              key={item.id}
              className={cn(
                "p-3 rounded-2xl border transition-all flex flex-col gap-2 relative",
                cartItem 
                  ? "bg-emerald-950/20 border-emerald-500/40" 
                  : "bg-slate-950/60 border-slate-800 hover:border-slate-700"
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <h4 className="text-xs font-black text-white truncate">{item.name}</h4>
                  <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-400">
                    <span className="font-mono font-bold text-emerald-400">₹{item.retailPrice}</span>
                    <span>/ {item.unit}</span>
                    <span className="text-slate-600">•</span>
                    <span className="truncate">{item.category}</span>
                  </div>
                </div>

                {/* Inline Stepper if in cart, or big 1-Tap ADD button */}
                {cartItem ? (
                  <div className="flex items-center bg-emerald-950 border border-emerald-700/60 rounded-xl p-1 gap-1.5 shrink-0">
                    <button
                      onClick={() => onUpdateQty(item.id, cartItem.quantity - (isWeight ? 0.5 : 1))}
                      className="h-7 w-7 rounded-lg bg-emerald-900/60 text-emerald-300 hover:bg-emerald-800 flex items-center justify-center font-bold text-xs cursor-pointer active:scale-90"
                    >
                      <Minus size={12} />
                    </button>
                    <span className="font-mono font-black text-xs text-white min-w-[2.5rem] text-center">
                      {cartItem.quantity} {item.unit}
                    </span>
                    <button
                      onClick={() => onUpdateQty(item.id, cartItem.quantity + (isWeight ? 0.5 : 1))}
                      className="h-7 w-7 rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 flex items-center justify-center font-bold text-xs cursor-pointer active:scale-90 shadow-sm"
                    >
                      <Plus size={12} />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => onAddToCart(item, 1)}
                    className="h-9 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-black uppercase tracking-wider flex items-center gap-1 cursor-pointer transition-all active:scale-95 shadow-md shadow-emerald-600/20 shrink-0"
                  >
                    <Plus size={13} className="stroke-[3]" />
                    <span>ADD</span>
                  </button>
                )}
              </div>

              {/* One-Tap Quick Weight Chips (Zero modal barrier!) */}
              {isWeight && (
                <div className="flex items-center gap-1.5 pt-1 border-t border-slate-800/60">
                  <span className="text-[9px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1">
                    <Scale size={10} /> Quick:
                  </span>
                  {[
                    { label: '+250g', val: 0.25 },
                    { label: '+500g', val: 0.5 },
                    { label: '+1kg', val: 1.0 },
                    { label: '+5kg', val: 5.0 }
                  ].map(preset => (
                    <button
                      key={preset.label}
                      onClick={() => onQuickWeightAdd(item, preset.val)}
                      className="px-2 py-0.5 rounded-lg bg-slate-900 hover:bg-emerald-900/50 border border-slate-800 hover:border-emerald-600 text-slate-300 hover:text-emerald-300 text-[9px] font-mono font-bold transition-all cursor-pointer active:scale-95"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 3. STICKY BOTTOM CHECKOUT DOCK (Strictly under 15% viewport, reachable by thumb) */}
      <div className="absolute bottom-0 left-0 right-0 bg-slate-950/95 backdrop-blur-md border-t border-slate-800 p-3 rounded-b-[38px] shadow-2xl space-y-2 z-20">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setIsSlideOverCartOpen(true)}
            className="flex items-center gap-2 text-left cursor-pointer group"
          >
            <div className="h-9 w-9 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-emerald-400 group-hover:border-emerald-500 relative transition-colors">
              <ShoppingCart size={16} />
              <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-emerald-500 text-slate-950 font-black text-[9px] flex items-center justify-center">
                {cart.length}
              </span>
            </div>
            <div>
              <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block group-hover:text-emerald-400">
                View Ledger ▲
              </span>
              <span className="text-base font-black font-mono text-white leading-none">
                ₹{formatNumber(subtotal, 2)}
              </span>
            </div>
          </button>

          {/* Direct 1-Tap Tender Actions */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => {
                setSelectedPaymentType('cash');
                onCompleteBill();
              }}
              className="h-10 px-3.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shadow-lg shadow-emerald-600/30 transition-all active:scale-95"
            >
              <Zap size={14} className="fill-white" />
              <span>Bill ⚡</span>
            </button>
          </div>
        </div>

        {/* Quick Cash Presets Strip */}
        <div className="flex items-center gap-1 pt-1 border-t border-slate-800/60 overflow-x-auto no-scrollbar">
          <span className="text-[8px] font-bold text-slate-500 uppercase tracking-wider shrink-0">Exact / Note:</span>
          {[
            { label: 'Exact', val: subtotal },
            { label: '₹100', val: 100 },
            { label: '₹200', val: 200 },
            { label: '₹500', val: 500 },
            { label: '₹1000', val: 1000 }
          ].map(cashOpt => (
            <button
              key={cashOpt.label}
              onClick={() => {
                setCashTendered(cashOpt.val);
                setSelectedPaymentType('cash');
                onCompleteBill();
              }}
              className="px-2 py-0.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white text-[9px] font-mono font-bold shrink-0 cursor-pointer active:scale-95"
            >
              {cashOpt.label}
            </button>
          ))}
          <button
            onClick={() => {
              setSelectedPaymentType('upi');
              onCompleteBill();
            }}
            className="px-2 py-0.5 rounded-lg bg-indigo-950/70 border border-indigo-800/60 text-indigo-300 text-[9px] font-bold uppercase shrink-0 cursor-pointer flex items-center gap-1"
          >
            <QrCode size={9} /> UPI QR
          </button>
        </div>
      </div>

      {/* 4. SLIDE-OVER EXPRESS CART DRAWER (Bottom Sheet on Mobile) */}
      {isSlideOverCartOpen && (
        <div className="absolute inset-0 z-30 bg-slate-950/80 backdrop-blur-sm flex flex-col justify-end">
          <div className="bg-slate-900 border-t border-slate-800 rounded-t-3xl max-h-[85%] flex flex-col p-4 space-y-3 shadow-2xl animate-slideUp">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <ShoppingCart size={15} className="text-emerald-400" />
                <h3 className="text-xs font-black uppercase tracking-wider text-white">Live Cart Ledger</h3>
                <span className="text-[10px] font-mono text-slate-400">({cart.length} items)</span>
              </div>
              <button 
                onClick={() => setIsSlideOverCartOpen(false)}
                className="h-6 w-6 rounded-lg bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer"
              >
                <X size={13} />
              </button>
            </div>

            {/* Cart item ledger */}
            <div className="flex-1 overflow-y-auto space-y-2 max-h-64 pr-1">
              {cart.map(ci => (
                <div key={ci.id} className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs">
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-white truncate">{ci.name}</p>
                    <p className="text-[10px] text-slate-400 font-mono">
                      {ci.quantity} {ci.unit} × ₹{ci.price} = <strong className="text-emerald-400">₹{(ci.quantity * ci.price).toFixed(2)}</strong>
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => onUpdateQty(ci.id, ci.quantity - 1)}
                      className="h-6 w-6 rounded bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300"
                    >
                      <Minus size={10} />
                    </button>
                    <span className="font-mono text-xs w-6 text-center font-bold">{ci.quantity}</span>
                    <button
                      onClick={() => onUpdateQty(ci.id, ci.quantity + 1)}
                      className="h-6 w-6 rounded bg-emerald-600 hover:bg-emerald-500 flex items-center justify-center text-white"
                    >
                      <Plus size={10} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Summary & Tender */}
            <div className="pt-2 border-t border-slate-800 space-y-2">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-slate-400">Grand Total:</span>
                <span className="text-sm font-black text-white">₹{formatNumber(subtotal, 2)}</span>
              </div>
              <button
                onClick={() => {
                  setIsSlideOverCartOpen(false);
                  onCompleteBill();
                }}
                className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider cursor-pointer shadow-lg shadow-emerald-600/30"
              >
                Instant Tender & Save Bill ⚡
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/* -------------------------------------------------------------------------
   LAYOUT 2: SPLIT SCREEN (SEARCH & CATEGORY ON LEFT, LIVE CART ON RIGHT)
   ------------------------------------------------------------------------- */
interface SplitScreenLayoutProps {
  catalog: DemoItem[];
  categories: string[];
  selectedCategory: string;
  onSelectCategory: (c: string) => void;
  searchQuery: string;
  onSearchQueryChange: (q: string) => void;
  cart: DemoCartItem[];
  subtotal: number;
  onAddToCart: (item: DemoItem, qty?: number) => void;
  onQuickWeightAdd: (item: DemoItem, mult: number) => void;
  onUpdateQty: (id: string, qty: number) => void;
  onCompleteBill: () => void;
  selectedPaymentType: 'cash' | 'upi' | 'udhar';
  setSelectedPaymentType: (t: 'cash' | 'upi' | 'udhar') => void;
  isMobileView: boolean;
}

const SplitScreenLayout: React.FC<SplitScreenLayoutProps> = ({
  catalog,
  categories,
  selectedCategory,
  onSelectCategory,
  searchQuery,
  onSearchQueryChange,
  cart,
  subtotal,
  onAddToCart,
  onQuickWeightAdd,
  onUpdateQty,
  onCompleteBill,
  selectedPaymentType,
  setSelectedPaymentType,
  isMobileView
}) => {
  return (
    <div className={cn("flex-1 grid gap-3 min-h-0", isMobileView ? "grid-cols-1 overflow-y-auto" : "grid-cols-12")}>
      {/* LEFT COLUMN: Catalog with instant search (60% on desktop) */}
      <div className={cn("flex flex-col min-h-0 space-y-2", isMobileView ? "h-96" : "col-span-7")}>
        <div className="relative shrink-0">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchQueryChange(e.target.value)}
            placeholder="Type item name or scan barcode..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-8 py-2 text-xs font-bold text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        {/* Category bar */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => onSelectCategory(cat)}
              className={cn(
                "px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider shrink-0 cursor-pointer",
                selectedCategory === cat ? "bg-indigo-600 text-white" : "bg-slate-950 text-slate-400 border border-slate-800"
              )}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Catalog items list */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-1.5">
          {catalog.map(item => (
            <div 
              key={item.id}
              onClick={() => onAddToCart(item, 1)}
              className="p-2 rounded-xl bg-slate-950 hover:bg-slate-800/80 border border-slate-800 hover:border-indigo-500/50 flex items-center justify-between cursor-pointer transition-all active:scale-98"
            >
              <div className="min-w-0 flex-1">
                <span className="text-xs font-bold text-white truncate block">{item.name}</span>
                <span className="text-[10px] font-mono text-emerald-400">₹{item.retailPrice} / {item.unit}</span>
              </div>
              <button className="h-7 px-2.5 rounded-lg bg-indigo-600/30 hover:bg-indigo-600 text-indigo-300 hover:text-white font-bold text-[10px] uppercase">
                + Add
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* RIGHT COLUMN: Always-visible Live Cart Ledger (40% on desktop) */}
      <div className={cn("flex flex-col bg-slate-950 rounded-2xl border border-slate-800 p-3 min-h-0", isMobileView ? "h-80" : "col-span-5")}>
        <div className="flex items-center justify-between border-b border-slate-800 pb-2 shrink-0">
          <div className="flex items-center gap-1.5">
            <ShoppingCart size={14} className="text-indigo-400" />
            <span className="text-xs font-black uppercase text-white">Live Cart</span>
          </div>
          <span className="text-xs font-mono font-bold text-emerald-400">₹{formatNumber(subtotal, 2)}</span>
        </div>

        {/* Live ledger items */}
        <div className="flex-1 overflow-y-auto space-y-1.5 py-2">
          {cart.map(ci => (
            <div key={ci.id} className="p-2 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between text-xs">
              <div className="min-w-0 flex-1">
                <p className="font-bold text-white truncate text-[11px]">{ci.name}</p>
                <p className="text-[9px] font-mono text-slate-400">{ci.quantity} × ₹{ci.price} = ₹{(ci.quantity * ci.price).toFixed(2)}</p>
              </div>
              <div className="flex items-center gap-1">
                <button 
                  onClick={() => onUpdateQty(ci.id, ci.quantity - 1)}
                  className="h-5 w-5 rounded bg-slate-800 text-slate-300 flex items-center justify-center font-bold"
                >
                  -
                </button>
                <span className="font-mono text-xs w-5 text-center">{ci.quantity}</span>
                <button 
                  onClick={() => onUpdateQty(ci.id, ci.quantity + 1)}
                  className="h-5 w-5 rounded bg-indigo-600 text-white flex items-center justify-center font-bold"
                >
                  +
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom checkout trigger */}
        <div className="pt-2 border-t border-slate-800 space-y-1.5 shrink-0">
          <div className="flex justify-between text-xs font-mono">
            <span className="text-slate-400">Total:</span>
            <span className="font-black text-white text-sm">₹{formatNumber(subtotal, 2)}</span>
          </div>
          <button
            onClick={onCompleteBill}
            className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs uppercase tracking-wider cursor-pointer shadow-md shadow-indigo-600/30"
          >
            Save Bill & Print ⚡
          </button>
        </div>
      </div>
    </div>
  );
};

/* -------------------------------------------------------------------------
   LAYOUT 3: HIGH-DENSITY FAST ENTRY TABLE GRID (KEYBOARD / SCANNER CHAMPION)
   ------------------------------------------------------------------------- */
interface TableGridCounterLayoutProps {
  catalog: DemoItem[];
  cart: DemoCartItem[];
  subtotal: number;
  onAddToCart: (item: DemoItem, qty?: number) => void;
  onUpdateQty: (id: string, qty: number) => void;
  onCompleteBill: () => void;
  gridRowInput: { query: string; qty: string; rate: string };
  setGridRowInput: React.Dispatch<React.SetStateAction<{ query: string; qty: string; rate: string }>>;
  gridInputRef: React.RefObject<HTMLInputElement | null>;
  isMobileView: boolean;
}

const TableGridCounterLayout: React.FC<TableGridCounterLayoutProps> = ({
  catalog,
  cart,
  subtotal,
  onAddToCart,
  onUpdateQty,
  onCompleteBill,
  gridRowInput,
  setGridRowInput,
  gridInputRef,
  isMobileView
}) => {
  const handleQuickAddRow = (e: React.FormEvent) => {
    e.preventDefault();
    if (!gridRowInput.query.trim()) return;

    // Search catalog or add item
    const matched = catalog.find(p => 
      p.name.toLowerCase().includes(gridRowInput.query.toLowerCase().trim())
    ) || catalog[0];

    const qty = parseFloat(gridRowInput.qty) || 1;
    onAddToCart(matched, qty);
    setGridRowInput({ query: '', qty: '1', rate: '' });
    gridInputRef.current?.focus();
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 space-y-2">
      {/* Rapid Fire Keyboard / Barcode Input Row */}
      <form onSubmit={handleQuickAddRow} className="shrink-0 flex items-center gap-2 bg-slate-950 p-2 rounded-2xl border border-slate-800">
        <div className="relative flex-1">
          <input
            ref={gridInputRef}
            type="text"
            value={gridRowInput.query}
            onChange={(e) => setGridRowInput(prev => ({ ...prev, query: e.target.value }))}
            placeholder="Type item or scan barcode (e.g. rice, milk, atta) + [Enter]..."
            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
          />
        </div>

        <div className="w-20">
          <input
            type="number"
            step="any"
            value={gridRowInput.qty}
            onChange={(e) => setGridRowInput(prev => ({ ...prev, qty: e.target.value }))}
            placeholder="Qty"
            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2 py-2 text-xs font-mono font-bold text-white text-center"
          />
        </div>

        <button
          type="submit"
          className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center gap-1 cursor-pointer shrink-0"
        >
          <CornerDownLeft size={13} />
          <span>Enter</span>
        </button>
      </form>

      {/* Spreadsheet Tabular Entry Grid */}
      <div className="flex-1 overflow-y-auto bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden flex flex-col">
        <div className="shrink-0 bg-slate-900 border-b border-slate-800 px-3 py-2 grid grid-cols-12 text-[10px] font-black uppercase tracking-wider text-slate-400">
          <span className="col-span-1">#</span>
          <span className="col-span-5">Product Description</span>
          <span className="col-span-2 text-right">Rate</span>
          <span className="col-span-2 text-center">Qty</span>
          <span className="col-span-2 text-right">Amount</span>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-slate-800/60 font-mono text-xs">
          {cart.map((row, idx) => (
            <div key={row.id} className="px-3 py-2 grid grid-cols-12 items-center hover:bg-slate-900/50">
              <span className="col-span-1 text-slate-500">{idx + 1}</span>
              <span className="col-span-5 font-sans font-bold text-white truncate">{row.name}</span>
              <span className="col-span-2 text-right text-slate-300">₹{row.price}</span>
              <div className="col-span-2 flex items-center justify-center gap-1">
                <input 
                  type="number"
                  value={row.quantity}
                  onChange={(e) => onUpdateQty(row.id, parseFloat(e.target.value) || 0)}
                  className="w-12 text-center bg-slate-900 border border-slate-800 rounded text-xs py-0.5 font-bold text-white"
                />
              </div>
              <span className="col-span-2 text-right font-black text-emerald-400">
                ₹{(row.quantity * row.price).toFixed(2)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom bar */}
      <div className="shrink-0 flex items-center justify-between p-3 bg-slate-950 rounded-2xl border border-slate-800">
        <div className="flex items-center gap-2 text-xs">
          <Keyboard size={14} className="text-cyan-400" />
          <span className="text-[10px] text-slate-400">Hotkeys: [Enter] Add Line | [F8] Quick Tender</span>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-base font-black font-mono text-white">₹{formatNumber(subtotal, 2)}</span>
          <button
            onClick={onCompleteBill}
            className="px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-black text-xs uppercase tracking-wider cursor-pointer"
          >
            F8 Tender ⚡
          </button>
        </div>
      </div>
    </div>
  );
};
