/**
 * Area volontari: shell con barra laterale Notte, rotte annidate per modulo. Ognuno vede i moduli che il
 * suo livello permette (il server ripete ogni controllo, BACKEND.md §8). Si entra solo con una sessione del server.
 * Registro Silenzio, niente payoff.
 */
import { lazy, Suspense, useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, Navigate, NavLink, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
import { LogoMark } from "@/brand/Logo";
import { Avatar, ButtonLink, Icon, Skeleton, cx, type IconName } from "@/components/ui";
import { toast } from "@/components/ui/Toast";
import { esci, useSessione, useUtenteCorrente } from "@/lib/api";
import { aggiornaUtente, chiama } from "@/lib/server";
import { useStore } from "@/lib/store";
import { LIVELLI } from "@/data/volontari";
import type { Livello, Utente } from "@/data/types";
import { Empty, puo, useLivello } from "./ui";
import { scopertiProssimi, turniPronti, useTurni } from "./data-turni";
import Panoramica from "./modules/Panoramica";
import "./shell.css";

const Turni = lazy(() => import("./modules/Turni"));
const Presenze = lazy(() => import("./modules/Presenze"));
const EventiAdmin = lazy(() => import("./modules/EventiAdmin"));
const OrariAdmin = lazy(() => import("./modules/OrariAdmin"));
const Tesserati = lazy(() => import("./modules/Tesserati"));
const SegnalazioniAdmin = lazy(() => import("./modules/SegnalazioniAdmin"));
const Manuale = lazy(() => import("./modules/Manuale"));
const Utenti = lazy(() => import("./modules/Utenti"));
const Profilo = lazy(() => import("./modules/Profilo"));
const Verbali = lazy(() => import("./modules/Verbali"));
const Contabilita = lazy(() => import("./modules/Contabilita"));
const NotificheTelegram = lazy(() => import("./modules/NotificheTelegram"));
const InviaTelegram = lazy(() => import("./modules/InviaTelegram"));
const TestiSito = lazy(() => import("./modules/TestiSito"));
const StoriaAdmin = lazy(() => import("./modules/StoriaAdmin"));

type Modulo = {
  path: string;
  label: string;
  icon: IconName;
  min: Livello;
  gruppo: "turno" | "gestione" | "associazione" | "aiuto";
};
const MODULI: Modulo[] = [
  { path: "", label: "Panoramica", icon: "home", min: 4, gruppo: "turno" },
  { path: "turni", label: "Turni", icon: "calendar", min: 4, gruppo: "turno" },
  { path: "presenze", label: "Presenze", icon: "chart", min: 4, gruppo: "turno" },
  { path: "orari", label: "Orari", icon: "orari", min: 4, gruppo: "turno" },
  { path: "manuale", label: "Manuale del turno", icon: "book", min: 4, gruppo: "turno" },
  { path: "segnalazioni", label: "Segnalazioni", icon: "flag", min: 2, gruppo: "gestione" },
  { path: "testi", label: "Testi del sito", icon: "edit", min: 2, gruppo: "gestione" },
  { path: "storia", label: "La storia", icon: "clock", min: 2, gruppo: "gestione" },
  { path: "telegram", label: "Notifiche Telegram", icon: "bell", min: 2, gruppo: "gestione" },
  { path: "invia-telegram", label: "Debug Telegram", icon: "send", min: 0, gruppo: "gestione" },
  { path: "eventi", label: "Eventi", icon: "eventi", min: 2, gruppo: "associazione" },
  { path: "tesserati", label: "Tesserati", icon: "soci", min: 2, gruppo: "associazione" },
  { path: "verbali", label: "Verbali", icon: "document", min: 4, gruppo: "associazione" },
  { path: "contabilita", label: "Contabilità", icon: "euro", min: 4, gruppo: "associazione" },
  { path: "utenti", label: "Utenti", icon: "user", min: 1, gruppo: "associazione" },
  { path: "profilo", label: "Il mio profilo", icon: "settings", min: 4, gruppo: "aiuto" },
];
const GRUPPI: { id: Modulo["gruppo"]; label: string }[] = [
  { id: "turno", label: "Turno in aula" },
  { id: "gestione", label: "Gestione aula" },
  { id: "associazione", label: "Associazione" },
  { id: "aiuto", label: "Strumenti" },
];

function moduloDa(pathname: string) {
  const seg = pathname.replace(/^\/area\/?/, "").split("/")[0] ?? "";
  return MODULI.find((m) => m.path === seg) ?? MODULI[0];
}

/* ───────── barra laterale (desktop e menu mobile) ───────── */
function Sidebar({ onNavigate, onEsci, uscendo }: { onNavigate?: () => void; onEsci: () => void; uscendo: boolean }) {
  const utente = useUtenteCorrente();
  const livello = useLivello();
  const turni = useTurni();
  const pronti = useStore(turniPronti);
  // finché i turni non arrivano dal server non c'è nessun numero da mostrare
  const scoperti = useMemo(() => (pronti ? scopertiProssimi(turni).length : 0), [turni, pronti]);
  const badge: Record<string, number> = { turni: scoperti };
  const badgeTitle: Record<string, string> = {
    turni: `${scoperti} ${scoperti === 1 ? "turno scoperto" : "turni scoperti"} nei prossimi 7 giorni`,
  };

  return (
    <div className="sh-side__inner">
      <Link to="/" className="sh-brand" onClick={onNavigate} aria-label="Vai alla homepage del sito">
        <LogoMark color="var(--foro-carta)" height={38} />
        <span className="sh-brand__text">
          <span className="t-label">Area volontari</span>
          <span className="sh-brand__sub">Aula studio · Piossasco</span>
        </span>
      </Link>

      <nav className="sh-nav" aria-label="Moduli dell'area volontari">
        {GRUPPI.map((g) => {
          const voci = MODULI.filter((m) => m.gruppo === g.id && puo(livello, m.min));
          if (!voci.length) return null;
          return (
            <div key={g.id} className="sh-nav__group">
              <span className="sh-nav__label">{g.label}</span>
              <ul>
                {voci.map((m) => (
                  <li key={m.path}>
                    <NavLink
                      to={m.path ? `/area/${m.path}` : "/area"}
                      end={m.path === ""}
                      className={({ isActive }) => cx("sh-nav__link", isActive && "is-active")}
                      onClick={onNavigate}
                    >
                      {({ isActive }) => (
                        <>
                          {isActive && (
                            <motion.span
                              layoutId={onNavigate ? "sh-nav-active-m" : "sh-nav-active"}
                              className="sh-nav__active"
                              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                            />
                          )}
                          <Icon name={m.icon} size={19} className="sh-nav__icon" />
                          <span className="sh-nav__text">{m.label}</span>
                          {badge[m.path] > 0 && (
                            <span className="sh-nav__badge" title={badgeTitle[m.path]}>
                              <span aria-hidden>{badge[m.path]}</span>
                              <span className="sr-only">{badgeTitle[m.path]}</span>
                            </span>
                          )}
                        </>
                      )}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </nav>

      <div className="sh-foot">
        {utente && (
          <Link to="/area/profilo" className="sh-user" onClick={onNavigate} aria-label={`Il mio profilo: ${utente.nome} ${utente.cognome}`}>
            <Avatar name={`${utente.nome} ${utente.cognome}`} size={42} tone="lanterna" />
            <div className="sh-user__text">
              <strong>
                {utente.nome} {utente.cognome}
              </strong>
              <span>{LIVELLI[livello].label}</span>
            </div>
            <Icon name="chevron-right" size={18} className="sh-user__go" />
          </Link>
        )}
        <div className="sh-foot__actions">
          <Link to="/" className="sh-foot__btn">
            <Icon name="arrow-left" size={17} /> Torna al sito
          </Link>
          <button type="button" className="sh-foot__btn" onClick={onEsci} disabled={uscendo} aria-busy={uscendo || undefined}>
            {uscendo ? <span className="spinner" aria-hidden /> : <Icon name="logout" size={17} />}
            {uscendo ? "Uscita…" : "Esci"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ───────── modulo protetto da livello ───────── */
function Gate({ min, children }: { min: Livello; children: ReactNode }) {
  const livello = useLivello();
  if (puo(livello, min)) return <>{children}</>;
  return (
    <div className="sh-gate">
      <Empty icon="lock" title="Questa sezione non è disponibile per il tuo ruolo.">
        La vede chi organizza eventi, orari e tesseramento. Se ti serve, chiedi al direttivo.
      </Empty>
      <ButtonLink to="/area" variant="outline" size="sm" icon="arrow-left">
        Torna alla panoramica
      </ButtonLink>
    </div>
  );
}

function ModuleFallback() {
  return (
    <div className="sh-fallback" aria-busy="true" aria-label="Caricamento del modulo">
      <Skeleton h={14} w={120} />
      <Skeleton h={44} w="46%" />
      <Skeleton h={18} w="62%" />
      <div className="sh-fallback__grid">
        <Skeleton h={120} />
        <Skeleton h={120} />
        <Skeleton h={120} />
      </div>
      <Skeleton h={320} />
    </div>
  );
}

/* ───────── shell ───────── */
export default function AreaApp() {
  const sessione = useSessione();
  const utente = useUtenteCorrente();
  const loc = useLocation();
  const navigate = useNavigate();
  const [menu, setMenu] = useState(false);
  const [uscendo, setUscendo] = useState(false);
  const [uscito, setUscito] = useState(false);
  const modulo = moduloDa(loc.pathname);

  useEffect(() => {
    document.title = `${modulo.label} · Area volontari · FORO`;
  }, [modulo.label]);
  useEffect(() => setMenu(false), [loc.pathname]);
  // entrando si rilegge l'utente dal server (livello e dati cambiati da altri); con una sessione non più valida
  // il server risponde 401 e chiama() la chiude, quindi si torna alla pagina di accesso
  const token = sessione?.token;
  useEffect(() => {
    if (!token) return;
    chiama<{ utente: Utente }>("autenticazione", { query: { action: "me" } })
      .then((r) => aggiornaUtente(r.utente))
      .catch(() => undefined);
  }, [token]);
  useEffect(() => {
    if (!menu) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenu(false);
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [menu]);

  const onEsci = async () => {
    setUscendo(true);
    setUscito(true);
    await esci();
    navigate("/", { replace: true });
    toast("Hai chiuso la sessione dell'area volontari. A presto.", "info");
  };

  if (!sessione || !utente) {
    if (uscito) return null;
    return <Navigate to={`/accedi?next=${encodeURIComponent(loc.pathname + loc.search)}`} replace />;
  }

  return (
    <div className="sh">
      <a href="#area-contenuto" className="skip-link">
        Vai al contenuto
      </a>
      <aside className="sh-side" aria-label="Area volontari">
        <Sidebar onEsci={onEsci} uscendo={uscendo} />
      </aside>

      {/* barra in alto su mobile */}
      <header className="sh-top">
        <Link to="/" className="sh-top__brand" aria-label="Vai alla homepage del sito">
          <LogoMark color="var(--foro-carta)" height={30} />
        </Link>
        <span className="sh-top__title">{modulo.label}</span>
        <button type="button" className="sh-top__menu" onClick={() => setMenu(true)} aria-label="Apri il menu" aria-expanded={menu}>
          <Icon name="menu" size={24} />
        </button>
      </header>
      <AnimatePresence>
        {menu && (
          <motion.div className="sh-drawer-root" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
            <button type="button" className="sh-drawer-scrim" aria-label="Chiudi il menu" onClick={() => setMenu(false)} />
            <motion.aside
              className="sh-drawer"
              role="dialog"
              aria-modal="true"
              aria-label="Menu dell'area volontari"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            >
              <button type="button" className="sh-drawer__close" onClick={() => setMenu(false)} aria-label="Chiudi il menu">
                <Icon name="close" size={22} />
              </button>
              <Sidebar onNavigate={() => setMenu(false)} onEsci={onEsci} uscendo={uscendo} />
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>

      <main id="area-contenuto" className="sh-main">
        <div className="sh-content">
          <motion.div key={modulo.path} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}>
            <Suspense fallback={<ModuleFallback />}>
              <Routes>
                <Route index element={<Panoramica />} />
                <Route path="turni" element={<Turni />} />
                <Route path="presenze" element={<Presenze />} />
                <Route
                  path="eventi"
                  element={
                    <Gate min={2}>
                      <EventiAdmin />
                    </Gate>
                  }
                />
                <Route
                  path="orari"
                  element={
                    <Gate min={4}>
                      <OrariAdmin />
                    </Gate>
                  }
                />
                <Route
                  path="tesserati"
                  element={
                    <Gate min={2}>
                      <Tesserati />
                    </Gate>
                  }
                />
                <Route
                  path="segnalazioni"
                  element={
                    <Gate min={2}>
                      <SegnalazioniAdmin />
                    </Gate>
                  }
                />
                <Route
                  path="testi"
                  element={
                    <Gate min={2}>
                      <TestiSito />
                    </Gate>
                  }
                />
                <Route
                  path="storia"
                  element={
                    <Gate min={2}>
                      <StoriaAdmin />
                    </Gate>
                  }
                />
                <Route path="manuale" element={<Manuale />} />
                <Route path="verbali" element={<Verbali />} />
                <Route path="contabilita" element={<Contabilita />} />
                <Route path="profilo" element={<Profilo />} />
                <Route
                  path="utenti"
                  element={
                    <Gate min={1}>
                      <Utenti />
                    </Gate>
                  }
                />
                <Route
                  path="telegram"
                  element={
                    <Gate min={2}>
                      <NotificheTelegram />
                    </Gate>
                  }
                />
                <Route
                  path="invia-telegram"
                  element={
                    <Gate min={0}>
                      <InviaTelegram />
                    </Gate>
                  }
                />

                <Route path="*" element={<Panoramica />} />
              </Routes>
            </Suspense>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
