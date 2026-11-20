// E-Mail-Versand über das IONOS-Postfach (SMTP). Ohne SMTP_PASS wird nichts verschickt, nur protokolliert.
import nodemailer from 'nodemailer';

const env = (k, d = '') => process.env[k] || d;

export const absender = () => env('MAIL_FROM', 'MON-NET <info@mon-net.eu>');
export const adminEmail = () => env('ADMIN_EMAIL', 'info@mon-net.eu');
export const smtpBereit = () => Boolean(env('SMTP_PASS'));

export async function sende({ to, bcc, subject, text, html, attachments, replyTo }) {
  if (!smtpBereit()) {
    console.log('[mail] SMTP nicht eingerichtet, nicht gesendet:', { to, subject });
    return { gesendet: false, grund: 'SMTP nicht eingerichtet' };
  }
  const t = nodemailer.createTransport({
    host: env('SMTP_HOST', 'smtp.ionos.de'),
    port: Number(env('SMTP_PORT', '587')),
    secure: env('SMTP_PORT', '587') === '465',
    auth: { user: env('SMTP_USER', 'info@mon-net.eu'), pass: env('SMTP_PASS') },
  });
  const info = await t.sendMail({ from: absender(), to, bcc, subject, text, html, attachments, replyTo });
  return { gesendet: true, id: info.messageId };
}
