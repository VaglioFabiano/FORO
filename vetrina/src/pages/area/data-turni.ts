/**
 * Turni dei volontari (api/turni.js) e persone del gestionale (api/user.js?action=elenco).
 * Stesso modello del gestionale reale: 4 fasce fisse al giorno (FASCE_TURNI), turni
 * pianificabili su 4 settimane, turni spezzati nella stessa fascia, turni "straordinari"
 * nelle fasce di solito chiuse (sabato, domenica, sera). Dati solo in memoria, mai nel browser.
 */
import { useEffect } from "react";
import { createStore, useStore } from "@/lib/store";
import { ApiError, chiama } from "@/lib/server";
import { FASCE_TURNI } from "@/data/orari";
import type { Turno, Utente } from "@/data/types";
import { GIORNI, MESI, addDays, capitalize, fromMin, isoToDate, mondayOf, romeNow, toMin, todayIso, weekdayOf } from "@/lib/time";

export type TurnoVol = Turno;
export type FasciaIndex = 0 | 1 | 2 | 3;
export const FASCE = FASCE_TURNI;
/** turni "teorici" della settimana: lun–ven × mattina, pranzo, pomeriggio */
export const TURNI_TEORICI = 15;
/** settimane passate consultabili nel calendario dei turni */
export const SETTIMANE_STORICO = 4;
/** settimane pianificabili, a partire da quella corrente */
export const SETTIMANE_AVANTI = 4;

/* ───────── regole delle fasce ───────── */
/** fascia visiva a partire dall'ora d'inizio (come getVisualTurnoIndex del gestionale) */
export function fasciaDi(inizio: string): FasciaIndex {
  const m = toMin(inizio);
  if (m < toMin("13:00")) return 0;
  if (m < toMin("16:00")) return 1;
  if (m < toMin("21:00")) return 2;
  return 3;
}
/** sabato, domenica e sera: di solito chiuso, si apre solo con un turno straordinario */
export function isChiusa(iso: string, fascia: number) {
  return weekdayOf(iso) >= 5 || fascia === 3;
}

/* ───────── persone (nomi e livelli, per tutti i loggati) ───────── */
export const utentiStore = createStore<Utente[]>("utenti-elenco", [], { persist: false });
let utentiCaricati: Promise<void> | null = null;
export function caricaUtenti(forza = false) {
  if (!utentiCaricati || forza)
    utentiCaricati = chiama<{ utenti: Utente[] }>("user", { query: { action: "elenco" } })
      .then((r) => utentiStore.set(r.utenti))
      .catch((e) => {
        utentiCaricati = null;
        throw e;
      });
  return utentiCaricati;
}
export function useUtenti() {
  useEffect(() => void caricaUtenti().catch(() => undefined), []);
  return useStore(utentiStore);
}
export function utenteById(id: number | null | undefined): Utente | undefined {
  return id == null ? undefined : utentiStore.get().find((u) => u.id === id);
}
export function nomeCompleto(id: number | null | undefined) {
  if (id == null) return "Persona non più nel gestionale";
  const u = utenteById(id);
  return u ? `${u.nome} ${u.cognome}` : "Persona non trovata";
}

/* ───────── turni: 4 settimane indietro e 4 avanti, in memoria ───────── */
export const turniStore = createStore<TurnoVol[]>("turni", [], { persist: false });
/** true quando i turni sono arrivati dal server */
export const turniPronti = createStore<boolean>("turni-pronti", false, { persist: false });
let turniCaricati: Promise<void> | null = null;
export function periodoTurni(oggi = todayIso()) {
  const monday = mondayOf(oggi);
  return { dal: addDays(monday, -SETTIMANE_STORICO * 7), al: addDays(monday, SETTIMANE_AVANTI * 7 - 1) };
}
export function caricaTurni(forza = false) {
  if (!turniCaricati || forza)
    turniCaricati = chiama<{ turni: TurnoVol[] }>("turni", { query: periodoTurni() })
      .then((r) => {
        turniStore.set(r.turni);
        turniPronti.set(true);
      })
      .catch((e) => {
        turniCaricati = null;
        throw e;
      });
  return turniCaricati;
}

