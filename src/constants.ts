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
  { id: 'minimalist-ivory', name: 'Clean Ivory (Light Mode)', description: 'Bright cream-white background with calm green accents', emoji: '☀️' },
  { id: 'midnight_blue', name: 'Midnight Blue (Dark Mode)', description: 'Deep dark navy background with royal blue highlights', emoji: '🌙' },
  { id: 'luxury_gold', name: 'Black & Gold (Premium)', description: 'Sleek dark background with rich golden accents', emoji: '👑' },
  { id: 'neo_brutalist', name: 'Bold Black & White', description: 'High-contrast white with thick black borders & sharp edges', emoji: '🏁' },
  { id: 'emerald_matrix', name: 'Matrix Green (Dark)', description: 'Pitch black background with glowing green style', emoji: '📟' },
  { id: 'retro-blue', name: 'Cosmic Purple & Blue', description: 'Deep dark night sky with glowing purple & indigo', emoji: '🌌' },
  { id: 'emerald-gold', name: 'Forest Green & Gold', description: 'Deep dark forest green with warm amber-gold', emoji: '🌿' },
  { id: 'cyberpunk', name: 'Neon Pink & Cyan', description: 'Vibrant dark theme with glowing pink & electric cyan', emoji: '⚡' }
];

export const LANGUAGES: { id: LanguageType; name: string; label: string; emoji: string }[] = [
  { id: 'hi-en', name: 'Hinglish (Mix)', label: 'Hindi + English', emoji: '🇮🇳' },
  { id: 'en', name: 'English (US)', label: 'Professional English', emoji: '🇬🇧' },
  { id: 'hi', name: 'हिन्दी (शुद्ध)', label: 'Pure Hindi', emoji: '🇮🇳' },
  { id: 'mr', name: 'मराठी (अस्सल)', label: 'Authentic Marathi', emoji: '🇮🇳' },
];

export const UI_TEXT = getUITextForLanguage();
