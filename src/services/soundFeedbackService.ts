import { AppSettings } from '../types';

export type FeedbackMode = 'silent' | 'vibrate_only' | 'vibrate_sound';
export type SoundPack = 'classic_pos' | 'modern' | 'professional';
export type VibrationStrength = 'light' | 'medium' | 'strong';

interface SoundParams {
  settings: AppSettings;
  overridePack?: SoundPack;
  isTestPreview?: boolean;
}

// Memory to handle Smart Business Feedback (fatigue reduction)
let lastTriggerTime: { [key: string]: number } = {};

/**
 * Checks if the current local time falls within defined quiet hours (e.g., "22:00" to "07:00")
 */
function isQuietHours(settings: AppSettings): boolean {
  if (!settings.quietHoursEnabled) return false;
  
  const startStr = settings.quietHoursStart || '22:00';
  const endStr = settings.quietHoursEnd || '07:00';
  
  const now = new Date();
  const currentHours = now.getHours();
  const currentMinutes = now.getMinutes();
  const currentTotalMinutes = currentHours * 60 + currentMinutes;
  
  const [startHours, startMins] = startStr.split(':').map(Number);
  const [endHours, endMins] = endStr.split(':').map(Number);
  
  const startTotalMinutes = startHours * 60 + startMins;
  const endTotalMinutes = endHours * 60 + endMins;
  
  if (startTotalMinutes <= endTotalMinutes) {
    // Range does not cross midnight (e.g., 14:00 to 18:00)
    return currentTotalMinutes >= startTotalMinutes && currentTotalMinutes <= endTotalMinutes;
  } else {
    // Range crosses midnight (e.g., 22:00 to 07:00)
    return currentTotalMinutes >= startTotalMinutes || currentTotalMinutes <= endTotalMinutes;
  }
}

/**
 * Audio Context helper to prevent duplication and respect browser lazy play rules.
 */
let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioCtxClass) return null;
  
  if (!audioCtx) {
    audioCtx = new AudioCtxClass();
  }
  
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  
  return audioCtx;
}

/**
 * Vibrates the device based on the user's settings.
 */
export function triggerHapticFeedback(
  settings: AppSettings, 
  event: 'bill_saved' | 'product_added' | 'print_success' | 'notification'
) {
  if (typeof navigator === 'undefined' || !navigator.vibrate) return;
  
  // 1. Check General Feedback Mode
  if (settings.soundFeedbackMode === 'silent') return;
  
  // 2. Check Event Toggles
  if (event === 'bill_saved' && settings.vibrationBillingEnabled === false) return;
  if (event === 'product_added' && settings.vibrationProductAddedEnabled === false) return;
  if (event === 'print_success' && settings.vibrationPrintEnabled === false) return;
  if (event === 'notification' && settings.vibrationNotificationEnabled === false) return;
  
  // 3. Quiet Hours Constraint (mute/vibrate only option)
  const isQuiet = isQuietHours(settings);
  if (isQuiet && settings.soundFeedbackMode !== 'vibrate_only' && !settings.quietHoursVibrateOnly) {
    // If quiet hours and vibration-only fallback is disabled, don't vibrate
    return;
  }

  // 4. Smart Business Fatigue Reduction
  const now = Date.now();
  if (settings.smartBusinessFeedback && event === 'product_added') {
    const lastTime = lastTriggerTime['vibe_' + event] || 0;
    if (now - lastTime < 1200) {
      // Cooldown vibration - reduce duration or skip
      lastTriggerTime['vibe_' + event] = now;
      navigator.vibrate(10); // Super subtle tactile poke
      return;
    }
  }
  lastTriggerTime['vibe_' + event] = now;

  // 5. Apply Vibration Strength Patterns
  const strength = settings.vibrationStrength || 'medium';
  
  let pattern: number[] = [50]; // medium default
  
  if (strength === 'light') {
    if (event === 'product_added') pattern = [15];
    else if (event === 'bill_saved') pattern = [40];
    else if (event === 'print_success') pattern = [30];
    else pattern = [25];
  } else if (strength === 'medium') {
    if (event === 'product_added') pattern = [35];
    else if (event === 'bill_saved') pattern = [80, 40, 80];
    else if (event === 'print_success') pattern = [70];
    else pattern = [60, 30, 40];
  } else if (strength === 'strong') {
    if (event === 'product_added') pattern = [60];
    else if (event === 'bill_saved') pattern = [150, 50, 150];
    else if (event === 'print_success') pattern = [120, 40, 100];
    else pattern = [100, 50, 100];
  }
  
  try {
    navigator.vibrate(pattern);
  } catch (e) {
    console.warn('Vibration API blocked or invalid context', e);
  }
}

