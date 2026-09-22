import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, ChevronRight, Volume2, VolumeX, RotateCcw, 
  Sparkles, CheckCircle2, Mic, ShoppingBag, Search, Layers, Hand
} from 'lucide-react';
import { cn } from '../lib/utils';
import { AnimatedGestureHand, GestureType } from './AnimatedGestureHand';
import { speakHindi, stopHindiSpeech, isVoiceMuted, setVoiceMuted } from '../services/hindiVoiceService';

export type TutorialFlowType = 
  | 'voice_add_product' 
  | 'create_bill_method1' 
  | 'create_bill_method2' 
  | 'create_bill_method3' 
  | 'initial_welcome_flow';

export interface TutorialStep {
  id: string;
  targetId: string;
  fallbackPosition?: 'center' | 'bottom-right';
  title: string;
  hindiTitle: string;
  hindiInstruction: string;
  hindiVoice: string;
  gesture: GestureType;
  gestureLabel: string;
  badge?: string;
  icon?: React.ReactNode;
}

const FLOWS_CONFIG: Record<TutorialFlowType, { name: string; hindiName: string; steps: TutorialStep[] }> = {
  // 1. ADD PRODUCTS: ONLY via Voice Product Assistant method
  voice_add_product: {
    name: "How to Add Products (Voice Assistant)",
    hindiName: "प्रोडक्ट की एंट्री कैसे करें (वॉइस असिस्टेंट)",
    steps: [
      {
        id: "vap_step_1",
        targetId: "floating-voice-product-assistant-mic-btn",
        title: "Tap Floating Mic Button",
        hindiTitle: "वॉइस असिस्टेंट माइक बटन पर टैप करें",
        hindiInstruction: "नया प्रोडक्ट जोड़ने के लिए स्क्रीन के नीचे चमकते हुए माइक बटन पर टैप करें।",
        hindiVoice: "नया प्रोडक्ट जोड़ने के लिए स्क्रीन के नीचे चमकते हुए माइक बटन पर टैप करें।",
        gesture: "tap",
        gestureLabel: "माइक पर टैप करें",
        badge: "कदम 1 / 3",
        icon: <Mic size={16} className="text-amber-400" />
      },
      {
        id: "vap_step_2",
        targetId: "floating-voice-product-assistant-mic-btn",
        fallbackPosition: "center",
        title: "Speak Product Details",
        hindiTitle: "माइक में बोलकर बताएं",
        hindiInstruction: "माइक शुरू होने पर बोलें, जैसे: '1 किलो चीनी 45 रुपये' या '10 पीस पारले जी 5 रुपये'। असिस्टेंट नाम, मात्रा और भाव खुद समझ लेगा!",
        hindiVoice: "माइक शुरू होने पर बोलें, जैसे एक किलो चीनी 45 रुपये या 10 पीस पारले जी 5 रुपये। असिस्टेंट नाम, मात्रा और भाव खुद समझ लेगा।",
        gesture: "tap",
        gestureLabel: "बोलें: नाम + मात्रा + भाव",
        badge: "कदम 2 / 3",
        icon: <Sparkles size={16} className="text-yellow-400" />
      },
      {
        id: "vap_step_3",
        targetId: "ticket-receipt-list",
        fallbackPosition: "center",
        title: "Auto-Save to Inventory",
        hindiTitle: "ऑटो-सेव और इन्वेंट्री",
        hindiInstruction: "प्रोडक्ट की पूरी जानकारी अपने आप भर जाएगी और वह आपकी दुकान की लिस्ट में तुरंत सेव हो जाएगा।",
        hindiVoice: "प्रोडक्ट की पूरी जानकारी अपने आप भर जाएगी और वह आपकी दुकान की लिस्ट में तुरंत सेव हो जाएगा।",
        gesture: "tap",
        gestureLabel: "सेव और तैयार",
        badge: "कदम 3 / 3",
        icon: <CheckCircle2 size={16} className="text-emerald-400" />
      }
    ]
  },

  // 2. CREATE BILL - METHOD 1: Main Billing Dashboard (Item card tap)
  create_bill_method1: {
    name: "Create Bill: Main Dashboard",
    hindiName: "बिल कैसे बनाएं: मुख्य डैशबोर्ड से",
    steps: [
      {
        id: "cbm1_step_1",
        targetId: "dashboard-first-item-card",
        title: "Tap on Product Card",
        hindiTitle: "आइटम कार्ड पर टैप करें",
        hindiInstruction: "डैशबोर्ड पर किसी भी आइटम कार्ड पर एक बार टैप करें। यह आइटम तुरंत आपके बिल में जुड़ जाएगा।",
        hindiVoice: "डैशबोर्ड पर किसी भी आइटम कार्ड पर एक बार टैप करें। यह आइटम तुरंत आपके बिल में जुड़ जाएगा।",
        gesture: "tap",
        gestureLabel: "कार्ड पर टैप करें",
        badge: "कदम 1 / 3",
        icon: <ShoppingBag size={16} className="text-blue-400" />
      },
      {
        id: "cbm1_step_2",
        targetId: "ticket-receipt-list",
        title: "Review Receipt & Quantity",
        hindiTitle: "रसीद लिस्ट में मात्रा जांचें",
        hindiInstruction: "यहाँ आपके बिल की रसीद दिखेगी। आप यहाँ से मात्रा (+) या (-) कर सकते हैं।",
        hindiVoice: "यहाँ आपके बिल की रसीद दिखेगी। आप यहाँ से मात्रा बढ़ा सकते हैं या घटा सकते हैं।",
        gesture: "tap",
        gestureLabel: "रसीद लिस्ट",
        badge: "कदम 2 / 3",
        icon: <Layers size={16} className="text-purple-400" />
      },
      {
        id: "cbm1_step_3",
        targetId: "billing-save-bill-btn",
        title: "Save & Finalize Bill",
        hindiTitle: "बिल सेव करें (SAVE BILL)",
        hindiInstruction: "बिल पूरा होने पर 'SAVE BILL' बटन पर टैप करें। बिल सेव होकर तुरंत तैयार हो जाएगा!",
        hindiVoice: "बिल पूरा होने पर SAVE BILL बटन पर टैप करें। बिल सेव होकर तुरंत तैयार हो जाएगा।",
        gesture: "tap",
        gestureLabel: "SAVE BILL दबाएं",
        badge: "कदम 3 / 3",
        icon: <CheckCircle2 size={16} className="text-emerald-400" />
      }
    ]
  },

  // 3. CREATE BILL - METHOD 2: Through Search Bar (Amount & Quantity)
  create_bill_method2: {
    name: "Create Bill: Search Bar (Qty & Amount)",
    hindiName: "बिल कैसे बनाएं: सर्च बार से (मात्रा और रुपये)",
    steps: [
      {
        id: "cbm2_step_1",
        targetId: "billing-search-input",
        title: "Tap Search Bar",
        hindiTitle: "सर्च बार में टाइप करें",
        hindiInstruction: "सर्च बार में आप नाम लिखकर या सीधे मात्रा और रुपये के साथ प्रोडक्ट सर्च कर सकते हैं।",
        hindiVoice: "सर्च बार में आप नाम लिखकर या सीधे मात्रा और रुपये के साथ प्रोडक्ट सर्च कर सकते हैं।",
        gesture: "tap",
        gestureLabel: "सर्च बार में टैप करें",
        badge: "कदम 1 / 4",
        icon: <Search size={16} className="text-amber-400" />
      },
      {
        id: "cbm2_step_2",
        targetId: "billing-search-input",
        title: "Method A: Using Quantity (मात्रा)",
        hindiTitle: "मात्रा (Quantity) का उपयोग करके",
        hindiInstruction: "उदाहरण: '2 kg Chini' या '5 Pcs Parle' लिखें और एंटर दबाएं। सिस्टम अपने आप उतनी मात्रा जोड़ लेगा!",
        hindiVoice: "मात्रा के लिए, उदाहरण: दो किलो चीनी या पांच पीस पारले लिखें और एंटर दबाएं। सिस्टम अपने आप उतनी मात्रा जोड़ लेगा।",
        gesture: "tap",
        gestureLabel: "उदा. '2 kg Chini' या '5 Pcs'",
        badge: "कदम 2 / 4",
        icon: <Sparkles size={16} className="text-blue-400" />
      },
      {
        id: "cbm2_step_3",
        targetId: "billing-search-input",
        title: "Method B: Using Amount (रुपये)",
        hindiTitle: "रुपये / अमाउंट (Budget) का उपयोग करके",
        hindiInstruction: "उदाहरण: '50 rs Chini' या '100 rs Tel' लिखें। सिस्टम उस रुपये के हिसाब से सही वजन खुद कैलकुलेट कर लेगा!",
        hindiVoice: "रुपये के हिसाब से, उदाहरण: 50 rs Chini या 100 rs Tel लिखें। सिस्टम उस रुपये के हिसाब से सही वजन खुद कैलकुलेट कर लेगा।",
        gesture: "tap",
        gestureLabel: "उदा. '50 rs Chini'",
        badge: "कदम 3 / 4",
        icon: <Sparkles size={16} className="text-amber-400" />
      },
      {
        id: "cbm2_step_4",
        targetId: "billing-save-bill-btn",
        title: "Save Bill",
        hindiTitle: "बिल सेव करें",
        hindiInstruction: "आइटम जुड़ने के बाद नीचे 'SAVE BILL' बटन पर क्लिक करके बिल पूरा करें।",
        hindiVoice: "आइटम जुड़ने के बाद नीचे SAVE BILL बटन पर क्लिक करके बिल पूरा करें।",
        gesture: "tap",
        gestureLabel: "SAVE BILL दबाएं",
        badge: "कदम 4 / 4",
        icon: <CheckCircle2 size={16} className="text-emerald-400" />
      }
    ]
  },

  // 4. CREATE BILL - METHOD 3: Through 'All Items' (Click & Long-press / Hold)
  create_bill_method3: {
    name: "Create Bill: All Items (Click & Hold)",
    hindiName: "बिल कैसे बनाएं: All Items (क्लिक और लॉन्ग प्रेस)",
    steps: [
      {
        id: "cbm3_step_1",
        targetId: "billing-view-all-items-btn",
        title: "Open All Items Catalog",
        hindiTitle: "VIEW ALL ITEMS बटन दबाएं",
        hindiInstruction: "दुकान के सभी प्रोडक्ट्स की पूरी लिस्ट देखने के लिए 'VIEW ALL ITEMS' बटन पर टैप करें।",
        hindiVoice: "दुकान के सभी प्रोडक्ट्स की पूरी लिस्ट देखने के लिए VIEW ALL ITEMS बटन पर टैप करें।",
        gesture: "tap",
        gestureLabel: "VIEW ALL ITEMS",
        badge: "कदम 1 / 4",
        icon: <Layers size={16} className="text-indigo-400" />
      },
      {
        id: "cbm3_step_2",
        targetId: "billing-view-all-items-btn",
        title: "Single Tap to Add 1 Qty",
        hindiTitle: "सिंगल क्लिक / टैप करके जोड़ना",
        hindiInstruction: "कैटलॉग में किसी भी आइटम कार्ड पर 1 बार टैप करें। यह तुरंत 1 पीस या डिफॉल्ट मात्रा के साथ बिल में जुड़ जाएगा।",
        hindiVoice: "कैटलॉग में किसी भी आइटम कार्ड पर एक बार टैप करें। यह तुरंत एक पीस या डिफॉल्ट मात्रा के साथ बिल में जुड़ जाएगा।",
        gesture: "tap",
        gestureLabel: "एक बार टैप करें (1 Qty)",
        badge: "कदम 2 / 4",
        icon: <ShoppingBag size={16} className="text-blue-400" />
      },
      {
        id: "cbm3_step_3",
        targetId: "billing-view-all-items-btn",
        title: "Press & Hold for Quick Weight",
        hindiTitle: "प्रेस और होल्ड (लॉन्ग प्रेस से त्वरित वजन)",
        hindiInstruction: "आइटम कार्ड को 1 सेकंड तक दबाकर रखें (Hold)। इससे क्विक वेट विंडो खुलेगी जहाँ से 250g, 500g, या 1kg तुरंत चुन सकते हैं!",
        hindiVoice: "आइटम कार्ड को एक सेकंड तक दबाकर रखें। इससे क्विक वेट विंडो खुलेगी जहाँ से 250 ग्राम, 500 ग्राम, या 1 किलो तुरंत चुन सकते हैं।",
        gesture: "hold",
        gestureLabel: "1 सेकंड दबाकर रखें (Hold)",
        badge: "कदम 3 / 4",
        icon: <Hand size={16} className="text-amber-400" />
      },
      {
        id: "cbm3_step_4",
        targetId: "billing-save-bill-btn",
        title: "Complete & Save Bill",
        hindiTitle: "बिल सेव करें",
        hindiInstruction: "आइटम्स चुनने के बाद 'SAVE BILL' बटन दबाकर ग्राहक की रसीद तैयार करें।",
        hindiVoice: "आइटम्स चुनने के बाद SAVE BILL बटन दबाकर ग्राहक की रसीद तैयार करें।",
        gesture: "tap",
        gestureLabel: "SAVE BILL दबाएं",
        badge: "कदम 4 / 4",
        icon: <CheckCircle2 size={16} className="text-emerald-400" />
      }
    ]
  },

  // 5. INITIAL WELCOME FLOW (After Sign In / Sign Up)
  // Combines "How to add products (Voice Assistant)" + "How to create bill (Method 1: Dashboard tap)"
  initial_welcome_flow: {
    name: "Quick Store Starter Tour",
    hindiName: "शुरुआती ट्यूटोरियल: प्रोडक्ट जोड़ना और बिल बनाना",
    steps: [
      // Part A: How to add products (Voice Assistant)
      {
        id: "init_step_1",
        targetId: "floating-voice-product-assistant-mic-btn",
        title: "Step 1: Voice Product Assistant",
        hindiTitle: "1. नया प्रोडक्ट जोड़ें (वॉइस असिस्टेंट)",
        hindiInstruction: "दुकान में नया प्रोडक्ट जोड़ने के लिए इस चमकते हुए माइक बटन पर टैप करें।",
        hindiVoice: "नमस्ते! दुकान में नया प्रोडक्ट जोड़ने के लिए इस चमकते हुए माइक बटन पर टैप करें।",
        gesture: "tap",
        gestureLabel: "माइक बटन पर टैप करें",
        badge: "प्रोडक्ट जोड़ना (1/5)",
        icon: <Mic size={16} className="text-amber-400" />
      },
      {
        id: "init_step_2",
        targetId: "floating-voice-product-assistant-mic-btn",
        fallbackPosition: "center",
        title: "Step 2: Speak Item Name & Price",
        hindiTitle: "2. माइक में बोलें (उदा. 1 किलो चीनी 45 रु)",
        hindiInstruction: "माइक शुरू होने पर बोलें, जैसे: '1 किलो चीनी 45 रुपये'। असिस्टेंट नाम, मात्रा और भाव खुद दर्ज कर लेगा!",
        hindiVoice: "माइक शुरू होने पर बोलें, जैसे एक किलो चीनी 45 रुपये। असिस्टेंट नाम, मात्रा और भाव खुद दर्ज कर लेगा।",
        gesture: "tap",
        gestureLabel: "बोलकर प्रोडक्ट बनाएं",
        badge: "प्रोडक्ट जोड़ना (2/5)",
        icon: <Sparkles size={16} className="text-yellow-400" />
      },
      // Part B: How to create bill (Method 1: Main Dashboard tap)
      {
        id: "init_step_3",
        targetId: "dashboard-first-item-card",
        title: "Step 3: Tap Item Card to Bill",
        hindiTitle: "3. बिल बनाना: आइटम कार्ड पर टैप करें",
        hindiInstruction: "डैशबोर्ड पर किसी भी आइटम कार्ड पर एक बार टैप करें। यह तुरंत आपके बिल में जुड़ जाएगा।",
        hindiVoice: "अब बिल बनाने के लिए, डैशबोर्ड पर किसी भी आइटम कार्ड पर एक बार टैप करें। यह तुरंत आपके बिल में जुड़ जाएगा।",
        gesture: "tap",
        gestureLabel: "आइटम कार्ड पर टैप करें",
        badge: "बिल बनाना (3/5)",
        icon: <ShoppingBag size={16} className="text-blue-400" />
      },
      {
        id: "init_step_4",
        targetId: "ticket-receipt-list",
        title: "Step 4: Ticket Receipt List",
        hindiTitle: "4. बिल रसीद और मात्रा चेक करें",
        hindiInstruction: "यहाँ आपकी रसीद दिखेगी। आप यहाँ से मात्रा घटा या बढ़ा सकते हैं।",
        hindiVoice: "यहाँ आपकी रसीद दिखेगी। आप यहाँ से मात्रा घटा या बढ़ा सकते हैं।",
        gesture: "tap",
        gestureLabel: "रसीद लिस्ट",
        badge: "बिल बनाना (4/5)",
        icon: <Layers size={16} className="text-purple-400" />
      },
      {
        id: "init_step_5",
        targetId: "billing-save-bill-btn",
        title: "Step 5: Save & Finish Bill",
        hindiTitle: "5. बिल सेव करें (SAVE BILL)",
        hindiInstruction: "बिल पूरा होने पर 'SAVE BILL' बटन पर टैप करें। बिल सेव होकर रसीद तुरंत तैयार हो जाएगी!",
        hindiVoice: "बिल पूरा होने पर SAVE BILL बटन पर टैप करें। बिल सेव होकर रसीद तुरंत तैयार हो जाएगी। बधाई हो, आपने ट्यूटोरियल पूरा कर लिया!",
        gesture: "tap",
        gestureLabel: "SAVE BILL दबाएं",
        badge: "बिल बनाना (5/5)",
        icon: <CheckCircle2 size={16} className="text-emerald-400" />
      }
    ]
  }
};

