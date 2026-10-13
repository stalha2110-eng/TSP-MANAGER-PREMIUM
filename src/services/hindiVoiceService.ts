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
      let cleanText = text
        .replace(/[#*`_~₹]/g, '')
        .replace(/\s+/g, ' ')
        .trim();

      if (!cleanText) return;

      // 1. Remove any "joda gya" / "joda gaya" / "जोड़ा गया"
      cleanText = cleanText
        .replace(/(?:जोड़ा\s*गया|जोड़ा\s*गया|joda\s*g(?:y|ay)a(?:\s*hai)?)/gi, '')
        .trim();

      // 2. Normalize decimal kg expressions like "0.1 kilo grams", "0.1 kg", "0.1 kilogram" -> "100 gram"
      cleanText = cleanText.replace(/\b0\.(\d+)\s*(?:kilo\s*grams?|kilograms?|kilos?|kgs?|किग्रा|किलो)\b/gi, (_, dec) => {
        const grams = Math.round(parseFloat(`0.${dec}`) * 1000);
        return `${grams} gram`;
      });

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
 * Mentions product name with added quantity (e.g. "Gravy Masala 1kg", "Kesar 100 gram")
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
  let cleanName = itemName.split('/')[0].split('(')[0].trim();
  if (!cleanName) return;

  // Normalize any decimal kg in item name itself (e.g. "Kesar 0.1 kilo grams" -> "Kesar 100 gram")
  cleanName = cleanName.replace(/\b0\.(\d+)\s*(?:kilo\s*grams?|kilograms?|kilos?|kgs?|किग्रा|किलो)\b/gi, (_, dec) => {
    const grams = Math.round(parseFloat(`0.${dec}`) * 1000);
    return `${grams} gram`;
  });

  // Format quantity & unit
  let qtyUnitText = '';
  if (quantity !== undefined && quantity !== null && !isNaN(quantity) && quantity > 0) {
    const rawUnit = (unit || '').trim().toLowerCase().replace(/[-_]/g, ' ');
    const normalizedUnit = rawUnit.replace(/\s+/g, ' ').trim();
    let formattedQty = '';
    let displayUnit = '';

    const isKgUnit = ['kg', 'kgs', 'kilo', 'kilos', 'kilogram', 'kilograms', 'kilo gram', 'kilo grams', 'किग्रा', 'किलो'].includes(normalizedUnit) || normalizedUnit.startsWith('kg') || normalizedUnit.startsWith('kilo');
    const isLtrUnit = ['ltr', 'l', 'litre', 'liter', 'litres', 'liters', 'लीटर'].includes(normalizedUnit) || normalizedUnit.startsWith('lit');

    if (isKgUnit) {
      if (quantity < 1) {
        // e.g. 0.1 kg -> 100 gram, 0.05 kg -> 50 gram, 0.25 kg -> 250 gram, 0.5 kg -> 500 gram
        const grams = Math.round(quantity * 1000);
        formattedQty = String(grams);
        displayUnit = 'gram';
      } else if (quantity % 1 !== 0) {
        // e.g. 1.5 kg -> 1 kilo 500 gram
        const wholeKg = Math.floor(quantity);
        const remGrams = Math.round((quantity - wholeKg) * 1000);
        if (wholeKg > 0 && remGrams > 0) {
          formattedQty = `${wholeKg} kilo ${remGrams}`;
          displayUnit = 'gram';
        } else if (remGrams > 0) {
          formattedQty = String(remGrams);
          displayUnit = 'gram';
        } else {
          formattedQty = String(wholeKg);
          displayUnit = 'kg';
        }
      } else {
        formattedQty = String(quantity);
        displayUnit = 'kg';
      }
    } else if (isLtrUnit) {
      if (quantity < 1) {
        // e.g. 0.5 litre -> 500 ml
        const ml = Math.round(quantity * 1000);
        formattedQty = String(ml);
        displayUnit = 'ml';
      } else if (quantity % 1 !== 0) {
        const wholeLtr = Math.floor(quantity);
        const remMl = Math.round((quantity - wholeLtr) * 1000);
        if (wholeLtr > 0 && remMl > 0) {
          formattedQty = `${wholeLtr} litre ${remMl}`;
          displayUnit = 'ml';
        } else if (remMl > 0) {
          formattedQty = String(remMl);
          displayUnit = 'ml';
        } else {
          formattedQty = String(wholeLtr);
          displayUnit = 'litre';
        }
      } else {
        formattedQty = String(quantity);
        displayUnit = 'litre';
      }
    } else if (['gm', 'g', 'gram', 'grams', 'ग्राम'].includes(normalizedUnit)) {
      formattedQty = quantity % 1 === 0 ? String(quantity) : Number(quantity.toFixed(2)).toString();
      displayUnit = 'gram';
    } else if (['pkt', 'packet', 'pack', 'packets', 'पैकेट'].includes(normalizedUnit)) {
      formattedQty = quantity % 1 === 0 ? String(quantity) : Number(quantity.toFixed(2)).toString();
      displayUnit = 'packet';
    } else if (['pcs', 'pc', 'piece', 'pieces', 'पीस', 'नग'].includes(normalizedUnit)) {
      formattedQty = quantity % 1 === 0 ? String(quantity) : Number(quantity.toFixed(2)).toString();
      displayUnit = 'piece';
    } else if (['box', 'boxes', 'बॉक्स'].includes(normalizedUnit)) {
      formattedQty = quantity % 1 === 0 ? String(quantity) : Number(quantity.toFixed(2)).toString();
      displayUnit = 'box';
    } else if (['dozen', 'darjan', 'दर्जन'].includes(normalizedUnit)) {
      formattedQty = quantity % 1 === 0 ? String(quantity) : Number(quantity.toFixed(2)).toString();
      displayUnit = 'dozen';
    } else if (normalizedUnit) {
      formattedQty = quantity % 1 === 0 ? String(quantity) : Number(quantity.toFixed(2)).toString();
      displayUnit = normalizedUnit;
    } else {
      formattedQty = quantity % 1 === 0 ? String(quantity) : Number(quantity.toFixed(2)).toString();
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
 * Says "आप का टोटल हुआ है [amount] रुपये" / "aap ka total hua hai [amount] rs".
 * Delayed by 960ms so the iconic 5-note Paytm payment jingle plays in full first.
 */
export function speakBillGeneratedConfirmation(
  amount?: number,
  settings?: Partial<AppSettings>
): void {
  const isEnglish = settings?.language === 'en';
  const rounded = amount && amount > 0 ? Math.round(amount) : 0;
  const hindiVoice = getBestHindiVoice();
  const hasDedicatedHindiVoice = hindiVoice && (hindiVoice.lang.toLowerCase().startsWith('hi') || hindiVoice.name.toLowerCase().includes('hindi'));

  const text = isEnglish
    ? (rounded > 0 
        ? `Your total is ${rounded} rupees` 
        : 'Bill created successfully')
    : (rounded > 0 
        ? (hasDedicatedHindiVoice 
            ? `आप का टोटल हुआ है ${rounded} रुपये` 
            : `Aap ka total hua hai ${rounded} rupaye`)
        : (hasDedicatedHindiVoice 
            ? 'आप का टोटल हुआ है 0 रुपये' 
            : 'Aap ka total hua hai 0 rupaye'));
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
