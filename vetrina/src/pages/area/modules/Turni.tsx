import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { Avatar, Button, Checkbox, Icon, Modal, SelectField, Skeleton, TextArea, TextField, cx } from "@/components/ui";
import { toast } from "@/components/ui/Toast";
import { ApiError, useUtenteCorrente } from "@/lib/api";
import { GIORNI_BREVI, MESI, addDays, capitalize, isoToDate, mondayOf, romeNow, toMin, weekdayOf } from "@/lib/time";
import { AreaHead, Empty } from "../ui";
import {
  FASCE,
  SETTIMANE_AVANTI,
  SETTIMANE_STORICO,
  caricaTurni,
  caricaUtenti,
  copertura,
  fasciaDi,
  giornoLungo,
  isChiusa,
  isFinito,
  nomeCompleto,
  prossimiTurni,
  rimuoviTurno,
  salvaTurno,
  turniDelGiorno,
  turniPronti,
  useTurni,
  useUtenti,
  type TurnoVol,
} from "../data-turni";
import "./turni.css";

type Editor = { turno?: TurnoVol; data: string; fascia: number; inizio?: string; fine?: string } | null;
type Adesso = ReturnType<typeof romeNow>;

/* ── griglia oraria, come la vista settimana di Google Calendar ── */
const INIZIO = 8 * 60; // la griglia parte alle 08:00, un'ora prima dell'apertura
const FINE = 24 * 60;
const ORE = Array.from({ length: (FINE - INIZIO) / 60 - 1 }, (_, i) => INIZIO / 60 + 1 + i); // etichette 09…23
const MESI3 = MESI.map((m) => capitalize(m.slice(0, 3)));

/** posizione e altezza in ore dall'inizio della griglia; --ph è l'altezza di un'ora */
const pos = (a: number, b: number, gap = 0): CSSProperties => ({
  top: `calc(${(a - INIZIO) / 60} * var(--ph) + ${gap}px)`,
  height: `calc(${(b - a) / 60} * var(--ph) - ${gap * 2}px)`,
});

/** l'ora di Roma, aggiornata ogni 30 secondi: sposta la linea di adesso e toglie i turni finiti */
function useAdesso() {
  const [now, setNow] = useState(() => romeNow());
  useEffect(() => {
    const id = window.setInterval(() => setNow(romeNow()), 30_000);
    return () => window.clearInterval(id);
  }, []);
  return now;
}

/** turni e nomi dal server; entrando nella pagina si riprendono, come in produzione, per vedere i cambi degli altri */
function useCaricamento() {
  const [stato, setStato] = useState<"carico" | "pronto" | "errore">(() => (turniPronti.get() ? "pronto" : "carico"));
  const carica = useCallback((forza: boolean) => {
    Promise.all([caricaTurni(forza), caricaUtenti()])
      .then(() => setStato("pronto"))
      .catch((e: Error) => {
        // con dei turni già in pagina basta l'avviso; senza, si mostra il riquadro per riprovare
        toast(e.message, "errore");
        setStato(turniPronti.get() ? "pronto" : "errore");
      });
  }, []);
  useEffect(() => carica(turniPronti.get()), [carica]);
  return {
    stato,
    riprova: () => {
      setStato("carico");
      carica(true);
    },
  };
}

