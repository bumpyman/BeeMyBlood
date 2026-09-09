/*
 * BeeMyBlood Pro — groupe d'onglets « Opérer » : le cycle du don au quotidien
 * (agenda et réservations, dossier donneur·se, accueil et consentement, rappels, journal et rapports).
 * Données enregistrées dans Supabase (supabase/2026-09-09-cycle-du-don.sql) pour les comptes de l'espace pro ;
 * un jeu de démonstration est semé à la première ouverture d'une région. Sans serveur joignable, le module
 * fonctionne en démonstration locale, sans rien enregistrer. La réservation réelle se fait par redirection
 * vers l'outil officiel du centre (lien réglé par région), et les clics venant de l'espace donneur sont comptés.
 * S'ajoute à pro/index.html sans le modifier : le script crée le groupe d'onglets, les panneaux et enveloppe switchTab / changeRegion.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */
(function(){
  var TABS = [
    { id:'agenda',   nom:'Agenda',   ico:'<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>' },
    { id:'donneurs', nom:'Donneur·se·s', ico:'<path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/>' },
    { id:'accueil',  nom:'Accueil',  ico:'<path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>' },
    { id:'rappels',  nom:'Rappels',  ico:'<path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/>' },
    { id:'journal',  nom:'Journal & rapports', ico:'<path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>' }
  ];
  var IDS = TABS.map(function(t){ return t.id; });

  // ---------- style ----------
  var css = '.cy-kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:.75rem;margin-bottom:1rem}'
    + '.cy-kpi{background:var(--slate-800);border:1px solid var(--slate-700);border-radius:.75rem;padding:.8rem .9rem}.cy-kpi b{display:block;font-size:1.4rem;font-weight:800;line-height:1.1;font-variant-numeric:tabular-nums}.cy-kpi span{font-size:.72rem;color:var(--slate-400)}.cy-kpi small{display:block;font-size:.7rem;color:var(--slate-500);margin-top:.15rem}'
    + '.cy-week{display:grid;grid-template-columns:repeat(7,1fr);gap:.4rem;margin-bottom:1rem}.cy-day{border:1px solid var(--slate-700);border-radius:.6rem;padding:.45rem .3rem;text-align:center;font-size:.72rem;color:var(--slate-400)}.cy-day b{display:block;font-size:1rem;color:#f0ece2}.cy-day.on{border-color:var(--amber-400);background:rgba(232,213,163,.08)}.cy-day i{display:block;font-style:normal;font-size:.68rem;color:var(--amber-400)}'
    + '.cy-list{display:flex;flex-direction:column;gap:.4rem}.cy-row{display:grid;grid-template-columns:64px 1fr auto;gap:.7rem;align-items:center;padding:.55rem .7rem;border:1px solid var(--slate-700);border-radius:.6rem;background:rgba(255,255,255,.015);cursor:pointer}.cy-row:hover{border-color:var(--slate-500)}.cy-row .h{font-weight:700;font-variant-numeric:tabular-nums}.cy-row .n{font-size:.85rem}.cy-row .n small{color:var(--slate-400);margin-left:.4rem}'
    + '.cy-st{font-size:.65rem;padding:.2rem .5rem;border-radius:.3rem;white-space:nowrap;font-weight:600}.cy-st.reserve{background:rgba(96,165,250,.15);color:var(--blue-400)}.cy-st.confirme{background:rgba(96,165,250,.25);color:var(--blue-400)}.cy-st.arrive{background:rgba(232,213,163,.18);color:var(--amber-400)}.cy-st.questionnaire{background:rgba(192,132,252,.18);color:var(--purple-400)}.cy-st.prelevement{background:rgba(255,107,107,.18);color:var(--red-400)}.cy-st.termine{background:rgba(74,222,128,.18);color:var(--green-400)}.cy-st.noshow,.cy-st.ajourne{background:rgba(90,90,114,.3);color:var(--slate-400)}.cy-st.attente{background:rgba(52,211,153,.15);color:var(--emerald-400)}'
    + '.cy-btn{padding:.5rem .9rem;border-radius:.5rem;border:1px solid var(--slate-700);background:var(--slate-800);color:#f0ece2;font:inherit;font-size:.8rem;font-weight:600;cursor:pointer;text-decoration:none;display:inline-block}.cy-btn.p{background:var(--amber-500);color:#0a0a12;border-color:var(--amber-500)}.cy-btn:disabled{opacity:.5;cursor:not-allowed}.cy-btn.s{font-size:.72rem;padding:.35rem .6rem}'
    + '.cy-form{display:grid;grid-template-columns:1fr 1fr;gap:.6rem;margin:.6rem 0}.cy-form label{font-size:.72rem;color:var(--slate-400);display:block;margin-bottom:.2rem}.cy-form input,.cy-form select,.cy-in{width:100%;padding:.55rem .65rem;border-radius:.5rem;border:1px solid var(--slate-700);background:var(--slate-900);color:#fff;font:inherit;font-size:.85rem}'
    + '.cy-table{width:100%;border-collapse:collapse;font-size:.8rem}.cy-table th{text-align:left;font-size:.68rem;text-transform:uppercase;letter-spacing:.06em;color:var(--slate-400);padding:.45rem .5rem;border-bottom:1px solid var(--slate-700)}.cy-table td{padding:.5rem;border-bottom:1px solid rgba(255,255,255,.05);vertical-align:top}.cy-table tr.sel td{background:rgba(232,213,163,.07)}.cy-table tbody tr{cursor:pointer}.cy-wrap{overflow:auto}'
    + '.cy-fiche h5{font-size:1rem;font-weight:800;margin-bottom:.2rem}.cy-fiche .m{font-size:.78rem;color:var(--slate-400);margin-bottom:.6rem}.cy-fiche dl{display:grid;grid-template-columns:auto 1fr;gap:.25rem .7rem;font-size:.8rem}.cy-fiche dt{color:var(--slate-400)}.cy-fiche dd{font-weight:600}'
    + '.cy-box{border:1px solid var(--slate-700);border-radius:.6rem;padding:.8rem;margin-bottom:.7rem}.cy-box h6{font-size:.8rem;font-weight:700;margin-bottom:.4rem;display:flex;justify-content:space-between;align-items:center}.cy-ok{color:var(--green-400)}.cy-ko{color:var(--red-400)}.cy-warn{color:var(--amber-400)}'
    + '.cy-rule{display:flex;gap:.7rem;align-items:flex-start;padding:.6rem .7rem;border:1px solid var(--slate-700);border-radius:.6rem;margin-bottom:.45rem}.cy-rule input{margin-top:.2rem;accent-color:#C8A960}.cy-rule b{display:block;font-size:.85rem}.cy-rule span{font-size:.75rem;color:var(--slate-400)}'
    + '.cy-hash{font-family:ui-monospace,Menlo,Consolas,monospace;font-size:.68rem;color:var(--slate-500)}'
    + '.cy-muted{font-size:.8rem;color:var(--slate-400)}.cy-actions{display:flex;flex-wrap:wrap;gap:.5rem;margin-top:.6rem}'
    + '.cy-mode{font-size:.68rem;padding:.2rem .55rem;border-radius:99px;border:1px solid var(--slate-700);color:var(--slate-400);margin-left:auto;font-weight:600}.cy-mode.ok{color:var(--green-400);border-color:rgba(74,222,128,.4)}.cy-mode.local{color:var(--amber-400);border-color:rgba(232,213,163,.4)}'
    + '@media(max-width:768px){.cy-kpis{grid-template-columns:1fr 1fr}.cy-week{grid-template-columns:repeat(7,1fr);gap:.25rem}.cy-day{padding:.35rem .1rem}.cy-form{grid-template-columns:1fr}.cy-row{grid-template-columns:52px 1fr;grid-template-rows:auto auto}.cy-row .cy-st{grid-column:2}.cy-table th:nth-child(n+5),.cy-table td:nth-child(n+5){display:none}}';
  var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  // ---------- utilitaires ----------
  function rng(seed){ var a=0; for(var i=0;i<seed.length;i++) a=(a*31+seed.charCodeAt(i))>>>0; return function(){ a|=0; a=a+0x6D2B79F5|0; var t=Math.imul(a^a>>>15,1|a); t=t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)/4294967296; }; }
  var PRENOMS = ['Marc','Julie','Nadia','Luca','Sofia','Yann','Amina','Pierre','Chloé','Karim','Elena','Thomas','Fatou','Nicolas','Laure','Mehdi','Anna','David','Inès','Samuel','Léa','Omar','Camille','Hugo','Sara','Ismaël','Émilie','Jonas','Aïcha','Benoît','Zoé','Rafael','Mia','Adrien','Noor','Julien','Elif','Bastien','Mariam','Loïc'];
  var NOMS = ['Rossier','Favre','Martin','Bianchi','Keller','Da Silva','Müller','Nguyen','Roulet','Berset','Diallo','Schmid','Girard','Pittet','Mendes','Huber','Bonvin','Costa','Morel','Weber','Haddad','Rey','Zbinden','Perrin','Okafor','Baumann','Chevalley','Gomez','Vuille','Steiner'];
  var GROUPES = [['O+',.38],['A+',.34],['B+',.09],['AB+',.04],['O−',.07],['A−',.06],['B−',.015],['AB−',.005]];
  var PHENOS = ['CcDee K−','ccDEe K−','CCDee K−','ccdee K−','CcDEe K+','ccDee K−','Ccdee K−','ccDEE K−'];
  var LIENS = { geneve:['https://www.onedoc.ch/fr/infirmier/geneve/pb5bt/centre-de-transfusion-sanguine-1','Réservation en ligne du CTS des HUG (OneDoc)'], vaud:['https://reservation.ichspendeblut.ch','Réservation Transfusion Interrégionale CRS'], valais:['https://reservation.ichspendeblut.ch','Réservation Transfusion Interrégionale CRS'], berne:['https://reservation.ichspendeblut.ch','Réservation Transfusion Interrégionale CRS'], zurich:['https://www.blutspendezurich.ch','Réservation Blutspende Zürich'] };
  function region(){ try { return regions[selectedRegion] || { name:'Genève', donors:12000, stock:{} }; } catch(e){ return { name:'Genève', donors:12000, stock:{} }; } }
  function cle(){ try { return selectedRegion || 'geneve'; } catch(e){ return 'geneve'; } }
  function jours(d){ return Math.round((Date.now()-d.getTime())/86400000); }
  function dateFr(d){ return d.toLocaleDateString('fr-CH',{day:'2-digit',month:'2-digit',year:'numeric'}); }
  function iso(d){ return d.toISOString().slice(0,10); }
  function aujourdhui(){ var d=new Date(); return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); }
  function h(s){ return String(s==null?'':s).replace(/[&<>"']/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
  function tirerGroupe(r){ var x=r(), acc=0; for(var i=0;i<GROUPES.length;i++){ acc+=GROUPES[i][1]; if(x<acc) return GROUPES[i][0]; } return 'O+'; }
  function creneaux(p){ var out=[], h0=parseInt(p.ouverture,10), m0=parseInt(p.ouverture.split(':')[1],10)||0, fin=parseInt(p.fermeture,10)*60+(parseInt(p.fermeture.split(':')[1],10)||0), t=h0*60+m0; while(t<fin){ out.push(String(Math.floor(t/60)).padStart(2,'0')+':'+String(t%60).padStart(2,'0')); t+=p.creneau_min; } return out; }
  function heureNum(s){ return parseInt(s,10)+(parseInt((s||'').split(':')[1],10)||0)/60; }
  function maintenant(){ var d=new Date(); return d.getHours()+d.getMinutes()/60; }
  function client(){ try { return window.BeeAcces && window.BeeAcces.client && window.BeeAcces.client(); } catch(e){ return null; } }
  function qui(){ var s = window.BeeAcces && window.BeeAcces.etat && window.BeeAcces.etat(); return (s && (s.nom||s.email)) || 'Opérateur·trice'; }
  function toast(type, msg){ if(window.showToast) window.showToast(type, msg); }
  function erreur(e){ var m=(e&&(e.message||e))+''; var t={ non_pro:'Cette action demande un accès à l’espace professionnel.', creneau_complet:'Ce créneau est complet.', deja_reserve:'Cette personne a déjà une réservation ce jour-là.', deja_en_attente:'Cette personne est déjà sur la liste d’attente.', aucun_creneau:'Aucun créneau libre aujourd’hui.', nom_manquant:'Le nom est incomplet.', donneur_inconnu:'Dossier introuvable.' }; for(var k in t) if(m.indexOf(k)>=0) return t[k]; return 'Le serveur a répondu : '+m.slice(0,120); }

  // ---------- état : serveur (Supabase) ou démonstration locale ----------
  var E = null, MODE = 'local', CHARGEMENT = false, SEL = null, ACCUEIL = null;
  function etatLocal(){
    var k = cle(), r = rng('bmb-'+k), reg = region(), donneurs = [], p = { nom:reg.name, lits:4, creneau_min:30, ouverture:'08:00', fermeture:'17:00', reservation_url:(LIENS[k]||LIENS.geneve)[0], reservation_label:(LIENS[k]||LIENS.geneve)[1], rappels:{r1:true,r2:true,r3:true,r4:true} };
    for(var i=0;i<42;i++){ var sexe=r()<.52?'F':'H', dernier=new Date(Date.now()-Math.floor(r()*420)*86400000);
      donneurs.push({ id:'D'+(1000+i), prenom:PRENOMS[Math.floor(r()*PRENOMS.length)], nom:NOMS[Math.floor(r()*NOMS.length)], sexe:sexe, age:18+Math.floor(r()*52), groupe:tirerGroupe(r), pheno:PHENOS[Math.floor(r()*PHENOS.length)], dons:1+Math.floor(r()*18), dernier:dernier, consent:{ version:r()<.8?'v2026-02':'v2025-06', signe:new Date(dernier.getTime()-Math.floor(r()*30)*86400000) }, canal:r()<.6?'courriel':(r()<.7?'SMS':'push'), tel:'+41 7'+Math.floor(r()*10)+' '+String(100+Math.floor(r()*900))+' '+String(10+Math.floor(r()*90))+' '+String(10+Math.floor(r()*90)), hb:sexe==='F'?118+Math.floor(r()*30):128+Math.floor(r()*35), poids:48+Math.floor(r()*50), voyage:r()<.15, medic:r()<.1, demo:true }); }
    var slots = creneaux(p), resa = [], now = maintenant(), idx = 0;
    while(resa.length<44 && idx<400){ idx++; var s=slots[Math.floor(r()*slots.length)]; if(resa.filter(function(x){return x.heure===s;}).length>=p.lits) continue; var d=donneurs[Math.floor(r()*donneurs.length)]; if(resa.some(function(x){return x.donneur===d.id;})) continue; var hh=heureNum(s), statut; if(hh+0.5<now) statut=r()<.9?'termine':'noshow'; else if(hh<=now) statut=['arrive','questionnaire','prelevement'][Math.floor(r()*3)]; else statut=r()<.75?'confirme':'reserve'; resa.push({ id:'R'+(100+resa.length), heure:s, donneur:d.id, statut:statut, lit:resa.filter(function(x){return x.heure===s;}).length+1 }); }
    var attente = donneurs.filter(function(d){ return !resa.some(function(x){return x.donneur===d.id;}); }).slice(0,5).map(function(d){ return { id:'A'+d.id, donneur:d.id }; });
    var e = { donneurs:donneurs, resa:resa, attente:attente, slots:slots, p:p, journal:[], semaine:[], evenements:{clics_7j:0,clics_jour:0,clics_30j:0} };
    for(var j=0;j<7;j++) e.semaine.push({ jour:iso(new Date(Date.now()+j*86400000)), n: j===0? resa.length : 28+Math.floor(rng('s'+k+j)()*40) });
    journalLocal(e, 'Système', 'Ouverture de la journée', 'Agenda du '+dateFr(new Date())+', démonstration locale');
    return e;
  }
  function empreinte(s){ var a=0x811c9dc5; for(var i=0;i<s.length;i++){ a^=s.charCodeAt(i); a=Math.imul(a,0x01000193)>>>0; } return a.toString(16).padStart(8,'0')+((a*31)>>>0).toString(16).padStart(8,'0'); }
  function journalLocal(e, acteur, action, detail){ var prev=e.journal.length?e.journal[0].hash:'0000000000000000', ent={ quand:new Date(), acteur:acteur, action:action, detail:detail, prev:prev }; ent.hash=empreinte(prev+'|'+ent.quand.toISOString()+'|'+action+'|'+detail); e.journal.unshift(ent); }
  function normaliser(d){
    var e = { p:d.parametres, donneurs:[], resa:[], attente:[], journal:[], semaine:d.semaine||[], evenements:d.evenements||{} };
    e.p.rappels = e.p.rappels || {r1:true,r2:true,r3:true,r4:true};
    e.slots = creneaux(e.p);
    (d.donneurs||[]).forEach(function(x){ var dernier = x.dernier_don ? new Date(x.dernier_don+'T12:00:00') : new Date(Date.now()-400*86400000); e.donneurs.push({ id:x.id, prenom:x.prenom, nom:x.nom, sexe:x.sexe||'X', age:x.age||0, groupe:x.groupe||'?', pheno:x.pheno||'', dons:x.dons||0, dernier:dernier, consent:{ version:x.consent_version||'', signe:x.consent_le?new Date(x.consent_le):null }, canal:x.canal||'courriel', tel:x.tel||'', email:x.email||'', hb:x.hb||0, poids:x.poids||0, voyage:!!x.voyage, medic:!!x.medic, demo:!!x.demo }); });
    (d.reservations||[]).forEach(function(x){ if(x.statut==='attente') e.attente.push({ id:x.id, donneur:x.donneur_id }); else e.resa.push({ id:x.id, heure:(x.heure||'').slice(0,5), donneur:x.donneur_id, statut:x.statut, lit:x.lit||1, source:x.source, hb:x.hb, poids:x.poids }); });
    e.resa.sort(function(a,b){ return a.heure<b.heure?-1:a.heure>b.heure?1:a.lit-b.lit; });
    (d.journal||[]).forEach(function(j){ e.journal.push({ quand:new Date(j.quand), acteur:j.acteur, action:j.action, detail:j.detail, hash:j.hash, prev:j.prev }); });
    return e;
  }
  function charger(cb){
    var sb = client();
    if(!sb){ E = etatLocal(); MODE = 'local'; cb(); return; }
    CHARGEMENT = true;
    sb.rpc('cd_etat', { p_region: cle() }).then(function(r){ if(r.error) throw r.error; E = normaliser(r.data); MODE = 'serveur'; CHARGEMENT=false; cb(); })
      .catch(function(err){ E = etatLocal(); MODE = 'local'; E.erreur = (err && err.message) || String(err); CHARGEMENT=false; cb(); });
  }
  function recharger(tab){ charger(function(){ RENDU[tab||courant()](); }); }
  function courant(){ try { return currentTab; } catch(e){ return 'agenda'; } }
  // action serveur, ou variante locale ; recharge et rend ensuite
  function agir(rpc, params, local, tab, ok){
    if(MODE==='serveur'){ var sb=client(); sb.rpc(rpc, params).then(function(r){ if(r.error) throw r.error; if(ok) ok(r.data); recharger(tab); }).catch(function(err){ toast('error', erreur(err)); RENDU[tab](); }); }
    else { try { local(); } catch(err){ toast('error', err.message); } RENDU[tab](); }
  }
  function donneur(id){ for(var i=0;i<E.donneurs.length;i++) if(E.donneurs[i].id===id) return E.donneurs[i]; return null; }
  function nomDe(d){ return d ? d.prenom+' '+d.nom : '—'; }
  function prochain(d){ return new Date(d.dernier.getTime()+(d.sexe==='F'?112:84)*86400000); }
  function resaDe(id){ return E.resa.filter(function(x){return x.id===id;})[0]; }

  // ---------- rendu commun ----------
  function kpis(list){ return '<div class="cy-kpis">'+list.map(function(k){ return '<div class="cy-kpi"><span>'+k[0]+'</span><b>'+k[1]+'</b>'+(k[2]?'<small>'+k[2]+'</small>':'')+'</div>'; }).join('')+'</div>'; }
  var LIB = { reserve:'Réservé', confirme:'Confirmé', arrive:'Arrivé·e', questionnaire:'Questionnaire', prelevement:'Prélèvement', termine:'Terminé', noshow:'Absent·e', ajourne:'Ajourné·e', attente:'Liste d’attente' };
  var SUITE = { reserve:'confirme', confirme:'arrive', arrive:'questionnaire', questionnaire:'prelevement', prelevement:'termine' };
  function badge(s){ return '<span class="cy-st '+s+'">'+(LIB[s]||s)+'</span>'; }
  function titre(txt, couleur, ico){ return '<div class="card-title"><svg style="stroke:var(--'+couleur+')" viewBox="0 0 24 24">'+ico+'</svg>'+txt+' — <span style="color:var(--amber-400);font-weight:400">'+h(region().name)+'</span><span class="cy-mode '+(MODE==='serveur'?'ok':'local')+'" title="'+(MODE==='serveur'?'Données enregistrées sur le serveur (Supabase, Zurich)':'Démonstration locale, rien n’est enregistré'+(E.erreur?' · '+h(E.erreur):''))+'">'+(MODE==='serveur'?'● enregistré':'○ démonstration locale')+'</span></div>'; }

  // ---------- Agenda ----------
  function rAgenda(){
    var el = document.getElementById('cy-agenda'); if(!el||!E) return;
    var p = E.p, cap = E.slots.length*p.lits, total = E.resa.filter(function(x){return x.statut!=='ajourne';}).length, termines = E.resa.filter(function(x){return x.statut==='termine';}).length, absents = E.resa.filter(function(x){return x.statut==='noshow';}).length;
    var noShowPred = Math.round(E.resa.filter(function(x){return x.statut==='reserve';}).length*0.35 + E.resa.filter(function(x){return x.statut==='confirme';}).length*0.08);
    var semaine = E.semaine.map(function(s,i){ var d=new Date(s.jour+'T12:00:00'); return '<div class="cy-day'+(i===0?' on':'')+'">'+d.toLocaleDateString('fr-CH',{weekday:'short'})+'<b>'+d.getDate()+'</b><i>'+s.n+' rés.</i></div>'; }).join('');
    var rows = E.resa.map(function(x){ var d = donneur(x.donneur); return '<div class="cy-row" data-id="'+x.id+'"><div class="h">'+x.heure+'<small style="display:block;color:var(--slate-500);font-weight:400">lit '+x.lit+'</small></div><div class="n">'+h(nomDe(d))+'<small>'+(d?d.groupe:'')+' · '+(d?d.dons:0)+' dons'+(x.source==='externe'?' · en ligne':'')+'</small></div>'+badge(x.statut)+'</div>'; }).join('');
    var attente = E.attente.map(function(a){ var d = donneur(a.donneur); return '<div class="cy-row" data-attente="'+a.id+'"><div class="h">—</div><div class="n">'+h(nomDe(d))+'<small>'+(d?d.groupe:'')+'</small></div>'+badge('attente')+'</div>'; }).join('');
    el.innerHTML = '<div class="grid-2-1"><div><div class="card">'+titre('Agenda et réservations','blue-400',TABS[0].ico)
      + kpis([['Réservations du jour', total, termines+' terminées · '+absents+' absences'],['Occupation des créneaux', Math.round(total/cap*100)+' %', total+' sur '+cap+' places'],['Liste d’attente', E.attente.length, 'placées dès qu’un créneau se libère'],['Clics vers la réservation en ligne', E.evenements.clics_7j||0, 'depuis l’espace donneur, 7 jours · '+(E.evenements.clics_jour||0)+' aujourd’hui']])
      + '<div class="cy-week">'+semaine+'</div>'
      + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:.6rem;flex-wrap:wrap;gap:.4rem"><h4 style="font-weight:700">Aujourd’hui, '+dateFr(new Date())+'</h4><div style="display:flex;gap:.4rem;flex-wrap:wrap"><a class="cy-btn s" href="'+h(p.reservation_url||'#')+'" target="_blank" rel="noopener" title="'+h(p.reservation_label||'')+'">↗ Réservation en ligne du centre</a><button class="cy-btn p s" id="cy-new">+ Réservation interne</button></div></div>'
      + '<div id="cy-newform" class="hidden"><div class="cy-form"><div><label>Donneur·se</label><select id="cy-nf-d">'+E.donneurs.map(function(d){return '<option value="'+d.id+'">'+h(nomDe(d))+' · '+d.groupe+'</option>';}).join('')+'</select></div><div><label>Créneau</label><select id="cy-nf-s">'+E.slots.map(function(s){ var n=E.resa.filter(function(x){return x.heure===s && x.statut!=='noshow' && x.statut!=='ajourne';}).length; return '<option value="'+s+'"'+(n>=p.lits?' disabled':'')+'>'+s+' · '+(p.lits-n)+' place(s)</option>'; }).join('')+'</select></div></div><div class="cy-actions"><button class="cy-btn p s" id="cy-nf-ok">Enregistrer</button><button class="cy-btn s" id="cy-nf-x">Annuler</button></div></div>'
      + '<p class="cy-muted" style="margin-bottom:.5rem">Les personnes réservent en ligne dans l’outil officiel du centre, vers lequel l’espace donneur redirige. L’agenda interne sert aux appels, aux passages spontanés et au suivi du parcours : un clic sur une ligne le fait avancer (réservé, confirmé, arrivé·e, questionnaire, prélèvement, terminé).</p>'
      + '<div class="cy-list">'+(rows||'<p class="cy-muted">Aucune réservation aujourd’hui.</p>')+'</div></div></div>'
      + '<div><div class="sidebar-card"><h4 style="font-weight:700;margin-bottom:.5rem">Liste d’attente</h4><p class="cy-muted" style="margin-bottom:.5rem">Un clic place la personne sur le premier créneau libre.</p><div class="cy-list">'+(attente||'<p class="cy-muted">Vide.</p>')+'</div></div>'
      + '<div class="sidebar-card" style="margin-top:1rem"><h4 style="font-weight:700;margin-bottom:.5rem">Capacité</h4><p class="cy-muted">'+p.lits+' lits, créneaux de '+p.creneau_min+' minutes de '+h(p.ouverture)+' à '+h(p.fermeture)+'. Absences estimées aujourd’hui : '+noShowPred+'. Les rappels à J-7 et J-1 partent automatiquement, avec confirmation en un clic.</p></div></div></div>';
    el.querySelectorAll('.cy-row[data-id]').forEach(function(row){ row.onclick = function(){ var x = resaDe(row.dataset.id); if(!x || !SUITE[x.statut]) return; var suivant = SUITE[x.statut];
      agir('cd_reservation_statut', { p_id:x.id, p_statut:suivant, p_extra:{} }, function(){ x.statut=suivant; journalLocal(E, qui(), LIB[suivant]+' — '+nomDe(donneur(x.donneur)), 'Réservation '+x.id); if(suivant==='termine'){ var d=donneur(x.donneur); d.dons++; d.dernier=new Date(); } }, 'agenda'); }; });
    el.querySelectorAll('.cy-row[data-attente]').forEach(function(row){ row.onclick = function(){ var a = E.attente.filter(function(y){return y.id===row.dataset.attente;})[0]; if(!a) return;
      agir('cd_attente_placer', { p_id:a.id }, function(){ var libre = E.slots.filter(function(s){ return E.resa.filter(function(x){return x.heure===s;}).length<p.lits && heureNum(s)>maintenant(); })[0]; if(!libre) throw new Error('Aucun créneau libre aujourd’hui.'); E.attente = E.attente.filter(function(y){return y!==a;}); E.resa.push({ id:'R'+Math.floor(Math.random()*1e6), heure:libre, donneur:a.donneur, statut:'reserve', lit:E.resa.filter(function(x){return x.heure===libre;}).length+1 }); E.resa.sort(function(x,y){ return x.heure<y.heure?-1:x.heure>y.heure?1:x.lit-y.lit; }); journalLocal(E, qui(), 'Réservation depuis la liste d’attente', nomDe(donneur(a.donneur))+' à '+libre); }, 'agenda', function(d){ toast('success','Placé·e à '+(d&&d.heure)+'.'); }); }; });
    document.getElementById('cy-new').onclick = function(){ document.getElementById('cy-newform').classList.toggle('hidden'); };
    document.getElementById('cy-nf-x').onclick = function(){ document.getElementById('cy-newform').classList.add('hidden'); };
    document.getElementById('cy-nf-ok').onclick = function(){ var id=document.getElementById('cy-nf-d').value, s=document.getElementById('cy-nf-s').value;
      agir('cd_reservation_creer', { p:{ region:cle(), donneur_id:id, jour:aujourdhui(), heure:s, source:'interne' } }, function(){ if(E.resa.some(function(x){return x.donneur===id;})) throw new Error('Cette personne a déjà une réservation aujourd’hui.'); E.resa.push({ id:'R'+Math.floor(Math.random()*1e6), heure:s, donneur:id, statut:'reserve', lit:E.resa.filter(function(x){return x.heure===s;}).length+1 }); E.resa.sort(function(x,y){ return x.heure<y.heure?-1:x.heure>y.heure?1:x.lit-y.lit; }); journalLocal(E, qui(), 'Nouvelle réservation', nomDe(donneur(id))+' à '+s); }, 'agenda', function(){ toast('success','Réservation enregistrée.'); }); };
  }

  // ---------- Donneur·se·s ----------
  function statutDon(d){ var pr = prochain(d), j = jours(pr); if(jours(d.dernier) > 365) return ['inactif','À relancer','cy-warn']; if(j >= 0) return ['eligible','Apte au don','cy-ok']; if(j > -14) return ['bientot','Apte dans '+(-j)+' j','cy-warn']; return ['attente','Apte le '+dateFr(pr),'cy-muted']; }
  var NOUVEAU = false;
  function rDonneurs(){
    var el = document.getElementById('cy-donneurs'); if(!el||!E) return;
    var q = (el.querySelector('#cy-q') ? el.querySelector('#cy-q').value : '').toLowerCase();
    var liste = E.donneurs.filter(function(d){ return !q || (nomDe(d)+' '+d.groupe+' '+d.id).toLowerCase().indexOf(q)>=0; });
    var actifs = E.donneurs.filter(function(d){ return jours(d.dernier)<=365; }).length, aptes = E.donneurs.filter(function(d){ return statutDon(d)[0]==='eligible'; }).length, relance = E.donneurs.filter(function(d){ return statutDon(d)[0]==='inactif'; }).length;
    var rows = liste.map(function(d){ var s = statutDon(d); return '<tr data-id="'+d.id+'"'+(SEL===d.id?' class="sel"':'')+'><td><b>'+h(nomDe(d))+'</b><br><span class="cy-muted">'+h(String(d.id).slice(0,8))+' · '+d.age+' ans</span></td><td><b>'+h(d.groupe)+'</b><br><span class="cy-muted">'+h(d.pheno)+'</span></td><td>'+dateFr(d.dernier)+'<br><span class="cy-muted">'+d.dons+' dons</span></td><td class="'+s[2]+'">'+s[1]+'</td><td>'+(d.consent.version==='v2026-02'?'<span class="cy-ok">à jour</span>':'<span class="cy-warn">à renouveler</span>')+'</td><td>'+h(d.canal)+'</td></tr>'; }).join('');
    var fiche = '';
    if(NOUVEAU){
      fiche = '<div class="sidebar-card"><h4 style="font-weight:700;margin-bottom:.4rem">Nouveau dossier</h4><div class="cy-form"><div><label>Prénom</label><input id="cy-n-prenom"></div><div><label>Nom</label><input id="cy-n-nom"></div><div><label>Sexe</label><select id="cy-n-sexe"><option value="F">Femme</option><option value="H">Homme</option><option value="X">Autre</option></select></div><div><label>Âge</label><input id="cy-n-age" type="number" value="30"></div><div><label>Groupe</label><select id="cy-n-groupe">'+GROUPES.map(function(g){return '<option>'+g[0]+'</option>';}).join('')+'</select></div><div><label>Canal préféré</label><select id="cy-n-canal"><option>courriel</option><option>SMS</option><option>push</option></select></div><div><label>Téléphone</label><input id="cy-n-tel" placeholder="+41 …"></div><div><label>Courriel</label><input id="cy-n-email" type="email"></div></div><div class="cy-actions"><button class="cy-btn p s" id="cy-n-ok">Enregistrer</button><button class="cy-btn s" id="cy-n-x">Annuler</button></div></div>';
    } else if(SEL && donneur(SEL)){ var d = donneur(SEL), s = statutDon(d);
      fiche = '<div class="sidebar-card cy-fiche"><h5>'+h(nomDe(d))+'</h5><div class="m">'+(d.sexe==='F'?'femme':d.sexe==='H'?'homme':'')+' · '+d.age+' ans · '+h(d.tel||'')+(d.demo?' · dossier de démonstration':'')+'</div>'
        + '<dl><dt>Groupe</dt><dd>'+h(d.groupe)+'</dd><dt>Phénotype</dt><dd>'+h(d.pheno||'—')+'</dd><dt>Dons</dt><dd>'+d.dons+'</dd><dt>Dernier don</dt><dd>'+dateFr(d.dernier)+'</dd><dt>Prochaine aptitude</dt><dd class="'+s[2]+'">'+s[1]+'</dd><dt>Consentement</dt><dd>'+(d.consent.version? h(d.consent.version)+(d.consent.signe?', signé le '+dateFr(d.consent.signe):'') : 'à signer')+'</dd><dt>Canal préféré</dt><dd>'+h(d.canal)+'</dd><dt>Hémoglobine</dt><dd>'+(d.hb?d.hb+' g/L au dernier don':'—')+'</dd></dl>'
        + '<div class="cy-actions"><button class="cy-btn p s" id="cy-f-attente">Liste d’attente du jour</button><a class="cy-btn s" href="'+h(E.p.reservation_url||'#')+'" target="_blank" rel="noopener">↗ Réserver en ligne</a><button class="cy-btn s" id="cy-f-rappel">Envoyer un rappel</button></div>'
        + '<p class="cy-muted" style="margin-top:.6rem">Le délai entre deux dons suit les critères de Transfusion CRS Suisse, 84 jours pour les hommes et 112 jours pour les femmes.</p></div>';
    }
    el.innerHTML = '<div class="grid-2-1"><div><div class="card">'+titre('Dossier donneur·se','purple-400',TABS[1].ico)
      + kpis([['Dossiers', E.donneurs.length, region().donors ? region().donors.toLocaleString('fr-CH')+' inscrit·e·s dans la région' : ''],['Actifs sur 12 mois', actifs, 'au moins un don'],['Aptes aujourd’hui', aptes, 'délai écoulé'],['Nouveaux donneurs revenus', (52+Math.floor(rng('pd'+cle())()*14))+' %', 'second don dans les 12 mois · à relancer : '+relance]])
      + '<div style="display:flex;gap:.5rem;margin-bottom:.6rem"><input class="cy-in" id="cy-q" placeholder="Rechercher un nom, un groupe" value="'+h(q)+'"><button class="cy-btn p s" id="cy-nouveau" style="flex:none">+ Dossier</button></div>'
      + '<div class="cy-wrap"><table class="cy-table"><thead><tr><th>Personne</th><th>Groupe</th><th>Dernier don</th><th>Aptitude</th><th>Consentement</th><th>Canal</th></tr></thead><tbody>'+rows+'</tbody></table></div></div></div>'
      + '<div>'+(fiche||'<div class="sidebar-card"><h4 style="font-weight:700;margin-bottom:.4rem">Fiche</h4><p class="cy-muted">Choisissez une personne dans la liste pour ouvrir sa fiche, la placer sur la liste d’attente ou lui envoyer un rappel.</p></div>')+'</div></div>';
    var inp = el.querySelector('#cy-q'); inp.oninput = function(){ var pos = inp.selectionStart; rDonneurs(); var i2 = el.querySelector('#cy-q'); i2.focus(); i2.setSelectionRange(pos,pos); };
    el.querySelector('#cy-nouveau').onclick = function(){ NOUVEAU = true; rDonneurs(); };
    el.querySelectorAll('tbody tr').forEach(function(tr){ tr.onclick = function(){ SEL = tr.dataset.id; NOUVEAU=false; rDonneurs(); }; });
    var nx = el.querySelector('#cy-n-x'); if(nx) nx.onclick = function(){ NOUVEAU=false; rDonneurs(); };
    var nok = el.querySelector('#cy-n-ok'); if(nok) nok.onclick = function(){ var p = { region:cle(), prenom:el.querySelector('#cy-n-prenom').value.trim(), nom:el.querySelector('#cy-n-nom').value.trim(), sexe:el.querySelector('#cy-n-sexe').value, age:parseInt(el.querySelector('#cy-n-age').value,10)||null, groupe:el.querySelector('#cy-n-groupe').value, canal:el.querySelector('#cy-n-canal').value, tel:el.querySelector('#cy-n-tel').value.trim(), email:el.querySelector('#cy-n-email').value.trim() }; if(!p.prenom||!p.nom){ toast('error','Prénom et nom sont nécessaires.'); return; } NOUVEAU=false;
      agir('cd_donneur_enregistrer', { p:p }, function(){ var id='D'+Math.floor(Math.random()*1e6); E.donneurs.push({ id:id, prenom:p.prenom, nom:p.nom, sexe:p.sexe, age:p.age||0, groupe:p.groupe, pheno:'', dons:0, dernier:new Date(Date.now()-400*86400000), consent:{version:'',signe:null}, canal:p.canal, tel:p.tel, email:p.email, hb:0, poids:0, voyage:false, medic:false }); SEL=id; journalLocal(E, qui(), 'Nouveau dossier donneur·se', p.prenom+' '+p.nom); }, 'donneurs', function(id){ SEL=id; toast('success','Dossier enregistré.'); }); };
    var b1 = el.querySelector('#cy-f-attente'); if(b1) b1.onclick = function(){ var d = donneur(SEL);
      agir('cd_reservation_creer', { p:{ region:cle(), donneur_id:d.id, jour:null, source:'interne' } }, function(){ if(E.attente.some(function(a){return a.donneur===d.id;})) throw new Error('Déjà sur la liste d’attente.'); E.attente.push({ id:'A'+d.id, donneur:d.id }); journalLocal(E, qui(), 'Ajout à la liste d’attente', nomDe(d)); }, 'donneurs', function(){ toast('success', nomDe(d)+' est sur la liste d’attente.'); }); };
    var b2 = el.querySelector('#cy-f-rappel'); if(b2) b2.onclick = function(){ var d = donneur(SEL); var detail = nomDe(d)+' — prochaine aptitude '+dateFr(prochain(d));
      agir('cd_journaliser', { p_region:cle(), p_action:'Rappel envoyé par '+d.canal, p_detail:detail }, function(){ journalLocal(E, qui(), 'Rappel envoyé par '+d.canal, detail); }, 'donneurs', function(){ toast('success','Rappel consigné.'); }); };
  }

  // ---------- Accueil et consentement ----------
  function rAccueil(){
    var el = document.getElementById('cy-accueil'); if(!el||!E) return;
    var arrivants = E.resa.filter(function(x){ return x.statut==='reserve'||x.statut==='confirme'||x.statut==='arrive'; });
    var a = ACCUEIL || {};
    var choix = '<div class="cy-form"><div><label>Personne attendue</label><select id="cy-a-sel"><option value="">Choisir</option>'+arrivants.map(function(x){ var d=donneur(x.donneur); return '<option value="'+x.id+'"'+(a.resa===x.id?' selected':'')+'>'+x.heure+' · '+h(nomDe(d))+' · '+(d?d.groupe:'')+'</option>'; }).join('')+'</select></div><div><label>Ou code du QR de check-in</label><input id="cy-a-qr" placeholder="8 premiers caractères de la réservation" value="'+h(a.qr||'')+'"></div></div>';
    var contenu = '';
    if(a.resa){
      var x = resaDe(a.resa), d = x && donneur(x.donneur);
      if(d){
        var delaiOk = jours(prochain(d)) >= 0, hbMin = d.sexe==='F'?125:135, hb = a.hb!=null?a.hb:(d.hb||0), poids = a.poids!=null?a.poids:(d.poids||0);
        var hbOk = hb >= hbMin, poidsOk = poids >= 50, ageOk = d.age>=18 && d.age<=75, voyageOk = !d.voyage, medicOk = !d.medic;
        var consentOk = a.consent || (d.consent.version==='v2026-02' && d.consent.signe && jours(d.consent.signe) < 365);
        var apte = delaiOk && hbOk && poidsOk && ageOk && voyageOk && medicOk;
        var ligne = function(ok, txt){ return '<div class="'+(ok?'cy-ok':'cy-ko')+'" style="font-size:.8rem">'+(ok?'✓':'✗')+' '+txt+'</div>'; };
        contenu = '<div class="cy-box"><h6>Questionnaire pré-rempli '+badge(x.statut)+'</h6><p class="cy-muted">Rempli en ligne la veille par '+h(nomDe(d))+'. Les réponses qui changent depuis le dernier don sont surlignées à la validation.</p>'
          + ligne(voyageOk, voyageOk?'Aucun séjour en zone à risque déclaré':'Séjour en zone à risque déclaré, vérification du délai')+ligne(medicOk, medicOk?'Aucun traitement en cours déclaré':'Traitement déclaré, avis médical')+ligne(ageOk,'Âge '+d.age+' ans')+ligne(delaiOk, delaiOk?'Délai depuis le dernier don respecté':'Délai depuis le dernier don insuffisant, apte le '+dateFr(prochain(d)))+'</div>'
          + '<div class="cy-box"><h6>Consentement électronique '+(consentOk?'<span class="cy-ok">'+(a.consent?'signé à l’instant':'valable, '+h(d.consent.version))+'</span>':'<span class="cy-warn">à signer</span>')+'</h6>'
          + (consentOk ? '<p class="cy-muted">'+(a.consent?'Version v2026-02 signée par '+h(a.consentNom)+', confirmée par code à usage unique. Empreinte <span class="cy-hash">'+h(a.consentHash)+'</span>':'Signé le '+dateFr(d.consent.signe)+'. Le renouvellement est proposé chaque année.')+'</p>'
            : '<p class="cy-muted">Version v2026-02. La signature demande le nom tapé et un code envoyé par '+h(d.canal)+'.</p><div class="cy-form"><div><label>Nom tapé en guise de signature</label><input id="cy-a-nom" placeholder="'+h(nomDe(d))+'"></div><div><label>Code reçu (démonstration : 4826)</label><input id="cy-a-otp" inputmode="numeric" placeholder="····"></div></div><button class="cy-btn s" id="cy-a-sign">Signer le consentement</button>')+'</div>'
          + '<div class="cy-box"><h6>Mesures à l’accueil</h6><div class="cy-form"><div><label>Hémoglobine (g/L), seuil '+hbMin+'</label><input id="cy-a-hb" type="number" value="'+hb+'"></div><div><label>Poids (kg), seuil 50</label><input id="cy-a-poids" type="number" value="'+poids+'"></div></div>'+ligne(hbOk,'Hémoglobine '+hb+' g/L')+ligne(poidsOk,'Poids '+poids+' kg')+'</div>'
          + '<div class="cy-box"><h6>Décision '+(apte?'<span class="cy-ok">apte au don</span>':'<span class="cy-ko">ajournement</span>')+'</h6><p class="cy-muted">'+(apte?'Tous les critères de Transfusion CRS Suisse sont remplis.':'Au moins un critère bloque le don aujourd’hui. La personne reçoit la date de sa prochaine aptitude et un mot d’explication.')+'</p><div class="cy-actions"><button class="cy-btn p s" id="cy-a-ok"'+(apte&&consentOk?'':' disabled')+'>Admettre au prélèvement</button><button class="cy-btn s" id="cy-a-ko">Ajourner</button></div>'+(apte&&!consentOk?'<p class="cy-muted" style="margin-top:.4rem">Le consentement signé débloque l’admission.</p>':'')+'</div>';
      }
    }
    el.innerHTML = '<div class="grid-2-1"><div><div class="card">'+titre('Accueil et consentement','green-400',TABS[2].ico)
      + kpis([['Attendu·e·s encore', arrivants.length, 'réservé·e·s ou confirmé·e·s'],['Arrivé·e·s', E.resa.filter(function(x){return x.statut==='arrive';}).length,'en attente du questionnaire'],['En prélèvement', E.resa.filter(function(x){return x.statut==='prelevement';}).length,'lits occupés'],['Terminés', E.resa.filter(function(x){return x.statut==='termine';}).length,'poches du jour']])
      + choix + (contenu||'<p class="cy-muted">Choisissez la personne qui se présente, ou saisissez le code de son QR. Le questionnaire rempli en ligne s’affiche pré-rempli, le consentement se signe à l’écran et la décision d’aptitude s’appuie sur les critères en vigueur.</p>')
      + '</div></div><div><div class="sidebar-card"><h4 style="font-weight:700;margin-bottom:.4rem">Le parcours à l’accueil</h4><ol class="cy-muted" style="padding-left:1.1rem;line-height:1.7"><li>Identification par QR, e-ID ou nom</li><li>Questionnaire pré-rempli, vérifié avec la personne</li><li>Consentement électronique, confirmé par code</li><li>Mesures (hémoglobine, poids) et décision d’aptitude</li><li>Admission au prélèvement, fin de parcours consignée</li></ol></div></div></div>';
    function arrivee(x){ if(x.statut==='reserve'||x.statut==='confirme'){ agir('cd_reservation_statut', { p_id:x.id, p_statut:'arrive', p_extra:{} }, function(){ x.statut='arrive'; journalLocal(E, qui(), 'Arrivée enregistrée', nomDe(donneur(x.donneur))); }, 'accueil'); } else rAccueil(); }
    el.querySelector('#cy-a-sel').onchange = function(ev){ ACCUEIL = { resa: ev.target.value }; var x=resaDe(ev.target.value); if(x) arrivee(x); else rAccueil(); };
    el.querySelector('#cy-a-qr').onchange = function(ev){ var code = ev.target.value.trim().toLowerCase(); var x = E.resa.filter(function(y){ return String(y.id).toLowerCase().indexOf(code)===0; })[0]; if(!x){ toast('error','Code inconnu dans l’agenda du jour.'); return; } ACCUEIL = { resa:x.id, qr:code }; arrivee(x); };
    var sign = el.querySelector('#cy-a-sign'); if(sign) sign.onclick = function(){ var nom = el.querySelector('#cy-a-nom').value.trim(), otp = el.querySelector('#cy-a-otp').value.trim(); if(nom.length<3){ toast('error','Tapez le nom complet en guise de signature.'); return; } if(otp!=='4826'){ toast('error','Le code ne correspond pas.'); return; } var x=resaDe(ACCUEIL.resa), d=donneur(x.donneur);
      agir('cd_consentement_signer', { p:{ donneur_id:d.id, reservation_id:x.id, version:'v2026-02', nom_signe:nom } }, function(){ d.consent={version:'v2026-02',signe:new Date()}; if(x.statut==='arrive') x.statut='questionnaire'; ACCUEIL.consent=true; ACCUEIL.consentNom=nom; ACCUEIL.consentHash=empreinte(nom+x.id+Date.now()); journalLocal(E, qui(), 'Consentement signé', nomDe(d)+' — v2026-02'); }, 'accueil', function(emp){ ACCUEIL.consent=true; ACCUEIL.consentNom=nom; ACCUEIL.consentHash=String(emp||'').slice(0,16); toast('success','Consentement enregistré.'); }); };
    var hbI = el.querySelector('#cy-a-hb'); if(hbI) hbI.onchange = function(){ ACCUEIL.hb = parseInt(hbI.value,10)||0; rAccueil(); };
    var pI = el.querySelector('#cy-a-poids'); if(pI) pI.onchange = function(){ ACCUEIL.poids = parseInt(pI.value,10)||0; rAccueil(); };
    var ok = el.querySelector('#cy-a-ok'); if(ok) ok.onclick = function(){ var x=resaDe(ACCUEIL.resa), extra={ hb:ACCUEIL.hb!=null?ACCUEIL.hb:undefined, poids:ACCUEIL.poids!=null?ACCUEIL.poids:undefined, detail:'lit '+x.lit }; ACCUEIL=null;
      agir('cd_reservation_statut', { p_id:x.id, p_statut:'prelevement', p_extra:extra }, function(){ x.statut='prelevement'; journalLocal(E, qui(), 'Admission au prélèvement', nomDe(donneur(x.donneur))+' — lit '+x.lit); }, 'accueil', function(){ toast('success','Admission consignée.'); }); };
    var ko = el.querySelector('#cy-a-ko'); if(ko) ko.onclick = function(){ var x=resaDe(ACCUEIL.resa); ACCUEIL=null;
      agir('cd_reservation_statut', { p_id:x.id, p_statut:'ajourne', p_extra:{ detail:'critère non rempli, prochaine aptitude communiquée' } }, function(){ x.statut='ajourne'; journalLocal(E, qui(), 'Ajournement', nomDe(donneur(x.donneur))); }, 'accueil'); };
  }

  // ---------- Rappels et récurrence ----------
  function groupesEnTension(){ var s = region().stock||{}, m = { oNeg:'O−', oPos:'O+', aNeg:'A−', aPos:'A+', bNeg:'B−', bPos:'B+', abNeg:'AB−', abPos:'AB+' }, out=[]; Object.keys(m).forEach(function(k){ if(s[k]!=null && s[k] < 50) out.push(m[k]); }); return out; }
  function rRappels(){
    var el = document.getElementById('cy-rappels'); if(!el||!E) return;
    var tension = groupesEnTension(), rp = E.p.rappels;
    var lots = {
      r1: E.resa.filter(function(x){return x.statut==='reserve';}).map(function(x){return donneur(x.donneur);}).filter(Boolean),
      r2: E.donneurs.filter(function(d){ var j=jours(prochain(d)); return j>=-7 && j<=0; }),
      r3: E.donneurs.filter(function(d){ return jours(d.dernier)>365; }),
      r4: E.donneurs.filter(function(d){ return tension.indexOf(d.groupe)>=0 && jours(prochain(d))>=0; })
    };
    var regles = [
      ['r1','Confirmation de rendez-vous','La veille du rendez-vous, avec confirmation en un clic. Les absences baissent d’un tiers.'],
      ['r2','Prochaine aptitude','Sept jours avant la fin du délai réglementaire, avec le lien de réservation en ligne du centre.'],
      ['r3','Retour des donneur·se·s inactifs','Après douze mois sans don, un message personnel signé par l’équipe.'],
      ['r4','Appel ciblé par groupe en tension','Déclenché quand le jumeau numérique annonce moins de cinq jours de couverture. Aujourd’hui '+(tension.length?tension.join(', '):'aucun groupe')+'.']
    ];
    var total = 0; regles.forEach(function(r){ if(rp[r[0]]) total += lots[r[0]].length; });
    el.innerHTML = '<div class="grid-2-1"><div><div class="card">'+titre('Rappels et récurrence','amber-400',TABS[3].ico)
      + kpis([['Messages prêts', total, 'pour le prochain envoi'],['Absences évitées ce mois', 23+Math.floor(rng('ns'+cle())()*20), 'grâce aux confirmations de rendez-vous'],['Donneur·se·s revenus', 11+Math.floor(rng('rv'+cle())()*15), 'après relance, sur 90 jours'],['Groupes en tension', tension.length?tension.join(' '):'aucun', 'lus dans les stocks du jour']])
      + regles.map(function(r){ return '<label class="cy-rule"><input type="checkbox" data-r="'+r[0]+'"'+(rp[r[0]]?' checked':'')+'><div><b>'+r[1]+' <span class="cy-muted">· '+lots[r[0]].length+' personne(s)</span></b><span>'+r[2]+'</span></div></label>'; }).join('')
      + '<div class="cy-actions"><button class="cy-btn p s" id="cy-r-go">Consigner l’envoi du lot</button><button class="cy-btn s" id="cy-r-voir">Voir les destinataires</button></div><p class="cy-muted" style="margin-top:.5rem">L’envoi effectif des messages passera par le prestataire de courriel et de SMS du centre ; ce bouton consigne le lot au journal.</p><div id="cy-r-liste" style="margin-top:.6rem"></div></div></div>'
      + '<div><div class="sidebar-card"><h4 style="font-weight:700;margin-bottom:.4rem">Comment les rappels sont réglés</h4><p class="cy-muted">Chaque personne choisit son canal (courriel, SMS ou notification) et la fréquence des messages. Les envois respectent le délai réglementaire entre deux dons et s’arrêtent dès la réservation faite. Le contenu s’adapte au groupe sanguin et au besoin du moment.</p></div></div></div>';
    el.querySelectorAll('input[data-r]').forEach(function(c){ c.onchange = function(){ rp[c.dataset.r] = c.checked; agir('cd_rappels_regler', { p_region:cle(), p_rappels:rp }, function(){}, 'rappels'); }; });
    el.querySelector('#cy-r-voir').onclick = function(){ var dest = []; regles.forEach(function(r){ if(rp[r[0]]) lots[r[0]].forEach(function(d){ if(dest.indexOf(d)<0) dest.push(d); }); }); document.getElementById('cy-r-liste').innerHTML = dest.length ? '<div class="cy-wrap"><table class="cy-table"><thead><tr><th>Personne</th><th>Groupe</th><th>Canal</th><th>Motif</th></tr></thead><tbody>'+dest.map(function(d){ var motifs=[]; regles.forEach(function(r){ if(rp[r[0]] && lots[r[0]].indexOf(d)>=0) motifs.push(r[1]); }); return '<tr><td>'+h(nomDe(d))+'</td><td>'+h(d.groupe)+'</td><td>'+h(d.canal)+'</td><td>'+motifs.join(', ')+'</td></tr>'; }).join('')+'</tbody></table></div>' : '<p class="cy-muted">Aucun destinataire avec les règles cochées.</p>'; };
    el.querySelector('#cy-r-go').onclick = function(){ if(!total){ toast('info','Aucun message à envoyer.'); return; } var detail = total+' message(s) — '+regles.filter(function(r){return rp[r[0]];}).map(function(r){return r[1];}).join(', ');
      agir('cd_journaliser', { p_region:cle(), p_action:'Lot de rappels envoyé', p_detail:detail }, function(){ journalLocal(E, qui(), 'Lot de rappels envoyé', detail); }, 'rappels', function(){ toast('success','Lot consigné au journal.'); }); };
  }

  // ---------- Journal et rapports ----------
  function csv(lignes){ return lignes.map(function(l){ return l.map(function(v){ v=String(v==null?'':v); return /[";\n]/.test(v) ? '"'+v.replace(/"/g,'""')+'"' : v; }).join(';'); }).join('\r\n'); }
  function telecharger(nom, contenu){ var b = new Blob(['﻿'+contenu], {type:'text/csv;charset=utf-8'}), a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = nom; document.body.appendChild(a); a.click(); setTimeout(function(){ URL.revokeObjectURL(a.href); a.remove(); }, 500); }
  function rJournal(){
    var el = document.getElementById('cy-journal'); if(!el||!E) return;
    var termines = E.resa.filter(function(x){return x.statut==='termine';}).length, absents = E.resa.filter(function(x){return x.statut==='noshow';}).length;
    var parGroupe = {}; E.resa.forEach(function(x){ if(x.statut==='termine'){ var d=donneur(x.donneur); if(d){ parGroupe[d.groupe]=(parGroupe[d.groupe]||0)+1; } } });
    var rows = E.journal.map(function(j){ return '<tr><td>'+j.quand.toLocaleString('fr-CH',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})+'</td><td>'+h(j.acteur)+'</td><td><b>'+h(j.action)+'</b><br><span class="cy-muted">'+h(j.detail)+'</span></td><td class="cy-hash">'+h(String(j.hash).slice(0,16))+'</td></tr>'; }).join('');
    el.innerHTML = '<div class="grid-2-1"><div><div class="card">'+titre('Journal et rapports','emerald-400',TABS[4].ico)
      + kpis([['Poches du jour', termines, Object.keys(parGroupe).map(function(g){return g+' '+parGroupe[g];}).join(' · ')||'aucune encore'],['Absences', absents, 'sur '+E.resa.length+' réservations'],['Événements consignés', E.journal.length, MODE==='serveur'?'journal chaîné côté serveur, 150 derniers':'journal local de démonstration'],['Clics vers la réservation', E.evenements.clics_30j||0, 'espace donneur, 30 jours']])
      + '<div class="cy-box"><h6>Clôture et exports</h6><p class="cy-muted">Le rapport du jour reprend les dons par groupe, les ajournements, les absences et les incidents, prêt pour la statistique de Transfusion CRS Suisse et pour l’archivage. L’export de période couvre les 30 derniers jours.</p><div class="cy-actions"><button class="cy-btn p s" id="cy-j-cloture">Clôturer la journée</button><button class="cy-btn s" id="cy-j-jour">Rapport du jour (CSV)</button><button class="cy-btn s" id="cy-j-periode">Réservations, 30 jours (CSV)</button><button class="cy-btn s" id="cy-j-csv">Journal (CSV)</button></div></div>'
      + '<h4 style="font-weight:700;margin:.8rem 0 .5rem">Journal d’audit</h4><p class="cy-muted" style="margin-bottom:.5rem">Chaque entrée porte l’empreinte de la précédente, calculée par le serveur. Toute modification après coup casse la chaîne et se voit.</p><div class="cy-wrap"><table class="cy-table"><thead><tr><th>Quand</th><th>Qui</th><th>Quoi</th><th title="Code calculé à partir de l’entrée et de la précédente ; il change si l’une des deux est modifiée après coup">Empreinte</th></tr></thead><tbody>'+rows+'</tbody></table></div></div></div>'
      + '<div><div class="sidebar-card"><h4 style="font-weight:700;margin-bottom:.4rem">Sécurité et conformité</h4><ul class="cy-muted" style="padding-left:1.1rem;line-height:1.7"><li>Données chez Supabase à Zurich, site chez Infomaniak à Genève, connexions chiffrées</li><li>Connexion par code à usage unique, appareil reconnu</li><li>Tables fermées, accès par fonctions réservées à l’espace pro</li><li>Consentement confirmé par code, version datée, empreinte</li><li>Journal chaîné, exports Swissmedic et SoHO à venir</li><li>Rôles par espace, accès révocable par l’administration</li><li>Code source public, licence AGPL-3.0</li></ul></div></div></div>';
    var lignesJour = function(){ return [['Rapport du jour', dateFr(new Date()), region().name],['Groupe','Dons']].concat(Object.keys(parGroupe).map(function(g){return [g,parGroupe[g]];})).concat([['Absences',absents],['Réservations',E.resa.length],['Ajournements',E.resa.filter(function(x){return x.statut==='ajourne';}).length]]); };
    el.querySelector('#cy-j-cloture').onclick = function(){ var detail = termines+' don(s), '+absents+' absence(s), '+E.resa.filter(function(x){return ['termine','noshow','ajourne'].indexOf(x.statut)<0;}).length+' parcours ouverts';
      agir('cd_journaliser', { p_region:cle(), p_action:'Clôture de la journée', p_detail:detail }, function(){ journalLocal(E, qui(), 'Clôture de la journée', detail); }, 'journal', function(){ toast('success','Journée clôturée.'); }); };
    el.querySelector('#cy-j-jour').onclick = function(){ telecharger('beemyblood-rapport-'+aujourdhui()+'.csv', csv(lignesJour())); };
    el.querySelector('#cy-j-csv').onclick = function(){ telecharger('beemyblood-journal-'+aujourdhui()+'.csv', csv([['Horodatage','Acteur','Action','Détail','Empreinte','Précédente']].concat(E.journal.map(function(j){ return [j.quand.toISOString(), j.acteur, j.action, j.detail, j.hash, j.prev]; })))); };
    el.querySelector('#cy-j-periode').onclick = function(){ var du = iso(new Date(Date.now()-30*86400000)), au = aujourdhui();
      if(MODE!=='serveur'){ telecharger('beemyblood-reservations-'+au+'.csv', csv([['Jour','Heure','Lit','Statut','Source','Prénom','Nom','Groupe']].concat(E.resa.map(function(x){ var d=donneur(x.donneur)||{}; return [au, x.heure, x.lit, x.statut, x.source||'interne', d.prenom, d.nom, d.groupe]; })))); return; }
      client().rpc('cd_exporter', { p_region:cle(), p_du:du, p_au:au }).then(function(r){ if(r.error) throw r.error; telecharger('beemyblood-reservations-'+du+'-'+au+'.csv', csv([['Jour','Heure','Lit','Statut','Source','Prénom','Nom','Groupe','Sexe','Hb','Poids']].concat((r.data||[]).map(function(x){ return [x.jour, x.heure, x.lit, x.statut, x.source, x.prenom, x.nom, x.groupe, x.sexe, x.hb, x.poids]; })))); }).catch(function(e){ toast('error', erreur(e)); }); };
  }

  var RENDU = { agenda:rAgenda, donneurs:rDonneurs, accueil:rAccueil, rappels:rRappels, journal:rJournal };

  // ---------- insertion dans la page ----------
  function installer(){
    var bar = document.getElementById('tabBar'); if(!bar || document.getElementById('cy-group')) return;
    var g = document.createElement('div'); g.className = 'tab-group'; g.id = 'cy-group';
    g.innerHTML = '<div class="tab-group-label">Opérer</div><div class="tab-group-tabs">'+TABS.map(function(t){ return '<button class="tab" data-tab="'+t.id+'" onclick="switchTab(\''+t.id+'\')"><svg viewBox="0 0 24 24">'+t.ico+'</svg>'+t.nom+'</button>'; }).join('')+'</div>';
    var groups = bar.querySelectorAll('.tab-group'); var agir0 = groups[groups.length-1];
    bar.insertBefore(g, agir0);
    var ref = document.getElementById('panel-campagnes');
    TABS.forEach(function(t){ var p = document.createElement('div'); p.id = 'panel-'+t.id; p.className = 'hidden'; p.innerHTML = '<div id="cy-'+t.id+'"><div class="card"><p class="cy-muted">Chargement…</p></div></div>'; ref.parentNode.insertBefore(p, ref); });
    var st0 = window.switchTab, cr0 = window.changeRegion;
    window.switchTab = function(tab){
      st0(tab);
      IDS.forEach(function(id){ var p=document.getElementById('panel-'+id); if(p) p.classList.toggle('hidden', id!==tab); });
      if(IDS.indexOf(tab)>=0){ var rb=document.querySelector('.region-bar'); if(rb) rb.style.display=''; if(!E){ if(!CHARGEMENT) charger(function(){ RENDU[tab](); }); } else RENDU[tab](); }
    };
    window.changeRegion = function(){ cr0.apply(this, arguments); E = null; SEL = null; ACCUEIL = null; var ct = courant(); if(IDS.indexOf(ct)>=0) charger(function(){ RENDU[ct](); }); };
    if(window.BeeAcces && window.BeeAcces.onDeverrouille) window.BeeAcces.onDeverrouille(function(){ E = null; var ct = courant(); if(IDS.indexOf(ct)>=0) charger(function(){ RENDU[ct](); }); });
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', installer); else installer();
  window.BeeCycle = { recharger:function(){ E=null; recharger(courant()); }, mode:function(){ return MODE; } };
})();
