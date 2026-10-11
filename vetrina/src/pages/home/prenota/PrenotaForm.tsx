/**
 * Blocco di prenotazione nel drawer: modulo, biglietto di conferma, evento al completo, evento concluso.
 * La prenotazione è vera (api/eventi.js?action=prenota); come in produzione non c'è lista d'attesa.
 */
import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
import { Alert, Button, Checkbox, Icon, SelectField, TextArea, TextField } from "@/components/ui";
import { toast } from "@/components/ui/Toast";
import { SectionLink } from "@/components/layout/sections";
import { LogoMark } from "@/brand/Logo";
import { TitoloEvento } from "./TitoloEvento";
import { useTestiEventi } from "./testi";
import type { Evento, Prenotazione as TPrenotazione } from "@/data/types";
import { ApiError, annullaPrenotazione, calendarLink, conPrenotazione, downloadIcs, isEmail, isPassato, postiRimasti, prenotaEvento } from "@/lib/api";
import { fmtNumeric, fmtRange, fmtShort } from "@/lib/time";
import { useLink } from "@/lib/link";

const EASE = [0.22, 1, 0.36, 1] as const;
const fade = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.5, ease: EASE },
};

/** prenotazione appena fatta; emailInviata = false se la email di conferma non è partita */
type Fatta = TPrenotazione & { emailInviata?: boolean };

export function Prenotazione({ evento: e }: { evento: Evento }) {
  const [done, setDone] = useState<Fatta | null>(null);
  const [prefill, setPrefill] = useState<{ biglietti: string; note: string } | null>(null);
  const past = isPassato(e);
  const rimasti = postiRimasti(e);

  let key: string;
  let body;
  if (done) {
    key = `ok-${done.id}`;
    body = (
      <Biglietto
        evento={e}
        p={done}
        onAltra={() => {
          setPrefill({ biglietti: "1", note: "" });
          setDone(null);
        }}
        onAnnullata={() => setDone(null)}
      />
    );
  } else if (past) {
    key = "past";
    body = <Concluso evento={e} />;
  } else if (!conPrenotazione(e)) {
    key = "aperto";
    body = <Aperto evento={e} />;
  } else if (rimasti === 0) {
    key = "full";
    body = <Completo />;
  } else {
    key = "form";
    body = <Modulo evento={e} rimasti={rimasti} prefill={prefill} onDone={setDone} />;
  }

  return (
    <section className="pd-book" id="pd-prenota" aria-label="Prenotazione">
      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={key} {...fade}>
          {body}
        </motion.div>
      </AnimatePresence>
    </section>
  );
}

/* ───────── modulo ───────── */
type Campo = "nome" | "cognome" | "email" | "biglietti" | "privacy";

