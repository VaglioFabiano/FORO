/**
 * Bundle pubblico della homepage (api/homepage.js): testi, categorie, eventi visibili, orari, storia.
 * In cache CDN 60 s; nel browser l'ultima copia sta in localStorage (lib/cache.ts) e si aggiorna in background.
 */
import { CHIAVE_CACHE, type BundleHomepage } from "./cache";
import { chiama } from "./server";
import { eventiStore, homepagePronta, orariStore } from "./api";
import { contenutiStore } from "./contenuti";
import { categorieStore } from "./categorie";
import { storiaStore } from "./storia";

/**
 * versione salvata da questo browser: subito dopo un salvataggio la CDN può servire ancora la copia di prima,
 * che quindi non deve sovrascrivere i dati appena scritti. In tutti gli altri casi vince il server
 * (la copia in localStorage può venire da un altro database, per esempio una prova).
 */
let versioneMinima = 0;
let inCorso: Promise<void> | null = null;

function applica(b: BundleHomepage) {
  orariStore.set(b.orari);
  eventiStore.set(b.eventi);
  contenutiStore.set(b.contenuti);
  categorieStore.set(b.categorie.length ? b.categorie : categorieStore.get());
  storiaStore.set(b.storia);
  try {
    localStorage.setItem(CHIAVE_CACHE, JSON.stringify(b));
  } catch {
    /* storage pieno o non disponibile */
  }
}

/** fresco = salta la cache CDN (dopo un salvataggio) */
export function caricaHomepage(fresco = false): Promise<void> {
  if (inCorso && !fresco) return inCorso;
  const p = (async () => {
    try {
      const b = await chiama<BundleHomepage>("homepage", { query: fresco ? { _: Date.now() } : undefined });
      if (b.versione >= versioneMinima) applica(b);
    } finally {
      homepagePronta.set(true);
    }
  })();
  inCorso = p;
  p.catch(() => undefined).finally(() => {
    if (inCorso === p) inCorso = null;
  });
  return p;
}

/** dopo una scrittura che cambia la homepage: si ricarica saltando la cache */
export function dopoSalvataggio(versione: number) {
  versioneMinima = Math.max(versioneMinima, versione);
  void caricaHomepage(true);
}

let avviato = false;
/** primo caricamento, poi a ogni ritorno sulla scheda (al massimo ogni 5 minuti) */
export function avviaHomepage() {
  if (avviato) return;
  avviato = true;
  let ultimo = Date.now();
  void caricaHomepage().catch(() => undefined);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && Date.now() - ultimo > 5 * 60_000) {
      ultimo = Date.now();
      void caricaHomepage().catch(() => undefined);
    }
  });
}
