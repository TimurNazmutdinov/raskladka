// Обёртка над IndexedDB: хранилища trips, products, settings (ключ-значение).
import { DB_NAME, DB_VERSION } from './defaults.js';

const STORES = ['trips', 'products', 'menus', 'plans', 'settings'];
let dbp;

function open() {
  if (!dbp) {
    dbp = new Promise((res, rej) => {
      const r = indexedDB.open(DB_NAME, DB_VERSION);
      r.onupgradeneeded = () => {
        for (const s of STORES) if (!r.result.objectStoreNames.contains(s)) r.result.createObjectStore(s);
      };
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    });
  }
  return dbp;
}

async function tx(store, mode, fn) {
  const db = await open();
  return new Promise((res, rej) => {
    const t = db.transaction(store, mode);
    const req = fn(t.objectStore(store));
    t.oncomplete = () => res(req && req.result);
    t.onerror = () => rej(t.error);
  });
}

export const get = (store, key) => tx(store, 'readonly', s => s.get(key));
export const put = (store, key, val) => tx(store, 'readwrite', s => s.put(val, key));
export const del = (store, key) => tx(store, 'readwrite', s => s.delete(key));
export const getAll = (store) => tx(store, 'readonly', s => s.getAll());

export function entries(store) {
  return open().then(db => new Promise((res, rej) => {
    const out = [], r = db.transaction(store, 'readonly').objectStore(store).openCursor();
    r.onsuccess = () => { const c = r.result; if (c) { out.push([c.key, c.value]); c.continue(); } else res(out); };
    r.onerror = () => rej(r.error);
  }));
}
export const clear = store => tx(store, 'readwrite', s => s.clear());
