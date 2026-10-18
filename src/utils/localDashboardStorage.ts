/**
 * Local Device Storage for Dashboard Cards & Dashboard Settings.
 * Selected dashboard cards and card configurations are stored strictly in browser localStorage
 * and NEVER synchronized to or overwritten by Firestore. This eliminates network delay,
 * prevents remote overwriting, and guarantees instant 0ms response on mobile & desktop.
 */

import { AppSettings } from '../types';
import { INITIAL_SETTINGS } from '../constants/initialState';

export const LOCAL_DASHBOARD_CARDS_KEY = 'price_manager_local_dashboard_cards';

export const DASHBOARD_LOCAL_KEYS = [
  'dashboardCards',
  'dashboardCardsConfig',
  'dashboardCardsVersion',
  'dashboardProfiles',
  'activeDashboardProfile',
  'dashboardMode',
  'dashboardAutoHideEmptyCards',
  'dashboardPriorityHighlightEffects',
  'dashboardShowRecentActivity',
  'dashboardShowBusinessHealth',
  'dashboardShowPrinterStatus',
  'dashboardShowCloudSync',
  'dashboardShowBackupStatus',
  'dashboardShowBusinessJourney',
  'dashboardShowGoalsProgress',
  'dashboardEnableAnimations',
  'dashboardSmoothCardMovement',
  'bizHubCardsOrder'
] as const;

export type DashboardLocalKey = typeof DASHBOARD_LOCAL_KEYS[number];

/**
 * Check if a given settings key is strictly local to this device
 */
export const isDashboardLocalKey = (key: string): boolean => {
  return (DASHBOARD_LOCAL_KEYS as readonly string[]).includes(key);
};

/**
 * Check if an update object contains ONLY dashboard local keys.
 * If so, we do NOT need any Firestore network call.
 */
export const isOnlyDashboardUpdate = (updates: Record<string, any>): boolean => {
  const keys = Object.keys(updates);
  if (keys.length === 0) return true;
  return keys.every(isDashboardLocalKey);
};

/**
 * Extract and remove all dashboard card / local layout keys from an object
 * before sending to Firestore.
 */
export const stripDashboardSettingsFromCloud = <T extends Record<string, any>>(obj: T): Partial<T> => {
  if (!obj || typeof obj !== 'object') return obj;
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (!isDashboardLocalKey(key)) {
      result[key] = value;
    }
  }
  return result as Partial<T>;
};

/**
 * Get current dashboard card settings strictly from local device storage.
 */
export const getLocalDashboardStorage = (): Partial<AppSettings> => {
  let result: Partial<AppSettings> = {};

  try {
    const raw = localStorage.getItem(LOCAL_DASHBOARD_CARDS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        result = parsed;
      }
    }
  } catch (e) {
    console.warn("Failed to parse local dashboard cards storage", e);
  }

  // Fallback to checking price_manager_settings in localStorage if not found
  if (!result.dashboardCards || !Array.isArray(result.dashboardCards) || result.dashboardCards.length === 0) {
    try {
      const rawSettings = localStorage.getItem('price_manager_settings');
      if (rawSettings) {
        const parsed = JSON.parse(rawSettings);
        if (parsed && typeof parsed === 'object') {
          for (const k of DASHBOARD_LOCAL_KEYS) {
            if (parsed[k] !== undefined && (result as Record<string, any>)[k] === undefined) {
              (result as Record<string, any>)[k] = parsed[k];
            }
          }
        }
      }
    } catch {
      // ignore
    }
  }

  // Ensure all 14 standard cards are represented in dashboardCards
  const initialCards = INITIAL_SETTINGS.dashboardCards || [];
  if (!result.dashboardCards || !Array.isArray(result.dashboardCards) || result.dashboardCards.length === 0) {
    result.dashboardCards = [...initialCards];
  } else {
    const existingIds = new Set(result.dashboardCards.map((c: any) => c.id));
    const merged = [...result.dashboardCards];
    initialCards.forEach(ic => {
      if (!existingIds.has(ic.id)) {
        merged.push({ ...ic });
      }
    });
    result.dashboardCards = merged;
  }

  // Ensure all 14 standard cards are represented in dashboardCardsConfig
  const initialConfig = INITIAL_SETTINGS.dashboardCardsConfig || [];
  if (!result.dashboardCardsConfig || !Array.isArray(result.dashboardCardsConfig) || result.dashboardCardsConfig.length === 0) {
    result.dashboardCardsConfig = [...initialConfig];
  } else {
    const existingCfgIds = new Set(result.dashboardCardsConfig.map((c: any) => c.id));
    const mergedConfig = [...result.dashboardCardsConfig];
    initialConfig.forEach(ic => {
      if (!existingCfgIds.has(ic.id)) {
        mergedConfig.push({ ...ic });
      }
    });
    result.dashboardCardsConfig = mergedConfig;
  }

  result.dashboardCardsVersion = 2;
  result.dashboardMode = result.dashboardMode || INITIAL_SETTINGS.dashboardMode || 'hybrid';
  result.dashboardAutoHideEmptyCards = result.dashboardAutoHideEmptyCards ?? false;

  return result;
};

