// Étape 1 — Personnalisation (fond, structure, titre, style, modules, mot d'accueil, logo, widgets).
import { S, getP } from './state.js';
import { text, color, toggle, select, choices, imgField, rte, esc, icon, src } from './ui.js';
import { FONTS } from '../core.js';
import { PALETTES } from './presets-theme.js';

const WEIGHTS = [[300, 'Light'], [400, 'Regular'], [500, 'Medium'], [600, 'Semi-bold'], [700, 'Bold']];
const fontSel = (path, label) => select(path, label, FONTS.map(f => [f, f]));
const weightSel = (path, label = 'Épaisseur') => select(path, label, WEIGHTS, { kind: 'num' });

export const PERSO_TABS = [
  ['bg', 'Image de fond'], ['structure', 'Structure et filtres'], ['title', 'Titre et sous-titre'], ['style', 'Style'],
  ['modules', 'Modules'], ['welcome', 'Mot d’accueil'], ['logo', 'Logo et profil'], ['widgets', 'Widgets'],
];

export function persoView() {
  const tab = S.tab.perso || 'bg';
  const body = { bg, structure, title, style, modules, welcome, logo, widgets }[tab]();
  return `<div class="intro"><div class="big">🎨</div><div><h2>Première étape, <b>la personnalisation !</b></h2>
    <div class="muted">Donnez son look à votre livret : photo de fond, titre et sous-titre, couleurs, typographie et style des modules. L’aperçu se met à jour en direct (à droite sur PC, bouton « Aperçu » sur tablette et téléphone), en version mobile, tablette ou PC.</div></div></div>
    <h2 style="margin-top:6px">Personnalisez le style de votre livret</h2>
    <div class="tabs">${PERSO_TABS.map(([k, l]) => `<button data-tab="perso:${k}" class="${k === tab ? 'on' : ''}">${l}</button>`).join('')}</div>${body}`;
}

function usedImages() {
  const set = new Set();
  const walk = o => { if (!o || typeof o !== 'object') return; for (const [k, v] of Object.entries(o)) { if (typeof v === 'string' && /^media\/.+\.(webp|jpe?g|png)$/i.test(v) && !/logo|icon|partner|contact/.test(v)) set.add(v); else walk(v); } };
  walk(S.D);
  Object.keys(S.pending).filter(p => /\.(webp|jpe?g|png)$/.test(p)).forEach(p => set.add(p));
  return [...set];
}

function bg() {
  const t = S.D.theme.background;
  const imgs = usedImages();
  return `<div class="sec-title">Fond de votre livret</div><p class="sec-sub">Choisissez une de vos photos, ajoutez-en une nouvelle, ou optez pour une couleur unie.</p>
    <div class="card"><div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px">
      <button class="b violet sm" data-act="bg-upload">${icon('upload')} Ajouter une photo</button>
      ${t.image ? `<button class="b sm" data-act="bg-analyse">${icon('palette')} Réanalyser mes couleurs à partir de cette image</button>` : ''}</div>
    <div class="bgs">
      <button class="new ${t.type === 'color' ? 'on' : ''}" data-act="bg-color" style="background:${esc(t.color)}">${icon('palette', '', 26)}<br>Votre couleur</button>
      ${imgs.map(p => `<button class="${t.type === 'image' && t.image === p ? 'on' : ''}" data-bgimg="${esc(p)}" style="background-image:url('${esc(src(p))}')" title="${esc(p)}"></button>`).join('')}
    </div></div>
    ${t.type === 'color' ? `<div class="card">${color('theme.background.color', 'Couleur de fond')}</div>` : ''}`;
}

