/**
 * Primitive UI condivise. Stile in src/styles/base.css (.btn, .input, .alert, .tag…).
 * Raggio 2 px ovunque, focus Lanterna, testo in Jost.
 */
import {
  forwardRef,
  useEffect,
  useId,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";
import { Link, type LinkProps } from "react-router-dom";
import { AnimatePresence, motion, useInView, useReducedMotion, animate } from "motion/react";
import { Icon, type IconName } from "./Icon";

export { Icon } from "./Icon";
export type { IconName } from "./Icon";

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");
export { cx };

/* ───────── Button ───────── */
type Variant = "primary" | "lanterna" | "outline" | "carta" | "outline-carta" | "ghost";
type Size = "sm" | "md" | "lg";
const vClass = (v: Variant) => (v === "primary" ? "" : `btn--${v}`);
const sClass = (s: Size) => (s === "md" ? "" : `btn--${s}`);

type BtnBase = {
  variant?: Variant;
  size?: Size;
  icon?: IconName;
  /** freccia animata a destra (CTA) */
  arrow?: boolean;
  loading?: boolean;
  block?: boolean;
  children?: ReactNode;
  className?: string;
};

export const Button = forwardRef<HTMLButtonElement, BtnBase & ButtonHTMLAttributes<HTMLButtonElement>>(
  function Button({ variant = "primary", size = "md", icon, arrow, loading, block, children, className, disabled, ...rest }, ref) {
    return (
      <button
        ref={ref}
        className={cx("btn", vClass(variant), sClass(size), block && "btn--block", className)}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        {...rest}
      >
        {loading ? <span className="spinner" aria-hidden /> : icon ? <Icon name={icon} size={18} /> : null}
        {children}
        {arrow && !loading && <Icon name="arrow-right" size={18} className="btn-arrow" />}
      </button>
    );
  },
);

/** Link con l'aspetto di un pulsante (routing interno) */
export function ButtonLink({
  variant = "primary",
  size = "md",
  icon,
  arrow,
  block,
  children,
  className,
  ...rest
}: BtnBase & LinkProps) {
  return (
    <Link className={cx("btn", vClass(variant), sClass(size), block && "btn--block", className)} {...rest}>
      {icon ? <Icon name={icon} size={18} /> : null}
      {children}
      {arrow && <Icon name="arrow-right" size={18} className="btn-arrow" />}
    </Link>
  );
}

/* ───────── Campi ───────── */
type FieldWrap = { label: ReactNode; hint?: ReactNode; error?: string | null; optional?: boolean; className?: string };

function FieldShell({ id, label, hint, error, optional, className, children }: FieldWrap & { id: string; children: ReactNode }) {
  return (
    <div className={cx("field", className)}>
      <label className="field__label" htmlFor={id}>
        {label}
        {optional && <span className="opt">facoltativo</span>}
      </label>
      {children}
      {error ? (
        <span className="field__error" id={`${id}-err`} role="alert">
          <Icon name="alert" size={15} /> {error}
        </span>
      ) : hint ? (
        <span className="field__hint" id={`${id}-hint`}>
          {hint}
        </span>
      ) : null}
    </div>
  );
}

export const TextField = forwardRef<HTMLInputElement, FieldWrap & InputHTMLAttributes<HTMLInputElement>>(function TextField(
  { label, hint, error, optional, className, id: idProp, ...rest },
  ref,
) {
  const auto = useId();
  const id = idProp ?? auto;
  return (
    <FieldShell id={id} label={label} hint={hint} error={error} optional={optional} className={className}>
      <input
        ref={ref}
        id={id}
        className="input"
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-err` : hint ? `${id}-hint` : undefined}
        {...rest}
      />
    </FieldShell>
  );
});

export const TextArea = forwardRef<HTMLTextAreaElement, FieldWrap & TextareaHTMLAttributes<HTMLTextAreaElement>>(function TextArea(
  { label, hint, error, optional, className, id: idProp, ...rest },
  ref,
) {
  const auto = useId();
  const id = idProp ?? auto;
  return (
    <FieldShell id={id} label={label} hint={hint} error={error} optional={optional} className={className}>
      <textarea
        ref={ref}
        id={id}
        className="textarea"
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-err` : hint ? `${id}-hint` : undefined}
        {...rest}
      />
    </FieldShell>
  );
});

export const SelectField = forwardRef<
  HTMLSelectElement,
  FieldWrap & SelectHTMLAttributes<HTMLSelectElement> & { options: { value: string; label: string }[]; placeholder?: string }
