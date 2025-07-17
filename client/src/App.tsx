import { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Header from './components/Header';
import OrariSection from './components/OrariSection';
import SocialSection from './components/SocialSection';
import StatutoSection from './components/StatutoSection';
import Footer from './components/Footer';
import Login from './components/Login';
import SegnalazioniSection from './components/Segnalazioni';
import AssociatiSection from './components/Associati';
import HomeDash from './dashboard/homedash';

function App() {
  const [currentPage, setCurrentPage] = useState<'home' | 'login' | 'dashboard'>('home');
  const [forceNavbarUpdate, setForceNavbarUpdate] = useState(false);

  // Controlla lo stato di login all'avvio
  useEffect(() => {
    const user = localStorage.getItem('user');
    const loginTime = localStorage.getItem('loginTime');
    
    if (user && loginTime) {
      const now = new Date().getTime();
      const loginTimestamp = parseInt(loginTime);
      const rememberMe = localStorage.getItem('rememberMe') === 'true';
      const expirationTime = rememberMe ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
      
      if (now - loginTimestamp < expirationTime) {
        setCurrentPage('dashboard');
      } else {
        localStorage.clear();
      }
    }
  }, []);

  const handleShowLogin = () => {
    setCurrentPage('login');
  };

  const handleBackToHome = () => {
    setCurrentPage('home');
  };

  const handleLoginSuccess = () => {
    setCurrentPage('dashboard');
    setForceNavbarUpdate(prev => !prev);
  };

  const handleLogout = () => {
    localStorage.clear();
    setCurrentPage('home');
    setForceNavbarUpdate(prev => !prev);
  };

  return (
    <div className="min-h-screen">
      <Navbar 
        onLoginClick={handleShowLogin} 
        onBackToHome={handleBackToHome}
        onLogout={handleLogout}
        isInLoginPage={currentPage === 'login'}
        forceLoginCheck={forceNavbarUpdate}
        isInDashboard={currentPage === 'dashboard'}
        onGoToDashboard={() => setCurrentPage('dashboard')}
      />
      
      {currentPage === 'dashboard' ? (
        <HomeDash onLogout={handleLogout} />
      ) : currentPage === 'login' ? (
        <Login onLoginSuccess={handleLoginSuccess} />
      ) : (
        <>
          <Header />
          <OrariSection />
          <SocialSection />
          <StatutoSection />
          <AssociatiSection />
          <SegnalazioniSection />
          <Footer />
        </>
      )}
    </div>
  );
}

export default App;