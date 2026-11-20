// Erzeugt das Angebots-PDF (A4) im MON-NET-Design: Rot/Schwarz/Weiß, Logo oben links.
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { FIRMA } from './config.mjs';
import { LOGO_PNG_BASE64 } from './logo.mjs';
import { berechnen, eur } from './angebot.mjs';

const ROT = rgb(237 / 255, 28 / 255, 36 / 255);
const SCHWARZ = rgb(35 / 255, 31 / 255, 32 / 255);
const GRAU = rgb(0.42, 0.42, 0.42);
const HELL = rgb(0.96, 0.96, 0.96);
const W = 595.28, H = 841.89, L = 56, R = W - 56;

// Standardschriften können nur WinAnsi: alles andere ersetzen
const clean = (s) =>
  String(s ?? '')
    .replace(/[   ]/g, ' ')
    .replace(/[≈]/g, 'ca.')
    .replace(/[^\x0a\x20-\x7e -ÿ€„“”‘’‚–—…•²³]/g, '');

function wrap(text, font, size, width) {
  const out = [];
  for (const para of clean(text).split('\n')) {
    let line = '';
    for (const word of para.split(/\s+/)) {
      const test = line ? line + ' ' + word : word;
      if (font.widthOfTextAtSize(test, size) > width && line) {
        out.push(line);
        line = word;
      } else line = test;
    }
    out.push(line);
  }
  return out;
}

