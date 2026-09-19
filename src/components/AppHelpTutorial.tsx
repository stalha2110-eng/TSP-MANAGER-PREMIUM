import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  CheckCircle2,
  Mic,
  Plus,
  Receipt,
  Sparkles,
  Package,
  ArrowRight,
  ArrowLeft,
  HelpCircle,
  Check,
  ShoppingBag,
  ExternalLink,
  X,
  Tv
} from 'lucide-react';

export type HelpTutorialTopic = 'add_products' | 'create_bill';

export interface AppHelpTutorialProps {
  onNavigateTab?: (tab: string) => void;
  onOpenVoice?: () => void;
  t?: any;
  initialFullscreen?: boolean;
  onClose?: () => void;
}

// Synthesizes pleasant modern tactile click and success audio feedback without external audio files
function playTutorialSound(type: 'click' | 'chime' | 'success') {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const now = ctx.currentTime;

    if (type === 'click') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, now);
      osc.frequency.exponentialRampToValueAtTime(180, now + 0.05);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.05);
    } else if (type === 'chime') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(523.25, now); // C5
      osc.frequency.setValueAtTime(659.25, now + 0.08); // E5
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.25);
    } else if (type === 'success') {
      const notes = [523.25, 659.25, 783.99]; // C - E - G
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.07);
        gain.gain.setValueAtTime(0.18, now + idx * 0.07);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.07 + 0.2);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.07);
        osc.stop(now + idx * 0.07 + 0.2);
      });
    }
  } catch (e) {
    // Audio contexts may be blocked before user gesture; gracefully fallback
  }
}

