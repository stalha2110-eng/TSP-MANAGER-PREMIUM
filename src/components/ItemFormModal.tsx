import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Edit2, X, ChevronDown, Camera, Image as ImageIcon, Trash2, Upload } from 'lucide-react';
import { Button } from './ui/Button';
import { UnitSelectorModal } from './ui/UnitSelectorModal';
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

export function ItemFormModal({ 
  onClose, 
  onSave, 
  categories, 
  initialData, 
  t, 
  language 
}: ItemFormModalProps) {
  const [formData, setFormData] = useState<Partial<Item>>(() => {
    if (initialData) {
      return {
        ...initialData,
        minStockLevel: initialData.minStockLevel ?? 10
      };
    }
    return {
      name: '',
      categoryId: categories[0]?.id || '',
      quantity: 1,
      unit: 'KG',
      retailPrice: 0,
      retailPriceUnit: 'KG',
      wholesalePrice: 0,
      wholesalePriceUnit: 'KG',
      buyingPrice: 0,
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { recentUnits } = useRecentUnits();

  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setIsUploadingImage(true);
      const dataUrl = await compressImageFile(file, 360, 360, 0.82);
      setFormData(prev => ({ ...prev, imageUrl: dataUrl }));
    } catch (err) {
      console.error("Failed to compress and save image", err);
    } finally {
      setIsUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setFormData(prev => ({ ...prev, imageUrl: undefined }));
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
    onSave(formData);
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
               <span className="w-6 h-6 rounded bg-[var(--primary)]/10 flex items-center justify-center text-[10px]">01</span> 1. Basic Details / सामान की जानकारी
             </label>
             <div className="space-y-4">
               <div className="group relative">
                <input 
                  id="item-name-input"
                  className="w-full rounded-2xl border-2 border-[var(--border)] bg-[var(--background)] p-6 font-black text-2xl focus:border-[var(--primary)] focus:outline-none transition-all placeholder:opacity-20 shadow-inner"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  onBlur={handleNameBlur}
                  placeholder="Item Name / सामान का नाम (e.g. Milk, Rice)..."
                />
                {isTranslating && (
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 flex gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--primary)] animate-bounce" />
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--primary)] animate-bounce [animation-delay:0.2s]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--primary)] animate-bounce [animation-delay:0.4s]" />
                  </div>
                )}
               </div>

               {/* Product Photo Attachment */}
               <div className="flex items-center gap-3.5 p-3 rounded-2xl bg-[var(--card)] border-2 border-[var(--border)] shadow-xs">
                 <input
                   type="file"
                   ref={fileInputRef}
                   accept="image/*"
                   onChange={handleImageFileChange}
                   className="hidden"
                 />
                 {formData.imageUrl ? (
                   <div className="relative group shrink-0">
                     <img
                       src={formData.imageUrl}
                       alt="Item preview"
                       className="w-16 h-16 rounded-xl object-cover border-2 border-[var(--primary)] shadow-md"
                     />
                     <button
                       type="button"
                       onClick={handleRemoveImage}
                       className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-rose-500 hover:bg-rose-600 text-white flex items-center justify-center shadow-lg transition-transform active:scale-90 cursor-pointer"
                       title="Remove image"
                     >
                       <X size={12} strokeWidth={3} />
                     </button>
                   </div>
                 ) : (
                   <div 
                     onClick={() => fileInputRef.current?.click()}
                     className="w-16 h-16 rounded-xl border-2 border-dashed border-[var(--border)] hover:border-[var(--primary)] flex flex-col items-center justify-center text-zinc-400 hover:text-[var(--primary)] bg-[var(--background)] shrink-0 cursor-pointer transition-colors"
                     title="Attach Item Photo"
                   >
                     <Camera size={22} className="opacity-70" />
                     <span className="text-[7.5px] font-black uppercase mt-1 tracking-wider">Photo</span>
                   </div>
                 )}

                 <div className="flex-1 min-w-0 flex flex-col justify-center">
                   <div className="flex items-center gap-2 flex-wrap">
                     <button
                       type="button"
                       onClick={() => fileInputRef.current?.click()}
                       disabled={isUploadingImage}
                       className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--primary)]/10 hover:bg-[var(--primary)] text-[var(--primary)] hover:text-white font-black text-[10px] uppercase tracking-wider transition-all active:scale-95 cursor-pointer shadow-xs border border-[var(--primary)]/20"
                     >
                       <Camera size={13} />
                       <span>{formData.imageUrl ? 'Change Photo / फोटो बदलें' : 'Attach Photo / तस्वीर जोड़ें'}</span>
                     </button>
                     {formData.imageUrl && (
                       <button
                         type="button"
                         onClick={handleRemoveImage}
                         className="px-2 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1"
                       >
                         <Trash2 size={11} /> Remove
                       </button>
                     )}
                   </div>
                   <p className="text-[9px] font-medium text-zinc-500 dark:text-zinc-400 mt-1 leading-tight">
                     Replaces emoji icon on inventory cards. Saved directly in local device storage.
                   </p>
                 </div>
               </div>

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
                     id="item-qty-input" className="flex-1 rounded-2xl border-2 border-[var(--border)] bg-[var(--background)] p-4 font-black text-xl focus:border-[var(--primary)] focus:outline-none transition-all shadow-inner"
                     value={formData.quantity}
                     onChange={(e) => setFormData(prev => ({ ...prev, quantity: parseFloat(e.target.value) || 0 }))}
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
                   id="item-min-stock-input" className="w-full rounded-2xl border-2 border-[var(--border)] bg-[var(--background)] p-4 font-black text-xl focus:border-[var(--primary)] focus:outline-none transition-all shadow-inner"
                   value={formData.minStockLevel ?? 10}
                   onChange={(e) => setFormData(prev => ({ ...prev, minStockLevel: parseFloat(e.target.value) || 0 }))}
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
                           id={`item-price-${field.key}`} className="w-full rounded-2xl border-2 border-[var(--border)] bg-[var(--background)] py-4 pl-10 pr-4 font-black text-lg focus:border-[var(--primary)] focus:outline-none transition-all shadow-inner"
                           value={(formData as any)[field.key]}
                           onChange={(e) => setFormData(prev => ({ ...prev, [field.key]: parseFloat(e.target.value) || 0 }))}
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
      </motion.div>
    </motion.div>
  );
}
export default ItemFormModal;
