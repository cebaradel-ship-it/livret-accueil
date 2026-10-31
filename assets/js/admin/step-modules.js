// Étape 2 — Vos modules : liste, ordre, et éditeur de chaque type de module.
import { S, getP } from './state.js';
import { text, toggle, select, choices, imgField, rte, mediaField, iconField, esc, icon, src } from './ui.js';
import { tx, uid } from '../core.js';

const T = o => tx(o, 'fr', S.D.languages.primary);
const mIndex = id => S.D.modules.findIndex(m => m.id === id);

export const MODULE_TYPES = [
  { type: 'welcome', icon: 'message-heart', title: { fr: 'Mot d’accueil', en: 'Welcome message', es: 'Mensaje de bienvenida', de: 'Willkommensgruß', it: 'Messaggio di benvenuto' }, single: true, desc: 'Le message affiché à l’ouverture du livret.' },
  { type: 'info', icon: 'list-details', title: { fr: 'Infos', en: 'Information', es: 'Información', de: 'Informationen', it: 'Informazioni' }, desc: 'Un module avec des catégories et des fiches (comme Infos arrivée).' },
  { type: 'nearby', icon: 'map-2', title: { fr: 'Autour de moi', en: 'Around me', es: 'Alrededor', de: 'In der Nähe', it: 'Nei dintorni' }, single: true, desc: 'Vos bonnes adresses sur une carte.' },
  { type: 'contacts', icon: 'address-book', title: { fr: 'Numéros utiles', en: 'Useful numbers', es: 'Números útiles', de: 'Nützliche Nummern', it: 'Numeri utili' }, desc: 'Médecin, pharmacie, urgences…' },
  { type: 'partners', icon: 'heart-handshake', title: { fr: 'Conciergerie', en: 'Concierge', es: 'Conserjería', de: 'Concierge', it: 'Concierge' }, desc: 'Vos partenaires et services.' },
  { type: 'digicode', icon: 'calculator', title: { fr: 'Digicode', en: 'Door code', es: 'Código', de: 'Türcode', it: 'Codice' }, desc: 'Codes d’accès (portail, porte, boîte à clés).' },
  { type: 'wifi', icon: 'wifi', title: { fr: 'Wifi', en: 'Wi-Fi', es: 'Wifi', de: 'WLAN', it: 'Wi-Fi' }, desc: 'Réseau, mot de passe et QR code de connexion.' },
  { type: 'guestbook', icon: 'book', title: { fr: 'Livre d’or', en: 'Guestbook', es: 'Libro de visitas', de: 'Gästebuch', it: 'Libro degli ospiti' }, single: true, desc: 'Les voyageurs vous laissent un mot.' },
  { type: 'custom', icon: 'file-text', title: { fr: 'Page libre', en: 'Page', es: 'Página', de: 'Seite', it: 'Pagina' }, desc: 'Une page de texte, photos et vidéos.' },
];

export function newModule(type) {
  const meta = MODULE_TYPES.find(t => t.type === type);
  const m = { id: uid('m'), type, active: true, title: { ...meta.title }, icon: meta.icon, image: '' };
  if (type === 'info') m.categories = [];
  if (type === 'nearby') Object.assign(m, { categories: [], places: [] });
  if (['contacts', 'partners', 'digicode', 'wifi'].includes(type)) m.items = [];
  if (type === 'guestbook') Object.assign(m, { message: {}, form: true, showReviews: true });
  if (type === 'custom') Object.assign(m, { html: {}, media: [] });
  return m;
}

