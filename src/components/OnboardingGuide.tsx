import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, X, Volume2, VolumeX, RotateCcw, ArrowRight
} from 'lucide-react';
import { tutorialSoundService, TutorialType } from '../services/tutorialSoundService';
import { tutorialTargetCache } from '../services/tutorialTargetCache';

export type { TutorialType };

export interface OnboardingGuideProps {
  isOpen?: boolean;
  tutorialType: TutorialType;
  onClose?: () => void;
  onComplete?: () => void;
  onSkip?: () => void;
  onNextTutorial?: () => void;
  nextTutorialTitle?: string;
  nextTutorial?: { type: TutorialType; title: string };
  autoStartSpeech?: boolean;
  onNavigateTab?: (tab: 'home' | 'shift' | 'history' | 'notes' | 'billing' | 'udhar' | 'analytics' | 'goals') => void;
  activeTab?: string;
  onOpenVoiceAssistant?: () => void;
  onCloseVoiceAssistant?: () => void;
  isVoiceAssistantOpen?: boolean;
}

interface StepDef {
  targetId: string;
  fallbackTargetIds?: string[];
  title: string;
  descHindi: string;
  speechText: string;
  badge: string;
  pointerAction?: 'click' | 'tap' | 'type';
  preferredPosition?: 'top' | 'bottom' | 'left' | 'right';
  tapTargetPoint?: 'center' | 'search-input';
}

interface DynamicTargetBounds {
  top: number;
  left: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
  cx: number;
  cy: number;
  element: HTMLElement | null;
}

// Hand SVG geometry constants
// In 24x24 viewBox scaled to 56px, fingertip is located at (10.04, 2.0)
const HAND_SVG_SIZE = 56;
const FINGER_TIP_X = (10.04 / 24) * HAND_SVG_SIZE; // 23.43px from SVG left
const FINGER_TIP_Y = (2.0 / 24) * HAND_SVG_SIZE;   // 4.67px from SVG top

/**
 * Dynamically resolves target element and measures real-time getBoundingClientRect()
 */
function resolveDynamicTargetBounds(
  primaryId: string, 
  fallbackIds: string[] = []
): DynamicTargetBounds | null {
  const candidateIds = [primaryId, ...fallbackIds];
  let el: HTMLElement | null = null;

  for (const id of candidateIds) {
    const found = document.getElementById(id);
    if (found) {
      const r = found.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) {
        el = found;
        break;
      }
    }
  }

  // Fallback to querySelector for partial matches (e.g. search input inside billing screen)
  if (!el && primaryId.includes('search')) {
    const found = document.querySelector('input[type="text"]#billing-search-input') as HTMLElement ||
                  document.querySelector('#billing-search-bar') as HTMLElement;
    if (found) {
      const r = found.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) el = found;
    }
  }

  if (!el && primaryId.includes('save-bill')) {
    const found = document.querySelector('#billing-save-bill-btn') as HTMLElement ||
                  document.querySelector('button:has-text("SAVE BILL")') as HTMLElement;
    if (found) {
      const r = found.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) el = found;
    }
  }

  if (el) {
    const rect = el.getBoundingClientRect();
    const bounds: DynamicTargetBounds = {
      top: rect.top,
      left: rect.left,
      right: rect.right,
      bottom: rect.bottom,
      width: rect.width,
      height: rect.height,
      cx: rect.left + rect.width / 2,
      cy: rect.top + rect.height / 2,
      element: el,
    };

    // Cache discovered coordinates into localStorage for future reference
    try {
      tutorialTargetCache.saveTargetCoords(primaryId, bounds);
    } catch {}

    return bounds;
  }

  return null;
}

