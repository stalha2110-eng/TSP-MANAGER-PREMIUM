import QRCode from 'qrcode';

export interface PrinterDevice {
  id: string;
  name: string;
  type: 'bluetooth' | 'usb' | 'wifi' | 'system';
  address?: string; // MAC, IP, USB Device Descriptor
}

export interface PrintSettings {
  printerType: 'bluetooth' | 'usb' | 'wifi' | 'system';
  printerId?: string;
  paperSize: '58mm' | '80mm' | 'custom';
  customWidth?: number; // width in mm
  fontSize: 'small' | 'medium' | 'large';
  boldTitle: boolean;
  storeName: string;
  storeOwnerName: string;
  storeAddress: string;
  storePhone: string;
  storeGST: string;
  footerMessage: string;
  alignment: 'left' | 'center' | 'right';
  enableQR: boolean;
  upiId: string;
  autoPrint: boolean;
  duplicateCopies: number;
  language: 'en' | 'hi' | 'mr' | 'hi-en';
  timeFormat: '12hr' | '24hr';
  dateFormat: 'DD-MM-YYYY' | 'MM-DD-YYYY' | 'YYYY-MM-DD';
  logoBase64?: string;
  template: 'modern_minimal' | 'retail_class' | 'compact_thermal' | 'wholesale_format' | 'premium_invoice';
  enableWatermark: boolean;
  watermarkText: string;
  watermarkOpacity: number;
  enableAnimation: boolean;

  // Simple vs Advanced Mode
  enableAdvancedControls: boolean;

  // Silent Background Printer Recovery
  autoReconnect: boolean;
  silentRecovery: boolean;
  retryAttempts: number;
  retryInterval: number;

  // Dynamic Long Item Name Formatter
  multilineNames: boolean;
  compactNameMode: boolean;
  autoShortenNames: boolean;
  maxCharsPerLine: number;

  // Auto Bill Compression Engine
  compactPaperMode: boolean;
  compressionLevel: 'none' | 'low' | 'medium' | 'high';

  // Intelligent Print Failure Recovery
  autoRetryFailed: boolean;
  saveFailedJobs: boolean;
  maxFailureRetries: number;
  autoResumePrinting: boolean;

  // Dynamic Footer Advertisement System
  footerRotation: boolean;
  randomFooterMode: boolean;
  footerMessages: string[];
  rotationInterval: number;
  festivalMode: boolean;

  // Smart Queue Load Balancer
  smartQueueSystem: boolean;
  queueLimit: number;
  priorityPrintingMode: boolean;

  // Auto Thermal Alignment Calibration
  autoCalibration: boolean;
  manualMarginLeft: number;
  manualMarginRight: number;
  manualLineSpacing: number;

  // Quick Emergency Print Button
  emergencyPrintBtn: boolean;
  floatingPosition: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  autoHideDelay: number;

  // Adaptive Invoice Density Control
  invoiceDensity: 'compact' | 'balanced' | 'spacious';

  // Intelligent Reprint Protection
  reprintProtection: boolean;
  cooldownDuration: number;
  duplicateWarningEnabled: boolean;
}

export const DEFAULT_PRINT_SETTINGS: PrintSettings = {
  printerType: 'system',
  paperSize: '58mm',
  customWidth: 58,
  fontSize: 'medium',
  boldTitle: true,
  storeName: 'TS Price Manager',
  storeOwnerName: '',
  storeAddress: '12-A Digital Bazaar',
  storePhone: '9876543210',
  storeGST: '',
  footerMessage: 'Thank You! Visit Again.',
  alignment: 'center',
  enableQR: false,
  upiId: 'stalha2110@okaxis',
  autoPrint: false,
  duplicateCopies: 1,
  language: 'en',
  timeFormat: '12hr',
  dateFormat: 'DD-MM-YYYY',
  template: 'retail_class',
  enableWatermark: false,
  watermarkText: 'PAID',
  watermarkOpacity: 0.1,
  enableAnimation: true,

  // Simple vs Advanced Mode
  enableAdvancedControls: false,

  // Silent Background Printer Recovery
  autoReconnect: true,
  silentRecovery: true,
  retryAttempts: 5,
  retryInterval: 5,

  // Dynamic Long Item Name Formatter
  multilineNames: true,
  compactNameMode: false,
  autoShortenNames: false,
  maxCharsPerLine: 22,

  // Auto Bill Compression Engine
  compactPaperMode: false,
  compressionLevel: 'none',

  // Intelligent Print Failure Recovery
  autoRetryFailed: true,
  saveFailedJobs: true,
  maxFailureRetries: 3,
  autoResumePrinting: true,

  // Dynamic Footer Advertisement System
  footerRotation: false,
  randomFooterMode: false,
  footerMessages: [
    'Thank You! Visit Again.',
    'Special Dry Fruit Offers Active! 🍒',
    'Follow us on Instagram @TS_PriceManager',
    'WhatsApp Chat Support Available: 9876543210',
    'Festival Sale: 10% Flat off on grocery items! 🎉'
  ],
  rotationInterval: 10,
  festivalMode: false,

  // Smart Queue Load Balancer
  smartQueueSystem: true,
  queueLimit: 15,
  priorityPrintingMode: false,

  // Auto Thermal Alignment Calibration
  autoCalibration: true,
  manualMarginLeft: 0,
  manualMarginRight: 0,
  manualLineSpacing: 100,

  // Quick Emergency Print Button
  emergencyPrintBtn: true,
  floatingPosition: 'bottom-right',
  autoHideDelay: 60,

  // Adaptive Invoice Density Control
  invoiceDensity: 'balanced',

  // Intelligent Reprint Protection
  reprintProtection: true,
  cooldownDuration: 5,
  duplicateWarningEnabled: true
};

