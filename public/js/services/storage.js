// IndexedDB key-value store for things too big for localStorage (imported meshes).
let dbp;
const open = () => dbp || (dbp = new Promise((res, rej) => {
  const r = indexedDB.open("it3d", 1);
  r.onupgradeneeded = () => r.result.createObjectStore("kv");
  r.onsuccess = () => res(r.result);
  r.onerror = () => rej(r.error);
}));

export const blobStore = {
  async get(key) {
    try {
      const db = await open();
      return await new Promise((res, rej) => { const q = db.transaction("kv").objectStore("kv").get(key); q.onsuccess = () => res(q.result); q.onerror = () => rej(q.error); });
    } catch { return null; }
  },
  async set(key, value) {
    try {
      const db = await open();
      await new Promise((res, rej) => { const tx = db.transaction("kv", "readwrite"); tx.objectStore("kv").put(value, key); tx.oncomplete = res; tx.onerror = () => rej(tx.error); });
    } catch { /* private mode or quota: the import still works for this session */ }
  }
};
