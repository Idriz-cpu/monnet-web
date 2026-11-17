# MON-NET Webseite

Neue Webseite für MON-NET (ersetzt die Webnode-Seite monnet.lu), mit Wärmepumpen-Konfigurator für Luxemburg (Start nur Wärmepumpen LU).

- Astro 5 + Tailwind CSS 4, statisch gebaut
- Formulare über `public/api/anfrage.php` (PHP `mail()` an info@mon-net.eu, läuft auf IONOS / netsite.lu)
- Firmendaten & Leistungen: `src/data/site.ts`
- Wärmepumpen-Pakete, Preise und Klimabonus: `src/data/waermepumpe.json` (aktuell Platzhalter!)

```bash
npm install
npm run dev     # http://localhost:4321
npm run build
```