export function useTurni() {
  useEffect(() => {
    void caricaTurni().catch(() => undefined);
    void caricaUtenti().catch(() => undefined);
  }, []);
  useStore(utentiStore); // i nomi arrivano insieme: chi mostra i turni si aggiorna anche per loro
  return useStore(turniStore);
}

/* ───────── settimane ───────── */
export interface SettimanaTurni {
  index: number;
  monday: string;
  sunday: string;
  label: string;
  /** "28 set – 4 ott" */
  range: string;
}
const MESI3 = MESI.map((m) => m.slice(0, 3));
export function rangeBreve(a: string, b: string) {
  const da = isoToDate(a);
  const db = isoToDate(b);
  return da.getUTCMonth() === db.getUTCMonth()
    ? `${da.getUTCDate()}–${db.getUTCDate()} ${MESI3[db.getUTCMonth()]}`
    : `${da.getUTCDate()} ${MESI3[da.getUTCMonth()]} – ${db.getUTCDate()} ${MESI3[db.getUTCMonth()]}`;
}
export function settimaneTurni(oggi = todayIso()): SettimanaTurni[] {
  const m0 = mondayOf(oggi);
  const labels = ["Questa settimana", "Prossima settimana", "Tra due settimane", "Tra tre settimane"];
  return [0, 1, 2, 3].map((i) => {
    const monday = addDays(m0, i * 7);
    const sunday = addDays(monday, 6);
    return { index: i, monday, sunday, label: labels[i], range: rangeBreve(monday, sunday) };
  });
}

/* ───────── letture ───────── */
const byStart = (a: TurnoVol, b: TurnoVol) => toMin(a.inizio) - toMin(b.inizio);

export function turniDelGiorno(list: TurnoVol[], iso: string) {
  return list.filter((t) => t.data === iso).sort(byStart);
}
export function turniCella(list: TurnoVol[], iso: string, fascia: number) {
  return turniDelGiorno(list, iso).filter((t) => fasciaDi(t.inizio) === fascia);
}

export type StatoCopertura = "coperto" | "parziale" | "scoperto";
/** quanto è coperta una fascia standard: i buchi sono gli intervalli senza nessuno */
export function copertura(list: TurnoVol[], iso: string, fascia: number): { stato: StatoCopertura; buchi: { start: string; end: string }[] } {
  const f = FASCE_TURNI[fascia];
  const s = toMin(f.start);
  const e = toMin(f.end);
  const segs = turniDelGiorno(list, iso)
    .map((t) => [Math.max(s, toMin(t.inizio)), Math.min(e, toMin(t.fine))] as const)
    .filter(([a, b]) => b > a)
    .sort((x, y) => x[0] - y[0]);
  const buchi: { start: string; end: string }[] = [];
  let cur = s;
  for (const [a, b] of segs) {
    if (a > cur) buchi.push({ start: fromMin(cur), end: fromMin(a) });
    cur = Math.max(cur, b);
  }
  if (cur < e) buchi.push({ start: fromMin(cur), end: fromMin(e) });
  const stato: StatoCopertura = buchi.length === 0 ? "coperto" : segs.length === 0 ? "scoperto" : "parziale";
  return { stato, buchi };
}

/** true se il turno (o la fascia) è già finito rispetto ad adesso */
export function isFinito(iso: string, fine: string, now = romeNow()) {
  return iso < now.iso || (iso === now.iso && toMin(fine) <= now.minutes);
}

