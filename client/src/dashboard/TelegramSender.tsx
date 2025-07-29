import React, { useState, useEffect } from 'react';

interface TelegramSenderProps {}

interface SendResult {
  id: number;
  type: 'success' | 'error';
  message: string;
  messageId?: number;
  timestamp: string;
}

interface UserData {
  id: number;
  name: string;
  surname: string;
  tel: string;
  level: number;
}

const TelegramSender: React.FC<TelegramSenderProps> = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [sendResults, setSendResults] = useState<SendResult[]>([]);
  const [currentUser, setCurrentUser] = useState<UserData | null>(null);

  // Template messaggi predefiniti
  const messageTemplates = [
    {
      name: 'Promemoria Appuntamento',
      template: 'Ciao {name}, ti ricordiamo il tuo appuntamento previsto per oggi. A presto!'
    },
    {
      name: 'Messaggio di Benvenuto',
      template: 'Benvenuto {name} {surname}! Grazie per esserti registrato al nostro servizio.'
    },
    {
      name: 'Notifica Importante',
      template: 'Gentile {name}, abbiamo una comunicazione importante per te. Contattaci al più presto.'
    }
  ];

  useEffect(() => {
    // Recupera dati utente loggato
    const userData = localStorage.getItem('user');
    if (userData) {
      try {
        const user = JSON.parse(userData);
        setCurrentUser(user);
      } catch (error) {
        console.error('Errore nel parsing dei dati utente:', error);
      }
    }
  }, []);

  const replaceTemplateVariables = (template: string, user: UserData): string => {
    return template
      .replace(/{name}/g, user.name)
      .replace(/{surname}/g, user.surname)
      .replace(/{tel}/g, user.tel);
  };

  const sendTelegramMessage = async () => {
    if (!currentUser) {
      addResult('error', 'Utente non autenticato');
      return;
    }

    if (!message.trim()) {
      addResult('error', 'Il messaggio non può essere vuoto');
      return;
    }

    setIsLoading(true);

    try {
      // Ottieni il token temporaneo per l'autenticazione
      const tempToken = generateTempToken(currentUser);
      
      const response = await fetch('/api/sendTelegram', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tempToken}`
        },
        body: JSON.stringify({
          phoneNumber: currentUser.tel,
          message: replaceTemplateVariables(message, currentUser)
        })
      });

      const result = await response.json();

      if (response.ok && result.success) {
        addResult('success', `Messaggio inviato con successo a ${currentUser.tel}`, result.messageId);
        setMessage('');
      } else {
        addResult('error', result.error || 'Errore nell\'invio del messaggio');
      }
    } catch (error) {
      console.error('Errore nell\'invio:', error);
      addResult('error', 'Errore di connessione');
    } finally {
      setIsLoading(false);
    }
  };

  const generateTempToken = (user: UserData): string => {
    const tokenData = {
      userId: user.id,
      tel: user.tel,
      timestamp: new Date().getTime().toString()
    };
    return btoa(JSON.stringify(tokenData));
  };

  const addResult = (type: 'success' | 'error', message: string, messageId?: number) => {
    const result: SendResult = {
      id: Date.now(),
      type,
      message,
      messageId,
      timestamp: new Date().toLocaleString('it-IT')
    };
    setSendResults(prev => [result, ...prev]);
  };

  const loadTemplate = (template: string) => {
    setMessage(template);
  };

  const clearResults = () => {
    setSendResults([]);
  };

  if (!currentUser) {
    return (
      <div className="telegram-sender">
        <div className="error-message">
          <h3>❌ Errore di Autenticazione</h3>
          <p>Non è possibile recuperare i dati dell'utente loggato.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="telegram-sender">
      <div className="user-info-card">
        <h2>📱 Invio Messaggio Telegram</h2>
        <div className="current-user">
          <strong>Utente loggato:</strong> {currentUser.name} {currentUser.surname}
          <br />
          <strong>Telefono:</strong> {currentUser.tel}
          <br />
          <strong>Livello:</strong> {currentUser.level}
        </div>
      </div>

      <div className="message-templates">
        <h3>📝 Template Messaggi</h3>
        <div className="template-buttons">
          {messageTemplates.map((template, index) => (
            <button
              key={index}
              className="template-button"
              onClick={() => loadTemplate(template.template)}
              disabled={isLoading}
            >
              {template.name}
            </button>
          ))}
        </div>
      </div>

      <div className="message-form">
        <div className="form-group">
          <label htmlFor="message">Messaggio:</label>
          <textarea
            id="message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Scrivi il tuo messaggio qui... Puoi usare {name}, {surname}, {tel} per personalizzarlo"
            rows={4}
            disabled={isLoading}
          />
          <small className="helper-text">
            Variabili disponibili: {'{name}'}, {'{surname}'}, {'{tel}'}
          </small>
        </div>

        <div className="form-actions">
          <button
            className="send-button"
            onClick={sendTelegramMessage}
            disabled={isLoading || !message.trim()}
          >
            {isLoading ? '📤 Invio in corso...' : '📨 Invia Messaggio'}
          </button>
        </div>
      </div>

      {message && (
        <div className="message-preview">
          <h4>👁️ Anteprima messaggio:</h4>
          <div className="preview-content">
            {replaceTemplateVariables(message, currentUser)}
          </div>
        </div>
      )}

      <div className="results-section">
        <div className="results-header">
          <h3>📋 Risultati Invii ({sendResults.length})</h3>
          {sendResults.length > 0 && (
            <button className="clear-button" onClick={clearResults}>
              🗑️ Cancella
            </button>
          )}
        </div>
        
        <div className="results-list">
          {sendResults.map((result) => (
            <div
              key={result.id}
              className={`result-item ${result.type}`}
            >
              <div className="result-icon">
                {result.type === 'success' ? '✅' : '❌'}
              </div>
              <div className="result-content">
                <div className="result-message">{result.message}</div>
                <div className="result-timestamp">{result.timestamp}</div>
                {result.messageId && (
                  <div className="result-id">ID Messaggio: {result.messageId}</div>
                )}
              </div>
            </div>
          ))}
        </div>
        
        {sendResults.length === 0 && (
          <div className="no-results">
            Nessun messaggio inviato ancora
          </div>
        )}
      </div>

      <style>{`
        .telegram-sender {
          max-width: 800px;
          margin: 0 auto;
          padding: 20px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        .user-info-card {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 20px;
          border-radius: 12px;
          margin-bottom: 24px;
          box-shadow: 0 4px 15px rgba(0,0,0,0.1);
        }

        .user-info-card h2 {
          margin: 0 0 15px 0;
          font-size: 24px;
        }

        .current-user {
          background: rgba(255,255,255,0.2);
          padding: 15px;
          border-radius: 8px;
          font-size: 14px;
          line-height: 1.6;
        }

        .message-templates {
          background: #f8f9fa;
          padding: 20px;
          border-radius: 12px;
          margin-bottom: 24px;
        }

        .message-templates h3 {
          margin: 0 0 15px 0;
          color: #333;
        }

        .template-buttons {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
        }

        .template-button {
          background: #007bff;
          color: white;
          border: none;
          padding: 10px 16px;
          border-radius: 8px;
          cursor: pointer;
          font-size: 14px;
          transition: all 0.2s;
        }

        .template-button:hover:not(:disabled) {
          background: #0056b3;
          transform: translateY(-1px);
        }

        .template-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .message-form {
          background: white;
          padding: 24px;
          border-radius: 12px;
          border: 1px solid #e9ecef;
          margin-bottom: 24px;
        }

        .form-group {
          margin-bottom: 20px;
        }

        .form-group label {
          display: block;
          margin-bottom: 8px;
          font-weight: 600;
          color: #333;
        }

        .form-group textarea {
          width: 100%;
          padding: 12px;
          border: 2px solid #e9ecef;
          border-radius: 8px;
          font-size: 14px;
          resize: vertical;
          transition: border-color 0.2s;
          box-sizing: border-box;
        }

        .form-group textarea:focus {
          outline: none;
          border-color: #007bff;
        }

        .helper-text {
          color: #6c757d;
          font-size: 12px;
          margin-top: 5px;
          display: block;
        }

        .form-actions {
          display: flex;
          justify-content: center;
        }

        .send-button {
          background: linear-gradient(135deg, #28a745, #20c997);
          color: white;
          border: none;
          padding: 12px 30px;
          border-radius: 8px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          min-width: 180px;
        }

        .send-button:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 4px 15px rgba(40, 167, 69, 0.3);
        }

        .send-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }

        .message-preview {
          background: #e3f2fd;
          padding: 20px;
          border-radius: 12px;
          margin-bottom: 24px;
          border-left: 4px solid #2196f3;
        }

        .message-preview h4 {
          margin: 0 0 10px 0;
          color: #1976d2;
        }

        .preview-content {
          background: white;
          padding: 15px;
          border-radius: 8px;
          font-style: italic;
          color: #333;
        }

        .results-section {
          background: white;
          border-radius: 12px;
          border: 1px solid #e9ecef;
          overflow: hidden;
        }

        .results-header {
          background: #f8f9fa;
          padding: 20px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid #e9ecef;
        }

        .results-header h3 {
          margin: 0;
          color: #333;
        }

        .clear-button {
          background: #dc3545;
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
        }

        .clear-button:hover {
          background: #c82333;
        }

        .results-list {
          max-height: 400px;
          overflow-y: auto;
        }

        .result-item {
          display: flex;
          align-items: flex-start;
          padding: 16px 20px;
          border-bottom: 1px solid #f1f3f4;
          transition: background-color 0.2s;
        }

        .result-item:hover {
          background: #f8f9fa;
        }

        .result-item.success {
          border-left: 4px solid #28a745;
        }

        .result-item.error {
          border-left: 4px solid #dc3545;
        }

        .result-icon {
          font-size: 18px;
          margin-right: 12px;
          flex-shrink: 0;
        }

        .result-content {
          flex: 1;
        }

        .result-message {
          font-weight: 500;
          margin-bottom: 4px;
        }

        .result-timestamp {
          font-size: 12px;
          color: #6c757d;
        }

        .result-id {
          font-size: 12px;
          color: #007bff;
          margin-top: 2px;
        }

        .no-results {
          padding: 40px 20px;
          text-align: center;
          color: #6c757d;
          font-style: italic;
        }

        .error-message {
          background: #f8d7da;
          color: #721c24;
          padding: 20px;
          border-radius: 12px;
          text-align: center;
        }

        .error-message h3 {
          margin: 0 0 10px 0;
        }

        @media (max-width: 768px) {
          .telegram-sender {
            padding: 15px;
          }
          
          .template-buttons {
            flex-direction: column;
          }
          
          .template-button {
            width: 100%;
          }
          
          .results-header {
            flex-direction: column;
            gap: 10px;
            text-align: center;
          }
        }
      `}</style>
    </div>
  );
};

export default TelegramSender;