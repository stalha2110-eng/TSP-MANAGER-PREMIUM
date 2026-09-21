import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, CheckCircle } from 'lucide-react';
import { LanguageType, ThemeType } from '../types';
import { cn } from '../lib/utils';

export interface OnboardingTourProps {
  onClose: () => void;
  t: any;
  state: any;
  handleUpdateSettings: (s: any) => void;
  setState: React.Dispatch<React.SetStateAction<any>>;
}

export function OnboardingTour({ 
  onClose, 
  t, 
  state, 
  handleUpdateSettings, 
  setState 
}: OnboardingTourProps) {
  const [step, setStep] = useState(0);

  // States inside Wizard to capture user selections
  const [storeType, setStoreType] = useState('retail');
  const [selectedLang, setSelectedLang] = useState<LanguageType>('en');
  const [selectedCurrency, setSelectedCurrency] = useState('INR');
  const [selectedTheme, setSelectedTheme] = useState<ThemeType>('retro-blue');

  // Total 5 steps (0 to 4)
  const totalSteps = 5;

  const handleFinishWizard = () => {
    // Update settings cleanly
    handleUpdateSettings({
      language: selectedLang,
      theme: selectedTheme,
      hasSeenOnboarding: true,
      pin: state.settings.pin || '000000',
      isLocked: false
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[200] overflow-y-auto bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <motion.div 
        initial={{ scale: 0.95, opacity: 0, y: 50 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        className="relative w-full max-w-xl bg-[var(--card)] border-2 border-[var(--primary)] shadow-[0_30px_70px_rgba(0,0,0,0.8)] rounded-3xl p-6 md:p-8 flex flex-col justify-between overflow-hidden text-left"
      >
        {/* Glow backdrop decorative layout elements */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--primary)]/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-indigo-500/15 rounded-full blur-2xl pointer-events-none" />

        {/* Wizard Progression indicators */}
        <div className="flex items-center justify-between mb-6 border-b border-[var(--border)] pb-3 select-none">
          <div>
            <span className="text-[8px] font-black uppercase text-[var(--primary)] tracking-widest leading-none">Enterprise Setup Workspace</span>
            <h2 className="text-sm font-black uppercase tracking-tight mt-1 text-[var(--foreground)]">Workspace Wizard • Step {step + 1} of {totalSteps}</h2>
          </div>
          <div className="flex gap-1">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div key={i} className={`h-1.5 rounded-full transition-all duration-300 ${i === step ? 'w-5 bg-[var(--primary)]' : i < step ? 'w-1.5 bg-emerald-500' : 'w-1.5 bg-[var(--foreground)]/10'}`} />
            ))}
          </div>
        </div>

        {/* Wizard Step Renderings */}
        <div className="flex-1 min-h-[300px] flex flex-col justify-center">
          <AnimatePresence mode="wait">
            {step === 0 && (
              <motion.div key="step-0" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                <div className="h-12 w-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mb-2">
                  <Sparkles size={24} className="animate-spin duration-3000" />
                </div>
                <h3 className="text-xl font-black tracking-tight uppercase leading-tight">Welcome to TS Price Manager</h3>
                <p className="text-xs text-[var(--foreground)]/70 leading-relaxed md:max-w-lg">
                  Designed for wholesalers, retail outlets, and fast-paced billing yards. This wizard will initialize your database, store details, local language settings, and hardware preferences in 1 minute.
                </p>
                <div className="pt-2 flex items-center gap-2 text-xs font-bold text-emerald-500">
                  <CheckCircle size={14} />
                  <span>Interactive Real-time Sync Ready</span>
                </div>
              </motion.div>

            )}
            {step === 1 && (
              <motion.div key="step-1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4 animate-in fade-in zoom-in-95">
                <h3 className="text-lg font-black uppercase tracking-tight">Select Business Model Sector</h3>
                <p className="text-xs text-[var(--foreground)]/60">Help us personalize the app mode suitable for your daily ledger cycles.</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2 pr-1 select-none">
                  {[
                    { id: 'retail', label: 'Retail Outlet / Grocery किराना', desc: 'Sells single items with optional wholesale minimum triggers.' },
                    { id: 'wholesale', label: 'Wholesale Depot थोक विक्रेता', desc: 'Deals in bulk counts, multiple unit types and rapid packing.' },
                    { id: 'billing', label: 'General POS Billing काउंटर', desc: 'General customer receipts counter setup with active cash checkout.' },
                    { id: 'auto', label: 'Hybrid Auto-Price (हाइब्रिड)', desc: 'Automatically swaps retail/wholesale depending on item cart volume.' }
                  ].map(b => (
                    <button
                      key={b.id}
                      onClick={() => setStoreType(b.id)}
                      className={cn(
                        "p-4 rounded-2xl border-2 text-left transition-all hover:border-[var(--primary)] text-xs cursor-pointer select-none",
                        storeType === b.id ? "border-[var(--primary)] bg-[var(--primary)]/5" : "border-[var(--border)] bg-[var(--card)]/50"
                      )}
                    >
                      <p className="font-extrabold text-[var(--foreground)] mb-1 leading-none">{b.label}</p>
                      <p className="text-[10px] opacity-65 leading-normal">{b.desc}</p>
                    </button>
                  ))}
                </div>
              </motion.div>

            )}
            {step === 2 && (
              <motion.div key="step-2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                <h3 className="text-lg font-black uppercase tracking-tight">Localization & Currency Standard</h3>
                <p className="text-xs text-[var(--foreground)]/60">Choose language preferences and currencies format for price columns.</p>
                
                <div className="space-y-4 pt-2 select-none">
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-wider text-[var(--foreground)]/50 mb-2">Display Language</p>
                    <div className="flex gap-2">
                      {[
                        { code: 'en', label: '🇬🇧 English' },
                        { code: 'hi', label: '🇮🇳 हिन्दी' },
                        { code: 'es', label: '🇪🇸 Español' }
                      ].map(l => (
                        <button
                          key={l.code}
                          onClick={() => setSelectedLang(l.code as any)}
                          className={cn(
                            "px-4 py-2.5 rounded-xl border text-xs font-bold cursor-pointer transition select-none flex-1 leading-none",
                            selectedLang === l.code ? "bg-[var(--primary)] text-white border-[var(--primary)]" : "bg-[var(--foreground)]/5 text-[var(--foreground)]/70 border-[var(--border)] hover:bg-[var(--foreground)]/10"
                          )}
                        >
                          {l.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-[9px] font-black uppercase tracking-wider text-[var(--foreground)]/50 mb-2">Currency Symbol Denomination</p>
                    <div className="flex gap-2">
                      {['INR (₹)', 'USD ($)', 'EUR (€)', 'GBP (£)'].map(curr => (
                        <button
                          key={curr}
                          onClick={() => setSelectedCurrency(curr.split(' ')[0])}
                          className={cn(
                            "px-3 py-2.5 rounded-xl border text-xs font-bold cursor-pointer transition select-none flex-1 leading-none",
                            selectedCurrency === curr.split(' ')[0] ? "bg-[var(--primary)] text-white border-[var(--primary)] animate-pulse" : "bg-[var(--foreground)]/5 text-[var(--foreground)]/75 border-[var(--border)] hover:bg-[var(--foreground)]/10"
                          )}
                        >
                          {curr}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>

            )}
            {step === 3 && (
              <motion.div key="step-3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4 select-none">
                <h3 className="text-lg font-black uppercase tracking-tight">Select Aura Visual Theme</h3>
                <p className="text-xs text-[var(--foreground)]/60">Match the terminal colors with your computer screen or hardware vibe.</p>
                <div className="grid grid-cols-2 gap-3 pt-2">
                  {[
                    { id: 'retro-blue', label: '🌌 Cosmic Retro Blue', desc: 'Classic indigo space theme' },
                    { id: 'emerald-gold', label: '🌿 Emerald Rich Gold', desc: 'Elite botanical store style' },
                    { id: 'minimalist-ivory', label: '🍦 Clean Ivory Slate', desc: 'Calm light high-contrast' },
                    { id: 'cyberpunk', label: '⚡ Cyber Neon Punch', desc: 'Pure high contrast layout' }
                  ].map(th => (
                    <button
                      key={th.id}
                      onClick={() => setSelectedTheme(th.id as any)}
                      className={cn(
                        "p-4 rounded-xl border text-left cursor-pointer transition-all uppercase text-[8px] font-black tracking-wider leading-relaxed",
                        selectedTheme === th.id ? "border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--primary)] scale-102 shadow" : "border-[var(--border)] text-[var(--foreground)] bg-[var(--foreground)]/5"
                      )}
                    >
                      <p className="font-extrabold mb-1">{th.label}</p>
                      <p className="opacity-65 text-[7.5px] transform-none font-medium text-[var(--foreground)]/70">{th.desc}</p>
                    </button>
                  ))}
                </div>
              </motion.div>

            )}
            {step === 4 && (
              <motion.div key="step-4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4 text-center">
                <div className="h-14 w-14 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto mb-2 animate-bounce">
                  <CheckCircle size={32} />
                </div>
                <h3 className="text-xl font-black uppercase tracking-tight text-emerald-500">Configuration Finalized!</h3>
                <p className="text-xs text-[var(--foreground)]/75 max-w-sm mx-auto">
                  Your store database is ready to register transaction ledgers and print premium invoices. Welcome to the elite tier of pricing analytics.
                </p>

                <div className="pt-2 text-[8px] font-black tracking-widest uppercase opacity-40">
                  Secured workspace • cloud connection established
                </div>
              </motion.div>
          )}
          </AnimatePresence>
        </div>

        {/* Wizard Footer Controls */}
        <div className="flex items-center justify-between border-t border-[var(--border)] pt-4 mt-6">
          <button
            onClick={() => setStep(prev => Math.max(0, prev - 1))}
            disabled={step === 0}
            className="px-4 py-2 border border-[var(--border)] rounded-xl text-xs uppercase cursor-pointer text-[var(--foreground)]/60 hover:text-[var(--foreground)] disabled:opacity-20 select-none font-bold"
          >
            Previous
          </button>

          {step < totalSteps - 1 ? (
            <button
              onClick={() => setStep(prev => prev + 1)}
              className="px-6 py-2 bg-[var(--primary)] hover:opacity-90 text-white rounded-xl text-xs uppercase cursor-pointer select-none font-black tracking-wide"
            >
              Continue Step
            </button>
          ) : (
            <button
              onClick={handleFinishWizard}
              className="px-8 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs uppercase cursor-pointer select-none font-black tracking-widest shadow-lg shadow-emerald-500/20"
            >
              Launch POS System
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}
export default OnboardingTour;
