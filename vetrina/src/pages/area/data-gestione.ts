/**
 * Dati dei moduli di gestione (presenze, partecipanti degli eventi, tesserati, segnalazioni), dalle funzioni in api/.
 * Solo in memoria: nomi, email e telefoni non restano nel browser (BACKEND.md §14).
 */
import { createStore } from "@/lib/store";
import { chiama } from "@/lib/server";
import { fasceDelGiorno, orariStore } from "@/lib/api";
import { FASCE_TURNI } from "@/data/orari";
import type { Presenza, Segnalazione } from "@/data/types";
import { mondayOf, romeNow, toMin, todayIso, weekdayOf } from "@/lib/time";
import { nomeCompleto } from "./data-turni";

/* ═════════════ utilità deterministiche ═════════════ */

/** FNV-1a a 32 bit */
export function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  // mescolamento finale (avalanche) per stringhe molto simili
  h ^= h >>> 15;
  h = Math.imul(h, 0x2c1b3c6d);
  h ^= h >>> 12;
  return h >>> 0;
}
const pad2 = (n: number) => String(n).padStart(2, "0");

export const slug = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);

/** CSV con separatore ";" e BOM, così si apre bene anche in Excel italiano */
export function downloadCsv(filename: string, rows: (string | number | null | undefined)[][]) {
  const esc = (v: string | number | null | undefined) => {
    const s = v == null ? "" : String(v);
    return /[";\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = "\ufeff" + rows.map((r) => r.map(esc).join(";")).join("\r\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

/** "16.09 alle 15:52" da un timestamp locale "YYYY-MM-DDTHH:MM" */
export function fmtQuando(ts: string) {
  const [d, t] = ts.split("T");
  const [, m, g] = d.split("-");
  return `${g}.${m} alle ${(t ?? "").slice(0, 5)}`;
}
/** timestamp locale (ora italiana) "YYYY-MM-DDTHH:MM" */
export function adessoLocale() {
  const r = romeNow();
  return `${r.iso}T${pad2(r.hour)}:${pad2(r.minute)}`;
}
/** ISO datetime (UTC) → timestamp locale italiano */
export function isoToLocale(iso: string) {
  if (!iso.endsWith("Z") && !/[+-]\d\d:\d\d$/.test(iso)) return iso.slice(0, 16);
  const r = romeNow(new Date(iso));
  return `${r.iso}T${pad2(r.hour)}:${pad2(r.minute)}`;
}

/** chi ha registrato un dato; senza id è lo storico del vecchio sito */
export const nomeUtente = (id?: number | null) => (id == null ? "Archivio" : nomeCompleto(id));

/* ═════════════ PRESENZE ═════════════ */

export type FasciaKey = Presenza["fascia"];
export const FASCE_P = FASCE_TURNI.map((f) => ({
  key: f.presenze as FasciaKey,
  label: f.presenze.replace("-", "–"),
  nome: f.label,
  start: f.start,
  end: f.end,
}));
export type RegPresenza = Presenza & { il?: string };
export const pkey = (iso: string, f: FasciaKey) => `${iso}|${f}`;

/**
 * fasce aperte in un giorno: dalla tabella orari se è la settimana in corso, altrimenti lo standard (lun–ven, 09:00–19:30).
 * La sera (21–24) si apre solo con un orario straordinario: nei giorni passati compare se c'è un dato registrato.
 */
export function fasceAperte(iso: string, oggi = todayIso(), reg: Record<string, RegPresenza> = presenzeStore.get()) {
  const inSettimana = iso >= mondayOf(oggi);
  if (inSettimana) {
    const f = fasceDelGiorno(orariStore.get(), iso, oggi);
    return FASCE_P.filter((s) => f.some((x) => toMin(x.start) < toMin(s.end) && toMin(x.end) > toMin(s.start)) || reg[pkey(iso, s.key)]);
  }
  const feriale = weekdayOf(iso) <= 4;
  return FASCE_P.filter((s) => reg[pkey(iso, s.key)] || (feriale && s.key !== "21-24"));
}

/** presenze registrate, per "giorno|fascia" (api/presenze.js: presenze + storico del vecchio sito) */
export const presenzeStore = createStore<Record<string, RegPresenza>>("presenze", {}, { persist: false });
/** periodi già scaricati, "dal|al" */
const scaricati = new Set<string>();
/** scarica le presenze di un periodo (una volta sola, salvo forza) */
export async function caricaPresenze(dal: string, al: string, forza = false) {
  const k = `${dal}|${al}`;
  if (scaricati.has(k) && !forza) return;
  const { presenze } = await chiama<{ presenze: (Presenza & { il?: string })[] }>("presenze", { query: { dal, al } });
  scaricati.add(k);
  presenzeStore.set((cur) => {
    const n = { ...cur };
    // il periodo arriva intero: prima si tolgono i dati vecchi di quei giorni
    for (const key of Object.keys(n)) {
      const d = key.slice(0, 10);
      if (d >= dal && d <= al) delete n[key];
    }
    for (const p of presenze) n[pkey(p.data, p.fascia)] = { ...p, il: p.il ? isoToLocale(p.il) : undefined };
    return n;
  });
}
/** inserisce o corregge il conteggio di una fascia */
export async function salvaPresenza(p: { data: string; fascia: FasciaKey; numero: number; note?: string }, userId?: number) {
  await chiama("presenze", { method: "POST", body: p });
  presenzeStore.set((r) => ({ ...r, [pkey(p.data, p.fascia)]: { ...p, note: p.note?.trim() || undefined, userId, il: adessoLocale() } }));
}
export async function eliminaPresenza(data: string, fascia: FasciaKey) {
  await chiama("presenze", { method: "DELETE", body: { data, fascia } });
  presenzeStore.set((r) => {
    const n = { ...r };
    delete n[pkey(data, fascia)];
    return n;
  });
}

/** riepilogo di un mese "YYYY-MM": giorno per giorno, totali, medie, massimi e somme per fascia */
export function statisticheMese(ym: string, reg: Record<string, RegPresenza>) {
  const righe = giorniDelMese(ym).map((iso) => ({ iso, wd: weekdayOf(iso), tot: totaleGiorno((f) => reg[pkey(iso, f)]?.numero) }));
  const conDati = righe.filter((r) => r.tot !== null);
  const totale = conDati.reduce((a, r) => a + (r.tot ?? 0), 0);
  let max = { n: 0, iso: "", f: "" };
  const perFascia = FASCE_P.map((f) => ({ ...f, somma: 0, giorni: 0 }));
  for (const r of righe) {
    FASCE_P.forEach((f, i) => {
      const v = reg[pkey(r.iso, f.key)]?.numero;
      if (v === undefined) return;
      perFascia[i].somma += v;
      perFascia[i].giorni++;
      if (v > max.n) max = { n: v, iso: r.iso, f: f.label };
    });
  }
  const record = conDati.reduce<{ iso: string; tot: number } | null>((b, r) => (!b || (r.tot ?? 0) > b.tot ? { iso: r.iso, tot: r.tot ?? 0 } : b), null);
  return { righe, totale, giorniAperti: conDati.length, media: conDati.length ? totale / conDati.length : 0, max, record, perFascia };
}

/** apertura dell'aula (giugno 2022): da qui parte lo storico delle presenze del vecchio sito */
export const PRIMO_MESE = "2022-06";

/** i mesi "YYYY-MM" dal più recente all'apertura dell'aula (o al primo con dati, se è più vecchio), fino al mese in corso */
export function mesiDisponibili(reg: Record<string, RegPresenza>, oggi = todayIso()) {
  const date = Object.values(reg).map((r) => r.data);
  const fine = oggi.slice(0, 7);
  const inizio = date.reduce((a, b) => (a < b ? a : b), PRIMO_MESE).slice(0, 7);
  const out: string[] = [];
  for (let ym = fine; ym >= inizio; ym = spostaMese(ym, -1)) out.push(ym);
  return out;
}

/** totale del giorno senza doppi conteggi: chi resta tutto il pomeriggio si conta una volta */
export function totaleGiorno(get: (f: FasciaKey) => number | undefined) {
  const v = FASCE_P.map((f) => get(f.key));
  if (v.every((x) => x === undefined)) return null;
  const [a, b, c, d] = v.map((x) => x ?? 0);
  return a + Math.max(b, c) + d;
}

/** giorni del mese "YYYY-MM" */
export function giorniDelMese(ym: string) {
  const [y, m] = ym.split("-").map(Number);
  const n = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return Array.from({ length: n }, (_, i) => `${ym}-${pad2(i + 1)}`);
}
export function spostaMese(ym: string, delta: number) {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}`;
}

/* ═════════════ EVENTI: partecipanti e check-in (api/eventi.js, livello ≤ 2) ═════════════ */

export interface Partecipante {
  id: string;
  eventoId: number;
  nome: string;
  cognome: string;
  email: string;
  biglietti: number;
  note?: string;
  /** ISO UTC della prenotazione */
  creataIl: string;
  codice: string;
  arrivati: number;
}

export async function caricaPartecipanti(eventoId: number) {
  return (await chiama<{ partecipanti: Partecipante[] }>("eventi", { query: { action: "partecipanti", id: eventoId } })).partecipanti;
}
/** arrivi registrati alla porta */
export async function salvaArrivati(prenotazioneId: string, arrivati: number) {
  await chiama("eventi", { method: "PUT", query: { action: "checkin" }, body: { id: prenotazioneId, arrivati } });
}
export const arrivatiDi = (p: Partecipante) => Math.min(p.biglietti, p.arrivati);

/* ═════════════ TESSERATI ═════════════ */

/** chi è tesserato per partecipare al CineFORO: gli stessi campi della tabella `tesserati` del sito attuale */
export interface TesseratoCine {
  id: number;
  nome: string;
  cognome: string;
  email?: string;
  numero_di_telefono?: string;
  /** "YYYY-MM-DD" */
  data_iscrizione: string;
}

/** tesserati (api/user.js?entity=tesserato, livello ≤ 2): stessi campi e controlli di oggi */
export async function caricaTesserati() {
  return (await chiama<{ tesserati: TesseratoCine[] }>("user", { query: { entity: "tesserato" } })).tesserati;
}
export async function salvaTesserato(t: Omit<TesseratoCine, "id" | "data_iscrizione"> & { id?: number }) {
  return (await chiama<{ tesserato: TesseratoCine }>("user", { method: t.id ? "PUT" : "POST", query: { entity: "tesserato" }, body: t })).tesserato;
}
export async function eliminaTesserato(id: number) {
  await chiama("user", { method: "DELETE", query: { entity: "tesserato" }, body: { id } });
}

/* ═════════════ SEGNALAZIONI ═════════════ */

/** le segnalazioni arrivate dal sito (api/homepage.js, livello ≤ 2): si leggono e basta, nessuno stato */
export async function caricaSegnalazioni() {
  return (await chiama<{ segnalazioni: Segnalazione[] }>("homepage", { query: { action: "segnalazioni" } })).segnalazioni;
}

export const CATEGORIE_SEGN: Record<Segnalazione["categoria"], string> = {
  guasto: "Guasto",
  pulizia: "Pulizia",
  regolamento: "Regolamento",
  proposta: "Proposta",
  generico: "Generico",
  altro: "Altro",
};
export const LUOGHI_SEGN: Record<Segnalazione["aula"], string> = {
  foro: "Aula FORO",
  agora: "Aula AGORÀ",
  ristoro: "Zona ristoro",
  esterno: "Spazi esterni",
  generico: "Generico",
  altro: "Altro",
};
/* ═════════════ ORARI: canale Telegram ═════════════ */

export const TELEGRAM = {
  canale: "@aulastudioforo",
  nomeCanale: "FORO · Aula studio",
  contatto: "@AAAdminForo",
};
