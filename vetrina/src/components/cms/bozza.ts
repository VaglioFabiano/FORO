/**
 * Utilità della modifica dei testi: chiavi, controllo dei campi, salvataggio di una sezione.
 */
import { bozzaStore, contenutiStore, salvaTesti, type GruppoTesti, type VoceTesto } from "@/lib/contenuti";

export type Campo = { g: GruppoTesti; v: VoceTesto };
export const chiave = (c: Campo) => `${c.g.id}.${c.v.key}`;

const URL_OK = /^https:\/\/[^\s/]+\.[^\s]+$/i;
const EMAIL_OK = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const COORD_OK = /^\s*-?\d{1,2}(\.\d+)?\s*,\s*-?\d{1,3}(\.\d+)?\s*$/;

/** messaggio d'errore del campo, oppure null se va bene */
export function erroreCampo(v: VoceTesto, valore: string): string | null {
  const s = valore.trim();
  if (!s) return v.obbligatorio ? "Questo campo non può restare vuoto: il sito lo usa." : null;
  if (v.tipo === "url" && !URL_OK.test(s)) return "Scrivi il link completo, che inizia con https://";
  if (v.tipo === "email" && !EMAIL_OK.test(s)) return "Controlla l'indirizzo email.";
  if (v.tipo === "coordinate" && !COORD_OK.test(s)) return "Scrivi latitudine e longitudine separate da una virgola, per esempio 44.98767, 7.46571";
  return null;
}

/** valore che si vede ora: modifica in corso, testo salvato o originale */
export function valoreDi(k: string, v: VoceTesto, bozza = bozzaStore.get(), salvati = contenutiStore.get()) {
  return bozza[k] ?? salvati[k] ?? v.default;
}
export function scriviBozza(k: string, val: string) {
  bozzaStore.set((b) => ({ ...b, [k]: val }));
}

/**
 * salva sul server le modifiche in corso dei campi indicati; un testo riportato all'originale torna a seguire il testo di base.
 * Se il server rifiuta, la bozza resta com'è e l'errore arriva a chi chiama.
 */
export async function salvaBozza(campi: Campo[]) {
  const bz = bozzaStore.get();
  const daSalvare: Record<string, string> = {};
  const daTogliere: string[] = [];
  for (const c of campi) {
    const k = chiave(c);
    if (bz[k] === undefined) continue;
    const val = c.v.tipo && c.v.tipo !== "testo" ? bz[k].trim() : bz[k];
    if (val === c.v.default) daTogliere.push(k);
    else daSalvare[k] = val;
  }
  await salvaTesti(daSalvare, daTogliere);
  scartaBozza(campi);
}
export function scartaBozza(campi: Campo[]) {
  bozzaStore.set((b) => {
    const n = { ...b };
    campi.forEach((c) => delete n[chiave(c)]);
    return n;
  });
}
