/**
 * Ultima copia della homepage salvata nel browser (BACKEND.md §14): gli store pubblici partono da qui,
 * così la pagina si vede subito, e lib/homepage.ts li aggiorna in background dal server.
 * Contiene solo dati pubblici (testi, eventi visibili, orari, storia): nessun consenso necessario.
 */
import type { CategoriaCfg, Evento, OrariSettimane, TappaStoria } from "@/data/types";

export interface BundleHomepage {
  versione: number;
  contenuti: Record<string, string>;
  categorie: CategoriaCfg[];
  eventi: Evento[];
  orari: OrariSettimane;
  storia: TappaStoria[];
}

export const CHIAVE_CACHE = "foro:homepage";

let letta: BundleHomepage | null | undefined;
export function cacheHomepage(): BundleHomepage | null {
  if (letta !== undefined) return letta;
  try {
    const raw = localStorage.getItem(CHIAVE_CACHE);
    letta = raw ? (JSON.parse(raw) as BundleHomepage) : null;
  } catch {
    letta = null;
  }
  return letta;
}
