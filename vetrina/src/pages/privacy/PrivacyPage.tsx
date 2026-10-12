/**
 * /privacy — informativa sul trattamento dei dati (artt. 13–14 GDPR), con indice laterale.
 */
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PageHero } from "@/components/domain/PageHero";
import { Button, Icon, Reveal, cx } from "@/components/ui";
import { scrollToTarget } from "@/components/layout/Layout";
import { ORG } from "@/data/org";
import "./privacy.css";
import { useLink } from "@/lib/link";

const AGGIORNATA = "12.10.2026";

const INDICE = [
  { id: "titolare", label: "Chi tratta i tuoi dati" },
  { id: "dati", label: "Quali dati, servizio per servizio" },
  { id: "basi", label: "Finalità e basi giuridiche" },
  { id: "conservazione", label: "Per quanto tempo" },
  { id: "destinatari", label: "A chi li comunichiamo" },
  { id: "foto", label: "Foto e video degli eventi" },
  { id: "diritti", label: "I tuoi diritti" },
  { id: "cookie", label: "Cookie e archiviazione locale" },
  { id: "aggiornamenti", label: "Aggiornamenti" },
];

const SERVIZI = [
  {
    nome: "Prenotazione eventi",
    dati: "Nome, cognome, email.",
    perche:
      "Tenere il tuo posto, avvisarti se l'evento cambia orario o viene annullato, contare le presenze. Al termine dell'evento nome, cognome ed email vengono cancellati. Si prenotano solo gli eventi: l'aula studio non si prenota.",
  },
  {
    nome: "Tesseramento per le proiezioni",
    dati: "Nome, cognome, data e luogo di nascita, email, telefono se ce lo dai.",
    perche:
      "Rilasciarti la tessera che serve per partecipare alle proiezioni e tenere l'elenco delle persone tesserate, da conservare nel caso in cui MPLC, che ci rilascia la licenza per le proiezioni, ci chieda l'elenco dei tesserati.",
  },
  {
    nome: "Comunicazioni ai tesserati",
    dati: "L'email che ci hai dato con il tesseramento.",
    perche:
      "Mandarti il programma delle proiezioni. Le ricevono solo le persone tesserate: non abbiamo una newsletter aperta a tutti.",
  },
  {
    nome: "Segnalazioni",
    dati: "Categoria, luogo e testo del messaggio. Nome ed email solo se scegli di non restare anonima.",
    perche: "Risolvere il problema che ci segnali e, se lo chiedi, risponderti.",
  },
];

const BASI = [
  {
    cosa: "Prenotazioni agli eventi, tesseramento e comunicazioni ai tesserati",
    base: "Art. 6.1.b",
    descr: "esecuzione di un rapporto o di misure che ci chiedi tu",
  },
  { cosa: "Contabilità dell'associazione", base: "Art. 6.1.c", descr: "obblighi di legge per gli enti del Terzo Settore" },
  { cosa: "Contatto nelle segnalazioni", base: "Art. 6.1.a", descr: "il tuo consenso, che puoi revocare quando vuoi" },
  {
    cosa: "Sicurezza dell'aula, foto di gruppo, mappa e contenuti social nella homepage",
    base: "Art. 6.1.f",
    descr: "nostro legittimo interesse, bilanciato con i tuoi diritti",
  },
];

