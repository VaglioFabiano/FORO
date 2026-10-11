/**
 * Statuto: struttura del testo (commi, elenchi) e ricerca con evidenziazione.
 * La ricerca ignora maiuscole, accenti e apostrofi tipografici ("attivita" trova "attività").
 */
import { Fragment, type ReactNode } from "react";
import type { ArticoloStatuto } from "@/data/types";

/* ───────── sezioni ───────── */
export type SezioneStatuto = { n: number; titolo: string; articoli: ArticoloStatuto[]; da: number; a: number };

export function raggruppa(list: ArticoloStatuto[]): SezioneStatuto[] {
  const out: SezioneStatuto[] = [];
  for (const art of list) {
    if (art.titoloSezione || !out.length) {
      out.push({ n: out.length + 1, titolo: art.titoloSezione ?? "Statuto", articoli: [], da: art.numero, a: art.numero });
    }
    const s = out[out.length - 1];
    s.articoli.push(art);
    s.a = art.numero;
  }
  return out;
}

/* ───────── struttura dei commi ───────── */
export type Blocco =
  | { kind: "p"; num?: string; lead?: string; text: string }
  | { kind: "list"; style: "alpha" | "bullet"; items: { marker?: string; text: string }[] };

export function blocchi(commi: string[]): Blocco[] {
  const out: Blocco[] = [];
  for (const raw of commi) {
    const c = raw.trim();
    const bullet = /^•\s+(.*)$/s.exec(c);
    const alpha = /^([a-z])\)\s+(.*)$/s.exec(c);
    if (bullet || alpha) {
      const style = bullet ? "bullet" : "alpha";
      const item = bullet ? { text: bullet[1] } : { marker: `${alpha![1]})`, text: alpha![2] };
      const last = out[out.length - 1];
      if (last && last.kind === "list" && last.style === style) last.items.push(item);
      else out.push({ kind: "list", style, items: [item] });
      continue;
    }
    const num = /^(\d+)\.\s+(.*)$/s.exec(c);
    if (num) {
      const lead = /^\(([^)]{2,40})\)\s+(.*)$/s.exec(num[2]);
      out.push(lead ? { kind: "p", num: num[1], lead: lead[1], text: lead[2] } : { kind: "p", num: num[1], text: num[2] });
    } else out.push({ kind: "p", text: c });
  }
  return out;
}

/* ───────── ricerca ───────── */
const strip = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[’‘`´]/g, "'")
    .replace(/[“”«»]/g, '"')
    .toLowerCase();

/** testo normalizzato + mappa indice normalizzato → indice originale */
function fold(text: string) {
  let out = "";
  const map: number[] = [];
  for (let i = 0; i < text.length; i++) {
    const piece = strip(text[i]);
    for (let k = 0; k < piece.length; k++) {
      out += piece[k];
      map.push(i);
    }
  }
  return { out, map };
}

export function termini(q: string) {
  return [
    ...new Set(
      strip(q)
        .split(/\s+/)
        .map((t) => t.replace(/^["']+|["']+$/g, ""))
        .filter((t) => t.length >= 2),
    ),
  ];
}

type Range = [number, number];

function ranges(text: string, terms: string[]): Range[] {
  if (!terms.length) return [];
  const { out, map } = fold(text);
  const r: Range[] = [];
  for (const t of terms) {
    let from = 0;
    for (;;) {
      const i = out.indexOf(t, from);
      if (i < 0) break;
      r.push([map[i], map[i + t.length - 1] + 1]);
      from = i + t.length;
    }
  }
  r.sort((a, b) => a[0] - b[0]);
  const merged: Range[] = [];
  for (const x of r) {
    const last = merged[merged.length - 1];
    if (last && x[0] <= last[1]) last[1] = Math.max(last[1], x[1]);
    else merged.push([...x] as Range);
  }
  return merged;
}

export function contaOccorrenze(text: string, terms: string[]) {
  return ranges(text, terms).length;
}

/** un articolo corrisponde se contiene tutti i termini (titolo o testo) */
export function corrisponde(art: ArticoloStatuto, terms: string[]) {
  if (!terms.length) return true;
  const all = strip(`art. ${art.numero} ${art.titolo} ${art.commi.join(" ")}`);
  return terms.every((t) => all.includes(t));
}

export function occorrenzeArticolo(art: ArticoloStatuto, terms: string[]) {
  return contaOccorrenze(art.titolo, terms) + art.commi.reduce((s, c) => s + contaOccorrenze(c, terms), 0);
}

/** testo con le occorrenze in <mark> */
export function Evidenzia({ text, terms }: { text: string; terms: string[] }): ReactNode {
  const r = ranges(text, terms);
  if (!r.length) return text;
  const parts: ReactNode[] = [];
  let at = 0;
  r.forEach(([a, b], i) => {
    if (a > at) parts.push(<Fragment key={`t${i}`}>{text.slice(at, a)}</Fragment>);
    parts.push(
      <mark key={`m${i}`} className="stt-mark">
        {text.slice(a, b)}
      </mark>,
    );
    at = b;
  });
  if (at < text.length) parts.push(<Fragment key="end">{text.slice(at)}</Fragment>);
  return parts;
}

/** estratto attorno alla prima occorrenza nel testo dell'articolo */
export function estratto(art: ArticoloStatuto, terms: string[], span = 78): string | null {
  for (const c of art.commi) {
    const r = ranges(c, terms);
    if (!r.length) continue;
    const [a, b] = r[0];
    let s = Math.max(0, a - span);
    let e = Math.min(c.length, b + span);
    if (s > 0) {
      const sp = c.indexOf(" ", s);
      if (sp > 0 && sp < a) s = sp + 1;
    }
    if (e < c.length) {
      const sp = c.lastIndexOf(" ", e);
      if (sp > b) e = sp;
    }
    return `${s > 0 ? "… " : ""}${c.slice(s, e).replace(/^(\d+\.|•|[a-z]\))\s+/, "")}${e < c.length ? " …" : ""}`;
  }
  return null;
}