export function modulesView() {
  if (S.edit?.mod && mIndex(S.edit.mod) >= 0) return moduleEditor();
  S.edit = null;
  return `<div class="intro"><div class="big">🧩</div><div><h2>Deuxième étape, <b>vos modules !</b></h2>
    <div class="muted">Cliquez sur un module pour le remplir. <b>Violet</b> = actif et visible ; <b>jaune</b> = désactivé (contenu conservé mais masqué).</div></div></div>
    <h2>Vos modules</h2><p class="muted" style="margin-top:0">${S.D.modules.filter(m => m.active).length} modules actifs sur ${S.D.modules.length}</p>
    <div class="card"><div class="mods">
      ${S.D.modules.map(m => `<button class="mod ${m.active ? '' : 'off'}" data-open-mod="${m.id}">${icon(m.icon)}${esc(T(m.title))}${m.active ? '' : '<small>désactivé</small>'}</button>`).join('')}
      <button class="mod add" data-act="mod-add">${icon('plus')}Ajouter un module</button>
    </div></div>
    <div class="card" style="text-align:center"><button class="b teal" data-act="mod-order">${icon('arrows-sort')} Changer l’ordre</button></div>`;
}

// ---------------------------------------------------------------- éditeur de module
function moduleEditor() {
  const mi = mIndex(S.edit.mod), m = S.D.modules[mi], P = `modules.${mi}`;
  const crumb = `<div class="crumb"><button data-act="back-mods">${icon('chevron-left', '', 16)} Vos modules</button>${S.edit.cat ? ` › <button data-act="back-mod">${esc(T(m.title))}</button>` : ''}</div>`;
  const head = `<div style="display:flex;align-items:center;gap:12px;margin-bottom:12px">${icon(m.icon, '', 34)}<div style="flex:1"><h2 style="margin:0">${esc(T(m.title))}</h2><span class="muted">Ce module est ${m.active ? '<b style="color:var(--teal)">actif</b>' : '<b style="color:var(--yellow)">désactivé</b>'}</span></div>
    <button class="b sm" data-act="mod-custom">${icon('settings')} Personnalisation</button></div>`;
  let body = '';
  switch (m.type) {
    case 'welcome': body = welcomeEd(); break;
    case 'info': body = S.edit.cat ? categoryEd(m, P) : infoEd(m, P); break;
    case 'nearby': body = nearbyEd(m, P); break;
    case 'contacts': body = itemsEd(P, m, contactItem, { label: 'un numéro', blank: { name: {}, phone: '', whatsapp: '', photo: '', description: {} }, title: it => T(it.name) || 'Nouveau contact', sub: it => it.phone, thumb: it => it.photo, intro: 'Les numéros d’urgence (15, 17, 18, 112) s’affichent automatiquement en haut de ce module : réglez-les dans <a href="#" data-goto="settings:emergency">Paramétrage › Contacts d’urgence</a>.' }); break;
    case 'partners': body = itemsEd(P, m, partnerItem, { label: 'un partenaire', blank: { name: {}, category: {}, phone: '', email: '', url: '', address: '', logo: '', description: {} }, title: it => T(it.name) || 'Nouveau partenaire', sub: it => T(it.category), thumb: it => it.logo }); break;
    case 'digicode': body = itemsEd(P, m, digicodeItem, { label: 'un code', blank: { title: {}, code: '', description: {} }, title: it => T(it.title) || 'Nouveau code', sub: it => it.code }); break;
    case 'wifi': body = itemsEd(P, m, wifiItem, { label: 'un réseau', blank: { ssid: '', password: '', qr: true, description: {} }, title: it => it.ssid || 'Nouveau réseau', sub: it => it.password ? '••••••' : '' }); break;
    case 'guestbook': body = guestbookEd(P); break;
    case 'custom': body = `<div class="card">${rte(P + '.html', 'Contenu de la page')}${mediaField(P + '.media')}</div>`; break;
  }
  const foot = S.edit.cat ? '' : `<div class="card" style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap">
    <div><b>${m.active ? 'Désactiver' : 'Activer'} le module</b><div class="muted">${m.active ? 'Le module ne sera plus visible sur le livret mais son contenu sera conservé.' : 'Le module redevient visible sur le livret.'}</div></div>
    <button class="b ${m.active ? 'yellow' : 'teal'}" data-act="mod-toggle">${icon(m.active ? 'eye-off' : 'eye')} ${m.active ? 'Désactiver' : 'Activer'}</button></div>
    <div class="card" style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap"><div><b>Supprimer le module</b><div class="muted">Toutes les informations enregistrées dans ce module seront perdues.</div></div>
    <button class="b red" data-act="mod-delete">${icon('trash')} Supprimer</button></div>`;
  return crumb + head + body + foot;
}

