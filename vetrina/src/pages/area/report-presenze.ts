/**
 * Report delle presenze in PDF (A4): uno o più mesi nello stesso file, livello ≤ 1 come in produzione.
 * Con più mesi la prima pagina è il riepilogo del periodo, poi ogni mese ha le sue pagine.
 * I dati vengono da api/presenze.js (presenze + storico del vecchio sito); il PDF si crea nel browser.
 * jsPDF e jspdf-autotable si caricano solo al clic, così non pesano sull'area volontari.
 * I font standard del PDF coprono solo il Latin-1: lettere accentate sì, trattini lunghi ed emoji no (vedi `safe`).
 */
import { GIORNI_BREVI, MESI, capitalize, romeNow, todayIso } from "@/lib/time";
import {
  FASCE_P,
  PRIMO_MESE,
  caricaPresenze,
  giorniDelMese,
  pkey,
  presenzeStore,
  spostaMese,
  statisticheMese,
  type RegPresenza,
} from "./data-gestione";

export interface RigaReport {
  iso: string;
  /** "Lun 5" */
  giorno: string;
  weekend: boolean;
  /** un valore per fascia, null se non registrato */
  valori: (number | null)[];
  tot: number | null;
  note: string;
}
export interface DatiReport {
  ym: string;
  nomeMese: string;
  righe: RigaReport[];
  fasce: { nome: string; label: string; somma: number; giorni: number }[];
  totale: number;
  giorniAperti: number;
  media: number;
  max: { n: number; quando: string };
  record: { tot: number; quando: string } | null;
  autore?: string;
}

export const nomeDelMese = (ym: string) => `${capitalize(MESI[Number(ym.slice(5, 7)) - 1])} ${ym.slice(0, 4)}`;
const giornoBreve = (iso: string) => `${Number(iso.slice(8))} ${MESI[Number(iso.slice(5, 7)) - 1].slice(0, 3)}`;

/** i dati di un mese pronti per il report */
export function datiMese(ym: string, reg: Record<string, RegPresenza>, autore?: string): DatiReport {
  const st = statisticheMese(ym, reg);
  return {
    ym,
    nomeMese: nomeDelMese(ym),
    righe: st.righe
      .filter((r) => r.tot !== null)
      .map((r) => ({
        iso: r.iso,
        giorno: `${capitalize(GIORNI_BREVI[r.wd].toLowerCase())} ${Number(r.iso.slice(8))}`,
        weekend: r.wd >= 5,
        valori: FASCE_P.map((f) => reg[pkey(r.iso, f.key)]?.numero ?? null),
        tot: r.tot,
        note: FASCE_P.map((f) => reg[pkey(r.iso, f.key)]?.note).filter(Boolean).join(" / "),
      })),
    fasce: st.perFascia.map((f) => ({ nome: f.nome, label: f.label, somma: f.somma, giorni: f.giorni })),
    totale: st.totale,
    giorniAperti: st.giorniAperti,
    media: st.media,
    max: { n: st.max.n, quando: st.max.n ? `${giornoBreve(st.max.iso)}, fascia ${st.max.f}` : "" },
    record: st.record ? { tot: st.record.tot, quando: giornoBreve(st.record.iso) } : null,
    autore,
  };
}

/** tutto lo storico, dall'apertura dell'aula a oggi, in una chiamata: serve a sapere quali mesi hanno dati */
export function caricaStorico(oggi = todayIso()) {
  return caricaPresenze(`${PRIMO_MESE}-01`, oggi);
}

/** riprende dal server i mesi scelti (in una chiamata sola) e prepara i loro dati, dal più vecchio */
export async function datiReport(mesi: string[], autore?: string): Promise<DatiReport[]> {
  const ordinati = [...mesi].sort();
  if (!ordinati.length) return [];
  const fine = giorniDelMese(ordinati[ordinati.length - 1]);
  await caricaPresenze(`${ordinati[0]}-01`, fine[fine.length - 1], true);
  const reg = presenzeStore.get();
  return ordinati.map((m) => datiMese(m, reg, autore));
}

type RGB = [number, number, number];
const C = {
  notte: [7, 48, 61],
  petrolio: [12, 73, 91],
  lanterna: [233, 162, 59],
  carta: [251, 231, 204],
  travertino: [246, 240, 230],
  travertinoDeep: [238, 230, 216],
  pietra: [221, 213, 199],
  ardesia: [85, 101, 108],
  inchiostro: [15, 31, 37],
  bianco: [255, 253, 249],
} satisfies Record<string, RGB>;

/** testo sicuro per i font standard del PDF (Latin-1) */
const safe = (s: string) =>
  s
    .replace(/[–—]/g, "-")
    .replace(/[‘’]/g, "'")
    .replace(/[“”«»]/g, '"')
    .replace(/[^\x00-\xFF]/g, "");
