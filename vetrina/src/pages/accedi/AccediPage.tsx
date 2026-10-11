import { useState, type FormEvent } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { LogoMark } from "@/brand/Logo";
import { Alert, Button, Checkbox, Icon, TextField } from "@/components/ui";
import { ApiError, accedi, useSessione } from "@/lib/api";
import { TelegramNotifica } from "@/pages/area/shell-telegram";
import "./accedi.css";
import { useLink } from "@/lib/link";

export default function AccediPage() {
  const { email } = useLink();
  const sessione = useSessione();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = params.get("next");
  const dest = next && next.startsWith("/") && !next.startsWith("//") ? next : "/area";

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [mostra, setMostra] = useState(false);
  const [ricordami, setRicordami] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);
  const [campi, setCampi] = useState<{ username?: string; password?: string }>({});

  if (sessione && !loading) return <Navigate to={dest} replace />;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const c: typeof campi = {};
    // lo username si manda esatto com'è scritto: niente trim né minuscole (come in produzione)
    if (!username) c.username = "Scrivi il tuo username.";
    if (!password) c.password = "Scrivi la tua password.";
    setCampi(c);
    setErrore(null);
    if (Object.keys(c).length) return;
    setLoading(true);
    try {
      await accedi(username, password, ricordami);
      navigate(dest, { replace: true });
    } catch (err) {
      setErrore(err instanceof ApiError ? err.message : "Non siamo riusciti ad accedere. Controlla la connessione e riprova.");
      setLoading(false);
    }
  }

  return (
    <main className="acc">
      <section className="acc__side surface-petrolio" aria-label="Area volontari">
        <div className="acc__side-in">
          <LogoMark animate color="var(--foro-carta)" height={64} />
          <div className="acc__copy">
            <span className="t-label acc__eyebrow">Area volontari</span>
            <p className="acc__lead">Turni, presenze ed eventi: tutto quello che serve per tenere aperta l'aula.</p>
          </div>
          <TelegramNotifica time="12:00" action={null} delay={0.5} className="acc__tg">
            <p>
              <strong>Promemoria turno</strong>
            </p>
            <p>Ti ricordo il tuo turno di oggi in aula studio.</p>
            <p>
              Turno <span className="sh-tg__mono">14:30–19:00</span>
            </p>
          </TelegramNotifica>
        </div>
      </section>

      <section className="acc__main">
        <div className="acc__form-wrap">
          <h1 className="t-h1 acc__title">Accedi</h1>
          <p className="acc__intro">Entra con le credenziali che ti ha dato il direttivo.</p>

          <form onSubmit={onSubmit} noValidate className="acc__form">
            {errore && <Alert tone="errore">{errore}</Alert>}
            <TextField
              label="Username"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                setCampi((c) => ({ ...c, username: undefined }));
              }}
              error={campi.username}
              autoComplete="username"
              spellCheck={false}
            />
            <div className="acc__pw">
              <TextField
                label="Password"
                type={mostra ? "text" : "password"}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setCampi((c) => ({ ...c, password: undefined }));
                }}
                error={campi.password}
                autoComplete="current-password"
              />
              <button
                type="button"
                className="acc__eye"
                onClick={() => setMostra((v) => !v)}
                aria-label={mostra ? "Nascondi la password" : "Mostra la password"}
                aria-pressed={mostra}
              >
                <Icon name={mostra ? "eye-off" : "eye"} size={20} />
              </button>
            </div>
            <Checkbox label="Ricordami su questo dispositivo" checked={ricordami} onChange={(e) => setRicordami(e.target.checked)} />
            <Button type="submit" size="lg" block loading={loading} arrow>
              Accedi
            </Button>
          </form>

          <p className="acc__forgot">
            Hai dimenticato la password?{" "}
            <a className="link" href={`mailto:${email}?subject=Password%20dimenticata`}>
              Scrivi al direttivo
            </a>
          </p>
        </div>
      </section>
    </main>
  );
}
