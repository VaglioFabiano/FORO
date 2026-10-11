/**
 * Preferenze cookie: due sole scelte, riapribili dal footer e dall'informativa.
 * Mappa e contenuti social fanno parte della homepage e si caricano sempre.
 */
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
import { Button, Icon } from "@/components/ui";
import { consensoStore } from "@/lib/api";
import { useStore } from "@/lib/store";

export function CookieBanner() {
  const consenso = useStore(consensoStore);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!consenso) {
      const t = setTimeout(() => setOpen(true), 1200);
      return () => clearTimeout(t);
    }
  }, [consenso]);
  useEffect(() => {
    const on = () => setOpen(true);
    window.addEventListener("foro:cookie-open", on);
    return () => window.removeEventListener("foro:cookie-open", on);
  }, []);

  const save = (tutti: boolean) => {
    consensoStore.set({ stato: tutti ? "accettato" : "rifiutato", data: new Date().toISOString() });
    setOpen(false);
  };

  const attuale = !consenso ? null : consenso.stato === "accettato" ? "Accetta tutti" : "Solo necessari";

  return (
    <AnimatePresence>
      {open && (
        <motion.aside
          className="cookie"
          role="dialog"
          aria-label="Preferenze sui cookie"
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 24 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          data-lenis-prevent
        >
          <div className="cookie__head">
            <Icon name="cookie" size={22} />
            <h2 className="t-h3">Cookie e privacy</h2>
          </div>
          <p className="cookie__text">
            Salviamo nel tuo browser solo ciò che serve a far funzionare la homepage. Nessuna profilazione. La homepage mostra
            la mappa di Google Maps e i post di Instagram e Telegram: sono servizi esterni, che possono usare cookie propri.
          </p>
          {attuale && <p className="cookie__now t-mono">Scelta attuale · {attuale}</p>}

          <div className="cookie__actions">
            <Button size="sm" onClick={() => save(true)}>
              Accetta tutti
            </Button>
            <Button size="sm" variant="outline" onClick={() => save(false)}>
              Solo necessari
            </Button>
          </div>
          <Link to="/privacy" className="cookie__privacy link" onClick={() => setOpen(false)}>
            Leggi l'informativa
          </Link>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
