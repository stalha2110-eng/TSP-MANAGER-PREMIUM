import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Cloud, RefreshCw, CheckCircle2, ArrowDown, Sparkles, WifiOff, AlertCircle 
} from 'lucide-react';
import { deviceFeatures } from '../utils/device';
import { CloudSyncService, SyncResult } from '../services/cloudSyncService';
import { playFeedbackEvent } from '../services/soundFeedbackService';
import { AppState, AppSettings } from '../types';

interface IOSPullToRefreshProps {
  state: AppState;
  onStateUpdate?: (updater: (prev: AppState) => AppState) => void;
  onSyncComplete?: (result: SyncResult) => void;
}

export const IOSPullToRefresh: React.FC<IOSPullToRefreshProps> = ({
  state,
  onStateUpdate,
  onSyncComplete,
}) => {
  // Only active for iOS / iPhone / iPad users (including Safari PWA "Add to Home Screen" mode)
  // or when explicitly testing in iOS preview mode.
  const isEnabled = deviceFeatures.shouldEnableIOSPullToRefresh();

  const [pullY, setPullY] = useState(0);
  const [status, setStatus] = useState<'idle' | 'pulling' | 'threshold' | 'syncing' | 'update_found' | 'success' | 'offline_warn'>('idle');
  const [statusMessage, setStatusMessage] = useState('');
  const [isStandalonePWA, setIsStandalonePWA] = useState(false);

  const startYRef = useRef(0);
  const startXRef = useRef(0);
  const isTrackingRef = useRef(false);
  const pullYRef = useRef(0);
  const statusRef = useRef(status);
  const hasTriggeredHapticRef = useRef(false);

  statusRef.current = status;
  pullYRef.current = pullY;

  // Detect if running as installed standalone PWA ("Add to Home Screen")
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isStandalone = 
        window.matchMedia('(display-mode: standalone)').matches ||
        (navigator as any).standalone === true ||
        document.referrer.includes('android-app://');
      setIsStandalonePWA(isStandalone);
    }
  }, []);

  const PULL_THRESHOLD = 72; // Pixels required to trigger sync

  const executeSync = useCallback(async () => {
    setStatus('syncing');
    setPullY(60);
    setStatusMessage('Syncing Firestore & checking for updates...');

    try {
      deviceFeatures.vibrate(20);
      try {
        playFeedbackEvent('notification', state.settings);
      } catch {}

      // Execute comprehensive Firestore sync & check for SW updates
      const result = await CloudSyncService.forceSyncWithFirestore(state, onStateUpdate);

      if (onSyncComplete) {
        onSyncComplete(result);
      }

      if (result.hasAppUpdate) {
        setStatus('update_found');
        setStatusMessage('✨ New App Update Available! Reloading...');
        deviceFeatures.vibrate([20, 50, 20]);
        // Allow brief visual feedback, then reload to apply new features
        setTimeout(() => {
          CloudSyncService.reloadApp();
        }, 900);
        return;
      }

      if (!result.isOnline) {
        setStatus('offline_warn');
        setStatusMessage('Offline: Changes kept safe in Local Storage');
        setTimeout(() => {
          setStatus('idle');
          setPullY(0);
        }, 2200);
        return;
      }

      // Success sync
      setStatus('success');
      setStatusMessage('✓ Cloud Synced & App is up-to-date!');
      try {
        playFeedbackEvent('notification', state.settings);
      } catch {}

      setTimeout(() => {
        setStatus('idle');
        setPullY(0);
      }, 1400);

    } catch (err: any) {
      console.warn('[IOSPullToRefresh] Execution error:', err);
      setStatus('offline_warn');
      setStatusMessage('Sync complete (using local database)');
      setTimeout(() => {
        setStatus('idle');
        setPullY(0);
      }, 1500);
    }
  }, [state, onStateUpdate, onSyncComplete]);

  // Touch listener setup specifically designed for WebKit / iOS Safari & PWA container
  useEffect(() => {
    if (!isEnabled || typeof window === 'undefined') return;

    const handleTouchStart = (e: TouchEvent) => {
      if (statusRef.current === 'syncing' || statusRef.current === 'update_found') {
        return;
      }

      // Only initiate pull-to-refresh if the user is scrolled to the very top of the window
      const scrollY = window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0;
      if (scrollY <= 1) {
        isTrackingRef.current = true;
        startYRef.current = e.touches[0].clientY;
        startXRef.current = e.touches[0].clientX;
        hasTriggeredHapticRef.current = false;
      } else {
        isTrackingRef.current = false;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isTrackingRef.current) return;
      if (statusRef.current === 'syncing' || statusRef.current === 'update_found') return;

      const currentY = e.touches[0].clientY;
      const currentX = e.touches[0].clientX;
      const deltaY = currentY - startYRef.current;
      const deltaX = currentX - startXRef.current;

      // Ensure downward pull and not horizontal swipe
      if (deltaY > 4 && Math.abs(deltaY) > Math.abs(deltaX) * 1.2) {
        const scrollY = window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0;
        if (scrollY <= 0) {
          // Damped resistance curve for ultra-smooth iOS feel
          const dampedY = Math.min(115, Math.pow(deltaY, 0.82) * 2.3);
          setPullY(dampedY);

          if (dampedY >= PULL_THRESHOLD) {
            setStatus('threshold');
            if (!hasTriggeredHapticRef.current) {
              deviceFeatures.vibrate(15);
              hasTriggeredHapticRef.current = true;
            }
          } else {
            setStatus('pulling');
          }

          // Prevent native Safari awkward blank rubber-band bounce when pull-to-refresh is active
          if (e.cancelable && dampedY > 12) {
            e.preventDefault();
          }
        }
      } else if (deltaY < 0) {
        // User scrolling down into content
        isTrackingRef.current = false;
        setPullY(0);
        setStatus('idle');
      }
    };

    const handleTouchEnd = () => {
      if (!isTrackingRef.current) return;
      isTrackingRef.current = false;

      if (pullYRef.current >= PULL_THRESHOLD && statusRef.current !== 'syncing') {
        executeSync();
      } else {
        // Snap back to top smoothly
        setPullY(0);
        setStatus('idle');
      }
    };

    const handleTouchCancel = () => {
      isTrackingRef.current = false;
      if (statusRef.current !== 'syncing') {
        setPullY(0);
        setStatus('idle');
      }
    };

    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd, { passive: true });
    window.addEventListener('touchcancel', handleTouchCancel, { passive: true });

    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('touchcancel', handleTouchCancel);
    };
  }, [isEnabled, executeSync]);

  // If not on iOS, return null to avoid any interference with Android/Desktop native gestures
  if (!isEnabled) {
    return null;
  }

  const isVisible = pullY > 5 || status !== 'idle';
  const progressPercent = Math.min(100, Math.round((pullY / PULL_THRESHOLD) * 100));

  return (
    <>
      {/* Dynamic iOS Pull-to-Refresh Floating Indicator */}
      <div 
        className="fixed top-0 left-0 right-0 z-[100000] pointer-events-none flex flex-col items-center justify-start transition-transform duration-100 ease-out"
        style={{
          transform: `translateY(${pullY > 0 ? Math.min(pullY * 0.95, 75) : 0}px)`,
          paddingTop: 'max(10px, env(safe-area-inset-top, 10px))'
        }}
      >
        <AnimatePresence>
          {isVisible && (
            <motion.div
              initial={{ opacity: 0, scale: 0.85, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.85, y: -20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              className="pointer-events-auto"
            >
              <div className="flex items-center gap-3 px-4 py-2.5 rounded-full bg-slate-950/92 dark:bg-black/95 text-white backdrop-blur-xl border border-white/20 shadow-[0_12px_32px_rgba(0,0,0,0.4)] select-none">
                {/* Visual Icon indicator */}
                <div className="relative flex items-center justify-center w-7 h-7 rounded-full bg-white/10 shrink-0">
                  {status === 'pulling' && (
                    <motion.div
                      style={{ rotate: (pullY / PULL_THRESHOLD) * 180 }}
                      className="text-amber-400"
                    >
                      <ArrowDown size={15} strokeWidth={2.5} />
                    </motion.div>
                  )}

                  {status === 'threshold' && (
                    <motion.div 
                      animate={{ scale: [1, 1.25, 1] }} 
                      transition={{ repeat: Infinity, duration: 0.6 }}
                      className="text-emerald-400"
                    >
                      <Cloud size={16} strokeWidth={2.5} />
                    </motion.div>
                  )}

                  {status === 'syncing' && (
                    <RefreshCw size={15} className="animate-spin text-amber-400" />
                  )}

                  {status === 'update_found' && (
                    <Sparkles size={16} className="animate-bounce text-yellow-300" />
                  )}

                  {status === 'success' && (
                    <CheckCircle2 size={16} className="text-emerald-400" />
                  )}

                  {status === 'offline_warn' && (
                    <WifiOff size={15} className="text-rose-400" />
                  )}
                </div>

                {/* Status Text & Information */}
                <div className="flex flex-col text-left pr-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[11.5px] font-black tracking-tight uppercase text-white">
                      {status === 'pulling' && "Pull to Sync & Update"}
                      {status === 'threshold' && "Release to Sync"}
                      {status === 'syncing' && "Syncing Firestore..."}
                      {status === 'update_found' && "Updating App..."}
                      {status === 'success' && "Cloud Synced"}
                      {status === 'offline_warn' && "Offline Mode Active"}
                    </span>
                    {isStandalonePWA && (
                      <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 text-[8px] font-bold uppercase tracking-wider">
                        iOS App
                      </span>
                    )}
                  </div>
                  <span className="text-[9px] font-medium text-slate-300/80 -mt-0.5">
                    {status === 'pulling' && `${progressPercent}% • Pull down to check updates`}
                    {status === 'threshold' && "Release finger to sync Firestore & app"}
                    {status === 'syncing' && statusMessage}
                    {status === 'update_found' && "Reloading to bring new features..."}
                    {status === 'success' && "Latest inventory & features active ✓"}
                    {status === 'offline_warn' && statusMessage}
                  </span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
};
