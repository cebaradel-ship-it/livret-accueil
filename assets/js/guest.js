// Livret d'accueil — application voyageur (lecture seule).
import { icon } from './icons.js';
import { LANGS, flag, ui, tx, esc, safeHtml, themeVars, loadFonts, weatherLabel, distanceKm, telHref, waHref, wifiPayload } from './core.js';

const PREVIEW = new URLSearchParams(location.search).has('preview');
const $app = document.getElementById('app');
let B = null;            // données du livret
let PENDING = {};        // médias pas encore publiés (aperçu de l'éditeur)
let lang = 'fr';
let installEvt = null;
let mapState = null;     // carte Leaflet active
const chat = [];         // historique de l'assistant

const media = p => (!p ? '' : PENDING[p] || p);
const T = o => tx(o, lang, B.languages.primary);
const U = k => ui(lang, k);
const active = () => B.modules.filter(m => m.active);
const mod = id => B.modules.find(m => m.id === id);
const home = () => B.property.address || {};
const backendUrl = () => (B.backend && B.backend.url) || '';

// ---------------------------------------------------------------- démarrage
async function boot() {
  if (PREVIEW) {
    window.addEventListener('message', e => {
      const m = e.data || {};
      if (m.type === 'data') { B = m.data; PENDING = m.pending || {}; if (!B.languages.secondary.concat(B.languages.primary).includes(lang)) lang = B.languages.primary; apply(); render(); }
      if (m.type === 'nav') { if (location.hash !== m.hash) location.hash = m.hash; else render(); }
      if (m.type === 'lang') { lang = m.lang; render(); }
      if (m.type === 'popup') showWelcome(true);
    });
    parent.postMessage({ type: 'ready' }, '*');
    return;
  }
  try {
    const r = await fetch('data/booklet.json', { cache: 'no-cache' });
    B = await r.json();
  } catch (e) {
    $app.innerHTML = '<p style="padding:40px;text-align:center">Impossible de charger le livret.</p>';
    return;
  }
  const langs = [B.languages.primary, ...B.languages.secondary];
  const saved = localStorage.getItem('livret-lang');
  const nav = (navigator.language || 'fr').slice(0, 2);
  lang = langs.includes(saved) ? saved : langs.includes(nav) ? nav : B.languages.primary;
  apply();
  if (!(await gate())) return;
  render();
  maybeWelcome();
  track('open');
  if (new URLSearchParams(location.search).has('qr')) track('scan');
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) navigator.serviceWorker.register('sw.js').catch(() => {});
}

window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); installEvt = e; });
window.addEventListener('hashchange', () => { render(); window.scrollTo(0, 0); });

// Format d'écran : mobile, tablette, PC (le rendu change de mise en page au passage d'un seuil).
const mqTab = matchMedia('(min-width: 640px)'), mqDesk = matchMedia('(min-width: 1024px)');
const device = () => (mqDesk.matches ? 'desktop' : mqTab.matches ? 'tablet' : 'mobile');
[mqTab, mqDesk].forEach(mq => mq.addEventListener('change', () => { if (B) { const y = scrollY; render(); scrollTo(0, y); } }));
// Disposition des modules de l'accueil selon l'écran (réglage « différent pour PC, tablette et mobile » ou adaptation automatique).
function gridLayout() {
  const m = B.theme.modules || {}, base = m.grid || '2-cols', d = device();
  if (d === 'mobile') return base;
  if (m.gridResponsive) return (d === 'tablet' ? m.gridTablet : m.gridDesktop) || base;
  if (base === 'list') return d === 'desktop' ? 'list2' : 'list';
  if (base === '1-col') return d === 'desktop' ? '3-cols' : '2-cols';
  return d === 'desktop' ? '4-cols' : '3-cols';
}

function apply() {
  document.documentElement.style.cssText = themeVars(B.theme);
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  loadFonts(B.theme);
  document.body.classList.toggle('icons-invisible', B.theme.modules?.iconStyle === 'invisible');
  let bg = document.getElementById('bg');
  if (!bg) { bg = document.createElement('div'); bg.id = 'bg'; document.body.prepend(bg); }
  // Le fond reste uni ; la photo de fond sert de grande image en tête de l'accueil.
  bg.style.backgroundImage = 'none';
}
const heroImage = () => { const t = B.theme.background || {}; return t.type === 'image' && t.image ? media(t.image) : ''; };

// ---------------------------------------------------------------- accès restreint
async function sha(s) {
  const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s.trim().toLowerCase()));
  return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('');
}
async function gate() {
  const a = B.access || {};
  if (!a.enabled || !a.codes?.length) return true;
  const key = 'livret-access';
  if (a.codes.includes(localStorage.getItem(key))) return true;
  return new Promise(resolve => {
    $app.innerHTML = `<div class="gate"><div class="card">${icon('lock', '', 36)}<h3>${U('accessTitle')}</h3><p>${U('accessText')}</p>
      <input id="gcode" autocomplete="off" inputmode="text"><button class="btn" id="gok">${U('enter')}</button><p id="gerr" style="color:#c0392b"></p></div></div>`;
    const go = async () => {
      const h = await sha(document.getElementById('gcode').value);
      if (a.codes.includes(h)) { localStorage.setItem(key, h); resolve(true); render(); maybeWelcome(); track('open'); }
      else document.getElementById('gerr').textContent = U('accessBad');
    };
    document.getElementById('gok').onclick = go;
    document.getElementById('gcode').onkeydown = e => { if (e.key === 'Enter') go(); };
  });
}

// ---------------------------------------------------------------- routage
function route() {
  const parts = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  return parts;
}

function render() {
  if (!B) return;
  closeOverlays();
  if (mapState) { mapState.remove(); mapState = null; }
  const r = route();
  let html;
  if (!r.length) html = homeView();
  else if (r[0] === 'm' && mod(r[1])) html = moduleView(mod(r[1]), r.slice(2));
  else if (r[0] === 'map') html = globalMapView();
  else if (r[0] === 'assistant') html = assistantView();
  else html = pageShell({ title: U('notFound'), body: `<p class="empty">${U('notFound')}</p>` });
  $app.innerHTML = html + navbar(r);
  document.title = T(B.property.title) || 'Livret d’accueil';
  after(r);
}

// Actions après rendu (cartes, QR codes, formulaires…).
function after(r) {
  if (!r.length) { weather(); stickyWatch(); }
  document.querySelectorAll('[data-map]').forEach(el => drawMap(el));
  document.querySelectorAll('[data-qr]').forEach(el => drawQr(el));
  if (r[0] === 'm' && mod(r[1])?.type === 'guestbook') loadReviews();
  if (r[0] === 'assistant') { const i = document.getElementById('ask'); if (i && !PREVIEW) i.focus({ preventScroll: true }); scrollChat(); }
}

