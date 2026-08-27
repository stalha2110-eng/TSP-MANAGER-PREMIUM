import React from 'react';

/**
 * Base Shimmer Skeleton Primitive
 */
export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
  width?: string | number;
  height?: string | number;
  rounded?: 'none' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | 'full';
  animate?: boolean;
}

export function Skeleton({
  className = '',
  width,
  height,
  rounded = 'xl',
  animate = true,
  style,
  ...props
}: SkeletonProps) {
  const roundedClasses = {
    none: 'rounded-none',
    sm: 'rounded-sm',
    md: 'rounded-md',
    lg: 'rounded-lg',
    xl: 'rounded-xl',
    '2xl': 'rounded-2xl',
    '3xl': 'rounded-3xl',
    full: 'rounded-full',
  }[rounded];

  return (
    <div
      aria-hidden="true"
      className={`relative overflow-hidden bg-slate-200/80 dark:bg-slate-800/80 ${roundedClasses} ${
        animate ? 'before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1.8s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/30 dark:before:via-white/10 before:to-transparent' : ''
      } ${className}`}
      style={{
        width: width !== undefined ? (typeof width === 'number' ? `${width}px` : width) : undefined,
        height: height !== undefined ? (typeof height === 'number' ? `${height}px` : height) : undefined,
        ...style,
      }}
      {...props}
    />
  );
}

/**
 * Text Lines Skeleton
 */
