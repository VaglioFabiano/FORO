/**
 * Manuale del turno: i contenuti sono quelli del manuale del vecchio gestionale (GestioneTurno),
 * con gli stessi link ai documenti, alla community e i numeri del direttivo.
 */
import { useState, type ReactNode } from "react";
import { Avatar, Button, ButtonLink, Icon, Segmented, cx, type IconName } from "@/components/ui";
import { toast } from "@/components/ui/Toast";
import { LIVELLI } from "@/data/volontari";
import { AreaHead, Panel } from "../ui";
import "./manuale.css";

type Tab = "apertura" | "chiusura" | "regole" | "straordinari" | "contatti" | "sito";
const TABS: { value: Tab; label: string }[] = [
  { value: "apertura", label: "Apertura" },
  { value: "chiusura", label: "Chiusura" },
  { value: "regole", label: "Regole e annotazioni" },
  { value: "straordinari", label: "Eventi straordinari" },
  { value: "contatti", label: "Contatti" },
  { value: "sito", label: "Il sito" },
];

/* link del vecchio manuale */
const LINK = {
  regolamento: "https://drive.google.com/file/d/1VxcPxOHpDyBKgKV6XkK2btnhYmlh24RV/view",
  community: "https://chat.whatsapp.com/KFUkTUczPeR2bNztucGpam",
  consigli: "https://docs.google.com/document/d/17eKmt33uPob5juVa0zIdS0tZjRy2wqU7ixtLrhVj31I/edit?tab=t.0",
  sanzioni: "https://docs.google.com/document/d/1Uh2Fyq25f1I04rlaYIv9u9YpL-XR27eTGvpekRuNDyo/edit?tab=t.0",
};

/** Direttivo, per le emergenze operative */
const DIRETTIVO: { nome: string; tel: string }[] = [
  { nome: "Francesco Ruocco", tel: "331 222 5176" },
  { nome: "Michela Goss", tel: "377 545 2977" },
  { nome: "Fabiano Vaglio", tel: "345 088 1086" },
  { nome: "Alessia D'Agostini", tel: "334 324 5369" },
  { nome: "Federico Moscato", tel: "345 926 3569" },
  { nome: "Francesco Rosso", tel: "346 491 6937" },
  { nome: "Irene D'Agostini", tel: "331 765 7509" },
  { nome: "Virginia Brocchini", tel: "392 349 8900" },
];
const REFERENTE_SITO = DIRETTIVO.find((p) => p.nome === "Fabiano Vaglio")!;
const tel = (n: string) => `tel:+39${n.replace(/\s/g, "")}`;

type Voce = { icon: IconName; titolo: string; testo?: ReactNode };

const APERTURA: Voce[] = [
  {
    icon: "access",
    titolo: "Accesso alla struttura",
    testo: (
      <>
        Il primo passo per l'apertura del centro è <b>aprire il cancelletto esterno su via Alfieri</b>. Questo permetterà l'accesso agli utenti che
        arriveranno durante il turno. Una volta aperto il cancelletto, ricordati di controllare se è giovedì: in questo caso dovrai{" "}
        <b>portare dentro i bidoni dell'immondizia</b> che sono stati messi fuori per la raccolta.
      </>
    ),
  },
  {
    icon: "sun",
    titolo: "Sistema di illuminazione",
    testo: (
      <>
        L'illuminazione del centro richiede alcuni passaggi specifici. Per le <b>luci interne</b>, dovrai utilizzare l'interruttore che si trova nella
        zona ristoro, situato a sinistra dell'ingresso principale. Gli interruttori per l'aula si trovano invece nel piccolo atrio. Le{" "}
        <b>luci esterne</b> sono gestite da un sistema automatico con timer, quindi non richiedono alcun intervento manuale da parte tua.
      </>
    ),
  },
  {
    icon: "aula",
    titolo: "Controlli e sistemazione ambientale",
    testo: (
      <>
        Prima dell'arrivo degli utenti, è importante fare un <b>controllo dell'ordine generale</b> sia nell'aula principale che nella zona della
        macchinetta del caffè. Assicurati che tutto sia pulito e in ordine. Per il comfort degli utenti, regola il{" "}
        <b>riscaldamento tramite le termovalvole</b> che si trovano alla base dei termosifoni. La temperatura ottimale contribuirà a creare un ambiente
        accogliente per lo studio.
      </>
    ),
  },
  { icon: "list", titolo: "Info Point e gestione digitale" },
];

