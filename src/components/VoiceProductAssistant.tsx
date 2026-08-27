import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  X, Mic, MicOff, Settings, Trash2, Edit2, Check, CheckCircle2, 
  AlertTriangle, Volume2, Sparkles, Sliders, FileText, HelpCircle, 
  CornerDownRight, RefreshCw, Undo, Save, Info, PlusCircle, CheckCircle
} from "lucide-react";
import { Item, Category } from "../types";
import { 
  VoiceDraftProduct, VoiceSettings, VoiceSession, DEFAULT_VOICE_SETTINGS,
  normalizeUnit, parseVoiceTranscript, processVoiceCorrection, 
  saveSessionToHistory, getVoiceSessionHistory, fastClientVoiceParser 
} from "../services/voiceProcessingService";
import { keyPoolManager } from "../services/apiKeyPoolService";
import { playFeedbackEvent } from "../services/soundFeedbackService";
import { Button } from "./ui/Button";

function cleanTranscriptText(text: string): string {
  if (!text) return "";
  
  // Normalize whitespaces
  let cleaned = text.trim().replace(/\s+/g, " ");
  
  // Step 1: Deduplicate single word stutters/repeats, e.g. "kesar kesar kesar" -> "kesar"
  let words = cleaned.split(" ");
  const deduplicatedWords: string[] = [];
  for (let i = 0; i < words.length; i++) {
    const current = words[i].trim();
    if (!current) continue;
    const prev = deduplicatedWords[deduplicatedWords.length - 1];
    if (prev && current.toLowerCase() === prev.toLowerCase()) {
      continue;
    }
    deduplicatedWords.push(words[i]);
  }
  
  // Step 2: Remove repeating blocks of any word-length L (from 1 up to 15 words) consecutively or nearly consecutively
  let result = [...deduplicatedWords];
  let changed = true;
  while (changed) {
    changed = false;
    const n = result.length;
    for (let len = Math.min(15, Math.floor(n / 2)); len >= 1; len--) {
      for (let i = 0; i <= n - 2 * len; i++) {
        let match = true;
        for (let k = 0; k < len; k++) {
          const w1 = result[i + k].toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"']/g, "");
          const w2 = result[i + len + k].toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"']/g, "");
          if (w1 !== w2) {
            match = false;
            break;
          }
        }
        if (match) {
          result.splice(i + len, len);
          changed = true;
          break;
        }
      }
      if (changed) break;
    }
  }

  // Step 3: Deduplicate overlapping progressive phrases (e.g., self-corrections like "Kesar a grade Kesar a great Kesar a great retail 1200")
  changed = true;
  while (changed) {
    changed = false;
    const n = result.length;
    for (let len1 = 1; len1 <= 15; len1++) {
      for (let len2 = len1; len2 <= 15; len2++) {
        for (let i = 0; i <= n - len1 - len2; i++) {
          const wordsA = result.slice(i, i + len1)
            .map(w => w.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"']/g, ""));
          const wordsB = result.slice(i + len1, i + len1 + len2)
            .map(w => w.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"']/g, ""));
            
          const segmentA = wordsA.join(" ");
          const segmentB = wordsB.join(" ");
            
          if (segmentA.trim() && segmentB.trim()) {
            // Check word array prefixes rather than string .startsWith to avoid "100".startsWith("10") bugs
            const isWordPrefixAofB = wordsB.length >= wordsA.length && wordsA.every((w, k) => w === wordsB[k]);
            const isWordPrefixBofA = wordsA.length >= wordsB.length && wordsB.every((w, k) => w === wordsA[k]);

            if (isWordPrefixAofB) {
              // segmentB is a more complete version, remove the prefix segmentA
              result.splice(i, len1);
              changed = true;
              break;
            } else if (isWordPrefixBofA) {
              // segmentA is a more complete version, remove the suffix segmentB
              result.splice(i + len1, len2);
              changed = true;
              break;
            }
          }
        }
        if (changed) break;
      }
      if (changed) break;
    }
  }

  // Step 4: String-based exact repeat sentence detection (e.g. "exact repeat sentence exact repeat sentence")
  cleaned = result.join(" ");
  const mid = Math.floor(cleaned.length / 2);
  const firstHalf = cleaned.substring(0, mid).trim();
  const secondHalf = cleaned.substring(mid).trim();
  if (firstHalf.toLowerCase() === secondHalf.toLowerCase() && firstHalf.length > 2) {
    cleaned = firstHalf;
  }
  
  return cleaned;
}

function mergeTranscripts(oldText: string, newText: string): string {
  if (!oldText) return newText.trim();
  if (!newText) return oldText.trim();
  
  const cleanOld = oldText.trim().replace(/\s+/g, " ");
  const cleanNew = newText.trim().replace(/\s+/g, " ");
  
  // Normalize function to strip punctuation and normalize spacing for comparison
  const normalize = (t: string) => {
    return t
      .toLowerCase()
      .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"']/g, "")
      .replace(/\s+/g, " ")
      .trim();
  };
  
  const normOld = normalize(cleanOld);
  const normNew = normalize(cleanNew);
  
  if (!normOld) return cleanNew;
  if (!normNew) return cleanOld;
  
  if (normOld === normNew) return cleanOld;
  
  // Case 1: The new text is a substring/subsegment of the old text when normalized
  if (normOld.includes(normNew)) {
    return cleanOld;
  }
  
  // Case 2: The old text is completely subsumed by the new text when normalized
  if (normNew.includes(normOld)) {
    return cleanNew;
  }
  
  // Case 3: Partial overlap (the tail of normOld matches the head of normNew)
  const oldWords = normOld.split(" ");
  const newWords = normNew.split(" ");
  
  let maxOverlap = 0;
  const maxCheck = Math.min(oldWords.length, newWords.length);
  
  for (let len = 1; len <= maxCheck; len++) {
    const oldSlice = oldWords.slice(oldWords.length - len).join(" ");
    const newSlice = newWords.slice(0, len).join(" ");
    if (oldSlice === newSlice) {
      maxOverlap = len;
    }
  }
  
  if (maxOverlap > 0) {
    // Preserve the original punctuation & formatting of the new words for non-overlapping part
    const rawNewWords = cleanNew.split(" ");
    const nonOverlappingNew = rawNewWords.slice(maxOverlap).join(" ");
    return (cleanOld + " " + nonOverlappingNew).trim();
  }
  
  // Case 4: No overlap, append them cleanly
  return (cleanOld + " " + cleanNew).trim();
}

function checkStopCommands(text: string): { action: 'stop' | 'cancel' | 'none'; cleanedText: string } {
  if (typeof text !== 'string') {
    text = String(text || '');
  }
  if (!text) return { action: 'none', cleanedText: "" };
  const lower = text.toLowerCase().trim();
  
  // Cancel commands
  const cancelPhrases = ["cancel", "radd karo", "discard", "delete", "रद्द करो", "कैंसिल", "clear"];
  // Stop commands
  const stopPhrases = ["stop listening", "stop", "finish", "complete", "ruk jao", "ruko", "bas karo", "done", "save", "confirm", "बस करो", "रुको", "रुक जाओ", "हो गया"];

  for (const phrase of cancelPhrases) {
    const phraseRegex = new RegExp(`\\s*\\b${phrase}\\b\\s*$`, 'i');
    if (phraseRegex.test(lower)) {
      const precedingText = text.replace(phraseRegex, "").trim();
      return { action: 'cancel', cleanedText: precedingText };
    }
  }

  for (const phrase of stopPhrases) {
    const phraseRegex = new RegExp(`\\s*\\b${phrase}\\b\\s*$`, 'i');
    if (phraseRegex.test(lower)) {
      const precedingText = text.replace(phraseRegex, "").trim();
      return { action: 'stop', cleanedText: precedingText };
    }
  }

  return { action: 'none', cleanedText: text };
}

interface VoiceProductAssistantProps {
  onClose: () => void;
  onSaveAll: (drafts: { item: Omit<Item, 'id' | 'lastUpdated'>; mode: 'create' | 'update' | { duplicateId: string } }[]) => void;
  categories: Category[];
  existingItems: Item[];
  appSettings: any;
  t: any;
}

export function VoiceProductAssistant({ 
  onClose, 
  onSaveAll, 
  categories, 
  existingItems, 
  appSettings, 
  t 
}: VoiceProductAssistantProps) {
  
  // Voice Panel Tabs: 'assistant' | 'history' | 'settings'
  const [activeTab, setActiveTab] = useState<'assistant' | 'history' | 'settings'>('assistant');
  
  // Settings Hooked
  const [vSettings, setVSettings] = useState<VoiceSettings>(() => {
    try {
      const stored = localStorage.getItem("ts_voice_settings");
      return stored ? { ...DEFAULT_VOICE_SETTINGS, ...JSON.parse(stored) } : DEFAULT_VOICE_SETTINGS;
    } catch {
      return DEFAULT_VOICE_SETTINGS;
    }
  });

  const persistSettings = (updated: VoiceSettings) => {
    setVSettings(updated);
    localStorage.setItem("ts_voice_settings", JSON.stringify(updated));
  };

  // Recording Engine State
  const [isListening, setIsListening] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState("");
  const [finalTranscript, setFinalTranscript] = useState("");
  const [recognitionError, setRecognitionError] = useState("");
  const [recognitionObj, setRecognitionObj] = useState<any>(null);
  const [draftProducts, setDraftProducts] = useState<VoiceDraftProduct[]>([]);

  // AI-powered Voice processing states
  const [micLocale, setMicLocale] = useState<string>(() => {
    return vSettings.defaultMicLocale || "en-IN";
  });
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [aiDetectedLanguage, setAiDetectedLanguage] = useState("");
  const finalTranscriptRef = useRef("");
  const interimTranscriptRef = useRef("");
  const accumulatedFinalTextRef = useRef("");
  const isManuallyStopped = useRef(true);
  const draftProductsRef = useRef<VoiceDraftProduct[]>([]);
  const existingItemsRef = useRef<Item[]>([]);
  const silenceTimeoutRef = useRef<any>(null);
  const speechPauseTimeoutRef = useRef<any>(null);
  const isCurrentlyParsingRef = useRef(false);

  // Clear silence and speech pause timeout on unmount
  useEffect(() => {
    return () => {
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
      }
      if (speechPauseTimeoutRef.current) {
        clearTimeout(speechPauseTimeoutRef.current);
      }
    };
  }, []);

  // Keep state refs in sync to prevent stale closures
  useEffect(() => {
    finalTranscriptRef.current = finalTranscript;
  }, [finalTranscript]);

  useEffect(() => {
    interimTranscriptRef.current = interimTranscript;
  }, [interimTranscript]);

  useEffect(() => {
    draftProductsRef.current = draftProducts;
  }, [draftProducts]);

  useEffect(() => {
    existingItemsRef.current = existingItems;
  }, [existingItems]);

  const autoSubmitOnSilenceRef = useRef(vSettings.autoSubmitOnSilence);
  const silenceSecondsRef = useRef(vSettings.silenceSeconds);

  useEffect(() => {
    autoSubmitOnSilenceRef.current = vSettings.autoSubmitOnSilence;
    silenceSecondsRef.current = vSettings.silenceSeconds;
  }, [vSettings.autoSubmitOnSilence, vSettings.silenceSeconds]);
  
  // Live Processing Step Stages: 'idle' | 'listening' | 'captured' | 'analyzing' | 'done' | 'error'
  const [processStep, setProcessStep] = useState<'idle' | 'listening' | 'captured' | 'analyzing' | 'done' | 'error'>('idle');
  
  // Drafts Review Cache
  const [editingDraftId, setEditingDraftId] = useState<string | null>(null);
  const [editingDraftName, setEditingDraftName] = useState("");
  const [editingDraftRetail, setEditingDraftRetail] = useState("");
  const [editingDraftWholesale, setEditingDraftWholesale] = useState("");
  const [editingDraftBuying, setEditingDraftBuying] = useState("");
  const [editingDraftUnit, setEditingDraftUnit] = useState("KG");
  const [editingDraftCategory, setEditingDraftCategory] = useState("");
  
  // Custom Selection mapping for duplicate responses (create new vs update existing prices)
  // Maps draft temporary ID -> 'create_new' | 'update_prices'
  const [duplicateDecisions, setDuplicateDecisions] = useState<Record<string, 'create_new' | 'update_prices'>>({});

  // High-fidelity pipeline loading and verification feedback states
  const [isSavingToInventory, setIsSavingToInventory] = useState(false);
  const [saveResult, setSaveResult] = useState<{ success: boolean; message: string } | null>(null);
  const liveGuessTimeoutRef = useRef<any>(null);

  // Field updates for verification overlay
  const updateDraftField = (field: keyof VoiceDraftProduct | string, value: any) => {
    setDraftProducts(prev => {
      if (prev.length === 0) return prev;
      const copied = [...prev];
      copied[0] = {
        ...copied[0],
        [field]: value
      };
      return copied;
    });
  };

  const updateDraftTranslation = (lang: 'en' | 'hi' | 'mr' | 'hi-en', value: string) => {
    setDraftProducts(prev => {
      if (prev.length === 0) return prev;
      const copied = [...prev];
      const trans = { ...(copied[0].translations || { en: copied[0].name, hi: "", mr: "", 'hi-en': "" }) };
      trans[lang] = value;
      copied[0] = {
        ...copied[0],
        translations: trans
      };
      return copied;
    });
  };

  // History cache
  const [historyList, setHistoryList] = useState<VoiceSession[]>([]);

  // Sound play wrapper
  const triggerSound = (event: 'bill_saved' | 'product_added' | 'print_success' | 'notification') => {
    if (vSettings.soundFeedback) {
      playFeedbackEvent(event, appSettings);
    }
  };

  // Reload history
  useEffect(() => {
    setHistoryList(getVoiceSessionHistory());
  }, []);

  // Gemini AI Parser
  const parseWithGemini = async (speechText: string) => {
    const cleanedText = cleanTranscriptText(speechText);
    if (!cleanedText.trim()) return;

    if (isCurrentlyParsingRef.current) {
      console.log("[parseWithGemini] Blocked duplicate parallel parsing request for:", cleanedText);
      return;
    }

    isCurrentlyParsingRef.current = true;
    setIsAiProcessing(true);
    setProcessStep('analyzing');
    setRecognitionError("");
    setAiDetectedLanguage("");

    try {
      // ⚡ LOCAL REGEX SHORTCUT PRE-PARSER:
      // If user provided a straightforward single item entry (e.g. "Badam 900", "Aloo 50 kilo"),
      // parse it instantly on client without hitting API quotas!
      const fastDrafts = fastClientVoiceParser(cleanedText, existingItems);
      if (fastDrafts && fastDrafts.length > 0 && (!vSettings.multiProduct || fastDrafts.length === 1)) {
        console.log("⚡ [Fast Local Regex Pre-Parser] Handled query locally without API call:", cleanedText);
        setAiDetectedLanguage("⚡ Instant Local Engine");
        
        // Populate categories
        const enrichedDrafts = fastDrafts.map(d => {
          const matchedCategory = categories.find(c => 
            c.name.toLowerCase().includes(d.name.toLowerCase()) || 
            d.name.toLowerCase().includes(c.name.toLowerCase())
          ) || categories[0];
          return {
            ...d,
            categoryId: matchedCategory ? matchedCategory.id : (categories[0]?.id || 'cat-general')
          };
        });

        setDraftProducts(enrichedDrafts);
        triggerSound('product_added');
        return;
      }

      // Sync custom keys to keyPoolManager
      if (appSettings?.customApiKeys && appSettings.customApiKeys.length > 0) {
        keyPoolManager.syncKeys(appSettings.customApiKeys);
      }

      // Determine active custom API key from pool or settings
      let customApiKey: string | undefined = undefined;
      if (appSettings?.customApiKeys && appSettings.customApiKeys.length > 0) {
        customApiKey = keyPoolManager.getNextAvailableKey(appSettings.activeApiKeyId) || undefined;
      } else if (appSettings?.customApiKey) {
        customApiKey = appSettings.customApiKey;
      }

      const response = await fetch("/api/voice/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcript: cleanedText,
          categories: categories,
          apiKey: customApiKey
        })
      });

      const contentType = response.headers.get("content-type") || "";
      const isJson = contentType.includes("application/json");
      const responseData = isJson ? await response.json().catch(() => null) : null;

      if (!response.ok) {
        if (customApiKey && (response.status === 429 || responseData?.code === "QUOTA_EXCEEDED")) {
          keyPoolManager.markKeyExhausted(customApiKey, 60000);
        }
        const errorCode = responseData?.code || (response.status === 429 ? "QUOTA_EXCEEDED" : response.status === 401 ? "INVALID_KEY" : response.status === 403 ? "MISSING_KEY" : "AI_SERVICE_ERROR");
        const rawServerMsg = responseData?.message || responseData?.error || `AI Assistant unavailable (${response.status})`;

        let toastNotice = rawServerMsg;
        let bannerNotice = rawServerMsg;

        if (errorCode === "QUOTA_EXCEEDED") {
          toastNotice = "⚠️ AI Assistant Quota Reached: Daily limit hit across keys. Offline parser activated. Will retry in 1 hour or add key in Settings.";
          bannerNotice = "AI Assistant Quota Reached: Daily Gemini quota exhausted across all rotation keys. Local offline parser activated.";
        } else if (errorCode === "MISSING_KEY") {
          toastNotice = "🔑 Gemini API Key Missing: Tap Settings -> Voice Assistant to configure your API key.";
          bannerNotice = "Gemini API Key Missing: Configure server environment variable or enter key in Settings.";
        } else if (errorCode === "INVALID_KEY") {
          toastNotice = "❌ Invalid API Key: Custom key authentication failed. Please verify in Settings.";
          bannerNotice = "Invalid Gemini API Key: Please verify your custom API key in Settings.";
        }

        // Emit top-level application toast
        window.dispatchEvent(new CustomEvent('app-toast', {
          detail: { message: toastNotice, type: errorCode === "QUOTA_EXCEEDED" ? "warning" : "error" }
        }));

        setRecognitionError(bannerNotice);

        // Fallback gracefully to offline regex parser so user workflow is uninterrupted!
        processRealtimeSpeech(cleanedText);
        setAiDetectedLanguage("Local Offline Parser");
        return;
      }

      if (responseData && Array.isArray(responseData.products)) {
        const data = responseData;
        setAiDetectedLanguage(data.languageDetected || "Detected Language");
        
        // Multi-product or single-product array based on user setting
        const productsToProcess = vSettings.multiProduct ? data.products : data.products.slice(0, 1);
        const voiceDrafts: VoiceDraftProduct[] = productsToProcess.map((p: any) => {
          // Find matching category by ID or standard lower-case name matching
          const matchedCategory = categories.find(c => 
            (p.categoryId && c.id === p.categoryId) || 
            (p.categoryName && c.name.toLowerCase() === p.categoryName.toLowerCase()) ||
            (p.categoryName && c.name.toLowerCase().includes(p.categoryName.toLowerCase())) ||
            (p.categoryName && p.categoryName.toLowerCase().includes(c.name.toLowerCase()))
          );
          
          return {
            id: 'voice_' + Math.random().toString(36).substr(2, 9),
            name: p.name,
            retailPrice: p.retailPrice || 0,
            retailPriceUnit: p.retailPriceUnit || p.unit || "KG",
            wholesalePrice: p.wholesalePrice || (p.retailPrice ? Math.floor(p.retailPrice * 0.9) : 0),
            wholesalePriceUnit: p.wholesalePriceUnit || p.unit || "KG",
            buyingPrice: p.buyingPrice || (p.retailPrice ? Math.floor(p.retailPrice * 0.8) : 0),
            buyingPriceUnit: p.buyingPriceUnit || p.unit || "KG",
            unit: p.unit || "KG",
            categoryId: matchedCategory ? matchedCategory.id : (categories[0]?.id || ''),
            confidence: {
              name: 100,
              retailPrice: 100,
              wholesalePrice: 100,
              buyingPrice: 100
            },
            originalText: cleanedText,
            translations: p.translations
          };
        });

        if (voiceDrafts.length > 0) {
          // Strictly replace with the single drafted product
          setDraftProducts(voiceDrafts);

          // Initialize default duplicate choices
          voiceDrafts.forEach(p => {
            const alreadyExists = existingItems.some(item => item.name.toLowerCase() === p.name.toLowerCase());
            if (alreadyExists) {
              setDuplicateDecisions(prev => ({
                ...prev,
                [p.id]: 'update_prices'
              }));
            }
          });
          
          setProcessStep('done');
          triggerSound('bill_saved');
        } else {
          setProcessStep('captured');
        }
      } else {
        throw new Error("Invalid structure returned from AI parsing.");
      }
    } catch (e: any) {
      console.warn("Speech parse system falling back to local regex offline parser:", e?.message || e);
      // Local fallback
      processRealtimeSpeech(cleanedText);
      setAiDetectedLanguage("Local Offline Parser");
    } finally {
      setIsAiProcessing(false);
      isCurrentlyParsingRef.current = false;
    }
  };

  // Web Speech API initialization with dynamic micLocale switching and silence-timeout auto-submit
  useEffect(() => {
    const SpeechClass = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechClass) {
      setRecognitionError("Web Speech API is not fully supported in this browser engine.");
      return;
    }

    const rec = new SpeechClass();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = micLocale;

    rec.__working = false;
    let restartTimer: any = null;

    const originalStart = rec.start;
    rec.start = function() {
      if (rec.__working) {
        console.warn("SpeechRecognition already running/working, start() ignored.");
        return;
      }
      try {
        rec.__working = true;
        originalStart.call(rec);
      } catch (err) {
        rec.__working = false;
        console.warn("SpeechRecognition start error caught in wrapper:", err);
      }
    };

    const attemptRestart = (delayMs = 80, retriesLeft = 6) => {
      if (isManuallyStopped.current) return;
      if (restartTimer) clearTimeout(restartTimer);

      restartTimer = setTimeout(() => {
        if (isManuallyStopped.current) return;
        try {
          rec.__working = false;
          rec.start();
        } catch (err) {
          console.warn(`Speech auto-restart retry (${retriesLeft} left) failed:`, err);
          if (retriesLeft > 0 && !isManuallyStopped.current) {
            attemptRestart(Math.floor(delayMs * 1.6), retriesLeft - 1);
          }
        }
      }, delayMs);
    };

    rec.onstart = () => {
      rec.__working = true;
      setIsListening(true);
      setRecognitionError("");
      setProcessStep('listening');
      triggerSound('product_added'); // soft bubble click
    };

    rec.onresult = (event: any) => {
      let sessionFinal = "";
      let sessionInterim = "";

      // Clear the silence timer and speech pause debouncer on any speech activity
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
      }
      if (speechPauseTimeoutRef.current) {
        clearTimeout(speechPauseTimeoutRef.current);
      }

      for (let i = 0; i < event.results.length; ++i) {
        const transcriptSegment = event.results[i][0].transcript || "";
        if (event.results[i].isFinal) {
          sessionFinal += (sessionFinal ? " " : "") + transcriptSegment.trim();
        } else {
          sessionInterim += (sessionInterim ? " " : "") + transcriptSegment.trim();
        }
      }

      // Voice Commands (Stop / Cancel) Detection
      const cumulativeSpoken = (sessionFinal + " " + sessionInterim).trim();
      const commandResult = checkStopCommands(cumulativeSpoken);
      
      if (commandResult.action !== 'none') {
        console.log(`[STT Integration] Voice Command matched: ${commandResult.action}. Cleaning:`, commandResult.cleanedText);
        
        // Stop recognition immediately so no further extraneous noise is processed
        isManuallyStopped.current = true;
        try {
          rec.__working = false;
          rec.stop();
        } catch (e) {
          console.warn("Speech stop failed on command match:", e);
        }
        setIsListening(false);

        if (commandResult.action === 'cancel') {
          // Reset session
          setFinalTranscript("");
          setInterimTranscript("");
          accumulatedFinalTextRef.current = "";
          setDraftProducts([]);
          setProcessStep('idle');
          triggerSound('notification');
          return;
        } else if (commandResult.action === 'stop') {
          // Process what was spoken preceding the stop command
          const cleanedText = cleanTranscriptText(commandResult.cleanedText);
          if (cleanedText && cleanedText.trim()) {
            setFinalTranscript(cleanedText);
            setInterimTranscript("");
            accumulatedFinalTextRef.current = "";
            parseWithGemini(cleanedText);
          } else {
            setProcessStep('idle');
          }
          return;
        }
      }

      const totalFinalText = accumulatedFinalTextRef.current
        ? mergeTranscripts(accumulatedFinalTextRef.current, sessionFinal)
        : sessionFinal;

      const cleanedCombined = cleanTranscriptText(totalFinalText);

      if (sessionInterim) {
        setInterimTranscript(sessionInterim);
        
        // Robust debouncing for local live preview as they speak to limit lag
        if (liveGuessTimeoutRef.current) {
          clearTimeout(liveGuessTimeoutRef.current);
        }
        liveGuessTimeoutRef.current = setTimeout(() => {
          const liveGuess = parseVoiceTranscript(sessionInterim, existingItemsRef.current);
          if (liveGuess.length > 0 && draftProductsRef.current.length === 0) {
            setDraftProducts(liveGuess.slice(0, 1));
          }
        }, 300);
      } else {
        setInterimTranscript("");
      }

      if (cleanedCombined) {
        setFinalTranscript(cleanedCombined);
        if (sessionFinal) {
          // Check for quick correction commands:
          const correctionResult = processVoiceCorrection(cleanedCombined, draftProductsRef.current);
          if (correctionResult.success) {
            setDraftProducts(correctionResult.drafts);
            triggerSound('notification');
            setFinalTranscript("");
            setInterimTranscript("");
            accumulatedFinalTextRef.current = "";
          }
        }
      }

      // Hands-free voice assistant auto-completion:
      // Only trigger silence auto-submit if user is NOT currently outputting interim speech
      if (autoSubmitOnSilenceRef.current && !sessionInterim) {
        const silenceDelayMs = Math.max(4000, (silenceSecondsRef.current || 4.5) * 1000);
        silenceTimeoutRef.current = setTimeout(() => {
          const textToParse = (finalTranscriptRef.current || "") + " " + (interimTranscriptRef.current || "");
          const cleanedText = cleanTranscriptText(textToParse);
          if (cleanedText && cleanedText.trim() && !isManuallyStopped.current) {
            console.log(`Gemini Silence Auto-Parser Triggered after ${silenceDelayMs}ms for:`, cleanedText);
            isManuallyStopped.current = true;
            try {
              rec.__working = false;
              rec.stop();
            } catch (e) {
              console.warn("Bypassed speech rec stop error:", e);
            }
            setIsListening(false);
          }
        }, silenceDelayMs);
      }
    };

    rec.onerror = (e: any) => {
      rec.__working = false;
      console.warn("Speech Recognition transient status/error:", e?.error || e);
      
      // Do not break continuous listening session for transient non-fatal errors
      const nonFatalErrors = ["no-speech", "aborted", "audio-capture", "network"];
      if (nonFatalErrors.includes(e?.error)) {
        if (!isManuallyStopped.current) {
          attemptRestart(120, 5);
        }
        return;
      }

      // Only report genuine fatal errors like permission denied
      if (e?.error === "not-allowed" || e?.error === "service-not-allowed") {
        setRecognitionError("Microphone permission was denied. Please allow microphone access in your browser.");
        setProcessStep('error');
        setIsListening(false);
        isManuallyStopped.current = true;
      }
    };

    rec.onend = () => {
      rec.__working = false;
      if (restartTimer) clearTimeout(restartTimer);
      // Clear silence timer on session termination
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
      }
      if (speechPauseTimeoutRef.current) {
        clearTimeout(speechPauseTimeoutRef.current);
      }

      if (!isManuallyStopped.current) {
        // Cache the last transcript in accumulatedFinalTextRef so that restarting doesn't lose old recognized text
        if (finalTranscriptRef.current) {
          accumulatedFinalTextRef.current = mergeTranscripts(accumulatedFinalTextRef.current, finalTranscriptRef.current);
        }
        console.log("[STT Integration] Native end event reached while actively listening. Re-engaging speech listener automatically...");
        attemptRestart(60, 6);
      } else {
        setIsListening(false);
        const textToParse = (finalTranscriptRef.current || "") + " " + (interimTranscriptRef.current || "");
        const cleanedText = cleanTranscriptText(textToParse);
        if (cleanedText && cleanedText.trim()) {
          parseWithGemini(cleanedText);
          // Now that we've triggered parsing with Gemini, reset the local transcription buffers:
          setFinalTranscript("");
          setInterimTranscript("");
          accumulatedFinalTextRef.current = "";
        } else {
          if (processStep === 'listening' || processStep === 'analyzing') {
            setProcessStep('idle');
          }
        }
      }
    };

    setRecognitionObj(rec);

    return () => {
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
      }
      if (speechPauseTimeoutRef.current) {
        clearTimeout(speechPauseTimeoutRef.current);
      }
      try {
        rec.__working = false;
        rec.abort();
      } catch {}
    };
  }, [micLocale]);

  // Handle Speech Toggle
  const toggleListening = () => {
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
    }
    if (speechPauseTimeoutRef.current) {
      clearTimeout(speechPauseTimeoutRef.current);
    }

    if (!recognitionObj) {
      alert("Voice recognition engine not initialized. Please ensure mic permissions are active.");
      return;
    }

    if (isListening) {
      isManuallyStopped.current = true;
      try {
        recognitionObj.__working = false;
        recognitionObj.stop();
      } catch (e) {
        console.warn("Bypassed speech stop error:", e);
      }
      setIsListening(false);
      setProcessStep('analyzing');
    } else {
      isManuallyStopped.current = false;
      accumulatedFinalTextRef.current = "";
      setFinalTranscript("");
      setInterimTranscript("");
      setRecognitionError("");
      try {
        recognitionObj.start();
      } catch (e) {
        try {
          recognitionObj.__working = false;
          recognitionObj.abort();
        } catch {}
        setTimeout(() => {
          try { recognitionObj.start(); } catch {}
        }, 120);
      }
    }
  };

  // Standard Extractor handler
  const processRealtimeSpeech = (speechText: string) => {
    if (!speechText.trim()) return;
    
    // First check if it's a correction command (e.g., "Change Badam retail to 950")
    const correctionResult = processVoiceCorrection(speechText, draftProducts);
    if (correctionResult.success) {
      setDraftProducts(correctionResult.drafts);
      setFinalTranscript(""); // clear to avoid re-triggering corrections
      triggerSound('notification'); // light confirmation slide
      return;
    }

    setProcessStep('analyzing');
    // Enforce strictly 1 product draft at a time
    const parsed = parseVoiceTranscript(speechText, existingItems).slice(0, 1);
    
    if (parsed.length > 0) {
      const singleProduct = parsed[0];
      const foundCat = categories.find(c => 
        singleProduct.name.toLowerCase().includes(c.name.toLowerCase()) || 
        c.name.toLowerCase().includes(singleProduct.name.toLowerCase())
      );
      
      const enrichedProduct = {
        ...singleProduct,
        categoryId: foundCat ? foundCat.id : (categories[0]?.id || '')
      };

      setDraftProducts([enrichedProduct]);

      // Initialize default duplicate choices
      const alreadyExists = existingItems.some(item => item.name.toLowerCase() === enrichedProduct.name.toLowerCase());
      if (alreadyExists) {
        setDuplicateDecisions(prev => ({
          ...prev,
          [enrichedProduct.id]: 'update_prices' // default recommendation
        }));
      }

      setProcessStep('done');
    } else {
      setProcessStep('captured');
    }
  };

  // Reset Draft container
  const clearAllDrafts = () => {
    setDraftProducts([]);
    setFinalTranscript("");
    setInterimTranscript("");
    setProcessStep('idle');
    setDuplicateDecisions({});
  };

  // Delete specific product card
  const deleteDraft = (id: string) => {
    setDraftProducts(prev => prev.filter(p => p.id !== id));
    triggerSound('product_added'); // subtle wood blip
  };

  // Edit specific product card inline
  const startEditing = (draft: VoiceDraftProduct) => {
    setEditingDraftId(draft.id);
    setEditingDraftName(draft.name);
    setEditingDraftRetail(draft.retailPrice.toString());
    setEditingDraftWholesale(draft.wholesalePrice.toString());
    setEditingDraftBuying(draft.buyingPrice.toString());
    setEditingDraftUnit(draft.unit || "KG");
    setEditingDraftCategory(draft.categoryId || categories[0]?.id || "");
  };

  const saveEditing = () => {
    if (!editingDraftName.trim()) {
      alert("Product Name cannot be blank");
      return;
    }

    setDraftProducts(prev => prev.map(p => {
      if (p.id === editingDraftId) {
        return {
          ...p,
          name: editingDraftName,
          retailPrice: parseFloat(editingDraftRetail) || 0,
          wholesalePrice: parseFloat(editingDraftWholesale) || 0,
          buyingPrice: parseFloat(editingDraftBuying) || 0,
          unit: editingDraftUnit,
          retailPriceUnit: editingDraftUnit,
          wholesalePriceUnit: editingDraftUnit,
          buyingPriceUnit: editingDraftUnit,
          categoryId: editingDraftCategory
        };
      }
      return p;
    }));

    setEditingDraftId(null);
    triggerSound('notification'); // refined executive reminder sound
  };

  // Submit and save everything!
  const handleSaveAll = async () => {
    if (draftProducts.length === 0) {
      alert("No voice products are captured or ready to save.");
      return;
    }

    setIsSavingToInventory(true);
    setSaveResult(null);

    // Minor delay to make the process feel robust and high-fidelity
    await new Promise(resolve => setTimeout(resolve, 800));

    // Convert draft Products to strict Database specifications
    const productsToSave = draftProducts.map(draft => {
      let alreadyExists: Item | undefined = existingItems.find(item => item.name.toLowerCase() === draft.name.toLowerCase());
      
      const dbObj: Omit<Item, 'id' | 'lastUpdated'> = {
        name: draft.name,
        categoryId: draft.categoryId || categories[0]?.id || "",
        quantity: alreadyExists ? alreadyExists.quantity : 1, // preserve stock if we're updating
        unit: draft.unit || 'KG',
        retailPrice: draft.retailPrice,
        retailPriceUnit: draft.retailPriceUnit || draft.unit || 'KG',
        wholesalePrice: draft.wholesalePrice,
        wholesalePriceUnit: draft.wholesalePriceUnit || draft.unit || 'KG',
        buyingPrice: draft.buyingPrice,
        buyingPriceUnit: draft.buyingPriceUnit || draft.unit || 'KG',
        notes: draft.originalText ? `Created via Voice: "${draft.originalText}"` : "Created via Voice Assistant",
        minStockLevel: 10,
        translations: draft.translations || { en: draft.name, hi: "", mr: "", 'hi-en': "" }
      };

      const decision = duplicateDecisions[draft.id] || "update_prices";

      if (alreadyExists && decision === 'update_prices') {
        // Mode coordinates a price update
        return {
          item: dbObj,
          mode: 'update' as const
        };
      } else {
        // Normal save or force copy
        return {
          item: dbObj,
          mode: 'create' as const
        };
      }
    });

    try {
      // Bulk save in App parent callback
      await onSaveAll(productsToSave);
      
      // Log history
      if (vSettings.saveHistory) {
        saveSessionToHistory(draftProducts.map(d => ({ name: d.name, price: d.retailPrice })));
      }

      triggerSound('bill_saved'); // delightful mechanical cash arpeggio
      
      setIsSavingToInventory(false);
      setSaveResult({ success: true, message: `Successfully added "${draftProducts[0].name}" into inventory catalog!` });
      
      // Delay closing to let success feedback shine
      setTimeout(() => {
        onClose();
      }, 1800);
      
    } catch (e: any) {
      console.error("Database save error in Voice Assistant:", e);
      setIsSavingToInventory(false);
      setSaveResult({
        success: false,
        message: e instanceof Error ? e.message : "Sync error. Item could not be added."
      });
      triggerSound('notification');
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-2 sm:p-4"
    >
      <motion.div 
        initial={{ scale: 0.95, y: 15 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 15 }}
        className="w-full max-w-4xl h-[95vh] sm:h-[90vh] bg-[var(--card)] border border-[var(--border)] rounded-[2rem] shadow-2xl flex flex-col overflow-hidden text-[var(--foreground)]"
      >
        {/* Header Ribbon */}
        <div className="flex items-center justify-between p-5 bg-gradient-to-r from-amber-500/10 via-[var(--background)] to-transparent border-b border-[var(--border)] shrink-0 animate-fadeIn">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-amber-500/15 flex items-center justify-center text-amber-500 shadow-inner">
              <Mic size={22} className={isListening ? "animate-pulse" : ""} />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight text-[var(--foreground)] flex items-center gap-2">
                Voice Product Assistant <span className="text-[9px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-500 border border-amber-500/30 font-black tracking-widest uppercase">NLP v3.0</span>
              </h2>
              <p className="text-[10px] font-bold opacity-50 uppercase tracking-widest text-[var(--foreground)]">Rapid Store Onboarding Mechanism</p>
            </div>
          </div>
 
          <div className="flex items-center gap-2">
            <button 
              onClick={onClose}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--background)] hover:bg-[var(--primary)]/10 text-[var(--foreground)] hover:text-[var(--foreground)] transition-all text-xs font-bold uppercase tracking-wider border border-[var(--border)] shadow-sm"
              id="voice-header-back-btn"
            >
              <Undo size={14} />
              <span>Back</span>
            </button>
            <button 
              onClick={onClose}
              className="p-1.5 rounded-xl bg-[var(--background)] hover:bg-[var(--primary)]/10 text-[var(--foreground)] hover:text-[var(--foreground)] transition-all border border-[var(--border)] shadow-sm"
              title="Close Panel"
              id="voice-header-close-btn"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-[var(--border)] bg-[var(--background)]/30 shrink-0">
          <button
            onClick={() => setActiveTab('assistant')}
            className={`flex-1 py-4 text-xs font-black uppercase tracking-widest border-b-2 flex items-center justify-center gap-2 transition-all ${
              activeTab === 'assistant' 
                ? 'border-amber-500 text-amber-500 bg-[var(--card)]/50' 
                : 'border-transparent opacity-60 hover:opacity-100 text-[var(--foreground)]'
            }`}
          >
            <Mic size={14} /> Voice Panel
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 py-4 text-xs font-black uppercase tracking-widest border-b-2 flex items-center justify-center gap-2 transition-all ${
              activeTab === 'history' 
                ? 'border-amber-500 text-amber-500 bg-[var(--card)]/50' 
                : 'border-transparent opacity-60 hover:opacity-100 text-[var(--foreground)]'
            }`}
          >
            <FileText size={14} /> Creation History
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`flex-1 py-4 text-xs font-black uppercase tracking-widest border-b-2 flex items-center justify-center gap-2 transition-all ${
              activeTab === 'settings' 
                ? 'border-amber-500 text-amber-500 bg-[var(--card)]/50' 
                : 'border-transparent opacity-60 hover:opacity-100 text-[var(--foreground)]'
            }`}
          >
            <Sliders size={14} /> Settings ({Object.values(vSettings).filter(Boolean).length})
          </button>
        </div>

        {/* Scrollable Body Canvas */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 bg-[var(--background)]/30">
          
          {activeTab === 'assistant' && (
            <div className="space-y-6">
              
              {/* MIC STATION PANEL */}
              <div className="relative rounded-3xl bg-[var(--card)] border border-[var(--border)] p-6 overflow-hidden flex flex-col items-center justify-center text-center space-y-5 shadow-sm">
                {/* Floating ambient glow */}
                <div className={`absolute -top-32 -left-32 w-64 h-64 rounded-full filter blur-[100px] transition-all opacity-15 ${isListening ? "bg-amber-500 scale-150" : "bg-teal-500"}`} />
                <div className={`absolute -bottom-32 -right-32 w-64 h-64 rounded-full filter blur-[100px] transition-all opacity-15 ${isListening ? "bg-amber-500 scale-150" : "bg-amber-500"}`} />

                {/* Instant Quick Lang Selector */}
                <div className="flex flex-wrap justify-center items-center gap-2 pt-2 pb-1 relative z-20">
                  <span className="text-[9px] uppercase font-black tracking-widest text-[var(--foreground)]/50 mr-1">Locale Listener:</span>
                  {[
                    { id: "hi-IN", label: "🇮🇳 हिन्दी", code: "hi" },
                    { id: "mr-IN", label: "🇮🇳 मराठी", code: "mr" },
                    { id: "en-IN", label: "🇮🇳 Hinglish / Eng", code: "en-in" }
                  ].map(loc => (
                    <button
                      key={loc.id}
                      onClick={() => {
                        setMicLocale(loc.id);
                        triggerSound('product_added');
                      }}
                      className={`px-3 py-1.5 rounded-full text-[10px] font-black transition-all flex items-center gap-1 border ${
                        micLocale === loc.id
                          ? "bg-amber-500/20 text-amber-500 border-amber-500/40 font-extrabold shadow-md scale-105"
                          : "bg-[var(--background)] text-[var(--foreground)]/60 border-[var(--border)] hover:bg-[var(--primary)]/5 hover:text-[var(--foreground)]"
                      }`}
                    >
                      {loc.label}
                    </button>
                  ))}
                </div>

                {/* Pulsing visualizer circle */}
                <div className="relative flex items-center justify-center h-28 w-28">
                  <AnimatePresence>
                    {isListening && (
                      <>
                        <motion.div 
                           initial={{ scale: 0.8, opacity: 0.5 }}
                           animate={{ scale: [1, 2.2], opacity: [0.5, 0] }}
                           exit={{ opacity: 0 }}
                           transition={{ duration: 1.5, repeat: Infinity, ease: "easeOut" }}
                           className="absolute inset-0 rounded-full border border-amber-500/40 pointer-events-none"
                        />
                        <motion.div 
                           initial={{ scale: 0.8, opacity: 0.3 }}
                           animate={{ scale: [1, 1.8], opacity: [0.3, 0] }}
                           exit={{ opacity: 0 }}
                           transition={{ duration: 1.5, repeat: Infinity, ease: "easeOut", delay: 0.5 }}
                           className="absolute inset-0 rounded-full border border-amber-500/40 pointer-events-none"
                        />
                      </>
                    )}
                  </AnimatePresence>

                  <motion.button
                    onClick={toggleListening}
                    whileHover={{ scale: 1.06 }}
                    whileTap={{ scale: 0.94 }}
                    animate={isListening ? {
                      scale: [1, 1.05, 1],
                      boxShadow: [
                        "0 10px 25px -5px rgba(245, 158, 11, 0.4), 0 0 0 0px rgba(245, 158, 11, 0.4)",
                        "0 15px 30px -5px rgba(245, 158, 11, 0.5), 0 0 15px 12px rgba(245, 158, 11, 0)",
                        "0 10px 25px -5px rgba(245, 158, 11, 0.4), 0 0 0 0px rgba(245, 158, 11, 0)"
                      ]
                    } : {
                      scale: 1,
                      boxShadow: "0 4px 10px rgba(0, 0, 0, 0.05)"
                    }}
                    transition={isListening ? {
                      scale: {
                        duration: 1.5,
                        repeat: Infinity,
                        ease: "easeInOut"
                      },
                      boxShadow: {
                        duration: 1.5,
                        repeat: Infinity,
                        ease: "easeOut"
                      }
                    } : { duration: 0.2 }}
                    className={`relative z-10 flex items-center justify-center h-24 w-24 rounded-full border-2 border-[var(--border)] select-none outline-none focus:outline-none focus:ring-2 focus:ring-amber-500/50 ${
                      isListening 
                        ? 'bg-gradient-to-tr from-amber-500 to-amber-600 text-white shadow-amber-500/30' 
                        : 'bg-[var(--background)] hover:bg-[var(--primary)]/10 text-amber-500'
                    }`}
                  >
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={isListening ? "mic-off" : "mic-on"}
                        initial={{ scale: 0.6, rotate: -30, opacity: 0 }}
                        animate={{ scale: 1, rotate: 0, opacity: 1 }}
                        exit={{ scale: 0.6, rotate: 30, opacity: 0 }}
                        transition={{ type: "spring", stiffness: 350, damping: 15 }}
                      >
                        {isListening ? (
                          <MicOff size={36} className="text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.15)]" />
                        ) : (
                          <Mic size={36} className="text-amber-500 drop-shadow-[0_2px_8px_rgba(245,158,11,0.2)]" />
                        )}
                      </motion.div>
                    </AnimatePresence>
                  </motion.button>
                </div>

                {/* Step indicator pipeline */}
                {vSettings.showSteps && (
                  <div className="flex flex-wrap justify-center items-center gap-3 text-[10px] uppercase font-black tracking-wider text-[var(--foreground)]/50">
                    <span className={`px-2 py-1 rounded border border-[var(--border)]/60 bg-[var(--background)] flex items-center gap-1.5 transition-colors ${processStep === 'listening' ? 'text-amber-500 border-amber-500/30 bg-amber-500/10' : ''}`}>
                      🎤 1. Listening
                    </span>
                    <span className="opacity-20">→</span>
                    <span className={`px-2 py-1 rounded border border-[var(--border)]/60 bg-[var(--background)] flex items-center gap-1.5 transition-colors ${processStep === 'captured' ? 'text-amber-500 border-amber-500/30 bg-amber-500/10' : ''}`}>
                      📥 2. Captured
                    </span>
                    <span className="opacity-20">→</span>
                    <span className={`px-2 py-1 rounded border border-[var(--border)]/60 bg-[var(--background)] flex items-center gap-1.5 transition-colors ${processStep === 'analyzing' ? 'text-amber-500 border-amber-500/30 bg-amber-500/10' : ''}`}>
                      ⚡ 3. Structuring
                    </span>
                    <span className="opacity-20">→</span>
                    <span className={`px-2 py-1 rounded border border-[var(--border)]/60 bg-[var(--background)] flex items-center gap-1.5 transition-colors ${processStep === 'done' ? 'text-teal-500 border-teal-500/30 bg-teal-500/10' : ''}`}>
                      ✓ 4. Extracted
                    </span>
                  </div>
                )}

                {/* Subtitles caption - Always enabled while speaking/listening */}
                {(isListening || finalTranscript) ? (
                  <div className="w-full max-w-xl min-h-[4rem] text-center px-4">
                    {isListening ? (
                      <div className="w-full space-y-4 bg-gradient-to-b from-transparent to-amber-500/5 p-4 rounded-3xl border border-amber-500/10">
                        {/* Dynamic Gemini-style quad-colored bouncing soundwave visualizer */}
                        <div className="flex justify-center items-center gap-1.5 h-12 my-1">
                          {[1.4, 0.8, 2.2, 1.5, 2.5, 1.1, 2.0, 0.9, 1.6, 2.3, 1.2, 1.8].map((factor, idx) => (
                            <motion.span
                              key={idx}
                              className={`w-1 rounded-full ${
                                idx % 4 === 0 
                                  ? 'bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]' 
                                  : idx % 4 === 1 
                                    ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]' 
                                    : idx % 4 === 2 
                                      ? 'bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]' 
                                      : 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]'
                              }`}
                              animate={{
                                height: ["10px", `${42 * factor}px`, "10px"],
                                opacity: [0.7, 1.0, 0.7]
                              }}
                              transition={{
                                duration: 0.6 + idx * 0.05,
                                repeat: Infinity,
                                ease: "easeInOut"
                              }}
                            />
                          ))}
                        </div>

                        <div className="flex items-center justify-center gap-2 text-xs text-amber-500 font-extrabold uppercase tracking-widest">
                          <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-500 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-600"></span>
                          </span>
                          <span>Listening Hands-free (Stop speaking to auto-parse)</span>
                        </div>
                        {/* Immersive Subtitles overlay with dark background */}
                        <div className="p-4 rounded-2xl bg-black/85 backdrop-blur-md border border-white/10 text-left space-y-2 min-h-[5.5rem] shadow-2xl">
                          <p className="text-[9px] font-black uppercase tracking-widest text-white/40">Real-time Dictation Output</p>
                          <p className="text-base font-bold tracking-wide leading-relaxed text-white">
                            {finalTranscript && <span className="text-white/70 inline">{finalTranscript} </span>}
                            {interimTranscript ? (
                              <span className="text-amber-400 font-black border-b border-amber-400/30 pb-0.5 inline-block">{interimTranscript}</span>
                            ) : !finalTranscript ? (
                              <span className="text-white/35 italic font-medium">Start speaking clearly now. Say items, prices, and units...</span>
                            ) : null}
                          </p>
                        </div>
                      </div>
                    ) : finalTranscript ? (
                      <div className="w-full space-y-3 pt-3 border-t border-[var(--border)] text-left animate-fadeIn">
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] uppercase tracking-widest text-[var(--foreground)]/60 font-black">Heard Transcript (Editable)</span>
                          {aiDetectedLanguage && (
                            <span className="px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-[9px] text-amber-500 font-black uppercase tracking-widest">
                              🌐 Detected: {aiDetectedLanguage}
                            </span>
                          )}
                        </div>
                        <textarea
                          value={finalTranscript}
                          onChange={(e) => setFinalTranscript(e.target.value)}
                          className="w-full min-h-[5.5rem] px-4 py-3 rounded-2xl bg-[var(--background)] border border-[var(--border)] text-sm font-medium text-[var(--foreground)] focus:outline-none focus:border-amber-500/50 resize-y"
                          placeholder="What you spoke or want to create will show up here..."
                        />
                        <div className="flex gap-2 justify-end">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setFinalTranscript("");
                              setInterimTranscript("");
                              accumulatedFinalTextRef.current = "";
                              setAiDetectedLanguage("");
                              setProcessStep('idle');
                            }}
                            className="text-[10px] rounded-xl py-1.5 px-3"
                          >
                            Clear
                          </Button>
                          <Button
                            size="sm"
                            disabled={isAiProcessing || !finalTranscript.trim()}
                            onClick={() => parseWithGemini(finalTranscript)}
                            className="bg-amber-500 hover:bg-amber-600 text-white border-none font-black text-[10px] uppercase flex items-center gap-1.5 shadow-lg relative overflow-hidden"
                          >
                            {isAiProcessing ? (
                              <>
                                <RefreshCw size={12} className="animate-spin" /> Processing Dialect...
                              </>
                            ) : (
                              <>
                                <Sparkles size={12} className="text-amber-200" /> Structure with Gemini AI
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <div className="opacity-50 space-y-1 text-[var(--foreground)] text-center max-w-xl px-4">
                    <p className="text-xs font-semibold">Tap the mic to start listing. You can say your product detail in a single voice entry!</p>
                    <p className="text-[10px] font-mono opacity-85">Example: "Kaju A grade retail 1200 per kilo wholesale 1100 cost 1000"</p>
                  </div>
                )}

                {recognitionError && (
                  <p className="text-xs bg-red-500/15 border border-red-500/30 text-red-500 px-4 py-2 rounded-xl flex items-center gap-2">
                    <AlertTriangle size={14} /> {recognitionError}
                  </p>
                )}
              </div>

              {/* QUICK HINT CARD */}
              <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-4 flex gap-3 text-sm">
                <HelpCircle className="text-amber-500 shrink-0 mt-0.5" size={18} />
                <div className="space-y-1">
                  <p className="font-extrabold text-amber-500/95 text-xs uppercase tracking-widest">💡 Speech Prompt Guide (Hindi / English / Marathi / Hinglish)</p>
                  <p className="text-xs text-[var(--foreground)]/80">
                    Just mention the <strong>name</strong> and numbers near keywords like <strong>retail, wholesale, and cost</strong>. Include units if desirable.
                  </p>
                  <p className="text-[11px] text-[var(--foreground)]/50 font-mono">
                    "Kaju A grade retail 1200 kilo, wholesale 1100, cost 1000"
                  </p>
                </div>
              </div>

              {/* CORRECTION STATUS BAR */}
              {draftProducts.length > 0 && (
                <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-4 flex justify-between items-center text-xs">
                  <div className="flex items-center gap-2">
                    <Sparkles className="text-amber-500" size={14} />
                    <span className="text-[var(--foreground)]/70">Correction mode is live! Say: <strong>"Change [item] retail/wholesale/cost to [price]"</strong></span>
                  </div>
                  <span className="px-1.5 py-0.5 rounded bg-[var(--background)] border border-[var(--border)] font-mono text-[9px] text-[var(--foreground)]/50">ACTIVE</span>
                </div>
              )}

              {/* REVIEW SCREEN TITLE PANEL */}
              {draftProducts.length > 0 && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center px-1">
                    <h3 className="text-sm font-black uppercase tracking-widest text-[#d97706] dark:text-[#f59e0b] flex items-center gap-2">
                      📋 Capture Review <span className="bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-full text-[10px] font-bold">{draftProducts.length} Draft Products Detected</span>
                    </h3>
                    <Button variant="outline" onClick={clearAllDrafts} size="sm" className="text-red-500 hover:text-red-600 font-extrabold uppercase text-[10px] tracking-wider bg-red-500/5 hover:bg-red-500/10 rounded-lg border border-red-500/20">
                      <Trash2 size={12} /> Clear Session
                    </Button>
                  </div>

                  {/* DRAFT CARDS GRID */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {draftProducts.map((draft) => {
                      const isEditing = editingDraftId === draft.id;
                      const isDuplicate = existingItems.some(i => i.name.toLowerCase() === draft.name.toLowerCase());
                      const duplicateDecision = duplicateDecisions[draft.id] || "update_prices";
                      
                      return (
                        <motion.div 
                          key={draft.id}
                          layout
                          className={`rounded-2xl border p-5 space-y-4 relative overflow-hidden transition-all bg-[var(--card)] border-[var(--border)] ${
                            isDuplicate 
                              ? 'border-yellow-500/30 bg-gradient-to-br from-[var(--card)] to-yellow-500/5 shadow-lg shadow-yellow-500/5' 
                              : 'hover:border-[var(--primary)]/35 shadow-sm'
                          }`}
                        >
                          {/* Top Tag alerts */}
                          {isDuplicate && vSettings.duplicateDetection && (
                            <div className="flex items-center gap-1.5 bg-yellow-500/15 border border-yellow-500/30 rounded-xl px-3 py-1.5 text-[10px] text-yellow-600 dark:text-yellow-400 font-black tracking-wide">
                              <AlertTriangle size={12} className="shrink-0" />
                              Duplicate detected in Database!
                            </div>
                          )}

                          {isEditing ? (
                            /* EDIT MODE */
                            <div className="space-y-4 pt-1">
                              <div>
                                <label className="text-[9px] font-black uppercase tracking-widest text-[var(--foreground)]/55 mb-1 block">Item Name</label>
                                <input 
                                  value={editingDraftName}
                                  onChange={e => setEditingDraftName(e.target.value)}
                                  className="w-full bg-[var(--background)] text-[var(--foreground)] px-3 py-2 rounded-xl text-sm font-bold border border-[var(--border)] focus:outline-none focus:border-amber-500/50"
                                />
                              </div>

                              <div className="grid grid-cols-3 gap-2">
                                <div>
                                  <label className="text-[9px] font-black uppercase tracking-widest text-[var(--foreground)]/55 mb-1 block">Retail</label>
                                  <input 
                                    type="number"
                                    value={editingDraftRetail}
                                    onChange={e => setEditingDraftRetail(e.target.value)}
                                    className="w-full bg-[var(--background)] text-[var(--foreground)] px-3 py-2 rounded-xl text-sm font-bold border border-[var(--border)] focus:outline-none focus:border-amber-500/50"
                                  />
                                </div>
                                <div>
                                  <label className="text-[9px] font-black uppercase tracking-widest text-[var(--foreground)]/55 mb-1 block">Wholesale</label>
                                  <input 
                                    type="number"
                                    value={editingDraftWholesale}
                                    onChange={e => setEditingDraftWholesale(e.target.value)}
                                    className="w-full bg-[var(--background)] text-[var(--foreground)] px-3 py-2 rounded-xl text-sm font-bold border border-[var(--border)] focus:outline-none focus:border-amber-500/50"
                                  />
                                </div>
                                <div>
                                  <label className="text-[9px] font-black uppercase tracking-widest text-[var(--foreground)]/55 mb-1 block">Cost</label>
                                  <input 
                                    type="number"
                                    value={editingDraftBuying}
                                    onChange={e => setEditingDraftBuying(e.target.value)}
                                    className="w-full bg-[var(--background)] text-[var(--foreground)] px-3 py-2 rounded-xl text-sm font-bold border border-[var(--border)] focus:outline-none focus:border-amber-500/50"
                                  />
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <label className="text-[9px] font-black uppercase tracking-widest text-[var(--foreground)]/55 mb-1 block">Unit</label>
                                  <select 
                                    value={editingDraftUnit}
                                    onChange={e => setEditingDraftUnit(e.target.value)}
                                    className="w-full bg-[var(--background)] text-[var(--foreground)] px-3 py-2 rounded-xl text-xs font-bold border border-[var(--border)] focus:outline-none focus:border-amber-500/50"
                                  >
                                    {["KG", "GM", "LTR", "ML", "PCS", "PKT", "BOX", "CRT", "DZN", "BDL", "TRY", "UNT"].map(un => (
                                      <option key={un} className="bg-[var(--card)] text-[var(--foreground)]" value={un}>{un}</option>
                                    ))}
                                  </select>
                                </div>

                                <div>
                                  <label className="text-[9px] font-black uppercase tracking-widest text-[var(--foreground)]/55 mb-1 block">Category</label>
                                  <select 
                                    value={editingDraftCategory}
                                    onChange={e => setEditingDraftCategory(e.target.value)}
                                    className="w-full bg-[var(--background)] text-[var(--foreground)] px-3 py-2 rounded-xl text-xs font-bold border border-[var(--border)] focus:outline-none focus:border-amber-500/50"
                                  >
                                    {categories.map(c => (
                                      <option key={c.id} className="bg-[var(--card)] text-[var(--foreground)]" value={c.id}>{c.icon} {c.name}</option>
                                    ))}
                                  </select>
                                </div>
                              </div>

                              <div className="flex gap-2 justify-end pt-2">
                                <Button size="sm" variant="outline" className="text-[var(--foreground)]" onClick={() => setEditingDraftId(null)}>Cancel</Button>
                                <Button size="sm" onClick={saveEditing} className="bg-teal-500 hover:bg-teal-600 text-white font-black uppercase"><Check size={12} /> Apply</Button>
                              </div>
                            </div>
                          ) : (
                            /* DISPLAY MODE */
                            <div className="space-y-4 text-[var(--foreground)]">
                              <div className="flex justify-between items-start">
                                <div>
                                  <p className="text-base font-black text-[var(--foreground)] tracking-tight flex items-baseline gap-2 flex-wrap">
                                    {draft.name}
                                    {draft.translations && (draft.translations.hi || draft.translations.mr) && (
                                      <span className="text-[10px] font-bold text-amber-500 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                                        ✨ {[draft.translations.hi, draft.translations.mr].filter(Boolean).join(" / ")}
                                      </span>
                                    )}
                                  </p>
                                  <p className="text-[9px] font-black opacity-40 uppercase tracking-widest block text-[var(--foreground)]/60">Unit of measure: {draft.unit || "KG"}</p>
                                </div>

                                <div className="flex gap-1.5">
                                  <button onClick={() => startEditing(draft)} className="p-1.5 rounded-lg bg-[var(--background)] hover:bg-[var(--primary)]/10 text-[var(--foreground)]/50 hover:text-[var(--foreground)] transition-all border border-[var(--border)]"><Edit2 size={12} /></button>
                                  <button onClick={() => deleteDraft(draft.id)} className="p-1.5 rounded-lg bg-red-500/5 hover:bg-red-500/10 text-red-500 hover:text-red-600 transition-all border border-red-500/10"><Trash2 size={12} /></button>
                                </div>
                              </div>

                              {/* Prices Grid */}
                              <div className="grid grid-cols-3 gap-2">
                                <div className="bg-[var(--background)] p-2.5 rounded-xl text-center border border-[var(--border)]">
                                  <p className="text-[8px] font-black uppercase tracking-widest text-[var(--foreground)]/50">Retail Price</p>
                                  <p className="text-sm font-black text-[var(--foreground)]">₹{draft.retailPrice}</p>
                                  <p className="text-[8px] font-mono opacity-50 text-[var(--foreground)]/60">/ {draft.retailPriceUnit}</p>
                                </div>
                                <div className="bg-[var(--background)] p-2.5 rounded-xl text-center border border-[var(--border)]">
                                  <p className="text-[8px] font-black uppercase tracking-widest text-[var(--foreground)]/50">Wholesale</p>
                                  <p className="text-sm font-black text-[var(--foreground)]">₹{draft.wholesalePrice}</p>
                                  <p className="text-[8px] font-mono opacity-50 text-[var(--foreground)]/60">/ {draft.wholesalePriceUnit}</p>
                                </div>
                                <div className="bg-[var(--background)] p-2.5 rounded-xl text-center border border-[var(--border)]">
                                  <p className="text-[8px] font-black uppercase tracking-widest text-[var(--foreground)]/50">Cost Price</p>
                                  <p className="text-sm font-black text-[var(--foreground)]">₹{draft.buyingPrice}</p>
                                  <p className="text-[8px] font-mono opacity-50 text-[var(--foreground)]/60">/ {draft.buyingPriceUnit}</p>
                                </div>
                              </div>

                              {/* Confidence metrics alerts */}
                              {vSettings.showConfidence && (
                                <div className="flex items-center gap-3 text-[10px] border-t border-[var(--border)] pt-3">
                                  <span className="text-[var(--foreground)]/50 font-bold">Accuracy:</span>
                                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-black ${draft.confidence.name >= 80 ? 'text-green-500 bg-green-500/5 border border-green-500/20' : 'text-yellow-600 bg-yellow-500/5 border border-yellow-500/20'}`}>
                                    Name: {draft.confidence.name}%
                                  </span>
                                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-black ${draft.confidence.retailPrice >= 80 ? 'text-green-500 bg-green-500/5 border border-green-500/20' : 'text-yellow-600 bg-yellow-500/5 border border-yellow-500/20'}`}>
                                    Price: {draft.confidence.retailPrice}%
                                  </span>
                                </div>
                              )}

                              {/* Category display */}
                              <div className="flex items-center gap-1.5 text-[10px] text-[var(--foreground)]/65">
                                <span className="font-extrabold uppercase tracking-wider">Assigned Category:</span>
                                <span className="bg-[var(--background)] px-2 py-0.5 rounded border border-[var(--border)] text-[var(--foreground)] font-black">
                                  {categories.find(c => c.id === draft.categoryId)?.icon || "📦"} {categories.find(c => c.id === draft.categoryId)?.name || "Default Category"}
                                </span>
                              </div>

                              {/* Duplicate Selector response if isDuplicate is true */}
                              {isDuplicate && vSettings.duplicateDetection && (
                                <div className="border-t border-yellow-500/20 pt-3 space-y-2">
                                  <p className="text-[9px] font-black uppercase tracking-widest text-yellow-500">Action Recommendation:</p>
                                  <div className="grid grid-cols-2 gap-2">
                                    <button
                                      onClick={() => {
                                        setDuplicateDecisions(prev => ({ ...prev, [draft.id]: 'update_prices' }));
                                        triggerSound('product_added');
                                      }}
                                      className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border ${
                                        duplicateDecision === 'update_prices'
                                          ? 'bg-yellow-500/20 border-yellow-500 text-yellow-600 dark:text-yellow-400'
                                          : 'bg-[var(--background)] border-[var(--border)] text-[var(--foreground)]/60 hover:text-[var(--foreground)]'
                                      }`}
                                    >
                                      <RefreshCw size={10} /> Update Prices
                                    </button>
                                    <button
                                      onClick={() => {
                                        setDuplicateDecisions(prev => ({ ...prev, [draft.id]: 'create_new' }));
                                        triggerSound('product_added');
                                      }}
                                      className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border ${
                                        duplicateDecision === 'create_new'
                                          ? 'bg-yellow-500/20 border-yellow-500 text-yellow-600 dark:text-yellow-400'
                                          : 'bg-[var(--background)] border-[var(--border)] text-[var(--foreground)]/60 hover:text-[var(--foreground)]'
                                      }`}
                                    >
                                      <PlusCircle size={10} /> Create New
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </motion.div>
                      );
                    })}
                  </div>

                  {/* MASTER SUBMIT ACTIONS */}
                  <div className="pt-4 border-t border-[var(--border)] flex flex-col sm:flex-row gap-3">
                    <Button 
                      variant="outline"
                      onClick={onClose}
                      className="border border-[var(--border)] text-[var(--foreground)]/80 hover:bg-[var(--foreground)]/[0.05] font-black uppercase py-4 rounded-xl flex-1 flex items-center justify-center gap-2 text-sm"
                    >
                      <Undo size={16} /> Cancel & Go Back
                    </Button>
                    <Button 
                      className="flex-[2] bg-amber-500 hover:bg-amber-600 text-white font-black uppercase py-4 rounded-xl flex items-center justify-center gap-2 text-sm shadow-lg ring-4 ring-amber-500/10 border-none"
                      onClick={handleSaveAll}
                    >
                      <Save size={18} /> Review & Add {draftProducts.length} Products
                    </Button>
                  </div>
                </div>
              )}

              {/* EMPTY STATE FALLBACK GO BACK BUTTON */}
              {draftProducts.length === 0 && (
                <div className="pt-4 border-t border-[var(--border)]/50 flex justify-center w-full">
                  <Button 
                    variant="outline" 
                    onClick={onClose}
                    className="border border-[var(--border)] text-[var(--foreground)] hover:bg-[var(--foreground)]/[0.05] font-black uppercase tracking-widest text-[11px] rounded-2xl py-3 px-6 flex items-center justify-center gap-2"
                  >
                    <Undo size={14} /> Close & Back to Catalog
                  </Button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'history' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <FileText className="text-amber-500" size={18} />
                <h3 className="text-xs font-black uppercase tracking-widest text-[var(--foreground)]/60">Vocal Session Audio Logs</h3>
              </div>
              
              {historyList.length === 0 ? (
                <div className="text-center py-12 bg-[var(--background)]/30 rounded-2xl border border-[var(--border)] opacity-60">
                  <Info className="mx-auto mb-2 text-[var(--foreground)]/60" size={24} />
                  <p className="text-xs font-bold uppercase tracking-wider text-[var(--foreground)]/70">No Voice Sessions log exists yet</p>
                  <p className="text-[10px] text-[var(--foreground)]/60">Products saved via speech will show up in this audit log.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {historyList.map((ses, idx) => (
                    <div key={idx} className="bg-[var(--background)] border border-[var(--border)] p-4 rounded-2xl flex justify-between items-center shadow-sm animate-fadeIn">
                      <div>
                        <p className="text-xs font-black text-[var(--foreground)]">{new Date(ses.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                        <p className="text-[10px] text-[var(--foreground)]/50">{new Date(ses.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {ses.products.map((p, pIdx) => (
                            <span key={pIdx} className="bg-[var(--card)] px-2 py-0.5 rounded text-[10px] text-[var(--foreground)]/70 font-mono border border-[var(--border)]">
                              {p.name} (₹{p.price})
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="bg-teal-500/15 text-teal-600 dark:text-teal-400 border border-teal-500/30 font-black text-xs px-3 py-1.5 rounded-full uppercase tracking-wider">
                          +{ses.count} Items
                        </span>
                      </div>
                    </div>
                  ))}
                  
                  <button 
                    onClick={() => {
                      localStorage.removeItem('ts_voice_history');
                      setHistoryList([]);
                      triggerSound('notification');
                    }}
                    className="w-full text-center py-3 text-red-500 hover:text-red-600 text-xs font-black uppercase tracking-widest bg-red-400/5 hover:bg-red-400/10 rounded-xl transition-all border border-red-500/15 cursor-pointer"
                  >
                    Clear History Audit Logs
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="flex items-center gap-2">
                <Sliders className="text-amber-500" size={18} />
                <h3 className="text-xs font-black uppercase tracking-widest text-[var(--foreground)]/60">Voice assistant custom preferences</h3>
              </div>

              <div className="bg-[var(--card)] border border-[var(--border)] divide-y divide-[var(--border)] rounded-2xl overflow-hidden shadow-[var(--shadow-lg)]">
                
                {/* 1. ENABLE */}
                <div className="p-4 flex items-center justify-between hover:bg-[var(--foreground)]/[0.02] transition-colors">
                  <div>
                    <p className="text-xs font-black text-[var(--foreground)]">Enable Voice Product Assistant</p>
                    <p className="text-[10px] opacity-50 text-[var(--foreground)]/80">Activate microphone triggering interfaces</p>
                  </div>
                  <input 
                    type="checkbox"
                    checked={vSettings.enabled}
                    onChange={e => persistSettings({ ...vSettings, enabled: e.target.checked })}
                    className="h-5 w-10 appearance-none bg-[var(--foreground)]/[0.15] rounded-full cursor-pointer relative checked:bg-amber-500 transition-colors after:content-[''] after:absolute after:h-4 after:w-4 after:bg-white after:rounded-full after:top-0.5 after:left-0.5 checked:after:translate-x-5 after:transition-transform"
                  />
                </div>

                {/* 2. RECOGNITION LANGUAGE EN */}
                <div className="p-4 flex items-center justify-between hover:bg-[var(--foreground)]/[0.02] transition-colors">
                  <div>
                    <p className="text-xs font-black text-[var(--foreground)]">Enable English Recognition</p>
                    <p className="text-[10px] opacity-50 text-[var(--foreground)]/80">Optimize listener locale for English standard commands</p>
                  </div>
                  <input 
                    type="checkbox"
                    checked={vSettings.english}
                    onChange={e => persistSettings({ ...vSettings, english: e.target.checked })}
                    className="h-5 w-10 appearance-none bg-[var(--foreground)]/[0.15] rounded-full cursor-pointer relative checked:bg-amber-500 transition-colors after:content-[''] after:absolute after:h-4 after:w-4 after:bg-white after:rounded-full after:top-0.5 after:left-0.5 checked:after:translate-x-5 after:transition-transform"
                  />
                </div>

                {/* 3. RECOGNITION LANGUAGE HINDI */}
                <div className="p-4 flex items-center justify-between hover:bg-[var(--foreground)]/[0.02] transition-colors">
                  <div>
                    <p className="text-xs font-black text-[var(--foreground)]">Enable Hindi Recognition (हिन्दी)</p>
                    <p className="text-[10px] opacity-50 text-[var(--foreground)]/80">Accept high accuracy Hindi spoken names & prices (Badam retail 900)</p>
                  </div>
                  <input 
                    type="checkbox"
                    checked={vSettings.hindi}
                    onChange={e => persistSettings({ ...vSettings, hindi: e.target.checked })}
                    className="h-5 w-10 appearance-none bg-[var(--foreground)]/[0.15] rounded-full cursor-pointer relative checked:bg-amber-500 transition-colors after:content-[''] after:absolute after:h-4 after:w-4 after:bg-white after:rounded-full after:top-0.5 after:left-0.5 checked:after:translate-x-5 after:transition-transform"
                  />
                </div>

                {/* 4. RECOGNITION LANGUAGE MARATHI */}
                <div className="p-4 flex items-center justify-between hover:bg-[var(--foreground)]/[0.02] transition-colors">
                  <div>
                    <p className="text-xs font-black text-[var(--foreground)]">Enable Marathi Recognition (मराठी)</p>
                    <p className="text-[10px] opacity-50 text-[var(--foreground)]/80">Optimize phonetics matching for Marathi sentences</p>
                  </div>
                  <input 
                    type="checkbox"
                    checked={vSettings.marathi}
                    onChange={e => persistSettings({ ...vSettings, marathi: e.target.checked })}
                    className="h-5 w-10 appearance-none bg-[var(--foreground)]/[0.15] rounded-full cursor-pointer relative checked:bg-amber-500 transition-colors after:content-[''] after:absolute after:h-4 after:w-4 after:bg-white after:rounded-full after:top-0.5 after:left-0.5 checked:after:translate-x-5 after:transition-transform"
                  />
                </div>

                {/* 5. MULTI PRODUCT ENTRY REMOVED FOR ENFORCING SINGLE ITEM AT A TIME */}

                {/* 6. SHOW LIVE */}
                <div className="p-4 flex items-center justify-between hover:bg-[var(--foreground)]/[0.02] transition-colors">
                  <div>
                    <p className="text-xs font-black text-[var(--foreground)]">Show Live Recognition Captions</p>
                    <p className="text-[10px] opacity-50 text-[var(--foreground)]/80">Render raw text real-time as words stream from mic</p>
                  </div>
                  <input 
                    type="checkbox"
                    checked={vSettings.showLive}
                    onChange={e => persistSettings({ ...vSettings, showLive: e.target.checked })}
                    className="h-5 w-10 appearance-none bg-[var(--foreground)]/[0.15] rounded-full cursor-pointer relative checked:bg-amber-500 transition-colors after:content-[''] after:absolute after:h-4 after:w-4 after:bg-white after:rounded-full after:top-0.5 after:left-0.5 checked:after:translate-x-5 after:transition-transform"
                  />
                </div>

                {/* 7. SHOW STEPS */}
                <div className="p-4 flex items-center justify-between hover:bg-[var(--foreground)]/[0.02] transition-colors">
                  <div>
                    <p className="text-xs font-black text-[var(--foreground)]">Show Processing Steps</p>
                    <p className="text-[10px] opacity-50 text-[var(--foreground)]/80">Display current state flags (listening, captured, structuring, extracted)</p>
                  </div>
                  <input 
                    type="checkbox"
                    checked={vSettings.showSteps}
                    onChange={e => persistSettings({ ...vSettings, showSteps: e.target.checked })}
                    className="h-5 w-10 appearance-none bg-[var(--foreground)]/[0.15] rounded-full cursor-pointer relative checked:bg-amber-500 transition-colors after:content-[''] after:absolute after:h-4 after:w-4 after:bg-white after:rounded-full after:top-0.5 after:left-0.5 checked:after:translate-x-5 after:transition-transform"
                  />
                </div>

                {/* 8. SHOW CONFIDENCE */}
                <div className="p-4 flex items-center justify-between hover:bg-[var(--foreground)]/[0.02] transition-colors">
                  <div>
                    <p className="text-xs font-black text-[var(--foreground)]">Show Confidence Indicator</p>
                    <p className="text-[10px] opacity-50 text-[var(--foreground)]/80">Expose phonetic accuracy diagnostics metrics on review cards</p>
                  </div>
                  <input 
                    type="checkbox"
                    checked={vSettings.showConfidence}
                    onChange={e => persistSettings({ ...vSettings, showConfidence: e.target.checked })}
                    className="h-5 w-10 appearance-none bg-[var(--foreground)]/[0.15] rounded-full cursor-pointer relative checked:bg-amber-500 transition-colors after:content-[''] after:absolute after:h-4 after:w-4 after:bg-white after:rounded-full after:top-0.5 after:left-0.5 checked:after:translate-x-5 after:transition-transform"
                  />
                </div>

                {/* 9. DUPLICATE DETECTION */}
                <div className="p-4 flex items-center justify-between hover:bg-[var(--foreground)]/[0.02] transition-colors">
                  <div>
                    <p className="text-xs font-black text-[var(--foreground)]">Enable Duplicate Detection</p>
                    <p className="text-[10px] opacity-50 text-[var(--foreground)]/80">Warn and assist when spelling matches an item already in catalog</p>
                  </div>
                  <input 
                    type="checkbox"
                    checked={vSettings.duplicateDetection}
                    onChange={e => persistSettings({ ...vSettings, duplicateDetection: e.target.checked })}
                    className="h-5 w-10 appearance-none bg-[var(--foreground)]/[0.15] rounded-full cursor-pointer relative checked:bg-amber-500 transition-colors after:content-[''] after:absolute after:h-4 after:w-4 after:bg-white after:rounded-full after:top-0.5 after:left-0.5 checked:after:translate-x-5 after:transition-transform"
                  />
                </div>

                {/* 10. VOICE FEEDBACK */}
                <div className="p-4 flex items-center justify-between hover:bg-[var(--foreground)]/[0.02] transition-colors">
                  <div>
                    <p className="text-xs font-black text-[var(--foreground)]">Enable Voice Feedback Sounds</p>
                    <p className="text-[10px] opacity-50 text-[var(--foreground)]/80">Play satisfying synthesized acoustic alerts on mic actions</p>
                  </div>
                  <input 
                    type="checkbox"
                    checked={vSettings.soundFeedback}
                    onChange={e => persistSettings({ ...vSettings, soundFeedback: e.target.checked })}
                    className="h-5 w-10 appearance-none bg-[var(--foreground)]/[0.15] rounded-full cursor-pointer relative checked:bg-amber-500 transition-colors after:content-[''] after:absolute after:h-4 after:w-4 after:bg-white after:rounded-full after:top-0.5 after:left-0.5 checked:after:translate-x-5 after:transition-transform"
                  />
                </div>

                {/* 11. AUTO SUBMIT ON SILENCE */}
                <div className="p-4 flex items-center justify-between hover:bg-[var(--foreground)]/[0.02] transition-colors">
                  <div>
                    <p className="text-xs font-black text-[var(--foreground)]">Auto-Submit on Silence</p>
                    <p className="text-[10px] opacity-50 text-[var(--foreground)]/80">Hands-free mode: Automatically stop and structure voice once you finish speaking</p>
                  </div>
                  <input 
                    type="checkbox"
                    checked={vSettings.autoSubmitOnSilence}
                    onChange={e => persistSettings({ ...vSettings, autoSubmitOnSilence: e.target.checked })}
                    className="h-5 w-10 appearance-none bg-[var(--foreground)]/[0.15] rounded-full cursor-pointer relative checked:bg-amber-500 transition-colors after:content-[''] after:absolute after:h-4 after:w-4 after:bg-white after:rounded-full after:top-0.5 after:left-0.5 checked:after:translate-x-5 after:transition-transform"
                  />
                </div>

                {/* 12. SILENCE SECONDS DELAY */}
                {vSettings.autoSubmitOnSilence && (
                  <div className="p-4 space-y-2 hover:bg-[var(--foreground)]/[0.02] transition-colors">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-xs font-black text-[var(--foreground)]">Silence Wait Delay</p>
                        <p className="text-[10px] opacity-50 text-[var(--foreground)]/80">How long to wait (seconds) after you stop speaking before auto-processing</p>
                      </div>
                      <span className="text-xs font-black px-2 py-1 rounded bg-amber-500/10 text-amber-500 font-mono border border-amber-500/20">
                        {vSettings.silenceSeconds || 3.5}s
                      </span>
                    </div>
                    <input 
                      type="range"
                      min="1.0"
                      max="8.0"
                      step="0.5"
                      value={vSettings.silenceSeconds || 3.5}
                      onChange={e => persistSettings({ ...vSettings, silenceSeconds: parseFloat(e.target.value) })}
                      className="w-full h-1.5 bg-[var(--foreground)]/[0.1] rounded-lg appearance-none cursor-pointer accent-amber-500"
                    />
                  </div>
                )}

                {/* 13. DEFAULT MIC LOCALE */}
                <div className="p-4 flex items-center justify-between hover:bg-[var(--foreground)]/[0.02] transition-colors">
                  <div>
                    <p className="text-xs font-black text-[var(--foreground)]">Default Recognition Locale</p>
                    <p className="text-[10px] opacity-50 text-[var(--foreground)]/80">Initial language dialect when you launch the assistant</p>
                  </div>
                  <select
                    value={vSettings.defaultMicLocale || "en-IN"}
                    onChange={e => {
                      const newLoc = e.target.value as "hi-IN" | "mr-IN" | "en-IN";
                      persistSettings({ ...vSettings, defaultMicLocale: newLoc });
                      setMicLocale(newLoc);
                    }}
                    className="text-xs bg-[var(--background)] border border-[var(--border)] rounded-xl py-1.5 px-3 font-black text-[var(--foreground)] focus:outline-none focus:ring-1 focus:ring-amber-500/30"
                  >
                    <option value="en-IN">🇮🇳 Hinglish / Eng (Default)</option>
                    <option value="hi-IN">🇮🇳 हिन्दी (Hindi)</option>
                    <option value="mr-IN">🇮🇳 मराठी (Marathi)</option>
                  </select>
                </div>

              </div>
            </div>
          )}

        </div>

        {/* 3. TEMPORARY 'VERIFICATION' OVERLAY */}
        <AnimatePresence>
          {draftProducts.length > 0 && !isSavingToInventory && !saveResult && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="absolute inset-0 z-40 bg-[var(--background)]/95 backdrop-blur-md p-4 sm:p-6 flex flex-col justify-between overflow-y-auto"
            >
              <div className="space-y-6 max-w-2xl mx-auto w-full py-4 text-[var(--foreground)]">
                {/* Header */}
                <div className="flex items-center gap-3 border-b border-[var(--border)] pb-4">
                  <div className="h-12 w-12 rounded-2xl bg-amber-500/15 flex items-center justify-center text-amber-500">
                    <Sparkles size={24} className="animate-pulse" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black tracking-tight text-[var(--foreground)]">
                      Confirm Extracted Product Details
                    </h3>
                    <p className="text-xs text-[var(--foreground)]/60">
                      Please verify or edit the structured product parameters parsed from your voice before saving.
                    </p>
                  </div>
                </div>

                {/* Speech transcript reference box */}
                {draftProducts[0].originalText && (
                  <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/10 space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-widest text-amber-600 dark:text-amber-400">Captured Speech Transcript</p>
                    <p className="text-xs font-medium italic opacity-85 text-[var(--foreground)]">
                      "{draftProducts[0].originalText}"
                    </p>
                  </div>
                )}

                {/* Verification Form */}
                <div className="space-y-4">
                  {/* Part 1: Product Name */}
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-[var(--foreground)]/50 mb-1.5 block">Product Name (English Phonetical)</label>
                    <input
                      type="text"
                      value={draftProducts[0].name}
                      onChange={(e) => updateDraftField('name', e.target.value)}
                      className="w-full bg-[var(--card)] text-[var(--foreground)] px-4 py-3 rounded-2xl text-sm font-bold border border-[var(--border)] focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500/60 transition-all shadow-sm"
                      placeholder="e.g. Amul Butter"
                    />
                  </div>

                  {/* Translations */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-[var(--foreground)]/50 mb-1.5 block">Hindi Translation (हिंदी)</label>
                      <input
                        type="text"
                        value={draftProducts[0].translations?.hi || ""}
                        onChange={(e) => updateDraftTranslation('hi', e.target.value)}
                        className="w-full bg-[var(--card)] text-[var(--foreground)] px-4 py-2.5 rounded-xl text-xs font-bold border border-[var(--border)] focus:outline-none focus:border-amber-500/50"
                        placeholder="e.g. अमूल बटर"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-[var(--foreground)]/50 mb-1.5 block">Marathi Translation (मराठी)</label>
                      <input
                        type="text"
                        value={draftProducts[0].translations?.mr || ""}
                        onChange={(e) => updateDraftTranslation('mr', e.target.value)}
                        className="w-full bg-[var(--card)] text-[var(--foreground)] px-4 py-2.5 rounded-xl text-xs font-bold border border-[var(--border)] focus:outline-none focus:border-amber-500/50"
                        placeholder="e.g. अमूल बटर"
                      />
                    </div>
                  </div>

                  {/* Part 2: Category & Unit */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-[var(--foreground)]/50 mb-1.5 block font-bold">Assigned Category</label>
                      <select
                        value={draftProducts[0].categoryId}
                        onChange={(e) => updateDraftField('categoryId', e.target.value)}
                        className="w-full bg-[var(--card)] text-[var(--foreground)] px-4 py-3 rounded-2xl text-sm font-bold border border-[var(--border)] focus:outline-none focus:ring-2 focus:ring-amber-500/30 transition-all shadow-sm"
                      >
                        {categories.map(c => (
                          <option key={c.id} className="bg-[var(--card)] text-[var(--foreground)]" value={c.id}>
                            {c.icon} {c.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-[var(--foreground)]/50 mb-1.5 block">Default Unit</label>
                      <select
                        value={draftProducts[0].unit}
                        onChange={(e) => {
                          const val = e.target.value;
                          setDraftProducts(prev => {
                            if (prev.length === 0) return prev;
                            const copied = [...prev];
                            copied[0] = {
                              ...copied[0],
                              unit: val,
                              retailPriceUnit: val,
                              wholesalePriceUnit: val,
                              buyingPriceUnit: val
                            };
                            return copied;
                          });
                        }}
                        className="w-full bg-[var(--card)] text-[var(--foreground)] px-4 py-3 rounded-2xl text-sm font-bold border border-[var(--border)] focus:outline-none focus:ring-2 focus:ring-amber-500/30 transition-all shadow-sm"
                      >
                        {["KG", "GM", "LTR", "ML", "PCS", "PKT", "BOX", "CRT", "DZN", "BDL", "TRY", "UNT"].map(un => (
                          <option key={un} className="bg-[var(--card)] text-[var(--foreground)]" value={un}>{un}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Part 3: Pricing Fields Grid */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-[var(--foreground)]/50 block">Retail Price (₹)</label>
                      <input
                        type="number"
                        value={draftProducts[0].retailPrice || ""}
                        onChange={(e) => updateDraftField('retailPrice', parseFloat(e.target.value) || 0)}
                        className="w-full bg-[var(--card)] text-[var(--foreground)] px-4 py-3 rounded-2xl text-sm font-black border border-[var(--border)] focus:outline-none focus:ring-2 focus:ring-amber-500/30 transition-all shadow-sm text-center"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-[var(--foreground)]/50 block">Wholesale Price (₹)</label>
                      <input
                        type="number"
                        value={draftProducts[0].wholesalePrice || ""}
                        onChange={(e) => updateDraftField('wholesalePrice', parseFloat(e.target.value) || 0)}
                        className="w-full bg-[var(--card)] text-[var(--foreground)] px-4 py-3 rounded-2xl text-sm font-black border border-[var(--border)] focus:outline-none focus:ring-2 focus:ring-amber-500/30 transition-all shadow-sm text-center"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-[var(--foreground)]/50 block">Cost Price (₹)</label>
                      <input
                        type="number"
                        value={draftProducts[0].buyingPrice || ""}
                        onChange={(e) => updateDraftField('buyingPrice', parseFloat(e.target.value) || 0)}
                        className="w-full bg-[var(--card)] text-[var(--foreground)] px-4 py-3 rounded-2xl text-sm font-black border border-[var(--border)] focus:outline-none focus:ring-2 focus:ring-amber-500/30 transition-all shadow-sm text-center"
                      />
                    </div>
                  </div>

                  {/* Duplicate Detection Action inside Verification overlay */}
                  {existingItems.some(i => i.name.toLowerCase() === draftProducts[0].name.toLowerCase()) && (
                    <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-2xl p-4 space-y-3">
                      <div className="flex gap-2 text-yellow-600 dark:text-yellow-400 items-start">
                        <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                        <div className="space-y-1">
                          <p className="text-xs font-black uppercase tracking-wider">Duplicate Item Detected in Catalog</p>
                          <p className="text-[11px] opacity-80">This item already exists inside your inventory. Select how you would like to handle this addition:</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3 pt-1">
                        <button
                          onClick={() => {
                            setDuplicateDecisions(prev => ({ ...prev, [draftProducts[0].id]: 'update_prices' }));
                            triggerSound('product_added');
                          }}
                          className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all ${
                            (duplicateDecisions[draftProducts[0].id] || 'update_prices') === 'update_prices'
                              ? 'bg-yellow-500/10 border-yellow-500/50 text-yellow-500 shadow-md animate-pulse'
                              : 'bg-[var(--card)] border-[var(--border)] text-[var(--foreground)]/60 hover:text-[var(--foreground)]'
                          }`}
                        >
                          <RefreshCw size={14} className="mb-1" />
                          <span className="text-xs font-black uppercase tracking-wider">Update Prices</span>
                          <span className="text-[9px] opacity-70">Adjust prices of existing item</span>
                        </button>

                        <button
                          onClick={() => {
                            setDuplicateDecisions(prev => ({ ...prev, [draftProducts[0].id]: 'create_new' }));
                            triggerSound('product_added');
                          }}
                          className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all ${
                            duplicateDecisions[draftProducts[0].id] === 'create_new'
                              ? 'bg-yellow-500/10 border-yellow-500/50 text-yellow-500 shadow-md animate-pulse'
                              : 'bg-[var(--card)] border-[var(--border)] text-[var(--foreground)]/60 hover:text-[var(--foreground)]'
                          }`}
                        >
                          <PlusCircle size={14} className="mb-1" />
                          <span className="text-xs font-black uppercase tracking-wider">Create Copy</span>
                          <span className="text-[9px] opacity-70">Create a brand new listing</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Bottom Controls */}
              <div className="max-w-2xl mx-auto w-full pt-4 border-t border-[var(--border)] flex flex-col sm:flex-row gap-3 mt-4 shrink-0">
                <Button
                  variant="outline"
                  onClick={clearAllDrafts}
                  className="border border-[var(--border)] text-[var(--foreground)]/80 hover:bg-red-500/5 hover:text-red-500 font-extrabold uppercase py-3.5 rounded-xl flex-1 flex items-center justify-center gap-2 text-xs cursor-pointer"
                >
                  <Trash2 size={13} /> Discard & Abort
                </Button>
                <Button
                  onClick={handleSaveAll}
                  className="flex-[2] bg-emerald-500 hover:bg-emerald-600 text-white font-black uppercase py-4 rounded-xl flex items-center justify-center gap-2 text-sm shadow-lg ring-4 ring-emerald-500/10 border-none transition-all duration-300 cursor-pointer"
                >
                  <CheckCircle size={18} /> Confirm & Save to Catalog
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* SAVING TO INVENTORY OVERLAY LOADING & FEEDBACK */}
        <AnimatePresence>
          {(isSavingToInventory || saveResult) && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 rounded-[2rem]"
            >
              {isSavingToInventory && (
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="text-center space-y-4 max-w-sm"
                >
                  <div className="flex justify-center">
                    <div className="relative h-16 w-16">
                      <motion.div 
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        className="absolute inset-0 rounded-full border-4 border-amber-500/20 border-t-amber-500"
                      />
                    </div>
                  </div>
                  <h4 className="text-lg font-black uppercase tracking-wider text-amber-500">Syncing Record...</h4>
                  <p className="text-xs text-white/70">
                    Writing verified product parameters to your active local storage and syncing with remote Firestore database...
                  </p>
                </motion.div>
              )}

              {saveResult && (
                <motion.div
                  initial={{ scale: 0.9, y: 10, opacity: 0 }}
                  animate={{ scale: 1, y: 0, opacity: 1 }}
                  className={`w-full max-w-sm rounded-[2rem] border p-6 text-center space-y-6 ${
                    saveResult.success 
                      ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-500 shadow-emerald-500/5 shadow-2xl' 
                      : 'bg-red-500/10 border-red-500/25 text-red-500 shadow-red-500/5 shadow-2xl'
                  }`}
                >
                  <div className="flex justify-center">
                    {saveResult.success ? (
                      <div className="h-16 w-16 rounded-full bg-emerald-500/15 flex items-center justify-center text-emerald-500 border border-emerald-500/20 shadow-lg">
                        <CheckCircle2 size={36} className="animate-bounce" />
                      </div>
                    ) : (
                      <div className="h-16 w-16 rounded-full bg-red-400/15 flex items-center justify-center text-red-500 border border-red-500/20 shadow-lg" style={{ color: '#ef4444' }}>
                        <AlertTriangle size={36} className="animate-pulse" />
                      </div>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <h4 className="text-sm font-black uppercase tracking-widest leading-none">
                      {saveResult.success ? "Successfully Synchronized" : "Database Sync Error"}
                    </h4>
                    <p className="text-xs opacity-75 font-semibold leading-relaxed text-white">
                      {saveResult.message}
                    </p>
                  </div>

                  {!saveResult.success && (
                    <div className="flex gap-2 justify-center">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="border-red-500/20 text-red-500 hover:bg-red-500/10 text-xs font-black uppercase py-2.5 rounded-xl flex-1 cursor-pointer" 
                        onClick={() => {
                          setSaveResult(null);
                        }}
                      >
                        Retry Edit
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="text-white border-white/20 text-xs font-black uppercase py-2.5 rounded-xl flex-1 cursor-pointer hover:bg-white/10" 
                        onClick={clearAllDrafts}
                      >
                        Discard
                      </Button>
                    </div>
                  )}
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

      </motion.div>
    </motion.div>
  );
}
