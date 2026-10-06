import React, { useState, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Plus,
  Edit2,
  X,
  ChevronDown,
  Camera,
  CameraOff,
  Bell,
  Image as ImageIcon,
  Trash2,
  Check,
  ChevronRight,
  Eye,
  RefreshCw,
  Loader2,
  Settings2,
  Search,
} from "lucide-react";
import { Button } from "./ui/Button";
import { UnitSelectorModal } from "./ui/UnitSelectorModal";
import { previewImage } from "./ImagePreviewModal";
import { trackRecentUnit, useRecentUnits } from "../lib/unitUtils";
import { translateItemName } from "../services/translationService";
import { Item, Category, LanguageType } from "../types";
import { cn } from "../lib/utils";
import { compressImageFile } from "../utils/imageUtils";

export interface ItemFormModalProps {
  onClose: () => void;
  onSave: (data: Partial<Item>) => void;
  categories: Category[];
  initialData?: Item;
  t: any;
  language: LanguageType;
  onCreateCategory?: (name: string) => Promise<any> | any;
  onDeleteCategory?: (id: string) => Promise<any> | any;
}

type ItemFormData = Omit<
  Partial<Item>,
  | "retailPrice"
  | "wholesalePrice"
  | "buyingPrice"
  | "quantity"
  | "minStockLevel"
> & {
  retailPrice?: number | string;
  wholesalePrice?: number | string;
  buyingPrice?: number | string;
  quantity?: number | string;
  minStockLevel?: number | string;
};

