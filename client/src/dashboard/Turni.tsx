import React, { useState, useEffect } from 'react';
import '../style/turni.css';

interface Turno {
  id: number | null;
  data: string;
  turno_inizio: string;
  turno_fine: string;
  fascia_id: number;
  user_id: number | null;
  note: string;
  user_name: string;
  user_surname: string;
  user_username: string;
  assegnato: boolean;
  day_index: number;
  turno_index: number;
  nota_automatica?: string;
  is_default?: boolean;
  is_closed_override?: boolean; // Aggiungi questo campo per identificare turni straordinari
}

interface User {
  id: number;
  name: string;
  surname: string;
  username: string;
  level: number;
}

interface Message {
  type: 'success' | 'error' | 'info';
  text: string;
}

type WeekType = 'corrente' | 'prossima' | 'plus2' | 'plus3';

const Turni: React.FC = () => {
  const [turniCorrente, setTurniCorrente] = useState<Turno[]>([]);
  const [turniProssima, setTurniProssima] = useState<Turno[]>([]);
  const [turniPlus2, setTurniPlus2] = useState<Turno[]>([]);
  const [turniPlus3, setTurniPlus3] = useState<Turno[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<Message | null>(null);
  const [selectedWeek, setSelectedWeek] = useState<WeekType>('corrente');
  const [selectedTurno, setSelectedTurno] = useState<Turno | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [note, setNote] = useState('');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isClosedOverride, setIsClosedOverride] = useState(false);

  const giorni = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica'];

  useEffect(() => {
    fetchAllTurni();
    fetchUsers();
    getCurrentUser();
  }, []);

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

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/user');
      const data = await response.json();
      
      if (data.success) {
        setUsers(data.users);
      }
    } catch (error) {
      console.error('Errore nel caricamento utenti:', error);
    }
  };

  const fetchAllTurni = async () => {
    setLoading(true);
    try {
      // Carica tutte le 4 settimane
      const settimane: WeekType[] = ['corrente', 'prossima', 'plus2', 'plus3'];
      const promises = settimane.map(settimana => 
        fetch(`/api/turni?settimana=${settimana}`)
          .then(response => response.json())
          .then(data => ({ settimana, data }))
      );

      const results = await Promise.all(promises);

      results.forEach(({ settimana, data }) => {
        if (data.success) {
          switch (settimana) {
            case 'corrente':
              setTurniCorrente(data.turni);
              break;
            case 'prossima':
              setTurniProssima(data.turni);
              break;
            case 'plus2':
              setTurniPlus2(data.turni);
              break;
            case 'plus3':
              setTurniPlus3(data.turni);
              break;
          }
        }
      });

    } catch (error) {
      console.error('Errore nel caricamento turni:', error);
      setMessage({ type: 'error', text: 'Errore nel caricamento dei turni' });
    } finally {
      setLoading(false);
    }
  };

  const isTurnoClosed = (turno: Turno | null): boolean => {
    if (!turno) return true;
    
    // Per settimane +2 e +3, controlla se è un turno che dovrebbe essere chiuso
    if (turno.is_default) {
      // Turno 21:00-24:00 è chiuso di default
      if (turno.turno_inizio === '21:00' && turno.turno_fine === '24:00') {
        return true;
      }
      // Weekend è chiuso di default
      if (turno.day_index === 5 || turno.day_index === 6) {
        return true;
      }
    }
    
    return false;
  };

  // Verifica se un turno è straordinario (assegnato su slot normalmente chiuso)
  const isTurnoStraordinario = (turno: Turno): boolean => {
    return turno.assegnato && (turno.is_closed_override === true || isTurnoClosed(turno));
  };

  // Funzione per creare un "pseudo-turno" per celle completamente chiuse
  const createClosedTurno = (dayIndex: number, turnoIndex: number): Turno => {
    const orari = [
      { inizio: '09:00', fine: '13:00' },
      { inizio: '13:00', fine: '16:00' },
      { inizio: '16:00', fine: '19:30' },
      { inizio: '21:00', fine: '24:00' }
    ];
    
    // Calcola la data per questo giorno
    const weekOffset = selectedWeek === 'corrente' ? 0 : 
                     selectedWeek === 'prossima' ? 1 : 
                     selectedWeek === 'plus2' ? 2 : 3;
    
    const now = new Date();
    const currentDay = now.getDay();
    const monday = new Date(now);
    monday.setDate(now.getDate() - (currentDay === 0 ? 6 : currentDay - 1) + (weekOffset * 7));
    const targetDate = new Date(monday);
    targetDate.setDate(monday.getDate() + dayIndex);
    
    return {
      id: null,
      data: targetDate.toISOString().split('T')[0],
      turno_inizio: orari[turnoIndex].inizio,
      turno_fine: orari[turnoIndex].fine,
      fascia_id: 1,
      user_id: null,
      note: '',
      user_name: '',
      user_surname: '',
      user_username: '',
      assegnato: false,
      day_index: dayIndex,
      turno_index: turnoIndex,
      nota_automatica: '',
      is_default: true
    };
  };

  const handleTurnoClick = (turno: Turno, isCompletelyClosedCell = false) => {
    setSelectedTurno(turno);
    setSelectedUserId(turno.user_id || currentUser?.id || null);
    setNote(turno.note || '');
    
    // Se è una cella completamente chiusa o un turno chiuso, imposta automaticamente il flag
    if (isCompletelyClosedCell || isTurnoClosed(turno)) {
      setIsClosedOverride(false); // L'utente dovrà comunque checkare
    } else {
      setIsClosedOverride(false);
    }
    
    setIsModalOpen(true);
  };

  const handleAssegnaTurno = async () => {
    if (!selectedTurno || selectedUserId === null || selectedUserId === undefined) return;

    try {
      const response = await fetch('/api/turni', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data: selectedTurno.data,
          turno_inizio: selectedTurno.turno_inizio,
          turno_fine: selectedTurno.turno_fine,
          fascia_id: selectedTurno.fascia_id,
          user_id: selectedUserId,
          note: note,
          is_closed_override: isClosedOverride,
          current_user_id: currentUser?.id
        }),
      });

      const data = await response.json();

      if (data.success) {
        setMessage({ type: 'success', text: 'Turno assegnato con successo!' });
        
        // Aggiornamento immediato dello stato locale invece di aspettare il re-fetch
        const newTurno: Turno = {
          ...selectedTurno,
          id: data.turno_id || Date.now(), // Usa l'ID dal server o un temporaneo
          user_id: selectedUserId,
          note: note,
          assegnato: true,
          user_name: users.find(u => u.id === selectedUserId)?.name || '',
          user_surname: users.find(u => u.id === selectedUserId)?.surname || '',
          user_username: users.find(u => u.id === selectedUserId)?.username || '',
          is_closed_override: isClosedOverride // Mantieni il flag per identificare turni straordinari
        };

        // Aggiorna lo stato della settimana corretta
        const updateWeekState = (setter: React.Dispatch<React.SetStateAction<Turno[]>>) => {
          setter(prev => {
            // Rimuovi il turno se esiste già (per aggiornamenti)
            const filtered = prev.filter(t => 
              !(t.data === newTurno.data && 
                t.turno_inizio === newTurno.turno_inizio && 
                t.turno_fine === newTurno.turno_fine)
            );
            return [...filtered, newTurno];
          });
        };

        // Determina quale settimana aggiornare
        switch (selectedWeek) {
          case 'corrente':
            updateWeekState(setTurniCorrente);
            break;
          case 'prossima':
            updateWeekState(setTurniProssima);
            break;
          case 'plus2':
            updateWeekState(setTurniPlus2);
            break;
          case 'plus3':
            updateWeekState(setTurniPlus3);
            break;
        }

        closeModal();
        
        // Richiedi comunque un aggiornamento completo in background
        fetchAllTurni();
        
        // TODO: Handler per ripercussioni turno straordinario
        if (isClosedOverride || isTurnoClosed(selectedTurno)) {
          console.log('TODO: Gestire ripercussioni turno straordinario/chiuso', {
            turno: selectedTurno,
            user_id: selectedUserId,
            current_user: currentUser,
            note: note,
            action: 'assigned_to_closed_slot'
          });
        }
        
        // TODO: Handler notifica assegnazione
        console.log('TODO: Notifica assegnazione turno', {
          turno: selectedTurno,
          user_id: selectedUserId,
          current_user: currentUser,
          is_closed_override: isClosedOverride
        });
      } else {
        setMessage({ type: 'error', text: data.error || 'Errore nell\'assegnazione' });
      }
    } catch (error) {
      console.error('Errore nell\'assegnazione turno:', error);
      setMessage({ type: 'error', text: 'Errore di connessione' });
    }
  };

  const handleRimuoviTurno = async () => {
    if (!selectedTurno) return;

    try {
      const response = await fetch('/api/turni', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data: selectedTurno.data,
          turno_inizio: selectedTurno.turno_inizio,
          turno_fine: selectedTurno.turno_fine,
          current_user_id: currentUser?.id
        }),
      });

      const data = await response.json();

      if (data.success) {
        setMessage({ type: 'success', text: 'Turno rimosso con successo!' });
        fetchAllTurni();
        closeModal();
        
        // TODO: Handler notifica rimozione
        console.log('TODO: Notifica rimozione turno', {
          turno: selectedTurno,
          current_user: currentUser,
          removed_user_id: selectedTurno.user_id
        });
      } else {
        setMessage({ type: 'error', text: data.error || 'Errore nella rimozione' });
      }
    } catch (error) {
      console.error('Errore nella rimozione turno:', error);
      setMessage({ type: 'error', text: 'Errore di connessione' });
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedTurno(null);
    setSelectedUserId(null);
    setNote('');
    setIsClosedOverride(false);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('it-IT', {
      day: '2-digit',
      month: '2-digit'
    });
  };

  const getWeekRange = (weekOffset: number) => {
    const now = new Date();
    const currentDay = now.getDay();
    const monday = new Date(now);
    monday.setDate(now.getDate() - (currentDay === 0 ? 6 : currentDay - 1) + (weekOffset * 7));
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    
    return `${monday.getDate()}-${sunday.getDate()} ${monday.toLocaleDateString('it-IT', { month: 'long' })}`;
  };

  const getCurrentWeekRange = () => getWeekRange(0);
  const getNextWeekRange = () => getWeekRange(1);
  const getPlus2WeekRange = () => getWeekRange(2);
  const getPlus3WeekRange = () => getWeekRange(3);

  const getCurrentTurni = (): Turno[] => {
    switch (selectedWeek) {
      case 'prossima':
        return turniProssima;
      case 'plus2':
        return turniPlus2;
      case 'plus3':
        return turniPlus3;
      default:
        return turniCorrente;
    }
  };

  const renderTurniGrid = (turni: Turno[]) => {
    // Organizza turni per giorno e orario
    const turniPerGiorno: { [key: string]: Turno } = {};
    turni.forEach(turno => {
      const key = `${turno.day_index}-${turno.turno_index}`;
      turniPerGiorno[key] = turno;
    });

    return (
      <div className="turni-grid">
        <div className="turni-header">
          <div className="turni-time-column">Orari</div>
          {giorni.map((giorno, index) => (
            <div key={index} className="turni-day-header">
              <div className="day-name">{giorno}</div>
              <div className="day-date">
                {/* Trova qualsiasi turno per questo giorno per mostrare la data */}
                {turni.find(t => t.day_index === index) ? 
                  formatDate(turni.find(t => t.day_index === index)!.data) : ''}
              </div>
            </div>
          ))}
        </div>

        <div className="turni-body">
          {['09:00-13:00', '13:00-16:00', '16:00-19:30', '21:00-24:00'].map((orario, turnoIndex) => (
            <div key={turnoIndex} className="turni-row">
              <div className="turni-time-cell">{orario}</div>
              {giorni.map((_, dayIndex) => {
                const turnoKey = `${dayIndex}-${turnoIndex}`;
                const turno = turniPerGiorno[turnoKey];
                const isClosedTurno = isTurnoClosed(turno ?? null);
                const isStraordinario = turno ? isTurnoStraordinario(turno) : false;
                
                return (
                  <div
                    key={`${dayIndex}-${turnoIndex}`}
                    className={`turni-cell ${
                      turno?.assegnato ? 
                        (isStraordinario ? 'assigned-extraordinary' : 'assigned') : 
                      turno && !isClosedTurno ? 'available' : 
                      'closed'
                    }`}
                    onClick={() => {
                      if (turno) {
                        handleTurnoClick(turno);
                      } else {
                        // Crea un pseudo-turno per celle completamente chiuse
                        const pseudoTurno = createClosedTurno(dayIndex, turnoIndex);
                        handleTurnoClick(pseudoTurno, true);
                      }
                    }}
                  >
                    {turno?.assegnato ? (
                      // TURNO ASSEGNATO (normale o straordinario)
                      <div className={`turno-assigned ${isStraordinario ? 'straordinario' : ''}`}>
                        <div className="user-name">{turno.user_name} {turno.user_surname}</div>
                        {isStraordinario && (
                          <div className="turno-straordinario-badge">⚡ Straordinario</div>
                        )}
                        {turno.nota_automatica && (
                          <div className="turno-nota-automatica">{turno.nota_automatica}</div>
                        )}
                        {turno.note && !turno.nota_automatica && (
                          <div className="turno-note">{turno.note}</div>
                        )}
                        {turno.note && turno.nota_automatica && (
                          <div className="turno-note">{turno.note}</div>
                        )}
                      </div>
                    ) : turno && !isClosedTurno ? (
                      // TURNO DISPONIBILE
                      <div className="turno-available">
                        <div>Disponibile</div>
                        {turno.nota_automatica && (
                          <div className="turno-nota-automatica">{turno.nota_automatica}</div>
                        )}
                      </div>
                    ) : turno && isClosedTurno ? (
                      // TURNO CHIUSO (ma presente nel database)
                      <div className="turno-closed">
                        <div>Chiuso</div>
                        {turno.nota_automatica && (
                          <div className="turno-nota-automatica">{turno.nota_automatica}</div>
                        )}
                        <div className="turno-nota-automatica" style={{fontSize: '9px', marginTop: '2px'}}>
                          (Clicca per richiedere)
                        </div>
                      </div>
                    ) : (
                      // NESSUN TURNO NEL DATABASE (slot completamente chiuso)
                      <div className="turno-closed">
                        <div>Chiuso</div>
                        <div className="turno-nota-automatica" style={{fontSize: '9px', marginTop: '2px'}}>
                          (Clicca per richiedere)
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="turni-container">
        <div className="turni-loading">
          <div className="loading-spinner"></div>
          <p>Caricamento turni...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="turni-container">
      <div className="turni-header-section">
        <h1>📅 Gestione Turni</h1>
        
        <div className="week-selector">
          <button
            className={`week-button ${selectedWeek === 'corrente' ? 'active' : ''}`}
            onClick={() => setSelectedWeek('corrente')}
          >
            Settimana Corrente ({getCurrentWeekRange()})
          </button>
          <button
            className={`week-button ${selectedWeek === 'prossima' ? 'active' : ''}`}
            onClick={() => setSelectedWeek('prossima')}
          >
            Prossima Settimana ({getNextWeekRange()})
          </button>
          <button
            className={`week-button ${selectedWeek === 'plus2' ? 'active' : ''}`}
            onClick={() => setSelectedWeek('plus2')}
          >
            Settimana ({getPlus2WeekRange()})
          </button>
          <button
            className={`week-button ${selectedWeek === 'plus3' ? 'active' : ''}`}
            onClick={() => setSelectedWeek('plus3')}
          >
            Settimana ({getPlus3WeekRange()})
          </button>
        </div>

        <button onClick={fetchAllTurni} className="refresh-button">
          🔄 Aggiorna
        </button>
      </div>

      {message && (
        <div className={`turni-message ${message.type}`}>
          <div className="message-icon">
            {message.type === 'success' ? '✅' : message.type === 'error' ? '❌' : 'ℹ️'}
          </div>
          <span>{message.text}</span>
          <button onClick={() => setMessage(null)} className="close-message">×</button>
        </div>
      )}

      <div className="turni-content">
        {renderTurniGrid(getCurrentTurni())}
      </div>

      {/* Modal per assegnazione turno */}
      {isModalOpen && selectedTurno && (
        <div className="turno-modal-overlay" onClick={closeModal}>
          <div className="turno-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="turno-modal-header">
              <h3>
                {(isTurnoClosed(selectedTurno) || !getCurrentTurni().find(t => 
                  t.data === selectedTurno.data && 
                  t.turno_inizio === selectedTurno.turno_inizio && 
                  t.turno_fine === selectedTurno.turno_fine
                )) && !selectedTurno.assegnato ? 
                  '⚠️ Richiesta Turno Straordinario' : 
                  'Gestisci Turno'
                }
              </h3>
              <button onClick={closeModal} className="close-button">✕</button>
            </div>

            <div className="turno-modal-body">
              <div className="turno-info">
                <p><strong>Data:</strong> {formatDate(selectedTurno.data)}</p>
                <p><strong>Orario:</strong> {selectedTurno.turno_inizio} - {selectedTurno.turno_fine}</p>
                {(isTurnoClosed(selectedTurno) || !getCurrentTurni().find(t => 
                  t.data === selectedTurno.data && 
                  t.turno_inizio === selectedTurno.turno_inizio && 
                  t.turno_fine === selectedTurno.turno_fine
                )) && (
                  <p style={{color: '#ff9800', fontWeight: 'bold'}}>
                    ⚠️ Questo è normalmente un turno chiuso
                  </p>
                )}
                {selectedTurno.is_default && (
                  <p style={{color: '#666', fontSize: '12px'}}>
                    📋 Turno con orari di default
                  </p>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="user-select">Seleziona Utente:</label>
                <select
                  id="user-select"
                  value={selectedUserId || ''}
                  onChange={(e) => setSelectedUserId(Number(e.target.value))}
                >
                  <option value="">Seleziona un utente</option>
                  {users.map(user => (
                    <option key={user.id} value={user.id}>
                      {user.name} {user.surname} ({user.username})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="note-input">Note (opzionale):</label>
                <input
                  type="text"
                  id="note-input"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder={
                    (isTurnoClosed(selectedTurno) || !getCurrentTurni().find(t => 
                      t.data === selectedTurno.data && 
                      t.turno_inizio === selectedTurno.turno_inizio && 
                      t.turno_fine === selectedTurno.turno_fine
                    )) ? 
                    "Motivo della richiesta..." : 
                    "Aggiungi una nota..."
                  }
                />
              </div>

              {(isTurnoClosed(selectedTurno) || !getCurrentTurni().find(t => 
                t.data === selectedTurno.data && 
                t.turno_inizio === selectedTurno.turno_inizio && 
                t.turno_fine === selectedTurno.turno_fine
              )) && !selectedTurno.assegnato && (
                <div className="form-group">
                  <label>
                    <input
                      type="checkbox"
                      checked={isClosedOverride}
                      onChange={(e) => setIsClosedOverride(e.target.checked)}
                      style={{marginRight: '8px'}}
                    />
                    Confermo di voler richiedere questo turno straordinario
                  </label>
                </div>
              )}
            </div>

            <div className="turno-modal-actions">
              {selectedTurno.assegnato && (
                <button onClick={handleRimuoviTurno} className="remove-button">
                  Rimuovi Assegnazione
                </button>
              )}
              <button onClick={closeModal} className="cancel-button">
                Annulla
              </button>
              <button 
                onClick={handleAssegnaTurno} 
                className="assign-button"
                disabled={
                  selectedUserId === null || 
                  selectedUserId === undefined || 
                  ((isTurnoClosed(selectedTurno) || !getCurrentTurni().find(t => 
                    t.data === selectedTurno.data && 
                    t.turno_inizio === selectedTurno.turno_inizio && 
                    t.turno_fine === selectedTurno.turno_fine
                  )) && !selectedTurno.assegnato && !isClosedOverride)
                }
              >
                {selectedTurno.assegnato ? 'Modifica' : 
                 (isTurnoClosed(selectedTurno) || !getCurrentTurni().find(t => 
                   t.data === selectedTurno.data && 
                   t.turno_inizio === selectedTurno.turno_inizio && 
                   t.turno_fine === selectedTurno.turno_fine
                 )) ? 'Richiedi' : 'Assegna'} Turno
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Turni;