// Étape 3 — Partage : QR code, lien, message, aperçu du lien, affiches à imprimer.
import { S } from './state.js';
import { text, color, toggle, select, choices, imgField, esc, icon, src, flagsRow } from './ui.js';
import { LANGS, flag, tx, wifiPayload } from '../core.js';

export const SHARE_TABS = [['qr', 'QR Code'], ['link', 'Partage du livret'], ['seo', 'Configuration du partage'], ['print', 'Impression']];

export function siteUrl() {
  const g = S.cfg.github || {};
  const dom = (S.D.share?.domain || '').trim().replace(/^https?:\/\//, '').replace(/\/+$/, '');
  if (dom) return `https://${dom}/`;
  if (g.owner && g.repo) {
    const o = g.owner.toLowerCase();
    return g.repo.toLowerCase() === `${o}.github.io` ? `https://${o}.github.io/` : `https://${o}.github.io/${g.repo}/`;
  }
  return new URL('./', location.href).href;
}
export const qrUrl = () => siteUrl() + '?qr=1';

const DEFAULT_MSG = {
  fr: 'Bonjour 👋 Pour rendre votre séjour plus agréable, j’ai préparé un livret de bienvenue avec toutes les infos pratiques (WiFi, accès, bonnes adresses…) :',
  en: 'Hello 👋 To make your stay even more pleasant, I have prepared a welcome guide with all the practical information (Wi-Fi, access, good addresses…):',
  es: 'Hola 👋 Para que su estancia sea más agradable, he preparado una guía de bienvenida con toda la información práctica (WiFi, acceso, buenas direcciones…):',
  de: 'Hallo 👋 Damit Ihr Aufenthalt noch angenehmer wird, habe ich eine Willkommensmappe mit allen praktischen Infos (WLAN, Anreise, gute Adressen…) vorbereitet:',
  it: 'Ciao 👋 Per rendere il tuo soggiorno ancora più piacevole, ho preparato una guida di benvenuto con tutte le info pratiche (WiFi, accesso, buoni indirizzi…):',
};
export function shareMessage(lang) {
  return (S.D.share.message || {})[lang] || DEFAULT_MSG[lang] || DEFAULT_MSG.en;
}

export const QR_STYLES = {
  classic: { label: 'Classique', dots: 'square', cs: 'square', cd: 'square' },
  rounded: { label: 'Arrondi', dots: 'rounded', cs: 'extra-rounded', cd: 'dot' },
  dots: { label: 'Points', dots: 'dots', cs: 'dot', cd: 'dot' },
  hybrid: { label: 'Hybride', dots: 'classy-rounded', cs: 'square', cd: 'dot' },
  elegant: { label: 'Élégant', dots: 'classy', cs: 'extra-rounded', cd: 'square' },
  retro: { label: 'Rétro', dots: 'extra-rounded', cs: 'square', cd: 'square' },
};
export function makeQr(data, size = 600, o = S.D.share.qr, type = 'canvas') {
  const st = QR_STYLES[o.style] || QR_STYLES.classic;
  return new window.QRCodeStyling({
    width: size, height: size, type, data, margin: Math.round(size * 0.04), qrOptions: { errorCorrectionLevel: 'Q' },
    dotsOptions: { type: st.dots, color: o.color }, cornersSquareOptions: { type: st.cs, color: o.color }, cornersDotOptions: { type: st.cd, color: o.color },
    backgroundOptions: { color: o.transparent ? 'transparent' : (o.bg || '#ffffff') },
  });
}

export function shareView() {
  const tab = S.tab.share || 'qr';
  const body = { qr: qrTab, link: linkTab, seo: seoTab, print: printTab }[tab]();
  return `<div class="intro"><div class="big">📲</div><div><h2>Troisième étape, <b>le partage !</b></h2>
    <div class="muted">Votre livret est prêt : générez et personnalisez votre QR code, récupérez le lien ou partagez-le directement, imprimez une affiche à poser dans le logement.</div></div></div>
    ${S.cfg.github?.owner ? '' : `<div class="banner"><span>ℹ️</span><span class="grow">Le lien définitif du livret sera connu une fois la publication GitHub configurée (<a href="#" data-goto="settings:publish">Paramétrage › Publication &amp; serveur</a>). En attendant, le lien et le QR code pointent vers l’adresse actuelle.</span></div>`}
    <h2>Le partage</h2><div class="tabs">${SHARE_TABS.map(([k, l]) => `<button data-tab="share:${k}" class="${k === tab ? 'on' : ''}">${l}</button>`).join('')}</div>${body}`;
}

function qrTab() {
  const q = S.D.share.qr;
  return `<div class="sec-title">Créez votre QR code</div><p class="sec-sub">Choisissez la couleur et le style de votre QR code, puis téléchargez-le en haute définition.</p>
    <div class="card"><div style="display:flex;gap:22px;flex-wrap:wrap">
      <div class="qrprev" data-qrprev></div>
      <div style="flex:1;min-width:240px">${color('share.qr.color', 'Couleur du QR code')}
        ${toggle('share.qr.transparent', 'Fond transparent')}${q.transparent ? '' : color('share.qr.bg', 'Couleur de fond')}
        <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="b" data-act="qr-png">${icon('download')} Télécharger en PNG <small class="muted">HD</small></button><button class="b" data-act="qr-svg">${icon('download')} Télécharger en SVG <small class="muted">HD</small></button></div>
        <p class="muted">Le QR code ouvre : <code class="k">${esc(qrUrl())}</code></p></div></div>
      <div class="lbl" style="margin-top:14px">Style du QR code</div>
      ${choices('share.qr.style', Object.entries(QR_STYLES).map(([v, s]) => ({ v, label: s.label, icon: 'qrcode' })))}</div>`;
}

function linkTab() {
  const lang = S.tab.shareLang || S.D.languages.primary;
  const langs = [S.D.languages.primary, ...S.D.languages.secondary];
  const url = siteUrl();
  const msg = shareMessage(lang) + ' ' + url;
  const enc = encodeURIComponent;
  return `<div class="sec-title">Partagez votre livret</div><p class="sec-sub">Récupérez l’adresse de votre livret ou partagez-la directement.</p>
    <div class="card"><div class="lbl">Lien du livret</div><div class="copyline"><input class="inp" readonly value="${esc(url)}"><button class="b sm" data-copy="${esc(url)}">${icon('copy')} Copier</button><a class="b sm" href="${esc(url)}" target="_blank" rel="noopener">${icon('external-link')}</a></div>
      <div class="lbl">Lien du QR code <span class="muted">(compte les scans dans les statistiques)</span></div><div class="copyline"><input class="inp" readonly value="${esc(qrUrl())}"><button class="b sm" data-copy="${esc(qrUrl())}">${icon('copy')} Copier</button></div>
      <hr style="border:0;border-top:1px solid var(--line);margin:14px 0">
      <div class="lbl">${icon('link')} URL personnalisée <span class="muted">(facultatif)</span></div>
      ${text('share.domain', '', { ph: 'livret.casadilosari.fr', hint: 'Si vous possédez un nom de domaine, indiquez-le ici puis ajoutez chez votre registrar un enregistrement CNAME vers <b>' + esc((S.cfg.github?.owner || 'votre-compte').toLowerCase()) + '.github.io</b>. Le fichier CNAME est publié automatiquement.' })}</div>
    <div class="card"><h3>Message de partage</h3>
      ${text('share.message', '', { tr: true, area: true, rows: 3, max: 300, ph: DEFAULT_MSG.fr })}
      <p class="hint">Texte pré-rempli dans WhatsApp, SMS et e-mail ; l’adresse du livret est ajoutée à la fin. Laissez vide pour le message par défaut.</p>
      <div style="display:flex;gap:10px;align-items:center;margin:10px 0;flex-wrap:wrap"><span class="lbl" style="margin:0">Langue de partage</span>
        ${langs.map(l => `<button class="b sm ${l === lang ? 'violet' : ''}" data-share-lang="${l}">${flag(l, 16)} ${l.toUpperCase()}</button>`).join('')}
        <button class="b sm" data-copy="${esc(msg)}">${icon('copy')} Copier le message + lien</button></div>
      <div class="sharebtns">
        <a href="https://wa.me/?text=${enc(msg)}" target="_blank" rel="noopener">${icon('brand-whatsapp')} WhatsApp</a>
        <a href="sms:?&body=${enc(msg)}">${icon('message')} SMS</a>
        <a href="mailto:?subject=${enc(tx(S.D.property.title, lang))}&body=${enc(msg)}">${icon('mail')} Mail</a>
        <a href="https://www.facebook.com/sharer/sharer.php?u=${enc(url)}" target="_blank" rel="noopener">${icon('brand-facebook')} Facebook</a>
        <a href="fb-messenger://share?link=${enc(url)}">${icon('brand-messenger')} Messenger</a>
        <a href="https://www.linkedin.com/sharing/share-offsite/?url=${enc(url)}" target="_blank" rel="noopener">${icon('brand-linkedin')} LinkedIn</a></div></div>`;
}

function seoTab() {
  return `<div class="sec-title">Aperçu lors du partage</div><p class="sec-sub">Ces informations apparaissent quand vous partagez le lien sur WhatsApp, SMS, réseaux sociaux… (mises à jour à la publication).</p>
    <div class="card"><div class="grid2"><div>${imgField('share.meta.icon', 'Icône / logo', { round: true, png: true, max: 512, hint: 'Icône du navigateur et de l’application quand le voyageur installe le livret (carrée, 512×512 idéalement).' })}</div>
      <div>${text('share.meta.title', 'Nom affiché', { max: 70 })}${text('share.meta.description', 'Description', { area: true, rows: 3, max: 200, ph: 'Ex : Toutes les infos pratiques pour votre séjour' })}</div></div>
      ${imgField('share.meta.image', 'Image d’aperçu', { max: 1200, jpg: true, hint: 'Format paysage conseillé (1200×630).' })}</div>`;
}

// ---------------------------------------------------------------- affiches
export const POSTERS = [
  { id: 1, title: 'Bienvenue !', font: 'Pacifico', color: '#e84a7f', text: 'Scannez ce QR Code pour accéder à toutes nos informations utiles !', bg: 'dots' },
  { id: 2, title: 'Livret d’accueil', font: 'Caveat', color: '#5a9e6f', text: 'Scannez ce QR Code pour accéder à toutes nos informations utiles !', bg: 'dots' },
  { id: 3, title: 'Welcome !', font: 'Pacifico', color: '#e84a7f', text: 'Please scan this QR Code and discover all information about your stay', bg: 'dots' },
  { id: 4, title: 'Welcome Book', font: 'Caveat', color: '#5a9e6f', text: 'Please scan this QR Code and discover all information about your stay', bg: 'dots' },
  { id: 5, title: 'Welcome', title2: 'HOME', font: 'Pacifico', color: '#5b3fa6', color2: '#d4a437', text: 'Scannez le QR code pour découvrir notre livret d’accueil · Scan the QR code to discover our welcome book' },
  { id: 6, title: 'Bienvenue', title2: 'CHEZ NOUS', font: 'Pacifico', color: '#e84a7f', color2: '#2a384a', text: 'Scannez le QR code pour découvrir notre livret d’accueil' },
  { id: 7, title: 'Dear guests,', title2: 'WELCOME', font: 'Caveat', color: '#7b68ae', color2: '#e0435a', text: 'Scan the QR code to discover our welcome book' },
  { id: 8, title: 'Bienvenue', title2: 'chez nous', font: 'Dancing Script', color: '#4f7f5f', color2: '#4f7f5f', text: 'Scannez le QR code pour découvrir notre livret d’accueil' },
  { id: 9, title: 'BIENVENUE', title2: 'dans notre hébergement', font: 'Cormorant Garamond', color: '#8c6239', color2: '#8c6239', text: 'Scannez le QR code pour découvrir notre livret d’accueil' },
  { id: 10, title: 'WELCOME', title2: 'to our home', font: 'Cormorant Garamond', color: '#5b3fa6', color2: '#5b3fa6', text: 'Scan the QR code to discover our welcome book' },
  { id: 11, title: 'WIFI', font: 'Poppins', color: '#2a384a', text: '', wifi: true },
];

function printTab() {
  return `<div class="sec-title">Imprimer votre affiche QR code</div><p class="sec-sub">Choisissez un modèle : vous pourrez personnaliser le titre et le texte, puis télécharger l’affiche (PNG haute définition, format A4) ou l’imprimer.</p>
    <div class="card"><div class="posters">${POSTERS.map(p => `<button class="poster" data-poster="${p.id}"><canvas data-poster-thumb="${p.id}" width="300" height="424"></canvas></button>`).join('')}</div></div>`;
}

async function qrBitmap(data, size) {
  const qr = makeQr(data, size, { ...S.D.share.qr, transparent: false, bg: '#ffffff' });
  const blob = await qr.getRawData('png');
  return createImageBitmap(blob);
}
export async function drawPoster(cv, id, o = {}) {
  const p = POSTERS.find(x => x.id === id);
  const W = cv.width, H = cv.height, s = W / 1240;
  const cx = cv.getContext('2d');
  await Promise.all([p.font, 'Poppins'].map(f => document.fonts.load(`700 40px "${f}"`).catch(() => {})));
  cx.fillStyle = '#ffffff'; cx.fillRect(0, 0, W, H);
  if (p.bg === 'dots') { cx.fillStyle = '#f1f1f4'; for (let y = 20; y < H; y += 46 * s) for (let x = 20; x < W; x += 46 * s) { cx.beginPath(); cx.arc(x, y, 4 * s, 0, 7); cx.fill(); } }
  // cadre
  cx.strokeStyle = p.color; cx.lineWidth = 6 * s; cx.strokeRect(40 * s, 40 * s, W - 80 * s, H - 80 * s);
  cx.textAlign = 'center'; cx.textBaseline = 'alphabetic';
  const title = o.title || p.title, title2 = o.title2 ?? p.title2, txt = o.text ?? p.text;
  let y = 250 * s;
  cx.fillStyle = p.color; cx.font = `${p.font === 'Cormorant Garamond' || p.font === 'Poppins' ? 700 : 400} ${(title2 ? 150 : 170) * s}px "${p.font}"`;
  fitText(cx, title, W - 200 * s); cx.fillText(title, W / 2, y);
  if (title2) { y += 150 * s; cx.fillStyle = p.color2 || p.color; cx.font = `700 ${110 * s}px ${p.id === 8 ? `"${p.font}"` : '"Poppins"'}`; fitText(cx, title2, W - 200 * s); cx.fillText(title2, W / 2, y); }
  // QR
  const qsz = 640 * s, qy = y + 80 * s;
  const data = p.wifi ? wifiPayload(o.ssid, o.password) : qrUrl();
  const bmp = await qrBitmap(data, Math.round(qsz));
  cx.drawImage(bmp, (W - qsz) / 2, qy, qsz, qsz);
  let ty = qy + qsz + 90 * s;
  cx.fillStyle = p.wifi ? '#2a384a' : p.color; cx.font = `500 ${42 * s}px "Poppins"`;
  if (p.wifi) {
    cx.font = `600 ${48 * s}px "Poppins"`; cx.fillText(`Réseau : ${o.ssid || ''}`, W / 2, ty); ty += 70 * s;
    cx.fillText(`Mot de passe : ${o.password || ''}`, W / 2, ty); ty += 70 * s;
    cx.font = `400 ${34 * s}px "Poppins"`; cx.fillStyle = '#6b7280'; cx.fillText('Scannez pour vous connecter · Scan to connect', W / 2, ty);
  } else wrap(cx, txt, W / 2, ty, W - 260 * s, 56 * s);
  // pied : nom du logement
  cx.fillStyle = '#6b7280'; cx.font = `500 ${30 * s}px "Poppins"`;
  cx.fillText(o.footer ?? tx(S.D.property.title, S.D.languages.primary), W / 2, H - 90 * s);
}
function fitText(cx, t, max) { let f = cx.font; let size = parseFloat(/(\d+(\.\d+)?)px/.exec(f)[1]); while (cx.measureText(t).width > max && size > 20) { size -= 4; cx.font = f.replace(/\d+(\.\d+)?px/, size + 'px'); } }
function wrap(cx, t, x, y, max, lh) {
  const words = (t || '').split(' '); let line = '';
  for (const w of words) { const test = line ? line + ' ' + w : w; if (cx.measureText(test).width > max && line) { cx.fillText(line, x, y); y += lh; line = w; } else line = test; }
  if (line) cx.fillText(line, x, y);
}
