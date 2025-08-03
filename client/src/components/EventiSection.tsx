import React, { useState, useEffect } from 'react';
import { Calendar, Users, ExternalLink, Eye, EyeOff } from 'lucide-react';
import '../style/componentiEventi.css';

interface Evento {
  id: number;
  titolo: string;
  descrizione: string;
  data_evento: string;
  immagine_url?: string;
  immagine_blob?: string;
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

interface ApiResponse {
  success: boolean;
  eventi?: Evento[];
  prenotazioni?: Prenotazione[];
  error?: string;
}



interface User {
  id: number;
  level: number;
}

const EventiSection: React.FC = () => {
  const [eventi, setEventi] = useState<Evento[]>([]);
  const [prenotazioni, setPrenotazioni] = useState<Record<number, Prenotazione[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isVisible, setIsVisible] = useState(true);
  const [isToggling, setIsToggling] = useState(false);
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);

  useEffect(() => {
    fetchEventi();
    checkUserPermissions();
    loadVisibilityData();
  }, []);

  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  const checkUserPermissions = () => {
    const user = localStorage.getItem('user');
    if (user) {
      try {
        const userData = JSON.parse(user);
        setCurrentUser(userData);
      } catch (error) {
        console.error('Errore nel parsing user data:', error);
      }
    }
  };

  const loadVisibilityData = async () => {
    // Non serve più caricare da API, usiamo lo stato locale
    setIsVisible(true); // Default: visibile
  };

  const fetchEventi = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/eventi');
      if (!response.ok) {
        throw new Error('Errore nel caricamento eventi');
      }

