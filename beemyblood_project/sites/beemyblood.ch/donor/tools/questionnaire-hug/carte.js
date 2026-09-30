// Calcule la carte des zones à remplir du formulaire officiel à partir des positions du texte (positions.json)
// Sortie : carte.json (cases OUI/NON par question, cases d'options, zones de texte, en-tête)
const fs = require('fs');
const { PDFDocument, StandardFonts } = require('pdf-lib');
const pages = require('./positions.json');
const BOX = /[-]/;

(async function(){
  const doc = await PDFDocument.create(), helv = await doc.embedFont(StandardFonts.Helvetica);
  const larg = function(t){ return helv.widthOfTextAtSize(t.replace(/[^\x20-\x7e -ÿ’…–®]/g, '.').replace(/’/g, "'"), 10); };
  // abscisse juste après un repère dans un élément de texte (répartition proportionnelle aux largeurs Helvetica)
  function apres(it, repere){
    const i = it.s.indexOf(repere); if(i < 0) throw new Error('repère « ' + repere + ' » absent de « ' + it.s.slice(0, 50) + ' »');
    let j = i + repere.length; while(it.s[j] === ' ') j++;
    return it.x + it.w * larg(it.s.slice(0, j)) / larg(it.s);
  }
  function avant(it, repere){ const i = it.s.indexOf(repere); if(i < 0) throw new Error('repère ' + repere); return it.x + it.w * larg(it.s.slice(0, i)) / larg(it.s); }
  function trouve(p, y, repere){ let c = pages[p].items.filter(function(i){ return Math.abs(i.y - y) < 1.5 && i.s.indexOf(repere) >= 0; }); if(c.length > 1){ const d = c.filter(function(i){ return i.s.trim().indexOf(repere) === 0; }); if(d.length === 1) c = d; } if(c.length !== 1) throw new Error(c.length + ' élément(s) pour « ' + repere + ' » à y=' + y + ' page ' + (p + 1)); return c[0]; }
  function zone(p, y, repere, fin, finRepere){ // zone de texte après un repère ; fin = abscisse max ou repère suivant dans la même ligne
    const it = trouve(p, y, repere), x = apres(it, repere); let max = typeof fin === 'number' ? fin : it.x + it.w;
    if(finRepere){ const it2 = trouve(p, y, finRepere); max = avant(it2, finRepere) - 3; }
    return { p: p, x: +(x + 1).toFixed(1), y: +(y + 1.8).toFixed(1), max: +max.toFixed(1) };
  }

  const carte = { pages: pages.map(function(pg){ return { w: pg.w, h: pg.h }; }), ouinon: {}, options: {}, texte: {}, entete: {} };

  // ---------- cases OUI / NON, dans l'ordre des questions ----------
  const ORDRE = [['1','2','3','4','5','6a','6b','6c','6d','6e','6f','6g','7a','7b','7c','8a','8b','8c'],
                 ['9','10a','10b','10c','10d','10e','11a','11b','12a','12b','13a','13b','13c','13d','14','15a','15b','15c','15d','15e','15f','15g','16a','16b','17a','17b','18a']];
  pages.forEach(function(pg, p){
    const col = pg.items.filter(function(i){ return BOX.test(i.s) && i.x > 500 && i.y > (p === 1 ? 240 : 0); });
    const oui = col.filter(function(i){ return i.x < 515; }).sort(function(a, b){ return b.y - a.y; }), non = col.filter(function(i){ return i.x >= 515; }).sort(function(a, b){ return b.y - a.y; });
    if(oui.length !== ORDRE[p].length || non.length !== ORDRE[p].length) throw new Error('page ' + (p + 1) + ' : ' + oui.length + ' cases OUI, ' + non.length + ' cases NON pour ' + ORDRE[p].length + ' questions');
    ORDRE[p].forEach(function(q, k){ carte.ouinon[q] = { p: p, y: oui[k].y, oui: oui[k].x, non: non[k].x, w: oui[k].w }; });
  });

  // ---------- cases d'options (page 2) ----------
  const opt = pages[1].items.filter(function(i){ return BOX.test(i.s) && i.x < 500 && i.y > 240; }).sort(function(a, b){ return Math.abs(b.y - a.y) > 1.5 ? b.y - a.y : a.x - b.x; });
  const GROUPES = [['9', 3], ['13a', 13], ['13b', 10], ['14', 8]]; let k = 0;
  GROUPES.forEach(function(g){ carte.options[g[0]] = opt.slice(k, k + g[1]).map(function(i){ return { p: 1, x: i.x, y: i.y, w: i.w }; }); k += g[1]; });
  if(k !== opt.length) throw new Error(opt.length + ' cases d’options au lieu de ' + k);

  // ---------- zones de texte des questions ----------
  const T = carte.texte;
  T['1.quand'] = zone(0, 374.9, 'dernière fois ?', null, 'Où ?'); T['1.ou'] = zone(0, 374.9, 'Où ?');
  T['6a.lesquels'] = zone(0, 283.8, 'lesquels ?');
  T['7c.lesquels'] = zone(0, 109.3, 'lesquels ?', null, 'Quand ?'); T['7c.quand'] = zone(0, 109.3, 'Quand ?');
  T['11a.ou'] = zone(1, 678.6, 'combien de temps ?', null, 'Depuis quand'); T['11a.retour'] = zone(1, 678.6, 'de retour ?');
  T['11b.precisez'] = zone(1, 656.4, 'précisez :');
  T['12a.pays'] = zone(1, 632.0, 'quel pays ?'); T['12a.depuis'] = zone(1, 632.0, 'en Suisse ?');
  T['12b.pays'] = zone(1, 608.2, 'quel pays ?');
  T['13a.quand'] = zone(1, 596.2, 'précisez quand :');
  T['13b.quand'] = zone(1, 555.4, 'précisez quand :'); T['13b.precisez'] = zone(1, 535.0, 'Si oui, précisez');
  T['13d.laquelle'] = zone(1, 500.7, 'laquelle :');
  T['14.quand'] = zone(1, 459.7, 'quand ?', null, 'et où ?'); T['14.ou'] = zone(1, 459.7, 'et où ?');
  T['17b.date'] = zone(1, 261.1, 'partenaire :');
  T['18a.quand'] = zone(1, 247.6, 'dernière fois ?');
  // la zone « dans quel pays » de 12a s'arrête avant « Depuis quand vivez-vous »
  (function(){ const its = pages[1].items.filter(function(i){ return Math.abs(i.y - 632.0) < 1.5; }).sort(function(a, b){ return a.x - b.x; }); const a = its.filter(function(i){ return i.s.indexOf('quel pays ?') >= 0; })[0]; const i = a.s.indexOf('Depuis'); T['12a.pays'].max = +(i >= 0 ? avant(a, 'Depuis') - 3 : a.x + a.w - 3).toFixed(1); })();
  Object.keys(T).forEach(function(c){ if(T[c].max > 500) T[c].max = 500; });

  // ---------- en-tête (page 1) ----------
  const E = carte.entete;
  E.nom = zone(0, 741.6, 'Nom :', 296); E.prenom = zone(0, 741.6, 'Prénom(s) :', 557);
  E.nomNaissance = zone(0, 717.5, 'ssance :', 558);
  E.adresse1 = { p: 0, x: 37, y: 676.7, max: 380 }; E.adresse2 = { p: 0, x: 37, y: 661.2, max: 380 };
  E.telPrive = zone(0, 659.4, 'privé :', 558);
  E.npa = { p: 0, x: 61, y: 645.7, max: 144 }; E.localite = { p: 0, x: 189, y: 645.7, max: 380 }; E.telProf = zone(0, 643.9, 'prof. :', 558);
  E.prof = zone(0, 628.4, 'employeur :', 380); E.tel = zone(0, 628.4, 'mobile :', 558);
  E.medecin = zone(0, 612.9, 'traitant :', 305); E.poids = zone(0, 612.9, 'Poids :', 382); E.taille = zone(0, 612.9, 'cm :', 492);
  E.email = zone(0, 592.9, 'E-mail :', 300);
  const sexe = trouve(0, 722.5, 'M'); E.sexe = { p: 0, y: sexe.y, M: sexe.x, F: avant(sexe, 'F'), brut: sexe };
  E.ddn = { p: 0, y: 719.5, jour: [121, 144], mois: [144, 170], annee: [170, 214] };
  // bas de la page 2 : nom, prénom et date de naissance ; la date et la signature restent à la main
  E.signNom = { p: 1, x: 86, y: 214, max: 330 }; E.signDdn = { p: 1, x: 341, y: 214, max: 405 };

  fs.writeFileSync(__dirname + '/carte.json', JSON.stringify(carte, null, 1));
  console.log('questions', Object.keys(carte.ouinon).length, '· options', JSON.stringify(Object.keys(carte.options).map(function(q){ return q + ':' + carte.options[q].length; })), '· zones', Object.keys(T).length);
  console.log('sexe', JSON.stringify(E.sexe)); console.log('ex.', JSON.stringify(T['1.quand']), JSON.stringify(T['1.ou']), JSON.stringify(E.nom), JSON.stringify(E.tel));
})().catch(function(e){ console.error(e.message); process.exit(1); });
