// src/components/DatabaseSetup.tsx
import { useState } from 'react';

const DatabaseSetup = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');

  const setupDatabase = async () => {
    setIsLoading(true);
    setMessage('');

    try {
      const response = await fetch('/api/setup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (response.ok) {
        setMessage('✅ Database setup completato!');
        console.log('Success:', data);
      } else {
        setMessage(`❌ Errore: ${data.error}`);
        console.error('Error:', data);
      }
    } catch (error) {
      setMessage('❌ Errore di connessione');
      console.error('Network error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px' }}>
      <h2>Database Setup</h2>
      <button 
        onClick={setupDatabase} 
        disabled={isLoading}
        style={{
          padding: '10px 20px',
          backgroundColor: isLoading ? '#ccc' : '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: isLoading ? 'not-allowed' : 'pointer'
        }}
      >
        {isLoading ? 'Configurando...' : 'Setup Database'}
      </button>
      {message && <p style={{ marginTop: '10px' }}>{message}</p>}
    </div>
  );
};

export default DatabaseSetup;