export const OnboardingGuide: React.FC<OnboardingGuideProps> = ({
  isOpen = true,
  tutorialType,
  onClose,
  onComplete,
  onSkip,
  onNextTutorial,
  nextTutorialTitle,
  nextTutorial,
  autoStartSpeech = true,
  onNavigateTab,
  onOpenVoiceAssistant,
  onCloseVoiceAssistant,
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<DynamicTargetBounds | null>(null);
  const [isVoiceMuted, setIsVoiceMuted] = useState(tutorialSoundService.isMuted());
  const [isSpeaking, setIsSpeaking] = useState(tutorialSoundService.isSpeaking());

  // DOM Refs for direct 60fps/120fps transformation without React state lag
  const handContainerRef = useRef<HTMLDivElement>(null);
  const focusRingRef = useRef<HTMLDivElement>(null);
  const holeRectRef = useRef<SVGRectElement>(null);
  const clickTargetRef = useRef<HTMLDivElement>(null);

  // Listen to sound service state changes
  useEffect(() => {
    const unsub = tutorialSoundService.subscribe((state) => {
      setIsSpeaking(state.isSpeaking);
      setIsVoiceMuted(state.isMuted);
    });
    return unsub;
  }, []);

  const handleClose = useCallback(() => {
    tutorialSoundService.stopSpeech();
    if (onClose) onClose();
    if (onSkip) onSkip();
  }, [onClose, onSkip]);

  // Define steps according to tutorialType with resilient fallbacks
  const steps: StepDef[] = React.useMemo(() => {
    switch (tutorialType) {
      case 'add_product':
        return [
          {
            targetId: 'floating-voice-product-assistant-mic-btn',
            fallbackTargetIds: ['floating-voice-assistant-mic-btn', 'bottom-nav-assistant-btn', 'header-voice-btn'],
            badge: 'कदम 1 / 2 • माइक बटन',
            title: 'वॉइस असिस्टेंट माइक बटन दबाएं',
            descHindi: 'इस सुनहरे माइक बटन पर टैप करें। आप बोलकर नया सामान तुरंत स्टोर में जोड़ सकते हैं!',
            speechText: 'नमस्ते! नया सामान जोड़ने के लिए इस सुनहरे माइक बटन पर टैप करें।',
            pointerAction: 'tap',
            preferredPosition: 'top',
          },
          {
            targetId: 'voice-assistant-mic-record-btn',
            fallbackTargetIds: ['voice-assistant-modal', 'floating-voice-product-assistant-mic-btn', 'floating-voice-assistant-mic-btn'],
            badge: 'कदम 2 / 2 • बोलकर सामान जोड़ें',
            title: 'माइक पर बोलें: "10 किलो चीनी 42 रुपये"',
            descHindi: 'यहाँ माइक दबाकर बोलें। एआई खुद सामान का नाम, मात्रा और रेट पहचान कर लिस्ट बना देगा!',
            speechText: 'अब माइक दबाकर बोलें, जैसे दस किलो चीनी बयालीस रुपये। सिस्टम खुद सामान और रेट जोड़ देगा!',
            pointerAction: 'click',
            preferredPosition: 'bottom',
          },
        ];

      case 'make_bill_dashboard':
        return [
          {
            targetId: 'tour-nav-billing-tab',
            fallbackTargetIds: ['nav-billing-btn'],
            badge: 'तरीका 1 • बिलिंग स्क्रीन',
            title: 'बिलिंग टैब पर जाएं',
            descHindi: 'नीचे दिए गए बिलिंग बटन पर टैप करके तुरंत बिलिंग काउंटर पर आएं।',
            speechText: 'बिल बनाने के लिए सबसे पहले नीचे दिए गए बिलिंग टैब पर जाएं।',
            pointerAction: 'tap',
            preferredPosition: 'top',
          },
          {
            targetId: 'billing-quick-product-card-0',
            fallbackTargetIds: ['billing-quick-product-card-1', 'billing-view-all-items-btn', 'billing-search-input'],
            badge: 'डैशबोर्ड टैप • सामान जोड़ें',
            title: 'सामान के कार्ड पर एक बार टैप करें',
            descHindi: 'सामान पर टैप करते ही वह तुरंत बिल में 1 क्वांटिटी के साथ जुड़ जाता है।',
            speechText: 'डैशबोर्ड पर किसी भी सामान के कार्ड पर टैप करें, वह तुरंत आपके बिल में जुड़ जाएगा।',
            pointerAction: 'click',
            preferredPosition: 'bottom',
          },
          {
            targetId: 'billing-save-bill-btn',
            fallbackTargetIds: ['billing-primary-action-btn', 'smart-cash-assistant-toggle-btn'],
            badge: 'बिल सेव करें',
            title: '"SAVE BILL" बटन दबाएं',
            descHindi: 'नीचे दिए गए नीले बटन को दबाएं। बिल सेव हो जाएगा और प्रिंट पर्ची निकल जाएगी!',
            speechText: 'अब नीचे दिए गए नीले रंग के सेव बिल बटन को दबाएं। आपका बिल सुरक्षित हो जाएगा!',
            pointerAction: 'click',
            preferredPosition: 'top',
          },
        ];

      case 'make_bill_search':
        return [
          {
            targetId: 'tour-nav-billing-tab',
            fallbackTargetIds: ['nav-billing-btn'],
            badge: 'तरीका 2 • बिलिंग स्क्रीन',
            title: 'बिलिंग टैब पर जाएं',
            descHindi: 'बिलिंग काउंटर खोलने के लिए नीचे बिलिंग बटन दबाएं।',
            speechText: 'सर्च करके सुपर-फास्ट बिल बनाने के लिए बिलिंग टैब खोलें।',
            pointerAction: 'tap',
            preferredPosition: 'top',
          },
          {
            targetId: 'billing-search-input',
            fallbackTargetIds: ['billing-search-bar', 'billing-search-box', 'billing-quick-product-card-0'],
            badge: 'सर्च बार • टाइप करें',
            title: 'सर्च बार में सामान का नाम टाइप करें',
            descHindi: 'यहाँ नाम या रेट टाइप करें, जैसे "दूध" या "चाय"। सामान तुरंत सामने आ जाएगा।',
            speechText: 'सर्च बार में सामान का नाम टाइप करें, जैसे दूध, तेल या चीनी। सामान तुरंत सामने आ जाएगा।',
            pointerAction: 'type',
            preferredPosition: 'bottom',
            tapTargetPoint: 'search-input',
          },
          {
            targetId: 'billing-save-bill-btn',
            fallbackTargetIds: ['billing-primary-action-btn', 'smart-cash-assistant-toggle-btn'],
            badge: 'फाइनल बिल',
            title: 'बिल सुरक्षित करें (Save Bill)',
            descHindi: 'सामान चुनने के बाद "SAVE BILL" दबाकर तुरंत बिल प्रिंट या शेयर करें।',
            speechText: 'सामान चुनने के बाद सेव बिल का बटन दबाएं और पक्की पर्ची निकालें।',
            pointerAction: 'click',
            preferredPosition: 'top',
          },
        ];

      case 'make_bill_all_items':
        return [
          {
            targetId: 'tour-nav-billing-tab',
            fallbackTargetIds: ['nav-billing-btn'],
            badge: 'तरीका 3 • बिलिंग स्क्रीन',
            title: 'बिलिंग काउंटर खोलें',
            descHindi: 'नीचे दिए गए बिलिंग टैब पर क्लिक करें।',
            speechText: 'दुकान के पूरे कैटलॉग से बिल बनाने के लिए बिलिंग स्क्रीन पर आएं।',
            pointerAction: 'tap',
            preferredPosition: 'top',
          },
          {
            targetId: 'billing-view-all-items-btn',
            fallbackTargetIds: ['billing-all-items-btn'],
            badge: 'ऑल आइटम्स • पूरा कैटलॉग',
            title: '"View All Items (सभी सामान देखें)" बटन',
            descHindi: 'इस बड़े बटन पर क्लिक करके अपनी दुकान का पूरा कैटलॉग एक साथ खोलें।',
            speechText: 'यहाँ व्यू ऑल आइटम्स बटन दबाएं। आपकी दुकान की पूरी लिस्ट एक साथ खुल जाएगी।',
            pointerAction: 'click',
            preferredPosition: 'bottom',
          },
          {
            targetId: 'catalog-item-card-0',
            fallbackTargetIds: ['billing-view-all-items-btn', 'catalog-item-card-1'],
            badge: 'कैटलॉग से चयन',
            title: 'सामान पर टैप करें या मात्रा (+ / -) सेट करें',
            descHindi: 'कैटलॉग में किसी भी सामान पर टैप करके तुरंत बिल में जोड़ें और डन दबाएं।',
            speechText: 'कैटलॉग में जिस भी सामान का बिल बनाना है, उस पर टैप करें और डन दबाएं।',
            pointerAction: 'click',
            preferredPosition: 'bottom',
          },
        ];

      default:
        return [];
    }
  }, [tutorialType]);

  // Synchronize tabs and modal states when active tutorial step updates
  useEffect(() => {
    if (!isOpen) return;

    if (tutorialType === 'add_product') {
      if (currentStepIndex === 0) {
        onNavigateTab?.('home');
        onCloseVoiceAssistant?.();
      } else if (currentStepIndex === 1) {
        // Automatically open voice assistant modal for step 2
        onOpenVoiceAssistant?.();
      }
    } else if (
      tutorialType === 'make_bill_dashboard' ||
      tutorialType === 'make_bill_search' ||
      tutorialType === 'make_bill_all_items'
    ) {
      if (currentStepIndex >= 1) {
        // Automatically switch to billing tab if entering step 1 or later
        onNavigateTab?.('billing');
      }
    }
  }, [isOpen, currentStepIndex, tutorialType, onNavigateTab, onOpenVoiceAssistant, onCloseVoiceAssistant]);

  // Reset step index when tutorial opens or changes
  useEffect(() => {
    if (isOpen) {
      setCurrentStepIndex(0);
    } else {
      tutorialSoundService.stopSpeech();
    }
  }, [isOpen, tutorialType]);

  // Dynamic getBoundingClientRect() real-time tracking loop (runs on EVERY animation frame)
  useEffect(() => {
    if (!isOpen) return;

    const currentStep = steps[currentStepIndex];
    if (!currentStep) return;

    let animFrameId: number;
    let isTracking = true;
    let hasScrolled = false;

    const trackElementPosition = () => {
      if (!isTracking) return;

      const bounds = resolveDynamicTargetBounds(
        currentStep.targetId,
        currentStep.fallbackTargetIds
      );

      if (bounds) {
        // Calculate contact point
        let targetX = bounds.cx;
        let targetY = bounds.cy;

        // Custom pinpointing for wide elements like search input
        if (currentStep.tapTargetPoint === 'search-input' || (currentStep.targetId.includes('search') && bounds.width > 160)) {
          // Point finger to the typing zone (left-center) of the search input
          targetX = bounds.left + Math.min(bounds.width * 0.28, 90);
          targetY = bounds.cy;
        }

        const handLeft = targetX - FINGER_TIP_X;
        const handTop = targetY - FINGER_TIP_Y;

        // Directly update DOM styles with 0-latency hardware acceleration
        if (handContainerRef.current) {
          handContainerRef.current.style.transform = `translate3d(${handLeft}px, ${handTop}px, 0)`;
          handContainerRef.current.style.opacity = '1';
        }

        if (focusRingRef.current) {
          focusRingRef.current.style.transform = `translate3d(${bounds.left - 6}px, ${bounds.top - 6}px, 0)`;
          focusRingRef.current.style.width = `${bounds.width + 12}px`;
          focusRingRef.current.style.height = `${bounds.height + 12}px`;
          focusRingRef.current.style.opacity = '1';
        }

        if (clickTargetRef.current) {
          clickTargetRef.current.style.transform = `translate3d(${bounds.left - 6}px, ${bounds.top - 6}px, 0)`;
          clickTargetRef.current.style.width = `${bounds.width + 12}px`;
          clickTargetRef.current.style.height = `${bounds.height + 12}px`;
        }

        if (holeRectRef.current) {
          holeRectRef.current.setAttribute('x', String(Math.max(0, bounds.left - 6)));
          holeRectRef.current.setAttribute('y', String(Math.max(0, bounds.top - 6)));
          holeRectRef.current.setAttribute('width', String(bounds.width + 12));
          holeRectRef.current.setAttribute('height', String(bounds.height + 12));
        }

        // Keep React state updated for tooltip alignment (throttled to avoid redundant re-renders)
        setTargetRect((prev) => {
          if (
            !prev ||
            Math.abs(prev.left - bounds.left) > 1 ||
            Math.abs(prev.top - bounds.top) > 1 ||
            Math.abs(prev.width - bounds.width) > 1 ||
            Math.abs(prev.height - bounds.height) > 1
          ) {
            return bounds;
          }
          return prev;
        });

        // Smoothly center element into viewport on first lock of this step
        if (!hasScrolled && bounds.element) {
          hasScrolled = true;
          try {
            bounds.element.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
          } catch {}
        }
      } else {
        // Fallback viewport center if element is temporarily unmounted
        const vw = typeof window !== 'undefined' ? window.innerWidth : 400;
        const vh = typeof window !== 'undefined' ? window.innerHeight : 800;
        const fallbackBounds: DynamicTargetBounds = {
          top: vh / 2 - 40,
          left: vw / 2 - 75,
          right: vw / 2 + 75,
          bottom: vh / 2 + 40,
          width: 150,
          height: 80,
          cx: vw / 2,
          cy: vh / 2,
          element: null,
        };

        const handLeft = fallbackBounds.cx - FINGER_TIP_X;
        const handTop = fallbackBounds.cy - FINGER_TIP_Y;

        if (handContainerRef.current) {
          handContainerRef.current.style.transform = `translate3d(${handLeft}px, ${handTop}px, 0)`;
        }
        if (focusRingRef.current) {
          focusRingRef.current.style.transform = `translate3d(${fallbackBounds.left - 6}px, ${fallbackBounds.top - 6}px, 0)`;
          focusRingRef.current.style.width = `${fallbackBounds.width + 12}px`;
          focusRingRef.current.style.height = `${fallbackBounds.height + 12}px`;
        }

        setTargetRect(fallbackBounds);
      }

      animFrameId = requestAnimationFrame(trackElementPosition);
    };

    // Start 60fps tracking loop
    animFrameId = requestAnimationFrame(trackElementPosition);

    // Track on scroll and window resize events
    const handleEvents = () => {
      trackElementPosition();
    };

    window.addEventListener('resize', handleEvents, { passive: true });
    window.addEventListener('scroll', handleEvents, { capture: true, passive: true });

    // Play synthesized Hindi Male Voice narration in background
    if (autoStartSpeech) {
      tutorialSoundService.playStepAudio(tutorialType, currentStepIndex, currentStep.speechText);
    }

    return () => {
      isTracking = false;
      cancelAnimationFrame(animFrameId);
      window.removeEventListener('resize', handleEvents);
      window.removeEventListener('scroll', handleEvents, true);
    };
  }, [isOpen, currentStepIndex, tutorialType, steps, autoStartSpeech]);

  // Periodic tactile tap audio cue in sync with the hand motion
  useEffect(() => {
    if (!isOpen || isVoiceMuted) return;

    const tapSoundInterval = setInterval(() => {
      tutorialSoundService.playTapSound();
    }, 1000);

    return () => clearInterval(tapSoundInterval);
  }, [isOpen, isVoiceMuted]);

  // Cleanup speech on unmount
  useEffect(() => {
    return () => {
      tutorialSoundService.stopSpeech();
    };
  }, []);

  if (!isOpen) return null;

  const currentStep = steps[currentStepIndex];
  if (!currentStep) return null;

  const isLastStep = currentStepIndex === steps.length - 1;

  const handleNextStep = () => {
    tutorialSoundService.stopSpeech();
    if (isLastStep) {
      tutorialSoundService.playSuccessChime();
      if (nextTutorial && onNextTutorial) {
        onNextTutorial();
      } else if (onComplete) {
        onComplete();
      } else if (onClose) {
        onClose();
      }
    } else {
      tutorialSoundService.playStepChime();
      setCurrentStepIndex((prev) => prev + 1);
    }
  };

  const handlePrevStep = () => {
    if (currentStepIndex > 0) {
      tutorialSoundService.stopSpeech();
      tutorialSoundService.playStepChime();
      // If moving back to step 0 in add_product, close modal
      if (tutorialType === 'add_product' && currentStepIndex === 1) {
        onCloseVoiceAssistant?.();
      }
      setCurrentStepIndex((prev) => prev - 1);
    }
  };

  const toggleMute = () => {
    tutorialSoundService.toggleMute();
  };

  const replayCurrentAudio = () => {
    tutorialSoundService.playStepAudio(tutorialType, currentStepIndex, currentStep.speechText);
  };

  // Tooltip position calculation
  const getTooltipStyle = () => {
    if (!targetRect) return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };

    const screenW = window.innerWidth;
    const screenH = window.innerHeight;
    const padding = 16;
    const tooltipW = Math.min(360, screenW - padding * 2);

    let top = targetRect.bottom + 22;
    let left = targetRect.cx - tooltipW / 2;

    // Boundary clamps
    if (left < padding) left = padding;
    if (left + tooltipW > screenW - padding) left = screenW - tooltipW - padding;

    // If bottom overflow, place above target
    if (top + 230 > screenH) {
      top = Math.max(padding, targetRect.top - 240);
    }

    return {
      top: `${Math.max(padding, top)}px`,
      left: `${left}px`,
      width: `${tooltipW}px`,
    };
  };

  const initialHandLeft = targetRect ? targetRect.cx - FINGER_TIP_X : 0;
  const initialHandTop = targetRect ? targetRect.cy - FINGER_TIP_Y : 0;

  return (
    <div className="fixed inset-0 z-[9999] pointer-events-auto select-none overflow-hidden font-sans">
      {/* Dark Dimmer Backdrop with Dynamic Cutout Effect */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none transition-all duration-150">
        <defs>
          <mask id="tutorial-overlay-hole-mask">
            {/* White covers all (opaque mask) */}
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {/* Cutout hole updated directly on every frame */}
            <rect
              ref={holeRectRef}
              x={targetRect ? Math.max(0, targetRect.left - 6) : 0}
              y={targetRect ? Math.max(0, targetRect.top - 6) : 0}
              width={targetRect ? targetRect.width + 12 : 0}
              height={targetRect ? targetRect.height + 12 : 0}
              rx="14"
              fill="black"
            />
          </mask>
        </defs>
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="rgba(4, 7, 18, 0.78)"
          mask="url(#tutorial-overlay-hole-mask)"
        />
      </svg>

      {/* Target Focus Ring Indicator (Pulsing High-Precision Outline) */}
      <div
        ref={focusRingRef}
        className="absolute pointer-events-none transition-all duration-75 ease-out z-[10000]"
        style={{
          transform: `translate3d(${targetRect ? targetRect.left - 6 : 0}px, ${targetRect ? targetRect.top - 6 : 0}px, 0)`,
          width: `${targetRect ? targetRect.width + 12 : 0}px`,
          height: `${targetRect ? targetRect.height + 12 : 0}px`,
          borderRadius: '14px',
          opacity: targetRect ? 1 : 0,
        }}
      >
        <div className="absolute inset-0 rounded-[14px] border-2 border-amber-400 shadow-[0_0_24px_rgba(251,191,36,0.85)] animate-pulse" />
        <motion.div
          animate={{ scale: [1, 1.08, 1], opacity: [0.7, 0.2, 0.7] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute inset-0 rounded-[14px] border-2 border-indigo-400"
        />
      </div>

      {/* Transparent Click Target directly on highlighted element */}
      <div
        ref={clickTargetRef}
        onClick={() => {
          tutorialSoundService.playTapSound();
          handleNextStep();
        }}
        className="absolute cursor-pointer z-[10003] rounded-[14px] active:bg-amber-400/20 transition-colors"
        style={{
          transform: `translate3d(${targetRect ? targetRect.left - 6 : 0}px, ${targetRect ? targetRect.top - 6 : 0}px, 0)`,
          width: `${targetRect ? targetRect.width + 12 : 0}px`,
          height: `${targetRect ? targetRect.height + 12 : 0}px`,
        }}
        title="यहाँ टैप करें"
      />

      {/* Precise Animated Hand Gesture SVG (Dynamically pinned to getBoundingClientRect on every frame) */}
      <div
        ref={handContainerRef}
        className="absolute pointer-events-none z-[10001]"
        style={{
          transform: `translate3d(${initialHandLeft}px, ${initialHandTop}px, 0)`,
          width: `${HAND_SVG_SIZE}px`,
          height: `${HAND_SVG_SIZE}px`,
          opacity: targetRect ? 1 : 0,
        }}
      >
        {/* Touch Point Ripple directly at the exact fingertip coordinate */}
        <div
          className="absolute pointer-events-none"
          style={{
            left: `${FINGER_TIP_X}px`,
            top: `${FINGER_TIP_Y}px`,
          }}
        >
          <motion.div
            animate={{ scale: [0.2, 2.3], opacity: [0.95, 0] }}
            transition={{ duration: 1.0, repeat: Infinity, ease: 'easeOut' }}
            className="absolute -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-amber-400/80 border-2 border-white pointer-events-none shadow-[0_0_14px_rgba(251,191,36,0.95)]"
          />
          <motion.div
            animate={{ scale: [0.1, 1.3], opacity: [0.85, 0] }}
            transition={{ duration: 1.0, repeat: Infinity, ease: 'easeOut', delay: 0.12 }}
            className="absolute -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white pointer-events-none"
          />
        </div>

        {/* Animated Realistic Hand SVG: Anchored precisely at fingertip contact point */}
        <motion.div
          style={{
            transformOrigin: `${FINGER_TIP_X}px ${FINGER_TIP_Y}px`,
          }}
          animate={{
            scale: [1, 0.93, 1],
            rotate: [0, -2.5, 0],
          }}
          transition={{
            duration: 1.0,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className="relative w-full h-full"
        >
          <svg
            width={HAND_SVG_SIZE}
            height={HAND_SVG_SIZE}
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="filter drop-shadow-[0_10px_22px_rgba(0,0,0,0.75)]"
          >
            <defs>
              <linearGradient id="handGoldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#fef08a" />
                <stop offset="45%" stopColor="#f59e0b" />
                <stop offset="100%" stopColor="#d97706" />
              </linearGradient>
            </defs>
            {/* Pointing Index Finger Hand with tip at (10.04, 2.0) */}
            <path
              d="M10 2C9.44772 2 9 2.44772 9 3V11.2C8.6 11.08 8.18 11 7.75 11C6.23 11 5 12.23 5 13.75C5 14.52 5.32 15.22 5.84 15.72L9.42 19.3C10.58 20.46 12.16 21.11 13.8 21.11H15.5C18.54 21.11 21 18.65 21 15.61V11C21 10.45 20.55 10 20 10C19.45 10 19 10.45 19 11V12H18.5V9C18.5 8.45 18.05 8 17.5 8C16.95 8 16.5 8.45 16.5 9V12H16V7C16 6.45 15.55 6 15 6C14.45 6 14 6.45 14 7V12H13.5V3C13.5 2.45 13.05 2 12.5 2C12.22 2 11.97 2.11 11.79 2.29C11.61 2.11 11.36 2 11.08 2H10Z"
              fill="url(#handGoldGrad)"
              stroke="#78350f"
              strokeWidth="1.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>

          {/* Floating Action Badge Tag (👆 यहाँ टैप करें) */}
          <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full bg-amber-500 text-amber-950 font-black text-[9.5px] uppercase tracking-wider shadow-lg border border-amber-300 whitespace-nowrap animate-bounce flex items-center gap-1">
            <span>{currentStep.pointerAction === 'type' ? '⌨️' : '👆'}</span>
            <span>{currentStep.pointerAction === 'type' ? 'टाइप करें' : 'यहाँ टैप करें'}</span>
          </div>
        </motion.div>
      </div>

      {/* Floating Tutorial Instruction Dialog Card */}
      <motion.div
        key={`card-${tutorialType}-${currentStepIndex}`}
        initial={{ opacity: 0, y: 15, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -10 }}
        style={getTooltipStyle()}
        className="absolute z-[10002] rounded-2xl bg-zinc-900/95 border-2 border-amber-500/80 shadow-[0_20px_60px_rgba(0,0,0,0.85)] text-white p-4.5 backdrop-blur-xl"
      >
        {/* Header Row */}
        <div className="flex items-center justify-between gap-2 border-b border-zinc-800 pb-2.5 mb-2.5">
          <div className="flex items-center gap-1.5">
            <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[9px] font-black uppercase tracking-wider">
              {currentStep.badge}
            </span>
            {isSpeaking && (
              <span className="flex items-center gap-1 text-[9px] text-emerald-400 font-bold animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                पुरुष आवाज़ में बोल रहे हैं...
              </span>
            )}
          </div>

          <div className="flex items-center gap-1">
            {/* Audio Voice Mute/Unmute */}
            <button
              onClick={toggleMute}
              className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors cursor-pointer border border-zinc-700"
              title={isVoiceMuted ? 'आवाज़ चालू करें' : 'आवाज़ बंद करें'}
            >
              {isVoiceMuted ? <VolumeX size={14} className="text-rose-400" /> : <Volume2 size={14} className="text-amber-400" />}
            </button>
            {/* Re-play voice instruction */}
            <button
              onClick={replayCurrentAudio}
              className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors cursor-pointer border border-zinc-700"
              title="दोबारा सुनें"
            >
              <RotateCcw size={14} />
            </button>
            {/* Close Tutorial */}
            <button
              onClick={handleClose}
              className="p-1.5 rounded-lg bg-zinc-800 hover:bg-rose-500/20 text-zinc-400 hover:text-rose-400 transition-colors cursor-pointer border border-zinc-700"
              title="ट्यूटोरियल बंद करें"
            >
              <X size={14} />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="space-y-1.5 text-left mb-4">
          <h3 className="text-sm font-black text-white flex items-center gap-1.5 leading-snug">
            <Sparkles size={14} className="text-amber-400 shrink-0" />
            <span>{currentStep.title}</span>
          </h3>
          <p className="text-xs text-zinc-300 font-medium leading-relaxed">
            {currentStep.descHindi}
          </p>
        </div>

        {/* Step Progress Dots & Navigation Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-zinc-800 gap-2">
          {/* Dots */}
          <div className="flex items-center gap-1">
            {steps.map((_, idx) => (
              <span
                key={idx}
                className={`h-1.5 rounded-full transition-all ${
                  idx === currentStepIndex
                    ? 'w-5 bg-amber-400'
                    : 'w-1.5 bg-zinc-700'
                }`}
              />
            ))}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {currentStepIndex > 0 && (
              <button
                type="button"
                onClick={handlePrevStep}
                className="px-2.5 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[11px] font-bold transition-all cursor-pointer border border-zinc-700"
              >
                पिछला
              </button>
            )}

            <button
              type="button"
              onClick={handleNextStep}
              className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-zinc-950 font-black text-[11px] uppercase tracking-wider shadow-lg flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
            >
              <span>{isLastStep ? (nextTutorial?.title || nextTutorialTitle ? 'अगला ट्यूटोरियल' : 'समाप्त करें') : 'आगे बढ़ें'}</span>
              <ArrowRight size={13} strokeWidth={2.5} />
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
