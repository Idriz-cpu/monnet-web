// Ablage der Angebote in Netlify Blobs (Store "angebote").
// Für lokale Tests: ANGEBOTE_LOCAL_DIR=/pfad setzt eine Ablage im Dateisystem.
import { getStore } from '@netlify/blobs';
import fs from 'node:fs/promises';
import path from 'node:path';
import { NUMMER_PREFIX } from './config.mjs';

function lokal(dir) {
  const file = (k) => path.join(dir, encodeURIComponent(k));
  return {
    async get(k, o = {}) {
      try {
        const b = await fs.readFile(file(k));
        return o.type === 'json' ? JSON.parse(b.toString()) : o.type === 'arrayBuffer' ? b : b.toString();
      } catch { return null; }
    },
    async set(k, v, o = {}) {
      await fs.mkdir(dir, { recursive: true });
      if (o.onlyIfNew) {
        try { await fs.writeFile(file(k), v, { flag: 'wx' }); return { modified: true }; } catch { return { modified: false }; }
      }
      await fs.writeFile(file(k), v);
      return { modified: true };
    },
    async setJSON(k, v, o) { return this.set(k, JSON.stringify(v), o); },
    async list({ prefix }) {
      await fs.mkdir(dir, { recursive: true });
      const keys = (await fs.readdir(dir)).map(decodeURIComponent).filter((k) => k.startsWith(prefix));
      return { blobs: keys.map((key) => ({ key })) };
    },
  };
}

export const store = () =>
  process.env.ANGEBOTE_LOCAL_DIR ? lokal(process.env.ANGEBOTE_LOCAL_DIR) : getStore({ name: 'angebote', consistency: 'strong' });

export async function naechsteNummer(s, jahr = new Date().getFullYear()) {
  const { blobs } = await s.list({ prefix: `nummer/${jahr}/` });
  let n = blobs.length + 1;
  for (;;) {
    const key = `nummer/${jahr}/${String(n).padStart(4, '0')}`;
    const r = await s.set(key, new Date().toISOString(), { onlyIfNew: true });
    if (r.modified) return `${NUMMER_PREFIX}-${jahr}-${String(n).padStart(4, '0')}`;
    n += 1;
  }
}

export const lade = (s, id) => s.get(`angebot/${id}`, { type: 'json' });
export const speichere = (s, rec) => s.setJSON(`angebot/${rec.id}`, rec);
export const ladePdf = (s, id) => s.get(`pdf/${id}`, { type: 'arrayBuffer' });
export const speicherePdf = (s, id, bytes) => s.set(`pdf/${id}`, bytes);

export async function alle(s) {
  const { blobs } = await s.list({ prefix: 'angebot/' });
  const recs = await Promise.all(blobs.map((b) => s.get(b.key, { type: 'json' })));
  return recs.filter(Boolean).sort((a, b) => (a.erstellt < b.erstellt ? 1 : -1));
}
