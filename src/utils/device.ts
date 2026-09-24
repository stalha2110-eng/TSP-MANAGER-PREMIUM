// Centralized device identification, capability checking, and platform-specific behaviors.
// Follows the principle:
// 1. Detect actual user's device automatically.
// 2. Do not scatter manual userAgent strings throughout the app.
// 3. Keep shared functionality common.
// 4. Support previewing/testing without forcing wrong device behavior permanently.

export type PlatformType = 'ios' | 'android' | 'desktop' | 'unknown';
export type BrowserType = 'safari' | 'chrome' | 'firefox' | 'edge' | 'other';
export type DisplayMode = 'standalone-pwa' | 'browser';

export interface DeviceInfo {
  platform: PlatformType;
  isIOS: boolean;
  isAndroid: boolean;
  isDesktop: boolean;
  browser: BrowserType;
  isSafari: boolean;
  isPWA: boolean;
  hasTouch: boolean;
  supportsWebBluetooth: boolean;
  supportsWebSpeech: boolean;
  supportsVibration: boolean;
  deviceName: string;
}

export const getDeviceId = (): string => {
  if (typeof window === 'undefined') return 'server_device';
  let id = localStorage.getItem('ts_device_id');
  if (!id) {
    id = Math.random().toString(36).substring(2, 11);
    localStorage.setItem('ts_device_id', id);
  }
  return id;
};

export const getDeviceName = (): string => {
  if (typeof navigator === 'undefined') return "Web Browser";
  const ua = navigator.userAgent;
  if (/android/i.test(ua)) return "Android Device";
  if (/iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) return "iOS Device";
  if (/Windows/i.test(ua)) return "Windows PC";
  if (/Macintosh/i.test(ua)) return "MacBook";
  return "Web Browser";
};

/**
 * Detects the real physical platform and runtime capabilities of the current device.
 * Accurately handles iPads reporting as MacIntel by checking maxTouchPoints.
 */
export const detectDevice = (): DeviceInfo => {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return {
      platform: 'desktop',
      isIOS: false,
      isAndroid: false,
      isDesktop: true,
      browser: 'other',
      isSafari: false,
      isPWA: false,
      hasTouch: false,
      supportsWebBluetooth: false,
      supportsWebSpeech: false,
      supportsVibration: false,
      deviceName: "Server / SSR",
    };
  }

  const ua = navigator.userAgent || '';
  const vendor = navigator.vendor || '';

  // iPad on iOS 13+ reports as Macintosh in userAgent, but has touch points
  const isIPadOS = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
  const isIOS = /iPad|iPhone|iPod/.test(ua) || isIPadOS;
  const isAndroid = /android/i.test(ua);
  const isDesktop = !isIOS && !isAndroid;

  let platform: PlatformType = 'unknown';
  if (isIOS) platform = 'ios';
  else if (isAndroid) platform = 'android';
  else if (isDesktop) platform = 'desktop';

  // Browser detection
  const isSafari = /Safari/i.test(ua) && !/Chrome|CriOS|FxiOS|EdgiOS/i.test(ua) && /Apple Computer/i.test(vendor);
  let browser: BrowserType = 'other';
  if (isSafari) browser = 'safari';
  else if (/Chrome|CriOS/i.test(ua)) browser = 'chrome';
  else if (/Firefox|FxiOS/i.test(ua)) browser = 'firefox';
  else if (/Edg|EdgiOS/i.test(ua)) browser = 'edge';

  // PWA standalone display mode detection
  const isPWA = window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as any).standalone === true ||
    document.referrer.includes('android-app://');

  const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  const supportsWebBluetooth = 'bluetooth' in navigator;
  const supportsWebSpeech = 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window;
  const supportsVibration = 'vibrate' in navigator;

  return {
    platform,
    isIOS,
    isAndroid,
    isDesktop,
    browser,
    isSafari,
    isPWA,
    hasTouch,
    supportsWebBluetooth,
    supportsWebSpeech,
    supportsVibration,
    deviceName: getDeviceName(),
  };
};

// Optional preview override for developers / merchants wanting to preview iOS or Android specific behaviors
let previewOverride: PlatformType | null = null;

export const setDevicePreviewOverride = (platform: PlatformType | null) => {
  previewOverride = platform;
  cachedDevice = null; // Invalidate cache so currentDevice reflects the selected preview
};

export const getDevicePreviewOverride = (): PlatformType | null => {
  return previewOverride;
};

// Cached singleton for instant access without re-computing regexes repeatedly
let cachedDevice: DeviceInfo | null = null;
export const currentDevice = (): DeviceInfo => {
  if (!cachedDevice) {
    const detected = detectDevice();
    if (previewOverride && (previewOverride === 'ios' || previewOverride === 'android')) {
      const isIOS = previewOverride === 'ios';
      const isAndroid = previewOverride === 'android';
      cachedDevice = {
        ...detected,
        platform: previewOverride,
        isIOS,
        isAndroid,
        isDesktop: false,
        supportsWebBluetooth: isAndroid,
        supportsVibration: isAndroid,
        deviceName: isIOS ? "iOS Device (Preview)" : "Android Device (Preview)",
      };
    } else {
      cachedDevice = detected;
    }
  }
  return cachedDevice;
};

/**
 * Device Feature Registry:
 * Safe helper to execute or query platform-specific behaviors.
 * Shared/common behaviors execute for all platforms unless restricted.
 */
export const deviceFeatures = {
  /**
   * Determine speech recognition continuous flag based on platform.
   * On iOS Safari, continuous=false prevents WebKit audio-capture timeouts.
   */
  shouldUseContinuousSpeech(): boolean {
    const dev = currentDevice();
    return !dev.isIOS;
  },

  /**
   * Safe haptic feedback: triggers only if hardware and platform support it.
   */
  vibrate(pattern: number | number[]): void {
    const dev = currentDevice();
    if (dev.supportsVibration && typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate(pattern);
      } catch {}
    }
  },

  /**
   * Returns appropriate PWA installation guidance method.
   * On iOS, beforeinstallprompt never fires; manual "Add to Home Screen" instructions are required.
   */
  getInstallMethod(): 'prompt' | 'ios-instructions' | 'unsupported' {
    const dev = currentDevice();
    if (dev.isIOS) {
      return 'ios-instructions';
    }
    return 'prompt';
  },

  /**
   * Returns the best default voice name match for Indian locale on the active platform.
   */
  getPreferredVoiceNames(): string[] {
    const dev = currentDevice();
    if (dev.isIOS) {
      // Apple WebKit Hindi / Indian English voices
      return ['Rishi', 'Neel', 'Lekha', 'hi-IN', 'en-IN'];
    }
    // Android / Chrome / Desktop voices
    return ['Madhav', 'Hemant', 'Ravi', 'hi-IN', 'en-IN'];
  }
};
