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

const Turni: React.FC = () => {
  const [turniCorrente, setTurniCorrente] = useState<Turno[]>([]);
  const [turniProssima, setTurniProssima] = useState<Turno[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<Message | null>(null);
  const [selectedWeek, setSelectedWeek] = useState<'corrente' | 'prossima'>('corrente');
  const [selectedTurno, setSelectedTurno] = useState<Turno | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [note, setNote] = useState('');
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const giorni = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica'];

  useEffect(() => {
    fetchTurni();
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

  const fetchTurni = async () => {
    setLoading(true);
    try {
      // Carica turni settimana corrente
      const responseCorrente = await fetch('/api/turni?settimana=corrente');
      const dataCorrente = await responseCorrente.json();
      
      if (dataCorrente.success) {
        setTurniCorrente(dataCorrente.turni);
      }

      // Carica turni prossima settimana
      const responseProssima = await fetch('/api/turni?settimana=prossima');
      const dataProssima = await responseProssima.json();
      
      if (dataProssima.success) {
        setTurniProssima(dataProssima.turni);
      }

    } catch (error) {
      console.error('Errore nel caricamento turni:', error);
      setMessage({ type: 'error', text: 'Errore nel caricamento dei turni' });
    } finally {
      setLoading(false);
    }
  };

  const handleTurnoClick = (turno: Turno) => {
    setSelectedTurno(turno);
    setSelectedUserId(turno.user_id || currentUser?.id || null);
    setNote(turno.note || '');
    setIsModalOpen(true);
  };

  const handleAssegnaTurno = async () => {
    if (!selectedTurno || !selectedUserId) return;

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
          note: note
        }),
      });

      const data = await response.json();

      if (data.success) {
        setMessage({ type: 'success', text: 'Turno assegnato con successo!' });
        fetchTurni();
        closeModal();
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
          turno_fine: selectedTurno.turno_fine
        }),
      });

      const data = await response.json();

      if (data.success) {
        setMessage({ type: 'success', text: 'Turno rimosso con successo!' });
        fetchTurni();
        closeModal();
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
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('it-IT', {
      day: '2-digit',
      month: '2-digit'
    });
  };

  const getCurrentWeekRange = () => {
    const now = new Date();
    const currentDay = now.getDay();
    const monday = new Date(now);
    monday.setDate(now.getDate() - (currentDay === 0 ? 6 : currentDay - 1));
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    
    return `${monday.getDate()}-${sunday.getDate()} ${monday.toLocaleDateString('it-IT', { month: 'long' })}`;
  };

  const getNextWeekRange = () => {
    const now = new Date();
    const currentDay = now.getDay();
    const nextMonday = new Date(now);
    nextMonday.setDate(now.getDate() - (currentDay === 0 ? 6 : currentDay - 1) + 7);
    const nextSunday = new Date(nextMonday);
    nextSunday.setDate(nextMonday.getDate() + 6);
    
    return `${nextMonday.getDate()}-${nextSunday.getDate()} ${nextMonday.toLocaleDateString('it-IT', { month: 'long' })}`;
  };

  const renderTurniGrid = (turni: Turno[]) => {
    // Organizza turni per giorno
    const turniPerGiorno: { [key: number]: Turno[] } = {};
    turni.forEach(turno => {
      if (!turniPerGiorno[turno.day_index]) {
        turniPerGiorno[turno.day_index] = [];
      }
      turniPerGiorno[turno.day_index].push(turno);
    });

    return (
      <div className="turni-grid">
        <div className="turni-header">
          <div className="turni-time-column">Orari</div>
          {giorni.map((giorno, index) => (
            <div key={index} className="turni-day-header">
              <div className="day-name">{giorno}</div>
              <div className="day-date">
                {turniPerGiorno[index]?.[0] ? formatDate(turniPerGiorno[index][0].data) : ''}
              </div>
            </div>
          ))}
        </div>

        <div className="turni-body">
          {['09:00-13:00', '13:00-16:00', '16:00-19:30'].map((orario, turnoIndex) => (
            <div key={turnoIndex} className="turni-row">
              <div className="turni-time-cell">{orario}</div>
              {giorni.map((_, dayIndex) => {
                const turno = turniPerGiorno[dayIndex]?.find(t => t.turno_index === turnoIndex);
                return (
                  <div
                    key={`${dayIndex}-${turnoIndex}`}
                    className={`turni-cell ${turno?.assegnato ? 'assigned' : 'available'} ${!turno ? 'closed' : ''}`}
                    onClick={() => turno && handleTurnoClick(turno)}
                  >
                    {turno ? (
                      turno.assegnato ? (
                        <div className="turno-assigned">
                          <div className="user-name">{turno.user_name} {turno.user_surname}</div>
                          {turno.note && <div className="turno-note">{turno.note}</div>}
                        </div>
                      ) : (
                        <div className="turno-available">Disponibile</div>
                      )
                    ) : (
                      <div className="turno-closed">Chiuso</div>
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
        </div>

        <button onClick={fetchTurni} className="refresh-button">
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
        {renderTurniGrid(selectedWeek === 'corrente' ? turniCorrente : turniProssima)}
      </div>

      {/* Modal per assegnazione turno */}
      {isModalOpen && selectedTurno && (
        <div className="turno-modal-overlay" onClick={closeModal}>
          <div className="turno-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="turno-modal-header">
              <h3>Gestisci Turno</h3>
              <button onClick={closeModal} className="close-button">✕</button>
            </div>

            <div className="turno-modal-body">
              <div className="turno-info">
                <p><strong>Data:</strong> {formatDate(selectedTurno.data)}</p>
                <p><strong>Orario:</strong> {selectedTurno.turno_inizio} - {selectedTurno.turno_fine}</p>
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
                  placeholder="Aggiungi una nota..."
                />
              </div>
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
                disabled={!selectedUserId}
              >
                {selectedTurno.assegnato ? 'Modifica' : 'Assegna'} Turno
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Turni;