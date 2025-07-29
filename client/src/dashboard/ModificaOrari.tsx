import React, { useState, useEffect } from 'react';
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

type WeekType = 'current' | 'next';

const GIORNI_SETTIMANA = [
  'lunedì', 'martedì', 'mercoledì', 'giovedì', 
  'venerdì', 'sabato', 'domenica'
];

const getCurrentWeek = (): string => {
  const now = new Date();
  const currentDay = now.getDay(); // 0 = domenica, 1 = lunedì, ..., 6 = sabato
  
  // Calcola quanti giorni sottrarre per arrivare a lunedì
  const daysToMonday = currentDay === 0 ? 6 : currentDay - 1;
  
  // Calcola la data del lunedì
  const monday = new Date(now);
  monday.setDate(now.getDate() - daysToMonday);
  
  // Calcola la data della domenica (lunedì + 6 giorni)
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  
  // Ottieni il nome del mese
  const monthName = monday.toLocaleDateString('it-IT', { month: 'long' });
  
  // Se lunedì e domenica sono nello stesso mese
  if (monday.getMonth() === sunday.getMonth()) {
      return `${monday.getDate()}-${sunday.getDate()} ${monthName}`;
  } else {
      // Se la settimana attraversa due mesi
      const sundayMonthName = sunday.toLocaleDateString('it-IT', { month: 'long' });
      return `${monday.getDate()} ${monthName} - ${sunday.getDate()} ${sundayMonthName}`;
  }
};

const getNextWeek = (): string => {
  const now = new Date();
  const currentDay = now.getDay();
  
  // Calcola quanti giorni sottrarre per arrivare a lunedì della settimana corrente
  const daysToMonday = currentDay === 0 ? 6 : currentDay - 1;
  
  // Calcola la data del lunedì della prossima settimana
  const nextMonday = new Date(now);
  nextMonday.setDate(now.getDate() - daysToMonday + 7);
  
  // Calcola la data della domenica della prossima settimana
  const nextSunday = new Date(nextMonday);
  nextSunday.setDate(nextMonday.getDate() + 6);
  
  // Ottieni il nome del mese
  const monthName = nextMonday.toLocaleDateString('it-IT', { month: 'long' });
  
  // Se lunedì e domenica sono nello stesso mese
  if (nextMonday.getMonth() === nextSunday.getMonth()) {
      return `${nextMonday.getDate()}-${nextSunday.getDate()} ${monthName}`;
  } else {
      // Se la settimana attraversa due mesi
      const sundayMonthName = nextSunday.toLocaleDateString('it-IT', { month: 'long' });
      return `${nextMonday.getDate()} ${monthName} - ${nextSunday.getDate()} ${sundayMonthName}`;
  }
};

