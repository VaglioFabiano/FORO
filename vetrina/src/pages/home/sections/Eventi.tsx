/**
 * Eventi (#eventi). Registro Voce.
 * Filtro per categoria (configurabile dalla dashboard), evento in evidenza (il prossimo) con la
 * sua locandina, le date successive (tre, poi si espandono) e l'archivio per rassegna.
 * Le card aprono /eventi/:slug: la home con il drawer di prenotazione.
 * Tutte le frasi vengono dal catalogo CMS src/data/testi/eventi.ts.
 */
import { useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
import { ButtonLink, Icon, Reveal, SectionHead, Segmented, cx } from "@/components/ui";
import { LogoMark } from "@/brand/Logo";
import { EventArt } from "@/components/domain/EventArt";
import { EventBadge, Seats } from "@/components/domain/EventCard";
import { CATEGORIE } from "@/data/eventi";
import type { Evento } from "@/data/types";
import { calendarLink, eventiFuturi, eventiPassati, eventoInEvidenza, useEventi, conPrenotazione } from "@/lib/api";
import { useCategorie } from "@/lib/categorie";
import { MESI_BREVI, dateParts, fmtRange, fmtShort, isoToDate } from "@/lib/time";
import { TitoloEvento } from "../prenota/TitoloEvento";
import { mapsLink, quando, useTestiEventi } from "../prenota/testi";
import "./eventi.css";
import { useLink } from "@/lib/link";

const EASE = [0.22, 1, 0.36, 1] as const;
/** quante date successive si vedono prima di "Mostra tutte le date" */
const LIMITE = 3;

/* ───────── evento in evidenza ───────── */
/** "20:30–22:30"; "" se l'ora manca (eventi vecchi con un orario non leggibile) */
const orarioDi = (e: Evento) => (!e.ora ? "" : e.oraFine ? fmtRange(e.ora, e.oraFine) : e.ora);

function InEvidenza({ evento: e }: { evento: Evento }) {
  const { t } = useTestiEventi();
  const orario = orarioDi(e) || "—";
  return (
    <motion.article
      key={e.slug}
      className={cx("ev-feat", e.immagine && "ev-feat--poster")}
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.6, ease: EASE }}
      aria-labelledby={`ev-feat-${e.slug}`}
    >
      <Link to={`/eventi/${e.slug}`} className="ev-feat__art" tabIndex={-1} aria-hidden>
        <span className="ev-feat__badge">
          <EventBadge evento={e} />
        </span>
        <EventArt evento={e} ratio="1 / 1" priority />
      </Link>

      <div className="ev-feat__panel surface-carta">
        <div className="ev-feat__top">
          <span className="tag tag--cotto">{e.etichetta ?? CATEGORIE[e.categoria].label}</span>
          <span className="t-mono ev-feat__next">
            <span className="ev-feat__pulse" aria-hidden /> {t.ed("feat.prossimo")} · {quando(e.data)}
          </span>
        </div>

        <div className="ev-feat__text">
          <h3 className="ev-feat__title t-balance" id={`ev-feat-${e.slug}`}>
            <TitoloEvento titolo={e.titolo} />
          </h3>
          {e.sottotitolo && <p className="ev-feat__sub t-pretty">{e.sottotitolo}</p>}
        </div>

        <dl className="ev-feat__facts">
          <div>
            <dt className="t-label">{t.ed("feat.quando")}</dt>
            <dd className="t-mono">{fmtShort(e.data)}</dd>
          </div>
          <div>
            <dt className="t-label">{t.ed("feat.orario")}</dt>
            <dd className="t-mono">{orario}</dd>
          </div>
          <div>
            <dt className="t-label">{t.ed("feat.dove")}</dt>
            <dd>
              {e.luogo}
              {e.indirizzo && (
                <a className="ev-place" href={mapsLink(e.indirizzo)} target="_blank" rel="noreferrer">
                  <span>{e.indirizzo}</span>
                  <span className="ev-place__go">
                    {t.ed("indicazioni")} <Icon name="arrow-up-right" size={14} />
                  </span>
                </a>
              )}
              {e.soloTesserati && <span className="ev-feat__soci">{t.ed("feat.soci")}</span>}
            </dd>
          </div>
        </dl>

        <div className="ev-feat__foot">
          <Seats evento={e} aperto={{ etichetta: t.ed("aperto.etichetta"), nota: t.ed("aperto.testo") }} />
          <div className="ev-feat__ctas">
            <ButtonLink to={`/eventi/${e.slug}`} size="lg" arrow>
              {conPrenotazione(e) ? t.ed("feat.cta") : t.ed("feat.ctaAperto")}
            </ButtonLink>
            {e.ora && (
              <a className="btn btn--ghost ev-feat__cal" href={calendarLink(e)} target="_blank" rel="noreferrer">
                <Icon name="calendar" size={18} />
                {t.ed("feat.calendario")}
              </a>
            )}
          </div>
        </div>
      </div>
    </motion.article>
  );
}

