import type { GruppoTesti, VoceTesto } from "@/lib/contenuti";

const v = (key: string, label: string, def: string, multiline = false, hint?: string): VoceTesto => ({
  key,
  label,
  default: def,
  ...(multiline ? { multiline } : {}),
  ...(hint ? { hint } : {}),
});

/** Testi modificabili della sezione "Statuto" (#statuto). Il testo degli articoli resta in src/data/statuto.ts. */
export const TESTI_STATUTO: GruppoTesti = {
  id: "statuto",
  sezione: "Statuto",
  ancora: "statuto",
  voci: [
    v("eyebrow", "Occhiello", "Statuto"),
    v("titolo", "Titolo", "Le regole che ci siamo dati."),
    v(
      "intro",
      "Introduzione",
      "Lo statuto definisce principi, obiettivi e funzionamento dell'associazione. È il patto che firma chi entra in FORO: qui puoi leggerlo per intero, cercare una parola o scaricarlo.",
      true,
    ),

    /* documento ufficiale */
    v("doc.kicker", "Documento · occhiello", "Documento ufficiale"),
    v("doc.titolo", "Documento · titolo", "Statuto dell'Associazione culturale FORO ETS"),
    v("doc.testo", "Documento · testo", "Il testo approvato dall'assemblea, in PDF. Puoi scaricarlo e conservarlo: è aperto a tutte e a tutti.", true),
    v("doc.meta", "Documento · dettagli", "PDF · 31 articoli · 88 KB"),
    v("doc.scarica", "Documento · pulsante Scarica", "Scarica lo statuto (PDF)"),
    v("doc.drive", "Documento · link Google Drive", "Apri su Google Drive"),

    /* in breve */
    v("breve.titolo", "In breve · titolo", "In breve"),
    /* le schede in breve vengono dal documento: data/statuto.ts, STATUTO_IN_BREVE */

    /* in evidenza */
    v("evidenza.titolo", "Da leggere per primi · titolo", "Da leggere per primi"),
    /* gli articoli da leggere per primi vengono dal documento: data/statuto.ts, STATUTO_IN_EVIDENZA */
    v("evidenza.leggi", "Da leggere per primi · link", "Leggi l'articolo"),
    v("evidenza.tag", "Etichetta «In evidenza»", "In evidenza"),

    /* lettore */
    v("cerca.placeholder", "Ricerca · testo nel campo", "Cerca nello statuto"),
    v("btn.apri", "Pulsante · Apri tutti", "Apri tutti"),
    v("btn.chiudi", "Pulsante · Chiudi tutti", "Chiudi tutti"),
    v("btn.pdf", "Pulsante · Scarica il PDF (barra)", "Scarica il PDF"),
    v("stato.aggiornato", "Barra di stato · nota", "Testo ufficiale · 31 articoli"),
    v("vuoto.titolo", "Nessun risultato · titolo", "Nessun articolo contiene «{q}».", false, "{q} = parola cercata"),
    v(
      "vuoto.testo",
      "Nessun risultato · testo",
      "Prova con una parola sola o con un sinonimo: per esempio «socio» invece di «iscritto», «quota» invece di «abbonamento».",
      true,
    ),
    v("vuoto.suggerimenti", "Nessun risultato · parole suggerite (separate da virgola)", "assemblea, quota, volontari, bilancio"),
    v("pager.prec", "Pulsante · Precedente", "Precedente"),
    v("pager.succ", "Pulsante · Successiva", "Successiva"),
    v("copia", "Pulsante · Copia il link", "Copia il link"),
  ],
};
