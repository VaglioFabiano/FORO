/**
 * Orari di apertura. Stesso modello del gestionale reale: fasce per nome del giorno,
 * settimana corrente + prossima. La settimana corrente riprende i dati del sito live
 * (snapshot 30.09.2026); la prossima contiene due aperture straordinarie di esempio.
 */
import type { OrariSettimane } from "./types";

export const ORARIO_STANDARD = { start: "09:00", end: "19:30" } as const;

/** fasce fisse dei turni volontari (gestionale) */
export const FASCE_TURNI = [
  { index: 0, label: "Mattina", start: "09:00", end: "13:00", presenze: "9-13" },
  { index: 1, label: "Pranzo", start: "13:00", end: "16:00", presenze: "13-16" },
  { index: 2, label: "Pomeriggio", start: "16:00", end: "19:30", presenze: "16-19" },
  { index: 3, label: "Sera", start: "21:00", end: "24:00", presenze: "21-24" },
] as const;

/** L'Aula AGORÀ diventa sala pranzo in questa fascia */
export const AGORA_PRANZO = { start: "12:30", end: "14:30" } as const;

export const ORARI_SEED: OrariSettimane = {
  current: [
    { id: 2, giorno: "lunedì", ora_inizio: "09:00", ora_fine: "19:30" },
    { id: 3, giorno: "martedì", ora_inizio: "09:00", ora_fine: "18:30" },
    { id: 4, giorno: "mercoledì", ora_inizio: "09:00", ora_fine: "18:00" },
    { id: 1, giorno: "giovedì", ora_inizio: "09:00", ora_fine: "18:00", note: "Chiusura anticipata per Commissione comunale" },
    { id: 5, giorno: "venerdì", ora_inizio: "09:00", ora_fine: "18:30" },
  ],
  next: [
    { id: 11, giorno: "lunedì", ora_inizio: "09:00", ora_fine: "19:30" },
    { id: 12, giorno: "martedì", ora_inizio: "09:00", ora_fine: "19:30" },
    { id: 13, giorno: "mercoledì", ora_inizio: "09:00", ora_fine: "19:30" },
    { id: 17, giorno: "mercoledì", ora_inizio: "21:00", ora_fine: "24:00", note: "Serale per la sessione d'esami" },
    { id: 14, giorno: "giovedì", ora_inizio: "09:00", ora_fine: "19:30" },
    { id: 15, giorno: "venerdì", ora_inizio: "09:00", ora_fine: "19:30" },
    { id: 16, giorno: "sabato", ora_inizio: "09:30", ora_fine: "13:00", note: "Apertura straordinaria" },
  ],
};
