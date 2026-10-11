/**
 * Volontariato — registro Voce.
 * Foto a piena larghezza con velatura Notte 70% e i video veri delle attività
 * (Manuale, pag. 16) sopra il video verticale, e l'invito: vieni in aula e chiedi.
 */
import { useRef } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import { SectionLink } from "@/components/layout/sections";
import { Icon, Reveal } from "@/components/ui";
import { TESTI_CHISIAMO } from "@/data/testi/chisiamo";
import { useTesti } from "@/lib/contenuti";
import { Righe } from "./ChiSiamoRighe";


export function Volontariato() {
  const t = useTesti(TESTI_CHISIAMO);
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], reduce ? ["0%", "0%"] : ["-8%", "8%"]);

  return (
    <div id="volontariato" className="cs-vol">
      <div className="cs-vol__hero surface-notte" ref={ref}>
        <motion.img
          className="cs-vol__photo"
          src="/media/aula-gruppo.jpg"
          alt="Il gruppo dei volontari e delle volontarie di FORO, di sera, con le maglie bianche del logo sotto le luci di un albero"
          style={{ y }}
          loading="lazy"
          decoding="async"
        />
        <span className="cs-vol__veil" aria-hidden />
        <div className="container cs-vol__grid">
          <div className="cs-vol__copy">
            <Reveal>
              <span className="eyebrow">{t.ed("vol.eyebrow")}</span>
            </Reveal>
            <Reveal delay={0.06}>
              <h3 className="cs-vol__title t-balance">
                {t.ed("vol.titolo", (s) => <Righe s={s} />)}
                <span className="corner-mark" aria-hidden />
              </h3>
            </Reveal>
            <Reveal delay={0.12}>
              <p className="cs-vol__text t-pretty">{t.ed("vol.testo")}</p>
            </Reveal>
            <Reveal delay={0.18} className="cs-vol__invito">
              <span className="cs-vol__invito-icona disc" aria-hidden>
                <Icon name="info" size={22} />
              </span>
              <div className="cs-vol__invito-corpo">
                <span className="cs-vol__invito-k t-label">{t.ed("vol.invito.etichetta")}</span>
                <p className="cs-vol__invito-testo t-pretty">{t.ed("vol.invito")}</p>
                <SectionLink to="orari" className="cs-vol__invito-link">
                  <span>{t.ed("vol.link")}</span>
                  <Icon name="arrow-right" size={18} />
                </SectionLink>
              </div>
            </Reveal>
          </div>
          <Reveal delay={0.1} y={40} className="cs-vol__device">
            {[
              { src: "/media/associati1.mp4", label: "Volontari e volontarie al lavoro in aula" },
              { src: "/media/associati3.mp4", label: "Un pomeriggio in aula con FORO" },
            ].map((v, i) => (
              <figure key={v.src} className={`cs-vol__frame cs-vol__frame--${i + 1}`}>
                <video
                  className="cs-vol__video"
                  src={v.src}
                  muted
                  autoPlay
                  loop
                  playsInline
                  preload="metadata"
                  aria-label={v.label}
                />
              </figure>
            ))}
          </Reveal>
        </div>
      </div>

    </div>
  );
}
