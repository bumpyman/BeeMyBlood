<?php
/**
 * BeeMyBlood — Annonces et événements des centres de transfusion
 * Lit les pages publiques des HUG : annonces du centre de transfusion (hug.ch/don-du-sang)
 * et événements de l'agenda liés au don du sang (crêpes, glaces, journée mondiale…).
 * Fonctions pures : elles reçoivent le HTML et renvoient des tableaux, donnees.php se charge des requêtes et du cache.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

function bmb_c_texte($h) {
    $h = preg_replace('#</(p|div|li|h\d)>|<br\s*/?>#i', ' ', (string) $h);
    return trim(preg_replace('/\s+/u', ' ', html_entity_decode(strip_tags($h), ENT_QUOTES | ENT_HTML5, 'UTF-8')));
}

function bmb_c_couper($s, $n) { return function_exists('mb_substr') ? mb_substr($s, 0, $n) : substr($s, 0, $n); }
function bmb_c_minuscules($s) { return function_exists('mb_strtolower') ? mb_strtolower($s) : strtolower($s); }

/** Cartes d'annonce de la page du centre de transfusion des HUG. */
function bmb_annonces_hug($html) {
    $out = []; $vus = [];
    $parts = preg_split('#paragraph--type--hug-paragraphs-card-img#', (string) $html);
    array_shift($parts);
    foreach ($parts as $bloc) {
        $bloc = substr($bloc, 0, 7000);
        if (!preg_match('#field--name-field-ph-card-img-title.*?<div class="field__item">(.*?)</div>#s', $bloc, $m)) continue;
        $titre = bmb_c_texte($m[1]);
        if ($titre === '' || isset($vus[$titre])) continue;
        $vus[$titre] = 1;
        $texte = '';
        if (preg_match('#field--name-field-ph-card-img-description.*?<div class="field__item">(.*?)</div>#s', $bloc, $m2)) $texte = bmb_c_texte($m2[1]);
        $url = 'https://www.hug.ch/don-du-sang';
        if (preg_match('#<a[^>]+href="([^"\#][^"]*)"#', $bloc, $m3)) {
            $u = $m3[1];
            if (strpos($u, '/www.') === 0) $u = 'https://' . substr($u, 1);
            elseif ($u[0] === '/') $u = 'https://www.hug.ch' . $u;
            if (strpos($u, 'https://') === 0) $url = $u;
        }
        $out[] = ['type' => 'annonce', 'titre' => $titre, 'texte' => bmb_c_couper($texte, 260), 'url' => $url, 'source' => 'Centre de transfusion des HUG'];
        if (count($out) >= 3) break;
    }
    return $out;
}

/** Événements de l'agenda des HUG qui concernent le don du sang. */
function bmb_evenements_hug($html) {
    $out = [];
    $parts = preg_split('#<div class="views-field views-field-event-image">#', (string) $html);
    array_shift($parts);
    foreach ($parts as $li) {
        if (!preg_match('#views-field-title.*?<a href="(/evenement/[^"]+)"[^>]*>(.*?)</a>#s', $li, $m)) continue;
        $titre = bmb_c_texte($m[2]); $chemin = $m[1];
        if (!preg_match('/sang|transfus|plaquette|donneu/iu', $titre . ' ' . $chemin)) continue;
        $date = '';
        if (preg_match('#<span class="day">(.*?)</span>\s*<span class="month">(.*?)</span>#s', $li, $d)) $date = bmb_c_texte($d[1]) . ' ' . bmb_c_minuscules(bmb_c_texte($d[2]));
        $out[] = ['type' => 'evenement', 'titre' => $titre, 'date' => $date, 'texte' => '', 'url' => 'https://www.hug.ch' . $chemin, 'source' => 'Agenda des HUG'];
        if (count($out) >= 5) break;
    }
    return $out;
}

/** Détail d'une page d'événement : résumé, date lisible, date ISO. */
function bmb_evenement_detail($html) {
    $r = ['texte' => '', 'quand' => '', 'date_iso' => null];
    if (preg_match('#text-formatted field field--name-body[^>]*>(.*?)</div>#s', (string) $html, $m)) $r['texte'] = bmb_c_couper(bmb_c_texte($m[1]), 260);
    if (preg_match('#field--name-field-event-date.*?<time datetime="([^"]+)"[^>]*>(.*?)</time>#s', (string) $html, $m)) { $r['date_iso'] = substr($m[1], 0, 10); $r['quand'] = bmb_c_texte($m[2]); }
    if (preg_match('#<h2>\s*Quand\s*\?\s*</h2>.*?field--name-field-ph-text-content[^>]*>(.*?)</div>#s', (string) $html, $m)) { $q = bmb_c_texte($m[1]); if ($q !== '') $r['quand'] = bmb_c_couper($q, 120); }
    return $r;
}
