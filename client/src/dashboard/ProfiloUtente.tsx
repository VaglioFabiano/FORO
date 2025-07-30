import React, { useState, useEffect } from 'react';
import '../style/profiloUtente.css';

interface User {
  id: number;
  name: string;
  surname: string;
  username: string;
  tel: string;
  level: number;
  created_at: string;
  last_login?: string;
}

interface Message {
  type: 'success' | 'error' | 'info';
  text: string;
}

const ProfiloUtente: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    surname: '',
    username: '',
    tel: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [message, setMessage] = useState<Message | null>(null);

  const levelNames: Record<number, string> = {
    0: 'Direttivo',
    1: 'Direttivo',
    2: 'Sociə Organizzatorə',
    3: 'Sociə',
    4: 'Volontariə'
  };

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = () => {
    try {
      const userData = localStorage.getItem('user');
      if (!userData) {
        throw new Error('Dati utente non trovati');
      }

      const userObj = JSON.parse(userData);
      setUser(userObj);
      setFormData({
        name: userObj.name || '',
        surname: userObj.surname || '',
        username: userObj.username || '',
        tel: userObj.tel || '',
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    } catch (error) {
      console.error('Errore nel caricamento dati utente:', error);
      setMessage({
        type: 'error',
        text: 'Errore nel caricamento dei dati utente'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const validateForm = (): boolean => {
    if (!formData.name.trim() || !formData.surname.trim()) {
      setMessage({ type: 'error', text: 'Nome e cognome sono obbligatori' });
      return false;
    }

    if (!formData.username.trim()) {
      setMessage({ type: 'error', text: 'Username è obbligatorio' });
      return false;
    }

    if (!formData.tel.trim() || !/^\d+$/.test(formData.tel)) {
      setMessage({ type: 'error', text: 'Telefono non valido (solo numeri)' });
      return false;
    }

    // Se si vuole cambiare la password
    if (formData.newPassword || formData.confirmPassword) {
      if (!formData.currentPassword) {
        setMessage({ type: 'error', text: 'Inserisci la password attuale per cambiarla' });
        return false;
      }

      if (formData.newPassword.length < 6) {
        setMessage({ type: 'error', text: 'La nuova password deve essere di almeno 6 caratteri' });
        return false;
      }

      if (formData.newPassword !== formData.confirmPassword) {
        setMessage({ type: 'error', text: 'Le nuove password non corrispondono' });
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm() || !user) return;

    setIsSubmitting(true);
    setMessage(null);

    try {
      const updateData: any = {
        id: user.id,
        name: formData.name.trim(),
        surname: formData.surname.trim(),
        username: formData.username.trim(),
        tel: formData.tel.trim(),
        level: user.level // Mantieni il livello attuale
      };

      // Aggiungi la password solo se specificata
      if (formData.newPassword && formData.newPassword.trim()) {
        updateData.password = formData.newPassword;
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

      // Aggiorna i dati nel localStorage
      const updatedUser = {
        ...user,
        name: data.user.name,
        surname: data.user.surname,
        username: data.user.username,
        tel: data.user.tel
      };

      localStorage.setItem('user', JSON.stringify(updatedUser));
      setUser(updatedUser);

      // Reset campi password
      setFormData(prev => ({
        ...prev,
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      }));

      setMessage({ 
        type: 'success', 
        text: 'Profilo aggiornato con successo!' 
      });

    } catch (error) {
      console.error('Errore aggiornamento profilo:', error);
      setMessage({ 
        type: 'error', 
        text: error instanceof Error ? error.message : 'Errore di connessione' 
      });
    } finally {
      setIsSubmitting(false);
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
      <div className="profilo-utente-container">
        <div className="profilo-utente-loading-container">
          <div className="profilo-utente-loading-spinner"></div>
          <p>Caricamento profilo...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="profilo-utente-container">
        <div className="profilo-utente-error">
          <p>❌ Errore nel caricamento del profilo utente</p>
        </div>
      </div>
    );
  }

  return (
    <div className="profilo-utente-container">
      <div className="profilo-utente-card">
        <div className="profilo-utente-header">
          <h2>👤 Il Mio Profilo</h2>
          <div className="profilo-utente-level-badge">
            <span className={`level-badge level-${user.level === 0 ? '1' : user.level}`}>
              {levelNames[user.level] || `Livello ${user.level}`}
            </span>
          </div>
        </div>

        {message && (
          <div className={`profilo-utente-message ${message.type}`}>
            <div className="profilo-utente-message-icon">
              {message.type === 'success' ? '✅' : message.type === 'error' ? '❌' : 'ℹ️'}
            </div>
            <span>{message.text}</span>
          </div>
        )}

        <div className="profilo-utente-info">
          <div className="info-item">
            <strong>ID Utente:</strong> {user.id}
          </div>
          <div className="info-item">
            <strong>Registrato il:</strong> {formatDate(user.created_at)}
          </div>
          <div className="info-item">
            <strong>Ultimo accesso:</strong> {formatDate(user.last_login || '')}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="profilo-utente-form">
          <div className="form-section">
            <h3>📝 Informazioni Personali</h3>
            
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="name">Nome</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  placeholder="Il tuo nome"
                />
              </div>
              <div className="form-group">
                <label htmlFor="surname">Cognome</label>
                <input
                  type="text"
                  id="surname"
                  name="surname"
                  value={formData.surname}
                  onChange={handleInputChange}
                  required
                  placeholder="Il tuo cognome"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="username">Username</label>
                <input
                  type="text"
                  id="username"
                  name="username"
                  value={formData.username}
                  onChange={handleInputChange}
                  required
                  placeholder="Il tuo username"
                />
              </div>
              <div className="form-group">
                <label htmlFor="tel">Telefono</label>
                <input
                  type="tel"
                  id="tel"
                  name="tel"
                  value={formData.tel}
                  onChange={handleInputChange}
                  required
                  placeholder="Il tuo numero di telefono"
                />
              </div>
            </div>
          </div>

          <div className="form-section">
            <h3>🔒 Cambia Password</h3>
            <p className="section-description">Lascia vuoti questi campi se non vuoi cambiare la password</p>
            
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="currentPassword">Password Attuale</label>
                <input
                  type="password"
                  id="currentPassword"
                  name="currentPassword"
                  value={formData.currentPassword}
                  onChange={handleInputChange}
                  placeholder="La tua password attuale"
                />
              </div>
              <div className="form-group">
                {/* Spazio vuoto per layout */}
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="newPassword">Nuova Password</label>
                <input
                  type="password"
                  id="newPassword"
                  name="newPassword"
                  value={formData.newPassword}
                  onChange={handleInputChange}
                  placeholder="La tua nuova password"
                />
              </div>
              <div className="form-group">
                <label htmlFor="confirmPassword">Conferma Nuova Password</label>
                <input
                  type="password"
                  id="confirmPassword"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  placeholder="Conferma la nuova password"
                />
              </div>
            </div>
          </div>

          <div className="form-actions">
            <button
              type="submit"
              disabled={isSubmitting}
              className={`submit-button ${isSubmitting ? 'loading' : ''}`}
            >
              {isSubmitting ? (
                <>
                  <span className="loading-spinner"></span>
                  Aggiornamento...
                </>
              ) : (
                <>
                  💾 Salva Modifiche
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProfiloUtente;