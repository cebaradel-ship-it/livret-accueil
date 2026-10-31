// Éditeur du livret d'accueil — orchestration (rendu, événements, aperçu, publication).
import { S, loadCfg, saveCfg, getP, setP, changed, onChange, clone, idbGet, idbSet, idbDel, bookLangs } from './state.js';
import { mountRte, dlg, ask, askText, toast, pickIcon, pickFiles, fileToMedia, copyText, icon, esc, src, videoEmbedUrl, hash8 } from './ui.js';
import { persoView } from './step-perso.js';
import { modulesView, MODULE_TYPES, newModule, moduleCustomDialogHtml, placeDialogHtml, nbCatDialogHtml } from './step-modules.js';
import { shareView, makeQr, siteUrl, qrUrl, POSTERS, drawPoster, shareMessage } from './step-share.js';
import { settingsView, statsView, reviewsView } from './step-settings.js';
import { CATEGORY_PRESETS } from './presets-categories.js';
import { PALETTES, applyPalette, paletteFromImage } from './presets-theme.js';
import { publishFiles, testGithub, textToB64 } from './github.js';
import { LANGS, tx, uid, flag, wifiPayload, distanceKm } from '../core.js';

const $root = document.getElementById('admin');
const STEPS = [['perso', '1', 'Personnalisation'], ['modules', '2', 'Vos modules'], ['share', '3', 'Partage'], ['settings', '⚙', 'Paramétrage'], ['stats', '📊', 'Statistiques'], ['reviews', '★', 'Avis livre d’or']];
let pv = null, pvReady = false, lastNav = '';
let statsData = null, statsErr = '', reviewsData = null, reviewsErr = '';
let curDlg = null; // fenêtre ouverte qui sait se redessiner { el, close, refresh }

// ---------------------------------------------------------------- démarrage
async function boot() {
  loadCfg();
  try {
    const r = await fetch('data/booklet.json', { cache: 'no-cache' });
    S.PUB = await r.json();
  } catch (e) {
    $root.innerHTML = '<p style="padding:40px">Impossible de lire data/booklet.json. Ouvrez l’éditeur depuis le site (ou via un petit serveur local), pas en double-cliquant sur le fichier.</p>';
    return;
  }
  const draft = await idbGet('draft').catch(() => null);
  if (draft && draft.data && JSON.stringify(draft.data) !== JSON.stringify(S.PUB)) {
    S.D = draft.data; S.pending = draft.pending || {}; S.dirty = true;
  } else { S.D = clone(S.PUB); }
  normalize();
  S.lang = S.D.languages.primary;
  await loadLeaflet().catch(() => {});
  frame();
  renderMain();
  onChange(() => { schedulePreview(); updateTop(); });
}

// Complète les champs manquants (anciens fichiers, imports).
function normalize() {
  const D = S.D;
  D.backend = D.backend || { url: '' };
  D.share = D.share || {}; D.share.qr = D.share.qr || { color: '#2a384a', bg: '#ffffff', transparent: true, style: 'classic' };
  D.share.meta = D.share.meta || { title: 'Livret d’accueil', description: '', image: '', icon: '' };
  D.share.message = D.share.message || {};
  D.access = D.access || { enabled: false, codes: [] };
  D.assistant = D.assistant || { enabled: false, name: '', tone: 'chaleureux', greeting: {}, suggestions: {}, knowledge: '' };
  D.emergency = D.emergency || { enabled: true, numbers: [] };
  D.contact = D.contact || {};
  D.theme.map = D.theme.map || { markerColor: D.theme.primary, homeColor: '#c0392b', tiles: 'osm' };
  D.property.season = D.property.season || { start: '', end: '' };
}

function loadLeaflet() {
  if (window.L) return Promise.resolve();
  return new Promise((res, rej) => {
    const c = document.createElement('link'); c.rel = 'stylesheet'; c.href = 'assets/vendor/leaflet.css'; document.head.appendChild(c);
    const s = document.createElement('script'); s.src = 'assets/vendor/leaflet.js'; s.onload = res; s.onerror = rej; document.head.appendChild(s);
  });
}

// ---------------------------------------------------------------- cadre
// Formats d'aperçu : le livret s'affiche à la vraie largeur de l'appareil, réduit pour tenir à l'écran.
const DEVICES = {
  mobile: { label: 'Mobile', icon: 'device-mobile', w: 390, h: 844 },
  tablet: { label: 'Tablette', icon: 'device-tablet', w: 820, h: 1180 },
  laptop: { label: 'PC portable', icon: 'device-laptop', w: 1366, h: 768 },
  desktop: { label: 'PC Full HD', icon: 'device-desktop', w: 1920, h: 1080 },
};
let pvDevice = 'mobile';

function frame() {
  $root.innerHTML = `<header class="top" id="top">
      <div class="brand"><img id="brand-logo" alt=""><span id="brand-title"></span></div>
      <nav class="steps">${STEPS.map(([k, n, l]) => `<button data-step="${k}"><span class="n">${n}</span>${l}</button>`).join('')}</nav>
      <div class="topbtns"><a class="b ghost" id="open-site" target="_blank" rel="noopener" title="Ouvrir mon livret">${icon('external-link')}<span class="lbl-t"> Ouvrir mon livret</span></a>
        <button class="b red" data-act="publish" id="pub-btn">${icon('cloud-upload')} Publier</button></div></header>
    <div class="wrap"><main class="main" id="main"></main>
      <aside class="side" id="side" aria-label="Aperçu du livret">
        <div class="pv-bar"><div class="devs">${Object.entries(DEVICES).map(([k, d]) => `<button data-device="${k}" title="Aperçu ${d.label} (${d.w}×${d.h})">${icon(d.icon)}<span>${d.label}</span></button>`).join('')}</div>
          <button class="b sm pv-close" data-act="pv-close">${icon('x')} Fermer l’aperçu</button></div>
        <div class="pv-stage" id="pv-stage"><div class="pv-device mobile" id="pv-device"><iframe id="pv" title="Aperçu du livret" src="index.html?preview=1"></iframe></div></div>
        <div class="row"><button class="b sm" data-pv="#/">${icon('home')} Accueil</button><button class="b sm" data-act="test-popup">${icon('message-heart')} Pop-up</button>
          <span class="muted" style="align-self:center">Aperçu en ${flag(S.lang, 14)} <span id="pv-lang">${S.lang.toUpperCase()}</span></span></div></aside></div>
    <button class="pv-fab" data-act="pv-open">${icon('eye')} Aperçu</button>`;
  pv = document.getElementById('pv');
  window.addEventListener('message', e => { if (e.source === pv.contentWindow && e.data?.type === 'ready') { pvReady = true; postPreview(); lastNav = ''; previewNav(); } });
  // hauteur réelle de l'en-tête (elle varie selon l'écran) pour les éléments collants
  const top = document.getElementById('top');
  new ResizeObserver(() => { document.documentElement.style.setProperty('--top-h', top.offsetHeight + 'px'); fitPreview(); }).observe(top);
  new ResizeObserver(fitPreview).observe(document.getElementById('pv-stage'));
  window.addEventListener('resize', fitPreview);
  setDevice('mobile');
  updateTop();
}
function setDevice(k) {
  pvDevice = k;
  const dev = document.getElementById('pv-device');
  dev.className = 'pv-device ' + k;
  document.querySelectorAll('[data-device]').forEach(b => b.classList.toggle('on', b.dataset.device === k));
  // tablette et PC : aperçu plein écran pour rester lisible
  if (k !== 'mobile') document.body.classList.add('pv-full');
  fitPreview();
}
function fitPreview() {
  const stage = document.getElementById('pv-stage'), dev = document.getElementById('pv-device');
  if (!stage || !dev) return;
  const d = DEVICES[pvDevice];
  const bezel = pvDevice === 'mobile' ? 20 : pvDevice === 'tablet' ? 28 : 28;
  const W = d.w + bezel, H = d.h + bezel;
  const sw = stage.clientWidth, sh = stage.clientHeight;
  if (!sw || !sh) return;
  const sc = Math.min(sw / W, sh / H, 1);
  dev.style.width = d.w + 'px'; dev.style.height = d.h + 'px';
  dev.style.transform = `translate(-50%, -50%) scale(${sc})`;
}
function updateTop() {
  const t = document.getElementById('brand-title'); if (!t) return;
  t.textContent = tx(S.D.property.title, S.D.languages.primary) || 'Mon livret';
  const l = document.getElementById('brand-logo'); l.src = src(S.D.branding.logo) || 'assets/img/flags/fr.svg';
  document.querySelectorAll('[data-step]').forEach(b => b.classList.toggle('on', b.dataset.step === S.step));
  const p = document.getElementById('pub-btn');
  p.innerHTML = `${icon('cloud-upload')} Publier${S.dirty ? ' <span class="dirty" title="Modifications non publiées"></span>' : ''}`;
  document.getElementById('open-site').href = siteUrl();
}

