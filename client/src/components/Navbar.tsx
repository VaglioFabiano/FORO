import React, { useState, useEffect } from 'react';
import '../style/navbar.css';

interface NavbarProps {
  onLoginClick: () => void;
  onBackToHome: () => void;
  isInLoginPage: boolean;
}

const Navbar: React.FC<NavbarProps> = ({ onLoginClick, onBackToHome, isInLoginPage }) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const threshold = window.innerHeight * 0.1; // 10% of viewport height
      setIsScrolled(scrollTop > threshold);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    // Controlla se l'utente è loggato
    const checkLoginStatus = () => {
      const token = localStorage.getItem('sessionToken');
      const user = localStorage.getItem('user');
      setIsLoggedIn(!!token && !!user);
    };

    checkLoginStatus();
    
    // Controlla lo stato di login periodicamente
    const interval = setInterval(checkLoginStatus, 1000);
    
    return () => clearInterval(interval);
  }, []);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      const sessionToken = localStorage.getItem('sessionToken');
      
      if (sessionToken) {
        // Chiama l'API di logout
        const response = await fetch('/api/logout', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ sessionToken }),
        });

        if (response.ok) {
          // Rimuovi i dati di sessione dal localStorage
          localStorage.removeItem('sessionToken');
          localStorage.removeItem('user');
          setIsLoggedIn(false);
          
          // Reindirizza alla home
          if (isInLoginPage) {
            onBackToHome();
          } else {
            window.location.href = '/';
          }
        } else {
          console.error('Errore durante il logout');
        }
      }
    } catch (error) {
      console.error('Errore durante il logout:', error);
    } finally {
      setIsLoggingOut(false);
    }
  };

  const scrollToSection = (sectionId: string) => {
    // Chiudi sempre il menu mobile
    setIsMobileMenuOpen(false);
    
    // Se siamo nella pagina di login, torna prima alla home
    if (isInLoginPage) {
      onBackToHome();
      // Aspetta che il componente si re-renderizzi prima di fare lo scroll
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
    if (isInLoginPage) {
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
          {/* Logo */}
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

          {/* Navigation Links */}
          <div className="navbar-nav">
            <button 
              className="nav-link"
              onClick={() => scrollToSection('header')}
            >
              Home
            </button>
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
           <button 
              className="nav-link login-link"
              onClick={handleAuthClick}
              disabled={isLoggingOut}
            >
              {getAuthButtonText()}
            </button>
          </div>

          {/* Mobile Menu Button */}
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

      {/* Mobile Menu Overlay */}
      <div className={`mobile-menu-overlay ${isMobileMenuOpen ? 'active' : ''}`}>
        <div className="mobile-menu-content">
          <button 
            className="mobile-nav-link"
            onClick={() => scrollToSection('header')}
          >
            Home
          </button>
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