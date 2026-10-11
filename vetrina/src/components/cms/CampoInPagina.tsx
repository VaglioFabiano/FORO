/**
 * Il campo di testo che compare sopra la scritta cliccata: stesso carattere, stessa grandezza,
 * stesso colore. Mentre scrivi la pagina sotto si aggiorna. Esc, Invio (testi di una riga)
 * o un clic fuori chiudono il campo; le modifiche restano in bozza finché non salvi la sezione.
 * Un campo sovrapposto, e non la scritta resa modificabile, perché dentro i pulsanti
 * i browser non permettono di scrivere.
 */
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import type { VoceTesto } from "@/lib/contenuti";
import { erroreCampo } from "./bozza";

const COPIA = ["fontFamily", "fontSize", "fontWeight", "fontStyle", "lineHeight", "letterSpacing", "textTransform", "textAlign", "color"] as const;

let tela: CanvasRenderingContext2D | null = null;
/** [r, g, b, alfa 0–1] di qualsiasi colore CSS (rgb, oklab, color-mix…), letto disegnandolo su un pixel */
function rgba(colore: string): [number, number, number, number] {
  tela ??= Object.assign(document.createElement("canvas"), { width: 1, height: 1 }).getContext("2d", { willReadFrequently: true });
  if (!tela) return [255, 253, 249, 1];
  tela.clearRect(0, 0, 1, 1);
  tela.fillStyle = colore;
  tela.fillRect(0, 0, 1, 1);
  const [r, g, b, a] = tela.getImageData(0, 0, 1, 1).data;
  return [r, g, b, a / 255];
}

/** il primo fondo pieno risalendo dalla scritta, così il campo copre il testo originale */
function fondoDi(el: HTMLElement) {
  for (let n: HTMLElement | null = el; n; n = n.parentElement) {
    const bg = getComputedStyle(n).backgroundColor;
    if (rgba(bg)[3] >= 0.9) return bg;
  }
  // nessun fondo pieno (per esempio una foto): chiaro o scuro a seconda del colore del testo
  const [r, g, b] = rgba(getComputedStyle(el).color);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.6 ? "#07303d" : "#fffdf9";
}

export function CampoInPagina({
  el,
  voce,
  valore,
  onChange,
  onChiudi,
}: {
  el: HTMLElement;
  voce: VoceTesto;
  valore: string;
  onChange: (v: string) => void;
  onChiudi: () => void;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [rect, setRect] = useState(() => el.getBoundingClientRect());
  const [stile] = useState<CSSProperties>(() => {
    // nei blocchi (titoli, paragrafi) lo stile giusto è quello dell'elemento che contiene il testo
    const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, { acceptNode: (n) => (n.textContent?.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP) });
    const cs = getComputedStyle(w.nextNode()?.parentElement ?? el);
    const s: Record<string, string> = {};
    COPIA.forEach((k) => (s[k] = cs[k]));
    return { ...s, background: fondoDi(el) };
  });
  const multi = !!(voce.multiline || voce.default.includes("\n"));
  const errore = erroreCampo(voce, valore);

  // segue la scritta mentre la pagina scorre o il testo cambia lunghezza
  useLayoutEffect(() => setRect(el.getBoundingClientRect()), [valore, el]);
  useEffect(() => {
    let raf = 0;
    const segui = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => (el.isConnected ? setRect(el.getBoundingClientRect()) : onChiudi()));
    };
    window.addEventListener("scroll", segui, true);
    window.addEventListener("resize", segui);
    return () => {
      window.removeEventListener("scroll", segui, true);
      window.removeEventListener("resize", segui);
      cancelAnimationFrame(raf);
    };
  }, [el, onChiudi]);
  useLayoutEffect(() => {
    const ta = ref.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${Math.max(ta.scrollHeight, rect.height + 8)}px`;
  }, [valore, rect.height]);
  useEffect(() => {
    const ta = ref.current;
    if (!ta) return;
    ta.focus({ preventScroll: true });
    ta.setSelectionRange(ta.value.length, ta.value.length);
  }, []);

  // bordo (2px) + spazio interno (8px) per lato: il testo nel campo parte dove partiva la scritta
  const largh = Math.min(window.innerWidth - 16, Math.max(rect.width + 26, 260));
  const left = Math.min(Math.max(8, rect.left - 10), window.innerWidth - largh - 8);

  return createPortal(
    <div className="cms-inpag" style={{ left, top: rect.top - 4, width: largh }} role="dialog" aria-label={`Modifica: ${voce.label}`}>
      <div className="cms-inpag__bar">
        <span className="cms-inpag__label">{voce.label}</span>
        {valore !== voce.default && (
          <button type="button" className="cms-inpag__btn" onMouseDown={(e) => e.preventDefault()} onClick={() => onChange(voce.default)}>
            Ripristina l'originale
          </button>
        )}
        <button type="button" className="cms-inpag__btn cms-inpag__btn--ok" onMouseDown={(e) => e.preventDefault()} onClick={onChiudi}>
          Fatto
        </button>
      </div>
      <textarea
        ref={ref}
        className="cms-inpag__campo"
        style={stile}
        value={valore}
        rows={1}
        aria-label={voce.label}
        aria-invalid={!!errore}
        onChange={(e) => onChange(multi ? e.target.value : e.target.value.replace(/\n/g, " "))}
        onKeyDown={(e) => {
          if (e.key === "Escape" || (e.key === "Enter" && !multi)) {
            e.preventDefault();
            onChiudi();
          }
        }}
        onBlur={onChiudi}
      />
      {(errore || voce.hint || /\*\*|\{\w+\}/.test(voce.default)) && (
        <p className={errore ? "cms-inpag__nota is-err" : "cms-inpag__nota"}>
          {errore ??
            voce.hint ??
            "Le parole tra ** escono in grassetto; quelle tra { } sono valori che il sito inserisce da solo (orari, nomi): lasciale così."}
        </p>
      )}
    </div>,
    document.body,
  );
}
