/**
 * Locandina di un evento costruita con la griglia a quattro moduli del manuale (cap. 06).
 * Se l'evento ha una locandina vera (e.immagine) mostra quella; altrimenti la grafica
 * nasce da colore, tipografia, cerchio e angolo. Niente immagini stock.
 * Scala con il contenitore (container query), quindi sta bene da 200 px a 800 px.
 */
import type { CSSProperties } from "react";
import { LogoMark } from "@/brand/Logo";
import { CATEGORIE } from "@/data/eventi";
import type { Evento } from "@/data/types";
import { dateParts, fmtShort } from "@/lib/time";
import { cx } from "@/components/ui";

export function EventArt({
  evento: e,
  ratio = "4 / 5",
  className,
  style,
  priority,
  noPoster,
}: {
  evento: Evento;
  /** forza la composizione grafica anche se c'è una locandina */
  noPoster?: boolean;
  ratio?: string;
  className?: string;
  style?: CSSProperties;
  priority?: boolean;
}) {
  const d = dateParts(e.data);
  const meta = `${fmtShort(e.data)} · ${e.ora} · AULA STUDIO`;
  const cat = e.etichetta ?? CATEGORIE[e.categoria].label;
  const comp = e.composizione;

  // locandina vera: intera (contain) su sfondo sfocato della stessa immagine, mai ritagliata
  if (e.immagine && !noPoster) {
    return (
      <div className={cx("event-art", "event-art--poster", className)} style={{ aspectRatio: ratio, ...style }}>
        <img className="ea-poster__bg" src={e.immagine} alt="" aria-hidden loading={priority ? "eager" : "lazy"} />
        <img className="ea-poster__img" src={e.immagine} alt={`Locandina: ${e.titolo}`} loading={priority ? "eager" : "lazy"} />
      </div>
    );
  }

  return (
    <div className={cx("event-art", `event-art--${comp}`, className)} style={{ aspectRatio: ratio, ...style }} aria-hidden>
      {comp === "post" && (
        <>
          <div className="ea-m ea-m--top surface-petrolio">
            <span className="ea-meta ea-meta--lanterna">{meta}</span>
            <span className="ea-title">{e.titolo}</span>
          </div>
          <div className="ea-m ea-m--bl surface-petrolio">
            <span className="ea-sub">{e.sottotitolo}</span>
          </div>
          <div className="ea-m ea-m--br surface-lanterna">
            <span className="ea-label">{e.registro === "voce" ? "Voce" : "Silenzio"}</span>
            <LogoMark color="var(--foro-notte)" height="42%" className="ea-logo" />
          </div>
        </>
      )}

      {comp === "locandina" && (
        <>
          <div className="ea-m ea-m--photo">
            {e.foto ? (
              <img src={e.foto} alt="" loading={priority ? "eager" : "lazy"} />
            ) : (
              <span className="ea-bignum">
                {d.day}
                <small>{d.monthLong}</small>
              </span>
            )}
            <span className="ea-veil" />
          </div>
          <div className="ea-m ea-m--paper surface-carta">
            <span className="ea-label ea-label--cotto">{cat}</span>
            <span className="ea-title ea-title--petrolio">{e.titolo}</span>
            <span className="ea-sub ea-sub--ink">{e.sottotitolo}</span>
            <span className="ea-foot">
              <span className="ea-meta ea-meta--ink">
                {fmtShort(e.data)} · {e.ora}
                <br />
                Aula studio, Piossasco
              </span>
              <LogoMark color="var(--foro-petrolio)" height="100%" className="ea-logo-sm" />
            </span>
          </div>
        </>
      )}

      {comp === "pieno" && (
        <div className="ea-m ea-m--full surface-lanterna">
          <span className="ea-corner" />
          <span className="ea-label">{cat}</span>
          <span className="ea-title ea-title--notte">{e.titolo}</span>
          <span className="ea-disc">
            <b>{d.day}</b>
            <small>{d.month}</small>
          </span>
          <span className="ea-meta ea-meta--notte ea-meta--bottom">
            {d.weekday} · {e.ora}
            {e.oraFine ? `–${e.oraFine}` : ""}
          </span>
          <LogoMark color="var(--foro-notte)" height="15%" className="ea-logo-corner" />
        </div>
      )}

      {comp === "ufficiale" && (
        <>
          <div className="ea-m ea-m--tl surface-carta">
            <span className="ea-label ea-label--petrolio">{cat}</span>
            <span className="ea-meta ea-meta--ink">
              {fmtShort(e.data)}
              <br />
              {e.ora}
            </span>
          </div>
          <div className="ea-m ea-m--tr">
            <span className="ea-disc ea-disc--petrolio">
              <b>{d.day}</b>
              <small>{d.month}</small>
            </span>
          </div>
          <div className="ea-m ea-m--bottom surface-carta">
            <span className="ea-title ea-title--petrolio">{e.titolo}</span>
            <LogoMark color="var(--foro-petrolio)" height="30%" className="ea-logo" />
          </div>
        </>
      )}
    </div>
  );
}
