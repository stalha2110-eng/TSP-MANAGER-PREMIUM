import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Minimize2,
  Type,
  Maximize2,
  CheckCircle2,
  RefreshCw,
  FileSpreadsheet,
  FileText as FilePdf,
  Database,
  Upload,
  Download,
  XCircle,
  HelpCircle,
  ArrowRight,
  Lock,
  Volume2,
  Play,
  Clock,
  Mail,
  Cloud,
  AlertTriangle,
  Key,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  Check,
  Sparkles,
  Cpu,
  Zap,
  ChevronDown,
  ChevronUp,
  Globe,
  Settings2
} from 'lucide-react';
import { AppState, AppSettings, ThemeType, LanguageType, CustomApiKeyItem } from '../types';
import { 
  playNotificationChime, 
  triggerVibration, 
  requestPushPermission 
} from '../services/notificationService';
import { playFeedbackEvent, playSynthesizedSound } from '../services/soundFeedbackService';
import { THEMES, LANGUAGES } from '../constants';
import { Button } from './ui/Button';
import { cn } from '../lib/utils';

export default function SettingsScreen({ 
  state, t, onUpdate, onShowHelp, onResetPIN,
  onExportExcel, onExportPDF, onImport, onBackup, onRestore, onClearCache,
  isSyncing, isExporting,
  activeSubTab: externalActiveSubTab,
  onChangeSubTab
}: { 
  state: AppState; t: any; onUpdate: (u: any) => void; onShowHelp: () => void; onResetPIN: () => void;
  onExportExcel: () => void;
  onExportPDF: () => void;
  onImport: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onBackup: () => void;
  onRestore: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onClearCache: () => void;
  isSyncing: boolean;
  isExporting: boolean;
  activeSubTab?: 'interface' | 'security' | 'sound' | 'data';
  onChangeSubTab?: (tab: 'interface' | 'security' | 'sound' | 'data') => void;
}) {
  const [localActiveSubTab, setLocalActiveSubTab] = useState<'interface' | 'security' | 'sound' | 'data'>('interface');
  const activeSubTab = externalActiveSubTab || localActiveSubTab;
  const setActiveSubTab = onChangeSubTab || setLocalActiveSubTab;

  // Collapsible state for Advanced Language Engine Configuration
  const [isAdvancedLanguageOpen, setIsAdvancedLanguageOpen] = useState(false);

  // Custom API Key Management State
  const [showAddKeyModal, setShowAddKeyModal] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyValue, setNewKeyValue] = useState('');
  const [keyVisibilityMap, setKeyVisibilityMap] = useState<{ [id: string]: boolean }>({});
  const [testingKeyId, setTestingKeyId] = useState<string | null>(null);
  const [keyTestResults, setKeyTestResults] = useState<{ [id: string]: { success: boolean; message: string } }>({});
  const [addKeyError, setAddKeyError] = useState<string | null>(null);

  const customKeysList = state.settings.customApiKeys || [];
  const activeKeyId = state.settings.activeApiKeyId;
  const isDefaultActive = !activeKeyId || activeKeyId === 'default';
  const activeKeyObj = !isDefaultActive ? customKeysList.find(k => k.id === activeKeyId) : null;

  const handleTestKey = async (keyId: string, keyValue: string) => {
    setTestingKeyId(keyId);
    setKeyTestResults(prev => ({ ...prev, [keyId]: { success: false, message: 'Testing key connection...' } }));
    
    const keyToTest = keyValue.trim();
    if (!keyToTest) {
      setKeyTestResults(prev => ({
        ...prev,
        [keyId]: { success: false, message: 'API Key is empty.' }
      }));
      setTestingKeyId(null);
      return;
    }

    try {
      let isSuccess = false;
      let resultMsg = '';

      try {
        const res = await fetch('/api/voice/test-key', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ apiKey: keyToTest })
        });

        const contentType = res.headers.get('content-type') || '';
        if (res.ok && contentType.includes('application/json')) {
          const data = await res.json();
          if (data && data.success) {
            isSuccess = true;
            resultMsg = data.message || 'Custom Gemini API Key validated successfully!';
          } else {
            resultMsg = data.error || 'Failed to validate API key.';
          }
        } else if (contentType.includes('application/json')) {
          const data = await res.json();
          resultMsg = data.error || data.message || `Server returned error (${res.status})`;
        } else {
          // If response is not JSON (e.g. HTML 404/500/PWA offline page "The page cannot..."), fallback to direct client-side test
          throw new Error('Server API returned non-JSON response');
        }
      } catch (serverErr) {
        // Fallback: Validate key directly against Google Gemini REST API (useful in standalone PWA / offline / proxy states)
        console.warn('Server test-key endpoint returned non-JSON or was unreachable. Falling back to direct client API test...', serverErr);
        
        try {
          const clientRes = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${encodeURIComponent(keyToTest)}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: [{ parts: [{ text: 'Respond with OK if active.' }] }]
              })
            }
          );

          if (clientRes.ok) {
            isSuccess = true;
            resultMsg = 'Custom Gemini API Key validated successfully!';
          } else {
            const errData = await clientRes.json().catch(() => null);
            const rawMessage = errData?.error?.message || errData?.message || `HTTP ${clientRes.status}: Unable to authenticate key`;
            const sanitizedMsg = rawMessage
              .replace(/error/gi, 'issue')
              .replace(/failed/gi, 'unsuccessful');
            resultMsg = `API Key Test Unsuccessful: ${sanitizedMsg}`;
          }
        } catch (clientErr: any) {
          resultMsg = clientErr?.message || 'Network error while testing API key.';
        }
      }

      setKeyTestResults(prev => ({
        ...prev,
        [keyId]: { success: isSuccess, message: resultMsg }
      }));
    } catch (e: any) {
      setKeyTestResults(prev => ({
        ...prev,
        [keyId]: { success: false, message: e.message || 'Error testing API key.' }
      }));
    } finally {
      setTestingKeyId(null);
    }
  };

  const handleAddCustomKey = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyValue.trim()) {
      setAddKeyError('Please enter a valid Gemini API key.');
      return;
    }
    const keyVal = newKeyValue.trim();
    const nameVal = newKeyName.trim() || `API Key ${(customKeysList.length + 1)}`;
    const newKeyObj: CustomApiKeyItem = {
      id: `key_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      name: nameVal,
      key: keyVal,
      createdAt: new Date().toISOString(),
      status: 'untested'
    };

    const updatedKeys = [...customKeysList, newKeyObj];

    onUpdate({
      customApiKeys: updatedKeys,
      activeApiKeyId: newKeyObj.id,
      customApiKey: newKeyObj.key
    });

    setNewKeyName('');
    setNewKeyValue('');
    setAddKeyError(null);
    setShowAddKeyModal(false);
  };

  const handleDeleteKey = (keyId: string) => {
    const updatedKeys = customKeysList.filter(k => k.id !== keyId);
    const isCurrentlyActive = activeKeyId === keyId;
    const newActiveId = isCurrentlyActive
      ? (updatedKeys.length > 0 ? updatedKeys[0].id : 'default')
      : activeKeyId;
    
    const newActiveKeyVal = updatedKeys.find(k => k.id === newActiveId)?.key;

    onUpdate({
      customApiKeys: updatedKeys,
      activeApiKeyId: newActiveId,
      customApiKey: newActiveKeyVal || undefined
    });
  };

  const handleSelectActiveKey = (keyId: string) => {
    const selectedObj = customKeysList.find(k => k.id === keyId);
    onUpdate({
      activeApiKeyId: keyId,
      customApiKey: selectedObj ? selectedObj.key : undefined
    });
  };

  const accentOptions = [
    { id: 'indigo', color: '#6366f1' },
    { id: 'emerald', color: '#10b981' },
    { id: 'rose', color: '#f43f5e' },
    { id: 'amber', color: '#f59e0b' },
    { id: 'cyan', color: '#06b6d4' },
    { id: 'slate', color: '#64748b' },
  ];

  const fontSizeOptions = [
    { id: 'compact', label: 'Compact', icon: <Minimize2 size={14} /> },
    { id: 'standard', label: 'Standard', icon: <Type size={14} /> },
    { id: 'comfortable', label: 'Spaced', icon: <Maximize2 size={14} /> },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8 pb-32 max-w-2xl mx-auto">
      <div className="flex flex-col gap-1 items-center md:items-start">
        <div className="h-1 bg-[var(--primary)] w-12 rounded-full mb-4 md:hidden" />
        <h2 className="text-4xl font-black tracking-tighter text-[var(--foreground)] uppercase">{t.settings}</h2>
        <p className="text-[10px] font-black uppercase tracking-[0.4em] opacity-30">Enterprise System v3.1</p>
      </div>

      {/* 🧭 Professional Categories Navigation Console */}
      <div className="flex bg-[var(--foreground)]/[0.03] border border-[var(--border)] p-1.5 rounded-2xl md:rounded-[2.2rem] gap-1 overflow-x-auto no-scrollbar scroll-smooth">
        {[
          { id: 'interface', label: '🎨 Interface', desc: 'Theme, Font & Style' },
          { id: 'security', label: '🔒 Security & Sync', desc: 'Secure PIN & Cloud' },
          { id: 'sound', label: '🔊 Audio & Beeps', desc: 'Synthesizer Sounds & Alarms' },
          { id: 'data', label: '💾 Sync & Database', desc: 'Exports & Storage cache' }
        ].map(cat => (
          <button
            key={cat.id}
            onClick={() => setActiveSubTab(cat.id as any)}
            className={cn(
              "flex-1 flex flex-col items-center justify-center text-center gap-1.5 px-4 py-3 rounded-xl md:rounded-[1.6rem] transition-all cursor-pointer min-w-[7.5rem] relative group select-none outline-none border",
              activeSubTab === cat.id
                ? "bg-[var(--card)] text-[var(--foreground)] border-[var(--border)] shadow-md translate-y-[-1px]"
                : "border-transparent text-[var(--foreground)]/50 hover:text-[var(--foreground)]/80 hover:bg-[var(--foreground)]/[0.01]"
            )}
          >
            <span className="text-[10px] font-black uppercase tracking-wider">{cat.label}</span>
            <span className="text-[7.5px] opacity-45 uppercase font-semibold block leading-none">{cat.desc}</span>
          </button>
        ))}
      </div>

      <div className="space-y-8">
        <AnimatePresence mode="wait">
          {activeSubTab === 'interface' && (
            <motion.div
              key="interface"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.15 }}
              className="space-y-8"
            >
              {/* Localization & Theme */}
              <section className="space-y-6">
                <div className="flex items-center gap-4">
                   <div className="h-1 w-8 bg-[var(--primary)] opacity-30 rounded-full" />
                   <label className="text-[10px] font-black uppercase tracking-[0.3em] text-[var(--primary)]">Global Interface</label>
                </div>
                
                <div className="grid gap-8">
                  <div className="space-y-4">
                    <p className="text-xs font-bold opacity-60 ml-1">Linguistic Interface</p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {LANGUAGES.map(lang => (
                        <button
                          key={lang.id}
                          onClick={() => onUpdate({ language: lang.id })}
                          className={cn(
                            "group relative flex flex-col items-center gap-3 rounded-[2rem] border p-6 transition-all",
                            state.settings.language === lang.id 
                              ? "border-[var(--primary)] bg-[var(--primary)]/10 shadow-lg" 
                              : "border-[var(--border)] bg-[var(--background)] hover:border-[var(--primary)]/40"
                          )}
                        >
                          <span className="text-4xl transition-transform group-hover:scale-110">{lang.emoji}</span>
                          <span className="text-[9px] font-black uppercase tracking-widest">{lang.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Advanced Professional Language Engine Collapsible Panel */}
                  <div className="rounded-3xl border border-[var(--border)] bg-[var(--card)]/50 overflow-hidden transition-all shadow-xs">
                    {/* Collapsible Trigger Card / Header Button */}
                    <button
                      id="toggle-advanced-language-config-btn"
                      type="button"
                      onClick={() => setIsAdvancedLanguageOpen(!isAdvancedLanguageOpen)}
                      className="w-full flex items-center justify-between p-5 sm:p-6 text-left cursor-pointer hover:bg-[var(--foreground)]/[0.02] active:bg-[var(--foreground)]/[0.04] transition-colors group"
                      aria-expanded={isAdvancedLanguageOpen}
                    >
                      <div className="flex items-center gap-3.5 sm:gap-4">
                        <div className="p-2.5 sm:p-3 rounded-2xl bg-[var(--primary)]/10 text-[var(--primary)] border border-[var(--primary)]/20 shadow-xs group-hover:scale-105 transition-transform shrink-0">
                          <Globe size={18} className="stroke-[2.2]" />
                        </div>
                        <div className="space-y-1 text-left">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-xs sm:text-sm font-black uppercase tracking-wider text-[var(--foreground)]">
                              Advanced Language Engine Configuration
                            </p>
                            {state.settings.enableStrictLanguageMode !== false && (
                              <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                Strict Active
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] sm:text-[11px] opacity-60 font-medium leading-relaxed">
                            {isAdvancedLanguageOpen 
                              ? "Click to collapse fine-grained linguistic rules & validation sandbox"
                              : "Click to configure strict translation modes, validation rules & preview tools"}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5 shrink-0 ml-3">
                        <span className="hidden sm:inline-block text-[10px] font-bold uppercase tracking-wider opacity-50 group-hover:opacity-80 transition-opacity">
                          {isAdvancedLanguageOpen ? "Hide" : "Configure"}
                        </span>
                        <div className={cn(
                          "h-8 w-8 rounded-xl flex items-center justify-center border border-[var(--border)] bg-[var(--background)] transition-transform duration-300",
                          isAdvancedLanguageOpen ? "rotate-180 bg-[var(--primary)]/10 border-[var(--primary)]/30 text-[var(--primary)]" : "text-[var(--foreground)]/60 group-hover:text-[var(--foreground)]"
                        )}>
                          <ChevronDown size={16} />
                        </div>
                      </div>
                    </button>

                    {/* Expandable Content Section with smooth Animation */}
                    <AnimatePresence initial={false}>
                      {isAdvancedLanguageOpen && (
                        <motion.div
                          key="advanced-language-content"
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.25, ease: 'easeInOut' }}
                          className="overflow-hidden border-t border-[var(--border)]/60 bg-[var(--background)]/30"
                        >
                          <div className="p-5 sm:p-6 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {/* Strict Language Mode Toggle */}
                              <div className="flex items-center justify-between p-4 rounded-2xl bg-[var(--card)] border border-[var(--border)]/60 shadow-xs">
                                <div>
                                  <p className="text-xs font-bold text-[var(--foreground)]">Strict Language Mode</p>
                                  <p className="text-[10px] opacity-50 mt-0.5">Enforces only the selected language in all UI components</p>
                                </div>
                                <button 
                                  onClick={() => onUpdate({ enableStrictLanguageMode: !state.settings.enableStrictLanguageMode })}
                                  className={cn(
                                    "h-7 w-14 rounded-full transition-all relative overflow-hidden ring-1 ring-white/10 cursor-pointer shrink-0",
                                    state.settings.enableStrictLanguageMode !== false ? "bg-emerald-500" : "bg-slate-800"
                                  )}
                                >
                                  <div className={cn("absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow-md transition-all", state.settings.enableStrictLanguageMode !== false ? "translate-x-7" : "")} />
                                </button>
                              </div>

                              {/* Allow Mixed Language Toggle */}
                              <div className="flex items-center justify-between p-4 rounded-2xl bg-[var(--card)] border border-[var(--border)]/60 shadow-xs">
                                <div>
                                  <p className="text-xs font-bold text-[var(--foreground)]">Allow Mixed Language</p>
                                  <p className="text-[10px] opacity-50 mt-0.5">Displays translation helpers alongside terms (not recommended)</p>
                                </div>
                                <button 
                                  onClick={() => onUpdate({ allowMixedLanguage: !state.settings.allowMixedLanguage })}
                                  className={cn(
                                    "h-7 w-14 rounded-full transition-all relative overflow-hidden ring-1 ring-white/10 cursor-pointer shrink-0",
                                    state.settings.allowMixedLanguage ? "bg-emerald-500" : "bg-slate-800"
                                  )}
                                >
                                  <div className={cn("absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow-md transition-all", state.settings.allowMixedLanguage ? "translate-x-7" : "")} />
                                </button>
                              </div>

                              {/* Enable Translation Validation */}
                              <div className="flex items-center justify-between p-4 rounded-2xl bg-[var(--card)] border border-[var(--border)]/60 shadow-xs">
                                <div>
                                  <p className="text-xs font-bold text-[var(--foreground)]">Translation Validation</p>
                                  <p className="text-[10px] opacity-50 mt-0.5">Scans & auto-corrects mismatched strings on the fly</p>
                                </div>
                                <button 
                                  onClick={() => onUpdate({ enableTranslationValidation: !state.settings.enableTranslationValidation })}
                                  className={cn(
                                    "h-7 w-14 rounded-full transition-all relative overflow-hidden ring-1 ring-white/10 cursor-pointer shrink-0",
                                    state.settings.enableTranslationValidation !== false ? "bg-emerald-500" : "bg-slate-800"
                                  )}
                                >
                                  <div className={cn("absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow-md transition-all", state.settings.enableTranslationValidation !== false ? "translate-x-7" : "")} />
                                </button>
                              </div>

                              {/* Enable Instant Language Refresh */}
                              <div className="flex items-center justify-between p-4 rounded-2xl bg-[var(--card)] border border-[var(--border)]/60 shadow-xs">
                                <div>
                                  <p className="text-xs font-bold text-[var(--foreground)]">Instant Language Refresh</p>
                                  <p className="text-[10px] opacity-50 mt-0.5">Applies system-wide linguistic reload instantly on select</p>
                                </div>
                                <button 
                                  onClick={() => onUpdate({ enableInstantLanguageRefresh: !state.settings.enableInstantLanguageRefresh })}
                                  className={cn(
                                    "h-7 w-14 rounded-full transition-all relative overflow-hidden ring-1 ring-white/10 cursor-pointer shrink-0",
                                    state.settings.enableInstantLanguageRefresh !== false ? "bg-emerald-500" : "bg-slate-800"
                                  )}
                                >
                                  <div className={cn("absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow-md transition-all", state.settings.enableInstantLanguageRefresh !== false ? "translate-x-7" : "")} />
                                </button>
                              </div>

                              {/* Show Language Preview Option */}
                              <div className="flex items-center justify-between p-4 rounded-2xl bg-[var(--card)] border border-[var(--border)]/60 shadow-xs md:col-span-2">
                                <div>
                                  <p className="text-xs font-bold text-[var(--foreground)]">Interactive Language Preview Panel</p>
                                  <p className="text-[10px] opacity-50 mt-0.5">Displays a real-time translation card for the selected mode below</p>
                                </div>
                                <button 
                                  onClick={() => onUpdate({ showLanguagePreview: !state.settings.showLanguagePreview })}
                                  className={cn(
                                    "h-7 w-14 rounded-full transition-all relative overflow-hidden ring-1 ring-white/10 cursor-pointer shrink-0",
                                    state.settings.showLanguagePreview !== false ? "bg-emerald-500" : "bg-slate-800"
                                  )}
                                >
                                  <div className={cn("absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow-md transition-all", state.settings.showLanguagePreview !== false ? "translate-x-7" : "")} />
                                </button>
                              </div>
                            </div>

                            {/* Interactive Preview Panel */}
                            {state.settings.showLanguagePreview !== false && (
                              <div className="mt-4 p-5 rounded-2xl bg-gradient-to-br from-[var(--primary)]/5 to-[var(--primary)]/10 border border-[var(--primary)]/20 shadow-inner">
                                <div className="flex items-center justify-between mb-4 border-b border-[var(--primary)]/15 pb-2">
                                  <p className="text-xs font-black uppercase tracking-wider text-[var(--primary)]">
                                    Live Linguistic Preview: {LANGUAGES.find(l => l.id === state.settings.language)?.name || state.settings.language} Mode
                                  </p>
                                  <span className="text-[10px] bg-[var(--primary)]/15 text-[var(--primary)] px-2 py-0.5 rounded-full font-bold">
                                    Strict Mode Active
                                  </span>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-3 text-xs">
                                  <div className="p-3 rounded-xl bg-[var(--card)] border border-[var(--border)]/40">
                                    <p className="text-[9px] opacity-40 font-bold uppercase tracking-widest">Add Product</p>
                                    <p className="font-bold text-[var(--foreground)] mt-0.5">
                                      {state.settings.language === 'en' ? 'Add Product' : state.settings.language === 'hi-en' ? 'Saman Add Karo' : state.settings.language === 'hi' ? 'सामान जोड़ें' : 'सामान जोडा'}
                                    </p>
                                  </div>
                                  
                                  <div className="p-3 rounded-xl bg-[var(--card)] border border-[var(--border)]/40">
                                    <p className="text-[9px] opacity-40 font-bold uppercase tracking-widest">Create Bill</p>
                                    <p className="font-bold text-[var(--foreground)] mt-0.5">
                                      {state.settings.language === 'en' ? 'Create Bill' : state.settings.language === 'hi-en' ? 'Bill Banao' : state.settings.language === 'hi' ? 'बिल बनाएं' : 'बिल तयार करा'}
                                    </p>
                                  </div>
                                  
                                  <div className="p-3 rounded-xl bg-[var(--card)] border border-[var(--border)]/40">
                                    <p className="text-[9px] opacity-40 font-bold uppercase tracking-widest">Customer Info</p>
                                    <p className="font-bold text-[var(--foreground)] mt-0.5">
                                      {state.settings.language === 'en' ? 'Customer Info' : state.settings.language === 'hi-en' ? 'Customer Info' : state.settings.language === 'hi' ? 'ग्राहक की जानकारी' : 'ग्राहक माहिती'}
                                    </p>
                                  </div>
                                  
                                  <div className="p-3 rounded-xl bg-[var(--card)] border border-[var(--border)]/40">
                                    <p className="text-[9px] opacity-40 font-bold uppercase tracking-widest">Stock</p>
                                    <p className="font-bold text-[var(--foreground)] mt-0.5">
                                      {state.settings.language === 'en' ? 'Stock' : state.settings.language === 'hi-en' ? 'Stock' : state.settings.language === 'hi' ? 'स्टॉक' : 'स्टॉक'}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Visual Deck Section */}
                  <div className="space-y-4">
                    <p className="text-xs font-bold opacity-60 ml-1">{t.themeDeck}</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {THEMES.map(theme => (
                        <button
                          key={theme.id}
                          onClick={() => onUpdate({ theme: theme.id })}
                          className={cn(
                            "relative flex items-center gap-5 rounded-[2.5rem] border p-6 text-left transition-all overflow-hidden group",
                            state.settings.theme === theme.id 
                              ? "border-[var(--primary)] bg-[var(--primary)]/20 shadow-2xl scale-[1.02]" 
                              : "border-[var(--border)] bg-[var(--card)] hover:border-[var(--primary)]/40"
                          )}
                        >
                          <div className={cn(
                            "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-2xl transition-transform group-hover:rotate-6",
                            state.settings.theme === theme.id ? "bg-[var(--primary)] text-white shadow-lg" : "bg-[var(--background)] shadow-inner"
                          )}>
                            {theme.emoji}
                          </div>
                          <div className="relative z-10">
                            <p className="font-black uppercase tracking-tighter text-xs">{theme.name}</p>
                            <p className={cn(
                              "text-[9px] font-bold leading-tight mt-1 uppercase opacity-40",
                              state.settings.theme === theme.id && "opacity-80"
                            )}>
                              {theme.description}
                            </p>
                          </div>
                          {state.settings.theme === theme.id && <CheckCircle2 size={24} className="absolute top-1/2 -right-4 -translate-y-1/2 scale-[3] opacity-10 text-[var(--primary)]" />}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </section>

              {/* Performance & Ledger (Integrated into Interface Tab!) */}
              <section className="space-y-6">
                <div className="flex items-center gap-4">
                   <div className="h-1 w-8 bg-blue-500 opacity-30 rounded-full" />
                   <label className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-500">{t.systemInfra}</label>
                </div>
                
                <div className="grid gap-4">
                  <div className="flex items-center justify-between p-8 card rounded-[2.5rem] border-[var(--border)] bg-[var(--card)]">
                    <div>
                      <h4 className="font-black uppercase tracking-tight text-xs opacity-60">{t.metricPrecision}</h4>
                      <div className="flex gap-2 mt-4">
                        {[0, 1, 2].map(p => (
                          <button
                            key={p}
                            onClick={() => onUpdate({ pricePrecision: p })}
                            className={cn(
                              "h-10 w-10 rounded-xl text-xs font-black transition-all border",
                              state.settings.pricePrecision === p 
                                ? "bg-[var(--primary)] text-white border-[var(--primary)] shadow-lg scale-110" 
                                : "bg-[var(--background)] border-[var(--border)] opacity-30 text-[var(--foreground)]"
                            )}
                          >
                            {p}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="h-12 w-[1px] bg-[var(--border)] rotate-12" />
                    <div className="text-right">
                      <h4 className="font-black uppercase tracking-tight text-xs opacity-60">{t.typographyDeck}</h4>
                      <div className="flex gap-2 mt-4 justify-end">
                        {fontSizeOptions.map(opt => (
                          <button
                            key={opt.id}
                            onClick={() => onUpdate({ fontSize: opt.id })}
                            className={cn(
                              "h-10 w-10 rounded-xl flex items-center justify-center transition-all border text-[var(--foreground)]",
                              state.settings.fontSize === opt.id 
                                ? "bg-[var(--primary)] text-white border-[var(--primary)] shadow-lg scale-110" 
                                : "bg-[var(--background)] border-[var(--border)] opacity-30"
                            )}
                          >
                            {opt.icon}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            </motion.div>
          )}

          {activeSubTab === 'security' && (
            <motion.div
              key="security"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.15 }}
              className="space-y-8"
            >
              {/* Security & Access */}
              <section className="space-y-6">
                <div className="flex items-center gap-4">
                   <div className="h-1 w-8 bg-orange-500 opacity-30 rounded-full" />
                   <label className="text-[10px] font-black uppercase tracking-[0.3em] text-orange-500">{t.securityCloud}</label>
                </div>
                
                <div className="card p-8 rounded-[3rem] border-[var(--border)] bg-[var(--card)] space-y-8 shadow-2xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 blur-[50px] rounded-full" />
                  
                  <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                    <div>
                      <h4 className="font-black uppercase tracking-tight text-sm text-[var(--foreground)]">{t.securityKey}</h4>
                      <p className="text-[10px] opacity-40 font-black mt-1 uppercase tracking-widest leading-relaxed text-[var(--foreground)]">{t.costProtection}</p>
                    </div>
                    <div className="flex flex-wrap gap-2 text-[var(--foreground)]">
                      {state.settings.pin ? (
                        <>
                          <Button 
                            variant="outline"
                            onClick={onResetPIN}
                            className="rounded-full px-6 h-12 text-[10px] uppercase font-black border-orange-500/30 hover:bg-orange-500/10 text-orange-500"
                          >
                            Update PIN
                          </Button>
                          <Button 
                            variant="ghost"
                            onClick={() => onUpdate({ pin: null })}
                            className="rounded-full px-6 h-12 text-[10px] uppercase font-black opacity-40 hover:opacity-100"
                          >
                            Disable
                          </Button>
                        </>
                      ) : (
                        <Button 
                          variant="primary"
                          onClick={onResetPIN}
                          className="rounded-full px-10 h-12 text-[10px] uppercase font-black shadow-xl"
                        >
                          Initialize PIN
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-8 border-t border-[var(--border)] overflow-hidden">
                    <div>
                      <h4 className="font-black uppercase tracking-tight text-sm text-[var(--foreground)]">{t.cloudSync}</h4>
                      <p className="text-[10px] opacity-40 font-black mt-1 uppercase tracking-widest leading-relaxed text-[var(--foreground)]">{t.firebaseSync}</p>
                      {state.user?.uid === 'guest_user' && (
                        <p className="text-[9px] text-amber-500 font-extrabold mt-1.5 uppercase tracking-wider">
                          ⚠️ Guest Mode: Cloud Sync requires Google Login
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      {isSyncing && (
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                          className="text-[var(--primary)]"
                        >
                          <RefreshCw size={16} />
                        </motion.div>
                      )}
                      <button 
                        disabled={isSyncing || state.user?.uid === 'guest_user'}
                        onClick={() => onUpdate({ autoCloudSync: !state.settings.autoCloudSync })}
                        className={cn(
                          "h-8 w-16 rounded-full transition-all relative overflow-hidden ring-1 ring-white/10 shadow-inner disabled:opacity-50 cursor-pointer",
                          state.settings.autoCloudSync && state.user?.uid !== 'guest_user' ? "bg-blue-500" : "bg-slate-800"
                        )}
                      >
                        <div className={cn("absolute top-1 left-1 h-6 w-6 rounded-full bg-white shadow-xl transition-all", state.settings.autoCloudSync && state.user?.uid !== 'guest_user' ? "translate-x-8" : "")} />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-8 border-t border-[var(--border)]">
                    <div>
                      <h4 className="font-black uppercase tracking-tight text-sm text-[var(--foreground)]">{t.autoStealth}</h4>
                      <p className="text-[10px] opacity-40 font-black mt-1 uppercase tracking-widest leading-relaxed text-[var(--foreground)]">{t.stealthDesc}</p>
                    </div>
                    <button 
                      onClick={() => onUpdate({ hideBuyingPriceByDefault: !state.settings.hideBuyingPriceByDefault })}
                      className={cn(
                        "h-8 w-16 rounded-full transition-all relative overflow-hidden ring-1 ring-white/10 shadow-inner cursor-pointer",
                        state.settings.hideBuyingPriceByDefault ? "bg-emerald-500" : "bg-slate-800"
                      )}
                    >
                      <div className={cn("absolute top-1 left-1 h-6 w-6 rounded-full bg-white shadow-xl transition-all", state.settings.hideBuyingPriceByDefault ? "translate-x-8" : "")} />
                    </button>
                  </div>

                  <div className="flex items-center justify-between pt-8 border-t border-[var(--border)]">
                    <div>
                      <h4 className="font-black uppercase tracking-tight text-sm text-[var(--foreground)]">Minimum Stock Level</h4>
                      <p className="text-[10px] opacity-40 font-black mt-1 uppercase tracking-widest leading-relaxed text-[var(--foreground)]">Alerts you when product stock reaches this count</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button 
                        onClick={() => onUpdate({ minStockLevel: Math.max(1, (state.settings.minStockLevel || 5) - 1) })}
                        className="h-8 w-8 rounded-lg border border-white/10 bg-white/5 flex items-center justify-center font-bold text-lg select-none p-0 text-[var(--foreground)] hover:bg-white/10"
                        variant="ghost"
                      >-</Button>
                      <span className="font-mono text-xs font-black px-3 h-8 flex items-center bg-white/5 border border-white/10 rounded-lg min-w-[3rem] justify-center text-[var(--foreground)]">
                        {state.settings.minStockLevel || 5}
                      </span>
                      <Button 
                        onClick={() => onUpdate({ minStockLevel: (state.settings.minStockLevel || 5) + 1 })}
                        className="h-8 w-8 rounded-lg border border-white/10 bg-white/5 flex items-center justify-center font-bold text-lg select-none p-0 text-[var(--foreground)] hover:bg-white/10"
                        variant="ghost"
                      >+</Button>
                    </div>
                  </div>
                </div>
              </section>

              {/* 🔑 Voice Assistant & Gemini API Keys Section */}
              <section className="space-y-6">
                <div className="flex items-center gap-4">
                  <div className="h-1 w-8 bg-amber-500 opacity-30 rounded-full" />
                  <label className="text-[10px] font-black uppercase tracking-[0.3em] text-amber-500">
                    Voice Assistant &amp; Gemini API Keys
                  </label>
                </div>

                <div className="card p-8 rounded-[3rem] border-[var(--border)] bg-[var(--card)] space-y-8 shadow-2xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 blur-[50px] rounded-full" />
                  
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <Key className="text-amber-500" size={18} />
                        <h4 className="font-black uppercase tracking-tight text-sm text-[var(--foreground)]">
                          API Key Orchestrator
                        </h4>
                      </div>
                      <p className="text-[10px] opacity-60 font-medium mt-1 leading-relaxed text-[var(--foreground)] max-w-xl">
                        The app uses the default built-in system key. Add your custom Gemini API key(s) here for Voice Product Assistant and AI services to use your custom quotas or account limits.
                      </p>
                    </div>

                    <Button
                      onClick={() => {
                        setAddKeyError(null);
                        setShowAddKeyModal(true);
                      }}
                      className="rounded-full px-6 h-11 text-[11px] uppercase font-black bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-slate-950 shadow-lg flex items-center gap-2 shrink-0"
                    >
                      <Plus size={16} /> Add Custom API Key
                    </Button>
                  </div>

                  {/* Active Key Indicator Status Card */}
                  <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-500 shrink-0">
                        <Sparkles size={18} />
                      </div>
                      <div>
                        <span className="text-[9px] font-black tracking-widest text-amber-500 uppercase block">Active AI Engine Key</span>
                        <p className="text-xs font-bold text-[var(--foreground)]">
                          {activeKeyObj 
                            ? `Custom Key: ${activeKeyObj.name} (${activeKeyObj.key.slice(0, 6)}...${activeKeyObj.key.slice(-4)})`
                            : 'Default System Gemini Key (Built-in)'
                          }
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] font-extrabold px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 uppercase tracking-wider self-start sm:self-auto">
                      ✓ Operational
                    </span>
                  </div>

                  {/* Available Keys List */}
                  <div className="space-y-3 pt-2">
                    <label className="text-[10px] font-black uppercase tracking-wider text-[var(--foreground)] opacity-50 block">
                      Configured Keys Hierarchy
                    </label>

                    {/* Default System Key Option */}
                    <div className={cn(
                      "p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3",
                      isDefaultActive 
                        ? "bg-indigo-500/10 border-indigo-500/40 ring-1 ring-indigo-500/30" 
                        : "bg-[var(--card)] border-[var(--border)] opacity-80 hover:opacity-100"
                    )}>
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400">
                          <Cpu size={18} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs text-[var(--foreground)]">Default System API Key</span>
                            {isDefaultActive && (
                              <span className="text-[9px] font-black bg-indigo-500 text-white px-2 py-0.5 rounded-full uppercase tracking-wider">
                                Active Default
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] opacity-50 font-mono block mt-0.5">Built-in Applet Gemini Key</span>
                        </div>
                      </div>

                      {!isDefaultActive && (
                        <Button
                          variant="outline"
                          onClick={() => handleSelectActiveKey('default')}
                          className="h-8 rounded-xl text-[10px] uppercase font-black px-4 self-start sm:self-auto"
                        >
                          Use Default Key
                        </Button>
                      )}
                    </div>

                    {/* Custom Keys List */}
                    {customKeysList.map((item, index) => {
                      const isActive = activeKeyId === item.id || (!activeKeyId && customKeysList[0]?.id === item.id);
                      const isRevealed = !!keyVisibilityMap[item.id];
                      const testResult = keyTestResults[item.id];
                      const isTesting = testingKeyId === item.id;

                      return (
                        <div key={`custom-key-${item.id || 'key'}-${index}`} className={cn(
                          "p-4 rounded-2xl border transition-all space-y-3",
                          isActive 
                            ? "bg-amber-500/10 border-amber-500/40 ring-1 ring-amber-500/30" 
                            : "bg-[var(--card)] border-[var(--border)]"
                        )}>
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="flex items-start gap-3">
                              <div className="p-2 rounded-xl bg-amber-500/20 text-amber-500 shrink-0 mt-0.5 sm:mt-0">
                                <Key size={18} />
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-xs text-[var(--foreground)]">{item.name}</span>
                                  {isActive && (
                                    <span className="text-[9px] font-black bg-amber-500 text-slate-950 px-2 py-0.5 rounded-full uppercase tracking-wider">
                                      Active Key
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className="font-mono text-[11px] opacity-70 bg-black/20 px-2 py-0.5 rounded border border-white/10">
                                    {isRevealed 
                                      ? item.key 
                                      : `${item.key.slice(0, 6)}••••••••••••${item.key.slice(-4)}`
                                    }
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => setKeyVisibilityMap(prev => ({ ...prev, [item.id]: !isRevealed }))}
                                    className="text-xs opacity-50 hover:opacity-100 p-1"
                                    title={isRevealed ? "Hide Key" : "Show Key"}
                                  >
                                    {isRevealed ? <EyeOff size={14} /> : <Eye size={14} />}
                                  </button>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
                              {!isActive && (
                                <Button
                                  variant="outline"
                                  onClick={() => handleSelectActiveKey(item.id)}
                                  className="h-8 rounded-xl text-[10px] uppercase font-black px-3 border-amber-500/30 text-amber-500 hover:bg-amber-500/10"
                                >
                                  Activate
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                disabled={isTesting}
                                onClick={() => handleTestKey(item.id, item.key)}
                                className="h-8 rounded-xl text-[10px] uppercase font-extrabold px-3 bg-white/5 hover:bg-white/10 flex items-center gap-1.5"
                              >
                                {isTesting ? (
                                  <>
                                    <RefreshCw size={12} className="animate-spin text-amber-500" />
                                    Testing...
                                  </>
                                ) : (
                                  <>
                                    <Zap size={12} className="text-amber-400" />
                                    Test
                                  </>
                                )}
                              </Button>
                              <Button
                                variant="ghost"
                                onClick={() => handleDeleteKey(item.id)}
                                className="h-8 rounded-xl text-[10px] uppercase font-bold px-2.5 text-rose-500 hover:bg-rose-500/10"
                                title="Delete Key"
                              >
                                <Trash2 size={14} />
                              </Button>
                            </div>
                          </div>

                          {testResult && (
                            <div className={cn(
                              "text-[10px] font-bold px-3 py-1.5 rounded-xl border flex items-center gap-2",
                              testResult.success 
                                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" 
                                : "bg-rose-500/10 border-rose-500/30 text-rose-400"
                            )}>
                              {testResult.success ? <Check size={12} /> : <AlertTriangle size={12} />}
                              <span>{testResult.message}</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </section>
            </motion.div>
          )}

          {activeSubTab === 'sound' && (
            <motion.div
              key="sound"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.15 }}
              className="space-y-8"
            >
              {/* Notification Settings Page */}
              <section className="space-y-6">
                <div className="flex items-center gap-4">
                   <div className="h-1 w-8 bg-blue-500 opacity-30 rounded-full" />
                   <label className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-500">Notification Orchestrator</label>
                </div>

                <div className="card p-8 rounded-[3rem] border-[var(--border)] bg-[var(--card)] space-y-8 shadow-2xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 blur-[50px] rounded-full" />

                  {/* Master Notification Toggle */}
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-black uppercase tracking-tight text-sm text-[var(--foreground)]">In-App Alerts</h4>
                      <p className="text-[10px] opacity-45 font-black mt-1 uppercase tracking-widest leading-relaxed text-[var(--foreground)]">Show alerts center panel and real-time popups</p>
                    </div>
                    <button 
                      onClick={() => onUpdate({ notificationsOn: state.settings.notificationsOn === false ? true : false })}
                      className={cn(
                        "h-8 w-16 rounded-full transition-all relative overflow-hidden ring-1 ring-[var(--border)] shadow-inner cursor-pointer",
                        state.settings.notificationsOn !== false ? "bg-blue-500" : "bg-slate-800"
                      )}
                    >
                      <div className={cn("absolute top-1 left-1 h-6 w-6 rounded-full bg-white shadow-xl transition-all", state.settings.notificationsOn !== false ? "translate-x-8" : "")} />
                    </button>
                  </div>

                  {/* Push Notifications Toggle */}
                  <div className="flex items-center justify-between pt-8 border-t border-[var(--border)]">
                    <div>
                      <h4 className="font-black uppercase tracking-tight text-sm text-[var(--foreground)]">Push Notifications</h4>
                      <p className="text-[10px] opacity-45 font-black mt-1 uppercase tracking-widest leading-relaxed font-semibold text-[var(--foreground)]">Receive instant status updates to all synced devices</p>
                    </div>
                    <button 
                      onClick={async () => {
                        const currentVal = state.settings.pushOn !== false;
                        if (!currentVal) {
                          const granted = await requestPushPermission();
                          if (!granted) {
                            alert("Please enable notification permissions in your browser settings to receive push updates!");
                          }
                        }
                        onUpdate({ pushOn: !currentVal });
                      }}
                      className={cn(
                        "h-8 w-16 rounded-full transition-all relative overflow-hidden ring-1 ring-[var(--border)] shadow-inner cursor-pointer",
                        state.settings.pushOn !== false ? "bg-blue-500" : "bg-slate-800"
                      )}
                    >
                      <div className={cn("absolute top-1 left-1 h-6 w-6 rounded-full bg-white shadow-xl transition-all", state.settings.pushOn !== false ? "translate-x-8" : "")} />
                    </button>
                  </div>

                  {/* Sound & Vibration control */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-8 border-t border-[var(--border)]">
                    <div className="flex items-center justify-between bg-[var(--foreground)]/[0.02] p-4 rounded-3xl border border-[var(--border)]">
                      <div>
                        <h4 className="font-black tracking-tight text-xs uppercase text-[var(--foreground)]">Sound Alerts</h4>
                        <p className="text-[9px] opacity-45 uppercase tracking-widest mt-0.5 leading-none text-[var(--foreground)]">Play synthesized hitech chime</p>
                      </div>
                      <button 
                        onClick={() => {
                          const toVal = state.settings.soundOn === false ? true : false;
                          onUpdate({ soundOn: toVal });
                          if (toVal) { playNotificationChime('medium'); }
                        }}
                        className={cn(
                          "h-6 w-12 rounded-full transition-all relative overflow-hidden ring-1 ring-[var(--border)] cursor-pointer",
                          state.settings.soundOn !== false ? "bg-indigo-500" : "bg-slate-800"
                        )}
                      >
                        <div className={cn("absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white transition-all", state.settings.soundOn !== false ? "translate-x-6" : "")} />
                      </button>
                    </div>

                    <div className="flex items-center justify-between bg-[var(--foreground)]/[0.02] p-4 rounded-3xl border border-[var(--border)]">
                      <div>
                        <h4 className="font-black tracking-tight text-xs uppercase text-[var(--foreground)]">Haptic Vibration</h4>
                        <p className="text-[9px] opacity-45 uppercase tracking-widest mt-0.5 leading-none text-[var(--foreground)]">Vibrate mobile hand-device</p>
                      </div>
                      <button 
                        onClick={() => {
                          const toVal = state.settings.vibrationOn === false ? true : false;
                          onUpdate({ vibrationOn: toVal });
                          if (toVal) { triggerVibration('medium'); }
                        }}
                        className={cn(
                          "h-6 w-12 rounded-full transition-all relative overflow-hidden ring-1 ring-[var(--border)] cursor-pointer",
                          state.settings.vibrationOn !== false ? "bg-indigo-500" : "bg-slate-800"
                        )}
                      >
                        <div className={cn("absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white transition-all", state.settings.vibrationOn !== false ? "translate-x-6" : "")} />
                      </button>
                    </div>
                  </div>
                </div>
              </section>

              {/* Sound & Feedback Orchestrator */}
              <section className="space-y-6">
                <div className="flex items-center gap-4">
                   <div className="h-1 w-8 bg-amber-500 opacity-30 rounded-full" />
                   <label className="text-[10px] font-black uppercase tracking-[0.3em] text-amber-500">Sound & Feedback Orchestrator</label>
                </div>

                <div className="card p-8 rounded-[3rem] border-[var(--border)] bg-[var(--card)] space-y-8 shadow-2xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 blur-[50px] rounded-full" />
                  
                  {/* Feedback Mode Presets */}
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-black uppercase tracking-tight text-sm text-[var(--foreground)]">General Feedback Mode</h4>
                      <p className="text-[10px] opacity-45 font-black mt-1 uppercase tracking-widest leading-relaxed text-[var(--foreground)]">Choose how your app physically responds and Alerts</p>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { id: 'silent', label: 'Silent', desc: 'No sound or vibration', emoji: '🔇' },
                        { id: 'vibrate_only', label: 'Tactile Only', desc: 'Haptic triggers only', emoji: '📳' },
                        { id: 'vibrate_sound', label: 'Sound + Tactile', desc: 'Full active response', emoji: '🔊' }
                      ].map((mode) => (
                        <button
                          key={mode.id}
                          onClick={() => {
                            onUpdate({ soundFeedbackMode: mode.id as any });
                            if (mode.id !== 'silent') {
                              navigator.vibrate?.(40);
                            }
                          }}
                          className={cn(
                            "flex flex-col items-center gap-2 rounded-2xl border p-4 text-center transition-all cursor-pointer",
                            (state.settings.soundFeedbackMode || 'vibrate_sound') === mode.id
                              ? "border-amber-500 bg-amber-500/10 shadow-lg text-[var(--foreground)]"
                              : "border-[var(--border)] bg-[var(--background)] hover:border-amber-500/40 text-[var(--foreground)] opacity-70"
                          )}
                        >
                          <span className="text-2xl">{mode.emoji}</span>
                          <span className="text-[10px] font-black uppercase text-center">{mode.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Sound Pack Selectors */}
                  <div className="space-y-4 pt-8 border-t border-[var(--border)]">
                    <div>
                      <h4 className="font-black uppercase tracking-tight text-sm text-[var(--foreground)]">Sound Theme Packs</h4>
                      <p className="text-[10px] opacity-45 font-black mt-1 uppercase tracking-widest leading-relaxed text-[var(--foreground)]">Select synthesized sound aesthetics pack for beeps</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {[
                        { id: 'classic_pos', label: 'Classic POS', desc: '🏪 Retrotech scanner scans and high-frequency metal registers', emoji: '🏪' },
                        { id: 'modern', label: 'Modern Digital', desc: '📱 Gentle organic bubble clicks and pleasant major 7th chords', emoji: '📱' },
                        { id: 'professional', label: 'Executive Luxe', desc: '💼 Ultra-subtle woodblocks, dry clicks and warm business waves', emoji: '💼' }
                      ].map((pack) => (
                        <div
                          key={pack.id}
                          className={cn(
                            "flex flex-col justify-between rounded-3xl border p-5 transition-all text-left relative overflow-hidden",
                            (state.settings.soundStylePack || 'modern') === pack.id
                              ? "border-amber-500 bg-amber-500/5 shadow-md"
                              : "border-[var(--border)] bg-[var(--background)] opacity-80"
                          )}
                        >
                          <div>
                            <div className="flex items-center justify-between">
                              <span className="text-xl">{pack.emoji}</span>
                              <button
                                title="Instant Sound Preview"
                                onClick={() => {
                                  playSynthesizedSound('product_added', { settings: state.settings, overridePack: pack.id as any, isTestPreview: true });
                                  setTimeout(() => {
                                    playSynthesizedSound('bill_saved', { settings: state.settings, overridePack: pack.id as any, isTestPreview: true });
                                  }, 350);
                                }}
                                className="h-8 w-8 rounded-full bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 flex items-center justify-center cursor-pointer transition-all border border-amber-500/20 active:scale-95"
                              >
                                <Play size={12} className="fill-current ml-0.5" />
                              </button>
                            </div>
                            <h5 className="text-[11px] font-black uppercase tracking-wider mt-3 text-[var(--foreground)]">{pack.label}</h5>
                            <p className="text-[9px] opacity-50 mt-1 uppercase tracking-normal leading-relaxed text-[var(--foreground)]">{pack.desc}</p>
                          </div>
                          <button
                            onClick={() => {
                              onUpdate({ soundStylePack: pack.id as any });
                              playSynthesizedSound('product_added', { settings: { ...state.settings, soundStylePack: pack.id as any }, isTestPreview: true });
                            }}
                            className={cn(
                              "w-full text-center py-2 rounded-xl text-[9px] font-black uppercase tracking-widest mt-4 cursor-pointer transition-colors",
                              (state.settings.soundStylePack || 'modern') === pack.id
                                ? "bg-amber-500 text-white shadow-xs"
                                : "bg-[var(--foreground)]/[0.05] hover:bg-[var(--foreground)]/[0.1] text-[var(--foreground)]"
                            )}
                          >
                            {(state.settings.soundStylePack || 'modern') === pack.id ? 'Selected Active' : 'Activate Pack'}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Independent Volume Matrix */}
                  <div className="space-y-4 pt-8 border-t border-[var(--border)]">
                    <div>
                      <h4 className="font-black uppercase tracking-tight text-sm text-[var(--foreground)]">Audio Volume Synthesizer Matrix</h4>
                      <p className="text-[10px] opacity-45 font-black mt-1 uppercase tracking-widest leading-relaxed text-[var(--foreground)]">Fine-tune individual event synthesizer volumes independently</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {[
                        { key: 'soundOverallVolume', label: 'Overall Master Volume', icon: '🎧', def: 100, testEvent: 'product_added' },
                        { key: 'soundBillingVolume', label: 'Billing Success chime', icon: '💰', def: 80, testEvent: 'bill_saved' },
                        { key: 'soundPrintVolume', label: 'Invoice Printer Spool', icon: '🧾', def: 75, testEvent: 'print_success' },
                        { key: 'soundNotificationVolume', label: 'System Alarm Alerts', icon: '🚨', def: 85, testEvent: 'notification' }
                      ].map((vol) => {
                        const val = (state.settings[vol.key as keyof AppSettings] ?? vol.def) as number;
                        return (
                          <div key={vol.key} className="bg-[var(--foreground)]/[0.015] p-4 rounded-2xl border border-[var(--border)] bg-[var(--background)]/10 flex flex-col justify-between gap-3">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-black uppercase tracking-wider text-[var(--foreground)] flex items-center gap-1.5">
                                <span>{vol.icon}</span> {vol.label}
                              </span>
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-[10px] font-bold text-amber-500">{val}%</span>
                                <button
                                  onClick={() => {
                                    playSynthesizedSound(vol.testEvent as any, { 
                                      settings: { ...state.settings, [vol.key]: val }, 
                                      isTestPreview: true 
                                    });
                                  }}
                                  className="text-[9px] uppercase font-black tracking-widest text-amber-500 bg-amber-500/10 px-2.5 py-1 rounded-md hover:bg-amber-500/20 active:scale-95 transition-all outline-none"
                                >
                                  Demo
                                </button>
                              </div>
                            </div>
                            <input
                              type="range"
                              min="0"
                              max="100"
                              value={val as number}
                              onChange={(e) => onUpdate({ [vol.key]: parseInt(e.target.value) })}
                              className="w-full h-1 bg-[var(--foreground)]/10 rounded-lg appearance-none cursor-pointer accent-amber-500"
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Event Specific Sub-routing Controls */}
                  <div className="space-y-4 pt-8 border-t border-[var(--border)]">
                    <div>
                      <h4 className="font-black uppercase tracking-tight text-sm text-[var(--foreground)]">Tactile & Audio Channel Router</h4>
                      <p className="text-[10px] opacity-45 font-black mt-1 uppercase tracking-widest leading-relaxed text-[var(--foreground)]">Route audio/haptics to individual store actions</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {[
                        { label: 'Billing Complete (Invoice Saved)', soundKey: 'soundBillingEnabled', vibeKey: 'vibrationBillingEnabled', soundDef: true, vibeDef: true, testEvent: 'bill_saved', soundEmoji: '🔔', vibeEmoji: '⚡' },
                        { label: 'Product Added (Cart Registration)', soundKey: 'soundProductAddedEnabled', vibeKey: 'vibrationProductAddedEnabled', soundDef: true, vibeDef: true, testEvent: 'product_added', soundEmoji: '🔊', vibeEmoji: '⚡' },
                        { label: 'Print Success (Ticket Spooled)', soundKey: 'soundPrintEnabled', vibeKey: 'vibrationPrintEnabled', soundDef: true, vibeDef: true, testEvent: 'print_success', soundEmoji: '🔔', vibeEmoji: '⚡' },
                        { label: 'System Alert & Broadcasts', soundKey: 'soundNotificationEnabled', vibeKey: 'vibrationNotificationEnabled', soundDef: true, vibeDef: true, testEvent: 'notification', soundEmoji: '🔊', vibeEmoji: '⚡' },
                      ].map((evt) => {
                        const sOn = state.settings[evt.soundKey as keyof AppSettings] !== false;
                        const vOn = state.settings[evt.vibeKey as keyof AppSettings] !== false;
                        return (
                          <div key={evt.soundKey} className="p-4 rounded-3xl border border-[var(--border)] bg-[var(--foreground)]/[0.02] flex flex-col justify-between gap-3">
                            <span className="text-[10.5px] font-black uppercase tracking-wider text-[var(--foreground)] opacity-85 leading-snug">{evt.label}</span>
                            <div className="flex gap-2">
                              {/* Audio channel toggle */}
                              <button
                                onClick={() => {
                                  const newVol = !sOn;
                                  onUpdate({ [evt.soundKey]: newVol });
                                  if (newVol) {
                                    playSynthesizedSound(evt.testEvent as any, { settings: { ...state.settings, [evt.soundKey]: true }, isTestPreview: true });
                                  }
                                }}
                                className={cn(
                                  "flex-1 flex items-center justify-between px-3 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all cursor-pointer active:scale-95",
                                  sOn 
                                    ? "border-amber-500 bg-amber-500/10 text-amber-500" 
                                    : "border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] opacity-60"
                                )}
                              >
                                <span>{evt.soundEmoji} Synth Sound</span>
                                <span className={cn("inline-block h-2 w-2 rounded-full", sOn ? "bg-amber-500 animate-pulse" : "bg-slate-500")} />
                              </button>
                              {/* Vibration channel toggle */}
                              <button
                                onClick={() => {
                                  const newVib = !vOn;
                                  onUpdate({ [evt.vibeKey]: newVib });
                                  if (newVib && navigator.vibrate) {
                                    navigator.vibrate(35);
                                  }
                                }}
                                className={cn(
                                  "flex-1 flex items-center justify-between px-3 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all cursor-pointer active:scale-95",
                                  vOn 
                                    ? "border-indigo-500 bg-indigo-500/10 text-indigo-500" 
                                    : "border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] opacity-60"
                                )}
                              >
                                <span>{evt.vibeEmoji} Tactile Haptic</span>
                                <span className={cn("inline-block h-2 w-2 rounded-full", vOn ? "bg-indigo-500" : "bg-slate-500")} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Custom Vibration Strengths */}
                  <div className="space-y-4 pt-8 border-t border-[var(--border)]">
                    <div>
                      <h4 className="font-black uppercase tracking-tight text-sm text-[var(--foreground)]">Haptic Vibration Strength</h4>
                      <p className="text-[10px] opacity-45 font-black mt-1 uppercase tracking-widest leading-relaxed text-[var(--foreground)]">Configure phone haptic motors response levels</p>
                    </div>
                    <div className="grid grid-cols-3 gap-2.5">
                      {[
                        { id: 'light', label: 'Light Touch', strength: '15ms Tactile Tick' },
                        { id: 'medium', label: 'Balanced POS', strength: '35ms Standard Poke' },
                        { id: 'strong', label: 'Industrial Alert', strength: '120ms Strong Rumble' }
                      ].map((vib) => (
                        <button
                          key={vib.id}
                          onClick={() => {
                            onUpdate({ vibrationStrength: vib.id as any });
                            if (navigator.vibrate) {
                              const dur = vib.id === 'light' ? 15 : vib.id === 'medium' ? 45 : 120;
                              navigator.vibrate(dur);
                            }
                          }}
                          className={cn(
                            "flex flex-col items-center gap-1.5 p-4 rounded-2xl border transition-all cursor-pointer active:scale-95 text-center",
                            (state.settings.vibrationStrength || 'medium') === vib.id
                              ? "border-amber-500 bg-amber-500/10 text-[var(--foreground)] shadow-sm"
                              : "border-[var(--border)] bg-[var(--background)] opacity-70 hover:opacity-100 text-[var(--foreground)]"
                          )}
                        >
                          <span className="text-[10px] font-black uppercase tracking-wide leading-none">{vib.label}</span>
                          <span className="text-[7.5px] opacity-45 uppercase font-mono mt-1 leading-none">{vib.strength}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Smart Busy-Session Fatigue Dampener & Custom Quiet Hours */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-8 border-t border-[var(--border)]">
                    {/* Smart Fatigue */}
                    <div className="space-y-3 bg-[var(--foreground)]/[0.015] p-5 rounded-3xl border border-[var(--border)] bg-[var(--background)]/10 flex flex-col justify-between">
                      <div>
                        <h4 className="text-xs font-black uppercase tracking-tight text-[var(--foreground)] flex items-center gap-1.5">
                          <span>⚡</span> <span>Smart Scanning Dampener</span>
                        </h4>
                        <p className="text-[9.5px] opacity-45 font-black mt-2 uppercase tracking-wide leading-normal text-[var(--foreground)]">
                          Automatically reduces volume & vibration duration during fast scanning sessions to prevent cashier ear-fatigue and hand strain.
                        </p>
                      </div>
                      <div className="flex items-center justify-between pt-4 border-t border-[var(--border)]/10 mt-3 w-full">
                        <span className="text-[9px] uppercase font-black opacity-30 text-[var(--foreground)]">Fatigue Safeguard Status</span>
                        <button
                          onClick={() => onUpdate({ smartBusinessFeedback: state.settings.smartBusinessFeedback !== false ? false : true })}
                          className={cn(
                            "h-6 w-12 rounded-full transition-all relative overflow-hidden ring-1 ring-[var(--border)] shadow-inner cursor-pointer",
                            state.settings.smartBusinessFeedback !== false ? "bg-amber-500" : "bg-slate-800"
                          )}
                        >
                          <div className={cn("absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white transition-all", state.settings.smartBusinessFeedback !== false ? "translate-x-6" : "")} />
                        </button>
                      </div>
                    </div>

                    {/* Quiet Hours */}
                    <div className="space-y-4 bg-[var(--foreground)]/[0.015] p-5 rounded-3xl border border-[var(--border)] bg-[var(--background)]/10 flex flex-col justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-black uppercase tracking-tight text-[var(--foreground)] flex items-center gap-1.5">
                            <span>🌙</span> <span>Store Quiet Hours</span>
                          </h4>
                          <button
                            onClick={() => onUpdate({ quietHoursEnabled: !state.settings.quietHoursEnabled })}
                            className={cn(
                              "h-6 w-12 rounded-full transition-all relative overflow-hidden ring-1 ring-[var(--border)] shadow-inner cursor-pointer",
                              state.settings.quietHoursEnabled ? "bg-indigo-500" : "bg-slate-800"
                            )}
                          >
                            <div className={cn("absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white transition-all", state.settings.quietHoursEnabled ? "translate-x-6" : "")} />
                          </button>
                        </div>
                        <p className="text-[9.5px] opacity-45 font-black uppercase tracking-wide leading-normal text-[var(--foreground)]">
                          Automatically dampens or silences beep feedback after hours for peaceful operations.
                        </p>
                      </div>

                      {state.settings.quietHoursEnabled && (
                        <div className="space-y-3 pt-3 border-t border-[var(--border)]/10 mt-2 w-full">
                          <div className="flex items-center gap-4">
                            <div className="flex-1 flex flex-col gap-1">
                              <span className="text-[8px] font-black uppercase tracking-widest text-[var(--foreground)]/50">Start Mute</span>
                              <input
                                type="time"
                                value={state.settings.quietHoursStart || '22:00'}
                                onChange={(e) => onUpdate({ quietHoursStart: e.target.value })}
                                className="bg-[var(--background)] border border-[var(--border)] px-2.5 py-1.5 rounded-lg text-xs text-[var(--foreground)] font-mono outline-none cursor-pointer w-full"
                              />
                            </div>
                            <div className="flex-1 flex flex-col gap-1">
                              <span className="text-[8px] font-black uppercase tracking-widest text-[var(--foreground)]/50">End Mute</span>
                              <input
                                type="time"
                                value={state.settings.quietHoursEnd || '07:00'}
                                onChange={(e) => onUpdate({ quietHoursEnd: e.target.value })}
                                className="bg-[var(--background)] border border-[var(--border)] px-2.5 py-1.5 rounded-lg text-xs text-[var(--foreground)] font-mono outline-none cursor-pointer w-full"
                              />
                            </div>
                          </div>
                          {/* Quiet Hours Tactile Fallback */}
                          <div className="flex items-center justify-between pt-1">
                            <span className="text-[8px] uppercase font-black text-[var(--foreground)]/60 leading-none">Vibrate-only on quiet hours</span>
                            <button
                              onClick={() => onUpdate({ quietHoursVibrateOnly: state.settings.quietHoursVibrateOnly !== false ? false : true })}
                              className={cn(
                                "h-5 w-10 rounded-full transition-all relative overflow-hidden ring-1 ring-[var(--border)] cursor-pointer",
                                state.settings.quietHoursVibrateOnly !== false ? "bg-indigo-500" : "bg-slate-800"
                              )}
                            >
                              <div className={cn("absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white transition-all", state.settings.quietHoursVibrateOnly !== false ? "translate-x-5" : "")} />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Quick Actions Console */}
                  <div className="pt-8 border-t border-[var(--border)] flex flex-wrap gap-2.5">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        onUpdate({
                          soundFeedbackMode: 'vibrate_sound',
                          soundBillingEnabled: true,
                          soundProductAddedEnabled: true,
                          soundPrintEnabled: true,
                          soundNotificationEnabled: true,
                        });
                        playFeedbackEvent('product_added', { ...state.settings, soundFeedbackMode: 'vibrate_sound', soundProductAddedEnabled: true });
                      }}
                      className="rounded-xl text-[9px] uppercase font-black px-4 py-2 border-amber-500/20 hover:bg-amber-500/10 text-amber-500"
                    >
                      🔊 Enable All Beeps
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        onUpdate({
                          soundFeedbackMode: 'vibrate_only',
                          soundBillingEnabled: false,
                          soundProductAddedEnabled: false,
                          soundPrintEnabled: false,
                          soundNotificationEnabled: false,
                        });
                        if (navigator.vibrate) navigator.vibrate(50);
                      }}
                      className="rounded-xl text-[9px] uppercase font-black px-4 py-2 border-[var(--border)] hover:bg-[var(--foreground)]/[0.05] text-[var(--foreground)] opacity-60"
                    >
                      📳 Disable All Beeps
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        playSynthesizedSound('product_added', { settings: state.settings, isTestPreview: true });
                        setTimeout(() => {
                          playSynthesizedSound('bill_saved', { settings: state.settings, isTestPreview: true });
                          setTimeout(() => {
                            playSynthesizedSound('print_success', { settings: state.settings, isTestPreview: true });
                          }, 500);
                        }, 300);
                      }}
                      className="rounded-xl text-[9px] uppercase font-black px-4 py-2 border-indigo-500/20 hover:bg-indigo-500/10 text-indigo-500"
                    >
                      ⚡ Preview Sound Sequence
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        onUpdate({
                          soundFeedbackMode: 'vibrate_sound',
                          soundStylePack: 'modern',
                          soundOverallVolume: 100,
                          soundBillingVolume: 80,
                          soundPrintVolume: 75,
                          soundNotificationVolume: 85,
                          soundBillingEnabled: true,
                          soundProductAddedEnabled: true,
                          soundPrintEnabled: true,
                          soundNotificationEnabled: true,
                          vibrationStrength: 'medium',
                          vibrationBillingEnabled: true,
                          vibrationProductAddedEnabled: true,
                          vibrationPrintEnabled: true,
                          vibrationNotificationEnabled: true,
                          smartBusinessFeedback: true,
                          quietHoursEnabled: false,
                          quietHoursStart: '22:00',
                          quietHoursEnd: '07:00',
                          quietHoursVibrateOnly: true,
                        });
                        const updatedSettings: AppSettings = {
                          ...state.settings,
                          soundFeedbackMode: 'vibrate_sound',
                          soundStylePack: 'modern'
                        };
                        setTimeout(() => {
                          playFeedbackEvent('product_added', updatedSettings);
                        }, 100);
                      }}
                      className="rounded-xl text-[9px] uppercase font-black px-4 py-2 border-slate-500/20 hover:bg-slate-500/10 text-slate-400 select-none"
                    >
                      🔄 Restore Defaults
                    </Button>
                  </div>
                </div>
              </section>
            </motion.div>
          )}

          {activeSubTab === 'data' && (
            <motion.div
              key="data"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.15 }}
              className="space-y-8"
            >
              {/* Data Management Section */}
              <section className="space-y-6">
                <div className="flex items-center gap-4">
                   <div className="h-1 w-8 bg-purple-500 opacity-30 rounded-full" />
                   <label className="text-[10px] font-black uppercase tracking-[0.3em] text-purple-500">{t.dataLifecycle}</label>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="card p-6 rounded-[2rem] border-[var(--border)] bg-[var(--card)] space-y-6">
                     <h4 className="text-xs font-black uppercase tracking-widest opacity-40 text-[var(--foreground)]">{t.exportVectors}</h4>
                     <div className="flex flex-col gap-3">
                        <Button 
                          onClick={onExportExcel} 
                          disabled={isExporting}
                          variant="outline" 
                          className="justify-start gap-3 rounded-xl py-6 border-emerald-500/20 text-emerald-500 hover:bg-emerald-500/10 disabled:opacity-50"
                        >
                          {isExporting ? <RefreshCw size={18} className="animate-spin" /> : <FileSpreadsheet size={18} />} 
                          <span className="text-[10px] font-black uppercase">{isExporting ? 'Processing...' : 'Export Data to Excel'}</span>
                        </Button>
                        <Button 
                          onClick={onExportPDF} 
                          disabled={isExporting}
                          variant="outline" 
                          className="justify-start gap-3 rounded-xl py-6 border-red-500/20 text-red-500 hover:bg-red-500/10 disabled:opacity-50"
                        >
                          {isExporting ? <RefreshCw size={18} className="animate-spin" /> : <FilePdf size={18} />} 
                          <span className="text-[10px] font-black uppercase">{isExporting ? 'Processing...' : 'Export Data to PDF'}</span>
                        </Button>
                     </div>
                  </div>

                  <div className="card p-6 rounded-[2rem] border-[var(--border)] bg-[var(--card)] space-y-6">
                     <h4 className="text-xs font-black uppercase tracking-widest opacity-40 text-[var(--foreground)]">{t.backupInfra}</h4>
                     <div className="flex flex-col gap-3">
                        <Button onClick={onBackup} variant="outline" className="justify-start gap-3 rounded-xl py-6 border-blue-500/20 text-blue-500 hover:bg-blue-500/10">
                          <Database size={18} /> <span className="text-[10px] font-black uppercase">Backup System Now</span>
                        </Button>
                        <label className="flex items-center justify-center gap-3 rounded-xl py-3.5 px-4 border border-dashed border-[var(--border)] text-xs font-black uppercase tracking-widest cursor-pointer hover:bg-white/5 text-[var(--foreground)] transition-colors">
                          <Upload size={18} /> Restore Backup
                          <input type="file" className="hidden" accept=".json" onChange={onRestore} />
                        </label>
                     </div>
                  </div>

                  {/* ☁️ Scheduled Auto-Cloud Backups Plan */}
                  <div className="card p-6 rounded-[2rem] border-[var(--border)] bg-[var(--card)] space-y-6 md:col-span-2">
                     <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div className="space-y-1">
                           <div className="flex items-center gap-2">
                              <span className="text-sm">☁️</span>
                              <h4 className="text-sm font-black uppercase tracking-wider text-[var(--foreground)]">Automated Cloud Backups Plan</h4>
                           </div>
                           <p className="text-[10px] opacity-45 font-black uppercase tracking-widest leading-relaxed text-[var(--foreground)]">
                              Automatically dispatch whole stock registries and transaction logs to cloud safely or as email transmission.
                           </p>
                        </div>
                        <div>
                           <button 
                             onClick={() => onUpdate({ scheduledBackupEnabled: !state.settings.scheduledBackupEnabled })}
                             className={cn(
                               "h-8 w-16 rounded-full transition-all relative overflow-hidden ring-1 ring-[var(--border)] shadow-inner cursor-pointer",
                               state.settings.scheduledBackupEnabled ? "bg-[var(--primary)]" : "bg-slate-800"
                             )}
                           >
                             <div className={cn("absolute top-1 left-1 h-6 w-6 rounded-full bg-white shadow-xl transition-all", state.settings.scheduledBackupEnabled ? "translate-x-8" : "")} />
                           </button>
                        </div>
                     </div>

                     {state.settings.scheduledBackupEnabled && (
                        <motion.div 
                          initial={{ opacity: 0, y: -10 }} 
                          animate={{ opacity: 1, y: 0 }} 
                          className="pt-4 border-t border-[var(--border)] space-y-6"
                        >
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div className="space-y-2">
                                 <label className="text-[10px] font-black uppercase tracking-widest text-[var(--foreground)] opacity-60 flex items-center gap-1.5 flex-wrap">
                                    <Mail size={12} className="text-[var(--primary)]" /> Destination Backup Email
                                 </label>
                                 <input
                                   type="email"
                                   placeholder="e.g. stalha2110@gmail.com"
                                   value={state.settings.scheduledBackupEmail === undefined ? "stalha2110@gmail.com" : state.settings.scheduledBackupEmail}
                                   onChange={(e) => onUpdate({ scheduledBackupEmail: e.target.value })}
                                   className="bg-[var(--background)] border border-[var(--border)] px-4 py-3 rounded-2xl text-xs text-[var(--foreground)] outline-none w-full font-mono max-w-sm"
                                 />
                                 <p className="text-[9px] opacity-40 uppercase leading-snug">
                                    The entire inventory state & billing archives will be packaged into a compressed JSON and transmitted here.
                                 </p>
                              </div>

                              <div className="space-y-2">
                                 <label className="text-[10px] font-black uppercase tracking-widest text-[var(--foreground)] opacity-60 flex items-center gap-1.5 flex-wrap">
                                    <Clock size={12} className="text-[var(--primary)]" /> Recurrence Specific Time
                                 </label>
                                 <div className="flex gap-3">
                                    <input
                                      type="time"
                                      value={state.settings.scheduledBackupTime || '21:00'}
                                      onChange={(e) => onUpdate({ scheduledBackupTime: e.target.value })}
                                      className="bg-[var(--background)] border border-[var(--border)] px-4 py-3 rounded-2xl text-xs text-[var(--foreground)] outline-none font-mono cursor-pointer"
                                    />
                                    <select
                                      value={state.settings.scheduledBackupRecurrence || 'daily'}
                                      onChange={(e) => onUpdate({ scheduledBackupRecurrence: e.target.value })}
                                      className="bg-[var(--background)] border border-[var(--border)] px-4 py-3 rounded-2xl text-xs text-[var(--foreground)] font-black uppercase tracking-wider outline-none cursor-pointer"
                                    >
                                       <option value="daily">🕒 Daily Routine</option>
                                       <option value="weekly">📅 Weekly Routine</option>
                                    </select>
                                 </div>
                                 <p className="text-[9px] opacity-40 uppercase leading-snug">
                                    Trigger will monitor actively while the application dashboard console session is active.
                                 </p>
                              </div>
                           </div>

                           <div className="space-y-4 pt-4 border-t border-[var(--border)] bg-[var(--foreground)]/[0.015] p-5 rounded-3xl border border-[var(--border)] bg-[var(--background)]/10">
                              <label className="text-[10px] font-black uppercase tracking-widest text-[var(--foreground)] opacity-60 flex items-center gap-1.5 flex-wrap">
                                 <Cloud size={12} className="text-[var(--primary)]" /> External Cloud Vault Storage Provider
                              </label>
                              
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                 {[
                                   { id: 'firestore_vault', name: 'Firebase Sync Vault', desc: 'Saves securely in Firestore database sync records', badge: 'Active & Cloud' },
                                   { id: 'google_drive', name: 'Google Drive Sync', desc: 'Securely links using Google Workspace OAuth pipeline', badge: 'GCP Certified' },
                                   { id: 'dropbox', name: 'Dropbox Secure Storage', desc: 'Automated webhook uploads to personal safe vault', badge: 'API Webhook' }
                                 ].map((prov) => (
                                   <button
                                     key={prov.id}
                                     onClick={() => onUpdate({ externalStorageProvider: prov.id })}
                                     className={cn(
                                       "flex flex-col text-left gap-2 p-4 rounded-2xl border transition-all cursor-pointer",
                                       (state.settings.externalStorageProvider || 'firestore_vault') === prov.id
                                         ? "border-[var(--primary)] bg-[var(--primary)]/10 shadow-lg text-[var(--foreground)]"
                                         : "border-[var(--border)] bg-[var(--background)] opacity-70 hover:opacity-100 text-[var(--foreground)]"
                                     )}
                                   >
                                      <div className="flex items-center justify-between w-full">
                                         <span className="text-[10px] font-black uppercase tracking-wide">{prov.name}</span>
                                         <span className="text-[7.5px] px-2 py-0.5 rounded-full bg-[var(--primary)]/10 text-[var(--primary)] font-black uppercase">{prov.badge}</span>
                                      </div>
                                      <p className="text-[8.5px] opacity-45 uppercase mt-1 leading-snug tracking-wider">{prov.desc}</p>
                                   </button>
                                 ))}
                              </div>
                           </div>

                           {/* Interactive Tester & Diagnosis Status Console */}
                           <div className="pt-4 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[var(--primary)]/5 p-5 rounded-3xl border border-[var(--primary)]/20">
                              <div className="space-y-1">
                                 <div className="text-[10px] font-black uppercase tracking-wider text-[var(--primary)]">Scheduled Cloud Pipeline Telemetry</div>
                                 <div className="grid grid-cols-2 gap-x-6 gap-y-1 max-w-sm pt-1">
                                    <span className="text-[9px] font-bold opacity-50 uppercase">LAST PIPELINE RUN:</span>
                                    <span className="text-[9px] font-black text-[var(--foreground)] font-mono">{state.settings.lastScheduledBackupTime || 'NEVER'}</span>
                                    
                                    <span className="text-[9px] font-bold opacity-50 uppercase">NEXT PLANNED DISPATCH:</span>
                                    <span className="text-[9px] font-black text-amber-500 font-mono">
                                       TODAY AT {state.settings.scheduledBackupTime || '21:00'} ({state.settings.scheduledBackupRecurrence || 'daily'})
                                    </span>
                                 </div>
                              </div>
                              <Button
                                onClick={onBackup}
                                variant="outline"
                                className="rounded-xl text-[9px] uppercase font-black px-4 py-2 bg-white text-[var(--primary)] hover:bg-white/90 shadow-md cursor-pointer duration-300 transform active:scale-95 border-0 hover:text-[var(--primary)]"
                              >
                                 ⚡ Validate & Test Scheduled Auto-Backup Now
                              </Button>
                           </div>
                        </motion.div>
                     )}
                  </div>

                  <div className="card p-6 rounded-[2rem] border-[var(--border)] bg-[var(--card)] space-y-6 md:col-span-2">
                     <h4 className="text-xs font-black uppercase tracking-widest opacity-40 text-[var(--foreground)]">{t.maintenanceCore}</h4>
                     <div className="flex flex-wrap gap-3">
                        <label className="flex items-center gap-3 rounded-xl py-3 px-6 bg-[var(--background)] border border-[var(--border)] text-[10px] font-black uppercase tracking-widest cursor-pointer hover:border-[var(--primary)] text-[var(--foreground)] transition-all">
                          <Download size={18} /> Import External Data
                          <input type="file" className="hidden" accept=".json" onChange={onImport} />
                        </label>
                        <Button onClick={onClearCache} variant="ghost" className="gap-3 rounded-xl px-6 border border-red-500/10 text-red-500/50 hover:text-red-500">
                          <XCircle size={18} /> <span className="text-[10px] font-black uppercase">Clear Local Cache</span>
                        </Button>
                     </div>
                  </div>
                </div>
              </section>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Global Support & Documentation */}
        <section className="space-y-6 pt-12 border-t border-[var(--border)]">
           <Button 
             variant="outline" 
             onClick={onShowHelp}
             className="w-full h-20 rounded-[2.5rem] border-[var(--border)] bg-[var(--card)] hover:bg-[var(--primary)]/10 hover:border-[var(--primary)] hover:text-[var(--primary)] flex items-center justify-between px-8 group transition-all"
           >
             <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-2xl bg-[var(--background)] text-[var(--foreground)] flex items-center justify-center group-hover:bg-[var(--primary)] group-hover:text-white transition-colors">
                  <HelpCircle size={24} />
                </div>
                <div className="text-left select-none">
                  <p className="font-black uppercase tracking-tighter text-sm text-[var(--foreground)]">{t.help || "Help aur Guide"}</p>
                  <p className="text-[10px] font-bold opacity-40 uppercase text-[var(--foreground)]">Learn pro tricks and data security</p>
                </div>
             </div>
             <ArrowRight size={20} className="opacity-0 group-hover:opacity-100 transition-all -translate-x-4 group-hover:translate-x-0 text-[var(--foreground)]" />
           </Button>
        </section>

        {/* Add Custom API Key Modal */}
        <AnimatePresence>
          {showAddKeyModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="card w-full max-w-md p-6 rounded-[2.5rem] border-[var(--border)] bg-[var(--card)] shadow-2xl space-y-5 relative"
              >
                <div className="flex items-center justify-between border-b border-[var(--border)] pb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-amber-500/20 text-amber-500">
                      <Key size={20} />
                    </div>
                    <div>
                      <h3 className="font-black uppercase tracking-tight text-sm text-[var(--foreground)]">Add Custom Gemini API Key</h3>
                      <p className="text-[10px] opacity-50 font-medium">Use custom quota for Voice Assistant &amp; AI</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowAddKeyModal(false)}
                    className="p-1 rounded-full text-zinc-400 hover:text-white"
                  >
                    <XCircle size={20} />
                  </button>
                </div>

                <form onSubmit={handleAddCustomKey} className="space-y-4">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-wider text-[var(--foreground)] opacity-70 block mb-1">
                      Key Name / Alias
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. My Personal Gemini Key"
                      value={newKeyName}
                      onChange={(e) => setNewKeyName(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-[var(--border)] text-xs font-semibold focus:outline-none focus:border-amber-500 text-[var(--foreground)]"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase tracking-wider text-[var(--foreground)] opacity-70 block mb-1">
                      Gemini API Key <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="password"
                      placeholder="AIzaSy..."
                      value={newKeyValue}
                      onChange={(e) => setNewKeyValue(e.target.value)}
                      required
                      className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-[var(--border)] font-mono text-xs focus:outline-none focus:border-amber-500 text-[var(--foreground)]"
                    />
                    <p className="text-[9px] opacity-50 mt-1.5">
                      💡 Get a free API key from <a href="https://aistudio.google.com" target="_blank" rel="noopener noreferrer" className="text-amber-400 underline">Google AI Studio</a>.
                    </p>
                  </div>

                  {addKeyError && (
                    <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold flex items-center gap-2">
                      <AlertTriangle size={14} />
                      <span>{addKeyError}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-end gap-3 pt-2">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setShowAddKeyModal(false)}
                      className="rounded-full px-5 h-10 text-[11px] uppercase font-bold"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      className="rounded-full px-6 h-10 text-[11px] uppercase font-black bg-amber-500 hover:bg-amber-600 text-slate-950 shadow-lg"
                    >
                      Save &amp; Activate Key
                    </Button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
