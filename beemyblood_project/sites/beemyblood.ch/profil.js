/*
 * BeeMyBlood — Profil de la personne (espaces donneur et receveur)
 * Remplace les données de démonstration par celles que la personne saisit elle-même, juste après le tutoriel d’accueil.
 * Les données restent dans le navigateur. Une personne connectée les retrouve sur ses autres appareils (fonctions Supabase profil_lire / profil_enregistrer).
 * Inclure après acces.js : <script src="profil.js" data-espace="donneur" defer></script>
 * Affichage : tout élément portant data-profil="champ" reçoit la valeur correspondante ; data-profil-vide="texte" fixe le texte affiché quand le champ est vide.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */
(function(){
  'use strict';
  var script = document.currentScript || document.querySelector('script[src*="profil.js"]');
  var ESPACE = (script && script.getAttribute('data-espace')) || 'donneur';
  var TU = ESPACE === 'donneur';
  var GROUPES = ['O−','O+','A−','A+','B−','B+','AB−','AB+'];
  var CHAMPS = {
    donneur: [
      { id:'prenom', l:'Prénom', t:'text', req:1, ac:'given-name' },
      { id:'nom', l:'Nom', t:'text', ac:'family-name', aide:'Facultatif. Il préremplit le questionnaire médical.' },
      { id:'pseudo', l:'Pseudonyme', t:'text', aide:'Affiché à la place de ton nom dans les défis.' },
      { id:'naissance', l:'Année de naissance', t:'number', min:1930, max:2010 },
      { id:'sexe', l:'Sexe', t:'select', o:[['','Je préfère ne pas répondre'],['F','Femme'],['H','Homme']], aide:'Il fixe le délai entre deux dons : quatre mois pour une femme, trois pour un homme.' },
      { id:'groupe', l:'Groupe sanguin', t:'select', o:[['','Je ne le connais pas encore']].concat(GROUPES.map(function(g){ return [g,g]; })) },
      { id:'commune', l:'Commune ou code postal', t:'text', ac:'postal-code', aide:'Pour te proposer les collectes proches.' },
      { id:'dejaDonne', l:'As-tu déjà donné ton sang ?', t:'select', req:1, o:[['','Choisir'],['non','Pas encore'],['oui','Oui']] },
      { id:'nbDons', l:'Nombre de dons', t:'number', min:0, max:400, si:'dejaDonne' },
      { id:'dernierDon', l:'Date du dernier don', t:'date', si:'dejaDonne' },
      { id:'alerteGroupe', l:'M’avertir quand mon groupe est recherché', t:'check' },
      { id:'rappels', l:'Me rappeler la date à partir de laquelle je peux redonner', t:'check' }
    ],
    receveur: [
      { id:'prenom', l:'Prénom', t:'text', req:1, ac:'given-name' },
      { id:'nom', l:'Nom', t:'text', ac:'family-name' },
      { id:'naissance', l:'Année de naissance', t:'number', min:1930, max:2026 },
      { id:'pathologie', l:'Maladie suivie', t:'select', o:[['','Choisir'],['Drépanocytose','Drépanocytose'],['Thalassémie β majeure','Thalassémie β majeure'],['Thalassémie intermédiaire','Thalassémie intermédiaire'],['Autre maladie du sang','Autre maladie du sang'],['Autre','Autre']] },
      { id:'groupe', l:'Groupe sanguin', t:'select', o:[['','Je ne le connais pas']].concat(GROUPES.map(function(g){ return [g,g]; })) },
      { id:'anticorps', l:'Anticorps ou phénotype connus', t:'text', aide:'Par exemple anti-E, anti-K. Votre carte de groupe ou votre hématologue les indique.' },
      { id:'centre', l:'Centre de suivi', t:'text', aide:'Par exemple HUG, CHUV.' },
      { id:'rythme', l:'Rythme des transfusions, en semaines', t:'number', min:1, max:52 },
      { id:'prochaine', l:'Prochaine transfusion prévue', t:'date' },
      { id:'urgence', l:'Personne à prévenir', t:'text', aide:'Nom et numéro de téléphone.' }
    ]
  };
  var champs = CHAMPS[ESPACE] || CHAMPS.donneur;

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
  function valeurs(){
    var p = lire(), v = {}, an = new Date().getFullYear();
    Object.keys(p).forEach(function(k){ v[k] = p[k]; });
    v.nomComplet = [p.prenom, p.nom].filter(Boolean).join(' ');
    v.initiales = ((p.prenom||'').charAt(0) + (p.nom||'').charAt(0)).toUpperCase();
    v.affichage = p.pseudo || p.prenom || '';
    v.age = p.naissance ? (an - (+p.naissance)) + ' ans' : '';
    if(ESPACE === 'donneur'){
      var n = p.dejaDonne === 'oui' ? (+p.nbDons || 0) : (p.dejaDonne === 'non' ? 0 : '');
      v.nbDons = n === '' ? '' : String(n);
      v.vies = n === '' ? '' : (n ? '~' + (n*3) : '0');
      var fem = p.sexe === 'F', masc = p.sexe === 'H';
      v.statut = p.dejaDonne === 'oui' ? (fem ? 'Donneuse active' : masc ? 'Donneur actif' : 'Donneur·se actif·ve') : (p.dejaDonne === 'non' ? (fem ? 'Future donneuse' : masc ? 'Futur donneur' : 'Futur·e donneur·se') : '');
      if(p.dernierDon){
        var d = new Date(p.dernierDon), mois = p.sexe === 'F' ? 4 : 3; d.setMonth(d.getMonth() + mois);
        v.prochainDon = d.toLocaleDateString('fr-CH', { day:'numeric', month:'long', year:'numeric' });
        v.prochainDonJours = String(Math.max(0, Math.ceil((d - new Date()) / 86400000)));
        v.dernierDonTexte = new Date(p.dernierDon).toLocaleDateString('fr-CH', { day:'numeric', month:'long', year:'numeric' });
      }
      v.resume = [v.age, p.commune, v.statut].filter(Boolean).join(' · ');
      v.groupeTexte = p.groupe || 'à découvrir à ton premier don';
    } else {
      v.prochaineTexte = p.prochaine ? new Date(p.prochaine).toLocaleDateString('fr-CH', { day:'numeric', month:'long' }) : '';
      if(p.prochaine) v.prochaineJours = String(Math.max(0, Math.ceil((new Date(p.prochaine) - new Date()) / 86400000)));
      v.resume = [v.age, p.pathologie].filter(Boolean).join(' · ');
    }
    return v;
  }
  function appliquer(){
    var v = valeurs(), rempli = Object.keys(lire()).length > 0;
    if(!rempli) return;
    document.querySelectorAll('[data-profil]').forEach(function(el){
      var k = el.getAttribute('data-profil'), val = v[k];
      if(val === undefined || val === ''){ if(el.hasAttribute('data-profil-vide')) el.textContent = el.getAttribute('data-profil-vide'); return; }
      if(el.hasAttribute('data-profil-attr')) el.setAttribute(el.getAttribute('data-profil-attr'), val); else el.textContent = val;
    });
    document.querySelectorAll('[data-profil-demo]').forEach(function(el){ el.hidden = true; });
    document.querySelectorAll('[data-profil-reel]').forEach(function(el){ el.hidden = false; });
    document.querySelectorAll('[data-profil-si]').forEach(function(el){ el.hidden = !v[el.getAttribute('data-profil-si')]; });
    document.body.classList.add('bmb-profil-ok');
  }
  function identite(){ var v = valeurs(); return v.prenom ? { nom: v.nomComplet, prenom: v.prenom, initiales: v.initiales || v.prenom.charAt(0).toUpperCase(), pseudo: v.affichage } : null; }

  // ---------- Formulaire ----------
  var CSS = '.bmbp-ov{position:fixed;inset:0;background:rgba(5,5,12,.8);z-index:3200;display:flex;align-items:center;justify-content:center;padding:14px}'
    +'.bmbp{background:#16161f;color:#f0ece2;border:1px solid #6B6B89;border-radius:18px;max-width:640px;width:100%;max-height:calc(100vh - 28px);overflow:auto;font-family:"DM Sans",system-ui,sans-serif;box-shadow:0 20px 60px rgba(0,0,0,.6)}'
    +'.bmbp-h{padding:20px 22px 6px}.bmbp-h h2{font-size:22px;margin:0 0 6px;line-height:1.2;font-family:"Playfair Display",Georgia,serif;color:#E8D5A3}.bmbp-h p{font-size:15px;color:#c9c9d6;line-height:1.5;margin:0}'
    +'.bmbp form{padding:12px 22px 20px;display:grid;grid-template-columns:1fr 1fr;gap:14px 16px}@media(max-width:560px){.bmbp form{grid-template-columns:1fr}}'
    +'.bmbp .c{display:flex;flex-direction:column;gap:5px}.bmbp .large{grid-column:1/-1}'
    +'.bmbp label{font-size:14px;font-weight:600;color:#f0ece2}.bmbp small{font-size:12.5px;color:#b9b9c9;line-height:1.4}'
    +'.bmbp input[type=text],.bmbp input[type=number],.bmbp input[type=date],.bmbp select{min-height:46px;padding:10px 12px;border-radius:11px;border:1px solid #6B6B89;background:#0d0d14;color:#f0ece2;font:inherit;font-size:16px;width:100%}'
    +'.bmbp .ck{flex-direction:row;align-items:center;gap:10px}.bmbp .ck input{width:22px;height:22px;accent-color:#C8A960;flex:none}.bmbp .ck label{font-weight:500}'
    +'.bmbp-b{grid-column:1/-1;display:flex;gap:10px;flex-wrap:wrap;justify-content:flex-end;margin-top:4px}'
    +'.bmbp-b button{min-height:46px;padding:10px 18px;border-radius:12px;border:1px solid #6B6B89;background:#1f1f2c;color:#f0ece2;font:inherit;font-size:15px;font-weight:700;cursor:pointer}'
    +'.bmbp-b .or{background:#C8A960;border-color:#C8A960;color:#12121e}.bmbp :focus-visible{outline:3px solid #E8D5A3;outline-offset:2px}'
    +'.bmbp-n{grid-column:1/-1;font-size:13px;color:#b9b9c9;line-height:1.45}.bmbp-e{grid-column:1/-1;color:#ff9a94;font-size:14px;font-weight:600;min-height:18px}'
    +'.bmbp [hidden]{display:none!important}body:has(.bmbp-ov) .bmb-pill,body:has(.bmbp-ov) .beebot-fab{display:none!important}';
  function style(){ if(document.getElementById('bmbp-css')) return; var s = document.createElement('style'); s.id = 'bmbp-css'; s.textContent = CSS; document.head.appendChild(s); }
  function esc(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;'); }
  var ouvert = false;
  function ouvrir(opts){
    if(ouvert) return; ouvert = true; opts = opts || {}; style();
    var p = lire(), prev = document.activeElement;
    if(!p.prenom){ try{ var e = window.BeeAcces && window.BeeAcces.etat && window.BeeAcces.etat(); if(e && e.nom){ var parts = String(e.nom).trim().split(/\s+/); p.prenom = parts[0]; if(parts.length > 1) p.nom = parts.slice(1).join(' '); } }catch(x){} }
    var titre = opts.accueil ? (TU ? 'Pour commencer, parle-nous de toi' : 'Pour commencer, votre profil') : 'Mon profil';
    var intro = TU
      ? 'Ces informations remplacent les données de démonstration et personnalisent ton espace. Tu peux les modifier à tout moment depuis « Mon profil ».'
      : 'Ces informations remplacent les données de démonstration et personnalisent votre espace. Vous pouvez les modifier à tout moment depuis « Mon profil ».';
    var h = '<div class="bmbp"><div class="bmbp-h"><h2 id="bmbp-t">'+titre+'</h2><p>'+intro+'</p></div><form novalidate>';
    champs.forEach(function(c){
      var id = 'bmbp-'+c.id, val = p[c.id] === undefined ? '' : p[c.id], attr = ' id="'+id+'" name="'+c.id+'"'+(c.req?' required aria-required="true"':'')+(c.ac?' autocomplete="'+c.ac+'"':'')+(c.aide?' aria-describedby="'+id+'-a"':'');
      var aide = c.aide ? '<small id="'+id+'-a">'+esc(c.aide)+'</small>' : '';
      if(c.t === 'check'){ h += '<div class="c ck large"><input type="checkbox"'+attr+(val?' checked':'')+'><label for="'+id+'">'+esc(c.l)+'</label></div>'; return; }
      h += '<div class="c'+(c.si?' cond':'')+'"'+(c.si?' data-si="'+c.si+'"':'')+'><label for="'+id+'">'+esc(c.l)+(c.req?' <span aria-hidden="true">*</span>':'')+'</label>';
      if(c.t === 'select') h += '<select'+attr+'>'+c.o.map(function(o){ return '<option value="'+esc(o[0])+'"'+(String(val)===String(o[0])?' selected':'')+'>'+esc(o[1])+'</option>'; }).join('')+'</select>';
      else h += '<input type="'+c.t+'"'+attr+' value="'+esc(val)+'"'+(c.min!=null?' min="'+c.min+'"':'')+(c.max!=null?' max="'+c.max+'"':'')+(c.t==='number'?' inputmode="numeric"':'')+'>';
      h += aide + '</div>';
    });
    h += '<p class="bmbp-n">'+(courriel() ? 'Enregistré dans ce navigateur et dans ton compte BeeMyBlood, hébergé en Suisse.'.replace('ton', TU?'ton':'votre') : 'Enregistré uniquement dans ce navigateur. Rien n’est transmis tant que '+(TU?'tu n’es pas connecté':'vous n’êtes pas connecté')+'.')+' Les champs marqués d’un astérisque sont nécessaires.</p>'
      + '<div class="bmbp-e" role="alert"></div><div class="bmbp-b">'+(opts.accueil?'<button type="button" data-a="plus-tard">Plus tard</button>':'<button type="button" data-a="effacer">Effacer mes données</button><button type="button" data-a="fermer">Annuler</button>')+'<button type="submit" class="or">Enregistrer</button></div></form></div>';
    var ov = document.createElement('div'); ov.className = 'bmbp-ov'; ov.setAttribute('role','dialog'); ov.setAttribute('aria-modal','true'); ov.setAttribute('aria-labelledby','bmbp-t'); ov.innerHTML = h; document.body.appendChild(ov);
    var form = ov.querySelector('form'), err = ov.querySelector('.bmbp-e');
    function conditions(){ ov.querySelectorAll('[data-si]').forEach(function(d){ var src = form.elements[d.getAttribute('data-si')]; d.hidden = !(src && src.value === 'oui'); }); }
    conditions(); form.addEventListener('change', conditions);
    function fermer(){ ouvert = false; ov.remove(); document.removeEventListener('keydown', clavier); if(prev && prev.focus) prev.focus(); if(opts.apres) opts.apres(); }
    function clavier(ev){ if(ev.key === 'Escape') fermer(); }
    document.addEventListener('keydown', clavier);
    ov.addEventListener('click', function(ev){
      var b = ev.target.closest('[data-a]'); if(!b) return; var a = b.getAttribute('data-a');
      if(a === 'fermer' || a === 'plus-tard'){ if(a === 'plus-tard'){ try{ sessionStorage.setItem('bmb-profil-plus-tard','1'); }catch(x){} } fermer(); }
      if(a === 'effacer' && confirm(TU ? 'Effacer ton profil de ce navigateur'+(courriel()?' et de ton compte':'')+' ?' : 'Effacer votre profil de ce navigateur'+(courriel()?' et de votre compte':'')+' ?')){
        try{ localStorage.removeItem(cle()); var e = courriel(); if(e) localStorage.removeItem(cle(e)); }catch(x){}
        serveur('profil_enregistrer', { p_espace:ESPACE, p_donnees:{} }); fermer(); location.reload();
      }
    });
    form.addEventListener('submit', function(ev){
      ev.preventDefault(); var n = {}, manque = null;
      champs.forEach(function(c){ var el = form.elements[c.id]; if(!el) return; var val = c.t === 'check' ? el.checked : String(el.value).trim(); if(c.req && val === '' && !manque) manque = c; if(c.si && form.elements[c.si].value !== 'oui') return; if(val !== '' && val !== false) n[c.id] = val; });
      if(manque){ err.textContent = 'Il manque : ' + manque.l.toLowerCase().replace(/ \?$/,'') + '.'; form.elements[manque.id].focus(); return; }
      ecrire(n); appliquer(); try{ if(window.BeeAcces && window.BeeAcces.personnaliser && window.BeeAcces.etat()) window.BeeAcces.personnaliser(window.BeeAcces.etat()); }catch(x){}
      document.dispatchEvent(new CustomEvent('bmb-profil', { detail:n })); fermer();
    });
    setTimeout(function(){ var f = form.querySelector('input,select'); if(f) f.focus(); }, 60);
  }

  // ---------- Synchronisation et premier passage ----------
  function synchroniser(){
    return serveur('profil_lire', { p_espace:ESPACE }).then(function(d){
      if(d && typeof d === 'object' && Object.keys(d).length){ var loc = lire(); if(!loc.maj || (d.maj && d.maj > loc.maj)){ try{ localStorage.setItem(cle(), JSON.stringify(d)); var e = courriel(); if(e) localStorage.setItem(cle(e), JSON.stringify(d)); }catch(x){} appliquer(); } }
      else { var l = lire(); if(Object.keys(l).length) serveur('profil_enregistrer', { p_espace:ESPACE, p_donnees:l }); }
    });
  }
  function proposer(){ // première visite : le profil suit le tutoriel
    var plusTard = false; try{ plusTard = sessionStorage.getItem('bmb-profil-plus-tard') === '1'; }catch(e){}
    if(complet() || plusTard) return false; ouvrir({ accueil:true }); return true;
  }
  function init(){
    appliquer();
    document.addEventListener('click', function(ev){ var b = ev.target.closest('[data-profil-ouvrir]'); if(b){ ev.preventDefault(); ouvrir(); } });
    var attendre = function(n){ if(window.BeeAcces && window.BeeAcces.onDeverrouille){ window.BeeAcces.onDeverrouille(function(){ synchroniser().then(function(){ appliquer(); if(ESPACE === 'receveur' || document.body.hasAttribute('data-profil-demander')) setTimeout(proposer, 900); }); }); } else if(n > 0) setTimeout(function(){ attendre(n-1); }, 300); };
    attendre(20);
    setTimeout(appliquer, 1800); // après la personnalisation faite par acces.js
  }
  window.BeeProfil = { lire:lire, enregistrer:ecrire, ouvrir:ouvrir, complet:complet, appliquer:appliquer, valeurs:valeurs, identite:identite, proposer:proposer, espace:ESPACE };
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
