// Universal haptic vibration feedback engine for mobile web & PWA
let lastHapticTime = 0;
let hapticAudioCtx: AudioContext | null = null;

/**
 * Triggers a crisp tactile haptic vibration for navigation and mobile touch events.
 * Supports both the standard Vibration API (Android / PWA / Chrome)
 * and low-latency audio-tactile pulse for iOS Safari / WebKit.
 */
export function triggerNavHaptic(duration: number = 28) {
  const now = Date.now();
  // Prevent duplicate double-firing between pointerdown and click
  if (now - lastHapticTime < 100) return;
  lastHapticTime = now;

  // 1. Hardware Vibration API (Android, Chrome, Firefox, PWA)
  if (typeof window !== 'undefined' && typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
    try {
      navigator.vibrate(duration);
    } catch {
      // Ignore security/permission restrictions
    }
  }

  // 2. Tactile micro-click synthesizer for iOS / WebKit (where navigator.vibrate is unavailable)
  if (typeof window !== 'undefined') {
    try {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtxClass) {
        if (!hapticAudioCtx) {
          hapticAudioCtx = new AudioCtxClass();
        }
        if (hapticAudioCtx.state === 'suspended') {
          hapticAudioCtx.resume();
        }
        
        const osc = hapticAudioCtx.createOscillator();
        const gain = hapticAudioCtx.createGain();
        
        // Ultra-low frequency transient tick (simulates physical button click)
        osc.type = 'sine';
        osc.frequency.setValueAtTime(140, hapticAudioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(30, hapticAudioCtx.currentTime + 0.02);
        
        gain.gain.setValueAtTime(0.06, hapticAudioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, hapticAudioCtx.currentTime + 0.02);
        
        osc.connect(gain);
        gain.connect(hapticAudioCtx.destination);
        
        osc.start();
        osc.stop(hapticAudioCtx.currentTime + 0.025);
      }
    } catch {
      // Audio haptic fallback silently ignored
    }
  }
}
