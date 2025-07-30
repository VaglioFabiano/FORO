import React, { useState, useEffect } from 'react';
import '../style/visualizzaUtenti.css';

interface User {
  id: number;
  name: string;
  surname: string;
  username: string;
  tel: string;
  level: number;
  created_at: string;
  last_login?: string;
  telegram_chat_id?: number;
}

interface EditingUser extends User {
  password?: string;
  confirmPassword?: string;
}

interface Message {
  type: 'success' | 'error' | 'info';
  text: string;
}

const VisualizzaUtenti: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [message, setMessage] = useState<Message | null>(null);
  const [filterLevel, setFilterLevel] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('id'); // 'id', 'name', 'surname'
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [editingUser, setEditingUser] = useState<EditingUser | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const levelNames: Record<number, string> = {
    0: 'Direttivo', // Admin mostrati come Direttivo
    1: 'Direttivo',
    2: 'Sociə Organizzatorə',
    3: 'Sociə',
    4: 'Volontariə'
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    filterAndSortUsers();
  }, [users, filterLevel, sortBy, sortOrder]);

  const fetchUsers = async () => {
    setLoading(true);
    setMessage(null);
    
    try {
      const response = await fetch('/api/user', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Errore ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Errore nel caricamento utenti');
      }

      if (!data.users) {
        throw new Error('Formato dati non valido');
      }

      setUsers(data.users);
      setMessage({ 
        type: 'success', 
        text: `Caricati ${data.users.length} utenti` 
      });
    } catch (error) {
      console.error('Fetch users error:', error);
      setMessage({ 
        type: 'error', 
        text: error instanceof Error ? error.message : 'Errore di connessione al server'
      });
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const filterAndSortUsers = () => {
    let filtered = users.filter(user => {
      // Solo filtro per livello, nessuna ricerca testuale
      let matchesLevel = false;
      if (filterLevel === 'all') {
        matchesLevel = true;
      } else if (filterLevel === '1') {
        // Se filtriamo per "Direttivo", includiamo sia livello 0 che livello 1
        matchesLevel = user.level === 0 || user.level === 1;
      } else {
        matchesLevel = user.level === parseInt(filterLevel);
      }

      return matchesLevel;
    });

    // Ordina i risultati
    filtered.sort((a, b) => {
      let valueA: string | number;
      let valueB: string | number;

      switch (sortBy) {
        case 'name':
          valueA = a.name.toLowerCase();
          valueB = b.name.toLowerCase();
          break;
        case 'surname':
          valueA = a.surname.toLowerCase();
          valueB = b.surname.toLowerCase();
          break;
        case 'id':
        default:
          valueA = a.id;
          valueB = b.id;
          break;
      }

      if (sortOrder === 'asc') {
        return valueA < valueB ? -1 : valueA > valueB ? 1 : 0;
      } else {
        return valueA > valueB ? -1 : valueA < valueB ? 1 : 0;
      }
    });

    setFilteredUsers(filtered);
  };

  const handleSort = (field: string) => {
    if (sortBy === field) {
      // Se clicchiamo sulla stessa colonna, inverti l'ordine
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      // Se clicchiamo su una nuova colonna, ordina ascendente
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const getSortIcon = (field: string) => {
    if (sortBy !== field) return '↕️'; // Icona neutra
    return sortOrder === 'asc' ? '↑' : '↓';
  };

  const openEditModal = (user: User) => {
    setEditingUser({
      ...user,
      password: '',
      confirmPassword: ''
    });
    setIsModalOpen(true);
  };

  const closeEditModal = () => {
    setEditingUser(null);
    setIsModalOpen(false);
    setMessage(null);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    if (!editingUser) return;

    const { name, value } = e.target;
    setEditingUser(prev => ({
      ...prev!,
      [name]: name === 'level' ? parseInt(value) : value
    }));
  };

  const validateEditForm = (): boolean => {
    if (!editingUser) return false;

    if (!editingUser.name.trim() || !editingUser.surname.trim()) {
      setMessage({ type: 'error', text: 'Nome e cognome sono obbligatori' });
      return false;
    }

    if (!editingUser.username.trim()) {
      setMessage({ type: 'error', text: 'Username è obbligatorio' });
      return false;
    }

    if (!editingUser.tel.trim() || !/^\d+$/.test(editingUser.tel)) {
      setMessage({ type: 'error', text: 'Telefono non valido' });
      return false;
    }

    if (editingUser.password && editingUser.password.length < 6) {
      setMessage({ type: 'error', text: 'Password troppo corta (min 6 caratteri)' });
      return false;
    }

    if (editingUser.password && editingUser.password !== editingUser.confirmPassword) {
      setMessage({ type: 'error', text: 'Le password non corrispondono' });
      return false;
    }

    return true;
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateEditForm() || !editingUser) return;

    setIsSubmitting(true);
    setMessage(null);

    try {
      const updateData: any = {
        id: editingUser.id,
        name: editingUser.name.trim(),
        surname: editingUser.surname.trim(),
        username: editingUser.username.trim(),
        tel: editingUser.tel.trim(),
        level: editingUser.level
      };

      if (editingUser.password && editingUser.password.trim()) {
        updateData.password = editingUser.password;
      }

      const response = await fetch('/api/user', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateData)
      });

      if (!response.ok) {
        throw new Error(`Errore ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Errore durante l\'aggiornamento');
      }

      setMessage({ 
        type: 'success', 
        text: `Utente ${data.user.name} aggiornato con successo!` 
      });

      await fetchUsers();
      closeEditModal();

    } catch (error) {
      console.error('Errore aggiornamento utente:', error);
      setMessage({ 
        type: 'error', 
        text: error instanceof Error ? error.message : 'Errore di connessione' 
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteUser = async (userId: number, userName: string) => {
    if (!window.confirm(`Sei sicuro di voler eliminare l'utente ${userName}?`)) {
      return;
    }

    try {
      const response = await fetch('/api/user', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ id: userId })
      });

      if (!response.ok) {
        throw new Error(`Errore ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Errore durante l\'eliminazione');
      }

      setMessage({ 
        type: 'success', 
        text: `Utente ${userName} eliminato con successo!` 
      });

      await fetchUsers();

    } catch (error) {
      console.error('Errore eliminazione utente:', error);
      setMessage({ 
        type: 'error', 
        text: error instanceof Error ? error.message : 'Errore di connessione' 
      });
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Mai';
    return new Date(dateString).toLocaleDateString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="visualizzautenti-container">
        <div className="visualizzautenti-loading-container">
          <div className="visualizzautenti-loading-spinner"></div>
          <p>Caricamento utenti...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="visualizzautenti-container">
      <div className="visualizzautenti-header">
        <h2>👥 Gestione Utenti</h2>
        <button onClick={fetchUsers} className="visualizzautenti-refresh-button">
          🔄 Aggiorna
        </button>
      </div>

      {message && (
        <div className={`visualizzautenti-message ${message.type}`}>
          <div className="visualizzautenti-message-icon">
            {message.type === 'success' ? '✅' : message.type === 'error' ? '❌' : 'ℹ️'}
          </div>
          <span>{message.text}</span>
        </div>
      )}

      <div className="visualizzautenti-filters">
        <div className="visualizzautenti-filter-group">
          <label>Filtra per Livello</label>
          <select
            value={filterLevel}
            onChange={(e) => setFilterLevel(e.target.value)}
            className="visualizzautenti-level-filter"
          >
            <option value="all">Tutti i livelli</option>
            <option value="1">Direttivo</option>
            <option value="2">Sociə Organizzatorə</option>
            <option value="3">Sociə</option>
            <option value="4">Volontariə</option>
          </select>
        </div>
        <div className="visualizzautenti-filter-group">
          <label>Ordina per</label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="visualizzautenti-sort-select"
          >
            <option value="id">ID</option>
            <option value="name">Nome</option>
            <option value="surname">Cognome</option>
          </select>
        </div>
        <div className="visualizzautenti-filter-group">
          <label>Ordine</label>
          <button
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            className="visualizzautenti-sort-button"
            title={`Ordina ${sortOrder === 'asc' ? 'decrescente' : 'crescente'}`}
          >
            {sortOrder === 'asc' ? '↑ Crescente' : '↓ Decrescente'}
          </button>
        </div>
      </div>

      <div className="visualizzautenti-stats">
        <span>Trovati {filteredUsers.length} utenti di {users.length} totali</span>
      </div>

      <div className="visualizzautenti-table-container">
        <table className="visualizzautenti-table">
          <thead>
            <tr>
              <th onClick={() => handleSort('id')} style={{ cursor: 'pointer' }}>
                ID {getSortIcon('id')}
              </th>
              <th onClick={() => handleSort('name')} style={{ cursor: 'pointer' }}>
                Nome {getSortIcon('name')}
              </th>
              <th onClick={() => handleSort('surname')} style={{ cursor: 'pointer' }}>
                Cognome {getSortIcon('surname')}
              </th>
              <th>Username</th>
              <th>Telefono</th>
              <th>Livello</th>
              <th>Creato il</th>
              <th>Ultimo Login</th>
              <th>Azioni</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map(user => (
              <tr key={user.id}>
                <td>{user.id}</td>
                <td>{user.name}</td>
                <td>{user.surname}</td>
                <td>{user.username}</td>
                <td>{user.tel}</td>
                <td>
                  <span className={`visualizzautenti-level-badge visualizzautenti-level-${user.level === 0 ? '1' : user.level}`}>
                    {levelNames[user.level] || `Livello ${user.level}`}
                  </span>
                </td>
                <td>{formatDate(user.created_at)}</td>
                <td>{formatDate(user.last_login || '')}</td>
                <td>
                  <div className="visualizzautenti-actions">
                    <button
                      onClick={() => openEditModal(user)}
                      className="visualizzautenti-edit-button"
                      title="Modifica utente"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => handleDeleteUser(user.id, `${user.name} ${user.surname}`)}
                      className="visualizzautenti-delete-button"
                      title="Elimina utente"
                    >
                      🗑️
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredUsers.length === 0 && (
          <div className="visualizzautenti-no-users">
            <p>Nessun utente trovato con i filtri selezionati</p>
          </div>
        )}
      </div>

      {isModalOpen && editingUser && (
        <div className="visualizzautenti-modal-overlay" onClick={closeEditModal}>
          <div className="visualizzautenti-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="visualizzautenti-modal-header">
              <h3>Modifica Utente</h3>
              <button onClick={closeEditModal} className="visualizzautenti-close-button">✕</button>
            </div>

            {message && (
              <div className={`visualizzautenti-message ${message.type}`}>
                <div className="visualizzautenti-message-icon">
                  {message.type === 'success' ? '✅' : '❌'}
                </div>
                <span>{message.text}</span>
              </div>
            )}

            <form onSubmit={handleUpdateUser} className="visualizzautenti-edit-form">
              <div className="visualizzautenti-form-row">
                <div className="visualizzautenti-form-group">
                  <label htmlFor="edit-name">Nome</label>
                  <input
                    type="text"
                    id="edit-name"
                    name="name"
                    value={editingUser.name}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="visualizzautenti-form-group">
                  <label htmlFor="edit-surname">Cognome</label>
                  <input
                    type="text"
                    id="edit-surname"
                    name="surname"
                    value={editingUser.surname}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>

              <div className="visualizzautenti-form-row">
                <div className="visualizzautenti-form-group">
                  <label htmlFor="edit-username">Username</label>
                  <input
                    type="text"
                    id="edit-username"
                    name="username"
                    value={editingUser.username}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="visualizzautenti-form-group">
                  <label htmlFor="edit-tel">Telefono</label>
                  <input
                    type="tel"
                    id="edit-tel"
                    name="tel"
                    value={editingUser.tel}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>

              <div className="visualizzautenti-form-row">
                <div className="visualizzautenti-form-group">
                  <label htmlFor="edit-level">Livello</label>
                  <select
                    id="edit-level"
                    name="level"
                    value={editingUser.level}
                    onChange={handleInputChange}
                    required
                  >
                    <option value={0}>Direttivo (Admin)</option>
                    <option value={1}>Direttivo</option>
                    <option value={2}>Sociə Organizzatorə</option>
                    <option value={3}>Sociə</option>
                    <option value={4}>Volontariə</option>
                  </select>
                </div>
                <div className="visualizzautenti-form-group">
                  {/* Spazio vuoto per mantenere il layout a griglia */}
                </div>
              </div>

              <div className="visualizzautenti-form-row">
                <div className="visualizzautenti-form-group">
                  <label htmlFor="edit-password">Nuova Password (opzionale)</label>
                  <input
                    type="password"
                    id="edit-password"
                    name="password"
                    value={editingUser.password || ''}
                    onChange={handleInputChange}
                    placeholder="Lascia vuoto se non vuoi cambiare"
                  />
                </div>
                <div className="visualizzautenti-form-group">
                  <label htmlFor="edit-confirmPassword">Conferma Password</label>
                  <input
                    type="password"
                    id="edit-confirmPassword"
                    name="confirmPassword"
                    value={editingUser.confirmPassword || ''}
                    onChange={handleInputChange}
                    placeholder="Conferma la nuova password"
                  />
                </div>
              </div>

              <div className="visualizzautenti-modal-actions">
                <button
                  type="button"
                  onClick={closeEditModal}
                  className="visualizzautenti-cancel-button"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`visualizzautenti-submit-button ${isSubmitting ? 'loading' : ''}`}
                >
                  {isSubmitting ? (
                    <>
                      <span className="visualizzautenti-loading-spinner"></span>
                      Aggiornamento...
                    </>
                  ) : (
                    'Aggiorna Utente'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default VisualizzaUtenti;