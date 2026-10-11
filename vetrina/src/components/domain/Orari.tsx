/**
 * Orari della settimana (finestra mobile di 7 giorni) con timeline 07–24
 * e pannello "aperta ora / chiusa". Dati da useOrari(), ora italiana.
 */
import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { cx } from "@/components/ui";
import type { GiornoPubblico } from "@/data/types";
import { orariStore, settimanaMobile, useOrari, useStatoAula } from "@/lib/api";

const orariStoreSnapshot = () => orariStore.get();
import { GIORNI, capitalize, fmtDuration, fmtRange, isoToDate, MESI, romeNow, toMin } from "@/lib/time";

const T0 = 7 * 60;
const T1 = 24 * 60;
const pct = (m: number) => `${((Math.min(Math.max(m, T0), T1) - T0) / (T1 - T0)) * 100}%`;

function useNowMinutes() {
  const [m, setM] = useState(() => romeNow().minutes);
  useEffect(() => {
    const t = setInterval(() => setM(romeNow().minutes), 30_000);
    return () => clearInterval(t);
  }, []);
  return m;
}

function Timeline({ g, now }: { g: GiornoPubblico; now: number }) {
  return (
    <div className="timeline" aria-hidden>
      <div className="timeline__track" />
      {g.fasce.map((f, i) => {
        const special = g.straordinario && (g.fasce.length > 1 ? i > 0 : true);
        return (
          <motion.div
            key={i}
            className={cx("timeline__seg", special && "is-special")}
            style={{ left: pct(toMin(f.start)), width: `calc(${pct(toMin(f.end))} - ${pct(toMin(f.start))})`, transformOrigin: "left" }}
            initial={{ scaleX: 0 }}
            whileInView={{ scaleX: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.9, delay: 0.1 + i * 0.1, ease: [0.22, 1, 0.36, 1] }}
          />
        );
      })}
      {g.isToday && now >= T0 && now <= T1 && <div className="timeline__now" style={{ left: pct(now) }} />}
    </div>
  );
}

/** "30 settembre – 6 ottobre", il periodo coperto dalla finestra mobile */
export function periodoSettimana(giorni = 7) {
  const w = settimanaMobile(orariStoreSnapshot(), undefined, giorni);
  const a = isoToDate(w[0].iso);
  const b = isoToDate(w[w.length - 1].iso);
  return a.getUTCMonth() === b.getUTCMonth()
    ? `${a.getUTCDate()}–${b.getUTCDate()} ${MESI[b.getUTCMonth()]}`
    : `${a.getUTCDate()} ${MESI[a.getUTCMonth()]} – ${b.getUTCDate()} ${MESI[b.getUTCMonth()]}`;
}

export function OrariSettimana({ giorni = 7, showTimeline = true, className }: { giorni?: number; showTimeline?: boolean; className?: string }) {
  const orari = useOrari();
  const now = useNowMinutes();
  const week = settimanaMobile(orari, undefined, giorni);
  return (
    <div className={className}>
      {showTimeline && (
        <div className="timeline__ticks" aria-hidden>
          {["07", "10", "13", "16", "19", "22", "24"].map((h) => (
            <span key={h}>{h}</span>
          ))}
        </div>
      )}
      <ol className="orari">
        {week.map((g) => {
          const d = isoToDate(g.iso);
          const note = [...new Set(g.fasce.map((f) => f.note).filter(Boolean))] as string[];
          return (
            <li key={g.iso} className={cx("orari-row", g.isToday && "is-today", g.chiuso && "is-closed")}>
              <div className="orari-row__day">
                <span className="orari-row__dow">
                  {capitalize(GIORNI[g.weekday])} {d.getUTCDate()}
                  {g.isToday && <span className="orari-row__badge">Oggi</span>}
                </span>
                <span className="orari-row__date">{MESI[d.getUTCMonth()]}</span>
              </div>
              <div className="orari-row__hours">
                <span className="orari-row__range">
                  {g.chiuso ? "Chiuso" : g.fasce.map((f) => fmtRange(f.start, f.end)).join("  +  ")}
                </span>
                {note.map((n) => (
                  <span key={n} className="orari-row__note">
                    {n}
                  </span>
                ))}
                {!note.length && g.straordinario && <span className="orari-row__note">Orario diverso dal solito</span>}
              </div>
              {showTimeline && <Timeline g={g} now={now} />}
            </li>
          );
        })}
      </ol>
      {showTimeline && (
        <div className="orari__legend">
          <span>
            <i /> Orario standard 09:00–19:30
          </span>
          <span>
            <i className="special" /> Apertura speciale o variazione
          </span>
          <span>
            <i className="now" /> Adesso
          </span>
        </div>
      )}
    </div>
  );
}

/** "Aperta ora" gigante con conto alla rovescia */
export function StatusPanel({ className }: { className?: string }) {
  const s = useStatoAula();
  return (
    <div className={cx("status-panel", !s.aperta && "is-closed", className)} aria-live="polite">
      <span className="t-label t-muted">Aula studio · adesso</span>
      <span className="status-panel__state">
        <span className={cx("dot", s.aperta && "dot--live")} />
        {s.aperta ? "Aperta" : "Chiusa"}
      </span>
      <span className="status-panel__detail t-muted">
        {s.aperta
          ? `Chiude alle ${s.chiudeAlle} · tra ${fmtDuration(s.minutiAllaChiusura)}`
          : s.riapre
            ? `Riapre ${s.riapre.label}`
            : "Orari in aggiornamento"}
      </span>
    </div>
  );
}
