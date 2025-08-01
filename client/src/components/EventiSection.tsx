import React, { useState, useEffect } from 'react';
import { Calendar, Users, ExternalLink } from 'lucide-react';
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

const EventiSection: React.FC = () => {
  const [eventi, setEventi] = useState<Evento[]>([]);
  const [prenotazioni, setPrenotazioni] = useState<Record<number, Prenotazione[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchEventi();
  }, []);

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

  if (loading) {
    return (
      <section className="eventi-section">
        <div className="eventi-container">
          <h2 className="eventi-title">🎭 Eventi in Programma</h2>
          <div className="eventi-loading">
            <div className="loading-spinner"></div>
            <p>Caricamento eventi...</p>
          </div>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="eventi-section">
        <div className="eventi-container">
          <h2 className="eventi-title">🎭 Eventi in Programma</h2>
          <div className="eventi-error">
            <p>⚠️ {error}</p>
            <button onClick={fetchEventi} className="retry-button">
              Riprova
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="eventi-section">
      <div className="eventi-container">
        <div className="eventi-header">
          <h2 className="eventi-title">🎭 Eventi in Programma</h2>
          <p className="eventi-subtitle">
            Scopri i nostri prossimi eventi e prenota il tuo posto
          </p>
        </div>

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
            <h3>Nessun evento in programma</h3>
            <p>Al momento non ci sono eventi futuri disponibili per la prenotazione.</p>
            <p>Torna a trovarci presto per scoprire i prossimi eventi!</p>
          </div>
        )}
      </div>
    </section>
  );
};

export default EventiSection;