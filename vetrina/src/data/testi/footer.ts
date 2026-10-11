import type { GruppoTesti } from "@/lib/contenuti";

export const TESTI_FOOTER: GruppoTesti = {
  id: "footer",
  sezione: "Piè di pagina",
  ancora: "contatti",
  voci: [
    { key: "payoff", label: "Payoff (titolo grande)", default: "", multiline: true, hint: "Una riga per riga del titolo. Lascia vuoto per non mostrarlo." },
    { key: "descrizione", label: "Descrizione sotto il marchio", default: "Associazione culturale che apre l'aula studio comunale di Piossasco e la riempie di idee. Dal 2022.", multiline: true },
  ],
};