export default function Turni() {
  const turni = useTurni();
  const { stato, riprova } = useCaricamento();
  const me = useUtenteCorrente();
  const now = useAdesso();
  const oggi = now.iso;
  const lunedi = mondayOf(oggi);
  const domenica = addDays(lunedi, 6);
  const giorni = useMemo(
    () => Array.from({ length: (SETTIMANE_STORICO + SETTIMANE_AVANTI) * 7 }, (_, i) => addDays(lunedi, i - SETTIMANE_STORICO * 7)),
    [lunedi],
  );
  const futuri = useMemo(() => giorni.filter((g) => g >= oggi), [giorni, oggi]);
  const [editor, setEditor] = useState<Editor>(null);

  // i tuoi turni di questa settimana che non sono ancora finiti
  const prossimi = useMemo(() => (me ? prossimiTurni(turni, me.id, now) : []), [turni, me, now]);
  const miei = prossimi.filter((t) => t.data <= domenica);
  const primoFeriale = futuri.find((g) => weekdayOf(g) < 5) ?? oggi;

  return (
    <div className="tu">
      <AreaHead
        eyebrow="Turni"
        title="Turni dell'aula"
        descr="Tocca uno spazio «Da coprire» per prenderti un turno, o un turno per modificarlo. Sabato, domenica e sera l'aula è chiusa: si apre solo con un turno straordinario."
        actions={
          <Button icon="plus" disabled={stato !== "pronto"} onClick={() => setEditor({ data: primoFeriale, fascia: 0 })}>
            Assegna turno
          </Button>
        }
      />

      {stato === "pronto" ? (
        <>
          <MieiTurni miei={miei} prossimo={miei.length ? undefined : prossimi[0]} onOpen={(t) => setEditor({ turno: t, data: t.data, fascia: fasciaDi(t.inizio) })} />

          <Calendario
            giorni={giorni}
            turni={turni}
            now={now}
            meId={me?.id}
            onOpen={(t) => setEditor({ turno: t, data: t.data, fascia: fasciaDi(t.inizio) })}
            onNew={(data, fascia, inizio, fine) => setEditor({ data, fascia, inizio, fine })}
          />
        </>
      ) : stato === "errore" ? (
        <section className="sh-gate" aria-label="Calendario dei turni">
          <Empty icon="alert" title="Non siamo riusciti a caricare i turni.">
            Controlla la connessione e riprova.
          </Empty>
          <Button variant="outline" size="sm" icon="refresh" onClick={riprova}>
            Riprova
          </Button>
        </section>
      ) : (
        <div className="sh-fallback" aria-busy="true" aria-label="Caricamento dei turni">
          <Skeleton h={52} />
          <Skeleton h={560} />
        </div>
      )}

      <EditorTurno editor={editor} onClose={() => setEditor(null)} meId={me?.id} giorni={futuri} />
    </div>
  );
}

