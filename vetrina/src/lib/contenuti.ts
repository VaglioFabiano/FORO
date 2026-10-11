/**
 * Testi modificabili del sito (CMS): i testi salvati sono nella tabella `contenuti` (api/homepage.js).
 * Ogni sezione della home dichiara le sue frasi in src/data/testi/<sezione>.ts e le legge con useTesti().
 * Come nel sito in produzione si modificano dalla homepage: chi può, preme "Modifica" su una sezione
 * e cambia le scritte sul posto (components/cms). Le modifiche in corso stanno in bozzaStore e si vedono
 * subito; con "Salva" vanno al server e in contenutiStore.
 */
import { createElement, type ReactNode } from "react";
import { Editabile } from "@/components/cms/Editabile";
import { createStore, useStore } from "./store";
import { cacheHomepage } from "./cache";
import { chiama } from "./server";

export interface VoceTesto {
  /** chiave locale alla sezione, es. "titolo", "intro", "cta.orari" */
  key: string;
  /** nome leggibile nel pannello di modifica */
  label: string;
  /** testo originale; "\n" = a capo (per i titoli su più righe) */
  default: string;
  multiline?: boolean;
  /** suggerimento per chi modifica (lunghezza, tono…) */
  hint?: string;
  /** "url", "email" e "coordinate" vengono controllati prima di salvare; di base è testo libero */
  tipo?: "testo" | "url" | "email" | "coordinate";
  /** se vero, il campo non può restare vuoto (es. un link usato dal sito) */
  obbligatorio?: boolean;
}
export interface GruppoTesti {
  /** prefisso delle chiavi, es. "hero" */
  id: string;
  /** nome della sezione nel pannello, es. "Apertura" */
  sezione: string;
  /** ancora della home per "Vedi sul sito", es. "top" */
  ancora: string;
  voci: VoceTesto[];
}

/** testi salvati (diversi dall'originale) */
export const contenutiStore = createStore<Record<string, string>>("contenuti", () => cacheHomepage()?.contenuti ?? {}, { persist: false });
/** modifiche in corso, non ancora salvate: si vedono subito ma solo in questo browser */
export const bozzaStore = createStore<Record<string, string>>("contenuti-bozza", {}, { persist: false });

export type Testi = ((key: string) => string) & {
  /**
   * Il testo come elemento della pagina, modificabile sul posto quando la sezione è in modifica.
   * render: come mostrarlo (grassetti, a capo, valori automatici); blocco: titoli e paragrafi.
   */
  ed: (key: string, render?: (s: string) => ReactNode, opts?: { blocco?: boolean }) => ReactNode;
};

const voceDi = (g: GruppoTesti, key: string): VoceTesto =>
  g.voci.find((x) => x.key === key) ?? { key, label: key, default: "" };

/** const t = useTesti(TESTI_HERO); t("titolo") per le stringhe, t.ed("titolo") per le scritte della pagina */
export function useTesti(g: GruppoTesti): Testi {
  const ov = useStore(contenutiStore);
  const bz = useStore(bozzaStore);
  const t = ((key: string) => {
    const full = `${g.id}.${key}`;
    if (bz[full] !== undefined) return bz[full];
    if (ov[full] !== undefined) return ov[full];
    const v = g.voci.find((x) => x.key === key);
    if (!v && import.meta.env.DEV) console.warn(`[testi] chiave non dichiarata: ${full}`);
    return v?.default ?? key;
  }) as Testi;
  t.ed = (key, render, opts) =>
    createElement(Editabile, { chiave: `${g.id}.${key}`, voce: voceDi(g, key), valore: t(key), render, blocco: opts?.blocco });
  return t;
}

/** valore corrente (bozza, testo salvato o originale) senza hook */
export function testoCorrente(g: GruppoTesti, key: string) {
  const full = `${g.id}.${key}`;
  return bozzaStore.get()[full] ?? contenutiStore.get()[full] ?? g.voci.find((x) => x.key === key)?.default ?? "";
}
/** salva testi diversi dall'originale e riporta all'originale le chiavi indicate (livello ≤ 2) */
export async function salvaTesti(valori: Record<string, string>, ripristina: string[] = []) {
  const corpo: Record<string, string | null> = { ...valori };
  ripristina.forEach((k) => (corpo[k] = null));
  if (!Object.keys(corpo).length) return;
  const { versione } = await chiama<{ versione: number }>("homepage", { method: "PUT", query: { action: "contenuti" }, body: { valori: corpo } });
  contenutiStore.set((cur) => {
    const n = { ...cur, ...valori };
    ripristina.forEach((k) => delete n[k]);
    return n;
  });
  void import("./homepage").then((m) => m.dopoSalvataggio(versione));
}
export function ripristinaTesti(chiavi: string[]) {
  return salvaTesti({}, chiavi);
}
