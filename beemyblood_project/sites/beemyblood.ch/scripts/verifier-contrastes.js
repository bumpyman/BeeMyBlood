#!/usr/bin/env node
// Vérifie les ratios de contraste WCAG des jetons de couleur définis dans theme.css.
// Usage : node scripts/verifier-contrastes.js
// Aucune dépendance externe.

const fs = require('fs');
const path = require('path');

const THEME_CSS = path.join(__dirname, '..', 'theme.css');

function hexToRgb(hex) {
  const h = hex.replace('#', '').trim();
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const int = parseInt(full, 16);
  return { r: (int >> 16) & 255, g: (int >> 8) & 255, b: int & 255 };
}

function relativeLuminance({ r, g, b }) {
  const channel = (c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function contrastRatio(hex1, hex2) {
  const l1 = relativeLuminance(hexToRgb(hex1));
  const l2 = relativeLuminance(hexToRgb(hex2));
  const [lighter, darker] = l1 >= l2 ? [l1, l2] : [l2, l1];
  return (lighter + 0.05) / (darker + 0.05);
}

// Extrait les jetons `--nom: #hex;` d'un bloc :root{...} donné dans un fichier CSS.
function extractTokens(cssText, rootSelectorRegex) {
  const match = cssText.match(rootSelectorRegex);
  if (!match) return {};
  const body = match[1];
  const tokens = {};
  const re = /--([a-z0-9-]+)\s*:\s*(#[0-9a-fA-F]{3,8})\s*;/g;
  let m;
  while ((m = re.exec(body))) {
    tokens[`--${m[1]}`] = m[2];
  }
  return tokens;
}

// Couples à vérifier : [jeton texte/élément, jeton de fond, seuil minimal, description]
const COUPLES = [
  ['--couleur-principale', '--couleur-fond', 4.5, 'Couleur principale sur fond'],
  ['--couleur-principale-survol', '--couleur-fond', 4.5, 'Couleur principale (survol) sur fond'],
  ['--couleur-texte', '--couleur-fond', 7, 'Texte courant sur fond'],
  ['--couleur-texte-secondaire', '--couleur-fond', 4.5, 'Texte secondaire sur fond'],
  ['--couleur-bordure', '--couleur-fond', 3, 'Bordure sur fond'],
  ['--couleur-focus', '--couleur-fond', 3, 'Anneau de focus sur fond'],
  ['--couleur-erreur', '--couleur-fond', 4.5, 'Message d\'erreur sur fond'],
  ['--couleur-succes', '--couleur-fond', 4.5, 'Message de confirmation sur fond'],
  ['--couleur-fonctionnelle', '--couleur-fond', 3, 'États HémoRush sur fond'],
];

function verifierBloc(nomBloc, tokens) {
  console.log(`\n=== ${nomBloc} ===`);
  let ok = true;
  for (const [fgToken, bgToken, min, label] of COUPLES) {
    const fg = tokens[fgToken];
    const bg = tokens[bgToken];
    if (!fg || !bg) {
      console.log(`  ?  ${label} — jeton manquant (${fgToken} ou ${bgToken})`);
      ok = false;
      continue;
    }
    const ratio = contrastRatio(fg, bg);
    const pass = ratio >= min;
    if (!pass) ok = false;
    const status = pass ? 'OK ' : 'FAIL';
    console.log(
      `  ${status} ${label} : ${fgToken}(${fg}) / ${bgToken}(${bg}) = ${ratio.toFixed(2)}:1 (seuil ${min}:1)`
    );
  }
  return ok;
}

function main() {
  const css = fs.readFileSync(THEME_CSS, 'utf8');

  // Un bloc [data-xxx] ne redéfinit qu'une partie des jetons : le reste est hérité
  // de :root par la cascade CSS. On simule cet héritage en fusionnant sur la base.
  const base = extractTokens(css, /:root\s*\{([^}]*)\}/);
  const blocsAVerifier = [
    { nom: 'Thème clair (défaut)', tokens: base },
    {
      nom: 'Contraste renforcé',
      tokens: { ...base, ...extractTokens(css, /:root\[data-contraste="renforce"\]\s*\{([^}]*)\}/) },
    },
    {
      nom: 'Thème sombre',
      tokens: { ...base, ...extractTokens(css, /:root\[data-theme="sombre"\]\s*\{([^}]*)\}/) },
    },
  ];

  let toutOk = true;
  for (const bloc of blocsAVerifier) {
    if (Object.keys(bloc.tokens).length === 0) {
      console.log(`\n=== ${bloc.nom} ===\n  (bloc absent ou vide, ignoré)`);
      continue;
    }
    const ok = verifierBloc(bloc.nom, bloc.tokens);
    toutOk = toutOk && ok;
  }

  console.log('');
  if (!toutOk) {
    console.error('Échec : au moins un couple de couleurs est sous le seuil WCAG requis.');
    process.exit(1);
  }
  console.log('Tous les couples de couleurs vérifiés respectent leur seuil WCAG.');
}

main();
