import { useState, useEffect} from 'react';
import Navbar from './components/Navbar.tsx';
import Header from './components/Header.tsx';
import OrariSection from './components/OrariSection.tsx';
import SocialSection from './components/SocialSection.tsx';
import StatutoSection from './components/StatutoSection.tsx';
import Footer from './components/Footer.tsx';
import Login from './components/Login.tsx';
import SegnalazioniSection from './components/Segnalazioni.tsx';
import AssociatiSection from './components/Associati.tsx';
import HomeDash from './dashboard/homedash.tsx';

function App(): JSX.Element {
  const [showLogin, setShowLogin] = useState(false);
  const [showDashboard, setShowDashboard] = useState(false);

  useEffect(() => {
    // Controlla se c'è un token di sessione per mostrare automaticamente la dashboard
    const sessionToken = localStorage.getItem('sessionToken');
    if (sessionToken) {
      setShowDashboard(true);
      return;
    }

    // Gestione degli hash per lo scroll
    const hash = window.location.hash;
    if (hash) {
      const id = hash.replace('#', '');
      const target = document.getElementById(id);
      if (target) {
        target.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }, []);

  const handleShowLogin = () => {
    setShowLogin(true);
    setShowDashboard(false);
    // Scorri alla top della pagina quando mostri il login
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  const handleBackToHome = () => {
    setShowLogin(false);
    setShowDashboard(false);
    // Opzionale: rimuovi l'hash dall'URL
    window.history.pushState(null, '', window.location.pathname);
  };

  const handleLoginSuccess = () => {
    setShowLogin(false);
    setShowDashboard(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('sessionToken');
    localStorage.removeItem('user');
    setShowDashboard(false);
    setShowLogin(false);
  };

  // Se l'utente è autenticato, mostra la dashboard
  if (showDashboard) {
    return (
      <div className="min-h-screen">
        <HomeDash onLogout={handleLogout} />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Navbar 
        onLoginClick={handleShowLogin} 
        onBackToHome={handleBackToHome}
        isInLoginPage={showLogin}
      />
      
      {showLogin ? (
        <div>
          <Login onLoginSuccess={handleLoginSuccess} />
        </div>
      ) : (
        <>
          <Header />
          <div id="orari">
            <OrariSection />
          </div>
          <div id="social">
            <SocialSection />
          </div>
          <div id="statuto">
            <StatutoSection />
          </div>
          <div id="associati">
            <AssociatiSection />
          </div>
          <div id="segnalazioni">
            <SegnalazioniSection />
          </div>
          <div id="footer">
            <Footer />
          </div>
        </>
      )}
    </div>
  );
}

export default App;