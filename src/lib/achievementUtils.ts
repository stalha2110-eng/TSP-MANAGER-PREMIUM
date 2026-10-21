import { AppState, Bill, Item, UdharCustomer } from '../types';
import { jsPDF } from 'jspdf';
import { calculateBillProfit as calcProfit } from './utils';

export const ensureIsoString = (val: any): string => {
  if (!val) return '';
  if (typeof val === 'string') return val;
  if (val && typeof val.toDate === 'function') {
    try {
      return val.toDate().toISOString();
    } catch (_) {}
  }
  if (val instanceof Date) {
    try {
      return val.toISOString();
    } catch (_) {}
  }
  if (typeof val === 'number') {
    try {
      return new Date(val).toISOString();
    } catch (_) {}
  }
  try {
    const d = new Date(val);
    if (!isNaN(d.getTime())) {
      return d.toISOString();
    }
  } catch (_) {}
  return '';
};

export interface Milestone {
  id: string;
  category: 'revenue' | 'profit' | 'billing' | 'customer' | 'inventory' | 'consistency';
  title: string;
  description: string;
  target: number;
  currentValue: number;
  isUnlocked: boolean;
  unlockedAt?: string; // Date string
  unit?: string;
}

export const downloadCertificateOfMilestone = (storeName: string, milestone: Milestone) => {
  if (!milestone.isUnlocked || !milestone.unlockedAt) return;

  try {
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });

    // A4 Landscape sizes: 297mm width x 210mm height
    const width = 297;
    const height = 210;

    // Draw premium professional border
    doc.setLineWidth(1.5);
    doc.setDrawColor(79, 70, 229); // Indigo/Primary Brand Color
    doc.rect(12, 12, width - 24, height - 24);

    doc.setLineWidth(0.4);
    doc.setDrawColor(229, 231, 235); // Light Gray
    doc.rect(15, 15, width - 30, height - 30);

    // Subtle Corner decorative squares
    const size = 6;
    doc.setFillColor(79, 70, 229);
    doc.rect(15, 15, size, size, 'F');
    doc.rect(width - 15 - size, 15, size, size, 'F');
    doc.rect(15, height - 15 - size, size, size, 'F');
    doc.rect(width - 15 - size, height - 15 - size, size, size, 'F');

    // Title header
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(26);
    doc.setTextColor(31, 41, 55); // Slate-800
    doc.text("TS PRICE MANAGER", width / 2, 45, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(107, 114, 128); // Gray-500
    doc.text("ENTERPRISE BUSINESS SOFTWARE STATE LEDGER RECORD", width / 2, 51, { align: 'center' });

    // Document Name
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.setTextColor(79, 70, 229); // Primary Indigo
    doc.text("BUSINESS GROWTH & ACHIEVEMENT CERTIFICATE", width / 2, 70, { align: 'center' });

    // Separator Line
    doc.setDrawColor(79, 70, 229);
    doc.setLineWidth(0.8);
    doc.line(70, 75, width - 70, 75);

    // Congratulation body text
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(12);
    doc.setTextColor(75, 85, 99); // Gray-600
    doc.text("This certifies that the authenticated enterprise node", width / 2, 92, { align: 'center' });

    // Store Name with background glow block
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.setTextColor(17, 24, 39); // Gray-900
    doc.text(storeName.toUpperCase(), width / 2, 106, { align: 'center' });

    // Sub-text
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(12);
    doc.setTextColor(75, 85, 99);
    doc.text("has successfully achieved the official retail operations milestone:", width / 2, 120, { align: 'center' });

    // Milestone Award Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(16, 185, 129); // Emerald-500
    doc.text(milestone.title, width / 2, 134, { align: 'center' });

    // Milestone Description
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(10);
    doc.setTextColor(107, 114, 128);
    doc.text(`"${milestone.description}"`, width / 2, 142, { align: 'center' });

    // Footer metadata
    const formalDate = new Date(milestone.unlockedAt).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(107, 114, 128);
    doc.text(`Ledger Registry Timestamp: ${formalDate}`, width / 2, 160, { align: 'center' });

    // Verified Seal Design
    const sealY = 178;
    doc.setDrawColor(229, 231, 235);
    doc.setFillColor(249, 250, 251);
    doc.ellipse(width / 2, sealY, 18, 11, 'F');
    
    doc.setLineWidth(0.5);
    doc.setDrawColor(16, 185, 129);
    doc.ellipse(width / 2, sealY, 16, 9, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(16, 185, 129); // Emerald
    doc.text("LEDGER SEAL", width / 2, sealY - 1, { align: 'center' });
    doc.setFontSize(6);
    doc.setTextColor(107, 114, 128);
    doc.text("VERIFIED OPERATIONS", width / 2, sealY + 2.5, { align: 'center' });

    doc.save(`Achievement_${milestone.id}_${storeName.replace(/\s+/g, '_')}.pdf`);
  } catch (e) {
    console.error("Failed to make milestone PDF certificate", e);
  }
};

