import React, { useState, useEffect, useCallback } from 'react';
import '..style/gestisciEventi.css';

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
  const [creatingEvent, setCreatingEvent] = useState(false);

  // Stato per modifica evento
  const [editingEventId, setEditingEventId] = useState<number | null>(null);
  const [editData, setEditData] = useState<Partial<Evento & { immagine_file?: File }>>({});
  const [updatingEvent, setUpdatingEvent] = useState(false);

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
      <div className="p-8">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          <span className="ml-4 text-lg">Caricamento eventi...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 bg-gray-50 min-h-screen">
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-3xl font-bold text-gray-800">Gestione Eventi</h1>
          <div className="flex gap-3">
            {canManageEvents() && (
              <button
                onClick={() => {
                  setShowNewEventForm(!showNewEventForm);
                  if (showNewEventForm) setError(null);
                }}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  showNewEventForm 
                    ? 'bg-red-500 hover:bg-red-600 text-white' 
                    : 'bg-green-500 hover:bg-green-600 text-white'
                }`}
              >
                {showNewEventForm ? '✕ Annulla' : '+ Nuovo Evento'}
              </button>
            )}
            <button 
              onClick={fetchEventi} 
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors"
              disabled={loading}
            >
              🔄 Ricarica
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 relative">
            {error}
            <button 
              onClick={() => setError(null)} 
              className="absolute top-2 right-2 text-red-700 hover:text-red-900"
            >
              ×
            </button>
          </div>
        )}

        {/* Form nuovo evento */}
        {showNewEventForm && canManageEvents() && (
          <div className="bg-gray-50 p-6 rounded-lg mb-6">
            <h2 className="text-xl font-semibold mb-4">Crea Nuovo Evento</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Titolo *
                </label>
                <input
                  type="text"
                  value={nuovoEvento.titolo}
                  onChange={(e) => setNuovoEvento({ ...nuovoEvento, titolo: e.target.value })}
                  placeholder="Titolo dell'evento"
                  required
                  disabled={creatingEvent}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Data Evento *
                </label>
                <input
                  type="date"
                  value={nuovoEvento.data_evento}
                  onChange={(e) => setNuovoEvento({ ...nuovoEvento, data_evento: e.target.value })}
                  required
                  disabled={creatingEvent}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Descrizione
                </label>
                <textarea
                  value={nuovoEvento.descrizione}
                  onChange={(e) => setNuovoEvento({ ...nuovoEvento, descrizione: e.target.value })}
                  placeholder="Descrizione dettagliata dell'evento"
                  rows={3}
                  disabled={creatingEvent}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Carica Immagine
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleNewEventImageChange}
                  disabled={creatingEvent}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-sm text-gray-500 mt-1">Formati supportati: JPG, PNG, GIF, WebP (max 5MB)</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Oppure URL Immagine
                </label>
                <input
                  type="url"
                  value={nuovoEvento.immagine_url}
                  onChange={(e) => setNuovoEvento({ ...nuovoEvento, immagine_url: e.target.value, immagine_file: undefined })}
                  placeholder="https://example.com/image.jpg"
                  disabled={creatingEvent || !!nuovoEvento.immagine_file}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button 
                onClick={creaEvento} 
                className="px-6 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition-colors" 
                disabled={creatingEvent}
              >
                {creatingEvent ? 'Creazione...' : '💾 Crea Evento'}
              </button>
              <button
                onClick={() => {
                  setShowNewEventForm(false);
                  setError(null);
                  setNuovoEvento({ titolo: '', descrizione: '', data_evento: '', immagine_url: '' });
                }}
                className="px-6 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors"
                disabled={creatingEvent}
              >
                ✕ Annulla
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Lista eventi */}
      <div className="space-y-4">
        {eventi.length > 0 ? (
          eventi.map((evento) => (
            <div key={evento.id} className="bg-white rounded-lg shadow-sm border">
              <div 
                className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => toggleEvent(evento.id)}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-xl font-semibold text-gray-800">
                      {evento.titolo}
                      <span className="ml-2 text-sm text-gray-500 font-normal">
                        ({getParticipantCount(evento.id)} partecipanti)
                      </span>
                    </h3>
                    <div className="text-gray-600 mt-1">
                      📅 {formatDate(evento.data_evento)}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {canManageEvents() && (
                      <>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            iniziaModifica(evento);
                          }}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
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
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Elimina evento"
                        >
                          🗑️
                        </button>
                      </>
                    )}
                    <span className={`transform transition-transform ${expandedEvents[evento.id] ? 'rotate-180' : ''}`}>
                      ▼
                    </span>
                  </div>
                </div>
              </div>

              {expandedEvents[evento.id] && (
                <div className="px-4 pb-4">
                  {editingEventId === evento.id ? (
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h4 className="text-lg font-semibold mb-4">Modifica Evento</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Titolo *
                          </label>
                          <input
                            type="text"
                            value={editData.titolo || ''}
                            onChange={(e) => setEditData({ ...editData, titolo: e.target.value })}
                            required
                            disabled={updatingEvent}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Data Evento *
                          </label>
                          <input
                            type="date"
                            value={editData.data_evento || ''}
                            onChange={(e) => setEditData({ ...editData, data_evento: e.target.value })}
                            required
                            disabled={updatingEvent}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Descrizione
                          </label>
                          <textarea
                            value={editData.descrizione || ''}
                            onChange={(e) => setEditData({ ...editData, descrizione: e.target.value })}
                            rows={3}
                            disabled={updatingEvent}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Nuova Immagine
                          </label>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleEditImageChange}
                            disabled={updatingEvent}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            URL Immagine
                          </label>
                          <input
                            type="url"
                            value={editData.immagine_url || ''}
                            onChange={(e) => setEditData({ ...editData, immagine_url: e.target.value, immagine_file: undefined })}
                            disabled={updatingEvent || !!editData.immagine_file}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                          />
                        </div>
                      </div>
                      <div className="flex gap-3 mt-4">
                        <button 
                          onClick={aggiornaEvento} 
                          className="px-6 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition-colors" 
                          disabled={updatingEvent}
                        >
                          {updatingEvent ? 'Salvataggio...' : '💾 Salva Modifiche'}
                        </button>
                        <button 
                          onClick={annullaModifica} 
                          className="px-6 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors" 
                          disabled={updatingEvent}
                        >
                          ✕ Annulla
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex flex-col md:flex-row gap-6">
                        {getImageUrl(evento) && (
                          <div className="md:w-1/3">
                            <img
                              src={getImageUrl(evento)}
                              alt={`Immagine di ${evento.titolo}`}
                              className="w-full h-48 object-cover rounded-lg shadow-sm"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.style.display = 'none';
                              }}
                            />
                          </div>
                        )}
                        <div className={getImageUrl(evento) ? 'md:w-2/3' : 'w-full'}>
                          <p className="text-gray-700 leading-relaxed">
                            {evento.descrizione || 'Nessuna descrizione disponibile per questo evento.'}
                          </p>
                        </div>
                      </div>

                      <div className="mt-6 pt-6 border-t border-gray-200">
                        <h4 className="text-lg font-semibold mb-4">
                          Prenotazioni ({(prenotazioni[evento.id] || []).length})
                          <span className="text-sm font-normal text-gray-600 ml-2">
                            - Totale partecipanti: {getParticipantCount(evento.id)}
                          </span>
                        </h4>
                        {prenotazioni[evento.id]?.length > 0 ? (
                          <div className="space-y-3">
                            {prenotazioni[evento.id].map((prenotazione) => (
                              <div key={prenotazione.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                                <div>
                                  <div className="font-medium text-gray-800">
                                    {prenotazione.nome} {prenotazione.cognome}
                                  </div>
                                  <div className="text-sm text-gray-600">
                                    {prenotazione.email}
                                  </div>
                                  <div className="text-sm text-gray-500">
                                    Prenotato il: {formatDate(prenotazione.data_prenotazione)}
                                  </div>
                                  {prenotazione.num_biglietti && prenotazione.num_biglietti > 1 && (
                                    <div className="text-sm text-blue-600 font-medium">
                                      🎫 {prenotazione.num_biglietti} biglietti
                                    </div>
                                  )}
                                </div>
                                {canManageEvents() && (
                                  <button
                                    onClick={() => {
                                      if (confirm('Sei sicuro di voler eliminare questa prenotazione?')) {
                                        // Implementa eliminazione prenotazione
                                        console.log('Elimina prenotazione:', prenotazione.id);
                                      }
                                    }}
                                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                    title="Elimina prenotazione"
                                  >
                                    🗑️
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-8 text-gray-500">
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
          <div className="bg-white rounded-lg shadow-sm p-8 text-center">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">Nessun evento trovato</h2>
            <p className="text-gray-600 mb-6">Non ci sono eventi da visualizzare al momento. Inizia creando il primo!</p>
            {canManageEvents() && (
              <button
                onClick={() => setShowNewEventForm(true)}
                className="px-6 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition-colors"
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