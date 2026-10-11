import type { GruppoTesti } from "@/lib/contenuti";

/** Testi modificabili della sezione "Orari" (#orari). Elenca qui OGNI frase visibile della sezione. */
export const TESTI_ORARI: GruppoTesti = {
  id: "orari",
  sezione: "Orari",
  ancora: "orari",
  voci: [
    { key: "eyebrow", label: "Occhiello", default: "Orari" },
    { key: "titolo", label: "Titolo", default: "Orari della settimana" },
    {
      key: "intro",
      label: "Testo accanto al titolo",
      default: "Sette giorni a partire da oggi, aggiornati ogni settimana. Non serve prenotare il posto: entri e ti siedi.",
      multiline: true,
    },

    { key: "adesso.label", label: "Stato dell'aula · etichetta", default: "Aula studio · adesso" },
    { key: "adesso.aperta", label: "Stato dell'aula · aperta", default: "Aperta" },
    { key: "adesso.chiusa", label: "Stato dell'aula · chiusa", default: "Chiusa" },
    { key: "adesso.chiude", label: "Stato dell'aula · voce chiusura", default: "Chiude" },
    { key: "adesso.riapre", label: "Stato dell'aula · voce riapertura", default: "Riapre" },
    {
      key: "adesso.alle",
      label: "Stato dell'aula · orario di chiusura",
      default: "alle {ora}",
      hint: "{ora} diventa l'orario di chiusura.",
    },
    { key: "adesso.allaChiusura", label: "Stato dell'aula · conto alla chiusura", default: "Alla chiusura" },
    { key: "adesso.allaRiapertura", label: "Stato dell'aula · conto alla riapertura", default: "Alla riapertura" },
    { key: "adesso.aggiornamento", label: "Stato dell'aula · orari mancanti", default: "orari in aggiornamento" },
    { key: "adesso.oggi", label: "Stato dell'aula · oggi", default: "Oggi" },
    { key: "adesso.chiusoOggi", label: "Stato dell'aula · chiuso tutto il giorno", default: "chiuso" },

    { key: "pranzo.titolo", label: "Aula AGORÀ a pranzo · titolo", default: "Aula AGORÀ a pranzo" },
    {
      key: "pranzo.testo",
      label: "Aula AGORÀ a pranzo · testo",
      default: "Dalle {inizio} alle {fine} puoi pranzare qui, in compagnia.",
      multiline: true,
      hint: "{inizio} e {fine} diventano gli orari del pranzo.",
    },
    { key: "pranzo.adesso", label: "Aula AGORÀ a pranzo · in corso", default: "Adesso" },

    { key: "pagode.titolo", label: "Pagode · titolo", default: "Pagode all'aperto" },
    {
      key: "pagode.testo",
      label: "Pagode · testo",
      default: "Quando il tempo lo permette si studia anche fuori, sotto le pagode.",
      multiline: true,
    },
    { key: "pagode.nota", label: "Pagode · nota", default: "Con il bel tempo" },

    { key: "telegram.titolo", label: "Avvisi Telegram · titolo", default: "Aperture straordinarie e chiusure" },
    {
      key: "telegram.testo",
      label: "Avvisi Telegram · testo",
      default: "Le pubblichiamo prima sul canale Telegram {canale}",
      hint: "{canale} diventa il nome del canale.",
    },
    { key: "telegram.nuova", label: "Avvisi Telegram · nota per chi non vede", default: "(si apre in una nuova scheda)" },

    { key: "volontari.label", label: "Volontariato · etichetta", default: "Volontariato" },
    { key: "volontari.titolo", label: "Volontariato · titolo", default: "C'è sempre bisogno di una mano." },
    {
      key: "volontari.testo",
      label: "Volontariato · testo",
      default: "Vieni in aula e chiedi a un volontario o a una volontaria, oppure all'Info Point.",
      multiline: true,
    },
    { key: "volontari.cta", label: "Volontariato · link", default: "Come dare una mano" },
  ],
};
