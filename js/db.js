// Telefonun içindeki veritabanı (IndexedDB). Bütün veriler sadece bu cihazda durur.
import { SEED_EXERCISES } from './data/exercises.js';

const DB_NAME = 'owl';
const VERSION = 1;
let dbPromise;

function open() {
  dbPromise ??= new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      db.createObjectStore('exercises', { keyPath: 'id' });
      db.createObjectStore('templates', { keyPath: 'id' });
      db.createObjectStore('workouts', { keyPath: 'id' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

async function run(store, mode, fn) {
  const db = await open();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, mode);
    const req = fn(tx.objectStore(store));
    tx.oncomplete = () => resolve(req?.result);
    tx.onerror = () => reject(tx.error);
  });
}

export const getAll = store => run(store, 'readonly', s => s.getAll());
export const put = (store, value) => run(store, 'readwrite', s => s.put(value));
export const del = (store, id) => run(store, 'readwrite', s => s.delete(id));

// İlk açılışta hazır egzersiz listesini yükler
export async function seedIfEmpty() {
  const existing = await run('exercises', 'readonly', s => s.count());
  if (existing) return;
  await run('exercises', 'readwrite', s => SEED_EXERCISES.forEach(e => s.put(e)));
}
