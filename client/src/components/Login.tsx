import React, { useState, useEffect } from 'react';
import '../style/login.css';

interface LoginProps {
  onLoginSuccess: () => void;
}

interface LoginResponse {
  success: boolean;
  message: string;
  user?: {
    id: number;
    name: string;
    surname: string;
    username: string;
    tel: string;
    level: number;
  };
  error?: string;
}

const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Controlla se l'utente è già loggato al caricamento del componente
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    const loginTime = localStorage.getItem('loginTime');
    
    if (storedUser && loginTime) {
      const now = new Date().getTime();
      const loginTimestamp = parseInt(loginTime);
      const expirationTime = 24 * 60 * 60 * 1000; // 24 ore
      
      if (now - loginTimestamp < expirationTime) {
        // L'utente è ancora loggato
        onLoginSuccess();
      } else {
        // La sessione è scaduta, pulisci il localStorage
        localStorage.removeItem('user');
        localStorage.removeItem('loginTime');
      }
    }
  }, [onLoginSuccess]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/autenticazione', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username,
          password,
          action: 'login'
        }),
      });

      const data: LoginResponse = await response.json();

      if (response.ok && data.success) {
        setSuccess('Login effettuato con successo!');
        
        // Salva i dati dell'utente nel localStorage
        localStorage.setItem('user', JSON.stringify(data.user));
        localStorage.setItem('loginTime', new Date().getTime().toString());
        
        // Crea anche un sessionToken per compatibilità
        localStorage.setItem('sessionToken', `token_${data.user?.id}_${new Date().getTime()}`);

        // Reindirizza alla dashboard
        setTimeout(() => {
          onLoginSuccess();
        }, 1000);

      } else {
        setError(data.error || 'Errore durante il login');
      }
    } catch (error) {
      setError('Errore di connessione. Riprova più tardi.');
      console.error('Login error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-login-page">
      <div className="auth-login-container">
        <div className="auth-login-header">
          <img 
            src="/assets/logo.png"
            alt="Logo Aula Studio" 
            className="auth-login-logo"
          />
        </div>

        <form onSubmit={handleSubmit} className="auth-login-form">
          {error && <div className="auth-login-error-message">{error}</div>}
          {success && <div className="auth-login-success-message">{success}</div>}

          <div className="auth-login-form-group">
            <label htmlFor="auth-login-username" className="auth-login-label">Username</label>
            <input
              type="text"
              id="auth-login-username"
              className="auth-login-input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Inserisci il tuo username"
              required
              disabled={isLoading}
            />
          </div>

          <div className="auth-login-form-group">
            <label htmlFor="auth-login-password" className="auth-login-label">Password</label>
            <input
              type="password"
              id="auth-login-password"
              className="auth-login-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Inserisci la password"
              required
              disabled={isLoading}
            />
          </div>

          <button 
            type="submit" 
            className="auth-login-button"
            disabled={isLoading}
          >
            {isLoading ? 'Accesso in corso...' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;