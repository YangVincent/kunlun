// IndexedDB utility for persisting text state across sessions

const DB_NAME = 'kunlun-text';
const DB_VERSION = 1;
const SIMPLIFIER_STORE = 'simplifier-state';
const READER_STORE = 'reader-state';

let db = null;

async function openDB() {
  if (db) return db;

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const database = event.target.result;
      if (!database.objectStoreNames.contains(SIMPLIFIER_STORE)) {
        database.createObjectStore(SIMPLIFIER_STORE, { keyPath: 'id' });
      }
      if (!database.objectStoreNames.contains(READER_STORE)) {
        database.createObjectStore(READER_STORE, { keyPath: 'id' });
      }
    };
  });
}

// ============ SIMPLIFIER STORAGE ============

/**
 * Save simplifier state to IndexedDB
 * @param {Object} state - The state to save
 */
export async function saveSimplifierState(state) {
  try {
    const database = await openDB();

    const record = {
      id: 'current-state',
      ...state,
      savedAt: Date.now()
    };

    return new Promise((resolve, reject) => {
      const transaction = database.transaction([SIMPLIFIER_STORE], 'readwrite');
      const store = transaction.objectStore(SIMPLIFIER_STORE);
      const request = store.put(record);

      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('[TextStorage] Error saving simplifier state:', error);
    return false;
  }
}

/**
 * Load simplifier state from IndexedDB
 * @returns {Object|null} The saved state or null
 */
export async function loadSimplifierState() {
  try {
    const database = await openDB();

    return new Promise((resolve, reject) => {
      const transaction = database.transaction([SIMPLIFIER_STORE], 'readonly');
      const store = transaction.objectStore(SIMPLIFIER_STORE);
      const request = store.get('current-state');

      request.onsuccess = () => {
        const record = request.result;
        if (!record) {
          resolve(null);
          return;
        }

        const { id, savedAt, ...state } = record;
        resolve({ ...state, savedAt });
      };
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('[TextStorage] Error loading simplifier state:', error);
    return null;
  }
}

/**
 * Clear simplifier state from IndexedDB
 */
export async function clearSimplifierState() {
  try {
    const database = await openDB();

    return new Promise((resolve, reject) => {
      const transaction = database.transaction([SIMPLIFIER_STORE], 'readwrite');
      const store = transaction.objectStore(SIMPLIFIER_STORE);
      const request = store.delete('current-state');

      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('[TextStorage] Error clearing simplifier state:', error);
    return false;
  }
}

// ============ READER STORAGE ============

/**
 * Save reader state to IndexedDB
 * @param {Object} state - The state to save
 */
export async function saveReaderState(state) {
  try {
    const database = await openDB();

    const record = {
      id: 'current-state',
      ...state,
      savedAt: Date.now()
    };

    return new Promise((resolve, reject) => {
      const transaction = database.transaction([READER_STORE], 'readwrite');
      const store = transaction.objectStore(READER_STORE);
      const request = store.put(record);

      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('[TextStorage] Error saving reader state:', error);
    return false;
  }
}

/**
 * Load reader state from IndexedDB
 * @returns {Object|null} The saved state or null
 */
export async function loadReaderState() {
  try {
    const database = await openDB();

    return new Promise((resolve, reject) => {
      const transaction = database.transaction([READER_STORE], 'readonly');
      const store = transaction.objectStore(READER_STORE);
      const request = store.get('current-state');

      request.onsuccess = () => {
        const record = request.result;
        if (!record) {
          resolve(null);
          return;
        }

        const { id, savedAt, ...state } = record;
        resolve({ ...state, savedAt });
      };
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('[TextStorage] Error loading reader state:', error);
    return null;
  }
}

/**
 * Clear reader state from IndexedDB
 */
export async function clearReaderState() {
  try {
    const database = await openDB();

    return new Promise((resolve, reject) => {
      const transaction = database.transaction([READER_STORE], 'readwrite');
      const store = transaction.objectStore(READER_STORE);
      const request = store.delete('current-state');

      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('[TextStorage] Error clearing reader state:', error);
    return false;
  }
}
