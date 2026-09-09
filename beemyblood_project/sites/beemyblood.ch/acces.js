/*
 * BeeMyBlood — Accès alpha partagé (invitation + connexion par courriel + NDA)
 * Inclure en fin de page, après supabase-js :
 *   <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js"></script>
 *   <script src="../acces.js" data-espace="donneur|receveur|pro" defer></script>
 * La page appelle window.BeeAcces.onDeverrouille(fn) ou définit window.bmbDeverrouiller(etat).
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */
(function(){
  // Une seule origine pour que la session mémorisée soit la même partout : www → sans www
  if(location.hostname==='www.beemyblood.ch'){ location.replace('https://beemyblood.ch'+location.pathname+location.search+location.hash); return; }
  var SUPABASE_URL = 'https://uyrpozgbfklqfltnduvv.supabase.co';
  var SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV5cnBvemdiZmtscWZsdG5kdXZ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg4NjEwNDMsImV4cCI6MjEwNDQzNzA0M30.pKHaT9sBOvWgnNTISgfJ4Gc5N-yiiEmShGl-acPZgVE';
  // Espaces : un compte a une liste d'espaces approuvés ; l'admin a tout
  var LIBELLES = { donneur:'Espace donneur·se', receveur:'Espace receveur·se', pro:'Portail professionnel', admin:'Administration', connexion:'Connexion', developpeur:'Développeur' };
  var CHEMINS = { donneur:'donor/', receveur:'receiver/', pro:'pro/', admin:'admin/' };
  var ICONES = { donneur:'🩸', receveur:'💛', pro:'🏥', admin:'🛠️' };
  function rolesDe(e){ var r = (e && e.roles && e.roles.length) ? e.roles.slice() : (e && e.role ? [e.role] : []); if(e && (e.admin || e.developpeur || e.role==='admin' || r.indexOf('admin')>=0 || r.indexOf('developpeur')>=0)) r = ['donneur','receveur','pro','admin']; return r.filter(function(x){ return x!=='developpeur'; }); }
  function peutAcceder(e, espace){ return rolesDe(e).indexOf(espace) >= 0; }

  var script = document.currentScript || (function(){ var s=document.querySelectorAll('script[data-espace]'); return s[s.length-1]; })();
  var ESPACE = (script && script.getAttribute('data-espace')) || 'donneur';
  var RACINE = (script && script.getAttribute('data-racine')) || '../';
  // Mode public : la page reste visible sans compte ; la connexion n'est demandée qu'au moment d'ouvrir une fonction réservée
  var PUBLIC = !!(script && script.getAttribute('data-public'));
  var sb = null, etat = null, callbacks = [], attente = null, deverrouille = false;

  var css = '.bmba-wrap{position:fixed;inset:0;z-index:100050;background:#0a0a12;color:#f0ece2;display:flex;align-items:center;justify-content:center;padding:18px;font:15px/1.55 "DM Sans",system-ui,sans-serif;overflow:auto}'
    + '.bmba-wrap *{box-sizing:border-box}'
    + '.bmba-box{width:100%;max-width:440px;background:#12121e;border:1px solid rgba(200,169,96,.22);border-radius:18px;padding:26px 22px 22px;box-shadow:0 20px 60px rgba(0,0,0,.5);margin:auto}'
    + '.bmba-box.large{max-width:680px}'
    + '.bmba-logo{font-family:"Playfair Display",Georgia,serif;font-size:24px;font-weight:800;text-align:center;margin-bottom:2px}.bmba-logo span{color:#C8A960}'
    + '.bmba-sub{text-align:center;color:#8b8b9e;font-size:13px;margin-bottom:18px}'
    + '.bmba-h{font-size:18px;font-weight:700;margin:6px 0 6px}.bmba-p{color:#b9b4a8;font-size:14px;margin:0 0 14px}'
    + '.bmba-step{display:flex;gap:6px;justify-content:center;margin-bottom:16px}.bmba-step i{width:8px;height:8px;border-radius:50%;background:rgba(200,169,96,.25)}.bmba-step i.on{background:#C8A960}'
    + '.bmba-in{width:100%;padding:13px 14px;border-radius:12px;border:1px solid rgba(200,169,96,.25);background:#0a0a12;color:#fff;font:inherit;font-size:16px;outline:none;margin-bottom:10px}.bmba-in:focus{border-color:#C8A960}'
    + '.bmba-in.code{text-align:center;letter-spacing:6px;font-size:22px;font-weight:700}'
    + '.bmba-btn{width:100%;padding:13px;border-radius:12px;border:none;background:linear-gradient(135deg,#C8A960,#B89730);color:#0a0a12;font:inherit;font-weight:700;font-size:15px;cursor:pointer}.bmba-btn:disabled{opacity:.55;cursor:wait}'
    + '.bmba-btn.sec{background:transparent;color:#C8A960;border:1px solid rgba(200,169,96,.35);margin-top:8px}'
    + '.bmba-choix{display:block;text-align:center;text-decoration:none;margin-bottom:8px}'
    + '.bmba-q{font-size:13px;font-weight:700;color:#E8D5A3;margin:14px 0 8px}.bmba-q:first-of-type{margin-top:4px}'
    + '.bmba-note{font-size:12.5px;color:#8b8b9e;margin:8px 0 0;line-height:1.5}'
    + '.bmba-err{color:#ff6b6b;font-size:13px;min-height:18px;margin:6px 0 4px}.bmba-ok{color:#4ade80;font-size:13px;margin:6px 0}'
    + '.bmba-foot{margin-top:16px;font-size:12px;color:#5a5a72;text-align:center;line-height:1.6}.bmba-foot a{color:#C8A960;text-decoration:none}'
    + '.bmba-nda{max-height:44vh;overflow:auto;padding:14px 16px;background:#0a0a12;border:1px solid rgba(200,169,96,.18);border-radius:12px;font-size:13.5px;line-height:1.6;color:#d8d3c7;white-space:pre-wrap;margin-bottom:10px}'
    + '.bmba-check{display:flex;gap:10px;align-items:flex-start;font-size:13.5px;margin:8px 0 12px;cursor:pointer}.bmba-check input{width:18px;height:18px;accent-color:#C8A960;margin-top:2px;flex:none}'
    + '.bmba-user{position:fixed;left:12px;bottom:52px;z-index:100040;max-width:60vw;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font:12px "DM Sans",system-ui,sans-serif;color:#8b8b9e;background:rgba(18,18,30,.9);border:1px solid rgba(200,169,96,.2);border-radius:99px;padding:5px 10px;display:flex;gap:8px;align-items:center;backdrop-filter:blur(8px)}'
    + '.bmba-user b{color:#E8D5A3;font-weight:600}.bmba-user button{background:none;border:none;color:#C8A960;cursor:pointer;font:inherit;padding:0}'
    + '.bmba-menu{position:fixed;z-index:100045;left:10px;background:#12121e;color:#f0ece2;border:1px solid rgba(200,169,96,.3);border-radius:12px;padding:10px 12px;font:13px/1.6 "DM Sans",system-ui,sans-serif;box-shadow:0 8px 28px rgba(0,0,0,.5);min-width:200px}.bmba-menu b{color:#E8D5A3;display:block;margin-bottom:4px}.bmba-menu a,.bmba-menu button{display:block;width:100%;text-align:left;background:none;border:0;color:#C8A960;font:inherit;padding:6px 0;cursor:pointer;text-decoration:none}'
    + '@media(max-width:640px){.bmba-box{padding:22px 16px 18px;border-radius:14px}.bmba-user{left:54px;width:38px;height:38px;padding:0;border-radius:50%;justify-content:center;font-size:17px;max-width:none;overflow:visible}.bmba-user span,.bmba-user a,.bmba-user button{display:none}.bmba-user::before{content:"👤"}}';
  var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  // Neutralise les anciens écrans d'accès de la page (codés en dur), sans les supprimer
  function masquerAnciensEcrans(){
    ['gate-overlay','gate','loginPage'].forEach(function(id){ var el=document.getElementById(id); if(el){ el.style.display='none'; el.setAttribute('data-bmba-masque','1'); } });
  }

  var wrap = null;
  function ecran(html, large){
    if(!wrap){ wrap = document.createElement('div'); wrap.className='bmba-wrap'; document.body.appendChild(wrap); }
    wrap.innerHTML = '<div class="bmba-box'+(large?' large':'')+'"><div class="bmba-logo">🐝 <span>BeeMyBlood</span>™</div><div class="bmba-sub">'+(LIBELLES[ESPACE]||ESPACE)+' · version alpha</div>'+html+'</div>';
    wrap.style.display='flex';
    var f = wrap.querySelector('input'); if(f) setTimeout(function(){ f.focus(); }, 50);
  }
  function fermer(){ if(wrap) wrap.style.display='none'; }
  function etapes(n){ return '<div class="bmba-step">'+[1,2,3].map(function(i){return '<i class="'+(i<=n?'on':'')+'"></i>';}).join('')+'</div>'; }
  function msgErreur(e){
    var m = (e && (e.message||e)) + '';
    var t = { courriel_invalide:'Adresse courriel invalide.', code_invalide:'Code d’invitation inconnu. Vérifiez les majuscules et les tirets.', courriel_different:'Ce code a été délivré pour une autre adresse courriel. Connectez-vous avec l’adresse indiquée dans votre demande.', code_expire:'Ce code a expiré. Demandez un nouveau code à contact@beemyblood.ch.', acces_manquant:'Activez d’abord votre code d’invitation.', nom_manquant:'Indiquez votre nom complet.', version_obsolete:'Le texte a été mis à jour, rechargez la page.', non_admin:'Réservé aux administrateurs.' };
    for (var k in t) if (m.indexOf(k) >= 0) return t[k];
    if (/rate limit|too many/i.test(m)) return 'Trop de tentatives, réessayez dans quelques minutes.';
    if (/otp|token|expired|invalid/i.test(m)) return 'Code incorrect ou déjà utilisé. Demandez un nouveau code et saisissez celui du dernier courriel reçu.';
    if (/fetch|network/i.test(m)) return 'Le serveur est injoignable. Vérifiez votre réseau.';
    return 'Une erreur est survenue : ' + m.slice(0, 140);
  }
  var pied = '<div class="bmba-foot">Hébergé en Suisse · <a href="'+RACINE+'">Retour à l’accueil</a></div>';

  // ---------- Étape 1 : courriel ----------
  var INTRO = {
    donneur: 'Le test d’éligibilité, les centres, le guide, la FAQ et BeeBot sont ouverts à tout le monde. Le tableau de bord, les défis, HémoRush, l’impact et le profil s’ouvrent sur invitation.',
    receveur: 'L’espace receveur·se est en phase de test et s’ouvre sur invitation.',
    pro: 'Le portail professionnel est en phase de test et s’ouvre sur invitation.',
    admin: 'L’administration est réservée à l’équipe du projet.',
    connexion: 'Saisissez l’adresse avec laquelle votre accès a été approuvé.'
  };
  function ecranCourriel(pre){
    var choix = ESPACE!=='connexion';
    var titre = !choix ? 'Se connecter' : (PUBLIC ? 'Fonction réservée aux testeurs invités' : 'Espace réservé aux testeurs invités');
    ecran(etapes(1)+'<div class="bmba-h">'+titre+'</div><p class="bmba-p">'+(INTRO[ESPACE]||INTRO.connexion)+'</p>'
      +(choix?'<div class="bmba-q">Déjà invité·e ?</div>':'')
      +'<input class="bmba-in" id="bmbaEmail" type="email" autocomplete="email" inputmode="email" placeholder="prenom.nom@exemple.ch" value="'+(pre||'')+'">'
      +'<button class="bmba-btn" id="bmbaSend">Recevoir mon code</button>'
      +'<p class="bmba-note">'+(choix?'Même adresse que votre demande. ':'')+'Un code reçu par courriel remplace le mot de passe. Vous restez connecté·e sur cet appareil.</p>'
      +'<div class="bmba-err" id="bmbaErr"></div>'
      +(choix?'<div class="bmba-q">Pas encore invité·e ?</div>':'')
      +'<a class="bmba-btn sec bmba-choix" href="'+RACINE+'acces/'+(choix?'?espace='+ESPACE:'')+'">Demander un accès</a>'
      +(PUBLIC?'<button class="bmba-btn sec" id="bmbaLibre">Poursuivre la visite</button>':'')+pied);
    var libre=document.getElementById('bmbaLibre'); if(libre) libre.onclick=function(){ attente=null; fermer(); };
    var go = function(){
      var email = (document.getElementById('bmbaEmail').value||'').trim().toLowerCase();
      if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)){ document.getElementById('bmbaErr').textContent='Adresse courriel invalide.'; return; }
      var b=document.getElementById('bmbaSend'); b.disabled=true; b.textContent='Envoi…';
      sb.auth.signInWithOtp({ email:email, options:{ shouldCreateUser:true, emailRedirectTo: location.href.split('#')[0] } })
        .then(function(r){ if(r.error) throw r.error; try{ localStorage.setItem('bmba_email', email); }catch(e){} ecranCode(email); })
        .catch(function(e){ b.disabled=false; b.textContent='Recevoir mon code'; document.getElementById('bmbaErr').textContent=msgErreur(e); });
    };
    document.getElementById('bmbaSend').onclick = go;
    document.getElementById('bmbaEmail').addEventListener('keydown', function(e){ if(e.key==='Enter') go(); });
  }

  // ---------- Étape 2 : code reçu par courriel ----------
  function ecranCode(email){
    ecran(etapes(2)+'<div class="bmba-h">Saisissez le code reçu</div><p class="bmba-p">Un code vient d’être envoyé à <b>'+email+'</b>. Rien reçu ? Vérifiez les courriels indésirables.</p>'
      +'<input class="bmba-in code" id="bmbaOtp" inputmode="numeric" autocomplete="one-time-code" maxlength="10" placeholder="········">'
      +'<button class="bmba-btn" id="bmbaVerif">Valider</button><button class="bmba-btn sec" id="bmbaBack">Changer d’adresse</button><div class="bmba-err" id="bmbaErr"></div>'+pied);
    var go = function(){
      var token=(document.getElementById('bmbaOtp').value||'').replace(/\D/g,'');
      if(token.length<6){ document.getElementById('bmbaErr').textContent='Recopiez le code complet reçu par courriel.'; return; }
      var b=document.getElementById('bmbaVerif'); b.disabled=true; b.textContent='Vérification…';
      // Un compte jamais confirmé reçoit un code de type « signup » : on essaie les deux types
      sb.auth.verifyOtp({ email:email, token:token, type:'email' })
        .then(function(r){ if(!r.error) return r; return sb.auth.verifyOtp({ email:email, token:token, type:'signup' }).then(function(r2){ return r2.error ? r : r2; }); })
        .then(function(r){ if(r.error) throw r.error; return suite(); })
        .catch(function(e){ b.disabled=false; b.textContent='Valider'; document.getElementById('bmbaErr').textContent=msgErreur(e); });
    };
    document.getElementById('bmbaVerif').onclick = go;
    document.getElementById('bmbaOtp').addEventListener('keydown', function(e){ if(e.key==='Enter') go(); });
    document.getElementById('bmbaBack').onclick = function(){ ecranCourriel(email); };
  }

  // ---------- Étape 2b : pas d'accès pour ce courriel ----------
  function ecranInvitation(){
    var d=etat.demande, txt;
    if(d==='en_attente') txt='Votre demande pour <b>'+etat.email+'</b> est <b>en attente d’approbation</b>. Vous recevrez un courriel dès qu’elle sera validée.';
    else if(d==='refusee') txt='La demande pour <b>'+etat.email+'</b> n’a pas été retenue. Une erreur ? Écrivez à <a href="mailto:contact@beemyblood.ch" style="color:#C8A960">contact@beemyblood.ch</a>.';
    else if(d==='activee') txt='Cet accès est déjà activé sur un autre compte. Écrivez à <a href="mailto:contact@beemyblood.ch" style="color:#C8A960">contact@beemyblood.ch</a>.';
    else txt='L’adresse <b>'+etat.email+'</b> attend encore une invitation. Vous avez fait votre demande avec une autre adresse ? Reconnectez-vous avec celle-ci. Sinon, demandez un accès.';
    ecran(etapes(2)+'<div class="bmba-h">Accès pas encore ouvert</div><p class="bmba-p">'+txt+'</p>'
      +(d?'' : '<a class="bmba-btn" style="display:block;text-align:center;text-decoration:none" href="'+RACINE+'acces/'+(ESPACE!=='connexion'?'?espace='+ESPACE:'')+'">Demander un accès</a>')
      +'<button class="bmba-btn sec" id="bmbaRetry">Vérifier à nouveau</button><button class="bmba-btn sec" id="bmbaOut">Se déconnecter</button><div class="bmba-err" id="bmbaErr"></div>'+pied);
    document.getElementById('bmbaRetry').onclick=function(){ suite(); };
    document.getElementById('bmbaOut').onclick=deconnecter;
  }

  // ---------- Étape 3 : NDA ----------
  function ecranNda(){
    sb.rpc('nda_courant').then(function(r){
      if(r.error || !r.data) throw (r.error || new Error('NDA indisponible'));
      var nda = r.data;
      ecran(etapes(3)+'<div class="bmba-h">'+nda.titre+'</div><p class="bmba-p">Version '+nda.version+'. Lisez le texte jusqu’en bas, puis signez en indiquant votre nom.</p>'
        +'<div class="bmba-nda" id="bmbaNdaTxt">'+nda.texte.replace(/&/g,'&amp;').replace(/</g,'&lt;')+'</div>'
        +'<label class="bmba-check"><input type="checkbox" id="bmbaLu" disabled> <span>J’ai lu l’accord de confidentialité et je l’accepte (la case se débloque une fois le texte lu jusqu’au bout).</span></label>'
        +'<input class="bmba-in" id="bmbaNom" placeholder="Votre prénom et nom, en guise de signature" autocomplete="name">'
        +'<button class="bmba-btn" id="bmbaSign" disabled>Signer et entrer</button><button class="bmba-btn sec" id="bmbaOut">Se déconnecter</button><div class="bmba-err" id="bmbaErr"></div>', true);
      var box=document.getElementById('bmbaNdaTxt'), lu=document.getElementById('bmbaLu'), nom=document.getElementById('bmbaNom'), btn=document.getElementById('bmbaSign');
      function check(){ btn.disabled = !(lu.checked && nom.value.trim().length>=3); }
      function lecture(){ if(box.scrollTop + box.clientHeight >= box.scrollHeight - 12){ lu.disabled=false; } }
      box.addEventListener('scroll', lecture); setTimeout(lecture, 300);
      lu.addEventListener('change', check); nom.addEventListener('input', check);
      btn.onclick = function(){
        btn.disabled=true; btn.textContent='Enregistrement…';
        sb.rpc('signer_nda', { p_nom: nom.value.trim(), p_version: nda.version, p_user_agent: navigator.userAgent })
          .then(function(r){ if(r.error) throw r.error; return suite(); })
          .catch(function(e){ btn.disabled=false; btn.textContent='Signer et entrer'; document.getElementById('bmbaErr').textContent=msgErreur(e); });
      };
      document.getElementById('bmbaOut').onclick = deconnecter;
    }).catch(function(e){ ecran('<div class="bmba-h">Accord indisponible</div><p class="bmba-p">'+msgErreur(e)+'</p><button class="bmba-btn" onclick="location.reload()">Réessayer</button>'); });
  }

  // ---------- Page de connexion unique : choix de l'espace ----------
  function ecranChoix(){
    var r = rolesDe(etat).filter(function(x){ return x!=='admin' || etat.admin || etat.developpeur; });
    if(r.length===1){ location.replace(RACINE+CHEMINS[r[0]]); return; }
    ecran('<div class="bmba-h">Bonjour '+(etat.nom||etat.email)+'</div><p class="bmba-p">Quel espace ouvrir ?</p>'
      + r.map(function(x){ return '<a class="bmba-btn bmba-choix" href="'+RACINE+CHEMINS[x]+'">'+ICONES[x]+' '+LIBELLES[x]+'</a>'; }).join('')
      + '<button class="bmba-btn sec" id="bmbaOut">Se déconnecter</button>');
    document.getElementById('bmbaOut').onclick=deconnecter;
  }

  function ecranRefus(){
    var r = rolesDe(etat).filter(function(x){ return x!=='admin'; });
    ecran('<div class="bmba-h">Espace non autorisé</div><p class="bmba-p">'+(r.length? 'Votre accès couvre '+r.map(function(x){return LIBELLES[x];}).join(', ')+'.' : 'Votre compte attend encore un espace approuvé.')+' Pour l’étendre, écrivez à <a href="mailto:contact@beemyblood.ch" style="color:#C8A960">contact@beemyblood.ch</a>.</p>'
      + r.map(function(x){ return '<a class="bmba-btn bmba-choix" href="'+RACINE+CHEMINS[x]+'">'+ICONES[x]+' '+LIBELLES[x]+'</a>'; }).join('')
      +'<a class="bmba-btn sec" style="display:block;text-align:center;text-decoration:none" href="'+RACINE+'">Retour à l’accueil</a><button class="bmba-btn sec" id="bmbaOut">Se déconnecter</button>');
    document.getElementById('bmbaOut').onclick = deconnecter;
  }

  function deconnecter(){ sb.auth.signOut().then(function(){ etat=null; deverrouille=false; var u=document.querySelector('.bmba-user'); if(u) u.remove(); if(PUBLIC){ location.reload(); } else { ecranCourriel(); } }); }

  // ---------- Personnalisation : le nom de la personne connectée remplace les personnages de démonstration ----------
  var DEMO = { donneur:{ noms:['Amine'], initiales:['AK'] }, receveur:{ noms:['Eleonora'], initiales:['EM'] }, pro:{ noms:[], initiales:[] } };
  function identite(e){
    var nom = (e.nom && e.nom !== 'Administrateur' && e.nom !== 'Développeur') ? e.nom : (e.email||'').split('@')[0].replace(/[._\-]+/g,' ');
    nom = nom.trim().replace(/(^|\s)(\S)/g, function(m0,sp,c){ return sp + c.toUpperCase(); });
    var parts = nom.split(/\s+/).filter(Boolean);
    return { nom:nom||e.email, prenom:parts[0]||nom, initiales:(parts.slice(0,2).map(function(p){ return p.charAt(0).toUpperCase(); }).join(''))||'👤' };
  }
  function personnaliser(e){
    var d = DEMO[ESPACE]; if(!d || !e || e.dev) return;
    var id = identite(e), racine = document.body;
    var SKIP = {SCRIPT:1,STYLE:1,TEXTAREA:1,INPUT:1,OPTION:1};
    if(d.noms.length){
      var re = new RegExp('\\b(' + d.noms.join('|') + ')\\b', 'g');
      var w = document.createTreeWalker(racine, NodeFilter.SHOW_TEXT, { acceptNode:function(n){ var p=n.parentNode; if(!p||SKIP[p.nodeName]||p.closest('.bmba-wrap,.bmba-user,.bmb-box')) return NodeFilter.FILTER_REJECT; if(/T[ée]moignage/.test(n.nodeValue)) return NodeFilter.FILTER_REJECT; return re.test(n.nodeValue)?NodeFilter.FILTER_ACCEPT:NodeFilter.FILTER_SKIP; } });
      var nodes=[], n; while((n=w.nextNode())) nodes.push(n);
      nodes.forEach(function(t){ t.nodeValue = t.nodeValue.replace(re, id.prenom); });
      document.querySelectorAll('[title]').forEach(function(el){ if(re.test(el.title)) el.title = el.title.replace(re, id.prenom); re.lastIndex=0; });
    }
    document.querySelectorAll('.bmb-prenom').forEach(function(el){ el.textContent=' '+id.prenom; });
    if(d.initiales.length){
      document.querySelectorAll('div,span,a,b,strong').forEach(function(el){ if(el.children.length===0 && d.initiales.indexOf(el.textContent.trim())>=0) el.textContent = id.initiales; });
    }
    if(e.email){
      var w2 = document.createTreeWalker(racine, NodeFilter.SHOW_TEXT, { acceptNode:function(n){ var p=n.parentNode; if(!p||SKIP[p.nodeName]||p.closest('.bmba-wrap,.bmba-user')) return NodeFilter.FILTER_REJECT; return n.nodeValue.indexOf('admin@beemyblood.ch')>=0?NodeFilter.FILTER_ACCEPT:NodeFilter.FILTER_SKIP; } });
      var nodes2=[], n2; while((n2=w2.nextNode())) nodes2.push(n2);
      nodes2.forEach(function(t){ t.nodeValue = t.nodeValue.split('admin@beemyblood.ch').join(e.email); });
    }
  }

  // ---------- Déverrouillage de la page ----------
  function deverrouiller(){
    fermer(); deverrouille = true; document.body.classList.remove('bmb-public'); document.body.classList.add('bmb-alpha');
    var el;
    if((el=document.getElementById('gate-overlay'))) el.remove();                              // espace donneur
    if((el=document.getElementById('gate'))) el.style.display='none';                           // espace receveur
    if((el=document.getElementById('loginPage'))){ el.style.display='none'; var m=document.getElementById('mainApp'); if(m) m.style.display='block'; if(typeof window.renderAll==='function'){ try{ window.renderAll(); }catch(e){} } } // portail pro
    document.body.style.overflow='';
    if(!document.querySelector('.bmba-user')){
      var u=document.createElement('div'); u.className='bmba-user';
      u.innerHTML='<span>👤 <b>'+(etat.nom||etat.email)+'</b>'+(etat.developpeur?' · dev':'')+'</span><a href="'+RACINE+'connexion/" title="Changer d’espace" style="color:#C8A960;text-decoration:none">Espaces</a><button type="button" title="Se déconnecter">Quitter</button>';
      u.querySelector('button').onclick=deconnecter; document.body.appendChild(u);
      // sur mobile la pastille ouvre un petit menu (nom, espaces, quitter)
      u.addEventListener('click', function(ev){ if(window.innerWidth>640) return; if(ev.target.tagName==='BUTTON'||ev.target.tagName==='A') return; var old=document.querySelector('.bmba-menu'); if(old){ old.remove(); return; } var m=document.createElement('div'); m.className='bmba-menu'; m.innerHTML='<b>'+(etat.nom||etat.email)+'</b><a href="'+RACINE+'connexion/">Changer d’espace</a><button type="button">Se déconnecter</button>'; m.querySelector('button').onclick=deconnecter; m.style.bottom=(parseInt(getComputedStyle(u).bottom,10)+46)+'px'; document.body.appendChild(m); setTimeout(function(){ document.addEventListener('click', function h(e2){ if(!m.contains(e2.target)&&e2.target!==u){ m.remove(); document.removeEventListener('click',h); } }); },0); });
      // se place juste au-dessus du bouton Lexique (bas gauche), jamais sur les menus de la page
      var placer=function(){ var pill=document.querySelector('.bmb-pill'); u.style.bottom = pill ? (parseInt(getComputedStyle(pill).bottom,10)+(window.innerWidth<=640?0:38))+'px' : '14px'; };
      placer(); setTimeout(placer,900); setTimeout(placer,2500); window.addEventListener('resize',placer);
    }
    sb.rpc('journaliser_acces', { p_espace: ESPACE }).then(function(){}, function(){});
    try{ personnaliser(etat); setTimeout(function(){ personnaliser(etat); }, 1500); }catch(e){}
    if(typeof window.bmbDeverrouiller==='function'){ try{ window.bmbDeverrouiller(etat); }catch(e){} }
    callbacks.forEach(function(fn){ try{ fn(etat); }catch(e){} });
    if(attente){ var fn2=attente; attente=null; try{ fn2(etat); }catch(e){} }
  }

  // ---------- Orchestration ----------
  function suite(){
    return sb.auth.getSession().then(function(s){
      if(!s.data || !s.data.session){ etat=null; if(PUBLIC && !attente){ fermer(); document.body.classList.add('bmb-public'); return null; } var pre=''; try{ pre=localStorage.getItem('bmba_email')||''; }catch(e){} ecranCourriel(pre); return null; }
      return sb.rpc('mon_etat');
    }).then(function(r){
      if(r===null) return;
      if(r.error) throw r.error;
      etat = r.data || {};
      if(!etat.connecte){ ecranCourriel(); return; }
      if(!etat.acces){ ecranInvitation(); return; }
      if(!etat.nda_signe){ ecranNda(); return; }
      if(ESPACE==='connexion'){ ecranChoix(); return; }
      if(!peutAcceder(etat, ESPACE)){ ecranRefus(); return; }
      deverrouiller();
    }).catch(function(e){ ecran('<div class="bmba-h">Connexion impossible</div><p class="bmba-p">'+msgErreur(e)+'</p><button class="bmba-btn" onclick="location.reload()">Réessayer</button>'+pied); });
  }

  // Erreur renvoyée par Supabase dans l'URL après un clic sur un lien de courriel (expiré, déjà utilisé…)
  function erreurDansUrl(){
    var h = location.hash || '';
    if(h.indexOf('error') < 0) return null;
    var p = {}; h.replace(/^#/, '').split('&').forEach(function(kv){ var i=kv.indexOf('='); if(i>0) p[decodeURIComponent(kv.slice(0,i))]=decodeURIComponent(kv.slice(i+1).replace(/\+/g,' ')); });
    try{ history.replaceState(null, '', location.pathname + location.search); }catch(e){}
    if(p.error_code === 'otp_expired') return 'Ce lien de connexion n’est plus valable : il a expiré, a déjà été utilisé, ou un lien plus récent l’a remplacé (chaque nouvelle demande annule la précédente). Demandez un nouveau code ci-dessous et utilisez le dernier message reçu.';
    return p.error_description ? 'Connexion refusée : ' + p.error_description : null;
  }
  function init(){
    masquerAnciensEcrans();
    var errUrl = erreurDansUrl();
    if(errUrl){ setTimeout(function(){ var e=document.getElementById('bmbaErr'); if(e && !e.textContent) e.textContent = errUrl; }, 400); }
    if(!window.supabase || !window.supabase.createClient){
      ecran('<div class="bmba-h">Bibliothèque manquante</div><p class="bmba-p">Le composant de connexion n’a pas pu être chargé. Rechargez la page ou vérifiez votre connexion.</p><button class="bmba-btn" onclick="location.reload()">Recharger</button>');
      return;
    }
    sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON, { auth:{ persistSession:true, autoRefreshToken:true, detectSessionInUrl:true } });
    if(!PUBLIC) ecran('<div class="bmba-h">Vérification de votre accès…</div><p class="bmba-p">Un instant.</p>'); else document.body.classList.add('bmb-public');
    sb.auth.getSession().then(function(){ return suite(); });
    sb.auth.onAuthStateChange(function(ev){ if(ev==='SIGNED_IN' && (!etat || !etat.connecte)) suite(); });
  }
  // exiger(fn) : demande la connexion (écran), puis exécute fn une fois l'espace déverrouillé
  function exiger(fn){ if(deverrouille){ if(fn) fn(etat); return; } attente = fn || function(){}; suite(); }
  window.BeeAcces = { personnaliser:personnaliser, onDeverrouille:function(fn){ if(deverrouille) fn(etat); else callbacks.push(fn); }, etat:function(){ return etat; }, deverrouille:function(){ return deverrouille; }, exiger:exiger, deconnecter:deconnecter, client:function(){ return sb; }, espace:ESPACE, public:PUBLIC };
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