export interface TimelineNode {
  id: string;
  title: string;
  description: string;
  isUnlocked: boolean;
  unlockedAt?: string;
}

export interface HallOfRecords {
  highestSingleBill: number;
  highestSingleBillDate?: string;
  highestDailySale: number;
  highestDailySaleDate?: string;
  highestMonthlyProfit: number;
  highestMonthlyProfitMonth?: string;
  mostSoldProduct: { name: string; quantity: number } | null;
  bestSalesDay: string | null; // Friday, Saturday, etc.
}

export interface MonthlyAchievementReport {
  monthYear: string; // e.g. "May 2026"
  key: string; // e.g. "2026-05"
  milestones: string[];
}

// Helper to calculate bill profit
export const calculateBillProfit = (bill: Bill, itemsCatalog?: Item[]): number => {
  return calcProfit(bill, itemsCatalog);
};

export const getCalculatedAchievements = (state: AppState) => {
  const bills = state.bills || [];
  const items = state.items || [];
  const customers = state.udharCustomers || [];

  // Sort bills chronologically for accurate date determination
  const chronologicalBills = [...bills].sort(
    (a, b) => new Date(ensureIsoString(a.timestamp)).getTime() - new Date(ensureIsoString(b.timestamp)).getTime()
  );

  // 1. Calculate Revenue Milestone status & unlock dates
  const revenueMilestones = [
    { id: 'rev_10k', value: 10000, title: '🥉 Revenue ₹10,000 Achieved', desc: 'Reached lifetime sales of ₹10,000' },
    { id: 'rev_50k', value: 50000, title: '🥈 Revenue ₹50,000 Achieved', desc: 'Reached lifetime sales of ₹50,000' },
    { id: 'rev_1lakh', value: 100000, title: '🥇 Revenue ₹1,00,000 Achieved', desc: 'Reached milestone sales of ₹1,00,000' },
    { id: 'rev_5lakh', value: 500000, title: '💎 Revenue ₹5,00,000 Achieved', desc: 'Reached elite sales of ₹5,00,000' },
    { id: 'rev_10lakh', value: 1000000, title: '👑 Revenue ₹10,00,000 Achieved', desc: 'Reached legendary sales of ₹10,00,000' },
    { id: 'rev_50lakh', value: 5000000, title: '👑 Revenue ₹50,00,000 Achieved', desc: 'Reached half-crore stellar sales of ₹50,00,000' },
    { id: 'rev_1crore', value: 10000000, title: '👑 Revenue ₹1 Crore Achieved', desc: 'Reached ultimate milestone of ₹1 Crore sales!' }
  ];

  let cumulativeRevenue = 0;
  const revStatus = revenueMilestones.map(milestone => {
    let unlockedAt: string | undefined;
    for (const bill of chronologicalBills) {
      cumulativeRevenue += bill.total || 0;
      if (cumulativeRevenue >= milestone.value) {
        unlockedAt = bill.timestamp;
        break;
      }
    }
    // reset cumulative for proper mapping if we just wanted exact crossing,
    // actually let's calculate exact cumulative sum up front
    return { ...milestone, unlockedAt };
  });

  // Calculate actual revenue sum
  const totalRevenue = bills.reduce((sum, b) => sum + (b.total || 0), 0);
  const mRevList: Milestone[] = revenueMilestones.map(m => {
    let unlockedAt: string | undefined;
    let runningSum = 0;
    for (const b of chronologicalBills) {
      runningSum += b.total || 0;
      if (runningSum >= m.value) {
        unlockedAt = b.timestamp;
        break;
      }
    }
    return {
      id: m.id,
      category: 'revenue',
      title: m.title,
      description: m.desc,
      target: m.value,
      currentValue: totalRevenue,
      isUnlocked: totalRevenue >= m.value,
      unlockedAt: unlockedAt ? ensureIsoString(unlockedAt) : undefined,
      unit: '₹'
    };
  });

  // 2. Calculate Profit Milestone status & unlock dates
  const profitMilestones = [
    { id: 'prof_5k', value: 5000, title: '🏆 First ₹5,000 Profit', desc: 'Achieved first net profit of ₹5,000' }, 
    { id: 'prof_25k', value: 25000, title: '🏆 First ₹25,000 Profit', desc: 'Achieved milestone net profit of ₹25,000' },
    { id: 'prof_50k', value: 50000, title: '🏆 First ₹50,000 Profit', desc: 'Crossed intermediate milestone of ₹50,000 profit' },
    { id: 'prof_1lakh', value: 100000, title: '🏆 First ₹1,00,000 Profit', desc: 'Crossed substantial marker of ₹1,00,000 in net profit' },
    { id: 'prof_5lakh', value: 500000, title: '🏆 First ₹5,00,000 Profit', desc: 'Achieved massive milestone of ₹5,00,000 in net profit' }
  ];

  const totalProfit = chronologicalBills.reduce((sum, b) => sum + calculateBillProfit(b), 0);
  const mProfList: Milestone[] = profitMilestones.map(m => {
    let unlockedAt: string | undefined;
    let runningSum = 0;
    for (const b of chronologicalBills) {
      runningSum += calculateBillProfit(b);
      if (runningSum >= m.value) {
        unlockedAt = b.timestamp;
        break;
      }
    }
    return {
      id: m.id,
      category: 'profit',
      title: m.title,
      description: m.desc,
      target: m.value,
      currentValue: totalProfit,
      isUnlocked: totalProfit >= m.value,
      unlockedAt: unlockedAt ? ensureIsoString(unlockedAt) : undefined,
      unit: '₹'
    };
  });

  // 3. Billing Milestones
  const billingMilestones = [
    { id: 'bill_1', value: 1, title: '🏆 First Bill Created', desc: 'Inaugurated terminal setup with the very first bill' },
    { id: 'bill_100', value: 100, title: '🏆 100 Bills Completed', desc: 'Completed 100 successful checkout procedures' },
    { id: 'bill_500', value: 500, title: '🏆 500 Bills Completed', desc: 'Demonstrated solid workflow with 500 completed checkouts' },
    { id: 'bill_1000', value: 1000, title: '🏆 1,000 Bills Completed', desc: 'Reached legendary status of 1,000 completed sales tickets' },
    { id: 'bill_5000', value: 5000, title: '🏆 5,000 Bills Completed', desc: 'Executed 5,000 bills with high-velocity operations' },
    { id: 'bill_10000', value: 10000, title: '🏆 10,000 Bills Completed', desc: 'Achieved enterprise master grade of 10,000 bills!' }
  ];

  const totalBills = bills.length;
  const mBillList: Milestone[] = billingMilestones.map(m => {
    let unlockedAt: string | undefined;
    if (totalBills >= m.value && chronologicalBills[m.value - 1]) {
      unlockedAt = chronologicalBills[m.value - 1].timestamp;
    }
    return {
      id: m.id,
      category: 'billing',
      title: m.title,
      description: m.desc,
      target: m.value,
      currentValue: totalBills,
      isUnlocked: totalBills >= m.value,
      unlockedAt: unlockedAt ? ensureIsoString(unlockedAt) : undefined
    };
  });

  // 4. Customer Growth Milestones
  const customerMilestones = [
    { id: 'cust_1', value: 1, title: '🏆 First Customer Added', desc: 'Onboarded your first core customer account' },
    { id: 'cust_50', value: 50, title: '🏆 50 Customers Added', desc: 'Grew your regular client base to 50 active records' },
    { id: 'cust_100', value: 100, title: '🏆 100 Customers', desc: 'Successfully registered 100 distinct client records' },
    { id: 'cust_500', value: 500, title: '🏆 500 Customers', desc: 'Expanded standard account ledger to 500 clients' },
    { id: 'cust_1000', value: 1000, title: '🏆 1,000 Customers', desc: 'Rebuilt commercial footprint with 1,000 customer accounts' }
  ];

  const totalCustomers = customers.length;
  // Sort customers chronologically to find addition timestamp
  const sortedCustomers = [...customers].sort(
    (a, b) => new Date(ensureIsoString(a.lastUpdated)).getTime() - new Date(ensureIsoString(b.lastUpdated)).getTime()
  );

  const mCustList: Milestone[] = customerMilestones.map(m => {
    let unlockedAt: string | undefined;
    if (totalCustomers >= m.value && sortedCustomers[m.value - 1]) {
      unlockedAt = ensureIsoString(sortedCustomers[m.value - 1].lastUpdated);
    }
    return {
      id: m.id,
      category: 'customer',
      title: m.title,
      description: m.desc,
      target: m.value,
      currentValue: totalCustomers,
      isUnlocked: totalCustomers >= m.value,
      unlockedAt
    };
  });

  // 5. Inventory Milestones
  const inventoryMilestones = [
    { id: 'inv_100', value: 100, title: '🏆 100 Products Added', desc: 'Onboarded 100 products to your unified retail catalog' },
    { id: 'inv_500', value: 500, title: '🏆 500 Products Added', desc: 'Onboarded 500 products to your general retail index' },
    { id: 'inv_1000', value: 1000, title: '🏆 1,000 Products Added', desc: 'Expanded store collection to 1,000 distinct product listings' },
    { id: 'inv_5000', value: 5000, title: '🏆 5,000 Products Added', desc: 'Reached warehouse tier catalog with 5,000 active products' }
  ];

  const totalItems = items.length;
  // Sort items by lastUpdated to estimate timeline additions
  const sortedItems = [...items].sort(
    (a, b) => new Date(ensureIsoString(a.lastUpdated)).getTime() - new Date(ensureIsoString(b.lastUpdated)).getTime()
  );

  const mInvList: Milestone[] = inventoryMilestones.map(m => {
    let unlockedAt: string | undefined;
    if (totalItems >= m.value && sortedItems[m.value - 1]) {
      unlockedAt = ensureIsoString(sortedItems[m.value - 1].lastUpdated);
    }
    return {
      id: m.id,
      category: 'inventory',
      title: m.title,
      description: m.desc,
      target: m.value,
      currentValue: totalItems,
      isUnlocked: totalItems >= m.value,
      unlockedAt
    };
  });

  // 6. Consistency Achievements
  const consistencyMilestones = [
    { id: 'days_7', value: 7, title: '🏆 Used App 7 Days', desc: 'Operated terminal transactions across 7 distinct calendar days' },
    { id: 'days_30', value: 30, title: '🏆 Used App 30 Days', desc: 'Operated terminal transactions across 30 distinct calendar days' },
    { id: 'days_100', value: 100, title: '🏆 Used App 100 Days', desc: 'Maintained billing practices across 100 distinct calendar days' },
    { id: 'days_365', value: 365, title: '🏆 Used App 365 Days', desc: 'Completed full commercial cycle of 365 operational days' },
    { id: 'days_1000', value: 1000, title: '🏆 Used App 1,000 Days', desc: 'Enterprise master status spanning 1,000 active days!' }
  ];

  // Group bills by local date to calculate unique active days
  const billingDatesMap: { [key: string]: string } = {}; // 'YYYY-MM-DD' -> timestamp
  chronologicalBills.forEach(b => {
    const isoTimestamp = ensureIsoString(b.timestamp);
    if (isoTimestamp) {
      const dStr = isoTimestamp.split('T')[0];
      if (!billingDatesMap[dStr]) {
        billingDatesMap[dStr] = isoTimestamp;
      }
    }
  });

  const uniqueActiveDays = Object.keys(billingDatesMap).sort();
  const totalActiveDays = uniqueActiveDays.length;

  const mConstList: Milestone[] = consistencyMilestones.map(m => {
    let unlockedAt: string | undefined;
    if (totalActiveDays >= m.value && uniqueActiveDays[m.value - 1]) {
      unlockedAt = ensureIsoString(billingDatesMap[uniqueActiveDays[m.value - 1]]);
    }
    return {
      id: m.id,
      category: 'consistency',
      title: m.title,
      description: m.desc,
      target: m.value,
      currentValue: totalActiveDays,
      isUnlocked: totalActiveDays >= m.value,
      unlockedAt
    };
  });

  // All calculated milestones concatenated together
  const allMilestones = [
    ...mRevList,
    ...mProfList,
    ...mBillList,
    ...mCustList,
    ...mInvList,
    ...mConstList
  ];

  // 8. Store Growth Journey Timeline
  const timelineTargets = [
    { id: 't_created', type: 'base', title: 'Store Created', desc: 'Inception of commercial terminal node' },
    { id: 't_item', type: 'inventory', threshold: 1, title: 'First Product Added', desc: 'Onboarded first catalog merchandise' },
    { id: 't_bill', type: 'billing', threshold: 1, title: 'First Bill Generated', desc: 'Inaugurated sales workflow operations' },
    { id: 't_cust', type: 'customer', threshold: 1, title: 'First Customer Added', desc: 'Opened account billing profiles' },
    { id: 't_rev_10k', type: 'revenue', threshold: 10000, title: '₹10,000 Revenue', desc: 'Lifetime sales crossed ₹10,000' },
    { id: 't_rev_1lakh', type: 'revenue', threshold: 100000, title: '₹1,00,000 Revenue', desc: 'Lifetime sales crossed ₹1,00,000' },
    { id: 't_bill_500', type: 'billing', threshold: 500, title: '500 Bills Completed', desc: 'Recorded 500 complete ledger tickets' },
    { id: 't_rev_5lakh', type: 'revenue', threshold: 500000, title: '₹5,00,000 Revenue', desc: 'Lifetime sales crossed ₹5,00,000' },
    { id: 't_cust_1k', type: 'customer', threshold: 1000, title: '1,000 Customers', desc: 'Customer registry exceeded 1,000 profiles' },
    { id: 't_rev_10lakh', type: 'revenue', threshold: 1000000, title: '₹10,00,000 Revenue', desc: 'Lifetime sales crossed ₹10,00,000' }
  ];

  const timeline: TimelineNode[] = timelineTargets.map(node => {
    let isUnlocked = false;
    let unlockedAt: string | undefined;

    if (node.type === 'base') {
      isUnlocked = true;
      // Use the earliest timestamp of any item, note, or bill, or current date as default
      const itemTimes = sortedItems.map(i => new Date(ensureIsoString(i.lastUpdated)).getTime()).filter(t => !isNaN(t));
      const billTimes = chronologicalBills.map(b => new Date(ensureIsoString(b.timestamp)).getTime()).filter(t => !isNaN(t));
      const times = [...itemTimes, ...billTimes];
      const minTime = times.length > 0 ? Math.min(...times) : Date.now();
      unlockedAt = new Date(minTime).toISOString();
    } else if (node.type === 'inventory' && node.threshold) {
      isUnlocked = totalItems >= node.threshold;
      if (isUnlocked && sortedItems[node.threshold - 1]) {
        unlockedAt = ensureIsoString(sortedItems[node.threshold - 1].lastUpdated);
      }
    } else if (node.type === 'billing' && node.threshold) {
      isUnlocked = totalBills >= node.threshold;
      if (isUnlocked && chronologicalBills[node.threshold - 1]) {
        unlockedAt = ensureIsoString(chronologicalBills[node.threshold - 1].timestamp);
      }
    } else if (node.type === 'customer' && node.threshold) {
      isUnlocked = totalCustomers >= node.threshold;
      if (isUnlocked && sortedCustomers[node.threshold - 1]) {
        unlockedAt = ensureIsoString(sortedCustomers[node.threshold - 1].lastUpdated);
      }
    } else if (node.type === 'revenue' && node.threshold) {
      isUnlocked = totalRevenue >= node.threshold;
      if (isUnlocked) {
        let sum = 0;
        for (const b of chronologicalBills) {
          sum += b.total || 0;
          if (sum >= node.threshold) {
            unlockedAt = ensureIsoString(b.timestamp);
            break;
          }
        }
      }
    }

    return {
      id: node.id,
      title: node.title,
      description: node.desc,
      isUnlocked,
      unlockedAt: unlockedAt ? ensureIsoString(unlockedAt) : undefined
    };
  });

  // 14. Hall of Records Calculation
  // Highest Single Bill
  let highestSingleBill = 0;
  let highestSingleBillDate: string | undefined;
  bills.forEach(b => {
    if ((b.total || 0) > highestSingleBill) {
      highestSingleBill = b.total || 0;
      highestSingleBillDate = ensureIsoString(b.timestamp);
    }
  });

  // Highest Daily Sale
  const dailySalesMap: { [key: string]: number } = {};
  bills.forEach(b => {
    const isoTimestamp = ensureIsoString(b.timestamp);
    if (isoTimestamp) {
      const dStr = isoTimestamp.split('T')[0];
      dailySalesMap[dStr] = (dailySalesMap[dStr] || 0) + (b.total || 0);
    }
  });
  let highestDailySale = 0;
  let highestDailySaleDate: string | undefined;
  Object.keys(dailySalesMap).forEach(d => {
    if (dailySalesMap[d] > highestDailySale) {
      highestDailySale = dailySalesMap[d];
      highestDailySaleDate = d;
    }
  });

  // Highest Monthly Profit
  const monthlyProfitMap: { [key: string]: number } = {};
  bills.forEach(b => {
    const isoTimestamp = ensureIsoString(b.timestamp);
    if (isoTimestamp && isoTimestamp.length >= 7) {
      const mStr = isoTimestamp.slice(0, 7); // 'YYYY-MM'
      monthlyProfitMap[mStr] = (monthlyProfitMap[mStr] || 0) + calculateBillProfit(b);
    }
  });
  let highestMonthlyProfit = 0;
  let highestMonthlyProfitMonth: string | undefined;
  Object.keys(monthlyProfitMap).forEach(m => {
    if (monthlyProfitMap[m] > highestMonthlyProfit) {
      highestMonthlyProfit = monthlyProfitMap[m];
      highestMonthlyProfitMonth = m;
    }
  });

  // Most Sold Product
  const productQtyMap: { [name: string]: number } = {};
  bills.forEach(b => {
    if (b.items && Array.isArray(b.items)) {
      b.items.forEach(it => {
        productQtyMap[it.name] = (productQtyMap[it.name] || 0) + (it.quantity || 0);
      });
    }
  });
  let maxProduct: { name: string; quantity: number } | null = null;
  Object.keys(productQtyMap).forEach(pName => {
    if (!maxProduct || productQtyMap[pName] > maxProduct.quantity) {
      maxProduct = { name: pName, quantity: productQtyMap[pName] };
    }
  });

  // Best Sales Day of Week
  const dayOfWeekSalesMap: { [day: number]: number } = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
  bills.forEach(b => {
    const isoTimestamp = ensureIsoString(b.timestamp);
    if (isoTimestamp) {
      const dVal = new Date(isoTimestamp);
      const day = isNaN(dVal.getTime()) ? 0 : dVal.getDay();
      dayOfWeekSalesMap[day] += b.total || 0;
    }
  });
  const daysOfWeekNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  let bestDayIdx = 0;
  let maxDaySales = 0;
  Object.keys(dayOfWeekSalesMap).forEach(dayKey => {
    const dIdx = parseInt(dayKey);
    if (dayOfWeekSalesMap[dIdx] > maxDaySales) {
      maxDaySales = dayOfWeekSalesMap[dIdx];
      bestDayIdx = dIdx;
    }
  });
  const bestSalesDay = bills.length > 0 ? daysOfWeekNames[bestDayIdx] : null;

  const hallOfRecords: HallOfRecords = {
    highestSingleBill,
    highestSingleBillDate,
    highestDailySale,
    highestDailySaleDate,
    highestMonthlyProfit,
    highestMonthlyProfitMonth,
    mostSoldProduct: maxProduct,
    bestSalesDay
  };

  // 11. Monthly Achievement Report Generator
  // Accumulate unlocked milestones by their unlocked date
  const reportsMap: { [key: string]: string[] } = {}; // 'YYYY-MM' -> Milestone titles
  allMilestones.forEach(m => {
    const isoUnlocked = ensureIsoString(m.unlockedAt);
    if (m.isUnlocked && isoUnlocked && isoUnlocked.length >= 7) {
      const monthStr = isoUnlocked.slice(0, 7); // 'YYYY-MM'
      if (!reportsMap[monthStr]) {
        reportsMap[monthStr] = [];
      }
      reportsMap[monthStr].push(m.title);
    }
  });

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const monthlyReports: MonthlyAchievementReport[] = Object.keys(reportsMap)
    .sort((a, b) => b.localeCompare(a)) // Latest month first
    .map(key => {
      const [year, month] = key.split('-');
      const monthIdx = parseInt(month, 10) - 1;
      const monthName = monthNames[monthIdx] || month;
      return {
        monthYear: `${monthName} ${year}`,
        key,
        milestones: reportsMap[key]
      };
    });

  // Calculate latest achievement overall
  const unlockedMilestones = allMilestones.filter(m => m.isUnlocked && ensureIsoString(m.unlockedAt));
  const latestAchievement = unlockedMilestones.length > 0 
    ? unlockedMilestones.sort((a, b) => new Date(ensureIsoString(b.unlockedAt)).getTime() - new Date(ensureIsoString(a.unlockedAt)).getTime())[0]
    : null;

  return {
    milestones: allMilestones,
    timeline,
    hallOfRecords,
    monthlyReports,
    latestAchievement
  };
};
