// Publication sur GitHub (API Git Data : un seul commit pour tous les fichiers).
import { S } from './state.js';

const API = 'https://api.github.com';

async function gh(path, opts = {}) {
  const g = S.cfg.github;
  const r = await fetch(API + path, {
    ...opts,
    headers: { Authorization: 'Bearer ' + g.token, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', ...(opts.body ? { 'Content-Type': 'application/json' } : {}) },
  });
  if (!r.ok) {
    const e = await r.json().catch(() => ({}));
    const hints = { 401: 'jeton invalide ou expiré', 403: 'le jeton n’a pas le droit d’écrire dans ce dépôt', 404: 'dépôt introuvable (vérifiez le compte et le nom du dépôt, et que le jeton y a accès)', 409: 'le dépôt est vide : déposez d’abord les fichiers de l’application (voir le guide)', 422: 'branche introuvable' };
    throw new Error(`GitHub ${r.status} — ${hints[r.status] || e.message || 'erreur'}`);
  }
  return r.status === 204 ? null : r.json();
}
const repo = () => `/repos/${encodeURIComponent(S.cfg.github.owner)}/${encodeURIComponent(S.cfg.github.repo)}`;
const branch = () => S.cfg.github.branch || 'main';

export async function testGithub() {
  const r = await gh(repo());
  if (!r.permissions?.push) throw new Error('le jeton peut lire le dépôt mais pas y écrire (droit « Contents : Read and write » requis)');
  await gh(`${repo()}/git/ref/heads/${encodeURIComponent(branch())}`);
  return r;
}

export function textToB64(text) {
  const bytes = new TextEncoder().encode(text);
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}

// files : [{ path, text } | { path, base64 } | { path, delete: true }]
export async function publishFiles(files, message, onProgress = () => {}) {
  const ref = await gh(`${repo()}/git/ref/heads/${encodeURIComponent(branch())}`);
  const base = ref.object.sha;
  const commit = await gh(`${repo()}/git/commits/${base}`);
  const tree = [];
  let i = 0;
  for (const f of files) {
    if (f.delete) { tree.push({ path: f.path, mode: '100644', type: 'blob', sha: null }); continue; }
    const blob = await gh(`${repo()}/git/blobs`, { method: 'POST', body: JSON.stringify({ content: f.base64 ?? textToB64(f.text), encoding: 'base64' }) });
    tree.push({ path: f.path, mode: '100644', type: 'blob', sha: blob.sha });
    onProgress(++i, files.length, f.path);
  }
  const t = await gh(`${repo()}/git/trees`, { method: 'POST', body: JSON.stringify({ base_tree: commit.tree.sha, tree }) });
  const c = await gh(`${repo()}/git/commits`, { method: 'POST', body: JSON.stringify({ message, tree: t.sha, parents: [base] }) });
  await gh(`${repo()}/git/refs/heads/${encodeURIComponent(branch())}`, { method: 'PATCH', body: JSON.stringify({ sha: c.sha }) });
  return c;
}

export async function repoFileExists(path) {
  try { await gh(`${repo()}/contents/${path}?ref=${encodeURIComponent(branch())}`); return true; } catch (e) { return false; }
}
