import { Item } from "../types";

export interface VoiceDraftProduct {
  id: string; // temporary id
  name: string;
  retailPrice: number;
  retailPriceUnit: string;
  wholesalePrice: number;
  wholesalePriceUnit: string;
  buyingPrice: number;
  buyingPriceUnit: string;
  unit: string;
  categoryId: string;
  confidence: {
    name: number;
    retailPrice: number;
    wholesalePrice: number;
    buyingPrice: number;
  };
  originalText: string;
  translations?: {
    en: string;
    hi: string;
    mr: string;
    'hi-en': string;
  };
}

export interface VoiceSession {
  timestamp: string;
  count: number;
  products: { name: string; price: number }[];
}

export interface VoiceSettings {
  enabled: boolean;
  hindi: boolean;
  marathi: boolean;
  hinglish: boolean;
  english: boolean;
  multiProduct: boolean;
  showLive: boolean;
  showSteps: boolean;
  showConfidence: boolean;
  duplicateDetection: boolean;
  requireConfirmation: boolean;
  saveHistory: boolean;
  soundFeedback: boolean;
  autoSubmitOnSilence: boolean;
  silenceSeconds: number;
  defaultMicLocale: "hi-IN" | "mr-IN" | "en-IN";
}

// Default settings
export const DEFAULT_VOICE_SETTINGS: VoiceSettings = {
  enabled: true,
  hindi: true,
  marathi: true,
  hinglish: true,
  english: true,
  multiProduct: true,
  showLive: true,
  showSteps: true,
  showConfidence: true,
  duplicateDetection: true,
  requireConfirmation: true,
  saveHistory: true,
  soundFeedback: true,
  autoSubmitOnSilence: true,
  silenceSeconds: 3.5,
  defaultMicLocale: "en-IN"
};

/**
 * Normalizes unit names into standardized TS Price Manager units
 */
export function normalizeUnit(word: string): string {
  const w = word.toLowerCase().trim();
  
  // KG
  if (/^kg|kilo|kilogram|kg\.?|किलो|किग्रा|कलो$/i.test(w)) return "KG";
  // Chatak
  if (/^chatak|chattak|ctk|छटांक|छटाक$/i.test(w)) return "Chatak";
  // GM
  if (/^g|gm|gms|gram|grams|ग्राम|ग्राम्स|ग्राम्$/i.test(w)) return "GM";
  // LTR
  if (/^l|ltr|litre|liter|liters|लीटर$/i.test(w)) return "LTR";
  // ML
  if (/^ml|milliliter|millilitre|मिलीलीटर|एमएल$/i.test(w)) return "ML";
  // PCS
  if (/^pc|pcs|piece|pieces|piece|नग|पीस|पीसेस$/i.test(w)) return "PCS";
  // PKT
  if (/^pkt|packet|packets|pack|पैकेट|पॉकेट$/i.test(w)) return "PKT";
  // BOX
  if (/^box|boxes|बॉक्स|पेटी$/i.test(w)) return "BOX";
  // CRT
  if (/^carton|cartons|crt|कार्टन|क्रेट$/i.test(w)) return "CRT";
  // DZN
  if (/^dozen|dzn|दर्जन$/i.test(w)) return "DZN";
  // BDL
  if (/^bundle|bundles|बंडल|बण्डल$/i.test(w)) return "BDL";
  // TRY
  if (/^tray|trays|ट्रे$/i.test(w)) return "TRY";
  // UNT
  if (/^unit|units|यूनिट$/i.test(w)) return "UNT";
  
  return "KG"; // default fallback
}

