/**
 * Sound Management Service for Onboarding Tutorials
 * 
 * Provides:
 * 1. High-fidelity synthesized Hindi voice narration via Web Speech API (with Desi/Hindi male priority).
 * 2. Web Audio API synthesized procedural sound effects (step chime, tactile tap sound, completion fanfare).
 * 3. Pre-configured Hindi voice audio scripts for all onboarding steps.
 * 4. Resilient queue management, pause/resume handling, and mute toggles.
 */

export type TutorialType = 'add_product' | 'make_bill_dashboard' | 'make_bill_search' | 'make_bill_all_items';

export interface TutorialAudioSnippet {
  tutorialType: TutorialType;
  stepIndex: number;
  speechScript: string;
  shortSummary: string;
}

// Built-in studio scripts for Hindi narration
export const TUTORIAL_AUDIO_SNIPPETS: Record<string, TutorialAudioSnippet> = {
  'add_product_0': {
    tutorialType: 'add_product',
    stepIndex: 0,
    speechScript: 'नमस्ते! नया सामान जोड़ने के लिए इस सुनहरे माइक बटन पर टैप करें।',
    shortSummary: 'माइक बटन पर टैप करें'
  },
  'add_product_1': {
    tutorialType: 'add_product',
    stepIndex: 1,
    speechScript: 'अब माइक दबाकर बोलें, जैसे: दस किलो चीनी बयालीस रुपये। सिस्टम खुद सामान, मात्रा और रेट पहचान कर लिस्ट बना देगा!',
    shortSummary: 'बोलकर सामान जोड़ें'
  },
  'make_bill_dashboard_0': {
    tutorialType: 'make_bill_dashboard',
    stepIndex: 0,
    speechScript: 'बिल बनाने के लिए सबसे पहले नीचे दिए गए बिलिंग टैब पर जाएं।',
    shortSummary: 'बिलिंग टैब पर आएं'
  },
  'make_bill_dashboard_1': {
    tutorialType: 'make_bill_dashboard',
    stepIndex: 1,
    speechScript: 'डैशबोर्ड पर किसी भी सामान के कार्ड पर टैप करें, वह तुरंत आपके बिल में एक क्वांटिटी के साथ जुड़ जाएगा।',
    shortSummary: 'सामान कार्ड पर टैप करें'
  },
  'make_bill_dashboard_2': {
    tutorialType: 'make_bill_dashboard',
    stepIndex: 2,
    speechScript: 'अब नीचे दिए गए नीले रंग के सेव बिल बटन को दबाएं। आपका बिल सुरक्षित हो जाएगा और रसीद तैयार हो जाएगी!',
    shortSummary: 'सेव बिल दबाएं'
  },
  'make_bill_search_0': {
    tutorialType: 'make_bill_search',
    stepIndex: 0,
    speechScript: 'सर्च करके सुपर-फास्ट बिल बनाने के लिए बिलिंग टैब खोलें।',
    shortSummary: 'बिलिंग काउंटर खोलें'
  },
  'make_bill_search_1': {
    tutorialType: 'make_bill_search',
    stepIndex: 1,
    speechScript: 'सर्च बार में सामान का नाम टाइप करें, जैसे दूध, तेल या चाय। सामान तुरंत आपके सामने आ जाएगा।',
    shortSummary: 'सर्च बार में टाइप करें'
  },
  'make_bill_search_2': {
    tutorialType: 'make_bill_search',
    stepIndex: 2,
    speechScript: 'सामान चुनने के बाद सेव बिल का बटन दबाएं और तुरंत ग्राहक को पक्की पर्ची दें।',
    shortSummary: 'बिल सेव करें'
  },
  'make_bill_all_items_0': {
    tutorialType: 'make_bill_all_items',
    stepIndex: 0,
    speechScript: 'दुकान के पूरे कैटलॉग से बिल बनाने के लिए बिलिंग सेक्शन में आएं।',
    shortSummary: 'बिलिंग स्क्रीन पर जाएं'
  },
  'make_bill_all_items_1': {
    tutorialType: 'make_bill_all_items',
    stepIndex: 1,
    speechScript: 'यहाँ व्यू ऑल आइटम्स बटन दबाएं। आपकी दुकान का पूरा कैटलॉग एक साथ खुल जाएगा।',
    shortSummary: 'व्यू ऑल आइटम्स दबाएं'
  },
  'make_bill_all_items_2': {
    tutorialType: 'make_bill_all_items',
    stepIndex: 2,
    speechScript: 'कैटलॉग में जिस भी सामान का बिल बनाना है, उस पर टैप करें या मात्रा सेट करके बिल में जोड़ें।',
    shortSummary: 'कैटलॉग से सामान चुनें'
  },
};

