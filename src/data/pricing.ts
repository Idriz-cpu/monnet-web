// ⚠️ PLATZHALTER-RICHTWERTE – bitte durch echte MON-NET-Preise ersetzen.
// Alle Beträge in EUR brutto. Die Spanne wird mit `spread` (+/-) angezeigt.
export const pricing = {
  showEstimate: true,
  spread: 0.15,
  pv: {
    m2PerKwp: 5.5,          // benötigte Dachfläche je kWp
    eurPerKwp: [            // Staffelpreise je kWp
      { upTo: 6, eur: 1800 },
      { upTo: 10, eur: 1550 },
      { upTo: 20, eur: 1350 },
      { upTo: 9999, eur: 1200 },
    ],
    roofSurcharge: { satteldach: 0, flachdach: 0.08, pultdach: 0.03, andere: 0.1 },
    batteryEurPerKwh: 650,
    wallboxEur: 1800,
    minKwp: 3,
    maxKwp: 30,
  },
  wp: {
    wattPerM2: { neubau: 40, saniert: 65, unsaniert: 100 }, // Heizlast-Schätzung
    baseEur: 11000,
    eurPerKw: 850,
    radiatorSurcharge: { fussboden: 0, gemischt: 1000, heizkoerper: 2000 },
    removalEur: { oel: 2500, gas: 1200, strom: 800, andere: 1500, keine: 0 },
    hotWaterEur: 1800,
  },
};
