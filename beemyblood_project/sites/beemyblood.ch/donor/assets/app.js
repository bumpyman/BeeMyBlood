// ===== NAVIGATION MULTIPAGE VERS UNE PAGE RESERVEE =====
// Remplace le controle par vue de la SPA (BMB_RESERVE + go()) : intercepte le clic sur
// un lien reserve tant que le visiteur n'est pas connecte, sinon laisse le lien naviguer.
function bmbGuard(e,url){
  if(window.BeeAcces && !window.BeeAcces.deverrouille()){
    e.preventDefault();
    window.BeeAcces.exiger(function(){ location.href=url; });
  }
}

// Pont eligibilite -> beebot.html (etait un simple go('chatbot') + addMsg dans la SPA).
// La question en attente passe par sessionStorage ; beebot.html l'envoie a l'arrivee.
function goChat(){
  var w=window._eligWarnings||[];
  var question='Mon test d\'éligibilité indique des points à vérifier : '+w.join(' / ')+'. Est-ce que je peux quand même donner ?';
  try{ sessionStorage.setItem('bmb-chat-pending', question); }catch(e){}
  location.href='beebot.html';
}

document.addEventListener('DOMContentLoaded',function(){
  document.getElementById('gate-input')?.focus();
  // Disable transitions briefly so initial state renders instantly
  var style=document.createElement('style');
  style.id='no-transition';
  style.textContent='.acc-body{transition:none!important}';
  document.head.appendChild(style);
  // Re-enable transitions after paint
  requestAnimationFrame(function(){
    requestAnimationFrame(function(){
      var s=document.getElementById('no-transition');
      if(s)s.remove();
    });
  });
});

function checkGate(){
  const codes=[]; // accès géré par acces.js (invitation + courriel + NDA)
  const v=document.getElementById('gate-input').value.trim().toLowerCase();
  if(codes.includes(v)){
    document.getElementById('gate-overlay').style.opacity='0';
    document.getElementById('gate-overlay').style.transition='opacity .4s ease';
    setTimeout(()=>document.getElementById('gate-overlay').remove(),400);
  } else {
    const err=document.getElementById('gate-error');
    err.style.opacity='1';
    document.getElementById('gate-input').style.borderColor='rgba(230,57,70,.5)';
    setTimeout(()=>{err.style.opacity='0';document.getElementById('gate-input').style.borderColor='rgba(200,169,96,.25)';},2000);
  }
}
var CANTON_STOCKS={
  GE:{label:'CTS HUG — Genève',ce:[{g:'O−',w:18,s:'crit'},{g:'O+',w:55,s:'ok'},{g:'A−',w:35,s:'low'},{g:'A+',w:68,s:'ok'},{g:'B−',w:12,s:'crit'},{g:'B+',w:42,s:'low',me:true},{g:'AB−',w:60,s:'ok'},{g:'AB+',w:82,s:'good'}],total:'199',plaq:[{g:'Mélanges',w:38,s:'low'},{g:'Aphérèse',w:62,s:'ok'}],pfc:[{g:'PFC AB',w:78,s:'good'}],maj:'12.02.2026'},
  VD:{label:'CTS CHUV — Vaud',ce:[{g:'O−',w:28,s:'low'},{g:'O+',w:61,s:'ok'},{g:'A−',w:44,s:'low'},{g:'A+',w:72,s:'ok'},{g:'B−',w:22,s:'low'},{g:'B+',w:51,s:'ok',me:true},{g:'AB−',w:65,s:'ok'},{g:'AB+',w:80,s:'good'}],total:'242',plaq:[{g:'Mélanges',w:55,s:'ok'},{g:'Aphérèse',w:70,s:'ok'}],pfc:[{g:'PFC AB',w:82,s:'good'}],maj:'12.02.2026'},
  VS:{label:'CTS Hôpital de Sion — Valais',ce:[{g:'O−',w:10,s:'crit'},{g:'O+',w:48,s:'low'},{g:'A−',w:20,s:'low'},{g:'A+',w:58,s:'ok'},{g:'B−',w:8,s:'crit'},{g:'B+',w:35,s:'low',me:true},{g:'AB−',w:55,s:'ok'},{g:'AB+',w:70,s:'ok'}],total:'128',plaq:[{g:'Mélanges',w:30,s:'low'},{g:'Aphérèse',w:50,s:'ok'}],pfc:[{g:'PFC AB',w:65,s:'ok'}],maj:'11.02.2026'},
  FR:{label:'CTS HFR — Fribourg',ce:[{g:'O−',w:32,s:'low'},{g:'O+',w:63,s:'ok'},{g:'A−',w:40,s:'low'},{g:'A+',w:75,s:'ok'},{g:'B−',w:25,s:'low'},{g:'B+',w:55,s:'ok',me:true},{g:'AB−',w:68,s:'ok'},{g:'AB+',w:85,s:'good'}],total:'176',plaq:[{g:'Mélanges',w:60,s:'ok'},{g:'Aphérèse',w:72,s:'ok'}],pfc:[{g:'PFC AB',w:80,s:'good'}],maj:'12.02.2026'},
  NE:{label:'CTS HNE — Neuchâtel',ce:[{g:'O−',w:15,s:'crit'},{g:'O+',w:50,s:'ok'},{g:'A−',w:30,s:'low'},{g:'A+',w:60,s:'ok'},{g:'B−',w:18,s:'crit'},{g:'B+',w:40,s:'low',me:true},{g:'AB−',w:58,s:'ok'},{g:'AB+',w:74,s:'ok'}],total:'112',plaq:[{g:'Mélanges',w:35,s:'low'},{g:'Aphérèse',w:55,s:'ok'}],pfc:[{g:'PFC AB',w:70,s:'ok'}],maj:'11.02.2026'},
  JU:{label:'CTS Hôpital du Jura — Delémont',ce:[{g:'O−',w:22,s:'low'},{g:'O+',w:58,s:'ok'},{g:'A−',w:38,s:'low'},{g:'A+',w:65,s:'ok'},{g:'B−',w:14,s:'crit'},{g:'B+',w:45,s:'low',me:true},{g:'AB−',w:62,s:'ok'},{g:'AB+',w:78,s:'good'}],total:'94',plaq:[{g:'Mélanges',w:42,s:'low'},{g:'Aphérèse',w:60,s:'ok'}],pfc:[{g:'PFC AB',w:72,s:'ok'}],maj:'10.02.2026'}
};
var STOCK_COLORS={crit:'var(--red-soft)',low:'var(--orange)',ok:'var(--green)',good:'var(--teal)'};
var STOCK_LABELS={crit:'Critique',low:'Bas',ok:'OK',good:'Bon'};
function stockRow(g,w,s,me){
  var lbl=STOCK_LABELS[s]+(me?' ← toi':'');
  var col=STOCK_COLORS[s];
  return '<div class="stock-row"><span class="stock-grp" style="color:'+col+'">'+g+'</span><div class="stock-bar-bg"><div class="stock-bar bar-'+s+'" style="width:'+w+'%"></div></div><span class="stock-lbl" style="color:'+col+'">'+lbl+'</span></div>';
}
function selectCanton(btn){
  document.querySelectorAll('.canton-btn').forEach(function(b){b.classList.remove('active');});
  btn.classList.add('active');
  if(btn.dataset.institut){ bmbAfficherStock(btn.dataset.institut); return; }
  var d=CANTON_STOCKS[btn.dataset.canton];
  if(!d)return;
  document.getElementById('stock-canton-label').textContent='🩸 '+d.label;
  var rows=d.ce.map(function(r){return stockRow(r.g,r.w,r.s,r.me);}).join('');
  rows+='<div style="font-size:12px;color:var(--text-muted);padding:6px 0;border-top:1px solid var(--dark-border);display:flex;justify-content:space-between"><span>Total CE : <strong style="color:var(--text)">'+d.total+' poches</strong></span><span>MAJ '+d.maj+'</span></div>';
  document.getElementById('stock-canton-rows').innerHTML=rows;
  var extra='<div style="font-size:12px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:1px;margin-bottom:8px">💜 Plaquettes &nbsp;·&nbsp; 🧊 Plasma</div>';
  d.plaq.forEach(function(r){extra+=stockRow(r.g,r.w,r.s,false);});
  d.pfc.forEach(function(r){extra+=stockRow(r.g,r.w,r.s,false);});
  document.getElementById('stock-canton-extra').innerHTML=extra;
}

function toggleAcc(btn){
  btn.classList.toggle('open');
  let body=btn.nextElementSibling;
  if(!body||!body.classList.contains('acc-body')){
    body=btn.parentElement?.nextElementSibling;
  }
  if(!body||!body.classList.contains('acc-body')){
    const t=btn.dataset.target;
    if(t) body=document.getElementById(t);
  }
  if(!body||!body.classList.contains('acc-body'))return;
  if(body.classList.contains('open')){
    body.style.overflow='hidden';
    body.style.maxHeight=body.scrollHeight+'px';
    requestAnimationFrame(()=>{body.style.maxHeight='0px';});
    body.classList.remove('open');
  } else {
    body.style.overflow='hidden';
    body.style.maxHeight=body.scrollHeight+100+'px';body.classList.add('open');
    setTimeout(()=>{if(body.classList.contains('open')){body.style.maxHeight='none';body.style.overflow='';}},450);
  }
}

function openAcc(id){
  const b=document.querySelector('[data-target="'+id+'"]')||document.getElementById(id)?.previousElementSibling;
  const body=document.getElementById(id);
  if(body){body.style.maxHeight='none';body.classList.add('open');if(b&&b.classList)b.classList.add('open');}
}

function go(id){
  updateBreadcrumb(id);
  // Close mobile menu if open
  var mm=document.getElementById('mob-menu');if(mm)mm.classList.remove('show');
  var hb=document.getElementById('hamburger');if(hb)hb.classList.remove('open');
  // Re-open vid-demo-acc when navigating to videos (scrollHeight=0 when hidden)
  if(id==='videos'){setTimeout(()=>{const vd=document.getElementById('vid-demo-acc');if(vd){vd.style.maxHeight='none';vd.classList.add('open');const btn=document.querySelector('[data-target="vid-demo-acc"]');if(btn)btn.classList.add('open');}},50);}
  document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));
  document.querySelectorAll('.nav-tab').forEach(t=>t.classList.remove('active'));
  const v=document.getElementById('v-'+id);if(v)v.classList.add('active');
  document.querySelectorAll('.nav-tab').forEach(t=>{if(t.dataset.v===id)t.classList.add('active')});
  document.querySelectorAll('.nav-group-btn').forEach(b=>b.classList.toggle('active',(b.dataset.views||'').split(',').includes(id)));
  document.querySelectorAll('.nav-group-menu').forEach(m=>m.classList.remove('open'));
  document.querySelectorAll('.nav-group-btn').forEach(b=>b.setAttribute('aria-expanded','false'));
  window.scrollTo({top:0,behavior:'smooth'});
  if(id==='collectes'){setTimeout(initMap,200);if(typeof updateARPosition==='function')setTimeout(updateARPosition,1000);}
  if(id==='communaute'){document.querySelectorAll('#v-communaute [data-counter]').forEach(el=>{animateCounter(el,parseInt(el.dataset.counter),'',1500);});}
  if(id==='eligibilite'){initElig();initQHUG();}
  if(id==='guide')setTimeout(animateStory,300);
  if(id==='flux')setTimeout(initFlux,200);
  if(id==='hemorush'){setTimeout(function(){var btn=document.querySelector('#v-hemorush .acc-toggle[data-target="hr-game-acc"]');if(btn&&!btn.classList.contains('open'))btn.click();},300);}
  if(id==='videos')setTimeout(initVideoThumbs,200);
  // Close notif dropdown
  const dd=document.getElementById('notif-dd');if(dd)dd.classList.remove('open');
  // Refresh nav overflow to update active states
  setTimeout(updateNavOverflow,50);
}

document.querySelectorAll('.nav-tab').forEach(t=>t.addEventListener('click',()=>go(t.dataset.v)));

