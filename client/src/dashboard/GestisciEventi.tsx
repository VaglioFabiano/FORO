import React, { useState, useEffect } from 'react';
import '../style/gestisciEventi.css';

interface Evento {
  id: number;
  titolo: string;
  descrizione: string;
  data_evento: string;
  immagine_url: string;
}

interface Prenotazione {
  id: number;
  evento_id: number;
  nome: string;
  cognome: string;
  email: string;
  data_prenotazione: string;
  num_biglietti?: number;
}

interface NuovoEvento {
  titolo: string;
  descrizione: string;
  data_evento: string;
  immagine_url: string;
}

interface ApiResponse {
  success: boolean;
  eventi?: Evento[];
  evento?: Evento;
  prenotazioni?: Prenotazione[];
  error?: string;
  message?: string;
  evento_id?: number;
}

const GestisciEventi: React.FC = () => {
  const [eventi, setEventi] = useState<Evento[]>([]);
  const [prenotazioni, setPrenotazioni] = useState<Record<number, Prenotazione[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedEvents, setExpandedEvents] = useState<Record<number, boolean>>({});
  
  // Stato per nuovo evento
  const [nuovoEvento, setNuovoEvento] = useState<NuovoEvento>({
    titolo: '',
    descrizione: '',
    data_evento: '',
    immagine_url: ''
  });
  const [showNewEventForm, setShowNewEventForm] = useState(false);
  
  // Stato per modifica evento
  const [editingEventId, setEditingEventId] = useState<number | null>(null);
  const [editData, setEditData] = useState<Partial<Evento>>({});

  const [userLevel, setUserLevel] = useState<number>(-1);
  const [userId, setUserId] = useState<number | null>(null);

  // Test API connection
  const testApiConnection = async () => {
    try {
      console.log('Testing API connection...');
      const response = await fetch('/api/eventi');
      console.log('API test response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('API test response data:', data);
        return true;
      } else {
        console.error('API test failed with status:', response.status);
        const text = await response.text();
        console.error('API test error response:', text);
        return false;
      }
    } catch (err) {
      console.error('API test connection error:', err);
      return false;
    }
  };

  useEffect(() => {
    // Recupera i dati dell'utente dal localStorage
    console.log('Setting up user data...');
    const user = localStorage.getItem('user');
    if (user) {
      const userData = JSON.parse(user);
      console.log('User data:', userData);
      setUserLevel(userData.level || -1);
      setUserId(userData.id || null);
    } else {
      console.log('No user data found in localStorage');
    }
    
    // Test API e poi carica eventi
    testApiConnection().then(apiWorking => {
      if (apiWorking) {
        console.log('API is working, fetching eventi...');
        fetchEventi();
      } else {
        console.error('API is not working, setting error message');
        setError('Impossibile connettersi al server. Verifica che il file API /api/eventi.js esista.');
        setLoading(false);
      }
    });
  }, []);


  // Aggiungi debug per il caricamento
  useEffect(() => {
    console.log('GestisciEventi component mounted');
  }, []);

  const fetchEventi = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('Fetching eventi...');
      
      // Prova prima con il percorso completo, poi con quello semplificato
      let response = await fetch('/api/eventi?section=eventi');
      console.log('First response status:', response.status);
      
      if (!response.ok) {
        console.log('First fetch failed, trying alternative...');
        // Se fallisce, prova senza parametri di sezione
        response = await fetch('/api/eventi');
        console.log('Second response status:', response.status);
      }
      
      if (!response.ok) {
        throw new Error(`Errore nel caricamento eventi: ${response.status} - ${response.statusText}`);
      }
      
      const data: ApiResponse = await response.json();
      console.log('Eventi response data:', data);
      
      if (!data.success) {
        throw new Error(data.error || 'Errore nel caricamento eventi');
      }
      
      setEventi(data.eventi || []);
      console.log('Eventi loaded:', data.eventi?.length || 0);
      
      // Carica le prenotazioni per ogni evento
      if (data.eventi && data.eventi.length > 0) {
        console.log('Loading prenotazioni for', data.eventi.length, 'events');
        for (const evento of data.eventi) {
          await fetchPrenotazioni(evento.id);
        }
      }

    } catch (err) {
      console.error('Fetch error:', err);
      setError(err instanceof Error ? err.message : 'Errore di connessione al server');
    } finally {
      setLoading(false);
    }
  };

  const fetchPrenotazioni = async (eventoId: number) => {
    try {
      console.log('Fetching prenotazioni for event:', eventoId);
      let response = await fetch(`/api/eventi?section=prenotazioni&evento_id=${eventoId}`);
      
      if (!response.ok) {
        console.log('Prenotazioni fetch failed, trying alternative...');
        // Prova con il formato alternativo
        response = await fetch(`/api/eventi?action=single&id=${eventoId}`);
      }
      
      if (!response.ok) {
        console.error(`Errore nel caricamento prenotazioni per evento ${eventoId}: ${response.status}`);
        return;
      }
      
      const data: ApiResponse = await response.json();
      console.log(`Prenotazioni for event ${eventoId}:`, data);
      
      if (data.success && data.prenotazioni) {
        setPrenotazioni(prev => ({
          ...prev,
          [eventoId]: data.prenotazioni || []
        }));
        console.log(`Loaded ${data.prenotazioni.length} prenotazioni for event ${eventoId}`);
      }
    } catch (err) {
      console.error('Errore nel caricamento prenotazioni:', err);
    }
  };

  const creaEvento = async () => {
    if (!nuovoEvento.titolo || !nuovoEvento.data_evento) {
      setError('Titolo e data evento sono obbligatori');
      return;
    }

    if (!userId) {
      setError('Utente non autenticato');
      return;
    }

    try {
      const response = await fetch('/api/eventi', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          section: 'eventi',
          ...nuovoEvento,
          user_id: userId
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: ApiResponse = await response.json();
      
      if (data.success) {
        setNuovoEvento({
          titolo: '',
          descrizione: '',
          data_evento: '',
          immagine_url: ''
        });
        setShowNewEventForm(false);
        await fetchEventi();
      } else {
        throw new Error(data.error || 'Errore nella creazione dell\'evento');
      }
    } catch (err) {
      console.error('Create error:', err);
      setError(err instanceof Error ? err.message : 'Errore di connessione al server');
    }
  };

  const aggiornaEvento = async () => {
    if (!editingEventId || !editData.titolo || !editData.data_evento) {
      setError('Titolo e data evento sono obbligatori');
      return;
    }

    if (!userId) {
      setError('Utente non autenticato');
      return;
    }

    try {
      const response = await fetch('/api/eventi', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          section: 'eventi',
          id: editingEventId,
          ...editData,
          user_id: userId
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: ApiResponse = await response.json();
      
      if (data.success) {
        setEditingEventId(null);
        setEditData({});
        await fetchEventi();
      } else {
        throw new Error(data.error || 'Errore nell\'aggiornamento dell\'evento');
      }
    } catch (err) {
      console.error('Update error:', err);
      setError(err instanceof Error ? err.message : 'Errore di connessione al server');
    }
  };

  const eliminaEvento = async (eventoId: number) => {
    if (!confirm('Sei sicuro di voler eliminare questo evento? Tutte le prenotazioni saranno eliminate.')) {
      return;
    }

    if (!userId) {
      setError('Utente non autenticato');
      return;
    }

    try {
      const response = await fetch('/api/eventi', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          section: 'eventi',
          id: eventoId,
          user_id: userId
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: ApiResponse = await response.json();
      
      if (data.success) {
        await fetchEventi();
      } else {
        throw new Error(data.error || 'Errore nell\'eliminazione dell\'evento');
      }
    } catch (err) {
      console.error('Delete error:', err);
      setError(err instanceof Error ? err.message : 'Errore di connessione al server');
    }
  };

  const eliminaPrenotazione = async (prenotazioneId: number, eventoId: number) => {
    if (!confirm('Sei sicuro di voler eliminare questa prenotazione?')) {
      return;
    }

    if (!userId) {
      setError('Utente non autenticato');
      return;
    }

    try {
      const response = await fetch('/api/eventi', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          section: 'prenotazioni',
          id: prenotazioneId,
          user_id: userId
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: ApiResponse = await response.json();
      
      if (data.success) {
        await fetchPrenotazioni(eventoId);
      } else {
        throw new Error(data.error || 'Errore nell\'eliminazione della prenotazione');
      }
    } catch (err) {
      console.error('Delete booking error:', err);
      setError(err instanceof Error ? err.message : 'Errore di connessione al server');
    }
  };

  const iniziaModifica = (evento: Evento) => {
    setEditingEventId(evento.id);
    setEditData({
      titolo: evento.titolo,
      descrizione: evento.descrizione,
      data_evento: evento.data_evento,
      immagine_url: evento.immagine_url
    });
  };

  const annullaModifica = () => {
    setEditingEventId(null);
    setEditData({});
  };

  const toggleEvent = (eventoId: number) => {
    setExpandedEvents(prev => ({
      ...prev,
      [eventoId]: !prev[eventoId]
    }));
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('it-IT', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getParticipantCount = (eventoId: number) => {
    const eventoPrenotazioni = prenotazioni[eventoId] || [];
    return eventoPrenotazioni.reduce((total, prenotazione) => {
      return total + (prenotazione.num_biglietti || 1);
    }, 0);
  };

  const canManageEvents = () => {
    return userLevel <= 2; // Livelli 0, 1, 2 possono gestire eventi
  };

  if (loading && eventi.length === 0) {
    return (
      <div className="gestisci-eventi-container">
        <div className="loading">
          <div className="loading-spinner"></div>
          <span>Caricamento eventi...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="gestisci-eventi-container">
      <div className="gestisci-eventi-header">
        <h1>Gestione Eventi</h1>
        <div className="header-actions">
          {canManageEvents() && (
            <button 
              onClick={() => setShowNewEventForm(!showNewEventForm)} 
              className="btn btn-success btn-large"
            >
              {showNewEventForm ? '✕ Annulla' : '+ Nuovo Evento'}
            </button>
          )}
          <button onClick={fetchEventi} className="btn btn-refresh" disabled={loading}>
            🔄 Ricarica
          </button>
        </div>
      </div>

      {error && (
        <div className="error-message">
          {error}
          <button onClick={() => setError(null)} className="close-error">×</button>
        </div>
      )}

      {/* Form nuovo evento */}
      {showNewEventForm && canManageEvents() && (
        <div className="new-event-form">
          <h2>Crea Nuovo Evento</h2>
          <div className="form-grid">
            <div className="form-group">
              <label>Titolo *</label>
              <input
                type="text"
                value={nuovoEvento.titolo}
                onChange={(e) => setNuovoEvento({ ...nuovoEvento, titolo: e.target.value })}
                placeholder="Titolo dell'evento"
              />
            </div>
            <div className="form-group">
              <label>Data Evento *</label>
              <input
                type="date"
                value={nuovoEvento.data_evento}
                onChange={(e) => setNuovoEvento({ ...nuovoEvento, data_evento: e.target.value })}
              />
            </div>
            <div className="form-group full-width">
              <label>Descrizione</label>
              <textarea
                value={nuovoEvento.descrizione}
                onChange={(e) => setNuovoEvento({ ...nuovoEvento, descrizione: e.target.value })}
                placeholder="Descrizione dell'evento"
                rows={3}
              />
            </div>
            <div className="form-group full-width">
              <label>URL Immagine</label>
              <input
                type="url"
                value={nuovoEvento.immagine_url}
                onChange={(e) => setNuovoEvento({ ...nuovoEvento, immagine_url: e.target.value })}
                placeholder="https://drive.google.com/..."
              />
            </div>
          </div>
          <div className="form-actions">
            <button onClick={creaEvento} className="btn btn-success">
              💾 Crea Evento
            </button>
            <button 
              onClick={() => setShowNewEventForm(false)} 
              className="btn btn-secondary"
            >
              ✕ Annulla
            </button>
          </div>
        </div>
      )}

      {/* Lista eventi */}
      <div className="eventi-list">
        {eventi.length > 0 ? (
          eventi.map((evento) => (
            <div key={evento.id} className="event-section">
              <div className="event-header" onClick={() => toggleEvent(evento.id)}>
                <div className="event-info">
                  <h3 className="event-title">
                    {evento.titolo}
                    <span className="participant-count">
                      ({getParticipantCount(evento.id)} partecipanti)
                    </span>
                  </h3>
                  <div className="event-date">
                    📅 {formatDate(evento.data_evento)}
                  </div>
                </div>
                <div className="event-actions">
                  {canManageEvents() && (
                    <>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          iniziaModifica(evento);
                        }}
                        className="btn btn-edit btn-small"
                        title="Modifica evento"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          eliminaEvento(evento.id);
                        }}
                        className="btn btn-delete btn-small"
                        title="Elimina evento"
                      >
                        🗑️
                      </button>
                    </>
                  )}
                  <span className={`expand-icon ${expandedEvents[evento.id] ? 'expanded' : ''}`}>
                    ▼
                  </span>
                </div>
              </div>
              
              {expandedEvents[evento.id] && (
                <div className="event-content">
                  {editingEventId === evento.id ? (
                    <div className="edit-form">
                      <h4>Modifica Evento</h4>
                      <div className="form-grid">
                        <div className="form-group">
                          <label>Titolo *</label>
                          <input
                            type="text"
                            value={editData.titolo || ''}
                            onChange={(e) => setEditData({ ...editData, titolo: e.target.value })}
                          />
                        </div>
                        <div className="form-group">
                          <label>Data Evento *</label>
                          <input
                            type="date"
                            value={editData.data_evento || ''}
                            onChange={(e) => setEditData({ ...editData, data_evento: e.target.value })}
                          />
                        </div>
                        <div className="form-group full-width">
                          <label>Descrizione</label>
                          <textarea
                            value={editData.descrizione || ''}
                            onChange={(e) => setEditData({ ...editData, descrizione: e.target.value })}
                            rows={3}
                          />
                        </div>
                        <div className="form-group full-width">
                          <label>URL Immagine</label>
                          <input
                            type="url"
                            value={editData.immagine_url || ''}
                            onChange={(e) => setEditData({ ...editData, immagine_url: e.target.value })}
                          />
                        </div>
                      </div>
                      <div className="form-actions">
                        <button onClick={aggiornaEvento} className="btn btn-success">
                          💾 Salva Modifiche
                        </button>
                        <button onClick={annullaModifica} className="btn btn-secondary">
                          ✕ Annulla
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="event-details">
                        {evento.immagine_url && (
                          <div className="event-image">
                            <img 
                              src={evento.immagine_url} 
                              alt={evento.titolo}
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.style.display = 'none';
                              }}
                            />
                          </div>
                        )}
                        <div className="event-description">
                          <p>{evento.descrizione || 'Nessuna descrizione disponibile'}</p>
                        </div>
                      </div>

                      <div className="prenotazioni-section">
                        <h4>
                          Prenotazioni ({(prenotazioni[evento.id] || []).length})
                          <span className="total-participants">
                            - Totale partecipanti: {getParticipantCount(evento.id)}
                          </span>
                        </h4>
                        {prenotazioni[evento.id]?.length > 0 ? (
                          <div className="prenotazioni-list">
                            {prenotazioni[evento.id].map((prenotazione) => (
                              <div key={prenotazione.id} className="prenotazione-item">
                                <div className="prenotazione-info">
                                  <div className="partecipante-nome">
                                    <strong>{prenotazione.nome} {prenotazione.cognome}</strong>
                                  </div>
                                  <div className="partecipante-email">
                                    {prenotazione.email}
                                  </div>
                                  <div className="prenotazione-data">
                                    Prenotato il: {new Date(prenotazione.data_prenotazione).toLocaleDateString('it-IT')}
                                  </div>
                                  {prenotazione.num_biglietti && prenotazione.num_biglietti > 1 && (
                                    <div className="num-biglietti">
                                      🎫 {prenotazione.num_biglietti} biglietti
                                    </div>
                                  )}
                                </div>
                                {canManageEvents() && (
                                  <div className="prenotazione-actions">
                                    <button
                                      onClick={() => eliminaPrenotazione(prenotazione.id, evento.id)}
                                      className="btn btn-delete btn-small"
                                      title="Elimina prenotazione"
                                    >
                                      🗑️
                                    </button>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="no-prenotazioni">
                            Nessuna prenotazione per questo evento
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="no-eventi">
            <h2>Nessun evento trovato</h2>
            <p>Non ci sono eventi da visualizzare al momento.</p>
            {canManageEvents() && (
              <button 
                onClick={() => setShowNewEventForm(true)} 
                className="btn btn-success"
              >
                + Crea il primo evento
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default GestisciEventi;