// Outils communs au livret voyageur (index.html) et à l'éditeur (admin.html).

export const LANGS = {
  fr: { name: 'Français', cc: 'fr' }, en: { name: 'English', cc: 'gb' }, es: { name: 'Español', cc: 'es' },
  de: { name: 'Deutsch', cc: 'de' }, it: { name: 'Italiano', cc: 'it' }, ru: { name: 'Русский', cc: 'ru' },
  uk: { name: 'Українська', cc: 'ua' }, nl: { name: 'Nederlands', cc: 'nl' }, el: { name: 'Ελληνικά', cc: 'gr' },
  tr: { name: 'Türkçe', cc: 'tr' }, ar: { name: 'العربية', cc: 'sa' }, ja: { name: '日本語', cc: 'jp' },
  zh: { name: '中文', cc: 'cn' }, pt: { name: 'Português', cc: 'pt' },
};
// Drapeau en SVG (les émojis drapeaux ne s'affichent pas sous Windows).
export function flag(lang, size = 22) {
  const cc = LANGS[lang]?.cc || 'fr';
  return `<img class="flag" src="assets/img/flags/${cc}.svg" width="${size}" height="${size}" alt="${lang.toUpperCase()}" style="border-radius:50%;object-fit:cover;display:inline-block;vertical-align:middle">`;
}
export const LANG_NAMES_FR = {
  fr: 'Français', en: 'Anglais', es: 'Espagnol', de: 'Allemand', it: 'Italien', ru: 'Russe', uk: 'Ukrainien',
  nl: 'Néerlandais', el: 'Grec', tr: 'Turc', ar: 'Arabe', ja: 'Japonais', zh: 'Chinois', pt: 'Portugais',
};

