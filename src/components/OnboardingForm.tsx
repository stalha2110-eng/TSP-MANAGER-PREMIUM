import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  User, 
  Phone, 
  MapPin, 
  Sun, 
  Moon, 
  ArrowRight, 
  ArrowLeft,
  Receipt, 
  ShieldCheck,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { AppSettings } from '../types';
import logoTSPM from '../logoTSPM.png';

interface OnboardingFormProps {
  settings: AppSettings;
  onComplete: (details: {
    storeName: string;
    storeOwnerName: string;
    storePhone: string;
    storeAddress: string;
    storeOpeningTime: string;
    storeClosingTime: string;
  }) => Promise<void>;
  userEmail: string | null;
  onBack?: () => void;
}

export function OnboardingForm({ settings, onComplete, userEmail, onBack }: OnboardingFormProps) {
  const [storeName, setStoreName] = useState(settings.storeName || '');
  const [storeOwnerName, setStoreOwnerName] = useState(settings.storeOwnerName || '');
  const [storePhone, setStorePhone] = useState(settings.storePhone || '');
  const [storeAddress, setStoreAddress] = useState(settings.storeAddress || '');
  const [storeOpeningTime, setStoreOpeningTime] = useState(settings.storeOpeningTime || '08:00');
  const [storeClosingTime, setStoreClosingTime] = useState(settings.storeClosingTime || '21:00');

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!storeName.trim()) {
      newErrors.storeName = "Store Name is required";
    } else if (storeName.trim().length < 3) {
      newErrors.storeName = "Store name must be at least 3 characters";
    }

    if (!storeOwnerName.trim()) {
      newErrors.storeOwnerName = "Store Owner Name is required";
    }

    if (!storePhone.trim()) {
      newErrors.storePhone = "Phone number is required";
    } else if (!/^\+?[0-9\s\-()]{10,15}$/.test(storePhone.trim())) {
      newErrors.storePhone = "Please enter a valid phone number (at least 10 digits)";
    }

    if (!storeAddress.trim()) {
      newErrors.storeAddress = "Store address is required";
    } else if (storeAddress.trim().length < 10) {
      newErrors.storeAddress = "Address must be more descriptive (at least 10 characters)";
    }

    if (!storeOpeningTime) {
      newErrors.storeOpeningTime = "Select opening time";
    }
    if (!storeClosingTime) {
      newErrors.storeClosingTime = "Select closing time";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      await onComplete({
        storeName: storeName.trim(),
        storeOwnerName: storeOwnerName.trim(),
        storePhone: storePhone.trim(),
        storeAddress: storeAddress.trim(),
        storeOpeningTime,
        storeClosingTime,
      });
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-[#f8fafc] text-slate-800 py-12 px-4 sm:px-6 flex flex-col justify-center items-center overflow-hidden font-sans">
      {/* Glow overlays */}
      <div className="absolute top-[10%] -left-[10%] w-[400px] h-[400px] rounded-full bg-indigo-100/40 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[10%] -right-[10%] w-[450px] h-[450px] rounded-full bg-emerald-100/30 blur-[120px] pointer-events-none" />

      {/* Main Container Card */}
      <div className="relative z-10 w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
        
        {/* Left Column: Form Setup Fields */}
        <div className="lg:col-span-7 bg-white border border-slate-200/85 rounded-[2.5rem] p-8 md:p-10 shadow-lg flex flex-col justify-between backdrop-blur-xl">
          <div className="space-y-6">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-xl bg-slate-50 p-1.5 border border-slate-200/80 flex items-center justify-center">
                  <img 
                    src={logoTSPM} 
                    alt="TS Price Manager Logo" 
                    className="h-full w-full object-contain rounded-lg"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div>
                  <span className="font-mono text-[8px] uppercase tracking-[0.3em] text-indigo-600 font-extrabold block">Merchant Account Setup</span>
                  <h2 className="text-sm font-black uppercase tracking-tight text-slate-900 mt-0.5">
                    Store Profile Configuration
                  </h2>
                </div>
              </div>

              {onBack && (
                <button
                  type="button"
                  id="merchant-setup-back-btn"
                  onClick={onBack}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 hover:text-slate-950 text-xs font-black uppercase tracking-wider transition-all shadow-xs active:scale-95 cursor-pointer shrink-0"
                  title="Back to login"
                >
                  <ArrowLeft size={14} className="text-indigo-600" />
                  <span>Back</span>
                </button>
              )}
            </div>

            <div className="space-y-1.5">
              <h3 className="text-xl font-black uppercase text-slate-900 tracking-tight">
                Establish Your Store Details
              </h3>
              <p className="text-xs text-slate-500 font-medium leading-relaxed">
                Please provide details about your shop. These elements will automatically populate the official header of your printed thermal receipts and digital invoices.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Grid Store Name & Owner Name */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Store Name */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <img src={logoTSPM} className="h-3.5 w-3.5 object-contain rounded-sm" referrerPolicy="no-referrer" alt="" />
                    Shop/Store Name *
                  </label>
                  <input 
                    type="text" 
                    value={storeName} 
                    onChange={e => {
                      setStoreName(e.target.value);
                      if (errors.storeName) setErrors(prev => ({ ...prev, storeName: '' }));
                    }}
                    className={`w-full bg-slate-50 text-slate-950 border ${errors.storeName ? 'border-rose-500' : 'border-slate-200 focus:border-indigo-500 focus:bg-white'} rounded-2xl px-4 py-3.5 text-xs font-bold outline-none transition-all placeholder:text-slate-400`}
                    placeholder="e.g. Ramesh Kirana Hub"
                  />
                  {errors.storeName && (
                    <p className="text-[10px] text-rose-600 font-bold flex items-center gap-1 mt-1">
                      <AlertCircle size={10} /> {errors.storeName}
                    </p>
                  )}
                </div>

                {/* Owner Name */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <User size={12} className="text-indigo-600" />
                    Store Owner Name *
                  </label>
                  <input 
                    type="text" 
                    value={storeOwnerName} 
                    onChange={e => {
                      setStoreOwnerName(e.target.value);
                      if (errors.storeOwnerName) setErrors(prev => ({ ...prev, storeOwnerName: '' }));
                    }}
                    className={`w-full bg-slate-50 text-slate-950 border ${errors.storeOwnerName ? 'border-rose-500' : 'border-slate-200 focus:border-indigo-500 focus:bg-white'} rounded-2xl px-4 py-3.5 text-xs font-bold outline-none transition-all placeholder:text-slate-400`}
                    placeholder="e.g. Ramesh Kumar"
                  />
                  {errors.storeOwnerName && (
                    <p className="text-[10px] text-rose-600 font-bold flex items-center gap-1 mt-1">
                      <AlertCircle size={10} /> {errors.storeOwnerName}
                    </p>
                  )}
                </div>
              </div>

              {/* Phone and Address */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <Phone size={12} className="text-indigo-600" />
                  Store Phone Number *
                </label>
                <input 
                  type="text" 
                  value={storePhone} 
                  onChange={e => {
                    setStorePhone(e.target.value);
                    if (errors.storePhone) setErrors(prev => ({ ...prev, storePhone: '' }));
                  }}
                  className={`w-full bg-slate-50 text-slate-950 border ${errors.storePhone ? 'border-rose-500' : 'border-slate-200 focus:border-indigo-500 focus:bg-white'} rounded-2xl px-4 py-3.5 text-xs font-bold outline-none transition-all placeholder:text-slate-400`}
                  placeholder="e.g. +91 9876543210"
                />
                {errors.storePhone && (
                  <p className="text-[10px] text-rose-600 font-bold flex items-center gap-1 mt-1">
                    <AlertCircle size={10} /> {errors.storePhone}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <MapPin size={12} className="text-indigo-600" />
                  Shop/Store Address *
                </label>
                <textarea 
                  value={storeAddress} 
                  onChange={e => {
                    setStoreAddress(e.target.value);
                    if (errors.storeAddress) setErrors(prev => ({ ...prev, storeAddress: '' }));
                  }}
                  rows={2}
                  className={`w-full bg-slate-50 text-slate-950 border ${errors.storeAddress ? 'border-rose-500' : 'border-slate-200 focus:border-indigo-500 focus:bg-white'} rounded-2xl px-4 py-3.5 text-xs font-bold outline-none transition-all placeholder:text-slate-400 resize-none`}
                  placeholder="e.g. Shop No. 12, Main Market, MG Road, Mumbai"
                />
                {errors.storeAddress && (
                  <p className="text-[10px] text-rose-600 font-bold flex items-center gap-1 mt-1">
                    <AlertCircle size={10} /> {errors.storeAddress}
                  </p>
                )}
              </div>

              {/* Store Opening & Closing Time */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <Sun size={12} className="text-amber-500" />
                    Store Opening Time *
                  </label>
                  <input 
                    type="time" 
                    value={storeOpeningTime} 
                    onChange={e => setStoreOpeningTime(e.target.value)}
                    className="w-full bg-slate-50 text-slate-950 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded-2xl px-4 py-3 text-xs font-mono font-bold outline-none transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <Moon size={12} className="text-indigo-600" />
                    Store Closing Time *
                  </label>
                  <input 
                    type="time" 
                    value={storeClosingTime} 
                    onChange={e => setStoreClosingTime(e.target.value)}
                    className="w-full bg-slate-50 text-slate-950 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded-2xl px-4 py-3 text-xs font-mono font-bold outline-none transition-all"
                  />
                </div>
              </div>

              {/* Submit Action */}
              <div className="pt-4">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full h-12 bg-slate-900 hover:bg-slate-800 text-white font-black text-xs uppercase tracking-widest rounded-2xl cursor-pointer shadow-md active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Save Details & Launch App</span>
                      <ArrowRight size={14} />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          <div className="pt-6 border-t border-slate-200/80 flex items-center justify-between text-[10px] text-slate-400 font-mono uppercase tracking-wider font-semibold">
            <span>Logged in as: {userEmail || "Local Guest"}</span>
            <span className="flex items-center gap-1"><ShieldCheck size={12} className="text-emerald-600" /> Secure Storage</span>
          </div>
        </div>

        {/* Right Column: Real-time Thermal Receipt Preview Mockup */}
        <div className="lg:col-span-5 bg-white border border-slate-200/85 rounded-[2.5rem] p-8 md:p-10 shadow-lg flex flex-col justify-between backdrop-blur-xl relative overflow-hidden">
          {/* Subtle decoration lines */}
          <div className="absolute top-0 right-0 p-8 opacity-5 rotate-12 pointer-events-none">
            <Receipt size={180} />
          </div>

          <div className="space-y-6">
            <div className="flex items-center gap-2">
              <Receipt size={16} className="text-indigo-600" />
              <h4 className="text-[10px] font-black uppercase tracking-[0.25em] text-indigo-600">Live Receipt Preview</h4>
            </div>
            
            <p className="text-[10px] text-slate-500 leading-normal font-medium">
              This is a real-time POS printer simulator showing how your official business receipts will print for customers with your customized name and headers.
            </p>

            {/* Thermal Receipt Paper simulator */}
            <div className="bg-slate-50 text-slate-900 rounded-2xl p-6 shadow-inner relative overflow-hidden font-mono text-[10px] leading-relaxed border-t-[8px] border-indigo-600/10 min-h-[300px] flex flex-col justify-between">
              
              {/* Receipt Header */}
              <div className="text-center space-y-1 border-b border-dashed border-slate-300 pb-4">
                <p className="font-extrabold uppercase text-xs leading-tight tracking-wide min-h-[14px]">
                  {storeName.trim() || "YOUR STORE NAME"}
                </p>
                <p className="text-[8px] opacity-70 italic min-h-[10px]">
                  Prop: {storeOwnerName.trim() || "Store Owner Name"}
                </p>
                <p className="text-[8px] opacity-70 min-h-[10px]">
                  Ph: {storePhone.trim() || "xxxxxxxxxx"}
                </p>
                <p className="text-[8px] opacity-70 min-h-[20px] max-w-[200px] mx-auto leading-tight break-words">
                  Add: {storeAddress.trim() || "Shop address details will appear here"}
                </p>
              </div>

              {/* Receipt Body */}
              <div className="py-4 space-y-1.5 border-b border-dashed border-slate-300 flex-1">
                <div className="flex justify-between text-[8px] opacity-50 uppercase tracking-wider">
                  <span>Item Name</span>
                  <span>Qty * Price</span>
                  <span>Total</span>
                </div>
                <div className="h-px bg-slate-200" />
                <div className="space-y-1 text-[8px] leading-tight">
                  <div className="flex justify-between">
                    <span>01. Premium Basmati Rice</span>
                    <span>5 kg x 120.00</span>
                    <span>600.00</span>
                  </div>
                  <div className="flex justify-between">
                    <span>02. Amul Salted Butter</span>
                    <span>1 pc x 275.00</span>
                    <span>275.00</span>
                  </div>
                </div>
              </div>

              {/* Receipt Footer */}
              <div className="pt-4 text-center space-y-1 text-[8.5px]">
                <div className="flex justify-between font-extrabold text-xs">
                  <span>GRAND TOTAL:</span>
                  <span>₹875.00</span>
                </div>
                <div className="h-px bg-slate-200" />
                <p className="text-[7.5px] opacity-60">Store Hours: {storeOpeningTime || '08:00'} - {storeClosingTime || '21:00'}</p>
                <p className="text-[7.5px] font-extrabold tracking-widest mt-1">*** THANK YOU ***</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-100 rounded-2xl p-4 text-[9px] text-emerald-700 mt-4 leading-normal font-semibold">
            <CheckCircle size={14} className="shrink-0 text-emerald-600" />
            <p>
              All fields updated here are automatically saved and remain fully editable at any point in the Settings & Profile panel.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
