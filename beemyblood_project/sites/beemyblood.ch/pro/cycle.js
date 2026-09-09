/*
 * BeeMyBlood Pro — groupe d'onglets « Opérer » : le cycle du don au quotidien
 * (agenda et réservations, dossier donneur, accueil et consentement, rappels, journal et rapports).
 * Données de démonstration générées par région, reproductibles. S'ajoute à pro/index.html sans le modifier :
 * le script crée le groupe d'onglets, les panneaux et enveloppe switchTab / changeRegion.
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
    + '.cy-week{display:grid;grid-template-columns:repeat(7,1fr);gap:.4rem;margin-bottom:1rem}.cy-day{border:1px solid var(--slate-700);border-radius:.6rem;padding:.45rem .3rem;text-align:center;cursor:pointer;font-size:.72rem;color:var(--slate-400)}.cy-day b{display:block;font-size:1rem;color:#f0ece2}.cy-day.on{border-color:var(--amber-400);background:rgba(232,213,163,.08)}.cy-day i{display:block;font-style:normal;font-size:.68rem;color:var(--amber-400)}'
    + '.cy-list{display:flex;flex-direction:column;gap:.4rem}.cy-row{display:grid;grid-template-columns:64px 1fr auto;gap:.7rem;align-items:center;padding:.55rem .7rem;border:1px solid var(--slate-700);border-radius:.6rem;background:rgba(255,255,255,.015);cursor:pointer}.cy-row:hover{border-color:var(--slate-500)}.cy-row .h{font-weight:700;font-variant-numeric:tabular-nums}.cy-row .n{font-size:.85rem}.cy-row .n small{color:var(--slate-400);margin-left:.4rem}'
    + '.cy-st{font-size:.65rem;padding:.2rem .5rem;border-radius:.3rem;white-space:nowrap;font-weight:600}.cy-st.reserve{background:rgba(96,165,250,.15);color:var(--blue-400)}.cy-st.confirme{background:rgba(96,165,250,.25);color:var(--blue-400)}.cy-st.arrive{background:rgba(232,213,163,.18);color:var(--amber-400)}.cy-st.questionnaire{background:rgba(192,132,252,.18);color:var(--purple-400)}.cy-st.prelevement{background:rgba(255,107,107,.18);color:var(--red-400)}.cy-st.termine{background:rgba(74,222,128,.18);color:var(--green-400)}.cy-st.noshow{background:rgba(90,90,114,.3);color:var(--slate-400)}.cy-st.attente{background:rgba(52,211,153,.15);color:var(--emerald-400)}'
    + '.cy-btn{padding:.5rem .9rem;border-radius:.5rem;border:1px solid var(--slate-700);background:var(--slate-800);color:#f0ece2;font:inherit;font-size:.8rem;font-weight:600;cursor:pointer}.cy-btn.p{background:var(--amber-500);color:#0a0a12;border-color:var(--amber-500)}.cy-btn:disabled{opacity:.5;cursor:not-allowed}.cy-btn.s{font-size:.72rem;padding:.35rem .6rem}'
    + '.cy-form{display:grid;grid-template-columns:1fr 1fr;gap:.6rem;margin:.6rem 0}.cy-form label{font-size:.72rem;color:var(--slate-400);display:block;margin-bottom:.2rem}.cy-form input,.cy-form select,.cy-in{width:100%;padding:.55rem .65rem;border-radius:.5rem;border:1px solid var(--slate-700);background:var(--slate-900);color:#fff;font:inherit;font-size:.85rem}'
    + '.cy-table{width:100%;border-collapse:collapse;font-size:.8rem}.cy-table th{text-align:left;font-size:.68rem;text-transform:uppercase;letter-spacing:.06em;color:var(--slate-400);padding:.45rem .5rem;border-bottom:1px solid var(--slate-700)}.cy-table td{padding:.5rem;border-bottom:1px solid rgba(255,255,255,.05);vertical-align:top}.cy-table tr.sel td{background:rgba(232,213,163,.07)}.cy-table tbody tr{cursor:pointer}.cy-wrap{overflow:auto}'
    + '.cy-fiche h5{font-size:1rem;font-weight:800;margin-bottom:.2rem}.cy-fiche .m{font-size:.78rem;color:var(--slate-400);margin-bottom:.6rem}.cy-fiche dl{display:grid;grid-template-columns:auto 1fr;gap:.25rem .7rem;font-size:.8rem}.cy-fiche dt{color:var(--slate-400)}.cy-fiche dd{font-weight:600}'
    + '.cy-box{border:1px solid var(--slate-700);border-radius:.6rem;padding:.8rem;margin-bottom:.7rem}.cy-box h6{font-size:.8rem;font-weight:700;margin-bottom:.4rem;display:flex;justify-content:space-between;align-items:center}.cy-ok{color:var(--green-400)}.cy-ko{color:var(--red-400)}.cy-warn{color:var(--amber-400)}'
    + '.cy-rule{display:flex;gap:.7rem;align-items:flex-start;padding:.6rem .7rem;border:1px solid var(--slate-700);border-radius:.6rem;margin-bottom:.45rem}.cy-rule input{margin-top:.2rem;accent-color:#C8A960}.cy-rule b{display:block;font-size:.85rem}.cy-rule span{font-size:.75rem;color:var(--slate-400)}'
    + '.cy-hash{font-family:ui-monospace,Menlo,Consolas,monospace;font-size:.68rem;color:var(--slate-500)}'
    + '.cy-muted{font-size:.8rem;color:var(--slate-400)}.cy-actions{display:flex;flex-wrap:wrap;gap:.5rem;margin-top:.6rem}'
    + '@media(max-width:768px){.cy-kpis{grid-template-columns:1fr 1fr}.cy-week{grid-template-columns:repeat(7,1fr);gap:.25rem}.cy-day{padding:.35rem .1rem}.cy-form{grid-template-columns:1fr}.cy-row{grid-template-columns:52px 1fr;grid-template-rows:auto auto}.cy-row .cy-st{grid-column:2}.cy-table th:nth-child(n+5),.cy-table td:nth-child(n+5){display:none}}';
  var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  // ---------- aléatoire reproductible et données de démonstration ----------
  function rng(seed){ var a=0; for(var i=0;i<seed.length;i++) a=(a*31+seed.charCodeAt(i))>>>0; return function(){ a|=0; a=a+0x6D2B79F5|0; var t=Math.imul(a^a>>>15,1|a); t=t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)/4294967296; }; }
  var PRENOMS = ['Marc','Julie','Nadia','Luca','Sofia','Yann','Amina','Pierre','Chloé','Karim','Elena','Thomas','Fatou','Nicolas','Laure','Mehdi','Anna','David','Inès','Samuel','Léa','Omar','Camille','Hugo','Sara','Ismaël','Émilie','Jonas','Aïcha','Benoît','Zoé','Rafael','Mia','Adrien','Noor','Julien','Elif','Bastien','Mariam','Loïc'];
  var NOMS = ['Rossier','Favre','Martin','Bianchi','Keller','Da Silva','Müller','Nguyen','Roulet','Berset','Diallo','Schmid','Girard','Pittet','Mendes','Huber','Bonvin','Costa','Morel','Weber','Haddad','Rey','Zbinden','Perrin','Okafor','Baumann','Chevalley','Gomez','Vuille','Steiner'];
  var GROUPES = [['O+',.38],['A+',.34],['B+',.09],['AB+',.04],['O−',.07],['A−',.06],['B−',.015],['AB−',.005]];
  var PHENOS = ['CcDee K−','ccDEe K−','CCDee K−','ccdee K−','CcDEe K+','ccDee K−','Ccdee K−','ccDEE K−'];
  var ETAT = {};   // état par région (donneurs, réservations, journal)
  function region(){ try { return regions[selectedRegion] || { name:'Genève', donors:12000, stock:{} }; } catch(e){ return { name:'Genève', donors:12000, stock:{} }; } }
  function cle(){ try { return selectedRegion || 'geneve'; } catch(e){ return 'geneve'; } }
  function jours(d){ return Math.round((Date.now()-d.getTime())/86400000); }
  function dateFr(d){ return d.toLocaleDateString('fr-CH',{day:'2-digit',month:'2-digit',year:'numeric'}); }
  function iso(d){ return d.toISOString().slice(0,10); }
  function tirerGroupe(r){ var x=r(), acc=0; for(var i=0;i<GROUPES.length;i++){ acc+=GROUPES[i][1]; if(x<acc) return GROUPES[i][0]; } return 'O+'; }

  function etat(){
    var k = cle(); if(ETAT[k]) return ETAT[k];
    var r = rng('bmb-'+k), reg = region(), donneurs = [], n = 42;
    for(var i=0;i<n;i++){
      var sexe = r()<.52?'F':'H', dernier = new Date(Date.now()-Math.floor(r()*420)*86400000), delai = sexe==='F'?112:84;
      var nb = 1+Math.floor(r()*18);
      donneurs.push({ id:'D'+(1000+i), prenom:PRENOMS[Math.floor(r()*PRENOMS.length)], nom:NOMS[Math.floor(r()*NOMS.length)], sexe:sexe, age:18+Math.floor(r()*52),
        groupe:tirerGroupe(r), pheno:PHENOS[Math.floor(r()*PHENOS.length)], dons:nb, dernier:dernier, prochain:new Date(dernier.getTime()+delai*86400000),
        consent:{ version: r()<.8?'v2026-02':'v2025-06', signe:new Date(dernier.getTime()-Math.floor(r()*30)*86400000) },
        canal: r()<.6?'courriel':(r()<.7?'SMS':'push'), tel:'+41 7'+Math.floor(r()*10)+' '+String(100+Math.floor(r()*900))+' '+String(10+Math.floor(r()*90))+' '+String(10+Math.floor(r()*90)),
        hb: sexe==='F'? 118+Math.floor(r()*30) : 128+Math.floor(r()*35), poids: 48+Math.floor(r()*50), voyage: r()<.15, medic: r()<.1 });
    }
    // réservations du jour : 4 lits, créneaux de 30 min de 08h00 à 17h00 (18 créneaux, 72 places)
    var slots = []; for(var h=8; h<17; h++){ slots.push((h<10?'0':'')+h+':00'); slots.push((h<10?'0':'')+h+':30'); }
    var resa = [], nowH = new Date().getHours()+new Date().getMinutes()/60, pris = {};
    var nbResa = 40 + Math.floor(r()*10), idx = 0;
    while(resa.length<nbResa && idx<400){
      idx++; var s = slots[Math.floor(r()*slots.length)]; pris[s]=(pris[s]||0); if(pris[s]>=4) continue; pris[s]++;
      var d = donneurs[Math.floor(r()*donneurs.length)]; if(resa.some(function(x){return x.donneur===d.id;})) continue;
      var hh = parseInt(s.slice(0,2),10)+(s.slice(3)==='30'?.5:0), statut;
      if(hh+0.5 < nowH) statut = r()<.9 ? 'termine' : 'noshow';
      else if(hh <= nowH) statut = ['arrive','questionnaire','prelevement'][Math.floor(r()*3)];
      else statut = r()<.75 ? 'confirme' : 'reserve';
      resa.push({ id:'R'+(100+resa.length), heure:s, donneur:d.id, statut:statut, lit:pris[s] });
    }
    resa.sort(function(a,b){ return a.heure<b.heure?-1:a.heure>b.heure?1:a.lit-b.lit; });
    var attente = donneurs.filter(function(d){ return !resa.some(function(x){return x.donneur===d.id;}); }).slice(0,5).map(function(d){ return d.id; });
    var e = { donneurs:donneurs, resa:resa, slots:slots, attente:attente, journal:[], jour:new Date(), sel:null, accueil:null, rappels:{r1:true,r2:true,r3:true,r4:true} };
    ETAT[k] = e;
    journaliser(e, 'Système', 'Ouverture de la journée', 'Agenda du '+dateFr(new Date())+', 4 lits, 18 créneaux', true);
    journaliser(e, 'Sécurité', 'Connexion', 'Session ouverte (code à usage unique, appareil reconnu)', true);
    return e;
  }
  function donneur(e, id){ for(var i=0;i<e.donneurs.length;i++) if(e.donneurs[i].id===id) return e.donneurs[i]; return null; }
  function nomDe(d){ return d ? d.prenom+' '+d.nom : '—'; }
  function qui(){ var s = window.BeeAcces && window.BeeAcces.etat && window.BeeAcces.etat(); return (s && (s.nom||s.email)) || 'Opérateur·trice'; }

  // ---------- journal chaîné ----------
  function empreinte(s){ var h=0x811c9dc5; for(var i=0;i<s.length;i++){ h^=s.charCodeAt(i); h=Math.imul(h,0x01000193)>>>0; } var h2=0x811c9dc5; for(var j=s.length-1;j>=0;j--){ h2^=s.charCodeAt(j); h2=Math.imul(h2,0x01000193)>>>0; } return (h.toString(16)+h2.toString(16)).padStart(16,'0'); }
  function journaliser(e, acteur, action, detail, silencieux){
    var prev = e.journal.length ? e.journal[e.journal.length-1].hash : '0000000000000000';
    var quand = new Date(), entree = { quand:quand, acteur:acteur, action:action, detail:detail, prev:prev };
    entree.hash = empreinte(prev+'|'+quand.toISOString()+'|'+acteur+'|'+action+'|'+detail);
    e.journal.push(entree);
    if(!silencieux && window.showToast) window.showToast('success', action+' — consigné au journal.');
  }

  // ---------- rendu commun ----------
  function h(s){ return String(s==null?'':s).replace(/[&<>"']/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
  function kpis(list){ return '<div class="cy-kpis">'+list.map(function(k){ return '<div class="cy-kpi"><span>'+k[0]+'</span><b>'+k[1]+'</b>'+(k[2]?'<small>'+k[2]+'</small>':'')+'</div>'; }).join('')+'</div>'; }
  var LIB = { reserve:'Réservé', confirme:'Confirmé', arrive:'Arrivé·e', questionnaire:'Questionnaire', prelevement:'Prélèvement', termine:'Terminé', noshow:'Absent·e', attente:'Liste d’attente' };
  var SUITE = { reserve:'confirme', confirme:'arrive', arrive:'questionnaire', questionnaire:'prelevement', prelevement:'termine' };
  function badge(s){ return '<span class="cy-st '+s+'">'+LIB[s]+'</span>'; }
  function titre(txt, couleur, ico){ return '<div class="card-title"><svg style="stroke:var(--'+couleur+')" viewBox="0 0 24 24">'+ico+'</svg>'+txt+' — <span style="color:var(--amber-400);font-weight:400">'+h(region().name)+'</span></div>'; }

  // ---------- Agenda ----------
  function rAgenda(){
    var e = etat(), el = document.getElementById('cy-agenda'); if(!el) return;
    var total = e.resa.length, termines = e.resa.filter(function(x){return x.statut==='termine';}).length, absents = e.resa.filter(function(x){return x.statut==='noshow';}).length;
    var occup = Math.round(total/72*100), noShowPred = Math.round(e.resa.filter(function(x){return x.statut==='reserve';}).length*0.35 + e.resa.filter(function(x){return x.statut==='confirme';}).length*0.08);
    var semaine = ''; for(var i=0;i<7;i++){ var d=new Date(Date.now()+i*86400000); var n = i===0? total : 28+Math.floor(rng('s'+cle()+i)()*40); semaine += '<div class="cy-day'+(i===0?' on':'')+'">'+d.toLocaleDateString('fr-CH',{weekday:'short'})+'<b>'+d.getDate()+'</b><i>'+n+' rés.</i></div>'; }
    var rows = e.resa.map(function(x){ var d = donneur(e, x.donneur); return '<div class="cy-row" data-id="'+x.id+'"><div class="h">'+x.heure+'<small style="display:block;color:var(--slate-500);font-weight:400">lit '+x.lit+'</small></div><div class="n">'+h(nomDe(d))+'<small>'+d.groupe+' · '+d.dons+' dons</small></div>'+badge(x.statut)+'</div>'; }).join('');
    var attente = e.attente.map(function(id){ var d = donneur(e,id); return '<div class="cy-row" data-attente="'+id+'"><div class="h">—</div><div class="n">'+h(nomDe(d))+'<small>'+d.groupe+'</small></div>'+badge('attente')+'</div>'; }).join('');
    el.innerHTML = '<div class="grid-2-1"><div><div class="card">'+titre('Agenda et réservations','blue-400',TABS[0].ico)
      + kpis([['Réservations du jour', total, termines+' terminées · '+absents+' absences'],['Occupation des créneaux', occup+' %', total+' sur 72 places'],['Liste d’attente', e.attente.length, 'placées dès qu’un créneau se libère'],['Absences prévues', noShowPred, 'estimation, sur-réservation autorisée']])
      + '<div class="cy-week">'+semaine+'</div>'
      + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:.6rem"><h4 style="font-weight:700">Aujourd’hui, '+dateFr(new Date())+'</h4><button class="cy-btn p s" id="cy-new">+ Réservation</button></div>'
      + '<div id="cy-newform" class="hidden"><div class="cy-form"><div><label>Donneur·se</label><select id="cy-nf-d">'+e.donneurs.map(function(d){return '<option value="'+d.id+'">'+h(nomDe(d))+' · '+d.groupe+'</option>';}).join('')+'</select></div><div><label>Créneau</label><select id="cy-nf-s">'+e.slots.map(function(s){ var n=e.resa.filter(function(x){return x.heure===s;}).length; return '<option value="'+s+'"'+(n>=4?' disabled':'')+'>'+s+' · '+(4-n)+' place(s)</option>'; }).join('')+'</select></div></div><div class="cy-actions"><button class="cy-btn p s" id="cy-nf-ok">Enregistrer</button><button class="cy-btn s" id="cy-nf-x">Annuler</button></div></div>'
      + '<p class="cy-muted" style="margin-bottom:.5rem">Un clic sur une ligne fait avancer le parcours (réservé, confirmé, arrivé·e, questionnaire, prélèvement, terminé).</p>'
      + '<div class="cy-list">'+rows+'</div></div></div>'
      + '<div><div class="sidebar-card"><h4 style="font-weight:700;margin-bottom:.5rem">Liste d’attente</h4><p class="cy-muted" style="margin-bottom:.5rem">Un clic place la personne sur le premier créneau libre.</p><div class="cy-list">'+(attente||'<p class="cy-muted">Vide.</p>')+'</div></div>'
      + '<div class="sidebar-card" style="margin-top:1rem"><h4 style="font-weight:700;margin-bottom:.5rem">Capacité</h4><p class="cy-muted">4 lits, créneaux de 30 minutes de 08h00 à 17h00. Les rappels à J-7 et J-1 partent automatiquement, avec confirmation en un clic.</p></div></div></div>';
    el.querySelectorAll('.cy-row[data-id]').forEach(function(row){ row.onclick = function(){ var x = e.resa.filter(function(y){return y.id===row.dataset.id;})[0]; if(!x || !SUITE[x.statut]) return; x.statut = SUITE[x.statut]; journaliser(e, qui(), LIB[x.statut]+' — '+nomDe(donneur(e,x.donneur)), 'Réservation '+x.id+' de '+x.heure); rAgenda(); }; });
    el.querySelectorAll('.cy-row[data-attente]').forEach(function(row){ row.onclick = function(){ var id=row.dataset.attente, libre = e.slots.filter(function(s){ return e.resa.filter(function(x){return x.heure===s;}).length<4 && (parseInt(s,10)+(s.slice(3)==='30'?.5:0)) > new Date().getHours()+new Date().getMinutes()/60; })[0]; if(!libre){ window.showToast && window.showToast('error','Aucun créneau libre aujourd’hui.'); return; } e.attente = e.attente.filter(function(a){return a!==id;}); e.resa.push({ id:'R'+(100+e.resa.length+Math.floor(Math.random()*900)), heure:libre, donneur:id, statut:'reserve', lit:e.resa.filter(function(x){return x.heure===libre;}).length+1 }); e.resa.sort(function(a,b){ return a.heure<b.heure?-1:a.heure>b.heure?1:a.lit-b.lit; }); journaliser(e, qui(), 'Réservation depuis la liste d’attente', nomDe(donneur(e,id))+' à '+libre); rAgenda(); }; });
    document.getElementById('cy-new').onclick = function(){ document.getElementById('cy-newform').classList.toggle('hidden'); };
    document.getElementById('cy-nf-x').onclick = function(){ document.getElementById('cy-newform').classList.add('hidden'); };
    document.getElementById('cy-nf-ok').onclick = function(){ var id=document.getElementById('cy-nf-d').value, s=document.getElementById('cy-nf-s').value; if(e.resa.some(function(x){return x.donneur===id;})){ window.showToast && window.showToast('error','Cette personne a déjà une réservation aujourd’hui.'); return; } e.resa.push({ id:'R'+(100+e.resa.length+Math.floor(Math.random()*900)), heure:s, donneur:id, statut:'reserve', lit:e.resa.filter(function(x){return x.heure===s;}).length+1 }); e.resa.sort(function(a,b){ return a.heure<b.heure?-1:a.heure>b.heure?1:a.lit-b.lit; }); journaliser(e, qui(), 'Nouvelle réservation', nomDe(donneur(e,id))+' à '+s); rAgenda(); };
  }

  // ---------- Donneur·se·s ----------
  function statutDon(d){ var j = jours(d.prochain); if(jours(d.dernier) > 365) return ['inactif','À relancer','cy-warn']; if(j >= 0) return ['eligible','Apte au don','cy-ok']; if(j > -14) return ['bientot','Apte dans '+(-j)+' j','cy-warn']; return ['attente','Apte le '+dateFr(d.prochain),'cy-muted']; }
  function rDonneurs(){
    var e = etat(), el = document.getElementById('cy-donneurs'); if(!el) return;
    var q = (el.querySelector('#cy-q') ? el.querySelector('#cy-q').value : '').toLowerCase();
    var liste = e.donneurs.filter(function(d){ return !q || (nomDe(d)+' '+d.groupe+' '+d.id).toLowerCase().indexOf(q)>=0; });
    var actifs = e.donneurs.filter(function(d){ return jours(d.dernier)<=365; }).length, aptes = e.donneurs.filter(function(d){ return statutDon(d)[0]==='eligible'; }).length, relance = e.donneurs.filter(function(d){ return statutDon(d)[0]==='inactif'; }).length;
    var rows = liste.map(function(d){ var s = statutDon(d); return '<tr data-id="'+d.id+'"'+(e.sel===d.id?' class="sel"':'')+'><td><b>'+h(nomDe(d))+'</b><br><span class="cy-muted">'+d.id+' · '+d.age+' ans</span></td><td><b>'+d.groupe+'</b><br><span class="cy-muted">'+d.pheno+'</span></td><td>'+dateFr(d.dernier)+'<br><span class="cy-muted">'+d.dons+' dons</span></td><td class="'+s[2]+'">'+s[1]+'</td><td>'+(d.consent.version==='v2026-02'?'<span class="cy-ok">à jour</span>':'<span class="cy-warn">à renouveler</span>')+'</td><td>'+d.canal+'</td></tr>'; }).join('');
    var fiche = '';
    if(e.sel){ var d = donneur(e, e.sel), s = statutDon(d);
      fiche = '<div class="sidebar-card cy-fiche"><h5>'+h(nomDe(d))+'</h5><div class="m">'+d.id+' · '+(d.sexe==='F'?'femme':'homme')+' · '+d.age+' ans · '+d.tel+'</div>'
        + '<dl><dt>Groupe</dt><dd>'+d.groupe+'</dd><dt>Phénotype</dt><dd>'+d.pheno+'</dd><dt>Dons</dt><dd>'+d.dons+'</dd><dt>Dernier don</dt><dd>'+dateFr(d.dernier)+'</dd><dt>Prochaine aptitude</dt><dd class="'+s[2]+'">'+s[1]+'</dd><dt>Consentement</dt><dd>'+d.consent.version+', signé le '+dateFr(d.consent.signe)+'</dd><dt>Canal préféré</dt><dd>'+d.canal+'</dd><dt>Hémoglobine</dt><dd>'+d.hb+' g/L au dernier don</dd></dl>'
        + '<div class="cy-actions"><button class="cy-btn p s" id="cy-f-resa">Réserver un créneau</button><button class="cy-btn s" id="cy-f-rappel">Envoyer un rappel</button><button class="cy-btn s" id="cy-f-passeport">Passeport sanguin</button></div>'
        + '<p class="cy-muted" style="margin-top:.6rem">Le délai entre deux dons suit les critères de Transfusion CRS Suisse, 84 jours pour les hommes et 112 jours pour les femmes.</p></div>';
    }
    el.innerHTML = '<div class="grid-2-1"><div><div class="card">'+titre('Dossier donneur·se','purple-400',TABS[1].ico)
      + kpis([['Donneur·se·s inscrit·e·s', region().donors ? region().donors.toLocaleString('fr-CH') : e.donneurs.length, e.donneurs.length+' affiché·e·s en démonstration'],['Actifs sur 12 mois', actifs, 'au moins un don'],['Aptes aujourd’hui', aptes, 'délai écoulé'],['À relancer', relance, 'aucun don depuis un an']])
      + '<input class="cy-in" id="cy-q" placeholder="Rechercher un nom, un groupe, un identifiant" value="'+h(q)+'" style="margin-bottom:.6rem">'
      + '<div class="cy-wrap"><table class="cy-table"><thead><tr><th>Personne</th><th>Groupe</th><th>Dernier don</th><th>Aptitude</th><th>Consentement</th><th>Canal</th></tr></thead><tbody>'+rows+'</tbody></table></div></div></div>'
      + '<div>'+(fiche||'<div class="sidebar-card"><h4 style="font-weight:700;margin-bottom:.4rem">Fiche</h4><p class="cy-muted">Choisissez une personne dans la liste pour ouvrir sa fiche, réserver un créneau ou envoyer un rappel.</p></div>')+'</div></div>';
    var inp = el.querySelector('#cy-q'); inp.oninput = function(){ var pos = inp.selectionStart; rDonneurs(); var i2 = el.querySelector('#cy-q'); i2.focus(); i2.setSelectionRange(pos,pos); };
    el.querySelectorAll('tbody tr').forEach(function(tr){ tr.onclick = function(){ e.sel = tr.dataset.id; rDonneurs(); }; });
    var b1 = el.querySelector('#cy-f-resa'); if(b1) b1.onclick = function(){ var d = donneur(e,e.sel); if(e.resa.some(function(x){return x.donneur===d.id;})){ window.showToast && window.showToast('info', nomDe(d)+' a déjà une réservation aujourd’hui.'); } else { e.attente.push(d.id); journaliser(e, qui(), 'Ajout à la liste d’attente', nomDe(d)); } window.switchTab('agenda'); };
    var b2 = el.querySelector('#cy-f-rappel'); if(b2) b2.onclick = function(){ var d = donneur(e,e.sel); journaliser(e, qui(), 'Rappel envoyé par '+d.canal, nomDe(d)+' — prochaine aptitude '+dateFr(d.prochain)); };
    var b3 = el.querySelector('#cy-f-passeport'); if(b3) b3.onclick = function(){ var d = donneur(e,e.sel); journaliser(e, qui(), 'Passeport sanguin consulté', nomDe(d)+' — '+d.groupe+' '+d.pheno, true); window.showToast && window.showToast('info','Passeport sanguin de '+nomDe(d)+' : '+d.groupe+', '+d.pheno+', '+d.dons+' dons, dernier le '+dateFr(d.dernier)+'.'); };
  }

  // ---------- Accueil et consentement ----------
  function rAccueil(){
    var e = etat(), el = document.getElementById('cy-accueil'); if(!el) return;
    var arrivants = e.resa.filter(function(x){ return x.statut==='reserve'||x.statut==='confirme'||x.statut==='arrive'; });
    var a = e.accueil || {};
    var choix = '<div class="cy-form"><div><label>Personne attendue</label><select id="cy-a-sel"><option value="">Choisir</option>'+arrivants.map(function(x){ var d=donneur(e,x.donneur); return '<option value="'+x.id+'"'+(a.resa===x.id?' selected':'')+'>'+x.heure+' · '+h(nomDe(d))+' · '+d.groupe+'</option>'; }).join('')+'</select></div><div><label>Ou code du QR de check-in</label><input id="cy-a-qr" placeholder="Ex. R104" value="'+h(a.qr||'')+'"></div></div>';
    var contenu = '';
    if(a.resa){
      var x = e.resa.filter(function(y){return y.id===a.resa;})[0], d = x && donneur(e, x.donneur);
      if(d){
        var delaiOk = jours(d.prochain) >= 0, hbMin = d.sexe==='F'?125:135, hb = a.hb!=null?a.hb:d.hb, poids = a.poids!=null?a.poids:d.poids;
        var hbOk = hb >= hbMin, poidsOk = poids >= 50, ageOk = d.age>=18 && d.age<=75, voyageOk = !d.voyage, medicOk = !d.medic;
        var apte = delaiOk && hbOk && poidsOk && ageOk && voyageOk && medicOk;
        var ligne = function(ok, txt){ return '<div class="'+(ok?'cy-ok':'cy-ko')+'" style="font-size:.8rem">'+(ok?'✓':'✗')+' '+txt+'</div>'; };
        contenu = '<div class="cy-box"><h6>Questionnaire pré-rempli '+badge(x.statut)+'</h6><p class="cy-muted">Rempli en ligne la veille par '+h(nomDe(d))+'. Les réponses qui changent depuis le dernier don sont surlignées à la validation.</p>'
          + ligne(voyageOk, voyageOk?'Aucun séjour en zone à risque déclaré':'Séjour en zone à risque déclaré, vérification du délai')+ligne(medicOk, medicOk?'Aucun traitement en cours déclaré':'Traitement déclaré, avis médical')+ligne(ageOk,'Âge '+d.age+' ans')+ligne(delaiOk, delaiOk?'Délai depuis le dernier don respecté':'Délai depuis le dernier don insuffisant, apte le '+dateFr(d.prochain))+'</div>'
          + '<div class="cy-box"><h6>Consentement électronique '+(a.consent?'<span class="cy-ok">signé</span>':'<span class="cy-warn">en attente</span>')+'</h6>'
          + (a.consent ? '<p class="cy-muted">Version v2026-02 signée par '+h(a.consentNom)+' à '+a.consentQuand+', confirmée par code à usage unique. Empreinte '+'<span class="cy-hash">'+a.consentHash+'</span></p>'
            : '<p class="cy-muted">Version v2026-02, '+(d.consent.version==='v2026-02'?'déjà signée le '+dateFr(d.consent.signe)+', renouvellement annuel proposé':'nouvelle version à signer')+'. La signature demande le nom tapé et un code envoyé par '+d.canal+'.</p><div class="cy-form"><div><label>Nom tapé en guise de signature</label><input id="cy-a-nom" placeholder="'+h(nomDe(d))+'"></div><div><label>Code reçu (démonstration : 4826)</label><input id="cy-a-otp" inputmode="numeric" placeholder="····"></div></div><button class="cy-btn s" id="cy-a-sign">Signer le consentement</button>')+'</div>'
          + '<div class="cy-box"><h6>Constantes à l’accueil</h6><div class="cy-form"><div><label>Hémoglobine (g/L), seuil '+hbMin+'</label><input id="cy-a-hb" type="number" value="'+hb+'"></div><div><label>Poids (kg), seuil 50</label><input id="cy-a-poids" type="number" value="'+poids+'"></div></div>'+ligne(hbOk,'Hémoglobine '+hb+' g/L')+ligne(poidsOk,'Poids '+poids+' kg')+'</div>'
          + '<div class="cy-box"><h6>Décision '+(apte?'<span class="cy-ok">apte au don</span>':'<span class="cy-ko">ajournement</span>')+'</h6><p class="cy-muted">'+(apte?'Tous les critères de Transfusion CRS Suisse sont remplis.':'Au moins un critère bloque le don aujourd’hui. La personne reçoit la date de sa prochaine aptitude et un mot d’explication.')+'</p><div class="cy-actions"><button class="cy-btn p s" id="cy-a-ok"'+(apte&&a.consent?'':' disabled')+'>Admettre au prélèvement</button><button class="cy-btn s" id="cy-a-ko">Ajourner</button></div>'+(apte&&!a.consent?'<p class="cy-muted" style="margin-top:.4rem">Le consentement signé débloque l’admission.</p>':'')+'</div>';
      }
    }
    el.innerHTML = '<div class="grid-2-1"><div><div class="card">'+titre('Accueil et consentement','green-400',TABS[2].ico)
      + kpis([['Attendu·e·s encore', arrivants.length, 'réservé·e·s ou confirmé·e·s'],['Arrivé·e·s', e.resa.filter(function(x){return x.statut==='arrive';}).length,'en attente du questionnaire'],['En prélèvement', e.resa.filter(function(x){return x.statut==='prelevement';}).length,'lits occupés'],['Terminés', e.resa.filter(function(x){return x.statut==='termine';}).length,'poches du jour']])
      + choix + (contenu||'<p class="cy-muted">Choisissez la personne qui se présente, ou saisissez le code de son QR. Le questionnaire rempli en ligne s’affiche pré-rempli, le consentement se signe à l’écran et la décision d’aptitude s’appuie sur les critères en vigueur.</p>')
      + '</div></div><div><div class="sidebar-card"><h4 style="font-weight:700;margin-bottom:.4rem">Le parcours à l’accueil</h4><ol class="cy-muted" style="padding-left:1.1rem;line-height:1.7"><li>Identification par QR, e-ID ou nom</li><li>Questionnaire pré-rempli, vérifié avec la personne</li><li>Consentement électronique, confirmé par code</li><li>Constantes et décision d’aptitude</li><li>Admission au prélèvement, fin de parcours consignée</li></ol></div></div></div>';
    el.querySelector('#cy-a-sel').onchange = function(ev){ e.accueil = { resa: ev.target.value }; if(ev.target.value){ var x=e.resa.filter(function(y){return y.id===ev.target.value;})[0]; if(x && x.statut!=='arrive'){ x.statut='arrive'; journaliser(e, qui(), 'Arrivée enregistrée', nomDe(donneur(e,x.donneur))+' — '+x.id, true); } } rAccueil(); };
    el.querySelector('#cy-a-qr').onchange = function(ev){ var code = ev.target.value.trim().toUpperCase(); var x = e.resa.filter(function(y){return y.id===code;})[0]; if(!x){ window.showToast && window.showToast('error','Code inconnu dans l’agenda du jour.'); return; } e.accueil = { resa:x.id, qr:code }; if(x.statut==='reserve'||x.statut==='confirme'){ x.statut='arrive'; journaliser(e, qui(), 'Arrivée par QR', nomDe(donneur(e,x.donneur))+' — '+x.id, true); } rAccueil(); };
    var sign = el.querySelector('#cy-a-sign'); if(sign) sign.onclick = function(){ var nom = el.querySelector('#cy-a-nom').value.trim(), otp = el.querySelector('#cy-a-otp').value.trim(); if(nom.length<3){ window.showToast && window.showToast('error','Tapez le nom complet en guise de signature.'); return; } if(otp!=='4826'){ window.showToast && window.showToast('error','Le code ne correspond pas.'); return; } var x=e.resa.filter(function(y){return y.id===e.accueil.resa;})[0], d=donneur(e,x.donneur); e.accueil.consent=true; e.accueil.consentNom=nom; e.accueil.consentQuand=new Date().toLocaleTimeString('fr-CH',{hour:'2-digit',minute:'2-digit'}); e.accueil.consentHash=empreinte(nom+x.id+Date.now()); d.consent={version:'v2026-02',signe:new Date()}; if(x.statut==='arrive') x.statut='questionnaire'; journaliser(e, qui(), 'Consentement signé', nomDe(d)+' — v2026-02, code à usage unique vérifié'); rAccueil(); };
    var hbI = el.querySelector('#cy-a-hb'); if(hbI) hbI.onchange = function(){ e.accueil.hb = parseInt(hbI.value,10)||0; rAccueil(); };
    var pI = el.querySelector('#cy-a-poids'); if(pI) pI.onchange = function(){ e.accueil.poids = parseInt(pI.value,10)||0; rAccueil(); };
    var ok = el.querySelector('#cy-a-ok'); if(ok) ok.onclick = function(){ var x=e.resa.filter(function(y){return y.id===e.accueil.resa;})[0]; x.statut='prelevement'; journaliser(e, qui(), 'Admission au prélèvement', nomDe(donneur(e,x.donneur))+' — lit '+x.lit); e.accueil=null; rAccueil(); };
    var ko = el.querySelector('#cy-a-ko'); if(ko) ko.onclick = function(){ var x=e.resa.filter(function(y){return y.id===e.accueil.resa;})[0]; x.statut='termine'; journaliser(e, qui(), 'Ajournement', nomDe(donneur(e,x.donneur))+' — critère non rempli, prochaine aptitude communiquée'); e.accueil=null; rAccueil(); };
  }

  // ---------- Rappels et récurrence ----------
  function groupesEnTension(){ var s = region().stock||{}, m = { oNeg:'O−', oPos:'O+', aNeg:'A−', aPos:'A+', bNeg:'B−', bPos:'B+', abNeg:'AB−', abPos:'AB+' }, out=[]; Object.keys(m).forEach(function(k){ if(s[k]!=null && s[k] < 50) out.push(m[k]); }); return out; }
  function rRappels(){
    var e = etat(), el = document.getElementById('cy-rappels'); if(!el) return;
    var tension = groupesEnTension();
    var lots = {
      r1: e.resa.filter(function(x){return x.statut==='reserve';}).map(function(x){return donneur(e,x.donneur);}),
      r2: e.donneurs.filter(function(d){ var j=jours(d.prochain); return j>=-7 && j<=0; }),
      r3: e.donneurs.filter(function(d){ return jours(d.dernier)>365; }),
      r4: e.donneurs.filter(function(d){ return tension.indexOf(d.groupe)>=0 && jours(d.prochain)>=0; })
    };
    var regles = [
      ['r1','Confirmation de rendez-vous','La veille du rendez-vous, avec confirmation en un clic. Les absences baissent d’un tiers.'],
      ['r2','Prochaine aptitude','Sept jours avant la fin du délai réglementaire, avec les créneaux proposés.'],
      ['r3','Retour des donneur·se·s inactifs','Après douze mois sans don, un message personnel signé par l’équipe.'],
      ['r4','Appel ciblé par groupe en tension','Déclenché quand le jumeau numérique annonce moins de cinq jours de couverture. Aujourd’hui '+(tension.length?tension.join(', '):'aucun groupe')+'.']
    ];
    var total = 0; regles.forEach(function(r){ if(e.rappels[r[0]]) total += lots[r[0]].length; });
    el.innerHTML = '<div class="grid-2-1"><div><div class="card">'+titre('Rappels et récurrence','amber-400',TABS[3].ico)
      + kpis([['Messages prêts', total, 'pour le prochain envoi'],['Absences évitées ce mois', 23+Math.floor(rng('ns'+cle())()*20), 'grâce aux confirmations'],['Donneur·se·s revenus', 11+Math.floor(rng('rv'+cle())()*15), 'après relance, sur 90 jours'],['Groupes en tension', tension.length?tension.join(' '):'aucun', 'lus dans les stocks du jour']])
      + regles.map(function(r){ return '<label class="cy-rule"><input type="checkbox" data-r="'+r[0]+'"'+(e.rappels[r[0]]?' checked':'')+'><div><b>'+r[1]+' <span class="cy-muted">· '+lots[r[0]].length+' personne(s)</span></b><span>'+r[2]+'</span></div></label>'; }).join('')
      + '<div class="cy-actions"><button class="cy-btn p s" id="cy-r-go">Envoyer le lot (démonstration)</button><button class="cy-btn s" id="cy-r-voir">Voir les destinataires</button></div><div id="cy-r-liste" style="margin-top:.6rem"></div></div></div>'
      + '<div><div class="sidebar-card"><h4 style="font-weight:700;margin-bottom:.4rem">Comment les rappels sont réglés</h4><p class="cy-muted">Chaque personne choisit son canal (courriel, SMS ou notification) et la fréquence des messages. Les envois respectent le délai réglementaire entre deux dons et s’arrêtent dès la réservation faite. Le contenu s’adapte au groupe sanguin et au besoin du moment.</p></div></div></div>';
    el.querySelectorAll('input[data-r]').forEach(function(c){ c.onchange = function(){ e.rappels[c.dataset.r] = c.checked; rRappels(); }; });
    el.querySelector('#cy-r-voir').onclick = function(){ var dest = []; regles.forEach(function(r){ if(e.rappels[r[0]]) lots[r[0]].forEach(function(d){ if(dest.indexOf(d)<0) dest.push(d); }); }); document.getElementById('cy-r-liste').innerHTML = dest.length ? '<div class="cy-wrap"><table class="cy-table"><thead><tr><th>Personne</th><th>Groupe</th><th>Canal</th><th>Motif</th></tr></thead><tbody>'+dest.map(function(d){ var motifs=[]; regles.forEach(function(r){ if(e.rappels[r[0]] && lots[r[0]].indexOf(d)>=0) motifs.push(r[1]); }); return '<tr><td>'+h(nomDe(d))+'</td><td>'+d.groupe+'</td><td>'+d.canal+'</td><td>'+motifs.join(', ')+'</td></tr>'; }).join('')+'</tbody></table></div>' : '<p class="cy-muted">Aucun destinataire avec les règles cochées.</p>'; };
    el.querySelector('#cy-r-go').onclick = function(){ if(!total){ window.showToast && window.showToast('info','Aucun message à envoyer.'); return; } journaliser(e, qui(), 'Lot de rappels envoyé', total+' message(s) — '+regles.filter(function(r){return e.rappels[r[0]];}).map(function(r){return r[1];}).join(', ')); };
  }

  // ---------- Journal et rapports ----------
  function csv(lignes){ return lignes.map(function(l){ return l.map(function(v){ v=String(v==null?'':v); return /[";\n]/.test(v) ? '"'+v.replace(/"/g,'""')+'"' : v; }).join(';'); }).join('\r\n'); }
  function telecharger(nom, contenu){ var b = new Blob(['﻿'+contenu], {type:'text/csv;charset=utf-8'}), a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = nom; document.body.appendChild(a); a.click(); setTimeout(function(){ URL.revokeObjectURL(a.href); a.remove(); }, 500); }
  function rJournal(){
    var e = etat(), el = document.getElementById('cy-journal'); if(!el) return;
    var termines = e.resa.filter(function(x){return x.statut==='termine';}).length, absents = e.resa.filter(function(x){return x.statut==='noshow';}).length;
    var parGroupe = {}; e.resa.forEach(function(x){ if(x.statut==='termine'){ var g=donneur(e,x.donneur).groupe; parGroupe[g]=(parGroupe[g]||0)+1; } });
    var rows = e.journal.slice().reverse().map(function(j){ return '<tr><td>'+j.quand.toLocaleTimeString('fr-CH',{hour:'2-digit',minute:'2-digit',second:'2-digit'})+'</td><td>'+h(j.acteur)+'</td><td><b>'+h(j.action)+'</b><br><span class="cy-muted">'+h(j.detail)+'</span></td><td class="cy-hash">'+j.hash+'</td></tr>'; }).join('');
    el.innerHTML = '<div class="grid-2-1"><div><div class="card">'+titre('Journal et rapports','emerald-400',TABS[4].ico)
      + kpis([['Poches du jour', termines, Object.keys(parGroupe).map(function(g){return g+' '+parGroupe[g];}).join(' · ')||'aucune encore'],['Absences', absents, 'sur '+e.resa.length+' réservations'],['Événements consignés', e.journal.length, 'journal chaîné, en lecture seule'],['Taux de conversion', e.resa.length?Math.round(termines/e.resa.length*100)+' %':'—', 'réservations devenues dons']])
      + '<div class="cy-box"><h6>Clôture de la journée</h6><p class="cy-muted">Le rapport du jour reprend les dons par groupe, les ajournements, les absences et les incidents, prêt pour la statistique de Transfusion CRS Suisse et pour l’archivage.</p><div class="cy-actions"><button class="cy-btn p s" id="cy-j-cloture">Clôturer et exporter le rapport</button><button class="cy-btn s" id="cy-j-csv">Exporter le journal (CSV)</button><button class="cy-btn s" id="cy-j-stat">Statistique CRS (CSV)</button></div></div>'
      + '<h4 style="font-weight:700;margin:.8rem 0 .5rem">Journal d’audit</h4><p class="cy-muted" style="margin-bottom:.5rem">Chaque entrée porte l’empreinte de la précédente. Toute modification après coup casse la chaîne et se voit.</p><div class="cy-wrap"><table class="cy-table"><thead><tr><th>Heure</th><th>Qui</th><th>Quoi</th><th>Empreinte</th></tr></thead><tbody>'+rows+'</tbody></table></div></div></div>'
      + '<div><div class="sidebar-card"><h4 style="font-weight:700;margin-bottom:.4rem">Sécurité et conformité</h4><ul class="cy-muted" style="padding-left:1.1rem;line-height:1.7"><li>Hébergement en Suisse, connexions chiffrées</li><li>Connexion par code à usage unique, appareil reconnu</li><li>Consentement confirmé par code, version datée</li><li>Journal chaîné, exports Swissmedic et SoHO</li><li>Rôles par espace, accès révocable par l’administration</li><li>Code source public, licence AGPL-3.0</li></ul></div></div></div>';
    el.querySelector('#cy-j-cloture').onclick = function(){ journaliser(e, qui(), 'Clôture de la journée', termines+' don(s), '+absents+' absence(s), '+e.resa.filter(function(x){return x.statut!=='termine'&&x.statut!=='noshow';}).length+' parcours ouverts'); var lignes=[['Rapport du jour', dateFr(new Date()), region().name],['Groupe','Dons']].concat(Object.keys(parGroupe).map(function(g){return [g,parGroupe[g]];})).concat([['Absences',absents],['Réservations',e.resa.length]]); telecharger('beemyblood-rapport-'+iso(new Date())+'.csv', csv(lignes)); rJournal(); };
    el.querySelector('#cy-j-csv').onclick = function(){ journaliser(e, qui(), 'Export du journal', e.journal.length+' entrées', true); telecharger('beemyblood-journal-'+iso(new Date())+'.csv', csv([['Horodatage','Acteur','Action','Détail','Empreinte','Précédente']].concat(e.journal.map(function(j){ return [j.quand.toISOString(), j.acteur, j.action, j.detail, j.hash, j.prev]; })))); rJournal(); };
    el.querySelector('#cy-j-stat').onclick = function(){ journaliser(e, qui(), 'Export statistique CRS', 'Dons par groupe et par sexe, '+dateFr(new Date()), true); var parSexe={F:0,H:0}; e.resa.forEach(function(x){ if(x.statut==='termine') parSexe[donneur(e,x.donneur).sexe]++; }); telecharger('beemyblood-statistique-crs-'+iso(new Date())+'.csv', csv([['Région','Date','Groupe','Dons']].concat(Object.keys(parGroupe).map(function(g){return [region().name, iso(new Date()), g, parGroupe[g]];})).concat([['Région','Date','Femmes',parSexe.F],['Région','Date','Hommes',parSexe.H]]))); rJournal(); };
  }

  var RENDU = { agenda:rAgenda, donneurs:rDonneurs, accueil:rAccueil, rappels:rRappels, journal:rJournal };

  // ---------- insertion dans la page ----------
  function installer(){
    var bar = document.getElementById('tabBar'); if(!bar || document.getElementById('cy-group')) return;
    var g = document.createElement('div'); g.className = 'tab-group'; g.id = 'cy-group';
    g.innerHTML = '<div class="tab-group-label">Opérer</div><div class="tab-group-tabs">'+TABS.map(function(t){ return '<button class="tab" data-tab="'+t.id+'" onclick="switchTab(\''+t.id+'\')"><svg viewBox="0 0 24 24">'+t.ico+'</svg>'+t.nom+'</button>'; }).join('')+'</div>';
    var groups = bar.querySelectorAll('.tab-group'); var agir = groups[groups.length-1];
    bar.insertBefore(g, agir);
    var ref = document.getElementById('panel-campagnes');
    TABS.forEach(function(t){ var p = document.createElement('div'); p.id = 'panel-'+t.id; p.className = 'hidden'; p.innerHTML = '<div id="cy-'+t.id+'"></div>'; ref.parentNode.insertBefore(p, ref); });
    var st0 = window.switchTab, cr0 = window.changeRegion;
    window.switchTab = function(tab){
      st0(tab);
      IDS.forEach(function(id){ var p=document.getElementById('panel-'+id); if(p) p.classList.toggle('hidden', id!==tab); });
      if(IDS.indexOf(tab)>=0){ var rb=document.querySelector('.region-bar'); if(rb) rb.style.display=''; RENDU[tab](); }
    };
    window.changeRegion = function(){ cr0.apply(this, arguments); var ct; try { ct = currentTab; } catch(e){ ct = null; } if(IDS.indexOf(ct)>=0) RENDU[ct](); };
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', installer); else installer();
})();
