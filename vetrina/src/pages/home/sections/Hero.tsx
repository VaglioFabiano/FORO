/**
 * Hero della home (#top). Registro Silenzio, fondo Petrolio.
 * A sinistra il payoff; a destra il prossimo evento da protagonista, composto con i moduli del marchio:
 * locandina vera (grande) · scheda dell'evento in Lanterna con la CTA "Prenota il posto" ·
 * fascia Notte con lo stato dell'aula adesso. Tutte le frasi vengono dal catalogo TESTI_HERO.
 */
import { useRef, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { motion, useReducedMotion, useScroll, useTransform, type MotionValue } from "motion/react";
import { Icon, cx, SplitReveal, type IconName } from "@/components/ui";
import { EventArt } from "@/components/domain/EventArt";
import { SectionLink } from "@/components/layout/sections";
import { useHeaderTone } from "@/components/layout/tone";
import { TESTI_HERO } from "@/data/testi/hero";
import type { Evento } from "@/data/types";
import { useTesti } from "@/lib/contenuti";
import { useCategorie } from "@/lib/categorie";
import { conPrenotazione, eventiFuturi, eventoInEvidenza, postiRimasti, useEventi } from "@/lib/api";
import { fmtRange, fmtShort } from "@/lib/time";
import { quando } from "../prenota/testi";
import { useStatoLive } from "./statoLive";
import { fmtCountdown, riempi } from "./countdown";
import { TitoloEvento } from "../prenota/TitoloEvento";
import { useInModifica } from "@/components/cms/contesto";
import "./hero-orari.css";
import { useLink } from "@/lib/link";

const EASE = [0.22, 1, 0.36, 1] as const;
type T = ReturnType<typeof useTesti>;

/** come si compone ogni modulo: la stessa logica dell'animazione del marchio (F dall'alto, O da destra, O piena dal centro) */
const ENTRATA = [
  { clip: "inset(0% 0% 100% 0%)", delay: 0.35 },
  { clip: "inset(0% 0% 0% 100%)", delay: 0.5 },
  { clip: "inset(0% 100% 0% 0%)", delay: 0.65 },
];

function Modulo({
  i,
  className,
  children,
  label,
}: {
  i: number;
  className?: string;
  children: ReactNode;
  label?: string;
}) {
  const reduce = useReducedMotion();
  const e = ENTRATA[i];
  return (
    <motion.div
      className={cx("ho-mod", className)}
      role={label ? "group" : undefined}
      aria-label={label}
      initial={reduce ? false : { clipPath: e.clip }}
      animate={{ clipPath: "inset(0% 0% 0% 0%)" }}
      transition={{ duration: 1.05, delay: e.delay, ease: EASE }}
    >
      <motion.div
        className="ho-mod__in"
        initial={reduce ? false : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: e.delay + 0.4, ease: EASE }}
      >
        {children}
      </motion.div>
    </motion.div>
  );
}

/* ── fascia Notte: lo stato dell'aula adesso, porta agli orari ── */
function ModuloStato({ t }: { t: T }) {
  const s = useStatoLive();
  const detail = s.aperta
    ? [riempi(t("stato.chiude"), { ora: s.chiudeAlle ?? "" }), riempi(t("stato.tra"), { tempo: fmtCountdown(s.minuti ?? 0) })]
    : s.riapre
      ? [
          riempi(t("stato.riapre"), { quando: s.riapre }),
          s.minuti !== null ? riempi(t("stato.tra"), { tempo: fmtCountdown(s.minuti) }) : null,
        ]
      : [t("stato.aggiornamento")];
  return (
    <SectionLink to="orari" className="ho-live" title={t("stato.link")}>
      <span className="ho-live__state-wrap" aria-live="polite">
        <span className="ho-mod__label ho-live__label">{t.ed("stato.label")}</span>
        <span className={cx("ho-live__state", !s.aperta && "is-closed")}>
          <span className={cx("dot", s.aperta && "dot--live")} aria-hidden />
          {s.aperta ? t.ed("stato.aperta") : t.ed("stato.chiusa")}
        </span>
      </span>
      <span className="ho-live__info">
        <span className="ho-live__detail">
          {detail.filter(Boolean).map((d, i) => (
            <span key={i}>{d}</span>
          ))}
        </span>
        <span className="ho-live__bar" aria-hidden>
          <span className="ho-live__track">
            {s.aperta && (
              <motion.span
                className="ho-live__fill"
                initial={{ scaleX: 0 }}
                animate={{ scaleX: s.progresso }}
                transition={{ duration: 1.4, delay: 1.3, ease: EASE }}
              />
            )}
          </span>
          <span className="ho-live__ends">
            {s.aperta && s.fascia ? (
              <>
                <span>{s.fascia.start}</span>
                <span>{s.fascia.end}</span>
              </>
            ) : (
              <>
                <span>{t.ed("stato.oggi")}</span>
                <span>{s.oggi ?? t.ed("stato.chiusoOggi")}</span>
              </>
            )}
          </span>
        </span>
      </span>
      <span className="ho-live__go" aria-hidden>
        <Icon name="arrow-right" size={18} />
      </span>
      <span className="sr-only">{t("stato.link")}</span>
    </SectionLink>
  );
}

