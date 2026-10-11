/* Modelli dati del sito FORO (come arrivano dalle funzioni in api/) */
import type { Giorno } from "@/lib/time";

export type Registro = "silenzio" | "voce"; // Petrolio · Lanterna
export type AulaId = "foro" | "agora";

/* ───────── Orari ───────── */
export interface FasciaOraria {
  id: number;
  giorno: Giorno; // "lunedì" … "domenica", come nel gestionale
  ora_inizio: string; // "HH:MM"
  ora_fine: string; // "HH:MM", "24:00" ammesso
  note?: string;
}
export interface OrariSettimane {
  current: FasciaOraria[];
  next: FasciaOraria[];
}
/** un giorno della finestra mobile di 7 giorni mostrata al pubblico */
export interface GiornoPubblico {
  iso: string;
  weekday: number; // 0 = lunedì
  fasce: { start: string; end: string; note?: string }[];
  isToday: boolean;
  /** diverso dallo standard 09:00–19:30 o con più fasce */
  straordinario: boolean;
  chiuso: boolean;
}
export type StatoAula =
  | { aperta: true; chiudeAlle: string; minutiAllaChiusura: number; fascia: { start: string; end: string } }
  | { aperta: false; riapre: { iso: string; ora: string; label: string } | null };

/* ───────── Eventi ───────── */
/** id di una categoria configurabile dalla dashboard (vedi categorieStore in lib/api) */
export type CategoriaEvento = string;
export interface CategoriaCfg {
  id: string;
  label: string;
}

export interface Evento {
  id: number;
  slug: string;
  titolo: string;
  /** riga breve sotto il titolo */
  sottotitolo?: string;
  categoria: CategoriaEvento;
  /** nome della rassegna, es. "CineFORO · autunno 2026" */
  rassegna?: string;
  registro: Registro;
  data: string; // YYYY-MM-DD
  ora: string; // HH:MM
  oraFine?: string;
  /** nome del luogo: "Aula studio FORO", "Cortile della biblioteca"… */
  luogo: string;
  /** indirizzo completo: "Via Alfieri 4, Piossasco (TO)" */
  indirizzo: string;
  aula?: AulaId;
  /** occhiello della locandina: "Incontro pubblico", "Laboratorio"… (se manca si usa la categoria) */
  etichetta?: string;
  /** locandina vera (URL o data URL caricato dalla dashboard) */
  immagine?: string;
  /** paragrafi separati da riga vuota; niente emoji */
  descrizione: string;
  /** Cineforo: il titolo del film non si rivela, si danno indizi */
  indizi?: { regia?: string; cast?: string; genere?: string; eta?: string };
  /** cosa portare, a chi è rivolto, ecc. */
  info?: { label: string; value: string }[];
  /**
   * false = evento aperto: compare sul sito ma non ci si prenota (niente modulo, niente posti),
   * per esempio un'assemblea. Se manca vale true.
   */
  prenotazione?: boolean;
  postiMax: number; // 0 = senza limite
  /** biglietti già prenotati (SUM di prenotazioni_eventi.num_partecipanti), calcolati dal server */
  prenotati: number;
  soloTesserati: boolean;
  patrocinio?: string;
  visibile: boolean;
  /** composizione grafica della locandina (griglia 2×2 del manuale) */
  composizione: "post" | "locandina" | "pieno" | "ufficiale";
  /** foto dell'evento precedente (solo foto vere) */
  foto?: string;
  /**
   * scelto da Gestisci eventi: 1 = principale (l'unico in evidenza in homepage, primo nella
   * Panoramica dell'area), 2 = secondo nella Panoramica dell'area. Al massimo un evento per valore.
   */
  evidenza?: 1 | 2;
  /** link esterno dell'evento (colonna link_esterno, come in produzione) */
  linkEsterno?: string;
}

export interface Prenotazione {
  id: string;
  eventoId: number;
  nome: string;
  cognome: string;
  email: string;
  biglietti: number;
  note?: string;
  creataIl: string; // ISO datetime
  codice: string; // es. "FORO-21-00042"
  arrivati?: number;
  /** per annullare senza login (solo nelle prenotazioni fatte da questo browser) */
  token?: string;
}

/* ───────── Associazione ───────── */
export interface TappaStoria {
  id: string;
  anno: string;
  titolo: string;
  testo: string;
  /** testo lungo mostrato con "Approfondisci" */
  approfondimento?: string;
}

export interface ArticoloStatuto {
  numero: number;
  titolo: string;
  /** paragrafi / commi */
  commi: string[];
  titoloSezione?: string;
}

export interface RichiestaTessera {
  id: string;
  numeroTessera: string; // "N° 2026/0147"
  nome: string;
  cognome: string;
  email: string;
  telefono?: string;
  dataNascita: string;
  comune: string;
  profilo: "studente-universita" | "studente-superiori" | "lavoratore" | "altro";
  interessi: string[];
  volontariato: boolean;
  creataIl: string;
}

export interface Segnalazione {
  id: string;
  codice: string; // "S-2026-0042"
  categoria: "guasto" | "pulizia" | "regolamento" | "proposta" | "generico" | "altro";
  aula: AulaId | "ristoro" | "esterno" | "generico" | "altro";
  messaggio: string;
  anonima: boolean;
  nome?: string;
  email?: string;
  creataIl: string;
}

/* ───────── Area volontari ───────── */
/** come in produzione: 0 programmatori (solo da Turso, vede tutto) · 1 Direttivo · 2 Sociə Organizzatorə · 3 Sociə · 4 Volontariə */
export type Livello = 0 | 1 | 2 | 3 | 4;
export interface Utente {
  id: number;
  nome: string;
  cognome: string;
  username: string;
  livello: Livello;
  telefono?: string;
  /** chat collegata al bot UFORObot (users.telegram_chat_id non vuoto) */
  telegram?: boolean;
  /** solo per l'utente collegato: promemoria del turno, delle presenze, report dei turni scoperti */
  preferenze?: { promemoria: boolean; presenze: boolean; report: boolean };
}
export interface Turno {
  id: string;
  data: string; // YYYY-MM-DD
  inizio: string;
  fine: string;
  /** null = turno passato di una persona eliminata: resta nello storico senza nome */
  userId: number | null;
  note?: string;
  /** turni.is_closed_override = 1, come la casella "straordinario" della produzione */
  straordinario?: boolean;
}
export interface Presenza {
  data: string;
  fascia: "9-13" | "13-16" | "16-19" | "21-24";
  numero: number;
  note?: string;
  userId?: number;
}
export interface Tesserato {
  id: number;
  numero: string; // "2026/0147"
  nome: string;
  cognome: string;
  comune: string;
  annoNascita: number;
  profilo: RichiestaTessera["profilo"];
  dal: string; // YYYY-MM-DD
  stato: "attiva" | "in-attesa" | "scaduta";
  volontario: boolean;
}