>(function SelectField({ label, hint, error, optional, className, id: idProp, options, placeholder, ...rest }, ref) {
  const auto = useId();
  const id = idProp ?? auto;
  return (
    <FieldShell id={id} label={label} hint={hint} error={error} optional={optional} className={className}>
      <select ref={ref} id={id} className="select" aria-invalid={error ? true : undefined} {...rest}>
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </FieldShell>
  );
});

export function Checkbox({
  label,
  error,
  className,
  ...rest
}: { label: ReactNode; error?: string | null; className?: string } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className={className}>
      <label className="check">
        <input type="checkbox" aria-invalid={error ? true : undefined} {...rest} />
        <span>{label}</span>
      </label>
      {error && (
        <span className="field__error" role="alert" style={{ marginTop: 6, marginLeft: 32 }}>
          {error}
        </span>
      )}
    </div>
  );
}

/* ───────── Alert ───────── */
export function Alert({
  tone = "info",
  children,
  className,
}: {
  tone?: "info" | "ok" | "avviso" | "errore";
  children: ReactNode;
  className?: string;
}) {
  const icon: IconName = tone === "ok" ? "check" : tone === "errore" || tone === "avviso" ? "alert" : "info";
  return (
    <div className={cx("alert", tone !== "info" && `alert--${tone}`, className)} role={tone === "errore" ? "alert" : "status"}>
      <Icon name={icon} size={18} style={{ marginTop: 2 }} />
      <div>{children}</div>
    </div>
  );
}

/* ───────── Intestazione di sezione: "—— 03" + titolo⌝ ───────── */
export function SectionHead({
  index,
  eyebrow,
  title,
  intro,
  corner = true,
  cornerTone = "lanterna",
  align = "split",
  as: Tag = "h2",
  className,
  titleClassName = "t-display",
}: {
  index?: string;
  eyebrow?: ReactNode;
  title: ReactNode;
  intro?: ReactNode;
  corner?: boolean;
  cornerTone?: "lanterna" | "carta";
  /** split = titolo a sinistra, intro a destra (come il manuale) */
  align?: "split" | "stack";
  as?: "h1" | "h2" | "h3";
  className?: string;
  titleClassName?: string;
}) {
  return (
    <header className={cx("section-head", `section-head--${align}`, className)}>
      <div className="section-head__title">
        {(index || eyebrow) && (
          <Reveal>
            <span className="eyebrow">
              {index}
              {index && eyebrow ? " · " : ""}
              {eyebrow}
            </span>
          </Reveal>
        )}
        <Reveal delay={0.05}>
          <Tag className={cx(titleClassName, "t-balance")}>
            {title}
            {corner && <span className={cx("corner-mark", cornerTone === "carta" && "corner-mark--carta")} aria-hidden />}
          </Tag>
        </Reveal>
      </div>
      {intro && (
        <Reveal delay={0.12} className="section-head__intro">
          <div className="t-lead t-pretty">{intro}</div>
        </Reveal>
      )}
    </header>
  );
}

/* ───────── Reveal allo scroll ───────── */
export function Reveal({
  children,
  delay = 0,
  y = 22,
  className,
  as = "div",
  once = true,
  amount = 0.2,
}: {
  children: ReactNode;
  delay?: number;
  y?: number;
  className?: string;
  as?: "div" | "li" | "span" | "section" | "article";
  once?: boolean;
  amount?: number;
}) {
  const reduce = useReducedMotion();
  const M = motion[as] as typeof motion.div;
  if (reduce) {
    const Tag = as as "div";
    return <Tag className={className}>{children}</Tag>;
  }
  return (
    <M
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once, amount }}
      transition={{ duration: 0.9, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </M>
  );
}

/** Titolo che entra riga per riga con maschera (hero, grandi titoli) */
export function SplitReveal({
  lines,
  className,
  delay = 0,
  as: Tag = "h1",
}: {
  lines: ReactNode[];
  className?: string;
  delay?: number;
  as?: "h1" | "h2" | "p" | "div";
}) {
  const reduce = useReducedMotion();
  return (
    <Tag className={className}>
      {lines.map((l, i) => (
        <span key={i} style={{ display: "block", overflow: "hidden", paddingBottom: "0.08em", marginBottom: "-0.08em" }}>
          <motion.span
            style={{ display: "block" }}
            initial={reduce ? false : { y: "105%" }}
            animate={{ y: 0 }}
            transition={{ duration: 1.1, delay: delay + i * 0.09, ease: [0.22, 1, 0.36, 1] }}
          >
            {l}
          </motion.span>
        </span>
      ))}
    </Tag>
  );
}

