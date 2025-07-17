import React, { useState, useEffect } from 'react';

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
    level: 2,
    password: ''
  });
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [message, setMessage] = useState<Message | null>(null);

  useEffect(() => {
    const checkPermissions = () => {
      const userData = localStorage.getItem('user');
      if (userData) {
        try {
          const user: User = JSON.parse(userData);
          setCanCreateUsers(user.level < 2);
        } catch (error) {
          console.error('Error parsing user data:', error);
        }
      }
    };

    checkPermissions();
    window.addEventListener('storage', checkPermissions);
    
    return () => {
      window.removeEventListener('storage', checkPermissions);
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

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsSubmitting(true);
    setMessage(null);

    try {
      const sessionToken = localStorage.getItem('sessionToken');
      if (!sessionToken) {
        throw new Error('Sessione non valida');
      }

      const response = await fetch('/api/create-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionToken}`
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
        level: 2,
        password: ''
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
      <div className="p-4 bg-yellow-50 text-yellow-800 rounded">
        Non hai i permessi per creare utenti
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Crea Nuovo Utente</h2>
      
      {message && (
        <div className={`mb-4 p-3 rounded ${
          message.type === 'success' 
            ? 'bg-green-50 text-green-800' 
            : 'bg-red-50 text-red-800'
        }`}>
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="form-group">
          <label htmlFor="name" className="block text-sm font-medium text-gray-700">Nome:</label>
          <input
            type="text"
            id="name"
            name="name"
            value={newUser.name}
            onChange={handleInputChange}
            required
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
        </div>

        <div className="form-group">
          <label htmlFor="surname" className="block text-sm font-medium text-gray-700">Cognome:</label>
          <input
            type="text"
            id="surname"
            name="surname"
            value={newUser.surname}
            onChange={handleInputChange}
            required
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
        </div>

        <div className="form-group">
          <label htmlFor="tel" className="block text-sm font-medium text-gray-700">Telefono:</label>
          <input
            type="tel"
            id="tel"
            name="tel"
            value={newUser.tel}
            onChange={handleInputChange}
            required
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
        </div>

        <div className="form-group">
          <label htmlFor="level" className="block text-sm font-medium text-gray-700">Livello:</label>
          <select
            id="level"
            name="level"
            value={newUser.level}
            onChange={handleInputChange}
            required
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          >
            <option value={0}>Admin (0)</option>
            <option value={1}>Moderatore (1)</option>
            <option value={2}>Utente (2)</option>
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="password" className="block text-sm font-medium text-gray-700">Password:</label>
          <input
            type="password"
            id="password"
            name="password"
            value={newUser.password}
            onChange={handleInputChange}
            required
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className={`w-full py-2 px-4 rounded-md text-white ${
            isSubmitting
              ? 'bg-blue-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          {isSubmitting ? 'Creazione in corso...' : 'Crea Utente'}
        </button>
      </form>
    </div>
  );
};

export default CreaUtenti;