function renderMain() {
  const main = document.getElementById('main');
  const scroll = window.scrollY;
  let html = S.dirty ? `<div class="banner"><span>✏️</span><span class="grow">Vous avez des modifications <b>non publiées</b>. Elles sont enregistrées dans ce navigateur ; cliquez sur <b>Publier</b> pour les mettre en ligne.</span><button class="b sm red" data-act="publish">Publier</button></div>` : '';
  if (S.step === 'perso') html += persoView();
  else if (S.step === 'modules') html += modulesView();
  else if (S.step === 'share') html += shareView();
  else if (S.step === 'settings') html += settingsView();
  else if (S.step === 'stats') html += statsView(statsData, statsErr);
  else if (S.step === 'reviews') html += reviewsView(reviewsData, reviewsErr);
  if (S.D.languages.secondary.length && ['perso', 'modules', 'settings', 'share'].includes(S.step)) {
    html = `<div class="banner info" style="position:sticky;top:var(--top-h,64px);z-index:5"><span class="grow">Langue de saisie :</span>${bookLangs().map(l => `<button class="b sm ${l === S.lang ? 'violet' : ''}" data-edit-lang="${l}">${flag(l, 16)} ${l.toUpperCase()}</button>`).join('')}</div>` + html;
  }
  main.innerHTML = html;
  mount(main);
  updateTop();
  previewNav();
  window.scrollTo(0, scroll);
}

// ---------------------------------------------------------------- aperçu
let pvT = null;
function schedulePreview() { clearTimeout(pvT); pvT = setTimeout(postPreview, 120); }
function postPreview() { if (pvReady) pv.contentWindow.postMessage({ type: 'data', data: S.D, pending: S.pending }, '*'); }
function previewNav(force) {
  if (!pvReady) return;
  let h = '#/';
  if (S.step === 'modules' && S.edit?.mod) {
    const m = S.D.modules.find(x => x.id === S.edit.mod);
    if (m) h = `#/m/${m.id}` + (S.edit.cat ? `/c/${S.edit.cat}` : '');
  }
  if (h !== lastNav || force) { lastNav = h; pv.contentWindow.postMessage({ type: 'nav', hash: h }, '*'); }
}

// ---------------------------------------------------------------- montage des composants
function mount(scope) {
  const be = !!(S.D.backend?.url && S.cfg.backend?.adminKey);
  scope.querySelectorAll('[data-rte]').forEach(el => mountRte(el, { onAi: be ? aiWrite : null }));
  scope.querySelectorAll('[data-sortable]').forEach(el => {
    if (!window.Sortable) return;
    window.Sortable.create(el, {
      handle: el.querySelector('.grip') ? '.grip' : undefined, draggable: '[data-sort-item]', animation: 150, delay: 180, delayOnTouchOnly: true,
      onEnd: ev => {
        if (ev.oldIndex === ev.newIndex) return;
        const path = el.dataset.sortable;
        let arr = getP(path);
        if (path === 'contact.order' && (!arr || !arr.length)) arr = ['whatsapp', 'phone', 'email', 'url', 'instagram', 'facebook', 'twitter', 'linkedin'];
        const [it] = arr.splice(ev.oldIndex, 1); arr.splice(ev.newIndex, 0, it); setP(path, arr);
        changed(); rerender();
      },
    });
  });
  scope.querySelectorAll('[data-sort-media]').forEach(el => {
    if (!window.Sortable) return;
    window.Sortable.create(el, { animation: 150, delay: 180, delayOnTouchOnly: true, onEnd: ev => { const arr = getP(el.dataset.sortMedia); const [it] = arr.splice(ev.oldIndex, 1); arr.splice(ev.newIndex, 0, it); changed(); rerender(); } });
  });
  scope.querySelectorAll('[data-qrprev]').forEach(el => { el.innerHTML = ''; makeQr(qrUrl(), 360).append(el); });
  scope.querySelectorAll('canvas[data-poster-thumb]').forEach(cv => drawPoster(cv, +cv.dataset.posterThumb, posterOpts(+cv.dataset.posterThumb)).catch(() => {}));
  scope.querySelectorAll('[data-pickmap]').forEach(el => pickMap(el));
}
function rerender() { if (curDlg && document.body.contains(curDlg.el)) curDlg.refresh && curDlg.refresh(); renderMain(); }

// Petite carte avec repère déplaçable, liée à <chemin>.lat / <chemin>.lng.
function pickMap(el) {
  if (!window.L) { el.innerHTML = '<p class="muted" style="padding:10px">Carte indisponible.</p>'; return; }
  const path = el.dataset.pickmap;
  const lat = getP(path + '.lat'), lng = getP(path + '.lng');
  const h = S.D.property.address;
  const start = lat != null && lng != null ? [lat, lng] : h.lat != null ? [h.lat, h.lng] : [46.6, 2.4];
  const map = window.L.map(el).setView(start, lat != null ? 15 : 9);
  window.L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap' }).addTo(map);
  const mk = window.L.marker(start, { draggable: true }).addTo(map);
  const set = ll => { setP(path + '.lat', +ll.lat.toFixed(6)); setP(path + '.lng', +ll.lng.toFixed(6)); changed(); const box = el.closest('.dlg,.card'); box?.querySelectorAll(`[data-bind="${path}.lat"]`).forEach(i => (i.value = ll.lat.toFixed(6))); box?.querySelectorAll(`[data-bind="${path}.lng"]`).forEach(i => (i.value = ll.lng.toFixed(6))); };
  mk.on('dragend', () => set(mk.getLatLng()));
  map.on('click', e => { mk.setLatLng(e.latlng); set(e.latlng); });
  setTimeout(() => map.invalidateSize(), 150);
}

