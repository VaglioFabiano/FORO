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

function App(): JSX.Element {
  const [showLogin, setShowLogin] = useState(false);

useEffect(() => {
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
    // Scorri alla top della pagina quando mostri il login
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  const handleBackToHome = () => {
    setShowLogin(false);
    // Opzionale: rimuovi l'hash dall'URL
    window.history.pushState(null, '', window.location.pathname);
  };

  return (
    <div className="min-h-screen">
      <Navbar 
        onLoginClick={handleShowLogin} 
        onBackToHome={handleBackToHome}
        isInLoginPage={showLogin}
      />
      
      {showLogin ? (
        <div>
          <Login />
        </div>
      ) : (
        <>
          <Header />
          <div id="orari">
            <OrariSection />
          </div>
          <div id="segnalazioni">
            <SegnalazioniSection />
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
          <div id="footer">
            <Footer />
          </div>
        </>
      )}
    </div>
  );
}

export default App;