// Indian numeric spoken words to number mapping
const INDIAN_NUM_WORDS: Record<string, number> = {
  // Hindi / Hinglish numbers
  'ek': 1, 'do': 2, 'teen': 3, 'tin': 3, 'char': 4, 'panch': 5, 'paanch': 5,
  'che': 6, 'chhah': 6, 'sat': 7, 'saat': 7, 'aath': 8, 'ath': 8, 'nau': 9, 'nav': 9,
  'das': 10, 'gyarah': 11, 'barah': 12, 'terah': 13, 'chaudah': 14, 'pandrah': 15,
  'solah': 16, 'satrah': 17, 'atharah': 18, 'unnis': 19, 'bees': 20, 'bis': 20,
  'pachis': 25, 'tees': 30, 'tis': 30, 'paintis': 35, 'chalis': 40, 'chaalis': 40,
  'pentalis': 45, 'pachas': 50, 'panchavan': 55, 'saath': 60, 'shatt': 60,
  'painsath': 65, 'sattar': 70, 'pachattar': 75, 'assi': 80, 'pachasi': 85,
  'nabbe': 90, 'pichanve': 95, 'sau': 100, 'so': 100, 'dedh sau': 150,
  'do sau': 200, 'dhai sau': 250, 'teen sau': 300, 'char sau': 400,
  'panch sau': 500, 'hazar': 1000, 'hajaar': 1000,
  // Hindi script numbers
  'एक': 1, 'दो': 2, 'तीन': 3, 'चार': 4, 'पांच': 5, 'छह': 6, 'सात': 7, 'आठ': 8, 'नौ': 9,
  'दस': 10, 'बीस': 20, 'पच्चीस': 25, 'तीस': 30, 'चालीस': 40, 'पचास': 50, 'साठ': 60,
  'सत्तर': 70, 'अस्सी': 80, 'नब्बे': 90, 'सौ': 100, 'हजार': 1000
};

/**
 * Fast Client-Side Regex Pre-Parser for Simple Voice Inputs.
 * Detects common single or dual item inputs (e.g. "Badam 900", "Aloo 50 kilo", "Amul milk 32 packet")
 * and extracts structured product drafts without consuming server AI quota!
 */
export function fastClientVoiceParser(text: string, existingItems: Item[] = []): VoiceDraftProduct[] | null {
  if (!text || !text.trim()) return null;
  const raw = text.trim();

  // Replace spoken numeric words with digits for easy regex parsing
  let normalizedText = raw;
  Object.entries(INDIAN_NUM_WORDS).forEach(([word, num]) => {
    const reg = new RegExp(`\\b${word}\\b`, 'gi');
    normalizedText = normalizedText.replace(reg, num.toString());
  });

  // Check if we can parse locally
  const parsed = parseVoiceTranscript(normalizedText, existingItems);
  if (parsed && parsed.length > 0) {
    // Verify each parsed item has a valid name and at least a retail price > 0
    const allValid = parsed.every(p => p.name && p.name !== "Unknown Spoken Product" && p.retailPrice > 0);
    if (allValid) {
      return parsed;
    }
  }
  return null;
}
const DICTIONARY: Record<string, string> = {
  badam: "Badam",
  kaju: "Kaju",
  cashew: "Cashew",
  pista: "Pista",
  pistachio: "Pistachio",
  kishmish: "Kishmish",
  raisins: "Raisins",
  akhrot: "Akhrot",
  walnut: "Walnut",
  anjeer: "Anjeer",
  fig: "Fig",
  haldi: "Haldi",
  turmeric: "Turmeric"
};

/**
 * Extracts individual products from transcripts based on price delimiters and keyword rules.
 */
export function parseVoiceTranscript(text: string, existingItems: Item[] = []): VoiceDraftProduct[] {
  if (!text || !text.trim()) return [];
  
  // 1. Check if the text is a multi-product entry
  // Split by line breaks, specific delimiters, "and", "aur", "next", etc.
  const lines = text.split(/\n+|(?:\s+and\s+)|(?:\s+aur\s+)|(?:\s+next\s+)|(?:\s+दूसरा\s+)|(?:\s+इसके बाद\s+)/gi);
  const drafts: VoiceDraftProduct[] = [];
  
  for (const line of lines) {
    const cleanLine = line.trim();
    if (!cleanLine || cleanLine.length < 3) continue;
    
    const draft = parseSingleProductPhrase(cleanLine, existingItems);
    if (draft) {
      drafts.push(draft);
    }
  }
  
  return drafts;
}

