import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { motion } from "motion/react";
import { Icon, cx } from "@/components/ui";
import { CATEGORIE } from "@/data/eventi";
import type { Evento } from "@/data/types";
import { conPrenotazione, isPassato, postiPrenotati, postiRimasti } from "@/lib/api";
import { fmtShort, relativeDay } from "@/lib/time";
import { EventArt } from "./EventArt";

/** Barra dei posti: "38 di 50 posti prenotati". Per gli eventi senza prenotazione, un'etichetta al posto dei numeri. */
export function Seats({
  evento: e,
  compact,
  aperto,
}: {
  evento: Evento;
  compact?: boolean;
  /** testi per gli eventi senza prenotazione (modificabili dalla homepage) */
  aperto?: { etichetta: ReactNode; nota: ReactNode };
}) {
  if (!conPrenotazione(e)) {
    return (
      <div className="seats seats--aperto">
        <div className="seats__label">
          <span>{aperto?.etichetta ?? "Senza prenotazione"}</span>
          {!compact && <span>{aperto?.nota ?? "vieni direttamente"}</span>}
        </div>
      </div>
    );
  }
  if (!e.postiMax) {
    return (
      <div className="seats">
        <div className="seats__label">
          <span>{postiPrenotati(e)} persone hanno confermato</span>
          {!compact && <span>posti senza limite</span>}
        </div>
      </div>
    );
  }
  const presi = Math.min(e.postiMax, postiPrenotati(e));
  const rimasti = postiRimasti(e) ?? 0;
  const ratio = presi / e.postiMax;
  const tone = rimasti === 0 ? "full" : rimasti / e.postiMax <= 0.2 ? "low" : "ok";
  return (
    <div className={cx("seats", `seats--${tone}`)}>
      <div className="seats__bar">
        <motion.div
          className="seats__fill"
          initial={{ scaleX: 0 }}
          whileInView={{ scaleX: ratio }}
          viewport={{ once: true }}
          transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>
      <div className="seats__label">
        <span>
          {rimasti === 0 ? "Al completo" : `${rimasti} ${rimasti === 1 ? "posto rimasto" : "posti rimasti"}`}
        </span>
        {!compact && (
          <span>
            {presi}/{e.postiMax}
          </span>
        )}
      </div>
    </div>
  );
}

export function EventBadge({ evento: e }: { evento: Evento }) {
  if (isPassato(e)) return <span className="tag" style={{ background: "var(--foro-travertino)" }}>Archivio</span>;
  const r = postiRimasti(e);
  if (r === 0) return <span className="tag tag--solid-petrolio">Al completo</span>;
  if (r !== null && r / e.postiMax <= 0.2) return <span className="tag tag--solid-lanterna">Ultimi posti</span>;
  return null;
}

export function EventCard({
  evento: e,
  ratio = "4 / 5",
  showSeats = true,
  className,
}: {
  evento: Evento;
  ratio?: string;
  showSeats?: boolean;
  className?: string;
}) {
  const past = isPassato(e);
  return (
    <Link to={`/eventi/${e.slug}`} className={cx("event-card", past && "is-past", className)}>
      <div className="event-card__media">
        <span className="event-card__badge">
          <EventBadge evento={e} />
        </span>
        <EventArt evento={e} ratio={ratio} />
      </div>
      <div className="event-card__body">
        <div className="event-card__meta">
          <span className="tag tag--cotto">{e.etichetta ?? CATEGORIE[e.categoria].label}</span>
          <span className="t-mono t-muted">
            {fmtShort(e.data)}
            {e.ora && ` · ${e.ora}`}
          </span>
          {!past && <span className="t-mono t-muted">· {relativeDay(e.data)}</span>}
        </div>
        <h3 className="event-card__title">{e.titolo}</h3>
        {e.sottotitolo && <p className="event-card__sub">{e.sottotitolo}</p>}
        {showSeats && !past && <Seats evento={e} compact />}
        <span className="event-card__cta">
          {past ? "Rivedi l'evento" : "Scopri e prenota"} <Icon name="arrow-right" size={18} />
        </span>
      </div>
    </Link>
  );
}