function structure() {
  return `<div class="sec-title">Style du livret</div><p class="sec-sub">Choisissez la mise en page et la couleur principale de votre livret.</p>
    <div class="card">${choices('theme.layout', [{ v: 'classic', label: 'Classique', icon: 'layout-grid' }, { v: 'modern', label: 'Moderne', icon: 'layout-columns' }])}
      ${color('theme.primary', 'Couleur principale du livret')}<div class="hint" style="margin-top:-8px">Utilisée pour les boutons, les accents et les éléments interactifs.</div></div>
    <div class="card"><h3>Configuration des menus</h3>
      <div class="lbl">Menu latéral <span class="muted">(s’ouvre depuis l’icône en haut à droite)</span></div>
      ${toggle('theme.menu.enabled', 'Afficher le menu')}
      ${toggle('theme.menu.download', 'Bouton « Télécharger le livret »', { hint: 'Permet au voyageur d’installer le livret sur son téléphone.' })}
      ${toggle('theme.menu.contacts', 'Afficher les contacts (e-mail, téléphone, réseaux…) dans le menu')}
      <div class="grid3">${color('theme.menu.bg', 'Couleur de fond')}${color('theme.menu.text', 'Couleur du texte')}${color('theme.menu.burger', 'Couleur de l’icône')}</div>
      <div class="lbl" style="margin-top:6px">Barre d’en-tête réduite <span class="muted">(apparaît en haut quand on fait défiler)</span></div>
      <div class="grid2">${color('theme.stickyBar.bg', 'Couleur de fond')}${color('theme.stickyBar.text', 'Couleur du texte')}</div>
      <div class="lbl" style="margin-top:6px">Barre de navigation (en bas)</div>
      ${toggle('theme.navBar.enabled', 'Afficher la barre')}${toggle('theme.navBar.logoInside', 'Afficher le logo dans la barre')}
      <div class="grid3">${color('theme.navBar.bg', 'Couleur de fond')}${color('theme.navBar.icon', 'Couleur des icônes')}${color('theme.navBar.active', 'Couleur icône active')}</div></div>
    <div class="card"><h3>Filtre sur l’image de fond</h3>
      ${choices('theme.filter.type', [{ v: 'none', label: 'Aucun filtre' }, { v: 'full', label: 'Filtre plein' }])}
      ${S.D.theme.filter.type !== 'none' ? `<div class="grid2">${color('theme.filter.color', 'Couleur du filtre')}${text('theme.filter.opacity', 'Opacité (%)', { type: 'number', kind: 'num', min: 0, max2: 100 })}</div>` : ''}</div>`;
}

function title() {
  const sizes = [['small', 'Petite'], ['normal', 'Normale'], ['large', 'Grande'], ['very-large', 'Très grande']];
  return `<div class="sec-title">Titre et sous-titre de votre livret</div><p class="sec-sub">C’est la première chose que verra votre voyageur.</p>
    <div class="card">${text('property.title', 'Titre du livret', { tr: true, max: 150 })}${rte('property.subtitle', 'Sous-titre du livret')}</div>
    <div class="sec-title">Personnalisation titre et sous-titre</div>
    <div class="card"><h3>Titre du livret</h3><div class="grid2">${fontSel('theme.title.font', 'Police')}${weightSel('theme.title.weight')}${select('theme.title.size', 'Taille', sizes)}${color('theme.title.color', 'Couleur')}</div></div>
    <div class="card"><h3>Sous-titre du livret</h3><div class="grid2">${fontSel('theme.subtitle.font', 'Police')}${weightSel('theme.subtitle.weight')}${select('theme.subtitle.size', 'Taille', sizes.slice(0, 3))}${color('theme.subtitle.color', 'Couleur')}</div>
      ${toggle('theme.subtitle.bgEnabled', 'Fond derrière le sous-titre')}${S.D.theme.subtitle.bgEnabled ? color('theme.subtitle.bg', 'Couleur du fond') : ''}</div>`;
}

function style() {
  const cur = S.D.theme.preset;
  return `<div class="sec-title">Style</div><p class="sec-sub">Choisissez une palette prédéfinie. Votre fond est conservé ; toutes les couleurs sont ensuite modifiables.</p>
    <div class="banner"><span>⚠️</span><span class="grow">En choisissant un style, les couleurs actuelles sont remplacées par celles du style sélectionné (vous pouvez annuler avec « Annuler les modifications » tant que vous n’avez pas publié).</span></div>
    <div class="palettes">${PALETTES.map(p => `<button class="pal ${cur === p.id ? 'on' : ''}" data-palette="${p.id}"><div class="sw">${[p.light, p.light2, p.primary, p.title, p.text].map(c => `<i style="background:${c}"></i>`).join('')}</div><b>${p.name}</b></button>`).join('')}</div>`;
}