function Modulo({
  evento: e,
  rimasti,
  prefill,
  onDone,
}: {
  evento: Evento;
  rimasti: number | null;
  prefill: { biglietti: string; note: string } | null;
  onDone: (p: Fatta) => void;
}) {
  const { t, f } = useTestiEventi();
  const [nome, setNome] = useState("");
  const [cognome, setCognome] = useState("");
  const [email, setEmail] = useState("");
  const [biglietti, setBiglietti] = useState(prefill?.biglietti ?? "1");
  const [note, setNote] = useState(prefill?.note ?? "");
  const [privacy, setPrivacy] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<Campo, string>>>({});
  const [generic, setGeneric] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const max = rimasti === null ? 10 : Math.min(10, rimasti);
  const options = Array.from({ length: max }, (_, i) => ({
    value: String(i + 1),
    label: i === 0 ? "1 posto" : `${i + 1} posti`,
  }));
  const clear = (f: Campo) => errors[f] && setErrors((x) => ({ ...x, [f]: undefined }));
  const focus = (f: Campo) => document.getElementById(`pd-${f}`)?.focus();

  function validate() {
    const err: Partial<Record<Campo, string>> = {};
    if (!nome.trim()) err.nome = "Scrivi il tuo nome.";
    if (!cognome.trim()) err.cognome = "Scrivi il tuo cognome.";
    if (!email.trim()) err.email = "Scrivi la tua email: ti serve per ritrovare la prenotazione.";
    else if (!isEmail(email)) err.email = "Controlla l'indirizzo email: sembra incompleto.";
    if (!privacy) err.privacy = "Per prenotare serve accettare l'informativa sulla privacy.";
    return err;
  }

  async function submit(ev: FormEvent) {
    ev.preventDefault();
    setGeneric(null);
    const err = validate();
    const first = (Object.keys(err) as Campo[])[0];
    if (first) {
      setErrors(err);
      focus(first);
      return;
    }
    setLoading(true);
    try {
      const p = await prenotaEvento({ eventoId: e.id, nome, cognome, email, biglietti: Number(biglietti), note, privacy });
      if (p.emailInviata) toast(`Ti aspettiamo ${fmtShort(e.data)}${e.ora ? ` alle ${e.ora}` : ""}.`, "ok", "Prenotazione confermata");
      else toast(`La email di conferma non è partita: conserva il codice ${p.codice}.`, "avviso", "Prenotazione confermata");
      onDone(p);
    } catch (x) {
      if (x instanceof ApiError && x.field) {
        setErrors({ [x.field]: x.message });
        focus(x.field as Campo);
      } else if (x instanceof ApiError) {
        setGeneric(x.message);
      } else {
        setGeneric("Non siamo riusciti a inviare la prenotazione. Controlla la connessione e riprova.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="pd-form" onSubmit={submit} noValidate>
      <div className="pd-form__head">
        <span className="eyebrow">{t("form.eyebrow")}</span>
        <h3 className="pd-form__title">{t("form.titolo")}</h3>
        <p className="pd-form__lead t-pretty">{t("form.lead")}</p>
      </div>

      <div className="pd-form__grid">
        <TextField
          id="pd-nome"
          label="Nome"
          autoComplete="given-name"
          value={nome}
          error={errors.nome}
          onChange={(x) => {
            setNome(x.target.value);
            clear("nome");
          }}
        />
        <TextField
          id="pd-cognome"
          label="Cognome"
          autoComplete="family-name"
          value={cognome}
          error={errors.cognome}
          onChange={(x) => {
            setCognome(x.target.value);
            clear("cognome");
          }}
        />
        <TextField
          id="pd-email"
          label="Email"
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="nome@esempio.it"
          value={email}
          error={errors.email}
          hint={t("form.email.hint")}
          onChange={(x) => {
            setEmail(x.target.value);
            clear("email");
          }}
          className="pd-span"
        />
        <SelectField
          id="pd-biglietti"
          label="Posti"
          value={biglietti}
          options={options}
          error={errors.biglietti}
          hint={rimasti !== null && rimasti <= 10 ? `Al massimo ${rimasti}: sono i posti rimasti.` : "Fino a 10 per prenotazione."}
          onChange={(x) => {
            setBiglietti(x.target.value);
            clear("biglietti");
          }}
        />
        <TextArea
          id="pd-note"
          label="Note"
          optional
          rows={3}
          maxLength={400}
          placeholder={t("form.note.placeholder")}
          value={note}
          onChange={(x) => setNote(x.target.value)}
          className="pd-span"
        />
      </div>

      <Checkbox
        id="pd-privacy"
        className="pd-form__privacy"
        checked={privacy}
        error={errors.privacy}
        onChange={(x) => {
          setPrivacy(x.target.checked);
          clear("privacy");
        }}
        label={
          <>
            {t("form.privacy.prima")}
            <Link to="/privacy" target="_blank" className="link link--always">
              {t("form.privacy.link")}
            </Link>{" "}
            {t("form.privacy.dopo")}
          </>
        }
      />

      <AnimatePresence>
        {generic && (
          <motion.div key="gen" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
            <Alert tone="errore" className="pd-form__alert">
              {generic}
            </Alert>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="pd-form__submit">
        <Button type="submit" size="lg" loading={loading} arrow block>
          {loading ? t("form.invio.attesa") : biglietti === "1" ? t("form.invio") : f("form.invio.piu", { n: biglietti })}
        </Button>
        <p className="t-mono t-muted">{t("form.nota")}</p>
      </div>
    </form>
  );
}

/* ───────── biglietto ───────── */
function Biglietto({
  evento: e,
  p,
  onAltra,
  onAnnullata,
}: {
  evento: Evento;
  p: Fatta;
  onAltra: () => void;
  onAnnullata: () => void;
}) {
  const { email } = useLink();
  const { t, f } = useTestiEventi();
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  // eventi vecchi: l'orario può mancare
  const orario = !e.ora ? "—" : e.oraFine ? fmtRange(e.ora, e.oraFine) : e.ora;

  async function annulla() {
    setBusy(true);
    try {
      await annullaPrenotazione(p.id);
      toast("I posti sono di nuovo disponibili per altre persone.", "ok", "Prenotazione annullata");
      onAnnullata();
    } catch (x) {
      toast(
        x instanceof ApiError
          ? `${x.message} Puoi anche scriverci a ${email} con il codice ${p.codice}.`
          : `Non siamo riusciti ad annullare. Riprova, oppure scrivici a ${email}.`,
        "errore",
      );
      setBusy(false);
    }
  }

  return (
    <div className="pd-ok">
      <div className="pd-ok__head" role="status">
        <span className="disc pd-ok__disc" aria-hidden>
          <Icon name="check" size={22} />
        </span>
        <div>
          <h3 className="pd-form__title">{t("ok.titolo")}</h3>
          <p className="pd-form__lead">{f("ok.lead", { nome: p.nome })}</p>
        </div>
      </div>

      {p.emailInviata === false && (
        <Alert tone="avviso">
          La email di conferma non è partita. Conserva il codice <strong className="t-mono">{p.codice}</strong> (anche con uno screenshot): ti serve
          all'ingresso e per annullare.
        </Alert>
      )}

      <div className="pd-ticket surface-petrolio" aria-label="Riepilogo della prenotazione">
        <div className="pd-ticket__top">
          <div className="pd-ticket__ev">
            <span className="t-label pd-ticket__k">{t("ok.biglietto")} · {e.luogo}</span>
            <span className="pd-ticket__title">
              <TitoloEvento titolo={e.titolo} />
            </span>
          </div>
          <LogoMark color="var(--foro-carta)" height={44} className="pd-ticket__logo" />
        </div>
        <div className="pd-ticket__perf" aria-hidden />
        <div className="pd-ticket__code">
          <span className="t-label pd-ticket__k">{t("ok.codice")}</span>
          <span className="pd-ticket__codev">{p.codice}</span>
        </div>
        <dl className="pd-ticket__grid">
          <div>
            <dt>Nome</dt>
            <dd>
              {p.nome} {p.cognome}
            </dd>
          </div>
          <div>
            <dt>Posti</dt>
            <dd>{String(p.biglietti).padStart(2, "0")}</dd>
          </div>
          <div>
            <dt>Data</dt>
            <dd>
              {fmtNumeric(e.data)}
            </dd>
          </div>
          <div>
            <dt>Ora</dt>
            <dd>{orario}</dd>
          </div>
        </dl>
        <p className="pd-ticket__foot t-mono">{t("ok.ingresso")}</p>
      </div>

      {e.ora && (
        <div className="pd-ok__cal">
          <a className="btn btn--outline" href={calendarLink(e)} target="_blank" rel="noreferrer">
            <Icon name="calendar" size={18} /> Google Calendar
          </a>
          <button type="button" className="btn btn--outline" onClick={() => downloadIcs(e)}>
            <Icon name="download" size={18} /> Scarica il file .ics
          </button>
        </div>
      )}

      <div className="pd-ok__more">
        <button type="button" className="pd-row-btn" onClick={onAltra}>
          <Icon name="user" size={18} />
          <span>{t("ok.altra")}</span>
          <Icon name="arrow-right" size={18} className="pd-row-btn__go" />
        </button>

        <AnimatePresence mode="wait" initial={false}>
          {!confirm ? (
            <motion.button
              key="a"
              type="button"
              className="pd-row-btn pd-row-btn--danger"
              onClick={() => setConfirm(true)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <Icon name="close" size={18} />
              <span>{t("ok.annulla")}</span>
              <Icon name="arrow-right" size={18} className="pd-row-btn__go" />
            </motion.button>
          ) : (
            <motion.div
              key="c"
              className="pd-confirm"
              role="alertdialog"
              aria-label="Conferma annullamento"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35, ease: EASE }}
            >
              <p>
                Vuoi annullare {p.biglietti === 1 ? "il posto" : `i ${p.biglietti} posti`} a nome di {p.nome} {p.cognome}?
                Tornano disponibili per altre persone.
              </p>
              <div className="pd-confirm__btns">
                <Button variant="primary" size="sm" loading={busy} onClick={annulla} className="pd-confirm__yes">
                  Sì, annulla
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setConfirm(false)} disabled={busy}>
                  No, la tengo
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <p className="pd-ok__mail t-pretty">
        {t("ok.mail")}{" "}
        <a className="link link--always" href={`mailto:${email}?subject=Annullo prenotazione ${p.codice}`}>
          {email}
        </a>{" "}
        con il codice <span className="t-mono">{p.codice}</span>.
      </p>
    </div>
  );
}

/* ───────── al completo (come in produzione: nessuna lista d'attesa) ───────── */
function Completo() {
  const { t } = useTestiEventi();
  return (
    <div className="pd-full">
      <div className="pd-full__head">
        <span className="tag tag--solid-petrolio">{t("full.tag")}</span>
        <h3 className="pd-form__title">{t("full.titolo")}</h3>
        <p className="pd-form__lead t-pretty">{t("full.lead")}</p>
      </div>
    </div>
  );
}

/* ───────── evento concluso ───────── */
/* ───────── evento aperto: niente modulo, si viene e basta ───────── */
function Aperto({ evento: e }: { evento: Evento }) {
  const { t } = useTestiEventi();
  return (
    <div className="pd-aperto">
      <span className="disc pd-aperto__ico" aria-hidden>
        <Icon name="check" size={20} />
      </span>
      <div className="pd-aperto__corpo">
        <h3 className="pd-form__title">{t("pd.aperto.titolo")}</h3>
        <p className="pd-form__lead t-pretty">{t("pd.aperto.testo")}</p>
        {e.ora && (
          <a className="btn btn--outline" href={calendarLink(e)} target="_blank" rel="noreferrer">
            <Icon name="calendar" size={18} /> {t("pd.aperto.calendario")}
          </a>
        )}
      </div>
    </div>
  );
}

function Concluso({ evento: e }: { evento: Evento }) {
  const { t } = useTestiEventi();
  return (
    <div className="pd-past">
      <div className="pd-full__head">
        <span className="tag">{t("past.tag")}</span>
        <h3 className="pd-form__title">{t("past.titolo")}</h3>
        <p className="pd-form__lead t-pretty">{t("past.lead")}</p>
      </div>
      {e.foto && (
        <figure className="pd-past__photo">
          <img src={e.foto} alt="Volontari e volontarie di FORO la sera, sotto le luci di un albero" loading="lazy" />
          <figcaption className="t-mono">Una sera con FORO · {fmtShort(e.data)}</figcaption>
        </figure>
      )}
      <SectionLink to="eventi" className="btn btn--lanterna">
        {t("past.cta")} <Icon name="arrow-right" size={18} className="btn-arrow" />
      </SectionLink>
    </div>
  );
}
