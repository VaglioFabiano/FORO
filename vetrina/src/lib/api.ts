/**
 * API del sito FORO: le pagine e i componenti usano SOLO queste funzioni e questi hook.
 * Dati pubblici (orari, eventi, testi, storia) dal bundle di /api/homepage (lib/homepage.ts), con l'ultima copia
 * salvata nel browser per partire subito; scritture e area volontari dalle funzioni in api/ (lib/server.ts).
 */
import { useEffect, useState } from "react";
import { createStore, useStore } from "./store";
import { GIORNI, addDays, mondayOf, romeNow, toMin, todayIso, weekdayOf, fmtLong, capitalize } from "./time";
import { ORARIO_STANDARD } from "@/data/orari";
import { cacheHomepage } from "./cache";
import { ApiError, chiama, impostaSessione, sessioneCorrente, useSessioneServer, type Sessione } from "./server";
export { ApiError } from "./server";
export type { Sessione } from "./server";
export { categorieStore, useCategorie, labelCategoria, slugCategoria, CATEGORIE_DEFAULT } from "./categorie";
import type { Evento, GiornoPubblico, OrariSettimane, Prenotazione, Segnalazione, StatoAula, Utente } from "@/data/types";

/* ═════════════ store ═════════════ */
// partono dall'ultima copia della homepage (niente dati inventati): se non c'è, vuoti finché arriva il server
export const orariStore = createStore<OrariSettimane>("orari", () => cacheHomepage()?.orari ?? { current: [], next: [] }, { persist: false });
export const eventiStore = createStore<Evento[]>("eventi", () => cacheHomepage()?.eventi ?? [], { persist: false });
/** true quando il bundle della homepage è arrivato dal server almeno una volta in questa visita */
export const homepagePronta = createStore<boolean>("homepage-pronta", false, { persist: false });
/** prenotazioni fatte da questo browser (con il token per annullarle senza login) */
export const prenotazioniStore = createStore<Prenotazione[]>("mie-prenotazioni", []);
export type Consenso = { stato: "accettato" | "rifiutato"; data: string } | null;
export const consensoStore = createStore<Consenso>("consenso-cookie", null);

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const isEmail = (s: string) => EMAIL_RE.test(s.trim());

/* ═════════════ orari ═════════════ */

export function useOrari() {
  return useStore(orariStore);
}

/** fasce di un giorno ISO, prese dalla settimana corrente o dalla prossima */
export function fasceDelGiorno(orari: OrariSettimane, iso: string, oggi = todayIso()) {
  const lunediProssimo = addDays(mondayOf(oggi), 7);
  const lunediDopo = addDays(mondayOf(oggi), 14);
  const tab = iso < lunediProssimo ? orari.current : iso < lunediDopo ? orari.next : null;
  if (!tab) return [];
  const g = GIORNI[weekdayOf(iso)];
  return tab
    .filter((f) => f.giorno === g)
    .sort((a, b) => toMin(a.ora_inizio) - toMin(b.ora_inizio))
    .map((f) => ({ start: f.ora_inizio, end: f.ora_fine, note: f.note?.trim() || undefined }));
}

/** finestra mobile di 7 giorni a partire da oggi, come sul sito attuale */
export function settimanaMobile(orari: OrariSettimane, oggi = todayIso(), giorni = 7): GiornoPubblico[] {
  return Array.from({ length: giorni }, (_, i) => {
    const iso = addDays(oggi, i);
    const fasce = fasceDelGiorno(orari, iso, oggi);
    const standard =
      fasce.length === 1 && fasce[0].start === ORARIO_STANDARD.start && fasce[0].end === ORARIO_STANDARD.end;
    return {
      iso,
      weekday: weekdayOf(iso),
      fasce,
      isToday: i === 0,
      chiuso: fasce.length === 0,
      straordinario: fasce.length > 0 && !standard,
    };
  });
}

