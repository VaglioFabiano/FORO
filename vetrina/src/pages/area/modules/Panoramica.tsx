import { useEffect, useId, useMemo, useRef, useState, type HTMLAttributes } from "react";
import { Link } from "react-router-dom";
import { useMedia } from "@/lib/useMedia";
import { Avatar, ButtonLink, Icon, Skeleton, cx, type IconName } from "@/components/ui";
import { EventArt } from "@/components/domain/EventArt";
import { LIVELLI } from "@/data/volontari";
import type { Evento, Livello } from "@/data/types";
import { conPrenotazione, eventiFuturi, eventoInEvidenza, homepagePronta, postiPrenotati, statoLabel, useEventi, useStatoAula, useUtenteCorrente } from "@/lib/api";
import { cacheHomepage } from "@/lib/cache";
import { useStore } from "@/lib/store";
import { fmtLong, relativeDay, romeNow, toMin, todayIso } from "@/lib/time";
import { AreaHead, Panel, StatTile, puo, useLivello } from "../ui";
import { giornoLungo, isFinito, nomeCompleto, scopertiProssimi, turniDelGiorno, turniPronti, useTurni } from "../data-turni";
import "./panoramica.css";

/** stessa sequenza dei gruppi della barra laterale */
const SCORCIATOIE: { path: string; label: string; descr: string; icon: IconName; min: Livello }[] = [
  { path: "turni", label: "Turni", descr: "Scegli e gestisci i turni delle prossime quattro settimane.", icon: "calendar", min: 4 },
  { path: "presenze", label: "Presenze", descr: "Annota quante persone ci sono in aula durante il turno.", icon: "chart", min: 4 },
  { path: "orari", label: "Orari", descr: "Cambia gli orari di apertura dell'aula.", icon: "orari", min: 4 },
  { path: "manuale", label: "Manuale del turno", descr: "Apertura, chiusura, regole e contatti utili.", icon: "book", min: 4 },
  { path: "segnalazioni", label: "Segnalazioni", descr: "Leggi e gestisci le segnalazioni ricevute dal sito.", icon: "flag", min: 2 },
  { path: "telegram", label: "Notifiche Telegram", descr: "Classi, iscritti e promemoria di UFORObot.", icon: "bell", min: 2 },
  { path: "invia-telegram", label: "Debug Telegram", descr: "Messaggi al bot, chat ID e invio di prova.", icon: "send", min: 0 },
  { path: "eventi", label: "Eventi", descr: "Crea e modifica gli eventi, controlla i prenotati.", icon: "eventi", min: 2 },
  { path: "tesserati", label: "Tesserati", descr: "Il registro delle persone socie, con ricerca ed esportazione.", icon: "soci", min: 2 },
  { path: "verbali", label: "Verbali", descr: "L'archivio dei verbali delle assemblee.", icon: "document", min: 4 },
  { path: "contabilita", label: "Contabilità", descr: "Entrate, uscite e bilancio dell'associazione.", icon: "euro", min: 4 },
  { path: "utenti", label: "Utenti", descr: "Crea account e assegna i ruoli.", icon: "user", min: 1 },
  { path: "profilo", label: "Il mio profilo", descr: "I tuoi dati, il collegamento a Telegram e la password.", icon: "settings", min: 4 },
];

const ASSEMBLEA = "assemblee";

function saluto(min: number) {
  if (min < 5 * 60) return "Buonanotte";
  if (min < 13 * 60) return "Buongiorno";
  if (min < 18 * 60) return "Buon pomeriggio";
  return "Buonasera";
}

export default function Panoramica() {
  const utente = useUtenteCorrente();
  const livello = useLivello();
  const turni = useTurni();
  const stato = useStatoAula();
  const eventi = useEventi();
  // tutto dal server: finché non arriva (o non c'è l'ultima copia della homepage) si mostra il caricamento
  const turniOk = useStore(turniPronti);
  const sitoOk = useStore(homepagePronta) || !!cacheHomepage();
  const now = romeNow();
  const oggi = todayIso();

  const scoperti = useMemo(() => scopertiProssimi(turni).length, [turni, oggi]);
  const futuri = eventiFuturi(eventi, oggi);
  const riquadri = riquadriInEvidenza(eventi, futuri, oggi);
  const lab = statoLabel(stato);
  const turniOggi = turniDelGiorno(turni, oggi);
  const ruolo = LIVELLI[livello];
  const visibili = SCORCIATOIE.filter((s) => puo(livello, s.min));

  const inCorso = (t: { inizio: string; fine: string }) => toMin(t.inizio) <= now.minutes && now.minutes < toMin(t.fine);

  return (
    <div className="pan">
      <AreaHead
        eyebrow={giornoLungo(oggi)}
        title={`${saluto(now.minutes)}, ${utente?.nome ?? "benvenuta"}`}
        descr="Ecco cosa succede in aula oggi e cosa ti aspetta nei prossimi giorni."
        actions={
          <span className="pan__role" title={ruolo.descr}>
            <Icon name="shield" size={16} />
            {ruolo.label}
          </span>
        }
      />

      {sitoOk ? (
        <InEvidenza riquadri={riquadri} prenotati={postiPrenotati} livello={livello} />
      ) : (
        <div className="pan__top" aria-busy="true" aria-label="Caricamento degli eventi">
          <Skeleton h={260} />
          <Skeleton h={260} />
        </div>
      )}

      <div className="pan__cols">
        <div className="pan__stats">
          <StatTile
            icon="aula"
            label="Aula adesso"
            tone={sitoOk && stato.aperta ? "ok" : "default"}
            value={sitoOk ? lab.breve : <Skeleton h={30} w={110} />}
            hint={sitoOk ? lab.dettaglio : undefined}
          />
          <StatTile
            label="Turni scoperti"
            tone={!turniOk ? "default" : scoperti ? "avviso" : "ok"}
            value={turniOk ? scoperti : <Skeleton h={30} w={48} />}
            hint={!turniOk ? undefined : scoperti ? "Ancora da coprire nei prossimi 7 giorni. Apri i turni." : "Nei prossimi 7 giorni è tutto coperto."}
            to="/area/turni"
          />
        </div>

        <Panel title="Oggi in aula" actions={<Link className="link t-label" to="/area/turni">Tutti i turni</Link>}>
          {!turniOk ? (
            <div className="sh-fallback" aria-busy="true" aria-label="Caricamento dei turni di oggi">
              <Skeleton h={44} />
              <Skeleton h={44} />
            </div>
          ) : turniOggi.length === 0 ? (
            <p className="pan__vuoto">Oggi nessun turno è in programma. Se l'aula è aperta, controlla la pagina Turni.</p>
          ) : (
            <ol className="pan__seq">
              {turniOggi.map((t) => {
                const finito = isFinito(t.data, t.fine, now);
                const live = inCorso(t);
                return (
                  <li key={t.id} className={cx("pan__turno", finito && "is-finito", live && "is-live")}>
                    <span className="pan__ora t-mono">
                      {t.inizio}–{t.fine}
                    </span>
                    <span className="pan__dot" aria-hidden />
                    <Avatar name={nomeCompleto(t.userId)} size={34} />
                    <span className="pan__chi">
                      <strong>{nomeCompleto(t.userId)}</strong>
                      {t.note && <small>{t.note}</small>}
                    </span>
                    {live && <span className="tag tag--ok">In corso</span>}
                    {t.userId === utente?.id && !live && <span className="tag">Il tuo turno</span>}
                  </li>
                );
              })}
            </ol>
          )}
        </Panel>
      </div>

      <h2 className="t-h3 pan__sub">Vai a</h2>
      <div className="pan__grid">
        {visibili.map((s) => (
          <Link key={s.path} to={`/area/${s.path}`} className="pan__card">
            <span className="disc pan__ico">
              <Icon name={s.icon} size={20} />
            </span>
            <span className="pan__card-text">
              <strong>{s.label}</strong>
              <span>{s.descr}</span>
            </span>
            <Icon name="arrow-right" size={18} className="pan__arrow" />
          </Link>
        ))}
      </div>
    </div>
  );
}

const quando = (e: Evento) => `${fmtLong(e.data)} · ${e.ora}${e.oraFine ? `–${e.oraFine}` : ""}`;
const infoDi = (e: Evento, label: string) => e.info?.find((i) => i.label.toLowerCase() === label.toLowerCase())?.value;

/* ── in evidenza: due riquadri affiancati; quello sotto il mouse si allarga, come FORO e AGORÀ in homepage ── */
type Chiave = "primo" | "secondo";
type Riquadro = { evento?: Evento; tipo: "assemblea" | "evento"; scelto: boolean };

/**
 * Senza scelte in Gestisci eventi: la prossima assemblea e il prossimo evento, come prima.
 * Con una scelta: primo l'evento in evidenza 1, secondo quello in evidenza 2; un posto rimasto
 * libero si riempie con la prossima assemblea o il prossimo evento.
 */
