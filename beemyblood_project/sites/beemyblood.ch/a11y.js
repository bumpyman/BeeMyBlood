/*
 * BeeMyBlood — Accessibilité commune aux pages hors espace donneur
 * Ajoute le lien d'évitement, le repère principal, l'annonce des liens qui ouvrent une nouvelle fenêtre
 * et l'accès au clavier des éléments cliquables. Complète a11y.css.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */
(function(){
  'use strict';
  function init(){
    if(!document.querySelector('.lien-evitement')){
      var cible = document.querySelector('main,[role="main"],#contenu,#mainApp,.app,h1');
      if(cible){
        if(!cible.id) cible.id = 'contenu';
        if(!cible.hasAttribute('tabindex')) cible.setAttribute('tabindex','-1');
        if(cible.tagName !== 'MAIN' && cible.tagName !== 'H1' && !cible.getAttribute('role') && !document.querySelector('main,[role="main"]')) cible.setAttribute('role','main');
        var a = document.createElement('a'); a.className = 'lien-evitement'; a.href = '#' + cible.id; a.textContent = 'Aller au contenu';
        document.body.insertBefore(a, document.body.firstChild);
      }
    }
    if(!document.getElementById('ext-link-notice')){
      var n = document.createElement('span'); n.id = 'ext-link-notice'; n.className = 'sr-only'; n.textContent = '(ouvre une nouvelle fenêtre)'; document.body.appendChild(n);
    }
    marquer();
    setTimeout(marquer, 2500); // contenus rendus après le chargement
  }
  function marquer(){
    document.querySelectorAll('a[target="_blank"]:not([aria-describedby])').forEach(function(a){
      a.setAttribute('aria-describedby','ext-link-notice');
      if(!/noopener/.test(a.getAttribute('rel') || '')) a.setAttribute('rel', ((a.getAttribute('rel') || '') + ' noopener').trim());
    });
    document.querySelectorAll('div[onclick]:not([role]):not([tabindex]),span[onclick]:not([role]):not([tabindex]),li[onclick]:not([role]):not([tabindex])').forEach(function(el){
      if(/overlay|modal|backdrop|gate/i.test(el.className || '') || !(el.textContent || '').trim()) return;
      el.setAttribute('role','button'); el.setAttribute('tabindex','0');
    });
  }
  document.addEventListener('keydown', function(e){
    var t = e.target;
    if((e.key === 'Enter' || e.key === ' ') && t && t.getAttribute && t.getAttribute('role') === 'button' && t.tagName !== 'BUTTON' && t.hasAttribute('onclick')){ e.preventDefault(); t.click(); }
  });
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
