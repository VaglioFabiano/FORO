/**
 * La storia dell'associazione: tappe modificabili dalla dashboard (modulo "La storia").
 * La sezione "Chi siamo" le mostra come linea del tempo a serpentina.
 */
import { createStore, uid, useStore } from "./store";
import { cacheHomepage } from "./cache";
import { chiama } from "./server";
import type { TappaStoria } from "@/data/types";

/**
 * Le tappe sono raccolte per tema, in ordine di quando il tema comincia.
 * Nell'approfondimento ogni riga è un momento della tappa (un evento, un anno).
 */
export const STORIA_SEED: TappaStoria[] = [
  {
    id: "t-2022-aula",
    anno: "Giugno 2022",
    titolo: "L'aula apre",
    testo: "Vinciamo il bando del Comune e apriamo l'aula studio di via Alfieri 4.",
    approfondimento:
      "Un gruppo di studenti e studentesse di Piossasco risponde al bando comunale per la gestione dell'aula studio, nell'ex mediateca sotto la biblioteca. Da quel momento l'aula resta aperta grazie al lavoro dei volontari.",
  },
  {
    id: "t-2022-eventi",
    anno: "2022",
    titolo: "I primi eventi",
    testo: "Dalle elezioni al Natale: in pochi mesi l'aula diventa anche un luogo dove incontrarsi.",
    approfondimento: [
      "12 settembre · Come votare? Una serata in aula per chi vota per la prima volta.",
      "14 settembre · Verso le elezioni: al Teatro il Mulino, un dibattito con le quattro principali coalizioni.",
      "Autunno · FORO for YOU.",
      "4 dicembre · Te la sei cercata! La prima serata sulla violenza di genere, con un aperitivo in aula.",
      "18 dicembre · Christmas Game Party: giochi da tavola e di ruolo con la biblioteca e l'associazione ludica Perludo.",
    ].join("\n"),
  },
  {
    id: "t-2023-appuntamenti",
    anno: "Dal 2023",
    titolo: "Gli appuntamenti che tornano",
    testo: "Le serate dei primi mesi diventano un calendario che si ripete ogni anno.",
    approfondimento: [
      "Incontri sulla violenza di genere.",
      "Serate sui temi LGBTQIA+.",
      "Serate di informazione politica.",
      "Eventi di orientamento universitario.",
    ].join("\n"),
  },
  {
    id: "t-bando",
    anno: "2024 · 2025",
    titolo: "Il bando, ancora",
    testo: "Vinciamo di nuovo il bando di assegnazione dell'aula, due anni di fila.",
    approfondimento: ["2024 · Il bando ci viene assegnato per la seconda volta.", "2025 · E per la terza."].join("\n"),
  },
  {
    id: "t-alta-voce",
    anno: "2024 · 2025",
    titolo: "Si studia ad alta voce",
    testo: "Accanto all'aula silenziosa nasce un'aula dove si può ripetere e studiare in gruppo.",
    approfondimento: [
      "2024 · In sala Echo apre, in alcune giornate, l'aula studio ad alta voce.",
      "2025 · L'aula ad alta voce si sposta in aula Agorà, con gli stessi orari dell'aula studio FORO.",
    ].join("\n"),
  },
  {
    id: "t-2024-pagode",
    anno: "2024",
    titolo: "Le pagode",
    testo: "Arrivano le pagode all'esterno: si può studiare all'aperto.",
  },
  {
    id: "t-pgf",
    anno: "2025 · 2026",
    titolo: "Al PGF",
    testo: "Partecipiamo al PGF, ogni anno con un ruolo più attivo.",
    approfondimento: ["2025 · La prima partecipazione.", "2026 · Torniamo, questa volta più attivamente."].join("\n"),
  },
  {
    id: "t-2026-cineforo",
    anno: "2026",
    titolo: "Il CineFORO",
    testo: "Parte la rassegna: non è solo un film, è un'occasione per stare insieme.",
    approfondimento:
      "Dopo ogni proiezione ci fermiamo a parlarne: spegnere il mondo fuori e accendere conversazioni che restano anche dopo i titoli di coda. La rassegna è realizzata con il patrocinio del Comune di Piossasco.",
  },
];

/**
 * Le tappe vere sono nella tabella storia_tappe (popolata una volta da STORIA_SEED con migrazioni/esegui-fase1.mjs).
 * Lo store parte dall'ultima copia della homepage e si aggiorna dal server.
 */
export const storiaStore = createStore<TappaStoria[]>("storia", () => cacheHomepage()?.storia ?? [], { persist: false });

/** salva l'elenco completo delle tappe, nell'ordine (livello ≤ 2) */
export async function salvaStoria(tappe: TappaStoria[]) {
  const { versione } = await chiama<{ versione: number }>("homepage", { method: "PUT", query: { action: "storia" }, body: { tappe } });
  storiaStore.set(tappe);
  void import("./homepage").then((m) => m.dopoSalvataggio(versione));
}
export function useStoria() {
  return useStore(storiaStore);
}
export const nuovaTappa = (): TappaStoria => ({ id: uid("t-"), anno: "", titolo: "", testo: "" });
