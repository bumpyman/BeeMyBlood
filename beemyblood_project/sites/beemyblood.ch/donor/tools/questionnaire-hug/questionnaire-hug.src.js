/*
 * BeeMyBlood — Questionnaire officiel du Centre de transfusion sanguine des HUG, rempli à l'écran
 *
 * Le document imprimé est le formulaire officiel lui-même (« Inscription au don du sang », ANH-Art7.6v3,
 * 1er février 2026, 4.1.FO.0210-v9.0) : ses deux pages sont affichées telles quelles et les réponses de la
 * personne sont posées par-dessus, dans les cases et sur les lignes prévues, comme au stylo.
 * Le fichier des HUG n'est ni modifié ni recomposé : il est protégé contre la modification et autorise
 * l'impression, c'est donc à l'impression que les réponses sont ajoutées.
 * Une mention rouge en bas de chaque page indique que le formulaire a été rempli avec BeeMyBlood.
 * La date et la signature restent à compléter à la main, au centre.
 *
 * QUESTIONS reprend le libellé exact du formulaire. CARTE donne, en points PDF (origine en bas à gauche),
 * la position des cases et des lignes ; elle est calculée à partir du fichier officiel.
 * Si les HUG publient une nouvelle version, le fichier, les libellés, la carte et l'empreinte se mettent à jour ensemble.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */
(function(racine){
  'use strict';
  var VERSION = 'ANH-Art7.6v3 - 1er fév. 2026 - 4.1.FO.0210-v9.0';
  var FICHIER = 'hug-questionnaire-v01-fev26.pdf';
  var ENCRE = '#0b2a8c', ROUGE = '#c40d0d';

  // Libellés exacts du formulaire. champs : précisions à écrire ; options : cases à cocher dans la question.
  var QUESTIONS = [
    { n:'1', q:'Avez-vous déjà fait un don de sang ?', champs:[{ id:'quand', l:'Si oui, quand pour la dernière fois ?' }, { id:'ou', l:'Où ?' }] },
    { n:'2', q:'Pesez-vous plus de 50 kg ?' },
    { n:'3', q:'Vous sentez-vous actuellement en bonne santé ?' },
    { n:'4', q:'Au cours des 14 jours, avez-vous eu un traitement dentaire ou d’hygiène dentaire ?' },
    { n:'5', q:'Au cours des 4 dernières semaines, avez-vous reçu des soins médicaux ou eu de la fièvre à plus de 38°C ou d’autres maladies légères telles que diarrhée, rhume ?' },
    { n:'6a', q:'Au cours des 4 dernières semaines, avez-vous pris des médicaments – même en l’absence de prescription médicale (p.ex. comprimés, injections, suppositoires) ?', champs:[{ id:'lesquels', l:'Si oui, lesquels ?' }] },
    { n:'6b', q:'Au cours des 4 dernières semaines, avez-vous pris des médicaments contre l’hyperplasie prostatique ou la chute des cheveux (p.ex. Proscar®, Finasterid-Mepha Procapil®, Finacapil® ou Propecia®) ou contre l’acné/eczéma (p.ex. Roaccutan®, Curakne®, Isotretinoin®, Tretinac® ou Toctino®) ou contre la dépression (médicaments contenant du lithium, p.ex. Lithiofor®) ou la migraine (p.ex. Topamax®) ou contre les troubles bipolaires (p.ex. Convulex® ou Tegretol®) ?' },
    { n:'6c', q:'Au cours des 2 derniers mois, avez-vous pris des médicaments contre l’endométriose (p.ex. Lucrin Depot®)' },
    { n:'6d', q:'Au cours des 4 derniers mois, avez-vous pris une thérapie antirétrovirale PEP/PrEP (VIH) (p.ex. Truvada®, Isentress®, Prezista®/Norvir®) ou reçu des médicaments fabriqués à partir de sang ?' },
    { n:'6e', q:'Au cours des 6 derniers mois, avez-vous pris des médicaments contre l’hyperplasie prostatique (p.ex. Avodart®, Duodart®) ?' },
    { n:'6f', q:'Au cours des 6 mois, avez-vous reçu des cytostatiques p.ex. du Méthotrexate® contre le psoriasis ou l’arthrite ?' },
    { n:'6g', q:'Au cours des 3 dernières années, avez-vous pris du Neotigason®, Acicutan® (psoriasis) ou Erivedge® (carcinome basocellulaire)' },
    { n:'7a', q:'Avez-vous reçu une immunothérapie (cellules ou sérum d’origine humaine ou animale) ?' },
    { n:'7b', q:'Au cours des 12 derniers mois, avez-vous été vacciné(e) contre la rage ou le tétanos ?' },
    { n:'7c', q:'Au cours des 4 dernières semaines, avez-vous reçu d’autres vaccins ?', champs:[{ id:'lesquels', l:'Si oui, lesquels ?' }, { id:'quand', l:'Quand ?' }] },
    { n:'8a', intro:'8. Présentez-vous ou avez-vous présenté les symptômes ou les maladies suivantes ?', q:'Affection cardio-vasculaire ou pulmonaire (p.ex. problème de pression artérielle, infarctus, problèmes respiratoires, accident vasculaire cérébral (AVC), accident ischémique transitoire (AIT), perte de conscience) ?' },
    { n:'8b', q:'Maladie de la peau (p.ex. blessure, éruption, eczéma, bouton de fièvre) ou affections allergiques (p.ex. rhume des foins, asthme, allergie médicamenteuse) ?' },
    { n:'8c', q:'Autres maladies (p.ex. diabète, maladie du sang, de la coagulation, affection vasculaire, affection rénale, maladie nerveuse, épilepsie, cancer, ostéoporose) ?' },
    { n:'9', q:'Au cours des 3 dernières années ou depuis votre dernier don de sang, avez-vous', options:['séjourné à l’hôpital ?', 'eu un accident ?', 'été opéré(e) ?'] },
    { n:'10a', q:'Avez-vous reçu une greffe de tissu humain ou animal ou une transplantation d’organe ?' },
    { n:'10b', q:'Avez-vous subi une opération du cerveau ou de la moelle épinière à l’étranger ?' },
    { n:'10c', q:'Avez-vous été traité(e) par hormone de croissance ou reçu des injections d’hormones pour traiter l’infertilité avant le 01.01.1986 ?' },
    { n:'10d', q:'Vous, ou un membre de votre famille, êtes-vous susceptible d’être atteint(e) par la maladie de Creutzfeldt-Jakob ? Merci de le signaler même en cas de doute.' },
    { n:'10e', q:'Au cours des 4 derniers mois, ou depuis votre dernier don de sang, avez-vous bénéficié d’une transfusion sanguine ?' },
    { n:'11a', q:'Au cours des 6 derniers mois, avez-vous voyagé hors de la Suisse ?', champs:[{ id:'ou', l:'Si oui, où et pour combien de temps ?' }, { id:'retour', l:'Depuis quand êtes-vous de retour ?' }] },
    { n:'11b', q:'Avez-vous présenté des symptômes sur place ou depuis votre retour (p. ex. fièvre) ?', champs:[{ id:'precisez', l:'Si oui, précisez :' }] },
    { n:'12a', q:'Êtes-vous né(e) hors de la Suisse, y avez-vous grandi ou vécu pendant plus de 6 mois ?', champs:[{ id:'pays', l:'Si oui, dans quel pays ?' }, { id:'depuis', l:'Depuis quand vivez-vous en Suisse ?' }] },
    { n:'12b', q:'Votre mère est-elle née dans un pays extra-européen, y a-t-elle grandi ou vécu pendant plus de 6 mois ?', champs:[{ id:'pays', l:'Si oui, dans quel pays ?' }] },
    { n:'13a', q:'Avez-vous présenté l’une des maladies suivantes :', options:['Toxoplasmose', 'Mononucléose infectieuse', 'Amibiase', 'Shigellose', 'FSME - Méningo-encéphalite à tiques', 'Bilharziose', 'Gonorrhée', 'Ostéomyélite', 'Fièvre rhumatismale', 'Tuberculose', 'Fièvre récurrente', 'Fièvre Q', 'Syndrome de Guillain-Barré ?'], champs:[{ id:'quand', l:'Si oui, précisez quand :' }] },
    { n:'13b', q:'Avez-vous déjà présenté l’une des maladies suivantes :', options:['Paludisme/Malaria', 'Chagas', 'Brucellose', 'Echinococcose', 'Leishmaniose', 'Lymphogranulome vénérien', 'Filariose', 'Babésiose', 'Ebola', 'ou d’autres infections graves ?'], champs:[{ id:'quand', l:'Si oui, précisez quand :' }, { id:'precisez', l:'Autres infections graves : si oui, précisez' }] },
    { n:'13c', q:'Au cours des 4 dernières semaines, avez-vous été piqué(e) par une tique ?' },
    { n:'13d', q:'Au cours des 4 dernières semaines, avez-vous eu un contact avec une personne qui a ou a eu une maladie infectieuse ?', champs:[{ id:'laquelle', l:'Si oui, précisez laquelle :' }] },
    { n:'14', q:'Au cours des 4 derniers mois, avez-vous eu :', options:['un tatouage', 'une gastro-coloscopie', 'utilisation de sangsues', 'un piercing', 'un traitement par acupuncture', 'une épilation électrique', 'un maquillage permanent ou Microblading', 'un contact avec du sang étranger (blessure par piqûre d’aiguille, éclaboussures de sang ayant atteint les yeux, la bouche ou d’autres parties du corps) ?'], champs:[{ id:'quand', l:'Si oui, quand ?' }, { id:'ou', l:'et où ?' }] },
    { n:'15a', intro:'15. Est-ce qu’une ou plusieurs situations à risque suivantes s’appliquent à vous ?', q:'Nouveau ou changement de partenaire sexuel(le) au cours des 4 derniers mois' },
    { n:'15b', q:'Rapport/s sexuel/s (protégé ou non) avec plus de deux personnes au cours des 4 derniers mois' },
    { n:'15c', q:'Rapport/s sexuel/s sous l’influence de drogues de synthèse au cours des 12 derniers mois' },
    { n:'15d', q:'Rapport/s sexuel/s pour lesquels vous avez reçu de l’argent ou d’autres prestations (drogues ou médicaments) au cours des 12 derniers mois' },
    { n:'15e', q:'Injection de drogue' },
    { n:'15f', q:'Avez-vous déjà contracté pour le HIV (sida) ou la jaunisse (Hépatite B ou C) ou déjà été testé positif pour ces virus ?' },
    { n:'15g', q:'Avez-vous déjà eu la Syphilis ?' },
    { n:'16a', q:'Votre partenaire de vie, sexuel(le) ou de logement a-t-il/elle été atteint(e) une jaunisse (hépatite B ou C) au cours des 6 derniers mois ?' },
    { n:'16b', q:'Votre partenaire sexuel(le) a-t-il/elle contracté le virus Zika au cours des 3 derniers mois ?' },
    { n:'17a', q:'Au cours des 12 derniers mois, avez-vous eu des rapports sexuels avec un(e) partenaire qui a été exposé(e) à une situation à risque selon les questions 15 et/ou 16 ?' },
    { n:'17b', q:'Au cours des 4 derniers mois, avez-vous eu des rapports sexuels avec un(e) partenaire qui a séjournée plus de 6 mois dans un pays où le taux de l’infection aux virus HIV, hépatite B (HBV) ou C (HBC) est élevé ou y a reçu une transfusion sanguine ?', champs:[{ id:'date', l:'Date de retour du partenaire :' }] },
    { n:'18a', q:'Si cela vous concerne : Avez-vous déjà été enceinte ?', champs:[{ id:'quand', l:'Si oui, quand pour la dernière fois ?' }], facultatif:true }
  ];

  var CARTE = /*CARTE*/null;

  function dateFr(iso){ var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || ''); return m ? { j:m[3], m:m[2], a:m[1], texte:m[3] + '.' + m[2] + '.' + m[1] } : null; }
  function net(t){ return String(t == null ? '' : t).replace(/\s+/g, ' ').trim(); }

  /**
   * Traduit les réponses en tracés à poser sur chaque page du formulaire.
   * d : { nom, prenom, ddn (AAAA-MM-JJ), sexe (M|F), nomNaissance, adresse, npa, localite, telPrive, telProf, tel, prof,
   *       medecin, poids, taille, email, rep:{'1':'OUI'|'NON',…}, txt:{'1.quand':…}, coche:{'9':[0,2],…} }
   * Renvoie un tableau par page : { k:'t', x, y, s, max, t } texte · { k:'x', x, y, w } croix · { k:'e', cx, cy, rx, ry } ovale.
   */
  function calque(d){
    var pages = CARTE.pages.map(function(){ return []; }), E = CARTE.entete, ddn = dateFr(d.ddn);
    function ecrire(z, texte, taille){ var t = net(texte); if(t && z) pages[z.p].push({ k:'t', x:z.x, y:z.y, s:taille || 9, max:z.max - z.x, t:t }); }
    function centre(p, bornes, y, texte){ pages[p].push({ k:'t', x:(bornes[0] + bornes[1]) / 2, y:y, s:10, max:bornes[1] - bornes[0] - 2, t:texte, milieu:1 }); }
    function croix(c){ pages[c.p].push({ k:'x', x:c.x, y:c.y, w:c.w }); }

    // en-tête
    ecrire(E.nom, d.nom, 10); ecrire(E.prenom, d.prenom, 10); ecrire(E.nomNaissance, d.nomNaissance, 10);
    if(ddn){ centre(0, E.ddn.jour, E.ddn.y, ddn.j); centre(0, E.ddn.mois, E.ddn.y, ddn.m); centre(0, E.ddn.annee, E.ddn.y, ddn.a); }
    if(d.sexe === 'M' || d.sexe === 'F') pages[0].push({ k:'e', cx:E.sexe[d.sexe] + (d.sexe === 'M' ? 3.75 : 2.75), cy:E.sexe.y + 3.3, rx:6.4, ry:6.6 }); // « merci d'ENTOURER la réponse »
    var adr = net(d.adresse), l1 = adr, l2 = '';
    if(adr.length > 62){ var coupe = adr.lastIndexOf(' ', 62); if(coupe < 20) coupe = 62; l1 = adr.slice(0, coupe); l2 = adr.slice(coupe).trim(); } // adresse longue : seconde ligne
    ecrire(E.adresse1, l1); ecrire(E.adresse2, l2);
    ecrire(E.npa, d.npa); ecrire(E.localite, d.localite); ecrire(E.telPrive, d.telPrive); ecrire(E.telProf, d.telProf); ecrire(E.tel, d.tel);
    ecrire(E.prof, d.prof); ecrire(E.medecin, d.medecin); ecrire(E.poids, d.poids ? d.poids + ' kg' : ''); ecrire(E.taille, d.taille); ecrire(E.email, d.email);

    // questions
    var rep = d.rep || {}, txt = d.txt || {}, coche = d.coche || {};
    QUESTIONS.forEach(function(q){
      var c = CARTE.ouinon[q.n], r = rep[q.n]; if(!c) return;
      if(r === 'OUI') croix({ p:c.p, x:c.oui, y:c.y, w:c.w }); else if(r === 'NON') croix({ p:c.p, x:c.non, y:c.y, w:c.w });
      if(r !== 'OUI') return; // précisions et options : seulement pour une réponse « oui »
      (q.champs || []).forEach(function(ch){ ecrire(CARTE.texte[q.n + '.' + ch.id], txt[q.n + '.' + ch.id]); });
      (coche[q.n] || []).forEach(function(i){ var o = (CARTE.options[q.n] || [])[i]; if(o) croix(o); });
    });

    // bas de la seconde page : identité ; la date et la signature se complètent à la main
    ecrire(E.signNom, [d.nom, d.prenom].filter(Boolean).join(', '), 10); if(ddn) ecrire(E.signDdn, ddn.texte, 10);

    // mention en bas de chaque page
    var mnt = new Date(), quand = ('0' + mnt.getDate()).slice(-2) + '.' + ('0' + (mnt.getMonth() + 1)).slice(-2) + '.' + mnt.getFullYear();
    pages.forEach(function(pg, i){ pg.push({ k:'t', x:CARTE.pages[i].w / 2, y:CARTE.mention[i], s:6.5, max:CARTE.pages[i].w - 40, milieu:1, rouge:1, gras:1,
      t:'Formulaire officiel du Centre de transfusion sanguine des HUG, rempli par le donneur avec BeeMyBlood le ' + quand + ' · beemyblood.ch · date et signature à compléter à la main' }); });
    return pages;
  }

  function esc(s){ return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  /** Calque SVG d'une page, aux dimensions du formulaire (l'axe vertical du PDF monte, celui du SVG descend). */
  function svg(traces, p){
    var W = CARTE.pages[p].w, H = CARTE.pages[p].h, n = function(v){ return (+v).toFixed(2); };
    var h = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="none" aria-hidden="true">';
    traces.forEach(function(t){
      if(t.k === 't') h += '<text x="' + n(t.x) + '" y="' + n(H - t.y) + '" font-family="Arial, Helvetica, \'Liberation Sans\', sans-serif" font-size="' + t.s + '" fill="' + (t.rouge ? ROUGE : ENCRE) + '"' + (t.gras ? ' font-weight="700"' : '') + (t.milieu ? ' text-anchor="middle"' : '') + ' data-max="' + n(t.max) + '">' + esc(t.t) + '</text>';
      else if(t.k === 'x'){ // la case est un carré d'environ 0,7 w posé sur la ligne de base du glyphe
        var g = t.x + t.w * 0.10 + 0.9, dr = t.x + t.w * 0.80 - 0.9, b = H - (t.y - t.w * 0.02) - 0.9, ht = H - (t.y + t.w * 0.70) + 0.9, a = ' stroke="' + ENCRE + '" stroke-width="1.15" stroke-linecap="round"/>';
        h += '<line x1="' + n(g) + '" y1="' + n(b) + '" x2="' + n(dr) + '" y2="' + n(ht) + '"' + a + '<line x1="' + n(g) + '" y1="' + n(ht) + '" x2="' + n(dr) + '" y2="' + n(b) + '"' + a;
      }
      else if(t.k === 'e') h += '<ellipse cx="' + n(t.cx) + '" cy="' + n(H - t.cy) + '" rx="' + t.rx + '" ry="' + t.ry + '" fill="none" stroke="' + ENCRE + '" stroke-width="1.1"/>';
    });
    return h + '</svg>';
  }
  /** Après insertion dans la page : un texte plus large que sa ligne est réduit, puis resserré s'il le faut. */
  function ajuster(racineSvg){
    racineSvg.querySelectorAll('text[data-max]').forEach(function(el){
      var max = +el.getAttribute('data-max'), l = el.getComputedTextLength(); if(!l || l <= max) return;
      var s = +el.getAttribute('font-size'), s2 = Math.max(5.5, s * max / l); el.setAttribute('font-size', s2.toFixed(2));
      if(el.getComputedTextLength() > max){ el.setAttribute('textLength', max.toFixed(1)); el.setAttribute('lengthAdjust', 'spacingAndGlyphs'); }
    });
  }

  var api = { VERSION:VERSION, FICHIER:FICHIER, QUESTIONS:QUESTIONS, CARTE:CARTE, calque:calque, svg:svg, ajuster:ajuster };
  if(typeof module !== 'undefined' && module.exports) module.exports = api; else racine.BeeQuestionnaireHUG = api;
})(typeof window !== 'undefined' ? window : this);
