<?php
/**
 * BeeMyBlood — courriel à l'équipe quand une demande d'accès est déposée.
 * Appelé par un déclencheur Supabase (pg_net) sur chaque insertion dans demandes_acces,
 * voir supabase/2026-09-09-notification-demandes.sql. Le déclencheur envoie l'en-tête
 * X-BMB-Secret, qui doit correspondre à 'notif_secret' dans config.php ; le destinataire
 * est 'admin_email' dans config.php.
 * Envoi : par SMTP si 'smtp_user' et 'smtp_pass' sont renseignés dans config.php
 * (compte courriel du domaine, serveur mail.infomaniak.com, port 465), sinon par la
 * fonction mail() de PHP, qu'Infomaniak désactive par défaut (Manager > Hébergement > PHP).
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

$smtpUser = (string)($cfg['smtp_user'] ?? '');
$smtpPass = (string)($cfg['smtp_pass'] ?? '');
$from     = (string)($cfg['smtp_from'] ?? '') ?: ($smtpUser !== '' ? $smtpUser : 'no-reply@beemyblood.ch');
$replyTo  = filter_var($email, FILTER_VALIDATE_EMAIL) ? $email : '';
$sujetEnc = '=?UTF-8?B?' . base64_encode($sujet) . '?=';

// ---------- SMTP minimal (SSL implicite, AUTH LOGIN) ----------
function bmb_smtp_envoyer(string $host, int $port, string $user, string $pass, string $from, string $to, string $replyTo, string $sujetEnc, string $corps, string &$journal): bool {
    $journal = '';
    $fp = @stream_socket_client(($port === 465 ? 'ssl://' : 'tcp://') . $host . ':' . $port, $errno, $errstr, 15);
    if (!$fp) { $journal = "connexion impossible : $errstr"; return false; }
    stream_set_timeout($fp, 15);
    $lire = function () use ($fp) { $r = ''; while (($l = fgets($fp, 1024)) !== false) { $r .= $l; if (preg_match('/^\d{3} /', $l)) break; } return $r; };
    $dire = function (string $cmd, string $attendu) use ($fp, $lire, &$journal) { fwrite($fp, $cmd . "\r\n"); $r = $lire(); $journal .= trim($r) . "\n"; return str_starts_with($r, $attendu); };
    $ok = str_starts_with($lire(), '220');
    $ok = $ok && $dire('EHLO beemyblood.ch', '250');
    if ($ok && $port !== 465) { $ok = $dire('STARTTLS', '220') && stream_socket_enable_crypto($fp, true, STREAM_CRYPTO_METHOD_TLS_CLIENT) && $dire('EHLO beemyblood.ch', '250'); }
    $ok = $ok && $dire('AUTH LOGIN', '334') && $dire(base64_encode($user), '334') && $dire(base64_encode($pass), '235');
    $ok = $ok && $dire('MAIL FROM:<' . $from . '>', '250') && $dire('RCPT TO:<' . $to . '>', '250') && $dire('DATA', '354');
    if ($ok) {
        $msg = "From: BeeMyBlood <$from>\r\nTo: <$to>\r\n" . ($replyTo !== '' ? "Reply-To: <$replyTo>\r\n" : '')
             . "Subject: $sujetEnc\r\nDate: " . date('r') . "\r\nMessage-ID: <" . bin2hex(random_bytes(8)) . "@beemyblood.ch>\r\n"
             . "MIME-Version: 1.0\r\nContent-Type: text/plain; charset=UTF-8\r\nContent-Transfer-Encoding: 8bit\r\n\r\n"
             . preg_replace('/^\./m', '..', str_replace("\n", "\r\n", $corps));
        $ok = $dire($msg . "\r\n.", '250');
    }
    $dire('QUIT', '221');
    fclose($fp);
    return $ok;
}

$journal = '';
if ($smtpUser !== '' && $smtpPass !== '') {
    $ok = bmb_smtp_envoyer((string)($cfg['smtp_host'] ?? 'mail.infomaniak.com'), (int)($cfg['smtp_port'] ?? 465), $smtpUser, $smtpPass, $from, $to, $replyTo, $sujetEnc, $corps, $journal);
    $voie = 'smtp';
} elseif (function_exists('mail')) {
    $entetes = "From: BeeMyBlood <$from>\r\n" . ($replyTo !== '' ? "Reply-To: $replyTo\r\n" : '')
             . "MIME-Version: 1.0\r\nContent-Type: text/plain; charset=UTF-8\r\nContent-Transfer-Encoding: 8bit";
    $ok = @mail($to, $sujetEnc, $corps, $entetes);
    $voie = 'mail';
} else {
    $ok = false; $voie = 'aucune';
    $journal = "La fonction mail() est désactivée sur cet hébergement et aucun compte SMTP n'est renseigné dans config.php (smtp_user, smtp_pass).";
}
if (!$ok) { http_response_code(500); }
echo json_encode(['ok' => (bool)$ok, 'voie' => $voie, 'destinataire' => $ok ? $to : null, 'detail' => $ok ? null : trim($journal)], JSON_UNESCAPED_UNICODE);
