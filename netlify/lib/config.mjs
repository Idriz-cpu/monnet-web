// Zentrale Einstellungen für die automatischen Wärmepumpen-Angebote (Aktion WP10).
// Preise sind NETTO in EUR (Stand 2026 = Angebot 2024 + 5 %). Hier ändern, dann neu deployen.

export const FIRMA = {
  name: 'MON-NET Facility',
  strasse: '6A Sauergaass',
  ort: 'L-6690 Moersdorf',
  telefon: '+352 20 211 466',
  fax: '+352 20 211 566',
  email: 'info@mon-net.eu',
  web: 'www.monnet.lu',
  // Optional, erscheint im Fuß des PDFs, wenn ausgefüllt
  rcs: '',
  tva: '',
  bank: '',
  unterschrift: 'Installateur- und Heizungsbaumeister',
};

// Komplettpakete (müssen zu aktion/index.html, Array PAKETE, passen)
export const PAKETE = {
  '7 kW': 26747,
  '10 kW': 29719,
  '12 kW': 31130,
};

export const RABATT = { code: 'WP10', satz: 0.10, anfrageBis: '2026-12-31', bestellungBis: '2027-01-31' };

export const OPTIONEN = {
  fundament: 2048,
  abgleich: 1406,
  demontage: 2208,
  heizstab: 3374, // Alternativposition, nicht in der Summe
};

export const GUELTIG_TAGE = 30;
export const NUMMER_PREFIX = 'WP';
