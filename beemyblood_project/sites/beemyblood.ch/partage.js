/*
 * BeeMyBlood — Partage de l’état des stocks de sang sur les réseaux
 * Lit le baromètre officiel (api/donnees.php), compose un message d’appel au don et une image, puis propose les réseaux.
 * Usage : BeePartage.stocks({ code:'geneve', ton:'donneur' | 'pro', donnees: <réponse de donnees.php, facultatif> })
 * Inclure : <script src="partage.js" defer></script> (chemin relatif à la page)
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */
(function(){
  'use strict';
  var SITE = 'https://www.beemyblood.ch';
  function urlPartage(r){ return SITE + '/stocks/' + (r && r.code && r.code !== 'geneve' ? '?r=' + r.code : ''); }
  var NIV = {
    critique:{ l:'Critique', c:'#E5484D', signe:'!!' },
    bas:     { l:'Bas',      c:'#F2A93B', signe:'!'  },
    normal:  { l:'Normal',   c:'#3B9BE8', signe:''   },
    eleve:   { l:'Élevé',    c:'#8FD0FF', signe:''   },
    inconnu: { l:'Non communiqué', c:'#8a8a99', signe:'' }
  };
  var cache = null;
  function esc(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;'); }
  function charger(){
    if(cache) return Promise.resolve(cache);
    return fetch('/api/donnees.php',{cache:'no-store'}).then(function(r){ if(!r.ok) throw new Error('http '+r.status); return r.text(); })
      .then(function(t){ cache = JSON.parse(t.replace(/^[\s\S]*?(?=\{)/,'')); return cache; });
  }
  function region(d, code){
    var s = (d && d.stocks) || []; if(!s.length) return null;
    return s.filter(function(x){ return x.code===code; })[0] || s[0];
  }
  function lieu(r){ return r.code==='geneve' ? 'Genève' : r.code==='gesamt' ? 'Suisse' : (r.court||r.label||''); }
  function liste(r, niveau){ return (r.groupes||[]).filter(function(g){ return g.niveau===niveau; }).map(function(g){ return g.groupe; }); }
  function dateFr(r){ var d = r.date || new Date().toLocaleDateString('fr-CH'); return d; }

  // ---------- Message ----------
  function texte(r, ton, court){
    var crit = liste(r,'critique'), bas = liste(r,'bas'), ou = lieu(r), ge = r.code==='geneve';
    var etat = crit.length ? 'Niveau critique : '+crit.join(', ')+'.'+(bas.length?' Niveau bas : '+bas.join(', ')+'.':'')
             : bas.length ? 'Niveau bas : '+bas.join(', ')+'.'
             : 'Tous les groupes sont à un niveau normal ou élevé aujourd’hui.';
    var besoin = ge ? 'Genève a besoin de donneurs réguliers, et de 10 donneurs de plus chaque jour.'
                    : 'Les stocks tiennent grâce aux donneurs réguliers.';
    if(court){
      return 'Sang '+(ge?'à Genève':'· '+ou)+' : '+(crit.length?crit.join(', ')+' critique'+(crit.length>1?'s':'')+'.':bas.length?bas.join(', ')+' bas.':'stocks corrects.')+' '
        +(ge?'Il faut 10 donneurs de plus par jour.':'Les donneurs réguliers font la différence.')+' Puis-je donner ? Réponse en 2 minutes : '+urlPartage(r)+' #DonDuSang';
    }
    var appel = ton==='pro'
      ? 'Nous avons besoin de vous. Un don prend 45 minutes et peut aider jusqu’à trois personnes. Vérifiez en deux minutes si vous pouvez donner et trouvez une collecte près de chez vous : '+urlPartage(r)
      : 'Un don prend 45 minutes et peut aider jusqu’à trois personnes. En deux minutes, vérifiez si vous pouvez donner et trouvez une collecte près de chez vous : '+urlPartage(r);
    return 'Stocks de sang '+(ge?'à Genève':'· '+ou)+', '+dateFr(r)+'\n'+etat+'\n\n'+besoin+'\n'+appel+'\n\n'
      +'Source : baromètre officiel de Transfusion CRS Suisse. Partagé depuis BeeMyBlood, qui relie donneurs, patients et centres de transfusion.\n#DonDuSang '+(ge?'#Genève ':'')+'#BeeMyBlood';
  }

  // ---------- Image (1080 × 1350) ----------
  function image(r){
    var W=1080, H=1350, c=document.createElement('canvas'); c.width=W; c.height=H; var x=c.getContext('2d');
    var serif='"Playfair Display", Georgia, serif', sans='"DM Sans", "Segoe UI", Arial, sans-serif';
    x.fillStyle='#12121e'; x.fillRect(0,0,W,H);
    var g=x.createRadialGradient(W*0.8,0,20,W*0.8,0,900); g.addColorStop(0,'rgba(200,169,96,.22)'); g.addColorStop(1,'rgba(200,169,96,0)'); x.fillStyle=g; x.fillRect(0,0,W,H);
    x.textBaseline='alphabetic';
    x.fillStyle='#E8D5A3'; x.font='700 46px '+serif; x.fillText('BeeMyBlood', 70, 100);
    x.fillStyle='#8b8b9e'; x.font='500 28px '+sans; x.textAlign='right'; x.fillText(dateFr(r), W-70, 98); x.textAlign='left';
    x.fillStyle='#f0ece2'; x.font='700 84px '+serif; x.fillText('Stocks de sang', 70, 215);
    x.fillStyle='#C8A960'; x.font='700 60px '+serif; x.fillText(lieu(r), 70, 290);
    var y=345, hL=88, gs=(r.groupes||[]).slice(0,8);
    gs.forEach(function(gr){
      var n=NIV[gr.niveau]||NIV.inconnu, taux=Math.max(6, Math.min(100, +gr.taux||0));
      x.fillStyle='#f0ece2'; x.font='700 50px '+sans; x.fillText(gr.groupe, 70, y+52);
      x.fillStyle='#26263a'; rond(x, 210, y+14, 560, 48, 24); x.fill();
      x.fillStyle=n.c; rond(x, 210, y+14, 560*taux/100, 48, 24); x.fill();
      if(gr.niveau==='critique'){ x.strokeStyle='#ffffff'; x.lineWidth=3; for(var k=226;k<210+560*taux/100-10;k+=26){ x.beginPath(); x.moveTo(k,y+56); x.lineTo(k+14,y+20); x.stroke(); } }
      x.fillStyle=n.c; x.font='700 38px '+sans; x.fillText((n.signe?n.signe+' ':'')+(gr.libelle||n.l), 800, y+50);
      y+=hL;
    });
    var yb=1082; x.fillStyle='#C8A960'; rond(x, 50, yb, W-100, 208, 28); x.fill();
    x.fillStyle='#12121e'; x.font='700 46px '+sans;
    x.fillText(r.code==='geneve' ? 'Genève a besoin de 10 donneurs' : 'Les donneurs réguliers', 84, yb+66);
    x.fillText(r.code==='geneve' ? 'de plus chaque jour.' : 'font la différence.', 84, yb+122);
    x.font='700 38px '+sans; x.fillText('Puis-je donner ?  beemyblood.ch', 84, yb+180);
    x.fillStyle='#8b8b9e'; x.font='400 24px '+sans; x.fillText('Source : baromètre officiel de Transfusion CRS Suisse · '+dateFr(r), 70, H-32);
    return c;
  }
  function rond(x, a, b, w, h, r){ r=Math.min(r,w/2,h/2); x.beginPath(); x.moveTo(a+r,b); x.arcTo(a+w,b,a+w,b+h,r); x.arcTo(a+w,b+h,a,b+h,r); x.arcTo(a,b+h,a,b,r); x.arcTo(a,b,a+w,b,r); x.closePath(); }

  // ---------- Fenêtre ----------
  var CSS = '.bmbs-ov{position:fixed;inset:0;background:rgba(5,5,12,.78);z-index:3000;display:flex;align-items:center;justify-content:center;padding:14px}'
    +'.bmbs{background:#16161f;color:#f0ece2;border:1px solid #6B6B89;border-radius:18px;max-width:860px;width:100%;max-height:calc(100vh - 28px);overflow:auto;font-family:"DM Sans",system-ui,sans-serif;box-shadow:0 20px 60px rgba(0,0,0,.6)}'
    +'.bmbs-h{display:flex;align-items:center;gap:12px;padding:16px 20px;border-bottom:1px solid #3a3a52}.bmbs-h h2{font-size:19px;margin:0;flex:1;line-height:1.25}'
    +'.bmbs-x{min-width:44px;min-height:44px;border-radius:12px;border:1px solid #6B6B89;background:transparent;color:#f0ece2;font-size:20px;cursor:pointer}'
    +'.bmbs-b{display:grid;grid-template-columns:minmax(0,300px) minmax(0,1fr);gap:18px;padding:18px 20px}@media(max-width:700px){.bmbs-b{grid-template-columns:1fr}.bmbs-img{max-width:240px;margin:0 auto}}'
    +'.bmbs-img canvas{width:100%;height:auto;border-radius:12px;border:1px solid #3a3a52;display:block}'
    +'.bmbs label{display:block;font-size:14px;color:#b9b9c9;margin-bottom:6px}'
    +'.bmbs textarea{width:100%;min-height:210px;background:#0d0d14;color:#f0ece2;border:1px solid #6B6B89;border-radius:12px;padding:12px;font:inherit;font-size:16px;line-height:1.45;resize:vertical}'
    +'.bmbs-r{display:grid;grid-template-columns:repeat(auto-fill,minmax(138px,1fr));gap:8px;margin-top:12px}'
    +'.bmbs-r a,.bmbs-r button{display:flex;align-items:center;justify-content:center;gap:8px;min-height:46px;padding:8px 10px;border-radius:12px;border:1px solid #6B6B89;background:#1f1f2c;color:#f0ece2;font:inherit;font-size:15px;font-weight:700;text-decoration:none;cursor:pointer;text-align:center}'
    +'.bmbs-r .or{background:#C8A960;color:#12121e;border-color:#C8A960}'
    +'.bmbs-r a:hover,.bmbs-r button:hover{filter:brightness(1.15)}.bmbs :focus-visible{outline:3px solid #E8D5A3;outline-offset:2px}'
    +'.bmbs-n{font-size:13px;color:#b9b9c9;margin-top:12px;line-height:1.45}.bmbs-ok{color:#8FD0FF;font-weight:700;min-height:20px;margin-top:8px;font-size:14px}body:has(.bmbs-ov) .bmb-pill,body:has(.bmbs-ov) .beebot-fab{display:none!important}';
  function style(){ if(document.getElementById('bmbs-css')) return; var s=document.createElement('style'); s.id='bmbs-css'; s.textContent=CSS; document.head.appendChild(s); }
  function compter(reseau, code){ try{ var sb=window.BeeAcces&&window.BeeAcces.client&&window.BeeAcces.client(); if(sb) sb.rpc('cd_evenement',{ p:{ region:code||'geneve', type:'partage_stocks', ref:String(reseau).slice(0,40) } }).then(function(){},function(){}); }catch(e){} }

  function fenetre(r, ton){
    style();
    var prev=document.activeElement, ov=document.createElement('div'); ov.className='bmbs-ov'; ov.setAttribute('role','dialog'); ov.setAttribute('aria-modal','true'); ov.setAttribute('aria-labelledby','bmbs-t');
    var cv=image(r), t=texte(r,ton,false);
    ov.innerHTML='<div class="bmbs"><div class="bmbs-h"><h2 id="bmbs-t">Partager l’état des stocks · '+esc(lieu(r))+'</h2><button class="bmbs-x" type="button" aria-label="Fermer">✕</button></div>'
      +'<div class="bmbs-b"><div class="bmbs-img"></div><div><label for="bmbs-txt">Message, modifiable avant l’envoi</label><textarea id="bmbs-txt"></textarea>'
      +'<div class="bmbs-r">'
      +'<button type="button" class="or" data-a="natif">Partager avec l’image</button>'
      +'<a data-r="whatsapp" target="_blank" rel="noopener">WhatsApp</a><a data-r="linkedin" target="_blank" rel="noopener">LinkedIn</a><a data-r="facebook" target="_blank" rel="noopener">Facebook</a>'
      +'<a data-r="x" target="_blank" rel="noopener">X</a><a data-r="bluesky" target="_blank" rel="noopener">Bluesky</a><a data-r="threads" target="_blank" rel="noopener">Threads</a><a data-r="telegram" target="_blank" rel="noopener">Telegram</a>'
      +'<a data-r="courriel">Courriel</a><button type="button" data-a="copier">Copier le texte</button><button type="button" data-a="copier-image">Copier l’image</button><button type="button" data-a="image">Télécharger l’image</button>'
      +'</div><div class="bmbs-ok" role="status" aria-live="polite"></div>'
      +'<p class="bmbs-n">Les réseaux affichent l’image du jour dans l’aperçu du lien. Sur téléphone, « Partager avec l’image » joint l’image elle-même. Sur ordinateur, « Copier l’image » permet de la coller dans la publication. Instagram demande de télécharger l’image. Niveaux du baromètre officiel de Transfusion CRS Suisse du '+esc(dateFr(r))+'.</p></div></div></div>';
    document.body.appendChild(ov); ov.querySelector('.bmbs-img').appendChild(cv);
    var ta=ov.querySelector('#bmbs-txt'), ok=ov.querySelector('.bmbs-ok'); ta.value=t;
    function dire(m){ ok.textContent=m; setTimeout(function(){ if(ok.textContent===m) ok.textContent=''; }, 4000); }
    function liens(){
      var m=ta.value, e=encodeURIComponent, c=e(texte(r,ton,true)), u=e(urlPartage(r));
      var L={ whatsapp:'https://api.whatsapp.com/send?text='+e(m), linkedin:'https://www.linkedin.com/sharing/share-offsite/?url='+u, facebook:'https://www.facebook.com/sharer/sharer.php?u='+u+'&quote='+e(m),
        x:'https://twitter.com/intent/tweet?text='+c, bluesky:'https://bsky.app/intent/compose?text='+c, threads:'https://www.threads.net/intent/post?text='+e(m),
        telegram:'https://t.me/share/url?url='+u+'&text='+e(m), courriel:'mailto:?subject='+e('Stocks de sang · '+lieu(r)+' : on a besoin de donneurs')+'&body='+e(m) };
      ov.querySelectorAll('[data-r]').forEach(function(a){ a.href=L[a.getAttribute('data-r')]; });
    }
    liens(); ta.addEventListener('input', liens);
    function copier(){ var m=ta.value; if(navigator.clipboard&&navigator.clipboard.writeText){ return navigator.clipboard.writeText(m).then(function(){ dire('Texte copié.'); }, function(){ ta.select(); document.execCommand('copy'); dire('Texte copié.'); }); } ta.select(); try{ document.execCommand('copy'); dire('Texte copié.'); }catch(e){} return Promise.resolve(); }
    function fichier(cb){ cv.toBlob(function(b){ cb(b ? new File([b], 'stocks-de-sang-'+(r.code||'suisse')+'.png', {type:'image/png'}) : null); }, 'image/png'); }
    function fermer(){ ov.remove(); document.removeEventListener('keydown', clavier); if(prev&&prev.focus) prev.focus(); }
    function clavier(ev){ if(ev.key==='Escape') fermer(); }
    document.addEventListener('keydown', clavier);
    ov.addEventListener('click', function(ev){
      if(ev.target===ov || ev.target.closest('.bmbs-x')){ fermer(); return; }
      var a=ev.target.closest('[data-r]'); if(a){ compter(a.getAttribute('data-r'), r.code); if(a.getAttribute('data-r')==='linkedin'){ copier().then(function(){ dire('Texte copié : collez-le dans votre publication LinkedIn.'); }); } return; }
      var b=ev.target.closest('[data-a]'); if(!b) return; var act=b.getAttribute('data-a');
      if(act==='copier'){ copier(); compter('copie', r.code); }
      if(act==='copier-image'){ fichier(function(f){ if(!f) return; try{ navigator.clipboard.write([new ClipboardItem({'image/png':f})]).then(function(){ dire('Image copiée : collez-la dans votre publication.'); }, function(){ dire('Votre navigateur refuse la copie d’image. Utilisez « Télécharger l’image ».'); }); }catch(x){ dire('Votre navigateur refuse la copie d’image. Utilisez « Télécharger l’image ».'); } }); compter('copie-image', r.code); }
      if(act==='image'){ fichier(function(f){ if(!f) return; var l=document.createElement('a'); l.href=URL.createObjectURL(f); l.download=f.name; document.body.appendChild(l); l.click(); setTimeout(function(){ URL.revokeObjectURL(l.href); l.remove(); },500); dire('Image enregistrée.'); }); compter('image', r.code); }
      if(act==='natif'){
        fichier(function(f){
          var donnees={ title:'Stocks de sang · '+lieu(r), text:ta.value };
          if(f && navigator.canShare && navigator.canShare({files:[f]})) donnees.files=[f];
          if(navigator.share){ navigator.share(donnees).then(function(){ compter('natif', r.code); }, function(){}); }
          else { copier().then(function(){ dire('Votre navigateur ne propose pas le partage direct. Le texte est copié, choisissez un réseau ci-dessous.'); }); }
        });
      }
    });
    setTimeout(function(){ ov.querySelector('.bmbs-x').focus(); }, 50);
  }

  function stocks(opts){
    opts = opts || {};
    var p = opts.donnees ? Promise.resolve(opts.donnees) : charger();
    return p.then(function(d){
      var r = region(d, opts.code || 'geneve');
      if(!r){ alert('Le baromètre officiel est momentanément indisponible. Réessayez dans quelques minutes.'); return; }
      fenetre(r, opts.ton || 'donneur');
    }, function(){ alert('Le baromètre officiel est momentanément indisponible. Réessayez dans quelques minutes.'); });
  }
  window.BeePartage = { stocks:stocks, texte:texte, image:image, charger:charger, region:region };
})();