/** Aperta adesso? Se no, quando riapre? Calcolato in ora italiana. */
export function statoAula(orari: OrariSettimane, now = new Date()): StatoAula {
  const r = romeNow(now);
  const oggi = r.iso;
  const fasceOggi = fasceDelGiorno(orari, oggi, oggi);
  const aperta = fasceOggi.find((f) => r.minutes >= toMin(f.start) && r.minutes < toMin(f.end));
  if (aperta) {
    return { aperta: true, chiudeAlle: aperta.end, minutiAllaChiusura: toMin(aperta.end) - r.minutes, fascia: aperta };
  }
  for (let i = 0; i < 14; i++) {
    const iso = addDays(oggi, i);
    const f = fasceDelGiorno(orari, iso, oggi).find((x) => i > 0 || toMin(x.start) > r.minutes);
    if (f) {
      const label = i === 0 ? `oggi alle ${f.start}` : i === 1 ? `domani alle ${f.start}` : `${fmtLong(iso)} alle ${f.start}`;
      return { aperta: false, riapre: { iso, ora: f.start, label } };
    }
  }
  return { aperta: false, riapre: null };
}

/** Hook: stato dell'aula aggiornato ogni 30 secondi */
export function useStatoAula() {
  const orari = useOrari();
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 30_000);
    return () => clearInterval(t);
  }, []);
  // tick forza il ricalcolo
  void tick;
  return statoAula(orari);
}

/** Etichetta breve per chip e header: "Aperta ora · fino alle 18:00" */
export function statoLabel(s: StatoAula) {
  if (s.aperta) return { breve: "Aperta ora", dettaglio: `fino alle ${s.chiudeAlle}` };
  if (s.riapre) return { breve: "Chiusa", dettaglio: `riapre ${s.riapre.label}` };
  return { breve: "Chiusa", dettaglio: "orari in aggiornamento" };
}

/* ═════════════ eventi ═════════════ */

export function useEventi() {
  return useStore(eventiStore);
}
/** le prenotazioni fatte da questo browser */
export function usePrenotazioni() {
  return useStore(prenotazioniStore);
}

/** biglietti già prenotati, contati dal server (il secondo argomento resta per compatibilità e non serve più) */
export function postiPrenotati(e: Evento, _pren?: Prenotazione[]) {
  return e.prenotati ?? 0;
}
/** true se per l'evento ci si prenota dal sito (gli eventi aperti, come le assemblee, no) */
export function conPrenotazione(e: Pick<Evento, "prenotazione">) {
  return e.prenotazione !== false;
}
/** null = senza limite, oppure evento senza prenotazione */
export function postiRimasti(e: Evento, pren?: Prenotazione[]) {
  if (!conPrenotazione(e) || !e.postiMax) return null;
  return Math.max(0, e.postiMax - postiPrenotati(e, pren));
}
export function isPassato(e: Evento, oggi = todayIso()) {
  return e.data < oggi;
}

/** eventi pubblici ordinati: prossimi (dal più vicino) o passati (dal più recente) */
export function eventiFuturi(list: Evento[], oggi = todayIso()) {
  return list.filter((e) => e.visibile && e.data >= oggi).sort((a, b) => (a.data + a.ora).localeCompare(b.data + b.ora));
}
/** l'evento scelto "in evidenza" (1 o 2), se è online e non è ancora passato */
export function eventoInEvidenza(list: Evento[], n: 1 | 2, oggi = todayIso()) {
  return eventiFuturi(list, oggi).find((e) => e.evidenza === n);
}
/** mette un evento in evidenza al posto n (togliendolo a chi lo aveva); null lo toglie. Livello ≤ 2 */
export async function impostaEvidenza(id: number, n: 1 | 2 | null) {
  await chiama("eventi", { method: "PUT", query: { action: "evidenza" }, body: { id, n } });
  const applica = (prev: Evento[]) =>
    prev.map((x) => (x.id === id ? { ...x, evidenza: n ?? undefined } : n !== null && x.evidenza === n ? { ...x, evidenza: undefined } : x));
  eventiStore.set(applica);
  return applica;
}
export function eventiPassati(list: Evento[], oggi = todayIso()) {
  return list.filter((e) => e.visibile && e.data < oggi).sort((a, b) => b.data.localeCompare(a.data));
}
export function eventoBySlug(list: Evento[], slug: string) {
  return list.find((e) => e.slug === slug || String(e.id) === slug) ?? null;
}