export default function PrivacyPage() {
  const { email } = useLink();
  const [attivo, setAttivo] = useState(INDICE[0].id);

  useEffect(() => {
    const els = INDICE.map((i) => document.getElementById(i.id)).filter(Boolean) as HTMLElement[];
    const io = new IntersectionObserver(
      (entries) => {
        const vis = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (vis[0]) setAttivo(vis[0].target.id);
      },
      { rootMargin: "-20% 0px -65% 0px" },
    );
    els.forEach((e) => io.observe(e));
    return () => io.disconnect();
  }, []);

  return (
    <>
      <PageHero
        eyebrow="Privacy"
        title={["Informativa", "privacy"]}
        intro={
          <>
            Quali dati ci lasci quando usi il sito, prenoti un evento o ti tesseri per le proiezioni, perché li chiediamo, per
            quanto li teniamo e come puoi chiederci di vederli o cancellarli.
          </>
        }
        aside={
          <p className="pv-updated t-mono">
            Aggiornata il {AGGIORNATA} · Regolamento UE 2016/679
          </p>
        }
      />

      <div className="container pv">
        <div className="pv-grid">
          <aside className="pv-toc">
            <nav aria-label="Indice dell'informativa">
              <span className="t-label pv-toc__k">Indice</span>
              <ol>
                {INDICE.map((i, n) => (
                  <li key={i.id}>
                    <a
                      href={`#${i.id}`}
                      className={cx("pv-toc__a", attivo === i.id && "is-active")}
                      aria-current={attivo === i.id ? "true" : undefined}
                      onClick={(e) => {
                        e.preventDefault();
                        scrollToTarget(`#${i.id}`, -100);
                        window.history.replaceState(null, "", `#${i.id}`);
                      }}
                    >
                      <span className="t-mono">{String(n + 1).padStart(2, "0")}</span>
                      {i.label}
                    </a>
                  </li>
                ))}
              </ol>
            </nav>
          </aside>

          <article className="pv-body">
            <Reveal>
              <p className="pv-lead">
                In breve: chiediamo solo i dati che servono per il servizio che usi, non li vendiamo e non li usiamo per
                pubblicità. Le segnalazioni sono anonime, se non scegli tu di firmarle.
              </p>
            </Reveal>

            <section id="titolare" className="pv-sec">
              <h2 className="pv-h2">
                <span className="t-mono">01</span>Chi tratta i tuoi dati
              </h2>
              <div className="prose">
                <p>
                  Il titolare del trattamento è l'<strong>{ORG.nomeEsteso}</strong>, con sede legale in {ORG.sedeLegale}. Per
                  qualunque domanda su questa informativa, o per esercitare i tuoi diritti, scrivici.
                </p>
              </div>
              <dl className="pv-card">
                <div>
                  <dt className="t-mono">Titolare</dt>
                  <dd>{ORG.nomeEsteso}</dd>
                </div>
                <div>
                  <dt className="t-mono">Sede legale</dt>
                  <dd>{ORG.sedeLegale}</dd>
                </div>
                <div>
                  <dt className="t-mono">Email</dt>
                  <dd>
                    <a className="link link--always" href={`mailto:${email}`}>
                      {email}
                    </a>
                  </dd>
                </div>
              </dl>
            </section>

            <section id="dati" className="pv-sec">
              <h2 className="pv-h2">
                <span className="t-mono">02</span>Quali dati, servizio per servizio
              </h2>
              <div className="prose">
                <p>Ogni modulo del sito chiede soltanto ciò che serve a quel servizio. Se non usi un servizio, non raccogliamo nulla.</p>
              </div>
              <ul className="pv-services">
                {SERVIZI.map((s, i) => (
                  <li key={s.nome}>
                    <span className="pv-services__n t-mono">{String.fromCharCode(97 + i)})</span>
                    <div>
                      <h3 className="pv-services__name">{s.nome}</h3>
                      <p>
                        <span className="t-label">Dati</span>
                        {s.dati}
                      </p>
                      <p>
                        <span className="t-label">Perché</span>
                        {s.perche}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
              <div className="prose">
                <p>
                  Non ti chiediamo mai dati particolari (salute, opinioni politiche, religione). Ti chiediamo di non inserirli nemmeno nel
                  testo delle segnalazioni.
                </p>
              </div>
            </section>

            <section id="basi" className="pv-sec">
              <h2 className="pv-h2">
                <span className="t-mono">03</span>Finalità e basi giuridiche
              </h2>
              <div className="prose">
                <p>Trattiamo i dati solo quando c'è una base giuridica prevista dall'art. 6 del GDPR.</p>
              </div>
              <div className="pv-table" role="table" aria-label="Basi giuridiche del trattamento">
                <div className="pv-table__row pv-table__row--head" role="row">
                  <span role="columnheader">Trattamento</span>
                  <span role="columnheader">Base</span>
                  <span role="columnheader">Che cosa significa</span>
                </div>
                {BASI.map((b) => (
                  <div className="pv-table__row" role="row" key={b.base}>
                    <span role="cell" className="pv-table__cosa">
                      {b.cosa}
                    </span>
                    <span role="cell" className="t-mono pv-table__base">
                      {b.base}
                    </span>
                    <span role="cell" className="pv-table__descr">
                      {b.descr}
                    </span>
                  </div>
                ))}
              </div>
            </section>

            <section id="conservazione" className="pv-sec">
              <h2 className="pv-h2">
                <span className="t-mono">04</span>Per quanto tempo
              </h2>
              <div className="prose">
                <ul>
                  <li>
                    <strong>Prenotazioni agli eventi:</strong> al termine dell'evento cancelliamo nome, cognome, email ed eventuali note
                    (lo fa il sito in automatico, entro la sera del giorno dopo). Teniamo solo il numero dei posti prenotati e delle persone
                    arrivate.
                  </li>
                  <li>
                    <strong>Tesseramento per le proiezioni:</strong> finché il tuo tesseramento continua e, anche dopo, finché MPLC può
                    chiederci l'elenco dei tesserati per verificare la licenza delle proiezioni. Poi cancelliamo i tuoi dati.
                  </li>
                  <li>
                    <strong>Comunicazioni ai tesserati:</strong> anche queste finché il tesseramento continua. Se non vuoi più riceverle,
                    scrivici e smettiamo subito.
                  </li>
                  <li>
                    <strong>Segnalazioni:</strong> fino a dodici mesi dalla chiusura. Il nome e l'email, se li hai lasciati, li cancelliamo
                    appena ti abbiamo risposto.
                  </li>
                </ul>
              </div>
            </section>

            <section id="destinatari" className="pv-sec">
              <h2 className="pv-h2">
                <span className="t-mono">05</span>A chi li comunichiamo
              </h2>
              <div className="prose">
                <p>
                  I dati li vedono soltanto le persone del direttivo e i volontari e le volontarie che ne hanno bisogno per il loro
                  turno. Non li vendiamo e non li cediamo a nessuno. Fuori dall'associazione comunichiamo soltanto:
                </p>
                <ul>
                  <li>
                    al <strong>Comune di Piossasco</strong>, il numero di persone che frequentano l'aula e partecipano agli eventi, come
                    prevede la convenzione per l'uso degli spazi. È un dato aggregato: niente nomi;
                  </li>
                  <li>
                    a <strong>MPLC Italia</strong> e <strong>SIAE</strong>, per le proiezioni e gli eventi con musica, il titolo
                    dell'opera e il numero di spettatori, come richiesto dalle licenze. A <strong>MPLC Italia</strong>, se ce lo chiede
                    per la licenza di proiezione, anche l'elenco delle persone tesserate.
                  </li>
                </ul>
              </div>
            </section>

            <section id="foto" className="pv-sec">
              <h2 className="pv-h2">
                <span className="t-mono">06</span>Foto e video degli eventi
              </h2>
              <div className="prose">
                <p>
                  Durante alcuni eventi scattiamo foto e giriamo brevi video per raccontare le attività sul sito e sui nostri canali
                  social. Lo diciamo sempre all'inizio dell'evento.
                </p>
                <p>
                  Se non vuoi comparire, dillo a chi fotografa: ti escludiamo dalle inquadrature. Se ti riconosci in una foto già
                  pubblicata e vuoi che la togliamo, scrivici e la rimuoviamo. Per le persone minorenni pubblichiamo immagini solo con il
                  consenso di chi ne ha la responsabilità.
                </p>
              </div>
            </section>

            <section id="diritti" className="pv-sec">
              <h2 className="pv-h2">
                <span className="t-mono">07</span>I tuoi diritti
              </h2>
              <div className="prose">
                <p>
                  In base agli <strong>articoli 15–22 del GDPR</strong> puoi chiederci in qualunque momento di:
                </p>
              </div>
              <ul className="pv-rights">
                {[
                  ["Art. 15", "vedere quali dati abbiamo su di te"],
                  ["Art. 16", "correggerli"],
                  ["Art. 17", "cancellarli"],
                  ["Art. 18", "limitarne l'uso"],
                  ["Art. 20", "riceverli in un formato leggibile"],
                  ["Art. 21", "opporti al trattamento"],
                ].map(([a, t]) => (
                  <li key={a}>
                    <span className="t-mono">{a}</span>
                    {t}
                  </li>
                ))}
              </ul>
              <div className="prose">
                <p>
                  Scrivici a <a href={`mailto:${email}`}>{email}</a>: ti rispondiamo entro trenta giorni. Puoi revocare un
                  consenso quando vuoi, senza conseguenze su quanto fatto prima.
                </p>
              </div>
            </section>

            <section id="cookie" className="pv-sec">
              <h2 className="pv-h2">
                <span className="t-mono">08</span>Cookie e archiviazione locale
              </h2>
              <div className="prose">
                <p>
                  Il sito non usa cookie di profilazione né strumenti di statistica di terze parti. La homepage mostra sempre questi
                  contenuti esterni, che arrivano direttamente dai rispettivi servizi. Quando la pagina li carica, ricevono l'indirizzo IP
                  del tuo dispositivo e possono usare cookie propri, secondo le loro informative:
                </p>
              </div>
              <dl className="pv-card">
                <div>
                  <dt className="t-mono">Mappa</dt>
                  <dd>
                    Google Maps ·{" "}
                    <a href="https://policies.google.com/privacy?hl=it" target="_blank" rel="noreferrer">
                      informativa di Google
                    </a>
                  </dd>
                </div>
                <div>
                  <dt className="t-mono">Social</dt>
                  <dd>
                    Instagram ·{" "}
                    <a href="https://privacycenter.instagram.com/policy" target="_blank" rel="noreferrer">
                      informativa di Instagram
                    </a>
                    <br />
                    Telegram ·{" "}
                    <a href="https://telegram.org/privacy" target="_blank" rel="noreferrer">
                      informativa di Telegram
                    </a>
                  </dd>
                </div>
              </dl>
              <div className="prose">
                <p>
                  Alla prima visita ti chiediamo di scegliere fra «Accetta tutti» e «Solo necessari». Noi salviamo soltanto nel tuo browser
                  (archiviazione locale):
                </p>
                <ul>
                  <li>la tua scelta sui cookie;</li>
                  <li>le prenotazioni agli eventi fatte da questo dispositivo, per mostrarti il biglietto e permetterti di annullarlo;</li>
                  <li>
                    per volontari e volontarie, l'accesso all'area riservata, se scegli «Ricordami su questo dispositivo». Questi dati
                    restano solo sul tuo dispositivo.
                  </li>
                </ul>
                <p>Puoi cambiare scelta in ogni momento, anche dal link «Preferenze cookie» in fondo a ogni pagina.</p>
              </div>
              <div className="pv-cookie">
                <span className="pv-cookie__ic disc" aria-hidden>
                  <Icon name="cookie" size={22} />
                </span>
                <p>Rivedi la scelta che hai fatto e cambiala.</p>
                <Button variant="outline" icon="settings" onClick={() => window.dispatchEvent(new Event("foro:cookie-open"))}>
                  Cambia la scelta sui cookie
                </Button>
              </div>
            </section>

            <section id="aggiornamenti" className="pv-sec">
              <h2 className="pv-h2">
                <span className="t-mono">09</span>Aggiornamenti
              </h2>
              <div className="prose">
                <p>
                  Se cambiamo il modo in cui trattiamo i dati, aggiorniamo questa pagina e lo segnaliamo sul canale Telegram. La versione
                  in vigore è sempre questa.
                </p>
              </div>
              <p className="pv-stamp t-mono">
                Ultimo aggiornamento · {AGGIORNATA}
              </p>
              <Link to="/" className="pv-back">
                <Icon name="arrow-left" size={16} /> Torna alla home
              </Link>
            </section>
          </article>
        </div>
      </div>
    </>
  );
}
