// Ablauf: Anfrage -> Angebotsentwurf + PDF -> Freigabe-Mail an MON-NET -> nach Freigabe Versand an den Kunden.
import { randomUUID } from 'node:crypto';
import { anfangsEinstellungen, pruefhinweise, gueltigBis, eur } from './angebot.mjs';
import { angebotPdf } from './pdf.mjs';
import { T } from './texte.mjs';
import { naechsteNummer, lade, speichere, speicherePdf, ladePdf } from './store.mjs';
import { sende, adminEmail } from './mail.mjs';

export const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

const basisUrl = () => (process.env.URL || 'https://monnet-wp10.netlify.app').replace(/\/$/, '');

// Felder, die aus dem Formular übernommen werden (keine Dateien, kein Honeypot)
const FELDER = ['vorname', 'nachname', 'telefon', 'email', 'strasse', 'plz', 'ort', 'gebaeudetyp', 'baujahr', 'wohnflaeche_m2', 'personen',
  'heizung_aktuell', 'heizung_alter', 'waermeverteilung', 'warmwasser', 'oeltank', 'photovoltaik', 'aufstellort', 'jahresverbrauch',
  'zeitrahmen', 'paket', 'hersteller', 'nachricht', 'aktionscode', 'mwst', 'sprache', 'quelle'];
const FOTOS = ['foto_heizraum', 'foto_typenschild', 'foto_zaehlerschrank', 'foto_aussen'];

export async function pdfNeu(s, rec) {
  const { bytes, summen } = await angebotPdf(rec);
  rec.summen = { netto: summen.netto, steuer: summen.steuer, brutto: summen.brutto };
  rec.hinweise = pruefhinweise(rec.daten, rec.einstellungen);
  rec.geaendert = new Date().toISOString();
  await speicherePdf(s, rec.id, bytes);
  await speichere(s, rec);
  return bytes;
}

export async function ausAnfrage(s, data, { id, erstellt, test = false } = {}) {
  id = String(id || randomUUID()).replace(/[^a-zA-Z0-9-]/g, '');
  const vorhanden = await lade(s, id);
  if (vorhanden) return { rec: vorhanden, neu: false };
  const daten = {};
  for (const k of FELDER) if (data[k] != null) daten[k] = String(data[k]).slice(0, 2000);
  const fotos = {};
  for (const k of FOTOS) {
    const v = data[k];
    const url = typeof v === 'string' ? v : v?.url;
    if (url) fotos[k] = url;
  }
  erstellt = erstellt || new Date().toISOString();
  const rec = {
    id,
    nummer: await naechsteNummer(s, new Date(erstellt).getFullYear()),
    erstellt,
    gueltigBis: gueltigBis(erstellt),
    status: 'entwurf',
    test,
    daten,
    fotos,
    einstellungen: anfangsEinstellungen(daten),
    verlauf: [{ zeit: erstellt, text: test ? 'Testanfrage angelegt' : 'Anfrage eingegangen, Entwurf erstellt' }],
  };
  const pdf = await pdfNeu(s, rec);
  return { rec, neu: true, pdf };
}

const name = (d) => `${d.vorname || ''} ${d.nachname || ''}`.trim();

export async function freigabeMail(rec, pdf) {
  const d = rec.daten;
  const link = `${basisUrl()}/angebote/${rec.id}`;
  const zeilen = [
    ['Kunde', `${name(d)}, ${d.plz || ''} ${d.ort || ''}`],
    ['Kontakt', `${d.telefon || ''} · ${d.email || ''}`],
    ['Gebäude', `${d.gebaeudetyp || ''}, Baujahr ${d.baujahr || '?'}, ${d.wohnflaeche_m2 || '?'} m², ${d.personen || '?'} Pers.`],
    ['Heizung', `${d.heizung_aktuell || ''} (${d.heizung_alter || '?'}), ${d.waermeverteilung || ''}`],
    ['Zeitrahmen', d.zeitrahmen || ''],
    ['Angebot', `${rec.einstellungen.kw}, ${rec.einstellungen.mwst} % MwSt., ${rec.einstellungen.rabatt ? 'mit WP10' : 'ohne Rabatt'}, Sprache ${rec.einstellungen.sprache.toUpperCase()}`],
    ['Gesamt brutto', eur(rec.summen.brutto)],
  ];
  const hinweise = rec.hinweise.length
    ? `<p style="background:#fff4f4;border-left:3px solid #ED1C24;padding:8px 12px"><b>Bitte prüfen:</b><br>${rec.hinweise.map(esc).join('<br>')}</p>`
    : '';
  const html = `<div style="font-family:Arial,sans-serif;font-size:14px;color:#231F20;max-width:600px">
<p>Neue Wärmepumpen-Anfrage. Der Angebotsentwurf <b>${esc(rec.nummer)}</b> liegt im Anhang und wurde <b>noch nicht</b> an den Kunden geschickt.</p>
<table style="border-collapse:collapse">${zeilen.map(([k, v]) => `<tr><td style="padding:3px 12px 3px 0;color:#6b6b6b">${esc(k)}</td><td style="padding:3px 0">${esc(v)}</td></tr>`).join('')}</table>
${d.nachricht ? `<p><b>Nachricht:</b> ${esc(d.nachricht)}</p>` : ''}
${hinweise}
<p><a href="${link}" style="display:inline-block;background:#ED1C24;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:bold">Prüfen, anpassen und freigeben</a></p>
<p style="color:#6b6b6b;font-size:12px">Der Link öffnet die Angebotsübersicht (Passwort nötig). Erst dort wird das Angebot mit „Freigeben und senden“ an ${esc(d.email || 'den Kunden')} verschickt.</p></div>`;
  return sende({
    to: adminEmail(),
    subject: `${rec.test ? '[TEST] ' : ''}Angebot ${rec.nummer} zur Freigabe: ${name(d)}, ${d.ort || ''}, ${rec.einstellungen.kw}, ${eur(rec.summen.brutto)}`,
    html,
    text: `Neuer Angebotsentwurf ${rec.nummer} für ${name(d)}. Prüfen und freigeben: ${link}`,
    attachments: pdf ? [{ filename: `Angebot-${rec.nummer}.pdf`, content: Buffer.from(pdf) }] : [],
  });
}

export async function anKundenSenden(s, rec) {
  const t = T[rec.einstellungen.sprache];
  const pdf = await ladePdf(s, rec.id);
  const r = await sende({
    to: rec.daten.email,
    bcc: adminEmail(),
    replyTo: adminEmail(),
    subject: t.mailBetreff(rec.nummer),
    text: t.mailText(name(rec.daten), rec.nummer),
    attachments: [{ filename: `${t.angebot}-${rec.nummer}.pdf`, content: Buffer.from(pdf) }],
  });
  if (r.gesendet) {
    rec.status = 'gesendet';
    rec.gesendet = new Date().toISOString();
    rec.verlauf.push({ zeit: rec.gesendet, text: `Freigegeben und an ${rec.daten.email} gesendet` });
    await speichere(s, rec);
  }
  return r;
}
