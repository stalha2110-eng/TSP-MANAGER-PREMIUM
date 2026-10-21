import React from 'react';
import { motion } from 'motion/react';
import { Check, Loader2, FileSpreadsheet, FileText, Sparkles } from 'lucide-react';

interface ExportProgressOverlayProps {
  format: 'excel' | 'pdf' | null;
  progress: number;
  currentStep: string;
  completedSteps: string[];
}

const EXCEL_STEPS = [
  "Initializing export engine...",
  "Reading and parsing product data...",
  "Structuring spreadsheet rows and headers...",
  "Applying freeze-pane view configurations...",
  "Calibrating column widths and cell alignments...",
  "Generating and packing Excel workbook...",
  "Initiating file download to device..."
];

const PDF_STEPS = [
  "Initializing PDF vector engine...",
  "Constructing core document structure...",
  "Designing brand header & document metadata...",
  "Rendering product tables & cell alignments...",
  "Computing multi-page flow and pagination...",
  "Saving and initiating file download..."
];

export function ExportProgressOverlay({
  format,
  progress,
  currentStep,
  completedSteps
}: ExportProgressOverlayProps) {
  if (!format) return null;

  const steps = format === 'excel' ? EXCEL_STEPS : PDF_STEPS;
  const isExcel = format === 'excel';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/85 backdrop-blur-xl"
    >
      <motion.div
        initial={{ scale: 0.95, y: 15 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 15 }}
        transition={{ type: "spring", duration: 0.5 }}
        className="w-full max-w-md bg-[var(--background)] rounded-[2.5rem] border border-[var(--border)] shadow-2xl overflow-hidden flex flex-col p-6 sm:p-8 space-y-6"
      >
        {/* Header Visual with Glowing Accent */}
        <div className="text-center space-y-3 relative">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-12 w-24 h-24 bg-gradient-to-br from-[var(--primary)] to-purple-500 rounded-full blur-2xl opacity-20 pointer-events-none" />
          
          <div className="mx-auto w-14 h-14 rounded-2xl flex items-center justify-center relative shadow-lg">
            {isExcel ? (
              <>
                <div className="absolute inset-0 bg-emerald-500/10 rounded-2xl border border-emerald-500/20" />
                <FileSpreadsheet className="text-emerald-500 relative z-10" size={28} />
              </>
            ) : (
              <>
                <div className="absolute inset-0 bg-red-500/10 rounded-2xl border border-red-500/20" />
                <FileText className="text-red-500 relative z-10" size={28} />
              </>
            )}
          </div>

          <div className="space-y-1">
            <h3 className="text-lg font-black tracking-tight uppercase text-[var(--foreground)]">
              {isExcel ? "Exporting Spreadsheet" : "Generating PDF Document"}
            </h3>
            <p className="text-[10px] font-black uppercase tracking-widest text-[var(--foreground)]/40 flex items-center justify-center gap-1">
              <Sparkles size={10} className="text-amber-400" />
              TS Price Manager Core Engine
            </p>
          </div>
        </div>

        {/* Circular Progress & Numerical Indicator */}
        <div className="flex flex-col items-center justify-center py-2">
          <div className="relative w-28 h-28 flex items-center justify-center">
            {/* SVG Circle Track */}
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="40"
                stroke="currentColor"
                strokeWidth="6"
                fill="transparent"
                className="text-[var(--border)]"
              />
              <motion.circle
                cx="50"
                cy="50"
                r="40"
                stroke={isExcel ? "rgb(16, 185, 129)" : "rgb(239, 68, 68)"}
                strokeWidth="6"
                fill="transparent"
                strokeDasharray="251.2"
                initial={{ strokeDashoffset: 251.2 }}
                animate={{ strokeDashoffset: 251.2 - (251.2 * progress) / 100 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                strokeLinecap="round"
              />
            </svg>
            {/* Percentage Text */}
            <div className="absolute flex flex-col items-center justify-center">
              <span className="text-2xl font-black tracking-tighter text-[var(--foreground)]">
                {progress}%
              </span>
              <span className="text-[9px] font-bold text-[var(--foreground)]/50 uppercase tracking-widest">
                Progress
              </span>
            </div>
          </div>
        </div>

        {/* Active Step Indicator Banner */}
        <div className="p-4 rounded-2xl bg-[var(--foreground)]/5 border border-[var(--border)] flex items-center gap-3">
          <Loader2 className="animate-spin text-[var(--primary)] shrink-0" size={18} />
          <div className="min-w-0 flex-1">
            <div className="text-[9px] font-black uppercase tracking-wider text-[var(--foreground)]/40 leading-none mb-1">
              Active Task
            </div>
            <p className="text-xs font-black text-[var(--foreground)] truncate leading-tight">
              {currentStep}
            </p>
          </div>
        </div>

        {/* Professional Step Checklist */}
        <div className="space-y-2.5 max-h-[180px] overflow-y-auto pr-1">
          {steps.map((step, idx) => {
            const isCompleted = completedSteps.includes(step);
            const isActive = currentStep === step;

            return (
              <div
                key={idx}
                className={`flex items-center gap-3 transition-colors duration-200 ${
                  isActive
                    ? 'text-[var(--foreground)] font-bold'
                    : isCompleted
                    ? 'text-[var(--foreground)]/80'
                    : 'text-[var(--foreground)]/30'
                }`}
              >
                {/* Visual State Indicator */}
                <div className="relative flex items-center justify-center w-5 h-5 shrink-0">
                  {isCompleted ? (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="w-5 h-5 rounded-full bg-emerald-500/10 border border-emerald-500 text-emerald-500 flex items-center justify-center"
                    >
                      <Check size={10} strokeWidth={3} />
                    </motion.div>
                  ) : isActive ? (
                    <div className="w-5 h-5 rounded-full bg-[var(--primary)]/10 border border-[var(--primary)] flex items-center justify-center">
                      <div className="w-1.5 h-1.5 rounded-full bg-[var(--primary)] animate-pulse" />
                    </div>
                  ) : (
                    <div className="w-1.5 h-1.5 rounded-full bg-current opacity-60 ml-2" />
                  )}
                </div>

                <span className="text-xs leading-none select-none truncate">
                  {step}
                </span>
              </div>
            );
          })}
        </div>

        {/* Visual Info/Status Footer */}
        <p className="text-center text-[10px] text-[var(--foreground)]/30 font-medium leading-normal pt-2">
          Please do not close or minimize the application while the file is being compiled.
        </p>
      </motion.div>
    </motion.div>
  );
}
