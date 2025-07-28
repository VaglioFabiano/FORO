import React, { useState, useEffect } from 'react';
import CreaUtenti from './CreaUtenti';
//import ModificaOrari from './ModificaOrari';
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
  requiredLevel?: number; // Livello esatto richiesto (1 = Direttivo, 2 = Sociə, 3 = Volontariə, 4 = Livello più basso)
}

const HomeDash: React.FC<HomeDashProps> = ({ onLogout }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedComponent, setSelectedComponent] = useState<React.ComponentType | null>(null);
  const [userLevel, setUserLevel] = useState<number>(4); // Default al livello più basso
  //const [selectedTitle, setSelectedTitle] = useState<string>('');

  // Definisci gli elementi della dashboard
  const dashboardItems: DashboardItem[] = [
  {
    id: 'crea-utenti',
    title: 'Crea Utenti',
    description: 'Gestisci e crea nuovi utenti',
    icon: '👥',
    component: CreaUtenti,
    requiredLevel: 0 // Solo livello 0 (Direttivo)
  },
  {
    id: 'modifica-orari',
    title: 'Modifica Orari',
    description: 'Gestisci gli orari di lavoro',
    icon: '🕒',
    component: () => <div>Componente Modifica Orari (da implementare)</div>,
    requiredLevel: 1 // Livello 0 e 1
  },
  {
    id: 'report',
    title: 'Report',
    description: 'Visualizza report e statistiche',
    icon: '📊',
    component: () => <div>Componente Report (da implementare)</div>,
    requiredLevel: 1 // Livello 0 e 1
  },
  {
    id: 'impostazioni',
    title: 'Impostazioni',
    description: 'Configura le impostazioni',
    icon: '⚙️',
    component: () => <div>Componente Impostazioni (da implementare)</div>,
    requiredLevel: 0 // Solo livello 0 (Direttivo)
  },
  {
    id: 'calendario',
    title: 'Calendario',
    description: 'Gestisci eventi e appuntamenti',
    icon: '📅',
    component: () => <div>Componente Calendario (da implementare)</div>,
    requiredLevel: 2 // Livello 0, 1 e 2
  },
  {
    id: 'notifiche',
    title: 'Notifiche',
    description: 'Centro notifiche',
    icon: '🔔',
    component: () => <div>Componente Notifiche (da implementare)</div>,
    requiredLevel: 3 // Tutti i livelli (0, 1, 2, 3)
  }
];


  useEffect(() => {
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
          try {
            const userData = JSON.parse(user);
            setUserLevel(userData.level || 4); // Imposta il livello utente, default 4
            setIsAuthenticated(true);
          } catch (error) {
            console.error('Error parsing user data:', error);
            setIsAuthenticated(false);
            onLogout();
          }
        } else {
          localStorage.clear();
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

    const handleStorageChange = () => {
      checkAuth();
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [onLogout]);

  // Filtra gli elementi della dashboard in base al livello utente
  const filteredDashboardItems = dashboardItems.filter(item => {
    if (!item.requiredLevel && item.requiredLevel !== 0) return true; // Se non ha requiredLevel, mostralo sempre
    return userLevel <= item.requiredLevel;
  });

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

  // Se è selezionato un componente, mostralo
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

  // Mostra la dashboard principale
  return (
    <div className="dashboard-container">
      
      
      <div className="dashboard-grid">
        {filteredDashboardItems.map((item) => (
          <div
            key={item.id}
            className="dashboard-card"
            onClick={() => handleCardClick(item)}
          >
            <div className="card-icon">{item.icon}</div>
            <h3 className="card-title">{item.title}</h3>
            <p className="card-description">{item.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default HomeDash;