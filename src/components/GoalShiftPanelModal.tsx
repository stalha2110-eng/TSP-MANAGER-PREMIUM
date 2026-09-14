import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { X, Lock, Database } from 'lucide-react';
import { Button } from './ui/Button';
import { cn } from '../lib/utils';
import { BusinessShift, BusinessGoal } from '../types';
import { useBackModal } from '../utils/backNavigationManager';

export interface GoalShiftPanelModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeShift: BusinessShift | null;
  setActiveShift: React.Dispatch<React.SetStateAction<BusinessShift | null>>;
  shiftHistory: BusinessShift[];
  setShiftHistory: React.Dispatch<React.SetStateAction<BusinessShift[]>>;
  businessGoals: BusinessGoal;
  setBusinessGoals: React.Dispatch<React.SetStateAction<BusinessGoal>>;
  state: any;
  t: any;
}

export function GoalShiftPanelModal({
  isOpen,
  onClose,
  activeShift,
  setActiveShift,
  shiftHistory,
  setShiftHistory,
  businessGoals,
  setBusinessGoals,
  state,
  t
}: GoalShiftPanelModalProps) {
  useBackModal(isOpen, onClose, 'goal_shift_panel');
  const [activeTab, setActiveTabLocal] = useState<'shift' | 'history'>('shift');

  // Input states for New Shift Setup
  const [openingCashVal, setOpeningCashVal] = useState('2000');
  
  // Input states for closing active shift
  const [closingCashVal, setClosingCashVal] = useState('');
  const [isClosingFormOpen, setIsClosingFormOpen] = useState(false);

  // Editable Revenue Goal Goals
  const [editGoals, setEditGoals] = useState({ ...businessGoals });
  const [isEditingTargets, setIsEditingTargets] = useState(false);

  // Automatically preset the estimated expected closing cash
  useEffect(() => {
    if (activeShift) {
      const estimatedCash = activeShift.openingCash + activeShift.totalSales - activeShift.pendingUdhar;
      setClosingCashVal(String(estimatedCash));
    }
  }, [activeShift]);

  // Synchronize internal state with parent when goals are changed
  useEffect(() => {
    setEditGoals({ ...businessGoals });
  }, [businessGoals]);

  if (!isOpen) return null;

  const handleStartShift = () => {
    const cash = parseFloat(openingCashVal) || 0;
    const newShift: BusinessShift = {
      id: `shift-${Date.now()}`,
      openTime: new Date().toISOString(),
      closeTime: null,
      openingCash: cash,
      closingCash: 0,
      totalSales: 0,
      totalProfit: 0,
      totalBills: 0,
      totalPrints: 0,
      pendingUdhar: 0,
      topSellingItem: 'None',
      totalCustomersServed: 0,
      isOpen: true,
      date: new Date().toISOString().split('T')[0]
    };
    setActiveShift(newShift);
    setIsClosingFormOpen(false);
  };

  const handleCloseShift = () => {
    if (!activeShift) return;
    const closedShift: BusinessShift = {
      ...activeShift,
      closeTime: new Date().toISOString(),
      closingCash: parseFloat(closingCashVal) || 0,
      isOpen: false
    };
    setShiftHistory(prev => [closedShift, ...prev]);
    setActiveShift(null);
    setIsClosingFormOpen(false);
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-[var(--card)] border border-[var(--border)] text-[var(--foreground)] max-w-xl w-full rounded-[2rem] p-6 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
      >
        {/* Header */}
        <div className="flex justify-between items-start border-b border-[var(--border)] pb-4 mb-4">
          <div>
            <span className="text-[8px] font-black uppercase tracking-widest text-[var(--primary)]">Shift Control Dashboard</span>
            <h2 className="text-md font-black uppercase tracking-tight text-[var(--foreground)]">Shift Ledger & Targets</h2>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full h-8 w-8 text-[var(--foreground)]/60">
            <X size={16} />
          </Button>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-[var(--border)] pb-3 gap-2">
          {[
            { id: 'shift', label: 'Shift Control' },
            { id: 'history', label: 'Shift Audit Logs' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTabLocal(tab.id as any)}
              className={cn(
                "flex-1 py-2 rounded-xl text-[9px] font-black uppercase tracking-wider text-center transition cursor-pointer leading-none",
                activeTab === tab.id 
                  ? "bg-[var(--primary)] text-white shadow-md shadow-[var(--primary)]/20" 
                  : "bg-[var(--foreground)]/5 text-[var(--foreground)]/60 hover:bg-[var(--foreground)]/10"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Main Workspace Area */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
          {activeTab === 'shift' && (
            <div className="space-y-4">
              {activeShift ? (
                <>
                  {/* Active Registry Status */}
                  <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="h-3 w-3 rounded-full bg-emerald-500 animate-pulse" />
                      <div>
                        <p className="text-xs font-black uppercase tracking-wide text-emerald-500 font-sans">Cash Register Active</p>
                        <p className="text-[9px] font-mono text-[var(--foreground)]/50">Opened: {new Date(activeShift.openTime).toLocaleTimeString()}</p>
                      </div>
                    </div>
                    <div className="text-right font-sans">
                      <p className="text-xs font-mono font-black text-white">₹{activeShift.openingCash.toLocaleString()}</p>
                      <p className="text-[8px] uppercase tracking-wider text-[var(--foreground)]/40 font-bold">Opening Cash</p>
                    </div>
                  </div>

                  {/* Operational Stats Grid */}
                  <div className="grid grid-cols-2 gap-3 font-sans">
                    <div className="bg-[var(--foreground)]/5 rounded-2xl p-4 border border-[var(--border)] leading-tight">
                      <p className="text-[8px] font-black uppercase tracking-wider opacity-40">Sales Collected</p>
                      <p className="text-lg font-mono font-black text-emerald-400 mt-1">₹{activeShift.totalSales.toLocaleString()}</p>
                    </div>
                    <div className="bg-[var(--foreground)]/5 rounded-2xl p-4 border border-[var(--border)] leading-tight">
                      <p className="text-[8px] font-black uppercase tracking-wider opacity-40">Profit Realized</p>
                      <p className="text-lg font-mono font-black text-blue-400 mt-1">₹{activeShift.totalProfit.toLocaleString()}</p>
                    </div>
                    <div className="bg-[var(--foreground)]/5 rounded-2xl p-4 border border-[var(--border)] leading-tight">
                      <p className="text-[8px] font-black uppercase tracking-wider opacity-40 font-sans">Transactions Count</p>
                      <p className="text-lg font-mono font-black mt-1 text-white">{activeShift.totalBills} Invoices</p>
                    </div>
                    <div className="bg-[var(--foreground)]/5 rounded-2xl p-4 border border-[var(--border)] leading-tight">
                      <p className="text-[8px] font-black uppercase tracking-wider opacity-40 font-sans">Outstanding Udhar</p>
                      <p className="text-lg font-mono font-black text-amber-500 mt-1">₹{activeShift.pendingUdhar.toLocaleString()}</p>
                    </div>
                  </div>

                  {/* Detail Panel */}
                  <div className="bg-[var(--foreground)]/5 rounded-2xl border border-[var(--border)] px-4 py-3 divide-y divide-[var(--border)]">
                    <div className="flex justify-between py-2 text-xs font-bold font-sans">
                      <span className="opacity-50">Total Sales:</span>
                      <span className="text-emerald-400">₹{activeShift.totalSales.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between py-2 text-xs font-bold font-sans">
                      <span className="opacity-50">Served Customers:</span>
                      <span className="text-white">{activeShift.totalCustomersServed}</span>
                    </div>
                    <div className="flex justify-between py-2 text-xs font-bold font-sans">
                      <span className="opacity-50">Estimated Cash in Drawer:</span>
                      <span className="font-mono text-emerald-400 font-extrabold">₹{(activeShift.openingCash + activeShift.totalSales - activeShift.pendingUdhar).toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Action Section */}
                  {isClosingFormOpen ? (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-red-500/5 p-4 border border-red-500/20 rounded-2xl space-y-3">
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-red-500 font-sans">Close Active Shift Checkout</h4>
                      <div>
                        <label className="text-[9px] font-black uppercase tracking-wider opacity-60 font-sans">Physical Cash Counted in Drawer (₹)</label>
                        <input
                          type="number"
                          value={closingCashVal}
                          onChange={e => setClosingCashVal(e.target.value)}
                          className="w-full mt-1 px-3 py-2 text-xs bg-[var(--background)] border border-[var(--border)] text-[var(--foreground)] rounded-xl outline-none font-mono"
                        />
                      </div>
                      <div className="flex gap-2 font-sans">
                        <Button variant="ghost" className="flex-1 text-xs rounded-xl h-10" onClick={() => setIsClosingFormOpen(false)}>Cancel</Button>
                        <Button className="flex-1 bg-red-650 hover:bg-red-700 text-white text-xs rounded-xl h-10 font-sans" onClick={handleCloseShift}>Confirm & Close Shift</Button>
                      </div>
                    </motion.div>
                  ) : (
                    <Button className="w-full h-12 bg-red-500/10 hover:bg-red-500/25 border border-red-500/30 text-red-500 font-black uppercase tracking-widest rounded-2xl text-xs font-sans" onClick={() => setIsClosingFormOpen(true)}>
                      Reconcile & Close Cashier Shift
                    </Button>
                  )}
                </>
              ) : (
                <div className="py-6 text-center space-y-4">
                  <div className="h-14 w-14 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center mx-auto">
                    <Lock size={28} />
                  </div>
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-tight text-[var(--foreground)]">Ledger Register Closed</h3>
                    <p className="text-[10px] text-[var(--foreground)]/60 leading-relaxed max-w-sm mx-auto mt-1">Initialize a new active ledger shift before billing to record shift-based transactions, cashier logs, and dynamic margins.</p>
                  </div>

                  <div className="bg-[var(--foreground)]/5 p-4 border border-[var(--border)] rounded-2xl max-w-xs mx-auto text-left space-y-3">
                    <div>
                      <label className="text-[9px] font-black uppercase tracking-widest opacity-50 block mb-1">Opening Cash Reserve In Drawer (₹)</label>
                      <input
                        type="number"
                        value={openingCashVal}
                        onChange={e => setOpeningCashVal(e.target.value)}
                        className="w-full px-3 py-2 text-xs bg-[var(--background)] border border-[var(--border)] text-[var(--foreground)] rounded-xl outline-none font-mono font-bold"
                      />
                    </div>
                    <Button className="w-full h-11 rounded-xl bg-emerald-500 text-white font-black uppercase tracking-wider text-xs shadow-lg shadow-emerald-500/20 font-sans" onClick={handleStartShift}>
                      Open Cashier Shift
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'history' && (
            <div className="space-y-3 font-sans">
              {shiftHistory.length === 0 ? (
                <div className="py-12 text-center space-y-2 opacity-50 font-sans">
                  <Database size={32} className="mx-auto" />
                  <p className="text-xs font-black uppercase tracking-wider font-sans">No historic registry shift found</p>
                  <p className="text-[10px] max-w-sm mx-auto leading-normal font-sans">Closed cashier shifts will be logged as deep shift ledger archives in here.</p>
                </div>
              ) : (
                shiftHistory.map((sh, idx) => (
                  <div key={sh.id || idx} className="bg-[var(--foreground)]/5 border border-[var(--border)] rounded-2xl p-4 space-y-2 font-sans animate-fade-in">
                    <div className="flex justify-between items-center text-xs font-bold pb-2 border-b border-[var(--border)]/30 font-sans">
                      <div>
                        <span className="text-[8px] font-black uppercase tracking-wider text-[var(--primary)] block">Shift Log</span>
                        <span className="font-mono text-[var(--foreground)]/50">{sh.id} • {sh.date}</span>
                      </div>
                      <span className="text-[9px] font-black uppercase tracking-wider text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/15">Reconciled</span>
                    </div>

                    <div className="grid grid-cols-2 gap-y-2 gap-x-4 pt-1 font-mono text-[10.5px]">
                      <div className="flex justify-between">
                        <span className="opacity-40">Opening Float:</span>
                        <span>₹{sh.openingCash.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="opacity-40">Closing Count:</span>
                        <span>₹{sh.closingCash.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="opacity-40">Net Sales:</span>
                        <span className="text-emerald-400 font-bold">₹{sh.totalSales.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="opacity-40 font-bold">Net Profit:</span>
                        <span className="text-blue-400 font-bold">₹{sh.totalProfit.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between font-bold">
                        <span className="opacity-40 font-bold">Bills count:</span>
                        <span>{sh.totalBills} pcs</span>
                      </div>
                      <div className="flex justify-between font-bold">
                        <span className="opacity-40">Udhar Run:</span>
                        <span className="text-amber-500 font-bold">₹{sh.pendingUdhar.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-[var(--border)] pt-4 mt-2 font-sans">
          <Button className="w-full rounded-2xl h-11 text-xs font-sans font-sans" onClick={onClose}>Close Workspace Panel</Button>
        </div>
      </motion.div>
    </div>
  );
}
