// Paramétrage + Statistiques + Avis du livre d'or.
import { S, getP } from './state.js';
import { text, toggle, select, choices, esc, icon, flagsRow } from './ui.js';
import { LANGS, LANG_NAMES_FR, flag, tx } from '../core.js';

export const SETTINGS_TABS = [['langs', 'Langues'], ['home', 'Mon hébergement'], ['info', 'Infos hébergement'], ['emergency', 'Contacts d’urgence'],
  ['contact', 'Contact & Réseaux'], ['access', 'Accès restreint'], ['ai', '✨ Assistant IA'], ['publish', 'Publication & serveur']];

export function settingsView() {
  const tab = S.tab.settings || 'langs';
  const body = { langs, home, info, emergency, contact, access, ai, publish }[tab]();
  return `<div class="intro"><div class="big">⚙️</div><div><h2>Dernière étape, <b>le paramétrage !</b></h2>
    <div class="muted">Langues (traduction automatique possible), adresse du logement, nom affiché, contacts, assistant IA et publication en ligne.</div></div></div>
    <h2>Paramétrage de votre livret</h2><div class="tabs">${SETTINGS_TABS.map(([k, l]) => `<button data-tab="settings:${k}" class="${k === tab ? 'on' : ''}">${l}</button>`).join('')}</div>${body}`;
}

function langs() {
  const L = S.D.languages;
  const canAI = S.D.backend?.url && S.cfg.backend?.adminKey;
  return `<div class="sec-title">Langues du livret</div><p class="sec-sub">La langue principale est celle dans laquelle vous rédigez. Les langues secondaires sont proposées aux voyageurs ; la traduction peut être faite automatiquement par l’IA puis corrigée à la main.</p>
    <div class="card"><div class="grid2"><div>${select('languages.primary', 'Langue principale', Object.keys(LANGS).map(l => [l, LANG_NAMES_FR[l]]))}</div>
      <div><span class="lbl">Traduire tout le livret</span><button class="b violet" data-act="translate-all" ${canAI ? '' : 'disabled'}>✨ Traduire mon livret</button>
        <label class="tog" style="margin-top:8px"><input type="checkbox" id="force-tr"><i></i><span>Forcer la retraduction de tous les champs</span></label>
        ${canAI ? '<div class="hint">Ne traduit que les champs vides, sauf si « Forcer » est coché.</div>' : '<div class="hint">Nécessite le serveur (onglet Publication &amp; serveur).</div>'}</div></div></div>
    <div class="card"><h3>Langues secondaires <span class="muted">(${L.secondary.length} / 8)</span></h3>
      <div class="choices">${Object.keys(LANGS).filter(l => l !== L.primary).map(l => `<button class="choice ${L.secondary.includes(l) ? 'on' : ''}" data-sec-lang="${l}">${flag(l, 22)}<br>${LANG_NAMES_FR[l]}</button>`).join('')}</div></div>`;
}

function home() {
  const a = 'property.address';
  return `<div class="sec-title">Adresse de votre livret</div><p class="sec-sub">Indispensable pour la météo, la carte, les distances et le bouton « Me rendre au logement ».</p>
    <div class="card"><label class="f"><span>Rechercher l’adresse</span><div style="display:flex;gap:8px"><input class="inp" id="geo-q" value="${esc(getP(a + '.full') || '')}" placeholder="Nom de la résidence, rue, ville…"><button class="b sm violet" data-geo="${a}" data-geo-full>${icon('search')} Chercher</button></div><div id="geo-res" class="list" style="margin-top:6px"></div></label>
      ${text(a + '.full', 'Adresse complète')}${text(a + '.complement', 'Complément d’adresse', { tr: true, ph: '1er étage gauche' })}
      ${text(a + '.displayed', 'Adresse affichée', { hint: 'Si renseignée, elle remplace l’adresse complète dans le livret (ex. « Résidence Fleur de Maquis »).' })}
      <div class="grid2">${text(a + '.lat', 'Latitude', { type: 'number', kind: 'num', step: 'any' })}${text(a + '.lng', 'Longitude', { type: 'number', kind: 'num', step: 'any' })}</div>
      <div class="miniMap" data-pickmap="${a}"></div><div class="hint">Cliquez sur la carte pour repositionner le repère si nécessaire.</div></div>
    <div class="card"><h3>Nom utilisé sur votre livret</h3>${text('property.hostName', 'Nom complet')}${toggle('property.hostNameHidden', 'Masquer le nom sur le livret')}</div>
    <div class="card"><div class="grid2">${text('property.reference', 'Référence de votre livret (facultatif)', { hint: 'Uniquement pour vous.' })}
      ${select('property.type', 'Type d’hébergement', [['', 'Non renseigné'], ['gite', 'Gîte / logement entier'], ['bnb', 'Chambre d’hôtes'], ['hotel', 'Hôtel'], ['camping', 'Camping'], ['residence', 'Résidence de tourisme']])}</div></div>`;
}

