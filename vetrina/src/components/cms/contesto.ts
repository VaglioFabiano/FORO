/**
 * Contesto della modifica sul posto: dice ai testi di una sezione se la sezione è in modifica
 * e raccoglie quali testi compaiono davvero nella pagina (gli altri finiscono nell'elenco laterale).
 * Niente import a runtime da lib/contenuti: lo usa anche lui, così non si creano cicli.
 */
import { createContext, useContext } from "react";
import type { VoceTesto } from "@/lib/contenuti";

export type ContestoModifica = {
  attiva: boolean;
  /** registra un testo visibile nella pagina; restituisce la funzione per toglierlo */
  registra: (chiave: string, voce: VoceTesto) => () => void;
};

export const ModificaContext = createContext<ContestoModifica | null>(null);

/** true se la sezione che contiene il componente è in modifica */
export function useInModifica() {
  return !!useContext(ModificaContext)?.attiva;
}