/* ───────── agenda: le date successive, una riga ciascuna ───────── */
function RigaAgenda({ evento: e }: { evento: Evento }) {
  const { t } = useTestiEventi();
  const d = dateParts(e.data);
  const orario = orarioDi(e);
  return (
    <Link to={`/eventi/${e.slug}`} className="ev-row">
      <span className="ev-row__date" aria-hidden>
        <span className="ev-row__day">{d.day}</span>
        <span className="ev-row__dm">
          <span className="ev-row__month">{d.month}</span>
          <span className="t-mono">{d.weekday}</span>
        </span>
      </span>
      <span className="ev-row__thumb" aria-hidden>
        {e.immagine ? (
          <EventArt evento={e} ratio="1 / 1" />
        ) : (
          <span className={cx("ev-row__mini", e.registro === "voce" ? "surface-lanterna" : "surface-notte")}>
            <LogoMark color={e.registro === "voce" ? "var(--foro-notte)" : "var(--foro-carta)"} height={32} />
          </span>
        )}
      </span>
      <span className="ev-row__main">
        <span className="ev-row__meta">
          <span className="tag tag--cotto">{e.etichetta ?? CATEGORIE[e.categoria].label}</span>
          <span className="t-mono t-muted">
            <span className="sr-only">
              {d.weekdayLong} {Number(d.day)} {d.monthLong},{" "}
            </span>
            {orario ? `${orario} · ` : ""}
            {quando(e.data)}
          </span>
        </span>
        <span className="ev-row__title">{e.titolo.replace(" · ", "\u00a0·\u00a0")}</span>
        {e.sottotitolo && <span className="ev-row__sub">{e.sottotitolo}</span>}
        <span className="ev-row__place">
          <Icon name="pin" size={14} />
          <span>
            {e.luogo}
            {e.indirizzo && <span className="t-muted"> · {e.indirizzo}</span>}
          </span>
        </span>
      </span>
      <span className="ev-row__side">
        <EventBadge evento={e} />
        <Seats evento={e} compact aperto={{ etichetta: t.ed("aperto.etichetta"), nota: t.ed("aperto.testo") }} />
      </span>
      <span className="ev-row__go" aria-hidden>
        <Icon name="arrow-right" size={18} />
      </span>
    </Link>
  );
}

const rowAnim = (i: number) => ({
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.55, delay: i * 0.05, ease: EASE } },
  exit: { opacity: 0, transition: { duration: 0.2 } },
});

/* ───────── archivio ───────── */
function periodo(list: Evento[]) {
  const dates = list.map((e) => e.data).sort();
  const a = isoToDate(dates[0]);
  const b = isoToDate(dates[dates.length - 1]);
  const ma = MESI_BREVI[a.getUTCMonth()];
  const mb = MESI_BREVI[b.getUTCMonth()];
  return ma === mb ? `${ma} ${b.getUTCFullYear()}` : `${ma}–${mb} ${b.getUTCFullYear()}`;
}

