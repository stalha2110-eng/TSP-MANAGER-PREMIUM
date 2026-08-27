import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Trophy, TrendingUp, Coins, ReceiptText, Users, Package, 
  CalendarDays, Download, Award, ChevronDown, ChevronUp, Star, 
  Crown, Calendar, Medal, ArrowUpRight, Sparkles 
} from 'lucide-react';
import { AppState, Bill } from '../types';
import { 
  getCalculatedAchievements, 
  Milestone, 
  TimelineNode, 
  HallOfRecords, 
  MonthlyAchievementReport,
  downloadCertificateOfMilestone,
  ensureIsoString
} from '../lib/achievementUtils';
import { jsPDF } from 'jspdf';

const formatDateSafely = (dateVal: any, options?: Intl.DateTimeFormatOptions, fallback = 'Verified'): string => {
  if (!dateVal) return fallback;
  try {
    const d = new Date(dateVal);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString('en-IN', options);
    }
  } catch (err) {
    console.error("formatDateSafely error", err);
  }
  return fallback;
};

interface MilestonesTabProps {
  state: AppState;
  onShowCertificate?: (milestone: Milestone) => void;
  t?: any;
}

export default function MilestonesTab({ state, t = {} }: MilestonesTabProps) {
  const { milestones, timeline, hallOfRecords, monthlyReports, latestAchievement } = useMemo(() => {
    return getCalculatedAchievements(state);
  }, [state]);

  const [expandedReport, setExpandedReport] = useState<string | null>(
    monthlyReports && monthlyReports.length > 0 ? monthlyReports[0].key : null
  );

  const [selectedMilestoneInfo, setSelectedMilestoneInfo] = useState<Milestone | null>(null);

  const storeName = state.settings.storeName || "Our Retail Store";

  // Category statistics/aggregates
  const stats = useMemo(() => {
    const totalRev = state.bills?.reduce((sum, b) => sum + (b.total || 0), 0) || 0;
    const totalProfit = state.bills?.reduce((sum, b) => {
      let costOfGoods = 0;
      b.items?.forEach(it => { costOfGoods += (it.cost || 0) * it.quantity; });
      return sum + Math.max(0, b.total - costOfGoods);
    }, 0) || 0;
    const totalB = state.bills?.length || 0;
    const totalC = state.udharCustomers?.length || 0;
    const totalP = state.items?.length || 0;

    const billingDatesMap: { [key: string]: boolean } = {};
    state.bills?.forEach(b => {
      const isoTS = ensureIsoString(b.timestamp);
      if (isoTS) {
        billingDatesMap[isoTS.split('T')[0]] = true;
      }
    });
    const uniqueDaysCount = Object.keys(billingDatesMap).length;

    return {
      totalRev,
      totalProfit,
      totalB,
      totalC,
      totalP,
      uniqueDaysCount,
      unlockedCount: milestones.filter(m => m.isUnlocked).length,
      totalCount: milestones.length
    };
  }, [state, milestones]);

  // Format big currencies elegantly (Indian format)
  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-IN', {
      maximumFractionDigits: 0
    }).format(num);
  };

  const handleDownloadCertificate = (milestone: Milestone) => {
    downloadCertificateOfMilestone(storeName, milestone);
  };

  // Group achievements by category
  const groupedMilestones = useMemo(() => {
    const map: { [key: string]: Milestone[] } = {
      revenue: [],
      profit: [],
      billing: [],
      customer: [],
      inventory: [],
      consistency: []
    };
    milestones.forEach(m => {
      if (map[m.category]) {
        map[m.category].push(m);
      }
    });
    return map;
  }, [milestones]);

  const categoriesConfig = {
    revenue: {
      label: t.revenueMilestones || "Revenue Milestones",
      desc: t.grossSalesCheckpoints || "Gross sales value checkpoints",
      icon: <Coins className="text-rose-500" size={18} />,
      unit: "₹",
      totalValue: stats.totalRev,
      color: "border-rose-500/10",
      bg: "bg-rose-500",
      progressText: `₹${formatNumber(stats.totalRev)} ${t.generated || "Generated"}`
    },
    profit: {
      label: t.profitMilestones || "Profit milestones",
      desc: t.netComputedProfits || "Net computed business profits",
      icon: <TrendingUp className="text-emerald-500" size={18} />,
      unit: "₹",
      totalValue: stats.totalProfit,
      color: "border-emerald-500/10",
      bg: "bg-emerald-500",
      progressText: `₹${formatNumber(stats.totalProfit)} ${t.secured || "Secured"}`
    },
    billing: {
      label: t.billingMilestones || "Billing Milestones",
      desc: t.totalFinalizedInvoices || "Total finalized sales invoices",
      icon: <ReceiptText className="text-cyan-500" size={18} />,
      unit: "",
      totalValue: stats.totalB,
      color: "border-cyan-500/10",
      bg: "bg-cyan-500",
      progressText: `${stats.totalB} ${t.invoicesCompleted || "Invoices Completed"}`
    },
    customer: {
      label: t.customerGrowth || "Customer Growth",
      desc: t.uniqueCustomerLedgerAccounts || "Unique customer/ledger accounts",
      icon: <Users className="text-purple-500" size={18} />,
      unit: "",
      totalValue: stats.totalC,
      color: "border-purple-500/10",
      bg: "bg-purple-500",
      progressText: `${stats.totalC} ${t.customersAdded || "Customers Added"}`
    },
    inventory: {
      label: t.inventoryMilestones || "Inventory milestones",
      desc: t.overallVerifiedCatalogue || "Overall verified catalogue size",
      icon: <Package className="text-amber-500" size={18} />,
      unit: "",
      totalValue: stats.totalP,
      color: "border-amber-500/10",
      bg: "bg-amber-500",
      progressText: `${stats.totalP} ${t.catalogProducts || "Catalog Products"}`
    },
    consistency: {
      label: t.consistencyAchievements || "Consistency Achievements",
      desc: t.highlyPersistentTerminalUsage || "Highly persistent terminal usage days",
      icon: <CalendarDays className="text-indigo-500" size={18} />,
      unit: "",
      totalValue: stats.uniqueDaysCount,
      color: "border-indigo-500/10",
      bg: "bg-indigo-500",
      progressText: `${stats.uniqueDaysCount} ${t.daysActive || "Days Active"}`
    }
  };

  return (
    <div className="space-y-8 pb-16">
      
      {/* Overview Stat Widgets */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          {
            title: t.unlockedMilestones || "Unlocked Milestones",
            value: `${stats.unlockedCount} / ${stats.totalCount}`,
            desc: t.professionalTrackingUnlocked || "Professional tracking records unlocked",
            icon: <Trophy className="text-amber-500" size={20} />,
            color: "border-amber-500/10"
          },
          {
            title: t.storeJourneyLevel || "Store Journey Level",
            value: `${timeline.filter(t => t.isUnlocked).length} / ${timeline.length}`,
            desc: t.primaryGrowthCheckpoints || "Primary growth node checkpoints",
            icon: <Award className="text-indigo-500" size={20} />,
            color: "border-indigo-500/10"
          },
          {
            title: t.lifetimeInvoices || "Lifetime Invoices",
            value: formatNumber(stats.totalB),
            desc: t.finalizedSalesEvents || "Finalized sales ledger events",
            icon: <ReceiptText className="text-cyan-500" size={20} />,
            color: "border-cyan-500/10"
          },
          {
            title: t.uniqueActiveDays || "Unique Active Days",
            value: `${stats.uniqueDaysCount} ${t.days || "Days"}`,
            desc: t.activePosSalesRegisters || "Active POS sales registers",
            icon: <CalendarDays className="text-emerald-500" size={20} />,
            color: "border-emerald-500/10"
          }
        ].map((item, idx) => (
          <div 
            key={idx} 
            className="p-4 rounded-2xl bg-[var(--card)] border border-[var(--border)] relative overflow-hidden transition-all duration-300 hover:border-[var(--primary)]/30 group"
          >
            <div className="flex items-start justify-between">
              <div className="space-y-1.5 text-left">
                <span className="text-[10px] font-black uppercase tracking-wider text-[var(--foreground)]/40 group-hover:text-[var(--primary)] transition-colors">{item.title}</span>
                <p className="text-xl font-black font-mono tracking-tight text-[var(--foreground)]">{item.value}</p>
                <p className="text-[9px] font-medium opacity-50 uppercase tracking-widest">{item.desc}</p>
              </div>
              <div className="p-2 bg-[var(--foreground)]/[0.03] rounded-xl border border-[var(--border)] group-hover:scale-105 transition-transform">
                {item.icon}
              </div>
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--primary)]/10 scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
          </div>
        ))}
      </div>

      {/* Grid Layout of timeline & categorized progress */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Side: Store Growth Journey Timeline (5/12 Columns) */}
        <div className="lg:col-span-4 space-y-6">
          <div className="p-5 rounded-3xl bg-[var(--card)] border border-[var(--border)] flex flex-col h-full">
            <div className="flex items-center gap-2 pb-4 border-b border-[var(--border)] mb-6 text-left">
              <TrendingUp className="text-[var(--primary)]" size={18} />
              <div>
                <h4 className="font-extrabold text-xs text-[var(--foreground)] uppercase tracking-wider">📈 {t.storeGrowthJourney || "Store Growth Journey"}</h4>
                <p className="text-[9px] opacity-50 font-bold uppercase tracking-widest">{t.autoChronologicalRecords || "Automatic chronological records"}</p>
              </div>
            </div>

            {/* Timeline element */}
            <div className="relative pl-6 space-y-7 flex-1 border-l border-[var(--border)] ml-3 my-2 text-left">
              {timeline.map((node, idx) => {
                const isCompleted = node.isUnlocked;
                return (
                  <div key={`${node.id || 'node'}-${idx}`} className="relative group">
                    {/* Ring Node */}
                    <div className={`absolute -left-[31px] top-1 h-[9px] w-[9px] rounded-full border-2 transition-all duration-300 flex items-center justify-center ${
                      isCompleted 
                        ? 'bg-[var(--primary)] border-[var(--primary)] shadow-md shadow-[var(--primary)]/35' 
                        : 'bg-[var(--card)] border-[var(--border)] group-hover:border-[var(--foreground)]/30'
                    }`}>
                      {isCompleted && (
                        <div className="h-1 w-1 bg-white rounded-full animate-ping" />
                      )}
                    </div>

                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[10px] font-black uppercase tracking-wider ${
                          isCompleted ? 'text-[var(--foreground)]' : 'text-[var(--foreground)]/40'
                        }`}>
                          {node.title}
                        </span>
                        {isCompleted && (
                          <span className="text-[8px] font-mono shrink-0 bg-emerald-500/10 text-emerald-500 font-extrabold px-1 rounded uppercase">✔ {t.achieved || "Achieved"}</span>
                        )}
                      </div>
                      <p className="text-[9px] leading-snug text-[var(--foreground)]/45 uppercase tracking-wide font-medium">{node.description}</p>
                      
                      {node.unlockedAt && (
                        <p className="text-[8px] font-mono opacity-50 font-bold">
                          {formatDateSafely(node.unlockedAt, {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Side: Achievements progress and Category Progress Bars (8/12 Columns) */}
        <div className="lg:col-span-8 space-y-6">
          <div className="p-5 rounded-3xl bg-[var(--card)] border border-[var(--border)]">
            <div className="flex items-center justify-between pb-4 border-b border-[var(--border)] mb-6 text-left">
              <div className="flex items-center gap-2">
                <Trophy className="text-amber-500" size={18} />
                <div>
                  <h4 className="font-extrabold text-xs text-[var(--foreground)] uppercase tracking-wider">🏆 {t.liveOperationsBenchmarks || "Live Operations Benchmarks"}</h4>
                  <p className="text-[9px] opacity-50 font-bold uppercase tracking-widest">{t.calculatedAcrossSixMetrics || "Calculated across six distinct metrics"}</p>
                </div>
              </div>
              <span className="text-[9px] font-black font-mono tracking-wider text-[var(--primary)] bg-[var(--primary)]/10 px-2.5 py-1 rounded-lg uppercase">
                {t.automatic || "AUTOMATIC"}
              </span>
            </div>

            {/* Categorized List */}
            <div className="space-y-7">
              {Object.keys(categoriesConfig).map((catName) => {
                const config = categoriesConfig[catName as keyof typeof categoriesConfig];
                const itemsList = groupedMilestones[catName] || [];
                const highestAchieved = [...itemsList].reverse().find(m => m.isUnlocked);
                const nextMilestone = itemsList.find(m => !m.isUnlocked);
                
                // Track progress
                const currentValue = config.totalValue;
                const targetValue = nextMilestone ? nextMilestone.target : (highestAchieved ? highestAchieved.target : 1);
                const progressPct = Math.min(100, Math.floor((currentValue / targetValue) * 100));

                return (
                  <div key={catName} className="space-y-3.5 relative group border-b border-[var(--border)]/30 pb-6 last:border-0 last:pb-0 text-left">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 bg-[var(--foreground)]/[0.02] border border-[var(--border)] rounded-xl shrink-0">
                          {config.icon}
                        </div>
                        <div>
                          <h5 className="font-black text-[11px] uppercase tracking-wider text-[var(--foreground)]">{config.label}</h5>
                          <p className="text-[9px] opacity-45 uppercase tracking-widest leading-relaxed font-semibold">{config.desc}</p>
                        </div>
                      </div>

                      <div className="text-right sm:text-right flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 sm:gap-0">
                        <p className="text-[10px] font-black font-mono text-[var(--foreground)]">{config.progressText}</p>
                        {nextMilestone && (
                          <p className="text-[8px] font-extrabold text-[var(--foreground)]/40 uppercase tracking-widest">
                            {t.nextTarget || "Next Target"}: {config.unit}{formatNumber(nextMilestone.target)}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Modern Progress Bar */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center text-[8px] font-mono font-extrabold uppercase opacity-60">
                        <span>{t.progressTracker || "Progress Tracker"}</span>
                        <span>{progressPct}%</span>
                      </div>
                      <div className="h-2 w-full bg-[var(--foreground)]/[0.04] rounded-full border border-[var(--border)] overflow-hidden relative">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${progressPct}%` }}
                          transition={{ duration: 0.8, ease: "easeOut" }}
                          className={`h-full rounded-full ${config.bg} relative`}
                        >
                          <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent animate-pulse" />
                        </motion.div>
                      </div>
                    </div>

                    {/* Horizontal grid of sub milestones */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5 pt-2">
                      {itemsList.map((m, idx) => {
                        return (
                          <button
                            key={`${m.id || 'milestone'}-${idx}`}
                            onClick={() => setSelectedMilestoneInfo(m)}
                            className={`p-2.5 rounded-xl border text-left flex flex-col justify-between transition-all group/cell relative cursor-pointer outline-none ${
                              m.isUnlocked 
                                ? 'bg-gradient-to-br from-[var(--foreground)]/[0.01] to-[var(--foreground)]/[0.03] border-[var(--border)] hover:border-[var(--foreground)]/20 shadow-sm' 
                                : 'bg-transparent border-[var(--border)] opacity-35'
                            }`}
                          >
                            <span className="text-[9px] font-black uppercase tracking-wider text-[var(--foreground)] truncate pr-2.5">
                              {m.title.split(' ').slice(1).join(' ')}
                            </span>
                            <div className="mt-2 flex items-center justify-between">
                              <span className="text-[8px] font-bold font-mono opacity-60">
                                {config.unit}{formatNumber(m.target)}
                              </span>
                              {m.isUnlocked ? (
                                <Medal className="text-emerald-500 hover:scale-110 transition-transform" size={11} />
                              ) : (
                                <Crown className="opacity-30" size={11} />
                              )}
                            </div>
                            
                            {/* Download symbol indicator */}
                            {m.isUnlocked && (
                              <span 
                                title="Download Official Certificate"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDownloadCertificate(m);
                                }}
                                className="absolute top-1.5 right-1.5 text-[var(--foreground)]/30 hover:text-[var(--primary)] cursor-pointer pr-0.5"
                              >
                                <Download size={8} />
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Hall of Records & Monthly Reports */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Side: Business Hall of Records (7/12 Columns) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="p-5 rounded-3xl bg-[var(--card)] border border-[var(--border)] h-full">
            <div className="flex items-center justify-between pb-4 border-b border-[var(--border)] mb-6 text-left">
              <div className="flex items-center gap-2">
                <Star className="text-amber-500 fill-amber-500/10" size={18} />
                <div>
                  <h4 className="font-extrabold text-xs text-[var(--foreground)] uppercase tracking-wider">🏛 Business Hall of Records</h4>
                  <p className="text-[9px] opacity-50 font-bold uppercase tracking-widest">Lifetime benchmark events and metrics records</p>
                </div>
              </div>
            </div>

            {/* List of records */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
              {[
                {
                  label: "Highest Single Bill",
                  value: hallOfRecords.highestSingleBill ? `₹${formatNumber(hallOfRecords.highestSingleBill)}` : "No bills recorded",
                  sub: hallOfRecords.highestSingleBillDate 
                    ? formatDateSafely(hallOfRecords.highestSingleBillDate, { day: 'numeric', month: 'short', year: 'numeric' }, "No transactions")
                    : "No transactions",
                  icon: <ReceiptText className="text-rose-500" size={18} />
                },
                {
                  label: "Highest Daily Sale",
                  value: hallOfRecords.highestDailySale ? `₹${formatNumber(hallOfRecords.highestDailySale)}` : "No bills recorded",
                  sub: hallOfRecords.highestDailySaleDate 
                    ? formatDateSafely(hallOfRecords.highestDailySaleDate, { day: 'numeric', month: 'short', year: 'numeric' }, "No transactions")
                    : "No transactions",
                  icon: <TrendingUp className="text-emerald-500" size={18} />
                },
                {
                  label: "Highest Monthly Profit",
                  value: hallOfRecords.highestMonthlyProfit ? `₹${formatNumber(hallOfRecords.highestMonthlyProfit)}` : "No profit reports",
                  sub: hallOfRecords.highestMonthlyProfitMonth 
                    ? (() => {
                        const [y, m] = hallOfRecords.highestMonthlyProfitMonth.split('-');
                        const mNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                        return `${mNames[parseInt(m) - 1]} ${y}`;
                      })()
                    : "No profit",
                  icon: <Coins className="text-cyan-500" size={18} />
                },
                {
                  label: "Most Sold Product",
                  value: hallOfRecords.mostSoldProduct ? hallOfRecords.mostSoldProduct.name : "No sales catalog items",
                  sub: hallOfRecords.mostSoldProduct ? `${formatNumber(hallOfRecords.mostSoldProduct.quantity)} items sold` : "No sales transactions",
                  icon: <Package className="text-amber-500" size={18} />
                },
                {
                  label: "Best Sales Day of Week",
                  value: hallOfRecords.bestSalesDay || "No sales history",
                  sub: hallOfRecords.bestSalesDay ? "Recurring peak traffic weekday" : "Finalize billing entries first",
                  icon: <CalendarDays className="text-indigo-500" size={18} />
                }
              ].map((rec, i) => (
                <div key={i} className="p-4 rounded-2xl bg-[var(--foreground)]/[0.01] border border-[var(--border)]/65 flex items-start gap-3.5 hover:border-[var(--primary)]/20 transition-all duration-200">
                  <div className="p-2.5 bg-[var(--foreground)]/[0.03] border border-[var(--border)] rounded-xl shrink-0">
                    {rec.icon}
                  </div>
                  <div className="space-y-0.5 min-w-0">
                    <span className="text-[9px] font-black uppercase tracking-wider text-[var(--foreground)]/45 leading-none block">{rec.label}</span>
                    <p className="text-sm font-black text-[var(--foreground)] truncate block">{rec.value}</p>
                    <p className="text-[8.5px] font-semibold opacity-40 uppercase tracking-widest truncate block">{rec.sub}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Side: Monthly Achievement Reports (5/12 Columns) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="p-5 rounded-3xl bg-[var(--card)] border border-[var(--border)]">
            <div className="flex items-center justify-between pb-4 border-b border-[var(--border)] mb-6 text-left">
              <div className="flex items-center gap-2">
                <Calendar className="text-indigo-500" size={18} />
                <div>
                  <h4 className="font-extrabold text-xs text-[var(--foreground)] uppercase tracking-wider">📅 Monthly Achievement Reports</h4>
                  <p className="text-[9px] opacity-50 font-bold uppercase tracking-widest">Automatic monthly growth registries</p>
                </div>
              </div>
            </div>

            {/* Expandable month containers */}
            {monthlyReports.length === 0 ? (
              <div className="p-8 text-center text-[9px] opacity-45 uppercase tracking-widest font-black py-16">
                No monthly milestones finalized yet. Checkouts and catalog additions automatically spawn monthly summaries here.
              </div>
            ) : (
              <div className="space-y-3 text-left">
                {monthlyReports.map((report) => {
                  const isExpanded = expandedReport === report.key;
                  return (
                    <div 
                      key={report.key} 
                      className={`rounded-2xl border transition-all overflow-hidden ${
                        isExpanded ? 'bg-[var(--foreground)]/[0.015] border-[var(--primary)]/20' : 'bg-transparent border-[var(--border)]'
                      }`}
                    >
                      <button
                        onClick={() => setExpandedReport(isExpanded ? null : report.key)}
                        className="w-full p-4 flex items-center justify-between font-black uppercase text-[10px] tracking-wider text-[var(--foreground)] cursor-pointer hover:bg-[var(--foreground)]/[0.01]"
                      >
                        <div className="flex items-center gap-2">
                          <Crown size={12} className="text-amber-500" />
                          <span>🏆 {report.monthYear} Achievements</span>
                        </div>
                        <div className="flex items-center gap-2 text-[8px] font-mono font-bold text-[var(--foreground)]/50">
                          <span>{report.milestones.length} unlocked</span>
                          {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                        </div>
                      </button>

                      <AnimatePresence initial={false}>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                          >
                            <div className="px-4 pb-4 border-t border-[var(--border)]/45 pt-3 space-y-2">
                              {report.milestones.map((item, id) => (
                                <div key={id} className="flex items-center gap-2 text-[9px] uppercase tracking-wide font-medium text-[var(--foreground)] bg-[var(--foreground)]/[0.02] p-2 rounded-xl border border-[var(--border)]/40 hover:border-[var(--primary)]/20 transition-all">
                                  <Medal size={12} className="text-emerald-500 shrink-0" />
                                  <span className="truncate">{item}</span>
                                </div>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Selected Milestone Detail Modal Modal dialog */}
      <AnimatePresence>
        {selectedMilestoneInfo && (
          <div id="milestone-detail-verification-dialog" className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedMilestoneInfo(null)}
              className="absolute inset-0 bg-black/75 backdrop-blur-md"
            />

            {/* Sheet/Modal Card */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative w-full max-w-md p-6 sm:p-7 bg-[var(--card)] text-[var(--foreground)] border-2 border-amber-500/30 rounded-3xl shadow-2xl space-y-5 text-left overflow-hidden z-10"
            >
              {/* Header */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-amber-500/15 text-amber-500 rounded-2xl border border-amber-500/30 shadow-sm">
                    <Trophy size={22} className="stroke-[2.2]" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-[var(--foreground)] uppercase tracking-wider">Milestone Verification</h4>
                    <p className="text-[8.5px] font-bold text-amber-500 uppercase tracking-widest">OFFICIAL BUSINESS BENCHMARK</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedMilestoneInfo(null)}
                  className="h-8 w-8 rounded-full bg-[var(--foreground)]/[0.06] hover:bg-[var(--foreground)]/[0.12] text-[var(--foreground)] flex items-center justify-center transition-all cursor-pointer font-extrabold uppercase text-xs"
                >
                  ✕
                </button>
              </div>

              <div className="border-y border-[var(--border)] py-4 space-y-3.5">
                <div className="space-y-1">
                  <span className="text-[8.5px] font-bold text-[var(--foreground)]/50 uppercase tracking-widest">Benchmark Target</span>
                  <p className="text-lg font-black text-[var(--foreground)] tracking-tight flex items-center gap-2">
                    {selectedMilestoneInfo.title}
                  </p>
                </div>

                <div className="space-y-1">
                  <span className="text-[8.5px] font-bold text-[var(--foreground)]/50 uppercase tracking-widest">Official Description</span>
                  <p className="text-xs text-[var(--foreground)]/85 font-semibold leading-relaxed">
                    {selectedMilestoneInfo.description}
                  </p>
                </div>

                <div className="space-y-1">
                  <span className="text-[8.5px] font-bold text-[var(--foreground)]/50 uppercase tracking-widest">Status Registry</span>
                  <div className="flex items-center gap-2 pt-0.5">
                    {selectedMilestoneInfo.isUnlocked ? (
                      <span className="text-[10px] font-black uppercase text-emerald-500 bg-emerald-500/15 px-3 py-1 rounded-xl border border-emerald-500/30 flex items-center gap-1.5 shadow-xs">
                        <Medal size={13} /> Unlocked & Documented
                      </span>
                    ) : (
                      <span className="text-[10px] font-black uppercase text-[var(--foreground)]/60 bg-[var(--foreground)]/[0.05] px-3 py-1 rounded-xl border border-[var(--border)] flex items-center gap-1.5">
                        🔒 Operational Target Locked
                      </span>
                    )}
                  </div>
                </div>

                {selectedMilestoneInfo.isUnlocked && selectedMilestoneInfo.unlockedAt && (
                  <div className="space-y-1">
                    <span className="text-[8.5px] font-bold text-[var(--foreground)]/50 uppercase tracking-widest">Timestamp Recorded</span>
                    <p className="text-[10px] font-bold font-mono text-[var(--foreground)]">
                      {formatDateSafely(selectedMilestoneInfo.unlockedAt, {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                )}
              </div>

              {selectedMilestoneInfo.isUnlocked ? (
                <button
                  type="button"
                  onClick={() => {
                    handleDownloadCertificate(selectedMilestoneInfo);
                    setSelectedMilestoneInfo(null);
                  }}
                  className="w-full h-11 flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 text-stone-950 font-black uppercase tracking-wider rounded-2xl cursor-pointer shadow-md shadow-amber-500/25 transition-all text-xs border border-amber-300"
                >
                  <Download size={15} /> Download PDF Certificate
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setSelectedMilestoneInfo(null)}
                  className="w-full h-11 flex items-center justify-center bg-[var(--foreground)]/[0.06] hover:bg-[var(--foreground)]/[0.12] text-[var(--foreground)] font-black uppercase tracking-wider rounded-2xl cursor-pointer transition-all text-xs border border-[var(--border)]"
                >
                  Close
                </button>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface LatestAchievementWidgetProps {
  state: AppState;
  setActiveTab: (tab: 'home' | 'billing' | 'analytics' | 'udhar') => void;
  renderHeaderAction: () => React.ReactNode;
}

export function LatestAchievementWidget({ state, setActiveTab, renderHeaderAction }: LatestAchievementWidgetProps) {
  const { latestAchievement, milestones } = useMemo(() => {
    return getCalculatedAchievements(state);
  }, [state]);

  const nextMilestone = useMemo(() => {
    return milestones.find(m => !m.isUnlocked);
  }, [milestones]);

  const handleGotoMilestones = () => {
    localStorage.setItem('analytics_active_subtab', 'milestones');
    setActiveTab('analytics');
  };

  const parsedIso = latestAchievement?.unlockedAt ? ensureIsoString(latestAchievement.unlockedAt) : '';
  const parsedDate = parsedIso ? new Date(parsedIso) : null;
  const formattedDate = parsedDate && !isNaN(parsedDate.getTime())
    ? parsedDate.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      })
    : '';

  return (
    <div className="card p-6 bg-[var(--card)] border border-[var(--border)] rounded-3xl space-y-4">
      <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
        <div className="flex items-center gap-2 text-sm font-black uppercase tracking-tight text-[var(--foreground)]">
          <Trophy size={14} className="text-amber-500 fill-amber-500/15" />
          <span>🏆 Latest Achievement</span>
        </div>
        {renderHeaderAction()}
      </div>

      {latestAchievement ? (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5 flex-1 text-left">
            <span className="text-[9px] font-black uppercase tracking-wider text-emerald-500 bg-emerald-500/10 border border-emerald-500/15 px-2 py-0.5 rounded-lg">
              "Congratulations"
            </span>
            <h4 className="text-base font-black text-[var(--foreground)] tracking-tight uppercase">
              {latestAchievement.title}
            </h4>
            <p className="text-[10px] text-[var(--foreground)]/60 font-medium leading-relaxed uppercase tracking-wider">
              {latestAchievement.description}
            </p>
            {formattedDate && (
              <p className="text-[8.5px] font-mono opacity-50 font-bold uppercase tracking-widest">
                Achieved on: {formattedDate}
              </p>
            )}
          </div>

          <button
            onClick={handleGotoMilestones}
            className="h-8 px-4 rounded-xl bg-[var(--foreground)]/[0.03] hover:bg-[var(--primary)] text-[9px] font-black uppercase tracking-wider text-[var(--foreground)] hover:text-white border border-[var(--border)] hover:border-transparent transition-all flex items-center gap-1.5 justify-center cursor-pointer"
          >
            <span>View Journey</span>
            <ArrowUpRight size={11} />
          </button>
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-1.5">
          <div className="space-y-1 text-left">
            <span className="text-[9px] font-black uppercase tracking-wider text-[var(--foreground)]/40 bg-[var(--foreground)]/[0.03] px-2 py-0.5 rounded-lg">
              Motivate Operations
            </span>
            <h4 className="text-xs font-black text-[var(--foreground)] uppercase">
              Grow Your Business Growth Node
            </h4>
            {nextMilestone ? (
              <p className="text-[9.5px] font-medium opacity-50 uppercase tracking-widest">
                Target: {nextMilestone.title.split(' ').slice(1).join(' ')} (Needs {nextMilestone.target})
              </p>
            ) : (
              <p className="text-[9.5px] font-medium opacity-50 uppercase tracking-widest">
                Add catalog items or record a bill to unlock first milestone!
              </p>
            )}
          </div>
          <button
            onClick={handleGotoMilestones}
            className="h-8 px-4 rounded-xl bg-[var(--foreground)]/[0.03] hover:bg-[var(--primary)] text-[9px] font-black uppercase tracking-wider text-[var(--foreground)] hover:text-white border border-[var(--border)] hover:border-transparent transition-all flex items-center gap-1.5 justify-center cursor-pointer"
          >
            <span>Launch Track</span>
            <ArrowUpRight size={11} />
          </button>
        </div>
      )}
    </div>
  );
}

