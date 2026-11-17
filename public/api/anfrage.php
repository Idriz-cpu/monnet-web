<?php
// Verschickt Formular-Anfragen (Preisanfrage, Kontakt) per E-Mail. Läuft auf normalem PHP-Webspace (IONOS, netsite.lu).
const EMPFAENGER = 'info@mon-net.eu';
const ABSENDER = 'webseite@monnet.lu'; // muss eine Adresse der eigenen Domain sein

if ($_SERVER['REQUEST_METHOD'] !== 'POST') { http_response_code(405); exit; }
if (!empty($_POST['bot-field'])) { header('Location: /preisanfrage/danke/'); exit; } // Spam-Falle

$form = preg_replace('/[^a-z0-9_-]/i', '', $_POST['form-name'] ?? 'anfrage');
$email = filter_var($_POST['email'] ?? '', FILTER_VALIDATE_EMAIL);
$name = trim(strip_tags($_POST['name'] ?? ''));
if (!$email || $name === '') { http_response_code(400); exit('Bitte Name und gültige E-Mail angeben.'); }

$zeilen = [];
foreach ($_POST as $k => $v) {
  if (in_array($k, ['bot-field', 'form-name'], true)) continue;
  $v = is_array($v) ? implode(', ', $v) : $v;
  $zeilen[] = str_pad(strip_tags($k) . ':', 22) . trim(strip_tags($v));
}
$betreff = '=?UTF-8?B?' . base64_encode('Neue Anfrage (' . $form . ') von ' . str_replace(["\r", "\n"], '', $name)) . '?=';
$kopf = "From: MON-NET Webseite <" . ABSENDER . ">\r\nReply-To: $email\r\nContent-Type: text/plain; charset=UTF-8";
mail(EMPFAENGER, $betreff, implode("\n", $zeilen), $kopf);
header('Location: ' . ($form === 'kontakt' ? '/kontakt/danke/' : '/preisanfrage/danke/'));
