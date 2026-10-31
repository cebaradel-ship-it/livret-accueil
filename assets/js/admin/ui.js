// Composants de formulaire de l'éditeur (HTML en chaînes + montage après rendu).
import { S, getP, setP, changed, bookLangs } from './state.js';
import { icon, ICONS } from '../icons.js';
import { LANGS, flag, esc } from '../core.js';

export { esc, icon, flag };

// ---------------------------------------------------------------- champs simples
export function flagsRow(path) {
  const langs = bookLangs();
  if (langs.length < 2) return '';
  const v = getP(path) || {};
  return `<div class="flags">${langs.map(l => `<button type="button" data-edit-lang="${l}" class="${l === S.lang ? 'on' : ''} ${v[l] ? '' : 'empty'}" title="${esc(LANGS[l]?.name || l)}">${flag(l, 20)}</button>`).join('')}
    ${S.cfg.backend?.adminKey && S.D.backend?.url ? `<button type="button" class="trb" data-trans="${esc(path)}" title="Traduire depuis la langue principale vers les autres langues">✨ Traduire</button>` : ''}</div>`;
}

export function text(path, label, o = {}) {
  const val = o.tr ? (getP(path) || {})[S.lang] ?? '' : getP(path) ?? '';
  const attrs = `data-bind="${esc(path)}"${o.tr ? ' data-tr' : ''}${o.kind ? ` data-kind="${o.kind}"` : ''} placeholder="${esc(o.ph || '')}"${o.max ? ` maxlength="${o.max}"` : ''}`;
  const input = o.area
    ? `<textarea ${attrs} rows="${o.rows || 4}">${esc(val)}</textarea>`
    : `<input type="${o.type || 'text'}" ${attrs} value="${esc(val)}"${o.min != null ? ` min="${o.min}"` : ''}${o.max2 != null ? ` max="${o.max2}"` : ''}${o.step ? ` step="${o.step}"` : ''}>`;
  return `<label class="f">${label ? `<span>${label}</span>` : ''}${input}${o.tr ? flagsRow(path) : ''}${o.hint ? `<div class="hint">${o.hint}</div>` : ''}</label>`;
}