// ---------------------------------------------------------------- accueil
function homeView() {
  const t = B.theme, p = B.property, w = t.widgets || {};
    const avatar = B.branding.avatarEnabled && B.branding.avatar ? `<img class="avatar" src="${esc(media(B.branding.avatar))}" alt="">` : '';
  const chips = [p.arrivalAfter && `${U('arrival')} ${esc(p.arrivalAfter)}`, p.departureBefore && `${U('departure')} ${esc(p.departureBefore)}`].filter(Boolean)
    .map(c => `<span class="chip">${c}</span>`).join('');
  const go = w.goButton?.enabled && (home().lat || home().full) ? `<button class="go-btn" data-act="go">${icon('map-2')}<span>${U('goHome')}</span>${icon('chevron-right')}</button>` : '';
  const contacts = w.contacts?.enabled ? contactsRow() : '';
  const pos = w.contacts?.position || 'below';
  const grid = active().map(m => {
    const img = t.modules?.bgType === 'image' && m.image ? ` img" style="background-image:url('${esc(media(m.image))}')` : '';
    return `<a class="tile${img}" href="#/m/${m.id}"><span class="ti">${icon(m.icon)}</span><span class="tt">${esc(T(m.title))}</span><span class="ta">${icon('chevron-right')}</span></a>`;
  }).join('');
  const layout = gridLayout();
  const modern = t.layout === 'modern';
  const hero = heroImage();
  const eyebrow = home().displayed || '';
  return `<div class="app ${modern ? 'modern' : ''}">
    ${topbar()}
    <div class="sticky" id="sticky"><button data-act="lang">${flag(lang, 26)}</button><span class="t">${esc(T(p.title))}</span>${t.menu?.enabled !== false ? `<button data-act="menu">${icon('menu-2')}</button>` : '<span></span>'}</div>
    <header class="hero-home${hero ? ' has-img' : ''}" id="hh"${hero ? ` style="background-image:url('${esc(hero)}')"` : ''}>
      <div class="hh-in">
      ${avatar}
      ${t.widgets?.weather?.enabled ? '<div class="weather" id="weather" hidden></div>' : ''}
      ${eyebrow ? `<p class="h-eyebrow">${esc(eyebrow)}</p>` : ''}
      <h1 class="h-title">${esc(T(p.title))}</h1>
      ${T(p.subtitle) ? `<div class="h-sub">${safeHtml(T(p.subtitle))}</div>` : ''}
      ${chips ? `<div class="chips">${chips}</div>` : ''}
      </div>
    </header>
    <div class="h-actions">${pos === 'above' ? contacts : ''}${go}${pos === 'below' ? contacts : ''}</div>
    <h2 class="h-sec">${esc(U('allInfo'))}</h2>
    <nav class="grid l-${layout}" aria-label="${esc(U('allInfo'))}">${grid}</nav>
    ${pos === 'bottom' ? contacts : ''}
    <div class="foot">${esc(T(p.title))}${B.property.hostNameHidden || !B.property.hostName ? '' : ' · ' + esc(B.property.hostName)}</div>
  </div>`;
}

function topbar() {
  return `<div class="topbar"><button class="round" data-act="lang" aria-label="${esc(U('language'))}">${flag(lang, 30)}</button>
    ${B.theme.menu?.enabled !== false ? `<button class="round" data-act="menu" aria-label="Menu">${icon('menu-2')}</button>` : ''}</div>`;
}

function contactList() {
  const c = B.contact || {};
  const all = {
    whatsapp: c.whatsapp && { href: waHref(c.whatsapp), ic: 'brand-whatsapp', l: U('whatsapp') },
    phone: c.phone && { href: telHref(c.phone), ic: 'phone', l: U('call') },
    email: c.email && { href: 'mailto:' + c.email, ic: 'mail', l: U('email') },
    url: c.url && { href: c.url, ic: 'world', l: U('website') },
    instagram: c.instagram && { href: c.instagram.startsWith('http') ? c.instagram : 'https://instagram.com/' + c.instagram.replace('@', ''), ic: 'brand-instagram', l: 'Instagram' },
    facebook: c.facebook && { href: c.facebook.startsWith('http') ? c.facebook : 'https://facebook.com/' + c.facebook, ic: 'brand-facebook', l: 'Facebook' },
    twitter: c.twitter && { href: c.twitter.startsWith('http') ? c.twitter : 'https://x.com/' + c.twitter.replace('@', ''), ic: 'brand-x', l: 'X' },
    linkedin: c.linkedin && { href: c.linkedin, ic: 'brand-linkedin', l: 'LinkedIn' },
  };
  const order = (c.order && c.order.length ? c.order : Object.keys(all));
  return order.map(k => all[k]).filter(Boolean);
}
function contactsRow() {
  const l = contactList();
  if (!l.length) return '';
  const style = B.theme.widgets?.contacts?.style === 'custom' ? ' custom' : '';
  return `<div class="contacts-row${style}">${l.map(x => `<a href="${esc(x.href)}" target="_blank" rel="noopener" aria-label="${esc(x.l)}">${icon(x.ic)}</a>`).join('')}</div>`;
}