// Textes de l'interface voyageur (le contenu, lui, vient du livret).
const UI = {
  fr: {
    goHome: 'Me rendre au logement', allInfo: 'Toutes les informations', download: 'Télécharger le livret', close: 'Fermer',
    language: 'Langue du livret', back: 'Retour', discoverOther: 'Découvrez les autres informations', map: 'Carte', addresses: 'Adresses',
    favorites: 'Coups de cœur', places: 'lieux', place: 'lieu', all: 'Tout', call: 'Appeler', website: 'Site web', directions: 'Itinéraire',
    openMaps: 'Ouvrir dans Google Maps', copy: 'Copier', copied: 'Copié !', network: 'Réseau', password: 'Mot de passe',
    scanWifi: 'Scannez pour vous connecter automatiquement', code: 'Code', emergency: 'Numéros d’urgence', guestbookTitle: 'Laissez-nous un mot',
    yourName: 'Votre prénom', yourMessage: 'Votre message', rating: 'Votre note', send: 'Envoyer', thanks: 'Merci pour votre message !',
    reviews: 'Messages des voyageurs', noReviews: 'Soyez le premier à laisser un mot !', assistantPh: 'Posez votre question…',
    assistantOff: 'L’assistant n’est pas disponible pour le moment.', assistantErr: 'Désolé, je n’ai pas pu répondre. Réessayez dans un instant.',
    hostTip: 'Le conseil de l’hôte', home: 'Accueil', search: 'Assistant', installIos: 'Sur iPhone : touchez « Partager » puis « Sur l’écran d’accueil ».',
    installDone: 'Le livret est installé sur votre téléphone.', with: 'avec', km: 'km', reviewsCount: 'avis', whatsapp: 'WhatsApp', email: 'E-mail',
    accessTitle: 'Accès réservé', accessText: 'Entrez le code d’accès communiqué par votre hôte.', accessBad: 'Code incorrect.', enter: 'Entrer',
    contactUs: 'Nous contacter', openInApp: 'Ouvrir avec', copyAddress: 'Copier l’adresse', cancel: 'Annuler', documents: 'Documents',
    arrival: 'Arrivée à partir de', departure: 'Départ avant', notFound: 'Page introuvable', thinking: 'Je réfléchis…', see: 'Voir', sendError: 'Envoi impossible, réessayez.',
  },
  en: {
    goHome: 'Get to the accommodation', allInfo: 'All information', download: 'Download the guide', close: 'Close',
    language: 'Guide language', back: 'Back', discoverOther: 'Discover the other information', map: 'Map', addresses: 'Addresses',
    favorites: 'Our favourites', places: 'places', place: 'place', all: 'All', call: 'Call', website: 'Website', directions: 'Directions',
    openMaps: 'Open in Google Maps', copy: 'Copy', copied: 'Copied!', network: 'Network', password: 'Password',
    scanWifi: 'Scan to connect automatically', code: 'Code', emergency: 'Emergency numbers', guestbookTitle: 'Leave us a message',
    yourName: 'Your first name', yourMessage: 'Your message', rating: 'Your rating', send: 'Send', thanks: 'Thank you for your message!',
    reviews: 'Messages from guests', noReviews: 'Be the first to leave a message!', assistantPh: 'Ask your question…',
    assistantOff: 'The assistant is not available right now.', assistantErr: 'Sorry, I could not answer. Please try again in a moment.',
    hostTip: 'Host’s tip', home: 'Home', search: 'Assistant', installIos: 'On iPhone: tap “Share” then “Add to Home Screen”.',
    installDone: 'The guide is installed on your phone.', with: 'with', km: 'km', reviewsCount: 'reviews', whatsapp: 'WhatsApp', email: 'Email',
    accessTitle: 'Restricted access', accessText: 'Enter the access code given by your host.', accessBad: 'Wrong code.', enter: 'Enter',
    contactUs: 'Contact us', openInApp: 'Open with', copyAddress: 'Copy address', cancel: 'Cancel', documents: 'Documents',
    arrival: 'Check-in from', departure: 'Check-out before', notFound: 'Page not found', thinking: 'Thinking…', see: 'See', sendError: 'Could not send, please retry.',
  },
  es: {
    goHome: 'Ir al alojamiento', allInfo: 'Toda la información', download: 'Descargar la guía', close: 'Cerrar',
    language: 'Idioma de la guía', back: 'Volver', discoverOther: 'Descubra el resto de la información', map: 'Mapa', addresses: 'Direcciones',
    favorites: 'Nuestros favoritos', places: 'lugares', place: 'lugar', all: 'Todo', call: 'Llamar', website: 'Sitio web', directions: 'Cómo llegar',
    openMaps: 'Abrir en Google Maps', copy: 'Copiar', copied: '¡Copiado!', network: 'Red', password: 'Contraseña',
    scanWifi: 'Escanee para conectarse automáticamente', code: 'Código', emergency: 'Números de emergencia', guestbookTitle: 'Déjenos un mensaje',
    yourName: 'Su nombre', yourMessage: 'Su mensaje', rating: 'Su nota', send: 'Enviar', thanks: '¡Gracias por su mensaje!',
    reviews: 'Mensajes de los viajeros', noReviews: '¡Sea el primero en dejar un mensaje!', assistantPh: 'Haga su pregunta…',
    assistantOff: 'El asistente no está disponible por el momento.', assistantErr: 'Lo siento, no he podido responder. Inténtelo de nuevo.',
    hostTip: 'El consejo del anfitrión', home: 'Inicio', search: 'Asistente', installIos: 'En iPhone: toque «Compartir» y luego «Añadir a pantalla de inicio».',
    installDone: 'La guía está instalada en su teléfono.', with: 'con', km: 'km', reviewsCount: 'opiniones', whatsapp: 'WhatsApp', email: 'Correo',
    accessTitle: 'Acceso reservado', accessText: 'Introduzca el código de acceso facilitado por su anfitrión.', accessBad: 'Código incorrecto.', enter: 'Entrar',
    contactUs: 'Contáctenos', openInApp: 'Abrir con', copyAddress: 'Copiar la dirección', cancel: 'Cancelar', documents: 'Documentos',
    arrival: 'Llegada a partir de', departure: 'Salida antes de', notFound: 'Página no encontrada', thinking: 'Pensando…', see: 'Ver', sendError: 'No se pudo enviar, reinténtelo.',
  },
  de: {
    goHome: 'Zur Unterkunft', allInfo: 'Alle Informationen', download: 'Gästemappe herunterladen', close: 'Schließen',
    language: 'Sprache', back: 'Zurück', discoverOther: 'Entdecken Sie die weiteren Informationen', map: 'Karte', addresses: 'Adressen',
    favorites: 'Unsere Favoriten', places: 'Orte', place: 'Ort', all: 'Alle', call: 'Anrufen', website: 'Website', directions: 'Route',
    openMaps: 'In Google Maps öffnen', copy: 'Kopieren', copied: 'Kopiert!', network: 'Netzwerk', password: 'Passwort',
    scanWifi: 'Scannen, um sich automatisch zu verbinden', code: 'Code', emergency: 'Notrufnummern', guestbookTitle: 'Hinterlassen Sie uns eine Nachricht',
    yourName: 'Ihr Vorname', yourMessage: 'Ihre Nachricht', rating: 'Ihre Bewertung', send: 'Senden', thanks: 'Vielen Dank für Ihre Nachricht!',
    reviews: 'Nachrichten unserer Gäste', noReviews: 'Hinterlassen Sie als Erster eine Nachricht!', assistantPh: 'Stellen Sie Ihre Frage…',
    assistantOff: 'Der Assistent ist derzeit nicht verfügbar.', assistantErr: 'Entschuldigung, keine Antwort möglich. Bitte versuchen Sie es erneut.',
    hostTip: 'Tipp des Gastgebers', home: 'Start', search: 'Assistent', installIos: 'Auf dem iPhone: „Teilen“ und dann „Zum Home-Bildschirm“ tippen.',
    installDone: 'Die Gästemappe ist auf Ihrem Telefon installiert.', with: 'mit', km: 'km', reviewsCount: 'Bewertungen', whatsapp: 'WhatsApp', email: 'E-Mail',
    accessTitle: 'Geschützter Zugang', accessText: 'Geben Sie den Zugangscode Ihres Gastgebers ein.', accessBad: 'Falscher Code.', enter: 'Öffnen',
    contactUs: 'Kontakt', openInApp: 'Öffnen mit', copyAddress: 'Adresse kopieren', cancel: 'Abbrechen', documents: 'Dokumente',
    arrival: 'Anreise ab', departure: 'Abreise bis', notFound: 'Seite nicht gefunden', thinking: 'Ich denke nach…', see: 'Ansehen', sendError: 'Senden fehlgeschlagen, bitte erneut versuchen.',
  },
  it: {
    goHome: 'Raggiungere l’alloggio', allInfo: 'Tutte le informazioni', download: 'Scarica la guida', close: 'Chiudi',
    language: 'Lingua della guida', back: 'Indietro', discoverOther: 'Scopri le altre informazioni', map: 'Mappa', addresses: 'Indirizzi',
    favorites: 'I nostri preferiti', places: 'luoghi', place: 'luogo', all: 'Tutto', call: 'Chiama', website: 'Sito web', directions: 'Indicazioni',
    openMaps: 'Apri in Google Maps', copy: 'Copia', copied: 'Copiato!', network: 'Rete', password: 'Password',
    scanWifi: 'Scansiona per connetterti automaticamente', code: 'Codice', emergency: 'Numeri di emergenza', guestbookTitle: 'Lasciateci un messaggio',
    yourName: 'Il tuo nome', yourMessage: 'Il tuo messaggio', rating: 'Il tuo voto', send: 'Invia', thanks: 'Grazie per il tuo messaggio!',
    reviews: 'Messaggi dei viaggiatori', noReviews: 'Sii il primo a lasciare un messaggio!', assistantPh: 'Fai la tua domanda…',
    assistantOff: 'L’assistente non è disponibile al momento.', assistantErr: 'Spiacente, non sono riuscito a rispondere. Riprova tra poco.',
    hostTip: 'Il consiglio dell’host', home: 'Home', search: 'Assistente', installIos: 'Su iPhone: tocca «Condividi» e poi «Aggiungi alla schermata Home».',
    installDone: 'La guida è installata sul tuo telefono.', with: 'con', km: 'km', reviewsCount: 'recensioni', whatsapp: 'WhatsApp', email: 'E-mail',
    accessTitle: 'Accesso riservato', accessText: 'Inserisci il codice di accesso fornito dal tuo host.', accessBad: 'Codice errato.', enter: 'Entra',
    contactUs: 'Contattaci', openInApp: 'Apri con', copyAddress: 'Copia l’indirizzo', cancel: 'Annulla', documents: 'Documenti',
    arrival: 'Arrivo dalle', departure: 'Partenza entro le', notFound: 'Pagina non trovata', thinking: 'Sto pensando…', see: 'Vedi', sendError: 'Invio non riuscito, riprova.',
  },
};
export function ui(lang, key) {
  return (UI[lang] && UI[lang][key]) || UI.en[key] || UI.fr[key] || key;
}

