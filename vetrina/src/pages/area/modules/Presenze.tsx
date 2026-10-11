import { useEffect, useMemo, useState } from "react";
import { Button, Icon, Modal, Skeleton, TextArea, cx } from "@/components/ui";
import { toast } from "@/components/ui/Toast";
import { useStore } from "@/lib/store";
import { ApiError, useUtenteCorrente } from "@/lib/api";
import { GIORNI_BREVI, MESI, capitalize, todayIso, weekdayOf } from "@/lib/time";
import { AreaHead, Empty, Panel, StatTile, puo, useLivello } from "../ui";
import {
  FASCE_P,
  caricaPresenze,
  eliminaPresenza,
  fmtQuando,
  giorniDelMese,
  mesiDisponibili,
  nomeUtente,
  pkey,
  presenzeStore,
  salvaPresenza,
  spostaMese,
  statisticheMese,
  type FasciaKey,
  type RegPresenza,
} from "../data-gestione";
import { useUtenti } from "../data-turni";
import { caricaStorico, datiReport, nomeDelMese, scaricaReportPresenze } from "../report-presenze";
import "./presenze.css";

const it = (n: number) => n.toLocaleString("it-IT");

/** primo e ultimo giorno del mese "YYYY-MM" */
function periodo(ym: string) {
  const g = giorniDelMese(ym);
  return { dal: g[0], al: g[g.length - 1] };
}

/** mesi arrivati dal server in questa visita: tornandoci si vedono subito, intanto si aggiornano */
const arrivati = new Set<string>();

/** scarica il mese mostrato ogni volta che lo si apre, come in produzione */
function useMese(ym: string) {
  const [, setArrivato] = useState(0);
  const [errore, setErrore] = useState(false);
  const [tentativo, setTentativo] = useState(0);
  useEffect(() => {
    let vivo = true;
    const { dal, al } = periodo(ym);
    setErrore(false);
    caricaPresenze(dal, al, true)
      .then(() => {
        arrivati.add(ym);
        if (vivo) setArrivato((n) => n + 1);
      })
      .catch((e: Error) => {
        if (!vivo) return;
        toast(e.message, "errore");
        setErrore(true);
      });
    return () => {
      vivo = false;
    };
  }, [ym, tentativo]);
  return { pronto: arrivati.has(ym), errore, riprova: () => setTentativo((n) => n + 1) };
}