// Fenêtre « Personnalisation du module » (titre, icône, image du bandeau).
export function moduleCustomDialogHtml() {
  const mi = mIndex(S.edit.mod), P = `modules.${mi}`;
  return `<h3>Personnalisation du module</h3>${text(P + '.title', 'Titre du module', { tr: true })}
    <div class="grid2">${iconField(P + '.icon')}${imgField(P + '.image', 'Image du bandeau (en haut de la page du module)')}</div>
    <div class="acts"><button class="b violet" data-close-dlg>Terminé</button></div>`;
}

function welcomeEd() {
  const freq = [[0, 'Chaque visite'], [1, '1 heure'], [3, '3 heures'], [5, '5 heures'], [12, '12 heures'], [24, '24 heures'], [48, '48 heures'], [-1, 'Une seule fois']];
  return `<div class="sec-title">Votre mot d’accueil</div><p class="sec-sub">Accueillez votre voyageur comme il se doit. Un petit mot d’accueil fait toujours plaisir.</p>
    <div class="card">${rte('welcome.html', 'Mot d’accueil')}</div>
    <div class="card"><h3>Affichage dans le livret</h3>${toggle('welcome.enabled', 'Afficher le mot d’accueil en pop-up à l’ouverture du livret')}</div>
    <div class="card"><h3>Fréquence d’affichage</h3><p class="muted">Quand le pop-up de bienvenue réapparaît-il pour vos voyageurs ?</p>
      ${choices('welcome.reshowHours', freq.map(([v, label]) => ({ v, label })), { kind: 'num' })}
      <button class="b sm violet" data-act="test-popup">${icon('refresh')} Tester le pop-up</button></div>`;
}

// --- modules « infos »
function infoEd(m, P) {
  return `<div class="sec-title">Catégories d’informations</div>
    <p class="sec-sub">Une catégorie regroupe des fiches (ex. « Parking », « Clés », « Règlement intérieur »). Les catégories <b>vertes</b> sont visibles ; les grises n’ont pas encore de fiche.</p>
    <div class="cats-grid">${(m.categories || []).map((c, ci) => {
      const n = (c.records || []).filter(r => r.active !== false).length;
      const on = c.active !== false && (n || c.redirect);
      return `<button class="catb ${on ? 'on' : ''} ${c.id.startsWith('c') ? 'custom' : ''}" data-open-cat="${c.id}">${icon(c.icon)}<span><b>${esc(T(c.title))}</b><small>${c.redirect ? 'Redirection' : n + ' information' + (n > 1 ? 's' : '')}${c.active === false ? ' · masquée' : ''}</small></span></button>`;
    }).join('')}
      <button class="catb" data-act="cat-add" style="border:2px dashed var(--line)">${icon('plus')}<span><b>Ajouter une catégorie</b></span></button></div>
    <div class="card" style="text-align:center;margin-top:14px"><button class="b teal" data-act="cat-order">${icon('arrows-sort')} Changer l’ordre des catégories</button></div>`;
}

