/**
 * 03 · L'aula — due aule, due registri (Manuale pag. 4 e segnaletica A4, pag. 15).
 * Split interattivo FORO / AGORÀ (entrambe rimandano agli orari), servizi e regolamento affiancati
 * (con il testo ufficiale completo nel pannello laterale), FAQ con i rimandi a orari e contatti.
 * Le frasi sono modificabili dalla dashboard (data/testi/aula.ts).
 * Tutti i contenuti arrivano da data/org.ts; lo stato dell'aula da lib/api.
 */
import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { Icon, Modal, Reveal, SectionHead, cx } from "@/components/ui";
import { SectionLink } from "@/components/layout/sections";
import { AULE, REGOLAMENTO, SERVIZI } from "@/data/org";
import { useLink } from "@/lib/link";
import { useRegolamento } from "@/lib/documenti";
import { TESTI_AULA } from "@/data/testi/aula";
import { useTesti } from "@/lib/contenuti";
import { useMedia } from "@/lib/useMedia";
import "./aula.css";

type AulaId = keyof typeof AULE;
const ORDINE: AulaId[] = ["foro", "agora"];
const pad2 = (n: number) => String(n).padStart(2, "0");

/** orari dentro un testo ("Pranzo 12:30–14:30") in Plex Mono */
function conDati(s: string): ReactNode {
  const parts = s.split(/(\d{1,2}:\d{2}(?:–\d{1,2}:\d{2})?)/);
  return parts.map((p, i) =>
    i % 2 ? (
      <span key={i} className="aula-dato">
        {p}
      </span>
    ) : (
      p
    ),
  );
}

/** "\n" nei testi modificabili = a capo */
function Righe({ s }: { s: string }) {
  const r = s.split("\n");
  return (
    <>
      {r.map((x, i) => (
        <span key={i}>
          {x}
          {i < r.length - 1 && <br />}
        </span>
      ))}
    </>
  );
}

/* ───────── segni delle due aule (icone "foro" e "agora" del manuale, animate) ───────── */
function Segno({ id }: { id: AulaId }) {
  if (id === "foro") {
    return (
      <svg className="aula-segno aula-segno--foro" viewBox="0 0 24 24" aria-hidden>
        <path d="M4 12h16" pathLength={1} />
      </svg>
    );
  }
  const barre = [
    [4, 11, 13],
    [8, 8, 16],
    [12, 4.5, 19.5],
    [16, 8, 16],
    [20, 11, 13],
  ];
  return (
    <svg className="aula-segno aula-segno--agora" viewBox="0 0 24 24" aria-hidden>
      {barre.map(([x, y1, y2], i) => (
        <line key={i} x1={x} x2={x} y1={y1} y2={y2} style={{ animationDelay: `${-i * 0.43}s` }} />
      ))}
    </svg>
  );
}

