/**
 * Stato dell'aula "adesso", condiviso da Hero e Orari.
 * Si aggiorna allo scattare di ogni minuto (non ogni 30 s a caso) e quando la
 * scheda torna visibile, così il conto alla rovescia non resta indietro.
 */
import { useEffect, useState } from "react";
import { fasceDelGiorno, statoAula, useOrari } from "@/lib/api";
import { AGORA_PRANZO } from "@/data/orari";
import { diffDays, fmtRange, fromMin, romeNow, toMin } from "@/lib/time";

function useMinuteClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    let t = 0;
    const schedule = () => {
      t = window.setTimeout(() => {
        setNow(new Date());
        schedule();
      }, 60_000 - (Date.now() % 60_000) + 40);
    };
    schedule();
    const onVis = () => {
      if (document.visibilityState === "visible") setNow(new Date());
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      clearTimeout(t);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);
  return now;
}

export type StatoLive = {
  aperta: boolean;
  /** "18:00" se aperta */
  chiudeAlle?: string;
  /** minuti alla chiusura (aperta) o alla riapertura (chiusa) */
  minuti: number | null;
  /** 0–1: quanto della fascia in corso è già passato */
  progresso: number;
  fascia?: { start: string; end: string };
  /** "domani alle 09:00" */
  riapre?: string | null;
  /** ora di Roma, "15:42" */
  ora: string;
  /** "09:00–18:00" oppure null se oggi è chiuso */
  oggi: string | null;
  /** l'Aula AGORÀ è sala del pranzo in questo momento */
  pranzoAdesso: boolean;
};

export function useStatoLive(): StatoLive {
  const orari = useOrari();
  const now = useMinuteClock();
  const r = romeNow(now);
  const s = statoAula(orari, now);
  const fasceOggi = fasceDelGiorno(orari, r.iso, r.iso);
  const oggi = fasceOggi.length ? fasceOggi.map((f) => fmtRange(f.start, f.end)).join(" · ") : null;
  const ora = fromMin(r.minutes);

  if (s.aperta) {
    const a = toMin(s.fascia.start);
    const b = toMin(s.fascia.end);
    const p = toMin(AGORA_PRANZO.start) <= r.minutes && r.minutes < toMin(AGORA_PRANZO.end);
    return {
      aperta: true,
      chiudeAlle: s.chiudeAlle,
      minuti: s.minutiAllaChiusura,
      progresso: Math.min(1, Math.max(0, (r.minutes - a) / Math.max(1, b - a))),
      fascia: s.fascia,
      ora,
      oggi,
      pranzoAdesso: p,
    };
  }
  const minuti = s.riapre ? diffDays(r.iso, s.riapre.iso) * 1440 + toMin(s.riapre.ora) - r.minutes : null;
  return {
    aperta: false,
    minuti,
    progresso: 0,
    riapre: s.riapre?.label ?? null,
    ora,
    oggi,
    pranzoAdesso: false,
  };
}