function categoryEd(m, P) {
  const ci = (m.categories || []).findIndex(c => c.id === S.edit.cat);
  if (ci < 0) { S.edit.cat = null; return infoEd(m, P); }
  const c = m.categories[ci], CP = `${P}.categories.${ci}`;
  const recs = c.records || [];
  return `<div class="card"><div style="display:flex;gap:12px;align-items:center">${icon(c.icon, '', 34)}<h3 style="margin:0;flex:1">${esc(T(c.title))}</h3>
      <button class="b sm danger" data-act="cat-delete">${icon('trash')} Supprimer cette catégorie</button></div></div>
    <details class="acc"${recs.length ? '' : ' open'}><summary>${icon('settings')} Personnaliser la catégorie</summary><div>
      ${text(CP + '.title', 'Titre de la catégorie', { tr: true })}
      <div class="grid2">${iconField(CP + '.icon', 'Icône / Photo de la catégorie')}${imgField(CP + '.image', 'Image du bandeau (facultatif)')}</div>
      ${rte(CP + '.description', 'Description de la catégorie (facultatif)')}
      ${toggle(CP + '.active', 'Catégorie visible dans le livret')}
      ${text(CP + '.redirect', 'Transformer en redirection (facultatif)', { ph: 'https://…', hint: 'Si un lien est indiqué, la catégorie ouvre directement ce lien au lieu des fiches.' })}
    </div></details>
    <div class="sec-title">Vos informations (${recs.length})</div><p class="sec-sub">Ajoutez les informations utiles, avec des images (png, jpg) ou des documents (pdf, word).</p>
    <div class="list" data-sortable="${CP}.records">${recs.map((r, ri) => `<details class="acc" data-sort-item ${S.edit.rec === r.id ? 'open' : ''} data-rec="${r.id}">
      <summary><span class="grip">${icon('grip-vertical')}</span>${esc(T(r.title) || 'Nouvelle information')}${r.active === false ? ' <span class="tag">masquée</span>' : ''}</summary><div>
      ${text(`${CP}.records.${ri}.title`, 'Titre', { tr: true })}
      ${rte(`${CP}.records.${ri}.html`, 'Description')}
      ${mediaField(`${CP}.records.${ri}.media`)}
      <div style="display:flex;justify-content:space-between;align-items:center">${toggle(`${CP}.records.${ri}.active`, 'Visible')}<button class="b sm danger" data-del="${CP}.records" data-i="${ri}">${icon('trash')} Supprimer l’information</button></div>
      </div></details>`).join('')}</div>
    <button class="b violet" data-add-rec="${CP}.records" style="margin-top:12px">${icon('plus')} Ajouter une info</button>`;
}

// --- listes génériques (numéros, partenaires, codes, wifi)
function itemsEd(P, m, renderItem, o) {
  const items = m.items || [];
  return `${o.intro ? `<div class="banner info"><span>ℹ️</span><span class="grow">${o.intro}</span></div>` : ''}
    <div class="list" data-sortable="${P}.items">${items.map((it, i) => `<details class="acc" data-sort-item ${S.edit.item === i ? 'open' : ''}>
      <summary><span class="grip">${icon('grip-vertical')}</span>${o.thumb && o.thumb(it) ? `<img class="th" src="${esc(src(o.thumb(it)))}" alt="" style="width:30px;height:30px;border-radius:8px;object-fit:cover">` : ''}<span style="flex:1">${esc(o.title(it))}${o.sub && o.sub(it) ? ` <small class="muted">· ${esc(o.sub(it))}</small>` : ''}</span></summary>
      <div>${renderItem(`${P}.items.${i}`, it)}<div style="text-align:right"><button class="b sm danger" data-del="${P}.items" data-i="${i}">${icon('trash')} Supprimer</button></div></div></details>`).join('')}</div>
    <button class="b violet" data-add-item="${P}.items" data-blank='${esc(JSON.stringify(o.blank))}' style="margin-top:12px">${icon('plus')} Ajouter ${o.label}</button>`;
}
const contactItem = (p) => `${text(p + '.name', 'Nom (et adresse)', { tr: true })}<div class="grid2">${text(p + '.phone', 'Téléphone', { type: 'tel', ph: '+33…' })}${text(p + '.whatsapp', 'WhatsApp (facultatif)', { type: 'tel' })}</div>
  ${imgField(p + '.photo', 'Photo / logo', { max: 600 })}${rte(p + '.description', 'Description (facultatif)')}`;
const partnerItem = (p) => `${text(p + '.name', 'Nom', { tr: true })}${text(p + '.category', 'Catégorie (ex. Services, Ménage, Location de bateau)', { tr: true })}
  <div class="grid2">${text(p + '.phone', 'Téléphone', { type: 'tel' })}${text(p + '.email', 'E-mail', { type: 'email' })}${text(p + '.url', 'Site web', { type: 'url', ph: 'https://' })}${text(p + '.address', 'Adresse')}</div>
  ${imgField(p + '.logo', 'Logo', { max: 600 })}${rte(p + '.description', 'Présentation')}`;
