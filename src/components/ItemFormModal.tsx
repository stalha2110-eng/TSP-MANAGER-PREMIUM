import React, { useState, useRef, useMemo } from "react";
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
  FileText,
  PenLine,
  Layers,
} from "lucide-react";
import { Button } from "./ui/Button";
import { UnitSelectorModal } from "./ui/UnitSelectorModal";
import { previewImage } from "./ImagePreviewModal";
import { trackRecentUnit, useRecentUnits } from "../lib/unitUtils";
import { translateItemName } from "../services/translationService";
import { Item, Category, LanguageType } from "../types";
import { cn } from "../lib/utils";
import { compressImageFile } from "../utils/imageUtils";
import {
  getCategoryUsageMap,
  trackCategoryUsage,
  sortCategoriesByUsage,
  CategoryUsageEntry,
} from "../utils/categoryUsageUtils";

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
  const [isSubmittingCategory, setIsSubmittingCategory] = useState(false);
  const [isEditCategoryMode, setIsEditCategoryMode] = useState(false);
  const categorySearchInputRef = useRef<HTMLInputElement>(null);
  const notesTextareaRef = useRef<HTMLTextAreaElement>(null);
  const [isNotesFocused, setIsNotesFocused] = useState(false);

  React.useEffect(() => {
    if (notesTextareaRef.current) {
      notesTextareaRef.current.style.height = "auto";
      notesTextareaRef.current.style.height = `${Math.max(42, notesTextareaRef.current.scrollHeight)}px`;
    }
  }, [formData.notes]);

  const [categoryUsageMap, setCategoryUsageMap] = useState<
    Record<string, CategoryUsageEntry>
  >(() => getCategoryUsageMap());

  const selectedCategory = categories.find((c) => c.id === formData.categoryId);

  // Sorted by last used / most used / clicked count
  const sortedCategories = useMemo(() => {
    return sortCategoriesByUsage(categories, categoryUsageMap);
  }, [categories, categoryUsageMap]);

  const filteredCategories = useMemo(() => {
    const q = categorySearch.toLowerCase().trim();
    if (!q) return sortedCategories;
    return sortedCategories.filter((c) => c.name.toLowerCase().includes(q));
  }, [sortedCategories, categorySearch]);

  const handleSelectCategory = (catId: string) => {
    if (catId) {
      trackCategoryUsage(catId);
      setCategoryUsageMap(getCategoryUsageMap());
    }
    setFormData((prev) => ({ ...prev, categoryId: catId }));
    setShowCategoryModal(false);
  };

  const handleAddCategoryFromSearch = async () => {
    const trimmed = categorySearch.trim();
    if (!trimmed) {
      categorySearchInputRef.current?.focus();
      return;
    }
    if (isSubmittingCategory) return;

    // Check if category already exists (case-insensitive)
    const existing = categories.find(
      (c) => c.name.toLowerCase().trim() === trimmed.toLowerCase(),
    );

    if (existing) {
      handleSelectCategory(existing.id);
      return;
    }

    try {
      setIsSubmittingCategory(true);
      if (onCreateCategory) {
        const created = await onCreateCategory(trimmed);
        if (created && typeof created === "object" && "id" in created) {
          handleSelectCategory((created as any).id);
        }
      }
      setCategorySearch("");
    } catch (err) {
      console.error("Failed to create category from search", err);
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
            {/* Header row: 01 Name on left, Category badge on right (no wrapping, fits on all iPhones & mobile devices) */}
            <div className="flex items-center justify-between gap-1.5 sm:gap-3 px-0.5 min-w-0">
              <label
                htmlFor="item-name-input"
                className="flex items-center gap-1.5 sm:gap-2 text-xs font-black uppercase tracking-wider text-[var(--primary)] shrink-0 cursor-pointer min-w-0"
              >
                <span className="w-5 h-5 rounded-md bg-[var(--primary)] text-[var(--primary-foreground)] flex items-center justify-center text-[10px] font-black shadow-xs shrink-0">
                  01
                </span>{" "}
                <span className="truncate">Name(सामान का नाम)</span>
              </label>

              {/* Category in a dedicated responsive border box: shows Tag icon on mobile, category text on desktop */}
              <button
                type="button"
                onClick={() => {
                  setCategorySearch("");
                  setCategoryUsageMap(getCategoryUsageMap());
                  setIsEditCategoryMode(false);
                  setShowCategoryModal(true);
                }}
                className="inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 rounded-xl border border-[var(--border)] bg-[var(--background)] hover:border-[var(--primary)]/50 hover:bg-[var(--card)] transition-all cursor-pointer shadow-2xs active:scale-95 group shrink-0 min-w-0 max-w-[50%]"
                title="Click to select or manage category"
              >
                {/* Category Icon: always visible so purpose is immediately clear even on smaller devices */}
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-zinc-400 dark:text-zinc-500 group-hover:text-[var(--primary)] transition-colors shrink-0"
                >
                  <path d="M12 2l10 5-10 5-10-5 10-5z" />
                  <path d="M2 12l10 5 10-5" />
                  <path d="M2 17l10 5 10-5" />
                </svg>

                {/* "category:" label: hidden on small screens to save space, visible on tablet/desktop */}
                <span className="hidden sm:inline text-[10px] font-black uppercase tracking-wider text-zinc-500 dark:text-zinc-400 shrink-0">
                  category:
                </span>

                {/* Category Name: always in capital letters, truncated cleanly on mobile so it never goes off-screen */}
                <span
                  className={cn(
                    "truncate max-w-[80px] xs:max-w-[110px] sm:max-w-[170px] font-black text-xs uppercase tracking-wide",
                    selectedCategory
                      ? "text-[var(--primary)]"
                      : "text-zinc-500 font-bold",
                  )}
                >
                  {selectedCategory ? selectedCategory.name.toUpperCase() : "SELECT"}
                </span>

                <ChevronRight
                  size={12}
                  className="text-zinc-400 group-hover:text-[var(--primary)] group-hover:translate-x-0.5 transition-all shrink-0 ml-0.5"
                />
              </button>
            </div>
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
                        const next =
                          document.getElementById("item-notes-textarea") ||
                          document.getElementById("item-qty-input");
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
           
            <div className="space-y-3">
              {/* 1. Distinct Notes & Remarks Notepad Card (FIRST) */}
              <div
                className={cn(
                  "rounded-xl border p-2.5 sm:p-3 space-y-2 transition-all duration-200 shadow-2xs",
                  isNotesFocused
                    ? "border-[var(--primary)]/50 ring-2 ring-[var(--primary)]/15 bg-white dark:bg-zinc-900/95 shadow-sm"
                    : "border-slate-200 dark:border-zinc-800 [data-theme]:border-[var(--border)] bg-slate-50/80 dark:bg-zinc-900/60 [data-theme]:bg-[var(--card)]/70"
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span
                      className={cn(
                        "w-5 h-5 rounded-md flex items-center justify-center shrink-0 transition-colors duration-150",
                        isNotesFocused
                          ? "bg-[var(--primary)] text-white shadow-xs"
                          : "bg-slate-200/70 dark:bg-zinc-800 [data-theme]:bg-[var(--muted)] text-slate-600 dark:text-slate-300"
                      )}
                    >
                      <FileText size={11} strokeWidth={2.3} />
                    </span>
                    <span
                      className={cn(
                        "text-[11px] uppercase tracking-wider transition-colors duration-150",
                        isNotesFocused
                          ? "font-extrabold text-[var(--primary)]"
                          : "font-bold text-slate-500 dark:text-slate-400 [data-theme]:text-[var(--muted-foreground)]"
                      )}
                    >
                      Extra Info
                    </span>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium italic hidden md:inline-block truncate">
                      (Supplier, rack, or batch)
                    </span>
                  </div>

                  {/* Dedicated OPTIONAL badge at the right corner */}
                  <span
                    className={cn(
                      "text-[9.5px] uppercase tracking-wider px-2 py-0.5 rounded-full border shrink-0 transition-all duration-150 select-none",
                      isNotesFocused
                        ? "border-[var(--primary)]/40 bg-[var(--primary)]/15 text-[var(--primary)] font-extrabold shadow-2xs"
                        : "border-slate-200/90 dark:border-zinc-700 bg-slate-100/90 dark:bg-zinc-800/80 text-slate-500 dark:text-slate-400 font-bold"
                    )}
                  >
                    Optional
                  </span>
                </div>

                <div className="relative">
                  <PenLine
                    size={13}
                    className={cn(
                      "absolute left-3 top-3 pointer-events-none transition-colors duration-150",
                      isNotesFocused
                        ? "text-[var(--primary)]"
                        : "text-slate-400 dark:text-slate-500"
                    )}
                  />
                  <textarea
                    ref={notesTextareaRef}
                    id="item-notes-textarea"
                    rows={1}
                    placeholder="Supplier name, rack location, batch number, or memo..."
                    value={formData.notes || ""}
                    onFocus={() => setIsNotesFocused(true)}
                    onBlur={() => setIsNotesFocused(false)}
                    onChange={(e) => {
                      const target = e.target;
                      target.style.height = "auto";
                      target.style.height = `${Math.max(42, target.scrollHeight)}px`;
                      setFormData((prev) => ({ ...prev, notes: target.value }));
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        if (!formData.notes || formData.notes.trim() === "") {
                          e.preventDefault();
                          const next = document.getElementById("item-qty-input");
                          next?.focus();
                          if (next && "select" in next) (next as any).select();
                        }
                      } else if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                        e.preventDefault();
                        const next = document.getElementById("item-qty-input");
                        next?.focus();
                        if (next && "select" in next) (next as any).select();
                      }
                    }}
                    className={cn(
                      "w-full min-h-[42px] max-h-48 py-2.5 pl-8.5 pr-3 rounded-lg border font-medium text-xs transition-all resize-none leading-relaxed",
                      isNotesFocused
                        ? "border-[var(--primary)] ring-2 ring-[var(--primary)]/20 bg-white dark:bg-zinc-950 text-[var(--foreground)] placeholder:text-slate-400 shadow-2xs"
                        : "border-slate-200/90 dark:border-zinc-800 [data-theme]:border-[var(--border)] bg-white dark:bg-zinc-950/80 [data-theme]:bg-[var(--background)] text-[var(--foreground)] placeholder:text-slate-400 dark:placeholder:text-zinc-500 shadow-2xs"
                    )}
                  />
                </div>
              </div>

              {/* 2. Unified 3-Part Single Horizontal Strip: Stock Qty | Unit | Low Stock Alert */}
              <div className="flex items-center h-10 rounded-xl border border-[var(--border)] bg-[var(--background)] focus-within:border-[var(--primary)] focus-within:ring-1 focus-within:ring-[var(--primary)]/20 transition-all overflow-hidden shadow-2xs">
                {/* Part 1: Stock Quantity */}
                <div className="flex-1 min-w-0 flex items-center h-full pl-2.5 sm:pl-3">
                  <div className="flex items-center gap-1 shrink-0 select-none">
                    <Layers size={12} className="text-teal-600 dark:text-teal-400 shrink-0" />
                    <span className="text-[10px] sm:text-[10.5px] font-black uppercase tracking-wider text-teal-800 dark:text-teal-300">
                      Stock:
                    </span>
                  </div>
                  <input
                    type="number"
                    step="any"
                    id="item-qty-input"
                    placeholder="0"
                    className="flex-1 min-w-0 h-full bg-transparent px-2 font-black text-sm text-[var(--foreground)] focus:outline-none placeholder:opacity-25"
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
                </div>

                {/* Part 2: Unit Selector Button (Center Divider) */}
                <button
                  type="button"
                  id="item-unit-btn"
                  tabIndex={0}
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
                  className="h-full px-2.5 sm:px-3 bg-[var(--card)] hover:bg-[var(--foreground)]/5 border-x border-[var(--border)] text-[10.5px] sm:text-xs font-black uppercase text-black dark:text-white flex items-center gap-1 cursor-pointer shrink-0 transition-colors focus:ring-1 focus:ring-[var(--primary)] focus:outline-none select-none"
                  title="Change unit (click to select)"
                >
                  <span className="truncate max-w-[48px] sm:max-w-none text-black dark:text-white font-black">
                    {formData.unit}
                  </span>
                  <ChevronDown
                    size={10}
                    className="text-black dark:text-white opacity-80 shrink-0 stroke-[2.5]"
                  />
                </button>

                {/* Part 3: Low Stock Alert */}
                <div className="flex-1 min-w-0 flex items-center h-full pl-2 sm:pl-2.5 pr-2">
                  <div className="flex items-center gap-1 shrink-0 select-none">
                    <Bell size={12} className="text-amber-500 fill-amber-500/30 shrink-0" />
                    <span className="text-[10px] sm:text-[10.5px] font-black uppercase tracking-wider text-amber-800 dark:text-amber-300">
                      Alert:
                    </span>
                  </div>
                  <input
                    type="number"
                    step="any"
                    id="item-min-stock-input"
                    placeholder="10"
                    className="flex-1 min-w-0 h-full bg-transparent px-2 font-black text-sm text-[var(--foreground)] focus:outline-none placeholder:opacity-25"
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
                </div>
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
                  badgeClass: "bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border-emerald-500/25",
                  dotColor: "bg-emerald-500",
                  nextInputId: "item-price-wholesalePrice",
                },
                {
                  label: t.wholesale,
                  key: "wholesalePrice",
                  unitKey: "wholesalePriceUnit",
                  selection: "wholesale",
                  badgeClass: "bg-blue-500/10 dark:bg-blue-500/20 text-blue-800 dark:text-blue-300 border-blue-500/25",
                  dotColor: "bg-blue-500",
                  nextInputId: "item-price-buyingPrice",
                },
                {
                  label: t.buy,
                  key: "buyingPrice",
                  unitKey: "buyingPriceUnit",
                  selection: "buy",
                  badgeClass: "bg-orange-500/10 dark:bg-orange-500/20 text-orange-800 dark:text-orange-300 border-orange-500/25",
                  dotColor: "bg-orange-500",
                  nextInputId: "item-save-btn",
                },
              ].map((field) => (
                <div key={field.key} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className={cn("inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border text-[10.5px] font-black uppercase tracking-wider", field.badgeClass)}>
                      <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", field.dotColor)} />
                      {field.label}
                    </p>
                  </div>
                  {/* Unified Input with Unit Button on the Right Side */}
                  <div className="flex items-center h-[52px] rounded-2xl border-2 border-[var(--border)] bg-[var(--background)] focus-within:border-[var(--primary)] focus-within:ring-2 focus-within:ring-[var(--primary)]/15 transition-all shadow-inner overflow-hidden group">
                    <span className="pl-3.5 sm:pl-4 font-black text-lg sm:text-xl text-[var(--foreground)] opacity-40 group-focus-within:opacity-90 group-focus-within:text-[var(--primary)] transition-all select-none shrink-0">
                      {field.key === "profitMargin" ? "%" : "₹"}
                    </span>
                    <input
                      type="number"
                      step="any"
                      id={`item-price-${field.key}`}
                      placeholder="0.00"
                      className="flex-1 min-w-0 h-full bg-transparent px-2.5 font-black text-base sm:text-lg text-[var(--foreground)] focus:outline-none transition-all placeholder:opacity-25"
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
                        className="h-full px-3 sm:px-3.5 border-l border-[var(--border)] bg-[var(--card)] hover:bg-black/5 dark:hover:bg-white/5 text-black dark:text-white font-black uppercase text-[11px] sm:text-xs tracking-wider flex items-center gap-1.5 transition-all cursor-pointer select-none shrink-0 active:scale-95 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[var(--primary)]"
                        title="Change unit (click or press Enter to select)"
                      >
                        <span className="truncate max-w-[65px] sm:max-w-[85px] text-black dark:text-white font-black">
                          / {(formData as any)[field.unitKey]}
                        </span>
                        <ChevronDown size={11} className="text-black dark:text-white opacity-80 shrink-0 stroke-[2.5]" />
                      </button>
                    )}
                  </div>
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
                <div className="flex items-center justify-between gap-2 p-3.5 pb-2.5 border-b border-[var(--border)] shrink-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="text-[var(--primary)] shrink-0"
                    >
                      <path d="M12 2l10 5-10 5-10-5 10-5z" />
                      <path d="M2 12l10 5 10-5" />
                      <path d="M2 17l10 5 10-5" />
                    </svg>
                    <h3 className="text-xs sm:text-sm font-black text-[var(--foreground)] uppercase tracking-wider shrink-0">
                      Categories
                    </h3>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {/* "Manage" button on the right side */}
                    <button
                      type="button"
                      onClick={() => setIsEditCategoryMode(!isEditCategoryMode)}
                      className={cn(
                        "h-6.5 px-2.5 rounded-lg border text-[10.5px] font-bold flex items-center gap-1 transition-all cursor-pointer shrink-0",
                        isEditCategoryMode
                          ? "border-rose-500 bg-rose-500/10 text-rose-600 dark:text-rose-400"
                          : "border-[var(--border)] bg-[var(--card)] hover:bg-black/5 dark:hover:bg-white/5 text-[var(--foreground)]",
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

                    <button
                      type="button"
                      onClick={() => setShowCategoryModal(false)}
                      className="w-6.5 h-6.5 rounded-lg bg-[var(--background)] hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 flex items-center justify-center transition-colors cursor-pointer shrink-0"
                      title="Close"
                    >
                      <X size={13} />
                    </button>
                  </div>
                </div>

                {/* Search Bar with +Add Button inside on the right */}
                <div className="p-3 border-b border-[var(--border)] shrink-0 bg-[var(--background)]/40">
                  <div className="relative flex items-center">
                    <Search
                      size={14}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none"
                    />
                    <input
                      ref={categorySearchInputRef}
                      type="text"
                      placeholder="Search or add category..."
                      value={categorySearch}
                      onChange={(e) => setCategorySearch(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddCategoryFromSearch();
                        }
                      }}
                      className="w-full h-9 pl-9 pr-24 rounded-xl border border-[var(--border)] bg-[var(--card)] font-medium text-xs text-[var(--foreground)] placeholder:text-zinc-400 focus:border-[var(--primary)] focus:outline-none transition-all shadow-inner"
                      autoFocus
                    />

                    {/* Right side controls: Clear (if typed) + "+ Add" button */}
                    <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
                      {categorySearch && (
                        <button
                          type="button"
                          onClick={() => setCategorySearch("")}
                          className="p-1 rounded-md text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer"
                          title="Clear search"
                        >
                          <X size={12} />
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={handleAddCategoryFromSearch}
                        disabled={isSubmittingCategory}
                        className={cn(
                          "h-6.5 px-2.5 rounded-lg font-bold text-xs flex items-center gap-1 transition-all cursor-pointer shadow-xs active:scale-95 shrink-0",
                          categorySearch.trim()
                            ? "bg-[var(--primary)] hover:opacity-90 text-white"
                            : "bg-[var(--primary)]/10 hover:bg-[var(--primary)] text-[var(--primary)] hover:text-white",
                        )}
                        title={
                          categorySearch.trim()
                            ? `Add "${categorySearch.trim()}"`
                            : "Type category name and click Add"
                        }
                      >
                        {isSubmittingCategory ? (
                          <Loader2 size={11} className="animate-spin" />
                        ) : (
                          <Plus size={12} strokeWidth={2.5} />
                        )}
                        <span>Add</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Category Pill / Chip Cloud */}
                <div className="p-3 overflow-y-auto max-h-[300px] flex flex-wrap gap-1.5 no-scrollbar content-start">
                  {/* None / Clear Option */}
                  <button
                    type="button"
                    onClick={() => handleSelectCategory("")}
                    className={cn(
                      "h-8 px-3 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs active:scale-95 uppercase tracking-wide",
                      !formData.categoryId
                        ? "bg-[var(--primary)] text-white font-black shadow-xs"
                        : "bg-[var(--background)] hover:bg-[var(--card)] text-zinc-500 border border-[var(--border)]",
                    )}
                  >
                    <span>NONE</span>
                    {!formData.categoryId && <Check size={12} strokeWidth={2.5} className="shrink-0" />}
                  </button>

                  {filteredCategories.map((cat) => {
                    const isSelected = formData.categoryId === cat.id;
                    return (
                      <div
                        key={cat.id}
                        className={cn(
                          "relative inline-flex items-center rounded-full transition-all group",
                          isSelected
                            ? "bg-[var(--primary)] text-white shadow-xs"
                            : "bg-[var(--background)] hover:bg-[var(--card)] text-[var(--foreground)] border border-[var(--border)]",
                        )}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            if (!isEditCategoryMode) {
                              handleSelectCategory(cat.id);
                            }
                          }}
                          className={cn(
                            "h-8 flex items-center gap-1.5 text-xs font-semibold cursor-pointer active:scale-95 transition-transform",
                            isEditCategoryMode ? "pl-3 pr-1.5" : "px-3",
                            isSelected && "font-black",
                          )}
                        >
                          <span className="truncate max-w-[140px] uppercase font-bold tracking-wide">
                            {cat.name.toUpperCase()}
                          </span>
                          {isSelected && !isEditCategoryMode && (
                            <Check size={12} strokeWidth={2.5} className="text-white shrink-0" />
                          )}
                        </button>

                        {isEditCategoryMode && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleInlineDeleteCategory(cat.id);
                            }}
                            className="w-5 h-5 mr-1.5 rounded-full bg-rose-500/20 hover:bg-rose-500 text-rose-500 hover:text-white flex items-center justify-center transition-colors cursor-pointer shrink-0"
                            title={`Delete ${cat.name}`}
                          >
                            <Trash2 size={10} strokeWidth={2.5} />
                          </button>
                        )}
                      </div>
                    );
                  })}

                  {filteredCategories.length === 0 && (
                    <div className="w-full py-6 text-center text-xs text-zinc-400 space-y-2.5">
                      <p>No category matching "{categorySearch.trim().toUpperCase()}"</p>
                      {categorySearch.trim() && (
                        <button
                          type="button"
                          onClick={handleAddCategoryFromSearch}
                          disabled={isSubmittingCategory}
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[var(--primary)] text-white text-xs font-bold hover:opacity-90 transition-all cursor-pointer shadow-xs active:scale-95 uppercase tracking-wide"
                        >
                          {isSubmittingCategory ? (
                            <Loader2 size={12} className="animate-spin" />
                          ) : (
                            <Plus size={12} strokeWidth={2.5} />
                          )}
                          <span>Add "{categorySearch.trim().toUpperCase()}"</span>
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
