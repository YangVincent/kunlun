// IndexedDB utility for persisting audio files across tab switches

const DB_NAME = 'kunlun-audio';
const DB_VERSION = 1;
const STORE_NAME = 'audio-files';

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
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
  });
}

/**
 * Save an audio file to IndexedDB
 * @param {File} file - The audio file to save
 * @param {Object} metadata - Additional metadata (transcript, displayMode, etc.)
 */
export async function saveAudioFile(file, metadata = {}) {
  try {
    const database = await openDB();
    const arrayBuffer = await file.arrayBuffer();

    const record = {
      id: 'current-audio', // Single slot for current audio
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
      lastModified: file.lastModified,
      arrayBuffer,
      ...metadata,
      savedAt: Date.now()
    };

    return new Promise((resolve, reject) => {
      const transaction = database.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(record);

      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('[AudioStorage] Error saving file:', error);
    return false;
  }
}

/**
 * Update metadata without re-saving the file
 * @param {Object} metadata - Metadata to update
 */
export async function updateAudioMetadata(metadata) {
  try {
    const database = await openDB();

    return new Promise((resolve, reject) => {
      const transaction = database.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const getRequest = store.get('current-audio');

      getRequest.onsuccess = () => {
        if (getRequest.result) {
          const updated = { ...getRequest.result, ...metadata, savedAt: Date.now() };
          const putRequest = store.put(updated);
          putRequest.onsuccess = () => resolve(true);
          putRequest.onerror = () => reject(putRequest.error);
        } else {
          resolve(false);
        }
      };
      getRequest.onerror = () => reject(getRequest.error);
    });
  } catch (error) {
    console.error('[AudioStorage] Error updating metadata:', error);
    return false;
  }
}

/**
 * Load the saved audio file from IndexedDB
 * @returns {Object|null} { file: File, metadata: {...} } or null if not found
 */
export async function loadAudioFile() {
  try {
    const database = await openDB();

    return new Promise((resolve, reject) => {
      const transaction = database.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get('current-audio');

      request.onsuccess = () => {
        const record = request.result;
        if (!record) {
          resolve(null);
          return;
        }

        // Reconstruct File from ArrayBuffer
        const blob = new Blob([record.arrayBuffer], { type: record.fileType });
        const file = new File([blob], record.fileName, {
          type: record.fileType,
          lastModified: record.lastModified
        });

        // Extract metadata (everything except the file data)
        const { arrayBuffer, fileName, fileType, fileSize, lastModified, id, ...metadata } = record;

        resolve({ file, metadata });
      };
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('[AudioStorage] Error loading file:', error);
    return null;
  }
}

/**
 * Clear the saved audio file from IndexedDB
 */
export async function clearAudioFile() {
  try {
    const database = await openDB();

    return new Promise((resolve, reject) => {
      const transaction = database.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete('current-audio');

      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('[AudioStorage] Error clearing file:', error);
    return false;
  }
}

/**
 * Check if there's a saved audio file
 * @returns {boolean}
 */
export async function hasAudioFile() {
  try {
    const database = await openDB();

    return new Promise((resolve, reject) => {
      const transaction = database.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.count();

      request.onsuccess = () => resolve(request.result > 0);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('[AudioStorage] Error checking file:', error);
    return false;
  }
}