/**
 * Synchronously persist dashboard card updates to localStorage.
 */
export const saveLocalDashboardStorage = (updates: Partial<AppSettings>): void => {
  try {
    const current = getLocalDashboardStorage();
    const updated: Record<string, any> = { ...current };

    for (const key of DASHBOARD_LOCAL_KEYS) {
      if ((updates as Record<string, any>)[key] !== undefined) {
        updated[key] = (updates as Record<string, any>)[key];
      }
    }

    // Always keep dashboardCardsVersion at 2
    if (!updated.dashboardCardsVersion || updated.dashboardCardsVersion < 2) {
      updated.dashboardCardsVersion = 2;
    }

    localStorage.setItem(LOCAL_DASHBOARD_CARDS_KEY, JSON.stringify(updated));

    // Also update price_manager_settings in localStorage synchronously
    try {
      const rawSettings = localStorage.getItem('price_manager_settings');
      if (rawSettings) {
        const parsed = JSON.parse(rawSettings);
        if (parsed && typeof parsed === 'object') {
          const merged = { ...parsed, ...updated };
          localStorage.setItem('price_manager_settings', JSON.stringify(merged));
        }
      }
    } catch {
      // ignore
    }
  } catch (e) {
    console.warn("Failed to save dashboard cards to localStorage", e);
  }
};

/**
 * Merge incoming cloud Firestore settings into local settings, ensuring
 * that local dashboard card selections are NEVER overwritten by cloud data.
 */
export const mergeCloudSettingsWithLocal = (
  cloudSettings: Partial<AppSettings>,
  currentLocalSettings: AppSettings
): AppSettings => {
  const cleanCloud = stripDashboardSettingsFromCloud(cloudSettings);
  const localDashboard = getLocalDashboardStorage();

  return {
    ...currentLocalSettings,
    ...cleanCloud,
    // Ensure dashboard cards & preferences strictly come from local device storage
    dashboardCards: localDashboard.dashboardCards || currentLocalSettings.dashboardCards || INITIAL_SETTINGS.dashboardCards,
    dashboardCardsConfig: localDashboard.dashboardCardsConfig || currentLocalSettings.dashboardCardsConfig || INITIAL_SETTINGS.dashboardCardsConfig,
    dashboardCardsVersion: 2,
    dashboardProfiles: localDashboard.dashboardProfiles || currentLocalSettings.dashboardProfiles,
    activeDashboardProfile: localDashboard.activeDashboardProfile || currentLocalSettings.activeDashboardProfile,
    dashboardMode: localDashboard.dashboardMode || currentLocalSettings.dashboardMode || 'hybrid',
    dashboardAutoHideEmptyCards: localDashboard.dashboardAutoHideEmptyCards ?? currentLocalSettings.dashboardAutoHideEmptyCards ?? false,
    dashboardPriorityHighlightEffects: localDashboard.dashboardPriorityHighlightEffects ?? currentLocalSettings.dashboardPriorityHighlightEffects ?? true,
    dashboardShowRecentActivity: localDashboard.dashboardShowRecentActivity ?? currentLocalSettings.dashboardShowRecentActivity ?? true,
    dashboardShowBusinessHealth: localDashboard.dashboardShowBusinessHealth ?? currentLocalSettings.dashboardShowBusinessHealth ?? true,
    dashboardShowPrinterStatus: localDashboard.dashboardShowPrinterStatus ?? currentLocalSettings.dashboardShowPrinterStatus ?? true,
    dashboardShowCloudSync: localDashboard.dashboardShowCloudSync ?? currentLocalSettings.dashboardShowCloudSync ?? true,
    dashboardShowBackupStatus: localDashboard.dashboardShowBackupStatus ?? currentLocalSettings.dashboardShowBackupStatus ?? true,
    dashboardShowBusinessJourney: localDashboard.dashboardShowBusinessJourney ?? currentLocalSettings.dashboardShowBusinessJourney ?? true,
    dashboardShowGoalsProgress: localDashboard.dashboardShowGoalsProgress ?? currentLocalSettings.dashboardShowGoalsProgress ?? true,
    dashboardEnableAnimations: localDashboard.dashboardEnableAnimations ?? currentLocalSettings.dashboardEnableAnimations ?? true,
    dashboardSmoothCardMovement: localDashboard.dashboardSmoothCardMovement ?? currentLocalSettings.dashboardSmoothCardMovement ?? true,
    bizHubCardsOrder: localDashboard.bizHubCardsOrder || currentLocalSettings.bizHubCardsOrder
  };
};