const it = (n: number) => n.toLocaleString("it-IT");
const dec = (n: number) => n.toFixed(1).replace(".", ",");
const pad = (n: number) => String(n).padStart(2, "0");
/** colore della cella come a schermo: petrolio sempre più pieno su fondo carta */
const mix = (a: RGB, b: RGB, t: number): RGB => [0, 1, 2].map((i) => Math.round(a[i] + (b[i] - a[i]) * t)) as RGB;

export async function scaricaReportPresenze(mesi: DatiReport[]) {
  if (!mesi.length) return;
  const ordinati = [...mesi].sort((a, b) => a.ym.localeCompare(b.ym));
  const primo = ordinati[0];
  const ultimo = ordinati[ordinati.length - 1];
  // mesi consecutivi: "Luglio 2026 – Settembre 2026"; con dei buchi si dice quanti sono, per non far pensare a tutto il periodo
  const consecutivi = ordinati.every((d, i) => i === 0 || d.ym === spostaMese(ordinati[i - 1].ym, 1));
  const periodo =
    ordinati.length === 1
      ? primo.nomeMese
      : consecutivi
        ? `${primo.nomeMese} – ${ultimo.nomeMese}`
        : `${ordinati.length} mesi, da ${primo.nomeMese} a ${ultimo.nomeMese}`;
  const autore = primo.autore;
  const [{ jsPDF }, { autoTable }] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 16;
  const fill = (c: RGB) => doc.setFillColor(c[0], c[1], c[2]);
  const ink = (c: RGB) => doc.setTextColor(c[0], c[1], c[2]);
  const font = (size: number, style: "normal" | "bold" = "normal") => {
    doc.setFont("helvetica", style);
    doc.setFontSize(size);
  };
  /** maiuscoletto spaziato; se non entra in `max` mm, stringe la spaziatura */
  const etichetta = (s: string, x: number, y: number, max = Infinity) => {
    const t = s.toUpperCase();
    const sp = doc.getTextWidth(t) + 0.45 * t.length <= max ? 0.45 : Math.max(0, (max - doc.getTextWidth(t)) / t.length);
    doc.setCharSpace(sp);
    doc.text(t, x, y);
    doc.setCharSpace(0);
  };

  /* testata Notte con filo Lanterna */
  const testata = (destra: string, titolo = "Presenze in aula") => {
    fill(C.notte);
    doc.rect(0, 0, W, 32, "F");
    fill(C.lanterna);
    doc.rect(0, 32, W, 1.2, "F");
    ink(C.carta);
    font(7.5, "bold");
    etichetta("Associazione FORO ETS · Aula studio di Piossasco", M, 12);
    ink([255, 255, 255]);
    font(22);
    doc.text(titolo, M, 24);
    ink(C.lanterna);
    font(destra.length > 22 ? 11 : 14);
    doc.text(safe(destra), W - M, 24, { align: "right" });
    const now = romeNow();
    ink(C.ardesia);
    font(8);
    doc.text(
      safe(`Report generato il ${now.day} ${MESI[now.month - 1]} ${now.year} alle ${pad(now.hour)}:${pad(now.minute)}${autore ? `, da ${autore}` : ""}.`),
      M,
      41,
    );
  };

  /* quattro numeri chiave in riquadri */
  const numeri = (kpi: { label: string; value: string; hint: string }[], y: number) => {
    const gap = 4;
    const bw = (W - 2 * M - gap * 3) / 4;
    const bh = 25;
    kpi.forEach((k, i) => {
      const x = M + i * (bw + gap);
      const pieno = i === 0;
      fill(pieno ? C.petrolio : C.travertino);
      doc.rect(x, y, bw, bh, "F");
      if (!pieno) {
        fill(C.petrolio);
        doc.rect(x, y, 0.9, bh, "F");
      }
      ink(pieno ? C.carta : C.ardesia);
      font(6.2, "bold");
      etichetta(k.label, x + 4, y + 6.5, bw - 7);
      ink(pieno ? [255, 255, 255] : C.petrolio);
      font(17);
      doc.text(safe(k.value), x + 4, y + 15.5);
      ink(pieno ? C.carta : C.ardesia);
      font(7);
      doc.text(safe(k.hint), x + 4, y + 21, { maxWidth: bw - 6 });
    });
    return y + bh;
  };

  /* barre per fascia */
  const perFascia = (fasce: DatiReport["fasce"], y: number) => {
    ink(C.petrolio);
    font(10, "bold");
    doc.text("Per fascia", M, y);
    y += 4;
    const maxF = Math.max(1, ...fasce.map((f) => f.somma));
    const bx = M + 46;
    const bwid = W - 2 * M - 46 - 50;
    for (const f of fasce) {
      ink(C.inchiostro);
      font(9, "bold");
      doc.text(safe(f.nome), M, y + 3.6);
      ink(C.ardesia);
      font(8);
      doc.text(safe(f.label), M + 25, y + 3.6);
      fill(C.travertinoDeep);
      doc.rect(bx, y + 1, bwid, 3.4, "F");
      if (f.somma > 0) {
        fill(C.petrolio);
        doc.rect(bx, y + 1, (bwid * f.somma) / maxF, 3.4, "F");
      }
      ink(C.petrolio);
      font(9, "bold");
      doc.text(it(f.somma), bx + bwid + 4, y + 3.8);
      ink(C.ardesia);
      font(7.5);
      doc.text(f.giorni ? `${dec(f.somma / f.giorni)} a fascia` : "nessun dato", W - M, y + 3.8, { align: "right" });
      y += 7;
    }
    return y;
  };

  /* riepilogo del periodo (solo con più mesi) */
  const riepilogo = () => {
    testata(periodo);
    const totale = ordinati.reduce((a, d) => a + d.totale, 0);
    const giorni = ordinati.reduce((a, d) => a + d.giorniAperti, 0);
    const top = ordinati.reduce((b, d) => (d.totale > b.totale ? d : b), ordinati[0]);
    let y = numeri(
      [
        { label: "Totale del periodo", value: it(totale), hint: `${ordinati.length} mesi` },
        { label: "Giorni con dati", value: it(giorni), hint: "giorni di apertura registrati" },
        { label: "Media giornaliera", value: giorni ? dec(totale / giorni) : "-", hint: "persone per giorno aperto" },
        { label: "Mese più frequentato", value: top.totale ? top.nomeMese.split(" ")[0] : "-", hint: top.totale ? `${it(top.totale)} persone` : "nessuna registrazione" },
      ],
      46,
    );
    y += 11;
    const somme = FASCE_P.map((f, i) => ({
      nome: f.nome,
      label: f.label,
      somma: ordinati.reduce((a, d) => a + (d.fasce[i]?.somma ?? 0), 0),
      giorni: ordinati.reduce((a, d) => a + (d.fasce[i]?.giorni ?? 0), 0),
    }));
    y = perFascia(somme, y) + 7;
    ink(C.petrolio);
    font(10, "bold");
    doc.text("Mese per mese", M, y);
    const maxTot = Math.max(1, ...ordinati.map((d) => d.totale));
    autoTable(doc, {
      startY: y + 3,
      margin: { left: M, right: M, top: 18, bottom: 20 },
      head: [["Mese", "Giorni", "Totale", "Media", "Massimo", ...FASCE_P.map((f) => safe(f.nome))]],
      body: ordinati.map((d) => [
        safe(d.nomeMese),
        String(d.giorniAperti),
        it(d.totale),
        d.media ? dec(d.media) : "-",
        d.max.n ? String(d.max.n) : "-",
        ...d.fasce.map((f) => it(f.somma)),
      ]),
      theme: "plain",
      styles: { font: "helvetica", fontSize: 8.5, cellPadding: { top: 2.2, bottom: 2.2, left: 2.5, right: 2.5 }, textColor: C.inchiostro, lineColor: C.pietra, lineWidth: { bottom: 0.15 }, valign: "middle", halign: "center" },
      headStyles: { fillColor: C.petrolio, textColor: C.carta, fontStyle: "bold", fontSize: 7.5 },
      columnStyles: { 0: { halign: "left", fontStyle: "bold", textColor: C.petrolio, cellWidth: 34 }, 2: { fontStyle: "bold", textColor: C.petrolio } },
      didParseCell: (h) => {
        if (h.section === "head") {
          if (h.column.index === 0) h.cell.styles.halign = "left";
          return;
        }
        if (h.column.index === 2) {
          const ratio = ordinati[h.row.index].totale / maxTot;
          h.cell.styles.fillColor = mix(C.bianco, C.petrolio, 0.1 + ratio * 0.9);
          if (ratio > 0.5) h.cell.styles.textColor = C.carta;
        }
      },
    });
    const fine = ((doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y) + 8;
    ink(C.ardesia);
    font(8);
    doc.text("Nelle pagine seguenti, ogni mese giorno per giorno.", M, Math.min(fine, H - 24));
  };

  /* un mese: numeri chiave, fasce, giorno per giorno */
  const disegnaMese = (d: DatiReport) => {
    testata(d.nomeMese);
    let y = numeri(
      [
        { label: "Totale del mese", value: it(d.totale), hint: `${d.giorniAperti} ${d.giorniAperti === 1 ? "giorno" : "giorni"} con dati` },
        { label: "Media giornaliera", value: d.media ? dec(d.media) : "-", hint: "persone per giorno aperto" },
        { label: "Massimo contemporaneo", value: d.max.n ? String(d.max.n) : "-", hint: d.max.n ? d.max.quando : "nessuna registrazione" },
        { label: "Giorno record", value: d.record ? d.record.quando : "-", hint: d.record ? `${d.record.tot} persone in totale` : "nessuna registrazione" },
      ],
      46,
    );

    y = perFascia(d.fasce, y + 11);

  /* giorno per giorno */
  y += 7;
  ink(C.petrolio);
  font(10, "bold");
  doc.text("Giorno per giorno", M, y);
  let fine = y + 6;
  if (d.righe.length === 0) {
    ink(C.ardesia);
    font(9);
    doc.text("Nessuna presenza registrata in questo mese.", M, y + 8);
    fine = y + 12;
  } else {
    const maxCella = Math.max(1, d.max.n);
    const nf = d.fasce.length;
    autoTable(doc, {
      startY: y + 3,
      margin: { left: M, right: M, top: 18, bottom: 20 },
      head: [["Giorno", ...d.fasce.map((f) => safe(f.label)), "Totale", "Note"]],
      body: d.righe.map((r) => [r.giorno, ...r.valori.map((v) => (v == null ? "" : String(v))), r.tot == null ? "" : String(r.tot), safe(r.note)]),
      theme: "plain",
      styles: {
        font: "helvetica",
        fontSize: 8.5,
        cellPadding: { top: 2, bottom: 2, left: 2.5, right: 2.5 },
        textColor: C.inchiostro,
        lineColor: C.pietra,
        lineWidth: { bottom: 0.15 },
        valign: "middle",
      },
      headStyles: { fillColor: C.petrolio, textColor: C.carta, fontStyle: "bold", fontSize: 7.5, halign: "center" },
      columnStyles: {
        0: { cellWidth: 20, fontStyle: "bold", textColor: C.petrolio },
        ...Object.fromEntries(d.fasce.map((_, i) => [i + 1, { cellWidth: 17, halign: "center" as const }])),
        [nf + 1]: { cellWidth: 18, halign: "center", fontStyle: "bold", textColor: C.petrolio },
        [nf + 2]: { textColor: C.ardesia, fontSize: 7.5 },
      },
      didParseCell: (h) => {
        const col = h.column.index;
        if (h.section === "head") {
          if (col === 0 || col === nf + 2) h.cell.styles.halign = "left";
          return;
        }
        const r = d.righe[h.row.index];
        if (r.weekend) h.cell.styles.fillColor = C.travertino;
        if (col >= 1 && col <= nf) {
          const v = r.valori[col - 1];
          if (v != null) {
            const ratio = v / maxCella;
            h.cell.styles.fillColor = mix(C.bianco, C.petrolio, 0.1 + ratio * 0.9);
            if (ratio > 0.5) h.cell.styles.textColor = C.carta;
          }
        }
        if (col === nf + 1) h.cell.styles.fillColor = r.weekend ? C.travertinoDeep : C.travertino;
      },
    });
    fine = ((doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y) + 8;
  }

  /* come si conta */
  if (fine + 18 > H - 20) {
    doc.addPage();
    fine = 20;
  }
  fill(C.travertino);
  doc.rect(M, fine, W - 2 * M, 16, "F");
  fill(C.petrolio);
  doc.rect(M, fine, 0.9, 16, "F");
  ink(C.petrolio);
  font(8, "bold");
  doc.text("Come si conta", M + 4, fine + 5.5);
  ink(C.ardesia);
  font(7.5);
  doc.text(
    "Il totale del giorno è la mattina, più la fascia più piena tra pranzo e pomeriggio, più la sera: [9-13] + max([13-16], [16-19]) + [21-24]. Chi resta tutto il pomeriggio si conta una volta sola.",
    M + 4,
    fine + 10.5,
    { maxWidth: W - 2 * M - 8 },
  );

  };

  if (ordinati.length > 1) riepilogo();
  ordinati.forEach((d, i) => {
    if (i > 0 || ordinati.length > 1) doc.addPage();
    disegnaMese(d);
  });

  /* piè di pagina */
  const pagine = doc.getNumberOfPages();
  for (let i = 1; i <= pagine; i++) {
    doc.setPage(i);
    doc.setDrawColor(C.pietra[0], C.pietra[1], C.pietra[2]);
    doc.setLineWidth(0.2);
    doc.line(M, H - 14, W - M, H - 14);
    ink(C.ardesia);
    font(7.5);
    doc.text(safe(`FORO · Presenze in aula · ${periodo}`), M, H - 9);
    doc.text(`Pagina ${i} di ${pagine}`, W - M, H - 9, { align: "right" });
  }

  doc.save(ordinati.length === 1 ? `presenze-foro-${primo.ym}.pdf` : `presenze-foro-${primo.ym}_${ultimo.ym}.pdf`);
}
