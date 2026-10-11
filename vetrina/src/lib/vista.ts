/**
 * Ruolo effettivo di chi usa il sito: il livello del proprio account, oppure quello scelto
 * nel selettore "Visualizza come" della demo. Vale sia nell'area volontari sia sulla homepage.
 */
import type { Livello } from "@/data/types";
import { useUtenteCorrente } from "./api";
import { createStore, useStore } from "./store";

export const vistaComeStore = createStore<Livello | null>("area-vista-come", null);

/** livello effettivo, oppure null se nessuno è entrato */
export function useLivelloEffettivo(): Livello | null {
  const u = useUtenteCorrente();
  const vista = useStore(vistaComeStore);
  if (!u) return null;
  return (vista ?? u.livello) as Livello;
}

/**
 * Come nel sito in produzione: modificano testi e link della homepage il direttivo (livello 1)
 * e le persone socie organizzatrici (livello 2).
 */
export function usePuoModificareSito() {
  const l = useLivelloEffettivo();
  return l !== null && l <= 2;
}
