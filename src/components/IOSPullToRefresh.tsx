import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Cloud, RefreshCw, CheckCircle2, ArrowDown, Sparkles, WifiOff, AlertCircle,
  Package, Layers, Database, Smartphone, Check, Loader2
} from 'lucide-react';
import { deviceFeatures } from '../utils/device';
import { CloudSyncService, SyncResult } from '../services/cloudSyncService';
import { playFeedbackEvent } from '../services/soundFeedbackService';
import { AppState, Item } from '../types';

interface IOSPullToRefreshProps {
  state: AppState;
  onStateUpdate?: (updater: (prev: AppState) => AppState) => void;
  onSyncComplete?: (result: SyncResult) => void;
  onCatalogRefetched?: (itemsCount: number) => void;
}

export const IOSPullToRefresh: React.FC<IOSPullToRefreshProps> = ({
  state,
  onStateUpdate,
  onSyncComplete,
  onCatalogRefetched,
}) => {
  // Only active for iOS / iPhone / iPad users (including Safari PWA "Add to Home Screen" mode)
  // or when explicitly testing in iOS preview mode.
  const isEnabled = deviceFeatures.shouldEnableIOSPullToRefresh();

  const [pullY, setPullY] = useState(0);
  const [status, setStatus] = useState<'idle' | 'pulling' | 'threshold' | 'syncing' | 'update_found' | 'success' | 'offline_warn'>('idle');
  const [statusMessage, setStatusMessage] = useState('');
  const [catalogItemsCount, setCatalogItemsCount] = useState(state.items?.length || 0);
  const [isStandalonePWA, setIsStandalonePWA] = useState(false);
  const [isSafari, setIsSafari] = useState(false);

  const startYRef = useRef(0);
  const startXRef = useRef(0);
  const isTrackingRef = useRef(false);
  const isSyncingRef = useRef(false);
  const pullYRef = useRef(0);
  const statusRef = useRef(status);
  const hasTriggeredHapticRef = useRef(false);

  statusRef.current = status;
  pullYRef.current = pullY;

  // Detect if running as installed standalone PWA ("Add to Home Screen") or in Safari iOS
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isStandalone = 
        window.matchMedia('(display-mode: standalone)').matches ||
        (navigator as any).standalone === true ||
        document.referrer.includes('android-app://');
      setIsStandalonePWA(isStandalone);

      const dev = deviceFeatures.getDeviceInfo();
      setIsSafari(dev.isSafari || !isStandalone);
    }
  }, []);

  const PULL_THRESHOLD = 72; // Pixels required to trigger sync

  /**
   * Performs an explicit, server-first re-fetch of Firestore data for the inventory catalog,
   * along with a complete database synchronization and software update check.
   * Visual loading feedback state persists completely until all operations finish.
   */
  const executeSync = useCallback(async () => {
    if (isSyncingRef.current) return;

    isSyncingRef.current = true;
    setStatus('syncing');
    setPullY(68);
    setStatusMessage('Connecting to Cloud Firestore database...');

    const startTime = Date.now();

    try {
      deviceFeatures.vibrate(25);
      try {
        playFeedbackEvent('notification', state.settings);
      } catch {}

      // Step 1: Specifically and actively re-fetch Firestore data for the inventory catalog
      setStatusMessage('Re-fetching inventory catalog from Firestore server...');
      const catalogResult = await CloudSyncService.refetchInventoryCatalog(
        state,
        onStateUpdate,
        (stage, count) => {
          if (stage) setStatusMessage(stage);
          if (count !== undefined) setCatalogItemsCount(count);
        }
      );

      setCatalogItemsCount(catalogResult.count);
      if (onCatalogRefetched) {
        onCatalogRefetched(catalogResult.count);
      }

      // Step 2: Comprehensive synchronization for bills, unbilled ledger, and app updates
      setStatusMessage(`Catalog synced (${catalogResult.count} items). Checking app updates...`);
      const syncResult = await CloudSyncService.forceSyncWithFirestore(state, onStateUpdate, {
        skipCatalog: true,
        itemsList: catalogResult.items
      });

      if (onSyncComplete) {
        onSyncComplete(syncResult);
      }

      // Visual persistence guarantee: ensure the visual loading feedback persists
      // long enough for Safari / iOS Home Screen users to clearly observe the progress
      const elapsed = Date.now() - startTime;
      if (elapsed < 800) {
        await new Promise(resolve => setTimeout(resolve, 800 - elapsed));
      }

      // Check for application software updates
      if (syncResult.hasAppUpdate) {
        setStatus('update_found');
        setStatusMessage('✨ New App Update Available! Reloading...');
        deviceFeatures.vibrate([20, 50, 20]);
        setTimeout(() => {
          CloudSyncService.reloadApp();
        }, 900);
        return;
      }

      // Handle offline status
      if (!syncResult.isOnline) {
        setStatus('offline_warn');
        setStatusMessage('Offline: Local inventory catalog preserved safely');
        setTimeout(() => {
          isSyncingRef.current = false;
          setStatus('idle');
          setPullY(0);
        }, 2200);
        return;
      }

      // Sync completed successfully
      setStatus('success');
      setStatusMessage(`✓ ${catalogResult.count} Catalog Items Freshly Synced`);
      deviceFeatures.vibrate([15, 35, 15]);
      try {
        playFeedbackEvent('notification', state.settings);
      } catch {}

      // Keep success state visible for 1.4s so the merchant can read the confirmation
      setTimeout(() => {
        isSyncingRef.current = false;
        setStatus('idle');
        setPullY(0);
      }, 1400);

    } catch (err: any) {
      console.warn('[IOSPullToRefresh] Execution error:', err);
      setStatus('offline_warn');
      setStatusMessage('Catalog synchronized with local storage');
      setTimeout(() => {
        isSyncingRef.current = false;
        setStatus('idle');
        setPullY(0);
      }, 1500);
    }
  }, [state, onStateUpdate, onSyncComplete, onCatalogRefetched]);

  // Touch listener setup specifically designed for WebKit / iOS Safari & Home Screen WebClip container
  useEffect(() => {
    if (!isEnabled || typeof window === 'undefined') return;

    const handleTouchStart = (e: TouchEvent) => {
      // While syncing or updating, do not allow gesture interference
      if (isSyncingRef.current || statusRef.current === 'syncing' || statusRef.current === 'update_found') {
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
      if (isSyncingRef.current || statusRef.current === 'syncing' || statusRef.current === 'update_found') return;

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

      // If already syncing, preserve the visual loading feedback state
      if (isSyncingRef.current) return;

      if (pullYRef.current >= PULL_THRESHOLD) {
        executeSync();
      } else {
        // Snap back to top smoothly
        setPullY(0);
        setStatus('idle');
      }
    };

    const handleTouchCancel = () => {
      isTrackingRef.current = false;
      if (!isSyncingRef.current) {
        setPullY(0);
        setStatus('idle');
      }
    };

    // Optional programmatic trigger listener
    const handleCustomTrigger = () => {
      executeSync();
    };

    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd, { passive: true });
    window.addEventListener('touchcancel', handleTouchCancel, { passive: true });
    window.addEventListener('trigger-ios-pull-to-refresh', handleCustomTrigger);

    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('touchcancel', handleTouchCancel);
      window.removeEventListener('trigger-ios-pull-to-refresh', handleCustomTrigger);
    };
  }, [isEnabled, executeSync]);

  // If not on iOS, return null to avoid any interference with Android/Desktop native gestures
  if (!isEnabled) {
    return null;
  }

  const isVisible = pullY > 5 || status !== 'idle' || isSyncingRef.current;
  const progressPercent = Math.min(100, Math.round((pullY / PULL_THRESHOLD) * 100));

  return (
    <>
      {/* Dynamic iOS Pull-to-Refresh & Inventory Catalog Re-fetch Floating Indicator */}
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
              className="pointer-events-auto max-w-[94vw]"
            >
              <div className="relative overflow-hidden flex flex-col gap-2 px-4 py-2.5 rounded-3xl bg-slate-950/95 dark:bg-black/95 text-white backdrop-blur-2xl border border-white/20 shadow-[0_16px_40px_rgba(0,0,0,0.5)] select-none min-w-[290px]">
                {/* Main Row: Status Icon + Title + Platform Badge */}
                <div className="flex items-center gap-3">
                  
                  {/* Visual Status Icon */}
                  <div className="relative flex items-center justify-center w-8 h-8 rounded-full bg-white/10 shrink-0">
                    {status === 'pulling' && (
                      <motion.div
                        style={{ rotate: (pullY / PULL_THRESHOLD) * 180 }}
                        className="text-amber-400"
                      >
                        <ArrowDown size={16} strokeWidth={2.5} />
                      </motion.div>
                    )}

                    {status === 'threshold' && (
                      <motion.div 
                        animate={{ scale: [1, 1.22, 1] }} 
                        transition={{ repeat: Infinity, duration: 0.5 }}
                        className="text-emerald-400"
                      >
                        <Package size={17} strokeWidth={2.5} />
                      </motion.div>
                    )}

                    {status === 'syncing' && (
                      <div className="relative flex items-center justify-center">
                        <RefreshCw size={17} className="animate-spin text-amber-400" />
                        <Package size={8} className="absolute text-white animate-pulse" />
                      </div>
                    )}

                    {status === 'update_found' && (
                      <Sparkles size={17} className="animate-bounce text-yellow-300" />
                    )}

                    {status === 'success' && (
                      <CheckCircle2 size={17} className="text-emerald-400" />
                    )}

                    {status === 'offline_warn' && (
                      <WifiOff size={16} className="text-rose-400" />
                    )}
                  </div>

                  {/* Status Text & Information */}
                  <div className="flex flex-col text-left flex-1 min-w-0 pr-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11.5px] font-black tracking-tight uppercase text-white truncate">
                        {status === 'pulling' && "Pull to Refresh Catalog"}
                        {status === 'threshold' && "Release to Sync Catalog"}
                        {status === 'syncing' && "Re-fetching Inventory Catalog"}
                        {status === 'update_found' && "App Update Available"}
                        {status === 'success' && "Catalog Synchronized"}
                        {status === 'offline_warn' && "Offline Mode Active"}
                      </span>

                      {/* Targeted Safari / iOS Home Screen PWA pill badge */}
                      {isStandalonePWA ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[7.5px] font-mono font-black uppercase tracking-wider shrink-0">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          iOS Home Screen
                        </span>
                      ) : isSafari ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/30 text-[7.5px] font-mono font-black uppercase tracking-wider shrink-0">
                          <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse" />
                          Safari Web App
                        </span>
                      ) : null}
                    </div>

                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[9.5px] font-medium text-slate-300/90 truncate">
                        {status === 'pulling' && `${progressPercent}% • Pull down to query Firestore server`}
                        {status === 'threshold' && "Release finger to re-fetch inventory catalog"}
                        {status === 'syncing' && (statusMessage || "Connecting to Firestore & re-fetching items...")}
                        {status === 'update_found' && "Reloading Safari Home Screen Web App..."}
                        {status === 'success' && (statusMessage || "Latest items & prices active in inventory ✓")}
                        {status === 'offline_warn' && statusMessage}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Persistent Visual Activity Shimmer Bar when Syncing (Targeting Safari/iOS Home Screen) */}
                {status === 'syncing' && (
                  <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden mt-0.5">
                    <motion.div 
                      className="h-full bg-gradient-to-r from-amber-400 via-emerald-400 to-indigo-400 rounded-full"
                      animate={{
                        x: ['-100%', '100%']
                      }}
                      transition={{
                        repeat: Infinity,
                        duration: 1.2,
                        ease: "linear"
                      }}
                      style={{ width: '60%' }}
                    />
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
};
