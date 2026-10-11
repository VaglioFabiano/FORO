/**
 * Piccoli componenti dei moduli di gestione (interruttore, ricerca, suggerimento,
 * contatore, accesso riservato). Stile in gestione.css, classi con prefisso .ges-
 */
import { useId, type ReactNode } from "react";
import { Icon, cx } from "@/components/ui";
import { AreaHead, Empty } from "./ui";
import "./gestione.css";

/** Interruttore Online / Bozza: binario ad angoli vivi, pomello a disco */
export function Switch({
  checked,
  onChange,
  labelOn = "Online",
  labelOff = "Bozza",
  ariaLabel,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  labelOn?: string;
  labelOff?: string;
  ariaLabel: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      className={cx("ges-switch", checked && "is-on")}
      onClick={(e) => {
        e.stopPropagation();
        onChange(!checked);
      }}
    >
      <span className="ges-switch__track" aria-hidden>
        <span className="ges-switch__thumb" />
      </span>
      <span className="ges-switch__label">{checked ? labelOn : labelOff}</span>
    </button>
  );
}

/** Campo di ricerca con icona e cancella */
export function SearchBox({
  value,
  onChange,
  placeholder,
  label,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  label: string;
  className?: string;
}) {
  const id = useId();
  return (
    <div className={cx("ges-search", className)}>
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <Icon name="search" size={18} className="ges-search__icon" />
      <input
        id={id}
        type="search"
        className="input ges-search__input"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => e.key === "Escape" && value && (e.stopPropagation(), onChange(""))}
        autoComplete="off"
      />
      {value && (
        <button type="button" className="ges-search__clear" onClick={() => onChange("")} aria-label="Cancella la ricerca">
          <Icon name="close" size={16} />
        </button>
      )}
    </div>
  );
}

/** Suggerimento al passaggio o al focus (non dipende dal solo hover) */
export function Tip({ children, label = "Come si calcola", align = "center" }: { children: ReactNode; label?: string; align?: "center" | "end" | "start" }) {
  const id = useId();
  return (
    <span className={cx("ges-tip", `ges-tip--${align}`)}>
      <button type="button" className="ges-tip__btn" aria-describedby={id} aria-label={label} onClick={(e) => e.stopPropagation()}>
        <Icon name="info" size={15} />
      </button>
      <span role="tooltip" id={id} className="ges-tip__bubble">
        {children}
      </span>
    </span>
  );
}

/** Contatore − n/tot + (check-in alla porta, numeri piccoli) */
export function Stepper({
  value,
  max,
  onChange,
  label,
  size = "md",
}: {
  value: number;
  max?: number;
  onChange: (v: number) => void;
  label: string;
  size?: "md" | "lg";
}) {
  const done = max !== undefined && value >= max;
  return (
    <div className={cx("ges-stepper", `ges-stepper--${size}`, done && "is-done")} role="group" aria-label={label}>
      <button type="button" onClick={() => onChange(Math.max(0, value - 1))} disabled={value <= 0} aria-label="Uno in meno">
        <Icon name="minus" size={size === "lg" ? 22 : 16} />
      </button>
      <span className="ges-stepper__val" aria-live="polite">
        {value}
        {max !== undefined && <small>/{max}</small>}
      </span>
      <button
        type="button"
        onClick={() => onChange(max === undefined ? value + 1 : Math.min(max, value + 1))}
        disabled={max !== undefined && value >= max}
        aria-label="Uno in più"
      >
        <Icon name="plus" size={size === "lg" ? 22 : 16} />
      </button>
    </div>
  );
}

/** Modulo riservato a un livello più alto */
export function Riservato({ title, eyebrow }: { title: string; eyebrow?: string }) {
  return (
    <div className="ges">
      <AreaHead eyebrow={eyebrow} title={title} />
      <div className="area-panel">
        <Empty icon="lock" title="Questa parte è riservata">
          La gestiscono il direttivo e le persone socie organizzatrici. Se ti serve accedere, chiedi a un membro del direttivo.
        </Empty>
      </div>
    </div>
  );
}

/** Etichetta di stato con pallino (non solo colore: c'è sempre il testo) */
export function StatoTag({ tone, children }: { tone: "ok" | "attesa" | "neutro" | "petrolio" | "errore"; children: ReactNode }) {
  return (
    <span className={cx("ges-stato", `ges-stato--${tone}`)}>
      <span className="ges-stato__dot" aria-hidden />
      {children}
    </span>
  );
}

/** Numero grande con etichetta, per i riepiloghi dentro i pannelli */
export function Figure({ label, value, hint, tone }: { label: string; value: ReactNode; hint?: ReactNode; tone?: "ok" | "petrolio" }) {
  return (
    <div className={cx("ges-figure", tone && `ges-figure--${tone}`)}>
      <span className="t-label">{label}</span>
      <span className="ges-figure__val">{value}</span>
      {hint && <span className="ges-figure__hint">{hint}</span>}
    </div>
  );
}
