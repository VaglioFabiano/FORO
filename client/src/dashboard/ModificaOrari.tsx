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
  const currentDay = now.getDay();
  const daysToMonday = currentDay === 0 ? 6 : currentDay - 1;
  const monday = new Date(now);
  monday.setDate(now.getDate() - daysToMonday);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const monthName = monday.toLocaleDateString('it-IT', { month: 'long' });
  
  if (monday.getMonth() === sunday.getMonth()) {
    return `${monday.getDate()}-${sunday.getDate()} ${monthName}`;
  } else {
    const sundayMonthName = sunday.toLocaleDateString('it-IT', { month: 'long' });
    return `${monday.getDate()} ${monthName} - ${sunday.getDate()} ${sundayMonthName}`;
  }
};

const getNextWeek = (): string => {
  const now = new Date();
  const currentDay = now.getDay();
  const daysToMonday = currentDay === 0 ? 6 : currentDay - 1;
  const nextMonday = new Date(now);
  nextMonday.setDate(now.getDate() - daysToMonday + 7);
  const nextSunday = new Date(nextMonday);
  nextSunday.setDate(nextMonday.getDate() + 6);
  const monthName = nextMonday.toLocaleDateString('it-IT', { month: 'long' });
  
  if (nextMonday.getMonth() === nextSunday.getMonth()) {
    return `${nextMonday.getDate()}-${nextSunday.getDate()} ${monthName}`;
  } else {
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
  
  const [nuoveFasce, setNuoveFasce] = useState<Record<string, Record<WeekType, NuovaFascia[]>>>({});
  const [editingId, setEditingId] = useState<{id: number, week: WeekType} | null>(null);
  const [editData, setEditData] = useState<Partial<FasciaOraria>>({});

  // Stato per il popup di Telegram
  const [showTelegramModal, setShowTelegramModal] = useState(false);
  const [telegramMessage, setTelegramMessage] = useState('');
  const [telegramLoading, setTelegramLoading] = useState(false);
  const [telegramDebugLog, setTelegramDebugLog] = useState<string[]>([]);

  // Funzione di debug logging
  const addDebugLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    const logMessage = `[${timestamp}] ${message}`;
    console.log('🔍 DEBUG:', logMessage);
    setTelegramDebugLog(prev => [...prev, logMessage]);
  };

  useEffect(() => {
    const initialExpanded = GIORNI_SETTIMANA.reduce((acc, giorno) => {
      acc[giorno] = true;
      return acc;
    }, {} as Record<string, boolean>);
    setExpandedDays(initialExpanded);
  }, []);

  useEffect(() => {
    fetchOrari();
  }, []);

  const fetchOrari = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const currentRes = await fetch('/api/orari_settimana');
      
      if (!currentRes.ok) {
        throw new Error(`Errore nel caricamento orari corrente: ${currentRes.status}`);
      }
      
      const currentData: ApiResponse = await currentRes.json();
      
      if (!currentData.success) {
        throw new Error(currentData.error || 'Errore nel caricamento orari corrente');
      }
      
      setOrariCorrente(currentData.data || []);
      
      const nextRes = await fetch('/api/orari_settimana?settimana=next');
      
      if (!nextRes.ok) {
        throw new Error(`Errore nel caricamento orari prossima: ${nextRes.status}`);
      }
      
      const nextData: ApiResponse = await nextRes.json();
      
      if (!nextData.success) {
        throw new Error(nextData.error || 'Errore nel caricamento orari prossima');
      }
      
      setOrariProssima(nextData.data || []);

    } catch (err) {
      console.error('Fetch error:', err);
      setError(err instanceof Error ? err.message : 'Errore di connessione al server');
    } finally {
      setLoading(false);
    }
  };

  const groupByDay = (orari: FasciaOraria[]) => {
    return GIORNI_SETTIMANA.reduce((acc, giorno) => {
      acc[giorno] = orari.filter(o => o.giorno === giorno)
                         .sort((a, b) => a.ora_inizio.localeCompare(b.ora_inizio));
      return acc;
    }, {} as Record<string, FasciaOraria[]>);
  };

  const aggiungiNuovaFascia = (giorno: string, week: WeekType) => {
    setNuoveFasce(prev => {
      const existingDay = prev[giorno] || { current: [], next: [] };
      return {
        ...prev,
        [giorno]: {
          ...existingDay,
          [week]: [
            ...existingDay[week],
            { ora_inizio: '09:00', ora_fine: '19:30', note: '' }
          ]
        }
      };
    });
  };

  const rimuoviNuovaFascia = (giorno: string, week: WeekType, index: number) => {
    setNuoveFasce(prev => {
      const updated = { ...prev };
      if (updated[giorno]?.[week]) {
        updated[giorno][week] = updated[giorno][week].filter((_, i) => i !== index);
        if (updated[giorno][week].length === 0 && 
            (week === 'current' ? updated[giorno].next : updated[giorno].current).length === 0) {
          delete updated[giorno];
        }
      }
      return updated;
    });
  };

  const aggiornaNuovaFascia = (giorno: string, week: WeekType, index: number, field: keyof NuovaFascia, value: string) => {
    setNuoveFasce(prev => {
      const updated = { ...prev };
      if (updated[giorno]?.[week]?.[index]) {
        updated[giorno][week][index] = { ...updated[giorno][week][index], [field]: value };
      }
      return updated;
    });
  };

  const salvaFascia = async (giorno: string, fascia: NuovaFascia, week: WeekType) => {
    if (!fascia.ora_inizio || !fascia.ora_fine) {
      setError('Ora inizio e ora fine sono obbligatorie');
      return false;
    }

    try {
      const body = {
        giorno,
        ora_inizio: fascia.ora_inizio,
        ora_fine: fascia.ora_fine,
        note: fascia.note || null,
        settimana: week === 'next' ? 'next' : undefined
      };

      const response = await fetch('/api/orari_settimana', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        return true;
      } else {
        throw new Error(data.error || 'Errore nel salvataggio');
      }
    } catch (err) {
      console.error('Save error:', err);
      setError(err instanceof Error ? err.message : 'Errore di connessione al server');
      return false;
    }
  };

  const salvaTuttiGliOrari = async () => {
    setLoading(true);
    setError(null);
    let tutteOk = true;

    const savePromises: Promise<boolean>[] = [];

    for (const giorno of GIORNI_SETTIMANA) {
      const fasceGiorno = nuoveFasce[giorno];
      if (!fasceGiorno) continue;

      for (const week of ['current', 'next'] as WeekType[]) {
        for (const fascia of fasceGiorno[week] || []) {
          savePromises.push(salvaFascia(giorno, fascia, week));
        }
      }
    }

    try {
      const results = await Promise.all(savePromises);
      tutteOk = results.every(r => r);
    } catch (err) {
      console.error('Save all error:', err);
      setError(err instanceof Error ? err.message : 'Errore nel salvataggio');
      tutteOk = false;
    }

    if (tutteOk) {
      const allOrari = [...orariCorrente];
      for (const giorno in nuoveFasce) {
        if (nuoveFasce[giorno].current) {
          allOrari.push(...nuoveFasce[giorno].current.map(f => ({ ...f, id: 0, giorno } as FasciaOraria)));
        }
      }

      const message = generateTelegramMessage(allOrari);
      setTelegramMessage(message);
      setNuoveFasce({});
      setTelegramDebugLog([]); // Reset debug log
      addDebugLog('Orari salvati con successo, mostrando modal Telegram');
      setShowTelegramModal(true);
    }

    setLoading(false);
  };

  const eliminaFascia = async (id: number, week: WeekType) => {
    if (!confirm('Sei sicuro di voler eliminare questa fascia oraria?')) {
      return;
    }

    try {
      const body = { 
        id,
        settimana: week === 'next' ? 'next' : undefined
      };

      const response = await fetch('/api/orari_settimana', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        await fetchOrari();
      } else {
        throw new Error(data.error || 'Errore nell\'eliminazione');
      }
    } catch (err) {
      console.error('Delete error:', err);
      setError(err instanceof Error ? err.message : 'Errore di connessione al server');
    }
  };

  const iniziaModifica = (fascia: FasciaOraria, week: WeekType) => {
    setEditingId({ id: fascia.id, week });
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
      const body = {
        id: editingId.id,
        ora_inizio: editData.ora_inizio,
        ora_fine: editData.ora_fine,
        note: editData.note || null,
        settimana: editingId.week === 'next' ? 'next' : undefined
      };

      const response = await fetch('/api/orari_settimana', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        await fetchOrari();
        setEditingId(null);
        setEditData({});
      } else {
        throw new Error(data.error || 'Errore nell\'aggiornamento');
      }
    } catch (err) {
      console.error('Update error:', err);
      setError(err instanceof Error ? err.message : 'Errore di connessione al server');
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

  const hasPendingChanges = () => {
    return Object.values(nuoveFasce).some(dayFasce => 
      (dayFasce.current?.length || 0) > 0 || 
      (dayFasce.next?.length || 0) > 0
    );
  };

  // Funzione per generare il messaggio Telegram
  const generateTelegramMessage = (orari: FasciaOraria[]): string => {
    const groupedOrari = groupByDay(orari);
    const weekRange = getCurrentWeek();
  
    let message = `<b>ECCO GLI ORARI DELL'AULA STUDIO E DELL'AULA AGORÀ DELLA SETTIMANA:</b>\n`;
    message += `${weekRange}\n\n`;
  
    GIORNI_SETTIMANA.forEach(giorno => {
      const dayOrari = groupedOrari[giorno];
      if (dayOrari && dayOrari.length > 0) {
        const orariString = dayOrari.map(o => {
          const timeRange = `${formatTime(o.ora_inizio)}-${formatTime(o.ora_fine)}`;
          const note = o.note ? `*${o.note}` : '';
          return `${timeRange}${note}`;
        }).join(', ');
        
        message += `${giorno.charAt(0).toUpperCase() + giorno.slice(1)}. ${orariString}\n`;
      }
    });
  
    message += `\nDisponibili le pagode per studiare all'aperto :)\n\n`;
    message += `Rimanete collegatə per tutti gli aggiornamenti`;
  
    return message;
  };

  // Funzioni per la gestione del modale di Telegram con log dettagliati
  const handleSendTelegram = async () => {
    const chatId = '-1002271075098'; // ID del gruppo
    
    addDebugLog('Iniziando invio messaggio Telegram');
    addDebugLog(`Chat ID: ${chatId}`);
    addDebugLog(`Messaggio lunghezza: ${telegramMessage.length} caratteri`);
    
    setTelegramLoading(true);
    
    try {
      addDebugLog('Preparando payload per API...');
      
      const payload = {
        chatId,
        message: telegramMessage,
      };
      
      addDebugLog(`Payload preparato: ${JSON.stringify(payload, null, 2)}`);
      addDebugLog('Effettuando richiesta a /api/send-telegram-group');
      
      const response = await fetch('/api/send-telegram-group', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      addDebugLog(`Response status: ${response.status} ${response.statusText}`);
      addDebugLog(`Response headers: ${JSON.stringify(Object.fromEntries(response.headers.entries()))}`);

      let responseText = '';
      try {
        responseText = await response.text();
        addDebugLog(`Response text: ${responseText}`);
      } catch (textError) {
        addDebugLog(`Errore nel leggere response text: ${textError}`);
      }

      let data;
      try {
        data = JSON.parse(responseText);
        addDebugLog(`Response JSON parsed: ${JSON.stringify(data, null, 2)}`);
      } catch (parseError) {
        addDebugLog(`Errore nel parsare JSON: ${parseError}`);
        throw new Error(`Risposta non valida dal server: ${responseText}`);
      }

      if (!response.ok) {
        addDebugLog(`❌ Response non OK: ${response.status}`);
        throw new Error(`HTTP ${response.status}: ${data.error || data.details || 'Errore sconosciuto'}`);
      }

      if (!data.success) {
        addDebugLog(`❌ API ha ritornato success: false`);
        throw new Error(data.error || data.details || 'Errore nell\'invio del messaggio');
      }
      
      addDebugLog('✅ Messaggio inviato con successo!');
      addDebugLog(`Message ID: ${data.messageId}`);
      
      alert('Messaggio inviato con successo al gruppo!');
      
    } catch (err) {
      addDebugLog(`💥 ERRORE: ${err}`);
      console.error('Errore invio Telegram:', err);
      
      const errorMessage = err instanceof Error ? err.message : 'Errore sconosciuto';
      setError(`Errore invio Telegram: ${errorMessage}`);
      
      // Mostra un alert con più dettagli
      alert(`Errore nell'invio del messaggio:\n${errorMessage}\n\nControlla la console per i dettagli completi.`);
      
    } finally {
      setTelegramLoading(false);
      setShowTelegramModal(false);
      fetchOrari();
    }
  };
  
  const handleDismissTelegram = () => {
    addDebugLog('Utente ha chiuso il modal senza inviare');
    setShowTelegramModal(false);
    fetchOrari(); // Ricarica anche se l'utente non vuole inviare il messaggio
  };

  const renderWeekSection = (title: string, orari: FasciaOraria[], week: WeekType, className: string) => {
    const orariGruppi = groupByDay(orari);
    
    return (
      <div className={className}>
        <h2 className="week-title">{title}</h2>
        <div className="orari-list">
          {GIORNI_SETTIMANA.map(giorno => (
            <div key={`${week}-${giorno}`} className="day-section">
              <div className="day-header" onClick={() => toggleDay(giorno)}>
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
                                onChange={(e) => setEditData({ ...editData, ora_inizio: e.target.value })}
                              />
                              <span>-</span>
                              <input
                                type="time"
                                value={editData.ora_fine || ''}
                                onChange={(e) => setEditData({ ...editData, ora_fine: e.target.value })}
                              />
                              <input
                                type="text"
                                placeholder="Note"
                                value={editData.note || ''}
                                onChange={(e) => setEditData({ ...editData, note: e.target.value })}
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
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    iniziaModifica(orario, week);
                                  }}
                                  className="btn btn-edit btn-small"
                                  title="Modifica"
                                >
                                  ✏️
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    eliminaFascia(orario.id, week);
                                  }}
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

  if (loading && orariCorrente.length === 0 && orariProssima.length === 0) {
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
          <button onClick={fetchOrari} className="btn btn-refresh" disabled={loading}>
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

      {/* Popup di conferma Telegram con log dettagliati */}
      {showTelegramModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '800px', maxHeight: '80vh', overflow: 'auto' }}>
            <h2>Vuoi inviare questo messaggio Telegram?</h2>
            <p>Il messaggio verrà inviato al gruppo con ID: <code>-1002271075098</code></p>
            
            {/* Anteprima del messaggio */}
            <div style={{ marginBottom: '20px' }}>
              <h3>Anteprima messaggio:</h3>
              <textarea
                value={telegramMessage}
                onChange={(e) => setTelegramMessage(e.target.value)}
                rows={8}
                cols={50}
                style={{ width: '100%', fontFamily: 'monospace', fontSize: '12px' }}
              />
            </div>

            {/* Debug log */}
            {telegramDebugLog.length > 0 && (
              <div style={{ marginBottom: '20px', maxHeight: '200px', overflow: 'auto', backgroundColor: '#f5f5f5', padding: '10px', borderRadius: '4px' }}>
                <h4>Debug Log:</h4>
                <div style={{ fontFamily: 'monospace', fontSize: '11px', whiteSpace: 'pre-wrap' }}>
                  {telegramDebugLog.map((log, index) => (
                    <div key={index} style={{ marginBottom: '2px' }}>
                      {log}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="modal-actions">
              <button 
                onClick={handleSendTelegram} 
                className="btn btn-success"
                disabled={telegramLoading}
              >
                {telegramLoading ? '📤 Invio in corso...' : '📤 Invia'}
              </button>
              <button 
                onClick={handleDismissTelegram} 
                className="btn btn-secondary"
                disabled={telegramLoading}
              >
                ✅ Salva e non inviare
              </button>
            </div>

            {telegramLoading && (
              <div style={{ marginTop: '10px', textAlign: 'center' }}>
                <div className="loading-spinner" style={{ display: 'inline-block' }}></div>
                <span style={{ marginLeft: '10px' }}>Invio in corso...</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ModificaOrari;