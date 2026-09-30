/*
 * BeeMyBlood — Profil de la personne (espaces donneur et receveur)
 * L’espace affiche les données que la personne saisit elle-même, juste après le tutoriel d’accueil.
 * Les données restent dans le navigateur. Une personne connectée les retrouve sur ses autres appareils (fonctions Supabase profil_lire / profil_enregistrer).
 * Inclure après acces.js : <script src="profil.js" data-espace="donneur" defer></script>
 * Affichage : tout élément portant data-profil="champ" reçoit la valeur correspondante ; data-profil-vide="texte" fixe le texte affiché quand le champ est vide.
 * Mode démonstration : les blocs fictifs portent data-demo et restent masqués tant que la personne ne l’active pas
 * (BeeProfil.demo.definir(true), ou tout élément portant data-bmb-demo="on" / "off"). Les blocs construits sur les données réelles portent data-reel.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */
(function(){
  'use strict';
  var script = document.currentScript || document.querySelector('script[src*="profil.js"]');
  var ESPACE = (script && script.getAttribute('data-espace')) || 'donneur';
  var TU = ESPACE === 'donneur';
  var GROUPES = ['O−','O+','A−','A+','B−','B+','AB−','AB+'];
  // Phénotype étendu : antigènes des systèmes Rhésus, Kell, Duffy, Kidd et MNS, tels qu’ils figurent sur une carte de groupe
  var PHENO = [['Rhésus',[['C','C'],['c','c'],['E','E'],['e','e']]],['Kell',[['K','K']]],['Duffy',[['Fya','Fyᵃ'],['Fyb','Fyᵇ']]],['Kidd',[['Jka','Jkᵃ'],['Jkb','Jkᵇ']]],['MNS',[['S','S'],['s','s']]]];
  var CHAMPS = {
    donneur: [
      { id:'prenom', l:'Prénom', t:'text', req:1, ac:'given-name' },
      { id:'nom', l:'Nom', t:'text', ac:'family-name', aide:'Facultatif. Il préremplit le questionnaire médical.' },
      { id:'pseudo', l:'Pseudonyme', t:'text', aide:'Affiché à la place de ton nom dans les défis.' },
      { id:'naissance', l:'Date de naissance', t:'naissance', ac:'bday', aide:'Au format JJ.MM.AAAA, par exemple 07.03.1998. Elle préremplit le questionnaire médical.' },
      { id:'sexe', l:'Sexe', t:'select', o:[['','Je préfère ne pas répondre'],['F','Femme'],['H','Homme']], aide:'Il fixe le délai entre deux dons : quatre mois pour une femme, trois pour un homme.' },
      { id:'groupe', l:'Groupe sanguin', t:'select', o:[['','Je ne le connais pas encore']].concat(GROUPES.map(function(g){ return [g,g]; })) },
      { id:'commune', l:'Commune ou code postal', t:'text', ac:'postal-code', aide:'Pour te proposer les collectes proches.' },
      { id:'dejaDonne', l:'As-tu déjà donné ton sang ?', t:'select', req:1, o:[['','Choisir'],['non','Pas encore'],['oui','Oui']] },
      { id:'nbDons', l:'Dons effectués avant d’utiliser BeeMyBlood', t:'number', min:0, max:400, si:'dejaDonne', aide:'Les dons que tu enregistres ensuite dans « Mes dons » s’ajoutent à ce nombre.' },
      { id:'dernierDon', l:'Date du dernier don', t:'date', si:'dejaDonne' },
      { id:'premierAn', l:'Année du premier don', t:'number', min:1950, max:2100, si:'dejaDonne' },
      { id:'pheno', l:'Phénotype étendu', t:'pheno', aide:'Facultatif. Il figure sur ta carte de donneur à partir de quelques dons. Laisse vide ce que tu ne connais pas.' },
      { id:'alerteGroupe', l:'M’avertir quand mon groupe est recherché', t:'check' },
      { id:'rappels', l:'Me rappeler la date à partir de laquelle je peux redonner', t:'check' }
    ],
    receveur: [
      { id:'prenom', l:'Prénom', t:'text', req:1, ac:'given-name' },
      { id:'nom', l:'Nom', t:'text', ac:'family-name' },
      { id:'naissance', l:'Date de naissance', t:'naissance', ac:'bday', aide:'Au format JJ.MM.AAAA, par exemple 07.03.1998.' },
      { id:'pathologie', l:'Maladie suivie', t:'select', o:[['','Choisir'],['Drépanocytose','Drépanocytose'],['Thalassémie β majeure','Thalassémie β majeure'],['Thalassémie intermédiaire','Thalassémie intermédiaire'],['Autre maladie du sang','Autre maladie du sang'],['Autre','Autre']] },
      { id:'groupe', l:'Groupe sanguin', t:'select', o:[['','Je ne le connais pas']].concat(GROUPES.map(function(g){ return [g,g]; })) },
      { id:'pheno', l:'Phénotype étendu', t:'pheno', aide:'Facultatif. Il figure sur votre carte de groupe sanguin ou dans votre dossier transfusionnel. Laissez vide ce que vous ne connaissez pas.' },
      { id:'anticorps', l:'Anticorps connus', t:'text', aide:'Par exemple anti-E, anti-K. Votre carte de groupe ou votre hématologue les indique.' },
      { id:'medecin', l:'Médecin ou service référent', t:'text', aide:'Nom et numéro de téléphone, pour votre carte d’urgence.' },
      { id:'centre', l:'Centre de suivi', t:'text', aide:'Par exemple HUG, CHUV.' },
      { id:'rythme', l:'Rythme des transfusions, en semaines', t:'number', min:1, max:52 },
      { id:'prochaine', l:'Prochaine transfusion prévue', t:'date' },
      { id:'urgence', l:'Personne à prévenir', t:'text', aide:'Nom et numéro de téléphone.' }
    ]
  };
  var champs = CHAMPS[ESPACE] || CHAMPS.donneur;
  var ID_CHAMPS = {}; champs.forEach(function(c){ ID_CHAMPS[c.id] = 1; });

  // ---------- Mode démonstration ----------
  try{ if(localStorage.getItem('bmb-demo') === '1') document.documentElement.classList.add('bmb-demo'); }catch(e){}
  var demo = {
    actif: function(){ return document.documentElement.classList.contains('bmb-demo'); },
    definir: function(on){ try{ if(on) localStorage.setItem('bmb-demo','1'); else localStorage.removeItem('bmb-demo'); }catch(e){} location.reload(); }
  };
  (function(){ // règles d’affichage, aussi présentes dans les feuilles de style des espaces pour s’appliquer dès le chargement
    var s = document.createElement('style'); s.id = 'bmb-demo-css';
    s.textContent = 'html:not(.bmb-demo) [data-demo]{display:none!important}html.bmb-demo [data-reel]{display:none!important}'
      + '.bmb-demo-bandeau{display:flex;align-items:center;justify-content:center;gap:10px;flex-wrap:wrap;margin:0 0 14px;padding:10px 14px;border-radius:12px;border:1px dashed #E8D5A3;background:rgba(232,213,163,.1);color:inherit;font-size:14px;line-height:1.45;text-align:center}'
      + '.bmb-demo-bandeau button{min-height:40px;padding:8px 14px;border-radius:10px;border:1px solid #C8A960;background:#C8A960;color:#12121e;font:inherit;font-size:14px;font-weight:700;cursor:pointer}';
    document.head.appendChild(s);
  })();
  function bandeau(){
    if(!demo.actif() || document.querySelector('.bmb-demo-bandeau')) return;
    var hote = document.querySelector('[data-demo-bandeau]') || document.querySelector('.view.active') || document.querySelector('main') || document.body;
    var b = document.createElement('div'); b.className = 'bmb-demo-bandeau'; b.setAttribute('role','status');
    b.innerHTML = '<span>🎭 <strong>Mode démonstration.</strong> Les personnes, les chiffres et les événements affichés sont fictifs.'+(TU ? ' Les stocks et les collectes marqués « officiel » restent réels.' : '')+'</span><button type="button" data-bmb-demo="off">Revenir à mes données</button>';
    hote.insertBefore(b, hote.firstChild);
  }

  // ---------- Stockage ----------
  function courriel(){ try{ var e = window.BeeAcces && window.BeeAcces.etat && window.BeeAcces.etat(); return (e && e.email) || ''; }catch(x){ return ''; } }
  function cle(qui){ return 'bmb-profil:' + ESPACE + ':' + (qui || 'local'); }
  function lireCle(k){ try{ var v = localStorage.getItem(k); return v ? JSON.parse(v) : null; }catch(e){ return null; } }
  function lire(){ var e = courriel(); return (e && lireCle(cle(e))) || lireCle(cle()) || {}; }
  function ecrire(p){
    p.maj = new Date().toISOString();
    try{ localStorage.setItem(cle(), JSON.stringify(p)); var e = courriel(); if(e) localStorage.setItem(cle(e), JSON.stringify(p)); }catch(x){}
    serveur('profil_enregistrer', { p_espace:ESPACE, p_donnees:p });
    return p;
  }
  function serveur(fn, args){
    try{
      var sb = window.BeeAcces && window.BeeAcces.client && window.BeeAcces.client();
      if(!sb || !courriel()) return Promise.resolve(null);
      return sb.rpc(fn, args).then(function(r){ return r && !r.error ? r.data : null; }, function(){ return null; });
    }catch(e){ return Promise.resolve(null); }
  }
  function complet(){ var p = lire(); return champs.filter(function(c){ return c.req; }).every(function(c){ return p[c.id] !== undefined && p[c.id] !== ''; }); }

  // ---------- Valeurs calculées ----------
  function dateFr(d, court){ d = new Date(d); return isNaN(d) ? '' : d.toLocaleDateString('fr-CH', court ? { day:'numeric', month:'long' } : { day:'numeric', month:'long', year:'numeric' }); }
  function phenoTexte(ph){
    if(!ph) return '';
    var s = function(k){ return ph[k] === '+' ? '+' : ph[k] === '-' ? '−' : ''; }, out = [];
    var suite = function(ks){ return ks.filter(s).map(function(k){ return k + s(k); }).join(' '); };
    var paire = function(nom, a, b){ if(s(a) || s(b)) out.push(nom + '(' + [s(a) ? 'a' + s(a) : '', s(b) ? 'b' + s(b) : ''].filter(Boolean).join(' ') + ')'); };
    if(suite(['C','c','E','e'])) out.push(suite(['C','c','E','e']));
    if(s('K')) out.push('K' + s('K'));
    paire('Fy','Fya','Fyb'); paire('Jk','Jka','Jkb');
    if(suite(['S','s'])) out.push(suite(['S','s']));
    return out.join(' · ');
  }
  function phenoNote(p){
    var ph = p.pheno || {}, n = [];
    if(ph.Fya === '-' && ph.Fyb === '-') n.push('Fy(a− b−) est un profil rare en Europe et fréquent chez les personnes d’origine africaine. Il est recherché pour les personnes atteintes de drépanocytose qui reçoivent des transfusions régulières.');
    if(/\+$/.test(p.groupe || '') && ph.C === '-' && ph.E === '-' && ph.c === '+' && ph.e === '+') n.push('Le profil Rhésus D+ C− E− c+ e+, appelé Ro, est lui aussi très demandé pour ces patients.');
    return n.join(' ');
  }
  // Date de naissance : enregistrée au format AAAA-MM-JJ. Les profils créés avant ce champ ne contiennent que l’année.
  function naissTexte(v){ var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v || ''); return m ? m[3] + '.' + m[2] + '.' + m[1] : ''; }
  function naissIso(t){
    var m = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(t || ''); if(!m) return '';
    var j = +m[1], mo = +m[2], a = +m[3], d = new Date(a, mo - 1, j);
    if(d.getFullYear() !== a || d.getMonth() !== mo - 1 || d.getDate() !== j || a < 1900 || d > new Date()) return '';
    return m[3] + '-' + m[2] + '-' + m[1];
  }
  // Masque de saisie JJ.MM.AAAA : seuls les chiffres sont gardés, les points se placent d’eux-mêmes, « 7. » devient « 07. »
  function masqueDate(el, ev){
    var efface = ev && /^delete/.test(ev.inputType || ''), fin = /\D$/.test(el.value), parts = el.value.split(/\D+/).filter(function(x, i, l){ return x !== '' || i < l.length - 1; }).slice(0, 3);
    parts = parts.map(function(x, i){ return (i < 2 && x.length === 1 && (i < parts.length - 1 || fin)) ? '0' + x : x; });
    var c = parts.join('').slice(0, 8), t = c.slice(0, 2);
    if(c.length > 2 || (c.length === 2 && !efface)) t += '.' + c.slice(2, 4);
    if(c.length > 4 || (c.length === 4 && !efface)) t += '.' + c.slice(4);
    if(t !== el.value) el.value = t;
  }
  function valeurs(){
    var p = lire(), v = {}, an = new Date().getFullYear();
    Object.keys(p).forEach(function(k){ v[k] = p[k]; });
    v.nomComplet = [p.prenom, p.nom].filter(Boolean).join(' ');
    v.initiales = ((p.prenom||'').charAt(0) + (p.nom||'').charAt(0)).toUpperCase();
    v.affichage = p.pseudo || p.prenom || '';
    var nm = /^(\d{4})(?:-(\d{2})-(\d{2}))?$/.exec(p.naissance || ''); v.age = '';
    if(nm){ var age = an - (+nm[1]), auj = new Date(); if(nm[2] && (auj.getMonth() + 1 < +nm[2] || (auj.getMonth() + 1 === +nm[2] && auj.getDate() < +nm[3]))) age--; v.age = age + ' ans'; v.naissanceTexte = naissTexte(p.naissance); }
    v.phenoTexte = phenoTexte(p.pheno);
    if(ESPACE === 'donneur'){
      // dons : ceux d’avant BeeMyBlood (déclarés dans le profil) et ceux enregistrés ensuite dans « Mes dons »
      var ds = (p.dons || []).map(function(x){ return x.d; }).filter(Boolean);
      var base = p.dejaDonne === 'oui' ? (p.nbDons !== undefined && p.nbDons !== '' ? (+p.nbDons || 0) : 1) : 0;
      var n = (p.dejaDonne || ds.length) ? base + ds.filter(function(d){ return d !== p.dernierDon; }).length : '';
      v.nbDons = n === '' ? '' : String(n);
      v.vies = n === '' ? '' : (n ? '~' + (n*3) : '0');
      var fem = p.sexe === 'F', masc = p.sexe === 'H', aDonne = p.dejaDonne === 'oui' || ds.length > 0;
      v.statut = aDonne ? (fem ? 'Donneuse active' : masc ? 'Donneur actif' : 'Donneur·se actif·ve') : (p.dejaDonne === 'non' ? (fem ? 'Future donneuse' : masc ? 'Futur donneur' : 'Futur·e donneur·se') : '');
      var dates = ds.concat(p.dernierDon && p.dejaDonne === 'oui' ? [p.dernierDon] : []).sort();
      if(dates.length){
        var dernier = dates[dates.length - 1], d = new Date(dernier); d.setMonth(d.getMonth() + (masc ? 3 : 4));
        v.dernierDonIso = dernier;
        v.prochainDon = dateFr(d);
        v.prochainDonJours = String(Math.max(0, Math.ceil((d - new Date()) / 86400000)));
        v.dernierDonTexte = dateFr(dernier);
      }
      // ancienneté : depuis le premier don connu
      var premier = dates.length ? new Date(dates[0]) : null, anPremier = +p.premierAn || 0;
      if(anPremier && p.dejaDonne === 'oui' && (!premier || anPremier < premier.getFullYear())){
        var a = an - anPremier; if(a >= 1){ v.ancienneteNb = String(a); v.ancienneteUnite = a > 1 ? 'ans' : 'an'; }
      } else if(premier){
        var m = (an - premier.getFullYear()) * 12 + (new Date().getMonth() - premier.getMonth());
        if(m >= 24){ v.ancienneteNb = String(Math.floor(m / 12)); v.ancienneteUnite = 'ans'; } else if(m >= 1){ v.ancienneteNb = String(m); v.ancienneteUnite = 'mois'; }
      }
      v.anciennete = v.ancienneteNb ? v.ancienneteNb + ' ' + v.ancienneteUnite + ' de don' : '';
      v.phenoNote = phenoNote(p);
      v.resume = [v.age, p.commune, v.statut].filter(Boolean).join(' · ');
      v.groupeTexte = p.groupe || 'à découvrir à ton premier don';
    } else {
      v.prochaineTexte = p.prochaine ? dateFr(p.prochaine, true) : '';
      if(p.prochaine) v.prochaineJours = String(Math.max(0, Math.ceil((new Date(p.prochaine) - new Date()) / 86400000)));
      v.resume = [v.age, p.pathologie].filter(Boolean).join(' · ');
      v.groupeComplet = [p.groupe, v.phenoTexte].filter(Boolean).join(' · ');
    }
    return v;
  }
  function appliquer(){
    bandeau();
    document.querySelectorAll('[data-bmb-demo-case]').forEach(function(c){ c.checked = demo.actif(); });
    if(demo.actif()) return; // le persona de démonstration reste affiché tel quel
    var v = valeurs(), rempli = Object.keys(lire()).length > 0;
    document.querySelectorAll('[data-profil]').forEach(function(el){
      var k = el.getAttribute('data-profil'), val = v[k];
      if(val === undefined || val === ''){ el.textContent = el.getAttribute('data-profil-vide') || ''; return; }
      if(el.hasAttribute('data-profil-attr')) el.setAttribute(el.getAttribute('data-profil-attr'), val); else el.textContent = val;
    });
    document.querySelectorAll('[data-profil-demo]').forEach(function(el){ el.hidden = true; });
    document.querySelectorAll('[data-profil-reel]').forEach(function(el){ el.hidden = false; });
    document.querySelectorAll('[data-profil-si]').forEach(function(el){ el.hidden = !v[el.getAttribute('data-profil-si')]; });
    document.querySelectorAll('[data-profil-sans]').forEach(function(el){ el.hidden = !!v[el.getAttribute('data-profil-sans')]; });
    document.body.classList.toggle('bmb-profil-ok', rempli);
  }
  function identite(){ if(demo.actif()) return null; var v = valeurs(); return v.prenom ? { nom: v.nomComplet, prenom: v.prenom, initiales: v.initiales || v.prenom.charAt(0).toUpperCase(), pseudo: v.affichage } : null; }

  // ---------- Formulaire ----------
  var CSS = '.bmbp-ov{position:fixed;inset:0;background:rgba(5,5,12,.8);z-index:3200;display:flex;align-items:center;justify-content:center;padding:14px}'
    +'.bmbp{background:#16161f;color:#f0ece2;border:1px solid #6B6B89;border-radius:18px;max-width:640px;width:100%;max-height:calc(100vh - 28px);overflow:auto;font-family:"DM Sans",system-ui,sans-serif;box-shadow:0 20px 60px rgba(0,0,0,.6)}'
    +'.bmbp-h{padding:20px 22px 6px}.bmbp-h h2{font-size:22px;margin:0 0 6px;line-height:1.2;font-family:"Playfair Display",Georgia,serif;color:#E8D5A3}.bmbp-h p{font-size:15px;color:#c9c9d6;line-height:1.5;margin:0}'
    +'.bmbp form{padding:12px 22px 20px;display:grid;grid-template-columns:1fr 1fr;gap:14px 16px}@media(max-width:560px){.bmbp form{grid-template-columns:1fr}}'
    +'.bmbp .c{display:flex;flex-direction:column;gap:5px}.bmbp .large{grid-column:1/-1}'
    +'.bmbp label,.bmbp legend{font-size:14px;font-weight:600;color:#f0ece2}.bmbp small{font-size:12.5px;color:#b9b9c9;line-height:1.4}'
    +'.bmbp input[type=text],.bmbp input[type=number],.bmbp input[type=date],.bmbp select{min-height:46px;padding:10px 12px;border-radius:11px;border:1px solid #6B6B89;background:#0d0d14;color:#f0ece2;font:inherit;font-size:16px;width:100%}'
    +'.bmbp .ck{flex-direction:row;align-items:center;gap:10px}.bmbp .ck input{width:22px;height:22px;accent-color:#C8A960;flex:none}.bmbp .ck label{font-weight:500}'
    +'.bmbp details{border:1px solid #6B6B89;border-radius:12px;padding:10px 14px;background:#12121a}.bmbp summary{cursor:pointer;font-size:14px;font-weight:600;min-height:28px;display:flex;align-items:center;gap:8px}.bmbp summary span{font-weight:400;color:#b9b9c9;font-size:13px}'
    +'.bmbp fieldset{border:0;padding:0;margin:12px 0 0}.bmbp legend{padding:0;margin-bottom:6px;font-size:13px;color:#E8D5A3}.bmbp .ph{display:flex;gap:10px;flex-wrap:wrap}.bmbp .ph div{display:flex;flex-direction:column;gap:3px;width:104px}.bmbp .ph label{font-size:13px;font-weight:500}.bmbp .ph select{min-height:44px;padding:8px 8px}'
    +'.bmbp-b{grid-column:1/-1;display:flex;gap:10px;flex-wrap:wrap;justify-content:flex-end;margin-top:4px}'
    +'.bmbp-b button{min-height:46px;padding:10px 18px;border-radius:12px;border:1px solid #6B6B89;background:#1f1f2c;color:#f0ece2;font:inherit;font-size:15px;font-weight:700;cursor:pointer}'
    +'.bmbp-b .or{background:#C8A960;border-color:#C8A960;color:#12121e}.bmbp :focus-visible{outline:3px solid #E8D5A3;outline-offset:2px}'
    +'.bmbp-n{grid-column:1/-1;font-size:13px;color:#b9b9c9;line-height:1.45}.bmbp-e{grid-column:1/-1;color:#ff9a94;font-size:14px;font-weight:600;min-height:18px}'
    +'.bmbp [hidden]{display:none!important}body:has(.bmbp-ov) .bmb-pill,body:has(.bmbp-ov) .beebot-fab{display:none!important}';
  function style(){ if(document.getElementById('bmbp-css')) return; var s = document.createElement('style'); s.id = 'bmbp-css'; s.textContent = CSS; document.head.appendChild(s); }
  function esc(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;'); }
  function champPheno(c, val){
    val = val || {}; var txt = phenoTexte(val);
    var h = '<div class="c large"><details'+(txt?' open':'')+'><summary>'+esc(c.l)+' <span>'+(txt ? esc(txt) : 'facultatif')+'</span></summary><small id="bmbp-pheno-a">'+esc(c.aide)+'</small>';
    PHENO.forEach(function(sys){
      h += '<fieldset><legend>'+sys[0]+'</legend><div class="ph">' + sys[1].map(function(a){ var id = 'bmbp-ph-'+a[0], cur = val[a[0]] || '';
        return '<div><label for="'+id+'">'+a[1]+'</label><select id="'+id+'" name="ph-'+a[0]+'" data-ph="'+a[0]+'"><option value=""'+(cur===''?' selected':'')+'>?</option><option value="+"'+(cur==='+'?' selected':'')+'>positif</option><option value="-"'+(cur==='-'?' selected':'')+'>négatif</option></select></div>'; }).join('') + '</div></fieldset>';
    });
    return h + '</details></div>';
  }
  var ouvert = false;
  function ouvrir(opts){
    if(ouvert) return; ouvert = true; opts = opts || {}; style();
    var p = lire(), prev = document.activeElement;
    if(!p.prenom){ try{ var e = window.BeeAcces && window.BeeAcces.etat && window.BeeAcces.etat(); if(e && e.nom){ var parts = String(e.nom).trim().split(/\s+/); p.prenom = parts[0]; if(parts.length > 1) p.nom = parts.slice(1).join(' '); } }catch(x){} }
    var titre = opts.accueil ? (TU ? 'Pour commencer, parle-nous de toi' : 'Pour commencer, votre profil') : 'Mon profil';
    var intro = TU
      ? 'Ton espace se construit à partir de ces informations : date de ton prochain don, niveau de ton groupe, parcours. Tu peux les modifier à tout moment depuis « Mon profil ».'
      : 'Votre espace se construit à partir de ces informations : carte d’urgence, rappels, suivi. Vous pouvez les modifier à tout moment depuis « Mon profil ».';
    var h = '<div class="bmbp"><div class="bmbp-h"><h2 id="bmbp-t">'+titre+'</h2><p>'+intro+'</p></div><form novalidate>';
    champs.forEach(function(c){
      var id = 'bmbp-'+c.id, val = p[c.id] === undefined ? '' : p[c.id], attr = ' id="'+id+'" name="'+c.id+'"'+(c.req?' required aria-required="true"':'')+(c.ac?' autocomplete="'+c.ac+'"':'')+(c.aide?' aria-describedby="'+id+'-a"':'');
      var aide = c.aide ? '<small id="'+id+'-a">'+esc(c.aide)+'</small>' : '';
      if(c.t === 'pheno'){ h += champPheno(c, p.pheno); return; }
      if(c.t === 'check'){ h += '<div class="c ck large"><input type="checkbox"'+attr+(val?' checked':'')+'><label for="'+id+'">'+esc(c.l)+'</label></div>'; return; }
      h += '<div class="c'+(c.si?' cond':'')+'"'+(c.si?' data-si="'+c.si+'"':'')+'><label for="'+id+'">'+esc(c.l)+(c.req?' <span aria-hidden="true">*</span>':'')+'</label>';
      if(c.t === 'naissance') h += '<input type="text"'+attr+' value="'+esc(naissTexte(val))+'" placeholder="JJ.MM.AAAA" inputmode="numeric" maxlength="10" data-masque="date">'+(/^\d{4}$/.test(String(val)) ? '<small>Année déjà enregistrée : '+esc(val)+'.</small>' : '');
      else if(c.t === 'select') h += '<select'+attr+'>'+c.o.map(function(o){ return '<option value="'+esc(o[0])+'"'+(String(val)===String(o[0])?' selected':'')+'>'+esc(o[1])+'</option>'; }).join('')+'</select>';
      else h += '<input type="'+c.t+'"'+attr+' value="'+esc(val)+'"'+(c.min!=null?' min="'+c.min+'"':'')+(c.max!=null?' max="'+Math.min(c.max, c.id==='premierAn'?new Date().getFullYear():c.max)+'"':'')+(c.t==='number'?' inputmode="numeric"':'')+'>';
      h += aide + '</div>';
    });
    h += '<p class="bmbp-n">'+(courriel() ? 'Enregistré dans ce navigateur et dans ton compte BeeMyBlood, hébergé en Suisse.'.replace('ton', TU?'ton':'votre') : 'Enregistré uniquement dans ce navigateur. Rien n’est transmis tant que '+(TU?'tu n’es pas connecté':'vous n’êtes pas connecté')+'.')+' Les champs marqués d’un astérisque sont nécessaires.</p>'
      + '<div class="bmbp-e" role="alert"></div><div class="bmbp-b">'+(opts.accueil?'<button type="button" data-a="plus-tard">Plus tard</button>':'<button type="button" data-a="effacer">Effacer mes données</button><button type="button" data-a="fermer">Annuler</button>')+'<button type="submit" class="or">Enregistrer</button></div></form></div>';
    var ov = document.createElement('div'); ov.className = 'bmbp-ov'; ov.setAttribute('role','dialog'); ov.setAttribute('aria-modal','true'); ov.setAttribute('aria-labelledby','bmbp-t'); ov.innerHTML = h; document.body.appendChild(ov);
    var form = ov.querySelector('form'), err = ov.querySelector('.bmbp-e');
    function conditions(){ ov.querySelectorAll('[data-si]').forEach(function(d){ var src = form.elements[d.getAttribute('data-si')]; d.hidden = !(src && src.value === 'oui'); }); }
    conditions(); form.addEventListener('change', conditions);
    form.addEventListener('input', function(ev){ if(ev.target.getAttribute('data-masque') === 'date') masqueDate(ev.target, ev); });
    function fermer(){ ouvert = false; ov.remove(); document.removeEventListener('keydown', clavier); if(prev && prev.focus) prev.focus(); if(opts.apres) opts.apres(); }
    function clavier(ev){ if(ev.key === 'Escape') fermer(); }
    document.addEventListener('keydown', clavier);
    ov.addEventListener('click', function(ev){
      var b = ev.target.closest('[data-a]'); if(!b) return; var a = b.getAttribute('data-a');
      if(a === 'fermer' || a === 'plus-tard'){ if(a === 'plus-tard'){ try{ sessionStorage.setItem('bmb-profil-plus-tard','1'); }catch(x){} } fermer(); }
      if(a === 'effacer' && confirm(TU ? 'Effacer ton profil et tes données de ce navigateur'+(courriel()?' et de ton compte':'')+' ?' : 'Effacer votre profil et vos données de ce navigateur'+(courriel()?' et de votre compte':'')+' ?')){
        try{ localStorage.removeItem(cle()); var e = courriel(); if(e) localStorage.removeItem(cle(e)); }catch(x){}
        serveur('profil_enregistrer', { p_espace:ESPACE, p_donnees:{} }); fermer(); location.reload();
      }
    });
    form.addEventListener('submit', function(ev){
      ev.preventDefault(); var n = {}, manque = null, invalide = null, actuel = lire();
      // ce qui ne vient pas du formulaire (dons enregistrés, mesures, région choisie) est conservé
      Object.keys(actuel).forEach(function(k){ if(!ID_CHAMPS[k] && k !== 'maj') n[k] = actuel[k]; });
      champs.forEach(function(c){
        if(c.t === 'pheno'){ var ph = {}; form.querySelectorAll('[data-ph]').forEach(function(s){ if(s.value) ph[s.getAttribute('data-ph')] = s.value; }); if(Object.keys(ph).length) n.pheno = ph; return; }
        var el = form.elements[c.id]; if(!el) return;
        if(c.t === 'naissance'){
          var saisie = String(el.value).trim();
          if(saisie === ''){ if(/^\d{4}$/.test(String(actuel.naissance || ''))) n.naissance = actuel.naissance; return; } // l’année d’un ancien profil est conservée
          var iso = naissIso(saisie); if(iso) n.naissance = iso; else if(!invalide) invalide = c;
          return;
        }
        var val = c.t === 'check' ? el.checked : String(el.value).trim(); if(c.req && val === '' && !manque) manque = c; if(c.si && form.elements[c.si].value !== 'oui') return; if(val !== '' && val !== false) n[c.id] = val; });
      if(invalide && !manque){ err.textContent = 'La date de naissance s’écrit JJ.MM.AAAA, par exemple 07.03.1998.'; form.elements[invalide.id].focus(); return; }
      if(manque){ err.textContent = 'Il manque : ' + manque.l.toLowerCase().replace(/ \?$/,'') + '.'; form.elements[manque.id].focus(); return; }
      ecrire(n); appliquer(); try{ if(window.BeeAcces && window.BeeAcces.personnaliser && window.BeeAcces.etat()) window.BeeAcces.personnaliser(window.BeeAcces.etat()); }catch(x){}
      document.dispatchEvent(new CustomEvent('bmb-profil', { detail:n })); fermer();
    });
    setTimeout(function(){ var f = form.querySelector('input,select'); if(f) f.focus(); }, 60);
  }

  // ---------- Synchronisation et premier passage ----------
  function synchroniser(){
    return serveur('profil_lire', { p_espace:ESPACE }).then(function(d){
      if(d && typeof d === 'object' && Object.keys(d).length){ var loc = lire(); if(!loc.maj || (d.maj && d.maj > loc.maj)){ try{ localStorage.setItem(cle(), JSON.stringify(d)); var e = courriel(); if(e) localStorage.setItem(cle(e), JSON.stringify(d)); }catch(x){} appliquer(); document.dispatchEvent(new CustomEvent('bmb-profil', { detail:d })); } }
      else { var l = lire(); if(Object.keys(l).length) serveur('profil_enregistrer', { p_espace:ESPACE, p_donnees:l }); }
    });
  }
  function proposer(){ // première visite : le profil suit le tutoriel
    var plusTard = false; try{ plusTard = sessionStorage.getItem('bmb-profil-plus-tard') === '1'; }catch(e){}
    if(complet() || plusTard || demo.actif()) return false; ouvrir({ accueil:true }); return true;
  }
  function init(){
    appliquer();
    document.addEventListener('click', function(ev){
      var b = ev.target.closest('[data-profil-ouvrir]'); if(b){ ev.preventDefault(); ouvrir(); return; }
      var d = ev.target.closest('[data-bmb-demo]'); if(d){ ev.preventDefault(); demo.definir(d.getAttribute('data-bmb-demo') === 'on'); }
    });
    document.addEventListener('change', function(ev){ if(ev.target.matches && ev.target.matches('[data-bmb-demo-case]')) demo.definir(ev.target.checked); });
    var attendre = function(n){ if(window.BeeAcces && window.BeeAcces.onDeverrouille){ window.BeeAcces.onDeverrouille(function(){ synchroniser().then(function(){ appliquer(); if(ESPACE === 'receveur' || document.body.hasAttribute('data-profil-demander')) setTimeout(proposer, 900); }); }); } else if(n > 0) setTimeout(function(){ attendre(n-1); }, 300); };
    attendre(20);
    setTimeout(appliquer, 1800); // après la personnalisation faite par acces.js
  }
  window.BeeProfil = { lire:lire, enregistrer:ecrire, ouvrir:ouvrir, complet:complet, appliquer:appliquer, valeurs:valeurs, identite:identite, proposer:proposer, demo:demo, phenoTexte:phenoTexte, espace:ESPACE };
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
