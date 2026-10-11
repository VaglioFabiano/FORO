/** Testi della sezione Eventi e del drawer (CMS mock) + segnaposto {x} e link alle indicazioni. */
import { useTesti } from "@/lib/contenuti";
import { TESTI_EVENTI } from "@/data/testi/eventi";
import { relativeDay } from "@/lib/time";

export function useTestiEventi() {
  const t = useTesti(TESTI_EVENTI);
  /** t() con i segnaposto sostituiti: f("pd.posti", { n: 50 }) */
  const f = (key: string, vars: Record<string, string | number>) =>
    t(key).replace(/\{(\w+)\}/g, (m, k: string) => (vars[k] !== undefined ? String(vars[k]) : m));
  return { t, f };
}

export function mapsLink(indirizzo: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(indirizzo)}`;
}

/** "tra 1 mesi" → "tra un mese" (in attesa della correzione in lib/time) */
export function quando(iso: string) {
  return relativeDay(iso).replace(/^tra 1 mesi$/, "tra un mese");
}
