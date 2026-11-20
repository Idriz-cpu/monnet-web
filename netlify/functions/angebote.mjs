// Freigabe-Bereich unter /angebote (Passwort: Umgebungsvariable ADMIN_PASSWORD).
// Liste aller Angebote, Prüfen/Anpassen, PDF ansehen, Freigeben und senden, CSV-Export, Testanfrage.
import { timingSafeEqual } from 'node:crypto';
import { store, lade, ladePdf, alle, speichere } from '../lib/store.mjs';
import { pdfNeu, anKundenSenden, ausAnfrage, freigabeMail, esc } from '../lib/ablauf.mjs';
import { PAKETE, OPTIONEN } from '../lib/config.mjs';
import { eur } from '../lib/angebot.mjs';
import { smtpBereit, adminEmail } from '../lib/mail.mjs';

export const config = { path: ['/angebote', '/angebote/*'] };

const STATUS = { entwurf: 'Zur Freigabe', gesendet: 'Gesendet', verworfen: 'Verworfen' };
const FARBE = { entwurf: '#ED1C24', gesendet: '#1a7f37', verworfen: '#6b6b6b' };
const OPT_NAMEN = { fundament: 'Bodenplatte Außengerät', abgleich: 'Hydraulischer Abgleich', demontage: 'Demontage Öl inkl. Tank', heizstab: 'Heizstab + Energiemanager (Alternativposition)' };

function erlaubt(req) {
  const pw = process.env.ADMIN_PASSWORD;
  if (!pw) return false;
  const h = req.headers.get('authorization') || '';
  if (!h.startsWith('Basic ')) return false;
  const given = Buffer.from(h.slice(6), 'base64').toString().split(':').slice(1).join(':');
  const a = Buffer.from(given), b = Buffer.from(pw);
  return a.length === b.length && timingSafeEqual(a, b);
}