// Texte multilingue {fr:'…', en:'…'} → chaîne dans la langue voulue (repli : langue principale, puis la première non vide).
export function tx(obj, lang, primary = 'fr') {
  if (obj == null) return '';
  if (typeof obj === 'string') return obj;
  if (Array.isArray(obj)) return obj;
  return obj[lang] || obj[primary] || obj.fr || Object.values(obj).find(v => v) || '';
}

export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// Nettoie le HTML riche saisi dans l'éditeur (pas de script, pas d'attributs on*).
export function safeHtml(html) {
  if (!html) return '';
  const tpl = document.createElement('template');
  tpl.innerHTML = html;
  tpl.content.querySelectorAll('script,style,iframe:not([data-video]),object,embed,link,meta').forEach(n => n.remove());
  tpl.content.querySelectorAll('*').forEach(el => {
    [...el.attributes].forEach(a => {
      if (/^on/i.test(a.name)) el.removeAttribute(a.name);
      if (['href', 'src'].includes(a.name) && /^\s*javascript:/i.test(a.value)) el.removeAttribute(a.name);
    });
    if (el.tagName === 'A') { el.setAttribute('target', '_blank'); el.setAttribute('rel', 'noopener'); }
  });
  return tpl.innerHTML;
}

export function hexToRgb(hex) {
  const m = /^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})/i.exec(hex || '');
  return m ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)] : [0, 0, 0];
}
export function rgba(hex, alpha) {
  if (!hex) return 'transparent';
  if (hex.startsWith('rgb')) return hex;
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r},${g},${b},${alpha})`;
}

const RADIUS = { none: '0px', low: '8px', medium: '16px', high: '28px', 'very-high': '44px' };
const SHADOW = { none: 0, low: 0.35, medium: 0.6, high: 1, 'very-high': 1.4 };
const ICON_SIZE = { small: '26px', normal: '34px', medium: '42px', large: '52px' };
const TEXT_SIZE = { small: '13px', normal: '15px', medium: '17px', large: '19px' };
const TITLE_SIZE = { small: '24px', normal: '30px', large: '36px', 'very-large': '42px' };
const SUB_SIZE = { small: '13px', normal: '15px', large: '17px' };

export const FONTS = ['Bodoni Moda', 'Jost', 'Poppins', 'Montserrat', 'Raleway', 'Lato', 'Open Sans', 'Nunito', 'Roboto', 'Playfair Display',
  'Lora', 'Merriweather', 'Josefin Sans', 'Quicksand', 'Comfortaa', 'Dancing Script', 'Pacifico', 'Caveat', 'Amatic SC', 'Cormorant Garamond'];

// Graisses disponibles par police : Google Fonts refuse toute la feuille si on demande une graisse qui n'existe pas.
const FONT_AXES = {
  'Bodoni Moda': 'ital,wght@0,400;0,500;0,600;0,700;1,400', 'Playfair Display': 'ital,wght@0,400;0,500;0,600;0,700;1,400',
  'Dancing Script': 'wght@400;500;600;700', 'Caveat': 'wght@400;500;600;700', 'Comfortaa': 'wght@300;400;500;600;700',
  'Quicksand': 'wght@300;400;500;600;700', 'Amatic SC': 'wght@400;700', 'Pacifico': '',
};
export function loadFonts(theme, doc = document) {
  const fams = [...new Set([theme.title?.font, theme.subtitle?.font, theme.modules?.font, theme.welcome?.font, 'Jost'].filter(Boolean))];
  // Une feuille par police : une police indisponible n'empêche pas les autres de se charger.
  doc.querySelectorAll('link[data-gfont]').forEach(l => { if (!fams.includes(l.dataset.gfont)) l.remove(); });
  fams.forEach(f => {
    const axes = FONT_AXES[f] ?? 'ital,wght@0,300;0,400;0,500;0,600;0,700;1,400';
    const href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(f)}${axes ? ':' + axes : ''}&display=swap`;
    let link = [...doc.querySelectorAll('link[data-gfont]')].find(l => l.dataset.gfont === f);
    if (!link) { link = doc.createElement('link'); link.rel = 'stylesheet'; link.dataset.gfont = f; doc.head.appendChild(link); }
    if (link.href !== href) link.href = href;
  });
}