export default function Presenze() {
  const reg = useStore(presenzeStore);
  const me = useUtenteCorrente();
  const oggi = todayIso();
  const ymOggi = oggi.slice(0, 7);
  const [ym, setYm] = useState(oggi.slice(8) <= "07" ? spostaMese(ymOggi, -1) : ymOggi);
  const [edit, setEdit] = useState<{ iso: string; f: FasciaKey } | null>(null);
  const [report, setReport] = useState(false);
  const livello = useLivello();
  const { pronto, errore, riprova } = useMese(ym);

  const { righe, ...stat } = useMemo(() => statisticheMese(ym, reg), [ym, reg]);

  const maxCella = Math.max(1, stat.max.n);
  const maxFascia = Math.max(1, ...stat.perFascia.map((f) => f.somma));
  const nomeMese = nomeDelMese(ym);
  const giornoBreve = (iso: string) => `${Number(iso.slice(8))} ${MESI[Number(iso.slice(5, 7)) - 1].slice(0, 3)}`;

  return (
    <div className="pr">
      <AreaHead
        eyebrow="Presenze"
        title="Presenze in aula"
        descr="Quante persone ci sono in aula a ogni fascia. Scegli una cella per registrare il numero o correggerlo."
        actions={
          /* come in produzione (presenze.tsx:296): il report lo scaricano solo i livelli 0 e 1 */
          puo(livello, 1) && (
            <Button variant="outline" icon="download" onClick={() => setReport(true)}>
              Scarica il report PDF
            </Button>
          )
        }
      />

      <div className="pr-nav">
        <button type="button" className="pr-nav__btn" onClick={() => setYm(spostaMese(ym, -1))} aria-label="Mese precedente">
          <Icon name="chevron-left" size={20} />
        </button>
        <h2 className="pr-nav__title">{nomeMese}</h2>
        <button type="button" className="pr-nav__btn" onClick={() => setYm(spostaMese(ym, 1))} disabled={ym >= ymOggi} aria-label="Mese successivo">
          <Icon name="chevron-right" size={20} />
        </button>
        {ym !== ymOggi && (
          <Button size="sm" variant="ghost" onClick={() => setYm(ymOggi)}>
            Torna a questo mese
          </Button>
        )}
      </div>

      <div className="pr-main">
        <Panel
          pad={false}
          title="Giorno per giorno"
          actions={
            <div className="pr-scale" aria-hidden>
              <span>meno</span>
              <i style={{ background: "rgba(12,73,91,.12)" }} />
              <i style={{ background: "rgba(12,73,91,.4)" }} />
              <i style={{ background: "rgba(12,73,91,.7)" }} />
              <i style={{ background: "rgba(12,73,91,1)" }} />
              <span>più</span>
            </div>
          }
        >
          {!pronto ? (
            errore ? (
              <div style={{ display: "grid", justifyItems: "center", paddingBottom: 32 }}>
                <Empty icon="alert" title={`Non siamo riusciti a caricare le presenze di ${nomeMese.toLowerCase()}.`}>
                  Controlla la connessione e riprova.
                </Empty>
                <Button variant="outline" size="sm" icon="refresh" onClick={riprova}>
                  Riprova
                </Button>
              </div>
            ) : (
              <div className="sh-fallback" aria-busy="true" aria-label={`Caricamento delle presenze di ${nomeMese.toLowerCase()}`} style={{ padding: 16 }}>
                {Array.from({ length: 10 }, (_, i) => (
                  <Skeleton key={i} h={34} />
                ))}
              </div>
            )
          ) : (
            <div className="table-scroll">
              <table className="pr-table">
                <thead>
                  <tr>
                    <th>Giorno</th>
                    {FASCE_P.map((f) => (
                      <th key={f.key} className="pr-th-f">
                        {f.label}
                      </th>
                    ))}
                    <th className="pr-th-f">Tot</th>
                  </tr>
                </thead>
                <tbody>
                  {righe.map((r) => {
                    const futuro = r.iso > oggi;
                    return (
                      <tr key={r.iso} className={cx(r.wd >= 5 && "is-weekend", r.iso === oggi && "is-today")}>
                        <th scope="row" className="pr-day">
                          <span className="pr-day__in">
                            <span className="pr-day__n">{Number(r.iso.slice(8))}</span>
                            <span className="pr-day__w">{GIORNI_BREVI[r.wd]}</span>
                          </span>
                        </th>
                        {FASCE_P.map((f) => {
                          const v = reg[pkey(r.iso, f.key)];
                          const ratio = v ? v.numero / maxCella : 0;
                          return (
                            <td key={f.key} className="pr-c">
                              <button
                                type="button"
                                className={cx("pr-cell", !v && "is-empty", ratio > 0.5 && "is-dark")}
                                style={v ? { background: `rgba(12,73,91,${(0.1 + ratio * 0.9).toFixed(2)})` } : undefined}
                                disabled={futuro}
                                onClick={() => setEdit({ iso: r.iso, f: f.key })}
                                aria-label={`${r.iso}, fascia ${f.label}: ${v ? v.numero + " persone" : "non registrato"}`}
                              >
                                {v ? v.numero : futuro ? "" : "·"}
                                {v?.note && <i className="pr-cell__note" aria-hidden />}
                              </button>
                            </td>
                          );
                        })}
                        <td className="pr-tot">{r.tot ?? ""}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Panel>

        <aside className="pr-side" aria-label={`Statistiche di ${nomeMese}`}>
          <div className="pr-stats" aria-busy={!pronto || undefined}>
            {!pronto ? (
              [0, 1, 2, 3].map((i) => <Skeleton key={i} h={104} />)
            ) : (
              <>
                <StatTile label="Totale del mese" icon="user" tone="petrolio" value={it(stat.totale)} hint={`${stat.giorniAperti} ${stat.giorniAperti === 1 ? "giorno" : "giorni"} con dati`} />
                <StatTile label="Media giornaliera" icon="chart" value={stat.media ? stat.media.toFixed(1).replace(".", ",") : "–"} hint="Persone per giorno di apertura" />
                <StatTile label="Massimo contemporaneo" icon="seat" value={stat.max.n || "–"} hint={stat.max.n ? `${giornoBreve(stat.max.iso)}, fascia ${stat.max.f}` : "Nessuna registrazione"} />
                <StatTile label="Giorno record" icon="sparkle" value={stat.record ? giornoBreve(stat.record.iso) : "–"} hint={stat.record ? `${stat.record.tot} persone in totale` : "Nessuna registrazione"} />
              </>
            )}
          </div>
          <Panel title="Per fascia">
            <ul className="pr-bars">
              {stat.perFascia.map((f) => (
                <li key={f.key}>
                  <div className="pr-bars__top">
                    <span>
                      <b>{f.nome}</b> <small>{f.label}</small>
                    </span>
                    <span className="pr-bars__v">{it(f.somma)}</span>
                  </div>
                  <div className="pr-bars__track">
                    <span style={{ width: `${(f.somma / maxFascia) * 100}%` }} />
                  </div>
                  <small className="pr-bars__m">{f.giorni ? `${(f.somma / f.giorni).toFixed(1).replace(".", ",")} a fascia` : "Nessun dato"}</small>
                </li>
              ))}
            </ul>
          </Panel>
          <Panel title="Come si conta">
            <p className="pr-how">
              Il totale del giorno è la mattina, più la fascia più piena tra pranzo e pomeriggio, più la sera. Chi resta tutto il pomeriggio si conta una volta sola.
            </p>
            <p className="pr-formula">[9–13] + max([13–16], [16–19]) + [21–24]</p>
          </Panel>
        </aside>
      </div>

      <EditorPresenza edit={edit} onClose={() => setEdit(null)} meId={me?.id} />
      <ScaricaReport open={report} onClose={() => setReport(false)} reg={reg} meseVisto={ym} autore={me ? `${me.nome} ${me.cognome}` : undefined} />
    </div>
  );
}

/* ───────── report PDF: si scelgono i mesi, tutti nello stesso file ───────── */
function ScaricaReport({
  open,
  onClose,
  reg,
  meseVisto,
  autore,
}: {
  open: boolean;
  onClose: () => void;
  reg: Record<string, RegPresenza>;
  meseVisto: string;
  autore?: string;
}) {
  const mesi = useMemo(() => mesiDisponibili(reg), [reg]);
  const info = useMemo(
    () =>
      Object.fromEntries(
        mesi.map((m) => {
          const st = statisticheMese(m, reg);
          return [m, { giorni: st.giorniAperti, totale: st.totale }];
        }),
      ),
    [mesi, reg],
  );
  const conDati = mesi.filter((m) => info[m].giorni > 0);
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  // per sapere quali mesi hanno dati serve tutto lo storico: arriva una volta, all'apertura
  const [stato, setStato] = useState<"carico" | "pronto" | "errore">("carico");
  useEffect(() => {
    if (!open) return;
    let vivo = true;
    setStato((s) => (s === "pronto" ? s : "carico"));
    caricaStorico()
      .then(() => vivo && setStato("pronto"))
      .catch((e: Error) => {
        if (!vivo) return;
        toast(e.message, "errore");
        setStato("errore");
      });
    return () => {
      vivo = false;
    };
  }, [open]);
  useEffect(() => {
    if (open && stato === "pronto") setSel(new Set(info[meseVisto]?.giorni ? [meseVisto] : conDati.slice(0, 1)));
  }, [open, stato]); // eslint-disable-line react-hooks/exhaustive-deps

  const anni = [...new Set(mesi.map((m) => m.slice(0, 4)))];
  const tutti = (l: string[]) => l.length > 0 && l.every((m) => sel.has(m));
  const imposta = (l: string[]) => setSel(new Set(l));
  const inverti = (m: string) =>
    setSel((p) => {
      const n = new Set(p);
      if (n.has(m)) n.delete(m);
      else n.add(m);
      return n;
    });
  const scelti = conDati.filter((m) => sel.has(m));
  const persone = scelti.reduce((a, m) => a + info[m].totale, 0);

  async function scarica() {
    if (!scelti.length) return;
    setBusy(true);
    try {
      // i mesi scelti si riprendono dal server: il PDF ha anche le correzioni fatte da altri nel frattempo
      await scaricaReportPresenze(await datiReport(scelti, autore));
      const cosa = scelti.length === 1 ? nomeDelMese(scelti[0]).toLowerCase() : `${scelti.length} mesi`;
      toast(`Il report di ${cosa} è pronto: lo trovi tra i file scaricati.`, "ok", "Report PDF scaricato");
      onClose();
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "Non siamo riusciti a creare il PDF. Riprova tra un attimo.", "errore");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Scarica il report" width={640}>
      <div className="pr-rep">
        <p className="pr-rep__intro">Scegli i mesi: finiscono tutti nello stesso PDF. Con più mesi la prima pagina riassume il periodo.</p>
        <div className="pr-rep__rapidi" role="group" aria-label="Scelte rapide">
          {[3, 6, 12].map((n) => (
            <button
              key={n}
              type="button"
              className={cx("pr-rep__chip", tutti(conDati.slice(0, n)) && scelti.length === Math.min(n, conDati.length) && "is-on")}
              onClick={() => imposta(conDati.slice(0, n))}
              disabled={stato !== "pronto"}
            >
              Ultimi {n} mesi
            </button>
          ))}
          <button type="button" className="pr-rep__chip" onClick={() => imposta([])} disabled={!scelti.length}>
            Nessuno
          </button>
        </div>

        {stato === "carico" && (
          <div className="sh-fallback" aria-busy="true" aria-label="Caricamento dei mesi con dati">
            <Skeleton h={20} w={80} />
            <Skeleton h={150} />
          </div>
        )}
        {stato === "errore" && (
          <p className="pr-err" role="alert">
            <Icon name="alert" size={16} /> Non siamo riusciti a sapere quali mesi hanno dati. Chiudi e riapri per riprovare.
          </p>
        )}

        {stato === "pronto" && anni.map((anno) => {
          const delAnno = mesi.filter((m) => m.startsWith(anno));
          const pieni = delAnno.filter((m) => info[m].giorni > 0);
          return (
            <fieldset key={anno} className="pr-rep__anno">
              <legend>
                <span>{anno}</span>
                <button
                  type="button"
                  className="pr-rep__tutto link"
                  disabled={!pieni.length}
                  onClick={() =>
                    setSel((p) => {
                      const n = new Set(p);
                      const on = pieni.every((m) => n.has(m));
                      pieni.forEach((m) => (on ? n.delete(m) : n.add(m)));
                      return n;
                    })
                  }
                >
                  {tutti(pieni) ? "Togli tutto il " + anno : "Tutto il " + anno}
                </button>
              </legend>
              <div className="pr-rep__mesi">
                {delAnno.map((m) => {
                  const d = info[m];
                  const vuoto = d.giorni === 0;
                  return (
                    <label key={m} className={cx("pr-rep__mese", sel.has(m) && !vuoto && "is-on", vuoto && "is-vuoto")}>
                      <input type="checkbox" checked={sel.has(m) && !vuoto} disabled={vuoto} onChange={() => inverti(m)} />
                      <span className="pr-rep__nome">{capitalize(MESI[Number(m.slice(5, 7)) - 1])}</span>
                      <span className="pr-rep__dati t-mono">{vuoto ? "nessun dato" : `${d.giorni} gg · ${it(d.totale)}`}</span>
                      {sel.has(m) && !vuoto && <Icon name="check" size={16} className="pr-rep__ok" />}
                    </label>
                  );
                })}
              </div>
            </fieldset>
          );
        })}

        <div className="pr-rep__foot">
          <span className="pr-rep__sintesi" role="status">
            {scelti.length ? `${scelti.length} ${scelti.length === 1 ? "mese" : "mesi"} · ${it(persone)} presenze` : "Nessun mese scelto"}
          </span>
          <Button variant="outline" onClick={onClose} disabled={busy}>
            Annulla
          </Button>
          <Button icon="download" onClick={() => void scarica()} loading={busy} disabled={!scelti.length}>
            {busy ? "Preparo il PDF…" : "Scarica il PDF"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function EditorPresenza({ edit, onClose, meId }: { edit: { iso: string; f: FasciaKey } | null; onClose: () => void; meId?: number }) {
  const reg = useStore(presenzeStore);
  useUtenti(); // i nomi per "Ultima registrazione di …"
  const cur = edit ? reg[pkey(edit.iso, edit.f)] : undefined;
  return (
    <Modal open={!!edit} onClose={onClose} title={cur ? "Modifica presenze" : "Registra presenze"} width={460}>
      {edit && <Form key={edit.iso + edit.f} edit={edit} cur={cur} onClose={onClose} meId={meId} />}
    </Modal>
  );
}

function Form({ edit, cur, onClose, meId }: { edit: { iso: string; f: FasciaKey }; cur?: { numero: number; note?: string; userId?: number; il?: string }; onClose: () => void; meId?: number }) {
  const f = FASCE_P.find((x) => x.key === edit.f)!;
  const [n, setN] = useState(cur ? String(cur.numero) : "");
  const [note, setNote] = useState(cur?.note ?? "");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState<"save" | "del" | null>(null);
  const d = new Date(edit.iso + "T12:00:00Z");
  const titolo = `${capitalize(["lunedì", "martedì", "mercoledì", "giovedì", "venerdì", "sabato", "domenica"][weekdayOf(edit.iso)])} ${d.getUTCDate()} ${MESI[d.getUTCMonth()]}`;
  const val = n === "" ? NaN : Number(n);

  async function salva(e: React.FormEvent) {
    e.preventDefault();
    if (!Number.isInteger(val) || val < 0 || val > 300) return setErr("Scrivi quante persone ci sono in aula, con un numero da 0 a 300.");
    setBusy("save");
    setErr(null);
    try {
      await salvaPresenza({ data: edit.iso, fascia: edit.f, numero: val, note: note.trim() }, meId);
      toast(`${val} ${val === 1 ? "persona" : "persone"} in fascia ${f.label}.`, "ok", "Presenze registrate");
      onClose();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Non siamo riusciti a salvare le presenze. Riprova tra un attimo.");
      setBusy(null);
    }
  }
  async function elimina() {
    setBusy("del");
    setErr(null);
    try {
      await eliminaPresenza(edit.iso, edit.f);
      // il server toglie solo i dati registrati da questo sito: un numero dello storico del vecchio sito resta
      const { dal, al } = periodo(edit.iso.slice(0, 7));
      await caricaPresenze(dal, al, true).catch(() => undefined);
      if (presenzeStore.get()[pkey(edit.iso, edit.f)]) toast("Questo numero viene dallo storico del vecchio sito e resta: puoi correggerlo con Salva.", "info");
      else toast("La registrazione di questa fascia è stata eliminata.", "ok", "Presenze eliminate");
      onClose();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Non siamo riusciti a eliminare la registrazione. Riprova tra un attimo.");
      setBusy(null);
    }
  }

  return (
    <form className="pr-form" onSubmit={salva} noValidate>
      <p className="pr-form__ctx">
        <b>{titolo}</b>
        <span className="pr-form__f">
          {f.nome} · {f.label}
        </span>
      </p>
      <div className="pr-step" role="group" aria-label="Numero di persone">
        <button type="button" onClick={() => { setN(String(Math.max(0, (Number.isNaN(val) ? 0 : val) - 1))); setErr(null); }} aria-label="Una persona in meno">
          <Icon name="minus" size={22} />
        </button>
        <input
          className="pr-step__in"
          inputMode="numeric"
          value={n}
          placeholder="0"
          aria-label="Persone in aula"
          autoFocus
          onChange={(e) => { setN(e.target.value.replace(/\D/g, "").slice(0, 3)); setErr(null); }}
        />
        <button type="button" onClick={() => { setN(String((Number.isNaN(val) ? 0 : val) + 1)); setErr(null); }} aria-label="Una persona in più">
          <Icon name="plus" size={22} />
        </button>
      </div>
      <TextArea label="Nota" optional rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ad esempio: gruppo di studio in AGORÀ" />
      {err && (
        <p className="pr-err" role="alert">
          <Icon name="alert" size={16} /> {err}
        </p>
      )}
      {cur?.il && (
        <p className="pr-form__meta">
          Ultima registrazione di {nomeUtente(cur.userId)}, {fmtQuando(cur.il)}.
        </p>
      )}
      <div className="pr-form__actions">
        {cur && (
          <Button type="button" variant="ghost" icon="trash" className="pr-del" onClick={() => void elimina()} loading={busy === "del"} disabled={busy === "save"}>
            Elimina
          </Button>
        )}
        <span style={{ flex: 1 }} />
        <Button type="button" variant="outline" onClick={onClose} disabled={!!busy}>
          Annulla
        </Button>
        <Button type="submit" loading={busy === "save"} disabled={busy === "del"}>
          Salva
        </Button>
      </div>
    </form>
  );
}
