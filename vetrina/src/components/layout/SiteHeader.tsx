import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
import { LogoMark, LogoOrizzontale } from "@/brand/Logo";
import { Icon, cx } from "@/components/ui";
import { NAV } from "@/data/org";
import { statoLabel, useStatoAula, useUtenteCorrente } from "@/lib/api";
import { useHeaderToneValue } from "./tone";
import { SectionLink, useActiveSection } from "./sections";
import { useLink } from "@/lib/link";

const NAV_IDS = NAV.map((n) => n.id);

export function StatusChip({ tone = "light", compact = false }: { tone?: "light" | "dark"; compact?: boolean }) {
  const s = useStatoAula();
  const l = statoLabel(s);
  return (
    <SectionLink to="orari" className={cx("status-chip", `status-chip--${tone}`, !s.aperta && "is-closed")} title="Orari dell'aula studio">
      <span className={cx("dot", s.aperta && "dot--live")} aria-hidden />
      <span className="status-chip__main">{l.breve}</span>
      {!compact && <span className="status-chip__detail">· {l.dettaglio}</span>}
    </SectionLink>
  );
}

export function SiteHeader() {
  const tone = useHeaderToneValue();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const loc = useLocation();
  const utente = useUtenteCorrente();
  const { email, luogo } = useLink();
  const active = useActiveSection(NAV_IDS);

  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 24);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  useEffect(() => setOpen(false), [loc.pathname]);
  useEffect(() => {
    document.documentElement.classList.toggle("lenis-stopped", open);
    document.body.style.overflow = open ? "hidden" : "";
  }, [open]);

  const dark = tone === "dark" && !scrolled && !open;
  const ink = dark || open ? "var(--foro-carta)" : "var(--foro-petrolio)";

  return (
    <>
      <header className={cx("site-header", dark ? "is-dark" : "is-light", scrolled && "is-scrolled", open && "is-open")}>
        <div className="site-header__inner container">
          <SectionLink to="top" className="site-header__logo" title="FORO, torna all'inizio">
            <LogoOrizzontale color={ink} accent={dark || open ? "var(--foro-laguna-chiara)" : "var(--foro-laguna)"} height={40} compact />
          </SectionLink>

          <nav className="site-nav" aria-label="Sezioni">
            {NAV.map((n) => {
              const isActive = active === n.id;
              return (
                <SectionLink key={n.id} to={n.id} className={cx("site-nav__link", isActive && "is-active")} aria-current={isActive ? "true" : undefined}>
                  {n.label}
                  {isActive && (
                    <motion.span layoutId="nav-underline" className="site-nav__underline" transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }} />
                  )}
                </SectionLink>
              );
            })}
          </nav>

          <div className="site-header__actions">
            <StatusChip tone={dark ? "dark" : "light"} compact />
            {utente ? (
              <Link to="/area" className={cx("btn btn--sm site-header__area", dark ? "btn--outline-carta" : "btn--outline")}>
                <Icon name="user" size={16} /> Area volontari
              </Link>
            ) : (
              <Link to="/accedi" className="site-header__login link">
                Login
              </Link>
            )}
            <button className="site-header__burger" aria-label={open ? "Chiudi il menu" : "Apri il menu"} aria-expanded={open} onClick={() => setOpen((o) => !o)}>
              <span />
              <span />
            </button>
          </div>
        </div>
      </header>

      <AnimatePresence>
        {open && (
          <motion.div
            className="mobile-menu surface-petrolio"
            initial={{ clipPath: "inset(0 0 100% 0)" }}
            animate={{ clipPath: "inset(0 0 0% 0)" }}
            exit={{ clipPath: "inset(0 0 100% 0)" }}
            transition={{ duration: 0.6, ease: [0.65, 0, 0.35, 1] }}
            data-lenis-prevent
          >
            <div className="container mobile-menu__inner">
              <nav aria-label="Menu" className="mobile-menu__nav">
                {NAV.map((n, i) => (
                  <motion.div
                    key={n.id}
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.18 + i * 0.045, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <SectionLink to={n.id} onClick={() => setOpen(false)} className={cx("mobile-menu__link", active === n.id && "is-active")}>
                      <span className="t-mono">{String(i + 1).padStart(2, "0")}</span>
                      {n.label}
                    </SectionLink>
                  </motion.div>
                ))}
              </nav>
              <motion.div className="mobile-menu__foot" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.55, duration: 0.5 }}>
                <Link to={utente ? "/area" : "/accedi"} className="btn btn--carta btn--block" onClick={() => setOpen(false)}>
                  <Icon name={utente ? "user" : "lock"} size={18} /> {utente ? "Area volontari" : "Login"}
                </Link>
                <div className="mobile-menu__contacts t-mono">
                  <a href={`mailto:${email}`}>{email}</a>
                  <span>
                    {luogo.via}, {luogo.citta}
                  </span>
                </div>
                <LogoMark color="var(--foro-carta)" height={56} style={{ opacity: 0.9 }} />
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
