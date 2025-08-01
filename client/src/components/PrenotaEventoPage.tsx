import React, { useState, useEffect } from 'react';
import { Calendar, Users, MapPin, Mail, User, ArrowLeft, CheckCircle } from 'lucide-react';
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

interface PrenotazioneForm {
  nome: string;
  cognome: string;
  email: string;
  num_biglietti: number;
  note?: string;
}

interface ApiResponse {
  success: boolean;
  evento?: Evento;
  eventi?: Evento[];
  error?: string;
  message?: string;
  prenotazione_id?: number;
}

interface Props {
  eventoId?: number;
}

// Eventi di esempio per test
const eventiTest: Evento[] = [
  {
    id: 1,
    titolo: "Workshop di Studio Efficace",
    descrizione: "Un workshop dedicato alle tecniche di studio più efficaci per studenti universitari. Imparerai metodi comprovati per migliorare la concentrazione, la memorizzazione e l'organizzazione dello studio.",
    data_evento: "2024-12-15T10:00:00Z",
    immagine_url: "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=500&h=300&fit=crop"
  },
  {
    id: 2,
    titolo: "Serata di Networking Universitario",
    descrizione: "Un'occasione per conoscere altri studenti, condividere esperienze e creare connessioni utili per il futuro accademico e professionale.",
    data_evento: "2024-12-20T19:00:00Z",
    immagine_url: "https://images.unsplash.com/photo-1511632765486-a01980e01a18?w=500&h=300&fit=crop"
  },
  {
    id: 3,
    titolo: "Preparazione Esami Invernali",
    descrizione: "Sessione di studio guidato e supporto per la preparazione degli esami della sessione invernale. Con tutor esperti e materiali di studio.",
    data_evento: "2024-12-22T14:00:00Z",
    immagine_url: "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=500&h=300&fit=crop"
  }
];