// ===== MODE PUBLIC : vues réservées aux testeurs invités (connexion demandée au moment d'y aller) =====
var BMB_RESERVE = {dashboard:1,communaute:1,flux:1,impact:1,profil:1,settings:1,vr:1}; // HémoRush reste ouvert à tous : c est le jeu qui attire
(function(){
  var goLibre = go;
  window.go = function(id){
    if(BMB_RESERVE[id] && window.BeeAcces && !window.BeeAcces.deverrouille()){ window.BeeAcces.exiger(function(){ goLibre(id); }); return; }
    goLibre(id);
  };
  // cadenas sur les onglets réservés tant qu'on n'est pas connecté
  document.querySelectorAll('.nav-tab').forEach(function(t){ if(BMB_RESERVE[t.dataset.v]) t.classList.add('bmb-reserve'); });
  // idem pour la barre du bas, le menu mobile et les tuiles de l'accueil (onclick=go('x') / goMob('x'))
  document.querySelectorAll('[onclick]').forEach(function(el){ var m=(el.getAttribute('onclick')||'').match(/^\s*go(?:Mob)?\('([a-z]+)'\)/); if(m&&BMB_RESERVE[m[1]]) el.classList.add('bmb-reserve'); });
  // vue Collectes : pour un visiteur, seuls l'en-tête, les collectes officielles des HUG et la carte des centres sont montrés (le reste est une démonstration)
  document.querySelectorAll('#v-collectes > *').forEach(function(el){ if(!(el.id==='collectes-hug'||el.id==='map-card'||el.classList.contains('sec-header'))) el.classList.add('alpha-only'); });
})();

function updateNavOverflow(){
  const container=document.getElementById('nav-tabs');
  const overflowBtn=document.getElementById('nav-overflow-btn');
  const overflowMenu=document.getElementById('nav-overflow-menu');
  if(!container||!overflowBtn||!overflowMenu)return;
  // If nav-tabs is hidden (very small screen), skip
  if(getComputedStyle(container).display==='none')return;
  // Show all top-level items first to measure (leaf tabs and group dropdowns alike)
  const tabs=container.querySelectorAll(':scope > .nav-tab, :scope > .nav-group');
  tabs.forEach(t=>t.style.display='');
  overflowBtn.style.display='none';
  // Get available width (container width minus padding and overflow btn width)
  const containerRect=container.getBoundingClientRect();
  const btnW=70; // reserve space for "⋯ Plus" button
  const maxRight=containerRect.right-btnW;
  let hiddenTabs=[];
  let anyHidden=false;
  tabs.forEach(t=>{
    const r=t.getBoundingClientRect();
    if(r.right>maxRight&&!anyHidden){anyHidden=true;}
    if(anyHidden){
      t.style.display='none';
      if(t.classList.contains('nav-group')){
        // Flatten the group's items (rendered elsewhere as a fixed dropdown) into the overflow list
        const menu=document.getElementById(t.dataset.menu);
        if(menu)menu.querySelectorAll('.nav-tab').forEach(inner=>{
          hiddenTabs.push({label:inner.textContent,view:inner.dataset.v,isActive:inner.classList.contains('active')});
        });
      }else{
        hiddenTabs.push({label:t.textContent,view:t.dataset.v,isActive:t.classList.contains('active')});
      }
    }
  });
  // Build overflow menu
  if(hiddenTabs.length>0){
    overflowBtn.style.display='block';
    overflowMenu.innerHTML=hiddenTabs.map(t=>
      '<button class="nav-tab'+(t.isActive?' active':'')+'" data-v="'+t.view+'" onclick="go(\''+t.view+'\');closeOverflowMenu()">'+t.label+'</button>'
    ).join('');
  }else{
    overflowBtn.style.display='none';
    overflowMenu.innerHTML='';
  }
  overflowMenu.classList.remove('open');
}

function toggleOverflowMenu(e){
  e.stopPropagation();
  const menu=document.getElementById('nav-overflow-menu');
  const btn=document.getElementById('nav-overflow-btn');
  if(!menu.classList.contains('open')){
    // Position below the button
    const r=btn.getBoundingClientRect();
    menu.style.top=(r.bottom+6)+'px';
    menu.style.right=(window.innerWidth-r.right)+'px';
  }
  menu.classList.toggle('open');
}

function closeOverflowMenu(){
  document.getElementById('nav-overflow-menu').classList.remove('open');
}

function closeNavGroups(returnFocus){
  const openBtn=returnFocus&&document.querySelector('.nav-group-btn[aria-expanded="true"]');
  document.querySelectorAll('.nav-group-menu').forEach(m=>m.classList.remove('open'));
  document.querySelectorAll('.nav-group-btn').forEach(b=>b.setAttribute('aria-expanded','false'));
  if(openBtn)openBtn.focus();
}

function toggleNavGroup(e,name){
  e.stopPropagation();
  const menu=document.getElementById('nav-group-menu-'+name);
  const btn=e.currentTarget;
  const wasOpen=menu.classList.contains('open');
  closeNavGroups();
  closeOverflowMenu();
  if(!wasOpen){
    const r=btn.getBoundingClientRect();
    menu.style.top=(r.bottom+6)+'px';
    menu.style.left=r.left+'px';
    menu.classList.add('open');
    btn.setAttribute('aria-expanded','true');
    const first=menu.querySelector('.nav-tab');
    if(first)first.focus();
  }
}
document.addEventListener('click',()=>{closeOverflowMenu();closeNavGroups();});
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeNavGroups(true);});
window.addEventListener('resize',updateNavOverflow);
setTimeout(updateNavOverflow,100);

function toggleNotif(e){e.stopPropagation();document.getElementById('notif-dd').classList.toggle('open')}
document.addEventListener('click',()=>{const dd=document.getElementById('notif-dd');if(dd)dd.classList.remove('open')});

function markAllRead(){
  document.querySelectorAll('.notif-item.unread').forEach(n=>n.classList.remove('unread'));
  const dot=document.querySelector('.nav-notif-dot');if(dot)dot.style.display='none';
  const btn=event.target;btn.textContent='✓ Tout lu';btn.style.color='var(--green)';
  setTimeout(()=>{btn.textContent='Tout marquer comme lu';btn.style.color='var(--gold)';},2000);
}

var _fsScrollY=0;
function toggleFS(el){
  var isGoingFS=!el.classList.contains('fullscreen');
  if(isGoingFS) _fsScrollY=window.scrollY;
  el.classList.toggle('fullscreen');
  const isFS=el.classList.contains('fullscreen');
  // Toggle body class — CSS uses this to hide nav, kill view animation stacking context
  document.body.classList.toggle('has-fullscreen',isFS);
  // Also hide/show bottom bar + footer via JS for older browsers
  const mb=document.getElementById('mob-bottom');
  const af=document.querySelector('.app-footer');
  if(isFS){
    if(mb){mb.style.display='none';}
    if(af){af.style.display='none';}
    document.body.style.paddingBottom='0';
    document.body.style.overflow='hidden';
    document.documentElement.style.overflow='hidden';
    // Request native fullscreen to hide browser chrome (Edge tab bar, etc.)
    try{
      var fsTarget=el;
      var fsPromise=fsTarget.requestFullscreen?fsTarget.requestFullscreen():fsTarget.webkitRequestFullscreen?fsTarget.webkitRequestFullscreen():Promise.resolve();
      Promise.resolve(fsPromise).then(function(){
        // Landscape lock only for Flux CTS on mobile
        if(el.id==='flux-wrap'&&window.innerWidth<=640){
          try{screen.orientation.lock('landscape').catch(function(){});}catch(e){}
        }
      }).catch(function(){});
    }catch(e){}
  } else {
    if(mb){mb.style.display='';}
    if(af){af.style.display='';}
    document.body.style.paddingBottom='';
    document.body.style.overflow='';
    document.documentElement.style.overflow='';
    // Exit native fullscreen if active
    if(document.fullscreenElement){
      try{document.exitFullscreen().catch(function(){});}catch(e){}
      try{screen.orientation.unlock();}catch(e){}
    }
    // Restore scroll position
    requestAnimationFrame(function(){window.scrollTo(0,_fsScrollY);});
  }
  // SVG auto-scales via viewBox, no resize needed
  // Resize map if needed
  if(el.id==='map-card'&&window.map){
    el.style.transition='none';
    [0,50,150,300,600,1000].forEach(d=>setTimeout(()=>{map.invalidateSize({animate:false});},d));
    setTimeout(()=>{el.style.transition='';},1100);
  }
  // Resize video canvas if present
  const vc=el.querySelector('.vid-player canvas');
  if(vc){
    const resizeVid=()=>{
      const wrap=vc.parentElement;
      const dpr=window.devicePixelRatio||1;
      const cssW=wrap.offsetWidth;
      const cssH=wrap.offsetHeight||Math.floor(cssW*9/16);
      vc.style.width=cssW+'px';vc.style.height=cssH+'px';
      vc.width=Math.floor(cssW*dpr);vc.height=Math.floor(cssH*dpr);
      const ctx=vc.getContext('2d');
      ctx.setTransform(dpr,0,0,dpr,0,0);
      // Re-find video index and restart if playing
      const idx=['vc-0','vc-1','vc-2','vc-3'].indexOf(vc.id);
      if(idx>=0&&vidStates[idx]&&vidStates[idx].playing){
        vidStates[idx].w=cssW;vidStates[idx].h=cssH;
        vidStates[idx].ctx=ctx;vidStates[idx].canvas=vc;
      }
    };
    [0,50,150,300,500,800,1200].forEach(d=>setTimeout(resizeVid,d));
  }
}
document.addEventListener('keydown',e=>{if(e.key==='Escape'){var hadFS=document.querySelectorAll('.fullscreen').length>0;document.querySelectorAll('.fullscreen').forEach(el=>{el.classList.remove('fullscreen');if(el.id==='map-card')el.style.transition='none';const vc=el.querySelector('.vid-player canvas');if(vc){[0,50,200,400,700,1000].forEach(d=>setTimeout(()=>{const wrap=vc.parentElement;const dpr=window.devicePixelRatio||1;const cssW=wrap.offsetWidth;const cssH=wrap.offsetHeight||Math.floor(cssW*9/16);vc.style.width=cssW+'px';vc.style.height=cssH+'px';vc.width=Math.floor(cssW*dpr);vc.height=Math.floor(cssH*dpr);const ctx=vc.getContext('2d');ctx.setTransform(dpr,0,0,dpr,0,0);const idx=['vc-0','vc-1','vc-2','vc-3'].indexOf(vc.id);if(idx>=0&&vidStates[idx]&&vidStates[idx].playing){vidStates[idx].w=cssW;vidStates[idx].h=cssH;vidStates[idx].ctx=ctx;vidStates[idx].canvas=vc;}},d));}});if(hadFS){document.body.classList.remove('has-fullscreen');document.body.style.overflow='';document.documentElement.style.overflow='';document.body.style.paddingBottom='';var mb=document.getElementById('mob-bottom');if(mb)mb.style.display='';var af=document.querySelector('.app-footer');if(af)af.style.display='';if(document.fullscreenElement){try{document.exitFullscreen().catch(function(){});}catch(e2){}}try{screen.orientation.unlock();}catch(e3){}requestAnimationFrame(function(){window.scrollTo(0,_fsScrollY);});}if(window.map)[0,50,200,500,1000].forEach(d=>setTimeout(()=>{map.invalidateSize({animate:false});document.getElementById('map-card').style.transition='';},d));}});

// Catch native fullscreen exit (browser ESC on Flux CTS mobile)
document.addEventListener('fullscreenchange',function(){
  if(!document.fullscreenElement){
    document.querySelectorAll('.fullscreen').forEach(function(el){el.classList.remove('fullscreen');});
    document.body.classList.remove('has-fullscreen');
    document.body.style.overflow='';document.documentElement.style.overflow='';document.body.style.paddingBottom='';
    var mb=document.getElementById('mob-bottom');if(mb)mb.style.display='';
    var af=document.querySelector('.app-footer');if(af)af.style.display='';
    try{screen.orientation.unlock();}catch(e){}
    requestAnimationFrame(function(){window.scrollTo(0,_fsScrollY);});
  }
});
document.addEventListener('webkitfullscreenchange',function(){
  if(!document.webkitFullscreenElement&&!document.fullscreenElement){
    document.querySelectorAll('.fullscreen').forEach(function(el){el.classList.remove('fullscreen');});
    document.body.classList.remove('has-fullscreen');
    document.body.style.overflow='';document.documentElement.style.overflow='';document.body.style.paddingBottom='';
    var mb=document.getElementById('mob-bottom');if(mb)mb.style.display='';
    var af=document.querySelector('.app-footer');if(af)af.style.display='';
  }
});
// Safety net: if has-fullscreen is stuck but no .fullscreen elements exist, clean up
window.addEventListener('resize',function(){
  if(document.body.classList.contains('has-fullscreen')&&!document.querySelector('.fullscreen')){
    document.body.classList.remove('has-fullscreen');
    document.body.style.overflow='';document.documentElement.style.overflow='';document.body.style.paddingBottom='';
    var mb=document.getElementById('mob-bottom');if(mb)mb.style.display='';
    var af=document.querySelector('.app-footer');if(af)af.style.display='';
  }
});

