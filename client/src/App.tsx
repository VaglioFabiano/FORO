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
  const [forceNavbarUpdate, setForceNavbarUpdate] = useState(false);

  useEffect(() => {
    // Controlla se l'utente è già loggato (nuova logica senza sessioni)
    const checkLoginStatus = () => {
      const user = localStorage.getItem('user');
      const loginTime = localStorage.getItem('loginTime');
      const rememberMe = localStorage.getItem('rememberMe') === 'true';
      
      if (user && loginTime) {
        const now = new Date().getTime();
        const loginTimestamp = parseInt(loginTime);
        const expirationTime = rememberMe ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
        
        if (now - loginTimestamp < expirationTime) {
          setShowDashboard(true);
          return;
        } else {
          // Sessione scaduta, pulisci il localStorage
          localStorage.removeItem('user');
          localStorage.removeItem('loginTime');
          localStorage.removeItem('rememberMe');
          localStorage.removeItem('sessionToken');
        }
      }
      
      // Se non c'è login valido, gestisci gli hash per lo scroll
      const hash = window.location.hash;
      if (hash) {
        const id = hash.replace('#', '');
        const target = document.getElementById(id);
        if (target) {
          target.scrollIntoView({ behavior: 'smooth' });
        }
      }
    };

    checkLoginStatus();
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
    // Forza l'aggiornamento della navbar
    setForceNavbarUpdate(prev => !prev);
  };

  const handleLogout = () => {
    // Pulisci localStorage (già fatto nella navbar, ma per sicurezza)
    localStorage.removeItem('user');
    localStorage.removeItem('loginTime');
    localStorage.removeItem('rememberMe');
    localStorage.removeItem('sessionToken');
    
    setShowDashboard(false);
    setShowLogin(false);
    // Forza l'aggiornamento della navbar
    setForceNavbarUpdate(prev => !prev);
  };



  // Se l'utente è autenticato, mostra la dashboard
  if (showDashboard) {
    return (
      <div className="min-h-screen">
       <Navbar 
          onLoginClick={handleShowLogin} 
          onBackToHome={handleBackToHome}
          onLogout={handleLogout}
          isInLoginPage={showLogin}
          forceLoginCheck={forceNavbarUpdate}
          isInDashboard={false}
          onGoToDashboard={() => setShowDashboard(true)} 
        />


        <HomeDash onLogout={handleLogout} />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Navbar 
        onLoginClick={handleShowLogin} 
        onBackToHome={handleBackToHome}
        onLogout={handleLogout}
        isInLoginPage={showLogin}
        forceLoginCheck={forceNavbarUpdate}
        isInDashboard={false}
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