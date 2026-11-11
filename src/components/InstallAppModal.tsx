import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Download, 
  X, 
  Share, 
  PlusSquare, 
  CheckCircle2, 
  Smartphone, 
  Sparkles, 
  ShieldCheck, 
  Zap, 
  HardDriveDownload,
  ExternalLink,
  ChevronRight
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
    // Detect iOS devices (iPhone, iPad, iPod)
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
            // ignore localStorage quota errors
          }
          setTimeout(() => {
            onInstalledSuccess();
            onClose();
          }, 1800);
        } else {
          setIsInstalling(false);
        }
      } catch (err) {
        console.warn('Install prompt error:', err);
        setIsInstalling(false);
      }
    } else if (isIOS) {
      // iOS doesn't have programmatic prompt - guide already shown
    } else {
      // Browser didn't provide deferredPrompt yet (e.g. desktop Chrome already showed or generic browser)
      // Provide actionable feedback
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
      // Cooldown for 24 hours so users aren't nagged on every single page load
      localStorage.setItem('ts_install_dismissed_until', String(Date.now() + 24 * 60 * 60 * 1000));
    } catch {
      // ignore
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={handleDismiss}
          className="fixed inset-0 bg-black/75 backdrop-blur-md cursor-pointer"
        />

        {/* Modal Card */}
        <motion.div
          initial={{ y: '100%', opacity: 0, scale: 0.95 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: '100%', opacity: 0, scale: 0.95 }}
          transition={{ type: 'spring', damping: 28, stiffness: 320 }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full sm:max-w-md bg-[var(--card-solid,#0f172a)] text-[var(--foreground,#f8fafc)] rounded-t-3xl sm:rounded-3xl border border-white/10 shadow-2xl overflow-hidden z-10 max-h-[92vh] flex flex-col"
          style={{
            paddingBottom: 'max(16px, env(safe-area-inset-bottom))'
          }}
        >
          {/* Top Decorative Amber/Primary Glow Bar */}
          <div className="h-1.5 w-full bg-gradient-to-r from-amber-500 via-orange-500 to-amber-400" />

          {/* Close button */}
          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Close"
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-colors cursor-pointer select-none active:scale-90 z-20"
          >
            <X size={18} />
          </button>

          <div className="p-5 sm:p-6 overflow-y-auto">
            {installedSuccess ? (
              /* Success Celebration State */
              <div className="py-8 text-center flex flex-col items-center justify-center">
                <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-4 ring-8 ring-emerald-500/10 animate-bounce">
                  <CheckCircle2 size={36} />
                </div>
                <h3 className="text-xl font-black text-white tracking-tight mb-2">
                  App Installed Successfully!
                </h3>
                <p className="text-xs text-white/70 max-w-xs leading-relaxed">
                  TS BIZ MANAGER is now on your home screen. You can access it anytime directly without browser bars.
                </p>
              </div>
            ) : (
              <>
                {/* Header with App Logo and Badges */}
                <div className="flex items-center gap-3.5 mb-4">
                  <div className="relative shrink-0">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 p-0.5 shadow-lg shadow-amber-500/20 flex items-center justify-center overflow-hidden">
                      <img 
                        src="/pwa-192x192.png" 
                        alt="TS BIZ MANAGER" 
                        className="w-full h-full object-cover rounded-[14px]"
                        onError={(e) => {
                          // fallback if icon missing
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    </div>
                    <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-[10px] font-black text-slate-950 shadow">
                      <Sparkles size={11} />
                    </span>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-black text-white tracking-tight truncate">
                        TS BIZ MANAGER
                      </h2>
                    </div>
                    <p className="text-[11px] font-semibold text-amber-400/90 tracking-wide uppercase flex items-center gap-1 mt-0.5">
                      <Zap size={11} className="shrink-0" />
                      Official Web App Edition
                    </p>
                    <p className="text-[11px] text-white/60 truncate mt-0.5">
                      Install on Home Screen • Works Offline
                    </p>
                  </div>
                </div>

                {/* Key Benefits Card */}
                <div className="rounded-2xl bg-white/[0.04] border border-white/10 p-3.5 mb-4 space-y-2.5">
                  <div className="flex items-center gap-2.5 text-xs text-white/90">
                    <div className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                      <Smartphone size={13} />
                    </div>
                    <span className="font-medium">
                      <strong className="text-white font-bold">1-Tap Direct Launch:</strong> Open from your phone's home screen like any native app.
                    </span>
                  </div>

                  <div className="flex items-center gap-2.5 text-xs text-white/90">
                    <div className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                      <Zap size={13} />
                    </div>
                    <span className="font-medium">
                      <strong className="text-white font-bold">Full Screen View:</strong> No browser URL bar, tabs, or accidental closures.
                    </span>
                  </div>

                  <div className="flex items-center gap-2.5 text-xs text-white/90">
                    <div className="w-6 h-6 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0">
                      <ShieldCheck size={13} />
                    </div>
                    <span className="font-medium">
                      <strong className="text-white font-bold">0 MB Storage:</strong> Instant download, zero heavy Play Store downloads.
                    </span>
                  </div>
                </div>

                {/* Platform Specific Action / Instruction */}
                {isIOS ? (
                  /* iOS Safari Instruction Flow */
                  <div className="rounded-2xl bg-gradient-to-br from-blue-500/10 to-indigo-500/10 border border-blue-500/30 p-4 mb-4">
                    <div className="flex items-center gap-2 mb-2.5">
                      <div className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-black shrink-0">
                        iOS
                      </div>
                      <h4 className="text-xs font-black text-white tracking-wide uppercase">
                        How to Install on iPhone / iPad:
                      </h4>
                    </div>

                    <ol className="space-y-2.5 text-xs text-white/85">
                      <li className="flex items-start gap-2">
                        <span className="flex h-5 w-5 rounded-full bg-white/10 items-center justify-center text-[10px] font-bold text-white shrink-0 mt-0.5">
                          1
                        </span>
                        <div>
                          Tap the <strong className="text-white inline-flex items-center gap-1 mx-1 px-1.5 py-0.5 rounded bg-white/10 font-bold"><Share size={12} className="text-blue-400" /> Share</strong> button in Safari's bottom toolbar.
                        </div>
                      </li>

                      <li className="flex items-start gap-2">
                        <span className="flex h-5 w-5 rounded-full bg-white/10 items-center justify-center text-[10px] font-bold text-white shrink-0 mt-0.5">
                          2
                        </span>
                        <div>
                          Scroll down and tap <strong className="text-white inline-flex items-center gap-1 mx-1 px-1.5 py-0.5 rounded bg-white/10 font-bold"><PlusSquare size={12} className="text-amber-400" /> Add to Home Screen</strong>.
                        </div>
                      </li>

                      <li className="flex items-start gap-2">
                        <span className="flex h-5 w-5 rounded-full bg-white/10 items-center justify-center text-[10px] font-bold text-white shrink-0 mt-0.5">
                          3
                        </span>
                        <div>
                          Tap <strong className="text-white font-bold text-blue-400">Add</strong> in the top right corner. Done!
                        </div>
                      </li>
                    </ol>

                    <button
                      type="button"
                      onClick={handleManualConfirmInstalled}
                      className="mt-3.5 w-full py-2 px-3 rounded-xl bg-blue-500 hover:bg-blue-600 text-white text-xs font-black tracking-wide transition-all shadow-md active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <CheckCircle2 size={14} />
                      I have Added it to Home Screen
                    </button>
                  </div>
                ) : deferredPrompt ? (
                  /* Android & Chromium 1-Click Install Button */
                  <div className="space-y-2 mb-4">
                    <button
                      type="button"
                      onClick={handleInstallClick}
                      disabled={isInstalling}
                      className="w-full py-3.5 px-5 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-600 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-sm tracking-wide shadow-xl shadow-amber-500/25 flex items-center justify-center gap-2 transition-all active:scale-98 cursor-pointer disabled:opacity-60"
                    >
                      {isInstalling ? (
                        <>
                          <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                          <span>Preparing App...</span>
                        </>
                      ) : (
                        <>
                          <HardDriveDownload size={18} className="animate-bounce" />
                          <span>Download & Install WebApp</span>
                        </>
                      )}
                    </button>
                    <p className="text-[10px] text-center text-white/50">
                      Installs cleanly in 1 click • Completely free & safe
                    </p>
                  </div>
                ) : (
                  /* Fallback when deferredPrompt not fired yet or other browsers */
                  <div className="space-y-3 mb-4">
                    <button
                      type="button"
                      onClick={handleInstallClick}
                      className="w-full py-3.5 px-5 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-600 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-sm tracking-wide shadow-xl shadow-amber-500/25 flex items-center justify-center gap-2 transition-all active:scale-98 cursor-pointer"
                    >
                      <Download size={18} />
                      <span>Download App to Home Screen</span>
                    </button>

                    <div className="rounded-xl bg-white/[0.03] border border-white/10 p-2.5 text-[11px] text-white/70 text-center leading-relaxed">
                      💡 Tip: You can also tap your browser's menu (<strong>⋮</strong> or <strong>Share</strong>) and choose <strong>"Install app"</strong> or <strong>"Add to Home screen"</strong>.
                    </div>
                  </div>
                )}

                {/* Footer buttons */}
                <div className="flex items-center justify-between pt-2 border-t border-white/10">
                  <button
                    type="button"
                    onClick={handleDismiss}
                    className="text-xs font-semibold text-white/60 hover:text-white transition-colors cursor-pointer select-none py-1.5 px-3 rounded-lg hover:bg-white/5"
                  >
                    Maybe Later
                  </button>

                  <button
                    type="button"
                    onClick={handleManualConfirmInstalled}
                    className="text-[11px] font-semibold text-amber-400/80 hover:text-amber-400 transition-colors cursor-pointer select-none py-1.5 px-3 rounded-lg hover:bg-amber-400/10 flex items-center gap-1"
                    title="Click if already installed to prevent showing this popup again"
                  >
                    <span>Already Installed?</span>
                    <ChevronRight size={13} />
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
