/**
 * Il mio profilo, come in produzione (ProfiloUtente.tsx): dati personali, password, stato di Telegram,
 * le preferenze delle notifiche (api/autenticazione.js) e i miei turni del mese (api/turni.js).
 */
import { useState } from "react";
import { Avatar, Button, Icon, Skeleton, TextField } from "@/components/ui";
import { toast } from "@/components/ui/Toast";
import { ApiError, useUtenteCorrente } from "@/lib/api";
import { aggiornaUtente, chiama } from "@/lib/server";
import { useStore } from "@/lib/store";
import { LIVELLI } from "@/data/volontari";
import type { Utente } from "@/data/types";
import { MESI, capitalize, fmtShort, romeNow, todayIso, toMin } from "@/lib/time";
import { AreaHead, Empty, Panel, StatTile } from "../ui";
import { isFinito, prossimiTurni, turniPronti, useTurni } from "../data-turni";
import { RigheCaricamento, Stato, Switch } from "../utenti-ui";
import "./profilo.css";

type Dati = { nome: string; cognome: string; username: string; telefono: string };
type Prefs = NonNullable<Utente["preferenze"]>;
const SOLO_CIFRE = /^\d+$/;

const ore = (min: number) => {
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return m ? `${h}h ${String(m).padStart(2, "0")}` : `${h}h`;
};
const messaggio = (err: unknown) => (err instanceof Error ? err.message : "Qualcosa non ha funzionato. Riprova tra poco.");

