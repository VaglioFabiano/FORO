/**
 * Sessioni e password (BACKEND.md §7).
 * - Password: stesso calcolo di oggi, PBKDF2 sha512 10000 iterazioni, sale passato come STRINGA esadecimale. Niente rehash.
 * - Sessione: token firmato HMAC con SESSION_SECRET, con userId e scadenza dentro (30 giorni con "Ricordami", 24 ore senza).
 *   Nessuna tabella: il livello si rilegge dal database a ogni richiesta, così un utente eliminato non entra più.
 */
import crypto from "node:crypto";
import { db, riga, Errore } from "./_db.js";

const SECRET = process.env.SESSION_SECRET || "change-this-in-production-env";
const GIORNO = 86_400_000;

export function hashPassword(password, salt) {
  return crypto.pbkdf2Sync(password, salt, 10000, 64, "sha512").toString("hex");
}
export function nuovoSale() {
  return crypto.randomBytes(32).toString("hex");
}
export function passwordGiusta(password, salt, hash) {
  if (typeof password !== "string" || typeof salt !== "string" || typeof hash !== "string") return false;
  const a = Buffer.from(hashPassword(password, salt), "hex");
  const b = Buffer.from(hash, "hex");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

const firma = (s) => crypto.createHmac("sha256", SECRET).update(s).digest("base64url");
const uguali = (a, b) => a.length === b.length && crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));

export function creaToken(userId, ricordami) {
  const scade = Date.now() + (ricordami ? 30 : 1) * GIORNO;
  const payload = Buffer.from(JSON.stringify({ u: Number(userId), s: scade })).toString("base64url");
  return { token: `${payload}.${firma(payload)}`, scade };
}

function leggiToken(token) {
  const [payload, sig] = String(token ?? "").split(".");
  if (!payload || !sig || !uguali(sig, firma(payload))) return null;
  try {
    const { u, s } = JSON.parse(Buffer.from(payload, "base64url").toString());
    return Number.isInteger(u) && s > Date.now() ? u : null;
  } catch {
    return null;
  }
}

/** il token del vecchio sito ("userId:hmac" del giorno), accettato solo per scambiarlo con uno nuovo al passaggio */
export function verificaTokenVecchio(bearer) {
  const i = String(bearer ?? "").indexOf(":");
  if (i < 1) return null;
  const userId = bearer.slice(0, i);
  const token = bearer.slice(i + 1);
  const day = Math.floor(Date.now() / GIORNO);
  for (const d of [day, day - 1]) {
    const atteso = crypto.createHmac("sha256", SECRET).update(`${userId}:${d}`).digest("hex");
    if (uguali(token, atteso)) return Number(userId);
  }
  return null;
}

export const bearer = (req) => {
  const h = req.headers?.authorization ?? req.headers?.Authorization ?? "";
  return h.startsWith("Bearer ") ? h.slice(7) : "";
};

export const COLONNE_UTENTE =
  "id, name, surname, username, tel, level, telegram_chat_id, pref_promemoria, pref_presenze";

/** l'utente della richiesta, o null */
export async function utenteDa(req) {
  const id = leggiToken(bearer(req));
  if (id === null) return null;
  return riga(await db.execute({ sql: `SELECT ${COLONNE_UTENTE} FROM users WHERE id = ?`, args: [id] }));
}

/** livello 0 è il più alto: chi ha livello <= min può. level = 0 è valido, mai `!user.level` */
export const puo = (u, min) => u != null && Number(u.level) <= min;

/** l'utente della richiesta con almeno quel livello, altrimenti 401/403 */
export async function richiedi(req, min = 4) {
  const u = await utenteDa(req);
  if (!u) throw new Errore(401, "La sessione è scaduta: accedi di nuovo.");
  if (!puo(u, min)) throw new Errore(403, "Non hai i permessi per questa operazione.");
  return u;
}

/** la forma dell'utente che arriva al browser: mai password_hash né salt */
export function utentePubblico(u, report = false) {
  return {
    id: Number(u.id),
    nome: u.name ?? "",
    cognome: u.surname ?? "",
    username: u.username ?? "",
    telefono: u.tel ?? "",
    livello: Number(u.level),
    telegram: u.telegram_chat_id != null && String(u.telegram_chat_id) !== "",
    preferenze: {
      promemoria: Number(u.pref_promemoria ?? 1) === 1,
      presenze: Number(u.pref_presenze ?? 1) === 1,
      report: !!report,
    },
  };
}