function modules() {
  const sub = S.tab.permod || 'general';
  const m = 'theme.modules', p = 'theme.pages';
  const head = `<div class="subtabs"><button data-tab="permod:general" class="${sub === 'general' ? 'on' : ''}">Général</button><button data-tab="permod:pages" class="${sub === 'pages' ? 'on' : ''}">Pages modules</button></div>`;
  if (sub === 'pages') {
    return head + `<div class="sec-title">Pages des modules</div><p class="sec-sub">Couleurs des pages qui s’ouvrent quand le voyageur touche un module.</p>
      <div class="card"><h3>Couleurs de fond</h3><div class="grid2">${color(p + '.bg', 'Fond de page')}${color(p + '.cardBg', 'Fond des blocs')}</div></div>
      <div class="card"><h3>Titres et textes</h3><div class="grid2">${color(p + '.headerTitleColor', 'Titre bandeau')}${color(p + '.categoryTitleColor', 'Titre catégorie')}${color(p + '.titleColor', 'Titre contenu')}${color(p + '.textColor', 'Contenu')}${color(p + '.secondaryText', 'Texte secondaire')}${color(p + '.accent', 'Liens et accents')}</div></div>
      <div class="card"><h3>Pictogrammes</h3><div class="grid2">${color(p + '.iconColor', 'Couleur des pictogrammes')}${color(p + '.iconBg', 'Fond des pictogrammes')}</div></div>
      <div class="card"><h3>Blocs et photos</h3>${choices(p + '.shadow', [{ v: 'none', label: 'Aucun' }, { v: 'low', label: 'Faible' }, { v: 'medium', label: 'Moyen' }, { v: 'high', label: 'Fort' }], { label: 'Ombrage des blocs' })}
        ${choices(p + '.photoLayout', [{ v: 'mosaic', label: 'Mosaïque' }, { v: 'carousel', label: 'Carrousel' }], { label: 'Disposition des photos' })}</div>`;
  }
  const sizes = [{ v: 'small', label: 'Petit' }, { v: 'normal', label: 'Normal' }, { v: 'medium', label: 'Moyen' }, { v: 'large', label: 'Grand' }];
  return head + `<div class="sec-title">Personnalisation des modules</div><p class="sec-sub">Choisissez vos couleurs, la police et le style des modules de la page d’accueil.</p>
    <div class="card"><h3>Titre des modules</h3><div class="grid3">${fontSel(m + '.font', 'Police')}${weightSel(m + '.weight')}${color(m + '.titleColor', 'Couleur')}</div></div>
    <div class="card"><h3>Style des icônes</h3>${choices(m + '.iconStyle', [{ v: 'colored', label: 'Coloré', icon: 'wifi' }, { v: 'invisible', label: 'Invisible', icon: 'eye-off' }])}${color(m + '.iconColor', 'Couleur des icônes')}</div>
    <div class="card"><h3>Taille des pictogrammes</h3>${choices(m + '.iconSize', sizes)}<h3>Taille du texte des modules</h3>${choices(m + '.textSize', sizes)}</div>
    <div class="card"><h3>Disposition des modules</h3>
      ${toggle(m + '.gridResponsive', 'Disposition différente pour PC, tablette et mobile', { hint: 'Désactivé : la disposition choisie pour le mobile s’adapte automatiquement (3 colonnes sur tablette, 4 sur PC). Utilisez les boutons Tablette / PC de l’aperçu pour vérifier.' })}
      ${choices(m + '.grid', [{ v: '2-cols', label: '2 colonnes' }, { v: 'list', label: 'Liste' }, { v: '1-col', label: '1 colonne' }, { v: '1-2', label: '1 - 2' }, { v: '2-1', label: '2 - 1' }, { v: '1-then-2', label: '1 puis 2' }, { v: '2-then-1', label: '2 puis 1' }], { label: S.D.theme.modules.gridResponsive ? '📱 Mobile' : '' })}
      ${S.D.theme.modules.gridResponsive ? choices(m + '.gridTablet', [{ v: '2-cols', label: '2 colonnes' }, { v: '3-cols', label: '3 colonnes' }, { v: '4-cols', label: '4 colonnes' }, { v: 'list', label: 'Liste' }, { v: 'list2', label: 'Liste sur 2 colonnes' }], { label: 'Tablette' })
        + choices(m + '.gridDesktop', [{ v: '3-cols', label: '3 colonnes' }, { v: '4-cols', label: '4 colonnes' }, { v: '2-cols', label: '2 colonnes' }, { v: 'list', label: 'Liste' }, { v: 'list2', label: 'Liste sur 2 colonnes' }], { label: 'PC' }) : ''}
      <h3>Arrondi des angles</h3>${choices(m + '.radius', [{ v: 'none', label: 'Aucun' }, { v: 'low', label: 'Faible' }, { v: 'medium', label: 'Moyen' }, { v: 'high', label: 'Fort' }, { v: 'very-high', label: 'Très fort' }])}</div>
    <div class="card"><h3>Fond des modules</h3>${choices(m + '.bgType', [{ v: 'color', label: 'Couleur' }, { v: 'image', label: 'Image du module' }])}
      ${color(m + '.bg', 'Couleur de fond des modules')}${choices(m + '.bgOpacity', [100, 80, 50, 25, 0].map(v => ({ v, label: v + ' %' })), { label: 'Opacité du fond des modules', kind: 'num' })}</div>
    <div class="card"><h3>Ombrage des modules</h3>${color(m + '.shadowColor', 'Couleur de l’ombrage')}${choices(m + '.shadow', [{ v: 'none', label: 'Aucun' }, { v: 'low', label: 'Faible' }, { v: 'medium', label: 'Moyen' }, { v: 'high', label: 'Fort' }, { v: 'very-high', label: 'Très fort' }])}</div>`;
}

