import React, { useState, useEffect } from 'react';
import '../style/orari.css';

interface Orario {
  giorno: string;
  orario: string;
  icona: string;
  nota?: string;
}

interface User {
  id: number;
  name: string;
  surname: string;
  tel: string;
  level: number;
}

interface ApiResponse {
  success: boolean;
  data: User[];
  count: number;
  message?: string;
}

const OrariSection: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const orariSettimana: Orario[] = [
    { giorno: 'Lunedì 23 giugno', orario: '09:00 - 19:30', icona: '📚' },
    { giorno: 'Martedì 24 giugno', orario: '09:00 - 19:30 + 21:00-24:00', icona: '🌙', nota: 'Apertura serale' },
    { giorno: 'Mercoledì 25 giugno', orario: '09:00 - 18:00', icona: '⚠️', nota: 'Chiusura anticipata' },
    { giorno: 'Giovedì 26 giugno', orario: '09:00 - 19:30 + 21:30-23:30', icona: '🌙', nota: 'Apertura serale' },
    { giorno: 'Venerdì 27 giugno', orario: '09:00 - 19:30', icona: '📚' }
  ];

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch('/api/users');
        const data: ApiResponse = await response.json();
        
        if (data.success) {
          setUsers(data.data);
        } else {
          setError(data.message || 'Errore nel caricamento degli utenti');
        }
      } catch (err) {
        setError('Errore di connessione');
        console.error('Errore nel fetch degli utenti:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  return (
    <section className="orari-full-width">
      <div className="orari-container">
        <h2>Orari di Apertura 23-27 giugno ☀️</h2>
        <div className="orari-list">
          {orariSettimana.map((item, index) => (
            <div key={index} className="orario-item">
              <span className="icona">{item.icona}</span>
              <div className="testo">
                <strong>{item.giorno}:</strong> {item.orario}
                {item.nota && <span className="nota"> ({item.nota})</span>}
              </div>
            </div>
          ))}
        </div>
        <div className="avviso">
          Disponibili le pagode per studiare all'aperto :) 
          <br />
          Rimanete collegatə per tutti gli aggiornamenti 😘
        </div>
        <div className="users">
          <h3>Lista degli Utenti ({users.length})</h3>
          {loading ? (
            <div className="loading">Caricamento utenti...</div>
          ) : error ? (
            <div className="error">❌ {error}</div>
          ) : users.length === 0 ? (
            <div className="no-users">Nessun utente trovato</div>
          ) : (
            <div className="users-list">
              {users.map((user) => (
                <div key={user.id} className="user-item">
                  <div className="user-info">
                    <strong>{user.name}</strong>
                    <span className="user-email">{user.tel}</span>
                    <span className="user-date">
                      Registrato: {formatDate(user.name)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default OrariSection;