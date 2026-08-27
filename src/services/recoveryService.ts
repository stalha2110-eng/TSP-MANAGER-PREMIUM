import { doc, collection, setDoc, deleteDoc, getDocs, doc as firestoreDoc } from 'firebase/firestore';
import { db, handleFirestoreError } from '../firebase';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface RecoveryRecord {
  id: string;
  type: 'product' | 'category' | 'customer' | 'supplier' | 'bill' | 'settings_point';
  title: string;
  subtitle: string;
  deletedAt: string;
  deletedBy: string;
  originalData: any; // Entire original object serialized
  expiryAt: string; // ISO string of expiry
}

export interface AuditLog {
  id: string;
  timestamp: string;
  userEmail: string;
  actionType: 'create' | 'update' | 'delete' | 'restore';
  entityType: 'product' | 'category' | 'customer' | 'supplier' | 'bill' | 'settings' | 'stock' | 'price' | 'settings_point';
  entityName: string;
  previousValue: string;
  newValue: string;
}

export interface PriceStockRecord {
  id: string;
  productId: string;
  productName: string;
  type: 'price' | 'stock';
  timestamp: string;
  previousVal: number;
  newVal: number;
  userEmail: string;
}

// Local Storage Helper keys
const STORAGE_KEYS = {
  RECOVERY: 'ts_price_manager_recovery_records',
  AUDIT: 'ts_price_manager_audit_logs',
  PRICE_STOCK: 'ts_price_manager_price_stock_history',
};

// Default expiry duration is 30 days
export const getExpiryDateString = (days: number): string => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
};

export class RecoveryService {
  // --- OFFLINE/LOCAL ACCESSORS ---

  private static getLocal<T>(key: string): T[] {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  private static setLocal<T>(key: string, data: T[]): void {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
      console.error('LocalStorage save failed', e);
    }
  }

  // --- RECOVERY RECORDS ---

  public static async recordDeletion(
    userId: string | null,
    type: RecoveryRecord['type'],
    originalData: any,
    title: string,
    subtitle: string,
    deletedBy: string,
    retentionDays: number = 30
  ): Promise<RecoveryRecord> {
    const record: RecoveryRecord = {
      id: `${type}_del_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      type,
      title,
      subtitle,
      deletedAt: new Date().toISOString(),
      deletedBy: deletedBy || 'Store Owner',
      originalData,
      expiryAt: getExpiryDateString(retentionDays),
    };

    // Save locally
    const local = this.getLocal<RecoveryRecord>(STORAGE_KEYS.RECOVERY);
    this.setLocal(STORAGE_KEYS.RECOVERY, [record, ...local]);

    // Save to Cloud if online & logged in
    if (userId) {
      try {
        await setDoc(doc(db, 'users', userId, 'recovery_items', record.id), record);
      } catch (e) {
        console.warn('Network offline or permissions missing, saved deletion locally.', e);
      }
    }

    // Auto-log audit entry
    await this.logAudit(userId, deletedBy, 'delete', type, title, JSON.stringify(originalData), '{deleted}');

    return record;
  }

  // --- AUDIT TIMELINE LOGGING ---

  public static async logAudit(
    userId: string | null,
    userEmail: string,
    actionType: AuditLog['actionType'],
    entityType: AuditLog['entityType'],
    entityName: string,
    previousValue: string,
    newValue: string
  ): Promise<AuditLog> {
    const log: AuditLog = {
      id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString(),
      userEmail: userEmail || 'Store Owner',
      actionType,
      entityType,
      entityName,
      previousValue: previousValue || '',
      newValue: newValue || '',
    };

    // Save locally
    const local = this.getLocal<AuditLog>(STORAGE_KEYS.AUDIT);
    this.setLocal(STORAGE_KEYS.AUDIT, [log, ...local].slice(0, 1000)); // cap at 1000 logs locally

    // Save to Cloud
    if (userId) {
      try {
        await setDoc(doc(db, 'users', userId, 'audit_logs', log.id), log);
      } catch (e) {
        console.warn('Audit cloud save deferred; saved locally.', e);
      }
    }

    return log;
  }

  // --- PRICE AND STOCK HISTORY ---

  public static async recordPriceStockChange(
    userId: string | null,
    productId: string,
    productName: string,
    type: 'price' | 'stock',
    previousVal: number,
    newVal: number,
    userEmail: string
  ): Promise<PriceStockRecord> {
    const record: PriceStockRecord = {
      id: `history_${type}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      productId,
      productName,
      type,
      timestamp: new Date().toISOString(),
      previousVal,
      newVal,
      userEmail: userEmail || 'Store Owner',
    };

    // Save locally
    const local = this.getLocal<PriceStockRecord>(STORAGE_KEYS.PRICE_STOCK);
    this.setLocal(STORAGE_KEYS.PRICE_STOCK, [record, ...local]);

    // Save to Cloud
    if (userId) {
      try {
        await setDoc(doc(db, 'users', userId, 'price_stock_history', record.id), record);
      } catch (e) {
        console.warn('History cloud save deferred; saved locally.', e);
      }
    }

    // Audit log
    await this.logAudit(
      userId,
      userEmail,
      'update',
      type,
      productName,
      `${previousVal}`,
      `${newVal}`
    );

    return record;
  }

