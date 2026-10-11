import { Link } from "react-router-dom";
import { LogoMark } from "@/brand/Logo";
import { Icon } from "@/components/ui";
import { useTesti } from "@/lib/contenuti";
import { TESTI_FOOTER } from "@/data/testi/footer";
import { NAV, ORG } from "@/data/org";
import { SectionLink } from "./sections";
import { Modificabile } from "@/components/cms/Modificabile";
import { settimanaMobile, statoLabel, useOrari, useStatoAula } from "@/lib/api";
import { fmtRange } from "@/lib/time";
import { useLink } from "@/lib/link";
import { TESTI_LINK } from "@/data/testi/link";

function OggiInAula() {
  const orari = useOrari();
  const oggi = settimanaMobile(orari, undefined, 1)[0];
  const s = useStatoAula();
  const l = statoLabel(s);
  return (
    <div className="footer-today">
      <span className="t-label t-muted">Oggi</span>
      <p className="t-mono footer-today__hours">
        {oggi.chiuso ? "Chiusa" : oggi.fasce.map((f) => fmtRange(f.start, f.end)).join(" · ")}
      </p>
      <p className="footer-today__state">
        <span className={s.aperta ? "dot dot--live" : "dot"} style={{ color: s.aperta ? undefined : "var(--foro-laguna-chiara)" }} />
        {l.breve}, {l.dettaglio}
      </p>
    </div>
  );
}

export function SiteFooter() {
  const year = new Date().getFullYear();
  const t = useTesti(TESTI_FOOTER);
  const link = useLink();
  const tl = useTesti(TESTI_LINK);
  return (
    <Modificabile sezione="footer">
      <footer className="site-footer surface-notte" id="contatti-footer">
        <div className="container">
          {t("payoff").trim() && (
            <div className="site-footer__top">
              <h2 className="t-display site-footer__payoff">
                {t("payoff")
                  .split("\n")
                  .map((riga, i, arr) => (
                    <span key={i} style={{ display: "block" }}>
                      {riga}
                      {i === arr.length - 1 && <span className="corner-mark" aria-hidden />}
                    </span>
                  ))}
              </h2>
            </div>
          )}

          <div className="site-footer__grid">
            <div className="site-footer__brand">
              <LogoMark color="var(--foro-carta)" height={72} />
              <p className="t-muted">{t.ed("descrizione")}</p>
            </div>

            <div>
              <h3 className="t-label site-footer__h">Aula studio</h3>
              <address className="site-footer__addr">
                {tl.ed("luogo.via")}
                <br />
                {tl.ed("luogo.citta")}
              </address>
              <OggiInAula />
              <a className="site-footer__link link" href={link.luogo.indicazioni} target="_blank" rel="noreferrer">
                Indicazioni stradali <Icon name="arrow-up-right" size={14} />
              </a>
            </div>

            <div>
              <h3 className="t-label site-footer__h">Sezioni</h3>
              <ul className="site-footer__list">
                {NAV.filter((n) => n.id !== "contatti").map((n) => (
                  <li key={n.id}>
                    <SectionLink className="link" to={n.id}>
                      {n.label}
                    </SectionLink>
                  </li>
                ))}
                <li>
                  <Link className="link" to="/accedi">
                    Area volontari
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="t-label site-footer__h">Contatti</h3>
              <a className="site-footer__mail link" href={`mailto:${link.email}`}>
                {link.email}
              </a>
              <div className="site-footer__social">
                <a href={link.instagram} target="_blank" rel="noreferrer" aria-label="Instagram">
                  <Icon name="instagram" size={20} />
                </a>
                <a href={link.facebook} target="_blank" rel="noreferrer" aria-label="Facebook">
                  <Icon name="facebook" size={20} />
                </a>
                <a href={link.telegram} target="_blank" rel="noreferrer" aria-label="Telegram">
                  <Icon name="telegram" size={20} />
                </a>
              </div>

            </div>
          </div>

          <div className="site-footer__bottom">
            <span>
              © {year} {ORG.nomeEsteso} · Sede legale {ORG.sedeLegale}
            </span>
            <span className="site-footer__legal">
              <Link className="link" to="/privacy">
                Privacy
              </Link>
              <button className="link" onClick={() => window.dispatchEvent(new Event("foro:cookie-open"))}>
                Preferenze cookie
              </button>
            </span>
          </div>
        </div>
      </footer>
    </Modificabile>
  );
}
