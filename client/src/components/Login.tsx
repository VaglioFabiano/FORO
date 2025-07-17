import React, { useState } from 'react';
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
    tel: string;
    level: number;
  };
  sessionToken?: string;
  expiresAt?: string;
  error?: string;
}

const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username,
          password,
          rememberMe
        }),
      });

      const data: LoginResponse = await response.json();

      if (response.ok && data.success) {
        setSuccess('Login effettuato con successo!');
        
        // Salva il token di sessione
        if (data.sessionToken) {
          localStorage.setItem('sessionToken', data.sessionToken);
          localStorage.setItem('user', JSON.stringify(data.user));
        }

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
    <div className="login-page">
      <div className="login-container">
        <div className="login-header">
          <img 
            src="/assets/logo.png"
            alt="Logo Aula Studio" 
            className="logo"
          />
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {error && <div className="error-message">{error}</div>}
          {success && <div className="success-message">{success}</div>}

          <div className="form-group">
            <label htmlFor="username">Numero di Telefono</label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Inserisci il numero di telefono"
              required
              disabled={isLoading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Inserisci la password"
              required
              disabled={isLoading}
            />
          </div>

          <div className="form-options">
            <label className="checkbox-container">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                disabled={isLoading}
              />
              <span className="checkmark"></span>
              Ricordami
            </label>
          </div>

          <button 
            type="submit" 
            className="login-button"
            disabled={isLoading}
          >
            {isLoading ? 'Accesso in corso...' : 'Login'}
          </button>
        </form>

        <div className="login-footer">
          <p>Hai dimenticato la password?</p>
          <a href="#" className="forgot-link">Clicca qui</a>
        </div>
      </div>
    </div>
  );
};

export default Login;