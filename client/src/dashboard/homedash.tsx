import React, { useState, useEffect } from 'react';
import CreaUtenti from './CreaUtenti.tsx';

interface HomeDashProps {
  onLogout: () => void;
}

const HomeDash: React.FC<HomeDashProps> = ({ onLogout }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Controlla se l'utente è autenticato con la stessa logica degli altri componenti
    const checkAuth = () => {
      const user = localStorage.getItem('user');
      const loginTime = localStorage.getItem('loginTime');
      const rememberMe = localStorage.getItem('rememberMe') === 'true';
      const sessionToken = localStorage.getItem('sessionToken');
      
      if (user && loginTime && sessionToken) {
        const now = new Date().getTime();
        const loginTimestamp = parseInt(loginTime);
        const expirationTime = rememberMe ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
        
        if (now - loginTimestamp < expirationTime) {
          setIsAuthenticated(true);
        } else {
          // Sessione scaduta, pulisci tutto
          localStorage.removeItem('user');
          localStorage.removeItem('loginTime');
          localStorage.removeItem('rememberMe');
          localStorage.removeItem('sessionToken');
          setIsAuthenticated(false);
          onLogout();
        }
      } else {
        setIsAuthenticated(false);
        onLogout();
      }
      
      setIsLoading(false);
    };

    checkAuth();
  }, [onLogout]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="loading-spinner"></div>
        <p>Caricamento...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Non mostra nulla se non autenticato
  }

  return (
    <div className="min-h-screen pt-20 bg-gray-50">
      <div className="container mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Dashboard</h1>
          <p className="text-gray-600">Benvenuto nell'area riservata</p>
        </div>
        
        <div className="grid gap-6">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">Gestione Utenti</h2>
            <CreaUtenti />
          </div>
          
          {/* Aggiungi qui altre sezioni della dashboard */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">Altre Funzionalità</h2>
            <p className="text-gray-600">Altre funzionalità della dashboard verranno aggiunte qui...</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomeDash;