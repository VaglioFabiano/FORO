/**
 * La storia come linea del tempo a serpentina (schizzo del committente):
 * prima riga da sinistra a destra, curva, seconda riga da destra a sinistra, curva, e così via.
 * Ogni tappa è un tema (per esempio "I primi eventi"): l'approfondimento elenca i singoli
 * momenti, uno per riga. L'ultima tappa è il cerchio pieno.
 * Su telefono la serpentina diventa una linea verticale.
 * Le tappe arrivano da useStoria(): aggiunte e modifiche dalla dashboard compaiono qui.
 */
import { useEffect, useState, type CSSProperties } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Icon, Reveal, cx } from "@/components/ui";
import type { TappaStoria } from "@/data/types";
import { TESTI_CHISIAMO } from "@/data/testi/chisiamo";
import { useTesti } from "@/lib/contenuti";
import { useStoria } from "@/lib/storia";

const EASE = [0.22, 1, 0.36, 1] as const;

function useColonne() {
  const calc = () => {
    if (typeof window === "undefined") return 4;
    if (window.matchMedia("(min-width: 1100px)").matches) return 4;
    if (window.matchMedia("(min-width: 720px)").matches) return 3;
    return 1;
  };
  const [k, setK] = useState(calc);
  useEffect(() => {
    const on = () => setK(calc());
    window.addEventListener("resize", on);
    return () => window.removeEventListener("resize", on);
  }, []);
  return k;
}

type Toggle = (id: string) => void;

function Tappa({ s, ultima, aperta, onToggle }: { s: TappaStoria; ultima: boolean; aperta: boolean; onToggle: Toggle }) {
  const t = useTesti(TESTI_CHISIAMO);
  const pid = `cs-app-${s.id}`;
  return (
    <div role="listitem" className={cx("cs-tappa", ultima && "is-now")}>
      <span className="cs-tappa__node" aria-hidden />
      <p className="cs-tappa__anno">{s.anno}</p>
      <h4 className="cs-tappa__titolo">{s.titolo}</h4>
      {s.testo && <p className="cs-tappa__testo">{s.testo}</p>}
      {s.approfondimento && (
        <>
          <AnimatePresence initial={false}>
            {aperta && (
              <motion.div
                id={pid}
                className="cs-tappa__app"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.5, ease: EASE }}
              >
                {/* una riga dell'approfondimento = un momento della tappa */}
                <div className="cs-tappa__app-corpo">
                  {s.approfondimento
                    .split("\n")
                    .filter((r) => r.trim())
                    .map((r, i) => (
                      <p key={i}>{r}</p>
                    ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <button type="button" className="cs-tappa__toggle" aria-expanded={aperta} aria-controls={pid} onClick={() => onToggle(s.id)}>
            <Icon name={aperta ? "minus" : "plus"} size={16} />
            <span>{aperta ? t.ed("storia.chiudi") : t.ed("storia.approfondisci")}</span>
          </button>
        </>
      )}
    </div>
  );
}

export function Storia() {
  const t = useTesti(TESTI_CHISIAMO);
  const tappe = useStoria();
  const k = useColonne();
  const [aperte, setAperte] = useState<Set<string>>(() => new Set());

  const conApp = tappe.filter((s) => s.approfondimento);
  const tutteAperte = conApp.length > 0 && conApp.every((s) => aperte.has(s.id));
  const toggle: Toggle = (id) =>
    setAperte((cur) => {
      const n = new Set(cur);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  const toggleTutte = () => setAperte(tutteAperte ? new Set() : new Set(conApp.map((s) => s.id)));

  if (tappe.length === 0) {
    return <p className="cs-storia__vuoto">{t.ed("storia.vuoto")}</p>;
  }

  const ultimaId = tappe[tappe.length - 1].id;
  const fondo = conApp.length > 0 && (
    <div className="cs-storia__fondo">
      <button type="button" className="btn btn--outline" onClick={toggleTutte} aria-expanded={tutteAperte}>
        <Icon name={tutteAperte ? "minus" : "plus"} size={18} />
        {tutteAperte ? t.ed("storia.chiuditutti") : t.ed("storia.tutti")}
      </button>
    </div>
  );

  /* ── telefono: linea verticale ── */
  if (k === 1) {
    return (
      <div className="cs-storia cs-storia--verticale">
        <div role="list" className="cs-vlist">
          {tappe.map((s, i) => (
            <Reveal key={s.id} delay={0.04 * i} className="cs-vlist__item">
              <Tappa s={s} ultima={s.id === ultimaId} aperta={aperte.has(s.id)} onToggle={toggle} />
            </Reveal>
          ))}
        </div>
        {fondo}
      </div>
    );
  }

  /* ── serpentina ── */
  const righe: TappaStoria[][] = [];
  for (let i = 0; i < tappe.length; i += k) righe.push(tappe.slice(i, i + k));

  return (
    <div className="cs-storia cs-storia--serp" style={{ "--cs-k": k } as CSSProperties}>
      <div role="list" className="cs-serp">
        {righe.map((riga, r) => {
          const inversa = r % 2 === 1;
          const ultimaRiga = r === righe.length - 1;
          const n = riga.length;
          // posizione (colonna) del cerchio dell'ultima tappa della riga
          const colUltima = inversa ? k - n : n - 1;
          // la linea: da/verso il bordo dove c'è la curva, oppure dal/al cerchio
          let da: string;
          let a: string;
          if (!inversa) {
            da = r === 0 ? "var(--cs-node-x)" : "0px";
            a = ultimaRiga ? `calc(${colUltima} / var(--cs-k) * 100% + var(--cs-node-x))` : "100%";
          } else {
            da = ultimaRiga ? `calc(${colUltima} / var(--cs-k) * 100% + var(--cs-node-x))` : "0px";
            a = "100%";
          }
          return (
            <div key={r} className={cx("cs-serp__riga", inversa && "is-inversa")}>
              <motion.span
                className="cs-serp__linea"
                aria-hidden
                style={{ left: da, width: `calc(${a} - ${da})`, transformOrigin: inversa ? "right center" : "left center" }}
                initial={{ scaleX: 0 }}
                whileInView={{ scaleX: 1 }}
                viewport={{ once: true, amount: 0.6 }}
                transition={{ duration: 1.1, ease: EASE, delay: 0.1 }}
              />
              {!ultimaRiga && (
                <motion.span
                  className={cx("cs-serp__curva", inversa ? "is-sinistra" : "is-destra")}
                  aria-hidden
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true, amount: 0.3 }}
                  transition={{ duration: 0.6, ease: EASE, delay: 0.9 }}
                />
              )}
              <div className="cs-serp__celle">
                {riga.map((s, j) => {
                  const col = inversa ? k - 1 - j : j;
                  return (
                    <Reveal key={s.id} delay={0.12 + 0.08 * j} className={`cs-serp__cella cs-serp__cella--c${col + 1}`}>
                      <Tappa s={s} ultima={s.id === ultimaId} aperta={aperte.has(s.id)} onToggle={toggle} />
                    </Reveal>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      {fondo}
    </div>
  );
}