function toggleMobMenu(){
  const h=document.getElementById('hamburger');
  const m=document.getElementById('mob-menu');
  if(h)h.classList.toggle('open');
  if(m)m.classList.toggle('show');
}

function goMob(id){
  go(id);
  document.getElementById('mob-menu').classList.remove('show');
  document.getElementById('hamburger').classList.remove('open');
  // Update mobile bottom bar
  document.querySelectorAll('.mob-bottom-btn').forEach(b=>b.classList.remove('active'));
  const mbb=document.querySelector('.mob-bottom-btn[onclick*="'+id+'"]');
  if(mbb)mbb.classList.add('active');
}

function showToast(msg){
  let t=document.getElementById('settings-toast');
  if(!t){t=document.createElement('div');t.id='settings-toast';t.style.cssText='position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:var(--gold);color:var(--dark);padding:8px 20px;border-radius:20px;font-size:14px;font-weight:600;z-index:9999;opacity:0;transition:opacity .3s;pointer-events:none';document.body.appendChild(t);}
  t.textContent=msg;t.style.opacity='1';
  clearTimeout(t._to);t._to=setTimeout(()=>t.style.opacity='0',2000);
}

function animateCounter(el,target,suffix='',duration=2000){
  const start=performance.now();const isFloat=String(target).includes('.');
  function tick(now){
    const p=Math.min((now-start)/duration,1);
    const eased=1-Math.pow(1-p,3);
    const val=isFloat?(eased*target).toFixed(0):Math.floor(eased*target);
    el.textContent=Number(val).toLocaleString('fr-CH')+suffix;
    if(p<1)requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

const SYSTEM_PROMPT=`Tu es l'assistant BeeMyBlood™, un chatbot chaleureux et bienveillant spécialisé dans le don de sang à Genève. Tu tutoies l'utilisateur. Tu réponds en français, de façon concise (max 150 mots), avec un ton jeune et encourageant.

CONNAISSANCES CLÉS (source: CTS HUG & Transfusion CRS Suisse, fév. 2026):

CENTRE DE TRANSFUSION SANGUINE HUG:
- Adresse: Rue Gabrielle-Perret-Gentil 6, 1205 Genève
- Tél: +41(0)22 372 39 01 | Accueil.Donneurs@hug.ch | www.dondusang.ch
- Horaires: Lu/Ma/Me/Ve 7h30-15h, Jeudi 11h-19h, Samedi 1er et 3ème du mois 8h30-12h
- RDV OneDoc: onedoc.ch (Centre de transfusion sanguine HUG)
- Numéro gratuit national: 0800 148 148 | jedonnemonsang.ch

LE DON DE SANG:
- Ponction veineuse au pli du coude, ~500 ml en ~10 minutes
- Bien supporté par une personne en bonne santé
- Effets possibles: chute de pression (malaise), hématome au point de ponction, rarement lésion nerveuse
- Prévoir ~45 minutes au total (accueil, questionnaire, entretien médecin, don, repos)
- Avec BeeMyBlood™ pré-inscription: ~25-30 min

AVANT LE DON: boire 1-1.5L de liquide, repas léger, pièce d'identité avec photo
APRÈS LE DON: en-cas, attendre 30 min avant de conduire, 12h avant sport/activités à risque

ÉLIGIBILITÉ — CONDITIONS DE BASE:
- Âge: 18-65 ans (primo-donneurs jusqu'à 60 ans)
- Poids: >50 kg
- Se sentir en bonne santé

CONTRE-INDICATIONS DÉFINITIVES:
- Test positif HIV, hépatite B/C, syphilis
- Injection de drogue (ancienne ou actuelle)

CONTRE-INDICATIONS TEMPORAIRES (exemples):
- Nouveau partenaire sexuel: 4 mois d'attente
- Plus de 2 partenaires en 4 mois: attente
- Voyage hors Suisse: selon pays (vérifier Travelcheck sur blutspende.ch/fr)
- Tatouage/piercing/microblading: 4 mois
- Traitement dentaire: 14 jours (hygiène) ou plus (chirurgie)
- Fièvre >38°C ou maladie légère: 4 semaines
- Médicaments: selon type (Roaccutan 4 sem, PrEP/PEP 4 mois, etc.)
- Vaccin rage/tétanos: 12 mois. Autres vaccins: 4 semaines
- Opération/hospitalisation: 3 ans ou selon cas
- Transfusion reçue: 4 mois
- Grossesse: délai selon cas
- Délai entre dons: minimum 3 mois (hommes), 4 mois (femmes)

TESTS EFFECTUÉS À CHAQUE DON:
- HIV, hépatite B, C et E, syphilis, et si nécessaire Parvovirus B19 et hépatite A
- Détermination groupe ABO, Rhésus, autres groupes importants (méthodes génétiques si besoin)

INFORMATIONS POST-DON IMPORTANTES:
- Informer rapidement le CTS si: maladie dans les jours suivants, réponse incorrecte au questionnaire, complications
- Tél rétractation: 031 384 22 60 (possible avant transfusion du sang)

GROUPES SANGUINS:
- O-: donneur universel de globules rouges (7% pop suisse)
- O+: le plus courant (~38%)
- A+: ~32%, A-: ~6%
- B+: ~11% (groupe d'Amine), B-: ~2%
- AB+: receveur universel (~3%), AB-: ~1%

DONNÉES PROTECTION:
- Données soumises au secret médical
- Utilisées par Transfusion CRS Suisse et SRTS
- Seules infos codées (n° donneur, n° produit) et groupe sanguin transmises pour soins
- Droit d'opposition à l'anonymisation et réutilisation à tout moment

CASQUE VR BEEMYBLOOD: 4 univers (plage, forêt, espace, fond marin), -24% douleur, -40% anxiété
HEMORUSH: jeu éducatif sur les compatibilités sanguines, 5 modes

PHÉNOTYPE ÉTENDU D'AMINE:
- ABO: B, Rh: D+ C- c+ E- e+ (R0r), Kell: K- k+, Kidd: Jk(a+ b-), MNS: M+ N- S- s+, Lewis: Le(a- b-), P1PK: P1+
- Duffy: Fy(a- b-) = RARE (<1% en Suisse, fréquent Afrique de l'Ouest). Essentiel pour personnes vivant avec une drépanocytose chroniquement transfusés.
- ~30 donneurs compatibles en Suisse romande. Amine en fait partie.

GUIDE DU DON: 5 étapes (accueil, entretien, don, repos lounge, après-don). Le tout prend ~35-45 min (25 avec BeeMyBlood™)
LOUNGE: concept premium inspiré du lounge première classe. Fauteuils design, éclairage chaud, musique, café, viennoiseries, Wi-Fi, tablettes HémoRush™
IMPACT/APRÈS-DON: Feedback d'impact réel. Le don #3 d'Amine (14 janv.) a été transfusé en chirurgie cardiaque le 16 janv. 3 dons = ~9 vies touchées (1 don = 3 PSL = jusqu'à 3 vies)
PROGRAMME FRATRIE: Le phénotype Duffy négatif est héréditaire. Amine peut inviter ses frères/soeurs qui ont peut-être le même profil rare
ATTESTATIONS: attestation de don pour employeur/université + attestation TPG (transport gratuit le jour du don)
SOCIAL WALL: communauté BeeMyBlood™ Genève, posts de donneurs, badges partagés
AR INDOOR: guidage en réalité augmentée à l'intérieur du centre, étape par étape, avec micro-contenus éducatifs
FLUX CTS: dashboard TV temps réel montrant les entrées/sorties de poches (CE, CP, PFC), stocks par groupe, alertes péremption, prescriptions PRESCO
VIDÉOS: 2 vidéos MP4 réelles (Démo VR pendant le don, Guide 5 étapes) + 4 animations Canvas 30 sec (témoignage Amine, guide animé, simulation VR plage, simulation AR guidage)
PRODUITS SANGUINS LABILES: CE (globules rouges, 42j max), CP (plaquettes, 5j max !), PFC (plasma, 3 ans max)
PLANNING SPATIO-TEMPOREL: couverture collectes optimisée par IA (CTS HUG permanent, + collectes mobiles tournantes)
ÉVÉNEMENTS: collectes spéciales Fête de la Musique, Bol d'Or, salles de sport
ONBOARDING: modal d'accueil 4 étapes pour primo-donneurs

Ne donne jamais de diagnostic médical. Si question complexe → "le médecin du CTS pourra te confirmer". Termine par un emoji quand c'est naturel.`;

const KB=[
  {keys:['groupe','mon groupe','b+','b positif','quel groupe','phénotype','phenotype','duffy','rare'],r:`Tu es <span class="hl">B positif (B+)</span> avec un phénotype étendu rare ! 🧬<br><br>Le plus remarquable : ton profil <strong style="color:var(--gold)">Duffy négatif Fy(a−b−)</strong> est présent chez <1% des donneurs en Suisse. Il est essentiel pour les personnes vivant avec une drépanocytose qui reçoivent des transfusions régulières et développent des anticorps.<br><br>Ton phénotype complet :<br><span style="font-family:monospace;font-size:14px">Rh: D+ C− c+ E− e+ · Kell: K− k+<br>Duffy: Fy(a−b−) ★ · Kidd: Jk(a+b−)<br>MNS: M+N−S−s+ · Lewis: Le(a−b−)</span><br><br>En Suisse romande, ~30 donneurs ont un profil compatible. <strong>Tu es l'un d'eux.</strong> 👑`},
  {keys:['peur','aiguille','aiguilles','anxi','stress','angoiss'],r:`C'est super courant, t'inquiète pas ! 💛 On propose un <span class="hl">casque VR</span> pendant la piqûre : tu seras sur une plage tropicale au lieu de voir l'aiguille. Les études montrent -24% de douleur perçue et -40% d'anxiété. La plupart des donneurs disent que c'est <strong>moins douloureux qu'une prise de sang</strong>. Et l'équipe est formée pour accompagner les primo-donneurs anxieux. Tu veux voir les univers VR ? 🥽`},
  {keys:['éligible','eligible','puis-je','je peux donner','conditions','critère'],r:`Les conditions de base : avoir entre 18 et 65 ans, peser plus de 50 kg, et se sentir en bonne santé. Ensuite il y a des critères temporaires (voyage récent, médicaments, tatouage...). Fais le <a href="#" onclick="go('eligibilite');return false" style="color:var(--gold)">test d'éligibilité complet</a> en 30 secondes, ou appelle le CTS au +41 22 372 39 01. ✅`},
  {keys:['où donner','collecte','centre','trouver','adresse','cts','lieu'],r:`📍 Le Centre de Transfusion Sanguine des HUG est au <strong>Rue Gabrielle-Perret-Gentil 6, 1205 Genève</strong>.<br>Horaires : Lu/Ma/Me/Ve 7h30-15h · Jeudi 11h-19h · Samedi 1er et 3e du mois 8h30-12h.<br><br>Il y a aussi des <span class="hl">collectes mobiles</span> : Uni Dufour cette semaine ! Voir la <a href="#" onclick="go('collectes');return false" style="color:var(--gold)">carte</a>. 🗺️`},
  {keys:['mal','douleur','douloureux','piqu','fait mal','souffr'],r:`La piqûre dure <strong>2 secondes</strong>. La plupart des donneurs la décrivent comme un léger pincement — moins qu'une prise de sang classique. Avec le casque VR : -24% de douleur perçue. Le prélèvement dure ~10 min. Après : espace lounge avec café et collations. ☕`},
  {keys:['combien de temps','durée','duree','long','minute','temps total'],r:`Le parcours complet :<br>📋 Accueil + questionnaire : ~10 min (5 min avec formulaire pré-rempli BeeMyBlood™ !)<br>👩‍⚕️ Entretien médecin + mesures : ~5 min<br>🩸 Don lui-même : ~8-10 min<br>☕ Repos + collation : ~10-15 min<br><br>Total : <span class="hl">~35-45 min</span>. Avec pré-inscription : ~25 min. Le CTS dit de prévoir environ 45 min. ⏱️`},
  {keys:['rare','donneur rare','phénotype','phenotype','étendu'],r:`Un donneur rare a un <span class="hl">phénotype étendu</span> peu courant. En Suisse romande, on identifie ~30 donneurs rares. Ils sont essentiels pour les patients chroniquement transfusés (drépanocytose, thalassémie) qui développent des anticorps. Ces donneurs ont un traitement royal : convocation personnalisée, appel téléphonique, accès prioritaire. 👑`},
  {keys:['rdv','rendez-vous','réserver','reserver','prendre','onedoc','appointment'],r:`Tu peux prendre RDV de plusieurs façons :<br>📅 <a href="https://www.onedoc.ch/fr/infirmier/geneve/pb5bt/centre-de-transfusion-sanguine-1" onclick="bmbReserver(this.href,&quot;onedoc&quot;,&quot;geneve&quot;)" target="_blank" aria-describedby="ext-link-notice" style="color:var(--gold)"><strong>OneDoc</strong></a> — en ligne, 2 clics<br>🏥 <a href="https://www.hug.ch/don-du-sang/donner-mon-sang" target="_blank" aria-describedby="ext-link-notice" style="color:var(--gold)"><strong>Site du CTS</strong></a> — www.dondusang.ch<br>📞 Tél : +41 22 372 39 01<br>📧 Accueil.Donneurs@hug.ch<br><br>Créneau recommandé pour toi : <span class="hl">mardi 18 mars à 14h</span> (calme). 📅`},
  {keys:['tatouage','tattoo','piercing','microblading','maquillage permanent'],r:`Après un tatouage, piercing, microblading ou maquillage permanent, il faut attendre <span class="hl">4 mois</span> avant de pouvoir donner. C'est une précaution pour éviter tout risque d'infection. Idem pour une gastro-coloscopie ou un contact avec du sang étranger. Le médecin du CTS confirmera à ton arrivée. 🕐`},
  {keys:['voyage','étranger','etranger','vacances','pays','travelcheck'],r:`Si tu as voyagé hors de Suisse dans les <span class="hl">6 derniers mois</span>, ça dépend du pays ! Certains pays tropicaux (risque paludisme) imposent un délai plus long. Vérifie sur <a href="https://www.blutspende.ch/fr" target="_blank" aria-describedby="ext-link-notice" style="color:var(--gold)">blutspende.ch/fr → Travelcheck</a>. Le médecin du CTS t'aidera aussi à y voir clair. ✈️`},
  {keys:['médicament','medicament','traitement','pilule','roaccutan','antibiotique','PrEP','PEP','wellbutrin','ibuprofen','ibuprofène','paracetamol','paracétamol','dafalgan','aspirin','aspirine','xanax','lexomil','temesta','valium','sertraline','prozac','effexor','citalopram','lithium','topamax','avodart','neotigason','cortisone','prednisone','voltaren','doliprane','codéine','codeine','tramadol','morphine','methadone','ritaline','concerta','lyrica','gabapentine','omeprazole','pantoprazole','antidépresseur','antidepresseur','anxiolytique','somnifère','somnifere','anticoagulant','sintrom','xarelto','eliquis','insuline','metformine','lévothyrox','levothyrox','ventoline','symbicort','finasteride','minoxidil','isotrétinoïne','accutane','diane'],r:`Ça dépend du médicament ! En résumé :<br>• Contraception orale : <span class="hl">OK, pas de problème</span><br>• Antibiotiques/anti-inflammatoires : attendre 4 semaines<br>• Roaccutan (acné) : attendre 4 semaines après arrêt<br>• PrEP/PEP (VIH) : attendre 4 mois<br>• Lithium, Topamax, antiépileptiques : 4 semaines<br>• Avodart (prostate) : 6 mois<br>• Neotigason (psoriasis) : 3 ans<br>• Anticoagulants (Sintrom, Xarelto) : discussion avec médecin<br>• Antidépresseurs (Wellbutrin, Prozac, etc.) : <span class="hl">généralement OK</span>, à confirmer<br><br>Pour tout médicament spécifique, le médecin du CTS vérifiera avec toi. 💊`},
  {keys:['dentiste','dentaire','dent','hygiène dentaire','hygiene dentaire'],r:`Après un traitement dentaire ou d'hygiène dentaire, il faut attendre <span class="hl">14 jours</span>. Si c'est une chirurgie dentaire plus lourde, le délai peut être plus long. Le médecin du CTS validera ça avec toi à ton arrivée. 🦷`},
  {keys:['vaccin','vaccination','vacciné','rage','tétanos','tetanos'],r:`Ça dépend du vaccin :<br>• Rage ou tétanos : attendre <span class="hl">12 mois</span><br>• Autres vaccins (grippe, COVID, etc.) : attendre <span class="hl">4 semaines</span><br>Le médecin du CTS vérifiera avec toi. 💉`},
  {keys:['test','analyse','dépistage','depistage','sérologie','serologie','vih','hiv','hépatite','hepatite'],r:`À chaque don, ton sang est systématiquement testé pour : <span class="hl">HIV, hépatite B, C et E, syphilis</span>, et si nécessaire Parvovirus B19 et hépatite A. On détermine aussi ton groupe ABO, Rhésus et autres marqueurs importants. Si un test est réactif, tu es immédiatement informé(e) et le sang n'est pas transfusé. 🔬`},
  {keys:['après le don','après don','apres le don','post-don','post don','repos','condui'],r:`Après le don :<br>☕ Prends le temps de manger un en-cas et de boire<br>🚗 Attends <strong>30 minutes</strong> avant de conduire<br>🏃 Attends <strong>12 heures</strong> avant le sport ou activités à risque<br><br>Important : si tu te sens mal dans les jours suivants, ou si tu réalises avoir mal répondu au questionnaire, <span class="hl">informe immédiatement le CTS</span> au +41 22 372 39 01. 🙏`},
  {keys:['avant le don','avant don','préparer','preparer','manger','boire','repas'],r:`Avant le don :<br>💧 Bois au moins <strong>1 à 1.5 litre</strong> de liquide<br>🥗 Prends un <strong>repas léger</strong> (évite de venir à jeun)<br>🪪 Amène une <strong>pièce d'identité avec photo</strong><br>⏰ Prévois environ 45 min (25-30 avec BeeMyBlood™ !)<br><br>T'es prêt ! 💪`},
  {keys:['fréquence','frequence','souvent','intervalle','délai','delai entre'],r:`Le délai minimum entre deux dons :<br>👨 Hommes : <span class="hl">3 mois</span> (max 4 dons/an)<br>👩 Femmes : <span class="hl">4 mois</span> (max 3 dons/an)<br>C'est pour laisser le temps à ton corps de reconstituer les globules rouges. 🔄`},
  {keys:['protecti','données','donnees','secret','confidentiel','vie privée'],r:`Tes données sont protégées par le <span class="hl">secret médical</span>. Elles sont utilisées par Transfusion CRS Suisse et les services régionaux. Seules les infos codées (n° donneur, n° produit) et le groupe sanguin sont transmises pour les soins. Les SRTS respectent la Loi sur la protection des données. Tu peux t'opposer à l'anonymisation et à la réutilisation de ton don à tout moment. 🔒`},
  {keys:['rétracter','retracter','annuler','retirer','changer d\'avis','regrette'],r:`Tu peux te rétracter <strong>à tout moment</strong> — avant, pendant ou après le don — sans donner de raison. L'utilisation de ton sang peut être interdite tant qu'il n'a pas été transfusé. Appelle le <span class="hl">031 384 22 60</span>. C'est ton droit absolu. 🤝`},
  {keys:['tique','piqûre','piqure','morsure'],r:`Si tu as été piqué par une tique dans les <span class="hl">4 dernières semaines</span>, il faut le signaler au questionnaire (question 13c). Le médecin du CTS évaluera si tu peux donner. En cas de doute, mieux vaut le mentionner ! 🪲`},
  {keys:['acide folique','folique','vitamine','supplément','supplement','fer','magnésium','magnesium','zinc','omega','complément','complement','multivitamin'],r:`Les compléments alimentaires courants sont <span class="hl">généralement compatibles</span> avec le don de sang :<br><br>✅ <strong>Acide folique</strong> : aucun problème, tu peux continuer<br>✅ <strong>Vitamines</strong> (B12, C, D, multivitamines) : OK<br>✅ <strong>Magnésium, zinc, oméga-3</strong> : OK<br>⚠️ <strong>Fer</strong> : OK, mais signale-le au médecin (il vérifiera ta ferritine)<br><br>En revanche, certains médicaments sur ordonnance imposent un délai. Le médecin du CTS validera avec toi. 💊`},
  {keys:['alcool','bière','biere','vin','apéro','apero','soirée','soiree'],r:`Il est conseillé de <span class="hl">ne pas consommer d'alcool les 24h précédant le don</span> et d'éviter après le don aussi (ton volume sanguin est réduit, l'alcool frappe plus fort !). Hydrate-toi plutôt avec de l'eau. 🚫🍷`},
  {keys:['sport','exercice','gym','course','running','vélo','velo','muscul','entraîn','entrain','fitness'],r:`Avant le don : évite les efforts <span class="hl">intenses le jour même</span>. Après le don : attends <strong>12 heures minimum</strong> avant toute activité sportive. Pour les sports à risque (escalade, plongée) : 48h. Ton corps a besoin de reconstituer le volume sanguin. 🏃`},
  {keys:['enceinte','grossesse','allaitement','allait','bébé','bebe','pregnant'],r:`Le don de sang est <span class="hl">contre-indiqué pendant la grossesse</span> et jusqu'à <strong>6 mois après l'accouchement</strong>. Si tu allaites, le délai est aussi de 6 mois après la fin de l'allaitement. La santé de maman et bébé prime ! 🤰`},
  {keys:['poids','kilo','kg','maigre','mince','50'],r:`Le poids minimum pour donner est de <span class="hl">50 kg</span>. C'est une question de sécurité : on prélève ~450 ml, et en dessous de 50 kg, le volume prélevé serait proportionnellement trop important. ⚖️`},
  {keys:['âge','age','vieux','jeune','retraite','senior','18 ans','65 ans','mineur'],r:`Tu peux donner de <span class="hl">18 à 65 ans</span> (première fois avant 60 ans). Pour les donneurs réguliers, la limite peut aller jusqu'à 75 ans sur avis médical. Les mineurs ne peuvent pas donner. 🎂`},
  {keys:['vr','réalité virtuelle','realite virtuelle','casque','immersion'],r:`Le casque VR BeeMyBlood™ propose <span class="hl">4 univers immersifs</span> : plage tropicale 🏖️, forêt enchantée 🌲, voyage spatial 🚀, fond marin 🐋. Tu l'enfiles avant la piqûre, et tu ne vois pas l'aiguille. Son 360° spatial, respiration guidée optionnelle, communication avec l'infirmière via micro intégré. Résultats : -24% douleur, -40% anxiété, +65% rétention primo-donneurs. Essaie-le <a href="#" onclick="go('vr');return false" style="color:var(--gold)">ici</a> ! 🥽`},
  {keys:['hemorush','hémorush','jeu','jouer','game','quiz'],r:`HémoRush™ est notre jeu éducatif ! Tu dois matcher les poches de sang aux bons patients en respectant les compatibilités. 5 modes : Rush (2 min chrono), Défi 1v1, Apprentissage (sans chrono), Scénario (missions), et Saison (tournois). C'est fun et tu apprends la transfusion en jouant ! <a href="#" onclick="go('hemorush');return false" style="color:var(--gold)">Jouer maintenant</a> 🎮`},
  {keys:['compatib','universel','qui peut recevoir','qui peut donner','transfus'],r:`En transfusion de globules rouges :<br>🩸 <span class="hl">O-</span> = donneur universel (donne à tous)<br>🩸 <span class="hl">AB+</span> = receveur universel (reçoit de tous)<br>Toi (B+), tu peux recevoir de : O-, O+, B-, B+<br>Toi (B+), tu peux donner à : B+, AB+<br><br>Voir le <a href="#" onclick="go('hemorush');return false" style="color:var(--gold)">tableau complet dans HémoRush™</a> ! 🧬`},
  {keys:['grossesse','enceinte','allaite'],r:`La grossesse est une contre-indication temporaire au don de sang. Si tu as été enceinte, le médecin du CTS évaluera le délai selon ta situation. C'est la question 18 du questionnaire médical. N'hésite pas à en parler directement avec l'équipe du CTS. 🤰`},
  {keys:['opération','operation','chirurgie','hôpital','hopital','accident'],r:`Si tu as été hospitalisé(e), opéré(e) ou eu un accident dans les <span class="hl">3 dernières années</span>, il faut le signaler (question 9). Selon la nature de l'intervention, un délai variable s'applique. Greffe d'organe = contre-indication définitive. Le médecin du CTS évaluera. 🏥`},
  {keys:['formulaire','questionnaire','papier','document','inscription'],r:`Le questionnaire d'inscription au don comprend 18 questions médicales + tes données personnelles. Avec BeeMyBlood™, tu peux <a href="#" onclick="go('eligibilite');return false" style="color:var(--gold)">faire le test d'éligibilité</a> et <strong>générer le formulaire pré-rempli</strong> pour gagner ~15 min sur place. Il te restera juste à compléter les réponses OUI/NON et signer. 📄`},
  {keys:['comment ça se passe','étapes','à quoi s\'attendre','déroulement','guide','parcours du don'],r:`Le don se déroule en <span class="hl">5 étapes simples</span> :<br>1️⃣ Accueil & inscription (~5 min, 2 min avec pré-remplissage BeeMyBlood™)<br>2️⃣ Entretien médical confidentiel (~5 min)<br>3️⃣ Le don lui-même (~8-10 min, casque VR dispo)<br>4️⃣ Repos & collation premium (~10-15 min)<br>5️⃣ Après-don : feedback d'impact dans les jours suivants<br><br>Tout est expliqué dans le <a href="#" onclick="go('guide');return false" style="color:var(--gold)">Guide du don</a> 📺`},
  {keys:['impact','à quoi sert','sauvé','vie','transfusé','utilité','résultat'],r:`Ton dernier don (#3, 14 janv.) a été <span class="hl">transfusé à un patient en chirurgie cardiaque</span> aux HUG, seulement 2 jours après ! 💛<br><br>En 3 dons, tu as touché jusqu'à <strong>~9 vies</strong> (chaque don = 3 produits sanguins = jusqu'à 3 vies). Et avec ton phénotype Duffy négatif rare, ton sang est particulièrement précieux pour les personnes vivant avec une drépanocytose.<br><br>Consulte ton <a href="#" onclick="go('impact');return false" style="color:var(--gold)">historique d'impact</a> pour tout voir. ⭐`},
  {keys:['lounge','salon','confort','attente','ambiance','café','collation'],r:`L'expérience BeeMyBlood™ s'inspire du <span class="hl">lounge première classe</span>, pas de la salle d'attente ! 🛋️<br><br>Après le don : fauteuils design, éclairage chaud, musique d'ambiance, café, viennoiseries, Wi-Fi, tablettes HémoRush™. Le luxe, c'est l'attention portée à chaque détail.<br><br>Découvre le concept dans le <a href="#" onclick="go('guide');return false" style="color:var(--gold)">Guide du don</a>.`},
  {keys:['fratrie','frère','soeur','famille','inviter','recruter','héréditaire'],r:`Ton phénotype Duffy négatif est <span class="hl">héréditaire</span> ! 👨‍👩‍👦<br><br>Tes frères et sœurs ont une forte probabilité de partager ce profil rare. Le <strong>Programme Fratrie</strong> te permet de les inviter facilement.<br><br>🎁 <strong>Ce que tu gagnes :</strong><br>🧬 Membre testé → badge « Recruteur Rare » + 2'000 XP<br>🩸 Premier don d'un·e invité·e → badge « Héros Fratrie » + 5'000 XP<br>👑 3 membres actifs → escouade familiale + créneaux prioritaires<br>💛 Si un·e invité·e est aussi Duffy négatif, vous doublez le nombre de donneurs compatibles pour les patients drépanocytaires.<br><br>Va sur <a href="#" onclick="go('impact');return false" style="color:var(--gold)">Mon impact</a> pour inviter ta fratrie. 🧬`},
  {keys:['attestation','certificat','employeur','université','tpg','transport'],r:`Après chaque don, BeeMyBlood™ génère automatiquement tes attestations 📄 :<br><br>📄 <strong>Attestation de don</strong> — pour ton employeur ou ton université<br>🚌 <strong>Attestation TPG</strong> — transport gratuit le jour du don<br><br>Tu les trouves dans <a href="#" onclick="go('impact');return false" style="color:var(--gold)">Mon impact → Documents</a>. Téléchargeables en PDF ! 📥`},
  {keys:['flux','poches','stock','écran','tv','entré','sorti','temps réel','live'],r:`L'écran <span class="hl">Flux CTS</span> montre en temps réel les mouvements de poches au Centre de Transfusion HUG 📺 :<br><br>🩸 <strong>Globules rouges (CE)</strong> (42j max) — 199 en stock<br>💜 <strong>Plaquettes</strong> (5j max !) — 18 unités<br>💛 <strong>Plasma</strong> (3 ans max) — 142 unités<br><br>L'objectif du CTS Genève est de <strong>50 à 70 dons par jour</strong>. En dessous de 50, les stocks deviennent critiques. Tu peux voir les entrées (dons validés), les sorties (prescriptions) et les alertes de péremption. <a href="#" onclick="go('flux');return false" style="color:var(--gold)">Voir le flux en direct →</a> 📺`},
  {keys:['vidéo','video','film','témoignage','clip','regarder'],r:`On a 6 vidéos à te montrer 🎬 :<br><br>🎥 <strong>VIDÉOS MP4 :</strong><br>🥽 <strong>Démo VR pendant le don</strong> — comment le casque transforme l'expérience<br>📺 <strong>Guide 5 étapes</strong> — le parcours complet du donneur<br><br>🎨 <strong>ANIMATIONS INTERACTIVES :</strong><br>💬 <strong>Témoignage d'Amine</strong> — de la peur à donneur rare<br>📺 <strong>Le don en 30 sec</strong> — animation des 5 étapes<br>🥽 <strong>Simulation VR plage</strong> — coucher de soleil apaisant<br>📱 <strong>Guidage AR</strong> — flèches en réalité augmentée<br><br>Regarde-les dans l'onglet <a href="#" onclick="go('videos');return false" style="color:var(--gold)">Vidéos</a> ! 🎬`},
  {keys:['plaquette','plasma','érythrocyte','globule','produit sanguin','psl','durée de vie','péremption','expir'],r:`Le sang est séparé en <span class="hl">3 produits sanguins labiles (PSL)</span> :<br><br>🩸 <strong>Globules rouges (CE)</strong> — concentrés érythrocytaires — durée max 42 jours — chirurgie, anesthésie, grossesses à risque, hémoglobinopathies (drépanocytose, thalassémie)<br>💜 <strong>Concentrés plaquettaires (CP)</strong> — plaquettes — durée max <strong>5 jours seulement !</strong> — onco-hématologie adulte et pédiatrique, greffes<br>💛 <strong>Plasma frais congelé (PFC)</strong> — durée max 3 ans — brûlures, hémorragies massives, troubles de coagulation<br><br>Les plaquettes sont les plus critiques car elles expirent très vite. C'est pourquoi les dons réguliers sont si importants 🩸`},
  {keys:['quoi','sang','c\'est quoi','compose','composant','plaquette','plasma','globule'],r:`Ton sang est composé de plusieurs éléments :<br>🔴 <strong>Globules rouges</strong> : transportent l'oxygène (c'est ce qu'on prélève surtout)<br>⚪ <strong>Globules blancs</strong> : défenses immunitaires<br>🟡 <strong>Plaquettes</strong> : coagulation<br>💛 <strong>Plasma</strong> : liquide transporteur (protéines, anticorps)<br><br>À chaque don (~500ml), les composants sont séparés et utilisés pour différents patients. Un seul don peut sauver jusqu'à <span class="hl">3 vies</span> ! 🩸`},
  {keys:['merci','super','top','cool','génial','genial','parfait','nickel'],r:`Avec plaisir ! N'hésite jamais à me poser d'autres questions. Et si tu veux te lancer, le plus simple c'est de <a href="https://www.onedoc.ch/fr/infirmier/geneve/pb5bt/centre-de-transfusion-sanguine-1" onclick="bmbReserver(this.href,&quot;onedoc&quot;,&quot;geneve&quot;)" target="_blank" aria-describedby="ext-link-notice" style="color:var(--gold)">prendre RDV sur OneDoc</a>. Chaque don compte, et toi tu comptes ! 💛🐝`},
  {keys:['actualité','actualite','news','loi','législation','parlement','conseil national','critère','discrimination','HSH','gay','gratuité','gratuit','FFDSB','association donneur','carence','fer','martiale','ferritine'],r:`La section <span class="hl">Actualités</span> couvre toute la veille transfusionnelle ! 📰<br><br>🔴 <strong>Fév. 2026</strong> : Assouplissement des critères d'éligibilité (Swissmedic)<br>📜 <strong>Janv. 2025</strong> : Gratuité du don + interdiction de discrimination inscrites dans la LPTh<br>📊 <strong>2024</strong> : 260'349 dons en Suisse (−1.3%) — tendance baissière préoccupante<br>⚕️ <strong>Santé</strong> : aucune étude n'a montré d'effet néfaste du don régulier, mais attention à la carence en fer (martiale), surtout chez les femmes<br><br>🐝 BeeMyBlood veut devenir la <strong>première association de donneurs</strong> en Suisse — un rôle qui n'existe pas, contrairement à la France (FFDSB, 2'650 associations).<br><br><a href="#" onclick="go('actualites');return false" style="color:var(--gold)">Voir les actualités →</a>`},
  {keys:['bonjour','salut','hello','hey','coucou','yo'],r:`Salut ! 👋 Comment je peux t'aider ? Tu veux savoir sur ton éligibilité, les collectes à Genève, le casque VR, ou autre chose ? Je suis là pour toi ! 🐝`},
];

let chatApiAvailable=null; // null=unknown, true/false after first attempt

function findBestKBMatch(text){
  var tl=text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  var best=null,bestLen=0;
  for(var i=0;i<KB.length;i++){
    for(var j=0;j<KB[i].keys.length;j++){
      var kn=KB[i].keys[j].normalize('NFD').replace(/[\u0300-\u036f]/g,'');
      if(tl.includes(kn)&&kn.length>bestLen){bestLen=kn.length;best=KB[i];}
    }
  }
  return best;
}

function getLocalFallback(t){
  // Simple fallback — findBestKBMatch already tried by caller
  return `Bonne question ! 🤔 Pour une réponse précise, je te recommande :<br><br>📞 <strong>CTS HUG</strong> : +41 22 372 39 01<br>📧 Accueil.Donneurs@hug.ch<br>🌐 <a href="https://www.dondusang.ch" target="_blank" aria-describedby="ext-link-notice" style="color:var(--gold)">www.dondusang.ch</a><br>🆓 Numéro gratuit : 0800 148 148<br><br>Je peux aussi t'aider sur : ton groupe sanguin, l'éligibilité, les collectes, le casque VR, les médicaments, les voyages, la douleur, la durée, les donneurs rares... Essaie de reformuler ! 🐝`;
}

function delay(ms){return new Promise(r=>setTimeout(r,ms));}

function toggleBeeBot(){var p=document.getElementById('beebot-panel');p.classList.toggle('open');var o=p.classList.contains('open');document.body.classList.toggle('bmb-panel-open',o);if(o){var m=document.getElementById('beebot-msgs');if(m)m.scrollTop=m.scrollHeight;}}
async function sendBeeBot(){
  var inp=document.getElementById('beebot-in');var q=inp.value.trim();if(!q)return;inp.value='';
  var msgs=document.getElementById('beebot-msgs');
  msgs.innerHTML+='<div class="beebot-msg user">'+q+'</div>';
  msgs.scrollTop=msgs.scrollHeight;
  // Typing indicator
  var typEl=document.createElement('div');typEl.className='beebot-msg bot';typEl.innerHTML='<span style="opacity:.5">🐝 réflexion…</span>';
  msgs.appendChild(typEl);msgs.scrollTop=msgs.scrollHeight;
  // KB match (fallback only)
  var match=findBestKBMatch(q);
  // ALWAYS try API first — same body format as chatReply
  var apiOk=false;
  try{
    var resp=await fetch('api.php',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({message:q,history:[{role:'user',content:q}]})
    });
    if(!resp.ok) throw new Error('HTTP '+resp.status);
    var data=JSON.parse((await resp.text()).replace(/^[\s\S]*?(?=\{)/,''));
    if(data.reply){
      apiOk=true;
      typEl.remove();
      var reply=data.reply
        .replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>')
        .replace(/\n\n/g,'<br><br>')
        .replace(/\n/g,'<br>');
      msgs.innerHTML+='<div class="beebot-msg bot">'+reply+'</div>';
      msgs.scrollTop=msgs.scrollHeight;
      chatApiAvailable=true;
    } else {
      throw new Error(data.error||'empty reply');
    }
  }catch(e){
    console.warn('[BeeBot] API failed:',e.message||e);
    typEl.remove();
  }
  if(!apiOk){
    var answer=match?match.r:getLocalFallback(q);
    msgs.innerHTML+='<div class="beebot-msg bot">'+answer+'</div>';
    msgs.scrollTop=msgs.scrollHeight;
  }
}
function quickBot(q){document.getElementById('beebot-in').value=q;sendBeeBot();}

// ===== SQUAD FILTER =====

function openVideoFullscreen(vidId){
  const v=document.getElementById(vidId);
  if(!v)return;
  if(v.requestFullscreen)v.requestFullscreen();
  else if(v.webkitEnterFullscreen)v.webkitEnterFullscreen();
  else if(v.webkitRequestFullscreen)v.webkitRequestFullscreen();
  try{v.play();}catch(e){}
}
// Detect MP4 load errors and show fallback
function setupVideoFallback(vidId,fallbackId){
  const v=document.getElementById(vidId);
  const fb=document.getElementById(fallbackId);
  if(!v||!fb)return;
  const showFallback=()=>{v.style.display='none';fb.style.display='flex';};
  v.addEventListener('error',showFallback);
  const src=v.querySelector('source');
  if(src)src.addEventListener('error',showFallback);
  // Also check after timeout - if no data loaded
  setTimeout(()=>{
    if(v.networkState===3||v.readyState===0){showFallback();}
  },3000);
}

let obStep=0;
function showOnboard(){
  obStep=0;updateOb();
  var m=document.getElementById('onboard-modal');
  if(m){m.style.display='';m.classList.add('show');}
}
function closeOnboard(){
  var m=document.getElementById('onboard-modal');
  if(!m)return;
  m.classList.remove('show');
}
function nextOnboard(){
  obStep++;
  if(obStep>=10){closeOnboard();return;}
  updateOb();
}
function prevOnboard(){
  if(obStep>0)obStep--;
  updateOb();
}
function updateOb(){
  var maxStep=9;
  for(var i=0;i<=maxStep;i++){
    var el=document.getElementById('ob-step-'+i);
    if(el){el.classList.toggle('active',i===obStep);}
  }
  // Dots
  var dotsEl=document.getElementById('ob-dots');
  if(dotsEl){
    var html='';
    for(var i=0;i<=maxStep;i++){html+='<div class="modal-dot'+(i===obStep?' active':'')+'"></div>';}
    dotsEl.innerHTML=html;
  }
  // Counter
  var ctr=document.getElementById('ob-counter');
  if(ctr)ctr.textContent=(obStep+1)+' / '+(maxStep+1);
  // Buttons
  var skip=document.getElementById('ob-skip');
  var next=document.getElementById('ob-next');
  var prev=document.getElementById('ob-prev');
  if(skip)skip.style.display=obStep>=maxStep?'none':'';
  if(next)next.textContent=obStep>=maxStep?'C\'est parti ! 🐝':'Suivant →';
  if(prev)prev.style.display=obStep<=0?'none':'';
}
// Auto-show onboarding after gate is removed (or 2s if no gate)
(function(){
  function tryShow(){
    if(!document.getElementById('gate-overlay')){showOnboard();}
    else{setTimeout(tryShow,500);}
  }
  setTimeout(tryShow,800);
})();

var tourSteps=[
  {target:'[data-v="hero"]',title:'🏠 Accueil',desc:'Page d\'accueil avec tes stats, l\'actualité du don et un accès rapide à toutes les fonctionnalités.'},
  {target:'[data-v="dashboard"]',title:'📊 Dashboard',desc:'Ton tableau de bord personnel : prochain don, stocks, historique, objectifs.'},
  {target:'[data-v="eligibilite"]',title:'✅ Éligibilité',desc:'Test rapide en 8 questions pour savoir si tu peux donner. Puis questionnaire médical HUG complet avec génération PDF.'},
  {target:'[data-v="collectes"]',title:'📍 Collectes',desc:'Carte interactive avec tous les centres CRS de Suisse. Rayon de recherche et détection GPS.'},
  {target:'[data-v="flux"]',title:'🔬 Flux CTS',desc:'Visualisation en temps réel de l\'activité du Centre de Transfusion Sanguine des HUG.'},
  {target:'[data-v="hemorush"]',title:'🎮 HémoRush™',desc:'Mini-jeu éducatif sur la compatibilité sanguine. Apprends en jouant !'},
  {target:'[data-v="chatbot"]',title:'🐝 BeeBot™',desc:'Assistant IA qui répond à toutes tes questions sur le don de sang 24/7.'},
  {target:'[data-v="settings"]',title:'⚙️ Paramètres',desc:'Intégrations (Concerto HUG, Google Agenda, compte Transfusion Croix-Rouge Suisse), apparence, notifications et confidentialité.'}
];
var tourIdx=-1;
function startTour(){showOnboard();}
function endTour(){tourIdx=-1;var ov=document.getElementById('tour-ov');if(ov)ov.remove();var tt=document.getElementById('tour-tt');if(tt)tt.remove();}
function showTourStep(){
  if(tourIdx<0||tourIdx>=tourSteps.length){endTour();return;}
  var step=tourSteps[tourIdx];
  var el=document.querySelector(step.target);
  var hasEl=el&&el.offsetWidth>0&&el.offsetHeight>0;
  var r=hasEl?el.getBoundingClientRect():{top:60,left:window.innerWidth/2-100,width:200,height:36,bottom:96};
  // Overlay
  var ov=document.getElementById('tour-ov');
  if(!ov){ov=document.createElement('div');ov.id='tour-ov';ov.className='tour-overlay';document.body.appendChild(ov);}
  if(hasEl){ov.innerHTML='<div class="tour-highlight" style="top:'+(r.top-4)+'px;left:'+(r.left-4)+'px;width:'+(r.width+8)+'px;height:'+(r.height+8)+'px"></div>';}
  else{ov.innerHTML='<div style="position:fixed;inset:0;background:rgba(0,0,0,.55);pointer-events:none"></div>';}
  // Tooltip
  var tt=document.getElementById('tour-tt');
  if(!tt){tt=document.createElement('div');tt.id='tour-tt';tt.className='tour-tooltip';document.body.appendChild(tt);}
  var n=tourIdx+1,tot=tourSteps.length;
  var dots='<div class="tour-step-dots">'+tourSteps.map(function(_,i){return '<span class="'+(i===tourIdx?'active':'')+'"></span>';}).join('')+'</div>';
  tt.innerHTML=dots+'<h4>'+step.title+'</h4><p>'+step.desc+'</p><div style="font-size:11px;color:var(--text-muted);margin-bottom:8px">'+n+' / '+tot+'</div><div class="tour-btns">'+(tourIdx>0?'<button class="btn btn-outline btn-sm" onclick="tourIdx--;showTourStep()">←</button>':'')+'<button class="btn btn-outline btn-sm" onclick="endTour()">Fermer</button>'+(tourIdx<tourSteps.length-1?'<button class="btn btn-gold btn-sm" onclick="tourIdx++;showTourStep()">Suivant →</button>':'<button class="btn btn-gold btn-sm" onclick="endTour()">C\'est parti ! 🚀</button>')+'</div>';
  var ttTop=hasEl?Math.min(r.bottom+12,window.innerHeight-240):Math.max(100,(window.innerHeight-200)/2);
  var ttLeft=hasEl?Math.max(12,Math.min(r.left,window.innerWidth-360)):Math.max(12,(window.innerWidth-Math.min(340,window.innerWidth-24))/2);
  tt.style.top=ttTop+'px';tt.style.left=ttLeft+'px';tt.style.maxWidth=Math.min(340,window.innerWidth-24)+'px';
}

function setTheme(t){
  if(t==='light'){document.body.classList.add('light-mode');try{document.getElementById('theme-light-btn').style.border='2px solid var(--gold)';document.getElementById('theme-dark-btn').style.border='1px solid var(--dark-border)';}catch(e){}}
  else{document.body.classList.remove('light-mode');try{document.getElementById('theme-dark-btn').style.border='2px solid var(--gold)';document.getElementById('theme-light-btn').style.border='1px solid var(--dark-border)';}catch(e){}}
  // Swap map tiles
  if(window._mapTileLayer&&map){try{var mc=document.getElementById('mapid');if(mc){mc.classList.toggle('map-dark',t!=='light');mc.style.background=t==='light'?'#e8e8e8':'#1a1a2e';}}catch(e){}}
  // Force repaint of Flux area
  var fw=document.getElementById('flux-wrap');if(fw){fw.style.display='none';void fw.offsetHeight;fw.style.display='';}
  try{localStorage.setItem('bmb-theme',t);}catch(e){}
}
try{if(localStorage.getItem('bmb-theme')==='light')setTheme('light');}catch(e){}

var bcNames={'hero':'Accueil','dashboard':'Dashboard','communaute':'Défis','actualites':'Actualités','flux':'Flux CTS','guide':'Guide du don','eligibilite':'Pré-éligibilité','hemorush':'HémoRush™','collectes':'Collectes','impact':'Impact','chatbot':'BeeBot™','vr':'Réalité virtuelle','videos':'Vidéos','faq':'FAQ','settings':'Paramètres','contact':'Contact','profil':'Profil'};
function updateBreadcrumb(id){
  var bar=document.getElementById('breadcrumb-bar');
  var cur=document.getElementById('bc-current');
  if(!bar||!cur)return;
  if(window.innerWidth<800||id==='hero'){bar.style.display='none';return;}
  bar.style.display='block';
  cur.textContent=bcNames[id]||id;
}

(function(){
  const btn=document.createElement('div');btn.className='scroll-top';btn.textContent='↑';
  btn.onclick=()=>window.scrollTo({top:0,behavior:'smooth'});
  document.body.appendChild(btn);
  window.addEventListener('scroll',()=>{btn.classList.toggle('show',window.scrollY>300);});
})();

document.addEventListener('keydown',(e)=>{
  if(e.target.tagName==='INPUT'||e.target.tagName==='TEXTAREA')return;
  const map={d:'dashboard',g:'guide',h:'hemorush',e:'eligibilite',c:'collectes',b:'chatbot',v:'vr',p:'profil',f:'flux',m:'videos',i:'impact'};
  if(map[e.key]){e.preventDefault();go(map[e.key]);}
  if(e.key==='Escape'){closeOnboard();}
  if(e.key==='?'){
    const hint=document.getElementById('kbd-hint');
    if(hint){hint.classList.toggle('show');}
  }
});

const _isWE=(function(){var d=new Date(),day=d.getDay(),sun=day===0,sat=day===6,sw=Math.ceil(d.getDate()/7),ctsSat=sat&&(sw===1||sw===3);return sun||(sat&&!ctsSat);})();
const TOASTS=_isWE?[
  ['🏥','1 CE O+ transfusé aux Urgences adultes — garde de nuit'],
  ['🤰','2 CE envoyés en Maternité — accouchement en cours'],
  ['🩸','Stock O- : 9 poches — surveillance continue ce week-end'],
  ['💜','1 CP attribué en oncologie — expiration imminente'],
  ['⏰','CTS fermé — réouverture lundi 7h30'],
  ['🏥','1 CE O- délivré aux Soins Intensifs — urgence vitale'],
  ['🧊','Stocks maintenus par l\'équipe de garde ce dimanche'],
  ['💚','Amine, ton don du 14 janv. a sauvé une vie aux urgences'],
]:[
  ['🩸','Stock O- critique aux HUG — 8 poches restantes'],
  ['💛','Don #14823 validé — PFC AB+ envoyé aux Soins Intensifs'],
  ['🏥','3 CE transfusés en chirurgie cardiaque ce matin'],
  ['💜','Alerte plaquettes : 2 CP expirent demain — attribution prioritaire'],
  ['🎪','Collecte mobile demain à Uni Dufour — 40 places dispo'],
  ['🧬','Nouveau donneur rare Duffy négatif identifié à Lausanne'],
  ['✅','RAI négatif confirmé — lot CE #4472 libéré pour distribution'],
  ['🏆','L\'escouade « Sang-froid 🧊 » dépasse les 50 dons !'],
  ['🩸','Convocation urgente O- envoyée à 12 donneurs'],
  ['💚','Amine, ton don du 14 janv. a été transfusé avec succès'],
];
let toastIdx=0;
function showLiveToast(){
  const el=document.getElementById('live-toast');if(!el)return;
  if(document.body.classList.contains('bmb-public'))return; // messages fictifs : réservés aux testeurs invités
  const t=TOASTS[toastIdx%TOASTS.length];toastIdx++;
  document.getElementById('lt-icon').textContent=t[0];
  document.getElementById('lt-text').textContent=t[1];
  el.classList.add('show');
  setTimeout(()=>el.classList.remove('show'),4500);
}
// First toast after 8s, then every 25-40s
var _twe=(function(){var d=new Date(),day=d.getDay(),sun=day===0,sat=day===6,sw=Math.ceil(d.getDate()/7),ctsSat=sat&&(sw===1||sw===3);return sun||(sat&&!ctsSat);})();
setTimeout(showLiveToast,_twe?60000:45000);
setInterval(()=>showLiveToast(),_twe?(360000+Math.random()*300000):(300000+Math.random()*180000));

function initScrollReveal(){
  const obs=new IntersectionObserver((entries)=>{
    entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('visible');obs.unobserve(e.target);}});
  },{threshold:0.1,rootMargin:'0px 0px -40px 0px'});
  // Apply to all views EXCEPT the currently active hero
  document.querySelectorAll('.view:not(.active) .card, .view:not(.active) .acc-toggle, .view:not(.active) .dash-welcome, .view:not(.active) .social-post').forEach((el,i)=>{
    el.classList.add('reveal');
    el.style.transitionDelay=Math.min(i%5,4)*50+'ms';
    obs.observe(el);
  });
}

