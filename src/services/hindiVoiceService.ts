// Service for Hindi Voice Narration across Onboarding Tutorials and Retail Sound Feedback

import { AppSettings } from '../types';

let isSpeechMuted = false;
let isVoiceAssistantSuspended = false;
let activeConfirmationTimer: any = null;

// Check localStorage for saved audio preference
if (typeof window !== 'undefined') {
  try {
    const saved = localStorage.getItem('onboarding_voice_muted');
    if (saved !== null) {
      isSpeechMuted = saved === 'true';
    }
  } catch (e) {
    // Ignore storage errors
  }

  // Pre-load voices on startup if supported
  if ('speechSynthesis' in window) {
    try {
      window.speechSynthesis.getVoices();
      if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = () => {
          window.speechSynthesis.getVoices();
        };
      }
    } catch (e) {
      // Ignore
    }
  }
}

export function isVoiceMuted(): boolean {
  return isSpeechMuted;
}

export function setVoiceMuted(muted: boolean): void {
  isSpeechMuted = muted;
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('onboarding_voice_muted', String(muted));
      if (muted && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    } catch (e) {
      // Ignore
    }
  }
}

/**
 * Suspends or resumes all background TTS voice confirmations
 * while Voice Product Assistant or microphone recording is active.
 */
export function setVoiceAssistantActive(active: boolean): void {
  isVoiceAssistantSuspended = active;
  if (active) {
    stopHindiSpeech();
  }
}

export function stopHindiSpeech(): void {
  if (activeConfirmationTimer) {
    clearTimeout(activeConfirmationTimer);
    activeConfirmationTimer = null;
  }
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }
      window.speechSynthesis.cancel();
    } catch (e) {
      console.warn('SpeechSynthesis cancel error:', e);
    }
  }
}

export function isHindiSpeaking(): boolean {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    return window.speechSynthesis.speaking;
  }
  return false;
}

/**
 * Finds the optimal voice for Hindi / Indic speech synthesis
 */
export function getBestHindiVoice(): SpeechSynthesisVoice | null {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null;
  const voices = window.speechSynthesis.getVoices();
  if (!voices || voices.length === 0) return null;

  // 1. Exact hi-IN match
  let v = voices.find(v => v.lang === 'hi-IN' || v.lang === 'hi_IN');
  if (v) return v;

  // 2. Starts with hi or contains Hindi in name
  v = voices.find(v => v.lang.toLowerCase().startsWith('hi') || v.name.toLowerCase().includes('hindi') || v.name.toLowerCase().includes('lekha') || v.name.toLowerCase().includes('kalpana') || v.name.toLowerCase().includes('neerja'));
  if (v) return v;

  // 3. Indian English / Indic phoneme engine (speaks Hindi terms cleanly on devices without dedicated Hindi pack)
  v = voices.find(v => v.lang === 'en-IN' || v.lang === 'en_IN' || v.name.toLowerCase().includes('india') || v.name.toLowerCase().includes('ravi'));
  if (v) return v;

  // 4. Default voice
  return voices.find(v => v.default) || voices[0] || null;
}

/**
 * Speaks the provided Hindi text using browser's SpeechSynthesis API (for onboarding tutorials).
 */
