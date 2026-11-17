# MON-NET Webseite

Neue Webseite für MON-NET (ersetzt die Webnode-Seite monnet.lu), mit Online-Preisanfrage für Photovoltaik und Wärmepumpen.

- Astro 5 + Tailwind CSS 4, statisch gebaut
- Formulare über Netlify Forms (Benachrichtigung per E-Mail an info@mon-net.eu in den Netlify-Einstellungen aktivieren)
- Firmendaten & Leistungen: `src/data/site.ts`
- Preis-Richtwerte für die Preisindikation: `src/data/pricing.ts` (aktuell Platzhalter!)

```bash
npm install
npm run dev     # http://localhost:4321
npm run build
```
