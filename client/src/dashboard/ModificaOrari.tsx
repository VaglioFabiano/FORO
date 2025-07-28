import React, { useState, useEffect } from 'react';
import '../style/modificaOrari.css';

interface FasciaOraria {
  id: number;
  giorno: string;
  ora_inizio: string;
  ora_fine: string;
  note?: string;
}

interface ApiResponse {
  success: boolean;
  data?: FasciaOraria[];
  error?: string;
}

const GIORNI_SETTIMANA = [
  'lunedì', 'martedì', 'mercoledì', 'giovedì', 
  'venerdì', 'sabato', 'domenica'
];

export default function ModificaOrari() {
  const [orari, setOrari] = useState<FasciaOraria[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    giorno: '',
    ora_inizio: '',
    ora_fine: '',
    note: ''
  });

  // Carica gli orari all'avvio
  useEffect(() => {
    fetchOrari();
  }, []);

  const fetchOrari = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/orari');
      const data: ApiResponse = await response.json();
      
      if (data.success && data.data) {
        setOrari(data.data);
      } else {
        setError('Errore nel caricamento degli orari');
      }
    } catch (err) {
      setError('Errore di connessione');
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const resetForm = () => {
    setFormData({
      giorno: '',
      ora_inizio: '',
      ora_fine: '',
      note: ''
    });
    setEditingId(null);
    setShowAddForm(false);
  };

  const handleAddOrario = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.giorno || !formData.ora_inizio || !formData.ora_fine) {
      setError('Giorno, ora inizio e ora fine sono richiesti');
      return;
    }

    try {
      const response = await fetch('/api/orari', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      
      if (data.success) {
        await fetchOrari(); // Ricarica la lista
        resetForm();
        setError(null);
      } else {
        setError(data.error || 'Errore nell\'aggiunta');
      }
    } catch (err) {
      setError('Errore di connessione');
      console.error('Add error:', err);
    }
  };

  const handleEditOrario = (orario: FasciaOraria) => {
    setFormData({
      giorno: orario.giorno,
      ora_inizio: orario.ora_inizio,
      ora_fine: orario.ora_fine,
      note: orario.note || ''
    });
    setEditingId(orario.id);
    setShowAddForm(false);
  };

  const handleUpdateOrario = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editingId) return;

    try {
      const response = await fetch('/api/orari', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: editingId,
          ...formData
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        await fetchOrari(); // Ricarica la lista
        resetForm();
        setError(null);
      } else {
        setError(data.error || 'Errore nell\'aggiornamento');
      }
    } catch (err) {
      setError('Errore di connessione');
      console.error('Update error:', err);
    }
  };

  const handleDeleteOrario = async (id: number) => {
    if (!confirm('Sei sicuro di voler eliminare questa fascia oraria?')) {
      return;
    }

    try {
      const response = await fetch('/api/orari', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id }),
      });

      const data = await response.json();
      
      if (data.success) {
        await fetchOrari(); // Ricarica la lista
        setError(null);
      } else {
        setError(data.error || 'Errore nell\'eliminazione');
      }
    } catch (err) {
      setError('Errore di connessione');
      console.error('Delete error:', err);
    }
  };

  const formatTime = (time: string) => {
    // Converte il formato numerico in HH:MM se necessario
    if (time.includes(':')) return time;
    const hours = Math.floor(parseFloat(time));
    const minutes = Math.round((parseFloat(time) - hours) * 60);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  };

  const groupByDay = (orari: FasciaOraria[]) => {
    return GIORNI_SETTIMANA.reduce((acc, giorno) => {
      acc[giorno] = orari.filter(o => o.giorno === giorno);
      return acc;
    }, {} as Record<string, FasciaOraria[]>);
  };

  if (loading) {
    return <div className="loading">Caricamento orari...</div>;
  }

  const orariGruppi = groupByDay(orari);

  return (
    <div className="modifica-orari-container">
      <div className="header">
        <h1>Modifica Orari Settimanali</h1>
        <button 
          className="btn btn-primary"
          onClick={() => setShowAddForm(!showAddForm)}
        >
          {showAddForm ? 'Annulla' : 'Aggiungi Orario'}
        </button>
      </div>

      {error && (
        <div className="error-message">
          {error}
          <button onClick={() => setError(null)} className="close-error">×</button>
        </div>
      )}

      {/* Form per aggiungere/modificare */}
      {(showAddForm || editingId) && (
        <div className="form-container">
          <h3>{editingId ? 'Modifica Orario' : 'Nuovo Orario'}</h3>
          <form onSubmit={editingId ? handleUpdateOrario : handleAddOrario}>
            <div className="form-group">
              <label htmlFor="giorno">Giorno:</label>
              <select
                id="giorno"
                name="giorno"
                value={formData.giorno}
                onChange={handleInputChange}
                required
              >
                <option value="">Seleziona giorno</option>
                {GIORNI_SETTIMANA.map(giorno => (
                  <option key={giorno} value={giorno}>
                    {giorno.charAt(0).toUpperCase() + giorno.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="ora_inizio">Ora Inizio:</label>
                <input
                  type="time"
                  id="ora_inizio"
                  name="ora_inizio"
                  value={formData.ora_inizio}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="ora_fine">Ora Fine:</label>
                <input
                  type="time"
                  id="ora_fine"
                  name="ora_fine"
                  value={formData.ora_fine}
                  onChange={handleInputChange}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="note">Note (opzionale):</label>
              <textarea
                id="note"
                name="note"
                value={formData.note}
                onChange={handleInputChange}
                rows={3}
                placeholder="Inserisci eventuali note..."
              />
            </div>

            <div className="form-actions">
              <button type="submit" className="btn btn-success">
                {editingId ? 'Aggiorna' : 'Aggiungi'}
              </button>
              <button type="button" onClick={resetForm} className="btn btn-secondary">
                Annulla
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Lista orari raggruppati per giorno */}
      <div className="orari-list">
        {GIORNI_SETTIMANA.map(giorno => (
          <div key={giorno} className="day-section">
            <h3 className="day-title">
              {giorno.charAt(0).toUpperCase() + giorno.slice(1)}
            </h3>
            
            {orariGruppi[giorno].length === 0 ? (
              <div className="no-orari">Nessun orario impostato</div>
            ) : (
              <div className="orari-cards">
                {orariGruppi[giorno].map(orario => (
                  <div key={orario.id} className="orario-card">
                    <div className="orario-time">
                      <span className="time-start">{formatTime(orario.ora_inizio)}</span>
                      <span className="time-separator">-</span>
                      <span className="time-end">{formatTime(orario.ora_fine)}</span>
                    </div>
                    
                    {orario.note && (
                      <div className="orario-note">{orario.note}</div>
                    )}
                    
                    <div className="orario-actions">
                      <button
                        onClick={() => handleEditOrario(orario)}
                        className="btn btn-edit"
                        title="Modifica"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => handleDeleteOrario(orario.id)}
                        className="btn btn-delete"
                        title="Elimina"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}