function riquadriInEvidenza(eventi: Evento[], futuri: Evento[], oggi: string): [Riquadro, Riquadro] {
  const assemblea = futuri.find((e) => e.categoria === ASSEMBLEA);
  const prossimo = futuri.find((e) => e.categoria !== ASSEMBLEA);
  const s1 = eventoInEvidenza(eventi, 1, oggi);
  const s2 = eventoInEvidenza(eventi, 2, oggi);
  if (!s1 && !s2) {
    return [
      { evento: assemblea, tipo: "assemblea", scelto: false },
      { evento: prossimo, tipo: "evento", scelto: false },
    ];
  }
  const candidati = [assemblea, prossimo, ...futuri].filter((e): e is Evento => !!e);
  const e1 = s1 ?? candidati.find((e) => e.id !== s2?.id);
  const e2 = s2 ?? candidati.find((e) => e.id !== e1?.id);
  const r = (evento: Evento | undefined, scelto: boolean, vuoto: Riquadro["tipo"]): Riquadro => ({
    evento,
    scelto,
    tipo: evento ? (evento.categoria === ASSEMBLEA ? "assemblea" : "evento") : vuoto,
  });
  return [r(e1, !!s1, "assemblea"), r(e2, !!s2, "evento")];
}
type Espandi = {
  attivo: boolean;
  stacked: boolean;
  on: Pick<HTMLAttributes<HTMLElement>, "onMouseEnter" | "onMouseLeave" | "onFocus" | "onClick">;
};

function InEvidenza({ riquadri, prenotati, livello }: { riquadri: [Riquadro, Riquadro]; prenotati: (e: Evento) => number; livello: Livello }) {
  const stacked = useMedia("(max-width: 1100px)");
  const [attivo, setAttivo] = useState<Chiave>(riquadri[0].evento || !riquadri[1].evento ? "primo" : "secondo");
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  // un riquadro vuoto non si allarga; su schermi stretti i due si impilano, tutto visibile
  const espandi = (k: Chiave, pieno: boolean): Espandi => ({
    attivo: stacked || attivo === k,
    stacked,
    on:
      stacked || !pieno
        ? {}
        : {
            onMouseEnter: () => {
              window.clearTimeout(timer.current);
              timer.current = window.setTimeout(() => setAttivo(k), 110);
            },
            onMouseLeave: () => window.clearTimeout(timer.current),
            onFocus: () => setAttivo(k),
            onClick: () => setAttivo(k),
          },
  });

  return (
    <div className="pan__top" data-active={attivo} data-stacked={stacked || undefined}>
      {riquadri.map((r, i) => {
        const k: Chiave = i === 0 ? "primo" : "secondo";
        const n = r.evento ? prenotati(r.evento) : 0;
        const etichetta = r.scelto ? "In evidenza" : undefined;
        return r.tipo === "assemblea" ? (
          <ProssimaAssemblea key={k} evento={r.evento} confermati={n} etichetta={etichetta} livello={livello} {...espandi(k, !!r.evento)} />
        ) : (
          <ProssimoEvento key={k} evento={r.evento} prenotati={n} etichetta={etichetta} livello={livello} {...espandi(k, !!r.evento)} />
        );
      })}
    </div>
  );
}

/** il titolo è anche il comando che apre il riquadro (da tastiera) */
function Titolo({ testo, attivo, stacked, controls }: { testo: string; attivo: boolean; stacked: boolean; controls: string }) {
  if (stacked) return <>{testo}</>;
  return (
    <button type="button" className="pan-x__trigger" aria-expanded={attivo} aria-controls={controls}>
      {testo}
    </button>
  );
}

/** Le assemblee sono eventi con categoria "assemblee": si creano e convocano da Eventi. */
function ProssimaAssemblea({
  evento: e,
  confermati,
  etichetta = "Prossima assemblea",
  livello,
  attivo,
  stacked,
  on,
}: { evento?: Evento; confermati: number; etichetta?: string; livello: Livello } & Espandi) {
  const gestisce = puo(livello, 2);
  const detId = useId();
  if (!e) {
    return (
      <section className="pan-as pan-as--vuoto" aria-label="Prossima assemblea">
        <span className="t-label pan-as__eyebrow">Prossima assemblea</span>
        <p>Nessuna assemblea in calendario.</p>
        <div className="pan-as__cta">
          {gestisce && (
            <ButtonLink to="/area/eventi" variant="lanterna" size="sm" icon="plus">
              Convoca un'assemblea
            </ButtonLink>
          )}
          <ButtonLink to="/area/verbali" variant="outline-carta" size="sm" icon="document">
            Leggi i verbali
          </ButtonLink>
        </div>
      </section>
    );
  }
  const chiVota = infoDi(e, "Chi vota");
  return (
    <section className={cx("pan-as pan-x", attivo && "is-active")} aria-label={etichetta} {...on}>
      <div className="pan-x__sum">
        <span className="t-label pan-as__eyebrow">
          {etichetta} · {relativeDay(e.data)}
        </span>
        <h2 className="pan-as__title">
          <Titolo testo={e.titolo} attivo={attivo} stacked={stacked} controls={detId} />
        </h2>
        <p className="pan-as__when t-mono">{quando(e)}</p>
      </div>
      <div className="pan-x__fondo">
        <div id={detId} className="pan-x__det pan-as__det">
          {e.sottotitolo && <p className="pan-as__sub">{e.sottotitolo}</p>}
          <dl className="pan-as__facts">
            <div>
              <dt>Dove</dt>
              <dd>
                {e.luogo}
                <small>{e.indirizzo}</small>
              </dd>
            </div>
            {chiVota && (
              <div>
                <dt>Chi vota</dt>
                <dd>{chiVota}</dd>
              </div>
            )}
            {conPrenotazione(e) ? (
              <div>
                <dt>Presenze confermate</dt>
                <dd className="pan-as__count t-mono">{confermati}</dd>
              </div>
            ) : (
              <div>
                <dt>Ingresso</dt>
                <dd>Libero, senza prenotazione</dd>
              </div>
            )}
          </dl>
          <div className="pan-as__cta">
            {gestisce && (
              <ButtonLink to="/area/eventi" variant="lanterna" size="sm" icon="eventi">
                Gestisci l'assemblea
              </ButtonLink>
            )}
            <ButtonLink to="/area/verbali" variant="outline-carta" size="sm" icon="document">
              Verbali delle assemblee
            </ButtonLink>
          </div>
        </div>
        {!stacked && (
          <span className="pan-x__invito" aria-hidden>
            <Icon name="plus" size={16} /> Vedi l'assemblea
          </span>
        )}
      </div>
    </section>
  );
}

