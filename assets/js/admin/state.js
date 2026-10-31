// État partagé de l'éditeur : brouillon du livret, médias en attente, réglages locaux.

export const S = {
  D: null,          // brouillon en cours d'édition
  PUB: null,        // dernière version publiée (data/booklet.json)
  pending: {},      // { 'media/xxx.webp': 'data:image/webp;base64,…' } — pas encore publiés
  lang: 'fr',       // langue de saisie
  step: 'perso',
  tab: {},          // onglet ouvert par étape
  edit: null,       // éditeur de module ouvert { mod, cat, rec, place… }
  cfg: {},          // réglages locaux (GitHub, serveur) — jamais publiés
  dirty: false,
};

const CFG_KEY = 'livret-admin-cfg';
export function loadCfg() {
  try { S.cfg = JSON.parse(localStorage.getItem(CFG_KEY) || '{}'); } catch (e) { S.cfg = {}; }
  S.cfg.github = S.cfg.github || { owner: '', repo: '', branch: 'main', token: '' };
  S.cfg.backend = S.cfg.backend || { adminKey: '' };
}
export function saveCfg() { localStorage.setItem(CFG_KEY, JSON.stringify(S.cfg)); }

// ----- chemins « a.b.0.c » -----
export function getP(path, obj = S.D) {
  return path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
}
export function setP(path, val, obj = S.D) {
  const ks = path.split('.');
  let o = obj;
  for (let i = 0; i < ks.length - 1; i++) {
    const k = ks[i];
    if (o[k] == null || typeof o[k] !== 'object') o[k] = /^\d+$/.test(ks[i + 1]) ? [] : {};
    o = o[k];
  }
  o[ks[ks.length - 1]] = val;
}

// ----- brouillon (IndexedDB : les images en attente peuvent être lourdes) -----
function idb() {
  return new Promise((res, rej) => {
    const r = indexedDB.open('livret-admin', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('kv');
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}
export async function idbGet(key) {
  const db = await idb();
  return new Promise((res, rej) => { const q = db.transaction('kv').objectStore('kv').get(key); q.onsuccess = () => res(q.result); q.onerror = () => rej(q.error); });
}
export async function idbSet(key, val) {
  const db = await idb();
  return new Promise((res, rej) => { const t = db.transaction('kv', 'readwrite'); t.objectStore('kv').put(val, key); t.oncomplete = () => res(); t.onerror = () => rej(t.error); });
}
export async function idbDel(key) {
  const db = await idb();
  return new Promise(res => { const t = db.transaction('kv', 'readwrite'); t.objectStore('kv').delete(key); t.oncomplete = () => res(); });
}

let saveT = null;
const listeners = [];
export function onChange(fn) { listeners.push(fn); }
// À appeler après chaque modification du brouillon.
export function changed() {
  S.dirty = true;
  listeners.forEach(f => f());
  clearTimeout(saveT);
  saveT = setTimeout(() => idbSet('draft', { data: S.D, pending: S.pending, at: Date.now() }).catch(() => {}), 400);
}

export function clone(o) { return JSON.parse(JSON.stringify(o)); }

// Langues du livret (principale d'abord).
export function bookLangs() { return [S.D.languages.primary, ...S.D.languages.secondary]; }
