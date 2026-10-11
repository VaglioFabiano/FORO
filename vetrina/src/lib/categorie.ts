/**
 * Categorie degli eventi: la barra dei filtri della sezione Eventi.
 * Configurabili dalla dashboard (livello ≤ 2), salvate nella tabella categorie_eventi.
 */
import { createStore, useStore } from "./store";
import { cacheHomepage } from "./cache";
import { chiama } from "./server";
import type { CategoriaCfg } from "@/data/types";

export const CATEGORIE_DEFAULT: CategoriaCfg[] = [
  { id: "cineforo", label: "CineFORO" },
  { id: "eventi", label: "Eventi" },
  { id: "assemblee", label: "Assemblee" },
];

export const categorieStore = createStore<CategoriaCfg[]>("categorie-eventi", () => cacheHomepage()?.categorie ?? CATEGORIE_DEFAULT, { persist: false });

/** salva l'elenco completo delle categorie ('assemblee' non si può togliere) */
export async function salvaCategorie(categorie: CategoriaCfg[]) {
  const { versione } = await chiama<{ versione: number }>("homepage", { method: "PUT", query: { action: "categorie" }, body: { categorie } });
  categorieStore.set(categorie);
  void import("./homepage").then((m) => m.dopoSalvataggio(versione));
}

export function useCategorie() {
  return useStore(categorieStore);
}

export function labelCategoria(id: string) {
  return categorieStore.get().find((c) => c.id === id)?.label ?? "Eventi";
}

/** id leggibile da un'etichetta: "Serate musicali" → "serate-musicali" */
export function slugCategoria(label: string) {
  return (
    label
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "categoria"
  );
}
