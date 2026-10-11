/**
 * 09 · Dove siamo — ultima sezione prima del footer.
 * Mappa grande, accesso (piano inferiore della biblioteca, entrata separata), orari di oggi, contatti, social e sede legale.
 */
import { Icon, Reveal, SectionHead } from "@/components/ui";
import { MapBlock } from "@/components/domain/MapBlock";
import { TESTI_LINK } from "@/data/testi/link";
import { useLink } from "@/lib/link";
import { TESTI_CONTATTI } from "@/data/testi/contatti";
import { useTesti } from "@/lib/contenuti";
import { ricco } from "./AssociatiTesti";
import "./contatti.css";


export default function Contatti() {
  const t = useTesti(TESTI_CONTATTI);
  // indirizzo e coordinate sono condivisi con mappa, piè di pagina e menu (data/testi/link.ts)
  const tl = useTesti(TESTI_LINK);
  const { luogo } = useLink();

  return (
    <section id="contatti" className="section ct" aria-labelledby="ct-title">
      <div className="container">
        <SectionHead
          index="08"
          eyebrow={t.ed("eyebrow")}
          title={<span id="ct-title">{t.ed("titolo", ricco)}</span>}
          intro={t.ed("intro")}
        />

        <div className="ct-top">
          <Reveal className="ct-map">
            <MapBlock height={560} />
          </Reveal>

          <Reveal delay={0.08} className="ct-addr surface-petrolio">
            <span className="t-label ct-addr__k">{t.ed("indirizzo.k")}</span>
            <address className="ct-addr__street">
              {tl.ed("luogo.via")}
              <span>
                {tl.ed("luogo.cap")} {tl.ed("luogo.citta")}
              </span>
            </address>
            <dl className="ct-access">
              <div>
                <dt className="t-mono">{t.ed("dove.k")}</dt>
                <dd>{tl.ed("luogo.presso")}</dd>
              </div>
              <div>
                <dt className="t-mono">{t.ed("ingresso.k")}</dt>
                <dd>{tl.ed("luogo.accesso")}</dd>
              </div>
              <div>
                <dt className="t-mono">{t.ed("coordinate.k")}</dt>
                <dd className="t-mono">{tl.ed("luogo.coordinate")}</dd>
              </div>
            </dl>
            <div className="ct-addr__actions">
              <a className="btn btn--lanterna" href={luogo.indicazioni} target="_blank" rel="noreferrer">
                <Icon name="pin" size={18} /> {t.ed("btn.indicazioni")}
                <Icon name="arrow-up-right" size={16} className="btn-arrow" />
              </a>
              <a className="btn btn--outline-carta" href={luogo.apri} target="_blank" rel="noreferrer">
                <Icon name="map" size={18} /> {t.ed("btn.maps")}
              </a>
            </div>
          </Reveal>
        </div>

      </div>
    </section>
  );
}
