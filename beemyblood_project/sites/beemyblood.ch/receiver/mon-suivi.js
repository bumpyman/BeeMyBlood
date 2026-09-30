/*
 * BeeMyBlood — Espace receveur : contenu construit à partir des données de la personne
 * Hors mode démonstration, l'espace affiche le profil saisi (groupe, phénotype étendu, anticorps, contacts)
 * et ce que la personne enregistre elle-même : mesures (hémoglobine, ferritine, SpO2), transfusions,
 * symptômes, prises du traitement, effets indésirables notés. Une personne qui arrive voit un espace
 * presque vide, qui se remplit au fil de son suivi. La patiente fictive n'apparaît qu'en mode démonstration.
 * Dépend de profil.js (BeeProfil). Les données suivent le profil : navigateur, et compte si la personne est connectée.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */
(function(){
  'use strict';
  function demo(){ return document.documentElement.classList.contains('bmb-demo'); }
  function P(){ return (window.BeeProfil && window.BeeProfil.lire()) || {}; }
  function V(){ return (window.BeeProfil && window.BeeProfil.valeurs()) || {}; }
  function esc(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;'); }
  function auj(){ var d = new Date(); return new Date(d.getTime() - d.getTimezoneOffset()*60000).toISOString().slice(0,10); }
  function dateFr(iso, court){ var d = new Date(iso); return isNaN(d) ? '' : d.toLocaleDateString('fr-CH', court ? { day:'numeric', month:'short' } : { day:'numeric', month:'long', year:'numeric' }); }
  function liste(k){ var l = (P()[k] || []).slice(); l.sort(function(a,b){ return a.d < b.d ? 1 : (a.d > b.d ? -1 : 0); }); return l; }
  function ajouter(k, o){ var p = P(); p[k] = (p[k] || []).concat([o]); window.BeeProfil.enregistrer(p); tout(); }
  function retirer(k, i){ var p = P(), l = liste(k); l.splice(i, 1); p[k] = l; window.BeeProfil.enregistrer(p); tout(); }
  function dire(type, msg){ if(typeof window.toast === 'function') window.toast(type, msg); }
  function vide(t){ return '<div style="font-size:.9rem;color:var(--td);line-height:1.6">'+t+'</div>'; }
  function carte(titre, corps, style){ return '<div class="cd"'+(style?' style="'+style+'"':'')+'><h3>'+titre+'</h3>'+corps+'</div>'; }
  function kpi(ico, val, lib, sous){ return '<div class="kpi">'+(ico?'<div style="font-size:1.25rem" aria-hidden="true">'+ico+'</div>':'')+'<div class="kv">'+val+'</div><div class="kl">'+lib+'</div>'+(sous?'<div class="ks">'+sous+'</div>':'')+'</div>'; }
  function dernier(champ){ return liste('mesures').filter(function(m){ return m[champ] !== undefined && m[champ] !== ''; })[0]; }
  function champ(id, lib, type, attr){ return '<div class="fg"><label for="'+id+'">'+lib+'</label><input class="fi" id="'+id+'" type="'+type+'" '+(attr||'')+'></div>'; }
  var DEMO_BTN = '<button type="button" class="btn bo bs2" data-bmb-demo="on">🎭 Voir la démonstration</button>';

  // ---------- Courbe (SVG, sans dépendance) ----------
  function courbe(points, unite, couleur){
    var pts = points.slice().reverse(); // du plus ancien au plus récent
    if(pts.length < 2) return vide('La courbe apparaît à partir de deux mesures.');
    var W = 600, H = 210, g = 46, d = 14, h = 16, b = 30, vals = pts.map(function(p){ return +p.v; });
    var min = Math.min.apply(null, vals), max = Math.max.apply(null, vals); if(min === max){ min -= 1; max += 1; }
    var marge = (max - min) * 0.15; min -= marge; max += marge;
    var x = function(i){ return g + i * (W - g - d) / (pts.length - 1); }, y = function(v){ return h + (max - v) * (H - h - b) / (max - min); };
    var chemin = pts.map(function(p, i){ return (i ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(+p.v).toFixed(1); }).join(' ');
    var s = '<svg viewBox="0 0 '+W+' '+H+'" role="img" aria-label="'+esc(pts.length+' mesures, de '+dateFr(pts[0].d)+' à '+dateFr(pts[pts.length-1].d)+', dernière valeur '+pts[pts.length-1].v+' '+unite)+'" style="width:100%;height:auto;display:block">';
    [0, 0.5, 1].forEach(function(t){ var v = min + (max - min) * t, yy = y(v); s += '<line x1="'+g+'" x2="'+(W-d)+'" y1="'+yy+'" y2="'+yy+'" stroke="currentColor" stroke-opacity=".15"/><text x="'+(g-6)+'" y="'+(yy+4)+'" text-anchor="end" font-size="12" fill="currentColor" fill-opacity=".7">'+(Math.abs(v) >= 100 ? Math.round(v) : v.toFixed(1))+'</text>'; });
    s += '<path d="'+chemin+'" fill="none" stroke="'+couleur+'" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>';
    pts.forEach(function(p, i){ s += '<circle cx="'+x(i).toFixed(1)+'" cy="'+y(+p.v).toFixed(1)+'" r="4" fill="'+couleur+'"><title>'+esc(dateFr(p.d)+' : '+p.v+' '+unite)+'</title></circle>'; });
    s += '<text x="'+g+'" y="'+(H-8)+'" font-size="12" fill="currentColor" fill-opacity=".7">'+esc(dateFr(pts[0].d, true))+'</text><text x="'+(W-d)+'" y="'+(H-8)+'" text-anchor="end" font-size="12" fill="currentColor" fill-opacity=".7">'+esc(dateFr(pts[pts.length-1].d, true))+'</text></svg>';
    return s;
  }
  function serie(ch){ return liste('mesures').filter(function(m){ return m[ch] !== undefined && m[ch] !== ''; }).map(function(m){ return { d:m.d, v:m[ch] }; }); }

  // ---------- Accueil ----------
  function prochaine(p){
    if(!p.prochaine || p.prochaine < auj()) return null;
    var j = Math.round((new Date(p.prochaine) - new Date(auj())) / 86400000);
    return { j:j, texte: j === 0 ? 'Aujourd’hui' : j === 1 ? 'Demain' : 'Dans '+j+' jours', date: dateFr(p.prochaine) };
  }
  function rendreAccueil(c){
    var p = P(), v = V(), hb = dernier('hb'), fe = dernier('fer'), pr = prochaine(p), nt = liste('transfusions').length, complet = window.BeeProfil.complet();
    var h = '<div class="hero"><h1>'+(p.prenom ? 'Bonjour '+esc(p.prenom)+' 👋' : 'Bienvenue 👋')+'</h1><p>'
      + (complet ? (p.pathologie ? esc(p.pathologie)+'. ' : '') + 'Cet espace rassemble vos mesures, vos transfusions et votre carte d’urgence.' : 'Cet espace est le vôtre. Commencez par votre profil : groupe sanguin, anticorps, centre de suivi. Votre carte d’urgence se construit à partir de ces informations.')
      + '</p><div style="display:flex;gap:.5rem;flex-wrap:wrap;margin-top:.75rem">'
      + '<button type="button" class="btn bp bs2" data-profil-ouvrir>'+(complet ? '✏️ Modifier mon profil' : '✏️ Compléter mon profil')+'</button>'
      + '<button type="button" class="btn bo bs2" data-rs="aller" data-v="suivi">＋ Ajouter une mesure</button><button type="button" class="btn bo bs2" data-rs="aller" data-v="profil">🆘 Ma carte d’urgence</button></div></div>';
    h += '<div class="g4">'
      + kpi('🩸', hb ? esc(hb.hb)+' g/dL' : '—', 'Hémoglobine', hb ? dateFr(hb.d) : 'Aucune mesure')
      + kpi('📅', pr ? pr.texte : '—', 'Prochaine transfusion', pr ? pr.date + (p.centre ? ' · '+esc(p.centre) : '') : 'Date à indiquer dans le profil')
      + kpi('⚗️', fe ? esc(fe.fer)+' µg/L' : '—', 'Ferritine', fe ? dateFr(fe.d) : 'Aucune mesure')
      + kpi('💉', String(nt), 'Transfusion'+(nt > 1 ? 's' : '')+' enregistrée'+(nt > 1 ? 's' : ''), nt ? 'Dernière : '+dateFr(liste('transfusions')[0].d) : '')
      + '</div>';
    h += '<div class="g2">' + carte('📊 Mon hémoglobine', serie('hb').length ? courbe(serie('hb'), 'g/dL', '#DC2626') : vide('Vos mesures d’hémoglobine apparaîtront ici. Ajoutez la valeur de votre dernier bilan dans « Suivi ».'))
      + carte('🧭 Pour commencer', '<ol style="margin:0 0 0 1.1rem;font-size:.9rem;line-height:1.9;color:var(--td)"><li>Complétez votre profil : groupe, phénotype étendu, anticorps, médecin référent.</li><li>Notez vos mesures et vos transfusions après chaque rendez-vous.</li><li>Gardez votre carte d’urgence à portée de main, imprimée ou sur votre téléphone.</li></ol>'
        + '<div style="margin-top:.75rem;font-size:.84rem;color:var(--tm);line-height:1.5">BeeMyBlood n’est pas encore relié à votre hôpital. Les données affichées sont celles que vous saisissez. Une patiente fictive illustre les fonctions prévues.</div><div style="margin-top:.5rem">'+DEMO_BTN+'</div>') + '</div>';
    c.innerHTML = h;
  }

  // ---------- Mon sang, carte d'urgence ----------
  function ligne(lib, val){ return '<tr><td style="color:var(--td)">'+lib+'</td><td>'+(val ? esc(val) : '<span style="color:var(--tm)">À compléter</span>')+'</td></tr>'; }
  function rendreSang(c){
    var p = P(), v = V();
    var identite = '<table class="dt">'+ligne('Groupe', p.groupe)+ligne('Phénotype étendu', v.phenoTexte)+ligne('Anticorps', p.anticorps)+ligne('Maladie suivie', p.pathologie)+ligne('Centre de suivi', p.centre)+ligne('Rythme des transfusions', p.rythme ? 'toutes les '+p.rythme+' semaines' : '')+'</table>'
      + '<div style="margin-top:.6rem"><button type="button" class="btn bo bs2" data-profil-ouvrir>✏️ Modifier mes informations</button></div>'
      + '<div style="margin-top:.6rem;font-size:.84rem;color:var(--tm);line-height:1.5">Le phénotype étendu et les anticorps figurent sur votre carte de groupe sanguin ou dans votre dossier transfusionnel. Ils guident le choix des poches compatibles.</div>';
    var carteU = '<div class="crisis-card" id="rs-carte"><div style="font-size:.82rem;color:var(--td);margin-bottom:.3rem">🆘 CARTE D’URGENCE</div>'
      + '<div class="blood-type">'+(p.groupe ? esc(p.groupe) : '?')+'</div>'
      + '<div style="font-size:.9rem;margin:.3rem 0"><strong>'+(v.nomComplet ? esc(v.nomComplet) : 'Nom à compléter')+'</strong>'+(v.resume ? ' · '+esc(v.resume) : '')+'</div>'
      + '<div style="font-size:.84rem;color:var(--td);line-height:1.6">'
      + (v.phenoTexte ? 'Phénotype : '+esc(v.phenoTexte)+'<br>' : '') + (p.anticorps ? 'Anticorps : '+esc(p.anticorps)+'<br>' : '')
      + (p.medecin ? 'Médecin référent : '+esc(p.medecin)+'<br>' : '') + (p.centre ? 'Centre de suivi : '+esc(p.centre)+'<br>' : '') + (p.urgence ? 'Personne à prévenir : '+esc(p.urgence) : '')
      + (!p.groupe && !p.anticorps && !p.medecin ? 'Complétez votre profil pour remplir cette carte.' : '') + '</div>'
      + '<div style="display:flex;gap:.4rem;justify-content:center;margin-top:.75rem;flex-wrap:wrap"><button type="button" class="btn bo bs2" data-rs="imprimer">🖨️ Imprimer ma carte</button></div></div>';
    c.innerHTML = '<div class="g2">' + carte('🧬 Identité sanguine', identite) + '<div>' + carteU + '</div></div>';
  }
  function imprimerCarte(){
    var el = document.getElementById('rs-carte'); if(!el) return;
    var w = window.open('', '_blank', 'width=480,height=640'); if(!w){ dire('warn', 'Autorisez les fenêtres pour imprimer la carte'); return; }
    var copie = el.cloneNode(true); copie.querySelectorAll('button').forEach(function(b){ b.remove(); });
    w.document.write('<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><title>Carte d’urgence</title><style>body{font-family:system-ui,sans-serif;padding:24px;color:#111}.crisis-card{border:2px solid #b3261e;border-radius:14px;padding:18px;max-width:360px;text-align:center}.blood-type{font-size:56px;font-weight:800;color:#b3261e}div{line-height:1.5}</style></head><body>'+copie.outerHTML+'<p style="font-size:12px;color:#555;max-width:360px">Carte établie par la personne elle-même avec BeeMyBlood. Elle ne remplace pas la carte de groupe sanguin officielle.</p></body></html>');
    w.document.close(); w.focus(); setTimeout(function(){ w.print(); }, 300);
  }

  // ---------- Suivi ----------
  function rendreSuivi(c){
    var ms = liste('mesures'), ts = liste('transfusions'), hb = dernier('hb'), fe = dernier('fer'), sp = dernier('spo2');
    var h = '<div class="g4">' + kpi('', hb ? esc(hb.hb) : '—', 'Hb (g/dL)', hb ? dateFr(hb.d) : '') + kpi('', fe ? esc(fe.fer) : '—', 'Ferritine (µg/L)', fe ? dateFr(fe.d) : '') + kpi('', sp ? esc(sp.spo2)+'%' : '—', 'SpO2', sp ? dateFr(sp.d) : '') + kpi('', String(ts.length), 'Transfusion'+(ts.length > 1 ? 's' : ''), ts.length ? 'Dernière : '+dateFr(ts[0].d) : '') + '</div>';
    h += '<div class="g2" style="margin-top:.75rem">'
      + carte('＋ Ajouter une mesure', '<form id="rs-form-mesure">' + champ('rs-m-date', 'Date', 'date', 'required max="'+auj()+'" value="'+auj()+'"') + champ('rs-m-hb', 'Hémoglobine (g/dL)', 'number', 'step="0.1" min="2" max="22" inputmode="decimal" placeholder="9.4"') + champ('rs-m-fer', 'Ferritine (µg/L)', 'number', 'step="1" min="0" max="30000" inputmode="numeric"') + champ('rs-m-spo2', 'SpO2 (%)', 'number', 'step="1" min="50" max="100" inputmode="numeric"')
        + '<button type="submit" class="btn bp" style="width:100%;justify-content:center">💾 Enregistrer la mesure</button><div style="font-size:.82rem;color:var(--tm);margin-top:.4rem">Reportez les valeurs de votre bilan. Laissez vide ce qui n’a pas été mesuré.</div></form>')
      + carte('＋ Ajouter une transfusion', '<form id="rs-form-transfusion">' + champ('rs-t-date', 'Date', 'date', 'required max="'+auj()+'" value="'+auj()+'"') + champ('rs-t-lieu', 'Lieu', 'text', 'placeholder="HUG, CHUV…" value="'+esc(P().centre || '')+'"') + champ('rs-t-n', 'Nombre de poches', 'number', 'step="1" min="1" max="8" inputmode="numeric"') + champ('rs-t-hb', 'Hémoglobine avant (g/dL)', 'number', 'step="0.1" min="2" max="22" inputmode="decimal"')
        + '<button type="submit" class="btn bp" style="width:100%;justify-content:center">💾 Enregistrer la transfusion</button></form>') + '</div>';
    h += '<div class="g2">' + carte('📈 Hémoglobine', serie('hb').length ? courbe(serie('hb'), 'g/dL', '#DC2626') : vide('Aucune mesure d’hémoglobine pour l’instant.')) + carte('🧲 Ferritine', serie('fer').length ? courbe(serie('fer'), 'µg/L', '#C8A960') : vide('Aucune mesure de ferritine pour l’instant.')) + '</div>';
    h += carte('🧪 Mes mesures', ms.length ? '<div style="overflow-x:auto"><table class="dt"><thead><tr><th>Date</th><th>Hb</th><th>Ferritine</th><th>SpO2</th><th></th></tr></thead><tbody>' + ms.map(function(m, i){ return '<tr><td>'+esc(dateFr(m.d))+'</td><td>'+(m.hb ? esc(m.hb) : '—')+'</td><td>'+(m.fer ? esc(m.fer) : '—')+'</td><td>'+(m.spo2 ? esc(m.spo2)+'%' : '—')+'</td><td><button type="button" class="btn bo bs2" data-rs="retirer" data-k="mesures" data-i="'+i+'" aria-label="Retirer la mesure du '+esc(dateFr(m.d))+'">✕</button></td></tr>'; }).join('') + '</tbody></table></div>' : vide('Vos mesures s’affichent ici au fur et à mesure.'));
    h += carte('📋 Mes transfusions', ts.length ? '<div style="overflow-x:auto"><table class="dt"><thead><tr><th>Date</th><th>Lieu</th><th>Poches</th><th>Hb avant</th><th></th></tr></thead><tbody>' + ts.map(function(t, i){ return '<tr><td>'+esc(dateFr(t.d))+'</td><td>'+(t.l ? esc(t.l) : '—')+'</td><td>'+(t.n ? esc(t.n) : '—')+'</td><td>'+(t.hb ? esc(t.hb) : '—')+'</td><td><button type="button" class="btn bo bs2" data-rs="retirer" data-k="transfusions" data-i="'+i+'" aria-label="Retirer la transfusion du '+esc(dateFr(t.d))+'">✕</button></td></tr>'; }).join('') + '</tbody></table></div>' : vide('Aucune transfusion enregistrée. Ajoutez-les après chaque séance pour suivre votre rythme.'));
    c.innerHTML = h;
  }

  // ---------- Traitement chélateur ----------
  function serieJours(prises){ var n = 0, d = new Date(auj()); if(prises.indexOf(auj()) < 0) d.setDate(d.getDate() - 1); while(prises.indexOf(d.toISOString().slice(0,10)) >= 0){ n++; d.setDate(d.getDate() - 1); } return n; }
  function rendreChelation(c){
    var prises = (P().prises || []), fait = prises.indexOf(auj()) >= 0, n = serieJours(prises), jours = '';
    for(var i = 6; i >= 0; i--){ var d = new Date(auj()); d.setDate(d.getDate() - i); var iso = d.toISOString().slice(0,10), ok = prises.indexOf(iso) >= 0; jours += '<div class="streak-d'+(ok ? ' streak-ok' : '')+'" title="'+esc(dateFr(iso))+'">'+(ok ? '✓' : d.toLocaleDateString('fr-CH', { weekday:'narrow' }))+'</div>'; }
    c.innerHTML = carte('💊 Mon traitement', '<div style="display:flex;align-items:center;gap:1rem;margin-bottom:.5rem"><div style="font-size:2.55rem;font-weight:800;font-family:var(--fd);color:var(--grn)">'+n+'</div><div><div style="font-size:.9rem;font-weight:600">jour'+(n > 1 ? 's' : '')+' consécutif'+(n > 1 ? 's' : '')+'</div><div style="font-size:.82rem;color:var(--td)">'+prises.length+' prise'+(prises.length > 1 ? 's' : '')+' notée'+(prises.length > 1 ? 's' : '')+' au total</div></div></div>'
      + '<div style="font-size:.84rem;color:var(--td);margin-bottom:.3rem">Les sept derniers jours</div><div class="streak">'+jours+'</div>'
      + '<button type="button" class="btn '+(fait ? 'bo' : 'bp')+'" style="width:100%;justify-content:center;margin-top:.75rem" data-rs="prise">'+(fait ? '↩️ Annuler la prise d’aujourd’hui' : '✅ Pris aujourd’hui')+'</button>'
      + '<div style="margin-top:.5rem;font-size:.84rem;color:var(--tm);line-height:1.5">Notez ici chaque prise de votre chélateur du fer. La dose et l’horaire sont ceux que votre médecin a prescrits.</div>');
  }

  // ---------- Symptômes ----------
  function rendreSymptomes(c){
    var l = liste('symptomes');
    c.innerHTML = carte('📒 Mon journal', l.length ? l.slice(0, 12).map(function(s, i){ return '<div style="padding:.5rem 0;border-bottom:1px solid var(--db);font-size:.88rem;line-height:1.5"><div style="display:flex;justify-content:space-between;gap:.5rem;align-items:center"><strong>'+esc(dateFr(s.d))+'</strong><button type="button" class="btn bo bs2" data-rs="retirer" data-k="symptomes" data-i="'+i+'" aria-label="Retirer l’entrée du '+esc(dateFr(s.d))+'">✕</button></div><div style="color:var(--td)">Fatigue '+esc(s.f)+'/10 · Essoufflement '+esc(s.e)+'/10 · Douleurs '+esc(s.p)+'/10'+(s.spo2 ? ' · SpO2 '+esc(s.spo2)+'%' : '')+(s.signes ? '<br>'+esc(s.signes) : '')+(s.n ? '<br>« '+esc(s.n)+' »' : '')+'</div></div>'; }).join('') : vide('Votre journal est vide. Enregistrez vos symptômes avec le formulaire : ils s’ajoutent ici, du plus récent au plus ancien.'))
      + carte('📊 Fatigue', (function(){ var s = l.map(function(x){ return { d:x.d, v:x.f }; }); return s.length ? courbe(s.slice(0, 14), '/10', '#f59e0b') : vide('La courbe apparaît à partir de deux entrées.'); })())
      + carte('🚨 Quand consulter', '<div style="font-size:.88rem;color:var(--td);line-height:1.6">Une fatigue ou un essoufflement qui s’aggravent, de la fièvre, des urines foncées ou des douleurs inhabituelles justifient un appel à votre service d’hématologie. En cas de malaise ou de détresse respiratoire, appelez le <strong style="color:var(--red)">144</strong>.<br><span style="color:var(--tm);font-size:.84rem">BeeMyBlood ne transmet pas encore vos symptômes à votre équipe soignante.</span></div>', 'border-color:rgba(220,38,38,.2)');
  }
  function enregistrerSymptomes(){
    var vue = document.getElementById('v-symptomes'), g = function(id){ var e = document.getElementById(id); return e ? e.value : ''; };
    var signes = [].slice.call(vue.querySelectorAll('.fr input[type=checkbox]:checked')).map(function(x){ return x.parentNode.textContent.trim(); }).join(', ');
    var sp = vue.querySelector('input[type=number]'), f = +g('symF'), e = +g('symD');
    ajouter('symptomes', { d:auj(), f:String(f), e:String(e), p:g('symP'), signes:signes, spo2: sp && sp.value ? sp.value : '', n:g('symNotes').trim().slice(0, 400) });
    var notes = document.getElementById('symNotes'); if(notes) notes.value = '';
    dire('ok', 'Symptômes enregistrés dans votre journal');
    if((f >= 7 && e >= 6) || (sp && sp.value && +sp.value < 95)) setTimeout(function(){ dire('warn', 'Ces symptômes méritent un avis : contactez votre service d’hématologie. En cas de malaise, appelez le 144.'); }, 1200);
  }

  // ---------- Chronologie ----------
  function rendreTimeline(c){
    var ev = [];
    liste('transfusions').forEach(function(t){ ev.push({ d:t.d, t:'🩸 Transfusion'+(t.l ? ' · '+t.l : ''), s:[t.n ? t.n+' poche'+(+t.n > 1 ? 's' : '') : '', t.hb ? 'Hb avant '+t.hb+' g/dL' : ''].filter(Boolean).join(' · ') }); });
    liste('mesures').forEach(function(m){ ev.push({ d:m.d, t:'🧪 Bilan', s:[m.hb ? 'Hb '+m.hb+' g/dL' : '', m.fer ? 'Ferritine '+m.fer+' µg/L' : '', m.spo2 ? 'SpO2 '+m.spo2+'%' : ''].filter(Boolean).join(' · ') }); });
    liste('signalements').forEach(function(s){ ev.push({ d:s.d, t:'⚠️ Effet indésirable noté', s:[s.type, s.g].filter(Boolean).join(' · ') }); });
    ev.sort(function(a,b){ return a.d < b.d ? 1 : -1; });
    c.innerHTML = carte('📜 Mon parcours', ev.length ? ev.map(function(e){ return '<div class="life-event"><div class="life-year" style="min-width:92px">'+esc(dateFr(e.d, true))+'<br><span style="font-size:.75em;opacity:.7">'+esc(String(e.d).slice(0,4))+'</span></div><div class="life-content"><h4>'+esc(e.t)+'</h4><p>'+esc(e.s)+'</p></div></div>'; }).join('') : vide('Votre chronologie se construit avec vos transfusions, vos bilans et les effets indésirables que vous notez. Elle est vide pour l’instant.'));
  }

  // ---------- Vues en préparation, accompagnant, communauté, paramètres ----------
  function enPreparation(titre, texte){ return carte(titre, vide(texte) + '<div style="margin-top:.6rem">'+DEMO_BTN+'</div>'); }
  function rendreTwin(c){
    var nh = serie('hb').length, nt = liste('transfusions').length;
    c.innerHTML = enPreparation('🔮 Prévision de votre hémoglobine', 'Le jumeau numérique estimera la date de votre prochaine transfusion à partir de votre propre historique. Il lui faut au moins six mesures d’hémoglobine et trois transfusions, et une validation médicale avant toute mise en service. Vous avez enregistré '+nh+' mesure'+(nh > 1 ? 's' : '')+' et '+nt+' transfusion'+(nt > 1 ? 's' : '')+'. La démonstration montre le principe avec une patiente fictive.');
  }
  function rendreAccomp(c){
    var p = P(), hb = dernier('hb'), pr = prochaine(p);
    c.innerHTML = carte('📋 Résumé pour la personne qui vous accompagne', '<div class="g2"><div style="font-size:.92rem;color:var(--td);line-height:1.8">'
      + '<div>🩸 <strong style="color:var(--txt)">Hémoglobine :</strong> '+(hb ? esc(hb.hb)+' g/dL, le '+esc(dateFr(hb.d)) : 'aucune mesure enregistrée')+'</div>'
      + '<div>📅 <strong style="color:var(--txt)">Prochaine transfusion :</strong> '+(pr ? esc(pr.date)+(p.centre ? ', '+esc(p.centre) : '') : 'date à indiquer dans le profil')+'</div>'
      + '<div>👩‍⚕️ <strong style="color:var(--txt)">Médecin référent :</strong> '+(p.medecin ? esc(p.medecin) : 'à compléter')+'</div>'
      + '<div>📞 <strong style="color:var(--txt)">Personne à prévenir :</strong> '+(p.urgence ? esc(p.urgence) : 'à compléter')+'</div></div>'
      + '<div style="padding:.65rem;background:var(--dk3);border-radius:8px;font-size:.88rem;color:var(--td);line-height:1.6"><strong style="color:var(--gold)">En cas d’urgence</strong><br>Malaise ou perte de connaissance : <strong style="color:var(--red)">144</strong><br>Fièvre au-dessus de 38 °C après une transfusion : le service d’hématologie qui vous suit<br>Urines très foncées : les urgences</div></div>'
      + '<div style="margin-top:.6rem;font-size:.84rem;color:var(--tm)">Le partage de ce résumé avec un proche, par invitation, est en préparation.</div>');
  }
  function rendreParams(c){
    c.innerHTML = carte('🪪 Mes données', '<div style="font-size:.9rem;color:var(--td);line-height:1.6;margin-bottom:.6rem">Votre espace affiche votre profil et ce que vous enregistrez : mesures, transfusions, symptômes. Ces données restent dans ce navigateur et, si vous êtes connecté·e, dans votre compte BeeMyBlood hébergé en Suisse.</div>'
      + '<div style="display:flex;gap:.4rem;flex-wrap:wrap;margin-bottom:.75rem"><button type="button" class="btn bp bs2" data-profil-ouvrir>✏️ Modifier mon profil</button><button type="button" class="btn bo bs2" data-rs="exporter">📦 Exporter mes données</button></div>'
      + '<label style="display:flex;align-items:center;gap:.75rem;padding:.75rem;background:var(--dk3);border-radius:8px;cursor:pointer"><input type="checkbox" data-bmb-demo-case style="width:22px;height:22px;accent-color:var(--gold);flex:none"><span><strong>Afficher les données de démonstration</strong><br><span style="font-size:.84rem;color:var(--td);line-height:1.5">Une patiente fictive, Eleonora, illustre les fonctions prévues : jumeau numérique, HemoSnap, liens avec l’hôpital. Sans cette option, l’espace affiche vos données.</span></span></label>');
  }
  function exporter(){
    var b = new Blob([JSON.stringify(P(), null, 2)], { type:'application/json' }), a = document.createElement('a');
    a.href = URL.createObjectURL(b); a.download = 'beemyblood-mes-donnees-'+auj()+'.json'; document.body.appendChild(a); a.click(); setTimeout(function(){ URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }
  function rendreSignalements(c){
    var l = liste('signalements');
    c.innerHTML = l.length ? '<table class="dt"><thead><tr><th>Date</th><th>Type</th><th>Gravité</th><th></th></tr></thead><tbody>' + l.map(function(s, i){ return '<tr><td>'+esc(dateFr(s.d))+'</td><td>'+esc(s.type || '—')+'</td><td>'+esc(s.g || '—')+'</td><td><button type="button" class="btn bo bs2" data-rs="retirer" data-k="signalements" data-i="'+i+'" aria-label="Retirer le signalement du '+esc(dateFr(s.d))+'">✕</button></td></tr>'; }).join('') + '</tbody></table>' : vide('Aucun effet indésirable noté.');
  }
  function noterSignalement(){
    var d = document.getElementById('rDate').value, lieu = document.getElementById('rLieu').value;
    if(!d){ dire('warn', 'Indiquez la date'); return; }
    var t = document.querySelector('input[name=rt]:checked'), g = document.querySelector('input[name=rg]:checked');
    ajouter('signalements', { d:d, l:lieu, type: t ? t.parentNode.textContent.trim() : '', g: g ? g.parentNode.textContent.trim() : '', n: document.getElementById('rDesc').value.trim().slice(0, 600) });
    document.getElementById('rDesc').value = '';
    dire('ok', 'Noté dans votre journal');
    setTimeout(function(){ dire('warn', 'BeeMyBlood ne transmet pas encore les signalements. Prévenez votre équipe soignante.'); }, 1200);
  }

  function tout(){
    if(!window.BeeProfil) return;
    if(!demo()){
      var m = { 'rs-accueil':rendreAccueil, 'rs-profil':rendreSang, 'rs-suivi':rendreSuivi, 'rs-chelation':rendreChelation, 'rs-symptomes':rendreSymptomes, 'rs-timeline':rendreTimeline, 'rs-twin':rendreTwin, 'rs-accomp':rendreAccomp, 'rs-params':rendreParams, 'rs-signalements':rendreSignalements,
        'rs-snap': function(c){ c.innerHTML = enPreparation('📱 Estimation par la caméra', 'HemoSnap est un prototype de recherche : l’estimation de l’hémoglobine par le flash et la caméra du téléphone n’est pas encore disponible ni validée. La démonstration en montre le principe.'); },
        'rs-communaute': function(c){ c.innerHTML = enPreparation('🤝 Entre receveurs', 'Les témoignages, le parrainage entre patients et le soutien par des professionnels ouvriront avec la phase pilote. Les associations et les lignes d’aide ci-dessous sont déjà à votre disposition.'); } };
      Object.keys(m).forEach(function(id){ var c = document.getElementById(id); if(c) m[id](c); });
      // les formulaires existants enregistrent réellement
      window.saveSym = enregistrerSymptomes; window.submitReport = noterSignalement;
    }
    window.BeeProfil.appliquer();
  }

  document.addEventListener('click', function(ev){
    var b = ev.target.closest('[data-rs]'); if(!b) return; var a = b.getAttribute('data-rs');
    if(a === 'aller' && typeof window.go === 'function') window.go(b.getAttribute('data-v'));
    if(a === 'retirer' && confirm('Retirer cette entrée ?')) retirer(b.getAttribute('data-k'), +b.getAttribute('data-i'));
    if(a === 'imprimer') imprimerCarte();
    if(a === 'exporter') exporter();
    if(a === 'prise'){ var p = P(), l = (p.prises || []).slice(), i = l.indexOf(auj()); if(i >= 0) l.splice(i, 1); else l.push(auj()); p.prises = l.slice(-730); window.BeeProfil.enregistrer(p); tout(); }
  });
  document.addEventListener('submit', function(ev){
    var g = function(id){ var e = document.getElementById(id); return e ? String(e.value).trim() : ''; };
    if(ev.target.id === 'rs-form-mesure'){
      ev.preventDefault(); var m = { d:g('rs-m-date') }; if(g('rs-m-hb')) m.hb = g('rs-m-hb'); if(g('rs-m-fer')) m.fer = g('rs-m-fer'); if(g('rs-m-spo2')) m.spo2 = g('rs-m-spo2');
      if(!m.d || (!m.hb && !m.fer && !m.spo2)){ dire('warn', 'Indiquez la date et au moins une valeur'); return; }
      ajouter('mesures', m); dire('ok', 'Mesure enregistrée');
    }
    if(ev.target.id === 'rs-form-transfusion'){
      ev.preventDefault(); if(!g('rs-t-date')){ dire('warn', 'Indiquez la date'); return; }
      ajouter('transfusions', { d:g('rs-t-date'), l:g('rs-t-lieu'), n:g('rs-t-n'), hb:g('rs-t-hb') }); dire('ok', 'Transfusion enregistrée');
    }
  });
  document.addEventListener('bmb-profil', tout);
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function(){ setTimeout(tout, 60); }); else setTimeout(tout, 60);
})();
