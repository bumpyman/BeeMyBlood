<?php
/**
 * BeeMyBlood — Le questionnaire des HUG est-il toujours celui que le site remplit ?
 *
 * Le site reporte les réponses dans le formulaire officiel du 1er février 2026 (donor/assets/hug-questionnaire-v01-fev26.pdf).
 * Une fois par jour, ce script compare ce fichier avec celui que publient les HUG. Si l'empreinte diffère ou si
 * l'adresse a disparu, la page du questionnaire avertit la personne et le fichier doit être mis à jour
 * (fichier, libellés, carte des cases : voir donor/assets/questionnaire-hug.js).
 *
 * Réponse : {"ajour": true | false | null, "motif": "...", "verifie": "date ISO"}   (null : vérification impossible)
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */
ini_set('display_errors', '0');
error_reporting(E_ALL & ~E_DEPRECATED & ~E_WARNING & ~E_NOTICE);
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: public, max-age=3600');

$URL = 'https://www.hug.ch/sites/interhug/files/structures/don_du_sang/cts-questionnairedondusangv01fev26.pdf';
$EMPREINTE = '9020c62d4b41e991958881bb7e07f83392cb0759ed32341b99cd99b51ade6405'; // SHA-256 du fichier embarqué
$cache = __DIR__ . '/cache/questionnaire-hug.json';

if (is_file($cache) && (time() - filemtime($cache)) < 86400) { readfile($cache); exit; }

$etat = ['ajour' => null, 'motif' => 'vérification impossible', 'verifie' => date('c')];
if (function_exists('curl_init')) {
    $ch = curl_init($URL);
    curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 15, CURLOPT_FOLLOWLOCATION => true, CURLOPT_USERAGENT => 'BeeMyBlood/0.7 (+https://www.beemyblood.ch)']);
    $corps = curl_exec($ch);
    $code = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    if ($code === 200 && is_string($corps) && strncmp($corps, '%PDF', 4) === 0) {
        $meme = hash('sha256', $corps) === $EMPREINTE;
        $etat = ['ajour' => $meme, 'motif' => $meme ? 'fichier identique' : 'fichier modifié par les HUG', 'verifie' => date('c')];
    } elseif ($code === 404 || $code === 410) {
        $etat = ['ajour' => false, 'motif' => 'adresse retirée par les HUG (nouvelle version probable)', 'verifie' => date('c')];
    }
}
$json = json_encode($etat, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
if ($etat['ajour'] !== null) { if (!is_dir(__DIR__ . '/cache')) @mkdir(__DIR__ . '/cache', 0755, true); @file_put_contents($cache, $json); }
echo $json;