async function weather() {
  const el = document.getElementById('weather');
  const a = home();
  if (!el || a.lat == null) return;
  const key = `wx-${a.lat}-${a.lng}`;
  let d = null;
  try { const c = JSON.parse(sessionStorage.getItem(key) || 'null'); if (c && Date.now() - c.t < 30 * 60e3) d = c.d; } catch (e) { /* cache illisible */ }
  if (!d) {
    try {
      const r = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${a.lat}&longitude=${a.lng}&current=temperature_2m,weather_code&timezone=auto`);
      d = (await r.json()).current;
      sessionStorage.setItem(key, JSON.stringify({ t: Date.now(), d }));
    } catch (e) { return; }
  }
  if (!d) return;
  const w = weatherLabel(d.weather_code, lang);
  el.innerHTML = `${icon(w.icon)}<b>${Math.round(d.temperature_2m)}°</b> ${esc(w.label)}`;
  el.hidden = false;
}

function stickyWatch() {
  const s = document.getElementById('sticky'), h = document.querySelector('.h-title');
  if (!s || !h) return;
  const on = () => s.classList.toggle('on', h.getBoundingClientRect().bottom < 0);
  window.onscroll = on; on();
}

// ---------------------------------------------------------------- pages
function pageShell({ title, badge, badgeIcon, image, body, back = '#/' }) {
  const img = media(image) || media(B.theme.background?.image);
  return `<div class="page">
    <div class="phero" style="${img ? `background-image:url('${esc(img)}')` : ''}">
      <a class="round l" href="${back}" aria-label="${esc(U('back'))}">${icon('chevron-left')}</a>
      ${B.theme.menu?.enabled !== false ? `<button class="round r" data-act="menu" aria-label="Menu">${icon('menu-2')}</button>` : ''}
      ${badge ? `<span class="pbadge">${badgeIcon ? icon(badgeIcon) : ''}${esc(badge)}</span>` : ''}
      <h1>${esc(title)}</h1>
    </div>
    <div class="pbody">${body}</div>
  </div>`;
}

function moduleView(m, rest) {
  track('module', m.id);
  const base = { badge: T(B.property.title), badgeIcon: m.icon, image: m.image, title: T(m.title) };
  switch (m.type) {
    case 'welcome': return pageShell({ ...base, body: `<div class="card"><div class="rich">${safeHtml(T(B.welcome.html))}</div></div>` });
    case 'info': return infoView(m, rest, base);
    case 'nearby': return nearbyView(m, rest, base);
    case 'contacts': return pageShell({ ...base, body: contactsView(m) });
    case 'partners': return pageShell({ ...base, body: partnersView(m) });
    case 'digicode': return pageShell({ ...base, body: digicodeView(m) });
    case 'wifi': return pageShell({ ...base, body: wifiView(m) });
    case 'guestbook': return pageShell({ ...base, body: guestbookView(m) });
    case 'custom': return pageShell({ ...base, body: `<div class="card"><div class="rich">${safeHtml(T(m.html))}</div>${mediaBlock(m.media)}</div>` });
    default: return pageShell({ ...base, body: '' });
  }
}

// --- modules « infos » (arrivée, pratiques, départ…)
const visibleCats = m => (m.categories || []).filter(c => c.active !== false && (c.redirect || (c.records || []).some(r => r.active !== false)));

function infoView(m, rest, base) {
  const cats = visibleCats(m);
  if (rest[0] === 'c') {
    const c = cats.find(x => x.id === rest[1]);
    if (!c) return pageShell({ ...base, body: `<p class="empty">${U('notFound')}</p>` });
    const recs = (c.records || []).filter(r => r.active !== false);
    const cb = { badge: T(m.title), badgeIcon: m.icon, image: c.image || m.image, title: T(c.title) };
    if (rest[2] === 'r') {
      const rec = recs.find(x => x.id === rest[3]);
      if (!rec) return pageShell({ ...cb, body: '' });
      return pageShell({ ...cb, back: `#/m/${m.id}/c/${c.id}`, body: recordBlock(rec) + otherRows(m, c, recs, rec) });
    }
    const desc = T(c.description) ? `<div class="card"><div class="rich">${safeHtml(T(c.description))}</div></div>` : '';
    // Une seule fiche : on l'affiche directement (comme StyQR).
    const list = recs.length === 1 ? recordBlock(recs[0]) : `<div class="rows">${recs.map(r => recRow(m, c, r)).join('')}</div>`;
    return pageShell({ ...cb, back: `#/m/${m.id}`, body: desc + list + otherCats(m, cats, c) });
  }
  if (!cats.length) return pageShell({ ...base, body: `<p class="empty">—</p>` });
  return pageShell({ ...base, body: `<div class="cats">${cats.map(c => catTile(m, c)).join('')}</div>` });
}
function catTile(m, c) {
  if (c.redirect) return `<a class="cat" href="${esc(c.redirect)}" target="_blank" rel="noopener"><span class="ib">${icon(c.icon)}</span>${esc(T(c.title))}</a>`;
  return `<a class="cat" href="#/m/${m.id}/c/${c.id}"><span class="ib">${icon(c.icon)}</span>${esc(T(c.title))}</a>`;
}
function recRow(m, c, r) {
  return `<a class="row" href="#/m/${m.id}/c/${c.id}/r/${r.id}"><span class="ib">${icon(c.icon)}</span><span class="tx">${esc(T(r.title))}</span>${icon('chevron-right')}</a>`;
}
function otherRows(m, c, recs, cur) {
  const o = recs.filter(r => r !== cur);
  return o.length ? `<div class="rows" style="margin-top:16px">${o.map(r => recRow(m, c, r)).join('')}</div>` : '';
}
function otherCats(m, cats, cur) {
  const o = cats.filter(c => c !== cur);
  if (!o.length) return '';
  return `<div class="sect">${icon(m.icon)}<h2>${esc(T(m.title))}</h2><p>${U('discoverOther')}</p></div>
    <div class="rows">${o.map(c => `<a class="row" href="${c.redirect ? esc(c.redirect) : `#/m/${m.id}/c/${c.id}`}"${c.redirect ? ' target="_blank" rel="noopener"' : ''}><span class="ib">${icon(c.icon)}</span><span class="tx">${esc(T(c.title))}</span>${icon('chevron-right')}</a>`).join('')}</div>`;
}
function recordBlock(r) {
  return `<div class="card"><div class="rtitle">${esc(T(r.title))}</div><div class="rich">${safeHtml(T(r.html))}</div>${mediaBlock(r.media)}</div>`;
}
function mediaBlock(list) {
  if (!list || !list.length) return '';
  const imgs = list.filter(x => x.type === 'image'), docs = list.filter(x => x.type === 'doc'), vids = list.filter(x => x.type === 'video');
  const layout = B.theme.pages?.photoLayout === 'carousel' ? ' carousel' : '';
  let h = '';
  if (imgs.length) h += `<div class="gallery${layout}">${imgs.map(x => `<img src="${esc(media(x.src))}" alt="" loading="lazy" data-zoom>`).join('')}</div>`;
  vids.forEach(v => { h += videoEmbed(v.src); });
  if (docs.length) h += `<div class="docs">${docs.map(d => `<a href="${esc(media(d.src))}" target="_blank" rel="noopener">${icon('file-text')}${esc(d.name || U('documents'))}</a>`).join('')}</div>`;
  return h;
}
function videoEmbed(src) {
  const y = /(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([\w-]{6,})/.exec(src);
  if (y) return `<div class="rich"><div class="video"><iframe data-video src="https://www.youtube-nocookie.com/embed/${y[1]}" allowfullscreen loading="lazy"></iframe></div></div>`;
  const v = /vimeo\.com\/(\d+)/.exec(src);
  if (v) return `<div class="rich"><div class="video"><iframe data-video src="https://player.vimeo.com/video/${v[1]}" allowfullscreen loading="lazy"></iframe></div></div>`;
  return `<video src="${esc(media(src))}" controls playsinline preload="metadata"></video>`;
}

// --- Autour de moi
function placesOf(m, filter) {
  return (m.places || []).filter(p => p.active !== false && (!filter || filter(p)));
}
function nearbyView(m, rest, base) {
  const all = placesOf(m);
  const cats = (m.categories || []).map(c => ({ ...c, n: all.filter(p => p.category === c.id).length })).filter(c => c.n);
  const view = sessionStorage.getItem('nb-view') || 'list';
  if (rest[0] === 'p') {
    const p = all.find(x => x.id === rest[1]);
    if (!p) return pageShell({ ...base, body: '' });
    const c = (m.categories || []).find(x => x.id === p.category);
    return pageShell({ badge: T(m.title), badgeIcon: m.icon, image: m.image, title: p.name, back: `#/m/${m.id}/c/${p.category}`, body: placeDetail(m, p, c) });
  }
  if (rest[0] === 'fav' || rest[0] === 'c') {
    const isFav = rest[0] === 'fav';
    const c = isFav ? { id: 'fav', icon: 'heart', title: { fr: U('favorites') } } : cats.find(x => x.id === rest[1]);
    if (!c) return pageShell({ ...base, body: '' });
    const list = isFav ? all.filter(p => p.favorite) : all.filter(p => p.category === c.id);
    const sub = sessionStorage.getItem('nb-sub-' + c.id) || '';
    const subs = isFav ? [] : (c.subs || []).filter(s => list.some(p => p.sub === s.id));
    const shown = sub ? list.filter(p => p.sub === sub) : list;
    const chips = subs.length > 1 ? `<div class="filters"><button class="${sub ? '' : 'on'}" data-sub="" data-cat="${c.id}">${U('all')}</button>${subs.map(s => `<button class="${sub === s.id ? 'on' : ''}" data-sub="${s.id}" data-cat="${c.id}">${icon(s.icon)}${esc(T(s.title))}</button>`).join('')}</div>` : '';
    const body = listOrMap(view, m, shown, chips + `<div class="rows">${sorted(shown).map(p => placeRow(m, p)).join('') || `<p class="empty">—</p>`}</div>`, chips);
    return pageShell({ badge: T(m.title), badgeIcon: m.icon, image: m.image, title: isFav ? U('favorites') : T(c.title), back: `#/m/${m.id}`, body });
  }
  const favs = all.filter(p => p.favorite).length;
  const body = listOrMap(view, m, all, `${favs ? `<a class="row" href="#/m/${m.id}/fav" style="margin-bottom:14px"><span class="ib fav">${icon('heart-filled')}</span><span class="tx">${U('favorites')}</span><span class="chip">${favs}</span>${icon('chevron-right')}</a>` : ''}
       <div class="cats">${cats.map(c => `<a class="cat" href="#/m/${m.id}/c/${c.id}"><span class="ib">${icon(c.icon)}</span><span>${esc(T(c.title))}<small>${c.n} ${c.n > 1 ? U('places') : U('place')}</small></span></a>`).join('')}</div>`);
  return pageShell({ ...base, body });
}
// Mobile et tablette : bascule Carte / Adresses. PC : les deux côte à côte.
function listOrMap(view, m, places, listHtml, mapExtra = '') {
  const map = cls => `<div class="map ${cls}" data-map="${m.id}" data-ids="${places.map(p => p.id).join(',')}"></div>`;
  if (device() === 'desktop') return `<div class="nb-split"><div>${listHtml}</div><div>${map('side')}</div></div>`;
  return toggleBar(view) + (view === 'map' ? mapExtra + map('') : listHtml);
}
function toggleBar(view) {
  return `<div class="toggle"><button data-view="map" class="${view === 'map' ? 'on' : ''}">${icon('map')}${U('map')}</button><button data-view="list" class="${view === 'list' ? 'on' : ''}">${icon('list')}${U('addresses')}</button></div>`;
}
function sorted(list) {
  const h = home();
  return [...list].sort((a, b) => (b.favorite - a.favorite) || ((distanceKm(h, a) ?? 1e9) - (distanceKm(h, b) ?? 1e9)));
}
function km(p) {
  const d = distanceKm(home(), p);
  return d == null ? '' : `${d < 10 ? d.toFixed(1) : Math.round(d)} ${U('km')}`;
}
function stars(p) {
  return p.rating ? `<span class="stars">${icon('star-filled')}${p.rating.toFixed(1)}</span>` : '';
}
function placeRow(m, p) {
  const cat = (m.categories || []).find(c => c.id === p.category);
  const sub = cat?.subs?.find(s => s.id === p.sub);
  const ph = media(p.photo);
  return `<a class="place" href="#/m/${m.id}/p/${p.id}">
    <span class="ph" style="${ph ? `background-image:url('${esc(ph)}')` : ''}">${ph ? '' : icon(sub?.icon || cat?.icon || 'map-pin')}</span>
    <span class="in"><span class="nm">${p.favorite ? `<span class="fav">${icon('heart-filled', '', 14)}</span> ` : ''}${esc(p.name)}</span>
      <span class="meta">${stars(p)}${sub ? `<span>${esc(T(sub.title))}</span>` : ''}${km(p) ? `<span>${km(p)}</span>` : ''}</span></span>${icon('chevron-right')}</a>`;
}
function placeDetail(m, p, c) {
  const sub = c?.subs?.find(s => s.id === p.sub);
  const ph = media(p.photo);
  const dir = p.lat != null ? `https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}` : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.name + ' ' + p.address)}`;
  return `<div class="pdetail">
    <div class="cover" style="${ph ? `background-image:url('${esc(ph)}')` : ''}">${ph ? '' : icon(sub?.icon || c?.icon || 'map-pin')}</div>
    <div class="card">
      <div class="rtitle">${p.favorite ? `<span class="fav">${icon('heart-filled', '', 18)}</span> ` : ''}${esc(p.name)}</div>
      <div class="meta" style="display:flex;gap:10px;flex-wrap:wrap;font-size:13px">${stars(p)}${p.ratingCount ? `<span>(${p.ratingCount} ${U('reviewsCount')})</span>` : ''}${T(p.type) ? `<span>${esc(T(p.type))}</span>` : sub ? `<span>${esc(T(sub.title))}</span>` : ''}${km(p) ? `<span>${km(p)}</span>` : ''}</div>
      ${T(p.summary) ? `<p class="pdesc">${esc(T(p.summary))}</p>` : ''}
      ${T(p.remarks) ? `<div class="tip"><b>${U('hostTip')}</b><div class="rich">${safeHtml(T(p.remarks))}</div></div>` : ''}
      ${p.address ? `<div class="kv"><span class="k">${icon('map-pin')}</span><span class="v" style="font-weight:400;font-size:14px">${esc(p.address)}</span></div>` : ''}
      ${mediaBlock(p.media)}
      <div class="acts">
        <a class="btn" href="${esc(dir)}" target="_blank" rel="noopener">${icon('navigation')}${U('directions')}</a>
        ${p.phone ? `<a class="btn ghost" href="${telHref(p.phone)}">${icon('phone')}${U('call')}</a>` : ''}
        ${p.website ? `<a class="btn ghost" href="${esc(p.website)}" target="_blank" rel="noopener">${icon('world')}${U('website')}</a>` : ''}
        ${p.mapsUrl ? `<a class="btn ghost" href="${esc(p.mapsUrl)}" target="_blank" rel="noopener">${icon('external-link')}Google Maps</a>` : ''}
      </div>
    </div></div>`;
}

function globalMapView() {
  const nb = active().find(m => m.type === 'nearby');
  const ids = nb ? placesOf(nb).map(p => p.id).join(',') : '';
  return `<div class="page"><div class="pbody" style="margin:0;border-radius:0;padding-top:16px">
    <div class="ahead"><span class="ai">${icon('map-2', '', 28)}</span><div><b>${esc(T(B.property.title))}</b><small>${esc(home().displayed || home().full || '')}</small></div></div>
    <div class="map full" data-map="${nb ? nb.id : ''}" data-ids="${ids}"></div></div></div>`;
}

// --- Carte Leaflet (chargée à la demande)
let leafletP = null;
function loadLeaflet() {
  if (window.L) return Promise.resolve();
  if (leafletP) return leafletP;
  leafletP = new Promise((res, rej) => {
    const css = document.createElement('link'); css.rel = 'stylesheet'; css.href = 'assets/vendor/leaflet.css'; document.head.appendChild(css);
    const s = document.createElement('script'); s.src = 'assets/vendor/leaflet.js'; s.onload = res; s.onerror = rej; document.head.appendChild(s);
  });
  return leafletP;
}
async function drawMap(el) {
  await loadLeaflet();
  if (!document.body.contains(el)) return;
  const L = window.L;
  const m = mod(el.dataset.map);
  const ids = (el.dataset.ids || '').split(',').filter(Boolean);
  const pts = m ? placesOf(m, p => ids.includes(p.id) && p.lat != null) : [];
  const h = home();
  const map = L.map(el, { zoomControl: true, attributionControl: true });
  mapState = map;
  const TILES = {
    osm: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png', '© OpenStreetMap'],
    osmfr: ['https://{s}.tile.openstreetmap.fr/osmfr/{z}/{x}/{y}.png', '© OpenStreetMap France'],
    topo: ['https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', '© OpenStreetMap © OpenTopoMap'],
  };
  const tiles = TILES[B.theme.map?.tiles] || TILES.osm;
  L.tileLayer(tiles[0], { maxZoom: 19, attribution: tiles[1] }).addTo(map);
  const col = B.theme.map?.markerColor || B.theme.primary;
  const bounds = [];
  pts.forEach(p => {
    const cat = m.categories.find(c => c.id === p.category);
    const sub = cat?.subs?.find(s => s.id === p.sub);
    const ic = L.divIcon({ className: '', html: `<div class="mk" style="background:${p.favorite ? '#e74c3c' : col}">${icon(p.favorite ? 'heart-filled' : (sub?.icon || cat?.icon || 'map-pin'))}</div>`, iconSize: [34, 34], iconAnchor: [17, 34], popupAnchor: [0, -30] });
    L.marker([p.lat, p.lng], { icon: ic }).addTo(map)
      .bindPopup(`<b>${esc(p.name)}</b>${km(p)}<br><button data-go="#/m/${m.id}/p/${p.id}">${esc(U('see'))} ›</button>`);
    bounds.push([p.lat, p.lng]);
  });
  if (h.lat != null) {
    const logo = media(B.branding.logo);
    const hi = L.divIcon({ className: '', html: `<div class="mk home" style="border-color:${B.theme.map?.homeColor || '#c0392b'}">${logo ? `<img src="${esc(logo)}" alt="">` : icon('home')}</div>`, iconSize: [42, 42], iconAnchor: [21, 42], popupAnchor: [0, -36] });
    L.marker([h.lat, h.lng], { icon: hi, zIndexOffset: 1000 }).addTo(map).bindPopup(`<b>${esc(T(B.property.title))}</b>${esc(h.displayed || h.full || '')}`);
    bounds.push([h.lat, h.lng]);
  }
  if (bounds.length > 1) map.fitBounds(bounds, { padding: [30, 30], maxZoom: 15 });
  else if (bounds.length) map.setView(bounds[0], 14);
  else map.setView([46.6, 2.4], 5);
}

// --- Numéros utiles
function contactsView(m) {
  const e = B.emergency || {};
  const em = e.enabled && e.numbers?.length ? `<h3 style="color:var(--page-title);font-size:15px;margin:0 0 10px">${U('emergency')}</h3>
    <div class="emerg">${e.numbers.map(n => `<a href="${telHref(n.number)}"><b>${esc(n.number)}</b><span>${esc(T(n.label))}</span></a>`).join('')}</div>` : '';
  const items = (m.items || []).map(c => {
    const ph = media(c.photo);
    return `<div class="card"><div class="person">${ph ? `<img src="${esc(ph)}" alt="">` : `<span class="ib" style="width:56px;height:56px;border-radius:14px;display:grid;place-items:center;background:var(--page-icon-bg);color:var(--page-icon)">${icon('phone')}</span>`}
      <div><div class="nm">${esc(T(c.name))}</div>${T(c.description) ? `<div class="rich" style="font-size:13px">${safeHtml(T(c.description))}</div>` : ''}</div></div>
      <div class="acts">${c.phone ? `<a class="btn" href="${telHref(c.phone)}">${icon('phone')}${esc(c.phone)}</a>` : ''}${c.whatsapp ? `<a class="btn ghost" href="${waHref(c.whatsapp)}" target="_blank" rel="noopener">${icon('brand-whatsapp')}WhatsApp</a>` : ''}</div></div>`;
  }).join('');
  return em + `<div class="cards">${items}</div>`;
}

// --- Conciergerie / partenaires
function partnersView(m) {
  return `<div class="cards">${(m.items || []).map(p => {
    const logo = media(p.logo);
    return `<div class="card">
      <div class="person">${logo ? `<img src="${esc(logo)}" alt="">` : ''}<div><div class="nm">${esc(T(p.name))}</div>${T(p.category) ? `<small>${esc(T(p.category))}</small>` : ''}</div></div>
      <div class="rich" style="margin-top:8px">${safeHtml(T(p.description))}</div>
      ${p.address ? `<div class="kv"><span class="k">${icon('map-pin')}</span><span class="v" style="font-weight:400;font-size:14px">${esc(p.address)}</span></div>` : ''}
      <div class="acts">${p.phone ? `<a class="btn" href="${telHref(p.phone)}">${icon('phone')}${U('call')}</a>` : ''}
        ${p.phone ? `<a class="btn ghost" href="${waHref(p.phone)}" target="_blank" rel="noopener">${icon('brand-whatsapp')}WhatsApp</a>` : ''}
        ${p.email ? `<a class="btn ghost" href="mailto:${esc(p.email)}">${icon('mail')}${U('email')}</a>` : ''}
        ${p.url ? `<a class="btn ghost" href="${esc(p.url)}" target="_blank" rel="noopener">${icon('world')}${U('website')}</a>` : ''}</div></div>`;
  }).join('')}</div>` || `<p class="empty">—</p>`;
}

// --- Digicode
function digicodeView(m) {
  return `<div class="cards narrow">${(m.items || []).map(d => `<div class="card" style="text-align:center"><h3>${esc(T(d.title))}</h3>
    <div class="keypad">${[...String(d.code)].map(ch => `<span>${esc(ch)}</span>`).join('')}</div>
    ${T(d.description) ? `<div class="rich">${safeHtml(T(d.description))}</div>` : ''}
    <div class="acts"><button class="btn ghost" data-copy="${esc(d.code)}">${icon('copy')}${U('copy')}</button></div></div>`).join('')}</div>`;
}

// --- Wifi
function wifiView(m) {
  return `<div class="cards narrow">${(m.items || []).map(w => `<div class="card">
    <div class="kv"><span class="k">${U('network')}</span><span class="v">${esc(w.ssid)}</span><button data-copy="${esc(w.ssid)}">${icon('copy')}</button></div>
    ${w.password ? `<div class="kv"><span class="k">${U('password')}</span><span class="v">${esc(w.password)}</span><button data-copy="${esc(w.password)}">${icon('copy')}${U('copy')}</button></div>` : ''}
    ${w.qr ? `<div class="qrbox"><div data-qr="${esc(wifiPayload(w.ssid, w.password))}"></div><small>${U('scanWifi')}</small></div>` : ''}
    ${T(w.description) ? `<div class="rich">${safeHtml(T(w.description))}</div>` : ''}</div>`).join('')}</div>`;
}
let qrP = null;
function loadQr() {
  if (window.QRCodeStyling) return Promise.resolve();
  if (!qrP) qrP = new Promise((res, rej) => { const s = document.createElement('script'); s.src = 'assets/vendor/qr-code-styling.js'; s.onload = res; s.onerror = rej; document.head.appendChild(s); });
  return qrP;
}
async function drawQr(el) {
  await loadQr();
  const qr = new window.QRCodeStyling({ width: 400, height: 400, type: 'canvas', data: el.dataset.qr, margin: 0,
    dotsOptions: { type: 'rounded', color: '#1f2937' }, cornersSquareOptions: { type: 'extra-rounded', color: '#1f2937' }, backgroundOptions: { color: '#ffffff' } });
  el.innerHTML = '';
  qr.append(el);
}

// --- Livre d'or
function guestbookView(m) {
  const msg = T(m.message) ? `<div class="card"><div class="rich">${safeHtml(T(m.message))}</div></div>` : '';
  const can = m.form !== false;
  const form = can ? `<div class="card"><h3>${U('guestbookTitle')}</h3>
    <label class="field">${U('yourName')}<input id="gb-name" maxlength="60" autocomplete="given-name"></label>
    <div class="field">${U('rating')}<div class="stars-in" id="gb-stars">${[1, 2, 3, 4, 5].map(i => `<button data-star="${i}" class="on" aria-label="${i}">${icon('star-filled')}</button>`).join('')}</div></div>
    <label class="field">${U('yourMessage')}<textarea id="gb-msg" maxlength="2000"></textarea></label>
    <button class="btn" data-act="gb-send" style="width:100%">${icon('send')}${U('send')}</button><p id="gb-ok" style="text-align:center"></p></div>` : '';
  const rev = m.showReviews !== false && backendUrl() ? `<div class="card"><h3>${U('reviews')}</h3><div id="gb-list"><p class="empty">…</p></div></div>` : '';
  return msg + form + rev;
}
async function loadReviews() {
  const el = document.getElementById('gb-list');
  if (!el || !backendUrl()) return;
  try {
    const r = await fetch(backendUrl() + '?action=guestbook.public');
    const d = await r.json();
    const list = d.reviews || [];
    el.innerHTML = list.length ? list.map(x => `<div class="review"><div class="who"><span>${esc(x.name)}</span><span class="stars">${'★'.repeat(x.rating || 0)}</span></div><p>${esc(x.message)}</p><small>${esc((x.date || '').slice(0, 10))}</small></div>`).join('') : `<p class="empty">${U('noReviews')}</p>`;
  } catch (e) { el.innerHTML = `<p class="empty">${U('noReviews')}</p>`; }
}
async function sendReview() {
  const name = document.getElementById('gb-name').value.trim();
  const message = document.getElementById('gb-msg').value.trim();
  const rating = document.querySelectorAll('#gb-stars .on').length;
  const out = document.getElementById('gb-ok');
  if (!name || !message) { document.getElementById(name ? 'gb-msg' : 'gb-name').focus(); return; }
  if (PREVIEW) { out.textContent = U('thanks'); return; }
  if (!backendUrl()) {
    // Sans serveur : on prépare un e-mail pour l'hôte.
    const to = B.contact?.email || '';
    location.href = `mailto:${to}?subject=${encodeURIComponent('Livre d’or — ' + T(B.property.title))}&body=${encodeURIComponent(`${name} (${rating}/5)\n\n${message}`)}`;
    return;
  }
  try {
    await post({ action: 'guestbook.add', name, message, rating, lang });
    out.textContent = U('thanks');
    document.getElementById('gb-msg').value = '';
  } catch (e) { out.textContent = U('sendError'); }
}

// --- Assistant IA
function assistantOn() { return B.assistant?.enabled && !!backendUrl(); }
function assistantView() {
  const a = B.assistant || {};
  const logo = media(B.branding.logo);
  const sugg = (tx(a.suggestions, lang, B.languages.primary) || []);
  const greet = T(a.greeting) || '';
  const body = `<div class="ahead">${logo ? `<img src="${esc(logo)}" alt="">` : `<span class="ai">${icon('sparkles', '', 26)}</span>`}<div><b>${esc(a.name || U('search'))}</b><small>${esc(T(B.property.title))}</small></div></div>
    <div class="chat" id="chat">
      ${assistantOn() ? `<div class="bub a">${esc(greet)}</div>` : `<div class="bub a">${U('assistantOff')}</div>`}
      ${assistantOn() && !chat.length && Array.isArray(sugg) && sugg.length ? `<div class="sugg">${sugg.map(s => `<button data-ask="${esc(s)}">${esc(s)}</button>`).join('')}</div>` : ''}
      ${chat.map(c => `<div class="bub ${c.role === 'user' ? 'u' : 'a'}">${esc(c.content)}</div>`).join('')}
    </div>
    ${assistantOn() ? `<form class="composer" id="composer"><input id="ask" placeholder="${esc(U('assistantPh'))}" autocomplete="off" maxlength="500"><button aria-label="${esc(U('send'))}">${icon('send')}</button></form>` : ''}`;
  return `<div class="page"><div class="pbody" style="margin:0;border-radius:0;padding-top:20px">${body}</div></div>`;
}
function scrollChat() { window.scrollTo(0, document.body.scrollHeight); }
async function ask(q) {
  q = (q || '').trim();
  if (!q) return;
  chat.push({ role: 'user', content: q });
  render();
  const box = document.getElementById('chat');
  box.insertAdjacentHTML('beforeend', `<div class="bub a wait" id="wait">${U('thinking')}</div>`);
  scrollChat();
  track('assistant');
  try {
    if (PREVIEW) throw new Error('preview');
    const d = await post({ action: 'assistant.ask', question: q, lang, history: chat.slice(-8, -1) });
    chat.push({ role: 'assistant', content: d.answer || U('assistantErr') });
  } catch (e) {
    chat.push({ role: 'assistant', content: PREVIEW ? '(Aperçu : l’assistant répond une fois le livret publié et le serveur configuré.)' : U('assistantErr') });
  }
  render();
}

// ---------------------------------------------------------------- barre basse, menu, pop-ups
function navbar(r) {
  if (B.theme.navBar?.enabled === false) return '';
  const logo = media(B.branding.logo);
  const where = !r.length ? 'home' : r[0];
  const nb = active().some(m => m.type === 'nearby');
  return `<nav class="navbar">
    ${B.branding.logoEnabled && logo && B.theme.navBar?.logoInside !== false ? `<button class="logo" data-act="welcome" aria-label="${esc(B.property.hostName || 'Logo')}"><img src="${esc(logo)}" alt=""></button>` : ''}
    <button class="${where === 'home' || where === 'm' ? 'on' : ''}" data-go="#/" aria-label="${esc(U('home'))}">${icon('home')}</button>
    ${nb ? `<button class="${where === 'map' ? 'on' : ''}" data-go="#/map" aria-label="${esc(U('map'))}">${icon('map')}</button>` : ''}
    ${assistantOn() ? `<button class="${where === 'assistant' ? 'on' : ''} ${chat.length ? '' : 'dot'}" data-go="#/assistant" aria-label="${esc(U('search'))}">${icon('sparkles')}</button>` : ''}
  </nav>`;
}

function overlay(html, cls) {
  closeOverlays();
  document.body.insertAdjacentHTML('beforeend', `<div class="veil" data-act="close"></div>${html}`);
  requestAnimationFrame(() => { document.querySelector('.veil').classList.add('on'); document.querySelector('.' + cls)?.classList.add('on'); });
}
function closeOverlays() {
  document.querySelectorAll('.veil,.drawer,.sheet,.modal,.viewer').forEach(n => n.remove());
}

function openMenu() {
  const p = B.property;
  const menuC = B.theme.menu?.contacts !== false ? contactList() : [];
  overlay(`<aside class="drawer">
    <div class="dh"><button class="dx" data-act="close" aria-label="${esc(U('close'))}">${icon('x')}</button>
      ${!p.hostNameHidden && p.hostName ? `<b>${esc(p.hostName)}</b>` : ''}<small>${esc(T(p.title))}</small><br>
      <button class="selbtn" data-act="lang">${flag(lang, 20)} ${lang.toUpperCase()} ${icon('chevron-down', '', 16)}</button></div>
    <div class="db"><h4>${U('allInfo')}</h4><div class="mlist">
      ${active().map(m => `<button data-go="#/m/${m.id}"><span class="ib">${icon(m.icon)}</span><span>${esc(T(m.title))}</span>${icon('chevron-right', '', 18)}</button>`).join('')}
    </div>
    ${menuC.length ? `<h4>${U('contactUs')}</h4><div class="contacts-row" style="justify-content:flex-start">${menuC.map(x => `<a href="${esc(x.href)}" target="_blank" rel="noopener" aria-label="${esc(x.l)}">${icon(x.ic)}</a>`).join('')}</div>` : ''}</div>
    ${B.theme.menu?.download !== false ? `<div class="df"><button class="dl-btn" data-act="install">${icon('download')}${U('download')}</button></div>` : ''}
  </aside>`, 'drawer');
}

function openLang() {
  const langs = [B.languages.primary, ...B.languages.secondary];
  overlay(`<div class="sheet"><h4>${U('language')}</h4><div class="langs">${langs.map(l => `<button class="${l === lang ? 'on' : ''}" data-lang="${l}">${flag(l, 22)} ${LANGS[l]?.name || l}</button>`).join('')}</div></div>`, 'sheet');
}
function setLang(l) {
  lang = l;
  localStorage.setItem('livret-lang', l);
  apply();
  const wasWelcome = !!document.querySelector('.wbox');
  render();
  if (wasWelcome) showWelcome(true);
}

function openGo() {
  const a = home();
  const dest = a.lat != null ? `${a.lat},${a.lng}` : encodeURIComponent(a.full || '');
  const label = [a.displayed || a.full, T(a.complement)].filter(Boolean).join(' — ');
  overlay(`<div class="sheet"><h4>${U('goHome')}</h4><p class="addr">${esc(label)}</p><div class="sa">
    <a href="https://www.google.com/maps/dir/?api=1&destination=${dest}" target="_blank" rel="noopener">${icon('map-2')}Google Maps</a>
    <a href="https://waze.com/ul?${a.lat != null ? `ll=${dest}` : `q=${dest}`}&navigate=yes" target="_blank" rel="noopener">${icon('navigation')}Waze</a>
    <a href="https://maps.apple.com/?daddr=${dest}" target="_blank" rel="noopener">${icon('map')}Plans (Apple)</a>
    <button data-copy="${esc([a.full, T(a.complement)].filter(Boolean).join(', '))}">${icon('copy')}${U('copyAddress')}</button>
    <button data-act="close">${icon('x')}${U('cancel')}</button></div></div>`, 'sheet');
}

function maybeWelcome() {
  const w = B.welcome || {};
  if (!w.enabled || !T(w.html)) return;
  const k = 'livret-welcome', last = +localStorage.getItem(k) || 0, hrs = w.reshowHours ?? -1;
  if (last && (hrs < 0 || Date.now() - last < hrs * 3600e3)) return;
  localStorage.setItem(k, Date.now());
  showWelcome();
}
function showWelcome(force) {
  const w = B.welcome || {};
  if (!force && !w.enabled) return;
  const logo = B.branding.avatarEnabled && B.branding.avatar ? media(B.branding.avatar) : '';
  const name = !B.property.hostNameHidden && B.property.hostName ? B.property.hostName : '';
  const head = `<div class="wh">${w.showAvatar !== false && logo ? `<img src="${esc(logo)}" alt="">` : ''}${w.showName !== false && name ? `<b>${esc(name)}</b>` : ''}</div>`;
  const langs = [B.languages.primary, ...B.languages.secondary];
  const foot = (w.showLanguage !== false || w.showDownload !== false) ? `<div class="wf">
    ${w.showLanguage !== false && langs.length > 1 ? `<label>${U('language')}</label><select id="wlang">${langs.map(l => `<option value="${l}" ${l === lang ? 'selected' : ''}>${LANGS[l]?.name || l}</option>`).join('')}</select>` : ''}
    ${w.showDownload !== false ? `<button class="wdl" data-act="install">${icon('download')}${U('download')}</button>` : ''}</div>` : '';
  closeOverlays();
  document.body.insertAdjacentHTML('beforeend', `<div class="modal" data-act="close-self"><div class="wbox" role="dialog" aria-modal="true">
    <button class="wx" data-act="close" aria-label="${esc(U('close'))}">${icon('x')}</button>
    ${w.signaturePosition !== 'bottom' ? head : ''}<div class="rich">${safeHtml(T(w.html))}</div>${w.signaturePosition === 'bottom' ? head : ''}${foot}</div></div>`);
  const sel = document.getElementById('wlang');
  if (sel) sel.onchange = () => setLang(sel.value);
}

async function install() {
  const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone;
  if (standalone) return toast(U('installDone'));
  if (installEvt) { installEvt.prompt(); installEvt = null; return; }
  if (/iphone|ipad|ipod/i.test(navigator.userAgent)) return toast(U('installIos'), 6000);
  toast(U('installIos').replace(/^[^:]*:\s*/, ''), 5000);
}

function toast(msg, ms = 1800) {
  let t = document.querySelector('.toast');
  if (!t) { t = document.createElement('div'); t.className = 'toast'; document.body.appendChild(t); }
  t.textContent = msg; t.classList.add('on');
  clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('on'), ms);
}
async function copy(text) {
  try { await navigator.clipboard.writeText(text); }
  catch (e) { const ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove(); }
  toast(U('copied'));
}

// ---------------------------------------------------------------- serveur (statistiques, livre d'or, assistant)
function visitor() {
  let v = localStorage.getItem('livret-visitor');
  if (!v) { v = Math.random().toString(36).slice(2) + Date.now().toString(36); localStorage.setItem('livret-visitor', v); }
  return v;
}
function track(event, module = '') {
  if (PREVIEW || !backendUrl()) return;
  if ((event === 'open' || event === 'scan') && sessionStorage.getItem('livret-' + event)) return;
  if (event === 'open' || event === 'scan') sessionStorage.setItem('livret-' + event, '1');
  const body = JSON.stringify({ action: 'track', event, module, lang, visitor: visitor() });
  try { navigator.sendBeacon(backendUrl(), new Blob([body], { type: 'text/plain' })); } catch (e) { /* statistiques facultatives */ }
}
async function post(payload) {
  const r = await fetch(backendUrl(), { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ ...payload, visitor: visitor() }) });
  const d = await r.json();
  if (d.error) throw new Error(d.error);
  return d;
}

// ---------------------------------------------------------------- événements
document.addEventListener('click', e => {
  const t = e.target.closest('[data-act],[data-go],[data-lang],[data-copy],[data-view],[data-sub],[data-star],[data-ask],[data-zoom]');
  if (!t) return;
  if (t.dataset.go) { e.preventDefault(); closeOverlays(); location.hash = t.dataset.go; return; }
  if (t.dataset.lang) { setLang(t.dataset.lang); return; }
  if (t.dataset.copy != null) { copy(t.dataset.copy); return; }
  if (t.dataset.view) { sessionStorage.setItem('nb-view', t.dataset.view); render(); return; }
  if (t.dataset.sub != null && t.dataset.cat) { sessionStorage.setItem('nb-sub-' + t.dataset.cat, t.dataset.sub); render(); return; }
  if (t.dataset.star) { const n = +t.dataset.star; document.querySelectorAll('#gb-stars button').forEach((b, i) => b.classList.toggle('on', i < n)); return; }
  if (t.dataset.ask) { ask(t.dataset.ask); return; }
  if (t.dataset.zoom != null) { document.body.insertAdjacentHTML('beforeend', `<div class="viewer" data-act="close"><img src="${esc(t.src)}" alt=""><button aria-label="${esc(U('close'))}">${icon('x', '', 28)}</button></div>`); return; }
  switch (t.dataset.act) {
    case 'menu': openMenu(); break;
    case 'lang': openLang(); break;
    case 'close': closeOverlays(); break;
    case 'close-self': if (e.target === t) closeOverlays(); break;
    case 'go': openGo(); break;
    case 'welcome': showWelcome(true); break;
    case 'install': install(); break;
    case 'gb-send': sendReview(); break;
  }
});
document.addEventListener('submit', e => {
  if (e.target.id === 'composer') { e.preventDefault(); const i = document.getElementById('ask'); ask(i.value); }
});
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeOverlays(); });

boot();