const digicodeItem = (p) => `<div class="grid2">${text(p + '.title', 'Nom du code (ex. Portail, Boîte à clés)', { tr: true })}${text(p + '.code', 'Code')}</div>${rte(p + '.description', 'Explications (facultatif)')}`;
const wifiItem = (p) => `<div class="grid2">${text(p + '.ssid', 'Nom du réseau (SSID)')}${text(p + '.password', 'Mot de passe')}</div>${toggle(p + '.qr', 'Afficher un QR code pour se connecter automatiquement')}${rte(p + '.description', 'Informations complémentaires (facultatif)')}`;

function guestbookEd(P) {
  return `<div class="card">${rte(P + '.message', 'Message d’introduction du livre d’or')}</div>
    <div class="card">${toggle(P + '.form', 'Les voyageurs peuvent laisser un message')}${toggle(P + '.showReviews', 'Afficher les messages validés dans le livret')}
      <p class="muted">Les messages reçus arrivent par e-mail et se valident dans l’onglet <a href="#" data-goto="reviews">Avis livre d’or</a> (serveur requis, voir Paramétrage › Publication &amp; serveur).</p></div>`;
}

// --- Autour de moi
function nearbyEd(m, P) {
  const cats = m.categories || [];
  const places = m.places || [];
  return `<div class="card"><p class="muted" style="margin:0">Partagez vos bonnes adresses : restaurants, plages, activités, commerces… Elles s’affichent sur une carte interactive et en liste. Le <b>❤</b> met une adresse en avant dans « Coups de cœur ».</p></div>
    <div class="card"><h3>Adresse de votre logement</h3><p class="muted">Elle sert de point de départ (distances, carte, bouton « Me rendre au logement »). Elle se modifie dans <a href="#" data-goto="settings:home">Paramétrage › Mon hébergement</a> : <b>${esc(S.D.property.address.displayed || S.D.property.address.full || 'non renseignée')}</b></p></div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px">
      <button class="b violet" data-act="place-add">${icon('plus')} Ajouter une adresse</button>
      <button class="b" data-act="place-suggest">${icon('sparkles')} Suggestions autour du logement</button>
      <button class="b" data-act="nbcat-add">${icon('plus')} Ajouter une catégorie</button>
      <button class="b teal" data-act="nbcat-order">${icon('arrows-sort')} Réorganiser les catégories</button></div>
    ${places.some(p => p.favorite) ? `<details class="acc"><summary>${icon('heart-filled')} Vos coups de cœur <span class="tag">${places.filter(p => p.favorite).length} adresse(s)</span></summary><div class="list">${places.map((p, pi) => p.favorite ? placeRow(p, pi) : '').join('')}</div></details>` : ''}
    ${cats.map((c, ci) => {
      const list = places.map((p, pi) => [p, pi]).filter(([p]) => p.category === c.id);
      return `<details class="acc" ${S.edit.nbcat === c.id ? 'open' : ''} data-nbcat="${c.id}"><summary>${icon(c.icon)}<span style="flex:1">${esc(T(c.title))} <small class="muted">· ${(c.subs || []).length} sous-catégorie(s) · ${list.length} adresse(s)</small></span>
        <button class="b sm" data-nbcat-edit="${ci}" title="Modifier la catégorie">${icon('pencil')}</button></summary><div class="list">
        ${list.map(([p, pi]) => placeRow(p, pi)).join('') || '<p class="muted">Aucune adresse.</p>'}
        <button class="b sm" data-act="place-add" data-cat="${c.id}">${icon('plus')} Ajouter une adresse dans « ${esc(T(c.title))} »</button></div></details>`;
    }).join('')}`;
}
function placeRow(p, pi) {
  return `<div class="item ${p.active === false ? 'off' : ''}"><img class="th" src="${esc(src(p.photo) || 'assets/img/flags/fr.svg')}" alt="" style="${p.photo ? '' : 'opacity:.15'}">
    <span class="t">${p.favorite ? '❤ ' : ''}${esc(p.name)}<small>${esc(p.address || '')}</small></span>
    <button class="b sm" data-place="${pi}">${icon('pencil')} Modifier</button></div>`;
}