function toHex(c) {
  if (!c) return '#000000';
  if (/^#[\da-f]{6}$/i.test(c)) return c;
  if (/^#[\da-f]{3}$/i.test(c)) return '#' + c.slice(1).split('').map(x => x + x).join('');
  const m = /rgba?\(\s*(\d+)[ ,]+(\d+)[ ,]+(\d+)/.exec(c);
  return m ? '#' + [m[1], m[2], m[3]].map(x => (+x).toString(16).padStart(2, '0')).join('') : '#000000';
}
export function color(path, label) {
  const v = getP(path) || '';
  return `<div class="f"><span>${label}</span><div class="color"><input type="color" data-bind="${esc(path)}" data-kind="color" value="${toHex(v)}"><input type="text" class="inp" data-bind="${esc(path)}" data-kind="color" value="${esc(v)}"></div></div>`;
}
export function toggle(path, label, o = {}) {
  const v = !!getP(path);
  return `<label class="tog"><input type="checkbox" data-bind="${esc(path)}" data-kind="bool"${v ? ' checked' : ''}><i></i><span>${label}</span></label>${o.hint ? `<div class="hint" style="margin:-8px 0 12px 50px">${o.hint}</div>` : ''}`;
}
export function select(path, label, options, o = {}) {
  const v = String(getP(path) ?? '');
  return `<label class="f">${label ? `<span>${label}</span>` : ''}<select data-bind="${esc(path)}"${o.kind ? ` data-kind="${o.kind}"` : ''}>${options.map(([val, lab]) => `<option value="${esc(val)}"${String(val) === v ? ' selected' : ''}>${esc(lab)}</option>`).join('')}</select>${o.hint ? `<div class="hint">${o.hint}</div>` : ''}</label>`;
}
// Cartes de choix (une seule valeur).
export function choices(path, items, o = {}) {
  const v = String(getP(path) ?? '');
  return `${o.label ? `<span class="lbl">${o.label}</span>` : ''}<div class="choices" style="margin-bottom:14px">${items.map(it => `<button type="button" class="choice ${String(it.v) === v ? 'on' : ''}" data-choose="${esc(path)}" data-val="${esc(it.v)}"${o.kind ? ` data-kind="${o.kind}"` : ''}${it.style ? ` style="${it.style}"` : ''}>${it.icon ? icon(it.icon) : ''}${it.html || esc(it.label)}</button>`).join('')}</div>`;
}

// ---------------------------------------------------------------- images & médias
export async function hash8(str) {
  const b = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(str));
  return [...new Uint8Array(b)].slice(0, 4).map(x => x.toString(16).padStart(2, '0')).join('');
}
const slug = s => (s || 'img').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase().slice(0, 28) || 'img';

function readAsDataURL(file) {
  return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(file); });
}
// Fichier choisi → image redimensionnée en WebP (ou PNG) stockée en attente de publication.
export async function fileToMedia(file, o = {}) {
  const name = slug(file.name.replace(/\.[^.]+$/, ''));
  if (!file.type.startsWith('image/') || file.type === 'image/svg+xml' || file.type === 'image/gif') {
    if (file.size > 10 * 1024 * 1024) throw new Error('Fichier trop lourd (10 Mo maximum).');
    const data = await readAsDataURL(file);
    const ext = (file.name.split('.').pop() || 'bin').toLowerCase();
    const path = `media/${name}-${await hash8(data)}.${ext}`;
    S.pending[path] = data;
    return path;
  }
  const max = o.max || 1600;
  const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' });
  const sc = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const cv = document.createElement('canvas');
  cv.width = Math.round(bmp.width * sc); cv.height = Math.round(bmp.height * sc);
  cv.getContext('2d').drawImage(bmp, 0, 0, cv.width, cv.height);
  if (o.jpg) { const c2 = cv.getContext('2d'); c2.globalCompositeOperation = 'destination-over'; c2.fillStyle = '#fff'; c2.fillRect(0, 0, cv.width, cv.height); }
  const type = o.png ? 'image/png' : o.jpg ? 'image/jpeg' : 'image/webp';
  const data = cv.toDataURL(type, 0.84);
  const path = `media/${name}-${await hash8(data)}.${o.png ? 'png' : o.jpg ? 'jpg' : 'webp'}`;
  S.pending[path] = data;
  return path;
}
export function pickFiles(accept = 'image/*', multiple = false) {
  return new Promise(res => {
    const i = document.createElement('input');
    i.type = 'file'; i.accept = accept; i.multiple = multiple;
    i.onchange = () => res([...i.files]);
    i.click();
  });
}
export const src = p => (!p ? '' : S.pending[p] || p);

export function imgField(path, label, o = {}) {
  const v = getP(path);
  return `<div class="f"><span>${label}</span><div class="imgpick">
    <div class="pv ${o.round ? 'round' : ''}" style="${v ? `background-image:url('${esc(src(v))}')` : ''}"></div>
    <div><button type="button" class="b sm" data-img="${esc(path)}" data-png="${o.png ? 1 : ''}" data-jpg="${o.jpg ? 1 : ''}" data-max="${o.max || ''}">${icon('upload')} ${v ? 'Changer' : 'Ajouter'}</button>
    ${v ? `<button type="button" class="b sm danger" data-img-del="${esc(path)}">${icon('trash')}</button>` : ''}
    ${o.hint ? `<div class="hint">${o.hint}</div>` : ''}</div></div></div>`;
}

// Liste de médias d'une fiche : images, documents, vidéos.
export function mediaField(path) {
  const list = getP(path) || [];
  return `<div class="f"><span>Images, documents et vidéos</span><div class="thumbs" data-sort-media="${esc(path)}">
    ${list.map((m, i) => `<div class="thumb" style="${m.type === 'image' ? `background-image:url('${esc(src(m.src))}')` : ''}">${m.type === 'doc' ? `${icon('file-text', '', 26)}<br>${esc(m.name || 'Document')}` : m.type === 'video' ? `${icon('video', '', 26)}<br>Vidéo` : ''}<button type="button" data-media-del="${esc(path)}" data-i="${i}">${icon('x', '', 14)}</button></div>`).join('')}
    </div><div style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap">
    <button type="button" class="b sm" data-media-add="${esc(path)}" data-kind="image">${icon('photo-plus')} Images</button>
    <button type="button" class="b sm" data-media-add="${esc(path)}" data-kind="doc">${icon('file')} Document (PDF, Word)</button>
    <button type="button" class="b sm" data-media-add="${esc(path)}" data-kind="video">${icon('video')} Vidéo (lien YouTube, Vimeo ou MP4)</button></div>
    <div class="hint">10 fichiers max · 10 Mo par fichier. Les vidéos lourdes sont mieux sur YouTube (lien non répertorié).</div></div>`;
}