/* ── scheda del prossimo evento (Lanterna) ── */
function SchedaEvento({ e, t }: { e: Evento; t: T }) {
  const categorie = useCategorie();
  const occhiello = e.etichetta || categorie.find((c) => c.id === e.categoria)?.label || "Evento";
  const rimasti = postiRimasti(e);
  const pieno = rimasti === 0;
  const prenotabile = conPrenotazione(e) && !pieno;
  const href = `/eventi/${e.slug}`;
  // eventi vecchi: l'ora può mancare
  const orario = !e.ora ? "" : e.oraFine ? fmtRange(e.ora, e.oraFine) : e.ora;

  return (
    <div className="ho-evento">
      <div className="ho-evento__top">
        <span className="ho-mod__label">{t.ed("evento.label")}</span>
      </div>

      <div className="ho-evento__head">
        {!e.titolo.toLowerCase().startsWith(occhiello.toLowerCase()) && (
          <span className="ho-evento__occhiello">{occhiello}</span>
        )}
        <p className="ho-evento__title">
          <Link to={href} preventScrollReset className="ho-evento__titlelink">
            <TitoloEvento titolo={e.titolo} />
          </Link>
        </p>
      </div>

      <dl className="ho-evento__facts">
        <div>
          <dt>
            <Icon name="calendar" size={16} />
            <span className="sr-only">{t("evento.quando")}</span>
          </dt>
          <dd className="ho-evento__mono">
            {fmtShort(e.data)}
            {orario && ` · ${orario}`}
            <span className="ho-evento__rel">{quando(e.data)}</span>
          </dd>
        </div>
        <div>
          <dt>
            <Icon name="pin" size={16} />
            <span className="sr-only">{t("evento.dove")}</span>
          </dt>
          <dd>
            <span className="ho-evento__luogo">{e.luogo}</span>
            {e.indirizzo && <span className="ho-evento__addr">{e.indirizzo}</span>}
          </dd>
        </div>
        <div>
          <dt>
            <Icon name="seat" size={16} />
            <span className="sr-only">{t("evento.posti")}</span>
          </dt>
          <dd className="ho-evento__mono">
            {!conPrenotazione(e) ? (
              t.ed("evento.aperto")
            ) : rimasti === null ? (
              t.ed("evento.libero")
            ) : pieno ? (
              t.ed("evento.esaurito")
            ) : (
              <>
                {t.ed("evento.posti")} <b>{rimasti}</b>/{e.postiMax}
              </>
            )}
            {e.soloTesserati && <span className="ho-evento__tessera">{t.ed("evento.tessera")}</span>}
          </dd>
        </div>
      </dl>

      <Link to={href} preventScrollReset className="btn btn--lg btn--block ho-evento__cta">
        {prenotabile ? t.ed("evento.cta") : t.ed("evento.ctaDettagli")}
        <Icon name="arrow-right" size={18} className="btn-arrow" />
      </Link>
    </div>
  );
}

function ModuloFoto({ y, t }: { y: MotionValue<string>; t: T }) {
  const [loaded, setLoaded] = useState(false);
  return (
    <figure className={cx("ho-foto", loaded && "is-loaded")}>
      <motion.img
        src="/media/aula-gruppo.jpg"
        alt={t("foto.alt")}
        width={2400}
        height={1600}
        decoding="async"
        fetchPriority="high"
        onLoad={() => setLoaded(true)}
        style={{ y }}
      />
      <span className="ho-foto__veil" aria-hidden />
      <figcaption className="ho-mod__mono ho-foto__cap">{t.ed("foto.didascalia")}</figcaption>
    </figure>
  );
}

/** senza evento in evidenza: o non c'è nulla in programma, o nessun evento è stato scelto come «1° · homepage» */
function SchedaVuota({ t, inProgramma }: { t: T; inProgramma: boolean }) {
  return (
    <SectionLink to="eventi" className="ho-evento ho-evento--vuoto">
      <div className="ho-evento__top">
        <span className="ho-mod__label">{t.ed("vuoto.label")}</span>
      </div>
      <p className="ho-evento__title">{inProgramma ? t.ed("senza.titolo") : t.ed("vuoto.titolo")}</p>
      <span className="ho-evento__more">
        <span className="link link--always">{inProgramma ? t.ed("senza.cta") : t.ed("vuoto.cta")}</span>
        <Icon name="arrow-right" size={18} />
      </span>
    </SectionLink>
  );
}

