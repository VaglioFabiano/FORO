/**
 * Documenti ufficiali letti dal file originale, così il sito si aggiorna da solo
 * quando l'associazione modifica il documento.
 *
 * Regolamento: Google Doc esportato in testo (CORS consentito da Google), analizzato
 * in articoli. Se il documento non è raggiungibile si usa la copia in data/regolamento.ts.
 */
import { useEffect, useState } from "react";
import { useLink } from "./link";
import {
  REGOLAMENTO_COMPLETO,
  REGOLAMENTO_TITOLO,
  type ArticoloRegolamento,
} from "@/data/regolamento";

/** il documento si sceglie dalla homepage (link «Regolamento · Google Doc», vedi lib/link.ts) */
const exportUrl = (docId: string) => `https://docs.google.com/document/d/${docId}/export?format=txt`;

export type Regolamento = {
  titolo: string;
  articoli: ArticoloRegolamento[];
  /** "documento" = letto ora dal file ufficiale; "copia" = copia salvata nel sito */
  fonte: "documento" | "copia";
  lettoIl?: string;
};

const COPIA: Regolamento = { titolo: REGOLAMENTO_TITOLO, articoli: REGOLAMENTO_COMPLETO, fonte: "copia" };

const capitalizza = (s: string) => (s === s.toUpperCase() ? s.charAt(0) + s.slice(1).toLowerCase() : s);

/** Testo del Google Doc → articoli. Rispetta la numerazione del file così com'è. */
export function parseRegolamento(txt: string): { titolo: string; articoli: ArticoloRegolamento[] } {
  const righe = txt
    .replace(/^﻿/, "")
    .split(/\r?\n/)
    .map((r) => r.trim())
    .filter(Boolean);
  const titolo = righe.shift() ?? REGOLAMENTO_TITOLO;
  const hdr = /^(PREMESSA|ART\.?\s*\d+|Art\.?\s*\d+)\s*[:.]?\s*(.*)$/i;
  const articoli: ArticoloRegolamento[] = [];
  let cur: ArticoloRegolamento | null = null;
  for (const r of righe) {
    const m = r.match(hdr);
    if (m) {
      const lab = m[1];
      const resto = m[2].trim().replace(/\.$/, "");
      cur = /premessa/i.test(lab)
        ? { numero: "Premessa", titolo: "", righe: [] }
        : { numero: `Art. ${lab.match(/\d+/)![0]}`, titolo: capitalizza(resto), righe: [] };
      articoli.push(cur);
      continue;
    }
    if (!cur) continue;
    const prev = cur.righe[cur.righe.length - 1];
    // riga spezzata a metà frase nel documento ("…alle seguenti" + "condizioni:")
    if (prev && !/^\d+\./.test(r) && /seguenti$/.test(prev)) cur.righe[cur.righe.length - 1] = `${prev} ${r}`;
    else cur.righe.push(r);
  }
  return { titolo, articoli };
}

const cache = new Map<string, Promise<Regolamento>>();

export function caricaRegolamento(docId: string): Promise<Regolamento> {
  let p = cache.get(docId);
  if (!p) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);
    p = fetch(exportUrl(docId), { signal: ctrl.signal })
      .then((r) => (r.ok ? r.text() : Promise.reject(new Error(String(r.status)))))
      .then((txt) => {
        const p = parseRegolamento(txt);
        if (p.articoli.length < 3) throw new Error("documento non riconosciuto");
        return { ...p, fonte: "documento" as const, lettoIl: new Date().toISOString() };
      })
      .catch(() => COPIA)
      .finally(() => clearTimeout(timer));
    cache.set(docId, p);
  }
  return p;
}

/** Hook: parte dalla copia locale e la sostituisce con il documento appena letto */
export function useRegolamento(): Regolamento & { caricamento: boolean } {
  const { regolamentoId } = useLink();
  const [reg, setReg] = useState<Regolamento>(COPIA);
  const [caricamento, setCaricamento] = useState(true);
  useEffect(() => {
    let vivo = true;
    setCaricamento(true);
    caricaRegolamento(regolamentoId).then((r) => {
      if (!vivo) return;
      setReg(r);
      setCaricamento(false);
    });
    return () => {
      vivo = false;
    };
  }, [regolamentoId]);
  return { ...reg, caricamento };
}