/* ── i tuoi turni: solo questa settimana, quelli finiti spariscono ── */
function MieiTurni({ miei, prossimo, onOpen }: { miei: TurnoVol[]; prossimo?: TurnoVol; onOpen: (t: TurnoVol) => void }) {
  return (
    <section className="tu-mine" aria-labelledby="tu-mine-title">
      <h2 id="tu-mine-title" className="tu-mine__title">
        <Icon name="user" size={16} /> I tuoi turni questa settimana
      </h2>
      {miei.length ? (
        <ul className="tu-mine__list">
          {miei.map((t) => (
            <li key={t.id}>
              <button type="button" onClick={() => onOpen(t)}>
                <span className="tu-mine__d">{giornoLungo(t.data)}</span>
                <span className="tu-mine__h">
                  {t.inizio}–{t.fine}
                </span>
                {t.straordinario && <span className="tu-tag">Straordinario</span>}
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="tu-mine__vuoto">
          Nessun altro turno questa settimana.
          {prossimo && (
            <>
              {" "}Il prossimo è{" "}
              <button type="button" className="link" onClick={() => onOpen(prossimo)}>
                {giornoLungo(prossimo.data).toLowerCase()}, {prossimo.inizio}–{prossimo.fine}
              </button>
              .
            </>
          )}
        </p>
      )}
    </section>
  );
}

/* ── calendario: giorni in colonna, ore in riga; si apre su oggi e scorre avanti e indietro ── */
function Calendario({
  giorni,
  turni,
  now,
  meId,
  onOpen,
  onNew,
}: {
  giorni: string[];
  turni: TurnoVol[];
  now: Adesso;
  meId?: number;
  onOpen: (t: TurnoVol) => void;
  onNew: (data: string, fascia: number, inizio?: string, fine?: string) => void;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const raf = useRef(0);
  const idxOggi = Math.max(0, giorni.indexOf(now.iso));
  const [vis, setVis] = useState({ a: idxOggi, n: 7 });

  const larghezze = () => {
    const el = scroller.current;
    return {
      col: el?.querySelector<HTMLElement>(".tu-col")?.offsetWidth || 1,
      gutter: el?.querySelector<HTMLElement>(".tu-gutter")?.offsetWidth ?? 0,
    };
  };
  const vaiA = (i: number, smooth = true) => {
    const max = Math.max(0, giorni.length - vis.n);
    scroller.current?.scrollTo({ left: Math.min(max, Math.max(0, i)) * larghezze().col, behavior: smooth ? "smooth" : "auto" });
  };
  const misura = useCallback(() => {
    const el = scroller.current;
    if (!el) return;
    const { col, gutter } = larghezze();
    const n = Math.max(1, Math.round((el.clientWidth - gutter) / col));
    const a = Math.min(giorni.length - 1, Math.max(0, Math.round(el.scrollLeft / col)));
    setVis((v) => (v.a === a && v.n === n ? v : { a, n }));
  }, [giorni.length]);

  // all'apertura oggi è la prima colonna, subito dopo le ore
  useLayoutEffect(() => {
    const el = scroller.current;
    if (el) el.scrollLeft = idxOggi * larghezze().col;
    misura();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const ro = new ResizeObserver(misura);
    ro.observe(el);
    return () => {
      ro.disconnect();
      cancelAnimationFrame(raf.current);
    };
  }, [misura]);

  const primo = giorni[vis.a];
  const ultimo = giorni[Math.min(giorni.length - 1, vis.a + vis.n - 1)];
  const titolo = titoloPeriodo(primo, ultimo);
  const vediOggi = vis.a <= idxOggi && idxOggi < vis.a + vis.n;

  return (
    <section className="tu-cal" aria-label="Calendario dei turni">
      <div className="tu-cal__bar">
        <Button variant="outline" size="sm" onClick={() => vaiA(idxOggi)} aria-pressed={vis.a === idxOggi}>
          Oggi
        </Button>
        <div className="tu-cal__nav">
          <button type="button" className="tu-cal__arrow" onClick={() => vaiA(vis.a - vis.n)} disabled={vis.a === 0} aria-label="Giorni precedenti">
            <Icon name="chevron-left" size={20} />
          </button>
          <button
            type="button"
            className="tu-cal__arrow"
            onClick={() => vaiA(vis.a + vis.n)}
            disabled={vis.a + vis.n >= giorni.length}
            aria-label="Giorni successivi"
          >
            <Icon name="chevron-right" size={20} />
          </button>
        </div>
        <h2 className="tu-cal__title" aria-live="polite">
          {titolo}
        </h2>
        {!vediOggi && <span className="tu-cal__hint">Stai guardando {primo < now.iso ? "giorni passati" : "più avanti"}</span>}
        <Legenda />
      </div>

      <div
        ref={scroller}
        className="tu-cal__scroll"
        onScroll={() => {
          cancelAnimationFrame(raf.current);
          raf.current = requestAnimationFrame(misura);
        }}
        tabIndex={0}
        aria-label="Giorni del calendario: scorri a sinistra per tornare indietro"
      >
        <div className="tu-cal__grid" style={{ "--n": giorni.length } as CSSProperties}>
          <div className="tu-corner" aria-hidden />
          {giorni.map((iso) => (
            <Intestazione key={iso} iso={iso} oggi={now.iso} />
          ))}
          <div className="tu-gutter" aria-hidden>
            {ORE.map((o) => (
              <span key={o} style={{ top: `calc(${o - INIZIO / 60} * var(--ph))` }}>
                {String(o).padStart(2, "0")}:00
              </span>
            ))}
          </div>
          {giorni.map((iso) => (
            <Colonna key={iso} iso={iso} turni={turni} now={now} meId={meId} onOpen={onOpen} onNew={onNew} />
          ))}
        </div>
      </div>
    </section>
  );
}

/** "Ottobre 2026", "Set – Ott 2026", "Dic 2026 – Gen 2027" */
function titoloPeriodo(a: string, b: string) {
  const da = isoToDate(a);
  const db = isoToDate(b);
  const [ma, mb, ya, yb] = [da.getUTCMonth(), db.getUTCMonth(), da.getUTCFullYear(), db.getUTCFullYear()];
  if (ma === mb && ya === yb) return `${capitalize(MESI[ma])} ${ya}`;
  if (ya === yb) return `${MESI3[ma]} – ${MESI3[mb]} ${ya}`;
  return `${MESI3[ma]} ${ya} – ${MESI3[mb]} ${yb}`;
}

function Intestazione({ iso, oggi }: { iso: string; oggi: string }) {
  const wd = weekdayOf(iso);
  const d = isoToDate(iso);
  return (
    <div className={cx("tu-dh", iso === oggi && "is-today", iso < oggi && "is-past", wd === 0 && "is-lun", wd >= 5 && "is-weekend")} aria-hidden>
      <span className="tu-dh__wd">{GIORNI_BREVI[wd]}</span>
      <span className="tu-dh__n">{d.getUTCDate()}</span>
      {d.getUTCDate() === 1 && <span className="tu-dh__m">{MESI3[d.getUTCMonth()]}</span>}
    </div>
  );
}

function Colonna({
  iso,
  turni,
  now,
  meId,
  onOpen,
  onNew,
}: {
  iso: string;
  turni: TurnoVol[];
  now: Adesso;
  meId?: number;
  onOpen: (t: TurnoVol) => void;
  onNew: (data: string, fascia: number, inizio?: string, fine?: string) => void;
}) {
  const wd = weekdayOf(iso);
  const lista = turniDelGiorno(turni, iso);
  return (
    <div
      className={cx("tu-col", wd === 0 && "is-lun", wd >= 5 && "is-weekend", iso === now.iso && "is-today", iso < now.iso && "is-past")}
      role="group"
      aria-label={giornoLungo(iso)}
    >
      {FASCE.map((f) => (
        <Fascia key={f.index} iso={iso} fascia={f.index} lista={lista} now={now} onNew={onNew} />
      ))}
      {lista.map((t) => (
        <Blocco key={t.id} t={t} now={now} mine={t.userId === meId} onOpen={onOpen} />
      ))}
      {iso === now.iso && now.minutes >= INIZIO && <span className="tu-now" style={{ top: `calc(${(now.minutes - INIZIO) / 60} * var(--ph))` }} aria-hidden />}
    </div>
  );
}

/** sfondo di una fascia (aperta o chiusa) e, nel futuro, gli spazi ancora da coprire */
function Fascia({
  iso,
  fascia,
  lista,
  now,
  onNew,
}: {
  iso: string;
  fascia: number;
  lista: TurnoVol[];
  now: Adesso;
  onNew: (data: string, fascia: number, inizio?: string, fine?: string) => void;
}) {
  const f = FASCE[fascia];
  const a = toMin(f.start);
  const b = toMin(f.end);
  const finita = isFinito(iso, f.end, now);

  if (isChiusa(iso, fascia)) {
    const occupata = lista.some((t) => fasciaDi(t.inizio) === fascia);
    if (finita || occupata) return <div className="tu-band tu-band--chiusa" style={pos(a, b)} aria-hidden />;
    return (
      <button
        type="button"
        className="tu-band tu-band--chiusa is-action"
        style={pos(a, b)}
        onClick={() => onNew(iso, fascia)}
        aria-label={`${giornoLungo(iso)}, ${f.label.toLowerCase()} ${f.start}–${f.end}: aula chiusa. Apri un turno straordinario`}
      >
        <span>Chiuso</span>
        <small>
          <Icon name="plus" size={12} /> Straordinario
        </small>
      </button>
    );
  }

  const buchi = finita ? [] : copertura(lista, iso, fascia).buchi.filter((g) => !isFinito(iso, g.end, now));
  return (
    <>
      <div className="tu-band" style={pos(a, b)} aria-hidden />
      {buchi.map((g) => (
        <button
          key={g.start}
          type="button"
          className="tu-gap"
          style={pos(toMin(g.start), toMin(g.end), 1)}
          onClick={() => onNew(iso, fascia, g.start, g.end)}
          aria-label={`${giornoLungo(iso)}, ${g.start}–${g.end}: turno da coprire. Prendilo`}
        >
          <span>
            <Icon name="plus" size={13} /> Da coprire
          </span>
          <small>
            {g.start}–{g.end}
          </small>
        </button>
      ))}
    </>
  );
}

/** un turno nella griglia; quelli finiti restano visibili ma non si modificano */
function Blocco({ t, now, mine, onOpen }: { t: TurnoVol; now: Adesso; mine: boolean; onOpen: (t: TurnoVol) => void }) {
  const a = toMin(t.inizio);
  const b = toMin(t.fine);
  const finito = isFinito(t.data, t.fine, now);
  const inCorso = !finito && t.data === now.iso && a <= now.minutes;
  const nome = nomeCompleto(t.userId);
  const cls = cx("tu-ev", mine && "is-mine", t.straordinario && "is-str", finito && "is-past", inCorso && "is-live");
  const body = (
    <>
      <span className="tu-ev__nome">{nome}</span>
      <span className="tu-ev__h">
        {t.inizio}–{t.fine}
      </span>
      {t.straordinario && <span className="tu-ev__tag">Straordinario</span>}
      {t.note && <span className="tu-ev__note">{t.note}</span>}
    </>
  );
  if (finito) {
    return (
      <div className={cls} style={pos(a, b, 1)} title={`${nome}, ${t.inizio}–${t.fine}`}>
        {body}
      </div>
    );
  }
  return (
    <button
      type="button"
      className={cls}
      style={pos(a, b, 1)}
      onClick={() => onOpen(t)}
      aria-label={`${nome}, ${giornoLungo(t.data)} ${t.inizio}–${t.fine}${t.straordinario ? ", straordinario" : ""}${inCorso ? ", in corso" : ""}. Modifica turno`}
    >
      {body}
    </button>
  );
}

function Legenda() {
  return (
    <div className="tu-legend" aria-hidden>
      <span><i className="tu-sw tu-sw--mio" />Il tuo turno</span>
      <span><i className="tu-sw tu-sw--ass" />Assegnato</span>
      <span><i className="tu-sw tu-sw--str" />Straordinario</span>
      <span><i className="tu-sw tu-sw--lib" />Da coprire</span>
      <span><i className="tu-sw tu-sw--chiuso" />Chiuso</span>
    </div>
  );
}

/* ── modale assegna / modifica ── */
/** campi del modulo che mostrano il loro errore; gli altri errori vanno sotto, in generale */
const CAMPI = ["data", "inizio", "fine", "userId"];

function EditorTurno({ editor, onClose, meId, giorni }: { editor: Editor; onClose: () => void; meId?: number; giorni: string[] }) {
  const open = !!editor;
  const utenti = useUtenti();
  const [data, setData] = useState("");
  const [fascia, setFascia] = useState("0");
  const [inizio, setInizio] = useState("");
  const [fine, setFine] = useState("");
  const [userId, setUserId] = useState<number | undefined>(meId);
  const [q, setQ] = useState("");
  const [note, setNote] = useState("");
  /** casella "Turno straordinario": null = segue la fascia (selezionata se di solito è chiusa), poi decide chi compila */
  const [scelta, setScelta] = useState<boolean | null>(null);
  const [err, setErr] = useState<{ msg: string; field?: string } | null>(null);
  const [busy, setBusy] = useState<"save" | "del" | null>(null);

  useEffect(() => {
    if (!editor) return;
    const f = FASCE[editor.fascia];
    const t = editor.turno;
    setData(editor.data);
    setFascia(String(editor.fascia));
    setInizio(t?.inizio ?? editor.inizio ?? f.start);
    setFine(t?.fine ?? editor.fine ?? f.end);
    setUserId(t?.userId ?? meId);
    setNote(t?.note ?? "");
    setScelta(t ? !!t.straordinario : null);
    setQ("");
    setErr(null);
    setBusy(null);
  }, [editor, meId]);

  const modifica = !!editor?.turno;
  const chiusa = !!data && !!inizio && isChiusa(data, fasciaDi(/^\d\d:\d\d$/.test(inizio) ? inizio : FASCE[Number(fascia)].start));
  const straordinario = scelta ?? chiusa;
  const cerca = q.trim().toLowerCase();
  const persone = utenti.filter((u) => `${u.nome} ${u.cognome}`.toLowerCase().includes(cerca) || u.username.toLowerCase().includes(cerca));

  const cambiaFascia = (v: string) => {
    setFascia(v);
    setInizio(FASCE[Number(v)].start);
    setFine(FASCE[Number(v)].end);
    setErr(null);
  };
  const fieldErr = (name: string) => (err?.field === name ? err.msg : null);

  async function salva() {
    if (!userId) return setErr({ msg: "Scegli la persona che prende il turno.", field: "userId" });
    setBusy("save");
    setErr(null);
    try {
      await salvaTurno({ data, inizio, fine, userId, note, straordinario }, editor?.turno?.id);
      toast(
        modifica ? `Turno aggiornato: ${nomeCompleto(userId)}, ${inizio}–${fine}.` : `${nomeCompleto(userId)} è di turno ${giornoLungo(data).toLowerCase()}, ${inizio}–${fine}.`,
        "ok",
        modifica ? "Turno modificato" : "Turno assegnato",
      );
      onClose();
    } catch (e) {
      const a = e instanceof ApiError ? e : null;
      // sovrapposto a un turno appena preso, o già tolto: si riprende il calendario per mostrarlo com'è adesso
      if (a?.status === 409 || a?.status === 404) void caricaTurni(true).catch(() => undefined);
      setErr({ msg: a?.message ?? "Non siamo riusciti a salvare il turno. Riprova tra un attimo.", field: a?.field });
      setBusy(null);
    }
  }
  async function rimuovi() {
    if (!editor?.turno) return;
    setBusy("del");
    setErr(null);
    try {
      await rimuoviTurno(editor.turno.id);
      toast("Il turno è stato rimosso e la fascia torna disponibile.", "ok", "Turno rimosso");
      onClose();
    } catch (e) {
      // già tolto da qualcun altro: dal calendario è sparito, lo si dice e si chiude
      if (e instanceof ApiError && e.status === 404) {
        toast(e.message, "info");
        return onClose();
      }
      setErr({ msg: e instanceof Error ? e.message : "Non siamo riusciti a rimuovere il turno." });
      setBusy(null);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={modifica ? "Modifica turno" : "Assegna turno"} width={620}>
      <form
        className="tu-form"
        onSubmit={(e) => {
          e.preventDefault();
          void salva();
        }}
        noValidate
      >
        <div className="tu-form__row">
          <SelectField
            label="Data"
            value={data}
            onChange={(e) => { setData(e.target.value); setErr(null); }}
            options={giorni.map((g) => ({ value: g, label: giornoLungo(g) }))}
            error={fieldErr("data")}
          />
          <SelectField
            label="Fascia"
            value={fascia}
            onChange={(e) => cambiaFascia(e.target.value)}
            options={FASCE.map((f) => ({ value: String(f.index), label: `${f.label} · ${f.start}–${f.end}` }))}
          />
        </div>
        <div className="tu-form__row">
          <TextField label="Dalle" value={inizio} onChange={(e) => { setInizio(e.target.value); setErr(null); }} placeholder="09:00" inputMode="numeric" maxLength={5} error={fieldErr("inizio")} />
          <TextField label="Alle" value={fine} onChange={(e) => { setFine(e.target.value); setErr(null); }} placeholder="13:00" inputMode="numeric" maxLength={5} error={fieldErr("fine")} />
        </div>
        <p className="tu-form__hint">Puoi accorciare il turno o dividerlo con un'altra persona: cambia gli orari e lascia libero il resto della fascia.</p>

        <fieldset className="tu-persone">
          <legend className="field__label">Persona di turno</legend>
          <div className="tu-persone__search">
            <Icon name="search" size={16} />
            <input className="input" type="search" placeholder="Cerca per nome" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Cerca una persona" />
          </div>
          <div className="tu-persone__list" role="radiogroup" aria-label="Persona di turno" aria-busy={utenti.length === 0 || undefined}>
            {/* le persone arrivano dal server insieme ai turni */}
            {utenti.length === 0 ? (
              [0, 1, 2, 3].map((i) => <Skeleton key={i} h={44} />)
            ) : (
              persone.length === 0 && <span className="tu-persone__none">Nessuna persona con questo nome.</span>
            )}
            {persone.map((u) => (
              <button
                key={u.id}
                type="button"
                role="radio"
                aria-checked={userId === u.id}
                className={cx("tu-persona", userId === u.id && "is-on")}
                onClick={() => { setUserId(u.id); setErr(null); }}
              >
                <Avatar name={`${u.nome} ${u.cognome}`} size={28} />
                <span>{u.nome} {u.cognome}{u.id === meId && <em> · tu</em>}</span>
                {userId === u.id && <Icon name="check" size={16} />}
              </button>
            ))}
          </div>
          {fieldErr("userId") && <span className="field__error" role="alert"><Icon name="alert" size={15} /> {fieldErr("userId")}</span>}
        </fieldset>

        {/* come in produzione: casella "straordinario" (is_closed_override) e nota, che per un turno straordinario fa da motivo */}
        <Checkbox
          checked={straordinario}
          onChange={(e) => { setScelta(e.target.checked); setErr(null); }}
          label="Turno straordinario"
        />
        <p className="tu-form__hint">
          {chiusa
            ? "Sabato, domenica e sera l'aula di solito è chiusa: questo turno la apre in via straordinaria."
            : "Selezionala se il turno apre l'aula fuori dal solito orario."}
        </p>
        <TextArea
          label={straordinario ? "Motivo dell'apertura straordinaria" : "Note"}
          optional
          rows={2}
          value={note}
          onChange={(e) => { setNote(e.target.value); setErr(null); }}
          placeholder={straordinario ? "Ad esempio: sessione d'esami" : "Ad esempio: porto io le chiavi dell'AGORÀ"}
          hint={straordinario ? "La nota arriva su Telegram a chi organizza le aperture, come motivo della richiesta." : undefined}
        />

        {err && (!err.field || !CAMPI.includes(err.field)) && (
          <p className="tu-err" role="alert"><Icon name="alert" size={16} /> {err.msg}</p>
        )}

        <div className="tu-form__actions">
          {modifica && (
            <Button type="button" variant="ghost" icon="trash" onClick={() => void rimuovi()} loading={busy === "del"} disabled={busy === "save"} className="tu-del">
              Rimuovi
            </Button>
          )}
          <span className="tu-form__sp" />
          <Button type="button" variant="outline" onClick={onClose} disabled={!!busy}>Annulla</Button>
          <Button type="submit" loading={busy === "save"} disabled={busy === "del"}>Salva</Button>
        </div>
      </form>
    </Modal>
  );
}
