import React, { useState, useEffect } from 'react';

interface HomeDashProps {
  onLogout: () => void;
}

const HomeDash: React.FC<HomeDashProps> = ({ onLogout }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Controlla se l'utente è autenticato
    const sessionToken = localStorage.getItem('sessionToken');
    const userData = localStorage.getItem('user');
    
    if (sessionToken && userData) {
      setIsAuthenticated(true);
    } else {
      setIsAuthenticated(false);
      onLogout(); // Reindirizza al login se non autenticato
    }
    
    setIsLoading(false);
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
    <div className="min-h-screen">
      Dashboard per utenti autenticati 
    </div>
  );
};

export default HomeDash;