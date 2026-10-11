import type { GruppoTesti, VoceTesto } from "@/lib/contenuti";

const v = (key: string, label: string, def: string, multiline = false, hint?: string): VoceTesto => ({
  key,
  label,
  default: def,
  ...(multiline ? { multiline } : {}),
  ...(hint ? { hint } : {}),
});

/** Testi modificabili della sezione "Dove siamo" (#contatti). Indirizzi ed email restano in src/data/org.ts. */
export const TESTI_CONTATTI: GruppoTesti = {
  id: "contatti",
  sezione: "Dove siamo",
  ancora: "contatti",
  voci: [
    v("eyebrow", "Occhiello", "Contatti"),
    v("titolo", "Titolo", "Dove siamo"),
    v(
      "intro",
      "Introduzione",
      "Siamo al piano inferiore della biblioteca civica Nuto Revelli, nel centro di Piossasco. L'entrata è separata: il cancello automatico su via Alfieri. Vieni quando è aperta, non serve prenotare.",
      true,
    ),

    v("indirizzo.k", "Riquadro indirizzo · occhiello", "Aula studio"),
    v("dove.k", "Riquadro indirizzo · etichetta «Dove»", "Dove"),
    v("ingresso.k", "Riquadro indirizzo · etichetta «Ingresso»", "Ingresso"),
    v("coordinate.k", "Riquadro indirizzo · etichetta «Coordinate»", "Coordinate"),
    v("btn.indicazioni", "Pulsante · Indicazioni", "Indicazioni"),
    v("btn.maps", "Pulsante · Apri in Google Maps", "Apri in Google Maps"),
  ],
};
