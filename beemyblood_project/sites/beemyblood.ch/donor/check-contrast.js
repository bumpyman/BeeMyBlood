#!/usr/bin/env node
// Verifie les ratios de contraste WCAG des couples texte/fond et bordure/fond
// reellement utilises dans index.html, a partir des variables declarees dans :root.
// Usage : node check-contrast.js   (aucune dependance externe)

const fs = require('fs');
const path = require('path');

const HTML_PATH = path.join(__dirname, 'index.html');
const html = fs.readFileSync(HTML_PATH, 'utf8');

function extractVars(blockRegex) {
  const m = html.match(blockRegex);
  if (!m) throw new Error('Bloc de variables introuvable: ' + blockRegex);
  const vars = {};
  const re = /--([a-z0-9-]+)\s*:\s*(#[0-9a-fA-F]{3,8})/g;
  let mm;
  while ((mm = re.exec(m[1])) !== null) {
    vars[mm[1]] = mm[2];
  }
  return vars;
}

const rootVars = extractVars(/:root\{([\s\S]*?)\}\s*\n\s*\n\/\* ===== LIGHT MODE/);

function hexToRgb(hex) {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  if (h.length === 4) h = h.slice(0, 3).split('').map((c) => c + c).join('');
  if (h.length === 8) h = h.slice(0, 6);
  const n = parseInt(h, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function relLuminance({ r, g, b }) {
  const chan = [r, g, b].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * chan[0] + 0.7152 * chan[1] + 0.0722 * chan[2];
}

function contrastRatio(hexA, hexB) {
  const lA = relLuminance(hexToRgb(hexA));
  const lB = relLuminance(hexToRgb(hexB));
  const [lighter, darker] = lA > lB ? [lA, lB] : [lB, lA];
  return (lighter + 0.05) / (darker + 0.05);
}

function v(name) {
  if (!(name in rootVars)) throw new Error('Variable --' + name + ' absente de :root');
  return rootVars[name];
}

// Couples texte/fond reellement utilises dans le donor space (thème sombre, defaut).
// Sources : var(--<text-role>) combine a var(--<surface>) dans index.html pour le
// corps de texte des 4 vues auditees, plus les couleurs d'accent utilisees comme texte.
const TEXT_PAIRS = [
  ['text sur dark (page)', 'text', 'dark'],
  ['text sur dark-card (cartes)', 'text', 'dark-card'],
  ['text sur dark-surface', 'text', 'dark-surface'],
  ['text-dim sur dark', 'text-dim', 'dark'],
  ['text-dim sur dark-card', 'text-dim', 'dark-card'],
  ['text-dim sur dark-surface', 'text-dim', 'dark-surface'],
  ['text-muted sur dark', 'text-muted', 'dark'],
  ['text-muted sur dark-card', 'text-muted', 'dark-card'],
  ['text-muted sur dark-surface', 'text-muted', 'dark-surface'],
  ['gold sur dark (accents, liens)', 'gold', 'dark'],
  ['gold sur dark-card', 'gold', 'dark-card'],
  ['dark sur gold (texte du bouton .btn-gold)', 'dark', 'gold'],
  ['red-soft sur dark-card (bouton "Oui" du questionnaire)', 'red-soft', 'dark-card'],
  ['green-soft sur dark-card (bouton "Non" du questionnaire)', 'green-soft', 'dark-card'],
  ['white sur red (.pat-urg, 1re couleur du degrade .btn-red)', 'white', 'red'],
  ['white sur red-bright (2e couleur du degrade .btn-red)', 'white', 'red-bright'],
];

// Couples bordure/fond (seuil 3:1, WCAG 1.4.11 - composants non textuels)
// NB: dark-border est la bordure de carte/champ de formulaire la plus utilisee
// du fichier (163 occurrences, y compris les champs du questionnaire medical).
const BORDER_PAIRS = [
  ['dark-border sur dark-card (bordures de champs/cartes, 163 usages)', 'dark-border', 'dark-card'],
  ['gold sur dark-card (focus / etat actif)', 'gold', 'dark-card'],
];

const TEXT_THRESHOLD = 4.5;
const BORDER_THRESHOLD = 3;

let failed = false;
const rows = [];

for (const [label, fg, bg] of TEXT_PAIRS) {
  const ratio = contrastRatio(v(fg), v(bg));
  const ok = ratio >= TEXT_THRESHOLD;
  if (!ok) failed = true;
  rows.push({ label, fg: v(fg), bg: v(bg), ratio, threshold: TEXT_THRESHOLD, ok });
}
for (const [label, fg, bg] of BORDER_PAIRS) {
  const ratio = contrastRatio(v(fg), v(bg));
  const ok = ratio >= BORDER_THRESHOLD;
  if (!ok) failed = true;
  rows.push({ label, fg: v(fg), bg: v(bg), ratio, threshold: BORDER_THRESHOLD, ok });
}

console.log('Verification des contrastes WCAG - BeeMyBlood donor (theme sombre)\n');
for (const r of rows) {
  const status = r.ok ? 'OK  ' : 'FAIL';
  console.log(
    `[${status}] ${r.label.padEnd(48)} ${r.fg} / ${r.bg}  ${r.ratio.toFixed(2)}:1 (seuil ${r.threshold}:1)`
  );
}

console.log('\n' + (failed ? 'ECHEC : au moins un couple est sous le seuil WCAG.' : 'OK : tous les couples verifies respectent le seuil WCAG.'));
process.exit(failed ? 1 : 0);
