<?php
/**
 * BeeMyBlood — Page et image de partage de l'état des stocks
 *
 * Les réseaux sociaux n'acceptent pas une image jointe à un lien : ils affichent l'aperçu de l'adresse partagée.
 * Cette page fournit donc cet aperçu. Elle porte les métadonnées Open Graph et une image du jour (1200 × 630)
 * dessinée à partir du baromètre officiel, puis conduit la personne vers l'espace donneur.
 *
 *   /stocks/?r=geneve          page d'aperçu (redirige vers /donor/)
 *   /stocks/?r=geneve&img=1    image PNG du jour
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */
ini_set('display_errors', '0');
error_reporting(E_ALL & ~E_DEPRECATED & ~E_WARNING & ~E_NOTICE);

$REGIONS = ['geneve' => 'Genève', 'irb' => 'Berne, Vaud, Valais', 'gesamt' => 'Suisse', 'zuerich' => 'Zurich', 'basel' => 'Bâle', 'zentralschweiz' => 'Suisse centrale', 'graubuenden' => 'Grisons'];
$r = (isset($_GET['r']) && isset($REGIONS[$_GET['r']])) ? $_GET['r'] : 'geneve';
$API = __DIR__;
$HOTE = (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off' ? 'https' : 'http') . '://' . (isset($_SERVER['HTTP_HOST']) ? $_SERVER['HTTP_HOST'] : 'www.beemyblood.ch');

function bmbp_donnees($API, $HOTE) {
    $c = $API . '/cache/donnees.json';
    if (is_file($c) && (time() - filemtime($c)) < 5400) { $j = json_decode((string) file_get_contents($c), true); if ($j && !empty($j['stocks'])) return $j; }
    if (function_exists('curl_init')) {
        $ch = curl_init($HOTE . '/api/donnees.php');
        curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 20, CURLOPT_FOLLOWLOCATION => true]);
        $b = curl_exec($ch);
        if ($b) { $j = json_decode(preg_replace('/^[\s\S]*?(?=\{)/', '', $b), true); if ($j && !empty($j['stocks'])) return $j; }
    }
    if (is_file($c)) { $j = json_decode((string) file_get_contents($c), true); if ($j) return $j; }
    return null;
}
function bmbp_region($d, $r) { if (!$d || empty($d['stocks'])) return null; foreach ($d['stocks'] as $s) if ($s['code'] === $r) return $s; return $d['stocks'][0]; }
function bmbp_liste($reg, $niveau) { $o = []; foreach ($reg['groupes'] as $g) if ($g['niveau'] === $niveau) $o[] = $g['groupe']; return $o; }

$d = bmbp_donnees($API, $HOTE);
$reg = bmbp_region($d, $r);
$lieu = $REGIONS[$r];
$date = $reg && !empty($reg['date']) ? $reg['date'] : date('d.m.Y');
$crit = $reg ? bmbp_liste($reg, 'critique') : [];
$bas = $reg ? bmbp_liste($reg, 'bas') : [];
$ge = ($r === 'geneve');

