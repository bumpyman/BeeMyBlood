<?php
/**
 * BeeMyBlood - API Proxy pour Anthropic Claude
 * À placer sur Infomaniak dans le même dossier que index.html
 * 
 * CONFIGURATION REQUISE:
 * 1. Remplacer YOUR_API_KEY_HERE par ta vraie clé API Anthropic
 * 2. Uploader ce fichier dans /web/ ou /sites/tondomaine.ch/
 */

// ============================================================
// CONFIGURATION
// ============================================================

// IMPORTANT: Remplace cette valeur par ta clé API Anthropic
// Tu peux l'obtenir sur https://console.anthropic.com/
define('ANTHROPIC_API_KEY', 'REVOKED_KEY_REMOVED');

// Headers CORS pour permettre les requêtes depuis le navigateur
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Gérer les requêtes OPTIONS (preflight CORS)
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Vérifier que c'est une requête POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['error' => 'Méthode non autorisée. Utilisez POST.']);
    exit();
}

// ============================================================
// CONTEXTE CRS POUR LE CHATBOT
// ============================================================

$crsContext = <<<EOT
Tu es l'assistant BeeMyBlood, expert du don de sang en Suisse selon les critères officiels CRS (Transfusion CRS Suisse).

CRITÈRES GÉNÉRAUX:
- Âge: 18-75 ans (18-60 pour premier don)
- Poids: minimum 50 kg
- Intervalle entre dons: 3 mois (hommes), 4 mois (femmes)
- Hémoglobine: femmes ≥125 g/l, hommes ≥135 g/l

NOUVEAUTÉS FÉVRIER 2026:
- Transfusion sanguine après 1980: contre-indication définitive supprimée → contre-indication temporaire 4 mois
- Séjour UK 1980-1996 (≥6 mois): contre-indication définitive supprimée
- Neurochirurgie en Suisse: contre-indication temporaire 12 mois (si pas ouverture dure-mère)
- Implants dentaires certifiés CE: acceptés

MÉDICAMENTS COURANTS:
- Contraceptifs, Levothyrox, antihypertenseurs: OK
- Paracétamol, antihistaminiques: OK
- Aspirine: contre-indication temporaire 5 jours (pour plaquettes)
- AINS (ibuprofène): contre-indication temporaire 24h
- Antibiotiques: contre-indication temporaire 2 semaines après fin traitement
- Isotrétinoïne (Roaccutane): contre-indication temporaire 4 semaines
- Acitrétine (Neotigason): contre-indication temporaire 3 ans
- Finastéride: contre-indication temporaire 4 semaines
- Anticoagulants oraux: contre-indication temporaire 3 mois après arrêt
- Lithium: contre-indication temporaire 1 semaine
- Méthotrexate: contre-indication temporaire 12 mois

MALADIES:
- Hypertension contrôlée (<180/100): OK
- Diabète type 2 sans insuline, bien contrôlé: OK
- Hypothyroïdie stabilisée: OK
- Asthme léger avec inhalateurs: OK
- Diabète insulino-dépendant: contre-indication définitive
- Maladies cardiaques (infarctus, angor): contre-indication définitive
- VIH, Hépatite B/C: contre-indication définitive
- Cancer: contre-indication temporaire 5 ans après rémission complète
- Épilepsie: contre-indication temporaire si >3 ans sans crise et sans traitement

VOYAGES:
- Zone paludisme: contre-indication temporaire 4-6 mois après retour
- UK 1980-1996: Plus de contre-indication définitive (nouveau!)

AUTRES:
- Tatouage/piercing: contre-indication temporaire 4 mois
- Chirurgie mineure: contre-indication temporaire 1 mois
- Grossesse: contre-indication temporaire 12 mois après accouchement
- Infection/antibiotiques: contre-indication temporaire 2 semaines après guérison

Utilise "contre-indication définitive" pour les exclusions permanentes et "contre-indication temporaire" pour les exclusions avec délai.