export interface Scoperto {
  data: string;
  fascia: number;
  buchi: { start: string; end: string }[];
  stato: StatoCopertura;
}
/** riepilogo di una settimana: turni teorici coperti, scoperti, straordinari, i tuoi */
export function riepilogoSettimana(list: TurnoVol[], monday: string, userId?: number, now = romeNow()) {
  let coperti = 0;
  const scoperti: Scoperto[] = [];
  for (let d = 0; d < 5; d++) {
    const iso = addDays(monday, d);
    for (let f = 0; f < 3; f++) {
      const c = copertura(list, iso, f);
      if (c.stato === "coperto") coperti++;
      else scoperti.push({ data: iso, fascia: f, buchi: c.buchi, stato: c.stato });
    }
  }
  const sunday = addDays(monday, 6);
  const settimana = list.filter((t) => t.data >= monday && t.data <= sunday).sort((a, b) => (a.data + a.inizio).localeCompare(b.data + b.inizio));
  const scopertiFuturi = scoperti.filter((s) => !isFinito(s.data, FASCE_TURNI[s.fascia].end, now));
  return {
    coperti,
    totali: TURNI_TEORICI,
    scoperti,
    scopertiFuturi,
    straordinari: settimana.filter((t) => t.straordinario),
    miei: userId ? settimana.filter((t) => t.userId === userId) : [],
    turni: settimana,
  };
}

/** i prossimi turni di una persona (quello in corso compreso) */
export function prossimiTurni(list: TurnoVol[], userId: number, now = romeNow()) {
  return list
    .filter((t) => t.userId === userId && !isFinito(t.data, t.fine, now))
    .sort((a, b) => (a.data + a.inizio).localeCompare(b.data + b.inizio));
}

/* ───────── etichette ───────── */
/** "Mercoledì 30 settembre" */
export function giornoLungo(iso: string) {
  const d = isoToDate(iso);
  return `${capitalize(GIORNI[weekdayOf(iso)])} ${d.getUTCDate()} ${MESI[d.getUTCMonth()]}`;
}
/** "mercoledì 30/9", come nelle notifiche del bot */
export function giornoBot(iso: string) {
  const d = isoToDate(iso);
  return `${GIORNI[weekdayOf(iso)]} ${d.getUTCDate()}/${d.getUTCMonth() + 1}`;
}

/* ───────── scritture (api/turni.js) ───────── */
export interface TurnoInput {
  data: string;
  inizio: string;
  fine: string;
  userId: number;
  note?: string;
  /** casella "straordinario" (is_closed_override), come in produzione */
  straordinario?: boolean;
}
const TIME_RE = /^([01]\d|2[0-4]):[0-5]\d$/;

/** Salva un turno nuovo o modificato. Il server ripete ogni controllo e manda i messaggi Telegram. */
export async function salvaTurno(input: TurnoInput, editId?: string): Promise<TurnoVol> {
  if (!TIME_RE.test(input.inizio)) throw new ApiError("Scrivi l'orario di inizio nel formato 09:00.", "inizio");
  if (!TIME_RE.test(input.fine)) throw new ApiError("Scrivi l'orario di fine nel formato 13:00.", "fine");
  if (toMin(input.fine) > 24 * 60) throw new ApiError("Il turno può finire al massimo a mezzanotte, alle 24:00.", "fine");
  if (toMin(input.inizio) >= toMin(input.fine)) throw new ApiError("La fine del turno deve venire dopo l'inizio.", "fine");
  if (!input.userId) throw new ApiError("Scegli la persona che prende il turno.", "userId");
  if (isFinito(input.data, input.fine)) throw new ApiError("Questo orario è già passato: puoi prendere solo turni da adesso in poi.", "inizio");
  const { turno } = await chiama<{ turno: TurnoVol }>("turni", { method: "POST", body: { ...input, id: editId } });
  turniStore.set((l) => (editId ? l.map((x) => (x.id === editId ? turno : x)) : [...l, turno]));
  return turno;
}

export async function rimuoviTurno(id: string) {
  try {
    await chiama("turni", { method: "DELETE", body: { id } });
  } catch (e) {
    // già tolto da qualcun altro: non va più mostrato, ma lo si dice
    if (e instanceof ApiError && e.status === 404) turniStore.set((l) => l.filter((t) => t.id !== id));
    throw e;
  }
  turniStore.set((l) => l.filter((t) => t.id !== id));
}
