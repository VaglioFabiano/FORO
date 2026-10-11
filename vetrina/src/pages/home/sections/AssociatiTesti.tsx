/**
 * Piccoli aiuti per i testi modificabili (CMS mock) delle sezioni Associati, Seguici, Statuto, Segnalazioni, Contatti.
 * - riempi("Valida fino al {data}", { data: "31.12.2026" }) sostituisce i segnaposto.
 * - ricco("La tessera è **gratuita**") rende **…** in grassetto e gli "a capo" come <br/>.
 */
import { Fragment, type ReactNode } from "react";

export function riempi(s: string, vars: Record<string, string | number> = {}) {
  return s.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m));
}

export function ricco(s: string, vars?: Record<string, string | number>, strongClass?: string): ReactNode {
  const righe = riempi(s, vars).split("\n");
  return righe.map((r, i) => (
    <Fragment key={i}>
      {i > 0 && <br />}
      {r.split(/\*\*(.+?)\*\*/g).map((p, k) =>
        k % 2 ? (
          <strong key={k} className={strongClass}>
            {p}
          </strong>
        ) : (
          <Fragment key={k}>{p}</Fragment>
        ),
      )}
    </Fragment>
  ));
}

/** "titolo\nseconda riga" → righe separate da <br/> */
export const righe = (s: string) => ricco(s);
