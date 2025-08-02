import React, { useState, useEffect, useCallback } from 'react';
import '../style/gestisciEventi.css';

// Definizione delle interfacce per i dati
interface Evento {
  id: number;
  titolo: string;
  descrizione: string;
  data_evento: string;
  immagine_url?: string;
  immagine_blob?: string; // Base64 encoded image
  immagine_tipo?: string;
  immagine_nome?: string;
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
  immagine_file?: File;
}

interface BroadcastEmail {
  subject: string;
  message: string;
}

interface ApiResponse {
  success: boolean;
  eventi?: Evento[];
  evento?: Evento;
  prenotazioni?: Prenotazione[];
  error?: string;
  message?: string;
  evento_id?: number;
  broadcast_details?: any;
  destinatari_count?: number;
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
  const [creatingEvent, setCreatingEvent] = useState(false);

  // Stato per modifica evento
  const [editingEventId, setEditingEventId] = useState<number | null>(null);
  const [editData, setEditData] = useState<Partial<Evento & { immagine_file?: File }>>({});
  const [updatingEvent, setUpdatingEvent] = useState(false);

  // Stato per email broadcast
  const [broadcastEventId, setBroadcastEventId] = useState<number | null>(null);
  const [broadcastData, setBroadcastData] = useState<BroadcastEmail>({
    subject: '',
    message: ''
  });
  const [sendingBroadcast, setSendingBroadcast] = useState(false);
  const [broadcastSuccess, setBroadcastSuccess] = useState<string | null>(null);

  // Stato per l'utente loggato
  const [userLevel, setUserLevel] = useState<number>(-1);
  const [userId, setUserId] = useState<number | null>(null);

