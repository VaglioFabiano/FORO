/**
 * Utenti (solo Direttivo, livello ≤ 1), come in produzione (CreaUtenti.tsx, VisualizzaUtenti.tsx):
 * elenco degli account dal server (api/user.js), nuovo account, modifica dei dati e del livello,
 * reimposta password, elimina. Il livello 0 si gestisce solo su Turso.
 */
import { useEffect, useMemo, useState } from "react";
import { Avatar, Button, Icon, Modal, Skeleton, TextField, SelectField, cx } from "@/components/ui";
import { toast } from "@/components/ui/Toast";
import { ApiError, useUtenteCorrente } from "@/lib/api";
import { useStore } from "@/lib/store";
import { LIVELLI } from "@/data/volontari";
import type { Livello } from "@/data/types";
import { AreaHead, Empty, Panel, StatTile, puo, useLivello } from "../ui";
import {
  accountPronti,
  accountStore,
  caricaAccount,
  creaAccount,
  eliminaAccount,
  modificaAccount,
  passwordBase,
  quandoAccesso,
  reimpostaPassword,
  usernameLibero,
  type Account,
  type DatiAccount,
} from "../utenti-data";
import { CodeBox, RigheCaricamento, Search, Stato } from "../utenti-ui";
import "./utenti.css";

type Filtro = "tutti" | Livello;
const BREVE: Record<Livello, string> = { 0: "Direttivo", 1: "Direttivo", 2: "Sociə Organizzatorə", 3: "Sociə", 4: "Volontariə" };
/** come in produzione: si assegnano solo i livelli 1–4, il livello 0 si imposta dal database */
const ASSEGNABILI: Livello[] = [1, 2, 3, 4];
/** come VisualizzaUtenti.tsx:119: il filtro "Direttivo" mostra anche il livello 0 */
const delLivello = (a: Account, l: Livello) => a.livello === l || (l === 1 && a.livello === 0);
const PROTETTO = "Livello 0: si gestisce solo su Turso";
const SOLO_CIFRE = /^\d+$/;
type Azione = { tipo: "modifica" | "password" | "elimina"; a: Account } | null;
type Errori = Partial<Record<keyof DatiAccount, string>>;

/** errore del server: sul campo se lo indica, altrimenti un avviso */
function mostraErrore(err: unknown, setErr: (e: Errori) => void) {
  if (err instanceof ApiError && err.field) setErr({ [err.field]: err.message });
  else toast(err instanceof Error ? err.message : "Qualcosa non ha funzionato. Riprova tra poco.", "errore");
}

