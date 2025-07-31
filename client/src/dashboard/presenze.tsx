import React, { useState, useEffect } from 'react';
import '../style/presenze.css';

interface Presenza {
  id: number | null;
  data: string;
  fascia_oraria: string;
  numero_presenze: number;
  note: string;
  user_id: number | null;
  user_name: string;
  user_surname: string;
  user_username: string;
  day_of_week: number;
  esistente: boolean;
}

interface MonthInfo {
  dates: string[];
  monthName: string;
  year: number;
  month: number;
}

interface Message {
  type: 'success' | 'error' | 'info';
  text: string;
}

interface User {
  id: number;
  name: string;
  surname: string;
  username: string;
  level: number;
}

interface Statistiche {
  per_fascia: Array<{
    fascia_oraria: string;
    totale_presenze: number;
    media_presenze: number;
    max_presenze: number;
    giorni_registrati: number;
  }>;
  totale_mese: number;
  media_giornaliera: string;
  month_info: MonthInfo;
}

type MeseType = 'precedente' | 'corrente' | 'successivo';

const Presenze: React.FC = () => {
  const [presenze, setPresenze] = useState<Presenza[]>([]);
  const [monthInfo, setMonthInfo] = useState<MonthInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<Message | null>(null);
  const [selectedMese, setSelectedMese] = useState<MeseType>('corrente');
  const [selectedCell, setSelectedCell] = useState<{data: string, fascia: string} | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editValue, setEditValue] = useState<string>('');
  const [editNote, setEditNote] = useState<string>('');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [showStats, setShowStats] = useState(false);
  const [statistiche, setStatistiche] = useState<Statistiche | null>(null);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [selectedMonths, setSelectedMonths] = useState<string[]>([]);

  const fasce = ['9-13', '13-16', '16-19', '21-24'];
  const giorni = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'];
  const mesi = [
    'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
    'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'
  ];

  useEffect(() => {
    fetchPresenze();
    getCurrentUser();
  }, [selectedMese]);

  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => {
        setMessage(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  const getCurrentUser = () => {
    const userData = localStorage.getItem('user');
    if (userData) {
      try {
        const user = JSON.parse(userData);
        setCurrentUser(user);
      } catch (error) {
        console.error('Errore nel parsing user data:', error);
      }
    }
  };

  const fetchPresenze = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/presenze?mese=${selectedMese}`);
      const data = await response.json();
      
      if (data.success) {
        setPresenze(data.presenze);
        setMonthInfo(data.month_info);
      } else {
        setMessage({ type: 'error', text: data.error || 'Errore nel caricamento presenze' });
      }
    } catch (error) {
      console.error('Errore nel caricamento presenze:', error);
      setMessage({ type: 'error', text: 'Errore di connessione' });
    } finally {
      setLoading(false);
    }
  };

  const fetchStatistiche = async () => {
    try {
      const response = await fetch(`/api/presenze?mese=${selectedMese}&stats=true`);
      const data = await response.json();
      
      if (data.success) {
        setStatistiche(data.statistiche);
      }
    } catch (error) {
      console.error('Errore nel caricamento statistiche:', error);
    }
  };

  const handleCellClick = (data: string, fascia: string) => {
    const presenza = getPresenzaByDataFascia(data, fascia);
    setSelectedCell({ data, fascia });
    setEditValue(presenza?.numero_presenze.toString() || '0');
    setEditNote(presenza?.note || '');
    setIsModalOpen(true);
  };

  const getPresenzaByDataFascia = (data: string, fascia: string): Presenza | undefined => {
    return presenze.find(p => p.data === data && p.fascia_oraria === fascia);
  };

  const handleSalvaPresenza = async () => {
    if (!selectedCell) return;

    const numeroPresenze = parseInt(editValue) || 0;
    if (numeroPresenze < 0) {
      setMessage({ type: 'error', text: 'Il numero di presenze non può essere negativo' });
      return;
    }

    try {
      const response = await fetch('/api/presenze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data: selectedCell.data,
          fascia_oraria: selectedCell.fascia,
          numero_presenze: numeroPresenze,
          note: editNote,
          current_user_id: currentUser?.id
        }),
      });

      const data = await response.json();

      if (data.success) {
        setMessage({ type: 'success', text: 'Presenza aggiornata con successo!' });
        fetchPresenze();
        closeModal();
      } else {
        setMessage({ type: 'error', text: data.error || 'Errore nel salvataggio' });
      }
    } catch (error) {
      console.error('Errore nel salvataggio presenza:', error);
      setMessage({ type: 'error', text: 'Errore di connessione' });
    }
  };

  const handleEliminaPresenza = async () => {
    if (!selectedCell) return;

    try {
      const response = await fetch('/api/presenze', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data: selectedCell.data,
          fascia_oraria: selectedCell.fascia,
          current_user_id: currentUser?.id
        }),
      });

      const data = await response.json();

      if (data.success) {
        setMessage({ type: 'success', text: 'Presenza eliminata con successo!' });
        fetchPresenze();
        closeModal();
      } else {
        setMessage({ type: 'error', text: data.error || 'Errore nell\'eliminazione' });
      }
    } catch (error) {
      console.error('Errore nell\'eliminazione presenza:', error);
      setMessage({ type: 'error', text: 'Errore di connessione' });
    }
  };

  const handleDownloadPdf = async () => {
    if (selectedMonths.length === 0) {
      setMessage({ type: 'error', text: 'Seleziona almeno un mese' });
      return;
    }

    try {
      setMessage({ type: 'info', text: 'Generazione PDF in corso...' });
      
      const response = await fetch('/api/presenze/download-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          months: selectedMonths,
          user_id: currentUser?.id
        }),
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `presenze_report_${selectedMonths.length}_mesi.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        setMessage({ type: 'success', text: 'PDF scaricato con successo!' });
        closePdfModal();
      } else {
        let errorMessage = 'Errore nel download PDF';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorData.message || errorMessage;
        } catch (e) {
          errorMessage = `Errore ${response.status}: ${response.statusText}`;
        }
        setMessage({ type: 'error', text: errorMessage });
      }
    } catch (error) {
      console.error('Errore nel download PDF:', error);
      setMessage({ 
        type: 'error', 
        text: 'Errore di connessione. Verifica che l\'endpoint /api/presenze/download-pdf sia disponibile.' 
      });
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedCell(null);
    setEditValue('');
    setEditNote('');
  };

  const closePdfModal = () => {
    setIsPdfModalOpen(false);
    setSelectedMonths([]);
  };

  const toggleMonthSelection = (monthKey: string) => {
    setSelectedMonths(prev => 
      prev.includes(monthKey) 
        ? prev.filter(m => m !== monthKey)
        : [...prev, monthKey]
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.getDate().toString();
  };

  const getDayName = (dateString: string) => {
    const date = new Date(dateString);
    return giorni[date.getDay()];
  };

  const isWeekend = (dateString: string) => {
    const date = new Date(dateString);
    const day = date.getDay();
    return day === 0 || day === 6; // Domenica o Sabato
  };

  const toggleStats = () => {
    if (!showStats) {
      fetchStatistiche();
    }
    setShowStats(!showStats);
  };

  const canDownloadPdf = () => {
    return currentUser && (currentUser.level === 0 || currentUser.level === 1);
  };

  const renderCalendarGrid = () => {
    if (!monthInfo) return null;

    // Organizza presenze per data e fascia
    const presenzeMap: { [key: string]: { [fascia: string]: Presenza } } = {};
    presenze.forEach(presenza => {
      if (!presenzeMap[presenza.data]) {
        presenzeMap[presenza.data] = {};
      }
      presenzeMap[presenza.data][presenza.fascia_oraria] = presenza;
    });

    return (
      <div className="presenze-calendar compact">
        {/* Header con fasce orarie */}
        <div className="calendar-header">
          <div className="date-column">Data</div>
          {fasce.map(fascia => (
            <div key={fascia} className="fascia-header">
              {fascia}
            </div>
          ))}
          <div className="total-column">Tot</div>
        </div>

        {/* Righe dei giorni */}
        <div className="calendar-body">
          {monthInfo.dates.map(data => {
            const totaleDiario = fasce.reduce((sum, fascia) => {
              const presenza = presenzeMap[data]?.[fascia];
              return sum + (presenza?.numero_presenze || 0);
            }, 0);

            return (
              <div 
                key={data} 
                className={`calendar-row ${isWeekend(data) ? 'weekend' : ''}`}
              >
                <div className="date-cell">
                  <div className="day-number">{formatDate(data)}</div>
                  <div className="day-name">{getDayName(data)}</div>
                </div>
                
                {fasce.map(fascia => {
                  const presenza = presenzeMap[data]?.[fascia];
                  const numero = presenza?.numero_presenze || 0;
                  
                  return (
                    <div
                      key={`${data}-${fascia}`}
                      className={`presenza-cell ${numero > 0 ? 'has-presenze' : 'empty'} ${isWeekend(data) ? 'weekend' : ''}`}
                      onClick={() => handleCellClick(data, fascia)}
                    >
                      <div className="numero-presenze">
                        {numero > 0 ? numero : '-'}
                      </div>
                      {presenza?.note && (
                        <div className="presenza-note" title={presenza.note}>
                          📝
                        </div>
                      )}
                    </div>
                  );
                })}
                
                <div className={`total-cell ${totaleDiario > 0 ? 'has-total' : ''}`}>
                  {totaleDiario > 0 ? totaleDiario : '-'}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderStatistiche = () => {
    if (!statistiche) return null;

    return (
      <div className="statistiche-panel">
        <h3>📊 Statistiche {statistiche.month_info.monthName}</h3>
        
        <div className="stats-summary">
          <div className="stat-card">
            <div className="stat-label">Totale Mese</div>
            <div className="stat-value">{statistiche.totale_mese}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Media Giornaliera</div>
            <div className="stat-value">{statistiche.media_giornaliera}</div>
          </div>
        </div>

        <div className="stats-per-fascia">
          <h4>Per Fascia Oraria</h4>
          {statistiche.per_fascia.map(stat => (
            <div key={stat.fascia_oraria} className="fascia-stat">
              <div className="fascia-label">{stat.fascia_oraria}</div>
              <div className="fascia-values">
                <span>Totale: {stat.totale_presenze}</span>
                <span>Media: {parseFloat(stat.media_presenze.toString()).toFixed(1)}</span>
                <span>Max: {stat.max_presenze}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderPdfModal = () => {
    interface MonthOption {
      key: string;
      name: string;
    }
    const months: MonthOption[] = [];
    const currentDate = new Date();
    
    // Genera gli ultimi 12 mesi senza duplicati
    for (let i = 11; i >= 0; i--) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const monthName = `${mesi[date.getMonth()]} ${date.getFullYear()}`;
      
      // Evita duplicati verificando se la chiave esiste già
      if (!months.find(m => m.key === monthKey)) {
        months.push({ key: monthKey, name: monthName });
      }
    }

    return (
      <div className="presenza-modal-overlay" onClick={closePdfModal}>
        <div className="presenza-modal-content pdf-modal" onClick={(e) => e.stopPropagation()}>
          <div className="presenza-modal-header">
            <h3>📄 Scarica Report PDF</h3>
            <button className="close-button" onClick={closePdfModal}>
              ×
            </button>
          </div>
          
          <div className="presenza-modal-body">
            <p className="pdf-instructions">Seleziona i mesi di cui vuoi scaricare il report PDF:</p>
            
            <div className="months-grid">
              {months.map(month => (
                <label key={month.key} className="month-checkbox">
                  <input
                    type="checkbox"
                    checked={selectedMonths.includes(month.key)}
                    onChange={() => toggleMonthSelection(month.key)}
                  />
                  <span className="checkmark"></span>
                  {month.name}
                </label>
              ))}
            </div>
            
            <div className="selected-count">
              {selectedMonths.length > 0 && (
                <p>Selezionati: {selectedMonths.length} mesi</p>
              )}
            </div>
          </div>
          
          <div className="presenza-modal-actions">
            <button className="cancel-button" onClick={closePdfModal}>
              Annulla
            </button>
            <button 
              className="save-button" 
              onClick={handleDownloadPdf}
              disabled={selectedMonths.length === 0}
            >
              📄 Scarica PDF
            </button>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="presenze-container">
        <div className="presenze-loading">
          <div className="loading-spinner"></div>
          <p>Caricamento presenze...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="presenze-container">
      <div className="presenze-header-section">
        <h1>👥 Gestione Presenze</h1>
        
        <div className="month-selector">
          <button
            className={`month-button ${selectedMese === 'precedente' ? 'active' : ''}`}
            onClick={() => setSelectedMese('precedente')}
          >
            ← Precedente
          </button>
          <button
            className={`month-button ${selectedMese === 'corrente' ? 'active' : ''}`}
            onClick={() => setSelectedMese('corrente')}
          >
            {monthInfo?.monthName || 'Corrente'}
          </button>
          <button
            className={`month-button ${selectedMese === 'successivo' ? 'active' : ''}`}
            onClick={() => setSelectedMese('successivo')}
          >
            Successivo →
          </button>
        </div>

        <div className="presenze-actions">
          {canDownloadPdf() && (
            <button onClick={() => setIsPdfModalOpen(true)} className="pdf-button">
              📄 Scarica PDF
            </button>
          )}
          <button onClick={toggleStats} className="stats-button">
            {showStats ? '📊 Nascondi Stats' : '📊 Mostra Stats'}
          </button>
          <button onClick={fetchPresenze} className="refresh-button">
            🔄 Aggiorna
          </button>
        </div>
      </div>

      {message && (
        <div className={`presenze-message ${message.type}`}>
          <span className="message-icon">
            {message.type === 'success' ? '✅' : message.type === 'error' ? '❌' : 'ℹ️'}
          </span>
          {message.text}
          <button 
            className="close-message" 
            onClick={() => setMessage(null)}
          >
            ×
          </button>
        </div>
      )}

      {showStats && renderStatistiche()}

      <div className="presenze-content">
        {renderCalendarGrid()}
      </div>

      {/* Modal per modifica presenza */}
      {isModalOpen && selectedCell && (
        <div className="presenza-modal-overlay" onClick={closeModal}>
          <div className="presenza-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="presenza-modal-header">
              <h3>Modifica Presenza</h3>
              <button className="close-button" onClick={closeModal}>
                ×
              </button>
            </div>
            
            <div className="presenza-modal-body">
              <div className="presenza-info">
                <p><strong>Data:</strong> {new Date(selectedCell.data).toLocaleDateString('it-IT')}</p>
                <p><strong>Fascia oraria:</strong> {selectedCell.fascia}</p>
                <p><strong>Giorno:</strong> {getDayName(selectedCell.data)}</p>
              </div>
              
              <div className="form-group">
                <label htmlFor="numero-presenze">Numero Presenze</label>
                <input
                  id="numero-presenze"
                  type="number"
                  min="0"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  placeholder="Inserisci numero presenze"
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="note-presenza">Note</label>
                <input
                  id="note-presenza"
                  type="text"
                  value={editNote}
                  onChange={(e) => setEditNote(e.target.value)}
                  placeholder="Note aggiuntive (opzionale)"
                />
              </div>
            </div>
            
            <div className="presenza-modal-actions">
              <button className="cancel-button" onClick={closeModal}>
                Annulla
              </button>
              <button 
                className="delete-button" 
                onClick={handleEliminaPresenza}
                disabled={!getPresenzaByDataFascia(selectedCell.data, selectedCell.fascia)?.esistente}
              >
                🗑️ Elimina
              </button>
              <button className="save-button" onClick={handleSalvaPresenza}>
                💾 Salva
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal per PDF */}
      {isPdfModalOpen && renderPdfModal()}
    </div>
  );
};

export default Presenze;