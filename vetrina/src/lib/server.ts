/**
 * Chiamate alle funzioni in api/ e sessione dell'area volontari (BACKEND.md §7).
 * La sessione è un token firmato dal server: con "Ricordami" resta in localStorage (30 giorni),
 * senza resta in sessionStorage (24 ore, si chiude con il browser). Solo su questo dispositivo.
 */
import { useSyncExternalStore } from "react";
import type { Utente } from "@/data/types";

/** Errore di API con messaggio già pronto da mostrare (tono del manuale) */
export class ApiError extends Error {
  field?: string;
  status?: number;
  constructor(message: string, field?: string, status?: number) {
    super(message);
    this.field = field;
    this.status = status;
  }
}

/* ───────── sessione ───────── */
export type Sessione = { token: string; scade: number; ricordami: boolean; utente: Utente };
const CHIAVE = "foro:sessione";

function leggiSessione(): Sessione | null {
  for (const s of [() => localStorage, () => sessionStorage]) {
    try {
      const raw = s().getItem(CHIAVE);
      if (!raw) continue;
      const v = JSON.parse(raw) as Sessione;
      if (v?.token && v.scade > Date.now() && v.utente) return v;
      s().removeItem(CHIAVE);
    } catch {
      /* storage non disponibile */
    }
  }
  return null;
}

let sessione: Sessione | null = leggiSessione();
const subs = new Set<() => void>();

export function impostaSessione(s: Sessione | null) {
  sessione = s;
  try {
    localStorage.removeItem(CHIAVE);
    sessionStorage.removeItem(CHIAVE);
    if (s) (s.ricordami ? localStorage : sessionStorage).setItem(CHIAVE, JSON.stringify(s));
  } catch {
    /* si resta in memoria */
  }
  subs.forEach((f) => f());
}
/** aggiorna i dati dell'utente (profilo, preferenze) senza toccare il token */
export function aggiornaUtente(u: Utente) {
  if (sessione) impostaSessione({ ...sessione, utente: u });
}
export const sessioneCorrente = () => sessione;
export function useSessioneServer() {
  return useSyncExternalStore(
    (f) => {
      subs.add(f);
      return () => subs.delete(f);
    },
    () => sessione,
    () => sessione,
  );
}

/* ───────── chiamate ───────── */
type Opzioni = { method?: "GET" | "POST" | "PUT" | "DELETE"; body?: unknown; query?: Record<string, string | number | undefined> };

export async function chiama<T>(percorso: string, { method = "GET", body, query }: Opzioni = {}): Promise<T> {
  const url = new URL(`/api/${percorso}`, window.location.origin);
  for (const [k, v] of Object.entries(query ?? {})) if (v !== undefined) url.searchParams.set(k, String(v));
  let r: Response;
  try {
    r = await fetch(url, {
      method,
      headers: {
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
        ...(sessione ? { Authorization: `Bearer ${sessione.token}` } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError("Non riusciamo a raggiungere il server. Controlla la connessione e riprova.");
  }
  const data = (await r.json().catch(() => ({}))) as { message?: string; field?: string };
  if (!r.ok) {
    // sessione scaduta o utente eliminato: si torna alla pagina di accesso
    if (r.status === 401 && sessione) impostaSessione(null);
    throw new ApiError(data.message || "Qualcosa non ha funzionato. Riprova tra poco.", data.field, r.status);
  }
  return data as T;
}

/* ───────── passaggio dal vecchio sito ─────────
 * Chi era già dentro il vecchio gestionale (localStorage "user" + "sessionToken" del giorno) entra senza rifare il login:
 * il token vecchio si scambia una sola volta con uno nuovo, poi le chiavi vecchie si cancellano. */
(async () => {
  try {
    const user = localStorage.getItem("user");
    const vecchio = localStorage.getItem("sessionToken");
    if (!user || !vecchio) return;
    const pulisci = () => ["user", "sessionToken", "loginTime", "rememberMe"].forEach((k) => localStorage.removeItem(k));
    if (sessione) return pulisci();
    const id = (JSON.parse(user) as { id?: number }).id;
    const ricordami = localStorage.getItem("rememberMe") === "true";
    const r = await fetch("/api/autenticazione?action=scambia", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${id}:${vecchio}` },
      body: JSON.stringify({ ricordami }),
    });
    if (r.ok) {
      const d = (await r.json()) as { token: string; scade: number; utente: Utente };
      impostaSessione({ token: d.token, scade: d.scade, ricordami, utente: d.utente });
    }
    if (r.ok || r.status === 401) pulisci();
  } catch {
    /* si riprova al prossimo caricamento */
  }
})();