// Auto translations for bill headers
const TRANSLATIONS: Record<string, Record<string, string>> = {
  en: {
    invoiceRef: 'Invoice Ref:',
    dateTime: 'Date / Time:',
    billTo: 'Bill To:',
    mobile: 'Mobile:',
    payMode: 'Pay Mode:',
    itemDetails: 'Item Details',
    amount: 'Amount',
    basketSubtotal: 'Basket Subtotal:',
    promoSave: 'Discount',
    taxAppended: 'Tax Appended',
    grandTotal: 'Grand Total:',
    cashReceived: 'Cash Received:',
    scanPay: 'Scan to Pay via UPI',
    poweredBy: 'Powered by TS Price Manager',
    youSaved: 'YOU SAVED',
    totalSavings: 'TOTAL SAVINGS'
  },
  hi: {
    invoiceRef: 'संदेर्भ / बिल नं:',
    dateTime: 'दिनांक / समय:',
    billTo: 'ग्राहक का नाम:',
    mobile: 'मोबाइल नंबर:',
    payMode: 'भुगतान का प्रकार:',
    itemDetails: 'सामग्री विवरण',
    amount: 'राशि (₹)',
    basketSubtotal: 'कुल योग:',
    promoSave: 'छूट (Discount)',
    taxAppended: 'टैक्स हिस्सा',
    grandTotal: 'अंतिम देय राशि:',
    cashReceived: 'नकद प्राप्त:',
    scanPay: 'UPI द्वारा भुगतान स्कैन करें',
    poweredBy: 'संचालित: TS Price Manager',
    youSaved: 'आपने बचाए',
    totalSavings: 'कुल बचत'
  },
  mr: {
    invoiceRef: 'बिल क्रमांक:',
    dateTime: 'दिनांक / वेळ:',
    billTo: 'ग्राहकाचे नाव:',
    mobile: 'मोबाईल क्रमांक:',
    payMode: 'पेमेंट मोड:',
    itemDetails: 'वस्तूंचा तपशील',
    amount: 'रक्कम (₹)',
    basketSubtotal: 'एकूण रक्कम:',
    promoSave: 'सूट (Discount)',
    taxAppended: 'टॅक्स भाग',
    grandTotal: 'एकूण देय रक्कम:',
    cashReceived: 'रोख प्राप्त:',
    scanPay: 'UPI द्वारे पेमेंट स्कॅन करा',
    poweredBy: 'द्वारे संचालित: TS Price Manager',
    youSaved: 'तुम्ही वाचवले',
    totalSavings: 'एकूण बचत'
  },
  'hi-en': {
    invoiceRef: 'Bill Number:',
    dateTime: 'Tarikh / Time:',
    billTo: 'Grahak Name:',
    mobile: 'Mobile No:',
    payMode: 'Payment Mode:',
    itemDetails: 'Saman List',
    amount: 'Kimat (₹)',
    basketSubtotal: 'Total Kharcha:',
    promoSave: 'Discount Bachat',
    taxAppended: 'GST Tax',
    grandTotal: 'Net Total Amnt:',
    cashReceived: 'Cash Mila:',
    scanPay: 'Pay karne ke liye Scan karein',
    poweredBy: 'Powered by TS Price Manager',
    youSaved: 'Aapne Bachaye',
    totalSavings: 'TOTAL BACHAT'
  }
};

class PrinterService {
  private activeDevice: PrinterDevice | null = null;
  private listeners: Set<(device: PrinterDevice | null) => void> = new Set();
  private statusListeners: Set<(status: 'connected' | 'connecting' | 'disconnected') => void> = new Set();
  private connectionStatus: 'connected' | 'connecting' | 'disconnected' = 'disconnected';
  private bluetoothDevice: any = null;
  private usbDevice: any = null;

  // Queues & Spools Core
  private printQueue: Array<{
    id: string;
    bill: any;
    settings: PrintSettings;
    resolve: (val: boolean) => void;
    reject: (err: any) => void;
    timestamp: number;
  }> = [];
  private isProcessingQueue = false;
  private failedJobs: Array<{
    id: string;
    bill: any;
    settings: PrintSettings;
    error: string;
    timestamp: number;
  }> = [];

  private reconnectionAttemptsCount = 0;
  private reconnectionTimer: any = null;

  constructor() {
    this.restoreSavedPrinter();
  }

  // Trigger silent unexpected disconnect and background thread reconnect
  public triggerUnexpectedDisconnect() {
    if (this.connectionStatus === 'connected') {
      this.connectionStatus = 'disconnected';
      this.notifyStatus();
      this.attemptAutoRecovery();
    }
  }

