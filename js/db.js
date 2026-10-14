// Telefonun içindeki veritabanı (IndexedDB). Bütün veriler sadece bu cihazda durur.
import { SEED_EXERCISES } from './data/exercises.js';
import { SEED_TEMPLATES } from './data/program.js';

const DB_NAME = 'owl';
const VERSION = 2;
let dbPromise;

function open() {
  dbPromise ??= new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, VERSION);
    req.onupgradeneeded = e => {
      const db = req.result;
      if (e.oldVersion < 1) {
        db.createObjectStore('exercises', { keyPath: 'id' });
        db.createObjectStore('templates', { keyPath: 'id' });
        db.createObjectStore('workouts', { keyPath: 'id' });
      }
      if (e.oldVersion < 2) db.createObjectStore('meta', { keyPath: 'key' });
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

export const get = (store, id) => run(store, 'readonly', s => s.get(id));
export const getAll = store => run(store, 'readonly', s => s.getAll());
export const put = (store, value) => run(store, 'readwrite', s => s.put(value));
export const del = (store, id) => run(store, 'readwrite', s => s.delete(id));

// Hazır egzersizlerden eksik olanları ekler; hazır şablonları sadece bir kez yükler
// (sonradan silersen geri gelmez).
export async function ensureSeedData() {
  const ids = new Set((await getAll('exercises')).map(e => e.id));
  const missing = SEED_EXERCISES.filter(e => !ids.has(e.id));
  if (missing.length) await run('exercises', 'readwrite', s => missing.forEach(e => s.put(e)));

  if (!(await get('meta', 'templatesSeeded'))) {
    await run('templates', 'readwrite', s => SEED_TEMPLATES.forEach(t => s.put(t)));
    await put('meta', { key: 'templatesSeeded', value: true });
  }
}