export function iconField(path, label = 'Icône') {
  const v = getP(path) || 'info-circle';
  return `<div class="f"><span>${label}</span><div style="display:flex;gap:10px;align-items:center"><span style="width:46px;height:46px;border-radius:12px;background:#f3f4f8;display:grid;place-items:center">${icon(v, '', 28)}</span><button type="button" class="b sm" data-icon-pick="${esc(path)}">Modifier</button></div></div>`;
}

// ---------------------------------------------------------------- texte riche
export function rte(path, label, o = { tr: true }) {
  return `<div class="f">${label ? `<span>${label}</span>` : ''}<div class="rte" data-rte="${esc(path)}"${o.tr !== false ? ' data-tr' : ''}></div>${o.tr !== false ? flagsRow(path) : ''}</div>`;
}
const EMOJIS = '😀 😊 😍 🥰 😎 🤗 👋 🙏 👍 👉 ✅ ❌ ⚠️ ⭐ ❤️ 💛 🌿 🌴 🌊 ☀️ 🏖️ ⛱️ 🏝️ 🏡 🏠 🔑 🚗 🚌 ✈️ 🚶 🅿️ 📍 🗺️ 📞 📧 💬 📶 🍽️ 🍷 🥐 🛒 🧺 🗑️ ♻️ 🧹 🛏️ 🛁 🧴 🔥 ❄️ 🕐 📅 🎉 🎁 🐶 🚭 🔇 🏊 ⛰️ 🚴'.split(' ');