const origGo=go;
go=function(id){
  origGo(id);
  setTimeout(()=>{
    const view=document.getElementById('v-'+id);
    if(!view)return;
    // Stagger reveal on new views
    view.querySelectorAll('.reveal:not(.visible)').forEach((el,i)=>{
      setTimeout(()=>el.classList.add('visible'),i*60);
    });
    // Also reveal non-tagged elements
    view.querySelectorAll('.card:not(.reveal), .acc-toggle:not(.reveal), .dash-welcome:not(.reveal)').forEach(el=>{
      el.classList.add('reveal','visible');
    });
  },50);
  if(id==='dashboard')setTimeout(animateCountdownRing,300);
};
setTimeout(initScrollReveal,500);

const AR_POINTS=[
  // Romandie
  {name:'CTS HUG Genève',lat:46.1926,lng:6.1492},
  {name:'CTS CHUV Lausanne',lat:46.5255,lng:6.6416},
  {name:'Centre Transfusion Épalinges',lat:46.5350,lng:6.6670},
  {name:'CTS Hôpital de Sion',lat:46.2865,lng:7.3607},
  {name:'CTS HFR Fribourg',lat:46.8024,lng:7.1578},
  {name:'CTS HNE Neuchâtel',lat:46.9941,lng:6.9445},
  {name:'CTS Hôpital du Jura — Delémont',lat:47.3657,lng:7.3477},
  // Bern & Mittelland
  {name:'Blutspendedienst Bern (Inselspital)',lat:46.9473,lng:7.4253},
  {name:'CTS Bienne/Biel',lat:47.1384,lng:7.2468},
  // Nordwestschweiz
  {name:'Blutspendezentrum Basel (USB)',lat:47.5624,lng:7.5888},
  {name:'CTS Aarau (KSA)',lat:47.3898,lng:8.0514},
  // Zürich & Ostschweiz
  {name:'Blutspendedienst Zürich (USZ)',lat:47.3769,lng:8.5485},
  {name:'Blutspendedienst Winterthur (KSW)',lat:47.4998,lng:8.7243},
  {name:'CTS St-Gall (KSSG)',lat:47.4279,lng:9.3797},
  {name:'CTS Chur (KSGR)',lat:46.8544,lng:9.5311},
  // Zentralschweiz
  {name:'Blutspendedienst Luzern (LUKS)',lat:47.0586,lng:8.3022},
  // Ticino
  {name:'Servizio Trasfusionale Lugano (EOC)',lat:46.0065,lng:8.9485},
  {name:'CTS Bellinzona (IOSI)',lat:46.1946,lng:9.0241}
];
function haversineM(a,b){const R=6371000,dLat=(b.lat-a.lat)*Math.PI/180,dLng=(b.lng-a.lng)*Math.PI/180,x=Math.sin(dLat/2)**2+Math.cos(a.lat*Math.PI/180)*Math.cos(b.lat*Math.PI/180)*Math.sin(dLng/2)**2;return R*2*Math.atan2(Math.sqrt(x),Math.sqrt(1-x));}
function updateARPosition(){
  if(!navigator.geolocation)return;
  navigator.geolocation.getCurrentPosition(function(pos){
    const me={lat:pos.coords.latitude,lng:pos.coords.longitude};
    // Find 2 nearest CTS
    const ranked=AR_POINTS.map(p=>({...p,d:haversineM(me,p)})).sort((a,b)=>a.d-b.d);
    const best=ranked[0];
    const second=ranked[1];
    const el=document.getElementById('ar-pos-text');
    const btn=document.getElementById('ar-go-btn');
    if(el&&best){
      const dStr=best.d<1000?Math.round(best.d)+'m':(best.d/1000).toFixed(1)+'km';
      const d2=second.d<1000?Math.round(second.d)+'m':(second.d/1000).toFixed(1)+'km';
      el.innerHTML='<strong>'+best.name+'</strong> — '+dStr+'<br><span style="font-size:11px;color:var(--text-muted)">Aussi : '+second.name+' ('+d2+')</span>';
      el.style.color=best.d<2000?'var(--green)':best.d<10000?'var(--gold)':'var(--text-dim)';
      if(btn)btn.textContent='📱 Activer le guidage AR → '+best.name+' ('+dStr+')';
    }
  },function(){
    const el=document.getElementById('ar-pos-text');
    if(el){el.textContent='Position non disponible';el.style.color='var(--text-muted)';}
  },{enableHighAccuracy:false,timeout:8000,maximumAge:300000});
}