  // --- SETTINGS SNAPSHOTS (RESTORE POINTS) ---

  public static async createSettingsBackup(
    userId: string | null,
    settings: any,
    title: string,
    userEmail: string,
    retentionDays: number = 30
  ): Promise<RecoveryRecord> {
    const record: RecoveryRecord = {
      id: `settings_point_${Date.now()}`,
      type: 'settings_point',
      title,
      subtitle: `Backup of app preferences, presets & modes`,
      deletedAt: new Date().toISOString(),
      deletedBy: userEmail || 'Store Owner',
      originalData: settings,
      expiryAt: getExpiryDateString(retentionDays),
    };

    // Save locally
    const local = this.getLocal<RecoveryRecord>(STORAGE_KEYS.RECOVERY);
    this.setLocal(STORAGE_KEYS.RECOVERY, [record, ...local]);

    // Save to Cloud
    if (userId) {
      try {
        await setDoc(doc(db, 'users', userId, 'recovery_items', record.id), record);
      } catch (e) {
        console.warn('Settings backup point saved locally.', e);
      }
    }

    // Audit
    await this.logAudit(userId, userEmail, 'create', 'settings', title, 'N/A', 'Backup Created');

    return record;
  }

  // --- RETRIEVAL ENGINE (SELF-HEALS AND SYNCS ON DEMAND) ---

