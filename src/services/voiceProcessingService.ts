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
  autoSubmitOnSilence: false,
  silenceSeconds: 6.0,
  defaultMicLocale: "en-IN"
};

/**
 * Normalizes unit names into standardized TS Price Manager units
 */
export function normalizeUnit(word: string): string {
  if (!word) return "KG";
  let w = word.toLowerCase().trim();
  
  // Strip common speech-to-text prefixes like "perk", "per", "pr", "/", "for", "प्रति", "दर"
  w = w.replace(/^(?:perk|per|pr|\/|for|प्रति|दर|का|के)\s+/i, "").trim();
  // Strip trailing punctuation
  w = w.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"']/g, "").trim();
  
  // PAV KILO -> 250gm (Critical Rule: pav kilo = 250gm, used to set retail price)
  if (/^(?:pav\s*kilo|paav\s*kilo|pao\s*kilo|pau\s*kilo|pa\s*kilo|paa\s*kilo|paw\s*kilo|pav|paav|pao|pau|पाव\s*किलो|पावकिलो|पाव|quarter\s*kilo|quarter|250\s*(?:gm|g|gram|grams)|250gm|250g)$/i.test(w)) {
    return "250gm";
  }
  // AADHA KILO -> 500gm
  if (/^(?:aadha\s*kilo|adha\s*kilo|aadhe\s*kilo|adhe\s*kilo|आधा\s*किलो|half\s*kilo|half|500\s*(?:gm|g|gram|grams)|500gm|500g)$/i.test(w)) {
    return "500gm";
  }
  // KG
  if (/^(?:kg|kilo|kilogram|kg\.?|किलो|किग्रा|कलो|kilos)$/i.test(w)) return "KG";
  // Chatak
  if (/^(?:chatak|chattak|ctk|छटांक|छटाक)$/i.test(w)) return "Chatak";
  // GM
  if (/^(?:g|gm|gms|gram|grams|ग्राम|ग्राम्स|ग्राम्)$/i.test(w)) return "GM";
  // LTR
  if (/^(?:l|ltr|litre|liter|liters|लीटर)$/i.test(w)) return "LTR";
  // ML
  if (/^(?:ml|milliliter|millilitre|मिलीलीटर|एमएल)$/i.test(w)) return "ML";
  // PCS
  if (/^(?:pc|pcs|piece|pieces|नग|पीस|पीसेस)$/i.test(w)) return "PCS";
  // PKT
  if (/^(?:pkt|packet|packets|pack|packs|पैकेट|पॉकेट)$/i.test(w)) return "PKT";
  // BOX
  if (/^(?:box|boxes|बॉक्स|पेटी|dabba|dibba|डिब्बा)$/i.test(w)) return "BOX";
  // CRT
  if (/^(?:carton|cartons|crt|कार्टन|क्रेट)$/i.test(w)) return "CRT";
  // DZN
  if (/^(?:dozen|dzn|दर्जन|darjan)$/i.test(w)) return "DZN";
  // BDL
  if (/^(?:bundle|bundles|बंडल|बण्डल)$/i.test(w)) return "BDL";
  // TRY
  if (/^(?:tray|trays|ट्रे)$/i.test(w)) return "TRY";
  // UNT
  if (/^(?:unit|units|यूनिट)$/i.test(w)) return "UNT";
  
  return "KG"; // default fallback
}

