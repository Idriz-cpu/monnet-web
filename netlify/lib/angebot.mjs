// Berechnet aus den Formulardaten einen Angebotsvorschlag (Positionen, Summen, Prüfhinweise).
import { PAKETE, RABATT, OPTIONEN, GUELTIG_TAGE } from './config.mjs';
import { T, sprache } from './texte.mjs';

const r2 = (n) => Math.round(n * 100) / 100;
const num = (v) => {
  const n = parseInt(String(v ?? '').replace(/[^0-9]/g, ''), 10);
  return Number.isFinite(n) ? n : null;
};

// Gerätegröße wie auf der Landingpage: bis 140 m² 7 kW, bis 190 m² 10 kW, darüber 12 kW.
// Altbau vor 1978 mit Heizkörpern: eine Stufe größer.
export function groesseVorschlagen(d) {
  if (PAKETE[d.paket]) return { kw: d.paket, grund: 'vom Kunden gewählt' };
  const m2 = num(d.wohnflaeche_m2) ?? 150;
  const bj = num(d.baujahr);
  const stufen = Object.keys(PAKETE);
  let i = m2 <= 140 ? 0 : m2 <= 190 ? 1 : 2;
  let grund = `${m2} m² Wohnfläche`;
  if (bj && bj < 1978 && d.waermeverteilung !== 'Fußbodenheizung' && i < stufen.length - 1) {
    i += 1;
    grund += `, Baujahr ${bj} mit Heizkörpern`;
  }
  return { kw: stufen[i], grund };
}

// Optionen aus den Angaben ableiten. Ergebnis ist ein Vorschlag, den Idriz im Freigabe-Bereich ändern kann.
export function optionenVorschlagen(d) {
  const oel = d.heizung_aktuell === 'Heizöl';
  return {
    fundament: d.aufstellort !== 'Wandmontage' && d.aufstellort !== 'Flachdach / Garage',
    abgleich: d.waermeverteilung !== 'Fußbodenheizung',
    demontage: oel && d.oeltank !== 'Kein Tank / schon entfernt',
    heizstab: d.photovoltaik === 'Vorhanden' || d.photovoltaik === 'Geplant',
  };
}

export function anfangsEinstellungen(d) {
  const { kw, grund } = groesseVorschlagen(d);
  return {
    kw,
    kwGrund: grund,
    mwst: String(d.mwst || '').startsWith('3') ? 3 : 17,
    rabatt: String(d.aktionscode || '').trim().toUpperCase() === RABATT.code,
    optionen: optionenVorschlagen(d),
    preise: { ...OPTIONEN },
    frei: [], // [{ text, betrag }]
    sprache: sprache(d.sprache),
    anmerkung: '',
  };
}

export function pruefhinweise(d, e) {
  const h = [];
  const bj = num(d.baujahr);
  const m2 = num(d.wohnflaeche_m2);
  if (!PAKETE[d.paket]) h.push(`Größe ${e.kw} automatisch gewählt (${e.kwGrund}).`);
  else if (d.paket !== e.kw) h.push(`Kunde wünscht ${d.paket}, im Angebot steht ${e.kw}.`);
  if (m2 && m2 > 250) h.push(`Große Wohnfläche (${m2} m²): Heizlast vor Ort prüfen, eventuell mehr als 12 kW nötig.`);
  if (bj && bj < 1978 && e.kw === '12 kW' && m2 > 190) h.push('Altbau mit großer Fläche: 12 kW könnte knapp sein.');
  if (/Mehrfamilienhaus|Gewerbe/.test(d.gebaeudetyp || '')) h.push(`Gebäudetyp „${d.gebaeudetyp}“: Paketpreis passt eventuell nicht.`);
  if (e.mwst === 3 && bj && bj > new Date().getFullYear() - 10) h.push(`3 % MwSt. gewählt, aber Baujahr ${bj} ist jünger als 10 Jahre.`);
  if (e.mwst === 3 && /Neubau/.test(d.gebaeudetyp || '')) h.push('3 % MwSt. bei Neubau nicht möglich.');
  if (d.oeltank === 'Im Erdreich') h.push('Öltank im Erdreich: Demontagepreis gilt für Kellertank, Aufwand prüfen.');
  if (d.oeltank === 'weiß nicht' && e.optionen.demontage) h.push('Öltank unbekannt: Demontage vorsorglich eingerechnet.');
  if (d.aufstellort === 'Flachdach / Garage') h.push('Außengerät auf Flachdach/Garage: Statik und Unterbau prüfen.');
  if (d.aktionscode && !e.rabatt) h.push(`Aktionscode „${d.aktionscode}“ ist nicht WP10, kein Rabatt eingerechnet.`);
  if (/Neubau|Keine/.test(d.heizung_aktuell || '')) h.push('Neubau / keine alte Heizung: kein Klimabonus für Heizungstausch.');
  return h;
}

const datum = (iso, lang) =>
  new Date(iso).toLocaleDateString(lang === 'en' ? 'en-GB' : lang === 'fr' ? 'fr-LU' : 'de-LU', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Europe/Luxembourg' });

export function gueltigBis(erstellt) {
  const d = new Date(erstellt);
  d.setUTCDate(d.getUTCDate() + GUELTIG_TAGE);
  return d.toISOString();
}

// Positionen und Summen in der Sprache des Angebots
export function berechnen(rec) {
  const e = rec.einstellungen;
  const t = T[e.sprache];
  const pos = [];
  let n = 0;
  const add = (titel, text, betrag, alternativ = false) => {
    n += 1;
    pos.push({ nr: String(n).padStart(2, '0'), titel, text, betrag: r2(betrag), alternativ });
  };
  const paket = PAKETE[e.kw];
  add(t.paket(e.kw), t.paketText, paket);
  if (e.rabatt) add(t.rabatt(Math.round(RABATT.satz * 100)), '', -paket * RABATT.satz);
  if (e.optionen.fundament) add(t.fundament, t.fundamentText, e.preise.fundament);
  if (e.optionen.abgleich) add(t.abgleich, t.abgleichText, e.preise.abgleich);
  if (e.optionen.demontage) add(t.demontage, t.demontageText, e.preise.demontage);
  for (const f of e.frei || []) if (f.text && Number(f.betrag)) add(f.text, '', Number(f.betrag));
  if (e.optionen.heizstab) add(t.heizstab, t.heizstabText, e.preise.heizstab, true);

  const netto = r2(pos.filter((p) => !p.alternativ).reduce((s, p) => s + p.betrag, 0));
  const steuer = r2((netto * e.mwst) / 100);
  return {
    t,
    positionen: pos,
    netto,
    steuer,
    brutto: r2(netto + steuer),
    datum: datum(rec.erstellt, e.sprache),
    gueltig: datum(rec.gueltigBis, e.sprache),
  };
}

export const eur = (n, lang = 'de') =>
  new Intl.NumberFormat(lang === 'en' ? 'en-GB' : lang === 'fr' ? 'fr-FR' : 'de-DE', { style: 'currency', currency: 'EUR' })
    .format(n)
    .replace(/ | /g, ' ');
