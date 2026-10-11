/**
 * Eventi: luogo e indirizzo di base e nomi delle categorie. Gli eventi veri arrivano dal server
 * (api/eventi.js, tabella eventi); il Cineforo non rivela il titolo del film: dà indizi.
 */
import { categorieStore, labelCategoria } from "@/lib/categorie";

export const LUOGO = "Aula studio FORO";
export const INDIRIZZO_EVENTI = "Via Alfieri 4, Piossasco (TO)";
export const INDIRIZZO = INDIRIZZO_EVENTI;

/**
 * Etichetta di una categoria, letta dalla configurazione della dashboard.
 * Uso: CATEGORIE[e.categoria].label (resta compatibile con il codice esistente).
 */
export const CATEGORIE = new Proxy({} as Record<string, { label: string; plurale: string }>, {
  get: (_t, id: string) => ({ label: labelCategoria(id), plurale: labelCategoria(id) }),
  ownKeys: () => categorieStore.get().map((c) => c.id),
  getOwnPropertyDescriptor: () => ({ enumerable: true, configurable: true }),
});