export function speakHindi(
  text: string, 
  onStart?: () => void, 
  onEnd?: () => void
): void {
  if (isSpeechMuted) return;
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

  try {
    window.speechSynthesis.cancel();

    // Clean text of non-readable symbols
    const cleanText = text
      .replace(/[#*`_~]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (!cleanText) return;

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = 'hi-IN';
    utterance.rate = 0.92; // Clear, comfortable cadence for retail merchants
    utterance.pitch = 1.0;

    const hindiVoice = getBestHindiVoice();
    if (hindiVoice) {
      utterance.voice = hindiVoice;
    }

    if (onStart) {
      utterance.onstart = onStart;
    }

    utterance.onend = () => {
      if (onEnd) onEnd();
    };

    utterance.onerror = (e) => {
      // Audio interrupts are expected on rapid next clicks
      if (e.error !== 'interrupted' && e.error !== 'canceled') {
        console.warn('SpeechSynthesis playback issue:', e.error);
      }
      if (onEnd) onEnd();
    };

    window.speechSynthesis.speak(utterance);
  } catch (err) {
    console.warn('Speech synthesis failed:', err);
    if (onEnd) onEnd();
  }
}

/**
 * Speaks a Hindi voice audio confirmation for POS actions (item added, bill generated, bill printed).
 * Respects overall volume and sound settings.
 */
export function speakHindiConfirmation(
  text: string,
  settings?: Partial<AppSettings>,
  options?: { rate?: number; pitch?: number; delay?: number }
): void {
  if (isVoiceAssistantSuspended || isSpeechMuted) return;
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

  if (settings) {
    const mode = settings.soundFeedbackMode || 'vibrate_sound';
    if (mode === 'silent' || mode === 'vibrate_only') return;
    if (settings.soundHindiVoiceEnabled === false) return;
  }

  if (activeConfirmationTimer) {
    clearTimeout(activeConfirmationTimer);
    activeConfirmationTimer = null;
  }

  const delayMs = options?.delay ?? 90;

  activeConfirmationTimer = setTimeout(() => {
    activeConfirmationTimer = null;
    if (isVoiceAssistantSuspended || isSpeechMuted) return;

    try {
      window.speechSynthesis.cancel();

      // Clean text of non-readable markdown or symbols
      const cleanText = text
        .replace(/[#*`_~₹]/g, '')
        .replace(/\s+/g, ' ')
        .trim();

      if (!cleanText) return;

      const isEnglish = settings?.language === 'en';
      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.lang = isEnglish ? 'en-IN' : 'hi-IN';
      utterance.rate = options?.rate ?? 0.96; // Lively and clear retail feedback
      utterance.pitch = options?.pitch ?? 1.02;

      // Adjust volume
      if (settings?.soundOverallVolume !== undefined) {
        utterance.volume = Math.max(0.1, Math.min(1.0, (settings.soundOverallVolume / 100)));
      }

      const voice = isEnglish ? null : getBestHindiVoice();
      if (voice) {
        utterance.voice = voice;
      }

      utterance.onerror = (e) => {
        if (e.error !== 'interrupted' && e.error !== 'canceled') {
          console.warn('Hindi TTS SpeechSynthesis error:', e.error);
        }
      };

      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.warn('Hindi voice confirmation speech failed:', err);
    }
  }, delayMs);
}

/**
 * Speaks confirmation when an item is added to the cart or catalog.
 * Mentions product name with added quantity (e.g. "Gravy Masala 1kg", "Chai Patti 500gm")
 * without saying "जोड़ा गया" ("joda gya").
 */
export function speakItemAddedConfirmation(
  itemName?: string,
  settings?: Partial<AppSettings>,
  quantity?: number,
  unit?: string
): void {
  if (isVoiceAssistantSuspended || isSpeechMuted) return;
  
  // Guard: If item name is missing, empty, or whitespace, ignore
  if (!itemName || !itemName.trim()) {
    return;
  }

  // Clean item name (remove extra slashes or packaging notes)
  const cleanName = itemName.split('/')[0].split('(')[0].trim();
  if (!cleanName) return;

  // Format quantity & unit
  let qtyUnitText = '';
  if (quantity !== undefined && quantity !== null && !isNaN(quantity) && quantity > 0) {
    const formattedQty = quantity % 1 === 0 ? String(quantity) : Number(quantity.toFixed(2)).toString();
    const rawUnit = (unit || '').trim().toLowerCase();
    
    let displayUnit = '';
    if (rawUnit === 'kg' || rawUnit === 'kilo' || rawUnit === 'kilogram') {
      displayUnit = 'kg';
    } else if (rawUnit === 'gm' || rawUnit === 'g' || rawUnit === 'gram' || rawUnit === 'grams') {
      displayUnit = 'gm';
    } else if (rawUnit === 'ltr' || rawUnit === 'l' || rawUnit === 'litre' || rawUnit === 'liter') {
      displayUnit = 'litre';
    } else if (rawUnit === 'pkt' || rawUnit === 'packet' || rawUnit === 'pack') {
      displayUnit = 'packet';
    } else if (rawUnit === 'pcs' || rawUnit === 'pc' || rawUnit === 'piece' || rawUnit === 'pieces') {
      displayUnit = 'piece';
    } else if (rawUnit === 'box' || rawUnit === 'boxes') {
      displayUnit = 'box';
    } else if (rawUnit === 'dozen' || rawUnit === 'darjan') {
      displayUnit = 'dozen';
    } else if (rawUnit) {
      displayUnit = rawUnit;
    } else {
      displayUnit = 'piece';
    }

    // Check if cleanName already ends with this qty/unit (to avoid repeating e.g. "Gravy Masala 1kg 1kg")
    const lowerName = cleanName.toLowerCase();
    const compactTarget = `${formattedQty}${displayUnit}`.toLowerCase();
    const spacedTarget = `${formattedQty} ${displayUnit}`.toLowerCase();
    if (!lowerName.endsWith(compactTarget) && !lowerName.endsWith(spacedTarget)) {
      qtyUnitText = ` ${formattedQty} ${displayUnit}`;
    }
  }

  const text = `${cleanName}${qtyUnitText}`.trim();
  speakHindiConfirmation(text, settings, { delay: 100 });
}

/**
 * Speaks voice confirmation when a bill is generated / saved.
 * Says "आप का टोटल हुआ है [amount] रुपये" ("Your total is [amount] rupees").
 * Delayed by 960ms so the iconic 5-note Paytm payment jingle plays in full first.
 */
export function speakBillGeneratedConfirmation(
  amount?: number,
  settings?: Partial<AppSettings>
): void {
  const isEnglish = settings?.language === 'en';
  const rounded = amount && amount > 0 ? Math.round(amount) : 0;
  const text = isEnglish
    ? (rounded > 0 
        ? `Your total is ${rounded} rupees` 
        : 'Bill created successfully')
    : (rounded > 0 
        ? `आप का टोटल हुआ है ${rounded} रुपये` 
        : 'आप का बिल तैयार हो गया है');
  speakHindiConfirmation(text, settings, { delay: 960 });
}

/**
 * Speaks Hindi confirmation when a bill is printed
 */
export function speakBillPrintedConfirmation(
  settings?: Partial<AppSettings>
): void {
  speakHindiConfirmation('बिल प्रिंट हो गया', settings, { delay: 120 });
}
