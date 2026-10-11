import type { GruppoTesti } from "@/lib/contenuti";

/** Testi modificabili della sezione "Seguici sui social" (#social). */
export const TESTI_SOCIAL: GruppoTesti = {
  id: "social",
  sezione: "Seguici sui social",
  ancora: "social",
  voci: [
    { key: "eyebrow", label: "Occhiello", default: "Social" },
    { key: "titolo", label: "Titolo", default: "Seguici sui social" },
    {
      key: "intro",
      label: "Testo accanto al titolo",
      default: "Seguici su Instagram, Facebook e Telegram per rimanere sempre aggiornato sui nostri eventi.",
      multiline: true,
    },
    { key: "ig.etichetta", label: "Instagram · etichetta", default: "Instagram" },
    { key: "ig.titolo", label: "Instagram · titolo", default: "Gli eventi, prima di tutti." },
    {
      key: "ig.testo",
      label: "Instagram · testo",
      default: "Ogni locandina esce prima su Instagram. Poi le foto delle serate e quello che succede in aula.",
      multiline: true,
    },
    { key: "ig.cta", label: "Instagram · pulsante", default: "Segui su Instagram" },
    { key: "tg.etichetta", label: "Telegram · etichetta", default: "Telegram" },
    { key: "tg.titolo", label: "Telegram · titolo", default: "Il canale dell'aula" },
    {
      key: "tg.testo",
      label: "Telegram · testo",
      default: "Orari della settimana, aperture straordinarie e avvisi: li pubblichiamo prima qui.",
      multiline: true,
    },
    { key: "tg.cta", label: "Telegram · pulsante", default: "Apri il canale" },
    {
      key: "tg.post",
      label: "Telegram · messaggi di riserva",
      default: "803, 801",
      hint: "Il sito mostra da solo gli ultimi 3 messaggi del canale. Questi numeri servono solo se il canale non risponde: separati da virgola, sono l'ultima parte del link di un messaggio (t.me/aulastudioforo/803).",
    },
    { key: "fb.etichetta", label: "Facebook · etichetta", default: "Facebook" },
    { key: "fb.testo", label: "Facebook · testo", default: "Foto degli eventi, annunci e la nostra comunità." },
    { key: "fb.cta", label: "Facebook · pulsante", default: "Seguici su Facebook" },
  ],
};
