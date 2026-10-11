/**
 * Database Turso e utilità comuni delle funzioni in api/ (i file che iniziano con "_" non sono funzioni Vercel).
 * Regole (BACKEND.md §5): un client per file, mai transazioni interattive, scritture multiple sempre con db.batch.
 */
import { createClient } from "@libsql/client";

const url = process.env.TURSO_DATABASE_URL?.trim();
const authToken = process.env.TURSO_AUTH_TOKEN?.trim();

export const db = url ? createClient({ url, authToken }) : null;

/** ogni scrittura pubblica la mette nello stesso batch: le copie in cache della homepage si aggiornano */
export const BUMP_VERSIONE = "UPDATE meta SET valore = valore + 1 WHERE chiave = 'versione_sito'";

/** errore con messaggio pronto da mostrare: { message, field? } come ApiError della vetrina */
export class Errore extends Error {
  constructor(status, message, field) {
    super(message);
    this.status = status;
    this.field = field;
  }
}

/** righe di libsql → oggetti semplici (BigInt → Number) */
export function righe(rs) {
  return rs.rows.map((r) => {
    const o = {};
    for (const c of rs.columns) {
      const v = r[c];
      o[c] = typeof v === "bigint" ? Number(v) : v;
    }
    return o;
  });
}
export const riga = (rs) => righe(rs)[0] ?? null;

export function corpo(req) {
  const b = req.body;
  if (!b) return {};
  if (typeof b === "string") {
    try {
      return JSON.parse(b);
    } catch {
      return {};
    }
  }
  return b;
}

export function query(req) {
  if (req.query) return req.query;
  return Object.fromEntries(new URL(req.url, "http://x").searchParams);
}

export function json(res, status, data) {
  res.statusCode = status;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.end(JSON.stringify(data));
}

/**
 * Avvolge un handler: CORS come oggi, OPTIONS, errori nella forma { message, field? }.
 * L'handler restituisce il corpo della risposta (200) oppure gestisce res da sé.
 */
export function funzione(handler, { metodi = "GET, POST, PUT, DELETE" } = {}) {
  return async (req, res) => {
    res.setHeader("Access-Control-Allow-Origin", process.env.ALLOWED_ORIGIN || "https://foroets.com");
    res.setHeader("Access-Control-Allow-Methods", `${metodi}, OPTIONS`);
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    if (req.method === "OPTIONS") {
      res.statusCode = 200;
      return res.end();
    }
    try {
      if (!db) throw new Errore(500, "Il database non è configurato (TURSO_DATABASE_URL).");
      const out = await handler(req, res);
      if (!res.writableEnded) json(res, 200, out ?? { ok: true });
    } catch (e) {
      if (e instanceof Errore) return json(res, e.status, { message: e.message, field: e.field });
      console.error(e);
      json(res, 500, { message: "Qualcosa non ha funzionato sul server. Riprova tra poco." });
    }
  };
}

/* ───────── controlli comuni ───────── */
export const ORA_RE = /^([01]\d|2[0-3]):[0-5]\d$|^24:00$/;
export const DATA_RE = /^\d{4}-\d{2}-\d{2}$/;
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const testo = (v) => (typeof v === "string" ? v.trim() : "");
export const intero = (v) => {
  const n = Number(v);
  return Number.isInteger(n) ? n : NaN;
};

/** stesso slug della vetrina: minuscole, senza accenti, trattini */
export function slug(s) {
  return String(s ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}
