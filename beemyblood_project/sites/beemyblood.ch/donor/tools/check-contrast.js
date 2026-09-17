#!/usr/bin/env node
// Verifie les ratios de contraste WCAG des couples texte/fond et bordure/fond
// reellement utilises dans le donor space, a partir des variables declarees dans :root
// et body.light-mode (assets/styles.css depuis le decoupage multipage).
// Usage : node check-contrast.js   (aucune dependance externe)

const fs = require('fs');
const path = require('path');

const CSS_PATH = path.join(__dirname, '..', 'assets', 'styles.css');
const css = fs.readFileSync(CSS_PATH, 'utf8');

function extractVars(blockRegex) {
  const m = css.match(blockRegex);
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
const lightOverrides = extractVars(/body\.light-mode\{([\s\S]*?)\}/);
const lightVars = Object.assign({}, rootVars, lightOverrides);

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

function makeV(vars) {
  return function v(name) {
    if (!(name in vars)) throw new Error('Variable --' + name + ' absente');
    return vars[name];
  };
}

// Couples texte/fond reellement utilises dans le donor space, sur les 3 surfaces
// (page, card, surface) de chaque theme — la surface la plus claire (du theme
// sombre) ou la plus foncee (du theme clair) est le cas le plus dur, donc on
// verifie systematiquement les 3 plutot qu'une seule combinaison "typique".
const TEXT_PAIRS = [
  ['text', ['dark', 'dark-card', 'dark-surface']],
  ['text-dim', ['dark', 'dark-card', 'dark-surface']],
  ['text-muted', ['dark', 'dark-card', 'dark-surface']],
  ['gold', ['dark', 'dark-card', 'dark-surface']],
  ['red-soft', ['dark', 'dark-card', 'dark-surface']],
  ['green', ['dark', 'dark-card', 'dark-surface']],
  ['green-soft', ['dark', 'dark-card', 'dark-surface']],
  ['blue', ['dark', 'dark-card', 'dark-surface']],
  ['purple', ['dark', 'dark-card', 'dark-surface']],
  ['teal', ['dark', 'dark-card', 'dark-surface']],
];
// Texte "role inverse" : texte fonce sur pastille/bouton clair, ou texte clair
// sur bouton fonce (boutons .btn-gold / .btn-red, seuil texte 4.5:1).
const INVERSE_PAIRS = [
  ['dark on gold (texte du bouton .btn-gold)', 'dark', 'gold'],
  ['white on red (bouton .btn-red, 1er stop degrade)', 'white', 'red'],
  ['white on red-bright (bouton .btn-red, 2e stop degrade)', 'white', 'red-bright'],
];

// --green/--blue ne portent jamais de texte blanc dessus dans le code reel : ce
// sont des pastilles/points/pistes de toggle (composants non textuels, seuil
// 3:1 vis-a-vis de la surface autour, cf. WCAG 1.4.11).
const BORDER_PAIRS = [
  ['dark-border sur dark-card (bordures de champs/cartes)', 'dark-border', 'dark-card'],
  ['gold sur dark-card (focus / etat actif)', 'gold', 'dark-card'],
  ['green (pastille/toggle) sur dark-surface', 'green', 'dark-surface'],
  ['blue (pastille/legende) sur dark-surface', 'blue', 'dark-surface'],
  ['white (bouton toggle .on, sur track green)', 'white', 'green'],
];

const TEXT_THRESHOLD = 4.5;
const BORDER_THRESHOLD = 3;

function runTheme(themeName, vars) {
  const v = makeV(vars);
  const rows = [];
  let failed = false;

  for (const [role, bgs] of TEXT_PAIRS) {
    for (const bg of bgs) {
      const ratio = contrastRatio(v(role), v(bg));
      const ok = ratio >= TEXT_THRESHOLD;
      if (!ok) failed = true;
      rows.push({ label: `${role} sur ${bg}`, fg: v(role), bg: v(bg), ratio, threshold: TEXT_THRESHOLD, ok });
    }
  }
  for (const [label, fg, bg] of INVERSE_PAIRS) {
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

  console.log(`\nVerification des contrastes WCAG - BeeMyBlood donor (theme ${themeName})\n`);
  for (const r of rows) {
    const status = r.ok ? 'OK  ' : 'FAIL';
    console.log(
      `[${status}] ${r.label.padEnd(55)} ${r.fg} / ${r.bg}  ${r.ratio.toFixed(2)}:1 (seuil ${r.threshold}:1)`
    );
  }
  return failed;
}

const failedDark = runTheme('sombre (defaut)', rootVars);
const failedLight = runTheme('clair (body.light-mode)', lightVars);

console.log('\n' + ((failedDark || failedLight) ? 'ECHEC : au moins un couple est sous le seuil WCAG.' : 'OK : tous les couples verifies (sombre + clair) respectent le seuil WCAG.'));
process.exit((failedDark || failedLight) ? 1 : 0);
