<?php
/**
 * BeeMyBlood — données du jour (stocks officiels, collectes, actualités)
 * GET /api/donnees.php  → JSON, mis en cache 6 heures dans api/cache/.
 *
 * Sources :
 *  - Stocks : API publique du baromètre de Transfusion CRS Suisse
 *             https://www.blutspende.ch/api/blood_supplies/{institut}?locale=fr
 *  - Collectes Genève : calendrier public du CTS des HUG
 *             https://www.hug.ch/don-sang/calendrier-collectes
 *  - Actualités : flux RSS Google Actualités (Suisse, français) sur le don du sang
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

ini_set('display_errors', '0');
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Cache-Control: public, max-age=900');

$TTL      = 6 * 3600;                       // durée de vie du cache
$CACHE    = __DIR__ . '/cache/donnees.json';
$UA       = 'Mozilla/5.0 (compatible; BeeMyBlood/0.3; +https://beemyblood.ch; contact@beemyblood.ch)';
$FORCE    = isset($_GET['force']) && $_GET['force'] === '1';

$INSTITUTS = [
    'geneve'         => ['label' => 'Genève (CTS HUG)',                 'court' => 'Genève'],
    'irb'            => ['label' => 'Transfusion Interrégionale CRS · Berne, Vaud, Valais', 'court' => 'Interrégionale (BE, VD, VS)'],
    'gesamt'         => ['label' => 'Suisse entière',                   'court' => 'Suisse'],
    'zuerich'        => ['label' => 'Zurich',                           'court' => 'Zurich'],
    'basel'          => ['label' => 'Bâle',                             'court' => 'Bâle'],
    'zentralschweiz' => ['label' => 'Suisse centrale',                  'court' => 'Suisse centrale'],
    'graubuenden'    => ['label' => 'Grisons',                          'court' => 'Grisons'],
];
// couleurs du baromètre officiel → niveau lisible
$NIVEAUX = [
    'blue'   => ['niveau' => 'eleve',    'libelle' => 'Élevé',    'taux' => 92],
    'green'  => ['niveau' => 'normal',   'libelle' => 'Normal',   'taux' => 70],
    'yellow' => ['niveau' => 'bas',      'libelle' => 'Bas',      'taux' => 40],
    'red'    => ['niveau' => 'critique', 'libelle' => 'Critique', 'taux' => 15],
    'grey'   => ['niveau' => 'inconnu',  'libelle' => 'Non communiqué', 'taux' => 0],
];

// ---------- cache ----------
if (!$FORCE && is_file($CACHE) && (time() - filemtime($CACHE)) < $TTL) {
    readfile($CACHE);
    exit;
}

function bmb_get($url, $timeout = 12) {
    global $UA;
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true, CURLOPT_FOLLOWLOCATION => true, CURLOPT_MAXREDIRS => 4,
        CURLOPT_TIMEOUT => $timeout, CURLOPT_CONNECTTIMEOUT => 6, CURLOPT_USERAGENT => $UA,
        CURLOPT_SSL_VERIFYPEER => true, CURLOPT_HTTPHEADER => ['Accept-Language: fr-CH,fr;q=0.9'],
    ]);
    $body = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    return ($body !== false && $code >= 200 && $code < 300) ? $body : null;
}
function bmb_texte($html) {
    return trim(html_entity_decode(strip_tags($html), ENT_QUOTES | ENT_HTML5, 'UTF-8'));
}

$erreurs = [];

// ---------- 1. stocks officiels ----------
$stocks = [];
foreach ($INSTITUTS as $code => $meta) {
    $raw = bmb_get('https://www.blutspende.ch/api/blood_supplies/' . $code . '?locale=fr', 8);
    $j = $raw ? json_decode($raw, true) : null;
    if (!$j || empty($j['blood_supplies'])) { $erreurs[] = 'stocks:' . $code; continue; }
    $groupes = [];
    foreach (['0-', '0+', 'a-', 'a+', 'b-', 'b+', 'ab-', 'ab+'] as $g) {
        $couleur = isset($j['blood_supplies'][$g]) ? strtolower($j['blood_supplies'][$g]) : 'grey';
        $n = isset($NIVEAUX[$couleur]) ? $NIVEAUX[$couleur] : $NIVEAUX['grey'];
        $groupes[] = ['groupe' => str_replace(['0', '-'], ['O', '−'], strtoupper($g)), 'couleur' => $couleur] + $n;
    }
    $stocks[] = [
        'code' => $code, 'label' => $meta['label'], 'court' => $meta['court'],
        'nom_officiel' => isset($j['name']) ? $j['name'] : $meta['label'],
        'date' => isset($j['date']) ? $j['date'] : null, 'groupes' => $groupes,
    ];
}

// ---------- 2. collectes mobiles Genève (HUG) ----------
$collectes = [];
$html = bmb_get('https://www.hug.ch/don-sang/calendrier-collectes', 12);
if ($html) {
    $parts = preg_split('#<div class="card views-row">#', $html);
    array_shift($parts);
    if ($parts) {
        foreach ($parts as $row) {
            $item = ['source' => 'HUG'];
            if (preg_match('#views-field-title.*?<a href="([^"]+)"[^>]*>(.*?)</a>#s', $row, $m)) {
                $item['titre'] = preg_replace('/\s+/', ' ', bmb_texte($m[2]));
                $item['url'] = (strpos($m[1], 'http') === 0 ? '' : 'https://www.hug.ch') . $m[1];
            }
            if (preg_match('#<time datetime="([^"]+)"[^>]*>(.*?)</time>#s', $row, $m)) {
                $item['date_iso'] = substr($m[1], 0, 10); $item['date'] = bmb_texte($m[2]);
            }
            if (preg_match('#lieu-address-line1.*?<span class="field-content">(.*?)</span>#s', $row, $m)) $item['adresse'] = bmb_texte($m[1]);
            if (preg_match('#lieu-postal-code">(.*?)</span>#s', $row, $m)) $item['npa'] = bmb_texte($m[1]);
            if (preg_match('#lieu-locality">(.*?)</span>#s', $row, $m)) $item['localite'] = bmb_texte($m[1]);
            if (preg_match('#don-sang-horaire">(.*?)</span>#s', $row, $m)) $item['debut'] = strtolower(bmb_texte($m[1]));
            if (preg_match('#don-sang-heure-fin">(.*?)</span>#s', $row, $m)) $item['fin'] = strtolower(bmb_texte($m[1]));
            if (!empty($item['titre'])) $collectes[] = $item;
        }
    }
    if (!$collectes) $erreurs[] = 'collectes:hug:parse';
} else {
    $erreurs[] = 'collectes:hug:fetch';
}

// ---------- 3. actualités (Google Actualités, Suisse, français) ----------
$actus = [];
$requete = '("don du sang" OR "don de sang" OR "dons de sang" OR "donneurs de sang") (suisse OR romand OR romande OR genève OR vaud OR valais OR fribourg OR neuchâtel OR jura OR HUG OR CHUV OR "Croix-Rouge" OR transfusion)';
$rss = bmb_get('https://news.google.com/rss/search?q=' . rawurlencode($requete) . '&hl=fr&gl=CH&ceid=CH:fr', 12);
// médias suisses mis en avant dans le classement
$MEDIAS_CH = ['rts', 'le temps', '24 heures', 'tribune de genève', 'le matin', 'arcinfo', 'le nouvelliste', 'la liberté', 'rtn', 'radio lac', 'leman bleu', 'léman bleu', '20 minutes', 'blick', 'watson', 'heidi.news', 'swissinfo', 'keystone', 'la côte', 'le courrier', 'lfm', 'radio chablais', 'latele', 'la télé', 'canal alpha', 'rhône fm', 'one fm', 'yes fm', 'gauchebdo', 'le régional', 'hug', 'chuv', 'cern', 'unige', 'heg', 'hes-so', 'srf', 'rsi', 'nzz', 'tages-anzeiger'];
if ($rss) {
    libxml_use_internal_errors(true);
    $xml = simplexml_load_string($rss);
    if ($xml && isset($xml->channel->item)) {
        foreach ($xml->channel->item as $it) {
            $titre = (string) $it->title;
            $src = isset($it->source) ? (string) $it->source : '';
            if ($src && substr($titre, -strlen(' - ' . $src)) === ' - ' . $src) $titre = substr($titre, 0, -strlen(' - ' . $src));
            $ts = strtotime((string) $it->pubDate);
            $actus[] = [
                'titre' => trim($titre), 'source' => $src, 'url' => (string) $it->link,
                'date_iso' => $ts ? date('Y-m-d', $ts) : null, 'date' => $ts ? date('d.m.Y', $ts) : (string) $it->pubDate,
            ];
        }
        // médias suisses d'abord, puis du plus récent au plus ancien ; 15 au plus, 12 mois au plus
        $limite = date('Y-m-d', strtotime('-12 months'));
        $actus = array_values(array_filter($actus, function ($a) use ($limite) { return !$a['date_iso'] || $a['date_iso'] >= $limite; }));
        foreach ($actus as &$a) {
            $s = mb_strtolower($a['source']);
            $a['suisse'] = (substr($s, -3) === '.ch');
            foreach ($MEDIAS_CH as $m) { if ($s !== '' && strpos($s, $m) !== false) { $a['suisse'] = true; break; } }
        }
        unset($a);
        usort($actus, function ($a, $b) {
            if ($a['suisse'] !== $b['suisse']) return $a['suisse'] ? -1 : 1;
            return strcmp((string) $b['date_iso'], (string) $a['date_iso']);
        });
        $actus = array_slice($actus, 0, 15);
    }
    if (!$actus) $erreurs[] = 'actus:parse';
} else {
    $erreurs[] = 'actus:fetch';
}

$out = [
    'maj' => date('c'),
    'stocks' => $stocks,
    'collectes' => ['geneve' => $collectes, 'autres_cantons_url' => 'https://www.blutspende.ch/fr/dates-de-collecte-de-sang'],
    'actualites' => $actus,
    'sources' => [
        'stocks' => 'Transfusion CRS Suisse — baromètre des groupes sanguins (blutspende.ch)',
        'collectes' => 'CTS des HUG — calendrier des collectes (hug.ch)',
        'actualites' => 'Google Actualités (Suisse, français)',
    ],
    'erreurs' => $erreurs,
];

$json = json_encode($out, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
$ok = $stocks || $collectes || $actus;
if ($ok) {
    if (!is_dir(dirname($CACHE))) @mkdir(dirname($CACHE), 0755, true);
    @file_put_contents($CACHE, $json, LOCK_EX);
} elseif (is_file($CACHE)) {
    // sources injoignables : on sert le dernier cache connu
    readfile($CACHE);
    exit;
}
echo $json;