const html = (body, titel = 'Angebote', status = 200) =>
  new Response(
    `<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex">
<title>${esc(titel)} | MON-NET</title><style>
:root{--r:#ED1C24;--k:#231F20;--g:#6b6b6b;--b:#e6e6e6}
*{box-sizing:border-box}body{margin:0;font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;background:#f6f6f6;color:var(--k);line-height:1.45}
header{background:#fff;border-top:5px solid var(--r);padding:12px 16px;display:flex;gap:12px;align-items:center;justify-content:space-between;flex-wrap:wrap}
header img{height:26px}header nav a{margin-left:14px}a{color:var(--r)}main{max-width:1100px;margin:0 auto;padding:16px}
.card{background:#fff;border-radius:14px;padding:16px;margin-bottom:16px;box-shadow:0 2px 10px rgba(0,0,0,.05)}
table{width:100%;border-collapse:collapse;font-size:14px}th,td{text-align:left;padding:8px 6px;border-bottom:1px solid var(--b);vertical-align:top}
th{font-size:12px;color:var(--g);font-weight:600}.num{text-align:right;white-space:nowrap}.pill{display:inline-block;padding:2px 8px;border-radius:99px;color:#fff;font-size:12px;white-space:nowrap}
.warn{background:#fff4f4;border-left:3px solid var(--r);padding:8px 12px;border-radius:6px;margin:8px 0}.muted{color:var(--g);font-size:13px}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:16px}
label{display:block;margin:6px 0}input,select,textarea{font:inherit;padding:7px 9px;border:1px solid #ccc;border-radius:8px;width:100%}
input[type=checkbox]{width:auto;margin-right:6px}.row{display:flex;gap:8px;align-items:center}.row input[type=number]{width:110px}
button,.btn{font:inherit;font-weight:600;border:0;border-radius:10px;padding:10px 16px;cursor:pointer;background:var(--k);color:#fff;text-decoration:none;display:inline-block}
.btn-r{background:var(--r)}.btn-l{background:#fff;color:var(--k);border:1px solid #ccc}.actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:12px}
dl{display:grid;grid-template-columns:max-content 1fr;gap:4px 12px;margin:0;font-size:14px}dt{color:var(--g)}dd{margin:0}
.filter a{margin-right:12px}.tot{font-size:20px;font-weight:700}@media(max-width:640px){.hide-s{display:none}}
</style></head><body><header><a href="/angebote"><img src="/img/monnet-logo.png" alt="MON-NET"></a><nav><a href="/angebote">Übersicht</a><a href="/angebote/export.csv">CSV</a></nav></header><main>${body}</main></body></html>`,
    { status, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store', 'x-robots-tag': 'noindex' } },
  );

const pill = (st) => `<span class="pill" style="background:${FARBE[st]}">${STATUS[st]}</span>`;
const dt = (iso) => new Date(iso).toLocaleString('de-LU', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Europe/Luxembourg' });

function liste(recs, filter) {
  const f = filter ? recs.filter((r) => r.status === filter) : recs;
  const n = (st) => recs.filter((r) => r.status === st).length;
  const offen = recs.filter((r) => r.status === 'entwurf');
  const summeGesendet = recs.filter((r) => r.status === 'gesendet' && !r.test).reduce((s, r) => s + r.summen.brutto, 0);
  return html(`
<div class="card"><div class="grid">
<div><div class="muted">Zur Freigabe</div><div class="tot">${offen.length}</div></div>
<div><div class="muted">Gesendet</div><div class="tot">${n('gesendet')}</div></div>
<div><div class="muted">Angebotsvolumen gesendet (brutto)</div><div class="tot">${eur(summeGesendet)}</div></div>
</div>${smtpBereit() ? '' : '<p class="warn">E-Mail-Versand ist noch nicht eingerichtet (SMTP_PASS fehlt in Netlify). Entwürfe werden erstellt, aber nichts verschickt.</p>'}</div>
<div class="card"><div class="filter"><a href="/angebote">Alle (${recs.length})</a><a href="/angebote?status=entwurf">Zur Freigabe (${offen.length})</a><a href="/angebote?status=gesendet">Gesendet (${n('gesendet')})</a><a href="/angebote?status=verworfen">Verworfen (${n('verworfen')})</a></div>
<table><thead><tr><th>Nr.</th><th>Eingang</th><th>Kunde</th><th class="hide-s">Ort</th><th>Größe</th><th class="num">Brutto</th><th>Status</th></tr></thead><tbody>
${f.map((r) => `<tr><td><a href="/angebote/${r.id}">${esc(r.nummer)}</a>${r.test ? ' <span class="muted">Test</span>' : ''}${r.hinweise?.length ? ` <span title="${esc(r.hinweise.join(' | '))}">⚠︎</span>` : ''}</td>
<td>${dt(r.erstellt)}</td><td>${esc(`${r.daten.vorname || ''} ${r.daten.nachname || ''}`)}</td><td class="hide-s">${esc(r.daten.ort || '')}</td>
<td>${esc(r.einstellungen.kw)}</td><td class="num">${eur(r.summen.brutto)}</td><td>${pill(r.status)}</td></tr>`).join('') || '<tr><td colspan="7" class="muted">Noch keine Angebote.</td></tr>'}
</tbody></table></div>
<div class="card"><form method="post" action="/angebote/test"><p class="muted">Zum Ausprobieren: legt eine Testanfrage mit Beispieldaten an. Die Freigabe-Mail geht an ${esc(adminEmail())}, „Senden“ schickt das Angebot an die unten angegebene Adresse.</p>
<div class="row"><input type="email" name="email" placeholder="Empfänger für den Test, z. B. info@mon-net.eu" required><select name="sprache" style="width:auto"><option value="de">DE</option><option value="fr">FR</option><option value="en">EN</option></select><button>Testanfrage anlegen</button></div></form></div>`);
}

function detail(r, meldung = '') {
  const d = r.daten, e = r.einstellungen;
  const felder = [
    ['Name', `${d.vorname || ''} ${d.nachname || ''}`], ['Telefon', d.telefon], ['E-Mail', d.email], ['Adresse', `${d.strasse || ''}, ${d.plz || ''} ${d.ort || ''}`],
    ['Gebäude', d.gebaeudetyp], ['Baujahr', d.baujahr], ['Wohnfläche', d.wohnflaeche_m2 && `${d.wohnflaeche_m2} m²`], ['Personen', d.personen],
    ['Heizung', d.heizung_aktuell], ['Alter Heizung', d.heizung_alter], ['Wärmeverteilung', d.waermeverteilung], ['Warmwasser', d.warmwasser],
    ['Öltank', d.oeltank], ['Photovoltaik', d.photovoltaik], ['Aufstellort', d.aufstellort], ['Verbrauch', d.jahresverbrauch],
    ['Zeitrahmen', d.zeitrahmen], ['Paketwunsch', d.paket], ['Hersteller', d.hersteller], ['MwSt. (Kunde)', d.mwst], ['Code', d.aktionscode],
    ['Sprache', d.sprache], ['Quelle', d.quelle], ['Nachricht', d.nachricht],
  ].filter(([, v]) => v);
  const fotos = Object.entries(r.fotos || {}).map(([k, u]) => `<a href="${esc(u)}" target="_blank" rel="noopener">${esc(k.replace('foto_', ''))}</a>`).join(' · ');
  const frei = [...(e.frei || []), { text: '', betrag: '' }];
  const gesperrt = r.status !== 'entwurf';
  return html(`
${meldung ? `<div class="warn">${meldung}</div>` : ''}
<div class="card"><div class="row" style="justify-content:space-between;flex-wrap:wrap"><h1 style="margin:0;font-size:22px">${esc(r.nummer)} ${pill(r.status)}${r.test ? ' <span class="muted">Test</span>' : ''}</h1>
<div class="tot">${eur(r.summen.brutto)} <span class="muted" style="font-size:13px;font-weight:400">brutto, ${e.mwst} % MwSt.</span></div></div>
${(r.hinweise || []).length ? `<div class="warn"><b>Bitte prüfen:</b><br>${r.hinweise.map(esc).join('<br>')}</div>` : ''}
<div class="actions"><a class="btn btn-l" href="/angebote/${r.id}/pdf" target="_blank">PDF ansehen</a></div></div>
<div class="grid">
<div class="card"><h2 style="margin-top:0;font-size:17px">Anfrage</h2><dl>${felder.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('')}</dl>
${fotos ? `<p><b>Fotos:</b> ${fotos}</p>` : ''}<p class="muted">Eingang ${dt(r.erstellt)}</p></div>
<div class="card"><h2 style="margin-top:0;font-size:17px">Angebot anpassen</h2>
<form method="post" action="/angebote/${r.id}"><input type="hidden" name="aktion" value="speichern">
<label>Gerätegröße<select name="kw">${Object.keys(PAKETE).map((k) => `<option${k === e.kw ? ' selected' : ''}>${k}</option>`).join('')}</select></label>
<div class="row"><label>MwSt.<select name="mwst"><option value="17"${e.mwst === 17 ? ' selected' : ''}>17 %</option><option value="3"${e.mwst === 3 ? ' selected' : ''}>3 % (TVA logement)</option></select></label>
<label>Sprache<select name="sprache">${['de', 'fr', 'en'].map((l) => `<option${l === e.sprache ? ' selected' : ''}>${l}</option>`).join('')}</select></label></div>
<label><input type="checkbox" name="rabatt"${e.rabatt ? ' checked' : ''}>WP10-Rabatt 10 %</label>
${Object.keys(OPTIONEN).map((k) => `<div class="row"><label style="flex:1"><input type="checkbox" name="opt_${k}"${e.optionen[k] ? ' checked' : ''}>${OPT_NAMEN[k]}</label><input type="number" step="0.01" name="preis_${k}" value="${e.preise[k]}" aria-label="Preis netto"> €</div>`).join('')}
<p class="muted" style="margin-bottom:0">Zusatzpositionen (netto, negativ für Nachlass):</p>
${frei.map((p) => `<div class="row"><input name="frei_text" value="${esc(p.text)}" placeholder="Bezeichnung"><input type="number" step="0.01" name="frei_betrag" value="${esc(p.betrag)}" placeholder="0"> €</div>`).join('')}
<label>Persönliche Anmerkung im Angebot (optional)<textarea name="anmerkung" rows="2">${esc(e.anmerkung)}</textarea></label>
<div class="actions"><button>Speichern und PDF neu erstellen</button></div></form></div></div>
<div class="card"><h2 style="margin-top:0;font-size:17px">Freigabe</h2>
${gesperrt ? `<p>Status: ${pill(r.status)}${r.gesendet ? ` am ${dt(r.gesendet)}` : ''}</p>` : `<p>Das Angebot wird mit dem aktuellen PDF an <b>${esc(d.email)}</b> geschickt, Kopie an ${esc(adminEmail())}.</p>`}
<div class="actions">
${!gesperrt ? `<form method="post" action="/angebote/${r.id}" onsubmit="return confirm('Angebot ${esc(r.nummer)} jetzt an ${esc(d.email)} senden?')"><input type="hidden" name="aktion" value="senden"><button class="btn-r">Freigeben und senden</button></form>
<form method="post" action="/angebote/${r.id}"><input type="hidden" name="aktion" value="verwerfen"><button class="btn-l">Verwerfen</button></form>` : ''}
${r.status === 'gesendet' ? `<form method="post" action="/angebote/${r.id}" onsubmit="return confirm('Angebot erneut senden?')"><input type="hidden" name="aktion" value="senden"><button class="btn-l">Erneut senden</button></form>` : ''}
${r.status === 'verworfen' ? `<form method="post" action="/angebote/${r.id}"><input type="hidden" name="aktion" value="wiederherstellen"><button class="btn-l">Wieder auf „Zur Freigabe“</button></form>` : ''}
</div>
<p class="muted">Verlauf: ${(r.verlauf || []).map((v) => `${dt(v.zeit)} ${esc(v.text)}`).join(' · ')}</p></div>`, r.nummer);
}

function csv(recs) {
  const cols = ['nummer', 'status', 'erstellt', 'vorname', 'nachname', 'telefon', 'email', 'strasse', 'plz', 'ort', 'zeitrahmen', 'kw', 'mwst', 'brutto', 'gesendet', 'test'];
  const q = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const rows = recs.map((r) => [r.nummer, STATUS[r.status], r.erstellt, r.daten.vorname, r.daten.nachname, r.daten.telefon, r.daten.email, r.daten.strasse, r.daten.plz, r.daten.ort,
    r.daten.zeitrahmen, r.einstellungen.kw, r.einstellungen.mwst, String(r.summen.brutto).replace('.', ','), r.gesendet || '', r.test ? 'ja' : ''].map(q).join(';'));
  return new Response('﻿' + [cols.join(';'), ...rows].join('\r\n'), {
    headers: { 'content-type': 'text/csv; charset=utf-8', 'content-disposition': 'attachment; filename="angebote-wp10.csv"', 'cache-control': 'no-store' },
  });
}

function anwenden(rec, form) {
  const e = rec.einstellungen;
  if (PAKETE[form.get('kw')]) e.kw = form.get('kw');
  e.mwst = form.get('mwst') === '3' ? 3 : 17;
  if (['de', 'fr', 'en'].includes(form.get('sprache'))) e.sprache = form.get('sprache');
  e.rabatt = form.has('rabatt');
  for (const k of Object.keys(OPTIONEN)) {
    e.optionen[k] = form.has(`opt_${k}`);
    const p = parseFloat(form.get(`preis_${k}`));
    if (Number.isFinite(p) && p >= 0) e.preise[k] = p;
  }
  const texte = form.getAll('frei_text'), betraege = form.getAll('frei_betrag');
  e.frei = texte.map((t, i) => ({ text: String(t).trim().slice(0, 200), betrag: parseFloat(betraege[i]) })).filter((p) => p.text && Number.isFinite(p.betrag) && p.betrag !== 0);
  e.anmerkung = String(form.get('anmerkung') || '').trim().slice(0, 1000);
}

export default async (req) => {
  if (!process.env.ADMIN_PASSWORD) return html('<div class="card">Der Freigabe-Bereich ist noch nicht eingerichtet: In Netlify fehlt die Umgebungsvariable ADMIN_PASSWORD.</div>', 'Nicht eingerichtet', 503);
  if (!erlaubt(req)) return new Response('Passwort erforderlich', { status: 401, headers: { 'www-authenticate': 'Basic realm="MON-NET Angebote", charset="UTF-8"' } });

  const url = new URL(req.url);
  const teile = url.pathname.replace(/^\/angebote\/?/, '').split('/').filter(Boolean);
  const s = store();

  if (req.method === 'POST') {
    // Schutz gegen fremde Seiten, die Formulare abschicken (CSRF)
    const herkunft = req.headers.get('origin');
    if (herkunft && herkunft !== url.origin) return new Response('Ungültige Herkunft', { status: 403 });
    if (req.headers.get('sec-fetch-site') === 'cross-site') return new Response('Ungültige Herkunft', { status: 403 });
  }

  if (teile.length === 0) return liste(await alle(s), url.searchParams.get('status'));
  if (teile[0] === 'export.csv') return csv(await alle(s));

  if (teile[0] === 'test' && req.method === 'POST') {
    const form = await req.formData();
    const sprache = ['de', 'fr', 'en'].includes(form.get('sprache')) ? form.get('sprache') : 'de';
    const { rec, pdf } = await ausAnfrage(s, {
      vorname: 'Test', nachname: 'Kunde', email: String(form.get('email') || adminEmail()).slice(0, 200), telefon: '+352 000 000',
      strasse: '1, rue de l\'Exemple', plz: 'L-6690', ort: 'Moersdorf', gebaeudetyp: 'Einfamilienhaus (freistehend)', baujahr: '1988',
      wohnflaeche_m2: '165', personen: '4', heizung_aktuell: 'Heizöl', heizung_alter: 'über 20 Jahre', waermeverteilung: 'Heizkörper',
      warmwasser: 'Über die Heizung', oeltank: 'Im Keller', photovoltaik: 'Geplant', aufstellort: 'Garten / Boden', zeitrahmen: 'In 3–6 Monaten',
      paket: 'Bitte beraten', aktionscode: 'WP10', mwst: '3 % (TVA logement)', sprache, quelle: 'Test',
    }, { test: true });
    await freigabeMail(rec, pdf);
    return Response.redirect(`${url.origin}/angebote/${rec.id}`, 303);
  }

  const rec = await lade(s, teile[0].replace(/[^a-zA-Z0-9-]/g, ''));
  if (!rec) return html('<div class="card">Angebot nicht gefunden.</div>', 'Nicht gefunden', 404);

  if (teile[1] === 'pdf') {
    const pdf = await ladePdf(s, rec.id);
    return new Response(pdf, { headers: { 'content-type': 'application/pdf', 'content-disposition': `inline; filename="Angebot-${rec.nummer}.pdf"`, 'cache-control': 'no-store' } });
  }

  if (req.method === 'POST') {
    const form = await req.formData();
    const aktion = form.get('aktion');
    let meldung = '';
    if (aktion === 'speichern' && rec.status === 'entwurf') {
      anwenden(rec, form);
      rec.verlauf.push({ zeit: new Date().toISOString(), text: 'Angepasst' });
      await pdfNeu(s, rec);
      meldung = 'Gespeichert, PDF neu erstellt.';
    } else if (aktion === 'senden' && rec.status !== 'verworfen') {
      const r = await anKundenSenden(s, rec);
      meldung = r.gesendet ? `Gesendet an ${esc(rec.daten.email)}.` : `Nicht gesendet: ${esc(r.grund)}.`;
    } else if (aktion === 'verwerfen' && rec.status === 'entwurf') {
      rec.status = 'verworfen';
      rec.verlauf.push({ zeit: new Date().toISOString(), text: 'Verworfen' });
      await speichere(s, rec);
    } else if (aktion === 'wiederherstellen' && rec.status === 'verworfen') {
      rec.status = 'entwurf';
      rec.verlauf.push({ zeit: new Date().toISOString(), text: 'Wiederhergestellt' });
      await speichere(s, rec);
    }
    return detail(rec, meldung);
  }

  return detail(rec);
};
