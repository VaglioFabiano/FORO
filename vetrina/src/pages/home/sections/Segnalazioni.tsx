/**
 * 08 · Segnalazioni — form anonimo (di default) per guasti, pulizia, regolamento e proposte.
 * Invio con inviaSegnalazione. Le segnalazioni inviate non si mostrano sul sito: le legge il direttivo dall'area volontari.
 */
import { useId, useRef, useState, type FormEvent } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Link } from "react-router-dom";
import { Button, Icon, Reveal, SectionHead, SelectField, TextField, cx } from "@/components/ui";
import { ApiError, inviaSegnalazione, isEmail } from "@/lib/api";
import type { Segnalazione } from "@/data/types";
import { TESTI_SEGNALAZIONI } from "@/data/testi/segnalazioni";
import { useTesti } from "@/lib/contenuti";
import { ricco } from "./AssociatiTesti";
import "./segnalazioni.css";

type Categoria = Segnalazione["categoria"];
type Dove = Segnalazione["aula"];

const CATEGORIE_VAL: { value: Categoria; icon: "plug" | "sparkle" | "document" | "edit" | "flag" | "info" }[] = [
  { value: "guasto", icon: "plug" },
  { value: "pulizia", icon: "sparkle" },
  { value: "regolamento", icon: "document" },
  { value: "proposta", icon: "edit" },
  { value: "generico", icon: "flag" },
  { value: "altro", icon: "info" },
];
const DOVE_VAL: Dove[] = ["foro", "agora", "ristoro", "esterno", "generico", "altro"];
const MAX = 800;

type Errors = Partial<Record<"categoria" | "aula" | "messaggio" | "email" | "form", string>>;

