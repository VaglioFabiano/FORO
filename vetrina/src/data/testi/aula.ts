import type { GruppoTesti } from "@/lib/contenuti";
import { AULE, SERVIZI } from "@/data/org";

/** Testi modificabili della sezione "L'aula" (#aula). Elenca qui OGNI frase visibile della sezione. */
export const TESTI_AULA: GruppoTesti = {
  id: "aula",
  sezione: "L'aula",
  ancora: "aula",
  voci: [
    { key: "eyebrow", label: "Occhiello della sezione", default: "L'aula" },
    { key: "titolo", label: "Titolo della sezione", default: "Due aule, due registri.", hint: "Usa un a capo per andare su più righe." },
    {
      key: "intro",
      label: "Introduzione",
      default: "",
      hint: "Lascia vuoto per non mostrare l'introduzione.",
      multiline: true,
    },
    { key: "aule.link", label: "Aule · link agli orari", default: "Vedi gli orari della settimana" },
    { key: "aule.invito", label: "Aule · invito ad aprire il pannello", default: "Dettagli e regole" },

    { key: "servizi.eyebrow", label: "Servizi · occhiello", default: "02.1 · Servizi" },
    { key: "servizi.titolo", label: "Servizi · titolo", default: "Cosa trovi in aula" },
    {
      key: "servizi.intro",
      label: "Servizi · introduzione",
      default: "Tutto quello che serve per restare una giornata intera. Se manca qualcosa, chiedi a chi è di turno.",
      multiline: true,
    },

    { key: "regolamento.eyebrow", label: "Regolamento · occhiello", default: "02.2 · Regolamento" },
    { key: "regolamento.titolo", label: "Regolamento · titolo", default: "Il regolamento, in breve" },
    { key: "regolamento.completo", label: "Regolamento · pulsante per il testo completo", default: "Leggi il regolamento completo" },
    { key: "regolamento.statuto", label: "Regolamento · link allo statuto", default: "Come funziona l'associazione: leggi lo statuto" },
    {
      key: "regolamento.nota",
      label: "Regolamento completo · nota in apertura",
      default: "Il testo ufficiale, concordato con il Comune di Piossasco. Vale per tutte e due le aule.",
      multiline: true,
    },
    { key: "regolamento.originale", label: "Regolamento completo · link al documento", default: "Apri il documento originale" },
    { key: "rimando.orari", label: "Domande · etichetta del rimando agli orari", default: "Orari" },
    { key: "rimando.dove", label: "Domande · etichetta del rimando a dove siamo", default: "Dove siamo" },
    /* le due aule (pannelli FORO e AGORÀ) */
    ...(["foro", "agora"] as const).flatMap((id) => {
      const a = AULE[id];
      const n = a.nome;
      return [
        { key: `${id}.registro`, label: `${n} · registro`, default: a.registro },
        { key: `${id}.nome`, label: `${n} · nome`, default: a.nome, hint: "La prima parola va sulla prima riga, il resto sulla seconda." },
        { key: `${id}.breve`, label: `${n} · frase in evidenza`, default: a.breve },
        { key: `${id}.testo`, label: `${n} · testo`, default: a.testo, multiline: true },
        { key: `${id}.dettaglio`, label: `${n} · dettaglio (pannello aperto)`, default: a.dettaglio, multiline: true },
        ...a.regole.map((r, i) => ({ key: `${id}.regola.${i + 1}`, label: `${n} · regola ${i + 1}`, default: r })),
      ];
    }),

    /* cosa trovi in aula */
    ...SERVIZI.flatMap((sv, i) => [
      { key: `servizio.${i + 1}.titolo`, label: `Servizio ${i + 1} · titolo`, default: sv.titolo },
      { key: `servizio.${i + 1}.testo`, label: `Servizio ${i + 1} · testo`, default: sv.testo, multiline: true },
    ]),
    /* il regolamento in breve non è qui: è una sintesi del documento ufficiale (data/org.ts, REGOLAMENTO) */
  ],
};
