/**
 * Modifica orari (api/turni.js?action=orari). Settimana corrente e prossima, fasce modificabili, come
 * ModificaOrari.tsx della produzione: il chip "Aperta ora" del sito si aggiorna, e il messaggio per il
 * canale Telegram @aulastudioforo si compone con gli stessi 3 modelli e parte dal server.
 */
import { Fragment, useEffect, useMemo, useState, type ReactNode } from "react";
import { Alert, Button, Checkbox, Icon, Modal, Segmented, SelectField, Skeleton, TextArea, cx } from "@/components/ui";
import { toast } from "@/components/ui/Toast";
import type { FasciaOraria, OrariSettimane } from "@/data/types";
import { orariStore, useOrari } from "@/lib/api";
import { chiama } from "@/lib/server";
import { GIORNI, MESI, addDays, capitalize, isoToDate, mondayOf, toMin, todayIso } from "@/lib/time";
import { TELEGRAM } from "../data-gestione";
import { AreaHead, Empty, Panel } from "../ui";
import "./orari-admin.css";

type Sett = "current" | "next";
type Giorno = (typeof GIORNI)[number];
type Bozza = { key: string; start: string; end: string; note: string };
type Template = "settimana" | "weekend" | "straordinaria";
/** una fascia da mandare al server: senza id è nuova */
type FasciaDaSalvare = { id?: number; giorno: Giorno; ora_inizio: string; ora_fine: string; note?: string };

const PRE_START = "09:00";
const PRE_END = "19:30";
let bozzaN = 0;

/** "28 settembre – 4 ottobre" */
function rangeLabel(lunedi: string) {
  const a = isoToDate(lunedi);
  const b = isoToDate(addDays(lunedi, 6));
  const ma = MESI[a.getUTCMonth()];
  const mb = MESI[b.getUTCMonth()];
  return ma === mb ? `${a.getUTCDate()}–${b.getUTCDate()} ${mb}` : `${a.getUTCDate()} ${ma} – ${b.getUTCDate()} ${mb}`;
}
const ordina = (l: FasciaOraria[]) => [...l].sort((a, b) => toMin(a.ora_inizio) - toMin(b.ora_inizio));
const normFine = (v: string) => (v === "00:00" ? "24:00" : v);
/** chiave di selezione per il messaggio: gli id delle due settimane sono di due tabelle diverse e possono coincidere */
const chiaveSel = (sett: Sett, id: number) => `${sett}-${id}`;

/* ───────── server ───────── */

async function caricaOrari() {
  orariStore.set(await chiama<OrariSettimane>("turni", { query: { action: "orari" } }));
}
/** salva tutta la settimana: il server aggiorna le fasce con l'id, aggiunge quelle senza e toglie quelle mancanti */
async function salvaSettimana(settimana: Sett, fasce: FasciaDaSalvare[]) {
  const r = await chiama<OrariSettimane>("turni", {
    method: "PUT",
    query: { action: "orari" },
    body: {
      settimana,
      fasce: fasce.map((f) => ({ id: f.id, giorno: f.giorno, ora_inizio: f.ora_inizio, ora_fine: f.ora_fine, note: f.note?.trim() ?? "" })),
    },
  });
  orariStore.set(r);
}
const avvisaErrore = (e: unknown) => toast(e instanceof Error ? e.message : "Qualcosa non ha funzionato. Riprova tra poco.", "errore");