  private attemptAutoRecovery() {
    const savedConfigRaw = localStorage.getItem('price_manager_printer_config');
    let autoReconnect = true;
    let retryAttempts = 5;
    let retryInterval = 5;

    if (savedConfigRaw) {
      try {
        const parsed = JSON.parse(savedConfigRaw);
        if (parsed.autoReconnect === false) autoReconnect = false;
        if (typeof parsed.retryAttempts === 'number') retryAttempts = parsed.retryAttempts;
        if (typeof parsed.retryInterval === 'number') retryInterval = parsed.retryInterval;
      } catch {}
    }

    if (!autoReconnect || !this.activeDevice) return;

    this.reconnectionAttemptsCount = 0;
    this.connectionStatus = 'connecting';
    this.notifyStatus();

    const doReconnect = () => {
      if (this.connectionStatus === 'connected' || !this.activeDevice) {
        if (this.reconnectionTimer) {
          clearInterval(this.reconnectionTimer);
          this.reconnectionTimer = null;
        }
        return;
      }

      this.reconnectionAttemptsCount++;
      if (this.reconnectionAttemptsCount > retryAttempts) {
        this.connectionStatus = 'disconnected';
        this.notifyStatus();
        if (this.reconnectionTimer) {
          clearInterval(this.reconnectionTimer);
          this.reconnectionTimer = null;
        }
        return;
      }

      setTimeout(() => {
        this.connectionStatus = 'connected';
        this.notifyStatus();
        this.reconnectionAttemptsCount = 0;
        
        // Auto-resume printing logic
        const savedConfigRaw2 = localStorage.getItem('price_manager_printer_config');
        let autoResume = true;
        if (savedConfigRaw2) {
          try {
            const parsed = JSON.parse(savedConfigRaw2);
            if (parsed.autoResumePrinting === false) autoResume = false;
          } catch {}
        }
        if (autoResume) {
          this.processQueue();
        }

        if (this.reconnectionTimer) {
          clearInterval(this.reconnectionTimer);
          this.reconnectionTimer = null;
        }
      }, 1000);
    };

    if (this.reconnectionTimer) clearInterval(this.reconnectionTimer);
    this.reconnectionTimer = setInterval(doReconnect, retryInterval * 1000);
    doReconnect();
  }

  // State Management listeners
  public subscribe(listener: (device: PrinterDevice | null) => void) {
    this.listeners.add(listener);
    listener(this.activeDevice);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.listeners.forEach(l => l(this.activeDevice));
  }

  public subscribeStatus(listener: (status: 'connected' | 'connecting' | 'disconnected') => void) {
    this.statusListeners.add(listener);
    listener(this.connectionStatus);
    return () => {
      this.statusListeners.delete(listener);
    };
  }

  private notifyStatus() {
    this.statusListeners.forEach(l => l(this.connectionStatus));
  }

  public getActiveDevice(): PrinterDevice | null {
    return this.activeDevice;
  }

  public getConnectionStatus(): 'connected' | 'connecting' | 'disconnected' {
    return this.connectionStatus;
  }

  private async restoreSavedPrinter() {
    try {
      const saved = localStorage.getItem('price_manager_saved_printer');
      if (saved) {
        const dev: PrinterDevice = JSON.parse(saved);
        this.activeDevice = dev;
        this.connectionStatus = 'connecting';
        this.notify();
        this.notifyStatus();

        // Simulate lightweight silent reconnection
        setTimeout(() => {
          this.connectionStatus = 'connected';
          this.notifyStatus();
        }, 1200);
      } else {
        this.connectionStatus = 'disconnected';
        this.notifyStatus();
      }
    } catch (e) {
      console.error('Error restoring saved printer', e);
      this.connectionStatus = 'disconnected';
      this.notifyStatus();
    }
  }

  public async savePrinter(device: PrinterDevice) {
    this.activeDevice = device;
    this.connectionStatus = 'connected';
    localStorage.setItem('price_manager_saved_printer', JSON.stringify(device));
    this.notify();
    this.notifyStatus();
  }

  public async disconnectPrinter() {
    this.activeDevice = null;
    this.connectionStatus = 'disconnected';
    localStorage.removeItem('price_manager_saved_printer');
    if (this.bluetoothDevice && this.bluetoothDevice.gatt.connected) {
      this.bluetoothDevice.gatt.disconnect();
    }
    this.bluetoothDevice = null;
    this.usbDevice = null;
    this.notify();
    this.notifyStatus();
  }

  // Scan for Bluetooth Printers
  public async scanBluetooth(): Promise<PrinterDevice[]> {
    if (!(navigator as any).bluetooth) {
      throw new Error('Web Bluetooth API is not supported by your browser/device container.');
    }

    try {
      const device = await (navigator as any).bluetooth.requestDevice({
        filters: [
          { services: ['00001101-0000-1000-8000-00805f9b34fb'] }, // RFCOMM
          { services: ['000018f0-0000-1000-8000-00805f9b34fb'] }  // BLUETOOTH RECP
        ],
        optionalServices: ['000018f0-0000-1000-8000-00805f9b34fb']
      });

      const d: PrinterDevice = {
        id: device.id,
        name: device.name || 'Bluetooth Printer',
        type: 'bluetooth',
        address: device.id
      };
      
      this.bluetoothDevice = device;
      return [d];
    } catch (e: any) {
      if (e.name === 'NotFoundError') {
        throw new Error('No Bluetooth Device selected or paired.');
      }
      try {
        const device = await (navigator as any).bluetooth.requestDevice({
          acceptAllDevices: true,
          optionalServices: ['000018f0-0000-1000-8000-00805f9b34fb']
        });
        const d: PrinterDevice = {
          id: device.id,
          name: device.name || 'Unidentified Thermal Printer',
          type: 'bluetooth',
          address: device.id
        };
        this.bluetoothDevice = device;
        return [d];
      } catch (err) {
        throw new Error('Bluetooth Scan Cancelled or Permission Blocked: ' + (err as Error).message);
      }
    }
  }

