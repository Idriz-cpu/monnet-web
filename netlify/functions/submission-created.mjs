// Wird von Netlify automatisch bei jeder bestätigten Formular-Einsendung aufgerufen.
// Erstellt für "wp-anfrage" einen Angebotsentwurf und schickt ihn zur Freigabe an MON-NET.
// An den Kunden geht nichts, bevor das Angebot unter /angebote freigegeben wurde.
import { connectLambda } from '@netlify/blobs';
import { store } from '../lib/store.mjs';
import { ausAnfrage, freigabeMail } from '../lib/ablauf.mjs';

export const handler = async (event) => {
  if (!process.env.ANGEBOTE_LOCAL_DIR) connectLambda(event);
  const { payload } = JSON.parse(event.body || '{}');
  if (!payload || payload.form_name !== 'wp-anfrage') return { statusCode: 200, body: 'ignoriert' };
  const s = store();
  try {
    const { rec, neu, pdf } = await ausAnfrage(s, payload.data || {}, { id: payload.id, erstellt: payload.created_at });
    if (neu) {
      const m = await freigabeMail(rec, pdf);
      console.log(`[angebot] ${rec.nummer} erstellt, Freigabe-Mail: ${m.gesendet ? 'gesendet' : m.grund}`);
    }
    return { statusCode: 200, body: rec.nummer };
  } catch (e) {
    console.error('[angebot] Fehler', e);
    return { statusCode: 200, body: 'Fehler protokolliert' }; // Einsendung selbst nicht blockieren
  }
};