/** Numero che conta fino al valore quando entra in vista */
export function CountUp({ to, duration = 1.6, format }: { to: number; duration?: number; format?: (n: number) => string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.6 });
  const [val, setVal] = useState(0);
  const reduce = useReducedMotion();
  useEffect(() => {
    if (!inView) return;
    if (reduce) {
      setVal(to);
      return;
    }
    const c = animate(0, to, { duration, ease: [0.22, 1, 0.36, 1], onUpdate: (v) => setVal(v) });
    return () => c.stop();
  }, [inView, to, duration, reduce]);
  const n = Math.round(val);
  return <span ref={ref}>{format ? format(n) : n.toLocaleString("it-IT")}</span>;
}

/* ───────── Modal / Drawer ───────── */
export function Modal({
  open,
  onClose,
  title,
  children,
  width = 560,
  side = "center",
}: {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  width?: number;
  side?: "center" | "right";
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.classList.add("lenis-stopped");
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
      document.documentElement.classList.remove("lenis-stopped");
    };
  }, [open, onClose]);
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="modal-root"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          onMouseDown={(e) => e.target === e.currentTarget && onClose()}
          data-lenis-prevent
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            className={cx("modal", side === "right" && "modal--right")}
            style={{ maxWidth: width }}
            initial={side === "right" ? { x: "100%" } : { opacity: 0, y: 24, scale: 0.98 }}
            animate={side === "right" ? { x: 0 } : { opacity: 1, y: 0, scale: 1 }}
            exit={side === "right" ? { x: "100%" } : { opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="modal__head">
              {title ? <h2 className="t-h2">{title}</h2> : <span />}
              <button className="modal__close" onClick={onClose} aria-label="Chiudi">
                <Icon name="close" size={22} />
              </button>
            </div>
            <div className="modal__body">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ───────── Accordion ───────── */
export function Accordion({
  items,
  defaultOpen,
  className,
}: {
  items: { id: string; title: ReactNode; meta?: ReactNode; content: ReactNode }[];
  defaultOpen?: string;
  className?: string;
}) {
  const [open, setOpen] = useState<string | null>(defaultOpen ?? null);
  return (
    <div className={cx("accordion", className)}>
      {items.map((it) => {
        const isOpen = open === it.id;
        return (
          <div key={it.id} className={cx("accordion__item", isOpen && "is-open")} id={it.id}>
            <button className="accordion__trigger" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : it.id)}>
              {it.meta && <span className="accordion__meta t-mono">{it.meta}</span>}
              <span className="accordion__title">{it.title}</span>
              <span className="accordion__icon" aria-hidden>
                <Icon name="plus" size={20} />
              </span>
            </button>
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                  style={{ overflow: "hidden" }}
                >
                  <div className="accordion__content">{it.content}</div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}

/* ───────── Tabs / segmented ───────── */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  className,
  size = "md",
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: ReactNode }[];
  className?: string;
  size?: "sm" | "md";
}) {
  const id = useId();
  return (
    <div className={cx("segmented", size === "sm" && "segmented--sm", className)} role="tablist">
      {options.map((o) => (
        <button
          key={o.value}
          role="tab"
          aria-selected={value === o.value}
          className={cx("segmented__opt", value === o.value && "is-active")}
          onClick={() => onChange(o.value)}
        >
          {value === o.value && (
            <motion.span layoutId={`seg-${id}`} className="segmented__pill" transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }} />
          )}
          <span className="segmented__label">{o.label}</span>
        </button>
      ))}
    </div>
  );
}

/* ───────── Skeleton ───────── */
export function Skeleton({ h = 16, w = "100%", className }: { h?: number | string; w?: number | string; className?: string }) {
  return <span className={cx("skeleton", className)} style={{ height: h, width: w }} aria-hidden />;
}

/* ───────── Disc (il cerchio pieno) con iniziali ───────── */
export function Avatar({
  name,
  size = 44,
  tone = "petrolio",
}: {
  name: string;
  size?: number;
  tone?: "petrolio" | "lanterna" | "cotto" | "laguna" | "carta";
}) {
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
  const bg = {
    petrolio: "var(--foro-petrolio)",
    lanterna: "var(--foro-lanterna)",
    cotto: "var(--foro-cotto)",
    laguna: "var(--foro-laguna)",
    carta: "var(--foro-carta)",
  }[tone];
  const fg = tone === "lanterna" ? "var(--foro-notte)" : tone === "carta" ? "var(--foro-petrolio)" : "var(--foro-carta)";
  return (
    <span
      className="disc"
      style={{ width: size, height: size, background: bg, color: fg, fontFamily: "var(--foro-font-display)", fontWeight: 500, fontSize: size * 0.36, flex: "none" }}
      aria-hidden
    >
      {initials}
    </span>
  );
}
