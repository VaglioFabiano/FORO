/**
 * Drawer di dettaglio e prenotazione evento (aperto da /eventi/:slug, montato da HomePage).
 * Locandina, dati essenziali, descrizione, indizi del CineFORO e il modulo di prenotazione
 * con i suoi stati (aperto, al completo, concluso, prenotazione confermata).
 */
import { useCallback, useEffect, useState } from "react";
import { Button, Icon, Modal, cx } from "@/components/ui";
import { toast } from "@/components/ui/Toast";
import { EventArt } from "@/components/domain/EventArt";
import { Seats } from "@/components/domain/EventCard";
import { SectionLink } from "@/components/layout/sections";
import { CATEGORIE } from "@/data/eventi";
import type { Evento } from "@/data/types";
import { conPrenotazione, eventoBySlug, isPassato, postiPrenotati, useEventi } from "@/lib/api";
import { capitalize, fmtDuration, fmtLong, fmtRange, toMin } from "@/lib/time";
import { Prenotazione } from "./PrenotaForm";
import { TitoloEvento } from "./TitoloEvento";
import { mapsLink, quando, useTestiEventi } from "./testi";
import { useSeoEvento } from "@/lib/seo";
import "./prenota.css";

export default function PrenotaDrawer({ slug, onClose }: { slug: string; onClose: () => void }) {
  const eventi = useEventi();
  const e = eventoBySlug(eventi, slug);
  useSeoEvento(e);
  const [open, setOpen] = useState(true);
  // chiude con l'animazione, poi avvisa la home (che torna a "/")
  const close = useCallback(() => {
    setOpen(false);
    window.setTimeout(onClose, 420);
  }, [onClose]);

  useEffect(() => {
    const t = window.setTimeout(() => document.querySelector<HTMLButtonElement>(".modal--right .modal__close")?.focus(), 80);
    return () => window.clearTimeout(t);
  }, [slug]);

  return (
    <Modal open={open} onClose={close} side="right" width={760}>
      {e ? <Dettaglio key={e.slug} evento={e} /> : <NonTrovato onClose={close} />}
    </Modal>
  );
}