var BMB_DONNEES=null;
function bmbEsc(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;'); }
function bmbAfficherStock(code){
  if(!BMB_DONNEES) return;
  var r=BMB_DONNEES.stocks.filter(function(s){return s.code===code;})[0]; if(!r) return;
  var lbl=document.getElementById('stock-canton-label'); if(lbl) lbl.textContent='🩸 '+r.label+(r.date?' · '+r.date:'');
  var map={eleve:'good',normal:'ok',bas:'low',critique:'crit',inconnu:'low'};
  var rows=r.groupes.map(function(g){ var s=map[g.niveau]||'low'; var col=g.niveau==='inconnu'?'var(--text-muted)':STOCK_COLORS[s];
    return '<div class="stock-row"><span class="stock-grp" style="color:'+col+'">'+g.groupe+'</span><div class="stock-bar-bg"><div class="stock-bar bar-'+s+'" style="width:'+g.taux+'%"></div></div><span class="stock-lbl" style="color:'+col+'">'+g.libelle+'</span></div>'; }).join('');
  var el=document.getElementById('stock-canton-rows'); if(el) el.innerHTML=rows;
  var ex=document.getElementById('stock-canton-extra'); if(ex) ex.innerHTML='';
  var src=document.getElementById('stock-source'); if(src) src.innerHTML='Source : baromètre officiel de Transfusion CRS Suisse (blutspende.ch), mis à jour quotidiennement · Élevé, Normal, Bas, Critique. <a href="https://www.blutspende.ch/fr" target="_blank" aria-describedby="ext-link-notice" rel="noopener" style="color:var(--gold)">Voir le baromètre</a>';
}
function bmbRenderDonnees(d){
  BMB_DONNEES=d;
  // stocks : boutons par région
  var btns=document.getElementById('canton-btns');
  if(btns){
    if(d.stocks&&d.stocks.length){
      btns.innerHTML=d.stocks.map(function(s,i){ return '<button class="canton-btn'+(i===0?' active':'')+'" data-institut="'+s.code+'" onclick="selectCanton(this)">'+bmbEsc(s.court)+'</button>'; }).join('');
      bmbAfficherStock(d.stocks[0].code);
      var crit=(d.stocks[0].groupes||[]).filter(function(g){return g.niveau==='critique';}).map(function(g){return g.groupe;});
      var lt=document.getElementById('live-toast'); if(lt&&crit.length){ lt.classList.remove('alpha-only'); document.getElementById('lt-icon').textContent='🩸'; document.getElementById('lt-text').textContent='Stock '+crit.join(', ')+' critique — '+d.stocks[0].label+' (baromètre officiel)'; setTimeout(function(){ lt.classList.add('show'); setTimeout(function(){ lt.classList.remove('show'); },7000); },3000); }
    } else {
      btns.innerHTML='<span style="font-size:12px;color:var(--text-muted)">Baromètre officiel indisponible pour le moment · <a href="https://www.blutspende.ch/fr" target="_blank" aria-describedby="ext-link-notice" rel="noopener" style="color:var(--gold)">le consulter sur blutspende.ch</a></span>';
      var rows=document.getElementById('stock-canton-rows'); if(rows) rows.innerHTML='';
    }
  }
  // actualités : carrousel de l'accueil + liste dans la vue Actualités
  var feed=document.getElementById('newsFeed'), dotsWrap=document.querySelector('.news-dot')&&document.querySelector('.news-dot').parentElement;
  var actus=(d.actualites||[]).slice(0,8);
  if(feed){
    if(actus.length){
      feed.innerHTML=actus.slice(0,5).map(function(a){ return '<div class="news-slide" style="min-width:100%;padding:16px;border:1px solid rgba(230,57,70,.15);border-radius:var(--radius)"><div style="font-size:11px;color:var(--text-muted);margin-bottom:6px">📰 '+bmbEsc(a.source)+' · '+bmbEsc(a.date)+'</div><div style="font-size:15px;font-weight:700;color:var(--text);line-height:1.4;margin-bottom:8px">'+bmbEsc(a.titre)+'</div><a href="'+bmbEsc(a.url)+'" target="_blank" aria-describedby="ext-link-notice" rel="noopener" style="color:var(--gold);font-size:12px;font-weight:600">Lire l’article →</a></div>'; }).join('');
      newsTotal=Math.min(5,actus.length); newsIdx=0; feed.style.transform='translateX(0)';
      if(dotsWrap) dotsWrap.innerHTML=actus.slice(0,5).map(function(_,i){ return '<span class="news-dot'+(i===0?' active':'')+'" onclick="goNewsSlide('+i+')"></span>'; }).join('');
    } else {
      feed.innerHTML='<div class="news-slide" style="min-width:100%;padding:16px;border:1px solid rgba(230,57,70,.15);border-radius:var(--radius);text-align:center;font-size:13px;color:var(--text-muted)">Actualités indisponibles pour le moment. <a href="https://www.blutspende.ch/fr" target="_blank" aria-describedby="ext-link-notice" rel="noopener" style="color:var(--gold)">Transfusion CRS Suisse</a></div>';
      newsTotal=1; if(dotsWrap) dotsWrap.innerHTML='';
    }
  }
  var liste=document.getElementById('actus-jour-liste');
  if(liste){
    liste.innerHTML=actus.length ? actus.map(function(a){ return '<div style="display:flex;gap:10px;padding:8px 0;border-bottom:1px solid var(--dark-border)"><div style="min-width:74px;font-family:var(--font-mono);font-size:11px;color:var(--gold);padding-top:2px">'+bmbEsc(a.date)+'</div><div style="flex:1"><a href="'+bmbEsc(a.url)+'" target="_blank" aria-describedby="ext-link-notice" rel="noopener" style="color:var(--text);font-weight:600;font-size:13px;line-height:1.4">'+bmbEsc(a.titre)+'</a><div style="font-size:11px;color:var(--text-muted)">'+bmbEsc(a.source)+'</div></div></div>'; }).join('')+'<div style="font-size:11px;color:var(--text-muted);margin-top:8px">Sélection automatique (Google Actualités, Suisse, français), actualisée chaque jour. Les titres sont ceux des médias.</div>'
      : 'Actualités indisponibles pour le moment.';
    var dd=document.getElementById('actus-jour-date'); if(dd&&d.maj) dd.textContent=new Date(d.maj).toLocaleDateString('fr-CH');
  }
  // collectes : Genève en liste (calendrier HUG lu chaque jour), autres régions vers leur calendrier officiel
  var REGIONS_COLL=[
    {id:'geneve',label:'Genève',liste:true},
    {id:'VD',label:'Vaud'},{id:'VS',label:'Valais'},{id:'BE',label:'Berne'},{id:'FR',label:'Fribourg'},{id:'NE',label:'Neuchâtel'},{id:'JU',label:'Jura'},
    {id:'ch',label:'Ailleurs en Suisse',url:'https://www.blutspende.ch/fr/dates-de-collecte-de-sang',org:'Transfusion CRS Suisse (recherche par localité)'}
  ];
  var CANTONS_DATA=(d.collectes&&d.collectes.cantons)||{};
  // Réservation réelle : redirection vers l'outil officiel du centre, avec comptage anonyme du clic (aucune donnée personnelle)
  window.bmbReserver=function(url, ref, region){
    try { var sb = window.BeeAcces && window.BeeAcces.client && window.BeeAcces.client(); if(sb) sb.rpc('cd_evenement', { p:{ region:region||'geneve', type:'clic_reservation', ref:String(ref||url||'').slice(0,200) } }).then(function(){}, function(){}); } catch(e){}
    return true;
  };
  function bmbReserverBtn(url, ref, region){ if(!url) return ''; return '<a href="'+bmbEsc(url)+'" target="_blank" aria-describedby="ext-link-notice" rel="noopener" onclick="bmbReserver(this.href,'+JSON.stringify(String(ref||'')).replace(/"/g,'&quot;')+','+JSON.stringify(String(region||'geneve')).replace(/"/g,'&quot;')+')" style="flex:none;align-self:center;background:linear-gradient(135deg,var(--gold),#B89730);color:#0a0a12;border-radius:8px;padding:5px 10px;font-size:12px;font-weight:700;text-decoration:none;white-space:nowrap">Réserver</a>'; }
  // Fichier d'agenda (.ics) pour une collecte : date ISO, horaire « 13h30 – 19h30 », lieu, lien officiel
  window.bmbIcs=function(titre, dateIso, horaire, lieu, url){
    var m=(horaire||'').match(/(\d{1,2})h(\d{2})?\D+(\d{1,2})h(\d{2})?/), d=(dateIso||'').replace(/-/g,'');
    if(!d){ return; }
    var deb=m? m[1].padStart(2,'0')+(m[2]||'00')+'00' : '080000', fin=m? m[3].padStart(2,'0')+(m[4]||'00')+'00' : '180000';
    var esc=function(s){ return String(s||'').replace(/\\/g,'\\\\').replace(/;/g,'\\;').replace(/,/g,'\\,').replace(/\r?\n/g,'\\n'); };
    var ics=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//BeeMyBlood//Collectes//FR','BEGIN:VEVENT','UID:bmb-'+d+'-'+Math.random().toString(36).slice(2,8)+'@beemyblood.ch','DTSTAMP:'+new Date().toISOString().replace(/[-:]/g,'').slice(0,15)+'Z','DTSTART;TZID=Europe/Zurich:'+d+'T'+deb,'DTEND;TZID=Europe/Zurich:'+d+'T'+fin,'SUMMARY:'+esc('Don de sang · '+titre),'LOCATION:'+esc(lieu),'DESCRIPTION:'+esc('Collecte mobile. Détails et réservation : '+(url||'')+' — Rappel : mangez et buvez avant, apportez une pièce d’identité.'),'URL:'+(url||''),'BEGIN:VALARM','TRIGGER:-P1D','ACTION:DISPLAY','DESCRIPTION:'+esc('Demain : don de sang à '+lieu),'END:VALARM','END:VEVENT','END:VCALENDAR'].join('\r\n');
    var b=new Blob([ics],{type:'text/calendar;charset=utf-8'}), a=document.createElement('a'); a.href=URL.createObjectURL(b); a.download='don-de-sang-'+d+'.ics'; document.body.appendChild(a); a.click(); setTimeout(function(){ URL.revokeObjectURL(a.href); a.remove(); },500);
  };
  function bmbIcsBtn(titre, dateIso, horaire, lieu, url){ if(!dateIso) return ''; var arg=[titre,dateIso,horaire,lieu,url].map(function(v){ return "'"+String(v||'').replace(/\\/g,'\\\\').replace(/'/g,"\\'").replace(/</g,'')+"'"; }).join(','); return '<button type="button" onclick="bmbIcs('+arg.replace(/"/g,'&quot;')+')" title="Ajouter à mon agenda" style="flex:none;align-self:center;margin-left:6px;background:none;border:1px solid var(--dark-border);color:var(--gold);border-radius:8px;padding:4px 8px;font-size:12px;cursor:pointer">📅</button>'; }
  function bmbCantonHtml(code){
    var c=CANTONS_DATA[code]; if(!c||!c.items||!c.items.length) return '<div style="padding:6px 0">Aucune date publiée pour ce canton en ce moment. <a href="https://www.blutspende.ch/fr/dates-de-collecte-de-sang" target="_blank" aria-describedby="ext-link-notice" rel="noopener" style="color:var(--gold)">Recherche officielle</a></div>';
    return '<div style="font-size:12px;color:var(--text-muted);margin-bottom:4px">'+bmbEsc(c.nom)+' — dates publiées par Transfusion CRS Suisse (collectes mobiles d’abord, puis rendez-vous en centre)</div>'
      + c.items.map(function(x){ return '<div style="display:flex;gap:10px;padding:8px 0;border-bottom:1px solid var(--dark-border)"><div style="min-width:104px;font-family:var(--font-mono);font-size:12px;color:var(--gold);font-weight:700">'+bmbEsc((x.jour?x.jour+' ':'')+(x.date||''))+'</div><div style="flex:1"><a href="'+bmbEsc(x.url||'https://www.blutspende.ch/fr/dates-de-collecte-de-sang')+'" target="_blank" aria-describedby="ext-link-notice" rel="noopener" style="color:var(--text);font-weight:600;font-size:13px">'+(x.mobile?'🚌 ':'🏥 ')+bmbEsc(x.localite||'')+'</a><div style="font-size:12px;color:var(--text-muted)">'+bmbEsc([x.lieu,x.horaire].filter(Boolean).join(' · '))+(x.type&&x.type!=='Don de sang'?' · '+bmbEsc(x.type):'')+'</div></div>'+bmbReserverBtn(x.url||'https://www.blutspende.ch/fr/dates-de-collecte-de-sang', (x.date_iso||'')+' '+(x.localite||''), (x.canton||code||'').toLowerCase()==='ge'?'geneve':(x.canton||code||'').toLowerCase())+bmbIcsBtn((x.lieu||x.localite||'Collecte'), x.date_iso, x.horaire, [x.lieu,x.localite].filter(Boolean).join(', '), x.url)+'</div>'; }).join('')
      + '<div style="font-size:11px;color:var(--text-muted);margin-top:8px">Source : Transfusion CRS Suisse (blutspende.ch), actualisé chaque jour · <a href="'+bmbEsc(c.url)+'" target="_blank" aria-describedby="ext-link-notice" rel="noopener" style="color:var(--gold)">toutes les dates et réservation</a></div>';
  }
  window.bmbCollectesRegion=function(id){
    var r=REGIONS_COLL.filter(function(x){return x.id===id;})[0]||REGIONS_COLL[0];
    document.querySelectorAll('#collectes-regions button').forEach(function(b){ b.classList.toggle('active', b.dataset.region===r.id); });
    var cl2=document.getElementById('collectes-hug-liste'); if(!cl2) return;
    if(r.liste){ cl2.innerHTML=window.bmbCollectesGeneveHtml||''; return; }
    if(CANTONS_DATA[r.id]!==undefined || /^[A-Z]{2}$/.test(r.id)){ cl2.innerHTML=bmbCantonHtml(r.id); return; }
    cl2.innerHTML='<div style="padding:6px 0">Pour '+bmbEsc(r.label)+', les dates de collecte sont publiées par '+bmbEsc(r.org)+'. Nous ne les reprenons pas encore automatiquement.</div><a href="'+bmbEsc(r.url)+'" target="_blank" aria-describedby="ext-link-notice" rel="noopener" class="btn btn-outline btn-sm" style="margin-top:6px">📅 Voir le calendrier officiel →</a>';
  };
  var rg=document.getElementById('collectes-regions');
  if(rg) rg.innerHTML=REGIONS_COLL.map(function(r,i){ return '<button class="canton-btn'+(i===0?' active':'')+'" data-region="'+r.id+'" onclick="bmbCollectesRegion(\''+r.id+'\')">'+bmbEsc(r.label)+'</button>'; }).join('');
  var cl=document.getElementById('collectes-hug-liste');
  if(cl){
    var cs=(d.collectes&&d.collectes.geneve)||[];
    window.bmbCollectesGeneveHtml=(cs.length ? '<div style="font-size:12px;color:var(--text-muted);margin-bottom:4px">Genève — calendrier du CTS des HUG</div>'+cs.map(function(c){ return '<div style="display:flex;gap:10px;padding:8px 0;border-bottom:1px solid var(--dark-border)"><div style="min-width:86px;font-family:var(--font-mono);font-size:12px;color:var(--gold);font-weight:700">'+bmbEsc(c.date||'')+'</div><div style="flex:1"><a href="'+bmbEsc(c.url||'#')+'" target="_blank" aria-describedby="ext-link-notice" rel="noopener" style="color:var(--text);font-weight:600;font-size:13px">'+bmbEsc(c.titre)+'</a><div style="font-size:12px;color:var(--text-muted)">'+bmbEsc([c.adresse,(c.npa||'')+' '+(c.localite||'')].filter(Boolean).join(', '))+(c.debut?' · '+bmbEsc(c.debut)+(c.fin?'–'+bmbEsc(c.fin):''):'')+'</div></div>'+bmbReserverBtn(c.url, (c.date_iso||'')+' '+(c.localite||''), 'geneve')+bmbIcsBtn(c.titre, c.date_iso, (c.debut||'')+' – '+(c.fin||''), [c.adresse,(c.npa||'')+' '+(c.localite||'')].filter(Boolean).join(', '), c.url)+'</div>'; }).join('') : '<div>Aucune collecte annoncée par les HUG pour le moment.</div>')
      +'<div style="font-size:11px;color:var(--text-muted);margin-top:8px">Source : calendrier officiel du CTS des HUG, actualisé chaque jour.</div>';
    cl.innerHTML=window.bmbCollectesGeneveHtml;
    var cm=document.getElementById('collectes-hug-maj'); if(cm&&d.maj) cm.textContent='màj '+new Date(d.maj).toLocaleDateString('fr-CH');
  }
}
function bmbChargerDonnees(){
  fetch('../api/donnees.php',{cache:'no-store'}).then(function(r){ if(!r.ok) throw new Error('http '+r.status); return r.json(); })
    .then(bmbRenderDonnees)
    .catch(function(){ bmbRenderDonnees({stocks:[],actualites:[],collectes:{geneve:[]}}); });
}
document.addEventListener('DOMContentLoaded', bmbChargerDonnees);

document.addEventListener("keydown",function(e){if(e.key==="F11"){e.preventDefault();if(document.fullscreenElement){document.exitFullscreen().catch(function(){});}else{document.documentElement.requestFullscreen().catch(function(){});}}});
