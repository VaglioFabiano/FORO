import React, { useState, useEffect } from 'react';
//import './homedash.css';

interface HomeDashProps {
  onLogout: () => void;
}

interface User {
  id: number;
  name: string;
  surname: string;
  tel: string;
  level: number;
}

interface DashboardStats {
  totalUsers: number;
  activeReservations: number;
  roomsAvailable: number;
  pendingRequests: number;
}

const HomeDash: React.FC<HomeDashProps> = ({ onLogout }) => {
  const [user, setUser] = useState<User | null>(null);
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    activeReservations: 0,
    roomsAvailable: 0,
    pendingRequests: 0
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Carica i dati dell'utente dal localStorage
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    }

    // Simula il caricamento delle statistiche
    setTimeout(() => {
      setStats({
        totalUsers: 142,
        activeReservations: 28,
        roomsAvailable: 12,
        pendingRequests: 5
      });
      setIsLoading(false);
    }, 1000);
  }, []);

  const handleLogout = () => {
    onLogout();
  };

  if (isLoading) {
    return (
      <div className="dashboard-loading">
        <div className="loading-spinner"></div>
        <p>Caricamento dashboard...</p>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div className="header-left">
          <img src="/assets/logo.png" alt="Logo" className="dashboard-logo" />
          <h1>Dashboard Aula Studio</h1>
        </div>
        <div className="header-right">
          <div className="user-info">
            <span>Benvenuto, {user?.name} {user?.surname}</span>
            <span className="user-level">Livello: {user?.level}</span>
          </div>
          <button onClick={handleLogout} className="logout-btn">
            Logout
          </button>
        </div>
      </header>

      <main className="dashboard-main">
        <div className="dashboard-grid">
          {/* Statistiche principali */}
          <section className="stats-section">
            <h2>Statistiche</h2>
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-icon">👥</div>
                <div className="stat-content">
                  <h3>{stats.totalUsers}</h3>
                  <p>Utenti Totali</p>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">📅</div>
                <div className="stat-content">
                  <h3>{stats.activeReservations}</h3>
                  <p>Prenotazioni Attive</p>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">🏠</div>
                <div className="stat-content">
                  <h3>{stats.roomsAvailable}</h3>
                  <p>Aule Disponibili</p>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">⏳</div>
                <div className="stat-content">
                  <h3>{stats.pendingRequests}</h3>
                  <p>Richieste Pendenti</p>
                </div>
              </div>
            </div>
          </section>

          {/* Azioni rapide */}
          <section className="quick-actions">
            <h2>Azioni Rapide</h2>
            <div className="actions-grid">
              <button className="action-btn">
                <span className="action-icon">➕</span>
                <span>Aggiungi Utente</span>
              </button>
              <button className="action-btn">
                <span className="action-icon">🏠</span>
                <span>Gestisci Aule</span>
              </button>
              <button className="action-btn">
                <span className="action-icon">📊</span>
                <span>Visualizza Report</span>
              </button>
              <button className="action-btn">
                <span className="action-icon">⚙️</span>
                <span>Impostazioni</span>
              </button>
            </div>
          </section>

          {/* Attività recenti */}
          <section className="recent-activity">
            <h2>Attività Recenti</h2>
            <div className="activity-list">
              <div className="activity-item">
                <span className="activity-time">10:30</span>
                <span className="activity-desc">Nuova prenotazione - Aula 101</span>
              </div>
              <div className="activity-item">
                <span className="activity-time">09:15</span>
                <span className="activity-desc">Utente registrato - Mario Rossi</span>
              </div>
              <div className="activity-item">
                <span className="activity-time">08:45</span>
                <span className="activity-desc">Prenotazione cancellata - Aula 203</span>
              </div>
              <div className="activity-item">
                <span className="activity-time">08:30</span>
                <span className="activity-desc">Sistema avviato</span>
              </div>
            </div>
          </section>

          {/* Notifiche */}
          <section className="notifications">
            <h2>Notifiche</h2>
            <div className="notification-list">
              <div className="notification-item urgent">
                <span className="notification-icon">🔴</span>
                <span>Aula 102 necessita manutenzione</span>
              </div>
              <div className="notification-item warning">
                <span className="notification-icon">🟡</span>
                <span>5 prenotazioni in scadenza oggi</span>
              </div>
              <div className="notification-item info">
                <span className="notification-icon">🔵</span>
                <span>Backup completato con successo</span>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
};

export default HomeDash;