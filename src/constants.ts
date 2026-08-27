import { Category, ThemeType, LanguageType } from './types';
import { getUITextForLanguage } from './services/languageEngine';

export const DEFAULT_CATEGORIES: Category[] = [
  { id: '1', name: 'Dry Fruits', icon: '🥜' },
  { id: '2', name: 'Masala', icon: '🌶️' },
  { id: '3', name: 'Spices', icon: '🌿' },
  { id: '4', name: 'Seeds', icon: '🌻' },
  { id: '5', name: 'Pulses', icon: '🫘' },
  { id: '6', name: 'Others', icon: '📦' },
];

export const UNITS = [
  { label: 'Weight', values: ['KG', 'Gram', '250gm', 'MG', 'Chatak', 'Tola', 'Quintal', 'Ton', 'Pound'] },
  { label: 'Packaging', values: ['Packet', 'Box', 'Bag', 'Pouch', 'Sack', 'Jar', 'Bottle', 'Tin', 'Can', 'Carton', 'Crate'] },
  { label: 'Quantity', values: ['Piece', 'Dozen', 'Bundle', 'Set', 'Pair', 'Unit'] },
];

export const THEMES: { id: ThemeType; name: string; description: string; emoji: string }[] = [
  { id: 'midnight_blue', name: 'Midnight Pro', description: 'Deep contrast, technical precision', emoji: '🌑' },
  { id: 'neo_brutalist', name: 'Neo-Brutalist', description: 'Bold, graphic colors and energy', emoji: '⚡' },
  { id: 'glass_modern', name: 'Glass Morphic', description: 'Immersive frosted glass layers', emoji: '✨' },
  { id: 'luxury_gold', name: 'Luxury Gold', description: 'Premium, elegant gold accents', emoji: '👑' },
  { id: 'emerald_matrix', name: 'Technical Green', description: 'Matrix data-grid optimization', emoji: '📟' },
  { id: 'cyberpunk', name: 'Cyber Neon Punch', description: 'Neon cyan, hot pink futuristic grid', emoji: '⚡' },
  { id: 'retro-blue', name: 'Cosmic Retro Blue', description: 'Classic indigo space theme vibe', emoji: '🌌' },
  { id: 'emerald-gold', name: 'Emerald Botanical Gold', description: 'Botanical wealth and golden accents', emoji: '🌿' },
  { id: 'minimalist-ivory', name: 'Classic Clean Ivory', description: 'Elite light neutral tone background', emoji: '🍦' }
];

export const LANGUAGES: { id: LanguageType; name: string; label: string; emoji: string }[] = [
  { id: 'en', name: 'English (US)', label: 'Professional English', emoji: '🇬🇧' },
  { id: 'hi-en', name: 'Hinglish (Mix)', label: 'Hindi + English', emoji: '🇮🇳' },
  { id: 'hi', name: 'हिन्दी (शुद्ध)', label: 'Pure Hindi', emoji: '🇮🇳' },
  { id: 'mr', name: 'मराठी (अस्सल)', label: 'Authentic Marathi', emoji: '🇮🇳' },
];

export const UI_TEXT = getUITextForLanguage();
