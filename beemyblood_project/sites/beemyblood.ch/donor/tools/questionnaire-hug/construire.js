// Assemble le module du questionnaire (libellés + carte) et dépose les fichiers dans le site
const fs = require('fs'), path = require('path');
const SITE = path.join(__dirname, '../../assets');
const carte = JSON.parse(fs.readFileSync(path.join(__dirname, 'carte.json'), 'utf8'));
delete carte.entete.sexe.brut;
carte.mention = [9, 4.5]; // hauteur de la mention rouge, sous le cadre de chaque page
const arrondi = JSON.stringify(carte, function(k, v){ return typeof v === 'number' ? +v.toFixed(1) : v; });
let src = fs.readFileSync(path.join(__dirname, 'questionnaire-hug.src.js'), 'utf8');
if(src.indexOf('/*CARTE*/null') < 0) throw new Error('emplacement de la carte introuvable');
src = src.replace('/*CARTE*/null', arrondi);
fs.writeFileSync(path.join(SITE, 'questionnaire-hug.js'), src);
// pdf.js (Mozilla, licence Apache 2.0) : affichage du formulaire dans le navigateur, sans service tiers
const PDFJS = path.join(SITE, 'pdfjs'); fs.mkdirSync(PDFJS, { recursive: true });
['pdf.min.js', 'pdf.worker.min.js'].forEach(function(f){ fs.copyFileSync(path.join(path.dirname(require.resolve('pdfjs-dist/package.json')), 'legacy/build', f), path.join(PDFJS, f)); });
fs.copyFileSync(path.join(path.dirname(require.resolve('pdfjs-dist/package.json')), './LICENSE'), path.join(PDFJS, 'LICENSE'));
console.log('module : ' + src.length + ' caractères, carte : ' + arrondi.length);
