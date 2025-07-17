import React, { useState, useEffect } from 'react';
import '../style/creaUtenti.css';

interface User {
  id: number;
  level: number;
  name: string;
}

interface NewUser {
  name: string;
  surname: string;
  tel: string;
  level: number;
  password: string;
  confirmPassword?: string;
}

interface Message {
  type: 'success' | 'error';
  text: string;
}

const CreaUtenti: React.FC = () => {
  const [canCreateUsers, setCanCreateUsers] = useState<boolean>(false);
  const [newUser, setNewUser] = useState<NewUser>({
    name: '',
    surname: '',
    tel: '',
    level: 3,
    password: '',
    confirmPassword: ''
  });
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [message, setMessage] = useState<Message | null>(null);

  useEffect(() => {
    const checkPermissions = () => {
      // Controllo semplificato basato sui dati nel localStorage
      const userData = localStorage.getItem('user');
      const loginTime = localStorage.getItem('loginTime');
      const rememberMe = localStorage.getItem('rememberMe') === 'true';
      
      if (userData && loginTime) {
        try {
          const now = new Date().getTime();
          const loginTimestamp = parseInt(loginTime);
          const expirationTime = rememberMe ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
          
          if (now - loginTimestamp < expirationTime) {
            const user: User = JSON.parse(userData);
            setCanCreateUsers(user.level < 2);
          } else {
            // Sessione scaduta
            setCanCreateUsers(false);
          }
        } catch (error) {
          console.error('Error parsing user data:', error);
          setCanCreateUsers(false);
        }
      } else {
        setCanCreateUsers(false);
      }
    };

    checkPermissions();
    
    // Rimuovi il listener per storage events dato che ora gestiamo tutto localmente
    const interval = setInterval(checkPermissions, 60000); // Controlla ogni minuto
    
    return () => {
      clearInterval(interval);
    };
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setNewUser(prev => ({
      ...prev,
      [name]: name === 'level' ? parseInt(value) : value
    }));
  };

  const validateForm = (): boolean => {
    if (!newUser.name.trim() || !newUser.surname.trim()) {
      setMessage({ type: 'error', text: 'Nome e cognome sono obbligatori' });
      return false;
    }

    if (!newUser.tel.trim() || !/^\d+$/.test(newUser.tel)) {
      setMessage({ type: 'error', text: 'Telefono non valido' });
      return false;
    }

    if (newUser.password.length < 6) {
      setMessage({ type: 'error', text: 'Password troppo corta (min 6 caratteri)' });
      return false;
    }

    if (newUser.password !== newUser.confirmPassword) {
      setMessage({ type: 'error', text: 'Le password non corrispondono' });
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsSubmitting(true);
    setMessage(null);

    try {
      // Crea un sessionToken temporaneo basato sui dati utente
      const userData = localStorage.getItem('user');
      const loginTime = localStorage.getItem('loginTime');
      
      if (!userData || !loginTime) {
        throw new Error('Sessione non valida');
      }

      // Genera un token temporaneo per la richiesta
      const user = JSON.parse(userData);
      const tempToken = btoa(JSON.stringify({
        userId: user.id,
        tel: user.tel,
        timestamp: loginTime
      }));

      const response = await fetch('/api/create_user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tempToken}`
        },
        body: JSON.stringify(newUser)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Errore durante la creazione');
      }

      setMessage({ 
        type: 'success', 
        text: `Utente ${data.user.name} creato con successo!` 
      });
      
      setNewUser({
        name: '',
        surname: '',
        tel: '',
        level: 3,
        password: '',
        confirmPassword: ''
      });

    } catch (error: unknown) {
      setMessage({ 
        type: 'error', 
        text: error instanceof Error ? error.message : 'Errore di connessione' 
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!canCreateUsers) {
    return (
      <div className="crea-utenti-container">
        <div className="no-permission-message">
          <div className="no-permission-icon">🔒</div>
          <h3>Accesso Negato</h3>
          <p>Non hai i permessi per creare utenti</p>
        </div>
      </div>
    );
  }

  return (
    <div className="crea-utenti-container">
      <div className="crea-utenti-card">
        <div className="card-header">
          <h2>Crea Nuovo Utente</h2>
          <div className="header-icon">👤</div>
        </div>
        
        {message && (
          <div className={`message ${message.type}`}>
            <div className="message-icon">
              {message.type === 'success' ? '✅' : '❌'}
            </div>
            <span>{message.text}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="crea-utenti-form">
          <div className="form-group">
            <label htmlFor="name">Nome</label>
            <input
              type="text"
              id="name"
              name="name"
              value={newUser.name}
              onChange={handleInputChange}
              required
              placeholder="Inserisci il nome"
            />
          </div>

          <div className="form-group">
            <label htmlFor="surname">Cognome</label>
            <input
              type="text"
              id="surname"
              name="surname"
              value={newUser.surname}
              onChange={handleInputChange}
              required
              placeholder="Inserisci il cognome"
            />
          </div>

          <div className="form-group">
            <label htmlFor="tel">Telefono</label>
            <input
              type="tel"
              id="tel"
              name="tel"
              value={newUser.tel}
              onChange={handleInputChange}
              required
              placeholder="Inserisci il numero di telefono"
            />
          </div>

          <div className="form-group">
            <label htmlFor="level">Livello</label>
            <select
              id="level"
              name="level"
              value={newUser.level}
              onChange={handleInputChange}
              required
            >
              <option value={0}>Sviluppatorə</option>
              <option value={1}>Direttivə</option>
              <option value={2}>Sociə</option>
              <option value={3}>Volontariə</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              value={newUser.password}
              onChange={handleInputChange}
              required
              placeholder="Inserisci la password"
            />
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Conferma Password</label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              value={newUser.confirmPassword || ''}
              onChange={handleInputChange}
              required
              placeholder="Conferma la password"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className={`submit-button ${isSubmitting ? 'loading' : ''}`}
          >
            {isSubmitting ? (
              <>
                <span className="loading-spinner"></span>
                Creazione in corso...
              </>
            ) : (
              'Crea Utente'
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default CreaUtenti;