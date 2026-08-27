import { LanguageType, AppSettings } from "../types";

// Translation database containing highly natural shopkeeper-friendly translations.
// English: Standard clear terms
// Hindi: Simple Hindi (no difficult formal terms like "उत्पाद", "मूल्यांकन", "वर्गीकरण")
// Marathi: Natural shop Marathi
// Hinglish: What shopkeepers naturally speak (no dry/awkward literal translations)
export const TRANSLATION_DB: Record<string, Record<LanguageType, string>> = {
  // Navigation & Screens
  terminateSession: {
    en: "LOG OUT",
    hi: "लॉग आउट",
    mr: "लॉग आउट",
    "hi-en": "LOG OUT"
  },
  logOut: {
    en: "LOG OUT",
    hi: "लॉग आउट",
    mr: "लॉग आउट",
    "hi-en": "LOG OUT"
  },
  inventory: {
    en: "Inventory",
    hi: "सामान / स्टॉक",
    mr: "सामान / स्टॉक",
    "hi-en": "Stock"
  },
  search: {
    en: "Search items, units or categories...",
    hi: "सामान, यूनिट या कैटगरी खोजें...",
    mr: "सामान, युनिट किंवा कॅटेगरी शोधा...",
    "hi-en": "Saman, unit ya category search karo..."
  },
  totalItems: {
    en: "Total Items",
    hi: "कुल सामान",
    mr: "एकूण सामान",
    "hi-en": "Total Items"
  },
  totalValue: {
    en: "Total Value",
    hi: "कुल माल की कीमत",
    mr: "एकूण माल किंमत",
    "hi-en": "Total Stock Value"
  },
  categories: {
    en: "Categories",
    hi: "कैटगरी",
    mr: "कॅटेगरी",
    "hi-en": "Categories"
  },
  buy: {
    en: "Cost Price",
    hi: "खरीद भाव",
    mr: "खरेदी भाव",
    "hi-en": "Buying Rate"
  },
  wholesale: {
    en: "Wholesale Price",
    hi: "थोक भाव",
    mr: "घाऊक भाव",
    "hi-en": "Wholesale Price"
  },
  retail: {
    en: "Retail Price",
    hi: "रिटेल भाव",
    mr: "किरकोळ भाव",
    "hi-en": "Retail Price"
  },
  addItem: {
    en: "Add Product",
    hi: "सामान जोड़ें",
    mr: "सामान जोडा",
    "hi-en": "Saman Add Karo"
  },
  editItem: {
    en: "Edit Product",
    hi: "सामान बदलें",
    mr: "सामान बदला",
    "hi-en": "Saman Edit Karo"
  },
  save: {
    en: "Save",
    hi: "सेव करें",
    mr: "सेव्ह करा",
    "hi-en": "Save Karo"
  },
  cancel: {
    en: "Cancel",
    hi: "रद्द करें",
    mr: "रद्द करा",
    "hi-en": "Cancel"
  },
  delete: {
    en: "Delete",
    hi: "डिलीट करें",
    mr: "हटवा",
    "hi-en": "Delete Karo"
  },
  settings: {
    en: "Settings",
    hi: "सेटिंग्स",
    mr: "सेटिंग्ज",
    "hi-en": "Settings"
  },
  theme: {
    en: "App Theme",
    hi: "ऐप थीम",
    mr: "अ‍ॅप थीम",
    "hi-en": "App Theme"
  },
  language: {
    en: "Language",
    hi: "भाषा",
    mr: "भाषा",
    "hi-en": "Language"
  },
  locked: {
    en: "Locked",
    hi: "लॉक है",
    mr: "लॉक आहे",
    "hi-en": "Locked"
  },
  unlocked: {
    en: "Unlocked",
    hi: "अनलॉक है",
    mr: "अनलॉक आहे",
    "hi-en": "Unlocked"
  },
  enterPin: {
    en: "Enter PIN",
    hi: "पिन डालें",
    mr: "पिन टाका",
    "hi-en": "PIN Dalein"
  },
  createPin: {
    en: "Set New PIN",
    hi: "नया पिन सेट करें",
    mr: "नवीन पिन सेट करा",
    "hi-en": "Naya PIN Set Karo"
  },
  confirmPin: {
    en: "Confirm PIN",
    hi: "पिन दोबारा डालें",
    mr: "पिन पुन्हा टाका",
    "hi-en": "PIN Confirm Karo"
  },
  stats: {
    en: "Analytics",
    hi: "रिपोर्ट / मुनाफा",
    mr: "रिपोर्ट / नफा",
    "hi-en": "Report"
  },
  profile: {
    en: "Store Profile",
    hi: "दुकान की जानकारी",
    mr: "दुकान माहिती",
    "hi-en": "Store Profile"
  },
  all: {
    en: "All",
    hi: "सब",
    mr: "सर्व",
    "hi-en": "All"
  },
  unit: {
    en: "Unit",
    hi: "यूनिट",
    mr: "युनिट",
    "hi-en": "Unit"
  },
  quantity: {
    en: "Quantity",
    hi: "मात्रा",
    mr: "प्रमाण",
    "hi-en": "Quantity"
  },
  buyingPrice: {
    en: "Buying Price",
    hi: "खरीद कीमत",
    mr: "खरेदी किंमत",
    "hi-en": "Buying Price"
  },
  wholesalePrice: {
    en: "Wholesale Price",
    hi: "थोक कीमत",
    mr: "घाऊक किंमत",
    "hi-en": "Wholesale Price"
  },
  retailPrice: {
    en: "Retail Price",
    hi: "रिटेल कीमत",
    mr: "किरकोळ किंमत",
    "hi-en": "Retail Price"
  },
  margin: {
    en: "Margin",
    hi: "मुनाफा %",
    mr: "नफा %",
    "hi-en": "Margin"
  },
  applyMargin: {
    en: "Apply Margin",
    hi: "मार्जिन सेट करें",
    mr: "मार्जिन लावा",
    "hi-en": "Margin Set Karo"
  },
  notes: {
    en: "Notes",
    hi: "नोट्स / टिप्पणी",
    mr: "नोंदी",
    "hi-en": "Notes"
  },
  emptyList: {
    en: "No products found. Add some items!",
    hi: "कोई सामान नहीं मिला। नया सामान जोड़ें!",
    mr: "काहीही आढळले नाही. नवीन सामान जोडा!",
    "hi-en": "Kuch nahi mila. Saman add karo!"
  },
  notesDashboard: {
    en: "Notes & Reminders",
    hi: "नोट्स और रिमाइंडर",
    mr: "टीपा आणि आठवणी",
    "hi-en": "Notes & Reminders"
  },
  addNote: {
    en: "Add Note",
    hi: "नोट लिखें",
    mr: "नोंद जोडा",
    "hi-en": "Note Add Karo"
  },
  viewAllNotes: {
    en: "View All",
    hi: "सब देखें",
    mr: "सर्व पहा",
    "hi-en": "View All"
  },
  recentPriceChanges: {
    en: "Recent Price Changes",
    hi: "हाल ही में बदले दाम",
    mr: "नुकतेच बदललेले दर",
    "hi-en": "Price Changes"
  },
  login: {
    en: "Login",
    hi: "लॉगिन करें",
    mr: "लॉगिन करा",
    "hi-en": "Login Karo"
  },
  logout: {
    en: "Logout",
    hi: "लॉगआउट करें",
    mr: "लॉगआउट करा",
    "hi-en": "Logout Karo"
  },
  lastCheck: {
    en: "Last Checked",
    hi: "आखिरी बार देखा",
    mr: "शेवटची तपासणी",
    "hi-en": "Last Checked"
  },
  updateRecord: {
    en: "Update Record",
    hi: "रिकॉर्ड बदलें",
    mr: "नोंद सुधारा",
    "hi-en": "Update Karo"
  },
  newEntry: {
    en: "New Entry",
    hi: "नई एंट्री",
    mr: "नवीन एन्ट्री",
    "hi-en": "New Entry"
  },
  stockStatus: {
    en: "Stock Status",
    hi: "स्टॉक की स्थिति",
    mr: "स्टॉकची स्थिती",
    "hi-en": "Stock Status"
  },
  lowStock: {
    en: "Low Stock Alert",
    hi: "कम स्टॉक चेतावनी",
    mr: "कमी स्टॉक अलर्ट",
    "hi-en": "Kam Stock Alert"
  },
  installApp: {
    en: "Install App",
    hi: "ऐप इंस्टॉल करें",
    mr: "अ‍ॅप इंस्टॉल करा",
    "hi-en": "App Install Karo"
  },
  installDesc: {
    en: "Install on home screen for quick access",
    hi: "आसानी से खोलने के लिए होम स्क्रीन पर जोड़ें",
    mr: "झटपट वापरासाठी होम स्क्रीनवर जोडा",
    "hi-en": "Home screen par add karo instant use ke liye"
  },
  clientShare: {
    en: "Share with Customer",
    hi: "ग्राहक को भेजें",
    mr: "ग्राहकाला पाठवा",
    "hi-en": "Customer ko Bhejo"
  },
  broadcast: {
    en: "Share via WhatsApp",
    hi: "व्हाट्सएप पर भेजें",
    mr: "व्हॉट्सअ‍ॅपवर पाठवा",
    "hi-en": "WhatsApp par Bhejo"
  },
  dataEngine: {
    en: "Data Backup",
    hi: "डेटा बैकअप",
    mr: "डेटा बॅकअप",
    "hi-en": "Data Backup"
  },
  backupExport: {
    en: "Backup & Export",
    hi: "बैकअप और एक्सपोर्ट",
    mr: "बॅकअप आणि एक्सपोर्ट",
    "hi-en": "Backup aur Export"
  },
  systemCore: {
    en: "System Controls",
    hi: "सिस्टम कंट्रोल",
    mr: "सिस्टम कंट्रोल्स",
    "hi-en": "System Settings"
  },
  exportVectors: {
    en: "Export",
    hi: "एक्सपोर्ट करें",
    mr: "एक्सपोर्ट करा",
    "hi-en": "Export Karo"
  },
  exportExcel: {
    en: "Export to Excel",
    hi: "एक्सेल फाइल बनाएं",
    mr: "एक्सेल फाईल बनवा",
    "hi-en": "Excel sheet banayein"
  },
  exportPdf: {
    en: "Export to PDF",
    hi: "PDF फाइल बनाएं",
    mr: "PDF फाईल बनवा",
    "hi-en": "PDF banayein"
  },
  backupNow: {
    en: "Backup Now",
    hi: "अभी बैकअप लें",
    mr: "आताच बॅकअप घ्या",
    "hi-en": "Backup lein"
  },
  restoreBackup: {
    en: "Restore Backup",
    hi: "बैकअप वापस लाएं",
    mr: "बॅकअप परत आणा",
    "hi-en": "Backup wapas layein"
  },
  importData: {
    en: "Import Data",
    hi: "डेटा लाएं",
    mr: "डेटा इम्पोर्ट करा",
    "hi-en": "Data Import Karo"
  },
  clearCache: {
    en: "Clear Cache",
    hi: "कैश साफ़ करें",
    mr: "कॅश साफ करा",
    "hi-en": "Cache saaf karo"
  },
  error: {
    en: "Error",
    hi: "गड़बड़ हुई",
    mr: "त्रुटि झाली",
    "hi-en": "Error"
  },
  success: {
    en: "Success",
    hi: "सफल हुआ",
    mr: "यशस्वी",
    "hi-en": "Success"
  },
  deleteConfirm: {
    en: "Are you sure you want to delete this?",
    hi: "क्या आप इसे हटाना चाहते हैं?",
    mr: "तुम्ही हे नक्की हटवू इच्छिता का?",
    "hi-en": "Kya delete karna chahte hain?"
  },
  restoreConfirm: {
    en: "Restoring will replace current data. Continue?",
    hi: "पुराना डेटा वापस लाने से अभी वाला डेटा हट जाएगा। आगे बढ़ें?",
    mr: "बॅकअप परत आणल्याने आताचा डेटा निघून जाईल. पुढे जायचे का?",
    "hi-en": "Data replace ho jayega, direct proceed karein?"
  },
  securityCloud: {
    en: "Security & Cloud",
    hi: "सुरक्षा और क्लाउड",
    mr: "सुरक्षा आणि क्लाउड",
    "hi-en": "Security aur Cloud"
  },
  securityKey: {
    en: "Security PIN",
    hi: "सुरक्षा पिन",
    mr: "सुरक्षा पिन",
    "hi-en": "Security PIN"
  },
  cloudSync: {
    en: "Cloud Sync",
    hi: "क्लाउड सिंक",
    mr: "क्लाउड सिंक",
    "hi-en": "Cloud Syncing"
  },
  firebaseSync: {
    en: "Auto Cloud Sync",
    hi: "स्वचालित क्लाउड सिंक",
    mr: "स्वयंचलित क्लाउड सिंक",
    "hi-en": "Firebase Auto-sync"
  },
  autoStealth: {
    en: "Stealth Mode",
    hi: "गोपनीयता मोड",
    mr: "गोपनीयता मोड",
    "hi-en": "Stealth Mode"
  },
  stealthDesc: {
    en: "Hide buying price on startup",
    hi: "खोलते समय खरीद की कीमत छुपाएं",
    mr: "उघडताना खरेदी किंमत लपवा",
    "hi-en": "Cost prices hide karein"
  },
  compare: {
    en: "Compare",
    hi: "तुलना करें",
    mr: "तुलना करा",
    "hi-en": "Compare Karo"
  },
  items: {
    en: "Items",
    hi: "सामान",
    mr: "वस्तू",
    "hi-en": "Saman"
  },
  selected: {
    en: "Selected",
    hi: "चुने हुए",
    mr: "निवडलेले",
    "hi-en": "Selected"
  },
  clear: {
    en: "Clear",
    hi: "साफ़ करें",
    mr: "साफ करा",
    "hi-en": "Hatao"
  },
  lastChanged: {
    en: "Last Updated",
    hi: "अभी बदला",
    mr: "नुकतेच बदलले",
    "hi-en": "Update hua"
  },
  help: {
    en: "Help",
    hi: "मदद",
    mr: "मदत",
    "hi-en": "Help aur Guide"
  },
  onboardingTitle: {
    en: "Welcome to TS Price Manager!",
    hi: "TS Price Manager में आपका स्वागत है!",
    mr: "TS Price Manager मध्ये स्वागत आहे!",
    "hi-en": "TS Price Manager mein Swagat hai!"
  },
  onboardingSub: {
    en: "Let's set up your store in 30 seconds.",
    hi: "अपनी दुकान का सेटअप करें केवल 30 सेकंड में।",
    mr: "तुमच्या दुकानाचे सेटअप करा फक्त ३० सेकंदात.",
    "hi-en": "Store setup kijiye sirf 30 seconds mein."
  },
  tourNext: {
    en: "Next",
    hi: "आगे",
    mr: "पुढे",
    "hi-en": "Agla Feature"
  },
  tourFinish: {
    en: "Start",
    hi: "शुरू करें",
    mr: "सुरू करा",
    "hi-en": "Shuru karein"
  },
  tourSkip: {
    en: "Skip",
    hi: "छोड़ें",
    mr: "वगळा",
    "hi-en": "Chhod dein"
  },

  // Specific screens and dialogues
  addItemNotInList: {
    en: "Add Item Not In List",
    hi: "सूची से बाहर का सामान जोड़ें",
    mr: "यादीबाहेरील सामान जोडा",
    "hi-en": "List Mein Nahi Hai"
  },
  customerInfo: {
    en: "Customer Info",
    hi: "ग्राहक की जानकारी",
    mr: "ग्राहक माहिती",
    "hi-en": "Customer Info"
  },
  searchProduct: {
    en: "Search Product",
    hi: "सामान खोजें",
    mr: "सामान शोधा",
    "hi-en": "Search Karo"
  },
  createBill: {
    en: "Create Bill",
    hi: "बिल बनाएं",
    mr: "बिल तयार करा",
    "hi-en": "Bill Banao"
  },
  billSaved: {
    en: "Bill Saved Successfully",
    hi: "बिल सफलतापूर्वक सेव हुआ",
    mr: "बिल यशस्वीरित्या सेव झाले",
    "hi-en": "Bill Safalta Se Save Hua"
  },
  billUpdated: {
    en: "Bill Updated Successfully",
    hi: "बिल सफलतापूर्वक अपडेट हुआ",
    mr: "बिल यशस्वीरित्या अपडेट झाले",
    "hi-en": "Bill Safalta Se Update Hua"
  },
  billDeleted: {
    en: "Bill Deleted Successfully",
    hi: "बिल डिलीट कर दिया गया",
    mr: "बिल यशस्वीरित्या डिलीट केले",
    "hi-en": "Bill Delete Ho Gaya"
  },
  voicePromptHinglish: {
    en: "Voice Prompts in Hinglish",
    hi: "हिंग्लिश वौइस् प्रॉमप्ट्स",
    mr: "हिंग्लिश व्हॉईस प्रॉमप्ट्स",
    "hi-en": "Hinglish Voice Prompts"
  },
  voicePromptHindi: {
    en: "Voice Prompts in Hindi",
    hi: "हिन्दी वौइस् प्रॉमप्ट्स",
    mr: "हिंदी व्हॉईस प्रॉमप्ट्स",
    "hi-en": "Hindi Voice Prompts"
  },
  voicePromptMarathi: {
    en: "Voice Prompts in Marathi",
    hi: "मराठी वौइस् प्रॉमप्ट्स",
    mr: "मराठी व्हॉईस प्रॉमप्ट्स",
    "hi-en": "Marathi Voice Prompts"
  },
  udharEntry: {
    en: "Udhar Entry",
    hi: "उधार एंट्री",
    mr: "उधार एन्ट्री",
    "hi-en": "Udhar Entry"
  },
  udharAdded: {
    en: "Udhar Added Successfully",
    hi: "उधार सफलतापूर्वक जोड़ा गया",
    mr: "उधार यशस्वीरित्या जोडले गेले",
    "hi-en": "Udhar Safalta Se Add Hua"
  },
  newBill: {
    en: "New Bill",
    hi: "नया बिल",
    mr: "नवीन बिल",
    "hi-en": "New Bill"
  },
  listMeinNahiHai: {
    en: "Not In List",
    hi: "सूची में नहीं है",
    mr: "यादीत नाही",
    "hi-en": "List Mein Nahi Hai"
  },
  print: {
    en: "Print",
    hi: "प्रिंट करें",
    mr: "प्रिंट करा",
    "hi-en": "Print"
  },
  analytics: {
    en: "Analytics",
    hi: "रिपोर्ट",
    mr: "रिपोर्ट",
    "hi-en": "Report"
  },
  dashboard: {
    en: "Dashboard",
    hi: "डैशबोर्ड",
    mr: "डॅशबोर्ड",
    "hi-en": "Dashboard"
  },
  password: {
    en: "Password",
    hi: "पासवर्ड",
    mr: "पासवर्ड",
    "hi-en": "Password"
  },
  mobileNumber: {
    en: "Mobile Number",
    hi: "मोबाइल नंबर",
    mr: "मोबाईल नंबर",
    "hi-en": "Mobile Number"
  },
  backup: {
    en: "Backup",
    hi: "बैकअप",
    mr: "बॅकअप",
    "hi-en": "Backup"
  },
  businessSettings: {
    en: "Business Settings",
    hi: "व्यवसाय सेटिंग्स",
    mr: "व्यवसाय सेटिंग्ज",
    "hi-en": "Business Settings"
  },
  printing: {
    en: "Printing",
    hi: "प्रिंटिंग",
    mr: "प्रिंटिंग",
    "hi-en": "Printing"
  },
  udhar: {
    en: "Udhar Book",
    hi: "उधार खाता",
    mr: "उधार खाते",
    "hi-en": "Udhar Book"
  },
  billing: {
    en: "Billing",
    hi: "बिल बनाना",
    mr: "बिल बनवणे",
    "hi-en": "Billing"
  },
  inventoryLabel: {
    en: "Inventory",
    hi: "माल / स्टॉक",
    mr: "माल / स्टॉक",
    "hi-en": "Stock"
  },
  notifications: {
    en: "Notifications",
    hi: "सूचनाएं",
    mr: "सूचना",
    "hi-en": "Notifications"
  },
  quickActions: {
    en: "Quick Actions",
    hi: "तुरंत काम",
    mr: "जलद क्रिया",
    "hi-en": "Quick Actions"
  },
  salesSummary: {
    en: "Sales Summary",
    hi: "बिक्री रिपोर्ट",
    mr: "विक्री रिपोर्ट",
    "hi-en": "Sales Summary"
  },
  profitSummary: {
    en: "Profit Summary",
    hi: "मुनाफा रिपोर्ट",
    mr: "नफा रिपोर्ट",
    "hi-en": "Profit Summary"
  },
  billsSummary: {
    en: "Bills Summary",
    hi: "बिल रिपोर्ट",
    mr: "बिल रिपोर्ट",
    "hi-en": "Bills Summary"
  },
  inventoryValue: {
    en: "Inventory Value",
    hi: "माल की कीमत",
    mr: "मालमत्ता मूल्य",
    "hi-en": "Stock Value"
  },
  lowStockAlerts: {
    en: "Low Stock Alerts",
    hi: "कम स्टॉक चेतावनी",
    mr: "कमी स्टॉक अलर्ट",
    "hi-en": "Kam Stock Alert"
  },
  outOfStock: {
    en: "Out of Stock",
    hi: "माल खत्म",
    mr: "माल संपला",
    "hi-en": "Out of Stock"
  },
  pendingUdhar: {
    en: "Pending Udhar",
    hi: "उधार बाकी",
    mr: "उधार बाकी",
    "hi-en": "Pending Udhar"
  },
  topProducts: {
    en: "Top Products",
    hi: "सबसे ज्यादा बिकने वाला सामान",
    mr: "सर्वाधिक विकणारा माल",
    "hi-en": "Top Products"
  },
  printerStatus: {
    en: "Printer Status",
    hi: "प्रिंटर कनेक्शन",
    mr: "प्रिंटर कनेक्शन",
    "hi-en": "Printer Status"
  },
  cloudSyncStatus: {
    en: "Cloud Sync Status",
    hi: "क्लाउड सिंक की स्थिति",
    mr: "क्लाउड सिंकची स्थिती",
    "hi-en": "Cloud Sync Status"
  },
  backupStatus: {
    en: "Backup Status",
    hi: "बैकअप स्थिति",
    mr: "बॅकअप स्थिती",
    "hi-en": "Backup Status"
  },
  businessHealth: {
    en: "Business Health",
    hi: "व्यापार की सेहत",
    mr: "व्यवसाय आरोग्य",
    "hi-en": "Business Health"
  },
  recentActivity: {
    en: "Recent Activity",
    hi: "हाल की गतिविधि",
    mr: "नुकतीच हालचाल",
    "hi-en": "Recent Activity"
  },
  businessJourney: {
    en: "Business Journey",
    hi: "व्यापार यात्रा",
    mr: "व्यवसाय प्रवास",
    "hi-en": "Business Journey"
  },
  goalsProgress: {
    en: "Goals Progress",
    hi: "लक्ष्य प्रगति",
    mr: "ध्येय प्रगती",
    "hi-en": "Goals Progress"
  },
  storeAnalytics: {
    en: "Store Analytics",
    hi: "दुकान की रिपोर्ट",
    mr: "दुकान रिपोर्ट",
    "hi-en": "Store Analytics"
  },
  analyticsSubText: {
    en: "Professional Business Analytics & Inventory Performance reporting",
    hi: "व्यापार रिपोर्ट और स्टॉक की स्थिति की जानकारी",
    mr: "व्यवसाय रिपोर्ट आणि स्टॉक माहिती",
    "hi-en": "Store Reports & Stock Info"
  },
  today: {
    en: "Today",
    hi: "आज",
    mr: "आज",
    "hi-en": "Aaj"
  },
  week: {
    en: "Week",
    hi: "हफ्ता",
    mr: "आठवडा",
    "hi-en": "Hafta"
  },
  month: {
    en: "Month",
    hi: "महीना",
    mr: "महिना",
    "hi-en": "Mahina"
  },
  year: {
    en: "Year",
    hi: "साल",
    mr: "वर्ष",
    "hi-en": "Saal"
  },
  coreFinancials: {
    en: "Core Financial Analytics",
    hi: "कमाई और मुनाफा रिपोर्ट",
    mr: "कमाई आणि नफा रिपोर्ट",
    "hi-en": "Earnings & Profit Report"
  },
  businessMilestones: {
    en: "Business Milestones & Journey",
    hi: "व्यापार के मुख्य पड़ाव और उपलब्धियां",
    mr: "व्यवसायाचे टप्पे आणि यश",
    "hi-en": "Business Milestones & Achievements"
  },
  noBillsDetected: {
    en: "No billing transactions detected",
    hi: "कोई बिल नहीं मिला",
    mr: "कोणतेही बिल आढळले नाही",
    "hi-en": "Koi bill nahi mila"
  },
  noBillsDetectedSub: {
    en: "Your analytics telemetry pipeline is ready. Perform customer checkouts or save draft POS window actions to visualize live business parameters here.",
    hi: "रिपोर्ट तैयार है। ग्राहकों के बिल बनाएं और यहां अपनी बिक्री और मुनाफा लाइव देखें।",
    mr: "रिपोर्ट तयार आहे. ग्राहकांचे बिल बनवा आणि येथे आपली विक्री आणि नफा लाईव्ह पहा.",
    "hi-en": "Reports ready hain. Customer bills banayein aur apni bikri aur munafa live dekhye."
  },
  systemStatus: {
    en: "System Status",
    hi: "सिस्टम की स्थिति",
    mr: "सिस्टमची स्थिती",
    "hi-en": "System Status"
  },
  telemetryActive: {
    en: "Telemetry Stream: Active",
    hi: "लाइव रिपोर्टिंग: चालू",
    mr: "लाईव्ह रिपोर्टिंग: सुरू",
    "hi-en": "Live Reporting: Active"
  },
  ledgerNode: {
    en: "Ledger Node",
    hi: "खाता बुक",
    mr: "खाते पुस्तक",
    "hi-en": "Khata Book"
  },
  offlineSyncEnabled: {
    en: "Offline Sync Channel Enabled",
    hi: "बिना इंटरनेट सेविंग चालू",
    mr: "विना इंटरनेट सेव्हिंग सुरू",
    "hi-en": "Offline Sync Enabled"
  },
  statisticalEngine: {
    en: "Statistical Engine",
    hi: "कैलकुलेटर इंजन",
    mr: "कॅल्क्युलेटर इंजिन",
    "hi-en": "Calculator Engine"
  },
  highPrecisionAudit: {
    en: "High Precision Audit Ready",
    hi: "सटीक और सुरक्षित गणना",
    mr: "अचूक आणि सुरक्षित गणना",
    "hi-en": "Sateek Calculation Ready"
  },
  totalSales: {
    en: "Total Sales",
    hi: "कुल बिक्री",
    mr: "एकूण विक्री",
    "hi-en": "Total Sales"
  },
  billsRegistered: {
    en: "bills registered",
    hi: "बिल बने",
    mr: "बिल तयार",
    "hi-en": "bills registered"
  },
  totalProfit: {
    en: "Total Profit",
    hi: "कुल मुनाफा",
    mr: "एकूण नफा",
    "hi-en": "Total Profit"
  },
  profitMargin: {
    en: "Margin",
    hi: "मार्जिन",
    mr: "मार्जिन",
    "hi-en": "Margin"
  },
  standardInvoices: {
    en: "Standard invoices",
    hi: "कुल बने बिल",
    mr: "एकूण बनलेले बिल",
    "hi-en": "Total bills"
  },
  totalPrints: {
    en: "Total Prints",
    hi: "कुल प्रिंट",
    mr: "एकूण प्रिंट",
    "hi-en": "Total Prints"
  },
  thermalReprints: {
    en: "Thermal reprints",
    hi: "प्रिंट रसीदें",
    mr: "प्रिंट पावती",
    "hi-en": "Print receipts"
  },
  totalAssets: {
    en: "Total Assets",
    hi: "कुल सामान प्रकार",
    mr: "एकूण सामान प्रकार",
    "hi-en": "Total Item Types"
  },
  stockUnits: {
    en: "stock units",
    hi: "स्टॉक मात्रा",
    mr: "स्टॉक प्रमाण",
    "hi-en": "stock units"
  },
  assetValue: {
    en: "Asset Value",
    hi: "स्टॉक की कुल कीमत",
    mr: "स्टॉकची एकूण किंमत",
    "hi-en": "Stock ki total value"
  },
  capCost: {
    en: "Cap",
    hi: "लागत",
    mr: "लागत",
    "hi-en": "Cost"
  },
  topSellingItems: {
    en: "Top 10 Selling Items",
    hi: "सबसे ज्यादा बिकने वाले सामान",
    mr: "सर्वाधिक विकणारे सामान",
    "hi-en": "Sabse Zyada Bikne Wale Items"
  },
  topSellingSub: {
    en: "Highest velocity checkout items recorded across the interval",
    hi: "चुने गए समय में सबसे अधिक बिकने वाले सामानों की सूची",
    mr: "निवडलेल्या वेळेत सर्वाधिक विकल्या जाणाऱ्या वस्तूंची यादी",
    "hi-en": "Chune gaye samay mein sabse zyada bikne wale items"
  },
  noProductSalesLogged: {
    en: "No product sales logged under selected timeframe",
    hi: "इस समय सीमा में कोई बिक्री नहीं हुई",
    mr: "या कालावधीत कोणतीही विक्री झाली नाही",
    "hi-en": "Is samay mein koi sale nahi hui"
  },
  warehouseReport: {
    en: "Warehouse Inventory Report",
    hi: "स्टॉक की पूरी जानकारी",
    mr: "स्टॉकची पूर्ण माहिती",
    "hi-en": "Stock ki full report"
  },
  warehouseReportSub: {
    en: "Comprehensive audit of active store catalog metadata & stock health",
    hi: "स्टॉक की मात्रा और उसके भाव की विस्तृत जानकारी",
    mr: "स्टॉकचे प्रमाण आणि त्याच्या किमतीची सविस्तर माहिती",
    "hi-en": "Stock quantity aur uske prices ki full report"
  },
  stockHealth: {
    en: "Stock Health",
    hi: "स्टॉक की स्थिति",
    mr: "स्टॉकची स्थिती",
    "hi-en": "Stock ki condition"
  },
  excellent: {
    en: "Excellent",
    hi: "बहुत बढ़िया",
    mr: "उत्कृष्ट",
    "hi-en": "Excellent"
  },
  warning: {
    en: "Warning",
    hi: "चेतावनी",
    mr: "धोका",
    "hi-en": "Warning"
  },
  critical: {
    en: "Critical",
    hi: "गंभीर",
    mr: "गंभीर",
    "hi-en": "Critical"
  },
  capitalInvestment: {
    en: "Capital Investment",
    hi: "सामान में लगी लागत",
    mr: "सामानात गुंतलेली रक्कम",
    "hi-en": "Saman ki cost price"
  },
  targetRevenue: {
    en: "Target Revenue",
    hi: "बिक्री का लक्ष्य",
    mr: "विक्रीचे ध्येय",
    "hi-en": "Sales Target"
  },
  estimatedMargin: {
    en: "Estimated Margin",
    hi: "अनुमानित मुनाफा",
    mr: "अंदाजे नफा",
    "hi-en": "Expected Profit"
  },
  lowStockItems: {
    en: "Low Stock Items",
    hi: "कम स्टॉक वाला सामान",
    mr: "कमी स्टॉक असलेले सामान",
    "hi-en": "Kam stock wale items"
  },
  lowStockSub: {
    en: "Products needing immediate restock",
    hi: "जिन सामानों को तुरंत मंगवाने की जरूरत है",
    mr: "ज्या वस्तू लगेच मागवण्याची गरज आहे",
    "hi-en": "Jin items ko turant mangwana hai"
  },
  triggerLevel: {
    en: "Items below trigger level",
    hi: "कम स्टॉक लिमिट से नीचे",
    mr: "कमी स्टॉक मर्यादेपेक्षा खाली",
    "hi-en": "Kam stock limit se niche"
  },
  outOfStockItemsText: {
    en: "Out of Stock Items",
    hi: "खत्म हुआ सामान",
    mr: "संपलेले सामान",
    "hi-en": "Khatam hua saman"
  },
  noInventoryAvailable: {
    en: "No inventory available",
    hi: "स्टॉक उपलब्ध नहीं है",
    mr: "स्टॉक उपलब्ध नाही",
    "hi-en": "Stock khali hai"
  },
  allWellStocked: {
    en: "All items are well stocked!",
    hi: "सब सामान पर्याप्त मात्रा में है!",
    mr: "सर्व सामान पुरेशा प्रमाणात आहे!",
    "hi-en": "Sari cheezein full stock hain!"
  },
  allWellStockedSub: {
    en: "Outstanding job! Your inventory levels are fully optimized and healthy across all categories.",
    hi: "बहुत बढ़िया! आपकी दुकान का स्टॉक सभी कैटगरी में पर्याप्त और सुरक्षित स्तर पर है।",
    mr: "उत्कृष्ट! आपल्या दुकानाचा स्टॉक सर्व कॅटेगरीमध्ये पुरेसा आणि सुरक्षित पातळीवर आहे.",
    "hi-en": "Outstanding! Aapki dukan ka stock sabhi categories mein sahi level par hai."
  },
  monthlySalesTargetTitle: {
    en: "Monthly Store Compass",
    hi: "महीने की बिक्री का लक्ष्य",
    mr: "महिन्याच्या विक्रीचे ध्येय",
    "hi-en": "Monthly Sales Target"
  },
  monthlySalesTargetDesc: {
    en: "Direct live calibration based on checkout ledger billing transactions",
    hi: "दुकान के बिलों के आधार पर लाइव बिक्री की प्रगति",
    mr: "दुकानाच्या बिलांच्या आधारे लाईव्ह विक्रीची प्रगती",
    "hi-en": "Billo ke aadhar par live bikri ki progress"
  },
  remainingGap: {
    en: "REMAINING GAP",
    hi: "लक्ष्य से दूरी",
    mr: "ध्येयापासूनचे अंतर",
    "hi-en": "Target se doori"
  },
  targetConquered: {
    en: "Target Conquered",
    hi: "लक्ष्य पूरा हुआ!",
    mr: "ध्येय पूर्ण झाले!",
    "hi-en": "Target Poora Hua!"
  },
  deficitLeft: {
    en: "Deficit Left",
    hi: "बचा हुआ लक्ष्य",
    mr: "उरलेले ध्येय",
    "hi-en": "Bacha hua target"
  },
  toHoldLimit: {
    en: "to hold limit",
    hi: "लक्ष्य पूरा करने के लिए",
    mr: "ध्येय पूर्ण करण्यासाठी",
    "hi-en": "target poora karne ke liye"
  },
  dailyVelocityReq: {
    en: "DAILY VELOCITY REQ.",
    hi: "रोज़ की ज़रूरी बिक्री",
    mr: "रोजची आवश्यक विक्री",
    "hi-en": "Daily required sales"
  },
  salesDaysLeft: {
    en: "Sales days left",
    hi: "दिन बचे हैं",
    mr: "दिवस उरले आहेत",
    "hi-en": "Days bache hain"
  },
  perDayPace: {
    en: "per day pace",
    hi: "हर दिन का भाव",
    mr: "दररोजचा सरासरी",
    "hi-en": "har din ka average"
  },
  projectedStatement: {
    en: "PROJECTED STATEMENT",
    hi: "अनुमानित कुल बिक्री",
    mr: "अंदाजे एकूण विक्री",
    "hi-en": "Projected total sales"
  },
  closingTrajectory: {
    en: "Closing Trajectory",
    hi: "महीने के अंत तक अनुमान",
    mr: "महिन्याअखेरीसचा अंदाज",
    "hi-en": "Month-end estimate"
  },
  estimatedTotal: {
    en: "estimated total",
    hi: "अनुमानित कुल",
    mr: "अंदाजे एकूण",
    "hi-en": "projected total"
  },
  intermediateBadges: {
    en: "INTERMEDIATE BADGES",
    hi: "मुख्य मेडल",
    mr: "मुख्य मेडल",
    "hi-en": "Special Badges"
  },
  // Hardcoded references inside screens
  freshMangoes: {
    en: "e.g. Fresh Mangoes",
    hi: "जैसे: ताज़ा आम",
    mr: "उदा: ताजे आंबे",
    "hi-en": "e.g. Fresh Mangoes"
  }
};