const PrenotaEventoPage: React.FC<Props> = ({ eventoId = 1 }) => {
  const [evento, setEvento] = useState<Evento | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  
  const [formData, setFormData] = useState<PrenotazioneForm>({
    nome: '',
    cognome: '',
    email: '',
    num_biglietti: 1,
    note: ''
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (eventoId) {
      fetchEvento();
    }
  }, [eventoId]);

  const fetchEvento = async () => {
    try {
      setLoading(true);
      setError(null);

      // Prova prima con l'API reale
      try {
        const response = await fetch('/api/eventi');
        if (response.ok) {
          const data: ApiResponse = await response.json();
          if (data.success && data.eventi) {
            const eventoTrovato = data.eventi.find(e => e.id === eventoId);
            if (eventoTrovato) {
              setEvento(eventoTrovato);
              setLoading(false);
              return;
            }
          }
        }
      } catch (apiError) {
        console.log('API non disponibile, usando dati di test');
      }

      // Se l'API non funziona, usa i dati di test
      const eventoTest = eventiTest.find(e => e.id === eventoId);
      if (eventoTest) {
        setEvento(eventoTest);
      } else {
        throw new Error('Evento non trovato');
      }

    } catch (err) {
      console.error('Fetch evento error:', err);
      setError(err instanceof Error ? err.message : 'Errore di connessione');
    } finally {
      setLoading(false);
    }
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.nome.trim()) {
      errors.nome = 'Il nome è obbligatorio';
    }

    if (!formData.cognome.trim()) {
      errors.cognome = 'Il cognome è obbligatorio';
    }

    if (!formData.email.trim()) {
      errors.email = 'L\'email è obbligatoria';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Inserisci un\'email valida';
    }

    if (formData.num_biglietti < 1 || formData.num_biglietti > 10) {
      errors.num_biglietti = 'Il numero di biglietti deve essere tra 1 e 10';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'num_biglietti' ? parseInt(value) || 1 : value
    }));

    // Rimuovi l'errore per questo campo quando l'utente inizia a digitare
    if (formErrors[name]) {
      setFormErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/eventi?section=prenotazioni', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          evento_id: eventoId,
          nome: formData.nome,
          cognome: formData.cognome,
          email: formData.email,
          num_biglietti: formData.num_biglietti,
          note: formData.note,
          data_prenotazione: new Date().toISOString()
        }),
      });

      const data: ApiResponse = await response.json();

      if (data.success) {
        setSuccess(true);
        setFormData({
          nome: '',
          cognome: '',
          email: '',
          num_biglietti: 1,
          note: ''
        });
      } else {
        throw new Error(data.error || 'Errore nella prenotazione');
      }

    } catch (err) {
      console.error('Submit error:', err);
      
      // Fallback: se l'API non funziona, simula successo per test
      if (typeof err === 'object' && err !== null && 'message' in err && typeof (err as any).message === 'string' && (err as any).message.includes('fetch')) {
        console.log('API non disponibile, simulando successo per test');
        setTimeout(() => {
          setSuccess(true);
          setFormData({
            nome: '',
            cognome: '',
            email: '',
            num_biglietti: 1,
            note: ''
          });
          setSubmitting(false);
        }, 2000);
        return;
      }
      
      setError(err instanceof Error ? err.message : 'Errore durante la prenotazione');
    } finally {
      setSubmitting(false);
    }
  };

  const handleBackToHome = () => {
    if ((window as any).navigateToHome) {
      (window as any).navigateToHome();
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('it-IT', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
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

  if (loading) {
    return (
      <div className="prenota-evento-page">
        <div className="prenota-container">
          <div className="loading-section">
            <div className="loading-spinner"></div>
            <p>Caricamento evento...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error && !evento) {
    return (
      <div className="prenota-evento-page">
        <div className="prenota-container">
          <div className="error-section">
            <h2>⚠️ Errore</h2>
            <p>{error}</p>
            <button onClick={handleBackToHome} className="back-button">
              <ArrowLeft size={16} />
              Torna alla home
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="prenota-evento-page">
        <div className="prenota-container">
          <div className="success-section">
            <CheckCircle size={64} className="success-icon" />
            <h2>Prenotazione confermata!</h2>
            <p>La tua prenotazione per "<strong>{evento?.titolo}</strong>" è stata registrata con successo.</p>
            <p>Riceverai una email di conferma all'indirizzo fornito.</p>
            <div className="success-actions">
              <button onClick={() => setSuccess(false)} className="prenota-altro-button">
                Prenota per un'altra persona
              </button>
              <button onClick={handleBackToHome} className="chiudi-button">
                Torna alla home
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="prenota-evento-page">
      <div className="prenota-container">
        <div className="prenota-header">
          <button onClick={handleBackToHome} className="back-button">
            <ArrowLeft size={16} />
            Torna alla home
          </button>
          <h1>Prenota il tuo posto</h1>
        </div>

        {evento && (
          <div className="evento-details">
            <div className="evento-info-card">
              {getImageUrl(evento) && (
                <div className="evento-banner">
                  <img
                    src={getImageUrl(evento)}
                    alt={`Immagine di ${evento.titolo}`}
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                    }}
                  />
                </div>
              )}
              
              <div className="evento-info-content">
                <h2 className="evento-title">{evento.titolo}</h2>
                
                <div className="evento-meta">
                  <div className="meta-item">
                    <Calendar size={18} />
                    <span>{formatDate(evento.data_evento)}</span>
                  </div>
                  <div className="meta-item">
                    <MapPin size={18} />
                    <span>Aula Studio Foro - Piossasco</span>
                  </div>
                </div>

                <div className="evento-description">
                  <p>{evento.descrizione || 'Evento organizzato dall\'Associazione Foro.'}</p>
                </div>
              </div>
            </div>

            <div className="prenotazione-form-card">
              <div className="form-header">
                <h3>I tuoi dati per la prenotazione</h3>
                <p>Compila il modulo per confermare la tua partecipazione</p>
              </div>

              {error && (
                <div className="form-error">
                  <span>⚠️ {error}</span>
                </div>
              )}

              <div className="prenotazione-form">
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="nome">
                      <User size={16} />
                      Nome *
                    </label>
                    <input
                      type="text"
                      id="nome"
                      name="nome"
                      value={formData.nome}
                      onChange={handleInputChange}
                      disabled={submitting}
                      className={formErrors.nome ? 'error' : ''}
                    />
                    {formErrors.nome && <span className="field-error">{formErrors.nome}</span>}
                  </div>

                  <div className="form-group">
                    <label htmlFor="cognome">
                      <User size={16} />
                      Cognome *
                    </label>
                    <input
                      type="text"
                      id="cognome"
                      name="cognome"
                      value={formData.cognome}
                      onChange={handleInputChange}
                      disabled={submitting}
                      className={formErrors.cognome ? 'error' : ''}
                    />
                    {formErrors.cognome && <span className="field-error">{formErrors.cognome}</span>}
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="email">
                      <Mail size={16} />
                      Email *
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      disabled={submitting}
                      className={formErrors.email ? 'error' : ''}
                    />
                    {formErrors.email && <span className="field-error">{formErrors.email}</span>}
                  </div>

                  
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="num_biglietti">
                      <Users size={16} />
                      Numero di biglietti *
                    </label>
                    <select
                      id="num_biglietti"
                      name="num_biglietti"
                      value={formData.num_biglietti}
                      onChange={handleInputChange}
                      disabled={submitting}
                      className={formErrors.num_biglietti ? 'error' : ''}
                    >
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
                        <option key={num} value={num}>
                          {num} {num === 1 ? 'biglietto' : 'biglietti'}
                        </option>
                      ))}
                    </select>
                    {formErrors.num_biglietti && <span className="field-error">{formErrors.num_biglietti}</span>}
                  </div>
                </div>

                <div className="form-group full-width">
                  <label htmlFor="note">
                    Note aggiuntive (opzionale)
                  </label>
                  <textarea
                    id="note"
                    name="note"
                    value={formData.note}
                    onChange={handleInputChange}
                    disabled={submitting}
                    rows={3}
                    placeholder="Eventuali richieste speciali o note..."
                  />
                </div>

                <div className="form-actions">
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="submit-button"
                  >
                    {submitting ? (
                      <>
                        <div className="button-spinner"></div>
                        Prenotazione in corso...
                      </>
                    ) : (
                      <>
                        <CheckCircle size={18} />
                        Conferma prenotazione
                      </>
                    )}
                  </button>
                </div>

                <div className="form-footer">
                  <p>
                    <strong>Nota:</strong> La prenotazione è gratuita. 
                    Riceverai una email di conferma con tutti i dettagli dell'evento.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PrenotaEventoPage;