/**
 * Anteprima di una notifica di UFORObot, il bot Telegram dei turni (Manuale, cap. 09).
 * Usata nella pagina di accesso e nella panoramica dell'area volontari.
 */
import { useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { LogoMark } from "@/brand/Logo";
import { Icon, cx } from "@/components/ui";
import "./shell.css";

export function TelegramNotifica({
  children,
  time,
  action = "Confermo la presenza",
  done = "Presenza confermata",
  onAction,
  className,
  delay = 0,
}: {
  children: ReactNode;
  time: string;
  action?: string | null;
  done?: string;
  onAction?: () => void;
  className?: string;
  /** ritardo di comparsa, in secondi */
  delay?: number;
}) {
  const [ok, setOk] = useState(false);
  return (
    <motion.figure
      className={cx("sh-tg", className)}
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.9, delay, ease: [0.22, 1, 0.36, 1] }}
      aria-label="Anteprima di una notifica Telegram di UFORObot"
    >
      <figcaption className="sh-tg__head">
        <span className="disc sh-tg__avatar" aria-hidden>
          <LogoMark color="var(--foro-carta)" height={17} />
        </span>
        <span className="sh-tg__who">
          <strong>UFORObot</strong>
          <span>bot</span>
        </span>
      </figcaption>
      <div className="sh-tg__bubble">
        <div className="sh-tg__text">{children}</div>
        <span className="sh-tg__time">{time}</span>
      </div>
      {action && (
        <button
          type="button"
          className={cx("sh-tg__action", ok && "is-done")}
          onClick={() => {
            setOk((v) => !v);
            onAction?.();
          }}
          aria-pressed={ok}
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={ok ? "done" : "todo"}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.25 }}
            >
              {ok && <Icon name="check" size={16} />}
              {ok ? done : action}
            </motion.span>
          </AnimatePresence>
        </button>
      )}
    </motion.figure>
  );
}