/**
 * Normalizes/cleans text to comply with selected language constraints.
 * - Under English / Hinglish modes, completely strips out Devnagari characters and translations.
 * - Handles auto-cleansing of parentheses containing Devnagari, e.g. "Add Item Not in List (खुला सामान जोड़े)" -> "List Mein Nahi Hai" or "Add Item Not in List"
 */
export function cleanAndValidateText(text: string, lang: LanguageType, settings?: Partial<AppSettings>): string {
  if (typeof text !== 'string') {
    text = String(text || '');
  }
  if (!text) return "";
  
  const strictMode = settings?.enableStrictLanguageMode !== false;
  const allowMixed = settings?.allowMixedLanguage === true;
  const validateOn = settings?.enableTranslationValidation !== false;

  if (!strictMode || allowMixed) {
    return text;
  }

  // 1. If English or Hinglish is selected, strip out any Devnagari characters entirely to maintain pristine monolingual script
  if (lang === "en" || lang === "hi-en") {
    // If the text matches a known hardcoded pattern with Devnagari, clean it up
    const lowerText = text.toLowerCase();
    
    // Check if the text matches a known mixed-language element, and swap it with pure translated equivalent
    if (lowerText.includes("add item not in list") || lowerText.includes("खुला / अतिरिक्त")) {
      return lang === "hi-en" ? "List Mein Nahi Hai" : "Add Item Not In List";
    }
    if (lowerText.includes("fresh mangoes") || lowerText.includes("खुला माल")) {
      return lang === "hi-en" ? "e.g. Fresh Mangoes" : "e.g. Fresh Mangoes";
    }
    if (lowerText.includes("customer details") || lowerText.includes("ग्राहक जानकारी")) {
      return lang === "hi-en" ? "Customer Info" : "Customer Info";
    }
    if (lowerText.includes("stock management") || lowerText.includes("स्टॉक प्रबंधन")) {
      return lang === "hi-en" ? "Stock" : "Stock";
    }

    // Remove text inside parenthesis that contains Devnagari (e.g. "(खुला सामान जोड़े)")
    let cleaned = text.replace(/\s*\([\u0900-\u097F\s\/,|，、-]+\)/g, "");
    // Remove individual Devnagari characters
    cleaned = cleaned.replace(/[\u0900-\u097F]/g, "");
    
    // Clean trailing slashes or spaces
    cleaned = cleaned.replace(/\s*[\/\-|,]\s*$/, "").trim();
    
    if (!cleaned) {
      // If we completely stripped everything, do a reverse lookup of the original text
      const lookupResult = reverseLookup(text, lang);
      if (lookupResult) return lookupResult;
      return text; // Fallback to raw if lookup fails
    }
    
    return cleaned;
  }

  // 2. If Hindi or Marathi is selected, and we see an English-only text or mixed text
  if (lang === "hi" || lang === "mr") {
    const lowerText = text.toLowerCase();
    
    if (lowerText.includes("add item not in list") || lowerText.includes("खुला / अतिरिक्त")) {
      return lang === "hi" ? "सूची से बाहर का सामान जोड़ें" : "यादीत नसलेले सामान जोडा";
    }
    if (lowerText.includes("fresh mangoes") || lowerText.includes("खुला माल")) {
      return lang === "hi" ? "जैसे: ताज़ा आम (खुला सामान)" : "उदा: ताजे आंबे (खुला माल)";
    }
    if (lowerText.includes("customer details") || lowerText.includes("ग्राहक जानकारी")) {
      return lang === "hi" ? "ग्राहक की जानकारी" : "ग्राहक माहिती";
    }
    if (lowerText.includes("stock management") || lowerText.includes("स्टॉक प्रबंधन")) {
      return lang === "hi" ? "स्टॉक" : "स्टॉक";
    }

    // If text contains English but no Devnagari, let's try to look up its translation in Hindi/Marathi
    const hasDevnagari = /[\u0900-\u097F]/.test(text);
    if (!hasDevnagari) {
      const lookupResult = reverseLookup(text, lang);
      if (lookupResult) return lookupResult;
    }
  }

  return text;
}

