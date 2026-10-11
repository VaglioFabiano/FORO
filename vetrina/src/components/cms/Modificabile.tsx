/**
 * Modifica dei testi direttamente sulla homepage, come nel sito in produzione.
 * Chi è entrato come direttivo o persona socia organizzatrice vede "Modifica" su ogni sezione:
 * premendolo le scritte della sezione si incorniciano e, cliccandole, diventano campi di testo
 * sul posto. In basso compare la barra della sezione (Salva, Annulla, elenco di tutti i testi e link).
 * Per chi visita il sito non cambia nulla.
 */
import { useEffect, useMemo, useRef, useState, type MouseEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { Button, Icon, Modal, cx } from "@/components/ui";
import { toast } from "@/components/ui/Toast";
import { TESTI_LINK } from "@/data/testi/link";
import { SEZIONI_MODIFICABILI, type IdSezione, type SezioneModificabile } from "@/data/testi/sezioni";
import { bozzaStore, contenutiStore, type VoceTesto } from "@/lib/contenuti";
import { createStore, useStore } from "@/lib/store";
import { usePuoModificareSito } from "@/lib/vista";
import { CampoInPagina } from "./CampoInPagina";
import { CampoTesto } from "./CampoTesto";
import { chiave, erroreCampo, salvaBozza, scartaBozza, scriviBozza, valoreDi, type Campo } from "./bozza";
import { ModificaContext, type ContestoModifica } from "./contesto";
import "./cms.css";

/** la sezione in modifica (una alla volta) */
const inModificaStore = createStore<IdSezione | null>("cms-in-modifica", null, { persist: false });
/** pulsanti "Modifica" visibili o nascosti (per guardare il sito pulito senza uscire) */
const pulsantiStore = createStore<boolean>("cms-pulsanti", true);

function campiDi(s: SezioneModificabile): Campo[] {
  const testi = s.gruppi.flatMap((g) => g.voci.map((v) => ({ g, v })));
  const link = (s.link ?? []).flatMap((k) => {
    const v = TESTI_LINK.voci.find((x) => x.key === k);
    return v ? [{ g: TESTI_LINK, v }] : [];
  });
  return [...link, ...testi];
}

function esci(sezione: IdSezione, salva: boolean) {
  const campi = campiDi(SEZIONI_MODIFICABILI[sezione]);
  if (salva) {
    // la sezione si chiude solo se il server ha salvato; altrimenti la bozza resta e si può riprovare
    return salvaBozza(campi).then(() => inModificaStore.set(null));
  }
  scartaBozza(campi);
  inModificaStore.set(null);
  return Promise.resolve();
}

/** chiude i link e i pulsanti della sezione mentre si modifica: un clic su una scritta apre il suo campo */
const INTERATTIVI = "a, button, summary, label, input, select, textarea, [role='button'], [role='tab']";

export function Modificabile({ sezione, children }: { sezione: IdSezione; children: ReactNode }) {
  const puo = usePuoModificareSito();
  const visibili = useStore(pulsantiStore);
  const inModifica = useStore(inModificaStore);
  const bozza = useStore(bozzaStore);
  const salvati = useStore(contenutiStore);
  const qui = puo && inModifica === sezione;
  const visti = useRef(new Map<string, { voce: VoceTesto; n: number }>());
  const [aperto, setAperto] = useState<{ chiave: string; el: HTMLElement } | null>(null);
  const [elenco, setElenco] = useState(false);

  const ctx = useMemo<ContestoModifica>(
    () => ({
      attiva: qui,
      registra: (k, voce) => {
        const m = visti.current;
        m.set(k, { voce, n: (m.get(k)?.n ?? 0) + 1 });
        return () => {
          const x = m.get(k);
          if (!x) return;
          if (x.n <= 1) m.delete(k);
          else m.set(k, { ...x, n: x.n - 1 });
        };
      },
    }),
    [qui],
  );

  useEffect(() => {
    if (!qui) setAperto(null);
  }, [qui]);
  // se si lascia la pagina con la sezione in modifica, le modifiche non salvate si scartano
  useEffect(
    () => () => {
      if (inModificaStore.get() === sezione) esci(sezione, false);
    },
    [sezione],
  );

  if (!puo) return <>{children}</>;
  const s = SEZIONI_MODIFICABILI[sezione];

  const onClickCapture = (e: MouseEvent) => {
    const t = e.target as Element;
    const el = t.closest<HTMLElement>("[data-cms-key]");
    if (el) {
      e.preventDefault();
      e.stopPropagation();
      setAperto({ chiave: el.dataset.cmsKey!, el });
    } else if (t.closest(INTERATTIVI)) {
      e.preventDefault();
      e.stopPropagation();
    }
  };
  const voceAperta = aperto ? visti.current.get(aperto.chiave)?.voce : undefined;

  return (
    <ModificaContext.Provider value={ctx}>
      <div
        className={cx("cms-wrap", `cms-wrap--${sezione}`, qui && "is-attiva")}
        onClickCapture={qui ? onClickCapture : undefined}
        onSubmitCapture={qui ? (e) => e.preventDefault() : undefined}
      >
        {/* resta in vista mentre si scorre la sezione: nelle sezioni lunghe il pulsante non si perde */}
        {visibili && inModifica === null && (
          <div className="cms-ancora">
            <button type="button" className="cms-btn" onClick={() => inModificaStore.set(sezione)} aria-label={`Modifica le scritte della sezione ${s.titolo}`}>
              <Icon name="edit" size={16} /> Modifica <span className="cms-btn__sez">{s.titolo}</span>
            </button>
          </div>
        )}
        {children}
      </div>
      {qui && <BarraSezione sezione={sezione} s={s} onElenco={() => setElenco(true)} />}
      {qui && aperto && voceAperta && (
        <CampoInPagina
          key={aperto.chiave}
          el={aperto.el}
          voce={voceAperta}
          valore={valoreDi(aperto.chiave, voceAperta, bozza, salvati)}
          onChange={(v) => scriviBozza(aperto.chiave, v)}
          onChiudi={() => setAperto(null)}
        />
      )}
      {qui && elenco && <ElencoTesti s={s} visti={new Set(visti.current.keys())} onClose={() => setElenco(false)} />}
    </ModificaContext.Provider>
  );
}

/** barra in basso mentre una sezione è in modifica */
function BarraSezione({ sezione, s, onElenco }: { sezione: IdSezione; s: SezioneModificabile; onElenco: () => void }) {
  const bozza = useStore(bozzaStore);
  const salvati = useStore(contenutiStore);
  const campi = campiDi(s);
  const nMod = campi.filter((c) => bozza[chiave(c)] !== undefined && bozza[chiave(c)] !== (salvati[chiave(c)] ?? c.v.default)).length;
  const nErr = campi.filter((c) => erroreCampo(c.v, valoreDi(chiave(c), c.v, bozza, salvati))).length;
  const nOriginali = campi.filter((c) => valoreDi(chiave(c), c.v, bozza, salvati) !== c.v.default).length;

  const salva = () => {
    if (nErr) {
      toast("Correggi i campi segnati in rosso prima di salvare: li trovi in «Tutti i testi e i link».", "errore");
      onElenco();
      return;
    }
    esci(sezione, true).then(
      () => toast(`${nMod} ${nMod === 1 ? "modifica è già visibile" : "modifiche sono già visibili"} sul sito.`, "ok", s.titolo),
      (e: Error) => toast(e.message || "Non siamo riusciti a salvare. Riprova.", "errore", "Modifiche non salvate"),
    );
  };

  return createPortal(
    <div className="cms-barra-ed" role="toolbar" aria-label={`Modifica della sezione ${s.titolo}`}>
      <span className="cms-barra-ed__tit">
        <Icon name="edit" size={16} /> Stai modificando <strong>{s.titolo}</strong>
      </span>
      <span className={cx("cms-barra-ed__stato", nErr > 0 && "is-err")} role="status">
        {nErr
          ? `${nErr} ${nErr === 1 ? "campo da correggere" : "campi da correggere"}`
          : nMod
            ? `${nMod} ${nMod === 1 ? "modifica da salvare" : "modifiche da salvare"}`
            : "Clicca una scritta per cambiarla"}
      </span>
      <span className="cms-barra-ed__azioni">
        <button type="button" className="cms-barra-ed__btn" onClick={onElenco}>
          Tutti i testi e i link
        </button>
        <button
          type="button"
          className="cms-barra-ed__btn"
          disabled={nOriginali === 0}
          onClick={() => campi.forEach((c) => scriviBozza(chiave(c), c.v.default))}
          title="Riporta tutti i testi della sezione a quelli originali (poi salva per confermare)"
        >
          Ripristina originali
        </button>
        <button type="button" className="cms-barra-ed__btn" onClick={() => esci(sezione, false)}>
          Annulla
        </button>
        <button type="button" className="cms-barra-ed__btn cms-barra-ed__btn--salva" disabled={nMod === 0} onClick={salva}>
          <Icon name="check" size={16} /> Salva
        </button>
      </span>
    </div>,
    document.body,
  );
}

/** tutti i testi e i link della sezione, anche quelli che non si vedono (segnaposto, messaggi, link) */
function ElencoTesti({ s, visti, onClose }: { s: SezioneModificabile; visti: Set<string>; onClose: () => void }) {
  const bozza = useStore(bozzaStore);
  const salvati = useStore(contenutiStore);
  const campi = campiDi(s);
  const link = campi.filter((c) => c.g.id === TESTI_LINK.id);
  const testi = campi.filter((c) => c.g.id !== TESTI_LINK.id);
  const nascosti = testi.filter((c) => !visti.has(chiave(c)));
  const inPagina = testi.filter((c) => visti.has(chiave(c)));
  const elenco = (l: Campo[]) =>
    l.map((c) => <CampoTesto key={chiave(c)} voce={c.v} valore={valoreDi(chiave(c), c.v, bozza, salvati)} onChange={(v) => scriviBozza(chiave(c), v)} />);

  return (
    <Modal open onClose={onClose} title={`Testi e link · ${s.titolo}`} width={560} side="right">
      <div className="cms-ed">
        <p className="cms-ed__intro">
          Le modifiche si vedono subito nella pagina. Per confermarle premi <b>Salva</b> nella barra in basso.
        </p>
        {s.altrove && (
          <p className="cms-ed__altrove">
            <Icon name="info" size={16} /> {s.altrove.testo}{" "}
            <Link className="link link--always" to={s.altrove.to}>
              {s.altrove.label}
            </Link>
          </p>
        )}
        {link.length > 0 && (
          <fieldset className="cms-ed__gruppo">
            <legend>Link</legend>
            {elenco(link)}
          </fieldset>
        )}
        {nascosti.length > 0 && (
          <fieldset className="cms-ed__gruppo">
            <legend>
              Testi che non si vedono adesso <span className="t-mono">{nascosti.length}</span>
            </legend>
            <p className="cms-ed__nota">Segnaposto dei campi, messaggi dopo un invio, testi per i lettori di schermo, stati che cambiano durante il giorno.</p>
            {elenco(nascosti)}
          </fieldset>
        )}
        {inPagina.length > 0 && (
          <fieldset className="cms-ed__gruppo">
            <legend>
              Testi nella pagina <span className="t-mono">{inPagina.length}</span>
            </legend>
            {elenco(inPagina)}
          </fieldset>
        )}
        <div className="cms-ed__foot">
          <Button variant="lanterna" icon="check" onClick={onClose}>
            Fatto
          </Button>
        </div>
      </div>
    </Modal>
  );
}

/** barra in basso a destra quando nessuna sezione è in modifica */
export function BarraModifica() {
  const puo = usePuoModificareSito();
  const visibili = useStore(pulsantiStore);
  const inModifica = useStore(inModificaStore);
  if (!puo || inModifica !== null) return null;
  return (
    <div className="cms-barra" role="region" aria-label="Modifica del sito">
      <Icon name="edit" size={16} className="cms-barra__ico" />
      <span className="cms-barra__testo">{visibili ? "Premi «Modifica» su una sezione per cambiarne le scritte" : "Pulsanti di modifica nascosti"}</span>
      <button type="button" className="cms-barra__btn" onClick={() => pulsantiStore.set(!visibili)} aria-pressed={!visibili}>
        {visibili ? "Nascondi" : "Mostra"}
      </button>
      <Link className="cms-barra__btn" to="/area">
        Area volontari
      </Link>
    </div>
  );
}