export default function Utenti() {
  const livello = useLivello();
  const io = useUtenteCorrente();
  const account = useStore(accountStore);
  const pronti = useStore(accountPronti);
  const [errore, setErrore] = useState(false);
  const [q, setQ] = useState("");
  const [filtro, setFiltro] = useState<Filtro>("tutti");
  const [nuovo, setNuovo] = useState(false);
  const [azione, setAzione] = useState<Azione>(null);
  const abilitato = puo(livello, 1);

  const carica = () => {
    setErrore(false);
    caricaAccount().catch((err: Error) => {
      setErrore(true);
      toast(err.message, "errore");
    });
  };
  useEffect(() => {
    if (abilitato) carica();
  }, [abilitato]);

  const visibili = useMemo(() => {
    const t = q.trim().toLowerCase();
    return account
      .filter((a) => (filtro === "tutti" || delLivello(a, filtro)) && (!t || `${a.nome} ${a.cognome} ${a.username} ${a.telefono}`.toLowerCase().includes(t)))
      .sort((a, b) => a.livello - b.livello || a.cognome.localeCompare(b.cognome, "it"));
  }, [account, q, filtro]);

  if (!abilitato) {
    return (
      <div className="ute">
        <AreaHead eyebrow="Associazione" title="Utenti" />
        <Panel>
          <Empty icon="lock" title="Questa parte è riservata">
            La gestisce il direttivo. Se ti serve un nuovo account, chiedi a un membro del direttivo.
          </Empty>
        </Panel>
      </div>
    );
  }

  const conTg = account.filter((a) => a.telegram).length;
  const mai = account.filter((a) => !a.ultimoAccesso).length;
  const conta = (l: Livello) => account.filter((a) => delLivello(a, l)).length;
  const val = (v: React.ReactNode) => (pronti ? v : <Skeleton h={32} w={64} />);

  return (
    <div className="ute">
      <AreaHead
        eyebrow="Associazione"
        title="Utenti"
        descr="Gli account di chi usa il gestionale: che cosa può fare ciascuno, chi ha collegato Telegram, chi non entra da tempo."
        actions={
          <Button icon="plus" onClick={() => setNuovo(true)} disabled={!pronti}>
            Nuovo account
          </Button>
        }
      />

      <div className="ute-stats">
        <StatTile label="Account" value={val(account.length)} hint="Nel gestionale" icon="user" tone="petrolio" />
        <StatTile label="Direttivo" value={val(conta(1))} hint="Accesso completo" icon="shield" />
        <StatTile label="Telegram collegato" value={val(`${conTg}/${account.length}`)} hint="Ricevono i promemoria" icon="telegram" />
        <StatTile label="Mai entrati" value={val(mai)} hint={!pronti ? undefined : mai ? "Non hanno ancora acceduto" : "Tutti hanno acceduto"} icon="key" tone={pronti && mai ? "avviso" : "default"} />
      </div>

      <Panel pad={false}>
        <div className="ute-tools">
          <Search value={q} onChange={setQ} placeholder="Cerca per nome, username o telefono" label="Cerca tra gli account" />
          <div className="ute-chips" role="tablist" aria-label="Livello">
            {([["tutti", "Tutti", account.length], ...ASSEGNABILI.map((l) => [l, BREVE[l], conta(l)])] as [Filtro, string, number][]).map(([v, l, n]) => (
              <button key={String(v)} role="tab" aria-selected={filtro === v} className={cx("ute-chip", filtro === v && "is-on")} onClick={() => setFiltro(v)}>
                {l} <span>{n}</span>
              </button>
            ))}
          </div>
        </div>

        {!pronti ? (
          errore ? (
            <Empty icon="alert" title="Non riusciamo a caricare gli account">
              <button type="button" className="link" onClick={carica}>
                Riprova
              </button>
            </Empty>
          ) : (
            <RigheCaricamento n={5} h={52} />
          )
        ) : visibili.length === 0 ? (
          <Empty icon="search" title="Nessun account corrisponde">
            Prova con un altro nome o scegli un altro livello.
          </Empty>
        ) : (
          <div className="table-scroll">
            <table className="data-table ute-table">
              <thead>
                <tr>
                  <th>Persona</th>
                  <th>Livello</th>
                  <th>Telefono</th>
                  <th>Telegram</th>
                  <th>Ultimo accesso</th>
                  <th className="ute-th-act">Azioni</th>
                </tr>
              </thead>
              <tbody>
                {visibili.map((a) => {
                  const sono = a.id === io?.id;
                  /* livello 0 = programmatori: si gestisce solo su Turso, dal sito non si tocca */
                  const protetto = a.livello === 0;
                  const nome = `${a.nome} ${a.cognome}`;
                  return (
                    <tr key={a.id}>
                      <td>
                        <div className="ute-who">
                          <Avatar name={nome} size={36} tone={a.livello <= 1 ? "lanterna" : "petrolio"} />
                          <div>
                            <strong>
                              {nome} {sono && <em>tu</em>}
                            </strong>
                            <span className="num">{a.username}</span>
                            <span className="ute-lv">{LIVELLI[a.livello].label}</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className={cx("tag", a.livello <= 1 && "tag--solid-lanterna", a.livello === 2 && "tag--petrolio")}>{LIVELLI[a.livello].label}</span>
                      </td>
                      <td className="num ute-last">{a.telefono || "–"}</td>
                      <td>
                        {a.telegram ? (
                          <span className="ute-tg">
                            <Icon name="telegram" size={16} /> Collegato
                          </span>
                        ) : (
                          <Stato tone="neutro">Non collegato</Stato>
                        )}
                      </td>
                      <td className="num ute-last">{quandoAccesso(a.ultimoAccesso)}</td>
                      <td>
                        <div className="ute-act">
                          <button type="button" className="ute-ib" disabled={protetto} title={protetto ? PROTETTO : "Modifica"} aria-label={`Modifica i dati di ${nome}`} onClick={() => setAzione({ tipo: "modifica", a })}>
                            <Icon name="edit" size={17} />
                          </button>
                          <button type="button" className="ute-ib" disabled={protetto} title={protetto ? PROTETTO : "Reimposta password"} aria-label={`Reimposta la password di ${nome}`} onClick={() => setAzione({ tipo: "password", a })}>
                            <Icon name="key" size={17} />
                          </button>
                          <button
                            type="button"
                            className="ute-ib ute-ib--del"
                            disabled={sono || protetto}
                            title={protetto ? PROTETTO : sono ? "Non puoi eliminare il tuo account" : "Elimina"}
                            aria-label={`Elimina l'account di ${nome}`}
                            onClick={() => setAzione({ tipo: "elimina", a })}
                          >
                            <Icon name="trash" size={17} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {pronti && (
          <div className="ute-foot t-muted">
            {visibili.length} account su {account.length}
          </div>
        )}
      </Panel>

      <NuovoAccount open={nuovo} onClose={() => setNuovo(false)} account={account} />
      <AzioneModal azione={azione} onClose={() => setAzione(null)} account={account} />
    </div>
  );
}

/* ───────── Nuovo account ───────── */
const VUOTO = { nome: "", cognome: "", username: "", telefono: "", livello: "4" };

function NuovoAccount({ open, onClose, account }: { open: boolean; onClose: () => void; account: Account[] }) {
  const [f, setF] = useState(VUOTO);
  /** finché non lo si tocca, lo username si propone da nome e cognome */
  const [usernameScritto, setUsernameScritto] = useState(false);
  const [err, setErr] = useState<Errori>({});
  const [busy, setBusy] = useState(false);
  const [creato, setCreato] = useState<{ a: Account; pw: string } | null>(null);
  const set = (k: keyof typeof f, v: string) => {
    setF((x) => ({ ...x, [k]: v }));
    setErr((e) => ({ ...e, [k]: undefined }));
  };
  const username = usernameScritto ? f.username : usernameLibero(f.nome, f.cognome, account);
  const pw = passwordBase(f.nome.trim());

  const chiudi = () => {
    onClose();
    setTimeout(() => {
      setCreato(null);
      setF(VUOTO);
      setUsernameScritto(false);
      setErr({});
    }, 400);
  };
  const crea = async (e: React.FormEvent) => {
    e.preventDefault();
    const tel = f.telefono.trim();
    const er: Errori = {};
    if (!f.nome.trim()) er.nome = "Scrivi il nome.";
    if (!f.cognome.trim()) er.cognome = "Scrivi il cognome.";
    if (!username.trim()) er.username = "Scrivi lo username.";
    else if (account.some((a) => a.username === username.trim())) er.username = "Questo username è già usato.";
    if (!tel) er.telefono = "Il telefono è obbligatorio: lo usa anche il bot Telegram.";
    else if (!SOLO_CIFRE.test(tel)) er.telefono = "Scrivi il telefono con le sole cifre, senza spazi.";
    setErr(er);
    if (Object.keys(er).length) return;
    setBusy(true);
    try {
      const r = await creaAccount({
        nome: f.nome.trim(),
        cognome: f.cognome.trim(),
        username: username.trim(),
        telefono: tel,
        livello: Number(f.livello) as Livello,
      });
      setCreato({ a: r.utente, pw: r.password });
      toast(`Abbiamo creato l'account di ${r.utente.nome} ${r.utente.cognome}.`, "ok", "Account creato");
    } catch (error) {
      mostraErrore(error, setErr);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={chiudi} title={creato ? "Account creato" : "Nuovo account"} width={600}>
      {creato ? (
        <div className="ute-form">
          <p className="ute-lead">
            L'account di <strong>{creato.a.nome} {creato.a.cognome}</strong> è pronto. Consegna questi dati di persona: dopo il primo accesso ognuno può cambiare la password dal proprio profilo.
          </p>
          <CodeBox label="Username" value={creato.a.username} />
          <CodeBox label="Password temporanea" value={creato.pw} />
          <div className="ute-form__act">
            <Button onClick={chiudi}>Fatto</Button>
          </div>
        </div>
      ) : (
        <form className="ute-form" onSubmit={crea} noValidate>
          <div className="ute-grid">
            <TextField label="Nome" value={f.nome} onChange={(e) => set("nome", e.target.value)} error={err.nome} autoComplete="off" />
            <TextField label="Cognome" value={f.cognome} onChange={(e) => set("cognome", e.target.value)} error={err.cognome} autoComplete="off" />
            <TextField
              label="Username"
              value={username}
              onChange={(e) => {
                setUsernameScritto(true);
                set("username", e.target.value);
              }}
              error={err.username}
              hint="Lo proponiamo da nome e cognome: puoi cambiarlo. Deve essere unico."
              className="ute-full"
              autoComplete="off"
              spellCheck={false}
            />
            <TextField
              label="Telefono"
              type="tel"
              inputMode="numeric"
              value={f.telefono}
              onChange={(e) => set("telefono", e.target.value)}
              error={err.telefono}
              hint="Solo cifre, senza spazi. Serve anche al bot Telegram."
              autoComplete="off"
            />
            <SelectField
              label="Livello"
              value={f.livello}
              onChange={(e) => set("livello", e.target.value)}
              error={err.livello}
              options={ASSEGNABILI.map((l) => ({ value: String(l), label: LIVELLI[l].label }))}
              hint={LIVELLI[Number(f.livello) as Livello].descr}
            />
          </div>
          <div className="ute-pw">
            {pw ? <CodeBox label="Password temporanea" value={pw} /> : <span className="t-label t-muted">Password temporanea</span>}
            <p className="ute-pw__regola">È la password di base: il nome, con l'ultima lettera ripetuta fino a 6 caratteri se è più corto (Maria → Mariaa).</p>
          </div>
          <div className="ute-form__act">
            <Button type="button" variant="ghost" onClick={chiudi}>
              Annulla
            </Button>
            <Button type="submit" loading={busy}>
              Crea account
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}

/* ───────── Modifica / reimposta password / elimina ───────── */
function AzioneModal({ azione, onClose, account }: { azione: Azione; onClose: () => void; account: Account[] }) {
  const [f, setF] = useState({ nome: "", cognome: "", username: "", telefono: "" });
  const [lv, setLv] = useState<Livello>(4);
  const [err, setErr] = useState<Errori>({});
  const [busy, setBusy] = useState(false);
  const [pw, setPw] = useState<string | null>(null);
  const [ultima, setUltima] = useState<Azione>(null);
  if (azione && azione !== ultima) {
    setUltima(azione);
    setF({ nome: azione.a.nome, cognome: azione.a.cognome, username: azione.a.username, telefono: azione.a.telefono });
    setLv(azione.a.livello);
    setErr({});
    setPw(null);
  }
  const cur = azione ?? ultima;
  const a = cur?.a;
  if (!cur || !a) return <Modal open={false} onClose={onClose}>{null}</Modal>;
  const nome = `${a.nome} ${a.cognome}`;
  const set = (k: keyof typeof f, v: string) => {
    setF((x) => ({ ...x, [k]: v }));
    setErr((e) => ({ ...e, [k]: undefined }));
  };
  const sporco = f.nome !== a.nome || f.cognome !== a.cognome || f.username !== a.username || f.telefono !== a.telefono || lv !== a.livello;

  const salva = async () => {
    const tel = f.telefono.trim();
    const er: Errori = {};
    if (!f.nome.trim()) er.nome = "Scrivi il nome.";
    if (!f.cognome.trim()) er.cognome = "Scrivi il cognome.";
    if (!f.username.trim()) er.username = "Scrivi lo username.";
    else if (account.some((x) => x.id !== a.id && x.username === f.username.trim())) er.username = "Questo username è già usato.";
    if (!tel) er.telefono = "Il telefono è obbligatorio: lo usa anche il bot Telegram.";
    // come sul server: il formato si controlla solo se il numero cambia
    else if (tel !== a.telefono && !SOLO_CIFRE.test(tel)) er.telefono = "Scrivi il telefono con le sole cifre, senza spazi.";
    setErr(er);
    if (Object.keys(er).length) return;
    setBusy(true);
    try {
      const u = await modificaAccount(a.id, { nome: f.nome.trim(), cognome: f.cognome.trim(), username: f.username.trim(), telefono: tel, livello: lv });
      toast(`Abbiamo salvato i dati di ${u.nome} ${u.cognome}.`, "ok", "Account aggiornato");
      onClose();
    } catch (error) {
      mostraErrore(error, setErr);
    } finally {
      setBusy(false);
    }
  };
  const reimposta = async () => {
    setBusy(true);
    try {
      setPw(await reimpostaPassword(a.id));
      toast(`La password di ${nome} è tornata quella di base.`, "ok", "Password reimpostata");
    } catch (error) {
      toast(error instanceof Error ? error.message : "Non siamo riusciti a reimpostare la password.", "errore");
    } finally {
      setBusy(false);
    }
  };
  const elimina = async () => {
    setBusy(true);
    try {
      await eliminaAccount(a.id);
      toast(`L'account di ${nome} è stato eliminato.`, "ok", "Account eliminato");
      onClose();
    } catch (error) {
      toast(error instanceof Error ? error.message : "Non siamo riusciti a eliminare l'account.", "errore");
    } finally {
      setBusy(false);
    }
  };

  const titolo = { modifica: "Modifica account", password: "Reimposta password", elimina: "Elimina account" }[cur.tipo];
  return (
    <Modal open={!!azione} onClose={onClose} title={titolo} width={cur.tipo === "modifica" ? 600 : 520}>
      <div className="ute-form">
        <div className="ute-who ute-who--modal">
          <Avatar name={nome} size={44} />
          <div>
            <strong>{nome}</strong>
            <span className="num">{a.username}</span>
          </div>
        </div>
        {cur.tipo === "modifica" && (
          <>
            <div className="ute-grid">
              <TextField label="Nome" value={f.nome} onChange={(e) => set("nome", e.target.value)} error={err.nome} autoComplete="off" />
              <TextField label="Cognome" value={f.cognome} onChange={(e) => set("cognome", e.target.value)} error={err.cognome} autoComplete="off" />
              <TextField label="Username" value={f.username} onChange={(e) => set("username", e.target.value)} error={err.username} autoComplete="off" spellCheck={false} />
              <TextField label="Telefono" type="tel" inputMode="numeric" value={f.telefono} onChange={(e) => set("telefono", e.target.value)} error={err.telefono} autoComplete="off" />
            </div>
            <div className="ute-radios" role="radiogroup" aria-label="Livello">
              {ASSEGNABILI.map((l) => (
                <label key={l} className={cx("ute-radio", lv === l && "is-on")}>
                  <input type="radio" name="livello" checked={lv === l} onChange={() => setLv(l)} />
                  <span>
                    <strong>{LIVELLI[l].label}</strong>
                    <small>{LIVELLI[l].descr}</small>
                  </span>
                </label>
              ))}
            </div>
            {err.livello && <p className="field__error">{err.livello}</p>}
          </>
        )}
        {cur.tipo === "password" && (
          <>
            {pw ? (
              <>
                <p className="ute-lead">La password è tornata quella di base. {a.nome} potrà cambiarla dal proprio profilo.</p>
                <CodeBox label="Password temporanea" value={pw} />
              </>
            ) : (
              <p className="ute-lead">La password torna quella di base: il nome, con l'ultima lettera ripetuta fino a 6 caratteri se è più corto (Maria → Mariaa). Quella attuale smette di funzionare subito.</p>
            )}
          </>
        )}
        {cur.tipo === "elimina" && (
          <p className="ute-lead">
            Vuoi eliminare l'account di <strong>{nome}</strong>? I turni futuri si liberano, quelli passati restano senza nome, le iscrizioni alle notifiche vengono tolte. L'operazione non si può annullare.
          </p>
        )}
        <div className="ute-form__act">
          {pw ? (
            <Button onClick={onClose}>Fatto</Button>
          ) : (
            <>
              <Button variant="ghost" onClick={onClose}>
                Annulla
              </Button>
              {cur.tipo === "modifica" && (
                <Button loading={busy} onClick={salva} disabled={!sporco}>
                  Salva le modifiche
                </Button>
              )}
              {cur.tipo === "password" && (
                <Button loading={busy} onClick={reimposta}>
                  Reimposta password
                </Button>
              )}
              {cur.tipo === "elimina" && (
                <Button icon="trash" className="ute-del-btn" loading={busy} onClick={elimina}>
                  Elimina account
                </Button>
              )}
            </>
          )}
        </div>
      </div>
    </Modal>
  );
}
