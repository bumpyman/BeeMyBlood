/*
 * BeeMyBlood — Espace donneur : contenu construit à partir des données de la personne
 * Hors mode démonstration, « Mon profil », « Mon impact », « Défis » et « Flux » n'affichent que :
 *   - ce que la personne a saisi (profil, dons enregistrés) ;
 *   - les données officielles du jour (baromètre des stocks, collectes).
 * Une personne qui arrive voit donc un espace presque vide, qui se remplit avec ses dons.
 * Dépend de profil.js (BeeProfil) et de app.js (BMB_DONNEES, événement « bmb-donnees »).
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */
(function(){
  'use strict';
  // Paliers rapprochés : un repère à chaque étape du parcours, y compris entre 25 et 50 dons
  var PALIERS = [[1,'Premier don','🩸'],[2,'Le retour','🔁'],[3,'Trois dons','✨'],[5,'Cinq dons','⭐'],[8,'Huit dons','🌱'],[10,'Dix dons','🏅'],[15,'Quinze dons','🛡️'],[20,'Vingt dons','🎖️'],[25,'Vingt-cinq dons','🏆'],[30,'Trente dons','💎'],[35,'Trente-cinq dons','🔆'],[40,'Quarante dons','👑'],[45,'Quarante-cinq dons','🎗️'],[50,'Cinquante dons','🌟'],[60,'Soixante dons','🌠'],[75,'Soixante-quinze dons','🏵️'],[100,'Cent dons','💯']];
  var ONEDOC = 'https://www.onedoc.ch/fr/infirmier/geneve/pb5bt/centre-de-transfusion-sanguine-1';
  var NIV = { critique:['Critique','var(--red-soft)'], bas:['Bas','var(--orange)'], normal:['Normal','var(--blue)'], eleve:['Élevé','var(--blue)'], inconnu:['Non communiqué','var(--text-muted)'] };
  function esc(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;'); }
  function demo(){ return document.documentElement.classList.contains('bmb-demo'); }
  function P(){ return (window.BeeProfil && window.BeeProfil.lire()) || {}; }
  function V(){ return (window.BeeProfil && window.BeeProfil.valeurs()) || {}; }
  function donnees(){ return (typeof BMB_DONNEES !== 'undefined' && BMB_DONNEES) || null; }
  function dansPages(){ return /\/pages\//.test(location.pathname); }
  function page(f){ return dansPages() ? f : 'pages/' + f; }
  function dateFr(iso){ var d = new Date(iso); return isNaN(d) ? '' : d.toLocaleDateString('fr-CH', { day:'numeric', month:'long', year:'numeric' }); }
  function carte(titre, corps, extra){ return '<div class="card" style="margin-bottom:14px"><div class="card-header"><div class="card-title">'+titre+'</div>'+(extra||'')+'</div>'+corps+'</div>'; }
  function vide(t){ return '<div style="font-size:14px;color:var(--text-dim);line-height:1.6;padding:4px 0">'+t+'</div>'; }

  // ---------- Dons enregistrés ----------
  function dons(){ var l = (P().dons || []).slice(); l.sort(function(a,b){ return a.d < b.d ? 1 : -1; }); return l; }
  function ajouterDon(d, lieu){ var p = P(); p.dons = (p.dons || []).concat([{ d:d, l:lieu }]); if(p.dejaDonne !== 'oui'){ p.dejaDonne = 'oui'; p.nbDons = '0'; } window.BeeProfil.enregistrer(p); tout(); }
  function retirerDon(i){ var p = P(), l = dons(); l.splice(i, 1); p.dons = l; window.BeeProfil.enregistrer(p); tout(); }

  // ---------- Blocs ----------
  function blocAccueil(v, p){
    var nom = v.prenom ? 'Salut ' + esc(v.prenom) + ' 👋' : 'Bienvenue 👋';
    var lignes = [v.nomComplet && v.nomComplet !== v.prenom ? esc(v.nomComplet) : '', esc(v.resume || '')].filter(Boolean).join(' · ');
    var incomplet = !window.BeeProfil.complet();
    return '<div class="dash-welcome"><div><h1>'+nom+'</h1>'
      + (lignes ? '<div style="font-size:14px;color:var(--text-dim);margin-top:2px">'+lignes+'</div>' : '')
      + (incomplet ? '<p style="margin-top:10px">Cet espace est le tien. Commence par ton profil : il sert à calculer ta prochaine date de don et à suivre ton parcours.</p>' : '')
      + '<div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap;justify-content:center">'
      + (incomplet ? '<button type="button" class="btn btn-gold btn-sm" data-profil-ouvrir>✏️ Compléter mon profil</button>' : '<a href="'+ONEDOC+'" target="_blank" rel="noopener" aria-describedby="ext-link-notice" class="btn btn-gold btn-sm">📅 Prendre rendez-vous au centre (OneDoc)</a>')
      + '<button type="button" class="btn btn-outline btn-sm" data-bmb="don">🩸 J’ai donné</button>'
      + '<a class="btn btn-outline btn-sm" href="'+page('eligibilite.html')+'">✅ Puis-je donner ?</a>'
      + (incomplet ? '' : '<button type="button" class="btn btn-outline btn-sm" data-profil-ouvrir>✏️ Modifier mon profil</button>')
      + '</div></div>'
      + (+v.nbDons > 0 ? '<div style="display:flex;gap:18px;justify-content:center;margin-top:6px">'
      + stat(v.nbDons, 'Don'+((+v.nbDons||0)>1?'s':''), 'var(--gold)') + stat(v.vies, 'Personnes aidées, au plus', 'var(--red-soft)') + (v.ancienneteNb ? stat(v.ancienneteNb, v.ancienneteUnite.charAt(0).toUpperCase() + v.ancienneteUnite.slice(1) + ' de don', 'var(--blue)') : '')
      + '</div>' : '') + '</div>';
  }
  function stat(n, l, c){ return '<div style="text-align:center"><div style="font-family:var(--font-display);font-size:26px;font-weight:700;color:'+c+'">'+esc(n)+'</div><div style="font-size:12px;color:var(--text-dim);max-width:110px">'+l+'</div></div>'; }

  function blocProchain(v, p){
    var corps;
    if(v.prochainDon){
      var j = +v.prochainDonJours, total = (p.sexe === 'H' ? 3 : 4) * 30.4, pct = Math.max(4, Math.min(100, Math.round((1 - j / total) * 100)));
      corps = j <= 0
        ? '<div style="font-size:17px;font-weight:700;color:var(--blue)">Tu peux donner dès maintenant.</div><div style="font-size:14px;color:var(--text-dim);margin-top:4px">Ton dernier don date du '+esc(v.dernierDonTexte)+'. Le délai est écoulé.</div>'
        : '<div style="font-size:17px;font-weight:700">Dès le <span style="color:var(--gold)">'+esc(v.prochainDon)+'</span>, dans '+j+' jour'+(j>1?'s':'')+'</div><div style="font-size:14px;color:var(--text-dim);margin-top:4px">Dernier don le '+esc(v.dernierDonTexte)+'.</div>';
      corps += '<div role="img" aria-label="Délai écoulé à '+pct+' %" style="height:10px;border-radius:5px;background:var(--dark-surface);margin-top:12px;overflow:hidden"><div style="height:100%;width:'+pct+'%;background:var(--gold);border-radius:5px"></div></div>'
        + '<div style="font-size:12px;color:var(--text-muted);margin-top:8px">Délai entre deux dons de sang : trois mois pour un homme, quatre mois pour une femme'+(p.sexe ? '' : ' (quatre mois appliqués ici, indique ton sexe dans le profil pour préciser)')+'. Le médecin du centre confirme ton aptitude le jour du don.</div>';
    } else if(p.dejaDonne === 'oui'){
      corps = vide('Indique la date de ton dernier don pour connaître la date à partir de laquelle tu peux redonner.') + '<button type="button" class="btn btn-outline btn-sm" data-bmb="don" style="margin-top:8px">Ajouter mon dernier don</button>';
    } else {
      corps = '<ol style="margin:0 0 0 18px;font-size:14px;line-height:1.9;color:var(--text)">'
        + '<li>Vérifie ton aptitude en deux minutes avec le <a href="'+page('eligibilite.html')+'" style="color:var(--gold)">test d’éligibilité</a>.</li>'
        + '<li>Choisis une <a href="'+page('centres.html')+'" style="color:var(--gold)">collecte ou un centre</a>.</li>'
        + '<li>Prépare le <a href="'+page('questionnaire.html')+'" style="color:var(--gold)">questionnaire médical</a> pour gagner du temps sur place.</li></ol>';
    }
    return carte(p.dejaDonne === 'oui' || v.prochainDon ? '📅 Mon prochain don' : '🚀 Mon premier don', corps);
  }

  function blocGroupe(v, p){
    var d = donnees(), corps = '';
    if(p.groupe){
      corps += '<div style="display:flex;align-items:center;gap:14px;flex-wrap:wrap"><div style="font-family:var(--font-display);font-size:44px;font-weight:700;color:var(--red-soft);line-height:1">'+esc(p.groupe)+'</div><div id="bmb-mon-niveau" style="font-size:14px;color:var(--text-dim);flex:1;min-width:200px"></div></div>';
    } else {
      corps += vide('Ton groupe sanguin est déterminé lors de ton premier don. Tu pourras l’ajouter ici ensuite, il figure sur ta carte de donneur.');
    }
    if(v.phenoTexte) corps += '<div style="margin-top:10px;font-size:14px"><strong>Phénotype étendu</strong> <span style="font-family:var(--font-mono);color:var(--text-dim)">'+esc(v.phenoTexte)+'</span></div>';
    if(v.phenoNote) corps += '<div style="margin-top:8px;padding:10px 12px;border-radius:10px;background:var(--dark-surface);font-size:13px;line-height:1.55">'+esc(v.phenoNote)+'</div>';
    if(!v.phenoTexte && p.groupe) corps += '<div style="font-size:13px;color:var(--text-muted);margin-top:8px">Si ta carte de donneur indique un phénotype étendu (Rhésus, Kell, Duffy, Kidd, MNS), ajoute-le dans ton profil.</div>';
    return carte('🧬 Mon groupe sanguin', corps);
  }
  function majNiveau(){
    var el = document.getElementById('bmb-mon-niveau'), d = donnees(), p = P(); if(!el || !d || !d.stocks || !d.stocks.length || !p.groupe) return;
    var r = d.stocks.filter(function(s){ return s.code === (p.region || 'geneve'); })[0] || d.stocks[0];
    var g = (r.groupes || []).filter(function(x){ return x.groupe === p.groupe; })[0]; if(!g) return;
    var n = NIV[g.niveau] || NIV.inconnu;
    el.innerHTML = 'Niveau de ton groupe, '+esc(r.court || r.label)+' : <strong style="color:'+n[1]+'">'+esc(g.libelle || n[0])+'</strong>'
      + (g.niveau === 'critique' || g.niveau === 'bas' ? '. Ton don est particulièrement utile en ce moment.' : '.')
      + '<div style="font-size:12px;color:var(--text-muted);margin-top:2px">Baromètre officiel de Transfusion CRS Suisse'+(r.date ? ' du '+esc(r.date) : '')+'</div>';
  }

  function blocParcours(v){
    var n = +v.nbDons || 0, atteints = PALIERS.filter(function(x){ return n >= x[0]; }), suivant = PALIERS.filter(function(x){ return n < x[0]; })[0];
    var pastilles = PALIERS.slice(0, Math.max(6, atteints.length + 3)).map(function(x){ var ok = n >= x[0];
      return '<div style="text-align:center;min-width:74px;opacity:'+(ok?1:.55)+'"><div aria-hidden="true" style="width:46px;height:46px;border-radius:50%;margin:0 auto;display:flex;align-items:center;justify-content:center;font-size:20px;border:2px solid '+(ok?'var(--gold)':'var(--dark-border)')+';background:'+(ok?'rgba(242,169,59,.12)':'transparent')+'">'+x[2]+'</div><div style="font-size:12px;margin-top:4px;line-height:1.25">'+x[1]+'<br><span style="color:var(--text-muted)">'+(ok?'atteint':x[0]+' don'+(x[0]>1?'s':''))+'</span></div></div>'; }).join('');
    var corps = '<div style="display:flex;gap:10px;overflow-x:auto;padding-bottom:6px">'+pastilles+'</div>';
    corps += '<div style="font-size:14px;margin-top:10px">'+(suivant ? (n === 0 ? 'Ton parcours commence avec ton premier don.' : 'Encore <strong>'+(suivant[0]-n)+' don'+(suivant[0]-n>1?'s':'')+'</strong> avant le palier « '+suivant[1]+' ».') : 'Tu as atteint tous les paliers. Merci.')+'</div>';
    var b = badges(); if(b.length) corps += '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:12px">'+b.map(function(x){ return '<span class="badge" style="font-size:12px">'+x+'</span>'; }).join('')+'</div>';
    return carte('🦸 Mon parcours', corps, v.anciennete ? '<span class="badge badge-gold">'+esc(v.anciennete)+'</span>' : '');
  }
  function badges(){
    var p = P(), v = V(), l = [], ds = dons(), an = Date.now() - 365 * 86400000;
    if(window.BeeProfil.complet()) l.push('✅ Profil complété');
    if(p.groupe) l.push('🩸 Groupe connu');
    if(v.phenoTexte) l.push('🧬 Phénotype renseigné');
    if((+v.nbDons || 0) >= 1) l.push('💛 Premier don');
    if(ds.filter(function(x){ return new Date(x.d).getTime() >= an; }).length >= 2) l.push('🔁 Deux dons en douze mois');
    try{ if(localStorage.getItem('bmb-hemorush-tuto-seen')) l.push('🎮 HémoRush découvert'); if(localStorage.getItem('bmb-questionnaire-pret')) l.push('📋 Questionnaire préparé'); }catch(e){}
    return l;
  }

  function blocDons(v, p){
    var l = dons(), avant = p.dejaDonne === 'oui' ? (p.nbDons !== undefined && p.nbDons !== '' ? (+p.nbDons || 0) : 1) : 0, corps = '';
    if(l.length){
      corps += '<ul style="list-style:none;margin:0;padding:0">'+l.map(function(x, i){ return '<li style="display:flex;align-items:center;gap:10px;padding:9px 0;border-bottom:1px solid var(--dark-border);font-size:14px"><span style="font-family:var(--font-mono);color:var(--gold);min-width:150px">'+esc(dateFr(x.d))+'</span><span style="flex:1">'+esc(x.l || 'Lieu non précisé')+'</span><button type="button" data-bmb="retirer" data-i="'+i+'" aria-label="Retirer le don du '+esc(dateFr(x.d))+'" style="background:none;border:1px solid var(--dark-border);color:var(--text-dim);border-radius:8px;min-width:36px;min-height:36px;cursor:pointer">✕</button></li>'; }).join('')+'</ul>';
    } else {
      corps += vide('Aucun don enregistré pour l’instant. Après chaque don, ajoute-le ici : ta prochaine date possible et ton parcours se mettent à jour.');
    }
    if(avant) corps += '<div style="font-size:13px;color:var(--text-muted);margin-top:8px">'+avant+' don'+(avant>1?'s':'')+' déclaré'+(avant>1?'s':'')+' dans ton profil avant l’utilisation de BeeMyBlood.</div>';
    corps += '<form id="bmb-form-don" style="margin-top:12px;display:none;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:8px;align-items:end">'
      + '<div><label for="bmb-don-date" style="display:block;font-size:13px;margin-bottom:4px">Date du don</label><input type="date" id="bmb-don-date" required max="'+new Date().toISOString().slice(0,10)+'" style="width:100%;min-height:44px;padding:8px 10px;border-radius:10px;border:1px solid var(--dark-border);background:var(--dark-surface);color:var(--text);font-size:16px"></div>'
      + '<div><label for="bmb-don-lieu" style="display:block;font-size:13px;margin-bottom:4px">Lieu</label><input type="text" id="bmb-don-lieu" placeholder="Centre des HUG, collecte mobile…" style="width:100%;min-height:44px;padding:8px 10px;border-radius:10px;border:1px solid var(--dark-border);background:var(--dark-surface);color:var(--text);font-size:16px"></div>'
      + '<button type="submit" class="btn btn-gold btn-sm" style="min-height:44px">Enregistrer</button></form>';
    return carte('📒 Mes dons', corps, '<button type="button" class="btn btn-outline btn-sm" data-bmb="don">+ Ajouter un don</button>');
  }

  function blocStocks(){
    return carte('🩸 Stocks officiels du jour', '<div id="bmb-stocks-region" style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px"></div><div id="bmb-stocks-rows">'+vide('Chargement du baromètre officiel…')+'</div><div id="bmb-stocks-src" style="font-size:12px;color:var(--text-muted);margin-top:8px"></div>'
      + '<div style="margin-top:12px"><button type="button" class="btn btn-outline btn-sm" data-bmb="partager">📣 Partager l’état des stocks</button></div>');
  }
  function majStocks(){
    var rows = document.getElementById('bmb-stocks-rows'), d = donnees(); if(!rows || !d) return;
    if(!d.stocks || !d.stocks.length){ rows.innerHTML = vide('Baromètre officiel momentanément indisponible.'); return; }
    var p = P(), code = p.region || 'geneve', r = d.stocks.filter(function(s){ return s.code === code; })[0] || d.stocks[0];
    document.getElementById('bmb-stocks-region').innerHTML = d.stocks.map(function(s){ return '<button type="button" class="canton-btn'+(s.code===r.code?' active':'')+'" data-bmb="region" data-code="'+esc(s.code)+'">'+esc(s.court)+'</button>'; }).join('');
    rows.innerHTML = (r.groupes || []).map(function(g){ var n = NIV[g.niveau] || NIV.inconnu, moi = p.groupe && g.groupe === p.groupe;
      return '<div class="stock-row"><span class="stock-grp" style="color:'+n[1]+'">'+esc(g.groupe)+'</span><div class="stock-bar-bg"><div class="stock-bar" style="width:'+(+g.taux||0)+'%;background:'+n[1]+'"></div></div><span class="stock-lbl" style="color:'+n[1]+'">'+esc(g.libelle || n[0])+(moi?' · ton groupe':'')+'</span></div>'; }).join('');
    document.getElementById('bmb-stocks-src').textContent = 'Source : baromètre officiel de Transfusion CRS Suisse'+(r.date ? ', '+r.date : '')+'. Quatre niveaux : élevé, normal, bas, critique.';
  }

  function blocCollectes(){ return carte('🚌 Prochaines collectes', '<div id="bmb-coll-liste">'+vide('Chargement du calendrier officiel…')+'</div><div style="margin-top:10px"><a class="btn btn-outline btn-sm" href="'+page('centres.html')+'">Toutes les collectes et les centres</a></div>'); }
  function majCollectes(){
    var el = document.getElementById('bmb-coll-liste'), d = donnees(); if(!el || !d) return;
    var cs = ((d.collectes && d.collectes.geneve) || []).slice(0, 3);
    el.innerHTML = cs.length ? cs.map(function(c){ return '<div style="display:flex;gap:10px;padding:8px 0;border-bottom:1px solid var(--dark-border);font-size:14px"><span style="font-family:var(--font-mono);color:var(--gold);min-width:110px">'+esc(c.date||'')+'</span><span style="flex:1"><a href="'+esc(c.url||'#')+'" target="_blank" rel="noopener" aria-describedby="ext-link-notice" style="color:var(--text);font-weight:600">'+esc(c.titre)+'</a><br><span style="font-size:12px;color:var(--text-muted)">'+esc([c.adresse,(c.npa||'')+' '+(c.localite||'')].filter(Boolean).join(', '))+(c.debut?' · '+esc(c.debut)+(c.fin?'–'+esc(c.fin):''):'')+'</span></span></div>'; }).join('')+'<div style="font-size:12px;color:var(--text-muted);margin-top:6px">Source : calendrier officiel du centre de transfusion des HUG.</div>'
      : vide('Aucune collecte mobile annoncée à Genève pour le moment. Le centre de transfusion des HUG reçoit sur rendez-vous.');
  }

  // ---------- Pages ----------
  function rendreProfil(c){
    var v = V(), p = P();
    c.innerHTML = blocAccueil(v, p) + blocProchain(v, p) + blocGroupe(v, p) + blocParcours(v) + blocDons(v, p) + blocStocks() + blocCollectes();
    // contenus pédagogiques de l'ancienne page, valables pour tout le monde
    var repris = document.getElementById('bmb-repris');
    if(repris && !repris.firstChild){
      var fait = document.getElementById('daily-fact'); if(fait) repris.appendChild(fait);
      var bt = document.querySelector('[data-target="compat-explorer-acc"]'), bd = document.getElementById('compat-explorer-acc'); if(bt && bd){ repris.appendChild(bt); repris.appendChild(bd); }
    }
    majNiveau(); majStocks(); majCollectes();
  }
  function rendreImpact(c){
    var v = V(), n = +v.nbDons || 0, l = dons();
    c.innerHTML = carte('💛 Mon impact', n
      ? '<div style="display:flex;gap:22px;flex-wrap:wrap;justify-content:center;margin:6px 0 12px">'+stat(String(n),'Don'+(n>1?'s':''),'var(--gold)')+stat('~'+(n*3),'Personnes aidées, au plus','var(--red-soft)')+stat((n*0.45).toFixed(1).replace('.',',')+' L','Sang donné, environ','var(--blue)')+'</div>'
        + '<div style="font-size:14px;color:var(--text-dim);line-height:1.6">Chaque don est séparé en trois produits, globules rouges, plasma et plaquettes, qui peuvent aider jusqu’à trois personnes. Le suivi de tes poches jusqu’au patient sera disponible quand le centre sera raccordé à BeeMyBlood.</div>'
        + (l.length ? '<div style="margin-top:12px;font-size:14px"><strong>Dernier don enregistré :</strong> '+esc(dateFr(l[0].d))+(l[0].l?', '+esc(l[0].l):'')+'</div>' : '')
      : vide('Ton impact apparaîtra ici après ton premier don. Un don prend environ 45 minutes et peut aider jusqu’à trois personnes.')
        + '<div style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap"><a class="btn btn-gold btn-sm" href="eligibilite.html">✅ Puis-je donner ?</a><a class="btn btn-outline btn-sm" href="tableau-de-bord.html">Enregistrer un don</a></div>');
  }
  function rendreDefis(c){
    var v = V();
    c.innerHTML = blocParcours(v) + carte('🤝 Défis collectifs', vide('Les défis entre amis, en équipe ou en entreprise s’ouvriront avec la phase pilote, quand les dons pourront être confirmés par le centre. En attendant, ton parcours personnel avance à chaque don que tu enregistres dans « Mon profil ».')
      + '<div style="margin-top:10px"><a class="btn btn-outline btn-sm" href="tableau-de-bord.html">Aller à mon profil</a></div>');
  }
  function rendreFlux(c){
    c.innerHTML = carte('📺 Activité du centre', vide('Le flux en direct du centre de transfusion (dons du jour, poches délivrées, alertes) sera affiché ici quand le centre sera raccordé à BeeMyBlood. Aujourd’hui, la donnée officielle disponible est le baromètre des stocks ci-dessous.')) + blocStocks();
    majStocks();
  }
  function tout(){
    if(demo() || !window.BeeProfil) return;
    var m = { 'bmb-mon-profil':rendreProfil, 'bmb-mon-impact':rendreImpact, 'bmb-mes-defis':rendreDefis, 'bmb-flux-reel':rendreFlux };
    Object.keys(m).forEach(function(id){ var c = document.getElementById(id); if(c) m[id](c); });
    window.BeeProfil.appliquer();
  }

  // ---------- Interactions ----------
  document.addEventListener('click', function(ev){
    var b = ev.target.closest('[data-bmb]'); if(!b) return; var a = b.getAttribute('data-bmb');
    if(a === 'don'){ var f = document.getElementById('bmb-form-don'); if(f){ f.style.display = 'grid'; f.scrollIntoView({ block:'center', behavior:'smooth' }); var i = document.getElementById('bmb-don-date'); if(i){ if(!i.value) i.value = new Date().toISOString().slice(0,10); i.focus(); } } else location.href = page('tableau-de-bord.html') + '#don'; }
    if(a === 'retirer' && confirm('Retirer ce don de ta liste ?')) retirerDon(+b.getAttribute('data-i'));
    if(a === 'region'){ var p = P(); p.region = b.getAttribute('data-code'); window.BeeProfil.enregistrer(p); majStocks(); majNiveau(); }
    if(a === 'partager' && window.BeePartage){ window.BeePartage.stocks({ code:P().region || 'geneve', ton:'donneur', donnees:donnees() && donnees().stocks && donnees().stocks.length ? donnees() : null }); }
  });
  document.addEventListener('submit', function(ev){
    if(ev.target.id !== 'bmb-form-don') return; ev.preventDefault();
    var d = document.getElementById('bmb-don-date').value, l = document.getElementById('bmb-don-lieu').value.trim(); if(!d) return;
    ajouterDon(d, l);
  });
  document.addEventListener('bmb-profil', tout);
  document.addEventListener('bmb-donnees', function(){ majNiveau(); majStocks(); majCollectes(); });
  function init(){ tout(); if(location.hash === '#don'){ setTimeout(function(){ var b = document.querySelector('[data-bmb="don"]'); if(b) b.click(); }, 400); } }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function(){ setTimeout(init, 50); }); else setTimeout(init, 50);
})();
