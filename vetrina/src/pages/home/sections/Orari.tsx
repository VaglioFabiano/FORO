/**
 * Orari (#orari). Registro Silenzio su Travertino.
 * Tutti e 7 i giorni visibili insieme, come sul sito attuale (OrariSettimana condiviso),
 * con una colonna laterale: stato adesso, Aula AGORÀ a pranzo, pagode, Telegram, volontari.
 */
import { Fragment } from "react";
import { motion } from "motion/react";
import { Icon, Reveal, SectionHead, cx } from "@/components/ui";
import { OrariSettimana, periodoSettimana } from "@/components/domain/Orari";
import { SectionLink } from "@/components/layout/sections";
import { TESTI_ORARI } from "@/data/testi/orari";
import { useTesti } from "@/lib/contenuti";
import { AGORA_PRANZO } from "@/data/orari";
import { useOrari } from "@/lib/api";
import { fmtRange } from "@/lib/time";
import { useStatoLive } from "./statoLive";
import { fmtCountdown, riempi } from "./countdown";
import "./hero-orari.css";
import { useLink } from "@/lib/link";

const EASE = [0.22, 1, 0.36, 1] as const;
type T = ReturnType<typeof useTesti>;

/** testo modificabile con segnaposto ({inizio}, {canale}…): i valori escono in carattere mono */
function ConOrari({ testo, vars }: { testo: string; vars: Record<string, string> }) {
  const parts = testo.split(/(\{\w+\})/g);
  return (
    <>
      {parts.map((p, i) => {
        const m = /^\{(\w+)\}$/.exec(p);
        if (m && m[1] in vars)
          return (
            <span key={i} className="t-mono">
              {vars[m[1]]}
            </span>
          );
        return <Fragment key={i}>{p}</Fragment>;
      })}
    </>
  );
}

