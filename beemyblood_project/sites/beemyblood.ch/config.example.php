<?php
/**
 * BeeMyBlood — configuration serveur
 * Copiez ce fichier en config.php (même dossier) et renseignez votre clé API Anthropic.
 * config.php est exclu du dépôt git (.gitignore) : ne le commitez jamais.
 * Clé à obtenir sur https://console.anthropic.com/
 */
return [
    'anthropic_api_key' => 'YOUR_API_KEY_HERE',
    // Facultatif : identifiant de l'espace de travail (wrkspc_…) si la clé a été créée au niveau de l'organisation
    'anthropic_workspace_id' => '',
    // Modèle Claude utilisé par tous les BeeBots (alias sans date, robuste aux retraits de modèles)
    'model' => 'claude-opus-5',
    // Notification des demandes d'accès (api/notif.php) : destinataire et secret partagé avec le déclencheur Supabase
    // (même valeur que __SECRET__ dans supabase/2026-09-09-notification-demandes.sql ; une chaîne aléatoire d'au moins 24 caractères)
    'admin_email' => 'contact@beemyblood.ch',
    'notif_secret' => '',
    // Envoi SMTP des notifications (recommandé : Infomaniak désactive mail() par défaut) : un compte courriel du domaine
    'smtp_host' => 'mail.infomaniak.com',
    'smtp_port' => 465,
    'smtp_user' => '',
    'smtp_pass' => '',
    'smtp_from' => '',
];