function info() {
  return `<div class="sec-title">Infos rapides de votre hébergement</div><p class="sec-sub">Affichées sous le titre, sur la page d’accueil du livret (laissez vide pour masquer).</p>
    <div class="card"><div class="grid2">${text('property.arrivalAfter', 'Arrivée à partir de', { type: 'time' })}${text('property.departureBefore', 'Départ avant', { type: 'time' })}</div></div>
    <div class="card"><h3>Saison</h3><div class="grid2">${text('property.season.start', 'Début', { type: 'date' })}${text('property.season.end', 'Fin', { type: 'date' })}</div><p class="muted">Pour mémoire (StyQR facturait le livret « saisonnier » sur cette période ; ici le livret reste en ligne toute l’année).</p></div>`;
}

function emergency() {
  const nums = S.D.emergency.numbers || [];
  return `<div class="sec-title">Les numéros d’urgence</div><p class="sec-sub">Ils s’affichent en haut du module « Numéros utiles ».</p>
    <div class="card">${toggle('emergency.enabled', 'Afficher les numéros d’urgence')}
      <div class="list">${nums.map((n, i) => `<div class="item"><div style="flex:1">${text(`emergency.numbers.${i}.label`, '', { tr: true })}</div><div style="width:110px">${text(`emergency.numbers.${i}.number`, '')}</div><button class="b sm danger" data-del="emergency.numbers" data-i="${i}">${icon('trash')}</button></div>`).join('')}</div>
      <div style="display:flex;gap:8px;margin-top:10px"><button class="b sm" data-add-item="emergency.numbers" data-blank='${esc(JSON.stringify({ label: { fr: 'Nouveau numéro' }, number: '' }))}'>${icon('plus')} Ajouter un numéro</button>
      <button class="b sm" data-act="emerg-fr">Numéros français par défaut</button></div></div>`;
}

function contact() {
  const c = 'contact';
  const order = (S.D.contact.order && S.D.contact.order.length ? S.D.contact.order : ['whatsapp', 'phone', 'email', 'url', 'instagram', 'facebook', 'twitter', 'linkedin']);
  const names = { whatsapp: 'WhatsApp', phone: 'Téléphone', email: 'E-mail', url: 'Site web', instagram: 'Instagram', facebook: 'Facebook', twitter: 'X (Twitter)', linkedin: 'LinkedIn' };
  return `<div class="banner info"><span>ℹ️</span><span class="grow">Ces coordonnées s’affichent sur l’accueil (widget contact) et dans le menu. Laissez vide ce que vous ne voulez pas montrer.</span></div>
    <div class="card">${text(c + '.title', 'Titre du bloc (facultatif)', { tr: true })}
      <div class="grid2">${text(c + '.phone', 'Téléphone', { type: 'tel', ph: '+33 6 …' })}${text(c + '.whatsapp', 'WhatsApp', { type: 'tel', ph: '+33 6 …' })}${text(c + '.email', 'E-mail', { type: 'email' })}${text(c + '.url', 'Site web', { type: 'url', ph: 'https://' })}
      ${text(c + '.instagram', 'Instagram', { ph: '@compte ou lien' })}${text(c + '.facebook', 'Facebook', { ph: 'lien de la page' })}${text(c + '.twitter', 'X (Twitter)', { ph: '@compte' })}${text(c + '.linkedin', 'LinkedIn', { ph: 'lien' })}</div></div>
    <div class="card"><h3>Ordre d’affichage</h3><div class="list" data-sortable="contact.order">${order.map(k => `<div class="item" data-sort-item><span class="grip">${icon('grip-vertical')}</span><span class="t">${names[k]}</span></div>`).join('')}</div></div>`;
}