/**
 * Searches the translation database for a text value in ANY language, and returns the target language's value.
 */
export function reverseLookup(text: string, targetLang: LanguageType): string | null {
  const clean = text.trim().toLowerCase();
  
  for (const key in TRANSLATION_DB) {
    const translations = TRANSLATION_DB[key];
    for (const langKey in translations) {
      const val = translations[langKey as LanguageType]?.trim().toLowerCase();
      if (val === clean || (val && clean.includes(val)) || (val && val.includes(clean))) {
        return translations[targetLang];
      }
    }
  }
  return null;
}

/**
 * Core Translation function used dynamically.
 */
export function translate(key: string, lang: LanguageType, settings?: Partial<AppSettings>): string {
  const entry = TRANSLATION_DB[key];
  if (entry && entry[lang]) {
    return cleanAndValidateText(entry[lang], lang, settings);
  }
  
  // If key is a text block, let's clean it up directly
  return cleanAndValidateText(key, lang, settings);
}

/**
 * Helper to build/return a reactive proxy of UI_TEXT which is used across the codebase.
 * This intercepts UI_TEXT access and routes it dynamically to our translation engine database!
 */
export function getUITextForLanguage() {
  const baseObject: Record<LanguageType, Record<string, string>> = {
    en: {},
    hi: {},
    mr: {},
    "hi-en": {}
  };

  const languages: LanguageType[] = ["en", "hi", "mr", "hi-en"];

  // Populate basic keys in UI_TEXT from our database for compile-time/static safety
  for (const key in TRANSLATION_DB) {
    languages.forEach((lang) => {
      baseObject[lang][key] = TRANSLATION_DB[key][lang];
    });
  }

  // Create a handler that resolves keys dynamically, automatically validating/cleaning each string!
  const createLanguageProxy = (lang: LanguageType) => {
    return new Proxy(baseObject[lang], {
      get(target, keyStr: string) {
        // If there's a specific key in DB, use it
        if (TRANSLATION_DB[keyStr]) {
          return cleanAndValidateText(TRANSLATION_DB[keyStr][lang], lang, { enableStrictLanguageMode: true });
        }
        
        // Otherwise return whatever is stored under the static target
        const val = target[keyStr] || keyStr;
        return cleanAndValidateText(val, lang, { enableStrictLanguageMode: true });
      }
    });
  };

  return {
    en: createLanguageProxy("en"),
    hi: createLanguageProxy("hi"),
    mr: createLanguageProxy("mr"),
    "hi-en": createLanguageProxy("hi-en")
  };
}