function Adesso({ t }: { t: T }) {
  const s = useStatoLive();
  return (
    <div className={cx("ho-now surface-petrolio", !s.aperta && "is-closed")} aria-live="polite">
      <div className="ho-now__top">
        <span className="t-label">{t.ed("adesso.label")}</span>
        <span className="t-mono ho-now__clock">
          <Icon name="clock" size={14} /> {s.ora}
        </span>
      </div>

      <p className="ho-now__state">
        <span className={cx("dot", s.aperta && "dot--live")} aria-hidden />
        {s.aperta ? t.ed("adesso.aperta") : t.ed("adesso.chiusa")}
      </p>

      <div className="ho-now__rows">
        <div className="ho-now__row">
          <span className="ho-now__k">{s.aperta ? t.ed("adesso.chiude") : t.ed("adesso.riapre")}</span>
          <span className="ho-now__v t-mono">
            {s.aperta ? riempi(t("adesso.alle"), { ora: s.chiudeAlle ?? "" }) : (s.riapre ?? t("adesso.aggiornamento"))}
          </span>
        </div>
        {s.minuti !== null && (
          <div className="ho-now__row ho-now__row--count">
            <span className="ho-now__k">{s.aperta ? t.ed("adesso.allaChiusura") : t.ed("adesso.allaRiapertura")}</span>
            <span className="ho-now__v ho-now__count t-mono">{fmtCountdown(s.minuti)}</span>
          </div>
        )}
      </div>

      <div className="ho-now__bar" aria-hidden>
        <div className="ho-now__track">
          {s.aperta && (
            <motion.span
              className="ho-now__fill"
              initial={{ scaleX: 0 }}
              whileInView={{ scaleX: s.progresso }}
              viewport={{ once: true }}
              transition={{ duration: 1.3, ease: EASE }}
            />
          )}
        </div>
        <div className="ho-now__ends t-mono">
          {s.aperta && s.fascia ? (
            <>
              <span>{s.fascia.start}</span>
              <span>{s.fascia.end}</span>
            </>
          ) : (
            <>
              <span>{t.ed("adesso.oggi")}</span>
              <span>{s.oggi ?? t.ed("adesso.chiusoOggi")}</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Pranzo({ t }: { t: T }) {
  const s = useStatoLive();
  return (
    <div className={cx("ho-info", s.pranzoAdesso && "is-live")}>
      <div className="ho-info__head">
        <span className="ho-info__icon disc" aria-hidden>
          <Icon name="agora" size={20} />
        </span>
        {s.pranzoAdesso && (
          <span className="ho-info__live t-label">
            <span className="dot dot--live" aria-hidden /> {t.ed("pranzo.adesso")}
          </span>
        )}
      </div>
      <h3 className="ho-info__title">{t.ed("pranzo.titolo")}</h3>
      <p className="ho-info__text">
        {t.ed("pranzo.testo", (s) => <ConOrari testo={s} vars={{ inizio: AGORA_PRANZO.start, fine: AGORA_PRANZO.end }} />)}
      </p>
      <span className="ho-info__data t-mono">{fmtRange(AGORA_PRANZO.start, AGORA_PRANZO.end)}</span>
    </div>
  );
}

function Pagode({ t }: { t: T }) {
  return (
    <div className="ho-info">
      <div className="ho-info__head">
        <span className="ho-info__icon disc" aria-hidden>
          <Icon name="sun" size={20} />
        </span>
      </div>
      <h3 className="ho-info__title">{t.ed("pagode.titolo")}</h3>
      <p className="ho-info__text">{t.ed("pagode.testo")}</p>
      <span className="ho-info__data t-mono">{t.ed("pagode.nota")}</span>
    </div>
  );
}

function Telegram({ t }: { t: T }) {
  const { telegram, tgHandle } = useLink();
  return (
    <a className="ho-tg" href={telegram} target="_blank" rel="noopener noreferrer">
      <span className="ho-tg__icon disc" aria-hidden>
        <Icon name="telegram" size={20} />
      </span>
      <span className="ho-tg__body">
        <span className="ho-tg__title">{t.ed("telegram.titolo")}</span>
        <span className="ho-tg__text">
          {t.ed("telegram.testo", (s) => <ConOrari testo={s} vars={{ canale: tgHandle }} />)}
        </span>
      </span>
      <Icon name="arrow-up-right" size={20} className="ho-tg__arrow" />
      <span className="sr-only">{t("telegram.nuova")}</span>
    </a>
  );
}

function Volontari({ t }: { t: T }) {
  return (
    <div className="ho-vol surface-lanterna">
      <span className="t-label">{t.ed("volontari.label")}</span>
      <h3 className="ho-vol__title">{t.ed("volontari.titolo")}</h3>
      <p className="ho-vol__text">{t.ed("volontari.testo")}</p>
      <SectionLink to="volontariato" className="ho-vol__cta">
        <span className="link link--always">{t.ed("volontari.cta")}</span>
        <span className="ho-vol__go" aria-hidden>
          <Icon name="arrow-right" size={18} />
        </span>
      </SectionLink>
    </div>
  );
}

export default function Orari() {
  useOrari(); // il periodo si ricalcola quando cambiano gli orari
  const periodo = periodoSettimana();
  const t = useTesti(TESTI_ORARI);
  return (
    <section id="orari" className="section ho-orari">
      <div className="container">
        <SectionHead
          index="01"
          eyebrow={t.ed("eyebrow")}
          title={t.ed("titolo")}
          intro={
            <>
              <span className="ho-period">
                <Icon name="calendar" size={18} />
                <span className="t-mono">{periodo}</span>
              </span>
              <span className="ho-period__text">{t.ed("intro")}</span>
            </>
          }
        />

        <div className="ho-orari__layout">
          <div className="ho-orari__main">
            <Reveal y={16}>
              <OrariSettimana className="ho-week" />
            </Reveal>
            <Reveal y={16} delay={0.06} className="ho-orari__tg">
              <Telegram t={t} />
            </Reveal>
          </div>

          <aside className="ho-orari__aside" aria-label="Adesso in aula e avvisi">
            <Reveal y={16}>
              <Adesso t={t} />
            </Reveal>
            <div className="ho-orari__pair">
              <Reveal y={16} delay={0.06}>
                <Pranzo t={t} />
              </Reveal>
              <Reveal y={16} delay={0.12}>
                <Pagode t={t} />
              </Reveal>
            </div>
            <Reveal y={16} delay={0.1}>
              <Volontari t={t} />
            </Reveal>
          </aside>
        </div>
      </div>
    </section>
  );
}