function access() {
  const n = (S.D.access.codes || []).length;
  return `<div class="sec-title">Restriction d’accès</div><p class="sec-sub">Les visiteurs doivent saisir un code d’accès avant de voir le livret.</p>
    <div class="banner"><span>⚠️</span><span class="grow">Protection légère : elle évite qu’un inconnu tombé sur le lien lise le livret, mais le contenu reste techniquement lisible par une personne avertie (le site est public). Ne mettez pas d’informations très sensibles.</span></div>
    <div class="card">${toggle('access.enabled', 'Activer la restriction d’accès')}
      <p>${n} code(s) d’accès enregistré(s). <span class="muted">Les codes sont stockés chiffrés : notez-les, ils ne sont plus affichés ensuite.</span></p>
      <div style="display:flex;gap:8px"><button class="b sm violet" data-act="code-add">${icon('plus')} Ajouter un code</button>${n ? `<button class="b sm danger" data-act="code-clear">${icon('trash')} Supprimer tous les codes</button>` : ''}</div></div>`;
}

function ai() {
  const lang = S.lang;
  const sug = ((S.D.assistant.suggestions || {})[lang] || []).join('\n');
  return `<div class="banner info"><span>✨</span><span class="grow">L’assistant répond aux questions des voyageurs à partir du contenu de votre livret (et des informations ci-dessous). Il fonctionne avec le serveur Google Apps Script et une clé Claude (voir Publication &amp; serveur).</span></div>
    <div class="card"><h3>La voix de votre assistant</h3>${toggle('assistant.enabled', 'Activer l’assistant dans le livret')}
      <div class="grid2">${text('assistant.name', 'Prénom de l’assistant')}${select('assistant.tone', 'Ton', [['chaleureux', 'Chaleureux'], ['professionnel', 'Professionnel'], ['décontracté', 'Décontracté'], ['enthousiaste', 'Enthousiaste']])}</div></div>
    <div class="card"><h3>Accueil de l’assistant</h3>${text('assistant.greeting', 'Phrase d’accueil', { tr: true, area: true, rows: 2 })}
      <label class="f"><span>Questions proposées (une par ligne)</span><textarea data-bind="assistant.suggestions.${lang}" data-kind="lines" rows="4">${esc(sug)}</textarea>${flagsRow('assistant.suggestions')}</label></div>
    <div class="card"><h3>Nourrissez votre assistant</h3><p class="muted">Ce qui n’a pas sa place dans les modules : guide de la maison, FAQ, fonctionnement des équipements, règles particulières…</p>
      ${text('assistant.knowledge', 'Connaissances supplémentaires', { area: true, rows: 10 })}</div>`;
}

function publish() {
  const g = S.cfg.github, b = S.cfg.backend;
  return `<div class="sec-title">Publication sur GitHub Pages</div><p class="sec-sub">Ces réglages restent dans ce navigateur (ils ne sont jamais publiés). Voir le guide <a href="GUIDE.html" target="_blank">GUIDE.html</a> pour les créer pas à pas.</p>
    <div class="card"><div class="grid2">
      <label class="f"><span>Compte GitHub (propriétaire)</span><input class="inp" data-cfg="github.owner" value="${esc(g.owner)}" placeholder="corxiono"></label>
      <label class="f"><span>Dépôt</span><input class="inp" data-cfg="github.repo" value="${esc(g.repo)}" placeholder="livret-accueil"></label>
      <label class="f"><span>Branche</span><input class="inp" data-cfg="github.branch" value="${esc(g.branch || 'main')}"></label>
      <label class="f"><span>Jeton d’accès (fine-grained token)</span><input class="inp" type="password" data-cfg="github.token" value="${esc(g.token)}" placeholder="github_pat_…" autocomplete="off"><div class="hint">Droit « Contents : Read and write » sur ce dépôt uniquement.</div></label></div>
      <button class="b violet" data-act="gh-test">${icon('refresh')} Tester la connexion</button> <span id="gh-res" class="muted"></span></div>
    <div class="sec-title">Serveur (livre d’or, statistiques, assistant IA, traduction)</div><p class="sec-sub">Script Google Apps Script gratuit sur votre compte Google (fichier <code class="k">backend/Code.gs</code>).</p>
    <div class="card">${text('backend.url', 'Adresse du serveur (URL de l’application web Apps Script)', { ph: 'https://script.google.com/macros/s/…/exec', hint: 'Publiée avec le livret (les voyageurs en ont besoin).' })}
      <label class="f"><span>Clé administrateur</span><input class="inp" type="password" data-cfg="backend.adminKey" value="${esc(b.adminKey)}" autocomplete="off"><div class="hint">La même que ADMIN_KEY dans les propriétés du script. Reste dans ce navigateur.</div></label>
      <button class="b violet" data-act="be-test">${icon('refresh')} Tester le serveur</button> <span id="be-res" class="muted"></span></div>
    <div class="sec-title">Sauvegarde</div>
    <div class="card" style="display:flex;gap:8px;flex-wrap:wrap"><button class="b" data-act="export">${icon('download')} Exporter le livret (JSON)</button><button class="b" data-act="import">${icon('upload')} Importer un livret (JSON)</button>
      <button class="b danger" data-act="discard">${icon('arrow-back-up')} Annuler les modifications non publiées</button></div>`;
}

