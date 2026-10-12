/**
 * Titolo, descrizione e dati strutturati della pagina di un evento (/eventi/:slug), per i motori di ricerca
 * e per l'anteprima dei link. Alla chiusura della scheda tornano quelli della homepage (index.html).
 */
import { useEffect } from "react";
import type { Evento } from "@/data/types";

const SITO = "https://foroets.com";

function meta(sel: string, crea: () => HTMLElement, attr: string, valore: string) {
  let el = document.head.querySelector<HTMLElement>(sel);
  const prima = el?.getAttribute(attr) ?? null;
  if (!el) {
    el = crea();
    document.head.appendChild(el);
  }
  el.setAttribute(attr, valore);
  const nodo = el;
  return () => (prima === null ? nodo.remove() : nodo.setAttribute(attr, prima));
}
const tag = (nome: string, attrs: Record<string, string>) => () => {
  const el = document.createElement(nome);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  return el;
};

/** "2026-10-15T20:30:00+02:00": ora di Roma con lo scarto giusto (ora legale compresa) */
function dataOra(data: string, ora?: string) {
  if (!ora) return data;
  try {
    const parti = new Intl.DateTimeFormat("en-US", { timeZone: "Europe/Rome", timeZoneName: "shortOffset" }).formatToParts(new Date(`${data}T12:00:00Z`));
    const m = parti.find((p) => p.type === "timeZoneName")?.value.match(/GMT([+-]\d+)/);
    const h = m ? Number(m[1]) : 1;
    return `${data}T${ora === "24:00" ? "23:59" : ora}:00${h >= 0 ? "+" : "-"}${String(Math.abs(h)).padStart(2, "0")}:00`;
  } catch {
    return `${data}T${ora}:00`;
  }
}

const breve = (s: string, n = 155) => {
  const t = s.replace(/\s+/g, " ").trim();
  return t.length > n ? `${t.slice(0, n - 1).replace(/\s+\S*$/, "")}…` : t;
};

export function useSeoEvento(e: Evento | null) {
  useEffect(() => {
    if (!e) return;
    const url = `${SITO}/eventi/${e.slug}`;
    const [a, m, g] = e.data.split("-");
    const titolo = `${e.titolo} · ${g}/${m}/${a} · FORO Piossasco`;
    const descrizione = breve(e.sottotitolo || e.descrizione || `${e.titolo} a ${e.luogo}, ${e.indirizzo}.`);
    const immagine = e.immagine ? new URL(e.immagine, SITO).href : `${SITO}/media/aula-gruppo.jpg`;
    const titoloPrima = document.title;
    document.title = titolo;
    const ripristina = [
      meta('meta[name="description"]', tag("meta", { name: "description" }), "content", descrizione),
      meta('link[rel="canonical"]', tag("link", { rel: "canonical" }), "href", url),
      meta('meta[property="og:url"]', tag("meta", { property: "og:url" }), "content", url),
      meta('meta[property="og:title"]', tag("meta", { property: "og:title" }), "content", titolo),
      meta('meta[property="og:description"]', tag("meta", { property: "og:description" }), "content", descrizione),
      meta('meta[property="og:image"]', tag("meta", { property: "og:image" }), "content", immagine),
    ];
    // dati strutturati "Event": Google può mostrare l'evento con data e luogo nei risultati
    const ld = document.createElement("script");
    ld.type = "application/ld+json";
    ld.dataset.seo = "evento";
    ld.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Event",
      name: e.titolo,
      description: breve(e.descrizione || e.sottotitolo || "", 500),
      startDate: dataOra(e.data, e.ora),
      ...(e.oraFine ? { endDate: dataOra(e.data, e.oraFine) } : {}),
      eventStatus: "https://schema.org/EventScheduled",
      eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
      image: [immagine],
      url,
      location: {
        "@type": "Place",
        name: e.luogo,
        address: { "@type": "PostalAddress", streetAddress: e.indirizzo, addressLocality: "Piossasco", addressRegion: "TO", addressCountry: "IT" },
      },
      organizer: { "@type": "Organization", name: "Associazione culturale FORO ETS", url: `${SITO}/` },
    });
    document.head.appendChild(ld);
    return () => {
      document.title = titoloPrima;
      ripristina.forEach((f) => f());
      ld.remove();
    };
  }, [e]);
}