/**
 * Professional sound synthesizer using Web Audio API nodes.
 * Guarantees zero latency, zero file downloads, perfect offline performance, and adjustable volume.
 */
export function playSynthesizedSound(
  event: 'bill_saved' | 'product_added' | 'print_success' | 'notification',
  params: SoundParams
) {
  const { settings, overridePack, isTestPreview = false } = params;
  
  // 1. Accessibility & Mode Checks
  const mode = settings.soundFeedbackMode || 'vibrate_sound';
  if (!isTestPreview) {
    if (mode === 'silent' || mode === 'vibrate_only') return;
    
    // Check Event Toggle
    if (event === 'bill_saved' && settings.soundBillingEnabled === false) return;
    if (event === 'product_added' && settings.soundProductAddedEnabled === false) return;
    if (event === 'print_success' && settings.soundPrintEnabled === false) return;
    if (event === 'notification' && settings.soundNotificationEnabled === false) return;
    
    // Check Quiet Hours
    if (isQuietHours(settings)) return;
  }
  
  // Initialize context
  const ctx = getAudioContext();
  if (!ctx) return;
  
  const now = ctx.currentTime;
  
  // Determine Volume Coefficients
  const overallVol = (settings.soundOverallVolume ?? 100) / 100;
  let eventVol = 0.5; // default medium level
  
  if (event === 'bill_saved') {
    eventVol = (settings.soundBillingVolume ?? 80) / 100;
  } else if (event === 'product_added') {
    eventVol = (settings.soundBillingVolume ?? 70) / 100; // shares bill volumes or let it be 70
  } else if (event === 'print_success') {
    eventVol = (settings.soundPrintVolume ?? 75) / 100;
  } else if (event === 'notification') {
    eventVol = (settings.soundNotificationVolume ?? 85) / 100;
  }
  
  let targetVolume = overallVol * eventVol * 0.35; // Calibrated master dampener
  
  // Smart Business Fatigue System
  const triggerKey = 'sound_' + event;
  const lastTime = lastTriggerTime[triggerKey] || 0;
  const timeDiff = Date.now() - lastTime;
  
  if (settings.smartBusinessFeedback && event === 'product_added' && timeDiff < 1500) {
    // Scale volume down dramatically if user is scanning rapid-fire
    const dampening = Math.max(0.15, Math.min(1.0, timeDiff / 1500));
    targetVolume = targetVolume * dampening;
  }
  if (!isTestPreview) {
    lastTriggerTime[triggerKey] = Date.now();
  }

  // Active Sound Pack Configuration
  const pack = overridePack || settings.soundStylePack || 'modern';
  
  // --- SOUND SYNTHESIS PATTERNS ---
  try {
    if (pack === 'classic_pos') {
      // 🏪 Classic POS Mode (Simple, familiar, retro billing hardware)
      switch (event) {
        case 'product_added': {
          // Sharp barcode scanner beep
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          
          osc.type = 'sine';
          osc.frequency.setValueAtTime(1400, now);
          gain.gain.setValueAtTime(0, now);
          gain.gain.linearRampToValueAtTime(targetVolume * 0.6, now + 0.005);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.06);
          
          osc.start(now);
          osc.stop(now + 0.07);
          break;
        }
        
        case 'bill_saved': {
          // Traditional mechanical bell cash register "Ching!"
          const gain = ctx.createGain();
          gain.connect(ctx.destination);
          gain.gain.setValueAtTime(0, now);
          gain.gain.linearRampToValueAtTime(targetVolume * 0.8, now + 0.01);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.5);

          // Combined frequencies for a complex mechanical bell ring
          const frequencies = [987.77, 1318.51, 1567.98, 1975.53];
          frequencies.forEach(freq => {
            const osc = ctx.createOscillator();
            osc.connect(gain);
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now);
            osc.start(now);
            osc.stop(now + 0.5);
          });
          break;
        }
        
        case 'print_success': {
          // Mechanical paper printer buzz feed
          const playBuzz = (startTime: number, duration: number, freq: number) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(freq, startTime);
            gain.gain.setValueAtTime(0, startTime);
            gain.gain.linearRampToValueAtTime(targetVolume * 0.15, startTime + 0.01);
            gain.gain.linearRampToValueAtTime(targetVolume * 0.15, startTime + duration - 0.01);
            gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
            osc.start(startTime);
            osc.stop(startTime + duration + 0.02);
          };
          
          // Print feed simulation: three rapid ticks
          playBuzz(now, 0.05, 120);
          playBuzz(now + 0.07, 0.05, 130);
          playBuzz(now + 0.14, 0.1, 150);
          break;
        }
        
        case 'notification': {
          // Classic electronic tri-tone chime
          [440, 554.37, 659.25].forEach((freq, idx) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now + idx * 0.1);
            
            gain.gain.setValueAtTime(0, now + idx * 0.1);
            gain.gain.linearRampToValueAtTime(targetVolume * 0.5, now + idx * 0.1 + 0.01);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.1 + 0.18);
            
            osc.start(now + idx * 0.1);
            osc.stop(now + idx * 0.1 + 0.2);
          });
          break;
        }
      }
    } 
    else if (pack === 'modern') {
      // 📱 Modern Application Style (Clean, lightweight, soft bubble clicks & pleasant arpeggios)
      switch (event) {
        case 'product_added': {
          // Smooth organic bubble pop sound
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          
          osc.type = 'sine';
          // Sweep frequency down to make a bubble sound
          osc.frequency.setValueAtTime(650, now);
          osc.frequency.exponentialRampToValueAtTime(280, now + 0.08);
          
          gain.gain.setValueAtTime(0, now);
          gain.gain.linearRampToValueAtTime(targetVolume * 0.7, now + 0.01);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.09);
          
          osc.start(now);
          osc.stop(now + 0.1);
          break;
        }
        
        case 'bill_saved': {
          // Beautiful Major 7th ascending arpeggio (C Major: C4 -> E4 -> G4 -> B4)
          const notes = [261.63, 329.63, 392.00, 493.88];
          notes.forEach((freq, idx) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, now + idx * 0.07);
            
            gain.gain.setValueAtTime(0, now + idx * 0.07);
            gain.gain.linearRampToValueAtTime(targetVolume * 0.4, now + idx * 0.07 + 0.01);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.07 + 0.22);
            
            osc.start(now + idx * 0.07);
            osc.stop(now + idx * 0.07 + 0.25);
          });
          break;
        }
        
        case 'print_success': {
          // Smooth sweeping frequency swoosh (paper slide)
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          
          osc.type = 'sine';
          osc.frequency.setValueAtTime(300, now);
          osc.frequency.exponentialRampToValueAtTime(900, now + 0.25);
          
          gain.gain.setValueAtTime(0, now);
          gain.gain.linearRampToValueAtTime(targetVolume * 0.4, now + 0.05);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.3);
          
          osc.start(now);
          osc.stop(now + 0.32);
          break;
        }
        
        case 'notification': {
          // Elegant double-chime with pleasant warm ring
          const playChime = (time: number, freq: number) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, time);
            
            gain.gain.setValueAtTime(0, time);
            gain.gain.linearRampToValueAtTime(targetVolume * 0.5, time + 0.015);
            gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.35);
            
            osc.start(time);
            osc.stop(time + 0.38);
          };
          
          playChime(now, 587.33); // D5
          playChime(now + 0.08, 880.00); // A5
          break;
        }
      }
    } 
    else if (pack === 'professional') {
      // 💼 Professional Enterprise Mode (Subtle, elegant woodblocks, warm sine waves, non-distracting)
      switch (event) {
        case 'product_added': {
          // Extremely quiet woodblock click (almost silent but provides tactile confirmation)
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          
          osc.type = 'sine';
          osc.frequency.setValueAtTime(2200, now);
          
          gain.gain.setValueAtTime(0, now);
          gain.gain.linearRampToValueAtTime(targetVolume * 0.25, now + 0.003);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.02);
          
          osc.start(now);
          osc.stop(now + 0.03);
          break;
        }
        
        case 'bill_saved': {
          // Warm elegant luxury bell chime (G4 & B4 interval)
          const frequencies = [392.00, 493.88];
          frequencies.forEach((freq, idx) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now + idx * 0.04);
            
            gain.gain.setValueAtTime(0, now + idx * 0.04);
            gain.gain.linearRampToValueAtTime(targetVolume * 0.45, now + idx * 0.04 + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.04 + 0.45);
            
            osc.start(now + idx * 0.04);
            osc.stop(now + idx * 0.04 + 0.5);
          });
          break;
        }
        
        case 'print_success': {
          // Minimalistic executive slide / print confirmation sweep
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          
          osc.type = 'sine';
          osc.frequency.setValueAtTime(523.25, now);
          osc.frequency.exponentialRampToValueAtTime(1046.50, now + 0.18);
          
          gain.gain.setValueAtTime(0, now);
          gain.gain.linearRampToValueAtTime(targetVolume * 0.28, now + 0.03);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);
          
          osc.start(now);
          osc.stop(now + 0.24);
          break;
        }
        
        case 'notification': {
          // Refined executive reminder blip
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          
          osc.type = 'sine';
          osc.frequency.setValueAtTime(783.99, now); // G5
          
          gain.gain.setValueAtTime(0, now);
          gain.gain.linearRampToValueAtTime(targetVolume * 0.4, now + 0.01);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.25);
          
          osc.start(now);
          osc.stop(now + 0.27);
          break;
        }
      }
    }
  } catch (err) {
    console.warn('Synthesized Audio Engine failed to play tone on user action:', err);
  }
}

