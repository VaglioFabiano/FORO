/**
 * Piccoli componenti condivisi da Tesserati, Utenti, Profilo e dai moduli Telegram (classi con prefisso .uu-).
 */
import { useId, useState, type ReactNode } from "react";
import { Icon, Skeleton, cx } from "@/components/ui";
import { toast } from "@/components/ui/Toast";
import "./utenti-ui.css";

export function Switch({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      className={cx("uu-switch", checked && "is-on")}
      onClick={() => onChange(!checked)}
    >
      <span className="uu-switch__track" aria-hidden>
        <span className="uu-switch__thumb" />
      </span>
    </button>
  );
}

export function Search({
  value,
  onChange,
  placeholder,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  label: string;
}) {
  const id = useId();
  return (
    <div className="uu-search">
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <Icon name="search" size={18} className="uu-search__icon" />
      <input
        id={id}
        type="search"
        className="input uu-search__input"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        autoComplete="off"
      />
    </div>
  );
}

export function Stato({ tone, children }: { tone: "ok" | "attesa" | "neutro" | "errore"; children: ReactNode }) {
  return (
    <span className={cx("uu-stato", `uu-stato--${tone}`)}>
      <span className="uu-stato__dot" aria-hidden />
      {children}
    </span>
  );
}

/** Codice in Plex Mono con pulsante Copia */
export function CodeBox({ value, label, big }: { value: string; label?: string; big?: boolean }) {
  const [copiato, setCopiato] = useState(false);
  const copia = async () => {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      toast("Non riusciamo a copiare: seleziona il testo e copialo a mano.", "errore");
      return;
    }
    setCopiato(true);
    toast("Copiato negli appunti.", "ok");
    setTimeout(() => setCopiato(false), 1800);
  };
  return (
    <div className="uu-code">
      {label && <span className="t-label t-muted">{label}</span>}
      <div className="uu-code__row">
        <code className={cx("uu-code__val", big && "uu-code__val--big")}>{value}</code>
        <button type="button" className="btn btn--outline btn--sm" onClick={copia}>
          <Icon name={copiato ? "check" : "copy"} size={16} />
          {copiato ? "Copiato" : "Copia"}
        </button>
      </div>
    </div>
  );
}

/** righe grigie mentre i dati arrivano dal server */
export function RigheCaricamento({ n = 4, h = 44 }: { n?: number; h?: number }) {
  return (
    <div className="uu-skel" role="status" aria-label="Caricamento in corso">
      {Array.from({ length: n }, (_, i) => (
        <Skeleton key={i} h={h} />
      ))}
    </div>
  );
}