/**
 * Parses a single statement like "Badam retail 900 kilo wholesale 850 cost 800"
 */
function parseSingleProductPhrase(phrase: string, existingItems: Item[]): VoiceDraftProduct | null {
  // Normalize string but keep numbers and standard text
  let txt = phrase.replace(/,|-/g, " ");
  
  // Regex keywords configuration
  const retailKeywords = /(?:retail|selling|sell|रिटेल|विक्री|बेचना|भाव|रेट)/gi;
  const wholesaleKeywords = /(?:wholesale|होलसेल|थोक|व्होलसेल)/gi;
  const costKeywords = /(?:cost|buying|bought|purchase|buying price|खरीद|खरीदी|कॉस्ट|लागत)/gi;
  
  // Units vocabulary check
  const unitKeywords = /(?:kg|kilo|kilogram|किग्रा|किलो|chatak|chattak|ctk|छटांक|छटाक|gram|gm|ग्राम|piece|pc|pcs|पीस|नग|packet|pkt|पैकेट|box|बॉक्स|carton|कार्टन|dozen|दर्जन|liter|ltr|लीटर|ml|एमएल|bundle|बंडल|tray|ट्रे|unit|यूनिट)/gi;
  
  // Extract all numbers
  const numberRegex = /(\d+(?:\.\d+)?)/g;
  const matches: string[] = [];
  let match;
  while ((match = numberRegex.exec(txt)) !== null) {
    matches.push(match[1]);
  }
  
  if (matches.length === 0) return null; // No price data detected, cannot be a valid product entry
  
  // Map extracted values
  const prices = matches.map(Number);
  
  let retailPrice = 0;
  let wholesalePrice = 0;
  let buyingPrice = 0;
  
  let retailUnit = "KG";
  let wholesaleUnit = "KG";
  let buyingUnit = "KG";
  
  let confName = 90;
  let confRetail = 50;
  let confWholesale = 50;
  let confBuying = 50;
  
  // Find unit mentioned anywhere to apply as base default
  let baseUnit = "KG";
  const unitMatches = txt.match(unitKeywords);
  if (unitMatches && unitMatches.length > 0) {
    baseUnit = normalizeUnit(unitMatches[0]);
    retailUnit = baseUnit;
    wholesaleUnit = baseUnit;
    buyingUnit = baseUnit;
  }
  
  // Search for prices associating matching keywords nearby
  const words = txt.split(/\s+/);
  
  // Associate numbers to their categories using index/distance proximity
  const priceAssignments = prices.map(price => {
    const priceStr = price.toString();
    const idx = words.indexOf(priceStr);
    
    // Look backwards up to 3 words
    let category: 'retail' | 'wholesale' | 'cost' | 'unknown' = 'unknown';
    if (idx !== -1) {
      for (let i = Math.max(0, idx - 3); i < idx; i++) {
        const word = words[i].toLowerCase();
        if (retailKeywords.test(word)) category = 'retail';
        else if (wholesaleKeywords.test(word)) category = 'wholesale';
        else if (costKeywords.test(word)) category = 'cost';
      }
      
      // If still unknown, look forward 2 words
      if (category === 'unknown') {
        for (let i = idx + 1; i <= Math.min(words.length - 1, idx + 2); i++) {
          const word = words[i].toLowerCase();
          if (retailKeywords.test(word)) category = 'retail';
          else if (wholesaleKeywords.test(word)) category = 'wholesale';
          else if (costKeywords.test(word)) category = 'cost';
        }
      }
      
      // Look for a specific unit attached directly next, e.g., "900 kilo" or "900piece"
      for (let i = Math.max(0, idx - 1); i <= Math.min(words.length - 1, idx + 1); i++) {
         const w = words[i].toLowerCase();
         if (unitKeywords.test(w) && i !== idx) {
           const parsedUnit = normalizeUnit(w);
           if (parsedUnit) {
             if (category === 'retail') retailUnit = parsedUnit;
             if (category === 'wholesale') wholesaleUnit = parsedUnit;
             if (category === 'cost') buyingUnit = parsedUnit;
           }
         }
      }
    }
    
    return { price, category };
  });
  
  // Set values according to detected proximity associations
  priceAssignments.forEach(pa => {
    if (pa.category === 'retail') {
      retailPrice = pa.price;
      confRetail = 100;
    } else if (pa.category === 'wholesale') {
      wholesalePrice = pa.price;
      confWholesale = 100;
    } else if (pa.category === 'cost') {
      buyingPrice = pa.price;
      confBuying = 100;
    }
  });
  
  // Fallback if price categorization is partial/absent: arrange descending or order of mention
  const unassigned = priceAssignments.filter(pa => pa.category === 'unknown');
  if (unassigned.length > 0) {
    if (!retailPrice && !wholesalePrice && !buyingPrice) {
      // 3 numbers standard order: Retail (highest) -> Wholesale (middle) -> Cost (lowest)
      const sortedPrices = [...prices].sort((a, b) => b - a);
      if (sortedPrices.length >= 1) { retailPrice = sortedPrices[0]; confRetail = 85; }
      if (sortedPrices.length >= 2) { wholesalePrice = sortedPrices[1]; confWholesale = 80; }
      if (sortedPrices.length >= 3) { buyingPrice = sortedPrices[2]; confBuying = 75; }
    } else {
      // Apply to first available empty slot
      unassigned.forEach(ua => {
        if (!retailPrice) { retailPrice = ua.price; confRetail = 70; }
        else if (!wholesalePrice) { wholesalePrice = ua.price; confWholesale = 65; }
        else if (!buyingPrice) { buyingPrice = ua.price; confBuying = 60; }
      });
    }
  }
  
  // CLEAN PRODUCT NAME EXTRACTION:
  // Strip all price words, price category keywords, units, and numbers to extract name
  let nameBlock = txt;
  
  // Remove numbers
  prices.forEach(p => {
    nameBlock = nameBlock.replace(new RegExp('\\b' + p + '\\b', 'g'), '');
  });
  
  // Strip keywords
  const allStripPatterns = [
    retailKeywords, wholesaleKeywords, costKeywords, unitKeywords,
    /\b(?:per|for|rs\.?|in|का|की|के|में|per kilo|kilo|piece|g|kg|gm|piece)\b/gi,
    /\b(?:kaju|badam|cashew|raisins|pista|akhrot|anjeer|haldi)\b/gi // remove lowercase match if we map to dictionary
  ];
  
  allStripPatterns.forEach(pat => {
    nameBlock = nameBlock.replace(pat, ' ');
  });
  
  // Clean double spaces, edge cases
  let cleanedName = nameBlock.trim().replace(/\s+/g, ' ');
  
  // Dictionary matcher/reconstruction
  const originalWords = txt.split(/\s+/);
  let matchedKeyword = "";
  for (const w of originalWords) {
    const cleanW = w.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (DICTIONARY[cleanW]) {
      matchedKeyword = DICTIONARY[cleanW];
      break;
    }
  }
  
  // Combine mapped dictionary keyword if any, or general cleaned text
  let finalName = cleanedName;
  if (matchedKeyword) {
    if (!finalName || finalName.length < 2) {
      finalName = matchedKeyword;
    } else if (!finalName.toLowerCase().includes(matchedKeyword.toLowerCase())) {
      finalName = matchedKeyword + " " + finalName;
    }
  }
  
  if (!finalName) {
     finalName = "Unknown Spoken Product";
     confName = 30;
  } else {
    // Capitalize first letter of words
    finalName = finalName.split(' ')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ')
      .trim();
  }
  
  return {
    id: 'voice_' + Math.random().toString(36).substr(2, 9),
    name: finalName,
    retailPrice,
    retailPriceUnit: retailUnit,
    wholesalePrice,
    wholesalePriceUnit: wholesaleUnit,
    buyingPrice,
    buyingPriceUnit: buyingUnit,
    unit: baseUnit,
    categoryId: '', // to be populated
    confidence: {
      name: confName,
      retailPrice: confRetail,
      wholesalePrice: confWholesale,
      buyingPrice: confBuying
    },
    originalText: phrase
  };
}