// ---------------------------------------------------------------- image
if (isset($_GET['img'])) {
    $cache = $API . '/cache/partage-' . $r . '-' . date('Ymd-H') . '.png';
    if (is_file($cache)) { header('Content-Type: image/png'); header('Cache-Control: public, max-age=1800'); readfile($cache); exit; }
    if (!function_exists('imagecreatetruecolor') || !function_exists('imagettftext')) { header('Location: ' . $HOTE . '/assets/og-beemyblood.png', true, 302); exit; }
    $W = 1200; $H = 630; $im = imagecreatetruecolor($W, $H); imagealphablending($im, true);
    $B = $API . '/fonts/Poppins-Bold.ttf'; $M = $API . '/fonts/Poppins-Medium.ttf';
    $c = function ($hex) use ($im) { return imagecolorallocate($im, hexdec(substr($hex, 0, 2)), hexdec(substr($hex, 2, 2)), hexdec(substr($hex, 4, 2))); };
    $fond = $c('12121e'); $piste = $c('26263a'); $blanc = $c('f0ece2'); $or = $c('C8A960'); $orClair = $c('E8D5A3'); $gris = $c('9a9ab0'); $encre = $c('12121e');
    $NIV = ['critique' => ['Critique', $c('E5484D')], 'bas' => ['Bas', $c('F2A93B')], 'normal' => ['Normal', $c('3B9BE8')], 'eleve' => ['Élevé', $c('8FD0FF')], 'inconnu' => ['Non communiqué', $c('8a8a99')]];
    imagefilledrectangle($im, 0, 0, $W, $H, $fond);
    $rond = function ($x, $y, $w, $h, $col) use ($im) { $ra = (int) ($h / 2); if ($w < $h) $w = $h; imagefilledrectangle($im, $x + $ra, $y, $x + $w - $ra, $y + $h, $col); imagefilledellipse($im, $x + $ra, $y + $ra, $h, $h, $col); imagefilledellipse($im, $x + $w - $ra, $y + $ra, $h, $h, $col); };
    imagettftext($im, 27, 0, 60, 70, $orClair, $B, 'BeeMyBlood');
    $bb = imagettfbbox(19, 0, $M, $date); imagettftext($im, 19, 0, $W - 60 - ($bb[2] - $bb[0]), 68, $gris, $M, $date);
    imagettftext($im, 50, 0, 60, 150, $blanc, $B, 'Stocks de sang');
    $bb = imagettfbbox(50, 0, $B, 'Stocks de sang'); imagettftext($im, 50, 0, 60 + ($bb[2] - $bb[0]) + 26, 150, $or, $B, '· ' . $lieu);
    $groupes = $reg ? array_slice($reg['groupes'], 0, 8) : [];
    foreach ($groupes as $i => $g) {
        $col = $i < 4 ? 0 : 1; $lig = $i % 4; $x = 60 + $col * 560; $y = 205 + $lig * 66;
        $n = isset($NIV[$g['niveau']]) ? $NIV[$g['niveau']] : $NIV['inconnu']; $taux = max(8, min(100, (int) $g['taux']));
        imagettftext($im, 28, 0, $x, $y + 32, $blanc, $B, $g['groupe']);
        $rond($x + 100, $y + 6, 250, 30, $piste); $rond($x + 100, $y + 6, (int) (250 * $taux / 100), 30, $n[1]);
        $lib = ($g['niveau'] === 'critique' ? '!! ' : ($g['niveau'] === 'bas' ? '! ' : '')) . (!empty($g['libelle']) ? $g['libelle'] : $n[0]);
        imagettftext($im, 21, 0, $x + 366, $y + 30, $n[1], $B, $lib);
    }
    if (!$groupes) imagettftext($im, 24, 0, 60, 300, $gris, $M, 'Baromètre officiel momentanément indisponible.');
    $rond(40, 486, $W - 80, 100, $or);
    imagettftext($im, 26, 0, 76, 530, $encre, $B, $ge ? 'Genève a besoin de 10 donneurs de plus chaque jour.' : 'Les donneurs réguliers font la différence.');
    imagettftext($im, 21, 0, 76, 568, $encre, $M, 'Puis-je donner ? Réponse en deux minutes sur beemyblood.ch');
    imagettftext($im, 13, 0, 60, 614, $gris, $M, 'Source : baromètre officiel de Transfusion CRS Suisse · ' . $date);
    if (!is_dir($API . '/cache')) @mkdir($API . '/cache', 0755, true);
    foreach ((array) glob($API . '/cache/partage-*.png') as $vieux) { if (is_file($vieux) && (time() - filemtime($vieux)) > 7200) @unlink($vieux); }
    @imagepng($im, $cache, 6);
    header('Content-Type: image/png'); header('Cache-Control: public, max-age=1800'); imagepng($im, null, 6); exit;
}

// ---------------------------------------------------------------- page d'aperçu
$titre = 'Stocks de sang ' . ($ge ? 'à Genève' : '· ' . $lieu);
if ($reg) $titre .= ' : ' . ($crit ? implode(', ', $crit) . ' critique' . (count($crit) > 1 ? 's' : '') : ($bas ? implode(', ', $bas) . ' bas' : 'niveaux corrects aujourd’hui'));
$desc = ($ge ? 'Genève a besoin de donneurs réguliers, et de 10 donneurs de plus chaque jour. ' : 'Les stocks tiennent grâce aux donneurs réguliers. ') . 'Vérifiez en deux minutes si vous pouvez donner et trouvez une collecte près de chez vous.';
$url = $HOTE . '/stocks/' . ($r === 'geneve' ? '' : '?r=' . $r);
$img = $HOTE . '/stocks/?r=' . $r . '&img=1&v=' . date('YmdH');
$e = function ($s) { return htmlspecialchars($s, ENT_QUOTES | ENT_HTML5, 'UTF-8'); };
header('Content-Type: text/html; charset=utf-8'); header('Cache-Control: public, max-age=900');
?><!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title><?= $e($titre) ?> · BeeMyBlood</title>
<meta name="description" content="<?= $e($desc) ?>">
<link rel="canonical" href="<?= $e($url) ?>">
<meta property="og:type" content="website">
<meta property="og:site_name" content="BeeMyBlood">
<meta property="og:title" content="<?= $e($titre) ?>">
<meta property="og:description" content="<?= $e($desc) ?>">
<meta property="og:url" content="<?= $e($url) ?>">
<meta property="og:image" content="<?= $e($img) ?>">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="<?= $e('Niveau des stocks de sang par groupe, ' . $lieu . ', ' . $date) ?>">
<meta property="og:locale" content="fr_CH">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="<?= $e($titre) ?>">
<meta name="twitter:description" content="<?= $e($desc) ?>">
<meta name="twitter:image" content="<?= $e($img) ?>">
<meta http-equiv="refresh" content="1;url=/donor/">
<style>body{margin:0;background:#0a0a12;color:#f0ece2;font-family:system-ui,sans-serif;display:flex;min-height:100vh;align-items:center;justify-content:center;text-align:center;padding:24px}a{color:#E8D5A3}img{max-width:100%;height:auto;border-radius:14px;margin-bottom:18px}</style>
</head>
<body>
<main>
<img src="<?= $e($img) ?>" alt="<?= $e('Niveau des stocks de sang par groupe, ' . $lieu . ', ' . $date) ?>" width="600" height="315">
<h1 style="font-size:22px"><?= $e($titre) ?></h1>
<p><?= $e($desc) ?></p>
<p><a href="/donor/">Continuer vers BeeMyBlood</a></p>
</main>
</body>
</html>
