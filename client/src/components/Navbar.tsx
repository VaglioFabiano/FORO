import React, { useState, useEffect } from 'react';
import '../style/navbar.css';

interface NavbarProps {
  onLoginClick: () => void;
  onBackToHome: () => void;
  onLogout: () => void;
  isInLoginPage: boolean;
  forceLoginCheck?: boolean;
  isInDashboard?: boolean;
}

const Navbar: React.FC<NavbarProps> = ({ 
  onLoginClick, 
  onBackToHome, 
  onLogout, 
  isInLoginPage,
  forceLoginCheck,
  isInDashboard = false
}) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const threshold = window.innerHeight * 0.1;
      setIsScrolled(scrollTop > threshold);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const checkLoginStatus = () => {
    const user = localStorage.getItem('user');
    const loginTime = localStorage.getItem('loginTime');
    const rememberMe = localStorage.getItem('rememberMe') === 'true';
    
    if (user && loginTime) {
      const now = new Date().getTime();
      const loginTimestamp = parseInt(loginTime);
      const expirationTime = rememberMe ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
      
      if (now - loginTimestamp < expirationTime) {
        setIsLoggedIn(true);
      } else {
        localStorage.removeItem('user');
        localStorage.removeItem('loginTime');
        localStorage.removeItem('rememberMe');
        localStorage.removeItem('sessionToken');
        setIsLoggedIn(false);
      }
    } else {
      setIsLoggedIn(false);
    }
  };

  useEffect(() => {
    checkLoginStatus();
    const interval = setInterval(checkLoginStatus, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (forceLoginCheck) {
      checkLoginStatus();
    }
  }, [forceLoginCheck]);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      localStorage.removeItem('user');
      localStorage.removeItem('loginTime');
      localStorage.removeItem('rememberMe');
      localStorage.removeItem('sessionToken');
      setIsLoggedIn(false);
      onLogout();
    } catch (error) {
      console.error('Errore durante il logout:', error);
    } finally {
      setIsLoggingOut(false);
    }
  };

  const scrollToSection = (sectionId: string) => {
    setIsMobileMenuOpen(false);
    
    // Se siamo nella dashboard o nella pagina di login, torna alla home
    if (isInDashboard || isInLoginPage) {
      onBackToHome();
      setTimeout(() => {
        const element = document.getElementById(sectionId);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
      return;
    }

    if (window.location.pathname !== '/') {
      window.location.href = `/#${sectionId}`;
    } else {
      const element = document.getElementById(sectionId);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  const handleAuthClick = () => {
    if (isLoggedIn) {
      handleLogout();
    } else {
      onLoginClick();
    }
    setIsMobileMenuOpen(false);
  };

  const navigateToHome = () => { 
    // Se siamo nella dashboard o nella pagina di login, torna alla home
    if (isInDashboard || isInLoginPage) {
      onBackToHome();
    } else {
      scrollToSection('header');
    }
    setIsMobileMenuOpen(false);
  };

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>): void => {
    const target = e.target as HTMLImageElement;
    const nextSibling = target.nextElementSibling as HTMLElement;
    target.style.display = 'none';
    if (nextSibling) {
      nextSibling.style.display = 'flex';
    }
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const getAuthButtonText = () => {
    if (isInLoginPage) return 'Indietro';
    if (isLoggingOut) return 'Logout...';
    return isLoggedIn ? 'Logout' : 'Login';
  };

  return (
    <>
      <nav className={`navbar ${isScrolled ? 'navbar-scrolled' : ''}`}>
        <div className="navbar-container">
          <div className="navbar-logo" onClick={navigateToHome} style={{ cursor: 'pointer' }}>
            <img 
              src="/assets/logo.png"
              alt="Logo Aula Studio" 
              className="navbar-logo-image"
              onError={handleImageError}
            />
            <div className="navbar-logo-fallback">
              <span className="navbar-logo-text">AS</span>
            </div>
            <span className="navbar-brand">Aula Studio</span>
          </div>

          <div className="navbar-nav">
            <button 
              className="nav-link"
              onClick={() => scrollToSection('header')}
            >
              Home
            </button>
            
            {!isInDashboard && (
              <>
                <button 
                  className="nav-link"
                  onClick={() => scrollToSection('orari')}
                >
                  Orari
                </button>
                <button 
                  className="nav-link"
                  onClick={() => scrollToSection('social')}
                >
                  Social
                </button>
                <button 
                  className="nav-link"
                  onClick={() => scrollToSection('statuto')}
                >
                  Statuto
                </button>
                <button 
                  className="nav-link"
                  onClick={() => scrollToSection('associati')}
                >
                  Diventa Socio
                </button>
                <button 
                  className="nav-link"
                  onClick={() => scrollToSection('segnalazioni')}
                >
                  Segnalazioni
                </button>
                <button 
                  className="nav-link"
                  onClick={() => scrollToSection('footer')}
                >
                  Contatti
                </button>
              </>
            )}
            
           <button 
              className="nav-link login-link"
              onClick={handleAuthClick}
              disabled={isLoggingOut}
            >
              {getAuthButtonText()}
            </button>
          </div>

          <div 
            className={`mobile-menu-toggle ${isMobileMenuOpen ? 'active' : ''}`}
            onClick={toggleMobileMenu}
          >
            <span></span>
            <span></span>
            <span></span>
          </div>
        </div>
      </nav>

      <div className={`mobile-menu-overlay ${isMobileMenuOpen ? 'active' : ''}`}>
        <div className="mobile-menu-content">
          <button 
            className="mobile-nav-link"
            onClick={() => scrollToSection('header')}
          >
            Home
          </button>
          
          {!isInDashboard && (
            <>
              <button 
                className="mobile-nav-link"
                onClick={() => scrollToSection('orari')}
              >
                Orari
              </button>
              <button 
                className="mobile-nav-link"
                onClick={() => scrollToSection('social')}
              >
                Social
              </button>
              <button 
                className="mobile-nav-link"
                onClick={() => scrollToSection('statuto')}
              >
                Statuto
              </button>
              <button 
                className="mobile-nav-link"
                onClick={() => scrollToSection('associati')}
              >
                Diventa Socio
              </button>
              <button 
                className="mobile-nav-link"
                onClick={() => scrollToSection('segnalazioni')}
              >
                Segnalazioni
              </button>
              <button 
                className="mobile-nav-link"
                onClick={() => scrollToSection('footer')}
              >
                Contatti
              </button>
            </>
          )}
          
          <button 
            className="mobile-nav-link login-link"
            onClick={handleAuthClick}
            disabled={isLoggingOut}
          >
            {getAuthButtonText()}
          </button>
        </div>
      </div>
    </>
  );
};

export default Navbar;