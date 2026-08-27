import { Translations, Item } from "../types";

// A collection of popular item terms mapped to Hindi, Marathi, and Hinglish translations
const TRANSLATION_DICTIONARY: { [key: string]: { hi: string; mr: string; hien: string } } = {
  "almond": { hi: "बादाम", mr: "बदाम", hien: "Badam" },
  "almonds": { hi: "बादाम", mr: "बदाम", hien: "Badam" },
  "badam": { hi: "बादाम", mr: "बदाम", hien: "Badam" },
  "cashew": { hi: "काजू", mr: "काजू", hien: "Kaju" },
  "cashews": { hi: "काजू", mr: "काजू", hien: "Kaju" },
  "kaju": { hi: "काजू", mr: "काजू", hien: "Kaju" },
  "pistachio": { hi: "पिस्ता", mr: "पिस्ता", hien: "Pista" },
  "pistachios": { hi: "पिस्ता", mr: "पिस्ता", hien: "Pista" },
  "pista": { hi: "पिस्ता", mr: "पिस्ता", hien: "Pista" },
  "raisin": { hi: "किशमिश", mr: "मनुका", hien: "Kishmish" },
  "raisins": { hi: "किशमिश", mr: "मनुका", hien: "Kishmish" },
  "kishmish": { hi: "किशमिश", mr: "मनुका", hien: "Kishmish" },
  "walnut": { hi: "अखरोट", mr: "अखरोड", hien: "Akhrot" },
  "walnuts": { hi: "अखरोट", mr: "अखरोड", hien: "Akhrot" },
  "akhrot": { hi: "अखरोट", mr: "अखरोड", hien: "Akhrot" },
  "date": { hi: "खजूर", mr: "खजूर", hien: "Khajur" },
  "dates": { hi: "खजूर", mr: "खजूर", hien: "Khajur" },
  "khajur": { hi: "खजूर", mr: "खजूर", hien: "Khajur" },
  "fig": { hi: "अंजीर", mr: "अंजीर", hien: "Anjeer" },
  "figs": { hi: "अंजीर", mr: "अंजीर", hien: "Anjeer" },
  "anjeer": { hi: "अंजीर", mr: "अंजीर", hien: "Anjeer" },
  
  "turmeric": { hi: "हल्दी", mr: "हळद", hien: "Haldi" },
  "haldi": { hi: "हल्दी", mr: "हळद", hien: "Haldi" },
  "chilli": { hi: "मिर्च", mr: "मिरची", hien: "Mirchi" },
  "chili": { hi: "मिर्च", mr: "मिरची", hien: "Mirchi" },
  "mirch": { hi: "मिर्च", mr: "मिरची", hien: "Mirchi" },
  "cumin": { hi: "जीरा", mr: "जिरे", hien: "Jeera" },
  "jeera": { hi: "जीरा", mr: "जिरे", hien: "Jeera" },
  "coriander": { hi: "धनिया", mr: "धने", hien: "Dhania" },
  "dhania": { hi: "धनिया", mr: "धने", hien: "Dhania" },
  "mustard": { hi: "राई", mr: "मोहरी", hien: "Rai" },
  "rai": { hi: "राई", mr: "मोहरी", hien: "Rai" },
  "clove": { hi: "लौंग", mr: "लवंग", hien: "Laung" },
  "cloves": { hi: "लौंग", mr: "लवंग", hien: "Laung" },
  "laung": { hi: "लौंग", mr: "लवंग", hien: "Laung" },
  "cardamom": { hi: "इलायची", mr: "वेलची", hien: "Elaichi" },
  "elaichi": { hi: "इलायची", mr: "वेलची", hien: "Elaichi" },
  "cinnamon": { hi: "दालचीनी", mr: "दालचिनी", hien: "Dalchini" },
  "dalchini": { hi: "दालचीनी", mr: "दालचिनी", hien: "Dalchini" },
  "pepper": { hi: "काली मिर्च", mr: "काळे मिरे", hien: "Kali Mirch" },
  
  "sesame": { hi: "तिल", mr: "तीळ", hien: "Til" },
  "til": { hi: "तिल", mr: "तीळ", hien: "Til" },
  "sunflower": { hi: "सूरजमुखी", mr: "सूर्यफूल", hien: "Surajmukhi" },
  "pumpkin": { hi: "कद्दू के बीज", mr: "भोपळ्याच्या बिया", hien: "Kaddu ke Beej" },
  "seeds": { hi: "बीज", mr: "बिया", hien: "Beej" },
  "beej": { hi: "बीज", mr: "बिया", hien: "Beej" },
  
  "dal": { hi: "दाल", mr: "डाळ", hien: "Dal" },
  "chana": { hi: "चना", mr: "हरभरा", hien: "Chana" },
  "rajma": { hi: "राजमा", mr: "राजमा", hien: "Rajma" },
  "lentil": { hi: "मसूर", mr: "इंद्रायणी", hien: "Masoor" },
  "gram": { hi: "चना", mr: "हरभरा", hien: "Chana" },
  "moong": { hi: "मूंग", mr: "मूग", hien: "Moong" },
  "masoor": { hi: "मसूर", mr: "मसूर", hien: "Masoor" },
  "urad": { hi: "उड़द", mr: "उडीद", hien: "Urad" }
};

