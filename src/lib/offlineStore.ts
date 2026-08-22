// IndexedDB Offline Queue & Store for Spektrum Kalibrasi Digital PWA

const DB_NAME = 'SpektrumKalibrasiOfflineDB';
const DB_VERSION = 1;
const STORE_WORKSHEETS = 'pendingWorksheets';
const STORE_INSPECTIONS = 'pendingInspections';

export interface OfflineWorksheet {
  id: string;
  deviceName: string;
  brand: string;
  serialNumber: string;
  status: string;
  data: any;
  timestamp: number;
  synced: boolean;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event: any) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_WORKSHEETS)) {
        const store = db.createObjectStore(STORE_WORKSHEETS, { keyPath: 'id' });
        store.createIndex('synced', 'synced', { unique: false });
        store.createIndex('timestamp', 'timestamp', { unique: false });
      }
      if (!db.objectStoreNames.contains(STORE_INSPECTIONS)) {
        db.createObjectStore(STORE_INSPECTIONS, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveOfflineWorksheet(worksheet: OfflineWorksheet): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_WORKSHEETS, 'readwrite');
    const store = tx.objectStore(STORE_WORKSHEETS);
    store.put(worksheet);
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.error('Failed to save offline worksheet to IndexedDB:', err);
    // Fallback to localStorage
    const localKey = `offline_ws_${worksheet.id}`;
    localStorage.setItem(localKey, JSON.stringify(worksheet));
  }
}

export async function getPendingOfflineWorksheets(): Promise<OfflineWorksheet[]> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_WORKSHEETS, 'readonly');
    const store = tx.objectStore(STORE_WORKSHEETS);
    const request = store.getAll();

    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        const all: OfflineWorksheet[] = request.result || [];
        resolve(all.filter(item => !item.synced));
      };
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.error('Failed to get pending offline worksheets from IndexedDB:', err);
    // Fallback to localStorage
    const pending: OfflineWorksheet[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('offline_ws_')) {
        try {
          const item = JSON.parse(localStorage.getItem(key) || '{}');
          if (item && !item.synced) pending.push(item);
        } catch (_) {}
      }
    }
    return pending;
  }
}

export async function markWorksheetSynced(id: string): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_WORKSHEETS, 'readwrite');
    const store = tx.objectStore(STORE_WORKSHEETS);
    store.delete(id);
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.error('Failed to delete synced offline worksheet:', err);
    localStorage.removeItem(`offline_ws_${id}`);
  }
}