const CHIUSURA: Voce[] = [
  {
    icon: "refresh",
    titolo: "Pulizia e sistemazione degli spazi",
    testo: (
      <>
        La chiusura inizia con la <b>pulizia accurata dei tavoli</b> utilizzando lo spruzzino e i rotoli di carta che trovi nella zona ristoro. È
        importante lasciare gli spazi puliti e in ordine per chi utilizzerà il centro il giorno successivo. Dedica qualche minuto extra a controllare
        che non ci siano oggetti dimenticati o rifiuti sparsi nelle diverse aree.
      </>
    ),
  },
  {
    icon: "plug",
    titolo: "Spegnimento delle apparecchiature",
    testo: (
      <>
        Per quanto riguarda il <b>computer dell'Info Point</b>, dovrai spegnerlo ma lasciare aperti Chrome e l'applicazione Memo per facilitare
        l'apertura del turno successivo. Successivamente, <b>spegni tutte le ciabatte elettriche</b> che si trovano sotto i tavoli per garantire la
        sicurezza e il risparmio energetico durante la notte.
      </>
    ),
  },
  {
    icon: "sun",
    titolo: "Sistema di illuminazione e sicurezza",
    testo: (
      <>
        Lo spegnimento delle luci richiede attenzione: dovrai spegnere le <b>luci interne, dei bagni e del foyer</b>. Tieni presente che alcune luci
        del foyer sono gestite direttamente dalla biblioteca, quindi non preoccuparti se alcune restano accese. L'importante è spegnere quelle sotto il
        tuo controllo.
      </>
    ),
  },
  {
    icon: "key",
    titolo: "Chiusura degli accessi",
    testo: (
      <>
        La fase di chiusura degli accessi è cruciale per la sicurezza. Dovrai chiudere sistematicamente tutti gli ingressi: l'
        <b>aula studio con la chiave del laccetto nero</b>, l'<b>aula Agorà con la chiave grande rossa</b> e la{" "}
        <b>vetrata d'ingresso con la chiave quadrata</b>. Non dimenticare di controllare che la porta antincendio interna sia ben chiusa.
      </>
    ),
  },
  {
    icon: "pin",
    titolo: "Gestione rifiuti e consegne",
    testo: (
      <>
        Se è mercoledì, dovrai <b>portare i bidoni pieni davanti al cancello grande</b> per la raccolta del giorno successivo. Infine, chiudi i
        cancelletti esterni (che non richiedono chiavi) e <b>consegna le chiavi al turno successivo</b> o riponile nel luogo designato se non c'è
        nessuno in attesa.
      </>
    ),
  },
];

/** procedura come elenco puntato: titolo in evidenza e testo sotto */
function Elenco({ voci }: { voci: Voce[] }) {
  return (
    <ul className="man__punti">
      {voci.map((v) => (
        <li key={v.titolo}>
          <Icon name={v.icon} size={20} className="man__punto-ico" />
          <div>
            <h3 className="man__h">{v.titolo}</h3>
            {v.testo ? <p>{v.testo}</p> : <p className="man__nota">Questa parte del manuale è ancora da scrivere.</p>}
          </div>
        </li>
      ))}
    </ul>
  );
}

function Blocco({ icon, titolo, children, className }: { icon: IconName; titolo: string; children: ReactNode; className?: string }) {
  return (
    <article className={cx("man__card", className)}>
      <span className="disc man__card-ico">
        <Icon name={icon} size={20} />
      </span>
      <h3>{titolo}</h3>
      <div className="man__card-body">{children}</div>
    </article>
  );
}

/** link esterno (documenti Google, community WhatsApp) con l'aspetto di un bottone */
function Esterno({ href, icon, children, pieno }: { href: string; icon: IconName; children: ReactNode; pieno?: boolean }) {
  return (
    <a className={cx("btn btn--sm", !pieno && "btn--outline")} href={href} target="_blank" rel="noopener noreferrer">
      <Icon name={icon} size={18} />
      {children}
      <Icon name="external" size={14} />
    </a>
  );
}

const RUOLI: { l: 1 | 2 | 3 | 4; ruoli: string; descr: string }[] = [
  {
    l: 1,
    ruoli: "Gestione burocratica dell'associazione, decisioni amministrative, responsabili del coordinamento generale delle attività.",
    descr: "I membri del direttivo hanno accesso completo alla piattaforma, possono creare nuovi utenti e darne i relativi privilegi.",
  },
  {
    l: 2,
    ruoli: "Coordinamento eventi, gestione logistica di orari e turni, supporto al direttivo.",
    descr: "I soci organizzatori supportano il direttivo nella gestione operativa, hanno permessi avanzati per modificare turni e orari oltre che per creare gli eventi.",
  },
  {
    l: 3,
    ruoli: "Gestione turni assegnati, manutenzione ordinaria.",
    descr: "I soci operativi gestiscono i turni quotidiani, hanno accesso alle funzioni base della dashboard per segnalare presenze e annotazioni.",
  },
  {
    l: 4,
    ruoli: "Supporto durante i turni e accesso alla funzionalità di gestione presenze, come per qualsiasi livello sopra.",
    descr: "I volontari supportano le attività del centro con permessi limitati, possono visualizzare informazioni base e contribuire alle attività.",
  },
];