/**
 * Translates item names into English, Hindi, Marathi, and Hinglish locally.
 */
export async function translateItemName(name: string): Promise<Translations> {
  const cleanName = name.trim();
  const lowerName = cleanName.toLowerCase();
  
  // Find key term matches from dictionary
  let hi = "";
  let mr = "";
  let hien = "";
  
  const words = lowerName.split(/\s+/);
  for (const word of words) {
    if (TRANSLATION_DICTIONARY[word]) {
      hi = TRANSLATION_DICTIONARY[word].hi;
      mr = TRANSLATION_DICTIONARY[word].mr;
      hien = TRANSLATION_DICTIONARY[word].hien;
      break;
    }
  }
  
  // Try partial matcher if word parser failed to match directly
  if (!hi) {
    for (const key in TRANSLATION_DICTIONARY) {
      if (lowerName.includes(key)) {
        hi = TRANSLATION_DICTIONARY[key].hi;
        mr = TRANSLATION_DICTIONARY[key].mr;
        hien = TRANSLATION_DICTIONARY[key].hien;
        break;
      }
    }
  }
  
  // Fallbacks if no dictionary entry matches
  const capitalized = cleanName.charAt(0).toUpperCase() + cleanName.slice(1);
  return {
    en: capitalized,
    hi: hi || capitalized,
    mr: mr || capitalized,
    'hi-en': hien || capitalized
  };
}

/**
 * Generates a strategic margin-based price advisory for an item based on its cost data.
 */
export async function generatePriceAdvisory(item: Item): Promise<string> {
  if (item.buyingPrice <= 0) {
    return "Ensure buying price is set correctly to calculate healthy pricing strategies.";
  }
  
  const profit = item.retailPrice - item.buyingPrice;
  const marginPercentage = (profit / item.buyingPrice) * 100;
  
  if (marginPercentage < 0) {
    return `Warning: Negative margin. You are selling at a ${Math.abs(marginPercentage).toFixed(1)}% loss. Raise prices immediately.`;
  }
  if (marginPercentage < 8) {
    return `Low retail yield (${marginPercentage.toFixed(1)}% margin). Plan a gradual 5% increase to help match wholesale averages.`;
  }
  if (marginPercentage < 20) {
    return `Balanced retail yield (${marginPercentage.toFixed(1)}% margin). Ideal for high-turnover sales cycles in wholesale yards.`;
  }
  return `Premium retail yield (${marginPercentage.toFixed(1)}% margin). Keep stock visible and monitor brand pricing benchmarks.`;
}

/**
 * Categorizes the priority of a note based on its content locally.
 */
export async function getSmartNoteCategorization(title: string, description: string): Promise<'Urgent' | 'Important' | 'Info'> {
  const text = `${title} ${description}`.toLowerCase();
  
  const urgentKeywords = ["urgent", "asap", "emergency", "pay", "due", "deficit", "immediately", "critical", "loss"];
  const importantKeywords = ["need", "important", "todo", "must", "order", "stock", "restock", "verify", "audit"];
  
  for (const keyword of urgentKeywords) {
    if (text.includes(keyword)) return "Urgent";
  }
  for (const keyword of importantKeywords) {
    if (text.includes(keyword)) return "Important";
  }
  
  return "Info";
}

/**
 * Uses a local heuristic classifier to suggest category IDs for uncategorized items.
 */
export async function suggestCategoriesForItems(
  items: { id: string; name: string }[]
): Promise<{ [itemId: string]: string }> {
  const suggestions: { [itemId: string]: string } = {};
  
  for (const it of items) {
    const text = it.name.toLowerCase();
    let categoryId = "6"; // Default is Others
    
    // Categorize in hierarchy of keywords
    if (matchAny(text, ["badam", "cashew", "kaju", "pista", "pistachio", "raisin", "kishmish", "walnut", "akhrot", "date", "khajur", "fig", "anjeer", "dry fruit"])) {
      categoryId = "1"; // Dry Fruits
    } else if (matchAny(text, ["masala", "powder", "turmeric", "haldi", "mirch", "chilli", "chili", "cumin", "jeera", "dhania", "coriander", "mustard", "rai"])) {
      categoryId = "2"; // Masala
    } else if (matchAny(text, ["clove", "laung", "cardamom", "elaichi", "cinnamon", "dalchini", "bay leaf", "tejpatta", "star anise", "pepper", "spice"])) {
      categoryId = "3"; // Spices
    } else if (matchAny(text, ["seed", "sesame", "til", "sunflower", "pumpkin", "chia", "flax", "melon"])) {
      categoryId = "4"; // Seeds
    } else if (matchAny(text, ["dal", "chana", "rajma", "moong", "masoor", "urad", "pulse", "gram", "lentil"])) {
      categoryId = "5"; // Pulses
    }
    
    suggestions[it.id] = categoryId;
  }
  
  return suggestions;
}

function matchAny(text: string, list: string[]): boolean {
  return list.some(word => text.includes(word));
}
