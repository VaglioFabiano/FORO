/**
 * 07 · Statuto — registro Silenzio.
 * Fatti in breve (2×2), due articoli in evidenza e consultazione integrale nella pagina:
 * indice per sezione, ricerca con evidenziazione, articoli espandibili con link diretto (#statuto-art-N).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Icon, Reveal, SectionHead, cx } from "@/components/ui";
import { toast } from "@/components/ui/Toast";
import { scrollToTarget } from "@/components/layout/Layout";
import { STATUTO, STATUTO_IN_BREVE, STATUTO_IN_EVIDENZA } from "@/data/statuto";
import type { ArticoloStatuto } from "@/data/types";
import { TESTI_STATUTO } from "@/data/testi/statuto";
import { useTesti } from "@/lib/contenuti";
import { ricco, riempi } from "./AssociatiTesti";
import { Evidenzia, blocchi, corrisponde, estratto, occorrenzeArticolo, raggruppa, termini } from "./statuto-text";
import { useLink } from "@/lib/link";
import "./statuto.css";

/** unico riferimento: il file ufficiale su Google Drive (si scarica sempre l'ultima versione) */
const PDF_NOME = "Statuto-FORO-ETS.pdf";
const EASE = [0.22, 1, 0.36, 1] as const;

const SEZIONI = raggruppa(STATUTO);
const sezioneDi = (n: number) => SEZIONI.find((s) => n >= s.da && n <= s.a) ?? SEZIONI[0];

const TONI = ["petrolio", "carta", "carta", "notte"] as const;

const artId = (n: number) => `statuto-art-${n}`;

