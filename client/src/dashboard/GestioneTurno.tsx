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
              <div className="checklist">
                <div className="checklist-item">
                  <span className="icon">🚪</span>
                  <span>Aprire cancelletto esterno su via Alfieri</span>
                </div>
                <div className="checklist-item">
                  <span className="icon">🗑️</span>
                  <span><strong>Se giovedì:</strong> portare dentro i bidoni dell'immondizia</span>
                </div>
                <div className="checklist-item">
                  <span className="icon">💡</span>
                  <span>Accensione luci → interruttore zona ristoro a sinistra dell'ingresso; interruttori aula nel piccolo atrio</span>
                </div>
                <div className="checklist-item">
                  <span className="icon">🌙</span>
                  <span>Accensione luci esterne → gestite da timer automatico</span>
                </div>
                <div className="checklist-item">
                  <span className="icon">🧹</span>
                  <span>Controllare ordine generale aula e zona macchinetta del caffè</span>
                </div>
                <div className="checklist-item">
                  <span className="icon">🔥</span>
                  <span>Regolare calore tramite termovalvole alla base dei termosifoni</span>
                </div>
                <div className="checklist-item">
                  <span className="icon">💻</span>
                  <span>Gestione Info Point → Computer fisso per drive FORO e Eventbrite</span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'chiusura' && (
            <div className="content-panel">
              <h3>🔒 Procedura di Chiusura</h3>
              <div className="checklist">
                <div className="checklist-item">
                  <span className="icon">🧽</span>
                  <span>Pulizia tavoli → spruzzino e rotoli di carta</span>
                </div>
                <div className="checklist-item">
                  <span className="icon">💻</span>
                  <span>Spegnere computer Info Point lasciando Chrome e Memo aperti</span>
                </div>
                <div className="checklist-item">
                  <span className="icon">🔌</span>
                  <span>Spegnere tutte le ciabatte sotto i tavoli</span>
                </div>
                <div className="checklist-item">
                  <span className="icon">💡</span>
                  <span>Spegnere luci interne, bagni e foyer → alcune luci foyer gestite dalla biblioteca</span>
                </div>
                <div className="checklist-item">
                  <span className="icon">🔑</span>
                  <span>Chiudere porte e finestre:</span>
                  <ul className="sub-list">
                    <li>Aula studio (chiave laccetto nero)</li>
                    <li>Aula Agorà (chiave grande/rossa)</li>
                    <li>Vetrata ingresso (chiave quadrata)</li>
                    <li>Controllare antincendio interna</li>
                  </ul>
                </div>
                <div className="checklist-item">
                  <span className="icon">🗑️</span>
                  <span><strong>Se mercoledì:</strong> portare bidoni pieni davanti al cancello grande</span>
                </div>
                <div className="checklist-item">
                  <span className="icon">🚪</span>
                  <span>Chiudere cancelletti (non serve chiave)</span>
                </div>
                <div className="checklist-item">
                  <span className="icon">🔑</span>
                  <span>Consegnare chiavi al turno successivo</span>
                </div>
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
                </div>
                
                <div className="rule-card">
                  <h4>📊 2. Conteggio Presenze</h4>
                  <p>Annotare il numero di persone presenti durante il turno nel file Excel "Numero_presenze_giornaliere".</p>
                </div>
                
                <div className="rule-card">
                  <h4>📝 3. Note e Proposte</h4>
                  <p>Annotare dubbi, necessità e proposte sul bloc-notes del desktop e/o gruppo WhatsApp.</p>
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
                <p>Vedi file "004 Sistemazione per Consigli Comunali"</p>
              </div>

              <div className="event-section">
                <h4>⚖️ Sanzioni Utenti</h4>
                <p>Vedi file "Verbale sanzioni 2023"</p>
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
                    <span>Francesco Rucco</span>
                    <span>Michela Goss</span>
                    <span>Fabiano Vaglio</span>
                    <span>Alessia D'Agostini</span>
                    <span>Virginia Brocchini</span>
                    <span>Federico Moscato</span>
                    <span>Irene D'Agostini</span>
                    <span>Francesco Rosso</span>
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