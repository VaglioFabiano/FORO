/**
 * Primitive condivise dell'area volontari (usate da tutti i moduli).
 * Il gestionale usa lo stesso sistema del sito ma senza payoff: registro Silenzio, dati in Plex Mono.
 */
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { useStore } from "@/lib/store";
import { useUtenteCorrente } from "@/lib/api";
import { vistaComeStore } from "@/lib/vista";
import type { Livello } from "@/data/types";
import { Icon, cx, type IconName } from "@/components/ui";
import "./area-base.css";

/* ── ruolo effettivo: il selettore "Visualizza come" della demo (lo store vive in lib/vista, lo usa anche la homepage) ── */
export { vistaComeStore };
export function useLivello(): Livello {
  const u = useUtenteCorrente();
  const vista = useStore(vistaComeStore);
  return (vista ?? u?.livello ?? 4) as Livello;
}
/** true se il livello corrente può vedere una funzione che richiede `min` (numero più basso = più permessi) */
export function puo(livello: Livello, min: Livello) {
  return livello <= min;
}

/* ── intestazione di modulo ── */
export function AreaHead({
  eyebrow,
  title,
  descr,
  actions,
}: {
  eyebrow?: string;
  title: string;
  descr?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="area-head">
      <div>
        {eyebrow && <span className="t-label t-muted">{eyebrow}</span>}
        <h1 className="t-h1 area-head__title">{title}</h1>
        {descr && <p className="area-head__descr">{descr}</p>}
      </div>
      {actions && <div className="area-head__actions">{actions}</div>}
    </header>
  );
}

/* ── pannello ── */
export function Panel({
  title,
  actions,
  children,
  className,
  pad = true,
}: {
  title?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  pad?: boolean;
}) {
  return (
    <section className={cx("area-panel", !pad && "area-panel--flush", className)}>
      {(title || actions) && (
        <div className="area-panel__head">
          {title && <h2 className="t-h3">{title}</h2>}
          {actions && <div className="area-panel__actions">{actions}</div>}
        </div>
      )}
      <div className="area-panel__body">{children}</div>
    </section>
  );
}

/* ── indicatore numerico ── */
export function StatTile({
  label,
  value,
  hint,
  icon,
  tone = "default",
  to,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon?: IconName;
  tone?: "default" | "petrolio" | "lanterna" | "avviso" | "ok";
  /** se presente, l'intero riquadro porta a questa pagina */
  to?: string;
}) {
  const body = (
    <>
      <div className="stat-tile__top">
        <span className="t-label">{label}</span>
        {to ? <Icon name="arrow-right" size={18} className="stat-tile__go" /> : icon && <Icon name={icon} size={18} />}
      </div>
      <div className="stat-tile__value">{value}</div>
      {hint && <div className="stat-tile__hint">{hint}</div>}
    </>
  );
  if (to) {
    return (
      <Link to={to} className={cx("stat-tile", "stat-tile--link", `stat-tile--${tone}`)}>
        {body}
      </Link>
    );
  }
  return <div className={cx("stat-tile", `stat-tile--${tone}`)}>{body}</div>;
}

/* ── stato vuoto ── */
export function Empty({ icon = "info", title, children }: { icon?: IconName; title: string; children?: ReactNode }) {
  return (
    <div className="area-empty">
      <span className="disc area-empty__disc">
        <Icon name={icon} size={22} />
      </span>
      <strong>{title}</strong>
      {children && <p>{children}</p>}
    </div>
  );
}
