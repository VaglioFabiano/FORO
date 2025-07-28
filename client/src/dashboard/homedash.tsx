import React, { useState, useEffect } from 'react';
import CreaUtenti from './CreaUtenti';
import '../style/homeDash.css';

interface HomeDashProps {
  onLogout: () => void;
}

interface DashboardItem {
  id: string;
  title: string;
  description: string;
  icon: string;
  component: React.ComponentType;
  minLevel?: number; // Livello minimo richiesto per vedere l'elemento
}

const HomeDash: React.FC<HomeDashProps> = ({ onLogout }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedComponent, setSelectedComponent] = useState<React.ComponentType | null>(null);
  const [userLevel, setUserLevel] = useState<number>(-1); // Default a -1 (non autenticato)

  // Elementi della dashboard con i livelli minimi richiesti
  const dashboardItems: DashboardItem[] = [
    {
      id: 'crea-utenti',
      title: 'Crea Utenti',
      description: 'Gestisci e crea nuovi utenti',
      icon: '👥',
      component: CreaUtenti,
      minLevel: 1 
    },
    {
      id: 'modifica-orari',
      title: 'Modifica Orari',
      description: 'Gestisci gli orari di lavoro',
      icon: '🕒',
      component: () => <div>Componente Modifica Orari</div>,
      minLevel: 2 // Livelli 0 e 1
    },
    {
      id: 'report',
      title: 'Report',
      description: 'Visualizza report e statistiche',
      icon: '📊',
      component: () => <div>Componente Report</div>,
      minLevel: 3 // Livelli 0 e 1
    },
    {
      id: 'impostazioni',
      title: 'Impostazioni',
      description: 'Configura le impostazioni',
      icon: '⚙️',
      component: () => <div>Componente Impostazioni</div>,
      minLevel: 0 // Solo livello 0 
    },
    {
      id: 'calendario',
      title: 'Calendario',
      description: 'Gestisci eventi e appuntamenti',
      icon: '📅',
      component: () => <div>Componente Calendario</div>,
      minLevel: 3 // Livelli 0, 1 e 2
    },
    {
      id: 'notifiche',
      title: 'Notifiche',
      description: 'Centro notifiche',
      icon: '🔔',
      component: () => <div>Componente Notifiche</div>,
      minLevel: 3 // Tutti i livelli (0-3)
    }
  ];

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const user = localStorage.getItem('user');
        const loginTime = localStorage.getItem('loginTime');
        const rememberMe = localStorage.getItem('rememberMe') === 'true';
        
        if (!user || !loginTime) {
          throw new Error('Dati di autenticazione mancanti');
        }

        // Verifica validità sessione
        const now = new Date().getTime();
        const loginTimestamp = parseInt(loginTime);
        const expirationTime = rememberMe ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
        
        if (now - loginTimestamp > expirationTime) {
          throw new Error('Sessione scaduta');
        }

        const userData = JSON.parse(user);
        if (!userData.level && userData.level !== 0) {
          throw new Error('Livello utente non valido');
        }

        setUserLevel(userData.level);
        setIsAuthenticated(true);
      } catch (error) {
        console.error('Errore autenticazione:', error);
        localStorage.clear();
        setIsAuthenticated(false);
        onLogout();
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [onLogout]);

  // Filtra gli elementi visibili in base al livello utente
  const visibleItems = dashboardItems.filter(item => 
    item.minLevel === undefined || userLevel <= item.minLevel
  );

  const handleCardClick = (item: DashboardItem) => {
    setSelectedComponent(() => item.component);
  };

  const handleBackToDashboard = () => {
    setSelectedComponent(null);
  };

  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Caricamento...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  if (selectedComponent) {
    const SelectedComponent = selectedComponent;
    return (
      <div className="dashboard-container">
        <div className="dashboard-header">
          <button className="back-button" onClick={handleBackToDashboard}>
            ← Torna alla Dashboard
          </button>
        </div>
        <div className="component-container">
          <SelectedComponent />
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <div className="user-info">
        
      </div>
      
      <div className="dashboard-grid">
        {visibleItems.length > 0 ? (
          visibleItems.map((item) => (
            <div
              key={item.id}
              className="dashboard-card"
              onClick={() => handleCardClick(item)}
            >
              <div className="card-icon">{item.icon}</div>
              <h3 className="card-title">{item.title}</h3>
              <p className="card-description">{item.description}</p>
              
            </div>
          ))
        ) : (
          <div className="no-access">
            <h2>Nessun accesso</h2>
            <p>Il tuo livello ({userLevel}) non ti permette di vedere alcun elemento.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default HomeDash;