/**
 * Un testo della homepage. Di norma è solo testo; quando la sua sezione è in modifica
 * si incornicia e, al clic, diventa un campo di testo sopra la scritta (vedi CampoInPagina).
 * Lo crea t.ed("chiave") di useTesti: le sezioni non devono sapere nulla della modifica.
 */
import { useContext, useEffect, type ReactNode } from "react";
import type { VoceTesto } from "@/lib/contenuti";
import { ModificaContext } from "./contesto";

export function Editabile({
  chiave,
  voce,
  valore,
  render,
  blocco,
}: {
  chiave: string;
  voce: VoceTesto;
  valore: string;
  /** come si mostra il testo (grassetti, a capo, valori automatici); di base così com'è */
  render?: (s: string) => ReactNode;
  /** il testo occupa un blocco (titoli su più righe, paragrafi) */
  blocco?: boolean;
}) {
  const ctx = useContext(ModificaContext);
  const attiva = !!ctx?.attiva;
  useEffect(() => (attiva && ctx ? ctx.registra(chiave, voce) : undefined), [attiva, ctx, chiave, voce]);

  const mostrato = render ? render(valore) : valore;
  if (!attiva) return <>{mostrato}</>;

  const Tag = blocco ? "div" : "span";
  const vuoto = !valore.trim();
  return (
    <Tag
      className={["cms-t", blocco && "cms-t--blocco", valore !== voce.default && "is-mod", vuoto && "is-vuoto"].filter(Boolean).join(" ")}
      data-cms-key={chiave}
      title={`Modifica: ${voce.label}`}
    >
      {vuoto ? " " : mostrato}
    </Tag>
  );
}