/**
 * Quick Correction parsing
 * Handles statements like: "Change Badam retail to 950" or "Cashew cost code 1100"
 */
export function processVoiceCorrection(text: string, currentDrafts: VoiceDraftProduct[]): {
  success: boolean;
  drafts: VoiceDraftProduct[];
  message: string;
} {
  if (typeof text !== 'string') {
    text = String(text || '');
  }
  const t = text.toLowerCase();
  
  // Check if it's a correction statement
  const isCorrection = /(?:change|set|update|बदलो|करो|सुधार|edit|बदला)\b/i.test(t);
  if (!isCorrection) {
    return { success: false, drafts: currentDrafts, message: "Not a correction command" };
  }
  
  // Find numeric new value
  const numMatch = t.match(/(\d+(?:\.\d+)?)/);
  if (!numMatch) {
    return { success: false, drafts: currentDrafts, message: "No new price number detected" };
  }
  const newValue = Number(numMatch[1]);
  
  // Determine field
  let field: 'retail' | 'wholesale' | 'cost' | null = null;
  if (/(?:retail|selling|sell|रेट|रिटेल|विक्री|बेचना)/i.test(t)) field = 'retail';
  else if (/(?:wholesale|होलसेल|थोक)/i.test(t)) field = 'wholesale';
  else if (/(?:cost|buying|purchase|खरीद|कॉस्ट|लागत)/i.test(t)) field = 'cost';
  
  if (!field) {
    return { success: false, drafts: currentDrafts, message: "Could not identify price type (retail/wholesale/buying)" };
  }
  
  // Match the product name in drafts
  let matchedIndex = -1;
  for (let i = 0; i < currentDrafts.length; i++) {
    const pName = currentDrafts[i].name.toLowerCase();
    // Check if the whispered correction mentions the name, e.g. "change badam to..."
    if (t.includes(pName) || pName.split(/\s+/).some(word => word.length > 2 && t.includes(word))) {
      matchedIndex = i;
      break;
    }
  }
  
  if (matchedIndex === -1 && currentDrafts.length > 0) {
    // If only one draft exists, default to correcting that draft!
    if (currentDrafts.length === 1) {
      matchedIndex = 0;
    }
  }
  
  if (matchedIndex === -1) {
    return { success: false, drafts: currentDrafts, message: "Could not find matching draft product name" };
  }
  
  const updatedDrafts = [...currentDrafts];
  const target = { ...updatedDrafts[matchedIndex] };
  
  if (field === 'retail') {
    target.retailPrice = newValue;
    target.confidence.retailPrice = 100;
  } else if (field === 'wholesale') {
    target.wholesalePrice = newValue;
    target.confidence.wholesalePrice = 100;
  } else if (field === 'cost') {
    target.buyingPrice = newValue;
    target.confidence.buyingPrice = 100;
  }
  
  updatedDrafts[matchedIndex] = target;
  
  return {
    success: true,
    drafts: updatedDrafts,
    message: `Updated ${target.name}'s ${field} price to ₹${newValue}!`
  };
}

/**
 * Saves a completed voice addition session to logs
 */
export function saveSessionToHistory(products: { name: string; price: number }[]) {
  try {
    const historical: VoiceSession[] = JSON.parse(localStorage.getItem('ts_voice_history') || '[]');
    const newSession: VoiceSession = {
      timestamp: new Date().toISOString(),
      count: products.length,
      products: products
    };
    
    historical.unshift(newSession);
    // Limit to latest 30 sessions
    localStorage.setItem('ts_voice_history', JSON.stringify(historical.slice(0, 30)));
  } catch (e) {
    console.error("Failed to write voice session log", e);
  }
}

/**
 * Retrieves the voice creation log
 */
export function getVoiceSessionHistory(): VoiceSession[] {
  try {
    return JSON.parse(localStorage.getItem('ts_voice_history') || '[]');
  } catch {
    return [];
  }
}
