<?php
/*
 * BeeMyBlood – BeeBot Receveur API Proxy
 * Copyright (C) 2026 David-Zacharie Issom / Convivens Lab, HEG Geneva
 * AGPL-3.0 — https://www.gnu.org/licenses/agpl-3.0.html
 *
 * INSTRUCTIONS: put your Anthropic API key in ../config.php (see config.example.php) and deploy.
 */

// ==================== CONFIGURATION ====================
// Clé API et modèle lus depuis config.php (hors dépôt git) — voir config.example.php
$bmbConfig = file_exists(__DIR__ . '/../config.php') ? require __DIR__ . '/../config.php' : [];
$ANTHROPIC_API_KEY = $bmbConfig['anthropic_api_key'] ?? '';
$MODEL = $bmbConfig['model'] ?? 'claude-opus-5';
$MAX_TOKENS = 2048;

// ==================== CORS ====================
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['error' => 'POST uniquement']);
    exit;
}

// ==================== INPUT ====================
$input = json_decode(file_get_contents('php://input'), true);
$message = trim($input['message'] ?? '');

if (empty($message)) {
    echo json_encode(['error' => 'Message vide']);
    exit;
}

if (empty($ANTHROPIC_API_KEY)) {
    echo json_encode(['error' => 'Clé API non configurée. Contactez l\'administrateur.']);
    exit;
}

// ==================== SYSTEM PROMPT ====================
$system = <<<'PROMPT'
Tu es BeeBot Receveur, l'assistant IA du portail patient BeeMyBlood — Espace Receveur.

Tu aides les patient·es recevant des transfusions de produits sanguins labiles (concentrés érythrocytaires, plaquettes, plasma). Tes réponses doivent être :
- Empathiques, chaleureuses et rassurantes
- Précises médicalement (mais tu n'es PAS médecin et tu le rappelles si nécessaire)
- Adaptées à un public non-médical
- En français, avec un langage clair et accessible

Tu peux répondre à des questions sur :
- Le déroulement d'une transfusion (étapes, durée, surveillance)
- Les produits sanguins (CE, CP, PFC — différences, indications)
- Les effets indésirables (quand s'inquiéter, que signaler)
- La surcharge en fer et la chélation (déférasirox, déféroxamine)
- Les droits des patient·es en Suisse (consentement, accès au dossier, confidentialité)
- La compatibilité sanguine (groupes, phénotype, anticorps, RAI)
- Les pathologies nécessitant des transfusions (thalassémie, drépanocytose, SMD, leucémie, etc.)
- Le bien-être émotionnel et la gestion de l'anxiété
- Les associations de patients (TIF, UNITED Onlus, SPO, Suisse Drépano)

Tu ne poses JAMAIS de diagnostic. Si la question est urgente (symptômes graves), tu rappelles d'appeler le 144 (urgences Suisse) ou le service d'hématologie.

Contexte technique : Le portail est développé par le Convivens Lab (HEG Geneva) en partenariat avec le CTS des HUG et SIMED (UNIGE). Hébergé en Suisse (Infomaniak), conforme nLPD/RGPD.
PROMPT;

// ==================== API CALL ====================
$payload = [
    'model' => $MODEL,
    'max_tokens' => $MAX_TOKENS,
    'output_config' => ['effort' => 'low'],
    'system' => $system,
    'messages' => [
        ['role' => 'user', 'content' => $message]
    ]
];

$ch = curl_init('https://api.anthropic.com/v1/messages');
curl_setopt_array($ch, [
    CURLOPT_HTTPHEADER => [
        'Content-Type: application/json',
        'x-api-key: ' . $ANTHROPIC_API_KEY,
        'anthropic-version: 2023-06-01'
    ],
    CURLOPT_POST => true,
    CURLOPT_POSTFIELDS => json_encode($payload),
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT => 30
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$error = curl_error($ch);
curl_close($ch);

if ($error) {
    echo json_encode(['error' => 'Erreur réseau : ' . $error]);
    exit;
}

if ($httpCode !== 200) {
    $body = json_decode($response, true);
    $msg = $body['error']['message'] ?? "Erreur API (HTTP $httpCode)";
    echo json_encode(['error' => $msg]);
    exit;
}

// ==================== RESPONSE ====================
$data = json_decode($response, true);
$reply = '';
foreach ($data['content'] ?? [] as $block) {
    if (($block['type'] ?? '') === 'text') {
        $reply .= $block['text'];
    }
}

if (empty($reply)) {
    echo json_encode(['error' => 'Réponse vide du modèle']);
    exit;
}

echo json_encode(['reply' => $reply]);