// Indian numeric spoken words to number mapping (Hindi, Marathi, Hinglish)
const INDIAN_NUM_WORDS: Record<string, number> = {
  // Hindi / Hinglish numbers
  'ek': 1, 'do': 2, 'don': 2, 'teen': 3, 'tin': 3, 'char': 4, 'panch': 5, 'paanch': 5, 'paach': 5,
  'che': 6, 'chhah': 6, 'saha': 6, 'sat': 7, 'saat': 7, 'aath': 8, 'ath': 8, 'nau': 9, 'nav': 9,
  'das': 10, 'daha': 10, 'gyarah': 11, 'akra': 11, 'barah': 12, 'bara': 12, 'terah': 13, 'tera': 13,
  'chaudah': 14, 'chauda': 14, 'pandrah': 15, 'pandra': 15, 'solah': 16, 'sola': 16, 'satrah': 17, 'satra': 17,
  'atharah': 18, 'athra': 18, 'unnis': 19, 'ekonis': 19, 'bees': 20, 'vees': 20, 'vis': 20, 'bis': 20,
  'pachis': 25, 'panchis': 25, 'panchvis': 25, 'tees': 30, 'tis': 30, 'paintis': 35, 'chalis': 40, 'chaalis': 40,
  'pentalis': 45, 'pachas': 50, 'pannaas': 50, 'panchavan': 55, 'saath': 60, 'sath': 60, 'shatt': 60,
  'painsath': 65, 'sattar': 70, 'pachattar': 75, 'assi': 80, 'aanshi': 80, 'pachasi': 85,
  'nabbe': 90, 'navvad': 90, 'pichanve': 95, 'sau': 100, 'so': 100, 'shambhar': 100, 'dedh sau': 150,
  'do sau': 200, 'dhai sau': 250, 'teen sau': 300, 'char sau': 400,
  'panch sau': 500, 'hazar': 1000, 'hajaar': 1000,
  // Hindi & Marathi script numbers
  'एक': 1, 'दोन': 2, 'दो': 2, 'तीन': 3, 'चार': 4, 'पांच': 5, 'पाच': 5, 'छह': 6, 'सहा': 6, 'सात': 7, 'आठ': 8, 'नौ': 9, 'नऊ': 9,
  'दस': 10, 'दहा': 10, 'अकरा': 11, 'बारा': 12, 'तेरा': 13, 'चौदा': 14, 'पंधरा': 15, 'सोळा': 16, 'सतरा': 17, 'अठरा': 18, 'एकोणीस': 19,
  'बीस': 20, 'वीस': 20, 'पच्चीस': 25, 'पंचवीस': 25, 'तीस': 30, 'चालीस': 40, 'चाळीस': 40, 'पचास': 50, 'पन्नास': 50, 'साठ': 60,
  'सत्तर': 70, 'अस्सी': 80, 'ऐंशी': 80, 'नब्बे': 90, 'नव्वद': 90, 'सौ': 100, 'शंभर': 100, 'हजार': 1000
};

