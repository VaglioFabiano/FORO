import { fmtDuration } from "@/lib/time";

/** conto alla rovescia leggibile: "45 min", "2 h 10 min", "2 giorni e 15 h" */
export function fmtCountdown(min: number) {
  const m = Math.max(0, Math.round(min));
  if (m < 24 * 60) return fmtDuration(m);
  const g = Math.floor(m / 1440);
  const h = Math.floor((m % 1440) / 60);
  const giorni = g === 1 ? "1 giorno" : `${g} giorni`;
  return h ? `${giorni} e ${h} h` : giorni;
}

/** sostituisce i segnaposto dei testi modificabili: riempi("chiude alle {ora}", { ora: "18:00" }) */
export function riempi(s: string, vars: Record<string, string | number>) {
  return s.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m));
}
