// Service for Hindi Voice Narration across Onboarding Tutorials

let isSpeechMuted = false;

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

export function stopHindiSpeech(): void {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
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
 * Speaks the provided Hindi text using browser's SpeechSynthesis API
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

    // Try finding the best Hindi voice available
    const voices = window.speechSynthesis.getVoices();
    const hindiVoice = voices.find(
      v => v.lang === 'hi-IN' || v.lang.startsWith('hi') || v.name.toLowerCase().includes('hindi')
    );
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