export default function OrariAdmin() {
  const orari = useOrari();
  const lunedi = mondayOf(todayIso());
  const lunProssimo = addDays(lunedi, 7);
  const [tab, setTab] = useState<Sett>("current");
  const [bozze, setBozze] = useState<Record<string, Bozza[]>>({});
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [chiusi, setChiusi] = useState<Set<string>>(new Set());
  const [tg, setTg] = useState(false);
  const [rimuovi, setRimuovi] = useState<{ sett: Sett; fascia: FasciaOraria } | null>(null);
  const [elimino, setElimino] = useState(false);
  const [salvo, setSalvo] = useState(false);
  const [ricarico, setRicarico] = useState(false);
  // come in produzione si riparte sempre dagli orari del server: le modifiche mandano la settimana intera
  const [stato, setStato] = useState<"carico" | "pronto" | "errore">("carico");

  useEffect(() => {
    caricaOrari()
      .then(() => setStato("pronto"))
      .catch((e) => {
        avvisaErrore(e);
        setStato("errore");
      });
  }, []);
  // le fasce che non ci sono più (eliminate qui o da altri) escono dalla selezione del messaggio
  useEffect(() => {
    const ci = new Set([...orari.current.map((f) => chiaveSel("current", f.id)), ...orari.next.map((f) => chiaveSel("next", f.id))]);
    setSel((p) => {
      const n = new Set([...p].filter((k) => ci.has(k)));
      return n.size === p.size ? p : n;
    });
  }, [orari]);

  const nBozze = Object.values(bozze).reduce((s, l) => s + l.length, 0);

  const aggiungi = (sett: Sett, g: Giorno) => {
    const k = `${sett}|${g}`;
    setBozze((p) => ({ ...p, [k]: [...(p[k] ?? []), { key: `b${++bozzaN}`, start: PRE_START, end: PRE_END, note: "" }] }));
    setChiusi((p) => {
      const n = new Set(p);
      n.delete(k);
      return n;
    });
  };
  const cambiaBozza = (k: string, key: string, patch: Partial<Bozza>) =>
    setBozze((p) => ({ ...p, [k]: (p[k] ?? []).map((b) => (b.key === key ? { ...b, ...patch } : b)) }));
  const togliBozza = (k: string, key: string) => setBozze((p) => ({ ...p, [k]: (p[k] ?? []).filter((b) => b.key !== key) }));

  const bozzeValide = Object.values(bozze).every((l) => l.every((b) => b.start && b.end && toMin(normFine(b.end)) > toMin(b.start)));

  const salvaNuove = async () => {
    if (!bozzeValide) {
      toast("Controlla gli orari delle fasce nuove: la fine deve essere dopo l'inizio.", "errore");
      return;
    }
    setSalvo(true);
    let salvate = 0;
    try {
      // una chiamata per settimana, con le fasce che ci sono già (e i loro id) più quelle nuove
      for (const s of ["current", "next"] as Sett[]) {
        const nuove = Object.entries(bozze)
          .filter(([k]) => k.startsWith(`${s}|`))
          .flatMap(([k, list]) =>
            list.map((b) => ({ giorno: k.split("|")[1] as Giorno, ora_inizio: b.start, ora_fine: normFine(b.end), note: b.note })),
          );
        if (!nuove.length) continue;
        await salvaSettimana(s, [...orariStore.get()[s], ...nuove]);
        salvate += nuove.length;
        setBozze((p) => Object.fromEntries(Object.entries(p).filter(([k]) => !k.startsWith(`${s}|`))));
      }
      toast(`Salvate ${salvate} ${salvate === 1 ? "fascia" : "fasce"}. Il sito pubblico è già aggiornato.`, "ok", "Orari");
    } catch (e) {
      avvisaErrore(e);
    } finally {
      setSalvo(false);
    }
  };

  const aggiorna = async (sett: Sett, id: number, patch: Partial<FasciaOraria>) => {
    try {
      await salvaSettimana(sett, orariStore.get()[sett].map((f) => (f.id === id ? { ...f, ...patch } : f)));
      toast("Fascia aggiornata. Il sito pubblico è già aggiornato.", "ok", "Orari");
      return true;
    } catch (e) {
      avvisaErrore(e);
      return false;
    }
  };
  const elimina = async () => {
    if (!rimuovi) return;
    const { sett, fascia } = rimuovi;
    setElimino(true);
    try {
      await salvaSettimana(sett, orariStore.get()[sett].filter((f) => f.id !== fascia.id));
      setRimuovi(null);
      toast("Fascia eliminata.", "ok", "Orari");
    } catch (e) {
      avvisaErrore(e);
    } finally {
      setElimino(false);
    }
  };
  const ricarica = async () => {
    setRicarico(true);
    try {
      await caricaOrari();
      setStato("pronto");
      toast("Orari ricaricati dal server.", "ok");
    } catch (e) {
      avvisaErrore(e);
    } finally {
      setRicarico(false);
    }
  };
  const toggleSel = (k: string) =>
    setSel((p) => {
      const n = new Set(p);
      if (n.has(k)) n.delete(k);
      else n.add(k);
      return n;
    });

  const colonne: { sett: Sett; titolo: string; lun: string }[] = [
    { sett: "current", titolo: "Settimana corrente", lun: lunedi },
    { sett: "next", titolo: "Prossima settimana", lun: lunProssimo },
  ];

  return (
    <div className="ora">
      <AreaHead
        eyebrow="Turno in aula"
        title="Modifica orari"
        descr="Quello che salvi qui compare subito sul sito, nell'elenco dei giorni e nel segnale di aula aperta o chiusa."
        actions={
          <>
            <Button variant="outline" icon="refresh" loading={ricarico} onClick={ricarica}>
              Ricarica dati
            </Button>
            <Button icon="telegram" disabled={sel.size === 0} onClick={() => setTg(true)}>
              Componi messaggio Telegram ({sel.size})
            </Button>
          </>
        }
      />

      <Segmented<Sett>
        className="ora-tabs"
        value={tab}
        onChange={setTab}
        options={[
          { value: "current", label: "Corrente" },
          { value: "next", label: "Prossima" },
        ]}
      />

      {stato === "errore" ? (
        <Panel>
          <Empty icon="alert" title="Non siamo riusciti a caricare gli orari.">
            Controlla la connessione, poi usa «Ricarica dati».
          </Empty>
        </Panel>
      ) : (
        <div className="ora-cols">
          {colonne.map((c) => (
            <section key={c.sett} className={cx("ora-col", tab === c.sett && "is-active")} aria-label={c.titolo}>
              <header className="ora-col__head">
                <span className="t-label ora-col__label">{c.titolo}</span>
                <h2 className="ora-col__range">{rangeLabel(c.lun)}</h2>
              </header>
              <div className="ora-days" aria-busy={stato === "carico" || undefined}>
                {stato === "carico"
                  ? GIORNI.map((g) => <Skeleton key={g} h={58} />)
                  : GIORNI.map((g, i) => {
                      const k = `${c.sett}|${g}`;
                      const iso = addDays(c.lun, i);
                      const fasce = ordina(orari[c.sett].filter((f) => f.giorno === g));
                      const bz = bozze[k] ?? [];
                      const chiuso = chiusi.has(k);
                      const oggi = iso === todayIso();
                      const d = isoToDate(iso);
                      return (
                        <Panel key={g} pad={false} className={cx("ora-day", oggi && "is-today")}>
                          <div className="ora-day__head">
                            <button
                              type="button"
                              className="ora-day__toggle"
                              aria-expanded={!chiuso}
                              onClick={() =>
                                setChiusi((p) => {
                                  const n = new Set(p);
                                  if (n.has(k)) n.delete(k);
                                  else n.add(k);
                                  return n;
                                })
                              }
                            >
                              <Icon name="chevron-down" size={18} className="ora-day__chev" />
                              {/* la data in evidenza, come un foglio di calendario */}
                              <span className="ora-day__data">
                                <b className="ora-day__n">{d.getUTCDate()}</b>
                                <span className="ora-day__m">{MESI[d.getUTCMonth()].slice(0, 3)}</span>
                              </span>
                              <span className="ora-day__label">
                                <strong className="ora-day__name">{capitalize(g)}</strong>
                                <span className="ora-day__full">
                                  {d.getUTCDate()} {MESI[d.getUTCMonth()]}
                                </span>
                              </span>
                              {oggi && <span className="tag ora-today">Oggi</span>}
                              <span className="ora-day__count t-mono" aria-label={`${fasce.length} fasce`}>
                                {fasce.length}
                              </span>
                            </button>
                            <Button size="sm" variant="ghost" icon="plus" onClick={() => aggiungi(c.sett, g)}>
                              Aggiungi
                            </Button>
                          </div>
                          {!chiuso && (
                            <div className="ora-day__body">
                              {fasce.length === 0 && bz.length === 0 && <p className="ora-vuoto">Nessun orario impostato per questo giorno.</p>}
                              {fasce.map((f) => (
                                <Fascia
                                  key={f.id}
                                  f={f}
                                  selezionata={sel.has(chiaveSel(c.sett, f.id))}
                                  onSel={() => toggleSel(chiaveSel(c.sett, f.id))}
                                  onSalva={(patch) => aggiorna(c.sett, f.id, patch)}
                                  onElimina={() => setRimuovi({ sett: c.sett, fascia: f })}
                                />
                              ))}
                              {bz.map((b) => {
                                const sbagliata = b.start && b.end && toMin(normFine(b.end)) <= toMin(b.start);
                                return (
                                  <div key={b.key} className="ora-new">
                                    <div className="ora-new__top">
                                      <span className="t-label">Nuova fascia</span>
                                      <button type="button" className="ora-x" onClick={() => togliBozza(k, b.key)} aria-label="Togli la fascia nuova">
                                        <Icon name="close" size={16} />
                                      </button>
                                    </div>
                                    <Orario
                                      start={b.start}
                                      end={b.end}
                                      note={b.note}
                                      onChange={(p) => cambiaBozza(k, b.key, p)}
                                      errore={sbagliata ? "La fine deve essere dopo l'inizio." : undefined}
                                    />
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </Panel>
                      );
                    })}
              </div>
            </section>
          ))}
        </div>
      )}

      {nBozze > 0 && (
        <div className="ora-save" role="status">
          <span>
            <Icon name="info" size={18} /> Hai delle fasce orarie non salvate.
          </span>
          <Button variant="lanterna" icon="check" loading={salvo} onClick={salvaNuove}>
            Salva nuovi orari
          </Button>
        </div>
      )}

      <Modal open={!!rimuovi} onClose={() => !elimino && setRimuovi(null)} title="Eliminare la fascia?" width={460}>
        {rimuovi && (
          <div className="ora-confirm">
            <p>
              Sei sicuro di voler eliminare questa fascia oraria? <span className="t-mono">{rimuovi.fascia.ora_inizio}–{rimuovi.fascia.ora_fine}</span> di {rimuovi.fascia.giorno}.
            </p>
            <div className="ora-foot">
              <Button variant="ghost" onClick={() => setRimuovi(null)} disabled={elimino}>
                Annulla
              </Button>
              <Button icon="trash" onClick={elimina} loading={elimino} className="ora-del-btn">
                Elimina fascia
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={tg} onClose={() => setTg(false)} title="Componi messaggio" width={960}>
        {tg && <Telegram orari={orari} sel={sel} lunedi={lunedi} onClose={() => setTg(false)} />}
      </Modal>
    </div>
  );
}

/* ───────── campi orario ───────── */

function Orario({
  start,
  end,
  note,
  onChange,
  errore,
}: {
  start: string;
  end: string;
  note: string;
  onChange: (p: { start?: string; end?: string; note?: string }) => void;
  errore?: string;
}) {
  return (
    <div className="ora-edit">
      <div className="ora-edit__times">
        <label>
          <span className="sr-only">Ora di inizio</span>
          <input type="time" className="input t-mono" value={start} onChange={(e) => onChange({ start: e.target.value })} />
        </label>
        <span aria-hidden>–</span>
        <label>
          <span className="sr-only">Ora di fine</span>
          <input type="time" className="input t-mono" value={end === "24:00" ? "00:00" : end} onChange={(e) => onChange({ end: e.target.value })} />
        </label>
      </div>
      <label className="ora-edit__note">
        <span className="sr-only">Nota</span>
        <input className="input" value={note} placeholder="Aggiungi nota (facoltativa)" onChange={(e) => onChange({ note: e.target.value })} />
      </label>
      {errore && (
        <span className="field__error" role="alert">
          {errore}
        </span>
      )}
    </div>
  );
}

function Fascia({
  f,
  selezionata,
  onSel,
  onSalva,
  onElimina,
}: {
  f: FasciaOraria;
  selezionata: boolean;
  onSel: () => void;
  /** true se il server l'ha salvata */
  onSalva: (p: Partial<FasciaOraria>) => Promise<boolean>;
  onElimina: () => void;
}) {
  const [mod, setMod] = useState(false);
  const [salvo, setSalvo] = useState(false);
  const [v, setV] = useState({ start: f.ora_inizio, end: f.ora_fine, note: f.note ?? "" });
  const errore = toMin(normFine(v.end)) <= toMin(v.start) ? "La fine deve essere dopo l'inizio." : undefined;

  if (mod)
    return (
      <div className="ora-fascia is-edit">
        <Orario start={v.start} end={v.end} note={v.note} errore={errore} onChange={(p) => setV((x) => ({ ...x, ...p }))} />
        <div className="ora-fascia__btns">
          <Button
            size="sm"
            icon="check"
            disabled={!!errore}
            loading={salvo}
            onClick={async () => {
              setSalvo(true);
              // se il server dice di no si resta nella modifica, con l'avviso
              const ok = await onSalva({ ora_inizio: v.start, ora_fine: normFine(v.end), note: v.note.trim() || undefined });
              setSalvo(false);
              if (ok) setMod(false);
            }}
          >
            Salva
          </Button>
          <Button
            size="sm"
            variant="ghost"
            disabled={salvo}
            onClick={() => {
              setV({ start: f.ora_inizio, end: f.ora_fine, note: f.note ?? "" });
              setMod(false);
            }}
          >
            Annulla
          </Button>
        </div>
      </div>
    );
  return (
    <div className={cx("ora-fascia", selezionata && "is-sel")}>
      <Checkbox
        className="ora-fascia__check"
        checked={selezionata}
        onChange={onSel}
        label={
          <span className="ora-fascia__txt">
            <span className="ora-badge t-mono">
              {f.ora_inizio}–{f.ora_fine}
            </span>
            {f.note && <span className="ora-fascia__note">{f.note}</span>}
          </span>
        }
      />
      <div className="ora-fascia__btns">
        <Button
          size="sm"
          variant="ghost"
          icon="edit"
          onClick={() => {
            // si parte sempre dai valori salvati
            setV({ start: f.ora_inizio, end: f.ora_fine, note: f.note ?? "" });
            setMod(true);
          }}
        >
          Modifica
        </Button>
        <Button size="sm" variant="ghost" icon="trash" className="ora-del" onClick={onElimina}>
          Elimina
        </Button>
      </div>
    </div>
  );
}

/* ───────── messaggio Telegram: i 3 modelli di ModificaOrari.tsx della produzione ───────── */

/** "5-11 ottobre" o "28 settembre - 4 ottobre", come getCurrentWeek/getNextWeek della produzione */
function settimanaTesto(lunedi: string) {
  const a = isoToDate(lunedi);
  const b = isoToDate(addDays(lunedi, 6));
  const ma = MESI[a.getUTCMonth()];
  if (a.getUTCMonth() === b.getUTCMonth()) return `${a.getUTCDate()}-${b.getUTCDate()} ${ma}`;
  return `${a.getUTCDate()} ${ma} - ${b.getUTCDate()} ${MESI[b.getUTCMonth()]}`;
}
/** come formatTime della produzione: "9.5" → "09:30", "09:00" resta com'è */
function formatTime(time: string) {
  if (time.includes(":")) return time;
  const hours = Math.floor(parseFloat(time));
  const minutes = Math.round((parseFloat(time) - hours) * 60);
  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
}

/** generateMessageText della produzione: le fasce scelte, raggruppate per nome del giorno */
function componi(t: Template, orari: OrariSettimane, sel: Set<string>, lunedi: string) {
  const scelte: FasciaOraria[] = [];
  let hasCurrent = false;
  let hasNext = false;
  sel.forEach((key) => {
    const [week, idStr] = key.split("-");
    const id = parseInt(idStr);
    if (week === "current") hasCurrent = true;
    if (week === "next") hasNext = true;
    const found = (week === "current" ? orari.current : orari.next).find((o) => o.id === id);
    if (found) scelte.push(found);
  });

  const dateRangeString = hasNext && !hasCurrent ? settimanaTesto(addDays(lunedi, 7)) : settimanaTesto(lunedi);
  const footer = `\nC'è sempre bisogno di una mano! \nPer aiutarci a tenere aperta l'Aula studio ed estendere gli orari di apertura entra in contatto con noi! www.foroets.com\nInstagram: @associazioneforo\nTelegram: @AAAdminForo`;

  let text = "";
  if (t === "settimana") text = `<b>ORARI DELLA SETTIMANA:</b>\n${dateRangeString}\n\n`;
  else if (t === "weekend") text = `<b>ORARI DEL WEEKEND:</b>\n\n`;
  else text = `<b>APERTURE STRAORDINARIE:</b>\n\n`;

  GIORNI.forEach((giorno) => {
    const fasce = scelte.filter((o) => o.giorno === giorno).sort((a, b) => a.ora_inizio.localeCompare(b.ora_inizio));
    if (fasce.length > 0) {
      const orariString = fasce
        .map((o) => {
          const times = `${formatTime(o.ora_inizio)}-${formatTime(o.ora_fine)}`;
          return o.note ? `${times} ${o.note}` : times;
        })
        .join(t === "settimana" ? " e " : ", ");
      text += `<b>${giorno.charAt(0).toUpperCase() + giorno.slice(1)}</b> \n${orariString}\n`;
    }
  });

  if (t === "settimana") {
    text += `\nL'aula Agorà per lo studio ad alta voce potrà essere utilizzata come mensa nella fascia oraria 12.30 - 14.30\n`;
  }
  return text + footer;
}

/** rende i tag <b> di Telegram in grassetto, il resto resta testo */
function render(testo: string): ReactNode {
  return testo.split(/(<b>[\s\S]*?<\/b>)/g).map((p, i) =>
    p.startsWith("<b>") ? <strong key={i}>{p.slice(3, -4)}</strong> : <Fragment key={i}>{p}</Fragment>,
  );
}

function Telegram({ orari, sel, lunedi, onClose }: { orari: OrariSettimane; sel: Set<string>; lunedi: string; onClose: () => void }) {
  const [modello, setModello] = useState<Template>("settimana");
  const [testo, setTesto] = useState(() => componi("settimana", orari, sel, lunedi));
  const [invio, setInvio] = useState(false);
  const [modificato, setModificato] = useState(false);
  const ora = useMemo(() => {
    const d = new Date();
    return d.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Rome" });
  }, []);

  const cambia = (t: Template) => {
    setModello(t);
    setTesto(componi(t, orari, sel, lunedi));
    setModificato(false);
  };
  const invia = async () => {
    if (!testo.trim()) return;
    setInvio(true);
    try {
      // il server lo manda al canale con parse_mode HTML, come oggi
      await chiama("turni", { method: "POST", query: { action: "avviso" }, body: { testo } });
      toast(`Messaggio inviato al canale ${TELEGRAM.canale}.`, "ok", "Telegram");
      onClose();
    } catch (e) {
      avvisaErrore(e);
      setInvio(false);
    }
  };

  return (
    <div className="ora-tg">
      <div className="ora-tg__edit">
        <SelectField
          label="Modello di messaggio"
          value={modello}
          onChange={(e) => cambia(e.target.value as Template)}
          options={[
            { value: "settimana", label: "Settimanale standard" },
            { value: "weekend", label: "Weekend" },
            { value: "straordinaria", label: "Apertura straordinaria" },
          ]}
        />
        <TextArea
          label="Testo del messaggio"
          rows={14}
          className="ora-tg__area"
          value={testo}
          onChange={(e) => (setTesto(e.target.value), setModificato(true))}
          hint="Usa <b>testo</b> per il grassetto. Puoi modificare tutto prima di inviare."
        />
        {modificato && (
          <Alert tone="avviso">Hai cambiato il testo a mano. Se scegli un altro modello, riparte dal testo automatico.</Alert>
        )}
      </div>

      <div className="ora-tg__prev" aria-label="Anteprima in Telegram">
        <span className="t-label">Anteprima</span>
        <div className="ora-tg__phone">
          <div className="ora-tg__bar">
            <span className="disc ora-tg__logo">
              <Icon name="telegram" size={18} />
            </span>
            <div>
              <strong>{TELEGRAM.nomeCanale}</strong>
              <span className="t-mono">{TELEGRAM.canale} · canale</span>
            </div>
          </div>
          <div className="ora-tg__chat">
            {testo.trim() ? (
              <div className="ora-bubble">
                <p>{render(testo)}</p>
                <span className="ora-bubble__meta t-mono">{ora}</span>
              </div>
            ) : (
              <Empty icon="send" title="Nessun testo">
                Scrivi qualcosa e lo vedi qui.
              </Empty>
            )}
          </div>
        </div>
      </div>

      <div className="ora-foot ora-tg__foot">
        <Button variant="ghost" onClick={onClose} disabled={invio}>
          Annulla
        </Button>
        <Button icon="send" loading={invio} disabled={!testo.trim()} onClick={invia}>
          Invia al canale
        </Button>
      </div>
    </div>
  );
}