function ArchivioRiga({ titolo, eventi }: { titolo: string; eventi: Evento[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const scroll = (dir: 1 | -1) => ref.current?.scrollBy({ left: dir * ref.current.clientWidth * 0.8, behavior: "smooth" });
  return (
    <div className="ev-arch__group">
      <div className="ev-arch__head">
        <h4 className="ev-arch__name">{titolo}</h4>
        <span className="t-mono t-muted">
          {eventi.length} {eventi.length === 1 ? "evento" : "eventi"} · {periodo(eventi)}
        </span>
        {eventi.length > 2 && (
          <span className="ev-arch__nav">
            <button type="button" className="ev-arch__btn" onClick={() => scroll(-1)} aria-label={`Scorri ${titolo} indietro`}>
              <Icon name="arrow-left" size={18} />
            </button>
            <button type="button" className="ev-arch__btn" onClick={() => scroll(1)} aria-label={`Scorri ${titolo} avanti`}>
              <Icon name="arrow-right" size={18} />
            </button>
          </span>
        )}
      </div>
      <div className="ev-arch__row" ref={ref}>
        {eventi.map((e) => (
          <Link key={e.slug} to={`/eventi/${e.slug}`} className="ev-arch__item">
            <span className="ev-arch__media">
              {e.foto ? <img src={e.foto} alt="" loading="lazy" /> : <EventArt evento={e} ratio="1 / 1" />}
            </span>
            <span className="t-mono t-muted">
              {fmtShort(e.data)}
              {e.ora && ` · ${e.ora}`}
            </span>
            <span className="ev-arch__title">{e.titolo}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

function Archivio({ eventi }: { eventi: Evento[] }) {
  const { t, f } = useTestiEventi();
  const [open, setOpen] = useState(false);
  const gruppi = useMemo(() => {
    const m = new Map<string, Evento[]>();
    for (const e of eventi) {
      const k = e.rassegna ?? `${CATEGORIE[e.categoria].plurale} ${e.data.slice(0, 4)}`;
      m.set(k, [...(m.get(k) ?? []), e]);
    }
    return [...m.entries()];
  }, [eventi]);
  if (!eventi.length) return null;
  return (
    <div className="ev-arch">
      <div className="ev-arch__bar">
        <div>
          <span className="eyebrow">{t.ed("arch.eyebrow")}</span>
          <p className="ev-arch__intro t-pretty">
            {f("arch.intro", { n: eventi.length })}
          </p>
        </div>
        <button
          type="button"
          className={cx("btn btn--outline-carta ev-arch__toggle", open && "is-open")}
          aria-expanded={open}
          aria-controls="ev-archivio"
          onClick={() => setOpen((o) => !o)}
        >
          {open ? t.ed("arch.nascondi") : t.ed("arch.mostra")}
          <Icon name="chevron-down" size={18} className="ev-arch__chev" />
        </button>
      </div>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id="ev-archivio"
            key="arch"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.6, ease: EASE }}
            style={{ overflow: "hidden" }}
          >
            <div className="ev-arch__body">
              {gruppi.map(([k, list]) => (
                <ArchivioRiga key={k} titolo={k} eventi={list} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ───────── sezione ───────── */
export default function Eventi() {
  const { t, f } = useTestiEventi();
  const { telegram, tgHandle } = useLink();
  const tutti = useEventi();
  const categorie = useCategorie();
  const futuri = useMemo(() => eventiFuturi(tutti), [tutti]);
  const passati = useMemo(() => eventiPassati(tutti), [tutti]);
  const [filtro, setFiltro] = useState<string>("tutti");
  const [espanso, setEspanso] = useState(false);
  const topRef = useRef<HTMLDivElement>(null);

  const conteggi = useMemo(() => {
    const m = new Map<string, number>();
    for (const e of futuri) m.set(e.categoria, (m.get(e.categoria) ?? 0) + 1);
    return m;
  }, [futuri]);
  const attivo = filtro !== "tutti" && !categorie.some((c) => c.id === filtro) ? "tutti" : filtro;
  const filtrati = attivo === "tutti" ? futuri : futuri.filter((e) => e.categoria === attivo);
  // in evidenza solo l'evento scelto come «1° · homepage» in Gestisci eventi (se è nell'elenco filtrato): niente ripiego
  const principale = eventoInEvidenza(tutti, 1);
  const primo = principale && filtrati.some((e) => e.id === principale.id) ? principale : undefined;
  const altri = primo ? filtrati.filter((e) => e.id !== primo.id) : filtrati;
  const subito = altri.slice(0, LIMITE);
  const extra = altri.slice(LIMITE);
  const labelAttivo = categorie.find((c) => c.id === attivo)?.label;

  const scegli = (v: string) => {
    setFiltro(v);
    setEspanso(false);
  };
  const riduci = () => {
    setEspanso(false);
    // se il pulsante è finito molto in basso, riporta in vista l'inizio dell'elenco
    const el = topRef.current;
    if (el && el.getBoundingClientRect().top < 0) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const options = [
    { value: "tutti", label: <>{t.ed("filtro.tutti")} <span className="ev-count">{futuri.length}</span></> },
    ...categorie.map((c) => {
      const n = conteggi.get(c.id) ?? 0;
      return {
        value: c.id,
        label: (
          <span className={cx("ev-opt", n === 0 && "is-empty")}>
            {c.label} <span className="ev-count">{n}</span>
          </span>
        ),
      };
    }),
  ];

  return (
    <section id="eventi" className="section ev surface-petrolio" aria-labelledby="ev-title">
      <div className="container">
        <SectionHead
          index="03"
          eyebrow={t.ed("eyebrow")}
          title={<span id="ev-title">{t.ed("titolo")}</span>}
        />

        {futuri.length > 0 ? (
          <>
            <Reveal className="ev-toolbar">
              <div className="ev-filter" role="group" aria-label="Filtra per categoria">
                <Segmented value={attivo} onChange={scegli} options={options} size="sm" />
              </div>
              <span className="sr-only" aria-live="polite">
                {filtrati.length} {filtrati.length === 1 ? "appuntamento" : "appuntamenti"}
                {labelAttivo && ` · ${labelAttivo}`}
              </span>
            </Reveal>

            <AnimatePresence mode="wait" initial={false}>
              {primo ? (
                <InEvidenza key={primo.slug} evento={primo} />
              ) : filtrati.length > 0 ? null : (
                <motion.div
                  key={`vuoto-${attivo}`}
                  className="ev-empty ev-empty--filtro surface-carta"
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.5, ease: EASE }}
                >
                  <Icon name="calendar" size={28} />
                  <p className="ev-empty__title">{t.ed("filtro.vuoto.titolo")}</p>
                  <p className="t-pretty">{t.ed("filtro.vuoto.testo")}</p>
                  <div className="ev-empty__ctas">
                    <button type="button" className="btn btn--outline" onClick={() => scegli("tutti")}>
                      {t.ed("filtro.vuoto.cta")}
                    </button>
                    <a className="btn btn--ghost" href={telegram} target="_blank" rel="noreferrer">
                      <Icon name="telegram" size={18} /> {tgHandle}
                    </a>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {altri.length > 0 && (
              <div ref={topRef} className="ev-dates">
                <div className="ev-sub">
                  <span className="t-label">{primo ? t.ed("agenda.titolo") : t.ed("agenda.tutte")}</span>
                  <span className="ev-sub__rule" aria-hidden />
                  <span className="t-mono t-muted ev-sub__n">{String(altri.length).padStart(2, "0")}</span>
                </div>
                <ul className="ev-agenda" key={`a-${attivo}`}>
                  {subito.map((e, i) => (
                    <motion.li key={e.slug} {...rowAnim(i)}>
                      <RigaAgenda evento={e} />
                    </motion.li>
                  ))}
                </ul>
                <AnimatePresence initial={false}>
                  {espanso && extra.length > 0 && (
                    <motion.div
                      key="extra"
                      id="ev-altre-date"
                      className="ev-agenda__more"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.7, ease: EASE }}
                    >
                      <ul className="ev-agenda">
                        {extra.map((e, i) => (
                          <motion.li key={e.slug} {...rowAnim(i + 1)}>
                            <RigaAgenda evento={e} />
                          </motion.li>
                        ))}
                      </ul>
                    </motion.div>
                  )}
                </AnimatePresence>
                {extra.length > 0 && (
                  <div className="ev-more">
                    <button
                      type="button"
                      className={cx("btn btn--outline-carta ev-more__btn", espanso && "is-open")}
                      aria-expanded={espanso}
                      aria-controls="ev-altre-date"
                      onClick={() => (espanso ? riduci() : setEspanso(true))}
                    >
                      {espanso ? t("agenda.meno") : f("agenda.mostra", { n: altri.length })}
                      <Icon name="chevron-down" size={18} className="ev-arch__chev" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </>
        ) : (
          <div className="ev-empty surface-carta">
            <Icon name="calendar" size={28} />
            <p className="ev-empty__title">{t.ed("vuoto.titolo")}</p>
            <p className="t-pretty">
              {t.ed("vuoto.testo")}{" "}
              <a className="link link--always" href={telegram} target="_blank" rel="noreferrer">
                {tgHandle}
              </a>
              .
            </p>
          </div>
        )}

        <Archivio eventi={passati} />
      </div>
    </section>
  );
}