export default function Profilo() {
  const u = useUtenteCorrente();
  const turni = useTurni();
  const turniOk = useStore(turniPronti);
  const [salvoPref, setSalvoPref] = useState<keyof Prefs | null>(null);

  if (!u) return null;
  const dati: Dati = { nome: u.nome, cognome: u.cognome, username: u.username, telefono: u.telefono ?? "" };
  const p: Prefs = u.preferenze ?? { promemoria: true, presenze: true, report: false };
  const collegato = !!u.telegram;
  const setPref = async (k: keyof Prefs, v: boolean) => {
    setSalvoPref(k);
    try {
      const r = await chiama<{ utente: Utente }>("autenticazione", { method: "PUT", query: { action: "preferenze" }, body: { ...p, [k]: v } });
      aggiornaUtente(r.utente);
      toast(v ? "Notifica attivata." : "Notifica disattivata.", "ok");
    } catch (err) {
      toast(messaggio(err), "errore");
    } finally {
      setSalvoPref(null);
    }
  };

  /* i miei turni del mese */
  const mese = todayIso().slice(0, 7);
  const now = romeNow();
  const miei = turni.filter((t) => t.userId === u.id && t.data.startsWith(mese)).sort((a, b) => (a.data + a.inizio).localeCompare(b.data + b.inizio));
  const fatti = miei.filter((t) => isFinito(t.data, t.fine, now));
  const minuti = (l: typeof miei) => l.reduce((s, t) => s + (toMin(t.fine) - toMin(t.inizio)), 0);
  const nomeMese = capitalize(MESI[Number(mese.slice(5)) - 1]);
  const prossimo = prossimiTurni(turni, u.id, now)[0];
  const val = (v: React.ReactNode) => (turniOk ? v : <Skeleton h={32} w={64} />);

  return (
    <div className="pro">
      <AreaHead eyebrow="Strumenti" title="Il mio profilo" descr="I tuoi dati, la password, Telegram e le notifiche che vuoi ricevere." />

      <div className="pro-hero">
        <Avatar name={`${u.nome} ${u.cognome}`} size={72} tone="lanterna" />
        <div className="pro-hero__txt">
          <h2 className="t-h2">
            {u.nome} {u.cognome}
          </h2>
          <p>{LIVELLI[u.livello].label}</p>
        </div>
        <div className="pro-hero__tag">
          <span className="t-label">Username</span>
          <span className="num">{u.username}</span>
        </div>
      </div>

      <div className="pro-cols">
        <div className="pro-col">
          <DatiPanel key={`${u.id}|${u.nome}|${u.cognome}|${u.username}|${u.telefono ?? ""}`} dati={dati} />
          <PasswordPanel />
        </div>
        <div className="pro-col">
          <TelegramPanel collegato={collegato} />
          <Panel title="Notifiche">
            <ul className="pro-prefs">
              <PrefRow
                titolo="Promemoria del turno"
                descr="Il giorno del turno ti scriviamo su Telegram: alle 08:00 per i turni che iniziano prima delle 13, alle 12:00 per quelli dalle 13 alle 16, alle 15:00 per quelli dalle 16 alle 21, alle 20:30 per la sera."
                v={p.promemoria}
                disabled={salvoPref !== null}
                onChange={(v) => void setPref("promemoria", v)}
              />
              <PrefRow
                titolo="Promemoria delle presenze"
                descr="Se sei di turno, ti ricordiamo di registrare quante persone ci sono in aula: alle 12:30, 15:30, 19:00 e 23:30, per la fascia appena finita."
                v={p.presenze}
                disabled={salvoPref !== null}
                onChange={(v) => void setPref("presenze", v)}
              />
              <PrefRow
                titolo="Report dei turni scoperti"
                descr="Il sabato a mezzogiorno, l'elenco dei turni ancora senza volontari."
                v={p.report}
                disabled={salvoPref !== null}
                onChange={(v) => void setPref("report", v)}
              />
              {!collegato && (
                <li className="pro-note">
                  <Icon name="info" size={16} /> Senza Telegram collegato le notifiche non arrivano.
                </li>
              )}
            </ul>
          </Panel>
        </div>
      </div>

      <section className="pro-turni" aria-labelledby="pro-turni-t">
        <h2 id="pro-turni-t" className="t-h3">
          I miei turni · {nomeMese}
        </h2>
        <div className="pro-stats">
          <StatTile label="Turni fatti" value={val(fatti.length)} hint={turniOk ? `su ${miei.length} in programma questo mese` : undefined} icon="check" tone="petrolio" />
          <StatTile label="Ore in aula" value={val(ore(minuti(fatti)))} hint={turniOk ? `${ore(minuti(miei))} previste a fine mese` : undefined} icon="clock" />
          <StatTile label="Da fare" value={val(miei.length - fatti.length)} hint={turniOk ? "ancora questo mese" : undefined} icon="calendar" />
          <StatTile
            label="Prossimo turno"
            value={val(prossimo ? fmtShort(prossimo.data) : "–")}
            hint={turniOk ? (prossimo ? `${prossimo.inizio}–${prossimo.fine}` : "nessuno in programma") : undefined}
            icon="bell"
          />
        </div>
        <Panel pad={false}>
          {!turniOk ? (
            <RigheCaricamento n={3} />
          ) : miei.length === 0 ? (
            <Empty icon="calendar" title={`Nessun turno a ${MESI[Number(mese.slice(5)) - 1]}`}>
              Quando ti segni a un turno lo trovi qui. Puoi farlo dalla pagina Turni.
            </Empty>
          ) : (
            <ul className="pro-list">
              {miei.map((t) => {
                const finito = isFinito(t.data, t.fine, now);
                return (
                  <li key={t.id} className="pro-list__row">
                    <span className="num pro-list__d">{fmtShort(t.data)}</span>
                    <span className="num">
                      {t.inizio}–{t.fine}
                    </span>
                    <span className="pro-list__n">{t.note || "Turno in aula"}</span>
                    <span className="pro-list__s">
                      <Stato tone={finito ? "ok" : "attesa"}>{finito ? "Fatto" : "Da fare"}</Stato>
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>
      </section>
    </div>
  );
}

function PrefRow({ titolo, descr, v, onChange, disabled }: { titolo: string; descr: string; v: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <li className="pro-pref">
      <div>
        <strong>{titolo}</strong>
        <span>{descr}</span>
      </div>
      <Switch checked={v} onChange={onChange} label={titolo} disabled={disabled} />
    </li>
  );
}

/* ───────── Dati personali ───────── */
function DatiPanel({ dati }: { dati: Dati }) {
  const [f, setF] = useState(dati);
  const [err, setErr] = useState<Partial<Record<keyof Dati, string>>>({});
  const [busy, setBusy] = useState(false);
  const sporco = (Object.keys(f) as (keyof Dati)[]).some((k) => f[k] !== dati[k]);
  const set = (k: keyof Dati, v: string) => {
    setF((x) => ({ ...x, [k]: v }));
    setErr((e) => ({ ...e, [k]: undefined }));
  };

  const salva = async (e: React.FormEvent) => {
    e.preventDefault();
    const tel = f.telefono.trim();
    const er: typeof err = {};
    if (!f.nome.trim()) er.nome = "Scrivi il tuo nome.";
    if (!f.cognome.trim()) er.cognome = "Scrivi il tuo cognome.";
    if (!f.username.trim()) er.username = "Scrivi uno username.";
    if (!tel) er.telefono = "Il telefono serve: lo usa anche il bot Telegram.";
    // come sul server: il formato si controlla solo se il numero cambia
    else if (tel !== dati.telefono && !SOLO_CIFRE.test(tel)) er.telefono = "Scrivi il telefono con le sole cifre, senza spazi.";
    setErr(er);
    if (Object.keys(er).length) return;
    setBusy(true);
    const nuovi = { nome: f.nome.trim(), cognome: f.cognome.trim(), username: f.username.trim(), telefono: tel };
    try {
      const r = await chiama<{ utente: Utente }>("autenticazione", { method: "PUT", query: { action: "profilo" }, body: nuovi });
      setF(nuovi);
      // il pannello si ricrea con i dati salvati (cambia la key)
      aggiornaUtente(r.utente);
      toast("Abbiamo salvato i tuoi dati.", "ok");
    } catch (error) {
      if (error instanceof ApiError && error.field) setErr({ [error.field]: error.message });
      else toast(messaggio(error), "errore");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Panel title="Dati personali">
      <form className="pro-form" onSubmit={salva} noValidate>
        <div className="pro-grid">
          <TextField label="Nome" value={f.nome} onChange={(e) => set("nome", e.target.value)} error={err.nome} autoComplete="given-name" />
          <TextField label="Cognome" value={f.cognome} onChange={(e) => set("cognome", e.target.value)} error={err.cognome} autoComplete="family-name" />
          <TextField label="Username" value={f.username} onChange={(e) => set("username", e.target.value)} error={err.username} autoComplete="username" spellCheck={false} hint="Con questo entri nel gestionale." />
          <TextField label="Telefono" type="tel" inputMode="numeric" value={f.telefono} onChange={(e) => set("telefono", e.target.value)} error={err.telefono} autoComplete="tel" hint="Solo cifre. Serve anche al bot Telegram." />
        </div>
        <div className="pro-act">
          {sporco && (
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setF(dati);
                setErr({});
              }}
            >
              Annulla
            </Button>
          )}
          <Button type="submit" loading={busy} disabled={!sporco}>
            Salva i dati
          </Button>
        </div>
      </form>
    </Panel>
  );
}

/* ───────── Password ───────── */
function PasswordPanel() {
  const vuoto = { attuale: "", nuova: "", conf: "" };
  const [f, setF] = useState(vuoto);
  const [err, setErr] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof vuoto, v: string) => {
    setF((x) => ({ ...x, [k]: v }));
    setErr((e) => ({ ...e, [k]: "" }));
  };
  const lungaOk = f.nuova.length >= 6;

  const cambia = async (e: React.FormEvent) => {
    e.preventDefault();
    const er: Record<string, string> = {};
    if (!f.attuale) er.attuale = "Scrivi la password che usi adesso.";
    if (!lungaOk) er.nuova = "La nuova password deve avere almeno 6 caratteri.";
    if (f.conf !== f.nuova) er.conf = "Le due password non coincidono.";
    setErr(er);
    if (Object.keys(er).length) return;
    setBusy(true);
    try {
      await chiama("autenticazione", { method: "PUT", query: { action: "password" }, body: { attuale: f.attuale, nuova: f.nuova } });
      setF(vuoto);
      toast("La password è cambiata. Dal prossimo accesso usa quella nuova.", "ok", "Password aggiornata");
    } catch (error) {
      if (error instanceof ApiError && error.field) setErr({ [error.field]: error.message });
      else toast(messaggio(error), "errore");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Panel title="Cambia password">
      <form className="pro-form" onSubmit={cambia} noValidate>
        <TextField label="Password attuale" type="password" autoComplete="current-password" value={f.attuale} onChange={(e) => set("attuale", e.target.value)} error={err.attuale} />
        <div className="pro-grid">
          <TextField label="Nuova password" type="password" autoComplete="new-password" value={f.nuova} onChange={(e) => set("nuova", e.target.value)} error={err.nuova} />
          <TextField label="Conferma la nuova" type="password" autoComplete="new-password" value={f.conf} onChange={(e) => set("conf", e.target.value)} error={err.conf} />
        </div>
        <p className={`pro-rule ${lungaOk ? "is-ok" : ""}`}>
          <Icon name={lungaOk ? "check" : "info"} size={16} /> Almeno 6 caratteri.
        </p>
        <div className="pro-act">
          <Button type="submit" loading={busy} disabled={!f.attuale && !f.nuova && !f.conf}>
            Cambia password
          </Button>
        </div>
      </form>
    </Panel>
  );
}

/* ───────── Telegram: solo lo stato ───────── */
function TelegramPanel({ collegato }: { collegato: boolean }) {
  return (
    <Panel title="Telegram" actions={collegato ? <Stato tone="ok">Collegato</Stato> : <Stato tone="attesa">Non collegato</Stato>} className="pro-tg">
      {collegato ? (
        <div className="pro-tg__ok">
          <span className="disc pro-tg__disc">
            <Icon name="telegram" size={22} />
          </span>
          <div>
            <strong>Telegram è collegato</strong>
            <p>
              Ricevi da <span className="num">@UFORObot</span> i promemoria dei turni e delle presenze.
            </p>
          </div>
        </div>
      ) : (
        <div className="pro-tg__steps">
          <ol>
            <li>
              Apri Telegram e scrivi a <span className="num">@UFORObot</span>.
            </li>
            <li>Il collegamento lo completa chi gestisce il bot: da quel momento ricevi qui i tuoi promemoria.</li>
          </ol>
        </div>
      )}
    </Panel>
  );
}