  public static async syncAndFetchRecoveryData(userId: string | null): Promise<{
    recoveryRecords: RecoveryRecord[];
    auditLogs: AuditLog[];
    priceStockHistory: PriceStockRecord[];
  }> {
    // 1. Gather what we have in local cache
    let recoveryRecords = this.getLocal<RecoveryRecord>(STORAGE_KEYS.RECOVERY);
    let auditLogs = this.getLocal<AuditLog>(STORAGE_KEYS.AUDIT);
    let priceStockHistory = this.getLocal<PriceStockRecord>(STORAGE_KEYS.PRICE_STOCK);

    if (!userId) {
      return { recoveryRecords, auditLogs, priceStockHistory };
    }

    try {
      // 2. Pull recovery items from Firestore
      const recSnap = await getDocs(collection(db, 'users', userId, 'recovery_items'));
      const dbRec: RecoveryRecord[] = [];
      recSnap.forEach(docSnap => {
        dbRec.push(docSnap.data() as RecoveryRecord);
      });

      // 3. Pull audit logs from Firestore
      const auditSnap = await getDocs(collection(db, 'users', userId, 'audit_logs'));
      const dbAudit: AuditLog[] = [];
      auditSnap.forEach(docSnap => {
        dbAudit.push(docSnap.data() as AuditLog);
      });

      // 4. Pull price history from Firestore
      const histSnap = await getDocs(collection(db, 'users', userId, 'price_stock_history'));
      const dbHist: PriceStockRecord[] = [];
      histSnap.forEach(docSnap => {
        dbHist.push(docSnap.data() as PriceStockRecord);
      });

      // 5. Deduplicate and merge (prefer Cloud since it could be synced from another device)
      const mergeRecords = <T extends { id: string }>(localList: T[], cloudList: T[]): T[] => {
        const mergedMap = new Map<string, T>();
        localList.forEach(item => mergedMap.set(item.id, item));
        cloudList.forEach(item => mergedMap.set(item.id, item));
        return Array.from(mergedMap.values());
      };

      recoveryRecords = mergeRecords(recoveryRecords, dbRec).sort(
        (a, b) => new Date(b.deletedAt || 0).getTime() - new Date(a.deletedAt || 0).getTime()
      );

      auditLogs = mergeRecords(auditLogs, dbAudit).sort(
        (a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime()
      );

      priceStockHistory = mergeRecords(priceStockHistory, dbHist).sort(
        (a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime()
      );

      // Save merged dataset back to LocalStorage
      this.setLocal(STORAGE_KEYS.RECOVERY, recoveryRecords);
      this.setLocal(STORAGE_KEYS.AUDIT, auditLogs);
      this.setLocal(STORAGE_KEYS.PRICE_STOCK, priceStockHistory);

      // Try uploading any local logs that weren't in cloud (Automatic background check/healing sync)
      const cloudIds = new Set(dbRec.map(r => r.id));
      const unSynced = recoveryRecords.filter(r => !cloudIds.has(r.id));
      for (const record of unSynced) {
        setDoc(doc(db, 'users', userId, 'recovery_items', record.id), record).catch(() => {});
      }

      const cloudAuditIds = new Set(dbAudit.map(r => r.id));
      const unSyncedAudit = auditLogs.filter(a => !cloudAuditIds.has(a.id));
      for (const log of unSyncedAudit) {
        setDoc(doc(db, 'users', userId, 'audit_logs', log.id), log).catch(() => {});
      }

      const cloudHistIds = new Set(dbHist.map(r => r.id));
      const unSyncedHist = priceStockHistory.filter(h => !cloudHistIds.has(h.id));
      for (const h of unSyncedHist) {
        setDoc(doc(db, 'users', userId, 'price_stock_history', h.id), h).catch(() => {});
      }

    } catch (error) {
      console.warn('Failed to fully sync with firestore, using local cached recovery system.', error);
    }

    return { recoveryRecords, auditLogs, priceStockHistory };
  }

  // --- DELETE INDIVIDUAL RECOVERY RECORD PERMANENTLY ---

  public static async deletePermanently(userId: string | null, recordId: string): Promise<void> {
    // 1. Remove locally
    const local = this.getLocal<RecoveryRecord>(STORAGE_KEYS.RECOVERY);
    const updated = local.filter(r => r.id !== recordId);
    this.setLocal(STORAGE_KEYS.RECOVERY, updated);

    // 2. Remove on FireStore
    if (userId) {
      try {
        await deleteDoc(doc(db, 'users', userId, 'recovery_items', recordId));
      } catch (e) {
        console.error('Failed to permanently delete on Firestore', e);
      }
    }
  }

  // --- AUTO CLEANUP BASED ON RETENTION POLICY ---

  public static async cleanExpiredRecords(userId: string | null, customHours: number = 0): Promise<void> {
    const rawRecords = this.getLocal<RecoveryRecord>(STORAGE_KEYS.RECOVERY);
    const now = new Date();
    
    const valid: RecoveryRecord[] = [];
    const expired: RecoveryRecord[] = [];

    rawRecords.forEach(rec => {
      const expDate = new Date(rec.expiryAt);
      if (expDate < now) {
        expired.push(rec);
      } else {
        valid.push(rec);
      }
    });

    if (expired.length === 0) return;

    this.setLocal(STORAGE_KEYS.RECOVERY, valid);

    // Remove from Firestore
    if (userId) {
      for (const rec of expired) {
        try {
          await deleteDoc(doc(db, 'users', userId, 'recovery_items', rec.id));
        } catch (e) {
          console.error('Failed to remove expired document', e);
        }
      }
    }

    await this.logAudit(
      userId,
      'System Cleaner',
      'delete',
      'settings',
      'Automated Clean Routine',
      `${expired.length} records expired`,
      'Purged'
    );
  }
}
