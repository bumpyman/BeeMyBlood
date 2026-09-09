/*
 * BeeMyBlood Pro — Jumeau numérique de la filière sang, version 2
 * Transposition du travail de Bachelor « Digital Twin des urgences pédiatriques des HUG »
 * (Morsch, Poupard-Kuimi, Gonçalves Silva, HEG Genève 2026) à la chaîne du sang :
 * moteur à événements discrets, flux aléatoires séparés par source, réplications avec
 * intervalle de confiance, loi de Little contrôlée à chaque réplication, scénario déclaratif,
 * cinq écrans (Scénario, Résultats, Comparaison, Poste de régulation, Phénotypes).
 * Tout s'exécute dans le navigateur avec des données de démonstration ; l'état de départ du
 * stock peut être lu dans le baromètre officiel (api/donnees.php).
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */
(function(){
  'use strict';
  var VERSION = 'jumeau 2.0';
  var GROUPES = ['O−','O+','A−','A+','B−','B+','AB−','AB+'];
  var PARTS = { 'O−':6, 'O+':35, 'A−':7, 'A+':38, 'B−':1, 'B+':8, 'AB−':1, 'AB+':3 };
  var COMPAT = { 'O−':['O−'], 'O+':['O+','O−'], 'A−':['A−','O−'], 'A+':['A+','A−','O+','O−'], 'B−':['B−','O−'], 'B+':['B+','B−','O+','O−'], 'AB−':['AB−','A−','B−','O−'], 'AB+':['AB+','AB−','A+','A−','B+','B−','O+','O−'] };
  var COUL = { 'O−':'#ef4444','O+':'#f97316','A−':'#eab308','A+':'#84cc16','B−':'#06b6d4','B+':'#3b82f6','AB−':'#a855f7','AB+':'#ec4899' };
  var JOURS = ['lundi','mardi','mercredi','jeudi','vendredi','samedi','dimanche'];
  var PRIOS = { 1:'vitale', 2:'urgente', 3:'programmée', 4:'différable' };
  var PATIENCE = { 1:2, 2:6, 3:24, 4:72 };        // heures
  var PARTS_PRIO = { 1:5, 2:20, 3:60, 4:15 };
  var HEURES_DONS = [0,0,0,0,0,0,0,0,.6,1,1.1,1,.7,.8,1,1.1,1.1,.9,.6,.3,0,0,0,0];
  var HEURES_DEM = [.4,.3,.3,.3,.4,.5,.8,1.2,1.5,1.5,1.4,1.3,1.2,1.4,1.5,1.4,1.2,1,.8,.7,.6,.5,.5,.4];
  var T95 = { 10:2.262, 30:2.045, 100:1.984 };
  var API_REGION = { geneve:'geneve', vaud:'irb', valais:'irb', berne:'irb', zurich:'zuerich', fribourg:'irb', neuchatel:'irb', jura:'irb', tessin:'gesamt' };

  var EPISODES = {
    pandemie: { nom:'Pandémie', desc:'Dons en baisse, demande programmée réduite puis rebond, ajournements en hausse.', champs:[['debut','Début (jour)',20],['duree','Durée (jours)',56],['dons','Dons (%)',-40],['demande','Demande (%)',-25],['ajourn','Ajournements (+ points)',5]] },
    ete:      { nom:'Vacances d’été', desc:'Moins de donneur·se·s présent·e·s, demande stable.', champs:[['debut','Début (jour)',30],['duree','Durée (jours)',60],['dons','Dons (%)',-25],['demande','Demande (%)',0],['ajourn','Ajournements (+ points)',0]] },
    canicule: { nom:'Canicule', desc:'Présentation en baisse, ajournements en hausse, demande légèrement accrue.', champs:[['debut','Début (jour)',40],['duree','Durée (jours)',10],['dons','Dons (%)',-15],['demande','Demande (%)',5],['ajourn','Ajournements (+ points)',8]] },
    campagne: { nom:'Campagne ou appel', desc:'Afflux de dons pendant quelques jours. Le run montre l’effet sur la péremption cinq à six semaines plus tard.', champs:[['debut','Début (jour)',30],['duree','Durée (jours)',7],['dons','Dons (%)',40],['demande','Demande (%)',0],['ajourn','Ajournements (+ points)',2]] },
    accident: { nom:'Accident majeur', desc:'Demande vitale immédiate de concentrés érythrocytaires, substitution autorisée.', champs:[['jour','Jour',45],['heure','Heure',14],['cgr','Poches demandées',60]] },
    rupture:  { nom:'Rupture d’un groupe', desc:'Le stock d’un groupe tombe à zéro et ses donneur·se·s répondent peu pendant deux semaines.', champs:[['jour','Jour',30],['groupe','Groupe (0 à 7 : O−, O+, A−, A+, B−, B+, AB−, AB+)',4],['reponse','Dons du groupe (%)',-70]] },
    labo:     { nom:'Panne du laboratoire', desc:'Le délai de qualification des poches est multiplié.', champs:[['debut','Début (jour)',50],['duree','Durée (jours)',5],['facteur','Facteur sur le délai',3]] },
    mobile:   { nom:'Collecte mobile supplémentaire', desc:'Une collecte de plus, chaque semaine, le jour choisi.', champs:[['jourSemaine','Jour (0 lundi à 6 dimanche)',1],['dons','Dons supplémentaires',25]] }
  };

  // ---------- aléatoire : un flux par source de hasard, graine dérivée par réplication ----------
  function mulberry(seed){ var a=seed>>>0; return function(){ a|=0; a=a+0x6D2B79F5|0; var t=Math.imul(a^a>>>15,1|a); t=t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)/4294967296; }; }
  function flux(base, rep){ var mk=function(i){ return mulberry((base*7919 + rep*15485863 + i*104729)>>>0); }; return { dons:mk(1), groupe:mk(2), ajourn:mk(3), demande:mk(4), taille:mk(5), qualif:mk(6), prio:mk(7), heure:mk(8) }; }
  function poisson(l, r){ if(l<=0) return 0; if(l>40){ var u1=r()||1e-9,u2=r(); return Math.max(0,Math.round(l+Math.sqrt(l)*Math.sqrt(-2*Math.log(u1))*Math.cos(2*Math.PI*u2))); } var L=Math.exp(-l),k=0,p=1; do{ k++; p*=r(); }while(p>L); return k-1; }
  function normale(r){ var u1=r()||1e-9,u2=r(); return Math.sqrt(-2*Math.log(u1))*Math.cos(2*Math.PI*u2); }
  function gamma(k, th, r){ if(k<1){ return gamma(k+1, th, r)*Math.pow(r()||1e-9, 1/k); } var d=k-1/3, c=1/Math.sqrt(9*d); for(;;){ var x=normale(r), v=1+c*x; if(v<=0) continue; v=v*v*v; var u=r(); if(u<1-0.0331*x*x*x*x) return d*v*th; if(Math.log(u)<0.5*x*x+d*(1-v+Math.log(v))) return d*v*th; } }
  function lognormale(med, sigma, r){ return med*Math.exp(sigma*normale(r)); }
  function tirerGroupe(r){ var x=r()*100, acc=0; for(var i=0;i<GROUPES.length;i++){ acc+=PARTS[GROUPES[i]]; if(x<acc) return GROUPES[i]; } return 'O+'; }
  function tirerPrio(r){ var x=r()*100, acc=0; for(var p=1;p<=4;p++){ acc+=PARTS_PRIO[p]; if(x<acc) return p; } return 3; }
  function quantile(a, q){ if(!a.length) return 0; var s=a.slice().sort(function(x,y){return x-y;}), i=(s.length-1)*q, lo=Math.floor(i), hi=Math.ceil(i); return s[lo]+(s[hi]-s[lo])*(i-lo); }
  function stats(a){ var n=a.length; if(!n) return {moy:0,ic:0,med:0,p10:0,p90:0,n:0}; var m=0,s2=0; for(var i=0;i<n;i++){ var d=a[i]-m; m+=d/(i+1); s2+=d*(a[i]-m); } var sd=n>1?Math.sqrt(s2/(n-1)):0, t=T95[n]||2.045; return { moy:m, ic:t*sd/Math.sqrt(n), med:quantile(a,.5), p10:quantile(a,.1), p90:quantile(a,.9), n:n }; }

  // ---------- tas binaire d'événements, départage par numéro de séquence ----------
  function Tas(){ this.a=[]; this.seq=0; }
  Tas.prototype.push=function(t,type,d){ var e={t:t,s:this.seq++,type:type,d:d}, a=this.a; a.push(e); var i=a.length-1; while(i>0){ var p=(i-1)>>1; if(a[p].t<e.t||(a[p].t===e.t&&a[p].s<e.s)) break; a[i]=a[p]; i=p; } a[i]=e; };
  Tas.prototype.pop=function(){ var a=this.a, top=a[0], last=a.pop(); if(a.length){ var i=0, n=a.length; for(;;){ var l=2*i+1, r=l+1, m=i, x=last; if(l<n&&(a[l].t<x.t||(a[l].t===x.t&&a[l].s<x.s))){ m=l; x=a[l]; } if(r<n&&(a[r].t<x.t||(a[r].t===x.t&&a[r].s<x.s))){ m=r; } if(m===i) break; a[i]=a[m]; i=m; } a[i]=last; } return top; };
  Tas.prototype.size=function(){ return this.a.length; };

  // ---------- scénario ----------
  function region(){ try { return regions[selectedRegion]; } catch(e){ return { name:'Genève', need:700, stock:{} }; } }
  function cle(){ try { return selectedRegion; } catch(e){ return 'geneve'; } }
  function scenarioDefaut(){
    var r = region(), base = Math.max(40, Math.round((r.need||700)/7));
    return { nom:'Régime ordinaire', horizon:120, chauffe:30, graine:42, reps:10, donsJour:base, ajournement:12, demandeJour:Math.round(base*0.8), dureeVie:42, qualifH:30, cibleJours:7, seuilCritique:3, seuilTension:5, substitution:'urgences', profilDons:[1.05,1.1,1.05,1,.95,.55,.15], profilDemande:[1.1,1.1,1.1,1.05,1,.6,.5], episodes:[] };
  }
  // multiplicateurs journaliers issus des épisodes
  function effets(sc, d){
    var e = { dons:1, demande:1, ajourn:0, qualif:1, extraDons:{}, ruptures:[], accidents:[] };
    (sc.episodes||[]).forEach(function(ep){
      var p = ep.p;
      if(ep.type==='pandemie'||ep.type==='ete'||ep.type==='canicule'||ep.type==='campagne'){
        if(d>=p.debut && d<p.debut+p.duree){ e.dons*=1+p.dons/100; e.demande*=1+p.demande/100; e.ajourn+=p.ajourn; }
        if(ep.type==='pandemie' && d>=p.debut+p.duree && d<p.debut+p.duree+42){ e.demande*=1.15; }
      }
      if(ep.type==='labo' && d>=p.debut && d<p.debut+p.duree) e.qualif*=p.facteur;
      if(ep.type==='mobile' && ((d%7)===p.jourSemaine)) e.extraDons.total=(e.extraDons.total||0)+p.dons;
      if(ep.type==='rupture'){ if(d===p.jour) e.ruptures.push(GROUPES[p.groupe]||'B−'); if(d>=p.jour && d<p.jour+14) e.extraDons['-'+(GROUPES[p.groupe]||'B−')]=1+p.reponse/100; }
      if(ep.type==='accident' && d===p.jour) e.accidents.push({ heure:p.heure, cgr:p.cgr });
    });
    return e;
  }
  function stockInitial(sc, reel){
    var s = {}; GROUPES.forEach(function(g){ var cible = sc.cibleJours*sc.demandeJour*PARTS[g]/100, taux = (reel&&reel[g]!=null)? reel[g]/100 : 1; s[g] = Math.max(0, Math.round(cible*taux)); });
    return s;
  }

  // ---------- moteur : une réplication ----------
  function replication(sc, rep, reel, trace){
    var R = flux(sc.graine, rep), tas = new Tas(), H = (sc.chauffe+sc.horizon)*24, t0 = sc.chauffe*24;
    var stock = {}, waiting = [], integ = 0, lastT = 0, total = 0, ageOut = 0, nDisp = 0;
    var dayStat = null, mesure = [], deliv = [], reappro = {}, sous = {}, minCouv = {}, sumCouv = {}, nJours = 0, missing = {}, subst = 0, perim = 0, qualifies = 0, dons = 0, demandes = {1:0,2:0,3:0,4:0}, servies = {1:0,2:0,3:0,4:0}, sousCrit = {};
    GROUPES.forEach(function(g){ stock[g]=[]; missing[g]=0; sous[g]=0; minCouv[g]=Infinity; sumCouv[g]=0; reappro[g]=[]; sousCrit[g]=null; });
    var tr = trace ? { heures:[], jours:[], journal:[] } : null; var effCache = {}; function eff(d){ return effCache[d] || (effCache[d] = effets(sc, d)); }
    function consoJour(g){ return sc.demandeJour*PARTS[g]/100; }
    function avance(t){ integ += total*(t-lastT); lastT = t; }
    function insere(b){ var a=stock[b.g], lo=0, hi=a.length; while(lo<hi){ var m=(lo+hi)>>1; if(a[m].tExp<=b.tExp) lo=m+1; else hi=m; } a.splice(lo,0,b); total++; }
    function retire(g, t, why){ var b=stock[g].shift(); total--; ageOut += t-Math.max(0,b.tDisp); if(why==='deliv' && t>=t0) deliv.push(t-b.tDisp); return b; }
    function log(t, txt){ if(tr && t>=t0){ var d=Math.floor((t-t0)/24); tr.journal[d]=tr.journal[d]||[]; if(tr.journal[d].length<40) tr.journal[d].push(((t%24)<10?'0':'')+Math.floor(t%24)+'h'+(Math.round((t%1)*60)<10?'0':'')+Math.round((t%1)*60)+' '+txt); } }
    function servir(dm, t){
      var pris = 0, g = dm.g;
      while(dm.q>0 && stock[g].length){ avance(t); retire(g,t,'deliv'); dm.q--; pris++; }
      var autoriser = sc.substitution==='toujours' || (sc.substitution==='urgences' && dm.prio<=2);
      if(dm.q>0 && autoriser){ var alt = COMPAT[g]; for(var i=1;i<alt.length && dm.q>0;i++){ while(dm.q>0 && stock[alt[i]].length){ avance(t); retire(alt[i],t,'deliv'); dm.q--; pris++; if(t>=t0) subst++; } } if(pris && dm.q===0 && t>=t0) log(t,'Demande '+PRIOS[dm.prio]+' '+g+' servie avec substitution'); }
      if(dm.q===0 && t>=t0 && t-dm.tCre <= PATIENCE[dm.prio]) servies[dm.prio]++;
      return pris;
    }
    function reessayer(t){ if(!waiting.length) return; waiting.sort(function(a,b){ var ka=a.prio-(a.prio>=3?(t-a.tCre)/24:0), kb=b.prio-(b.prio>=3?(t-b.tCre)/24:0); return ka-kb; }); for(var i=waiting.length-1;i>=0;i--){ var dm=waiting[i]; if(!dm.q) { waiting.splice(i,1); continue; } servir(dm,t); if(dm.q===0) waiting.splice(i,1); } }
    function genererJour(d){
      var e = eff(d), wd = d%7, lam = sc.donsJour*sc.profilDons[wd]*e.dons + (e.extraDons.total||0), aj = Math.min(60, sc.ajournement+e.ajourn)/100;
      for(var h=0;h<24;h++){ var n = poisson(lam*HEURES_DONS[h]/10, R.dons); for(var i=0;i<n;i++){ var g = tirerGroupe(R.groupe); var fac = e.extraDons['-'+g]; if(fac!=null && R.groupe()>fac) continue; if(R.ajourn()<aj) continue; var tt = d*24+h+R.heure(); tas.push(tt,'don',{g:g}); } }
      var lamD = sc.demandeJour*sc.profilDemande[wd]*e.demande;
      for(var h2=0;h2<24;h2++){ var n2 = poisson(lamD*HEURES_DEM[h2]/22/2.2, R.demande); for(var j=0;j<n2;j++){ var tt2 = d*24+h2+R.heure(); tas.push(tt2,'dem',{ g:tirerGroupe(R.groupe), prio:tirerPrio(R.prio), q:Math.max(1,Math.round(gamma(2,1.1,R.taille))) }); } }
      e.accidents.forEach(function(a){ var tt3=d*24+a.heure; var parts={'O−':.4,'O+':.4,'A+':.1,'B+':.05,'A−':.05}; Object.keys(parts).forEach(function(g2){ tas.push(tt3,'dem',{ g:g2, prio:1, q:Math.round(a.cgr*parts[g2]), accident:true }); }); });
      e.ruptures.forEach(function(g3){ tas.push(d*24,'rupture',{g:g3}); });
      tas.push(d*24+23.999,'jour',{d:d});
    }
    // état initial : stock cible (ou baromètre réel) avec péremptions échelonnées
    var init = stockInitial(sc, reel);
    GROUPES.forEach(function(g){ for(var i=0;i<init[g];i++){ var age = (i/Math.max(1,init[g]))*sc.dureeVie*0.8; insere({ g:g, tDisp:0, tExp:(sc.dureeVie-age)*24 }); tas.push((sc.dureeVie-age)*24,'exp',{g:g}); } });
    genererJour(0);
    var totalDay = 0;
    while(tas.size()){
      var ev = tas.pop(), t = ev.t; if(t>H) break;
      if(ev.type==='don'){ if(t>=t0) dons++; var e2 = eff(Math.floor(t/24)); var dq = lognormale(sc.qualifH*e2.qualif, .3, R.qualif); tas.push(t+dq,'disp',{ g:ev.d.g, tCol:t }); }
      else if(ev.type==='disp'){ avance(t); if(t>=t0){ qualifies++; nDisp++; } var b={ g:ev.d.g, tDisp:t, tExp:ev.d.tCol+sc.dureeVie*24 }; insere(b); tas.push(b.tExp,'exp',{g:b.g}); reessayer(t); }
      else if(ev.type==='exp'){ var a=stock[ev.d.g]; if(a.length && a[0].tExp<=t+1e-9){ avance(t); retire(ev.d.g,t,'exp'); if(t>=t0){ perim++; log(t,'Poche '+ev.d.g+' périmée'); } } }
      else if(ev.type==='dem'){ var dm = { g:ev.d.g, prio:ev.d.prio, q:ev.d.q, q0:ev.d.q, tCre:t }; if(t>=t0) demandes[dm.prio]++; if(ev.d.accident) log(t,'Accident majeur, '+dm.q+' poches '+dm.g+' demandées en priorité vitale'); servir(dm,t); if(dm.q>0){ waiting.push(dm); tas.push(t+PATIENCE[dm.prio],'lim',dm); } }
      else if(ev.type==='lim'){ var dm2 = ev.d; if(dm2.q>0){ if(t>=t0){ missing[dm2.g]+=dm2.q; log(t,'Demande '+PRIOS[dm2.prio]+' '+dm2.g+' non servie, '+dm2.q+' poche(s) manquante(s)'); } dm2.q=0; var k=waiting.indexOf(dm2); if(k>=0) waiting.splice(k,1); } }
      else if(ev.type==='rupture'){ avance(t); while(stock[ev.d.g].length){ retire(ev.d.g,t,'rupt'); } log(t,'Rupture déclarée sur le groupe '+ev.d.g); }
      else if(ev.type==='jour'){
        var d = ev.d.d; avance(t);
        if(d>=sc.chauffe){ nJours++; var row={}; GROUPES.forEach(function(g){ var c = stock[g].length/consoJour(g); row[g]=stock[g].length; sumCouv[g]+=c; if(c<minCouv[g]) minCouv[g]=c; if(c<sc.seuilTension) sous[g]++; if(c<sc.seuilCritique){ if(sousCrit[g]==null) sousCrit[g]=d; } else if(sousCrit[g]!=null){ reappro[g].push(d-sousCrit[g]); sousCrit[g]=null; } if(tr && c<sc.seuilCritique) log(t,'Couverture '+g+' sous '+sc.seuilCritique+' jours ('+c.toFixed(1)+')'); }); mesure.push(row); }
        if(tr && d>=sc.chauffe){ var exp = {}; GROUPES.forEach(function(g){ exp[g]=stock[g].filter(function(b){ return b.tExp<=t+24; }).length; }); tr.jours.push({ d:d-sc.chauffe, attente:waiting.filter(function(w){return w.q>0;}).length, perimentDemain:exp }); }
        if(d+1<sc.chauffe+sc.horizon) genererJour(d+1);
      }
      if(tr && t>=t0){ var hIdx = Math.floor(t-t0); while(tr.heures.length<=hIdx && tr.heures.length<sc.horizon*24){ var snap=[]; GROUPES.forEach(function(g){ snap.push(stock[g].length); }); snap.push(waiting.filter(function(w){return w.q>0;}).length); tr.heures.push(snap); } }
    }
    avance(H);
    var ageIn = 0; GROUPES.forEach(function(g){ stock[g].forEach(function(b){ ageIn += H-Math.max(b.tDisp,0); }); });
    var couv = {}, cMin = {}; GROUPES.forEach(function(g){ couv[g]=sumCouv[g]/Math.max(1,nJours); cMin[g]=minCouv[g]===Infinity?0:minCouv[g]; if(sousCrit[g]!=null) reappro[g].push(sc.chauffe+sc.horizon-sousCrit[g]); });
    var tauxServ = {}; [1,2,3,4].forEach(function(p){ tauxServ[p] = demandes[p]? servies[p]/demandes[p] : 1; });
    return { couv:couv, cMin:cMin, sous:sous, missing:missing, reappro:reappro, subst:subst, perim:perim, qualifies:qualifies, dons:dons, demandes:demandes, service:tauxServ, age:deliv.length?quantile(deliv,.5):0, mesure:mesure, little:{ integ:integ, ageOut:ageOut, ageIn:ageIn }, trace:tr };
  }

  // ---------- exécution : réplications asynchrones, agrégation ----------
  function executer(sc, reel, onProgress, onDone){
    var reps = [], i = 0;
    function suite(){
      var t1 = Date.now();
      while(i<sc.reps && Date.now()-t1<120){ reps.push(replication(sc, i, reel, i===0)); i++; }
      onProgress(i/sc.reps);
      if(i<sc.reps) setTimeout(suite, 0); else onDone(agreger(sc, reps, reel));
    }
    setTimeout(suite, 10);
  }
  function agreger(sc, reps, reel){
    var n = reps.length, kpi = { couv:{}, cMin:{}, sous:{}, missing:{}, reappro:{}, service:{} };
    GROUPES.forEach(function(g){ kpi.couv[g]=stats(reps.map(function(r){return r.couv[g];})); kpi.cMin[g]=stats(reps.map(function(r){return r.cMin[g];})); kpi.sous[g]=stats(reps.map(function(r){return r.sous[g];})); kpi.missing[g]=stats(reps.map(function(r){return r.missing[g];})); var pool=[]; reps.forEach(function(r){ pool=pool.concat(r.reappro[g]); }); kpi.reappro[g]={ med:quantile(pool,.5), p90:quantile(pool,.9), n:pool.length }; });
    [1,2,3,4].forEach(function(p){ kpi.service[p]=stats(reps.map(function(r){return r.service[p]*100;})); });
    kpi.perim = stats(reps.map(function(r){ return r.qualifies? r.perim/r.qualifies*100 : 0; }));
    kpi.missingTot = stats(reps.map(function(r){ var s=0; GROUPES.forEach(function(g){ s+=r.missing[g]; }); return s; }));
    kpi.subst = stats(reps.map(function(r){return r.subst;}));
    kpi.dons = stats(reps.map(function(r){return r.dons;}));
    kpi.demandes = stats(reps.map(function(r){ return r.demandes[1]+r.demandes[2]+r.demandes[3]+r.demandes[4]; }));
    kpi.age = stats(reps.map(function(r){return r.age;}));
    var littleMax = 0; reps.forEach(function(r){ var res=Math.abs(r.little.integ-r.little.ageOut-r.little.ageIn)/Math.max(1,r.little.integ); if(res>littleMax) littleMax=res; });
    var series = {}; GROUPES.forEach(function(g){ series[g]={med:[],p10:[],p90:[]}; for(var d=0; d<sc.horizon; d++){ var col=reps.map(function(r){ return r.mesure[d]? r.mesure[d][g] : 0; }); series[g].med.push(quantile(col,.5)); series[g].p10.push(quantile(col,.1)); series[g].p90.push(quantile(col,.9)); } });
    var pire = GROUPES.slice().sort(function(a,b){ return kpi.couv[a].moy-kpi.couv[b].moy; })[0];
    return { id:'R'+Date.now().toString(36).toUpperCase().slice(-5), nom:sc.nom, quand:new Date(), version:VERSION, sc:JSON.parse(JSON.stringify(sc)), region:region().name, reel:reel?JSON.parse(JSON.stringify(reel)):null, n:n, kpi:kpi, series:series, pire:pire, little:littleMax, trace:reps[0].trace };
  }

  // ---------- état de l'interface ----------
  var UI = { vue:'scenario', sc:null, runs:[], courant:null, ref:null, variante:null, reel:null, reelDate:null, poste:{ run:null, jour:0, heure:9, lecture:null }, chargement:false };
  function h(s){ return String(s==null?'':s).replace(/[&<>"']/g,function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
  function f1(x){ return (Math.round(x*10)/10).toLocaleString('fr-CH'); }
  function pm(s, unite){ return f1(s.moy)+(unite||'')+' <span class="jm-ic">± '+f1(s.ic)+'</span>'; }
  function couleurCouv(c, sc){ return c<sc.seuilCritique?'#ef4444':c<sc.seuilTension?'#f59e0b':'#22c55e'; }
  function dateJour(d){ var x=new Date(); x.setDate(x.getDate()+d); return x.toLocaleDateString('fr-CH',{weekday:'short',day:'2-digit',month:'2-digit'}); }

  var css = '.jm-nav{display:flex;gap:.4rem;overflow-x:auto;padding-bottom:.4rem;margin-bottom:.8rem;scrollbar-width:none}.jm-nav button{flex:none;padding:.45rem .8rem;border-radius:99px;border:1px solid var(--slate-700);background:var(--slate-800);color:#f0ece2;font:inherit;font-size:.78rem;font-weight:600;cursor:pointer}.jm-nav button.on{background:var(--amber-500);color:#0a0a12;border-color:var(--amber-500)}'
    + '.jm-grid{display:grid;grid-template-columns:2fr 1fr;gap:1rem}.jm-grid3{display:grid;grid-template-columns:repeat(3,1fr);gap:.6rem}.jm-form{display:grid;grid-template-columns:repeat(3,1fr);gap:.55rem}.jm-form label,.jm-lbl{display:block;font-size:.7rem;color:var(--slate-400);margin-bottom:.15rem}.jm-form input,.jm-form select,.jm-in{width:100%;padding:.45rem .55rem;border-radius:.45rem;border:1px solid var(--slate-700);background:var(--slate-900);color:#fff;font:inherit;font-size:.82rem}.jm-form small,.jm-note{display:block;font-size:.68rem;color:var(--slate-500);margin-top:.15rem}'
    + '.jm-kpis{display:grid;grid-template-columns:repeat(5,1fr);gap:.6rem;margin:.6rem 0 1rem}.jm-kpi{background:var(--slate-800);border:1px solid var(--slate-700);border-radius:.7rem;padding:.7rem .8rem}.jm-kpi span{font-size:.68rem;color:var(--slate-400);display:block}.jm-kpi b{font-size:1.25rem;font-weight:800;line-height:1.15;display:block;font-variant-numeric:tabular-nums}.jm-kpi small{font-size:.68rem;color:var(--slate-500);display:block;margin-top:.15rem}.jm-ic{font-size:.72rem;color:var(--slate-400);font-weight:500}'
    + '.jm-arc{width:54px;height:54px;border-radius:50%;display:grid;place-items:center;font-weight:800;font-size:.8rem;margin:.2rem auto 0;background:conic-gradient(var(--c) calc(var(--p)*1%),var(--slate-700) 0)}.jm-arc i{width:40px;height:40px;border-radius:50%;background:var(--slate-800);display:grid;place-items:center;font-style:normal}'
    + '.jm-ep{border:1px solid var(--slate-700);border-radius:.6rem;padding:.55rem .65rem;margin-bottom:.45rem}.jm-ep>label{display:flex!important;gap:.5rem;align-items:flex-start;cursor:pointer;text-align:left;margin:0}.jm-ep input[type=checkbox]{accent-color:#C8A960;margin-top:.15rem;width:auto!important;flex:none}.jm-ep b{font-size:.82rem;display:block}.jm-ep span{font-size:.7rem;color:var(--slate-400)}.jm-ep .jm-form{margin-top:.45rem;grid-template-columns:repeat(3,1fr)}'
    + '.jm-btn{padding:.55rem 1rem;border-radius:.55rem;border:1px solid var(--slate-700);background:var(--slate-800);color:#f0ece2;font:inherit;font-size:.82rem;font-weight:700;cursor:pointer}.jm-btn.p{background:var(--amber-500);color:#0a0a12;border-color:var(--amber-500)}.jm-btn.s{font-size:.72rem;padding:.35rem .6rem}.jm-btn:disabled{opacity:.5;cursor:wait}'
    + '.jm-bar{height:6px;border-radius:3px;background:var(--slate-700);overflow:hidden;margin:.5rem 0}.jm-bar i{display:block;height:100%;background:var(--amber-500);width:0;transition:width .15s}'
    + '.jm-table{width:100%;border-collapse:collapse;font-size:.76rem}.jm-table th{text-align:left;font-size:.65rem;text-transform:uppercase;letter-spacing:.05em;color:var(--slate-400);padding:.4rem .45rem;border-bottom:1px solid var(--slate-700);white-space:nowrap}.jm-table td{padding:.4rem .45rem;border-bottom:1px solid rgba(255,255,255,.05);font-variant-numeric:tabular-nums}.jm-wrap{overflow:auto}.jm-dot{display:inline-block;width:.6rem;height:.6rem;border-radius:50%;margin-right:.35rem;vertical-align:middle}'
    + '.jm-cart{font-size:.72rem;color:var(--slate-400);padding:.5rem .7rem;border:1px dashed var(--slate-700);border-radius:.5rem;margin-bottom:.7rem;line-height:1.5}.jm-muted{font-size:.78rem;color:var(--slate-400)}.jm-h{font-weight:700;margin:.8rem 0 .45rem;font-size:.9rem}'
    + '.jm-canvas{width:100%;height:220px;display:block;border-radius:.5rem;background:rgba(255,255,255,.02)}.jm-legend{display:flex;flex-wrap:wrap;gap:.5rem .9rem;font-size:.7rem;color:var(--slate-400);margin:.4rem 0}'
    + '.jm-heat{display:grid;gap:2px;font-size:.62rem}.jm-heat div{height:16px;border-radius:2px;display:grid;place-items:center;color:rgba(0,0,0,.75);font-weight:700}.jm-heat .lbl{color:var(--slate-400);background:none;justify-content:flex-start;font-weight:600}'
    + '.jm-etat{font-size:.68rem;font-weight:700;padding:.15rem .45rem;border-radius:.3rem;white-space:nowrap}.jm-etat.mieux{background:rgba(34,197,94,.18);color:#4ade80}.jm-etat.moins{background:rgba(239,68,68,.18);color:#ff6b6b}.jm-etat.marge{background:rgba(148,163,184,.15);color:#cbd5e1}.jm-etat.nd{background:rgba(148,163,184,.08);color:var(--slate-400)}'
    + '.jm-clock{font-family:"Playfair Display",Georgia,serif;font-size:2.4rem;font-weight:800;line-height:1}.jm-post{display:grid;grid-template-columns:1fr 1fr;gap:.6rem;margin-top:.6rem}.jm-jetons{display:flex;flex-wrap:wrap;gap:3px;margin:.4rem 0}.jm-jetons i{width:10px;height:10px;border-radius:50%;display:block}'
    + '.jm-jour{font-size:.75rem;line-height:1.6;max-height:220px;overflow:auto;padding-right:.3rem}.jm-jour div{border-bottom:1px solid rgba(255,255,255,.05);padding:.15rem 0}'
    + '.jm-limits{margin-top:.8rem;font-size:.75rem;color:var(--slate-400)}.jm-limits summary{cursor:pointer;font-weight:600;color:#f0ece2}.jm-limits ul{padding-left:1.1rem;margin-top:.4rem;line-height:1.6}'
    + '@media(max-width:900px){.jm-grid{grid-template-columns:1fr}.jm-kpis{grid-template-columns:repeat(2,1fr)}.jm-form{grid-template-columns:1fr 1fr}.jm-grid3{grid-template-columns:1fr}.jm-post{grid-template-columns:1fr}.jm-table th:nth-child(n+6),.jm-table td:nth-child(n+6){display:none}}';
  var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  // ---------- baromètre réel (Digital Shadow limité à l'état de départ) ----------
  function chargerReel(){
    UI.reel = null; UI.reelDate = null;
    fetch('../api/donnees.php').then(function(r){ return r.json(); }).then(function(j){
      var code = API_REGION[cle()]||'gesamt', e = (j.stocks||[]).filter(function(s){ return s.code===code; })[0] || (j.stocks||[])[0];
      if(!e || !e.groupes) return;
      var reel = {}; e.groupes.forEach(function(g){ var k = g.groupe.replace('-','−'); if(PARTS[k]!=null) reel[k] = g.taux!=null ? g.taux : ({green:80,blue:100,yellow:55,red:30,grey:70}[g.couleur]||70); });
      UI.reel = reel; UI.reelDate = e.date+' · '+e.label; if(UI.vue==='scenario') rendre();
    }).catch(function(){});
  }

  // ---------- écrans ----------
  function nav(){ var V=[['scenario','Scénario'],['resultats','Résultats'],['comparaison','Comparaison'],['poste','Poste de régulation'],['pheno','Phénotypes']]; return '<div class="jm-nav">'+V.map(function(v){ return '<button data-v="'+v[0]+'" class="'+(UI.vue===v[0]?'on':'')+'">'+v[1]+'</button>'; }).join('')+'</div>'; }

  function vueScenario(){
    var sc = UI.sc, init = stockInitial(sc, UI.reel);
    var champs = [['nom','Nom du scénario','text','Un scénario est une variante du régime ordinaire.'],['donsJour','Dons par jour','number','Moyenne en semaine, les samedis et dimanches suivent le profil hebdomadaire.'],['ajournement','Ajournements (%)','number','Part des personnes présentes qui repartent sans donner.'],['demandeJour','Demande par jour (poches)','number','Toutes priorités, tous hôpitaux de la région.'],['dureeVie','Durée de vie (jours)','number','42 jours pour un concentré érythrocytaire.'],['qualifH','Qualification (heures)','number','Délai médian entre le prélèvement et la mise en stock.'],['cibleJours','Stock cible (jours)','number','Le stock de départ vaut ce nombre de jours de demande, corrigé par le baromètre.'],['horizon','Jours simulés','number','La période de chauffe s’ajoute et n’est pas mesurée.'],['chauffe','Chauffe (jours)','number','Le stock se met en régime avant la mesure.'],['graine','Graine','number','La même graine redonne exactement le même run.'],['reps','Réplications','select','Dix pour explorer, trente pour conclure, comme dans la thèse.'],['substitution','Substitution ABO','select','Une demande peut être servie avec un groupe compatible.']];
    var form = champs.map(function(c){ var v = sc[c[0]], inp; if(c[2]==='select' && c[0]==='reps') inp = '<select data-k="reps">'+[10,30,100].map(function(n){ return '<option'+(sc.reps===n?' selected':'')+'>'+n+'</option>'; }).join('')+'</select>'; else if(c[2]==='select') inp = '<select data-k="substitution">'+[['jamais','jamais'],['urgences','priorités vitale et urgente'],['toujours','toujours']].map(function(o){ return '<option value="'+o[0]+'"'+(sc.substitution===o[0]?' selected':'')+'>'+o[1]+'</option>'; }).join('')+'</select>'; else inp = '<input data-k="'+c[0]+'" type="'+c[2]+'" value="'+h(v)+'">'; return '<div><label>'+c[1]+'</label>'+inp+'<small>'+c[3]+'</small></div>'; }).join('');
    // jugement avant exécution
    var semaine = JOURS.map(function(j,i){ return { j:j, dons:Math.round(sc.donsJour*sc.profilDons[i]*(1-sc.ajournement/100)), dem:Math.round(sc.demandeJour*sc.profilDemande[i]) }; });
    var deficit = semaine.filter(function(s){ return s.dem>s.dons; }).map(function(s){ return s.j; });
    var totDons = semaine.reduce(function(a,s){return a+s.dons;},0), totDem = semaine.reduce(function(a,s){return a+s.dem;},0);
    var rouges = 0; (function(){ var stockG={}; GROUPES.forEach(function(g){ stockG[g]=init[g]; }); for(var d=0;d<sc.horizon;d++){ var e=effets(sc,d+sc.chauffe), wd=(d+sc.chauffe)%7, rouge=false; GROUPES.forEach(function(g){ var inG = sc.donsJour*sc.profilDons[wd]*e.dons*(1-Math.min(60,sc.ajournement+e.ajourn)/100)*PARTS[g]/100*(e.extraDons['-'+g]!=null?e.extraDons['-'+g]:1), outG = sc.demandeJour*sc.profilDemande[wd]*e.demande*PARTS[g]/100; stockG[g]=Math.max(0, Math.min(sc.dureeVie*sc.demandeJour*PARTS[g]/100, stockG[g]+inG-outG)); if(stockG[g]/(sc.demandeJour*PARTS[g]/100) < sc.seuilCritique) rouge=true; }); if(rouge) rouges++; } })();
    var maxSem = Math.max.apply(null, semaine.map(function(s){return Math.max(s.dons,s.dem);}));
    var barres = semaine.map(function(s){ return '<div style="text-align:center;font-size:.65rem;color:var(--slate-400)"><div style="display:flex;gap:2px;align-items:flex-end;height:70px;justify-content:center"><i style="display:block;width:9px;background:#22c55e;height:'+Math.round(s.dons/maxSem*70)+'px" title="dons"></i><i style="display:block;width:9px;background:#f97316;height:'+Math.round(s.dem/maxSem*70)+'px" title="demande"></i></div>'+s.j.slice(0,3)+'</div>'; }).join('');
    var couv = GROUPES.map(function(g){ var c = init[g]/(sc.demandeJour*PARTS[g]/100); return '<div style="font-size:.7rem"><span class="jm-dot" style="background:'+COUL[g]+'"></span>'+g+' <b style="color:'+couleurCouv(c,sc)+'">'+f1(c)+' j</b> <span style="color:var(--slate-500)">'+init[g]+' poches</span></div>'; }).join('');
    var episodes = Object.keys(EPISODES).map(function(k){ var def = EPISODES[k], actif = sc.episodes.filter(function(e){return e.type===k;})[0]; return '<div class="jm-ep"><label><input type="checkbox" data-ep="'+k+'"'+(actif?' checked':'')+'><div><b>'+def.nom+'</b><span>'+def.desc+'</span></div></label>'+(actif?'<div class="jm-form">'+def.champs.map(function(c){ return '<div><label>'+c[1]+'</label><input type="number" data-ep="'+k+'" data-p="'+c[0]+'" value="'+actif.p[c[0]]+'"></div>'; }).join('')+'</div>':'')+'</div>'; }).join('');
    var runs = UI.runs.length ? '<div class="jm-wrap"><table class="jm-table"><thead><tr><th>Run</th><th>Scénario</th><th>Rép.</th><th>Graine</th><th></th></tr></thead><tbody>'+UI.runs.map(function(r){ return '<tr><td>'+r.id+'<br><span class="jm-muted">'+r.quand.toLocaleTimeString('fr-CH',{hour:'2-digit',minute:'2-digit'})+'</span></td><td>'+h(r.nom)+'<br><span class="jm-muted">'+r.sc.horizon+' j · '+r.region+'</span></td><td>'+r.n+'</td><td>'+r.sc.graine+'</td><td><button class="jm-btn s" data-lire="'+r.id+'">Lire</button> <button class="jm-btn s" data-repartir="'+r.id+'">Repartir</button></td></tr>'; }).join('')+'</tbody></table></div>' : '<p class="jm-muted">Aucun run pour l’instant. Le premier run devient la référence des comparaisons.</p>';
    return '<div class="jm-grid"><div>'
      + '<div class="card"><div class="card-title">Régime ordinaire</div><div class="jm-form">'+form+'</div>'
      + '<div class="jm-h">Avant d’exécuter</div><div class="jm-grid3"><div><div class="jm-lbl">Dons (vert) et demande (orange) par jour de semaine</div><div style="display:grid;grid-template-columns:repeat(7,1fr);gap:2px">'+barres+'</div><p class="jm-note">'+totDons+' dons contre '+totDem+' poches demandées par semaine. '+(deficit.length? 'La demande dépasse les dons le '+deficit.join(', ')+'.' : 'Les dons couvrent la demande chaque jour.')+'</p></div>'
      + '<div><div class="jm-lbl">Couverture au départ, par groupe'+(UI.reel?' (baromètre officiel, '+h(UI.reelDate)+')':' (stock cible)')+'</div>'+couv+'</div>'
      + '<div><div class="jm-lbl">Journées rouges attendues</div><b style="font-size:1.6rem;color:'+(rouges?'#ef4444':'#22c55e')+'">'+rouges+'</b><p class="jm-note">Jours où au moins un groupe passe sous '+sc.seuilCritique+' jours de couverture, d’après un calcul moyen sans hasard. Ce chiffre juge le scénario avant le run, il ne prédit rien.</p></div></div>'
      + '<details class="jm-limits"><summary>Ce que ce panneau ne dit pas</summary><ul><li>Les lois de dons et de demande sont des valeurs de démonstration. Les vraies lois viendront d’une extraction du système transfusionnel, comme la thèse l’a fait avec InfoMed.</li><li>Le stock de départ prend les niveaux du baromètre officiel quand ils sont disponibles ; le reste de la simulation n’a aucun lien avec le stock réel.</li><li>Aucun levier ne repart vers un système réel. Convoquer des donneur·se·s reste une décision humaine.</li></ul></details></div>'
      + '</div><div>'
      + '<div class="sidebar-card"><h4 style="font-weight:700;margin-bottom:.5rem">Épisodes</h4><p class="jm-muted" style="margin-bottom:.5rem">Chaque épisode est un écart au régime ordinaire, posé sur l’horizon (jour 0 = début de la mesure). Ils se cumulent.</p>'+episodes+'</div>'
      + '<div class="sidebar-card" style="margin-top:1rem"><button class="jm-btn p" id="jm-go" style="width:100%">Lancer '+sc.reps+' réplications</button><div class="jm-bar"><i id="jm-prog"></i></div><p class="jm-muted" id="jm-msg">'+sc.horizon+' jours mesurés après '+sc.chauffe+' jours de chauffe, graine '+sc.graine+'.</p></div>'
      + '<div class="sidebar-card" style="margin-top:1rem"><h4 style="font-weight:700;margin-bottom:.5rem">Runs de cette session</h4>'+runs+'</div>'
      + '</div></div>';
  }

  function vueResultats(){
    var r = UI.courant; if(!r) return '<div class="card"><p class="jm-muted">Aucun run à lire. Lancez une simulation depuis l’écran Scénario.</p></div>';
    var sc = r.sc, k = r.kpi, pire = r.pire, cp = k.couv[pire].moy, pct = Math.min(100, Math.round(cp/sc.cibleJours*100));
    var kpis = '<div class="jm-kpis">'
      + '<div class="jm-kpi"><span>Groupe le plus tendu</span><div class="jm-arc" style="--p:'+pct+';--c:'+couleurCouv(cp,sc)+'"><i>'+pire+'</i></div><small style="text-align:center">'+f1(cp)+' j de couverture ± '+f1(k.couv[pire].ic)+'</small></div>'
      + '<div class="jm-kpi"><span>Poches manquantes</span><b>'+pm(k.missingTot)+'</b><small>demandes hors délai, sur '+sc.horizon+' jours</small></div>'
      + '<div class="jm-kpi"><span>Péremption</span><b>'+pm(k.perim,' %')+'</b><small>poches périmées sur poches qualifiées</small></div>'
      + '<div class="jm-kpi"><span>Service, priorités vitale et urgente</span><b>'+f1((k.service[1].moy+k.service[2].moy)/2)+' %</b><small>'+f1(k.service[1].moy)+' % vitale · '+f1(k.service[2].moy)+' % urgente</small></div>'
      + '<div class="jm-kpi"><span>Dons qualifiés</span><b>'+Math.round(k.dons.moy).toLocaleString('fr-CH')+'</b><small>'+Math.round(k.demandes.moy).toLocaleString('fr-CH')+' demandes · '+Math.round(k.subst.moy)+' poches substituées</small></div></div>';
    var table = '<div class="jm-wrap"><table class="jm-table"><thead><tr><th>Groupe</th><th>Couverture moyenne</th><th>Minimum (p10)</th><th>Jours sous '+sc.seuilTension+' j</th><th>Manquantes</th><th>Réapprovisionnement (méd. / p90)</th></tr></thead><tbody>'
      + GROUPES.map(function(g){ var c=k.couv[g]; return '<tr><td><span class="jm-dot" style="background:'+COUL[g]+'"></span>'+g+'</td><td style="color:'+couleurCouv(c.moy,sc)+'">'+pm(c,' j')+'</td><td>'+f1(k.cMin[g].p10)+' j</td><td>'+pm(k.sous[g])+'</td><td>'+pm(k.missing[g])+'</td><td>'+(k.reappro[g].n? f1(k.reappro[g].med)+' j / '+f1(k.reappro[g].p90)+' j' : 'jamais sous '+sc.seuilCritique+' j')+'</td></tr>'; }).join('')+'</tbody></table></div>';
    var semaines = Math.ceil(sc.horizon/7), heat = '<div class="jm-heat" style="grid-template-columns:44px repeat('+semaines+',1fr)"><div class="lbl"></div>'+Array.apply(null,Array(semaines)).map(function(_,w){ return '<div class="lbl" style="justify-content:center">S'+(w+1)+'</div>'; }).join('')
      + GROUPES.map(function(g){ var cells=''; for(var w=0;w<semaines;w++){ var vals=r.series[g].med.slice(w*7,w*7+7), c = vals.length? (vals.reduce(function(a,b){return a+b;},0)/vals.length)/(sc.demandeJour*PARTS[g]/100) : 0; cells+='<div style="background:'+couleurCouv(c,sc)+'" title="'+g+' semaine '+(w+1)+' : '+f1(c)+' j">'+(semaines<=20?f1(c):'')+'</div>'; } return '<div class="lbl">'+g+'</div>'+cells; }).join('')+'</div>';
    return '<div class="card"><div class="jm-cart">Run <b>'+r.id+'</b> · '+h(r.nom)+' · '+r.region+' · '+r.n+' réplications · '+sc.horizon+' jours mesurés après '+sc.chauffe+' jours de chauffe · graine '+sc.graine+' · '+r.version+' · '+r.quand.toLocaleString('fr-CH')+'<br>Chaque valeur est une moyenne sur les réplications avec son intervalle à 95 % (± loi de Student). Loi de Little vérifiée, résidu relatif maximal '+r.little.toExponential(1)+'.</div>'
      + kpis
      + '<div class="jm-h">Stock par groupe, jour après jour (médiane, bande p10–p90)</div><div style="display:flex;gap:.5rem;align-items:center;margin-bottom:.4rem"><select class="jm-in" id="jm-g" style="width:auto">'+GROUPES.map(function(g){ return '<option'+(UI.groupe===g?' selected':'')+'>'+g+'</option>'; }).join('')+'</select><span class="jm-muted">Seuils : '+sc.seuilTension+' j tendu, '+sc.seuilCritique+' j critique.</span></div><canvas class="jm-canvas" id="jm-c1"></canvas>'
      + '<div class="jm-h">Couverture médiane par semaine</div>'+heat
      + '<div class="jm-h">Par groupe</div>'+table
      + '<div class="jm-actions" style="display:flex;gap:.5rem;flex-wrap:wrap;margin-top:.8rem"><button class="jm-btn s" id="jm-exp">Exporter le run (JSON)</button><button class="jm-btn s" id="jm-ref">Prendre comme référence</button><button class="jm-btn s" id="jm-var">Prendre comme variante</button><button class="jm-btn s" id="jm-poste">Rejouer au poste de régulation</button></div>'
      + '<details class="jm-limits"><summary>Ce que ce panneau ne dit pas</summary><ul><li>Le résultat décrit ce que la filière produirait sous les conditions déclarées, jamais ce qui arrivera.</li><li>Les groupes rares reposent sur peu de poches : leurs intervalles sont larges, c’est voulu.</li><li>Deux valeurs dont les intervalles se recouvrent ne se distinguent pas, même si les moyennes diffèrent.</li></ul></details></div>';
  }

  function dessinerSerie(){
    var c = document.getElementById('jm-c1'), r = UI.courant; if(!c||!r) return;
    var g = UI.groupe||GROUPES[0], s = r.series[g], sc = r.sc, W = c.clientWidth||600, Hh = 220; c.width = W*devicePixelRatio; c.height = Hh*devicePixelRatio; var ctx = c.getContext('2d'); ctx.scale(devicePixelRatio, devicePixelRatio);
    var conso = sc.demandeJour*PARTS[g]/100, max = Math.max.apply(null, s.p90.concat([conso*sc.cibleJours]))*1.1||1, n = s.med.length, pl=36, pr=8, pt=10, pb=22;
    var x = function(i){ return pl+(W-pl-pr)*i/Math.max(1,n-1); }, y = function(v){ return pt+(Hh-pt-pb)*(1-v/max); };
    ctx.clearRect(0,0,W,Hh);
    [[sc.seuilCritique,'#ef4444'],[sc.seuilTension,'#f59e0b']].forEach(function(sv){ ctx.fillStyle=sv[1]+'22'; ctx.fillRect(pl, y(sv[0]*conso), W-pl-pr, Hh-pb-y(sv[0]*conso)); ctx.strokeStyle=sv[1]; ctx.setLineDash([4,4]); ctx.beginPath(); ctx.moveTo(pl,y(sv[0]*conso)); ctx.lineTo(W-pr,y(sv[0]*conso)); ctx.stroke(); ctx.setLineDash([]); });
    ctx.fillStyle = COUL[g]+'33'; ctx.beginPath(); for(var i=0;i<n;i++){ ctx.lineTo(x(i), y(s.p90[i])); } for(var j=n-1;j>=0;j--){ ctx.lineTo(x(j), y(s.p10[j])); } ctx.closePath(); ctx.fill();
    ctx.strokeStyle = COUL[g]; ctx.lineWidth = 2; ctx.beginPath(); for(var k=0;k<n;k++){ ctx.lineTo(x(k), y(s.med[k])); } ctx.stroke();
    ctx.fillStyle = '#8b8b9e'; ctx.font = '10px DM Sans, sans-serif'; ctx.textAlign='right'; [0,.5,1].forEach(function(f){ ctx.fillText(Math.round(max*f), pl-4, y(max*f)+3); }); ctx.textAlign='center'; for(var d=0; d<n; d+=Math.max(1,Math.round(n/8))){ ctx.fillText('j'+d, x(d), Hh-6); }
    ctx.textAlign='left'; ctx.fillText('poches', pl+2, 10);
  }

  function etatsComparaison(a, b, sens){ // sens : +1 plus grand est mieux, -1 plus petit est mieux, 0 non déclaré
    if(Math.abs(a.moy-b.moy)<1e-9 && Math.abs(a.ic-b.ic)<1e-9) return ['identiques','Chiffres identiques','nd'];
    var sep = (a.moy+a.ic < b.moy-b.ic) || (b.moy+b.ic < a.moy-a.ic);
    if(!sep) return ['marge','Dans la marge','marge'];
    if(!sens) return ['nd','Sens non déclaré','nd'];
    var mieux = sens>0 ? b.moy>a.moy : b.moy<a.moy;
    return mieux ? ['mieux','Mieux','mieux'] : ['moins','Moins bien','moins'];
  }
  function vueComparaison(){
    var sel = function(id, cur){ return '<select class="jm-in" id="'+id+'"><option value="">Choisir un run</option>'+UI.runs.map(function(r){ return '<option value="'+r.id+'"'+(cur&&cur.id===r.id?' selected':'')+'>'+r.id+' · '+h(r.nom)+'</option>'; }).join('')+'</select>'; };
    var head = '<div class="card"><div class="card-title">Comparer deux runs</div><div class="jm-form" style="grid-template-columns:1fr 1fr"><div><label>Référence</label>'+sel('jm-cref',UI.ref)+'</div><div><label>Variante</label>'+sel('jm-cvar',UI.variante)+'</div></div>';
    if(!UI.ref||!UI.variante) return head+'<p class="jm-muted" style="margin-top:.6rem">Choisissez une référence et une variante. Une différence est colorée seulement quand les deux intervalles ne se recouvrent pas et que le sens est déclaré pour la mesure.</p></div>';
    var A=UI.ref, B=UI.variante, cadrage = (A.sc.horizon!==B.sc.horizon||A.sc.graine!==B.sc.graine||A.n!==B.n) ? '<p class="jm-muted" style="margin:.5rem 0;color:var(--amber-400)">Cadrage différent (horizon, graine ou réplications) : les écarts mêlent le hasard et les changements déclarés.</p>' : '<p class="jm-muted" style="margin:.5rem 0">Même horizon, même graine, mêmes réplications : les écarts viennent des changements déclarés.</p>';
    var diff = []; Object.keys(B.sc).forEach(function(k){ if(k!=='episodes'&&k!=='nom'&&JSON.stringify(A.sc[k])!==JSON.stringify(B.sc[k])) diff.push(k); }); var epA=A.sc.episodes.map(function(e){return EPISODES[e.type].nom;}).join(', ')||'aucun', epB=B.sc.episodes.map(function(e){return EPISODES[e.type].nom;}).join(', ')||'aucun';
    var lignes = [['Couverture du groupe le plus tendu ('+A.pire+' / '+B.pire+')', A.kpi.couv[A.pire], B.kpi.couv[B.pire], 1, ' j'],['Poches manquantes', A.kpi.missingTot, B.kpi.missingTot, -1, ''],['Péremption', A.kpi.perim, B.kpi.perim, -1, ' %'],['Service, priorité vitale', A.kpi.service[1], B.kpi.service[1], 1, ' %'],['Service, priorité urgente', A.kpi.service[2], B.kpi.service[2], 1, ' %'],['Poches substituées', A.kpi.subst, B.kpi.subst, -1, ''],['Dons qualifiés', A.kpi.dons, B.kpi.dons, 0, ''],['Demandes', A.kpi.demandes, B.kpi.demandes, 0, '']];
    GROUPES.forEach(function(g){ lignes.push(['Couverture '+g, A.kpi.couv[g], B.kpi.couv[g], 1, ' j']); });
    var rows = lignes.map(function(l){ var e = etatsComparaison(l[1],l[2],l[3]), d = l[2].moy-l[1].moy; return '<tr><td>'+l[0]+'</td><td>'+pm(l[1],l[4])+'</td><td style="text-align:center"><span class="jm-etat '+e[2]+'">'+e[1]+'</span><br><span class="jm-muted">'+(d>0?'+':'')+f1(d)+l[4]+'</span></td><td>'+pm(l[2],l[4])+'</td></tr>'; }).join('');
    return head+cadrage+'<p class="jm-muted">Paramètres qui diffèrent : '+(diff.length?diff.join(', '):'aucun')+'. Épisodes : '+h(epA)+' contre '+h(epB)+'.</p>'
      + '<div class="jm-wrap" style="margin-top:.6rem"><table class="jm-table"><thead><tr><th>Mesure</th><th>Référence '+A.id+'</th><th style="text-align:center">Écart</th><th>Variante '+B.id+'</th></tr></thead><tbody>'+rows+'</tbody></table></div>'
      + '<div class="jm-h">Stock total, jour après jour</div><canvas class="jm-canvas" id="jm-c2"></canvas><div class="jm-legend"><span><i class="jm-dot" style="background:#94a3b8"></i>Référence</span><span><i class="jm-dot" style="background:#E8D5A3"></i>Variante</span><span>Bande colorée entre les deux médianes, verte quand la variante est au-dessus.</span></div></div>';
  }
  function dessinerComparaison(){
    var c = document.getElementById('jm-c2'); if(!c||!UI.ref||!UI.variante) return;
    var tot = function(r){ var out=[]; for(var d=0; d<r.sc.horizon; d++){ var s=0; GROUPES.forEach(function(g){ s+=r.series[g].med[d]||0; }); out.push(s); } return out; };
    var A=tot(UI.ref), B=tot(UI.variante), n=Math.max(A.length,B.length), W=c.clientWidth||600, Hh=220; c.width=W*devicePixelRatio; c.height=Hh*devicePixelRatio; var ctx=c.getContext('2d'); ctx.scale(devicePixelRatio,devicePixelRatio);
    var max = Math.max.apply(null, A.concat(B))*1.1||1, pl=36, pr=8, pt=10, pb=22, x=function(i){ return pl+(W-pl-pr)*i/Math.max(1,n-1); }, y=function(v){ return pt+(Hh-pt-pb)*(1-v/max); };
    ctx.clearRect(0,0,W,Hh);
    for(var i=0;i<Math.min(A.length,B.length)-1;i++){ ctx.fillStyle = B[i]>=A[i] ? 'rgba(34,197,94,.25)' : 'rgba(239,68,68,.25)'; ctx.beginPath(); ctx.moveTo(x(i),y(A[i])); ctx.lineTo(x(i+1),y(A[i+1])); ctx.lineTo(x(i+1),y(B[i+1])); ctx.lineTo(x(i),y(B[i])); ctx.closePath(); ctx.fill(); }
    [[A,'#94a3b8'],[B,'#E8D5A3']].forEach(function(s){ ctx.strokeStyle=s[1]; ctx.lineWidth=2; ctx.beginPath(); s[0].forEach(function(v,i){ ctx.lineTo(x(i),y(v)); }); ctx.stroke(); });
    ctx.fillStyle='#8b8b9e'; ctx.font='10px DM Sans, sans-serif'; ctx.textAlign='right'; [0,.5,1].forEach(function(f){ ctx.fillText(Math.round(max*f), pl-4, y(max*f)+3); }); ctx.textAlign='center'; for(var d=0; d<n; d+=Math.max(1,Math.round(n/8))){ ctx.fillText('j'+d, x(d), Hh-6); }
  }

  function vuePoste(){
    var p = UI.poste, r = p.run || UI.courant; if(!r||!r.trace) return '<div class="card"><p class="jm-muted">Aucun run à rejouer. Le poste de régulation rejoue, heure par heure, la première réplication d’un run.</p></div>';
    var sc = r.sc, tr = r.trace, jour = Math.min(p.jour, sc.horizon-1), idx = Math.min(tr.heures.length-1, jour*24+p.heure), snap = tr.heures[idx]||[], hier = tr.jours[jour]||{attente:0,perimentDemain:{}};
    var stocks = {}; GROUPES.forEach(function(g,i){ stocks[g]=snap[i]||0; }); var attente = snap[8]||0;
    var pire = GROUPES.slice().sort(function(a,b){ return stocks[a]/(sc.demandeJour*PARTS[a]/100) - stocks[b]/(sc.demandeJour*PARTS[b]/100); })[0], cp = stocks[pire]/(sc.demandeJour*PARTS[pire]/100), total = GROUPES.reduce(function(a,g){return a+stocks[g];},0);
    var perimDemain = GROUPES.reduce(function(a,g){ return a+(hier.perimentDemain[g]||0); },0);
    var jetons = GROUPES.map(function(g){ var n=Math.min(60,Math.round(stocks[g]/Math.max(1,sc.demandeJour*PARTS[g]/100)*3)); var s=''; for(var i=0;i<n;i++) s+='<i style="background:'+COUL[g]+'"></i>'; return '<div style="margin-bottom:.3rem"><span class="jm-muted" style="display:inline-block;width:34px">'+g+'</span><span class="jm-jetons" style="display:inline-flex;vertical-align:middle">'+s+'</span> <span class="jm-muted">'+stocks[g]+'</span></div>'; }).join('');
    var journal = (tr.journal[jour]||[]).filter(function(l){ return parseInt(l,10) <= p.heure; });
    return '<div class="jm-grid"><div><div class="card"><div style="display:flex;justify-content:space-between;align-items:flex-end;flex-wrap:wrap;gap:.5rem"><div><div class="jm-clock">'+(p.heure<10?'0':'')+p.heure+'h00</div><div class="jm-muted">Jour '+(jour+1)+' sur '+sc.horizon+' · '+dateJour(jour)+' · run '+r.id+', première réplication. Journée simulée, sans lien avec le stock réel.</div></div>'
      + '<div style="display:flex;gap:.4rem;flex-wrap:wrap"><button class="jm-btn s" id="jm-pprev">Jour précédent</button><button class="jm-btn s" id="jm-play">'+(p.lecture?'Pause':'Lecture')+'</button><button class="jm-btn s" id="jm-pnext">Jour suivant</button></div></div>'
      + '<input type="range" id="jm-h" min="0" max="23" value="'+p.heure+'" style="width:100%;accent-color:#C8A960;margin:.6rem 0 .2rem"><input type="range" id="jm-j" min="0" max="'+(sc.horizon-1)+'" value="'+jour+'" style="width:100%;accent-color:#5a5a72"><div class="jm-muted" style="display:flex;justify-content:space-between"><span>heure</span><span>jour</span></div>'
      + '<div class="jm-kpis"><div class="jm-kpi"><span>Groupe le plus tendu</span><div class="jm-arc" style="--p:'+Math.min(100,Math.round(cp/sc.cibleJours*100))+';--c:'+couleurCouv(cp,sc)+'"><i>'+pire+'</i></div><small style="text-align:center">'+f1(cp)+' j de couverture</small></div><div class="jm-kpi"><span>Poches disponibles</span><b>'+total+'</b><small>tous groupes</small></div><div class="jm-kpi"><span>Demandes en attente</span><b>'+attente+'</b><small>non servies à cette heure</small></div><div class="jm-kpi"><span>Périment sous 24 h</span><b>'+perimDemain+'</b><small>'+GROUPES.filter(function(g){return hier.perimentDemain[g];}).map(function(g){return g+' '+hier.perimentDemain[g];}).join(' · ')+'</small></div><div class="jm-kpi"><span>Demande du jour</span><b>'+Math.round(sc.demandeJour*sc.profilDemande[(jour+sc.chauffe)%7])+'</b><small>poches attendues, '+JOURS[(jour+sc.chauffe)%7]+'</small></div></div>'
      + '<div class="jm-h">Stock au fil de la journée (trait discontinu après l’heure courante)</div><canvas class="jm-canvas" id="jm-c3"></canvas>'
      + '</div></div><div><div class="sidebar-card"><h4 style="font-weight:700;margin-bottom:.4rem">Plan de l’instant</h4><p class="jm-muted" style="margin-bottom:.4rem">Un jeton pour un tiers de jour de couverture, par groupe.</p>'+jetons+'</div>'
      + '<div class="sidebar-card" style="margin-top:1rem"><h4 style="font-weight:700;margin-bottom:.4rem">Journal de la journée</h4><div class="jm-jour">'+(journal.length?journal.map(function(l){return '<div>'+h(l)+'</div>';}).join(''):'<div class="jm-muted">Rien à signaler jusqu’à cette heure.</div>')+'</div></div>'
      + '<div class="sidebar-card" style="margin-top:1rem"><h4 style="font-weight:700;margin-bottom:.4rem">Leviers, en questions</h4><p class="jm-muted">Et si la collecte de '+JOURS[(jour+sc.chauffe+2)%7]+' était annulée ? Et si une campagne '+pire+' partait demain ? Et si un hôpital doublait sa demande ? Chaque question se déclare comme épisode sur l’écran Scénario, puis se compare.</p><button class="jm-btn s" id="jm-versSc" style="margin-top:.4rem">Ouvrir le scénario de ce run</button></div></div></div>';
  }
  function dessinerJournee(){
    var c = document.getElementById('jm-c3'), p = UI.poste, r = p.run||UI.courant; if(!c||!r||!r.trace) return;
    var sc=r.sc, tr=r.trace, jour=Math.min(p.jour, sc.horizon-1), W=c.clientWidth||600, Hh=220; c.width=W*devicePixelRatio; c.height=Hh*devicePixelRatio; var ctx=c.getContext('2d'); ctx.scale(devicePixelRatio,devicePixelRatio);
    var pts=[]; for(var hh=0;hh<24;hh++){ var s=tr.heures[jour*24+hh]; pts.push(s? GROUPES.reduce(function(a,g,i){return a+(s[i]||0);},0) : null); }
    var max=Math.max.apply(null, pts.filter(function(v){return v!=null;}))*1.15||1, pl=36, pr=8, pt=10, pb=22, x=function(i){ return pl+(W-pl-pr)*i/23; }, y=function(v){ return pt+(Hh-pt-pb)*(1-v/max); };
    ctx.clearRect(0,0,W,Hh); ctx.strokeStyle='#E8D5A3'; ctx.lineWidth=2;
    ctx.beginPath(); for(var i=0;i<=p.heure;i++){ if(pts[i]!=null) ctx.lineTo(x(i),y(pts[i])); } ctx.stroke();
    ctx.setLineDash([4,4]); ctx.beginPath(); for(var j=p.heure;j<24;j++){ if(pts[j]!=null) ctx.lineTo(x(j),y(pts[j])); } ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle='#8b8b9e'; ctx.font='10px DM Sans, sans-serif'; ctx.textAlign='right'; [0,.5,1].forEach(function(f){ ctx.fillText(Math.round(max*f), pl-4, y(max*f)+3); }); ctx.textAlign='center'; for(var k=0;k<24;k+=4){ ctx.fillText(k+'h', x(k), Hh-6); }
  }

  // ---------- rendu et événements ----------
  var host = null, phenoHost = null;
  function rendre(){
    if(!host) return;
    var html = nav();
    if(UI.vue==='scenario') html += vueScenario();
    else if(UI.vue==='resultats') html += vueResultats();
    else if(UI.vue==='comparaison') html += vueComparaison();
    else if(UI.vue==='poste') html += vuePoste();
    host.innerHTML = html;
    if(phenoHost) phenoHost.classList.toggle('hidden', UI.vue!=='pheno');
    if(UI.vue==='pheno'){ try{ if(typeof initTwinMap==='function') initTwinMap(); if(typeof twinMap!=='undefined' && twinMap) setTimeout(function(){ twinMap.invalidateSize(); }, 80); }catch(e){} }
    host.querySelectorAll('.jm-nav button').forEach(function(b){ b.onclick=function(){ UI.vue=b.dataset.v; rendre(); }; });
    if(UI.vue==='scenario'){
      host.querySelectorAll('.jm-form [data-k]').forEach(function(i){ i.onchange=function(){ var k=i.dataset.k, v=i.type==='number'||k==='reps'? Number(i.value) : i.value; UI.sc[k]=v; rendre(); }; });
      host.querySelectorAll('input[type=checkbox][data-ep]').forEach(function(c){ c.onchange=function(){ var k=c.dataset.ep; UI.sc.episodes=UI.sc.episodes.filter(function(e){return e.type!==k;}); if(c.checked){ var p={}; EPISODES[k].champs.forEach(function(ch){ p[ch[0]]=ch[2]; }); UI.sc.episodes.push({type:k,p:p}); if(UI.sc.nom==='Régime ordinaire') UI.sc.nom=EPISODES[k].nom; } rendre(); }; });
      host.querySelectorAll('input[type=number][data-ep][data-p]').forEach(function(i){ i.onchange=function(){ var ep=UI.sc.episodes.filter(function(e){return e.type===i.dataset.ep;})[0]; if(ep){ ep.p[i.dataset.p]=Number(i.value); rendre(); } }; });
      host.querySelectorAll('[data-lire]').forEach(function(b){ b.onclick=function(){ UI.courant=UI.runs.filter(function(r){return r.id===b.dataset.lire;})[0]; UI.vue='resultats'; rendre(); }; });
      host.querySelectorAll('[data-repartir]').forEach(function(b){ b.onclick=function(){ var r=UI.runs.filter(function(x){return x.id===b.dataset.repartir;})[0]; UI.sc=JSON.parse(JSON.stringify(r.sc)); UI.sc.nom=r.nom+' (variante)'; rendre(); }; });
      var go = document.getElementById('jm-go'); if(go) go.onclick = lancer;
    }
    if(UI.vue==='resultats' && UI.courant){
      dessinerSerie(); var g=document.getElementById('jm-g'); if(g) g.onchange=function(){ UI.groupe=g.value; dessinerSerie(); };
      var ex=document.getElementById('jm-exp'); if(ex) ex.onclick=function(){ var r=UI.courant, copie={ id:r.id, nom:r.nom, quand:r.quand, version:r.version, region:r.region, scenario:r.sc, stockDepart:r.reel, replications:r.n, kpi:r.kpi, series:r.series, little:r.little }; var b=new Blob([JSON.stringify(copie,null,1)],{type:'application/json'}), a=document.createElement('a'); a.href=URL.createObjectURL(b); a.download='beemyblood-jumeau-'+r.id+'.json'; document.body.appendChild(a); a.click(); setTimeout(function(){ URL.revokeObjectURL(a.href); a.remove(); },500); };
      var rf=document.getElementById('jm-ref'); if(rf) rf.onclick=function(){ UI.ref=UI.courant; UI.vue='comparaison'; rendre(); };
      var vr=document.getElementById('jm-var'); if(vr) vr.onclick=function(){ UI.variante=UI.courant; UI.vue='comparaison'; rendre(); };
      var po=document.getElementById('jm-poste'); if(po) po.onclick=function(){ UI.poste.run=UI.courant; UI.poste.jour=0; UI.poste.heure=9; UI.vue='poste'; rendre(); };
    }
    if(UI.vue==='comparaison'){
      var cr=document.getElementById('jm-cref'), cv=document.getElementById('jm-cvar');
      if(cr) cr.onchange=function(){ UI.ref=UI.runs.filter(function(r){return r.id===cr.value;})[0]||null; rendre(); };
      if(cv) cv.onchange=function(){ UI.variante=UI.runs.filter(function(r){return r.id===cv.value;})[0]||null; rendre(); };
      dessinerComparaison();
    }
    if(UI.vue==='poste'){
      dessinerJournee(); var p=UI.poste, r=p.run||UI.courant;
      var sh=document.getElementById('jm-h'), sj=document.getElementById('jm-j');
      if(sh) sh.oninput=function(){ p.heure=Number(sh.value); rendre(); };
      if(sj) sj.oninput=function(){ p.jour=Number(sj.value); rendre(); };
      var pv=document.getElementById('jm-pprev'); if(pv) pv.onclick=function(){ p.jour=Math.max(0,p.jour-1); rendre(); };
      var nx=document.getElementById('jm-pnext'); if(nx) nx.onclick=function(){ if(r) p.jour=Math.min(r.sc.horizon-1,p.jour+1); rendre(); };
      var pl=document.getElementById('jm-play'); if(pl) pl.onclick=function(){ if(p.lecture){ clearInterval(p.lecture); p.lecture=null; rendre(); return; } p.lecture=setInterval(function(){ p.heure++; if(p.heure>23){ p.heure=0; p.jour++; if(r && p.jour>=r.sc.horizon){ p.jour=r.sc.horizon-1; clearInterval(p.lecture); p.lecture=null; } } rendre(); }, 350); rendre(); };
      var vs=document.getElementById('jm-versSc'); if(vs) vs.onclick=function(){ if(r){ UI.sc=JSON.parse(JSON.stringify(r.sc)); UI.sc.nom=r.nom+' (variante)'; } UI.vue='scenario'; rendre(); };
    }
  }
  function lancer(){
    if(UI.chargement) return; UI.chargement=true;
    var go=document.getElementById('jm-go'), prog=document.getElementById('jm-prog'), msg=document.getElementById('jm-msg'); if(go){ go.disabled=true; go.textContent='Simulation en cours…'; }
    var sc = JSON.parse(JSON.stringify(UI.sc)), t1=Date.now();
    executer(sc, UI.reel, function(f){ if(prog) prog.style.width=Math.round(f*100)+'%'; if(msg) msg.textContent='Réplication '+Math.round(f*sc.reps)+' sur '+sc.reps+'…'; }, function(run){
      UI.runs.push(run); UI.courant=run; if(!UI.ref) UI.ref=run; else if(!UI.variante || UI.variante.id===UI.ref.id) UI.variante=run; UI.chargement=false; UI.vue='resultats'; rendre();
      if(window.showToast) showToast('success', 'Run '+run.id+' terminé en '+((Date.now()-t1)/1000).toFixed(1)+' s. Groupe le plus tendu : '+run.pire+'.');
    });
  }

  function installer(){
    var panel = document.getElementById('panel-twin'); if(!panel || document.getElementById('jm-host')) return;
    phenoHost = document.createElement('div'); phenoHost.id='jm-pheno'; phenoHost.className='hidden';
    while(panel.firstChild) phenoHost.appendChild(panel.firstChild);
    host = document.createElement('div'); host.id='jm-host';
    panel.appendChild(host); panel.appendChild(phenoHost);
    UI.sc = scenarioDefaut();
    var st0 = window.switchTab, cr0 = window.changeRegion;
    window.switchTab = function(tab){ st0(tab); if(tab==='twin'){ rendre(); } };
    window.changeRegion = function(){ cr0.apply(this, arguments); UI.sc = scenarioDefaut(); UI.courant=null; UI.ref=null; UI.variante=null; UI.poste.run=null; chargerReel(); if(document.getElementById('panel-twin') && !document.getElementById('panel-twin').classList.contains('hidden')) rendre(); };
    chargerReel(); rendre();
    window.addEventListener('resize', function(){ if(UI.vue==='resultats') dessinerSerie(); if(UI.vue==='comparaison') dessinerComparaison(); if(UI.vue==='poste') dessinerJournee(); });
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', installer); else installer();
  window.BeeJumeau = { replication:replication, agreger:agreger, scenarioDefaut:scenarioDefaut, EPISODES:EPISODES, GROUPES:GROUPES };
})();