export default function Statuto() {
  const t = useTesti(TESTI_STATUTO);
  const { statutoVedi: DRIVE, statutoScarica: PDF_LOCALE } = useLink();
  // in breve e in evidenza vengono dal documento: non si modificano dal sito
  const FATTI = TONI.map((tone, i) => ({ ...STATUTO_IN_BREVE[i], tone }));
  const EVIDENZA = STATUTO_IN_EVIDENZA;
  const suggerimenti = t("vuoto.suggerimenti")
    .split(",")
    .map((w) => w.trim())
    .filter(Boolean);
  const [q, setQ] = useState("");
  const [sez, setSez] = useState(1);
  const [aperti, setAperti] = useState<Set<number>>(() => new Set());
  const inputRef = useRef<HTMLInputElement>(null);

  const terms = useMemo(() => termini(q), [q]);
  const cercando = terms.length > 0;

  const risultati = useMemo(() => {
    if (!cercando) return [];
    return STATUTO.filter((a) => corrisponde(a, terms)).map((a) => ({ art: a, occ: occorrenzeArticolo(a, terms) }));
  }, [terms, cercando]);
  const totOcc = risultati.reduce((s, r) => s + r.occ, 0);

  const sezione = SEZIONI.find((s) => s.n === sez) ?? SEZIONI[0];
  const visibili: ArticoloStatuto[] = cercando ? risultati.map((r) => r.art) : sezione.articoli;

  const toggle = (n: number) =>
    setAperti((s) => {
      const next = new Set(s);
      if (next.has(n)) next.delete(n);
      else next.add(n);
      return next;
    });

  /** apre un articolo, mostra la sua sezione e ci scorre */
  const vaiA = useCallback((n: number, delay = 80) => {
    setQ("");
    setSez(sezioneDi(n).n);
    setAperti((s) => new Set(s).add(n));
    window.setTimeout(() => {
      const el = document.getElementById(artId(n));
      if (el) scrollToTarget(el, -110);
    }, delay);
  }, []);

  // link diretti: /#statuto-art-5
  useEffect(() => {
    const leggi = (first: boolean) => {
      const m = /^#statuto-art-(\d+)$/.exec(window.location.hash);
      if (!m) return;
      const n = Number(m[1]);
      if (n >= 1 && n <= STATUTO.length) vaiA(n, first ? 650 : 80);
    };
    leggi(true);
    const on = () => leggi(false);
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, [vaiA]);

  const copiaLink = async (n: number) => {
    const url = `${window.location.origin}/#${artId(n)}`;
    try {
      await navigator.clipboard.writeText(url);
      toast(`Puoi incollarlo dove vuoi: porta dritto all'art. ${n}.`, "ok", "Link copiato");
    } catch {
      window.history.replaceState(null, "", `#${artId(n)}`);
      toast("Non siamo riusciti a copiare il link. L'abbiamo messo nella barra degli indirizzi: copialo da lì.", "avviso");
    }
  };

  const tuttiAperti = visibili.length > 0 && visibili.every((a) => aperti.has(a.numero));
  const apriTutti = () =>
    setAperti((s) => {
      const next = new Set(s);
      visibili.forEach((a) => (tuttiAperti ? next.delete(a.numero) : next.add(a.numero)));
      return next;
    });

  return (
    <section id="statuto" className="section stt" aria-labelledby="stt-title">
      <div className="container">
        <SectionHead
          index="06"
          eyebrow={t.ed("eyebrow")}
          title={<span id="stt-title">{t.ed("titolo", ricco)}</span>}
          intro={t.ed("intro")}
        />

        {/* ───── in breve + in evidenza ───── */}
        <div className="stt-top">
          <div className="stt-brief">
            <Reveal>
              <h3 className="t-label stt-kicker">{t.ed("breve.titolo")}</h3>
            </Reveal>
            <ul className="stt-facts">
              {FATTI.map((f, i) => (
                <Reveal as="li" key={i} delay={0.06 * i} className={cx("stt-fact", `stt-fact--${f.tone}`)}>
                  <span className="stt-fact__rif t-mono">{f.rif}</span>
                  <strong className="stt-fact__dato">
                    {f.dato}
                    {f.unita && <span className="stt-fact__unit">{f.unita}</span>}
                  </strong>
                  <span className="stt-fact__txt">{f.testo}</span>
                </Reveal>
              ))}
            </ul>
          </div>

          <div className="stt-evid">
            <Reveal>
              <h3 className="t-label stt-kicker">{t.ed("evidenza.titolo")}</h3>
            </Reveal>
            {EVIDENZA.map((e, i) => (
              <Reveal key={e.n} delay={0.08 + i * 0.08}>
                <a
                  className="stt-evid__card"
                  href={`#${artId(e.n)}`}
                  onClick={(ev) => {
                    ev.preventDefault();
                    vaiA(e.n, 120);
                  }}
                >
                  <span className="stt-evid__n t-mono">Art. {e.n}</span>
                  <span className="stt-evid__body">
                    <span className="stt-evid__occ t-label">{e.occhiello}</span>
                    <span className="stt-evid__title">{e.titolo}</span>
                    <span className="stt-evid__txt">{e.testo}</span>
                    <span className="stt-evid__go">
                      {t.ed("evidenza.leggi")} <Icon name="arrow-down" size={16} />
                    </span>
                  </span>
                </a>
              </Reveal>
            ))}
          </div>
        </div>

        {/* ───── documento ufficiale: scaricabile da tutti ───── */}
        <Reveal className="stt-doc surface-petrolio">
          <span className="stt-doc__ic disc" aria-hidden>
            <Icon name="document" size={26} />
          </span>
          <div className="stt-doc__txt">
            <span className="t-label stt-doc__k">{t.ed("doc.kicker")}</span>
            <h3 className="stt-doc__title">{t.ed("doc.titolo")}</h3>
            <p className="stt-doc__p">{t.ed("doc.testo")}</p>
            <span className="t-mono stt-doc__meta">{t.ed("doc.meta")}</span>
          </div>
          <div className="stt-doc__actions">
            <a className="btn btn--lanterna btn--lg" href={PDF_LOCALE} download={PDF_NOME} type="application/pdf">
              <Icon name="download" size={18} /> {t.ed("doc.scarica")}
            </a>
            <a className="stt-doc__drive link link--always" href={DRIVE} target="_blank" rel="noopener noreferrer">
              {t.ed("doc.drive")} <Icon name="arrow-up-right" size={16} />
            </a>
          </div>
        </Reveal>

        {/* ───── consultazione integrale ───── */}
        <Reveal amount={0.05}>
          <div className="stt-reader" id="statuto-testo">
            <div className="stt-bar">
              <div className="stt-search">
                <label htmlFor="stt-q" className="sr-only">
                  {t.ed("cerca.placeholder")}
                </label>
                <Icon name="search" size={20} className="stt-search__icon" />
                <input
                  ref={inputRef}
                  id="stt-q"
                  type="search"
                  className="stt-search__input"
                  placeholder={t("cerca.placeholder")}
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  onKeyDown={(e) => e.key === "Escape" && setQ("")}
                  autoComplete="off"
                  spellCheck={false}
                />
                {q && (
                  <button
                    type="button"
                    className="stt-search__clear"
                    onClick={() => {
                      setQ("");
                      inputRef.current?.focus();
                    }}
                    aria-label="Cancella la ricerca"
                  >
                    <Icon name="close" size={18} />
                  </button>
                )}
              </div>
              <div className="stt-bar__actions">
                <button type="button" className="btn btn--ghost btn--sm stt-toggle-all" onClick={apriTutti} disabled={!visibili.length}>
                  <Icon name={tuttiAperti ? "minus" : "plus"} size={16} />
                  {tuttiAperti ? t.ed("btn.chiudi") : t.ed("btn.apri")}
                </button>
                <a className="btn btn--outline btn--sm" href={PDF_LOCALE} download={PDF_NOME} type="application/pdf">
                  <Icon name="download" size={16} /> {t.ed("btn.pdf")}
                </a>
              </div>
            </div>

            <div className="stt-status t-mono" aria-live="polite">
              {cercando ? (
                risultati.length ? (
                  <>
                    <span>
                      {risultati.length} {risultati.length === 1 ? "articolo" : "articoli"} · {totOcc}{" "}
                      {totOcc === 1 ? "occorrenza" : "occorrenze"}
                    </span>
                    <span className="stt-status__q">«{q.trim()}»</span>
                  </>
                ) : (
                  <span>Nessun risultato</span>
                )
              ) : (
                <>
                  <span>
                    Sezione {sezione.n} di {SEZIONI.length} · Art. {sezione.da}–{sezione.a}
                  </span>
                  <span className="stt-status__q">{t.ed("stato.aggiornato")}</span>
                </>
              )}
            </div>

            <div className="stt-grid">
              {/* indice */}
              <nav className="stt-index" aria-label="Indice dello statuto">
                <ol className="stt-index__list">
                  {SEZIONI.map((s) => {
                    const hit = cercando ? risultati.filter((r) => r.art.numero >= s.da && r.art.numero <= s.a).length : 0;
                    const active = !cercando && s.n === sez;
                    return (
                      <li key={s.n} className={cx("stt-index__sez", active && "is-active", cercando && !hit && "is-dim")}>
                        <button
                          type="button"
                          className="stt-index__btn"
                          aria-current={active ? "true" : undefined}
                          onClick={() => {
                            setQ("");
                            setSez(s.n);
                          }}
                        >
                          <span className="stt-index__num t-mono">{String(s.n).padStart(2, "0")}</span>
                          <span className="stt-index__name">{s.titolo}</span>
                          <span className="stt-index__range t-mono">
                            {cercando ? (hit ? `${hit} ris.` : "—") : `${s.da}–${s.a}`}
                          </span>
                        </button>
                        <AnimatePresence initial={false}>
                          {active && (
                            <motion.ol
                              className="stt-index__arts"
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.45, ease: EASE }}
                            >
                              {s.articoli.map((a) => (
                                <li key={a.numero}>
                                  <a
                                    href={`#${artId(a.numero)}`}
                                    className={cx("stt-index__art", aperti.has(a.numero) && "is-open")}
                                    onClick={(ev) => {
                                      ev.preventDefault();
                                      vaiA(a.numero);
                                    }}
                                  >
                                    <span className="t-mono">{a.numero}</span>
                                    {a.titolo}
                                  </a>
                                </li>
                              ))}
                            </motion.ol>
                          )}
                        </AnimatePresence>
                      </li>
                    );
                  })}
                </ol>
              </nav>

              {/* articoli */}
              <div className="stt-arts">
                {!cercando && (
                  <header className="stt-sezhead">
                    <span className="t-mono stt-sezhead__n">Sezione {String(sezione.n).padStart(2, "0")}</span>
                    <h3 className="stt-sezhead__title">{sezione.titolo}</h3>
                  </header>
                )}

                {cercando && !risultati.length ? (
                  <div className="stt-empty">
                    <p className="stt-empty__title">{t.ed("vuoto.titolo", (s) => riempi(s, { q: q.trim() }))}</p>
                    <p className="stt-empty__txt">{t.ed("vuoto.testo")}</p>
                    <div className="stt-empty__chips">
                      {suggerimenti.map((w) => (
                        <button key={w} type="button" className="stt-chip" onClick={() => setQ(w)}>
                          {w}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <ol className="stt-list">
                    {visibili.map((a) => (
                      <Articolo
                        key={a.numero}
                        art={a}
                        terms={terms}
                        open={aperti.has(a.numero)}
                        onToggle={() => toggle(a.numero)}
                        onCopy={() => copiaLink(a.numero)}
                        sezioneLabel={cercando ? sezioneDi(a.numero).titolo : undefined}
                      />
                    ))}
                  </ol>
                )}

                {!cercando && (
                  <div className="stt-pager">
                    <button
                      type="button"
                      className="stt-pager__btn"
                      disabled={sez <= 1}
                      onClick={() => {
                        setSez(sez - 1);
                        scrollToTarget("#statuto-testo", -100);
                      }}
                    >
                      <Icon name="arrow-left" size={18} />
                      <span>
                        <span className="t-mono">{t.ed("pager.prec")}</span>
                        {sez > 1 && <span className="stt-pager__name">{SEZIONI[sez - 2].titolo}</span>}
                      </span>
                    </button>
                    <button
                      type="button"
                      className="stt-pager__btn stt-pager__btn--next"
                      disabled={sez >= SEZIONI.length}
                      onClick={() => {
                        setSez(sez + 1);
                        scrollToTarget("#statuto-testo", -100);
                      }}
                    >
                      <span>
                        <span className="t-mono">{t.ed("pager.succ")}</span>
                        {sez < SEZIONI.length && <span className="stt-pager__name">{SEZIONI[sez].titolo}</span>}
                      </span>
                      <Icon name="arrow-right" size={18} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function Articolo({
  art,
  terms,
  open,
  onToggle,
  onCopy,
  sezioneLabel,
}: {
  art: ArticoloStatuto;
  terms: string[];
  open: boolean;
  onToggle: () => void;
  onCopy: () => void;
  sezioneLabel?: string;
}) {
  const t = useTesti(TESTI_STATUTO);
  const id = artId(art.numero);
  const evid = art.numero === 5 || art.numero === 20;
  const ex = terms.length && !open ? estratto(art, terms) : null;
  const struttura = useMemo(() => blocchi(art.commi), [art.commi]);
  return (
    <li id={id} className={cx("stt-art", open && "is-open", evid && "is-evid")}>
      <h4 className="stt-art__h">
        <button type="button" className="stt-art__trigger" aria-expanded={open} aria-controls={`${id}-body`} onClick={onToggle}>
          <span className="stt-art__n t-mono">Art. {art.numero}</span>
          <span className="stt-art__title">
            <span>
              <Evidenzia text={art.titolo} terms={terms} />
            </span>
            {sezioneLabel && <span className="stt-art__sez t-mono">{sezioneLabel}</span>}
          </span>
          <span className="stt-art__tagwrap">{evid && <span className="tag tag--petrolio stt-art__tag">{t.ed("evidenza.tag")}</span>}</span>
          <span className="stt-art__icon" aria-hidden>
            <Icon name="plus" size={20} />
          </span>
        </button>
      </h4>
      {ex && (
        <p className="stt-art__ex">
          <Evidenzia text={ex} terms={terms} />
        </p>
      )}
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id={`${id}-body`}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.5, ease: EASE }}
            style={{ overflow: "hidden" }}
          >
            <div className="stt-art__body">
              {struttura.map((b, i) =>
                b.kind === "p" ? (
                  <p key={i} className="stt-p">
                    {b.num && <span className="stt-p__num t-mono">{b.num}</span>}
                    <span>
                      {b.lead && (
                        <span className="stt-p__lead t-label">
                          <Evidenzia text={b.lead} terms={terms} />
                        </span>
                      )}
                      <Evidenzia text={b.text} terms={terms} />
                    </span>
                  </p>
                ) : (
                  <ul key={i} className={cx("stt-ul", b.style === "alpha" && "stt-ul--alpha")}>
                    {b.items.map((it, k) => (
                      <li key={k}>
                        {it.marker ? <span className="stt-ul__m t-mono">{it.marker}</span> : <span className="stt-ul__dash" aria-hidden />}
                        <span>
                          <Evidenzia text={it.text} terms={terms} />
                        </span>
                      </li>
                    ))}
                  </ul>
                ),
              )}
              <div className="stt-art__foot">
                <button type="button" className="stt-copy" onClick={onCopy}>
                  <Icon name="copy" size={16} /> {t.ed("copia")}
                </button>
                <span className="t-mono t-muted">#{id}</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </li>
  );
}
