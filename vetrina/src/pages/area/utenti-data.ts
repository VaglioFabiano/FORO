/** Account del gestionale (api/user.js, livello ≤ 1). Solo in memoria: telefoni e accessi non restano nel browser. */
import type { Livello } from "@/data/types";
import { createStore } from "@/lib/store";
import { chiama } from "@/lib/server";
import { addDays, todayIso } from "@/lib/time";
import { isoToLocale, slug } from "./data-gestione";
import { caricaUtenti } from "./data-turni";

export interface Account {
  id: number;
  nome: string;
  cognome: string;
  username: string;
  /** obbligatorio e unico (users.tel): lo usa anche il bot Telegram */
  telefono: string;
  livello: Livello;
  /** chat collegata al bot UFORObot */
  telegram: boolean;
  /** ISO UTC dell'ultimo accesso, oppure null se non ha mai acceduto */
  ultimoAccesso: string | null;
}
export type DatiAccount = Pick<Account, "nome" | "cognome" | "username" | "telefono" | "livello">;

export const accountStore = createStore<Account[]>("utenti-account", [], { persist: false });
export const accountPronti = createStore<boolean>("utenti-account-pronti", false, { persist: false });

export async function caricaAccount() {
  const { utenti } = await chiama<{ utenti: Account[] }>("user");
  accountStore.set(utenti);
  accountPronti.set(true);
}
/** crea l'account con la password provvisoria passwordBase(nome), che il server restituisce */
export async function creaAccount(d: DatiAccount) {
  const r = await chiama<{ utente: Account; password: string }>("user", { method: "POST", body: d });
  accountStore.set((l) => [...l, r.utente]);
  void caricaUtenti(true).catch(() => undefined);
  return r;
}
export async function modificaAccount(id: number, d: DatiAccount) {
  const r = await chiama<{ utente: Account }>("user", { method: "PUT", query: { action: "modifica" }, body: { id, ...d } });
  accountStore.set((l) => l.map((a) => (a.id === id ? r.utente : a)));
  void caricaUtenti(true).catch(() => undefined);
  return r.utente;
}
/** la password torna passwordBase(nome) */
export async function reimpostaPassword(id: number) {
  return (await chiama<{ password: string }>("user", { method: "PUT", query: { action: "reset" }, body: { id } })).password;
}
/** elimina: i turni futuri si liberano, quelli passati restano senza nome, le iscrizioni alle notifiche vengono tolte */
export async function eliminaAccount(id: number) {
  await chiama("user", { method: "DELETE", body: { id } });
  accountStore.set((l) => l.filter((a) => a.id !== id));
  void caricaUtenti(true).catch(() => undefined);
}

export function usernameLibero(nome: string, cognome: string, esistenti: Pick<Account, "username">[]) {
  const base = `${slug(nome).replace(/-/g, "")}.${slug(cognome).replace(/-/g, "")}`;
  if (!base || base === ".") return "";
  let u = base;
  for (let n = 2; esistenti.some((a) => a.username === u); n++) u = `${base}${n}`;
  return u;
}

/**
 * Password di base, sia per i nuovi account sia quando si reimposta: è il nome.
 * Se il nome ha meno di 6 lettere si ripete l'ultima fino ad arrivare a 6 (Maria → Mariaa).
 * Il server la calcola allo stesso modo (api/user.js).
 */
export function passwordBase(nome: string) {
  const n = nome.replace(/\s+/g, "");
  return n ? n.padEnd(6, n.slice(-1)) : "";
}

export function quandoAccesso(ts: string | null) {
  if (!ts) return "Non ha ancora acceduto";
  const [d, h] = isoToLocale(ts).split("T");
  const oggi = todayIso();
  if (d === oggi) return `Oggi, ${h}`;
  if (d === addDays(oggi, -1)) return `Ieri, ${h}`;
  const [y, m, g] = d.split("-");
  return `${g}.${m}.${y}`;
}