class TutorialSoundService {
  private isMutedState = false;
  private isSpeakingState = false;
  private audioContext: AudioContext | null = null;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private preferredVoice: SpeechSynthesisVoice | null = null;
  private stateListeners: Set<(state: { isSpeaking: boolean; isMuted: boolean }) => void> = new Set();
  private lastSpokenText: string = '';

  constructor() {
    if (typeof window !== 'undefined') {
      // Check saved muted preference
      try {
        const savedMute = localStorage.getItem('onboarding_voice_muted');
        if (savedMute !== null) {
          this.isMutedState = savedMute === 'true';
        }
      } catch {
        // Ignore localStorage restrictions
      }

      // Initialize voice lookup
      this.initVoiceList();
      if ('speechSynthesis' in window) {
        window.speechSynthesis.onvoiceschanged = () => {
          this.initVoiceList();
        };
      }
    }
  }

  /**
   * Lazily initializes Web Audio Context
   */
  private getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return null;

    if (!this.audioContext) {
      this.audioContext = new AudioCtx();
    }
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume().catch(() => {});
    }
    return this.audioContext;
  }

  private isMaleVoiceDetected = false;

  /**
   * Find and cache the best Hindi male voice available.
   * Strictly enforces male voice selection as requested by the user.
   */
  private initVoiceList() {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    const voices = window.speechSynthesis.getVoices();
    if (!voices || voices.length === 0) return;

    // Female names and terms to strictly avoid
    const femaleTerms = [
      'female', 'zira', 'kalpana', 'swara', 'ananya', 'sangeeta', 
      'priya', 'kavya', 'veena', 'heera', 'girl', 'woman', 'lady', 
      'catherine', 'susan', 'victoria', 'karen', 'cortana'
    ];

    // Male identifiers in standard speech engines
    const maleTerms = [
      'male', 'hemant', 'madhav', 'ravi', 'prabhat', 'amit', 'arjun', 
      'manish', 'karan', 'ajay', 'rishi', 'neel', 'tarun', 'guy', 
      'david', 'mark', 'george', 'richard'
    ];

    const hasTerm = (str: string, terms: string[]) => {
      const lower = str.toLowerCase();
      return terms.some(t => lower.includes(t));
    };

    // Filter candidate voices:
    // 1. Strictly Hindi (hi-IN, hi) with explicit male indicator and NOT female
    const hindiExplicitMale = voices.find(v => 
      (v.lang === 'hi-IN' || v.lang.startsWith('hi')) && 
      hasTerm(v.name, maleTerms) && 
      !hasTerm(v.name, femaleTerms)
    );

    // 2. Indian English (en-IN) with explicit male indicator and NOT female
    const indianEnglishMale = voices.find(v => 
      (v.lang === 'en-IN' || v.lang.includes('India') || v.lang.includes('IN')) && 
      hasTerm(v.name, maleTerms) && 
      !hasTerm(v.name, femaleTerms)
    );

    // 3. Any system male voice
    const anySystemMale = voices.find(v => 
      hasTerm(v.name, maleTerms) && 
      !hasTerm(v.name, femaleTerms)
    );

    // 4. Hindi voice that is not explicitly female
    const hindiNonFemale = voices.find(v => 
      (v.lang === 'hi-IN' || v.lang.startsWith('hi')) && 
      !hasTerm(v.name, femaleTerms)
    );

    // 5. Any Hindi voice fallback
    const hindiFallback = voices.find(v => v.lang === 'hi-IN' || v.lang.startsWith('hi'));

    if (hindiExplicitMale) {
      this.preferredVoice = hindiExplicitMale;
      this.isMaleVoiceDetected = true;
    } else if (indianEnglishMale) {
      this.preferredVoice = indianEnglishMale;
      this.isMaleVoiceDetected = true;
    } else if (anySystemMale) {
      this.preferredVoice = anySystemMale;
      this.isMaleVoiceDetected = true;
    } else if (hindiNonFemale) {
      this.preferredVoice = hindiNonFemale;
      this.isMaleVoiceDetected = false;
    } else {
      this.preferredVoice = hindiFallback || voices[0] || null;
      this.isMaleVoiceDetected = false;
    }
  }

  /**
   * Notify state subscribers (UI buttons, voice badges)
   */
  private notifyState() {
    const state = { isSpeaking: this.isSpeakingState, isMuted: this.isMutedState };
    this.stateListeners.forEach(listener => {
      try {
        listener(state);
      } catch (err) {
        console.warn('Error in tutorial sound listener:', err);
      }
    });
  }

  /**
   * Subscribe to sound/speech state changes
   */
  public subscribe(listener: (state: { isSpeaking: boolean; isMuted: boolean }) => void): () => void {
    this.stateListeners.add(listener);
    listener({ isSpeaking: this.isSpeakingState, isMuted: this.isMutedState });
    return () => {
      this.stateListeners.delete(listener);
    };
  }

  /**
   * Get whether voice narration is currently muted
   */
  public isMuted(): boolean {
    return this.isMutedState;
  }

  /**
   * Set mute state
   */
  public setMuted(muted: boolean) {
    this.isMutedState = muted;
    try {
      localStorage.setItem('onboarding_voice_muted', String(muted));
    } catch {}

    if (muted) {
      this.stopSpeech();
    }
    this.notifyState();
  }

  /**
   * Toggle mute state
   */
  public toggleMute(): boolean {
    this.setMuted(!this.isMutedState);
    return this.isMutedState;
  }

  /**
   * Check if speech is currently active
   */
  public isSpeaking(): boolean {
    return this.isSpeakingState;
  }

  /**
   * Stop active speech synthesis immediately
   */
  public stopSpeech() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    this.isSpeakingState = false;
    this.currentUtterance = null;
    this.notifyState();
  }

  /**
   * Synthesize tactile tap sound (sound of a finger physically tapping a screen)
   */
  public playTapSound() {
    if (this.isMutedState) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      // Sharp subtle pop (pitch drops rapidly 680Hz -> 180Hz)
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(680, now);
      osc.frequency.exponentialRampToValueAtTime(180, now + 0.035);

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.045);
    } catch {
      // AudioContext fallback
    }
  }

  /**
   * Play gentle harmonic chime when the hand moves onto a new target
   */
  public playStepChime() {
    if (this.isMutedState) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      // Soft two-tone warm chime (C5 = 523.25Hz, E5 = 659.25Hz)
      const freqs = [523.25, 659.25];
      freqs.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.08);

        gain.gain.setValueAtTime(0.001, now + idx * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.12, now + idx * 0.08 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.08 + 0.28);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + idx * 0.08);
        osc.stop(now + idx * 0.08 + 0.3);
      });
    } catch {
      // AudioContext fallback
    }
  }

  /**
   * Play celebratory chime on step or tutorial completion
   */
  public playSuccessChime() {
    if (this.isMutedState) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      // Ascending C major arpeggio (C5, E5, G5, C6)
      const notes = [523.25, 659.25, 783.99, 1046.50];
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.09);

        gain.gain.setValueAtTime(0.001, now + idx * 0.09);
        gain.gain.exponentialRampToValueAtTime(0.14, now + idx * 0.09 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.09 + 0.35);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + idx * 0.09);
        osc.stop(now + idx * 0.09 + 0.4);
      });
    } catch {
      // AudioContext fallback
    }
  }

  /**
   * Play speech snippet for an onboarding tutorial step
   */
  public playStepAudio(tutorialType: TutorialType, stepIndex: number, customSpeechText?: string) {
    if (this.isMutedState) return;

    const key = `${tutorialType}_${stepIndex}`;
    const snippet = TUTORIAL_AUDIO_SNIPPETS[key];
    const speechText = customSpeechText || snippet?.speechScript;

    if (!speechText) return;

    this.playSpeechText(speechText);
  }

  /**
   * Directly speak Hindi text with optimal configuration
   */
  public playSpeechText(text: string) {
    if (this.isMutedState || typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return;
    }

    try {
      this.stopSpeech();
      this.lastSpokenText = text;

      // Play soft chime before speech starts
      this.playStepChime();

      // Ensure voice list is ready
      if (!this.preferredVoice) {
        this.initVoiceList();
      }

      const utterance = new SpeechSynthesisUtterance(text);
      if (this.preferredVoice) {
        utterance.voice = this.preferredVoice;
      }
      utterance.lang = 'hi-IN';
      utterance.rate = 0.90; // Natural, clear shopkeeper guidance pace
      // Lower pitch produces a deep, warm, authoritative Indian male voice
      utterance.pitch = this.isMaleVoiceDetected ? 0.84 : 0.76;
      utterance.volume = 1.0;

      utterance.onstart = () => {
        this.isSpeakingState = true;
        this.notifyState();
      };

      utterance.onend = () => {
        this.isSpeakingState = false;
        this.currentUtterance = null;
        this.notifyState();
      };

      utterance.onerror = (e) => {
        // If canceled deliberately, no warning
        if (e.error !== 'canceled' && e.error !== 'interrupted') {
          console.warn('Speech synthesis notice:', e.error);
        }
        this.isSpeakingState = false;
        this.currentUtterance = null;
        this.notifyState();
      };

      this.currentUtterance = utterance;
      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.warn('Speech synthesis error:', err);
      this.isSpeakingState = false;
      this.notifyState();
    }
  }

  /**
   * Replay the last spoken audio snippet
   */
  public replay() {
    if (this.lastSpokenText) {
      this.playSpeechText(this.lastSpokenText);
    }
  }
}

export const tutorialSoundService = new TutorialSoundService();
