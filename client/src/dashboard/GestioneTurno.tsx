import React, { useState } from 'react';
import '../style/gestioneTurno.css';

const GestioneTurno: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'apertura' | 'chiusura' | 'regole' | 'eventi' | 'contatti'>('apertura');

  return (
    <section className="gestione-turno-section">
      <div className="container">
        <h2 className="section-title">Gestione del Turno</h2>
        
        <div className="tab-navigation">
          <button 
            className={`tab-btn ${activeTab === 'apertura' ? 'active' : ''}`}
            onClick={() => setActiveTab('apertura')}
          >
            Apertura
          </button>
          <button 
            className={`tab-btn ${activeTab === 'chiusura' ? 'active' : ''}`}
            onClick={() => setActiveTab('chiusura')}
          >
            Chiusura
          </button>
          <button 
            className={`tab-btn ${activeTab === 'regole' ? 'active' : ''}`}
            onClick={() => setActiveTab('regole')}
          >
            Regole & Annotazioni
          </button>
          <button 
            className={`tab-btn ${activeTab === 'eventi' ? 'active' : ''}`}
            onClick={() => setActiveTab('eventi')}
          >
            Eventi Straordinari
          </button>
          <button 
            className={`tab-btn ${activeTab === 'contatti' ? 'active' : ''}`}
            onClick={() => setActiveTab('contatti')}
          >
            Contatti
          </button>
        </div>

        <div className="tab-content">
          {activeTab === 'apertura' && (
            <div className="content-panel">
              <h3>🔓 Procedura di Apertura</h3>
              
              <div className="procedure-section">
                <h4>🚪 Accesso alla struttura</h4>
                <p className="procedure-text">
                  Il primo passo per l'apertura del centro è <span className="procedure-highlight">aprire il cancelletto esterno su via Alfieri</span>. 
                  Questo permetterà l'accesso agli utenti che arriveranno durante il turno. Una volta aperto il cancelletto, 
                  ricordati di controllare se è giovedì: in questo caso dovrai <span className="procedure-highlight">portare dentro i bidoni dell'immondizia</span> 
                  che sono stati messi fuori per la raccolta.
                </p>
              </div>

              <div className="procedure-section">
                <h4>💡 Sistema di illuminazione</h4>
                <p className="procedure-text">
                  L'illuminazione del centro richiede alcuni passaggi specifici. Per le <span className="procedure-highlight">luci interne</span>, 
                  dovrai utilizzare l'interruttore che si trova nella zona ristoro, situato a sinistra dell'ingresso principale. 
                  Gli interruttori per l'aula si trovano invece nel piccolo atrio. Le <span className="procedure-highlight">luci esterne</span> 
                  sono gestite da un sistema automatico con timer, quindi non richiedono alcun intervento manuale da parte tua.
                </p>
              </div>

              <div className="procedure-section">
                <h4>🧹 Controlli e sistemazione ambientale</h4>
                <p className="procedure-text">
                  Prima dell'arrivo degli utenti, è importante fare un <span className="procedure-highlight">controllo dell'ordine generale</span> 
                  sia nell'aula principale che nella zona della macchinetta del caffè. Assicurati che tutto sia pulito e in ordine. 
                  Per il comfort degli utenti, regola il <span className="procedure-highlight">riscaldamento tramite le termovalvole</span> 
                  che si trovano alla base dei termosifoni. La temperatura ottimale contribuirà a creare un ambiente accogliente per lo studio.
                </p>
              </div>

              <div className="procedure-section">
                <h4>💻 Info Point e gestione digitale</h4>
                <p className="procedure-text">
                  L'ultimo passaggio dell'apertura riguarda la <span className="procedure-highlight">gestione dell'Info Point</span>. 
                  Dovrai accendere il computer fisso che viene utilizzato per accedere al drive FORO e gestire le prenotazioni su Eventbrite. 
                  Questo strumento è essenziale per fornire informazioni agli utenti e gestire gli eventi del centro.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'chiusura' && (
            <div className="content-panel">
              <h3>🔒 Procedura di Chiusura</h3>
              
              <div className="procedure-section">
                <h4>🧽 Pulizia e sistemazione degli spazi</h4>
                <p className="procedure-text">
                  La chiusura inizia con la <span className="procedure-highlight">pulizia accurata dei tavoli</span> utilizzando 
                  lo spruzzino e i rotoli di carta che trovi nella zona ristoro. È importante lasciare gli spazi puliti e in ordine 
                  per chi utilizzerà il centro il giorno successivo. Dedica qualche minuto extra a controllare che non ci siano 
                  oggetti dimenticati o rifiuti sparsi nelle diverse aree.
                </p>
              </div>

              <div className="procedure-section">
                <h4>💻 Spegnimento delle apparecchiature</h4>
                <p className="procedure-text">
                  Per quanto riguarda il <span className="procedure-highlight">computer dell'Info Point</span>, dovrai spegnerlo 
                  ma lasciare aperti Chrome e l'applicazione Memo per facilitare l'apertura del turno successivo. 
                  Successivamente, <span className="procedure-highlight">spegni tutte le ciabatte elettriche</span> che si trovano 
                  sotto i tavoli per garantire la sicurezza e il risparmio energetico durante la notte.
                </p>
              </div>

              <div className="procedure-section">
                <h4>💡 Sistema di illuminazione e sicurezza</h4>
                <p className="procedure-text">
                  Lo spegnimento delle luci richiede attenzione: dovrai spegnere le <span className="procedure-highlight">luci interne, 
                  dei bagni e del foyer</span>. Tieni presente che alcune luci del foyer sono gestite direttamente dalla biblioteca, 
                  quindi non preoccuparti se alcune restano accese. L'importante è spegnere quelle sotto il tuo controllo.
                </p>
              </div>

              <div className="procedure-section">
                <h4>🔑 Chiusura degli accessi</h4>
                <p className="procedure-text">
                  La fase di chiusura degli accessi è cruciale per la sicurezza. Dovrai chiudere sistematicamente tutti gli ingressi: 
                  l'<span className="procedure-highlight">aula studio con la chiave del laccetto nero</span>, 
                  l'<span className="procedure-highlight">aula Agorà con la chiave grande rossa</span>, e la 
                  <span className="procedure-highlight">vetrata d'ingresso con la chiave quadrata</span>. 
                  Non dimenticare di controllare che la porta antincendio interna sia ben chiusa.
                </p>
              </div>

              <div className="procedure-section">
                <h4>🗑️ Gestione rifiuti e consegne</h4>
                <p className="procedure-text">
                  Se è mercoledì, dovrai <span className="procedure-highlight">portare i bidoni pieni davanti al cancello grande</span> 
                  per la raccolta del giorno successivo. Infine, chiudi i cancelletti esterni (che non richiedono chiavi) e 
                  <span className="procedure-highlight">consegna le chiavi al turno successivo</span> o riponile nel luogo designato 
                  se non c'è nessuno in attesa.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'regole' && (
            <div className="content-panel">
              <h3>📋 Regole e Annotazioni</h3>
              <div className="rules-grid">
                <div className="rule-card">
                  <h4>👥 1. Supervisione Sala Studio</h4>
                  <p>Imporre il rispetto del regolamento dell'aula studio.</p>
                  <p><strong>💡 Tip:</strong> Se c'è confusione nell'area ristoro, chiudere entrambe le porte dell'aula studio.</p>
                  <a href="https://drive.google.com/file/d/1VxcPxOHpDyBKgKV6XkK2btnhYmlh24RV/view" target="_blank" rel="noopener noreferrer">
                        Regolamento
                  </a>
                </div>
                
                <div className="rule-card">
                  <h4>📊 2. Conteggio Presenze</h4>
                  <p>Annotare il numero di persone presenti durante il turno nella sezione presenze della dashboard</p>
                </div>
                
                <div className="rule-card">
                  <h4>📝 3. Note e Proposte</h4>
                  <p>Annotare dubbi, necessità e proposte sul bloc-notes del desktop e/o gruppo WhatsApp.</p>
                  <a href="https://chat.whatsapp.com/EIDs7Vizwfs9uGetFRb0bH" target="_blank" rel="noopener noreferrer">
                        Gruppo WhatsApp
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
                  <p><em>Tutto nell'armadio bianco vicino all'Info Point</em></p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'eventi' && (
            <div className="content-panel">
              <h3>⚡ Eventi Straordinari</h3>
              
              <div className="event-section">
                <h4>🏛️ Chiusura per Consiglio Comunale</h4>
                <p>Vedi file </p>
                <a href="https://docs.google.com/document/d/17eKmt33uPob5juVa0zIdS0tZjRy2wqU7ixtLrhVj31I/edit?tab=t.0" target="_blank" rel="noopener noreferrer">
                        004 Sistemazione per Consigli Comunali"
                </a>
               
              </div>

              <div className="event-section">
                <h4>⚖️ Sanzioni Utenti</h4>
                <p>Vedi file </p>
                <a href="https://docs.google.com/document/d/1Uh2Fyq25f1I04rlaYIv9u9YpL-XR27eTGvpekRuNDyo/edit?tab=t.0" target="_blank" rel="noopener noreferrer">
                        "Verbale sanzioni 2023"
                </a>
              </div>

              <div className="event-section">
                <h4>📦 Corrieri e Addetti</h4>
                <div className="delivery-info">
                  <div className="delivery-item">
                    <strong>☕ Consegna Caffè:</strong>
                    <p>Ritirare e mettere nell'armadio bianco. Avvisare su WhatsApp "Gatti Custodi".</p>
                  </div>
                  
                  <div className="delivery-item">
                    <strong>🥤 Macchinetta Cibo/Bevande:</strong>
                    <p>Aprire cancello con chiavi portachiavi rosso (bacheca zona break). Richiudere lasciando aperto solo il cancelletto.</p>
                  </div>
                  
                  <div className="delivery-item">
                    <strong>💰 Macchinetta Ruba Soldi:</strong>
                    <p>L'interessato contatta servizio clienti (numero verde o app Coffee cApp). Mettere post-it con data chiamata e somma. L'addetto lascerà i soldi al prossimo rifornimento.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'contatti' && (
            <div className="content-panel">
              <h3>📞 Contatti</h3>
              
              <div className="contacts-grid">
                <div className="contact-card ordinary">
                  <h4>💬 Questioni Ordinarie</h4>
                  <p><strong>WhatsApp:</strong> Gatti Custodi</p>
                  <ul>
                    <li>Cambio turno → tag Alessia D'Agostini, Sofia Zoppetto, Silvia Zoppetto</li>
                    <li>Apertura aggiuntiva → tag Alessandro Passarella, Federico Moscato, Irene D'Agostini</li>
                  </ul>
                </div>

                <div className="contact-card main">
                  <h4>📱 Gruppo Principale</h4>
                  <p><strong>Telegram:</strong> Cadetti Felini</p>
                  <p>Convocazioni assemblee, novità importanti</p>
                </div>

                <div className="contact-card extraordinary">
                  <h4>🚨 Questioni Straordinarie</h4>
                  <p><strong>Direttivo (SMS/WhatsApp/Tel):</strong></p>
                  <div className="directors-list">
                    <span>Presidentə:Francesco Rucco 331 222 5176</span>
                    <span>Vice-Presidentə: Michela Goss 377 545 2977</span>
                    <span>Vice-Presidentə: Fabiano Vaglio 345 088 1086</span>
                    <span>Segretariə: Alessia D'Agostini 334 324 5369</span>
                    <span>Membrə direttivo: Virginia Brocchini 392 349 8900</span>
                    <span>Membrə direttivo: Federico Moscato 345 926 3569</span>
                    <span>Membrə direttivo: Irene D'Agostini 331 765 7509</span>
                    <span>Membrə direttivo: Francesco Rosso 346 491 6937</span>
                  </div>
                </div>

                <div className="contact-card emergency">
                  <h4>🚨 Emergenze</h4>
                  <div className="emergency-contacts">
                    <div><strong>Carabinieri Piossasco:</strong> 011 906 5408</div>
                    <div><strong>Emergenza Generale:</strong> 112</div>
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