function ProssimoEvento({
  evento: e,
  prenotati,
  etichetta = "Prossimo evento",
  livello,
  attivo,
  stacked,
  on,
}: { evento?: Evento; prenotati: number; etichetta?: string; livello: Livello } & Espandi) {
  const gestisce = puo(livello, 2);
  const detId = useId();
  if (!e) {
    return (
      <section className="pan-ev pan-ev--vuoto" aria-label="Prossimo evento">
        <span className="t-label pan-ev__eyebrow">Prossimo evento</span>
        <p>Non ci sono eventi in programma.</p>
        {gestisce && (
          <ButtonLink to="/area/eventi" variant="outline" size="sm" icon="plus">
            Crea un evento
          </ButtonLink>
        )}
      </section>
    );
  }
  const liberi = e.postiMax ? Math.max(0, e.postiMax - prenotati) : null;
  const pct = e.postiMax ? Math.min(100, Math.round((prenotati / e.postiMax) * 100)) : 0;
  return (
    <section className={cx("pan-ev pan-x", attivo && "is-active")} aria-label={etichetta} {...on}>
      <div className="pan-x__sum pan-ev__main">
        <EventArt evento={e} ratio="4 / 5" className="pan-ev__art" />
        <div className="pan-ev__body">
          <span className="t-label pan-ev__eyebrow">
            {etichetta} · {relativeDay(e.data)}
          </span>
          <h3 className="pan-ev__title">
            <Titolo testo={e.titolo} attivo={attivo} stacked={stacked} controls={detId} />
          </h3>
          <p className="pan-ev__when t-mono">{quando(e)}</p>
        </div>
      </div>
      <div className="pan-x__fondo">
        <div id={detId} className="pan-x__det pan-ev__det">
          <div className="pan-ev__info">
            {e.sottotitolo && <p className="pan-ev__sub">{e.sottotitolo}</p>}
            <p className="pan-ev__where">
              {e.luogo}
              <small>{e.indirizzo}</small>
            </p>
          </div>
          {conPrenotazione(e) ? (
            <div className="pan-ev__seats">
              <div className="pan-ev__count">
                <b className="t-mono">{prenotati}</b>
                <span>{e.postiMax ? `prenotati su ${e.postiMax}` : "prenotati, senza limite di posti"}</span>
              </div>
              {e.postiMax > 0 && (
                <>
                  <div className="pan-ev__bar" role="img" aria-label={`${pct}% dei posti prenotati`}>
                    <span style={{ width: `${pct}%` }} />
                  </div>
                  <span className="pan-ev__free">{liberi === 0 ? "Posti esauriti" : `${liberi} ${liberi === 1 ? "posto libero" : "posti liberi"}`}</span>
                </>
              )}
            </div>
          ) : (
            <p className="pan-ev__aperto">
              <b>Senza prenotazione</b> · ingresso libero
            </p>
          )}
          {gestisce && (
            <Link className="link t-label pan-ev__link" to="/area/eventi">
              Gestisci gli eventi
            </Link>
          )}
        </div>
        {!stacked && (
          <span className="pan-x__invito" aria-hidden>
            <Icon name="plus" size={16} /> Vedi l'evento
          </span>
        )}
      </div>
    </section>
  );
}
