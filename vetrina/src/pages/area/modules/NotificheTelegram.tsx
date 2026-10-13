/**
 * Notifiche Telegram (livello ≤ 2), come in produzione (NotificheTelegram.tsx): le classi sono le righe della
 * tabella `notifiche` raggruppate per nome (api/telegram.js?action=classi). Aggiungere o togliere una persona
 * le manda un messaggio dal bot, se ha collegato la chat. Una classe nuova nasce con la prima persona iscritta.
 */
import { useEffect, useMemo, useState } from "react";
import { AreaHead, Empty, Panel, StatTile } from "../ui";
import { Avatar, Button, Icon, Modal, Skeleton, TextField } from "@/components/ui";
import { toast } from "@/components/ui/Toast";
import { chiama } from "@/lib/server";
import type { Utente } from "@/data/types";
import { slug, TELEGRAM } from "../data-gestione";
import { useUtenti } from "../data-turni";
import { RigheCaricamento } from "../utenti-ui";
import "./tgn.css";

type Iscrizione = { id: number; userId: number; classe: string; descrizione: string; nome: string; cognome: string };
type Iscritto = { userId: number; nome: string };
type Classe = { nome: string; descr: string; iscritti: Iscritto[] };

const messaggio = (err: unknown) => (err instanceof Error ? err.message : "Qualcosa non ha funzionato. Riprova tra poco.");

/** le iscrizioni raggruppate per classe, nell'ordine in cui arrivano dal server (per nome) */
function raggruppa(lista: Iscrizione[]): Classe[] {
  const m = new Map<string, Classe>();
  for (const i of lista) {
    const c = m.get(i.classe) ?? { nome: i.classe, descr: "", iscritti: [] };
    if (!c.descr && i.descrizione) c.descr = i.descrizione;
    c.iscritti.push({ userId: i.userId, nome: `${i.nome} ${i.cognome}`.trim() || "Persona non trovata" });
    m.set(i.classe, c);
  }
  return [...m.values()];
}

/** i messaggi automatici del bot (api/cron.js, BACKEND.md §10) */
const AUTOMAZIONI: { t: string; che: string; a: string; tipo?: "rep" | "pr"; giorno?: string }[] = [
  { t: "08:00", che: "Promemoria dei turni che iniziano prima delle 13:00", a: "chi è di turno", tipo: "pr" },
  { t: "12:00", che: "Promemoria dei turni dalle 13:00 alle 16:00", a: "chi è di turno", tipo: "pr" },
  { t: "12:00", che: "Report dei turni vuoti", a: "gestione_turni", tipo: "rep", giorno: "Sabato" },
  { t: "12:30", che: "Promemoria presenze, fascia 9-13", a: "chi è di turno" },
  { t: "15:00", che: "Promemoria dei turni dalle 16:00 alle 19:00", a: "chi è di turno", tipo: "pr" },
  { t: "15:30", che: "Promemoria presenze, fascia 13-16", a: "chi è di turno" },
  { t: "19:00", che: "Promemoria presenze, fascia 16-19", a: "chi è di turno" },
  { t: "20:30", che: "Promemoria dei turni serali, dalle 21:00", a: "chi è di turno", tipo: "pr" },
  { t: "23:30", che: "Promemoria presenze, fascia 21-24", a: "chi è di turno" },
  { t: "23:59", che: "Esito del cambio settimana", a: "sviluppatori", tipo: "rep", giorno: "Domenica" },
];

