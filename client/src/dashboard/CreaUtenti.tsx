import React, { useState, useEffect } from 'react';

interface NewUser {
  name: string;
  surname: string;
  tel: string;
  level: number;
  password: string;
}

const CreaUtenti: React.FC = () => {
  const [canCreateUsers, setCanCreateUsers] = useState(false);
  const [newUser, setNewUser] = useState<NewUser>({
    name: '',
    surname: '',
    tel: '',
    level: 2,
    password: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    // Controlla il livello dell'utente corrente
    const userData = localStorage.getItem('user');
    if (userData) {
      const user = JSON.parse(userData);
      // Mostra il componente solo se l'utente ha livello 0 o 1
      setCanCreateUsers(user.level < 2);
    }
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setNewUser(prev => ({
      ...prev,
      [name]: name === 'level' ? parseInt(value) : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validazione lato client
    if (!newUser.name.trim() || !newUser.surname.trim() || !newUser.tel.trim() || !newUser.password) {
      setMessage({ type: 'error', text: 'Tutti i campi sono obbligatori' });
      return;
    }

    setIsSubmitting(true);
    setMessage(null);

    try {
      const sessionToken = localStorage.getItem('sessionToken');
      
      const response = await fetch('/api/create-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionToken}`
        },
        body: JSON.stringify(newUser)
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({ type: 'success', text: 'Utente creato con successo!' });
        // Resetta il form
        setNewUser({
          name: '',
          surname: '',
          tel: '',
          level: 2,
          password: ''
        });
      } else {
        setMessage({ type: 'error', text: data.error || 'Errore durante la creazione dell\'utente' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Errore di connessione al server' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Se l'utente non ha i permessi, non mostra nulla
  if (!canCreateUsers) {
    return null;
  }

  return (
    <div className="crea-utenti-container">
      <div className="crea-utenti-card">
        <h2 className="crea-utenti-title">Crea Nuovo Utente</h2>
        
        {message && (
          <div className={`message ${message.type}`}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="crea-utenti-form">
          <div className="form-group">
            <label htmlFor="name">Nome:</label>
            <input
              type="text"
              id="name"
              name="name"
              value={newUser.name}
              onChange={handleInputChange}
              required
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label htmlFor="surname">Cognome:</label>
            <input
              type="text"
              id="surname"
              name="surname"
              value={newUser.surname}
              onChange={handleInputChange}
              required
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label htmlFor="tel">Telefono:</label>
            <input
              type="tel"
              id="tel"
              name="tel"
              value={newUser.tel}
              onChange={handleInputChange}
              required
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label htmlFor="level">Livello:</label>
            <select
              id="level"
              name="level"
              value={newUser.level}
              onChange={handleInputChange}
              required
              className="form-select"
            >
              <option value={0}>Admin (0)</option>
              <option value={1}>Moderatore (1)</option>
              <option value={2}>Utente (2)</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="password">Password:</label>
            <input
              type="password"
              id="password"
              name="password"
              value={newUser.password}
              onChange={handleInputChange}
              required
              className="form-input"
            />
          </div>

          <button 
            type="submit" 
            disabled={isSubmitting}
            className="submit-button"
          >
            {isSubmitting ? 'Creazione in corso...' : 'Crea Utente'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default CreaUtenti;