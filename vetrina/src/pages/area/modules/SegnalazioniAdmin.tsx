/**
 * Segnalazioni dal modulo pubblico (api/homepage.js?action=segnalazioni, livello ≤ 2): si leggono e basta.
 * Nessuno stato (ricevuta, in carico, risolta) e nessun iter di gestione nel sito.
 */
import { useEffect, useState } from "react";
import { AreaHead, Empty, Panel } from "../ui";
import { Button, SelectField, Skeleton } from "@/components/ui";
import type { Segnalazione } from "@/data/types";
import { CATEGORIE_SEGN, LUOGHI_SEGN, caricaSegnalazioni, fmtQuando, isoToLocale } from "../data-gestione";
import "./sgn.css";

export default function SegnalazioniAdmin() {
  /** null = in caricamento; arrivano dal server già dalla più recente */
  const [tutte, setTutte] = useState<Segnalazione[] | null>(null);
  const [errore, setErrore] = useState<string | null>(null);
  const [cat, setCat] = useState("");
  const [sel, setSel] = useState<string | null>(null);

  const carica = () =>
    caricaSegnalazioni()
      .then((l) => {
        setTutte(l);
        setErrore(null);
      })
      .catch((x) => setErrore(x instanceof Error ? x.message : "Non riusciamo a caricare le segnalazioni."));
  useEffect(() => {
    void carica();
  }, []);

  if (!tutte) {
    return (
      <div className="sgn">
        <Testata />
        {errore ? (
          <Panel>
            <Empty icon="alert" title="Non riusciamo a caricare le segnalazioni">
              {errore}
            </Empty>
            <div style={{ display: "flex", justifyContent: "center", paddingBottom: 16 }}>
              <Button
                variant="outline"
                onClick={() => {
                  setErrore(null);
                  void carica();
                }}
              >
                Riprova
              </Button>
            </div>
          </Panel>
        ) : (
          <div className="sgn-grid" aria-busy="true" aria-label="Caricamento delle segnalazioni">
            <Skeleton h={420} />
            <Skeleton h={260} />
          </div>
        )}
      </div>
    );
  }

  const filtrate = tutte.filter((s) => !cat || s.categoria === cat);
  const corrente = filtrate.find((s) => s.id === sel) ?? filtrate[0];

  return (
    <div className="sgn">
      <Testata />

      <div className="sgn-grid">
        <Panel title="Casella" pad={false} actions={<span className="t-mono t-muted">{filtrate.length} di {tutte.length}</span>}>
          <div className="sgn-filters">
            <SelectField
              label="Categoria"
              value={cat}
              onChange={(e) => setCat(e.target.value)}
              options={[{ value: "", label: "Tutte" }, ...Object.entries(CATEGORIE_SEGN).map(([value, label]) => ({ value, label }))]}
            />
          </div>
          {filtrate.length === 0 ? (
            <Empty icon="flag" title="Nessuna segnalazione in questa categoria">
              Scegli «Tutte» per vederle tutte.
            </Empty>
          ) : (
            <ul className="sgn-list">
              {filtrate.map((s) => (
                <li key={s.id}>
                  <button type="button" className={`sgn-item${corrente?.id === s.id ? " is-active" : ""}`} onClick={() => setSel(s.id)}>
                    <span className="sgn-item__top">
                      <span className="sgn-code">{s.codice}</span>
                      <span className="sgn-when t-mono">{fmtQuando(isoToLocale(s.creataIl))}</span>
                    </span>
                    <span className="sgn-item__msg">{s.messaggio}</span>
                    <span className="sgn-item__meta">
                      <span>{CATEGORIE_SEGN[s.categoria] ?? s.categoria}</span>
                      <span>{LUOGHI_SEGN[s.aula] ?? s.aula}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        {corrente ? (
          <Dettaglio s={corrente} />
        ) : (
          <Panel>
            <Empty icon="flag" title="Nessuna segnalazione da leggere">
              Quando ne arriva una dal sito, la trovi qui.
            </Empty>
          </Panel>
        )}
      </div>
    </div>
  );
}

function Testata() {
  return (
    <AreaHead
      eyebrow="Gestione aula"
      title="Segnalazioni"
      descr="Quello che arriva dal modulo del sito, anche in forma anonima. Qui si leggono: non c'è un percorso da seguire per chiuderle."
    />
  );
}

function Dettaglio({ s }: { s: Segnalazione }) {
  return (
    <Panel>
      <article className="sgn-detail" aria-label={`Segnalazione ${s.codice}`}>
        <div className="sgn-detail__head">
          <span className="sgn-detail__code">{s.codice}</span>
          <span className="sgn-when t-mono">{fmtQuando(isoToLocale(s.creataIl))}</span>
        </div>

        <p className="sgn-msg">{s.messaggio}</p>

        <dl className="sgn-facts">
          <div>
            <dt>Categoria</dt>
            <dd>{CATEGORIE_SEGN[s.categoria]}</dd>
          </div>
          <div>
            <dt>Dove</dt>
            <dd>{LUOGHI_SEGN[s.aula]}</dd>
          </div>
          <div>
            <dt>Da parte di</dt>
            <dd>{s.anonima ? "Persona anonima" : s.nome || "Nome non indicato"}</dd>
          </div>
          {!s.anonima && s.email && (
            <div>
              <dt>Contatto</dt>
              <dd className="mono">
                <a className="link" href={`mailto:${s.email}?subject=${encodeURIComponent(`Segnalazione ${s.codice}`)}`}>
                  {s.email}
                </a>
              </dd>
            </div>
          )}
        </dl>
      </article>
    </Panel>
  );
}
