<?php
/**
 * BeeMyBlood Pro — BeeBot Pro API
 * Proxy vers l'API Anthropic Claude pour les questions transfusionnelles
 * 
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * © 2026 BeeMyBlood™ · Convivens Lab · HEG Genève (HES-SO)
 */

// ╔══════════════════════════════════════════════════════════════╗
// ║  CONFIGURATION — Collez votre clé API Anthropic ci-dessous  ║
// ╚══════════════════════════════════════════════════════════════╝

$apiKey = 'REVOKED_KEY_REMOVED';  // ← Remplacez par votre clé sk-ant-...

// ─────────────────────────────────────────────────────────────────

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Handle CORS preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

// Vérification clé API
if (!$apiKey || $apiKey === 'VOTRE_CLE_API_ICI') {
    http_response_code(500);
    echo json_encode(['error' => 'Clé API non configurée. Ouvrez api.php et remplacez VOTRE_CLE_API_ICI par votre clé Anthropic.', 'answer' => null]);
    exit;
}

// Parse request
$input = json_decode(file_get_contents('php://input'), true);
$question = $input['question'] ?? '';
$context = $input['context'] ?? 'pro';

if (empty($question)) {
    http_response_code(400);
    echo json_encode(['error' => 'Missing question', 'answer' => null]);
    exit;
}

// Rate limiting (simple file-based)
$rateLimitFile = sys_get_temp_dir() . '/beemyblood_ratelimit_' . md5($_SERVER['REMOTE_ADDR'] ?? 'cli');
$now = time();
$requests = [];
if (file_exists($rateLimitFile)) {
    $requests = json_decode(file_get_contents($rateLimitFile), true) ?: [];
    $requests = array_filter($requests, function($t) use ($now) { return $t > $now - 60; });
}
if (count($requests) >= 10) {
    http_response_code(429);
    echo json_encode(['error' => 'Rate limit exceeded (10/min)', 'answer' => null]);
    exit;
}
$requests[] = $now;
file_put_contents($rateLimitFile, json_encode($requests));

// System prompt for BeeBot Pro
$systemPrompt = <<<PROMPT
Tu es BeeBot Pro, un assistant IA spécialisé en médecine transfusionnelle, déployé au Centre de Transfusion Sanguine (CTS) des Hôpitaux Universitaires de Genève (HUG).

Tu t'adresses exclusivement à des professionnel·le·s de santé (médecins, infirmier·ère·s, laborantin·e·s, biologistes). Utilise le vocabulaire médical approprié sans simplification excessive.

DOMAINES D'EXPERTISE :
- Compatibilité ABO/Rh : matrices CE, CP, PFC, règles d'urgence
- Phénotypage étendu : Rh (C,c,E,e), Kell (K), Duffy (Fya,Fyb), Kidd (Jka,Jkb), MNS (S,s)
- Phénotypes rares : Duffy négatif, Bombay (Oh), RhNull, Jk(a-b-), registres ISBT
- RAI : interprétation, validité (72h vs 21j), mémoire immunologique, panel d'identification
- Produits sanguins labiles (PSL) : CE, CP, PFC, cryoprécipité, fibrinogène
- Protocoles d'urgence : transfusion massive (ratio 4:4:1), O négatif, acide tranexamique
- Drépanocytose : protocoles transfusionnels, érythrocytaphérèse, allo-immunisation
- Seuils de stock : alertes, commandes inter-centres, DLC
- Réglementation : directives Transfusion CRS Suisse, Swissmedic, LPTh, hémovigilance
- Réseau romand : CTS HUG, CHUV, Transfusion Interrégionale CRS, spécialistes (Dre Waldvogel, Dre Perelli (HUG), Dre Gavillet (CHUV), Dre Canellini (VS))

CONTEXTE LOCAL (CTS HUG Genève) :
- Objectif journalier : 50-70 dons/jour
- Seuils stock CE : O- 12, O+ 30, A+ 25, B+ 15, B- 8, AB- 5
- CP : DLC 5 jours, 22°C sous agitation
- ~30 donneurs Duffy négatifs en Suisse romande
- Érythrocytaphérèses au CTS (Bât. Morier)
- Labo immunohémato : 022 372 39 52
- Médecin CTS : 022 372 39 51
- Directives CRS : https://vorschriften.blutspende.ch/fr/downloads/

RÈGLES :
- Réponds en français
- Sois concis mais complet
- Utilise des listes à puces pour la clarté
- Cite les sources (CRS, Swissmedic) quand pertinent
- Mentionne les numéros de téléphone du CTS quand utile
- Rappelle que tu es un outil d'aide à la décision, pas un substitut au jugement clinique
- Si la question sort de ton domaine, redirige vers les directives CRS ou le médecin du CTS
- Formate en HTML simple (balises <b>, <br>, <a>, <sup>)
PROMPT;

// Call Anthropic API
$payload = [
    'model' => 'claude-sonnet-4-20250514',
    'max_tokens' => 1024,
    'system' => $systemPrompt,
    'messages' => [
        ['role' => 'user', 'content' => $question]
    ]
];

$ch = curl_init('https://api.anthropic.com/v1/messages');
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST => true,
    CURLOPT_HTTPHEADER => [
        'Content-Type: application/json',
        'x-api-key: ' . $apiKey,
        'anthropic-version: 2023-06-01'
    ],
    CURLOPT_POSTFIELDS => json_encode($payload),
    CURLOPT_TIMEOUT => 30,
    CURLOPT_CONNECTTIMEOUT => 10
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlError = curl_error($ch);
curl_close($ch);

if ($curlError) {
    http_response_code(502);
    echo json_encode(['error' => 'API connection failed: ' . $curlError, 'answer' => null]);
    exit;
}

if ($httpCode !== 200) {
    http_response_code(502);
    echo json_encode(['error' => 'API returned HTTP ' . $httpCode, 'answer' => null]);
    exit;
}

$data = json_decode($response, true);
$answer = '';

if (isset($data['content']) && is_array($data['content'])) {
    foreach ($data['content'] as $block) {
        if (isset($block['type']) && $block['type'] === 'text') {
            $answer .= $block['text'];
        }
    }
}

if (empty($answer)) {
    http_response_code(500);
    echo json_encode(['error' => 'Empty response from API', 'answer' => null]);
    exit;
}

// Return answer
echo json_encode([
    'answer' => $answer,
    'model' => $data['model'] ?? 'unknown',
    'usage' => $data['usage'] ?? null
]);