/* ───────── split FORO / AGORÀ ───────── */
function AuleSplit() {
  const t = useTesti(TESTI_AULA);
  const stacked = useMedia("(max-width: 860px)");
  const [active, setActive] = useState<AulaId>("foro");
  const timer = useRef<number | undefined>(undefined);
  const triggers = useRef<Record<AulaId, HTMLButtonElement | null>>({ foro: null, agora: null });
  const uid = useId().replace(/:/g, "");

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const hoverIn = (id: AulaId) => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setActive(id), 110);
  };
  const hoverOut = () => window.clearTimeout(timer.current);

  const onKey = (e: KeyboardEvent<HTMLButtonElement>, id: AulaId) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft" && e.key !== "Home" && e.key !== "End") return;
    e.preventDefault();
    const i = ORDINE.indexOf(id);
    const next =
      e.key === "Home" ? ORDINE[0] : e.key === "End" ? ORDINE[ORDINE.length - 1] : ORDINE[(i + (e.key === "ArrowRight" ? 1 : ORDINE.length - 1)) % ORDINE.length];
    triggers.current[next]?.focus();
  };

  return (
    <div className="aula-split" data-active={active} data-stacked={stacked || undefined}>
      {ORDINE.map((id, i) => {
        const a = AULE[id];
        const isActive = stacked || active === id;
        const detailId = `${uid}-${id}-dettaglio`;
        // la prima parola sulla prima riga, il resto sulla seconda
        const nome = t.ed(`${id}.nome`, (s) => {
          const [prima, ...resto] = s.split(" ");
          return (
            <>
              <span className="aula-panel__nome-riga">{prima}</span> <span className="aula-panel__nome-riga">{resto.join(" ")}</span>
            </>
          );
        });
        return (
          <article
            key={id}
            className={cx("aula-panel", `aula-panel--${id}`, isActive && "is-active")}
            onMouseEnter={stacked ? undefined : () => hoverIn(id)}
            onMouseLeave={stacked ? undefined : hoverOut}
            onFocus={stacked ? undefined : () => setActive(id)}
            onClick={stacked ? undefined : () => setActive(id)}
          >
            <p className="aula-panel__meta">
              <span className="aula-panel__num">{pad2(i + 1)}</span>
              <span className="t-label">{t.ed(`${id}.registro`)}</span>
            </p>
            <div className="aula-panel__segno">
              <Segno id={id} />
            </div>
            <h3 className="aula-panel__nome">
              {stacked ? (
                nome
              ) : (
                <button
                  ref={(el) => {
                    triggers.current[id] = el;
                  }}
                  type="button"
                  className="aula-panel__trigger"
                  aria-expanded={isActive}
                  aria-controls={detailId}
                  onKeyDown={(e) => onKey(e, id)}
                >
                  {nome}
                </button>
              )}
            </h3>
            <p className="aula-panel__lead">
              <strong>{t.ed(`${id}.breve`)}</strong> {t.ed(`${id}.testo`)}
            </p>
            <div className="aula-panel__fondo">
              <div id={detailId} className="aula-panel__dettaglio">
                <p className="aula-panel__testo">{t.ed(`${id}.dettaglio`)}</p>
                <ul className="aula-panel__regole" aria-label={`Regole dell'${t(`${id}.nome`)}`}>
                  {a.regole.map((_, k) => (
                    <li key={k}>{t.ed(`${id}.regola.${k + 1}`, conDati)}</li>
                  ))}
                </ul>
                <SectionLink to="orari" className="aula-panel__link">
                  <span>{t.ed("aule.link")}</span>
                  <Icon name="arrow-right" size={18} />
                </SectionLink>
              </div>
              {!stacked && (
                <span className="aula-panel__invito" aria-hidden>
                  <Icon name="plus" size={16} />
                  {t.ed("aule.invito")}
                </span>
              )}
            </div>
            <span className="aula-panel__angolo" aria-hidden />
          </article>
        );
      })}
    </div>
  );
}

/* ───────── in aula: servizi e regolamento, due moduli affiancati ───────── */
/* ───────── il regolamento completo, nel pannello laterale ───────── */
const VOCE = /^(\d+)\.\s+(.*)$/;
type Blocco = { tipo: "p"; testo: string } | { tipo: "ol"; voci: { n: string; testo: string }[] };

function blocchi(righe: string[]): Blocco[] {
  const out: Blocco[] = [];
  for (const r of righe) {
    const m = r.match(VOCE);
    if (m) {
      const last = out[out.length - 1];
      if (last?.tipo === "ol") last.voci.push({ n: m[1], testo: m[2] });
      else out.push({ tipo: "ol", voci: [{ n: m[1], testo: m[2] }] });
    } else out.push({ tipo: "p", testo: r });
  }
  return out;
}