export async function prenotaEvento(input: {
  eventoId: number;
  nome: string;
  cognome: string;
  email: string;
  biglietti: number;
  note?: string;
  privacy: boolean;
}): Promise<Prenotazione & { emailInviata: boolean }> {
  const e = eventiStore.get().find((x) => x.id === input.eventoId);
  if (!e) throw new ApiError("Non troviamo questo evento. Torna al calendario e riprova.");
  if (isPassato(e)) throw new ApiError("Questo evento è già passato: le prenotazioni sono chiuse.");
  if (!conPrenotazione(e)) throw new ApiError("Per questo evento non serve prenotarsi: vieni direttamente all'orario indicato.");
  if (!input.nome.trim()) throw new ApiError("Scrivi il tuo nome.", "nome");
  if (!input.cognome.trim()) throw new ApiError("Scrivi il tuo cognome.", "cognome");
  if (!isEmail(input.email)) throw new ApiError("Controlla l'indirizzo email: sembra incompleto.", "email");
  if (!input.privacy) throw new ApiError("Per prenotare serve accettare l'informativa sulla privacy.", "privacy");
  try {
    const r = await chiama<{ prenotazione: Prenotazione; emailInviata: boolean }>("eventi", { method: "POST", query: { action: "prenota" }, body: input });
    prenotazioniStore.set((l) => [...l, r.prenotazione]);
    eventiStore.set((l) => l.map((x) => (x.id === e.id ? { ...x, prenotati: x.prenotati + r.prenotazione.biglietti } : x)));
    return { ...r.prenotazione, emailInviata: r.emailInviata };
  } catch (err) {
    // posti cambiati nel frattempo: si aggiornano i numeri mostrati
    if (err instanceof ApiError && err.status === 409) void import("./homepage").then((m) => m.caricaHomepage(true));
    throw err;
  }
}

/** annulla una prenotazione fatta da questo browser (con il suo token, senza login) */
export async function annullaPrenotazione(id: string) {
  const p = prenotazioniStore.get().find((x) => x.id === id);
  if (!p?.token) throw new ApiError("Per annullare questa prenotazione scrivici: la trovi nella email di conferma.");
  try {
    await chiama("eventi", { method: "POST", query: { action: "annulla" }, body: { token: p.token } });
  } catch (err) {
    if (!(err instanceof ApiError && err.status === 404)) throw err;
  }
  prenotazioniStore.set((l) => l.filter((x) => x.id !== id));
  eventiStore.set((l) => l.map((x) => (x.id === p.eventoId ? { ...x, prenotati: Math.max(0, x.prenotati - p.biglietti) } : x)));
}

/** Link "aggiungi al calendario" (Google Calendar) */
export function calendarLink(e: Evento) {
  const d = e.data.replace(/-/g, "");
  const s = e.ora.replace(":", "") + "00";
  const f = (e.oraFine ?? e.ora).replace(":", "").replace("2400", "2359") + "00";
  const p = new URLSearchParams({
    action: "TEMPLATE",
    text: `${e.titolo} · FORO`,
    dates: `${d}T${s}/${d}T${f}`,
    ctz: "Europe/Rome",
    details: e.sottotitolo ?? "",
    location: `${e.luogo}, ${e.indirizzo}`,
  });
  return `https://calendar.google.com/calendar/render?${p.toString()}`;
}