/**
 * Fast Client-Side Regex Pre-Parser for Simple Voice Inputs.
 * Detects common single or dual item inputs (e.g. "Badam 900", "Tamatar pav kilo 20", "Aloo 50 kilo")
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
  // Dry Fruits
  badam: "Badam",
  badaam: "Badam",
  kaju: "Kaju",
  kaaju: "Kaju",
  cashew: "Cashew",
  pista: "Pista",
  pistachio: "Pistachio",
  kishmish: "Kishmish",
  kismis: "Kishmish",
  raisins: "Raisins",
  akhrot: "Akhrot",
  walnut: "Walnut",
  anjeer: "Anjeer",
  fig: "Fig",
  makhana: "Makhana",
  khajoor: "Khajoor",
  // Vegetables
  tamatar: "Tamatar",
  tomato: "Tomato",
  aloo: "Aloo",
  alu: "Aloo",
  batata: "Batata",
  potato: "Potato",
  pyaz: "Pyaz",
  pyaaz: "Pyaz",
  kanda: "Kanda",
  onion: "Onion",
  mirchi: "Mirchi",
  mirch: "Mirchi",
  chilli: "Chilli",
  lasan: "Lasan",
  lahsun: "Lehsun",
  lehsun: "Lehsun",
  garlic: "Garlic",
  adrak: "Adrak",
  ginger: "Ginger",
  bhindi: "Bhindi",
  gobhi: "Gobhi",
  palak: "Palak",
  matar: "Matar",
  nimbu: "Nimbu",
  gajar: "Gajar",
  kheera: "Kheera",
  // Spices & Groceries
  haldi: "Haldi",
  turmeric: "Turmeric",
  jeera: "Jeera",
  jira: "Jeera",
  dhaniya: "Dhaniya",
  dhania: "Dhaniya",
  rai: "Rai",
  methi: "Methi",
  hing: "Hing",
  elaichi: "Elaichi",
  laung: "Laung",
  dalchini: "Dalchini",
  chawal: "Chawal",
  rice: "Rice",
  atta: "Atta",
  aata: "Atta",
  maida: "Maida",
  besan: "Besan",
  suji: "Suji",
  rava: "Rava",
  toor: "Toor Dal",
  moong: "Moong Dal",
  urad: "Urad Dal",
  chana: "Chana Dal",
  rajma: "Rajma",
  tel: "Tel",
  oil: "Oil",
  ghee: "Ghee",
  doodh: "Doodh",
  milk: "Milk",
  dahi: "Dahi",
  paneer: "Paneer",
  shakhar: "Shakhar",
  sugar: "Sugar",
  cheeni: "Cheeni",
  chini: "Cheeni",
  chai: "Chai Patti",
  tea: "Tea",
  namak: "Namak",
  salt: "Salt",
  poha: "Poha",
  sabudana: "Sabudana"
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
 * or "kashmiri coconut retail 300rs perk kg , wholesale 1,500rs per box, cost 1,200rs per box"
 */
