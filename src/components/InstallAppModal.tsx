import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Download, 
  X, 
  Share, 
  PlusSquare, 
  CheckCircle2, 
  Smartphone, 
  Zap, 
  HardDriveDownload,
  ShieldCheck,
  Check
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
          }, 1500);
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
    }, 800);
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
      <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-3 sm:p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={handleDismiss}
          className="fixed inset-0 bg-black/75 backdrop-blur-sm cursor-pointer"
        />

        {/* Short & Professional Compact Modal Card */}
        <motion.div
          initial={{ y: 40, opacity: 0, scale: 0.96 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 40, opacity: 0, scale: 0.96 }}
          transition={{ type: 'spring', damping: 26, stiffness: 340 }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-sm bg-[#0d1527] text-white rounded-3xl border border-white/15 shadow-2xl overflow-hidden z-10 flex flex-col"
          style={{
            paddingBottom: 'max(12px, env(safe-area-inset-bottom))'
          }}
        >
          {/* Subtle top accent gradient */}
          <div className="h-1 w-full bg-gradient-to-r from-amber-500 via-orange-500 to-amber-400" />

          {/* Close Button */}
          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Close"
            className="absolute top-3.5 right-3.5 p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-colors cursor-pointer select-none active:scale-90 z-20"
          >
            <X size={15} />
          </button>

          <div className="p-4 sm:p-5">
            {installedSuccess ? (
              /* Success State */
              <div className="py-5 text-center flex flex-col items-center justify-center">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-2.5 ring-4 ring-emerald-500/10 animate-bounce">
                  <CheckCircle2 size={26} />
                </div>
                <h3 className="text-base font-black text-white tracking-tight">
                  App Installed Successfully!
                </h3>
                <p className="text-[11px] text-white/70 mt-1 max-w-[240px]">
                  TS BIZ MANAGER is now on your home screen for quick 1-tap access.
                </p>
              </div>
            ) : (
              <>
                {/* Header: App Icon + Title + Version */}
                <div className="flex items-center gap-3 mb-3 pr-6">
                  <div className="relative shrink-0">
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 p-0.5 shadow-md shadow-amber-500/20 flex items-center justify-center overflow-hidden">
                      <img 
                        src="/pwa-192x192.png" 
                        alt="TS BIZ MANAGER" 
                        className="w-full h-full object-cover rounded-[10px]"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    </div>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <h3 className="text-sm font-black text-white tracking-tight truncate">
                        TS BIZ MANAGER
                      </h3>
                      <span className="px-1.5 py-0.5 rounded-md bg-amber-500/20 text-amber-400 text-[8px] font-black uppercase tracking-wider">
                        WEB APP
                      </span>
                    </div>
                    <p className="text-[11px] text-white/60 truncate mt-0.5">
                      Add to your Home Screen
                    </p>
                  </div>
                </div>

                {/* Compact Feature Pills - Efficient Space Utilization */}
                <div className="grid grid-cols-3 gap-1.5 mb-3.5">
                  <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/[0.05] border border-white/5 text-[10px] text-white/80 font-medium truncate">
                    <Zap size={11} className="text-amber-400 shrink-0" />
                    <span className="truncate">1-Tap Open</span>
                  </div>
                  <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/[0.05] border border-white/5 text-[10px] text-white/80 font-medium truncate">
                    <Smartphone size={11} className="text-emerald-400 shrink-0" />
                    <span className="truncate">Full Screen</span>
                  </div>
                  <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/[0.05] border border-white/5 text-[10px] text-white/80 font-medium truncate">
                    <ShieldCheck size={11} className="text-cyan-400 shrink-0" />
                    <span className="truncate">0 MB Space</span>
                  </div>
                </div>

                {/* Platform Specific Action */}
                {isIOS ? (
                  /* Compact iOS Safari 2-Step Guide */
                  <div className="rounded-xl bg-blue-500/10 border border-blue-500/20 p-2.5 mb-3 space-y-1.5">
                    <div className="flex items-center gap-2 text-[11px] text-white/90">
                      <span className="w-4 h-4 rounded-full bg-blue-500 text-white flex items-center justify-center text-[9px] font-black shrink-0">1</span>
                      <span>Tap <strong className="text-white inline-flex items-center gap-0.5 px-1 rounded bg-white/10 font-bold"><Share size={10} className="text-blue-400" /> Share</strong> in Safari toolbar</span>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-white/90">
                      <span className="w-4 h-4 rounded-full bg-blue-500 text-white flex items-center justify-center text-[9px] font-black shrink-0">2</span>
                      <span>Scroll & tap <strong className="text-white inline-flex items-center gap-0.5 px-1 rounded bg-white/10 font-bold"><PlusSquare size={10} className="text-amber-400" /> Add to Home Screen</strong></span>
                    </div>
                    <button
                      type="button"
                      onClick={handleManualConfirmInstalled}
                      className="mt-1 w-full py-1.5 px-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white text-[11px] font-bold tracking-wide transition-all active:scale-95 flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Check size={12} />
                      I Added it to Home Screen
                    </button>
                  </div>
                ) : deferredPrompt ? (
                  /* Android & Chromium 1-Click Action Button */
                  <div className="mb-3">
                    <button
                      type="button"
                      onClick={handleInstallClick}
                      disabled={isInstalling}
                      className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs tracking-wide shadow-lg shadow-amber-500/20 flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer disabled:opacity-60"
                    >
                      {isInstalling ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                          <span>Installing App...</span>
                        </>
                      ) : (
                        <>
                          <HardDriveDownload size={15} />
                          <span>Download & Install App</span>
                        </>
                      )}
                    </button>
                  </div>
                ) : (
                  /* Standard Browser Fallback */
                  <div className="space-y-1.5 mb-3">
                    <button
                      type="button"
                      onClick={handleInstallClick}
                      className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs tracking-wide shadow-lg shadow-amber-500/20 flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer"
                    >
                      <Download size={15} />
                      <span>Download App</span>
                    </button>
                    <p className="text-[10px] text-center text-white/50">
                      Or tap browser menu (⋮) $\rightarrow$ "Install app"
                    </p>
                  </div>
                )}

                {/* Minimal Footer */}
                <div className="flex items-center justify-between pt-2 border-t border-white/10 text-[11px]">
                  <button
                    type="button"
                    onClick={handleDismiss}
                    className="text-white/50 hover:text-white transition-colors cursor-pointer select-none py-1"
                  >
                    Maybe Later
                  </button>

                  <button
                    type="button"
                    onClick={handleManualConfirmInstalled}
                    className="text-amber-400/70 hover:text-amber-400 font-medium transition-colors cursor-pointer select-none py-1"
                  >
                    Already Installed?
                  </button>
                </div>
              </>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
