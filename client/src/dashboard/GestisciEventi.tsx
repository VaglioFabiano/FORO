import React, { useState, useEffect, useCallback } from 'react';
import '../style/gestisciEventi.css'; // Assumi che questo file CSS esista e sia corretto

// Definizione delle interfacce per i dati
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
  num_biglietti?: number; // Opzionale, può essere 1 di default se non specificato
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
  const [creatingEvent, setCreatingEvent] = useState(false); // Stato di caricamento per la creazione

  // Stato per modifica evento
  const [editingEventId, setEditingEventId] = useState<number | null>(null);
  const [editData, setEditData] = useState<Partial<Evento>>({});
  const [updatingEvent, setUpdatingEvent] = useState(false); // Stato di caricamento per la modifica

  // Stato per l'utente loggato
  const [userLevel, setUserLevel] = useState<number>(-1);
  const [userId, setUserId] = useState<number | null>(null);

  // Debug per il montaggio del componente
  useEffect(() => {
    console.log('GestisciEventi component mounted');
  }, []);

  // Gestione automatica della scomparsa dei messaggi di errore
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        setError(null);
      }, 7000); // Messaggio di errore scompare dopo 7 secondi
      return () => clearTimeout(timer);
    }
  }, [error]);

  // Funzione per testare la connessione API (utile in fase di sviluppo)
  const testApiConnection = async () => {
    try {
      console.log('Testing API connection...');
      const response = await fetch('/api/eventi'); // Prova una GET semplice
      console.log('API test response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('API test response data (truncated for brevity):', JSON.stringify(data).substring(0, 200) + '...');
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

  // Funzione per recuperare tutti gli eventi
  const fetchEventi = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('Fetching eventi...');

      // Tenta prima con il percorso 'canonico', poi con fallback se necessario
      let response = await fetch('/api/eventi'); // Assumiamo che il root /api/eventi restituisca tutti gli eventi
      console.log('Eventi fetch response status:', response.status);

      if (!response.ok) {
        // Se il primo tentativo fallisce, potresti loggare l'errore dettagliato
        const errorText = await response.text();
        console.error('Failed to fetch events (initial attempt):', response.status, errorText);
        throw new Error(`Errore nel caricamento eventi: ${response.status} - ${errorText}`);
      }

      const data: ApiResponse = await response.json();
      console.log('Eventi response data:', data);

      if (!data.success) {
        throw new Error(data.error || 'Errore sconosciuto nel caricamento eventi');
      }

      const fetchedEventi = data.eventi || [];
      setEventi(fetchedEventi);
      console.log('Eventi loaded:', fetchedEventi.length);

      // Carica le prenotazioni per ogni evento
      if (fetchedEventi.length > 0) {
        console.log('Loading prenotazioni for', fetchedEventi.length, 'events');
        await Promise.all(fetchedEventi.map(evento => fetchPrenotazioni(evento.id)));
      }

    } catch (err) {
      console.error('Fetch eventi error:', err);
      setError(err instanceof Error ? err.message : 'Errore di connessione al server');
    } finally {
      setLoading(false);
    }
  }, []);

  // Funzione per recuperare le prenotazioni di un singolo evento
  const fetchPrenotazioni = useCallback(async (eventoId: number) => {
    try {
      console.log('Fetching prenotazioni for event:', eventoId);
      const response = await fetch(`/api/eventi?section=prenotazioni&evento_id=${eventoId}`);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Errore nel caricamento prenotazioni per evento ${eventoId}: ${response.status} - ${errorText}`);
        return;
      }

      const data: ApiResponse = await response.json();
      console.log(`Prenotazioni for event ${eventoId} response:`, data);

      if (data.success && data.prenotazioni) {
        setPrenotazioni(prev => ({
          ...prev,
          [eventoId]: data.prenotazioni || []
        }));
        console.log(`Loaded ${data.prenotazioni.length} prenotazioni for event ${eventoId}`);
      } else {
        console.warn(`API returned success:false or no prenotazioni for event ${eventoId}:`, data.error);
      }
    } catch (err) {
      console.error('Errore nel caricamento prenotazioni:', err);
    }
  }, []);

  // Effetto per il caricamento iniziale e recupero dati utente
  useEffect(() => {
    // Recupera i dati dell'utente dal localStorage
    console.log('Setting up user data...');
    const user = localStorage.getItem('user');
    if (user) {
      try {
        const userData = JSON.parse(user);
        console.log('User data from localStorage:', userData);
        setUserLevel(userData.level || -1);
        setUserId(userData.id || null);
      } catch (e) {
        console.error('Error parsing user data from localStorage:', e);
        localStorage.removeItem('user');
      }
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
        setError('Impossibile connettersi al server. Verifica che il file API /api/eventi.js esista e sia configurato.');
        setLoading(false);
      }
    });
  }, [fetchEventi]);

  // Funzione per creare un nuovo evento
  const creaEvento = async () => {
    if (!nuovoEvento.titolo.trim() || !nuovoEvento.data_evento.trim()) {
      setError('Titolo e data evento sono obbligatori.');
      return;
    }

    if (!userId) {
      setError('Utente non autenticato. Impossibile creare eventi.');
      return;
    }

    setCreatingEvent(true);
    setError(null);
    try {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(nuovoEvento.data_evento)) {
        setError('Formato data non valido. Utilizzare YYYY-MM-DD.');
        setCreatingEvent(false);
        return;
      }
      const dateObj = new Date(nuovoEvento.data_evento);
      if (isNaN(dateObj.getTime())) {
          setError('Data evento non valida.');
          setCreatingEvent(false);
          return;
      }

      console.log('Creating event with data:', { ...nuovoEvento, user_id: userId });

      const response = await fetch('/api/eventi', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          titolo: nuovoEvento.titolo.trim(),
          descrizione: nuovoEvento.descrizione.trim(),
          data_evento: nuovoEvento.data_evento.trim(),
          immagine_url: nuovoEvento.immagine_url.trim(),
          user_id: userId
        }),
      });

      console.log('Create response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Errore sconosciuto nella risposta del server.' }));
        throw new Error(errorData.error || `Errore HTTP! status: ${response.status}`);
      }

      const data: ApiResponse = await response.json();
      console.log('Create success response:', data);

      if (data.success) {
        setNuovoEvento({
          titolo: '',
          descrizione: '',
          data_evento: '',
          immagine_url: ''
        });
        setShowNewEventForm(false);
        await fetchEventi();
        setError(null);
      } else {
        throw new Error(data.error || 'Errore nella creazione dell\'evento.');
      }
    } catch (err) {
      console.error('Create event error:', err);
      setError(err instanceof Error ? err.message : 'Errore di connessione o del server.');
    } finally {
      setCreatingEvent(false);
    }
  };

  // Funzione per aggiornare un evento esistente
  const aggiornaEvento = async () => {
    if (!editingEventId || !editData.titolo?.trim() || !editData.data_evento?.trim()) {
      setError('Titolo e data evento sono obbligatori per la modifica.');
      return;
    }

    if (!userId) {
      setError('Utente non autenticato. Impossibile modificare eventi.');
      return;
    }

    setUpdatingEvent(true);
    setError(null);
    try {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(editData.data_evento)) {
        setError('Formato data non valido. Utilizzare YYYY-MM-DD.');
        setUpdatingEvent(false);
        return;
      }
      const dateObj = new Date(editData.data_evento);
      if (isNaN(dateObj.getTime())) {
          setError('Data evento non valida.');
          setUpdatingEvent(false);
          return;
      }

      console.log('Updating event with data:', { id: editingEventId, ...editData, user_id: userId });

      const response = await fetch('/api/eventi', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: editingEventId,
          titolo: editData.titolo.trim(),
          descrizione: editData.descrizione?.trim() || '',
          data_evento: editData.data_evento.trim(),
          immagine_url: editData.immagine_url?.trim() || '',
          user_id: userId
        }),
      });

      console.log('Update response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Errore sconosciuto nella risposta del server.' }));
        throw new Error(errorData.error || `Errore HTTP! status: ${response.status}`);
      }

      const data: ApiResponse = await response.json();
      console.log('Update success response:', data);

      if (data.success) {
        setEditingEventId(null);
        setEditData({});
        await fetchEventi();
        setError(null);
      } else {
        throw new Error(data.error || 'Errore nell\'aggiornamento dell\'evento.');
      }
    } catch (err) {
      console.error('Update event error:', err);
      setError(err instanceof Error ? err.message : 'Errore di connessione o del server.');
    } finally {
      setUpdatingEvent(false);
    }
  };

  // Funzione per eliminare un evento
  const eliminaEvento = async (eventoId: number) => {
    if (!confirm('Sei sicuro di voler eliminare questo evento? Tutte le prenotazioni associate saranno eliminate.')) {
      return;
    }

    if (!userId) {
      setError('Utente non autenticato. Impossibile eliminare eventi.');
      return;
    }

    setError(null);
    try {
      console.log('Deleting event:', { id: eventoId, user_id: userId });

      const response = await fetch('/api/eventi', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: eventoId,
          user_id: userId
        }),
      });

      console.log('Delete response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Errore sconosciuto nella risposta del server.' }));
        throw new Error(errorData.error || `Errore HTTP! status: ${response.status}`);
      }

      const data: ApiResponse = await response.json();
      console.log('Delete success response:', data);

      if (data.success) {
        await fetchEventi();
        setError(null);
      } else {
        throw new Error(data.error || 'Errore nell\'eliminazione dell\'evento.');
      }
    } catch (err) {
      console.error('Delete event error:', err);
      setError(err instanceof Error ? err.message : 'Errore di connessione o del server.');
    }
  };

  // Funzione per eliminare una prenotazione
  const eliminaPrenotazione = async (prenotazioneId: number, eventoId: number) => {
    if (!confirm('Sei sicuro di voler eliminare questa prenotazione?')) {
      return;
    }

    if (!userId) {
      setError('Utente non autenticato. Impossibile eliminare prenotazioni.');
      return;
    }

    setError(null);
    try {
      console.log('Deleting prenotazione:', { id: prenotazioneId, user_id: userId });

      const response = await fetch('/api/eventi?section=prenotazioni', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: prenotazioneId,
          user_id: userId
        }),
      });

      console.log('Delete prenotazione response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Errore sconosciuto nella risposta del server.' }));
        throw new Error(errorData.error || `Errore HTTP! status: ${response.status}`);
      }

      const data: ApiResponse = await response.json();
      console.log('Delete prenotazione success response:', data);

      if (data.success) {
        await fetchPrenotazioni(eventoId);
        setError(null);
      } else {
        throw new Error(data.error || 'Errore nell\'eliminazione della prenotazione.');
      }
    } catch (err) {
      console.error('Delete booking error:', err);
      setError(err instanceof Error ? err.message : 'Errore di connessione o del server.');
    }
  };

  // Funzione per convertire URL di Google Drive nel formato corretto
  const convertGoogleDriveUrl = (url: string) => {
    if (!url) return '';
    
    // Se è già un URL diretto di Google Drive o Googleusercontent, lo restituisce
    if (url.includes('drive.google.com/uc?') || url.includes('googleusercontent.com')) {
      return url;
    }

    // Estrae l'ID file da vari formati di URL di Google Drive
    let fileId = '';
    
    // Formato standard: https://drive.google.com/file/d/FILE_ID/view?usp=sharing
    const standardMatch = url.match(/\/file\/d\/([^\/]+)/);
    if (standardMatch && standardMatch[1]) {
      fileId = standardMatch[1];
    } 
    // Formato alternativo: https://drive.google.com/open?id=FILE_ID
    else {
      const openMatch = url.match(/[?&]id=([^&]+)/);
      if (openMatch && openMatch[1]) {
        fileId = openMatch[1];
      }
    }

    if (fileId) {
      // Costruisce l'URL diretto per l'anteprima dell'immagine
      return `https://drive.google.com/uc?export=view&id=${fileId}`;
    }

    // Se non è un link di Google Drive riconoscibile, restituisce l'URL originale
    return url;
  };

  const iniziaModifica = (evento: Evento) => {
    setEditingEventId(evento.id);
    setEditData({
      titolo: evento.titolo,
      descrizione: evento.descrizione,
      data_evento: evento.data_evento.split('T')[0],
      immagine_url: evento.immagine_url
    });
  };

  const annullaModifica = () => {
    setEditingEventId(null);
    setEditData({});
    setError(null);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Data non specificata';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return `Data non valida: ${dateString}`;
      }
      return date.toLocaleDateString('it-IT', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (e) {
      console.error('Error formatting date:', dateString, e);
      return `Errore formato data: ${dateString}`;
    }
  };

  const getParticipantCount = (eventoId: number) => {
    const eventoPrenotazioni = prenotazioni[eventoId] || [];
    return eventoPrenotazioni.reduce((total, prenotazione) => {
      return total + (prenotazione.num_biglietti && !isNaN(prenotazione.num_biglietti) ? prenotazione.num_biglietti : 1);
    }, 0);
  };

  const canManageEvents = () => {
    return userLevel >= 0 && userLevel <= 2;
  };

  const toggleEvent = (eventoId: number) => {
    setExpandedEvents(prev => ({
      ...prev,
      [eventoId]: !prev[eventoId]
    }));
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
              onClick={() => {
                setShowNewEventForm(!showNewEventForm);
                if (showNewEventForm) setError(null);
              }}
              className={`btn btn-success ${showNewEventForm ? 'btn-cancel' : ''}`}
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
          <button onClick={() => setError(null)} className="close-error" aria-label="Chiudi errore">×</button>
        </div>
      )}

      {/* Form nuovo evento */}
      {showNewEventForm && canManageEvents() && (
        <div className="new-event-form card">
          <h2>Crea Nuovo Evento</h2>
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="titolo-nuovo">Titolo *</label>
              <input
                id="titolo-nuovo"
                type="text"
                value={nuovoEvento.titolo}
                onChange={(e) => setNuovoEvento({ ...nuovoEvento, titolo: e.target.value })}
                placeholder="Titolo dell'evento"
                required
                disabled={creatingEvent}
              />
            </div>
            <div className="form-group">
              <label htmlFor="data-nuovo">Data Evento *</label>
              <input
                id="data-nuovo"
                type="date"
                value={nuovoEvento.data_evento}
                onChange={(e) => setNuovoEvento({ ...nuovoEvento, data_evento: e.target.value })}
                required
                disabled={creatingEvent}
              />
            </div>
            <div className="form-group full-width">
              <label htmlFor="descrizione-nuovo">Descrizione</label>
              <textarea
                id="descrizione-nuovo"
                value={nuovoEvento.descrizione}
                onChange={(e) => setNuovoEvento({ ...nuovoEvento, descrizione: e.target.value })}
                placeholder="Descrizione dettagliata dell'evento"
                rows={3}
                disabled={creatingEvent}
              />
            </div>
            <div className="form-group full-width">
              <label htmlFor="immagine-nuovo">URL Immagine</label>
              <input
                id="immagine-nuovo"
                type="url"
                value={nuovoEvento.immagine_url}
                onChange={(e) => setNuovoEvento({ ...nuovoEvento, immagine_url: e.target.value })}
                placeholder="https://drive.google.com/d/..."
                disabled={creatingEvent}
              />
              <small className="form-hint">
                Inserisci un link di Google Drive (condiviso pubblicamente) o un URL diretto all'immagine
              </small>
            </div>
          </div>
          <div className="form-actions">
            <button onClick={creaEvento} className="btn btn-success" disabled={creatingEvent}>
              {creatingEvent ? 'Creazione...' : '💾 Crea Evento'}
            </button>
            <button
              onClick={() => {
                setShowNewEventForm(false);
                setError(null);
                setNuovoEvento({ titolo: '', descrizione: '', data_evento: '', immagine_url: '' });
              }}
              className="btn btn-secondary"
              disabled={creatingEvent}
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
            <div key={evento.id} className="event-section card">
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
                        disabled={editingEventId === evento.id}
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
                    <div className="edit-form card-inner">
                      <h4>Modifica Evento</h4>
                      <div className="form-grid">
                        <div className="form-group">
                          <label htmlFor={`edit-titolo-${evento.id}`}>Titolo *</label>
                          <input
                            id={`edit-titolo-${evento.id}`}
                            type="text"
                            value={editData.titolo || ''}
                            onChange={(e) => setEditData({ ...editData, titolo: e.target.value })}
                            required
                            disabled={updatingEvent}
                          />
                        </div>
                        <div className="form-group">
                          <label htmlFor={`edit-data-${evento.id}`}>Data Evento *</label>
                          <input
                            id={`edit-data-${evento.id}`}
                            type="date"
                            value={editData.data_evento || ''}
                            onChange={(e) => setEditData({ ...editData, data_evento: e.target.value })}
                            required
                            disabled={updatingEvent}
                          />
                        </div>
                        <div className="form-group full-width">
                          <label htmlFor={`edit-descrizione-${evento.id}`}>Descrizione</label>
                          <textarea
                            id={`edit-descrizione-${evento.id}`}
                            value={editData.descrizione || ''}
                            onChange={(e) => setEditData({ ...editData, descrizione: e.target.value })}
                            rows={3}
                            disabled={updatingEvent}
                          />
                        </div>
                        <div className="form-group full-width">
                          <label htmlFor={`edit-immagine-${evento.id}`}>URL Immagine</label>
                          <input
                            id={`edit-immagine-${evento.id}`}
                            type="url"
                            value={editData.immagine_url || ''}
                            onChange={(e) => setEditData({ ...editData, immagine_url: e.target.value })}
                            disabled={updatingEvent}
                          />
                          <small className="form-hint">
                            Inserisci un link di Google Drive (condiviso pubblicamente) o un URL diretto all'immagine
                          </small>
                        </div>
                      </div>
                      <div className="form-actions">
                        <button onClick={aggiornaEvento} className="btn btn-success" disabled={updatingEvent}>
                          {updatingEvent ? 'Salvataggio...' : '💾 Salva Modifiche'}
                        </button>
                        <button onClick={annullaModifica} className="btn btn-secondary" disabled={updatingEvent}>
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
                              src={convertGoogleDriveUrl(evento.immagine_url)}
                              alt={`Immagine di ${evento.titolo}`}
                              className="event-image-content"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.style.display = 'none';
                                console.warn(`Failed to load image for event ${evento.id}: ${evento.immagine_url}`);
                              }}
                            />
                          </div>
                        )}
                        <div className="event-description">
                          <p>{evento.descrizione || 'Nessuna descrizione disponibile per questo evento.'}</p>
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
                                    Prenotato il: {formatDate(prenotazione.data_prenotazione)}
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
                            Nessuna prenotazione per questo evento.
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
          <div className="no-eventi card">
            <h2>Nessun evento trovato</h2>
            <p>Non ci sono eventi da visualizzare al momento. Inizia creando il primo!</p>
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