/**
 * Synthesizes a distinctive "toot" or "beep" sound using the Web Audio API.
 */
export function playTootBeep(type: 'beep' | 'toot', settings: AppSettings) {
  const mode = settings.soundFeedbackMode || 'vibrate_sound';
  if (mode === 'silent' || mode === 'vibrate_only') return;
  if (isQuietHours(settings)) return;

  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const overallVol = (settings.soundOverallVolume ?? 100) / 100;
  
  // Custom calibration for beep or toot volume
  let eventVol = 0.8;
  if (type === 'beep') {
    eventVol = (settings.soundBillingVolume ?? 80) / 100;
  } else {
    eventVol = (settings.soundPrintVolume ?? 75) / 100;
  }
  
  const targetVolume = overallVol * eventVol * 0.45; // custom sound calibration

  try {
    if (type === 'beep') {
      // Clean, pleasant high-frequency double beep ("beep beep")
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(1100, now);
      gain1.gain.setValueAtTime(0, now);
      gain1.gain.linearRampToValueAtTime(targetVolume, now + 0.005);
      gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);
      osc1.start(now);
      osc1.stop(now + 0.1);

      // Second beep
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(1100, now + 0.12);
      gain2.gain.setValueAtTime(0, now + 0.12);
      gain2.gain.linearRampToValueAtTime(targetVolume, now + 0.125);
      gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.2);
      osc2.start(now + 0.12);
      osc2.stop(now + 0.22);
    } else if (type === 'toot') {
      // A bright whistle-toot ("toot-toot!") using slightly detuned triangles for rich presence
      const playSingleToot = (start: number, duration: number) => {
        const gain = ctx.createGain();
        gain.connect(ctx.destination);
        gain.gain.setValueAtTime(0, start);
        gain.gain.linearRampToValueAtTime(targetVolume * 0.7, start + 0.02);
        gain.gain.linearRampToValueAtTime(targetVolume * 0.7, start + duration - 0.03);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

        const freqs = [650, 720];
        freqs.forEach(freq => {
          const osc = ctx.createOscillator();
          osc.connect(gain);
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, start);
          osc.start(start);
          osc.stop(start + duration + 0.02);
        });
      };

      // Play double-toot: toot-toot!
      playSingleToot(now, 0.14);
      playSingleToot(now + 0.16, 0.14);
    }
  } catch (err) {
    console.warn('Failed to play custom toot/beep sound:', err);
  }
}