function RegolamentoCompleto({ reg }: { reg: ReturnType<typeof useRegolamento> }) {
  const t = useTesti(TESTI_AULA);
  const { regolamento } = useLink();
  return (
    <div className="aula-rc">
      <div className="aula-rc__testa">
        <p className="aula-rc__nota">{t.ed("regolamento.nota")}</p>
        <p className="aula-rc__fonte t-mono" aria-live="polite">
          {reg.caricamento
            ? "Sto leggendo il documento ufficiale…"
            : reg.fonte === "documento"
              ? "Testo letto ora dal documento ufficiale: se il file cambia, cambia anche qui."
              : "Documento non raggiungibile: mostriamo l'ultima copia salvata."}
        </p>
        <a className="aula-rc__doc" href={regolamento} target="_blank" rel="noopener noreferrer">
          <Icon name="external" size={18} />
          <span>{t.ed("regolamento.originale")}</span>
        </a>
      </div>
      <ol className="aula-rc__articoli">
        {reg.articoli.map((a, i) => (
          <li key={i} className="aula-rc__art">
            <header className="aula-rc__art-testa">
              <span className="aula-rc__num">{a.numero}</span>
              {a.titolo && <h3 className="aula-rc__titolo">{a.titolo}</h3>}
            </header>
            <div className="aula-rc__corpo">
              {blocchi(a.righe).map((b, j) =>
                b.tipo === "p" ? (
                  <p key={j}>{b.testo}</p>
                ) : (
                  <ol key={j} className="aula-rc__elenco">
                    {b.voci.map((v) => (
                      <li key={v.n}>
                        <span className="aula-rc__voce-n">{v.n}</span>
                        <span>{v.testo}</span>
                      </li>
                    ))}
                  </ol>
                ),
              )}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

function InAula() {
  const t = useTesti(TESTI_AULA);
  const [aperto, setAperto] = useState(false);
  const reg = useRegolamento();
  return (
    <div className="aula-info container">
      <div className="aula-info__modulo aula-info__modulo--servizi">
        <header className="aula-info__testa">
          <Reveal>
            <span className="eyebrow">{t.ed("servizi.eyebrow")}</span>
          </Reveal>
          <Reveal delay={0.05}>
            <h3 className="aula-info__titolo">
              {t.ed("servizi.titolo", (s) => <Righe s={s} />)}
            </h3>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="aula-info__intro">{t.ed("servizi.intro")}</p>
          </Reveal>
        </header>
        <ul className="aula-servizi">
          {SERVIZI.map((s, i) => (
            <Reveal as="li" key={s.titolo} delay={(i % 2) * 0.06 + Math.floor(i / 2) * 0.05} className="aula-servizio">
              <span className="aula-servizio__icona">
                <Icon name={s.icon} size={24} />
              </span>
              <h4 className="aula-servizio__titolo">{t.ed(`servizio.${i + 1}.titolo`)}</h4>
              <p className="aula-servizio__testo">{t.ed(`servizio.${i + 1}.testo`)}</p>
            </Reveal>
          ))}
        </ul>
      </div>

      <div className="aula-info__modulo aula-info__modulo--regole surface-petrolio">
        <header className="aula-info__testa">
          <Reveal>
            <span className="eyebrow">{t.ed("regolamento.eyebrow")}</span>
          </Reveal>
          <Reveal delay={0.05}>
            <h3 className="aula-info__titolo">
              {t.ed("regolamento.titolo", (s) => <Righe s={s} />)}
            </h3>
          </Reveal>
        </header>
        <ol className="aula-regole">
          {REGOLAMENTO.map((_, i) => (
            <Reveal as="li" key={i} delay={i * 0.04} className="aula-regola">
              <span className="aula-regola__num">{pad2(i + 1)}</span>
              <p className="aula-regola__testo">{conDati(REGOLAMENTO[i])}</p>
            </Reveal>
          ))}
        </ol>
        <div className="aula-regole__azioni">
          <button type="button" className="btn btn--carta aula-regole__completo" onClick={() => setAperto(true)} aria-haspopup="dialog">
            <Icon name="book" size={18} />
            {t.ed("regolamento.completo")}
          </button>
          <SectionLink to="statuto" className="aula-regole__link">
            <span>{t.ed("regolamento.statuto")}</span>
            <Icon name="arrow-right" size={18} />
          </SectionLink>
        </div>
        <Modal open={aperto} onClose={() => setAperto(false)} title={reg.titolo} side="right" width={720}>
          <RegolamentoCompleto reg={reg} />
        </Modal>
      </div>
    </div>
  );
}

export default function Aula() {
  const t = useTesti(TESTI_AULA);
  return (
    <section id="aula" className="aula">
      <div className="aula-apertura container">
        <SectionHead
          index="02"
          eyebrow={t.ed("eyebrow")}
          title={t.ed("titolo", (s) => <Righe s={s} />)}
          intro={t.ed("intro")}
        />
        <Reveal y={28} amount={0.1}>
          <AuleSplit />
        </Reveal>
      </div>
      <InAula />
    </section>
  );
}