const ModificaOrari: React.FC = () => {
  const [orariCorrente, setOrariCorrente] = useState<FasciaOraria[]>([]);
  const [orariProssima, setOrariProssima] = useState<FasciaOraria[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedDays, setExpandedDays] = useState<Record<string, boolean>>({});
  
  // Stato per le nuove fasce da aggiungere per ogni giorno e settimana
  const [nuoveFasce, setNuoveFasce] = useState<Record<string, Record<WeekType, NuovaFascia[]>>>({});
  
  // Stato per editing inline
  const [editingId, setEditingId] = useState<{id: number, week: WeekType} | null>(null);
  const [editData, setEditData] = useState<Partial<FasciaOraria>>({});

  // Inizializza tutti i giorni come aperti
  useEffect(() => {
    const initialExpanded = GIORNI_SETTIMANA.reduce((acc, giorno) => {
      acc[giorno] = true;
      return acc;
    }, {} as Record<string, boolean>);
    setExpandedDays(initialExpanded);
  }, []);

  // Carica gli orari all'avvio
  useEffect(() => {
    fetchAllOrari();
  }, []);

  const fetchAllOrari = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch orari settimana corrente
      const responseCorrente = await fetch('/api/orari_settimana', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      // Fetch orari prossima settimana
      const responseProssima = await fetch('/api/orari_prossima_settimana', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!responseCorrente.ok || !responseProssima.ok) {
        throw new Error('Errore nel caricamento degli orari');
      }
      
      const dataCorrente: ApiResponse = await responseCorrente.json();
      const dataProssima: ApiResponse = await responseProssima.json();
      
      if (dataCorrente.success && dataCorrente.data) {
        setOrariCorrente(dataCorrente.data);
      }
      
      if (dataProssima.success && dataProssima.data) {
        setOrariProssima(dataProssima.data);
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

  const aggiungiNuovaFascia = (giorno: string, week: WeekType) => {
    setNuoveFasce(prev => ({
      ...prev,
      [giorno]: {
        ...prev[giorno],
        [week]: [
          ...(prev[giorno]?.[week] || []),
          { ora_inizio: '09:00', ora_fine: '19:30', note: '' }
        ]
      }
    }));
  };

  const rimuoviNuovaFascia = (giorno: string, week: WeekType, index: number) => {
    setNuoveFasce(prev => ({
      ...prev,
      [giorno]: {
        ...prev[giorno],
        [week]: prev[giorno]?.[week]?.filter((_, i) => i !== index) || []
      }
    }));
  };

  const aggiornaNuovaFascia = (giorno: string, week: WeekType, index: number, field: keyof NuovaFascia, value: string) => {
    setNuoveFasce(prev => ({
      ...prev,
      [giorno]: {
        ...prev[giorno],
        [week]: prev[giorno]?.[week]?.map((fascia, i) => 
          i === index ? { ...fascia, [field]: value } : fascia
        ) || []
      }
    }));
  };

  const salvaFascia = async (giorno: string, fascia: NuovaFascia, week: WeekType) => {
    if (!fascia.ora_inizio || !fascia.ora_fine) {
      setError('Ora inizio e ora fine sono obbligatorie');
      return false;
    }

    try {
      const endpoint = week === 'current' ? '/api/orari_settimana' : '/api/orari_prossima_settimana';
      const response = await fetch(endpoint, {
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

  const salvaTuttiGliOrari = async () => {
    setLoading(true);
    setError(null);
    let tutteOk = true;

    // Salva tutte le nuove fasce per entrambe le settimane
    for (const giorno of GIORNI_SETTIMANA) {
      const fasceCorrente = nuoveFasce[giorno]?.current || [];
      const fasceProssima = nuoveFasce[giorno]?.next || [];

      // Salva fasce settimana corrente
      for (const fascia of fasceCorrente) {
        const risultato = await salvaFascia(giorno, fascia, 'current');
        if (!risultato) {
          tutteOk = false;
          break;
        }
      }

      if (!tutteOk) break;

      // Salva fasce prossima settimana
      for (const fascia of fasceProssima) {
        const risultato = await salvaFascia(giorno, fascia, 'next');
        if (!risultato) {
          tutteOk = false;
          break;
        }
      }

      if (!tutteOk) break;
    }

    if (tutteOk) {
      // Rimuovi tutte le fasce salvate
      setNuoveFasce({});
      await fetchAllOrari(); // Ricarica tutti gli orari
      setError(null);
    }

    setLoading(false);
  };

  const eliminaFascia = async (id: number, week: WeekType) => {
    if (!confirm('Sei sicuro di voler eliminare questa fascia oraria?')) {
      return;
    }

    try {
      const endpoint = week === 'current' ? '/api/orari_settimana' : '/api/orari_prossima_settimana';
      const response = await fetch(endpoint, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id }),
      });

      const data = await response.json();
      
      if (data.success) {
        await fetchAllOrari();
        setError(null);
      } else {
        throw new Error(data.error || 'Errore nell\'eliminazione');
      }
    } catch (err) {
      console.error('Delete error:', err);
      setError(err instanceof Error ? err.message : 'Errore di connessione');
    }
  };

  const iniziaModifica = (fascia: FasciaOraria, week: WeekType) => {
    setEditingId({id: fascia.id, week});
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
      const endpoint = editingId.week === 'current' ? '/api/orari_settimana' : '/api/orari_prossima_settimana';
      const response = await fetch(endpoint, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: editingId.id,
          ora_inizio: editData.ora_inizio,
          ora_fine: editData.ora_fine,
          note: editData.note || null
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        await fetchAllOrari();
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
    setExpandedDays(prev => ({
      ...prev,
      [giorno]: !prev[giorno]
    }));
  };

  const renderWeekSection = (title: string, orari: FasciaOraria[], week: WeekType, className: string) => {
    const orariGruppi = groupByDay(orari);
    
    return (
      <div className={className}>
        <h2 className="week-title">{title}</h2>
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
                      aggiungiNuovaFascia(giorno, week);
                    }}
                    className="btn btn-add"
                    title="Aggiungi fascia oraria"
                  >
                    + Aggiungi
                  </button>
                  <span className={`expand-icon ${expandedDays[giorno] ? 'expanded' : ''}`}>
                    ▼
                  </span>
                </div>
              </div>
              
              {expandedDays[giorno] && (
                <div className="day-content">
                  {/* Orari esistenti */}
                  {orariGruppi[giorno].length > 0 && (
                    <div className="existing-orari">
                      <h4>Orari attuali:</h4>
                      {orariGruppi[giorno].map(orario => (
                        <div key={orario.id} className="orario-item">
                          {editingId?.id === orario.id && editingId.week === week ? (
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
                                  onClick={() => iniziaModifica(orario, week)}
                                  className="btn btn-edit btn-small"
                                  title="Modifica"
                                >
                                  ✏️
                                </button>
                                <button
                                  onClick={() => eliminaFascia(orario.id, week)}
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
                  {nuoveFasce[giorno]?.[week]?.length > 0 && (
                    <div className="new-fasce">
                      <h4>Nuove fasce da aggiungere:</h4>
                      {nuoveFasce[giorno][week].map((fascia, index) => (
                        <div key={index} className="new-fascia-form">
                          <input
                            type="time"
                            value={fascia.ora_inizio}
                            onChange={(e) => aggiornaNuovaFascia(giorno, week, index, 'ora_inizio', e.target.value)}
                            placeholder="Inizio"
                          />
                          <span>-</span>
                          <input
                            type="time"
                            value={fascia.ora_fine}
                            onChange={(e) => aggiornaNuovaFascia(giorno, week, index, 'ora_fine', e.target.value)}
                            placeholder="Fine"
                          />
                          <input
                            type="text"
                            value={fascia.note}
                            onChange={(e) => aggiornaNuovaFascia(giorno, week, index, 'note', e.target.value)}
                            placeholder="Note (opzionale)"
                          />
                          <button
                            onClick={() => rimuoviNuovaFascia(giorno, week, index)}
                            className="btn btn-delete btn-small"
                            title="Rimuovi"
                          >
                            ✗
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {orariGruppi[giorno].length === 0 && (!nuoveFasce[giorno]?.[week] || nuoveFasce[giorno][week].length === 0) && (
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
  };

  // Verifica se ci sono modifiche da salvare
  const hasPendingChanges = () => {
    return Object.values(nuoveFasce).some(dayFasce => 
      (dayFasce.current && dayFasce.current.length > 0) || 
      (dayFasce.next && dayFasce.next.length > 0)
    );
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

  return (
    <div className="modifica-orari-container">
      <div className="modifica-orari-header">
        <h1>Gestione Orari Settimanali</h1>
        <div className="header-actions">
          {hasPendingChanges() && (
            <button 
              onClick={salvaTuttiGliOrari} 
              className="btn btn-success btn-large"
              disabled={loading}
            >
              💾 Salva Tutti gli Orari
            </button>
          )}
          <button onClick={fetchAllOrari} className="btn btn-refresh" disabled={loading}>
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

      <div className="weeks-container">
        {renderWeekSection(
          `Settimana Corrente (${getCurrentWeek()})`, 
          orariCorrente, 
          'current',
          'week-section current-week'
        )}
        
        {renderWeekSection(
          `Prossima Settimana (${getNextWeek()})`, 
          orariProssima, 
          'next',
          'week-section next-week'
        )}
      </div>

      {/* Bottone di salvataggio in fondo */}
      {hasPendingChanges() && (
        <div className="bottom-save-section">
          <button 
            onClick={salvaTuttiGliOrari} 
            className="btn btn-success btn-large btn-bottom-save"
            disabled={loading}
          >
            💾 Salva Tutti gli Orari
          </button>
        </div>
      )}
    </div>
  );
};

export default ModificaOrari;