// ---------------------------------------------------------------- statistiques & avis
export function statsView(data, err) {
  if (err) return `<h2>Statistiques</h2><div class="banner"><span>ℹ️</span><span class="grow">${err}</span></div>`;
  if (!data) return `<h2>Statistiques</h2><p class="muted">Chargement…</p>`;
  const days = data.days || [];
  const max = Math.max(1, ...days.map(d => d.opens));
  const mods = Object.entries(data.modules || {}).sort((a, b) => b[1] - a[1]);
  const title = id => { const m = S.D.modules.find(x => x.id === id); return m ? tx(m.title, 'fr') : (id === 'assistant' ? 'Assistant IA' : id); };
  return `<h2>Statistiques <span class="muted">· 30 derniers jours</span></h2>
    <div class="kpis"><div class="kpi"><b>${data.visitors || 0}</b>Voyageurs (appareils)</div><div class="kpi"><b>${data.opens || 0}</b>Ouvertures du livret</div>
      <div class="kpi"><b>${data.scans || 0}</b>Scans du QR code</div><div class="kpi"><b>${esc(mods[0] ? title(mods[0][0]) : '—')}</b>Module le plus consulté</div></div>
    <div class="card"><h3>Ouvertures par jour</h3><div class="bars">${days.map(d => `<i style="height:${(d.opens / max) * 100}%" data-t="${d.date} : ${d.opens}"></i>`).join('')}</div></div>
    <div class="grid2"><div class="card"><h3>Modules consultés</h3>${mods.map(([k, v]) => `<div class="item" style="margin-bottom:6px"><span class="t">${esc(title(k))}</span><b>${v}</b></div>`).join('') || '<p class="muted">Aucune donnée.</p>'}</div>
      <div class="card"><h3>Langues des voyageurs</h3>${Object.entries(data.langs || {}).sort((a, b) => b[1] - a[1]).map(([k, v]) => `<div class="item" style="margin-bottom:6px">${flag(k, 20)}<span class="t">${LANG_NAMES_FR[k] || k}</span><b>${v}</b></div>`).join('') || '<p class="muted">Aucune donnée.</p>'}</div></div>`;
}

export function reviewsView(list, err) {
  if (err) return `<h2>Avis du livre d’or</h2><div class="banner"><span>ℹ️</span><span class="grow">${err}</span></div>`;
  if (!list) return `<h2>Avis du livre d’or</h2><p class="muted">Chargement…</p>`;
  return `<h2>Avis du livre d’or</h2><p class="muted">Validez un message pour qu’il apparaisse dans le livret. Vous recevez aussi chaque nouveau message par e-mail.</p>
    ${list.length ? list.map(r => `<div class="card"><div style="display:flex;justify-content:space-between;gap:10px"><b>${esc(r.name)} <span style="color:#f5a623">${'★'.repeat(r.rating || 0)}</span></b><span class="muted">${esc((r.date || '').slice(0, 16).replace('T', ' '))} · ${esc(r.lang || '')}</span></div>
      <p style="white-space:pre-wrap">${esc(r.message)}</p><div style="display:flex;gap:8px">
      ${r.status === 'approved' ? `<span class="tag">Publié dans le livret</span><button class="b sm" data-review="${esc(r.id)}" data-status="hidden">Masquer</button>` : `<button class="b sm teal" data-review="${esc(r.id)}" data-status="approved">${icon('check')} Publier</button>`}
      <button class="b sm danger" data-review="${esc(r.id)}" data-status="deleted">${icon('trash')} Supprimer</button></div></div>`).join('') : '<div class="card"><p class="muted">Aucun message pour le moment.</p></div>'}`;
}
