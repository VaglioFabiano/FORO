import React, { useState } from "react";
import "../style/gestioneTurno.css";

const GestioneTurno: React.FC = () => {
  const [activeTab, setActiveTab] = useState<
    "apertura" | "chiusura" | "regole" | "eventi" | "contatti" | "sito"
  >("apertura");

  return (
    <section className="gestione-turno-section">
      <div className="container">
        <h2 className="section-title">Gestione del Turno</h2>

        <div className="tab-navigation">
          <button
            className={`tab-btn ${activeTab === "apertura" ? "active" : ""}`}
            onClick={() => setActiveTab("apertura")}
          >
            Apertura
          </button>
          <button
            className={`tab-btn ${activeTab === "chiusura" ? "active" : ""}`}
            onClick={() => setActiveTab("chiusura")}
          >
            Chiusura
          </button>
          <button
            className={`tab-btn ${activeTab === "regole" ? "active" : ""}`}
            onClick={() => setActiveTab("regole")}
          >
            Regole & Annotazioni
          </button>
          <button
            className={`tab-btn ${activeTab === "eventi" ? "active" : ""}`}
            onClick={() => setActiveTab("eventi")}
          >
            Eventi Straordinari
          </button>
          <button
            className={`tab-btn ${activeTab === "contatti" ? "active" : ""}`}
            onClick={() => setActiveTab("contatti")}
          >
            Contatti
          </button>
          <button
            className={`tab-btn ${activeTab === "sito" ? "active" : ""}`}
            onClick={() => setActiveTab("sito")}
          >
            Sito
          </button>
        </div>

        <div className="tab-content">
          {activeTab === "apertura" && (
            <div className="content-panel">
              <h3>🔓 Procedura di Apertura</h3>

              <div className="procedure-section">
                <h4>🚪 Accesso alla struttura</h4>
                <p className="procedure-text">
                  Il primo passo per l'apertura del centro è{" "}
                  <span className="procedure-highlight">
                    aprire il cancelletto esterno su via Alfieri
                  </span>
                  . Questo permetterà l'accesso agli utenti che arriveranno
                  durante il turno. Una volta aperto il cancelletto, ricordati
                  di controllare se è giovedì: in questo caso dovrai{" "}
                  <span className="procedure-highlight">
                    portare dentro i bidoni dell'immondizia
                  </span>
                  che sono stati messi fuori per la raccolta.
                </p>
              </div>

              <div className="procedure-section">
                <h4>💡 Sistema di illuminazione</h4>
                <p className="procedure-text">
                  L'illuminazione del centro richiede alcuni passaggi specifici.
                  Per le{" "}
                  <span className="procedure-highlight">luci interne</span>,
                  dovrai utilizzare l'interruttore che si trova nella zona
                  ristoro, situato a sinistra dell'ingresso principale. Gli
                  interruttori per l'aula si trovano invece nel piccolo atrio.
                  Le <span className="procedure-highlight">luci esterne</span>
                  sono gestite da un sistema automatico con timer, quindi non
                  richiedono alcun intervento manuale da parte tua.
                </p>
              </div>

              <div className="procedure-section">
                <h4>🧹 Controlli e sistemazione ambientale</h4>
                <p className="procedure-text">
                  Prima dell'arrivo degli utenti, è importante fare un{" "}
                  <span className="procedure-highlight">
                    controllo dell'ordine generale
                  </span>
                  sia nell'aula principale che nella zona della macchinetta del
                  caffè. Assicurati che tutto sia pulito e in ordine. Per il
                  comfort degli utenti, regola il{" "}
                  <span className="procedure-highlight">
                    riscaldamento tramite le termovalvole
                  </span>
                  che si trovano alla base dei termosifoni. La temperatura
                  ottimale contribuirà a creare un ambiente accogliente per lo
                  studio.
                </p>
              </div>

              <div className="procedure-section">
                <h4>💻 Info Point e gestione digitale</h4>
                <p className="procedure-text">Null</p>
              </div>
            </div>
          )}

          {activeTab === "chiusura" && (
            <div className="content-panel">
              <h3>🔒 Procedura di Chiusura</h3>

              <div className="procedure-section">
                <h4>🧽 Pulizia e sistemazione degli spazi</h4>
                <p className="procedure-text">
                  La chiusura inizia con la{" "}
                  <span className="procedure-highlight">
                    pulizia accurata dei tavoli
                  </span>{" "}
                  utilizzando lo spruzzino e i rotoli di carta che trovi nella
                  zona ristoro. È importante lasciare gli spazi puliti e in
                  ordine per chi utilizzerà il centro il giorno successivo.
                  Dedica qualche minuto extra a controllare che non ci siano
                  oggetti dimenticati o rifiuti sparsi nelle diverse aree.
                </p>
              </div>

              <div className="procedure-section">
                <h4>💻 Spegnimento delle apparecchiature</h4>
                <p className="procedure-text">
                  Per quanto riguarda il{" "}
                  <span className="procedure-highlight">
                    computer dell'Info Point
                  </span>
                  , dovrai spegnerlo ma lasciare aperti Chrome e l'applicazione
                  Memo per facilitare l'apertura del turno successivo.
                  Successivamente,{" "}
                  <span className="procedure-highlight">
                    spegni tutte le ciabatte elettriche
                  </span>{" "}
                  che si trovano sotto i tavoli per garantire la sicurezza e il
                  risparmio energetico durante la notte.
                </p>
              </div>

              <div className="procedure-section">
                <h4>💡 Sistema di illuminazione e sicurezza</h4>
                <p className="procedure-text">
                  Lo spegnimento delle luci richiede attenzione: dovrai
                  spegnerlo le{" "}
                  <span className="procedure-highlight">
                    luci interne, dei bagni e del foyer
                  </span>
                  . Tieni presente che alcune luci del foyer sono gestite
                  direttamente dalla biblioteca, quindi non preoccuparti se
                  alcune restano accese. L'importante è spegnere quelle sotto il
                  tuo controllo.
                </p>
              </div>

              <div className="procedure-section">
                <h4>🔑 Chiusura degli accessi</h4>
                <p className="procedure-text">
                  La fase di chiusura degli accessi è cruciale per la sicurezza.
                  Dovrai chiudere sistematicamente tutti gli ingressi: l'
                  <span className="procedure-highlight">
                    aula studio con la chiave del laccetto nero
                  </span>
                  , l'
                  <span className="procedure-highlight">
                    aula Agorà con la chiave grande rossa
                  </span>
                  , e la
                  <span className="procedure-highlight">
                    vetrata d'ingresso con la chiave quadrata
                  </span>
                  . Non dimenticare di controllare che la porta antincendio
                  interna sia ben chiusa.
                </p>
              </div>

              <div className="procedure-section">
                <h4>🗑️ Gestione rifiuti e consegne</h4>
                <p className="procedure-text">
                  Se è mercoledì, dovrai{" "}
                  <span className="procedure-highlight">
                    portare i bidoni pieni davanti al cancello grande
                  </span>
                  per la raccolta del giorno successivo. Infine, chiudi i
                  cancelletti esterni (che non richiedono chiavi) e
                  <span className="procedure-highlight">
                    consegna le chiavi al turno successivo
                  </span>{" "}
                  o riponile nel luogo designato se non c'è nessuno in attesa.
                </p>
              </div>
            </div>
          )}

          {activeTab === "regole" && (
            <div className="content-panel">
              <h3>📋 Regole e Annotazioni</h3>
              <div className="rules-grid">
                <div className="rule-card">
                  <h4>👥 1. Supervisione Sala Studio</h4>
                  <p>Imporre il rispetto del regolamento dell'aula studio.</p>
                  <p>
                    <strong>💡 Tip:</strong> Se c'è confusione nell'area
                    ristoro, chiudere entrambe le porte dell'aula studio.
                  </p>
                  <a
                    href="https://drive.google.com/file/d/1VxcPxOHpDyBKgKV6XkK2btnhYmlh24RV/view"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Regolamento
                  </a>
                </div>

                <div className="rule-card">
                  <h4>📊 2. Conteggio Presenze</h4>
                  <p>
                    Annotare il numero di persone presenti durante il turno
                    nella sezione presenze della dashboard
                  </p>
                </div>

                <div className="rule-card">
                  <h4>📝 3. Note e Proposte</h4>
                  <p>
                    Annotare dubbi, necessità e proposte sul bloc-notes del
                    desktop e/o gruppo WhatsApp.
                  </p>
                  <a
                    href="https://chat.whatsapp.com/KFUkTUczPeR2bNztucGpam"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Community WhatsApp
                  </a>
                </div>

                <div className="rule-card">
                  <h4>🏪 4. Materiali Disponibili</h4>
                  <ul>
                    <li>Cialde caffè</li>
                    <li>Assorbenti</li>
                    <li>Coperte</li>
                    <li>Tazze</li>
                    <li>Materiali pulizia</li>
                  </ul>
                  <p>
                    <em>Tutto nell'armadio bianco vicino all'Info Point</em>
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === "eventi" && (
            <div className="content-panel">
              <h3>⚡ Eventi Straordinari</h3>

              <div className="event-section">
                <h4>🏛️ Chiusura per Consiglio Comunale</h4>
                <p>Vedi file </p>
                <a
                  href="https://docs.google.com/document/d/17eKmt33uPob5juVa0zIdS0tZjRy2wqU7ixtLrhVj31I/edit?tab=t.0"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  "004 Sistemazione per Consigli Comunali"
                </a>
              </div>

              <div className="event-section">
                <h4>🏛️ Chiusura per Commissioni Comunali</h4>
                <p>
                  Solitamente in questo caso si tratta di solo una chiusura
                  ordinaria, solo si chiuderà prima.
                </p>
              </div>

              <div className="event-section">
                <h4>⚖️ Sanzioni Utenti</h4>
                <p>Vedi file </p>
                <p>
                  Le sanzioni utenti vanno concordate e discusse in assemblea
                  soci o in caso di assoluta emergenza gestite dal Direttivo
                </p>
                <a
                  href="https://docs.google.com/document/d/1Uh2Fyq25f1I04rlaYIv9u9YpL-XR27eTGvpekRuNDyo/edit?tab=t.0"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  "Verbale sanzioni 2023"
                </a>
              </div>

              <div className="event-section">
                <h4>📦 Corrieri e Addetti</h4>
                <div className="delivery-info">
                  <div className="delivery-item">
                    <strong>☕ Consegna Caffè:</strong>
                    <p>
                      Ritirare e mettere nell'armadio bianco. Avvisare su
                      WhatsApp "Gatti Custodi".
                    </p>
                    <a
                      href="https://chat.whatsapp.com/KFUkTUczPeR2bNztucGpam"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Community WhatsApp
                    </a>
                  </div>

                  <div className="delivery-item">
                    <strong>🥤 Macchinetta Cibo/Bevande:</strong>
                    <p>
                      Aprire cancello con chiavi portachiavi rosso (bacheca zona
                      break). Richiudere lasciando aperto solo il cancelletto.
                    </p>
                  </div>

                  <div className="delivery-item">
                    <strong>💰 Macchinetta Ruba Soldi:</strong>
                    <p>
                      L'interessato contatta servizio clienti (numero verde o
                      app Coffee cApp). Mettere post-it con data chiamata e
                      somma. L'addetto lascerà i soldi al prossimo rifornimento.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "contatti" && (
            <div className="content-panel">
              <h3>📞 Contatti e Community</h3>

              <div className="contacts-grid">
                <div className="contact-card ordinary">
                  <h4>📱 Community WhatsApp FORO</h4>
                  <p>Il punto centrale per tutte le comunicazioni.</p>
                  <a
                    href="https://chat.whatsapp.com/KFUkTUczPeR2bNztucGpam"
                    className="cta-link"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Entra nella Community
                  </a>
                </div>

                <div className="contact-card ordinary">
                  <h4>🫂 Gatti Custodi</h4>
                  <p>
                    <strong>Operativo:</strong> Gestione turni, necessità
                    volontari e aperture straordinarie.
                  </p>
                  <ul>
                    <li>Apertura aggiuntiva → tag Irene D'Agostini</li>
                  </ul>
                </div>

                <div className="contact-card ordinary">
                  <h4>🐈‍⬛ Soci e Volontari FORO</h4>
                  <p>
                    <strong>Assemblea:</strong> Organizzazione ODG e
                    comunicazioni istituzionali dell'associazione.
                  </p>
                </div>

                <div className="contact-card ordinary">
                  <h4>🐅 Mucchio di Mici</h4>
                  <p>
                    <strong>Informale:</strong> Eventi esterni, feste e tempo
                    libero insieme.
                  </p>
                </div>

                <div className="contact-card extraordinary">
                  <h4>🚨 Direttivo (Emergenze Operative)</h4>
                  <div className="directors-list">
                    <span>Francesco Ruocco: 331 222 5176</span>
                    <span>Michela Goss: 377 545 2977</span>
                    <span>Fabiano Vaglio: 345 088 1086</span>
                    <span>Alessia D'Agostini: 334 324 5369</span>
                    <span>Federico Moscato: 345 926 3569</span>
                    <span>Francesco Rosso: 346 491 6937</span>
                    <span>Irene D'Agostini: 331 765 7509</span>
                    <span>Virginia Brocchini: 392 349 8900</span>
                  </div>
                </div>

                <div className="contact-card emergency">
                  <h4>🚓 Pubblica Sicurezza</h4>
                  <div className="emergency-contacts">
                    <div>
                      <strong>Carabinieri Piossasco:</strong> 011 906 5408
                    </div>
                    <div>
                      <strong>Emergenza Generale:</strong> 112
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "sito" && (
            <div className="content-panel">
              <h3>⚙️ Funzionamento del Sito</h3>

              <div className="procedure-section">
                <h4>🖥️ Dashboard e Strumenti</h4>
                <p className="procedure-text">
                  Nella dashboard abbiamo tutti gli strumenti più importanti che
                  riguardano la{" "}
                  <span className="procedure-highlight">
                    gestione dei turni e la segnalazione delle presenze
                  </span>
                  . Le notifiche per la gestione dei turni sono gestite da{" "}
                  <strong>UFORObot</strong>, il nostro bot di Telegram.
                </p>
              </div>

              <div className="procedure-section">
                <h4>👥 Permessi e Ruoli</h4>
                <div className="rules-grid">
                  <div className="rule-card">
                    <h4>🎯 Direttivo</h4>
                    <p>
                      <strong>Ruoli:</strong> Gestione burocratica
                      dell'associazione, decisioni amministrative, responsabili
                      del coordinamento generale delle attività
                    </p>
                    <p>
                      <strong>Descrizione:</strong> I membri del direttivo hanno
                      accesso completo alla piattaforma, possono creare nuovi
                      Utenti e darne i relativi privilegi
                    </p>
                  </div>

                  <div className="rule-card">
                    <h4>📋 Soci Organizzatori</h4>
                    <p>
                      <strong>Ruoli:</strong> Coordinamento eventi, gestione
                      logistica di orari e turni, supporto al direttivo
                    </p>
                    <p>
                      <strong>Descrizione:</strong> I soci organizzatori
                      supportano il direttivo nella gestione operativa, hanno
                      permessi avanzati per modificare turni e gli orari oltre
                      che a creare gli eventi.
                    </p>
                  </div>

                  <div className="rule-card">
                    <h4>🔧 Soci </h4>
                    <p>
                      <strong>Ruoli:</strong> Gestione turni assegnati,
                      manutenzione ordinaria
                    </p>
                    <p>
                      <strong>Descrizione:</strong> I soci operativi gestiscono
                      i turni quotidiani, hanno accesso alle funzioni base della
                      dashboard per segnalare presenze e annotazioni.
                    </p>
                  </div>

                  <div className="rule-card">
                    <h4>🙋‍♀️ Volontari</h4>
                    <p>
                      <strong>Ruoli:</strong> Supporto durante i turni e accesso
                      alla funzionalità di gestione presenze, come per qualsiasi
                      livello sopra
                    </p>
                    <p>
                      <strong>Descrizione:</strong> I volontari supportano le
                      attività del centro con permessi limitati, possono
                      visualizzare informazioni base e contribuire alle
                      attività.
                    </p>
                  </div>
                </div>
              </div>

              <div className="procedure-section">
                <h4>🤝 Come Contribuire</h4>
                <div className="rules-grid">
                  <div className="rule-card">
                    <h4>🖥️ Gestione e Manutenzione del Sito</h4>
                    <p>
                      Se vuoi aiutare nella gestione e manutenzione del
                      sitosalendo di permessi, chiedi a un qualsiasi{" "}
                      <span className="procedure-highlight">
                        membro del direttivo
                      </span>
                      .
                    </p>
                  </div>

                  <div className="rule-card">
                    <h4>💻 Programmazione e Sviluppo</h4>
                    <p>
                      Se vuoi partecipare alla programmazione, sviluppo o
                      manutenzione della piattaforma, chiedi a{" "}
                      <span className="procedure-highlight">
                        Fabiano Vaglio
                      </span>
                      .
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default GestioneTurno;
