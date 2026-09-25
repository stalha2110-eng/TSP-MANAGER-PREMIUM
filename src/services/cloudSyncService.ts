import { 
  collection, 
  doc, 
  getDocs, 
  getDocsFromServer, 
  getDocFromServer,
  doc as firestoreDoc, 
  setDoc, 
  orderBy, 
  query 
} from 'firebase/firestore';
import { db, sanitizeForFirestore, auth } from '../firebase';
import { AppState, Item, Bill, Note, UnbilledEntry } from '../types';
import { RecoveryService } from './recoveryService';
import { deduplicateById } from '../constants/initialState';
import { getUnbilledEntries, saveUnbilledEntries } from '../lib/unbilledStorage';
import { isItemDeleted } from '../utils/deletionTracker';

export interface SyncResult {
  success: boolean;
  isOnline: boolean;
  hasAppUpdate: boolean;
  appVersion?: string;
  itemsSynced: number;
  billsSynced: number;
  notesSynced: number;
  unbilledSynced: number;
  message: string;
  timestamp: string;
}

export class CloudSyncService {
  private static isSyncing = false;

  /**
   * Check if the device is currently online
   */
  public static isOnline(): boolean {
    return typeof navigator !== 'undefined' ? navigator.onLine : true;
  }

  /**
   * Check if a newer version of the web app / service worker is available.
   * This ensures iOS Safari and Add-to-Home-Screen standalone users receive
   * updates identically to Android users when they pull or refresh the page.
   */
  public static async checkForAppUpdates(): Promise<{ hasUpdate: boolean; version?: string }> {
    try {
      let hasWorkerUpdate = false;
      let newVersionTag: string | undefined = undefined;

      // 1. Service Worker Update Check
      if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
        try {
          const registration = await navigator.serviceWorker.getRegistration();
          if (registration) {
            await registration.update();
            if (registration.waiting) {
              hasWorkerUpdate = true;
              // Inform waiting worker to activate
              registration.waiting.postMessage({ type: 'SKIP_WAITING' });
            }
          }
        } catch (swErr) {
          console.warn('[CloudSync] Service worker check warning:', swErr);
        }
      }

      // 2. Server API Version Check with Cache Busting
      try {
        const response = await fetch(`/api/version?_t=${Date.now()}`, {
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache, no-store' }
        });
        if (response.ok) {
          const data = await response.json();
          const serverBuild = data?.buildTag || data?.version;
          const currentBuild = localStorage.getItem('ts_app_build_tag');
          
          if (serverBuild) {
            newVersionTag = serverBuild;
            if (currentBuild && currentBuild !== serverBuild) {
              hasWorkerUpdate = true;
            }
            localStorage.setItem('ts_app_build_tag', serverBuild);
          }
        }
      } catch (verErr) {
        // Silent network fallback if offline or API unavailable
      }

      return {
        hasUpdate: hasWorkerUpdate,
        version: newVersionTag
      };
    } catch (e) {
      console.warn('[CloudSync] Error checking app updates:', e);
      return { hasUpdate: false };
    }
  }

  /**
   * Directly and explicitly re-fetches the inventory catalog from the Firestore server,
   * bypassing any stale WebKit/Safari client caches.
   * Also uploads any locally created offline items to maintain 100% data integrity.
   */
  public static async refetchInventoryCatalog(
    currentState: AppState,
    onStateUpdate?: (updater: (prev: AppState) => AppState) => void,
    onProgress?: (stage: string, count?: number) => void
  ): Promise<{ success: boolean; items: Item[]; count: number; source: 'server' | 'cache' | 'local'; message: string }> {
    if (onProgress) onProgress('Connecting to Cloud Firestore...');

    const user = currentState.user || auth.currentUser;
    if (!user || user.uid === 'guest_user') {
      const localItems = currentState.items || [];
      if (onProgress) onProgress('Inventory catalog verified (Local)', localItems.length);
      return {
        success: true,
        items: localItems,
        count: localItems.length,
        source: 'local',
        message: `Local guest inventory catalog verified (${localItems.length} items)`
      };
    }

    const uid = user.uid;
    const itemsRef = collection(db, 'users', uid, 'items');

    if (onProgress) onProgress('Querying Firestore server for inventory catalog...');

    let itemsList: Item[] = [];
    let source: 'server' | 'cache' = 'server';

    try {
      let snap;
      try {
        snap = await getDocsFromServer(query(itemsRef, orderBy('lastUpdated', 'desc')));
      } catch (err1) {
        try {
          // If orderBy without composite index failed on server, query raw collection
          snap = await getDocsFromServer(itemsRef);
        } catch (err2) {
          source = 'cache';
          try {
            snap = await getDocs(query(itemsRef, orderBy('lastUpdated', 'desc')));
          } catch {
            snap = await getDocs(itemsRef);
          }
        }
      }

      snap.forEach(docSnap => {
        const data = docSnap.data();
        itemsList.push({
          ...data,
          id: docSnap.id,
          translations: {
            en: data.name || '',
            hi: '',
            mr: '',
            'hi-en': '',
            ...(data.translations || {})
          }
        } as Item);
      });

      if (onProgress) onProgress(`Received ${itemsList.length} items from ${source}. Reconciling...`, itemsList.length);

      // Self-healing: identify genuine offline items missing from cloud, excluding any deleted items
      const localItems = currentState.items || [];
      const unsyncedItems = localItems.filter(li => !itemsList.some(ci => ci.id === li.id) && !isItemDeleted(li.id));
      if (unsyncedItems.length > 0) {
        if (onProgress) onProgress(`Uploading ${unsyncedItems.length} offline items to Cloud Firestore...`);
        for (const item of unsyncedItems) {
          try {
            await setDoc(doc(db, 'users', uid, 'items', item.id), sanitizeForFirestore(item));
          } catch (upErr) {
            console.warn('[CloudSync] Failed to upload offline item:', item.name, upErr);
          }
        }
      }

      const cleanItemsList = itemsList.filter(ci => !isItemDeleted(ci.id));
      const mergedItems = deduplicateById([...cleanItemsList, ...unsyncedItems]).sort((a, b) => 
        new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime()
      );

      if (onStateUpdate) {
        onStateUpdate(prev => ({ ...prev, items: mergedItems }));
      }

      // Persist to local backup storage to prevent Safari cache wipe
      try {
        const cached = localStorage.getItem('price_manager_state');
        if (cached) {
          const parsed = JSON.parse(cached);
          parsed.items = mergedItems;
          localStorage.setItem('price_manager_state', JSON.stringify(parsed));
        }
      } catch {}

      if (onProgress) onProgress(`Inventory catalog re-fetch complete!`, mergedItems.length);

      return {
        success: true,
        items: mergedItems,
        count: mergedItems.length,
        source,
        message: `Successfully re-fetched ${mergedItems.length} inventory items from Firestore (${source})`
      };
    } catch (err: any) {
      console.warn('[CloudSync] Items sync warning:', err);
      const fallbackItems = currentState.items || [];
      return {
        success: false,
        items: fallbackItems,
        count: fallbackItems.length,
        source: 'local',
        message: err?.message || 'Failed to re-fetch inventory catalog'
      };
    }
  }

  /**
   * Forces a comprehensive synchronization between local offline data and Firestore.
   * Restores connectivity, flushes offline queues, and brings down latest remote records.
   */
  public static async forceSyncWithFirestore(
    currentState: AppState,
    onStateUpdate?: (updater: (prev: AppState) => AppState) => void,
    options?: { skipCatalog?: boolean; itemsList?: Item[] }
  ): Promise<SyncResult> {
    if (this.isSyncing) {
      return {
        success: true,
        isOnline: this.isOnline(),
        hasAppUpdate: false,
        itemsSynced: 0,
        billsSynced: 0,
        notesSynced: 0,
        unbilledSynced: 0,
        message: "Sync already in progress / सिंक प्रक्रिया जारी है",
        timestamp: new Date().toLocaleTimeString()
      };
    }

    this.isSyncing = true;
    const online = this.isOnline();

    if (!online) {
      this.isSyncing = false;
      return {
        success: false,
        isOnline: false,
        hasAppUpdate: false,
        itemsSynced: 0,
        billsSynced: 0,
        notesSynced: 0,
        unbilledSynced: 0,
        message: "Offline: Changes saved locally and will sync when internet returns / ऑफ़लाइन",
        timestamp: new Date().toLocaleTimeString()
      };
    }

    try {
      const user = currentState.user || auth.currentUser;
      const isGuest = !user || user.uid === 'guest_user';

      // First check for any software updates
      const updateCheck = await this.checkForAppUpdates();

      if (isGuest) {
        this.isSyncing = false;
        return {
          success: true,
          isOnline: true,
          hasAppUpdate: updateCheck.hasUpdate,
          appVersion: updateCheck.version,
          itemsSynced: currentState.items.length,
          billsSynced: currentState.bills.length,
          notesSynced: currentState.notes.length,
          unbilledSynced: (currentState.unbilledEntries || []).length,
          message: "Guest Mode: Local records verified / गेस्ट मोड",
          timestamp: new Date().toLocaleTimeString()
        };
      }

      const uid = user.uid;

      // =========================================================================
      // 1. SYNC SETTINGS & STORE CREDENTIALS
      // =========================================================================
      try {
        const userDocRef = doc(db, 'users', uid);
        const serverDoc = await getDocFromServer(userDocRef);
        if (serverDoc.exists()) {
          const cloudData = serverDoc.data();
          if (onStateUpdate) {
            onStateUpdate(prev => ({
              ...prev,
              settings: { ...prev.settings, ...cloudData }
            }));
          }
        } else {
          // Upload local settings to newly created document
          await setDoc(userDocRef, sanitizeForFirestore(currentState.settings), { merge: true });
        }
      } catch (settErr) {
        console.warn("[CloudSync] Settings sync warning:", settErr);
      }

      // =========================================================================
      // 2. RE-FETCH & SELF-HEALING SYNC FOR ITEMS / INVENTORY CATALOG
      // =========================================================================
      let itemsList: Item[] = [];
      if (options?.skipCatalog && options?.itemsList) {
        itemsList = options.itemsList;
      } else {
        try {
          const catalogRes = await this.refetchInventoryCatalog(currentState, onStateUpdate);
          itemsList = catalogRes.items;
        } catch (itemErr) {
          console.warn("[CloudSync] Items sync warning:", itemErr);
          itemsList = currentState.items;
        }
      }

      // =========================================================================
      // 3. SELF-HEALING SYNC FOR BILLS & INVOICES
      // =========================================================================
      let billsList: Bill[] = [];
      try {
        const billsRef = collection(db, 'users', uid, 'bills');
        let snap;
        try {
          snap = await getDocsFromServer(query(billsRef, orderBy('timestamp', 'desc')));
        } catch {
          snap = await getDocs(query(billsRef, orderBy('timestamp', 'desc')));
        }

        snap.forEach(docSnap => {
          const data = docSnap.data();
          if (data) {
            billsList.push({
              id: docSnap.id,
              billNumber: data.billNumber || `INV-${Date.now()}`,
              customerName: data.customerName || '',
              customerPhone: data.customerPhone || '',
              items: Array.isArray(data.items) ? data.items.map((item: any) => ({
                itemId: item.itemId || item.id || '',
                name: item.name || '',
                quantity: item.quantity || 0,
                cost: item.cost || item.buyingPrice || 0,
                price: item.price || item.retailPrice || 0,
                unit: item.unit || 'pcs'
              })) : [],
              discount: typeof data.discount === 'number' ? data.discount : 0,
              tax: typeof data.tax === 'number' ? data.tax : 0,
              subtotal: typeof data.subtotal === 'number' ? data.subtotal : 0,
              total: typeof data.total === 'number' ? data.total : 0,
              paymentMethod: data.paymentMethod || 'Cash',
              timestamp: data.timestamp || new Date().toISOString(),
              deviceId: data.deviceId || '',
              deviceName: data.deviceName || ''
            });
          }
        });

        // Detect unsynced offline bills
        const localBills = currentState.bills || [];
        const unsyncedBills = localBills.filter(lb => !billsList.some(cb => cb.id === lb.id));
        if (unsyncedBills.length > 0) {
          for (const b of unsyncedBills) {
            try {
              await setDoc(doc(db, 'users', uid, 'bills', b.id), sanitizeForFirestore(b));
            } catch (upErr) {
              console.warn('[CloudSync] Failed to upload offline bill:', b.billNumber, upErr);
            }
          }
        }

        const mergedBills = deduplicateById([...billsList, ...unsyncedBills]).sort((a, b) => 
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );

        if (onStateUpdate) {
          onStateUpdate(prev => ({ ...prev, bills: mergedBills }));
        }
        billsList = mergedBills;
      } catch (billErr) {
        console.warn("[CloudSync] Bills sync warning:", billErr);
        billsList = currentState.bills;
      }

      // =========================================================================
      // 4. SELF-HEALING SYNC FOR NOTES
      // =========================================================================
      let notesList: Note[] = [];
      try {
        const notesRef = collection(db, 'users', uid, 'notes');
        let snap;
        try {
          snap = await getDocsFromServer(query(notesRef, orderBy('createdAt', 'desc')));
        } catch {
          snap = await getDocs(query(notesRef, orderBy('createdAt', 'desc')));
        }

        snap.forEach(docSnap => notesList.push({ ...docSnap.data() as Note, id: docSnap.id }));

        const localNotes = currentState.notes || [];
        const unsyncedNotes = localNotes.filter(ln => !notesList.some(cn => cn.id === ln.id));
        if (unsyncedNotes.length > 0) {
          for (const note of unsyncedNotes) {
            try {
              await setDoc(doc(db, 'users', uid, 'notes', note.id), sanitizeForFirestore(note));
            } catch (upErr) {
              console.warn('[CloudSync] Failed to upload offline note:', note.title, upErr);
            }
          }
        }

        const mergedNotes = deduplicateById([...notesList, ...unsyncedNotes]).sort((a, b) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );

        if (onStateUpdate) {
          onStateUpdate(prev => ({ ...prev, notes: mergedNotes }));
        }
        notesList = mergedNotes;
      } catch (noteErr) {
        console.warn("[CloudSync] Notes sync warning:", noteErr);
        notesList = currentState.notes;
      }

      // =========================================================================
      // 5. SELF-HEALING SYNC FOR UNBILLED MICRO-SALES
      // =========================================================================
      let unbilledList: UnbilledEntry[] = [];
      try {
        const unbilledRef = collection(db, 'users', uid, 'unbilledEntries');
        let snap;
        try {
          snap = await getDocsFromServer(query(unbilledRef, orderBy('timestamp', 'desc')));
        } catch {
          snap = await getDocs(query(unbilledRef, orderBy('timestamp', 'desc')));
        }

        snap.forEach(docSnap => {
          const data = docSnap.data();
          if (data) {
            unbilledList.push({
              id: docSnap.id,
              amount: typeof data.amount === 'number' ? data.amount : Number(data.amount) || 0,
              category: data.category || 'General',
              timestamp: typeof data.timestamp === 'number' ? data.timestamp : Date.now(),
              dateStr: data.dateStr || new Date().toISOString(),
              cashier: data.cashier || 'Store Cashier',
              note: data.note || ''
            });
          }
        });

        const localUnbilled = getUnbilledEntries();
        const unsyncedUnbilled = localUnbilled.filter(lu => !unbilledList.some(cu => cu.id === lu.id));
        if (unsyncedUnbilled.length > 0) {
          for (const u of unsyncedUnbilled) {
            try {
              await setDoc(doc(db, 'users', uid, 'unbilledEntries', u.id), u);
            } catch (upErr) {
              console.warn('[CloudSync] Failed to upload offline unbilled:', u.id, upErr);
            }
          }
        }

        const mergedUnbilled = [...unbilledList, ...unsyncedUnbilled].sort((a, b) => b.timestamp - a.timestamp);
        saveUnbilledEntries(mergedUnbilled);
        if (onStateUpdate) {
          onStateUpdate(prev => ({ ...prev, unbilledEntries: mergedUnbilled }));
        }
      } catch (unbilledErr) {
        console.warn("[CloudSync] Unbilled sync warning:", unbilledErr);
      }

      // =========================================================================
      // 6. SYNC RECOVERY & AUDIT RECORDS
      // =========================================================================
      try {
        await RecoveryService.syncAndFetchRecoveryData(uid);
      } catch (recErr) {
        console.warn("[CloudSync] Recovery sync warning:", recErr);
      }

      this.isSyncing = false;
      return {
        success: true,
        isOnline: true,
        hasAppUpdate: updateCheck.hasUpdate,
        appVersion: updateCheck.version,
        itemsSynced: itemsList.length,
        billsSynced: billsList.length,
        notesSynced: notesList.length,
        unbilledSynced: unbilledList.length,
        message: updateCheck.hasUpdate 
          ? "Sync complete! New app update available / नया अपडेट उपलब्ध है"
          : "✓ Firestore Cloud Database fully synced / डेटाबेस सिंक पूरा हुआ",
        timestamp: new Date().toLocaleTimeString()
      };
    } catch (error: any) {
      this.isSyncing = false;
      console.error("[CloudSync] Synchronous failure:", error);
      return {
        success: false,
        isOnline: online,
        hasAppUpdate: false,
        itemsSynced: 0,
        billsSynced: 0,
        notesSynced: 0,
        unbilledSynced: 0,
        message: `Sync warning: ${error?.message || 'Using local database cache'}`,
        timestamp: new Date().toLocaleTimeString()
      };
    }
  }

  /**
   * Triggers an application refresh to reload all scripts and styles,
   * guaranteeing that the latest features and changes become active.
   */
  public static reloadApp(): void {
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  }
}
