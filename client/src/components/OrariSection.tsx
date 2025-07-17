import React, { useState, useEffect } from 'react';
import '../style/orari.css';

interface FasciaOraria {
  id: number;
  giorno: string;
  ora_inizio: string;
  ora_fine: string;
}

interface OrarioGiorno {
  giorno: string;
  fasce: FasciaOraria[];
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
  data: any[];
  count?: number;
  message?: string;
}

const OrariSection: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [orari, setOrari] = useState<OrarioGiorno[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Mappa delle icone per ogni giorno
  const iconeGiorni: { [key: string]: string } = {
    'lunedì': '📚',
    'martedì': '🌙',
    'mercoledì': '⚠️',
    'giovedì': '🌙',
    'venerdì': '📚',
    'sabato': '🎯',
    'domenica': '🏖️'
  };

  // Funzione per raggruppare le fasce orarie per giorno
  const raggruppaOrariPerGiorno = (fasceOrarie: FasciaOraria[]): OrarioGiorno[] => {
    const gruppi: { [key: string]: FasciaOraria[] } = {};
    
    fasceOrarie.forEach(fascia => {
      if (!gruppi[fascia.giorno]) {
        gruppi[fascia.giorno] = [];
      }
      gruppi[fascia.giorno].push(fascia);
    });

    return Object.entries(gruppi).map(([giorno, fasce]) => ({
      giorno: giorno.charAt(0).toUpperCase() + giorno.slice(1),
      fasce,
      icona: iconeGiorni[giorno] || '📅',
      nota: determineNota(fasce)
    }));
  };

  // Funzione per determinare la nota in base agli orari
  const determineNota = (fasce: FasciaOraria[]): string | undefined => {
    if (fasce.length > 1) {
      return 'Apertura serale';
    }
    
    // Controlla se c'è una chiusura anticipata (prima delle 19:00)
    const hasEarlyClose = fasce.some(fascia => {
      const oraFine = fascia.ora_fine.split(':');
      const ore = parseInt(oraFine[0]);
      return ore < 19;
    });
    
    if (hasEarlyClose) {
      return 'Chiusura anticipata';
    }
    
    return undefined;
  };

  // Funzione per formattare gli orari di un giorno
  const formatOrari = (fasce: FasciaOraria[]): string => {
    return fasce.map(fascia => 
      `${fascia.ora_inizio.slice(0, 5)} - ${fascia.ora_fine.slice(0, 5)}`
    ).join(' + ');
  };

  // Carica gli orari dal database
  useEffect(() => {
    const fetchOrari = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch('/api/orari_settimana');
        const data: ApiResponse = await response.json();
        
        if (data.success) {
          const orariRaggruppati = raggruppaOrariPerGiorno(data.data);
          setOrari(orariRaggruppati);
        } else {
          setError(data.message || 'Errore nel caricamento degli orari');
        }
      } catch (err) {
        setError('Errore di connessione nel caricamento degli orari');
        console.error('Errore nel fetch degli orari:', err);
      }
    };

    fetchOrari();
  }, []);

  // Carica gli utenti (mantenuto dal codice originale)
  useEffect(() => {
    const fetchUsers = async () => {
      try {
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

  // Funzione per ottenere il periodo corrente (puoi personalizzarla)
  const getCurrentPeriod = (): string => {
    const now = new Date();
    const day = now.getDate();
    //const month = now.getMonth() + 1;
    const monthName = now.toLocaleDateString('it-IT', { month: 'long' });
    
    return `${day}-${day + 4} ${monthName}`;
  };

  return (
    <section className="orari-full-width">
      <div className="orari-container">
        <h2>Orari di Apertura {getCurrentPeriod()} ☀️</h2>
        
        {loading && orari.length === 0 ? (
          <div className="loading">Caricamento orari...</div>
        ) : error && orari.length === 0 ? (
          <div className="error">❌ {error}</div>
        ) : (
          <div className="orari-list">
            {orari.map((item, index) => (
              <div key={index} className="orario-item">
                <span className="icona">{item.icona}</span>
                <div className="testo">
                  <strong>{item.giorno}:</strong> {formatOrari(item.fasce)}
                  {item.nota && <span className="nota"> ({item.nota})</span>}
                </div>
              </div>
            ))}
          </div>
        )}
        
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