function welcome() {
  const w = 'theme.welcome';
  return `<div class="banner info"><span>💬</span><span class="grow">Le texte du mot d’accueil se modifie dans <b>Vos modules › Mot d’accueil</b>. Ici, vous réglez son apparence.</span><button class="b sm violet" data-act="test-popup">Tester le pop-up</button></div>
    <div class="card"><div class="grid2">${fontSel(w + '.font', 'Police du texte')}${weightSel(w + '.weight', 'Épaisseur du texte')}</div>
      <div class="grid3">${color(w + '.color', 'Couleur du texte')}${color(w + '.close', 'Bouton de fermeture')}${color(w + '.accent', 'Couleur accentuée')}</div>
      ${choices(w + '.closeOpacity', [0, 15, 30, 50, 80, 100].map(v => ({ v, label: v + ' %' })), { label: 'Opacité du fond du bouton de fermeture', kind: 'num' })}
      <div class="grid2">${color(w + '.bg', 'Couleur de fond')}${color(w + '.blockBg', 'Fond des blocs (langue, téléchargement)')}</div></div>
    <div class="card"><div class="grid2"><div>${toggle('welcome.showAvatar', 'Photo de profil')}${toggle('welcome.showLanguage', 'Choix de la langue')}</div><div>${toggle('welcome.showName', 'Nom / signature')}${toggle('welcome.showDownload', 'Téléchargement du livret')}</div></div>
      ${select('welcome.signaturePosition', 'Position photo / signature', [['top', 'En haut (avant le message)'], ['bottom', 'En bas (après le message)']])}</div>`;
}

function logo() {
  return `<div class="sec-title">Photo de profil et logo</div><p class="sec-sub">Ajoutez une photo de profil et personnalisez votre livret à votre image avec votre logo.</p>
    <div class="grid2"><div class="card">${imgField('branding.avatar', 'Photo de profil', { round: true, max: 600 })}${toggle('branding.avatarEnabled', 'Afficher la photo de profil')}</div>
    <div class="card">${imgField('branding.logo', 'Votre logo', { round: true, png: true, max: 800 })}${toggle('branding.logoEnabled', 'Afficher le logo')}</div></div>`;
}

function widgets() {
  const w = 'theme.widgets';
  const op = path => choices(path, [100, 80, 50, 25, 0].map(v => ({ v, label: v + ' %' })), { label: 'Opacité du fond', kind: 'num' });
  return `<div class="card"><h3>Afficher la météo</h3>${toggle(w + '.weather.enabled', 'Activé')}<div class="grid2">${color(w + '.weather.bg', 'Couleur du fond')}${color(w + '.weather.text', 'Couleur du texte')}</div>${op(w + '.weather.opacity')}</div>
    <div class="card"><h3>Bouton « Me rendre au logement »</h3>${toggle(w + '.goButton.enabled', 'Activé')}<div class="grid3">${color(w + '.goButton.bg', 'Couleur du fond')}${color(w + '.goButton.text', 'Couleur du texte')}${color(w + '.goButton.icon', 'Couleur du picto')}</div>${op(w + '.goButton.opacity')}</div>
    <div class="card"><h3>Afficher les contacts sur l’accueil</h3>${toggle(w + '.contacts.enabled', 'Activé')}<p class="muted">Les coordonnées se modifient dans <a href="#" data-goto="settings:contact">Paramétrage › Contact &amp; Réseaux</a>.</p>
      ${choices(w + '.contacts.position', [{ v: 'above', label: 'Au-dessus du bouton' }, { v: 'below', label: 'En dessous du bouton' }, { v: 'bottom', label: 'Sous les modules' }], { label: 'Position' })}
      ${choices(w + '.contacts.style', [{ v: 'classic', label: 'Classiques' }, { v: 'custom', label: 'Couleur principale' }], { label: 'Style des couleurs' })}</div>
    <div class="card"><h3>Configuration des cartes</h3><div class="grid2">${color('theme.map.markerColor', 'Couleur des repères')}${color('theme.map.homeColor', 'Bordure du repère « logement »')}</div>
      ${select('theme.map.tiles', 'Fond de carte', [['osm', 'OpenStreetMap (standard)'], ['osmfr', 'OpenStreetMap France'], ['topo', 'Topographique (randonnée)']])}</div>`;
}
