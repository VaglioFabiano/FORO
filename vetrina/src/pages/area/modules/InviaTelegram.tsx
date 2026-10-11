/**
 * Debug Telegram (solo livello 0), come client/src/dashboard/TelegramSender.tsx (BACKEND.md §11):
 * messaggio di prova a sé stessi tramite il proprio numero, Debug Info (bot, chat id salvato, ultimi 10 messaggi
 * ricevuti dal bot), Reset Chat ID. In più il campo "Imposta Chat ID" per collegare la chat di una persona:
 * la query la esegue il server (api/telegram.js?action=imposta_chat) e il bot non scrive nulla alla persona.
 */
import { useEffect, useRef, useState } from "react";
import { AreaHead, Empty, Panel } from "../ui";
import { Avatar, Button, Icon, Modal, SelectField, TextField, cx } from "@/components/ui";
import { toast } from "@/components/ui/Toast";
import { ApiError, useUtenteCorrente } from "@/lib/api";
import { aggiornaUtente, chiama } from "@/lib/server";
import type { Utente } from "@/data/types";
import { RigheCaricamento } from "../utenti-ui";
import "./tgi.css";

type Risultato = { id: number; tipo: "ok" | "errore"; testo: string; messageId?: number; quando: string };
type Aggiornamento = {
  updateId: number;
  messageId?: number;
  chatId?: number;
  chatType?: string;
  text?: string;
  contactPhone: string | null;
  from: { first_name?: string; last_name?: string; username?: string };
  date: string | null;
};
type InfoDebug = {
  user: Record<string, unknown>;
  bot: { info: unknown; username: string | null };
  database: { savedChatId: string | null };
  telegram: { updatesCount: number; lastUpdates: Aggiornamento[] };
};
type ChatUtente = { id: number; nome: string; cognome: string; chatId: string | null };

/** i modelli predefiniti di TelegramSender.tsx */
const MODELLI = [
  { nome: "Promemoria Appuntamento", testo: "Ciao {name}, ti ricordiamo il tuo appuntamento previsto per oggi. A presto!" },
  { nome: "Messaggio di Benvenuto", testo: "Benvenuto {name} {surname}! Grazie per esserti registrato al nostro servizio." },
  { nome: "Notifica Importante", testo: "Gentile {name}, abbiamo una comunicazione importante per te. Contattaci al più presto." },
];
const VARIABILI = ["{name}", "{surname}", "{tel}"];

/** {name}, {surname} e {tel} sostituiti nel browser, come oggi */
const sostituisci = (t: string, u: Utente) =>
  t
    .replace(/{name}/g, u.nome)
    .replace(/{surname}/g, u.cognome)
    .replace(/{tel}/g, u.telefono ?? "");
const messaggio = (err: unknown) => (err instanceof Error ? err.message : "Errore di connessione");
const adesso = () => new Date().toLocaleString("it-IT");
/** il tipo di messaggio, dai campi che manda il server (testo, "Contact" o "Media") */
const tipoMessaggio = (u: Aggiornamento) => (u.contactPhone ? "Contatto" : u.text === "Media" ? "Media" : "Testo");