// Thème du livret → variables CSS.
export function themeVars(t) {
  const m = t.modules || {}, p = t.pages || {}, w = t.welcome || {}, wd = t.widgets || {};
  const sh = SHADOW[m.shadow] ?? 0.6, psh = SHADOW[p.shadow] ?? 0.35;
  const v = {
    '--primary': t.primary, '--secondary': t.secondary,
    '--bg-color': t.background?.color || '#f6f7fb',
    '--filter': t.filter?.type === 'none' ? 'transparent' : rgba(t.filter?.color || '#000000', (t.filter?.opacity ?? 50) / 100),
    '--title-font': `'${t.title?.font || 'Poppins'}'`, '--title-weight': t.title?.weight || 700, '--title-color': t.title?.color,
    '--title-size': TITLE_SIZE[t.title?.size] || TITLE_SIZE.normal,
    '--sub-font': `'${t.subtitle?.font || 'Poppins'}'`, '--sub-weight': t.subtitle?.weight || 500, '--sub-color': t.subtitle?.color,
    '--sub-size': SUB_SIZE[t.subtitle?.size] || SUB_SIZE.normal, '--sub-bg': t.subtitle?.bgEnabled ? rgba(t.subtitle.bg, 0.85) : 'transparent',
    '--menu-bg': t.menu?.bg, '--menu-text': t.menu?.text, '--burger': t.menu?.burger,
    '--sticky-bg': t.stickyBar?.bg, '--sticky-text': t.stickyBar?.text,
    '--nav-bg': t.navBar?.bg, '--nav-icon': t.navBar?.icon, '--nav-active': t.navBar?.active,
    '--mod-font': `'${m.font || 'Poppins'}'`, '--mod-weight': m.weight || 600, '--mod-title': m.titleColor,
    '--mod-icon': m.iconColor, '--mod-icon-size': ICON_SIZE[m.iconSize] || ICON_SIZE.normal,
    '--mod-text-size': TEXT_SIZE[m.textSize] || TEXT_SIZE.normal, '--mod-radius': RADIUS[m.radius] || RADIUS.high,
    '--mod-bg': rgba(m.bg || '#ffffff', (m.bgOpacity ?? 80) / 100),
    '--mod-shadow': sh ? `0 ${Math.round(6 * sh)}px ${Math.round(18 * sh)}px ${rgba(m.shadowColor || '#000000', Math.min(0.55, 0.38 * sh))}` : 'none',
    '--page-bg': p.bg, '--card-bg': p.cardBg, '--page-title': p.titleColor, '--page-header': p.headerTitleColor,
    '--cat-title': p.categoryTitleColor, '--page-text': p.textColor, '--page-text2': p.secondaryText,
    '--page-icon': p.iconColor, '--page-icon-bg': p.iconBg, '--accent': p.accent || t.primary,
    '--card-shadow': psh ? `0 ${Math.round(4 * psh)}px ${Math.round(14 * psh)}px rgba(0,0,0,${(0.12 * psh).toFixed(2)})` : 'none',
    '--wel-font': `'${w.font || 'Poppins'}'`, '--wel-weight': w.weight || 400, '--wel-color': w.color, '--wel-close': w.close,
    '--wel-bg': w.bg, '--wel-block': w.blockBg, '--wel-accent': w.accent, '--wel-close-bg': rgba(w.close || '#000000', (w.closeOpacity ?? 20) / 100),
    '--weather-bg': rgba(wd.weather?.bg || '#ffffff', (wd.weather?.opacity ?? 100) / 100), '--weather-text': wd.weather?.text,
    '--go-bg': rgba(wd.goButton?.bg || '#ffffff', (wd.goButton?.opacity ?? 100) / 100), '--go-text': wd.goButton?.text, '--go-icon': wd.goButton?.icon,
  };
  return Object.entries(v).filter(([, x]) => x != null && x !== '').map(([k, x]) => `${k}:${x}`).join(';');
}