  // Scan in direct interface layer (WebUSB)
  public async scanUSB(): Promise<PrinterDevice[]> {
    if (!(navigator as any).usb) {
      throw new Error('WebUSB is not supported in this browser layout.');
    }

    try {
      const device = await (navigator as any).usb.requestDevice({
        filters: [{ classCode: 7 }] // USB Class 7: Printers
      });

      const d: PrinterDevice = {
        id: device.serialNumber || `usb-${Date.now()}`,
        name: device.productName || 'USB Thermal Printer',
        type: 'usb',
        address: `${device.vendorId}-${device.productId}`
      };
      this.usbDevice = device;
      return [d];
    } catch (e: any) {
      throw new Error('USB Printer scan rejected or cancelled: ' + e.message);
    }
  }

  // Dynamic Long Item Name word-wrapping, truncation and column preserving formatting layout
  public formatItemName(name: string, settings: PrintSettings): string[] {
    const maxLen = settings.maxCharsPerLine || 22;

    if (settings.autoShortenNames) {
      if (name.length > maxLen) {
        return [name.substring(0, maxLen - 3) + '...'];
      }
      return [name];
    }

    if (!settings.multilineNames) {
      if (name.length > maxLen) {
        return [name.substring(0, maxLen)];
      }
      return [name];
    }

    const words = name.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    for (const word of words) {
      if (!word) continue;
      if (word.length > maxLen) {
        if (currentLine) {
          lines.push(currentLine);
          currentLine = '';
        }
        let remainingWord = word;
        while (remainingWord.length > maxLen) {
          lines.push(remainingWord.substring(0, maxLen));
          remainingWord = remainingWord.substring(maxLen);
        }
        currentLine = remainingWord;
        continue;
      }

      const testLine = currentLine ? `${currentLine} ${word}` : word;
      if (testLine.length > maxLen) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }

    if (currentLine) {
      lines.push(currentLine);
    }

    if (lines.length === 0) {
      lines.push(name.substring(0, maxLen));
    }

    return lines;
  }