function edToHtml(ed) {
  const c = ed.cloneNode(true);
  c.querySelectorAll('img[data-path]').forEach(i => { i.setAttribute('src', i.dataset.path); i.removeAttribute('data-path'); });
  return c.innerHTML.replace(/<p><br><\/p>$/, '');
}
function htmlToEd(html) {
  const t = document.createElement('template');
  t.innerHTML = html || '';
  t.content.querySelectorAll('img').forEach(i => { const p = i.getAttribute('src'); if (S.pending[p]) { i.dataset.path = p; i.src = S.pending[p]; } });
  return t.innerHTML;
}
export function mountRte(box, { onAi } = {}) {
  const path = box.dataset.rte, tr = box.hasAttribute('data-tr');
  const read = () => (tr ? (getP(path) || {})[S.lang] : getP(path)) || '';
  const write = v => {
    if (tr) { const o = getP(path) && typeof getP(path) === 'object' ? getP(path) : {}; o[S.lang] = v; setP(path, o); }
    else setP(path, v);
    changed();
  };
  box.innerHTML = `<div class="bar">
    <button type="button" data-c="bold" title="Gras"><b>B</b></button><button type="button" data-c="italic" title="Italique"><i>I</i></button><button type="button" data-c="underline" title="Souligné"><u>U</u></button>
    <button type="button" data-c="link" title="Lien">${icon('link')}</button><span class="sep"></span>
    <select data-c="block" title="Type de texte"><option value="">Style</option><option value="p">Paragraphe</option><option value="h2">Titre</option><option value="h3">Sous-titre</option></select>
    <button type="button" data-c="insertUnorderedList" title="Liste à puces">${icon('list')}</button><button type="button" data-c="insertOrderedList" title="Liste numérotée">${icon('list-numbers')}</button><span class="sep"></span>
    <button type="button" data-c="justifyLeft" title="Aligner à gauche">${icon('align-left')}</button><button type="button" data-c="justifyCenter" title="Centrer">${icon('align-center')}</button><button type="button" data-c="justifyRight" title="Aligner à droite">${icon('align-right')}</button><span class="sep"></span>
    <button type="button" data-c="image" title="Ajouter une image">${icon('photo')}</button><button type="button" data-c="video" title="Ajouter une vidéo">${icon('video')}</button>
    <button type="button" data-c="accordion" title="Insérer un accordéon">${icon('layout-list')}</button><button type="button" data-c="button" title="Insérer un bouton">${icon('toggle-left')}</button>
    <button type="button" data-c="code" title="Bloc de code">${icon('code')}</button><button type="button" data-c="emoji" title="Emoji">😀</button>
    <button type="button" data-c="html" title="Voir le code HTML">&lt;/&gt;</button>
    ${onAi ? `<button type="button" data-c="ai" title="Rédiger ou améliorer avec l'IA" style="color:var(--accent)">✨ IA</button>` : ''}
  </div><div class="ed" contenteditable="true"></div>`;
  const ed = box.querySelector('.ed');
  ed.innerHTML = htmlToEd(read());
  let t = null;
  const sync = () => { clearTimeout(t); t = setTimeout(() => write(edToHtml(ed)), 250); };
  ed.addEventListener('input', sync);
  ed.addEventListener('blur', () => { clearTimeout(t); write(edToHtml(ed)); });
  let range = null;
  const keep = () => { const s = getSelection(); if (s.rangeCount && ed.contains(s.anchorNode)) range = s.getRangeAt(0).cloneRange(); };
  ed.addEventListener('keyup', keep); ed.addEventListener('mouseup', keep);
  const restore = () => { ed.focus(); if (range) { const s = getSelection(); s.removeAllRanges(); s.addRange(range); } };
  const ins = html => { restore(); document.execCommand('insertHTML', false, html); sync(); };
  box.querySelector('select[data-c=block]').onchange = e => { restore(); document.execCommand('formatBlock', false, e.target.value); e.target.value = ''; sync(); };
  box.querySelectorAll('.bar button').forEach(b => b.addEventListener('mousedown', e => e.preventDefault()));
  box.querySelector('.bar').addEventListener('click', async e => {
    const b = e.target.closest('button[data-c]');
    if (!b) return;
    const c = b.dataset.c;
    if (['bold', 'italic', 'underline', 'insertUnorderedList', 'insertOrderedList', 'justifyLeft', 'justifyCenter', 'justifyRight'].includes(c)) { restore(); document.execCommand(c); sync(); return; }
    if (c === 'link') { const url = await askText('Lien', 'Adresse (https://…, tel:…, mailto:…)', 'https://'); if (url) { restore(); document.execCommand('createLink', false, url); sync(); } return; }
    if (c === 'image') { const [f] = await pickFiles('image/*'); if (!f) return; const p = await fileToMedia(f); ins(`<img src="${S.pending[p]}" data-path="${p}" alt="">`); return; }
    if (c === 'video') { const url = await askText('Vidéo', 'Lien YouTube ou Vimeo'); if (!url) return; const e2 = videoEmbedUrl(url); ins(e2 ? `<div class="video"><iframe data-video src="${esc(e2)}" allowfullscreen></iframe></div><p></p>` : `<p><a href="${esc(url)}">${esc(url)}</a></p>`); return; }
    if (c === 'accordion') { ins('<details><summary>Titre de l’accordéon</summary><p>Texte affiché quand on ouvre.</p></details><p></p>'); return; }
    if (c === 'button') { const lab = await askText('Bouton', 'Texte du bouton', 'En savoir plus'); if (!lab) return; const url = await askText('Bouton', 'Lien du bouton', 'https://'); if (url) ins(`<p><a class="btn-link" href="${esc(url)}">${esc(lab)}</a></p>`); return; }
    if (c === 'code') { restore(); document.execCommand('formatBlock', false, 'pre'); sync(); return; }
    if (c === 'emoji') {
      const d = dlg(`<h3>Insérer un emoji</h3><div class="emoji-pop">${EMOJIS.map(x => `<button type="button">${x}</button>`).join('')}</div>`);
      d.el.querySelector('.emoji-pop').onclick = ev => { const x = ev.target.closest('button'); if (x) { d.close(); ins(x.textContent); } };
      return;
    }
    if (c === 'html') {
      const d = dlg(`<h3>Code HTML</h3><textarea class="inp" style="min-height:300px;font:12px Consolas,monospace">${esc(edToHtml(ed))}</textarea><div class="acts"><button class="b" data-x>Annuler</button><button class="b violet" data-ok>Appliquer</button></div>`, { wide: true });
      d.el.querySelector('[data-x]').onclick = d.close;
      d.el.querySelector('[data-ok]').onclick = () => { ed.innerHTML = htmlToEd(d.el.querySelector('textarea').value); write(edToHtml(ed)); d.close(); };
      return;
    }
    if (c === 'ai' && onAi) {
      const instr = await askText('✨ Rédiger avec l’IA', 'Que voulez-vous ? (ex. « rédige un texte chaleureux sur l’arrivée à 16 h », « corrige et rends plus clair »)', '');
      if (!instr) return;
      b.disabled = true; b.textContent = '…';
      try { const html = await onAi(instr, edToHtml(ed)); if (html) { ed.innerHTML = htmlToEd(html); write(edToHtml(ed)); } }
      catch (err) { toast('IA : ' + err.message, true); }
      finally { b.disabled = false; b.textContent = '✨ IA'; }
    }
  });
}
export function videoEmbedUrl(url) {
  const y = /(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([\w-]{6,})/.exec(url);
  if (y) return `https://www.youtube-nocookie.com/embed/${y[1]}`;
  const v = /vimeo\.com\/(\d+)/.exec(url);
  if (v) return `https://player.vimeo.com/video/${v[1]}`;
  return '';
}

// ---------------------------------------------------------------- fenêtres (jamais confirm()/prompt() natifs)
export function dlg(html, o = {}) {
  const veil = document.createElement('div');
  veil.className = 'dlg-veil';
  veil.innerHTML = `<div class="dlg ${o.wide ? 'wide' : ''}" role="dialog" aria-modal="true">${html}</div>`;
  document.body.appendChild(veil);
  const close = () => { veil.remove(); o.onClose && o.onClose(); };
  veil.addEventListener('mousedown', e => { if (e.target === veil && !o.sticky) close(); });
  return { el: veil.querySelector('.dlg'), close };
}
export function ask(msg, okLabel = 'Confirmer', danger = false) {
  return new Promise(res => {
    const d = dlg(`<p style="font-size:14.5px;line-height:1.5">${msg}</p><div class="acts"><button class="b" data-x>Annuler</button><button class="b ${danger ? 'red' : 'violet'}" data-ok>${okLabel}</button></div>`, { onClose: () => res(false) });
    d.el.querySelector('[data-x]').onclick = () => d.close();
    d.el.querySelector('[data-ok]').onclick = () => { res(true); d.close(); };
  });
}
export function askText(title, label, value = '', o = {}) {
  return new Promise(res => {
    let done = false;
    const d = dlg(`<h3>${title}</h3><label class="f"><span>${label}</span>${o.area ? `<textarea class="inp" rows="5">${esc(value)}</textarea>` : `<input class="inp" type="${o.type || 'text'}" value="${esc(value)}">`}</label><div class="acts"><button class="b" data-x>Annuler</button><button class="b violet" data-ok>OK</button></div>`, { onClose: () => { if (!done) res(null); } });
    const i = d.el.querySelector('input,textarea');
    setTimeout(() => { i.focus(); i.select && i.select(); }, 30);
    const ok = () => { done = true; res(i.value.trim()); d.close(); };
    d.el.querySelector('[data-ok]').onclick = ok;
    d.el.querySelector('[data-x]').onclick = () => d.close();
    if (!o.area) i.onkeydown = e => { if (e.key === 'Enter') ok(); };
  });
}
export function toast(msg, err = false, ms = 2600) {
  document.querySelectorAll('.toast').forEach(t => t.remove());
  const t = document.createElement('div');
  t.className = 'toast' + (err ? ' err' : '');
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), ms);
}
export function pickIcon(current) {
  return new Promise(res => {
    const names = Object.keys(ICONS).filter(n => !n.startsWith('brand-') || n === 'brand-whatsapp');
    const d = dlg(`<h3>Choisir une icône</h3><input class="inp" placeholder="Rechercher (en anglais : wifi, car, key, beach…)" style="margin-bottom:10px">
      <div class="iconpick">${names.map(n => `<button type="button" data-n="${n}" title="${n}" class="${n === current ? 'on' : ''}">${icon(n)}</button>`).join('')}</div>`, { wide: true, onClose: () => res(null) });
    const q = d.el.querySelector('input');
    q.oninput = () => d.el.querySelectorAll('.iconpick button').forEach(b => { b.style.display = b.dataset.n.includes(q.value.toLowerCase()) ? '' : 'none'; });
    d.el.querySelector('.iconpick').onclick = e => { const b = e.target.closest('button'); if (b) { const n = b.dataset.n; d.close(); res(n); } };
  });
}
export async function copyText(t) {
  try { await navigator.clipboard.writeText(t); }
  catch (e) { const ta = document.createElement('textarea'); ta.value = t; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove(); }
  toast('Copié dans le presse-papiers');
}
