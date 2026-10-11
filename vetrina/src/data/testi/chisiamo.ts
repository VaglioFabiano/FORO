import type { GruppoTesti } from "@/lib/contenuti";

/** Testi modificabili della sezione "Chi siamo" (#chi-siamo). Elenca qui OGNI frase visibile della sezione. */
export const TESTI_CHISIAMO: GruppoTesti = {
  id: "chisiamo",
  sezione: "Chi siamo",
  ancora: "chi-siamo",
  voci: [
    { key: "eyebrow", label: "Occhiello della sezione", default: "Chi siamo · La storia" },
    {
      key: "titolo",
      label: "Titolo della sezione",
      default: "Ecco la nostra storia",
      hint: "Usa un a capo per andare su più righe.",
    },
    {
      key: "intro",
      label: "Introduzione",
      default: "I nostri eventi e i nostri passi.",
      multiline: true,
    },
    { key: "storia.approfondisci", label: "Storia · pulsante della singola tappa", default: "Approfondisci" },
    { key: "storia.chiudi", label: "Storia · pulsante per chiudere la tappa", default: "Chiudi" },
    { key: "storia.tutti", label: "Storia · pulsante in fondo (apre tutto)", default: "Approfondisci tutta la storia" },
    { key: "storia.chiuditutti", label: "Storia · pulsante in fondo (chiude tutto)", default: "Chiudi gli approfondimenti" },
    { key: "storia.vuoto", label: "Storia · testo se non ci sono tappe", default: "Stiamo scrivendo la nostra storia. Torna a trovarci presto." },

    { key: "vol.eyebrow", label: "Volontariato · occhiello", default: "04.1 · Volontariato" },
    { key: "vol.titolo", label: "Volontariato · titolo", default: "C'è sempre bisogno di una mano." },
    {
      key: "vol.testo",
      label: "Volontariato · testo",
      default: "Per tenere aperta l'aula studio ed estendere gli orari servono persone che prendano un turno.",
      multiline: true,
    },
    { key: "vol.invito.etichetta", label: "Volontariato · etichetta dell'invito", default: "Come iniziare" },
    {
      key: "vol.invito",
      label: "Volontariato · invito",
      default: "Vieni in aula e chiedi a un volontario o a una volontaria, oppure all'Info Point.",
      multiline: true,
    },
    { key: "vol.link", label: "Volontariato · link agli orari", default: "Guarda quando siamo aperti" },
  ],
};
