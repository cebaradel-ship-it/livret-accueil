// Palettes de couleurs prêtes à l'emploi (onglet « Style »).
import { rgba } from '../core.js';

export const PALETTES = [
  { id: 'sable', name: 'Sable chaud', primary: '#8c6239', light: '#e6dcd0', light2: '#f5f1eb', title: '#c08457', text: '#604a4a', text2: '#6d6060', dark: '#111827', shadow: '#b99878' },
  { id: 'medit', name: 'Méditerranée', primary: '#1f6f8b', light: '#e3eef2', light2: '#f3f8fa', title: '#1f6f8b', text: '#24414e', text2: '#4a6672', dark: '#0f172a', shadow: '#8fb3c2' },
  { id: 'maquis', name: 'Maquis', primary: '#4f6d3a', light: '#e5ead9', light2: '#f4f6ee', title: '#5f7f45', text: '#3a4630', text2: '#5b6650', dark: '#1a1f14', shadow: '#9fb08a' },
  { id: 'lavande', name: 'Lavande', primary: '#6d5a9e', light: '#ebe6f4', light2: '#f6f3fa', title: '#7b68ae', text: '#3f3557', text2: '#5f5678', dark: '#1e1a2b', shadow: '#b3a6d1' },
  { id: 'terracotta', name: 'Terracotta', primary: '#b5543a', light: '#f3e3dc', light2: '#faf2ee', title: '#c0623f', text: '#5a3329', text2: '#74514a', dark: '#2a1712', shadow: '#d9a796' },
  { id: 'nuit', name: 'Nuit étoilée', primary: '#e0b354', light: '#1f2937', light2: '#273244', title: '#f2c66d', text: '#f3f4f6', text2: '#d1d5db', dark: '#f9fafb', shadow: '#000000' },
  { id: 'citron', name: 'Citron', primary: '#b8901a', light: '#fbf5dc', light2: '#fffbea', title: '#c9a227', text: '#4d4320', text2: '#6b6140', dark: '#231e0c', shadow: '#e3cf85' },
  { id: 'rose', name: 'Rose poudré', primary: '#b5657d', light: '#f6e6ea', light2: '#fbf3f5', title: '#c27891', text: '#5a3842', text2: '#765862', dark: '#2a1a1f', shadow: '#dcaab8' },
  { id: 'ardoise', name: 'Ardoise', primary: '#44546a', light: '#e7eaee', light2: '#f4f6f8', title: '#44546a', text: '#2a384a', text2: '#556270', dark: '#111827', shadow: '#a5b0bd' },
  { id: 'olive', name: 'Olive', primary: '#7a7a3a', light: '#ecebdc', light2: '#f7f6ee', title: '#8a8a45', text: '#45452a', text2: '#64644a', dark: '#1d1d10', shadow: '#bdbc91' },
  { id: 'corail', name: 'Corail', primary: '#e0675a', light: '#fde9e6', light2: '#fff5f3', title: '#e0675a', text: '#5c2f2a', text2: '#7a524d', dark: '#2a1311', shadow: '#f0b1a9' },
  { id: 'mineral', name: 'Minéral', primary: '#2f8f83', light: '#dff1ee', light2: '#f1f9f8', title: '#2f8f83', text: '#23423e', text2: '#4b6662', dark: '#0f1f1d', shadow: '#93c9c1' },
];

export function applyPalette(t, p) {
  t.preset = p.id;
  t.primary = p.primary; t.secondary = p.light2;
  Object.assign(t.title, { color: p.title });
  Object.assign(t.subtitle, { color: p.text, bg: p.light2 });
  Object.assign(t.menu, { bg: p.light, text: p.dark, burger: p.primary });
  Object.assign(t.stickyBar, { bg: p.light, text: p.text });
  Object.assign(t.navBar, { bg: p.light, icon: p.primary, active: p.primary });
  Object.assign(t.modules, { titleColor: p.text, iconColor: p.primary, bg: p.light, shadowColor: p.shadow });
  Object.assign(t.pages, { bg: p.light, cardBg: p.light, titleColor: p.text, headerTitleColor: p.text, categoryTitleColor: p.text, textColor: p.text2, secondaryText: p.text, iconColor: p.primary, iconBg: rgba(p.primary, 0.12), accent: p.title });
  Object.assign(t.welcome, { color: p.text, close: p.text, bg: p.light });
  Object.assign(t.widgets.weather, { bg: p.light, text: p.text });
  Object.assign(t.widgets.goButton, { bg: p.light, text: p.text, icon: p.primary });
  t.map = Object.assign(t.map || {}, { markerColor: p.primary });
}

// Couleurs dominantes d'une image → palette sur mesure.
export async function paletteFromImage(url) {
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.src = url;
  await img.decode();
  const cv = document.createElement('canvas');
  cv.width = 80; cv.height = Math.round(80 * img.height / img.width) || 80;
  const cx = cv.getContext('2d');
  cx.drawImage(img, 0, 0, cv.width, cv.height);
  const px = cx.getImageData(0, 0, cv.width, cv.height).data;
  const bins = {};
  for (let i = 0; i < px.length; i += 4) {
    const [r, g, b] = [px[i], px[i + 1], px[i + 2]];
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    if (mx - mn < 28 || mx < 40 || mn > 225) continue; // ignore gris, noirs et blancs
    const k = `${r >> 4},${g >> 4},${b >> 4}`;
    bins[k] = (bins[k] || 0) + 1;
  }
  const top = Object.entries(bins).sort((a, b) => b[1] - a[1])[0];
  const [r, g, b] = top ? top[0].split(',').map(x => (+x << 4) + 8) : [140, 98, 57];
  const hex = (x, y, z) => '#' + [x, y, z].map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
  const mix = (t, w) => hex(r + (w - r) * t, g + (w - g) * t, b + (w - b) * t);
  const dark = f => hex(r * f, g * f, b * f);
  return { id: 'image', name: 'Depuis l’image', primary: dark(0.7), light: mix(0.82, 255), light2: mix(0.92, 255), title: dark(0.85), text: dark(0.35), text2: dark(0.45), dark: '#111827', shadow: mix(0.5, 255) };
}