export function ItemFormModal({
  onClose,
  onSave,
  categories,
  initialData,
  t,
  language,
  onCreateCategory,
  onDeleteCategory,
}: ItemFormModalProps) {
  const [formData, setFormData] = useState<ItemFormData>(() => {
    if (initialData) {
      return {
        ...initialData,
        retailPrice:
          initialData.retailPrice === 0 ? ("" as any) : initialData.retailPrice,
        wholesalePrice:
          initialData.wholesalePrice === 0
            ? ("" as any)
            : initialData.wholesalePrice,
        buyingPrice:
          initialData.buyingPrice === 0 ? ("" as any) : initialData.buyingPrice,
        minStockLevel: initialData.minStockLevel ?? 10,
      };
    }
    return {
      name: "",
      categoryId: categories[0]?.id || "",
      quantity: 1,
      unit: "KG",
      retailPrice: "" as any,
      retailPriceUnit: "KG",
      wholesalePrice: "" as any,
      wholesalePriceUnit: "KG",
      buyingPrice: "" as any,
      buyingPriceUnit: "KG",
      profitMargin: 0,
      translations: { en: "", hi: "", mr: "", "hi-en": "" },
      notes: "",
      minStockLevel: 10,
    };
  });

  const [activeUnitSelection, setActiveUnitSelection] = useState<
    "base" | "retail" | "wholesale" | "buy" | null
  >(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [showPhotoSourceModal, setShowPhotoSourceModal] = useState(false);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const { recentUnits } = useRecentUnits();
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [categorySearch, setCategorySearch] = useState("");
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [isSubmittingCategory, setIsSubmittingCategory] = useState(false);
  const [isEditCategoryMode, setIsEditCategoryMode] = useState(false);
  const newCategoryInputRef = useRef<HTMLInputElement>(null);

  const selectedCategory = categories.find((c) => c.id === formData.categoryId);
  const filteredCategories = categories.filter((c) =>
    c.name.toLowerCase().includes(categorySearch.toLowerCase().trim()),
  );

  const handleInlineCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newCategoryName.trim();
    if (!trimmed || isSubmittingCategory) return;

    try {
      setIsSubmittingCategory(true);
      if (onCreateCategory) {
        const created = await onCreateCategory(trimmed);
        if (created && typeof created === "object" && "id" in created) {
          setFormData((prev) => ({ ...prev, categoryId: (created as any).id }));
        }
      }
      setNewCategoryName("");
      setIsAddingCategory(false);
    } catch (err) {
      console.error("Failed to create category", err);
    } finally {
      setIsSubmittingCategory(false);
    }
  };

  const handleInlineDeleteCategory = async (catId: string) => {
    if (formData.categoryId === catId) {
      setFormData((prev) => ({ ...prev, categoryId: "" }));
    }
    if (onDeleteCategory) {
      try {
        await onDeleteCategory(catId);
      } catch (err) {
        console.error("Failed to delete category", err);
      }
    }
  };
  const [cameraPermissionStatus, setCameraPermissionStatus] = useState<
    "prompt" | "granted" | "denied" | "unknown"
  >("unknown");
  const [showSettingsHelp, setShowSettingsHelp] = useState(false);
  const [isRetryingCamera, setIsRetryingCamera] = useState(false);
  const [dismissCameraError, setDismissCameraError] = useState(false);

  // Explicitly request camera permissions on mount or user retry
  const requestCameraPermission = async (autoTriggerCamera = false): Promise<boolean> => {
    if (
      typeof navigator === "undefined" ||
      !navigator.mediaDevices?.getUserMedia
    ) {
      setCameraPermissionStatus("unknown");
      return false;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      // Stop the test tracks immediately so hardware light turns off
      stream.getTracks().forEach((track) => track.stop());
      setCameraPermissionStatus("granted");
      setDismissCameraError(false);
      if (autoTriggerCamera) {
        triggerDeviceCamera();
      }
      return true;
    } catch (err: any) {
      if (
        err.name === "NotAllowedError" ||
        err.name === "PermissionDeniedError"
      ) {
        setCameraPermissionStatus("denied");
      } else {
        setCameraPermissionStatus("unknown");
      }
      return false;
    }
  };

  const handleRetryCameraPermission = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setIsRetryingCamera(true);
    try {
      await requestCameraPermission(true);
    } finally {
      setIsRetryingCamera(false);
    }
  };

  React.useEffect(() => {
    let isMounted = true;
    const checkAndRequestPermission = async () => {
      if (typeof navigator !== "undefined" && navigator.permissions?.query) {
        try {
          const perm = await navigator.permissions.query({
            name: "camera" as any,
          });
          if (!isMounted) return;
          setCameraPermissionStatus(perm.state as any);
          perm.onchange = () => {
            if (isMounted) setCameraPermissionStatus(perm.state as any);
          };
          if (perm.state === "prompt") {
            await requestCameraPermission();
          }
          return;
        } catch {
          // Safari fallback
        }
      }
      await requestCameraPermission();
    };

    checkAndRequestPermission();
    return () => {
      isMounted = false;
    };
  }, []);

  // Directly trigger device native camera via input with capture="environment"
  const triggerDeviceCamera = async () => {
    setShowPhotoSourceModal(false);
    if (cameraPermissionStatus === "denied") {
      const granted = await requestCameraPermission(false);
      if (!granted) {
        setDismissCameraError(false);
        return;
      }
    }
    if (cameraInputRef.current) {
      cameraInputRef.current.value = "";
      cameraInputRef.current.click();
    }
  };

  // Directly trigger device photo gallery / file picker
  const triggerDeviceGallery = () => {
    setShowPhotoSourceModal(false);
    if (galleryInputRef.current) {
      galleryInputRef.current.value = "";
      galleryInputRef.current.click();
    }
  };

  const handleImageFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploadingImage(true);
      const dataUrl = await compressImageFile(file, 400, 400, 0.85);
      setFormData((prev) => ({ ...prev, imageUrl: dataUrl }));
    } catch (err) {
      console.error("Failed to compress and save image", err);
    } finally {
      setIsUploadingImage(false);
      if (galleryInputRef.current) galleryInputRef.current.value = "";
      if (cameraInputRef.current) cameraInputRef.current.value = "";
    }
  };

  const handleRemoveImage = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setFormData((prev) => ({ ...prev, imageUrl: undefined }));
    if (galleryInputRef.current) galleryInputRef.current.value = "";
    if (cameraInputRef.current) cameraInputRef.current.value = "";
  };

  const scrollContainerRef = React.useRef<HTMLDivElement>(null);
  const section1Ref = React.useRef<HTMLDivElement>(null);
  const section2Ref = React.useRef<HTMLDivElement>(null);
  const section3Ref = React.useRef<HTMLDivElement>(null);

  const handleNameBlur = async () => {
    if (!formData.name || (initialData && formData.name === initialData.name))
      return;
    setIsTranslating(true);
    const trans = await translateItemName(formData.name);
    setFormData((prev) => ({ ...prev, translations: trans }));
    setIsTranslating(false);
  };

  const handleUnitSelect = (unit: string) => {
    trackRecentUnit(unit);
    const currentSel = activeUnitSelection;
    if (activeUnitSelection === "base")
      setFormData((prev) => ({ ...prev, unit }));
    if (activeUnitSelection === "buy")
      setFormData((prev) => ({ ...prev, buyingPriceUnit: unit }));
    if (activeUnitSelection === "wholesale")
      setFormData((prev) => ({ ...prev, wholesalePriceUnit: unit }));
    if (activeUnitSelection === "retail")
      setFormData((prev) => ({ ...prev, retailPriceUnit: unit }));
    setActiveUnitSelection(null);

    // Dynamic next-input focus navigation on unit modal selection completion
    setTimeout(() => {
      if (currentSel === "base") {
        const nextEl = document.getElementById("item-min-stock-input");
        if (nextEl) {
          nextEl.focus();
          if ("select" in nextEl) (nextEl as any).select();
        }
      } else if (currentSel === "buy") {
        const nextEl =
          document.getElementById("item-notes-textarea") ||
          document.getElementById("item-save-btn");
        if (nextEl) {
          nextEl.focus();
          if ("select" in nextEl) (nextEl as any).select();
        }
      } else if (currentSel === "wholesale") {
        const nextEl = document.getElementById("item-price-buyingPrice");
        if (nextEl) {
          nextEl.focus();
          if ("select" in nextEl) (nextEl as any).select();
        }
      } else if (currentSel === "retail") {
        const nextEl = document.getElementById("item-price-wholesalePrice");
        if (nextEl) {
          nextEl.focus();
          if ("select" in nextEl) (nextEl as any).select();
        }
      }
    }, 100);
  };

  const handleSave = () => {
    if (!formData.name) return alert("Name is required");
    onSave({
      ...formData,
      quantity:
        formData.quantity === "" || formData.quantity === undefined
          ? 1
          : Number(formData.quantity),
      retailPrice:
        formData.retailPrice === "" || formData.retailPrice === undefined
          ? 0
          : Number(formData.retailPrice),
      wholesalePrice:
        formData.wholesalePrice === "" || formData.wholesalePrice === undefined
          ? 0
          : Number(formData.wholesalePrice),
      buyingPrice:
        formData.buyingPrice === "" || formData.buyingPrice === undefined
          ? 0
          : Number(formData.buyingPrice),
      minStockLevel:
        formData.minStockLevel === "" || formData.minStockLevel === undefined
          ? 10
          : Number(formData.minStockLevel),
    } as any);
    onClose();
  };

  const sectionVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5, ease: "easeOut" as any },
    },
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex flex-col bg-[var(--card)]"
    >
      <motion.div
        role="dialog"
        aria-modal="true"
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 15 }}
        transition={{ duration: 0.2 }}
        className="h-full w-full overflow-hidden bg-[var(--card)] flex flex-col"
      >
        {/* Header */}
        <div 
          className="w-full border-b border-[var(--border)] shrink-0 bg-[var(--card)]/90 backdrop-blur-md z-20"
          style={{ paddingTop: 'max(0px, env(safe-area-inset-top))' }}
        >
          <div className="flex items-center justify-between px-4 py-3.5 sm:px-6 sm:py-4 max-w-3xl mx-auto">
            <div className="flex items-center gap-3 sm:gap-4 min-w-0">
              <div className="h-10 w-10 rounded-xl bg-[var(--primary)]/10 flex items-center justify-center text-[var(--primary)] shadow-inner shrink-0">
                {initialData ? <Edit2 size={20} /> : <Plus size={20} />}
              </div>
              <div className="min-w-0">
                <h2 className="text-base sm:text-lg font-black tracking-tighter uppercase text-[var(--foreground)] truncate leading-tight">
                  {initialData ? t.updateRecord : t.newEntry}
                </h2>
                <p className="text-[10px] font-black uppercase tracking-wider text-[var(--primary)] truncate leading-tight">
                  Fill Product Details
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              onClick={onClose}
              size="icon"
              className="rounded-xl bg-[var(--background)] hover:bg-[var(--primary)]/10 transition-colors cursor-pointer shrink-0"
            >
              <X size={20} />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto no-scrollbar scroll-smooth"
        >
          <div className="p-4 sm:p-6 space-y-6 max-w-3xl mx-auto pb-32">
          {/* Section 1: Identity */}
          <motion.div
            variants={sectionVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            ref={section1Ref}
            className="space-y-4 pt-1"
          >
            {/* Minimalist Category Row Upper of Product Name (Close together) */}
            <div className="flex items-center gap-2 px-0.5">
              <span className="text-[11px] font-black uppercase tracking-wider text-[var(--foreground)] opacity-80 shrink-0">
                category:
              </span>

              <button
                type="button"
                onClick={() => {
                  setCategorySearch("");
                  setIsAddingCategory(false);
                  setIsEditCategoryMode(false);
                  setShowCategoryModal(true);
                }}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[var(--background)] hover:bg-[var(--primary)]/10 text-[var(--foreground)] hover:text-[var(--primary)] border border-[var(--border)] hover:border-[var(--primary)]/30 font-black text-xs transition-all cursor-pointer shadow-2xs active:scale-95 group"
                title="Click to select or manage category"
              >
                <span
                  className={cn(
                    "truncate max-w-[180px] sm:max-w-[260px]",
                    selectedCategory
                      ? "text-[var(--primary)] font-black"
                      : "text-zinc-500 font-bold",
                  )}
                >
                  {selectedCategory ? selectedCategory.name : "Select Category"}
                </span>
                <ChevronRight
                  size={13}
                  className="text-zinc-400 group-hover:text-[var(--primary)] group-hover:translate-x-0.5 transition-all shrink-0"
                />
              </button>
            </div>

            <label className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-[var(--primary)] px-0.5">
              <span className="w-5 h-5 rounded-md bg-[var(--primary)] text-[var(--primary-foreground)] flex items-center justify-center text-[10px] font-black shadow-xs shrink-0">
                01
              </span>{" "}
              <span>Product Name (सामान का नाम)</span>
            </label>
            <div className="space-y-3">
              <div className="flex items-center gap-2 sm:gap-2.5">
                {/* Product Name Input */}
                <div className="relative flex-1 min-w-0">
                  <input
                    id="item-name-input"
                    style={{ height: "50px" }}
                    className="w-full h-[50px] px-3.5 sm:px-4 rounded-xl border-2 border-[var(--border)] bg-[var(--background)] font-black text-base sm:text-lg focus:border-[var(--primary)] focus:outline-none transition-all placeholder:opacity-15 shadow-inner"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, name: e.target.value }))
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        const next = document.getElementById("item-qty-input");
                        next?.focus();
                        if (next && "select" in next) (next as any).select();
                      }
                    }}
                    onBlur={handleNameBlur}
                    placeholder="Item Name (सामान का नाम) (e.g. Rice, Oil)..."
                  />
                  {isTranslating && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex gap-1 pointer-events-none">
                      <span className="w-1.5 h-1.5 rounded-full bg-[var(--primary)] animate-bounce" />
                      <span className="w-1.5 h-1.5 rounded-full bg-[var(--primary)] animate-bounce [animation-delay:0.2s]" />
                      <span className="w-1.5 h-1.5 rounded-full bg-[var(--primary)] animate-bounce [animation-delay:0.4s]" />
                    </div>
                  )}
                </div>

                {/* Separate Camera / Add Photo Button */}
                <button
                  type="button"
                  id="item-add-photo-btn"
                  onClick={() => {
                    setDismissCameraError(false);
                    setShowPhotoSourceModal(true);
                  }}
                  disabled={isUploadingImage}
                  style={{ height: "50px", width: "50px" }}
                  className={cn(
                    "h-[50px] w-[50px] rounded-xl flex items-center justify-center shrink-0 border-2 transition-all cursor-pointer shadow-xs active:scale-95",
                    formData.imageUrl
                      ? "p-1 border-[var(--primary)] bg-[var(--card)] hover:ring-2 hover:ring-[var(--primary)]/30"
                      : "border-[var(--border)] bg-[var(--card)] hover:bg-[var(--primary)] text-[var(--primary)] hover:text-white hover:border-[var(--primary)]"
                  )}
                  title={formData.imageUrl ? "Change / View Photo" : "Add Product Photo (फोटो जोड़ें)"}
                >
                  {isUploadingImage ? (
                    <Loader2 size={20} className="animate-spin text-[var(--primary)]" />
                  ) : formData.imageUrl ? (
                    <img
                      src={formData.imageUrl}
                      alt="Product"
                      className="w-full h-full object-cover rounded-lg"
                    />
                  ) : (
                    <Camera size={21} className="stroke-[2.2]" />
                  )}
                </button>
              </div>

              {/* Hidden Native File Inputs */}
              <input
                type="file"
                ref={cameraInputRef}
                accept="image/*"
                capture="environment"
                onChange={handleImageFileChange}
                className="sr-only pointer-events-none"
                tabIndex={-1}
                aria-hidden="true"
              />
              <input
                type="file"
                ref={galleryInputRef}
                accept="image/*"
                onChange={handleImageFileChange}
                className="sr-only pointer-events-none"
                tabIndex={-1}
                aria-hidden="true"
              />

              {/* Product Photo State (Shown when photo attached or camera blocked) */}
              {(formData.imageUrl || cameraPermissionStatus === "denied") && (
                <div className="space-y-2.5">
                  {formData.imageUrl && (
                    /* Attached State: Sleek row with photo & Change button */
                    <div className="flex items-center justify-between gap-3 p-2.5 rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-xs">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <button
                          type="button"
                          onClick={() =>
                            previewImage(
                              formData.imageUrl!,
                              formData.name || "Product Photo",
                            )
                          }
                          className="relative w-9 h-9 rounded-lg overflow-hidden shrink-0 border border-black/10 dark:border-white/10 group cursor-pointer"
                          title="Click to view photo"
                        >
                          <img
                            src={formData.imageUrl}
                            alt="Product"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white">
                            <Eye size={12} />
                          </div>
                        </button>

                        <div className="min-w-0 flex flex-col">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-[var(--foreground)] truncate">
                              Photo Attached
                            </span>
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                          </div>
                          <span className="text-[10px] text-zinc-400 font-medium truncate">
                            Ready for POS & search
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => setShowPhotoSourceModal(true)}
                          disabled={isUploadingImage}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[var(--background)] hover:bg-[var(--primary)]/10 text-[var(--foreground)] hover:text-[var(--primary)] border border-[var(--border)] font-bold text-xs transition-all cursor-pointer shadow-xs active:scale-95"
                        >
                          <RefreshCw
                            size={11}
                            className={isUploadingImage ? "animate-spin" : ""}
                          />
                          <span>Change</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleRemoveImage}
                          className="p-1.5 rounded-xl text-zinc-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                          title="Remove photo"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Slim, Collapsible Camera Permission Error Notice to save vertical space */}
                  {cameraPermissionStatus === "denied" && !dismissCameraError && (
                    <div className="rounded-xl bg-amber-500/10 border border-amber-500/30 overflow-hidden transition-all text-xs">
                      {/* Slim Single-Line Header Bar */}
                      <div className="flex items-center justify-between gap-2 px-3 py-1.5 min-h-[34px]">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <CameraOff
                            size={13}
                            className="text-amber-600 dark:text-amber-400 shrink-0"
                          />
                          <span className="font-bold text-[11px] text-amber-800 dark:text-amber-200 truncate">
                            Camera blocked
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {/* Working Retry Button */}
                          <button
                            type="button"
                            onClick={handleRetryCameraPermission}
                            disabled={isRetryingCamera}
                            style={{
                              marginLeft: "-4px",
                              marginRight: "55px",
                              marginTop: "-1px",
                              paddingRight: "5px",
                            }}
                            className="h-6 px-2 rounded-md bg-amber-600 hover:bg-amber-700 text-white font-bold text-[10px] uppercase tracking-wider flex items-center gap-1 transition-all cursor-pointer shadow-2xs active:scale-95 disabled:opacity-50"
                            title="Retry requesting camera permission"
                          >
                            <RefreshCw
                              size={10}
                              className={isRetryingCamera ? "animate-spin" : ""}
                            />
                            <span>{isRetryingCamera ? "Checking..." : "Retry"}</span>
                          </button>

                          {/* Collapsible Help Toggle */}
                          <button
                            type="button"
                            onClick={() => setShowSettingsHelp(!showSettingsHelp)}
                            className="h-6 px-1.5 rounded-md text-amber-800 dark:text-amber-200 hover:bg-amber-500/15 text-[10px] font-bold flex items-center gap-0.5 transition-colors cursor-pointer"
                            title={showSettingsHelp ? "Hide instructions" : "Show how to enable camera"}
                          >
                            <span>{showSettingsHelp ? "Less" : "Help"}</span>
                            <ChevronDown
                              size={11}
                              className={cn(
                                "transition-transform duration-200 shrink-0",
                                showSettingsHelp && "rotate-180"
                              )}
                            />
                          </button>

                          {/* Dismiss Close Icon */}
                          <button
                            type="button"
                            onClick={() => setDismissCameraError(true)}
                            className="w-5 h-5 rounded flex items-center justify-center text-amber-700/70 hover:text-amber-800 dark:text-amber-300 hover:bg-amber-500/20 transition-colors cursor-pointer"
                            title="Dismiss notice"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      </div>

                      {/* Collapsible Instructions (Only visible when Help is clicked) */}
                      {showSettingsHelp && (
                        <div className="p-2.5 pt-2 border-t border-amber-500/20 bg-black/5 dark:bg-black/20 text-[10.5px] space-y-1.5">
                          <p className="text-zinc-600 dark:text-zinc-300 leading-snug">
                            Camera was blocked by your browser. Allow camera in browser settings or pick from Gallery:
                          </p>
                          <ul className="list-disc pl-4 space-y-0.5 text-zinc-600 dark:text-zinc-300">
                            <li>
                              <strong>Desktop:</strong> Click 🔒 left of address bar → turn on <strong>Camera</strong> → click Retry.
                            </li>
                            <li>
                              <strong>Android:</strong> Menu ⋮ → Settings → Site settings → Camera → Allow.
                            </li>
                            <li>
                              <strong>iPhone/iPad:</strong> Tap <strong>aA</strong> in address bar → Website Settings → Camera → Allow.
                            </li>
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>

          {/* Section 2: Logistical Metrics */}
          <motion.div
            variants={sectionVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            ref={section2Ref}
            className="space-y-4 border-t border-[var(--border)] pt-6"
          >
           
            <div className="space-y-0">
              {/* 1-Line Responsive Grid for Stock Quantity & Low Stock Alert */}
              <div className="grid grid-cols-2 gap-2.5 sm:gap-4 items-start">
                {/* 1. Stock Quantity Field */}
                <div className="space-y-1.5 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-teal-500/10 dark:bg-teal-500/20 text-teal-800 dark:text-teal-300 border border-teal-500/25 text-[10.5px] font-black uppercase tracking-wider truncate">
                      <span className="w-1.5 h-1.5 rounded-full bg-teal-500 shrink-0" />
                      Stock Qty(स्टॉक संख्या)
                    </p>
                  </div>

                  <div className="flex items-center h-10 rounded-xl border border-[var(--border)] bg-[var(--background)] focus-within:border-[var(--primary)] focus-within:ring-1 focus-within:ring-[var(--primary)]/20 transition-all overflow-hidden shadow-2xs">
                    <input
                      type="number"
                      step="any"
                      id="item-qty-input"
                      placeholder="0"
                      className="flex-1 min-w-0 h-full bg-transparent px-2.5 sm:px-3 font-black text-sm sm:text-base text-[var(--foreground)] focus:outline-none placeholder:opacity-25"
                      value={
                        formData.quantity === 0 || formData.quantity === ""
                          ? ""
                          : formData.quantity
                      }
                      onFocus={(e) => e.target.select()}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          const unitBtn = document.getElementById("item-unit-btn");
                          unitBtn?.focus();
                        }
                      }}
                      onChange={(e) => {
                        const val = e.target.value;
                        setFormData((prev) => ({
                          ...prev,
                          quantity:
                            val === ""
                              ? ""
                              : val.startsWith("0") &&
                                  val.length > 1 &&
                                  !val.startsWith("0.")
                                ? parseFloat(val)
                                : val,
                        }));
                      }}
                    />
                    <button
                      type="button"
                      id="item-unit-btn"
                      tabIndex={0}
                      data-navigable="true"
                      onClick={() => setActiveUnitSelection("base")}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setActiveUnitSelection("base");
                        } else if (e.key === "ArrowRight" || e.key === "ArrowDown") {
                          e.preventDefault();
                          const next = document.getElementById("item-min-stock-input");
                          next?.focus();
                          if (next && "select" in next) (next as any).select();
                        }
                      }}
                      className="h-full px-2 sm:px-3 bg-[var(--card)] hover:bg-[var(--foreground)]/5 border-l border-[var(--border)] text-[10px] sm:text-xs font-black uppercase text-[var(--foreground)] flex items-center gap-1 cursor-pointer shrink-0 transition-colors focus:ring-2 focus:ring-[var(--primary)] focus:outline-none"
                      title="Change unit (Enter or Space to select, Arrow to skip)"
                    >
                      <span className="truncate max-w-[50px] sm:max-w-none">
                        {formData.unit}
                      </span>
                      <ChevronDown
                        size={11}
                        className="text-[var(--foreground)]/70 shrink-0"
                      />
                    </button>
                  </div>
                </div>

                {/* 2. Low Stock Alert Field */}
                <div className="space-y-1.5 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-amber-500/10 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-500/25 text-[10.5px] font-black uppercase tracking-wider truncate">
                      <Bell
                        size={11}
                        className="text-amber-500 shrink-0 fill-amber-500/30"
                      />{" "}
                      Alert(स्टॉक चेतावनी)
                    </p>
                  </div>

                  <div className="flex items-center h-10 rounded-xl border border-[var(--border)] bg-[var(--background)] focus-within:border-amber-500 focus-within:ring-1 focus-within:ring-amber-500/20 transition-all overflow-hidden shadow-2xs">
                    <input
                      type="number"
                      step="any"
                      id="item-min-stock-input"
                      placeholder="10"
                      className="flex-1 min-w-0 h-full bg-transparent px-2.5 sm:px-3 font-black text-sm sm:text-base text-[var(--foreground)] focus:outline-none placeholder:opacity-25"
                      value={
                        formData.minStockLevel === 0 ||
                        formData.minStockLevel === ""
                          ? ""
                          : (formData.minStockLevel ?? 10)
                      }
                      onFocus={(e) => e.target.select()}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          const next = document.getElementById("item-price-retailPrice");
                          next?.focus();
                          if (next && "select" in next) (next as any).select();
                        }
                      }}
                      onChange={(e) => {
                        const val = e.target.value;
                        setFormData((prev) => ({
                          ...prev,
                          minStockLevel:
                            val === ""
                              ? ""
                              : val.startsWith("0") &&
                                  val.length > 1 &&
                                  !val.startsWith("0.")
                                ? parseFloat(val)
                                : val,
                        }));
                      }}
                    />
                    <span className="h-full px-2 sm:px-2.5 bg-[var(--card)] border-l border-[var(--border)] text-[9px] sm:text-[10px] font-black uppercase text-[var(--foreground)] flex items-center shrink-0">
                      Min
                    </span>
                  </div>
                </div>
              </div>

              {/* Notes Field: Sleek, compact 1-line row underneath */}
              <div className="pt-1">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="inline-flex items-center gap-1.5 px-2 py-1.5 rounded-md bg-purple-500/10 dark:bg-purple-500/20 text-purple-800 dark:text-purple-300 border border-purple-500/25 text-[10.5px] font-black uppercase tracking-wider">
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-500 shrink-0" />
                    Notes/Remarks (जानकारी)
                  </span>
                </div>
                <input
                  type="text"
                  id="item-notes-textarea"
                  style={{
                    height: "48.5px",
                    width: "290px",
                    marginTop: "3px",
                    paddingTop: "-7px",
                    paddingBottom: "16px",
                  }}
                  className="rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 font-medium text-xs text-[var(--foreground)] placeholder:text-zinc-500 focus:border-[var(--primary)] focus:outline-none transition-all shadow-inner"
                  placeholder="Supplier name, batch or rack location details..."
                  value={formData.notes || ""}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      const saveBtn = document.getElementById("item-save-btn");
                      saveBtn?.focus();
                    }
                  }}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, notes: e.target.value }))
                  }
                />
              </div>
            </div>
          </motion.div>

          {/* Section 3: Financial Framework */}
          <motion.div
            variants={sectionVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            ref={section3Ref}
            className="space-y-4 border-t border-[var(--border)] pt-6 pb-8"
          >
            <label className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-[var(--primary)] px-0.5">
              <span className="w-5 h-5 rounded-md bg-[var(--primary)] text-[var(--primary-foreground)] flex items-center justify-center text-[10px] font-black shadow-xs shrink-0">
                02
              </span>{" "}
              <span>ALL RATES(दाम व मूल्य):</span>
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                {
                  label: t.retail,
                  key: "retailPrice",
                  unitKey: "retailPriceUnit",
                  selection: "retail",
                  color: "bg-green-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
                  badgeClass: "bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border-emerald-500/25",
                  dotColor: "bg-emerald-500",
                  nextInputId: "item-price-wholesalePrice",
                },
                {
                  label: t.wholesale,
                  key: "wholesalePrice",
                  unitKey: "wholesalePriceUnit",
                  selection: "wholesale",
                  color: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
                  badgeClass: "bg-blue-500/10 dark:bg-blue-500/20 text-blue-800 dark:text-blue-300 border-blue-500/25",
                  dotColor: "bg-blue-500",
                  nextInputId: "item-price-buyingPrice",
                },
                {
                  label: t.buy,
                  key: "buyingPrice",
                  unitKey: "buyingPriceUnit",
                  selection: "buy",
                  color: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20",
                  badgeClass: "bg-orange-500/10 dark:bg-orange-500/20 text-orange-800 dark:text-orange-300 border-orange-500/25",
                  dotColor: "bg-orange-500",
                  nextInputId: "item-notes-textarea",
                },
              ].map((field) => (
                <div key={field.key} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className={cn("inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border text-[10.5px] font-black uppercase tracking-wider", field.badgeClass)}>
                      <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", field.dotColor)} />
                      {field.label}
                    </p>
                  </div>
                  <div className="relative group">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-xl text-[var(--foreground)] opacity-40 group-focus-within:opacity-90 transition-opacity">
                      {field.key === "profitMargin" ? "%" : "₹"}
                    </span>
                    <input
                      type="number"
                      step="any"
                      id={`item-price-${field.key}`}
                      placeholder="0.00"
                      className="w-full rounded-2xl border-2 border-[var(--border)] bg-[var(--background)] py-4 pl-10 pr-4 font-black text-lg focus:border-[var(--primary)] focus:outline-none transition-all shadow-inner placeholder:opacity-25"
                      value={
                        (formData as any)[field.key] === 0 ||
                        (formData as any)[field.key] === "" ||
                        (formData as any)[field.key] === undefined ||
                        (formData as any)[field.key] === null
                          ? ""
                          : (formData as any)[field.key]
                      }
                      onFocus={(e) => e.target.select()}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          const unitBtn = document.getElementById(
                            `item-price-unit-${field.selection}`,
                          );
                          if (unitBtn) {
                            unitBtn.focus();
                          } else {
                            const nextInput = document.getElementById(
                              field.nextInputId,
                            );
                            nextInput?.focus();
                            if (nextInput && "select" in nextInput)
                              (nextInput as any).select();
                          }
                        }
                      }}
                      onChange={(e) => {
                        const val = e.target.value;
                        setFormData((prev) => ({
                          ...prev,
                          [field.key]:
                            val === ""
                              ? ""
                              : val.startsWith("0") &&
                                  val.length > 1 &&
                                  !val.startsWith("0.")
                                ? parseFloat(val)
                                : val,
                        }));
                      }}
                    />
                  </div>
                  {field.selection && (
                    <button
                      type="button"
                      id={`item-price-unit-${field.selection}`}
                      tabIndex={0}
                      data-navigable="true"
                      onClick={() =>
                        setActiveUnitSelection(field.selection as any)
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setActiveUnitSelection(field.selection as any);
                        } else if (
                          e.key === "ArrowRight" ||
                          e.key === "ArrowDown"
                        ) {
                          e.preventDefault();
                          const nextInput = document.getElementById(
                            field.nextInputId,
                          );
                          nextInput?.focus();
                          if (nextInput && "select" in nextInput)
                            (nextInput as any).select();
                        }
                      }}
                      className={cn(
                        "w-full py-2.5 rounded-xl border border-transparent font-black uppercase text-[8px] tracking-widest transition-all cursor-pointer",
                        "focus:ring-2 focus:ring-[var(--primary)] focus:ring-offset-2 focus:border-[var(--primary)] focus:scale-[1.02] focus:outline-none shadow-xs",
                        field.color,
                      )}
                      title="Change unit (Enter or Space to select, Arrow to skip)"
                    >
                      / {(formData as any)[field.unitKey]}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
          </div>
        </div>

        {/* Action Bar */}
        <div 
          className="fixed bottom-0 left-0 right-0 p-4 sm:p-6 bg-gradient-to-t from-[var(--card)] via-[var(--card)]/95 to-transparent z-20 pointer-events-none"
          style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}
        >
          <div className="flex gap-4 pointer-events-auto max-w-3xl mx-auto">
            <Button
              id="item-save-btn"
              data-save="true"
              className="w-full py-5 rounded-2xl font-black uppercase text-sm shadow-xl shadow-[var(--primary)]/20 cursor-pointer"
              onClick={handleSave}
            >
              {initialData ? "Save Changes / बदलाव सेव करें" : "SAVE"}
            </Button>
          </div>
        </div>

        <AnimatePresence>
          {activeUnitSelection && (
            <UnitSelectorModal
              onClose={() => setActiveUnitSelection(null)}
              onSelect={handleUnitSelect}
              currentUnit={
                activeUnitSelection === "base"
                  ? formData.unit!
                  : activeUnitSelection === "buy"
                    ? formData.buyingPriceUnit!
                    : activeUnitSelection === "wholesale"
                      ? formData.wholesalePriceUnit!
                      : formData.retailPriceUnit!
              }
            />
          )}
        </AnimatePresence>

        {/* Photo Source Selection Popup Modal */}
        <AnimatePresence>
          {showPhotoSourceModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
              onClick={() => setShowPhotoSourceModal(false)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                transition={{ type: "spring", duration: 0.25, bounce: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-[310px] overflow-hidden rounded-2xl bg-[var(--card)] border border-[var(--border)] shadow-xl p-5 space-y-4"
              >
                {/* Header */}
                <div className="flex items-center justify-between pb-1 border-b border-[var(--border)]/50">
                  <div>
                    <h3 className="text-sm font-bold tracking-tight text-[var(--foreground)]">
                      Add Product Photo
                    </h3>
                    <p className="text-[10px] text-zinc-400 font-medium">
                      Select photo source
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowPhotoSourceModal(false)}
                    className="w-7 h-7 rounded-lg bg-[var(--background)] hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 flex items-center justify-center transition-colors cursor-pointer"
                  >
                    <X size={14} />
                  </button>
                </div>

                {/* Compact Option Items */}
                <div className="space-y-2">
                  {/* Option 1: Open Camera (Device Camera) */}
                  <button
                    type="button"
                    onClick={triggerDeviceCamera}
                    className="w-full p-3 rounded-xl border border-[var(--border)] hover:border-blue-500/60 bg-[var(--background)] hover:bg-blue-500/5 flex items-center gap-3 transition-all text-left group cursor-pointer active:scale-[0.98]"
                  >
                    <div className="w-9 h-9 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-all">
                      <Camera size={17} className="stroke-[2.2]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-xs text-[var(--foreground)] group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                          Open Camera
                        </span>
                        <ChevronRight
                          size={14}
                          className="text-zinc-400 group-hover:text-blue-500 transition-colors"
                        />
                      </div>
                      <p className="text-[10px] text-zinc-400 font-medium mt-0.5">
                        Capture using device camera
                      </p>
                    </div>
                  </button>

                  {/* Option 2: Open Gallery */}
                  <button
                    type="button"
                    onClick={triggerDeviceGallery}
                    className="w-full p-3 rounded-xl border border-[var(--border)] hover:border-purple-500/60 bg-[var(--background)] hover:bg-purple-500/5 flex items-center gap-3 transition-all text-left group cursor-pointer active:scale-[0.98]"
                  >
                    <div className="w-9 h-9 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0 group-hover:bg-purple-600 group-hover:text-white transition-all">
                      <ImageIcon size={17} className="stroke-[2.2]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-xs text-[var(--foreground)] group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                          Open Gallery
                        </span>
                        <ChevronRight
                          size={14}
                          className="text-zinc-400 group-hover:text-purple-500 transition-colors"
                        />
                      </div>
                      <p className="text-[10px] text-zinc-400 font-medium mt-0.5">
                        Select from photos or files
                      </p>
                    </div>
                  </button>

                  {/* Remove Current Photo if exists */}
                  {formData.imageUrl && (
                    <button
                      type="button"
                      onClick={() => {
                        handleRemoveImage();
                        setShowPhotoSourceModal(false);
                      }}
                      className="w-full py-2 px-3 rounded-lg text-rose-500 hover:bg-rose-500/10 flex items-center justify-center gap-1.5 text-xs font-medium transition-colors cursor-pointer"
                    >
                      <Trash2 size={13} /> Remove Current Photo
                    </button>
                  )}
                </div>

                {/* Cancel Button */}
                <button
                  type="button"
                  onClick={() => setShowPhotoSourceModal(false)}
                  className="w-full py-2 rounded-xl bg-[var(--background)] hover:bg-zinc-200 dark:hover:bg-zinc-800 text-[var(--foreground)] font-semibold text-xs transition-colors cursor-pointer border border-[var(--border)]"
                >
                  Cancel
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Small Category Selection Popup Modal */}
        <AnimatePresence>
          {showCategoryModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
              onClick={() => setShowCategoryModal(false)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                transition={{ type: "spring", duration: 0.25, bounce: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-[340px] rounded-2xl bg-[var(--card)] border border-[var(--border)] shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
              >
                {/* Header */}
                <div className="flex items-center justify-between p-3.5 pb-2.5 border-b border-[var(--border)] shrink-0">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[var(--primary)] shrink-0" />
                    <h3 className="text-sm font-black text-[var(--foreground)] uppercase tracking-wider">
                      Categories (श्रेणी)
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowCategoryModal(false)}
                    className="w-7 h-7 rounded-lg bg-[var(--background)] hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 flex items-center justify-center transition-colors cursor-pointer"
                  >
                    <X size={14} />
                  </button>
                </div>

                {/* Search Bar & Action Buttons */}
                <div className="p-3 border-b border-[var(--border)] space-y-2.5 shrink-0 bg-[var(--background)]/40">
                  {/* Search Input */}
                  <div className="relative">
                    <Search
                      size={13}
                      className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none"
                    />
                    <input
                      type="text"
                      placeholder="Search categories..."
                      value={categorySearch}
                      onChange={(e) => setCategorySearch(e.target.value)}
                      className="w-full h-8 pl-8 pr-7 rounded-lg border border-[var(--border)] bg-[var(--card)] font-medium text-xs text-[var(--foreground)] placeholder:text-zinc-400 focus:border-[var(--primary)] focus:outline-none transition-all shadow-inner"
                      autoFocus
                    />
                    {categorySearch && (
                      <button
                        type="button"
                        onClick={() => setCategorySearch("")}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer"
                      >
                        <X size={12} />
                      </button>
                    )}
                  </div>

                  {/* Actions Row: + Add Button & Manage Button */}
                  <div className="flex items-center justify-between gap-2">
                    {!isAddingCategory ? (
                      <button
                        type="button"
                        onClick={() => {
                          setIsAddingCategory(true);
                          setTimeout(() => newCategoryInputRef.current?.focus(), 50);
                        }}
                        className="h-7 px-2.5 rounded-lg bg-[var(--primary)] hover:opacity-90 text-white text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer shadow-xs active:scale-95"
                      >
                        <Plus size={12} strokeWidth={2.5} />
                        <span>Add Category</span>
                      </button>
                    ) : (
                      <form
                        onSubmit={handleInlineCreateCategory}
                        className="flex items-center gap-1.5 flex-1 min-w-0"
                      >
                        <input
                          ref={newCategoryInputRef}
                          type="text"
                          placeholder="Category name..."
                          value={newCategoryName}
                          onChange={(e) => setNewCategoryName(e.target.value)}
                          className="h-7 flex-1 min-w-0 px-2 rounded-lg bg-[var(--card)] border border-[var(--primary)] text-xs font-semibold focus:outline-none shadow-xs"
                          autoFocus
                        />
                        <button
                          type="submit"
                          disabled={!newCategoryName.trim() || isSubmittingCategory}
                          className="h-7 px-2 rounded-lg bg-[var(--primary)] hover:opacity-90 text-white disabled:opacity-40 text-xs font-bold transition-all cursor-pointer flex items-center justify-center shrink-0"
                          title="Save category"
                        >
                          {isSubmittingCategory ? (
                            <Loader2 size={11} className="animate-spin" />
                          ) : (
                            <Check size={12} strokeWidth={2.5} />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setIsAddingCategory(false);
                            setNewCategoryName("");
                          }}
                          className="h-7 px-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 text-xs transition-colors cursor-pointer flex items-center justify-center shrink-0"
                          title="Cancel"
                        >
                          <X size={12} />
                        </button>
                      </form>
                    )}

                    {!isAddingCategory && (
                      <button
                        type="button"
                        onClick={() => setIsEditCategoryMode(!isEditCategoryMode)}
                        className={cn(
                          "h-7 px-2.5 rounded-lg border text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer shrink-0 ml-auto",
                          isEditCategoryMode
                            ? "border-rose-500 bg-rose-500/10 text-rose-600 dark:text-rose-400"
                            : "border-[var(--border)] bg-[var(--card)] hover:bg-black/5 dark:hover:bg-white/5 text-[var(--foreground)]"
                        )}
                        title="Manage categories (delete)"
                      >
                        {isEditCategoryMode ? (
                          <>
                            <Check size={11} strokeWidth={2.5} />
                            <span>Done</span>
                          </>
                        ) : (
                          <>
                            <Settings2 size={11} />
                            <span>Manage</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>

                {/* Category List */}
                <div className="p-2 overflow-y-auto max-h-[300px] space-y-1 no-scrollbar">
                  {/* None / Clear Option */}
                  <button
                    type="button"
                    onClick={() => {
                      setFormData((prev) => ({ ...prev, categoryId: "" }));
                      setShowCategoryModal(false);
                    }}
                    className={cn(
                      "w-full px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-between transition-all cursor-pointer text-left",
                      !formData.categoryId
                        ? "bg-[var(--primary)]/10 text-[var(--primary)] border border-[var(--primary)]/30 font-black"
                        : "text-zinc-500 hover:bg-black/5 dark:hover:bg-white/5"
                    )}
                  >
                    <span>None (बिना श्रेणी)</span>
                    {!formData.categoryId && <Check size={14} className="text-[var(--primary)]" />}
                  </button>

                  {filteredCategories.map((cat) => {
                    const isSelected = formData.categoryId === cat.id;
                    return (
                      <div
                        key={cat.id}
                        className={cn(
                          "group flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-all",
                          isSelected
                            ? "bg-[var(--primary)] text-white font-black shadow-xs"
                            : "text-[var(--foreground)] hover:bg-black/5 dark:hover:bg-white/5 font-semibold"
                        )}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            if (!isEditCategoryMode) {
                              setFormData((prev) => ({ ...prev, categoryId: cat.id }));
                              setShowCategoryModal(false);
                            }
                          }}
                          className="flex-1 text-left flex items-center justify-between min-w-0 cursor-pointer"
                        >
                          <span className="truncate">{cat.name}</span>
                          {isSelected && !isEditCategoryMode && (
                            <Check size={14} className="text-white shrink-0 ml-2" />
                          )}
                        </button>

                        {isEditCategoryMode && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleInlineDeleteCategory(cat.id);
                            }}
                            className="w-6 h-6 rounded-lg bg-rose-500/20 hover:bg-rose-500 text-rose-500 hover:text-white flex items-center justify-center transition-colors ml-2 cursor-pointer shrink-0"
                            title={`Delete ${cat.name}`}
                          >
                            <Trash2 size={11} strokeWidth={2.5} />
                          </button>
                        )}
                      </div>
                    );
                  })}

                  {filteredCategories.length === 0 && (
                    <div className="py-6 text-center text-xs text-zinc-400 space-y-2">
                      <p>No categories found{categorySearch ? ` for "${categorySearch}"` : ""}</p>
                      {categorySearch.trim() && !isAddingCategory && (
                        <button
                          type="button"
                          onClick={() => {
                            setNewCategoryName(categorySearch.trim());
                            setIsAddingCategory(true);
                          }}
                          className="text-xs font-bold text-[var(--primary)] underline hover:no-underline cursor-pointer"
                        >
                          + Create "{categorySearch.trim()}"
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}
export default ItemFormModal;