function Protagonista({ t, yFoto }: { t: T; yFoto: MotionValue<string> }) {
  // in evidenza solo l'evento scelto come «1° · homepage»: se non c'è, nessun evento
  const eventi = useEventi();
  const e = eventoInEvidenza(eventi, 1);
  const inProgramma = eventiFuturi(eventi).length > 0;
  return (
    <div className={cx("ho-feat", !e && "ho-feat--vuoto")}>
      <Modulo i={0} className="ho-mod--poster">
        {e ? (
          <Link to={`/eventi/${e.slug}`} preventScrollReset className="ho-poster" tabIndex={-1}>
            <EventArt evento={e} ratio="auto" priority className="ho-poster__art" />
          </Link>
        ) : (
          <ModuloFoto y={yFoto} t={t} />
        )}
      </Modulo>
      <Modulo i={1} className="ho-mod--evento" label={e ? `${t("evento.label")}: ${e.titolo}` : t("vuoto.label")}>
        {e ? <SchedaEvento e={e} t={t} /> : <SchedaVuota t={t} inProgramma={inProgramma} />}
      </Modulo>
      <Modulo i={2} className="ho-mod--stato" label={t("stato.label")}>
        <ModuloStato t={t} />
      </Modulo>
    </div>
  );
}

export default function Hero() {
  const inModifica = useInModifica();
  const { luogo } = useLink();
  useHeaderTone("dark");
  const t = useTesti(TESTI_HERO);
  const reduce = useReducedMotion();
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const k = reduce ? 0 : 1;
  const yText = useTransform(scrollYProgress, [0, 1], [0, -70 * k]);
  const yGrid = useTransform(scrollYProgress, [0, 1], [0, 60 * k]);
  const yFoto = useTransform(scrollYProgress, [0, 1], reduce ? ["0%", "0%"] : ["-5%", "7%"]);
  const fade = useTransform(scrollYProgress, [0, 0.75], [1, reduce ? 1 : 0.35]);

  const righe = t("titolo")
    .split("\n")
    .map((r) => r.trim())
    .filter(Boolean);
  const lines: ReactNode[] = righe.map((r, i) =>
    i === righe.length - 1 ? (
      <>
        {r}
        <span className="corner-mark" aria-hidden />
      </>
    ) : (
      r
    ),
  );

  const fatti: { icon: IconName; testo: ReactNode }[] = [
    { icon: "pin", testo: `${luogo.via}, ${luogo.citta}` },
    { icon: "angolo", testo: t.ed("fatti.ingresso") },
    { icon: "foro", testo: t.ed("fatti.foro") },
    { icon: "agora", testo: t.ed("fatti.agora") },
  ];

  return (
    <section id="top" ref={ref} className="ho-hero surface-petrolio" aria-labelledby="ho-hero-title">
      <div className="container ho-hero__main">
        <motion.div className="ho-hero__text" style={{ y: yText, opacity: fade }}>
          <motion.span
            className="eyebrow ho-hero__eyebrow"
            initial={reduce ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1, ease: EASE }}
          >
            {t.ed("eyebrow")}
          </motion.span>
          <div id="ho-hero-title">
            {/* in modifica il titolo non si rianima a ogni lettera */}
            {t.ed("titolo", () => <SplitReveal key={inModifica ? "modifica" : righe.join("|")} className="ho-hero__title" delay={0.2} lines={lines} />, { blocco: true })}
          </div>
          <motion.div
            className="ho-hero__lead"
            initial={reduce ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.55, ease: EASE }}
          >
            {t.ed(
              "lead",
              (s) =>
                s
                  .split("\n")
                  .filter(Boolean)
                  .map((par, i) => <p key={i}>{par}</p>),
              { blocco: true },
            )}
          </motion.div>
          <motion.div
            className="ho-hero__ctas"
            initial={reduce ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.7, ease: EASE }}
          >
            <SectionLink to="orari" className="btn btn--carta btn--lg ho-hero__cta">
              <Icon name="orari" size={18} />
              {t.ed("cta.orari")}
            </SectionLink>
            <SectionLink to="eventi" className="btn btn--outline-carta btn--lg ho-hero__cta">
              {t.ed("cta.eventi")}
              <Icon name="arrow-right" size={18} className="btn-arrow" />
            </SectionLink>
          </motion.div>
        </motion.div>

        <motion.div className="ho-hero__gridwrap" style={{ y: yGrid }}>
          <Protagonista t={t} yFoto={yFoto} />
        </motion.div>
      </div>

      <div className="container ho-hero__foot">
        <ul className="ho-fatti" aria-label={t("fatti.aria")}>
          {fatti.map((f, i) => (
            <motion.li
              key={f.icon}
              initial={reduce ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 1.1 + i * 0.08, ease: EASE }}
            >
              <Icon name={f.icon} size={18} />
              <span>{f.testo}</span>
            </motion.li>
          ))}
        </ul>
        <SectionLink to="orari" className="ho-scroll" title={t("scorri.title")}>
          <span className="ho-scroll__line" aria-hidden>
            <i />
          </span>
          <span>{t.ed("scorri")}</span>
        </SectionLink>
      </div>
    </section>
  );
}