/** File .ics scaricabile */
export function downloadIcs(e: Evento) {
  const d = e.data.replace(/-/g, "");
  const s = e.ora.replace(":", "") + "00";
  const f = (e.oraFine ?? e.ora).replace(":", "").replace("2400", "2359") + "00";
  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//FORO//Aula studio//IT",
    "BEGIN:VEVENT",
    `UID:foro-${e.id}@foroets.com`,
    `DTSTART;TZID=Europe/Rome:${d}T${s}`,
    `DTEND;TZID=Europe/Rome:${d}T${f}`,
    `SUMMARY:${e.titolo} · FORO`,
    `LOCATION:${(e.luogo + ", " + e.indirizzo).replace(/,/g, "\\,")}`,
    `DESCRIPTION:${(e.sottotitolo ?? "").replace(/,/g, "\\,")}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
  const url = URL.createObjectURL(new Blob([ics], { type: "text/calendar" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `${e.slug}.ics`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/* ═════════════ segnalazioni ═════════════ */

export async function inviaSegnalazione(input: Omit<Segnalazione, "id" | "codice" | "creataIl">): Promise<Segnalazione> {
  if (input.messaggio.trim().length < 10) throw new ApiError("Raccontaci qualcosa in più: bastano un paio di righe.", "messaggio");
  if (input.messaggio.trim().length > 800) throw new ApiError("Il messaggio è troppo lungo: al massimo 800 caratteri.", "messaggio");
  if (!input.anonima && input.email && !isEmail(input.email)) throw new ApiError("Controlla l'indirizzo email.", "email");
  const r = await chiama<{ codice: string; creataIl: string }>("homepage", { method: "POST", query: { action: "segnalazione" }, body: input });
  return { ...input, messaggio: input.messaggio.trim(), id: r.codice, codice: r.codice, creataIl: r.creataIl };
}

/* ═════════════ accesso (area volontari) ═════════════ */

export function useSessione(): Sessione | null {
  return useSessioneServer();
}
export function useUtenteCorrente(): Utente | null {
  return useSessioneServer()?.utente ?? null;
}
export function utenteCorrente(): Utente | null {
  return sessioneCorrente()?.utente ?? null;
}

/** login solo con lo username, esatto com'è scritto (come in produzione) */
export async function accedi(username: string, password: string, ricordami: boolean) {
  const r = await chiama<{ token: string; scade: number; utente: Utente }>("autenticazione", {
    method: "POST",
    query: { action: "login" },
    body: { username, password, ricordami },
  });
  impostaSessione({ token: r.token, scade: r.scade, ricordami, utente: r.utente });
  return r.utente;
}
export async function esci() {
  await chiama("autenticazione", { method: "POST", query: { action: "logout" } }).catch(() => undefined);
  impostaSessione(null);
}

/* ═════════════ canale Telegram ═════════════ */

let telegramInCorso: { n: number; canale: string; dal: number; p: Promise<number[]> } | null = null;

/**
 * Numeri degli ultimi messaggi del canale, dal più recente (api/telegram.js?action=ultimi).
 * Le chiamate ravvicinate (montaggi ripetuti della sezione) condividono la stessa richiesta per un minuto.
 */
export function ultimiTelegram(n = 3, canale = "aulastudioforo"): Promise<number[]> {
  const t = telegramInCorso;
  if (t && t.n === n && t.canale === canale && Date.now() - t.dal < 60_000) return t.p;
  const p = (async () => {
    const { post } = await chiama<{ post?: number[] }>("telegram", { query: { action: "ultimi", n, canale } });
    if (!post?.length) throw new ApiError("Nessun messaggio nel canale.");
    return post;
  })();
  telegramInCorso = { n, canale, dal: Date.now(), p };
  p.catch(() => (telegramInCorso = null));
  return p;
}

/* ═════════════ utilità di testo ═════════════ */

/** "Mercoledì 30" */
export function etichettaGiorno(iso: string) {
  const long = fmtLong(iso);
  const [g, d] = long.split(" ");
  return `${capitalize(g)} ${d}`;
}
