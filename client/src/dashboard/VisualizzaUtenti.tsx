import React, { useState, useEffect } from 'react';
import '../style/visualizzaUtenti.css';

interface User {
  id: number;
  name: string;
  surname: string;
  tel: string;
  level: number;
  created_at: string;
}

interface ApiResponse {
  success: boolean;
  users: User[];
  error?: string;
}

const VisualizzaUtenti: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [levelFilter, setLevelFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'name' | 'surname' | 'level' | 'created_at'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);

      const user = localStorage.getItem('user');
      if (!user) {
        throw new Error('Utente non autenticato');
      }

      const userData = JSON.parse(user);
      const tempToken = btoa(JSON.stringify({
        userId: userData.id,
        tel: userData.tel,
        timestamp: new Date().getTime()
      }));

      const response = await fetch('/api/get-users', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${tempToken}`,
          'Content-Type': 'application/json'
        }
      });

      const data: ApiResponse = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Errore durante il caricamento degli utenti');
      }

      if (data.success) {
        setUsers(data.users);
      } else {
        throw new Error(data.error || 'Errore sconosciuto');
      }

    } catch (err) {
      console.error('Errore nel caricamento utenti:', err);
      setError(err instanceof Error ? err.message : 'Errore sconosciuto');
    } finally {
      setLoading(false);
    }
  };

  const getLevelText = (level: number): string => {
    switch (level) {
      case 0: return 'Amministratore';
      case 1: return 'Manager';
      case 2: return 'Operatore';
      case 3: return 'Utente';
      default: return 'Sconosciuto';
    }
  };

  const getLevelColor = (level: number): string => {
    switch (level) {
      case 0: return '#e74c3c'; // Rosso
      case 1: return '#f39c12'; // Arancione
      case 2: return '#3498db'; // Blu
      case 3: return '#2ecc71'; // Verde
      default: return '#95a5a6'; // Grigio
    }
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('it-IT', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Filtra e ordina gli utenti
  const filteredAndSortedUsers = users
    .filter(user => {
      const matchesSearch = 
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.surname.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.tel.includes(searchTerm);
      
      const matchesLevel = levelFilter === 'all' || user.level.toString() === levelFilter;
      
      return matchesSearch && matchesLevel;
    })
    .sort((a, b) => {
      let aValue: any = a[sortBy];
      let bValue: any = b[sortBy];
      
      if (sortBy === 'created_at') {
        aValue = new Date(aValue).getTime();
        bValue = new Date(bValue).getTime();
      } else if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }
      
      if (sortOrder === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

  const handleSort = (column: typeof sortBy) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };

  if (loading) {
    return (
      <div className="visualizza-utenti-container">
        <div className="loading-visualizza-utenti">
          <div className="loading-spinner-visualizza-utenti"></div>
          <p>Caricamento utenti...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="visualizza-utenti-container">
        <div className="error-visualizza-utenti">
          <h2>❌ Errore</h2>
          <p>{error}</p>
          <button onClick={fetchUsers} className="retry-button-visualizza-utenti">
            Riprova
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="visualizza-utenti-container">
      <div className="header-visualizza-utenti">
        <h1>👥 Visualizza Utenti</h1>
        <p>Totale utenti: {users.length} • Visualizzati: {filteredAndSortedUsers.length}</p>
      </div>

      <div className="filters-visualizza-utenti">
        <div className="search-box-visualizza-utenti">
          <input
            type="text"
            placeholder="Cerca per nome, cognome o telefono..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input-visualizza-utenti"
          />
        </div>

        <div className="filter-group-visualizza-utenti">
          <label htmlFor="level-filter">Filtra per livello:</label>
          <select
            id="level-filter"
            value={levelFilter}
            onChange={(e) => setLevelFilter(e.target.value)}
            className="level-filter-visualizza-utenti"
          >
            <option value="all">Tutti i livelli</option>
            <option value="0">Amministratore (0)</option>
            <option value="1">Manager (1)</option>
            <option value="2">Operatore (2)</option>
            <option value="3">Utente (3)</option>
          </select>
        </div>

        <button onClick={fetchUsers} className="refresh-button-visualizza-utenti">
          🔄 Aggiorna
        </button>
      </div>

      {filteredAndSortedUsers.length === 0 ? (
        <div className="no-users-visualizza-utenti">
          <h3>Nessun utente trovato</h3>
          <p>Prova a modificare i filtri di ricerca.</p>
        </div>
      ) : (
        <div className="table-container-visualizza-utenti">
          <table className="users-table-visualizza-utenti">
            <thead>
              <tr>
                <th onClick={() => handleSort('name')} className="sortable-visualizza-utenti">
                  Nome {sortBy === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th onClick={() => handleSort('surname')} className="sortable-visualizza-utenti">
                  Cognome {sortBy === 'surname' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th>Telefono</th>
                <th onClick={() => handleSort('level')} className="sortable-visualizza-utenti">
                  Livello {sortBy === 'level' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th onClick={() => handleSort('created_at')} className="sortable-visualizza-utenti">
                  Data Creazione {sortBy === 'created_at' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredAndSortedUsers.map((user) => (
                <tr key={user.id}>
                  <td className="name-cell-visualizza-utenti">{user.name}</td>
                  <td className="surname-cell-visualizza-utenti">{user.surname}</td>
                  <td className="tel-cell-visualizza-utenti">{user.tel}</td>
                  <td className="level-cell-visualizza-utenti">
                    <span 
                      className="level-badge-visualizza-utenti"
                      style={{ backgroundColor: getLevelColor(user.level) }}
                    >
                      {user.level} - {getLevelText(user.level)}
                    </span>
                  </td>
                  <td className="date-cell-visualizza-utenti">{formatDate(user.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default VisualizzaUtenti;