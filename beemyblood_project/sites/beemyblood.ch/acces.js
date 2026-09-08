/*
 * BeeMyBlood — Accès alpha partagé (invitation + connexion par courriel + NDA)
 * Inclure en fin de page, après supabase-js :
 *   <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js"></script>
 *   <script src="../acces.js" data-espace="donneur|receveur|pro" defer></script>
 * La page appelle window.BeeAcces.onDeverrouille(fn) ou définit window.bmbDeverrouiller(etat).
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */
(function(){
  var SUPABASE_URL = 'https://uyrpozgbfklqfltnduvv.supabase.co';
  var SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV5cnBvemdiZmtscWZsdG5kdXZ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg4NjEwNDMsImV4cCI6MjEwNDQzNzA0M30.pKHaT9sBOvWgnNTISgfJ4Gc5N-yiiEmShGl-acPZgVE';
  // Qui peut entrer où : admin partout, pro partout, receveur dans receveur + donneur, donneur chez lui
  var DROITS = { admin:['donneur','receveur','pro','admin'], pro:['donneur','receveur','pro'], receveur:['donneur','receveur'], donneur:['donneur'] };
  var LIBELLES = { donneur:'Espace donneur·se', receveur:'Espace receveur·se', pro:'Portail professionnel', admin:'Administration' };

  var script = document.currentScript || (function(){ var s=document.querySelectorAll('script[data-espace]'); return s[s.length-1]; })();
  var ESPACE = (script && script.getAttribute('data-espace')) || 'donneur';
  var RACINE = (script && script.getAttribute('data-racine')) || '../';
  var sb = null, etat = null, callbacks = [];

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
    + '.bmba-err{color:#ff6b6b;font-size:13px;min-height:18px;margin:6px 0 4px}.bmba-ok{color:#4ade80;font-size:13px;margin:6px 0}'
    + '.bmba-foot{margin-top:16px;font-size:12px;color:#5a5a72;text-align:center;line-height:1.6}.bmba-foot a{color:#C8A960;text-decoration:none}'
    + '.bmba-nda{max-height:44vh;overflow:auto;padding:14px 16px;background:#0a0a12;border:1px solid rgba(200,169,96,.18);border-radius:12px;font-size:13.5px;line-height:1.6;color:#d8d3c7;white-space:pre-wrap;margin-bottom:10px}'
    + '.bmba-check{display:flex;gap:10px;align-items:flex-start;font-size:13.5px;margin:8px 0 12px;cursor:pointer}.bmba-check input{width:18px;height:18px;accent-color:#C8A960;margin-top:2px;flex:none}'
    + '.bmba-user{position:fixed;top:8px;right:10px;z-index:100040;font:12px "DM Sans",system-ui,sans-serif;color:#8b8b9e;background:rgba(18,18,30,.9);border:1px solid rgba(200,169,96,.2);border-radius:99px;padding:5px 10px;display:flex;gap:8px;align-items:center;backdrop-filter:blur(8px)}'
    + '.bmba-user b{color:#E8D5A3;font-weight:600}.bmba-user button{background:none;border:none;color:#C8A960;cursor:pointer;font:inherit;padding:0}'
    + '@media(max-width:640px){.bmba-box{padding:22px 16px 18px;border-radius:14px}.bmba-user{top:auto;bottom:8px;right:8px;font-size:11px}}';
  var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  // Neutralise les anciens écrans d'accès de la page (codés en dur), sans les supprimer
  function masquerAnciensEcrans(){
    ['gate-overlay','gate','loginPage'].forEach(function(id){ var el=document.getElementById(id); if(el){ el.style.display='none'; el.setAttribute('data-bmba-masque','1'); } });
  }

  var wrap = null;
  function ecran(html, large){
    if(!wrap){ wrap = document.createElement('div'); wrap.className='bmba-wrap'; document.body.appendChild(wrap); }
    wrap.innerHTML = '<div class="bmba-box'+(large?' large':'')+'"><div class="bmba-logo">🐝 <span>BeeMyBlood</span>™</div><div class="bmba-sub">'+(LIBELLES[ESPACE]||ESPACE)+' · version alpha sur invitation</div>'+html+'</div>';
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
    if (/otp|token|expired|invalid/i.test(m)) return 'Code incorrect ou expiré. Demandez-en un nouveau.';
    if (/fetch|network/i.test(m)) return 'Pas de connexion au serveur. Vérifiez votre réseau.';
    return 'Une erreur est survenue : ' + m.slice(0, 140);
  }
  var pied = '<div class="bmba-foot">Pas encore d’invitation ? <a href="'+RACINE+'acces/">Demander un accès</a> · Aucun mot de passe : un code vous est envoyé par courriel à chaque connexion.<br>Hébergé en Suisse et dans l’UE · <a href="'+RACINE+'">Retour à l’accueil</a> · <a href="#" id="bmbaDevLink" style="color:#5a5a72">Accès développeur</a></div>';

  // ---------- Accès rapide développeur (identifiant + mot de passe en dur, session du navigateur seulement) ----------
  var DEV = { id:'developer', mdp:'teambmb' };
  function etatDev(){ try{ return sessionStorage.getItem('bmba_dev')==='1'; }catch(e){ return false; } }
  function ecranDev(){
    ecran('<div class="bmba-h">Accès développeur</div><p class="bmba-p">Entrée directe pour l’équipe, sans courriel ni NDA. Valable pour cet onglet uniquement, rien n’est enregistré côté serveur.</p>'
      +'<input class="bmba-in" id="bmbaDevId" placeholder="Identifiant" autocomplete="username"><input class="bmba-in" id="bmbaDevMdp" type="password" placeholder="Mot de passe" autocomplete="current-password">'
      +'<button class="bmba-btn" id="bmbaDevGo">Entrer</button><button class="bmba-btn sec" id="bmbaDevBack">Retour à la connexion par courriel</button><div class="bmba-err" id="bmbaErr"></div>');
    var go=function(){
      var id=(document.getElementById('bmbaDevId').value||'').trim().toLowerCase(), mdp=document.getElementById('bmbaDevMdp').value||'';
      if(id===DEV.id && mdp===DEV.mdp){ try{ sessionStorage.setItem('bmba_dev','1'); }catch(e){} etat={ connecte:true, email:'developer', nom:'Développeur', role:'admin', dev:true }; deverrouiller(); }
      else document.getElementById('bmbaErr').textContent='Identifiant ou mot de passe incorrect.';
    };
    document.getElementById('bmbaDevGo').onclick=go;
    document.getElementById('bmbaDevMdp').addEventListener('keydown',function(e){ if(e.key==='Enter') go(); });
    document.getElementById('bmbaDevBack').onclick=function(){ ecranCourriel(); };
  }
  document.addEventListener('click', function(e){ if(e.target && e.target.id==='bmbaDevLink'){ e.preventDefault(); ecranDev(); } });

  // ---------- Étape 1 : courriel ----------
  function ecranCourriel(pre){
    ecran(etapes(1)+'<div class="bmba-h">Connexion par courriel</div><p class="bmba-p">Saisissez l’adresse indiquée dans votre demande d’accès. Vous recevrez un code à 6 chiffres (ou un lien) valable quelques minutes.</p>'
      +'<input class="bmba-in" id="bmbaEmail" type="email" autocomplete="email" inputmode="email" placeholder="prenom.nom@exemple.ch" value="'+(pre||'')+'">'
      +'<button class="bmba-btn" id="bmbaSend">Recevoir mon code</button><div class="bmba-err" id="bmbaErr"></div>'+pied);
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
    ecran(etapes(2)+'<div class="bmba-h">Vérifiez votre boîte courriel</div><p class="bmba-p">Un message a été envoyé à <b>'+email+'</b>. Saisissez le code à 6 chiffres qu’il contient, ou cliquez simplement sur le lien du message. Pensez au dossier « indésirables ».</p>'
      +'<input class="bmba-in code" id="bmbaOtp" inputmode="numeric" autocomplete="one-time-code" maxlength="8" placeholder="······">'
      +'<button class="bmba-btn" id="bmbaVerif">Valider</button><button class="bmba-btn sec" id="bmbaBack">Changer d’adresse</button><div class="bmba-err" id="bmbaErr"></div>'+pied);
    var go = function(){
      var token=(document.getElementById('bmbaOtp').value||'').replace(/\D/g,'');
      if(token.length<6){ document.getElementById('bmbaErr').textContent='Le code comporte 6 chiffres.'; return; }
      var b=document.getElementById('bmbaVerif'); b.disabled=true; b.textContent='Vérification…';
      sb.auth.verifyOtp({ email:email, token:token, type:'email' })
        .then(function(r){ if(r.error) throw r.error; return suite(); })
        .catch(function(e){ b.disabled=false; b.textContent='Valider'; document.getElementById('bmbaErr').textContent=msgErreur(e); });
    };
    document.getElementById('bmbaVerif').onclick = go;
    document.getElementById('bmbaOtp').addEventListener('keydown', function(e){ if(e.key==='Enter') go(); });
    document.getElementById('bmbaBack').onclick = function(){ ecranCourriel(email); };
  }

  // ---------- Étape 2b : code d'invitation ----------
  function ecranInvitation(){
    ecran(etapes(2)+'<div class="bmba-h">Votre code d’invitation</div><p class="bmba-p">Connecté·e comme <b>'+etat.email+'</b>. Saisissez le code reçu après l’approbation de votre demande (format BMB-XXXX-XXXX).</p>'
      +'<input class="bmba-in code" id="bmbaInv" autocomplete="off" placeholder="BMB-XXXX-XXXX" style="letter-spacing:2px;font-size:18px">'
      +'<button class="bmba-btn" id="bmbaAct">Activer</button><button class="bmba-btn sec" id="bmbaOut">Se déconnecter</button><div class="bmba-err" id="bmbaErr"></div>'+pied);
    var go = function(){
      var code=(document.getElementById('bmbaInv').value||'').trim().toUpperCase();
      var b=document.getElementById('bmbaAct'); b.disabled=true; b.textContent='Activation…';
      sb.rpc('activer_invitation', { p_code: code })
        .then(function(r){ if(r.error) throw r.error; return suite(); })
        .catch(function(e){ b.disabled=false; b.textContent='Activer'; document.getElementById('bmbaErr').textContent=msgErreur(e); });
    };
    document.getElementById('bmbaAct').onclick = go;
    document.getElementById('bmbaInv').addEventListener('keydown', function(e){ if(e.key==='Enter') go(); });
    document.getElementById('bmbaOut').onclick = deconnecter;
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

  function ecranRefus(){
    ecran('<div class="bmba-h">Espace non autorisé</div><p class="bmba-p">Votre invitation (« '+etat.role+' ») ne donne pas accès à cet espace. Écrivez à <a href="mailto:contact@beemyblood.ch" style="color:#C8A960">contact@beemyblood.ch</a> pour l’étendre.</p>'
      +'<a class="bmba-btn" style="display:block;text-align:center;text-decoration:none" href="'+RACINE+'">Retour à l’accueil</a><button class="bmba-btn sec" id="bmbaOut">Se déconnecter</button>');
    document.getElementById('bmbaOut').onclick = deconnecter;
  }

  function deconnecter(){ try{ sessionStorage.removeItem('bmba_dev'); }catch(e){} sb.auth.signOut().then(function(){ etat=null; ecranCourriel(); var u=document.querySelector('.bmba-user'); if(u) u.remove(); }); }

  // ---------- Déverrouillage de la page ----------
  function deverrouiller(){
    fermer();
    var el;
    if((el=document.getElementById('gate-overlay'))) el.remove();                              // espace donneur
    if((el=document.getElementById('gate'))) el.style.display='none';                           // espace receveur
    if((el=document.getElementById('loginPage'))){ el.style.display='none'; var m=document.getElementById('mainApp'); if(m) m.style.display='block'; if(typeof window.renderAll==='function'){ try{ window.renderAll(); }catch(e){} } } // portail pro
    document.body.style.overflow='';
    if(!document.querySelector('.bmba-user')){
      var u=document.createElement('div'); u.className='bmba-user';
      u.innerHTML='<span>👤 <b>'+(etat.nom||etat.email)+'</b> · '+etat.role+'</span><button type="button" title="Se déconnecter">Quitter</button>';
      u.querySelector('button').onclick=deconnecter; document.body.appendChild(u);
    }
    if(!etat.dev) sb.rpc('journaliser_acces', { p_espace: ESPACE }).then(function(){}, function(){});
    if(typeof window.bmbDeverrouiller==='function'){ try{ window.bmbDeverrouiller(etat); }catch(e){} }
    callbacks.forEach(function(fn){ try{ fn(etat); }catch(e){} });
  }

  // ---------- Orchestration ----------
  function suite(){
    if(etatDev()){ etat={ connecte:true, email:'developer', nom:'Développeur', role:'admin', dev:true }; deverrouiller(); return Promise.resolve(); }
    return sb.auth.getSession().then(function(s){
      if(!s.data || !s.data.session){ etat=null; var pre=''; try{ pre=localStorage.getItem('bmba_email')||''; }catch(e){} ecranCourriel(pre); return null; }
      return sb.rpc('mon_etat');
    }).then(function(r){
      if(r===null) return;
      if(r.error) throw r.error;
      etat = r.data || {};
      if(!etat.connecte){ ecranCourriel(); return; }
      if(!etat.acces){ ecranInvitation(); return; }
      if(!etat.nda_signe){ ecranNda(); return; }
      if((DROITS[etat.role]||[]).indexOf(ESPACE) < 0){ ecranRefus(); return; }
      deverrouiller();
    }).catch(function(e){ ecran('<div class="bmba-h">Connexion impossible</div><p class="bmba-p">'+msgErreur(e)+'</p><button class="bmba-btn" onclick="location.reload()">Réessayer</button>'+pied); });
  }

  function init(){
    masquerAnciensEcrans();
    if(!window.supabase || !window.supabase.createClient){
      ecran('<div class="bmba-h">Bibliothèque manquante</div><p class="bmba-p">Le composant de connexion n’a pas pu être chargé. Rechargez la page ou vérifiez votre connexion.</p><button class="bmba-btn" onclick="location.reload()">Recharger</button>');
      return;
    }
    sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON, { auth:{ persistSession:true, autoRefreshToken:true, detectSessionInUrl:true } });
    ecran('<div class="bmba-h">Vérification de votre accès…</div><p class="bmba-p">Un instant.</p>');
    sb.auth.getSession().then(function(){ return suite(); });
    sb.auth.onAuthStateChange(function(ev){ if(ev==='SIGNED_IN' && (!etat || !etat.connecte)) suite(); });
  }
  window.BeeAcces = { onDeverrouille:function(fn){ if(etat && wrap && wrap.style.display==='none') fn(etat); else callbacks.push(fn); }, etat:function(){ return etat; }, deconnecter:deconnecter, client:function(){ return sb; }, espace:ESPACE };
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