// Météo Open-Meteo (codes WMO) → libellé + icône.
const WMO = {
  0: ['sun', { fr: 'Ensoleillé', en: 'Sunny', es: 'Soleado', de: 'Sonnig', it: 'Soleggiato' }],
  1: ['sun-high', { fr: 'Peu nuageux', en: 'Mostly sunny', es: 'Poco nuboso', de: 'Überwiegend sonnig', it: 'Poco nuvoloso' }],
  2: ['cloud', { fr: 'Partiellement nuageux', en: 'Partly cloudy', es: 'Parcialmente nublado', de: 'Teilweise bewölkt', it: 'Parzialmente nuvoloso' }],
  3: ['cloud', { fr: 'Couvert', en: 'Overcast', es: 'Cubierto', de: 'Bedeckt', it: 'Coperto' }],
  45: ['mist', { fr: 'Brouillard', en: 'Fog', es: 'Niebla', de: 'Nebel', it: 'Nebbia' }],
  51: ['cloud-rain', { fr: 'Bruine', en: 'Drizzle', es: 'Llovizna', de: 'Nieselregen', it: 'Pioviggine' }],
  61: ['cloud-rain', { fr: 'Pluie', en: 'Rain', es: 'Lluvia', de: 'Regen', it: 'Pioggia' }],
  71: ['snowflake', { fr: 'Neige', en: 'Snow', es: 'Nieve', de: 'Schnee', it: 'Neve' }],
  80: ['cloud-rain', { fr: 'Averses', en: 'Showers', es: 'Chubascos', de: 'Schauer', it: 'Rovesci' }],
  95: ['cloud-storm', { fr: 'Orage', en: 'Thunderstorm', es: 'Tormenta', de: 'Gewitter', it: 'Temporale' }],
};
export function weatherLabel(code, lang) {
  const keys = Object.keys(WMO).map(Number).sort((a, b) => a - b);
  let k = 0;
  for (const c of keys) if (code >= c) k = c;
  const [ic, lab] = WMO[k];
  return { icon: ic, label: lab[lang] || lab.en };
}

// Distance en km entre deux points.
export function distanceKm(a, b) {
  if (!a || !b || a.lat == null || b.lat == null) return null;
  const R = 6371, rad = x => x * Math.PI / 180;
  const dLat = rad(b.lat - a.lat), dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function uid(prefix = '') {
  return prefix + Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-3);
}

export function telHref(n) { return 'tel:' + String(n || '').replace(/[^\d+]/g, ''); }
export function waHref(n, text = '') {
  let d = String(n || '').replace(/[^\d+]/g, '');
  if (d.startsWith('+')) d = d.slice(1); else if (d.startsWith('0')) d = '33' + d.slice(1);
  return `https://wa.me/${d}${text ? '?text=' + encodeURIComponent(text) : ''}`;
}

export function wifiPayload(ssid, password) {
  const e = s => String(s || '').replace(/([\\;,:"])/g, '\\$1');
  return `WIFI:T:${password ? 'WPA' : 'nopass'};S:${e(ssid)};P:${e(password)};;`;
}
