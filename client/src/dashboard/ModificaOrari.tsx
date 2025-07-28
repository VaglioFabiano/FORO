import  { useState, useEffect } from 'react';
import '../style/modificaOrari.css';

interface FasciaOraria {
  id: number;
  giorno: string;
  ora_inizio: string;
  ora_fine: string;
  note?: string;
}

interface NuovaFascia {
  ora_inizio: string;
  ora_fine: string;
  note: string;
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
  const [expandedDay, setExpandedDay] = useState<string | null>(null);
  
  // Stato per le nuove fasce da aggiungere per ogni giorno
  const [nuoveFasce, setNuoveFasce] = useState<Record<string, NuovaFascia[]>>({});
  
  // Stato per editing inline
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editData, setEditData] = useState<Partial<FasciaOraria>>({});

  // Carica gli orari all'avvio
  useEffect(() => {
    fetchOrari();
  }, []);

  const fetchOrari = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/orari', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data: ApiResponse = await response.json();
      
      if (data.success && data.data) {
        setOrari(data.data);
        console.log('Orari caricati:', data.data);
      } else {
        throw new Error(data.error || 'Errore nel caricamento degli orari');
      }
    } catch (err) {
      console.error('Fetch error:', err);
      setError(err instanceof Error ? err.message : 'Errore di connessione');
    } finally {
      setLoading(false);
    }
  };

  const groupByDay = (orari: FasciaOraria[]) => {
    return GIORNI_SETTIMANA.reduce((acc, giorno) => {
      acc[giorno] = orari.filter(o => o.giorno === giorno).sort((a, b) => a.ora_inizio.localeCompare(b.ora_inizio));
      return acc;
    }, {} as Record<string, FasciaOraria[]>);
  };

  const aggiungiNuovaFascia = (giorno: string) => {
    setNuoveFasce(prev => ({
      ...prev,
      [giorno]: [
        ...(prev[giorno] || []),
        { ora_inizio: '', ora_fine: '', note: '' }
      ]
    }));
  };

  const rimuoviNuovaFascia = (giorno: string, index: number) => {
    setNuoveFasce(prev => ({
      ...prev,
      [giorno]: prev[giorno]?.filter((_, i) => i !== index) || []
    }));
  };

  const aggiornaNuovaFascia = (giorno: string, index: number, field: keyof NuovaFascia, value: string) => {
    setNuoveFasce(prev => ({
      ...prev,
      [giorno]: prev[giorno]?.map((fascia, i) => 
        i === index ? { ...fascia, [field]: value } : fascia
      ) || []
    }));
  };

  const salvaFascia = async (giorno: string, fascia: NuovaFascia) => {
    if (!fascia.ora_inizio || !fascia.ora_fine) {
      setError('Ora inizio e ora fine sono obbligatorie');
      return false;
    }

    try {
      const response = await fetch('/api/orari', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          giorno,
          ora_inizio: fascia.ora_inizio,
          ora_fine: fascia.ora_fine,
          note: fascia.note || null
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        await fetchOrari(); // Ricarica tutti gli orari
        return true;
      } else {
        throw new Error(data.error || 'Errore nel salvataggio');
      }
    } catch (err) {
      console.error('Save error:', err);
      setError(err instanceof Error ? err.message : 'Errore di connessione');
      return false;
    }
  };

  const salvaFasceGiorno = async (giorno: string) => {
    const fasce = nuoveFasce[giorno] || [];
    let tutteOk = true;

    for (const fascia of fasce) {
      const risultato = await salvaFascia(giorno, fascia);
      if (!risultato) {
        tutteOk = false;
        break;
      }
    }

    if (tutteOk) {
      // Rimuovi le fasce salvate
      setNuoveFasce(prev => ({
        ...prev,
        [giorno]: []
      }));
      setError(null);
    }
  };

  const eliminaFascia = async (id: number) => {
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
        await fetchOrari();
        setError(null);
      } else {
        throw new Error(data.error || 'Errore nell\'eliminazione');
      }
    } catch (err) {
      console.error('Delete error:', err);
      setError(err instanceof Error ? err.message : 'Errore di connessione');
    }
  };

  const iniziaModifica = (fascia: FasciaOraria) => {
    setEditingId(fascia.id);
    setEditData({
      ora_inizio: fascia.ora_inizio,
      ora_fine: fascia.ora_fine,
      note: fascia.note || ''
    });
  };

  const annullaModifica = () => {
    setEditingId(null);
    setEditData({});
  };

  const salvaModifica = async () => {
    if (!editingId || !editData.ora_inizio || !editData.ora_fine) {
      setError('Ora inizio e ora fine sono obbligatorie');
      return;
    }

    try {
      const response = await fetch('/api/orari', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: editingId,
          ora_inizio: editData.ora_inizio,
          ora_fine: editData.ora_fine,
          note: editData.note || null
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        await fetchOrari();
        setEditingId(null);
        setEditData({});
        setError(null);
      } else {
        throw new Error(data.error || 'Errore nell\'aggiornamento');
      }
    } catch (err) {
      console.error('Update error:', err);
      setError(err instanceof Error ? err.message : 'Errore di connessione');
    }
  };

  const formatTime = (time: string) => {
    if (time.includes(':')) return time;
    const hours = Math.floor(parseFloat(time));
    const minutes = Math.round((parseFloat(time) - hours) * 60);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  };

  const toggleDay = (giorno: string) => {
    setExpandedDay(expandedDay === giorno ? null : giorno);
  };

  if (loading) {
    return (
      <div className="modifica-orari-container">
        <div className="loading">
          <div className="loading-spinner"></div>
          <span>Caricamento orari...</span>
        </div>
      </div>
    );
  }

  const orariGruppi = groupByDay(orari);

  return (
    <div className="modifica-orari-container">
      <div className="modifica-orari-header">
        <h1>Gestione Orari Settimanali</h1>
        <button onClick={fetchOrari} className="btn btn-refresh" disabled={loading}>
          🔄 Ricarica
        </button>
      </div>

      {error && (
        <div className="error-message">
          {error}
          <button onClick={() => setError(null)} className="close-error">×</button>
        </div>
      )}

      <div className="orari-list">
        {GIORNI_SETTIMANA.map(giorno => (
          <div key={giorno} className="day-section">
            <div 
              className="day-header" 
              onClick={() => toggleDay(giorno)}
            >
              <h3 className="day-title">
                {giorno.charAt(0).toUpperCase() + giorno.slice(1)}
                <span className="orari-count">({orariGruppi[giorno].length})</span>
              </h3>
              <div className="day-actions">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    aggiungiNuovaFascia(giorno);
                    setExpandedDay(giorno);
                  }}
                  className="btn btn-add"
                  title="Aggiungi fascia oraria"
                >
                  + Aggiungi
                </button>
                <span className={`expand-icon ${expandedDay === giorno ? 'expanded' : ''}`}>
                  ▼
                </span>
              </div>
            </div>
            
            {expandedDay === giorno && (
              <div className="day-content">
                {/* Orari esistenti */}
                {orariGruppi[giorno].length > 0 && (
                  <div className="existing-orari">
                    <h4>Orari attuali:</h4>
                    {orariGruppi[giorno].map(orario => (
                      <div key={orario.id} className="orario-item">
                        {editingId === orario.id ? (
                          <div className="edit-form">
                            <input
                              type="time"
                              value={editData.ora_inizio || ''}
                              onChange={(e) => setEditData(prev => ({ ...prev, ora_inizio: e.target.value }))}
                            />
                            <span>-</span>
                            <input
                              type="time"
                              value={editData.ora_fine || ''}
                              onChange={(e) => setEditData(prev => ({ ...prev, ora_fine: e.target.value }))}
                            />
                            <input
                              type="text"
                              placeholder="Note"
                              value={editData.note || ''}
                              onChange={(e) => setEditData(prev => ({ ...prev, note: e.target.value }))}
                            />
                            <button onClick={salvaModifica} className="btn btn-success btn-small">✓</button>
                            <button onClick={annullaModifica} className="btn btn-secondary btn-small">✗</button>
                          </div>
                        ) : (
                          <div className="orario-display">
                            <div className="orario-time">
                              <span className="time-badge">{formatTime(orario.ora_inizio)}</span>
                              <span>-</span>
                              <span className="time-badge">{formatTime(orario.ora_fine)}</span>
                            </div>
                            {orario.note && <div className="orario-note">{orario.note}</div>}
                            <div className="orario-actions">
                              <button
                                onClick={() => iniziaModifica(orario)}
                                className="btn btn-edit btn-small"
                                title="Modifica"
                              >
                                ✏️
                              </button>
                              <button
                                onClick={() => eliminaFascia(orario.id)}
                                className="btn btn-delete btn-small"
                                title="Elimina"
                              >
                                🗑️
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Nuove fasce da aggiungere */}
                {nuoveFasce[giorno]?.length > 0 && (
                  <div className="new-fasce">
                    <h4>Nuove fasce da aggiungere:</h4>
                    {nuoveFasce[giorno].map((fascia, index) => (
                      <div key={index} className="new-fascia-form">
                        <input
                          type="time"
                          value={fascia.ora_inizio}
                          onChange={(e) => aggiornaNuovaFascia(giorno, index, 'ora_inizio', e.target.value)}
                          placeholder="Inizio"
                        />
                        <span>-</span>
                        <input
                          type="time"
                          value={fascia.ora_fine}
                          onChange={(e) => aggiornaNuovaFascia(giorno, index, 'ora_fine', e.target.value)}
                          placeholder="Fine"
                        />
                        <input
                          type="text"
                          value={fascia.note}
                          onChange={(e) => aggiornaNuovaFascia(giorno, index, 'note', e.target.value)}
                          placeholder="Note (opzionale)"
                        />
                        <button
                          onClick={() => rimuoviNuovaFascia(giorno, index)}
                          className="btn btn-delete btn-small"
                          title="Rimuovi"
                        >
                          ✗
                        </button>
                      </div>
                    ))}
                    <div className="save-actions">
                      <button
                        onClick={() => salvaFasceGiorno(giorno)}
                        className="btn btn-success"
                      >
                        💾 Salva tutte le fasce
                      </button>
                    </div>
                  </div>
                )}

                {orariGruppi[giorno].length === 0 && (!nuoveFasce[giorno] || nuoveFasce[giorno].length === 0) && (
                  <div className="no-orari">
                    Nessun orario impostato per questo giorno
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}