export default function Manuale() {
  const [tab, setTab] = useState<Tab>("apertura");

  return (
    <div className="man">
      <AreaHead
        eyebrow="Turno in aula"
        title="Manuale del turno"
        descr="Tutto quello che serve da quando apri il cancelletto a quando consegni le chiavi."
        actions={
          <Button variant="outline" icon="download" onClick={() => toast("In questa versione di prova il manuale non si scarica.", "info")}>
            Scarica in PDF
          </Button>
        }
      />

      <div className="man__tabs">
        <Segmented value={tab} onChange={setTab} options={TABS} />
      </div>

      {tab === "apertura" && (
        <Panel title="Procedura di apertura">
          <Elenco voci={APERTURA} />
        </Panel>
      )}

      {tab === "chiusura" && (
        <Panel title="Procedura di chiusura">
          <Elenco voci={CHIUSURA} />
        </Panel>
      )}

      {tab === "regole" && (
        <div className="man__grid">
          <Blocco icon="shield" titolo="1. Supervisione sala studio">
            <p>Imporre il rispetto del regolamento dell'aula studio.</p>
            <p className="man__tip">
              <b>Consiglio:</b> se c'è confusione nell'area ristoro, chiudere entrambe le porte dell'aula studio.
            </p>
            <Esterno href={LINK.regolamento} icon="document">
              Regolamento
            </Esterno>
          </Blocco>
          <Blocco icon="chart" titolo="2. Conteggio presenze">
            <p>Annotare il numero di persone presenti durante il turno nella sezione presenze della dashboard.</p>
            <ButtonLink to="/area/presenze" variant="outline" size="sm" icon="arrow-right">
              Vai alle presenze
            </ButtonLink>
          </Blocco>
          <Blocco icon="edit" titolo="3. Note e proposte">
            <p>Annotare dubbi, necessità e proposte sul bloc-notes del desktop e/o nel gruppo WhatsApp.</p>
            <Esterno href={LINK.community} icon="whatsapp">
              Community WhatsApp
            </Esterno>
          </Blocco>
          <Blocco icon="coffee" titolo="4. Materiali disponibili">
            <ul className="man__chips">
              {["Cialde caffè", "Assorbenti", "Coperte", "Tazze", "Materiali pulizia"].map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ul>
            <p className="man__tip">Tutto nell'armadio bianco vicino all'Info Point.</p>
          </Blocco>
        </div>
      )}

      {tab === "straordinari" && (
        <div className="man__grid">
          <Blocco icon="pin" titolo="Chiusura per Consiglio comunale">
            <p>Vedi il file dedicato.</p>
            <Esterno href={LINK.consigli} icon="document">
              004 Sistemazione per Consigli Comunali
            </Esterno>
          </Blocco>
          <Blocco icon="orari" titolo="Chiusura per Commissioni comunali">
            <p>Solitamente in questo caso si tratta solo di una chiusura ordinaria, solo si chiuderà prima.</p>
          </Blocco>
          <Blocco icon="flag" titolo="Sanzioni utenti">
            <p>Le sanzioni utenti vanno concordate e discusse in assemblea soci o, in caso di assoluta emergenza, gestite dal direttivo.</p>
            <Esterno href={LINK.sanzioni} icon="document">
              Verbale sanzioni 2023
            </Esterno>
          </Blocco>
          <Blocco icon="send" titolo="Corrieri e addetti" className="man__card--wide">
            <dl className="man__dl">
              <div>
                <dt>Consegna caffè</dt>
                <dd>
                  Ritirare e mettere nell'armadio bianco. Avvisare su WhatsApp «Gatti Custodi».{" "}
                  <a className="link" href={LINK.community} target="_blank" rel="noopener noreferrer">
                    Community WhatsApp
                  </a>
                </dd>
              </div>
              <div>
                <dt>Macchinetta cibo e bevande</dt>
                <dd>Aprire il cancello con le chiavi del portachiavi rosso (bacheca zona break). Richiudere lasciando aperto solo il cancelletto.</dd>
              </div>
              <div>
                <dt>Macchinetta «ruba soldi»</dt>
                <dd>
                  L'interessato contatta il servizio clienti (numero verde o app Coffee cApp). Mettere un post-it con data della chiamata e somma. L'addetto
                  lascerà i soldi al prossimo rifornimento.
                </dd>
              </div>
            </dl>
          </Blocco>
        </div>
      )}

      {tab === "contatti" && (
        <>
          <section className="man__dir" aria-labelledby="man-dir-title">
            <div className="man__dir-head">
              <span className="disc man__dir-ico">
                <Icon name="alert" size={20} />
              </span>
              <div>
                <h2 id="man-dir-title">Direttivo</h2>
                <p>Per le emergenze operative durante il turno. Tocca un numero per chiamare.</p>
              </div>
            </div>
            <ul className="man__dir-list">
              {DIRETTIVO.map((p) => (
                <li key={p.nome}>
                  <Avatar name={p.nome} size={38} />
                  <span className="man__dir-nome">{p.nome}</span>
                  <a className="man__dir-tel t-mono" href={tel(p.tel)}>
                    <Icon name="phone" size={15} /> {p.tel}
                  </a>
                </li>
              ))}
            </ul>
          </section>

          <div className="man__grid">
            <Blocco icon="whatsapp" titolo="Community WhatsApp FORO">
              <p>Il punto centrale per tutte le comunicazioni.</p>
              <Esterno href={LINK.community} icon="whatsapp" pieno>
                Entra nella community
              </Esterno>
            </Blocco>
            <Blocco icon="soci" titolo="Gatti Custodi">
              <p>
                <b>Operativo:</b> gestione turni, necessità volontari e aperture straordinarie.
              </p>
              <p className="man__tip">Apertura aggiuntiva: tagga Irene D'Agostini.</p>
            </Blocco>
            <Blocco icon="user" titolo="Soci e Volontari FORO">
              <p>
                <b>Assemblea:</b> organizzazione dell'ordine del giorno e comunicazioni istituzionali dell'associazione.
              </p>
            </Blocco>
            <Blocco icon="heart" titolo="Mucchio di Mici">
              <p>
                <b>Informale:</b> eventi esterni, feste e tempo libero insieme.
              </p>
            </Blocco>
            <Blocco icon="phone" titolo="Pubblica sicurezza" className="man__card--emergenza">
              <dl className="man__dl">
                <div>
                  <dt>Carabinieri Piossasco</dt>
                  <dd>
                    <a className="man__num t-mono" href={tel("011 906 5408")}>
                      011 906 5408
                    </a>
                  </dd>
                </div>
                <div>
                  <dt>Emergenza generale</dt>
                  <dd>
                    <a className="man__num t-mono" href="tel:112">
                      112
                    </a>
                  </dd>
                </div>
              </dl>
            </Blocco>
          </div>
        </>
      )}

      {tab === "sito" && (
        <>
          <div className="man__grid man__grid--2">
            <Blocco icon="grid" titolo="Dashboard e strumenti">
              <p>
                Nella dashboard abbiamo tutti gli strumenti più importanti che riguardano la <b>gestione dei turni e la segnalazione delle presenze</b>.
                Le notifiche per la gestione dei turni sono gestite da <b>UFORObot</b>, il nostro bot di Telegram.
              </p>
            </Blocco>
            <Blocco icon="settings" titolo="Gestione e sviluppo del sito" className="man__card--referente">
              <p>
                Per la gestione e la manutenzione del sito, e se vuoi partecipare alla programmazione e allo sviluppo della piattaforma, chiedi a{" "}
                <b>{REFERENTE_SITO.nome}</b>.
              </p>
              <a className="man__referente" href={tel(REFERENTE_SITO.tel)}>
                <Avatar name={REFERENTE_SITO.nome} size={34} />
                <span>
                  <strong>{REFERENTE_SITO.nome}</strong>
                  <span className="t-mono">{REFERENTE_SITO.tel}</span>
                </span>
              </a>
            </Blocco>
          </div>
          <h2 className="t-h3 man__sub">Permessi e ruoli</h2>
          <div className="man__grid man__grid--4">
            {RUOLI.map((r) => (
              <article key={r.l} className="man__ruolo">
                <span className="t-label man__ruolo-l">Livello {r.l}</span>
                <h3>{LIVELLI[r.l].label}</h3>
                <p className="man__ruolo-r">
                  <b>Ruoli:</b> {r.ruoli}
                </p>
                <p>{r.descr}</p>
              </article>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
