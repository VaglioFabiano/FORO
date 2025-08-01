import { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Header from './components/Header';
import OrariSection from './components/OrariSection';
import EventiSection from './components/EventiSection';
import SocialSection from './components/SocialSection';
import StatutoSection from './components/StatutoSection';
import Footer from './components/Footer';
import Login from './components/Login';
import SegnalazioniSection from './components/Segnalazioni';
import AssociatiSection from './components/Associati';
import HomeDash from './dashboard/homedash';
import PrenotaEventoPage from './components/PrenotaEventoPage';

// Tipo per le pagine dell'applicazione
type PageType = 'home' | 'login' | 'dashboard' | 'prenota-evento';

// Interfaccia per lo stato del routing
interface RouteState {
  page: PageType;
  eventoId?: number;
}

function App() {
  const [currentRoute, setCurrentRoute] = useState<RouteState>({ page: 'home' });
  const [forceNavbarUpdate, setForceNavbarUpdate] = useState(false);

  // Funzione per parsare l'URL e determinare la pagina corrente
  const parseUrl = (): RouteState => {
    const path = window.location.pathname;
    const hash = window.location.hash;
    
    // Se c'è un hash, naviga alla sezione corrispondente nella home
    if (hash && path === '/') {
      return { page: 'home' };
    }
    
    // Controlla se è una pagina di prenotazione evento
    const prenotaEventoMatch = path.match(/^\/prenota-evento\/(\d+)$/);
    if (prenotaEventoMatch) {
      const eventoId = parseInt(prenotaEventoMatch[1], 10);
      return { page: 'prenota-evento', eventoId };
    }
    
    // Controlla altre pagine
    if (path === '/login') {
      return { page: 'login' };
    }
    
    if (path === '/dashboard') {
      return { page: 'dashboard' };
    }
    
    // Default: home
    return { page: 'home' };
  };

  // Controlla lo stato di login all'avvio e imposta la rotta iniziale
  useEffect(() => {
    const user = localStorage.getItem('user');
    const loginTime = localStorage.getItem('loginTime');
    
    if (user && loginTime) {
      const now = new Date().getTime();
      const loginTimestamp = parseInt(loginTime);
      const rememberMe = localStorage.getItem('rememberMe') === 'true';
      const expirationTime = rememberMe ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
      
      if (now - loginTimestamp < expirationTime) {
        // Se l'utente è loggato e prova ad andare alla dashboard, resta lì
        const currentUrl = parseUrl();
        if (currentUrl.page === 'dashboard') {
          setCurrentRoute({ page: 'dashboard' });
          return;
        }
      } else {
        localStorage.clear();
      }
    }
    
    // Imposta la rotta basata sull'URL corrente
    setCurrentRoute(parseUrl());
  }, []);

  // Funzione per navigare alle diverse pagine
  const navigateTo = (route: RouteState) => {
    setCurrentRoute(route);
    
    // Aggiorna l'URL del browser
    let newUrl = '/';
    switch (route.page) {
      case 'login':
        newUrl = '/login';
        break;
      case 'dashboard':
        newUrl = '/dashboard';
        break;
      case 'prenota-evento':
        newUrl = `/prenota-evento/${route.eventoId}`;
        break;
      case 'home':
      default:
        newUrl = '/';
        break;
    }
    
    // Aggiorna l'URL senza ricaricare la pagina
    window.history.pushState(null, '', newUrl);
  };

  // Gestisci il pulsante indietro del browser
  useEffect(() => {
    const handlePopState = () => {
      setCurrentRoute(parseUrl());
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleShowLogin = () => {
    navigateTo({ page: 'login' });
  };

  const handleBackToHome = () => {
    navigateTo({ page: 'home' });
  };

  const handleLoginSuccess = () => {
    navigateTo({ page: 'dashboard' });
    setForceNavbarUpdate(prev => !prev);
  };

  const handleLogout = () => {
    localStorage.clear();
    navigateTo({ page: 'home' });
    setForceNavbarUpdate(prev => !prev);
  };

  const handleGoToDashboard = () => {
    navigateTo({ page: 'dashboard' });
  };

  // Funzione per navigare alla pagina di prenotazione (da usare nei componenti)
  const handlePrenotaEvento = (eventoId: number) => {
    navigateTo({ page: 'prenota-evento', eventoId });
  };

  // Rendi la funzione di navigazione disponibile globalmente per i componenti
  useEffect(() => {
    (window as any).navigateToPrenotaEvento = handlePrenotaEvento;
    (window as any).navigateToHome = () => navigateTo({ page: 'home' });
    
    return () => {
      delete (window as any).navigateToPrenotaEvento;
      delete (window as any).navigateToHome;
    };
  }, []);

  return (
    <div className="min-h-screen">
      <Navbar 
        onLoginClick={handleShowLogin} 
        onBackToHome={handleBackToHome}
        onLogout={handleLogout}
        isInLoginPage={currentRoute.page === 'login'}
        forceLoginCheck={forceNavbarUpdate}
        isInDashboard={currentRoute.page === 'dashboard'}
        onGoToDashboard={handleGoToDashboard}
      />
      
      {currentRoute.page === 'dashboard' ? (
        <HomeDash onLogout={handleLogout} onBackToHome={handleBackToHome} />
      ) : currentRoute.page === 'login' ? (
        <Login onLoginSuccess={handleLoginSuccess} />
      ) : currentRoute.page === 'prenota-evento' ? (
        <PrenotaEventoPage eventoId={currentRoute.eventoId} />
      ) : (
        <>
          <div id="header">
            <Header />
          </div>
          <div id="orari">
            <OrariSection />
          </div>
          <div id="eventi">
            <EventiSection />
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