/* ───────── evento ───────── */
function Dettaglio({ evento: e }: { evento: Evento }) {
  const { t, f } = useTestiEventi();
  const past = isPassato(e);
  const [copied, setCopied] = useState(false);
  const cat = e.etichetta ?? CATEGORIE[e.categoria].label;
  const ingressoInfo = e.info?.find((i) => i.label === "Ingresso");
  const altreInfo = (e.info ?? []).filter((i) => i.label !== "Ingresso");
  // eventi vecchi: l'ora può mancare (orario non leggibile), e allora niente durata
  const durata = e.ora && e.oraFine ? fmtDuration(toMin(e.oraFine) - toMin(e.ora)) : null;
  const linkEsterno = e.linkEsterno ? (/^https?:\/\//i.test(e.linkEsterno) ? e.linkEsterno : `https://${e.linkEsterno}`) : null;
  const paragrafi = e.descrizione.split(/\n\s*\n/).filter(Boolean);
  const ind = e.indizi;
  const indizi = ind
    ? ([
        ["Regia", ind.regia],
        ["Cast", ind.cast],
        ["Genere", ind.genere],
        ["Età consigliata", ind.eta],
      ].filter(([, v]) => v) as [string, string][])
    : [];

  async function copia() {
    const url = `${window.location.origin}/eventi/${e.slug}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast("Incollalo dove vuoi per invitare qualcuno.", "ok", "Link copiato");
      window.setTimeout(() => setCopied(false), 2400);
    } catch {
      toast("Non siamo riusciti a copiare il link. Copialo dalla barra dell'indirizzo.", "errore");
    }
  }

  return (
    <article className="pd" aria-labelledby="pd-title">
      <header className={cx("pd-hero", e.immagine && "pd-hero--poster")}>
        <div className="pd-hero__art">
          <EventArt evento={e} ratio={e.immagine ? "5 / 4" : "1 / 1"} priority />
        </div>
        <div className="pd-hero__text">
          <div className="pd-hero__tags">
            <span className="tag tag--cotto">{cat}</span>
            {past && <span className="tag">{t("pd.concluso")}</span>}
            {e.rassegna && <span className="t-mono t-muted pd-hero__rassegna">{e.rassegna}</span>}
          </div>
          <h2 className="pd-title t-balance" id="pd-title">
            <TitoloEvento titolo={e.titolo} after={<span className="corner-mark" aria-hidden />} />
          </h2>
          {e.sottotitolo && <p className="pd-sub t-pretty">{e.sottotitolo}</p>}
        </div>
      </header>

      {/* quattro moduli: quando, a che ora, dove, ingresso */}
      <dl className="pd-facts">
        <div className="pd-fact">
          <dt className="t-label">{t("pd.quando")}</dt>
          <dd>
            <span className="pd-fact__v">{capitalize(fmtLong(e.data, true))}</span>
            <span className="t-mono t-muted">{past ? t("pd.passato") : quando(e.data)}</span>
          </dd>
        </div>
        <div className="pd-fact">
          <dt className="t-label">{t("pd.orario")}</dt>
          <dd>
            <span className="pd-fact__v t-mono pd-fact__mono">{!e.ora ? "—" : e.oraFine ? fmtRange(e.ora, e.oraFine) : e.ora}</span>
            {durata && <span className="t-mono t-muted">{f("pd.durata", { durata })}</span>}
          </dd>
        </div>
        <div className="pd-fact">
          <dt className="t-label">{t("pd.dove")}</dt>
          <dd>
            <span className="pd-fact__v">{e.luogo}</span>
            {e.indirizzo && (
              <>
                <span className="t-mono t-muted">{e.indirizzo}</span>
                <a className="pd-maps" href={mapsLink(e.indirizzo)} target="_blank" rel="noreferrer">
                  {t("indicazioni")} <Icon name="arrow-up-right" size={14} />
                </a>
              </>
            )}
          </dd>
        </div>
        <div className="pd-fact">
          <dt className="t-label">{t("pd.ingresso")}</dt>
          <dd>
            <span className="pd-fact__v">{e.soloTesserati ? t("pd.ingresso.soci") : t("pd.ingresso.aperto")}</span>
            <span className="t-mono t-muted">
              {!conPrenotazione(e) ? t("pd.senzaPrenotazione") : e.postiMax ? f("pd.posti", { n: e.postiMax }) : t("pd.senzaLimite")}
            </span>
          </dd>
        </div>
      </dl>

      {e.soloTesserati && !past && (
        <div className="pd-note">
          <Icon name="soci" size={20} />
          <p>
            {t("pd.nota.soci")}
          </p>
        </div>
      )}

      <div className="pd-status">
        <div className="pd-status__seats">
          {past ? (
            conPrenotazione(e) && <p className="t-mono pd-status__past">{f("pd.partecipato", { n: postiPrenotati(e) })}</p>
          ) : (
            <Seats evento={e} aperto={{ etichetta: t("aperto.etichetta"), nota: t("aperto.testo") }} />
          )}
        </div>
        {linkEsterno && (
          <a className="btn btn--outline btn--sm pd-copy" href={linkEsterno} target="_blank" rel="noreferrer">
            <Icon name="arrow-up-right" size={16} />
            {t("pd.link")}
          </a>
        )}
        <button type="button" className={cx("btn btn--outline btn--sm pd-copy", copied && "is-done")} onClick={copia}>
          <Icon name={copied ? "check" : "copy"} size={16} />
          {copied ? t("pd.copiato") : t("pd.copia")}
        </button>
      </div>

      <div className="pd-prose">
        {paragrafi.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>

      {indizi.length > 0 && (
        <section className="pd-indizi surface-notte" aria-labelledby="pd-indizi-t">
          <div className="pd-indizi__head">
            <h3 className="t-label" id="pd-indizi-t">
              {t("pd.indizi.titolo")}
            </h3>
            <span className="t-mono pd-indizi__hint">{t("pd.indizi.hint")}</span>
          </div>
          <dl className="pd-indizi__list">
            {indizi.map(([k, v]) => (
              <div key={k} className="pd-indizi__row">
                <dt className="t-mono">{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      {(altreInfo.length > 0 || (ingressoInfo && !e.soloTesserati) || e.patrocinio) && (
        <dl className="pd-info">
          {ingressoInfo && !e.soloTesserati && (
            <div className="pd-info__row">
              <dt className="t-label">{t("pd.ingresso")}</dt>
              <dd>{ingressoInfo.value}</dd>
            </div>
          )}
          {altreInfo.map((i) => (
            <div key={i.label} className="pd-info__row">
              <dt className="t-label">{i.label}</dt>
              <dd>{i.value}</dd>
            </div>
          ))}
          {e.patrocinio && (
            <div className="pd-info__row">
              <dt className="t-label">{t("pd.patrocinio")}</dt>
              <dd>{e.patrocinio}</dd>
            </div>
          )}
        </dl>
      )}

      <Prenotazione evento={e} />
    </article>
  );
}

/* ───────── slug inesistente ───────── */
function NonTrovato({ onClose }: { onClose: () => void }) {
  const { t } = useTestiEventi();
  return (
    <div className="pd pd-404">
      <span className="disc pd-404__disc" aria-hidden>
        <Icon name="search" size={28} />
      </span>
      <span className="t-label t-cotto">{t("pd.404.label")}</span>
      <h2 className="pd-title t-balance">{t("pd.404.titolo")}</h2>
      <p className="pd-sub t-pretty">{t("pd.404.testo")}</p>
      <div className="pd-actions">
        <SectionLink to="eventi" className="btn">
          {t("pd.404.cta")} <Icon name="arrow-right" size={18} className="btn-arrow" />
        </SectionLink>
        <Button variant="outline" onClick={onClose}>
          {t("pd.chiudi")}
        </Button>
      </div>
    </div>
  );
}