export function SkeletonText({
  lines = 3,
  className = '',
  lastLineWidth = '60%',
}: {
  lines?: number;
  className?: string;
  lastLineWidth?: string;
}) {
  return (
    <div className={`space-y-2.5 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          height={14}
          rounded="md"
          className="w-full"
          style={{
            width: i === lines - 1 && lines > 1 ? lastLineWidth : '100%',
          }}
        />
      ))}
    </div>
  );
}

/**
 * Metric/Stat Card Skeleton
 */
export function SkeletonMetricCard({ className = '' }: { className?: string }) {
  return (
    <div className={`p-4 rounded-2xl bg-[var(--card,white)] border border-[var(--border,rgba(0,0,0,0.08))] shadow-xs space-y-3 ${className}`}>
      <div className="flex items-center justify-between">
        <Skeleton width={90} height={12} rounded="md" />
        <Skeleton width={32} height={32} rounded="lg" />
      </div>
      <Skeleton width={120} height={28} rounded="lg" />
      <div className="flex items-center gap-2 pt-1">
        <Skeleton width={50} height={14} rounded="full" />
        <Skeleton width={80} height={10} rounded="md" />
      </div>
    </div>
  );
}

/**
 * Product Card Skeleton for Catalog
 */
export function SkeletonProductCard() {
  return (
    <div className="p-4 rounded-2xl bg-[var(--card,white)] border border-[var(--border,rgba(0,0,0,0.08))] shadow-xs space-y-3.5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <Skeleton width={44} height={44} rounded="xl" />
          <div className="space-y-1.5">
            <Skeleton width={110} height={16} rounded="md" />
            <Skeleton width={70} height={12} rounded="sm" />
          </div>
        </div>
        <Skeleton width={24} height={24} rounded="full" />
      </div>
      <div className="pt-2 border-t border-[var(--border,rgba(0,0,0,0.06))] flex items-center justify-between">
        <div className="space-y-1">
          <Skeleton width={40} height={10} rounded="sm" />
          <Skeleton width={75} height={20} rounded="md" />
        </div>
        <Skeleton width={80} height={32} rounded="xl" />
      </div>
    </div>
  );
}

/**
 * Catalog Screen Skeleton
 */
export function SkeletonCatalog() {
  return (
    <div className="space-y-5 animate-fadeIn">
      {/* Search & Actions Bar Skeleton */}
      <div className="flex flex-col sm:flex-row gap-3 justify-between items-stretch">
        <Skeleton height={46} rounded="2xl" className="w-full sm:max-w-md" />
        <div className="flex items-center gap-2">
          <Skeleton width={110} height={46} rounded="2xl" />
          <Skeleton width={120} height={46} rounded="2xl" />
        </div>
      </div>

      {/* Category Pills Skeleton */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} width={i === 0 ? 70 : 100} height={36} rounded="full" className="shrink-0" />
        ))}
      </div>

      {/* Product Grid Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <SkeletonProductCard key={i} />
        ))}
      </div>
    </div>
  );
}

/**
 * POS Billing Terminal Skeleton
 */
export function SkeletonPOS() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fadeIn">
      {/* Left Items Grid */}
      <div className="lg:col-span-7 space-y-4">
        <Skeleton height={46} rounded="2xl" className="w-full" />
        <div className="flex gap-2 overflow-x-auto pb-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} width={90} height={34} rounded="full" className="shrink-0" />
          ))}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="p-3 rounded-2xl bg-[var(--card,white)] border border-[var(--border,rgba(0,0,0,0.08))] space-y-2">
              <Skeleton height={36} rounded="xl" className="w-full" />
              <Skeleton height={14} width="70%" rounded="md" />
              <Skeleton height={18} width="40%" rounded="md" />
            </div>
          ))}
        </div>
      </div>

      {/* Right Order Summary Receipt Panel */}
      <div className="lg:col-span-5 p-5 rounded-3xl bg-[var(--card,white)] border border-[var(--border,rgba(0,0,0,0.08))] shadow-lg space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[var(--border,rgba(0,0,0,0.08))]">
          <Skeleton width={130} height={22} rounded="lg" />
          <Skeleton width={60} height={24} rounded="full" />
        </div>
        
        {/* Cart Item Rows */}
        <div className="space-y-3 py-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between">
              <div className="space-y-1">
                <Skeleton width={120} height={14} rounded="md" />
                <Skeleton width={60} height={10} rounded="sm" />
              </div>
              <Skeleton width={70} height={18} rounded="md" />
            </div>
          ))}
        </div>

        {/* Totals Box */}
        <div className="pt-4 border-t border-[var(--border,rgba(0,0,0,0.08))] space-y-2.5">
          <div className="flex justify-between">
            <Skeleton width={80} height={12} rounded="sm" />
            <Skeleton width={60} height={12} rounded="sm" />
          </div>
          <div className="flex justify-between">
            <Skeleton width={90} height={12} rounded="sm" />
            <Skeleton width={50} height={12} rounded="sm" />
          </div>
          <div className="flex justify-between pt-2">
            <Skeleton width={100} height={24} rounded="md" />
            <Skeleton width={90} height={28} rounded="lg" />
          </div>
        </div>

        <Skeleton height={52} rounded="2xl" className="w-full mt-2" />
      </div>
    </div>
  );
}

/**
 * Sales Analytics Dashboard Skeleton
 */
export function SkeletonAnalytics() {
  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Filter Header */}
      <div className="flex justify-between items-center">
        <Skeleton width={160} height={28} rounded="xl" />
        <Skeleton width={140} height={38} rounded="2xl" />
      </div>

      {/* 4 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonMetricCard key={i} />
        ))}
      </div>

      {/* Chart Canvas Skeleton */}
      <div className="p-5 rounded-3xl bg-[var(--card,white)] border border-[var(--border,rgba(0,0,0,0.08))] shadow-xs space-y-4">
        <div className="flex justify-between items-center">
          <Skeleton width={180} height={20} rounded="lg" />
          <Skeleton width={100} height={30} rounded="full" />
        </div>
        <Skeleton height={220} rounded="2xl" className="w-full" />
      </div>

      {/* Table/List Skeleton */}
      <div className="p-5 rounded-3xl bg-[var(--card,white)] border border-[var(--border,rgba(0,0,0,0.08))] space-y-3">
        <Skeleton width={150} height={18} rounded="lg" />
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between py-2 border-b border-[var(--border,rgba(0,0,0,0.05))]">
            <div className="flex items-center gap-3">
              <Skeleton width={36} height={36} rounded="xl" />
              <div className="space-y-1">
                <Skeleton width={110} height={14} rounded="md" />
                <Skeleton width={70} height={10} rounded="sm" />
              </div>
            </div>
            <Skeleton width={80} height={18} rounded="md" />
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Udhar Ledger Skeleton
 */
export function SkeletonUdhar() {
  return (
    <div className="space-y-5 animate-fadeIn">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <SkeletonMetricCard key={i} />
        ))}
      </div>

      <div className="flex gap-3">
        <Skeleton height={46} rounded="2xl" className="w-full" />
        <Skeleton width={130} height={46} rounded="2xl" />
      </div>

      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="p-4 rounded-2xl bg-[var(--card,white)] border border-[var(--border,rgba(0,0,0,0.08))] flex items-center justify-between">
            <div className="flex items-center gap-3.5">
              <Skeleton width={44} height={44} rounded="full" />
              <div className="space-y-1.5">
                <Skeleton width={130} height={16} rounded="md" />
                <Skeleton width={90} height={12} rounded="sm" />
              </div>
            </div>
            <div className="text-right space-y-1">
              <Skeleton width={80} height={18} rounded="md" />
              <Skeleton width={60} height={10} rounded="sm" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Login Screen Skeleton
 */
export function SkeletonLogin() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-950 text-white">
      <div className="w-full max-w-md p-8 rounded-3xl bg-slate-900/90 border border-white/10 shadow-2xl space-y-6 text-center">
        <div className="flex justify-center">
          <Skeleton width={72} height={72} rounded="2xl" className="bg-slate-800" />
        </div>
        <div className="space-y-2 flex flex-col items-center">
          <Skeleton width={200} height={28} rounded="xl" className="bg-slate-800" />
          <Skeleton width={140} height={14} rounded="md" className="bg-slate-800" />
        </div>
        <div className="space-y-4 pt-4">
          <Skeleton height={48} rounded="2xl" className="w-full bg-slate-800" />
          <Skeleton height={48} rounded="2xl" className="w-full bg-slate-800" />
        </div>
        <div className="pt-2 flex justify-center">
          <Skeleton width={180} height={12} rounded="md" className="bg-slate-800" />
        </div>
      </div>
    </div>
  );
}

/**
 * Full Web Application Skeleton
 * Used during initial hydration/auth checking so the user sees the real layout loading
 */
export function AppFullSkeleton({ theme = 'dark' }: { theme?: string }) {
  return (
    <div data-theme={theme} className="min-h-screen bg-[var(--background,#0b0f19)] text-[var(--foreground,#f8fafc)] p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* App Header Skeleton */}
      <div className="flex items-center justify-between p-4 rounded-2xl bg-[var(--card,rgba(255,255,255,0.05))] border border-[var(--border,rgba(255,255,255,0.1))]">
        <div className="flex items-center gap-3">
          <Skeleton width={42} height={42} rounded="xl" />
          <div className="space-y-1.5">
            <Skeleton width={140} height={18} rounded="md" />
            <Skeleton width={90} height={11} rounded="sm" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Skeleton width={38} height={38} rounded="xl" />
          <Skeleton width={38} height={38} rounded="xl" />
          <Skeleton width={90} height={38} rounded="xl" />
        </div>
      </div>

      {/* Hero Stats Skeleton */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonMetricCard key={i} />
        ))}
      </div>

      {/* Main Content Catalog Skeleton */}
      <SkeletonCatalog />

      {/* Bottom Sticky Navigation Skeleton */}
      <div className="fixed bottom-3 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-md h-16 rounded-full bg-[var(--card,rgba(15,23,42,0.9))] border border-[var(--border,rgba(255,255,255,0.1))] backdrop-blur-xl flex items-center justify-around px-4 shadow-2xl">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} width={36} height={36} rounded="full" />
        ))}
      </div>
    </div>
  );
}
