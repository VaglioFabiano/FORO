/** Notifiche brevi (toast). Uso: toast("Presenza registrata alle 14:32.", "ok") */
import { AnimatePresence, motion } from "motion/react";
import { createStore, useStore } from "@/lib/store";
import { Icon } from "./Icon";

type Tone = "info" | "ok" | "avviso" | "errore";
type T = { id: number; msg: string; tone: Tone; title?: string };

const toasts = createStore<T[]>("toasts", [], { persist: false });
let n = 0;

export function toast(msg: string, tone: Tone = "ok", title?: string) {
  const id = ++n;
  toasts.set((l) => [...l, { id, msg, tone, title }]);
  setTimeout(() => toasts.set((l) => l.filter((t) => t.id !== id)), 5200);
}

export function Toaster() {
  const list = useStore(toasts);
  return (
    <div className="toaster" aria-live="polite">
      <AnimatePresence>
        {list.map((t) => (
          <motion.div
            key={t.id}
            layout
            className={`toast toast--${t.tone}`}
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, x: 40 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          >
            <Icon name={t.tone === "ok" ? "check" : t.tone === "info" ? "info" : "alert"} size={18} />
            <div>
              {t.title && <strong className="toast__title">{t.title}</strong>}
              <span>{t.msg}</span>
            </div>
            <button aria-label="Chiudi" onClick={() => toasts.set((l) => l.filter((x) => x.id !== t.id))}>
              <Icon name="close" size={16} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