export default function NotificheTelegram() {
  const utenti = useUtenti();
  /** null finché le classi non arrivano dal server */
  const [iscrizioni, setIscrizioni] = useState<Iscrizione[] | null>(null);
  const [errore, setErrore] = useState(false);
  const [aggiungi, setAggiungi] = useState<string | null>(null); // nome classe
  const [nuova, setNuova] = useState(false);
  /** "classe|userId" della rimozione in corso */
  const [tolgo, setTolgo] = useState<string | null>(null);

  const carica = () => {
    setErrore(false);
    chiama<{ iscrizioni: Iscrizione[] }>("telegram", { query: { action: "classi" } })
      .then((r) => setIscrizioni(r.iscrizioni))
      .catch((err: Error) => {
        setErrore(true);
        toast(err.message, "errore");
      });
  };
  useEffect(carica, []);

  const classi = useMemo(() => raggruppa(iscrizioni ?? []), [iscrizioni]);
  const pronte = iscrizioni !== null;
  const persone = new Set((iscrizioni ?? []).map((i) => i.userId)).size;
  const val = (v: React.ReactNode, ok = pronte) => (ok ? v : <Skeleton h={32} w={64} />);

  /** iscrive una persona (anche alla classe nuova); il server risponde con tutte le iscrizioni */
  async function iscrivi(classe: string, descrizione: string, u: Utente) {
    const r = await chiama<{ iscrizioni: Iscrizione[] }>("telegram", { method: "POST", query: { action: "iscrivi" }, body: { userId: u.id, classe, descrizione } });
    setIscrizioni(r.iscrizioni);
  }
  async function rimuovi(c: Classe, p: Iscritto) {
    setTolgo(`${c.nome}|${p.userId}`);
    try {
      const r = await chiama<{ iscrizioni: Iscrizione[] }>("telegram", { method: "POST", query: { action: "togli" }, body: { userId: p.userId, classe: c.nome } });
      setIscrizioni(r.iscrizioni);
      toast(`${p.nome} non è più in ${c.nome}. Il bot manda un avviso, se la chat è collegata.`, "ok");
    } catch (err) {
      toast(messaggio(err), "errore");
    } finally {
      setTolgo(null);
    }
  }

  return (
    <div className="tgn">
      <AreaHead
        eyebrow="Telegram"
        title="Gestione classi e iscritti"
        descr="Le classi sono gruppi di persone che ricevono i messaggi del bot. Una classe esiste finché ha almeno un iscritto."
        actions={
          <Button icon="plus" onClick={() => setNuova(true)} disabled={!pronte}>
            Nuova classe
          </Button>
        }
      />

      <div className="tgn-stats">
        <StatTile label="Classi attive" value={val(classi.length)} hint="con almeno un iscritto" icon="bell" />
        <StatTile label="Iscrizioni" value={val((iscrizioni ?? []).length)} hint="tra tutte le classi" icon="user" />
        <StatTile label="Persone iscritte" value={val(persone)} hint="in almeno una classe" icon="check" />
        <StatTile label="Nel gestionale" value={val(utenti.length, utenti.length > 0)} hint="persone che puoi iscrivere" icon="telegram" />
      </div>

      <div className="tgn-grid">
        <div className="tgn-classes">
          {!pronte && (
            <Panel pad={false}>
              {errore ? (
                <Empty icon="alert" title="Non riusciamo a caricare le classi">
                  <button type="button" className="link" onClick={carica}>
                    Riprova
                  </button>
                </Empty>
              ) : (
                <RigheCaricamento n={4} h={56} />
              )}
            </Panel>
          )}
          {pronte && classi.length === 0 && (
            <Panel>
              <Empty icon="bell" title="Nessuna classe">Crea la prima aggiungendo una persona.</Empty>
            </Panel>
          )}
          {classi.map((c) => (
            <article className="tgn-card" key={c.nome}>
              <div className="tgn-card__head">
                <h2 className="tgn-card__name">{c.nome}</h2>
                <div className="tgn-stack" aria-label={`${c.iscritti.length} iscritti`}>
                  {c.iscritti.slice(0, 4).map((p) => (
                    <Avatar key={p.userId} name={p.nome} size={32} tone={p.userId % 3 === 0 ? "laguna" : "petrolio"} />
                  ))}
                  {c.iscritti.length > 4 && <span className="tgn-more">+{c.iscritti.length - 4}</span>}
                </div>
              </div>
              <p className="tgn-card__descr">{c.descr || "Nessuna descrizione per questa classe."}</p>
              <p className="tgn-card__meta">
                {c.iscritti.length} {c.iscritti.length === 1 ? "iscritto" : "iscritti"}
              </p>
              <ul className="tgn-members">
                {c.iscritti.map((p) => {
                  const u = utenti.find((x) => x.id === p.userId);
                  return (
                    <li className="tgn-member" key={p.userId}>
                      <Avatar name={p.nome} size={34} />
                      <div className="tgn-member__txt">
                        <span className="tgn-member__name">{p.nome}</span>
                        {u?.username && <span className="tgn-member__sub">{u.username}</span>}
                      </div>
                      <button
                        type="button"
                        className="tgn-x"
                        onClick={() => void rimuovi(c, p)}
                        disabled={tolgo !== null}
                        aria-busy={tolgo === `${c.nome}|${p.userId}` || undefined}
                        aria-label={`Rimuovi ${p.nome} da ${c.nome}`}
                        style={tolgo === `${c.nome}|${p.userId}` ? { opacity: 0.4 } : undefined}
                      >
                        <Icon name="trash" size={17} />
                      </button>
                    </li>
                  );
                })}
              </ul>
              <div className="tgn-card__foot">
                <Button variant="outline" size="sm" icon="plus" onClick={() => setAggiungi(c.nome)}>
                  Aggiungi iscritto
                </Button>
              </div>
            </article>
          ))}
        </div>

        <Panel title="Automazioni del bot" className="tgn-aut">
          <ol className="tgn-time">
            {AUTOMAZIONI.map((a, i) => (
              <li className="tgn-ev" key={i}>
                <span className="tgn-ev__t">{a.t}</span>
                <span className={`tgn-ev__dot${a.tipo ? ` tgn-ev__dot--${a.tipo}` : ""}`} aria-hidden />
                <span className="tgn-ev__what">
                  {a.giorno && <span className="tgn-ev__day">{a.giorno} · </span>}
                  {a.che}
                  <span className="tgn-ev__cls">{a.a}</span>
                </span>
              </li>
            ))}
          </ol>
          <div className="tgn-legend">
            <span><i style={{ background: "var(--foro-laguna)" }} />promemoria turno</span>
            <span><i style={{ background: "var(--foro-lanterna)" }} />report settimanali</span>
            <span><i style={{ background: "var(--foro-petrolio)" }} />presenze</span>
          </div>
          <p className="tgn-card__meta" style={{ margin: "14px 0 0" }}>
            I promemoria arrivano solo a chi ha collegato la chat e non li ha spenti dal proprio profilo. I report vanno agli iscritti della classe.
          </p>
          <p className="tgn-card__meta" style={{ margin: "8px 0 0" }}>Canale pubblico {TELEGRAM.canale}</p>
        </Panel>
      </div>

      <ModaleAggiungi
        key={aggiungi ?? "x"}
        classe={classi.find((c) => c.nome === aggiungi) ?? null}
        utenti={utenti}
        onClose={() => setAggiungi(null)}
        onConfirm={async (c, u) => {
          await iscrivi(c.nome, c.descr, u);
          toast(`${u.nome} ${u.cognome} è in ${c.nome}. Il bot manda un avviso, se la chat è collegata.`, "ok");
          setAggiungi(null);
        }}
      />
      <ModaleNuova
        aperta={nuova}
        utenti={utenti}
        onClose={() => setNuova(false)}
        classi={classi}
        onConfirm={async (nome, descr, u) => {
          await iscrivi(nome, descr, u);
          toast(`Classe ${nome} creata con ${u.nome} ${u.cognome}.`, "ok");
          setNuova(false);
        }}
      />
    </div>
  );
}

