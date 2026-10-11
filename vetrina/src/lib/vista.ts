/**
 * Livello di chi usa il sito: quello del proprio account, nient'altro (ognuno vede ciò che il suo livello permette).
 * Vale sia nell'area volontari sia sulla homepage; il server ripete comunque ogni controllo.
 */
import type { Livello } from "@/data/types";
import { useUtenteCorrente } from "./api";

/** livello dell'account, oppure null se nessuno è entrato */
export function useLivelloEffettivo(): Livello | null {
  const u = useUtenteCorrente();
  return u ? (u.livello as Livello) : null;
}

/**
 * Come nel sito in produzione: modificano testi e link della homepage il direttivo (livello 1)
 * e le persone socie organizzatrici (livello 2).
 */
export function usePuoModificareSito() {
  const l = useLivelloEffettivo();
  return l !== null && l <= 2;
}
