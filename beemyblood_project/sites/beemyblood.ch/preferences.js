/*
 * BeeMyBlood — Panneau natif de préférences d'affichage (étape 7 du brief accessibilité)
 * Trois réglages : taille du texte, contraste, animations. Rien d'autre (pas de lecture
 * vocale : les personnes concernées utilisent déjà leur propre lecteur d'écran).
 * Choix mémorisés en localStorage. Un script minimal en tête de chaque page applique déjà
 * ces choix avant le premier rendu (voir le <script> inline juste avant ce fichier) ;
 * ce fichier-ci construit seulement le bouton et le panneau.
 * Inclure sur toute page de l'espace donneur et sur la page de connexion :
 *   <script src="preferences.js" defer></script>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */
(function(){
  var CLES = { taille:'bmb-taille', contraste:'bmb-contraste', animations:'bmb-animations' };

  function lire(cle, defaut){ try{ return localStorage.getItem(cle) || defaut; }catch(e){ return defaut; } }
  function ecrire(cle, val){ try{ localStorage.setItem(cle, val); }catch(e){} }

  function appliquer(reglages){
    var r = document.documentElement;
    if(reglages.taille && reglages.taille !== 'normale') r.setAttribute('data-taille', reglages.taille); else r.removeAttribute('data-taille');
    if(reglages.contraste === 'renforce') r.setAttribute('data-contraste', 'renforce'); else r.removeAttribute('data-contraste');
    if(reglages.animations === 'reduites') r.setAttribute('data-animations', 'reduites'); else r.removeAttribute('data-animations');
  }

  var css = '#bmb-prefs-panel{position:fixed;top:60px;right:12px;z-index:100060;width:290px;max-width:calc(100vw - 24px);background:var(--couleur-fond,#fff);color:var(--couleur-texte,#1A1A1A);border:1px solid var(--couleur-bordure,#767676);border-radius:12px;box-shadow:0 12px 36px rgba(0,0,0,.25);padding:16px;font:14px/1.5 "DM Sans",system-ui,sans-serif}'
    + '#bmb-prefs-panel[hidden]{display:none}'
    + '#bmb-prefs-panel h2{font-size:15px;margin:0 0 12px}'
    + '#bmb-prefs-panel fieldset{border:0;padding:0;margin:0 0 14px}'
    + '#bmb-prefs-panel legend{font-size:12px;font-weight:700;color:var(--couleur-texte-secondaire,#595959);text-transform:uppercase;letter-spacing:.4px;padding:0;margin-bottom:6px}'
    + '#bmb-prefs-panel .bmb-pref-row{display:flex;align-items:center;gap:8px;padding:4px 0;cursor:pointer}'
    + '#bmb-prefs-panel .bmb-pref-row input{margin:0;accent-color:var(--couleur-principale,#B3261E);width:16px;height:16px;flex-shrink:0}'
    + '#bmb-prefs-panel .bmb-pref-close{position:absolute;top:10px;right:10px;background:none;border:none;font-size:18px;line-height:1;cursor:pointer;color:var(--couleur-texte-secondaire,#595959);padding:4px}'
    + '.bmb-prefs-fallback-btn{position:fixed;top:10px;right:10px;z-index:100055;width:36px;height:36px;border-radius:50%;border:1px solid rgba(0,0,0,.15);background:#fff;color:#1A1A1A;font-size:16px;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 10px rgba(0,0,0,.15)}'
    + '#bmb-prefs-btn[aria-expanded="true"]{outline:2px solid var(--couleur-focus,#0B72B9)}';
  var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  function creerPanneau(){
    var p = document.createElement('div');
    p.id = 'bmb-prefs-panel';
    p.setAttribute('role', 'dialog');
    p.setAttribute('aria-labelledby', 'bmb-prefs-titre');
    p.hidden = true;
    p.innerHTML =
      '<button type="button" class="bmb-pref-close" aria-label="Fermer les préférences">✕</button>' +
      '<h2 id="bmb-prefs-titre">Préférences d\'affichage</h2>' +
      '<fieldset><legend>Taille du texte</legend>' +
        radio('taille','normale','Normale') + radio('taille','grande','Grande') + radio('taille','tres-grande','Très grande') +
      '</fieldset>' +
      '<fieldset><legend>Contraste</legend>' +
        radio('contraste','normal','Normal') + radio('contraste','renforce','Renforcé') +
      '</fieldset>' +
      '<fieldset><legend>Animations</legend>' +
        radio('animations','activees','Activées') + radio('animations','reduites','Réduites') +
      '</fieldset>';
    document.body.appendChild(p);
    return p;
  }
  function radio(groupe, valeur, libelle){
    var id = 'bmb-pref-' + groupe + '-' + valeur;
    return '<label class="bmb-pref-row" for="' + id + '"><input type="radio" name="bmb-pref-' + groupe + '" id="' + id + '" value="' + valeur + '"><span>' + libelle + '</span></label>';
  }

  function init(){
    var reglages = { taille: lire(CLES.taille,'normale'), contraste: lire(CLES.contraste,'normal'), animations: lire(CLES.animations,'activees') };
    appliquer(reglages); // au cas où le script d'anti-clignotement n'aurait pas tourné (ex. page sans ce snippet)

    var btn = document.getElementById('bmb-prefs-btn');
    if(!btn){
      btn = document.createElement('button');
      btn.type = 'button';
      btn.id = 'bmb-prefs-btn';
      btn.className = 'bmb-prefs-fallback-btn';
      btn.setAttribute('aria-label', 'Préférences d\'affichage');
      btn.title = 'Préférences d\'affichage';
      btn.textContent = '⚙️';
      document.body.appendChild(btn);
    }
    btn.setAttribute('aria-haspopup', 'dialog');
    btn.setAttribute('aria-expanded', 'false');
    btn.setAttribute('aria-controls', 'bmb-prefs-panel');

    var panel = creerPanneau();
    for (var groupe in CLES) {
      var input = panel.querySelector('input[name="bmb-pref-' + groupe + '"][value="' + reglages[groupe] + '"]');
      if (input) input.checked = true;
    }
    panel.addEventListener('change', function(e){
      var t = e.target;
      if (t.tagName !== 'INPUT') return;
      var groupe = t.name.replace('bmb-pref-', '');
      reglages[groupe] = t.value;
      ecrire(CLES[groupe], t.value);
      appliquer(reglages);
    });

    function ouvrir(){
      panel.hidden = false;
      btn.setAttribute('aria-expanded', 'true');
      var premier = panel.querySelector('input:checked') || panel.querySelector('input');
      if (premier) premier.focus();
      document.addEventListener('keydown', surEchap);
      document.addEventListener('click', surClicExterieur, true);
    }
    function fermer(){
      panel.hidden = true;
      btn.setAttribute('aria-expanded', 'false');
      btn.focus();
      document.removeEventListener('keydown', surEchap);
      document.removeEventListener('click', surClicExterieur, true);
    }
    function surEchap(e){ if (e.key === 'Escape') fermer(); }
    function surClicExterieur(e){ if (!panel.contains(e.target) && e.target !== btn) fermer(); }

    btn.addEventListener('click', function(){ panel.hidden ? ouvrir() : fermer(); });
    panel.querySelector('.bmb-pref-close').addEventListener('click', fermer);

    window.BeePrefs = { ouvrir: ouvrir, fermer: fermer, reglages: function(){ return reglages; } };
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