  // Gestione automatica della scomparsa dei messaggi di errore
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        setError(null);
      }, 7000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  // Gestione automatica della scomparsa dei messaggi di successo
  useEffect(() => {
    if (broadcastSuccess) {
      const timer = setTimeout(() => {
        setBroadcastSuccess(null);
      }, 10000);
      return () => clearTimeout(timer);
    }
  }, [broadcastSuccess]);

  // Funzione per convertire file in base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  // Funzione per validare il tipo di file immagine
  const validateImageFile = (file: File): boolean => {
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    const maxSize = 5 * 1024 * 1024; // 5MB

    if (!validTypes.includes(file.type)) {
      setError('Tipo di file non supportato. Usa JPG, PNG, GIF o WebP.');
      return false;
    }

    if (file.size > maxSize) {
      setError('File troppo grande. Dimensione massima: 5MB.');
      return false;
    }

    return true;
  };

  // Funzione per recuperare tutti gli eventi
  const fetchEventi = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/eventi');

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Errore nel caricamento eventi: ${response.status} - ${errorText}`);
      }

      const data: ApiResponse = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Errore sconosciuto nel caricamento eventi');
      }

      const fetchedEventi = data.eventi || [];
      setEventi(fetchedEventi);

      // Carica le prenotazioni per ogni evento
      if (fetchedEventi.length > 0) {
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
      const response = await fetch(`/api/eventi?section=prenotazioni&evento_id=${eventoId}`);

      if (!response.ok) {
        return;
      }

      const data: ApiResponse = await response.json();

      if (data.success && data.prenotazioni) {
        setPrenotazioni(prev => ({
          ...prev,
          [eventoId]: data.prenotazioni || []
        }));
      }
    } catch (err) {
      console.error('Errore nel caricamento prenotazioni:', err);
    }
  }, []);

  // Effetto per il caricamento iniziale
  useEffect(() => {
    // Simula il recupero dati utente
    setUserLevel(1); // Amministratore
    setUserId(1);
    
    fetchEventi();
  }, [fetchEventi]);

  // Funzione per inviare email broadcast
  const inviaEmailBroadcast = async () => {
    if (!broadcastEventId || !broadcastData.subject.trim() || !broadcastData.message.trim()) {
      setError('Oggetto e messaggio sono obbligatori per l\'invio email.');
      return;
    }

    if (!userId) {
      setError('Utente non autenticato. Impossibile inviare email.');
      return;
    }

    const eventoPrenotazioni = prenotazioni[broadcastEventId] || [];
    if (eventoPrenotazioni.length === 0) {
      setError('Nessuna prenotazione trovata per questo evento. Non è possibile inviare email.');
      return;
    }

    setSendingBroadcast(true);
    setError(null);
    setBroadcastSuccess(null);

    try {
      const response = await fetch('/api/eventi?section=broadcast', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          evento_id: broadcastEventId,
          subject: broadcastData.subject.trim(),
          message: broadcastData.message.trim(),
          user_id: userId
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Errore sconosciuto nella risposta del server.' }));
        throw new Error(errorData.error || `Errore HTTP! status: ${response.status}`);
      }

      const data: ApiResponse = await response.json();

      if (data.success) {
        setBroadcastSuccess(`Email inviate con successo a ${data.destinatari_count || eventoPrenotazioni.length} partecipanti!`);
        setBroadcastData({ subject: '', message: '' });
        setBroadcastEventId(null);
        setError(null);
      } else {
        throw new Error(data.error || 'Errore nell\'invio delle email.');
      }
    } catch (err) {
      console.error('Broadcast email error:', err);
      setError(err instanceof Error ? err.message : 'Errore di connessione o del server.');
    } finally {
      setSendingBroadcast(false);
    }
  };

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
      let eventData: any = {
        titolo: nuovoEvento.titolo.trim(),
        descrizione: nuovoEvento.descrizione.trim(),
        data_evento: nuovoEvento.data_evento.trim(),
        immagine_url: nuovoEvento.immagine_url.trim(),
        user_id: userId
      };

      // Se c'è un file immagine, convertilo in base64
      if (nuovoEvento.immagine_file) {
        if (!validateImageFile(nuovoEvento.immagine_file)) {
          setCreatingEvent(false);
          return;
        }
        
        const base64 = await fileToBase64(nuovoEvento.immagine_file);
        eventData.immagine_blob = base64;
        eventData.immagine_tipo = nuovoEvento.immagine_file.type;
        eventData.immagine_nome = nuovoEvento.immagine_file.name;
      }

      const response = await fetch('/api/eventi', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(eventData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Errore sconosciuto nella risposta del server.' }));
        throw new Error(errorData.error || `Errore HTTP! status: ${response.status}`);
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
      let eventData: any = {
        id: editingEventId,
        titolo: editData.titolo.trim(),
        descrizione: editData.descrizione?.trim() || '',
        data_evento: editData.data_evento.trim(),
        immagine_url: editData.immagine_url?.trim() || '',
        user_id: userId
      };

      // Se c'è un nuovo file immagine, convertilo in base64
      if (editData.immagine_file) {
        if (!validateImageFile(editData.immagine_file)) {
          setUpdatingEvent(false);
          return;
        }
        
        const base64 = await fileToBase64(editData.immagine_file);
        eventData.immagine_blob = base64;
        eventData.immagine_tipo = editData.immagine_file.type;
        eventData.immagine_nome = editData.immagine_file.name;
      }

      const response = await fetch('/api/eventi', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(eventData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Errore sconosciuto nella risposta del server.' }));
        throw new Error(errorData.error || `Errore HTTP! status: ${response.status}`);
      }

      const data: ApiResponse = await response.json();

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

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Errore sconosciuto nella risposta del server.' }));
        throw new Error(errorData.error || `Errore HTTP! status: ${response.status}`);
      }

      const data: ApiResponse = await response.json();

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

  // Funzione per gestire la selezione file per nuovo evento
  const handleNewEventImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setNuovoEvento({ ...nuovoEvento, immagine_file: file, immagine_url: '' });
    }
  };

  // Funzione per gestire la selezione file per modifica evento
  const handleEditImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setEditData({ ...editData, immagine_file: file, immagine_url: '' });
    }
  };

  // Funzione per ottenere l'URL dell'immagine
  const getImageUrl = (evento: Evento) => {
    if (evento.immagine_blob) {
      return evento.immagine_blob;
    }
    return evento.immagine_url || '';
  };

  const iniziaModifica = (evento: Evento) => {
    setEditingEventId(evento.id);
    setEditData({
      titolo: evento.titolo,
      descrizione: evento.descrizione,
      data_evento: evento.data_evento.split('T')[0],
      immagine_url: evento.immagine_url || ''
    });
  };

  const annullaModifica = () => {
    setEditingEventId(null);
    setEditData({});
    setError(null);
  };

  const iniziaBroadcast = (eventoId: number) => {
    const evento = eventi.find(e => e.id === eventoId);
    if (!evento) return;
    
    setBroadcastEventId(eventoId);
    setBroadcastData({
      subject: `Aggiornamento per: ${evento.titolo}`,
      message: `Ciao!\n\nTi scriviamo per darti alcune informazioni importanti riguardo all'evento "${evento.titolo}".\n\n[Scrivi qui il tuo messaggio personalizzato]\n\nGrazie per la tua partecipazione!\n\nIl team di Aula Studio Foro`
    });
    setError(null);
    setBroadcastSuccess(null);
  };

  const annullaBroadcast = () => {
    setBroadcastEventId(null);
    setBroadcastData({ subject: '', message: '' });
    setError(null);
    setBroadcastSuccess(null);
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
      <div className="eventi-container">
        <div className="eventi-loading">
          <div className="loading-spinner"></div>
          <p>Caricamento eventi...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="eventi-container">
      <div className="eventi-header-section">
        <h1>🎭 Gestione Eventi</h1>
        
        <div className="eventi-actions">
          {canManageEvents() && (
            <button
              onClick={() => {
                setShowNewEventForm(!showNewEventForm);
                if (showNewEventForm) setError(null);
              }}
              className={`action-button ${showNewEventForm ? 'cancel' : 'create'}`}
            >
              {showNewEventForm ? '✕ Annulla' : '✨ Nuovo Evento'}
            </button>
          )}
          <button 
            onClick={fetchEventi} 
            className="refresh-button"
            disabled={loading}
          >
            🔄 Aggiorna
          </button>
        </div>
      </div>

      {error && (
        <div className="eventi-message error">
          <div className="message-icon">❌</div>
          <span>{error}</span>
          <button onClick={() => setError(null)} className="close-message">×</button>
        </div>
      )}

      {broadcastSuccess && (
        <div className="eventi-message success">
          <div className="message-icon">✅</div>
          <span>{broadcastSuccess}</span>
          <button onClick={() => setBroadcastSuccess(null)} className="close-message">×</button>
        </div>
      )}

      {/* Form email broadcast */}
      {broadcastEventId && (
        <div className="broadcast-form">
          <div className="form-header">
            <h2>📧 Invia Email ai Partecipanti</h2>
            <p>
              Evento: <strong>{eventi.find(e => e.id === broadcastEventId)?.titolo}</strong> 
              ({(prenotazioni[broadcastEventId] || []).length} destinatari)
            </p>
          </div>
          <div className="form-content">
            <div className="form-grid">
              <div className="form-group full-width">
                <label htmlFor="broadcast-subject">Oggetto Email *</label>
                <input
                  id="broadcast-subject"
                  type="text"
                  value={broadcastData.subject}
                  onChange={(e) => setBroadcastData({ ...broadcastData, subject: e.target.value })}
                  placeholder="Oggetto dell'email"
                  required
                  disabled={sendingBroadcast}
                />
              </div>
              <div className="form-group full-width">
                <label htmlFor="broadcast-message">Messaggio *</label>
                <textarea
                  id="broadcast-message"
                  value={broadcastData.message}
                  onChange={(e) => setBroadcastData({ ...broadcastData, message: e.target.value })}
                  placeholder="Scrivi qui il messaggio da inviare a tutti i partecipanti..."
                  rows={8}
                  required
                  disabled={sendingBroadcast}
                />
                <p className="form-help">
                  Questo messaggio sarà inviato a tutti i {(prenotazioni[broadcastEventId] || []).length} partecipanti dell'evento.
                </p>
              </div>
            </div>
            <div className="form-actions">
              <button 
                onClick={inviaEmailBroadcast} 
                className="btn-send-broadcast"
                disabled={sendingBroadcast || !broadcastData.subject.trim() || !broadcastData.message.trim()}
              >
                {sendingBroadcast ? (
                  <>
                    <div className="button-spinner"></div>
                    📤 Invio in corso...
                  </>
                ) : (
                  <>
                    📧 Invia a {(prenotazioni[broadcastEventId] || []).length} partecipanti
                  </>
                )}
              </button>
              <button
                onClick={annullaBroadcast}
                className="btn-cancel"
                disabled={sendingBroadcast}
              >
                ✕ Annulla
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Form nuovo evento */}
      {showNewEventForm && canManageEvents() && (
        <div className="new-event-form">
          <div className="form-header">
            <h2>✨ Crea Nuovo Evento</h2>
          </div>
          <div className="form-content">
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="titolo">Titolo *</label>
                <input
                  id="titolo"
                  type="text"
                  value={nuovoEvento.titolo}
                  onChange={(e) => setNuovoEvento({ ...nuovoEvento, titolo: e.target.value })}
                  placeholder="Titolo dell'evento"
                  required
                  disabled={creatingEvent}
                />
              </div>
              <div className="form-group">
                <label htmlFor="data">Data Evento *</label>
                <input
                  id="data"
                  type="date"
                  value={nuovoEvento.data_evento}
                  onChange={(e) => setNuovoEvento({ ...nuovoEvento, data_evento: e.target.value })}
                  required
                  disabled={creatingEvent}
                />
              </div>
              <div className="form-group full-width">
                <label htmlFor="descrizione">Descrizione</label>
                <textarea
                  id="descrizione"
                  value={nuovoEvento.descrizione}
                  onChange={(e) => setNuovoEvento({ ...nuovoEvento, descrizione: e.target.value })}
                  placeholder="Descrizione dettagliata dell'evento"
                  rows={3}
                  disabled={creatingEvent}
                />
              </div>
              <div className="form-group">
                <label htmlFor="immagine-file">Carica Immagine</label>
                <input
                  id="immagine-file"
                  type="file"
                  accept="image/*"
                  onChange={handleNewEventImageChange}
                  disabled={creatingEvent}
                />
                <p className="form-help">Formati: JPG, PNG, GIF, WebP (max 5MB)</p>
              </div>
              <div className="form-group">
                <label htmlFor="immagine-url">Oppure URL Immagine</label>
                <input
                  id="immagine-url"
                  type="url"
                  value={nuovoEvento.immagine_url}
                  onChange={(e) => setNuovoEvento({ ...nuovoEvento, immagine_url: e.target.value, immagine_file: undefined })}
                  placeholder="https://example.com/image.jpg"
                  disabled={creatingEvent || !!nuovoEvento.immagine_file}
                />
              </div>
            </div>
            <div className="form-actions">
              <button 
                onClick={creaEvento} 
                className="btn-create"
                disabled={creatingEvent}
              >
                {creatingEvent ? '⏳ Creazione...' : '💾 Crea Evento'}
              </button>
              <button
                onClick={() => {
                  setShowNewEventForm(false);
                  setError(null);
                  setNuovoEvento({ titolo: '', descrizione: '', data_evento: '', immagine_url: '' });
                }}
                className="btn-cancel"
                disabled={creatingEvent}
              >
                ✕ Annulla
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lista eventi */}
      <div className="eventi-content">
        {eventi.length > 0 ? (
          <div className="eventi-grid">
            {eventi.map((evento) => (
              <div key={evento.id} className="event-card">
                <div 
                  className="event-header"
                  onClick={() => toggleEvent(evento.id)}
                >
                  <div className="event-image">
                    {getImageUrl(evento) ? (
                      <img
                        src={getImageUrl(evento)}
                        alt={`Immagine di ${evento.titolo}`}
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjEyMCIgdmlld0JveD0iMCAwIDIwMCAxMjAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMTIwIiBmaWxsPSIjRjVGNUY1Ii8+CjxwYXRoIGQ9Ik04NS41IDUwQzg1LjUgNTQuMTQyMSA4Mi4xNDIxIDU3LjUgNzggNTcuNUM3My44NTc5IDU3LjUgNzAuNSA1NC4xNDIxIDcwLjUgNTBDNzAuNSA0NS44NTc5IDczLjg1NzkgNDIuNSA3OCA0Mi41QzgyLjE0MjEgNDIuNSA4NS41IDQ1Ljg1NzkgODUuNSA1MFoiIGZpbGw9IiNDQ0MiLz4KPHBhdGggZD0iTTEzMC41IDYwTDExNC41IDc1TDk1IDU1LjVMNjkuNSA4MUgxMzAuNVY2MFoiIGZpbGw9IiNDQ0MiLz4KPC9zdmc+';
                        }}
                      />
                    ) : (
                      <div className="no-image">
                        <span>🖼️</span>
                        <span>Nessuna immagine</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="event-info">
                    <div className="event-title">
                      <h3>{evento.titolo}</h3>
                      <span className="participant-count">{getParticipantCount(evento.id)} partecipanti</span>
                    </div>
                    <div className="event-date">
                      📅 {formatDate(evento.data_evento)}
                    </div>
                  </div>

                  <div className="event-actions">
                    {canManageEvents() && (
                      <>
                        {(prenotazioni[evento.id] || []).length > 0 && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              iniziaBroadcast(evento.id);
                            }}
                            className="btn-broadcast"
                            title="Invia email ai partecipanti"
                            disabled={broadcastEventId === evento.id}
                          >
                            📧
                          </button>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            iniziaModifica(evento);
                          }}
                          className="btn-edit"
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
                          className="btn-delete"
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
                        <h4>✏️ Modifica Evento</h4>
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
                          <div className="form-group">
                            <label htmlFor={`edit-file-${evento.id}`}>Nuova Immagine</label>
                            <input
                              id={`edit-file-${evento.id}`}
                              type="file"
                              accept="image/*"
                              onChange={handleEditImageChange}
                              disabled={updatingEvent}
                            />
                          </div>
                          <div className="form-group">
                            <label htmlFor={`edit-url-${evento.id}`}>URL Immagine</label>
                            <input
                              id={`edit-url-${evento.id}`}
                              type="url"
                              value={editData.immagine_url || ''}
                              onChange={(e) => setEditData({ ...editData, immagine_url: e.target.value, immagine_file: undefined })}
                              disabled={updatingEvent || !!editData.immagine_file}
                            />
                          </div>
                        </div>
                        <div className="form-actions">
                          <button 
                            onClick={aggiornaEvento} 
                            className="btn-save"
                            disabled={updatingEvent}
                          >
                            {updatingEvent ? '⏳ Salvataggio...' : '💾 Salva Modifiche'}
                          </button>
                          <button 
                            onClick={annullaModifica} 
                            className="btn-cancel"
                            disabled={updatingEvent}
                          >
                            ✕ Annulla
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="event-description">
                          <p>{evento.descrizione || 'Nessuna descrizione disponibile per questo evento.'}</p>
                        </div>

                        <div className="prenotazioni-section">
                          <h4>
                            🎫 Prenotazioni ({(prenotazioni[evento.id] || []).length})
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
                                      👤 {prenotazione.nome} {prenotazione.cognome}
                                    </div>
                                    <div className="partecipante-email">
                                      📧 {prenotazione.email}
                                    </div>
                                    <div className="prenotazione-data">
                                      📅 Prenotato il: {formatDate(prenotazione.data_prenotazione)}
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
                                        onClick={() => {
                                          if (confirm('Sei sicuro di voler eliminare questa prenotazione?')) {
                                            console.log('Elimina prenotazione:', prenotazione.id);
                                          }
                                        }}
                                        className="btn-delete-small"
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
                              <span>📭</span>
                              <p>Nessuna prenotazione per questo evento</p>
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="no-eventi">
            <div className="no-eventi-icon">🎭</div>
            <h2>Nessun evento trovato</h2>
            <p>Non ci sono eventi da visualizzare al momento.</p>
            {canManageEvents() && (
              <button
                onClick={() => setShowNewEventForm(true)}
                className="btn-create-first"
              >
                ✨ Crea evento
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default GestisciEventi;