function parseSingleProductPhrase(phrase: string, existingItems: Item[]): VoiceDraftProduct | null {
  if (!phrase || !phrase.trim()) return null;

  // 1. Normalize comma-formatted numbers: e.g. "1,500" -> "1500", "1,200" -> "1200"
  let cleanPhrase = phrase.replace(/(\d+),(\d{2,3})/g, "$1$2");

  // 2. Separate attached currency symbols: e.g. "300rs" -> "300 rs", "1500rs" -> "1500 rs"
  cleanPhrase = cleanPhrase.replace(/(\d+)(rs|inr|pkr|\/-)/gi, "$1 $2");

  // Keywords configuration
  const retailRegex = /\b(?:retail|selling|sell|रिटेल|विक्री|बेचना|भाव|रेट)\b/i;
  const wholesaleRegex = /\b(?:wholesale|होलसेल|थोक|व्होलसेल)\b/i;
  const costRegex = /\b(?:cost|buying|bought|purchase|buying\s+price|खरीद|खरीदी|कॉस्ट|लागत)\b/i;
  const unitRegex = /(?:(?:perk|per|pr|\/)\s+)?(?:pav\s*kilo|paav\s*kilo|pao\s*kilo|pau\s*kilo|paw\s*kilo|pa\s*kilo|paa\s*kilo|pav|paav|pao|पाव\s*किलो|पावकिलो|पाव|quarter\s*kilo|quarter|250\s*(?:gm|g|gram|grams)|250gm|250g|aadha\s*kilo|adha\s*kilo|aadhe\s*kilo|adhe\s*kilo|आधा\s*किलो|half\s*kilo|500\s*(?:gm|g|gram|grams)|500gm|500g|kg|kilo|kilogram|किग्रा|किलो|chatak|chattak|ctk|छटांक|छटाक|gram|gm|grams|ग्राम|piece|pc|pcs|pieces|पीस|नग|packet|packets|pack|pkt|पैकेट|box|boxes|बॉक्स|पेटी|dabba|dibba|carton|cartons|crt|कार्टन|dozen|दर्जन|darjan|liter|litre|ltr|लीटर|ml|एमएल|bundle|बंडल|tray|ट्रे|unit|यूनिट)\b/gi;

  const pavKiloRegex = /\b(?:pav\s*kilo|paav\s*kilo|pao\s*kilo|pau\s*kilo|paw\s*kilo|pa\s*kilo|paa\s*kilo|pav|paav|pao|पाव\s*किलो|पावकिलो|पाव|quarter\s*kilo|250\s*(?:gm|g|gram|grams)|250gm|250g)\b/i;
  const isPavKiloMentioned = pavKiloRegex.test(cleanPhrase);

  // Check if phrase contains the "retail" keyword rule
  const retailMatch = cleanPhrase.match(retailRegex);

  if (retailMatch && retailMatch.index !== undefined && retailMatch.index > 0) {
    // =========================================================================
    // EXPLICIT RULE: Words spoken before the "retail" keyword are the Product Name!
    // E.g.: "kashmiri coconut retail 300rs perk kg..." -> Product Name: "Kashmiri Coconut"
    // =========================================================================
    let rawNameBeforeRetail = cleanPhrase.substring(0, retailMatch.index).trim();

    // Strip leading action/trigger filler words and quantity prefixes
    rawNameBeforeRetail = rawNameBeforeRetail
      .replace(/^(?:please\s+)?(?:add|insert|create|new|item|product|naya\s+item|likho|daalo|bhai|sun\s+bhai|kripya|ek|item\s+name|naam)\s+/i, "")
      .replace(pavKiloRegex, "")
      .replace(/^[,.\-:]+/, "")
      .replace(/[,.\-:]+$/, "")
      .trim();

    if (rawNameBeforeRetail.length > 0) {
      // Find all keyword markers in the phrase
      interface Marker {
        type: 'retail' | 'wholesale' | 'cost';
        index: number;
        length: number;
      }
      const markers: Marker[] = [];

      let m: RegExpExecArray | null;
      const gRetail = new RegExp(retailRegex.source, 'gi');
      while ((m = gRetail.exec(cleanPhrase)) !== null) {
        markers.push({ type: 'retail', index: m.index, length: m[0].length });
      }

      const gWholesale = new RegExp(wholesaleRegex.source, 'gi');
      while ((m = gWholesale.exec(cleanPhrase)) !== null) {
        markers.push({ type: 'wholesale', index: m.index, length: m[0].length });
      }

      const gCost = new RegExp(costRegex.source, 'gi');
      while ((m = gCost.exec(cleanPhrase)) !== null) {
        markers.push({ type: 'cost', index: m.index, length: m[0].length });
      }

      // Sort markers chronologically by their position in the text
      markers.sort((a, b) => a.index - b.index);

      let rPrice = 0;
      let rUnit = isPavKiloMentioned ? "250gm" : "KG";
      let wPrice = 0;
      let wUnit = "KG";
      let cPrice = 0;
      let cUnit = "KG";
      let unitExplicitlyFound = false;

      // Extract each section's numbers and units
      for (let i = 0; i < markers.length; i++) {
        const current = markers[i];
        const nextIndex = i + 1 < markers.length ? markers[i + 1].index : cleanPhrase.length;
        const segment = cleanPhrase.substring(current.index + current.length, nextIndex);

        // Find numbers in this section
        const numMatch = segment.match(/(\d+(?:\.\d+)?)/);
        const parsedPrice = numMatch ? parseFloat(numMatch[1]) : 0;

        // Find unit in this section
        const segmentUnitMatch = segment.match(unitRegex);
        let parsedUnit = "";
        if (segmentUnitMatch && segmentUnitMatch.length > 0) {
          parsedUnit = normalizeUnit(segmentUnitMatch[0]);
          unitExplicitlyFound = true;
        }

        if (current.type === 'retail') {
          if (parsedPrice > 0) rPrice = parsedPrice;
          if (parsedUnit) rUnit = parsedUnit;
          else if (isPavKiloMentioned) rUnit = "250gm";
        } else if (current.type === 'wholesale') {
          if (parsedPrice > 0) wPrice = parsedPrice;
          if (parsedUnit) wUnit = parsedUnit;
        } else if (current.type === 'cost') {
          if (parsedPrice > 0) cPrice = parsedPrice;
          if (parsedUnit) cUnit = parsedUnit;
        }
      }

      // If price was found in the text overall
      if (rPrice > 0 || wPrice > 0 || cPrice > 0) {
        // Fallback unit propagation if only retail or overall unit was mentioned
        const basePrimaryUnit = rUnit || (unitExplicitlyFound ? (wUnit || cUnit) : (isPavKiloMentioned ? "250gm" : "KG"));
        if (!wUnit) wUnit = basePrimaryUnit;
        if (!cUnit) cUnit = basePrimaryUnit;
        if (!rUnit) rUnit = basePrimaryUnit;

        // Wholesale and cost prices are only set if explicitly spoken in the phrase.
        // Never fabricate or guess unmentioned prices so the user gets accurate data.

        // Format name to proper Title Case
        const formattedName = rawNameBeforeRetail
          .split(/\s+/)
          .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
          .join(' ')
          .trim();

        return {
          id: 'voice_' + Math.random().toString(36).substr(2, 9),
          name: formattedName,
          retailPrice: rPrice,
          retailPriceUnit: rUnit,
          wholesalePrice: wPrice,
          wholesalePriceUnit: wUnit,
          buyingPrice: cPrice,
          buyingPriceUnit: cUnit,
          unit: basePrimaryUnit,
          categoryId: '',
          confidence: {
            name: 100,
            retailPrice: 100,
            wholesalePrice: wPrice > 0 ? 100 : 70,
            buyingPrice: cPrice > 0 ? 100 : 70
          },
          originalText: phrase
        };
      }
    }
  }

  // =========================================================================
  // FALLBACK PARSER: Handles phrases without "retail" keyword (e.g. "Badam 900", "Tamatar pav kilo 20")
  // =========================================================================
  let txt = cleanPhrase.replace(/,|-/g, " ");
  
  // Extract all numbers
  const numberRegex = /(\d+(?:\.\d+)?)/g;
  const matches: string[] = [];
  let match;
  while ((match = numberRegex.exec(txt)) !== null) {
    matches.push(match[1]);
  }
  
  if (matches.length === 0) return null; // No price data detected
  
  const prices = matches.map(Number);
  
  let retailPrice = 0;
  let wholesalePrice = 0;
  let buyingPrice = 0;
  
  let retailUnit = isPavKiloMentioned ? "250gm" : "KG";
  let wholesaleUnit = isPavKiloMentioned ? "250gm" : "KG";
  let buyingUnit = isPavKiloMentioned ? "250gm" : "KG";
  
  let confName = 90;
  let confRetail = 50;
  let confWholesale = 50;
  let confBuying = 50;
  
  // Find unit mentioned anywhere to apply as base default
  let baseUnit = isPavKiloMentioned ? "250gm" : "KG";
  const unitMatches = txt.match(unitRegex);
  if (unitMatches && unitMatches.length > 0) {
    baseUnit = normalizeUnit(unitMatches[0]);
    retailUnit = baseUnit;
    wholesaleUnit = baseUnit;
    buyingUnit = baseUnit;
  }
  
  // Search for prices associating matching keywords nearby
  const words = txt.split(/\s+/);
  const retailKeywords = /(?:retail|selling|sell|रिटेल|विक्री|बेचना|भाव|रेट)/gi;
  const wholesaleKeywords = /(?:wholesale|होलसेल|थोक|व्होलसेल)/gi;
  const costKeywords = /(?:cost|buying|bought|purchase|buying price|खरीद|खरीदी|कॉस्ट|लागत)/gi;
  
  const priceAssignments = prices.map(price => {
    const priceStr = price.toString();
    const idx = words.indexOf(priceStr);
    
    let category: 'retail' | 'wholesale' | 'cost' | 'unknown' = 'unknown';
    if (idx !== -1) {
      for (let i = Math.max(0, idx - 3); i < idx; i++) {
        const word = words[i].toLowerCase();
        if (retailKeywords.test(word)) category = 'retail';
        else if (wholesaleKeywords.test(word)) category = 'wholesale';
        else if (costKeywords.test(word)) category = 'cost';
        else if (pavKiloRegex.test(word)) category = 'retail'; // "pav kilo" implies retail price
      }
      
      if (category === 'unknown') {
        for (let i = idx + 1; i <= Math.min(words.length - 1, idx + 2); i++) {
          const word = words[i].toLowerCase();
          if (retailKeywords.test(word)) category = 'retail';
          else if (wholesaleKeywords.test(word)) category = 'wholesale';
          else if (costKeywords.test(word)) category = 'cost';
          else if (pavKiloRegex.test(word)) category = 'retail'; // "pav kilo" implies retail price
        }
      }
      
      for (let i = Math.max(0, idx - 2); i <= Math.min(words.length - 1, idx + 2); i++) {
         const w = words[i].toLowerCase();
         if (unitRegex.test(w) && i !== idx) {
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
  
  // "PAV KILO" RULE: If user says "pav kilo", it means 250gm and users use this to set the RETAIL PRICE!
  if (isPavKiloMentioned) {
    retailUnit = "250gm";
    if (!retailPrice && prices.length > 0) {
      retailPrice = prices[0];
      confRetail = 100;
    }
  }

  const unassigned = priceAssignments.filter(pa => pa.category === 'unknown');
  if (unassigned.length > 0) {
    if (!retailPrice && !wholesalePrice && !buyingPrice) {
      const sortedPrices = [...prices].sort((a, b) => b - a);
      if (sortedPrices.length >= 1) { retailPrice = sortedPrices[0]; confRetail = 85; }
      if (sortedPrices.length >= 2) { wholesalePrice = sortedPrices[1]; confWholesale = 80; }
      if (sortedPrices.length >= 3) { buyingPrice = sortedPrices[2]; confBuying = 75; }
    } else {
      unassigned.forEach(ua => {
        if (!retailPrice) { retailPrice = ua.price; confRetail = 70; }
        else if (!wholesalePrice) { wholesalePrice = ua.price; confWholesale = 65; }
        else if (!buyingPrice) { buyingPrice = ua.price; confBuying = 60; }
      });
    }
  }

  // Wholesale and buying prices remain 0 if not explicitly mentioned in the voice transcript.
  
  let nameBlock = txt;
  prices.forEach(p => {
    nameBlock = nameBlock.replace(new RegExp('\\b' + p + '\\b', 'g'), '');
  });
  
  const allStripPatterns = [
    retailKeywords, wholesaleKeywords, costKeywords, unitRegex, pavKiloRegex,
    /\b(?:per|for|rs\.?|rupees|rupaye|rupay|in|का|की|के|में|per kilo|kilo|piece|g|kg|gm|piece)\b/gi,
    /^(?:please\s+)?(?:add|insert|create|new|item|product|naya\s+item|likho|daalo|bhai|sun\s+bhai|kripya|ek|item\s+name|naam)\s+/i
  ];
  
  allStripPatterns.forEach(pat => {
    nameBlock = nameBlock.replace(pat, ' ');
  });
  
  let cleanedName = nameBlock.trim().replace(/\s+/g, ' ');
  
  const originalWords = txt.split(/\s+/);
  let matchedKeyword = "";
  for (const w of originalWords) {
    const cleanW = w.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (DICTIONARY[cleanW]) {
      matchedKeyword = DICTIONARY[cleanW];
      break;
    }
  }
  
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
    finalName = finalName.split(' ')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
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
    unit: isPavKiloMentioned ? "250gm" : baseUnit,
    categoryId: '',
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