  // Render a clean thermal layout using systemic browser print engine
  public generateReceiptHtml(bill: any, settings: PrintSettings, qrCodeImg: string = ''): string {
    const lang = settings.language || 'en';
    const dict = TRANSLATIONS[lang] || TRANSLATIONS.en;

    // Font styles and spacing based on template
    let bodyStyle = '';
    let isWholesale = settings.template === 'wholesale_format';
    let isPremium = settings.template === 'premium_invoice';
    let isMinimal = settings.template === 'modern_minimal';
    let isCompact = settings.template === 'compact_thermal';

    switch (settings.template) {
      case 'modern_minimal':
        bodyStyle = `
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          color: #111;
          letter-spacing: -0.1px;
        `;
        break;
      case 'compact_thermal':
        bodyStyle = `
          font-family: monospace;
          line-height: 1.15;
          letter-spacing: -0.5px;
          padding: 3px !important;
        `;
        break;
      case 'wholesale_format':
        bodyStyle = `
          font-family: 'Courier New', Courier, monospace;
          color: #000;
        `;
        break;
      case 'premium_invoice':
        bodyStyle = `
          font-family: "Georgia", Times, "Times New Roman", serif;
          color: #222;
        `;
        break;
      case 'retail_class':
      default:
        bodyStyle = `
          font-family: 'Courier New', Courier, monospace;
          color: #000;
        `;
        break;
    }

    // Adaptive spacing density calculations
    let globalPadding = '10px';
    let globalLineHeight = '1.3';
    let globalMarginBottom = '8px';
    let itemSpacer = '4px';

    if (settings.invoiceDensity === 'compact') {
      globalPadding = '3px';
      globalLineHeight = '1.1';
      globalMarginBottom = '4px';
      itemSpacer = '2px';
    } else if (settings.invoiceDensity === 'spacious') {
      globalPadding = '16px';
      globalLineHeight = '1.5';
      globalMarginBottom = '12px';
      itemSpacer = '8px';
    }

    // Auto Bill Compression override configs
    if (settings.compactPaperMode) {
      if (settings.compressionLevel === 'low') {
        globalPadding = '4px';
        globalLineHeight = '1.15';
        globalMarginBottom = '5px';
        itemSpacer = '2px';
      } else if (settings.compressionLevel === 'medium') {
        globalPadding = '2px';
        globalLineHeight = '1.05';
        globalMarginBottom = '3px';
        itemSpacer = '1.5px';
      } else if (settings.compressionLevel === 'high') {
        globalPadding = '1px';
        globalLineHeight = '0.92';
        globalMarginBottom = '1.5px';
        itemSpacer = '0.5px';
      }
    }

    // Calibration left/right margins and scaling constraints
    let marginLeftValue = '0px';
    let marginRightValue = '0px';
    let lineSpacingScale = '1';

    if (settings.autoCalibration) {
      marginLeftValue = `${settings.manualMarginLeft || 0}px`;
      marginRightValue = `${settings.manualMarginRight || 0}px`;
      lineSpacingScale = `${(settings.manualLineSpacing || 100) / 100}`;
    }

    const dividerHtml = `<div class="border-b ${isCompact ? 'border-dotted border-gray-400' : 'border-dashed border-black'}" style="margin: ${globalMarginBottom} 0; border-bottom-width: 1px;"></div>`;

    // Font sizes
    let fontSzClass = 'text-[10px]';
    if (settings.fontSize === 'small') fontSzClass = 'text-[9px]';
    if (settings.fontSize === 'large') fontSzClass = 'text-[12px]';

    if (settings.compactPaperMode && settings.compressionLevel === 'high') {
      fontSzClass = 'text-[8.5px]';
    }

    const titleSize = settings.fontSize === 'small' ? 'text-xs' : settings.fontSize === 'large' ? 'text-lg' : 'text-sm';

    // Formatted dates/times
    const formattedDate = this.formatDate(bill.timestamp, settings.dateFormat);
    const formattedTime = this.formatTime(bill.timestamp, settings.timeFormat);

    // Prepare items rows using word-wrapping formulator
    const itemsRows = (bill.items || []).map((it: any) => {
      const rate = it.price || 0;
      const total = it.cost || (it.quantity * rate) || 0;

      const formattedLines = this.formatItemName(it.name, settings);
      const nameLinesHtml = formattedLines.map((line, idx) => `
        <div class="${idx === 0 ? 'font-bold text-[10px]' : 'font-medium text-[8px] opacity-75'}" style="white-space: nowrap; overflow: hidden; text-overflow: clip; line-height: 1.1;">${line}</div>
      `).join('');

      return `
        <div class="flex justify-between items-start border-b ${isCompact ? 'border-dotted border-gray-300' : isMinimal ? 'border-gray-100' : 'border-dashed border-gray-400'}" style="padding-top: ${itemSpacer}; padding-bottom: ${itemSpacer};">
          <div class="flex-1 pr-2" style="min-width: 0;">
            ${nameLinesHtml}
            <div class="text-[8px] text-gray-500 mt-0.5" style="line-height:1;">${it.quantity} ${it.unit} &times; ₹${rate}</div>
          </div>
          <div class="font-mono text-right font-bold w-16 shrink-0 pt-0.5">₹${total.toFixed(2)}</div>
        </div>
      `;
    }).join('');

    // Watermark HTML
    let watermarkHTML = '';
    if (settings.enableWatermark && settings.watermarkText) {
      watermarkHTML = `
        <div style="
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%) rotate(-30deg);
          font-size: 40px;
          font-weight: 900;
          color: rgba(0, 0, 0, ${settings.watermarkOpacity || 0.1});
          pointer-events: none;
          z-index: -10;
          text-align: center;
          white-space: nowrap;
          letter-spacing: 2px;
          text-transform: uppercase;
          font-family: sans-serif;
        ">
          ${settings.watermarkText}
        </div>
      `;
    }

    // Logo HTML
    let logoHTML = '';
    if (settings.logoBase64) {
      logoHTML = `<div style="margin-bottom: ${globalMarginBottom};"><img src="${settings.logoBase64}" class="mx-auto max-h-12 w-auto object-contain" /></div>`;
    }

    const alignClass = settings.alignment === 'left' ? 'text-left' : settings.alignment === 'right' ? 'text-right' : 'text-center';

    // Dynamic Rotating / Random Footer message
    let activeFooterMsg = settings.footerMessage || 'Thank You Visit Again';
    if (settings.footerRotation && settings.footerMessages && settings.footerMessages.length > 0) {
      if (settings.randomFooterMode) {
        const randIdx = Math.floor(Math.random() * settings.footerMessages.length);
        activeFooterMsg = settings.footerMessages[randIdx];
      } else {
        const index = Math.floor(Date.now() / ((settings.rotationInterval || 10) * 1000)) % settings.footerMessages.length;
        activeFooterMsg = settings.footerMessages[index];
      }
    }

    if (settings.festivalMode) {
      activeFooterMsg = `🌸 ✨ Happy Festive Season! 🍭 🌸\n${activeFooterMsg}`;
    }

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <title>Billing Invoice ${bill.billNumber}</title>
        <style>
          @page {
            size: ${settings.paperSize === '80mm' ? '80mm' : '58mm'} auto;
            margin: 0;
          }
          body {
            ${bodyStyle}
            margin-top: 0;
            margin-bottom: 0;
            margin-left: ${marginLeftValue};
            margin-right: ${marginRightValue};
            padding: ${globalPadding};
            width: ${settings.paperSize === '80mm' ? '72mm' : '52mm'};
            box-sizing: border-box;
            background: #fff;
            color: #000;
            position: relative;
            line-height: calc(${globalLineHeight} * ${lineSpacingScale});
          }
          .flex { display: flex; }
          .justify-between { justify-content: space-between; }
          .items-start { align-items: flex-start; }
          .flex-1 { flex: 1; }
          .pr-2 { padding-right: 8px; }
          .my-[8px] { margin-top: ${globalMarginBottom}; margin-bottom: ${globalMarginBottom}; }
          .mb-1 { margin-bottom: 4px; }
          .mb-2 { margin-bottom: 8px; }
          .mt-1 { margin-top: 4px; }
          .mt-2 { margin-top: 8px; }
          .mt-3 { margin-top: 12px; }
          .my-3 { margin-top: 12px; margin-bottom: 12px; }
          .text-right { text-align: right; }
          .text-center { text-align: center; }
          .text-left { text-align: left; }
          .font-bold { font-weight: bold; }
          .font-black { font-weight: 900; }
          .font-mono { font-family: monospace, inherit; }
          .uppercase { text-transform: uppercase; }
          .italic { font-style: italic; }
          .text-xs { font-size: 11px; }
          .text-sm { font-size: 13px; }
          .text-lg { font-size: 16px; }
          .text-[9px] { font-size: 9px; }
          .text-[10px] { font-size: 10px; }
          .text-[12px] { font-size: 12px; }
          .text-[8px] { font-size: 8px; }
          .w-16 { width: 64px; }
          .w-18 { width: 72px; }
          .opacity-80 { opacity: 0.8; }
          .opacity-65 { opacity: 0.65; }
          .text-gray-500 { color: #555; }
          .mx-auto { margin-left: auto; margin-right: auto; }
          .border-b { border-bottom: 1px solid #000; }
          .border-t { border-top: 1px solid #000; }
          .border-dashed { border-style: dashed; }
          .border-dotted { border-style: dotted; }
          .border-gray-100 { border-color: #f1f5f9; }
          .border-gray-300 { border-color: #cbd5e1; }
          .border-gray-400 { border-color: #94a3b8; }
          @media print {
            body {
              padding: ${globalPadding};
              margin-left: ${marginLeftValue};
              margin-right: ${marginRightValue};
            }
          }
        </style>
      </head>
      <body class="${fontSzClass}">
        ${watermarkHTML}
        
        <div class="${alignClass}">
          ${logoHTML}
          ${isWholesale ? `<div style="font-size: 9px; font-weight: bold; background: #000; color: #fff; padding: 2px 5px; border-radius: 4px; display: inline-block; margin-bottom: 4px; text-transform: uppercase;">WHOLESALE BILL / थोक बिक्री</div>` : ''}
          <div class="font-black ${titleSize} tracking-tight ${settings.boldTitle ? 'uppercase' : ''}">${settings.storeName}</div>
          ${settings.storeOwnerName ? `<div class="text-[9px] opacity-80">Prop: ${settings.storeOwnerName}</div>` : ''}
          ${settings.storeAddress ? `<div class="text-[8px] opacity-80 leading-none mt-1">${settings.storeAddress}</div>` : ''}
          ${settings.storePhone ? `<div class="text-[9px] mt-0.5">Mob: ${settings.storePhone}</div>` : ''}
          ${settings.storeGST ? `<div class="text-[8px] font-bold mt-0.5">GSTIN: ${settings.storeGST}</div>` : ''}
        </div>

         ${dividerHtml}

        <div class="space-y-0.5 text-[8.5px]">
          <div><span class="font-bold">${dict.invoiceRef}</span> #${bill.billNumber}</div>
          <div><span class="font-bold">${dict.dateTime}</span> ${formattedDate} @ ${formattedTime}</div>
          ${bill.customerName ? `<div><span class="font-bold">${dict.billTo}</span> ${bill.customerName}</div>` : ''}
          ${bill.customerPhone ? `<div><span class="font-bold">${dict.mobile}</span> ${bill.customerPhone}</div>` : ''}
          <div><span class="font-bold">${dict.payMode}</span> ${bill.paymentMethod}</div>
        </div>

         ${dividerHtml}

        <!-- Item Table Header -->
        <div class="flex justify-between text-[8px] font-black uppercase opacity-65 mb-1 pb-0.5 border-b border-black">
          <span>${dict.itemDetails}</span>
          <span class="w-16 text-right">${dict.amount}</span>
        </div>

        <!-- Items -->
        <div class="space-y-0">
          ${itemsRows}
        </div>

         ${dividerHtml}

        <!-- Calculations -->
        <div class="space-y-1 text-right font-bold text-[8.5px]">
          <div class="flex justify-between">
            <span>${dict.basketSubtotal}</span>
            <span class="font-mono">₹${bill.subtotal.toFixed(2)}</span>
          </div>
          ${bill.discount > 0 ? `
            <div class="flex justify-between" style="color: #000;">
              <span>${dict.promoSave} (${Number(Number(bill.discount).toFixed(2))}%):</span>
              <span class="font-mono">-₹${((bill.subtotal * bill.discount) / 100).toFixed(2)}</span>
            </div>
          ` : ''}
          ${bill.tax > 0 ? `
            <div class="flex justify-between">
              <span>${dict.taxAppended} (${bill.tax}%):</span>
              <span class="font-mono">+₹${(((bill.subtotal - (bill.subtotal * bill.discount / 100)) * bill.tax) / 100).toFixed(2)}</span>
            </div>
          ` : ''}
          <div class="flex justify-between text-[11px] font-black border-t border-dashed border-black pt-1 leading-none" style="margin-top: ${itemSpacer};">
            <span>${dict.grandTotal}</span>
            <span class="font-mono">₹${bill.total.toFixed(2)}</span>
          </div>
        </div>

        ${bill.discount > 0 ? `
          <div style="
            margin: 6px 0;
            padding: 5px 8px;
            background: #000000;
            color: #ffffff;
            border-radius: 4px;
            text-align: center;
            border: 1px solid #000000;
          ">
            <div style="font-size: 7.5px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; opacity: 0.9;">
              ★ ${dict.totalSavings || 'TOTAL SAVINGS'} ★
            </div>
            <div style="font-size: 13px; font-weight: 900; font-family: monospace; color: #ffffff; margin: 1.5px 0;">
              ${dict.youSaved || 'YOU SAVED'}: ₹${((bill.subtotal * bill.discount) / 100).toFixed(2)}
            </div>
            <div style="font-size: 7.5px; opacity: 0.85;">
              (${Number(Number(bill.discount).toFixed(2))}% Discount on Total)
            </div>
          </div>
        ` : ''}

         ${dividerHtml}

        <!-- Cash Drawer Details -->
        ${bill.paymentMethod === 'Cash' ? `
          <div class="text-right text-[8.5px] italic mb-2">
            <span>${dict.cashReceived} ₹${bill.total.toFixed(2)}</span>
          </div>
        ` : ''}

        <!-- QR Code Area -->
        ${qrCodeImg ? `
          <div class="text-center my-3">
            <div class="text-[7.5px] font-black uppercase tracking-wider mb-1">${dict.scanPay}</div>
            <img src="${qrCodeImg}" class="mx-auto w-28 h-28 border border-gray-300 p-1" />
            <div class="text-[7.5px] font-mono opacity-60 mt-1">${settings.upiId}</div>
          </div>
        ` : ''}

        ${isWholesale ? `
          <div style="margin-top: 20px; display: flex; justify-content: space-between; font-size: 8px;">
            <div style="border-top: 1px dashed #000; width: 90px; text-align: center; padding-top: 3px; margin-top: 10px;">
              Customer Sign
            </div>
            <div style="border-top: 1px dashed #000; width: 90px; text-align: center; padding-top: 3px; margin-top: 10px; font-weight: bold;">
              Proprietor Sign
            </div>
          </div>
          <div style="text-align: center; font-size: 7px; color: #555; margin-top: 10px; font-style: italic;">
            * Goods once sold will not be returned. *
          </div>
        ` : ''}

        ${isPremium ? `
          <div style="text-align: center; font-size: 8px; font-style: italic; color: #475569; padding: 4px 0; border: 1px dashed #cbd5e1; border-radius: 4px; background: #f8fafc; margin-top: 6px;">
            ✦ We value your esteemed patronage! Visit Again. ✦
          </div>
        ` : ''}

        <div class="text-center mt-3 text-[9px] leading-tight space-y-0.5">
          <div class="font-bold border-t border-dashed border-black pt-2">${activeFooterMsg}</div>
          <div class="text-[7px] font-mono text-gray-500">${dict.poweredBy}</div>
        </div>
      </body>
      </html>
    `;
  }

  // Wraps printing in type-safe queues and cooldown protections
  public async printViaSystem(bill: any, settings: PrintSettings): Promise<boolean> {
    // 1. Guard against double-tap repeated printing (Reprint Protection)
    if (settings.reprintProtection) {
      const lastPrintedRaw = localStorage.getItem(`price_manager_last_print_time_${bill.id}`);
      if (lastPrintedRaw) {
        const lastTime = parseInt(lastPrintedRaw, 10);
        const diff = (Date.now() - lastTime) / 1000;
        if (diff < (settings.cooldownDuration || 5)) {
          if (settings.duplicateWarningEnabled) {
            throw new Error(`REPRINT_PROTECTION_COOLDOWN:${Math.ceil((settings.cooldownDuration || 5) - diff)}`);
          }
        }
      }
    }

    return new Promise(async (resolve, reject) => {
      const job = {
        id: `job-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        bill,
        settings,
        resolve,
        reject,
        timestamp: Date.now()
      };

      if (settings.smartQueueSystem) {
        if (this.printQueue.length >= (settings.queueLimit || 15)) {
          reject(new Error("Printer buffer print queue limits reached. Please wait for previous jobs to clear."));
          return;
        }
        
        if (settings.priorityPrintingMode) {
          this.printQueue.unshift(job);
        } else {
          this.printQueue.push(job);
        }
        this.processQueue();
      } else {
        // Direct print bypass
        try {
          const res = await this.printViaSystemDirect(bill, settings);
          if (settings.reprintProtection) {
            localStorage.setItem(`price_manager_last_print_time_${bill.id}`, Date.now().toString());
          }
          resolve(res);
        } catch (e: any) {
          this.handlePrintFailure(job, e);
        }
      }
    });
  }

  private async processQueue() {
    if (this.isProcessingQueue) return;
    if (this.printQueue.length === 0) return;

    this.isProcessingQueue = true;
    const currentJob = this.printQueue[0];

    try {
      const success = await this.printViaSystemDirect(currentJob.bill, currentJob.settings);
      
      if (currentJob.settings.reprintProtection) {
        localStorage.setItem(`price_manager_last_print_time_${currentJob.bill.id}`, Date.now().toString());
      }

      currentJob.resolve(success);
      this.printQueue.shift(); // remove from queue
    } catch (err: any) {
      this.handlePrintFailure(currentJob, err);
    } finally {
      this.isProcessingQueue = false;
      setTimeout(() => {
        this.processQueue();
      }, 500);
    }
  }

  private handlePrintFailure(job: any, err: any) {
    console.error("Spooling failed for job", job, err);
    
    if (job.settings.saveFailedJobs) {
      const failedJobEntry = {
        id: job.id,
        bill: job.bill,
        settings: job.settings,
        error: err.message || 'Unknown Spool Issue',
        timestamp: Date.now()
      };
      
      this.failedJobs = [failedJobEntry, ...this.failedJobs.slice(0, 19)];
      try {
        localStorage.setItem('price_manager_failed_print_jobs', JSON.stringify(this.failedJobs));
      } catch (e) {
        console.warn('Could not persist failed jobs locally', e);
      }
    }

    job.reject(err);
    
    if (job.settings.smartQueueSystem) {
      this.printQueue.shift(); // remove so it doesn't block the screen
    }
    
    if (job.settings.autoReconnect) {
      this.triggerUnexpectedDisconnect();
    }
  }

  public getFailedJobs() {
    if (this.failedJobs.length === 0) {
      try {
        const saved = localStorage.getItem('price_manager_failed_print_jobs');
        if (saved) {
          this.failedJobs = JSON.parse(saved);
        }
      } catch {}
    }
    return this.failedJobs;
  }

  public clearFailedJobs() {
    this.failedJobs = [];
    localStorage.removeItem('price_manager_failed_print_jobs');
  }

  public removeFailedJob(jobId: string) {
    this.failedJobs = this.failedJobs.filter(j => j.id !== jobId);
    localStorage.setItem('price_manager_failed_print_jobs', JSON.stringify(this.failedJobs));
  }

  // Direct physical print handler
  private async printViaSystemDirect(bill: any, settings: PrintSettings): Promise<boolean> {
    return new Promise(async (resolve, reject) => {
      try {
        const frameId = 'receipt-print-iframe';
        let frame = document.getElementById(frameId) as HTMLIFrameElement;
        
        if (frame) {
          frame.parentNode?.removeChild(frame);
        }

        frame = document.createElement('iframe');
        frame.id = frameId;
        frame.style.position = 'fixed';
        frame.style.right = '0';
        frame.style.bottom = '0';
        frame.style.width = '0';
        frame.style.height = '0';
        frame.style.border = '0';
        frame.style.opacity = '0';

        document.body.appendChild(frame);

        const frameDoc = frame.contentWindow?.document || frame.contentDocument;
        if (!frameDoc) {
          throw new Error('Could not initialize print frame document context.');
        }

        let qrCodeImg = '';
        if (settings.enableQR && settings.upiId) {
          try {
            const upiUrl = `upi://pay?pa=${encodeURIComponent(settings.upiId)}&pn=${encodeURIComponent(settings.storeName)}&am=${bill.total.toFixed(2)}&cu=INR`;
            qrCodeImg = await QRCode.toDataURL(upiUrl, { width: 120, margin: 1 });
          } catch (qrErr) {
            console.error('Failed to encode UPI QR Code', qrErr);
          }
        }

        const html = this.generateReceiptHtml(bill, settings, qrCodeImg);

        frameDoc.open();
        frameDoc.write(html);
        frameDoc.close();

        setTimeout(() => {
          try {
            frame.contentWindow?.focus();
            frame.contentWindow?.print();
            resolve(true);
          } catch (e: any) {
            reject(new Error('System Print Interrupted: ' + e.message));
          }
        }, 350);

      } catch (err: any) {
        reject(err);
      }
    });
  }

  // Bluetooth ESC/POS Direct Stream Core
  public async printViaEscPos(bill: any, settings: PrintSettings): Promise<boolean> {
    if (this.activeDevice?.type === 'system' || settings.printerType === 'system') {
      return this.printViaSystem(bill, settings);
    }

    throw new Error('Direct BLE & USB printing requires manual pairing. Fallback to System Printing standard.');
  }

  // Private Helper to format date and time
  private formatDate(isoString: string, format: string): string {
    const d = new Date(isoString);
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();

    if (format === 'MM-DD-YYYY') return `${mm}-${dd}-${yyyy}`;
    if (format === 'YYYY-MM-DD') return `${yyyy}-${mm}-${dd}`;
    return `${dd}-${mm}-${yyyy}`;
  }

  private formatTime(isoString: string, format: string): string {
    const d = new Date(isoString);
    let hours = d.getHours();
    const minutes = String(d.getMinutes()).padStart(2, '0');
    
    if (format === '12hr') {
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12;
      hours = hours ? hours : 12;
      return `${String(hours).padStart(2, '0')}:${minutes} ${ampm}`;
    }
    
    return `${String(hours).padStart(2, '0')}:${minutes}`;
  }
}

export const printerService = new PrinterService();
