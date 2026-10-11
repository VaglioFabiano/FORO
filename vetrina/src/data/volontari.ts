/**
 * Livelli del gestionale, come in produzione: numero più basso = più permessi.
 * Le persone vere arrivano dal server (api/user.js).
 */
import type { Livello } from "./types";

/**
 * Nomi e permessi copiati dal gestionale in produzione (client/src/dashboard/CreaUtenti.tsx:261,
 * VisualizzaUtenti.tsx:39, homedash.tsx: minLevel dei moduli). Il livello 0 è dei programmatori:
 * si assegna solo a mano su Turso, dal sito nessuno può cambiarlo o abbassarlo, e nelle liste
 * compare come "Direttivo".
 */
export const LIVELLI: Record<Livello, { label: string; descr: string }> = {
  0: { label: "Direttivo", descr: "Programmatori: tutto, compreso il debug di Telegram. Si assegna solo su Turso." },
  1: { label: "Direttivo", descr: "Tutto tranne il debug di Telegram: anche gli utenti e il report PDF delle presenze." },
  2: { label: "Sociə Organizzatorə", descr: "Eventi, tesserati, notifiche Telegram, testi del sito e creazione dei verbali." },
  3: { label: "Sociə", descr: "Come Volontariə." },
  4: { label: "Volontariə", descr: "Turni, presenze, orari, verbali, contabilità, manuale del turno e profilo." },
};