export const AppHelpTutorial: React.FC<AppHelpTutorialProps> = ({
  onNavigateTab,
  onOpenVoice,
  initialFullscreen = true,
  onClose,
}) => {
  // Topic selection: strictly "how to add produts" and "how to create bill" as requested
  const [selectedTopic, setSelectedTopic] = useState<HelpTutorialTopic>('add_products');

  // Video playback state
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [progress, setProgress] = useState<number>(0); // 0 to 100
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(initialFullscreen ?? true);
  const [clickRipple, setClickRipple] = useState<{ x: number; y: number; id: number } | null>(null);

  const videoContainerRef = useRef<HTMLDivElement>(null);

  // Handle Escape key to exit fullscreen or close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isFullscreen) {
          setIsFullscreen(false);
        } else if (onClose) {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen, onClose]);

  // Total simulated duration in seconds per tutorial
  const TOTAL_DURATION_SEC = 25;

  // Define steps for "How to add products" (Voice Product Assistant demo)
  const addProductsSteps = [
    {
      step: 1,
      timeRange: [0, 20],
      title: '1. Click Voice Assistant Mic',
      hindiTitle: '१. डैशबोर्ड पर चमकते माइक पर क्लिक करें',
      desc: 'On your store dashboard, locate the glowing amber floating microphone button at the bottom-right and tap it.',
      targetLabel: 'Floating Voice Mic',
      cursorPos: { x: 88, y: 78 }, // % of container
      action: 'Click Floating Mic'
    },
    {
      step: 2,
      timeRange: [20, 40],
      title: '2. Open Voice Assistant',
      hindiTitle: '२. वॉइस प्रोडक्ट असिस्टेंट खुलेगा',
      desc: 'The smart Voice Assistant modal opens up ready to listen. Tap the large center microphone button to begin.',
      targetLabel: 'Center Microphone Button',
      cursorPos: { x: 50, y: 52 },
      action: 'Tap Center Mic'
    },
    {
      step: 3,
      timeRange: [40, 60],
      title: '3. Speak Product & Quantity',
      hindiTitle: '३. बोलें: "टमाटर पाव किलो 20"',
      desc: 'Speak naturally in Hindi, English or Marathi: "Tamatar pav kilo 20". Waveform visualizer animates your voice.',
      targetLabel: 'Speech Input',
      cursorPos: { x: 50, y: 44 },
      action: 'Listening Speech...'
    },
    {
      step: 4,
      timeRange: [60, 80],
      title: '4. AI Auto-Detects 250gm & ₹20',
      hindiTitle: '४. AI ने "पाव किलो = 250gm" और ₹20 भाव निकाला',
      desc: 'The AI extracts the product name "Tamatar", calculates 250gm for "pav kilo", and sets retail selling price to ₹20.',
      targetLabel: 'AI Product Draft Card',
      cursorPos: { x: 50, y: 68 },
      action: 'Review Extracted Item'
    },
    {
      step: 5,
      timeRange: [80, 100],
      title: '5. Click "Add to Inventory"',
      hindiTitle: '५. "Add to Inventory" पर क्लिक करके सेव करें',
      desc: 'Tap the green "Add to Inventory" button. The product is immediately saved to your catalog and ready for billing!',
      targetLabel: 'Add to Inventory Button',
      cursorPos: { x: 50, y: 76 },
      action: 'Save to Store'
    },
  ];

  // Define steps for "How to create bill" (Billing POS demo)
  const createBillSteps = [
    {
      step: 1,
      timeRange: [0, 20],
      title: '1. Navigate to Billing POS',
      hindiTitle: '१. नीचे बिलिंग (POS) पर क्लिक करें',
      desc: 'Tap the "Billing" tab on the bottom navigation bar to launch the high-speed shopkeeper billing counter.',
      targetLabel: 'Billing Tab',
      cursorPos: { x: 30, y: 92 },
      action: 'Click Billing'
    },
    {
      step: 2,
      timeRange: [20, 40],
      title: '2. Tap Products into Cart',
      hindiTitle: '२. सामान पर क्लिक करके बिल में जोड़ें',
      desc: 'Tap product items or scan barcodes. Clicking "Tamatar" and "Kaju" instantly adds them to the customer cart.',
      targetLabel: 'Product Cards',
      cursorPos: { x: 42, y: 42 },
      action: 'Select Item'
    },
    {
      step: 3,
      timeRange: [40, 60],
      title: '3. Review Quantities & Total',
      hindiTitle: '३. कुल राशि और छूट की जाँच करें',
      desc: 'Check live billing summary: Total ₹220, taxes, discounts, and item count. Everything calculates in real-time.',
      targetLabel: 'Cart Summary',
      cursorPos: { x: 75, y: 55 },
      action: 'Review Total'
    },
    {
      step: 4,
      timeRange: [60, 80],
      title: '4. Choose Cash / UPI Payment',
      hindiTitle: '४. कैश या UPI पेमेंट चुनें',
      desc: 'Tap "Quick Pay" and choose Payment mode (Cash, UPI QR, or Khata udhar). Tap "Cash ₹220".',
      targetLabel: 'Cash Payment Button',
      cursorPos: { x: 50, y: 65 },
      action: 'Tap Cash'
    },
    {
      step: 5,
      timeRange: [80, 100],
      title: '5. Bill Done & Thermal Receipt',
      hindiTitle: '५. बिल बन गया और रसीद प्रिंट करें',
      desc: 'The bill is saved cleanly! Print standard 58mm/80mm thermal receipt or send bill via WhatsApp to customer.',
      targetLabel: 'Print Receipt',
      cursorPos: { x: 50, y: 72 },
      action: 'Print Receipt'
    },
  ];

  const currentStepList = selectedTopic === 'add_products' ? addProductsSteps : createBillSteps;
  const activeStepData = currentStepList.find(s => progress >= s.timeRange[0] && progress < s.timeRange[1]) || currentStepList[currentStepList.length - 1];

  // Auto-advancing video progress timer
  useEffect(() => {
    if (!isPlaying) return;

    const intervalMs = 50;
    const increment = (100 / (TOTAL_DURATION_SEC * (1000 / intervalMs))) * playbackSpeed;

    const timer = setInterval(() => {
      setProgress(prev => {
        const next = prev + increment;
        if (next >= 100) {
          if (soundEnabled) playTutorialSound('success');
          return 0; // Loop seamlessly
        }
        return next;
      });
    }, intervalMs);

    return () => clearInterval(timer);
  }, [isPlaying, playbackSpeed, soundEnabled, TOTAL_DURATION_SEC]);

  // Update currentStep number and trigger sound / click animations on step transitions
  const lastStepRef = useRef<number>(1);
  useEffect(() => {
    if (activeStepData && activeStepData.step !== lastStepRef.current) {
      lastStepRef.current = activeStepData.step;
      setCurrentStep(activeStepData.step);

      // Trigger realistic click ripple at target coordinate
      setClickRipple({
        x: activeStepData.cursorPos.x,
        y: activeStepData.cursorPos.y,
        id: Date.now(),
      });

      if (soundEnabled) {
        if (activeStepData.step === 5) {
          playTutorialSound('success');
        } else {
          playTutorialSound('click');
        }
      }
    }
  }, [activeStepData, soundEnabled]);

  // Handle jumping directly to a step
  const handleJumpToStep = (stepNum: number) => {
    const target = currentStepList.find(s => s.step === stepNum);
    if (target) {
      setProgress(target.timeRange[0] + 1);
      setCurrentStep(stepNum);
      if (soundEnabled) playTutorialSound('click');
    }
  };

  const formattedCurrentTime = () => {
    const sec = Math.floor((progress / 100) * TOTAL_DURATION_SEC);
    return `00:${sec < 10 ? '0' + sec : sec}`;
  };

  const formattedTotalTime = () => `00:${TOTAL_DURATION_SEC}`;

  return (
    <div className="w-full space-y-5 select-none">
      {/* ========================================================================= */}
      {/* 1. TOP SELECTOR BUTTONS: "How to add products" and "How to create bill"   */}
      {/* As strictly requested: "for now only give these 2 buttons in help section" */}
      {/* ========================================================================= */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {onClose && (
              <button
                id="help-top-back-btn"
                onClick={() => {
                  if (soundEnabled) playTutorialSound('click');
                  onClose();
                }}
                className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-[var(--card)] hover:bg-white/10 text-[var(--foreground)] text-xs font-bold transition-all border border-[var(--border)] cursor-pointer mr-1"
              >
                <ArrowLeft size={14} />
                <span>Back</span>
              </button>
            )}
            <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <p className="text-[11px] font-black uppercase tracking-wider text-[var(--foreground)]/60">
              Interactive Video Guide • वीडियो ट्यूटोरियल
            </p>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20 font-bold">
            Live Hand Demo 👆
          </span>
        </div>

        {/* The 2 Primary Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Button 1: How to add products */}
          <button
            id="help-btn-how-to-add-products"
            onClick={() => {
              setSelectedTopic('add_products');
              setProgress(0);
              setIsPlaying(true);
              if (soundEnabled) playTutorialSound('chime');
            }}
            className={`group relative flex items-center justify-between p-3.5 sm:p-4 rounded-2xl border transition-all text-left cursor-pointer overflow-hidden ${
              selectedTopic === 'add_products'
                ? 'bg-gradient-to-br from-amber-500/20 via-amber-500/10 to-transparent border-amber-500/50 shadow-lg shadow-amber-500/10'
                : 'bg-[var(--card)] border-[var(--border)] hover:border-amber-500/30 hover:bg-white/5 opacity-80'
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-11 h-11 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105 shadow-md ${
                  selectedTopic === 'add_products'
                    ? 'bg-gradient-to-tr from-amber-500 to-yellow-400 text-black font-black'
                    : 'bg-white/10 text-[var(--foreground)]'
                }`}
              >
                <Mic size={22} className={selectedTopic === 'add_products' ? 'animate-pulse' : ''} />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs sm:text-sm font-black text-[var(--foreground)]">
                    How to Add Products
                  </span>
                  {selectedTopic === 'add_products' && (
                    <span className="px-1.5 py-0.2 rounded bg-amber-500 text-black text-[9px] font-black uppercase tracking-wider">
                      Active
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-[var(--foreground)]/60 font-medium">
                  Voice Assistant Demo • बोलकर सामान जोड़ें
                </p>
              </div>
            </div>
            <ArrowRight
              size={18}
              className={`transition-transform ${
                selectedTopic === 'add_products' ? 'text-amber-500 translate-x-1' : 'opacity-30'
              }`}
            />
            {selectedTopic === 'add_products' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-amber-500 to-transparent" />
            )}
          </button>

          {/* Button 2: How to create bill */}
          <button
            id="help-btn-how-to-create-bill"
            onClick={() => {
              setSelectedTopic('create_bill');
              setProgress(0);
              setIsPlaying(true);
              if (soundEnabled) playTutorialSound('chime');
            }}
            className={`group relative flex items-center justify-between p-3.5 sm:p-4 rounded-2xl border transition-all text-left cursor-pointer overflow-hidden ${
              selectedTopic === 'create_bill'
                ? 'bg-gradient-to-br from-emerald-500/20 via-emerald-500/10 to-transparent border-emerald-500/50 shadow-lg shadow-emerald-500/10'
                : 'bg-[var(--card)] border-[var(--border)] hover:border-emerald-500/30 hover:bg-white/5 opacity-80'
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-11 h-11 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105 shadow-md ${
                  selectedTopic === 'create_bill'
                    ? 'bg-gradient-to-tr from-emerald-500 to-teal-400 text-black font-black'
                    : 'bg-white/10 text-[var(--foreground)]'
                }`}
              >
                <Receipt size={22} />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs sm:text-sm font-black text-[var(--foreground)]">
                    How to Create Bill
                  </span>
                  {selectedTopic === 'create_bill' && (
                    <span className="px-1.5 py-0.2 rounded bg-emerald-500 text-black text-[9px] font-black uppercase tracking-wider">
                      Active
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-[var(--foreground)]/60 font-medium">
                  Fast POS Counter • तुरंत पक्का बिल बनाएं
                </p>
              </div>
            </div>
            <ArrowRight
              size={18}
              className={`transition-transform ${
                selectedTopic === 'create_bill' ? 'text-emerald-500 translate-x-1' : 'opacity-30'
              }`}
            />
            {selectedTopic === 'create_bill' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-emerald-500 to-transparent" />
            )}
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. THE ANIMATED VIDEO PLAYER CONTAINER                                    */}
      {/* Realistic device frame with current dashboard simulation & hand cursor    */}
      {/* ========================================================================= */}
      {!isFullscreen && (
        <div className="flex items-center justify-between px-1">
          <span className="text-[11px] font-bold text-[var(--foreground)]/70 flex items-center gap-1.5">
            <Tv size={14} className="text-amber-500" />
            <span>Interactive Video Simulation</span>
          </span>
          <button
            onClick={() => {
              setIsFullscreen(true);
              if (soundEnabled) playTutorialSound('click');
            }}
            className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-amber-500 to-yellow-500 text-black text-[11px] font-black uppercase tracking-wider hover:scale-105 transition-transform shadow-md cursor-pointer"
          >
            <Maximize2 size={12} />
            <span>Watch Full Screen Size</span>
          </button>
        </div>
      )}

      <div
        ref={videoContainerRef}
        className={`relative w-full text-white shadow-2xl transition-all duration-300 flex flex-col ${
          isFullscreen
            ? 'fixed inset-0 z-[99999] w-screen h-screen max-w-none max-h-none rounded-none border-none bg-[#050811] overflow-hidden'
            : 'rounded-3xl border border-[var(--border)] bg-[#090D14] overflow-hidden'
        }`}
      >
        {/* Top Video Frame Bezel & Status Header */}
        <div className="px-3 sm:px-6 py-2.5 sm:py-3 bg-black/80 border-b border-white/10 flex items-center justify-between text-xs backdrop-blur-md gap-2 shrink-0">
          {/* Left: Dedicated Back Button + Window dots + Live Badge */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <button
              id="live-tutorial-header-back-btn"
              onClick={() => {
                if (soundEnabled) playTutorialSound('click');
                if (onClose) {
                  onClose();
                } else if (isFullscreen) {
                  setIsFullscreen(false);
                }
              }}
              title="Go Back (Esc)"
              className="group flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-white text-xs font-bold transition-all cursor-pointer border border-white/15 shadow-sm"
            >
              <ArrowLeft size={16} className="transition-transform group-hover:-translate-x-0.5" />
              <span>Back</span>
            </button>

            <div className="hidden md:flex items-center gap-1.5 opacity-60">
              <span className="w-2 h-2 rounded-full bg-rose-500/80" />
              <span className="w-2 h-2 rounded-full bg-amber-500/80" />
              <span className="w-2 h-2 rounded-full bg-emerald-500/80" />
            </div>

            <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-red-500/20 border border-red-500/30 text-[10px] font-black text-red-400">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
              <span>LIVE TUTORIAL</span>
            </div>
          </div>

          {/* Center: Quick Topic Switcher directly in Video Bezel */}
          <div className="flex items-center bg-white/10 p-0.5 rounded-xl border border-white/10">
            <button
              onClick={() => {
                setSelectedTopic('add_products');
                setProgress(0);
                setIsPlaying(true);
                if (soundEnabled) playTutorialSound('chime');
              }}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] sm:text-[11px] font-bold transition-all cursor-pointer ${
                selectedTopic === 'add_products'
                  ? 'bg-amber-500 text-black shadow-md'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              <Mic size={12} />
              <span className="hidden xs:inline">1.</span>
              <span>Add Products (Voice)</span>
            </button>
            <button
              onClick={() => {
                setSelectedTopic('create_bill');
                setProgress(0);
                setIsPlaying(true);
                if (soundEnabled) playTutorialSound('chime');
              }}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] sm:text-[11px] font-bold transition-all cursor-pointer ${
                selectedTopic === 'create_bill'
                  ? 'bg-emerald-500 text-black shadow-md'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              <Receipt size={12} />
              <span className="hidden xs:inline">2.</span>
              <span>Create Bill (POS)</span>
            </button>
          </div>

          {/* Right: Sound, Fullscreen & Close controls */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              title={soundEnabled ? 'Mute SFX' : 'Enable SFX'}
              className="p-1.5 rounded-lg hover:bg-white/10 text-white/70 hover:text-white transition-colors cursor-pointer"
            >
              {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
            </button>
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              title={isFullscreen ? 'Exit Full Screen (Esc)' : 'Watch in Full Screen Size'}
              className={`p-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                isFullscreen
                  ? 'bg-white/15 text-white'
                  : 'hover:bg-white/10 text-white/70 hover:text-white'
              }`}
            >
              {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
              <span className="text-[10px] font-bold hidden md:inline">
                {isFullscreen ? 'Exit Full Screen' : 'Full Screen'}
              </span>
            </button>
            {(isFullscreen || onClose) && (
              <button
                onClick={() => {
                  if (isFullscreen) {
                    setIsFullscreen(false);
                  }
                  if (onClose) {
                    onClose();
                  }
                }}
                title="Close Tutorial (Esc)"
                className="p-1.5 rounded-lg bg-white/10 hover:bg-rose-500/20 hover:text-rose-400 text-white/70 transition-colors cursor-pointer ml-1"
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* SIMULATED APP SCREEN CANVAS (Current Dashboard of App)                     */}
        {/* ========================================================================= */}
        <div
          className={`relative w-full bg-[#0a0f1d] overflow-hidden select-none flex flex-col justify-between ${
            isFullscreen ? 'flex-1 min-h-0' : 'aspect-[16/10] sm:aspect-[16/9]'
          }`}
        >
          {/* Subtle grid background */}
          <div
            className="absolute inset-0 opacity-15 pointer-events-none"
            style={{
              backgroundImage: 'radial-gradient(rgba(255,255,255,0.15) 1px, transparent 0)',
              backgroundSize: '20px 20px',
            }}
          />

          {/* ----------------------------------------------------------------------- */}
          {/* DEMO 1: HOW TO ADD PRODUCTS (VOICE ASSISTANT DEMO)                      */}
          {/* ----------------------------------------------------------------------- */}
          {selectedTopic === 'add_products' && (
            <div className="absolute inset-0 flex flex-col">
              {/* Simulated App Top Navigation */}
              <div className="p-3 sm:p-4 border-b border-white/10 bg-white/5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center font-black text-xs">
                    🛍️
                  </div>
                  <div>
                    <p className="text-xs font-black text-white leading-none">Shree Ganesh Kirana</p>
                    <p className="text-[9px] text-white/50">Store Dashboard • Retail Hub</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="px-2.5 py-1 rounded-full bg-white/10 border border-white/10 text-[10px] text-white/70 flex items-center gap-1.5">
                    <span>🔍</span>
                    <span className="hidden sm:inline">Search items...</span>
                  </div>
                  <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold flex items-center justify-center">
                    ₹
                  </div>
                </div>
              </div>

              {/* Simulated Catalog Items Grid */}
              <div className="flex-1 p-3 sm:p-4 overflow-hidden relative">
                {/* Category tags */}
                <div className="flex gap-1.5 mb-3 overflow-hidden text-[10px]">
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                    All (24)
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-white/5 text-white/60">Vegetables</span>
                  <span className="px-2 py-0.5 rounded-full bg-white/5 text-white/60">Dry Fruits</span>
                  <span className="px-2 py-0.5 rounded-full bg-white/5 text-white/60">Spices</span>
                </div>

                {/* Sample cards */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3 opacity-90">
                  {/* Card 1: Badam */}
                  <div className="p-2 sm:p-2.5 rounded-xl bg-white/5 border border-white/10">
                    <div className="flex justify-between items-start mb-1">
                      <span className="text-xs font-bold text-white">Badam (Almonds)</span>
                      <span className="text-[9px] text-amber-400 bg-amber-500/10 px-1 rounded">1 KG</span>
                    </div>
                    <p className="text-[11px] font-black text-emerald-400">₹900 <span className="text-[9px] text-white/40">/kg</span></p>
                    <p className="text-[9px] text-white/40">Stock: 45 KG</p>
                  </div>

                  {/* Card 2: Aloo */}
                  <div className="p-2 sm:p-2.5 rounded-xl bg-white/5 border border-white/10">
                    <div className="flex justify-between items-start mb-1">
                      <span className="text-xs font-bold text-white">Aloo (Potato)</span>
                      <span className="text-[9px] text-amber-400 bg-amber-500/10 px-1 rounded">1 KG</span>
                    </div>
                    <p className="text-[11px] font-black text-emerald-400">₹30 <span className="text-[9px] text-white/40">/kg</span></p>
                    <p className="text-[9px] text-white/40">Stock: 120 KG</p>
                  </div>

                  {/* Card 3: Newly Added Item (appears highlighted in Step 5!) */}
                  <div
                    className={`p-2 sm:p-2.5 rounded-xl border transition-all duration-500 ${
                      progress >= 80
                        ? 'bg-emerald-500/20 border-emerald-500 ring-2 ring-emerald-500/50 scale-[1.02]'
                        : 'bg-white/5 border-white/10 opacity-40'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <span className="text-xs font-bold text-white flex items-center gap-1">
                        Tamatar (Tomato)
                        {progress >= 80 && (
                          <span className="px-1 py-0.2 rounded bg-emerald-500 text-black text-[8px] font-black uppercase">
                            NEW
                          </span>
                        )}
                      </span>
                      <span className="text-[9px] text-amber-400 bg-amber-500/10 px-1 rounded font-bold">
                        250gm
                      </span>
                    </div>
                    <p className="text-[11px] font-black text-emerald-400">
                      ₹20 <span className="text-[9px] text-white/40">/250gm (Pav Kilo)</span>
                    </p>
                    <p className="text-[9px] text-emerald-300/80">✨ Added via Voice Assistant</p>
                  </div>
                </div>

                {/* Floating Voice Assistant Mic Button at Bottom-Right */}
                <div
                  className={`absolute bottom-4 right-4 flex flex-col items-center gap-1 transition-all duration-300 ${
                    activeStepData.step === 1 ? 'scale-110' : ''
                  }`}
                >
                  {/* Floating tooltip */}
                  <div className="px-2 py-0.5 rounded-md bg-amber-500 text-black text-[9px] font-black tracking-wide shadow-lg animate-bounce">
                    ✦ Click Voice Mic
                  </div>

                  {/* Glowing Animated Voice Assistant Button */}
                  <div className="relative">
                    {/* Pulsing ring */}
                    <div className="absolute -inset-2 rounded-full bg-amber-500/30 animate-ping pointer-events-none" />
                    <div
                      className={`w-12 h-12 rounded-full flex items-center justify-center shadow-xl transition-all ${
                        activeStepData.step === 1
                          ? 'ring-4 ring-amber-400 ring-offset-2 ring-offset-black scale-105'
                          : ''
                      }`}
                      style={{
                        background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 55%, #b45309 100%)',
                      }}
                    >
                      <Mic size={22} className="text-white drop-shadow" />
                    </div>
                  </div>
                </div>

                {/* Simulated Voice Product Assistant Modal (Steps 2, 3, 4, 5) */}
                <AnimatePresence>
                  {progress >= 20 && progress < 85 && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9, y: 15 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.9, y: 15 }}
                      className="absolute inset-2 sm:inset-4 z-20 rounded-2xl bg-black/90 backdrop-blur-xl border border-amber-500/40 p-3 sm:p-4 flex flex-col justify-between shadow-2xl overflow-hidden"
                    >
                      {/* Modal Header */}
                      <div className="flex items-center justify-between border-b border-white/10 pb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-lg bg-amber-500 text-black flex items-center justify-center font-black">
                            <Mic size={14} />
                          </div>
                          <div>
                            <p className="text-xs font-black text-white">Voice Product Assistant</p>
                            <p className="text-[8px] text-amber-400">Hindi • English • Marathi Auto-Detect</p>
                          </div>
                        </div>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[9px] font-bold border border-emerald-500/30">
                          Pav Kilo = 250gm Rule Active
                        </span>
                      </div>

                      {/* Center Stage: Mic & Voice Subtitles */}
                      <div className="my-auto py-2 flex flex-col items-center justify-center text-center space-y-2">
                        {/* Interactive Center Microphone button */}
                        <div className="relative">
                          {progress >= 38 && progress < 65 && (
                            <>
                              <div className="absolute -inset-3 rounded-full bg-amber-500/30 animate-ping" />
                              <div className="absolute -inset-6 rounded-full bg-amber-500/10 animate-pulse" />
                            </>
                          )}
                          <div
                            className={`w-14 h-14 rounded-full flex items-center justify-center shadow-2xl transition-transform ${
                              activeStepData.step === 2 || activeStepData.step === 3
                                ? 'scale-110 ring-4 ring-amber-400'
                                : 'bg-gradient-to-tr from-amber-600 to-amber-400'
                            }`}
                            style={{
                              background: 'linear-gradient(135deg, #f59e0b 0%, #b45309 100%)',
                            }}
                          >
                            <Mic size={26} className="text-white" />
                          </div>
                        </div>

                        {/* Speech Bubble / Spoken words (Step 3) */}
                        {progress >= 38 && progress < 65 && (
                          <motion.div
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-black/80 border border-amber-500/40 px-3 py-1.5 rounded-xl shadow-lg"
                          >
                            <div className="flex items-center gap-2 text-xs font-bold text-amber-300">
                              <span className="flex gap-0.5 items-center">
                                <span className="w-1 h-3 bg-amber-400 rounded-full animate-bounce" />
                                <span className="w-1 h-4 bg-amber-400 rounded-full animate-bounce [animation-delay:0.15s]" />
                                <span className="w-1 h-2 bg-amber-400 rounded-full animate-bounce [animation-delay:0.3s]" />
                              </span>
                              <span>Spoken: "Tamatar pav kilo 20"</span>
                            </div>
                            <p className="text-[9px] text-white/60">टमाटर पाव किलो 20 (250gm = ₹20)</p>
                          </motion.div>
                        )}

                        {/* AI Extracted Product Draft (Step 4 & 5) */}
                        {progress >= 60 && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="w-full max-w-xs bg-white/10 border border-emerald-500/50 rounded-xl p-2.5 text-left space-y-1 shadow-lg"
                          >
                            <div className="flex justify-between items-center">
                              <span className="text-xs font-black text-white flex items-center gap-1">
                                <CheckCircle2 size={13} className="text-emerald-400" />
                                Product: Tamatar
                              </span>
                              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                99% Match
                              </span>
                            </div>
                            <div className="grid grid-cols-2 gap-1 text-[10px]">
                              <div className="bg-black/40 p-1 rounded border border-white/5">
                                <span className="text-white/50 block text-[8px]">Retail Price:</span>
                                <span className="font-bold text-emerald-400">₹20 / 250gm</span>
                              </div>
                              <div className="bg-black/40 p-1 rounded border border-white/5">
                                <span className="text-white/50 block text-[8px]">Quantity Unit:</span>
                                <span className="font-bold text-amber-300">250gm (Pav Kilo)</span>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </div>

                      {/* Modal Footer / Action Button (Step 5) */}
                      <div className="pt-2 border-t border-white/10 flex justify-end">
                        <div
                          className={`px-4 py-1.5 rounded-xl font-black text-xs flex items-center gap-1.5 shadow-lg transition-all ${
                            progress >= 75
                              ? 'bg-emerald-500 text-black ring-4 ring-emerald-400 scale-105'
                              : 'bg-emerald-600/80 text-white'
                          }`}
                        >
                          <Check size={14} />
                          <span>Add to Inventory (इन्वेंटरी में जोड़ें)</span>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Simulated Bottom Navigation */}
              <div className="p-2 border-t border-white/10 bg-black/40 flex justify-around text-[10px] text-white/50">
                <span className="text-amber-400 font-bold flex items-center gap-1">🏠 Home</span>
                <span className="flex items-center gap-1">🧾 Billing</span>
                <span className="flex items-center gap-1">📦 Inventory</span>
                <span className="flex items-center gap-1">👥 Customers</span>
                <span className="flex items-center gap-1">⚙️ Menu</span>
              </div>
            </div>
          )}

          {/* ----------------------------------------------------------------------- */}
          {/* DEMO 2: HOW TO CREATE BILL (QUICK POS BILLING DEMO)                    */}
          {/* ----------------------------------------------------------------------- */}
          {selectedTopic === 'create_bill' && (
            <div className="absolute inset-0 flex flex-col">
              {/* Billing Top Header */}
              <div className="p-3 sm:p-4 border-b border-white/10 bg-white/5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-black text-xs">
                    🧾
                  </div>
                  <div>
                    <p className="text-xs font-black text-white leading-none">Fast Billing POS Counter</p>
                    <p className="text-[9px] text-emerald-400">Invoice #1042 • Live Counter</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">
                    Cart: {progress >= 35 ? '2 Items' : '0 Items'}
                  </span>
                </div>
              </div>

              {/* POS Center Grid */}
              <div className="flex-1 p-3 sm:p-4 overflow-hidden grid grid-cols-2 gap-2 sm:gap-3">
                {/* Left: Product Selection */}
                <div className="space-y-2">
                  <p className="text-[10px] text-white/60 font-bold uppercase">Tap Items to Add</p>
                  <div
                    className={`p-2 rounded-xl border transition-all ${
                      progress >= 25 && progress < 45
                        ? 'bg-emerald-500/20 border-emerald-500 ring-2 ring-emerald-400 scale-[1.02]'
                        : 'bg-white/5 border-white/10'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-white">Tamatar (250gm)</span>
                      <span className="text-xs font-black text-emerald-400">₹20</span>
                    </div>
                    <span className="text-[8px] text-emerald-300">
                      {progress >= 28 ? '✓ Added to Cart' : '+ Tap to add'}
                    </span>
                  </div>

                  <div
                    className={`p-2 rounded-xl border transition-all ${
                      progress >= 35 && progress < 55
                        ? 'bg-emerald-500/20 border-emerald-500 ring-2 ring-emerald-400 scale-[1.02]'
                        : 'bg-white/5 border-white/10'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-white">Kaju W240 (250gm)</span>
                      <span className="text-xs font-black text-emerald-400">₹200</span>
                    </div>
                    <span className="text-[8px] text-emerald-300">
                      {progress >= 38 ? '✓ Added to Cart' : '+ Tap to add'}
                    </span>
                  </div>
                </div>

                {/* Right: Cart Summary & Checkout */}
                <div className="bg-white/5 border border-white/10 rounded-xl p-2.5 flex flex-col justify-between">
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-white/60 uppercase">Active Bill</p>
                    <div className="text-[10px] space-y-1 text-white/80">
                      <div className="flex justify-between">
                        <span>Tamatar (250g)</span>
                        <span className="font-bold">₹20</span>
                      </div>
                      {progress >= 35 && (
                        <div className="flex justify-between">
                          <span>Kaju W240 (250g)</span>
                          <span className="font-bold">₹200</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-white/10 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-white">Grand Total:</span>
                      <span className="text-sm font-black text-emerald-400">
                        {progress >= 35 ? '₹220.00' : '₹20.00'}
                      </span>
                    </div>

                    {/* Quick Payment Button */}
                    <div
                      className={`p-2 rounded-xl text-center text-xs font-black transition-all ${
                        progress >= 60 && progress < 80
                          ? 'bg-emerald-400 text-black ring-4 ring-emerald-300 scale-105 shadow-xl'
                          : 'bg-emerald-500 text-black'
                      }`}
                    >
                      {progress >= 75 ? '✓ Paid by Cash (₹220)' : '💵 Charge Cash ₹220'}
                    </div>

                    {progress >= 80 && (
                      <div className="text-center p-1.5 rounded-lg bg-emerald-500/20 border border-emerald-500 text-[9px] font-bold text-emerald-300 animate-pulse">
                        🖨️ Thermal Receipt Printed!
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Bottom Navigation */}
              <div className="p-2 border-t border-white/10 bg-black/40 flex justify-around text-[10px] text-white/50">
                <span className="flex items-center gap-1">🏠 Home</span>
                <span className="text-emerald-400 font-bold flex items-center gap-1">🧾 Billing</span>
                <span className="flex items-center gap-1">📦 Inventory</span>
                <span className="flex items-center gap-1">👥 Customers</span>
                <span className="flex items-center gap-1">⚙️ Menu</span>
              </div>
            </div>
          )}

          {/* ======================================================================= */}
          {/* THE ANIMATED CLICKING HAND / CURSOR OVERLAY                             */}
          {/* Smoothly glides to target coordinates and performs natural finger tap   */}
          {/* ======================================================================= */}
          <motion.div
            animate={{
              left: `${activeStepData.cursorPos.x}%`,
              top: `${activeStepData.cursorPos.y}%`,
            }}
            transition={{
              type: 'spring',
              damping: 24,
              stiffness: 160,
              mass: 0.8,
            }}
            className="absolute z-50 pointer-events-none -translate-x-3 -translate-y-2"
          >
            {/* Target highlight ring */}
            <div className="relative">
              {/* Hand Icon with realistic press/tap micro-motion */}
              <motion.div
                animate={{
                  scale: [1, 0.82, 1],
                  rotate: [-3, 4, -3],
                }}
                transition={{
                  duration: 1.8,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
                className="relative filter drop-shadow-[0_8px_16px_rgba(0,0,0,0.8)]"
              >
                {/* Visual Cursor Finger Icon */}
                <div className="w-10 h-10 flex items-center justify-center text-3xl select-none transform -rotate-12">
                  👆
                </div>

                {/* Animated "CLICK!" or "TAP!" badge */}
                <motion.div
                  animate={{
                    opacity: [0, 1, 0],
                    scale: [0.8, 1.1, 0.8],
                    y: [-2, -8, -2],
                  }}
                  transition={{
                    duration: 1.8,
                    repeat: Infinity,
                    ease: 'easeOut',
                  }}
                  className="absolute -top-3 -right-6 px-1.5 py-0.5 rounded bg-yellow-400 text-black text-[9px] font-black uppercase tracking-wider shadow-md whitespace-nowrap"
                >
                  TAP!
                </motion.div>
              </motion.div>
            </div>
          </motion.div>

          {/* Expanding Click Ripple Wave at cursor contact point */}
          {clickRipple && (
            <motion.div
              key={clickRipple.id}
              initial={{ scale: 0.2, opacity: 1 }}
              animate={{ scale: 2.6, opacity: 0 }}
              transition={{ duration: 0.75, ease: 'easeOut' }}
              style={{
                left: `${clickRipple.x}%`,
                top: `${clickRipple.y}%`,
              }}
              className="absolute w-8 h-8 rounded-full border-2 border-amber-400 pointer-events-none -translate-x-1/2 -translate-y-1/2 z-40"
            />
          )}

          {/* Subtitle Caption Overlay Card at bottom of video frame */}
          <div className="absolute bottom-2 left-2 right-2 z-30 p-2 sm:p-2.5 rounded-xl bg-black/85 backdrop-blur-md border border-white/10 text-white shadow-xl flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <span className="w-6 h-6 rounded-full bg-amber-500 text-black font-black text-xs flex items-center justify-center shrink-0">
                {activeStepData.step}
              </span>
              <div className="min-w-0">
                <p className="text-[11px] sm:text-xs font-black text-white truncate">
                  {activeStepData.title}
                </p>
                <p className="text-[9px] sm:text-[10px] text-white/70 truncate">
                  {activeStepData.hindiTitle}
                </p>
              </div>
            </div>

            <div className="shrink-0 flex items-center gap-1.5 text-[10px] font-mono font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-lg border border-amber-500/20">
              <span>{activeStepData.action}</span>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* VIDEO CONTROLS & TIMELINE SCRUBBER                                        */}
        {/* ========================================================================= */}
        <div className="p-3 sm:p-4 bg-[#0a0f18] border-t border-white/10 space-y-2.5">
          {/* Timeline Bar with Clickable Chapter Markers */}
          <div className="space-y-1">
            <div
              className="relative w-full h-2.5 bg-white/10 rounded-full overflow-hidden cursor-pointer group"
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const clickX = e.clientX - rect.left;
                const newProgress = Math.min(100, Math.max(0, (clickX / rect.width) * 100));
                setProgress(newProgress);
              }}
            >
              {/* Active filled bar */}
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-emerald-400 transition-all duration-75 rounded-full"
                style={{ width: `${progress}%` }}
              />
              {/* Scrub thumb */}
              <div
                className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-white shadow-md transition-all group-hover:scale-125"
                style={{ left: `calc(${progress}% - 7px)` }}
              />
            </div>

            {/* Time & Chapter Dots */}
            <div className="flex justify-between items-center text-[10px] font-mono text-white/50 pt-0.5">
              <span>{formattedCurrentTime()}</span>
              <div className="flex items-center gap-3">
                {currentStepList.map((s) => (
                  <button
                    key={s.step}
                    onClick={() => handleJumpToStep(s.step)}
                    className={`flex items-center gap-1 transition-colors cursor-pointer ${
                      currentStep === s.step ? 'text-amber-400 font-bold' : 'hover:text-white'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        currentStep === s.step ? 'bg-amber-400' : 'bg-white/30'
                      }`}
                    />
                    <span className="hidden sm:inline">Step {s.step}</span>
                  </button>
                ))}
              </div>
              <span>{formattedTotalTime()}</span>
            </div>
          </div>

          {/* Bottom Controls Row: Play/Pause, Replay, Speed, Live Try Button */}
          <div className="flex items-center justify-between flex-wrap gap-2 pt-1">
            <div className="flex items-center gap-2">
              {/* Play / Pause */}
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="w-8 h-8 rounded-full bg-white text-black flex items-center justify-center font-bold hover:scale-105 transition-transform cursor-pointer shadow-md"
                title={isPlaying ? 'Pause Demo' : 'Play Demo'}
              >
                {isPlaying ? <Pause size={15} /> : <Play size={15} className="ml-0.5" />}
              </button>

              {/* Replay */}
              <button
                onClick={() => {
                  setProgress(0);
                  setIsPlaying(true);
                  if (soundEnabled) playTutorialSound('chime');
                }}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
                title="Restart Video from Beginning"
              >
                <RotateCcw size={14} />
              </button>

              {/* Speed Button */}
              <button
                onClick={() => {
                  const speeds = [1, 1.25, 1.5];
                  const nextIdx = (speeds.indexOf(playbackSpeed) + 1) % speeds.length;
                  setPlaybackSpeed(speeds[nextIdx]);
                }}
                className="px-2.5 py-1 rounded-full bg-white/10 hover:bg-white/20 text-white text-[10px] font-mono font-bold transition-colors cursor-pointer"
                title="Playback Speed"
              >
                {playbackSpeed}x
              </button>
            </div>

            {/* Direct Shortcut to Try It Live in Real Store */}
            <div className="flex items-center gap-2">
              {selectedTopic === 'add_products' && onOpenVoice && (
                <button
                  onClick={() => {
                    onOpenVoice();
                  }}
                  className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 text-black font-black text-xs flex items-center gap-1.5 shadow-lg hover:scale-102 transition-transform cursor-pointer"
                >
                  <Mic size={14} />
                  <span>Try Voice Assistant Now</span>
                  <ExternalLink size={12} />
                </button>
              )}

              {selectedTopic === 'create_bill' && onNavigateTab && (
                <button
                  onClick={() => {
                    onNavigateTab('billing');
                  }}
                  className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 text-black font-black text-xs flex items-center gap-1.5 shadow-lg hover:scale-102 transition-transform cursor-pointer"
                >
                  <Receipt size={14} />
                  <span>Go to Billing POS</span>
                  <ExternalLink size={12} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. STEP-BY-STEP BREAKDOWN GUIDE CARD                                      */}
      {/* Clear, readable breakdown of where to click & how each step works         */}
      {/* ========================================================================= */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <HelpCircle size={16} className="text-amber-500" />
            <h4 className="text-xs font-black uppercase tracking-wider text-[var(--foreground)]">
              {selectedTopic === 'add_products'
                ? 'Voice Assistant Step-by-Step Instructions'
                : 'Billing Counter Step-by-Step Instructions'}
            </h4>
          </div>
          <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
            Step {currentStep} of 5
          </span>
        </div>

        <div className="grid gap-2 text-xs">
          {currentStepList.map((st) => (
            <div
              key={st.step}
              onClick={() => handleJumpToStep(st.step)}
              className={`p-3 rounded-xl border transition-all cursor-pointer flex items-start gap-3 ${
                currentStep === st.step
                  ? 'bg-amber-500/10 border-amber-500/40 shadow-sm'
                  : 'bg-[var(--background)]/50 border-[var(--border)] hover:bg-white/5 opacity-70'
              }`}
            >
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5 ${
                  currentStep === st.step
                    ? 'bg-amber-500 text-black font-black'
                    : 'bg-white/10 text-[var(--foreground)]'
                }`}
              >
                {st.step}
              </div>
              <div className="space-y-0.5 flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="font-black text-[var(--foreground)] text-xs">{st.title}</p>
                  <span className="text-[10px] text-amber-500 font-mono font-bold">
                    {st.targetLabel}
                  </span>
                </div>
                <p className="text-[11px] text-[var(--foreground)]/80 leading-relaxed font-medium">
                  {st.desc}
                </p>
                <p className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                  {st.hindiTitle}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AppHelpTutorial;