      const data: ApiResponse = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Errore sconosciuto');
      }

      const fetchedEventi = data.eventi || [];
      // Filtra solo eventi futuri
      const eventiFuturi = fetchedEventi.filter(evento => {
        const dataEvento = new Date(evento.data_evento);
        const oggi = new Date();
        oggi.setHours(0, 0, 0, 0);
        return dataEvento >= oggi;
      });

      setEventi(eventiFuturi);

      // Carica le prenotazioni per ogni evento
      if (eventiFuturi.length > 0) {
        await Promise.all(eventiFuturi.map(evento => fetchPrenotazioni(evento.id)));
      }

    } catch (err) {
      console.error('Fetch eventi error:', err);
      setError(err instanceof Error ? err.message : 'Errore di connessione');
    } finally {
      setLoading(false);
    }
  };

  const fetchPrenotazioni = async (eventoId: number) => {
    try {
      const response = await fetch(`/api/eventi?section=prenotazioni&evento_id=${eventoId}`);
      if (!response.ok) return;

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
  };

  const handleToggleVisibility = async () => {
    if (!currentUser) {
      setMessage({ type: 'error', text: 'Devi essere loggato per modificare la visibilità' });
      return;
    }

    try {
      setIsToggling(true);
      
      // Cambia lo stato locale
      setIsVisible(!isVisible);
      
      // Notifica l'App component del cambio di visibilità
      if ((window as any).toggleEventiVisibility) {
        (window as any).toggleEventiVisibility();
      }
      
      setMessage({ 
        type: 'success', 
        text: `Sezione eventi ${!isVisible ? 'mostrata' : 'nascosta'} con successo!` 
      });
      
    } catch (error) {
      console.error('Errore nel toggle visibilità:', error);
      setMessage({ type: 'error', text: 'Errore durante la modifica della visibilità' });
    } finally {
      setIsToggling(false);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('it-IT', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (e) {
      return 'Data non valida';
    }
  };

  const getImageUrl = (evento: Evento) => {
    if (evento.immagine_blob) {
      return evento.immagine_blob;
    }
    return evento.immagine_url || '';
  };

  const getParticipantCount = (eventoId: number) => {
    const eventoPrenotazioni = prenotazioni[eventoId] || [];
    return eventoPrenotazioni.reduce((total, prenotazione) => {
      return total + (prenotazione.num_biglietti && !isNaN(prenotazione.num_biglietti) ? prenotazione.num_biglietti : 1);
    }, 0);
  };

  const handlePrenotaClick = (eventoId: number) => {
    // Usa la funzione di navigazione globale
    if ((window as any).navigateToPrenotaEvento) {
      (window as any).navigateToPrenotaEvento(eventoId);
    }
  };

  const canManageVisibility = currentUser && (currentUser.level === 0 || currentUser.level === 1 || currentUser.level === 2);

  // Il componente EventiSection viene sempre renderizzato se mostrato dall'App
  // La logica di visibilità è gestita nell'App component

  if (loading) {
    return (
      <section className="eventi-section" style={{ background: 'rgb(12, 73, 91)' }}>
        <div className="eventi-container">
          <h2 className="eventi-title" style={{ color: 'white' }}>🎭 Eventi in Programma</h2>
          <div className="eventi-loading">
            <div className="loading-spinner"></div>
            <p style={{ color: 'white' }}>Caricamento eventi...</p>
          </div>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="eventi-section" style={{ background: 'rgb(12, 73, 91)' }}>
        <div className="eventi-container">
          <h2 className="eventi-title" style={{ color: 'white' }}>🎭 Eventi in Programma</h2>
          <div className="eventi-error">
            <p style={{ color: 'white' }}>⚠️ {error}</p>
            <button onClick={fetchEventi} className="retry-button">
              Riprova
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="eventi-section" style={{ background: 'rgb(12, 73, 91)' }}>
      <div className="eventi-container">
        <div className="eventi-header">
          <div className="eventi-title-container">
            <h2 className="eventi-title" style={{ color: 'white' }}>
              🎭 Eventi in Programma
              {!isVisible && canManageVisibility && (
                <span className="visibility-indicator"> (Nascosta dal pubblico)</span>
              )}
            </h2>
            {canManageVisibility && (
              <button 
                className="visibility-toggle-button" 
                onClick={handleToggleVisibility}
                disabled={isToggling}
                title={isVisible ? 'Nascondi sezione dal pubblico' : 'Mostra sezione al pubblico'}
              >
                {isToggling ? (
                  <div className="button-spinner"></div>
                ) : isVisible ? (
                  <EyeOff size={16} />
                ) : (
                  <Eye size={16} />
                )}
                {isToggling ? 'Salvando...' : (isVisible ? 'Nascondi' : 'Mostra')}
              </button>
            )}
          </div>
          <p className="eventi-subtitle" style={{ color: 'rgba(255, 255, 255, 0.9)' }}>
            Scopri i nostri prossimi eventi e prenota il tuo posto
          </p>
        </div>

        {message && (
          <div className={`eventi-message ${message.type}`}>
            <span>{message.text}</span>
            <button onClick={() => setMessage(null)}>×</button>
          </div>
        )}

        {eventi.length > 0 ? (
          <div className="eventi-grid">
            {eventi.map((evento) => (
              <div key={evento.id} className="evento-card">
                {getImageUrl(evento) && (
                  <div className="evento-image">
                    <img
                      src={getImageUrl(evento)}
                      alt={`Immagine di ${evento.titolo}`}
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                      }}
                    />
                    <div className="evento-overlay">
                      <div className="partecipanti-count">
                        <Users size={16} />
                        <span>{getParticipantCount(evento.id)} prenotati</span>
                      </div>
                    </div>
                  </div>
                )}
                
                <div className="evento-content">
                  <div className="evento-info">
                    <h3 className="evento-titolo">{evento.titolo}</h3>
                    
                    <div className="evento-date">
                      <Calendar size={16} />
                      <span>{formatDate(evento.data_evento)}</span>
                    </div>

                    <p className="evento-descrizione">
                      {evento.descrizione || 'Nessuna descrizione disponibile'}
                    </p>
                  </div>

                  <div className="evento-actions">
                    <button
                      onClick={() => handlePrenotaClick(evento.id)}
                      className="prenota-button"
                    >
                      <span>Prenota ora</span>
                      <ExternalLink size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="no-eventi">
            <div className="no-eventi-icon">🎭</div>
            <h3 style={{ color: 'white' }}>Nessun evento in programma</h3>
            <p style={{ color: 'rgba(255, 255, 255, 0.9)' }}>Al momento non ci sono eventi futuri disponibili per la prenotazione.</p>
            <p style={{ color: 'rgba(255, 255, 255, 0.9)' }}>Torna a trovarci presto per scoprire i prossimi eventi!</p>
          </div>
        )}
      </div>
    </section>
  );
};

export default EventiSection;