import React, { useState, useEffect } from 'react';
import '../style/navbar.css';

interface NavbarProps {
  onLoginClick: () => void;
  onBackToHome: () => void;
  onLogout: () => void;
  isInLoginPage: boolean;
  forceLoginCheck?: boolean;
  isInDashboard?: boolean;
  onGoToDashboard?: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ 
  onLoginClick, 
  onBackToHome, 
  onLogout, 
  isInLoginPage,
  forceLoginCheck,
  isInDashboard = false,
  onGoToDashboard
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
    
    // Solo aggiungiamo l'event listener se non siamo nella dashboard o login page
    if (!isInDashboard && !isInLoginPage) {
      window.addEventListener('scroll', handleScroll);
    }
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isInDashboard, isInLoginPage]);

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
        localStorage.clear();
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
      localStorage.clear();
      setIsLoggedIn(false);
      onLogout();
    } catch (error) {
      console.error('Errore durante il logout:', error);
    } finally {
      setIsLoggingOut(false);
    }
  };

  const handleHomeClick = () => {
    setIsMobileMenuOpen(false);
    if (isInDashboard || isInLoginPage) {
      onBackToHome();
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
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

  const handleDashboardClick = () => {
    setIsMobileMenuOpen(false);
    if (onGoToDashboard) {
      onGoToDashboard();
    }
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
          <div className="navbar-logo" onClick={handleHomeClick} style={{ cursor: 'pointer' }}>
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
            {/* Home button - always visible */}
            <button className="nav-link" onClick={handleHomeClick}>
              Home
            </button>

            {/* Dashboard button - visible when logged in and not in dashboard */}
            {isLoggedIn && !isInDashboard && (
              <button className="nav-link" onClick={handleDashboardClick}>
                Dashboard
              </button>
            )}

            {/* Back to home button - visible when in dashboard */}
            {isInDashboard && (
              <button className="nav-link" onClick={onBackToHome}>
                Torna al Sito
              </button>
            )}

            {/* Full menu - only for non-logged users not in login page */}
            {!isLoggedIn && !isInLoginPage && (
              <>
                <button className="nav-link" onClick={() => window.location.href = '/#orari'}>
                  Orari
                </button>
                <button className="nav-link" onClick={() => window.location.href = '/#social'}>
                  Social
                </button>
                <button className="nav-link" onClick={() => window.location.href = '/#statuto'}>
                  Statuto
                </button>
                <button className="nav-link" onClick={() => window.location.href = '/#associati'}>
                  Diventa Socio
                </button>
                <button className="nav-link" onClick={() => window.location.href = '/#segnalazioni'}>
                  Segnalazioni
                </button>
                <button className="nav-link" onClick={() => window.location.href = '/#footer'}>
                  Contatti
                </button>
              </>
            )}

            {/* Auth button - always visible */}
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

      {/* Mobile menu */}
      <div className={`mobile-menu-overlay ${isMobileMenuOpen ? 'active' : ''}`}>
        <div className="mobile-menu-content">
          <button className="mobile-nav-link" onClick={handleHomeClick}>
            Home
          </button>

          {isLoggedIn && !isInDashboard && (
            <button className="mobile-nav-link" onClick={handleDashboardClick}>
              Dashboard
            </button>
          )}

          {isInDashboard && (
            <button className="mobile-nav-link" onClick={onBackToHome}>
              Torna al Sito
            </button>
          )}

          {!isLoggedIn && !isInLoginPage && (
            <>
              <button className="mobile-nav-link" onClick={() => window.location.href = '/#orari'}>
                Orari
              </button>
              <button className="mobile-nav-link" onClick={() => window.location.href = '/#social'}>
                Social
              </button>
              <button className="mobile-nav-link" onClick={() => window.location.href = '/#statuto'}>
                Statuto
              </button>
              <button className="mobile-nav-link" onClick={() => window.location.href = '/#associati'}>
                Diventa Socio
              </button>
              <button className="mobile-nav-link" onClick={() => window.location.href = '/#segnalazioni'}>
                Segnalazioni
              </button>
              <button className="mobile-nav-link" onClick={() => window.location.href = '/#footer'}>
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