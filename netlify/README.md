# Automatische Angebote aus der WP10-Landingpage

Jede Anfrage über das Formular `wp-anfrage` wird automatisch zu einem Angebotsentwurf. An den Kunden geht erst etwas, wenn das Angebot im Freigabe-Bereich freigegeben wurde.

## Ablauf

1. Kunde schickt das Formular ab (Netlify Forms).
2. `functions/submission-created.mjs` startet automatisch:
   - Gerätegröße: Paketwunsch des Kunden, sonst nach Wohnfläche (bis 140 m² 7 kW, bis 190 m² 10 kW, darüber 12 kW; Baujahr vor 1978 mit Heizkörpern eine Stufe größer).
   - Optionen: Bodenplatte (außer Wand/Flachdach), hydraulischer Abgleich (außer reine Fußbodenheizung), Demontage Öl inkl. Tank (bei Ölheizung mit Tank), Heizstab als Alternativposition (bei PV).
   - MwSt. 17 % oder 3 % wie vom Kunden gewählt, WP10-Rabatt 10 % auf das Komplettpaket.
   - PDF in der Sprache des Kunden (DE/FR/EN), fortlaufende Nummer `WP-2026-0001`.
   - Freigabe-Mail mit PDF und Prüfhinweisen an `ADMIN_EMAIL`.
3. Im Freigabe-Bereich `/angebote` (Passwort) prüfen, bei Bedarf anpassen, dann **Freigeben und senden**. Der Kunde bekommt das PDF per E-Mail, Kopie an `ADMIN_EMAIL`.

Preise, Firmendaten und Gültigkeit: `lib/config.mjs`. Texte: `lib/texte.mjs`.

## Einrichtung in Netlify (Site configuration → Environment variables)

| Variable | Wert |
|---|---|
| `ADMIN_PASSWORD` | Passwort für `/angebote` (Benutzername beliebig) |
| `SMTP_PASS` | Passwort des IONOS-Postfachs info@mon-net.eu |
| `SMTP_USER` | optional, Standard `info@mon-net.eu` |
| `SMTP_HOST` / `SMTP_PORT` | optional, Standard `smtp.ionos.de` / `587` |
| `MAIL_FROM` | optional, Standard `MON-NET <info@mon-net.eu>` |
| `ADMIN_EMAIL` | optional, Empfänger der Freigabe-Mails, Standard `info@mon-net.eu` |

Ohne `SMTP_PASS` werden Entwürfe trotzdem erstellt und sind unter `/angebote` sichtbar, es wird nur nichts verschickt.

Daten liegen in Netlify Blobs (Store `angebote`), im kostenlosen Netlify-Tarif enthalten.