/**
 * Speaks the welcome announcement using the Web Speech Synthesis API.
 * Respects sound settings and quiet hours.
 */
export function playWelcomeAnnouncement(settings: AppSettings) {
  if (typeof window === 'undefined') return;
  
  // Respect silent/vibrate settings
  const mode = settings.soundFeedbackMode || 'vibrate_sound';
  if (mode === 'silent' || mode === 'vibrate_only') return;
  if (isQuietHours(settings)) return;
  
  try {
    const synth = window.speechSynthesis;
    if (!synth) return;
    
    // Cancel any ongoing speech to avoid overlap
    synth.cancel();
    
    const text = "WELCOME IN PREMIUM TS PRICE MANAGER APP";
    const utterance = new SpeechSynthesisUtterance(text);
    
    // Choose a clean English voice if available
    if (typeof synth.getVoices === 'function') {
      const voices = synth.getVoices();
      const englishVoice = voices.find(v => v.lang.startsWith('en') && v.localService) || 
                           voices.find(v => v.lang.startsWith('en'));
      if (englishVoice) {
        utterance.voice = englishVoice;
      }
    }
    
    // Set pleasant voice parameters
    utterance.rate = 1.0;  // Natural speech rate
    utterance.pitch = 1.05; // Slightly cheerful pitch
    
    // Volume based on settings
    const overallVol = (settings.soundOverallVolume ?? 100) / 100;
    utterance.volume = overallVol * 0.95; // Nicely audible
    
    synth.speak(utterance);
  } catch (err) {
    console.warn('Speech Synthesis failed:', err);
  }
}

/**
 * Executes a full sound & haptic event, combining play & vib based on settings.
 */
export function playFeedbackEvent(
  event: 'bill_saved' | 'product_added' | 'print_success' | 'notification',
  settings: AppSettings
) {
  // Trigger Sound
  if (event === 'bill_saved') {
    playTootBeep('beep', settings);
  } else if (event === 'print_success') {
    playTootBeep('toot', settings);
  } else {
    playSynthesizedSound(event, { settings });
  }
  // Trigger Vibration
  triggerHapticFeedback(settings, event);
}
