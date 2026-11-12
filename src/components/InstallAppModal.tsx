import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Download, 
  X, 
  Share, 
  PlusSquare, 
  CheckCircle2, 
  HardDriveDownload,
  Check,
  Sparkles
} from 'lucide-react';

interface InstallAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  deferredPrompt: any | null;
  onInstalledSuccess: () => void;
}

export const InstallAppModal: React.FC<InstallAppModalProps> = ({
  isOpen,
  onClose,
  deferredPrompt,
  onInstalledSuccess,
}) => {
  const [isIOS, setIsIOS] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [installedSuccess, setInstalledSuccess] = useState(false);

  useEffect(() => {
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIOSDevice = 
      /iphone|ipad|ipod/.test(userAgent) || 
      (window.navigator.platform === 'MacIntel' && window.navigator.maxTouchPoints > 1);
    setIsIOS(isIOSDevice);
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      try {
        setIsInstalling(true);
        await deferredPrompt.prompt();
        const choiceResult = await deferredPrompt.userChoice;
        if (choiceResult && choiceResult.outcome === 'accepted') {
          setInstalledSuccess(true);
          try {
            localStorage.setItem('ts_app_installed', 'true');
          } catch {
            // ignore
          }
          setTimeout(() => {
            onInstalledSuccess();
            onClose();
          }, 1200);
        } else {
          setIsInstalling(false);
        }
      } catch (err) {
        console.warn('Install prompt error:', err);
        setIsInstalling(false);
      }
    }
  };

  const handleManualConfirmInstalled = () => {
    try {
      localStorage.setItem('ts_app_installed', 'true');
    } catch {
      // ignore
    }
    setInstalledSuccess(true);
    setTimeout(() => {
      onInstalledSuccess();
      onClose();
    }, 600);
  };

  const handleDismiss = () => {
    try {
      // 24-hour cooldown so users aren't nagged on every single tab switch
      localStorage.setItem('ts_install_dismissed_until', String(Date.now() + 24 * 60 * 60 * 1000));
    } catch {
      // ignore
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {/* Top Floating Overlay Container */}
      <div 
        className="fixed inset-x-0 top-0 z-[9999] flex justify-center px-3 pt-2.5 sm:pt-4 pointer-events-none"
        style={{
          paddingTop: 'max(10px, env(safe-area-inset-top))'
        }}
      >
        {/* Backdrop for outside click */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={handleDismiss}
          className="fixed inset-0 bg-black/50 backdrop-blur-[2px] pointer-events-auto cursor-pointer"
        />

        {/* Compact, High-Density Mobile Card */}
        <motion.div
          initial={{ y: -40, opacity: 0, scale: 0.96 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: -30, opacity: 0, scale: 0.96 }}
          transition={{ type: 'spring', damping: 25, stiffness: 380 }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-[390px] bg-[#0c1322]/95 backdrop-blur-xl text-white rounded-2xl border border-white/15 shadow-[0_12px_40px_rgba(0,0,0,0.65)] overflow-hidden pointer-events-auto z-10 p-2.5 sm:p-3 flex flex-col gap-2"
        >
          {/* Subtle Top Amber Hairline */}
          <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-amber-500 via-orange-500 to-amber-400" />

          {installedSuccess ? (
            /* Streamlined Success State */
            <div className="py-2 px-1 flex items-center justify-center gap-2.5 text-center">
              <div className="w-7 h-7 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 ring-2 ring-emerald-500/30 animate-bounce">
                <CheckCircle2 size={16} />
              </div>
              <div className="text-left">
                <h4 className="text-xs font-black text-white tracking-tight">App Installed Successfully!</h4>
                <p className="text-[10px] text-white/70">Added to your home screen for quick 1-tap access.</p>
              </div>
            </div>
          ) : (
            <>
              {/* Streamlined Row 1: App Identity + Specs + Close */}
              <div className="flex items-center justify-between gap-2 pt-0.5">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="relative shrink-0">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 p-[1.5px] shadow-sm shadow-amber-500/25 flex items-center justify-center overflow-hidden">
                      <img 
                        src="/pwa-192x192.png" 
                        alt="TS BIZ MANAGER" 
                        className="w-full h-full object-cover rounded-[9px]"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    </div>
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h4 className="text-xs sm:text-[13px] font-black text-white tracking-tight truncate leading-tight">
                        TS BIZ MANAGER
                      </h4>
                      <span className="px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-400 text-[8px] font-black uppercase tracking-wider shrink-0 flex items-center gap-0.5">
                        <Sparkles size={8} />
                        APP
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-300/80 truncate leading-tight mt-0.5">
                      ★ 4.9 • Fast 1-Tap Access • Offline Ready
                    </p>
                  </div>
                </div>

                {/* Close Button */}
                <button
                  type="button"
                  onClick={handleDismiss}
                  aria-label="Close"
                  className="w-6 h-6 rounded-full bg-white/10 hover:bg-white/20 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer select-none active:scale-90 shrink-0"
                >
                  <X size={13} />
                </button>
              </div>

              {/* Row 2: Action Button Prominently Fills the Bottom Area */}
              {isIOS ? (
                /* iOS Safari Compact Step Bar & Prominent Button */
                <div className="space-y-1.5">
                  <div className="rounded-xl bg-blue-500/10 border border-blue-500/25 px-2.5 py-1 flex items-center justify-between text-[10px] text-white/90">
                    <div className="flex items-center gap-1">
                      <span className="w-3.5 h-3.5 rounded-full bg-blue-500 text-white flex items-center justify-center text-[8.5px] font-black shrink-0">1</span>
                      <span>Tap <strong className="text-white inline-flex items-center gap-0.5 font-bold"><Share size={9} className="text-blue-400" /> Share</strong></span>
                    </div>
                    <span className="text-white/40 font-bold">→</span>
                    <div className="flex items-center gap-1">
                      <span className="w-3.5 h-3.5 rounded-full bg-blue-500 text-white flex items-center justify-center text-[8.5px] font-black shrink-0">2</span>
                      <span>Tap <strong className="text-white inline-flex items-center gap-0.5 font-bold"><PlusSquare size={9} className="text-amber-400" /> Add to Home Screen</strong></span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleManualConfirmInstalled}
                    className="w-full py-2.5 px-3 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-black text-xs uppercase tracking-wider shadow-md shadow-blue-500/25 flex items-center justify-center gap-1.5 active:scale-[0.98] transition-all cursor-pointer"
                  >
                    <Check size={13} className="stroke-[2.5]" />
                    <span>I Added it to Home Screen</span>
                  </button>
                </div>
              ) : deferredPrompt ? (
                /* Android / Chromium Prominent 1-Click Action Button */
                <button
                  type="button"
                  onClick={handleInstallClick}
                  disabled={isInstalling}
                  className="w-full py-2.5 px-3.5 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs uppercase tracking-wider shadow-md shadow-amber-500/25 flex items-center justify-center gap-2 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-60"
                >
                  {isInstalling ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                      <span>Installing WebApp...</span>
                    </>
                  ) : (
                    <>
                      <HardDriveDownload size={14} className="stroke-[2.5]" />
                      <span>Download & Install App</span>
                      <span className="text-[9px] font-bold opacity-70 bg-black/15 px-1.5 py-0.5 rounded ml-auto">
                        0 MB • Free
                      </span>
                    </>
                  )}
                </button>
              ) : (
                /* Fallback Action Button for Other Browsers */
                <button
                  type="button"
                  onClick={handleInstallClick}
                  className="w-full py-2.5 px-3.5 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs uppercase tracking-wider shadow-md shadow-amber-500/25 flex items-center justify-center gap-2 active:scale-[0.98] transition-all cursor-pointer"
                >
                  <Download size={14} className="stroke-[2.5]" />
                  <span>Download WebApp</span>
                  <span className="text-[9px] font-bold opacity-70 bg-black/15 px-1.5 py-0.5 rounded ml-auto">
                    0 MB • Free
                  </span>
                </button>
              )}

              {/* Row 3: Micro Space-Saving Footer */}
              <div className="flex items-center justify-between text-[10px] text-slate-400 px-1 pt-0.5">
                <button
                  type="button"
                  onClick={handleDismiss}
                  className="hover:text-white transition-colors cursor-pointer select-none py-0.5"
                >
                  Maybe later
                </button>

                <button
                  type="button"
                  onClick={handleManualConfirmInstalled}
                  className="text-amber-400/80 hover:text-amber-400 font-semibold transition-colors cursor-pointer select-none py-0.5"
                >
                  Already installed?
                </button>
              </div>
            </>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
