import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Edit2, X, ChevronDown, Camera, Image as ImageIcon, Trash2, Check, ChevronRight, Eye, RefreshCw, Loader2 } from 'lucide-react';
import { Button } from './ui/Button';
import { UnitSelectorModal } from './ui/UnitSelectorModal';
import { previewImage } from './ImagePreviewModal';
import { trackRecentUnit, useRecentUnits } from '../lib/unitUtils';
import { translateItemName } from '../services/translationService';
import { Item, Category, LanguageType } from '../types';
import { LANGUAGES } from '../constants';
import { cn } from '../lib/utils';
import { compressImageFile } from '../utils/imageUtils';

export interface ItemFormModalProps {
  onClose: () => void;
  onSave: (data: Partial<Item>) => void;
  categories: Category[];
  initialData?: Item;
  t: any;
  language: LanguageType;
}

type ItemFormData = Omit<Partial<Item>, 'retailPrice' | 'wholesalePrice' | 'buyingPrice' | 'quantity' | 'minStockLevel'> & {
  retailPrice?: number | string;
  wholesalePrice?: number | string;
  buyingPrice?: number | string;
  quantity?: number | string;
  minStockLevel?: number | string;
};

export function ItemFormModal({ 
  onClose, 
  onSave, 
  categories, 
  initialData, 
  t, 
  language 
}: ItemFormModalProps) {
  const [formData, setFormData] = useState<ItemFormData>(() => {
    if (initialData) {
      return {
        ...initialData,
        retailPrice: initialData.retailPrice === 0 ? ('' as any) : initialData.retailPrice,
        wholesalePrice: initialData.wholesalePrice === 0 ? ('' as any) : initialData.wholesalePrice,
        buyingPrice: initialData.buyingPrice === 0 ? ('' as any) : initialData.buyingPrice,
        minStockLevel: initialData.minStockLevel ?? 10
      };
    }
    return {
      name: '',
      categoryId: categories[0]?.id || '',
      quantity: 1,
      unit: 'KG',
      retailPrice: '' as any,
      retailPriceUnit: 'KG',
      wholesalePrice: '' as any,
      wholesalePriceUnit: 'KG',
      buyingPrice: '' as any,
      buyingPriceUnit: 'KG',
      profitMargin: 0,
      translations: { en: '', hi: '', mr: '', 'hi-en': '' },
      notes: '',
      minStockLevel: 10
    };
  });

  const [activeUnitSelection, setActiveUnitSelection] = useState<'base'|'retail'|'wholesale'|'buy'|null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [showPhotoSourceModal, setShowPhotoSourceModal] = useState(false);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const { recentUnits } = useRecentUnits();

  // Directly trigger device native camera via input with capture="environment"
  const triggerDeviceCamera = () => {
    setShowPhotoSourceModal(false);
    if (cameraInputRef.current) {
      cameraInputRef.current.value = '';
      cameraInputRef.current.click();
    }
  };

  // Directly trigger device photo gallery / file picker
  const triggerDeviceGallery = () => {
    setShowPhotoSourceModal(false);
    if (galleryInputRef.current) {
      galleryInputRef.current.value = '';
      galleryInputRef.current.click();
    }
  };

  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploadingImage(true);
      const dataUrl = await compressImageFile(file, 400, 400, 0.85);
      setFormData(prev => ({ ...prev, imageUrl: dataUrl }));
    } catch (err) {
      console.error("Failed to compress and save image", err);
    } finally {
      setIsUploadingImage(false);
      if (galleryInputRef.current) galleryInputRef.current.value = '';
      if (cameraInputRef.current) cameraInputRef.current.value = '';
    }
  };

  const handleRemoveImage = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setFormData(prev => ({ ...prev, imageUrl: undefined }));
    if (galleryInputRef.current) galleryInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  const scrollContainerRef = React.useRef<HTMLDivElement>(null);
  const section1Ref = React.useRef<HTMLDivElement>(null);
  const section2Ref = React.useRef<HTMLDivElement>(null);
  const section3Ref = React.useRef<HTMLDivElement>(null);

  const handleNameBlur = async () => {
    if (!formData.name || (initialData && formData.name === initialData.name)) return;
    setIsTranslating(true);
    const trans = await translateItemName(formData.name);
    setFormData(prev => ({ ...prev, translations: trans }));
    setIsTranslating(false);
  };

  const handleUnitSelect = (unit: string) => {
    trackRecentUnit(unit);
    const currentSel = activeUnitSelection;
    if (activeUnitSelection === 'base') setFormData(prev => ({ ...prev, unit }));
    if (activeUnitSelection === 'buy') setFormData(prev => ({ ...prev, buyingPriceUnit: unit }));
    if (activeUnitSelection === 'wholesale') setFormData(prev => ({ ...prev, wholesalePriceUnit: unit }));
    if (activeUnitSelection === 'retail') setFormData(prev => ({ ...prev, retailPriceUnit: unit }));
    setActiveUnitSelection(null);

    // Dynamic next-input focus navigation on unit modal selection completion
    setTimeout(() => {
      if (currentSel === 'base') {
        const nextEl = document.getElementById('item-min-stock-input');
        if (nextEl) {
          nextEl.focus();
          if ('select' in nextEl) (nextEl as any).select();
        }
      } else if (currentSel === 'buy') {
        const nextEl = document.getElementById('item-save-btn');
        if (nextEl) {
          nextEl.focus();
        }
      } else if (currentSel === 'wholesale') {
        const nextEl = document.getElementById('item-price-buyingPrice');
        if (nextEl) {
          nextEl.focus();
          if ('select' in nextEl) (nextEl as any).select();
        }
      } else if (currentSel === 'retail') {
        const nextEl = document.getElementById('item-price-wholesalePrice');
        if (nextEl) {
          nextEl.focus();
          if ('select' in nextEl) (nextEl as any).select();
        }
      }
    }, 100);
  };

  const handleSave = () => {
    if (!formData.name) return alert('Name is required');
    onSave({
      ...formData,
      quantity: formData.quantity === '' || formData.quantity === undefined ? 1 : Number(formData.quantity),
      retailPrice: formData.retailPrice === '' || formData.retailPrice === undefined ? 0 : Number(formData.retailPrice),
      wholesalePrice: formData.wholesalePrice === '' || formData.wholesalePrice === undefined ? 0 : Number(formData.wholesalePrice),
      buyingPrice: formData.buyingPrice === '' || formData.buyingPrice === undefined ? 0 : Number(formData.buyingPrice),
      minStockLevel: formData.minStockLevel === '' || formData.minStockLevel === undefined ? 10 : Number(formData.minStockLevel),
    } as any);
    onClose();
  };

  const sectionVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" as any } }
  };

  const quickQtys = [5, 10, 25, 50, 100];
  const quickAmounts = [100, 500, 1000, 5000];

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 md:items-center md:p-4 backdrop-blur-sm"
    >
      <motion.div 
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        className="h-[95vh] w-full max-w-2xl overflow-hidden rounded-t-[2rem] bg-[var(--card)] flex flex-col md:h-[90vh] md:rounded-[2.5rem] shadow-2xl border border-white/5"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[var(--border)] shrink-0 bg-[var(--card)]/80 backdrop-blur-md z-20">
          <div className="flex items-center gap-4">
             <div className="h-10 w-10 rounded-xl bg-[var(--primary)]/10 flex items-center justify-center text-[var(--primary)] shadow-inner">
                {initialData ? <Edit2 size={20} /> : <Plus size={20} />}
             </div>
             <div>
                <h2 className="text-lg font-black tracking-tighter uppercase">{initialData ? t.updateRecord : t.newEntry}</h2>
                <p className="text-[9px] font-bold uppercase tracking-wider text-zinc-400">Product Details / सामान का विवरण</p>
             </div>
          </div>
          <Button variant="ghost" onClick={onClose} size="icon" className="rounded-xl bg-[var(--background)] hover:bg-[var(--primary)]/10 transition-colors cursor-pointer"><X size={20} /></Button>
        </div>

        {/* Content */}
        <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-6 space-y-24 no-scrollbar pb-32 scroll-smooth">
          
          {/* Section 1: Identity */}
          <motion.div 
            variants={sectionVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            ref={section1Ref} 
            className="space-y-6 pt-4"
          >
             <label className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-[var(--primary)] px-2">
               <span className="w-6 h-6 rounded bg-[var(--primary)]/10 flex items-center justify-center text-[10px]">01</span> 1. Product Details (सामान की जानकारी)
             </label>
             <div className="space-y-4">
               <div className="group relative">
                <input 
                  id="item-name-input"
                  className="w-full rounded-2xl border-2 border-[var(--border)] bg-[var(--background)] p-6 font-black text-2xl focus:border-[var(--primary)] focus:outline-none transition-all placeholder:opacity-20 shadow-inner"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  onBlur={handleNameBlur}
                  placeholder="Item Name (सामान का नाम) (e.g. Rice, Oil)..."
                />
                {isTranslating && (
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 flex gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--primary)] animate-bounce" />
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--primary)] animate-bounce [animation-delay:0.2s]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--primary)] animate-bounce [animation-delay:0.4s]" />
                  </div>
                )}
               </div>

               {/* Hidden Native File Inputs */}
               <input
                 type="file"
                 ref={cameraInputRef}
                 accept="image/*"
                 capture="environment"
                 onChange={handleImageFileChange}
                 className="sr-only pointer-events-none"
                 tabIndex={-1}
                 aria-hidden="true"
               />
               <input
                 type="file"
                 ref={galleryInputRef}
                 accept="image/*"
                 onChange={handleImageFileChange}
                 className="sr-only pointer-events-none"
                 tabIndex={-1}
                 aria-hidden="true"
               />

               {/* Minimalist, Shorter & Professional Photo Section */}
               {formData.imageUrl ? (
                 /* Attached State: Compact inline bar (~44px) */
                 <div className="flex items-center justify-between px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--background)] hover:border-zinc-400 dark:hover:border-zinc-600 transition-colors shadow-xs">
                   <div className="flex items-center gap-2.5 min-w-0">
                     <button
                       type="button"
                       onClick={() => previewImage(formData.imageUrl!, formData.name || 'Product Photo')}
                       className="relative w-8 h-8 rounded-lg overflow-hidden shrink-0 border border-black/10 dark:border-white/10 group cursor-pointer"
                       title="Click to view photo"
                     >
                       <img
                         src={formData.imageUrl}
                         alt="Product"
                         className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                       />
                       <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white">
                         <Eye size={12} />
                       </div>
                     </button>

                     <div className="min-w-0 flex items-center gap-2">
                       <span className="text-xs font-semibold text-[var(--foreground)] truncate">
                         Photo Attached
                       </span>
                       <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                     </div>
                   </div>

                   <div className="flex items-center gap-1 shrink-0">
                     <button
                       type="button"
                       onClick={() => setShowPhotoSourceModal(true)}
                       disabled={isUploadingImage}
                       className="px-2.5 py-1 rounded-lg text-xs font-medium text-[var(--foreground)] hover:bg-[var(--card)] hover:text-[var(--primary)] border border-transparent hover:border-[var(--border)] transition-colors cursor-pointer flex items-center gap-1"
                     >
                       <RefreshCw size={11} className={isUploadingImage ? 'animate-spin' : ''} />
                       <span>Change</span>
                     </button>
                     <button
                       type="button"
                       onClick={handleRemoveImage}
                       className="p-1 rounded-lg text-zinc-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                       title="Remove photo"
                     >
                       <Trash2 size={13} />
                     </button>
                   </div>
                 </div>
               ) : (
                 /* Empty State: Sleek, compact single-row trigger (~42px) */
                 <button
                   type="button"
                   onClick={() => setShowPhotoSourceModal(true)}
                   disabled={isUploadingImage}
                   className="w-full flex items-center justify-between px-3 py-2 rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700/80 hover:border-[var(--primary)] hover:bg-[var(--primary)]/[0.02] bg-[var(--background)] transition-all cursor-pointer group text-left shadow-xs"
                 >
                   <div className="flex items-center gap-2.5 min-w-0">
                     <div className="w-6 h-6 rounded-md bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                       {isUploadingImage ? (
                         <Loader2 size={13} className="animate-spin" />
                       ) : (
                         <Camera size={13} className="stroke-[2.2]" />
                       )}
                     </div>
                     <span className="text-xs font-medium text-[var(--foreground)] group-hover:text-[var(--primary)] transition-colors">
                       Add Product Photo
                     </span>
                     <span className="text-[10px] text-zinc-400 font-normal">
                       (Optional)
                     </span>
                   </div>

                   <div className="flex items-center gap-1 text-[11px] font-medium text-[var(--primary)] group-hover:translate-x-0.5 transition-transform shrink-0">
                     <span>Upload</span>
                     <ChevronRight size={13} className="opacity-70" />
                   </div>
                 </button>
               )}

               <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                 {LANGUAGES.map(lang => (
                   <div key={lang.id} className="flex items-center gap-2 rounded-xl bg-[var(--card)] border border-[var(--border)] p-3 text-[10px] shadow-sm">
                     <span className="opacity-80">{lang.emoji}</span>
                     <span className="flex-1 font-bold opacity-30 truncate">
                       {formData.translations?.[lang.id as keyof typeof formData.translations] || '---'}
                     </span>
                   </div>
                 ))}
               </div>

               <div className="flex gap-2 overflow-x-auto no-scrollbar py-2">
                 {categories.map(cat => (
                   <button
                     key={cat.id}
                     onClick={() => setFormData(prev => ({ ...prev, categoryId: cat.id }))}
                     className={cn(
                       "flex items-center gap-3 rounded-xl border-2 px-5 py-3 transition-all shrink-0 font-black text-[10px] uppercase cursor-pointer",
                       formData.categoryId === cat.id 
                         ? "border-[var(--primary)] bg-[var(--primary)] text-white shadow-lg scale-105" 
                         : "border-[var(--border)] bg-[var(--background)] opacity-60 hover:border-[var(--primary)]/40 hover:opacity-100"
                     )}
                   >
                     <span>{cat.name}</span>
                   </button>
                 ))}
               </div>
             </div>
          </motion.div>

          {/* Section 2: Logistical Metrics */}
          <motion.div 
            variants={sectionVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            ref={section2Ref} 
            className="space-y-8 border-t border-[var(--border)] pt-12"
          >
             <label className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-[var(--primary)] px-2">
                <span className="w-6 h-6 rounded bg-[var(--primary)]/10 flex items-center justify-center text-[10px]">02</span> 2. Stock Quantity / स्टॉक मात्रा
             </label>
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
               <div className="space-y-3">
                 <p className="text-[10px] font-black uppercase tracking-widest opacity-30">Stock Quantity (स्टॉक मात्रा)</p>
                 <div className="flex gap-2">
                   <input 
                     type="number"
                     step="any"
                     id="item-qty-input"
                     placeholder="0"
                     className="flex-1 rounded-2xl border-2 border-[var(--border)] bg-[var(--background)] p-4 font-black text-xl focus:border-[var(--primary)] focus:outline-none transition-all shadow-inner placeholder:opacity-25"
                     value={formData.quantity === 0 || formData.quantity === '' ? '' : formData.quantity}
                     onFocus={(e) => e.target.select()}
                     onChange={(e) => {
                       const val = e.target.value;
                       setFormData(prev => ({ 
                         ...prev, 
                         quantity: val === '' ? '' : (val.startsWith('0') && val.length > 1 && !val.startsWith('0.') ? parseFloat(val) : val)
                       }));
                     }}
                   />
                   <button 
                     id="item-unit-btn"
                     data-navigable="true"
                     onClick={() => setActiveUnitSelection('base')}
                     className="rounded-2xl border-2 border-[var(--border)] bg-[var(--card)] px-6 font-black uppercase text-[10px] hover:border-[var(--primary)] transition-all flex items-center gap-2 cursor-pointer"
                   >
                     {formData.unit} <ChevronDown size={14} />
                   </button>
                 </div>

                 <div className="flex flex-wrap gap-1.5 pt-2">
                   {quickQtys.map(q => (
                     <button key={q} onClick={() => setFormData(prev => ({ ...prev, quantity: q }))} className="px-3 py-1.5 rounded-lg bg-[var(--background)] border border-[var(--border)] text-[9px] font-black opacity-30 hover:opacity-100 hover:border-[var(--primary)] hover:text-[var(--primary)] transition-all cursor-pointer">{q} {formData.unit}</button>
                   ))}
                 </div>
               </div>

               <div className="space-y-3">
                 <p className="text-[10px] font-black uppercase tracking-widest opacity-30">Low Stock Alert (कम स्टॉक चेतावनी)</p>
                 <input 
                   type="number"
                   step="any"
                   id="item-min-stock-input"
                   placeholder="10"
                   className="w-full rounded-2xl border-2 border-[var(--border)] bg-[var(--background)] p-4 font-black text-xl focus:border-[var(--primary)] focus:outline-none transition-all shadow-inner placeholder:opacity-25"
                   value={formData.minStockLevel === 0 || formData.minStockLevel === '' ? '' : (formData.minStockLevel ?? 10)}
                   onFocus={(e) => e.target.select()}
                   onChange={(e) => {
                     const val = e.target.value;
                     setFormData(prev => ({ 
                       ...prev, 
                       minStockLevel: val === '' ? '' : (val.startsWith('0') && val.length > 1 && !val.startsWith('0.') ? parseFloat(val) : val)
                     }));
                   }}
                 />
                 <div className="flex flex-wrap gap-1.5 pt-2">
                   {[2, 5, 10, 20, 50].map(threshold => (
                     <button key={threshold} onClick={() => setFormData(prev => ({ ...prev, minStockLevel: threshold }))} className="px-3 py-1.5 rounded-lg bg-[var(--background)] border border-[var(--border)] text-[9px] font-black opacity-30 hover:opacity-100 hover:border-[var(--primary)] hover:text-[var(--primary)] transition-all cursor-pointer">{threshold}</button>
                   ))}
                 </div>
               </div>

               <div className="space-y-3 col-span-1 md:col-span-2 lg:col-span-1">
                 <p className="text-[10px] font-black uppercase tracking-widest opacity-30">Notes / अतिरिक्त विवरण</p>
                 <textarea 
                    id="item-notes-textarea" className="w-full h-[98px] rounded-2xl border-2 border-[var(--border)] bg-[var(--background)] p-4 font-bold text-xs focus:border-[var(--primary)] focus:outline-none transition-all shadow-inner resize-none"
                    placeholder="Supplier name or batch details (होलसेलर या बैच विवरण)..."
                    value={formData.notes}
                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                 />
               </div>
             </div>
          </motion.div>

          {/* Section 3: Financial Framework */}
          <motion.div 
            variants={sectionVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            ref={section3Ref} 
            className="space-y-10 border-t border-[var(--border)] pt-12 pb-20"
          >
             <label className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-[var(--primary)] px-2">
                <span className="w-6 h-6 rounded bg-[var(--primary)]/10 flex items-center justify-center text-[10px]">03</span> 3. Selling & Cost Rates / दाम व मूल्य
             </label>
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[
                  { label: t.retail, key: 'retailPrice', unitKey: 'retailPriceUnit', selection: 'retail', color: 'bg-green-500/10' },
                  { label: t.wholesale, key: 'wholesalePrice', unitKey: 'wholesalePriceUnit', selection: 'wholesale', color: 'bg-blue-500/10' },
                  { label: t.buy, key: 'buyingPrice', unitKey: 'buyingPriceUnit', selection: 'buy', color: 'bg-orange-500/10' }
                ].map((field) => (
                  <div key={field.key} className="space-y-3">
                     <p className="text-[9px] font-black uppercase tracking-widest opacity-30">{field.label}</p>
                     <div className="relative group">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-xl opacity-10 group-focus-within:opacity-40 transition-opacity">
                           {field.key === 'profitMargin' ? '%' : '₹'}
                        </span>
                        <input 
                           type="number"
                           step="any"
                           id={`item-price-${field.key}`}
                           placeholder="0.00"
                           className="w-full rounded-2xl border-2 border-[var(--border)] bg-[var(--background)] py-4 pl-10 pr-4 font-black text-lg focus:border-[var(--primary)] focus:outline-none transition-all shadow-inner placeholder:opacity-25"
                           value={(formData as any)[field.key] === 0 || (formData as any)[field.key] === '' || (formData as any)[field.key] === undefined || (formData as any)[field.key] === null ? '' : (formData as any)[field.key]}
                           onFocus={(e) => e.target.select()}
                           onChange={(e) => {
                             const val = e.target.value;
                             setFormData(prev => ({ 
                               ...prev, 
                               [field.key]: val === '' ? '' : (val.startsWith('0') && val.length > 1 && !val.startsWith('0.') ? parseFloat(val) : val) 
                             }));
                           }}
                        />
                     </div>
                     {field.selection && (
                        <button 
                           id={`item-price-unit-${field.selection}`}
                           data-navigable="true"
                           onClick={() => setActiveUnitSelection(field.selection as any)}
                           className={cn("w-full py-2.5 rounded-xl border border-transparent font-black uppercase text-[8px] tracking-widest transition-all cursor-pointer", field.color)}
                        >
                           / {(formData as any)[field.unitKey]}
                        </button>
                     )}
                  </div>
                ))}
             </div>
             
             <div className="grid grid-cols-4 gap-2">
                {quickAmounts.map((amt, idx) => (
                  <button key={`amt-${amt}-${idx}`} onClick={() => setFormData(prev => ({ ...prev, retailPrice: amt }))} className="p-3 rounded-xl bg-[var(--card)] border border-[var(--border)] text-[9px] font-black opacity-30 hover:opacity-100 hover:border-[var(--primary)] hover:text-[var(--primary)] transition-all cursor-pointer">₹{amt}</button>
                ))}
             </div>
          </motion.div>
        </div>

        {/* Action Bar */}
        <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-[var(--card)] via-[var(--card)]/95 to-transparent z-10 pointer-events-none">
           <div className="flex gap-4 pointer-events-auto">
             <Button id="item-save-btn" data-save="true" className="w-full py-5 rounded-2xl font-black uppercase text-sm shadow-xl shadow-[var(--primary)]/20 cursor-pointer" onClick={handleSave}>
                {initialData ? "Save Changes / बदलाव सेव करें" : "Save Item / सामान सेव करें"}
             </Button>
           </div>
        </div>

        <AnimatePresence>
          {activeUnitSelection && (
            <UnitSelectorModal 
              onClose={() => setActiveUnitSelection(null)}
              onSelect={handleUnitSelect}
              currentUnit={
                activeUnitSelection === 'base' ? formData.unit! :
                activeUnitSelection === 'buy' ? formData.buyingPriceUnit! :
                activeUnitSelection === 'wholesale' ? formData.wholesalePriceUnit! :
                formData.retailPriceUnit!
              }
            />
          )}
        </AnimatePresence>

        {/* Photo Source Selection Popup Modal */}
        <AnimatePresence>
          {showPhotoSourceModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
              onClick={() => setShowPhotoSourceModal(false)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                transition={{ type: "spring", duration: 0.25, bounce: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-[310px] overflow-hidden rounded-2xl bg-[var(--card)] border border-[var(--border)] shadow-xl p-5 space-y-4"
              >
                {/* Header */}
                <div className="flex items-center justify-between pb-1 border-b border-[var(--border)]/50">
                  <div>
                    <h3 className="text-sm font-bold tracking-tight text-[var(--foreground)]">
                      Add Product Photo
                    </h3>
                    <p className="text-[10px] text-zinc-400 font-medium">
                      Select photo source
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowPhotoSourceModal(false)}
                    className="w-7 h-7 rounded-lg bg-[var(--background)] hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 flex items-center justify-center transition-colors cursor-pointer"
                  >
                    <X size={14} />
                  </button>
                </div>

                {/* Compact Option Items */}
                <div className="space-y-2">
                  {/* Option 1: Open Camera (Device Camera) */}
                  <button
                    type="button"
                    onClick={triggerDeviceCamera}
                    className="w-full p-3 rounded-xl border border-[var(--border)] hover:border-blue-500/60 bg-[var(--background)] hover:bg-blue-500/5 flex items-center gap-3 transition-all text-left group cursor-pointer active:scale-[0.98]"
                  >
                    <div className="w-9 h-9 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-all">
                      <Camera size={17} className="stroke-[2.2]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-xs text-[var(--foreground)] group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                          Open Camera
                        </span>
                        <ChevronRight size={14} className="text-zinc-400 group-hover:text-blue-500 transition-colors" />
                      </div>
                      <p className="text-[10px] text-zinc-400 font-medium mt-0.5">
                        Capture using device camera
                      </p>
                    </div>
                  </button>

                  {/* Option 2: Open Gallery */}
                  <button
                    type="button"
                    onClick={triggerDeviceGallery}
                    className="w-full p-3 rounded-xl border border-[var(--border)] hover:border-purple-500/60 bg-[var(--background)] hover:bg-purple-500/5 flex items-center gap-3 transition-all text-left group cursor-pointer active:scale-[0.98]"
                  >
                    <div className="w-9 h-9 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0 group-hover:bg-purple-600 group-hover:text-white transition-all">
                      <ImageIcon size={17} className="stroke-[2.2]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-xs text-[var(--foreground)] group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                          Open Gallery
                        </span>
                        <ChevronRight size={14} className="text-zinc-400 group-hover:text-purple-500 transition-colors" />
                      </div>
                      <p className="text-[10px] text-zinc-400 font-medium mt-0.5">
                        Select from photos or files
                      </p>
                    </div>
                  </button>

                  {/* Remove Current Photo if exists */}
                  {formData.imageUrl && (
                    <button
                      type="button"
                      onClick={() => {
                        handleRemoveImage();
                        setShowPhotoSourceModal(false);
                      }}
                      className="w-full py-2 px-3 rounded-lg text-rose-500 hover:bg-rose-500/10 flex items-center justify-center gap-1.5 text-xs font-medium transition-colors cursor-pointer"
                    >
                      <Trash2 size={13} /> Remove Current Photo
                    </button>
                  )}
                </div>

                {/* Cancel Button */}
                <button
                  type="button"
                  onClick={() => setShowPhotoSourceModal(false)}
                  className="w-full py-2 rounded-xl bg-[var(--background)] hover:bg-zinc-200 dark:hover:bg-zinc-800 text-[var(--foreground)] font-semibold text-xs transition-colors cursor-pointer border border-[var(--border)]"
                >
                  Cancel
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}
export default ItemFormModal;