export default function Segnalazioni() {
  const t = useTesti(TESTI_SEGNALAZIONI);
  const CATEGORIE = CATEGORIE_VAL.map((c) => ({ ...c, label: t.ed(`categoria.${c.value}`) }));
  const DOVE = DOVE_VAL.map((value) => ({ value, label: t(`dove.${value}`) }));
  const punti = (["eye-off", "user", "alert"] as const).map((icon, i) => ({
    icon,
    titolo: t.ed(`punto.${i + 1}.titolo`),
    testo: t.ed(`punto.${i + 1}.testo`),
  }));
  const [categoria, setCategoria] = useState<Categoria | "">("");
  const [aula, setAula] = useState<Dove | "">("");
  const [messaggio, setMessaggio] = useState("");
  const [anonima, setAnonima] = useState(true);
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [loading, setLoading] = useState(false);
  const [inviata, setInviata] = useState<Segnalazione | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const uid = useId();

  const clear = (k: keyof Errors) => setErrors((e) => (e[k] || e.form ? { ...e, [k]: undefined, form: undefined } : e));

  const valida = (): Errors => {
    const e: Errors = {};
    if (!categoria) e.categoria = "Scegli di che cosa si tratta.";
    if (!aula) e.aula = "Dicci dove: ci aiuta a intervenire prima.";
    if (messaggio.trim().length < 10) e.messaggio = messaggio.trim() ? "Raccontaci qualcosa in più: bastano un paio di righe." : "Scrivi il messaggio.";
    if (!anonima && email.trim() && !isEmail(email)) e.email = "Controlla l'indirizzo email.";
    return e;
  };

  const onSubmit = async (ev: FormEvent) => {
    ev.preventDefault();
    const e = valida();
    setErrors(e);
    if (Object.keys(e).length) {
      const first = formRef.current?.querySelector<HTMLElement>(
        e.categoria ? "[data-sg-cat] input" : e.aula ? "select" : e.messaggio ? "textarea" : "input[type=email]",
      );
      first?.focus();
      return;
    }
    setLoading(true);
    try {
      const s = await inviaSegnalazione({
        categoria: categoria as Categoria,
        aula: aula as Dove,
        messaggio,
        anonima,
        ...(anonima ? {} : { nome: nome.trim() || undefined, email: email.trim() || undefined }),
      });
      setInviata(s);
      setCategoria("");
      setAula("");
      setMessaggio("");
      setNome("");
      setEmail("");
      setAnonima(true);
      setErrors({});
    } catch (err) {
      if (err instanceof ApiError && err.field) setErrors({ [err.field]: err.message });
      else
        setErrors({
          form: err instanceof ApiError ? err.message : "Non siamo riusciti a inviare la segnalazione. Controlla la connessione e riprova.",
        });
    } finally {
      setLoading(false);
    }
  };


  const restanti = MAX - messaggio.length;

  return (
    <section id="segnalazioni" className="section sg surface-deep" aria-labelledby="sg-title">
      <div className="container">
        <SectionHead
          index="07"
          eyebrow={t.ed("eyebrow")}
          title={<span id="sg-title">{t.ed("titolo", ricco)}</span>}
          intro={t.ed("intro")}
        />

        <div className="sg-grid">
          {/* colonna informativa */}
          <aside className="sg-aside">
            <Reveal>
              <ul className="sg-points">
                {punti.map((p) => (
                  <li key={p.icon}>
                    <span className="sg-points__ic disc">
                      <Icon name={p.icon} size={20} />
                    </span>
                    <div>
                      <strong>{p.titolo}</strong>
                      <p>{p.testo}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </Reveal>
          </aside>

          {/* form / esito */}
          <Reveal delay={0.08} className="sg-panel-wrap">
            <div className="sg-panel" aria-live="polite">
              <AnimatePresence mode="wait" initial={false}>
                {inviata ? (
                  <motion.div
                    key="ok"
                    className="sg-done"
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <div className="sg-done__head">
                      <span className="sg-done__disc disc" aria-hidden>
                        <Icon name="check" size={26} />
                      </span>
                      <div>
                        <span className="t-label sg-done__kicker">{t.ed("ok.kicker")}</span>
                        <h3 className="sg-done__title" tabIndex={-1}>
                          {t.ed("ok.titolo")}
                        </h3>
                      </div>
                    </div>
                    {/* solo ciò che è vero: la prendiamo in carico e ringraziamo, nessuna promessa di risposte o di codici da seguire */}
                    <p className="sg-done__text">{t.ed("ok.testo", undefined, { blocco: true })}</p>
                    <Button variant="outline" icon="plus" onClick={() => setInviata(null)}>
                      {t.ed("ok.altra")}
                    </Button>
                  </motion.div>
                ) : (
                  <motion.form
                    key="form"
                    ref={formRef}
                    className="sg-form"
                    onSubmit={onSubmit}
                    noValidate
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                  >
                    {/* categoria */}
                    <fieldset className="sg-fs" data-sg-cat aria-describedby={errors.categoria ? `${uid}-cat-err` : undefined}>
                      <legend className="field__label">{t.ed("campo.categoria")}</legend>
                      <div className="sg-chips" role="radiogroup">
                        {CATEGORIE.map((c) => (
                          <label key={c.value} className={cx("sg-chip", categoria === c.value && "is-on")}>
                            <input
                              type="radio"
                              name="sg-categoria"
                              value={c.value}
                              checked={categoria === c.value}
                              onChange={() => {
                                setCategoria(c.value);
                                clear("categoria");
                              }}
                            />
                            <Icon name={c.icon} size={17} />
                            {c.label}
                          </label>
                        ))}
                      </div>
                      {errors.categoria && (
                        <span className="field__error" id={`${uid}-cat-err`} role="alert">
                          <Icon name="alert" size={15} /> {errors.categoria}
                        </span>
                      )}
                    </fieldset>

                    <SelectField
                      label={t.ed("campo.dove")}
                      placeholder={t("campo.dove.placeholder")}
                      options={DOVE}
                      value={aula}
                      onChange={(e) => {
                        setAula(e.target.value as Dove);
                        clear("aula");
                      }}
                      error={errors.aula}
                    />

                    <div className="sg-msg">
                      <label className="field__label" htmlFor={`${uid}-msg`}>
                        {t.ed("campo.messaggio")}
                      </label>
                      <textarea
                        id={`${uid}-msg`}
                        className="textarea"
                        rows={5}
                        maxLength={MAX}
                        placeholder={t("campo.messaggio.placeholder")}
                        value={messaggio}
                        onChange={(e) => {
                          setMessaggio(e.target.value);
                          if (e.target.value.trim().length >= 10) clear("messaggio");
                        }}
                        aria-invalid={errors.messaggio ? true : undefined}
                        aria-describedby={`${uid}-msg-meta`}
                      />
                      <div className="sg-msg__meta" id={`${uid}-msg-meta`}>
                        {errors.messaggio ? (
                          <span className="field__error" role="alert">
                            <Icon name="alert" size={15} /> {errors.messaggio}
                          </span>
                        ) : (
                          <span className="field__hint">{t.ed("campo.messaggio.aiuto")}</span>
                        )}
                        <span className={cx("sg-count t-mono", restanti < 80 && "is-low")}>
                          {messaggio.length}/{MAX}
                        </span>
                      </div>
                    </div>

                    {/* anonima */}
                    <div className={cx("sg-anon", !anonima && "is-off")}>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={anonima}
                        className="sg-switch"
                        onClick={() => {
                          setAnonima((a) => !a);
                          clear("email");
                        }}
                      >
                        <span className="sg-switch__track" aria-hidden>
                          <span className="sg-switch__thumb" />
                        </span>
                        <span className="sg-switch__txt">
                          <strong>{t.ed("anonima.titolo")}</strong>
                          <span>{anonima ? t.ed("anonima.si") : t.ed("anonima.no")}</span>
                        </span>
                      </button>
                      <AnimatePresence initial={false}>
                        {!anonima && (
                          <motion.div
                            className="sg-contact"
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                          >
                            <div className="sg-contact__grid">
                              <TextField label={t.ed("campo.nome")} optional autoComplete="given-name" value={nome} onChange={(e) => setNome(e.target.value)} />
                              <TextField
                                label={t.ed("campo.email")}
                                type="email"
                                optional
                                autoComplete="email"
                                inputMode="email"
                                placeholder="nome@esempio.it"
                                value={email}
                                onChange={(e) => {
                                  setEmail(e.target.value);
                                  if (!e.target.value.trim() || isEmail(e.target.value)) clear("email");
                                }}
                                onBlur={() => email.trim() && !isEmail(email) && setErrors((x) => ({ ...x, email: "Controlla l'indirizzo email." }))}
                                error={errors.email}
                                hint={t.ed("campo.email.aiuto")}
                              />
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {errors.form && (
                      <div className="alert alert--errore" role="alert">
                        <Icon name="alert" size={18} style={{ marginTop: 2 }} />
                        <div>{errors.form}</div>
                      </div>
                    )}

                    <div className="sg-submit">
                      <Button type="submit" size="lg" icon={loading ? undefined : "send"} loading={loading}>
                        {loading ? t.ed("btn.invio") : t.ed("btn.invia")}
                      </Button>
                      <span className="sg-submit__note">
                        {t.ed("privacy.prima")}
                        <Link className="link link--always" to="/privacy">
                          {t.ed("privacy.link")}
                        </Link>
                        .
                      </span>
                    </div>
                  </motion.form>
                )}
              </AnimatePresence>
            </div>
          </Reveal>
        </div>

      </div>
    </section>
  );
}
