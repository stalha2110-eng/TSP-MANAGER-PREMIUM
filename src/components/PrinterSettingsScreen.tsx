import React, { useState, useEffect, useRef } from 'react';
import { 
  Printer, Bluetooth, Usb, Wifi, Check, Trash2, Plus, 
  Languages, Image as ImageIcon, Clock, AlignLeft, AlignCenter, 
  AlignRight, RefreshCw, AlertTriangle, Eye, ShieldCheck, CreditCard, 
  Sliders, Settings2
} from 'lucide-react';
import { AppState } from '../types';
import { printerService, DEFAULT_PRINT_SETTINGS, PrintSettings, PrinterDevice } from '../services/printerService';
import { cn } from '../lib/utils';

interface PrinterSettingsScreenProps {
  state: AppState;
  t: any;
  onUpdateState: (updates: any) => void;
}

export default function PrinterSettingsScreen({ state, t, onUpdateState }: PrinterSettingsScreenProps) {
  // Read saved settings or fallback to defaults
  const [printSettings, setPrintSettings] = useState<PrintSettings>(() => {
    const saved = localStorage.getItem('price_manager_printer_config');
    if (saved) {
      try {
        return { ...DEFAULT_PRINT_SETTINGS, ...JSON.parse(saved) };
      } catch (e) {
        return DEFAULT_PRINT_SETTINGS;
      }
    }
    return DEFAULT_PRINT_SETTINGS;
  });

  const [activeDevice, setActiveDevice] = useState<PrinterDevice | null>(null);
  const [scanResults, setScanResults] = useState<PrinterDevice[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [customIP, setCustomIP] = useState('');

  // Subscribe to printer connectivity status
  useEffect(() => {
    const unsub = printerService.subscribe((dev) => {
      setActiveDevice(dev);
    });
    return () => unsub();
  }, []);

  // Save changes to localStorage and push to global app settings state if available
  const updateConfig = (updates: Partial<PrintSettings>) => {
    const next = { ...printSettings, ...updates };
    setPrintSettings(next);
    localStorage.setItem('price_manager_printer_config', JSON.stringify(next));

    // Clear messages
    setErrorMessage(null);
    setSuccessMessage(null);
    
    // Provide haptic vibration feed
    if (navigator.vibrate) {
      navigator.vibrate(15);
    }
  };

  const clearMessagesAfterDelay = () => {
    setTimeout(() => {
      setErrorMessage(null);
      setSuccessMessage(null);
    }, 4500);
  };

  // Bluetooth scanning
  const handleScanBluetooth = async () => {
    setIsScanning(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const devices = await printerService.scanBluetooth();
      setScanResults(devices);
      if (devices.length > 0) {
        setSuccessMessage(`Found device: ${devices[0].name}. Saving connection!`);
        await printerService.savePrinter(devices[0]);
        updateConfig({ printerType: 'bluetooth', printerId: devices[0].id });
      }
    } catch (e: any) {
      setErrorMessage(e.message || 'Bluetooth initialization failed. Pair device manually.');
    } finally {
      setIsScanning(false);
      clearMessagesAfterDelay();
    }
  };

  // USB scan
  const handleScanUSB = async () => {
    setIsScanning(true);
    setErrorMessage(null);
    try {
      const devices = await printerService.scanUSB();
      setScanResults(devices);
      if (devices.length > 0) {
        setSuccessMessage(`Detected USB device: ${devices[0].name}.`);
        await printerService.savePrinter(devices[0]);
        updateConfig({ printerType: 'usb', printerId: devices[0].id });
      }
    } catch (e: any) {
      setErrorMessage(e.message || 'No compatible USB printers matched.');
    } finally {
      setIsScanning(false);
      clearMessagesAfterDelay();
    }
  };

  // WiFi printer custom addition
  const handleAddWifi = () => {
    if (!customIP.trim()) {
      setErrorMessage('Please specify an IP address or host name.');
      return;
    }
    const dev: PrinterDevice = {
      id: `wifi-${Date.now()}`,
      name: `IP Printer: ${customIP}`,
      type: 'wifi',
      address: customIP
    };
    printerService.savePrinter(dev);
    updateConfig({ printerType: 'wifi', printerId: dev.id });
    setSuccessMessage(`WiFi Network Printer registered at ${customIP}.`);
    setCustomIP('');
    clearMessagesAfterDelay();
  };

  // Connect local system default printing (seamless hybrid route)
  const handleSelectSystem = () => {
    const dev: PrinterDevice = {
      id: 'system-default',
      name: 'System Print / Local PDF Engine',
      type: 'system'
    };
    printerService.savePrinter(dev);
    updateConfig({ printerType: 'system', printerId: dev.id });
    setSuccessMessage('Standard System Printer Layer selected successfully.');
    clearMessagesAfterDelay();
  };

  // Store Logo Upload & Processing Refs/Handlers
  const logoFileInputRef = useRef<HTMLInputElement>(null);
  const [isDraggingLogo, setIsDraggingLogo] = useState(false);

  // Generate crisp standard preset logo PNG for thermal receipts
  const generatePresetLogoPng = (emojiOrSymbol: string, title: string) => {
    const canvas = document.createElement('canvas');
    canvas.width = 240;
    canvas.height = 120;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 240, 120);
    
    // Draw Icon
    ctx.font = '48px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(emojiOrSymbol, 120, 48);
    
    // Draw Title
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText(title.toUpperCase(), 120, 95);
    
    return canvas.toDataURL('image/png');
  };

  // Robust client-side canvas compressor for any file size (even 10MB phone camera shots)
  const processImageFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setErrorMessage('Please select a valid image file (JPG, PNG, WEBP, SVG, etc.).');
      clearMessagesAfterDelay();
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 320;
        const MAX_HEIGHT = 160;
        let width = img.width;
        let height = img.height;

        if (width > MAX_WIDTH) {
          height = Math.round((height * MAX_WIDTH) / width);
          width = MAX_WIDTH;
        }
        if (height > MAX_HEIGHT) {
          width = Math.round((width * MAX_HEIGHT) / height);
          height = MAX_HEIGHT;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          // Fill crisp white background so transparency renders cleanly on thermal paper
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/png', 0.92);
          updateConfig({ logoBase64: dataUrl });
          setSuccessMessage('Store Logo graphic uploaded and optimized for thermal printing!');
          clearMessagesAfterDelay();
        } else {
          updateConfig({ logoBase64: event.target?.result as string });
          setSuccessMessage('Store Logo graphic uploaded!');
          clearMessagesAfterDelay();
        }
      };
      img.onerror = () => {
        setErrorMessage('Could not load the chosen image file. Please try another graphic.');
        clearMessagesAfterDelay();
      };
      img.src = event.target?.result as string;
    };
    reader.onerror = () => {
      setErrorMessage('Failed to read image file.');
      clearMessagesAfterDelay();
    };
    reader.readAsDataURL(file);
  };

  // Logo file upload handler
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processImageFile(file);
    }
    // Reset file input value so selecting the same file again triggers change event
    if (e.target) {
      e.target.value = '';
    }
  };

  const handleLogoDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingLogo(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processImageFile(file);
    }
  };

  const handleRemoveLogo = () => {
    updateConfig({ logoBase64: undefined });
    setSuccessMessage('Store Logo graphic removed.');
    clearMessagesAfterDelay();
  };

  // Action: Print an instant diagnostic test receipt
  const handleTestPrint = async () => {
    try {
      setErrorMessage(null);
      setSuccessMessage('Compiling and spooling test ticket...');
      
      const testBill = {
        billNumber: `TST-${Math.floor(1000 + Math.random() * 9000)}`,
        timestamp: new Date().toISOString(),
        customerName: 'Demo Cashier Check',
        customerPhone: '9988776655',
        paymentMethod: 'UPI' as const,
        subtotal: 350.00,
        discount: 10, // 10%
        tax: 18, // 18% GST append
        total: 371.70,
        items: [
          { itemId: 'demo1', name: 'Premium Cashews Grade A', quantity: 1, price: 200.00, cost: 200.00, unit: 'kg' },
          { itemId: 'demo2', name: 'Dehydrated Organic Kiwis', quantity: 1.5, price: 100.00, cost: 150.00, unit: 'kg' }
        ]
      };

      await printerService.printViaSystem(testBill, printSettings);
      setSuccessMessage('Test Receipt spooled successfully! Check print window.');
    } catch (e: any) {
      setErrorMessage(`Print Diagnostic Failed: ${e.message}`);
    } finally {
      clearMessagesAfterDelay();
    }
  };

  // State to manage adding a custom message to the rotation array
  const [newAdMessage, setNewAdMessage] = useState('');

  const handleAddAdMessage = () => {
    if (!newAdMessage.trim()) return;
    const currentList = printSettings.footerMessages || [];
    const nextList = [...currentList, newAdMessage.trim()];
    updateConfig({ footerMessages: nextList });
    setNewAdMessage('');
    setSuccessMessage('Rotating promotional banner added successfully!');
    clearMessagesAfterDelay();
  };

  const handleRemoveAdMessage = (index: number) => {
    const currentList = printSettings.footerMessages || [];
    const nextList = currentList.filter((_, idx) => idx !== index);
    updateConfig({ footerMessages: nextList });
    setSuccessMessage('Rotating promotional banner removed.');
    clearMessagesAfterDelay();
  };

  return (
    <div className="space-y-6 text-[var(--foreground)] pb-24">
      {/* Header Banner */}
      <div className="flex items-center gap-3 bg-[var(--primary)] text-white p-4 rounded-3xl shadow-md">
        <div className="h-10 w-10 bg-white/20 rounded-2xl flex items-center justify-center">
          <Printer size={20} className="animate-pulse" />
        </div>
        <div>
          <h3 className="font-extrabold text-sm uppercase tracking-wider leading-none">Universal Printing Control</h3>
          <p className="text-[10px] opacity-80 uppercase font-black tracking-widest mt-1">POS, Bluetooth, USB & Hybrid Web Layers</p>
        </div>
      </div>

      {/* 0. SIMPLE VS ADVANCED CONTROL SWITCH PANEL - User Requested */}
      <div className="flex items-center justify-between p-4 bg-[var(--foreground)]/[0.02] border-2 border-[var(--primary)]/25 rounded-2xl">
        <div className="space-y-0.5">
          <span className="text-[10.5px] font-black uppercase tracking-wider block text-[var(--primary)]">Advanced Hardware Panel</span>
          <span className="text-[8.5px] opacity-70 uppercase block font-medium">Unlock precise name splitters, auto reconnect timers, alignment calipers, and duplicate protection</span>
        </div>
        <label className="relative shrink-0 inline-flex items-center cursor-pointer select-none">
          <input 
            type="checkbox"
            id="advanced-mode-checkbox"
            checked={printSettings.enableAdvancedControls}
            onChange={(e) => updateConfig({ enableAdvancedControls: e.target.checked })}
            className="sr-only peer"
          />
          <div className="w-10 h-5.5 bg-gray-300 dark:bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[3px] after:left-[3px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4.5 after:w-4.5 after:transition-all peer-checked:bg-[var(--primary)]"></div>
        </label>
      </div>

      {/* Connection Mode alerts */}
      {errorMessage && (
        <div className="bg-rose-500/10 border-2 border-rose-500 p-4 rounded-2xl flex items-start gap-2.5">
          <AlertTriangle className="text-rose-500 shrink-0 mt-0.5" size={16} />
          <div>
            <p className="text-[11px] font-black text-rose-500 uppercase leading-none">Operation Blocked</p>
            <p className="text-[10px] opacity-90 mt-1 font-mono tracking-tight">{errorMessage}</p>
          </div>
        </div>
      )}

      {successMessage && (
        <div className="bg-emerald-500/10 border-2 border-emerald-500 p-4 rounded-2xl flex items-start gap-2.5">
          <Check className="text-emerald-500 shrink-0 mt-0.5" size={16} />
          <div>
            <p className="text-[11px] font-black text-emerald-500 uppercase leading-none">Completed</p>
            <p className="text-[10px] opacity-90 mt-1">{successMessage}</p>
          </div>
        </div>
      )}

      {/* 1. CONNECT PRINTER PANEL - ALWAYS SHOW */}
      <div className="border border-[var(--border)] rounded-2xl p-4 bg-[var(--foreground)]/[0.01] space-y-4">
        <div className="flex items-center gap-2 border-b border-[var(--border)] pb-2">
          <Settings2 size={15} className="text-[var(--primary)]" />
          <h4 className="font-black text-xs uppercase tracking-wider">Configure Hardware Node</h4>
        </div>

        {/* Saved connection status indicator */}
        <div className="p-3.5 bg-[var(--foreground)]/[0.03] border border-[var(--border)] rounded-xl flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[8.5px] font-black uppercase text-[var(--foreground)] opacity-55 block">Active Output Port</span>
            <div className="font-mono text-xs font-black flex items-center gap-1.5">
              <span className={`h-2.5 w-2.5 rounded-full ${activeDevice ? 'bg-emerald-500' : 'bg-amber-500'} inline-block`}></span>
              {activeDevice ? activeDevice.name : 'Virtual System Print Fallback'}
            </div>
            {activeDevice?.address && (
              <span className="text-[9px] font-mono opacity-50 block tracking-wider">Address UUID: {activeDevice.address}</span>
            )}
          </div>
          {activeDevice && (
            <button 
              id="unpair-printer-btn"
              onClick={() => printerService.disconnectPrinter()}
              className="px-3 py-1.5 rounded-xl border border-rose-500/30 text-rose-500 text-[9px] font-black uppercase tracking-wider hover:bg-rose-500/10 transition-all cursor-pointer"
            >
              Unpair
            </button>
          )}
        </div>

        {/* Scan & Add triggers */}
        <div className="grid grid-cols-2 gap-2">
          <button 
            type="button"
            id="scan-bluetooth-btn"
            onClick={handleScanBluetooth}
            disabled={isScanning}
            className="flex items-center justify-center gap-2 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--foreground)]/[0.02] hover:bg-[var(--foreground)]/[0.05] text-[10px] font-black uppercase tracking-wider transition-all disabled:opacity-45 cursor-pointer"
          >
            <Bluetooth size={14} className="text-sky-500 shrink-0" />
            Scan Bluetooth
          </button>

          <button 
            type="button"
            id="scan-usb-btn"
            onClick={handleScanUSB}
            disabled={isScanning}
            className="flex items-center justify-center gap-2 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--foreground)]/[0.02] hover:bg-[var(--foreground)]/[0.05] text-[10px] font-black uppercase tracking-wider transition-all disabled:opacity-45 cursor-pointer"
          >
            <Usb size={14} className="text-amber-500 shrink-0" />
            Detect USB / OTG
          </button>
        </div>

        {/* Wifi Configuration manually */}
        <div className="space-y-2 border-t border-[var(--border)] pt-3">
          <span className="text-[9px] font-black uppercase opacity-65">Wireless Network Printer (IP-based)</span>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Wifi className="absolute left-3 top-2.5 text-gray-500" size={13} />
              <input 
                type="text"
                id="wifi-ip-input"
                placeholder="e.g. 192.168.1.100"
                value={customIP}
                onChange={(e) => setCustomIP(e.target.value)}
                className="w-full pl-8 pr-3 py-2 text-xs rounded-xl border border-[var(--border)] bg-transparent font-mono placeholder:opacity-50 text-[var(--foreground)] outline-none"
              />
            </div>
            <button 
              id="register-wifi-btn"
              onClick={handleAddWifi}
              className="px-3.5 rounded-xl bg-[var(--primary)] text-white text-[9px] font-black uppercase tracking-widest hover:opacity-90 cursor-pointer"
            >
              Register
            </button>
          </div>
        </div>

        {/* Reset / Standard print trigger link */}
        <div className="border-t border-[var(--border)] pt-3 text-center">
          <button 
            id="apply-system-layer-btn"
            onClick={handleSelectSystem}
            className="text-[9.5px] font-black text-[var(--primary)] hover:underline uppercase tracking-wider block mx-auto cursor-pointer"
          >
            🔄 Apply Standard Hybrid System Print Layer (Universal)
          </button>
        </div>
      </div>

      {/* 2. PRINT FORMAT SPECS (Paper size, template, live preview, watermark, language) - ESSENTIAL */}
      <div className="border border-[var(--border)] rounded-2xl p-4 bg-[var(--foreground)]/[0.01] space-y-4">
        <div className="flex items-center gap-2 border-b border-[var(--border)] pb-2">
          <Sliders size={15} className="text-[var(--primary)]" />
          <h4 className="font-black text-xs uppercase tracking-wider">Format, Templates & Preview</h4>
        </div>

        {/* A. Roll Invoice Template Selection - ALWAYS SHOW */}
        <div className="space-y-2">
          <label className="text-[9px] font-black uppercase tracking-wider block opacity-70">Invoice Template Options</label>
          <div className="grid grid-cols-2 gap-1.5">
            {[
              { id: 'modern_minimal', label: 'Modern Minimal' },
              { id: 'retail_class', label: 'Retail Classic' },
              { id: 'compact_thermal', label: 'Compact Thermal' },
              { id: 'wholesale_format', label: 'Wholesale Format' },
              { id: 'premium_invoice', label: 'Premium Invoice' }
            ].map((tmpl) => (
              <button
                key={tmpl.id}
                id={`template-select-${tmpl.id}`}
                onClick={() => updateConfig({ template: tmpl.id as any })}
                className={`py-2 text-[9.5px] rounded-xl border text-center font-bold tracking-tight transition-all cursor-pointer ${printSettings.template === tmpl.id ? 'border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--primary)] font-black' : 'border-[var(--border)]'}`}
              >
                {tmpl.label}
              </button>
            ))}
          </div>
        </div>

        {/* B. Live Receipt Preview Roll - ALWAYS SHOW */}
        <div className="p-3 bg-[var(--foreground)]/5 border border-[var(--border)] rounded-2xl space-y-2">
          <div className="flex justify-between items-center text-[8.5px] font-black uppercase tracking-wider opacity-60">
            <span>Live Thermal Preview / रसीद पूर्वावलोकन</span>
            <span className="text-[7.5px] bg-[var(--primary)]/10 text-[var(--primary)] px-2 py-0.5 rounded font-bold font-mono uppercase">{printSettings.paperSize} Roll</span>
          </div>

          <div className="relative border-2 border-[var(--border)] bg-white rounded-xl shadow-inner overflow-hidden flex flex-col items-center">
            <iframe
              className="w-full bg-white transition-all duration-300"
              style={{
                height: '240px',
                border: 'none',
                maxWidth: printSettings.paperSize === '80mm' ? '100%' : '260px',
              }}
              srcDoc={printerService.generateReceiptHtml({
                billNumber: '1024',
                id: 'preview-id-123',
                timestamp: new Date().toISOString(),
                customerName: 'Rajesh Kumar',
                customerPhone: '9820098200',
                paymentMethod: 'UPI',
                subtotal: 150.00,
                discount: 10,
                tax: 5,
                total: 141.75,
                items: [
                  { itemId: '1', name: 'Premium Basmati Biryani Rice Slim Row wrapping checks', quantity: 2, price: 60.00, cost: 120.00, unit: 'kg' },
                  { itemId: '2', name: 'Tata Pure White Iodized Salt Premium Sack', quantity: 1, price: 30.00, cost: 30.00, unit: 'bag' }
                ]
              }, printSettings)}
              title="Live Receipt Layout Frame"
            />
            <div className="absolute bottom-0 left-0 right-0 h-4 bg-gradient-to-t from-zinc-100 to-transparent pointer-events-none flex justify-between items-center px-4 font-mono text-[8px] text-zinc-400 select-none">
              <span>✀ - - - - - - - - - - - - Tear Line - - - - - - - - - - - - </span>
            </div>
          </div>
        </div>

        {/* D. Roll paper size - ALWAYS SHOW */}
        <div className="space-y-2 border-t border-[var(--border)] pt-3">
          <label className="text-[9px] font-black uppercase tracking-wider block opacity-70">Roll Sheet Dimension</label>
          <div className="grid grid-cols-2 gap-2">
            <button 
              id="paper-size-58"
              onClick={() => updateConfig({ paperSize: '58mm' })}
              className={`py-2 rounded-xl border font-bold text-xs transition-all cursor-pointer ${printSettings.paperSize === '58mm' ? 'border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--primary)] font-black' : 'border-[var(--border)] rgba(var(--foreground), 0.05)'}`}
            >
              58mm POS roll
            </button>
            <button 
              id="paper-size-80"
              onClick={() => updateConfig({ paperSize: '80mm' })}
              className={`py-2 rounded-xl border font-bold text-xs transition-all cursor-pointer ${printSettings.paperSize === '80mm' ? 'border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--primary)] font-black' : 'border-[var(--border)] rgba(var(--foreground), 0.05)'}`}
            >
              80mm wide desk roll
            </button>
          </div>
        </div>

        {/* Advanced Spec Sections ONLY on True */}
        {printSettings.enableAdvancedControls && (
          <>
            {/* C. Multi-Language Selection */}
            <div className="space-y-1.5 border-t border-[var(--border)] pt-3">
              <label className="text-[9px] font-black uppercase tracking-wider block opacity-70">Invoice Header Language</label>
              <div className="grid grid-cols-4 gap-1">
                {[
                  { id: 'en', label: 'English' },
                  { id: 'hi', label: 'Hindi' },
                  { id: 'mr', label: 'Marathi' },
                  { id: 'hi-en', label: 'Hinglish' }
                ].map((langObj) => (
                  <button
                    key={langObj.id}
                    onClick={() => updateConfig({ language: langObj.id as any })}
                    className={`py-1.5 text-[9px] rounded-lg border text-center font-bold tracking-tight transition-all cursor-pointer ${printSettings.language === langObj.id ? 'border-[var(--primary)] bg-[var(--primary)]/15 text-[var(--primary)] font-black' : 'border-[var(--border)] opacity-60'}`}
                  >
                    {langObj.label}
                  </button>
                ))}
              </div>
              <span className="text-[8px] font-mono text-gray-500 block leading-tight mt-1">
                * Headings translate instantly. Conserved item description names remain as typed.
              </span>
            </div>

            {/* E. Watermark Settings */}
            <div className="space-y-2 border-t border-[var(--border)] pt-3">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-[9px] font-black uppercase tracking-wider block opacity-70">Watermark overlay</label>
                  <span className="text-[8px] text-gray-400">Optimize for stamp-style printing</span>
                </div>
                <label className="relative shrink-0 inline-flex items-center cursor-pointer select-none">
                  <input 
                    type="checkbox"
                    checked={printSettings.enableWatermark}
                    onChange={(e) => updateConfig({ enableWatermark: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-8 h-4.5 bg-gray-300 dark:bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-[var(--primary)]"></div>
                </label>
              </div>

              {printSettings.enableWatermark && (
                <div className="p-3 bg-[var(--foreground)]/[0.02] border border-[var(--border)] rounded-xl space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[8.5px] font-black uppercase text-[var(--foreground)] opacity-55 block mb-1">Watermark Stamp</label>
                      <select
                        value={['PAID', 'PENDING', 'UDHAR', 'DUPLICATE COPY', 'SAMPLE'].includes(printSettings.watermarkText) ? printSettings.watermarkText : 'CUSTOM'}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === 'CUSTOM') {
                            const isAlreadyNonStandard = !['PAID', 'PENDING', 'UDHAR', 'DUPLICATE COPY', 'SAMPLE'].includes(printSettings.watermarkText);
                            updateConfig({ 
                              watermarkText: isAlreadyNonStandard && printSettings.watermarkText ? printSettings.watermarkText : 'STORE COPY' 
                            });
                          } else {
                            updateConfig({ watermarkText: val });
                          }
                        }}
                        className="w-full p-1.5 text-[10.5px] rounded-lg border border-[var(--border)] bg-transparent text-[var(--foreground)] outline-none"
                      >
                        <option value="PAID">PAID (भुगतान)</option>
                        <option value="PENDING">PENDING</option>
                        <option value="UDHAR">UDHAR / उधार</option>
                        <option value="DUPLICATE COPY">DUPLICATE COPY</option>
                        <option value="SAMPLE">SAMPLE</option>
                        <option value="CUSTOM">✏️ Custom / कस्टम...</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[8.5px] font-black uppercase text-[var(--foreground)] opacity-55 block mb-1">Transparency ({Math.round(printSettings.watermarkOpacity * 100)}%)</label>
                      <input
                        type="range"
                        min="0.05"
                        max="0.30"
                        step="0.05"
                        value={printSettings.watermarkOpacity}
                        onChange={(e) => updateConfig({ watermarkOpacity: parseFloat(e.target.value) })}
                        className="w-full accent-[var(--primary)] h-1 rounded-lg bg-[var(--border)] mt-2.5 cursor-pointer"
                      />
                    </div>
                  </div>

                  {/* Custom Watermark Text Input & Quick Preset Chips */}
                  {!['PAID', 'PENDING', 'UDHAR', 'DUPLICATE COPY', 'SAMPLE'].includes(printSettings.watermarkText) && (
                    <div className="pt-2 border-t border-[var(--border)]/60 space-y-2">
                      <div>
                        <label className="text-[8px] font-black uppercase text-[var(--foreground)] opacity-60 block mb-1">
                          Custom Watermark Text
                        </label>
                        <div className="flex gap-1.5 items-center">
                          <input
                            type="text"
                            value={printSettings.watermarkText}
                            onChange={(e) => updateConfig({ watermarkText: e.target.value })}
                            placeholder="e.g. STORE COPY, CANCELLED, KACHHA BILL, etc."
                            maxLength={30}
                            className="w-full px-2.5 py-1.5 text-xs font-bold rounded-lg border border-[var(--border)] bg-transparent text-[var(--foreground)] outline-none focus:border-[var(--primary)] tracking-wide uppercase"
                          />
                          {printSettings.watermarkText && (
                            <button
                              type="button"
                              onClick={() => updateConfig({ watermarkText: '' })}
                              className="text-[10px] text-gray-400 hover:text-[var(--foreground)] px-2 py-1.5 rounded-lg bg-[var(--foreground)]/5 font-bold cursor-pointer shrink-0"
                              title="Clear text"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Quick Suggestion Chips */}
                      <div className="flex flex-wrap gap-1 items-center">
                        <span className="text-[7.5px] font-bold text-[var(--foreground)]/40 uppercase">Suggestions:</span>
                        {['STORE COPY', 'CANCELLED', 'ESTIMATE / कच्चा बिल', 'VERIFIED', 'PROFORMA', 'NO RETURN'].map((chip) => (
                          <button
                            key={chip}
                            type="button"
                            onClick={() => updateConfig({ watermarkText: chip })}
                            className={cn(
                              "px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-wider border transition-all cursor-pointer",
                              printSettings.watermarkText === chip 
                                ? "bg-[var(--primary)] text-white border-[var(--primary)] shadow-xs" 
                                : "border-[var(--border)] bg-[var(--foreground)]/[0.03] hover:border-[var(--primary)]/50 text-[var(--foreground)]/70 hover:text-[var(--foreground)]"
                            )}
                          >
                            {chip}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* F. Micro-animations and low-end performance controls */}
            <div className="space-y-2 border-t border-[var(--border)] pt-3">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-[9px] font-black uppercase tracking-wider block opacity-70">POS slide animations</label>
                  <span className="text-[8px] text-gray-400">Lightweight thermal spool feedback effect</span>
                </div>
                <label className="relative shrink-0 inline-flex items-center cursor-pointer select-none">
                  <input 
                    type="checkbox"
                    checked={printSettings.enableAnimation}
                    onChange={(e) => updateConfig({ enableAnimation: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-8 h-4.5 bg-gray-300 dark:bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-[var(--primary)]"></div>
                </label>
              </div>
            </div>

            {/* G. Typography Alignments */}
            <div className="space-y-2 border-t border-[var(--border)] pt-3">
              <label className="text-[9px] font-black uppercase tracking-wider block opacity-70">Typography Header Alignment</label>
              <div className="flex border border-[var(--border)] rounded-xl overflow-hidden">
                <button 
                  onClick={() => updateConfig({ alignment: 'left' })}
                  className={`flex-1 py-1.5 flex justify-center text-xs transition-all cursor-pointer ${printSettings.alignment === 'left' ? 'bg-[var(--primary)] text-white' : 'hover:bg-[var(--foreground)]/[0.03]'}`}
                >
                  <AlignLeft size={16} />
                </button>
                <button 
                  onClick={() => updateConfig({ alignment: 'center' })}
                  className={`flex-1 py-1.5 flex justify-center text-xs transition-all cursor-pointer ${printSettings.alignment === 'center' ? 'bg-[var(--primary)] text-white' : 'hover:bg-[var(--foreground)]/[0.03]'}`}
                >
                  <AlignCenter size={16} />
                </button>
                <button 
                  onClick={() => updateConfig({ alignment: 'right' })}
                  className={`flex-1 py-1.5 flex justify-center text-xs transition-all cursor-pointer ${printSettings.alignment === 'right' ? 'bg-[var(--primary)] text-white' : 'hover:bg-[var(--foreground)]/[0.03]'}`}
                >
                  <AlignRight size={16} />
                </button>
              </div>
            </div>

            {/* H. Font Scale */}
            <div className="space-y-2 border-t border-[var(--border)] pt-3">
              <label className="text-[9px] font-black uppercase tracking-wider block opacity-70">Font Sizing</label>
              <div className="grid grid-cols-3 gap-1.5">
                {['small', 'medium', 'large'].map((sz) => (
                  <button
                    key={sz}
                    onClick={() => updateConfig({ fontSize: sz as any })}
                    className={`py-1.5 text-[10px] rounded-lg border uppercase font-black transition-all cursor-pointer ${printSettings.fontSize === sz ? 'bg-[var(--primary)] text-white border-0' : 'border-[var(--border)]'}`}
                  >
                    {sz}
                  </button>
                ))}
              </div>
            </div>

            {/* I. Store logo */}
            <div className="space-y-3 border-t border-[var(--border)] pt-3">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-[9px] font-black uppercase tracking-wider opacity-70 block">Store Logo Node (Graphic Symbol)</label>
                  <span className="text-[8px] text-gray-400">Prints at top of thermal receipts and laser bills</span>
                </div>
                {printSettings.logoBase64 && (
                  <div className="flex items-center gap-2">
                    <button 
                      type="button"
                      onClick={() => logoFileInputRef.current?.click()}
                      className="text-[var(--primary)] font-bold hover:underline text-[9.5px] uppercase cursor-pointer"
                    >
                      Change Graphic
                    </button>
                    <span className="text-gray-300">|</span>
                    <button 
                      type="button"
                      onClick={handleRemoveLogo}
                      className="text-rose-500 font-bold hover:underline text-[9.5px] uppercase cursor-pointer"
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>

              {/* Hidden File Input */}
              <input 
                ref={logoFileInputRef}
                id="store-logo-file-input"
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                className="hidden"
              />
              
              {printSettings.logoBase64 ? (
                <div className="p-3 bg-[var(--foreground)]/[0.03] border border-dashed border-[var(--border)] rounded-xl flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 bg-white rounded-lg p-1 border border-[var(--border)] flex items-center justify-center shadow-xs overflow-hidden">
                      <img src={printSettings.logoBase64} alt="Store logo preview" className="max-h-full max-w-full object-contain" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-[10px] font-black block truncate text-emerald-500 flex items-center gap-1">
                        <Check size={12} /> Logo Connected
                      </span>
                      <span className="text-[8px] opacity-40 uppercase font-mono block">Optimized for thermal print head</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => logoFileInputRef.current?.click()}
                    className="px-2.5 py-1.5 rounded-lg bg-[var(--foreground)]/5 hover:bg-[var(--foreground)]/10 text-[9px] font-bold uppercase tracking-wider transition-all cursor-pointer"
                  >
                    Upload New
                  </button>
                </div>
              ) : (
                <div 
                  onDragOver={(e) => { e.preventDefault(); setIsDraggingLogo(true); }}
                  onDragLeave={() => setIsDraggingLogo(false)}
                  onDrop={handleLogoDrop}
                  onClick={() => logoFileInputRef.current?.click()}
                  className={cn(
                    "relative border-2 border-dashed rounded-2xl p-4 sm:p-5 flex flex-col items-center justify-center text-center cursor-pointer transition-all",
                    isDraggingLogo 
                      ? "border-[var(--primary)] bg-[var(--primary)]/10 scale-101" 
                      : "border-[var(--border)] hover:border-[var(--primary)]/60 hover:bg-[var(--foreground)]/[0.02]"
                  )}
                >
                  <div className="w-10 h-10 rounded-2xl bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center mb-2">
                    <ImageIcon size={20} />
                  </div>
                  <div className="text-[10.5px] uppercase font-black tracking-wide text-[var(--foreground)]">Choose Store Symbol Graphic</div>
                  <div className="text-[8px] opacity-60 uppercase mt-0.5">Tap to browse or drop image here (JPEG, PNG, WEBP, SVG)</div>
                  <div className="mt-2.5 px-3.5 py-1.5 bg-[var(--primary)] text-white text-[9px] font-black uppercase tracking-wider rounded-xl shadow-xs hover:opacity-90 transition-opacity">
                    📁 Browse Image / Take Photo
                  </div>
                </div>
              )}

              {/* Quick Preset Symbols */}
              <div className="space-y-1.5 pt-1">
                <span className="text-[8px] font-black uppercase text-[var(--foreground)] opacity-50 block">Or pick a standard store symbol:</span>
                <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5">
                  {[
                    { icon: '🛒', label: 'Grocery' },
                    { icon: '🏪', label: 'Retail' },
                    { icon: '🥦', label: 'Veggies' },
                    { icon: '☕', label: 'Cafe' },
                    { icon: '💊', label: 'Pharma' },
                    { icon: '👗', label: 'Fashion' },
                    { icon: '⚡', label: 'Electro' },
                    { icon: '📦', label: 'General' },
                  ].map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => {
                        const pngData = generatePresetLogoPng(preset.icon, preset.label);
                        if (pngData) {
                          updateConfig({ logoBase64: pngData });
                          setSuccessMessage(`Applied ${preset.label} symbol logo!`);
                          clearMessagesAfterDelay();
                        }
                      }}
                      className="p-1.5 rounded-xl border border-[var(--border)] hover:border-[var(--primary)]/60 bg-[var(--card)] hover:bg-[var(--primary)]/5 flex flex-col items-center justify-center text-center transition-all cursor-pointer group"
                      title={`Use ${preset.label} symbol as receipt logo`}
                    >
                      <span className="text-base group-hover:scale-110 transition-transform">{preset.icon}</span>
                      <span className="text-[7.5px] font-bold opacity-70 group-hover:opacity-100 truncate w-full mt-0.5">{preset.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* NEW ADVANCED CARDS - ONLY SHOW IN ADVANCED PANEL MODE */}
      {printSettings.enableAdvancedControls && (
        <>
          {/* ADV 1: SILENT BACKGROUND RECOVERY */}
          <div className="border border-[var(--border)] rounded-2xl p-4 bg-[var(--foreground)]/[0.01] space-y-4">
            <div className="flex items-center gap-2 border-b border-[var(--border)] pb-2 text-[var(--primary)]">
              <RefreshCw size={15} className="animate-spin" style={{ animationDuration: '6s' }} />
              <h4 className="font-black text-xs uppercase tracking-wider text-[var(--foreground)]">Silent Connection Recovery</h4>
            </div>

            <div className="flex items-center justify-between p-1 bg-[var(--foreground)]/[0.02] rounded-xl pr-3.5">
              <div className="py-1 pl-1">
                <span className="text-[10.5px] font-black uppercase block leading-none">Auto Recovery Loop</span>
                <span className="text-[8.5px] opacity-45 uppercase mt-1 block">Silently attempts background restoration if drops occur</span>
              </div>
              <label className="relative shrink-0 inline-flex items-center cursor-pointer select-none">
                <input 
                  type="checkbox"
                  checked={printSettings.autoReconnect}
                  onChange={(e) => updateConfig({ autoReconnect: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-8 h-4.5 bg-gray-300 dark:bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-[var(--primary)]"></div>
              </label>
            </div>

            <div className="flex items-center justify-between p-1 bg-[var(--foreground)]/[0.02] rounded-xl pr-3.5">
              <div className="py-1 pl-1">
                <span className="text-[10.5px] font-black uppercase block leading-none">Silent Background Mode</span>
                <span className="text-[8.5px] opacity-45 uppercase mt-1 block">Suppresses error dialogues in checkout screen during recovery</span>
              </div>
              <label className="relative shrink-0 inline-flex items-center cursor-pointer select-none">
                <input 
                  type="checkbox"
                  checked={printSettings.silentRecovery}
                  onChange={(e) => updateConfig({ silentRecovery: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-8 h-4.5 bg-gray-300 dark:bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-[var(--primary)]"></div>
              </label>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[8.5px] font-black uppercase text-[var(--foreground)] opacity-55 block">Max Retry Attempts</label>
                <select 
                  value={printSettings.retryAttempts}
                  onChange={(e) => updateConfig({ retryAttempts: parseInt(e.target.value, 10) })}
                  className="w-full p-2 text-xs rounded-xl border border-[var(--border)] bg-transparent text-[var(--foreground)] outline-none"
                >
                  <option value="3">3 Attempts</option>
                  <option value="5">5 Attempts (Default)</option>
                  <option value="10">10 Attempts</option>
                  <option value="999">Unlimited Retries</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[8.5px] font-black uppercase text-[var(--foreground)] opacity-55 block">Attempts Interval</label>
                <select 
                  value={printSettings.retryInterval}
                  onChange={(e) => updateConfig({ retryInterval: parseInt(e.target.value, 10) })}
                  className="w-full p-2 text-xs rounded-xl border border-[var(--border)] bg-transparent text-[var(--foreground)] outline-none"
                >
                  <option value="3">Every 3 Seconds</option>
                  <option value="5">Every 5 Seconds</option>
                  <option value="10">Every 10 Seconds</option>
                  <option value="15">Every 15 Seconds</option>
                </select>
              </div>
            </div>
          </div>

          {/* ADV 2: DYNAMIC LONG ITEM NAME FORMATTING ENGINE */}
          <div className="border border-[var(--border)] rounded-2xl p-4 bg-[var(--foreground)]/[0.01] space-y-4">
            <div className="flex items-center gap-2 border-b border-[var(--border)] pb-2">
              <Sliders size={15} className="text-[var(--primary)]" />
              <h4 className="font-black text-xs uppercase tracking-wider">Dynamic Item Name Wrapping</h4>
            </div>

            <div className="flex items-center justify-between p-1 bg-[var(--foreground)]/[0.02] rounded-xl pr-3.5">
              <div className="py-1 pl-1">
                <span className="text-[10.5px] font-black uppercase block leading-none">Auto Column Wrapping</span>
                <span className="text-[8.5px] opacity-45 uppercase mt-1 block">Preserve column bounds; word-wrap descriptions</span>
              </div>
              <label className="relative shrink-0 inline-flex items-center cursor-pointer select-none">
                <input 
                  type="checkbox"
                  checked={printSettings.multilineNames}
                  onChange={(e) => updateConfig({ multilineNames: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-8 h-4.5 bg-gray-300 dark:bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-[var(--primary)]"></div>
              </label>
            </div>

            <div className="flex items-center justify-between p-1 bg-[var(--foreground)]/[0.02] rounded-xl pr-3.5">
              <div className="py-1 pl-1">
                <span className="text-[10.5px] font-black uppercase block leading-none">Force Truncation Mode</span>
                <span className="text-[8.5px] opacity-45 uppercase mt-1 block">Shorten long name rows to prevent multiple lines</span>
              </div>
              <label className="relative shrink-0 inline-flex items-center cursor-pointer select-none">
                <input 
                  type="checkbox"
                  checked={printSettings.autoShortenNames}
                  onChange={(e) => updateConfig({ autoShortenNames: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-8 h-4.5 bg-gray-300 dark:bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-[var(--primary)]"></div>
              </label>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-[8.5px] font-black uppercase">
                <span>Maximum Characters Per Line</span>
                <span className="text-[var(--primary)] font-mono">{printSettings.maxCharsPerLine} Chars</span>
              </div>
              <input 
                type="range"
                min="10"
                max="36"
                step="1"
                value={printSettings.maxCharsPerLine}
                onChange={(e) => updateConfig({ maxCharsPerLine: parseInt(e.target.value, 10) })}
                className="w-full accent-[var(--primary)] h-1 bg-[var(--border)] rounded-lg outline-none cursor-pointer"
              />
            </div>
          </div>

          {/* ADV 3: AUTO BILL COMPRESSION ENGINE */}
          <div className="border border-[var(--border)] rounded-2xl p-4 bg-[var(--foreground)]/[0.01] space-y-4">
            <div className="flex items-center gap-2 border-b border-[var(--border)] pb-2">
              <Sliders size={15} className="text-[var(--primary)]" />
              <h4 className="font-black text-xs uppercase tracking-wider">Auto Bill Compression</h4>
            </div>

            <div className="flex items-center justify-between p-1 bg-[var(--foreground)]/[0.02] rounded-xl pr-3.5">
              <div className="py-1 pl-1">
                <span className="text-[10.5px] font-black uppercase block leading-none">Paper Saver Mode</span>
                <span className="text-[8.5px] opacity-45 uppercase mt-1 block">Compress margins to reduce paper size usage</span>
              </div>
              <label className="relative shrink-0 inline-flex items-center cursor-pointer select-none">
                <input 
                  type="checkbox"
                  checked={printSettings.compactPaperMode}
                  onChange={(e) => updateConfig({ compactPaperMode: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-8 h-4.5 bg-gray-300 dark:bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-[var(--primary)]"></div>
              </label>
            </div>

            {printSettings.compactPaperMode && (
              <div className="space-y-3 p-3 bg-[var(--foreground)]/[0.01] border border-[var(--border)] rounded-xl">
                <div>
                  <span className="text-[8.5px] font-black uppercase text-[var(--foreground)] opacity-55 block mb-1">Compression Level</span>
                  <div className="grid grid-cols-3 gap-1.5">
                    {['low', 'medium', 'high'].map((lvl) => (
                      <button
                        key={lvl}
                        onClick={() => updateConfig({ compressionLevel: lvl as any })}
                        className={`py-1 rounded-lg border text-[9px] uppercase font-black tracking-tight cursor-pointer ${printSettings.compressionLevel === lvl ? 'bg-[var(--primary)] text-white border-none' : 'border-[var(--border)] bg-transparent'}`}
                      >
                        {lvl}
                      </button>
                    ))}
                  </div>
                  <span className="text-[8px] opacity-50 block mt-1 leading-tight">
                    * High level reduces line rates & letter scales to save over 35% paper roll.
                  </span>
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-[8.5px] font-black uppercase text-[var(--foreground)] opacity-55 block">Invoice Spacing Density</label>
              <div className="grid grid-cols-3 gap-1.5">
                {['compact', 'balanced', 'spacious'].map((dns) => (
                  <button
                    key={dns}
                    onClick={() => updateConfig({ invoiceDensity: dns as any })}
                    className={`py-1 text-[9px] rounded-lg border uppercase font-black transition-all cursor-pointer ${printSettings.invoiceDensity === dns ? 'bg-[var(--primary)] text-white border-0' : 'border-[var(--border)]'}`}
                  >
                    {dns}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ADV 4: INTELLIGENT FAILURE RECOVERY & BUFFER QUEUES */}
          <div className="border border-[var(--border)] rounded-2xl p-4 bg-[var(--foreground)]/[0.01] space-y-4">
            <div className="flex items-center gap-2 border-b border-[var(--border)] pb-2">
              <Check size={15} className="text-[var(--primary)]" />
              <h4 className="font-black text-xs uppercase tracking-wider">Buffer Queue & Failure Recovery</h4>
            </div>

            <div className="flex items-center justify-between p-1 bg-[var(--foreground)]/[0.02] rounded-xl pr-3.5">
              <div className="py-1 pl-1">
                <span className="text-[10.5px] font-black uppercase block leading-none">Smart Spool Sequencer</span>
                <span className="text-[8.5px] opacity-45 uppercase mt-1 block">Arranges consecutive bills to print without freezing</span>
              </div>
              <label className="relative shrink-0 inline-flex items-center cursor-pointer select-none">
                <input 
                  type="checkbox"
                  checked={printSettings.smartQueueSystem}
                  onChange={(e) => updateConfig({ smartQueueSystem: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-8 h-4.5 bg-gray-300 dark:bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-[var(--primary)]"></div>
              </label>
            </div>

            <div className="flex items-center justify-between p-1 bg-[var(--foreground)]/[0.02] rounded-xl pr-3.5">
              <div className="py-1 pl-1">
                <span className="text-[10.5px] font-black uppercase block leading-none">Store Failed Jobs</span>
                <span className="text-[8.5px] opacity-45 uppercase mt-1 block">Keeps a spool of failed items to print instantly later</span>
              </div>
              <label className="relative shrink-0 inline-flex items-center cursor-pointer select-none">
                <input 
                  type="checkbox"
                  checked={printSettings.saveFailedJobs}
                  onChange={(e) => updateConfig({ saveFailedJobs: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-8 h-4.5 bg-gray-300 dark:bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-[var(--primary)]"></div>
              </label>
            </div>

            <div className="flex items-center justify-between p-1 bg-[var(--foreground)]/[0.02] rounded-xl pr-3.5">
              <div className="py-1 pl-1">
                <span className="text-[10.5px] font-black uppercase block leading-none">Post-Recovery Auto-Resume</span>
                <span className="text-[8.5px] opacity-45 uppercase mt-1 block">Automatically finishes trailing print jobs upon connection recovery</span>
              </div>
              <label className="relative shrink-0 inline-flex items-center cursor-pointer select-none">
                <input 
                  type="checkbox"
                  checked={printSettings.autoResumePrinting}
                  onChange={(e) => updateConfig({ autoResumePrinting: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-8 h-4.5 bg-gray-300 dark:bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-[var(--primary)]"></div>
              </label>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[8.5px] font-black uppercase text-[var(--foreground)] opacity-55 block">Priority Queue Placement</label>
                <div className="flex border border-[var(--border)] rounded-xl overflow-hidden text-[9px] font-black">
                  <button 
                    onClick={() => updateConfig({ priorityPrintingMode: true })}
                    className={`flex-1 py-1 text-center cursor-pointer ${printSettings.priorityPrintingMode ? 'bg-[var(--primary)] text-white' : 'hover:bg-[var(--foreground)]/[0.03]'}`}
                  >
                    LIFO (First)
                  </button>
                  <button 
                    onClick={() => updateConfig({ priorityPrintingMode: false })}
                    className={`flex-1 py-1 text-center cursor-pointer ${!printSettings.priorityPrintingMode ? 'bg-[var(--primary)] text-white' : 'hover:bg-[var(--foreground)]/[0.03]'}`}
                  >
                    FIFO (Normal)
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[8.5px] font-black uppercase text-[var(--foreground)] opacity-55 block">Buffer Queue Limit</label>
                <input
                  type="number"
                  min="5"
                  max="50"
                  value={printSettings.queueLimit || 15}
                  onChange={(e) => updateConfig({ queueLimit: Math.max(5, parseInt(e.target.value, 18) || 15) })}
                  className="w-full px-2.5 py-1 text-xs rounded-xl border border-[var(--border)] bg-transparent font-mono"
                />
              </div>
            </div>
          </div>

          {/* ADV 5: DYNAMIC FOOTER ADVERTISEMENT SYSTEM */}
          <div className="border border-[var(--border)] rounded-2xl p-4 bg-[var(--foreground)]/[0.01] space-y-4">
            <div className="flex items-center gap-2 border-b border-[var(--border)] pb-2">
              <ImageIcon size={15} className="text-[var(--primary)]" />
              <h4 className="font-black text-xs uppercase tracking-wider">Dynamic Footer Advertisement Banners</h4>
            </div>

            <div className="flex items-center justify-between p-1 bg-[var(--foreground)]/[0.02] rounded-xl pr-3.5">
              <div className="py-1 pl-1">
                <span className="text-[10.5px] font-black uppercase block leading-none">Banner Msg Rotation</span>
                <span className="text-[8.5px] opacity-45 uppercase mt-1 block">Cycle through multiple promotional messages in turn</span>
              </div>
              <label className="relative shrink-0 inline-flex items-center cursor-pointer select-none">
                <input 
                  type="checkbox"
                  checked={printSettings.footerRotation}
                  onChange={(e) => updateConfig({ footerRotation: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-8 h-4.5 bg-gray-300 dark:bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-[var(--primary)]"></div>
              </label>
            </div>

            <div className="flex items-center justify-between p-1 bg-[var(--foreground)]/[0.02] rounded-xl pr-3.5">
              <div className="py-1 pl-1">
                <span className="text-[10.5px] font-black uppercase block leading-none font-bold">Randomize Message Order</span>
                <span className="text-[8.5px] opacity-45 uppercase mt-1 block">Selects rotating footers in arbitrary pattern</span>
              </div>
              <label className="relative shrink-0 inline-flex items-center cursor-pointer select-none">
                <input 
                  type="checkbox"
                  checked={printSettings.randomFooterMode}
                  onChange={(e) => updateConfig({ randomFooterMode: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-8 h-4.5 bg-gray-300 dark:bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-[var(--primary)]"></div>
              </label>
            </div>

            <div className="flex items-center justify-between p-1 bg-[var(--foreground)]/[0.02] rounded-xl pr-3.5">
              <div className="py-1 pl-1">
                <span className="text-[10.5px] font-black uppercase block leading-none">Holiday Promotion Banner</span>
                <span className="text-[8.5px] opacity-45 uppercase mt-1 block">Overlays a decorative festive greeting at footer head</span>
              </div>
              <label className="relative shrink-0 inline-flex items-center cursor-pointer select-none">
                <input 
                  type="checkbox"
                  checked={printSettings.festivalMode}
                  onChange={(e) => updateConfig({ festivalMode: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-8 h-4.5 bg-gray-300 dark:bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-[var(--primary)]"></div>
              </label>
            </div>

            {printSettings.footerRotation && (
              <div className="space-y-3 p-3 bg-[var(--foreground)]/[0.02] border border-[var(--border)] rounded-xl">
                <div>
                  <span className="text-[8.5px] font-black uppercase text-[var(--foreground)] opacity-55 block mb-2">Message Rotation Banners:</span>
                  <div className="space-y-1 max-h-36 overflow-y-auto border border-[var(--border)] p-1.5 rounded-lg bg-[var(--background)]">
                    {(printSettings.footerMessages || []).map((msg, index) => (
                      <div key={index} className="flex justify-between items-center text-[10px] p-1.5 bg-[var(--foreground)]/[0.03] rounded border border-[var(--border)]">
                        <span className="truncate opacity-80">{msg}</span>
                        <button 
                          onClick={() => handleRemoveAdMessage(index)}
                          className="text-rose-500 hover:text-rose-600 pl-2 shrink-0 cursor-pointer"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))}
                    {(printSettings.footerMessages || []).length === 0 && (
                      <span className="text-[8.5px] opacity-40 block text-center py-2 uppercase">No messages defined. Add below!</span>
                    )}
                  </div>
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="e.g. Free home delivery above ₹1000!"
                    value={newAdMessage}
                    aria-label="New promotional message"
                    onChange={(e) => setNewAdMessage(e.target.value)}
                    className="flex-1 px-3 py-1.5 text-xs rounded-xl border border-[var(--border)] bg-transparent outline-none text-[var(--foreground)]"
                  />
                  <button
                    onClick={handleAddAdMessage}
                    className="px-3.5 py-1.5 bg-emerald-500 text-white font-black text-[9px] uppercase tracking-widest rounded-xl hover:bg-emerald-600 transition-all cursor-pointer"
                  >
                    Add
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ADV 6: AUTO THERMAL ALIGNMENT CALIBRATION */}
          <div className="border border-[var(--border)] rounded-2xl p-4 bg-[var(--foreground)]/[0.01] space-y-4">
            <div className="flex items-center gap-2 border-b border-[var(--border)] pb-2">
              <Settings2 size={15} className="text-[var(--primary)]" />
              <h4 className="font-black text-xs uppercase tracking-wider">Spindle Margins Alignment Calibration</h4>
            </div>

            <div className="flex items-center justify-between p-1 bg-[var(--foreground)]/[0.02] rounded-xl pr-3.5">
              <div className="py-1 pl-1">
                <span className="text-[10.5px] font-black uppercase block leading-none">Auto Align Compensation</span>
                <span className="text-[8.5px] opacity-45 uppercase mt-1 block">Applies calibration adjustments to the layout</span>
              </div>
              <label className="relative shrink-0 inline-flex items-center cursor-pointer select-none">
                <input 
                  type="checkbox"
                  checked={printSettings.autoCalibration}
                  onChange={(e) => updateConfig({ autoCalibration: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-8 h-4.5 bg-gray-300 dark:bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-[var(--primary)]"></div>
              </label>
            </div>

            {printSettings.autoCalibration && (
              <div className="space-y-4 p-3 bg-[var(--foreground)]/[0.02] rounded-xl border border-[var(--border)]">
                <div className="space-y-1">
                  <div className="flex justify-between text-[8.5px] font-black uppercase">
                    <span>Left Padding Alignment Adjust</span>
                    <span className="font-mono text-[var(--primary)]">{printSettings.manualMarginLeft || 0}px</span>
                  </div>
                  <input
                    type="range"
                    min="-5"
                    max="15"
                    value={printSettings.manualMarginLeft || 0}
                    onChange={(e) => updateConfig({ manualMarginLeft: parseInt(e.target.value, 10) })}
                    className="w-full h-1 bg-[var(--border)] accent-[var(--primary)] rounded-lg outline-none cursor-pointer"
                  />
                  <span className="text-[7px] text-gray-400 block">* Negative offsets pull columns to absolute left tags.</span>
                </div>

                <div className="space-y-1 border-t border-[var(--border)] pt-3">
                  <div className="flex justify-between text-[8.5px] font-black uppercase">
                    <span>Right Padding Alignment Adjust</span>
                    <span className="font-mono text-[var(--primary)]">{printSettings.manualMarginRight || 0}px</span>
                  </div>
                  <input
                    type="range"
                    min="-5"
                    max="15"
                    value={printSettings.manualMarginRight || 0}
                    onChange={(e) => updateConfig({ manualMarginRight: parseInt(e.target.value, 10) })}
                    className="w-full h-1 bg-[var(--border)] accent-[var(--primary)] rounded-lg outline-none cursor-pointer"
                  />
                </div>

                <div className="space-y-1 border-t border-[var(--border)] pt-3">
                  <div className="flex justify-between text-[8.5px] font-black uppercase">
                    <span>Vertical Line-Height Ratio</span>
                    <span className="font-mono text-[var(--primary)]">{printSettings.manualLineSpacing || 100}%</span>
                  </div>
                  <input
                    type="range"
                    min="55"
                    max="145"
                    step="5"
                    value={printSettings.manualLineSpacing || 100}
                    onChange={(e) => updateConfig({ manualLineSpacing: parseInt(e.target.value, 10) })}
                    className="w-full h-1 bg-[var(--border)] accent-[var(--primary)] rounded-lg outline-none cursor-pointer"
                  />
                </div>
              </div>
            )}
          </div>

          {/* ADV 7: INTUITIVE IMMEDIATE REPRINT PROTECTION */}
          <div className="border border-[var(--border)] rounded-2xl p-4 bg-[var(--foreground)]/[0.01] space-y-4">
            <div className="flex items-center gap-2 border-b border-[var(--border)] pb-2 text-[var(--primary)]">
              <Check size={15} />
              <h4 className="font-black text-xs uppercase tracking-wider text-[var(--foreground)]">Double-Tap Reprint Protection</h4>
            </div>

            <div className="flex items-center justify-between p-1 bg-[var(--foreground)]/[0.02] rounded-xl pr-3.5">
              <div className="py-1 pl-1">
                <span className="text-[10.5px] font-black uppercase block leading-none">Guard Accidental Printing</span>
                <span className="text-[8.5px] opacity-45 uppercase mt-1 block">Blocks unintended duplicate prints with cooldown checks</span>
              </div>
              <label className="relative shrink-0 inline-flex items-center cursor-pointer select-none">
                <input 
                  type="checkbox"
                  checked={printSettings.reprintProtection}
                  onChange={(e) => updateConfig({ reprintProtection: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-8 h-4.5 bg-gray-300 dark:bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-[var(--primary)]"></div>
              </label>
            </div>

            {printSettings.reprintProtection && (
              <div className="space-y-4 p-3 bg-[var(--foreground)]/[0.02] rounded-xl border border-[var(--border)]">
                <div className="space-y-1">
                  <div className="flex justify-between text-[8.5px] font-black uppercase">
                    <span>Cooldown Lock Duration</span>
                    <span className="font-mono text-[var(--primary)]">{printSettings.cooldownDuration || 5} Seconds</span>
                  </div>
                  <input
                    type="range"
                    min="2"
                    max="30"
                    value={printSettings.cooldownDuration || 5}
                    onChange={(e) => updateConfig({ cooldownDuration: parseInt(e.target.value, 10) })}
                    className="w-full h-1 bg-[var(--border)] accent-[var(--primary)] rounded-lg outline-none cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between pt-1">
                  <div>
                    <span className="text-[9px] font-bold block leading-tight">Duplicate Warning Banner</span>
                    <span className="text-[7.5px] opacity-50 block leading-tight">Show safety countdown modal instead of silent bypass blocker</span>
                  </div>
                  <label className="relative shrink-0 inline-flex items-center cursor-pointer select-none">
                    <input 
                      type="checkbox"
                      checked={printSettings.duplicateWarningEnabled}
                      onChange={(e) => updateConfig({ duplicateWarningEnabled: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-8 h-4.5 bg-gray-300 dark:bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-[var(--primary)]"></div>
                  </label>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* 3. BUSINESS / MERCHANT CUSTOM TEXT METADATA - CONDITIONAL IN ADVANCED */}
      {(printSettings.enableAdvancedControls) && (
        <div className="border border-[var(--border)] rounded-2xl p-4 bg-[var(--foreground)]/[0.01] space-y-4">
          <div className="flex items-center gap-2 border-b border-[var(--border)] pb-2">
            <ShieldCheck size={15} className="text-[var(--primary)]" />
            <h4 className="font-black text-xs uppercase tracking-wider">Customize Header & Footer Information</h4>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-[8.5px] font-black uppercase text-[var(--foreground)] opacity-55 block mb-1">Company / Store Legal Name</label>
              <input 
                type="text"
                id="store-name-input"
                value={printSettings.storeName}
                onChange={(e) => updateConfig({ storeName: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-[var(--border)] bg-transparent text-[var(--foreground)] focus:border-[var(--primary)] outline-none"
              />
            </div>

            <div>
              <label className="text-[8.5px] font-black uppercase text-[var(--foreground)] opacity-55 block mb-1">Proprietor Name</label>
              <input 
                type="text"
                id="proprietor-input"
                value={printSettings.storeOwnerName}
                onChange={(e) => updateConfig({ storeOwnerName: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-[var(--border)] bg-transparent text-[var(--foreground)] focus:border-[var(--primary)] outline-none"
              />
            </div>

            <div>
              <label className="text-[8.5px] font-black uppercase text-[var(--foreground)] opacity-55 block mb-1">Retail Address</label>
              <input 
                type="text"
                id="address-input"
                value={printSettings.storeAddress}
                onChange={(e) => updateConfig({ storeAddress: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-[var(--border)] bg-transparent text-[var(--foreground)] focus:border-[var(--primary)] outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[8.5px] font-black uppercase text-[var(--foreground)] opacity-55 block mb-1">Contact Dial</label>
                <input 
                  type="text"
                  id="phone-input"
                  value={printSettings.storePhone}
                  onChange={(e) => updateConfig({ storePhone: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[var(--border)] bg-transparent text-[var(--foreground)] focus:border-[var(--primary)] outline-none"
                />
              </div>

              <div>
                <label className="text-[8.5px] font-black uppercase text-[var(--foreground)] opacity-55 block mb-1">GSTIN Number (Optional)</label>
                <input 
                  type="text"
                  id="gst-input"
                  placeholder="27AAAAA1111A1Z1"
                  value={printSettings.storeGST || ''}
                  onChange={(e) => updateConfig({ storeGST: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[var(--border)] bg-transparent text-[var(--foreground)] uppercase focus:border-[var(--primary)] outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-[8.5px] font-black uppercase text-[var(--foreground)] opacity-55 block mb-1">Custom Footer Subtext</label>
              <input 
                type="text"
                id="footer-input"
                value={printSettings.footerMessage}
                onChange={(e) => updateConfig({ footerMessage: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-[var(--border)] bg-transparent text-[var(--foreground)] focus:border-[var(--primary)] outline-none"
              />
            </div>
          </div>
        </div>
      )}

      {/* 4. PAYMENT SETTINGS & SYSTEM TOGGLES - CONDITIONAL IN ADVANCED except auto-print */}
      <div className="border border-[var(--border)] rounded-2xl p-4 bg-[var(--foreground)]/[0.01] space-y-4">
        <div className="flex items-center gap-2 border-b border-[var(--border)] pb-2">
          <CreditCard size={15} className="text-[var(--primary)]" />
          <h4 className="font-black text-xs uppercase tracking-wider">Payment UPI QR Codes & Toggles</h4>
        </div>

        {/* B. Autoprint - ALWAYS SHOW */}
        <div className="flex items-center justify-between p-1 bg-[var(--foreground)]/[0.02] rounded-xl pr-3.5">
          <div className="py-1 pl-1">
            <span className="text-[10.5px] font-black uppercase block leading-none">Auto Print Invoice</span>
            <span className="text-[8.5px] opacity-45 uppercase mt-1 block">Trigger spool workflow instantly on Checkout</span>
          </div>
          <label className="relative shrink-0 inline-flex items-center cursor-pointer select-none">
            <input 
              type="checkbox"
              id="autoprint-checkbox"
              checked={printSettings.autoPrint}
              onChange={(e) => updateConfig({ autoPrint: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-9 h-5 bg-gray-300 dark:bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[var(--primary)]"></div>
          </label>
        </div>

        {printSettings.enableAdvancedControls && (
          <>
            {/* A. QR Toggle */}
            <div className="flex items-center justify-between p-1 bg-[var(--foreground)]/[0.02] rounded-xl pr-3.5 border-t border-[var(--border)] pt-3 mt-2">
              <div className="py-1 pl-1">
                <span className="text-[10.5px] font-black uppercase block leading-none">Generate UPI QR Code</span>
                <span className="text-[8.5px] opacity-45 uppercase mt-1 block">Prints custom dynamic payment QR on receipts</span>
              </div>
              <label className="relative shrink-0 inline-flex items-center cursor-pointer select-none">
                <input 
                  type="checkbox"
                  checked={printSettings.enableQR}
                  onChange={(e) => updateConfig({ enableQR: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-gray-300 dark:bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[var(--primary)]"></div>
              </label>
            </div>

            {printSettings.enableQR && (
              <div className="space-y-1.5">
                <label className="text-[8.5px] font-black uppercase text-[var(--foreground)] opacity-55 block">Merchant UPI Address</label>
                <input 
                  type="text"
                  placeholder="e.g. merchant@okaxis"
                  value={printSettings.upiId || ''}
                  onChange={(e) => updateConfig({ upiId: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[var(--border)] bg-transparent text-[var(--foreground)] font-mono focus:border-[var(--primary)] outline-none"
                />
              </div>
            )}

            {/* C. Duplicate copies */}
            <div className="flex items-center justify-between p-1 bg-[var(--foreground)]/[0.02] rounded-xl pr-3 border-t border-[var(--border)] pt-3 mt-2">
              <div className="py-1 pl-1">
                <span className="text-[10.5px] font-black uppercase block leading-none">Duplicate Copies</span>
                <span className="text-[8.5px] opacity-45 uppercase mt-1 block">Number of tickets triggered per action</span>
              </div>
              <div className="flex items-center gap-1">
                {[1, 2, 3].map((num) => (
                  <button 
                    key={num}
                    onClick={() => updateConfig({ duplicateCopies: num })}
                    className={`h-7 w-7 rounded-lg text-xs font-black transition-all ${printSettings.duplicateCopies === num ? 'bg-[var(--primary)] text-white' : 'border border-[var(--border)]'}`}
                  >
                    {num}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {/* 5. LOCALE, TIMESTAMPS & FORMATS - CONDITIONAL */}
      {printSettings.enableAdvancedControls && (
        <div className="border border-[var(--border)] rounded-2xl p-4 bg-[var(--foreground)]/[0.01] space-y-4">
          <div className="flex items-center gap-2 border-b border-[var(--border)] pb-2">
            <Languages size={15} className="text-[var(--primary)]" />
            <h4 className="font-black text-xs uppercase tracking-wider">Localizations & Chronology</h4>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[8.5px] font-black uppercase text-[var(--foreground)] opacity-55 block">Invoice Time Clock</label>
              <select 
                value={printSettings.timeFormat}
                onChange={(e) => updateConfig({ timeFormat: e.target.value as any })}
                className="w-full p-2 text-xs rounded-xl border border-[var(--border)] bg-transparent text-[var(--foreground)] outline-none"
              >
                <option value="12hr">12 Hours (AM/PM)</option>
                <option value="24hr">24 Hours (Military)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[8.5px] font-black uppercase text-[var(--foreground)] opacity-55 block">Invoice Date Pattern</label>
              <select 
                value={printSettings.dateFormat}
                onChange={(e) => updateConfig({ dateFormat: e.target.value as any })}
                className="w-full p-2 text-xs rounded-xl border border-[var(--border)] bg-transparent text-[var(--foreground)] outline-none"
              >
                <option value="DD-MM-YYYY">DD-MM-YYYY</option>
                <option value="MM-DD-YYYY">MM-DD-YYYY</option>
                <option value="YYYY-MM-DD">YYYY-MM-DD</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* FOOTER ACTION: PRINT DIAGNOSTIC TEST TICKET - ALWAYS SHOW */}
      <div className="pt-2">
        <button 
          id="test-print-btn"
          onClick={handleTestPrint}
          className="w-full py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-600 font-extrabold text-white text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg hover:translate-y-[-1px] active:translate-y-[1px] transition-all cursor-pointer"
        >
          <RefreshCw size={15} className="animate-spin" style={{ animationDuration: '6s' }} />
          Print Diagnostic Test Ticket
        </button>
      </div>
    </div>
  );
}