Réponds de façon concise, précise et bienveillante. Évite la surutilisation d'emojis (maximum 1-2 par réponse).

IMPORTANT - Si quelqu'un n'est PAS éligible au don:
- Reste encourageant et bienveillant
- Rappelle qu'on peut contribuer autrement : sensibiliser son entourage, accompagner un proche, devenir bénévole
- Si c'est une contre-indication temporaire, indique quand la personne pourra revenir donner

MOTIVATION DES DONNEURS ÉLIGIBLES:
- Chaque don peut sauver jusqu'à 3 vies
- Certains groupes sanguins sont particulièrement recherchés (O-, O+, A-, B-)
- Les donneurs réguliers sont très précieux

Si tu ne connais pas la réponse exacte, conseille de contacter le centre de transfusion au 031 380 81 81.
EOT;

// ============================================================
// TRAITEMENT DE LA REQUÊTE
// ============================================================

// Lire le corps de la requête
$input = file_get_contents('php://input');
$data = json_decode($input, true);

// Vérifier que le message est présent
if (!isset($data['message']) || empty(trim($data['message']))) {
    echo json_encode(['error' => 'Message vide ou manquant.']);
    exit();
}

$userMessage = trim($data['message']);

// Vérifier la clé API
if (ANTHROPIC_API_KEY === 'YOUR_API_KEY_HERE') {
    echo json_encode([
        'error' => 'Clé API non configurée. Contactez l\'administrateur.',
        'reply' => 'Le chatbot n\'est pas encore configuré. En attendant, vous pouvez contacter Transfusion CRS Suisse au 031 380 81 81 ou consulter www.transfusion.ch'
    ]);
    exit();
}

// ============================================================
// APPEL À L'API ANTHROPIC
// ============================================================

$apiUrl = 'https://api.anthropic.com/v1/messages';

$requestData = [
    'model' => 'claude-sonnet-4-20250514',
    'max_tokens' => 800,
    'system' => $crsContext,
    'messages' => [
        [
            'role' => 'user',
            'content' => $userMessage
        ]
    ]
];

// Initialiser cURL
$ch = curl_init($apiUrl);

curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST => true,
    CURLOPT_HTTPHEADER => [
        'Content-Type: application/json',
        'x-api-key: ' . ANTHROPIC_API_KEY,
        'anthropic-version: 2023-06-01'
    ],
    CURLOPT_POSTFIELDS => json_encode($requestData),
    CURLOPT_TIMEOUT => 30,
    CURLOPT_SSL_VERIFYPEER => true
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlError = curl_error($ch);
curl_close($ch);

// ============================================================
// TRAITEMENT DE LA RÉPONSE
// ============================================================

// Vérifier les erreurs cURL
if ($curlError) {
    echo json_encode([
        'error' => 'Erreur de connexion: ' . $curlError,
        'reply' => 'Impossible de contacter le serveur. Veuillez réessayer ou appeler le 031 380 81 81.'
    ]);
    exit();
}

// Vérifier le code HTTP
if ($httpCode !== 200) {
    $errorData = json_decode($response, true);
    $errorMessage = isset($errorData['error']['message']) ? $errorData['error']['message'] : 'Erreur inconnue';
    
    echo json_encode([
        'error' => 'Erreur API (HTTP ' . $httpCode . '): ' . $errorMessage,
        'reply' => 'Service temporairement indisponible. Veuillez réessayer dans quelques instants ou contacter le 031 380 81 81.'
    ]);
    exit();
}

// Parser la réponse
$responseData = json_decode($response, true);

if (isset($responseData['content'][0]['text'])) {
    echo json_encode([
        'reply' => $responseData['content'][0]['text']
    ]);
} else {
    echo json_encode([
        'error' => 'Réponse inattendue de l\'API',
        'reply' => 'Je n\'ai pas pu traiter votre question. Veuillez réessayer ou contacter le 031 380 81 81.'
    ]);
}
?>