export async function angebotPdf(rec) {
  const c = berechnen(rec);
  const { t } = c;
  const lang = rec.einstellungen.sprache;
  const d = rec.daten;
  const doc = await PDFDocument.create();
  doc.setTitle(`${t.angebot} ${rec.nummer}`);
  doc.setAuthor(FIRMA.name);
  const f = await doc.embedFont(StandardFonts.Helvetica);
  const fb = await doc.embedFont(StandardFonts.HelveticaBold);
  const logo = await doc.embedPng(Buffer.from(LOGO_PNG_BASE64, 'base64'));

  let page, y;
  const txt = (s, x, yy, o = {}) =>
    page.drawText(clean(s), { x, y: yy, size: o.size ?? 9.5, font: o.bold ? fb : f, color: o.color ?? SCHWARZ });
  const right = (s, x, yy, o = {}) => {
    const font = o.bold ? fb : f, size = o.size ?? 9.5;
    txt(s, x - font.widthOfTextAtSize(clean(s), size), yy, o);
  };
  const neueSeite = () => {
    page = doc.addPage([W, H]);
    page.drawRectangle({ x: 0, y: H - 6, width: W, height: 6, color: ROT });
    const lw = 130, lh = (logo.height / logo.width) * lw;
    page.drawImage(logo, { x: L, y: H - 40 - lh, width: lw, height: lh });
    y = H - 40 - lh - 24;
  };
  const platz = (h) => {
    if (y - h < 80) neueSeite();
  };
  const absatz = (s, o = {}) => {
    const size = o.size ?? 9.5, lh = size * 1.4;
    for (const line of wrap(s, o.bold ? fb : f, size, o.width ?? R - L)) {
      platz(lh);
      txt(line, o.x ?? L, y, { ...o, size });
      y -= lh;
    }
  };

  neueSeite();
  // Firmenblock rechts oben
  let fy = H - 44;
  for (const [i, s] of [FIRMA.name, FIRMA.strasse, FIRMA.ort, `T ${FIRMA.telefon}`, FIRMA.email, FIRMA.web].entries()) {
    right(s, R, fy, { size: 8.5, bold: i === 0, color: i === 0 ? SCHWARZ : GRAU });
    fy -= 11.5;
  }

  // Empfänger
  y -= 6;
  txt(`${FIRMA.name} · ${FIRMA.strasse} · ${FIRMA.ort}`, L, y, { size: 7, color: GRAU });
  y -= 16;
  const plzOrt = `${String(d.plz || '').trim().replace(/^L\s*-?\s*/i, 'L-').replace(/^(\d)/, 'L-$1')} ${d.ort || ''}`.trim();
  for (const s of [`${d.vorname || ''} ${d.nachname || ''}`.trim(), d.strasse, plzOrt]) {
    if (s) { txt(s, L, y, { size: 10.5 }); y -= 14; }
  }

  // Metadaten rechts
  let my = y + 42;
  for (const [k, v] of [[t.nr, rec.nummer], [t.datum, c.datum], [t.gueltig, c.gueltig]]) {
    txt(k, R - 190, my, { size: 9, color: GRAU });
    right(v, R, my, { size: 9, bold: true });
    my -= 14;
  }

  y -= 28;
  txt(`${t.angebot} ${rec.nummer}`, L, y, { size: 18, bold: true });
  y -= 18;
  txt(t.betreff(rec.einstellungen.kw), L, y, { size: 11, bold: true, color: ROT });
  y -= 14;
  txt(`${t.objekt}: ${[d.strasse, plzOrt].filter(Boolean).join(', ')}`, L, y, { size: 9, color: GRAU });
  y -= 26;

  absatz(t.anrede(`${d.vorname || ''} ${d.nachname || ''}`.trim()));
  y -= 2;
  absatz(t.einleitung);
  y -= 12;

  // Tabelle
  const cPos = L, cBez = L + 34, cBet = R;
  const bezW = R - 110 - cBez;
  const kopf = () => {
    page.drawRectangle({ x: L, y: y - 6, width: R - L, height: 20, color: SCHWARZ });
    txt(t.pos, cPos + 6, y, { size: 8.5, bold: true, color: rgb(1, 1, 1) });
    txt(t.bez, cBez, y, { size: 8.5, bold: true, color: rgb(1, 1, 1) });
    right(t.gp, cBet - 6, y, { size: 8.5, bold: true, color: rgb(1, 1, 1) });
    y -= 24;
  };
  kopf();
  for (const p of c.positionen) {
    const titel = wrap(p.titel, fb, 9.5, bezW);
    const text = p.text ? wrap(p.text, f, 8, bezW) : [];
    const h = titel.length * 13 + text.length * 10.5 + 10;
    if (y - h < 90) { neueSeite(); kopf(); }
    txt(p.nr, cPos + 6, y, { size: 9.5, color: GRAU });
    const betrag = eur(p.betrag, lang);
    right(p.alternativ ? `(${betrag})` : betrag, cBet - 6, y, { size: 9.5, bold: !p.alternativ, color: p.betrag < 0 ? ROT : p.alternativ ? GRAU : SCHWARZ });
    for (const l of titel) { txt(l, cBez, y, { size: 9.5, bold: true, color: p.alternativ ? GRAU : SCHWARZ }); y -= 13; }
    for (const l of text) { txt(l, cBez, y + 1, { size: 8, color: GRAU }); y -= 10.5; }
    y -= 4;
    page.drawLine({ start: { x: L, y: y + 4 }, end: { x: R, y: y + 4 }, thickness: 0.5, color: rgb(0.85, 0.85, 0.85) });
    y -= 6;
  }

  // Summen
  platz(70);
  y -= 4;
  const sx = R - 220;
  for (const [k, v] of [[t.netto, c.netto], [t.mwst(rec.einstellungen.mwst), c.steuer]]) {
    txt(k, sx, y, { size: 9.5 });
    right(eur(v, lang), cBet - 6, y, { size: 9.5 });
    y -= 15;
  }
  y -= 8;
  page.drawRectangle({ x: sx - 8, y: y - 7, width: R - sx + 8, height: 22, color: ROT });
  txt(t.brutto, sx, y, { size: 11, bold: true, color: rgb(1, 1, 1) });
  right(eur(c.brutto, lang), cBet - 6, y, { size: 11, bold: true, color: rgb(1, 1, 1) });
  y -= 34;

  // Klimabonus-Box (nur bei Heizungstausch)
  if (!/Neubau|Keine/.test(d.heizung_aktuell || '')) {
    const zeilen = wrap(t.klimabonus, f, 8.5, R - L - 24);
    const h = zeilen.length * 12 + 14;
    platz(h + 10);
    page.drawRectangle({ x: L, y: y - h + 14, width: R - L, height: h, color: HELL });
    page.drawRectangle({ x: L, y: y - h + 14, width: 3, height: h, color: ROT });
    y -= 2;
    for (const l of zeilen) { txt(l, L + 14, y, { size: 8.5 }); y -= 12; }
    y -= 16;
  }

  platz(40);
  txt(t.hinweiseTitel, L, y, { size: 10, bold: true });
  y -= 15;
  const hinweise = [...t.hinweise(c.gueltig)];
  if (rec.einstellungen.mwst === 3) hinweise.push(t.mwst3);
  if (rec.einstellungen.anmerkung) hinweise.unshift(rec.einstellungen.anmerkung);
  for (const h of hinweise) {
    const zeilen = wrap(h, f, 8.5, R - L - 12);
    platz(zeilen.length * 12);
    txt('•', L, y, { size: 8.5, color: ROT });
    for (const l of zeilen) { txt(l, L + 12, y, { size: 8.5 }); y -= 12; }
    y -= 3;
  }
  y -= 12;
  platz(70);
  absatz(t.gruss);
  y -= 22;
  txt(FIRMA.name, L, y, { size: 9.5, bold: true });
  y -= 13;
  txt(FIRMA.unterschrift, L, y, { size: 8.5, color: GRAU });

  // Fußzeile auf allen Seiten
  const pages = doc.getPages();
  const fuss = [FIRMA.name, FIRMA.strasse, FIRMA.ort, `T ${FIRMA.telefon}`, `F ${FIRMA.fax}`, FIRMA.web].filter(Boolean).join(' · ');
  const fuss2 = [FIRMA.rcs && `RCS ${FIRMA.rcs}`, FIRMA.tva && `TVA ${FIRMA.tva}`, FIRMA.bank].filter(Boolean).join(' · ');
  pages.forEach((p, i) => {
    page = p;
    p.drawLine({ start: { x: L, y: 50 }, end: { x: R, y: 50 }, thickness: 0.5, color: ROT });
    txt(fuss, L, 38, { size: 7, color: GRAU });
    if (fuss2) txt(fuss2, L, 28, { size: 7, color: GRAU });
    right(`${t.seite} ${i + 1}/${pages.length}`, R, 38, { size: 7, color: GRAU });
  });

  return { bytes: await doc.save(), summen: c };
}