function Selettore({ utenti, esclusi, value, onChange }: { utenti: Utente[]; esclusi: number[]; value: number | null; onChange: (id: number) => void }) {
  const [q, setQ] = useState("");
  const t = q.trim().toLowerCase();
  const lista = utenti.filter((u) => !esclusi.includes(u.id) && `${u.nome} ${u.cognome} ${u.username}`.toLowerCase().includes(t));
  return (
    <>
      <TextField className="tgn-search" label="Cerca per nome" placeholder="Per esempio Elena" value={q} onChange={(e) => setQ(e.target.value)} autoComplete="off" />
      <ul className="tgn-pick">
        {utenti.length === 0 && (
          <li className="tgn-pick__none">
            <Skeleton h={32} />
          </li>
        )}
        {utenti.length > 0 && lista.length === 0 && <li className="tgn-pick__none">Nessuna persona trovata</li>}
        {lista.map((u) => (
          <li key={u.id}>
            <button type="button" className={value === u.id ? "is-sel" : ""} onClick={() => onChange(u.id)}>
              <Avatar name={`${u.nome} ${u.cognome}`} size={32} />
              <span className="tgn-member__txt">
                <span className="tgn-member__name">
                  {u.nome} {u.cognome}
                </span>
                <span className="tgn-member__sub">{u.username}</span>
              </span>
              {value === u.id && <Icon name="check" size={18} />}
            </button>
          </li>
        ))}
      </ul>
    </>
  );
}