interface OnboardingOverlayTourProps {
  flow: TutorialFlowType;
  isOpen: boolean;
  onClose: () => void;
  onComplete?: () => void;
}

export const OnboardingOverlayTour: React.FC<OnboardingOverlayTourProps> = ({
  flow,
  isOpen,
  onClose,
  onComplete,
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [muted, setMuted] = useState<boolean>(() => isVoiceMuted());
  const [isSpeakingNow, setIsSpeakingNow] = useState(false);

  const config = FLOWS_CONFIG[flow] || FLOWS_CONFIG.initial_welcome_flow;
  const currentStep = config.steps[currentStepIndex] || config.steps[0];

  // Helper to locate target DOM element and measure its viewport position
  const updateTargetRect = useCallback(() => {
    if (!isOpen || !currentStep) return;

    const el = document.getElementById(currentStep.targetId);
    if (el) {
      // Smoothly scroll target into visible center if it's off-screen
      const bounding = el.getBoundingClientRect();
      const isVisible = (
        bounding.top >= 60 &&
        bounding.bottom <= (window.innerHeight - 60) &&
        bounding.left >= 10 &&
        bounding.right <= (window.innerWidth - 10)
      );

      if (!isVisible) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }

      // Re-query after slight frame delay
      requestAnimationFrame(() => {
        const freshRect = el.getBoundingClientRect();
        setTargetRect(freshRect);
      });
    } else {
      setTargetRect(null);
    }
  }, [isOpen, currentStep]);

  // Recalculate spotlight whenever step changes or window resizes/scrolls
  useEffect(() => {
    if (!isOpen) return;

    updateTargetRect();
    const handleResizeOrScroll = () => {
      updateTargetRect();
    };

    window.addEventListener('resize', handleResizeOrScroll, { passive: true });
    window.addEventListener('scroll', handleResizeOrScroll, { passive: true });

    // Periodic safety check in case DOM elements animate/expand
    const intervalId = setInterval(updateTargetRect, 400);

    return () => {
      window.removeEventListener('resize', handleResizeOrScroll);
      window.removeEventListener('scroll', handleResizeOrScroll);
      clearInterval(intervalId);
    };
  }, [isOpen, currentStepIndex, updateTargetRect]);

  // Trigger Hindi Voice Narration whenever step changes
  useEffect(() => {
    if (!isOpen || !currentStep) return;

    if (!muted) {
      speakHindi(
        currentStep.hindiVoice,
        () => setIsSpeakingNow(true),
        () => setIsSpeakingNow(false)
      );
    }

    return () => {
      stopHindiSpeech();
      setIsSpeakingNow(false);
    };
  }, [isOpen, currentStepIndex, muted, currentStep]);

  // Clean exit when closing
  const handleExit = () => {
    stopHindiSpeech();
    onClose();
  };

  const handleNext = () => {
    stopHindiSpeech();
    if (currentStepIndex < config.steps.length - 1) {
      setCurrentStepIndex(prev => prev + 1);
    } else {
      // Completed all steps
      if (onComplete) onComplete();
      onClose();
    }
  };

  const handlePrevious = () => {
    stopHindiSpeech();
    if (currentStepIndex > 0) {
      setCurrentStepIndex(prev => prev - 1);
    }
  };

  const handleReplayVoice = () => {
    if (!currentStep) return;
    speakHindi(
      currentStep.hindiVoice,
      () => setIsSpeakingNow(true),
      () => setIsSpeakingNow(false)
    );
  };

  const handleToggleMute = () => {
    const nextMuted = !muted;
    setMuted(nextMuted);
    setVoiceMuted(nextMuted);
    if (!nextMuted && currentStep) {
      speakHindi(
        currentStep.hindiVoice,
        () => setIsSpeakingNow(true),
        () => setIsSpeakingNow(false)
      );
    } else {
      stopHindiSpeech();
      setIsSpeakingNow(false);
    }
  };

  if (!isOpen || !currentStep) return null;

  // Compute spotlight style coordinates
  const padding = 10;
  const spotlightTop = targetRect ? Math.max(0, targetRect.top - padding) : null;
  const spotlightLeft = targetRect ? Math.max(0, targetRect.left - padding) : null;
  const spotlightWidth = targetRect ? targetRect.width + padding * 2 : null;
  const spotlightHeight = targetRect ? targetRect.height + padding * 2 : null;

  // Determine card placement (above or below target)
  const isTargetInUpperHalf = targetRect ? targetRect.top < window.innerHeight / 2 : true;

  return (
    <div className="fixed inset-0 z-[999] overflow-hidden select-none pointer-events-auto">
      {/* 1. Backdrop with Spotlight Cutout */}
      {targetRect && spotlightTop !== null && spotlightLeft !== null ? (
        <div
          className="fixed rounded-2xl pointer-events-none transition-all duration-300 ease-out"
          style={{
            top: `${spotlightTop}px`,
            left: `${spotlightLeft}px`,
            width: `${spotlightWidth}px`,
            height: `${spotlightHeight}px`,
            boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.72)',
            border: '2.5px solid #f59e0b',
          }}
        >
          {/* Subtle Ambient Pulse Ring around spotlight */}
          <motion.div
            animate={{
              boxShadow: [
                '0 0 0 0px rgba(245, 158, 11, 0.4)',
                '0 0 0 10px rgba(245, 158, 11, 0)',
              ],
            }}
            transition={{
              duration: 1.8,
              repeat: Infinity,
              ease: 'easeOut',
            }}
            className="absolute inset-0 rounded-2xl pointer-events-none"
          />

          {/* Animated Hand Gesture directly near or inside highlighted element */}
          <div className="absolute -bottom-8 -right-6 z-30 pointer-events-none">
            <AnimatedGestureHand
              gesture={currentStep.gesture}
              label={currentStep.gestureLabel}
            />
          </div>
        </div>
      ) : (
        // Fallback dark overlay when target DOM element is still mounting
        <div className="fixed inset-0 bg-black/75 backdrop-blur-[2px] transition-all" />
      )}

      {/* Center Hand Fallback if no targetRect */}
      {!targetRect && (
        <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 pointer-events-none">
          <AnimatedGestureHand
            gesture={currentStep.gesture}
            label={currentStep.gestureLabel}
          />
        </div>
      )}

      {/* 2. Interactive Floating Tooltip / Instruction Card */}
      <div 
        className={cn(
          "fixed left-4 right-4 md:left-auto md:right-10 z-40 flex justify-center pointer-events-auto",
          isTargetInUpperHalf ? "bottom-6 md:bottom-12" : "top-6 md:top-12"
        )}
      >
        <motion.div
          key={currentStep.id}
          initial={{ opacity: 0, y: isTargetInUpperHalf ? 25 : -25, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="w-full max-w-lg bg-zinc-950/95 border-2 border-amber-500/60 rounded-3xl p-5 md:p-6 shadow-[0_20px_60px_rgba(0,0,0,0.85)] text-white backdrop-blur-xl"
        >
          {/* Header Row: Flow badge, Steps Progress, Audio & Exit */}
          <div className="flex items-center justify-between gap-2 border-b border-zinc-800 pb-3">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                {currentStep.icon || <Sparkles size={16} />}
              </span>
              <div>
                <span className="text-[9px] font-black uppercase text-amber-400 tracking-wider block leading-none">
                  {currentStep.badge || `कदम ${currentStepIndex + 1} / ${config.steps.length}`}
                </span>
                <h4 className="text-xs font-black uppercase tracking-tight text-zinc-200 mt-0.5">
                  {config.hindiName}
                </h4>
              </div>
            </div>

            {/* Audio Toggle & Close */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleReplayVoice}
                className="p-2 rounded-xl bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-all cursor-pointer"
                title="आवाज फिर से सुनें (Replay Voice)"
              >
                <RotateCcw size={14} className={isSpeakingNow ? "animate-spin text-amber-400" : ""} />
              </button>

              <button
                type="button"
                onClick={handleToggleMute}
                className={cn(
                  "p-2 rounded-xl border transition-all cursor-pointer",
                  muted 
                    ? "bg-rose-500/20 border-rose-500/40 text-rose-300" 
                    : "bg-amber-500/20 border-amber-500/40 text-amber-300"
                )}
                title={muted ? "आवाज चालू करें (Unmute Hindi Voice)" : "आवाज बंद करें (Mute Hindi Voice)"}
              >
                {muted ? <VolumeX size={14} /> : <Volume2 size={14} className="animate-pulse" />}
              </button>

              <button
                type="button"
                onClick={handleExit}
                className="p-2 rounded-xl bg-zinc-800/80 hover:bg-rose-600/80 text-zinc-400 hover:text-white transition-all cursor-pointer ml-1"
                title="ट्यूटोरियल बंद करें (Skip / Exit)"
              >
                <X size={15} />
              </button>
            </div>
          </div>

          {/* Main Hindi Instruction Body */}
          <div className="py-3.5 space-y-1.5">
            <h3 className="text-base sm:text-lg font-black text-amber-300 leading-tight">
              {currentStep.hindiTitle}
            </h3>
            <p className="text-xs sm:text-sm text-zinc-300 font-medium leading-relaxed">
              {currentStep.hindiInstruction}
            </p>
          </div>

          {/* Bottom Action Footer */}
          <div className="flex items-center justify-between pt-2 border-t border-zinc-800/80 gap-3">
            {/* Step Dots indicator */}
            <div className="flex items-center gap-1.5">
              {config.steps.map((_, idx) => (
                <div
                  key={idx}
                  className={cn(
                    "h-1.5 rounded-full transition-all duration-300",
                    idx === currentStepIndex 
                      ? "w-5 bg-amber-400" 
                      : idx < currentStepIndex 
                        ? "w-2 bg-emerald-500" 
                        : "w-1.5 bg-zinc-700"
                  )}
                />
              ))}
            </div>

            {/* Navigation Buttons */}
            <div className="flex items-center gap-2">
              {currentStepIndex > 0 && (
                <button
                  type="button"
                  onClick={handlePrevious}
                  className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[11px] font-bold uppercase transition-all cursor-pointer"
                >
                  पीछे / Back
                </button>
              )}

              <button
                type="button"
                onClick={handleNext}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-zinc-950 font-black text-xs uppercase tracking-wider shadow-lg shadow-amber-500/20 active:scale-95 transition-all flex items-center gap-1 cursor-pointer"
              >
                <span>
                  {currentStepIndex === config.steps.length - 1 ? "समाप्त / Finish" : "अगला / Next"}
                </span>
                <ChevronRight size={14} strokeWidth={3} />
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};
