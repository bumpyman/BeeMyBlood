<?php
/**
 * BeeMyBlood — courriel à l'équipe quand une demande d'accès est déposée.
 * Appelé par un déclencheur Supabase (pg_net) sur chaque insertion dans demandes_acces,
 * voir supabase/2026-09-09-notification-demandes.sql. Le déclencheur envoie l'en-tête
 * X-BMB-Secret, qui doit correspondre à 'notif_secret' dans config.php ; le destinataire
 * est 'admin_email' dans config.php.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

$cfg    = file_exists(__DIR__ . '/../config.php') ? require __DIR__ . '/../config.php' : [];
$secret = (string)($cfg['notif_secret'] ?? '');
$to     = (string)($cfg['admin_email'] ?? 'contact@beemyblood.ch');
$racine = 'https://beemyblood.ch/';

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') { http_response_code(405); echo '{"erreur":"POST attendu"}'; exit; }
$recu = (string)($_SERVER['HTTP_X_BMB_SECRET'] ?? '');
if ($secret === '' || !hash_equals($secret, $recu)) { http_response_code(403); echo '{"erreur":"secret invalide"}'; exit; }

$d = json_decode((string)file_get_contents('php://input'), true);
if (!is_array($d)) { http_response_code(400); echo '{"erreur":"JSON invalide"}'; exit; }

$ligne = function ($v) { return trim((string)preg_replace('/[\r\n\t]+/', ' ', (string)$v)); };
$libelles = ['donneur' => 'donneur·se', 'receveur' => 'receveur·se', 'pro' => 'professionnel·le'];

$nom   = $ligne($d['nom'] ?? '');
$email = $ligne($d['email'] ?? '');
$org   = $ligne($d['organisation'] ?? '');
$motif = trim((string)($d['motif'] ?? ''));
$rolesBruts = is_array($d['roles'] ?? null) ? $d['roles'] : [(string)($d['role'] ?? '')];
$roles = implode(', ', array_map(function ($r) use ($libelles, $ligne) { $r = $ligne($r); return $libelles[$r] ?? $r; }, array_filter($rolesBruts)));
$quand = $ligne($d['cree_le'] ?? date('c'));
try { $quand = (new DateTime($quand))->setTimezone(new DateTimeZone('Europe/Zurich'))->format('d.m.Y à H\hi'); } catch (Exception $e) {}

$sujet = '[BeeMyBlood] Demande d’accès de ' . ($nom !== '' ? $nom : $email) . ($roles !== '' ? ' (' . $roles . ')' : '');
$corps = "Une nouvelle demande d’accès alpha a été déposée le $quand.\n\n"
       . "Nom : $nom\n"
       . "Courriel : $email\n"
       . "Organisation : " . ($org !== '' ? $org : '—') . "\n"
       . "Espaces demandés : " . ($roles !== '' ? $roles : '—') . "\n"
       . "Motif : " . ($motif !== '' ? $motif : '—') . "\n\n"
       . "Approuver ou refuser la demande : {$racine}admin/\n\n"
       . "Ce message est envoyé automatiquement par beemyblood.ch.\n";

$entetes = "From: BeeMyBlood <no-reply@beemyblood.ch>\r\n"
         . (filter_var($email, FILTER_VALIDATE_EMAIL) ? "Reply-To: $email\r\n" : '')
         . "MIME-Version: 1.0\r\nContent-Type: text/plain; charset=UTF-8\r\nContent-Transfer-Encoding: 8bit";
$sujetEnc = '=?UTF-8?B?' . base64_encode($sujet) . '?=';

$ok = @mail($to, $sujetEnc, $corps, $entetes);
if (!$ok) { http_response_code(500); }
echo json_encode(['ok' => (bool)$ok, 'destinataire' => $ok ? $to : null], JSON_UNESCAPED_UNICODE);