// ---------------------------------------------------------------- saisie
function readVal(el) {
  const k = el.dataset.kind;
  if (k === 'bool') return el.checked;
  if (k === 'num') return el.value === '' ? null : Number(el.value);
  if (k === 'lines') return el.value.split('\n').map(s => s.trim()).filter(Boolean);
  return el.value;
}
function applyBind(el) {
  const path = el.dataset.bind;
  const v = readVal(el);
  if (el.hasAttribute('data-tr')) {
    const o = getP(path) && typeof getP(path) === 'object' ? getP(path) : {};
    if (v) o[S.lang] = v; else delete o[S.lang];
    setP(path, o);
  } else setP(path, v);
  if (el.dataset.kind === 'color') document.querySelectorAll(`[data-bind="${CSS.escape(path)}"][data-kind=color]`).forEach(o => { if (o !== el) o.value = o.type === 'color' ? (/^#[\da-f]{6}$/i.test(v) ? v : o.value) : v; });
  changed();
}
document.addEventListener('input', e => {
  const el = e.target;
  if (el.matches('[data-bind]') && el.type !== 'checkbox' && el.tagName !== 'SELECT') applyBind(el);
  if (el.matches('[data-cfg]')) { setP(el.dataset.cfg, el.value.trim(), S.cfg); saveCfg(); updateTop(); }
});
document.addEventListener('change', e => {
  const el = e.target;
  if (el.matches('[data-bind]') && (el.type === 'checkbox' || el.tagName === 'SELECT')) {
    applyBind(el);
    if (el.dataset.bind === 'languages.primary') { const L = S.D.languages; L.secondary = L.secondary.filter(l => l !== L.primary); S.lang = L.primary; }
    rerender();
  }
  if (el.matches('[data-cfg]')) renderMain();
});

// ---------------------------------------------------------------- clics
document.addEventListener('click', async e => {
  const t = e.target.closest('[data-step],[data-tab],[data-choose],[data-edit-lang],[data-trans],[data-open-mod],[data-open-cat],[data-act],[data-img],[data-img-del],[data-media-add],[data-media-del],[data-icon-pick],[data-del],[data-add-item],[data-add-rec],[data-place],[data-place-del],[data-nbcat-edit],[data-nbcat-del],[data-geo],[data-palette],[data-bgimg],[data-copy],[data-share-lang],[data-poster],[data-sec-lang],[data-review],[data-goto],[data-close-dlg],[data-pv],[data-device]');
  if (!t) return;
  const d = t.dataset;
  if (t.tagName === 'A' && (d.goto || d.act)) e.preventDefault();
  try {
    if (d.step) return goStep(d.step);
    if (d.tab) { const [k, v] = d.tab.split(':'); S.tab[k] = v; return renderMain(); }
    if (d.goto) { const [st, tb] = d.goto.split(':'); if (tb) S.tab[st] = tb; curDlg?.close(); return goStep(st); }
    if (d.device) return setDevice(d.device);
    if (d.pv) { lastNav = ''; pv.contentWindow.postMessage({ type: 'nav', hash: d.pv }, '*'); return; }
    if (d.choose) { const v = d.kind === 'num' ? Number(d.val) : d.val; setP(d.choose, v); changed(); return rerender(); }
    if (d.editLang) { S.lang = d.editLang; if (pvReady) pv.contentWindow.postMessage({ type: 'lang', lang: S.lang }, '*'); const pl = document.getElementById('pv-lang'); if (pl) pl.textContent = S.lang.toUpperCase(); return rerender(); }
    if (d.trans) return translatePaths([d.trans], true);
    if (d.openMod) { S.edit = { mod: d.openMod }; return renderMain(); }
    if (d.openCat) { S.edit.cat = d.openCat; S.edit.rec = null; return renderMain(); }
    if (d.closeDlg != null) { curDlg?.close(); curDlg = null; return renderMain(); }
    if (d.img) { const [f] = await pickFiles('image/*'); if (!f) return; setP(d.img, await fileToMedia(f, { png: !!d.png, jpg: !!d.jpg, max: +d.max || 1600 })); changed(); return rerender(); }
    if (d.imgDel) { setP(d.imgDel, ''); changed(); return rerender(); }
    if (d.mediaAdd) return addMedia(d.mediaAdd, d.kind);
    if (d.mediaDel) { getP(d.mediaDel).splice(+d.i, 1); changed(); return rerender(); }
    if (d.iconPick) { const n = await pickIcon(getP(d.iconPick)); if (n) { setP(d.iconPick, n); changed(); rerender(); } return; }
    if (d.del) { if (!(await ask('Supprimer cet élément ?', 'Supprimer', true))) return; getP(d.del).splice(+d.i, 1); changed(); return rerender(); }
    if (d.addItem) {
      const item = JSON.parse(d.blank || '{}'); if ('id' in item || d.addItem.endsWith('.items') || d.addItem.endsWith('.subs')) item.id = item.id || uid('i');
      const arr = getP(d.addItem) || []; arr.push(item); setP(d.addItem, arr);
      if (S.edit) S.edit.item = arr.length - 1;
      changed(); return rerender();
    }
    if (d.addRec) { const arr = getP(d.addRec) || []; const r = { id: uid('r'), title: {}, html: {}, media: [], active: true }; arr.push(r); setP(d.addRec, arr); S.edit.rec = r.id; changed(); return renderMain(); }
    if (d.place) return openPlace(+d.place);
    if (d.placeDel) return delPlace(+d.placeDel);
    if (d.nbcatEdit) { e.preventDefault(); e.stopPropagation(); return openNbCat(+d.nbcatEdit); }
    if (d.nbcatDel) return delNbCat(+d.nbcatDel);
    if (d.geo) return geocode(d.geo, d.geoFull != null);
    if (d.palette) return choosePalette(d.palette);
    if (d.bgimg) { S.D.theme.background = { ...S.D.theme.background, type: 'image', image: d.bgimg }; changed(); return renderMain(); }
    if (d.copy != null) return copyText(d.copy);
    if (d.shareLang) { S.tab.shareLang = d.shareLang; return renderMain(); }
    if (d.poster) return openPoster(+d.poster);
    if (d.secLang) return toggleSecLang(d.secLang);
    if (d.review) return moderate(d.review, d.status);
    if (d.act) return action(d.act, t);
  } catch (err) { console.error(err); toast(err.message || String(err), true, 5000); }
});

function goStep(step) {
  S.step = step; S.edit = step === 'modules' ? S.edit : null;
  if (step === 'stats') loadStats();
  if (step === 'reviews') loadReviews();
  window.scrollTo(0, 0);
  renderMain();
}

async function action(a, t) {
  const D = S.D;
  switch (a) {
    case 'publish': return publishFlow();
    case 'pv-open': document.body.classList.add('pv-full'); return requestAnimationFrame(fitPreview);
    case 'pv-close': document.body.classList.remove('pv-full'); if (innerWidth >= 1100) setDevice('mobile'); return requestAnimationFrame(fitPreview);
    case 'test-popup': lastNav = '#/'; pv.contentWindow.postMessage({ type: 'nav', hash: '#/' }, '*'); setTimeout(() => pv.contentWindow.postMessage({ type: 'popup' }, '*'), 150); return;
    case 'bg-upload': { const [f] = await pickFiles('image/*'); if (!f) return; D.theme.background = { ...D.theme.background, type: 'image', image: await fileToMedia(f, { max: 2000 }) }; changed(); return renderMain(); }
    case 'bg-color': D.theme.background.type = 'color'; changed(); return renderMain();
    case 'bg-analyse': { const p = await paletteFromImage(src(D.theme.background.image)); if (await ask(`Appliquer la palette tirée de l’image ? <span style="display:inline-flex;gap:4px;vertical-align:middle">${[p.light, p.primary, p.title, p.text].map(c => `<i style="width:22px;height:22px;border-radius:6px;background:${c};display:inline-block"></i>`).join('')}</span>`, 'Appliquer')) { applyPalette(D.theme, p); changed(); renderMain(); } return; }
    case 'mod-add': return addModuleDialog();
    case 'mod-order': return orderDialog('modules', 'Ordre des modules', m => `${icon(m.icon)} ${esc(tx(m.title, 'fr'))}${m.active ? '' : ' <span class="tag">désactivé</span>'}`);
    case 'back-mods': S.edit = null; return renderMain();
    case 'back-mod': S.edit.cat = null; return renderMain();
    case 'mod-custom': return openDlg(() => moduleCustomDialogHtml());
    case 'mod-toggle': { const m = D.modules.find(x => x.id === S.edit.mod); m.active = !m.active; changed(); return renderMain(); }
    case 'mod-delete': { const i = D.modules.findIndex(x => x.id === S.edit.mod); if (!(await ask(`Supprimer définitivement le module « ${esc(tx(D.modules[i].title, 'fr'))} » et tout son contenu ?`, 'Supprimer', true))) return; D.modules.splice(i, 1); S.edit = null; changed(); return renderMain(); }
    case 'cat-add': return addCategoryDialog();
    case 'cat-order': { const mi = D.modules.findIndex(x => x.id === S.edit.mod); return orderDialog(`modules.${mi}.categories`, 'Ordre des catégories', c => `${icon(c.icon)} ${esc(tx(c.title, 'fr'))}`); }
    case 'cat-delete': { const m = D.modules.find(x => x.id === S.edit.mod); const i = m.categories.findIndex(c => c.id === S.edit.cat); if (!(await ask('Supprimer cette catégorie et toutes ses informations ?', 'Supprimer', true))) return; m.categories.splice(i, 1); S.edit.cat = null; changed(); return renderMain(); }
    case 'place-add': return addPlace(t.dataset.cat);
    case 'place-suggest': return suggestPlaces();
    case 'nbcat-add': { const mi = D.modules.findIndex(x => x.id === S.edit.mod); D.modules[mi].categories.push({ id: uid('k'), icon: 'map-pin', title: { [D.languages.primary]: 'Nouvelle catégorie' }, subs: [] }); changed(); return openNbCat(D.modules[mi].categories.length - 1); }
    case 'nbcat-order': { const mi = D.modules.findIndex(x => x.id === S.edit.mod); return orderDialog(`modules.${mi}.categories`, 'Ordre des catégories', c => `${icon(c.icon)} ${esc(tx(c.title, 'fr'))}`); }
    case 'translate-all': return translateAll(document.getElementById('force-tr')?.checked);
    case 'emerg-fr': D.emergency.numbers = [
      { label: { fr: 'SAMU', en: 'Medical emergency (SAMU)', es: 'Urgencias médicas (SAMU)', de: 'Rettungsdienst (SAMU)', it: 'Emergenza medica (SAMU)' }, number: '15' },
      { label: { fr: 'Police', en: 'Police', es: 'Policía', de: 'Polizei', it: 'Polizia' }, number: '17' },
      { label: { fr: 'Pompiers', en: 'Fire brigade', es: 'Bomberos', de: 'Feuerwehr', it: 'Vigili del fuoco' }, number: '18' },
      { label: { fr: 'Urgences européennes', en: 'European emergency', es: 'Emergencias europeas', de: 'Europäischer Notruf', it: 'Emergenze europee' }, number: '112' },
      { label: { fr: 'Urgences sourds et malentendants', en: 'Emergency for deaf people', es: 'Urgencias para personas sordas', de: 'Notruf für Gehörlose', it: 'Emergenza per persone sorde' }, number: '114' }];
      changed(); return renderMain();
    case 'code-add': { const c = await askText('Code d’accès', 'Nouveau code (lettres ou chiffres, insensible aux majuscules)'); if (!c) return; D.access.codes = [...(D.access.codes || []), await sha256(c)]; changed(); toast('Code ajouté. Notez-le : il ne sera plus affiché.'); return renderMain(); }
    case 'code-clear': if (await ask('Supprimer tous les codes d’accès ?', 'Supprimer', true)) { D.access.codes = []; changed(); renderMain(); } return;
    case 'gh-test': { const out = document.getElementById('gh-res'); out.textContent = 'Test…'; try { const r = await testGithub(); out.innerHTML = `<b style="color:var(--ok)">✔ Connexion OK</b> — dépôt « ${esc(r.full_name)} »${r.private && location.hostname.endsWith('github.io') ? ' (privé : GitHub Pages gratuit exige un dépôt public)' : ''}.`; } catch (err) { out.innerHTML = `<b style="color:#b91c1c">✖ ${esc(err.message)}</b>`; } return; }
    case 'be-test': return testBackend();
    case 'qr-png': case 'qr-svg': return makeQr(qrUrl(), 1400, S.D.share.qr, a === 'qr-svg' ? 'svg' : 'canvas').download({ name: 'qr-code-livret', extension: a === 'qr-png' ? 'png' : 'svg' });
    case 'export': { const blob = new Blob([JSON.stringify(D, null, 1)], { type: 'application/json' }); const u = URL.createObjectURL(blob); const l = document.createElement('a'); l.href = u; l.download = 'livret-sauvegarde.json'; l.click(); setTimeout(() => URL.revokeObjectURL(u), 2000); return; }
    case 'import': { const [f] = await pickFiles('.json,application/json'); if (!f) return; const data = JSON.parse(await f.text()); if (!data.modules || !data.theme) throw new Error('Ce fichier n’est pas un livret.'); if (!(await ask('Remplacer le livret en cours par ce fichier ?', 'Remplacer', true))) return; S.D = data; normalize(); changed(); return renderMain(); }
    case 'discard': if (await ask('Revenir à la dernière version publiée ? Les modifications non publiées seront perdues.', 'Annuler les modifications', true)) { S.D = clone(S.PUB); normalize(); S.pending = {}; S.dirty = false; await idbDel('draft'); postPreview(); renderMain(); } return;
  }
}

async function sha256(s) {
  const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s.trim().toLowerCase()));
  return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('');
}

// ---------------------------------------------------------------- fenêtres
function openDlg(htmlFn, o = {}) {
  const d = dlg(htmlFn(), { wide: o.wide, onClose: () => { if (curDlg === d) curDlg = null; renderMain(); } });
  d.refresh = () => { const sc = d.el.scrollTop; d.el.innerHTML = htmlFn(); mount(d.el); d.el.scrollTop = sc; };
  curDlg = d;
  mount(d.el);
  return d;
}

function addModuleDialog() {
  const has = t => S.D.modules.some(m => m.type === t);
  const d = dlg(`<h3>Ajouter un module</h3><div class="mods">${MODULE_TYPES.map(m => `<button class="mod" data-new="${m.type}" ${m.single && has(m.type) ? 'disabled style="opacity:.4"' : ''} title="${esc(m.desc)}">${icon(m.icon)}${esc(m.title.fr)}</button>`).join('')}</div>
    <p class="muted">Les modules uniques (Mot d’accueil, Autour de moi, Livre d’or) ne peuvent exister qu’une fois.</p>`);
  d.el.onclick = e => { const b = e.target.closest('[data-new]'); if (!b || b.disabled) return; const m = newModule(b.dataset.new); S.D.modules.push(m); S.edit = { mod: m.id }; changed(); d.close(); renderMain(); };
}

function orderDialog(path, title, label) {
  const draw = () => `<h3>${title}</h3><p class="muted">Glissez-déposez pour changer l’ordre.</p><div class="list" data-sortable="${path}">${getP(path).map(x => `<div class="item" data-sort-item><span class="grip">${icon('grip-vertical')}</span><span class="t">${label(x)}</span></div>`).join('')}</div><div class="acts"><button class="b violet" data-close-dlg>Terminé</button></div>`;
  openDlg(draw);
}

function addCategoryDialog() {
  const m = S.D.modules.find(x => x.id === S.edit.mod);
  const kind = { checkin: 'checkin', checkout: 'checkout', useful: 'useful' }[m.id];
  const presets = (kind ? CATEGORY_PRESETS[kind] : [...CATEGORY_PRESETS.checkin, ...CATEGORY_PRESETS.useful]).filter(p => !m.categories.some(c => c.id === p.key));
  const d = dlg(`<h3>Ajouter une catégorie</h3><div class="cats-grid">
    <button class="catb custom" data-preset="">${icon('plus')}<span><b>Catégorie personnalisée</b><small>Titre et icône libres</small></span></button>
    ${presets.map(p => `<button class="catb" data-preset="${p.key}">${icon(p.icon)}<span><b>${esc(p.title.fr)}</b></span></button>`).join('')}</div>`, { wide: true });
  d.el.onclick = e => {
    const b = e.target.closest('[data-preset]'); if (!b) return;
    const p = presets.find(x => x.key === b.dataset.preset);
    const L = bookLangs();
    const c = p ? { id: p.key, icon: p.icon, title: Object.fromEntries(Object.entries(p.title).filter(([l]) => L.includes(l))) } : { id: uid('c'), icon: 'info-circle', title: { [S.D.languages.primary]: 'Nouvelle catégorie' } };
    m.categories.push({ ...c, image: '', description: {}, redirect: '', active: true, records: [] });
    S.edit.cat = c.id; changed(); d.close(); renderMain();
  };
}

async function addMedia(path, kind) {
  const arr = getP(path) || [];
  if (kind === 'video') {
    const url = await askText('Vidéo', 'Lien YouTube, Vimeo, ou adresse d’un fichier MP4');
    if (!url) return;
    arr.push({ type: 'video', src: url });
  } else {
    const files = await pickFiles(kind === 'doc' ? '.pdf,.doc,.docx,application/pdf' : 'image/*', true);
    if (arr.length + files.length > 10) toast('10 fichiers maximum par fiche.', true);
    for (const f of files.slice(0, Math.max(0, 10 - arr.length))) {
      const p = await fileToMedia(f, { max: 1600 });
      arr.push(kind === 'doc' ? { type: 'doc', src: p, name: f.name } : { type: 'image', src: p });
    }
  }
  setP(path, arr); changed(); rerender();
}

// --- Autour de moi
const nbIndex = () => S.D.modules.findIndex(x => x.id === S.edit.mod);
function addPlace(cat) {
  const mi = nbIndex(), m = S.D.modules[mi], h = S.D.property.address;
  m.places.push({ id: uid('p'), name: '', category: cat || m.categories[0]?.id || '', sub: '', favorite: false, lat: h.lat, lng: h.lng, address: '', phone: '', website: '', rating: null, ratingCount: 0, type: {}, summary: {}, remarks: {}, photo: '', mapsUrl: '', active: true });
  changed();
  openPlace(m.places.length - 1);
}
function openPlace(pi) { const mi = nbIndex(); S.edit.nbcat = S.D.modules[mi].places[pi]?.category; openDlg(() => placeDialogHtml(mi, pi), { wide: true }); }
async function delPlace(pi) {
  if (!(await ask('Supprimer cette adresse ?', 'Supprimer', true))) return;
  S.D.modules[nbIndex()].places.splice(pi, 1); changed(); curDlg?.close();
}
function openNbCat(ci) { const mi = nbIndex(); openDlg(() => nbCatDialogHtml(mi, ci)); }
async function delNbCat(ci) {
  const m = S.D.modules[nbIndex()], c = m.categories[ci];
  const n = m.places.filter(p => p.category === c.id).length;
  if (!(await ask(`Supprimer la catégorie « ${esc(tx(c.title, 'fr'))} »${n ? ` et ses ${n} adresse(s)` : ''} ?`, 'Supprimer', true))) return;
  m.places = m.places.filter(p => p.category !== c.id); m.categories.splice(ci, 1); changed(); curDlg?.close();
}

// Recherche d'adresse (OpenStreetMap / Nominatim).
async function geocode(path, full) {
  const q = document.getElementById('geo-q').value.trim();
  const out = document.getElementById('geo-res');
  if (!q) return;
  out.innerHTML = '<p class="muted">Recherche…</p>';
  const r = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=6&accept-language=fr&q=${encodeURIComponent(q)}`);
  const list = await r.json();
  out.innerHTML = list.length ? list.map((x, i) => `<button class="item" data-gi="${i}" style="text-align:left;cursor:pointer">${icon('map-pin')}<span class="t">${esc(x.display_name)}</span></button>`).join('') : '<p class="muted">Aucun résultat. Essayez avec la ville, ou placez le repère sur la carte.</p>';
  out.onclick = e => {
    const b = e.target.closest('[data-gi]'); if (!b) return;
    const x = list[+b.dataset.gi];
    setP(path + '.lat', +(+x.lat).toFixed(6)); setP(path + '.lng', +(+x.lon).toFixed(6));
    setP(path + (full ? '.full' : '.address'), x.display_name.split(', ').slice(0, 4).join(', '));
    if (!full && !getP(path + '.name')) setP(path + '.name', x.name || q);
    changed(); rerender();
  };
}

// Suggestions d'adresses autour du logement (OpenStreetMap / Overpass).
const SUGG = [
  ['restaurant', 'Restaurants', 'amenity=restaurant', 'restaurants'], ['cafe', 'Cafés & bars', 'amenity~"cafe|bar"', 'nightlife'],
  ['bakery', 'Boulangeries', 'shop=bakery', 'food'], ['supermarket', 'Supermarchés', 'shop~"supermarket|convenience"', 'food'],
  ['pharmacy', 'Pharmacies', 'amenity=pharmacy', 'health'], ['beach', 'Plages', 'natural=beach', 'nature'],
  ['viewpoint', 'Points de vue', 'tourism=viewpoint', 'nature'], ['attraction', 'Sites à visiter', 'tourism~"attraction|museum"', 'culture'],
  ['fuel', 'Stations-service', 'amenity=fuel', 'mobility'], ['doctor', 'Médecins', 'amenity~"doctors|clinic"', 'health'],
];
async function suggestPlaces() {
  const h = S.D.property.address;
  if (h.lat == null) return toast('Renseignez d’abord l’adresse du logement (Paramétrage › Mon hébergement).', true);
  const d = dlg(`<h3>${icon('sparkles')} Suggestions autour du logement</h3><p class="muted">Données OpenStreetMap. Cochez les adresses à ajouter, puis complétez-les (photo, conseil…).</p>
    <div class="grid2"><label class="f"><span>Type</span><select class="inp" id="sg-t">${SUGG.map(s => `<option value="${s[0]}">${s[1]}</option>`).join('')}</select></label>
    <label class="f"><span>Rayon</span><select class="inp" id="sg-r"><option value="3000">3 km</option><option value="8000" selected>8 km</option><option value="20000">20 km</option></select></label></div>
    <button class="b violet" id="sg-go">${icon('search')} Rechercher</button><div id="sg-out" class="list" style="margin-top:12px"></div>
    <div class="acts"><button class="b" data-x>Fermer</button><button class="b violet" id="sg-add" disabled>Ajouter la sélection</button></div>`, { wide: true });
  d.el.querySelector('[data-x]').onclick = d.close;
  let found = [];
  d.el.querySelector('#sg-go').onclick = async () => {
    const s = SUGG.find(x => x[0] === d.el.querySelector('#sg-t').value), rad = d.el.querySelector('#sg-r').value;
    const out = d.el.querySelector('#sg-out'); out.innerHTML = '<p class="muted">Recherche…</p>';
    const q = `[out:json][timeout:25];nwr[${s[2]}][name](around:${rad},${h.lat},${h.lng});out center 40;`;
    try {
      const r = await fetch('https://overpass-api.de/api/interpreter', { method: 'POST', body: 'data=' + encodeURIComponent(q) });
      const js = await r.json();
      const m = S.D.modules[nbIndex()];
      found = js.elements.map(el => ({ name: el.tags.name, lat: el.lat ?? el.center?.lat, lng: el.lon ?? el.center?.lon, phone: el.tags.phone || el.tags['contact:phone'] || '', website: el.tags.website || el.tags['contact:website'] || '', address: [el.tags['addr:housenumber'], el.tags['addr:street'], el.tags['addr:city']].filter(Boolean).join(' '), cat: s[3] }))
        .filter(p => p.lat && !m.places.some(x => x.name.toLowerCase() === p.name.toLowerCase()))
        .map(p => ({ ...p, km: distanceKm(h, p) })).sort((a, b) => a.km - b.km);
      out.innerHTML = found.length ? found.map((p, i) => `<label class="item"><input type="checkbox" data-si="${i}"><span class="t">${esc(p.name)}<small>${p.km.toFixed(1)} km${p.address ? ' · ' + esc(p.address) : ''}</small></span></label>`).join('') : '<p class="muted">Rien trouvé dans ce rayon.</p>';
      d.el.querySelector('#sg-add').disabled = !found.length;
    } catch (err) { out.innerHTML = `<p class="muted">Service momentanément indisponible (${esc(err.message)}). Réessayez.</p>`; }
  };
  d.el.querySelector('#sg-add').onclick = () => {
    const m = S.D.modules[nbIndex()];
    const picked = [...d.el.querySelectorAll('[data-si]:checked')].map(c => found[+c.dataset.si]);
    picked.forEach(p => {
      const cat = m.categories.find(c => c.id === p.cat) || m.categories[0];
      m.places.push({ id: uid('p'), name: p.name, category: cat?.id || '', sub: '', favorite: false, lat: +p.lat.toFixed(6), lng: +p.lng.toFixed(6), address: p.address, phone: p.phone, website: p.website, rating: null, ratingCount: 0, type: {}, summary: {}, remarks: {}, photo: '', mapsUrl: '', active: true });
    });
    changed(); d.close(); toast(`${picked.length} adresse(s) ajoutée(s)`); renderMain();
  };
}

// --- Style
async function choosePalette(id) {
  const p = PALETTES.find(x => x.id === id);
  if (!(await ask(`Appliquer le style « ${p.name} » ? Les couleurs actuelles seront remplacées.`, 'Appliquer'))) return;
  applyPalette(S.D.theme, p); changed(); renderMain();
}
function toggleSecLang(l) {
  const L = S.D.languages;
  if (L.secondary.includes(l)) L.secondary = L.secondary.filter(x => x !== l);
  else if (L.secondary.length >= 8) return toast('8 langues secondaires maximum.', true);
  else L.secondary.push(l);
  changed(); renderMain();
}

// --- Affiches
function posterOpts(id) {
  const p = POSTERS.find(x => x.id === id);
  const ov = (S.D.share.poster?.overrides || {})[id] || {};
  const w = S.D.modules.find(m => m.type === 'wifi')?.items?.[0] || {};
  return { title: ov.title || p.title, title2: ov.title2 ?? p.title2, text: ov.text ?? p.text, ssid: w.ssid, password: w.password };
}
function openPoster(id) {
  const p = POSTERS.find(x => x.id === id);
  S.D.share.poster = S.D.share.poster || {}; S.D.share.poster.overrides = S.D.share.poster.overrides || {};
  const ov = S.D.share.poster.overrides[id] = S.D.share.poster.overrides[id] || {};
  const o = posterOpts(id);
  const d = dlg(`<h3>Affiche ${p.wifi ? 'Wifi' : '« ' + esc(p.title) + ' »'}</h3><div class="split-side">
    <canvas id="pc" width="1240" height="1754" style="width:100%;border-radius:8px;box-shadow:0 4px 18px rgba(0,0,0,.15)"></canvas>
    <div>${p.wifi ? `<p class="muted">Réseau et mot de passe repris du module Wifi.</p>` : `<label class="f"><span>Titre</span><input class="inp" id="pt" value="${esc(o.title)}"></label>
      ${p.title2 != null ? `<label class="f"><span>Second titre</span><input class="inp" id="pt2" value="${esc(o.title2)}"></label>` : ''}
      <label class="f"><span>Texte</span><textarea class="inp" id="px" rows="4">${esc(o.text)}</textarea></label>`}
      <div style="display:flex;flex-direction:column;gap:8px"><button class="b violet" id="pdl">${icon('download')} Télécharger (PNG, A4 150 dpi)</button><button class="b" id="ppr">${icon('printer')} Imprimer</button></div>
      <p class="muted">Le QR code utilise le style et la couleur choisis dans l’onglet QR Code.</p></div></div>`, { wide: true });
  const cv = d.el.querySelector('#pc');
  const redraw = () => drawPoster(cv, id, posterOpts(id));
  redraw();
  d.el.querySelectorAll('#pt,#pt2,#px').forEach(i => i.addEventListener('input', () => { ov.title = d.el.querySelector('#pt')?.value; if (d.el.querySelector('#pt2')) ov.title2 = d.el.querySelector('#pt2').value; ov.text = d.el.querySelector('#px')?.value; changed(); redraw(); }));
  d.el.querySelector('#pdl').onclick = () => cv.toBlob(b => { const u = URL.createObjectURL(b); const l = document.createElement('a'); l.href = u; l.download = `affiche-livret-${id}.png`; l.click(); setTimeout(() => URL.revokeObjectURL(u), 2000); });
  d.el.querySelector('#ppr').onclick = () => {
    const w = window.open('', '_blank');
    if (!w) return toast('La fenêtre d’impression a été bloquée : autorisez les fenêtres pour ce site, ou téléchargez le PNG.', true, 5000);
    w.document.write(`<title>Affiche</title><style>@page{size:A4;margin:0}body{margin:0}img{width:100%;height:100vh;object-fit:contain}</style><img src="${cv.toDataURL('image/png')}" onload="setTimeout(()=>print(),300)">`);
    w.document.close();
  };
}

// ---------------------------------------------------------------- serveur (Apps Script)
async function be(action, payload = {}) {
  const url = S.D.backend?.url;
  if (!url) throw new Error('Adresse du serveur non renseignée (Paramétrage › Publication & serveur).');
  const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action, key: S.cfg.backend?.adminKey || '', ...payload }) });
  const d = await r.json();
  if (d.error) throw new Error(d.error);
  return d;
}
async function testBackend() {
  const out = document.getElementById('be-res'); out.textContent = 'Test…';
  try {
    const d = await be('admin.ping', { bookletUrl: siteUrl() + 'data/booklet.json', siteTitle: tx(S.D.property.title, S.D.languages.primary) });
    out.innerHTML = `<b style="color:var(--ok)">✔ Serveur OK</b> — assistant IA ${d.ai ? 'prêt' : '<b>sans clé Claude</b> (ANTHROPIC_API_KEY manquante)'} · e-mails envoyés à ${esc(d.notify || '—')}.`;
  } catch (err) { out.innerHTML = `<b style="color:#b91c1c">✖ ${esc(err.message)}</b>`; }
}
async function loadStats() {
  statsData = null; statsErr = '';
  if (!S.D.backend?.url || !S.cfg.backend?.adminKey) { statsErr = 'Les statistiques nécessitent le serveur : renseignez son adresse et la clé administrateur dans Paramétrage › Publication & serveur.'; return; }
  try { statsData = await be('stats'); } catch (e) { statsErr = 'Statistiques indisponibles : ' + e.message; }
  if (S.step === 'stats') renderMain();
}
async function loadReviews() {
  reviewsData = null; reviewsErr = '';
  if (!S.D.backend?.url || !S.cfg.backend?.adminKey) { reviewsErr = 'Le livre d’or nécessite le serveur : renseignez son adresse et la clé administrateur dans Paramétrage › Publication & serveur.'; return; }
  try { reviewsData = (await be('guestbook.list')).reviews; } catch (e) { reviewsErr = 'Avis indisponibles : ' + e.message; }
  if (S.step === 'reviews') renderMain();
}
async function moderate(id, status) {
  if (status === 'deleted' && !(await ask('Supprimer définitivement ce message ?', 'Supprimer', true))) return;
  await be('guestbook.moderate', { id, status });
  await loadReviews();
}
async function aiWrite(instruction, html) {
  const d = await be('ai.write', { instruction, html, lang: S.lang, context: tx(S.D.property.title, S.D.languages.primary) });
  return d.html;
}

// Traduction automatique : on repère les champs multilingues { fr: '…', en: '…' }.
const LANG_SET = new Set(Object.keys(LANGS));
function isTr(o) { return o && typeof o === 'object' && !Array.isArray(o) && Object.keys(o).length && Object.keys(o).every(k => LANG_SET.has(k)); }
function collectTr(o, path = '', out = []) {
  if (!o || typeof o !== 'object') return out;
  if (isTr(o)) { out.push(path); return out; }
  for (const [k, v] of Object.entries(o)) if (v && typeof v === 'object') collectTr(v, path ? `${path}.${k}` : k, out);
  return out;
}
async function translatePaths(paths, force) {
  const L = S.D.languages, from = L.primary, targets = L.secondary;
  if (!targets.length) return toast('Ajoutez d’abord des langues secondaires.', true);
  const jobs = []; // { path, to, text, isList }
  for (const p of paths) {
    const o = getP(p); if (!o) continue;
    const srcv = o[from]; if (!srcv || (Array.isArray(srcv) && !srcv.length)) continue;
    for (const to of targets) if (force || !o[to] || (Array.isArray(o[to]) && !o[to].length)) jobs.push({ path: p, to, text: Array.isArray(srcv) ? srcv.join('\n') : srcv, isList: Array.isArray(srcv) });
  }
  if (!jobs.length) return toast('Rien à traduire : tout est déjà traduit.');
  const d = dlg(`<h3>✨ Traduction en cours…</h3><div class="progress"><i id="trp"></i></div><p class="muted" id="trt">0 / ${jobs.length}</p>`, { sticky: true });
  let done = 0;
  try {
    for (const to of targets) {
      const mine = jobs.filter(j => j.to === to);
      for (let i = 0; i < mine.length;) {
        const batch = []; let size = 0;
        while (i < mine.length && batch.length < 12 && size < 5000) { batch.push(mine[i]); size += mine[i].text.length; i++; }
        const r = await be('translate', { from, to, texts: batch.map(b => b.text) });
        batch.forEach((b, k) => { const o = getP(b.path); const v = r.texts[k] || ''; o[to] = b.isList ? v.split('\n').map(s => s.trim()).filter(Boolean) : v; });
        done += batch.length;
        d.el.querySelector('#trp').style.width = (done / jobs.length * 100) + '%';
        d.el.querySelector('#trt').textContent = `${done} / ${jobs.length}`;
      }
    }
    changed(); toast(`${done} texte(s) traduit(s). Relisez-les avant de publier.`);
  } finally { d.close(); renderMain(); }
}
function translateAll(force) {
  return translatePaths(collectTr(S.D), force);
}

// ---------------------------------------------------------------- publication
const b64 = dataUrl => dataUrl.slice(dataUrl.indexOf(',') + 1);
function walkStrings(o, fn) {
  if (Array.isArray(o)) o.forEach((v, i) => { if (typeof v === 'string') o[i] = fn(v); else walkStrings(v, fn); });
  else if (o && typeof o === 'object') for (const k of Object.keys(o)) { if (typeof o[k] === 'string') o[k] = fn(o[k]); else walkStrings(o[k], fn); }
}
async function squareIcon(dataUrlOrPath, px) {
  const img = new Image(); img.crossOrigin = 'anonymous'; img.src = src(dataUrlOrPath); await img.decode();
  const side = Math.max(img.width, img.height);
  const cv = document.createElement('canvas'); cv.width = cv.height = px;
  const cx = cv.getContext('2d'); cx.fillStyle = '#fff'; cx.fillRect(0, 0, px, px);
  const sc = px / side; cx.drawImage(img, (px - img.width * sc) / 2, (px - img.height * sc) / 2, img.width * sc, img.height * sc);
  return cv.toDataURL('image/png');
}
async function buildPublication() {
  // 1. images collées directement dans les textes (data:) → fichiers médias
  for (const m of [S.D]) {
    const conv = [];
    walkStrings(m, s => { if (s.includes('data:image/')) conv.push(s); return s; });
    for (const s of conv) {
      let out = s;
      for (const [, du] of [...s.matchAll(/src="(data:image\/(png|jpe?g|webp|gif);base64,[^"]+)"/g)]) {
        const ext = /data:image\/(\w+)/.exec(du)[1].replace('jpeg', 'jpg');
        const p = `media/image-${await hash8(du)}.${ext}`; S.pending[p] = du; out = out.split(du).join(p);
      }
      walkStrings(S.D, x => (x === s ? out : x));
    }
  }
  const data = clone(S.D);
  data.updatedAt = new Date().toISOString();
  const files = [];
  // 2. médias en attente réellement utilisés
  const json = JSON.stringify(data);
  for (const [p, du] of Object.entries(S.pending)) if (json.includes(p)) files.push({ path: p, base64: b64(du) });
  // 3. icônes d'application (si l'icône a changé)
  const meta = data.share.meta, title = tx(data.property.title, data.languages.primary) || 'Livret d’accueil';
  let icons = { i192: 'media/icon-192.png', i512: 'media/icon-512.png' };
  if (meta.icon && meta.icon !== 'media/icon-512.png') {
    const h = (await hash8(meta.icon)).slice(0, 6);
    icons = { i192: `media/icon-192-${h}.png`, i512: `media/icon-512-${h}.png` };
    files.push({ path: icons.i192, base64: b64(await squareIcon(meta.icon, 192)) }, { path: icons.i512, base64: b64(await squareIcon(meta.icon, 512)) });
  }
  // 4. index.html (aperçu des liens) + manifeste + CNAME
  const base = siteUrl();
  const abs = p => (p ? (/^https?:/.test(p) ? p : base + p) : '');
  const e = s => String(s || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
  const metaHtml = `<!--META-->
<title>${e(meta.title && meta.title !== 'Livret d\'accueil' ? meta.title : title + ' — Livret d’accueil')}</title>
<meta name="description" content="${e(meta.description || 'Livret d’accueil de ' + title)}">
<meta property="og:type" content="website">
<meta property="og:url" content="${e(base)}">
<meta property="og:title" content="${e(meta.title || title)}">
<meta property="og:description" content="${e(meta.description || 'Livret d’accueil de ' + title)}">
${meta.image ? `<meta property="og:image" content="${e(abs(meta.image))}">\n` : ''}<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="${e(icons.i192)}">
<link rel="apple-touch-icon" href="${e(icons.i512)}">
<meta name="theme-color" content="${e(data.theme.menu?.bg || '#ffffff')}">
<!--/META-->`;
  // L'hébergeur peut ajouter son propre commentaire à la page servie : on ne le réenregistre pas.
  const idx = (await (await fetch('index.html', { cache: 'no-cache' })).text()).replace(/<!-- This site is hosted on Netlify\.[\s\S]*?-->\n?/g, '');
  files.push({ path: 'index.html', text: idx.replace(/<!--META-->[\s\S]*?<!--\/META-->/, metaHtml) });
  files.push({ path: 'manifest.webmanifest', text: JSON.stringify({ name: `${title} — Livret d’accueil`, short_name: title.slice(0, 24), start_url: './', scope: './', display: 'standalone', background_color: data.theme.pages?.bg || '#ffffff', theme_color: data.theme.menu?.bg || '#ffffff', icons: [{ src: icons.i192, sizes: '192x192', type: 'image/png', purpose: 'any' }, { src: icons.i512, sizes: '512x512', type: 'image/png', purpose: 'any' }] }, null, 1) });
  const dom = (data.share.domain || '').trim().replace(/^https?:\/\//, '').replace(/\/+$/, '');
  const prevDom = (S.PUB.share?.domain || '').trim();
  if (dom) files.push({ path: 'CNAME', text: dom + '\n' });
  else if (prevDom) files.push({ path: 'CNAME', delete: true });
  files.unshift({ path: 'data/booklet.json', text: JSON.stringify(data, null, 1) });
  return { data, files };
}

async function publishFlow() {
  const g = S.cfg.github;
  if (!g.owner || !g.repo || !g.token) {
    const d = dlg(`<h3>Publication non configurée</h3><p>Pour publier en un clic, renseignez votre compte GitHub, le dépôt et un jeton d’accès dans <b>Paramétrage › Publication &amp; serveur</b> (le guide <a href="GUIDE.html" target="_blank">GUIDE.html</a> explique tout).</p>
      <p class="muted">En attendant, vous pouvez exporter le livret (JSON) et le déposer à la main dans le dossier <code class="k">data/</code> du dépôt.</p>
      <div class="acts"><button class="b" data-act="export">Exporter le livret</button><button class="b violet" data-goto="settings:publish">Configurer</button></div>`);
    d.el.addEventListener('click', ev => { if (ev.target.closest('[data-goto],[data-act]')) setTimeout(() => d.close(), 0); });
    return;
  }
  const d = dlg(`<h3>${icon('cloud-upload')} Publication…</h3><div class="progress"><i id="pp"></i></div><p class="muted" id="pt">Préparation des fichiers…</p>`, { sticky: true });
  const bar = d.el.querySelector('#pp'), txt = d.el.querySelector('#pt');
  try {
    const { data, files } = await buildPublication();
    const n = files.filter(f => f.path.startsWith('media/')).length;
    await publishFiles(files, `Mise à jour du livret (${new Date().toLocaleString('fr-FR')})`, (i, total, path) => { bar.style.width = (i / total * 100) + '%'; txt.textContent = `Envoi ${i} / ${total} : ${path}`; });
    S.PUB = clone(data); S.dirty = false;
    await idbDel('draft');
    d.el.innerHTML = `<h3 style="color:var(--ok)">✔ Livret publié</h3><p>${files.length} fichier(s) envoyé(s) dont ${n} image(s). Le livret en ligne est mis à jour d’ici <b>1 à 2 minutes</b>.</p>
      <p><a href="${esc(siteUrl())}" target="_blank" rel="noopener">${esc(siteUrl())}</a></p><div class="acts"><button class="b violet" data-x>Fermer</button></div>`;
    d.el.querySelector('[data-x]').onclick = d.close;
    renderMain();
  } catch (err) {
    d.el.innerHTML = `<h3 style="color:#b91c1c">✖ La publication a échoué</h3><p>${esc(err.message)}</p><p class="muted">Vos modifications sont conservées dans ce navigateur.</p><div class="acts"><button class="b" data-x>Fermer</button></div>`;
    d.el.querySelector('[data-x]').onclick = d.close;
  }
}

document.addEventListener('keydown', e => { if (e.key === 'Escape' && document.body.classList.contains('pv-full') && !document.querySelector('.dlg-veil')) action('pv-close'); });
if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) navigator.serviceWorker.register('sw.js').catch(() => {});
boot();