/** esegue l'azione del modale mostrando l'attesa e, se il server dice di no, l'avviso */
function useInvio() {
  const [busy, setBusy] = useState(false);
  const esegui = async (f: () => Promise<void>) => {
    setBusy(true);
    try {
      await f();
    } catch (err) {
      toast(messaggio(err), "errore");
    } finally {
      setBusy(false);
    }
  };
  return [busy, esegui] as const;
}

function ModaleAggiungi({
  classe,
  utenti,
  onClose,
  onConfirm,
}: {
  classe: Classe | null;
  utenti: Utente[];
  onClose: () => void;
  onConfirm: (c: Classe, u: Utente) => Promise<void>;
}) {
  const [sel, setSel] = useState<number | null>(null);
  const [busy, esegui] = useInvio();
  const scelto = utenti.find((u) => u.id === sel);
  return (
    <Modal open={!!classe} onClose={onClose} title={`Aggiungi a ${classe?.nome ?? ""}`} width={520}>
      <Selettore utenti={utenti} esclusi={classe?.iscritti.map((p) => p.userId) ?? []} value={sel} onChange={setSel} />
      <div className="tgn-modal-actions">
        <Button variant="ghost" onClick={onClose}>
          Annulla
        </Button>
        <Button disabled={!scelto} loading={busy} onClick={() => classe && scelto && void esegui(() => onConfirm(classe, scelto))}>
          Aggiungi
        </Button>
      </div>
    </Modal>
  );
}

function ModaleNuova({
  aperta,
  utenti,
  onClose,
  onConfirm,
  classi,
}: {
  aperta: boolean;
  utenti: Utente[];
  onClose: () => void;
  onConfirm: (nome: string, descr: string, u: Utente) => Promise<void>;
  classi: Classe[];
}) {
  const [nome, setNome] = useState("");
  const [descr, setDescr] = useState("");
  const [sel, setSel] = useState<number | null>(null);
  const [busy, esegui] = useInvio();
  // a ogni apertura il modulo riparte vuoto
  const [eraAperta, setEraAperta] = useState(aperta);
  if (aperta !== eraAperta) {
    setEraAperta(aperta);
    if (aperta) {
      setNome("");
      setDescr("");
      setSel(null);
    }
  }
  const n = slug(nome).replace(/-/g, "_");
  const doppia = classi.some((c) => c.nome === n);
  const scelto = utenti.find((u) => u.id === sel);
  return (
    <Modal open={aperta} onClose={onClose} title="Nuova classe" width={520}>
      <div className="tgn-form">
        <TextField
          label="Nome della classe"
          placeholder="per esempio apertura_aula"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          error={doppia ? "Esiste già una classe con questo nome." : undefined}
          hint={n ? `Sarà salvata come ${n}` : "Minuscolo, senza spazi."}
        />
        <TextField label="Descrizione" optional placeholder="A cosa serve" value={descr} onChange={(e) => setDescr(e.target.value)} />
      </div>
      <p className="tgn-card__meta" style={{ margin: "0 0 10px" }}>
        Scegli la prima persona iscritta: senza iscritti la classe non esiste.
      </p>
      <Selettore utenti={utenti} esclusi={[]} value={sel} onChange={setSel} />
      <div className="tgn-modal-actions">
        <Button variant="ghost" onClick={onClose}>
          Annulla
        </Button>
        <Button disabled={n.length < 2 || doppia || !scelto} loading={busy} onClick={() => scelto && void esegui(() => onConfirm(n, descr.trim(), scelto))}>
          Crea e aggiungi
        </Button>
      </div>
    </Modal>
  );
}
