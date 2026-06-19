const DB_NAME = 'browzarr-files';
const STORE = 'blobs';


export function openDB(): Promise<IDBDatabase> { 
  return new Promise((res, rej) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => res(req.result);
    req.onerror = () => rej(req.error);
  });
}

export async function saveFile(blob: Blob, key: string): Promise<string> {
  const db = await openDB();
  return new Promise((res, rej) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put({ blob, key }, key);
    tx.oncomplete = () => res(key);
    tx.onerror = () => rej(tx.error);
  });
}

export async function loadFile(key: string): Promise<{ blob: Blob; name: string } | null> {
  const db = await openDB();
  console.log(key)
  return new Promise((res, rej) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).get(key);
    req.onsuccess = () => res(req.result ?? null);
    req.onerror = () => rej(req.error);
  });
}