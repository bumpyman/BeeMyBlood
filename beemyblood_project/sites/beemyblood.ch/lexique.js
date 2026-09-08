/*
 * BeeMyBlood — Lexique partagé
 * Explique les sigles et termes médicaux au survol / au toucher, et propose un lexique complet.
 * Inclure en fin de page : <script src="lexique.js" defer></script> (ou ../lexique.js dans un sous-dossier)
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */
(function(){
  var TERMES = [
    ['CRS', 'Croix-Rouge suisse. « Transfusion CRS Suisse » est l\'organisation faîtière qui fixe les critères du don de sang en Suisse.'],
    ['CTS', 'Centre de transfusion sanguine : le lieu où l\'on donne son sang et où les poches sont préparées.'],
    ['PSL', 'Produits sanguins labiles : globules rouges, plaquettes et plasma issus d\'un don, à durée de conservation courte.'],
    ['CE', 'Concentré érythrocytaire : poche de globules rouges, le produit le plus transfusé.'],
    ['CP', 'Concentré plaquettaire : poche de plaquettes, utile en cas de saignement ou de chimiothérapie.'],
    ['PFC', 'Plasma frais congelé : la partie liquide du sang, utilisée pour la coagulation.'],
    ['RAI', 'Recherche d\'anticorps irréguliers : test sanguin fait avant une transfusion pour éviter une réaction.'],
    ['ABO', 'Le système des groupes sanguins A, B, AB et O.'],
    ['Rhésus', 'Deuxième système de groupe sanguin (positif ou négatif), avec les antigènes D, C, E, c, e.'],
    ['Phénotype', 'Le « profil » détaillé du sang d\'une personne, au-delà du groupe ABO et du Rhésus. Il compte pour les personnes transfusées régulièrement.'],
    ['Phénotype étendu', 'Analyse de plusieurs systèmes de groupes sanguins (Rhésus, Kell, Duffy, Kidd…) pour trouver un sang très compatible.'],
    ['Kell', 'Système de groupe sanguin important pour la compatibilité, après ABO et Rhésus.'],
    ['Duffy', 'Système de groupe sanguin. Le phénotype « Duffy négatif » est fréquent chez les personnes d\'origine africaine et très recherché.'],
    ['Kidd', 'Système de groupe sanguin impliqué dans certaines réactions transfusionnelles retardées.'],
    ['ISBT', 'Société internationale de transfusion sanguine ; sa norme ISBT 128 sert à étiqueter et tracer chaque poche.'],
    ['EBA', 'European Blood Alliance : réseau européen des services de transfusion, sollicité pour les sangs rares.'],
    ['Rare Donor File', 'Registre national des donneurs à phénotype rare, activé quand aucun sang compatible n\'est disponible localement.'],
    ['Aphérèse', 'Don où une machine ne prélève qu\'un composant du sang (plaquettes ou plasma) et restitue le reste au donneur.'],
    ['Drépanocytose', 'Maladie génétique des globules rouges (falciformes) qui nécessite souvent des transfusions régulières.'],
    ['Thalassémie', 'Maladie génétique de l\'hémoglobine ; certaines formes demandent des transfusions à vie.'],
    ['Chélation', 'Traitement qui élimine l\'excès de fer accumulé par les transfusions répétées.'],
    ['Ferritine', 'Marqueur sanguin des réserves de fer.'],
    ['Hémoglobine', 'Protéine des globules rouges qui transporte l\'oxygène ; son taux conditionne l\'aptitude au don.'],
    ['Polytransfusé', 'Personne qui reçoit des transfusions de façon répétée, souvent chaque mois.'],
    ['Hémovigilance', 'Surveillance et déclaration des effets indésirables liés aux transfusions.'],
    ['Swissmedic', 'Autorité suisse des produits thérapeutiques, qui autorise et surveille les services de transfusion.'],
    ['OFSP', 'Office fédéral de la santé publique.'],
    ['HUG', 'Hôpitaux universitaires de Genève.'],
    ['HES-SO', 'Haute école spécialisée de Suisse occidentale ; la HEG Genève en fait partie.'],
    ['HEG', 'Haute école de gestion de Genève, où est né BeeMyBlood (Convivens Lab).'],
    ['SIMED', 'Service d\'informatique médicale de l\'Université de Genève.'],
    ['UNIGE', 'Université de Genève.'],
    ['nLPD', 'Nouvelle loi fédérale suisse sur la protection des données (2023).'],
    ['RGPD', 'Règlement européen sur la protection des données.'],
    ['HL7 FHIR', 'Standard international d\'échange de données de santé entre logiciels hospitaliers.'],
    ['FHIR', 'Standard international d\'échange de données de santé entre logiciels hospitaliers (HL7 FHIR).'],
    ['SoHO', 'Règlement européen 2024/1938 sur les substances d\'origine humaine (sang, tissus), applicable dès 2027.'],
    ['AGPL-3.0', 'Licence de logiciel libre : le code est public et toute version modifiée mise en ligne doit l\'être aussi.'],
    ['BeeOS', 'Le noyau logiciel open source de BeeMyBlood : services métier, jumeau numérique, connecteurs, agents.'],
    ['BeeBot', 'Les assistants conversationnels de BeeMyBlood, alignés sur les critères officiels suisses.'],
    ['Jumeau numérique', 'Copie virtuelle de la chaîne du sang qui permet de simuler des scénarios (pénurie, campagne, crise) avant d\'agir.'],
    ['Système compagnon', 'Logiciel qui s\'ajoute aux systèmes existants sans les remplacer : il lit d\'abord, écrit ensuite.'],
    ['Primo-donneur', 'Personne qui donne son sang pour la première fois.'],
    ['Collecte mobile', 'Don du sang organisé hors du centre, dans un bus ou une salle communale, une école, une entreprise.'],
    ['TIR', 'Transfusion Interrégionale CRS : service de transfusion de Suisse romande (Épalinges, Vaud).']
  ];
  var DICT = {}; TERMES.forEach(function(t){ DICT[t[0]] = t[1]; });
  // Sigles à souligner automatiquement dans le texte (ordre : les plus longs d'abord)
  var AUTO = ['Rare Donor File','HL7 FHIR','Phénotype étendu','phénotype étendu','Jumeau numérique','jumeau numérique','Système compagnon','système compagnon','Primo-donneur','primo-donneur','Collecte mobile','collecte mobile',
              'Hémovigilance','hémovigilance','Polytransfusé','polytransfusé','Drépanocytose','drépanocytose','Thalassémie','thalassémie','Chélation','chélation','Ferritine','ferritine','Aphérèse','aphérèse','Phénotype','phénotype',
              'Swissmedic','HES-SO','SIMED','UNIGE','AGPL-3.0','BeeOS','nLPD','RGPD','FHIR','SoHO','ISBT','OFSP','CRS','CTS','PSL','PFC','RAI','ABO','EBA','HUG','HEG','TIR','Kell','Duffy','Kidd'];
  var RE = new RegExp('(^|[^\\wÀ-ÿ-])(' + AUTO.map(function(s){return s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');}).join('|') + ')(?![\\wÀ-ÿ-])', 'g');
  function key(w){ var k=w.charAt(0).toUpperCase()+w.slice(1); return DICT[k]?k:(DICT[w]?w:null); }

  var css = '.bmb-term{text-decoration:underline dotted;text-decoration-color:rgba(200,169,96,.7);text-underline-offset:3px;cursor:help;border:0}'
    + '.bmb-pop{position:fixed;z-index:100010;max-width:300px;padding:10px 12px;border-radius:10px;background:#12121e;color:#f0ece2;border:1px solid rgba(200,169,96,.35);box-shadow:0 8px 28px rgba(0,0,0,.5);font:13px/1.5 "DM Sans",system-ui,sans-serif}'
    + '.bmb-pop b{color:#E8D5A3;display:block;margin-bottom:3px}'
    + '.bmb-pill{position:fixed;left:12px;bottom:14px;z-index:100000;padding:7px 12px;border-radius:99px;background:rgba(18,18,30,.92);color:#E8D5A3;border:1px solid rgba(200,169,96,.35);font:600 12px "DM Sans",system-ui,sans-serif;cursor:pointer;backdrop-filter:blur(8px);box-shadow:0 4px 14px rgba(0,0,0,.4)}'
    + '.bmb-pill:hover{background:rgba(200,169,96,.15)}'
    + '@media(max-width:640px){.bmb-pill{bottom:76px;left:10px;padding:6px 10px}}'
    + '.bmb-modal{position:fixed;inset:0;z-index:100020;background:rgba(10,10,18,.75);display:flex;align-items:center;justify-content:center;padding:16px}'
    + '.bmb-box{background:#12121e;color:#f0ece2;border:1px solid rgba(200,169,96,.3);border-radius:16px;width:100%;max-width:560px;max-height:85vh;display:flex;flex-direction:column;font:14px/1.55 "DM Sans",system-ui,sans-serif}'
    + '.bmb-box header{display:flex;align-items:center;gap:10px;padding:14px 16px;border-bottom:1px solid rgba(200,169,96,.15)}'
    + '.bmb-box header h3{margin:0;font-size:16px;flex:1;color:#E8D5A3}'
    + '.bmb-box header input{flex:1.2;background:#0a0a12;border:1px solid rgba(200,169,96,.25);border-radius:8px;padding:6px 10px;color:#fff;font:inherit}'
    + '.bmb-box header button{background:none;border:0;color:#8b8b9e;font-size:22px;cursor:pointer;line-height:1}'
    + '.bmb-list{overflow:auto;padding:6px 16px 14px}'
    + '.bmb-list dt{font-weight:700;color:#E8D5A3;margin-top:10px}.bmb-list dd{margin:2px 0 0;color:#c9c4b8}';
  var st=document.createElement('style'); st.textContent=css; document.head.appendChild(st);

  // --- soulignement automatique (texte visible seulement, hors formulaires, scripts, chats) ---
  var SKIP = {SCRIPT:1,STYLE:1,TEXTAREA:1,INPUT:1,SELECT:1,OPTION:1,BUTTON:1,CODE:1,PRE:1,A:0,ABBR:1,H1:1,TITLE:1,SVG:1};
  function wrap(root){
    var walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,{acceptNode:function(n){
      var p=n.parentNode; if(!p||SKIP[p.nodeName]||p.closest('.bmb-pop,.bmb-box,.leaflet-container,[contenteditable]')) return NodeFilter.FILTER_REJECT;
      return RE.test(n.nodeValue)?NodeFilter.FILTER_ACCEPT:NodeFilter.FILTER_SKIP; }});
    var nodes=[], n; while((n=walker.nextNode())) nodes.push(n);
    nodes.forEach(function(node){
      var frag=document.createDocumentFragment(), last=0, txt=node.nodeValue, m; RE.lastIndex=0;
      while((m=RE.exec(txt))){
        var k=key(m[2]); if(!k) continue;
        frag.appendChild(document.createTextNode(txt.slice(last,m.index)+m[1]));
        var ab=document.createElement('abbr'); ab.className='bmb-term'; ab.textContent=m[2]; ab.title=DICT[k]; ab.setAttribute('data-term',k); frag.appendChild(ab);
        last=m.index+m[0].length;
      }
      if(last===0) return;
      frag.appendChild(document.createTextNode(txt.slice(last)));
      node.parentNode.replaceChild(frag,node);
    });
  }

  // --- infobulle au clic / toucher ---
  var pop=null;
  function hidePop(){ if(pop){pop.remove();pop=null;} }
  document.addEventListener('click',function(e){
    var ab=e.target.closest&&e.target.closest('.bmb-term');
    hidePop();
    if(!ab) return;
    e.preventDefault();
    pop=document.createElement('div'); pop.className='bmb-pop';
    pop.innerHTML='<b>'+ab.getAttribute('data-term')+'</b>'+DICT[ab.getAttribute('data-term')];
    document.body.appendChild(pop);
    var r=ab.getBoundingClientRect(), w=pop.offsetWidth, h=pop.offsetHeight;
    var x=Math.max(8,Math.min(window.innerWidth-w-8,r.left)), y=r.top-h-8; if(y<8) y=r.bottom+8;
    pop.style.left=x+'px'; pop.style.top=y+'px';
  });
  window.addEventListener('scroll',hidePop,{passive:true});

  // --- lexique complet ---
  function openLexique(){
    var m=document.createElement('div'); m.className='bmb-modal';
    m.innerHTML='<div class="bmb-box"><header><h3>Lexique</h3><input type="search" placeholder="Rechercher un terme…" aria-label="Rechercher"><button aria-label="Fermer">×</button></header><dl class="bmb-list"></dl></div>';
    var list=m.querySelector('.bmb-list');
    function render(q){ q=(q||'').toLowerCase(); list.innerHTML=TERMES.filter(function(t){return !q||t[0].toLowerCase().indexOf(q)>=0||t[1].toLowerCase().indexOf(q)>=0;})
      .sort(function(a,b){return a[0].localeCompare(b[0],'fr');}).map(function(t){return '<dt>'+t[0]+'</dt><dd>'+t[1]+'</dd>';}).join('')||'<dd style="margin-top:10px">Aucun terme trouvé.</dd>'; }
    render('');
    m.querySelector('input').addEventListener('input',function(){render(this.value);});
    m.querySelector('button').addEventListener('click',function(){m.remove();});
    m.addEventListener('click',function(e){ if(e.target===m) m.remove(); });
    document.body.appendChild(m); m.querySelector('input').focus();
  }
  var pill=document.createElement('button'); pill.className='bmb-pill'; pill.type='button'; pill.textContent='📖 Lexique'; pill.title='Sigles et termes expliqués';
  pill.addEventListener('click',openLexique);

  function init(){
    document.body.appendChild(pill);
    wrap(document.body);
    // contenu injecté plus tard (onglets, chats) : on repasse, sans excès
    var pending=false; new MutationObserver(function(muts){ if(pending) return; pending=true; setTimeout(function(){ pending=false; muts.forEach(function(mu){ mu.addedNodes.forEach(function(n){ if(n.nodeType===1&&!n.closest('.bmb-pop,.bmb-box,.leaflet-container')) wrap(n); }); }); },400); })
      .observe(document.body,{childList:true,subtree:true});
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init); else init();
  window.BeeLexique={ouvrir:openLexique, termes:TERMES};
})();