export function placeDialogHtml(mi, pi) {
  const P = `modules.${mi}.places.${pi}`;
  const m = S.D.modules[mi], p = m.places[pi];
  const cat = (m.categories || []).find(c => c.id === p.category);
  return `<h3>${esc(p.name || 'Nouvelle adresse')}</h3>
    <div class="grid2">${text(P + '.name', 'Nom de l’adresse')}
      ${select(P + '.category', 'Catégorie', (m.categories || []).map(c => [c.id, T(c.title)]))}
      ${select(P + '.sub', 'Sous-catégorie', [['', '—'], ...((cat?.subs || []).map(s => [s.id, T(s.title)]))], { hint: 'Les sous-catégories se gèrent avec le crayon de la catégorie.' })}
      <div>${toggle(P + '.favorite', '❤ Coup de cœur')}${toggle(P + '.active', 'Visible dans le livret')}</div></div>
    <label class="f"><span>Rechercher l’adresse</span><div style="display:flex;gap:8px"><input class="inp" id="geo-q" placeholder="Nom du lieu, rue, ville…" value="${esc(p.name)}"><button class="b sm violet" data-geo="${P}">${icon('search')} Chercher</button></div><div id="geo-res" class="list" style="margin-top:6px"></div></label>
    ${text(P + '.address', 'Adresse affichée')}
    <div class="grid2">${text(P + '.lat', 'Latitude', { type: 'number', kind: 'num', step: 'any' })}${text(P + '.lng', 'Longitude', { type: 'number', kind: 'num', step: 'any' })}</div>
    <div class="miniMap" data-pickmap="${P}"></div><div class="hint">Cliquez sur la carte ou déplacez le repère pour ajuster la position.</div>
    <div class="grid2" style="margin-top:12px">${text(P + '.phone', 'Téléphone', { type: 'tel' })}${text(P + '.website', 'Site web', { type: 'url', ph: 'https://' })}
      ${text(P + '.rating', 'Note Google (sur 5, facultatif)', { type: 'number', kind: 'num', step: '0.1' })}${text(P + '.mapsUrl', 'Lien Google Maps (facultatif)', { type: 'url' })}</div>
    ${text(P + '.type', 'Type (ex. Restaurant de poissons, Plage de sable fin)', { tr: true })}
    ${text(P + '.summary', 'Courte description', { tr: true, area: true, rows: 2 })}
    ${rte(P + '.remarks', 'Le conseil de l’hôte (facultatif)')}
    ${imgField(P + '.photo', 'Photo', { max: 1200 })}
    <div class="acts" style="justify-content:space-between"><button class="b danger" data-place-del="${pi}">${icon('trash')} Supprimer l’adresse</button><button class="b violet" data-close-dlg>Terminé</button></div>`;
}

export function nbCatDialogHtml(mi, ci) {
  const P = `modules.${mi}.categories.${ci}`;
  const c = S.D.modules[mi].categories[ci];
  return `<h3>Catégorie « ${esc(T(c.title))} »</h3>${text(P + '.title', 'Titre', { tr: true })}${iconField(P + '.icon')}
    <div class="lbl">Sous-catégories</div><div class="list">${(c.subs || []).map((s, si) => `<div class="item">${icon(s.icon)}<div class="t">${text(`${P}.subs.${si}.title`, '', { tr: true })}</div>
      <button class="b sm" data-icon-pick="${P}.subs.${si}.icon">${icon('pencil')}</button><button class="b sm danger" data-del="${P}.subs" data-i="${si}">${icon('trash')}</button></div>`).join('')}</div>
    <button class="b sm" data-add-item="${P}.subs" data-blank='${esc(JSON.stringify({ id: '', icon: c.icon, title: { fr: 'Nouvelle sous-catégorie' } }))}' style="margin-top:8px">${icon('plus')} Ajouter une sous-catégorie</button>
    <div class="acts" style="justify-content:space-between"><button class="b danger" data-nbcat-del="${ci}">${icon('trash')} Supprimer la catégorie</button><button class="b violet" data-close-dlg>Terminé</button></div>`;
}