export default function InviaTelegram() {
  const io = useUtenteCorrente();
  const [testo, setTesto] = useState("");
  const [busy, setBusy] = useState<"invio" | "debug" | "reset" | null>(null);
  const [risultati, setRisultati] = useState<Risultato[]>([]);
  const [debug, setDebug] = useState<InfoDebug | null>(null);
  const [mostraDebug, setMostraDebug] = useState(false);
  const [confermaReset, setConfermaReset] = useState(false);
  /** elenco per "Imposta Chat ID": null finché non arriva */
  const [chat, setChat] = useState<ChatUtente[] | null>(null);
  const [erroreChat, setErroreChat] = useState(false);
  const ta = useRef<HTMLTextAreaElement>(null);

  const caricaChat = () => {
    setErroreChat(false);
    chiama<{ utenti: ChatUtente[] }>("telegram", { query: { action: "chat" } })
      .then((r) => setChat(r.utenti))
      .catch((err: Error) => {
        setErroreChat(true);
        toast(err.message, "errore");
      });
  };
  useEffect(caricaChat, []);

  if (!io) return null;

  const aggiungi = (tipo: Risultato["tipo"], t: string, messageId?: number) => {
    setRisultati((l) => [{ id: Date.now() + Math.random(), tipo, testo: t, messageId, quando: adesso() }, ...l]);
    if (tipo === "errore") toast(t, "errore");
  };

  /** aggiorna lo stato "Telegram collegato" della sessione quando cambia il proprio chat id */
  const mioChat = (collegato: boolean) => aggiornaUtente({ ...io, telegram: collegato });

  const caricaDebug = async () => {
    setBusy("debug");
    try {
      setDebug(await chiama<InfoDebug>("telegram", { query: { action: "debug" } }));
      setMostraDebug(true);
    } catch (err) {
      aggiungi("errore", messaggio(err));
    } finally {
      setBusy(null);
    }
  };

  const invia = async () => {
    if (!testo.trim()) return aggiungi("errore", "Il messaggio non può essere vuoto");
    setBusy("invio");
    try {
      const r = await chiama<{ success: boolean; messageId?: number }>("telegram", {
        method: "POST",
        query: { action: "prova" },
        body: { messaggio: sostituisci(testo, io) },
      });
      aggiungi("ok", `Messaggio inviato con successo a ${io.telefono ?? ""}`, r.messageId);
      setTesto("");
      // il server può aver appena trovato e salvato il chat id dal contatto condiviso col bot
      if (!io.telegram) {
        mioChat(true);
        caricaChat();
      }
    } catch (err) {
      aggiungi("errore", messaggio(err));
    } finally {
      setBusy(null);
    }
  };

  const reset = async () => {
    setConfermaReset(false);
    setBusy("reset");
    try {
      const r = await chiama<{ success: boolean; message: string }>("telegram", { method: "POST", query: { action: "reset_chat" } });
      aggiungi("ok", r.message);
      mioChat(false);
      caricaChat();
      if (mostraDebug) setDebug(await chiama<InfoDebug>("telegram", { query: { action: "debug" } }));
    } catch (err) {
      aggiungi("errore", messaggio(err));
    } finally {
      setBusy(null);
    }
  };

  function inserisci(v: string) {
    const el = ta.current;
    const a = el?.selectionStart ?? testo.length;
    const b = el?.selectionEnd ?? a;
    setTesto(testo.slice(0, a) + v + testo.slice(b));
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(a + v.length, a + v.length);
    });
  }

  const anteprima = sostituisci(testo, io);
  const ora = new Date().toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Rome" });

  return (
    <div className="tgi">
      <AreaHead
        eyebrow="Telegram · solo livello 0"
        title="Debug Telegram"
        descr="Messaggio di prova a te stesso tramite il tuo numero, informazioni sul bot, ultimi messaggi ricevuti e collegamento delle chat."
      />

      <div className="tgi-grid">
        <div className="tgi-col">
          <Panel title="Utente loggato">
            <dl className="tgi-user">
              <div>
                <dt>Utente</dt>
                <dd>
                  {io.nome} {io.cognome}
                </dd>
              </div>
              <div>
                <dt>Telefono</dt>
                <dd className="num">{io.telefono || "–"}</dd>
              </div>
              <div>
                <dt>Livello</dt>
                <dd className="num">{io.livello}</dd>
              </div>
            </dl>
          </Panel>

          <Panel title="Messaggio di prova">
            <div className="tgi-block">
              <div>
                <span className="tgi-lab">Modelli messaggi</span>
                <div className="tgi-chips">
                  {MODELLI.map((m) => (
                    <button key={m.nome} type="button" className="tgi-chip" disabled={busy !== null} onClick={() => setTesto(m.testo)}>
                      {m.nome}
                    </button>
                  ))}
                </div>
              </div>
              <div className="tgi-editor">
                <div className="tgi-tools" role="toolbar" aria-label="Variabili">
                  {VARIABILI.map((v) => (
                    <button key={v} type="button" className="tgi-tool tgi-tool--text" onClick={() => inserisci(v)} disabled={busy !== null}>
                      {v}
                    </button>
                  ))}
                  <span className="tgi-tools__count">{testo.length}/4096</span>
                </div>
                <label htmlFor="tgi-testo" className="sr-only">
                  Messaggio
                </label>
                <textarea
                  id="tgi-testo"
                  ref={ta}
                  className="tgi-text"
                  value={testo}
                  maxLength={4096}
                  disabled={busy !== null}
                  onChange={(e) => setTesto(e.target.value)}
                  placeholder="Scrivi il tuo messaggio qui... Puoi usare {name}, {surname}, {tel} per personalizzarlo"
                />
              </div>
              <span className="tgi-hint">Variabili disponibili: {VARIABILI.join(", ")}. Il messaggio arriva a te, tramite il tuo numero.</span>
              <div className="tgi-send">
                <Button icon="send" loading={busy === "invio"} disabled={busy !== null || !testo.trim()} onClick={() => void invia()}>
                  Invia messaggio
                </Button>
                <div className="tgi-send__more">
                  <Button variant="outline" icon="settings" loading={busy === "debug"} disabled={busy !== null} onClick={() => void caricaDebug()}>
                    Debug Info
                  </Button>
                  <Button variant="outline" icon="trash" className="tgi-reset" loading={busy === "reset"} disabled={busy !== null} onClick={() => setConfermaReset(true)}>
                    Reset Chat ID
                  </Button>
                </div>
              </div>
            </div>
          </Panel>
        </div>

        <div className="tgi-col">
          <div>
            <span className="tgi-lab">Anteprima messaggio</span>
            <div className="tgi-phone">
              <div className="tgi-phone__bar">
                <Avatar name="UF" size={34} tone="lanterna" />
                <div>
                  <strong>{debug?.bot.username ? `@${debug.bot.username}` : "UFORObot"}</strong>
                  <span>bot</span>
                </div>
              </div>
              <div className="tgi-phone__body">
                <span className="tgi-day">Oggi</span>
                <div className="tgi-bubble">
                  {anteprima.trim() ? <p>{anteprima}</p> : <p className="tgi-bubble__empty">Il messaggio comparirà qui.</p>}
                  <span className="tgi-bubble__foot">{ora}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {mostraDebug && debug && (
        <Panel
          title="Informazioni debug"
          actions={
            <Button variant="ghost" size="sm" icon="close" onClick={() => setMostraDebug(false)}>
              Chiudi
            </Button>
          }
        >
          <div className="tgi-debug">
            <div className="tgi-debug__item">
              <h3 className="tgi-lab">Utente corrente</h3>
              <pre className="tgi-pre">{JSON.stringify(debug.user, null, 2)}</pre>
            </div>
            <div className="tgi-debug__item">
              <h3 className="tgi-lab">Bot Telegram</h3>
              <pre className="tgi-pre">{JSON.stringify(debug.bot, null, 2)}</pre>
            </div>
            <div className="tgi-debug__item">
              <h3 className="tgi-lab">Database</h3>
              <pre className="tgi-pre">{JSON.stringify(debug.database, null, 2)}</pre>
            </div>
            <div className="tgi-debug__item tgi-debug__item--wide">
              <h3 className="tgi-lab">Ultimi messaggi Telegram</h3>
              {debug.telegram.lastUpdates.length > 0 ? (
                <ul className="tgi-upd">
                  {debug.telegram.lastUpdates.map((u, i) => (
                    <li key={u.updateId ?? i}>
                      <span>
                        <strong>Chat ID:</strong> <span className="num">{u.chatId}</span>
                      </span>
                      <span>
                        <strong>Tipo:</strong> {u.chatType}
                      </span>
                      <span>
                        <strong>Da:</strong> {[u.from.first_name, u.from.last_name].filter(Boolean).join(" ")}
                        {u.from.username && ` (@${u.from.username})`}
                      </span>
                      <span>
                        <strong>Tipo messaggio:</strong> {tipoMessaggio(u)}
                      </span>
                      {u.contactPhone && (
                        <span>
                          <strong>Telefono contatto:</strong> <span className="num">{u.contactPhone}</span>
                        </span>
                      )}
                      {u.text && (
                        <span>
                          <strong>Testo:</strong> {u.text}
                        </span>
                      )}
                      <span>
                        <strong>Data:</strong> <span className="num">{u.date}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="tgi-hint">Nessun messaggio trovato. Assicurati di aver scritto al bot di recente.</p>
              )}
            </div>
          </div>
        </Panel>
      )}

      <ImpostaChat
        chat={chat}
        errore={erroreChat}
        onRiprova={caricaChat}
        onSalvato={(userId, chatId) => {
          setChat((l) => (l ? l.map((x) => (x.id === userId ? { ...x, chatId } : x)) : l));
          if (userId === io.id) {
            mioChat(chatId !== null);
            if (mostraDebug) void chiama<InfoDebug>("telegram", { query: { action: "debug" } }).then(setDebug, () => undefined);
          }
        }}
      />

      <Panel
        title={`Risultati invii (${risultati.length})`}
        pad={false}
        actions={
          risultati.length > 0 ? (
            <Button variant="ghost" size="sm" icon="trash" onClick={() => setRisultati([])}>
              Cancella
            </Button>
          ) : undefined
        }
      >
        {risultati.length === 0 ? (
          <Empty icon="send" title="Nessun messaggio inviato ancora" />
        ) : (
          <ul className="tgi-log">
            {risultati.map((r) => (
              <li key={r.id} className={cx("tgi-res", `tgi-res--${r.tipo}`)}>
                <div className="tgi-log__top">
                  <span className="tgi-log__to">
                    <Icon name={r.tipo === "ok" ? "check" : "alert"} size={14} /> {r.tipo === "ok" ? "Riuscito" : "Errore"}
                  </span>
                  <span>
                    {r.quando}
                    {r.messageId !== undefined && ` · ID messaggio ${r.messageId}`}
                  </span>
                </div>
                <span className="tgi-log__msg">{r.testo}</span>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Modal open={confermaReset} onClose={() => setConfermaReset(false)} title="Reset Chat ID" width={480}>
        <p className="tgi-lead">Sei sicuro di voler cancellare il Chat ID salvato? Dovrai condividere nuovamente il tuo contatto con il bot.</p>
        <div className="tgi-modal-act">
          <Button variant="ghost" onClick={() => setConfermaReset(false)}>
            Annulla
          </Button>
          <Button icon="trash" className="tgi-del-btn" onClick={() => void reset()}>
            Reset Chat ID
          </Button>
        </div>
      </Modal>
    </div>
  );
}

/* ───────── Imposta Chat ID (nuovo, decisione 2026-10-11) ───────── */
function ImpostaChat({
  chat,
  errore,
  onRiprova,
  onSalvato,
}: {
  chat: ChatUtente[] | null;
  errore: boolean;
  onRiprova: () => void;
  onSalvato: (userId: number, chatId: string | null) => void;
}) {
  const [userId, setUserId] = useState("");
  const [valore, setValore] = useState("");
  const [err, setErr] = useState<{ userId?: string; chatId?: string }>({});
  const [busy, setBusy] = useState<"salva" | "rimuovi" | null>(null);
  const scelto = chat?.find((x) => String(x.id) === userId);

  const salva = async (chatId: string | null) => {
    if (!scelto) return setErr({ userId: "Scegli la persona." });
    if (chatId !== null && !chatId.trim()) return setErr({ chatId: "Incolla il Chat ID." });
    setErr({});
    setBusy(chatId === null ? "rimuovi" : "salva");
    try {
      const r = await chiama<{ ok: boolean; chatId: string | null }>("telegram", {
        method: "POST",
        query: { action: "imposta_chat" },
        body: { userId: scelto.id, chatId: chatId === null ? null : chatId.trim() },
      });
      onSalvato(scelto.id, r.chatId);
      setValore("");
      toast(
        r.chatId === null ? `Chat ID di ${scelto.nome} ${scelto.cognome} rimosso.` : `Chat ID ${r.chatId} salvato per ${scelto.nome} ${scelto.cognome}.`,
        "ok",
      );
    } catch (error) {
      if (error instanceof ApiError && (error.field === "chatId" || error.field === "userId")) setErr({ [error.field]: error.message });
      else toast(messaggio(error), "errore");
    } finally {
      setBusy(null);
    }
  };

  return (
    <Panel title="Imposta Chat ID">
      {!chat ? (
        errore ? (
          <Empty icon="alert" title="Non riusciamo a caricare le persone">
            <button type="button" className="link" onClick={onRiprova}>
              Riprova
            </button>
          </Empty>
        ) : (
          <RigheCaricamento n={2} />
        )
      ) : (
        <div className="tgi-chat">
          <p className="tgi-hint">Scegli la persona, incolla il Chat ID letto negli ultimi messaggi di Debug Info e premi Salva. Il bot non scrive nulla alla persona.</p>
          <div className="tgi-chat__grid">
            <SelectField
              label="Persona"
              value={userId}
              placeholder="Scegli una persona"
              onChange={(e) => {
                setUserId(e.target.value);
                setErr({});
              }}
              error={err.userId}
              options={chat.map((x) => ({ value: String(x.id), label: `${x.cognome} ${x.nome} · ${x.chatId ?? "nessuna chat"}` }))}
            />
            <TextField
              label="Chat ID"
              value={valore}
              inputMode="numeric"
              autoComplete="off"
              spellCheck={false}
              placeholder="per esempio 123456789"
              onChange={(e) => {
                setValore(e.target.value);
                setErr((x) => ({ ...x, chatId: undefined }));
              }}
              error={err.chatId}
              hint={scelto ? (scelto.chatId ? `Salvato adesso: ${scelto.chatId}` : "Nessun Chat ID salvato.") : undefined}
            />
          </div>
          <div className="tgi-modal-act">
            <Button variant="outline" icon="trash" loading={busy === "rimuovi"} disabled={busy !== null || !scelto?.chatId} onClick={() => void salva(null)}>
              Rimuovi
            </Button>
            <Button icon="check" loading={busy === "salva"} disabled={busy !== null || !scelto || !valore.trim()} onClick={() => void salva(valore)}>
              Salva
            </Button>
          </div>
        </div>
      )}
    </Panel>
  );
}
