import { Category } from '../types';

export type BusinessModeType = 'kirana';

export interface BusinessModeDef {
  id: BusinessModeType;
  name: string;
  emoji: string;
  description: string;
  hindiDescription?: string;
  focus: string;
  hindiFocus?: string;
  recommendedFeatures: string[];
  recommendedHindiFeatures?: string[];
  workflowPreview: string[];
  workflowHindiPreview?: string[];
  suggestedCategories: Category[];
  suggestedDashboardCards: { id: string; title: string; visible: boolean; size: 'small' | 'medium' | 'large' }[];
  suggestedQuickActions: string[];
  suggestedFeatures: {
    udhar: boolean;
    inventory: boolean;
    customer: boolean;
    supplier: boolean;
    analytics: boolean;
    notifications: boolean;
    printing: boolean;
    cloudSync: boolean;
  };
  customFields?: {
    label: string;
    key: string;
    type: string;
    visible: boolean;
  }[];
}

export const BUSINESS_MODES: Record<BusinessModeType, BusinessModeDef> = {
  kirana: {
    id: 'kirana',
    name: 'Kirana Store',
    emoji: '🏪',
    description: 'Optimized for high-speed counter billing, grocery cataloging, loose weight ratios, and credit tracking (Udhar).',
    hindiDescription: 'तेज़ काउंटर बिलिंग, किराना सूची, वजन मात्रक और उधार बही-खाता के लिए सबसे उपयुक्त।',
    focus: 'Fast Retail Billing, Inventory Tracking, Daily Sales',
    hindiFocus: 'फास्ट रीटेल बिलिंग, स्टॉक ट्रैकिंग, दैनिक बिक्री',
    recommendedFeatures: [
      'Fast Retail Billing with Loose & Packed weights',
      'Barcode / Quick Add items to cart',
      'Unified Udhar (Credit) ledger with auto SMS drafts',
      'Low stock warning indicator'
    ],
    recommendedHindiFeatures: [
      'खुले और पैकेट वजन के साथ तेज़ खुदरा बिलिंग',
      'बारकोड/फटाफट कार्ट में आइटम जोड़ना',
      'ऑटो एसएमएस ड्राफ्ट के साथ खाता लेजर',
      'कम स्टॉक चेतावनी अलर्ट'
    ],
    workflowPreview: [
      'Customer walks in → Select items by category grid → Fast print/UPI transaction'
    ],
    workflowHindiPreview: [
      'ग्राहक आगमन → केटेगरी ग्रिड से सामान चुनें → तुरंत प्रिंट व यूपीआई पेमेंट'
    ],
    suggestedCategories: [
      { id: 'kr_1', name: 'Rice & Grains', icon: '🌾', color: '#10b981' },
      { id: 'kr_2', name: 'Pulses (दालें)', icon: '🫘', color: '#f59e0b' },
      { id: 'kr_3', name: 'Spices & Masala', icon: '🌶️', color: '#ef4444' },
      { id: 'kr_4', name: 'Dry Fruits & Nuts', icon: '🥜', color: '#8b5cf6' },
      { id: 'kr_5', name: 'Snacks & Biscuits', icon: '🍪', color: '#ec4899' },
      { id: 'kr_6', name: 'Beverages & Soft Drinks', icon: '🥤', color: '#3b82f6' }
    ],
    suggestedDashboardCards: [
      { id: 'sales', title: 'Daily Sales Revenue', visible: true, size: 'large' },
      { id: 'profit', title: 'Computed Gross Profit', visible: true, size: 'medium' },
      { id: 'low_stock', title: 'Critical Stock Alerts', visible: true, size: 'medium' }
    ],
    suggestedQuickActions: ['create_bill', 'add_product', 'update_stock', 'open_analytics', 'open_udhar', 'print_invoice'],
    suggestedFeatures: {
      udhar: true,
      inventory: true,
      customer: true,
      supplier: true,
      analytics: true,
      notifications: true,
      printing: true,
      cloudSync: true
    }
  }
};
